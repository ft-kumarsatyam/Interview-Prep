import { designCaseBySlug, practiceCaseBySlug, problemBySlug, subtopicById, subtopics, topicById, trackById } from "@/core/content";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import {
  canTakeTopicQuiz,
  nextMasteryScore,
  passesTopicQuiz,
  pickTopicQuestions,
  SUBTOPIC_PRACTICE_SIZE,
  TOPIC_QUIZ_SIZE,
} from "@/modules/progress/domain/mastery";
import { mistakeWeight, outstandingMistakes, rotationWeight, type QuestionHistory } from "@/modules/quiz/domain/question-history";
import { correctAnswerKey, difficultyLayers, isAnswerCorrect, scoreQuiz } from "@/modules/quiz/domain/quiz";
import { askSubjectForRef } from "@/modules/quiz/lib/subject";
import { casePath, CASE_QUIZ_SIZE, parseCaseRef, pickCaseQuestions } from "@/modules/design/domain/case-quiz";
import { caseQuestions, caseTitle, learnMoreFor } from "@/modules/quiz/lib/case-bank";
import { seededRng, seedFrom, weightedSample, type Rng } from "@/core/domain/sampling";
import { getLlm, type LlmProvider } from "@/core/llm";
import { getStudied } from "@/modules/progress/services/studied";
import { loadGenerated } from "@/modules/quiz/services/generated";
import { Mastery, PracticeAttempt } from "@/core/models/learning";
import { SubtopicProgress } from "@/core/models/progress";
import { bank, questionWeight } from "@/modules/quiz/lib/bank";
import { fromLlm, subtopicPrompt } from "@/modules/quiz/lib/prompts";
import { flaggedQuestionIds } from "@/modules/quiz/services/question-flags";
import { llmQuizSchema, toPublic, toReview, type Difficulty, type PublicQuestion, type QuestionFocus, type QuizOutcome, type QuizQuestion } from "@/modules/quiz/lib/question";
import { loadQuestionHistory, type AskedQuestion } from "@/modules/quiz/services/question-history";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export type PracticeScope = "subtopic" | "topic" | "case" | "mistakes" | "custom";

/** Questions in a mistakes review run. */
export const MISTAKES_QUIZ_SIZE = 10;
const MISTAKES_REF = /^mistakes(?::([a-z]+))?$/;

export interface PracticeTarget {
  scope: PracticeScope;
  ref: string;
  title: string;
  topicId: string;
  topicTitle: string;
  track: string;
  subtopicIds: string[];
  /** Cases only: the case page this quiz belongs to. */
  href?: string;
}

/** The ref every custom quiz attempt carries; what it drew from is in the attempt's `refs`. */
export const CUSTOM_REF = "custom";
export const CUSTOM_SIZES = [5, 10, 15, 20] as const;
export const CUSTOM_MAX_REFS = 60;

