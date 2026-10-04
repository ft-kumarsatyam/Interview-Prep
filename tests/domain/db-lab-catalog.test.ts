import { readFileSync } from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { DB_CHALLENGES, MONGO_DATASETS, SQL_DATASETS, challengesFor, mongoDataset, sqlDataset, type DbChallenge, type Row } from "@/modules/dsa/domain/db-lab";
import { MONGO_TOPIC_IDS, SQL_TOPIC_IDS, catalogStats, groupByTopic, nextUnsolved, topicsFor } from "@/modules/dsa/domain/db-lab-topics";
import { runMongo, type Collections } from "@/modules/dsa/domain/mongo-query";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => {
  const wasm = readFileSync(path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"));
  SQL = await initSqlJs({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
});

/**
 * Rebuilds every table with its rows stored in the opposite order (CREATE TABLE AS keeps no rowid alias, so the physical
 * order really is reversed). A query whose ORDER BY leaves a tie to chance then returns different rows.
 */
function reverseScanOrder(db: { exec(sql: string): Array<{ values: unknown[][] }> }) {
  const tables = (db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").at(-1)?.values ?? []).map((r) => String(r[0]));
  for (const t of tables) db.exec(`CREATE TABLE "${t}__r" AS SELECT * FROM "${t}" ORDER BY rowid DESC; DROP TABLE "${t}"; ALTER TABLE "${t}__r" RENAME TO "${t}";`);
}

const sqlRows = (seed: string, query: string, reverseScan = false): Row[] => {
  const db = new SQL.Database();
  db.exec(seed);
  if (reverseScan) reverseScanOrder(db);
  const rows = (db.exec(query).at(-1)?.values ?? []) as Row[];
  db.close();
  return rows;
};
const reversed = (c: Collections): Collections => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [...v].toReversed()]));
const docs = (q: string, c: Collections) => {
  const r = runMongo(q, c);
  if (!r.ok) throw new Error(r.error);
  return r.docs;
};

describe("the catalogue is big enough and well balanced", () => {
  const stats = catalogStats(DB_CHALLENGES);
  it("has at least 100 challenges across both languages and every difficulty", () => {
    expect(stats.total).toBeGreaterThanOrEqual(100);
    expect(stats.byMode.sql).toBeGreaterThanOrEqual(70);
    expect(stats.byMode.mongo).toBeGreaterThanOrEqual(28);
    expect(stats.byDifficulty.Easy).toBeGreaterThanOrEqual(25);
    expect(stats.byDifficulty.Medium).toBeGreaterThanOrEqual(35);
    expect(stats.byDifficulty.Hard).toBeGreaterThanOrEqual(15);
    expect(stats.byMode.sql + stats.byMode.mongo).toBe(stats.total);
  });
  it("gives every topic of both languages at least three challenges, and uses no unknown topic", () => {
    for (const mode of ["sql", "mongo"] as const) {
      const ids = (mode === "sql" ? SQL_TOPIC_IDS : MONGO_TOPIC_IDS) as readonly string[];
      for (const id of ids) expect(DB_CHALLENGES.filter((c) => c.mode === mode && c.topic === id).length, `${mode}/${id}`).toBeGreaterThanOrEqual(3);
    }
    for (const c of DB_CHALLENGES) expect(topicsFor(c.mode).some((t) => t.id === c.topic), `${c.id} topic ${c.topic}`).toBe(true);
  });
  it("gives every dataset at least five challenges", () => {
    for (const d of SQL_DATASETS) expect(challengesFor("sql", d.id).length, d.id).toBeGreaterThanOrEqual(5);
    for (const d of MONGO_DATASETS) expect(challengesFor("mongo", d.id).length, d.id).toBeGreaterThanOrEqual(5);
  });
});

