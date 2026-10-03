import { problemBySlug, mainProblemCount, subtopicById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, dayOfWeek, eachDay, type DateStr } from "@/lib/domain/dates";
import { pace } from "@/lib/domain/pace";
import { buildDailyPlan, dayKind } from "@/lib/domain/planner";
import {
  dayGap,
  eveningRecap,
  forecastFinish,
  carryOverLine,
  forecastLine,
  recapDate,
  streakStanding,
  type DayGap,
  type Forecast,
  type TomorrowPreview,
} from "@/lib/domain/recap";
import type { DigestLink } from "@/lib/domain/reminders";
import type { DayProgress } from "@/lib/domain/streak";
import { env } from "@/lib/env";
import { DailyPlan, DayLog, Quiz } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { countSolvedMain } from "./dashboard";
import { recomputeDay } from "./day";
import { getPlan, loadPlanInputs, type TodayState } from "./plan";
import { gapOfDay } from "./plan-log";

const FORECAST_WINDOW_DAYS = 14;

/** Local hour (0–23) of `now` in the plan's timezone. */
export function localHourOf(now: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
}

const problemLink = (slug: string): DigestLink[] => {
  const p = problemBySlug.get(slug);
  return p ? [{ title: p.title, path: `/dsa/${p.slug}`, note: p.difficulty }] : [];
};
const theoryLink = (id: string): DigestLink[] => {
  const s = subtopicById.get(id);
  return s ? [{ title: s.title, path: `/learn/${s.topicId}`, note: s.topicTitle }] : [];
};

/**
 * What the day before `date` left undone, read straight from its plan and log
 * (no writes). Null when it had no plan or nothing carried over.
 */
export async function carryOverFromYesterday(date: DateStr): Promise<{ gap: DayGap; kind: DayProgress["kind"]; date: DateStr } | null> {
  const yesterday = addDays(date, -1);
  const open = await gapOfDay(yesterday);
  return open ? { ...open, date: yesterday } : null;
}

/** Finish forecast from the last two weeks of main-track solves ending on `date`. */
export async function getForecast(date: DateStr, settings: TodayState["settings"], solvedMain: number): Promise<Forecast | null> {
  await connectDb();
  const rows = await ProblemProgress.find(
    { status: "solved", firstSolvedOn: { $gte: addDays(date, -(FORECAST_WINDOW_DAYS - 1)), $lte: date } },
    { slug: 1 },
  ).lean();
  const recentSolved = rows.filter((r) => problemBySlug.get(r.slug)?.track === "main").length;
  return forecastFinish({ today: date, solvedMain, totalMain: mainProblemCount, recentSolved, windowDays: FORECAST_WINDOW_DAYS, settings });
}

/** The dashboard's "plan update": what carried over from yesterday and when the list now finishes. */
export async function getPlanUpdate(today: DateStr, settings: TodayState["settings"], solvedMain: number): Promise<{ carryOver: string | null; forecast: string | null }> {
  const [carried, forecast] = await Promise.all([carryOverFromYesterday(today), getForecast(today, settings, solvedMain)]);
  return {
    carryOver: carried ? carryOverLine(carried.gap, carried.kind) : null,
    forecast: forecast ? forecastLine(forecast) : null,
  };
}

async function tomorrowPreview(date: DateStr, state: Pick<TodayState, "settings">): Promise<TomorrowPreview | null> {
  const settings = state.settings;
  const kind = dayKind(date, settings);
  if (kind === "outside") return null;
  // After midnight "tomorrow" is today and its plan is already frozen: show that one.
  const frozen = await getPlan(date);
  const draft = frozen ?? buildDailyPlan({ date, settings, ...(await loadPlanInputs()) });
  return {
    date,
    kind: draft.kind,
    dsaTarget: draft.dsaTarget,
    theoryTarget: draft.theoryTarget,
    problems: [...draft.dsaNew, draft.jsProblem, draft.sqlProblem].flatMap((s) => (s ? problemLink(s) : [])),
    reviews: draft.dsaReview.flatMap(problemLink).map((l) => ({ ...l, note: `review · ${l.note ?? ""}`.replace(/ · $/, "") })),
    theory: draft.theory.flatMap(theoryLink),
    ...(draft.estMinutes ? { estMinutes: draft.estMinutes } : {}),
  };
}

/**
 * The 23:59 email for the day that is ending (or, if the job lands after
 * midnight, the day that just ended). Null when that day wasn't planned.
 */
export async function buildEveningRecap(now: Date, state: Pick<TodayState, "today" | "settings" | "streak" | "freezeTokens">) {
  await connectDb();
  const { settings } = state;
  const date = recapDate(state.today, localHourOf(now, settings.timezone));
  const plan = await getPlan(date);
  if (!plan) return null;

  const { day } = await recomputeDay(date);
  const tomorrow = addDays(date, 1);
  const [solvedRows, theoryRows, quiz, solvedMain, preview] = await Promise.all([
    ProblemProgress.find({ solveDates: date }, { slug: 1 }).lean(),
    SubtopicProgress.find({ doneOn: date }, { subtopicId: 1 }).lean(),
    Quiz.findOne({ date, kind: day.kind === "sunday" ? "weekly" : "daily" }, { bestPct: 1, attempts: 1 }).lean(),
    countSolvedMain(),
    tomorrowPreview(tomorrow, state),
  ]);
  const solved = new Set(solvedRows.map((r) => r.slug));
  const doneTheory = new Set(theoryRows.map((r) => r.subtopicId));
  const planned = [...plan.dsaNew, ...plan.dsaReview, plan.jsProblem, plan.sqlProblem].filter((s): s is string => !!s);

  let week: { completedDays: number; workDays: number; solved: number } | undefined;
  if (dayOfWeek(date) === 0) {
    const days = eachDay(addDays(date, -6), date);
    const logs = await DayLog.find({ date: { $in: days } }, { date: 1, complete: 1, dsaSolved: 1 }).lean();
    const work = days.filter((d) => ["study", "revision", "sunday"].includes(dayKind(d, settings)));
    week = {
      workDays: work.length,
      completedDays: logs.filter((l) => l.complete && work.includes(l.date)).length,
      solved: logs.reduce((n, l) => n + (l.dsaSolved ?? 0), 0),
    };
  }

  const recap = eveningRecap({
    date,
    day,
    complete: day.complete,
    doneProblems: [...solved].flatMap(problemLink),
    doneTheory: [...doneTheory].flatMap(theoryLink),
    readings: day.readings,
    quiz: { passed: day.quizPassed, bestPct: quiz?.bestPct ?? null },
    leftProblems: planned.filter((s) => !solved.has(s)).flatMap(problemLink),
    leftTheory: plan.theory.filter((id) => !doneTheory.has(id)).flatMap(theoryLink),
    standing: streakStanding({ complete: day.complete, settled: date < state.today, freezeUsed: day.freezeUsed, freezeTokens: state.freezeTokens, streak: state.streak }),
    tomorrow: preview,
    pace: pace(date, solvedMain, mainProblemCount, settings),
    forecast: await getForecast(date, settings, solvedMain),
    ...(week ? { week } : {}),
    appUrl: env().APP_URL,
  });
  return recap ? { date, complete: day.complete, rest: day.kind === "rest", ...recap } : null;
}
