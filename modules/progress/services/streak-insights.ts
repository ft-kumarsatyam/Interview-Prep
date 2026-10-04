import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { DayLog } from "@/core/models/day";
import { Notification } from "@/core/models/system";
import { bestStreak, currentStreak, streakEndingAt, type DayRecord } from "@/modules/progress/domain/streak";
import { celebrationFor, freezeProgress, nextMilestone, runStats, streakRuns, weekRing, type ActivityRun, type FreezeProgress, type StreakRun, type WeekCell } from "@/modules/progress/domain/streak-insights";

export interface StreakInsights {
  current: number;
  best: number;
  next: { target: number; daysAway: number } | null;
  freeze: FreezeProgress;
  week: { cells: WeekCell[]; kept: number; elapsed: number };
  /** Most recent runs first. */
  runs: StreakRun[];
  /** Separate runs per activity. They never affect the main streak. */
  activities: Record<"dsa" | "theory" | "quiz" | "reading", ActivityRun>;
}

type Row = { date: string; complete?: boolean | null; freezeUsed?: boolean | null; dsaSolved?: number | null; theoryDone?: number | null; quizPassed?: boolean | null; readings?: number | null };

async function loadRows(): Promise<Row[]> {
  await connectDb();
  return DayLog.find({}, { date: 1, complete: 1, freezeUsed: 1, dsaSolved: 1, theoryDone: 1, quizPassed: 1, readings: 1 }).sort({ date: 1 }).lean();
}

const toRecords = (rows: readonly Row[]): Map<DateStr, DayRecord> => new Map(rows.map((r) => [r.date, { date: r.date, complete: !!r.complete, freezeUsed: !!r.freezeUsed }]));

/** The streak at a glance: runs, milestones, freeze progress, the week and per-activity runs. Read-only. */
export async function getStreakInsights(today: DateStr, freezeTokens: number): Promise<StreakInsights> {
  const rows = await loadRows();
  const records = toRecords(rows);
  const current = currentStreak(records, today);
  const dates = (pick: (r: Row) => boolean) => new Set(rows.filter(pick).map((r) => r.date));
  return {
    current,
    best: bestStreak(records.values()),
    next: nextMilestone(current),
    freeze: freezeProgress(current, freezeTokens),
    week: weekRing(records, today),
    runs: streakRuns(records.values()).toReversed().slice(0, 8),
    activities: {
      dsa: runStats(dates((r) => (r.dsaSolved ?? 0) > 0), today),
      theory: runStats(dates((r) => (r.theoryDone ?? 0) > 0), today),
      quiz: runStats(dates((r) => !!r.quizPassed), today),
      reading: runStats(dates((r) => (r.readings ?? 0) > 0), today),
    },
  };
}

/**
 * When a day completes at a milestone (7, 14, 30...) or sets a new personal best, leave one notification for it.
 * Idempotent: each milestone is celebrated once, each best once per day. It reads the records; it never changes
 * them, so the streak itself is untouched.
 */
export async function recordStreakCelebration(date: DateStr): Promise<{ kind: "milestone" | "best"; days: number } | null> {
  const rows = await loadRows();
  const records = toRecords(rows);
  if (!records.get(date)?.complete) return null;
  const streak = streakEndingAt(records, date);
  // The best run BEFORE the current one, so a first run never beats itself.
  const runs = streakRuns(records.values());
  const currentRun = runs.find((r) => r.end === date);
  const before = Math.max(0, ...runs.filter((r) => !currentRun || r.end < currentRun.start).map((r) => r.length));
  const hit = celebrationFor(streak, before);
  if (!hit) return null;
  const milestone = hit.kind === "milestone";
  await Notification.updateOne(
    { dedupeKey: milestone ? `streak-milestone:${hit.days}` : `streak-best:${hit.days}:${date}` },
    {
      $setOnInsert: {
        kind: "milestone",
        title: milestone ? `${hit.days}-day streak` : `New personal best: ${hit.days} days`,
        body: milestone ? `You have finished ${hit.days} days in a row, daily quiz included. Keep it going.` : `${hit.days} days in a row is your longest streak yet (the one before was ${before}).`,
      },
    },
    { upsert: true },
  );
  return hit;
}
