import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Quiz } from "@/lib/models/day";
import { Notification, Settings } from "@/lib/models/system";
import type { NotifyChannel } from "@/lib/notify";
import { runEvening, runMorning } from "@/lib/services/cron";
import { buildMorningDigest } from "@/lib/services/digest";
import { ensureToday } from "@/lib/services/plan";
import { recordSolve, toggleSubtopic } from "@/lib/services/progress";
import { buildEveningRecap, carryOverFromYesterday, localHourOf } from "@/lib/services/recap";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const TUE = "2026-10-06";
const WED = "2026-10-07";
/** 23:50 IST on `date`. */
const lateEvening = (date: string) => new Date(`${date}T18:20:00Z`);
/** 00:10 IST the day after `date`. */
const justAfterMidnight = (date: string) => new Date(new Date(`${date}T18:40:00Z`).getTime());

function channel(): NotifyChannel & { bodies: string[]; htmls: (string | undefined)[] } {
  const bodies: string[] = [];
  const htmls: (string | undefined)[] = [];
  return { name: "email", bodies, htmls, send: async (_t, body, html) => void (bodies.push(body), htmls.push(html)) };
}

describe("evening recap", () => {
  it("reports what was solved, what's left and tomorrow, from real progress", async () => {
    const { plan } = await ensureToday(at(TUE));
    await recordSolve({ slug: plan.dsaNew[0], date: TUE, source: "manual", details: { confidence: "ok" } });
    await toggleSubtopic(plan.theory[0], TUE);

    const state = await ensureToday(lateEvening(TUE));
    const recap = await buildEveningRecap(lateEvening(TUE), state);
    expect(recap?.date).toBe(TUE);
    expect(recap?.text).toContain("Solved today");
    expect(recap?.text).toContain("Left: DSA");
    expect(recap?.text).toContain("Left: quiz");
    expect(recap?.text).toContain("Tomorrow (2026-10-07)");
    expect(recap?.text).toContain("It already includes the 1 DSA problem and 4 theory subtopics left open tonight.");
    expect(recap?.title).toMatch(/^Day recap · 2026-10-06 · \d of \d done$/);
  });

  it("emails once and marks a finished day complete", async () => {
    const { plan } = await ensureToday(at(TUE));
    for (const slug of plan.dsaNew) await recordSolve({ slug, date: TUE, source: "manual", details: { confidence: "easy" } });
    for (const id of plan.theory) await toggleSubtopic(id, TUE);
    await Quiz.create({ date: TUE, kind: "daily", generatedBy: "bank", passed: true, bestPct: 100 });

    const ch = channel();
    expect(await runEvening(lateEvening(TUE), [ch])).toMatchObject({ date: TUE, recapped: true, pushed: ["email"] });
    expect(ch.bodies[0]).toContain("Everything due today is finished");
    expect(ch.htmls[0]).toContain("Day complete");
    expect((await runEvening(lateEvening(TUE), [ch])).recapped).toBe(false);
    expect(ch.bodies).toHaveLength(1);
    expect(await Notification.countDocuments({ kind: "recap" })).toBe(1);
  });

  it("a job landing after midnight still recaps the day that just ended", async () => {
    await ensureToday(at(TUE));
    expect(localHourOf(justAfterMidnight(TUE), "Asia/Kolkata")).toBe(0);
    const ch = channel();
    const res = await runEvening(justAfterMidnight(TUE), [ch]);
    expect(res).toMatchObject({ date: TUE, recapped: true });
    expect(ch.bodies[0]).toContain("Still open");
    expect((await Notification.findOne({ kind: "recap" }).lean())?.dedupeKey).toBe(`recap:${TUE}`);
  });

  it("skips a day that never had a plan", async () => {
    const state = await ensureToday(at(WED));
    expect(await buildEveningRecap(at(WED), { ...state, today: "2026-10-08" })).toBeNull();
  });
});

describe("morning carry-over", () => {
  it("tells you what yesterday left and keeps it first in today's queue", async () => {
    const monday = await ensureToday(at(TUE));
    await recordSolve({ slug: monday.plan.dsaNew[0], date: TUE, source: "manual", details: { confidence: "ok" } });
    const left = monday.plan.dsaNew[1];

    const carried = await carryOverFromYesterday(WED);
    expect(carried).toMatchObject({ gap: { dsa: 1, quiz: true }, kind: "study", date: TUE });

    const today = await ensureToday(at(WED));
    expect(today.plan.dsaNew).toContain(left);
    const digest = await buildMorningDigest(today);
    expect(digest?.text).toContain("Yesterday left 1 DSA problem");
    expect(digest?.html).toContain("Yesterday left");
  });

  it("is silent when yesterday was unplanned, and shows up in the pushed morning email otherwise", async () => {
    expect(await carryOverFromYesterday(WED)).toBeNull();
    await runMorning(at(TUE), { channels: [], fetcher: async () => [], extractor: async () => ({ markdown: "", title: "" }) as never });
    const ch = channel();
    await runMorning(at(WED), { channels: [ch], fetcher: async () => [], extractor: async () => ({ markdown: "", title: "" }) as never });
    expect(ch.bodies[0]).toContain("Yesterday left");
  });
});
