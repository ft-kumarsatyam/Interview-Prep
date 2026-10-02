import type { ContentProblem } from "@/lib/content";

/**
 * Canonical teaching order for the "sheet" view — a takeuforward/AlgoMaster-
 * style progression, as opposed to the Pattern view's plain insertion order.
 * Most problems' step is just their `pattern`; a handful of existing
 * foundational problems (e.g. reverse-integer, sort-colors) are re-slotted
 * into "Basics & Complexity" / "Sorting Algorithms" via the optional `step`
 * field on data/dsa-problems.json without touching their `pattern` (which
 * quiz-bank and planner stats still key off).
 */
export const STEP_ORDER = [
  "Basics & Complexity",
  "Sorting Algorithms",
  "Arrays & Hashing",
  "Binary Search",
  "Two Pointers",
  "Sliding Window",
  "Stack & Monotonic Stack",
  "Linked List",
  "Bit Manipulation",
  "Backtracking",
  "Heap / Priority Queue",
  "Greedy",
  "Trees",
  "Tries",
  "Graphs (BFS/DFS)",
  "Advanced Graphs",
  "1-D Dynamic Programming",
  "2-D Dynamic Programming",
  "Intervals",
  "Segment Tree / BIT / Union-Find",
  "Math & Geometry",
  "Design (Coding)",
] as const;

/** A problem's sheet step: its override if re-slotted, else its pattern. */
export function stepOf(p: ContentProblem): string {
  return p.step ?? p.pattern;
}

export interface StepGroup {
  step: string;
  /** Position in STEP_ORDER, or Infinity for an unrecognised step (sorts last, never silently dropped). */
  rank: number;
  problems: ContentProblem[];
}

/** Groups `main`-track problems by sheet step, in canonical teaching order, each group kept in existing `order`. */
export function groupByStep(problems: readonly ContentProblem[]): StepGroup[] {
  const groups = new Map<string, ContentProblem[]>();
  for (const p of problems) groups.set(stepOf(p), [...(groups.get(stepOf(p)) ?? []), p]);
  const rankOf = (step: string) => {
    const i = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  return [...groups.entries()]
    .map(([step, items]) => ({ step, rank: rankOf(step), problems: items.toSorted((a, b) => a.order - b.order) }))
    .toSorted((a, b) => a.rank - b.rank);
}

export interface StepTally {
  solved: number;
  total: number;
  complete: boolean;
}

export function stepProgress(problems: readonly ContentProblem[], isSolved: (slug: string) => boolean): StepTally {
  const solved = problems.filter((p) => isSolved(p.slug)).length;
  return { solved, total: problems.length, complete: problems.length > 0 && solved === problems.length };
}
