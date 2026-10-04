import { describe, expect, it } from "vitest";
import type { ContentProblem } from "@/core/content";
import { finishImpact, pickAhead, scheduledOn, trackFinish } from "@/modules/dsa/domain/problem-of-day";
import { topicProgress } from "@/modules/dsa/domain/topic-progress";
import type { DailyPlanDraft, ProblemState } from "@/modules/planner/domain/planner";

const prob = (slug: string, order: number, solved = false, track: ProblemState["track"] = "main"): ProblemState => ({ slug, track, order, solved });

const day = (date: string, dsaNew: string[], bonusDsa?: string[]): DailyPlanDraft => ({
  date,
  weekNumber: 1,
  kind: "study",
  dsaTarget: dsaNew.length,
  dsaNew,
  dsaReview: [],
  jsProblem: null,
  sqlProblem: null,
  theoryTarget: 0,
  theory: [],
  ...(bonusDsa ? { bonusDsa } : {}),
});

describe("pickAhead", () => {
  const problems = [prob("c", 3), prob("a", 1, true), prob("b", 2), prob("d", 4), prob("e", 5), prob("j", 1, false, "js")];

  it("skips solved, planned and non-main problems, in sheet order", () => {
    expect(pickAhead({ problems, solvedToday: new Set(), todayPlan: { dsaNew: ["b"] } })).toEqual(["c", "d", "e"]);
  });

  it("keeps a problem first solved today, so the pick is stable all day", () => {
    const solvedNow = problems.map((p) => (p.slug === "c" ? { ...p, solved: true } : p));
    expect(pickAhead({ problems: solvedNow, solvedToday: new Set(["c"]), todayPlan: { dsaNew: ["b"] }, count: 2 })).toEqual(["c", "d"]);
  });

  it("keeps optional Sunday bonus problems eligible", () => {
    expect(pickAhead({ problems, solvedToday: new Set(), todayPlan: { dsaNew: [] }, count: 1 })).toEqual(["b"]);
  });

  it("is empty when everything is solved", () => {
    expect(pickAhead({ problems: [prob("a", 1, true)], solvedToday: new Set(), todayPlan: { dsaNew: [] } })).toEqual([]);
  });
});

describe("trackFinish and scheduledOn", () => {
  const plans = [day("2026-10-05", ["a"]), day("2026-10-06", [], ["b"]), day("2026-10-07", ["c"]), day("2026-10-08", [])];

  it("finds the last day with a new problem", () => {
    expect(trackFinish(plans)).toBe("2026-10-07");
    expect(trackFinish([day("2026-10-05", [])])).toBeNull();
  });

  it("finds the day a problem was planned for, bonus included", () => {
    expect(scheduledOn("b", plans)).toBe("2026-10-06");
    expect(scheduledOn("zz", plans)).toBeNull();
  });
});

describe("finishImpact", () => {
  it("counts the days the track finishes earlier", () => {
    const without = [day("2026-10-05", ["a"]), day("2026-10-06", ["b"]), day("2026-10-07", ["c"])];
    const withSolved = [day("2026-10-05", ["b"]), day("2026-10-06", ["c"]), day("2026-10-07", [])];
    expect(finishImpact("a", without, withSolved)).toEqual({ scheduledOn: "2026-10-05", finishWithout: "2026-10-07", finishWith: "2026-10-06", daysSaved: 1 });
  });

  it("is zero days when solving only lightens a day", () => {
    const without = [day("2026-10-05", ["a", "b"]), day("2026-10-06", ["c"])];
    const withSolved = [day("2026-10-05", ["b"]), day("2026-10-06", ["c"])];
    expect(finishImpact("a", without, withSolved).daysSaved).toBe(0);
  });
});

describe("topicProgress", () => {
  const p = (slug: string, pattern: string, order: number, extra: Partial<ContentProblem> = {}): ContentProblem => ({
    slug,
    title: slug.toUpperCase(),
    leetcodeId: order,
    difficulty: "Easy",
    pattern,
    track: "main",
    tier: "core",
    url: "",
    order,
    ...extra,
  });
  const problems = [
    p("a", "Arrays", 1),
    p("b", "Arrays", 2, { difficulty: "Medium", tier: "extended" }),
    p("c", "Graphs", 3, { difficulty: "Hard" }),
    p("j", "Closures", 1, { track: "js" }),
  ];

  it("groups main problems by pattern in plan order, then the JS track", () => {
    const out = topicProgress(problems, new Set(["a"]), ["arrays", "Graphs", "Graphs"]);
    expect(out.map((t) => t.topic)).toEqual(["Arrays", "Graphs", "JavaScript"]);
    expect(out[0]).toMatchObject({ total: 2, solved: 1, core: 1, coreSolved: 1, next: { slug: "b" }, custom: 1, query: "pattern=Arrays" });
    expect(out[0]!.difficulty.Medium).toEqual({ total: 1, solved: 0 });
    expect(out[1]).toMatchObject({ custom: 2, next: { slug: "c" } });
    expect(out[2]).toMatchObject({ query: "track=js", total: 1 });
  });

  it("has no next problem once a topic is done", () => {
    expect(topicProgress(problems, new Set(["a", "b"]))[0]!.next).toBeNull();
  });
});
