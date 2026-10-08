import { define, tuf, variant, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const NUMS: Array<[string, string]> = [["nums", "number[]"]];
const NUMS_X: Array<[string, string]> = [["nums", "number[]"], ["x", "number"]];
const NUMS_TARGET: Array<[string, string]> = [["nums", "number[]"], ["target", "number"]];
const NUMS_K: Array<[string, string]> = [["nums", "number[]"], ["k", "number"]];

const sumArray: ProblemDef = {
  slug: "sum-of-array-elements",
  title: "Sum of Array Elements",
  difficulty: "Easy",
  pattern: "Traversal",
  url: tuf("sum-of-array-elements"),
  statement: "Given an integer array `nums`, return the sum of all its elements.\n\nAn empty array has sum `0`. Use a loop and an accumulator rather than a built-in reducer.",
  constraints: ["0 <= nums.length <= 10^4", "-10^4 <= nums[i] <= 10^4"],
  fn: "sumArray",
  params: NUMS,
  returns: "number",
  hints: [
    "You only need one pass over the array. What single value do you carry from one element to the next?",
    "Keep a running total that starts at 0 and add every element to it. The total after the last element is the answer, and an empty array never enters the loop.",
    "total = 0\nfor each value in nums:\n  total = total + value\nreturn total",
  ],
  reference: `function sumArray(nums) { let total = 0; for (const v of nums) total += v; return total; }`,
  brute: `function sumArray(nums) { return nums.reduce((s, v) => s + v, 0); }`,
  fuzz: arrayGen(0, 30, -100, 100),
  examples: [[[1, 2, 3, 4]], [[5, -2, 10]]],
  edges: [
    ["empty", [[]], "Nothing to add: the answer is 0, not undefined."],
    ["single", [[7]]],
    ["negatives", [[-3, -2, -5]], "All negative: the total goes below zero."],
  ],
};

const largest: ProblemDef = {
  slug: "largest-element",
  title: "Largest Element in an Array",
  difficulty: "Easy",
  pattern: "Traversal",
  url: tuf("largest-element"),
  statement: "Given a non-empty integer array `nums`, return its largest element **without** using `Math.max` or sorting.",
  constraints: ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "findLargest",
  params: NUMS,
  returns: "number",
  hints: [
    "Imagine reading the numbers one at a time. What do you need to remember so far to know the largest at the end?",
    "Track the best value seen so far. Start it at the first element (not 0, which breaks on all-negative input) and replace it whenever a bigger value appears.",
    "best = nums[0]\nfor i from 1 to n - 1:\n  if nums[i] > best:\n    best = nums[i]\nreturn best",
  ],
  reference: `function findLargest(nums) { let best = nums[0]; for (let i = 1; i < nums.length; i++) if (nums[i] > best) best = nums[i]; return best; }`,
  brute: `function findLargest(nums) { return nums.slice().sort((a, b) => b - a)[0]; }`,
  fuzz: arrayGen(1, 30, -1000, 1000),
  examples: [[[3, 9, 2, 7]], [[10, 4, 10, 1]]],
  edges: [
    ["negatives", [[-8, -3, -10]], "All negative: starting the best at 0 returns 0, which isn't in the array."],
    ["single", [[5]]],
    ["all-equal", [[4, 4, 4]]],
    ["boundary", [[1, 2, 3, 100]], "The largest value is the last element."],
  ],
};

const smallest: ProblemDef = {
  slug: "smallest-element",
  title: "Smallest Element in an Array",
  difficulty: "Easy",
  pattern: "Traversal",
  statement: "Given a non-empty integer array `nums`, return its smallest element **without** using `Math.min` or sorting.",
  constraints: ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "findSmallest",
  params: NUMS,
  returns: "number",
  hints: [
    "This is the mirror image of finding the largest. Which single value do you keep while scanning?",
    "Keep the smallest value seen so far, starting from the first element. Starting from 0 fails when every value is positive.",
    "best = nums[0]\nfor i from 1 to n - 1:\n  if nums[i] < best:\n    best = nums[i]\nreturn best",
  ],
  reference: `function findSmallest(nums) { let best = nums[0]; for (let i = 1; i < nums.length; i++) if (nums[i] < best) best = nums[i]; return best; }`,
  brute: `function findSmallest(nums) { return nums.slice().sort((a, b) => a - b)[0]; }`,
  fuzz: arrayGen(1, 30, -1000, 1000),
  examples: [[[3, 9, 2, 7]], [[10, -4, 10, 1]]],
  edges: [
    ["single", [[5]]],
    ["all-equal", [[6, 6, 6]]],
    ["boundary", [[9, 8, 7, 1]], "The smallest value is the last element; starting from 0 would also be wrong here."],
  ],
};

const countEven: ProblemDef = {
  slug: "count-even-numbers",
  title: "Count Even Numbers",
  difficulty: "Easy",
  pattern: "Counting",
  statement: "Given an integer array `nums`, return how many of its elements are even.\n\nZero and negative even numbers count as even.",
  constraints: ["0 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "countEven",
  params: NUMS,
  returns: "number",
  hints: [
    "Each element either matches the rule or doesn't. What do you increase when it matches?",
    "Loop once with a counter. A number is even when its remainder by 2 is 0; compare with 0 rather than with 1, because -3 % 2 is -1 in JavaScript.",
    "count = 0\nfor each value in nums:\n  if value mod 2 == 0:\n    count = count + 1\nreturn count",
  ],
  reference: `function countEven(nums) { let c = 0; for (const v of nums) if (v % 2 === 0) c++; return c; }`,
  brute: `function countEven(nums) { return nums.filter((v) => Math.abs(v) % 2 === 0).length; }`,
  fuzz: arrayGen(0, 30, -50, 50),
  examples: [[[1, 2, 3, 4, 6]], [[7, 9, 11]]],
  edges: [
    ["zeros", [[0, 0, 1]], "0 is even."],
    ["empty", [[]]],
    ["negatives", [[-2, -3, -4]], "-3 % 2 is -1, so a check for === 1 misses negative odd numbers."],
  ],
};

const linearSearch: ProblemDef = {
  slug: "linear-search",
  title: "Linear Search",
  difficulty: "Easy",
  pattern: "Linear Search",
  url: tuf("linear-search"),
  statement: "Given an integer array `nums` and an integer `target`, return the **first** index where `target` appears, or `-1` if it is absent.",
  constraints: ["0 <= nums.length <= 10^4", "-10^9 <= nums[i], target <= 10^9"],
  fn: "linearSearch",
  params: NUMS_TARGET,
  returns: "number",
  hints: [
    "Scan from the left. The moment you find the target, do you need to look any further?",
    "Return the index as soon as nums[i] equals target (an early return gives the first occurrence). If the loop finishes, the target isn't there, so return -1.",
    "for i from 0 to n - 1:\n  if nums[i] == target:\n    return i\nreturn -1",
  ],
  reference: `function linearSearch(nums, target) { for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i; return -1; }`,
  brute: `function linearSearch(nums, target) { return nums.indexOf(target); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 15), 0, 9), __r(rand, 0, 12)];`),
  examples: [[[4, 7, 1, 9], 1], [[2, 5, 8], 8]],
  edges: [
    ["no-answer", [[1, 2, 3], 9], "Absent target: return -1, not undefined."],
    ["duplicates", [[5, 3, 5, 3], 3], "The first match is index 1, not the last one."],
    ["empty", [[], 4]],
  ],
};

const countGreater: ProblemDef = {
  slug: "count-greater-than-x",
  title: "Count Elements Greater Than X",
  difficulty: "Easy",
  pattern: "Counting",
  statement: "Given an integer array `nums` and an integer `x`, return how many elements are **strictly greater** than `x`.",
  constraints: ["0 <= nums.length <= 10^4", "-10^9 <= nums[i], x <= 10^9"],
  fn: "countGreater",
  params: NUMS_X,
  returns: "number",
  hints: [
    "Turn the threshold into a yes/no question for each element. What do you do on a yes?",
    "Count elements with nums[i] > x. Use strict comparison: an element equal to x does not count.",
    "count = 0\nfor each value in nums:\n  if value > x:\n    count = count + 1\nreturn count",
  ],
  reference: `function countGreater(nums, x) { let c = 0; for (const v of nums) if (v > x) c++; return c; }`,
  brute: `function countGreater(nums, x) { return nums.filter((v) => v > x).length; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 20), -20, 20), __r(rand, -20, 20)];`),
  examples: [[[1, 5, 8, 3, 10], 4], [[2, 2, 2], 1]],
  edges: [
    ["all-equal", [[3, 3, 3], 3], "Values equal to x are not greater than x."],
    ["empty", [[], 0]],
    ["negatives", [[-5, -1, 0, -3], -2]],
  ],
};

