import { problemBySlug, subtopicById, subtopics, type SubtopicInfo } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, type DateStr } from "@/lib/domain/dates";
import type { DayKind } from "@/lib/domain/planner";
import { isPassing, scoreQuiz } from "@/lib/domain/quiz";
import { seededRng, seedFrom, shuffle, weightedSample, type Rng } from "@/lib/domain/sampling";
import { getLlm, type LlmProvider } from "@/lib/llm";
import { DailyPlan, Quiz } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Article } from "@/lib/models/system";
import { bank, questionWeight } from "@/lib/quiz/bank";
import { dailyQuizPrompt, fromLlm } from "@/lib/quiz/prompts";
import {
  llmQuizSchema,
  toPublic,
  toReview,
  type PublicQuestion,
  type QuizOutcome,
  type QuizQuestion,
} from "@/lib/quiz/question";
import { recomputeDay, type DayState } from "./day";
import { ensureToday, todayIn } from "./plan";
import { getSettings } from "./settings";

export type QuizKind = "daily" | "weekly";

export const DAILY_SIZE = 10;
export const WEEKLY_REVIEW_SIZE = 25;
export const WEEKLY_NEW_SIZE = 5;

export function quizKindFor(kind: DayKind): QuizKind | null {
  if (kind === "sunday") return "weekly";
  if (kind === "study" || kind === "revision") return "daily";
  return null;
}

// ---------------------------------------------------------------------------
// Picking questions from the bank

/** Take up to `n` unused questions, walking the layers in order (most relevant first). */
function takeLayered(layers: QuizQuestion[][], n: number, used: Set<string>, rng: Rng): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const layer of layers) {
    if (out.length >= n) break;
    const fresh = layer.filter((q) => !used.has(q.id));
    for (const q of weightedSample(fresh, questionWeight, n - out.length, rng)) {
      used.add(q.id);
      out.push(q);
    }
  }
  return out;
}

const forSubtopics = (ids: Iterable<string>) => [...new Set(ids)].flatMap((id) => bank().bySubtopic.get(id) ?? []);
const forPatterns = (patterns: Iterable<string>) => [...new Set(patterns)].flatMap((p) => bank().byPattern.get(p) ?? []);
const studiedBy = (week: number) => subtopics.filter((s) => s.week <= week);

interface DailyContext {
  date: DateStr;
  weekNumber: number;
  solved: Array<{ slug: string; title: string; pattern: string; track: string; approach?: string }>;
  plannedSlugs: string[];
  subtopics: SubtopicInfo[];
  plannedSubtopics: SubtopicInfo[];
  articles: Array<{ title: string }>;
}

async function loadDailyContext(date: DateStr): Promise<DailyContext> {
  const [plan, solvedRows, subRows, articles] = await Promise.all([
    DailyPlan.findOne({ date }).lean(),
    ProblemProgress.find({ solveDates: date }, { slug: 1, approach: 1 }).lean(),
    SubtopicProgress.find({ doneOn: date }, { subtopicId: 1 }).lean(),
    Article.find({ readOn: date }, { title: 1 }).limit(5).lean(),
  ]);
  const solved = solvedRows.flatMap((r) => {
    const p = problemBySlug.get(r.slug);
    return p ? [{ slug: p.slug, title: p.title, pattern: p.pattern, track: p.track, approach: r.approach ?? undefined }] : [];
  });
  const lookup = (ids: string[]) => ids.flatMap((id) => subtopicById.get(id) ?? []);
  return {
    date,
    weekNumber: plan?.weekNumber ?? 1,
    solved,
    plannedSlugs: [...(plan?.dsaNew ?? []), ...(plan?.dsaReview ?? []), plan?.jsProblem, plan?.sqlProblem].filter((s): s is string => !!s),
    subtopics: lookup(subRows.map((r) => r.subtopicId)),
    plannedSubtopics: lookup(plan?.theory ?? []),
    articles: articles.map((a) => ({ title: a.title })),
  };
}

const isJsDay = (ctx: DailyContext) => ctx.subtopics.some((s) => s.track === "js") || ctx.solved.some((p) => p.track === "js");

/** Verified output-prediction questions for JS-track days. */
function outputQuestions(ctx: DailyContext, n: number, used: Set<string>, rng: Rng): QuizQuestion[] {
  const isOutput = (q: QuizQuestion) => q.style === "output";
  const today = forSubtopics(ctx.subtopics.map((s) => s.id)).filter(isOutput);
  const studied = forSubtopics(studiedBy(ctx.weekNumber).filter((s) => s.track === "js").map((s) => s.id)).filter(isOutput);
  return takeLayered([today, studied], n, used, rng);
}

