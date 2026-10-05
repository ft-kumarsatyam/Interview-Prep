import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, startDb, stopDb } from "@/tests/services/db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

describe("owner scoping", () => {
  it("stamps new rows with the current owner and hides other owners' rows", async () => {
    const { DailyPlan } = await import("@/core/models/day");
    const { runAsOwner } = await import("@/core/db/owner");
    await DailyPlan.syncIndexes();
    await runAsOwner("alice", async () => await DailyPlan.create({ date: "2026-01-01", weekNumber: 1, kind: "study", dsaTarget: 1, theoryTarget: 1 }));
    await runAsOwner("bob", async () => await DailyPlan.create({ date: "2026-01-01", weekNumber: 1, kind: "study", dsaTarget: 1, theoryTarget: 1 }));

    expect(await runAsOwner("alice", async () => await DailyPlan.countDocuments({}))).toBe(1);
    expect((await runAsOwner("bob", async () => await DailyPlan.findOne({ date: "2026-01-01" }).lean<{ ownerId: string }>()))?.ownerId).toBe("bob");
    expect(await DailyPlan.countDocuments({ ownerId: { $in: ["alice", "bob"] } })).toBe(2);
  });

  it("allows the same natural key once per owner but not twice for one owner", async () => {
    const { Quiz } = await import("@/core/models/day");
    const { runAsOwner } = await import("@/core/db/owner");
    await Quiz.syncIndexes();
    const row = { date: "2026-01-01", kind: "daily", generatedBy: "bank" } as const;
    await runAsOwner("alice", async () => await Quiz.create(row));
    await runAsOwner("bob", async () => await Quiz.create(row));
    await expect(runAsOwner("alice", async () => await Quiz.create(row))).rejects.toThrow(/duplicate key/);
  });

  it("scopes upserts, updates, deletes and aggregations", async () => {
    const { DayLog } = await import("@/core/models/day");
    const { runAsOwner } = await import("@/core/db/owner");
    await DayLog.syncIndexes();
    await runAsOwner("alice", async () => await DayLog.updateOne({ date: "2026-02-01" }, { $set: { dsaSolved: 1 } }, { upsert: true }));
    await runAsOwner("bob", async () => await DayLog.updateOne({ date: "2026-02-01" }, { $set: { dsaSolved: 1 } }, { upsert: true }));
    expect(await DayLog.countDocuments({ ownerId: { $in: ["alice", "bob"] } })).toBe(2);

    const agg = await runAsOwner("alice", async () => await DayLog.aggregate([{ $count: "n" }]));
    expect(agg[0]?.n).toBe(1);
    await runAsOwner("alice", async () => await DayLog.deleteMany({}));
    expect(await DayLog.countDocuments({ ownerId: "bob" })).toBe(1);
  });

  it("scoped() pins an explicit owner", async () => {
    const { DayLog } = await import("@/core/models/day");
    const { scoped } = await import("@/core/db/repo");
    await DayLog.syncIndexes();
    await scoped(DayLog, "carol").create({ date: "2026-03-01" });
    expect(await scoped(DayLog, "carol").count()).toBe(1);
    expect(await scoped(DayLog, "dave").count()).toBe(0);
  });
});

describe("migration 001-owner-id", () => {
  it("tags legacy rows, swaps in compound unique indexes, and is recorded once", async () => {
    const { DayLog } = await import("@/core/models/day");
    const { runMigrations } = await import("@/core/db/migrations/runner");
    const { MigrationDoc } = await import("@/core/models/migration");
    await DayLog.collection.insertOne({ date: "2025-12-31" });
    const first = await runMigrations();
    expect(first.applied).toEqual(["001-owner-id", "002-event-indexes", "003-vector-index", "004-ai-chat-indexes", "005-captured-notes", "006-job-profiles", "007-posting-years", "008-question-flags", "009-interview-bank"]);
    expect(await DayLog.countDocuments({ date: "2025-12-31" })).toBe(1);
    expect((await DayLog.collection.findOne({ date: "2025-12-31" }))?.ownerId).toBe("owner");
    const idx = await DayLog.collection.indexes();
    expect(idx.some((i) => i.unique && JSON.stringify(i.key) === JSON.stringify({ ownerId: 1, date: 1 }))).toBe(true);
    expect(idx.some((i) => i.unique && JSON.stringify(i.key) === JSON.stringify({ date: 1 }))).toBe(false);

    expect((await runMigrations()).applied).toEqual([]);
    expect(await MigrationDoc.countDocuments()).toBe(9);
    void mongoose;
  });
});
