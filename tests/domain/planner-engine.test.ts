import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS as S, phaseForWeek, phasesFor, scaledWeek } from "@/modules/planner/domain/plan-config";
import { buildDailyPlan, dueSubtopics, type ProblemState, type SubtopicState } from "@/modules/planner/domain/planner";
import { assessFeasibility, availableMinutes } from "@/modules/planner/domain/feasibility";
import { applyRebalance, buildRebalance } from "@/modules/planner/domain/rebalance";
import { masteryByTopic, ratingFromStrength, strengthPct, topicWeights } from "@/modules/planner/domain/topic-priority";
import { DEFAULT_COSTS, hoursOn } from "@/modules/planner/domain/time-budget";
import type { TopicRating } from "@/modules/planner/domain/planner-intake";

const subs = (n: number, week = 1): SubtopicState[] => Array.from({ length: n }, (_, i) => ({ id: `t${i}:0`, week, position: i, done: false }));
const problems: ProblemState[] = Array.from({ length: 40 }, (_, i) => ({ slug: `p${i}`, track: "main", order: i, solved: false, difficulty: "Medium" }));
const MON = "2026-10-19";

describe("topic strength and weights", () => {
  it("blends evidence over opinion", () => {
    expect(strengthPct(5, null, null)).toBe(100);
    expect(strengthPct(5, 20, 20)).toBeLessThan(strengthPct(5, null, null));
    expect(strengthPct(1, 100, 100)).toBeGreaterThan(strengthPct(1, null, null));
    expect(ratingFromStrength(0)).toBe(1);
    expect(ratingFromStrength(100)).toBe(5);
  });
  it("gives weak topics more weight than strong ones, and skipped topics none", () => {
    const r = (topicId: string, rating: number, tier: TopicRating["tier"] = "must"): TopicRating => ({ topicId, rating, wantToLearn: false, tier, diagnosticScore: null });
    const w = topicWeights([r("weak", 1), r("strong", 5), r("skip", 1, "skip")]);
    expect(w.get("weak")!.weight).toBeGreaterThan(w.get("strong")!.weight);
    expect(w.get("skip")!.weight).toBe(0);
  });
  it("takes a topic's mastery from its quiz, else from its subtopics", () => {
    const m = masteryByTopic([
      { ref: "a", scope: "topic", score: 80 },
      { ref: "a:0", scope: "subtopic", score: 10 },
      { ref: "b:0", scope: "subtopic", score: 40 },
      { ref: "b:1", scope: "subtopic", score: 60 },
    ]);
    expect(m.get("a")).toBe(80);
    expect(m.get("b")).toBe(50);
  });
});

describe("planning with weights", () => {
  it("is unchanged when no weights are given", () => {
    const due = dueSubtopics(subs(5), 1, S);
    expect(due.map((t) => t.id)).toEqual(["t0:0", "t1:0", "t2:0", "t3:0", "t4:0"]);
  });
  it("schedules weak topics first and leaves skipped ones out", () => {
    const withWeights = subs(4).map((t, i) => ({ ...t, weight: [1, 0, 1.5, 0.5][i] }));
    expect(dueSubtopics(withWeights, 1, S).map((t) => t.id)).toEqual(["t2:0", "t0:0", "t3:0"]);
    const plan = buildDailyPlan({ date: MON, settings: S, problems, reviews: [], subtopics: withWeights });
    expect(plan.theory).not.toContain("t1:0");
  });
  it("uses an hours override for its date range only", () => {
    const o = [{ from: "2026-10-19", to: "2026-10-23", hours: 1 }];
    expect(hoursOn("2026-10-20", S, o)).toBe(1);
    expect(hoursOn("2026-10-26", { hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] }, o)).toBe(3.5);
    const light = buildDailyPlan({ date: MON, settings: { ...S, hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] }, problems, reviews: [], subtopics: subs(12), overrides: o });
    const normal = buildDailyPlan({ date: MON, settings: { ...S, hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] }, problems, reviews: [], subtopics: subs(12) });
    expect(light.estMinutes ?? 0).toBeLessThan(normal.estMinutes ?? 0);
  });
});

describe("window scaling", () => {
  it("keeps the base plan for 24 weeks or more", () => {
    expect(scaledWeek(10, S)).toBe(10);
    expect(phasesFor(30)).toHaveLength(5);
  });
  it("compresses a shorter window so every topic is due before the end", () => {
    const short = { ...S, endDate: "2026-12-27" }; // 12 weeks
    expect(scaledWeek(24, short)).toBe(12);
    expect(scaledWeek(1, short)).toBe(1);
    const phases = phasesFor(12);
    expect(phases[0]!.fromWeek).toBe(1);
    expect(phases.at(-1)!.toWeek).toBe(12);
    for (let i = 1; i < phases.length; i++) expect(phases[i]!.fromWeek).toBe(phases[i - 1]!.toWeek + 1);
    expect(phaseForWeek(12, 12)).not.toBeNull();
  });
});

