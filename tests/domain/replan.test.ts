import { describe, expect, it } from "vitest";
import { addWeeklyHours, extendEndDate } from "@/modules/planner/domain/replan";

const week = [0, 2, 2, 2, 2, 2, 3]; // Sunday first

describe("extendEndDate", () => {
  it("moves the date by whole weeks and never by less than one", () => {
    expect(extendEndDate("2026-12-01", 2)).toBe("2026-12-15");
    expect(extendEndDate("2026-12-01", 0)).toBe("2026-12-08");
    expect(extendEndDate("2026-12-28", 1)).toBe("2027-01-04");
  });
});

describe("addWeeklyHours", () => {
  it("adds at least the requested hours, never on Sunday, and leaves the input alone", () => {
    const out = addWeeklyHours(week, 3);
    expect(out[0]).toBe(0);
    expect(out.reduce((a, b) => a + b, 0) - week.reduce((a, b) => a + b, 0)).toBe(3);
    expect(week).toEqual([0, 2, 2, 2, 2, 2, 3]);
  });

  it("raises the lightest days first", () => {
    const out = addWeeklyHours([0, 1, 4, 4, 4, 4, 4], 1);
    expect(out[1]).toBe(2);
  });

  it("rounds a fractional request up to half an hour", () => {
    const out = addWeeklyHours(week, 0.2);
    expect(out.reduce((a, b) => a + b, 0) - 13).toBe(0.5);
  });

  it("stops at 12 hours a day", () => {
    const out = addWeeklyHours([0, 12, 12, 12, 12, 12, 12], 5);
    expect(out).toEqual([0, 12, 12, 12, 12, 12, 12]);
    const near = addWeeklyHours([0, 11.5, 12, 12, 12, 12, 12], 3);
    expect(near[1]).toBe(12);
  });

  it("uses weekdays when no day has hours yet, and ignores negative requests", () => {
    expect(addWeeklyHours([0, 0, 0, 0, 0, 0, 0], 2.5).slice(1, 6).reduce((a, b) => a + b, 0)).toBe(2.5);
    expect(addWeeklyHours(week, -4)).toEqual(week);
  });
});