/** ARCHITECTURE §8 fallback: 4 DSA + 4 theory + 2 reading/AI, from what was done today. */
export function pickDailyFromBank(ctx: DailyContext, rng: Rng): QuizQuestion[] {
  const used = new Set<string>();
  const solvedPatterns = ctx.solved.map((p) => p.pattern);
  const plannedPatterns = ctx.plannedSlugs.flatMap((s) => problemBySlug.get(s)?.pattern ?? []);
  const dsa = takeLayered([forPatterns(solvedPatterns), forPatterns(plannedPatterns), forPatterns(bank().byPattern.keys())], 4, used, rng);

  const reading = ctx.articles.length
    ? takeLayered([(bank().byTrack.get("ai") ?? []).filter((q) => q.style !== "recall")], 2, used, rng)
    : [];

  const output = isJsDay(ctx) ? outputQuestions(ctx, 2, used, rng) : [];
  const theoryNeeded = DAILY_SIZE - dsa.length - reading.length - output.length;
  const todayIds = ctx.subtopics.map((s) => s.id);
  const siblingIds = subtopics.filter((s) => ctx.subtopics.some((t) => t.topicId === s.topicId)).map((s) => s.id);
  const studied = studiedBy(ctx.weekNumber).map((s) => s.id);
  const theory = takeLayered(
    [forSubtopics(todayIds), forSubtopics(ctx.plannedSubtopics.map((s) => s.id)), forSubtopics(siblingIds), forSubtopics(studied)],
    theoryNeeded,
    used,
    rng,
  );

  const picked = [...dsa, ...output, ...theory, ...reading];
  if (picked.length < DAILY_SIZE) picked.push(...takeLayered([bank().all], DAILY_SIZE - picked.length, used, rng));
  return shuffle(picked, rng);
}

async function generateDailyWithLlm(ctx: DailyContext, llm: LlmProvider, rng: Rng): Promise<QuizQuestion[]> {
  const used = new Set<string>();
  const output = isJsDay(ctx) ? outputQuestions(ctx, 2, used, rng) : [];
  const articles = ctx.articles.length ? 2 : 0;
  const theory = 4 - output.length;
  const dsa = DAILY_SIZE - output.length - articles - theory;
  const total = dsa + theory + articles;

  const res = await llm.generateJson(
    dailyQuizPrompt(
      {
        solved: ctx.solved.length ? ctx.solved : ctx.plannedSlugs.flatMap((s) => problemBySlug.get(s) ?? []).slice(0, 4),
        subtopics: ctx.subtopics.length ? ctx.subtopics : ctx.plannedSubtopics,
        articles: ctx.articles,
      },
      { dsa, theory, articles },
    ),
    llmQuizSchema(total, total + 2),
  );

  const generated = res.questions.slice(0, total).map((q, i) => {
    const id = `l-${ctx.date}-${i}`;
    if (q.kind === "problem" && problemBySlug.has(q.ref)) return fromLlm(q, id, { kind: "problem", ref: q.ref });
    if (q.kind === "subtopic" && subtopicById.has(q.ref)) return fromLlm(q, id, { kind: "subtopic", ref: q.ref });
    return fromLlm(q, id, { kind: "article", ref: "" });
  });
  return shuffle([...generated, ...output], rng);
}

