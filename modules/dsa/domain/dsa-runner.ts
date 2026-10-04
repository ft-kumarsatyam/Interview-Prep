import type { EdgeId } from "@/modules/dsa/domain/edge-cases";

export type ArgType = "value" | "ListNode" | "TreeNode" | "cycleList";
export type ReturnKind = "value" | "ListNode" | "TreeNode" | "arg0";
/** "unordered": arrays are compared ignoring order at every level (several valid answers, e.g. Two Sum's [0,1] or [1,0]). */
export type CompareMode = "exact" | "unordered";

export interface TestCase {
  input: unknown[];
  expected: unknown;
  hidden: boolean;
  /** Names an edge case; it then appears under "Edge cases" with a label and reason. */
  edge?: EdgeId;
  /** Why this particular case matters, overriding the generic reason for its edge id. */
  note?: string;
}

export interface CaseOutcome {
  index: number;
  pass: boolean;
  actual: string;
  hidden: boolean;
}

export interface CaseSummary {
  passed: number;
  total: number;
  allPassed: boolean;
}

/** Tally of a Run/Submit result. All-cases-passed only means something when every case actually ran. */
export function summarizeCases(outcomes: readonly CaseOutcome[]): CaseSummary {
  const total = outcomes.length;
  const passed = outcomes.filter((o) => o.pass).length;
  return { passed, total, allPassed: total > 0 && passed === total };
}

/** Run only shows visible cases; Submit runs all of them. */
export function visibleCases(cases: readonly TestCase[]): TestCase[] {
  return cases.filter((c) => !c.hidden);
}

/**
 * A Run executes only the visible cases, so its results are numbered within that subset. This maps
 * them back to positions in the full case list, which is what the panel and failure summary use.
 */
export function remapToFullIndex<T extends { index: number }>(cases: readonly TestCase[], results: readonly T[], runOnlyVisible: boolean): T[] {
  if (!runOnlyVisible) return [...results];
  const visible = cases.flatMap((c, i) => (c.hidden ? [] : [i]));
  return results.flatMap((r) => (visible[r.index] === undefined ? [] : [{ ...r, index: visible[r.index]! }]));
}

/** Results of running only `indices` of the full case list, renumbered back to full-list positions. */
export function remapSubset<T extends { index: number }>(indices: readonly number[], results: readonly T[]): T[] {
  return results.flatMap((r) => (indices[r.index] === undefined ? [] : [{ ...r, index: indices[r.index]! }]));
}

/** First hint not yet revealed, or undefined once they're all shown. */
export function nextHint<T>(hints: readonly T[], revealedCount: number): T | undefined {
  return hints[revealedCount];
}

const show = (v: unknown) => {
  const text = JSON.stringify(v) ?? String(v);
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
};

/**
 * A short plain description of why a run failed, for pasting into an AI tutor. Hidden cases are
 * only counted, never described, so asking for help doesn't spoil the inputs you haven't seen.
 */
export function describeFailure(cases: readonly TestCase[], results: readonly CaseOutcome[]): string | undefined {
  if (results.length === 0) return undefined;
  const failed = results.filter((r) => !r.pass);
  if (failed.length === 0) return `All ${results.length} cases passed.`;
  const first = failed.find((r) => !cases[r.index]?.hidden);
  const head = `${failed.length} of ${results.length} cases failed.`;
  if (!first) return `${head} (Only hidden cases failed.)`;
  const c = cases[first.index]!;
  return `${head} First visible failure: input ${show(c.input)}, expected ${show(c.expected)}, got ${first.actual}.`;
}

export type HintKind = "nudge" | "approach" | "pseudocode";

export interface HintLevel {
  level: 1 | 2 | 3;
  kind: HintKind;
  text: string;
}

export const HINT_KINDS: readonly HintKind[] = ["nudge", "approach", "pseudocode"];

/**
 * Hints are a ladder: a small nudge, then the key idea, then pseudocode. Older data is a flat list of
 * strings, read as nudge, approach, then pseudocode for anything after.
 */
export function normaliseHints(raw: ReadonlyArray<string | HintLevel>): HintLevel[] {
  return raw.map((h, i) => {
    if (typeof h !== "string") return h;
    const level = Math.min(i + 1, 3) as 1 | 2 | 3;
    return { level, kind: HINT_KINDS[level - 1]!, text: h };
  });
}

/** Index of the first failing hidden case that hasn't been shown yet, for the one-time reveal after a failed Submit. */
export function pickRevealCase(cases: readonly TestCase[], results: readonly CaseOutcome[], revealed: readonly number[]): number | undefined {
  return results.find((r) => !r.pass && cases[r.index]?.hidden && !revealed.includes(r.index))?.index;
}

/** Cases as the learner sees them: ones already revealed become visible so Run covers them. */
export function effectiveCases(cases: readonly TestCase[], revealed: readonly number[]): TestCase[] {
  return cases.map((c, i) => (revealed.includes(i) ? { ...c, hidden: false } : c));
}

/** Positions (in the full list) of the cases to run for "Run edge cases": the visible ones tagged with an edge id. */
export function edgeCaseIndices(cases: readonly TestCase[]): number[] {
  return cases.flatMap((c, i) => (c.edge && !c.hidden ? [i] : []));
}
