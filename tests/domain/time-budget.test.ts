import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS as S, type PlanSettings } from "@/modules/planner/domain/plan-config";
import { buildDailyPlan, type ProblemState, type SubtopicState } from "@/modules/planner/domain/planner";
import {
  DEFAULT_COSTS,
  DEFAULT_HOURS,
  estimateCosts,
  estimateMinutes,
  fitToBudget,
  formatDuration,
  isBaseline,
  scaleCount,
  sundayBonus,
  type BudgetItems,
} from "@/modules/planner/domain/time-budget";

const MON_W1 = "2026-10-05";
const SAT_W1 = "2026-10-10";
const SUN_W1 = "2026-10-11";
const MON_W5 = "2026-11-02";
const SAT_W5 = "2026-11-07";
const SUN_W5 = "2026-11-08";

const withHours: PlanSettings = { ...S, hoursByDow: DEFAULT_HOURS };
const difficulty = (i: number) => (["Easy", "Medium", "Medium", "Hard"] as const)[i % 4]!;
const problems: ProblemState[] = [
  ...Array.from({ length: 1000 }, (_, i) => ({ slug: `m${i}`, track: "main" as const, order: i + 1, solved: false, difficulty: difficulty(i) })),
  { slug: "js1", track: "js", order: 1, solved: false },
  { slug: "sql1", track: "sql", order: 1, solved: false },
];
const subtopics: SubtopicState[] = Array.from({ length: 80 }, (_, i) => ({ id: `t:${i}`, week: 1 + Math.floor(i / 4), position: i, done: false }));
const reviews = Array.from({ length: 6 }, (_, i) => ({ slug: `r${i}`, nextReviewAt: "2026-10-01" }));

const plan = (date: string, settings: PlanSettings = withHours, extra: { hoursOverride?: number } = {}) =>
  buildDailyPlan({ date, settings, problems, reviews, subtopics, ...extra });
const legacy = (date: string) => buildDailyPlan({ date, settings: S, problems, reviews, subtopics });

describe("identity at the baseline", () => {
  it.each([MON_W1, MON_W5, "2026-11-03", "2026-11-06"])("a 3.5 h weekday (%s) keeps the count-based plan exactly", (date) => {
    const { hours, estMinutes, ...rest } = plan(date);
    expect(rest).toEqual(legacy(date));
    expect(hours).toBe(3.5);
    expect(estMinutes).toBeGreaterThan(0);
  });

  it("no hours setting means the legacy plan, with no time fields", () => {
    expect(plan(MON_W5, S)).toEqual(legacy(MON_W5));
    expect(plan(MON_W5, S)).not.toHaveProperty("estMinutes");
  });

  it("a 7 h Saturday equals the legacy double day", () => {
    const p = plan(SAT_W5, { ...S, hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 7] });
    delete p.hours;
    delete p.estMinutes;
    expect(p).toEqual(legacy(SAT_W5));
  });

  it("isBaseline allows a small tolerance", () => {
    expect(isBaseline(210, MON_W1)).toBe(true);
    expect(isBaseline(220, MON_W1)).toBe(true);
    expect(isBaseline(240, MON_W1)).toBe(false);
    expect(isBaseline(420, SAT_W1)).toBe(true);
  });
});

