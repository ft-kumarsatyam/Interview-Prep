import { addDays, dayOfWeek, eachDay, saturdayOfWeek, weekNumber, type DateStr } from "./dates";
import {
  DSA_RAMP,
  REVIEWS_ON_SUNDAY,
  REVIEWS_PER_DAY,
  REVISION_DSA_PER_DAY,
  SQL_TRACK_START_WEEK,
  type PlanSettings,
} from "./plan-config";
import {
  DEFAULT_COSTS,
  baselineMinutes,
  estimateMinutes,
  fitToBudget,
  hoursFor,
  isBaseline,
  scaleCount,
  sundayBonus,
  type BudgetItems,
  type Costs,
  type Difficulty,
} from "./time-budget";

export type ProblemTrack = "main" | "js" | "sql";
export type DayKind = "study" | "sunday" | "rest" | "revision" | "outside";

export interface ProblemState {
  slug: string;
  track: ProblemTrack;
  order: number;
  solved: boolean;
  /** Used to cost the day in minutes; Medium when unknown. */
  difficulty?: Difficulty;
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
  /** Hours the day was planned for, when planning by hours. */
  hours?: number;
  /** Rough minutes the plan adds up to. */
  estMinutes?: number;
  /** Sunday only: optional extra work from the day's spare hours. Never part of completion. */
  bonusDsa?: string[];
  bonusTheory?: string[];
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
  /** Plan this one day for this many hours instead of the weekday default (the "hours today" override). */
  hoursOverride?: number;
  costs?: Costs;
}): DailyPlanDraft {
  const { date, settings: s } = input;
  const kind = dayKind(date, s);
  const week = weekNumber(date, s.startDate);
  const costs = input.costs ?? DEFAULT_COSTS;

  const unsolved = (track: ProblemTrack) =>
    input.problems.filter((p) => p.track === track && !p.solved).sort((a, b) => a.order - b.order);
  const mainLeft = unsolved("main");

  const reviewLimit = kind === "sunday" ? REVIEWS_ON_SUNDAY : REVIEWS_PER_DAY;
  const dueReviews =
    kind === "outside" || kind === "rest"
      ? []
      : input.reviews
          .filter((r) => r.nextReviewAt <= date)
          .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
          .map((r) => r.slug);
  const dsaReview = dueReviews.slice(0, reviewLimit);

  const isWorkday = kind === "study" || kind === "revision";
  const dsaTarget = computeDsaTarget(date, mainLeft.length, s);
  const theory = computeTheory(date, input.subtopics, s);
  const jsProblem = isWorkday ? (unsolved("js")[0]?.slug ?? null) : null;
  const sqlProblem = isWorkday && week >= SQL_TRACK_START_WEEK ? (unsolved("sql")[0]?.slug ?? null) : null;

  const legacy: DailyPlanDraft = {
    date,
    weekNumber: week,
    kind,
    dsaTarget,
    dsaNew: mainLeft.slice(0, dsaTarget).map((p) => p.slug),
    dsaReview,
    jsProblem,
    sqlProblem,
    theoryTarget: theory.target,
    theory: theory.ids,
  };

  const hours = input.hoursOverride ?? hoursFor(date, s);
  if (hours === undefined || (kind !== "study" && kind !== "revision" && kind !== "sunday")) return legacy;
  const budgetMin = hours * 60;

  const dsaPool = mainLeft.map((p) => p.difficulty ?? "Medium");
  const dueIds = input.subtopics
    .filter((t) => !t.done && t.week <= week)
    .sort((a, b) => a.position - b.position)
    .map((t) => t.id);
  const itemsOf = (n: { dsa: number; theory: number; reviews: number }): BudgetItems => ({
    kind,
    saturday: dayOfWeek(date) === 6 && isWorkday,
    dsaPool,
    dsa: n.dsa,
    theory: n.theory,
    reviews: n.reviews,
    js: !!jsProblem,
    sql: !!sqlProblem,
    news: isWorkday,
  });

  if (kind === "sunday") {
    const reviews = dsaReview.length;
    const bonus = sundayBonus(budgetMin, reviews, dsaPool, dueIds.length, { dsaMax: s.maxDailyDsa, theoryMax: s.maxDailyTheory }, costs);
    return {
      ...legacy,
      hours,
      estMinutes: bonus.estMinutes,
      bonusDsa: mainLeft.slice(0, bonus.dsa).map((p) => p.slug),
      bonusTheory: dueIds.slice(0, bonus.theory),
    };
  }

  const base = itemsOf({ dsa: dsaTarget, theory: theory.target, reviews: dsaReview.length });
  if (isBaseline(budgetMin, date)) return { ...legacy, hours, estMinutes: Math.round(estimateMinutes(base, costs)) };

  const ratio = budgetMin / baselineMinutes(date);
  const scaled = itemsOf({
    dsa: scaleCount(dsaTarget, ratio, Math.min(1, mainLeft.length), mainLeft.length),
    theory: scaleCount(theory.target, ratio, Math.min(1, dueIds.length), s.maxDailyTheory),
    reviews: Math.min(dueReviews.length, Math.max(1, scaleCount(dsaReview.length, ratio, 0, reviewLimit + 2))),
  });
  const fitted = fitToBudget(
    scaled,
    budgetMin,
    { dsaMax: Math.max(s.maxDailyDsa + 2, dsaTarget), theoryMax: s.maxDailyTheory, theoryPool: dueIds.length, reviewsDue: dueReviews.length },
    costs,
  );
  return {
    ...legacy,
    dsaTarget: fitted.dsa,
    dsaNew: mainLeft.slice(0, fitted.dsa).map((p) => p.slug),
    dsaReview: dueReviews.slice(0, fitted.reviews),
    jsProblem: fitted.js ? jsProblem : null,
    sqlProblem: fitted.sql ? sqlProblem : null,
    theoryTarget: fitted.theory,
    theory: dueIds.slice(0, fitted.theory),
    hours,
    estMinutes: Math.round(estimateMinutes(fitted, costs)),
  };
}

