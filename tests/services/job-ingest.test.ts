import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/core/env";
import { JobPosting, JobSource } from "@/core/models/job-postings";
import { Settings } from "@/core/models/system";
import type { Fetcher } from "@/modules/jobs/lib/connectors";
import { addCustomSource, discoverJobs } from "@/modules/jobs/services/job-discovery";
import { ingestPushed } from "@/modules/jobs/services/job-ingest";
import { syncJobs } from "@/modules/jobs/services/job-sync";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await JobPosting.syncIndexes();
});
afterEach(() => {
  delete process.env.JOBS_WEBHOOK_SECRET;
  resetEnvForTests();
});

const SECRET = "a-long-enough-webhook-secret";
const job = (i: number, extra: Record<string, unknown> = {}) => ({ title: `Backend Engineer ${i}`, company: "Acme", url: `https://acme.com/jobs/${i}`, description: "Node.js and PostgreSQL", ...extra });

async function post(body: unknown, headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }, raw?: string) {
  process.env.JOBS_WEBHOOK_SECRET = SECRET;
  resetEnvForTests();
  const { POST } = await import("@/app/api/webhooks/jobs/route");
  const res = await POST(new Request("http://x/api/webhooks/jobs", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: raw ?? JSON.stringify(body) }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("jobs webhook", () => {
  it("is closed without a secret, and rejects a missing or wrong token", async () => {
    const { POST } = await import("@/app/api/webhooks/jobs/route");
    expect((await POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(503);
    expect((await post({ jobs: [] }, {})).status).toBe(401);
    expect((await post({ jobs: [] }, { authorization: "Bearer wrong-wrong-wrong-wrong" })).status).toBe(401);
    expect(await JobPosting.countDocuments({})).toBe(0);
  });

  it("stores valid jobs, counts rejected ones and shows them in Discover", async () => {
    const r = await post({ jobs: [job(1), job(2), { title: "x" }, job(3, { url: "https://www.linkedin.com/jobs/3" })] });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ accepted: 2, added: 2, rejected: 2 });
    const found = await discoverJobs({});
    expect(found.items.map((i) => i.title).sort()).toEqual(["Backend Engineer 1", "Backend Engineer 2"]);
    expect(found.items[0]!.source).toBe("webhook");
  });

  it("is idempotent: sending the same batch twice adds nothing new", async () => {
    await post({ jobs: [job(1), job(2)] });
    const again = await post({ jobs: [job(1), job(2)] });
    expect(again.json).toMatchObject({ accepted: 2, added: 0 });
    expect(await JobPosting.countDocuments({})).toBe(2);
  });

  it("never closes jobs that are absent from a later request", async () => {
    await post({ jobs: [job(1), job(2)] });
    await post({ jobs: [job(3)] });
    expect(await JobPosting.countDocuments({ closedAt: null })).toBe(3);
  });

  it("accepts a bare array, and rejects bad JSON, a non-array and an oversized batch", async () => {
    expect((await post([job(1)])).json).toMatchObject({ accepted: 1 });
    expect((await post(null, undefined, "not json")).status).toBe(400);
    expect((await post({ jobs: "nope" })).status).toBe(400);
    expect((await post({ jobs: Array.from({ length: 101 }, (_, i) => job(i)) })).status).toBe(400);
    expect((await post(null, undefined, "x".repeat(1_600_000))).status).toBe(413);
  });

  it("keeps the webhook source out of the sync rotation", async () => {
    await ingestPushed([job(1)]);
    let calls = 0;
    const fetcher: Fetcher = async () => {
      calls++;
      return { status: 200, text: "[]", headers: new Headers() };
    };
    await syncJobs({ fetcher, only: ["webhook"], force: true, live: false });
    expect(calls).toBe(0);
    expect(await JobSource.findById("webhook").lean()).toMatchObject({ kind: "push", enabled: true });
  });
});

const PAGE_MD = ["# Careers", "[Backend Engineer - Pune](https://careers.acme.com/jobs/11-backend)", "[Platform Engineer | Remote](https://careers.acme.com/jobs/12-platform)", "[Office Manager](https://careers.acme.com/jobs/13-office)", "[About us](https://careers.acme.com/about)"].join("\n");
const reader = (md: string, status = 200): Fetcher => async () => ({ status, text: md, headers: new Headers() });

describe("career page sources", () => {
  it("adds a public career page that yields engineering jobs, then syncs it like any source", async () => {
    const r = await addCustomSource("https://careers.acme.com/open-roles", "", reader(PAGE_MD));
    expect(r).toMatchObject({ ok: true, count: 2 });
    const src = await JobSource.findOne({ kind: "scrape" }).lean();
    expect(src).toMatchObject({ ats: "scrape", url: "https://careers.acme.com/open-roles", custom: true });

    const summary = await syncJobs({ fetcher: reader(PAGE_MD), only: [src!._id], force: true, live: false });
    expect(summary).toMatchObject({ ok: 1, added: 2 });
    const titles = (await JobPosting.find({ sourceId: src!._id }).lean()).map((p) => p.title).sort();
    expect(titles).toEqual(["Backend Engineer", "Platform Engineer"]);
  });

  it("closes a scraped job that disappears from the page", async () => {
    await addCustomSource("https://careers.acme.com/open-roles", "", reader(PAGE_MD));
    const id = (await JobSource.findOne({ kind: "scrape" }).lean())!._id;
    await syncJobs({ fetcher: reader(PAGE_MD), only: [id], force: true, live: false, now: new Date("2026-10-01T00:00:00Z") });
    const shrunk = PAGE_MD.replace(/\[Platform[^\n]*\n/, "");
    await syncJobs({ fetcher: reader(shrunk), only: [id], force: true, live: false, now: new Date("2026-10-02T00:00:00Z") });
    expect(await JobPosting.countDocuments({ sourceId: id, closedAt: null })).toBe(1);
  });

  it("refuses blocked sites, private addresses and pages with no engineering jobs", async () => {
    expect(await addCustomSource("https://www.linkedin.com/company/acme/jobs", "", reader(PAGE_MD))).toMatchObject({ ok: false });
    expect(await addCustomSource("https://127.0.0.1/careers", "", reader(PAGE_MD))).toMatchObject({ ok: false });
    expect(await addCustomSource("https://careers.acme.com/x", "", reader("# nothing here"))).toMatchObject({ ok: false, error: expect.stringContaining("No engineering job links") });
    expect(await JobSource.countDocuments({ kind: "scrape" })).toBe(0);
  });

  it("surfaces a reader failure as a clear error and refuses a duplicate page", async () => {
    expect(await addCustomSource("https://careers.acme.com/open-roles", "", reader("", 502))).toMatchObject({ ok: false, error: expect.stringContaining("HTTP 502") });
    await addCustomSource("https://careers.acme.com/open-roles", "", reader(PAGE_MD));
    expect(await addCustomSource("https://careers.acme.com/open-roles", "", reader(PAGE_MD))).toMatchObject({ ok: false, error: expect.stringContaining("already") });
  });

  it("still routes ATS board links to the board probe", async () => {
    const r = await addCustomSource("https://example.com/not-a-board-and-not-a-careers-page", "", reader("# empty"));
    expect(r.ok).toBe(false);
  });
});
