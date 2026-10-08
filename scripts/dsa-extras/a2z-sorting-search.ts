import { define, tuf, variant, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const NUMS: Array<[string, string]> = [["nums", "number[]"]];
const SORTED_X: Array<[string, string]> = [["nums", "number[]"], ["x", "number"]];
const SORTED_GEN = gen(`const a = __sorted(rand, __r(rand, 0, 12), -10, 10); return [a, __r(rand, -12, 12)];`);

// ---- Sorting: one judge, one statement per algorithm ----

const SORT_BRUTE = `function sortArray(nums) { return nums.slice().sort((a, b) => a - b); }`;

const selectionSort: ProblemDef = {
  slug: "selection-sort",
  title: "Selection Sort",
  difficulty: "Easy",
  pattern: "Sorting Algorithms",
  url: tuf("selection-sort"),
  statement: "Given an integer array `nums`, sort it in non-decreasing order with **selection sort** and return it.\n\nSelection sort repeatedly finds the minimum of the unsorted part and swaps it to the front of that part. Don't call the built-in `sort`.",
  constraints: ["0 <= nums.length <= 1000", "-10^5 <= nums[i] <= 10^5"],
  fn: "sortArray",
  params: NUMS,
  returns: "number[]",
  hints: [
    "After pass i, the first i + 1 positions hold the i + 1 smallest values in order. Which value belongs at position i?",
    "For each i, scan i..n-1 for the index of the minimum and swap it with position i.",
    "for i from 0 to n - 2:\n  m = i\n  for j from i + 1 to n - 1:\n    if nums[j] < nums[m]: m = j\n  swap nums[i] and nums[m]\nreturn nums",
  ],
  reference: `function sortArray(nums) { const a = nums; for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j; [a[i], a[m]] = [a[m], a[i]]; } return a; }`,
  brute: SORT_BRUTE,
  fuzz: arrayGen(0, 25, -50, 50),
  examples: [[[13, 46, 24, 52, 20, 9]], [[5, 4, 3, 2, 1]]],
  edges: [
    ["empty", [[]]],
    ["duplicates", [[3, 1, 3, 1, 2]]],
    ["sorted", [[1, 2, 3, 4]], "Already sorted input must stay sorted."],
    ["negatives", [[-1, -5, 0, 3]]],
  ],
};

const sortVariant = (slug: string, title: string, statement: string, hints: [string, string, string], reference: string) =>
  variant(selectionSort, { slug, title, url: tuf(slug), statement, hints, reference });

const bubbleSort = sortVariant(
  "bubble-sort",
  "Bubble Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **bubble sort** and return it.\n\nBubble sort repeatedly swaps adjacent elements that are out of order, so the largest remaining value bubbles to the end on each pass. Stop early when a pass makes no swap.",
  [
    "After one pass of adjacent swaps, where does the largest value end up?",
    "Run passes over a shrinking prefix; swap a[j] and a[j + 1] when a[j] > a[j + 1]. If a pass makes no swap, the array is sorted.",
    "for end from n - 1 down to 1:\n  swapped = false\n  for j from 0 to end - 1:\n    if nums[j] > nums[j + 1]:\n      swap them; swapped = true\n  if not swapped: stop\nreturn nums",
  ],
  `function sortArray(nums) { const a = nums; for (let e = a.length - 1; e > 0; e--) { let s = false; for (let j = 0; j < e; j++) if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; s = true; } if (!s) break; } return a; }`,
);

const insertionSort = sortVariant(
  "insertion-sorting",
  "Insertion Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **insertion sort** and return it.\n\nInsertion sort grows a sorted prefix: each new element is shifted left until it sits after a value that isn't larger.",
  [
    "Think of sorting a hand of cards: take the next card and slide it into place among the cards already sorted.",
    "For i from 1, save key = a[i], shift larger elements of the prefix one step right, then drop key into the gap.",
    "for i from 1 to n - 1:\n  key = nums[i]\n  j = i - 1\n  while j >= 0 and nums[j] > key:\n    nums[j + 1] = nums[j]\n    j -= 1\n  nums[j + 1] = key\nreturn nums",
  ],
  `function sortArray(nums) { const a = nums; for (let i = 1; i < a.length; i++) { const k = a[i]; let j = i - 1; while (j >= 0 && a[j] > k) { a[j + 1] = a[j]; j--; } a[j + 1] = k; } return a; }`,
);

const mergeSort = sortVariant(
  "merge-sorting",
  "Merge Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **merge sort** and return it.\n\nMerge sort splits the array in half, sorts each half recursively and merges the two sorted halves.",
  [
    "Merging two sorted arrays is easy with two pointers. How can you get two sorted halves?",
    "Recursively sort the left and right halves (a single element is already sorted), then merge them by repeatedly taking the smaller front element.",
    "mergeSort(a):\n  if length <= 1: return a\n  left = mergeSort(first half), right = mergeSort(second half)\n  merged = empty; i = 0; j = 0\n  while i < len(left) and j < len(right):\n    take the smaller of left[i], right[j] and advance it\n  append what remains of left and right\n  return merged",
  ],
  `function sortArray(nums) { if (nums.length <= 1) return nums; const m = nums.length >> 1; const l = sortArray(nums.slice(0, m)), r = sortArray(nums.slice(m)); const out = []; let i = 0, j = 0; while (i < l.length && j < r.length) out.push(l[i] <= r[j] ? l[i++] : r[j++]); return out.concat(l.slice(i), r.slice(j)); }`,
);

const quickSort = sortVariant(
  "quick-sorting",
  "Quick Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **quick sort** and return it.\n\nQuick sort picks a pivot, partitions the array so smaller values come before it and larger ones after, then sorts both sides recursively.",
  [
    "After partitioning around a pivot, the pivot is in its final position. What's left to do?",
    "Use Lomuto partitioning: pick the last element as the pivot, move everything smaller to the front, put the pivot after them, then recurse on both sides.",
    "quickSort(lo, hi):\n  if lo >= hi: return\n  pivot = nums[hi]; p = lo\n  for j from lo to hi - 1:\n    if nums[j] < pivot: swap nums[p], nums[j]; p += 1\n  swap nums[p], nums[hi]\n  quickSort(lo, p - 1); quickSort(p + 1, hi)",
  ],
  `function sortArray(nums) { const a = nums; const qs = (lo, hi) => { if (lo >= hi) return; const pv = a[hi]; let p = lo; for (let j = lo; j < hi; j++) if (a[j] < pv) { [a[p], a[j]] = [a[j], a[p]]; p++; } [a[p], a[hi]] = [a[hi], a[p]]; qs(lo, p - 1); qs(p + 1, hi); }; qs(0, a.length - 1); return a; }`,
);

const recursiveBubble = sortVariant(
  "recursive-bubble-sort",
  "Recursive Bubble Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **bubble sort written recursively** and return it: one pass of adjacent swaps moves the largest value to the end, then the function calls itself on the first `n - 1` elements.",
  [
    "One bubble pass fixes the last position. What smaller problem remains?",
    "Write bubble(n): if n <= 1 stop; do one pass over 0..n-2 swapping out-of-order neighbours; then call bubble(n - 1).",
    "bubble(n):\n  if n <= 1: return\n  for j from 0 to n - 2:\n    if nums[j] > nums[j + 1]: swap them\n  bubble(n - 1)\nbubble(length of nums)\nreturn nums",
  ],
  `function sortArray(nums) { const a = nums; const b = (n) => { if (n <= 1) return; for (let j = 0; j < n - 1; j++) if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]]; b(n - 1); }; b(a.length); return a; }`,
);

const recursiveInsertion = sortVariant(
  "recursive-insertion-sort",
  "Recursive Insertion Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **insertion sort written recursively** and return it: sort the first `n - 1` elements recursively, then insert the last element into place.",
  [
    "If the first n - 1 elements are already sorted, how do you place the n-th?",
    "insertion(n): if n <= 1 stop; call insertion(n - 1); then shift the last element left past every larger value.",
    "insertion(n):\n  if n <= 1: return\n  insertion(n - 1)\n  key = nums[n - 1]; j = n - 2\n  while j >= 0 and nums[j] > key:\n    nums[j + 1] = nums[j]; j -= 1\n  nums[j + 1] = key\ninsertion(length of nums)\nreturn nums",
  ],
  `function sortArray(nums) { const a = nums; const ins = (n) => { if (n <= 1) return; ins(n - 1); const k = a[n - 1]; let j = n - 2; while (j >= 0 && a[j] > k) { a[j + 1] = a[j]; j--; } a[j + 1] = k; }; ins(a.length); return a; }`,
);

export const heapSort = sortVariant(
  "heap-sort",
  "Heap Sort",
  "Given an integer array `nums`, sort it in non-decreasing order with **heap sort** and return it: build a max heap in the array, then repeatedly swap the root (the maximum) to the end and sift the new root down within the shrinking heap.",
  [
    "A max heap keeps the largest value at index 0. How can you use that to fill the array from the back?",
    "Heapify the array bottom-up (sift down every index from n/2 - 1 to 0). Then for end from n - 1 down to 1: swap a[0] with a[end] and sift a[0] down within the first end elements.",
    "siftDown(i, size): while child exists: pick the larger child c; if a[c] <= a[i] stop; swap a[i], a[c]; i = c\nfor i from n / 2 - 1 down to 0: siftDown(i, n)\nfor end from n - 1 down to 1:\n  swap a[0], a[end]\n  siftDown(0, end)\nreturn a",
  ],
  `function sortArray(nums) { const a = nums, n = a.length; const sift = (i, size) => { for (;;) { let c = 2 * i + 1; if (c >= size) return; if (c + 1 < size && a[c + 1] > a[c]) c++; if (a[c] <= a[i]) return; [a[i], a[c]] = [a[c], a[i]]; i = c; } }; for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n); for (let e = n - 1; e > 0; e--) { [a[0], a[e]] = [a[e], a[0]]; sift(0, e); } return a; }`,
);

// ---- Arrays ----

const twoSorted = gen(`return [__sorted(rand, __r(rand, 0, 10), 1, 12), __sorted(rand, __r(rand, 0, 10), 1, 12)];`);

const unionSorted: ProblemDef = {
  slug: "union-of-two-sorted-arrays",
  title: "Union of Two Sorted Arrays",
  difficulty: "Easy",
  pattern: "Two Pointers",
  url: tuf("union-of-two-sorted-arrays"),
  statement: "Given two sorted integer arrays `a` and `b` (they may contain duplicates), return their **union**: every distinct value that appears in either array, in increasing order.",
  constraints: ["0 <= a.length, b.length <= 10^4", "-10^9 <= a[i], b[i] <= 10^9"],
  fn: "unionArray",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "number[]",
  hints: [
    "Both arrays are sorted, like two queues of numbers. Which one should give up its front value next?",
    "Walk both with two pointers, always taking the smaller front value and appending it only if it differs from the last value you appended. Then drain whichever array is left.",
    "i = 0, j = 0, out = []\nwhile i < len(a) or j < len(b):\n  take v = smaller of a[i], b[j] (whichever exists) and advance that pointer\n  if out is empty or last of out != v: append v\nreturn out",
  ],
  reference: `function unionArray(a, b) { const out = []; let i = 0, j = 0; while (i < a.length || j < b.length) { let v; if (j >= b.length || (i < a.length && a[i] <= b[j])) v = a[i++]; else v = b[j++]; if (!out.length || out[out.length - 1] !== v) out.push(v); } return out; }`,
  brute: `function unionArray(a, b) { return [...new Set(a.concat(b))].sort((x, y) => x - y); }`,
  fuzz: twoSorted,
  examples: [[[1, 2, 3, 4, 5], [2, 3, 4, 4, 5]], [[1, 1, 2], [3, 3]]],
  edges: [
    ["empty", [[], [1, 2]]],
    ["duplicates", [[2, 2, 2], [2, 2]], "Duplicates inside one array must collapse too."],
    ["no-answer", [[], []]],
  ],
};

const intersectionSorted: ProblemDef = {
  slug: "intersection-of-two-sorted-arrays",
  title: "Intersection of Two Sorted Arrays",
  difficulty: "Easy",
  pattern: "Two Pointers",
  url: tuf("intersection-of-two-sorted-arrays"),
  statement: "Given two sorted integer arrays `a` and `b`, return their **intersection** in increasing order. A value that appears `p` times in `a` and `q` times in `b` appears `min(p, q)` times in the answer.",
  constraints: ["0 <= a.length, b.length <= 10^4", "-10^9 <= a[i], b[i] <= 10^9"],
  fn: "intersectionArray",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "number[]",
  hints: [
    "With both arrays sorted, a mismatch tells you which side is behind.",
    "Two pointers: if a[i] < b[j] move i, if a[i] > b[j] move j, and if they're equal append the value and move both.",
    "i = 0, j = 0, out = []\nwhile i < len(a) and j < len(b):\n  if a[i] < b[j]: i += 1\n  else if a[i] > b[j]: j += 1\n  else: append a[i]; i += 1; j += 1\nreturn out",
  ],
  reference: `function intersectionArray(a, b) { const out = []; let i = 0, j = 0; while (i < a.length && j < b.length) { if (a[i] < b[j]) i++; else if (a[i] > b[j]) j++; else { out.push(a[i]); i++; j++; } } return out; }`,
  brute: `function intersectionArray(a, b) { const left = b.slice(); const out = []; for (const x of a) { const k = left.indexOf(x); if (k >= 0) { out.push(x); left.splice(k, 1); } } return out.sort((x, y) => x - y); }`,
  fuzz: twoSorted,
  examples: [[[1, 2, 2, 3, 3, 4], [2, 2, 3, 5]], [[1, 2, 3], [4, 5]]],
  edges: [
    ["empty", [[], [1]]],
    ["duplicates", [[1, 1, 1], [1, 1]], "Keep the smaller count of a repeated value."],
    ["all-equal", [[4, 4], [4, 4]]],
  ],
};

const leaders: ProblemDef = {
  slug: "leaders-in-an-array",
  title: "Leaders in an Array",
  difficulty: "Easy",
  pattern: "Reverse Traversal",
  url: tuf("leaders-in-an-array"),
  statement: "An element is a **leader** if it is strictly greater than every element to its right. The last element is always a leader.\n\nGiven an integer array `nums`, return all leaders in the order they appear in `nums`.",
  constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  fn: "leaders",
  params: NUMS,
  returns: "number[]",
  hints: [
    "Checking every element against everything to its right is O(n^2). Which direction makes the check O(1)?",
    "Scan from the right while tracking the maximum seen so far. An element greater than that maximum is a leader. Reverse the collected leaders at the end.",
    "best = minus infinity, out = []\nfor i from n - 1 down to 0:\n  if nums[i] > best:\n    append nums[i]; best = nums[i]\nreturn out reversed",
  ],
  reference: `function leaders(nums) { const out = []; let best = -Infinity; for (let i = nums.length - 1; i >= 0; i--) if (nums[i] > best) { out.push(nums[i]); best = nums[i]; } return out.reverse(); }`,
  brute: `function leaders(nums) { return nums.filter((x, i) => nums.slice(i + 1).every((y) => x > y)); }`,
  fuzz: arrayGen(1, 15, -10, 10),
  examples: [[[10, 22, 12, 3, 0, 6]], [[1, 2, 3]]],
  edges: [
    ["single", [[5]]],
    ["all-equal", [[4, 4, 4]], "Strictly greater: only the last of equal values is a leader."],
    ["reverse-sorted", [[9, 7, 5, 1]]],
  ],
};

const repeatMissing: ProblemDef = {
  slug: "find-the-repeating-and-missing-number",
  title: "Find the Repeating and Missing Number",
  difficulty: "Medium",
  pattern: "Math",
  url: tuf("find-the-repeating-and-missing-number"),
  statement: "You're given an array `nums` of size `n` holding values from `1` to `n`. Exactly one value appears twice and exactly one value is missing.\n\nReturn `[repeating, missing]`.",
  constraints: ["2 <= n <= 10^5"],
  fn: "findMissingRepeatingNumbers",
  params: NUMS,
  returns: "number[]",
  hints: [
    "Compare the array with 1..n. Which two equations relate the repeating value r and the missing value m?",
    "sum(nums) - n(n+1)/2 = r - m, and sumOfSquares(nums) - sum of squares 1..n = r^2 - m^2 = (r - m)(r + m). Solve for r and m. (A count array works too.)",
    "s = sum(nums) - n(n + 1) / 2\nq = sum of squares of nums - n(n + 1)(2n + 1) / 6\nplus = q / s\nr = (s + plus) / 2\nm = r - s\nreturn [r, m]",
  ],
  reference: `function findMissingRepeatingNumbers(nums) { const n = nums.length; let s = -n * (n + 1) / 2, q = -n * (n + 1) * (2 * n + 1) / 6; for (const x of nums) { s += x; q += x * x; } const p = q / s; const r = (s + p) / 2; return [r, r - s]; }`,
  brute: `function findMissingRepeatingNumbers(nums) { const c = new Array(nums.length + 1).fill(0); for (const x of nums) c[x]++; return [c.indexOf(2), c.indexOf(0, 1)]; }`,
  fuzz: gen(`const n = __r(rand, 2, 15); const a = Array.from({ length: n }, function (_, i) { return i + 1; }); const m = __r(rand, 0, n - 1); let r = __r(rand, 0, n - 1); while (r === m) r = __r(rand, 0, n - 1); a[m] = a[r]; return [__shuffle(rand, a)];`),
  examples: [[[3, 1, 2, 5, 3]], [[1, 2, 2]]],
  edges: [
    ["two", [[2, 2]]],
    ["boundary", [[1, 1, 3, 4]], "The smallest value repeats."],
    ["order", [[4, 3, 6, 2, 1, 1]]],
  ],
};

const inversions: ProblemDef = {
  slug: "count-inversions",
  title: "Count Inversions",
  difficulty: "Hard",
  pattern: "Merge Sort",
  url: tuf("count-inversions"),
  statement: "Given an integer array `nums`, return the number of **inversions**: pairs of indexes `(i, j)` with `i < j` and `nums[i] > nums[j]`.",
  constraints: ["1 <= nums.length <= 10^5", "1 <= nums[i] <= 10^9"],
  fn: "countInversions",
  params: NUMS,
  returns: "number",
  hints: [
    "Checking every pair is O(n^2). While merging two sorted halves, can you count many inversions at once?",
    "During merge sort's merge step, when right[j] is taken before left[i], it forms an inversion with every remaining element of left: add len(left) - i.",
    "sortCount(a):\n  if length <= 1: return 0\n  count = sortCount(left half) + sortCount(right half)\n  merge: when right[j] < left[i]:\n    count += len(left) - i; take right[j]\n  otherwise take left[i]\n  return count",
  ],
  reference: `function countInversions(nums) { const a = nums.slice(); const go = (lo, hi) => { if (hi - lo <= 1) return 0; const m = (lo + hi) >> 1; let c = go(lo, m) + go(m, hi); const t = []; let i = lo, j = m; while (i < m && j < hi) { if (a[j] < a[i]) { c += m - i; t.push(a[j++]); } else t.push(a[i++]); } while (i < m) t.push(a[i++]); while (j < hi) t.push(a[j++]); for (let k = 0; k < t.length; k++) a[lo + k] = t[k]; return c; }; return go(0, a.length); }`,
  brute: `function countInversions(nums) { let c = 0; for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] > nums[j]) c++; return c; }`,
  fuzz: arrayGen(1, 20, 1, 10),
  examples: [[[2, 4, 1, 3, 5]], [[5, 4, 3, 2, 1]]],
  edges: [
    ["sorted", [[1, 2, 3, 4]], "Sorted: no inversions."],
    ["all-equal", [[3, 3, 3]], "Equal values aren't inversions."],
    ["single", [[7]]],
  ],
};

// ---- Hashing ----

const longestSumK: ProblemDef = {
  slug: "longest-subarray-with-sum-k",
  title: "Longest Subarray with Sum K",
  difficulty: "Medium",
  pattern: "Prefix Sum",
  url: tuf("longest-subarray-with-sum-k"),
  statement: "Given an integer array `nums` (values may be negative) and an integer `k`, return the length of the longest contiguous subarray whose sum is exactly `k`, or `0` if there is none.",
  constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "-10^9 <= k <= 10^9"],
  fn: "longestSubarray",
  params: [["nums", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "The sum of nums[i+1..j] is prefix[j] - prefix[i]. What prefix sum would you need to have seen earlier?",
    "Store the first index where each prefix sum occurs (with prefix 0 at index -1). At index j, if prefix - k has been seen at index i, the subarray i+1..j sums to k. Keep only the first occurrence so lengths are maximal.",
    "first = map with 0 -> -1\nprefix = 0, best = 0\nfor j from 0 to n - 1:\n  prefix += nums[j]\n  if prefix - k in first: best = max(best, j - first[prefix - k])\n  if prefix not in first: first[prefix] = j\nreturn best",
  ],
  reference: `function longestSubarray(nums, k) { const f = new Map([[0, -1]]); let p = 0, best = 0; for (let j = 0; j < nums.length; j++) { p += nums[j]; if (f.has(p - k)) best = Math.max(best, j - f.get(p - k)); if (!f.has(p)) f.set(p, j); } return best; }`,
  brute: `function longestSubarray(nums, k) { let best = 0; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) best = Math.max(best, j - i + 1); } } return best; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 14), -4, 6), __r(rand, -5, 10)];`),
  examples: [[[10, 5, 2, 7, 1, 9], 15], [[-1, 1, 1], 1]],
  edges: [
    ["no-answer", [[1, 2, 3], 100]],
    ["zeros", [[0, 0, 0], 0], "Zeros extend a subarray without changing its sum."],
    ["negatives", [[2, -2, 2, -2, 2], 2]],
  ],
};

