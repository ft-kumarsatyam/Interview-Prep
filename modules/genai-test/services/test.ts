import { Types } from "mongoose";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { env } from "@/core/env";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { genaiTestWeekMap, levelTopics, roadmapNodeKeys, ROADMAP_ID, testPool, weekLevels } from "@/core/genai-test";
import { GenaiTestAttempt } from "@/core/models/genai-test";
import { GenaiStudyProgress } from "@/core/models/genai-study";
import { RoadmapNodeProgress } from "@/core/models/roadmap";
import { focusDate, weekForDate } from "@/modules/genai-playbook/domain/playbook";
import { runAi } from "@/modules/ai/services/ai";
import { cachedAi } from "@/modules/ai/services/ai-cache";
import { selectTest, type PickedQuestion } from "@/modules/genai-test/domain/blueprint";
import { coverageStat, coveredTopics, expectedTopics, levelCoverage, type CoverageStat } from "@/modules/genai-test/domain/coverage";
import { gradePrompt, normaliseGrade, selfScores } from "@/modules/genai-test/domain/grading";
import type { QStat, WrittenQ } from "@/modules/genai-test/domain/pool";
import {
  CRITERIA,
  GRADE_PROMPT_VERSION,
  ANSWER_MAX_CHARS,
  gradeSchema,
  type TestKind,
} from "@/modules/genai-test/domain/schemas";
import {
  isBlankAnswer,
  itemResult,
  levelMastery,
  levelReached,
  levelResults,
  passMark,
  passed,
  scoreTest,
  suggestedReadiness,
  verdict,
  type ItemResult,
  type WrittenAnswer,
} from "@/modules/genai-test/domain/scoring";
import type { AttemptSummary, HomeView, LevelRow, PublicItem, ResultItem, ResultView, TakeView } from "@/modules/genai-test/domain/views";

type Answers = Record<string, number | WrittenAnswer>;
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const objectId = (id: string) => Types.ObjectId.isValid(id);
const MAX_ATTEMPTS_LISTED = 40;

async function loadCovered(): Promise<Set<string>> {
  const [ticks, rated] = await Promise.all([
    RoadmapNodeProgress.find({ roadmapId: ROADMAP_ID }, { nodeId: 1, checked: 1, manualDoneOn: 1 }).lean(),
    GenaiStudyProgress.find({ roadmapId: ROADMAP_ID }, { nodeId: 1, key: 1 }).lean(),
  ]);
  return coveredTopics(
    roadmapNodeKeys(),
    ticks.map((t) => ({ nodeId: t.nodeId, checked: t.checked ?? [], manualDone: !!t.manualDoneOn })),
    rated.map((r) => ({ nodeId: r.nodeId, key: r.key })),
  );
}

type StoredAttempt = {
  _id: Types.ObjectId;
  slug: string;
  kind: TestKind;
  weekId: string;
  weekIdx: number;
  level: number | null;
  startedOn: string;
  submittedOn: string | null;
  status: "in_progress" | "submitted";
  questions: PickedQuestion[];
  answers: Answers;
  passMark: number;
  coverage: CoverageStat;
  pct: number | null;
  passed: boolean;
  verdict: string | null;
};

const asStored = (d: unknown) => d as StoredAttempt;

const resultsOf = (a: StoredAttempt): ItemResult[] => a.questions.map((p) => itemResult(p.q, a.answers[p.q.id] ?? null, CRITERIA.length));

async function loadHistory(): Promise<Map<string, QStat>> {
  const rows = (await GenaiTestAttempt.find({ status: "submitted" }, { questions: 1, answers: 1, submittedOn: 1 }).sort({ submittedOn: 1 }).lean()).map(asStored);
  const out = new Map<string, QStat>();
  for (const a of rows)
    for (const r of resultsOf(a)) {
      if (r.pct === null) continue;
      const cur = out.get(r.q.id) ?? { right: 0, wrong: 0 };
      const ok = r.pct >= 70;
      out.set(r.q.id, { right: cur.right + (ok ? 1 : 0), wrong: cur.wrong + (ok ? 0 : 1), last: a.submittedOn ?? undefined, lastCorrect: ok });
    }
  return out;
}

function weekContext(today: DateStr) {
  const week = weekForDate(plan, focusDate(plan, today)) ?? plan.weeks[0];
  const idx = plan.weeks.findIndex((w) => w.id === week.id) + 1;
  const prior = plan.weeks.slice(0, idx - 1);
  const levelsPerWeek = plan.weeks.map((w) => weekLevels(w.id));
  return { week, idx, priorWeeks: new Set(prior.map((w) => w.id)), priorLevels: new Set(prior.flatMap((w) => weekLevels(w.id))), levelsPerWeek };
}

