import { designCaseBySlug, mainProblemCount, problemBySlug, problems, subtopics, topicById, topics } from "@/core/content";
import { connectDb } from "@/core/db";
import {
  assembleBacklog,
  companyItems,
  designItems,
  dsaItems,
  mailBacklog,
  mockItems,
  pickBudget,
  readingItems,
  reviewItems,
  snoozeUntil,
  theoryItems,
  topicQuizItems,
  type AssembledBacklog,
  type BacklogItem,
  type BacklogUserState,
  type MailBacklog,
} from "@/modules/progress/domain/backlog-items";
import { mergeCompanyItems } from "@/modules/targets/domain/companies";
import { addDays, eachDay, weekNumber, type DateStr } from "@/core/domain/dates";
import { mockSlotsOn, type FinishedMock, type MockType } from "@/modules/mock/domain/mock";
import { pace } from "@/modules/planner/domain/pace";
import { BacklogPull, BacklogState } from "@/core/models/backlog";
import { Mastery } from "@/core/models/learning";
import { MockSession } from "@/core/models/mock";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { Article } from "@/core/models/system";
import { countSolvedMain } from "@/modules/progress/services/dashboard";
import { getDesignOverview } from "@/modules/design/services/designs";
import type { TodayState } from "@/modules/planner/services/plan";
import { loadCompanyGaps } from "@/modules/targets/services/targets";

type Ctx = Pick<TodayState, "today" | "plan" | "settings">;

const MOCK_LOOKBACK_DAYS = 21;
const READING_LIMIT = 20;

/** Every owed item, before your snoozes and dismissals. Read-only. */
export async function loadBacklogItems({ today, plan, settings }: Ctx): Promise<BacklogItem[]> {
  await connectDb();
  const currentWeek = Math.max(0, weekNumber(today, settings.startDate));
  const [overdueRows, solvedRows, doneRows, masteredRows, designOverview, mocks, bookmarked, solvedMain] = await Promise.all([
    ProblemProgress.find({ nextReviewAt: { $ne: null, $lte: today } }, { slug: 1, nextReviewAt: 1 }).lean(),
    ProblemProgress.find({ status: "solved" }, { slug: 1 }).lean(),
    SubtopicProgress.find({}, { subtopicId: 1, topicId: 1 }).lean(),
    Mastery.find({ scope: "topic", masteredOn: { $ne: null } }, { ref: 1 }).lean(),
    getDesignOverview(),
    MockSession.find({ status: { $in: ["submitted", "graded"] } }, { date: 1, type: 1, totalScore: 1 }).sort({ date: -1 }).lean(),
    Article.find({ bookmarked: true, read: false }, { title: 1, sourceName: 1, readingMinutes: 1 }).sort({ publishedAt: -1 }).limit(READING_LIMIT).lean(),
    countSolvedMain(),
  ]);

  const solved = new Set(solvedRows.map((r) => r.slug));
  const done = new Set(doneRows.map((r) => r.subtopicId));
  const tickedByTopic = new Map<string, number>();
  for (const r of doneRows) tickedByTopic.set(r.topicId, (tickedByTopic.get(r.topicId) ?? 0) + 1);
  const mastered = new Set(masteredRows.map((m) => m.ref));
  const todayProblems = new Set([...plan.dsaNew, ...plan.dsaReview].filter((s): s is string => !!s));
  const todayTheory = new Set(plan.theory);

  const behind = Math.max(0, -pace(today, solvedMain, mainProblemCount, settings).delta);
  const finished: FinishedMock[] = mocks.map((m) => ({ id: String(m._id), date: m.date, type: m.type as MockType, score: m.totalScore ?? null }));
  const mockFrom = addDays(today, -MOCK_LOOKBACK_DAYS) > settings.startDate ? addDays(today, -MOCK_LOOKBACK_DAYS) : settings.startDate;
  const missedMocks =
    mockFrom < today
      ? eachDay(mockFrom, addDays(today, -1)).flatMap((date) =>
          mockSlotsOn(date, { dsaWeekday: settings.mockSchedule.dsaWeekday, hldWeekday: settings.mockSchedule.hldWeekday }, finished).filter((s) => !s.done).map((s) => ({ kind: s.kind, date })),
        )
      : [];

  const owed = [
    ...reviewItems({
      overdue: overdueRows.flatMap((r) => (r.nextReviewAt && problemBySlug.get(r.slug) ? [{ slug: r.slug, title: problemBySlug.get(r.slug)!.title, nextReviewAt: r.nextReviewAt }] : [])),
      inToday: new Set(plan.dsaReview.filter((s): s is string => !!s)),
    }),
    ...dsaItems({
      behind,
      unsolved: problems.filter((p) => p.track === "main" && !solved.has(p.slug)).toSorted((a, b) => a.order - b.order).map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty })),
      todayProblems,
      today,
    }),
    ...theoryItems({
      subtopics: subtopics.map((t) => ({ id: t.id, title: t.title, topicId: t.topicId, topicTitle: t.topicTitle, week: t.week, position: t.position, done: done.has(t.id) })),
      currentWeek,
      todayTheory,
      planStart: settings.startDate,
    }),
    ...topicQuizItems({
      topics: topics.map((t) => ({ id: t.id, title: t.title, subtopics: t.subtopics.length, ticked: tickedByTopic.get(t.id) ?? 0, mastered: mastered.has(t.id), week: t.week })),
      today,
    }),
    ...designItems({
      cases: Object.values(designOverview).flatMap((d) => {
        const c = designCaseBySlug.get(d.slug);
        return c ? [{ slug: d.slug, title: c.title, week: topicById.get(c.topicId)?.week ?? 0, status: d.status }] : [];
      }),
      currentWeek,
      planStart: settings.startDate,
    }),
    ...mockItems(missedMocks),
    ...readingItems(bookmarked.map((a) => ({ id: String(a._id), title: a.title, source: a.sourceName, minutes: a.readingMinutes ?? null, savedOn: today }))),
  ];
  // A target's gap that is already owed another way boosts that item instead of repeating it.
  return mergeCompanyItems(owed, companyItems(await loadCompanyGaps(), today));
}

