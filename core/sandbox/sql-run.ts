import type { Row } from "@/modules/dsa/domain/db-lab";
import { SQL_WORKER_SOURCE } from "@/core/sandbox/sql-worker-source";

export interface SqlResultSet {
  columns: string[];
  rows: Row[];
  /** Rows the query produced; `rows` is capped for display. */
  total: number;
}

export type SqlRun = { ok: true; sets: SqlResultSet[]; ms: number } | { ok: false; error: string; timedOut?: boolean };

type WorkerMessage =
  | { type: "ready" }
  | { type: "boot-error"; text: string }
  | { type: "loaded" }
  | { type: "result"; sets: SqlResultSet[]; ms: number }
  | { type: "error"; text: string };

const BOOT_TIMEOUT_MS = 20_000;
export const SQL_RUN_TIMEOUT_MS = 5000;
const BASE = "/vendor/sqljs";

let workerUrl: string | undefined;
let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;
let loadedSeed: string | null = null;

function reset() {
  worker?.terminate();
  worker = null;
  ready = null;
  loadedSeed = null;
}

function boot(): Promise<Worker> {
  if (ready) return ready;
  workerUrl ??= URL.createObjectURL(new Blob([SQL_WORKER_SOURCE], { type: "text/javascript" }));
  const w = new Worker(workerUrl);
  worker = w;
  ready = new Promise<Worker>((resolve, reject) => {
    const timer = setTimeout(() => {
      reset();
      reject(new Error("The SQL engine took too long to load. Reload the page and try again."));
    }, BOOT_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === "ready") {
        clearTimeout(timer);
        resolve(w);
      } else if (e.data.type === "boot-error") {
        clearTimeout(timer);
        reset();
        reject(new Error("Couldn't load the SQL engine."));
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      reset();
      reject(new Error("Couldn't start the SQL worker."));
    };
    w.postMessage({ type: "boot", base: `${location.origin}${BASE}` });
  });
  return ready;
}

/** One request at a time. A timeout kills the worker (a runaway query can't be interrupted) and the next run re-boots it. */
function request(message: object, timeoutMs: number): Promise<WorkerMessage | "timeout"> {
  return boot().then(
    (w) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          reset();
          resolve("timeout");
        }, timeoutMs);
        w.onmessage = (e: MessageEvent<WorkerMessage>) => {
          clearTimeout(timer);
          resolve(e.data);
        };
        w.postMessage(message);
      }),
  );
}

/** Run `sql` against a fresh database built from `seed`. The database is rebuilt only when the seed changes or `fresh` is set. */
export async function runSql(seed: string, sql: string, opts: { fresh?: boolean } = {}): Promise<SqlRun> {
  try {
    if (opts.fresh || loadedSeed !== seed) {
      const loaded = await request({ type: "load", seed }, SQL_RUN_TIMEOUT_MS);
      if (loaded === "timeout") return { ok: false, error: "Setting up the database timed out.", timedOut: true };
      if (loaded.type === "error") return { ok: false, error: loaded.text };
      loadedSeed = seed;
    }
    const out = await request({ type: "run", sql }, SQL_RUN_TIMEOUT_MS);
    if (out === "timeout") return { ok: false, error: `Stopped after ${SQL_RUN_TIMEOUT_MS / 1000} s. Check for a missing join condition or an endless recursive query.`, timedOut: true };
    if (out.type === "error") return { ok: false, error: out.text };
    if (out.type !== "result") return { ok: false, error: "Unexpected reply from the SQL engine." };
    return { ok: true, sets: out.sets, ms: out.ms };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The SQL engine failed to start." };
  }
}

/** Drop the loaded database so the next run starts from the seed again. */
export function resetSqlDatabase() {
  loadedSeed = null;
}
