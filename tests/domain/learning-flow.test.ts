import { describe, expect, it } from "vitest";
import { learningPath } from "@/modules/learn/domain/learning-flow";

describe("learningPath", () => {
  it("starts with explanation and unlocks the next stages from progress", () => {
    expect(learningPath({ doneSubtopics: 0, totalSubtopics: 3, practiceAttempts: 0, mastered: false }).map((s) => s.status)).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    expect(learningPath({ doneSubtopics: 3, totalSubtopics: 3, practiceAttempts: 1, mastered: false }).map((s) => s.status)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "current",
    ]);
  });

  it("marks a mastered topic complete", () => {
    expect(learningPath({ doneSubtopics: 4, totalSubtopics: 4, practiceAttempts: 2, mastered: true }).every((s) => s.status === "complete")).toBe(true);
  });
});
