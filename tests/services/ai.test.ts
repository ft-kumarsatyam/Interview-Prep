import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { settingsInputSchema } from "@/modules/settings/domain/settings";
import { resetEnvForTests } from "@/core/env";
import { AiCache, AiUsage, LlmState } from "@/core/models/ai";
import { Settings } from "@/core/models/system";
import { aiMetricsToday, approvePaidToday, runAi, usageToday } from "@/modules/ai/services/ai";
import { MAX_CACHED_BYTES, cacheKey, cachedAi } from "@/modules/ai/services/ai-cache";
import { mongoLlmStore } from "@/modules/ai/services/llm-store";
import { getSettings, saveSettings } from "@/modules/settings/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ["GEMINI_API_KEY", "GROQ_API_KEY", "META_LLAMA_API_KEY", "META_LLAMA_BASE_URL", "META_LLAMA_MODEL", "LLM_API_KEY", "LLM_CHAIN"]) delete process.env[k];
  resetEnvForTests();
});

const TZ = "Asia/Kolkata";

describe("mongo LLM store", () => {
  it("round-trips provider state", async () => {
    const store = mongoLlmStore(TZ);
    await store.saveState("gemini", { status: "cooldown", untilMs: 123, fails: 0, lastError: "rate" });
    expect((await store.loadStates()).gemini).toEqual({ status: "cooldown", untilMs: 123, fails: 0, lastError: "rate" });
    await store.saveState("gemini", { status: "closed", untilMs: 0, fails: 0, lastError: null });
    expect((await store.loadStates()).gemini?.status).toBe("closed");
  });

  it("ignores state rows that are not a provider slot id", async () => {
    await LlmState.create({ _id: "Not A Slot!", status: "disabled" });
    expect(await mongoLlmStore(TZ).loadStates()).toEqual({});
  });

  it("keeps per-key slot state and adds up lifetime tokens per fingerprint", async () => {
    const store = mongoLlmStore(TZ);
    await store.saveState("openrouter#abc123def0", { status: "disabled", untilMs: 0, fails: 0, lastError: "auth" });
    expect((await store.loadStates())["openrouter#abc123def0"]?.status).toBe("disabled");
    await store.addKeyTokens("abc123def0", "openrouter", 1200);
    await store.addKeyTokens("abc123def0", "openrouter", 300);
    expect(await store.keyTokens()).toEqual({ abc123def0: 1500 });
  });

  it("never lets concurrent callers reserve more paid calls than the cap", async () => {
    const store = mongoLlmStore(TZ);
    const results = await Promise.all(Array.from({ length: 12 }, () => store.reservePaid(3)));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await store.paidUsedToday()).toBe(3);
  });

  it("a cap of zero reserves nothing, and releasing frees a slot", async () => {
    const store = mongoLlmStore(TZ);
    expect(await store.reservePaid(0)).toBe(false);
    expect(await store.reservePaid(1)).toBe(true);
    expect(await store.reservePaid(1)).toBe(false);
    await store.releasePaid();
    expect(await store.reservePaid(1)).toBe(true);
  });

  it("counts per local day", async () => {
    let now = at("2026-10-05");
    const store = mongoLlmStore(TZ, () => now);
    await store.reservePaid(5);
    await store.reservePaid(5);
    expect(await store.paidUsedToday()).toBe(2);
    now = at("2026-10-06");
    expect(await store.paidUsedToday()).toBe(0);
  });

  it("'allow today' lasts for that local day only", async () => {
    let now = at("2026-10-05");
    const store = mongoLlmStore(TZ, () => now);
    expect(await store.isPaidApprovedToday()).toBe(false);
    await store.approvePaidToday();
    await store.approvePaidToday();
    expect(await store.isPaidApprovedToday()).toBe(true);
    now = at("2026-10-06");
    expect(await store.isPaidApprovedToday()).toBe(false);
  });

  it("accumulates usage per provider and feature", async () => {
    const store = mongoLlmStore(TZ);
    await store.recordUsage({ provider: "gemini", feature: "hint", calls: 1 });
    await store.recordUsage({ provider: "gemini", feature: "hint", calls: 1, fails: 1 });
    await store.recordUsage({ provider: "cache", feature: "hint", cacheHits: 1 });
    const row = await AiUsage.findOne({ provider: "gemini", feature: "hint" }).lean();
    expect(row).toMatchObject({ calls: 2, fails: 1 });
    expect(await AiUsage.countDocuments()).toBe(2);
  });
});

