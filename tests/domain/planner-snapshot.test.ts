import { describe, expect, it } from "vitest";
import { dayProgress, groupByWeek, summarizeMonth, type CalendarViewDay } from "@/lib/domain/calendar-view";
import { defaultCheckSelection, diagnosticVerdict, impliedRating, spreadPick } from "@/lib/domain/diagnostic";
import { daysUntilExpiry, describeSnapshot, resetStartDate, restoredWindow, snapshotExpiry } from "@/lib/domain/planner-snapshot";
import { seededRng } from "@/lib/domain/sampling";

describe("planner snapshots", () => {
  const now = new Date("2026-10-03T06:00:00Z");

  it("expire after 60 days and count down", () => {
    const exp = snapshotExpiry(now);
    expect(daysUntilExpiry(exp, now)).toBe(60);
    expect(daysUntilExpiry(exp, new Date(exp.getTime() - 3600_000))).toBe(0);
    expect(daysUntilExpiry(exp, new Date(exp.getTime() + 1))).toBe(0);
  });

  it("describe themselves in one line", () => {
    const text = describeSnapshot({ planner: { targetRole: "Backend", targetCompany: "Acme", startDate: "2026-09-01", endDate: "2027-03-21", hoursByDow: [4, 2, 2, 2, 2, 2, 4] }, ratedTopics: 12, completed: true });
    expect(text).toBe("Backend at Acme · interview 2027-03-21 · 18 h a week · 12 topics rated");
    expect(describeSnapshot({ planner: { targetRole: "", targetCompany: "", startDate: "2026-09-01", endDate: "2027-03-21", hoursByDow: [] }, ratedTopics: 0, completed: false })).toContain("setup not finished");
  });

  it("keep the current interview date when the saved one has passed", () => {
    const current = { startDate: "2026-09-01", endDate: "2027-04-01" };
    expect(restoredWindow({ startDate: "2026-08-01", endDate: "2027-02-01" }, current, "2026-10-03")).toEqual({ startDate: "2026-08-01", endDate: "2027-02-01", keptCurrentEnd: false });
    expect(restoredWindow({ startDate: "2026-08-01", endDate: "2026-10-01" }, current, "2026-10-03")).toMatchObject({ endDate: "2027-04-01", keptCurrentEnd: true });
  });

  it("restart from today only when asked and the interview is ahead", () => {
    const current = { startDate: "2026-09-01", endDate: "2027-04-01" };
    expect(resetStartDate(current, "2026-10-03", false)).toBe("2026-09-01");
    expect(resetStartDate(current, "2026-10-03", true)).toBe("2026-10-03");
    expect(resetStartDate(current, "2027-04-01", true)).toBe("2026-09-01");
  });
});

describe("planner check", () => {
  it("spreads questions across subtopics, easy first", () => {
    const pool = ["a", "a", "a", "b", "b", "c"].map((s, i) => ({ subtopicId: s, question: i, weight: 1, difficulty: (i % 2 ? "hard" : "easy") as "easy" | "hard" }));
    const picked = spreadPick(pool, 3, seededRng(1));
    expect(new Set(picked.map((p) => p.subtopicId)).size).toBe(3);
    const order = picked.map((p) => p.difficulty);
    expect(order.indexOf("hard") === -1 || order.lastIndexOf("easy") < order.indexOf("hard")).toBe(true);
    expect(spreadPick(pool, 10, seededRng(1))).toHaveLength(6);
  });

  it("compares a rating with a score, ignoring one-step noise", () => {
    expect(impliedRating(100)).toBe(5);
    expect(impliedRating(0)).toBe(1);
    expect(diagnosticVerdict(3, 50)).toBe("about-right");
    expect(diagnosticVerdict(5, 25)).toBe("weaker");
    expect(diagnosticVerdict(1, 75)).toBe("stronger");
  });

  it("suggests unchecked must-haves, weakest first", () => {
    const sel = defaultCheckSelection([
      { topicId: "strong", rating: 5, tier: "must", checked: false, questions: 4 },
      { topicId: "weak", rating: 1, tier: "must", checked: false, questions: 4 },
      { topicId: "nice", rating: 1, tier: "nice", checked: false, questions: 4 },
      { topicId: "done", rating: 1, tier: "must", checked: true, questions: 4 },
      { topicId: "empty", rating: 1, tier: "must", checked: false, questions: 0 },
    ]);
    expect(sel).toEqual(["weak", "strong", "nice", "done"]);
  });
});

describe("calendar view", () => {
  const day = (date: string, patch: Partial<CalendarViewDay> = {}): CalendarViewDay => ({ date, kind: "study", state: "future", dsaTarget: 2, theoryTarget: 1, reviews: 0, done: null, ...patch });

  it("summarises past days and work ahead", () => {
    const s = summarizeMonth(
      [
        day("2026-10-01", { state: "complete", done: { dsa: 3, theory: 1, quiz: true } }),
        day("2026-10-02", { state: "missed", done: { dsa: 0, theory: 0, quiz: false } }),
        day("2026-10-03", { kind: "rest", dsaTarget: 0, theoryTarget: 0 }),
        day("2026-10-04", { estMinutes: 90 }),
      ],
      "2026-10-03",
    );
    expect(s).toMatchObject({ elapsed: 2, complete: 1, missed: 1, ahead: 1, rest: 1, dsaDone: 2, dsaPlanned: 6, hoursAhead: 1.5 });
  });

  it("measures a day's progress including the quiz", () => {
    expect(dayProgress(day("2026-10-01", { done: { dsa: 2, theory: 1, quiz: true } }))).toBe(1);
    expect(dayProgress(day("2026-10-01", { done: { dsa: 1, theory: 0, quiz: false } }))).toBe(0.25);
    expect(dayProgress(day("2026-10-01"))).toBeNull();
    expect(dayProgress(day("2026-10-01", { kind: "rest", done: { dsa: 0, theory: 0, quiz: false } }))).toBeNull();
  });

  it("groups days into Monday-first weeks", () => {
    const weeks = groupByWeek(["2026-10-01", "2026-10-04", "2026-10-05", "2026-10-11", "2026-10-12"].map((date) => ({ date })));
    expect(weeks.map((w) => w.length)).toEqual([2, 2, 1]);
  });
});
