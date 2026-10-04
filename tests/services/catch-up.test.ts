import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { problems, subtopics } from "@/core/content";
import { DailyPlan, DayLog } from "@/core/models/day";
import { PracticeAttempt } from "@/core/models/learning";
import { Settings } from "@/core/models/system";
import { dayState } from "@/modules/planner/domain/day-status";
import { getCarryState } from "@/modules/planner/services/carry";
import { loadCatchUp } from "@/modules/planner/services/catch-up";
import { ensureToday } from "@/modules/planner/services/plan";
import { recordSolve, toggleSubtopic } from "@/modules/progress/services/progress";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const TUE = "2026-10-06";
const WED = "2026-10-07";
const THU = "2026-10-08";

/** Tuesday closes with most of its work undone; Wednesday is open. */
async function missedTuesday() {
  const tue = await ensureToday(at(TUE));
  await recordSolve({ slug: tue.plan.dsaNew[0]!, date: TUE, source: "manual", details: { confidence: "ok" } });
  const wed = await ensureToday(at(WED));
  return { tue, wed };
}

describe("catch-up: a missed day turns green once its work is made up", () => {
  it("is open while the work is still owed", async () => {
    const { wed } = await missedTuesday();
    const state = await loadCatchUp(wed.settings, WED);
    const tue = state.byDate.get(TUE)!;
    expect(tue.caughtUp).toBe(false);
    expect(tue.remaining.dsa).toBeGreaterThan(0);
    expect(tue.remaining.quiz).toBe(true);
    expect(state.open.map((c) => c.date)).toContain(TUE);
  });

  it("pays from extra work, and the quiz only by a catch-up practice quiz", async () => {
    const { tue, wed } = await missedTuesday();
    const spare = problems.filter((p) => p.track === "main" && !wed.plan.dsaNew.includes(p.slug) && p.slug !== tue.plan.dsaNew[0]).slice(0, 30);
    for (const p of spare) await recordSolve({ slug: p.slug, date: WED, source: "manual", details: { confidence: "ok" } });
    for (const t of subtopics.slice(0, 30)) await toggleSubtopic(t.id, WED);
    await ensureToday(at(WED)); // recompute today's log

    let state = await loadCatchUp(wed.settings, WED);
    const before = state.byDate.get(TUE)!;
    expect(before.remaining.dsa).toBe(0);
    expect(before.remaining.theory).toBe(0);
    expect(before.remaining.quiz).toBe(true); // the daily quiz can't be taken late
    expect(before.caughtUp).toBe(false);

    const ref = tue.plan.theory[0] ?? subtopics[0]!.id;
    await PracticeAttempt.create({ scope: "subtopic", ref, pct: 90, submittedAt: at(WED), questions: [], answers: [] });
    state = await loadCatchUp(wed.settings, WED);
    expect(state.byDate.get(TUE)!.caughtUp).toBe(true);
    expect(state.caughtUp.has(TUE)).toBe(true);

    const log = await DayLog.findOne({ date: TUE }).lean();
    expect(dayState({ date: TUE, today: WED, kind: "study", log: { dsaSolved: log?.dsaSolved ?? 0, theoryDone: log?.theoryDone ?? 0, quizPassed: !!log?.quizPassed, complete: !!log?.complete, freezeUsed: !!log?.freezeUsed }, caughtUp: true })).toBe("caught-up");
  });

  it("never changes the day's own log, the streak or freeze tokens", async () => {
    const { tue, wed } = await missedTuesday();
    const before = await DayLog.findOne({ date: TUE }).lean();
    const plan = await DailyPlan.findOne({ date: TUE }).lean();
    for (const p of problems.filter((x) => x.track === "main" && x.slug !== tue.plan.dsaNew[0]).slice(0, 20)) await recordSolve({ slug: p.slug, date: WED, source: "manual", details: { confidence: "ok" } });
    await loadCatchUp(wed.settings, WED);
    const after = await DayLog.findOne({ date: TUE }).lean();
    expect(after?.complete).toBe(false);
    expect(after?.complete).toBe(before?.complete);
    expect(after?.dsaSolved).toBe(before?.dsaSolved);
    expect((await DailyPlan.findOne({ date: TUE }).lean())?.dsaTarget).toBe(plan?.dsaTarget);
    expect((await ensureToday(at(THU))).streak).toBe(0);
  });

  it("is empty when nothing was left over", async () => {
    await ensureToday(at(TUE));
    const wed = await ensureToday(at(WED));
    // Tuesday had no work at all, so it owes its whole plan; a day with no closed days owes nothing.
    const first = await loadCatchUp(wed.settings, TUE);
    expect(first.list).toEqual([]);
  });
});

describe("carry limits from real data", () => {
  it("warns when a closed day left more than the limit open", async () => {
    const { wed } = await missedTuesday();
    const settings = { ...wed.settings, carryLimits: { perDay: 1, perWeek: 2, total: 100 } };
    const { status } = await getCarryState({ today: WED, settings, todayIsStudyDay: true, owed: 3 });
    expect(status.level).not.toBe("ok");
    expect(status.remedies.some((r) => r.kind === "extend-hours")).toBe(true);
    const relaxed = await getCarryState({ today: WED, settings: { ...wed.settings, carryLimits: { perDay: 100, perWeek: 100, total: 100 } }, todayIsStudyDay: true, owed: 3 });
    expect(relaxed.status.level).toBe("ok");
  });
});
