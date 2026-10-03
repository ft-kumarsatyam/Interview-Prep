import { problemBySlug, subtopicById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, eachDay, type DateStr } from "@/lib/domain/dates";
import { heatmapCells, type HeatState } from "@/lib/domain/heatmap";
import { mockSlotsOn, mondayOf, type FinishedMock, type MockSlotStatus, type MockType } from "@/lib/domain/mock";
import { dayKind, projectDays, type DailyPlanDraft, type DayKind } from "@/lib/domain/planner";
import { DailyPlan, DayLog } from "@/lib/models/day";
import { MockSession } from "@/lib/models/mock";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { ensureToday, getPlan, loadPlanInputs } from "./plan";
import type { AppSettings } from "./settings";

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
  const [frozen, logs, projected, mocks] = await Promise.all([
    DailyPlan.find({ date: { $gte: first, $lte: last } }).lean(),
    DayLog.find({ date: { $gte: first, $lte: last } }, { date: 1, dsaSolved: 1, theoryDone: 1, quizPassed: 1, complete: 1, freezeUsed: 1 }).lean(),
    projectThrough(s, state.today, state.plan, last),
    finishedMocks(first, last),
  ]);
  const frozenBy = new Map(frozen.map((p) => [p.date, p]));
  const logBy = new Map(logs.map((l) => [l.date, l]));
  const cells = new Map(
    heatmapCells(
      first,
      last,
      state.today,
      logs.map((l) => ({ date: l.date, dsaSolved: l.dsaSolved ?? 0, theoryDone: l.theoryDone ?? 0, quizPassed: !!l.quizPassed, complete: !!l.complete, freezeUsed: !!l.freezeUsed })),
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
    };
  });
  return { month, today: state.today, startDate: s.startDate, endDate: s.endDate, days };
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
  const heat = heatmapCells(date, date, state.today, log ? [{ date, dsaSolved: log.dsaSolved ?? 0, theoryDone: log.theoryDone ?? 0, quizPassed: !!log.quizPassed, complete: !!log.complete, freezeUsed: !!log.freezeUsed }] : [])[0];

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
  };
}