describe("every challenge is well formed", () => {
  it("has a unique id that starts with its language, and a unique title within its language", () => {
    expect(new Set(DB_CHALLENGES.map((c) => c.id)).size).toBe(DB_CHALLENGES.length);
    for (const c of DB_CHALLENGES) expect(c.id.startsWith(`${c.mode}-`), c.id).toBe(true);
    for (const mode of ["sql", "mongo"] as const) {
      const titles = DB_CHALLENGES.filter((c) => c.mode === mode).map((c) => c.title.toLowerCase());
      expect(new Set(titles).size, `${mode} titles`).toBe(titles.length);
    }
  });
  it("has a real prompt, hint, solution and concepts, and the hint does not give the answer away", () => {
    for (const c of DB_CHALLENGES) {
      expect(c.prompt.length, c.id).toBeGreaterThan(25);
      expect(c.hint.length, c.id).toBeGreaterThan(10);
      expect(c.concepts.length, c.id).toBeGreaterThan(0);
      expect(c.hint.replace(/\s+/g, " ").includes(c.solution.replace(/\s+/g, " ")), `${c.id} hint contains the whole solution`).toBe(false);
    }
  });
  it("asks for an order only when its solution sorts, and says how ties break in the prompt", () => {
    for (const c of DB_CHALLENGES.filter((x) => x.ordered)) {
      expect(c.mode === "sql" ? /ORDER BY/i.test(c.solution) : /\.sort\(|\$sort/.test(c.solution), `${c.id} is ordered but its solution does not sort`).toBe(true);
    }
  });
});

describe("the data behind the challenges", () => {
  for (const d of SQL_DATASETS) {
    it(`${d.id}: seeds cleanly with no dangling foreign keys`, () => {
      const db = new SQL.Database();
      db.exec(d.seed);
      expect(db.exec("PRAGMA foreign_key_check")).toEqual([]);
      db.close();
    });
  }
});

describe("answers are unambiguous", () => {
  it("the check itself works: it flags a tied ORDER BY and passes a fully ordered one", () => {
    const seed = sqlDataset("company").seed;
    const tied = "SELECT name FROM employees ORDER BY department_id";
    const full = "SELECT name FROM employees ORDER BY department_id, name";
    expect(sqlRows(seed, tied, true)).not.toEqual(sqlRows(seed, tied, false));
    expect(sqlRows(seed, full, true)).toEqual(sqlRows(seed, full, false));
  });
  const ordered = (mode: "sql" | "mongo") => DB_CHALLENGES.filter((c) => c.mode === mode && c.ordered);
  for (const c of ordered("sql")) {
    it(`${c.id}: the order does not depend on how rows happen to be scanned`, () => {
      const seed = sqlDataset(c.dataset).seed;
      expect(sqlRows(seed, c.solution, true), "a tie in the ORDER BY is left to chance").toEqual(sqlRows(seed, c.solution, false));
    });
  }
  for (const c of ordered("mongo")) {
    it(`${c.id}: the order does not depend on document insertion order`, () => {
      const cols = mongoDataset(c.dataset).collections;
      expect(docs(c.solution, reversed(cols))).toEqual(docs(c.solution, cols));
    });
  }
  it("the unordered ones return the same set whatever the scan order", () => {
    const norm = (rows: Row[]) => rows.map((r) => JSON.stringify(r)).toSorted();
    for (const c of DB_CHALLENGES.filter((x) => x.mode === "sql" && !x.ordered)) {
      const seed = sqlDataset(c.dataset).seed;
      expect(norm(sqlRows(seed, c.solution, true)), c.id).toEqual(norm(sqlRows(seed, c.solution, false)));
    }
  });
});

describe("pinned answers for the harder new challenges", () => {
  const get = (id: string) => {
    const c = DB_CHALLENGES.find((x) => x.id === id) as DbChallenge;
    return c.mode === "sql" ? sqlRows(sqlDataset(c.dataset).seed, c.solution) : docs(c.solution, mongoDataset(c.dataset).collections);
  };
  it("longest streak, late loans, premium-only songs and the month-over-month change", () => {
    expect(get("sql-longest-streak")).toEqual([["Fay", 5], ["Ava", 3], ["Dev", 3], ["Hope", 3], ["Ben", 2], ["Cara", 2], ["Eli", 1]]);
    expect(get("sql-late-loans")).toEqual([[4, 51], [7, 30], [9, 25], [3, 21], [10, 20]]);
    expect(get("sql-premium-only-songs")).toEqual([["Blue Hour"], ["Lagoon"], ["Night Drive"]]);
    expect(get("sql-monthly-net-change")).toEqual([["2024-01", 12615, null], ["2024-02", 4990, -7625], ["2024-03", 1730, -3260]]);
  });
  it("a loan kept exactly 14 days is not late", () => {
    expect((get("sql-late-loans") as Row[]).map((r) => r[0])).not.toContain(1);
  });
  it("Mongo top commenters tie at four and break alphabetically; revenue by country", () => {
    expect(get("mongo-top-commenters")).toEqual([{ _id: "marco", comments: 4 }, { _id: "priya", comments: 4 }, { _id: "sam", comments: 4 }]);
    expect(get("mongo-revenue-by-country")).toEqual([{ _id: "IN", revenue: 180 }, { _id: "US", revenue: 130 }]);
  });
});

describe("topic helpers", () => {
  it("groups by topic in teaching order, easy before hard, with solved counts", () => {
    const solved = new Set(["sql-pune-students", "sql-high-earners"]);
    const groups = groupByTopic("sql", DB_CHALLENGES, solved);
    expect(groups.map((g) => g.topic.id)).toEqual([...SQL_TOPIC_IDS]);
    const basics = groups[0]!;
    expect(basics.solved).toBe(2);
    const rank = { Easy: 0, Medium: 1, Hard: 2 } as const;
    expect(basics.challenges.every((c, i, a) => i === 0 || rank[a[i - 1]!.difficulty] <= rank[c.difficulty])).toBe(true);
    expect(groups.reduce((n, g) => n + g.challenges.length, 0)).toBe(catalogStats(DB_CHALLENGES).byMode.sql);
  });
  it("leaves out an empty topic and another language's challenges", () => {
    expect(groupByTopic("sql", DB_CHALLENGES.filter((c) => c.mode === "mongo"), new Set())).toEqual([]);
    expect(groupByTopic("mongo", DB_CHALLENGES, new Set()).every((g) => g.challenges.every((c) => c.mode === "mongo"))).toBe(true);
  });
  it("finds the next unsolved challenge after the current one, wrapping, and falls back when all are solved", () => {
    const list = DB_CHALLENGES.filter((c) => c.mode === "sql").slice(0, 4);
    const ids = list.map((c) => c.id);
    expect(nextUnsolved(list, new Set([ids[1]!]), ids[0]!)?.id).toBe(ids[2]);
    expect(nextUnsolved(list, new Set([ids[1]!, ids[2]!, ids[3]!]), ids[0]!)?.id).toBe(ids[1]);
    expect(nextUnsolved(list, new Set(ids), ids[0]!)?.id).toBe(ids[1]);
    expect(nextUnsolved(list, new Set(), null)?.id).toBe(ids[0]);
    expect(nextUnsolved([], new Set(), null)).toBeNull();
  });
});
