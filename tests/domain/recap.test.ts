import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/modules/planner/domain/plan-config";
import {
  carryOverLine,
  dayGap,
  eveningRecap,
  forecastFinish,
  forecastLine,
  recapDate,
  streakLine,
  streakStanding,
  type RecapInput,
} from "@/modules/progress/domain/recap";
import type { DayProgress } from "@/modules/progress/domain/streak";

const study = (over: Partial<DayProgress> = {}): DayProgress => ({ kind: "study", dsaTarget: 3, dsaSolved: 1, theoryTarget: 2, theoryDone: 2, quizPassed: false, ...over });

describe("dayGap and carryOverLine", () => {
  it("counts what's undone on a study day", () => {
    expect(dayGap(study())).toEqual({ dsa: 2, theory: 0, quiz: true });
    expect(dayGap(study({ dsaSolved: 5, quizPassed: true }))).toEqual({ dsa: 0, theory: 0, quiz: false });
  });

  it("only the weekly quiz matters on Sunday, nothing on rest days", () => {
    expect(dayGap(study({ kind: "sunday" }))).toEqual({ dsa: 0, theory: 0, quiz: true });
    expect(dayGap(study({ kind: "rest" }))).toEqual({ dsa: 0, theory: 0, quiz: false });
  });

  it("says what carried over, and stays silent when nothing did", () => {
    expect(carryOverLine(dayGap(study()), "study")).toBe(
      "Yesterday left 2 DSA problems and the daily quiz undone. The unfinished problems and subtopics are first in today's queue, so nothing is lost.",
    );
    expect(carryOverLine({ dsa: 0, theory: 0, quiz: true }, "sunday")).toBe("Yesterday left the weekly quiz undone.");
    expect(carryOverLine({ dsa: 0, theory: 0, quiz: false }, "study")).toBeNull();
  });
});

describe("forecastFinish", () => {
  const base = { today: "2026-10-20", totalMain: 600, windowDays: 14, settings: DEFAULT_SETTINGS };

  it("projects the finish date from the recent rate", () => {
    const f = forecastFinish({ ...base, solvedMain: 100, recentSolved: 28 });
    expect(f).toMatchObject({ perDay: 2, finishDate: "2027-06-27" });
    expect(f!.daysVsPlan).toBeLessThan(0);
    expect(forecastLine(f!)).toMatch(/after revision is due to start/);
  });

  it("reports being ahead when the pace is fast", () => {
    const f = forecastFinish({ ...base, solvedMain: 100, recentSolved: 140 });
    expect(f!.daysVsPlan).toBeGreaterThan(0);
    expect(forecastLine(f!)).toMatch(/days? before revision starts/);
  });

  it("is null with no recent solves or nothing left", () => {
    expect(forecastFinish({ ...base, solvedMain: 100, recentSolved: 0 })).toBeNull();
    expect(forecastFinish({ ...base, solvedMain: 100, recentSolved: 4 })).toBeNull();
    expect(forecastFinish({ ...base, solvedMain: 600, recentSolved: 10 })).toBeNull();
  });
});

describe("streak standing", () => {
  it("covers the four situations", () => {
    expect(streakLine(streakStanding({ complete: true, settled: false, freezeUsed: false, freezeTokens: 0, streak: 5 }))).toBe("Streak: 5 days, kept.");
    expect(streakLine(streakStanding({ complete: false, settled: false, freezeUsed: false, freezeTokens: 1, streak: 5 }))).toMatch(/freeze token \(1 left\)/);
    expect(streakLine(streakStanding({ complete: false, settled: false, freezeUsed: false, freezeTokens: 0, streak: 5 }))).toMatch(/5-day streak resets at midnight/);
    expect(streakLine(streakStanding({ complete: false, settled: true, freezeUsed: true, freezeTokens: 0, streak: 5 }))).toMatch(/freeze token covered/);
    expect(streakLine(streakStanding({ complete: false, settled: true, freezeUsed: false, freezeTokens: 0, streak: 0 }))).toMatch(/streak has reset/);
    expect(streakLine(streakStanding({ complete: false, settled: false, freezeUsed: false, freezeTokens: 0, streak: 0 }))).toBeNull();
  });
});

