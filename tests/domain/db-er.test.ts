import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PG_COLUMNS_SQL, PG_FKS_SQL, buildEr, erFromPostgres, erFromSeedTables, erFromSqlite } from "@/modules/dsa/domain/db-er";
import { adaptSeedForPostgres } from "@/modules/dsa/domain/db-dialect";
import { sqlDataset } from "@/modules/dsa/domain/db-lab";
import { parseSchema } from "@/modules/dsa/domain/sql-schema";

describe("buildEr", () => {
  const schema = erFromSqlite(
    [["departments", "id", "INTEGER", 1], ["departments", "name", "TEXT", 0], ["employees", "id", "INTEGER", 1], ["employees", "department_id", "INTEGER", 0], ["employees", "salary", "DECIMAL(10,2)", 0]],
    [["employees", "department_id", "departments", "id"], ["employees", "department_id", "departments", "id"], ["employees", "x", "ghost", null]],
  );
  it("writes entities with keys and one relationship per distinct foreign key", () => {
    const er = buildEr(schema);
    expect(er.startsWith("erDiagram")).toBe(true);
    expect(er).toContain("  departments {\n    integer id PK\n    text name\n  }");
    expect(er).toContain("    integer department_id FK");
    expect(er).toContain("    decimal salary");
    expect(er.match(/employees \}o--\|\| departments : "department_id"/g)).toHaveLength(1);
  });
  it("skips relationships to tables that do not exist and returns empty text for no tables", () => {
    expect(buildEr(schema)).not.toContain("ghost");
    expect(buildEr({ tables: [], relations: [] })).toBe("");
  });
  it("marks a column that is both key and reference", () => {
    const er = buildEr(erFromSqlite([["a", "id", "INT", 1], ["b", "a_id", "INT", 1]], [["b", "a_id", "a", "id"]]));
    expect(er).toContain("int a_id PK, FK");
  });
  it("sanitises odd names and types", () => {
    const er = buildEr(erFromSqlite([["my table", "1st col", "", 0]], []));
    expect(er).toContain("my_table {");
    expect(er).toContain("any _1st_col");
  });
  it("can be built from the parsed seed as a fallback", () => {
    const er = buildEr(erFromSeedTables(parseSchema(sqlDataset("company").seed)));
    expect(er).toContain("employees }o--|| departments");
  });
});

describe("Postgres introspection queries", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(adaptSeedForPostgres(sqlDataset("company").seed));
  }, 60_000);
  afterAll(async () => {
    await pg?.close();
  });
  it("describe the company dataset", async () => {
    const cols = (await pg.exec(PG_COLUMNS_SQL, { rowMode: "array" }))[0]!.rows as unknown[][];
    const fks = (await pg.exec(PG_FKS_SQL, { rowMode: "array" }))[0]!.rows as unknown[][];
    const er = buildEr(erFromPostgres(cols, fks));
    expect(er).toContain("assignments {");
    expect(er).toMatch(/employees \}o--\|\| departments : "department_id"/);
    expect(er).toMatch(/assignments \}o--\|\| projects : "project_id"/);
    expect(er).toMatch(/integer employee_id PK, FK/);
  });
});
