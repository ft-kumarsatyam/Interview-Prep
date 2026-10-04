import { readFileSync } from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { problems } from "@/lib/content";
import { columnNameNote, compareRows, isBlankQuery, type Row } from "@/lib/domain/db-lab";
import { SQL_PROBLEMS, sqlProblemBySlug } from "@/lib/domain/sql-problems";
import { parseSchema } from "@/lib/domain/sql-schema";
import { testSummary } from "@/lib/playground/test-summary";
import { SQL_COMPAT_SOURCE } from "@/lib/sandbox/sql-compat";
import { judgeOutputs } from "@/lib/sandbox/sql-judge";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
const registerMysqlCompat = new Function(`${SQL_COMPAT_SOURCE}\nreturn registerMysqlCompat;`)() as (db: Database) => void;

beforeAll(async () => {
  const wasm = readFileSync(path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"));
  SQL = await initSqlJs({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
});

function fresh(seed: string): Database {
  const db = new SQL.Database();
  registerMysqlCompat(db);
  db.exec(seed);
  return db;
}

function answer(slug: string): { columns: string[]; rows: Row[] } {
  const p = sqlProblemBySlug.get(slug)!;
  const db = fresh(p.seed);
  let res = db.exec(p.solution);
  if (p.verify) res = db.exec(p.verify);
  db.close();
  const last = res.at(-1);
  return { columns: last?.columns ?? [], rows: (last?.values ?? []) as Row[] };
}

describe("SQL track coverage", () => {
  it("covers every SQL-track sheet problem exactly once", () => {
    const sheet = problems.filter((p) => p.track === "sql").map((p) => p.slug).toSorted();
    expect(SQL_PROBLEMS.map((p) => p.slug).toSorted()).toEqual(sheet);
  });

  for (const p of SQL_PROBLEMS) {
    it(`${p.slug}: seeds, and the reference returns rows`, () => {
      expect(parseSchema(p.seed).length).toBeGreaterThan(0);
      const { rows } = answer(p.slug);
      expect(rows.length).toBeGreaterThan(0);
    });
  }
});

describe("pinned answers", () => {
  const rows = (slug: string) => answer(slug).rows;
  it("matches LeetCode's expected output", () => {
    expect(rows("employees-earning-more-than-their-managers").map((r) => r[0]).toSorted()).toEqual(["Ann", "Joe"]);
    expect(rows("delete-duplicate-emails")).toEqual([[1, "john@example.com"], [2, "bob@example.com"], [4, "amy@example.com"]]);
    expect(rows("rising-temperature").map((r) => r[0]).toSorted()).toEqual([2, 4]);
    expect(rows("second-highest-salary")).toEqual([[200]]);
    expect(rows("nth-highest-salary")).toEqual([[200]]);
    expect(rows("rank-scores").map((r) => r[1])).toEqual([1, 1, 2, 3, 3, 4]);
    expect(rows("consecutive-numbers").map((r) => r[0]).toSorted()).toEqual([1, 3]);
    expect(rows("game-play-analysis-iv")).toEqual([[0.33]]);
    expect(rows("managers-with-at-least-5-direct-reports")).toEqual([["John"]]);
    expect(rows("immediate-food-delivery-ii")).toEqual([[50]]);
    expect(rows("restaurant-growth")).toEqual([
      ["2019-01-07", 860, 122.86],
      ["2019-01-08", 840, 120],
      ["2019-01-09", 840, 120],
      ["2019-01-10", 1000, 142.86],
    ]);
    expect(rows("exchange-seats").map((r) => r[1])).toEqual(["Doris", "Abbot", "Green", "Emerson", "Jeames"]);
    expect(rows("movie-rating")).toEqual([["Daniel"], ["Frozen 2"]]);
    expect(rows("last-person-to-fit-in-the-bus")).toEqual([["John Cena"]]);
    expect(compareRows(rows("count-salary-categories"), [["Low Salary", 1], ["Average Salary", 0], ["High Salary", 3]], false)).toEqual({ ok: true });
    expect(compareRows(rows("product-price-at-a-given-date"), [[1, 35], [2, 50], [3, 10]], false)).toEqual({ ok: true });
    expect(rows("investments-in-2016")).toEqual([[45]]);
    expect(rows("friend-requests-ii-who-has-the-most-friends")).toEqual([[3, 3]]);
    expect(rows("department-top-three-salaries")).toHaveLength(6);
    expect(compareRows(rows("trips-and-users"), [["2013-10-01", 0.33], ["2013-10-02", 0], ["2013-10-03", 0.5]], false)).toEqual({ ok: true });
    expect(rows("human-traffic-of-stadium").map((r) => r[0])).toEqual([5, 6, 7, 8]);
    expect(compareRows(rows("confirmation-rate"), [[6, 0], [3, 0], [7, 1], [2, 0.5]], false)).toEqual({ ok: true });
  });
});

describe("MySQL compatibility helpers", () => {
  const one = (sql: string) => {
    const db = fresh("");
    const v = db.exec(sql)[0]!.values[0]![0];
    db.close();
    return v;
  };
  it("behaves like MySQL for the common functions", () => {
    expect(one("SELECT IF(2 > 1, 'yes', 'no')")).toBe("yes");
    expect(one("SELECT DATEDIFF('2024-03-01', '2024-02-28')")).toBe(2);
    expect(one("SELECT DATEDIFF('2024-01-01 23:59:00', '2024-01-02 00:01:00')")).toBe(-1);
    expect(one("SELECT DATE_FORMAT('2024-03-07', '%Y-%m')")).toBe("2024-03");
    expect(one("SELECT DATE_FORMAT('2024-03-07', '%M %e, %Y')")).toBe("March 7, 2024");
    expect(one("SELECT YEAR('2019-08-16') * 100 + MONTH('2019-08-16')")).toBe(201908);
    expect(one("SELECT ADDDATE('2024-02-28', 2)")).toBe("2024-03-01");
    expect(one("SELECT LEAST(3, 7) + GREATEST(3, 7)")).toBe(10);
    expect(one("SELECT DATEDIFF(NULL, '2024-01-01')")).toBeNull();
  });
});

describe("schema parser", () => {
  it("reads columns, types, keys and row counts", () => {
    const [t] = parseSchema(sqlProblemBySlug.get("game-play-analysis-i")!.seed);
    expect(t!.name).toBe("Activity");
    expect(t!.rows).toBe(5);
    expect(t!.columns.map((c) => [c.name, c.type, c.primary])).toEqual([
      ["player_id", "INTEGER", true],
      ["device_id", "INTEGER", false],
      ["event_date", "TEXT", true],
      ["games_played", "INTEGER", false],
    ]);
  });
  it("counts rows across multi-line inserts and ignores parentheses inside strings", () => {
    const tables = parseSchema("CREATE TABLE a (id INTEGER PRIMARY KEY, b INTEGER REFERENCES c(id));\nINSERT INTO a VALUES (1,'x (y)'),\n (2,'it''s');");
    expect(tables[0]!.rows).toBe(2);
    expect(tables[0]!.columns[1]).toMatchObject({ name: "b", references: "c" });
  });
});

describe("judgeOutputs", () => {
  const sets = (columns: string[], rows: Row[]) => ({ kind: "sets" as const, sets: [{ columns, rows, total: rows.length }], ms: 1 });
  it("accepts matching rows and notes a column-name mismatch", () => {
    const v = judgeOutputs(sets(["mail"], [["a"]]), sets(["Email"], [["a"]]), false);
    expect(v.ok).toBe(true);
    expect(v.note).toContain("LeetCode checks names");
  });
  it("explains errors and differences", () => {
    expect(judgeOutputs({ kind: "error", message: "near SELEC" }, sets(["x"], [[1]]), false)).toMatchObject({ ok: false, text: expect.stringContaining("error") });
    expect(judgeOutputs(sets(["x"], [[1]]), sets(["x"], [[1], [2]]), false)).toMatchObject({ ok: false, text: "Expected 2 rows, got 1." });
    expect(judgeOutputs({ kind: "sets", sets: [], ms: 1 }, sets(["x"], [[1]]), false).text).toContain("no result set");
  });
});

describe("testSummary", () => {
  it("reads the worker's closing line", () => {
    expect(testSummary([{ level: "log", text: "PASS a" }, { level: "log", text: "3 passed, 0 failed" }])).toEqual({ passed: 3, failed: 0 });
    expect(testSummary([{ level: "error", text: "1 passed, 2 failed" }])).toEqual({ passed: 1, failed: 2 });
    expect(testSummary([{ level: "log", text: "hello" }])).toBeNull();
    expect(testSummary([])).toBeNull();
  });
});

describe("helpers", () => {
  it("flags column-name differences only when the widths match", () => {
    expect(columnNameNote(["Email"], ["email"])).toBeUndefined();
    expect(columnNameNote(["mail"], ["Email"])).toContain("expected Email");
    expect(columnNameNote(["a", "b"], ["a"])).toBeUndefined();
  });
  it("treats comment-only editors as blank", () => {
    expect(isBlankQuery("-- hi\n  /* x */ ")).toBe(true);
    expect(isBlankQuery("-- hi\nSELECT 1")).toBe(false);
    expect(isBlankQuery("// note", "mongo")).toBe(true);
  });
});
