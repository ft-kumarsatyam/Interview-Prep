import { SQL_COMPAT_SOURCE } from "@/core/sandbox/sql-compat";

/**
 * Web Worker source for the SQL runner (sql.js: SQLite compiled to WebAssembly). The engine files are
 * served from /vendor/sqljs on our own origin, never a CDN. Each `load` builds a fresh in-memory database,
 * so a learner can't damage the dataset for the next run.
 */
export const SQL_WORKER_SOURCE = String.raw`
let SQL = null;
let db = null;
const MAX_ROWS = 500;
${SQL_COMPAT_SOURCE}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "boot") {
      importScripts(m.base + "/sql-wasm.js");
      SQL = await initSqlJs({ locateFile: (f) => m.base + "/" + f });
      self.postMessage({ type: "ready" });
    } else if (m.type === "load") {
      if (db) db.close();
      db = new SQL.Database();
      registerMysqlCompat(db);
      db.exec(m.seed);
      self.postMessage({ type: "loaded" });
    } else if (m.type === "run") {
      const started = performance.now();
      const sets = db.exec(m.sql).map((s) => ({
        columns: s.columns,
        rows: s.values.slice(0, MAX_ROWS),
        total: s.values.length,
      }));
      self.postMessage({ type: "result", sets, ms: Math.round(performance.now() - started) });
    }
  } catch (err) {
    self.postMessage({ type: m.type === "boot" ? "boot-error" : "error", text: String(err && err.message ? err.message : err) });
  }
};
`;