describe("cachedAi", () => {
  const schema = z.object({ hint: z.string() });
  const base = { feature: "hint" as const, version: "v1", input: "two sum", ttlDays: 7, schema };

  it("computes once, then serves from the cache", async () => {
    const compute = vi.fn(async () => ({ value: { hint: "use a map" }, provider: "Groq" }));
    const first = await cachedAi(base, compute);
    const second = await cachedAi(base, compute);
    expect(first).toMatchObject({ cached: false, value: { hint: "use a map" } });
    expect(second).toMatchObject({ cached: true, value: { hint: "use a map" }, provider: "Groq" });
    expect(compute).toHaveBeenCalledTimes(1);
    expect((await AiCache.findOne().lean())?.hits).toBe(1);
  });

  it("treats differently-spaced input as the same question, but a new version or feature as new", async () => {
    expect(cacheKey("hint", "v1", "two  sum\n")).toBe(cacheKey("hint", "v1", " two sum"));
    expect(cacheKey("hint", "v1", "x")).not.toBe(cacheKey("hint", "v2", "x"));
    expect(cacheKey("hint", "v1", "x")).not.toBe(cacheKey("explain", "v1", "x"));
  });

  it("expires after the ttl", async () => {
    const compute = vi.fn(async () => ({ value: { hint: "h" } }));
    await cachedAi({ ...base, now: () => at("2026-10-05") }, compute);
    await cachedAi({ ...base, now: () => at("2026-10-10") }, compute);
    expect(compute).toHaveBeenCalledTimes(1);
    await cachedAi({ ...base, now: () => at("2026-10-13") }, compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("ignores a cached answer stored under an older shape", async () => {
    await AiCache.create({ _id: cacheKey("hint", "v1", "two sum"), feature: "hint", output: { old: "shape" }, expiresAt: new Date(Date.now() + 1e9) });
    const compute = vi.fn(async () => ({ value: { hint: "fresh" } }));
    expect((await cachedAi(base, compute)).value).toEqual({ hint: "fresh" });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("never caches a failure, and never stores an oversized answer", async () => {
    await expect(
      cachedAi(base, async () => {
        throw new Error("provider down");
      }),
    ).rejects.toThrow("provider down");
    expect(await AiCache.countDocuments()).toBe(0);

    const big = { hint: "x".repeat(MAX_CACHED_BYTES + 100) };
    expect((await cachedAi(base, async () => ({ value: big }))).value).toEqual(big);
    expect(await AiCache.countDocuments()).toBe(0);
  });

  it("refuses to cache output that fails validation", async () => {
    await expect(cachedAi(base, async () => ({ value: { hint: 42 } as unknown as { hint: string } }))).rejects.toThrow();
    expect(await AiCache.countDocuments()).toBe(0);
  });

  it("records cache hits in usage", async () => {
    const compute = async () => ({ value: { hint: "h" } });
    await cachedAi({ ...base, timeZone: TZ }, compute);
    await cachedAi({ ...base, timeZone: TZ }, compute);
    expect((await AiUsage.findOne({ provider: "cache" }).lean())?.cacheHits).toBe(1);
  });
});

const geminiOk = (body: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 });
const chatOk = (body: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(body) } }] }), { status: 200 });
const fail = (status: number, text: string, headers: Record<string, string> = {}) => new Response(text, { status, headers });
const hint = z.object({ hint: z.string() });

function useKeys(extra: Record<string, string> = {}) {
  Object.assign(process.env, { GEMINI_API_KEY: "gem-key-1234567", GROQ_API_KEY: "groq-key-1234567", ...extra });
  resetEnvForTests();
}
const hostOf = (url: unknown) => new URL(String(url)).hostname;

