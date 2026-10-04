import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { SPECS } from "@/core/api/specs";

const SRC = readFileSync("extension/background.js", "utf8");
const KEY = "apiConfig";

type Call = { url: string; init: { method: string; headers: Record<string, string>; body: string } };

/** Runs the extension's real background script in a sandbox with a fake chrome and fetch. */
function sandbox(opts: { config?: unknown; status?: number; throwFetch?: boolean; queue?: unknown[] }) {
  const store: Record<string, unknown> = { ...(opts.config ? { [KEY]: opts.config } : {}), captures: opts.queue ?? [] };
  const calls: Call[] = [];
  const noop = { addListener() {}, removeListener() {} };
  const chrome = {
    storage: { local: { get: async (k: string) => ({ [k]: store[k] }), set: async (o: Record<string, unknown>) => void Object.assign(store, o), remove: async (k: string) => void delete store[k] } },
    action: { onClicked: noop, setBadgeBackgroundColor: async () => {}, setBadgeText: async () => {} },
    runtime: { onMessage: noop },
    tabs: { onUpdated: noop, query: async () => [], update: async () => {}, create: async () => ({ id: 1 }), sendMessage: async () => {} },
    windows: { update: async () => {} },
    scripting: { executeScript: async () => [] },
  };
  const fetchStub = async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    if (opts.throwFetch) throw new Error("offline");
    return { ok: (opts.status ?? 201) < 300, status: opts.status ?? 201 };
  };
  const ctx = vm.createContext({ chrome, fetch: fetchStub, crypto: { randomUUID: () => "uuid-1" }, URL, setTimeout, JSON, Promise, Array, Object, String, Error, console });
  vm.runInContext(SRC, ctx);
  return { ctx: ctx as unknown as { sendViaApi(e: unknown): Promise<string>; flushViaApi(): Promise<{ sent: number; auth: boolean; configured: boolean }> }, store, calls };
}

const CFG = { base: "https://prepos.example.com", token: "pk_aaaaaaaa_" + "b".repeat(32) };
const job = { id: "cap-1", payload: { kind: "job", title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/1", location: "Pune", jd: "Build APIs" } };
const profile = { id: "cap-2", payload: { kind: "profile", title: "Me", url: "https://example.com/in/me", text: "Backend engineer. ".repeat(20) } };

describe("extension API mode", () => {
  it("sends a job to /api/v1/jobs with the bearer token and the capture id as the Idempotency-Key", async () => {
    const { ctx, calls } = sandbox({ config: CFG });
    expect(await ctx.sendViaApi(job)).toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://prepos.example.com/api/v1/jobs");
    expect(calls[0]!.init).toMatchObject({ method: "POST", headers: { authorization: `Bearer ${CFG.token}`, "idempotency-key": "cap-1", "content-type": "application/json" } });
  });
  it("sends a profile to /api/v1/profiles", async () => {
    const { ctx, calls } = sandbox({ config: CFG });
    await ctx.sendViaApi(profile);
    expect(calls[0]!.url).toBe("https://prepos.example.com/api/v1/profiles");
  });
  it("sends bodies the API's own schemas accept, so the extension and the API cannot drift apart", async () => {
    const { ctx, calls } = sandbox({ config: CFG });
    await ctx.sendViaApi(job);
    await ctx.sendViaApi(profile);
    expect(SPECS.createJob.body.safeParse(JSON.parse(calls[0]!.init.body)).success).toBe(true);
    expect(SPECS.createProfile.body.safeParse(JSON.parse(calls[1]!.init.body)).success).toBe(true);
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual([SPECS.createJob.path, SPECS.createProfile.path]);
  });
  it("does nothing when no token is configured", async () => {
    const { ctx, calls } = sandbox({});
    expect(await ctx.sendViaApi(job)).toBe("none");
    expect(calls).toHaveLength(0);
  });
  it("maps responses: 401/403 mean fix the token, 5xx and offline mean try later, 422 means give up on it", async () => {
    for (const [status, want] of [[201, "sent"], [200, "sent"], [401, "auth"], [403, "auth"], [422, "sent"], [413, "sent"], [500, "later"], [503, "later"], [429, "later"]] as const) {
      expect(await sandbox({ config: CFG, status }).ctx.sendViaApi(job), String(status)).toBe(want);
    }
    expect(await sandbox({ config: CFG, throwFetch: true }).ctx.sendViaApi(job)).toBe("later");
  });
  it("flushes the queue: removes what was delivered, keeps what was not, and stops at a rejected token", async () => {
    const ok = sandbox({ config: CFG, queue: [job, profile] });
    expect(await ok.ctx.flushViaApi()).toEqual({ sent: 2, auth: false, configured: true });
    expect(ok.store.captures).toEqual([]);

    const down = sandbox({ config: CFG, throwFetch: true, queue: [job] });
    expect(await down.ctx.flushViaApi()).toMatchObject({ sent: 0, auth: false });
    expect(down.store.captures).toHaveLength(1);

    const denied = sandbox({ config: CFG, status: 401, queue: [job, profile] });
    expect(await denied.ctx.flushViaApi()).toMatchObject({ sent: 0, auth: true });
    expect(denied.store.captures).toHaveLength(2);
    expect(denied.calls).toHaveLength(1); // it stopped after the first refusal

    expect(await sandbox({ queue: [job] }).ctx.flushViaApi()).toMatchObject({ configured: false });
  });
  it("the manifest has an options page and optional host access, not blanket host permissions", () => {
    const m = JSON.parse(readFileSync("extension/manifest.json", "utf8")) as { options_ui: { page: string }; optional_host_permissions: string[]; host_permissions: string[] };
    expect(m.options_ui.page).toBe("options.html");
    expect(m.optional_host_permissions).toEqual(expect.arrayContaining(["https://*/*"]));
    expect(m.host_permissions).toEqual(["https://gemini.google.com/*"]);
  });
});
