import { Types } from "mongoose";
import { problems, systemDesign, testcaseBySlug } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, type DateStr } from "@/lib/domain/dates";
import type { BankPrompt } from "@/lib/domain/mock-bank";
import {
  GRADE_PROMPT_VERSION,
  MOCK_CONFIG,
  RUBRIC_MAX,
  aiPromptsSchema,
  buildSession,
  canStillSave,
  deadlineOf,
  gradePrompt,
  gradeSchema,
  isBlank,
  WEEKLY_SLOT_TYPES,
  mondayOf,
  mulberry32,
  normaliseGrade,
  weekdayIn,
  questionsPrompt,
  scoreSession,
  type CodingCandidate,
  type MockRound,
  type MockType,
  type QuestionAnswer,
  type SessionScore,
  type WrittenQuestion,
} from "@/lib/domain/mock";
import { env } from "@/lib/env";
import { resolveProviders } from "@/lib/llm/providers";
import { CustomProblem } from "@/lib/models/content";
import { MockSession } from "@/lib/models/mock";
import { bank } from "@/lib/quiz/bank";
import { runAi } from "./ai";
import { cachedAi } from "./ai-cache";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export type MockStatus = "in_progress" | "submitted" | "graded";
export type ProblemSource = "sheet" | "custom" | "mixed";

export interface MockSummary {
  id: string;
  type: MockType;
  date: DateStr;
  status: MockStatus;
  totalScore: number | null;
  durationMin: number;
  deadlineAt: string;
}

export interface MockDetail extends MockSummary {
  startedAt: string;
  submittedAt: string | null;
  autoSubmitted: boolean;
  rounds: MockRound[];
  answers: Record<string, QuestionAnswer>;
  score: SessionScore;
}

type Lean = {
  _id: Types.ObjectId;
  type: string;
  date: string;
  status: string;
  totalScore?: number | null;
  durationMin: number;
  deadlineAt: Date;
  startedAt: Date;
  submittedAt?: Date | null;
  autoSubmitted?: boolean | null;
  rounds?: unknown[];
  answers?: unknown;
};

const summary = (d: Lean): MockSummary => ({
  id: String(d._id),
  type: d.type as MockType,
  date: d.date,
  status: d.status as MockStatus,
  totalScore: d.totalScore ?? null,
  durationMin: d.durationMin,
  deadlineAt: d.deadlineAt.toISOString(),
});

const QID_RE = /^[a-z0-9-]{1,120}$/i;

/** Close any session whose time ran out while nobody was looking (tab closed, laptop asleep). */
async function settleExpired(now: Date): Promise<void> {
  const expired = await MockSession.find({ status: "in_progress", deadlineAt: { $lt: new Date(now.getTime() - 60_000) } }).lean();
  for (const d of expired) await finish(d as unknown as Lean, now, true);
}

async function finish(d: Lean, now: Date, auto: boolean): Promise<void> {
  const rounds = (d.rounds ?? []) as MockRound[];
  const answers = (d.answers ?? {}) as Record<string, QuestionAnswer>;
  const score = scoreSession(rounds, answers);
  await MockSession.updateOne(
    { _id: d._id, status: "in_progress" },
    {
      $set: {
        status: score.pending === 0 ? "graded" : "submitted",
        submittedAt: now < d.deadlineAt ? now : d.deadlineAt,
        autoSubmitted: auto,
        totalScore: score.total,
        roundScores: score.rounds.map((r) => ({ topic: r.topic, score: r.score })),
      },
    },
  );
}

export async function listMocks(limit = 50): Promise<MockSummary[]> {
  await connectDb();
  await settleExpired(new Date());
  const rows = await MockSession.find({}, { rounds: 0, answers: 0 }).sort({ startedAt: -1 }).limit(limit).lean();
  return rows.map((r) => summary(r as unknown as Lean));
}

export async function activeMock(): Promise<MockSummary | null> {
  await connectDb();
  await settleExpired(new Date());
  const d = await MockSession.findOne({ status: "in_progress" }, { rounds: 0, answers: 0 }).lean();
  return d ? summary(d as unknown as Lean) : null;
}

