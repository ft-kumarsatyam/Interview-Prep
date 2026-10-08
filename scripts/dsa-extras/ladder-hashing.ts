import { define, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const NUMS: Array<[string, string]> = [["nums", "number[]"]];

const countDistinct: ProblemDef = {
  slug: "count-distinct-elements",
  title: "Count Distinct Elements",
  difficulty: "Easy",
  pattern: "Set",
  statement: "Given an integer array `nums`, return how many **different** values it contains.",
  constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  fn: "countDistinct",
  params: NUMS,
  returns: "number",
  hints: [
    "Comparing every pair is O(n^2). What structure answers 'have I seen this value before?' in O(1)?",
    "Put every value into a Set; duplicates collapse automatically. The Set's size is the answer.",
    "seen = empty set\nfor each value in nums:\n  add value to seen\nreturn size of seen",
  ],
  reference: `function countDistinct(nums) { return new Set(nums).size; }`,
  brute: `function countDistinct(nums) { let c = 0; for (let i = 0; i < nums.length; i++) { let first = true; for (let j = 0; j < i; j++) if (nums[j] === nums[i]) { first = false; break; } if (first) c++; } return c; }`,
  fuzz: arrayGen(0, 16, -4, 4),
  examples: [[[1, 2, 2, 3, 3, 3]], [[5, -5, 5]]],
  edges: [
    ["empty", [[]]],
    ["all-equal", [[7, 7, 7, 7]], "Everything is the same value: 1 distinct."],
    ["zeros", [[0, 0, 1]], "0 is a value like any other; truthiness checks skip it."],
  ],
};

const mostFrequent: ProblemDef = {
  slug: "most-frequent-element",
  title: "Most Frequent Element",
  difficulty: "Easy",
  pattern: "HashMap",
  statement: "Given a non-empty integer array `nums`, return the value that appears most often. If several values share the highest count, return the **smallest** of them.",
  constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  fn: "mostFrequent",
  params: NUMS,
  returns: "number",
  hints: [
    "First learn how often every value appears. Then the question is a simple 'best so far' scan.",
    "Build a value -> count map. Walk its entries and keep the value with the larger count, breaking ties by the smaller value.",
    "count = empty map\nfor each v in nums: count[v] += 1\nbest = none\nfor each (v, c) in count:\n  if best is none or c > count[best] or (c == count[best] and v < best):\n    best = v\nreturn best",
  ],
  reference: `function mostFrequent(nums) { const c = new Map(); for (const v of nums) c.set(v, (c.get(v) || 0) + 1); let best = null; for (const [v, n] of c) if (best === null || n > c.get(best) || (n === c.get(best) && v < best)) best = v; return best; }`,
  brute: `function mostFrequent(nums) { const s = nums.slice().sort((a, b) => a - b); let best = s[0], bc = 0; for (const v of s) { const n = s.filter((x) => x === v).length; if (n > bc) { bc = n; best = v; } } return best; }`,
  fuzz: arrayGen(1, 16, -3, 3),
  examples: [[[1, 3, 3, 2, 3]], [[4, 4, 1, 1]]],
  edges: [
    ["single", [[9]]],
    ["negatives", [[-2, -2, 5, 5]], "Tie between -2 and 5: the smaller value wins."],
    ["all-equal", [[6, 6, 6]]],
  ],
};

const equalArrays: ProblemDef = {
  slug: "check-equal-arrays",
  title: "Check if Two Arrays Hold the Same Values",
  difficulty: "Easy",
  pattern: "HashMap",
  statement: "Given two integer arrays `a` and `b`, return `true` if they contain exactly the same values with the same counts (in any order), otherwise `false`.",
  constraints: ["0 <= a.length, b.length <= 10^5", "-10^9 <= a[i], b[i] <= 10^9"],
  fn: "sameValues",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "boolean",
  hints: [
    "Order doesn't matter, but counts do. What could you compare instead of the arrays themselves?",
    "Count a into a map, then subtract every value of b. The arrays match when the lengths are equal and no count goes below zero.",
    "if len(a) != len(b): return false\ncount = counts of a\nfor each v in b:\n  if count[v] is 0 or missing: return false\n  count[v] -= 1\nreturn true",
  ],
  reference: `function sameValues(a, b) { if (a.length !== b.length) return false; const c = new Map(); for (const v of a) c.set(v, (c.get(v) || 0) + 1); for (const v of b) { if (!c.get(v)) return false; c.set(v, c.get(v) - 1); } return true; }`,
  brute: `function sameValues(a, b) { const x = a.slice().sort((p, q) => p - q), y = b.slice().sort((p, q) => p - q); return x.length === y.length && x.every((v, i) => v === y[i]); }`,
  fuzz: gen(`const a = __arr(rand, __r(rand, 0, 7), 0, 3); const b = rand() < 0.5 ? __shuffle(rand, a.slice()) : __arr(rand, __r(rand, 0, 7), 0, 3); return [a, b];`),
  examples: [[[1, 2, 3], [3, 1, 2]], [[1, 1, 2], [1, 2, 2]]],
  edges: [
    ["empty", [[], []]],
    ["duplicates", [[2, 2, 3], [2, 3, 3]], "Same set of values, different counts: false."],
    ["no-answer", [[1, 2], [1, 2, 2]], "Different lengths never match."],
  ],
};

const countPairs: ProblemDef = {
  slug: "count-pairs-with-given-sum",
  title: "Count Pairs with Given Sum",
  difficulty: "Easy",
  pattern: "HashMap",
  statement: "Given an integer array `nums` and an integer `k`, return the number of index pairs `(i, j)` with `i < j` and `nums[i] + nums[j] == k`.",
  constraints: ["0 <= nums.length <= 10^5", "-10^4 <= nums[i], k <= 10^4"],
  fn: "countPairs",
  params: [["nums", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "For each element, the partner it needs is k - nums[j]. How many such partners appeared before it?",
    "Scan left to right with a count map of values seen so far. For each value add count[k - value] to the answer, then record the value itself.",
    "seen = empty map\npairs = 0\nfor each v in nums:\n  pairs += seen[k - v] (0 if missing)\n  seen[v] += 1\nreturn pairs",
  ],
  reference: `function countPairs(nums, k) { const s = new Map(); let p = 0; for (const v of nums) { p += s.get(k - v) || 0; s.set(v, (s.get(v) || 0) + 1); } return p; }`,
  brute: `function countPairs(nums, k) { let p = 0; for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === k) p++; return p; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 14), -3, 3), __r(rand, -4, 4)];`),
  examples: [[[1, 5, 7, -1], 6], [[1, 1, 1, 1], 2]],
  edges: [
    ["empty", [[], 3]],
    ["reuse", [[3], 6], "One element can't pair with itself."],
    ["zeros", [[0, 0, 0], 0], "Three zeros make three pairs."],
  ],
};

export const LADDER_HASHING = [countDistinct, mostFrequent, equalArrays, countPairs].map(define);
