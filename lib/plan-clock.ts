import { diffDays, toLocalDate, weekNumber, type DateStr } from "./domain/dates";
import { DEFAULT_SETTINGS, phaseForWeek, type Phase, type PlanSettings } from "./domain/plan-config";

export interface PlanClock {
  today: DateStr;
  /** 0 before the plan starts. */
  week: number;
  totalWeeks: number;
  phase: Phase | null;
  daysUntilStart: number;
  daysLeft: number;
}

export function planClock(settings: PlanSettings = DEFAULT_SETTINGS, now = new Date()): PlanClock {
  const today = toLocalDate(now, settings.timezone);
  const totalWeeks = weekNumber(settings.endDate, settings.startDate);
  const started = today >= settings.startDate;
  const week = started ? Math.min(weekNumber(today, settings.startDate), totalWeeks) : 0;
  return {
    today,
    week,
    totalWeeks,
    phase: phaseForWeek(week, totalWeeks),
    daysUntilStart: started ? 0 : diffDays(settings.startDate, today),
    daysLeft: Math.max(diffDays(settings.endDate, today), 0),
  };
}

export function formatDate(date: DateStr, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
