import { describe, expect, it } from "vitest";
import { explainDay, reopenPlanned, type ExplainDayInput } from "@/lib/domain/explain-day";
import { DEFAULT_SETTINGS as S } from "@/lib/domain/plan-config";
import { buildDailyPlan, type ProblemState, type SubtopicState } from "@/lib/domain/planner";

const problems = (n: number, solved = 0): ProblemState[] =>
  Array.from({ length: n }, (_, i) => ({ slug: `p${i}`, track: "main" as const, order: i, solved: i < solved }));
const subtopics = (n: number, week = 1): SubtopicState[] => Array.from({ length: n }, (_, i) => ({ id: `t:${i}`, week, position: i, done: false }));

function input(date: string, over: Partial<ExplainDayInput> = {}, settings = S): ExplainDayInput {
  const base = { date, today: "2026-10-05", settings, problems: problems(100), reviews: [], subtopics: subtopics(10) };
  const merged = { ...base, ...over };
  const plan = over.plan === undefined ? buildDailyPlan({ date, settings, problems: [...merged.problems], reviews: [...merged.reviews], subtopics: [...merged.subtopics] }) : over.plan;
  return { ...merged, plan };
}
const titles = (r: ReturnType<typeof explainDay>) => r.map((x) => x.title);
const text = (r: ReturnType<typeof explainDay>) => r.map((x) => `${x.title} ${x.detail}`).join("\n");

describe("explainDay kinds", () => {
  it("explains a rest day set by the user", () => {
    const r = explainDay(input("2026-10-19", {}, { ...S, restDays: ["2026-10-19"] }));
    expect(r[0]!.title).toBe("Rest day you set");
    expect(titles(r).some((t) => t.startsWith("DSA target"))).toBe(false);
  });
  it("explains Sunday as the review day with the weekly quiz", () => {
    const r = explainDay(input("2026-10-11"));
    expect(r[0]!.title).toBe("Sunday is the review day");
    expect(titles(r)).toContain("Weekly quiz is required");
  });
  it("explains outside the window", () => {
    expect(explainDay(input("2026-10-04"))[0]!.detail).toContain("starts on 2026-10-05");
    expect(explainDay(input("2027-03-22"))[0]!.detail).toContain("ends on your interview date");
  });
  it("explains the revision phase", () => {
    const r = explainDay(input("2027-03-02"));
    expect(r[0]!.title).toBe("Revision phase");
    expect(text(r)).toContain("fixed 2 problems per day");
  });
});

describe("explainDay DSA", () => {
  it("names the ramp in the first weeks", () => {
    const r = explainDay(input("2026-10-05"));
    expect(text(r)).toContain("learning ramp (2 per day until week 2)");
    expect(r.find((x) => x.title.startsWith("DSA target"))!.title).toBe("DSA target: 2");
  });
  it("doubles Saturday", () => {
    const r = explainDay(input("2026-10-10"));
    expect(text(r)).toContain("Saturday counts double");
  });
  it("explains the adaptive spread and the max clamp when behind", () => {
    const r = explainDay(input("2026-11-02", { problems: problems(800) }));
    expect(text(r)).toContain("per day lowered to your maximum of 6");
    expect(titles(r)).toContain("Behind the pace");
  });
  it("explains the min clamp", () => {
    const r = explainDay(input("2026-11-02", { problems: problems(100, 95) }));
    expect(text(r)).toContain("raised to your minimum of 3");
  });
  it("explains hours scaling", () => {
    const settings = { ...S, hoursByDow: [4, 6, 6, 6, 6, 6, 6] };
    const r = explainDay(input("2026-11-02", {}, settings));
    expect(titles(r).some((t) => t.startsWith("Hours budget"))).toBe(true);
    expect(titles(r)).toContain("Time budget: 6 h");
  });
  it("says nothing new is scheduled when all problems are solved", () => {
    expect(text(explainDay(input("2026-11-02", { problems: problems(10, 10) })))).toContain("already solved");
  });
});

describe("explainDay theory, reviews, carry-over", () => {
  it("explains theory and reviews", () => {
    const r = explainDay(input("2026-10-05", { reviews: [{ slug: "p1", nextReviewAt: "2026-10-01" }, { slug: "p2", nextReviewAt: "2026-10-02" }, { slug: "p3", nextReviewAt: "2026-10-03" }] }));
    expect(titles(r)).toContain("Reviews: 2");
    expect(text(r)).toContain("capped at 2");
    expect(titles(r).some((t) => t.startsWith("Theory target"))).toBe(true);
  });
  it("mentions carry-over only when something was left", () => {
    expect(titles(explainDay(input("2026-10-06", { carried: { dsa: 0, theory: 0, quiz: true } })))).not.toContain("Carried over from yesterday");
    const r = explainDay(input("2026-10-06", { carried: { dsa: 2, theory: 1, quiz: true } }));
    expect(r.find((x) => x.title === "Carried over from yesterday")!.detail).toContain("2 DSA problems and 1 theory subtopic");
  });
  it("flags projections and past days", () => {
    expect(titles(explainDay(input("2026-10-08")))).toContain("This is a projection");
    expect(titles(explainDay(input("2026-10-02", {}, { ...S, startDate: "2026-09-28" })))).toContain("About the numbers");
  });
  it("always states the daily quiz rule on study days", () => {
    expect(titles(explainDay(input("2026-10-06")))).toContain("The daily quiz is required");
  });
});

describe("reopenPlanned", () => {
  it("puts planned items back in the pool without mutating the input", () => {
    const ps = problems(3, 3);
    const ts = subtopics(2).map((t) => ({ ...t, done: true }));
    const out = reopenPlanned({ dsaNew: ["p0"], jsProblem: null, sqlProblem: null, theory: ["t:1"], dsaReview: [] }, ps, ts);
    expect(out.problems.map((p) => p.solved)).toEqual([false, true, true]);
    expect(out.subtopics.map((t) => t.done)).toEqual([true, false]);
    expect(ps[0]!.solved).toBe(true);
  });
});
