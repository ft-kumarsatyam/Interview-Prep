import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DayLog } from "@/core/models/day";
import { RUN_LOG_KEEP, bestMs, importSolvedSchema, runInputSchema, savedQueryInputSchema } from "@/modules/dsa/domain/code-lab";
import { deleteQuery, importSolved, listRuns, listSavedQueries, listSolved, markSolved, recordRun, saveQuery } from "@/modules/dsa/services/code-lab";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const run = (over: Partial<Parameters<typeof recordRun>[0]> = {}) => ({ kind: "dsa" as const, ref: "two-sum", language: "python", action: "submit" as const, ok: true, passed: 5, total: 5, ms: 40, ...over });

describe("run history", () => {
  it("records runs per problem, newest first, and keeps only the latest few", async () => {
    for (let i = 0; i < RUN_LOG_KEEP + 5; i++) await recordRun(run({ ms: i }), "2026-10-23");
    await recordRun(run({ ref: "other" }), "2026-10-23");
    const runs = await listRuns("dsa", "two-sum", 100);
    expect(runs).toHaveLength(RUN_LOG_KEEP);
    expect(runs[0]!.ms).toBe(RUN_LOG_KEEP + 4);
    expect(await listRuns("dsa", "other")).toHaveLength(1);
    expect(await listRuns("playground", "two-sum")).toHaveLength(0);
  });

  it("finds the best passing time and validates input", () => {
    const base = { id: "x", language: "js", passed: 1, total: 1, on: "2026-10-23" };
    expect(bestMs([{ ...base, action: "submit", ok: true, ms: 30 }, { ...base, action: "submit", ok: true, ms: 12 }, { ...base, action: "submit", ok: false, ms: 1 }, { ...base, action: "run", ok: true, ms: 2 }])).toBe(12);
    expect(bestMs([])).toBeNull();
    expect(runInputSchema.safeParse(run()).success).toBe(true);
    expect(runInputSchema.safeParse(run({ kind: "nope" as never })).success).toBe(false);
    expect(runInputSchema.safeParse(run({ ms: -1 })).success).toBe(false);
  });
});

describe("saved DB Lab queries", () => {
  it("saves, updates, lists newest first and deletes", async () => {
    const a = await saveQuery({ title: "All users", sql: "SELECT * FROM users", mode: "sql", dataset: "shop" });
    const b = await saveQuery({ title: "Orders", sql: "SELECT 1", mode: "postgres", dataset: "" });
    await saveQuery({ id: a, title: "All users v2", sql: "SELECT id FROM users", mode: "sql", dataset: "shop" });
    const list = await listSavedQueries();
    expect(list.map((q) => q.title)).toEqual(["All users v2", "Orders"]);
    await expect(saveQuery({ id: "a".repeat(24), title: "x", sql: "y", mode: "sql", dataset: "" })).rejects.toThrow("Unknown query");
    await deleteQuery(b);
    await deleteQuery("not-an-id");
    expect(await listSavedQueries()).toHaveLength(1);
  });

  it("validates a query before it is saved", () => {
    expect(savedQueryInputSchema.safeParse({ title: " ", sql: "SELECT 1", mode: "sql" }).success).toBe(false);
    expect(savedQueryInputSchema.safeParse({ title: "t", sql: "x".repeat(8001), mode: "sql" }).success).toBe(false);
    expect(savedQueryInputSchema.safeParse({ title: "t", sql: "SELECT 1", mode: "oracle" }).success).toBe(false);
  });
});

describe("DB Lab progress", () => {
  it("keeps the first solve date and counts later attempts", async () => {
    await markSolved("c1", "sql", "2026-10-01");
    await markSolved("c1", "sql", "2026-10-09");
    expect(await listSolved()).toEqual([{ challengeId: "c1", mode: "sql", solvedOn: "2026-10-01", attempts: 2 }]);
  });

  it("imports local solves once without overwriting, and never touches the streak", async () => {
    await markSolved("c1", "sql", "2026-10-01");
    const added = await importSolved([{ challengeId: "c1", mode: "sql" }, { challengeId: "c2", mode: "mongo" }], "2026-10-23");
    expect(added).toBe(1);
    const solved = await listSolved();
    expect(solved.find((s) => s.challengeId === "c1")!.solvedOn).toBe("2026-10-01");
    expect(solved.find((s) => s.challengeId === "c2")!.mode).toBe("mongo");
    expect(await DayLog.countDocuments()).toBe(0);
    expect(importSolvedSchema.safeParse({ solved: [{ challengeId: "", mode: "sql" }] }).success).toBe(false);
  });
});
