import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AcSubmission, LeetCodeClient } from "@/lib/leetcode/client";
import { DayLog } from "@/lib/models/day";
import { ProblemProgress } from "@/lib/models/progress";
import { Notification, Settings } from "@/lib/models/system";
import { syncLeetCode } from "@/lib/services/leetcode-sync";
import { recordSolve } from "@/lib/services/progress";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings", leetcodeUsername: "tester" });
});

const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
function fake(subs: AcSubmission[]): LeetCodeClient & { calls: number } {
  return {
    calls: 0,
    async recentAccepted() {
      this.calls++;
      return subs;
    },
    async stats() {
      return null;
    },
  };
}

describe("syncLeetCode", () => {
  it("imports new solves as needing details and counts them toward the day", async () => {
    const client = fake([
      { id: "a", titleSlug: "two-sum", timestamp: sec("2026-10-06T05:00:00Z") },
      { id: "b", titleSlug: "not-in-prepos", timestamp: sec("2026-10-06T05:00:00Z") },
    ]);
    const res = await syncLeetCode({ client, now: at("2026-10-06") });
    expect(res).toEqual({ status: "ok", imported: 1, untracked: 1 });

    const row = await ProblemProgress.findOne({ slug: "two-sum" }).lean();
    expect(row).toMatchObject({ status: "solved", source: "leetcode", needsDetails: true, nextReviewAt: "2026-10-20" });
    expect((await DayLog.findOne({ date: "2026-10-06" }).lean())?.dsaSolved).toBe(1);
    expect(await Notification.countDocuments({ kind: "sync" })).toBe(1);
  });

  it("is throttled and idempotent", async () => {
    const client = fake([{ id: "a", titleSlug: "two-sum", timestamp: sec("2026-10-06T05:00:00Z") }]);
    await syncLeetCode({ client, now: at("2026-10-06") });
    expect((await syncLeetCode({ client, now: at("2026-10-06") })).status).toBe("throttled");
    expect(client.calls).toBe(1);

    const forced = await syncLeetCode({ client, force: true, now: at("2026-10-06") });
    expect(forced).toMatchObject({ status: "ok", imported: 0 });
    expect((await ProblemProgress.findOne({ slug: "two-sum" }).lean())?.solveDates).toEqual(["2026-10-06"]);
  });

  it("never overwrites details you already logged that day", async () => {
    await recordSolve({ slug: "two-sum", date: "2026-10-06", source: "manual", details: { confidence: "easy", approach: "hash map" } });
    await syncLeetCode({ client: fake([{ id: "a", titleSlug: "two-sum", timestamp: sec("2026-10-06T05:00:00Z") }]), now: at("2026-10-06") });
    expect(await ProblemProgress.findOne({ slug: "two-sum" }).lean()).toMatchObject({ confidence: "easy", needsDetails: false, approach: "hash map" });
  });

  it("filling in details clears the flag and reschedules from the synced day", async () => {
    await syncLeetCode({ client: fake([{ id: "a", titleSlug: "two-sum", timestamp: sec("2026-10-06T05:00:00Z") }]), now: at("2026-10-06") });
    await recordSolve({ slug: "two-sum", date: "2026-10-06", source: "manual", details: { confidence: "struggled" } });
    expect(await ProblemProgress.findOne({ slug: "two-sum" }).lean()).toMatchObject({ needsDetails: false, nextReviewAt: "2026-10-09", reviewCount: 0 });
  });

  it("reports errors without throwing and does nothing when no username is set", async () => {
    const broken: LeetCodeClient = {
      recentAccepted: () => Promise.reject(new Error("LeetCode responded 503")),
      stats: async () => null,
    };
    expect(await syncLeetCode({ client: broken, now: at("2026-10-06") })).toEqual({ status: "error", message: "LeetCode responded 503" });
    await Settings.updateOne({ _id: "settings" }, { $set: { leetcodeUsername: null } });
    expect((await syncLeetCode({ force: true })).status).toBe("disabled");
  });
});