describe("recapDate", () => {
  it("reports the day that just ended when the job lands after midnight", () => {
    expect(recapDate("2026-10-07", 0)).toBe("2026-10-06");
    expect(recapDate("2026-10-07", 5)).toBe("2026-10-06");
    expect(recapDate("2026-10-06", 23)).toBe("2026-10-06");
    expect(recapDate("2026-10-06", 6)).toBe("2026-10-06");
  });
});

describe("eveningRecap", () => {
  const input = (over: Partial<RecapInput> = {}): RecapInput => ({
    date: "2026-10-06",
    day: study(),
    complete: false,
    doneProblems: [{ title: "Two Sum", path: "/dsa/two-sum", note: "Easy" }],
    doneTheory: [],
    readings: 1,
    quiz: { passed: false, bestPct: null },
    leftProblems: [{ title: "Valid Anagram", path: "/dsa/valid-anagram", note: "Easy" }],
    leftTheory: [],
    standing: { type: "at-risk", streak: 3, freezeTokens: 0 },
    tomorrow: { date: "2026-10-07", kind: "study", dsaTarget: 3, theoryTarget: 2, problems: [{ title: "Valid Anagram", path: "/dsa/valid-anagram" }], reviews: [], theory: [], estMinutes: 150 },
    pace: { ideal: 4, solved: 2, delta: -2 },
    forecast: null,
    appUrl: "https://prepos.example",
    ...over,
  });

  it("lists what was done, what's left, streak risk and tomorrow's carry-in", () => {
    const r = eveningRecap(input())!;
    expect(r.title).toBe("Day recap · 2026-10-06 · 3 of 6 done");
    expect(r.text).toContain("Still open: 2 DSA problems and the daily quiz.");
    expect(r.text).toContain("Two Sum (Easy)");
    expect(r.text).toContain("Left: DSA");
    expect(r.text).toContain("Valid Anagram");
    expect(r.text).toContain("It already includes the 2 DSA problems left open tonight.");
    expect(r.text).toContain("about 2 h 30 min");
    expect(r.text).toContain("2 problems behind plan");
    expect(r.text).toContain("your 3-day streak resets at midnight");
    expect(r.text).toContain("https://prepos.example/dsa/two-sum");
    expect(r.html).toContain("Left: quiz");
    expect(r.summary).toMatch(/^3 of 6 done\. Still open/);
  });

  it("celebrates a finished day", () => {
    const r = eveningRecap(input({ day: study({ dsaSolved: 3, quizPassed: true }), complete: true, leftProblems: [], standing: { type: "kept", streak: 4 }, quiz: { passed: true, bestPct: 90 } }))!;
    expect(r.title).toMatch(/Day complete$/);
    expect(r.text).toContain("Daily quiz passed (90%)");
    expect(r.text).not.toContain("Left:");
    expect(r.text).not.toContain("It already includes");
  });

  it("adds the weekly summary on Sunday and handles rest days and outside days", () => {
    const sunday = eveningRecap(input({ day: study({ kind: "sunday" }), week: { completedDays: 5, workDays: 6, solved: 21 } }))!;
    expect(sunday.text).toContain("This week: 5 of 6 study days completed, 21 problems solved.");
    expect(eveningRecap(input({ day: study({ kind: "rest", dsaTarget: 0, theoryTarget: 0 }), complete: true }))!.title).toMatch(/Day off$/);
    expect(eveningRecap(input({ day: study({ kind: "outside" }) }))).toBeNull();
  });

  it("escapes HTML in titles", () => {
    const r = eveningRecap(input({ doneProblems: [{ title: "<b>x</b>", path: "/dsa/x" }] }))!;
    expect(r.html).not.toContain("<b>x</b>");
    expect(r.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
