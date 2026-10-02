import type { ProblemSpec } from "../types";

export const STACK_SEARCH: ProblemSpec[] = [
  {
    slug: "daily-temperatures",
    functionName: "dailyTemperatures",
    params: ["temperatures"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} temperatures\n * @return {number[]}\n */\nfunction dailyTemperatures(temperatures) {\n  \n}",
    hints: [
      "When you reach a warm day, which of the earlier days were still waiting for something warmer than themselves?",
      "Keep a stack of day indices whose answer is still unknown; their temperatures never increase from bottom to top. Each new day resolves (pops) every waiting day that is colder, and then waits itself.",
      "answer = array of zeros, same length as temperatures\nwaiting = empty stack of indices\nfor i from 0 to n - 1:\n  while waiting is not empty and temperatures[top of waiting] < temperatures[i]:\n    j = pop waiting\n    answer[j] = i - j\n  push i onto waiting\nreturn answer",
    ],
    reference: `function dailyTemperatures(temperatures) {
      const res = new Array(temperatures.length).fill(0);
      const st = [];
      for (let i = 0; i < temperatures.length; i++) {
        while (st.length && temperatures[st[st.length - 1]] < temperatures[i]) {
          const j = st.pop();
          res[j] = i - j;
        }
        st.push(i);
      }
      return res;
    }`,
    brute: `function dailyTemperatures(temperatures) {
      const res = [];
      for (let i = 0; i < temperatures.length; i++) {
        let d = 0;
        for (let j = i + 1; j < temperatures.length; j++) {
          if (temperatures[j] > temperatures[i]) { d = j - i; break; }
        }
        res.push(d);
      }
      return res;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 9); return [Array.from({ length: n }, () => 30 + Math.floor(rand() * 8))]; }`,
    cases: [
      { input: [[73, 74, 75, 71, 69, 72, 76, 73]], hidden: false },
      { input: [[30, 40, 50, 60]], hidden: false },
      { input: [[30, 60, 90]], hidden: false },
      { input: [[50]], hidden: false, edge: "single", note: "There is no later day, so the answer is just [0]." },
      { input: [[70, 70, 70]], hidden: false, edge: "all-equal", note: "Equal is not warmer: every day waits forever, so all zeros." },
      { input: [[90, 80, 70, 60]], hidden: false, edge: "reverse-sorted", note: "Nothing is ever warmer than what came before, so every answer is 0." },
      { input: [[30, 100]], hidden: true, edge: "two" },
      { input: [[55, 38, 53, 81, 61, 93, 97, 32, 43, 78]], hidden: true },
      { input: [[100, 30, 100, 99, 100]], hidden: true, edge: "extremes", note: "Values at both limits, with ties at 100 that must not count as warmer." },
      { input: [[60, 60, 61, 60, 62]], hidden: true, edge: "duplicates", note: "Repeated 60s: a tie must stay on the stack until something strictly warmer arrives." },
      { input: [[89, 62, 70, 58, 47, 47, 46, 76, 100, 70]], hidden: true },
      { input: [Array.from({ length: 1500 }, (_, i) => 100 - (i % 71))], hidden: true, edge: "large", note: "1500 days of repeating long cold stretches: re-scanning forward for every day is quadratic." },
    ],
  },
  {
    slug: "evaluate-reverse-polish-notation",
    functionName: "evalRPN",
    params: ["tokens"],
    returnType: "number",
    starter: "/**\n * @param {string[]} tokens\n * @return {number}\n */\nfunction evalRPN(tokens) {\n  \n}",
    hints: [
      "When you meet an operator, which two values does it apply to, and where have those values been waiting?",
      "Use a stack of numbers. Push each number token. For an operator, pop the right operand first, then the left one, apply the operator, and push the result. Division must truncate toward zero, not floor.",
      "stack = empty\nfor token in tokens:\n  if token is a number: push its integer value\n  else:\n    right = pop stack\n    left = pop stack\n    push (left token right), truncating division toward zero\nreturn the only value left on the stack",
    ],
    reference: `function evalRPN(tokens) {
      const st = [];
      for (const t of tokens) {
        if (t === '+' || t === '-' || t === '*' || t === '/') {
          const b = st.pop(), a = st.pop();
          if (t === '+') st.push(a + b);
          else if (t === '-') st.push(a - b);
          else if (t === '*') st.push(a * b);
          else st.push(Math.trunc(a / b));
        } else st.push(Number(t));
      }
      return st[0] + 0;
    }`,
    brute: `function evalRPN(tokens) {
      // Rebuild the expression tree by reading from the end.
      let i = tokens.length - 1;
      function parse() {
        const t = tokens[i--];
        if (t !== '+' && t !== '-' && t !== '*' && t !== '/') return parseInt(t, 10);
        const b = parse();
        const a = parse();
        if (t === '+') return a + b;
        if (t === '-') return a - b;
        if (t === '*') return a * b;
        const q = Math.floor(Math.abs(a) / Math.abs(b));
        return (a < 0) !== (b < 0) ? -q : q;
      }
      return parse() + 0;
    }`,
    // Random valid expression trees with small operands; never divides by zero.
    fuzz: `function gen(rand) {
      function build(d) {
        if (d === 0 || rand() < 0.3) { const v = Math.floor(rand() * 21) - 10; return { t: [String(v)], v: v }; }
        const l = build(d - 1), r = build(d - 1);
        let op = ['+', '-', '*', '/'][Math.floor(rand() * 4)];
        if (op === '/' && r.v === 0) op = '+';
        let v;
        if (op === '+') v = l.v + r.v;
        else if (op === '-') v = l.v - r.v;
        else if (op === '*') v = l.v * r.v;
        else v = Math.trunc(l.v / r.v) + 0;
        return { t: l.t.concat(r.t, [op]), v: v + 0 };
      }
      return [build(1 + Math.floor(rand() * 3)).t];
    }`,
    cases: [
      { input: [["2", "1", "+", "3", "*"]], hidden: false },
      { input: [["4", "13", "5", "/", "+"]], hidden: false },
      { input: [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]], hidden: false },
      { input: [["42"]], hidden: false, edge: "single", note: "A lone number token is already the answer: no operator ever runs." },
      { input: [["-7", "2", "/"]], hidden: false, edge: "negatives", note: "-7 / 2 must give -3 (truncate toward zero), not -4 from Math.floor." },
      { input: [["0", "3", "-"]], hidden: false, edge: "zeros", note: "A zero operand with subtraction: the operand order (left minus right) decides the sign." },
      { input: [["7", "-2", "/"]], hidden: true, edge: "negatives", note: "Negative divisor: the quotient -3.5 truncates to -3, and the token '-2' is a number, not an operator." },
      { input: [["-7", "-2", "/"]], hidden: true, edge: "negatives" },
      { input: [["3", "4", "-"]], hidden: true },
      { input: [["200", "200", "*", "200", "*", "200", "*"]], hidden: true, edge: "extremes", note: "The largest operands, ending near 1.6 billion: still inside 32 bits but easy to bungle with bitwise tricks." },
      { input: [["18", "3", "/", "2", "2", "*", "-", "5", "+"]], hidden: true },
      { input: [["1", ...Array.from({ length: 600 }, () => ["1", "+"]).flat()]], hidden: true, edge: "large", note: "1200+ tokens, one long left-leaning chain: a recursive parser nests very deep, and re-scanning for operators is slow." },
    ],
  },
  {
    slug: "generate-parentheses",
    functionName: "generateParenthesis",
    params: ["n"],
    returnType: "string[]",
    compare: "unordered",
    starter: "/**\n * @param {number} n\n * @return {string[]}\n */\nfunction generateParenthesis(n) {\n  \n}",
    hints: [
      "At each position you choose '(' or ')'. What simple rule keeps the prefix from ever becoming impossible to fix?",
      "Backtracking: keep counts of opens and closes used so far. You may add '(' while opens < n, and add ')' only while closes < opens. Every string that reaches length 2n is valid, so no final check is needed.",
      "results = empty list\nbuild(current, opens, closes):\n  if length of current == 2 * n: add current to results; return\n  if opens < n: build(current + '(', opens + 1, closes)\n  if closes < opens: build(current + ')', opens, closes + 1)\nbuild('', 0, 0)\nreturn results",
    ],
    reference: `function generateParenthesis(n) {
      const res = [];
      function go(cur, open, close) {
        if (cur.length === 2 * n) { res.push(cur); return; }
        if (open < n) go(cur + '(', open + 1, close);
        if (close < open) go(cur + ')', open, close + 1);
      }
      go('', 0, 0);
      return res;
    }`,
    brute: `function generateParenthesis(n) {
      const res = [];
      const len = 2 * n;
      for (let mask = 0; mask < (1 << len); mask++) {
        let bal = 0, ok = true, s = '';
        for (let b = 0; b < len; b++) {
          if ((mask >> b) & 1) { s += '('; bal++; } else { s += ')'; bal--; }
          if (bal < 0) { ok = false; break; }
        }
        if (ok && bal === 0) res.push(s);
      }
      return res;
    }`,
    fuzz: `function gen(rand) { return [1 + Math.floor(rand() * 5)]; }`,
    cases: [
      { input: [3], hidden: false },
      { input: [4], hidden: false },
      { input: [1], hidden: false, edge: "min-size", note: "n = 1 has exactly one answer, '()': loops that assume at least two pairs break." },
      { input: [2], hidden: false, edge: "order", note: "Two answers, '(())' and '()()'. Any order is accepted, so don't rely on one." },
      { input: [5], hidden: true },
      { input: [6], hidden: true },
      { input: [7], hidden: true, edge: "large", note: "429 results. Generating all 2^14 strings and filtering wastes work; pruning keeps only valid prefixes." },
    ],
  },
  {
    slug: "largest-rectangle-in-histogram",
    functionName: "largestRectangleArea",
    params: ["heights"],
    returnType: "number",
    starter: "/**\n * @param {number[]} heights\n * @return {number}\n */\nfunction largestRectangleArea(heights) {\n  \n}",
    hints: [
      "For one bar to be the shortest bar of a rectangle, how far can that rectangle stretch to the left and to the right?",
      "Maintain a stack of bar indices with increasing heights. When a bar is lower than the stack top, the top bar can no longer extend right, so pop it and compute its area: its width runs from the new top of the stack (exclusive) to the current index (exclusive). Add a final height-0 bar to flush the stack.",
      "stack = empty (indices, heights increasing)\nbest = 0\nfor i from 0 to n (treat height at index n as 0):\n  while stack not empty and height[top] >= height at i:\n    h = height[pop]\n    leftEdge = (stack empty) ? 0 : top + 1\n    best = max(best, h * (i - leftEdge))\n  push i\nreturn best",
    ],
    reference: `function largestRectangleArea(heights) {
      const st = [];
      let best = 0;
      for (let i = 0; i <= heights.length; i++) {
        const cur = i === heights.length ? 0 : heights[i];
        while (st.length && heights[st[st.length - 1]] >= cur) {
          const h = heights[st.pop()];
          const left = st.length ? st[st.length - 1] + 1 : 0;
          best = Math.max(best, h * (i - left));
        }
        st.push(i);
      }
      return best;
    }`,
    brute: `function largestRectangleArea(heights) {
      let best = 0;
      for (let i = 0; i < heights.length; i++) {
        let min = Infinity;
        for (let j = i; j < heights.length; j++) {
          min = Math.min(min, heights[j]);
          best = Math.max(best, min * (j - i + 1));
        }
      }
      return best;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 9); return [Array.from({ length: n }, () => Math.floor(rand() * 9))]; }`,
    cases: [
      { input: [[2, 1, 5, 6, 2, 3]], hidden: false },
      { input: [[2, 4]], hidden: false },
      { input: [[5]], hidden: false, edge: "single", note: "One bar of width 1: the area is simply its height." },
      { input: [[3, 3, 3, 3]], hidden: false, edge: "all-equal", note: "Equal heights: the whole histogram is one rectangle, so equal bars must be merged, not split." },
      { input: [[1, 2, 3, 4, 5]], hidden: false, edge: "sorted", note: "Heights only rise, so nothing is popped until the end: a final flush is required." },
      { input: [[5, 4, 3, 2, 1]], hidden: true, edge: "reverse-sorted" },
      { input: [[2, 0, 2]], hidden: true, edge: "zeros", note: "A zero-height bar splits the histogram: the best rectangle can't span it." },
      { input: [[0, 0, 0]], hidden: true, edge: "zeros", note: "Every bar has height 0, so the answer is 0 (not undefined or -Infinity)." },
      { input: [[6, 2, 5, 4, 5, 1, 6]], hidden: true },
      { input: [[10000, 10000, 10000]], hidden: true, edge: "extremes", note: "Max heights: the area is 30000 and must come from the width times the height." },
      { input: [[2, 3]], hidden: true, edge: "two" },
      { input: [Array.from({ length: 1200 }, (_, i) => i + 1)], hidden: true, edge: "large", note: "1200 strictly rising bars: an O(n^2) scan does about 700k steps here, the stack version does about 2400." },
    ],
  },
  {
    slug: "next-greater-element-i",
    functionName: "nextGreaterElement",
    params: ["nums1", "nums2"],
    returnType: "number[]",
    starter: "/**\n * @param {number[]} nums1\n * @param {number[]} nums2\n * @return {number[]}\n */\nfunction nextGreaterElement(nums1, nums2) {\n  \n}",
    hints: [
      "Forget nums1 for a moment: how would you find the next greater value for every element of nums2 in one pass?",
      "Walk nums2 with a stack of values still waiting for a bigger one. Each new value pops (and answers) every smaller waiting value; record 'value to its next greater' in a map. Then answer each nums1 entry with a map lookup, defaulting to -1.",
      "next = empty map\nwaiting = empty stack\nfor x in nums2:\n  while waiting not empty and top of waiting < x:\n    next[pop waiting] = x\n  push x\nresult = empty list\nfor v in nums1:\n  add (next[v] if present, otherwise -1) to result\nreturn result",
    ],
    reference: `function nextGreaterElement(nums1, nums2) {
      const next = new Map();
      const st = [];
      for (const x of nums2) {
        while (st.length && st[st.length - 1] < x) next.set(st.pop(), x);
        st.push(x);
      }
      return nums1.map((v) => (next.has(v) ? next.get(v) : -1));
    }`,
    brute: `function nextGreaterElement(nums1, nums2) {
      const res = [];
      for (const v of nums1) {
        const at = nums2.indexOf(v);
        let found = -1;
        for (let j = at + 1; j < nums2.length; j++) if (nums2[j] > v) { found = nums2[j]; break; }
        res.push(found);
      }
      return res;
    }`,
    // nums2 has distinct values; nums1 is a distinct subset of nums2 in random order.
    fuzz: `function gen(rand) {
      const pool = Array.from({ length: 15 }, (_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const m = 1 + Math.floor(rand() * 8);
      const nums2 = pool.slice(0, m);
      const pick = nums2.slice();
      for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
      const k = 1 + Math.floor(rand() * m);
      return [pick.slice(0, k), nums2];
    }`,
    cases: [
      { input: [[4, 1, 2], [1, 3, 4, 2]], hidden: false },
      { input: [[2, 4], [1, 2, 3, 4]], hidden: false },
      { input: [[1], [1]], hidden: false, edge: "single", note: "Nothing follows the only element, so the answer is [-1]." },
      { input: [[1, 2, 3], [1, 2, 3, 4]], hidden: false, edge: "sorted", note: "Every value's next greater is the very next element, except the last, which has none." },
      { input: [[1, 2], [5, 4, 3, 2, 1]], hidden: false, edge: "reverse-sorted", note: "A strictly falling nums2 has no greater element anywhere to the right, so all -1." },
      { input: [[3, 1], [1, 2, 3, 4]], hidden: true },
      { input: [[4], [1, 2, 3, 4]], hidden: true, edge: "boundary", note: "The element sits at the very end of nums2: no greater value can come after it." },
      { input: [[0, 1], [0, 1]], hidden: true, edge: "zeros", note: "0 is a real value: a map lookup using truthiness would treat a stored 0 as missing." },
      { input: [[10000, 0, 5000], [5000, 0, 10000]], hidden: true, edge: "extremes", note: "Values at both limits of the range." },
      { input: [[2, 7, 6], [5, 2, 9, 7, 3, 6, 8]], hidden: true },
      { input: [[8, 5, 2], [2, 8, 5, 1, 9, 3, 7, 4, 6, 0]], hidden: true },
      { input: [Array.from({ length: 200 }, (_, i) => ((i * 5) * 7) % 1009), Array.from({ length: 1000 }, (_, i) => (i * 7) % 1009)], hidden: true, edge: "large", note: "1000 distinct values in nums2: rescanning to the right for each lookup is quadratic work." },
    ],
  },
  {
    slug: "decode-string",
    functionName: "decodeString",
    params: ["s"],
    returnType: "string",
    starter: "/**\n * @param {string} s\n * @return {string}\n */\nfunction decodeString(s) {\n  \n}",
    hints: [
      "When you hit ']', what do you need to remember from the matching '[' to finish the repeat?",
      "Use a stack. Keep the text built so far and the repeat count being read (counts can have several digits). On '[', push both and start fresh. On ']', pop the previous text and count, then set current = previous + current repeated count times.",
      "stack = empty\ncurrent = empty text\ncount = 0\nfor ch in s:\n  if ch is a digit: count = count * 10 + digit\n  else if ch == '[': push (current, count); current = empty; count = 0\n  else if ch == ']': (prev, k) = pop; current = prev + current repeated k times\n  else: append ch to current\nreturn current",
    ],
    reference: `function decodeString(s) {
      const st = [];
      let cur = '', num = 0;
      for (const ch of s) {
        if (ch >= '0' && ch <= '9') num = num * 10 + (ch.charCodeAt(0) - 48);
        else if (ch === '[') { st.push([cur, num]); cur = ''; num = 0; }
        else if (ch === ']') { const top = st.pop(); cur = top[0] + cur.repeat(top[1]); }
        else cur += ch;
      }
      return cur;
    }`,
    brute: `function decodeString(s) {
      let i = 0;
      function parse() {
        let out = '';
        while (i < s.length && s[i] !== ']') {
          if (s[i] >= '0' && s[i] <= '9') {
            let k = 0;
            while (s[i] >= '0' && s[i] <= '9') { k = k * 10 + Number(s[i]); i++; }
            i++; // skip '['
            const inner = parse();
            i++; // skip ']'
            for (let t = 0; t < k; t++) out += inner;
          } else { out += s[i]; i++; }
        }
        return out;
      }
      return parse();
    }`,
    // Random well-formed encodings: letters a-c, repeat counts 1-4, nesting up to 2 deep.
    fuzz: `function gen(rand) {
      function seq(d) {
        const parts = 1 + Math.floor(rand() * 3);
        let out = '';
        for (let p = 0; p < parts; p++) {
          if (d > 0 && rand() < 0.5) out += (1 + Math.floor(rand() * 4)) + '[' + seq(d - 1) + ']';
          else { const len = 1 + Math.floor(rand() * 3); for (let i = 0; i < len; i++) out += 'abc'[Math.floor(rand() * 3)]; }
        }
        return out;
      }
      return [seq(2)];
    }`,
    cases: [
      { input: ["3[a]2[bc]"], hidden: false },
      { input: ["3[a2[c]]"], hidden: false },
      { input: ["2[abc]3[cd]ef"], hidden: false },
      { input: ["z"], hidden: false, edge: "single-char", note: "No brackets at all: plain letters must pass through untouched." },
      { input: ["1[a]"], hidden: false, edge: "min-size", note: "The shortest encoded string: a repeat count of 1 around one letter." },
      { input: ["10[a]"], hidden: true },
      { input: ["abcd"], hidden: true },
      { input: ["2[2[2[2[a]]]]"], hidden: true },
      { input: ["ab2[c]d3[e]f"], hidden: true },
      { input: ["300[ab]"], hidden: true, edge: "extremes", note: "The maximum repeat count (300) with a two-letter body: three digits and a 600-character result." },
      { input: ["1[".repeat(800) + "ab" + "]".repeat(800)], hidden: true, edge: "large", note: "800 levels of nesting: recursion that does too much per level, or builds strings badly, struggles here." },
    ],
  },
  {
    slug: "search-insert-position",
    functionName: "searchInsert",
    params: ["nums", "target"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction searchInsert(nums, target) {\n  \n}",
    hints: [
      "If target isn't in the array, which position is 'the first element that is not smaller than target'?",
      "Binary search for the lower bound: the smallest index whose value is >= target (or n if none). That index is both the match position and the insertion position. Use a half-open range [lo, hi) with hi = n so the 'append at the end' answer is reachable.",
      "lo = 0\nhi = length of nums\nwhile lo < hi:\n  mid = lo + (hi - lo) / 2, rounded down\n  if nums[mid] < target: lo = mid + 1\n  else: hi = mid\nreturn lo",
    ],
    reference: `function searchInsert(nums, target) {
      let lo = 0, hi = nums.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }`,
    brute: `function searchInsert(nums, target) {
      for (let i = 0; i < nums.length; i++) if (nums[i] >= target) return i;
      return nums.length;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      let v = Math.floor(rand() * 10) - 5;
      const nums = [];
      for (let i = 0; i < n; i++) { nums.push(v); v += 1 + Math.floor(rand() * 4); }
      const target = nums[0] - 3 + Math.floor(rand() * (nums[n - 1] - nums[0] + 7));
      return [nums, target];
    }`,
    cases: [
      { input: [[1, 3, 5, 6], 5] , hidden: false },
      { input: [[1, 3, 5, 6], 2], hidden: false },
      { input: [[1, 3, 5, 6], 7], hidden: false, edge: "boundary", note: "Bigger than everything: the answer is nums.length, one past the last index." },
      { input: [[1], 0], hidden: false, edge: "single", note: "One element and a smaller target: insert at the front, index 0." },
      { input: [[1, 3, 5, 6], 0], hidden: true, edge: "boundary", note: "Smaller than everything: the answer is 0." },
      { input: [[1, 3], 3], hidden: true, edge: "two" },
      { input: [[-5, -2, 0, 4], -3], hidden: true, edge: "negatives" },
      { input: [[2, 4, 6, 8, 10, 12], 9], hidden: true },
      { input: [[-10000, 10000], 10000], hidden: true, edge: "extremes", note: "Both ends of the allowed range, with the target equal to the maximum." },
      { input: [Array.from({ length: 1000 }, (_, i) => i * 2), 1001], hidden: true, edge: "large", note: "1000 sorted values and a target that is absent: a linear scan works but binary search needs about 10 steps." },
    ],
  },
  {
    slug: "sqrtx",
    functionName: "mySqrt",
    params: ["x"],
    returnType: "number",
    starter: "/**\n * @param {number} x\n * @return {number}\n */\nfunction mySqrt(x) {\n  \n}",
    hints: [
      "The answer is the largest integer r whose square does not exceed x. What kind of search finds 'the largest value that still satisfies a test'?",
      "Binary search r between 0 and x (or a tighter cap). If mid * mid <= x, mid is a candidate and the answer is mid or larger; otherwise search lower. Compare mid * mid with x directly, or use mid <= x / mid, instead of calling a built-in square root.",
      "lo = 0\nhi = min(x, 46340)\nanswer = 0\nwhile lo <= hi:\n  mid = (lo + hi) / 2, rounded down\n  if mid * mid <= x:\n    answer = mid\n    lo = mid + 1\n  else:\n    hi = mid - 1\nreturn answer",
    ],
    reference: `function mySqrt(x) {
      let lo = 0, hi = Math.min(x, 46340), ans = 0;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (mid * mid <= x) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      return ans;
    }`,
    brute: `function mySqrt(x) {
      let r = 0;
      while ((r + 1) * (r + 1) <= x) r++;
      return r;
    }`,
    fuzz: `function gen(rand) { return [rand() < 0.7 ? Math.floor(rand() * 200) : Math.floor(rand() * 2147483648)]; }`,
    cases: [
      { input: [4], hidden: false },
      { input: [8], hidden: false },
      { input: [0], hidden: false, edge: "zeros", note: "sqrt(0) is 0: a search that starts at lo = 1 or divides by mid breaks here." },
      { input: [1], hidden: false, edge: "min-size", note: "The smallest positive input is its own root." },
      { input: [2], hidden: true },
      { input: [15], hidden: true },
      { input: [16], hidden: true },
      { input: [26], hidden: true },
      { input: [2147395600], hidden: true, edge: "extremes", note: "46340 squared exactly. Squaring a guess above that overflows a 32-bit int." },
      { input: [2147483647], hidden: true, edge: "large", note: "The largest 32-bit value: counting up one by one takes tens of thousands of steps, and mid * mid overflows in 32-bit math." },
    ],
  },
  {
    slug: "koko-eating-bananas",
    functionName: "minEatingSpeed",
    params: ["piles", "h"],
    returnType: "number",
    starter: "/**\n * @param {number[]} piles\n * @param {number} h\n * @return {number}\n */\nfunction minEatingSpeed(piles, h) {\n  \n}",
    hints: [
      "If someone handed you a speed k, how would you decide whether it finishes in h hours? And what happens to that answer as k grows?",
      "Feasibility is monotonic: if speed k works, any faster speed works too. Binary search the speed between 1 and the biggest pile. For a candidate speed, the hours needed are the sum over piles of ceil(pile / k).",
      "lo = 1\nhi = largest pile\nwhile lo < hi:\n  mid = (lo + hi) / 2, rounded down\n  hours = sum over piles of ceil(pile / mid)\n  if hours <= h: hi = mid\n  else: lo = mid + 1\nreturn lo",
    ],
    reference: `function minEatingSpeed(piles, h) {
      let lo = 1, hi = Math.max(...piles);
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        let hours = 0;
        for (const p of piles) hours += Math.ceil(p / mid);
        if (hours <= h) hi = mid; else lo = mid + 1;
      }
      return lo;
    }`,
    brute: `function minEatingSpeed(piles, h) {
      // Try speeds upward, starting from the least speed that could possibly work (total / h).
      let total = 0;
      for (const p of piles) total += p;
      for (let k = Math.max(1, Math.ceil(total / h)); ; k++) {
        let hours = 0;
        for (const p of piles) hours += Math.ceil(p / k);
        if (hours <= h) return k;
      }
    }`,
    // piles.length <= h, as the problem guarantees.
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 6);
      const piles = Array.from({ length: n }, () => 1 + Math.floor(rand() * 30));
      const sum = piles.reduce((a, b) => a + b, 0);
      return [piles, n + Math.floor(rand() * (sum + 1))];
    }`,
    cases: [
      { input: [[3, 6, 7, 11], 8], hidden: false },
      { input: [[30, 11, 23, 4, 20], 5], hidden: false },
      { input: [[30, 11, 23, 4, 20], 6], hidden: false },
      { input: [[7], 3], hidden: false, edge: "single", note: "One pile of 7 in 3 hours: ceil(7 / k) <= 3 first holds at k = 3." },
      { input: [[5, 5, 5], 3], hidden: false, edge: "all-equal", note: "h equals the number of piles, so each pile gets exactly one hour: speed 5." },
      { input: [[4, 9, 2], 3], hidden: true, edge: "boundary", note: "h equals the pile count: Koko must finish a pile every hour, so the speed is the largest pile." },
      { input: [[1, 1, 1, 1], 1000000000], hidden: true, edge: "extremes", note: "A huge h: the minimum speed floors at 1, never 0." },
      { input: [[1000000000], 2], hidden: true, edge: "extremes", note: "A pile of 1 billion: the answer is 500000000, and a speed-by-speed scan from 1 would take forever." },
      { input: [[312884470], 312884469], hidden: true },
      { input: [[2, 2], 2], hidden: true, edge: "two" },
      { input: [[9, 1, 8, 3, 6, 2, 7], 14], hidden: true },
      { input: [Array.from({ length: 800 }, (_, i) => ((i * 37) % 900) + 100), 2400], hidden: true, edge: "large", note: "800 piles and thousands of candidate speeds: recomputing hours for every speed from 1 is slow; binary search is not." },
    ],
  },
  {
    slug: "find-minimum-in-rotated-sorted-array",
    functionName: "findMin",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction findMin(nums) {\n  \n}",
    hints: [
      "Compare the middle element with the last one. Which half must contain the drop (the minimum)?",
      "Binary search with lo and hi. If nums[mid] > nums[hi], the minimum is strictly to the right of mid, so lo = mid + 1. Otherwise the minimum is at mid or to its left, so hi = mid. When lo meets hi you are on the minimum; no special case for 'not rotated'.",
      "lo = 0\nhi = length of nums - 1\nwhile lo < hi:\n  mid = (lo + hi) / 2, rounded down\n  if nums[mid] > nums[hi]: lo = mid + 1\n  else: hi = mid\nreturn nums[lo]",
    ],
    reference: `function findMin(nums) {
      let lo = 0, hi = nums.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] > nums[hi]) lo = mid + 1;
        else hi = mid;
      }
      return nums[lo];
    }`,
    brute: `function findMin(nums) {
      let m = nums[0];
      for (let i = 1; i < nums.length; i++) if (nums[i] < m) m = nums[i];
      return m;
    }`,
    // Distinct ascending values rotated by a random amount (0 means not rotated).
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      let v = Math.floor(rand() * 10) - 5;
      const a = [];
      for (let i = 0; i < n; i++) { a.push(v); v += 1 + Math.floor(rand() * 4); }
      const k = Math.floor(rand() * n);
      return [a.slice(k).concat(a.slice(0, k))];
    }`,
    cases: [
      { input: [[3, 4, 5, 1, 2]], hidden: false },
      { input: [[4, 5, 6, 7, 0, 1, 2]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "A one-element array is its own minimum: the loop should not run at all." },
      { input: [[2, 1]], hidden: false, edge: "two", note: "The smallest array that is actually rotated: mid equals lo, so mid + 1 matters." },
      { input: [[11, 13, 15, 17]], hidden: false, edge: "sorted", note: "Rotated n times, i.e. not rotated at all: the minimum is the first element." },
      { input: [[2, 3, 4, 5, 1]], hidden: true, edge: "boundary", note: "The minimum is the last element, the largest possible rotation shift." },
      { input: [[-3, -1, 2, -7, -5]], hidden: true, edge: "negatives" },
      { input: [[5, 6, 7, 8, 9, 1, 2]], hidden: true },
      { input: [[3, 1, 2]], hidden: true },
      { input: [[0, 1, 2, 3]], hidden: true, edge: "zeros", note: "The minimum is 0: a result of 0 must not be mistaken for 'not found'." },
      { input: [Array.from({ length: 1000 }, (_, i) => ((i + 617) % 1000) * 3 - 1500)], hidden: true, edge: "large", note: "1000 rotated values: fine for a full scan, but the intent is O(log n)." },
    ],
  },
  {
    slug: "search-in-rotated-sorted-array",
    functionName: "search",
    params: ["nums", "target"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction search(nums, target) {\n  \n}",
    hints: [
      "Cut the array at the middle: is one of the two halves always fully sorted? How could you tell which one?",
      "In each step, at least one half around mid is sorted. Compare nums[lo] with nums[mid] to find it, then check whether target lies inside that sorted half's range. If it does, search that half; otherwise search the other one.",
      "lo = 0\nhi = length of nums - 1\nwhile lo <= hi:\n  mid = (lo + hi) / 2, rounded down\n  if nums[mid] == target: return mid\n  if nums[lo] <= nums[mid]:\n    if nums[lo] <= target and target < nums[mid]: hi = mid - 1\n    else: lo = mid + 1\n  else:\n    if nums[mid] < target and target <= nums[hi]: lo = mid + 1\n    else: hi = mid - 1\nreturn -1",
    ],
    reference: `function search(nums, target) {
      let lo = 0, hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
        } else {
          if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
        }
      }
      return -1;
    }`,
    brute: `function search(nums, target) {
      for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i;
      return -1;
    }`,
    // Distinct ascending values rotated by a random amount; the target is present about 60% of the time.
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 8);
      let v = Math.floor(rand() * 10) - 5;
      const a = [];
      for (let i = 0; i < n; i++) { a.push(v); v += 1 + Math.floor(rand() * 4); }
      const k = Math.floor(rand() * n);
      const nums = a.slice(k).concat(a.slice(0, k));
      const target = rand() < 0.6 ? a[Math.floor(rand() * n)] : Math.floor(rand() * (v + 9)) - 7;
      return [nums, target];
    }`,
    cases: [
      { input: [[4, 5, 6, 7, 0, 1, 2], 0], hidden: false },
      { input: [[4, 5, 6, 7, 0, 1, 2], 3], hidden: false },
      { input: [[1], 0], hidden: false, edge: "single", note: "One element that isn't the target: the answer is -1, and the loop must still terminate." },
      { input: [[3, 1], 1], hidden: false, edge: "two", note: "Two elements, rotated: mid equals lo, so 'which half is sorted' must use <=, not <." },
      { input: [[1, 2, 3, 4, 5], 4], hidden: false, edge: "sorted", note: "Not rotated at all: the usual binary search must still work." },
      { input: [[5, 1, 3], 5], hidden: true, edge: "boundary", note: "The target is the first element, which sits on the 'big' side of the rotation." },
      { input: [[4, 5, 6, 7, 0, 1, 2], 2], hidden: true, edge: "boundary", note: "The target is the last element." },
      { input: [[-1, 3, 5, -8, -6], -6], hidden: true, edge: "negatives" },
      { input: [[6, 7, 8, 1, 2, 3, 4, 5], 9], hidden: true, edge: "no-answer", note: "The target is larger than every value: return -1, don't return mid or lo." },
      { input: [[8, 9, 2, 3, 4, 5, 6, 7], 8], hidden: true },
      { input: [[10000, -10000], -10000], hidden: true, edge: "extremes" },
      { input: [Array.from({ length: 800 }, (_, i) => ((i + 351) % 800) * 2 - 999), 399], hidden: true, edge: "large", note: "800 rotated values and a target near the middle of the sorted order: the intent is O(log n)." },
    ],
  },
  {
    slug: "search-a-2d-matrix",
    functionName: "searchMatrix",
    params: ["matrix", "target"],
    returnType: "boolean",
    starter: "/**\n * @param {number[][]} matrix\n * @param {number} target\n * @return {boolean}\n */\nfunction searchMatrix(matrix, target) {\n  \n}",
    hints: [
      "Rows are sorted and each row starts after the previous one ends. If you wrote all the rows end to end, what would you have?",
      "The matrix behaves like one sorted array of m * n values. Binary search over indices 0 .. m * n - 1 and map an index back to a cell with row = floor(index / n) and column = index mod n.",
      "rows = number of rows\ncols = number of columns\nlo = 0\nhi = rows * cols - 1\nwhile lo <= hi:\n  mid = (lo + hi) / 2, rounded down\n  value = matrix[mid / cols, rounded down][mid mod cols]\n  if value == target: return true\n  if value < target: lo = mid + 1\n  else: hi = mid - 1\nreturn false",
    ],
    reference: `function searchMatrix(matrix, target) {
      const rows = matrix.length, cols = matrix[0].length;
      let lo = 0, hi = rows * cols - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = matrix[Math.floor(mid / cols)][mid % cols];
        if (v === target) return true;
        if (v < target) lo = mid + 1; else hi = mid - 1;
      }
      return false;
    }`,
    brute: `function searchMatrix(matrix, target) {
      for (const row of matrix) for (const v of row) if (v === target) return true;
      return false;
    }`,
    // Strictly increasing values laid out row by row, so each row starts after the previous one ends.
    fuzz: `function gen(rand) {
      const m = 1 + Math.floor(rand() * 4), n = 1 + Math.floor(rand() * 4);
      let v = Math.floor(rand() * 10) - 5;
      const start = v;
      const matrix = [];
      for (let r = 0; r < m; r++) {
        const row = [];
        for (let c = 0; c < n; c++) { row.push(v); v += 1 + Math.floor(rand() * 3); }
        matrix.push(row);
      }
      return [matrix, start - 2 + Math.floor(rand() * (v - start + 3))];
    }`,
    cases: [
      { input: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], hidden: false },
      { input: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], hidden: false },
      { input: [[[1]], 0], hidden: false, edge: "single", note: "A 1x1 matrix with an absent target: row and column bounds collapse to a single cell." },
      { input: [[[1, 3, 5]], 5], hidden: false, edge: "boundary", note: "A single row where the target is the last cell: the bottom-right corner." },
      { input: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60], hidden: true, edge: "boundary", note: "The very last cell of the matrix." },
      { input: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 1], hidden: true, edge: "boundary", note: "The very first cell of the matrix." },
      { input: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 24], hidden: true, edge: "no-answer", note: "24 falls inside the numeric range of the last row but isn't there: only a full check rules it out." },
      { input: [[[1], [3], [5]], 3], hidden: true },
      { input: [[[-9, -7], [-5, -1]], -5], hidden: true, edge: "negatives" },
      { input: [[[-10000, 0], [5, 10000]], 10000], hidden: true, edge: "extremes" },
      { input: [[[2, 4], [6, 8]], 5], hidden: true, edge: "two" },
      { input: [Array.from({ length: 30 }, (_, r) => Array.from({ length: 30 }, (_, c) => (r * 30 + c) * 5)), 2255], hidden: true, edge: "large", note: "A 30x30 grid: scanning every cell works but the sorted layout allows about 10 comparisons." },
    ],
  },
];
