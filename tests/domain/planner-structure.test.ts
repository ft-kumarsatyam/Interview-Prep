import { describe, expect, it } from "vitest";
import { buildIndicators, type IndicatorInput } from "@/modules/progress/domain/indicators";
import { carryOverChange, diffPlannerChanges, replanChange, type PlannerState } from "@/modules/planner/domain/plan-changes";
import { DEFAULT_PROFILE, plannerInputSchema, validatePlannerWindow, weeklyHours } from "@/modules/planner/domain/planner-profile";
import { dayItems, sprintRange, summarizeSprint, type SprintDay } from "@/modules/planner/domain/sprint";

const day = (date: string, over: Partial<SprintDay> = {}): SprintDay => ({
  date,
  kind: "study",
  source: "frozen",
  dsaTarget: 3,
  dsaSolved: 0,
  theoryTarget: 2,
  theoryDone: 0,
  reviews: 1,
  quizPassed: false,
  complete: false,
  minutes: 0,
  ...over,
});

describe("sprint", () => {
  it("maps a plan week to a Monday-to-Sunday range", () => {
    expect(sprintRange(1, "2026-10-05")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(sprintRange(3, "2026-10-05")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
  });

  it("counts items per day, capped at the targets", () => {
    expect(dayItems(day("2026-10-05", { dsaSolved: 5, theoryDone: 2, quizPassed: true }))).toEqual({ planned: 6, done: 6 });
    expect(dayItems(day("2026-10-05", { kind: "sunday", quizPassed: true }))).toEqual({ planned: 1, done: 1 });
    expect(dayItems(day("2026-10-05", { kind: "rest" }))).toEqual({ planned: 0, done: 0 });
  });

  const week = [
    day("2026-10-05", { dsaSolved: 3, theoryDone: 2, quizPassed: true, complete: true, minutes: 120 }),
    day("2026-10-06", { dsaSolved: 1, minutes: 30 }),
    day("2026-10-07"),
    day("2026-10-08", { kind: "rest", dsaTarget: 0, theoryTarget: 0, complete: true }),
    day("2026-10-09"),
    day("2026-10-10"),
    day("2026-10-11", { kind: "sunday", dsaTarget: 0, theoryTarget: 0 }),
  ];

  it("summarises an active week up to today", () => {
    const s = summarizeSprint(week, "2026-10-06");
    expect(s.status).toBe("active");
    expect(s.plannedToDate).toBe(12);
    expect(s.doneToDate).toBe(7);
    expect(s.completionRate).toBeCloseTo(7 / 12);
    expect(s).toMatchObject({ workDays: 6, completeDays: 1, minutes: 150, dsaPlanned: 15, dsaDone: 4, quizzesPlanned: 6, quizzesPassed: 1 });
  });

  it("is upcoming before the week and behind after it with open days", () => {
    expect(summarizeSprint(week, "2026-10-04")).toMatchObject({ status: "upcoming", completionRate: null });
    expect(summarizeSprint(week, "2026-10-12").status).toBe("behind");
    const done = week.map((d) => ({ ...d, complete: true }));
    expect(summarizeSprint(done, "2026-10-12").status).toBe("completed");
  });
});

describe("indicators", () => {
  const base: IndicatorInput = {
    taskPlanned: 40,
    taskDone: 36,
    subtopicsDone: 50,
    subtopicsTotal: 400,
    topicsMastered: 3,
    topicsTotal: 70,
    quizAvgPct: 72,
    quizCount: 7,
    minutesLogged7: 600,
    minutesTarget7: 1200,
    activeDays14: 12,
    reviewsDue: 3,
  };
  const by = (i: IndicatorInput) => Object.fromEntries(buildIndicators(i).map((x) => [x.id, x]));

  it("keeps seven separate measures with honest tones", () => {
    const m = by(base);
    expect(Object.keys(m)).toHaveLength(7);
    expect(m.completion).toMatchObject({ value: "90%", tone: "good" });
    expect(m.coverage.value).toBe("13%");
    expect(m.assessment).toMatchObject({ value: "72%", tone: "ok" });
    expect(m["study-time"]).toMatchObject({ value: "10 h", tone: "ok" });
    expect(m.consistency).toMatchObject({ value: "12/14 days", tone: "good" });
    expect(m.revision).toMatchObject({ value: "3", tone: "ok" });
    expect(m.skills.detail).toContain("67 topics have no passed topic quiz");
  });

  it("is neutral, not alarming, when there's no data yet", () => {
    const m = by({ ...base, taskPlanned: 0, taskDone: 0, quizAvgPct: null, quizCount: 0, minutesLogged7: 0, minutesTarget7: 0 });
    expect(m.completion).toMatchObject({ value: "–", tone: "neutral" });
    expect(m.assessment).toMatchObject({ value: "–", tone: "neutral" });
    expect(m["study-time"].tone).toBe("neutral");
  });

  it("flags low completion and a heavy revision pile", () => {
    const m = by({ ...base, taskDone: 10, reviewsDue: 12 });
    expect(m.completion.tone).toBe("low");
    expect(m.revision.tone).toBe("low");
  });
});

describe("planner profile", () => {
  const valid = { ...DEFAULT_PROFILE, endDate: "2027-03-21", hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] };

  it("validates and de-duplicates the form", () => {
    expect(plannerInputSchema.safeParse({ ...valid, priorities: ["dsa", "dsa", "sql"] }).data?.priorities).toEqual(["dsa", "sql"]);
    expect(plannerInputSchema.safeParse({ ...valid, priorities: [] }).success).toBe(false);
    expect(plannerInputSchema.safeParse({ ...valid, hoursByDow: [1, 2, 3] }).success).toBe(false);
    expect(plannerInputSchema.safeParse({ ...valid, hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 13] }).success).toBe(false);
    expect(plannerInputSchema.safeParse({ ...valid, preferredLanguage: "cobol" }).success).toBe(false);
  });

  it("checks the interview date against the plan window", () => {
    const s = { startDate: "2026-10-05" };
    expect(validatePlannerWindow({ endDate: "2027-03-21" }, s, "2026-10-06")).toBeNull();
    expect(validatePlannerWindow({ endDate: "2026-10-05" }, s, "2026-10-06")).toMatch(/after the plan start/);
    expect(validatePlannerWindow({ endDate: "2026-10-06" }, s, "2026-10-06")).toMatch(/in the future/);
    expect(validatePlannerWindow({ endDate: "2028-01-01" }, s, "2026-10-06")).toMatch(/under 400 days/);
  });

  it("adds up the week", () => {
    expect(weeklyHours([4, 3.5, 3.5, 3.5, 3.5, 3.5, 6])).toBe(27.5);
  });
});

