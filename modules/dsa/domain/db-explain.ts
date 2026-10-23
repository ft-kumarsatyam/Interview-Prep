/**
 * Turns the raw output of SQLite's `EXPLAIN QUERY PLAN` and Postgres's `EXPLAIN (FORMAT JSON)` into one tree with
 * badges and plain-English hints. Pure: the engines run elsewhere and hand their rows here.
 */
import type { DbEngine } from "@/modules/dsa/domain/db-dialect";

export type PlanKind = "scan" | "search" | "sort" | "join" | "agg" | "subquery" | "other";

export interface PlanNode {
  id: string;
  kind: PlanKind;
  /** Short badge text, e.g. SCAN, SEARCH, SORT, JOIN. */
  badge: string;
  label: string;
  detail: string;
  table?: string;
  index?: string;
  /** Set on the second and later tables of a join (SQLite shows joins as sibling scans). */
  join?: boolean;
  hint?: string;
  cost?: number;
  rows?: number;
  children: PlanNode[];
}

export interface PlanSummary {
  fullScans: number;
  indexLookups: number;
  sorts: number;
  joins: number;
}

export interface QueryPlan {
  engine: Exclude<DbEngine, "mongo">;
  roots: PlanNode[];
  summary: PlanSummary;
  hints: string[];
}

/** Removes comments and string literals so keyword and semicolon checks cannot be fooled by them. */
function blankOut(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
}

