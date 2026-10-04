import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { careerSources } from "@/core/content";
import { JobPosting, JobSource } from "@/core/models/job-postings";
import { Settings } from "@/core/models/system";
import type { Fetcher } from "@/modules/jobs/lib/connectors";
import { ensureSources, syncJobs, trimPostings } from "@/modules/jobs/services/job-sync";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const fx = (n: string) => readFileSync(`tests/fixtures/jobs/${n}.json`, "utf8");
const ok = (text: string, headers: Record<string, string> = {}) => ({ status: 200, text, headers: new Headers(headers) });

/** Serves the recorded fixture for each API, and can be told to fail or change a source. */
function fakeNet(over: { fail?: (url: string) => boolean; greenhouse?: () => string; delayMs?: number } = {}) {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    if (over.delayMs) await new Promise((r) => setTimeout(r, over.delayMs));
    if (over.fail?.(url)) throw new Error("HTTP 500");
    if (url.includes("greenhouse.io")) return ok((over.greenhouse ?? (() => fx("greenhouse")))());
    if (url.includes("lever.co")) return ok(fx("lever"));
    if (url.includes("ashbyhq.com")) return ok(fx("ashby"));
    if (url.includes("workable.com")) return ok(fx("workable"));
    if (url.includes("smartrecruiters.com")) return ok(fx("smartrecruiters"));
    if (url.includes("remoteok.com")) return ok(fx("remoteok"));
    if (url.includes("remotive.com")) return ok(fx("remotive"));
    return ok(fx("arbeitnow"));
  };
  return { fetcher, calls };
}

const T0 = new Date("2026-10-05T06:00:00Z");
const hours = (h: number) => new Date(T0.getTime() + h * 3_600_000);
const only = ["stripe", "palantir", "ramp"];

