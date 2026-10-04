import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/modules/planner/domain/plan-config";
import { isPullableDay, pullableDays } from "@/modules/planner/domain/pull-days";

const s = { ...DEFAULT_SETTINGS, startDate: "2026-10-05", endDate: "2026-10-20", restDays: ["2026-10-12"] };
const T = "2026-10-08";

describe("isPullableDay", () => {
  it("allows today up to the interview date", () => {
    expect(isPullableDay(T, T, s)).toBe(true);
    expect(isPullableDay("2026-10-20", T, s)).toBe(true);
  });
  it("refuses the past, rest days, days after the interview and days outside the plan", () => {
    expect(isPullableDay("2026-10-07", T, s)).toBe(false);
    expect(isPullableDay("2026-10-12", T, s)).toBe(false);
    expect(isPullableDay("2026-10-21", T, s)).toBe(false);
  });
});

describe("pullableDays", () => {
  it("lists the next days that can take items, skipping rest days", () => {
    const days = pullableDays("2026-10-09", T, s, 5).map((d) => d.date);
    expect(days).toEqual(["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-13", "2026-10-14"]);
  });
  it("stops at the interview date", () => {
    expect(pullableDays("2026-10-19", T, s, 5).map((d) => d.date)).toEqual(["2026-10-19", "2026-10-20"]);
  });
});
