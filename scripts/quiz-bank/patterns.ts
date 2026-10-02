/** One-line facts per DSA pattern; the generator turns them into recognition questions. */
export interface PatternFacts {
  signal: string;
  time: string;
  structure: string;
}

export const PATTERN_FACTS: Record<string, PatternFacts> = {
  "Arrays & Hashing": { signal: "You need O(1) lookups of values or counts you've already seen", time: "O(n) with a single pass and a hash map", structure: "Map / Set" },
  "Two Pointers": { signal: "Sorted input, or finding pairs/triplets by moving inwards from both ends", time: "O(n) after an O(n log n) sort", structure: "Two indices into one array" },
  "Sliding Window": { signal: "Longest/shortest contiguous subarray or substring meeting a condition", time: "O(n): each index enters and leaves the window once", structure: "Left/right indices plus a Map of window counts" },
  "Stack & Monotonic Stack": { signal: "Next greater/smaller element, or matching brackets", time: "O(n): each element is pushed and popped at most once", structure: "An array used as a stack (push/pop)" },
  "Binary Search": { signal: "Sorted input, or a monotonic yes/no answer space to search", time: "O(log n)", structure: "lo/hi bounds over a sorted range" },
  "Linked List": { signal: "Reverse, merge or detect a cycle using O(1) extra space", time: "O(n) time and O(1) space", structure: "Node objects with next pointers, often fast/slow" },
  Trees: { signal: "Hierarchical data where the answer combines results from subtrees", time: "O(n): visit each node once", structure: "Recursion (DFS) or a queue (BFS)" },
  Tries: { signal: "Many prefix queries over a dictionary of words", time: "O(L) per insert or lookup for a word of length L", structure: "Nested Maps/objects keyed by character" },
  "Heap / Priority Queue": { signal: "Repeatedly take the k largest/smallest, or merge sorted streams", time: "O(n log k)", structure: "A binary heap (hand-written in JS)" },
  Intervals: { signal: "Overlapping ranges: merge, insert, meeting rooms", time: "O(n log n), dominated by the sort", structure: "An array of [start, end] pairs sorted by start" },
  Greedy: { signal: "A locally best choice can be proven safe at every step", time: "Usually O(n), or O(n log n) with a sort", structure: "A running best value, often after sorting" },
  Backtracking: { signal: "Generate all subsets, permutations or combinations", time: "Exponential, e.g. O(2^n) or O(n!)", structure: "Recursion with a path array: choose, explore, un-choose" },
  "Graphs (BFS/DFS)": { signal: "Grid or network connectivity, islands, shortest path without weights", time: "O(V + E)", structure: "An adjacency list (Map of arrays) plus a visited Set" },
  "Advanced Graphs": { signal: "Weighted shortest paths, minimum spanning trees or dependency ordering", time: "O(E log V) with a heap (Dijkstra/Prim)", structure: "A priority queue plus an adjacency list" },
  "1-D Dynamic Programming": { signal: "The best answer for i builds on answers for smaller prefixes (stairs, house robber)", time: "O(n) time, often O(1) space with rolling variables", structure: "A 1-D array or two rolling variables" },
  "2-D Dynamic Programming": { signal: "Two sequences or a grid: LCS, edit distance, unique paths", time: "O(m·n)", structure: "A 2-D table (array of arrays)" },
  "Bit Manipulation": { signal: "XOR tricks, counting set bits, or subsets as bitmasks", time: "O(1) per bit operation, O(n) overall", structure: "Integers with &, |, ^, << and >>>" },
  "Math & Geometry": { signal: "Matrix rotation, spiral traversal or number properties", time: "O(n·m) for matrix walks", structure: "Index arithmetic on 2-D arrays" },
  "Design (Coding)": { signal: "Implement a structure with a target cost per operation (LRU cache, iterator)", time: "O(1) per operation is the usual target", structure: "A Map combined with a doubly linked list" },
  "Segment Tree / BIT / Union-Find": { signal: "Range queries with point updates, or merging connected components", time: "O(log n) per query, near O(1) amortised for union-find", structure: "Arrays storing tree nodes or parent pointers" },
};

/** Patterns whose problems don't make good "which pattern?" questions. */
export const NO_RECOGNITION = new Set(["JavaScript (30 Days of JS)", "SQL (Backend must-know)"]);
