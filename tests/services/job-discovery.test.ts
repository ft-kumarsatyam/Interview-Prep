import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Job } from "@/lib/models/jobs";
import { JobPosting, JobSource } from "@/lib/models/job-postings";
import { Settings } from "@/lib/models/system";
import { Target } from "@/lib/models/targets";
import type { Fetcher } from "@/lib/jobs/connectors";
import { addCustomSource, discoverJobs, getJobPrefs, getPostingDetail, listSources, markPostingApplied, removeCustomSource, saveJobPrefs, savePosting, setDismissed, setSourceEnabled } from "@/lib/services/job-discovery";
import { syncJobs } from "@/lib/services/job-sync";
import { getJob } from "@/lib/services/jobs";
import { saveBaseResume } from "@/lib/services/resume";
import { invalidateSettings } from "@/lib/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const NOW = new Date("2026-10-05T12:00:00Z");
const fx = (n: string) => readFileSync(`tests/fixtures/jobs/${n}.json`, "utf8");
const ok = (text: string) => ({ status: 200, text, headers: new Headers() });
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

/** Seeds the feed through the real sync path, with a controlled Greenhouse board. */
async function seed(jobs: Array<{ id: number; title: string; location?: string; days?: number; content?: string }>, slug = "stripe") {
  const body = JSON.stringify({
    jobs: jobs.map((j) => ({ id: j.id, title: j.title, absolute_url: `https://boards.greenhouse.io/${slug}/jobs/${j.id}`, location: { name: j.location ?? "Bengaluru" }, first_published: day(j.days ?? 1), content: j.content ?? "We use Node.js, PostgreSQL and Kafka.", departments: [{ name: "Eng" }] })),
    meta: { total: jobs.length },
  });
  const fetcher: Fetcher = async () => ok(body);
  await syncJobs({ now: NOW, fetcher, only: [slug] });
}

describe("preferences", () => {
  it("defaults, saves, validates", async () => {
    expect(await getJobPrefs()).toMatchObject({ roles: [], remoteOk: true, level: "any" });
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], level: "mid" });
    expect(await getJobPrefs()).toMatchObject({ roles: ["backend"], level: "mid", minScore: 60 });
    await expect(saveJobPrefs({ level: "wizard" })).rejects.toThrow();
  });
});

describe("discoverJobs", () => {
  it("ranks by match to your preferences and resume, and explains each", async () => {
    await seed([
      { id: 1, title: "Backend Engineer", content: "Node.js and PostgreSQL and Docker" },
      { id: 2, title: "Frontend Engineer", location: "Berlin", content: "React and CSS and HTML" },
      { id: 3, title: "Senior Backend Engineer", days: 40, content: "Kafka Kubernetes Go" },
    ]);
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"] });
    await saveBaseResume("Aarav\naarav@example.com\nSKILLS\nNode.js, PostgreSQL, Docker\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built things with Node.js for 2M users");
    const r = await discoverJobs({}, NOW);
    expect(r).toMatchObject({ hasPrefs: true, hasResume: true });
    expect(r.items.map((i) => i.title)).toEqual(["Backend Engineer", "Senior Backend Engineer", "Frontend Engineer"]);
    const top = r.items[0]!;
    expect(top.score).toBeGreaterThan(r.items[2]!.score + 30);
    expect(top.matched).toEqual(expect.arrayContaining(["node.js", "postgresql", "docker"]));
    expect(top.isNew).toBe(true);
    expect(top.reasons.length).toBeGreaterThan(2);
  });

  it("filters by text, recency, remote, source kind and minimum score; hides dismissed ones", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }, { id: 2, title: "Platform Engineer", days: 20 }, { id: 3, title: "Software Engineer, Payments" }]);
    expect((await discoverJobs({ q: "payments" }, NOW)).items).toHaveLength(1);
    expect((await discoverJobs({ days: 7 }, NOW)).items.map((i) => i.title).toSorted()).toEqual(["Backend Engineer", "Software Engineer, Payments"]);
    expect((await discoverJobs({ kind: "remote" }, NOW)).items).toHaveLength(0);
    expect((await discoverJobs({ kind: "boards" }, NOW)).items).toHaveLength(3);
    expect((await discoverJobs({ min: 101 }, NOW)).items).toHaveLength(0);
    const first = (await discoverJobs({}, NOW)).items[0]!;
    await setDismissed(first.id, true);
    expect((await discoverJobs({}, NOW)).items).toHaveLength(2);
    expect((await discoverJobs({ showDismissed: true }, NOW)).items).toHaveLength(3);
    await setDismissed(first.id, false);
    expect((await discoverJobs({}, NOW)).items).toHaveLength(3);
  });

  it("treats the search text as text, not as a pattern", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    expect((await discoverJobs({ q: ".*" }, NOW)).items).toHaveLength(0);
    expect((await discoverJobs({ q: "(" }, NOW)).items).toHaveLength(0);
  });

  it("drops companies you excluded and does not show closed postings", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    await saveJobPrefs({ excludeCompanies: ["stripe"] });
    expect((await discoverJobs({}, NOW)).items).toHaveLength(0);
    await saveJobPrefs({});
    await JobPosting.updateMany({}, { $set: { closedAt: NOW } });
    expect((await discoverJobs({}, NOW)).items).toHaveLength(0);
  });

  it("boosts a company you are targeting", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    const before = (await discoverJobs({}, NOW)).items[0]!.score;
    await Target.create({ name: "Stripe", tier: "large-product", priority: "dream" });
    expect((await discoverJobs({}, NOW)).items[0]!.score).toBeGreaterThan(before);
  });
});