export async function getMock(id: string, now = new Date()): Promise<MockDetail | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDb();
  let d = (await MockSession.findById(id).lean()) as unknown as Lean | null;
  if (!d) return null;
  if (d.status === "in_progress" && !canStillSave(d.deadlineAt, now)) {
    await finish(d, now, true);
    d = (await MockSession.findById(id).lean()) as unknown as Lean;
  }
  const rounds = (d.rounds ?? []) as MockRound[];
  const answers = (d.answers ?? {}) as Record<string, QuestionAnswer>;
  return {
    ...summary(d),
    startedAt: d.startedAt.toISOString(),
    submittedAt: d.submittedAt?.toISOString() ?? null,
    autoSubmitted: !!d.autoSubmitted,
    rounds,
    answers,
    score: scoreSession(rounds, answers),
  };
}

async function codingPool(source: ProblemSource): Promise<CodingCandidate[]> {
  const sheet: CodingCandidate[] =
    source === "custom" ? [] : problems.filter((p) => p.track === "main" && testcaseBySlug.has(p.slug)).map((p) => ({ source: "sheet", slug: p.slug, title: p.title, difficulty: p.difficulty }));
  const custom: CodingCandidate[] =
    source === "sheet"
      ? []
      : (await CustomProblem.find({}, { slug: 1, title: 1, difficulty: 1 }).lean()).map((p) => ({
          source: "custom",
          slug: p.slug,
          title: p.title,
          difficulty: p.difficulty as CodingCandidate["difficulty"],
        }));
  const pool = [...sheet, ...custom];
  const recent = await MockSession.find({}, { rounds: 1 }).sort({ startedAt: -1 }).limit(8).lean();
  const used = new Set(
    recent.flatMap((s) => ((s.rounds ?? []) as MockRound[]).flatMap((r) => r.questions.flatMap((q) => (q.kind === "coding" ? [`${q.source}:${q.slug}`] : [])))),
  );
  const fresh = pool.filter((p) => !used.has(`${p.source}:${p.slug}`));
  return fresh.length >= 4 ? fresh : pool;
}

function jsOutputQuestions() {
  return (bank().byTrack.get("js") ?? [])
    .filter((q) => q.style === "output" && q.code && q.options.length >= 2)
    .map((q) => ({ id: q.id, prompt: q.prompt, code: q.code ?? undefined, options: q.options, answerIndex: q.answerIndex, explanation: q.explanation }));
}

function designCandidates() {
  return systemDesign.cases.map((c) => ({
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    functional: c.functional,
    nonFunctional: c.nonFunctional,
    points: [...c.deepDives.map((d) => d.title), ...c.tradeoffs.slice(0, 3)],
  }));
}

/** Whether any free provider is set; mocks never use the paid one. */
export function freeAiConfigured(): boolean {
  return resolveProviders(env()).some((d) => !d.paid);
}

type AiTopic = "node" | "lld" | "project" | "behavioral";

/** Fresh questions from the free AI chain; any failure just means the static bank is used. */
async function aiPrompts(topic: AiTopic, count: number, project?: string): Promise<BankPrompt[]> {
  const res = await runAi("generate-questions", {}, (llm) => llm.generateJson(questionsPrompt(topic, count, project), aiPromptsSchema));
  if (!res.ok) return [];
  return res.data.questions.slice(0, count).map((q, i) => ({ id: `ai${i}`, prompt: q.prompt, points: q.points }));
}

export interface StartOptions {
  type: MockType;
  source: ProblemSource;
  aiQuestions: boolean;
  project?: string;
}

