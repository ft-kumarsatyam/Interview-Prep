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

import { CHECK_FLOOR_MS, checkAccepted } from "@/lib/services/leetcode-sync";

describe("checkAccepted (copy and open, then detect)", () => {
  const T0 = new Date("2026-10-06T10:00:00Z");
  const since = T0.getTime();
  const sub = (id: string, slug: string, offsetSec: number): AcSubmission => ({ id, titleSlug: slug, timestamp: Math.floor(T0.getTime() / 1000) + offsetSec });

  it("is pending until the submission appears", async () => {
    const client = fake([sub("x", "valid-anagram", 10)]);
    expect(await checkAccepted({ slug: "two-sum", sinceMs: since, now: T0, client })).toEqual({ status: "pending" });
  });

  it("detects an Accepted submission made after you clicked, imports it and returns its local date", async () => {
    const client = fake([sub("a", "two-sum", 45)]);
    const res = await checkAccepted({ slug: "two-sum", sinceMs: since, now: new Date(T0.getTime() + 60_000), client });
    expect(res).toEqual({ status: "accepted", date: "2026-10-06" });
    expect(await ProblemProgress.findOne({ slug: "two-sum" }).lean()).toMatchObject({ status: "solved", source: "leetcode", needsDetails: true });
  });

  it("ignores an older Accepted submission of the same problem", async () => {
    const client = fake([sub("old", "two-sum", -3 * 3600)]);
    expect(await checkAccepted({ slug: "two-sum", sinceMs: since, now: new Date(T0.getTime() + 60_000), client })).toEqual({ status: "pending" });
  });

  it("allows a little clock skew between your machine and LeetCode", async () => {
    const client = fake([sub("a", "two-sum", -60)]);
    expect((await checkAccepted({ slug: "two-sum", sinceMs: since, now: new Date(T0.getTime() + 60_000), client })).status).toBe("accepted");
  });

  it("makes at most one LeetCode request per 30 seconds, however often it is polled", async () => {
    const client = fake([]);
    expect((await checkAccepted({ slug: "two-sum", sinceMs: since, now: T0, client })).status).toBe("pending");
    expect((await checkAccepted({ slug: "two-sum", sinceMs: since, now: new Date(T0.getTime() + CHECK_FLOOR_MS - 1) , client })).status).toBe("wait");
    expect(client.calls).toBe(1);
    expect((await checkAccepted({ slug: "two-sum", sinceMs: since, now: new Date(T0.getTime() + CHECK_FLOOR_MS), client })).status).toBe("pending");
    expect(client.calls).toBe(2);
  });

  it("overlapping polls cannot both go through", async () => {
    const client = fake([]);
    const results = await Promise.all([1, 2, 3, 4].map(() => checkAccepted({ slug: "two-sum", sinceMs: since, now: T0, client })));
    expect(results.filter((r) => r.status === "pending")).toHaveLength(1);
    expect(client.calls).toBe(1);
  });

  it("explains itself when no username is set, and rejects unknown problems", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { leetcodeUsername: null } });
    expect(await checkAccepted({ slug: "two-sum", sinceMs: since, now: T0, client: fake([]) })).toEqual({ status: "disabled" });
    await Settings.updateOne({ _id: "settings" }, { $set: { leetcodeUsername: "tester" } });
    expect((await checkAccepted({ slug: "nope-nope", sinceMs: since, now: T0, client: fake([]) })).status).toBe("error");
  });

  it("reports a LeetCode failure without throwing", async () => {
    const client: LeetCodeClient = {
      async recentAccepted() {
        throw new Error("LeetCode responded 503");
      },
      async stats() {
        return null;
      },
    };
    expect(await checkAccepted({ slug: "two-sum", sinceMs: since, now: T0, client })).toEqual({ status: "error", message: "LeetCode responded 503" });
  });

  it("a nonsense sinceMs can't reach further back than the 6 hour window", async () => {
    const client = fake([sub("old", "two-sum", -7 * 3600)]);
    expect((await checkAccepted({ slug: "two-sum", sinceMs: 0, now: new Date(T0.getTime() + 60_000), client })).status).toBe("pending");
  });
});
