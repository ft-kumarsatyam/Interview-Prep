import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Settings } from "@/lib/models/system";
import { exportBackup } from "@/lib/services/export";
import { getNavBadges } from "@/lib/services/nav";
import { ensureToday } from "@/lib/services/plan";
import { recordSolve, toggleSubtopic } from "@/lib/services/progress";
import { saveSettings, getSettings } from "@/lib/services/settings";
import { getStats } from "@/lib/services/stats";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings", startDate: "2026-10-05", endDate: "2027-03-21", restDays: ["2026-10-04"] });
});

const form = {
  startDate: "2026-10-05",
  endDate: "2027-03-21",
  quizPassPct: 70,
  topicMasteryPct: 80,
  minDailyDsa: 2,
  maxDailyDsa: 5,
  maxSaturdayDsa: 8,
  maxDailyTheory: 4,
  revisionWeeks: 2,
  restDays: ["2026-10-06", "2026-10-20"],
  googleNewsQueries: ["OpenAI", "Bun runtime"],
  leetcodeUsername: "new-user",
};

describe("saveSettings", () => {
  it("saves, freezes past rest days and resets LeetCode history on a new username", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { leetcodeUsername: "old", leetcodeSeenIds: ["x"], leetcodeLastSyncAt: new Date() } });
    const s = await saveSettings(form, at("2026-10-10"));
    expect(s).toMatchObject({ quizPassPct: 70, topicMasteryPct: 80, maxDailyDsa: 5, leetcodeUsername: "new-user", leetcodeSeenIds: [], leetcodeLastSyncAt: null });
    expect(s.restDays).toEqual(["2026-10-04", "2026-10-20"]);
    expect(s.googleNewsQueries).toEqual(["OpenAI", "Bun runtime"]);

    await saveSettings({ ...form, googleNewsQueries: null }, at("2026-10-10"));
    expect((await getSettings()).googleNewsQueries).toBeNull();
  });
});

describe("stats, badges and export", () => {
  it("summarises progress and exports every user collection", async () => {
    await recordSolve({ slug: "two-sum", date: "2026-10-06", source: "manual", details: { confidence: "easy" } });
    await recordSolve({ slug: "contains-duplicate", date: "2026-10-07", source: "manual", details: { confidence: "ok" } });
    await toggleSubtopic("js-basics:0", "2026-10-07");

    const stats = await getStats(at("2026-10-07"));
    expect(stats.totals).toMatchObject({ solved: 2, mainSolved: 2 });
    expect(stats.cumulative.at(-1)).toMatchObject({ date: "2026-10-07", actual: 2 });
    expect(stats.syllabusTracks.find((t) => t.key === "js")?.done).toBe(1);
    expect(stats.leetcode).toMatchObject({ username: null, stats: null });

    const backup = await exportBackup();
    expect(Object.keys(backup.collections)).toEqual(
      expect.arrayContaining(["settings", "problemprogress", "subtopicprogress", "masteries", "practiceattempts", "quizzes", "daylogs"]),
    );
    expect(backup.collections.problemprogress).toHaveLength(2);
  });

  it("shows the quiz dot only once work is logged and the quiz isn't passed", async () => {
    await ensureToday(at("2026-10-06"));
    expect((await getNavBadges(at("2026-10-06")))["/quiz"]).toBeUndefined();
    const { plan } = await ensureToday(at("2026-10-06"));
    await recordSolve({ slug: plan.dsaNew[0], date: "2026-10-06", source: "manual", details: { confidence: "ok" } });
    await toggleSubtopic(plan.theory[0], "2026-10-06");
    expect((await getNavBadges(at("2026-10-06")))["/quiz"]).toBe(true);
  });
});
