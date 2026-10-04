import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { problems } from "@/core/content";
import { DEFAULT_COSTS } from "@/modules/planner/domain/time-budget";
import { DailyPlan, Quiz } from "@/core/models/day";
import { ProblemProgress } from "@/core/models/progress";
import { ensureToday, loadCosts, replanToday } from "@/modules/planner/services/plan";
import { recordSolve } from "@/modules/progress/services/progress";
import { getSettings, saveSettings, updateSettings } from "@/modules/settings/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const MON_W1 = "2026-10-05";
const SAT_W1 = "2026-10-10";
const SUN_W1 = "2026-10-11";
const MON_W5 = "2026-11-02";

describe("hours-based plans", () => {
  it("defaults to 3.5 h weekdays, a 6 h Saturday and a 4 h Sunday", async () => {
    const s = await getSettings();
    expect(s.hoursByDow).toEqual([4, 3.5, 3.5, 3.5, 3.5, 3.5, 6]);
  });

  it("stores the hours and an estimate on the plan, with weekday targets unchanged from before", async () => {
    const t = await ensureToday(at(MON_W1));
    expect(t.plan.hours).toBe(3.5);
    expect(t.plan.estMinutes).toBeGreaterThan(30);
    expect(t.plan.dsaTarget).toBe(2); // week 1 ramp, exactly as the count-based plan
  });

  it("changing the weekly hours changes later plans but never a plan that already exists", async () => {
    const first = await ensureToday(at(MON_W5));
    await updateSettings({ hoursByDow: [4, 6, 6, 6, 6, 6, 6] });
    const again = await ensureToday(at(MON_W5));
    expect(again.plan).toEqual(first.plan);

    await DailyPlan.deleteOne({ date: MON_W5 });
    const longer = await ensureToday(at(MON_W5));
    expect(longer.plan.hours).toBe(6);
    expect(longer.plan.dsaTarget).toBeGreaterThan(first.plan.dsaTarget);
  });

  it("a short weekday asks for less but still something", async () => {
    await updateSettings({ hoursByDow: [4, 1.5, 3.5, 3.5, 3.5, 3.5, 6] });
    const t = await ensureToday(at(MON_W5));
    expect(t.plan.dsaTarget).toBeGreaterThanOrEqual(1);
    expect(t.plan.estMinutes!).toBeLessThanOrEqual(1.5 * 60 * 1.15);
  });

  it("Sunday keeps zero required work and offers a bonus list from the spare hours", async () => {
    const t = await ensureToday(at(SUN_W1));
    expect(t.plan.kind).toBe("sunday");
    expect(t.plan.dsaTarget).toBe(0);
    expect(t.plan.theoryTarget).toBe(0);
    expect(t.plan.hours).toBe(4);
    expect(t.plan.bonusDsa!.length).toBeGreaterThan(0);
    // Completion still only needs the weekly quiz.
    expect(t.day.dsaTarget).toBe(0);
    expect(t.day.theoryTarget).toBe(0);
  });

  it("Saturday is planned for its own hours", async () => {
    const t = await ensureToday(at(SAT_W1));
    expect(t.plan.hours).toBe(6);
  });

  it("learns from how long your solves actually took", async () => {
    expect((await loadCosts()).dsa).toEqual(DEFAULT_COSTS.dsa);
    const mediums = problems.filter((p) => p.track === "main" && p.difficulty === "Medium").slice(0, 20);
    await ProblemProgress.create(
      mediums.map((p) => ({ slug: p.slug, status: "solved" as const, timeTakenMin: 110, reviewCount: 0, solveDates: ["2026-10-01"] })),
    );
    const learned = await loadCosts();
    expect(learned.dsa.Medium).toBeGreaterThan(DEFAULT_COSTS.dsa.Medium);
    expect(learned.dsa.Easy).toBe(DEFAULT_COSTS.dsa.Easy);
  });

  it("ignores re-solves and problems with no recorded time", async () => {
    const [a, b] = problems.filter((p) => p.track === "main" && p.difficulty === "Medium");
    await ProblemProgress.create([
      { slug: a!.slug, status: "solved" as const, timeTakenMin: 200, reviewCount: 2, solveDates: ["2026-10-01"] },
      { slug: b!.slug, status: "solved" as const, reviewCount: 0, solveDates: ["2026-10-01"] },
    ]);
    expect((await loadCosts()).dsa).toEqual(DEFAULT_COSTS.dsa);
  });
});

