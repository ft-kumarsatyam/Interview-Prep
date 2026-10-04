import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JobPosting } from "@/lib/models/job-postings";
import { Notification, Settings } from "@/lib/models/system";
import type { Fetcher } from "@/lib/jobs/connectors";
import type { NotifyChannel } from "@/lib/notify";
import { buildBriefing } from "@/lib/services/briefing";
import { saveJobPrefs } from "@/lib/services/job-discovery";
import { alertNewJobs } from "@/lib/services/job-alerts";
import { syncJobs } from "@/lib/services/job-sync";
import { ensureToday } from "@/lib/services/plan";
import { invalidateSettings, setMailPref } from "@/lib/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const NOW = at("2026-10-05");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const channel = (): NotifyChannel & { sent: string[] } => {
  const sent: string[] = [];
  return { name: "telegram", sent, send: async (t) => void sent.push(t) };
};

async function seed(jobs: Array<{ id: number; title: string; location?: string }>, now: Date, slug = "stripe") {
  const body = JSON.stringify({ jobs: jobs.map((j) => ({ id: j.id, title: j.title, absolute_url: `https://boards.greenhouse.io/${slug}/jobs/${j.id}`, location: { name: j.location ?? "Bengaluru" }, first_published: new Date(now.getTime() - 3_600_000).toISOString(), content: "Node.js and PostgreSQL", departments: [{ name: "Eng" }] })), meta: { total: jobs.length } });
  const fetcher: Fetcher = async () => ({ status: 200, text: body, headers: new Headers() });
  await syncJobs({ now, fetcher, only: [slug], force: true });
}

describe("alertNewJobs", () => {
  it("does nothing until you have said what you want, or when you switched it off", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }], NOW);
    expect(await alertNewJobs(NOW, [channel()])).toEqual({ sent: false, reason: "no preferences" });
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 40 });
    await setMailPref("jobs", false);
    expect(await alertNewJobs(NOW, [channel()])).toEqual({ sent: false, reason: "off" });
  });

  it("sends one grouped alert for the new matches, with a push, and never announces a posting twice", async () => {
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 40 });
    await seed([{ id: 1, title: "Backend Engineer" }, { id: 2, title: "Backend Developer" }, { id: 3, title: "Marketing Analyst Engineer", location: "Paris" }], NOW);
    const ch = channel();
    const first = await alertNewJobs(NOW, [ch]);
    expect(first).toMatchObject({ sent: true, count: 2 });
    expect(ch.sent).toHaveLength(1);
    const n = (await Notification.findOne({ dedupeKey: /^jobs:/ }).lean())!;
    expect(n).toMatchObject({ kind: "news", title: "2 new jobs match you" });
    expect(JSON.stringify(n.detail)).toContain("/jobs/discover/");
    expect(await alertNewJobs(hours(1), [ch])).toEqual({ sent: false, reason: "nothing new" });
    expect(await JobPosting.countDocuments({ alerted: false })).toBe(0);
  });

  it("leaves matches for later when the daily cap is reached", async () => {
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 40 });
    for (let i = 1; i <= 4; i++) {
      await seed([{ id: i, title: `Backend Engineer ${i}` }], hours(i));
      const r = await alertNewJobs(hours(i), [channel()]);
      if (i <= 3) expect(r).toMatchObject({ sent: true, count: 1 });
      else expect(r).toEqual({ sent: false, reason: "daily cap" });
    }
    expect(await JobPosting.countDocuments({ alerted: false })).toBe(1);
  });

  it("ignores old postings, dismissed ones and ones below your threshold", async () => {
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 95 });
    await seed([{ id: 1, title: "Backend Engineer" }], NOW);
    expect(await alertNewJobs(NOW, [channel()])).toEqual({ sent: false, reason: "nothing new" });
    expect(await JobPosting.countDocuments({ alerted: true })).toBe(1);
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 40 });
    await seed([{ id: 2, title: "Backend Engineer II" }], NOW);
    await JobPosting.updateMany({ externalId: "2" }, { $set: { dismissed: true } });
    expect(await alertNewJobs(NOW, [channel()])).toEqual({ sent: false, reason: "nothing new" });
    await seed([{ id: 3, title: "Backend Engineer III" }], NOW);
    await JobPosting.updateMany({ externalId: "3" }, { $set: { firstSeenAt: hours(-100) } });
    expect(await alertNewJobs(NOW, [channel()])).toEqual({ sent: false, reason: "nothing new" });
  });
});

describe("daily briefing", () => {
  it("includes new matching jobs once you have preferences", async () => {
    await seed([{ id: 1, title: "Backend Engineer" }], NOW);
    const state = await ensureToday(NOW);
    expect((await buildBriefing(state, NOW))?.spec.sections.some((s) => s.heading === "New jobs for you") ?? false).toBe(false);
    await saveJobPrefs({ roles: ["backend"], locations: ["Bengaluru"], minScore: 40 });
    const mail = await buildBriefing(state, NOW);
    expect(mail?.spec.sections.find((s) => s.heading === "New jobs for you")?.items?.[0]?.title).toBe("Backend Engineer at Stripe");
    expect(mail?.summary).toContain("1 new job for you");
  });
});
