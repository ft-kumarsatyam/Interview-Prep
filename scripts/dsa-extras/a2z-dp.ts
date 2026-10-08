import { define, tuf, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const MOD = "1e9 + 7";

const frog: ProblemDef = {
  slug: "frog-jump",
  title: "Frog Jump",
  difficulty: "Easy",
  pattern: "1-D DP",
  url: tuf("frog-jump"),
  statement: "A frog starts on stair `0` and wants to reach the last stair. From stair `i` it can jump to `i + 1` or `i + 2`, and a jump from `i` to `j` costs `|heights[i] - heights[j]|` energy. Return the minimum total energy.",
  constraints: ["1 <= heights.length <= 10^5", "0 <= heights[i] <= 10^4"],
  fn: "frogJump",
  params: [["heights", "number[]"]],
  returns: "number",
  hints: [
    "The cheapest way to reach stair i only depends on the cheapest ways to reach i - 1 and i - 2.",
    "dp[i] = min(dp[i-1] + |h[i]-h[i-1]|, dp[i-2] + |h[i]-h[i-2]|). Two variables are enough instead of an array.",
    "prev2 = 0; prev = 0\nfor i from 1 to n - 1:\n  one = prev + |h[i] - h[i-1]|\n  two = prev2 + |h[i] - h[i-2]| if i > 1 else infinity\n  prev2 = prev; prev = min(one, two)\nreturn prev",
  ],
  reference: `function frogJump(h) { let a = 0, b = 0; for (let i = 1; i < h.length; i++) { const one = b + Math.abs(h[i] - h[i - 1]); const two = i > 1 ? a + Math.abs(h[i] - h[i - 2]) : Infinity; a = b; b = Math.min(one, two); } return b; }`,
  brute: `function frogJump(h) { const go = (i) => (i === 0 ? 0 : Math.min(go(i - 1) + Math.abs(h[i] - h[i - 1]), i > 1 ? go(i - 2) + Math.abs(h[i] - h[i - 2]) : Infinity)); return go(h.length - 1); }`,
  fuzz: arrayGen(1, 14, 0, 30),
  examples: [[[2, 1, 3, 5, 4]], [[7, 5, 1, 2, 6]]],
  edges: [
    ["single", [[5]], "Already on the last stair."],
    ["all-equal", [[4, 4, 4, 4]]],
    ["two", [[10, 3]]],
  ],
};

const frogK: ProblemDef = {
  slug: "frog-jump-with-k-distances",
  title: "Frog Jump with K Distances",
  difficulty: "Medium",
  pattern: "1-D DP",
  url: tuf("frog-jump-with-k-distances"),
  statement: "Like Frog Jump, but from stair `i` the frog can jump to any of `i + 1, ..., i + k`. A jump from `i` to `j` costs `|heights[i] - heights[j]|`. Return the minimum total energy to reach the last stair from stair `0`.",
  constraints: ["1 <= heights.length <= 10^5", "1 <= k <= 100"],
  fn: "frogJumpK",
  params: [["heights", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "Stair i can be reached from any of the k stairs before it.",
    "dp[0] = 0 and dp[i] = min over j in 1..k (j <= i) of dp[i-j] + |h[i] - h[i-j]|.",
    "dp[0] = 0\nfor i from 1 to n - 1:\n  dp[i] = infinity\n  for j from 1 to k:\n    if i - j >= 0: dp[i] = min(dp[i], dp[i-j] + |h[i] - h[i-j]|)\nreturn dp[n-1]",
  ],
  reference: `function frogJumpK(h, k) { const dp = [0]; for (let i = 1; i < h.length; i++) { let b = Infinity; for (let j = 1; j <= k && j <= i; j++) b = Math.min(b, dp[i - j] + Math.abs(h[i] - h[i - j])); dp.push(b); } return dp[h.length - 1]; }`,
  brute: `function frogJumpK(h, k) { const go = (i) => { if (i === 0) return 0; let b = Infinity; for (let j = 1; j <= k && j <= i; j++) b = Math.min(b, go(i - j) + Math.abs(h[i] - h[i - j])); return b; }; return go(h.length - 1); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 11), 0, 30), __r(rand, 1, 4)];`),
  examples: [[[10, 5, 20, 0, 15], 2], [[15, 4, 1, 14, 15], 3]],
  edges: [
    ["single", [[3], 2]],
    ["boundary", [[1, 9, 9, 9, 1], 4], "k reaches the last stair directly."],
    ["min-size", [[5, 1, 8], 1], "k = 1 means stepping on every stair."],
  ],
};

const ninja: ProblemDef = {
  slug: "ninjas-training",
  title: "Ninja's Training",
  difficulty: "Medium",
  pattern: "2-D DP",
  url: tuf("ninja's-training"),
  statement: "A ninja trains for `n` days. Each day they pick one of three activities, and `points[i][j]` is the merit for doing activity `j` on day `i`. They can't do the same activity two days in a row. Return the maximum total merit.",
  constraints: ["1 <= n <= 10^5", "0 <= points[i][j] <= 100"],
  fn: "ninjaTraining",
  params: [["points", "number[][]"]],
  returns: "number",
  hints: [
    "The only thing day i needs to know about the past is which activity was done yesterday.",
    "Let best[j] be the max merit up to today ending with activity j. Then newBest[j] = points[i][j] + max of best over the other two activities.",
    "best = points[0]\nfor i from 1 to n - 1:\n  next = [0, 0, 0]\n  for j in 0..2:\n    next[j] = points[i][j] + max(best[t] for t != j)\n  best = next\nreturn max(best)",
  ],
  reference: `function ninjaTraining(points) { let b = points[0].slice(); for (let i = 1; i < points.length; i++) b = [0, 1, 2].map((j) => points[i][j] + Math.max(...[0, 1, 2].filter((t) => t !== j).map((t) => b[t]))); return Math.max(...b); }`,
  brute: `function ninjaTraining(points) { const go = (i, last) => { if (i === points.length) return 0; let b = 0; for (let j = 0; j < 3; j++) if (j !== last) b = Math.max(b, points[i][j] + go(i + 1, j)); return b; }; return go(0, -1); }`,
  fuzz: gen(`return [Array.from({ length: __r(rand, 1, 8) }, function () { return __arr(rand, 3, 0, 20); })];`),
  examples: [[[[10, 40, 70], [20, 50, 80], [30, 60, 90]]], [[[10, 50, 1], [5, 100, 11]]]],
  edges: [
    ["single", [[[1, 2, 5]]]],
    ["all-equal", [[[3, 3, 3], [3, 3, 3]]]],
    ["zeros", [[[0, 0, 0], [0, 0, 0]]]],
  ],
};

const subsetSum: ProblemDef = {
  slug: "subset-sum-equals-to-target",
  title: "Subset Sum Equal to Target",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("subset-sum-equals-to-target"),
  statement: "Given an array of non-negative integers `arr` and an integer `target`, return `true` if some subset of `arr` (possibly empty) sums to exactly `target`.",
  constraints: ["1 <= arr.length <= 200", "0 <= arr[i] <= 1000", "0 <= target <= 10^4"],
  fn: "isSubsetSum",
  params: [["arr", "number[]"], ["target", "number"]],
  returns: "boolean",
  hints: [
    "Each element is either taken or skipped. What do you need to remember after deciding the first i elements?",
    "Keep a boolean array can[s] of reachable sums. For each element x, update s from target down to x: can[s] = can[s] or can[s - x].",
    "can = [false] * (target + 1); can[0] = true\nfor x in arr:\n  for s from target down to x:\n    if can[s - x]: can[s] = true\nreturn can[target]",
  ],
  reference: `function isSubsetSum(arr, target) { const c = new Array(target + 1).fill(false); c[0] = true; for (const x of arr) for (let s = target; s >= x; s--) if (c[s - x]) c[s] = true; return c[target]; }`,
  brute: `function isSubsetSum(arr, target) { const go = (i, s) => (s === target ? true : i === arr.length ? false : go(i + 1, s + arr[i]) || go(i + 1, s)); return go(0, 0); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 10), 0, 12), __r(rand, 0, 40)];`),
  examples: [[[1, 2, 7, 3], 6], [[2, 3, 5], 6]],
  edges: [
    ["zeros", [[3, 4], 0], "The empty subset sums to 0."],
    ["single", [[5], 5]],
    ["no-answer", [[2, 4, 6], 5], "All even: an odd target is impossible."],
  ],
};

