import { eachDay, type DateStr } from "@/core/domain/dates";
import { dayState } from "@/modules/planner/domain/day-status";
import type { DayKind } from "@/modules/planner/domain/planner";

export type HeatState = "future" | "missed" | "partial" | "complete" | "freeze" | "idle" | "rest" | "caught-up";

export interface HeatLog {
  date: DateStr;
  dsaSolved: number;
  theoryDone: number;
  quizPassed: boolean;
  complete: boolean;
  freezeUsed: boolean;
}

export interface HeatCell {
  date: DateStr;
  state: HeatState;
  dsaSolved: number;
  theoryDone: number;
}

export interface HeatOptions {
  /** What kind of day each date is. Without it every day is treated as a study day. */
  kindOf?: (date: DateStr) => DayKind;
  /** Closed days that left work undone and have since been caught up. */
  caughtUp?: ReadonlySet<DateStr>;
}

/**
 * One cell per day from `from` to `to`. Past days with no work are "missed"; today with no work yet is
 * "idle" (still in progress). With `kindOf`, planned rest days read "rest" instead of "complete".
 */
export function heatmapCells(from: DateStr, to: DateStr, today: DateStr, logs: HeatLog[], opts: HeatOptions = {}): HeatCell[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  return eachDay(from, to).map((date) => {
    const log = byDate.get(date);
    const dsaSolved = log?.dsaSolved ?? 0;
    const theoryDone = log?.theoryDone ?? 0;
    const state = dayState({ date, today, kind: opts.kindOf?.(date) ?? "study", log: log ?? null, caughtUp: opts.caughtUp?.has(date) });
    return { date, state, dsaSolved, theoryDone };
  });
}
