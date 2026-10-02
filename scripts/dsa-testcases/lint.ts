import { EDGE_IDS } from "@/lib/domain/edge-cases";
import type { ProblemSpec } from "./types";

export const MIN_HIDDEN_SHARE = 0.4;
export const MAX_PSEUDOCODE_LINES = 12;
/** Every case ships to the browser with the page, so keep each input small. */
export const MAX_INPUT_CHARS = 8000;

/**
 * The quality bar every authored problem must meet. Returns what's wrong, or [] when it's fine.
 * `starterPasses` is how many cases the unmodified starter happens to pass.
 */
export function lintSpec(spec: ProblemSpec, ctx: { slugExists: boolean; starterPasses: number }): string[] {
  const errors: string[] = [];
  const total = spec.cases.length;
  const hidden = spec.cases.filter((c) => c.hidden).length;
  const examples = spec.cases.filter((c) => !c.hidden && !c.edge).length;
  const edges = spec.cases.filter((c) => c.edge);

  if (!ctx.slugExists) errors.push("slug is not in data/dsa-problems.json");
  if (examples < 2) errors.push(`needs at least 2 visible example cases (has ${examples})`);
  if (edges.length < 3) errors.push(`needs at least 3 edge cases (has ${edges.length})`);
  if (hidden / total < MIN_HIDDEN_SHARE) errors.push(`hidden cases are ${Math.round((hidden / total) * 100)}% of ${total}; need at least ${MIN_HIDDEN_SHARE * 100}%`);
  if (edges.every((c) => c.hidden)) errors.push("at least one edge case must be visible so the checklist teaches something");

  const seen = new Set<string>();
  for (const c of spec.cases) {
    const key = JSON.stringify(c.input);
    if (seen.has(key)) errors.push(`duplicate input: ${key.slice(0, 80)}`);
    seen.add(key);
    if (key.length > MAX_INPUT_CHARS) errors.push(`input is ${key.length} chars; keep cases under ${MAX_INPUT_CHARS}`);
    if (c.edge && !EDGE_IDS.includes(c.edge)) errors.push(`unknown edge id "${c.edge}"`);
    if (c.note && c.note.length > 160) errors.push(`note too long (${c.note.length} chars)`);
    if (c.note && !c.edge) errors.push("a note only makes sense on an edge case");
  }

  spec.hints.forEach((h, i) => {
    if (h.trim().length < 20) errors.push(`hint ${i + 1} is too short`);
  });
  const pseudo = spec.hints[2];
  if (pseudo.split("\n").length > MAX_PSEUDOCODE_LINES) errors.push(`pseudocode is longer than ${MAX_PSEUDOCODE_LINES} lines`);
  if (/\bfunction\b|=>|\bconst\b|\blet\b/.test(pseudo)) errors.push("pseudocode must be language-neutral, not JavaScript");
  if (!spec.starter.includes(spec.functionName)) errors.push("starter must define the function");
  if (!spec.fuzz && spec.slug) {
    // Fuzzing is strongly preferred but only practical for plain-value problems; structures rely on the brute cross-check alone.
    if ((spec.argTypes ?? []).every((t) => t === "value") && spec.returns !== "ListNode" && spec.returns !== "TreeNode") errors.push("plain-value problems need a fuzz generator");
  }
  if (ctx.starterPasses > Math.ceil(total * 0.25)) errors.push(`the unmodified starter already passes ${ctx.starterPasses} of ${total} cases`);
  return errors;
}
