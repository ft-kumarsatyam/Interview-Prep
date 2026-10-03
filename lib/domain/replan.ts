/**
 * One-click fixes for a plan that doesn't fit (the "remedies" from lib/domain/feasibility.ts), as pure
 * edits to the planner inputs. Sunday (index 0) holds only reviews and the weekly quiz, so extra hours
 * never go there.
 */
import { addDays, type DateStr } from "./dates";

const MAX_DAY_HOURS = 12;
const STEP = 0.5;

export const extendEndDate = (endDate: DateStr, weeks: number): DateStr => addDays(endDate, Math.max(1, Math.round(weeks)) * 7);

/** Spread `extraPerWeek` hours over the study days, half an hour at a time, always to the lightest day under the cap. */
export function addWeeklyHours(hoursByDow: readonly number[], extraPerWeek: number): number[] {
  const hours = [...hoursByDow];
  const active = [1, 2, 3, 4, 5, 6].filter((d) => (hours[d] ?? 0) > 0);
  const days = active.length > 0 ? active : [1, 2, 3, 4, 5];
  let left = Math.ceil(Math.max(0, extraPerWeek) / STEP) * STEP;
  while (left > 0) {
    const open = days.filter((d) => (hours[d] ?? 0) + STEP <= MAX_DAY_HOURS);
    if (open.length === 0) break;
    const lightest = open.reduce((a, b) => ((hours[b] ?? 0) < (hours[a] ?? 0) ? b : a));
    hours[lightest] = (hours[lightest] ?? 0) + STEP;
    left -= STEP;
  }
  return hours;
}