describe("posting detail, save and apply", () => {
  it("shows the full description with the skills you have and lack", async () => {
    await seed([{ id: 1, title: "Backend Engineer", content: "<p>You will use Node.js and Kafka.</p>" }]);
    await saveBaseResume("Aarav\naarav@example.com\nSKILLS\nNode.js\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built Node.js services for 2M users");
    const id = String((await JobPosting.findOne().lean())!._id);
    const d = (await getPostingDetail(id, NOW))!;
    expect(d.jd).toContain("Node.js and Kafka");
    expect(d.matched).toContain("node.js");
    expect(d.missing).toContain("kafka");
    expect(d.descriptionUnavailable).toBe(false);
    expect(await getPostingDetail("nope")).toBeNull();
  });

  it("fetches a SmartRecruiters description the first time, once", async () => {
    const list = JSON.parse(fx("smartrecruiters")) as { content: Array<Record<string, unknown>> };
    let calls = 0;
    const fetcher: Fetcher = async (url) => {
      calls++;
      return ok(url.includes("/postings/") ? fx("smartrecruiters-detail") : JSON.stringify({ ...list, content: list.content.map((c) => ({ ...c, name: "Software Engineer" })) }));
    };
    await syncJobs({ now: NOW, fetcher, only: ["servicenow"] });
    const row = (await JobPosting.findOne().lean())!;
    expect(row.jd).toBe("");
    const first = (await getPostingDetail(String(row._id), NOW, fetcher))!;
    expect(first.jd.length).toBeGreaterThan(50);
    const before = calls;
    await getPostingDetail(String(row._id), NOW, fetcher);
    expect(calls).toBe(before);
    expect((await JobPosting.findById(row._id).lean())!.terms.length).toBeGreaterThanOrEqual(0);
  });

  it("saves to the tracker once and links both ways", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    const id = String((await JobPosting.findOne().lean())!._id);
    const a = await savePosting(id, "2026-10-05");
    const b = await savePosting(id, "2026-10-05");
    expect(a).toMatchObject({ ok: true, duplicate: false });
    expect(b).toMatchObject({ ok: true, duplicate: true });
    if (!a.ok || !b.ok) return;
    expect(b.jobId).toBe(a.jobId);
    expect(await Job.countDocuments()).toBe(1);
    expect((await getJob(a.jobId))).toMatchObject({ title: "Backend Engineer", status: "saved", source: "other" });
    expect((await discoverJobs({}, NOW)).items[0]!.savedJobId).toBe(a.jobId);
  });

  it("applying marks it applied with a follow-up date, saving first when needed", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    const id = String((await JobPosting.findOne().lean())!._id);
    const r = await markPostingApplied(id, "2026-10-05");
    expect(r.ok).toBe(true);
    if (r.ok) expect(await getJob(r.jobId)).toMatchObject({ status: "applied", appliedOn: "2026-10-05", followUpOn: "2026-10-12" });
    expect(await markPostingApplied("0".repeat(24), "2026-10-05")).toMatchObject({ ok: false });
  });
});

describe("sources", () => {
  it("lists built-in sources with health, and lets you switch them off", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }]);
    const rows = await listSources(NOW);
    const stripe = rows.find((r) => r.id === "stripe")!;
    expect(stripe).toMatchObject({ health: "ok", open: 1, enabled: true, custom: false });
    expect(rows.find((r) => r.id === "arbeitnow")!.enabled).toBe(false);
    await setSourceEnabled("stripe", false);
    expect((await listSources(NOW)).find((r) => r.id === "stripe")!.health).toBe("off");
    await expect(setSourceEnabled("nope", true)).rejects.toThrow(/Unknown/);
  });

  it("adds a company from its board link only after proving the board has jobs", async () => {
    const good: Fetcher = async () => ok(JSON.stringify({ jobs: [{ id: 5, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/newco/jobs/5", company_name: "NewCo" }] }));
    const r = await addCustomSource("https://boards.greenhouse.io/newco", "startup", good);
    expect(r).toMatchObject({ ok: true, name: "NewCo", count: 1 });
    expect(await addCustomSource("https://boards.greenhouse.io/newco", "startup", good)).toMatchObject({ ok: false, error: expect.stringContaining("already") });
    expect(await addCustomSource("https://example.com/careers", "", good)).toMatchObject({ ok: false });
    const empty: Fetcher = async () => ok(JSON.stringify({ jobs: [] }));
    expect(await addCustomSource("https://boards.greenhouse.io/ghost", "", empty)).toMatchObject({ ok: false, error: expect.stringContaining("no open jobs") });
    const broken: Fetcher = async () => {
      throw new Error("HTTP 404");
    };
    expect(await addCustomSource("https://jobs.lever.co/ghost2", "", broken)).toMatchObject({ ok: false, error: "HTTP 404" });
    expect(await JobSource.countDocuments({ custom: true })).toBe(1);
  });

  it("removes only companies you added, with their postings", async () => {
    const good: Fetcher = async () => ok(JSON.stringify({ jobs: [{ id: 5, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/newco/jobs/5", company_name: "NewCo" }] }));
    const added = await addCustomSource("https://boards.greenhouse.io/newco", "startup", good);
    if (!added.ok) throw new Error("add failed");
    await syncJobs({ now: NOW, fetcher: good, only: [added.id] });
    expect(await JobPosting.countDocuments({ sourceId: added.id })).toBe(1);
    await removeCustomSource(added.id);
    expect(await JobPosting.countDocuments({ sourceId: added.id })).toBe(0);
    await expect(removeCustomSource("stripe")).rejects.toThrow(/Only companies you added/);
  });
});
