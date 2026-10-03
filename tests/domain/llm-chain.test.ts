import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_PAID_SETTINGS, type AiFeature } from "@/lib/domain/llm-router";
import { createChain } from "@/lib/llm/chain";
import { AllProvidersFailedError, LlmHttpError, LlmInvalidOutputError, PaidConfirmRequiredError } from "@/lib/llm/errors";
import type { ProviderDef } from "@/lib/llm/providers";
import { MemoryLlmStore } from "@/lib/llm/store";
import type { LlmProvider } from "@/lib/llm/types";

const schema = z.object({ ok: z.literal(true) });
const NOW = new Date("2026-10-05T10:00:00Z");

const def = (id: ProviderDef["id"], paid = false): ProviderDef => ({ id, label: id, paid, cfg: { provider: "gemini", apiKey: "k-123456" } });
const DEFS = [def("gemini"), def("groq"), def("meta", true)];

type Behaviour = "ok" | LlmHttpError | LlmInvalidOutputError;
function fake(script: Partial<Record<string, Behaviour | Behaviour[]>>, calls: string[] = []) {
  const counters: Record<string, number> = {};
  return (d: ProviderDef): LlmProvider => ({
    name: d.id,
    async generateJson<T>(_prompt: string, s: z.ZodType<T>) {
      calls.push(d.id);
      const entry = script[d.id] ?? "ok";
      const i = counters[d.id] ?? 0;
      counters[d.id] = i + 1;
      const b = Array.isArray(entry) ? (entry[Math.min(i, entry.length - 1)] as Behaviour) : entry;
      if (b === "ok") return s.parse({ ok: true });
      throw b;
    },
  });
}

const http = (status: number, kind: LlmHttpError["kind"], retryAfterSec?: number) => new LlmHttpError(`LLM HTTP ${status}`, status, kind, retryAfterSec);

function chain(opts: { feature?: AiFeature; script?: Parameters<typeof fake>[0]; store?: MemoryLlmStore; calls?: string[]; paidOnce?: boolean; at?: Date; paid?: Partial<typeof DEFAULT_PAID_SETTINGS>; defs?: ProviderDef[]; clock?: () => number; deadlineMs?: number } = {}) {
  const store = opts.store ?? new MemoryLlmStore();
  const calls = opts.calls ?? [];
  const c = createChain({
    defs: opts.defs ?? DEFS,
    store,
    feature: opts.feature ?? "explain",
    paid: { ...DEFAULT_PAID_SETTINGS, ...opts.paid },
    timeZone: "Asia/Kolkata",
    paidOnce: opts.paidOnce,
    now: () => opts.at ?? NOW,
    make: fake(opts.script ?? {}, calls),
    ...(opts.clock ? { clock: opts.clock } : {}),
    ...(opts.deadlineMs ? { deadlineMs: opts.deadlineMs } : {}),
  });
  return { c, store, calls };
}