async function userStates(): Promise<Map<string, BacklogUserState>> {
  const rows = await BacklogState.find({}, { key: 1, status: 1, until: 1 }).lean();
  return new Map(rows.map((r) => [r.key, { status: r.status as BacklogUserState["status"], until: r.until ?? null }]));
}

export interface BacklogView extends AssembledBacklog {
  /** Today's queue that is still open, in the order it was queued. */
  queue: BacklogItem[];
  /** Items queued today that are no longer owed, i.e. done. */
  queueDone: number;
  budget: number;
}

/** The ranked backlog with your decisions applied, plus today's queue. Read-only. */
export async function getBacklog(ctx: Ctx, items?: BacklogItem[]): Promise<BacklogView> {
  await connectDb();
  const all = items ?? (await loadBacklogItems(ctx));
  const [state, pulls] = await Promise.all([userStates(), BacklogPull.find({ date: ctx.today }, { key: 1 }).sort({ createdAt: 1 }).lean()]);
  const assembled = assembleBacklog(all, state, ctx.today);
  const byKey = new Map(all.map((i) => [i.key, i]));
  const queue = pulls.flatMap((p) => (byKey.has(p.key) && state.get(p.key)?.status !== "dismissed" ? [byKey.get(p.key)!] : []));
  return { ...assembled, queue, queueDone: pulls.length - queue.length, budget: ctx.settings.backlogBudget };
}

/**
 * Queues today's budget of backlog items, once: a day's budget is fixed, so finishing items doesn't refill it.
 * Safe to call from several places (cron, dashboard, the page); the unique (date, key) index stops duplicates.
 */
export async function ensureBacklogQueue(ctx: Ctx): Promise<BacklogView> {
  await connectDb();
  const items = await loadBacklogItems(ctx);
  const view = await getBacklog(ctx, items);
  const pulled = await BacklogPull.find({ date: ctx.today }, { key: 1 }).lean();
  const left = ctx.settings.backlogBudget - pulled.length;
  if (left <= 0 || ctx.plan.kind === "rest" || ctx.plan.kind === "outside") return view;
  const queued = new Set(pulled.map((p) => p.key));
  const picked = pickBudget(view.open.filter((i) => !queued.has(i.key)), left, new Set());
  if (picked.length === 0) return view;
  await BacklogPull.insertMany(picked.map((i) => ({ date: ctx.today, key: i.key, source: "auto" as const })), { ordered: false }).catch(() => undefined);
  return getBacklog(ctx, items);
}