const countSubsets: ProblemDef = {
  slug: "count-subsets-with-sum-k",
  title: "Count Subsets with Sum K",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("count-subsets-with-sum-k"),
  statement: "Given an array of non-negative integers `arr` and an integer `k`, return the number of subsets (chosen by index, so equal values at different positions count separately) whose sum is `k`, modulo `10^9 + 7`.",
  constraints: ["1 <= arr.length <= 100", "0 <= arr[i] <= 1000", "0 <= k <= 1000"],
  fn: "perfectSum",
  params: [["arr", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "It's subset sum, but you count ways instead of asking whether any exists.",
    "ways[s] starts as [1, 0, 0, ...]. For each element x, for s from k down to x: ways[s] += ways[s - x]. Zeros double every count, which this handles automatically.",
    "ways = [0] * (k + 1); ways[0] = 1\nfor x in arr:\n  for s from k down to x:\n    ways[s] = (ways[s] + ways[s - x]) mod M\nreturn ways[k]",
  ],
  reference: `function perfectSum(arr, k) { const M = ${MOD}, w = new Array(k + 1).fill(0); w[0] = 1; for (const x of arr) for (let s = k; s >= x; s--) w[s] = (w[s] + w[s - x]) % M; return w[k]; }`,
  brute: `function perfectSum(arr, k) { let c = 0; for (let m = 0; m < 1 << arr.length; m++) { let s = 0; for (let i = 0; i < arr.length; i++) if (m & (1 << i)) s += arr[i]; if (s === k) c++; } return c; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 12), 0, 6), __r(rand, 0, 15)];`),
  examples: [[[1, 2, 2, 3], 3], [[1, 1, 4, 5], 5]],
  edges: [
    ["zeros", [[0, 0, 1], 1], "Each zero can be in or out: 4 ways."],
    ["single", [[3], 3]],
    ["no-answer", [[5, 6], 2]],
  ],
};

