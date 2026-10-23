/**
 * Turns the text a failed run printed into something the UI can act on: an error name and message, the line and
 * column in the learner's own code (so the editor can jump there), and a short plain-English hint. Pure and
 * best-effort: it returns null when the text does not look like an error.
 */

export type RunLanguage = "javascript" | "typescript" | "python" | "sql";

export interface RunError {
  name: string;
  message: string;
  /** 1-based line in the learner's code. */
  line?: number;
  column?: number;
  hint?: string;
}

/** The sandbox wraps JS in an async function, which adds two lines before the learner's first line. */
export const JS_WRAPPER_LINES = 2;

const JS_NAME = /\b((?:[A-Z][A-Za-z]*)?(?:Error|Exception)|AggregateError)\b: ([^\n]*)/;

const HINTS: Array<[RegExp, string]> = [
  [/is not defined/, "Check the spelling, or declare it with const, let or def before you use it."],
  [/is not a function|object is not callable/, "You are calling something that is not a function. Print its value to see what it really is."],
  [/Cannot read propert(?:y|ies) of (?:undefined|null)|'NoneType' object/, "Something is undefined (None) here. Check the value before you read from it."],
  [/Assignment to constant variable/, "A const cannot be reassigned. Use let if the value must change."],
  [/Unexpected token|invalid syntax|SyntaxError/i, "Look just above this line for a missing bracket, quote or comma."],
  [/IndentationError|unexpected indent|unindent/i, "Check the indentation: use the same number of spaces for each block."],
  [/ModuleNotFoundError|No module named/, "Only the Python standard library is available here; third-party packages are not."],
  [/EOFError|EOF when reading a line/, "The program asked for input but the stdin box ran out of lines. Add one line per input()."],
  [/Maximum call stack|RecursionError/i, "The recursion never reaches its base case, or goes too deep. Check the stopping condition."],
  [/IndexError|out of range/i, "An index is past the end of the list. Check the length before you index."],
  [/KeyError/, "That key is not in the dictionary. Use .get() or check with `in` first."],
  [/ZeroDivisionError|division by zero/i, "A division by zero. Guard the divisor."],
  [/no such table|no such column/i, "That table or column does not exist in this dataset. Open the schema panel to check the names."],
];

export function hintFor(text: string): string | undefined {
  return HINTS.find(([re]) => re.test(text))?.[1];
}

function lineOf(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  return { line, column: index - before.lastIndexOf("\n") };
}

function clampLine(line: number | undefined, source: string | undefined): number | undefined {
  if (line === undefined || line < 1) return undefined;
  if (source === undefined) return line;
  return line <= source.split("\n").length ? line : undefined;
}

function parseJs(text: string, source?: string): RunError | null {
  const ts = text.match(/^Line (\d+):(\d+)\s+([^\n]*)/m);
  if (ts) {
    const line = clampLine(Number(ts[1]), source);
    return { name: "SyntaxError", message: ts[3].trim(), line, column: Number(ts[2]), hint: hintFor("SyntaxError") };
  }
  const named = text.match(JS_NAME);
  if (!named) return null;
  const at = text.match(/<anonymous>:(\d+):(\d+)/) ?? text.match(/AsyncFunction:(\d+):(\d+)/);
  const line = at ? clampLine(Number(at[1]) - JS_WRAPPER_LINES, source) : undefined;
  const message = named[2].trim();
  return { name: named[1], message, line, column: at && line ? Number(at[2]) : undefined, hint: hintFor(`${named[1]}: ${message}`) };
}

function parsePython(text: string, source?: string): RunError | null {
  // Our harness prints "NameError: name 'x' is not defined (line 3)".
  const own = text.match(/^(\w*(?:Error|Exception|Interrupt|Exit))\b(?::\s*([^\n]*?))?\s*\(line (\d+)\)\s*$/m);
  if (own) {
    const message = (own[2] ?? "").trim();
    return { name: own[1], message, line: clampLine(Number(own[3]), source), hint: hintFor(`${own[1]}: ${message}`) };
  }
  // A raw traceback: the last learner frame plus the final "XError: message" line.
  const frames = [...text.matchAll(/File "<(?:main|solution|exec)>", line (\d+)/g)];
  const last = text.trim().split("\n").filter(Boolean).at(-1) ?? "";
  const final = last.match(/^(\w*(?:Error|Exception|Interrupt|Exit))\b(?::\s*(.*))?$/);
  if (!final) return null;
  const line = frames.length ? clampLine(Number(frames[frames.length - 1][1]), source) : undefined;
  return { name: final[1], message: (final[2] ?? "").trim(), line, hint: hintFor(last) };
}

function parseSql(text: string, source?: string): RunError | null {
  const message = text.replace(/^(?:Error|SQL error|SQLite error):\s*/i, "").split("\n")[0]?.trim();
  if (!message) return null;
  const near = message.match(/near "([^"]+)": syntax error/);
  let pos: { line: number; column: number } | undefined;
  if (near && source) {
    const i = source.indexOf(near[1]);
    if (i >= 0) pos = lineOf(source, i);
  }
  return { name: near ? "SyntaxError" : "SQLError", message, line: pos?.line, column: pos?.column, hint: hintFor(message) };
}

/** Parses one log line (or a joined error block) into a RunError, or null when it is not an error. */
export function parseRunError(language: RunLanguage, text: string, source?: string): RunError | null {
  const t = text.trim();
  if (!t) return null;
  if (language === "python") return parsePython(t, source);
  if (language === "sql") return parseSql(t, source);
  return parseJs(t, source);
}

export interface EditorMarker {
  line: number;
  column?: number;
  message: string;
}

/** Editor markers for the error lines of a run that point at a line of the learner's own code. */
export function errorMarkers(language: RunLanguage, logs: ReadonlyArray<{ level: string; text: string }>, source?: string): EditorMarker[] {
  const out: EditorMarker[] = [];
  for (const l of logs) {
    if (l.level !== "error") continue;
    const e = parseRunError(language, l.text, source);
    if (e?.line) out.push({ line: e.line, column: e.column, message: `${e.name}: ${e.message}`.slice(0, 200) });
  }
  return out;
}
