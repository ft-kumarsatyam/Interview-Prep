import { subtopicById, subtopics, topicById, trackById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import type { DateStr } from "@/lib/domain/dates";
import {
  canTakeTopicQuiz,
  nextMasteryScore,
  passesTopicQuiz,
  pickTopicQuestions,
  SUBTOPIC_PRACTICE_SIZE,
  TOPIC_QUIZ_SIZE,
} from "@/lib/domain/mastery";
import { scoreQuiz } from "@/lib/domain/quiz";
import { seededRng, seedFrom, weightedSample, type Rng } from "@/lib/domain/sampling";
import { getLlm, type LlmProvider } from "@/lib/llm";
import { Mastery, PracticeAttempt } from "@/lib/models/learning";
import { SubtopicProgress } from "@/lib/models/progress";
import { bank, questionWeight } from "@/lib/quiz/bank";
import { fromLlm, subtopicPrompt } from "@/lib/quiz/prompts";
import { llmQuizSchema, toPublic, toReview, type PublicQuestion, type QuizOutcome, type QuizQuestion } from "@/lib/quiz/question";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export interface PracticeTarget {
  scope: "subtopic" | "topic";
  ref: string;
  title: string;
  topicId: string;
  topicTitle: string;
  track: string;
  subtopicIds: string[];
}

export function resolvePracticeTarget(ref: string): PracticeTarget | null {
  const sub = subtopicById.get(ref);
  if (sub) {
    return { scope: "subtopic", ref, title: sub.title, topicId: sub.topicId, topicTitle: sub.topicTitle, track: sub.track, subtopicIds: [ref] };
  }
  const topic = topicById.get(ref);
  if (!topic) return null;
  return {
    scope: "topic",
    ref,
    title: topic.title,
    topicId: topic.id,
    topicTitle: topic.title,
    track: topic.track,
    subtopicIds: subtopics.filter((s) => s.topicId === topic.id).map((s) => s.id),
  };
}

export async function topicQuizEligibility(target: PracticeTarget): Promise<{ eligible: boolean; done: number; total: number }> {
  await connectDb();
  const rows = await SubtopicProgress.find({ topicId: target.topicId }, { subtopicId: 1 }).lean();
  const done = new Set(rows.map((r) => r.subtopicId));
  return {
    eligible: canTakeTopicQuiz(target.subtopicIds, done),
    done: target.subtopicIds.filter((id) => done.has(id)).length,
    total: target.subtopicIds.length,
  };
}

const real = (q: QuizQuestion) => q.style !== "recall";

function take(layers: QuizQuestion[][], n: number, rng: Rng): QuizQuestion[] {
  const used = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const layer of layers) {
    if (out.length >= n) break;
    for (const q of weightedSample(layer.filter((q) => !used.has(q.id)), questionWeight, n - out.length, rng)) {
      used.add(q.id);
      out.push(q);
    }
  }
  return out;
}

async function subtopicQuestions(target: PracticeTarget, llm: LlmProvider | null, rng: Rng): Promise<QuizQuestion[]> {
  const own = bank().bySubtopic.get(target.ref) ?? [];
  const n = SUBTOPIC_PRACTICE_SIZE;
  // Prefer the LLM only when the bank has little real material for this subtopic.
  if (llm && own.filter(real).length < n) {
    try {
      const sub = subtopicById.get(target.ref)!;
      const res = await llm.generateJson(subtopicPrompt(sub, trackById.get(sub.track)?.name ?? sub.track, n), llmQuizSchema(n, n + 2));
      const stamp = Date.now().toString(36);
      return res.questions.slice(0, n).map((q, i) => fromLlm(q, `p-${stamp}-${i}`, { kind: "subtopic", ref: target.ref }));
    } catch (err) {
      console.warn(`[practice] LLM failed, using the bank: ${err instanceof Error ? err.message : err}`);
    }
  }
  const siblings = subtopics.filter((s) => s.topicId === target.topicId && s.id !== target.ref).flatMap((s) => bank().bySubtopic.get(s.id) ?? []);
  return take([own.filter(real), own, siblings.filter(real), siblings], n, rng);
}

async function topicQuestions(target: PracticeTarget, rng: Rng): Promise<QuizQuestion[]> {
  const masteries = await Mastery.find({ ref: { $in: target.subtopicIds } }, { ref: 1, score: 1 }).lean();
  const scores = Object.fromEntries(masteries.map((m) => [m.ref, m.score ?? 0]));
  const bySubtopic = new Map(
    target.subtopicIds.map((id) => {
      const qs = bank().bySubtopic.get(id) ?? [];
      return [id, qs.filter(real).length >= 2 ? qs.filter(real) : qs];
    }),
  );
  const picked = pickTopicQuestions(bySubtopic, scores, TOPIC_QUIZ_SIZE, rng);
  if (picked.length >= TOPIC_QUIZ_SIZE) return picked;
  const used = new Set(picked.map((q) => q.id));
  const fill = (bank().byTrack.get(target.track) ?? []).filter((q) => real(q) && !used.has(q.id));
  return [...picked, ...weightedSample(fill, questionWeight, TOPIC_QUIZ_SIZE - picked.length, rng)];
}

