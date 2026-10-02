import type { ProblemSpec } from "../types";

export const WINDOW_POINTERS: ProblemSpec[] = [
  {
    slug: "two-sum-ii-input-array-is-sorted",
    functionName: "twoSum",
    params: ["numbers", "target"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} numbers\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(numbers, target) {\n  \n}",
    hints: [
      "The array is already sorted. If the sum of two chosen numbers is too big, which of the two would you move, and in which direction?",
      "Two pointers from both ends. A sum above target means the right value is too large, so move the right pointer in; a sum below target means move the left pointer out. O(n) time, O(1) space. Remember the answer is 1-indexed.",
      "left = 0\nright = n - 1\nwhile left < right:\n  sum = numbers[left] + numbers[right]\n  if sum == target: return [left + 1, right + 1]\n  if sum < target: left += 1\n  else: right -= 1",
    ],
    reference: `function twoSum(numbers, target) {
      let l = 0, r = numbers.length - 1;
      while (l < r) {
        const s = numbers[l] + numbers[r];
        if (s === target) return [l + 1, r + 1];
        if (s < target) l++; else r--;
      }
      return [];
    }`,
    brute: `function twoSum(numbers, target) {
      for (let i = 0; i < numbers.length; i++)
        for (let j = i + 1; j < numbers.length; j++)
          if (numbers[i] + numbers[j] === target) return [i + 1, j + 1];
      return [];
    }`,
    // Sorted (non-decreasing) values with exactly one index pair hitting the target, as the problem promises.
    fuzz: `function gen(rand) {
      for (;;) {
        const n = 2 + Math.floor(rand() * 7);
        const nums = Array.from({ length: n }, () => Math.floor(rand() * 21) - 10).sort((a, b) => a - b);
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
      { input: [[2, 3, 4], 6], hidden: false },
      { input: [[-1, 0], -1], hidden: false, edge: "two", note: "Only one pair exists, and the answer is 1-indexed: [1, 2], not [0, 1]." },
      { input: [[0, 0, 3, 4], 0], hidden: false, edge: "zeros", note: "Two zeros sum to 0. A truthiness check on a lookup would skip them." },
      { input: [[-5, -3, -1, 0], -8], hidden: true, edge: "negatives", note: "Negative values and a negative target: the sum gets larger as you move right." },
      { input: [[1, 3, 5, 9], 10], hidden: true, edge: "boundary", note: "The answer is the very first and the very last element." },
      { input: [[1, 2, 3, 4, 4, 9, 56, 90], 8], hidden: true, edge: "duplicates", note: "The pair is two equal 4s next to each other." },
      { input: [[1, 2, 3], 4], hidden: true, edge: "reuse", note: "2 + 2 = 4 tempts you to use the middle element twice. The answer is 1 and 3." },
      { input: [[-1000, -3, 5, 1000], 0], hidden: true, edge: "extremes" },
      { input: [[5, 25, 75], 100], hidden: true },
      { input: [Array.from({ length: 1500 }, (_, i) => i), 1498 + 1499], hidden: true, edge: "large", note: "1500 values with the answer at the far end: trying every pair is slow." },
    ],
  },
  {
    slug: "3sum",
    functionName: "threeSum",
    params: ["nums"],
    returnType: "number[][]",
    compare: "unordered",
    starter: "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nfunction threeSum(nums) {\n  \n}",
    hints: [
      "If you fix one number, what is left to find in the rest of the array? And how would sorting help you avoid listing the same triplet twice?",
      "Sort first. For each distinct first value, run the two-pointer search for a pair that sums to its negation on the remainder. After a hit, skip over repeated values on both pointers so each triplet appears once.",
      "sort nums\nfor i from 0 to n - 3:\n  if i > 0 and nums[i] == nums[i - 1]: continue\n  left = i + 1, right = n - 1\n  while left < right:\n    sum = nums[i] + nums[left] + nums[right]\n    if sum < 0: left += 1\n    else if sum > 0: right -= 1\n    else: record triplet, move both pointers, skip repeated values",
    ],
    reference: `function threeSum(nums) {
      const a = [...nums].sort((x, y) => x - y);
      const out = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] === a[i - 1]) continue;
        let l = i + 1, r = a.length - 1;
        while (l < r) {
          const s = a[i] + a[l] + a[r];
          if (s < 0) l++;
          else if (s > 0) r--;
          else {
            out.push([a[i], a[l], a[r]]);
            l++; r--;
            while (l < r && a[l] === a[l - 1]) l++;
            while (l < r && a[r] === a[r + 1]) r--;
          }
        }
      }
      return out;
    }`,
    // Works over distinct values with counts, so it never builds a duplicate triplet and stays fast on huge repeats.
    brute: `function threeSum(nums) {
      const count = new Map();
      for (const x of nums) count.set(x, (count.get(x) || 0) + 1);
      const vs = [...count.keys()].sort((x, y) => x - y);
      const out = [];
      for (let i = 0; i < vs.length; i++)
        for (let j = i; j < vs.length; j++)
          for (let k = j; k < vs.length; k++) {
            if (vs[i] + vs[j] + vs[k] !== 0) continue;
            const need = new Map();
            for (const v of [vs[i], vs[j], vs[k]]) need.set(v, (need.get(v) || 0) + 1);
            let ok = true;
            for (const [v, c] of need) if (count.get(v) < c) ok = false;
            if (ok) out.push([vs[i], vs[j], vs[k]]);
          }
      return out;
    }`,
    fuzz: `function gen(rand) {
      const n = 3 + Math.floor(rand() * 8);
      return [Array.from({ length: n }, () => Math.floor(rand() * 9) - 4)];
    }`,
    cases: [
      { input: [[-1, 0, 1, 2, -1, -4]], hidden: false },
      { input: [[0, 1, 1]], hidden: false },
      { input: [[0, 0, 0]], hidden: false, edge: "all-equal", note: "Three zeros make exactly one triplet, not one per way of choosing them." },
      { input: [[-1, 0, 1]], hidden: false, edge: "min-size", note: "Three numbers is the smallest legal input: the loop over the first value runs once." },
      { input: [[0, 0, 0, 0, 0, 0]], hidden: true, edge: "all-equal", note: "Many zeros still give a single [0,0,0]. Without skipping repeats you list it many times." },
      { input: [[-2, 0, 0, 2, 2]], hidden: true, edge: "duplicates", note: "Two 2s and two 0s: [-2,0,2] must be reported once, not four times." },
      { input: [[1, 2, -2, -1]], hidden: true, edge: "no-answer", note: "No triple sums to zero: return an empty list." },
      { input: [[-100000, 0, 100000, -100000, 100000]], hidden: true, edge: "extremes" },
      { input: [[0, 0, 0, 1, -1]], hidden: true, edge: "zeros", note: "Zeros give two different triplets: [0,0,0] and [-1,0,1]." },
      { input: [[3, 0, -2, -1, 1, 2]], hidden: true },
      { input: [[...Array.from({ length: 2400 }, () => 0), -1, 1]], hidden: true, edge: "large", note: "2400 zeros plus -1 and 1: a triple loop does billions of steps and repeat-skipping matters." },
    ],
  },
  {
    slug: "container-with-most-water",
    functionName: "maxArea",
    params: ["height"],
    returnType: "number",
    starter: "/**\n * @param {number[]} height\n * @return {number}\n */\nfunction maxArea(height) {\n  \n}",
    hints: [
      "The area is limited by the shorter wall times the distance between the walls. Which choice gives you the widest start, and what do you give up when you shrink it?",
      "Start with the outermost pair. Moving the taller wall inward can only shrink the width without raising the limit, so always move the shorter wall inward and keep the best area seen.",
      "left = 0\nright = n - 1\nbest = 0\nwhile left < right:\n  area = min(height[left], height[right]) * (right - left)\n  best = max(best, area)\n  if height[left] < height[right]: left += 1\n  else: right -= 1\nreturn best",
    ],
    reference: `function maxArea(height) {
      let l = 0, r = height.length - 1, best = 0;
      while (l < r) {
        best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++; else r--;
      }
      return best;
    }`,
    brute: `function maxArea(height) {
      let best = 0;
      for (let i = 0; i < height.length; i++)
        for (let j = i + 1; j < height.length; j++)
          best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
      return best;
    }`,
    fuzz: `function gen(rand) {
      const n = 2 + Math.floor(rand() * 8);
      return [Array.from({ length: n }, () => Math.floor(rand() * 11))];
    }`,
    cases: [
      { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], hidden: false },
      { input: [[1, 1]], hidden: false },
      { input: [[0, 2]], hidden: false, edge: "zeros", note: "A wall of height 0 holds nothing: the area is 0, not negative or the other height." },
      { input: [[4, 4, 4, 4, 4]], hidden: false, edge: "all-equal", note: "Ties everywhere: the widest pair (width 4) wins." },
      { input: [[1, 2, 3, 4, 5]], hidden: true, edge: "sorted" },
      { input: [[5, 4, 3, 2, 1]], hidden: true, edge: "reverse-sorted" },
      { input: [[9, 1, 1, 1, 9]], hidden: true, edge: "boundary", note: "The best pair is the two outer walls." },
      { input: [[10000, 0, 0, 0, 10000]], hidden: true, edge: "extremes", note: "Max heights with zeros between them: 10000 * 4 = 40000." },
      { input: [[2, 3, 4, 5, 18, 17, 6]], hidden: true },
      { input: [[1, 3, 2, 5, 25, 24, 5]], hidden: true },
      { input: [Array.from({ length: 1500 }, (_, i) => (i * 7919) % 1000), ], hidden: true, edge: "large", note: "1500 pseudo-random walls: checking every pair is about a million steps and grows quickly." },
    ],
  },
  {
    slug: "squares-of-a-sorted-array",
    functionName: "sortedSquares",
    params: ["nums"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} nums\n * @return {number[]}\n */\nfunction sortedSquares(nums) {\n  \n}",
    hints: [
      "Squaring wrecks the order when there are negatives. Where in the original array can the largest square ever be?",
      "The largest square is at one of the two ends. Use two pointers on the ends and fill the result from the back: compare absolute values, write the bigger square, and move that pointer inward. O(n), no sort needed.",
      "left = 0\nright = n - 1\nfor pos from n - 1 down to 0:\n  if abs(nums[left]) > abs(nums[right]):\n    result[pos] = nums[left] squared\n    left += 1\n  else:\n    result[pos] = nums[right] squared\n    right -= 1\nreturn result",
    ],
    reference: `function sortedSquares(nums) {
      const n = nums.length, res = new Array(n);
      let l = 0, r = n - 1;
      for (let p = n - 1; p >= 0; p--) {
        if (Math.abs(nums[l]) > Math.abs(nums[r])) { res[p] = nums[l] * nums[l]; l++; }
        else { res[p] = nums[r] * nums[r]; r--; }
      }
      return res;
    }`,
    brute: `function sortedSquares(nums) {
      return nums.map((x) => x * x).sort((a, b) => a - b);
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      return [Array.from({ length: n }, () => Math.floor(rand() * 21) - 10).sort((a, b) => a - b)];
    }`,
    cases: [
      { input: [[-4, -1, 0, 3, 10]], hidden: false },
      { input: [[-7, -3, 2, 3, 11]], hidden: false },
      { input: [[-3]], hidden: false, edge: "single", note: "One negative number: the result is just [9]." },
      { input: [[-5, -3, -1]], hidden: false, edge: "negatives", note: "All negative: squaring reverses the order, so the biggest square comes from the left end." },
      { input: [[0, 0, 0]], hidden: false, edge: "zeros" },
      { input: [[-2, -2, 2, 2]], hidden: true, edge: "duplicates", note: "Equal absolute values from both sides: either pointer may go first, the output is the same." },
      { input: [[-10000, 10000]], hidden: true, edge: "extremes", note: "Squares reach 100,000,000: fine for numbers, but check any fixed-size assumptions." },
      { input: [[1, 2, 3, 4, 5]], hidden: true, edge: "sorted", note: "Non-negative input: squares are already in order." },
      { input: [[-6, -2, 0, 1, 5]], hidden: true },
      { input: [Array.from({ length: 1500 }, (_, i) => i - 750)], hidden: true, edge: "large", note: "1500 values mixing both signs: a merge or two-pointer pass is linear, re-sorting is not." },
    ],
  },
  {
    slug: "reverse-string",
    functionName: "reverseString",
    params: ["s"],
    returnType: "void",
    returns: "arg0",
    starter: "/**\n * Do not return anything, modify s in-place instead.\n * @param {character[]} s\n * @return {void}\n */\nfunction reverseString(s) {\n  \n}",
    hints: [
      "What has to happen to the first and last items, then the second and second-to-last, and so on? When do you stop?",
      "Two pointers, one at each end. Swap the pair they point at and move them toward each other until they meet or cross. No extra array is needed, so space is O(1).",
      "left = 0\nright = n - 1\nwhile left < right:\n  swap s[left] and s[right]\n  left += 1\n  right -= 1",
    ],
    reference: `function reverseString(s) {
      let l = 0, r = s.length - 1;
      while (l < r) { const t = s[l]; s[l] = s[r]; s[r] = t; l++; r--; }
    }`,
    brute: `function reverseString(s) {
      const copy = s.slice();
      for (let i = 0; i < copy.length; i++) s[i] = copy[copy.length - 1 - i];
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      const pool = "abcXYZ019!";
      return [Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)])];
    }`,
    cases: [
      { input: [["h", "e", "l", "l", "o"]], hidden: false },
      { input: [["H", "a", "n", "n", "a", "h"]], hidden: false },
      { input: [["a"]], hidden: false, edge: "single-char", note: "One character: the pointers start equal, nothing to swap." },
      { input: [["z", "z", "z", "z"]], hidden: false, edge: "all-equal", note: "Reversing leaves it unchanged. A solution that only prints would still look right here." },
      { input: [["a", "b"]], hidden: true, edge: "two", note: "A single swap with no middle element." },
      { input: [["A", "b", "1", "!", "c"]], hidden: true, edge: "case-mix", note: "Upper and lower case, a digit and a symbol: swap characters as they are, don't change case." },
      { input: [["x", "y", "z"]], hidden: true },
      { input: [["a", "b", "c", "d"]], hidden: true },
      { input: [["1", "2", "3", "4", "5", "6", "7"]], hidden: true },
      { input: [Array.from({ length: 1500 }, (_, i) => String.fromCharCode(97 + (i % 26)))], hidden: true, edge: "large", note: "1500 characters, to be reversed in place without building a new array." },
    ],
  },
  {
    slug: "valid-palindrome-ii",
    functionName: "validPalindrome",
    params: ["s"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @return {boolean}\n */\nfunction validPalindrome(s) {\n  \n}",
    hints: [
      "Walk inward from both ends as in a normal palindrome check. What should happen at the first pair that does not match?",
      "At the first mismatch you get one deletion: either drop the left character or the right one. Check whether the remaining inner string is a palindrome for either choice; if neither works the answer is false.",
      "left = 0\nright = n - 1\nwhile left < right:\n  if s[left] != s[right]:\n    return isPalindrome(left + 1, right) or isPalindrome(left, right - 1)\n  left += 1\n  right -= 1\nreturn true\n\nisPalindrome(i, j) checks s[i..j] with two pointers",
    ],
    reference: `function validPalindrome(s) {
      const pal = (i, j) => { while (i < j) { if (s[i] !== s[j]) return false; i++; j--; } return true; };
      let l = 0, r = s.length - 1;
      while (l < r) {
        if (s[l] !== s[r]) return pal(l + 1, r) || pal(l, r - 1);
        l++; r--;
      }
      return true;
    }`,
    // Try deleting each character in turn and check the whole string with a reverse comparison.
    brute: `function validPalindrome(s) {
      const isPal = (t) => t === t.split("").reverse().join("");
      if (isPal(s)) return true;
      for (let i = 0; i < s.length; i++) if (isPal(s.slice(0, i) + s.slice(i + 1))) return true;
      return false;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => "abc"[Math.floor(rand() * 3)]).join("")];
    }`,
    cases: [
      { input: ["aba"], hidden: false },
      { input: ["abca"], hidden: false },
      { input: ["abc"], hidden: false, edge: "no-answer", note: "Dropping either end still leaves a non-palindrome. Return false instead of falling off the loop." },
      { input: ["a"], hidden: false, edge: "single-char" },
      { input: ["ab"], hidden: true, edge: "two", note: "Delete either letter and one remains: true." },
      { input: ["aaaa"], hidden: true, edge: "all-equal" },
      { input: ["cbbcc"], hidden: true },
      { input: ["ccbbc"], hidden: true },
      { input: ["deeee"], hidden: true },
      { input: ["abbaa"], hidden: true },
      { input: ["a".repeat(2000) + "c" + "a".repeat(2000) + "b"], hidden: true, edge: "large", note: "4001 characters with the only fix at the very end: re-checking from scratch per character is quadratic." },
    ],
  },
  {
    slug: "longest-substring-without-repeating-characters",
    functionName: "lengthOfLongestSubstring",
    params: ["s"],
    returnType: "number",
    starter: "/**\n * @param {string} s\n * @return {number}\n */\nfunction lengthOfLongestSubstring(s) {\n  \n}",
    hints: [
      "If the current stretch has no repeats and you add one more character that does repeat, where must the stretch now begin?",
      "Sliding window with a map from character to its last seen index. When the new character was last seen inside the window, jump the left edge to just past that index (never backwards). Track the biggest window.",
      "last = empty map\nleft = 0\nbest = 0\nfor right from 0 to n - 1:\n  if s[right] in last and last[s[right]] >= left:\n    left = last[s[right]] + 1\n  last[s[right]] = right\n  best = max(best, right - left + 1)\nreturn best",
    ],
    reference: `function lengthOfLongestSubstring(s) {
      const last = new Map();
      let left = 0, best = 0;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        if (last.has(c) && last.get(c) >= left) left = last.get(c) + 1;
        last.set(c, r);
        best = Math.max(best, r - left + 1);
      }
      return best;
    }`,
    // From every start, extend until the first repeat.
    brute: `function lengthOfLongestSubstring(s) {
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        const seen = new Set();
        let j = i;
        while (j < s.length && !seen.has(s[j])) { seen.add(s[j]); j++; }
        best = Math.max(best, j - i);
      }
      return best;
    }`,
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 11);
      return [Array.from({ length: n }, () => "abcd"[Math.floor(rand() * 4)]).join("")];
    }`,
    cases: [
      { input: ["abcabcbb"], hidden: false },
      { input: ["bbbbb"], hidden: false },
      { input: ["pwwkew"], hidden: false },
      { input: [""], hidden: false, edge: "empty", note: "The empty string has no substring: the answer is 0, so don't read s[0]." },
      { input: ["a"], hidden: true, edge: "single-char" },
      { input: ["au"], hidden: true, edge: "two", note: "No repeats at all: the whole string is the answer." },
      { input: ["abba"], hidden: true, edge: "duplicates", note: "When the last 'a' is seen, its old index is outside the window. Moving the left edge back to it gives 4 instead of 2." },
      { input: ["dvdf"], hidden: true },
      { input: ["aA a!A1!"], hidden: true, edge: "case-mix", note: "Upper and lower case differ, and spaces and symbols count as characters too." },
      { input: ["abcdefghijklmnopqrstuvwxyz".repeat(200)], hidden: true, edge: "large", note: "5200 characters: re-scanning each window from scratch is far slower than a single pass." },
    ],
  },
  {
    slug: "longest-repeating-character-replacement",
    functionName: "characterReplacement",
    params: ["s", "k"],
    returnType: "number",
    starter: "/**\n * @param {string} s\n * @param {number} k\n * @return {number}\n */\nfunction characterReplacement(s, k) {\n  \n}",
    hints: [
      "For a chosen stretch of the string, how many replacements do you need to make all letters the same? Which letter should you keep?",
      "A window is valid when its length minus the count of its most frequent letter is at most k. Slide a window: grow the right edge, and when it becomes invalid, move the left edge once. Track the best length.",
      "counts = empty map\nleft = 0\nmaxFreq = 0\nbest = 0\nfor right from 0 to n - 1:\n  counts[s[right]] += 1\n  maxFreq = max(maxFreq, counts[s[right]])\n  while (right - left + 1) - maxFreq > k:\n    counts[s[left]] -= 1\n    left += 1\n  best = max(best, right - left + 1)\nreturn best",
    ],
    reference: `function characterReplacement(s, k) {
      const counts = {};
      let left = 0, maxFreq = 0, best = 0;
      for (let r = 0; r < s.length; r++) {
        counts[s[r]] = (counts[s[r]] || 0) + 1;
        maxFreq = Math.max(maxFreq, counts[s[r]]);
        while (r - left + 1 - maxFreq > k) { counts[s[left]]--; left++; }
        best = Math.max(best, r - left + 1);
      }
      return best;
    }`,
    // Every start, grow the end while tracking the exact max frequency of that substring.
    brute: `function characterReplacement(s, k) {
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        const cnt = {};
        let mx = 0;
        for (let j = i; j < s.length; j++) {
          cnt[s[j]] = (cnt[s[j]] || 0) + 1;
          if (cnt[s[j]] > mx) mx = cnt[s[j]];
          if (j - i + 1 - mx <= k) best = Math.max(best, j - i + 1);
        }
      }
      return best;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 9);
      const s = Array.from({ length: n }, () => "ABC"[Math.floor(rand() * 3)]).join("");
      return [s, Math.floor(rand() * (n + 1))];
    }`,
    cases: [
      { input: ["ABAB", 2], hidden: false },
      { input: ["AABABBA", 1], hidden: false },
      { input: ["A", 0], hidden: false, edge: "single-char" },
      { input: ["ABCDE", 0], hidden: false, edge: "zeros", note: "k = 0 allows no replacements: the answer is the longest run of one letter (here 1)." },
      { input: ["AAAA", 2], hidden: true, edge: "all-equal", note: "Nothing needs replacing and k is spare: the answer is the full length, not length + k." },
      { input: ["AB", 2], hidden: true, edge: "two" },
      { input: ["ABC", 3], hidden: true, edge: "extremes", note: "k equals the length: every letter can change, but the answer is still capped at the string length." },
      { input: ["AABBBCCD", 2], hidden: true },
      { input: ["BAAAB", 2], hidden: true },
      { input: [Array.from({ length: 3000 }, (_, i) => "ABC"[(i * i + (i >> 3)) % 3]).join(""), 50], hidden: true, edge: "large", note: "3000 characters: counting every substring from scratch is cubic." },
    ],
  },
  {
    slug: "permutation-in-string",
    functionName: "checkInclusion",
    params: ["s1", "s2"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s1\n * @param {string} s2\n * @return {boolean}\n */\nfunction checkInclusion(s1, s2) {\n  \n}",
    hints: [
      "Two strings are permutations of each other exactly when their letter counts are identical. How long should each stretch of s2 you examine be?",
      "Slide a window of length s1.length across s2, maintaining letter counts incrementally: add the new right letter, remove the old left letter. Compare the counts of the window with those of s1 (or track how many letters match).",
      "if len(s1) > len(s2): return false\nneed = counts of letters in s1\nwindow = counts of the first len(s1) letters of s2\nif window == need: return true\nfor right from len(s1) to len(s2) - 1:\n  add s2[right] to window\n  remove s2[right - len(s1)] from window\n  if window == need: return true\nreturn false",
    ],
    reference: `function checkInclusion(s1, s2) {
      const m = s1.length;
      if (m > s2.length) return false;
      const need = new Array(26).fill(0), win = new Array(26).fill(0);
      const idx = (c) => c.charCodeAt(0) - 97;
      for (let i = 0; i < m; i++) { need[idx(s1[i])]++; win[idx(s2[i])]++; }
      const same = () => { for (let i = 0; i < 26; i++) if (need[i] !== win[i]) return false; return true; };
      if (same()) return true;
      for (let r = m; r < s2.length; r++) {
        win[idx(s2[r])]++;
        win[idx(s2[r - m])]--;
        if (same()) return true;
      }
      return false;
    }`,
    // Sort each candidate window and compare it with the sorted s1.
    brute: `function checkInclusion(s1, s2) {
      const target = s1.split("").sort().join("");
      for (let i = 0; i + s1.length <= s2.length; i++)
        if (s2.slice(i, i + s1.length).split("").sort().join("") === target) return true;
      return false;
    }`,
    fuzz: `function gen(rand) {
      const pick = (n) => Array.from({ length: n }, () => "abc"[Math.floor(rand() * 3)]).join("");
      return [pick(1 + Math.floor(rand() * 4)), pick(1 + Math.floor(rand() * 9))];
    }`,
    cases: [
      { input: ["ab", "eidbaooo"], hidden: false },
      { input: ["ab", "eidboaoo"], hidden: false },
      { input: ["a", "b"], hidden: false, edge: "single-char", note: "One-letter s1: a match is just that letter appearing in s2." },
      { input: ["abc", "ab"], hidden: false, edge: "no-answer", note: "s1 is longer than s2, so no window fits. Don't index past the end." },
      { input: ["ab", "ba"], hidden: true, edge: "two", note: "The whole of s2 is the window, and it is the reverse of s1." },
      { input: ["aa", "aaaa"], hidden: true, edge: "all-equal" },
      { input: ["abc", "xxxcba"], hidden: true, edge: "boundary", note: "The permutation sits in the last window: make sure the final slide is checked." },
      { input: ["aab", "cbaaa"], hidden: true, edge: "duplicates", note: "s1 has two a's: counts must match exactly, not just 'the same set of letters'." },
      { input: ["abc", "cbaxx"], hidden: true },
      { input: ["adc", "dcda"], hidden: true },
      { input: ["abcdefghij".repeat(10), "z".repeat(1500) + "jihgfedcba".repeat(10)], hidden: true, edge: "large", note: "A 100-letter s1 and a 1600-letter s2: rebuilding counts from scratch per window is slow." },
    ],
  },
  {
    slug: "minimum-window-substring",
    functionName: "minWindow",
    params: ["s", "t"],
    returnType: "string",
    starter: "/**\n * @param {string} s\n * @param {string} t\n * @return {string}\n */\nfunction minWindow(s, t) {\n  \n}",
    hints: [
      "A stretch of s works when it holds every letter of t with enough copies. Once a stretch works, can you make it shorter from the left?",
      "Sliding window with a need-count per letter and a counter of how many requirements are satisfied. Grow right until all are met, then shrink left as long as they stay met, recording the shortest window each time.",
      "need = counts of letters in t, missing = len(t)\nleft = 0, best = none\nfor right from 0 to n - 1:\n  if need[s[right]] > 0: missing -= 1\n  need[s[right]] -= 1\n  while missing == 0:\n    keep window left..right if shortest so far\n    need[s[left]] += 1\n    if need[s[left]] > 0: missing += 1\n    left += 1\nreturn best, or empty string",
    ],
    reference: `function minWindow(s, t) {
      const need = {};
      for (const c of t) need[c] = (need[c] || 0) + 1;
      let missing = t.length, left = 0, bs = 0, bl = Infinity;
      for (let r = 0; r < s.length; r++) {
        if (need[s[r]] > 0) missing--;
        need[s[r]] = (need[s[r]] || 0) - 1;
        while (missing === 0) {
          if (r - left + 1 < bl) { bl = r - left + 1; bs = left; }
          need[s[left]]++;
          if (need[s[left]] > 0) missing++;
          left++;
        }
      }
      return bl === Infinity ? "" : s.slice(bs, bs + bl);
    }`,
    // From every start, extend right until the window covers t.
    brute: `function minWindow(s, t) {
      const base = {};
      for (const c of t) base[c] = (base[c] || 0) + 1;
      let best = "";
      for (let i = 0; i < s.length; i++) {
        const need = Object.assign({}, base);
        let missing = t.length;
        for (let j = i; j < s.length; j++) {
          if (need[s[j]] > 0) missing--;
          if (need[s[j]] !== undefined) need[s[j]]--;
          if (missing === 0) {
            if (best === "" || j - i + 1 < best.length) best = s.slice(i, j + 1);
            break;
          }
        }
      }
      return best;
    }`,
    // Keep only inputs where every minimum window is the same string (so the answer is unambiguous).
    fuzz: `function gen(rand) {
      const pick = (n, alpha) => Array.from({ length: n }, () => alpha[Math.floor(rand() * alpha.length)]).join("");
      for (;;) {
        const s = pick(1 + Math.floor(rand() * 10), "abcA");
        const t = pick(1 + Math.floor(rand() * 3), "abc");
        const valid = (w) => {
          const c = {};
          for (const ch of w) c[ch] = (c[ch] || 0) + 1;
          const need = {};
          for (const ch of t) need[ch] = (need[ch] || 0) + 1;
          return Object.keys(need).every((k) => (c[k] || 0) >= need[k]);
        };
        let bestLen = Infinity;
        const found = new Set();
        for (let i = 0; i < s.length; i++)
          for (let j = i + 1; j <= s.length; j++) {
            if (!valid(s.slice(i, j))) continue;
            if (j - i < bestLen) { bestLen = j - i; found.clear(); }
            if (j - i === bestLen) found.add(s.slice(i, j));
          }
        if (found.size <= 1) return [s, t];
      }
    }`,
    cases: [
      { input: ["ADOBECODEBANC", "ABC"], hidden: false },
      { input: ["a", "a"], hidden: false },
      { input: ["a", "aa"], hidden: false, edge: "no-answer", note: "s has only one 'a' but t needs two: return the empty string." },
      { input: ["ADOBECODEBANC", "AABC"], hidden: false, edge: "duplicates", note: "t needs two A's, so the window must stretch to cover both. Counts matter, not just the set of letters." },
      { input: ["aaaaa", "aa"], hidden: true, edge: "all-equal", note: "Every window of length 2 is the same string. Return it, not the whole thing." },
      { input: ["aBcDAb", "Ab"], hidden: true, edge: "case-mix", note: "Case matters: 'A' and 'a' are different letters, so the lowercase 'a' at the front doesn't count." },
      { input: ["xyzab", "zab"], hidden: true, edge: "boundary", note: "The only minimum window ends at the last character." },
      { input: ["abc", "abc"], hidden: true },
      { input: ["ab", "b"], hidden: true },
      { input: ["a" + "x".repeat(1200) + "bc" + "x".repeat(1200) + "abc", "abc"], hidden: true, edge: "large", note: "A 2400-character string: the shortest window is at the very end, after long misleading windows." },
    ],
  },
  {
    slug: "find-all-anagrams-in-a-string",
    functionName: "findAnagrams",
    params: ["s", "p"],
    returnType: "number[]",
    starter: "/**\n * @param {string} s\n * @param {string} p\n * @return {number[]}\n */\nfunction findAnagrams(s, p) {\n  \n}",
    hints: [
      "Which stretches of s could possibly be an anagram of p, and what is the one thing about letters that makes two strings anagrams?",
      "Anagrams have equal letter counts. Slide a window of length p.length across s, update the counts by adding the new letter and removing the old one, and record the start index whenever the counts equal p's counts.",
      "if len(p) > len(s): return empty list\nneed = counts of letters in p\nwindow = counts of the first len(p) letters of s\nresult = empty list\nif window == need: add 0 to result\nfor right from len(p) to len(s) - 1:\n  add s[right] to window\n  remove s[right - len(p)] from window\n  if window == need: add (right - len(p) + 1) to result\nreturn result",
    ],
    reference: `function findAnagrams(s, p) {
      const m = p.length, out = [];
      if (m > s.length) return out;
      const need = new Array(26).fill(0), win = new Array(26).fill(0);
      const idx = (c) => c.charCodeAt(0) - 97;
      for (let i = 0; i < m; i++) { need[idx(p[i])]++; win[idx(s[i])]++; }
      const same = () => { for (let i = 0; i < 26; i++) if (need[i] !== win[i]) return false; return true; };
      if (same()) out.push(0);
      for (let r = m; r < s.length; r++) {
        win[idx(s[r])]++;
        win[idx(s[r - m])]--;
        if (same()) out.push(r - m + 1);
      }
      return out;
    }`,
    brute: `function findAnagrams(s, p) {
      const target = p.split("").sort().join("");
      const out = [];
      for (let i = 0; i + p.length <= s.length; i++)
        if (s.slice(i, i + p.length).split("").sort().join("") === target) out.push(i);
      return out;
    }`,
    fuzz: `function gen(rand) {
      const pick = (n) => Array.from({ length: n }, () => "abc"[Math.floor(rand() * 3)]).join("");
      return [pick(1 + Math.floor(rand() * 10)), pick(1 + Math.floor(rand() * 3))];
    }`,
    cases: [
      { input: ["cbaebabacd", "abc"], hidden: false },
      { input: ["abab", "ab"], hidden: false },
      { input: ["ab", "abc"], hidden: false, edge: "no-answer", note: "p is longer than s: return an empty list without reading past the end." },
      { input: ["aaaaa", "aa"], hidden: false, edge: "all-equal", note: "Matches overlap: every start from 0 to 3 counts." },
      { input: ["a", "a"], hidden: true, edge: "single-char" },
      { input: ["xxxxabc", "abc"], hidden: true, edge: "boundary", note: "The only match starts at the last possible index (4)." },
      { input: ["baa", "aa"], hidden: true },
      { input: ["abacbabc", "abc"], hidden: true },
      { input: ["abc", "bca"], hidden: true },
      { input: ["abcdefghij".repeat(300), "jihgfedcba"], hidden: true, edge: "large", note: "3000 characters with a match at every tenth position: comparing sorted windows is slow, and indices must stay ascending." },
    ],
  },
  {
    slug: "is-subsequence",
    functionName: "isSubsequence",
    params: ["s", "t"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @param {string} t\n * @return {boolean}\n */\nfunction isSubsequence(s, t) {\n  \n}",
    hints: [
      "Read t from left to right. What is the next letter of s you are still waiting to see?",
      "Two pointers: one into s (next letter needed) and one scanning t. Advance the s pointer only when the letters match. s is a subsequence exactly when the s pointer reaches the end.",
      "i = 0\nfor each character c in t:\n  if i < len(s) and c == s[i]:\n    i += 1\nreturn i == len(s)",
    ],
    reference: `function isSubsequence(s, t) {
      let i = 0;
      for (let j = 0; j < t.length && i < s.length; j++) if (s[i] === t[j]) i++;
      return i === s.length;
    }`,
    // Longest-common-subsequence table: s is a subsequence of t exactly when the LCS has length |s|.
    brute: `function isSubsequence(s, t) {
      const n = s.length, m = t.length;
      let prev = new Array(m + 1).fill(0);
      for (let i = 1; i <= n; i++) {
        const cur = new Array(m + 1).fill(0);
        for (let j = 1; j <= m; j++) cur[j] = s[i - 1] === t[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
        prev = cur;
      }
      return prev[m] === n;
    }`,
    fuzz: `function gen(rand) {
      const pick = (n) => Array.from({ length: n }, () => "abc"[Math.floor(rand() * 3)]).join("");
      return [pick(Math.floor(rand() * 5)), pick(Math.floor(rand() * 10))];
    }`,
    cases: [
      { input: ["abc", "ahbgdc"], hidden: false },
      { input: ["axc", "ahbgdc"], hidden: false },
      { input: ["", "ahbgdc"], hidden: false, edge: "empty", note: "The empty string is a subsequence of anything: return true without scanning." },
      { input: ["abc", "ab"], hidden: false, edge: "no-answer", note: "s is longer than t, so it can never fit." },
      { input: ["", ""], hidden: true, edge: "empty", note: "Both empty: still true." },
      { input: ["a", "a"], hidden: true, edge: "single-char" },
      { input: ["aaa", "abab"], hidden: true, edge: "duplicates", note: "Each letter of t is used at most once: three a's are needed but t has only two." },
      { input: ["ac", "abbbbc"], hidden: true, edge: "boundary", note: "The match uses the first and the last character of t." },
      { input: ["ba", "ab"], hidden: true },
      { input: ["ace", "abcde"], hidden: true },
      { input: ["abc".repeat(400), "abc".repeat(1000)], hidden: true, edge: "large", note: "1200 letters against 3000: a full 2D table or recursion over both strings is far heavier than one scan." },
    ],
  },
];
