import { PY_WORKER_SOURCE } from "@/core/sandbox/py-worker-source";
import type { CaseResult, HarnessCase, HarnessShape, LogLevel, LogLine, RunCasesResult, RunResult } from "@/core/sandbox/run";

type WorkerMessage =
  | { type: "ready"; source?: "local" | "cdn" }
  | { type: "stage"; text: string }
  | { type: "boot-error"; text: string }
  | { type: "log"; level: LogLevel; text: string; crash?: boolean }
  | { type: "case"; index: number; pass: boolean; actual: string; hidden: boolean }
  | { type: "done" };

const BOOT_TIMEOUT_MS = 90_000;
export const PY_RUN_TIMEOUT_MS = 5000;

let workerUrl: string | undefined;
let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;

export type PyStatus = "idle" | "loading" | "ready";
let status: PyStatus = "idle";
let stage = "";
export const pyStage = () => stage;
const listeners = new Set<() => void>();
const setStatus = (s: PyStatus) => {
  status = s;
  for (const l of listeners) l();
};
export const pyStatus = () => status;
export function subscribePyStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function reset() {
  worker?.terminate();
  worker = null;
  ready = null;
  stage = "";
  setStatus("idle");
}

/** Boot Pyodide once per tab. It loads from this app's own files (the browser caches it) and falls back to the CDN. */
export function bootPython(): Promise<Worker> {
  if (ready) return ready;
  workerUrl ??= URL.createObjectURL(new Blob([PY_WORKER_SOURCE], { type: "text/javascript" }));
  const w = new Worker(workerUrl);
  worker = w;
  setStatus("loading");
  ready = new Promise<Worker>((resolve, reject) => {
    const timer = setTimeout(() => {
      reset();
      reject(new Error("Python took too long to load. Check your connection and try again."));
    }, BOOT_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === "stage") {
        stage = e.data.text;
        setStatus(status);
      } else if (e.data.type === "ready") {
        clearTimeout(timer);
        stage = "";
        setStatus("ready");
        resolve(w);
      } else if (e.data.type === "boot-error") {
        clearTimeout(timer);
        reset();
        reject(new Error("Couldn't load Python. If the app was installed without its Python files, it needs an internet connection the first time."));
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      reset();
      reject(new Error("Couldn't start the Python worker."));
    };
    w.postMessage({ type: "boot", local: `${location.origin}/vendor/pyodide/` });
  });
  return ready;
}

/**
 * One run at a time. A timeout kills the worker (a tight Python loop can't be interrupted), then a replacement boots
 * in the background right away, so the next run usually finds Python ready instead of paying a cold start.
 */
function exchange(message: unknown, timeoutMs: number, onMessage: (m: WorkerMessage) => boolean): Promise<{ timedOut: boolean }> {
  return bootPython().then(
    (w) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          reset();
          void bootPython().catch(() => {});
          resolve({ timedOut: true });
        }, timeoutMs);
        w.onmessage = (e: MessageEvent<WorkerMessage>) => {
          if (onMessage(e.data)) {
            clearTimeout(timer);
            resolve({ timedOut: false });
          }
        };
        w.postMessage(message);
      }),
  );
}

export async function runPython(code: string, timeoutMs = PY_RUN_TIMEOUT_MS, onLog?: (line: LogLine) => void, stdin?: string, files?: Record<string, string>): Promise<RunResult> {
  const logs: LogLine[] = [];
  const started = performance.now();
  try {
    const { timedOut } = await exchange({ type: "free", code, stdin, files }, timeoutMs, (m) => {
      if (m.type === "done") return true;
      if (m.type === "log") {
        const line = { level: m.level, text: m.text };
        logs.push(line);
        onLog?.(line);
      }
      return false;
    });
    return { logs, timedOut, ms: Math.round(performance.now() - started) };
  } catch (err) {
    return { logs: [{ level: "error", text: err instanceof Error ? err.message : "Python failed to start" }], timedOut: false, ms: 0 };
  }
}

export async function runPythonCases(
  code: string,
  functionName: string,
  cases: HarnessCase[],
  timeoutMs = PY_RUN_TIMEOUT_MS,
  shape: HarnessShape = {},
): Promise<RunCasesResult> {
  const results: CaseResult[] = [];
  const logs: LogLine[] = [];
  let crashed: string | undefined;
  const started = performance.now();
  try {
    const harness = { functionName, cases, argTypes: shape.argTypes, returns: shape.returns, compare: shape.compare };
    const { timedOut } = await exchange({ type: "cases", code, harness }, timeoutMs, (m) => {
      if (m.type === "done") return true;
      if (m.type === "case") results.push({ index: m.index, pass: m.pass, actual: m.actual, hidden: m.hidden });
      else if (m.type === "log" && m.crash) crashed = m.text;
      else if (m.type === "log" && logs.length < 500) logs.push({ level: m.level, text: m.text });
      return false;
    });
    return { cases: results, timedOut, ms: Math.round(performance.now() - started), crashed, logs };
  } catch (err) {
    return { cases: [], timedOut: false, ms: 0, crashed: err instanceof Error ? err.message : "Python failed to start", logs };
  }
}
