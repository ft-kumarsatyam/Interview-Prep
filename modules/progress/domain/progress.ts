import type { DateStr } from "@/core/domain/dates";
import { nextReviewAt, type Confidence } from "@/modules/quiz/domain/srs";

export interface PriorSolve {
  solveDates: DateStr[];
  /** Re-solves recorded so far (0 after the first solve). */
  reviewCount: number;
}

export interface SolveOutcome {
  solveDates: DateStr[];
  reviewCount: number;
  nextReviewAt: DateStr | null;
  firstSolvedOn: DateStr;
  lastSolvedOn: DateStr;
  /** False when this only edits a solve already logged on `date`. */
  isNewSolveDay: boolean;
}

/**
 * Apply one solve (or a same-day edit) to a problem's history. A solve on a
 * new day after an earlier one is a re-solve and advances the review ladder.
 */
export function applySolve(prior: PriorSolve | null, date: DateStr, confidence: Confidence): SolveOutcome {
  const dates = prior?.solveDates ?? [];
  const sameDay = dates.includes(date);
  const solveDates = sameDay ? dates : [...dates, date].sort();
  const reviewCount = sameDay || dates.length === 0 ? (prior?.reviewCount ?? 0) : (prior?.reviewCount ?? 0) + 1;
  return {
    solveDates,
    reviewCount,
    nextReviewAt: nextReviewAt(confidence, reviewCount, date),
    firstSolvedOn: solveDates[0],
    lastSolvedOn: solveDates[solveDates.length - 1],
    isNewSolveDay: !sameDay,
  };
}