const sumGreater: ProblemDef = {
  slug: "sum-greater-than-x",
  title: "Sum of Elements Greater Than X",
  difficulty: "Easy",
  pattern: "Accumulator",
  statement: "Given an integer array `nums` and an integer `x`, return the sum of all elements **strictly greater** than `x`. Return `0` if none qualify.",
  constraints: ["0 <= nums.length <= 10^4", "-10^4 <= nums[i], x <= 10^4"],
  fn: "sumGreater",
  params: NUMS_X,
  returns: "number",
  hints: [
    "It's a running total, but not every element is allowed in. Where does the condition go?",
    "Loop once and add nums[i] to the total only when nums[i] > x. Start the total at 0 so nothing qualifying still gives 0.",
    "total = 0\nfor each value in nums:\n  if value > x:\n    total = total + value\nreturn total",
  ],
  reference: `function sumGreater(nums, x) { let s = 0; for (const v of nums) if (v > x) s += v; return s; }`,
  brute: `function sumGreater(nums, x) { return nums.filter((v) => v > x).reduce((a, b) => a + b, 0); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 20), -20, 20), __r(rand, -20, 20)];`),
  examples: [[[1, 5, 8, 3, 10], 4], [[6, 2, 9], 5]],
  edges: [
    ["no-answer", [[1, 2, 3], 10], "Nothing is greater than x: the sum is 0."],
    ["negatives", [[-5, -1, -3], -4], "Negative values above the threshold still add up to a negative sum."],
    ["empty", [[], 0]],
  ],
};

const reverseCopy: ProblemDef = {
  slug: "reverse-array",
  title: "Reverse an Array",
  difficulty: "Easy",
  pattern: "Reverse Traversal",
  url: tuf("reverse-an-array"),
  statement: "Given an integer array `nums`, return a **new** array with the elements in reverse order. Build it with a loop instead of `reverse()`, and leave `nums` unchanged.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "reverseArray",
  params: NUMS,
  returns: "number[]",
  hints: [
    "Which element of nums ends up first in the answer, and which ends up last?",
    "Walk nums from the last index down to 0 and push each value onto a fresh result array.",
    "result = empty list\nfor i from n - 1 down to 0:\n  append nums[i] to result\nreturn result",
  ],
  reference: `function reverseArray(nums) { const out = []; for (let i = nums.length - 1; i >= 0; i--) out.push(nums[i]); return out; }`,
  brute: `function reverseArray(nums) { return nums.slice().reverse(); }`,
  fuzz: arrayGen(0, 20, -50, 50),
  examples: [[[1, 2, 3, 4, 5]], [[9, 0, -1]]],
  edges: [
    ["empty", [[]]],
    ["single", [[42]]],
    ["two", [[1, 2]]],
  ],
};

const positives: ProblemDef = {
  slug: "filter-positive-numbers",
  title: "Keep Only Positive Numbers",
  difficulty: "Easy",
  pattern: "Traversal + Build",
  statement: "Given an integer array `nums`, return a new array containing only its **positive** numbers (greater than 0), in their original order. Don't use `Array.filter`.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "positiveOnly",
  params: NUMS,
  returns: "number[]",
  hints: [
    "You're building a second array as you scan the first. When does an element get copied?",
    "Push nums[i] onto the result only when it is greater than 0. Zero is not positive.",
    "result = empty list\nfor each value in nums:\n  if value > 0:\n    append value to result\nreturn result",
  ],
  reference: `function positiveOnly(nums) { const out = []; for (const v of nums) if (v > 0) out.push(v); return out; }`,
  brute: `function positiveOnly(nums) { return nums.filter((v) => v > 0); }`,
  fuzz: arrayGen(0, 20, -10, 10),
  examples: [[[3, -1, 0, 5, -7, 2]], [[1, 2, 3]]],
  edges: [
    ["zeros", [[0, 0, 0]], "Zero is not positive, so the answer is empty."],
    ["empty", [[]]],
    ["negatives", [[-4, -2]]],
  ],
};

const isSorted: ProblemDef = {
  slug: "check-array-sorted",
  title: "Check if an Array is Sorted",
  difficulty: "Easy",
  pattern: "Validation",
  url: tuf("check-if-the-array-is-sorted-i"),
  statement: "Given an integer array `nums`, return `true` if it is sorted in **non-decreasing** order (each element is at least the one before it), otherwise `false`.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "isSorted",
  params: NUMS,
  returns: "boolean",
  hints: [
    "A global property like 'sorted' can be checked locally. Which pairs of elements do you need to compare?",
    "Compare each element with its neighbour. One pair with nums[i] < nums[i-1] proves it isn't sorted; equal neighbours are fine.",
    "for i from 1 to n - 1:\n  if nums[i] < nums[i - 1]:\n    return false\nreturn true",
  ],
  reference: `function isSorted(nums) { for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) return false; return true; }`,
  brute: `function isSorted(nums) { const s = nums.slice().sort((a, b) => a - b); return s.every((v, i) => v === nums[i]); }`,
  fuzz: gen(`const a = __arr(rand, __r(rand, 0, 8), 0, 5); if (rand() < 0.5) a.sort((x, y) => x - y); return [a];`),
  examples: [[[1, 2, 2, 5]], [[3, 1, 2]]],
  edges: [
    ["empty", [[]], "An empty array is sorted."],
    ["duplicates", [[1, 1, 1, 2]], "Equal neighbours are allowed in non-decreasing order."],
    ["reverse-sorted", [[5, 4, 3]]],
    ["single", [[9]]],
  ],
};

const secondLargest: ProblemDef = {
  slug: "second-largest-element",
  title: "Second Largest Element",
  difficulty: "Easy",
  pattern: "Traversal + State",
  url: tuf("second-largest-element"),
  statement: "Given an integer array `nums`, return the **second largest distinct** value. If there is no such value (fewer than two distinct values), return `null`.\n\nTry to do it in one pass without sorting.",
  constraints: ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "secondLargest",
  params: NUMS,
  returns: "number | null",
  hints: [
    "Keeping just the maximum isn't enough. What else do you need to remember while scanning?",
    "Track the largest and second largest seen so far. A new maximum pushes the old one down to second place; a value strictly between them becomes the new second. Ignore values equal to the maximum.",
    "first = none, second = none\nfor each value in nums:\n  if first is none or value > first:\n    second = first\n    first = value\n  else if value < first and (second is none or value > second):\n    second = value\nreturn second",
  ],
  reference: `function secondLargest(nums) {
    let first = null, second = null;
    for (const v of nums) {
      if (first === null || v > first) { second = first; first = v; }
      else if (v < first && (second === null || v > second)) second = v;
    }
    return second;
  }`,
  brute: `function secondLargest(nums) { const d = [...new Set(nums)].sort((a, b) => b - a); return d.length > 1 ? d[1] : null; }`,
  fuzz: arrayGen(1, 12, -5, 5),
  examples: [[[12, 35, 1, 10, 34, 1]], [[10, 5, 10]]],
  edges: [
    ["all-equal", [[7, 7, 7]], "Only one distinct value: there is no second largest."],
    ["single", [[3]]],
    ["negatives", [[-1, -5, -3]], "Initialising second to 0 or -1 is wrong when every value is negative."],
    ["duplicates", [[5, 5, 4, 4]], "The second largest distinct value is 4, not the duplicated 5."],
  ],
};