const countPartitions: ProblemDef = {
  slug: "count-partitions-with-given-difference",
  title: "Count Partitions with Given Difference",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("count-partitions-with-given-difference"),
  statement: "Split `arr` (non-negative integers) into two subsets `S1` and `S2` (every element in exactly one, chosen by index) so that `sum(S1) - sum(S2) = diff` and `sum(S1) >= sum(S2)`. Return the number of ways modulo `10^9 + 7`.",
  constraints: ["1 <= arr.length <= 100", "0 <= arr[i] <= 1000", "0 <= diff <= 10^4"],
  fn: "countPartitions",
  params: [["arr", "number[]"], ["diff", "number"]],
  returns: "number",
  hints: [
    "If S1 - S2 = diff and S1 + S2 = total, what must S2 add up to?",
    "S2 = (total - diff) / 2. If that's negative or not an integer there are no ways; otherwise count the subsets that sum to it.",
    "total = sum(arr)\nif total < diff or (total - diff) is odd: return 0\nt = (total - diff) / 2\nways = [0] * (t + 1); ways[0] = 1\nfor x in arr: for s from t down to x: ways[s] += ways[s - x] (mod M)\nreturn ways[t]",
  ],
  reference: `function countPartitions(arr, diff) { const M = ${MOD}, tot = arr.reduce((a, b) => a + b, 0); if (tot < diff || (tot - diff) % 2) return 0; const t = (tot - diff) / 2, w = new Array(t + 1).fill(0); w[0] = 1; for (const x of arr) for (let s = t; s >= x; s--) w[s] = (w[s] + w[s - x]) % M; return w[t]; }`,
  brute: `function countPartitions(arr, diff) { let c = 0; const tot = arr.reduce((a, b) => a + b, 0); for (let m = 0; m < 1 << arr.length; m++) { let s1 = 0; for (let i = 0; i < arr.length; i++) if (m & (1 << i)) s1 += arr[i]; if (s1 - (tot - s1) === diff) c++; } return c; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 11), 0, 6), __r(rand, 0, 10)];`),
  examples: [[[5, 2, 6, 4], 3], [[1, 1, 1, 1], 0]],
  edges: [
    ["no-answer", [[1, 2], 4], "The difference is bigger than the total."],
    ["zeros", [[0, 0, 2], 2]],
    ["single", [[3], 3]],
  ],
};