describe("runAi through the real adapters", () => {
  it("says so plainly when no provider is configured", async () => {
    resetEnvForTests();
    const res = await runAi("hint", {}, async (llm) => llm.generateJson("p", hint));
    expect(res).toMatchObject({ ok: false, unavailable: true });
  });

  it("answers from the preferred provider", async () => {
    useKeys();
    const fetchMock = vi.fn(async (url: unknown) => (hostOf(url).includes("groq") ? chatOk({ hint: "from groq" }) : geminiOk({ hint: "from gemini" })));
    vi.stubGlobal("fetch", fetchMock);
    const res = await runAi("hint", {}, async (llm) => llm.generateJson("p", hint));
    expect(res).toEqual({ ok: true, data: { hint: "from groq" }, provider: "Groq" });
  });

  it("fails over when a provider is rate limited and remembers it across calls", async () => {
    useKeys();
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        calls.push(hostOf(url));
        return hostOf(url).includes("groq") ? fail(429, "Rate limit reached. Please try again in 40s.", { "retry-after": "40" }) : geminiOk({ hint: "from gemini" });
      }),
    );
    const first = await runAi("hint", {}, async (llm) => llm.generateJson("p", hint));
    expect(first).toMatchObject({ ok: true, data: { hint: "from gemini" } });
    expect(calls).toEqual(["api.groq.com", "generativelanguage.googleapis.com"]);

    calls.length = 0;
    await runAi("hint", {}, async (llm) => llm.generateJson("p", hint));
    expect(calls).toEqual(["generativelanguage.googleapis.com"]);
    expect((await LlmState.findById("groq").lean())?.status).toBe("cooldown");
  });

  it("disables a provider whose key is rejected (Gemini answers 400 'API key not valid')", async () => {
    useKeys();
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => (hostOf(url).includes("googleapis") ? fail(400, '{"error":{"message":"API key not valid. Please pass a valid API key."}}') : chatOk({ hint: "ok" }))));
    const res = await runAi("code-review", {}, async (llm) => llm.generateJson("p", hint));
    expect(res).toMatchObject({ ok: true, data: { hint: "ok" } });
    expect((await LlmState.findById("gemini").lean())?.status).toBe("disabled");
  });

  it("never leaks the API key into an error", async () => {
    useKeys({ LLM_CHAIN: "gemini" });
    delete process.env.GROQ_API_KEY;
    resetEnvForTests();
    vi.stubGlobal("fetch", vi.fn(async () => fail(500, "boom gem-key-1234567 boom")));
    const res = await runAi("hint", {}, async (llm) => llm.generateJson("p", hint));
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).not.toContain("gem-key-1234567");
  });

  describe("paid last resort", () => {
    const paidEnv = { META_LLAMA_API_KEY: "meta-key-1234567", META_LLAMA_BASE_URL: "https://llama.example.com/v1", META_LLAMA_MODEL: "m1" };
    const stub = (calls: string[]) =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: unknown) => {
          calls.push(hostOf(url));
          return hostOf(url).includes("llama.example.com") ? chatOk({ hint: "paid answer" }) : fail(429, "slow down");
        }),
      );

    it("stops and asks before spending, without calling the paid provider", async () => {
      useKeys(paidEnv);
      const calls: string[] = [];
      stub(calls);
      const res = await runAi("explain", {}, async (llm) => llm.generateJson("p", hint));
      expect(res).toMatchObject({ ok: false, needsPaid: { used: 0, cap: 20 } });
      expect(calls).not.toContain("llama.example.com");
    });

    it("uses it once you confirm that call, and counts it", async () => {
      useKeys(paidEnv);
      stub([]);
      const res = await runAi("explain", { paidOnce: true }, async (llm) => llm.generateJson("p", hint));
      expect(res).toMatchObject({ ok: true, data: { hint: "paid answer" }, provider: "Meta Llama (paid)" });
      expect(await mongoLlmStore("Asia/Kolkata").paidUsedToday()).toBe(1);
    });

    it("'allow today' removes the prompt, and the daily cap still holds", async () => {
      useKeys(paidEnv);
      stub([]);
      await Settings.create({ _id: "settings", llmPaidDailyCap: 1 });
      await approvePaidToday();
      expect((await runAi("explain", {}, async (llm) => llm.generateJson("p", hint))).ok).toBe(true);
      const second = await runAi("explain", {}, async (llm) => llm.generateJson("p", hint));
      expect(second.ok).toBe(false);
      expect(second).not.toHaveProperty("needsPaid");
    });

    it("is off when disabled in Settings", async () => {
      useKeys(paidEnv);
      stub([]);
      await Settings.create({ _id: "settings", llmPaidEnabled: false });
      const res = await runAi("explain", { paidOnce: true }, async (llm) => llm.generateJson("p", hint));
      expect(res.ok).toBe(false);
      expect(res).not.toHaveProperty("needsPaid");
    });
  });

  it("shows today's usage", async () => {
    useKeys();
    vi.stubGlobal("fetch", vi.fn(async () => geminiOk({ hint: "h" })));
    await runAi("code-review", {}, async (llm) => llm.generateJson("p", hint));
    expect(await usageToday()).toEqual([{ provider: "gemini", feature: "code-review", calls: 1, fails: 0, cacheHits: 0 }]);
  });
});

describe("latency, token and failover metrics", () => {
  it("records latency, estimated tokens and a failover for the provider that answered after another failed", async () => {
    useKeys();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => (hostOf(url).includes("google") ? fail(500, "boom") : chatOk({ hint: "h" }))),
    );
    await runAi("code-review", {}, async (llm) => llm.generateJson("a prompt of some length", hint));
    const rows = await aiMetricsToday();
    const answered = rows.find((r) => r.failovers === 1);
    expect(answered).toBeDefined();
    expect(answered!.calls).toBe(1);
    expect(answered!.tokensIn).toBeGreaterThan(0);
    expect(answered!.tokensOut).toBeGreaterThan(0);
    expect(answered!.p50Ms).not.toBeNull();
    expect(answered!.p95Ms).toBeGreaterThanOrEqual(answered!.p50Ms!);
    expect(rows.reduce((a, r) => a + r.calls, 0)).toBeGreaterThanOrEqual(2);
  });

  it("increments the right histogram buckets", async () => {
    const { usageIncrements } = await import("@/modules/ai/services/llm-store");
    expect(usageIncrements({ provider: "gemini", feature: "hint", calls: 1, latencyMs: 700, firstTokenMs: 90, tokensIn: 10, tokensOut: 5, failover: true })).toEqual({
      calls: 1, fails: 0, cacheHits: 0, tokensIn: 10, tokensOut: 5, failovers: 1, latCount: 1, latSumMs: 700, lat2: 1, ttft0: 1,
    });
  });
});