export async function startMock(opts: StartOptions, now = new Date()): Promise<{ ok: true; id: string } | { ok: false; error: string; resumeId?: string }> {
  await connectDb();
  await settleExpired(now);
  const running = await MockSession.findOne({ status: "in_progress" }, { _id: 1 }).lean();
  if (running) return { ok: false, error: "You have a mock in progress. Finish or submit it first.", resumeId: String(running._id) };

  const config = MOCK_CONFIG[opts.type];
  const topics = new Set(config.rounds.map((r) => r.topic));
  const prompts: Partial<Record<AiTopic, BankPrompt[]>> = {};
  for (const r of config.rounds) {
    const t = r.topic;
    if ((t === "node" || t === "lld" || t === "project" || t === "behavioral") && r.written && (opts.aiQuestions || (t === "project" && opts.project))) {
      prompts[t] = await aiPrompts(t, r.written, t === "project" ? opts.project : undefined);
    }
  }

  const built = buildSession({
    type: opts.type,
    rng: mulberry32(now.getTime() ^ Math.floor(Math.random() * 2 ** 31)),
    coding: topics.has("dsa") ? await codingPool(opts.source) : [],
    mcqs: topics.has("javascript") ? jsOutputQuestions() : [],
    designs: designCandidates(),
    designSteps: systemDesign.framework.steps,
    designRubric: systemDesign.framework.rubric,
    prompts,
  });
  if (!built.ok) return built;

  const settings = await getSettings();
  const doc = await MockSession.create({
    type: opts.type,
    date: todayIn(settings, now),
    startedAt: now,
    durationMin: config.minutes,
    deadlineAt: deadlineOf(now, config.minutes),
    rounds: built.rounds,
    answers: {},
  });
  return { ok: true, id: String(doc._id) };
}

function findQuestion(rounds: MockRound[], qid: string) {
  for (const r of rounds) for (const q of r.questions) if (q.id === qid) return q;
  return undefined;
}

/** Autosave of one answer. Rejected once the session is over (after a short grace for clock drift). */
export async function saveMockAnswer(id: string, qid: string, patch: QuestionAnswer, now = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Types.ObjectId.isValid(id) || !QID_RE.test(qid)) return { ok: false, error: "Unknown question" };
  await connectDb();
  const d = await MockSession.findById(id, { status: 1, deadlineAt: 1, rounds: 1 }).lean();
  if (!d || d.status !== "in_progress") return { ok: false, error: "This mock is already submitted" };
  if (!canStillSave(d.deadlineAt, now)) return { ok: false, error: "Time is up" };
  const q = findQuestion(d.rounds as MockRound[], qid);
  if (!q) return { ok: false, error: "Unknown question" };
  const allowed: Array<keyof QuestionAnswer> = q.kind === "coding" ? ["code", "language", "passed", "total", "accepted", "msSpent", "hintsUsed"] : q.kind === "mcq" ? ["choice"] : ["sections"];
  const set: Record<string, unknown> = {};
  for (const k of allowed) if (patch[k] !== undefined) set[`answers.${qid}.${k}`] = patch[k];
  if (Object.keys(set).length) await MockSession.updateOne({ _id: id, status: "in_progress" }, { $set: set });
  return { ok: true };
}

export async function submitMock(id: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Unknown mock" };
  await connectDb();
  const d = (await MockSession.findById(id).lean()) as unknown as Lean | null;
  if (!d) return { ok: false, error: "Unknown mock" };
  if (d.status === "in_progress") await finish(d, now, now > d.deadlineAt);
  return { ok: true };
}

async function rescore(id: string): Promise<void> {
  const d = await MockSession.findById(id, { rounds: 1, answers: 1, status: 1 }).lean();
  if (!d || d.status === "in_progress") return;
  const score = scoreSession(d.rounds as MockRound[], (d.answers ?? {}) as Record<string, QuestionAnswer>);
  await MockSession.updateOne(
    { _id: id },
    { $set: { status: score.pending === 0 ? "graded" : "submitted", totalScore: score.total, roundScores: score.rounds.map((r) => ({ topic: r.topic, score: r.score })) } },
  );
}

export type GradeResult = { ok: true; graded: number; remaining: number } | { ok: false; error: string; unavailable?: true };

/**
 * Grade every written answer still waiting, with the free AI chain (never the paid provider). Each grade
 * is validated, matched to the question's rubric and cached, so re-grading the same answer is free.
 */