const knap01: ProblemDef = {
  slug: "0-and-1-knapsack",
  title: "0/1 Knapsack",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("0-and-1-knapsack"),
  statement: "Item `i` has weight `wt[i]` and value `val[i]`. Choose items, each **at most once**, with total weight at most `W`, to maximise the total value. Return that value.",
  constraints: ["1 <= n <= 1000", "1 <= W <= 1000", "1 <= wt[i] <= 1000"],
  fn: "knapsack",
  params: [["wt", "number[]"], ["val", "number[]"], ["W", "number"]],
  returns: "number",
  hints: [
    "For each item you either take it or not. Which smaller problem does each choice leave?",
    "best[c] = best value with capacity c using the items so far. For each item go c from W down to wt[i] (so it's used once): best[c] = max(best[c], best[c - wt[i]] + val[i]).",
    "best = [0] * (W + 1)\nfor i in items:\n  for c from W down to wt[i]:\n    best[c] = max(best[c], best[c - wt[i]] + val[i])\nreturn best[W]",
  ],
  reference: `function knapsack(wt, val, W) { const b = new Array(W + 1).fill(0); for (let i = 0; i < wt.length; i++) for (let c = W; c >= wt[i]; c--) b[c] = Math.max(b[c], b[c - wt[i]] + val[i]); return b[W]; }`,
  brute: `function knapsack(wt, val, W) { const go = (i, c) => (i === wt.length ? 0 : Math.max(go(i + 1, c), wt[i] <= c ? val[i] + go(i + 1, c - wt[i]) : 0)); return go(0, W); }`,
  fuzz: gen(`var n = __r(rand, 1, 10); return [__arr(rand, n, 1, 10), __arr(rand, n, 1, 20), __r(rand, 1, 25)];`),
  examples: [[[1, 2, 4, 5], [5, 4, 8, 6], 5], [[4, 5, 1], [1, 2, 3], 4]],
  edges: [
    ["no-answer", [[5, 6], [10, 20], 4], "Nothing fits."],
    ["single", [[3], [7], 3]],
    ["reuse", [[1], [10], 5], "Each item can be used only once."],
  ],
};

const unbounded: ProblemDef = {
  slug: "unbounded-knapsack",
  title: "Unbounded Knapsack",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("unbounded-knapsack"),
  statement: "Item `i` has weight `wt[i]` and value `val[i]`, and you may take **any number of copies** of each item. With total weight at most `W`, return the maximum total value.",
  constraints: ["1 <= n <= 1000", "1 <= W <= 1000", "1 <= wt[i] <= 1000"],
  fn: "unboundedKnapsack",
  params: [["wt", "number[]"], ["val", "number[]"], ["W", "number"]],
  returns: "number",
  hints: [
    "Compared with 0/1 knapsack, taking an item doesn't remove it. How does that change the loop direction?",
    "Go c upward from wt[i] to W: best[c] = max(best[c], best[c - wt[i]] + val[i]). best[c - wt[i]] may already include item i, which is exactly what's allowed.",
    "best = [0] * (W + 1)\nfor i in items:\n  for c from wt[i] up to W:\n    best[c] = max(best[c], best[c - wt[i]] + val[i])\nreturn best[W]",
  ],
  reference: `function unboundedKnapsack(wt, val, W) { const b = new Array(W + 1).fill(0); for (let i = 0; i < wt.length; i++) for (let c = wt[i]; c <= W; c++) b[c] = Math.max(b[c], b[c - wt[i]] + val[i]); return b[W]; }`,
  brute: `function unboundedKnapsack(wt, val, W) { const go = (c) => { let b = 0; for (let i = 0; i < wt.length; i++) if (wt[i] <= c) b = Math.max(b, val[i] + go(c - wt[i])); return b; }; return go(W); }`,
  fuzz: gen(`var n = __r(rand, 1, 5); return [__arr(rand, n, 1, 8), __arr(rand, n, 1, 20), __r(rand, 1, 16)];`),
  examples: [[[2, 4, 6], [5, 11, 13], 10], [[1, 3, 4], [15, 50, 60], 8]],
  edges: [
    ["no-answer", [[5], [9], 4]],
    ["reuse", [[1], [10], 5], "Five copies of the same item."],
    ["single", [[2], [3], 2]],
  ],
};