describe("plan change entries", () => {
  const before: PlannerState = { profile: DEFAULT_PROFILE, startDate: "2026-10-05", endDate: "2027-03-21", hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6], restDays: ["2026-12-25"] };

  it("is empty when nothing changed", () => {
    expect(diffPlannerChanges(before, { ...before })).toEqual([]);
  });

  it("describes each kind of change with its effect", () => {
    const after: PlannerState = {
      ...before,
      profile: { ...DEFAULT_PROFILE, targetCompany: "Acme", priorities: ["dsa", "lld"] },
      hoursByDow: [4, 2, 3.5, 3.5, 3.5, 3.5, 6],
      restDays: ["2026-12-25", "2026-12-31"],
      endDate: "2027-04-04",
    };
    const changes = diffPlannerChanges(before, after);
    expect(changes.map((c) => c.type)).toEqual(["goals", "availability", "rest-days", "plan-window"]);
    expect(changes[0].summary).toContain('target company "none" → "Acme"');
    expect(changes[1].summary).toContain("today's plan stays frozen");
    expect(changes[2].summary).toContain("added 2026-12-31");
    expect(changes[3].summary).toContain("interview date 2027-03-21 → 2027-04-04");
  });

  it("describes re-plans and carry-overs, skipping empty gaps", () => {
    expect(replanChange("2026-10-06", 2, { dsa: 3, theory: 4 }, { dsa: 2, theory: 2 }).summary).toBe("Re-planned 2026-10-06 for 2 h: DSA 3 → 2, theory 4 → 2. Work already done stays on the list.");
    expect(carryOverChange("2026-10-06", { dsa: 0, theory: 0, quiz: false })).toBeNull();
    const c = carryOverChange("2026-10-06", { dsa: 2, theory: 0, quiz: true });
    expect(c?.summary).toBe("2026-10-06 closed with 2 DSA problems, the daily quiz undone. The unfinished problems and subtopics move to the front of the next plan.");
    expect(c?.dedupeKey).toBe("carry:2026-10-06");
  });
});
