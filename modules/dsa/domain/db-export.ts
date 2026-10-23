/** Pure helpers for the DB Lab result grid: sort, filter, and copy/export formats. */
import type { Cell } from "@/modules/dsa/domain/db-lab";

export type SortDir = "asc" | "desc";
export interface SortState {
  col: number;
  dir: SortDir;
}

const show = (v: Cell) => (v === null ? "" : String(v));

/** RFC 4180 CSV: fields with a comma, quote, CR or LF are quoted and inner quotes doubled. NULL is an empty field. */
export function toCsv(columns: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const esc = (v: Cell) => {
    const s = show(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

/** An array of objects. Duplicate column names get a numeric suffix so no value is lost. */
export function toJson(columns: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const seen = new Map<string, number>();
  const keys = columns.map((c) => {
    const n = (seen.get(c) ?? 0) + 1;
    seen.set(c, n);
    return n === 1 ? c : `${c}_${n}`;
  });
  return JSON.stringify(
    rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null]))),
    null,
    2,
  );
}

/** A GitHub-style Markdown table. Pipes are escaped and line breaks become <br>; NULL is written as NULL. */
export function toMarkdown(columns: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  const cell = (v: Cell) => esc(v === null ? "NULL" : String(v));
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(columns.map(esc)), line(columns.map(() => "---")), ...rows.map((r) => line(columns.map((_, i) => cell(r[i] ?? null))))].join("\n");
}

const rank = (v: Cell) => (v === null ? 3 : typeof v === "number" ? 0 : typeof v === "boolean" ? 1 : 2);

function compareCells(a: Cell, b: Cell): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** A sorted copy. Numbers sort numerically, text naturally, and NULLs always come last. The sort is stable. */
export function sortRows<T extends readonly Cell[]>(rows: readonly T[], col: number, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i }))
    .sort((x, y) => {
      const a = x.r[col] ?? null;
      const b = y.r[col] ?? null;
      if (a === null || b === null) return a === b ? x.i - y.i : a === null ? 1 : -1;
      return sign * compareCells(a, b) || x.i - y.i;
    })
    .map((x) => x.r);
}

/** Clicking a header cycles ascending, descending, then back to the query's own order. */
export function nextSort(current: SortState | null, col: number): SortState | null {
  if (!current || current.col !== col) return { col, dir: "asc" };
  return current.dir === "asc" ? { col, dir: "desc" } : null;
}

/** Keeps rows where every whitespace-separated term appears (case-insensitive) in at least one cell. */
export function filterRows<T extends readonly Cell[]>(rows: readonly T[], text: string): T[] {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...rows];
  return rows.filter((r) => {
    const hay = r.map((v) => (v === null ? "null" : String(v).toLowerCase())).join("\u0000");
    return terms.every((t) => hay.includes(t));
  });
}

/** The visible notice when the engine capped what it handed back, or null when everything is shown. */
export function cappedNotice(shown: number, total: number): string | null {
  if (total <= shown) return null;
  return `Showing ${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} rows. Sorting, filtering and exports use these ${shown.toLocaleString("en-US")}; add a WHERE or LIMIT to narrow the query.`;
}

export type ExportFormat = "csv" | "json";

export function exportFile(format: ExportFormat, columns: readonly string[], rows: readonly (readonly Cell[])[], base = "result") {
  const safe = base.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "result";
  return format === "csv"
    ? { name: `${safe}.csv`, type: "text/csv;charset=utf-8", text: toCsv(columns, rows) }
    : { name: `${safe}.json`, type: "application/json", text: toJson(columns, rows) };
}