const rod: ProblemDef = {
  slug: "rod-cutting-problem",
  title: "Rod Cutting",
  difficulty: "Medium",
  pattern: "DP: Knapsack",
  url: tuf("rod-cutting-problem"),
  statement: "A rod has length `n = price.length`, and a piece of length `i + 1` sells for `price[i]`. Cut the rod into pieces (or not at all) to maximise the total selling price. Return that maximum.",
  constraints: ["1 <= n <= 1000", "1 <= price[i] <= 10^5"],
  fn: "rodCutting",
  params: [["price", "number[]"]],
  returns: "number",
  hints: [
    "Piece lengths can repeat. Which knapsack variant is this?",
    "It's unbounded knapsack with item weights 1..n, values price, and capacity n: best[L] = max over piece lengths p <= L of price[p-1] + best[L-p].",
    "best = [0] * (n + 1)\nfor L from 1 to n:\n  for p from 1 to L:\n    best[L] = max(best[L], price[p-1] + best[L-p])\nreturn best[n]",
  ],
  reference: `function rodCutting(price) { const n = price.length, b = new Array(n + 1).fill(0); for (let L = 1; L <= n; L++) for (let p = 1; p <= L; p++) b[L] = Math.max(b[L], price[p - 1] + b[L - p]); return b[n]; }`,
  brute: `function rodCutting(price) { const go = (L) => { let b = 0; for (let p = 1; p <= L; p++) b = Math.max(b, price[p - 1] + go(L - p)); return b; }; return go(price.length); }`,
  fuzz: arrayGen(1, 10, 1, 25),
  examples: [[[2, 5, 7, 8, 10]], [[3, 5, 8, 9, 10, 17, 17, 20]]],
  edges: [
    ["single", [[4]]],
    ["all-equal", [[1, 1, 1]], "Equal prices: cut into unit pieces."],
    ["sorted", [[1, 5, 8, 9]]],
  ],
};

const printLis: ProblemDef = {
  slug: "print-longest-increasing-subsequence",
  title: "Print the Longest Increasing Subsequence",
  difficulty: "Hard",
  pattern: "DP: LIS",
  url: tuf("print-longest-increasing-subsequence"),
  statement: "Return a longest **strictly increasing** subsequence of `nums` (the values, in order). If several exist, return the one whose list of chosen **indexes** is lexicographically smallest.",
  constraints: ["1 <= nums.length <= 1000"],
  fn: "printLIS",
  params: [["nums", "number[]"]],
  returns: "number[]",
  hints: [
    "To choose the earliest possible first index, you need to know how long an increasing subsequence can be when it *starts* at each index.",
    "Compute from[i] = length of the LIS starting at i (right to left, O(n^2)). Then build the answer greedily: take the first index with from = L, then the first later index with a bigger value and from = L - 1, and so on.",
    "from[i] = 1 + max(from[j] for j > i with nums[j] > nums[i]), or 1\nL = max(from); need = L; last = -infinity; out = []\nfor i from 0 to n - 1:\n  if need > 0 and nums[i] > last and from[i] == need:\n    out.add(nums[i]); last = nums[i]; need -= 1\nreturn out",
  ],
  reference: `function printLIS(nums) { const n = nums.length, f = new Array(n).fill(1); for (let i = n - 1; i >= 0; i--) for (let j = i + 1; j < n; j++) if (nums[j] > nums[i]) f[i] = Math.max(f[i], f[j] + 1); let need = Math.max(...f), last = -Infinity; const out = []; for (let i = 0; i < n && need > 0; i++) if (nums[i] > last && f[i] === need) { out.push(nums[i]); last = nums[i]; need--; } return out; }`,
  brute: `function printLIS(nums) { let best = []; const go = (i, cur) => { if (cur.length > best.length) best = cur.slice(); for (let j = i; j < nums.length; j++) if (!cur.length || nums[j] > cur[cur.length - 1]) { cur.push(nums[j]); go(j + 1, cur); cur.pop(); } }; go(0, []); return best; }`,
  fuzz: arrayGen(1, 11, 0, 12),
  examples: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[1, 4, 3, 4, 2, 3]]],
  edges: [
    ["single", [[5]]],
    ["all-equal", [[3, 3, 3]], "Strictly increasing: only one element fits."],
    ["reverse-sorted", [[5, 4, 3, 2]], "Every element is an LIS of length 1; the earliest index wins."],
  ],
};