const sumOddIdx: ProblemDef = {
  slug: "sum-at-odd-indexes",
  title: "Sum of Elements at Odd Indexes",
  difficulty: "Easy",
  pattern: "Index Traversal",
  statement: "Given an integer array `nums`, return the sum of the elements at **odd indexes** (1, 3, 5, ...). Indexes start at 0.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "sumOddIndexes",
  params: NUMS,
  returns: "number",
  hints: [
    "The condition is about where an element sits, not what it holds. What should the loop variable describe?",
    "Either loop over every index and add nums[i] when i is odd, or start at index 1 and step by 2.",
    "total = 0\nfor i from 1 to n - 1 in steps of 2:\n  total = total + nums[i]\nreturn total",
  ],
  reference: `function sumOddIndexes(nums) { let s = 0; for (let i = 1; i < nums.length; i += 2) s += nums[i]; return s; }`,
  brute: `function sumOddIndexes(nums) { return nums.reduce((s, v, i) => (i % 2 === 1 ? s + v : s), 0); }`,
  fuzz: arrayGen(0, 20, -20, 20),
  examples: [[[10, 1, 20, 2, 30, 3]], [[5, 6, 7]]],
  edges: [
    ["single", [[9]], "One element sits at index 0, which is even: the answer is 0."],
    ["empty", [[]]],
    ["negatives", [[0, -4, 0, -6]]],
  ],
};

const lastOcc: ProblemDef = {
  slug: "last-occurrence",
  title: "Last Occurrence of a Target",
  difficulty: "Easy",
  pattern: "Linear Search",
  statement: "Given an integer array `nums` and an integer `target`, return the **last** index where `target` appears, or `-1` if it is absent.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "lastOccurrence",
  params: NUMS_TARGET,
  returns: "number",
  hints: [
    "With a first-occurrence search you stop at the first match. How can you make the first match you meet be the last one in the array?",
    "Scan from the right end and return the first index that matches. (Scanning left to right and remembering the latest match also works.)",
    "for i from n - 1 down to 0:\n  if nums[i] == target:\n    return i\nreturn -1",
  ],
  reference: `function lastOccurrence(nums, target) { for (let i = nums.length - 1; i >= 0; i--) if (nums[i] === target) return i; return -1; }`,
  brute: `function lastOccurrence(nums, target) { return nums.lastIndexOf(target); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 15), 0, 6), __r(rand, 0, 8)];`),
  examples: [[[1, 3, 5, 3, 2], 3], [[4, 4, 4], 4]],
  edges: [
    ["no-answer", [[1, 2, 3], 7]],
    ["boundary", [[2, 9, 9, 2], 2], "The last occurrence is the final element."],
    ["empty", [[], 1]],
  ],
};

const countSigns: ProblemDef = {
  slug: "count-positive-negative-zero",
  title: "Count Positives, Negatives and Zeroes",
  difficulty: "Easy",
  pattern: "Counting",
  statement: "Given an integer array `nums`, return an array `[positives, negatives, zeroes]` with how many elements are greater than 0, less than 0, and equal to 0.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "countSigns",
  params: NUMS,
  returns: "number[]",
  hints: [
    "Every element falls into exactly one of three buckets. How many counters do you need?",
    "Keep three counters and, for each element, increase the one matching its sign with an if / else-if / else chain.",
    "pos = 0, neg = 0, zero = 0\nfor each value in nums:\n  if value > 0: pos += 1\n  else if value < 0: neg += 1\n  else: zero += 1\nreturn [pos, neg, zero]",
  ],
  reference: `function countSigns(nums) { let p = 0, n = 0, z = 0; for (const v of nums) { if (v > 0) p++; else if (v < 0) n++; else z++; } return [p, n, z]; }`,
  brute: `function countSigns(nums) { return [nums.filter((v) => v > 0).length, nums.filter((v) => v < 0).length, nums.filter((v) => v === 0).length]; }`,
  fuzz: arrayGen(0, 20, -3, 3),
  examples: [[[3, -1, 0, 5, -7, 0]], [[1, 2, 3]]],
  edges: [
    ["zeros", [[0, 0, 0]]],
    ["empty", [[]], "No elements: every count is 0."],
    ["negatives", [[-1, -2]]],
  ],
};

const range: ProblemDef = {
  slug: "max-min-difference",
  title: "Difference Between Largest and Smallest",
  difficulty: "Easy",
  pattern: "Traversal",
  statement: "Given a non-empty integer array `nums`, return `max - min`, the difference between its largest and smallest elements.",
  constraints: ["1 <= nums.length <= 10^4", "-10^6 <= nums[i] <= 10^6"],
  fn: "rangeOf",
  params: NUMS,
  returns: "number",
  hints: [
    "You already know how to find the largest and the smallest separately. Can one pass track both?",
    "Keep both a running maximum and a running minimum, starting from the first element, and update both for every element.",
    "hi = nums[0], lo = nums[0]\nfor each value in nums:\n  if value > hi: hi = value\n  if value < lo: lo = value\nreturn hi - lo",
  ],
  reference: `function rangeOf(nums) { let hi = nums[0], lo = nums[0]; for (const v of nums) { if (v > hi) hi = v; if (v < lo) lo = v; } return hi - lo; }`,
  brute: `function rangeOf(nums) { const s = nums.slice().sort((a, b) => a - b); return s[s.length - 1] - s[0]; }`,
  fuzz: arrayGen(1, 20, -100, 100),
  examples: [[[3, 9, 1, 7]], [[-4, 6, 0]]],
  edges: [
    ["single", [[5]], "One element is both the max and the min: the answer is 0."],
    ["all-equal", [[2, 2, 2]]],
    ["negatives", [[-10, -3, -7]]],
  ],
};

const sumEvenIdx: ProblemDef = {
  ...sumOddIdx,
  slug: "sum-at-even-indexes",
  title: "Sum of Elements at Even Indexes",
  statement: "Given an integer array `nums`, return the sum of the elements at **even indexes** (0, 2, 4, ...). Indexes start at 0.",
  fn: "sumEvenIndexes",
  hints: [
    "Position decides whether an element counts. Which indexes are even, and where does the first one start?",
    "Start at index 0 and step by 2, adding each element you land on.",
    "total = 0\nfor i from 0 to n - 1 in steps of 2:\n  total = total + nums[i]\nreturn total",
  ],
  reference: `function sumEvenIndexes(nums) { let s = 0; for (let i = 0; i < nums.length; i += 2) s += nums[i]; return s; }`,
  brute: `function sumEvenIndexes(nums) { return nums.reduce((s, v, i) => (i % 2 === 0 ? s + v : s), 0); }`,
  examples: [[[10, 1, 20, 2, 30, 3]], [[5, 6, 7]]],
  edges: [
    ["single", [[9]], "Index 0 is even, so a single element is the whole answer."],
    ["empty", [[]]],
    ["negatives", [[-4, 0, -6, 0]]],
  ],
};

