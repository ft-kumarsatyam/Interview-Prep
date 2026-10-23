/**
 * Builds a Mermaid `erDiagram` from a database's real schema. The engines are asked with the SQL below; the rows come
 * back here to become an ErSchema, then the diagram text. Pure.
 */
import type { SchemaTable } from "@/modules/dsa/domain/sql-schema";

export interface ErColumn {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
}
export interface ErTable {
  name: string;
  columns: ErColumn[];
}
export interface ErRelation {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
}
export interface ErSchema {
  tables: ErTable[];
  relations: ErRelation[];
}

/** One row per column: table, column, type, primary-key position (0 when not part of it). */
export const SQLITE_COLUMNS_SQL = `SELECT m.name, p.name, p.type, p.pk FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name, p.cid`;
/** One row per foreign-key column: table, column, referenced table, referenced column (may be NULL). */
export const SQLITE_FKS_SQL = `SELECT m.name, f."from", f."table", f."to" FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name, f.id, f.seq`;
export const PG_COLUMNS_SQL = `SELECT c.table_name, c.column_name, c.data_type, (SELECT count(*) FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage k ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND k.table_name = c.table_name AND k.column_name = c.column_name)::int AS pk FROM information_schema.columns c JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema AND t.table_type = 'BASE TABLE' WHERE c.table_schema = 'public' ORDER BY c.table_name, c.ordinal_position`;
export const PG_FKS_SQL = `SELECT k.table_name, k.column_name, ccu.table_name, ccu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage k ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ORDER BY k.table_name, k.ordinal_position`;

type Rows = readonly (readonly unknown[])[];

function assemble(columnRows: Rows, fkRows: Rows): ErSchema {
  const relations: ErRelation[] = [];
  const seen = new Set<string>();
  for (const r of fkRows) {
    const rel: ErRelation = { from: String(r[0]), fromColumn: String(r[1]), to: String(r[2]), toColumn: r[3] == null ? "" : String(r[3]) };
    const key = `${rel.from}.${rel.fromColumn}>${rel.to}.${rel.toColumn}`;
    if (!seen.has(key)) {
      seen.add(key);
      relations.push(rel);
    }
  }
  const fkCols = new Set(relations.map((r) => `${r.from}.${r.fromColumn}`));
  const byTable = new Map<string, ErColumn[]>();
  for (const r of columnRows) {
    const table = String(r[0]);
    const name = String(r[1]);
    const list = byTable.get(table) ?? [];
    list.push({ name, type: String(r[2] ?? ""), pk: Number(r[3]) > 0, fk: fkCols.has(`${table}.${name}`) });
    byTable.set(table, list);
  }
  return { tables: [...byTable].map(([name, columns]) => ({ name, columns })), relations };
}

export const erFromSqlite = assemble;
export const erFromPostgres = assemble;

/** Fallback from the seed script when the engine cannot be asked. */
export function erFromSeedTables(tables: readonly SchemaTable[]): ErSchema {
  const relations: ErRelation[] = [];
  for (const t of tables) for (const c of t.columns) if (c.references) relations.push({ from: t.name, fromColumn: c.name, to: c.references, toColumn: "" });
  const fk = new Set(relations.map((r) => `${r.from}.${r.fromColumn}`));
  return { tables: tables.map((t) => ({ name: t.name, columns: t.columns.map((c) => ({ name: c.name, type: c.type, pk: c.primary, fk: fk.has(`${t.name}.${c.name}`) })) })), relations };
}

const ident = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1") || "_";
const typeName = (t: string) => {
  const base = t.replace(/\(.*\)/, "").trim().replace(/\s+/g, "_");
  return base ? ident(base).toLowerCase() : "any";
};

/** Mermaid `erDiagram` text: every table with its columns and keys, and `}o--||` lines for foreign keys. Empty when no tables. */
export function buildEr(schema: ErSchema): string {
  if (schema.tables.length === 0) return "";
  const known = new Set(schema.tables.map((t) => t.name));
  const lines = ["erDiagram"];
  for (const t of schema.tables) {
    lines.push(`  ${ident(t.name)} {`);
    for (const c of t.columns) {
      const keys = [c.pk && "PK", c.fk && "FK"].filter(Boolean).join(", ");
      lines.push(`    ${typeName(c.type)} ${ident(c.name)}${keys ? ` ${keys}` : ""}`);
    }
    lines.push("  }");
  }
  for (const r of schema.relations) {
    if (!known.has(r.from) || !known.has(r.to)) continue;
    lines.push(`  ${ident(r.from)} }o--|| ${ident(r.to)} : "${ident(r.fromColumn)}"`);
  }
  return lines.join("\n");
}
