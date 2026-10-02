import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS as S } from "@/lib/domain/plan-config";
import {
  buildDailyPlan,
  computeDsaTarget,
  computeTheory,
  dayKind,
  revisionStart,
  type ProblemState,
  type SubtopicState,
} from "@/lib/domain/planner";

const MON_W1 = "2026-10-05";
const SAT_W1 = "2026-10-10";
const SUN_W1 = "2026-10-11";
const MON_W3 = "2026-10-19";
const MON_W5 = "2026-11-02";
const SAT_W5 = "2026-11-07";

describe("dayKind", () => {
  it("classifies days", () => {
    expect(dayKind(MON_W1, S)).toBe("study");
    expect(dayKind(SUN_W1, S)).toBe("sunday");
    expect(dayKind("2026-10-04", S)).toBe("outside");
    expect(dayKind("2027-03-22", S)).toBe("outside");
    expect(revisionStart(S)).toBe("2027-03-01");
    expect(dayKind("2027-03-02", S)).toBe("revision");
    expect(dayKind(MON_W3, { ...S, restDays: [MON_W3] })).toBe("rest");
  });
});

describe("computeDsaTarget", () => {
  it("ramps up while learning JavaScript", () => {
    expect(computeDsaTarget(MON_W1, 604, S)).toBe(2);
    expect(computeDsaTarget(SAT_W1, 604, S)).toBe(4);
    expect(computeDsaTarget(MON_W3, 604, S)).toBe(3);
  });

  it("is zero on Sundays and rest days", () => {
    expect(computeDsaTarget(SUN_W1, 604, S)).toBe(0);
    expect(computeDsaTarget(MON_W3, 604, { ...S, restDays: [MON_W3] })).toBe(0);
  });

  it("adapts to the backlog within the clamp, doubling on Saturday", () => {
    expect(computeDsaTarget(MON_W5, 10_000, S)).toBe(S.maxDailyDsa);
    expect(computeDsaTarget(SAT_W5, 10_000, S)).toBe(S.maxSaturdayDsa);
    expect(computeDsaTarget(MON_W5, 40, S)).toBe(S.minDailyDsa);
    const t = computeDsaTarget(MON_W5, 534, S);
    expect(t).toBeGreaterThanOrEqual(S.minDailyDsa);
    expect(t).toBeLessThanOrEqual(S.maxDailyDsa);
  });

  it("never asks for more than what's left", () => {
    expect(computeDsaTarget(MON_W5, 1, S)).toBe(1);
    expect(computeDsaTarget(MON_W5, 0, S)).toBe(0);
  });

  it("switches to timed practice in revision weeks", () => {
    expect(computeDsaTarget("2027-03-02", 200, S)).toBe(2);
  });
});

describe("computeTheory", () => {
  const subs = (n: number, week = 1, done = false): SubtopicState[] =>
    Array.from({ length: n }, (_, i) => ({ id: `t:${i}`, week, position: i, done }));

  it("spreads this week's subtopics over the remaining study days", () => {
    expect(computeTheory(MON_W1, subs(12), S)).toEqual({ target: 2, ids: ["t:0", "t:1"] });
  });

  it("clamps a heavy backlog to the daily max", () => {
    expect(computeTheory(SAT_W1, subs(20), S).target).toBe(S.maxDailyTheory);
  });

  it("ignores future and finished subtopics", () => {
    expect(computeTheory(MON_W1, subs(5, 2), S).target).toBe(0);
    expect(computeTheory(MON_W1, subs(5, 1, true), S).target).toBe(0);
    expect(computeTheory(SUN_W1, subs(5), S).target).toBe(0);
  });
});

describe("buildDailyPlan", () => {
  const problems: ProblemState[] = [
    { slug: "m3", track: "main", order: 3, solved: false },
    { slug: "m1", track: "main", order: 1, solved: true },
    { slug: "m2", track: "main", order: 2, solved: false },
    { slug: "m4", track: "main", order: 4, solved: false },
    { slug: "js1", track: "js", order: 1, solved: false },
    { slug: "sql1", track: "sql", order: 1, solved: false },
  ];
  const reviews = [
    { slug: "r-late", nextReviewAt: "2026-10-20" },
    { slug: "r-b", nextReviewAt: "2026-10-04" },
    { slug: "r-a", nextReviewAt: "2026-10-01" },
    { slug: "r-c", nextReviewAt: "2026-10-05" },
  ];
  const subtopics: SubtopicState[] = [
    { id: "w1:b", week: 1, position: 2, done: false },
    { id: "w1:a", week: 1, position: 1, done: false },
    { id: "w2:a", week: 2, position: 3, done: false },
  ];

  it("serves the next unsolved problems in order, due reviews, and the JS side track", () => {
    const plan = buildDailyPlan({ date: MON_W1, settings: S, problems, reviews, subtopics });
    expect(plan.kind).toBe("study");
    expect(plan.weekNumber).toBe(1);
    expect(plan.dsaTarget).toBe(2);
    expect(plan.dsaNew).toEqual(["m2", "m3"]);
    expect(plan.dsaReview).toEqual(["r-a", "r-b"]);
    expect(plan.jsProblem).toBe("js1");
    expect(plan.sqlProblem).toBeNull(); // SQL track starts in week 4
    expect(plan.theory).toEqual(["w1:a"]);
  });

  it("adds the SQL problem from week 4", () => {
    const plan = buildDailyPlan({ date: "2026-10-26", settings: S, problems, reviews: [], subtopics });
    expect(plan.sqlProblem).toBe("sql1");
  });

  it("makes Sunday a review day", () => {
    const plan = buildDailyPlan({ date: SUN_W1, settings: S, problems, reviews, subtopics });
    expect(plan.kind).toBe("sunday");
    expect(plan.dsaTarget).toBe(0);
    expect(plan.dsaNew).toEqual([]);
    expect(plan.dsaReview).toHaveLength(3);
    expect(plan.jsProblem).toBeNull();
    expect(plan.theoryTarget).toBe(0);
  });
});