const largestZero: ProblemDef = {
  slug: "largest-subarray-with-sum-0",
  title: "Largest Subarray with Sum 0",
  difficulty: "Medium",
  pattern: "Prefix Sum",
  url: tuf("largest-subarray-with-sum-0"),
  statement: "Given an integer array `nums`, return the length of the longest contiguous subarray whose elements sum to `0`, or `0` if there is none.",
  constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  fn: "maxLen",
  params: NUMS,
  returns: "number",
  hints: [
    "If two prefix sums are equal, what can you say about the elements between them?",
    "Record the first index of every prefix sum (prefix 0 at index -1). When a prefix sum repeats at j, the subarray after its first index sums to 0.",
    "first = map with 0 -> -1\nprefix = 0, best = 0\nfor j from 0 to n - 1:\n  prefix += nums[j]\n  if prefix in first: best = max(best, j - first[prefix])\n  else: first[prefix] = j\nreturn best",
  ],
  reference: `function maxLen(nums) { const f = new Map([[0, -1]]); let p = 0, best = 0; for (let j = 0; j < nums.length; j++) { p += nums[j]; if (f.has(p)) best = Math.max(best, j - f.get(p)); else f.set(p, j); } return best; }`,
  brute: `function maxLen(nums) { let best = 0; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === 0) best = Math.max(best, j - i + 1); } } return best; }`,
  fuzz: arrayGen(1, 14, -4, 4),
  examples: [[[15, -2, 2, -8, 1, 7, 10, 23]], [[1, 2, 3]]],
  edges: [
    ["zeros", [[0]]],
    ["no-answer", [[5, 6]]],
    ["boundary", [[3, -3, 1, -1]], "The whole array sums to 0."],
  ],
};

