/**
 * Multi-file runs: every other tab is importable from the one you run. Python tabs become `<name>.py` files that
 * `import name` finds; JS and TS tabs are served by a CommonJS-style `require('./name')` (ES `import` is not supported).
 * Pure helpers only; the sandbox wiring lives in core/sandbox/languages.ts.
 */
import type { Language } from "@/modules/dsa/domain/starters";

export interface FreeFile {
  name: string;
  language: Language;
  code: string;
}

const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except",
  "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
  "while", "with", "yield",
]);

/** `helper.py` becomes `helper`; null when the name cannot be imported (spaces, dashes, keywords, not .py). */
export function pyModuleName(fileName: string): string | null {
  const m = /^(.+?)(?:\.py)?$/i.exec(fileName.trim());
  const stem = m?.[1] ?? "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(stem) || PY_KEYWORDS.has(stem)) return null;
  return stem;
}

export interface PyModules {
  /** File name to source, ready to write next to the main script. */
  files: Record<string, string>;
  /** Plain-English reasons a tab cannot be imported. */
  problems: string[];
}

/** The importable Python files: every Python tab except the one being run. */
export function pythonModules(others: readonly FreeFile[]): PyModules {
  const files: Record<string, string> = {};
  const problems: string[] = [];
  for (const f of others) {
    if (f.language !== "python") continue;
    const mod = pyModuleName(f.name);
    if (!mod) {
      problems.push(`"${f.name}" cannot be imported. Rename it to letters, digits and underscores, e.g. helper.py.`);
      continue;
    }
    files[`${mod}.py`] = f.code;
  }
  return { files, problems };
}

/** The key `require()` uses for a tab: the name without './' and without a .js/.ts/.mjs extension. */
export function jsModuleKey(name: string): string {
  return name.trim().replace(/^\.\//, "").replace(/\.(m?js|ts)$/i, "");
}

/**
 * One line of JavaScript that defines `require`, so the learner's own line numbers do not move. Modules run once
 * and are cached, `module.exports` and `exports` work, and a missing name explains which tab to create.
 */
export function buildJsPrelude(modules: Record<string, string>): string {
  if (Object.keys(modules).length === 0) return "";
  const table = JSON.stringify(modules).split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  return (
    `var require=(function(){var S=${table},C={};` +
    `function r(n){var k=String(n).trim().replace(/^\\.\\//,"").replace(/\\.(m?js|ts)$/i,"");` +
    `if(C[k])return C[k].exports;` +
    `if(!Object.prototype.hasOwnProperty.call(S,k))throw new Error("Cannot find module '"+n+"'. Open a tab named "+k+".js (or .ts) to require it.");` +
    `var m={exports:{}};C[k]=m;new Function("module","exports","require",S[k])(m,m.exports,r);return m.exports}` +
    `return r})();`
  );
}

/** The program to run: the prelude on the same first line as your code. */
export function withJsModules(code: string, modules: Record<string, string>): string {
  const prelude = buildJsPrelude(modules);
  return prelude ? prelude + code : code;
}

/** A hint shown in the tab strip for the active language, or null. */
export function moduleHint(language: Language): string {
  return language === "python"
    ? "Other .py tabs are importable by name: import helper (the tab must be named helper.py)."
    : "Other JS and TS tabs are available through require('./name'). ES import is not supported here.";
}
