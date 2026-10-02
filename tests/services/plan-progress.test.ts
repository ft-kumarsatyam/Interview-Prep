import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { problems, subtopics } from "@/lib/content";
import { DailyPlan, DayLog, Quiz } from "@/lib/models/day";
import { ProblemProgress } from "@/lib/models/progress";
import { Notification, Settings } from "@/lib/models/system";
import { recomputeDay } from "@/lib/services/day";
import { ensureToday } from "@/lib/services/plan";
import { recordSolve, toggleSubtopic } from "@/lib/services/progress";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const TUE = "2026-10-06";

describe("ensureToday", () => {
  it("creates today's plan once and keeps it frozen", async () => {
    const first = await ensureToday(at(TUE));
    expect(first.planCreated).toBe(true);
    expect(first.plan.kind).toBe("study");
    expect(first.plan.dsaTarget).toBe(2);
    expect(first.plan.dsaNew).toHaveLength(2);
    expect(first.plan.jsProblem).toBe(problems.find((p) => p.track === "js" && p.order === 1)?.slug);

    await recordSolve({ slug: first.plan.dsaNew[0], date: TUE, source: "manual", details: { confidence: "ok" } });
    const again = await ensureToday(at(TUE));
    expect(again.planCreated).toBe(false);
    expect(again.plan.dsaNew).toEqual(first.plan.dsaNew);
    expect(again.day.dsaSolved).toBe(1);
    expect(await DailyPlan.countDocuments()).toBe(1);
  });

  it("spends a freeze on a missed day while the streak is alive, exactly once", async () => {
    await Settings.create({ _id: "settings", freezeTokens: 1, settledThrough: "2026-10-05" });
    await DayLog.create({ date: "2026-10-05", complete: true });
    await Promise.all([ensureToday(at("2026-10-07")), ensureToday(at("2026-10-07"))]);

    const settings = await Settings.findById("settings").lean();
    expect(settings?.freezeTokens).toBe(0);
    expect(settings?.settledThrough).toBe("2026-10-06");
    expect((await DayLog.findOne({ date: "2026-10-06" }).lean())?.freezeUsed).toBe(true);
    expect(await Notification.countDocuments({ kind: "streak" })).toBe(1);
    const state = await ensureToday(at("2026-10-07"));
    expect(state.streak).toBe(1);
  });
});

describe("recordSolve and completion", () => {
  it("needs DSA, theory and the passed quiz to complete a study day", async () => {
    const { plan } = await ensureToday(at(TUE));
    for (const slug of plan.dsaNew) await recordSolve({ slug, date: TUE, source: "manual", details: { confidence: "easy" } });
    for (const id of plan.theory) await toggleSubtopic(id, TUE);

    let { day } = await recomputeDay(TUE);
    expect(day).toMatchObject({ dsaSolved: 2, theoryDone: plan.theoryTarget, quizUnlocked: true, complete: false });

    await Quiz.create({ date: TUE, kind: "daily", generatedBy: "bank", passed: true, bestPct: 80 });
    const result = await recomputeDay(TUE);
    day = result.day;
    expect(day.complete).toBe(true);
    expect(result.justCompleted).toBe(true);
    expect((await recomputeDay(TUE)).justCompleted).toBe(false);
  });

  it("schedules reviews and counts a re-solve on a later day", async () => {
    const slug = problems[40].slug;
    await recordSolve({ slug, date: "2026-10-05", source: "manual", details: { confidence: "struggled" } });
    let row = await ProblemProgress.findOne({ slug }).lean();
    expect(row).toMatchObject({ reviewCount: 0, nextReviewAt: "2026-10-08", needsDetails: false });

    await recordSolve({ slug, date: "2026-10-08", source: "manual", details: { confidence: "struggled" } });
    row = await ProblemProgress.findOne({ slug }).lean();
    expect(row).toMatchObject({ reviewCount: 1, nextReviewAt: "2026-10-15", solveDates: ["2026-10-05", "2026-10-08"] });
  });

  it("unticking a subtopic recounts the day it was ticked on", async () => {
    const id = subtopics[0].id;
    await toggleSubtopic(id, "2026-10-05");
    expect((await DayLog.findOne({ date: "2026-10-05" }).lean())?.theoryDone).toBe(1);
    const res = await toggleSubtopic(id, TUE);
    expect(res.done).toBe(false);
    expect((await DayLog.findOne({ date: "2026-10-05" }).lean())?.theoryDone).toBe(0);
  });

  it("rejects unknown problems", async () => {
    await expect(recordSolve({ slug: "nope", date: TUE, source: "manual" })).rejects.toThrow(/Unknown problem/);
  });
});
