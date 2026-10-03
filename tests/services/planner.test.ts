import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/domain/planner-profile";
import { PlanChange } from "@/lib/models/planner";
import { Settings } from "@/lib/models/system";
import { Quiz } from "@/lib/models/day";
import { ensureToday, replanToday } from "@/lib/services/plan";
import { listPlanChanges } from "@/lib/services/plan-log";
import { getIndicators, getSprintView, savePlanner } from "@/lib/services/planner";
import { recordSolve, toggleSubtopic } from "@/lib/services/progress";
import { saveSettings } from "@/lib/services/settings";
import { settingsInputSchema } from "@/lib/domain/settings";
import { logStudySession, listStudySessions, minutesByDate, deleteStudySession } from "@/lib/services/study";
import { exportBackup } from "@/lib/services/export";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const TUE = "2026-10-06";
const WED = "2026-10-07";
const form = { ...DEFAULT_PROFILE, endDate: "2027-03-21", hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6] };

describe("savePlanner", () => {
  it("saves goals, marks setup done and logs only real differences", async () => {
    const first = await savePlanner({ ...form, targetCompany: "Acme" }, at(TUE));
    expect(first.settings.profile.targetCompany).toBe("Acme");
    expect(first.settings.plannerSetupAt).not.toBeNull();
    expect(first.changes).toBe(1);

    const again = await savePlanner({ ...form, targetCompany: "Acme" }, at(TUE));
    expect(again.changes).toBe(0);
    expect(await PlanChange.countDocuments()).toBe(1);
  });

  it("logs hours and interview-date changes with their effect", async () => {
    await savePlanner(form, at(TUE));
    await savePlanner({ ...form, endDate: "2027-04-04", hoursByDow: [4, 2, 3.5, 3.5, 3.5, 3.5, 6] }, at(TUE));
    const log = await listPlanChanges();
    expect(log.map((c) => c.type).sort()).toEqual(["availability", "plan-window"]);
    expect(log.find((c) => c.type === "availability")?.summary).toContain("today's plan stays frozen");
  });

  it("rejects an interview date in the past and leaves settings alone", async () => {
    await expect(savePlanner({ ...form, endDate: "2026-10-06" }, at(TUE))).rejects.toThrow(/future/);
    expect((await Settings.findById("settings").lean())?.plannerSetupAt ?? null).toBeNull();
  });

  it("the Settings page logs the same changes", async () => {
    const parsed = settingsInputSchema.parse({
      startDate: "2026-10-05", endDate: "2027-03-21", quizPassPct: 60, topicMasteryPct: 70, minDailyDsa: 3, maxDailyDsa: 6, maxSaturdayDsa: 10, maxDailyTheory: 5, revisionWeeks: 3,
      restDays: ["2026-12-25"], googleNewsQueries: null, leetcodeUsername: "",
    });
    await saveSettings(parsed, at(TUE));
    expect((await listPlanChanges()).map((c) => c.type)).toEqual(["rest-days"]);
  });
});

describe("change log from the engine", () => {
  it("records a re-plan once with before and after targets", async () => {
    await ensureToday(at(TUE));
    await replanToday(1, at(TUE));
    const [entry] = await listPlanChanges();
    expect(entry.type).toBe("replan-hours");
    expect(entry.summary).toMatch(/^Re-planned 2026-10-06 for 1 h: DSA \d+ → \d+, theory \d+ → \d+/);
  });

  it("records the carry-over when a day closes with work left, exactly once", async () => {
    const monday = await ensureToday(at(TUE));
    await recordSolve({ slug: monday.plan.dsaNew[0], date: TUE, source: "manual", details: { confidence: "ok" } });
    await ensureToday(at(WED));
    await ensureToday(at(WED));
    const carry = (await listPlanChanges()).filter((c) => c.type === "carry-over");
    expect(carry).toHaveLength(1);
    expect(carry[0].summary).toContain("2026-10-06 closed with 1 DSA problem");
  });
});

describe("study sessions", () => {
  it("logs, sums per day and deletes", async () => {
    await logStudySession({ minutes: 45, kind: "dsa", source: "timer" }, at(TUE));
    const second = await logStudySession({ minutes: 30, kind: "theory", note: " sorting ", source: "manual" }, at(TUE));
    expect(second.note).toBe("sorting");
    expect((await minutesByDate(TUE, TUE)).get(TUE)).toBe(75);
    expect(await listStudySessions(TUE, TUE)).toHaveLength(2);
    await deleteStudySession(second.id);
    expect((await minutesByDate(TUE, TUE)).get(TUE)).toBe(45);
  });
});

describe("sprint view and indicators", () => {
  it("shows this week's days, objectives and progress from real data", async () => {
    const { plan } = await ensureToday(at(TUE));
    await recordSolve({ slug: plan.dsaNew[0], date: TUE, source: "manual", details: { confidence: "ok" } });
    await toggleSubtopic(plan.theory[0], TUE);
    await logStudySession({ minutes: 50, kind: "dsa", source: "timer" }, at(TUE));

    const sprint = await getSprintView(undefined, at(TUE));
    expect(sprint).toMatchObject({ week: 1, currentWeek: 1, from: "2026-10-05", to: "2026-10-11" });
    expect(sprint.days).toHaveLength(7);
    expect(sprint.days.find((d) => d.date === TUE)).toMatchObject({ source: "frozen", dsaSolved: 1, theoryDone: 1, minutes: 50 });
    expect(sprint.days.find((d) => d.date === "2026-10-09")?.source).toBe("projected");
    expect(sprint.summary.status).toBe("active");
    expect(sprint.summary.minutes).toBe(50);
    expect(sprint.topics.length).toBeGreaterThan(0);
    expect(sprint.topics.reduce((n, t) => n + t.done, 0)).toBeGreaterThanOrEqual(1);
    expect((await getSprintView(99, at(TUE))).week).toBe(sprint.totalWeeks);
    expect((await getSprintView(0, at(TUE))).week).toBe(1);
  });

  it("computes the seven indicators from raw records", async () => {
    await ensureToday(at(TUE));
    await Quiz.create({ date: TUE, kind: "daily", generatedBy: "bank", attempts: [{ answers: [0], correct: 1, pct: 80, submittedAt: new Date() }], bestPct: 80, passed: true });
    await logStudySession({ minutes: 60, kind: "dsa", source: "manual" }, at(TUE));
    const ind = Object.fromEntries((await getIndicators(at(WED))).map((i) => [i.id, i]));
    expect(ind.assessment.value).toBe("80%");
    expect(ind["study-time"].value).toBe("1 h");
    expect(ind.consistency.value).toBe("1/14 days");
    expect(ind.revision.value).toBe("0");
    expect(ind.skills.value).toMatch(/^0\/\d+$/);
  });

  it("includes the new collections in the backup", async () => {
    await savePlanner({ ...form, targetCompany: "Acme" }, at(TUE));
    await logStudySession({ minutes: 10, kind: "other", source: "manual" }, at(TUE));
    const backup = await exportBackup();
    expect(backup.collections.planchanges).toHaveLength(1);
    expect(backup.collections.studysessions).toHaveLength(1);
  });
});
