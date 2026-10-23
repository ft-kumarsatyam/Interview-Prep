import { jsModuleKey, pythonModules, withJsModules, type FreeFile } from "@/modules/dsa/domain/playground-modules";
import type { Language } from "@/modules/dsa/domain/starters";
import { runCode, runWithCases, type HarnessCase, type HarnessShape, type LogLine, type RunCasesResult, type RunResult } from "@/core/sandbox/run";

export { LANGUAGES, isLanguage, type Language } from "@/modules/dsa/domain/starters";

const JS_TIMEOUT_MS = 3000;

async function toJs(code: string): Promise<{ js: string } | { errors: string[] }> {
  const { transpileTs } = await import("@/modules/dsa/lib/playground/ts-check");
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
    const { runPythonCases } = await import("@/core/sandbox/py-run");
    return runPythonCases(code, functionName, cases, undefined, shape);
  }
  if (lang === "typescript") {
    const out = await toJs(code);
    if ("errors" in out) return { cases: [], timedOut: false, ms: 0, crashed: out.errors.join("\n"), logs: [] };
    return runWithCases(out.js, functionName, cases, JS_TIMEOUT_MS, shape);
  }
  return runWithCases(code, functionName, cases, JS_TIMEOUT_MS, shape);
}

/**
 * Free-form run for the Playground: console output only, no test cases. `files` are the other editor tabs: Python
 * writes them next to the script (`import helper`), JS and TS serve them through `require('./helper')`.
 */
export async function runFreeIn(lang: Language, code: string, onLog?: (line: LogLine) => void, stdin?: string, files: FreeFile[] = []): Promise<RunResult> {
  if (lang === "python") {
    const { runPython } = await import("@/core/sandbox/py-run");
    const mods = pythonModules(files);
    const res = await runPython(code, undefined, onLog, stdin, mods.files);
    if (mods.problems.length === 0) return res;
    const notes = mods.problems.map((text) => ({ level: "warn" as const, text }));
    notes.forEach((n) => onLog?.(n));
    return { ...res, logs: [...notes, ...res.logs] };
  }
  const modules = await jsModules(files);
  if (lang === "typescript") {
    const out = await toJs(code);
    if ("errors" in out) return { logs: out.errors.map((text) => ({ level: "error" as const, text })), timedOut: false, ms: 0 };
    return runCode(withJsModules(out.js, modules), JS_TIMEOUT_MS, onLog, stdin);
  }
  return runCode(withJsModules(code, modules), JS_TIMEOUT_MS, onLog, stdin);
}

/** The other JS and TS tabs as plain JavaScript. A TS tab with a syntax error throws when it is required. */
async function jsModules(files: FreeFile[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const f of files) {
    if (f.language === "python") continue;
    if (f.language === "javascript") out[jsModuleKey(f.name)] = f.code;
    else {
      const t = await toJs(f.code);
      out[jsModuleKey(f.name)] = "js" in t ? t.js : `throw new Error(${JSON.stringify(`${f.name}: ${t.errors.join("; ")}`)});`;
    }
  }
  return out;
}
