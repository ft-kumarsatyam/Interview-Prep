import { readFileSync } from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { DB_CHALLENGES, MONGO_DATASETS, SQL_DATASETS, challengesFor, compareRows, docsToRows, mongoDataset, sqlDataset, type Row } from "@/lib/domain/db-lab";
import { runMongo } from "@/lib/domain/mongo-query";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => {
  const wasm = readFileSync(path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"));
  SQL = await initSqlJs({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
});

function sqlRows(db: Database, query: string): Row[] {
  const res = db.exec(query);
  return (res.at(-1)?.values ?? []) as Row[];
}

describe("challenge catalogue", () => {
  it("has unique ids and every challenge points at a real dataset", () => {
    const ids = DB_CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of DB_CHALLENGES) {
      expect(c.mode === "sql" ? SQL_DATASETS.some((d) => d.id === c.dataset) : MONGO_DATASETS.some((d) => d.id === c.dataset), c.id).toBe(true);
    }
  });
  it("falls back to the first dataset for an unknown id", () => {
    expect(sqlDataset("nope").id).toBe(SQL_DATASETS[0]!.id);
    expect(mongoDataset("nope").id).toBe(MONGO_DATASETS[0]!.id);
    expect(challengesFor("sql", "company").length).toBeGreaterThan(5);
  });
});

describe("SQL reference solutions", () => {
  for (const ds of SQL_DATASETS) {
    describe(ds.id, () => {
      it("seeds without errors", () => {
        const db = new SQL.Database();
        expect(() => db.exec(ds.seed)).not.toThrow();
        db.close();
      });
      for (const c of challengesFor("sql", ds.id)) {
        it(`${c.id} runs and returns rows`, () => {
          const db = new SQL.Database();
          db.exec(ds.seed);
          const rows = sqlRows(db, c.solution);
          expect(rows.length).toBeGreaterThan(0);
          expect(compareRows(rows, rows, c.ordered)).toEqual({ ok: true });
          db.close();
        });
      }
    });
  }

  it("pins a few answers", () => {
    const db = new SQL.Database();
    db.exec(sqlDataset("company").seed);
    const get = (id: string) => sqlRows(db, DB_CHALLENGES.find((c) => c.id === id)!.solution);
    expect(get("sql-second-highest")).toEqual([[120000]]);
    expect(get("sql-all-reports")).toEqual([["Carol"], ["Dan"], ["Ken"]]);
    expect(get("sql-top-per-dept").map((r) => r[1])).toEqual(["Alice", "Heidi", "Ivan", "Eve"]);
    expect(get("sql-project-hours")).toEqual([["Search", 90], ["Campaign", 65], ["Pipeline", 65]]);
    db.close();
  });
});

describe("Mongo reference solutions", () => {
  for (const c of challengesFor("mongo", "shop")) {
    it(`${c.id} runs and returns documents`, () => {
      const r = runMongo(c.solution, mongoDataset(c.dataset).collections);
      expect(r.ok, r.ok ? "" : r.error).toBe(true);
      if (r.ok) expect(r.docs.length).toBeGreaterThan(0);
    });
  }

  it("pins a few answers", () => {
    const cols = mongoDataset("shop").collections;
    const get = (id: string) => {
      const r = runMongo(DB_CHALLENGES.find((c) => c.id === id)!.solution, cols);
      if (!r.ok) throw new Error(r.error);
      return r.docs;
    };
    expect(get("mongo-top-products")).toEqual([{ _id: 2, units: 6 }, { _id: 5, units: 4 }, { _id: 3, units: 3 }]);
    expect(get("mongo-no-orders")).toEqual([{ name: "Gina" }]);
  });
});

describe("compareRows", () => {
  it("ignores column names, honours order when asked", () => {
    expect(compareRows([[1, "a"], [2, "b"]], [[2, "b"], [1, "a"]], false)).toEqual({ ok: true });
    expect(compareRows([[1, "a"], [2, "b"]], [[2, "b"], [1, "a"]], true)).toEqual({ ok: false, reason: "Right rows, wrong order." });
  });
  it("reports row and column count mismatches and float noise", () => {
    expect(compareRows([[1]], [[1], [2]], false)).toMatchObject({ ok: false, reason: expect.stringContaining("Expected 2 rows") });
    expect(compareRows([[1, 2]], [[1]], false)).toMatchObject({ ok: false, reason: expect.stringContaining("1 column") });
    expect(compareRows([[0.1 + 0.2]], [[0.3]], true)).toEqual({ ok: true });
  });
  it("turns documents into rows with a stable key order", () => {
    expect(docsToRows([{ b: 2, a: 1 }, 5])).toEqual([[1, 2], [5]]);
  });
});