/** Start a test (or resume the one in progress for the same week or level). */
export async function startAttempt(input: { kind: TestKind; level?: number }, today: DateStr): Promise<Result<{ id: string }>> {
  await connectDb();
  const ctx = weekContext(today);
  if (input.kind === "level" && (input.level === undefined || !levelTopics().some((l) => l.level === input.level))) return { ok: false, error: "Unknown level" };
  const stem = input.kind === "level" ? `level-${input.level}` : `${input.kind}-${ctx.week.id}`;
  const open = await GenaiTestAttempt.findOne({ slug: new RegExp(`^${stem}-\\d+$`), status: "in_progress" }, { _id: 1 }).lean();
  if (open) return { ok: true, id: String(open._id) };
  const n = (await GenaiTestAttempt.countDocuments({ slug: new RegExp(`^${stem}-\\d+$`) })) + 1;
  const slug = `${stem}-${n}`;
  const [covered, history] = await Promise.all([loadCovered(), loadHistory()]);
  const levels = levelTopics();
  const picked = selectTest({ kind: input.kind, pool: testPool(), weekIdx: ctx.idx, weekId: ctx.week.id, weekLevels: weekLevels(ctx.week.id), priorWeeks: ctx.priorWeeks, priorLevels: ctx.priorLevels, covered, history, seed: slug, today, level: input.level });
  if (picked.length === 0) return { ok: false, error: "No questions are available yet" };
  const coverage = coverageStat(expectedTopics(levels, ctx.levelsPerWeek, ctx.idx), covered);
  const doc = await GenaiTestAttempt.create({ slug, kind: input.kind, weekId: ctx.week.id, weekIdx: ctx.idx, level: input.level ?? null, startedOn: today, questions: picked, passMark: passMark(ctx.idx), coverage });
  return { ok: true, id: String(doc._id) };
}

const toPublic = (p: PickedQuestion): PublicItem => ({ id: p.q.id, kind: p.q.kind, q: p.q.q, options: p.q.kind === "mcq" ? p.q.options : undefined, level: p.q.level, ahead: p.ahead, review: p.review });

/** The test as the browser may see it: no answer key. Undefined for an unknown or already submitted test. */
export async function getTakeView(id: string): Promise<TakeView | undefined> {
  if (!objectId(id)) return undefined;
  await connectDb();
  const d = await GenaiTestAttempt.findById(id).lean();
  if (!d) return undefined;
  const a = asStored(d);
  if (a.status !== "in_progress") return undefined;
  const answers: Record<string, number | string> = {};
  for (const [qid, v] of Object.entries(a.answers ?? {})) answers[qid] = typeof v === "number" ? v : v.text;
  return { id: String(a._id), slug: a.slug, kind: a.kind, weekId: a.weekId, level: a.level, items: a.questions.map(toPublic), answers, passMark: a.passMark, coverage: a.coverage };
}

/** Clean raw browser answers against the test's questions: an option index for an MCQ, capped text for a written answer. */
export function cleanAnswers(questions: readonly PickedQuestion[], raw: Record<string, number | string>, previous: Answers = {}): Answers {
  const out: Answers = {};
  for (const { q } of questions) {
    const v = raw[q.id];
    if (q.kind === "mcq") {
      if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v;
    } else if (typeof v === "string") {
      const text = v.slice(0, ANSWER_MAX_CHARS);
      const prev = previous[q.id];
      // Editing an answer clears its old grade.
      out[q.id] = typeof prev === "object" && prev.text === text ? prev : { text };
    }
  }
  return out;
}

export async function saveDraft(id: string, raw: Record<string, number | string>): Promise<Result<object>> {
  if (!objectId(id)) return { ok: false, error: "Unknown test" };
  await connectDb();
  const d = await GenaiTestAttempt.findById(id, { questions: 1, answers: 1, status: 1 }).lean();
  if (!d) return { ok: false, error: "Unknown test" };
  const a = asStored(d);
  if (a.status !== "in_progress") return { ok: false, error: "This test is already submitted" };
  await GenaiTestAttempt.updateOne({ _id: id }, { $set: { answers: cleanAnswers(a.questions, raw, a.answers) } });
  return { ok: true };
}