describe("syncJobs", () => {
  it("seeds every built-in source and keeps your on/off choice across runs", async () => {
    await ensureSources();
    expect(await JobSource.countDocuments()).toBe(careerSources.length + 3);
    await JobSource.updateOne({ _id: "stripe" }, { $set: { enabled: false } });
    await ensureSources();
    expect((await JobSource.findById("stripe").lean())!.enabled).toBe(false);
    expect((await JobSource.findById("arbeitnow").lean())!.enabled).toBe(false);
    expect((await JobSource.findById("remoteok").lean())!.enabled).toBe(true);
  });

  it("stores only engineering roles from each source, and records health", async () => {
    const net = fakeNet();
    const s = await syncJobs({ now: T0, fetcher: net.fetcher, only });
    expect(s).toMatchObject({ status: "done", sources: 3, ok: 3, failed: [] });
    expect(s.added).toBeGreaterThan(0);
    const rows = await JobPosting.find({}).lean();
    expect(rows.length).toBe(s.added);
    expect(new Set(rows.map((r) => r.sourceId))).toEqual(new Set(only));
    expect(rows.every((r) => r.closedAt === null && r.dismissed === false && r.alerted === false)).toBe(true);
    const health = (await JobSource.findById("stripe").lean())!;
    expect(health).toMatchObject({ consecutiveFailures: 0, lastError: "" });
    expect(health.lastOkAt).toEqual(T0);
    expect(health.lastCount).toBeGreaterThan(0);
  });

  it("is idempotent: the minimum gap skips a source just tried, and a later run adds no duplicates", async () => {
    const net = fakeNet();
    const first = await syncJobs({ now: T0, fetcher: net.fetcher, only });
    const again = await syncJobs({ now: hours(1), fetcher: net.fetcher, only });
    expect(again.sources).toBe(0);
    const later = await syncJobs({ now: hours(4), fetcher: net.fetcher, only });
    expect(later).toMatchObject({ sources: 3, ok: 3, added: 0, closed: 0 });
    expect(await JobPosting.countDocuments()).toBe(first.added);
    const row = (await JobPosting.findOne({ sourceId: "stripe" }).lean())!;
    expect(row.firstSeenAt).toEqual(T0);
    expect(row.lastSeenAt).toEqual(hours(4));
  });

  it("closes postings that disappear and reopens ones that return, keeping what you dismissed", async () => {
    const base = JSON.parse(fx("greenhouse")) as { jobs: Array<{ id: number } & Record<string, unknown>> };
    const three = { ...base, jobs: base.jobs.slice(0, 3).map((j, i) => ({ ...j, title: `Software Engineer ${i + 1}` })) };
    const original = JSON.stringify(three);
    let body = original;
    const net = fakeNet({ greenhouse: () => body });
    await syncJobs({ now: T0, fetcher: net.fetcher, only: ["stripe"] });
    const before = await JobPosting.find({ sourceId: "stripe" }).lean();
    expect(before).toHaveLength(3);
    const gone = before[0]!;
    await JobPosting.updateOne({ key: gone.key }, { $set: { dismissed: true } });

    const goneId = Number(gone.externalId);
    body = JSON.stringify({ ...three, jobs: three.jobs.filter((j) => j.id !== goneId) });
    const closing = await syncJobs({ now: hours(4), fetcher: net.fetcher, only: ["stripe"] });
    expect(closing.closed).toBe(1);
    expect((await JobPosting.findOne({ key: gone.key }).lean())!.closedAt).toEqual(hours(4));

    body = original;
    await syncJobs({ now: hours(8), fetcher: net.fetcher, only: ["stripe"] });
    const back = (await JobPosting.findOne({ key: gone.key }).lean())!;
    expect(back.closedAt).toBeNull();
    expect(back.dismissed).toBe(true);
  });

  it("isolates failures: a broken company backs off and the others still sync", async () => {
    const net = fakeNet({ fail: (u) => u.includes("api.lever.co") });
    const s = await syncJobs({ now: T0, fetcher: net.fetcher, only });
    expect(s).toMatchObject({ ok: 2 });
    expect(s.failed).toEqual([{ id: "palantir", error: "HTTP 500" }]);
    const h = (await JobSource.findById("palantir").lean())!;
    expect(h.consecutiveFailures).toBe(1);
    expect(h.cooldownUntil).toEqual(new Date(T0.getTime() + 30 * 60_000));
    // Cooling down: skipped on the next run, retried (with a longer pause) after it ends.
    expect((await syncJobs({ now: hours(1), fetcher: net.fetcher, only: ["palantir"] })).sources).toBe(0);
    const retry = await syncJobs({ now: hours(4), fetcher: net.fetcher, only: ["palantir"] });
    expect(retry.failed).toHaveLength(1);
    expect((await JobSource.findById("palantir").lean())!.consecutiveFailures).toBe(2);
    // A later success clears it.
    const fixed = fakeNet();
    await syncJobs({ now: hours(12), fetcher: fixed.fetcher, only: ["palantir"] });
    expect((await JobSource.findById("palantir").lean())).toMatchObject({ consecutiveFailures: 0, lastError: "" });
  });

  it("treats a malformed response as a failure, not as 'no jobs' (so nothing is closed by mistake)", async () => {
    const net = fakeNet();
    await syncJobs({ now: T0, fetcher: net.fetcher, only: ["stripe"] });
    const count = await JobPosting.countDocuments({ sourceId: "stripe", closedAt: null });
    const broken = fakeNet({ greenhouse: () => "<html>maintenance</html>" });
    const s = await syncJobs({ now: hours(4), fetcher: broken.fetcher, only: ["stripe"] });
    expect(s.failed).toHaveLength(1);
    expect(await JobPosting.countDocuments({ sourceId: "stripe", closedAt: null })).toBe(count);
  });

  it("only one sync runs at a time", async () => {
    const net = fakeNet({ delayMs: 80 });
    const [a, b] = await Promise.all([syncJobs({ now: T0, fetcher: net.fetcher, only }), syncJobs({ now: T0, fetcher: net.fetcher, only })]);
    expect([a.status, b.status].toSorted()).toEqual(["done", "skipped"]);
    expect([a, b].find((x) => x.status === "skipped")!.reason).toBe("already running");
    // The lock is released afterwards.
    expect((await syncJobs({ now: hours(5), fetcher: net.fetcher, only })).status).toBe("done");
  });

  it("stops starting new sources when time runs out and leaves them for the next run", async () => {
    const net = fakeNet({ delayMs: 30 });
    const s = await syncJobs({ now: T0, fetcher: net.fetcher, only: ["stripe", "palantir", "ramp", "figma", "okta"], budgetMs: 15_000 });
    expect(s.sources).toBe(0);
    expect(s.remaining).toBe(5);
    expect(net.calls).toHaveLength(0);
  });

  it("force ignores the minimum gap", async () => {
    const net = fakeNet();
    await syncJobs({ now: T0, fetcher: net.fetcher, only: ["stripe"] });
    expect((await syncJobs({ now: hours(1), fetcher: net.fetcher, only: ["stripe"], force: true })).sources).toBe(1);
  });

  it("keeps a SmartRecruiters description fetched earlier when the list (which has none) is synced again", async () => {
    const net = fakeNet();
    await syncJobs({ now: T0, fetcher: net.fetcher, only: ["servicenow"] });
    const row = (await JobPosting.findOne({ sourceId: "servicenow" }).lean())!;
    expect(row.jd).toBe("");
    await JobPosting.updateOne({ key: row.key }, { $set: { jd: "Fetched description" } });
    await syncJobs({ now: hours(4), fetcher: net.fetcher, only: ["servicenow"] });
    expect((await JobPosting.findOne({ key: row.key }).lean())!.jd).toBe("Fetched description");
  });

  it("trims to the cap, dropping closed postings first and never ones you saved", async () => {
    const net = fakeNet();
    await syncJobs({ now: T0, fetcher: net.fetcher, only });
    const rows = await JobPosting.find({}).sort({ _id: 1 }).lean();
    await JobPosting.updateOne({ _id: rows[0]!._id }, { $set: { closedAt: hours(1) } });
    await JobPosting.updateOne({ _id: rows[1]!._id }, { $set: { savedJobId: rows[1]!._id } });
    const dropped = await trimPostings(rows.length - 2);
    expect(dropped).toBe(2);
    expect(await JobPosting.findById(rows[0]!._id)).toBeNull();
    expect(await JobPosting.findById(rows[1]!._id)).not.toBeNull();
  });
});
