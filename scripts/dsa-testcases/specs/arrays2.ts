import type { ProblemSpec } from "../types";

const SHUFFLE = `function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }`;

export const ARRAYS2: ProblemSpec[] = [
  {
    slug: "plus-one",
    functionName: "plusOne",
    params: ["digits"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} digits\n * @return {number[]}\n */\nfunction plusOne(digits) {\n  \n}",
    hints: [
      "Think about adding 1 by hand, starting at the rightmost digit. When does the addition stop mattering for the digits to the left?",
      "Walk from the last digit to the first. A digit below 9 just goes up by one and you're done; a 9 becomes 0 and the carry moves left. If you fall off the front, the answer is a 1 followed by all zeros.",
      "for i from n - 1 down to 0:\n  if digits[i] < 9:\n    digits[i] += 1\n    return digits\n  digits[i] = 0\n// every digit was 9\nreturn [1] followed by digits",
    ],
    reference: `function plusOne(digits) {
      const out = digits.slice();
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i] < 9) { out[i]++; return out; }
        out[i] = 0;
      }
      return [1, ...out];
    }`,
    brute: `function plusOne(digits) {
      const big = BigInt(digits.join("")) + 1n;
      return big.toString().split("").map(Number);
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 6);
      const nines = rand() < 0.4;
      const d = Array.from({ length: n }, () => (nines || rand() < 0.4 ? 9 : Math.floor(rand() * 10)));
      if (d[0] === 0 && n > 1) d[0] = 1 + Math.floor(rand() * 9);
      return [d];
    }`,
    cases: [
      { input: [[1, 2, 3]], hidden: false },
      { input: [[4, 3, 2, 1]], hidden: false },
      { input: [[9]], hidden: false, edge: "single", note: "9 + 1 = 10: the result is longer than the input." },
      { input: [[0]], hidden: false, edge: "zeros", note: "[0] + 1 = [1]: no carry, and it must not be mistaken for an empty or falsy number." },
      { input: [[9, 9, 9]], hidden: true, edge: "all-equal", note: "The carry runs through every digit and a new leading 1 is needed." },
      { input: [[1, 9, 9]], hidden: true },
      { input: [[8, 9, 9]], hidden: true },
      { input: [[2, 0, 9]], hidden: true },
      { input: [[1, 0, 0, 0]], hidden: true },
      { input: [Array(100).fill(9)], hidden: true, edge: "large", note: "100 nines: turning the digits into a Number loses precision, so work digit by digit." },
    ],
  },
  {
    slug: "happy-number",
    functionName: "isHappy",
    params: ["n"],
    returnType: "boolean",
    starter: "/**\n * @param {number} n\n * @return {boolean}\n */\nfunction isHappy(n) {\n  \n}",
    hints: [
      "Try a few starting numbers by hand. After repeating the process enough times, what kinds of things can happen to the sequence?",
      "Either you reach 1 or the sequence repeats forever. Detect a repeat with a set of values already seen, or with two pointers moving at different speeds (slow and fast, like cycle detection in a list).",
      "seen = empty set\nwhile n != 1 and n is not in seen:\n  add n to seen\n  n = sum of the squares of the digits of n\nreturn n == 1",
    ],
    reference: `function isHappy(n) {
      const next = (x) => { let s = 0; while (x > 0) { const d = x % 10; s += d * d; x = Math.floor(x / 10); } return s; };
      let slow = n, fast = next(n);
      while (fast !== 1 && slow !== fast) { slow = next(slow); fast = next(next(fast)); }
      return fast === 1;
    }`,
    brute: `function isHappy(n) {
      let x = n;
      for (let step = 0; step < 1000; step++) {
        if (x === 1) return true;
        x = String(x).split("").reduce((s, ch) => s + Number(ch) * Number(ch), 0);
      }
      return false;
    }`,
    fuzz: `function gen(rand) { return [1 + Math.floor(rand() * 3000)]; }`,
    cases: [
      { input: [19], hidden: false },
      { input: [2], hidden: false },
      { input: [1], hidden: false, edge: "min-size", note: "1 is already happy: the loop must not run before the first check." },
      { input: [4], hidden: false, edge: "cycle", note: "4 enters the loop 4, 16, 37, 58, 89, 145, 42, 20, 4: without repeat detection this never ends." },
      { input: [7], hidden: true },
      { input: [100], hidden: true },
      { input: [11], hidden: true },
      { input: [999999999], hidden: true },
      { input: [2147483647], hidden: true, edge: "extremes", note: "The largest 32-bit value: digit extraction with string or number tricks must cope with 10 digits." },
      { input: [1111111], hidden: true },
      { input: [3], hidden: true },
    ],
  },
  {
    slug: "group-anagrams",
    functionName: "groupAnagrams",
    params: ["strs"],
    returnType: "string[][]",
    compare: "unordered",
    starter: "/**\n * @param {string[]} strs\n * @return {string[][]}\n */\nfunction groupAnagrams(strs) {\n  \n}",
    hints: [
      "What do two anagrams have in common that you can compute for each word on its own, without comparing pairs of words?",
      "Give every word a canonical key: its letters sorted, or its 26 letter counts. Words with the same key are anagrams, so bucket them in a hash map from key to list of words.",
      "groups = empty map from key to list\nfor word in strs:\n  key = letters of word sorted\n  append word to groups[key]\nreturn all the lists in groups",
    ],
    reference: `function groupAnagrams(strs) {
      const groups = new Map();
      for (const w of strs) {
        const key = w.split("").sort().join("");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }
      return [...groups.values()];
    }`,
    brute: `function groupAnagrams(strs) {
      const counts = (w) => { const c = Array(26).fill(0); for (const ch of w) c[ch.charCodeAt(0) - 97]++; return c; };
      const same = (a, b) => a.every((x, i) => x === b[i]);
      const groups = [];
      for (const w of strs) {
        const c = counts(w);
        const g = groups.find((grp) => same(grp.c, c));
        if (g) g.words.push(w); else groups.push({ c, words: [w] });
      }
      return groups.map((g) => g.words);
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      return [Array.from({ length: n }, () => { const len = Math.floor(rand() * 4); let s = ""; for (let i = 0; i < len; i++) s += "abc"[Math.floor(rand() * 3)]; return s; })];
    }`,
    cases: [
      { input: [["eat", "tea", "tan", "ate", "nat", "bat"]], hidden: false },
      { input: [["a"]], hidden: false },
      { input: [[""]], hidden: false, edge: "empty", note: "The only word is the empty string: it still forms its own group, [[\"\"]]." },
      { input: [["abc", "abc", "abc"]], hidden: false, edge: "duplicates", note: "Identical words are anagrams of each other and all stay in the result." },
      { input: [["abc", "def", "ghi"]], hidden: true, edge: "no-answer", note: "No two words are anagrams: every group holds exactly one word." },
      { input: [["ab", "ba"]], hidden: true, edge: "two" },
      { input: [["", "", "a"]], hidden: true },
      { input: [["listen", "silent", "enlist", "google", "gogole", "banana"]], hidden: true },
      { input: [["aab", "aba", "baa", "abb", "bab", "bba", "ab"]], hidden: true },
      {
        input: [Array.from({ length: 300 }, (_, i) => { let s = ""; let x = i * 37 + 11; for (let j = 0; j < 4; j++) { s += "abcde"[x % 5]; x = Math.floor(x / 5) + j * 3; } return s; })],
        hidden: true,
        edge: "large",
        note: "300 short words: re-checking every word against every group with a sort per comparison is slow; hash by a key instead.",
      },
    ],
  },
  {
    slug: "top-k-frequent-elements",
    functionName: "topKFrequent",
    params: ["nums", "k"],
    returnType: "number[]",
    compare: "unordered",
    starter: "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number[]}\n */\nfunction topKFrequent(nums, k) {\n  \n}",
    hints: [
      "Counting how often each value appears is the first step. Once you have the counts, what is left is choosing the k biggest.",
      "Build a frequency map. Then either sort the distinct values by count, or bucket values by their count (a value appears at most n times) and read buckets from the highest count down until you have k values.",
      "count = map from value to how many times it appears\nbuckets = list of n + 1 empty lists\nfor value, c in count:\n  append value to buckets[c]\nresult = empty list\nfor c from n down to 1:\n  for value in buckets[c]:\n    append value to result\n    if result has k items: return result",
    ],
    reference: `function topKFrequent(nums, k) {
      const count = new Map();
      for (const x of nums) count.set(x, (count.get(x) || 0) + 1);
      const buckets = Array.from({ length: nums.length + 1 }, () => []);
      for (const [v, c] of count) buckets[c].push(v);
      const out = [];
      for (let c = nums.length; c >= 1 && out.length < k; c--) for (const v of buckets[c]) if (out.length < k) out.push(v);
      return out;
    }`,
    brute: `function topKFrequent(nums, k) {
      const distinct = [...new Set(nums)];
      const freq = (v) => nums.filter((x) => x === v).length;
      const chosen = [];
      while (chosen.length < k) {
        let best = null;
        for (const v of distinct) if (!chosen.includes(v) && (best === null || freq(v) > freq(best))) best = v;
        chosen.push(best);
      }
      return chosen;
    }`,
    // Every distinct value gets its own frequency, so the top-k set is always unambiguous.
    fuzz: `${SHUFFLE}
    function gen(rand) {
      const m = 1 + Math.floor(rand() * 6);
      const values = shuffle(Array.from({ length: 11 }, (_, i) => i - 5), rand).slice(0, m);
      const freqs = shuffle(Array.from({ length: m }, (_, i) => i + 1), rand);
      const nums = [];
      values.forEach((v, i) => { for (let t = 0; t < freqs[i]; t++) nums.push(v); });
      const k = 1 + Math.floor(rand() * m);
      return [shuffle(nums, rand), k];
    }`,
    cases: [
      { input: [[1, 1, 1, 2, 2, 3], 2], hidden: false },
      { input: [[1], 1], hidden: false },
      { input: [[7], 1], hidden: false, edge: "single", note: "One value, k = 1: the answer is that value." },
      { input: [[4, 4, 4], 1], hidden: false, edge: "all-equal", note: "Only one distinct value exists." },
      { input: [[1, 2, 2, 3, 3, 3], 3], hidden: true, edge: "boundary", note: "k equals the number of distinct values: every value, including the rarest, is in the answer." },
      { input: [[-1, -1, -2, -2, -2, 3], 2], hidden: true, edge: "negatives", note: "Negative values: a frequency table indexed by the value itself breaks." },
      { input: [[0, 0, 0, 1, 1, 2], 1], hidden: true, edge: "zeros", note: "The most frequent value is 0, which is falsy." },
      { input: [[10000, 10000, -10000], 1], hidden: true, edge: "extremes" },
      { input: [[5, 3, 3, 5, 5, 3, 3, 1, 9, 9, 9, 9, 9], 2], hidden: true },
      { input: [[2, 2, 1, 1, 1, 3], 2], hidden: true, edge: "order", note: "Any order of the k values is accepted; the answer is the set {1, 2}." },
      {
        input: [Array.from({ length: 465 }, (_, i) => i).map((i) => { let v = 1, left = i; while (left >= v) { left -= v; v++; } return [(i * 7919) % 1009, v]; }).sort((a, b) => a[0] - b[0]).map((p) => p[1]), 3],
        hidden: true,
        edge: "large",
        note: "465 numbers where value v appears v times (1..30): sorting every pair or rescanning for each value is the slow route.",
      },
    ],
  },
  {
    slug: "product-of-array-except-self",
    functionName: "productExceptSelf",
    params: ["nums"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} nums\n * @return {number[]}\n */\nfunction productExceptSelf(nums) {\n  \n}",
    hints: [
      "For position i the answer is (everything to its left) times (everything to its right). Can you get either side cheaply for every i?",
      "Make one pass left to right storing the running product of everything before each index, then one pass right to left multiplying in the running product of everything after it. No division, O(n) time, O(1) extra space beyond the output.",
      "result = list of n ones\nprefix = 1\nfor i from 0 to n - 1:\n  result[i] = prefix\n  prefix = prefix * nums[i]\nsuffix = 1\nfor i from n - 1 down to 0:\n  result[i] = result[i] * suffix\n  suffix = suffix * nums[i]\nreturn result",
    ],
    reference: `function productExceptSelf(nums) {
      const n = nums.length;
      const res = Array(n).fill(1);
      let p = 1;
      for (let i = 0; i < n; i++) { res[i] = p; p *= nums[i]; }
      let s = 1;
      for (let i = n - 1; i >= 0; i--) { res[i] *= s; s *= nums[i]; }
      return res.map((x) => x + 0);
    }`,
    brute: `function productExceptSelf(nums) {
      return nums.map((_, i) => { let p = 1; for (let j = 0; j < nums.length; j++) if (j !== i) p *= nums[j]; return p + 0; });
    }`,
    fuzz: `function gen(rand) { const n = 2 + Math.floor(rand() * 6); return [Array.from({ length: n }, () => Math.floor(rand() * 7) - 3)]; }`,
    cases: [
      { input: [[1, 2, 3, 4]], hidden: false },
      { input: [[-1, 1, 0, -3, 3]], hidden: false },
      { input: [[3, 4]], hidden: false, edge: "two", note: "Each answer is just the other number." },
      { input: [[0, 0, 2]], hidden: false, edge: "zeros", note: "Two zeros make every product 0. Dividing the total by nums[i] would divide by zero." },
      { input: [[-1, -2, -3]], hidden: true, edge: "negatives" },
      { input: [[2, 2, 2, 2]], hidden: true, edge: "all-equal" },
      { input: [[1, 0, 3, 4]], hidden: true, edge: "zeros", note: "Exactly one zero: only that position gets a non-zero answer." },
      { input: [[30, -30, 30, -30]], hidden: true, edge: "extremes" },
      { input: [[5, 1, 1, 7, 1]], hidden: true },
      { input: [Array.from({ length: 1000 }, (_, i) => (i === 500 ? 2 : i % 3 === 0 ? -1 : 1))], hidden: true, edge: "large", note: "1000 numbers: recomputing the product for every index is O(n^2)." },
    ],
  },
  {
    slug: "longest-consecutive-sequence",
    functionName: "longestConsecutive",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction longestConsecutive(nums) {\n  \n}",
    hints: [
      "Sorting makes this easy but costs O(n log n). If you could test 'is x in the array' instantly, where would you start counting a run?",
      "Put everything in a hash set. A number begins a run only if its predecessor (x - 1) is absent. From each start, walk x + 1, x + 2, ... while they are in the set and track the longest run. Every element is visited a constant number of times.",
      "set = all numbers\nbest = 0\nfor x in set:\n  if x - 1 is not in set:\n    length = 1\n    while x + length is in set:\n      length += 1\n    best = max(best, length)\nreturn best",
    ],
    reference: `function longestConsecutive(nums) {
      const set = new Set(nums);
      let best = 0;
      for (const x of set) {
        if (set.has(x - 1)) continue;
        let len = 1;
        while (set.has(x + len)) len++;
        if (len > best) best = len;
      }
      return best;
    }`,
    brute: `function longestConsecutive(nums) {
      const u = [...new Set(nums)].sort((a, b) => a - b);
      if (u.length === 0) return 0;
      let best = 1, run = 1;
      for (let i = 1; i < u.length; i++) { run = u[i] === u[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; }
      return best;
    }`,
    fuzz: `function gen(rand) { const n = Math.floor(rand() * 10); return [Array.from({ length: n }, () => Math.floor(rand() * 14) - 4)]; }`,
    cases: [
      { input: [[100, 4, 200, 1, 3, 2]], hidden: false },
      { input: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], hidden: false },
      { input: [[]], hidden: false, edge: "empty", note: "No numbers, no run: the answer is 0." },
      { input: [[5]], hidden: false, edge: "single" },
      { input: [[1, 2, 0, 1]], hidden: true, edge: "duplicates", note: "The repeated 1 must not extend the run: 0, 1, 2 has length 3, not 4." },
      { input: [[7, 7, 7]], hidden: true, edge: "all-equal", note: "Only one distinct value: the answer is 1." },
      { input: [[-1, -2, -3, 0, 5, 10]], hidden: true, edge: "negatives" },
      { input: [[1000000000, -1000000000, 999999999]], hidden: true, edge: "extremes", note: "Huge spread of values rules out a count array indexed by value." },
      { input: [[10, 30, 50, 70]], hidden: true },
      { input: [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]], hidden: true },
      { input: [Array.from({ length: 1200 }, (_, i) => (i * 7) % 1200)], hidden: true, edge: "large", note: "A shuffled run 0..1199: sorting is fine, but rescanning the array for every next value is far too slow." },
    ],
  },
  {
    slug: "pascals-triangle",
    functionName: "generate",
    params: ["numRows"],
    returnType: "number[][]",
    starter: "/**\n * @param {number} numRows\n * @return {number[][]}\n */\nfunction generate(numRows) {\n  \n}",
    hints: [
      "Write out the first five rows by hand. How is each inner number related to the row right above it?",
      "Each row starts and ends with 1. Every inner entry is the sum of the two entries directly above it (the one above-left and the one above-right). Build the triangle one row at a time from the previous row.",
      "triangle = empty list\nfor r from 0 to numRows - 1:\n  row = list of r + 1 ones\n  for c from 1 to r - 1:\n    row[c] = triangle[r - 1][c - 1] + triangle[r - 1][c]\n  append row to triangle\nreturn triangle",
    ],
    reference: `function generate(numRows) {
      const tri = [];
      for (let r = 0; r < numRows; r++) {
        const row = Array(r + 1).fill(1);
        for (let c = 1; c < r; c++) row[c] = tri[r - 1][c - 1] + tri[r - 1][c];
        tri.push(row);
      }
      return tri;
    }`,
    brute: `function generate(numRows) {
      const out = [];
      for (let r = 0; r < numRows; r++) {
        const row = [1];
        for (let k = 1; k <= r; k++) row.push((row[k - 1] * (r - k + 1)) / k);
        out.push(row);
      }
      return out;
    }`,
    fuzz: `function gen(rand) { return [1 + Math.floor(rand() * 14)]; }`,
    cases: [
      { input: [5], hidden: false },
      { input: [4], hidden: false },
      { input: [1], hidden: false, edge: "min-size", note: "A single row, [[1]]: loops that fill inner entries never run." },
      { input: [2], hidden: true, edge: "boundary", note: "Two rows, all ones: there is no inner entry to compute yet, so row r - 1 must not be indexed past its end." },
      { input: [3], hidden: true },
      { input: [8], hidden: true },
      { input: [10], hidden: true },
      { input: [15], hidden: true },
      { input: [20], hidden: true },
      { input: [30], hidden: true, edge: "large", note: "30 rows with values up to 77 million: a recursive entry-by-entry formula without memoising explodes." },
    ],
  },
  {
    slug: "merge-sorted-array",
    functionName: "merge",
    params: ["nums1", "m", "nums2", "n"],
    returnType: "void",
    returns: "arg0",
    starter: "/**\n * Modify nums1 in place; there is nothing to return.\n * @param {number[]} nums1\n * @param {number} m\n * @param {number[]} nums2\n * @param {number} n\n * @return {void}\n */\nfunction merge(nums1, m, nums2, n) {\n  \n}",
    hints: [
      "nums1 has free room at its end. If you merged from the front you would overwrite values you still need. Which end is safe to fill first?",
      "Fill from the back. Use three pointers: the last real element of nums1, the last element of nums2, and the write position at the very end of nums1. Place the larger of the two candidates there and move that pointer and the write pointer left. When nums2 runs out, you are done.",
      "i = m - 1\nj = n - 1\nw = m + n - 1\nwhile j >= 0:\n  if i >= 0 and nums1[i] > nums2[j]:\n    nums1[w] = nums1[i]\n    i -= 1\n  else:\n    nums1[w] = nums2[j]\n    j -= 1\n  w -= 1",
    ],
    reference: `function merge(nums1, m, nums2, n) {
      let i = m - 1, j = n - 1, w = m + n - 1;
      while (j >= 0) {
        if (i >= 0 && nums1[i] > nums2[j]) nums1[w--] = nums1[i--];
        else nums1[w--] = nums2[j--];
      }
    }`,
    brute: `function merge(nums1, m, nums2, n) {
      const all = nums1.slice(0, m).concat(nums2.slice(0, n)).sort((a, b) => a - b);
      for (let i = 0; i < all.length; i++) nums1[i] = all[i];
      return all.length;
    }`,
    fuzz: `function gen(rand) {
      let m = Math.floor(rand() * 6), n = Math.floor(rand() * 6);
      if (m + n === 0) n = 1;
      const sortedList = (len) => Array.from({ length: len }, () => Math.floor(rand() * 11) - 5).sort((a, b) => a - b);
      const a = sortedList(m), b = sortedList(n);
      return [a.concat(Array(n).fill(0)), m, b, n];
    }`,
    cases: [
      { input: [[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3], hidden: false },
      { input: [[4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3], hidden: false },
      { input: [[1], 1, [], 0], hidden: false, edge: "empty", note: "nums2 is empty: nothing to merge, nums1 must stay as it is." },
      { input: [[0], 0, [1], 1], hidden: false, edge: "empty", note: "nums1 holds no real elements: its single 0 is just free space, not a value to merge." },
      { input: [[2, 0], 1, [1], 1], hidden: true, edge: "two" },
      { input: [[-3, -1, 4, 0, 0], 3, [-2, 0], 2], hidden: true, edge: "negatives" },
      { input: [[0, 0, 0, 0, 0], 3, [0, 0], 2], hidden: true, edge: "zeros", note: "Real zeros in nums1 and nums2 alongside the padding zeros: count by m and n, never by value." },
      { input: [[2, 2, 2, 0, 0], 3, [2, 2], 2], hidden: true, edge: "all-equal" },
      { input: [[1, 3, 5, 0, 0, 0], 3, [1, 3, 5], 3], hidden: true, edge: "duplicates" },
      { input: [[7, 8, 9, 0, 0, 0], 3, [1, 2, 3], 3], hidden: true, edge: "boundary", note: "Every element of nums2 goes before every element of nums1." },
      {
        input: [Array.from({ length: 1000 }, (_, i) => (i < 500 ? i * 2 : 0)), 500, Array.from({ length: 500 }, (_, i) => i * 2 + 1), 500],
        hidden: true,
        edge: "large",
        note: "500 + 500 interleaved values: shifting elements right on every insert is quadratic.",
      },
    ],
  },
  {
    slug: "rotate-array",
    functionName: "rotate",
    params: ["nums", "k"],
    returnType: "void",
    returns: "arg0",
    starter: "/**\n * Modify nums in place; there is nothing to return.\n * @param {number[]} nums\n * @param {number} k\n * @return {void}\n */\nfunction rotate(nums, k) {\n  \n}",
    hints: [
      "Rotating right by k moves the last k elements to the front. What happens when k is bigger than the array, or a multiple of its length?",
      "Reduce k to k mod n first. Then reverse the whole array, reverse the first k elements, and reverse the remaining n - k elements. Three reversals do the rotation in place with O(1) extra space.",
      "k = k mod n\nreverse nums from index 0 to n - 1\nreverse nums from index 0 to k - 1\nreverse nums from index k to n - 1",
    ],
    reference: `function rotate(nums, k) {
      const n = nums.length;
      k %= n;
      const rev = (a, b) => { while (a < b) { [nums[a], nums[b]] = [nums[b], nums[a]]; a++; b--; } };
      rev(0, n - 1);
      rev(0, k - 1);
      rev(k, n - 1);
    }`,
    brute: `function rotate(nums, k) {
      const n = nums.length;
      const copy = nums.slice();
      for (let i = 0; i < n; i++) nums[(i + k) % n] = copy[i];
      return k;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      return [Array.from({ length: n }, () => Math.floor(rand() * 10) - 3), Math.floor(rand() * 21)];
    }`,
    cases: [
      { input: [[1, 2, 3, 4, 5, 6, 7], 3], hidden: false },
      { input: [[-1, -100, 3, 99], 2], hidden: false },
      { input: [[1, 2, 3], 0], hidden: false, edge: "zeros", note: "k = 0: nothing moves." },
      { input: [[9], 5], hidden: false, edge: "single", note: "One element: any k leaves it in place, and k mod 1 is 0." },
      { input: [[1, 2, 3, 4], 4], hidden: true, edge: "boundary", note: "k equals the length: a full turn, so the array is unchanged. Handle it without a negative or zero-length reversal." },
      { input: [[1, 2, 3], 5], hidden: true, edge: "extremes", note: "k is larger than the array: only k mod n matters (5 mod 3 = 2)." },
      { input: [[1, 2], 1], hidden: true, edge: "two" },
      { input: [[1, 2, 3, 4, 5, 6], 2], hidden: true },
      { input: [[5, 1, 8, 2, 9], 4], hidden: true },
      { input: [[3, 4, 5, 6, 7, 8, 9, 1], 7], hidden: true },
      { input: [[-5, 0, 5, 10], 1], hidden: true, edge: "negatives" },
      { input: [Array.from({ length: 1500 }, (_, i) => i % 10), 99999], hidden: true, edge: "large", note: "k = 99999 on 1500 numbers: rotating one step at a time, k times, is far too slow; take k mod n." },
    ],
  },
  {
    slug: "sort-colors",
    functionName: "sortColors",
    params: ["nums"],
    returnType: "void",
    returns: "arg0",
    starter: "/**\n * Modify nums in place; there is nothing to return.\n * @param {number[]} nums\n * @return {void}\n */\nfunction sortColors(nums) {\n  \n}",
    hints: [
      "There are only three distinct values. What does that let you do that a general sort cannot?",
      "Dutch national flag: keep three regions, 0s on the left, 2s on the right, 1s in the middle, with a scan pointer in the unknown part. A 0 swaps to the left boundary, a 2 swaps to the right boundary (and is re-examined), a 1 just advances.",
      "lo = 0; mid = 0; hi = n - 1\nwhile mid <= hi:\n  if nums[mid] == 0:\n    swap nums[lo], nums[mid]\n    lo += 1; mid += 1\n  else if nums[mid] == 1:\n    mid += 1\n  else:\n    swap nums[mid], nums[hi]\n    hi -= 1",
    ],
    reference: `function sortColors(nums) {
      let lo = 0, mid = 0, hi = nums.length - 1;
      while (mid <= hi) {
        if (nums[mid] === 0) { [nums[lo], nums[mid]] = [nums[mid], nums[lo]]; lo++; mid++; }
        else if (nums[mid] === 1) mid++;
        else { [nums[mid], nums[hi]] = [nums[hi], nums[mid]]; hi--; }
      }
    }`,
    brute: `function sortColors(nums) {
      const counts = [0, 0, 0];
      for (const x of nums) counts[x]++;
      let i = 0;
      for (let c = 0; c < 3; c++) for (let t = 0; t < counts[c]; t++) nums[i++] = c;
      return counts;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 10); return [Array.from({ length: n }, () => Math.floor(rand() * 3))]; }`,
    cases: [
      { input: [[2, 0, 2, 1, 1, 0]], hidden: false },
      { input: [[2, 0, 1]], hidden: false },
      { input: [[0]], hidden: false, edge: "single" },
      { input: [[1, 1, 1]], hidden: false, edge: "all-equal", note: "Only one colour: no swaps are needed." },
      { input: [[2, 1, 0]], hidden: true, edge: "reverse-sorted" },
      { input: [[0, 0, 1, 1, 2, 2]], hidden: true, edge: "sorted", note: "Already in order: a pointer that swaps blindly can still scramble it." },
      { input: [[1, 0]], hidden: true, edge: "two" },
      { input: [[2, 2, 0, 0]], hidden: true, edge: "boundary", note: "All 2s sit before all 0s: every element crosses the whole array." },
      { input: [[1, 2, 0, 1, 2, 0, 1]], hidden: true },
      { input: [[2, 0, 2, 0, 2, 1, 0]], hidden: true, edge: "duplicates", note: "After swapping a 2 to the back, the value that arrives at mid has to be checked again." },
      { input: [Array.from({ length: 300 }, (_, i) => (i * 7 + (i >> 2)) % 3)], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "subarray-sum-equals-k",
    functionName: "subarraySum",
    params: ["nums", "k"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number}\n */\nfunction subarraySum(nums, k) {\n  \n}",
    hints: [
      "A subarray's sum is the difference of two prefix sums. For the prefix ending at index j, which earlier prefix sum would make the difference exactly k?",
      "Walk once, keeping a running prefix sum and a hash map from prefix-sum value to how many times it has occurred (seed it with 0 occurring once). At each step, add the count of (prefix - k) to the answer, then record the current prefix. This works with negatives, unlike a sliding window.",
      "counts = map with {0: 1}\nprefix = 0\nanswer = 0\nfor x in nums:\n  prefix += x\n  answer += counts[prefix - k] (0 if absent)\n  counts[prefix] += 1\nreturn answer",
    ],
    reference: `function subarraySum(nums, k) {
      const counts = new Map([[0, 1]]);
      let prefix = 0, ans = 0;
      for (const x of nums) {
        prefix += x;
        ans += counts.get(prefix - k) || 0;
        counts.set(prefix, (counts.get(prefix) || 0) + 1);
      }
      return ans;
    }`,
    brute: `function subarraySum(nums, k) {
      let ans = 0;
      for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) ans++; } }
      return ans;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => Math.floor(rand() * 7) - 3), Math.floor(rand() * 7) - 3];
    }`,
    cases: [
      { input: [[1, 1, 1], 2], hidden: false },
      { input: [[1, 2, 3], 3], hidden: false },
      { input: [[5], 5], hidden: false, edge: "single", note: "The single element is itself the matching subarray: the empty prefix (sum 0) must be counted." },
      { input: [[0, 0, 0], 0], hidden: false, edge: "zeros", note: "Every one of the 6 subarrays sums to 0: counting must handle many equal prefix sums." },
      { input: [[1, -1, 1, -1], 0], hidden: true, edge: "negatives", note: "Negatives let a window shrink and grow: a sliding window gives wrong counts here." },
      { input: [[3, 4, 7, 2, -3, 1, 4, 2], 7], hidden: true },
      { input: [[1, 2, 3], 7], hidden: true, edge: "no-answer", note: "No subarray adds up to k: the answer is 0." },
      { input: [[2, 2, 2, 2], 4], hidden: true, edge: "all-equal", note: "Three overlapping windows match: overlapping subarrays all count." },
      { input: [[-1, -1, 1], 0], hidden: true },
      { input: [[1000, -1000, 1000], 1000], hidden: true, edge: "extremes" },
      { input: [Array.from({ length: 1500 }, (_, i) => (i % 3 === 1 ? -1 : 1)), 1], hidden: true, edge: "large", note: "1500 numbers: checking every subarray sum from scratch is cubic and times out." },
    ],
  },
  {
    slug: "jump-game",
    functionName: "canJump",
    params: ["nums"],
    returnType: "boolean",
    starter: "/**\n * @param {number[]} nums\n * @return {boolean}\n */\nfunction canJump(nums) {\n  \n}",
    hints: [
      "You don't need the actual path, only whether the last index can be reached. If you know one index is reachable, which indices become reachable because of it?",
      "Track the farthest index reachable so far while scanning left to right. If the scan reaches an index beyond the farthest reach, you are stuck and the answer is false. If the farthest reach ever covers the last index, it is true.",
      "farthest = 0\nfor i from 0 to n - 1:\n  if i > farthest: return false\n  farthest = max(farthest, i + nums[i])\n  if farthest >= n - 1: return true\nreturn true",
    ],
    reference: `function canJump(nums) {
      let far = 0;
      for (let i = 0; i < nums.length; i++) {
        if (i > far) return false;
        far = Math.max(far, i + nums[i]);
      }
      return true;
    }`,
    brute: `function canJump(nums) {
      const n = nums.length;
      const ok = Array(n).fill(false);
      ok[n - 1] = true;
      for (let i = n - 2; i >= 0; i--) {
        for (let j = 1; j <= nums[i] && i + j < n; j++) if (ok[i + j]) { ok[i] = true; break; }
      }
      return ok[0];
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 9); return [Array.from({ length: n }, () => (rand() < 0.3 ? 0 : 1 + Math.floor(rand() * 3)))]; }`,
    cases: [
      { input: [[2, 3, 1, 1, 4]], hidden: false },
      { input: [[3, 2, 1, 0, 4]], hidden: false },
      { input: [[0]], hidden: false, edge: "single", note: "Already standing on the last index: true, even though the jump length is 0." },
      { input: [[0, 1]], hidden: false, edge: "zeros", note: "A zero at the start with somewhere to go: stuck, so false." },
      { input: [[1, 0, 0]], hidden: true, edge: "no-answer", note: "The first jump lands on a zero that can never move on." },
      { input: [[2, 0, 0]], hidden: true, edge: "boundary", note: "The jump lands exactly on the last index, hopping over a zero." },
      { input: [[1, 1]], hidden: true, edge: "two" },
      { input: [[5, 0, 0, 0, 0, 0]], hidden: true, edge: "extremes", note: "A jump far longer than needed: don't index past the end." },
      { input: [[1, 1, 1, 1, 1]], hidden: true, edge: "all-equal" },
      { input: [[2, 5, 0, 0]], hidden: true },
      {
        input: [[...Array(57).fill(2), 0, 0, 0]],
        hidden: true,
        edge: "large",
        note: "60 positions: trying every jump length recursively without memoisation is exponential here, and the answer is false.",
      },
    ],
  },
];
