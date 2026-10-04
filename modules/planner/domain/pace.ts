import { addDays, eachDay, type DateStr } from "@/core/domain/dates";
import { dayWeight, revisionStart } from "@/modules/planner/domain/planner";
import type { PlanSettings } from "@/modules/planner/domain/plan-config";

/**
 * Main-track problems you'd have solved by the end of `date` if the plan were
 * followed exactly: linear over weighted study days until revision starts.
 */
export function idealSolvedBy(date: DateStr, totalMain: number, s: PlanSettings): number {
  const lastStudyDay = addDays(revisionStart(s), -1);
  if (date < s.startDate) return 0;
  if (date >= lastStudyDay) return totalMain;
  const weigh = (days: DateStr[]) => days.reduce((sum, d) => sum + dayWeight(d, s), 0);
  const total = weigh(eachDay(s.startDate, lastStudyDay));
  const done = weigh(eachDay(s.startDate, date));
  return total === 0 ? 0 : Math.round((totalMain * done) / total);
}

export interface Pace {
  ideal: number;
  solved: number;
  /** Positive when ahead of plan. */
  delta: number;
}

export function pace(date: DateStr, solvedMain: number, totalMain: number, s: PlanSettings): Pace {
  const ideal = idealSolvedBy(date, totalMain, s);
  return { ideal, solved: solvedMain, delta: solvedMain - ideal };
}