describe("feasibility", () => {
  const base = { from: "2026-10-06", settings: { ...S, hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] }, costs: DEFAULT_COSTS, jsLeft: 0, sqlLeft: 0 };
  const topic = (i: number, tier: "must" | "nice" = "must") => ({ id: `t${i}:0`, topicId: `t${i}`, done: false, weight: 1, tier });

  it("counts study time without Sundays, rest days or revision weeks", () => {
    const a = availableMinutes("2026-10-06", base.settings, DEFAULT_COSTS);
    const withRest = availableMinutes("2026-10-06", { ...base.settings, restDays: ["2026-10-07"] }, DEFAULT_COSTS);
    expect(a.studyDays - withRest.studyDays).toBe(1);
    expect(a.minutes).toBeGreaterThan(withRest.minutes);
  });
  it("is on track with little work and at risk with too much, offering ways out", () => {
    const easy = assessFeasibility({ ...base, dsaPool: ["Easy", "Easy"], subtopics: [topic(0)] });
    expect(easy.status).toBe("on-track");
    expect(easy.coverage).toBe(1);
    expect(easy.remedies).toEqual([]);

    const huge = assessFeasibility({ ...base, dsaPool: Array(600).fill("Hard"), subtopics: [topic(0), topic(1, "nice")] });
    expect(huge.status).toBe("at-risk");
    expect(huge.coverage).toBeLessThan(0.85);
    expect(huge.gapMin).toBeGreaterThan(0);
    expect(huge.remedies.map((r) => r.kind)).toEqual(expect.arrayContaining(["drop-nice", "add-hours", "extend-date"]));
  });
  it("ignores skipped topics", () => {
    const f = assessFeasibility({ ...base, dsaPool: [], subtopics: [{ ...topic(0), weight: 0, tier: "skip" }] });
    expect(f.requiredMin).toBe(0);
  });
});

describe("rebalance", () => {
  const r = (topicId: string, rating: number, tier: TopicRating["tier"] = "must"): TopicRating => ({ topicId, rating, wantToLearn: false, tier, diagnosticScore: null });
  const feas = (over: Partial<ReturnType<typeof assessFeasibility>>) => ({ requiredMin: 1000, availableMin: 1000, coverage: 1, mustCoverage: 1, gapMin: 0, status: "on-track" as const, studyDays: 50, remedies: [], ...over });

  it("recalibrates a measured rating that is far from the evidence", () => {
    const ratings = [r("a", 5)];
    const weights = topicWeights([{ ...ratings[0]!, diagnosticScore: 0 }], new Map([["a", 0]]));
    const actions = buildRebalance({ ratings, weights, openMinutes: new Map(), measured: new Set(["a"]), feasibility: feas({}) });
    expect(actions[0]).toMatchObject({ kind: "recalibrate", from: 5 });
    expect(applyRebalance(ratings, actions)[0]!.rating).toBeLessThan(5);
  });
  it("demotes the strongest must-have topics until the gap closes", () => {
    const ratings = [r("weak", 1), r("mid", 3), r("strong", 5)];
    const weights = topicWeights(ratings);
    const actions = buildRebalance({ ratings, weights, openMinutes: new Map([["weak", 100], ["mid", 100], ["strong", 100]]), measured: new Set(), feasibility: feas({ gapMin: 150, status: "at-risk" }) });
    expect(actions.map((a) => [a.kind, a.topicId])).toEqual([["demote", "strong"], ["demote", "mid"]]);
    expect(applyRebalance(ratings, actions).map((x) => x.tier)).toEqual(["must", "nice", "nice"]);
  });
  it("promotes nice-to-have topics, weakest first, only when there is slack", () => {
    const ratings = [r("a", 4, "nice"), r("b", 1, "nice")];
    const weights = topicWeights(ratings);
    const open = new Map([["a", 100], ["b", 100]]);
    const slack = buildRebalance({ ratings, weights, openMinutes: open, measured: new Set(), feasibility: feas({ requiredMin: 1000, availableMin: 1250 }) });
    expect(slack.map((a) => a.topicId)).toEqual(["b", "a"]);
    const tight = buildRebalance({ ratings, weights, openMinutes: open, measured: new Set(), feasibility: feas({ requiredMin: 1000, availableMin: 1100 }) });
    expect(tight).toEqual([]);
  });
});
