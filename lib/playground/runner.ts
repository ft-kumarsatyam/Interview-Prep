export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LogLine {
  level: LogLevel;
  text: string;
}

export interface RunResult {
  logs: LogLine[];
  timedOut: boolean;
  ms: number;
}

/**
 * Worker source, kept as a string so it runs from a Blob URL with no bundler
 * involvement. It strips network APIs, captures console output, and reports
 * "done" once the code and every pending timer have finished.
 */
const WORKER_SOURCE = String.raw`
const send = (m) => postMessage(m);
for (const k of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"]) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch {}
}

function fmt(v, depth = 0, seen = new WeakSet()) {
  if (typeof v === "string") return depth === 0 ? v : "'" + v + "'";
  if (typeof v === "bigint") return v + "n";
  if (typeof v === "symbol" || typeof v === "undefined" || v === null || typeof v !== "object" && typeof v !== "function") return String(v);
  if (typeof v === "function") return "[Function: " + (v.name || "(anonymous)") + "]";
  if (v instanceof Error) return v.stack ? v.stack.split("\n").slice(0, 3).join("\n") : String(v);
  if (seen.has(v)) return "[Circular]";
  seen.add(v);
  if (depth > 3) return Array.isArray(v) ? "[Array]" : "[Object]";
  if (Array.isArray(v)) return "[ " + v.map((x) => fmt(x, depth + 1, seen)).join(", ") + " ]";
  if (v instanceof Map) return "Map(" + v.size + ") { " + [...v].map(([k, x]) => fmt(k, depth + 1, seen) + " => " + fmt(x, depth + 1, seen)).join(", ") + " }";
  if (v instanceof Set) return "Set(" + v.size + ") { " + [...v].map((x) => fmt(x, depth + 1, seen)).join(", ") + " }";
  if (v instanceof Promise) return "Promise { <pending> }";
  if (v instanceof Date) return v.toISOString();
  const entries = Object.entries(v).map(([k, x]) => k + ": " + fmt(x, depth + 1, seen));
  const name = v.constructor && v.constructor !== Object ? v.constructor.name + " " : "";
  return name + (entries.length ? "{ " + entries.join(", ") + " }" : "{}");
}

for (const level of ["log", "info", "warn", "error", "debug"]) {
  console[level] = (...args) => send({ type: "log", level, text: args.map((a) => fmt(a)).join(" ") });
}

const realSetTimeout = setTimeout, realClearTimeout = clearTimeout;
const realSetInterval = setInterval, realClearInterval = clearInterval;
const pending = new Set();
let mainDone = false;
function maybeDone() {
  if (mainDone && pending.size === 0) realSetTimeout(() => { if (pending.size === 0) send({ type: "done" }); }, 0);
}
self.setTimeout = (fn, ms, ...args) => {
  const id = realSetTimeout(() => {
    pending.delete(id);
    try { typeof fn === "function" ? fn(...args) : null; } catch (e) { send({ type: "log", level: "error", text: "Uncaught " + fmt(e) }); }
    maybeDone();
  }, ms);
  pending.add(id);
  return id;
};
self.clearTimeout = (id) => { pending.delete(id); realClearTimeout(id); maybeDone(); };
self.setInterval = (fn, ms, ...args) => {
  const id = realSetInterval(() => { try { fn(...args); } catch (e) { send({ type: "log", level: "error", text: "Uncaught " + fmt(e) }); } }, ms);
  pending.add(id);
  return id;
};
self.clearInterval = (id) => { pending.delete(id); realClearInterval(id); maybeDone(); };
self.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  send({ type: "log", level: "error", text: "Uncaught (in promise) " + fmt(e.reason) });
});

self.onmessage = async (e) => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    await new AsyncFunction(e.data)();
  } catch (err) {
    send({ type: "log", level: "error", text: "Uncaught " + fmt(err) });
  }
  mainDone = true;
  maybeDone();
};
`;

let workerUrl: string | undefined;

/** Run untrusted JS off the main thread with no DOM or network, killed after `timeoutMs`. */
export function runCode(code: string, timeoutMs = 3000, onLog?: (line: LogLine) => void): Promise<RunResult> {
  workerUrl ??= URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const worker = new Worker(workerUrl);
  const logs: LogLine[] = [];
  const started = performance.now();

  return new Promise((resolve) => {
    const finish = (timedOut: boolean) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ logs, timedOut, ms: Math.round(performance.now() - started) });
    };
    const timer = setTimeout(() => finish(true), timeoutMs);
    worker.onmessage = (e: MessageEvent<{ type: "log"; level: LogLevel; text: string } | { type: "done" }>) => {
      if (e.data.type === "done") finish(false);
      else {
        const line = { level: e.data.level, text: e.data.text };
        logs.push(line);
        onLog?.(line);
      }
    };
    worker.onerror = (e) => {
      e.preventDefault();
      logs.push({ level: "error", text: e.message || "Worker error" });
      finish(false);
    };
    worker.postMessage(code);
  });
}

/** Normalise console output for prediction comparison. */
export function normalizeOutput(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