const xorK: ProblemDef = {
  slug: "count-subarrays-with-given-xor-k",
  title: "Count Subarrays with XOR K",
  difficulty: "Medium",
  pattern: "Prefix Sum",
  url: tuf("count-subarrays-with-given-xor-k"),
  statement: "Given an integer array `nums` and an integer `k`, return the number of contiguous subarrays whose bitwise XOR equals `k`.",
  constraints: ["1 <= nums.length <= 10^5", "0 <= nums[i], k <= 10^9"],
  fn: "subarraysWithXorK",
  params: [["nums", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "XOR has its own prefix trick: xor(i+1..j) = px[j] ^ px[i]. What earlier prefix value makes the subarray equal k?",
    "Keep a count of every prefix XOR seen (starting with 0 once). At each j, add the count of px ^ k, then record px.",
    "count = map with 0 -> 1\npx = 0, total = 0\nfor x in nums:\n  px = px xor x\n  total += count[px xor k] (0 if absent)\n  count[px] += 1\nreturn total",
  ],
  reference: `function subarraysWithXorK(nums, k) { const c = new Map([[0, 1]]); let px = 0, t = 0; for (const x of nums) { px ^= x; t += c.get(px ^ k) || 0; c.set(px, (c.get(px) || 0) + 1); } return t; }`,
  brute: `function subarraysWithXorK(nums, k) { let t = 0; for (let i = 0; i < nums.length; i++) { let x = 0; for (let j = i; j < nums.length; j++) { x ^= nums[j]; if (x === k) t++; } } return t; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 14), 0, 7), __r(rand, 0, 7)];`),
  examples: [[[4, 2, 2, 6, 4], 6], [[5, 6, 7, 8, 9], 5]],
  edges: [
    ["zeros", [[0, 0, 0], 0], "Every subarray of zeros has XOR 0: 6 of them."],
    ["single", [[3], 3]],
    ["no-answer", [[1, 1], 5]],
  ],
};