const replaceNeg: ProblemDef = {
  slug: "replace-negatives-with-zero",
  title: "Replace Negatives with Zero",
  difficulty: "Easy",
  pattern: "In-place Traversal",
  statement: "Given an integer array `nums`, replace every negative number with `0` **in the same array**. Don't return anything; the array itself is checked.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "replaceNegatives",
  params: NUMS,
  returns: "void",
  returnKind: "arg0",
  hints: [
    "You may read and write the same array. When you look at nums[i], what decides whether you overwrite it?",
    "Loop over the indexes (not a copy of the values) and assign nums[i] = 0 whenever nums[i] < 0.",
    "for i from 0 to n - 1:\n  if nums[i] < 0:\n    nums[i] = 0",
  ],
  reference: `function replaceNegatives(nums) { for (let i = 0; i < nums.length; i++) if (nums[i] < 0) nums[i] = 0; }`,
  brute: `function replaceNegatives(nums) { const copy = nums.map((v) => Math.max(0, v)); for (let i = 0; i < copy.length; i++) nums[i] = copy[i]; }`,
  fuzz: arrayGen(1, 20, -10, 10),
  examples: [[[3, -1, 0, -5, 2]], [[-2, -2, 4]]],
  edges: [
    ["negatives", [[-1, -2, -3]]],
    ["zeros", [[0, 0, 5]], "Zeros are already non-negative and stay as they are."],
    ["single", [[-7]]],
  ],
};

const rotateRight: ProblemDef = {
  slug: "rotate-right-by-one",
  title: "Rotate an Array Right by One",
  difficulty: "Easy",
  pattern: "Simulation",
  statement: "Given an integer array `nums`, rotate it **right** by one position in place: the last element moves to the front and every other element shifts one step right. Don't return anything.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "rotateRightByOne",
  params: NUMS,
  returns: "void",
  returnKind: "arg0",
  hints: [
    "One element would be overwritten when you shift. Which one, and where can you keep it safe?",
    "Save the last element in a temporary variable, shift elements right starting from the end (so you never overwrite something you still need), then put the saved value at index 0.",
    "if n < 2: return\nlast = nums[n - 1]\nfor i from n - 1 down to 1:\n  nums[i] = nums[i - 1]\nnums[0] = last",
  ],
  reference: `function rotateRightByOne(nums) { if (nums.length < 2) return; const last = nums[nums.length - 1]; for (let i = nums.length - 1; i > 0; i--) nums[i] = nums[i - 1]; nums[0] = last; }`,
  brute: `function rotateRightByOne(nums) { if (nums.length < 2) return; const out = [nums[nums.length - 1], ...nums.slice(0, -1)]; for (let i = 0; i < out.length; i++) nums[i] = out[i]; }`,
  fuzz: arrayGen(1, 15, -20, 20),
  examples: [[[1, 2, 3, 4, 5]], [[7, 8]]],
  edges: [
    ["empty", [[]]],
    ["single", [[9]], "One element rotates onto itself."],
    ["duplicates", [[1, 1, 2]]],
  ],
};

const rotateLeft: ProblemDef = {
  slug: "left-rotate-array-by-one",
  title: "Left Rotate an Array by One",
  difficulty: "Easy",
  pattern: "Simulation",
  url: tuf("left-rotate-array-by-one"),
  statement: "Given an integer array `nums`, rotate it **left** by one position in place: the first element moves to the end and every other element shifts one step left. Don't return anything.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "rotateLeftByOne",
  params: NUMS,
  returns: "void",
  returnKind: "arg0",
  hints: [
    "Shifting left overwrites the first element. What should you save before you start?",
    "Keep nums[0] in a temporary variable, move every element one step left starting from index 1, then write the saved value into the last slot.",
    "if n < 2: return\nfirst = nums[0]\nfor i from 1 to n - 1:\n  nums[i - 1] = nums[i]\nnums[n - 1] = first",
  ],
  reference: `function rotateLeftByOne(nums) { if (nums.length < 2) return; const first = nums[0]; for (let i = 1; i < nums.length; i++) nums[i - 1] = nums[i]; nums[nums.length - 1] = first; }`,
  brute: `function rotateLeftByOne(nums) { if (nums.length < 2) return; const out = [...nums.slice(1), nums[0]]; for (let i = 0; i < out.length; i++) nums[i] = out[i]; }`,
  fuzz: arrayGen(1, 15, -20, 20),
  examples: [[[1, 2, 3, 4, 5]], [[7, 8]]],
  edges: [
    ["empty", [[]]],
    ["single", [[9]]],
    ["duplicates", [[2, 1, 1]]],
  ],
};

const appendArrays: ProblemDef = {
  slug: "merge-two-arrays",
  title: "Append One Array to Another",
  difficulty: "Easy",
  pattern: "Traversal + Build",
  statement: "Given two integer arrays `a` and `b`, return a new array with all of `a` followed by all of `b`. Build it with loops instead of `concat` or the spread operator.",
  constraints: ["0 <= a.length, b.length <= 10^4"],
  fn: "appendArrays",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "number[]",
  hints: [
    "The answer has a.length + b.length slots. In what order do the elements arrive?",
    "Create an empty result, loop over a pushing each element, then loop over b doing the same.",
    "result = empty list\nfor each value in a: append value to result\nfor each value in b: append value to result\nreturn result",
  ],
  reference: `function appendArrays(a, b) { const out = []; for (const v of a) out.push(v); for (const v of b) out.push(v); return out; }`,
  brute: `function appendArrays(a, b) { return a.concat(b); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 8), -9, 9), __arr(rand, __r(rand, 0, 8), -9, 9)];`),
  examples: [[[1, 2], [3, 4, 5]], [[9], [9]]],
  edges: [
    ["empty", [[], []]],
    ["boundary", [[], [1, 2]], "The first array is empty: the answer is just the second."],
    ["single", [[5], []]],
  ],
};

const arraysEqual: ProblemDef = {
  slug: "arrays-equal",
  title: "Check if Two Arrays are Equal",
  difficulty: "Easy",
  pattern: "Traversal + Validation",
  statement: "Given two integer arrays `a` and `b`, return `true` only if they have the same length and the same values in the same order.",
  constraints: ["0 <= a.length, b.length <= 10^4"],
  fn: "arraysEqual",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "boolean",
  hints: [
    "Before comparing elements, is there a quick check that can rule equality out?",
    "If the lengths differ, return false. Otherwise walk both arrays with one index and return false at the first position where they differ. (a === b compares references, not contents.)",
    "if length of a != length of b: return false\nfor i from 0 to n - 1:\n  if a[i] != b[i]: return false\nreturn true",
  ],
  reference: `function arraysEqual(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }`,
  brute: `function arraysEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }`,
  fuzz: gen(`const a = __arr(rand, __r(rand, 0, 5), 0, 2); const b = rand() < 0.5 ? a.slice() : __arr(rand, __r(rand, 0, 5), 0, 2); return [a, b];`),
  examples: [[[1, 2, 3], [1, 2, 3]], [[1, 2, 3], [1, 3, 2]]],
  edges: [
    ["empty", [[], []], "Two empty arrays are equal."],
    ["boundary", [[1, 2], [1, 2, 3]], "Same prefix but different lengths."],
    ["duplicates", [[2, 2, 1], [2, 1, 1]]],
  ],
};

const arrayPalindrome: ProblemDef = {
  slug: "array-palindrome",
  title: "Check if an Array is a Palindrome",
  difficulty: "Easy",
  pattern: "Palindrome",
  statement: "Given an integer array `nums`, return `true` if it reads the same from both ends (for example `[1, 2, 1]`), otherwise `false`.\n\nTry it with two pointers, one at each end, moving toward the middle.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "isArrayPalindrome",
  params: NUMS,
  returns: "boolean",
  hints: [
    "Element i must match its mirror. Which index is the mirror of i in an array of length n?",
    "Put one pointer at the start and one at the end. While they haven't crossed, compare the two values; any mismatch means false. Move both inward after each comparison.",
    "left = 0, right = n - 1\nwhile left < right:\n  if nums[left] != nums[right]: return false\n  left += 1\n  right -= 1\nreturn true",
  ],
  reference: `function isArrayPalindrome(nums) { let l = 0, r = nums.length - 1; while (l < r) { if (nums[l] !== nums[r]) return false; l++; r--; } return true; }`,
  brute: `function isArrayPalindrome(nums) { return JSON.stringify(nums) === JSON.stringify(nums.slice().reverse()); }`,
  fuzz: gen(`const h = __arr(rand, __r(rand, 0, 4), 0, 2); const mid = rand() < 0.5 ? [__r(rand, 0, 2)] : []; const a = h.concat(mid, h.slice().reverse()); if (rand() < 0.4 && a.length) a[__r(rand, 0, a.length - 1)] = __r(rand, 0, 2); return [a];`),
  examples: [[[1, 2, 3, 2, 1]], [[1, 2, 3]]],
  edges: [
    ["empty", [[]], "An empty array is a palindrome."],
    ["single", [[4]]],
    ["two", [[3, 4]]],
    ["all-equal", [[2, 2, 2, 2]]],
  ],
};

