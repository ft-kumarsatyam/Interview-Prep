/**
 * Per-question answer history, built from finished practice runs and daily/weekly quizzes.
 * Drives two things: rotation (repeat runs prefer questions you haven't seen or got wrong)
 * and the mistakes quiz (questions whose latest answer was wrong).
 */

export interface AnswerEvent {
  id: string;
  correct: boolean;
  /** Epoch ms of the submission. */
  at: number;
}

export interface QuestionStat {
  attempts: number;
  wrong: number;
  /** Outcome of the most recent answer. */
  lastCorrect: boolean;
  lastAt: number;
}

export type QuestionHistory = ReadonlyMap<string, QuestionStat>;

const DAY_MS = 86_400_000;

/** Fold answer events (any order) into one stat per question; the newest answer decides `lastCorrect`. */
export function buildHistory(events: readonly AnswerEvent[]): Map<string, QuestionStat> {
  const out = new Map<string, QuestionStat>();
  for (const e of events.toSorted((a, b) => a.at - b.at)) {
    const prev = out.get(e.id);
    out.set(e.id, {
      attempts: (prev?.attempts ?? 0) + 1,
      wrong: (prev?.wrong ?? 0) + (e.correct ? 0 : 1),
      lastCorrect: e.correct,
      lastAt: e.at,
    });
  }
  return out;
}

/** Days until a correctly answered question is back to full weight. */
export const ROTATION_RECOVERY_DAYS = 14;

/**
 * Sampling multiplier: never seen 4, last answer wrong 3, last answer right starts at 0.2
 * and climbs back to 1 over ROTATION_RECOVERY_DAYS, so known questions return spaced out
 * instead of disappearing (and a small bank still fills a run).
 */
export function rotationWeight(stat: QuestionStat | undefined, now: number): number {
  if (!stat) return 4;
  if (!stat.lastCorrect) return 3;
  const days = Math.max(0, (now - stat.lastAt) / DAY_MS);
  return Math.min(1, 0.2 + (0.8 * days) / ROTATION_RECOVERY_DAYS);
}

export interface Mistake {
  id: string;
  stat: QuestionStat;
}

/** Questions whose latest answer was wrong: most-missed first, then most recent. */
export function outstandingMistakes(history: QuestionHistory): Mistake[] {
  return [...history]
    .filter(([, s]) => !s.lastCorrect)
    .map(([id, stat]) => ({ id, stat }))
    .sort((a, b) => b.stat.wrong - a.stat.wrong || b.stat.lastAt - a.stat.lastAt);
}

/** Weight for drawing a mistake into a review run: repeated misses come up more often. */
export function mistakeWeight(stat: QuestionStat): number {
  return 1 + Math.min(stat.wrong, 4);
}

/** A seen/wrong pair is enough for callers that don't need timing (aptitude bank rotation). */
export function seenSets(history: QuestionHistory): { seen: Set<string>; wrong: Set<string> } {
  const seen = new Set<string>();
  const wrong = new Set<string>();
  for (const [id, s] of history) {
    seen.add(id);
    if (!s.lastCorrect) wrong.add(id);
  }
  return { seen, wrong };
}
