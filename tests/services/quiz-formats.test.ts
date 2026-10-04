import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { subtopics } from "@/core/content";
import { correctAnswerKey, isAnswerCorrect, maskOf } from "@/modules/quiz/domain/quiz";
import { Quiz } from "@/core/models/day";
import { PracticeAttempt } from "@/core/models/learning";
import { ensureToday } from "@/modules/planner/services/plan";
import { submitPractice } from "@/modules/quiz/services/practice";
import { recordSolve, toggleSubtopic } from "@/modules/progress/services/progress";
import { getQuizReview, startQuiz, submitQuiz } from "@/modules/quiz/services/quiz";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const TUE = "2026-10-06";
const source = { kind: "subtopic" as const, ref: "js-basics:0" };

// One of each format. The first has no `type`, like every question stored before multi-select existed.
const LEGACY = { id: "legacy", prompt: "Which keyword declares a block-scoped variable?", options: ["var", "let", "function", "goto"], answerIndex: 1, explanation: "let is block scoped.", source, style: "concept" };
const MULTI = {
  id: "multi",
  prompt: "Which of these are falsy in JavaScript? Select all that apply.",
  options: ["0", "'0'", "null", "[]", "NaN"],
  answerIndex: 0,
  type: "multi",
  answerIndices: [0, 2, 4],
  explanation: "0, null and NaN are falsy; '0' and [] are truthy.",
  source,
  style: "concept",
};
const TRUEFALSE = { id: "tf", prompt: "typeof null === 'object'", options: ["True", "False"], answerIndex: 0, type: "truefalse", explanation: "A historic quirk.", source, style: "concept" };

async function unlockAndOpenQuiz() {
  const { plan } = await ensureToday(at(TUE));
  for (const slug of plan.dsaNew) await recordSolve({ slug, date: TUE, source: "manual", details: { confidence: "ok" } });
  for (const id of plan.theory) await toggleSubtopic(id, TUE);
  await startQuiz(at(TUE), null);
  await Quiz.updateOne({ date: TUE, kind: "daily" }, { $set: { questions: [LEGACY, MULTI, TRUEFALSE] } });
}

describe("daily quiz with mixed question formats", () => {
  it("persists type and answerIndices, hides the key, and exposes the format to the player", async () => {
    await unlockAndOpenQuiz();
    const snapshot = await startQuiz(at(TUE), null);
    expect(snapshot.questions.map((q) => q.type)).toEqual([undefined, "multi", "truefalse"]);
    expect(JSON.stringify(snapshot.questions)).not.toContain("answerIndic");

    const stored = (await Quiz.findOne({ date: TUE, kind: "daily" }).lean())!.questions;
    expect(stored[1]?.answerIndices).toEqual([0, 2, 4]);
    expect(stored[0]?.type ?? undefined).toBeUndefined();
    expect(stored[0]?.answerIndices ?? undefined).toBeUndefined();
  });

  it("grades each format by its own encoding", async () => {
    await unlockAndOpenQuiz();
    const perfect = await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 2, 4]), 0] }, at(TUE));
    expect(perfect.outcome).toMatchObject({ correct: 3, total: 3, pct: 100, passed: true });

    const partialMulti = await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 2]), 0] }, at(TUE));
    expect(partialMulti.outcome.correct).toBe(2);
    const extraMulti = await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 2, 3, 4]), 0] }, at(TUE));
    expect(extraMulti.outcome.correct).toBe(2);
    const wrongTf = await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 2, 4]), 1] }, at(TUE));
    expect(wrongTf.outcome.correct).toBe(2);
    const blank = await submitQuiz({ date: TUE, kind: "daily", answers: [null, null, null] }, at(TUE));
    expect(blank.outcome.correct).toBe(0);
  });

  it("returns review items that carry the multi-select key", async () => {
    await unlockAndOpenQuiz();
    const res = await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 1]), 0] }, at(TUE));
    const multi = res.outcome.review.find((r) => r.id === "multi")!;
    expect(multi).toMatchObject({ type: "multi", answerIndices: [0, 2, 4] });
    // js-basics subtopic -> the "JavaScript & Node" Gemini project
    expect(multi.subject).toBe("js");
    expect(res.outcome.review.find((r) => r.id === "legacy")).not.toHaveProperty("type");
  });

  it("reviews a past attempt and tells right from wrong per format", async () => {
    await unlockAndOpenQuiz();
    await submitQuiz({ date: TUE, kind: "daily", answers: [1, maskOf([0, 1]), 0] }, at(TUE));
    const review = await getQuizReview(TUE, "daily");
    expect(review!.items.map((q) => isAnswerCorrect(q, q.chosen))).toEqual([true, false, true]);
    expect(review!.items[1]?.chosen).toBe(maskOf([0, 1]));
  });
});

describe("practice runs with mixed question formats", () => {
  it("stores the format on the attempt and grades it", async () => {
    const ref = subtopics[0]!.id;
    const attempt = await PracticeAttempt.create({
      scope: "subtopic",
      ref,
      questions: [LEGACY, MULTI, TRUEFALSE].map((q) => ({ ...q, ref })),
    });
    const stored = (await PracticeAttempt.findById(attempt._id).lean())!.questions;
    expect(stored.map(correctAnswerKey)).toEqual([1, maskOf([0, 2, 4]), 0]);

    const res = await submitPractice(String(attempt._id), [1, maskOf([0, 2, 4]), 1]);
    expect(res.outcome.correct).toBe(2);
    expect(res.outcome.review.find((r) => r.id === "multi")).toMatchObject({ type: "multi", answerIndices: [0, 2, 4] });
  });
});
