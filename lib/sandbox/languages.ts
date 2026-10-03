import type { Language } from "@/lib/domain/starters";
import { runCode, runWithCases, type HarnessCase, type HarnessShape, type LogLine, type RunCasesResult, type RunResult } from "./run";

export { LANGUAGES, isLanguage, type Language } from "@/lib/domain/starters";

const JS_TIMEOUT_MS = 3000;

async function toJs(code: string): Promise<{ js: string } | { errors: string[] }> {
  const { transpileTs } = await import("@/lib/playground/ts-check");
  const out = await transpileTs(code);
  return out.errors.length > 0 ? { errors: out.errors } : { js: out.js };
}

/** Run `functionName` from `code` against `cases` in the chosen language. Everything stays in the browser. */
export async function runCasesIn(
  lang: Language,
  code: string,
  functionName: string,
  cases: HarnessCase[],
  shape: HarnessShape = {},
): Promise<RunCasesResult> {
  if (lang === "python") {
    const { runPythonCases } = await import("./py-run");
    return runPythonCases(code, functionName, cases, undefined, shape);
  }
  if (lang === "typescript") {
    const out = await toJs(code);
    if ("errors" in out) return { cases: [], timedOut: false, ms: 0, crashed: out.errors.join("\n"), logs: [] };
    return runWithCases(out.js, functionName, cases, JS_TIMEOUT_MS, shape);
  }
  return runWithCases(code, functionName, cases, JS_TIMEOUT_MS, shape);
}

/** Free-form run for the Playground: console output only, no test cases. */
export async function runFreeIn(lang: Language, code: string, onLog?: (line: LogLine) => void): Promise<RunResult> {
  if (lang === "python") {
    const { runPython } = await import("./py-run");
    return runPython(code, undefined, onLog);
  }
  if (lang === "typescript") {
    const out = await toJs(code);
    if ("errors" in out) return { logs: out.errors.map((text) => ({ level: "error" as const, text })), timedOut: false, ms: 0 };
    return runCode(out.js, JS_TIMEOUT_MS, onLog);
  }
  return runCode(code, JS_TIMEOUT_MS, onLog);
}
