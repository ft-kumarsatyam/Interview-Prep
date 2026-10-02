import { describe, expect, it } from "vitest";
import { addDays, eachDay } from "@/lib/domain/dates";
import {
  bestStreak,
  currentStreak,
  isDayComplete,
  isQuizUnlocked,
  settleDays,
  type DayProgress,
  type DayRecord,
} from "@/lib/domain/streak";

const base: DayProgress = { kind: "study", dsaTarget: 3, dsaSolved: 3, theoryTarget: 2, theoryDone: 2, quizPassed: true };

function recs(list: Array<[string, "c" | "f" | "x"]>): Map<string, DayRecord> {
  return new Map(list.map(([date, s]) => [date, { date, complete: s === "c", freezeUsed: s === "f" }]));
}

describe("isDayComplete", () => {
  it("needs DSA, theory and the quiz on study days", () => {
    expect(isDayComplete(base)).toBe(true);
    expect(isDayComplete({ ...base, quizPassed: false })).toBe(false);
    expect(isDayComplete({ ...base, dsaSolved: 2 })).toBe(false);
    expect(isDayComplete({ ...base, theoryDone: 1 })).toBe(false);
  });

  it("needs only the weekly quiz on Sunday; rest days are free", () => {
    expect(isDayComplete({ ...base, kind: "sunday", dsaSolved: 0, theoryDone: 0 })).toBe(true);
    expect(isDayComplete({ ...base, kind: "sunday", quizPassed: false })).toBe(false);
    expect(isDayComplete({ ...base, kind: "rest", quizPassed: false })).toBe(true);
    expect(isDayComplete({ ...base, kind: "outside" })).toBe(false);
  });
});

describe("isQuizUnlocked", () => {
  it("opens after one problem and one subtopic", () => {
    expect(isQuizUnlocked({ ...base, dsaSolved: 0, theoryDone: 1 })).toBe(false);
    expect(isQuizUnlocked({ ...base, dsaSolved: 1, theoryDone: 0 })).toBe(false);
    expect(isQuizUnlocked({ ...base, dsaSolved: 1, theoryDone: 1 })).toBe(true);
  });

  it("doesn't demand work the plan didn't ask for", () => {
    expect(isQuizUnlocked({ ...base, dsaTarget: 0, dsaSolved: 0, theoryDone: 1 })).toBe(true);
    expect(isQuizUnlocked({ ...base, kind: "sunday", dsaSolved: 0, theoryDone: 0 })).toBe(true);
  });
});

describe("currentStreak", () => {
  const r = recs([
    ["2026-10-05", "c"],
    ["2026-10-06", "c"],
    ["2026-10-07", "f"],
    ["2026-10-08", "c"],
  ]);

  it("doesn't break while today is still in progress", () => {
    expect(currentStreak(r, "2026-10-09")).toBe(3);
  });

  it("counts today once complete; freezes bridge without adding", () => {
    const withToday = new Map(r).set("2026-10-09", { date: "2026-10-09", complete: true, freezeUsed: false });
    expect(currentStreak(withToday, "2026-10-09")).toBe(4);
  });

  it("resets after a missed day", () => {
    expect(currentStreak(r, "2026-10-11")).toBe(0);
  });
});

describe("bestStreak", () => {
  it("finds the longest run, treating gaps and misses as breaks", () => {
    const r = recs([
      ["2026-10-05", "c"],
      ["2026-10-06", "c"],
      ["2026-10-07", "x"],
      ["2026-10-08", "c"],
      ["2026-10-09", "f"],
      ["2026-10-10", "c"],
      ["2026-10-11", "c"],
      ["2026-10-13", "c"],
    ]);
    expect(bestStreak(r.values())).toBe(3);
  });
});

describe("settleDays", () => {
  it("spends a freeze on a missed day while the streak is alive", () => {
    const r = recs([["2026-10-05", "c"]]);
    const out = settleDays({ records: r, from: "2026-10-06", to: "2026-10-06", freezeTokens: 1 });
    expect(out.freezeTokens).toBe(0);
    expect(out.changed).toEqual([{ date: "2026-10-06", complete: false, freezeUsed: true }]);
    expect(out.events).toEqual([{ type: "freeze-used", date: "2026-10-06" }]);
  });

  it("reports a broken streak when no token is left", () => {
    const r = recs([["2026-10-05", "c"]]);
    const out = settleDays({ records: r, from: "2026-10-06", to: "2026-10-07", freezeTokens: 0 });
    expect(out.events).toEqual([{ type: "streak-broken", date: "2026-10-06" }]);
    expect(out.changed).toEqual([]);
  });

  it("doesn't waste a freeze when there is no streak to save", () => {
    const out = settleDays({ records: new Map(), from: "2026-10-05", to: "2026-10-05", freezeTokens: 2 });
    expect(out.freezeTokens).toBe(2);
    expect(out.events).toEqual([]);
  });

  it("earns a token every 7 completed days, capped at 2", () => {
    const days = eachDay("2026-10-05", addDays("2026-10-05", 20));
    const r = recs(days.map((d) => [d, "c"] as [string, "c"]));
    const out = settleDays({ records: r, from: days[0], to: days.at(-1)!, freezeTokens: 0 });
    expect(out.events.filter((e) => e.type === "freeze-earned")).toHaveLength(2);
    expect(out.freezeTokens).toBe(2);
  });
});
