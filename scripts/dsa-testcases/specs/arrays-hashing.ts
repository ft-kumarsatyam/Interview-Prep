import type { ProblemSpec } from "../types";

export const ARRAYS_HASHING: ProblemSpec[] = [
  {
    slug: "two-sum",
    functionName: "twoSum",
    params: ["nums", "target"],
    returnType: "number[]",
    compare: "unordered",
    starter: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  \n}",
    hints: [
      "Fix one number x. What would you need to find in the rest of the array, and how quickly can you look a value up?",
      "Scan once while remembering every value you've passed in a hash map (value to index). For each x, check whether target - x is already in the map before you add x.",
      "seen = empty map\nfor i from 0 to n - 1:\n  need = target - nums[i]\n  if need is in seen: return [seen[need], i]\n  seen[nums[i]] = i",
    ],
    reference: `function twoSum(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        const need = target - nums[i];
        if (seen.has(need)) return [seen.get(need), i];
        seen.set(nums[i], i);
      }
      return [];
    }`,
    brute: `function twoSum(nums, target) {
      for (let i = 0; i < nums.length; i++)
        for (let j = i + 1; j < nums.length; j++)
          if (nums[i] + nums[j] === target) return [i, j];
      return [];
    }`,
    // Distinct values with exactly one valid pair, as the problem promises.
    fuzz: `function gen(rand) {
      for (;;) {
        const n = 2 + Math.floor(rand() * 7);
        const pool = Array.from({ length: 41 }, (_, i) => i - 20);
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const nums = pool.slice(0, n);
        const a = Math.floor(rand() * n);
        let b = Math.floor(rand() * n);
        if (a === b) b = (b + 1) % n;
        const target = nums[a] + nums[b];
        let pairs = 0;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (nums[i] + nums[j] === target) pairs++;
        if (pairs === 1) return [nums, target];
      }
    }`,
    cases: [
      { input: [[2, 7, 11, 15], 9], hidden: false },
      { input: [[3, 2, 4], 6], hidden: false },
      { input: [[3, 3], 6], hidden: false, edge: "duplicates", note: "Two equal values sit at different indices, so both are usable." },
      { input: [[-1, -2, -3, -4, -5], -8], hidden: false, edge: "negatives", note: "Negative numbers and a negative target: don't assume the sum grows." },
      { input: [[0, 4, 3, 0], 0], hidden: false, edge: "zeros", note: "0 + 0 = 0. A check like if (map[need]) would wrongly skip index 0." },
      { input: [[1, 5, 8, 3], 4], hidden: true, edge: "boundary", note: "The answer is the first and the last element." },
      { input: [[1, 2], 3], hidden: true, edge: "two" },
      { input: [[-10, 7, 19, 15], 9], hidden: true },
      { input: [[5, 75, 25], 100], hidden: true },
      { input: [[1000000000, -1000000000, 3], 0], hidden: true, edge: "extremes" },
      { input: [[2, 5, 5, 11], 10], hidden: true, edge: "duplicates", note: "The pair is two 5s in the middle." },
    ],
  },
  {
    slug: "contains-duplicate",
    functionName: "containsDuplicate",
    params: ["nums"],
    returnType: "boolean",
    starter: "/**\n * @param {number[]} nums\n * @return {boolean}\n */\nfunction containsDuplicate(nums) {\n  \n}",
    hints: [
      "Do you need to know how many times each value appears, or only whether you have seen it before?",
      "Keep a Set of values seen so far. If the current value is already in it, you're done; otherwise add it. One pass, O(n) time.",
      "seen = empty set\nfor x in nums:\n  if x is in seen: return true\n  add x to seen\nreturn false",
    ],
    reference: `function containsDuplicate(nums) { return new Set(nums).size !== nums.length; }`,
    brute: `function containsDuplicate(nums) {
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] === nums[j]) return true;
      return false;
    }`,
    fuzz: `function gen(rand) { const n = Math.floor(rand() * 9); return [Array.from({ length: n }, () => Math.floor(rand() * 7))]; }`,
    cases: [
      { input: [[1, 2, 3, 1]], hidden: false },
      { input: [[1, 2, 3, 4]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "One element can't be a duplicate of anything." },
      { input: [[7, 7, 7, 7]], hidden: false, edge: "all-equal" },
      { input: [[0, -1, 0]], hidden: false, edge: "zeros", note: "0 is falsy: use Set.has, not a truthiness check on a lookup table." },
      { input: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], hidden: true },
      { input: [[-1, -2, -3]], hidden: true, edge: "negatives" },
      { input: [[2, 14, 18, 22, 22]], hidden: true, edge: "boundary", note: "The duplicate is the last pair." },
      { input: [[1, 5, -2, -4, 0]], hidden: true },
      { input: [[1000000000, -1000000000, 1000000000]], hidden: true, edge: "extremes" },
      { input: [[...Array.from({ length: 300 }, (_, i) => i), 299]], hidden: true, edge: "large", note: "300 values with the only duplicate at the very end: a nested loop gets slow." },
    ],
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    functionName: "maxProfit",
    params: ["prices"],
    returnType: "number",
    starter: "/**\n * @param {number[]} prices\n * @return {number}\n */\nfunction maxProfit(prices) {\n  \n}",
    hints: [
      "For a fixed selling day, which buying day would you wish you had picked?",
      "Walk left to right, tracking the lowest price seen so far. If you sold today, the profit would be price minus that lowest; keep the maximum of those.",
      "lowest = infinity\nbest = 0\nfor p in prices:\n  lowest = min(lowest, p)\n  best = max(best, p - lowest)\nreturn best",
    ],
    reference: `function maxProfit(prices) {
      let min = Infinity, best = 0;
      for (const p of prices) { if (p < min) min = p; else if (p - min > best) best = p - min; }
      return best;
    }`,
    brute: `function maxProfit(prices) {
      let best = 0;
      for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) best = Math.max(best, prices[j] - prices[i]);
      return best;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 8); return [Array.from({ length: n }, () => Math.floor(rand() * 11))]; }`,
    cases: [
      { input: [[7, 1, 5, 3, 6, 4]], hidden: false },
      { input: [[7, 6, 4, 3, 1]], hidden: false },
      { input: [[5]], hidden: false, edge: "single", note: "You can't sell before you buy: with one price the profit is 0." },
      { input: [[3, 3, 3]], hidden: false, edge: "all-equal", note: "No day is better than another: the answer is 0, not negative." },
      { input: [[1, 2, 3, 4, 5]], hidden: false, edge: "sorted", note: "Buy on day one, sell on the last day." },
      { input: [[2, 4]], hidden: true, edge: "two" },
      { input: [[2, 4, 1]], hidden: true },
      { input: [[3, 2, 6, 5, 0, 3]], hidden: true },
      { input: [[2, 1, 2, 1, 0, 1, 2]], hidden: true },
      { input: [[10000, 0, 10000]], hidden: true, edge: "extremes" },
      { input: [[9, 7, 5, 3]], hidden: true, edge: "reverse-sorted" },
    ],
  },
  {
    slug: "maximum-subarray",
    functionName: "maxSubArray",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxSubArray(nums) {\n  \n}",
    hints: [
      "If you knew the best subarray sum that ends at the previous position, what is the best sum that ends at this one?",
      "Kadane's algorithm: keep the best sum of a subarray ending here. Either extend the previous one or start fresh at this element, whichever is larger, and track the overall maximum.",
      "cur = nums[0]\nbest = nums[0]\nfor x in nums[1:]:\n  cur = max(x, cur + x)\n  best = max(best, cur)\nreturn best",
    ],
    reference: `function maxSubArray(nums) {
      let best = nums[0], cur = nums[0];
      for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
      return best;
    }`,
    brute: `function maxSubArray(nums) {
      let best = -Infinity;
      for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; best = Math.max(best, s); } }
      return best;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 8); return [Array.from({ length: n }, () => Math.floor(rand() * 11) - 5)]; }`,
    cases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], hidden: false },
      { input: [[1]], hidden: false },
      { input: [[-3, -1, -2]], hidden: false, edge: "negatives", note: "Every number is negative: the best subarray is a single element, so don't start 'best' at 0." },
      { input: [[-5]], hidden: false, edge: "single" },
      { input: [[0, 0, 0]], hidden: false, edge: "zeros" },
      { input: [[5, 4, -1, 7, 8]], hidden: true },
      { input: [[-2, -1]], hidden: true, edge: "two" },
      { input: [[1, -1, 1, -1, 1]], hidden: true },
      { input: [[8, -19, 5, -4, 20]], hidden: true, note: "A long negative dip: restart instead of carrying the debt." , edge: "negatives" },
      { input: [[10000, -10000, 10000]], hidden: true, edge: "extremes" },
      { input: [[-1, 0, -2]], hidden: true, edge: "zeros", note: "The best sum is 0, from the lone zero." },
    ],
  },
  {
    slug: "single-number",
    functionName: "singleNumber",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction singleNumber(nums) {\n  \n}",
    hints: [
      "Every other number comes in a pair. Is there an operation where a value combined with itself cancels out?",
      "XOR has x ^ x = 0 and x ^ 0 = x, and the order doesn't matter. XOR every number together: the pairs vanish and the single number is left. O(n) time, O(1) space.",
      "result = 0\nfor x in nums:\n  result = result XOR x\nreturn result",
    ],
    reference: `function singleNumber(nums) { return nums.reduce((a, b) => a ^ b, 0); }`,
    brute: `function singleNumber(nums) {
      const count = new Map();
      for (const x of nums) count.set(x, (count.get(x) || 0) + 1);
      for (const [k, v] of count) if (v === 1) return k;
    }`,
    fuzz: `function gen(rand) {
      const pairs = Math.floor(rand() * 4);
      const pool = Array.from({ length: 21 }, (_, i) => i - 10);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const nums = [pool[0]];
      for (let i = 1; i <= pairs; i++) nums.push(pool[i], pool[i]);
      for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
      return [nums];
    }`,
    cases: [
      { input: [[2, 2, 1]], hidden: false },
      { input: [[4, 1, 2, 1, 2]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "No pairs at all." },
      { input: [[-1, -1, -2]], hidden: false, edge: "negatives", note: "XOR works on negatives too; a value-to-count table with array indices would not." },
      { input: [[0, 1, 0]], hidden: false, edge: "zeros", note: "The pair is made of zeros." },
      { input: [[1, 0, 1]], hidden: true, edge: "zeros", note: "The single number is 0: a result of 0 must not look like 'not found'." },
      { input: [[7, 3, 5, 3, 5]], hidden: true },
      { input: [[30000, -30000, 30000]], hidden: true, edge: "extremes" },
      { input: [[1, 1, 2, 2, 3]], hidden: true, edge: "boundary", note: "The single number is last." },
      { input: [[-3, -3, -5, -5, -7]], hidden: true },
      { input: [[...Array.from({ length: 200 }, (_, i) => i + 1), ...Array.from({ length: 200 }, (_, i) => i + 1), 999]], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "missing-number",
    functionName: "missingNumber",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction missingNumber(nums) {\n  \n}",
    hints: [
      "The numbers should be 0 through n. What would their total be if none were missing?",
      "The sum of 0..n is n * (n + 1) / 2. Subtract the actual sum of the array: the difference is the missing number. (XOR with the indices works too.)",
      "n = length of nums\nexpected = n * (n + 1) / 2\nreturn expected - sum of nums",
    ],
    reference: `function missingNumber(nums) { const n = nums.length; return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0); }`,
    brute: `function missingNumber(nums) { const s = new Set(nums); for (let i = 0; i <= nums.length; i++) if (!s.has(i)) return i; }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      const all = Array.from({ length: n + 1 }, (_, i) => i);
      const missing = Math.floor(rand() * (n + 1));
      const nums = all.filter((x) => x !== missing);
      for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
      return [nums];
    }`,
    cases: [
      { input: [[3, 0, 1]], hidden: false },
      { input: [[0, 1]], hidden: false },
      { input: [[0]], hidden: false, edge: "single", note: "One number present, so n = 1 and the missing one is 1." },
      { input: [[1]], hidden: false, edge: "boundary", note: "The missing number is 0, the smallest possible." },
      { input: [[0, 1, 2, 3]], hidden: false, edge: "boundary", note: "Everything from 0 to n-1 is present: the missing number is n itself." },
      { input: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], hidden: true },
      { input: [[1, 2]], hidden: true },
      { input: [[0, 2]], hidden: true },
      { input: [[2, 0, 1]], hidden: true },
      { input: [[...Array.from({ length: 301 }, (_, i) => i).filter((x) => x !== 150)]], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "majority-element",
    functionName: "majorityElement",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction majorityElement(nums) {\n  \n}",
    hints: [
      "The majority element appears more than half the time. If you cancelled it against every other element one for one, what would be left standing?",
      "Boyer-Moore voting: keep a candidate and a counter. Same value as the candidate adds one, a different value subtracts one, and at zero you adopt the current value. The majority element survives.",
      "candidate = none; count = 0\nfor x in nums:\n  if count == 0: candidate = x\n  if x == candidate: count += 1\n  else: count -= 1\nreturn candidate",
    ],
    reference: `function majorityElement(nums) { let c = 0, cand = null; for (const n of nums) { if (c === 0) cand = n; c += n === cand ? 1 : -1; } return cand; }`,
    brute: `function majorityElement(nums) {
      const count = new Map();
      for (const x of nums) count.set(x, (count.get(x) || 0) + 1);
      for (const [k, v] of count) if (v > nums.length / 2) return k;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + 2 * Math.floor(rand() * 5);
      const major = Math.floor(rand() * 7) - 3;
      const need = Math.floor(n / 2) + 1;
      const nums = Array(need).fill(major);
      while (nums.length < n) { let v = Math.floor(rand() * 7) - 3; if (v === major) v = major + 4; nums.push(v); }
      for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
      return [nums];
    }`,
    cases: [
      { input: [[3, 2, 3]], hidden: false },
      { input: [[2, 2, 1, 1, 1, 2, 2]], hidden: false },
      { input: [[1]], hidden: false, edge: "single" },
      { input: [[5, 5, 5]], hidden: false, edge: "all-equal" },
      { input: [[-1, -1, 2]], hidden: false, edge: "negatives" },
      { input: [[6, 5, 5]], hidden: true, edge: "boundary", note: "The majority only shows up after the first element." },
      { input: [[1, 1, 2, 2, 2]], hidden: true },
      { input: [[3, 3, 4]], hidden: true },
      { input: [[8, 8, 7, 7, 7]], hidden: true },
      { input: [[1000000000, -1000000000, -1000000000]], hidden: true, edge: "extremes" },
    ],
  },
  {
    slug: "move-zeroes",
    functionName: "moveZeroes",
    params: ["nums"],
    returnType: "void",
    returns: "arg0",
    starter: "/**\n * Modify nums in place; there is nothing to return.\n * @param {number[]} nums\n * @return {void}\n */\nfunction moveZeroes(nums) {\n  \n}",
    hints: [
      "The non-zero numbers must keep their relative order. Where should the next non-zero number land?",
      "Two pointers: 'write' marks where the next non-zero goes. Scan with 'read'; when nums[read] is non-zero, copy it to write and advance write. Afterwards fill the rest with zeros.",
      "write = 0\nfor read from 0 to n - 1:\n  if nums[read] != 0:\n    nums[write] = nums[read]\n    write += 1\nfor i from write to n - 1: nums[i] = 0",
    ],
    reference: `function moveZeroes(nums) {
      let w = 0;
      for (let r = 0; r < nums.length; r++) if (nums[r] !== 0) nums[w++] = nums[r];
      while (w < nums.length) nums[w++] = 0;
    }`,
    brute: `function moveZeroes(nums) {
      const rest = nums.filter((x) => x !== 0);
      const zeros = nums.length - rest.length;
      for (let i = 0; i < nums.length; i++) nums[i] = i < rest.length ? rest[i] : 0;
      return zeros;
    }`,
    fuzz: `function gen(rand) { const n = Math.floor(rand() * 9); return [Array.from({ length: n }, () => Math.floor(rand() * 4))]; }`,
    cases: [
      { input: [[0, 1, 0, 3, 12]], hidden: false },
      { input: [[0]], hidden: false },
      { input: [[1, 2, 3]], hidden: false, edge: "no-answer", note: "There are no zeros: the array must come back unchanged." },
      { input: [[0, 0, 0]], hidden: false, edge: "all-equal", note: "Only zeros." },
      { input: [[7]], hidden: false, edge: "single" },
      { input: [[1, 0, 2, 0, 3, 0, 4]], hidden: true },
      { input: [[0, 0, 1]], hidden: true, edge: "boundary", note: "The only non-zero is last: it has to travel all the way to the front." },
      { input: [[4, 2, 4, 0, 0, 3, 0, 5, 1, 0]], hidden: true },
      { input: [[-1, 0, -2]], hidden: true, edge: "negatives" },
      { input: [[0, 1]], hidden: true, edge: "two" },
    ],
  },
];
