import { dayOfWeek, type DateStr } from "./dates";
import type { HeatState } from "./heatmap";
import type { DayKind } from "./planner";

export interface CalendarViewDay {
  date: DateStr;
  kind: DayKind;
  state: HeatState;
  dsaTarget: number;
  theoryTarget: number;
  reviews: number;
  estMinutes?: number;
  done: { dsa: number; theory: number; quiz: boolean } | null;
}

export interface MonthSummary {
  /** Plan days in the month up to and including today (rest and outside days excluded). */
  elapsed: number;
  complete: number;
  partial: number;
  missed: number;
  /** Plan days still ahead this month. */
  ahead: number;
  rest: number;
  dsaPlanned: number;
  dsaDone: number;
  theoryPlanned: number;
  theoryDone: number;
  /** Estimated hours of projected work left this month. */
  hoursAhead: number;
}

const isPlanDay = (k: DayKind) => k === "study" || k === "sunday" || k === "revision";

/** Totals for the month header: how the past days went and what is still ahead. */
export function summarizeMonth(days: readonly CalendarViewDay[], today: DateStr): MonthSummary {
  const s: MonthSummary = { elapsed: 0, complete: 0, partial: 0, missed: 0, ahead: 0, rest: 0, dsaPlanned: 0, dsaDone: 0, theoryPlanned: 0, theoryDone: 0, hoursAhead: 0 };
  let minutesAhead = 0;
  for (const d of days) {
    if (d.kind === "rest") s.rest++;
    if (!isPlanDay(d.kind)) continue;
    s.dsaPlanned += d.dsaTarget;
    s.theoryPlanned += d.theoryTarget;
    if (d.date > today) {
      s.ahead++;
      minutesAhead += d.estMinutes ?? 0;
      continue;
    }
    s.elapsed++;
    s.dsaDone += Math.min(d.done?.dsa ?? 0, d.dsaTarget);
    s.theoryDone += Math.min(d.done?.theory ?? 0, d.theoryTarget);
    if (d.state === "complete" || d.state === "freeze") s.complete++;
    else if (d.state === "partial") s.partial++;
    else if (d.state === "missed") s.missed++;
  }
  s.hoursAhead = Math.round(minutesAhead / 30) / 2;
  return s;
}

/** Share of a day's targets done (0-1), counting the quiz on plan days; null when nothing was due. */
export function dayProgress(d: Pick<CalendarViewDay, "kind" | "dsaTarget" | "theoryTarget" | "done">): number | null {
  if (!d.done || !isPlanDay(d.kind)) return null;
  const due = d.dsaTarget + d.theoryTarget + 1;
  const got = Math.min(d.done.dsa, d.dsaTarget) + Math.min(d.done.theory, d.theoryTarget) + (d.done.quiz ? 1 : 0);
  return Math.min(1, got / due);
}

/** Monday-first weeks for the agenda view; each week holds only days from the given list. */
export function groupByWeek<T extends { date: DateStr }>(days: readonly T[]): T[][] {
  const weeks: T[][] = [];
  for (const d of days) {
    if (weeks.length === 0 || dayOfWeek(d.date) === 1) weeks.push([]);
    weeks[weeks.length - 1]!.push(d);
  }
  return weeks;
}
