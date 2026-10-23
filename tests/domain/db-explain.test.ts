import { describe, expect, it } from "vitest";
import { explainStatement, isExplainable, parsePlan } from "@/modules/dsa/domain/db-explain";

describe("isExplainable / explainStatement", () => {
  it("accepts one SELECT-like statement only", () => {
    expect(isExplainable("SELECT 1")).toBe(true);
    expect(isExplainable("-- c\n  with x as (select 1) select * from x;")).toBe(true);
    expect(isExplainable("DELETE FROM t")).toBe(false);
    expect(isExplainable("SELECT 1; SELECT 2")).toBe(false);
    expect(isExplainable("SELECT ';' AS s")).toBe(true);
    expect(isExplainable("   ")).toBe(false);
  });
  it("wraps the statement per engine", () => {
    expect(explainStatement("sqlite", "SELECT 1;")).toBe("EXPLAIN QUERY PLAN SELECT 1");
    expect(explainStatement("postgres", "select 1")).toBe("EXPLAIN (FORMAT JSON) select 1");
    expect(explainStatement("sqlite", "UPDATE t SET a=1")).toBeNull();
  });
});

describe("parsePlan for SQLite", () => {
  it("flags a full scan with an index hint", () => {
    const plan = parsePlan("sqlite", [[2, 0, 0, "SCAN employees"]])!;
    expect(plan.roots[0]).toMatchObject({ kind: "scan", badge: "SCAN", table: "employees" });
    expect(plan.summary).toEqual({ fullScans: 1, indexLookups: 0, sorts: 0, joins: 0 });
    expect(plan.hints[0]).toMatch(/Full table scan/);
  });
  it("recognises searches, temp b-trees and joins as siblings", () => {
    const plan = parsePlan("sqlite", [
      [3, 0, 0, "SCAN e"],
      [5, 0, 0, "SEARCH d USING INTEGER PRIMARY KEY (rowid=?)"],
      [9, 0, 0, "USE TEMP B-TREE FOR ORDER BY"],
    ])!;
    expect(plan.roots.map((n) => n.kind)).toEqual(["scan", "search", "sort"]);
    expect(plan.roots[1]!.join).toBe(true);
    expect(plan.summary).toMatchObject({ fullScans: 1, indexLookups: 1, sorts: 1, joins: 1 });
    expect(plan.hints.some((h) => /ORDER BY/.test(h))).toBe(true);
  });
  it("reads index names and builds a parent/child tree", () => {
    const plan = parsePlan("sqlite", [
      [2, 0, 0, "CO-ROUTINE sub"],
      [4, 2, 0, "SEARCH orders USING INDEX idx_orders_customer (customer_id=?)"],
      [8, 0, 0, "SCAN sub"],
    ])!;
    expect(plan.roots).toHaveLength(2);
    expect(plan.roots[0]!.children[0]).toMatchObject({ kind: "search", index: "idx_orders_customer" });
    expect(plan.roots[1]).toMatchObject({ kind: "scan" });
  });
  it("tells an automatic index from a real one and warns about correlated subqueries", () => {
    const plan = parsePlan("sqlite", [[1, 0, 0, "SEARCH t USING AUTOMATIC COVERING INDEX (a=?)"], [2, 0, 0, "CORRELATED SCALAR SUBQUERY 1"]])!;
    expect(plan.hints.join(" ")).toMatch(/temporary index/);
    expect(plan.hints.join(" ")).toMatch(/once per outer row/);
  });
  it("returns null for rows that are not a plan", () => {
    expect(parsePlan("sqlite", [])).toBeNull();
    expect(parsePlan("sqlite", [[1, 2]])).toBeNull();
  });
});

describe("parsePlan for Postgres", () => {
  const seq = [{ Plan: { "Node Type": "Seq Scan", "Relation Name": "employees", Filter: "(salary > 100000)", "Total Cost": 1.2, "Plan Rows": 3 } }];
  it("explains a sequential scan and suggests an index on the filtered column", () => {
    const plan = parsePlan("postgres", seq)!;
    expect(plan.roots[0]).toMatchObject({ kind: "scan", table: "employees", cost: 1.2, rows: 3 });
    expect(plan.hints[0]).toContain("CREATE INDEX ON employees (salary)");
  });
  it("accepts JSON text and the QUERY PLAN wrapper", () => {
    expect(parsePlan("postgres", JSON.stringify(seq))).not.toBeNull();
    expect(parsePlan("postgres", { "QUERY PLAN": seq })).not.toBeNull();
    expect(parsePlan("postgres", "not json")).toBeNull();
  });
  it("walks joins, sorts and index scans", () => {
    const plan = parsePlan("postgres", [
      {
        Plan: {
          "Node Type": "Sort",
          "Sort Key": ["e.name"],
          Plans: [
            {
              "Node Type": "Hash Join",
              "Join Type": "Inner",
              "Hash Cond": "(e.department_id = d.id)",
              Plans: [
                { "Node Type": "Index Scan", "Relation Name": "employees", "Index Name": "employees_pkey" },
                { "Node Type": "Hash", Plans: [{ "Node Type": "Seq Scan", "Relation Name": "departments" }] },
              ],
            },
          ],
        },
      },
    ])!;
    expect(plan.summary).toEqual({ fullScans: 1, indexLookups: 1, sorts: 1, joins: 1 });
    expect(plan.roots[0]!.children[0]).toMatchObject({ kind: "join", badge: "JOIN", label: "Hash Join (Inner)" });
  });
});
