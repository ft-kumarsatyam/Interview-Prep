import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DayLog } from "@/core/models/day";
import { Notification, Settings } from "@/core/models/system";
import { addDays } from "@/core/domain/dates";
import { getStreakInsights, recordStreakCelebration } from "@/modules/progress/services/streak-insights";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const START = "2026-10-05"; // a Monday
const complete = (date: string, extra: Record<string, unknown> = {}) => DayLog.create({ date, complete: true, dsaSolved: 3, theoryDone: 2, quizPassed: true, ...extra });

describe("getStreakInsights", () => {
  it("summarises the current streak, runs, the week and per-activity runs without writing anything", async () => {
    for (let i = 0; i < 9; i++) await complete(addDays(START, i)); // Oct 5 .. Oct 13
    await DayLog.create({ date: addDays(START, 10), complete: false, dsaSolved: 1 }); // Oct 15: missed quiz, DSA only
    const before = await DayLog.countDocuments();
    const today = addDays(START, 11); // Oct 16 (a Friday)
    const i = await getStreakInsights(today, 1);
    expect(i.current).toBe(0); // Oct 14 and 15 were not complete
    expect(i.best).toBe(9);
    expect(i.runs[0]).toMatchObject({ start: START, length: 9 });
    expect(i.next).toEqual({ target: 7, daysAway: 7 });
    expect(i.freeze.tokens).toBe(1);
    expect(i.week.cells).toHaveLength(7);
    expect(i.activities.dsa.best).toBe(9);
    expect(i.activities.dsa.current).toBe(1); // the DSA-only day on Oct 15 keeps a DSA run alive while the main streak is broken
    expect(i.activities.quiz.current).toBe(0);
    expect(i.activities.reading.best).toBe(0);
    expect(await DayLog.countDocuments()).toBe(before);
  });
});

describe("recordStreakCelebration", () => {
  it("celebrates a milestone once, only on the day that reaches it, and never changes a day", async () => {
    for (let i = 0; i < 7; i++) await complete(addDays(START, i));
    const day7 = addDays(START, 6);
    expect(await recordStreakCelebration(addDays(START, 5))).toBeNull(); // day 6: nothing
    expect(await recordStreakCelebration(day7)).toEqual({ kind: "milestone", days: 7 });
    await recordStreakCelebration(day7); // again: still one notification
    const notes = await Notification.find({ dedupeKey: "streak-milestone:7" }).lean();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ kind: "milestone", title: "7-day streak" });
    expect((await DayLog.findOne({ date: day7 }).lean())?.complete).toBe(true);
  });

  it("celebrates a new personal best past three days, and stays quiet for an incomplete day", async () => {
    // an old run of 5, a gap, then a run of 6
    for (let i = 0; i < 5; i++) await complete(addDays(START, i));
    for (let i = 7; i < 13; i++) await complete(addDays(START, i));
    expect(await recordStreakCelebration(addDays(START, 12))).toEqual({ kind: "best", days: 6 });
    expect(await recordStreakCelebration(addDays(START, 5))).toBeNull(); // the gap day has no record
    await DayLog.create({ date: addDays(START, 20), complete: false });
    expect(await recordStreakCelebration(addDays(START, 20))).toBeNull();
  });
});