describe("saving hours from Settings", () => {
  const form = {
    startDate: "2026-10-05",
    endDate: "2027-03-21",
    quizPassPct: 60,
    topicMasteryPct: 70,
    minDailyDsa: 3,
    maxDailyDsa: 6,
    maxSaturdayDsa: 10,
    maxDailyTheory: 5,
    revisionWeeks: 3,
    restDays: [],
    googleNewsQueries: null,
    leetcodeUsername: null,
  };

  it("keeps the stored hours when the form doesn't send any", async () => {
    await updateSettings({ hoursByDow: [4, 2, 2, 2, 2, 2, 8] });
    await saveSettings(form, at(MON_W1));
    expect((await getSettings()).hoursByDow).toEqual([4, 2, 2, 2, 2, 2, 8]);
  });

  it("saves new hours", async () => {
    await saveSettings({ ...form, hoursByDow: [5, 3, 3, 3, 3, 3, 7] }, at(MON_W1));
    expect((await getSettings()).hoursByDow).toEqual([5, 3, 3, 3, 3, 3, 7]);
  });
});

describe("replanToday", () => {
  it("re-plans for fewer hours and keeps what is already done", async () => {
    const t = await ensureToday(at(MON_W5));
    const doneSlug = t.plan.dsaNew[0]!;
    await recordSolve({ slug: doneSlug, date: MON_W5, source: "manual", details: { confidence: "ok" } });

    const plan = await replanToday(1.5, at(MON_W5));
    expect(plan.hours).toBe(1.5);
    expect(plan.dsaTarget).toBeLessThan(t.plan.dsaTarget);
    expect(plan.dsaNew).toContain(doneSlug);
    expect((await DailyPlan.findOne({ date: MON_W5 }).lean())!.hours).toBe(1.5);
    expect((await ensureToday(at(MON_W5))).plan.hours).toBe(1.5);
  });

  it("re-plans for more hours", async () => {
    const t = await ensureToday(at(MON_W5));
    const plan = await replanToday(6, at(MON_W5));
    expect(plan.dsaTarget).toBeGreaterThan(t.plan.dsaTarget);
    expect(plan.dsaNew).toHaveLength(plan.dsaTarget);
  });

  it("refuses nonsense hours", async () => {
    await ensureToday(at(MON_W5));
    for (const h of [0, 0.5, 13, Number.NaN]) await expect(replanToday(h, at(MON_W5))).rejects.toThrow(/between/);
  });

  it("refuses before a plan exists, on rest days and once the day is complete", async () => {
    await expect(replanToday(2, at(MON_W5))).rejects.toThrow(/hasn't been created/);

    await updateSettings({ restDays: ["2026-11-03"] });
    await ensureToday(at("2026-11-03"));
    await expect(replanToday(2, at("2026-11-03"))).rejects.toThrow(/nothing to plan/);

    await ensureToday(at(MON_W5));
    await DailyPlan.updateOne({ date: MON_W5 }, { $set: { dsaTarget: 0, theoryTarget: 0 } });
    await Quiz.create({ date: MON_W5, kind: "daily", generatedBy: "bank", questions: [], passed: true });
    await expect(replanToday(2, at(MON_W5))).rejects.toThrow(/already complete/);
  });

  it("does not change the streak rules: completion still needs the targets", async () => {
    await ensureToday(at(MON_W5));
    const plan = await replanToday(2, at(MON_W5));
    const t = await ensureToday(at(MON_W5));
    expect(t.day.dsaTarget).toBe(plan.dsaTarget);
    expect(t.day.theoryTarget).toBe(plan.theoryTarget);
    expect(t.day.complete).toBe(false);
  });
});
