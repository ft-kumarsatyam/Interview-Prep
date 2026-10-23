import { parsePrettierError, tidyPython, type FormatError } from "@/modules/dsa/domain/code-format";
import type { Language } from "@/modules/dsa/domain/starters";

export type FormatResult = { ok: true; code: string; label: "Format" | "Tidy" } | { ok: false; error: FormatError };

/** Prettier for JS and TS (loaded on first use, never in the main bundle); a whitespace tidy for Python. */
export async function formatCode(language: Language, code: string): Promise<FormatResult> {
  if (language === "python") return { ok: true, code: tidyPython(code), label: "Tidy" };
  try {
    const [prettier, babel, estree, typescript] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
      import("prettier/plugins/typescript"),
    ]);
    const out = await prettier.format(code, {
      parser: language === "typescript" ? "typescript" : "babel",
      plugins: [babel, estree, typescript],
      printWidth: 100,
      semi: true,
    });
    return { ok: true, code: out, label: "Format" };
  } catch (err) {
    return { ok: false, error: parsePrettierError(err) };
  }
}
