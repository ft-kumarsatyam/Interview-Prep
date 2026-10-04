import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { subtopics } from "@/core/content";
import { correctAnswerKey, isAnswerCorrect } from "@/modules/quiz/domain/quiz";
import { jsonProvider } from "@/core/llm";
import { Quiz } from "@/core/models/day";
import { Mastery, PracticeAttempt } from "@/core/models/learning";
import { recomputeDay } from "@/modules/planner/services/day";
import { ensureToday } from "@/modules/planner/services/plan";
import { startPractice, submitPractice } from "@/modules/quiz/services/practice";
import { recordSolve, toggleSubtopic } from "@/modules/progress/services/progress";
import { getQuizReview, startQuiz, submitQuiz } from "@/modules/quiz/services/quiz";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const TUE = "2026-10-06";
const SUN = "2026-10-11";

async function doTodaysWork(date: string) {
  const { plan } = await ensureToday(at(date));
  for (const slug of plan.dsaNew) await recordSolve({ slug, date, source: "manual", details: { confidence: "ok" } });
  for (const id of plan.theory) await toggleSubtopic(id, date);
  return plan;
}

async function answerKey(date: string, kind: "daily" | "weekly") {
  const doc = await Quiz.findOne({ date, kind }).lean();
  return doc!.questions.map(correctAnswerKey);
}

describe("daily quiz", () => {
  it("stays locked until a problem and a subtopic are done", async () => {
    await expect(startQuiz(at(TUE), null)).rejects.toThrow(/unlock/);
  });

  it("builds 10 bank questions once per day, hides answers, and completes the day on a pass", async () => {
    const plan = await doTodaysWork(TUE);
    const quiz = await startQuiz(at(TUE), null);
    expect(quiz.generatedBy).toBe("bank");
    expect(quiz.questions).toHaveLength(10);
    expect(new Set(quiz.questions.map((q) => q.id)).size).toBe(10);
    expect(quiz.questions[0]).not.toHaveProperty("answerIndex");
    // Week 1 theory is JS basics, so verified output-prediction questions are mixed in.
    expect(plan.theory.some((id) => id.startsWith("js-"))).toBe(true);
    expect(quiz.questions.some((q) => q.code)).toBe(true);

    const again = await startQuiz(at(TUE), null);
    expect(again.questions.map((q) => q.id)).toEqual(quiz.questions.map((q) => q.id));
    expect(await Quiz.countDocuments()).toBe(1);

    const key = await answerKey(TUE, "daily");
    const fail = await submitQuiz({ date: TUE, kind: "daily", answers: key.map(() => null) }, at(TUE));
    expect(fail.outcome).toMatchObject({ pct: 0, passed: false });
    expect(fail.justCompleted).toBe(false);

    const pass = await submitQuiz({ date: TUE, kind: "daily", answers: key }, at(TUE));
    expect(pass.outcome).toMatchObject({ pct: 100, passed: true });
    expect(pass.justCompleted).toBe(true);
    expect((await recomputeDay(TUE)).day.complete).toBe(true);

    const review = await getQuizReview(TUE, "daily");
    expect(review?.items.every((q) => isAnswerCorrect(q, q.chosen))).toBe(true);
  });

  it("only accepts today's quiz", async () => {
    await doTodaysWork(TUE);
    await startQuiz(at(TUE), null);
    const key = await answerKey(TUE, "daily");
    await expect(submitQuiz({ date: TUE, kind: "daily", answers: key }, at("2026-10-07"))).rejects.toThrow(/closed/);
  });

  it("uses the LLM with one retry after invalid output", async () => {
    await doTodaysWork(TUE);
    const prompts: string[] = [];
    const llm = jsonProvider("fake", async (prompt) => {
      prompts.push(prompt);
      if (prompts.length === 1) return "not json at all";
      const n = Number(/exactly (\d+) multiple-choice/.exec(prompt)?.[1] ?? 10);
      return JSON.stringify({
        questions: Array.from({ length: n }, (_, i) => ({
          prompt: `Generated question number ${i}?`,
          options: ["a", "b", "c", "d"],
          answerIndex: i % 4,
          explanation: "Because.",
          kind: "subtopic",
          ref: "not-a-real-ref",
        })),
      });
    });
    const quiz = await startQuiz(at(TUE), llm);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/rejected/);
    expect(quiz.generatedBy).toBe("llm");
    expect(quiz.questions).toHaveLength(10);
    // JS day: 2 of the 10 are verified bank output questions, the rest come from the model.
    expect(quiz.questions.filter((q) => q.id.startsWith("l-"))).toHaveLength(8);
  });

  it("falls back to the bank when the LLM keeps failing", async () => {
    await doTodaysWork(TUE);
    const llm = jsonProvider("broken", async () => "{}");
    const quiz = await startQuiz(at(TUE), llm);
    expect(quiz.generatedBy).toBe("bank");
    expect(quiz.questions).toHaveLength(10);
  });
});

