import { problemBySlug, subtopicById } from "@/core/content";
import { courseLessonByKey } from "@/core/courses";
import { CourseLessonProgress } from "@/core/models/course";
import { connectDb } from "@/core/db";
import { addDays, eachDay, type DateStr } from "@/core/domain/dates";
import { heatmapCells, type HeatState } from "@/modules/progress/domain/heatmap";
import type { CatchUp } from "@/modules/planner/domain/catch-up";
import { loadCatchUp } from "@/modules/planner/services/catch-up";
import type { DayGap } from "@/modules/progress/domain/recap";
import { mockSlotsOn, mondayOf, type FinishedMock, type MockSlotStatus, type MockType } from "@/modules/mock/domain/mock";
import { dayKind, projectDays, type DailyPlanDraft, type DayKind } from "@/modules/planner/domain/planner";
import { DailyPlan, DayLog } from "@/core/models/day";
import { MockSession } from "@/core/models/mock";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { interviewsBetween } from "@/modules/jobs/services/jobs";
import { ensureToday, getPlan, loadPlanInputs } from "@/modules/planner/services/plan";
import type { AppSettings } from "@/modules/settings/services/settings";

export type CalendarSource = "frozen" | "projected" | "none";

export interface CalendarDay {
  date: DateStr;
  kind: DayKind;
  state: HeatState;
  source: CalendarSource;
  dsaTarget: number;
  theoryTarget: number;
  reviews: number;
  estMinutes?: number;
  /** Weekly mocks scheduled on this day. Informational: they never gate the streak. */
  mocks: MockSlotStatus[];
  /** What was actually done (today and earlier only). */
  done: { dsa: number; theory: number; quiz: boolean } | null;
  /** Job interviews on this day. They never affect the streak. */
  interviews: Array<{ id: string; title: string; company: string; round: string }>;
  /** Items this closed day still owes (0 when it left nothing, or has been caught up). */
  owed: number;
}

export interface CalendarMonth {
  month: string;
  today: DateStr;
  startDate: DateStr;
  endDate: DateStr;
  days: CalendarDay[];
}

export interface PlanItem {
  id: string;
  title: string;
  href: string;
  detail?: string;
  done: boolean;
}

