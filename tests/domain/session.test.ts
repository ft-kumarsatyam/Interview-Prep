import { describe, expect, it } from "vitest";
import { buildSession, type SessionToday } from "@/core/domain/session";

const base: SessionToday = { kind: "study", dsaSolved: 0, dsaTarget: 3, theoryDone: 0, theoryTarget: 2, quizPassed: false, quizUnlocked: false };

describe("buildSession", () => {
  it("has no session on rest days, outside the plan, or before today's plan exists", () => {
    expect(buildSession({ ...base, kind: "rest" }, 0)).toBeNull();
    expect(buildSession({ ...base, kind: "outside" }, 0)).toBeNull();
    expect(buildSession(null, 0)).toBeNull();
  });

  it("orders solve, theory, review, quiz and starts at the first open step", () => {
    const s = buildSession(base, 4)!;
    expect(s.steps.map((x) => x.id)).toEqual(["dsa", "theory", "review", "quiz"]);
    expect(s.next?.id).toBe("dsa");
    expect(s.steps[0]!.detail).toBe("0/3");
    expect(s.steps[2]!.detail).toBe("4 due");
  });

  it("keeps the quiz locked until it is unlocked, and skips it as 'next' while locked", () => {
    const s = buildSession({ ...base, dsaSolved: 3, theoryDone: 2 }, 0)!;
    expect(s.steps.find((x) => x.id === "quiz")).toMatchObject({ locked: true, detail: "locked" });
    expect(s.next).toBeNull();
    const open = buildSession({ ...base, dsaSolved: 3, theoryDone: 2, quizUnlocked: true }, 0)!;
    expect(open.next?.id).toBe("quiz");
  });

  it("drops the review step when nothing is due, except on Sundays", () => {
    expect(buildSession(base, 0)!.steps.some((x) => x.id === "review")).toBe(false);
    const sunday = buildSession({ ...base, kind: "sunday" }, 0)!;
    expect(sunday.steps.map((x) => x.id)).toEqual(["review", "quiz"]);
    expect(sunday.steps[1]!.label).toBe("Weekly quiz");
  });

  it("counts finished steps and clamps overshoot", () => {
    const s = buildSession({ ...base, dsaSolved: 5, theoryDone: 2, quizUnlocked: true, quizPassed: true }, 0)!;
    expect(s.steps[0]!.detail).toBe("3/3");
    expect(s.doneCount).toBe(3);
    expect(s.next).toBeNull();
  });
});
