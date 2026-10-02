import { WORKER_SOURCE, type HarnessCase, type HarnessShape, type LogLevel, type LogLine } from "./worker-source";

export type { HarnessCase, HarnessShape, LogLevel, LogLine } from "./worker-source";

export interface RunResult {
  logs: LogLine[];
  timedOut: boolean;
  ms: number;
}

export interface CaseResult {
  index: number;
  pass: boolean;
  actual: string;
  hidden: boolean;
}

export interface RunCasesResult {
  cases: CaseResult[];
  timedOut: boolean;
  ms: number;
  /** A top-level error (bad syntax, missing function) stops the harness before any case ran. */
  crashed?: string;
}

let workerUrl: string | undefined;
function getWorkerUrl(): string {
  workerUrl ??= URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  return workerUrl;
}

/** Run untrusted JS off the main thread with no DOM or network, killed after `timeoutMs`. */
export function runCode(code: string, timeoutMs = 3000, onLog?: (line: LogLine) => void): Promise<RunResult> {
  const worker = new Worker(getWorkerUrl());
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

/**
 * Run `code`'s `functionName` export against each test case off the main
 * thread. Used by the DSA runner's Run/Submit; JS/TS only, no server
 * execution — matches the Playground's existing sandbox constraints.
 */
export function runWithCases(code: string, functionName: string, cases: HarnessCase[], timeoutMs = 3000, shape: HarnessShape = {}): Promise<RunCasesResult> {
  const worker = new Worker(getWorkerUrl());
  const results: CaseResult[] = [];
  const started = performance.now();

  return new Promise((resolve) => {
    const finish = (timedOut: boolean, crashed?: string) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ cases: results, timedOut, ms: Math.round(performance.now() - started), crashed });
    };
    const timer = setTimeout(() => finish(true), timeoutMs);
    worker.onmessage = (
      e: MessageEvent<
        { type: "case"; index: number; pass: boolean; actual: string; hidden: boolean } | { type: "log"; level: LogLevel; text: string } | { type: "done" }
      >,
    ) => {
      if (e.data.type === "done") finish(false);
      else if (e.data.type === "case") results.push({ index: e.data.index, pass: e.data.pass, actual: e.data.actual, hidden: e.data.hidden });
      else if (e.data.type === "log" && e.data.level === "error") finish(false, e.data.text);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      finish(false, e.message || "Worker error");
    };
    worker.postMessage({ code, harness: { functionName, cases, argTypes: shape.argTypes, returns: shape.returns, compare: shape.compare } });
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
