import { describe, expect, it } from "vitest";
import { isPassing, scoreQuiz } from "@/lib/domain/quiz";
import { nextReviewAt } from "@/lib/domain/srs";

describe("nextReviewAt", () => {
  it("brings struggled problems back at 3, 7, then 21 days", () => {
    expect(nextReviewAt("struggled", 0, "2026-10-05")).toBe("2026-10-08");
    expect(nextReviewAt("struggled", 1, "2026-10-05")).toBe("2026-10-12");
    expect(nextReviewAt("struggled", 2, "2026-10-05")).toBe("2026-10-26");
    expect(nextReviewAt("struggled", 5, "2026-10-05")).toBe("2026-10-26");
  });

  it("brings ok problems back once after 14 days; easy never", () => {
    expect(nextReviewAt("ok", 0, "2026-10-05")).toBe("2026-10-19");
    expect(nextReviewAt("ok", 1, "2026-10-05")).toBeNull();
    expect(nextReviewAt("easy", 0, "2026-10-05")).toBeNull();
  });
});

describe("scoreQuiz", () => {
  it("scores answers and treats blanks as wrong", () => {
    const s = scoreQuiz([0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [0, 1, 2, 3, 0, 1, null, 0, 1, 2]);
    expect(s).toEqual({ correct: 6, total: 10, pct: 60 });
    expect(isPassing(s, 60)).toBe(true);
    expect(isPassing({ ...s, pct: 59 }, 60)).toBe(false);
    expect(isPassing(scoreQuiz([], []), 60)).toBe(false);
  });
});
