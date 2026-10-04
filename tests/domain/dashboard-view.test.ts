import { describe, expect, it } from "vitest";
import { buildRequirements, dayCopy, greetingFor, isStreakAtRisk, nextRequirement, type DayView } from "@/modules/progress/domain/dashboard-view";

const day = (over: Partial<DayView> = {}): DayView => ({
  kind: "study",
  complete: false,
  dsaSolved: 0,
  dsaTarget: 2,
  theoryDone: 0,
  theoryTarget: 1,
  quizPassed: false,
  quizUnlocked: false,
  readings: 0,
  ...over,
});

describe("dashboard view rules", () => {
  it("builds four requirements on a study day and one on Sunday", () => {
    expect(buildRequirements(day(), 3).map((r) => r.label)).toEqual(["DSA", "Theory", "Daily quiz", "Read (bonus)"]);
    expect(buildRequirements(day({ kind: "sunday" }), 3).map((r) => r.label)).toEqual(["Weekly quiz"]);
    expect(buildRequirements(day({ kind: "rest" }), 3)).toEqual([]);
  });

  it("locks the quiz until it is unlocked and explains why", () => {
    const quiz = buildRequirements(day(), 3)[2];
    expect(quiz).toMatchObject({ value: "locked", icon: "quiz-locked" });
    expect(quiz.hint).toBeTruthy();
    expect(buildRequirements(day({ quizUnlocked: true }), 3)[2]).toMatchObject({ value: "ready", icon: "quiz", hint: undefined });
  });

  it("does not offer the quiz as next while it is locked", () => {
    const d = day({ dsaSolved: 2, theoryDone: 1, readings: 3 });
    expect(nextRequirement(buildRequirements(d, 3), d)).toBeUndefined();
    const open = { ...d, quizUnlocked: true };
    expect(nextRequirement(buildRequirements(open, 3), open)?.label).toBe("Daily quiz");
  });

  it("picks the first unfinished requirement", () => {
    const d = day({ dsaSolved: 2 });
    expect(nextRequirement(buildRequirements(d, 3), d)?.label).toBe("Theory");
  });

  it("flags streak risk only for unfinished work days after 20:00", () => {
    expect(isStreakAtRisk({ kind: "study", complete: false }, 20)).toBe(true);
    expect(isStreakAtRisk({ kind: "study", complete: false }, 19)).toBe(false);
    expect(isStreakAtRisk({ kind: "study", complete: true }, 22)).toBe(false);
    expect(isStreakAtRisk({ kind: "rest", complete: false }, 22)).toBe(false);
  });

  it("greets by hour and describes the day", () => {
    expect([greetingFor(9), greetingFor(13), greetingFor(21)]).toEqual(["Good morning", "Good afternoon", "Good evening"]);
    expect(dayCopy("sunday", true)).toContain("optional extras");
    expect(dayCopy("study", false)).toContain("streak");
  });
});