const reverseInPlace: ProblemDef = {
  slug: "reverse-array-in-place",
  title: "Reverse an Array In Place",
  difficulty: "Easy",
  pattern: "Two Pointers",
  statement: "Given an integer array `nums`, reverse it **in place** using two pointers, one starting at each end. Don't create a second array and don't return anything.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "reverseInPlace",
  params: NUMS,
  returns: "void",
  returnKind: "arg0",
  hints: [
    "The first and last elements trade places. What happens next with the second and second-to-last?",
    "Keep a left pointer at 0 and a right pointer at n - 1. Swap their values and move both inward until they meet.",
    "left = 0, right = n - 1\nwhile left < right:\n  swap nums[left] and nums[right]\n  left += 1\n  right -= 1",
  ],
  reference: `function reverseInPlace(nums) { let l = 0, r = nums.length - 1; while (l < r) { const t = nums[l]; nums[l] = nums[r]; nums[r] = t; l++; r--; } }`,
  brute: `function reverseInPlace(nums) { const c = nums.slice(); for (let i = 0; i < c.length; i++) nums[i] = c[c.length - 1 - i]; }`,
  fuzz: arrayGen(2, 20, -20, 20),
  examples: [[[1, 2, 3, 4, 5]], [[10, 20, 30, 40]]],
  edges: [
    ["two", [[1, 2]]],
    ["single", [[5]]],
    ["empty", [[]]],
  ],
};

const frequency: ProblemDef = {
  slug: "frequency-map",
  title: "Frequency of Every Number",
  difficulty: "Easy",
  pattern: "HashMap",
  statement: "Given an integer array `nums`, return a plain object that maps each distinct value to how many times it appears. For example `[1, 2, 1]` gives `{ \"1\": 2, \"2\": 1 }` (object keys are strings; key order doesn't matter).",
  constraints: ["0 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "frequencyMap",
  params: NUMS,
  returns: "Object<string, number>",
  hints: [
    "For each value you want a counter, but you don't know the values in advance. What structure creates counters on demand?",
    "Use an object (or Map) keyed by the value. For each element, set count[value] = (count[value] or 0) + 1. Return a plain object.",
    "counts = empty map\nfor each value in nums:\n  counts[value] = counts[value] (or 0) + 1\nreturn counts",
  ],
  reference: `function frequencyMap(nums) { const c = {}; for (const v of nums) c[v] = (c[v] || 0) + 1; return c; }`,
  brute: `function frequencyMap(nums) { const out = {}; for (const v of new Set(nums)) out[v] = nums.filter((x) => x === v).length; return out; }`,
  fuzz: arrayGen(0, 15, -3, 5),
  examples: [[[1, 2, 1, 3, 2, 1]], [[5, 5, 5]]],
  edges: [
    ["empty", [[]], "No elements: return an empty object."],
    ["negatives", [[-1, -1, 2]]],
    ["zeros", [[0, 0, 1]], "0 is a real key: (counts[0] || 0) handles it, but if (counts[0]) checks would skip it."],
  ],
};

const intersectUnique: ProblemDef = {
  slug: "unique-intersection",
  title: "Unique Intersection of Two Arrays",
  difficulty: "Easy",
  pattern: "Set",
  statement: "Given two integer arrays `a` and `b`, return the values that appear in **both**, each value once. The order of the result doesn't matter.",
  constraints: ["0 <= a.length, b.length <= 10^4"],
  compare: "unordered",
  fn: "intersectionUnique",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "number[]",
  hints: [
    "Checking each element of a against every element of b is O(n*m). What gives you O(1) membership tests?",
    "Put the values of b in a Set. Walk a, and when a value is in that set and you haven't output it yet, add it to the result (a second set tracks what you've output).",
    "inB = set of values in b\nseen = empty set, result = empty list\nfor each value in a:\n  if value in inB and value not in seen:\n    add value to seen\n    append value to result\nreturn result",
  ],
  reference: `function intersectionUnique(a, b) { const inB = new Set(b); const out = new Set(); for (const v of a) if (inB.has(v)) out.add(v); return [...out]; }`,
  brute: `function intersectionUnique(a, b) { const out = []; for (const v of a) if (b.includes(v) && !out.includes(v)) out.push(v); return out; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 10), 0, 8), __arr(rand, __r(rand, 0, 10), 0, 8)];`),
  examples: [[[1, 2, 2, 1], [2, 2]], [[4, 9, 5], [9, 4, 9, 8, 4]]],
  edges: [
    ["no-answer", [[1, 2], [3, 4]]],
    ["empty", [[], [1]]],
    ["duplicates", [[7, 7, 7], [7]], "7 appears once in the answer even though a repeats it."],
  ],
};

const intersectCounts: ProblemDef = {
  slug: "intersection-with-counts",
  title: "Intersection of Two Arrays with Counts",
  difficulty: "Medium",
  pattern: "HashMap",
  statement: "Given two integer arrays `a` and `b`, return their intersection **including duplicates**: a value appears in the result as many times as it appears in both arrays (the smaller of its two counts). The order of the result doesn't matter.",
  constraints: ["0 <= a.length, b.length <= 10^4"],
  compare: "unordered",
  fn: "intersectionCounts",
  params: [["a", "number[]"], ["b", "number[]"]],
  returns: "number[]",
  hints: [
    "A set forgets how many copies there are. What do you need instead to respect multiplicity?",
    "Count the values of a in a map. Walk b; whenever a value still has a positive count, output it and decrease that count.",
    "count = frequency map of a\nresult = empty list\nfor each value in b:\n  if count[value] > 0:\n    append value to result\n    count[value] -= 1\nreturn result",
  ],
  reference: `function intersectionCounts(a, b) { const c = new Map(); for (const v of a) c.set(v, (c.get(v) || 0) + 1); const out = []; for (const v of b) if (c.get(v) > 0) { out.push(v); c.set(v, c.get(v) - 1); } return out; }`,
  brute: `function intersectionCounts(a, b) { const rest = b.slice(); const out = []; for (const v of a) { const i = rest.indexOf(v); if (i >= 0) { out.push(v); rest.splice(i, 1); } } return out; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 10), 0, 5), __arr(rand, __r(rand, 0, 10), 0, 5)];`),
  examples: [[[1, 2, 2, 1], [2, 2]], [[4, 9, 5], [9, 4, 9, 8, 4]]],
  edges: [
    ["duplicates", [[3, 3, 3], [3, 3]], "3 is shared twice: the smaller count wins."],
    ["no-answer", [[1], [2]]],
    ["empty", [[], []]],
  ],
};

