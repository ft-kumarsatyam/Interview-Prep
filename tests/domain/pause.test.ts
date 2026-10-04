import { describe, expect, it } from "vitest";
import { addDays } from "@/core/domain/dates";
import { futureRestCount, pauseDays, pauseNext, planWeekEnd, resume, skipRestOfWeek } from "@/modules/planner/domain/pause";
import { MAX_REST_DAYS, mergeRestDays } from "@/modules/settings/domain/settings";

const W = { planStart: "2026-10-05", planEnd: "2027-03-21", revisionStart: "2027-03-01" };
const today = "2026-10-07"; // Wednesday of week 1

describe("pauseDays", () => {
  it("adds only future in-plan days and never today or earlier", () => {
    const r = pauseDays({ ...W, today, existingRest: [], days: ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-04", "2027-03-21"] });
    expect(r.added).toEqual(["2026-10-08"]);
    expect(r.restDays).toEqual(["2026-10-08"]);
    expect(r.removed).toEqual([]);
  });
  it("stops at the revision start, or the plan end when none is given", () => {
    const nearEnd = pauseDays({ ...W, today: "2027-02-26", existingRest: [], days: ["2027-02-27", "2027-02-28", "2027-03-01", "2027-03-02"] });
    expect(nearEnd.added).toEqual(["2027-02-27", "2027-02-28"]);
    const noRevision = pauseDays({ planStart: W.planStart, planEnd: W.planEnd, today: "2027-03-18", existingRest: [], days: ["2027-03-19", "2027-03-21", "2027-03-22"] });
    expect(noRevision.added).toEqual(["2027-03-19", "2027-03-21"]);
  });
  it("does not duplicate days already resting and keeps earlier rest days", () => {
    const r = pauseDays({ ...W, today, existingRest: ["2026-10-01", "2026-10-09"], days: ["2026-10-09", "2026-10-10"] });
    expect(r.added).toEqual(["2026-10-10"]);
    expect(r.restDays).toEqual(["2026-10-01", "2026-10-09", "2026-10-10"]);
  });
  it("never exceeds MAX_REST_DAYS", () => {
    const existing = Array.from({ length: MAX_REST_DAYS - 2 }, (_, i) => addDays("2026-11-01", i));
    const r = pauseDays({ ...W, today, existingRest: existing, days: ["2026-10-20", "2026-10-21", "2026-10-22"] });
    expect(r.restDays).toHaveLength(MAX_REST_DAYS);
    expect(r.added).toEqual(["2026-10-20", "2026-10-21"]);
    expect(r.capped).toBe(true);
  });
  it("round-trips through mergeRestDays unchanged", () => {
    const r = pauseNext({ ...W, today, existingRest: ["2026-10-01"], count: 3 });
    expect(mergeRestDays(["2026-10-01"], r.restDays, today)).toEqual(r.restDays);
  });
});

describe("pauseNext", () => {
  it("starts tomorrow", () => {
    expect(pauseNext({ ...W, today, existingRest: [], count: 3 }).added).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
    expect(pauseNext({ ...W, today, existingRest: [], count: 7 }).added).toHaveLength(7);
    expect(pauseNext({ ...W, today, existingRest: [], count: 0 }).added).toEqual([]);
  });
  it("can start a pause before the plan does", () => {
    const r = pauseNext({ ...W, today: "2026-10-01", existingRest: [], count: 7 });
    expect(r.added[0]).toBe("2026-10-05");
    expect(r.added).toHaveLength(4);
  });
});

describe("skipRestOfWeek", () => {
  it("uses the plan's own week, from tomorrow to its last day", () => {
    expect(planWeekEnd(today, W.planStart)).toBe("2026-10-11");
    expect(skipRestOfWeek({ ...W, today, existingRest: [] }).added).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
  });
  it("follows a plan that does not start on Monday", () => {
    const r = skipRestOfWeek({ ...W, planStart: "2026-10-07", today: "2026-10-09", existingRest: [] });
    expect(r.added).toEqual(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]);
  });
  it("does nothing on the last day of the week", () => {
    expect(skipRestOfWeek({ ...W, today: "2026-10-11", existingRest: [] }).added).toEqual([]);
  });
});

describe("resume", () => {
  it("removes only future paused days", () => {
    const existing = ["2026-10-05", "2026-10-07", "2026-10-08", "2026-10-09"];
    const r = resume({ today, existingRest: existing });
    expect(r.removed).toEqual(["2026-10-08", "2026-10-09"]);
    expect(r.restDays).toEqual(["2026-10-05", "2026-10-07"]);
    expect(r.added).toEqual([]);
  });
  it("is a no-op with nothing paused ahead", () => {
    expect(resume({ today, existingRest: ["2026-10-01"] }).removed).toEqual([]);
    expect(futureRestCount(["2026-10-01", "2026-10-08"], today)).toBe(1);
  });
});
