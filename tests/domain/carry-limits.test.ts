import { describe, expect, it } from "vitest";
import { allocateCatchUp } from "@/modules/planner/domain/catch-up";
import { carryStatus, cleanLimits, DEFAULT_CARRY_LIMITS } from "@/modules/planner/domain/carry-limits";

const open = (rows: Array<[string, number, number, boolean?]>) => allocateCatchUp(rows.map(([date, dsa, theory, quiz]) => ({ date, gap: { dsa, theory, quiz: !!quiz } })), []);
const base = { today: "2026-10-10", limits: DEFAULT_CARRY_LIMITS, todayIsStudyDay: true };

describe("carryStatus", () => {
  it("is ok within the limits and offers no fixes", () => {
    const s = carryStatus({ ...base, open: open([["2026-10-09", 2, 1]]), owed: 5 });
    expect(s.level).toBe("ok");
    expect(s.remedies).toEqual([]);
  });

  it("warns past a limit and goes over at double", () => {
    expect(carryStatus({ ...base, open: open([["2026-10-09", 4, 1]]), owed: 5 }).level).toBe("warn");
    const over = carryStatus({ ...base, open: open([["2026-10-09", 9, 0]]), owed: 5 });
    expect(over.level).toBe("over");
    expect(over.reasons.join(" ")).toMatch(/One day left 9/);
  });

  it("counts the last 7 days for the weekly limit and ignores older days", () => {
    const s = carryStatus({ ...base, open: open([["2026-10-01", 3, 0], ["2026-10-05", 3, 0], ["2026-10-06", 3, 0], ["2026-10-09", 3, 0]]), owed: 5 });
    expect(s.perWeek).toBe(9);
    expect(s.perDay).toBe(3);
    expect(s.level).toBe("ok");
    expect(carryStatus({ ...base, open: open([["2026-10-05", 4, 0], ["2026-10-06", 4, 0], ["2026-10-09", 4, 0]]), owed: 5 }).level).toBe("warn");
  });

  it("warns on the total owed", () => {
    expect(carryStatus({ ...base, open: [], owed: 26 }).level).toBe("warn");
    expect(carryStatus({ ...base, open: [], owed: 60 }).level).toBe("over");
  });

  it("never offers moving the interview date and only offers 'add an hour' on a study day", () => {
    const s = carryStatus({ ...base, open: [], owed: 30 });
    expect(s.remedies.map((r) => r.kind)).toEqual(["extend-hours", "weekend-hours", "snooze-optional", "accept"]);
    expect(carryStatus({ ...base, todayIsStudyDay: false, open: [], owed: 30 }).remedies.map((r) => r.kind)).not.toContain("extend-hours");
  });

  it("caught-up days do not count", () => {
    const r = allocateCatchUp([{ date: "2026-10-09", gap: { dsa: 6, theory: 0, quiz: false } }], [{ date: "2026-10-10", dsa: 6, theory: 0 }]);
    expect(carryStatus({ ...base, open: r, owed: 0 }).perDay).toBe(0);
  });
});

describe("cleanLimits", () => {
  it("falls back to defaults and clamps", () => {
    expect(cleanLimits(null)).toEqual(DEFAULT_CARRY_LIMITS);
    expect(cleanLimits({ perDay: 0, perWeek: 1000, total: Number.NaN })).toEqual({ perDay: 1, perWeek: 200, total: 25 });
  });
});
