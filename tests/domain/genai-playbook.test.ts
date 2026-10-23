import { describe, expect, it } from "vitest";
import { countDone, dayOf, daysLeft, focusDate, latestReadiness, mockAverage, nextOpenTask, overallProgress, phase, weakDomains, weekForDate, weekProgress, type PlaybookReview } from "@/modules/genai-playbook/domain/playbook";
import { planSchema, reviewInputSchema, type Plan } from "@/modules/genai-playbook/domain/schemas";

const week = (id: string, start: string, end: string) => ({ id, title: id, start, end, lesson: "genai-playbook/x", nodeId: "x", domain: "llm" as const, practice: "p", artifact: "a" });
const plan: Plan = planSchema.parse({
  as_of: "2026-10-01",
  start_date: "2026-10-26",
  end_date: "2026-11-01",
  weeks: [week("w01", "2026-10-26", "2026-11-01")],
  days: ["2026-10-26", "2026-10-27"].map((date, i) => ({ date, weekday: "Monday", week: "w01", tasks: [{ id: `p00${i + 1}t1`, kind: "learn", text: "t", minutes: 30 }, { id: `p00${i + 1}t2`, kind: "dsa", text: "d", minutes: 45 }] })),
});

describe("playbook schedule", () => {
  it("finds the phase and the date to show", () => {
    expect(phase(plan, "2026-10-20")).toBe("before");
    expect(phase(plan, "2026-10-30")).toBe("live");
    expect(phase(plan, "2026-11-02")).toBe("after");
    expect(focusDate(plan, "2026-10-20")).toBe("2026-10-26");
    expect(focusDate(plan, "2026-11-09")).toBe("2026-11-01");
    expect(focusDate(plan, "2026-10-28")).toBe("2026-10-28");
    expect(weekForDate(plan, "2026-10-30")?.id).toBe("w01");
    expect(dayOf(plan, "2026-10-27")?.tasks).toHaveLength(2);
  });

  it("counts progress by task id and finds the next open task", () => {
    const done = { p001t1: "2026-10-26", p001t2: "2026-10-26" };
    expect(countDone(plan.days[0].tasks, done)).toMatchObject({ done: 2, total: 2, minutesDone: 75, pct: 100 });
    expect(overallProgress(plan, done).pct).toBe(50);
    expect(weekProgress(plan, "w01", done).done).toBe(2);
    expect(nextOpenTask(plan, done, "2026-10-26")?.task.id).toBe("p002t1");
    expect(nextOpenTask(plan, { ...done, p002t1: "x", p002t2: "x" }, "2026-10-27")).toBeNull();
    expect(nextOpenTask(plan, { p001t2: "x" }, "2026-10-27")?.task.id).toBe("p002t1");
  });

  it("counts days left without going negative", () => {
    expect(daysLeft(plan, "2026-10-20")).toBe(7);
    expect(daysLeft(plan, "2026-11-01")).toBe(1);
    expect(daysLeft(plan, "2026-12-01")).toBe(0);
  });
});

describe("readiness and mock scores", () => {
  const reviews: PlaybookReview[] = [
    { kind: "readiness", weekId: "w02", scores: { rag: 2, llm: 4 }, note: "" },
    { kind: "readiness", weekId: "w01", scores: { rag: 1, llm: 3, agents: 5 }, note: "" },
    { kind: "mock", weekId: "w01", scores: { framing: 3 }, note: "" },
  ];
  it("takes the latest week per domain and flags domains under 3", () => {
    const latest = latestReadiness(reviews);
    expect(latest).toEqual({ rag: 2, llm: 4, agents: 5 });
    expect(weakDomains(latest)).toEqual(["rag"]);
    expect(weakDomains({})).toEqual([]);
  });
  it("averages the scored mock dimensions", () => {
    expect(mockAverage({ framing: 3, correctness: 4, tradeoffs: 5 })).toBe(4);
    expect(mockAverage({})).toBeNull();
  });
  it("validates review input ranges", () => {
    expect(reviewInputSchema.safeParse({ kind: "readiness", weekId: "w01", scores: { rag: 0 } }).success).toBe(true);
    expect(reviewInputSchema.safeParse({ kind: "readiness", weekId: "w01", scores: { rag: 6 } }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ kind: "mock", weekId: "w01", scores: { framing: 0 } }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ kind: "mock", weekId: "w1", scores: { framing: 3 } }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ kind: "mock", weekId: "w01", scores: { nope: 3 } }).success).toBe(false);
  });
});
