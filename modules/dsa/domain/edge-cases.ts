/**
 * Named edge cases for the DSA runner. A case tagged with one of these ids shows up under "Edge cases"
 * with a label and a one-line reason it matters, so the checklist of inputs that usually break a solution
 * is explicit instead of something you only discover when Submit fails.
 */
export const EDGE_CASES = {
  empty: { label: "Empty input", rationale: "Zero elements: loops that read nums[0] or assume a first item crash here." },
  single: { label: "Single element", rationale: "One item: pairs, neighbours and 'previous' values don't exist yet." },
  two: { label: "Two elements", rationale: "The smallest input where comparisons between items happen at all." },
  duplicates: { label: "Duplicates", rationale: "Equal values break solutions that assume every value is unique." },
  "all-equal": { label: "All elements equal", rationale: "Every comparison ties: tests whether you handle ties and avoid double counting." },
  negatives: { label: "Negative numbers", rationale: "Sign changes break greedy assumptions, running max/min logic and 'sum only grows' reasoning." },
  zeros: { label: "Zeros", rationale: "Zero is falsy in JavaScript and an identity for sums and products: checks like if (x) quietly skip it." },
  extremes: { label: "Extreme values", rationale: "Values at the limits probe overflow-style bugs, sentinel collisions (Infinity, -1) and off-by-one bounds." },
  sorted: { label: "Already sorted", rationale: "Best case for some algorithms and a worst case for others (e.g. a bad pivot or no swaps)." },
  "reverse-sorted": { label: "Reverse sorted", rationale: "Worst case for naive insertion-style logic and for any code that assumes ascending order." },
  "no-answer": { label: "No valid answer", rationale: "Make sure you return the not-found value instead of leaving a variable unset." },
  boundary: { label: "Answer at the ends", rationale: "The answer uses the first or last element: classic off-by-one territory." },
  reuse: { label: "Same element twice", rationale: "A value may match itself; check that you don't pair an element with itself." },
  large: { label: "Large input", rationale: "A bigger input exposes O(n^2) solutions and deep recursion that small examples hide." },
  "case-mix": { label: "Mixed case and symbols", rationale: "Letters of both cases, digits and punctuation: normalisation mistakes show up here." },
  "single-char": { label: "Single character", rationale: "The shortest non-empty string: palindrome centres and window edges collapse." },
  "null-input": { label: "Empty tree or list", rationale: "A null head or root: dereferencing it without a check throws." },
  cycle: { label: "Cycle", rationale: "A structure that loops back on itself: naive traversal never terminates." },
  skewed: { label: "Skewed tree", rationale: "A tree that is really a linked list: it turns a balanced O(log n) assumption into O(n) depth." },
  "min-size": { label: "Smallest valid input", rationale: "The minimum size the constraints allow: loops that run n-1 times may run zero times." },
  order: { label: "Result order", rationale: "Several orderings of the same answer may be valid; check you're not depending on one." },
} as const;

export type EdgeId = keyof typeof EDGE_CASES;
export const EDGE_IDS = Object.keys(EDGE_CASES) as EdgeId[];

export function isEdgeId(value: string): value is EdgeId {
  return Object.prototype.hasOwnProperty.call(EDGE_CASES, value);
}

export interface EdgeInfo {
  id: EdgeId;
  label: string;
  /** The case's own note if it has one, else the generic reason for this kind of edge. */
  rationale: string;
}

export function edgeInfo(id: EdgeId, note?: string): EdgeInfo {
  return { id, label: EDGE_CASES[id].label, rationale: note?.trim() || EDGE_CASES[id].rationale };
}
