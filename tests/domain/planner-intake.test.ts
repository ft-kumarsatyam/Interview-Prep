import { describe, expect, it } from "vitest";
import { intakeStepSchema, isIntakeComplete, mergeRatings, missingSteps, ratingToWeight } from "@/modules/planner/domain/planner-intake";

describe("ratingToWeight", () => {
  it("gives weaker topics more time and strong ones less", () => {
    expect(ratingToWeight(1, "must")).toBeGreaterThan(ratingToWeight(3, "must"));
    expect(ratingToWeight(3, "must")).toBeGreaterThan(ratingToWeight(5, "must"));
  });
  it("gives skipped topics nothing and nice-to-have less than must-have", () => {
    expect(ratingToWeight(1, "skip")).toBe(0);
    expect(ratingToWeight(3, "nice")).toBeLessThan(ratingToWeight(3, "must"));
  });
  it("boosts a topic you want to learn", () => {
    expect(ratingToWeight(3, "must", true)).toBeGreaterThan(ratingToWeight(3, "must"));
  });
  it("clamps out-of-range ratings", () => {
    expect(ratingToWeight(9, "must")).toBe(ratingToWeight(5, "must"));
    expect(ratingToWeight(-2, "must")).toBe(ratingToWeight(1, "must"));
  });
});

describe("intakeStepSchema", () => {
  const goals = { step: "goals", targetRole: "Backend", targetCompany: "", level: "fresher", focusNotes: "", interviewDate: "2027-03-21" };
  it("accepts a valid goals step and rejects a blank role or bad date", () => {
    expect(intakeStepSchema.safeParse(goals).success).toBe(true);
    expect(intakeStepSchema.safeParse({ ...goals, targetRole: " " }).success).toBe(false);
    expect(intakeStepSchema.safeParse({ ...goals, interviewDate: "21-03-2027" }).success).toBe(false);
  });
  it("rejects duplicate topic ratings and out-of-range values", () => {
    const r = { topicId: "t1", rating: 3, wantToLearn: false, tier: "must" };
    expect(intakeStepSchema.safeParse({ step: "ratings", ratings: [r, r] }).success).toBe(false);
    expect(intakeStepSchema.safeParse({ step: "ratings", ratings: [{ ...r, rating: 6 }] }).success).toBe(false);
    expect(intakeStepSchema.safeParse({ step: "ratings", ratings: [r] }).success).toBe(true);
  });
  it("needs 7 hour values and rejects overlapping or reversed ranges", () => {
    const base = { step: "availability", hoursByDow: [1, 2, 3, 4, 5, 6, 7], overrides: [] };
    expect(intakeStepSchema.safeParse(base).success).toBe(true);
    expect(intakeStepSchema.safeParse({ ...base, hoursByDow: [1, 2] }).success).toBe(false);
    expect(intakeStepSchema.safeParse({ ...base, overrides: [{ from: "2027-01-10", to: "2027-01-05", hours: 1 }] }).success).toBe(false);
    const a = { from: "2027-01-01", to: "2027-01-10", hours: 1 };
    expect(intakeStepSchema.safeParse({ ...base, overrides: [a, { from: "2027-01-10", to: "2027-01-12", hours: 1 }] }).success).toBe(false);
    expect(intakeStepSchema.safeParse({ ...base, overrides: [a, { from: "2027-01-11", to: "2027-01-12", hours: 1 }] }).success).toBe(true);
  });
});

describe("intake progress", () => {
  it("lists missing steps and needs both all steps and a completion stamp", () => {
    expect(missingSteps(["goals"])).toEqual(["ratings", "availability"]);
    expect(isIntakeComplete({ stepsDone: ["goals", "ratings", "availability"], completedAt: null })).toBe(false);
    expect(isIntakeComplete({ stepsDone: ["goals"], completedAt: new Date() })).toBe(false);
    expect(isIntakeComplete({ stepsDone: ["goals", "ratings", "availability"], completedAt: new Date() })).toBe(true);
  });
  it("keeps a diagnostic score when the topic is re-rated", () => {
    const merged = mergeRatings(
      [{ topicId: "a", rating: 2, wantToLearn: false, tier: "must", diagnosticScore: 40 }],
      [{ topicId: "a", rating: 4, wantToLearn: true, tier: "nice" }, { topicId: "b", rating: 1, wantToLearn: false, tier: "must" }],
    );
    expect(merged[0]).toMatchObject({ rating: 4, diagnosticScore: 40 });
    expect(merged[1].diagnosticScore).toBeNull();
  });
});