// ---- Binary search ----

const lowerBound: ProblemDef = {
  slug: "lower-bound",
  title: "Lower Bound",
  difficulty: "Easy",
  pattern: "Binary Search",
  url: tuf("lower-bound-"),
  statement: "Given a sorted array `nums` and a value `x`, return the **lower bound** of `x`: the smallest index `i` with `nums[i] >= x`. If every element is smaller than `x`, return `nums.length`.",
  constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i], x <= 10^9", "nums is sorted in non-decreasing order"],
  fn: "lowerBound",
  params: SORTED_X,
  returns: "number",
  hints: [
    "The condition nums[i] >= x is false for a prefix of the array and true for the rest. You want the first true.",
    "Binary search with answer = n. When nums[mid] >= x, record mid and search left; otherwise search right.",
    "lo = 0, hi = n - 1, ans = n\nwhile lo <= hi:\n  mid = (lo + hi) / 2 rounded down\n  if nums[mid] >= x: ans = mid; hi = mid - 1\n  else: lo = mid + 1\nreturn ans",
  ],
  reference: `function lowerBound(nums, x) { let lo = 0, hi = nums.length - 1, ans = nums.length; while (lo <= hi) { const m = (lo + hi) >> 1; if (nums[m] >= x) { ans = m; hi = m - 1; } else lo = m + 1; } return ans; }`,
  brute: `function lowerBound(nums, x) { const i = nums.findIndex((v) => v >= x); return i < 0 ? nums.length : i; }`,
  fuzz: SORTED_GEN,
  examples: [[[1, 2, 2, 3], 2], [[3, 5, 8, 15, 19], 9]],
  edges: [
    ["no-answer", [[1, 2, 3], 10], "Every element is smaller: return n."],
    ["empty", [[], 4]],
    ["duplicates", [[2, 2, 2, 2], 2], "Return the first of the equal values."],
  ],
};