/** Read-only: the shape the emails use, without queueing anything. For the night recap, nudge and weekly report. */
export async function getBacklogMail(ctx: Ctx): Promise<MailBacklog> {
  const view = await getBacklog(ctx);
  return mailBacklog(view, view.queue, ctx.settings.backlogBudget);
}

/** The shape the emails use: per-kind groups and today's queue. Also queues today's budget (the morning mail). */
export async function loadBacklogMail(ctx: Ctx): Promise<MailBacklog> {
  const view = await ensureBacklogQueue(ctx);
  return mailBacklog(view, view.queue, ctx.settings.backlogBudget);
}

/* ------------------------------------ your decisions ------------------------------------ */

export async function snoozeBacklogItem(key: string, days: 1 | 3 | 7, today: DateStr): Promise<void> {
  await connectDb();
  await BacklogState.updateOne({ key }, { $set: { status: "snoozed", until: snoozeUntil(today, days) } }, { upsert: true });
}

export async function dismissBacklogItem(key: string): Promise<void> {
  await connectDb();
  await BacklogState.updateOne({ key }, { $set: { status: "dismissed", until: null } }, { upsert: true });
}

export async function restoreBacklogItem(key: string): Promise<void> {
  await connectDb();
  await BacklogState.deleteOne({ key });
}

export async function restoreAllDismissed(): Promise<number> {
  await connectDb();
  return (await BacklogState.deleteMany({ status: "dismissed" })).deletedCount;
}

/** Queue an item for a day by hand. A manual pull isn't limited by the budget. */
export async function pullBacklogItem(key: string, date: DateStr): Promise<void> {
  await connectDb();
  await BacklogPull.updateOne({ date, key }, { $setOnInsert: { source: "manual" } }, { upsert: true });
}

export async function unpullBacklogItem(key: string, date: DateStr): Promise<void> {
  await connectDb();
  await BacklogPull.deleteOne({ date, key });
}

/* ------------------------------------ placing items on days ------------------------------------ */

/** Which future days each item was placed on by hand or by the queue (`key` to dates), today included. */
export async function listPulledDates(from: DateStr): Promise<Map<string, DateStr[]>> {
  await connectDb();
  const rows = await BacklogPull.find({ date: { $gte: from } }, { key: 1, date: 1 }).sort({ date: 1 }).lean();
  const out = new Map<string, DateStr[]>();
  for (const r of rows) out.set(r.key, [...(out.get(r.key) ?? []), r.date]);
  return out;
}

export interface DayBacklog {
  /** Items placed on this day that are still owed. */
  queued: BacklogItem[];
  /** Items placed on this day that are no longer owed, i.e. done. */
  done: number;
  /** The most useful owed items not yet placed on this day, to add from. */
  available: BacklogItem[];
}

const AVAILABLE_LIMIT = 12;

/** What is queued for `date` and what could be added to it. Read-only. */
export async function getBacklogForDay(ctx: Ctx, date: DateStr): Promise<DayBacklog> {
  await connectDb();
  const all = await loadBacklogItems(ctx);
  const [state, pulls] = await Promise.all([userStates(), BacklogPull.find({ date }, { key: 1 }).sort({ createdAt: 1 }).lean()]);
  const assembled = assembleBacklog(all, state, ctx.today);
  const byKey = new Map(all.map((i) => [i.key, i]));
  const queued = pulls.flatMap((p) => (byKey.has(p.key) && state.get(p.key)?.status !== "dismissed" ? [byKey.get(p.key)!] : []));
  const placed = new Set(pulls.map((p) => p.key));
  return { queued, done: pulls.length - queued.length, available: assembled.open.filter((i) => !placed.has(i.key)).slice(0, AVAILABLE_LIMIT) };
}
