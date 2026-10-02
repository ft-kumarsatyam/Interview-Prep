import { describe, expect, it } from "vitest";
import {
  addDays,
  dayOfWeek,
  diffDays,
  eachDay,
  isDateStr,
  saturdayOfWeek,
  toLocalDate,
  weekNumber,
} from "@/lib/domain/dates";

describe("toLocalDate", () => {
  it("uses the app timezone, not UTC, around midnight IST", () => {
    expect(toLocalDate(new Date("2026-10-04T18:29:00Z"), "Asia/Kolkata")).toBe("2026-10-04"); // 23:59 IST
    expect(toLocalDate(new Date("2026-10-04T18:31:00Z"), "Asia/Kolkata")).toBe("2026-10-05"); // 00:01 IST
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("diffs and enumerates days", () => {
    expect(diffDays("2026-10-12", "2026-10-05")).toBe(7);
    expect(eachDay("2026-10-05", "2026-10-07")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(eachDay("2026-10-07", "2026-10-05")).toEqual([]);
  });

  it("knows the weekday and plan week", () => {
    expect(dayOfWeek("2026-10-05")).toBe(1); // plan starts on a Monday
    expect(weekNumber("2026-10-05", "2026-10-05")).toBe(1);
    expect(weekNumber("2026-10-11", "2026-10-05")).toBe(1);
    expect(weekNumber("2026-10-12", "2026-10-05")).toBe(2);
    expect(weekNumber("2027-03-21", "2026-10-05")).toBe(24);
  });

  it("finds the Saturday closing a Mon–Sun week", () => {
    expect(saturdayOfWeek("2026-10-05")).toBe("2026-10-10");
    expect(saturdayOfWeek("2026-10-10")).toBe("2026-10-10");
    expect(saturdayOfWeek("2026-10-11")).toBe("2026-10-10");
  });

  it("validates date strings", () => {
    expect(isDateStr("2026-10-05")).toBe(true);
    expect(isDateStr("2026-02-30")).toBe(false);
    expect(isDateStr("5-10-2026")).toBe(false);
  });
});
