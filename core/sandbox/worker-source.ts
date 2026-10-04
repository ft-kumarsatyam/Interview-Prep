import { WORKER_LIB_SOURCE } from "@/core/sandbox/worker-lib";

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LogLine {
  level: LogLevel;
  text: string;
}

export interface HarnessCase {
  input: unknown[];
  expected: unknown;
  hidden: boolean;
}

/** How a problem's arguments are built and its result encoded; see lib/sandbox/worker-lib.ts. */
export interface HarnessShape {
  argTypes?: Array<"value" | "ListNode" | "TreeNode" | "cycleList">;
  returns?: "value" | "ListNode" | "TreeNode" | "arg0";
  compare?: "exact" | "unordered";
}

/**
 * Worker source, kept as a string so it runs from a Blob URL with no bundler
 * involvement. It strips network APIs, captures console output, and reports
 * "done" once the code and every pending timer have finished.
 *
 * A message that is a plain string runs it as free-form code (the Playground
 * path, unchanged from before this module existed). A message shaped
 * `{code, harness: {functionName, cases}}` additionally pulls `functionName`
 * out of `code` and calls it against every case in `harness.cases` (the DSA
 * runner path) — one `{type:"case", ...}` message per case, never cloning
 * the raw return value across the postMessage boundary.
 */
