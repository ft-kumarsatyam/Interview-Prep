import { addDays, type DateStr } from "./dates";
import type { DayKind } from "./planner";

export interface SprintDay {
  date: DateStr;
  kind: DayKind;
  /** Frozen plans are real; projected ones follow your progress and can still change. */
  source: "frozen" | "projected" | "none";
  dsaTarget: number;
  dsaSolved: number;
  theoryTarget: number;
  theoryDone: number;
  reviews: number;
  quizPassed: boolean;
  complete: boolean;
  /** Minutes you logged studying that day. */
  minutes: number;
  estMinutes?: number;
}

export type SprintStatus = "upcoming" | "active" | "completed" | "behind";

export interface SprintSummary {
  status: SprintStatus;
  /** Work items planned for the whole week (problems + subtopics + quizzes). */
  planned: number;
  /** Work items planned for days up to and including today, and how many are done. */
  plannedToDate: number;
  doneToDate: number;
  /** done / planned for the days so far, as 0–1; null before the week starts. */
  completionRate: number | null;
  dsaPlanned: number;
  dsaDone: number;
  theoryPlanned: number;
  theoryDone: number;
  reviewsPlanned: number;
  quizzesPlanned: number;
  quizzesPassed: number;
  workDays: number;
  completeDays: number;
  minutes: number;
  estMinutes: number;
}

/** Plan week `week` (1-based) as an inclusive date range. */
export function sprintRange(week: number, startDate: DateStr): { from: DateStr; to: DateStr } {
  const from = addDays(startDate, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

const isWork = (k: DayKind) => k === "study" || k === "revision" || k === "sunday";

export function dayItems(d: Pick<SprintDay, "kind" | "dsaTarget" | "dsaSolved" | "theoryTarget" | "theoryDone" | "quizPassed">): { planned: number; done: number } {
  if (!isWork(d.kind)) return { planned: 0, done: 0 };
  if (d.kind === "sunday") return { planned: 1, done: d.quizPassed ? 1 : 0 };
  return {
    planned: d.dsaTarget + d.theoryTarget + 1,
    done: Math.min(d.dsaSolved, d.dsaTarget) + Math.min(d.theoryDone, d.theoryTarget) + (d.quizPassed ? 1 : 0),
  };
}

export function summarizeSprint(days: readonly SprintDay[], today: DateStr): SprintSummary {
  let planned = 0;
  let plannedToDate = 0;
  let doneToDate = 0;
  let workDays = 0;
  let completeDays = 0;
  let quizzesPlanned = 0;
  let quizzesPassed = 0;
  const sum = { dsaPlanned: 0, dsaDone: 0, theoryPlanned: 0, theoryDone: 0, reviewsPlanned: 0, minutes: 0, estMinutes: 0 };
  for (const d of days) {
    const it = dayItems(d);
    planned += it.planned;
    sum.minutes += d.minutes;
    sum.estMinutes += d.estMinutes ?? 0;
    sum.reviewsPlanned += d.reviews;
    if (!isWork(d.kind)) continue;
    workDays++;
    quizzesPlanned++;
    if (d.quizPassed) quizzesPassed++;
    if (d.complete) completeDays++;
    if (d.kind !== "sunday") {
      sum.dsaPlanned += d.dsaTarget;
      sum.theoryPlanned += d.theoryTarget;
      sum.dsaDone += Math.min(d.dsaSolved, d.dsaTarget);
      sum.theoryDone += Math.min(d.theoryDone, d.theoryTarget);
    }
    if (d.date <= today) {
      plannedToDate += it.planned;
      doneToDate += it.done;
    }
  }
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  let status: SprintStatus;
  if (!first || today < first) status = "upcoming";
  else if (last && today <= last) status = "active";
  else status = completeDays >= workDays ? "completed" : "behind";
  return {
    status,
    planned,
    plannedToDate,
    doneToDate,
    completionRate: first && today >= first && plannedToDate > 0 ? doneToDate / plannedToDate : null,
    quizzesPlanned,
    quizzesPassed,
    workDays,
    completeDays,
    ...sum,
  };
}