async function buildDaily(date: DateStr, llm: LlmProvider | null): Promise<{ questions: QuizQuestion[]; generatedBy: "llm" | "bank" }> {
  const ctx = await loadDailyContext(date);
  const rng = seededRng(seedFrom(`daily:${date}`));
  if (llm) {
    try {
      return { questions: await generateDailyWithLlm(ctx, llm, rng), generatedBy: "llm" };
    } catch (err) {
      console.warn(`[quiz] LLM generation failed, using the bank: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { questions: pickDailyFromBank(ctx, rng), generatedBy: "bank" };
}

/** Sunday: 25 questions from this week's daily quizzes (wrong answers weighted 3×) plus 5 new ones. */
async function buildWeekly(date: DateStr): Promise<{ questions: QuizQuestion[]; generatedBy: "bank" }> {
  const from = addDays(date, -6);
  const to = addDays(date, -1);
  const rng = seededRng(seedFrom(`weekly:${date}`));
  const [dailies, plan, weekSubs, weekSolves] = await Promise.all([
    Quiz.find({ kind: "daily", date: { $gte: from, $lte: to } }).lean(),
    DailyPlan.findOne({ date }).lean(),
    SubtopicProgress.find({ doneOn: { $gte: from, $lte: to } }, { subtopicId: 1 }).lean(),
    ProblemProgress.find({ solveDates: { $gte: from, $lte: to } }, { slug: 1 }).lean(),
  ]);

  const pool = new Map<string, { q: QuizQuestion; weight: number }>();
  for (const quiz of dailies) {
    const last = quiz.attempts?.at(-1);
    (quiz.questions as QuizQuestion[]).forEach((q, i) => {
      const weight = !last ? 2 : last.answers?.[i] === q.answerIndex ? 1 : 3;
      const prev = pool.get(q.id);
      if (!prev || prev.weight < weight) pool.set(q.id, { q: toPlain(q), weight });
    });
  }
  const review = weightedSample([...pool.values()], (x) => x.weight, WEEKLY_REVIEW_SIZE, rng).map((x) => x.q);
  const used = new Set(review.map((q) => q.id));

  const week = plan?.weekNumber ?? 1;
  const weekTopicSubs = subtopics.filter((s) => s.week === week).map((s) => s.id);
  const patterns = weekSolves.flatMap((r) => problemBySlug.get(r.slug)?.pattern ?? []);
  const layers = [
    forSubtopics([...weekSubs.map((s) => s.subtopicId), ...weekTopicSubs]),
    forPatterns(patterns),
    forSubtopics(studiedBy(week).map((s) => s.id)),
    bank().all,
  ];
  const fresh = takeLayered(layers, WEEKLY_NEW_SIZE + (WEEKLY_REVIEW_SIZE - review.length), used, rng);
  return { questions: shuffle([...review, ...fresh], rng), generatedBy: "bank" };
}

/** Lean docs carry Mongoose extras; keep only the stored question fields. */
function toPlain(q: QuizQuestion): QuizQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    ...(q.code ? { code: q.code } : {}),
    options: [...q.options],
    answerIndex: q.answerIndex,
    explanation: q.explanation ?? "",
    source: { kind: q.source?.kind ?? "article", ref: q.source?.ref ?? "" },
    style: q.style ?? "llm",
  };
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/** Stored once per (date, kind) and never regenerated (ARCHITECTURE §8). */
export async function getOrCreateQuiz(date: DateStr, kind: QuizKind, llm: LlmProvider | null = getLlm()) {
  await connectDb();
  const existing = await Quiz.findOne({ date, kind }).lean();
  if (existing) return existing;
  const built = kind === "weekly" ? await buildWeekly(date) : await buildDaily(date, llm);
  try {
    await Quiz.create({ date, kind, generatedBy: built.generatedBy, questions: built.questions });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
  return (await Quiz.findOne({ date, kind }).lean())!;
}

// ---------------------------------------------------------------------------
// Page state, submit, history

export interface AttemptSummary {
  correct: number;
  total: number;
  pct: number;
  submittedAt: string;
}

export interface QuizSnapshot {
  date: DateStr;
  kind: QuizKind;
  generatedBy: "llm" | "bank";
  questions: PublicQuestion[];
  bestPct: number;
  passed: boolean;
  attempts: AttemptSummary[];
  /** The latest attempt with answer keys, so results survive a reload. */
  last: (QuizOutcome & { answers: Array<number | null> }) | null;
}

type QuizLean = NonNullable<Awaited<ReturnType<typeof getOrCreateQuiz>>>;

function snapshot(doc: QuizLean, passPct: number): QuizSnapshot {
  const questions = (doc.questions as QuizQuestion[]).map(toPlain);
  const attempts = (doc.attempts ?? []).map((a) => ({
    correct: a.correct ?? 0,
    total: questions.length,
    pct: a.pct ?? 0,
    submittedAt: (a.submittedAt ?? new Date()).toISOString(),
  }));
  const lastRaw = doc.attempts?.at(-1);
  const answers = lastRaw ? (lastRaw.answers ?? []).map((a) => (a < 0 ? null : a)) : null;
  return {
    date: doc.date,
    kind: doc.kind as QuizKind,
    generatedBy: doc.generatedBy as "llm" | "bank",
    questions: questions.map(toPublic),
    bestPct: doc.bestPct ?? 0,
    passed: !!doc.passed,
    attempts,
    last:
      lastRaw && answers
        ? {
            correct: lastRaw.correct ?? 0,
            total: questions.length,
            pct: lastRaw.pct ?? 0,
            passed: (lastRaw.pct ?? 0) >= passPct,
            review: questions.map(toReview),
            answers,
          }
        : null,
  };
}

export interface QuizPageState {
  today: DateStr;
  kind: QuizKind | null;
  day: DayState;
  passPct: number;
  quiz: QuizSnapshot | null;
}

export async function getQuizPage(now = new Date()): Promise<QuizPageState> {
  const t = await ensureToday(now);
  const kind = quizKindFor(t.plan.kind);
  const doc = kind ? await Quiz.findOne({ date: t.today, kind }).lean() : null;
  return { today: t.today, kind, day: t.day, passPct: t.settings.quizPassPct, quiz: doc ? snapshot(doc, t.settings.quizPassPct) : null };
}

export async function startQuiz(now = new Date(), llm: LlmProvider | null = getLlm()): Promise<QuizSnapshot> {
  const t = await ensureToday(now);
  const kind = quizKindFor(t.plan.kind);
  if (!kind) throw new Error("No quiz today: it's a rest day or outside the plan");
  if (!t.day.quizUnlocked) throw new Error("Solve at least 1 problem and check 1 subtopic to unlock the quiz");
  return snapshot(await getOrCreateQuiz(t.today, kind, llm), t.settings.quizPassPct);
}

export interface SubmitResult {
  outcome: QuizOutcome;
  bestPct: number;
  everPassed: boolean;
  justCompleted: boolean;
}

/** Grade server-side; unanswered (null) counts as wrong. Only today's quiz can be submitted. */
export async function submitQuiz(
  input: { date: DateStr; kind: QuizKind; answers: Array<number | null> },
  now = new Date(),
): Promise<SubmitResult> {
  await connectDb();
  const s = await getSettings();
  if (input.date !== todayIn(s, now)) throw new Error("This quiz has closed: only today's quiz counts");
  const doc = await Quiz.findOne({ date: input.date, kind: input.kind }).lean();
  if (!doc) throw new Error("Start the quiz first");
  const questions = (doc.questions as QuizQuestion[]).map(toPlain);
  if (input.answers.length !== questions.length) throw new Error("Answer count doesn't match the quiz");

  const score = scoreQuiz(questions.map((q) => q.answerIndex), input.answers);
  const passed = isPassing(score, s.quizPassPct);
  await Quiz.updateOne(
    { _id: doc._id },
    {
      $push: { attempts: { answers: input.answers.map((a) => a ?? -1), correct: score.correct, pct: score.pct, submittedAt: now } },
      $max: { bestPct: score.pct },
      ...(passed ? { $set: { passed: true } } : {}),
    },
  );
  const { justCompleted } = await recomputeDay(input.date);
  return {
    outcome: { ...score, passed, review: questions.map(toReview) },
    bestPct: Math.max(doc.bestPct ?? 0, score.pct),
    everPassed: passed || !!doc.passed,
    justCompleted,
  };
}

export interface QuizHistoryRow {
  date: DateStr;
  kind: QuizKind;
  generatedBy: "llm" | "bank";
  questions: number;
  attempts: number;
  bestPct: number;
  lastPct: number | null;
  passed: boolean;
}

export async function listQuizHistory(limit = 90): Promise<QuizHistoryRow[]> {
  await connectDb();
  const docs = await Quiz.find({}, { date: 1, kind: 1, generatedBy: 1, bestPct: 1, passed: 1, attempts: 1, "questions.id": 1 })
    .sort({ date: -1, kind: 1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({
    date: d.date,
    kind: d.kind as QuizKind,
    generatedBy: d.generatedBy as "llm" | "bank",
    questions: d.questions?.length ?? 0,
    attempts: d.attempts?.length ?? 0,
    bestPct: d.bestPct ?? 0,
    lastPct: d.attempts?.at(-1)?.pct ?? null,
    passed: !!d.passed,
  }));
}

export interface QuizReview {
  date: DateStr;
  kind: QuizKind;
  pct: number;
  passed: boolean;
  items: Array<QuizQuestion & { chosen: number | null }>;
}

/** Full questions with answers, only once the quiz has been attempted. */
export async function getQuizReview(date: DateStr, kind: QuizKind): Promise<QuizReview | null> {
  await connectDb();
  const doc = await Quiz.findOne({ date, kind }).lean();
  const last = doc?.attempts?.at(-1);
  if (!doc || !last) return null;
  const questions = (doc.questions as QuizQuestion[]).map(toPlain);
  return {
    date: doc.date,
    kind,
    pct: last.pct ?? 0,
    passed: !!doc.passed,
    items: questions.map((q, i) => {
      const a = last.answers?.[i];
      return { ...q, chosen: a === undefined || a < 0 ? null : a };
    }),
  };
}