const bitonic: ProblemDef = {
  slug: "longest-bitonic-subsequence",
  title: "Longest Bitonic Subsequence",
  difficulty: "Medium",
  pattern: "DP: LIS",
  url: tuf("longest-bitonic-subsequence"),
  statement: "A subsequence is **bitonic** if it strictly increases and then strictly decreases. Either part may be empty, so a purely increasing or purely decreasing subsequence counts too. Return the length of the longest bitonic subsequence of `nums`.",
  constraints: ["1 <= nums.length <= 1000"],
  fn: "longestBitonicSequence",
  params: [["nums", "number[]"]],
  returns: "number",
  hints: [
    "Every bitonic subsequence has a peak. What do you need to know on each side of a peak?",
    "inc[i] = LIS ending at i (from the left); dec[i] = longest strictly decreasing subsequence starting at i (an LIS from the right). The answer is max of inc[i] + dec[i] - 1.",
    "inc[i] = 1 + max(inc[j] for j < i with nums[j] < nums[i]), or 1\ndec[i] = 1 + max(dec[j] for j > i with nums[j] < nums[i]), or 1\nreturn max(inc[i] + dec[i] - 1 over all i)",
  ],
  reference: `function longestBitonicSequence(nums) { const n = nums.length, a = new Array(n).fill(1), b = new Array(n).fill(1); for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (nums[j] < nums[i]) a[i] = Math.max(a[i], a[j] + 1); for (let i = n - 1; i >= 0; i--) for (let j = n - 1; j > i; j--) if (nums[j] < nums[i]) b[i] = Math.max(b[i], b[j] + 1); let best = 0; for (let i = 0; i < n; i++) best = Math.max(best, a[i] + b[i] - 1); return best; }`,
  brute: `function longestBitonicSequence(nums) { const n = nums.length; let best = 0; for (let m = 1; m < 1 << n; m++) { const s = []; for (let i = 0; i < n; i++) if (m & (1 << i)) s.push(nums[i]); let k = 0; while (k + 1 < s.length && s[k] < s[k + 1]) k++; while (k + 1 < s.length && s[k] > s[k + 1]) k++; if (k === s.length - 1) best = Math.max(best, s.length); } return best; }`,
  fuzz: arrayGen(1, 11, 0, 9),
  examples: [[[1, 11, 2, 10, 4, 5, 2, 1]], [[12, 11, 40, 5, 3, 1]]],
  edges: [
    ["single", [[7]]],
    ["all-equal", [[2, 2, 2]], "Equal neighbours aren't strictly up or down."],
    ["sorted", [[1, 2, 3, 4]], "Purely increasing counts."],
  ],
};

const commonSubstr: ProblemDef = {
  slug: "longest-common-substring",
  title: "Longest Common Substring",
  difficulty: "Medium",
  pattern: "DP: Strings",
  url: tuf("longest-common-substring"),
  statement: "Return the length of the longest string that is a **contiguous** substring of both `s1` and `s2`.",
  constraints: ["1 <= s1.length, s2.length <= 1000"],
  fn: "longestCommonSubstr",
  params: [["s1", "string"], ["s2", "string"]],
  returns: "number",
  hints: [
    "Unlike the longest common subsequence, a mismatch breaks the run completely.",
    "dp[i][j] = length of the common substring ending exactly at s1[i-1] and s2[j-1]: dp[i-1][j-1] + 1 when the characters match, else 0. The answer is the largest dp value.",
    "best = 0\nfor i from 1 to n:\n  for j from 1 to m:\n    if s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1; best = max(best, dp[i][j])\n    else: dp[i][j] = 0\nreturn best",
  ],
  reference: `function longestCommonSubstr(s1, s2) { let prev = new Array(s2.length + 1).fill(0), best = 0; for (let i = 1; i <= s1.length; i++) { const cur = new Array(s2.length + 1).fill(0); for (let j = 1; j <= s2.length; j++) if (s1[i - 1] === s2[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; } prev = cur; } return best; }`,
  brute: `function longestCommonSubstr(s1, s2) { let best = 0; for (let i = 0; i < s1.length; i++) for (let j = i + 1; j <= s1.length; j++) if (j - i > best && s2.includes(s1.slice(i, j))) best = j - i; return best; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 10), "abc"), __str(rand, __r(rand, 1, 10), "abc")];`),
  examples: [["abcjklp", "acjkp"], ["wasdijkl", "wsdjkl"]],
  edges: [
    ["no-answer", ["abc", "xyz"], "No shared character."],
    ["single-char", ["a", "a"]],
    ["duplicates", ["aaaa", "aa"]],
  ],
};