export function resolvePracticeTarget(ref: string): PracticeTarget | null {
  if (ref === CUSTOM_REF) return { scope: "custom", ref, title: "Custom quiz", topicId: "", topicTitle: "Your topics", track: "", subtopicIds: [], href: "/practice/quiz" };
  const mistakes = MISTAKES_REF.exec(ref);
  if (mistakes) {
    const track = mistakes[1];
    if (track && !trackById.has(track) && track !== "case") return null;
    const label = track ? (track === "case" ? "Case quizzes" : trackById.get(track)!.name) : "Everything";
    return { scope: "mistakes", ref, title: `Fix your mistakes: ${label}`, topicId: "", topicTitle: "Mistakes", track: track ?? "", subtopicIds: [], href: "/quiz/mistakes" };
  }
  const kase = parseCaseRef(ref);
  if (kase) {
    const title = caseTitle(ref);
    if (!title || caseQuestions(ref).length === 0) return null;
    const topicId = kase.kind === "hld" ? designCaseBySlug.get(kase.slug)!.topicId : practiceCaseBySlug.get(`${kase.kind}:${kase.slug}`)!.topicId;
    return { scope: "case", ref, title, topicId, topicTitle: title, track: kase.kind, subtopicIds: [], href: casePath(kase.kind, kase.slug) };
  }
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

/** Questions of the chosen type; the whole list when "any", or when fewer than 2 match (a thin subtopic still gets a quiz). */
export function focusOf(qs: QuizQuestion[], focus: QuestionFocus | undefined): QuizQuestion[] {
  if (!focus || focus === "any") return qs;
  const match = qs.filter((q) => (focus === "concept" ? q.style === "concept" || q.style === "llm" : q.style === focus));
  return match.length >= 2 ? match : qs;
}

interface PickContext {
  rng: Rng;
  history: QuestionHistory;
  now: number;
  difficulty: Difficulty | null;
  /** Questions you reported: weight 0, so they are never drawn. */
  flagged: ReadonlySet<string>;
}

/** Bank weight × rotation: unseen and previously-missed questions come first on repeat runs. */
const weightIn = (ctx: PickContext) => (q: QuizQuestion) => (ctx.flagged.has(q.id) ? 0 : questionWeight(q) * rotationWeight(ctx.history.get(q.id), ctx.now));

function take(layers: QuizQuestion[][], n: number, ctx: PickContext): QuizQuestion[] {
  const used = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const layer of difficultyLayers(layers, ctx.difficulty)) {
    if (out.length >= n) break;
    for (const q of weightedSample(layer.filter((q) => !used.has(q.id)), weightIn(ctx), n - out.length, ctx.rng)) {
      used.add(q.id);
      out.push(q);
    }
  }
  return out;
}

async function subtopicQuestions(target: PracticeTarget, llm: LlmProvider | null, ctx: PickContext): Promise<QuizQuestion[]> {
  const own = [...(bank().bySubtopic.get(target.ref) ?? []), ...(await loadGenerated([target.ref]))];
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
  const siblingIds = subtopics.filter((s) => s.topicId === target.topicId && s.id !== target.ref).map((s) => s.id);
  const siblings = [...siblingIds.flatMap((id) => bank().bySubtopic.get(id) ?? []), ...(await loadGenerated(siblingIds))];
  return take([own.filter(real), own, siblings.filter(real), siblings], n, ctx);
}

async function topicQuestions(target: PracticeTarget, ctx: PickContext): Promise<QuizQuestion[]> {
  const masteries = await Mastery.find({ ref: { $in: target.subtopicIds } }, { ref: 1, score: 1 }).lean();
  const scores = Object.fromEntries(masteries.map((m) => [m.ref, m.score ?? 0]));
  const generated = await loadGenerated(target.subtopicIds);
  const bySubtopic = new Map(
    target.subtopicIds.map((id) => {
      const all = [...(bank().bySubtopic.get(id) ?? []), ...generated.filter((g) => g.source.ref === id)];
      const qs = all.filter(real).length >= 2 ? all.filter(real) : all;
      const matching = ctx.difficulty ? qs.filter((q) => q.difficulty === ctx.difficulty) : qs;
      return [id, matching.length >= 2 ? matching : qs];
    }),
  );
  const picked = pickTopicQuestions(bySubtopic, scores, TOPIC_QUIZ_SIZE, ctx.rng, weightIn(ctx));
  if (picked.length >= TOPIC_QUIZ_SIZE) return picked;
  const used = new Set(picked.map((q) => q.id));
  const fill = (bank().byTrack.get(target.track) ?? []).filter((q) => real(q) && !used.has(q.id));
  return [...picked, ...weightedSample(fill, weightIn(ctx), TOPIC_QUIZ_SIZE - picked.length, ctx.rng)];
}

/** The track a question belongs to, for filtering a mistakes run. */
function trackOfRef(ref: string): string {
  if (parseCaseRef(ref)) return "case";
  const sub = subtopicById.get(ref);
  if (sub) return sub.track;
  return bank().byPattern.has(ref) || problemBySlug.has(ref) ? "dsa" : "";
}