const firstUnique: ProblemDef = {
  slug: "first-non-repeating-element",
  title: "First Element that Appears Exactly Once",
  difficulty: "Easy",
  pattern: "HashMap",
  statement: "Given an integer array `nums`, return the **first** element (from the left) that appears exactly once in the whole array. If no element is unique, return `null`.",
  constraints: ["0 <= nums.length <= 10^4"],
  fn: "firstUnique",
  params: NUMS,
  returns: "number | null",
  hints: [
    "Whether an element is unique depends on the whole array, not just what you've seen so far. How many passes does that suggest?",
    "First pass: count every value. Second pass in the original order: return the first value whose count is 1.",
    "count = frequency map of nums\nfor each value in nums:\n  if count[value] == 1: return value\nreturn null",
  ],
  reference: `function firstUnique(nums) { const c = new Map(); for (const v of nums) c.set(v, (c.get(v) || 0) + 1); for (const v of nums) if (c.get(v) === 1) return v; return null; }`,
  brute: `function firstUnique(nums) { for (const v of nums) if (nums.indexOf(v) === nums.lastIndexOf(v)) return v; return null; }`,
  fuzz: arrayGen(0, 12, 0, 6),
  examples: [[[4, 5, 1, 2, 0, 4]], [[2, 3, 2, 3, 9]]],
  edges: [
    ["no-answer", [[1, 1, 2, 2]], "Every value repeats: return null."],
    ["single", [[8]]],
    ["empty", [[]]],
    ["zeros", [[0, 1, 1]], "0 is a valid answer; a truthiness check would skip it."],
  ],
};

const windowGen = gen(`const n = __r(rand, 1, 14); return [__arr(rand, n, -10, 10), __r(rand, 1, n)];`);

const maxSumK: ProblemDef = {
  slug: "max-sum-subarray-size-k",
  title: "Maximum Sum Subarray of Size K",
  difficulty: "Easy",
  pattern: "Fixed Sliding Window",
  statement: "Given an integer array `nums` and an integer `k`, return the maximum sum of any **contiguous** subarray of exactly `k` elements.",
  constraints: ["1 <= k <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  fn: "maxSumK",
  params: NUMS_K,
  returns: "number",
  hints: [
    "Recomputing each window from scratch is O(n*k). Two neighbouring windows share almost all their elements; what changes between them?",
    "Sum the first k elements. Then slide: add the element entering on the right and subtract the one leaving on the left, updating the best sum each time.",
    "window = sum of nums[0..k-1]\nbest = window\nfor i from k to n - 1:\n  window = window + nums[i] - nums[i - k]\n  best = max(best, window)\nreturn best",
  ],
  reference: `function maxSumK(nums, k) { let w = 0; for (let i = 0; i < k; i++) w += nums[i]; let best = w; for (let i = k; i < nums.length; i++) { w += nums[i] - nums[i - k]; if (w > best) best = w; } return best; }`,
  brute: `function maxSumK(nums, k) { let best = -Infinity; for (let i = 0; i + k <= nums.length; i++) { let s = 0; for (let j = i; j < i + k; j++) s += nums[j]; best = Math.max(best, s); } return best; }`,
  fuzz: windowGen,
  examples: [[[2, 1, 5, 1, 3, 2], 3], [[2, 3, 4, 1, 5], 2]],
  edges: [
    ["negatives", [[-5, -2, -8, -1], 2], "All negative: starting best at 0 would be wrong."],
    ["min-size", [[4, -1, 7], 1], "k = 1 is just the largest element."],
    ["boundary", [[1, 2, 3], 3], "k = n: the only window is the whole array."],
  ],
};

const minSumK: ProblemDef = {
  ...maxSumK,
  slug: "min-sum-subarray-size-k",
  title: "Minimum Sum Subarray of Size K",
  statement: "Given an integer array `nums` and an integer `k`, return the minimum sum of any **contiguous** subarray of exactly `k` elements.",
  fn: "minSumK",
  hints: [
    "Same window as the maximum version; only the comparison flips. What stays constant between neighbouring windows?",
    "Build the first window's sum, then slide it one step at a time (add the new element, drop the old one) and keep the smallest sum seen.",
    "window = sum of nums[0..k-1]\nbest = window\nfor i from k to n - 1:\n  window = window + nums[i] - nums[i - k]\n  best = min(best, window)\nreturn best",
  ],
  reference: `function minSumK(nums, k) { let w = 0; for (let i = 0; i < k; i++) w += nums[i]; let best = w; for (let i = k; i < nums.length; i++) { w += nums[i] - nums[i - k]; if (w < best) best = w; } return best; }`,
  brute: `function minSumK(nums, k) { let best = Infinity; for (let i = 0; i + k <= nums.length; i++) { let s = 0; for (let j = i; j < i + k; j++) s += nums[j]; best = Math.min(best, s); } return best; }`,
  examples: [[[2, 1, 5, 1, 3, 2], 3], [[4, 2, 3, 1, 5], 2]],
  edges: [
    ["min-size", [[4, -1, 7], 1]],
    ["boundary", [[1, 2, 3], 3]],
    ["all-equal", [[2, 2, 2, 2], 2]],
  ],
};

const maxEvens: ProblemDef = {
  slug: "max-evens-in-window",
  title: "Most Even Numbers in a Window of Size K",
  difficulty: "Easy",
  pattern: "Fixed Sliding Window",
  statement: "Given an integer array `nums` and an integer `k`, return the largest number of **even** values contained in any contiguous window of exactly `k` elements.",
  constraints: ["1 <= k <= nums.length <= 10^5"],
  fn: "maxEvensInWindow",
  params: NUMS_K,
  returns: "number",
  hints: [
    "Instead of a window sum, keep a window count. How does the count change when the window slides by one?",
    "Count evens in the first k elements. When sliding, add 1 if the entering element is even and subtract 1 if the leaving element is even; track the best count.",
    "count = evens among nums[0..k-1]\nbest = count\nfor i from k to n - 1:\n  if nums[i] is even: count += 1\n  if nums[i - k] is even: count -= 1\n  best = max(best, count)\nreturn best",
  ],
  reference: `function maxEvensInWindow(nums, k) { const ev = (v) => (v % 2 === 0 ? 1 : 0); let c = 0; for (let i = 0; i < k; i++) c += ev(nums[i]); let best = c; for (let i = k; i < nums.length; i++) { c += ev(nums[i]) - ev(nums[i - k]); best = Math.max(best, c); } return best; }`,
  brute: `function maxEvensInWindow(nums, k) { let best = 0; for (let i = 0; i + k <= nums.length; i++) best = Math.max(best, nums.slice(i, i + k).filter((v) => Math.abs(v) % 2 === 0).length); return best; }`,
  fuzz: windowGen,
  examples: [[[1, 2, 4, 3, 6, 8], 3], [[1, 3, 5, 2], 2]],
  edges: [
    ["no-answer", [[1, 3, 5, 7], 2], "No even numbers at all: the answer is 0."],
    ["zeros", [[0, 1, 0], 2], "0 is even."],
    ["negatives", [[-2, -3, -4, -6], 3]],
  ],
};

const windowStarts: ProblemDef = {
  slug: "windows-with-target-sum",
  title: "Windows of Size K with a Target Sum",
  difficulty: "Medium",
  pattern: "Fixed Sliding Window",
  statement: "Given an integer array `nums`, an integer `k` and an integer `target`, return the starting indexes (in increasing order) of every contiguous window of exactly `k` elements whose sum equals `target`.",
  constraints: ["1 <= k <= nums.length <= 10^5"],
  fn: "windowStarts",
  params: [["nums", "number[]"], ["k", "number"], ["target", "number"]],
  returns: "number[]",
  hints: [
    "You need every window, not just the best one. What do you record when a window matches?",
    "Slide a running window sum across the array. After each step, if the sum equals target, push the window's starting index (i - k + 1).",
    "sum = 0, result = empty list\nfor i from 0 to n - 1:\n  sum += nums[i]\n  if i >= k: sum -= nums[i - k]\n  if i >= k - 1 and sum == target:\n    append i - k + 1 to result\nreturn result",
  ],
  reference: `function windowStarts(nums, k, target) { const out = []; let s = 0; for (let i = 0; i < nums.length; i++) { s += nums[i]; if (i >= k) s -= nums[i - k]; if (i >= k - 1 && s === target) out.push(i - k + 1); } return out; }`,
  brute: `function windowStarts(nums, k, target) { const out = []; for (let i = 0; i + k <= nums.length; i++) if (nums.slice(i, i + k).reduce((a, b) => a + b, 0) === target) out.push(i); return out; }`,
  fuzz: gen(`const n = __r(rand, 1, 12); return [__arr(rand, n, -3, 3), __r(rand, 1, n), __r(rand, -4, 4)];`),
  examples: [[[1, 2, 3, 0, 3, 2, 1], 2, 3], [[4, 1, 1, 4], 3, 6]],
  edges: [
    ["no-answer", [[1, 1, 1], 2, 5]],
    ["all-equal", [[2, 2, 2, 2], 2, 4], "Every window matches, so every start index is returned."],
    ["negatives", [[-1, 1, -1, 1], 2, 0]],
  ],
};

const longestAtMostK: ProblemDef = {
  slug: "longest-subarray-sum-at-most-k",
  title: "Longest Subarray with Sum at Most K",
  difficulty: "Medium",
  pattern: "Variable Sliding Window",
  statement: "Given an array of **positive** integers `nums` and an integer `k`, return the length of the longest contiguous subarray whose sum is **at most** `k`. Return `0` if no single element fits.",
  constraints: ["1 <= nums.length <= 10^5", "1 <= nums[i] <= 10^4", "0 <= k <= 10^9"],
  fn: "longestAtMostK",
  params: NUMS_K,
  returns: "number",
  hints: [
    "With only positive numbers, adding an element can only grow a sum and removing one can only shrink it. How does that let a window grow and shrink?",
    "Expand the right end one step at a time and add its value. While the sum exceeds k, shrink from the left. After that, the window is valid; record its length.",
    "left = 0, sum = 0, best = 0\nfor right from 0 to n - 1:\n  sum += nums[right]\n  while sum > k:\n    sum -= nums[left]\n    left += 1\n  best = max(best, right - left + 1)\nreturn best",
  ],
  reference: `function longestAtMostK(nums, k) { let l = 0, s = 0, best = 0; for (let r = 0; r < nums.length; r++) { s += nums[r]; while (s > k) s -= nums[l++]; best = Math.max(best, r - l + 1); } return best; }`,
  brute: `function longestAtMostK(nums, k) { let best = 0; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s <= k) best = Math.max(best, j - i + 1); } } return best; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 14), 1, 9), __r(rand, 0, 25)];`),
  examples: [[[3, 1, 2, 7, 4, 2, 1, 1, 5], 8], [[1, 2, 3], 6]],
  edges: [
    ["no-answer", [[5, 6, 7], 4], "Every element alone exceeds k: the answer is 0."],
    ["boundary", [[2, 2, 2], 6], "The whole array fits exactly."],
    ["single", [[3], 3]],
  ],
};

