/** Safe whitespace tidy for Python. It never reflows code or changes indentation depth, only tab characters and trailing space. */
export function tidyPython(code: string): string {
  const lines = code.replace(/\r\n?/g, "\n").split("\n").map((line) => {
    const lead = /^[ \t]*/.exec(line)?.[0] ?? "";
    const rest = line.slice(lead.length).replace(/[ \t]+$/, "");
    return rest ? lead.replace(/\t/g, "    ") + rest : "";
  });
  const joined = lines.join("\n").replace(/\n+$/, "");
  return joined ? `${joined}\n` : "";
}

export interface FormatError {
  message: string;
  line?: number;
  column?: number;
}

/** Reads the line and column out of a Prettier syntax error ("... (3:7)" and a code frame). */
export function parsePrettierError(err: unknown): FormatError {
  const e = err as { message?: unknown; loc?: { start?: { line?: number; column?: number } } } | null;
  const text = typeof e?.message === "string" ? e.message : "Could not format";
  const first = text.split("\n")[0] ?? text;
  const loc = e?.loc?.start;
  if (loc?.line) return { message: first.replace(/\s*\(\d+:\d+\)\s*$/, ""), line: loc.line, column: (loc.column ?? 0) + 1 };
  const m = /\((\d+):(\d+)\)\s*$/.exec(first);
  if (m) return { message: first.replace(/\s*\(\d+:\d+\)\s*$/, ""), line: Number(m[1]), column: Number(m[2]) };
  return { message: first };
}
