import { describe, expect, it } from "vitest";
import { celebrationFor, freezeProgress, milestoneAt, nextMilestone, runStats, streakRisk, streakRuns, weekRing, type StreakDay } from "@/modules/progress/domain/streak-insights";
import { bestStreak } from "@/modules/progress/domain/streak";

const day = (date: string, complete = true, freezeUsed = false): StreakDay => ({ date, complete, freezeUsed });
const TZ = "Asia/Kolkata";
// 2026-10-06 18:00 IST = 12:30 UTC, so 6 hours to local midnight
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 6, h, m));

describe("streakRisk", () => {
  const base = { kind: "study", complete: false, streak: 5, tokens: 1, timeZone: TZ, left: ["Daily quiz"] };
  it("counts the time left to local midnight and grades it", () => {
    const evening = streakRisk({ ...base, now: at(6, 30) }); // 12:00 IST
    expect(evening.level).toBe("safe");
    expect(evening.hoursLeft).toBeCloseTo(12, 1);
    expect(streakRisk({ ...base, now: at(12, 45) }).level).toBe("warn"); // 18:15 IST
    const late = streakRisk({ ...base, now: at(17, 30) }); // 23:00 IST
    expect(late.level).toBe("critical");
    expect(late.message).toContain("1 h left");
    expect(late.left).toEqual(["Daily quiz"]);
  });
  it("says whether a freeze would cover a miss", () => {
    expect(streakRisk({ ...base, now: at(17, 30) }).message).toContain("A freeze will cover you");
    expect(streakRisk({ ...base, tokens: 0, now: at(17, 30) }).message).toContain("no freeze");
  });
  it("stays quiet when the day is done, is a rest day, or there is no streak", () => {
    expect(streakRisk({ ...base, complete: true, now: at(17, 30) }).level).toBe("none");
    expect(streakRisk({ ...base, kind: "rest", now: at(17, 30) }).level).toBe("none");
    expect(streakRisk({ ...base, streak: 0, now: at(17, 30) }).level).toBe("none");
  });
});

describe("freezeProgress", () => {
  it("counts toward the next token every 7 days, and notes the cap", () => {
    expect(freezeProgress(3, 0)).toMatchObject({ into: 3, daysToNext: 4, atCap: false });
    expect(freezeProgress(7, 1)).toMatchObject({ into: 0, daysToNext: 7 });
    expect(freezeProgress(10, 2)).toMatchObject({ atCap: true, daysToNext: null });
    expect(freezeProgress(10, 2).label).toContain("most freezes");
    expect(freezeProgress(6, 0).label).toContain("1 more day in a row");
  });
});

describe("weekRing", () => {
  it("shows Monday to Sunday with kept, today, missed and future days", () => {
    // 2026-10-07 is a Wednesday; the week starts Monday 2026-10-05
    const days = new Map([day("2026-10-05"), day("2026-10-06", false, true)].map((d) => [d.date, d]));
    const w = weekRing(days, "2026-10-07");
    expect(w.cells.map((c) => c.state)).toEqual(["kept", "kept", "today", "future", "future", "future", "future"]);
    expect(w.kept).toBe(2);
    expect(w.elapsed).toBe(3);
    expect(weekRing(new Map(), "2026-10-11").cells[0]!.state).toBe("missed"); // Sunday: week began Monday 5th
  });
});

describe("streakRuns", () => {
  it("lists unbroken runs; a freeze bridges but adds nothing; a gap splits", () => {
    const runs = streakRuns([day("2026-10-01"), day("2026-10-02"), day("2026-10-03", false, true), day("2026-10-04"), day("2026-10-06"), day("2026-10-07")]);
    expect(runs).toEqual([
      { start: "2026-10-01", end: "2026-10-04", length: 3, freezes: 1 },
      { start: "2026-10-06", end: "2026-10-07", length: 2, freezes: 0 },
    ]);
  });
  it("agrees with bestStreak", () => {
    const days = [day("2026-10-01"), day("2026-10-02"), day("2026-10-03", false, true), day("2026-10-04"), day("2026-10-06")];
    expect(Math.max(...streakRuns(days).map((r) => r.length))).toBe(bestStreak(days));
  });
  it("ignores missed days and freeze-only stretches", () => {
    expect(streakRuns([day("2026-10-01", false), day("2026-10-02", false, true)])).toEqual([]);
  });
});

describe("milestones", () => {
  it("finds the next milestone and recognises one exactly", () => {
    expect(nextMilestone(0)).toEqual({ target: 7, daysAway: 7 });
    expect(nextMilestone(7)).toEqual({ target: 14, daysAway: 7 });
    expect(nextMilestone(365)).toBeNull();
    expect(milestoneAt(30)).toBe(30);
    expect(milestoneAt(31)).toBeNull();
  });
  it("celebrates a milestone, or the moment a run passes the best earlier run (once), and nothing else", () => {
    expect(celebrationFor(14, 40)).toEqual({ kind: "milestone", days: 14 });
    expect(celebrationFor(9, 8)).toEqual({ kind: "best", days: 9 });
    expect(celebrationFor(10, 8)).toBeNull(); // already past it: no repeat
    expect(celebrationFor(9, 12)).toBeNull();
    expect(celebrationFor(3, 2)).toBeNull(); // earlier best too small to matter
    expect(celebrationFor(9, 0)).toBeNull(); // a first run never beats itself
  });
});

describe("runStats", () => {
  it("counts the current run (today not done yet does not break it) and the best run", () => {
    const dates = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"]);
    expect(runStats(dates, "2026-10-07")).toEqual({ current: 2, best: 3 });
    expect(runStats(new Set([...dates, "2026-10-07"]), "2026-10-07").current).toBe(3);
    expect(runStats(new Set(), "2026-10-07")).toEqual({ current: 0, best: 0 });
    expect(runStats(new Set(["2026-10-01"]), "2026-10-07").current).toBe(0);
  });
});