const longestOdds: ProblemDef = {
  slug: "longest-subarray-at-most-k-odds",
  title: "Longest Subarray with at Most K Odd Numbers",
  difficulty: "Medium",
  pattern: "Variable Sliding Window",
  statement: "Given an integer array `nums` and an integer `k`, return the length of the longest contiguous subarray containing **at most** `k` odd numbers.",
  constraints: ["1 <= nums.length <= 10^5", "0 <= k <= nums.length"],
  fn: "longestAtMostKOdd",
  params: NUMS_K,
  returns: "number",
  hints: [
    "Only the odd elements are constrained. What do you need to count inside the window?",
    "Grow the window to the right, counting odd numbers. When the count goes above k, move the left end forward (decreasing the count when an odd number leaves) until it's back to k.",
    "left = 0, odd = 0, best = 0\nfor right from 0 to n - 1:\n  if nums[right] is odd: odd += 1\n  while odd > k:\n    if nums[left] is odd: odd -= 1\n    left += 1\n  best = max(best, right - left + 1)\nreturn best",
  ],
  reference: `function longestAtMostKOdd(nums, k) { const odd = (v) => (Math.abs(v) % 2 === 1 ? 1 : 0); let l = 0, c = 0, best = 0; for (let r = 0; r < nums.length; r++) { c += odd(nums[r]); while (c > k) c -= odd(nums[l++]); best = Math.max(best, r - l + 1); } return best; }`,
  brute: `function longestAtMostKOdd(nums, k) { let best = 0; for (let i = 0; i < nums.length; i++) { let c = 0; for (let j = i; j < nums.length; j++) { if (nums[j] % 2 !== 0) c++; if (c <= k) best = Math.max(best, j - i + 1); } } return best; }`,
  fuzz: gen(`const n = __r(rand, 1, 14); return [__arr(rand, n, -6, 9), __r(rand, 0, 4)];`),
  examples: [[[1, 2, 3, 4, 5, 6], 1], [[2, 4, 1, 6, 3, 8], 2]],
  edges: [
    ["zeros", [[1, 3, 5], 0], "k = 0: the window may hold no odd numbers at all."],
    ["boundary", [[2, 4, 6], 0], "No odd numbers: the whole array qualifies."],
    ["negatives", [[-1, 2, -3, 4], 1], "-3 % 2 is -1 in JavaScript, so test oddness with !== 0."],
  ],
};

const rangeSums: ProblemDef = {
  slug: "range-sum-queries",
  title: "Range Sum Queries with a Prefix Array",
  difficulty: "Easy",
  pattern: "Prefix Sum",
  statement: "Given an integer array `nums` and a list of `queries`, where each query is `[left, right]` (0-based, inclusive), return an array with the sum of `nums[left..right]` for each query.\n\nBuild a prefix-sum array once so each query is answered in O(1).",
  constraints: ["1 <= nums.length <= 10^5", "1 <= queries.length <= 10^5", "0 <= left <= right < nums.length"],
  fn: "rangeSums",
  params: [["nums", "number[]"], ["queries", "number[][]"]],
  returns: "number[]",
  hints: [
    "Summing each range directly is O(n) per query. What could you precompute so every range sum becomes a subtraction?",
    "Let prefix[i] be the sum of the first i elements (prefix[0] = 0). Then the sum of nums[l..r] is prefix[r + 1] - prefix[l].",
    "prefix = [0]\nfor each value in nums:\n  append (last of prefix + value) to prefix\nresult = empty list\nfor each [l, r] in queries:\n  append prefix[r + 1] - prefix[l] to result\nreturn result",
  ],
  reference: `function rangeSums(nums, queries) { const p = [0]; for (const v of nums) p.push(p[p.length - 1] + v); return queries.map(([l, r]) => p[r + 1] - p[l]); }`,
  brute: `function rangeSums(nums, queries) { return queries.map(([l, r]) => { let s = 0; for (let i = l; i <= r; i++) s += nums[i]; return s; }); }`,
  fuzz: gen(`const n = __r(rand, 1, 10); const a = __arr(rand, n, -9, 9); const q = Array.from({ length: __r(rand, 1, 5) }, () => { const x = __r(rand, 0, n - 1), y = __r(rand, 0, n - 1); return [Math.min(x, y), Math.max(x, y)]; }); return [a, q];`),
  examples: [[[1, 2, 3, 4, 5], [[0, 2], [1, 3], [4, 4]]], [[-2, 0, 3, -5, 2, -1], [[0, 5], [2, 3]]]],
  edges: [
    ["single", [[7], [[0, 0]]]],
    ["boundary", [[3, 1, 4, 1, 5], [[0, 4], [0, 0], [4, 4]]], "Ranges that start at 0 or end at n - 1 use the first and last prefix entries."],
    ["negatives", [[-1, -2, -3], [[0, 1], [1, 2]]]],
  ],
};

