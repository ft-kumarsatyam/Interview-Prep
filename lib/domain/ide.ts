import type { TestCase } from "./dsa-runner";

/** One editable test case in the workspace: the JSON text of each argument. */
export type CaseDraft = string[];

export const MAX_CUSTOM_CASES = 8;
const MAX_ARG_CHARS = 20_000;

export function caseToDraft(c: Pick<TestCase, "input">): CaseDraft {
  return c.input.map((v) => JSON.stringify(v));
}

export type ParsedDrafts = { ok: true; inputs: unknown[][] } | { ok: false; error: string };

/** Parse every argument as JSON. The first bad one is reported by case number and parameter name. */
export function parseDrafts(drafts: readonly CaseDraft[], params: readonly string[]): ParsedDrafts {
  const inputs: unknown[][] = [];
  for (const [ci, draft] of drafts.entries()) {
    const args: unknown[] = [];
    for (const [ai, text] of draft.entries()) {
      const name = params[ai] ?? `arg ${ai + 1}`;
      if (text.length > MAX_ARG_CHARS) return { ok: false, error: `Case ${ci + 1}: ${name} is too long` };
      try {
        args.push(JSON.parse(text));
      } catch {
        return { ok: false, error: `Case ${ci + 1}: ${name} isn't valid JSON (strings need "double quotes")` };
      }
    }
    inputs.push(args);
  }
  return { ok: true, inputs };
}

/**
 * Build the cases a Run executes from your edited inputs. An input identical to one of the problem's
 * visible cases keeps that case's expected answer; anything you changed or added has no known answer,
 * so it is run for its output only (`expected: undefined`, `custom: true`).
 */
export function casesFromInputs(inputs: readonly unknown[][], visible: readonly TestCase[]): Array<TestCase & { custom: boolean }> {
  const known = new Map(visible.map((c) => [JSON.stringify(c.input), c]));
  return inputs.map((input) => {
    const match = known.get(JSON.stringify(input));
    return match ? { ...match, hidden: false, custom: false } : { input, expected: undefined, hidden: false, custom: true };
  });
}

/** Font size steps for the editor toolbar. */
export const FONT_SIZES = [12, 13, 14, 15, 16, 18] as const;

export function stepFontSize(current: number, dir: 1 | -1): number {
  const i = FONT_SIZES.findIndex((s) => s >= current);
  const at = i === -1 ? FONT_SIZES.length - 1 : i;
  return FONT_SIZES[Math.min(Math.max(at + dir, 0), FONT_SIZES.length - 1)]!;
}
