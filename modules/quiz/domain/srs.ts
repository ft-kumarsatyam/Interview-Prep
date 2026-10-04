import { addDays, type DateStr } from "@/core/domain/dates";

export type Confidence = "easy" | "ok" | "struggled";

const STRUGGLED_STEPS = [3, 7, 21];
const OK_INTERVAL = 14;

/**
 * When a problem should come back for a re-solve.
 * `reviewCount` = re-solves completed before this one (0 on the first solve).
 * Struggled problems keep returning (3 → 7 → 21 → 21 …) until rated ok/easy.
 * Ok returns once after 14 days on the first solve; easy never returns.
 */
export function nextReviewAt(confidence: Confidence, reviewCount: number, solvedOn: DateStr): DateStr | null {
  switch (confidence) {
    case "struggled":
      return addDays(solvedOn, STRUGGLED_STEPS[Math.min(reviewCount, STRUGGLED_STEPS.length - 1)]);
    case "ok":
      return reviewCount === 0 ? addDays(solvedOn, OK_INTERVAL) : null;
    case "easy":
      return null;
  }
}
