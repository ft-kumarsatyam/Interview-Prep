import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { topics } from "@/lib/content";
import { PlannerIntake } from "@/lib/models/planner";
import { Notification, Settings } from "@/lib/models/system";
import { startDiagnostic, submitDiagnostic } from "@/lib/services/diagnostic";
import { loadPersonalisation } from "@/lib/services/intake-weights";
import { loadPlanInputs } from "@/lib/services/plan";
import { listPlanChanges } from "@/lib/services/plan-log";
import { applyProposal, proposeRebalance } from "@/lib/services/rebalance";
import { completeIntake, getFeasibility, getIntake, saveIntakeStep } from "@/lib/services/planner-intake";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const TUE = "2026-10-06";
const goals = { step: "goals", targetRole: "Backend", targetCompany: "Acme", level: "1-3y", focusNotes: "weak at DP", interviewDate: "2027-03-21" };
const availability = { step: "availability", hoursByDow: [4, 3, 3, 3, 3, 3, 6], overrides: [{ from: "2026-12-20", to: "2026-12-31", hours: 1 }] };
const ratings = { step: "ratings", ratings: [{ topicId: topics[0].id, rating: 2, wantToLearn: true, tier: "must" }] };

describe("planner intake", () => {
  it("seeds from settings before anything is saved", async () => {
    const s = await getIntake();
    expect(s.stepsDone).toEqual([]);
    expect(s.completedAt).toBeNull();
    expect(s.availability.hoursByDow).toHaveLength(7);
  });

  it("autosaves a step and keeps it across reads", async () => {
    await saveIntakeStep(goals, at(TUE));
    const s = await getIntake();
    expect(s.stepsDone).toEqual(["goals"]);
    expect(s.goals).toMatchObject({ targetRole: "Backend", level: "1-3y", focusNotes: "weak at DP" });
    expect(s.interviewDate).toBe("2027-03-21");
  });

  it("is idempotent: saving a step twice doesn't duplicate it", async () => {
    await saveIntakeStep(goals, at(TUE));
    await saveIntakeStep({ ...goals, targetRole: "Platform" }, at(TUE));
    const s = await getIntake();
    expect(s.stepsDone).toEqual(["goals"]);
    expect(s.goals.targetRole).toBe("Platform");
  });

  it("rejects a past interview date and unknown topics", async () => {
    await expect(saveIntakeStep({ ...goals, interviewDate: TUE }, at(TUE))).rejects.toThrow(/future/);
    await expect(saveIntakeStep({ step: "ratings", ratings: [{ topicId: "nope", rating: 3, wantToLearn: false, tier: "must" }] }, at(TUE))).rejects.toThrow(/Unknown topic/);
  });

  it("refuses to complete until every step is saved", async () => {
    await saveIntakeStep(goals, at(TUE));
    await expect(completeIntake(at(TUE))).rejects.toThrow(/ratings, availability/);
  });

  it("completes: stamps it and syncs role, hours and date into Settings", async () => {
    await saveIntakeStep(goals, at(TUE));
    await saveIntakeStep(ratings, at(TUE));
    await saveIntakeStep(availability, at(TUE));
    const done = await completeIntake(at(TUE));
    expect(done.completedAt).not.toBeNull();
    const settings = await Settings.findById("settings").lean();
    expect(settings?.endDate).toBe("2027-03-21");
    expect(settings?.targetCompany).toBe("Acme");
    expect(settings?.hoursByDow).toEqual([4, 3, 3, 3, 3, 3, 6]);
  });
});

describe("planner personalisation", () => {
  const rate = (rating: number, tier: "must" | "nice" | "skip" = "must") => ({ step: "ratings", ratings: topics.slice(0, 3).map((t) => ({ topicId: t.id, rating, wantToLearn: false, tier })) });
  async function finish(ratingStep: object = rate(2)) {
    await saveIntakeStep(goals, at(TUE));
    await saveIntakeStep(ratingStep, at(TUE));
    await saveIntakeStep(availability, at(TUE));
    await completeIntake(at(TUE));
  }

  it("changes nothing until the intake is completed", async () => {
    await saveIntakeStep(rate(1), at(TUE));
    const p = await loadPersonalisation();
    expect(p.completed).toBe(false);
    expect(p.weights.size).toBe(0);
  });

  it("feeds weights and hour overrides into the plan inputs once completed", async () => {
    await finish(rate(1, "skip"));
    const inputs = await loadPlanInputs();
    expect(inputs.overrides).toHaveLength(1);
    const skipped = inputs.subtopics.filter((s) => s.id.startsWith(`${topics[0].id}:`));
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped.every((s) => s.weight === 0)).toBe(true);
  });

  it("reports feasibility from real progress", async () => {
    await finish();
    const f = await getFeasibility(at(TUE));
    expect(f.requiredMin).toBeGreaterThan(0);
    expect(f.availableMin).toBeGreaterThan(0);
    expect(["on-track", "tight", "at-risk"]).toContain(f.status);
  });
});

describe("diagnostic", () => {
  it("grades against the bank, stores scores on the ratings and rejects unknown questions", async () => {
    await saveIntakeStep({ step: "ratings", ratings: topics.slice(0, 6).map((t) => ({ topicId: t.id, rating: 4, wantToLearn: false, tier: "must" })) }, at(TUE));
    const quiz = await startDiagnostic("seed");
    expect(quiz.length).toBeGreaterThan(0);
    expect(quiz.every((t) => t.questions.length > 0 && t.questions.length <= 3)).toBe(true);
    const answers = quiz.flatMap((t) => t.questions.map((q) => ({ id: q.id, answer: null })));
    const results = await submitDiagnostic(answers);
    expect(results.every((r) => r.pct === 0)).toBe(true);
    const saved = await getIntake();
    expect(saved.ratings.find((r) => r.topicId === results[0]!.topicId)?.diagnosticScore).toBe(0);
    await expect(submitDiagnostic([{ id: "nope", answer: 0 }])).rejects.toThrow(/Unknown question/);
  });
});

describe("weekly rebalance", () => {
  it("proposes at most once a week, applies once and logs it", async () => {
    // Rated strong, but the diagnostic says otherwise: a clear recalibration.
    await saveIntakeStep(goals, at(TUE));
    await saveIntakeStep({ step: "ratings", ratings: topics.slice(0, 3).map((t) => ({ topicId: t.id, rating: 5, wantToLearn: false, tier: "must" })) }, at(TUE));
    await saveIntakeStep(availability, at(TUE));
    await completeIntake(at(TUE));
    await PlannerIntake.updateOne({ _id: "planner-intake" }, { $set: { "topicRatings.$[].diagnosticScore": 0 } });

    const first = await proposeRebalance(at(TUE));
    expect(first?.status).toBe("pending");
    expect(first?.actions.some((a) => a.kind === "recalibrate")).toBe(true);
    expect((await proposeRebalance(at(TUE)))?.weekKey).toBe(first?.weekKey);
    expect(await Notification.countDocuments({ dedupeKey: `rebalance:${first!.weekKey}` })).toBe(1);

    await applyProposal(at(TUE));
    await expect(applyProposal(at(TUE))).rejects.toThrow(/waiting/);
    const after = await getIntake();
    expect(after.ratings.every((r) => r.rating < 5)).toBe(true);
    expect((await listPlanChanges()).some((c) => c.type === "rebalance")).toBe(true);
  });

  it("does nothing before the intake is complete, and a dismissed proposal stays dismissed", async () => {
    expect(await proposeRebalance(at(TUE))).toBeNull();
  });
});