export async function gradeMock(id: string): Promise<GradeResult> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Unknown mock" };
  await connectDb();
  const d = await MockSession.findById(id, { rounds: 1, answers: 1, status: 1 }).lean();
  if (!d) return { ok: false, error: "Unknown mock" };
  if (d.status === "in_progress") return { ok: false, error: "Submit the mock first" };
  const answers = (d.answers ?? {}) as Record<string, QuestionAnswer>;
  const pending = (d.rounds as MockRound[]).flatMap((r) => r.questions).filter((q): q is WrittenQuestion => q.kind === "written" && !isBlank(answers[q.id]) && !answers[q.id]?.scores?.length);
  let graded = 0;
  for (const q of pending) {
    const a = answers[q.id]!;
    const res = await runAi("mock-grade", {}, async (llm) => {
      const out = await cachedAi(
        { feature: "mock-grade", version: GRADE_PROMPT_VERSION, input: JSON.stringify([q.id, q.prompt, q.criteria.map((c) => c.id), a.sections]), ttlDays: 30, schema: gradeSchema, timeZone: env().APP_TIMEZONE },
        async () => {
          const raw = await llm.generateJson(gradePrompt(q, a), gradeSchema);
          if (!normaliseGrade(q, raw)) throw new Error("The grader skipped a rubric item");
          return { value: raw, provider: llm.lastProvider };
        },
      );
      return out.value;
    });
    if (!res.ok) {
      await rescore(id);
      return res.unavailable ? { ok: false, error: res.error, unavailable: true } : { ok: false, error: res.error };
    }
    const scores = normaliseGrade(q, res.data);
    if (!scores) continue;
    await MockSession.updateOne({ _id: id }, { $set: { [`answers.${q.id}.scores`]: scores, [`answers.${q.id}.gradedBy`]: "ai", [`answers.${q.id}.summary`]: res.data.summary.trim() } });
    graded++;
  }
  await rescore(id);
  return { ok: true, graded, remaining: pending.length - graded };
}

/** Self-review: your own 0–4 per rubric item, used when no AI is available or to override its grade. */
export async function selfGradeMock(id: string, qid: string, scores: Record<string, number>): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Types.ObjectId.isValid(id) || !QID_RE.test(qid)) return { ok: false, error: "Unknown question" };
  await connectDb();
  const d = await MockSession.findById(id, { rounds: 1, status: 1 }).lean();
  if (!d || d.status === "in_progress") return { ok: false, error: "Submit the mock first" };
  const q = findQuestion(d.rounds as MockRound[], qid);
  if (!q || q.kind !== "written") return { ok: false, error: "Unknown question" };
  const list = q.criteria.map((c) => ({ criterion: c.id, score: Math.min(RUBRIC_MAX, Math.max(0, Math.round(scores[c.id] ?? 0))), feedback: "" }));
  await MockSession.updateOne({ _id: id }, { $set: { [`answers.${qid}.scores`]: list, [`answers.${qid}.gradedBy`]: "self" }, $unset: { [`answers.${qid}.summary`]: "" } });
  await rescore(id);
  return { ok: true };
}

export async function deleteMock(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDb();
  await MockSession.deleteOne({ _id: id });
}

export interface WeeklyMockSlot {
  kind: "dsa" | "hld";
  label: string;
  date: DateStr;
  done: boolean;
  /** The finished session that counts for this slot, if any. */
  sessionId?: string;
  score?: number | null;
}

/** This week's scheduled DSA and System Design mocks, done once any matching mock was submitted this week. Never gates the streak. */
export async function weeklyMocks(today: DateStr, schedule: { dsaWeekday: number; hldWeekday: number }): Promise<WeeklyMockSlot[]> {
  await connectDb();
  const from = mondayOf(today);
  const rows = await MockSession.find({ date: { $gte: from, $lte: addDays(from, 6) }, status: { $ne: "in_progress" } }, { type: 1, totalScore: 1, startedAt: 1 })
    .sort({ startedAt: -1 })
    .lean();
  const slot = (kind: WeeklyMockSlot["kind"], label: string, weekday: number): WeeklyMockSlot => {
    const hit = rows.find((r) => WEEKLY_SLOT_TYPES[kind].includes(r.type as MockType));
    return { kind, label, date: weekdayIn(today, weekday), done: !!hit, ...(hit ? { sessionId: String(hit._id), score: hit.totalScore ?? null } : {}) };
  };
  return [slot("dsa", "DSA mock", schedule.dsaWeekday), slot("hld", "System design mock", schedule.hldWeekday)];
}
