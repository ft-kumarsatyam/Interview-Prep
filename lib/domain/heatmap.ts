import { eachDay, type DateStr } from "./dates";

export type HeatState = "future" | "missed" | "partial" | "complete" | "freeze" | "idle";

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

/**
 * One cell per day from `from` to `to`. Past days with no work are "missed";
 * today with no work yet is "idle" (still in progress).
 */
export function heatmapCells(from: DateStr, to: DateStr, today: DateStr, logs: HeatLog[]): HeatCell[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  return eachDay(from, to).map((date) => {
    const log = byDate.get(date);
    const dsaSolved = log?.dsaSolved ?? 0;
    const theoryDone = log?.theoryDone ?? 0;
    let state: HeatState;
    if (date > today) state = "future";
    else if (log?.complete) state = "complete";
    else if (log?.freezeUsed) state = "freeze";
    else if (dsaSolved > 0 || theoryDone > 0 || log?.quizPassed) state = "partial";
    else state = date === today ? "idle" : "missed";
    return { date, state, dsaSolved, theoryDone };
  });
}
