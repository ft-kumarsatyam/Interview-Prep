import { dayOfWeek, type DateStr } from "@/core/domain/dates";
import type { PlanSettings } from "@/modules/planner/domain/plan-config";

export type Difficulty = "Easy" | "Medium" | "Hard";

/** Study hours by day of week, Sunday first (index = `dayOfWeek`). */
export const DEFAULT_HOURS: readonly number[] = [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6];

/**
 * What a normal day's count-based targets assume: a 3.5 h weekday, and a double
 * Saturday (the planner gives Saturday twice a weekday's DSA). Hours above or
 * below this scale the targets; at exactly this the plan is unchanged.
 */
export const BASELINE_WEEKDAY_MIN = 210;
export const BASELINE_SATURDAY_MIN = 2 * BASELINE_WEEKDAY_MIN;

/** Within this band of the baseline the legacy targets stand as they are. */
const IDENTITY_BAND = 0.05;
/** The fit pass trims above this and tops up below that, as a share of the budget. */
const FIT_HIGH = 1.1;
const FIT_LOW = 0.85;

export interface Costs {
  /** Minutes for a new problem, by difficulty. */
  dsa: Record<Difficulty, number>;
  resolve: number;
  theory: number;
  dailyQuiz: number;
  weeklyQuiz: number;
  news: number;
  js: number;
  sql: number;
  /** Saturday long-form design / LLD write-up. */
  writeUp: number;
}

export const DEFAULT_COSTS: Costs = {
  dsa: { Easy: 20, Medium: 35, Hard: 55 },
  resolve: 15,
  theory: 25,
  dailyQuiz: 10,
  weeklyQuiz: 30,
  news: 8,
  js: 20,
  sql: 15,
  writeUp: 90,
};

export function hoursFor(date: DateStr, s: Pick<PlanSettings, "hoursByDow">): number | undefined {
  const h = s.hoursByDow?.[dayOfWeek(date)];
  return h === undefined || Number.isNaN(h) ? undefined : h;
}

/** A date range with its own study hours, replacing the weekday default (an exam week, a lighter month). */
export interface HoursOverride {
  from: DateStr;
  to: DateStr;
  hours: number;
}

/** Hours for a date: a matching override wins over the weekday default. */
export function hoursOn(date: DateStr, s: Pick<PlanSettings, "hoursByDow">, overrides: readonly HoursOverride[] = []): number | undefined {
  const o = overrides.find((r) => date >= r.from && date <= r.to);
  return o ? o.hours : hoursFor(date, s);
}

export function baselineMinutes(date: DateStr): number {
  return dayOfWeek(date) === 6 ? BASELINE_SATURDAY_MIN : BASELINE_WEEKDAY_MIN;
}

/** True when the hours are close enough to the baseline that targets should not move. */
export function isBaseline(budgetMin: number, date: DateStr): boolean {
  return Math.abs(budgetMin / baselineMinutes(date) - 1) <= IDENTITY_BAND;
}

export function scaleCount(n: number, ratio: number, min: number, max: number): number {
  if (n <= 0) return 0;
  return Math.min(Math.max(Math.round(n * ratio), min), max);
}

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const SHRINK_WEIGHT = 5;
const HISTORY_WINDOW = 20;

export interface SolveTime {
  difficulty: Difficulty;
  minutes: number;
}

/**
 * Personalise the per-difficulty cost from how long you actually took. `history`
 * is newest first (first solves only). The median of the last 20 is pulled toward
 * the default (a few data points shouldn't swing the plan), capped at 3x the
 * default per sample so one forgotten timer can't skew it, and clamped to 0.5x-2x.
 */
export function estimateCosts(history: readonly SolveTime[], defaults: Costs = DEFAULT_COSTS): Costs {
  const dsa = { ...defaults.dsa };
  for (const difficulty of ["Easy", "Medium", "Hard"] as const) {
    const base = defaults.dsa[difficulty];
    const samples = history
      .filter((h) => h.difficulty === difficulty && h.minutes > 0)
      .slice(0, HISTORY_WINDOW)
      .map((h) => Math.min(h.minutes, base * 3));
    if (samples.length === 0) continue;
    const shrunk = (samples.length * median(samples) + SHRINK_WEIGHT * base) / (samples.length + SHRINK_WEIGHT);
    dsa[difficulty] = Math.round(Math.min(Math.max(shrunk, base * 0.5), base * 2));
  }
  return { ...defaults, dsa };
}

