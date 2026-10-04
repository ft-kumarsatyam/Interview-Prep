/**
 * TypeScript mode for the Playground. `typescript` is loaded lazily, only when TS mode
 * is turned on, so it never weighs on the page otherwise. This transpiles (types are
 * stripped, so you can run real TypeScript) and reports syntax errors with line numbers.
 * It does not type-check: that needs the full language service and the lib .d.ts files.
 */
export interface TranspileResult {
  js: string;
  errors: string[];
}

export async function transpileTs(code: string): Promise<TranspileResult> {
  const ts = await import("typescript");
  const out = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const errors = (out.diagnostics ?? []).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    if (!d.file || d.start === undefined) return message;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    return `Line ${line + 1}:${character + 1} ${message}`;
  });
  return { js: out.outputText, errors };
}
