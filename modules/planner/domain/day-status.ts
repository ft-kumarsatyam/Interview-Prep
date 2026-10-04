/**
 * The colour a calendar day gets. Light green = everything done, light orange = something left over,
 * light red = a day that was missed (or rest you did not plan), neutral = planned rest. A closed day whose
 * leftovers were done later reads "caught up" (green with a note). Pure.
 */
import type { DateStr } from "@/core/domain/dates";
import type { HeatState } from "@/modules/progress/domain/heatmap";
import type { DayKind } from "@/modules/planner/domain/planner";

export interface DayStatusInput {
  date: DateStr;
  today: DateStr;
  kind: DayKind;
  log: { dsaSolved: number; theoryDone: number; quizPassed: boolean; complete: boolean; freezeUsed: boolean } | null;
  /** True when the day left work undone and all of it has been done since. */
  caughtUp?: boolean;
}

export function dayState({ date, today, kind, log, caughtUp }: DayStatusInput): HeatState {
  if (kind === "outside" || date > today) return "future";
  if (kind === "rest") return "rest"; // a planned rest day is calm, never red or orange, and keeps the streak
  if (log?.complete) return "complete";
  if (log?.freezeUsed) return "freeze";
  if (caughtUp) return "caught-up";
  const worked = !!log && (log.dsaSolved > 0 || log.theoryDone > 0 || log.quizPassed);
  if (worked) return "partial"; // something is left over
  return date === today ? "idle" : "missed";
}

export const STATE_MEANING: Record<Exclude<HeatState, "future" | "idle">, string> = {
  complete: "Everything planned for the day was done.",
  partial: "Something is left over. It moves to the next days automatically.",
  missed: "Nothing was done, or you took an unplanned day off. The work moves forward.",
  rest: "A rest day you planned. It keeps your streak.",
  "caught-up": "A day that left work undone, and you have since done that work.",
  freeze: "A streak freeze covered this day.",
};
