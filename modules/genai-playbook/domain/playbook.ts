/**
 * GenAI interview playbook schedule: dates, progress and readiness maths. Separate from the syllabus plan, the
 * streak and the GenAI sprint. Pure.
 */
import type { DateStr } from "@/core/domain/dates";
import { READINESS_DOMAINS, MOCK_DIMENSIONS, type Plan, type PlanDay, type PlanTask, type PlanWeek, type ReadinessDomainId } from "@/modules/genai-playbook/domain/schemas";

export const TASK_KIND_LABEL: Record<PlanTask["kind"], string> = { learn: "Learn", build: "Build", drill: "Drill", review: "Review", dsa: "DSA" };

/** taskId → completion date YYYY-MM-DD. */
export type PlaybookCompleted = Readonly<Record<string, DateStr>>;

export interface PlaybookReview {
  kind: "readiness" | "mock";
  weekId: string;
  scores: Readonly<Record<string, number>>;
  note: string;
}

export const dayOf = (plan: Plan, date: DateStr): PlanDay | undefined => plan.days.find((d) => d.date === date);

export const weekById = (plan: Plan, id: string): PlanWeek | undefined => plan.weeks.find((w) => w.id === id);

export const daysInWeek = (plan: Plan, weekId: string): PlanDay[] => plan.days.filter((d) => d.week === weekId);

/** `before` until the first day, `after` once the last day has passed, otherwise `live`. */
export function phase(plan: Plan, today: DateStr): "before" | "live" | "after" {
  if (today < plan.start_date) return "before";
  if (today > plan.end_date) return "after";
  return "live";
}

/** The date the "today" page shows: today inside the window, otherwise the nearest edge. */
export function focusDate(plan: Plan, today: DateStr): DateStr {
  return today < plan.start_date ? plan.start_date : today > plan.end_date ? plan.end_date : today;
}

export const weekForDate = (plan: Plan, date: DateStr): PlanWeek | undefined => plan.weeks.find((w) => date >= w.start && date <= w.end);

export const tasksOfDay = (day: PlanDay | undefined): PlanTask[] => day?.tasks ?? [];

export function countDone(tasks: readonly PlanTask[], completed: PlaybookCompleted): { done: number; total: number; minutesDone: number; minutesTotal: number; pct: number } {
  let done = 0;
  let minutesDone = 0;
  let minutesTotal = 0;
  for (const t of tasks) {
    minutesTotal += t.minutes;
    if (t.id in completed) {
      done += 1;
      minutesDone += t.minutes;
    }
  }
  return { done, total: tasks.length, minutesDone, minutesTotal, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export const weekProgress = (plan: Plan, weekId: string, completed: PlaybookCompleted) => countDone(daysInWeek(plan, weekId).flatMap((d) => d.tasks), completed);

export const overallProgress = (plan: Plan, completed: PlaybookCompleted) => countDone(plan.days.flatMap((d) => d.tasks), completed);

/** First unfinished task on or after `from`, falling back to the first unfinished task anywhere. */
export function nextOpenTask(plan: Plan, completed: PlaybookCompleted, from: DateStr): { day: PlanDay; task: PlanTask } | null {
  const open = (days: readonly PlanDay[]) => {
    for (const day of days) for (const task of day.tasks) if (!(task.id in completed)) return { day, task };
    return null;
  };
  return open(plan.days.filter((d) => d.date >= from)) ?? open(plan.days);
}

/** Days from `today` (inclusive) to the end of the window, never negative. */
export const daysLeft = (plan: Plan, today: DateStr): number => Math.max(0, Math.round((Date.parse(plan.end_date) - Date.parse(today < plan.start_date ? plan.start_date : today)) / 86_400_000) + 1);

export const allTaskIds = (plan: Plan): Set<string> => new Set(plan.days.flatMap((d) => d.tasks.map((t) => t.id)));

/** Latest readiness score per domain across all saved weekly reviews (later weeks win). */
export function latestReadiness(reviews: readonly PlaybookReview[]): Partial<Record<ReadinessDomainId, number>> {
  const out: Partial<Record<ReadinessDomainId, number>> = {};
  for (const r of [...reviews].filter((x) => x.kind === "readiness").sort((a, b) => a.weekId.localeCompare(b.weekId)))
    for (const d of READINESS_DOMAINS) if (d.id in r.scores) out[d.id] = r.scores[d.id];
  return out;
}

/** Domains scored below 3 (the playbook says to schedule two focused sessions for each the following week). */
export const weakDomains = (latest: Partial<Record<ReadinessDomainId, number>>): ReadinessDomainId[] => READINESS_DOMAINS.filter((d) => (latest[d.id] ?? 0) < 3 && d.id in latest).map((d) => d.id);

/** Average of the six mock dimensions, one decimal, or null when none are scored. */
export function mockAverage(scores: Readonly<Record<string, number>>): number | null {
  const vals = MOCK_DIMENSIONS.map((d) => scores[d.id]).filter((v): v is number => typeof v === "number");
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}