const palSubseq: ProblemDef = {
  slug: "count-palindromic-subsequences",
  title: "Count Palindromic Subsequences",
  difficulty: "Hard",
  pattern: "DP: Strings",
  url: tuf("count-palindromic-subsequences"),
  statement: "Return the number of non-empty palindromic subsequences of `s`, counted by the positions chosen (so equal strings picked from different positions count separately), modulo `10^9 + 7`.",
  constraints: ["1 <= s.length <= 1000"],
  fn: "countPS",
  params: [["s", "string"]],
  returns: "number",
  hints: [
    "Count by interval: how many palindromic subsequences live inside s[i..j]?",
    "dp[i][j] = dp[i+1][j] + dp[i][j-1] - dp[i+1][j-1] (inclusion-exclusion). When s[i] == s[j], add dp[i+1][j-1] + 1 for the palindromes wrapped by that pair.",
    "dp[i][i] = 1\nfor len from 2 to n:\n  for each window i..j of that length:\n    dp[i][j] = dp[i+1][j] + dp[i][j-1] - dp[i+1][j-1]\n    if s[i] == s[j]: dp[i][j] += dp[i+1][j-1] + 1\n    (empty windows count 0; keep everything mod M)\nreturn dp[0][n-1]",
  ],
  reference: `function countPS(s) { const M = ${MOD}, n = s.length, dp = Array.from({ length: n }, () => new Array(n).fill(0)); for (let i = n - 1; i >= 0; i--) { dp[i][i] = 1; for (let j = i + 1; j < n; j++) { const inner = i + 1 <= j - 1 ? dp[i + 1][j - 1] : 0; let v = dp[i + 1][j] + dp[i][j - 1] - inner; if (s[i] === s[j]) v += inner + 1; dp[i][j] = ((v % M) + M) % M; } } return dp[0][n - 1]; }`,
  brute: `function countPS(s) { let c = 0; for (let m = 1; m < 1 << s.length; m++) { let t = ""; for (let i = 0; i < s.length; i++) if (m & (1 << i)) t += s[i]; if (t === t.split("").reverse().join("")) c++; } return c; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 12), "abc")];`),
  examples: [["abcd"], ["aab"]],
  edges: [
    ["single-char", ["a"]],
    ["all-equal", ["aaaa"], "Every non-empty subset is a palindrome: 15."],
    ["duplicates", ["abba"]],
  ],
};

const mcm: ProblemDef = {
  slug: "matrix-chain-multiplication",
  title: "Matrix Chain Multiplication",
  difficulty: "Hard",
  pattern: "DP: Partition",
  url: tuf("matrix-chain-multiplication"),
  statement: "Matrix `i` (1-based, `i = 1..n-1`) has dimensions `dims[i-1] x dims[i]`. Multiplying a `p x q` matrix by a `q x r` matrix costs `p * q * r`. Return the minimum total cost to multiply the whole chain.",
  constraints: ["2 <= dims.length <= 100", "1 <= dims[i] <= 500"],
  fn: "matrixMultiplication",
  params: [["dims", "number[]"]],
  returns: "number",
  hints: [
    "The last multiplication splits the chain into a left part and a right part. Try every split point.",
    "cost(i, j) for matrices i..j = min over k in [i, j) of cost(i, k) + cost(k+1, j) + dims[i-1] * dims[k] * dims[j]. Fill it by increasing chain length.",
    "for i: cost[i][i] = 0\nfor len from 2 to n - 1:\n  for i, with j = i + len - 1 <= n - 1:\n    cost[i][j] = min over k in i..j-1 of\n      cost[i][k] + cost[k+1][j] + dims[i-1] * dims[k] * dims[j]\nreturn cost[1][n-1]",
  ],
  reference: `function matrixMultiplication(dims) { const n = dims.length, c = Array.from({ length: n }, () => new Array(n).fill(0)); for (let len = 2; len < n; len++) for (let i = 1; i + len - 1 < n; i++) { const j = i + len - 1; let b = Infinity; for (let k = i; k < j; k++) b = Math.min(b, c[i][k] + c[k + 1][j] + dims[i - 1] * dims[k] * dims[j]); c[i][j] = b; } return c[1][n - 1]; }`,
  brute: `function matrixMultiplication(dims) { const go = (i, j) => { if (i === j) return 0; let b = Infinity; for (let k = i; k < j; k++) b = Math.min(b, go(i, k) + go(k + 1, j) + dims[i - 1] * dims[k] * dims[j]); return b; }; return go(1, dims.length - 1); }`,
  fuzz: arrayGen(2, 8, 1, 12),
  examples: [[[10, 20, 30, 40, 50]], [[4, 2, 3]]],
  edges: [
    ["min-size", [[5, 7]], "A single matrix: nothing to multiply."],
    ["all-equal", [[3, 3, 3, 3]]],
    ["boundary", [[1, 100, 1, 100]]],
  ],
};

