import { addDays, dayOfWeek, eachDay, saturdayOfWeek, weekNumber, type DateStr } from "./dates";
import {
  DSA_RAMP,
  REVIEWS_ON_SUNDAY,
  REVIEWS_PER_DAY,
  REVISION_DSA_PER_DAY,
  SQL_TRACK_START_WEEK,
  type PlanSettings,
} from "./plan-config";

export type ProblemTrack = "main" | "js" | "sql";
export type DayKind = "study" | "sunday" | "rest" | "revision" | "outside";

export interface ProblemState {
  slug: string;
  track: ProblemTrack;
  order: number;
  solved: boolean;
}

export interface ReviewState {
  slug: string;
  nextReviewAt: DateStr;
}

export interface SubtopicState {
  id: string;
  week: number;
  /** Global syllabus position, used to keep a stable study order. */
  position: number;
  done: boolean;
}

export interface DailyPlanDraft {
  date: DateStr;
  weekNumber: number;
  kind: DayKind;
  dsaTarget: number;
  dsaNew: string[];
  dsaReview: string[];
  jsProblem: string | null;
  sqlProblem: string | null;
  theoryTarget: number;
  theory: string[];
}

export function revisionStart(s: PlanSettings): DateStr {
  return addDays(s.endDate, -7 * s.revisionWeeks + 1);
}

export function dayKind(date: DateStr, s: PlanSettings): DayKind {
  if (date < s.startDate || date > s.endDate) return "outside";
  if (s.restDays.includes(date)) return "rest";
  if (dayOfWeek(date) === 0) return "sunday";
  if (date >= revisionStart(s)) return "revision";
  return "study";
}

/** Saturday counts double, Sunday and rest days count zero. */
export function dayWeight(date: DateStr, s: PlanSettings): number {
  const kind = dayKind(date, s);
  if (kind === "outside" || kind === "rest" || kind === "sunday") return 0;
  return dayOfWeek(date) === 6 ? 2 : 1;
}

/** How many problems today's plan asks for. */
export function computeDsaTarget(date: DateStr, remainingMain: number, s: PlanSettings): number {
  const kind = dayKind(date, s);
  const weight = dayWeight(date, s);
  if (weight === 0) return 0;
  if (kind === "revision") return REVISION_DSA_PER_DAY * weight;
  if (remainingMain === 0) return 0;

  const week = weekNumber(date, s.startDate);
  const ramp = DSA_RAMP.find((r) => week <= r.untilWeek);
  if (ramp) return Math.min(ramp.perDay * weight, remainingMain);

  const studyDays = eachDay(date, addDays(revisionStart(s), -1));
  const weightedDays = studyDays.reduce((sum, d) => sum + dayWeight(d, s), 0);
  const perUnit = clamp(Math.ceil(remainingMain / Math.max(weightedDays, 1)), s.minDailyDsa, s.maxDailyDsa);
  const target = weight === 2 ? Math.min(perUnit * 2, s.maxSaturdayDsa) : perUnit;
  return Math.min(target, remainingMain);
}

/** Theory spreads the subtopics due by this week over the study days left in it. */
export function computeTheory(
  date: DateStr,
  subtopics: SubtopicState[],
  s: PlanSettings,
): { target: number; ids: string[] } {
  if (dayWeight(date, s) === 0) return { target: 0, ids: [] };
  const week = weekNumber(date, s.startDate);
  const due = subtopics
    .filter((t) => !t.done && t.week <= week)
    .sort((a, b) => a.position - b.position);
  if (due.length === 0) return { target: 0, ids: [] };

  const daysLeft = eachDay(date, saturdayOfWeek(date)).filter((d) => dayWeight(d, s) > 0).length;
  const target = clamp(Math.ceil(due.length / Math.max(daysLeft, 1)), 1, s.maxDailyTheory);
  return { target, ids: due.slice(0, target).map((t) => t.id) };
}

export function buildDailyPlan(input: {
  date: DateStr;
  settings: PlanSettings;
  problems: ProblemState[];
  reviews: ReviewState[];
  subtopics: SubtopicState[];
}): DailyPlanDraft {
  const { date, settings: s } = input;
  const kind = dayKind(date, s);
  const week = weekNumber(date, s.startDate);

  const unsolved = (track: ProblemTrack) =>
    input.problems.filter((p) => p.track === track && !p.solved).sort((a, b) => a.order - b.order);
  const mainLeft = unsolved("main");

  const reviewLimit = kind === "sunday" ? REVIEWS_ON_SUNDAY : REVIEWS_PER_DAY;
  const dsaReview =
    kind === "outside" || kind === "rest"
      ? []
      : input.reviews
          .filter((r) => r.nextReviewAt <= date)
          .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
          .slice(0, reviewLimit)
          .map((r) => r.slug);

  const isWorkday = kind === "study" || kind === "revision";
  const dsaTarget = computeDsaTarget(date, mainLeft.length, s);
  const theory = computeTheory(date, input.subtopics, s);

  return {
    date,
    weekNumber: week,
    kind,
    dsaTarget,
    dsaNew: mainLeft.slice(0, dsaTarget).map((p) => p.slug),
    dsaReview,
    jsProblem: isWorkday ? (unsolved("js")[0]?.slug ?? null) : null,
    sqlProblem: isWorkday && week >= SQL_TRACK_START_WEEK ? (unsolved("sql")[0]?.slug ?? null) : null,
    theoryTarget: theory.target,
    theory: theory.ids,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