const threeSumTarget: ProblemDef = {
  slug: "three-sum-target",
  title: "Unique Triplets with a Target Sum",
  difficulty: "Hard",
  pattern: "Hashing + Sorting + Two Pointers",
  statement: "Given an integer array `nums` and an integer `target`, return all **unique** triplets of values `[a, b, c]` taken from three different positions such that `a + b + c == target`. Triplets are unique by their values; the order of triplets and of values inside a triplet doesn't matter.",
  constraints: ["0 <= nums.length <= 3000", "-10^5 <= nums[i], target <= 10^5"],
  compare: "unordered",
  fn: "threeSumTarget",
  params: NUMS_TARGET,
  returns: "number[][]",
  hints: [
    "Fixing one value turns the rest into a pair-sum problem. What makes pair sums easy, and how do you avoid repeated triplets?",
    "Sort the array. For each index i (skipping values equal to the previous one), run two pointers on the rest looking for target - nums[i]. After a match, move both pointers past duplicates.",
    "sort nums\nfor i from 0 to n - 3:\n  if i > 0 and nums[i] == nums[i - 1]: continue\n  l = i + 1, r = n - 1\n  while l < r:\n    s = nums[i] + nums[l] + nums[r]\n    if s == target: record triplet, move l and r past duplicates\n    else if s < target: l += 1\n    else: r -= 1\nreturn the recorded triplets",
  ],
  reference: `function threeSumTarget(nums, target) {
    const a = nums.slice().sort((x, y) => x - y); const out = [];
    for (let i = 0; i < a.length - 2; i++) {
      if (i > 0 && a[i] === a[i - 1]) continue;
      let l = i + 1, r = a.length - 1;
      while (l < r) {
        const s = a[i] + a[l] + a[r];
        if (s === target) { out.push([a[i], a[l], a[r]]); while (l < r && a[l] === a[l + 1]) l++; while (l < r && a[r] === a[r - 1]) r--; l++; r--; }
        else if (s < target) l++; else r--;
      }
    }
    return out;
  }`,
  brute: `function threeSumTarget(nums, target) {
    const seen = new Set(); const out = [];
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) for (let k = j + 1; k < nums.length; k++) {
      if (nums[i] + nums[j] + nums[k] !== target) continue;
      const t = [nums[i], nums[j], nums[k]].sort((x, y) => x - y); const key = t.join(",");
      if (!seen.has(key)) { seen.add(key); out.push(t); }
    }
    return out;
  }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 10), -5, 5), __r(rand, -4, 4)];`),
  examples: [[[1, 0, -1, 2, -1, -4], 0], [[2, 3, 1, 4, 5, 0], 6]],
  edges: [
    ["duplicates", [[2, 2, 2, 2], 6], "Many equal values: [2, 2, 2] must appear only once."],
    ["no-answer", [[1, 2, 3], 100]],
    ["empty", [[], 0]],
  ],
};

const minAbsDiff: ProblemDef = {
  slug: "minimum-absolute-difference",
  title: "Minimum Absolute Difference",
  difficulty: "Easy",
  pattern: "Sorting + Greedy",
  leetcodeId: 1200,
  fn: "minimumAbsDifference",
  params: [["arr", "number[]"]],
  returns: "number[][]",
  hints: [
    "After sorting, where can the closest pair of values be? Do you need to compare every pair?",
    "Sort the array. The minimum difference is between some pair of neighbours, so one scan finds it, and a second scan collects every neighbouring pair with that difference (already in ascending order).",
    "sort arr\nbest = smallest arr[i + 1] - arr[i] over all i\nresult = empty list\nfor i from 0 to n - 2:\n  if arr[i + 1] - arr[i] == best:\n    append [arr[i], arr[i + 1]] to result\nreturn result",
  ],
  reference: `function minimumAbsDifference(arr) { const a = arr.slice().sort((x, y) => x - y); let best = Infinity; for (let i = 1; i < a.length; i++) best = Math.min(best, a[i] - a[i - 1]); const out = []; for (let i = 1; i < a.length; i++) if (a[i] - a[i - 1] === best) out.push([a[i - 1], a[i]]); return out; }`,
  brute: `function minimumAbsDifference(arr) { let best = Infinity; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) best = Math.min(best, Math.abs(arr[i] - arr[j])); const out = []; for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) if (arr[j] - arr[i] === best && i !== j) out.push([arr[i], arr[j]]); return out.sort((x, y) => x[0] - y[0]); }`,
  fuzz: gen(`const n = __r(rand, 2, 10); const pool = __shuffle(rand, Array.from({ length: 40 }, (_, i) => i - 20)); return [pool.slice(0, n)];`),
  examples: [[[4, 2, 1, 3]], [[1, 3, 6, 10, 15]]],
  edges: [
    ["two", [[5, -5]], "Exactly one pair exists."],
    ["negatives", [[-7, -3, -1, -10]]],
    ["reverse-sorted", [[9, 7, 5, 3, 1]], "Every neighbouring gap ties at 2, so every pair is returned in ascending order."],
  ],
};

/** Array Ladder (A01-A60) problems that aren't already in PrepOS. */
export const LADDER_ARRAYS_DEFS: ProblemDef[] = [
  sumArray, largest, countEven, linearSearch, smallest, countGreater, sumGreater, reverseCopy, positives, isSorted,
  secondLargest, sumOddIdx, lastOcc, countSigns, range, sumEvenIdx, replaceNeg, rotateRight, rotateLeft, appendArrays,
  arraysEqual, arrayPalindrome, reverseInPlace, frequency, intersectUnique, intersectCounts, firstUnique,
  maxSumK, minSumK, maxEvens, windowStarts, longestAtMostK, longestOdds, rangeSums, threeSumTarget, minAbsDiff,
];

/** Recursive takes on ladder problems that Striver A2Z lists separately. */
export const LADDER_RECURSIVE_DEFS: ProblemDef[] = [
  variant(sumArray, {
    slug: "sum-of-array-elements-recursive",
    title: "Sum of Array Elements (Recursion)",
    url: tuf("sum-of-array-elements-ii"),
    statement: "Given an integer array `nums`, return the sum of its elements **using recursion** instead of a loop: the sum of an array is its first element plus the sum of the rest, and an empty array sums to `0`.",
    hints: [
      "Describe the answer for an array in terms of the answer for a smaller array. What is the smallest array whose sum you know immediately?",
      "Recurse on an index: sum(i) = nums[i] + sum(i + 1), with sum(n) = 0. Passing an index avoids copying the array with slice on every call.",
      "solve(i):\n  if i == n: return 0\n  return nums[i] + solve(i + 1)\nreturn solve(0)",
    ],
    reference: `function sumArray(nums) { const go = (i) => (i === nums.length ? 0 : nums[i] + go(i + 1)); return go(0); }`,
  }),
  variant(reverseCopy, {
    slug: "reverse-array-recursive",
    title: "Reverse an Array (Recursion)",
    url: tuf("reverse-an-array-ii"),
    statement: "Given an integer array `nums`, return a new array with its elements reversed, **using recursion**: swap the outer pair, then reverse what's left in between.",
    hints: [
      "Reversing a whole array is swapping its two ends and then reversing the inside. When does the recursion stop?",
      "Copy nums, then recurse with two indexes l and r: swap copy[l] and copy[r], then recurse on l + 1 and r - 1, stopping when l >= r.",
      "copy = a copy of nums\nsolve(l, r):\n  if l >= r: return\n  swap copy[l] and copy[r]\n  solve(l + 1, r - 1)\nsolve(0, n - 1)\nreturn copy",
    ],
    reference: `function reverseArray(nums) { const c = nums.slice(); const go = (l, r) => { if (l >= r) return; const t = c[l]; c[l] = c[r]; c[r] = t; go(l + 1, r - 1); }; go(0, c.length - 1); return c; }`,
  }),
];

export const LADDER_ARRAYS = [...LADDER_ARRAYS_DEFS, ...LADDER_RECURSIVE_DEFS].map(define);