const upperBound: ProblemDef = {
  ...lowerBound,
  slug: "upper-bound",
  title: "Upper Bound",
  url: tuf("upper-bound"),
  statement: "Given a sorted array `nums` and a value `x`, return the **upper bound** of `x`: the smallest index `i` with `nums[i] > x`. If no element is greater than `x`, return `nums.length`.",
  fn: "upperBound",
  hints: [
    "Same shape as lower bound, but the condition is strictly greater.",
    "Binary search with answer = n. When nums[mid] > x, record mid and go left; otherwise go right.",
    "lo = 0, hi = n - 1, ans = n\nwhile lo <= hi:\n  mid = (lo + hi) / 2 rounded down\n  if nums[mid] > x: ans = mid; hi = mid - 1\n  else: lo = mid + 1\nreturn ans",
  ],
  reference: `function upperBound(nums, x) { let lo = 0, hi = nums.length - 1, ans = nums.length; while (lo <= hi) { const m = (lo + hi) >> 1; if (nums[m] > x) { ans = m; hi = m - 1; } else lo = m + 1; } return ans; }`,
  brute: `function upperBound(nums, x) { const i = nums.findIndex((v) => v > x); return i < 0 ? nums.length : i; }`,
  examples: [[[1, 2, 2, 3], 2], [[3, 5, 8, 9, 15, 19], 9]],
  edges: [
    ["duplicates", [[2, 2, 2, 2], 2], "All equal to x: nothing is greater, so return n."],
    ["empty", [[], 4]],
    ["boundary", [[5, 6, 7], 1], "Everything is greater: return 0."],
  ],
};

const floorCeil: ProblemDef = {
  slug: "floor-and-ceil-in-sorted-array",
  title: "Floor and Ceil in a Sorted Array",
  difficulty: "Easy",
  pattern: "Binary Search",
  url: tuf("floor-and-ceil-in-sorted-array"),
  statement: "Given a sorted array `nums` and a value `x`, return `[floor, ceil]`, where the floor is the largest element `<= x` and the ceil is the smallest element `>= x`. Use `-1` for one that doesn't exist.",
  constraints: ["1 <= nums.length <= 10^5", "0 <= nums[i], x <= 10^9"],
  fn: "getFloorAndCeil",
  params: SORTED_X,
  returns: "number[]",
  hints: [
    "These are two binary searches: the last element <= x and the first element >= x.",
    "For the floor, when nums[mid] <= x record it and go right; for the ceil, when nums[mid] >= x record it and go left. Start both answers at -1.",
    "floor = -1; binary search: if nums[mid] <= x: floor = nums[mid]; lo = mid + 1 else hi = mid - 1\nceil = -1; binary search: if nums[mid] >= x: ceil = nums[mid]; hi = mid - 1 else lo = mid + 1\nreturn [floor, ceil]",
  ],
  reference: `function getFloorAndCeil(nums, x) { let lo = 0, hi = nums.length - 1, f = -1, c = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (nums[m] <= x) { f = nums[m]; lo = m + 1; } else hi = m - 1; } lo = 0; hi = nums.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (nums[m] >= x) { c = nums[m]; hi = m - 1; } else lo = m + 1; } return [f, c]; }`,
  brute: `function getFloorAndCeil(nums, x) { const lo = nums.filter((v) => v <= x), hi = nums.filter((v) => v >= x); return [lo.length ? Math.max(...lo) : -1, hi.length ? Math.min(...hi) : -1]; }`,
  fuzz: gen(`return [__sorted(rand, __r(rand, 1, 12), 0, 20), __r(rand, 0, 22)];`),
  examples: [[[3, 4, 4, 7, 8, 10], 5], [[3, 4, 4, 7, 8, 10], 8]],
  edges: [
    ["boundary", [[5, 6, 7], 2], "x is below every element: no floor."],
    ["no-answer", [[5, 6, 7], 9], "x is above every element: no ceil."],
    ["single", [[4], 4]],
  ],
};

const rotationCount: ProblemDef = {
  slug: "find-out-how-many-times-the-array-is-rotated",
  title: "How Many Times Is the Array Rotated",
  difficulty: "Easy",
  pattern: "Binary Search",
  url: tuf("find-out-how-many-times-the-array-is-rotated"),
  statement: "An array of **distinct** integers was sorted in increasing order and then rotated right some number of times. Given the rotated array `nums`, return how many times it was rotated (equivalently, the index of its smallest element).",
  constraints: ["1 <= nums.length <= 10^5", "all values are distinct"],
  fn: "findKRotation",
  params: NUMS,
  returns: "number",
  hints: [
    "The rotation count is the index of the minimum. Can you find the minimum faster than O(n) using the sorted halves?",
    "Binary search: if nums[lo..hi] is already sorted, nums[lo] is the minimum of the range. Otherwise, the minimum lies in the unsorted half: compare nums[mid] with nums[hi].",
    "lo = 0, hi = n - 1\nwhile lo < hi:\n  mid = (lo + hi) / 2 rounded down\n  if nums[mid] > nums[hi]: lo = mid + 1\n  else: hi = mid\nreturn lo",
  ],
  reference: `function findKRotation(nums) { let lo = 0, hi = nums.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; } return lo; }`,
  brute: `function findKRotation(nums) { return nums.indexOf(Math.min(...nums)); }`,
  fuzz: gen(`const s = new Set(); const n = __r(rand, 1, 12); while (s.size < n) s.add(__r(rand, -30, 30)); const a = [...s].sort(function (x, y) { return x - y; }); const r = __r(rand, 0, n - 1); return [a.slice(n - r).concat(a.slice(0, n - r))];`),
  examples: [[[4, 5, 6, 7, 0, 1, 2, 3]], [[3, 4, 5, 1, 2]]],
  edges: [
    ["sorted", [[1, 2, 3, 4]], "Not rotated at all: 0."],
    ["single", [[9]]],
    ["two", [[2, 1]]],
  ],
};