/** Questions whose latest answer was wrong, as they were asked, optionally limited to one track. */
export function mistakeCandidates(history: QuestionHistory, asked: ReadonlyMap<string, AskedQuestion>, track?: string): Array<AskedQuestion & { weight: number }> {
  return outstandingMistakes(history).flatMap(({ id, stat }) => {
    const q = asked.get(id);
    if (!q || (track && trackOfRef(q.ref) !== track)) return [];
    return [{ ...q, weight: mistakeWeight(stat) }];
  });
}

/** Where a question came from, in words: subtopic, case, or DSA pattern. */
function sourceLabel(ref: string): string {
  if (parseCaseRef(ref)) return caseTitle(ref) ?? "Case quiz";
  const sub = subtopicById.get(ref);
  if (sub) return `${sub.topicTitle}: ${sub.title}`;
  return problemBySlug.get(ref)?.title ?? ref;
}

export interface MistakesOverview {
  total: number;
  /** `track` is a syllabus track id, or `case` for case quizzes. */
  byTrack: Array<{ track: string; name: string; count: number }>;
  top: Array<{ id: string; prompt: string; where: string; ref: string; wrong: number; attempts: number }>;
}

export async function getMistakesOverview(limit = 15): Promise<MistakesOverview> {
  const { history, asked } = await loadQuestionHistory();
  const all = mistakeCandidates(history, asked);
  const counts = new Map<string, number>();
  for (const q of all) {
    const t = trackOfRef(q.ref);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return {
    total: all.length,
    byTrack: [...counts]
      .map(([track, count]) => ({ track, name: track === "case" ? "Case quizzes" : (trackById.get(track)?.name ?? track), count }))
      .sort((a, b) => b.count - a.count),
    top: all.slice(0, limit).map((q) => {
      const stat = history.get(q.id)!;
      return { id: q.id, prompt: q.prompt, where: sourceLabel(q.ref), ref: q.ref, wrong: stat.wrong, attempts: stat.attempts };
    }),
  };
}

export interface PracticeStart {
  attemptId: string;
  target: PracticeTarget;
  questions: PublicQuestion[];
}

export interface PracticeOptions {
  /** Prefer questions of this difficulty; unrated and other questions only fill a short run. */
  difficulty?: Difficulty | null;
}

type RunQuestion = Pick<QuizQuestion, "id" | "prompt" | "code" | "options" | "answerIndex" | "type" | "answerIndices" | "explanation"> & { source: { ref: string } };

/**
 * Create a practice run. Ungated for subtopics; the topic quiz needs every subtopic ticked.
 * Repeat runs rotate: questions you haven't seen or last got wrong are drawn first.
 */
export async function startPractice(ref: string, llm: LlmProvider | null = getLlm(), now = new Date(), opts: PracticeOptions = {}): Promise<PracticeStart> {
  await connectDb();
  const target = resolvePracticeTarget(ref);
  if (!target) throw new Error("Unknown topic");
  if (target.scope === "topic" && !(await topicQuizEligibility(target)).eligible) {
    throw new Error("Tick every subtopic in this topic to unlock its quiz");
  }
  const { history, asked } = await loadQuestionHistory();
  const ctx: PickContext = { rng: seededRng(seedFrom(`${ref}:${now.getTime()}`)), history, now: now.getTime(), difficulty: opts.difficulty ?? null, flagged: await flaggedQuestionIds() };
  let questions: RunQuestion[];
  if (target.scope === "mistakes") {
    const pool = mistakeCandidates(history, asked, target.track || undefined);
    questions = weightedSample(pool, (q) => q.weight, MISTAKES_QUIZ_SIZE, ctx.rng).map((q) => ({ ...q, source: { ref: q.ref } }));
    if (questions.length === 0) throw new Error("No mistakes to review: every question you've missed has since been answered right");
  } else if (target.scope === "case") {
    const all = caseQuestions(ref);
    const matching = ctx.difficulty ? all.filter((q) => q.difficulty === ctx.difficulty) : all;
    questions = pickCaseQuestions(matching.length >= CASE_QUIZ_SIZE ? matching : all, CASE_QUIZ_SIZE, ctx.rng, weightIn(ctx));
  } else {
    questions = target.scope === "topic" ? await topicQuestions(target, ctx) : await subtopicQuestions(target, llm, ctx);
  }
  if (questions.length === 0) throw new Error("No questions for this topic yet");
  const attempt = await PracticeAttempt.create({
    scope: target.scope,
    ref,
    level: target.scope === "mistakes" ? null : (opts.difficulty ?? null),
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      code: q.code,
      options: q.options,
      answerIndex: q.answerIndex,
      ...(q.type && q.type !== "single" ? { type: q.type } : {}),
      ...(q.answerIndices ? { answerIndices: q.answerIndices } : {}),
      explanation: q.explanation,
      ref: q.source.ref,
    })),
  });
  return { attemptId: String(attempt._id), target, questions: questions.map(toPublic) };
}