const boolEval: ProblemDef = {
  slug: "different-ways-to-evaluate-a-boolean-expression",
  title: "Evaluate Boolean Expression to True",
  difficulty: "Hard",
  pattern: "DP: Partition",
  url: tuf("different-ways-to-evaluate-a-boolean-expression"),
  statement: "`s` alternates operands `T` / `F` and operators `&`, `|`, `^` (e.g. `T|F&T`). Return the number of ways to fully parenthesise it so that it evaluates to `true`, modulo `10^9 + 7`.",
  constraints: ["1 <= s.length <= 199", "s.length is odd"],
  fn: "countWays",
  params: [["s", "string"]],
  returns: "number",
  hints: [
    "The last operator evaluated splits the expression in two. To combine sides you need, for each side, the number of ways to get true and to get false.",
    "For every interval of operands keep [ways true, ways false]. For each operator k inside it, combine the left and right pairs using the operator's truth table and add up.",
    "T[i][i], F[i][i] = 1/0 by the operand\nfor each interval i..j (operands at even positions), by length:\n  for each operator position k in between:\n    (lt, lf) = interval i..k-1; (rt, rf) = interval k+1..j\n    '&': T += lt*rt; F += lt*rf + lf*rt + lf*rf\n    '|': T += lt*rt + lt*rf + lf*rt; F += lf*rf\n    '^': T += lt*rf + lf*rt; F += lt*rt + lf*rf\nreturn T for the whole string (mod M)",
  ],
  reference: `function countWays(s) { const M = ${MOD}, n = s.length, x = (a, b) => Number((BigInt(a) * BigInt(b)) % BigInt(M)), T = Array.from({ length: n }, () => new Array(n).fill(0)), F = Array.from({ length: n }, () => new Array(n).fill(0)); for (let i = 0; i < n; i += 2) { T[i][i] = s[i] === "T" ? 1 : 0; F[i][i] = s[i] === "F" ? 1 : 0; } for (let len = 3; len <= n; len += 2) for (let i = 0; i + len - 1 < n; i += 2) { const j = i + len - 1; let t = 0, f = 0; for (let k = i + 1; k < j; k += 2) { const lt = T[i][k - 1], lf = F[i][k - 1], rt = T[k + 1][j], rf = F[k + 1][j]; if (s[k] === "&") { t += x(lt, rt); f += x(lt, rf) + x(lf, rt) + x(lf, rf); } else if (s[k] === "|") { t += x(lt, rt) + x(lt, rf) + x(lf, rt); f += x(lf, rf); } else { t += x(lt, rf) + x(lf, rt); f += x(lt, rt) + x(lf, rf); } t %= M; f %= M; } T[i][j] = t; F[i][j] = f; } return T[0][n - 1]; }`,
  brute: `function countWays(s) { const go = (i, j) => { if (i === j) return s[i] === "T" ? [1, 0] : [0, 1]; let t = 0, f = 0; for (let k = i + 1; k < j; k += 2) { const [a, b] = go(i, k - 1), [c, d] = go(k + 1, j); for (const [x, wx] of [[true, a], [false, b]]) for (const [y, wy] of [[true, c], [false, d]]) { const v = s[k] === "&" ? x && y : s[k] === "|" ? x || y : x !== y; if (v) t += wx * wy; else f += wx * wy; } } return [t, f]; }; return go(0, s.length - 1)[0]; }`,
  fuzz: gen(`var k = __r(rand, 1, 7); var s = __pick(rand, ["T", "F"]); for (var i = 1; i < k; i++) s += __pick(rand, ["&", "|", "^"]) + __pick(rand, ["T", "F"]); return [s];`),
  examples: [["T|T&F"], ["T^F|F"]],
  edges: [
    ["single-char", ["F"], "A lone F can't be true."],
    ["all-equal", ["T&T&T"]],
    ["no-answer", ["F|F&F"]],
  ],
};

export const A2Z_DP = [
  frog, frogK, ninja, subsetSum, countSubsets, countPartitions, knap01, unbounded, rod, printLis, bitonic, commonSubstr, palSubseq, mcm, boolEval,
].map(define);
