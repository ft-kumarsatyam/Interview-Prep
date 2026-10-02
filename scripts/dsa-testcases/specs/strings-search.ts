import type { ProblemSpec } from "../types";

export const STRINGS_SEARCH: ProblemSpec[] = [
  {
    slug: "valid-anagram",
    functionName: "isAnagram",
    params: ["s", "t"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @param {string} t\n * @return {boolean}\n */\nfunction isAnagram(s, t) {\n  \n}",
    hints: [
      "If the two strings have different lengths, can they possibly be anagrams? After that, what do two anagrams have in common?",
      "They contain exactly the same characters with the same counts. Count the characters of s, then subtract while scanning t; any count that goes below zero means t has an extra.",
      "if lengths differ: return false\ncount = empty map\nfor c in s: count[c] += 1\nfor c in t:\n  count[c] -= 1\n  if count[c] < 0: return false\nreturn true",
    ],
    reference: `function isAnagram(s, t) {
      if (s.length !== t.length) return false;
      const count = {};
      for (const c of s) count[c] = (count[c] || 0) + 1;
      for (const c of t) { if (!count[c]) return false; count[c]--; }
      return true;
    }`,
    brute: `function isAnagram(s, t) { return s.split("").sort().join("") === t.split("").sort().join(""); }`,
    fuzz: `function gen(rand) {
      const pick = () => "abc"[Math.floor(rand() * 3)];
      const n = Math.floor(rand() * 6);
      const s = Array.from({ length: n }, pick);
      let t = s.slice();
      for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
      if (rand() < 0.5 && t.length) t[Math.floor(rand() * t.length)] = pick();
      if (rand() < 0.15) t.push(pick());
      return [s.join(""), t.join("")];
    }`,
    cases: [
      { input: ["anagram", "nagaram"], hidden: false },
      { input: ["rat", "car"], hidden: false },
      { input: ["", ""], hidden: false, edge: "empty", note: "Two empty strings are trivially anagrams of each other." },
      { input: ["a", "ab"], hidden: false, edge: "min-size", note: "Different lengths: the answer is false before any counting." },
      { input: ["aacc", "ccac"], hidden: false, edge: "duplicates", note: "Same letters but different counts: a Set-based check wrongly says true." },
      { input: ["abc", "bca"], hidden: true },
      { input: ["aab", "abb"], hidden: true, edge: "duplicates", note: "Same length and letters, different counts." },
      { input: ["z", "z"], hidden: true, edge: "single-char" },
      { input: ["listen", "silent"], hidden: true },
      { input: ["abcdefghij".repeat(30), "jihgfedcba".repeat(30)], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "valid-palindrome",
    functionName: "isPalindrome",
    params: ["s"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isPalindrome(s) {\n  \n}",
    hints: [
      "Which characters should count, and what should you do with upper and lower case before comparing?",
      "Two pointers, one at each end. Skip anything that isn't a letter or digit, compare the two lowercase characters, and move both inward. Any mismatch means false.",
      "l = 0; r = length - 1\nwhile l < r:\n  skip l forward while s[l] is not alphanumeric\n  skip r backward while s[r] is not alphanumeric\n  if lowercase(s[l]) != lowercase(s[r]): return false\n  l += 1; r -= 1\nreturn true",
    ],
    reference: `function isPalindrome(s) {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      let l = 0, r = clean.length - 1;
      while (l < r) { if (clean[l] !== clean[r]) return false; l++; r--; }
      return true;
    }`,
    brute: `function isPalindrome(s) {
      let t = "";
      for (const ch of s) if (/[A-Za-z0-9]/.test(ch)) t += ch.toLowerCase();
      return t === t.split("").reverse().join("");
    }`,
    fuzz: `function gen(rand) {
      const alphabet = "aAbB1 ,:";
      const n = Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("")];
    }`,
    cases: [
      { input: ["A man, a plan, a canal: Panama"], hidden: false },
      { input: ["race a car"], hidden: false },
      { input: [" "], hidden: false, edge: "empty", note: "Only a space: after cleaning there's nothing left, and an empty string is a palindrome." },
      { input: ["Aa"], hidden: false, edge: "case-mix", note: "A and a must match: compare lowercase." },
      { input: ["0P"], hidden: false, edge: "case-mix", note: "A digit and a letter that look alike are not equal; a regex that drops digits would say true." },
      { input: [".,"], hidden: true, edge: "empty", note: "Only punctuation." },
      { input: ["ab_a"], hidden: true, edge: "case-mix", note: "An underscore is not alphanumeric and must be skipped." },
      { input: ["x"], hidden: true, edge: "single-char" },
      { input: ["Was it a car or a cat I saw?"], hidden: true },
      { input: ["abcba".repeat(80)], hidden: true, edge: "large" },
      { input: ["ab"], hidden: true, edge: "two" },
    ],
  },
  {
    slug: "valid-parentheses",
    functionName: "isValid",
    params: ["s"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n  \n}",
    hints: [
      "The most recently opened bracket is the first one that has to be closed. Which data structure gives you the latest item first?",
      "Use a stack. Push every opening bracket. On a closing bracket the stack's top must be its matching opener: pop it, otherwise return false. At the end the stack must be empty.",
      "stack = empty\nfor c in s:\n  if c is an opener: push c\n  else:\n    if stack is empty or top != opener of c: return false\n    pop\nreturn stack is empty",
    ],
    reference: `function isValid(s) {
      const pairs = { ")": "(", "]": "[", "}": "{" };
      const stack = [];
      for (const c of s) {
        if (c === "(" || c === "[" || c === "{") stack.push(c);
        else if (stack.pop() !== pairs[c]) return false;
      }
      return stack.length === 0;
    }`,
    brute: `function isValid(s) {
      let prev = null;
      while (s !== prev) { prev = s; s = s.replace("()", "").replace("[]", "").replace("{}", ""); }
      return s.length === 0;
    }`,
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => "()[]{}"[Math.floor(rand() * 6)]).join("")];
    }`,
    cases: [
      { input: ["()"], hidden: false },
      { input: ["()[]{}"], hidden: false },
      { input: ["(]"], hidden: false },
      { input: ["("], hidden: false, edge: "single-char", note: "An opener that is never closed: the stack is not empty at the end." },
      { input: [")"], hidden: false, edge: "single-char", note: "A closer with nothing open: popping an empty stack must not count as a match." },
      { input: ["([)]"], hidden: true, edge: "order", note: "Every bracket has a partner, but they cross instead of nesting." },
      { input: ["{[]}"], hidden: true },
      { input: ["(("], hidden: true, edge: "all-equal" },
      { input: ["]["], hidden: true, edge: "boundary", note: "The right characters in the wrong order." },
      { input: ["((((((((((()))))))))))"], hidden: true, edge: "large" },
      { input: ["(){}}{"], hidden: true },
    ],
  },
  {
    slug: "binary-search",
    functionName: "search",
    params: ["nums", "target"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction search(nums, target) {\n  \n}",
    hints: [
      "nums is sorted. After comparing the middle element with the target, how much of the array can you throw away?",
      "Keep a window [lo, hi]. Look at mid: if it equals target, done; if it's smaller, the target can only be to the right (lo = mid + 1); otherwise to the left (hi = mid - 1). Stop when the window is empty.",
      "lo = 0; hi = length - 1\nwhile lo <= hi:\n  mid = (lo + hi) div 2\n  if nums[mid] == target: return mid\n  if nums[mid] < target: lo = mid + 1\n  else: hi = mid - 1\nreturn -1",
    ],
    reference: `function search(nums, target) {
      let lo = 0, hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
      }
      return -1;
    }`,
    brute: `function search(nums, target) { for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i; return -1; }`,
    // Distinct sorted values so the index is unique.
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 9);
      const set = new Set();
      while (set.size < n) set.add(Math.floor(rand() * 41) - 20);
      const nums = [...set].sort((a, b) => a - b);
      const target = rand() < 0.6 && n ? nums[Math.floor(rand() * n)] : Math.floor(rand() * 45) - 22;
      return [nums, target];
    }`,
    cases: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], hidden: false },
      { input: [[-1, 0, 3, 5, 9, 12], 2], hidden: false },
      { input: [[5], 5], hidden: false, edge: "single", note: "lo and hi start equal: a loop written as lo < hi never looks at the only element." },
      { input: [[5], -5], hidden: false, edge: "no-answer" },
      { input: [[-1, 0, 3, 5, 9, 12], -1], hidden: false, edge: "boundary", note: "The target is the first element: hi = mid - 1 must reach index 0." },
      { input: [[-1, 0, 3, 5, 9, 12], 12], hidden: true, edge: "boundary", note: "The target is the last element." },
      { input: [[-1, 0, 3, 5, 9, 12], 13], hidden: true, edge: "no-answer", note: "Bigger than everything: lo walks off the end." },
      { input: [[-1, 0, 3, 5, 9, 12], -5], hidden: true, edge: "no-answer", note: "Smaller than everything." },
      { input: [[1, 3], 3], hidden: true, edge: "two" },
      { input: [[2, 4, 6, 8], 6], hidden: true },
      { input: [Array.from({ length: 1000 }, (_, i) => i * 2), 1998], hidden: true, edge: "large", note: "1,000 sorted values: the target is near the end, and (lo + hi) / 2 without flooring breaks." },
    ],
  },
  {
    slug: "climbing-stairs",
    functionName: "climbStairs",
    params: ["n"],
    returnType: "number",
    starter: "/**\n * @param {number} n\n * @return {number}\n */\nfunction climbStairs(n) {\n  \n}",
    hints: [
      "To stand on step n, which two steps could your last move have started from?",
      "ways(n) = ways(n - 1) + ways(n - 2): a Fibonacci recurrence. Computing it recursively repeats work exponentially, so build it up from the bottom and keep only the last two values.",
      "a = 1; b = 1\nrepeat n - 1 times:\n  next = a + b\n  a = b\n  b = next\nreturn b",
    ],
    reference: `function climbStairs(n) { let a = 1, b = 1; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; }`,
    brute: `function climbStairs(n) { const dp = [1, 1]; for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2]; return dp[n]; }`,
    fuzz: `function gen(rand) { return [1 + Math.floor(rand() * 40)]; }`,
    cases: [
      { input: [2], hidden: false },
      { input: [3], hidden: false },
      { input: [1], hidden: false, edge: "min-size", note: "One step: there is exactly one way, and a loop starting at i = 2 never runs." },
      { input: [4], hidden: false },
      { input: [5], hidden: true },
      { input: [10], hidden: true },
      { input: [20], hidden: true },
      { input: [30], hidden: true, edge: "large", note: "Plain recursion makes over a million calls here and times out." },
      { input: [44], hidden: true },
      { input: [45], hidden: true, edge: "extremes", note: "The largest n the constraints allow: about 1.8 billion ways, still exact in a double." },
    ],
  },
  {
    slug: "longest-common-prefix",
    functionName: "longestCommonPrefix",
    params: ["strs"],
    returnType: "string",
    starter: "/**\n * @param {string[]} strs\n * @return {string}\n */\nfunction longestCommonPrefix(strs) {\n  \n}",
    hints: [
      "The common prefix can never be longer than the shortest string. How can you check one column of characters across all the strings?",
      "Take the first string as the candidate. Compare it with each other string and shorten the candidate until that string starts with it. If the candidate becomes empty, stop early.",
      "prefix = strs[0]\nfor each other string s:\n  while s does not start with prefix:\n    remove the last character of prefix\n    if prefix is empty: return \"\"\nreturn prefix",
    ],
    reference: `function longestCommonPrefix(strs) {
      if (!strs.length) return "";
      let prefix = strs[0];
      for (let i = 1; i < strs.length; i++) {
        while (!strs[i].startsWith(prefix)) { prefix = prefix.slice(0, -1); if (!prefix) return ""; }
      }
      return prefix;
    }`,
    brute: `function longestCommonPrefix(strs) {
      let out = "";
      for (let i = 0; ; i++) {
        const c = strs[0][i];
        if (c === undefined) return out;
        for (const s of strs) if (s[i] !== c) return out;
        out += c;
      }
    }`,
    fuzz: `function gen(rand) {
      const k = 1 + Math.floor(rand() * 4);
      const base = Array.from({ length: Math.floor(rand() * 4) }, () => "ab"[Math.floor(rand() * 2)]).join("");
      return [Array.from({ length: k }, () => base + Array.from({ length: Math.floor(rand() * 4) }, () => "abc"[Math.floor(rand() * 3)]).join(""))];
    }`,
    cases: [
      { input: [["flower", "flow", "flight"]], hidden: false },
      { input: [["dog", "racecar", "car"]], hidden: false },
      { input: [["alone"]], hidden: false, edge: "single", note: "One string: it is its own longest common prefix." },
      { input: [["", "b"]], hidden: false, edge: "empty", note: "An empty string in the list forces an empty answer." },
      { input: [["same", "same", "same"]], hidden: false, edge: "all-equal", note: "Every string is identical: the whole string is the prefix." },
      { input: [["interspecies", "interstellar", "interstate"]], hidden: true },
      { input: [["ab", "abc"]], hidden: true, edge: "boundary", note: "The shorter string is itself the prefix: don't index past its end." },
      { input: [["abc", "ab"]], hidden: true, edge: "boundary", note: "Same pair in the other order." },
      { input: [["a", "a"]], hidden: true, edge: "single-char" },
      { input: [["cir", "car"]], hidden: true },
      { input: [[("x".repeat(150) + "a"), ("x".repeat(150) + "b"), "x".repeat(150)]], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "roman-to-integer",
    functionName: "romanToInt",
    params: ["s"],
    returnType: "number",
    starter: "/**\n * @param {string} s\n * @return {number}\n */\nfunction romanToInt(s) {\n  \n}",
    hints: [
      "Each symbol has a fixed value. When is a symbol's value added, and when does a smaller symbol in front of a bigger one change that?",
      "Scan left to right. If the current symbol is smaller than the one right after it (IV, IX, XL ...), subtract it; otherwise add it.",
      "total = 0\nfor i from 0 to length - 1:\n  if i + 1 < length and value(s[i]) < value(s[i + 1]):\n    total -= value(s[i])\n  else:\n    total += value(s[i])\nreturn total",
    ],
    reference: `function romanToInt(s) {
      const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const cur = v[s[i]], next = v[s[i + 1]];
        if (next && cur < next) total -= cur; else total += cur;
      }
      return total;
    }`,
    brute: `function romanToInt(s) {
      const table = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
      let total = 0, i = 0;
      while (i < s.length) {
        for (const [sym, val] of table) if (s.startsWith(sym, i)) { total += val; i += sym.length; break; }
      }
      return total;
    }`,
    // Valid numerals only: build them from an integer.
    fuzz: `function gen(rand) {
      let n = 1 + Math.floor(rand() * 3999);
      const table = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
      let out = "";
      for (const [sym, val] of table) while (n >= val) { out += sym; n -= val; }
      return [out];
    }`,
    cases: [
      { input: ["III"], hidden: false },
      { input: ["LVIII"], hidden: false },
      { input: ["MCMXCIV"], hidden: false },
      { input: ["I"], hidden: false, edge: "single-char", note: "One symbol: there's no 'next' symbol to compare against." },
      { input: ["IV"], hidden: false, edge: "order", note: "A smaller symbol before a bigger one is subtracted: 4, not 6." },
      { input: ["IX"], hidden: true, edge: "order" },
      { input: ["XLII"], hidden: true },
      { input: ["CDXLIV"], hidden: true, edge: "order", note: "Two subtractive pairs back to back." },
      { input: ["MMMCMXCIX"], hidden: true, edge: "extremes", note: "3999, the largest numeral in the constraints." },
      { input: ["VIII"], hidden: true },
      { input: ["MMM"], hidden: true, edge: "all-equal" },
    ],
  },
];