describe("scaling with hours", () => {
  it("never gives a smaller DSA target for more hours", () => {
    let prev = 0;
    for (const hours of [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8]) {
      const t = plan(MON_W5, withHours, { hoursOverride: hours }).dsaTarget;
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it("a long weekday asks for more, a short one for less, but always something", () => {
    const base = plan(MON_W5).dsaTarget;
    expect(plan(MON_W5, withHours, { hoursOverride: 6 }).dsaTarget).toBeGreaterThan(base);
    const short = plan(MON_W5, withHours, { hoursOverride: 1.5 });
    expect(short.dsaTarget).toBeLessThan(base);
    expect(short.dsaTarget).toBeGreaterThanOrEqual(1);
    expect(short.theoryTarget).toBeGreaterThanOrEqual(1);
  });

  it("lists match the targets and the estimate stays near the budget", () => {
    for (const hours of [1.5, 2, 4, 5, 6]) {
      const p = plan(MON_W5, withHours, { hoursOverride: hours });
      expect(p.dsaNew).toHaveLength(p.dsaTarget);
      expect(p.theory).toHaveLength(p.theoryTarget);
      expect(p.estMinutes!).toBeLessThanOrEqual(hours * 60 * 1.15);
    }
  });

  it("a short day drops the side tracks first and keeps the quiz time", () => {
    const p = plan(MON_W5, withHours, { hoursOverride: 1.5 });
    expect(p.sqlProblem).toBeNull();
    expect(p.jsProblem).toBeNull();
    expect(p.dsaReview.length).toBeLessThanOrEqual(2);
  });

  it("a 6 h Saturday is lighter than the legacy 10-problem day", () => {
    expect(legacy(SAT_W5).dsaTarget).toBe(S.maxSaturdayDsa);
    const sat = plan(SAT_W5);
    expect(sat.dsaTarget).toBeLessThan(S.maxSaturdayDsa);
    expect(sat.dsaTarget).toBeGreaterThan(plan(MON_W5).dsaTarget);
    expect(sat.hours).toBe(6);
  });

  it("never plans more problems than remain", () => {
    const few = problems.filter((p) => p.track !== "main" || p.order <= 2);
    const p = buildDailyPlan({ date: MON_W5, settings: withHours, problems: few, reviews: [], subtopics, hoursOverride: 8 });
    expect(p.dsaTarget).toBeLessThanOrEqual(2);
  });
});

describe("Sunday", () => {
  it("keeps the required targets at zero and offers the spare hours as optional bonus work", () => {
    const sun = plan(SUN_W5);
    expect(sun.kind).toBe("sunday");
    expect(sun.dsaTarget).toBe(0);
    expect(sun.theoryTarget).toBe(0);
    expect(sun.dsaReview).toHaveLength(4);
    expect(sun.bonusDsa!.length).toBeGreaterThan(0);
    expect(sun.estMinutes!).toBeLessThanOrEqual(4 * 60);
    expect(sun.hours).toBe(4);
  });

  it("without hours it is the old review-and-quiz day", () => {
    const sun = plan(SUN_W1, S);
    expect(sun).toEqual(legacy(SUN_W1));
    expect(sun.bonusDsa).toBeUndefined();
  });

  it("more Sunday hours buy more bonus work; none buys none", () => {
    const small = plan(SUN_W5, withHours, { hoursOverride: 1.5 });
    const big = plan(SUN_W5, withHours, { hoursOverride: 6 });
    expect(big.bonusDsa!.length).toBeGreaterThan(small.bonusDsa!.length);
    expect(plan(SUN_W5, { ...S, hoursByDow: [0, 3.5, 3.5, 3.5, 3.5, 3.5, 6] }).bonusDsa).toEqual([]);
  });

  it("sundayBonus stays inside the budget", () => {
    const b = sundayBonus(180, 4, ["Medium", "Medium", "Hard", "Easy"], 10, { dsaMax: 6, theoryMax: 5 }, DEFAULT_COSTS);
    expect(b.estMinutes).toBeLessThanOrEqual(180);
  });
});

describe("fitToBudget", () => {
  const items = (over: Partial<BudgetItems> = {}): BudgetItems => ({
    kind: "study",
    saturday: false,
    dsaPool: Array(20).fill("Medium"),
    dsa: 6,
    theory: 5,
    reviews: 4,
    js: true,
    sql: true,
    news: true,
    ...over,
  });
  const limits = { dsaMax: 8, theoryMax: 5, theoryPool: 20, reviewsDue: 8 };

  it("drops SQL, then JS, then news before touching the core work", () => {
    const sized = (flags: Partial<BudgetItems>) => estimateMinutes(items(flags), DEFAULT_COSTS);
    // Budget that only needs the side tracks gone.
    const budget = (sized({ sql: false, js: false }) / 1.1) * 1.0001;
    const out = fitToBudget(items(), budget, limits, DEFAULT_COSTS);
    expect(out.sql).toBe(false);
    expect(out.js).toBe(false);
    expect(out.dsa).toBe(6);
    expect(out.theory).toBe(5);
  });

  it("never drops below one of each and never drops the quiz", () => {
    const out = fitToBudget(items(), 20, limits, DEFAULT_COSTS);
    expect(out).toMatchObject({ dsa: 1, theory: 1, reviews: 1, sql: false, js: false, news: false });
    expect(estimateMinutes(out, DEFAULT_COSTS)).toBeGreaterThanOrEqual(DEFAULT_COSTS.dailyQuiz);
  });

  it("tops up an under-filled day: DSA first, then theory, then reviews, only if it fits", () => {
    const small = items({ dsa: 1, theory: 1, reviews: 0, js: false, sql: false, news: false });
    const out = fitToBudget(small, 240, limits, DEFAULT_COSTS);
    expect(out.dsa).toBeGreaterThan(1);
    expect(estimateMinutes(out, DEFAULT_COSTS)).toBeLessThanOrEqual(240 * 1.1);
  });

  it("respects the caps when topping up", () => {
    const out = fitToBudget(items({ dsa: 1, theory: 1, reviews: 0 }), 2000, limits, DEFAULT_COSTS);
    expect(out.dsa).toBeLessThanOrEqual(limits.dsaMax);
    expect(out.theory).toBeLessThanOrEqual(limits.theoryMax);
    expect(out.reviews).toBeLessThanOrEqual(limits.reviewsDue);
  });
});

describe("estimateCosts", () => {
  const hist = (difficulty: "Easy" | "Medium" | "Hard", minutes: number, n: number) => Array.from({ length: n }, () => ({ difficulty, minutes }));

  it("uses the defaults with no history", () => {
    expect(estimateCosts([])).toEqual(DEFAULT_COSTS);
  });

  it("moves toward your real times but is damped with few samples", () => {
    const few = estimateCosts(hist("Medium", 60, 2)).dsa.Medium;
    const many = estimateCosts(hist("Medium", 60, 20)).dsa.Medium;
    expect(few).toBeGreaterThan(DEFAULT_COSTS.dsa.Medium);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeLessThanOrEqual(DEFAULT_COSTS.dsa.Medium * 2);
  });

  it("clamps to 0.5x-2x and caps a runaway sample", () => {
    expect(estimateCosts(hist("Easy", 1, 20)).dsa.Easy).toBeGreaterThanOrEqual(DEFAULT_COSTS.dsa.Easy / 2);
    expect(estimateCosts(hist("Easy", 600, 20)).dsa.Easy).toBeLessThanOrEqual(DEFAULT_COSTS.dsa.Easy * 2);
  });

  it("only changes the difficulty that has data", () => {
    const c = estimateCosts(hist("Hard", 90, 10));
    expect(c.dsa.Easy).toBe(DEFAULT_COSTS.dsa.Easy);
    expect(c.dsa.Medium).toBe(DEFAULT_COSTS.dsa.Medium);
    expect(c.dsa.Hard).not.toBe(DEFAULT_COSTS.dsa.Hard);
  });

  it("slower costs shrink the plan for the same hours", () => {
    const slow = estimateCosts(hist("Medium", 100, 20).concat(hist("Easy", 60, 20), hist("Hard", 150, 20)));
    const normal = plan(MON_W5, withHours, { hoursOverride: 5 });
    const slowed = buildDailyPlan({ date: MON_W5, settings: withHours, problems, reviews, subtopics, hoursOverride: 5, costs: slow });
    expect(slowed.dsaTarget).toBeLessThanOrEqual(normal.dsaTarget);
  });
});

describe("helpers", () => {
  it("scaleCount keeps zero at zero and respects bounds", () => {
    expect(scaleCount(0, 2, 1, 5)).toBe(0);
    expect(scaleCount(4, 0.1, 1, 9)).toBe(1);
    expect(scaleCount(4, 3, 1, 9)).toBe(9);
  });

  it("formatDuration", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(205)).toBe("3 h 25 min");
  });

  it("default hours are Sunday first: 4, five 3.5 h weekdays, a 6 h Saturday", () => {
    expect(DEFAULT_HOURS).toHaveLength(7);
    expect(DEFAULT_HOURS[0]).toBe(4);
    expect(DEFAULT_HOURS[6]).toBe(6);
    expect(DEFAULT_HOURS.slice(1, 6).every((h) => h === 3.5)).toBe(true);
  });
});
