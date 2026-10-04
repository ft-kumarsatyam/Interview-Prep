/**
 * Which days a backlog item may be placed on. From today up to the interview date, never a rest day or a day
 * outside the plan. Pure.
 */
import { addDays, type DateStr } from "@/core/domain/dates";
import { dayKind, type DayKind } from "@/modules/planner/domain/planner";
import type { PlanSettings } from "@/modules/planner/domain/plan-config";

export function isPullableDay(date: DateStr, today: DateStr, s: PlanSettings): boolean {
  if (date < today || date > s.endDate) return false;
  const kind = dayKind(date, s);
  return kind !== "rest" && kind !== "outside";
}

export interface PullDay {
  date: DateStr;
  kind: DayKind;
}

/** The next `count` days that can take an item, starting at `from` (usually tomorrow). */
export function pullableDays(from: DateStr, today: DateStr, s: PlanSettings, count = 6): PullDay[] {
  const out: PullDay[] = [];
  for (let d = from < today ? today : from, guard = 0; out.length < count && d <= s.endDate && guard < 120; d = addDays(d, 1), guard++) {
    if (isPullableDay(d, today, s)) out.push({ date: d, kind: dayKind(d, s) });
  }
  return out;
}
