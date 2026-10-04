import { describe, expect, it } from "vitest";
import { eveningNudge, type NudgeInput } from "@/lib/domain/nudge";

const base: NudgeInput = {
  date: "2026-10-06",
  day: { kind: "study", dsaTarget: 3, dsaSolved: 1, theoryTarget: 2, theoryDone: 2, quizPassed: false, quizUnlocked: true, complete: false } as NudgeInput["day"],
  streak: 5,
  freezeTokens: 0,
  leftProblems: [{ title: "3Sum", path: "/dsa/3sum", note: "Medium" }],
  leftTheory: [],
  hoursLeft: 3,
  backlogTotal: 0,
  appUrl: "https://prep.example.com",
};

describe("eveningNudge", () => {
  it("lists what is left, the time left and the streak at stake", () => {
    const n = eveningNudge(base)!;
    expect(n.left).toBe(3);
    expect(n.title).toBe("Evening check-in · 3 left · about 3 hours left");
    expect(n.text).toContain("Still open today: 2 DSA problems and the daily quiz.");
    expect(n.text).toContain("Your 5-day streak ends tonight");
    expect(n.text).toContain("Left: DSA\n- 3Sum (Medium)\n  https://prep.example.com/dsa/3sum");
    expect(n.text).toContain("Left: quiz");
    expect(n.html).toContain("<h2");
    expect(n.inApp.body).toContain("still open");
  });

  it("mentions a freeze without leaning on it, and goes urgent near midnight", () => {
    const n = eveningNudge({ ...base, freezeTokens: 2, hoursLeft: 0 })!;
    expect(n.text).toContain("A freeze would cover tonight");
    expect(n.title).toContain("under an hour left");
    expect(n.html).toContain("#fef2f2"); // the "bad" callout tone
  });

  it("shows the backlog count when there is one", () => {
    expect(eveningNudge({ ...base, backlogTotal: 12 })!.text).toContain("Backlog: 12");
    expect(eveningNudge(base)!.text).not.toContain("Backlog:");
  });

  it("says when only the quiz remains", () => {
    const day = { ...base.day, dsaSolved: 3 };
    const n = eveningNudge({ ...base, day, leftProblems: [] })!;
    expect(n.left).toBe(1);
    expect(n.text).toContain("Just the quiz");
  });

  it("is null for finished, rest and outside days", () => {
    expect(eveningNudge({ ...base, day: { ...base.day, dsaSolved: 3, quizPassed: true } })).toBeNull();
    expect(eveningNudge({ ...base, day: { ...base.day, kind: "rest" } })).toBeNull();
    expect(eveningNudge({ ...base, day: { ...base.day, kind: "outside" } })).toBeNull();
  });

  it("handles Sunday as one weekly quiz", () => {
    const n = eveningNudge({ ...base, day: { ...base.day, kind: "sunday", dsaTarget: 0, theoryTarget: 0, dsaSolved: 0, theoryDone: 0 }, leftProblems: [] })!;
    expect(n.text).toContain("the weekly review quiz");
    expect(n.text).toContain("Weekly quiz");
  });
});