const countOccurrences: ProblemDef = {
  slug: "count-occurrences-in-a-sorted-array",
  title: "Count Occurrences in a Sorted Array",
  difficulty: "Easy",
  pattern: "Binary Search",
  url: tuf("count-occurrences-in-a-sorted-array"),
  statement: "Given a sorted integer array `nums` and a value `x`, return how many times `x` occurs in `nums`, in `O(log n)` time.",
  constraints: ["0 <= nums.length <= 10^5", "nums is sorted in non-decreasing order"],
  fn: "countOccurrences",
  params: SORTED_X,
  returns: "number",
  hints: [
    "All copies of x sit next to each other. If you knew where the block starts and where it ends, the count follows.",
    "Find the lower bound (first index >= x) and the upper bound (first index > x) with binary search; the count is their difference.",
    "lower = first index with nums[i] >= x (binary search)\nupper = first index with nums[i] > x (binary search)\nreturn upper - lower",
  ],
  reference: `function countOccurrences(nums, x) { const lb = (p) => { let lo = 0, hi = nums.length; while (lo < hi) { const m = (lo + hi) >> 1; if (p(nums[m])) hi = m; else lo = m + 1; } return lo; }; return lb((v) => v > x) - lb((v) => v >= x); }`,
  brute: `function countOccurrences(nums, x) { return nums.filter((v) => v === x).length; }`,
  fuzz: SORTED_GEN,
  examples: [[[2, 4, 4, 4, 7, 9], 4], [[1, 1, 2, 2, 2, 2, 3], 2]],
  edges: [
    ["no-answer", [[1, 3, 5], 4]],
    ["all-equal", [[6, 6, 6, 6], 6]],
    ["empty", [[], 1]],
  ],
};

const nthRoot: ProblemDef = {
  slug: "find-nth-root-of-a-number",
  title: "Nth Root of a Number",
  difficulty: "Medium",
  pattern: "Binary Search",
  url: tuf("find-nth-root-of-a-number"),
  statement: "Given two positive integers `n` and `m`, return the integer `x` with `x^n = m`. If no integer works, return `-1`.",
  constraints: ["1 <= n <= 30", "1 <= m <= 10^9"],
  fn: "nthRoot",
  params: [["n", "number"], ["m", "number"]],
  returns: "number",
  hints: [
    "x^n grows with x, so you can binary search x between 1 and m. Watch out for x^n overflowing.",
    "For a candidate mid, multiply mid by itself n times but stop as soon as the product exceeds m. Compare to decide which half to keep.",
    "lo = 1, hi = m\nwhile lo <= hi:\n  mid = (lo + hi) / 2 rounded down\n  p = 1; repeat n times: p = p * mid; stop early if p > m\n  if p == m: return mid\n  if p < m: lo = mid + 1 else hi = mid - 1\nreturn -1",
  ],
  reference: `function nthRoot(n, m) { let lo = 1, hi = m; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); let p = 1; for (let i = 0; i < n && p <= m; i++) p *= mid; if (p === m) return mid; if (p < m) lo = mid + 1; else hi = mid - 1; } return -1; }`,
  brute: `function nthRoot(n, m) { for (let x = 1; x <= m; x++) { const p = x ** n; if (p === m) return x; if (p > m) break; } return -1; }`,
  fuzz: gen(`const n = __r(rand, 1, 6); const x = __r(rand, 1, 12); return [n, rand() < 0.5 ? Math.min(Math.pow(x, n), 1000000000) : __r(rand, 1, 5000)];`),
  examples: [[3, 27], [4, 69]],
  edges: [
    ["single", [1, 14], "The first root of m is m itself."],
    ["boundary", [30, 1], "1 to any power is 1."],
    ["large", [2, 999950884], "31622^2: the search must not overflow while squaring."],
  ],
};

