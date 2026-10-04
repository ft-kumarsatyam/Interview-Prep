import { describe, expect, it } from "vitest";
import { allocateCatchUp, openTotals, surplusOf } from "@/modules/planner/domain/catch-up";

const gap = (dsa: number, theory: number, quiz = false) => ({ dsa, theory, quiz });

describe("surplusOf", () => {
  it("is the work done beyond the day's own targets", () => {
    expect(surplusOf({ dsaTarget: 3, dsaSolved: 5, theoryTarget: 2, theoryDone: 1 })).toEqual({ dsa: 2, theory: 0 });
  });
});

describe("allocateCatchUp", () => {
  it("pays the oldest gap first and marks a fully paid day caught up", () => {
    const r = allocateCatchUp(
      [{ date: "2026-10-02", gap: gap(2, 1) }, { date: "2026-10-03", gap: gap(3, 0) }],
      [{ date: "2026-10-05", dsa: 3, theory: 1 }],
    );
    expect(r[0]).toMatchObject({ date: "2026-10-02", caughtUp: true, remaining: gap(0, 0) });
    expect(r[0]!.paidBy).toEqual([{ date: "2026-10-05", dsa: 2, theory: 1 }]);
    expect(r[1]).toMatchObject({ date: "2026-10-03", caughtUp: false, remaining: gap(2, 0) });
    expect(r[1]!.paidBy).toEqual([{ date: "2026-10-05", dsa: 1, theory: 0 }]);
  });

  it("a day can never pay for itself or for an earlier surplus date", () => {
    const r = allocateCatchUp([{ date: "2026-10-05", gap: gap(2, 0) }], [{ date: "2026-10-05", dsa: 5, theory: 0 }, { date: "2026-10-04", dsa: 5, theory: 0 }]);
    expect(r[0]!.remaining.dsa).toBe(2);
    expect(r[0]!.caughtUp).toBe(false);
  });

  it("accumulates surplus from several days", () => {
    const r = allocateCatchUp([{ date: "2026-10-01", gap: gap(3, 0) }], [{ date: "2026-10-02", dsa: 1, theory: 0 }, { date: "2026-10-03", dsa: 2, theory: 0 }]);
    expect(r[0]!.caughtUp).toBe(true);
    expect(r[0]!.paidBy.map((p) => p.date)).toEqual(["2026-10-02", "2026-10-03"]);
  });

  it("a missed quiz needs a made-up quiz, even when the work is done", () => {
    const debts = [{ date: "2026-10-01", gap: gap(1, 0, true) }];
    const surplus = [{ date: "2026-10-02", dsa: 1, theory: 0 }];
    expect(allocateCatchUp(debts, surplus)[0]!.caughtUp).toBe(false);
    expect(allocateCatchUp(debts, surplus, new Set(["2026-10-01"]))[0]!.caughtUp).toBe(true);
  });

  it("does not mutate its inputs and is stable for unsorted input", () => {
    const debts = [{ date: "2026-10-03", gap: gap(1, 0) }, { date: "2026-10-01", gap: gap(1, 0) }];
    const out = allocateCatchUp(debts, [{ date: "2026-10-04", dsa: 1, theory: 0 }]);
    expect(out.map((o) => o.date)).toEqual(["2026-10-01", "2026-10-03"]);
    expect(out[0]!.caughtUp).toBe(true);
    expect(debts[0]!.gap).toEqual(gap(1, 0));
  });

  it("openTotals sums only days that still owe something", () => {
    const r = allocateCatchUp([{ date: "2026-10-01", gap: gap(2, 1, true) }, { date: "2026-10-02", gap: gap(1, 0) }], [{ date: "2026-10-03", dsa: 1, theory: 0 }]);
    expect(openTotals(r)).toEqual({ dsa: 2, theory: 1, quiz: 1, items: 4 });
  });
});