export interface CalendarDayDetail {
  date: DateStr;
  today: DateStr;
  kind: DayKind;
  source: CalendarSource;
  state: HeatState;
  weekNumber: number;
  hours?: number;
  estMinutes?: number;
  dsaTarget: number;
  theoryTarget: number;
  dsaNew: PlanItem[];
  dsaReview: PlanItem[];
  extras: PlanItem[];
  theory: PlanItem[];
  bonus: PlanItem[];
  mocks: MockSlotStatus[];
  log: { dsaSolved: number; theoryDone: number; quizPassed: boolean; complete: boolean; freezeUsed: boolean } | null;
  /** What this day left undone and whether later work has made it up. Null when it left nothing. */
  catchUp: CatchUp | null;
  /** Job interviews on this day. */
  interviews: Array<{ id: string; title: string; company: string; round: string }>;
  /** Course lessons you finished on this day. Study evidence only: they do not complete a day. */
  lessons: Array<{ key: string; title: string; href: string }>;
  /** Work still owed from earlier closed days that has moved forward into this day and the ones after it. Today and later only. */
  carriedIn: Array<{ date: DateStr; remaining: DayGap }>;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const isMonthStr = (s: string) => MONTH_RE.test(s);

export function monthBounds(month: string): { first: DateStr; last: DateStr } {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

async function finishedMocks(from: DateStr, to: DateStr): Promise<FinishedMock[]> {
  const rows = await MockSession.find({ date: { $gte: mondayOf(from), $lte: addDays(to, 6) }, status: { $ne: "in_progress" } }, { type: 1, date: 1, totalScore: 1 })
    .sort({ startedAt: -1 })
    .lean();
  return rows.map((r) => ({ id: String(r._id), date: r.date, type: r.type as MockType, score: r.totalScore ?? null }));
}

const inWindow = (date: DateStr, s: AppSettings) => date >= s.startDate && date <= s.endDate;

/** Projected plans from tomorrow through `to`, starting from today's frozen plan as if it were done. */
export async function projectThrough(s: AppSettings, today: DateStr, todayPlan: DailyPlanDraft, to: DateStr): Promise<Map<DateStr, DailyPlanDraft>> {
  const from = addDays(today, 1);
  const end = to < s.endDate ? to : s.endDate;
  if (from > end) return new Map();
  const inputs = await loadPlanInputs();
  const plans = projectDays({ from, to: end, settings: s, ...inputs, seed: todayPlan });
  return new Map(plans.map((p) => [p.date, p]));
}

/** One month of the plan; defaults to the month containing today. */
export async function getCalendarMonth(requested?: string): Promise<CalendarMonth> {
  const state = await ensureToday();
  const s = state.settings;
  const month = requested ?? state.today.slice(0, 7);
  const { first, last } = monthBounds(month);
  const [frozen, logs, projected, mocks, catchUp, interviews] = await Promise.all([
    DailyPlan.find({ date: { $gte: first, $lte: last } }).lean(),
    DayLog.find({ date: { $gte: first, $lte: last } }, { date: 1, dsaSolved: 1, theoryDone: 1, quizPassed: 1, complete: 1, freezeUsed: 1 }).lean(),
    projectThrough(s, state.today, state.plan, last),
    finishedMocks(first, last),
    loadCatchUp(s, state.today),
    interviewsBetween(first, last),
  ]);
  const frozenBy = new Map(frozen.map((p) => [p.date, p]));
  const logBy = new Map(logs.map((l) => [l.date, l]));
  const cells = new Map(
    heatmapCells(
      first,
      last,
      state.today,
      logs.map((l) => ({ date: l.date, dsaSolved: l.dsaSolved ?? 0, theoryDone: l.theoryDone ?? 0, quizPassed: !!l.quizPassed, complete: !!l.complete, freezeUsed: !!l.freezeUsed })),
      { kindOf: (date) => dayKind(date, s), caughtUp: catchUp.caughtUp },
    ).map((c) => [c.date, c]),
  );

  const days = eachDay(first, last).map((date): CalendarDay => {
    const kind = dayKind(date, s);
    const plan = frozenBy.get(date) ?? projected.get(date);
    const source: CalendarSource = frozenBy.has(date) ? "frozen" : projected.has(date) ? "projected" : "none";
    return {
      date,
      kind,
      state: kind === "outside" ? "future" : (cells.get(date)?.state ?? "future"),
      source,
      dsaTarget: plan?.dsaTarget ?? 0,
      theoryTarget: plan?.theoryTarget ?? 0,
      reviews: plan?.dsaReview?.length ?? 0,
      ...(plan?.estMinutes != null ? { estMinutes: plan.estMinutes } : {}),
      mocks: inWindow(date, s) ? mockSlotsOn(date, s.mockSchedule, mocks) : [],
      done: date <= state.today ? { dsa: logBy.get(date)?.dsaSolved ?? 0, theory: logBy.get(date)?.theoryDone ?? 0, quiz: !!logBy.get(date)?.quizPassed } : null,
      owed: owedOn(catchUp.byDate.get(date)),
      interviews: interviews.filter((i) => i.date === date).map(({ id, title, company, round }) => ({ id, title, company, round })),
    };
  });
  return { month, today: state.today, startDate: s.startDate, endDate: s.endDate, days };
}

async function lessonsDoneOn(date: DateStr): Promise<Array<{ key: string; title: string; href: string }>> {
  const rows = await CourseLessonProgress.find({ doneOn: date }, { courseId: 1, lessonId: 1 }).sort({ createdAt: 1 }).lean();
  return rows.flatMap((r) => {
    const l = courseLessonByKey.get(`${r.courseId}/${r.lessonId}`);
    return l ? [{ key: `${r.courseId}/${r.lessonId}`, title: l.title, href: `/courses/${r.courseId}/${r.lessonId}` }] : [];
  });
}

function owedOn(c: CatchUp | undefined): number {
  if (!c || c.caughtUp) return 0;
  return c.remaining.dsa + c.remaining.theory + (c.remaining.quiz ? 1 : 0);
}

function problemItem(slug: string, done: Set<string>): PlanItem {
  const p = problemBySlug.get(slug);
  return { id: slug, title: p?.title ?? slug, href: `/dsa/${slug}`, detail: p ? `${p.difficulty} · ${p.pattern}` : undefined, done: done.has(slug) };
}

function theoryItem(id: string, done: Set<string>): PlanItem {
  const t = subtopicById.get(id);
  return { id, title: t?.title ?? id, href: t ? `/learn/${encodeURIComponent(t.topicId)}` : "/learn", detail: t?.topicTitle, done: done.has(id) };
}

export async function getCalendarDay(date: DateStr): Promise<CalendarDayDetail> {
  const state = await ensureToday();
  const s = state.settings;
  await connectDb();
  const isPastOrToday = date <= state.today;
  let plan: DailyPlanDraft | null;
  let source: CalendarSource;
  if (date === state.today) {
    plan = state.plan;
    source = "frozen";
  } else if (isPastOrToday) {
    plan = await getPlan(date);
    source = plan ? "frozen" : "none";
  } else {
    plan = (await projectThrough(s, state.today, state.plan, date)).get(date) ?? null;
    source = plan ? "projected" : "none";
  }

  const mocks = inWindow(date, s) ? mockSlotsOn(date, s.mockSchedule, await finishedMocks(date, date)) : [];
  const [log, solvedRows, doneRows] = isPastOrToday
    ? await Promise.all([
        DayLog.findOne({ date }).lean(),
        ProblemProgress.find({ solveDates: date }, { slug: 1 }).lean(),
        SubtopicProgress.find({ doneOn: date }, { subtopicId: 1 }).lean(),
      ])
    : [null, [], []];
  const solved = new Set(solvedRows.map((r) => r.slug));
  const done = new Set(doneRows.map((r) => r.subtopicId));
  const catchUp = await loadCatchUp(s, state.today);
  const heat = heatmapCells(date, date, state.today, log ? [{ date, dsaSolved: log.dsaSolved ?? 0, theoryDone: log.theoryDone ?? 0, quizPassed: !!log.quizPassed, complete: !!log.complete, freezeUsed: !!log.freezeUsed }] : [], { kindOf: (d) => dayKind(d, s), caughtUp: catchUp.caughtUp })[0];

  const extras = [plan?.jsProblem, plan?.sqlProblem].filter((x): x is string => !!x).map((slug) => problemItem(slug, solved));
  return {
    date,
    today: state.today,
    kind: dayKind(date, s),
    source,
    state: heat.state,
    weekNumber: plan?.weekNumber ?? 0,
    ...(plan?.hours != null ? { hours: plan.hours } : {}),
    ...(plan?.estMinutes != null ? { estMinutes: plan.estMinutes } : {}),
    dsaTarget: plan?.dsaTarget ?? 0,
    theoryTarget: plan?.theoryTarget ?? 0,
    dsaNew: (plan?.dsaNew ?? []).map((slug) => problemItem(slug, solved)),
    dsaReview: (plan?.dsaReview ?? []).map((slug) => problemItem(slug, solved)),
    extras,
    theory: (plan?.theory ?? []).map((id) => theoryItem(id, done)),
    mocks,
    bonus: [...(plan?.bonusDsa ?? []).map((slug) => problemItem(slug, solved)), ...(plan?.bonusTheory ?? []).map((id) => theoryItem(id, done))],
    log: log ? { dsaSolved: log.dsaSolved ?? 0, theoryDone: log.theoryDone ?? 0, quizPassed: !!log.quizPassed, complete: !!log.complete, freezeUsed: !!log.freezeUsed } : null,
    catchUp: catchUp.byDate.get(date) ?? null,
    lessons: isPastOrToday ? await lessonsDoneOn(date) : [],
    interviews: (await interviewsBetween(date, date)).map(({ id, title, company, round }) => ({ id, title, company, round })),
    carriedIn: date >= state.today ? catchUp.open.filter((c) => c.date < date).map((c) => ({ date: c.date, remaining: c.remaining })) : [],
  };
}