const aggressiveCows: ProblemDef = {
  slug: "aggressive-cows",
  title: "Aggressive Cows",
  difficulty: "Hard",
  pattern: "Binary Search on Answer",
  url: tuf("aggressive-cows"),
  statement: "You're given the positions of `stalls` along a line (distinct, unsorted) and `k` cows. Place the cows in stalls so that the **minimum distance** between any two cows is as large as possible, and return that distance.",
  constraints: ["2 <= stalls.length <= 10^5", "2 <= k <= stalls.length", "0 <= stalls[i] <= 10^9"],
  fn: "aggressiveCows",
  params: [["stalls", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "If you can place all cows with gap at least d, you can also do it with any smaller gap. That monotonic yes/no lets you binary search d.",
    "Sort the stalls. For a candidate d, place cows greedily from the left, putting each one in the first stall at least d past the previous cow. Find the largest d where k cows fit.",
    "sort stalls\nlo = 1, hi = last - first\nwhile lo <= hi:\n  d = (lo + hi) / 2 rounded down\n  place greedily: count = 1, prev = stalls[0]; for each s: if s - prev >= d: count += 1; prev = s\n  if count >= k: lo = d + 1 else hi = d - 1\nreturn hi",
  ],
  reference: `function aggressiveCows(stalls, k) { const s = stalls.slice().sort((a, b) => a - b); const ok = (d) => { let c = 1, p = s[0]; for (const x of s) if (x - p >= d) { c++; p = x; } return c >= k; }; let lo = 1, hi = s[s.length - 1] - s[0]; while (lo <= hi) { const m = Math.floor((lo + hi) / 2); if (ok(m)) lo = m + 1; else hi = m - 1; } return hi; }`,
  brute: `function aggressiveCows(stalls, k) { const s = stalls.slice().sort((a, b) => a - b); let best = 0; for (let d = 1; d <= s[s.length - 1] - s[0]; d++) { let c = 1, p = s[0]; for (const x of s) if (x - p >= d) { c++; p = x; } if (c >= k) best = d; } return best; }`,
  fuzz: gen(`const st = new Set(); const n = __r(rand, 2, 10); while (st.size < n) st.add(__r(rand, 0, 60)); return [__shuffle(rand, [...st]), __r(rand, 2, n)];`),
  examples: [[[0, 3, 4, 7, 10, 9], 4], [[4, 2, 1, 3, 6], 2]],
  edges: [
    ["two", [[1, 9], 2]],
    ["boundary", [[1, 2, 3, 4, 5], 5], "Every stall gets a cow: the answer is the smallest gap."],
    ["order", [[10, 1, 2, 7, 5], 3], "The stalls aren't sorted."],
  ],
};

const kthTwoSorted: ProblemDef = {
  slug: "kth-element-of-2-sorted-arrays",
  title: "K-th Element of Two Sorted Arrays",
  difficulty: "Hard",
  pattern: "Binary Search",
  url: tuf("kth-element-of-2-sorted-arrays"),
  statement: "Given two sorted arrays `a` and `b` and an integer `k`, return the `k`-th smallest element (1-based) of the combined sorted array, without merging the arrays.",
  constraints: ["1 <= a.length, b.length <= 10^5", "1 <= k <= a.length + b.length"],
  fn: "kthElement",
  params: [["a", "number[]"], ["b", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "The first k elements of the merged array take some count i from a and k - i from b. Which i is valid?",
    "Binary search i in [max(0, k - len(b)), min(k, len(a))]. With l1 = a[i-1], l2 = b[k-i-1], r1 = a[i], r2 = b[k-i] (infinities at the ends), the split is right when l1 <= r2 and l2 <= r1; the answer is max(l1, l2).",
    "lo = max(0, k - m), hi = min(k, n)\nwhile lo <= hi:\n  i = (lo + hi) / 2 rounded down; j = k - i\n  l1 = a[i - 1] or -inf; r1 = a[i] or +inf; l2 = b[j - 1] or -inf; r2 = b[j] or +inf\n  if l1 <= r2 and l2 <= r1: return max(l1, l2)\n  if l1 > r2: hi = i - 1 else lo = i + 1",
  ],
  reference: `function kthElement(a, b, k) { if (a.length > b.length) return kthElement(b, a, k); let lo = Math.max(0, k - b.length), hi = Math.min(k, a.length); while (lo <= hi) { const i = (lo + hi) >> 1, j = k - i; const l1 = i ? a[i - 1] : -Infinity, r1 = i < a.length ? a[i] : Infinity, l2 = j ? b[j - 1] : -Infinity, r2 = j < b.length ? b[j] : Infinity; if (l1 <= r2 && l2 <= r1) return Math.max(l1, l2); if (l1 > r2) hi = i - 1; else lo = i + 1; } return -1; }`,
  brute: `function kthElement(a, b, k) { return a.concat(b).sort((x, y) => x - y)[k - 1]; }`,
  fuzz: gen(`const a = __sorted(rand, __r(rand, 1, 8), 0, 30), b = __sorted(rand, __r(rand, 1, 8), 0, 30); return [a, b, __r(rand, 1, a.length + b.length)];`),
  examples: [[[2, 3, 6, 7, 9], [1, 4, 8, 10], 5], [[100, 112, 256, 349, 770], [72, 86, 113, 119, 265, 445, 892], 7]],
  edges: [
    ["boundary", [[1, 2], [3, 4], 4], "The largest element overall."],
    ["single", [[5], [1], 1]],
    ["duplicates", [[2, 2, 2], [2, 2], 3]],
  ],
};

const gasStation: ProblemDef = {
  slug: "minimise-max-distance-to-gas-stations",
  title: "Minimise Max Distance to Gas Station",
  difficulty: "Hard",
  pattern: "Binary Search on Answer",
  url: tuf("minimise-max-distance-to-gas-stations"),
  statement: "Gas stations stand at sorted integer positions `arr`. You may add `k` new stations anywhere (not necessarily at integer positions). Return the smallest possible value of the **largest distance between adjacent stations**, rounded to 2 decimal places (as a number).",
  constraints: ["2 <= arr.length <= 50", "0 <= arr[i] <= 10^4, strictly increasing", "1 <= k <= 100"],
  fn: "minimiseMaxDistance",
  params: [["arr", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "Putting c new stations evenly into a gap of length g splits it into c + 1 equal parts of g / (c + 1). Where should each new station go?",
    "Greedy: k times, add a station to the gap whose current part length g / (c + 1) is largest. The answer is the largest part afterwards. (Binary searching the answer also works for big k.) Round with Math.round(x * 100) / 100.",
    "count = array of zeros, one per gap\nrepeat k times:\n  pick gap i with the largest gap[i] / (count[i] + 1)\n  count[i] += 1\nbest = max over gaps of gap[i] / (count[i] + 1)\nreturn best rounded to 2 decimals",
  ],
  reference: `function minimiseMaxDistance(arr, k) { const g = []; for (let i = 1; i < arr.length; i++) g.push(arr[i] - arr[i - 1]); const c = g.map(() => 0); for (let t = 0; t < k; t++) { let b = 0; for (let i = 1; i < g.length; i++) if (g[i] / (c[i] + 1) > g[b] / (c[b] + 1)) b = i; c[b]++; } let best = 0; for (let i = 0; i < g.length; i++) best = Math.max(best, g[i] / (c[i] + 1)); return Math.round(best * 100) / 100; }`,
  brute: `function minimiseMaxDistance(arr, k) { const g = []; for (let i = 1; i < arr.length; i++) g.push(arr[i] - arr[i - 1]); const cand = []; for (const p of g) for (let q = 1; q <= k + 1; q++) cand.push([p, q]); cand.sort((x, y) => x[0] * y[1] - y[0] * x[1]); for (const [p, q] of cand) { let need = 0; for (const x of g) need += Math.floor((x * q + p - 1) / p) - 1; if (need <= k) return Math.round((p / q) * 100) / 100; } return 0; }`,
  fuzz: gen(`const s = new Set(); const n = __r(rand, 2, 7); while (s.size < n) s.add(__r(rand, 0, 60)); return [[...s].sort(function (a, b) { return a - b; }), __r(rand, 1, 12)];`),
  examples: [[[1, 2, 3, 4, 5], 4], [[1, 13, 17, 23], 5]],
  edges: [
    ["two", [[0, 10], 1], "One gap split once: 5."],
    ["boundary", [[0, 7], 2], "7 / 3 = 2.333...: round to 2.33."],
    ["large", [[0, 100, 101], 100]],
  ],
};

const rowMaxOnes: ProblemDef = {
  slug: "find-row-with-maximum-1s",
  title: "Row with Maximum 1s",
  difficulty: "Easy",
  pattern: "Binary Search",
  url: tuf("find-row-with-maximum-1's"),
  statement: "Given an `n x m` binary matrix `mat` in which every row is sorted (all `0`s before all `1`s), return the index of the row with the most `1`s. If several rows tie, return the smallest index. If there are no `1`s, return `-1`.",
  constraints: ["1 <= n, m <= 100"],
  fn: "rowWithMax1s",
  params: [["mat", "number[][]"]],
  returns: "number",
  hints: [
    "In a sorted binary row, the number of 1s is m minus the index of the first 1.",
    "Binary search each row for its first 1 (a lower bound of 1), compute the count, and keep the first row with a strictly larger count.",
    "best = 0, ans = -1\nfor each row i:\n  first = first index with mat[i][j] == 1 (binary search; m if none)\n  if m - first > best: best = m - first; ans = i\nreturn ans",
  ],
  reference: `function rowWithMax1s(mat) { let best = 0, ans = -1; mat.forEach((r, i) => { let lo = 0, hi = r.length; while (lo < hi) { const m = (lo + hi) >> 1; if (r[m] === 1) hi = m; else lo = m + 1; } if (r.length - lo > best) { best = r.length - lo; ans = i; } }); return ans; }`,
  brute: `function rowWithMax1s(mat) { const c = mat.map((r) => r.filter((v) => v === 1).length); const mx = Math.max(...c); return mx === 0 ? -1 : c.indexOf(mx); }`,
  fuzz: gen(`const n = __r(rand, 1, 6), m = __r(rand, 1, 6); return [Array.from({ length: n }, function () { const z = __r(rand, 0, m); return Array.from({ length: m }, function (_, j) { return j < z ? 0 : 1; }); })];`),
  examples: [[[[0, 1, 1], [0, 0, 1], [1, 1, 1]]], [[[0, 0], [0, 1], [0, 1]]]],
  edges: [
    ["zeros", [[[0, 0], [0, 0]]], "No 1s anywhere: -1."],
    ["all-equal", [[[1, 1], [1, 1]]], "A tie: return the first row."],
    ["single", [[[1]]]],
  ],
};

const peakTwo: ProblemDef = {
  slug: "find-peak-element-ii",
  title: "Find Peak Element II",
  difficulty: "Hard",
  pattern: "Binary Search",
  url: tuf("find-peak-element-ii"),
  statement: "A **peak** in a 2D grid is a cell strictly greater than its up, down, left and right neighbours (cells outside the grid count as `-1`).\n\nGiven an `n x m` grid `mat` of distinct non-negative values that has **exactly one** peak, return its position as `[row, col]`. Aim for `O(n log m)`.",
  constraints: ["1 <= n, m <= 100", "values are distinct and there is exactly one peak"],
  fn: "findPeakGrid",
  params: [["mat", "number[][]"]],
  returns: "number[]",
  hints: [
    "Pick a middle column and take its maximum. Compared with its left and right neighbours, which side must contain a peak?",
    "Binary search columns: in column mid find the row r of the maximum. If mat[r][mid] is smaller than a horizontal neighbour, move to that side; otherwise (r, mid) is a peak.",
    "lo = 0, hi = m - 1\nwhile lo <= hi:\n  mid = (lo + hi) / 2 rounded down\n  r = row of the maximum in column mid\n  left = mat[r][mid - 1] or -1; right = mat[r][mid + 1] or -1\n  if mat[r][mid] > left and mat[r][mid] > right: return [r, mid]\n  if left > mat[r][mid]: hi = mid - 1 else lo = mid + 1",
  ],
  reference: `function findPeakGrid(mat) { let lo = 0, hi = mat[0].length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; let r = 0; for (let i = 1; i < mat.length; i++) if (mat[i][mid] > mat[r][mid]) r = i; const L = mid > 0 ? mat[r][mid - 1] : -1, R = mid + 1 < mat[0].length ? mat[r][mid + 1] : -1; if (mat[r][mid] > L && mat[r][mid] > R) return [r, mid]; if (L > mat[r][mid]) hi = mid - 1; else lo = mid + 1; } return [-1, -1]; }`,
  brute: `function findPeakGrid(mat) { const g = (i, j) => (i < 0 || j < 0 || i >= mat.length || j >= mat[0].length ? -1 : mat[i][j]); for (let i = 0; i < mat.length; i++) for (let j = 0; j < mat[0].length; j++) { const v = mat[i][j]; if (v > g(i - 1, j) && v > g(i + 1, j) && v > g(i, j - 1) && v > g(i, j + 1)) return [i, j]; } return [-1, -1]; }`,
  fuzz: gen(`const n = __r(rand, 1, 6), m = __r(rand, 1, 6), pi = __r(rand, 0, n - 1), pj = __r(rand, 0, m - 1); const used = __shuffle(rand, Array.from({ length: n * m }, function (_, i) { return i; })); return [Array.from({ length: n }, function (_, i) { return Array.from({ length: m }, function (_, j) { return 1000 - (Math.abs(i - pi) + Math.abs(j - pj)) * 100 + used[i * m + j]; }); })];`),
  examples: [[[[1, 2], [3, 4]]], [[[80, 91, 82], [93, 104, 95], [86, 97, 88]]]],
  edges: [
    ["single", [[[5]]]],
    ["boundary", [[[1, 2, 3, 4]]], "One row: the peak is at the right edge."],
    ["skewed", [[[1], [5], [3]]], "One column."],
  ],
};

const matrixMedian: ProblemDef = {
  slug: "matrix-median",
  title: "Matrix Median",
  difficulty: "Hard",
  pattern: "Binary Search on Answer",
  url: tuf("matrix-median"),
  statement: "Given an `n x m` matrix whose rows are each sorted in non-decreasing order and where `n * m` is odd, return the median of all its elements, without flattening and sorting the matrix.",
  constraints: ["1 <= n, m <= 100", "n * m is odd", "1 <= mat[i][j] <= 10^9"],
  fn: "median",
  params: [["mat", "number[][]"]],
  returns: "number",
  hints: [
    "The median is the smallest value x such that more than half of all elements are <= x. Can you count elements <= x quickly?",
    "Binary search x between the smallest first element and the largest last element. Count elements <= x with an upper-bound binary search in every row. Find the smallest x whose count exceeds (n * m) / 2.",
    "lo = min of first column, hi = max of last column\nneed = (n * m) / 2 rounded down\nwhile lo <= hi:\n  mid = (lo + hi) / 2 rounded down\n  cnt = sum over rows of (number of elements <= mid)\n  if cnt <= need: lo = mid + 1 else hi = mid - 1\nreturn lo",
  ],
  reference: `function median(mat) { let lo = Infinity, hi = -Infinity; for (const r of mat) { lo = Math.min(lo, r[0]); hi = Math.max(hi, r[r.length - 1]); } const need = Math.floor((mat.length * mat[0].length) / 2); const ub = (r, x) => { let a = 0, b = r.length; while (a < b) { const m = (a + b) >> 1; if (r[m] <= x) a = m + 1; else b = m; } return a; }; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); let c = 0; for (const r of mat) c += ub(r, mid); if (c <= need) lo = mid + 1; else hi = mid - 1; } return lo; }`,
  brute: `function median(mat) { const a = mat.flat().sort((x, y) => x - y); return a[a.length >> 1]; }`,
  fuzz: gen(`const n = __pick(rand, [1, 3, 5]), m = __pick(rand, [1, 3, 5, 7]); return [Array.from({ length: n }, function () { return __sorted(rand, m, 1, 30); })];`),
  examples: [[[[1, 4, 9], [2, 5, 6], [3, 7, 8]]], [[[1, 3, 8], [2, 3, 4], [1, 2, 5]]]],
  edges: [
    ["single", [[[7]]]],
    ["all-equal", [[[2, 2, 2], [2, 2, 2], [2, 2, 2]]]],
    ["skewed", [[[1, 2, 3, 4, 5]]], "A single row."],
  ],
};

export const A2Z_SORTING_SEARCH = [
  selectionSort, bubbleSort, insertionSort, mergeSort, quickSort, recursiveBubble, recursiveInsertion,
  unionSorted, intersectionSorted, leaders, repeatMissing, inversions,
  longestSumK, largestZero, xorK,
  lowerBound, upperBound, floorCeil, rotationCount, countOccurrences, nthRoot, aggressiveCows, kthTwoSorted, gasStation,
  rowMaxOnes, peakTwo, matrixMedian,
].map(define);
