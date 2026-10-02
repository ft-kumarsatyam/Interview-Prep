import { addDays, eachDay, type DateStr } from "./dates";
import { FREEZE_EARNED_EVERY, MAX_FREEZE_TOKENS } from "./plan-config";
import type { DayKind } from "./planner";

export interface DayProgress {
  kind: DayKind;
  dsaTarget: number;
  dsaSolved: number;
  theoryTarget: number;
  theoryDone: number;
  /** Daily quiz on study days, weekly quiz on Sundays. */
  quizPassed: boolean;
}

export interface DayRecord {
  date: DateStr;
  complete: boolean;
  freezeUsed: boolean;
}

export type StreakEvent =
  | { type: "freeze-used"; date: DateStr }
  | { type: "freeze-earned"; date: DateStr; streak: number }
  | { type: "streak-broken"; date: DateStr };

/** The quiz opens once some real work is logged, so it can't be taken cold. */
export function isQuizUnlocked(p: Pick<DayProgress, "kind" | "dsaSolved" | "dsaTarget" | "theoryDone" | "theoryTarget">): boolean {
  if (p.kind === "outside" || p.kind === "rest") return false;
  if (p.kind === "sunday") return true;
  return p.dsaSolved >= Math.min(1, p.dsaTarget) && p.theoryDone >= Math.min(1, p.theoryTarget);
}

export function isDayComplete(p: DayProgress): boolean {
  switch (p.kind) {
    case "outside":
      return false;
    case "rest":
      return true;
    case "sunday":
      return p.quizPassed;
    default:
      return p.dsaSolved >= p.dsaTarget && p.theoryDone >= p.theoryTarget && p.quizPassed;
  }
}

const keeps = (r: DayRecord | undefined) => !!r && (r.complete || r.freezeUsed);

/** Completed days in the unbroken chain ending exactly on `date`. Freeze days bridge but don't add. */
export function streakEndingAt(records: Map<DateStr, DayRecord>, date: DateStr): number {
  let count = 0;
  for (let d = date; keeps(records.get(d)); d = addDays(d, -1)) {
    if (records.get(d)!.complete) count++;
  }
  return count;
}

/** Today still in progress doesn't break the streak: fall back to yesterday's chain. */
export function currentStreak(records: Map<DateStr, DayRecord>, today: DateStr): number {
  return keeps(records.get(today)) ? streakEndingAt(records, today) : streakEndingAt(records, addDays(today, -1));
}

export function bestStreak(records: Iterable<DayRecord>): number {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let run = 0;
  let prev: DateStr | null = null;
  for (const r of sorted) {
    const contiguous = prev !== null && addDays(prev, 1) === r.date;
    if (!keeps(r)) run = 0;
    else run = (contiguous ? run : 0) + (r.complete ? 1 : 0);
    best = Math.max(best, run);
    prev = r.date;
  }
  return best;
}

/**
 * Close out past days in order: spend a freeze token on a missed day if the
 * streak is alive, and earn a token every 7 completed days in a row.
 * Days before `from` are assumed settled already.
 */
export function settleDays(input: {
  records: Map<DateStr, DayRecord>;
  from: DateStr;
  to: DateStr;
  freezeTokens: number;
}): { records: Map<DateStr, DayRecord>; freezeTokens: number; changed: DayRecord[]; events: StreakEvent[] } {
  const records = new Map(input.records);
  const changed: DayRecord[] = [];
  const events: StreakEvent[] = [];
  let tokens = input.freezeTokens;

  for (const date of eachDay(input.from, input.to)) {
    const rec = records.get(date) ?? { date, complete: false, freezeUsed: false };
    if (rec.complete) {
      const streak = streakEndingAt(records, date);
      if (streak > 0 && streak % FREEZE_EARNED_EVERY === 0 && tokens < MAX_FREEZE_TOKENS) {
        tokens++;
        events.push({ type: "freeze-earned", date, streak });
      }
      continue;
    }
    if (rec.freezeUsed) continue;

    const alive = streakEndingAt(records, addDays(date, -1)) > 0;
    if (alive && tokens > 0) {
      tokens--;
      const updated = { ...rec, freezeUsed: true };
      records.set(date, updated);
      changed.push(updated);
      events.push({ type: "freeze-used", date });
    } else if (alive) {
      events.push({ type: "streak-broken", date });
    }
  }
  return { records, freezeTokens: tokens, changed, events };
}
