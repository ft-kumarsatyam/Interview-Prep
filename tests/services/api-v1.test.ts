import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/core/env";
import { ApiToken } from "@/core/models/api-token";
import { Job } from "@/core/models/jobs";
import { JobPosting } from "@/core/models/job-postings";
import { Resume } from "@/core/models/resume";
import { Settings } from "@/core/models/system";
import { authenticateApiRequest, createApiToken, listApiTokens, revokeApiToken } from "@/core/services/api-tokens";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await Promise.all([ApiToken.syncIndexes(), Job.syncIndexes(), JobPosting.syncIndexes(), Resume.syncIndexes()]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetEnvForTests();
});

const BASE = "http://x";
const JOB = { title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/1", jd: "Node.js and PostgreSQL role for an engineer who likes APIs." };

async function token(scopes: Array<"jobs:read" | "jobs:write" | "capture:write">, days = 30) {
  const r = await createApiToken({ name: "test", scopes, days });
  if (!r.ok) throw new Error(r.error);
  return r.token;
}
const req = (path: string, method: string, tok: string | null, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method, headers: { ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
const jobsRoute = () => import("@/app/api/v1/jobs/route");
const body = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("API tokens", () => {
  it("creates a token whose plaintext is shown once, stores only its hash, and lists it without the secret", async () => {
    const r = await createApiToken({ name: "Chrome extension", scopes: ["capture:write"], days: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.token).toMatch(/^pk_[a-z0-9]{8}_[a-z0-9]{32}$/);
    const row = await ApiToken.findOne({}).lean();
    expect(JSON.stringify(row)).not.toContain(r.token.split("_")[2]!);
    expect(row?.hash).toMatch(/^[a-f0-9]{64}$/);
    const list = await listApiTokens();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Chrome extension", scopes: ["capture:write"], state: "ok", prefix: r.token.split("_")[1] });
    expect(JSON.stringify(list)).not.toContain(r.token);
  });
  it("authenticates a good token and reports why a bad one failed", async () => {
    const tok = await token(["jobs:read"]);
    expect(await authenticateApiRequest(req("/x", "GET", tok))).toMatchObject({ ok: true, ownerId: "owner", scopes: ["jobs:read"] });
    expect(await authenticateApiRequest(req("/x", "GET", null))).toMatchObject({ ok: false, code: "missing_token" });
    expect(await authenticateApiRequest(req("/x", "GET", "pk_aaaaaaaa_" + "b".repeat(32)))).toMatchObject({ ok: false, code: "invalid_token" });
    expect(await authenticateApiRequest(new Request(BASE, { headers: { authorization: "Bearer nonsense" } }))).toMatchObject({ ok: false, code: "invalid_token" });
  });
  it("rejects an expired token and a revoked one", async () => {
    const tok = await token(["jobs:read"], 1);
    expect((await authenticateApiRequest(req("/x", "GET", tok), new Date(Date.now() + 2 * 86_400_000)))).toMatchObject({ ok: false, code: "expired_token" });
    const id = String((await ApiToken.findOne({}).lean())!._id);
    expect(await revokeApiToken(id)).toBe(true);
    expect(await revokeApiToken(id)).toBe(false);
    expect(await authenticateApiRequest(req("/x", "GET", tok))).toMatchObject({ ok: false, code: "revoked_token" });
    expect((await listApiTokens())[0]!.state).toBe("revoked");
    expect(await revokeApiToken("nope")).toBe(false);
  });
  it("records last use, but not on every request", async () => {
    const tok = await token(["jobs:read"]);
    const t0 = new Date();
    await authenticateApiRequest(req("/x", "GET", tok), t0);
    const first = (await ApiToken.findOne({}).lean())!.lastUsedAt!;
    await authenticateApiRequest(req("/x", "GET", tok), new Date(t0.getTime() + 1000));
    expect((await ApiToken.findOne({}).lean())!.lastUsedAt!.getTime()).toBe(first.getTime());
    await authenticateApiRequest(req("/x", "GET", tok), new Date(t0.getTime() + 6 * 60_000));
    expect((await ApiToken.findOne({}).lean())!.lastUsedAt!.getTime()).toBeGreaterThan(first.getTime());
  });
  it("validates input and caps the number of active tokens", async () => {
    expect(await createApiToken({ name: "x", scopes: ["jobs:read"] })).toMatchObject({ ok: false });
    expect(await createApiToken({ name: "fine name", scopes: [] })).toMatchObject({ ok: false });
    for (let i = 0; i < 20; i++) expect((await createApiToken({ name: `token ${i}`, scopes: ["jobs:read"] })).ok).toBe(true);
    expect(await createApiToken({ name: "one too many", scopes: ["jobs:read"] })).toMatchObject({ ok: false, error: expect.stringContaining("up to 20") });
  });
});

describe("POST /api/v1/jobs", () => {
  it("captures a job with the right scope and returns 201 with the id", async () => {
    const { POST } = await jobsRoute();
    const res = await POST(req("/api/v1/jobs", "POST", await token(["capture:write"]), JOB));
    expect(res.status).toBe(201);
    expect(res.headers.get("x-ratelimit-remaining")).toBeTruthy();
    const b = await body(res);
    expect(b).toMatchObject({ duplicate: false });
    expect(await Job.findById(b.id).lean()).toMatchObject({ title: "Backend Engineer", company: "Acme" });
  });
  it("returns 200 and duplicate: true for the same posting captured twice", async () => {
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    await POST(req("/api/v1/jobs", "POST", tok, JOB));
    const again = await POST(req("/api/v1/jobs", "POST", tok, JOB));
    expect(again.status).toBe(200);
    expect(await body(again)).toMatchObject({ duplicate: true });
    expect(await Job.countDocuments({})).toBe(1);
  });
  it("401 without a token, 403 without the scope, and neither reveals anything", async () => {
    const { POST } = await jobsRoute();
    const none = await POST(req("/api/v1/jobs", "POST", null, JOB));
    expect(none.status).toBe(401);
    expect(none.headers.get("www-authenticate")).toContain("Bearer");
    expect((await body(none)).error.code).toBe("missing_token");
    const wrong = await POST(req("/api/v1/jobs", "POST", await token(["jobs:read"]), JOB));
    expect(wrong.status).toBe(403);
    expect((await body(wrong)).error).toMatchObject({ code: "insufficient_scope", message: expect.stringContaining("capture:write") });
    expect(await Job.countDocuments({})).toBe(0);
  });
  it("400 for bad JSON, 422 with field details for a bad body, 413 for a huge one", async () => {
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    expect((await POST(req("/api/v1/jobs", "POST", tok, "{not json"))).status).toBe(400);
    const bad = await POST(req("/api/v1/jobs", "POST", tok, { title: "x", company: "", url: "ftp://nope" }));
    expect(bad.status).toBe(422);
    const b = await body(bad);
    expect(b.error.code).toBe("validation_error");
    expect(b.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(["title", "company", "url"]));
    expect(JSON.stringify(b)).not.toContain("ftp://nope");
    expect((await POST(req("/api/v1/jobs", "POST", tok, "x".repeat(1_600_000)))).status).toBe(413);
  });
});

describe("idempotency", () => {
  const key = { "idempotency-key": "key-123456789" };
  it("replays the first response for the same key and request, doing the work once", async () => {
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    const first = await POST(req("/api/v1/jobs", "POST", tok, JOB, key));
    const second = await POST(req("/api/v1/jobs", "POST", tok, JOB, key));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replayed")).toBe("true");
    expect(first.headers.get("idempotent-replayed")).toBeNull();
    expect(await body(second)).toEqual(await body(first));
    expect(await Job.countDocuments({})).toBe(1);
  });
  it("refuses the same key with a different body (422) and a malformed key (400)", async () => {
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    await POST(req("/api/v1/jobs", "POST", tok, JOB, key));
    const reuse = await POST(req("/api/v1/jobs", "POST", tok, { ...JOB, title: "Another Role" }, key));
    expect(reuse.status).toBe(422);
    expect((await body(reuse)).error.code).toBe("idempotency_key_reuse");
    expect((await POST(req("/api/v1/jobs", "POST", tok, JOB, { "idempotency-key": "bad key!" }))).status).toBe(400);
  });
  it("scopes keys per token: another token with the same key is a fresh request", async () => {
    const { POST } = await jobsRoute();
    await POST(req("/api/v1/jobs", "POST", await token(["capture:write"]), JOB, key));
    const other = await POST(req("/api/v1/jobs", "POST", await token(["capture:write"]), { ...JOB, url: "https://acme.com/jobs/2" }, key));
    expect(other.status).toBe(201);
    expect(other.headers.get("idempotent-replayed")).toBeNull();
  });
  it("answers 409 while the first request with that key is still running, and does not store a 5xx", async () => {
    const { getKv } = await import("@/core/kv");
    const { lockKey } = await import("@/core/domain/idempotency");
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    const tokenId = String((await ApiToken.findOne({}).lean())!._id);
    await getKv().setNx(lockKey(tokenId, "key-123456789"), "1", 60);
    const busy = await POST(req("/api/v1/jobs", "POST", tok, JOB, key));
    expect(busy.status).toBe(409);
    expect(busy.headers.get("retry-after")).toBe("1");
    expect(await Job.countDocuments({})).toBe(0);
  });
  it("without a key the same request simply runs again (and de-duplicates by itself)", async () => {
    const { POST } = await jobsRoute();
    const tok = await token(["capture:write"]);
    expect((await POST(req("/api/v1/jobs", "POST", tok, JOB))).status).toBe(201);
    expect((await POST(req("/api/v1/jobs", "POST", tok, JOB))).status).toBe(200);
  });
});

describe("GET /api/v1/jobs", () => {
  it("lists tracked jobs for a read token and nothing sensitive", async () => {
    const { GET, POST } = await jobsRoute();
    await POST(req("/api/v1/jobs", "POST", await token(["capture:write"]), JOB));
    const res = await GET(req("/api/v1/jobs", "GET", await token(["jobs:read"])));
    expect(res.status).toBe(200);
    const b = await body(res);
    expect(b.jobs).toHaveLength(1);
    expect(Object.keys(b.jobs[0]).toSorted()).toEqual(["appliedOn", "company", "id", "location", "status", "title", "updatedAt", "url"]);
    expect(JSON.stringify(b)).not.toContain("Node.js and PostgreSQL role");
  });
  it("needs the read scope", async () => {
    const { GET } = await jobsRoute();
    expect((await GET(req("/api/v1/jobs", "GET", await token(["capture:write"])))).status).toBe(403);
  });
});

describe("POST /api/v1/postings and /profiles", () => {
  it("pushes postings with the jobs:write scope, counting rejected ones", async () => {
    const { POST } = await import("@/app/api/v1/postings/route");
    const good = { title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/9", description: "Node.js" };
    const res = await POST(req("/api/v1/postings", "POST", await token(["jobs:write"]), { jobs: [good, { title: "x" }, { ...good, url: "https://www.linkedin.com/jobs/1" }] }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ accepted: 1, added: 1, rejected: 2 });
    expect(await JobPosting.countDocuments({})).toBe(1);
    expect((await POST(req("/api/v1/postings", "POST", await token(["capture:write"]), { jobs: [] }))).status).toBe(403);
    expect((await POST(req("/api/v1/postings", "POST", await token(["jobs:write"]), { jobs: Array.from({ length: 101 }, () => good) }))).status).toBe(422);
  });
  it("captures a profile page", async () => {
    const { POST } = await import("@/app/api/v1/profiles/route");
    const res = await POST(req("/api/v1/profiles", "POST", await token(["capture:write"]), { title: "My profile", url: "https://example.com/in/me", text: "Backend engineer. ".repeat(20) }));
    expect(res.status).toBe(201);
    expect((await body(res)).id).toMatch(/^[a-f0-9]{24}$/);
  });
});

describe("rate limiting and errors", () => {
  it("limits per token with Retry-After, and another token is unaffected", async () => {
    const { GET } = await jobsRoute();
    const a = await token(["jobs:read"]);
    const b = await token(["jobs:read"]);
    let last: Response | undefined;
    for (let i = 0; i < 121; i++) last = await GET(req("/api/v1/jobs", "GET", a));
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect((await body(last!)).error.code).toBe("rate_limited");
    expect((await GET(req("/api/v1/jobs", "GET", b))).status).toBe(200);
  });
  it("hides internal error messages behind a generic 500", async () => {
    const { POST } = await import("@/app/api/v1/postings/route");
    const job = await import("@/modules/jobs/services/job-ingest");
    vi.spyOn(job, "ingestPushed").mockRejectedValueOnce(new Error("secret database detail mongodb://user:pw@host"));
    const res = await POST(req("/api/v1/postings", "POST", await token(["jobs:write"]), { jobs: [] }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await body(res))).not.toContain("mongodb://");
  });
  it("serves the OpenAPI document publicly", async () => {
    const { GET } = await import("@/app/api/v1/openapi.json/route");
    const res = GET(new Request(`${BASE}/api/v1/openapi.json`));
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown>; servers: Array<{ url: string }> };
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toContain("/api/v1/jobs");
  });
});