async function rescore(id: string): Promise<void> {
  const d = await GenaiTestAttempt.findById(id).lean();
  if (!d) return;
  const a = asStored(d);
  const s = scoreTest(resultsOf(a));
  const v = s.pct === null ? null : verdict(s.pct, a.passMark, a.coverage);
  await GenaiTestAttempt.updateOne({ _id: id }, { $set: { mcqCorrect: s.mcqCorrect, mcqTotal: s.mcqTotal, pct: s.pct, passed: passed(s.pct, a.passMark), verdict: v } });
}

/** Grade the written answers that still have no grade with the AI. Returns how many were graded and how many wait. */
export async function gradeWithAi(id: string): Promise<Result<{ graded: number; remaining: number }> & { unavailable?: boolean }> {
  if (!objectId(id)) return { ok: false, error: "Unknown test" };
  await connectDb();
  const d = await GenaiTestAttempt.findById(id).lean();
  if (!d) return { ok: false, error: "Unknown test" };
  const a = asStored(d);
  if (a.status !== "submitted") return { ok: false, error: "Submit the test first" };
  const pending = a.questions.filter((p): p is PickedQuestion & { q: WrittenQ } => p.q.kind === "written").filter((p) => {
    const ans = a.answers[p.q.id];
    return typeof ans === "object" && !isBlankAnswer(ans) && !ans.scores?.length;
  });
  let graded = 0;
  for (const { q } of pending) {
    const ans = a.answers[q.id] as WrittenAnswer;
    const res = await runAi("test-grade", {}, async (llm) => {
      const out = await cachedAi(
        { feature: "test-grade", version: GRADE_PROMPT_VERSION, input: JSON.stringify([q.id, q.q, ans.text]), ttlDays: 30, schema: gradeSchema, timeZone: env().APP_TIMEZONE },
        async () => {
          const raw = await llm.generateJson(gradePrompt(q, ans.text), gradeSchema);
          if (!normaliseGrade(raw)) throw new Error("The grader skipped a rubric item");
          return { value: raw, provider: llm.lastProvider };
        },
      );
      return out.value;
    });
    if (!res.ok) {
      await rescore(id);
      return { ok: false, error: res.error, unavailable: res.unavailable };
    }
    const scores = normaliseGrade(res.data);
    if (!scores) continue;
    await GenaiTestAttempt.updateOne({ _id: id }, { $set: { [`answers.${q.id}.scores`]: scores, [`answers.${q.id}.gradedBy`]: "ai", [`answers.${q.id}.summary`]: res.data.summary.trim() } });
    graded++;
  }
  await rescore(id);
  return { ok: true, graded, remaining: pending.length - graded };
}

/** Submit: save the answers, mark the MCQs, then try the AI for the written answers. With no AI they wait for your self-grade. */
export async function submitAttempt(id: string, raw: Record<string, number | string>, today: DateStr): Promise<Result<{ aiUnavailable: boolean }>> {
  if (!objectId(id)) return { ok: false, error: "Unknown test" };
  await connectDb();
  const d = await GenaiTestAttempt.findById(id, { questions: 1, answers: 1, status: 1 }).lean();
  if (!d) return { ok: false, error: "Unknown test" };
  const a = asStored(d);
  if (a.status !== "in_progress") return { ok: false, error: "This test is already submitted" };
  await GenaiTestAttempt.updateOne({ _id: id }, { $set: { answers: cleanAnswers(a.questions, raw, a.answers), status: "submitted", submittedOn: today } });
  await rescore(id);
  const g = await gradeWithAi(id);
  return { ok: true, aiUnavailable: !g.ok };
}

/** Your own 0-4 per criterion for one written answer, used when no AI is available or to override its grade. */
export async function selfGrade(id: string, qid: string, scores: Record<string, number>): Promise<Result<object>> {
  if (!objectId(id)) return { ok: false, error: "Unknown test" };
  await connectDb();
  const d = await GenaiTestAttempt.findById(id, { questions: 1, answers: 1, status: 1 }).lean();
  if (!d) return { ok: false, error: "Unknown test" };
  const a = asStored(d);
  const q = a.questions.find((p) => p.q.id === qid)?.q;
  if (a.status !== "submitted" || !q || q.kind !== "written") return { ok: false, error: "Unknown question" };
  await GenaiTestAttempt.updateOne({ _id: id }, { $set: { [`answers.${qid}.scores`]: selfScores(scores), [`answers.${qid}.gradedBy`]: "self" }, $unset: { [`answers.${qid}.summary`]: "" } });
  await rescore(id);
  return { ok: true };
}