export interface PracticeStart {
  attemptId: string;
  target: PracticeTarget;
  questions: PublicQuestion[];
}

/** Create a practice run. Ungated for subtopics; the topic quiz needs every subtopic ticked. */
export async function startPractice(ref: string, llm: LlmProvider | null = getLlm(), now = new Date()): Promise<PracticeStart> {
  await connectDb();
  const target = resolvePracticeTarget(ref);
  if (!target) throw new Error("Unknown topic");
  if (target.scope === "topic" && !(await topicQuizEligibility(target)).eligible) {
    throw new Error("Tick every subtopic in this topic to unlock its quiz");
  }
  const rng = seededRng(seedFrom(`${ref}:${now.getTime()}`));
  const questions = target.scope === "topic" ? await topicQuestions(target, rng) : await subtopicQuestions(target, llm, rng);
  if (questions.length === 0) throw new Error("No questions for this topic yet");
  const attempt = await PracticeAttempt.create({
    scope: target.scope,
    ref,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      code: q.code,
      options: q.options,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      ref: q.source.ref,
    })),
  });
  return { attemptId: String(attempt._id), target, questions: questions.map(toPublic) };
}

export interface MasteryState {
  score: number;
  attempts: number;
  bestPct: number;
  masteredOn: DateStr | null;
}

async function bumpMastery(ref: string, scope: "subtopic" | "topic", pct: number, masteredOn?: DateStr): Promise<MasteryState> {
  const prev = await Mastery.findOne({ ref }).lean();
  const score = nextMasteryScore(prev ? { score: prev.score ?? 0, attempts: prev.attempts ?? 0 } : null, pct);
  const setMastered = masteredOn && !prev?.masteredOn ? { masteredOn } : {};
  await Mastery.updateOne(
    { ref },
    { $set: { scope, score, ...setMastered }, $inc: { attempts: 1 }, $max: { bestPct: pct } },
    { upsert: true },
  );
  return {
    score,
    attempts: (prev?.attempts ?? 0) + 1,
    bestPct: Math.max(prev?.bestPct ?? 0, pct),
    masteredOn: prev?.masteredOn ?? masteredOn ?? null,
  };
}

export interface PracticeResult {
  outcome: QuizOutcome;
  mastery: MasteryState;
  newlyMastered: boolean;
  thresholdPct: number;
  target: PracticeTarget;
}

/** Grade once (compare-and-set on submittedAt), then roll the score into mastery. */
export async function submitPractice(attemptId: string, answers: Array<number | null>, now = new Date()): Promise<PracticeResult> {
  await connectDb();
  const attempt = await PracticeAttempt.findById(attemptId).lean();
  if (!attempt) throw new Error("Practice run not found");
  if (attempt.submittedAt) throw new Error("Already submitted: start a new run");
  const target = resolvePracticeTarget(attempt.ref);
  if (!target) throw new Error("Unknown topic");
  const questions = attempt.questions ?? [];
  if (answers.length !== questions.length) throw new Error("Answer count doesn't match");

  const score = scoreQuiz(questions.map((q) => q.answerIndex), answers);
  const claimed = await PracticeAttempt.updateOne(
    { _id: attempt._id, submittedAt: null },
    { $set: { answers: answers.map((a) => a ?? -1), pct: score.pct, submittedAt: now } },
  );
  if (claimed.modifiedCount === 0) throw new Error("Already submitted: start a new run");

  const s = await getSettings();
  const thresholdPct = s.topicMasteryPct;
  let mastery: MasteryState;
  let newlyMastered = false;
  if (target.scope === "topic") {
    const passed = passesTopicQuiz(score.pct, thresholdPct);
    const before = await Mastery.findOne({ ref: target.ref }, { masteredOn: 1 }).lean();
    mastery = await bumpMastery(target.ref, "topic", score.pct, passed ? todayIn(s, now) : undefined);
    newlyMastered = passed && !before?.masteredOn;
    // A topic quiz also tells us how each of its subtopics is going.
    const groups = new Map<string, { right: number; total: number }>();
    questions.forEach((q, i) => {
      if (!target.subtopicIds.includes(q.ref)) return;
      const g = groups.get(q.ref) ?? { right: 0, total: 0 };
      g.total++;
      if (answers[i] === q.answerIndex) g.right++;
      groups.set(q.ref, g);
    });
    for (const [ref, g] of groups) await bumpMastery(ref, "subtopic", Math.round((g.right / g.total) * 100));
  } else {
    mastery = await bumpMastery(target.ref, "subtopic", score.pct);
  }

  return {
    outcome: {
      ...score,
      passed: target.scope === "topic" ? passesTopicQuiz(score.pct, thresholdPct) : score.pct >= s.quizPassPct,
      review: questions.map((q) => toReview({ id: q.id, answerIndex: q.answerIndex, explanation: q.explanation ?? "" })),
    },
    mastery,
    newlyMastered,
    thresholdPct,
    target,
  };
}