export interface BudgetItems {
  kind: "study" | "revision" | "sunday";
  saturday: boolean;
  /** Difficulty of each unsolved main problem, in plan order: the pool new DSA is drawn from. */
  dsaPool: readonly Difficulty[];
  dsa: number;
  theory: number;
  reviews: number;
  js: boolean;
  sql: boolean;
  news: boolean;
}

/** Minutes the items add up to, including the fixed blocks (quiz, news, Saturday write-up). */
export function estimateMinutes(items: BudgetItems, costs: Costs): number {
  const fixed =
    (items.kind === "sunday" ? costs.weeklyQuiz : costs.dailyQuiz) +
    (items.news ? costs.news : 0) +
    (items.js ? costs.js : 0) +
    (items.sql ? costs.sql : 0) +
    (items.saturday ? costs.writeUp : 0);
  const dsa = items.dsaPool.slice(0, items.dsa).reduce((sum, d) => sum + costs.dsa[d], 0);
  return fixed + dsa + items.reviews * costs.resolve + items.theory * costs.theory;
}

export interface FitLimits {
  /** Most new problems the plan may grow to. */
  dsaMax: number;
  theoryMax: number;
  /** Subtopics actually available to schedule. */
  theoryPool: number;
  reviewsDue: number;
}

/**
 * Trim a plan that overshoots the budget, or top up one that undershoots it.
 * Deterministic. Over 110%, drop in this order: SQL, JS, news, reviews (down to
 * 1), theory (to 1), DSA (to 1). The quiz is never dropped. Under 85%, add DSA,
 * then theory, then reviews, but only if the addition still fits.
 */
export function fitToBudget(items: BudgetItems, budgetMin: number, limits: FitLimits, costs: Costs): BudgetItems {
  const cur = { ...items };
  const est = () => estimateMinutes(cur, costs);
  const high = budgetMin * FIT_HIGH;
  const low = budgetMin * FIT_LOW;

  while (est() > high) {
    if (cur.sql) cur.sql = false;
    else if (cur.js) cur.js = false;
    else if (cur.news) cur.news = false;
    else if (cur.reviews > 1) cur.reviews--;
    else if (cur.theory > 1) cur.theory--;
    else if (cur.dsa > 1) cur.dsa--;
    else break;
  }

  const fits = (extra: number) => est() + extra <= high;
  for (let guard = 0; est() < low && guard < 50; guard++) {
    const nextDsa = cur.dsaPool[cur.dsa];
    if (cur.dsa < Math.min(limits.dsaMax, cur.dsaPool.length) && nextDsa !== undefined && fits(costs.dsa[nextDsa])) cur.dsa++;
    else if (cur.theory < Math.min(limits.theoryMax, limits.theoryPool) && fits(costs.theory)) cur.theory++;
    else if (cur.reviews < limits.reviewsDue && fits(costs.resolve)) cur.reviews++;
    else break;
  }
  return cur;
}

/**
 * Sunday: the weekly quiz and reviews stay, and whatever hours are left become an
 * optional bonus list. Never part of the day's completion, so the streak rules hold.
 */
export function sundayBonus(
  budgetMin: number,
  reviews: number,
  dsaPool: readonly Difficulty[],
  theoryPool: number,
  limits: { dsaMax: number; theoryMax: number },
  costs: Costs,
): { dsa: number; theory: number; estMinutes: number } {
  let used = costs.weeklyQuiz + reviews * costs.resolve;
  let dsa = 0;
  let theory = 0;
  while (dsa < Math.min(limits.dsaMax, dsaPool.length) && used + costs.dsa[dsaPool[dsa]!] <= budgetMin) {
    used += costs.dsa[dsaPool[dsa]!];
    dsa++;
  }
  while (theory < Math.min(limits.theoryMax, theoryPool) && used + costs.theory <= budgetMin) {
    used += costs.theory;
    theory++;
  }
  return { dsa, theory, estMinutes: used };
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}
