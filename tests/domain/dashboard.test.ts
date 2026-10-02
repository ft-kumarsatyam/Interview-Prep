import { describe, expect, it } from "vitest";
import { heatmapCells } from "@/lib/domain/heatmap";
import { idealSolvedBy, pace } from "@/lib/domain/pace";
import { DEFAULT_SETTINGS } from "@/lib/domain/plan-config";
import { applySolve } from "@/lib/domain/progress";

const s = DEFAULT_SETTINGS;

describe("idealSolvedBy", () => {
  it("is 0 before the start and everything by the last study day", () => {
    expect(idealSolvedBy("2026-10-01", 604, s)).toBe(0);
    expect(idealSolvedBy("2027-02-28", 604, s)).toBe(604);
    expect(idealSolvedBy("2027-03-10", 604, s)).toBe(604);
  });

  it("grows monotonically and skips Sundays", () => {
    const sat = idealSolvedBy("2026-10-10", 604, s);
    const sun = idealSolvedBy("2026-10-11", 604, s);
    const mon = idealSolvedBy("2026-10-12", 604, s);
    expect(sat).toBeGreaterThan(0);
    expect(sun).toBe(sat);
    expect(mon).toBeGreaterThan(sun);
  });

  it("reports how far ahead or behind you are", () => {
    const ideal = idealSolvedBy("2026-10-12", 604, s);
    expect(pace("2026-10-12", ideal + 3, 604, s).delta).toBe(3);
    expect(pace("2026-10-12", 0, 604, s).delta).toBe(-ideal);
  });
});

describe("heatmapCells", () => {
  it("classifies past, today and future days", () => {
    const cells = heatmapCells("2026-10-05", "2026-10-09", "2026-10-08", [
      { date: "2026-10-05", dsaSolved: 2, theoryDone: 2, quizPassed: true, complete: true, freezeUsed: false },
      { date: "2026-10-06", dsaSolved: 1, theoryDone: 0, quizPassed: false, complete: false, freezeUsed: false },
      { date: "2026-10-07", dsaSolved: 0, theoryDone: 0, quizPassed: false, complete: false, freezeUsed: true },
    ]);
    expect(cells.map((c) => c.state)).toEqual(["complete", "partial", "freeze", "idle", "future"]);
  });
});

describe("applySolve", () => {
  it("first solve starts the ladder at review 0", () => {
    expect(applySolve(null, "2026-10-05", "struggled")).toMatchObject({
      solveDates: ["2026-10-05"],
      reviewCount: 0,
      nextReviewAt: "2026-10-08",
      isNewSolveDay: true,
    });
  });

  it("a re-solve on a later day advances the ladder", () => {
    const out = applySolve({ solveDates: ["2026-10-05"], reviewCount: 0 }, "2026-10-08", "struggled");
    expect(out).toMatchObject({ reviewCount: 1, nextReviewAt: "2026-10-15", firstSolvedOn: "2026-10-05", lastSolvedOn: "2026-10-08" });
    expect(applySolve({ solveDates: ["2026-10-05"], reviewCount: 0 }, "2026-10-19", "ok").nextReviewAt).toBeNull();
  });

  it("editing the same day keeps the count and only reschedules", () => {
    const out = applySolve({ solveDates: ["2026-10-05"], reviewCount: 0 }, "2026-10-05", "easy");
    expect(out).toMatchObject({ reviewCount: 0, nextReviewAt: null, isNewSolveDay: false, solveDates: ["2026-10-05"] });
  });
});
