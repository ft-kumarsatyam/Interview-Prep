/**
 * Easy, medium and hard as a ladder for one subtopic or topic: how many questions exist at each level, how many runs you
 * did, your best and latest scores, whether you have cleared the pass mark, and which level to try next. Pure.
 */
import { DIFFICULTIES, type Difficulty } from "@/modules/quiz/lib/question";

export interface LevelAttempt {
  /** Null for runs that mixed levels; those do not count toward any rung. */
  level: Difficulty | null;
  pct: number;
  at: Date;
}

export interface LevelRow {
  level: Difficulty;
  /** Questions in the bank at this level for this subject. */
  available: number;
  attempts: number;
  bestPct: number | null;
  /** Latest scores, newest first (at most 5). */
  recent: number[];
  lastAt: string | null;
  /** Best score has reached the pass mark. */
  cleared: boolean;
}

export function summarizeLevels(attempts: readonly LevelAttempt[], available: Readonly<Record<Difficulty, number>>, passPct: number): LevelRow[] {
  return DIFFICULTIES.map((level) => {
    const mine = attempts.filter((a) => a.level === level).toSorted((a, b) => b.at.getTime() - a.at.getTime());
    const best = mine.length ? Math.max(...mine.map((a) => a.pct)) : null;
    return {
      level,
      available: available[level] ?? 0,
      attempts: mine.length,
      bestPct: best,
      recent: mine.slice(0, 5).map((a) => a.pct),
      lastAt: mine[0]?.at.toISOString() ?? null,
      cleared: best !== null && best >= passPct,
    };
  });
}

/**
 * Where to go next: the first level you have not cleared that has questions; once all are cleared, hard again to keep
 * the edge sharp. Null only when the bank has nothing at any level.
 */
export function recommendedLevel(rows: readonly LevelRow[]): Difficulty | null {
  const usable = rows.filter((r) => r.available > 0);
  if (usable.length === 0) return null;
  return usable.find((r) => !r.cleared)?.level ?? usable.at(-1)!.level;
}

/** Counts a pool of questions by level; unrated ones are not counted. */
export function countByLevel(questions: ReadonlyArray<{ difficulty?: Difficulty | undefined }>): Record<Difficulty, number> {
  const out: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) if (q.difficulty) out[q.difficulty]++;
  return out;
}
