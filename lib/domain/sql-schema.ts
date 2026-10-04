/** Reads the tables out of a seed script's CREATE TABLE statements, for the schema browser. */

export interface SchemaColumn {
  name: string;
  type: string;
  primary: boolean;
  /** Referenced table, when the column is declared with REFERENCES. */
  references?: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  /** Rows the seed inserts into this table. */
  rows: number;
}

/** Commas inside parentheses (e.g. `PRIMARY KEY (a, b)`) don't split columns. */
function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Counts the `( … )` tuples after `INSERT INTO <table> VALUES`, ignoring parentheses inside strings. */
function countTuples(values: string): number {
  let depth = 0;
  let inString = false;
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    const ch = values[i];
    if (ch === "'") {
      if (inString && values[i + 1] === "'") i++;
      else inString = !inString;
    } else if (!inString && ch === "(") {
      if (depth === 0) n++;
      depth++;
    } else if (!inString && ch === ")") depth--;
  }
  return n;
}

export function parseSchema(seed: string): SchemaTable[] {
  const rows = new Map<string, number>();
  for (const m of seed.matchAll(/INSERT INTO (\w+)\s+VALUES([\s\S]*?);\s*(?=INSERT|CREATE|$)/gi)) {
    const key = m[1]!.toLowerCase();
    rows.set(key, (rows.get(key) ?? 0) + countTuples(m[2] ?? ""));
  }

  return [...seed.matchAll(/CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/gi)].map((m) => {
    const name = m[1]!;
    const parts = splitTopLevel(m[2] ?? "");
    const tableKey = parts.find((p) => /^PRIMARY KEY\s*\(/i.test(p));
    const compositeKey = new Set(
      (/\(([^)]*)\)/.exec(tableKey ?? "")?.[1] ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const columns = parts
      .filter((p) => !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(p))
      .map((p): SchemaColumn => {
        const [col = "", type = ""] = p.split(/\s+/);
        return {
          name: col,
          type: /^[A-Z]+$/i.test(type) ? type.toUpperCase() : "",
          primary: /\bPRIMARY KEY\b/i.test(p) || compositeKey.has(col.toLowerCase()),
          references: /\bREFERENCES\s+(\w+)/i.exec(p)?.[1],
        };
      });
    return { name, columns, rows: rows.get(name.toLowerCase()) ?? 0 };
  });
}
