import { addDays, eachDay, weekNumber, type DateStr } from "./dates";
import { MAX_REST_DAYS } from "./settings";

/**
 * Pausing is the rest-day mechanism: a paused day is a rest day, so it carries no targets and counts as complete.
 * Like `mergeRestDays`, nothing on or before today is ever touched, and nothing lands outside the plan
 * (before its start, after the interview date, or inside the revision phase when `revisionStart` is given).
 */
export interface PauseWindow {
  today: DateStr;
  existingRest: readonly DateStr[];
  planStart: DateStr;
  planEnd: DateStr;
  /** First day of the revision phase. Days from here on are never paused. */
  revisionStart?: DateStr;
}

export interface PauseResult {
  restDays: DateStr[];
  added: DateStr[];
  removed: DateStr[];
  /** Some requested days were left out because MAX_REST_DAYS was reached. */
  capped: boolean;
}

const sorted = (days: Iterable<DateStr>): DateStr[] => [...new Set(days)].toSorted();

/** The last day that may be paused. */
function lastPausable(w: PauseWindow): DateStr {
  return w.revisionStart && addDays(w.revisionStart, -1) < w.planEnd ? addDays(w.revisionStart, -1) : w.planEnd;
}

/** Add `days` to the rest days, keeping only future days inside the plan, up to the rest-day limit. */
export function pauseDays(input: PauseWindow & { days: readonly DateStr[] }): PauseResult {
  const existing = sorted(input.existingRest);
  const last = lastPausable(input);
  const wanted = sorted(input.days).filter((d) => d > input.today && d >= input.planStart && d <= last && !existing.includes(d));
  const room = Math.max(0, MAX_REST_DAYS - existing.length);
  const added = wanted.slice(0, room);
  return { restDays: sorted([...existing, ...added]), added, removed: [], capped: wanted.length > added.length };
}

/** Pause `count` days starting tomorrow. */
export function pauseNext(input: PauseWindow & { count: number }): PauseResult {
  const from = addDays(input.today, 1);
  return pauseDays({ ...input, days: input.count > 0 ? eachDay(from, addDays(from, input.count - 1)) : [] });
}

/** The plan's own week (7 days counted from the plan start) that contains `date`; before the start it is week 1. */
export function planWeekEnd(date: DateStr, planStart: DateStr): DateStr {
  const week = Math.max(1, weekNumber(date, planStart));
  return addDays(planStart, week * 7 - 1);
}

/** Pause every remaining day of the current plan week, from tomorrow to the week's last day. */
export function skipRestOfWeek(input: PauseWindow): PauseResult {
  return pauseDays({ ...input, days: eachDay(addDays(input.today, 1), planWeekEnd(input.today, input.planStart)) });
}

/** Take the future rest days back out. Today and earlier stay as they are. */
export function resume(input: Pick<PauseWindow, "today" | "existingRest">): PauseResult {
  const existing = sorted(input.existingRest);
  const removed = existing.filter((d) => d > input.today);
  return { restDays: existing.filter((d) => d <= input.today), added: [], removed, capped: false };
}

/** How many future rest days exist (what `resume` would remove). */
export const futureRestCount = (existingRest: readonly DateStr[], today: DateStr): number => existingRest.filter((d) => d > today).length;
