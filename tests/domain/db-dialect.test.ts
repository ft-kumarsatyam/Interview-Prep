import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import initSqlJs from "sql.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PG_NORMALIZE_SOURCE } from "@/core/sandbox/pg-normalize";
import { PG_CHECKABLE, adaptSeedForPostgres, challengeMode, checkEngine, fromSavedMode, toSavedMode } from "@/modules/dsa/domain/db-dialect";
import { DB_CHALLENGES, SQL_DATASETS, compareRows, type Cell, type Row } from "@/modules/dsa/domain/db-lab";

describe("adaptSeedForPostgres", () => {
  it("rewrites SQLite-only type names and keywords", () => {
    expect(adaptSeedForPostgres("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, x REAL, b BLOB, d DATETIME);")).toBe("CREATE TABLE t (id SERIAL PRIMARY KEY, x DOUBLE PRECISION, b BYTEA, d TIMESTAMP);");
    expect(adaptSeedForPostgres("INSERT OR IGNORE INTO t VALUES (1);")).toBe("INSERT INTO t VALUES (1);");
  });
  it("leaves plain seeds and string contents with whole-word differences alone", () => {
    const seed = "CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nINSERT INTO t VALUES (1,'Alice');";
    expect(adaptSeedForPostgres(seed)).toBe(seed);
  });
});

describe("engine helpers", () => {
  it("maps engines to challenge and saved modes both ways", () => {
    expect(challengeMode("sqlite")).toBe("sql");
    expect(challengeMode("postgres")).toBe("sql");
    expect(challengeMode("mongo")).toBe("mongo");
    for (const e of ["sqlite", "postgres", "mongo"] as const) expect(fromSavedMode(toSavedMode(e))).toBe(e);
  });
  it("runs Check on SQLite unless Postgres is known to pass the reference", () => {
    const ok = new Set(["a"]);
    expect(checkEngine("postgres", "a", ok)).toBe("postgres");
    expect(checkEngine("postgres", "b", ok)).toBe("sqlite");
    expect(checkEngine("sqlite", "a", ok)).toBe("sqlite");
  });
});

const normalize = new Function(`${PG_NORMALIZE_SOURCE}; return normalizePgCell;`)() as (v: unknown, typeId: number) => Cell;

describe("Postgres-checkable challenges (PGlite in Node)", () => {
  let pg: PGlite;
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;
  beforeAll(async () => {
    pg = await PGlite.create();
    const wasm = readFileSync(path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"));
    SQL = await initSqlJs({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  }, 60_000);
  afterAll(async () => {
    await pg?.close();
  });

  async function pgRows(query: string): Promise<Row[]> {
    const res = await pg.exec(query, { rowMode: "array" });
    const last = res.filter((r) => r.fields.length > 0).at(-1);
    return (last?.rows ?? []).map((r) => (r as unknown[]).map((v, i) => normalize(v, last!.fields[i]!.dataTypeID)));
  }

  it("every dataset seed loads on Postgres after adaptation", async () => {
    for (const d of SQL_DATASETS) {
      await pg.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
      await expect(pg.exec(adaptSeedForPostgres(d.seed)), d.id).resolves.toBeDefined();
    }
  }, 60_000);

  it("PG_CHECKABLE is exactly the set whose reference solution returns the same rows on Postgres and SQLite", async () => {
    const found: string[] = [];
    for (const d of SQL_DATASETS) {
      await pg.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
      await pg.exec(adaptSeedForPostgres(d.seed));
      const lite = new SQL.Database();
      lite.exec(d.seed);
      for (const c of DB_CHALLENGES.filter((x) => x.mode === "sql" && x.dataset === d.id)) {
        try {
          const want = (lite.exec(c.solution).at(-1)?.values ?? []) as Row[];
          const got = await pgRows(c.solution);
          if (compareRows(got, want, c.ordered).ok) found.push(c.id);
        } catch {
          /* a dialect difference: not checkable */
        }
      }
      lite.close();
    }
    if (process.env.PRINT_CHECKABLE) console.log("CHECKABLE=" + JSON.stringify(found.toSorted()));
    expect(found.toSorted()).toEqual([...PG_CHECKABLE].toSorted());
    expect(found.length).toBeGreaterThan(0);
  }, 120_000);
});