describe("chain: free providers", () => {
  it("answers from the first provider and records usage", async () => {
    const { c, store } = chain({ feature: "background" });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(c.lastProvider).toBe("gemini");
    expect(store.usage).toEqual([{ provider: "gemini", feature: "background", calls: 1 }]);
  });

  it("honours a feature's preferred provider", async () => {
    const { c, calls } = chain({ feature: "hint" });
    await c.generateJson("p", schema);
    expect(calls).toEqual(["groq"]);
    expect(c.lastProvider).toBe("groq");
  });

  it("falls over to the next provider on a rate limit and remembers the cooldown", async () => {
    const calls: string[] = [];
    const { c, store } = chain({ feature: "background", script: { gemini: http(429, "rate", 30) }, calls });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(calls).toEqual(["gemini", "groq"]);
    expect(store.states.gemini).toMatchObject({ status: "cooldown", untilMs: NOW.getTime() + 30_000, lastError: "rate" });
  });

  it("skips a provider that is cooling down, then retries it once the cooldown ends", async () => {
    const store = new MemoryLlmStore();
    const calls: string[] = [];
    await chain({ feature: "background", script: { gemini: http(429, "rate", 30) }, store, calls }).c.generateJson("p", schema);
    calls.length = 0;

    await chain({ feature: "background", store, calls }).c.generateJson("p", schema);
    expect(calls).toEqual(["groq"]);

    calls.length = 0;
    const later = new Date(NOW.getTime() + 31_000);
    await chain({ feature: "background", store, calls, at: later }).c.generateJson("p", schema);
    expect(calls).toEqual(["gemini"]);
    expect(store.states.gemini).toMatchObject({ status: "closed", fails: 0 });
  });

  it("a daily quota keeps a provider out until the next local day", async () => {
    const store = new MemoryLlmStore();
    await chain({ feature: "background", script: { gemini: http(429, "quota-day") }, store }).c.generateJson("p", schema);
    const state = store.states.gemini!;
    expect(state.untilMs).toBeGreaterThan(NOW.getTime());
    expect(new Date(state.untilMs).toISOString().slice(0, 16)).toBe("2026-10-05T18:30"); // local midnight in IST
  });

  it("disables a provider whose key is rejected", async () => {
    const store = new MemoryLlmStore();
    await chain({ feature: "background", script: { gemini: http(401, "auth") }, store }).c.generateJson("p", schema);
    expect(store.states.gemini?.status).toBe("disabled");
    const calls: string[] = [];
    await chain({ feature: "background", store, calls, at: new Date(NOW.getTime() + 7 * 86_400_000) }).c.generateJson("p", schema);
    expect(calls).toEqual(["groq"]);
  });

  it("a bad reply moves to the next provider without penalising the first", async () => {
    const store = new MemoryLlmStore();
    const { c } = chain({ feature: "background", script: { gemini: new LlmInvalidOutputError("not json") }, store });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(c.lastProvider).toBe("groq");
    expect(store.states.gemini).toBeUndefined();
  });

  it("two transient failures in a row cool a provider down", async () => {
    const store = new MemoryLlmStore();
    const script = { gemini: http(503, "server") };
    await chain({ feature: "background", script, store }).c.generateJson("p", schema);
    expect(store.states.gemini).toMatchObject({ status: "closed", fails: 1 });
    await chain({ feature: "background", script, store }).c.generateJson("p", schema);
    expect(store.states.gemini?.status).toBe("cooldown");
  });

  it("reports every attempt when nothing works", async () => {
    const { c } = chain({ feature: "background", script: { gemini: http(429, "rate"), groq: http(503, "server") } });
    const err = await c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect(err.message).toContain("gemini: rate");
    expect(err.message).toContain("groq: server");
    expect(err.message).toContain("meta: not used (never)");
  });

  it("with nothing configured it fails clearly", async () => {
    const err = await chain({ defs: [] }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
  });
});

describe("chain: paid last resort", () => {
  const exhausted = { gemini: http(429, "rate"), groq: http(429, "rate") };

  it("never touches the paid provider while a free one works", async () => {
    const { calls, c } = chain({ feature: "explain" });
    await c.generateJson("p", schema);
    expect(calls).toEqual(["groq"]);
  });

  it("asks for confirmation once the free providers are exhausted, and does not call it", async () => {
    const calls: string[] = [];
    const err = await chain({ script: exhausted, calls }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(PaidConfirmRequiredError);
    expect(err).toMatchObject({ used: 0, cap: 20 });
    expect(calls).not.toContain("meta");
  });

  it("uses it for one call once you confirm, and counts it", async () => {
    const { c, store, calls } = chain({ script: exhausted, paidOnce: true });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(c.lastProvider).toBe("meta");
    expect(store.paidCalls).toBe(1);
    expect(calls.at(-1)).toBe("meta");
  });

  it("'allow today' skips the prompt for the rest of the day", async () => {
    const store = new MemoryLlmStore();
    await store.approvePaidToday();
    const { c } = chain({ script: exhausted, store });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(c.lastProvider).toBe("meta");
  });

  it("never runs for background features, even if approved", async () => {
    const store = new MemoryLlmStore();
    await store.approvePaidToday();
    const calls: string[] = [];
    const err = await chain({ feature: "background", script: exhausted, store, calls, paidOnce: true }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect(calls).not.toContain("meta");
    expect(store.paidCalls).toBe(0);
  });

  it("stops at the daily cap", async () => {
    const store = new MemoryLlmStore();
    store.paidCalls = 3;
    const err = await chain({ script: exhausted, store, paidOnce: true, paid: { dailyCap: 3 } }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect(err.message).toContain("meta: not used (cap)");
  });

  it("is off when disabled in settings", async () => {
    const err = await chain({ script: exhausted, paidOnce: true, paid: { enabled: false } }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect(err.message).toContain("not used (disabled)");
  });

  it("gives the reservation back when the paid call fails, so a failed call is not counted", async () => {
    const { c, store } = chain({ script: { ...exhausted, meta: http(500, "server") }, paidOnce: true });
    await c.generateJson("p", schema).catch(() => null);
    expect(store.paidCalls).toBe(0);
  });

  it("two concurrent calls cannot both take the last paid slot", async () => {
    const store = new MemoryLlmStore();
    store.paidCalls = 19;
    const run = () => chain({ script: exhausted, store, paidOnce: true }).c.generateJson("p", schema).then(() => "ok", () => "failed");
    const results = await Promise.all([run(), run()]);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(store.paidCalls).toBe(20);
  });

  it("with only the paid provider configured, it still asks first", async () => {
    const err = await chain({ defs: [def("meta", true)] }).c.generateJson("p", schema).catch((e) => e);
    expect(err).toBeInstanceOf(PaidConfirmRequiredError);
  });
});

describe("chain: request deadline", () => {
  it("stops trying more providers once the deadline has passed", async () => {
    const calls: string[] = [];
    let t = 0;
    const { c } = chain({ feature: "background", script: { gemini: http(500, "server") }, calls, clock: () => (t += 15_000), deadlineMs: 20_000 });
    await expect(c.generateJson("p", schema)).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(calls).toEqual(["gemini"]);
  });

  it("keeps going while inside the deadline", async () => {
    const calls: string[] = [];
    const { c } = chain({ feature: "background", script: { gemini: http(500, "server") }, calls, clock: () => 0 });
    expect(await c.generateJson("p", schema)).toEqual({ ok: true });
    expect(calls).toEqual(["gemini", "groq"]);
  });
});