describe("paid settings", () => {
  it("default to on, confirm first, 20 calls a day", async () => {
    expect((await getSettings()).llmPaid).toEqual({ enabled: true, dailyCap: 20, requireConfirm: true });
  });

  it("are saved from the Settings form", async () => {
    const form = {
      startDate: "2026-10-05",
      endDate: "2027-03-21",
      quizPassPct: 60,
      topicMasteryPct: 70,
      minDailyDsa: 3,
      maxDailyDsa: 6,
      maxSaturdayDsa: 10,
      maxDailyTheory: 5,
      revisionWeeks: 3,
      restDays: [],
      googleNewsQueries: null,
      leetcodeUsername: null,
    };
    await saveSettings({ ...form, llmPaidEnabled: false, llmPaidDailyCap: 5, llmPaidRequireConfirm: false }, at("2026-10-05"));
    expect((await getSettings()).llmPaid).toEqual({ enabled: false, dailyCap: 5, requireConfirm: false });
    await saveSettings(form, at("2026-10-05"));
    expect((await getSettings()).llmPaid).toEqual({ enabled: false, dailyCap: 5, requireConfirm: false });
  });
});

describe("Gemini project links", () => {
  const form = {
    startDate: "2026-10-05",
    endDate: "2027-03-21",
    quizPassPct: 60,
    topicMasteryPct: 70,
    minDailyDsa: 3,
    maxDailyDsa: 6,
    maxSaturdayDsa: 10,
    maxDailyTheory: 5,
    revisionWeeks: 3,
    restDays: [],
    googleNewsQueries: null,
    leetcodeUsername: null,
  };

  it("start empty", async () => {
    expect((await getSettings()).geminiLinks).toEqual({});
  });

  it("are saved, normalised, and blank removes one", async () => {
    await saveSettings({ ...form, geminiLinks: { dsa: " https://gemini.google.com/gem/dsa ", hld: "https://gemini.google.com/gem/hld", os: "" } }, at("2026-10-05"));
    expect((await getSettings()).geminiLinks).toEqual({ dsa: "https://gemini.google.com/gem/dsa", hld: "https://gemini.google.com/gem/hld" });
    await saveSettings({ ...form, geminiLinks: { dsa: "", hld: "https://gemini.google.com/gem/hld" } }, at("2026-10-05"));
    expect((await getSettings()).geminiLinks).toEqual({ hld: "https://gemini.google.com/gem/hld" });
  });

  it("are kept when the form doesn't send any", async () => {
    await saveSettings({ ...form, geminiLinks: { dsa: "https://gemini.google.com/gem/dsa" } }, at("2026-10-05"));
    await saveSettings(form, at("2026-10-05"));
    expect((await getSettings()).geminiLinks).toEqual({ dsa: "https://gemini.google.com/gem/dsa" });
  });

  it("drops anything unsafe that somehow reached the database", async () => {
    await Settings.create({ _id: "settings", geminiLinks: { dsa: "javascript:alert(1)", hld: "https://evil.example.com/x", os: "https://gemini.google.com/gem/os", mystery: "https://gemini.google.com/x" } });
    expect((await getSettings()).geminiLinks).toEqual({ os: "https://gemini.google.com/gem/os" });
  });

  it("the form schema rejects non-Google, non-https and unknown-subject links with a per-subject message", () => {
    const bad = settingsInputSchema.safeParse({ ...form, geminiLinks: { dsa: "http://gemini.google.com/gem/x", hld: "https://evil.example.com", nope: "https://gemini.google.com/x" } });
    expect(bad.success).toBe(false);
    const paths = !bad.success ? bad.error.issues.map((i) => i.path.join(".")) : [];
    expect(paths).toEqual(expect.arrayContaining(["geminiLinks.dsa", "geminiLinks.hld", "geminiLinks.nope"]));
  });

  it("the form schema accepts blanks and valid links", () => {
    const parsed = settingsInputSchema.safeParse({ ...form, leetcodeUsername: "", geminiLinks: { dsa: "", hld: "https://gemini.google.com/gem/hld" } });
    expect(parsed.success).toBe(true);
  });
});