export type CustomMode = "studied" | "picked" | "track";

export interface CustomPracticeInput {
  mode: CustomMode;
  /** `picked`: subtopic or topic ids you chose. */
  refs?: readonly string[];
  /** `track`: a syllabus track id. */
  track?: string;
  size: number;
  difficulty?: Difficulty | null;
  /** Prefer one question type (scenario, debugging...); other types only fill a short run. */
  focus?: QuestionFocus;
}

/** The subtopic ids a custom quiz may draw from. Pure given the studied set; unknown ids are dropped. */
export function customPool(input: CustomPracticeInput, studiedSubtopics: ReadonlySet<string>): string[] {
  if (input.mode === "studied") return [...studiedSubtopics];
  if (input.mode === "track") return subtopics.filter((s) => s.track === input.track).map((s) => s.id);
  const out = new Set<string>();
  for (const ref of input.refs ?? []) {
    if (subtopicById.has(ref)) out.add(ref);
    else if (topicById.has(ref)) for (const s of subtopics) if (s.topicId === ref) out.add(s.id);
  }
  return [...out];
}

/**
 * A quiz on topics you chose or have studied. Questions come from the bank (so it works with no LLM key), spread
 * across the subtopics and weighted toward the ones you know least. It updates mastery per subtopic like a topic
 * quiz does, and never touches the daily plan or the streak.
 */
