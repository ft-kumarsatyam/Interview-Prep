import { describe, expect, it } from "vitest";
import { dayState } from "@/modules/planner/domain/day-status";
import { heatmapCells } from "@/modules/progress/domain/heatmap";

const T = "2026-10-10";
const log = (o: Partial<{ dsaSolved: number; theoryDone: number; quizPassed: boolean; complete: boolean; freezeUsed: boolean }> = {}) => ({ dsaSolved: 0, theoryDone: 0, quizPassed: false, complete: false, freezeUsed: false, ...o });

describe("dayState", () => {
  it("future and outside days have no colour", () => {
    expect(dayState({ date: "2026-10-11", today: T, kind: "study", log: null })).toBe("future");
    expect(dayState({ date: "2026-10-01", today: T, kind: "outside", log: null })).toBe("future");
  });

  it("a planned rest day is calm, never red or orange", () => {
    expect(dayState({ date: "2026-10-08", today: T, kind: "rest", log: null })).toBe("rest");
    expect(dayState({ date: "2026-10-08", today: T, kind: "rest", log: log({ complete: true }) })).toBe("rest");
  });

  it("is done when the day is complete", () => {
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ complete: true, dsaSolved: 4 }) })).toBe("complete");
  });

  it("is orange (partial) when some work was done but not everything", () => {
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ dsaSolved: 2 }) })).toBe("partial");
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ quizPassed: true }) })).toBe("partial");
  });

  it("is red (missed) when a closed study day had no work, and idle when it is today", () => {
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: null })).toBe("missed");
    expect(dayState({ date: "2026-10-08", today: T, kind: "revision", log: log() })).toBe("missed");
    expect(dayState({ date: T, today: T, kind: "study", log: null })).toBe("idle");
  });

  it("is caught-up once the leftovers were done, unless the day was complete or frozen", () => {
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ dsaSolved: 1 }), caughtUp: true })).toBe("caught-up");
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: null, caughtUp: true })).toBe("caught-up");
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ complete: true }), caughtUp: true })).toBe("complete");
    expect(dayState({ date: "2026-10-08", today: T, kind: "study", log: log({ freezeUsed: true }), caughtUp: true })).toBe("freeze");
  });
});

describe("heatmapCells", () => {
  it("keeps the old behaviour without options and uses kind and caught-up with them", () => {
    const logs = [{ date: "2026-10-08", dsaSolved: 1, theoryDone: 0, quizPassed: false, complete: false, freezeUsed: false }];
    const plain = heatmapCells("2026-10-07", "2026-10-09", "2026-10-09", logs);
    expect(plain.map((c) => c.state)).toEqual(["missed", "partial", "idle"]);
    const rich = heatmapCells("2026-10-07", "2026-10-09", "2026-10-09", logs, { kindOf: (d) => (d === "2026-10-07" ? "rest" : "study"), caughtUp: new Set(["2026-10-08"]) });
    expect(rich.map((c) => c.state)).toEqual(["rest", "caught-up", "idle"]);
  });
});