/** True for one SELECT-like statement (SELECT, WITH or VALUES); a plan makes no sense for anything else. */
export function isExplainable(sql: string): boolean {
  const s = blankOut(sql).trim().replace(/;+\s*$/, "").trim();
  if (!s || s.includes(";")) return false;
  return /^\(*\s*(select|with|values)\b/i.test(s);
}

/** The statement to run to get a plan, or null when the query is not SELECT-like. */
export function explainStatement(engine: Exclude<DbEngine, "mongo">, sql: string): string | null {
  if (!isExplainable(sql)) return null;
  const body = sql.trim().replace(/;+\s*$/, "");
  return engine === "sqlite" ? `EXPLAIN QUERY PLAN ${body}` : `EXPLAIN (FORMAT JSON) ${body}`;
}

const FULL_SCAN_HINT = (t: string) => `Full table scan: every row of ${t} is read. Fine for a small table; on a big one, add an index on the column you filter or join on.`;
const INDEX_SCAN_HINT = "Reads the whole index in order. It is cheaper than the table, but a WHERE on the indexed column would let it jump straight to the rows.";
const SORT_HINT = "A separate sort step. An index that matches the ORDER BY columns lets the engine return rows already ordered and skip it.";

function summarise(roots: PlanNode[]): PlanSummary {
  const s: PlanSummary = { fullScans: 0, indexLookups: 0, sorts: 0, joins: 0 };
  const walk = (n: PlanNode) => {
    if (n.kind === "scan") s.fullScans++;
    else if (n.kind === "search") s.indexLookups++;
    else if (n.kind === "sort") s.sorts++;
    if (n.kind === "join" || n.join) s.joins++;
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return s;
}

function collectHints(roots: PlanNode[]): string[] {
  const out = new Set<string>();
  const walk = (n: PlanNode) => {
    if (n.hint) out.add(n.hint);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return [...out];
}

function finish(engine: QueryPlan["engine"], roots: PlanNode[]): QueryPlan {
  return { engine, roots, summary: summarise(roots), hints: collectHints(roots) };
}

/* --------------------------------- SQLite --------------------------------- */

function classifySqlite(id: string, detail: string): PlanNode {
  const base = { id, detail, children: [] as PlanNode[] };
  const scan = /^SCAN (?!CONSTANT)(\S+)(?: AS (\S+))?(?: USING (COVERING )?INDEX (\S+))?/i.exec(detail);
  if (scan) {
    const table = scan[1]!;
    const index = scan[4];
    return { ...base, kind: "scan", badge: "SCAN", label: index ? `Scan ${table} via index ${index}` : `Scan ${table}`, table, index, hint: index ? INDEX_SCAN_HINT : FULL_SCAN_HINT(table) };
  }
  const search = /^SEARCH (\S+)(?: AS (\S+))? USING (AUTOMATIC )?(?:(COVERING) )?(INDEX|INTEGER PRIMARY KEY)\s*(\S+)?\s*(?:\((.*)\))?/i.exec(detail);
  if (search) {
    const table = search[1]!;
    const auto = Boolean(search[3]);
    const pk = /PRIMARY KEY/i.test(search[5] ?? "");
    const index = pk || auto ? undefined : search[6];
    const cond = search[7] ?? (pk ? "rowid=?" : "");
    return {
      ...base,
      kind: "search",
      badge: "SEARCH",
      label: pk ? `Look up ${table} by primary key` : `Look up ${table} via ${auto ? "a temporary index" : `index ${index ?? ""}`.trim()}${cond ? ` (${cond})` : ""}`,
      table,
      index,
      hint: auto ? `SQLite built a temporary index on ${table} just for this query. Create a real index on the joined column so it is not rebuilt every run.` : undefined,
    };
  }
  const temp = /^USE TEMP B-TREE FOR (.*)$/i.exec(detail);
  if (temp) {
    const what = temp[1]!;
    const isOrder = /ORDER BY/i.test(what);
    return { ...base, kind: "sort", badge: "SORT", label: `Temp b-tree for ${what.toLowerCase()}`, hint: isOrder ? SORT_HINT : `SQLite builds a temporary structure for ${what.toLowerCase()}. An index on those columns can avoid it.` };
  }
  if (/^(CO-ROUTINE|MATERIALIZE|SCALAR SUBQUERY|CORRELATED SCALAR SUBQUERY|LIST SUBQUERY|CORRELATED LIST SUBQUERY|COMPOUND QUERY|LEFT-MOST SUBQUERY|MERGE|UNION|MULTI-INDEX OR)/i.test(detail)) {
    const correlated = /^CORRELATED/i.test(detail);
    return { ...base, kind: "subquery", badge: "SUBQUERY", label: detail, hint: correlated ? "A correlated subquery runs once per outer row. A join or a window function is often faster." : undefined };
  }
  return { ...base, kind: "other", badge: "STEP", label: detail };
}

/** `EXPLAIN QUERY PLAN` rows are `[id, parent, notused, detail]`; parent links build the tree. */
export function parseSqlitePlan(rows: readonly (readonly unknown[])[]): QueryPlan {
  const nodes = new Map<number, PlanNode>();
  const parents = new Map<number, number>();
  for (const r of rows) {
    const id = Number(r[0]);
    nodes.set(id, classifySqlite(String(id), String(r[3] ?? "")));
    parents.set(id, Number(r[1]));
  }
  const roots: PlanNode[] = [];
  for (const [id, node] of nodes) {
    const parent = nodes.get(parents.get(id) ?? 0);
    (parent && parent !== node ? parent.children : roots).push(node);
  }
  // Tables of one join are siblings; every one after the first is the inner side of a join.
  const markJoins = (siblings: PlanNode[]) => {
    siblings.filter((n) => n.kind === "scan" || n.kind === "search").slice(1).forEach((n) => (n.join = true));
    siblings.forEach((n) => markJoins(n.children));
  };
  markJoins(roots);
  return finish("sqlite", roots);
}

/* -------------------------------- Postgres -------------------------------- */

type Json = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function pgNode(raw: Json, path: string): PlanNode {
  const type = str(raw["Node Type"]) || "Step";
  const table = str(raw["Relation Name"]) || undefined;
  const index = str(raw["Index Name"]) || undefined;
  const filter = str(raw["Filter"]);
  const children = (Array.isArray(raw["Plans"]) ? (raw["Plans"] as Json[]) : []).map((p, i) => pgNode(p, `${path}.${i}`));
  const extra = { id: path, cost: typeof raw["Total Cost"] === "number" ? raw["Total Cost"] : undefined, rows: typeof raw["Plan Rows"] === "number" ? raw["Plan Rows"] : undefined, children };
  const cond = str(raw["Index Cond"]) || str(raw["Hash Cond"]) || str(raw["Merge Cond"]) || str(raw["Join Filter"]);

  if (type === "Seq Scan") {
    const col = /^\(*"?(\w+)"?\s*(?:=|<>|!=|<=|>=|<|>|~~|!~~)/.exec(filter)?.[1];
    const hint = table
      ? col
        ? `Seq Scan on ${table} filtered by ${col}. If ${table} is large, CREATE INDEX ON ${table} (${col}); lets Postgres jump to the matching rows. On a tiny table a sequential scan is actually the cheapest plan.`
        : FULL_SCAN_HINT(table)
      : undefined;
    return { ...extra, kind: "scan", badge: "SEQ SCAN", label: `Seq Scan on ${table ?? "?"}`, detail: filter ? `Filter: ${filter}` : "", table, hint };
  }
  if (/^(Index Scan|Index Only Scan|Bitmap Heap Scan|Bitmap Index Scan)$/.test(type)) {
    const only = type === "Index Only Scan";
    return { ...extra, kind: "search", badge: only ? "INDEX ONLY" : /Bitmap/.test(type) ? "BITMAP" : "INDEX SCAN", label: `${type}${table ? ` on ${table}` : ""}${index ? ` using ${index}` : ""}`, detail: cond ? `Cond: ${cond}` : "", table, index };
  }
  if (type === "Sort" || type === "Incremental Sort") {
    const keys = Array.isArray(raw["Sort Key"]) ? (raw["Sort Key"] as unknown[]).map(String).join(", ") : "";
    return { ...extra, kind: "sort", badge: "SORT", label: `${type}${keys ? ` by ${keys}` : ""}`, detail: str(raw["Sort Method"]) ? `Method: ${str(raw["Sort Method"])}` : "", hint: SORT_HINT };
  }
  if (/^(Nested Loop|Hash Join|Merge Join)$/.test(type)) {
    const jt = str(raw["Join Type"]);
    const hint =
      type === "Nested Loop" && children.some((c) => c.kind === "scan")
        ? "A nested loop that scans a table for every outer row gets slow as tables grow. An index on the join column on the inner side turns each probe into a lookup."
        : undefined;
    return { ...extra, kind: "join", badge: "JOIN", label: `${type}${jt ? ` (${jt})` : ""}`, detail: cond ? `On: ${cond}` : "", hint };
  }
  if (/Aggregate$|^WindowAgg$|^Unique$|^Group$/.test(type)) {
    const keys = Array.isArray(raw["Group Key"]) ? (raw["Group Key"] as unknown[]).map(String).join(", ") : "";
    return { ...extra, kind: "agg", badge: "AGG", label: type, detail: keys ? `Group by: ${keys}` : "" };
  }
  return { ...extra, kind: /Scan$/.test(type) ? "subquery" : "other", badge: "STEP", label: table ? `${type} on ${table}` : type, detail: "" };
}

function unwrapPg(input: unknown): Json | null {
  let v: unknown = input;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) v = v[0];
  if (v && typeof v === "object" && "QUERY PLAN" in v) return unwrapPg((v as Json)["QUERY PLAN"]);
  if (v && typeof v === "object" && "Plan" in v) return (v as Json)["Plan"] as Json;
  return null;
}

export function parsePostgresPlan(input: unknown): QueryPlan | null {
  const plan = unwrapPg(input);
  return plan ? finish("postgres", [pgNode(plan, "0")]) : null;
}

/**
 * `input` is the result rows for SQLite (`[id, parent, notused, detail][]`) or the first cell of the single Postgres
 * row (the JSON plan, parsed or as text). Returns null when the output is not a plan.
 */
export function parsePlan(engine: Exclude<DbEngine, "mongo">, input: unknown): QueryPlan | null {
  if (engine === "postgres") return parsePostgresPlan(input);
  if (!Array.isArray(input) || input.length === 0 || !input.every((r) => Array.isArray(r) && r.length >= 4)) return null;
  return parseSqlitePlan(input as unknown[][]);
}