export const WORKER_SOURCE = String.raw`
const send = (m) => postMessage(m);
for (const k of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"]) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch {}
}

const MAX_ITEMS = 100;
const MAX_LINES = 2000;
const MAX_LINE_CHARS = 20000;

function fmt(v, depth = 0, seen = new WeakSet()) {
  if (typeof v === "string") return depth === 0 ? v : "'" + v + "'";
  if (typeof v === "bigint") return v + "n";
  if (typeof v === "symbol" || typeof v === "undefined" || v === null || typeof v !== "object" && typeof v !== "function") return String(v);
  if (typeof v === "function") return "[Function: " + (v.name || "(anonymous)") + "]";
  if (v instanceof Error) return v.stack ? v.stack.split("\n").slice(0, 3).join("\n") : String(v);
  if (seen.has(v)) return "[Circular]";
  seen.add(v);
  if (depth > 3) return Array.isArray(v) ? "[Array]" : "[Object]";
  const more = (n) => n > MAX_ITEMS ? ["... " + (n - MAX_ITEMS) + " more"] : [];
  if (Array.isArray(v) && v.length === 0) return "[]";
  if (Array.isArray(v)) return "[ " + [...v.slice(0, MAX_ITEMS).map((x) => fmt(x, depth + 1, seen)), ...more(v.length)].join(", ") + " ]";
  if ((v instanceof Map || v instanceof Set) && v.size === 0) return (v instanceof Map ? "Map(0)" : "Set(0)") + " {}";
  if (v instanceof Map) return "Map(" + v.size + ") { " + [...[...v].slice(0, MAX_ITEMS).map(([k, x]) => fmt(k, depth + 1, seen) + " => " + fmt(x, depth + 1, seen)), ...more(v.size)].join(", ") + " }";
  if (v instanceof Set) return "Set(" + v.size + ") { " + [...[...v].slice(0, MAX_ITEMS).map((x) => fmt(x, depth + 1, seen)), ...more(v.size)].join(", ") + " }";
  if (v instanceof Promise) return "Promise { <pending> }";
  if (v instanceof Date) return v.toISOString();
  const all = Object.entries(v);
  const entries = [...all.slice(0, MAX_ITEMS).map(([k, x]) => k + ": " + fmt(x, depth + 1, seen)), ...more(all.length)];
  const name = v.constructor && v.constructor !== Object ? v.constructor.name + " " : "";
  return name + (entries.length ? "{ " + entries.join(", ") + " }" : "{}");
}

${WORKER_LIB_SOURCE}

let lineCount = 0;
let groupIndent = "";
function emit(level, text) {
  lineCount++;
  if (lineCount > MAX_LINES) {
    if (lineCount === MAX_LINES + 1) send({ type: "log", level: "warn", text: "... output truncated after " + MAX_LINES + " lines" });
    return;
  }
  if (text.length > MAX_LINE_CHARS) text = text.slice(0, MAX_LINE_CHARS) + "... (" + (text.length - MAX_LINE_CHARS) + " more characters)";
  if (groupIndent) text = text.split("\n").map((l) => groupIndent + l).join("\n");
  send({ type: "log", level, text });
}

for (const level of ["log", "info", "warn", "error", "debug"]) {
  console[level] = (...args) => emit(level, args.map((a) => fmt(a)).join(" "));
}
console.dir = (v) => emit("log", fmt(v, 1));
console.assert = (cond, ...rest) => { if (!cond) emit("error", "Assertion failed" + (rest.length ? ": " + rest.map((a) => fmt(a)).join(" ") : "")); };
console.group = (...rest) => { if (rest.length) emit("log", rest.map((a) => fmt(a)).join(" ")); groupIndent += "  "; };
console.groupEnd = () => { groupIndent = groupIndent.slice(2); };
const counts = new Map();
console.count = (label = "default") => { const n = (counts.get(label) || 0) + 1; counts.set(label, n); emit("log", label + ": " + n); };
console.countReset = (label = "default") => { counts.delete(label); };
const timers = new Map();
console.time = (label = "default") => { timers.set(label, performance.now()); };
const timeReport = (label, end) => {
  const t = timers.get(label);
  if (t === undefined) return emit("warn", "Timer '" + label + "' does not exist");
  emit("log", label + ": " + (performance.now() - t).toFixed(2) + " ms");
  if (end) timers.delete(label);
};
console.timeLog = (label = "default") => timeReport(label, false);
console.timeEnd = (label = "default") => timeReport(label, true);
console.table = (data) => {
  if (data === null || typeof data !== "object") return emit("log", fmt(data));
  const rows = Array.isArray(data) ? data.map((v, i) => [String(i), v]) : data instanceof Map ? [...data].map(([k, v]) => [fmt(k, 1), v]) : Object.entries(data);
  const cols = [];
  let hasValues = false;
  const table = rows.slice(0, MAX_ITEMS).map(([idx, v]) => {
    const row = { "(index)": idx };
    if (v !== null && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (!cols.includes(k)) cols.push(k);
        row[k] = fmt(x, 1);
      }
    } else {
      hasValues = true;
      row.Values = fmt(v, 1);
    }
    return row;
  });
  const headers = ["(index)", ...cols, ...(hasValues ? ["Values"] : [])];
  const widths = headers.map((h) => Math.max(h.length, ...table.map((r) => (r[h] ?? "").length)));
  const line = (cells) => "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";
  const rule = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  emit("log", [rule, line(headers), rule, ...table.map((r) => line(headers.map((h) => r[h] ?? ""))), rule].join("\n"));
};

let assertFails = 0;
self.assertEqual = (actual, expected, label) => {
  const ok = __deepEqual(actual, expected);
  const name = label ? label + ": " : "";
  if (ok) emit("log", "PASS " + name + fmt(actual, 1));
  else {
    assertFails++;
    emit("error", "FAIL " + name + "expected " + fmt(expected, 1) + ", got " + fmt(actual, 1));
  }
  return ok;
};
let testChain = Promise.resolve();
const testStats = { passed: 0, failed: 0 };
self.test = (name, fn) => {
  testChain = testChain.then(async () => {
    const before = assertFails;
    try {
      await fn();
      if (assertFails > before) throw new Error("");
      testStats.passed++;
      emit("log", "PASS " + name);
    } catch (e) {
      testStats.failed++;
      emit("error", "FAIL " + name + (e && e.message ? " - " + e.message : ""));
    }
  });
};

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

async function __runHarness(code, harness) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let fn;
  try {
    fn = await new AsyncFunction(code + "\nreturn typeof " + harness.functionName + " === 'function' ? " + harness.functionName + " : undefined;")();
  } catch (e) {
    send({ type: "log", level: "error", text: "Uncaught " + fmt(e), crash: true });
    send({ type: "done" });
    return;
  }
  if (typeof fn !== "function") {
    send({ type: "log", level: "error", text: "No function named '" + harness.functionName + "' was found.", crash: true });
    send({ type: "done" });
    return;
  }
  const argTypes = harness.argTypes || [];
  for (const [index, c] of harness.cases.entries()) {
    try {
      const args = c.input.map((v, i) => __buildArg(argTypes[i] || "value", v));
      const out = fn(...args);
      const actual = __encodeResult(harness.returns || "value", out, args, argTypes);
      send({ type: "case", index, pass: __matches(actual, c.expected, harness.compare), actual: fmt(actual), hidden: c.hidden });
    } catch (e) {
      send({ type: "case", index, pass: false, actual: "threw " + fmt(e), hidden: c.hidden });
    }
  }
  send({ type: "done" });
}

self.onmessage = async (e) => {
  if (e.data && typeof e.data === "object" && e.data.harness) {
    await __runHarness(e.data.code, e.data.harness);
    return;
  }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    await new AsyncFunction(e.data)();
    await testChain;
    if (testStats.passed + testStats.failed > 0) emit(testStats.failed ? "error" : "log", testStats.passed + " passed, " + testStats.failed + " failed");
  } catch (err) {
    send({ type: "log", level: "error", text: "Uncaught " + fmt(err) });
  }
  mainDone = true;
  maybeDone();
};
`;
