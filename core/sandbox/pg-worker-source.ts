import { PG_NORMALIZE_SOURCE } from "@/core/sandbox/pg-normalize";

/**
 * Web Worker source for the Postgres runner (PGlite: PostgreSQL compiled to WebAssembly, in memory). It is a module
 * worker that imports the engine from /vendor/pglite on our own origin, never a CDN. The wasm and data files are
 * fetched here so the page can show download progress. Each `load` empties the public schema and runs the seed.
 */
export const PG_WORKER_SOURCE = String.raw`
let db = null;
const MAX_ROWS = 500;
${PG_NORMALIZE_SOURCE}

async function fetchWithProgress(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("HTTP " + res.status + " for " + url);
  const reader = res.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.length);
  }
  return new Blob(chunks);
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "boot") {
      const { PGlite } = await import(m.base + "/index.js");
      const total = m.sizes.reduce((a, b) => a + b, 0);
      let loaded = 0;
      let last = 0;
      const bump = (n) => {
        loaded += n;
        const now = Date.now();
        if (now - last > 120) { last = now; self.postMessage({ type: "progress", stage: "download", loaded, total }); }
      };
      const [wasm, data, initdb] = await Promise.all([
        fetchWithProgress(m.base + "/pglite.wasm", bump),
        fetchWithProgress(m.base + "/pglite.data", bump),
        fetchWithProgress(m.base + "/initdb.wasm", bump),
      ]);
      self.postMessage({ type: "progress", stage: "start", loaded: total, total });
      db = await PGlite.create({
        pgliteWasmModule: await WebAssembly.compile(await wasm.arrayBuffer()),
        initdbWasmModule: await WebAssembly.compile(await initdb.arrayBuffer()),
        fsBundle: data,
      });
      self.postMessage({ type: "ready" });
    } else if (m.type === "load") {
      await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
      await db.exec(m.seed);
      self.postMessage({ type: "loaded" });
    } else if (m.type === "run") {
      const started = performance.now();
      const results = await db.exec(m.sql, { rowMode: "array" });
      const sets = results
        .filter((r) => r.fields.length > 0)
        .map((r) => ({
          columns: r.fields.map((f) => f.name),
          rows: r.rows.slice(0, MAX_ROWS).map((row) => row.map((v, i) => normalizePgCell(v, r.fields[i].dataTypeID))),
          total: r.rows.length,
        }));
      self.postMessage({ type: "result", sets, ms: Math.max(1, Math.round(performance.now() - started)) });
    }
  } catch (err) {
    self.postMessage({ type: m.type === "boot" ? "boot-error" : "error", text: String(err && err.message ? err.message : err) });
  }
};
`;