/**
 * Preview future days by planning each one as if every earlier planned item were done: solved problems
 * leave the pool, finished subtopics leave the theory queue, and planned reviews are cleared. `seed`
 * (usually today's frozen plan) is treated as done first. A projection, not a promise: real plans are
 * only frozen on the day itself and follow your actual progress.
 */
export function projectDays(input: {
  from: DateStr;
  to: DateStr;
  settings: PlanSettings;
  problems: ProblemState[];
  reviews: ReviewState[];
  subtopics: SubtopicState[];
  costs?: Costs;
  seed?: Pick<DailyPlanDraft, "dsaNew" | "dsaReview" | "jsProblem" | "sqlProblem" | "theory">;
}): DailyPlanDraft[] {
  const solved = new Set(input.problems.filter((p) => p.solved).map((p) => p.slug));
  const done = new Set(input.subtopics.filter((t) => t.done).map((t) => t.id));
  const reviewed = new Set<string>();
  const markDone = (p: NonNullable<typeof input.seed>) => {
    for (const slug of [...p.dsaNew, p.jsProblem, p.sqlProblem]) if (slug) solved.add(slug);
    for (const slug of p.dsaReview) reviewed.add(slug);
    for (const id of p.theory) done.add(id);
  };
  if (input.seed) markDone(input.seed);

  const out: DailyPlanDraft[] = [];
  for (const date of eachDay(input.from, input.to)) {
    const plan = buildDailyPlan({
      date,
      settings: input.settings,
      problems: input.problems.map((p) => (p.solved || !solved.has(p.slug) ? p : { ...p, solved: true })),
      reviews: input.reviews.filter((r) => !reviewed.has(r.slug)),
      subtopics: input.subtopics.map((t) => (t.done || !done.has(t.id) ? t : { ...t, done: true })),
      costs: input.costs,
    });
    out.push(plan);
    markDone(plan);
  }
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