describe("weekly quiz", () => {
  it("re-asks the week's questions and adds new ones", async () => {
    await doTodaysWork(TUE);
    await startQuiz(at(TUE), null);
    const key = await answerKey(TUE, "daily");
    await submitQuiz({ date: TUE, kind: "daily", answers: key.map((k, i) => (i < 4 ? (k + 1) % 4 : k)) }, at(TUE));
    const dailyIds = (await Quiz.findOne({ date: TUE }).lean())!.questions.map((q) => q.id);

    const weekly = await startQuiz(at(SUN), null);
    expect(weekly.kind).toBe("weekly");
    expect(weekly.questions).toHaveLength(30);
    const ids = new Set(weekly.questions.map((q) => q.id));
    expect(ids.size).toBe(30);
    expect(dailyIds.every((id) => ids.has(id))).toBe(true);

    const pass = await submitQuiz({ date: SUN, kind: "weekly", answers: await answerKey(SUN, "weekly") }, at(SUN));
    expect(pass.justCompleted).toBe(true);
  });
});

describe("practice and mastery", () => {
  const topicId = "js-basics";
  const subs = subtopics.filter((s) => s.topicId === topicId).map((s) => s.id);

  async function key(attemptId: string) {
    return (await PracticeAttempt.findById(attemptId).lean())!.questions.map(correctAnswerKey);
  }

  it("runs ungated subtopic practice and rolls scores into mastery", async () => {
    const run = await startPractice(subs[3], null, at(TUE));
    expect(run.questions).toHaveLength(5);
    const answers = await key(run.attemptId);

    const first = await submitPractice(run.attemptId, answers, at(TUE));
    expect(first.mastery).toMatchObject({ score: 100, attempts: 1, bestPct: 100 });
    await expect(submitPractice(run.attemptId, answers, at(TUE))).rejects.toThrow(/Already submitted/);

    const second = await startPractice(subs[3], null, at(TUE));
    const res = await submitPractice(second.attemptId, second.questions.map(() => null), at(TUE));
    expect(res.mastery).toMatchObject({ score: 60, attempts: 2, bestPct: 100 });
  });

  it("rotates repeat runs toward questions not seen yet", async () => {
    const ref = subs[3];
    const first = await startPractice(ref, null, at(TUE));
    await submitPractice(first.attemptId, await key(first.attemptId), at(TUE));
    const second = await startPractice(ref, null, at(TUE));
    const firstIds = new Set(first.questions.map((q) => q.id));
    const repeats = second.questions.filter((q) => firstIds.has(q.id)).length;
    expect(repeats).toBeLessThan(second.questions.length);
  });

  it("collects wrong answers into a mistakes run that doesn't touch mastery, and clears them when fixed", async () => {
    await expect(startPractice("mistakes", null, at(TUE))).rejects.toThrow(/No mistakes/);
    const run = await startPractice(subs[2], null, at(TUE));
    const answers = await key(run.attemptId);
    await submitPractice(run.attemptId, answers.map((k, i) => (i < 2 ? (k === 0 ? 1 : 0) : k)), at(TUE));

    const review = await startPractice("mistakes", null, at(TUE));
    expect(review.target.scope).toBe("mistakes");
    expect(review.questions.map((q) => q.id).sort()).toEqual(run.questions.slice(0, 2).map((q) => q.id).sort());
    const byTrack = await startPractice("mistakes:js", null, at(TUE));
    expect(byTrack.questions).toHaveLength(2);
    await expect(startPractice("mistakes:hld", null, at(TUE))).rejects.toThrow(/No mistakes/);

    const masteryBefore = await Mastery.countDocuments();
    const fixed = await submitPractice(review.attemptId, await key(review.attemptId), at(TUE));
    expect(fixed.mastery).toBeNull();
    expect(fixed.remainingMistakes).toBe(0);
    expect(await Mastery.countDocuments()).toBe(masteryBefore);
  });

  it("prefers the chosen difficulty when the bank has enough of it", async () => {
    const run = await startPractice(subs[3], null, at(TUE), { difficulty: "hard" });
    expect(run.questions).toHaveLength(5);
  });

  it("locks the topic quiz until every subtopic is ticked, then awards Mastered once", async () => {
    await expect(startPractice(topicId, null, at(TUE))).rejects.toThrow(/Tick every subtopic/);
    for (const id of subs) await toggleSubtopic(id, TUE);

    const run = await startPractice(topicId, null, at(TUE));
    expect(run.questions).toHaveLength(10);
    const pass = await submitPractice(run.attemptId, await key(run.attemptId), at(TUE));
    expect(pass.newlyMastered).toBe(true);
    expect(pass.mastery?.masteredOn).toBe(TUE);
    expect(await Mastery.countDocuments({ scope: "subtopic" })).toBeGreaterThan(0);

    const again = await startPractice(topicId, null, at("2026-10-08"));
    const res = await submitPractice(again.attemptId, await key(again.attemptId), at("2026-10-08"));
    expect(res.newlyMastered).toBe(false);
    expect(res.mastery?.masteredOn).toBe(TUE);
  });
});
