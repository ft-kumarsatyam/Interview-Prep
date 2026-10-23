import { PG_WORKER_SOURCE } from "@/core/sandbox/pg-worker-source";
import type { SqlResultSet, SqlRun } from "@/core/sandbox/sql-run";

/** Boot progress for the first-run download of the Postgres engine (about 17 MB, then cached by the browser). */
export interface PgProgress {
  stage: "idle" | "download" | "start" | "ready" | "error";
  loaded: number;
  total: number;
  error?: string;
}

type WorkerMessage =
  | { type: "ready" }
  | { type: "progress"; stage: "download" | "start"; loaded: number; total: number }
  | { type: "boot-error"; text: string }
  | { type: "loaded" }
  | { type: "result"; sets: SqlResultSet[]; ms: number }
  | { type: "error"; text: string };

const BASE = "/vendor/pglite";
/** Byte sizes of pglite.wasm, pglite.data and initdb.wasm (only used for the progress bar). */
const SIZES = [10_123_263, 6_291_000, 395_242];
const BOOT_TIMEOUT_MS = 90_000;
export const PG_RUN_TIMEOUT_MS = 8000;
export const PG_MISSING_HINT = "The Postgres engine files are not installed on this server (public/vendor/pglite). Run `node scripts/copy-pglite.mjs`, or use the SQL (SQLite) mode.";

let workerUrl: string | undefined;
let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;
let loadedSeed: string | null = null;
let progress: PgProgress = { stage: "idle", loaded: 0, total: SIZES.reduce((a, b) => a + b, 0) };
const listeners = new Set<(p: PgProgress) => void>();
let chain: Promise<unknown> = Promise.resolve();

function setProgress(p: PgProgress) {
  progress = p;
  listeners.forEach((l) => l(p));
}

export const getPgProgress = () => progress;

export function onPgProgress(listener: (p: PgProgress) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function reset() {
  worker?.terminate();
  worker = null;
  ready = null;
  loadedSeed = null;
}

function boot(): Promise<Worker> {
  if (ready) return ready;
  workerUrl ??= URL.createObjectURL(new Blob([PG_WORKER_SOURCE], { type: "text/javascript" }));
  setProgress({ stage: "download", loaded: 0, total: progress.total });
  const attempt = new Promise<Worker>((resolve, reject) => {
    let w: Worker;
    try {
      w = new Worker(workerUrl!, { type: "module" });
    } catch {
      reject(new Error("This browser can't start the Postgres worker."));
      return;
    }
    worker = w;
    const fail = (message: string) => {
      clearTimeout(timer);
      reset();
      setProgress({ stage: "error", loaded: 0, total: progress.total, error: message });
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail("The Postgres engine took too long to start. Reload the page and try again."), BOOT_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const d = e.data;
      if (d.type === "progress") setProgress({ stage: d.stage, loaded: d.loaded, total: d.total });
      else if (d.type === "ready") {
        clearTimeout(timer);
        setProgress({ stage: "ready", loaded: progress.total, total: progress.total });
        resolve(w);
      } else if (d.type === "boot-error") fail(/HTTP 404|Failed to fetch|import|NetworkError/i.test(d.text) ? PG_MISSING_HINT : `Couldn't start Postgres: ${d.text}`);
    };
    w.onerror = (e) => {
      e.preventDefault();
      fail(PG_MISSING_HINT);
    };
    w.postMessage({ type: "boot", base: `${location.origin}${BASE}`, sizes: SIZES });
  });
  ready = attempt;
  attempt.catch(() => {
    if (ready === attempt) ready = null;
  });
  return attempt;
}

/** Starts downloading and booting the engine without running anything (called when the learner picks Postgres). */
export function preloadPg(): Promise<void> {
  return boot().then(
    () => undefined,
    () => undefined,
  );
}

function request(message: object, timeoutMs: number): Promise<WorkerMessage | "timeout"> {
  return boot().then(
    (w) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          reset();
          setProgress({ stage: "idle", loaded: 0, total: progress.total });
          resolve("timeout");
        }, timeoutMs);
        w.onmessage = (e: MessageEvent<WorkerMessage>) => {
          if (e.data.type === "progress") return;
          clearTimeout(timer);
          resolve(e.data);
        };
        w.postMessage(message);
      }),
  );
}

/** Requests share one worker, so they run one at a time. */
function serial<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job, job);
  chain = next.catch(() => undefined);
  return next;
}

/** Run `sql` on Postgres against a database built from `seed` (already in Postgres syntax). */
export function runPg(seed: string, sql: string, opts: { fresh?: boolean } = {}): Promise<SqlRun> {
  return serial(async () => {
    try {
      if (opts.fresh || loadedSeed !== seed) {
        const loaded = await request({ type: "load", seed }, PG_RUN_TIMEOUT_MS * 2);
        if (loaded === "timeout") return { ok: false, error: "Setting up the database timed out.", timedOut: true };
        if (loaded.type === "error") return { ok: false, error: loaded.text };
        loadedSeed = seed;
      }
      const out = await request({ type: "run", sql }, PG_RUN_TIMEOUT_MS);
      if (out === "timeout") return { ok: false, error: `Stopped after ${PG_RUN_TIMEOUT_MS / 1000} s. Check for a missing join condition or an endless recursive query.`, timedOut: true };
      if (out.type === "error") return { ok: false, error: out.text };
      if (out.type !== "result") return { ok: false, error: "Unexpected reply from the Postgres engine." };
      return { ok: true, sets: out.sets, ms: out.ms };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "The Postgres engine failed to start." };
    }
  });
}

export function resetPgDatabase() {
  loadedSeed = null;
}
