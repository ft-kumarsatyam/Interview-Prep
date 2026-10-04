/**
 * Guard-rails on how much unfinished work has been pushed forward. They warn and offer fixes; they never
 * block moving work, and the interview date is never one of the fixes. Pure.
 */
import { addDays, type DateStr } from "@/core/domain/dates";
import type { CatchUp } from "@/modules/planner/domain/catch-up";

export interface CarryLimits {
  /** Most items one day may leave open before you are warned. */
  perDay: number;
  /** Most open items from the last 7 days. */
  perWeek: number;
  /** Most owed items overall (the backlog size). */
  total: number;
}

export const DEFAULT_CARRY_LIMITS: CarryLimits = { perDay: 4, perWeek: 10, total: 25 };
export const CARRY_LIMIT_MAX = 200;

export type CarryLevel = "ok" | "warn" | "over";

export type Remedy =
  | { kind: "extend-hours"; label: string }
  | { kind: "snooze-optional"; label: string }
  | { kind: "weekend-hours"; label: string }
  | { kind: "accept"; label: string };

export interface CarryStatus {
  level: CarryLevel;
  /** The numbers behind the verdict, so the banner can show them. */
  perDay: number;
  perWeek: number;
  total: number;
  reasons: string[];
  remedies: Remedy[];
}

/** Valid limits only: whole numbers from 1 up, falling back to the default for anything else. */
export function cleanLimits(l: Partial<CarryLimits> | null | undefined): CarryLimits {
  const pick = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(CARRY_LIMIT_MAX, Math.max(1, Math.round(v))) : d);
  return { perDay: pick(l?.perDay, DEFAULT_CARRY_LIMITS.perDay), perWeek: pick(l?.perWeek, DEFAULT_CARRY_LIMITS.perWeek), total: pick(l?.total, DEFAULT_CARRY_LIMITS.total) };
}

const itemsOf = (c: CatchUp) => (c.caughtUp ? 0 : c.remaining.dsa + c.remaining.theory + (c.remaining.quiz ? 1 : 0));

/**
 * `open` is the catch-up result for the closed days; `owed` is the backlog size. A level is "warn" past a
 * limit and "over" past double the limit.
 */
export function carryStatus(input: { open: readonly CatchUp[]; owed: number; today: DateStr; limits: CarryLimits; todayIsStudyDay: boolean }): CarryStatus {
  const { open, owed, today, limits } = input;
  const weekFrom = addDays(today, -6);
  const perDay = open.reduce((m, c) => Math.max(m, itemsOf(c)), 0);
  const perWeek = open.filter((c) => c.date >= weekFrom && c.date <= today).reduce((s, c) => s + itemsOf(c), 0);

  const reasons: string[] = [];
  let level: CarryLevel = "ok";
  const check = (value: number, limit: number, text: string) => {
    if (value <= limit) return;
    reasons.push(text);
    level = value > limit * 2 || level === "over" ? "over" : "warn";
  };
  check(perDay, limits.perDay, `One day left ${perDay} items open (limit ${limits.perDay}).`);
  check(perWeek, limits.perWeek, `${perWeek} items are open from the last 7 days (limit ${limits.perWeek}).`);
  check(owed, limits.total, `${owed} items are owed in total (limit ${limits.total}).`);

  const remedies: Remedy[] = [];
  if (level !== "ok") {
    if (input.todayIsStudyDay) remedies.push({ kind: "extend-hours", label: "Add an hour today" });
    remedies.push({ kind: "weekend-hours", label: "Use the weekend bonus hours" });
    remedies.push({ kind: "snooze-optional", label: "Pause optional items (reading, design, mocks) for a week" });
    remedies.push({ kind: "accept", label: "Keep it as it is" });
  }
  return { level, perDay, perWeek, total: owed, reasons, remedies };
}
