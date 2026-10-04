/**
 * Streak views, derived from the day records on read. None of this changes how a day completes or how a streak is
 * counted (see streak.ts): the daily quiz still decides completion, and a freeze is still spent automatically at
 * settle time. This only makes the streak easier to see: the time left, freeze progress, the week so far, past
 * runs, milestones, and separate per-activity runs. Pure.
 */
import { addDays, dayOfWeek, startOfNextLocalDayMs, type DateStr } from "@/core/domain/dates";
import { FREEZE_EARNED_EVERY, MAX_FREEZE_TOKENS } from "@/modules/planner/domain/plan-config";

export interface StreakDay {
  date: DateStr;
  complete: boolean;
  freezeUsed: boolean;
}

const keeps = (d: StreakDay | undefined) => !!d && (d.complete || d.freezeUsed);

/* ------------------------------- time left today ------------------------------- */

export type RiskLevel = "none" | "safe" | "warn" | "critical";

export interface StreakRisk {
  level: RiskLevel;
  hoursLeft: number;
  /** A freeze token would cover a miss. */
  coveredByFreeze: boolean;
  /** What is still needed to complete today (labels from the dashboard requirements). */
  left: string[];
  message: string;
}

export const RISK_WARN_HOURS = 6;
export const RISK_CRITICAL_HOURS = 2;

const clock = (hours: number) => {
  const mins = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`;
};

/** How worried to be about today. Quiet when the day is done, is a rest day, or there is no streak to lose. */
export function streakRisk(input: { kind: string; complete: boolean; streak: number; tokens: number; now: Date; timeZone: string; left: readonly string[] }): StreakRisk {
  const hoursLeft = Math.max(0, (startOfNextLocalDayMs(input.now, input.timeZone) - input.now.getTime()) / 3_600_000);
  const playable = input.kind === "study" || input.kind === "revision" || input.kind === "sunday";
  const covered = input.tokens > 0;
  if (input.complete || !playable || input.streak <= 0) return { level: "none", hoursLeft, coveredByFreeze: covered, left: [], message: "" };
  const level: RiskLevel = hoursLeft <= RISK_CRITICAL_HOURS ? "critical" : hoursLeft <= RISK_WARN_HOURS ? "warn" : "safe";
  const cover = covered ? "A freeze will cover you if you miss it." : "You have no freeze: a miss ends the streak.";
  return { level, hoursLeft, coveredByFreeze: covered, left: [...input.left], message: `${clock(hoursLeft)} left to keep your ${input.streak}-day streak. ${cover}` };
}

/* ------------------------------- freeze tokens ------------------------------- */

export interface FreezeProgress {
  tokens: number;
  max: number;
  atCap: boolean;
  /** Days into the current 7-day stretch, and the days still to go for the next token (null at the cap). */
  into: number;
  every: number;
  daysToNext: number | null;
  label: string;
}

export function freezeProgress(streak: number, tokens: number): FreezeProgress {
  const every = FREEZE_EARNED_EVERY;
  const max = MAX_FREEZE_TOKENS;
  const atCap = tokens >= max;
  const into = streak % every;
  const daysToNext = atCap ? null : every - into;
  const label = atCap
    ? `You hold the most freezes (${max}). Extra ones are not earned until you use one.`
    : `${daysToNext} more day${daysToNext === 1 ? "" : "s"} in a row for your next freeze (one every ${every} days, up to ${max}).`;
  return { tokens, max, atCap, into, every, daysToNext, label };
}

/* ------------------------------- the week so far ------------------------------- */

export type WeekCell = { date: DateStr; state: "kept" | "today" | "missed" | "future" };

/** Monday to Sunday of the week containing `today`: kept days are complete or covered by a freeze. */
export function weekRing(days: ReadonlyMap<DateStr, StreakDay>, today: DateStr): { cells: WeekCell[]; kept: number; elapsed: number } {
  const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
  const cells: WeekCell[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    if (date > today) return { date, state: "future" as const };
    if (keeps(days.get(date))) return { date, state: "kept" as const };
    return { date, state: date === today ? ("today" as const) : ("missed" as const) };
  });
  return { cells, kept: cells.filter((c) => c.state === "kept").length, elapsed: cells.filter((c) => c.state !== "future").length };
}

/* ------------------------------- runs and milestones ------------------------------- */

export interface StreakRun {
  start: DateStr;
  end: DateStr;
  /** Completed days in the run. A freeze day bridges a gap and adds nothing, as in the live streak. */
  length: number;
  freezes: number;
}

/** Every unbroken stretch of kept days, oldest first. */
export function streakRuns(days: Iterable<StreakDay>): StreakRun[] {
  const sorted = [...days].filter(keeps).sort((a, b) => a.date.localeCompare(b.date));
  const runs: StreakRun[] = [];
  let cur: StreakRun | null = null;
  for (const d of sorted) {
    if (cur && addDays(cur.end, 1) === d.date) {
      cur.end = d.date;
    } else {
      if (cur) runs.push(cur);
      cur = { start: d.date, end: d.date, length: 0, freezes: 0 };
    }
    if (d.complete) cur.length++;
    else cur.freezes++;
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.length > 0);
}

export const MILESTONES = [7, 14, 30, 50, 100, 200, 365] as const;

export function nextMilestone(streak: number): { target: number; daysAway: number } | null {
  const target = MILESTONES.find((m) => m > streak);
  return target === undefined ? null : { target, daysAway: target - streak };
}

/** The milestone a streak of exactly this length has just reached, if any. */
export const milestoneAt = (streak: number): number | null => ((MILESTONES as readonly number[]).includes(streak) ? streak : null);

/**
 * What to celebrate when a day completes: a milestone, or the moment this run passes the best EARLIER run (once, not
 * every day after). `previousBest` is the longest run before the current one, so a first run never "beats" itself.
 */
export function celebrationFor(streak: number, previousBest: number): { kind: "milestone"; days: number } | { kind: "best"; days: number } | null {
  const m = milestoneAt(streak);
  if (m !== null) return { kind: "milestone", days: m };
  if (previousBest >= 3 && streak === previousBest + 1) return { kind: "best", days: streak };
  return null;
}

/* ------------------------------- per-activity runs ------------------------------- */

export interface ActivityRun {
  current: number;
  best: number;
}

/** Consecutive-day runs of one activity. Today not done yet does not break the current run. */
export function runStats(dates: ReadonlySet<DateStr>, today: DateStr): ActivityRun {
  let current = 0;
  for (let d = dates.has(today) ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) current++;
  let best = 0;
  let run = 0;
  let prev: DateStr | null = null;
  for (const d of [...dates].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}