export async function getResultView(id: string): Promise<ResultView | undefined> {
  if (!objectId(id)) return undefined;
  await connectDb();
  const d = await GenaiTestAttempt.findById(id).lean();
  if (!d) return undefined;
  const a = asStored(d);
  if (a.status !== "submitted") return undefined;
  const results = resultsOf(a);
  const s = scoreTest(results);
  const items: ResultItem[] = a.questions.map((p, i) => {
    const ans = a.answers[p.q.id];
    if (p.q.kind === "mcq") return { id: p.q.id, kind: "mcq", q: p.q.q, level: p.q.level, review: p.review, options: p.q.options, chosen: typeof ans === "number" ? ans : null, correct: p.q.answer, why: p.q.why, pct: results[i].pct };
    const w = typeof ans === "object" ? ans : undefined;
    return { id: p.q.id, kind: "written", q: p.q.q, level: p.q.level, review: p.review, text: w?.text ?? "", points: p.q.points, reference: p.q.reference, scores: w?.scores, gradedBy: w?.gradedBy, summary: w?.summary, pct: results[i].pct };
  });
  const byLevel = [...levelResults(results)].map(([level, v]) => ({ level, pct: Math.round((100 * v.earned) / v.max) })).sort((x, y) => x.level - y.level);
  return {
    id: String(a._id), slug: a.slug, kind: a.kind, weekId: a.weekId, level: a.level, submittedOn: a.submittedOn, items,
    mcqCorrect: s.mcqCorrect, mcqTotal: s.mcqTotal, mcqPct: s.mcqPct, writtenPct: s.writtenPct, pendingWritten: s.pendingWritten, pct: s.pct,
    passMark: a.passMark, passed: passed(s.pct, a.passMark), verdict: s.pct === null ? null : verdict(s.pct, a.passMark, a.coverage), coverage: a.coverage, byLevel,
  };
}

export async function getHomeView(today: DateStr): Promise<HomeView> {
  await connectDb();
  const ctx = weekContext(today);
  const levels = levelTopics();
  const [covered, rows] = await Promise.all([loadCovered(), GenaiTestAttempt.find({}, { slug: 1, kind: 1, weekId: 1, level: 1, status: 1, pct: 1, passed: 1, startedOn: 1, questions: 1, answers: 1, submittedOn: 1 }).sort({ createdAt: 1 }).lean()]);
  const attempts = rows.map(asStored);
  const submitted = attempts.filter((a) => a.status === "submitted");
  const mastery = levelMastery(submitted.map((a) => levelResults(resultsOf(a))));
  const cov = levelCoverage(levels, covered);
  const allTopics = new Set(levels.flatMap((l) => l.topics));
  const levelRows: LevelRow[] = levels.map((l) => ({ level: l.level, coverage: cov.get(l.level)!, mastery: mastery.get(l.level) ?? null }));
  const summaries: AttemptSummary[] = attempts.slice(-MAX_ATTEMPTS_LISTED).reverse().map((a) => ({ id: String(a._id), slug: a.slug, kind: a.kind, weekId: a.weekId, level: a.level, status: a.status, pct: a.pct, passed: a.passed, startedOn: a.startedOn, pending: a.status === "submitted" && a.pct === null }));
  const best = new Map<string, number>();
  for (const a of submitted) if (a.kind === "weekly" && a.pct !== null) best.set(a.weekId, Math.max(best.get(a.weekId) ?? 0, a.pct));
  return {
    weekId: ctx.week.id, weekIdx: ctx.idx, weekTitle: ctx.week.title, weekFocus: genaiTestWeekMap.weeks.find((w) => w.week === ctx.week.id)?.focus ?? ctx.week.title,
    passMark: passMark(ctx.idx), expected: coverageStat(expectedTopics(levels, ctx.levelsPerWeek, ctx.idx), covered), overall: coverageStat(allTopics, covered),
    levels: levelRows, levelReached: levelReached(levels.map((l) => l.level), cov, mastery), attempts: summaries,
    trend: plan.weeks.filter((w) => best.has(w.id)).map((w) => ({ weekId: w.id, pct: best.get(w.id)! })),
    suggestedReadiness: suggestedReadiness(mastery),
    weakest: levelRows.filter((r) => r.mastery !== null).sort((a, b) => a.mastery! - b.mastery!).slice(0, 3),
  };
}