export async function startCustomPractice(input: CustomPracticeInput, now = new Date()): Promise<PracticeStart> {
  await connectDb();
  if (!(CUSTOM_SIZES as readonly number[]).includes(input.size)) throw new Error("Pick 5, 10, 15 or 20 questions");
  if (input.mode === "track" && !(input.track && trackById.has(input.track))) throw new Error("Unknown subject");
  const studied = input.mode === "studied" ? (await getStudied()).subtopics : new Set<string>();
  if (input.mode === "studied" && studied.size === 0) throw new Error("Nothing studied yet: tick a subtopic or finish a course lesson first");
  const pool = customPool(input, studied).slice(0, CUSTOM_MAX_REFS);
  if (pool.length === 0) throw new Error("Pick at least one topic");

  const { history } = await loadQuestionHistory();
  const ctx: PickContext = { rng: seededRng(seedFrom(`custom:${now.getTime()}`)), history, now: now.getTime(), difficulty: input.difficulty ?? null, flagged: await flaggedQuestionIds() };
  const masteries = await Mastery.find({ ref: { $in: pool } }, { ref: 1, score: 1 }).lean();
  const scores = Object.fromEntries(masteries.map((m) => [m.ref, m.score ?? 0]));
  const bySubtopic = new Map(
    pool.flatMap((id) => {
      const all = bank().bySubtopic.get(id) ?? [];
      const qs = all.filter(real).length >= 2 ? all.filter(real) : all;
      const typed = focusOf(qs, input.focus);
      const matching = ctx.difficulty ? typed.filter((q) => q.difficulty === ctx.difficulty) : typed;
      const use = matching.length >= 2 ? matching : typed;
      return use.length > 0 ? [[id, use] as const] : [];
    }),
  );
  const questions = pickTopicQuestions(bySubtopic, scores, input.size, ctx.rng, weightIn(ctx));
  if (questions.length === 0) throw new Error("No questions for those topics yet");

  const target = resolvePracticeTarget(CUSTOM_REF)!;
  const attempt = await PracticeAttempt.create({
    scope: "custom",
    ref: CUSTOM_REF,
    refs: [...bySubtopic.keys()],
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      code: q.code,
      options: q.options,
      answerIndex: q.answerIndex,
      ...(q.type && q.type !== "single" ? { type: q.type } : {}),
      ...(q.answerIndices ? { answerIndices: q.answerIndices } : {}),
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

async function bumpMastery(ref: string, scope: Exclude<PracticeScope, "mistakes">, pct: number, masteredOn?: DateStr): Promise<MasteryState> {
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
  /** Null for mistakes runs, which don't feed mastery. */
  mastery: MasteryState | null;
  /** Mistakes runs only: how many missed questions are still waiting after this run. */
  remainingMistakes?: number;
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

  const score = scoreQuiz(questions.map(correctAnswerKey), answers);
  const claimed = await PracticeAttempt.updateOne(
    { _id: attempt._id, submittedAt: null },
    { $set: { answers: answers.map((a) => a ?? -1), pct: score.pct, submittedAt: now } },
  );
  if (claimed.modifiedCount === 0) throw new Error("Already submitted: start a new run");

  const s = await getSettings();
  const thresholdPct = s.topicMasteryPct;
  let mastery: MasteryState | null = null;
  let newlyMastered = false;
  let remainingMistakes: number | undefined;
  if (target.scope === "mistakes") {
    const { history, asked } = await loadQuestionHistory();
    remainingMistakes = mistakeCandidates(history, asked, target.track || undefined).length;
  } else if (target.scope === "topic") {
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
      if (isAnswerCorrect(q, answers[i])) g.right++;
      groups.set(q.ref, g);
    });
    for (const [ref, g] of groups) await bumpMastery(ref, "subtopic", Math.round((g.right / g.total) * 100));
  } else if (target.scope === "custom") {
    // Like a topic quiz, a custom quiz tells us how each subtopic it drew from is going. It has no single mastery.
    const groups = new Map<string, { right: number; total: number }>();
    questions.forEach((q, i) => {
      if (!subtopicById.has(q.ref)) return;
      const g = groups.get(q.ref) ?? { right: 0, total: 0 };
      g.total++;
      if (isAnswerCorrect(q, answers[i])) g.right++;
      groups.set(q.ref, g);
    });
    for (const [ref, g] of groups) await bumpMastery(ref, "subtopic", Math.round((g.right / g.total) * 100));
  } else {
    mastery = await bumpMastery(target.ref, target.scope, score.pct);
  }
  // Mistakes runs mix cases, so look each case question up by its own ref.
  const caseLearnMore = (q: { id: string; ref: string }) => {
    if (!parseCaseRef(q.ref)) return undefined;
    const found = caseQuestions(q.ref).find((c) => c.id === q.id);
    return found ? learnMoreFor(q.ref, found) : undefined;
  };

  return {
    outcome: {
      ...score,
      passed: target.scope === "topic" ? passesTopicQuiz(score.pct, thresholdPct) : score.pct >= s.quizPassPct,
      review: questions.map((q) => toReview({ id: q.id, subject: askSubjectForRef(q.ref), learnMore: caseLearnMore(q), answerIndex: q.answerIndex, ...(q.type ? { type: q.type } : {}), ...(q.answerIndices?.length ? { answerIndices: [...q.answerIndices] } : {}), explanation: q.explanation ?? "" })),
    },
    mastery,
    ...(remainingMistakes === undefined ? {} : { remainingMistakes }),
    newlyMastered,
    thresholdPct,
    target,
  };
}
