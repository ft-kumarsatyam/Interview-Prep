/**
 * Turns one PGlite value into a plain cell (string, number, boolean or null) so Postgres results compare and render
 * like the SQLite ones. Plain-JS source because it runs inside the Postgres Web Worker; tests evaluate the same text.
 */
export const PG_NORMALIZE_SOURCE = String.raw`
function normalizePgCell(v, typeId) {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number.isSafeInteger(Number(v)) ? Number(v) : String(v);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) {
    const iso = v.toISOString();
    return typeId === 1082 ? iso.slice(0, 10) : iso.replace("T", " ").replace(/\.000Z$/, "").replace(/Z$/, "");
  }
  if (typeof v === "string") return typeId === 1700 || typeId === 700 || typeId === 701 ? (Number.isNaN(Number(v)) ? v : Number(v)) : v;
  if (v instanceof Uint8Array) return "\\x" + Array.from(v, (b) => b.toString(16).padStart(2, "0")).join("");
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}
`;
