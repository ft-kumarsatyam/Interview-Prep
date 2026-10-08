import { define, tuf, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const BALANCED = `function __balanced(rand, pairs, extra) { var s = "", open = 0, left = pairs; while (left > 0 || open > 0) { if (extra && rand() < 0.25) s += __pick(rand, extra); if (left > 0 && (open === 0 || rand() < 0.5)) { s += "("; open++; left--; } else { s += ")"; open--; } } return s; }`;

// ---- Strings ----

const removeOuter: ProblemDef = {
  slug: "remove-outermost-parentheses",
  title: "Remove Outermost Parentheses",
  difficulty: "Easy",
  pattern: "Stack",
  url: tuf("remove-outermost-parentheses"),
  statement: "A valid parentheses string splits uniquely into **primitive** parts: non-empty valid strings that can't be split further, like `(()())` or `()`.\n\nGiven a valid parentheses string `s`, remove the outermost pair of parentheses of every primitive part and return the result.",
  constraints: ["1 <= s.length <= 10^5", "s is a valid parentheses string"],
  fn: "removeOuterParentheses",
  params: [["s", "string"]],
  returns: "string",
  hints: [
    "Track how deep you are. Which characters are the outermost ones of a primitive part?",
    "Keep a depth counter. For '(' append it only if depth > 0 before incrementing; for ')' decrement first and append only if depth > 0 afterwards.",
    "depth = 0, out = empty string\nfor c in s:\n  if c == '(':\n    if depth > 0: out += c\n    depth += 1\n  else:\n    depth -= 1\n    if depth > 0: out += c\nreturn out",
  ],
  reference: `function removeOuterParentheses(s) { let d = 0, out = ""; for (const c of s) { if (c === "(") { if (d > 0) out += c; d++; } else { d--; if (d > 0) out += c; } } return out; }`,
  brute: `function removeOuterParentheses(s) { const parts = []; let d = 0, start = 0; for (let i = 0; i < s.length; i++) { d += s[i] === "(" ? 1 : -1; if (d === 0) { parts.push(s.slice(start + 1, i)); start = i + 1; } } return parts.join(""); }`,
  fuzz: gen(`${BALANCED}\nreturn [__balanced(rand, __r(rand, 1, 8), null)];`),
  examples: [["(()())(())"], ["(()())(())(()(()))"]],
  edges: [
    ["min-size", ["()"], "A single primitive pair leaves nothing."],
    ["duplicates", ["()()()"]],
    ["boundary", ["((()))"]],
  ],
};

const nestingDepth: ProblemDef = {
  slug: "maximum-nesting-depth-of-the-parentheses",
  title: "Maximum Nesting Depth of the Parentheses",
  difficulty: "Easy",
  pattern: "Stack",
  url: tuf("maximum-nesting-depth-of-the-parentheses"),
  statement: "Given a valid expression `s` made of digits, `+`, `-`, `*`, `/` and parentheses, return its **nesting depth**: the largest number of parentheses open at the same time.",
  constraints: ["1 <= s.length <= 100", "the parentheses in s are balanced"],
  fn: "maxDepth",
  params: [["s", "string"]],
  returns: "number",
  hints: [
    "You don't need a real stack: only the number of currently open parentheses matters.",
    "Increase a counter on '(' and record the maximum, decrease it on ')', and ignore every other character.",
    "depth = 0, best = 0\nfor c in s:\n  if c == '(': depth += 1; best = max(best, depth)\n  else if c == ')': depth -= 1\nreturn best",
  ],
  reference: `function maxDepth(s) { let d = 0, b = 0; for (const c of s) { if (c === "(") b = Math.max(b, ++d); else if (c === ")") d--; } return b; }`,
  brute: `function maxDepth(s) { let t = s.replace(/[^()]/g, ""), d = 0; while (t.length) { t = t.replace(/\\(\\)/g, ""); d++; } return d; }`,
  fuzz: gen(`${BALANCED}\nreturn [__balanced(rand, __r(rand, 0, 6), ["1", "+", "2", "*", "8"]) || "7"];`),
  examples: [["(1+(2*3)+((8)/4))+1"], ["(1)+((2))+(((3)))"]],
  edges: [
    ["no-answer", ["1+2"], "No parentheses: depth 0."],
    ["single", ["(1)"]],
    ["boundary", ["()(())((()))"]],
  ],
};

const kDistinctSubstrings: ProblemDef = {
  slug: "count-number-of-substring",
  title: "Count Substrings with Exactly K Distinct Characters",
  difficulty: "Medium",
  pattern: "Variable Sliding Window",
  url: tuf("count-number-of-substring"),
  statement: "Given a lowercase string `s` and an integer `k`, return the number of substrings that contain **exactly** `k` distinct characters.",
  constraints: ["1 <= s.length <= 10^5", "1 <= k <= 26"],
  fn: "countSubstrings",
  params: [["s", "string"], ["k", "number"]],
  returns: "number",
  hints: [
    "Counting 'exactly k' with a window is awkward, but 'at most k' is easy. How are the two related?",
    "exactly(k) = atMost(k) - atMost(k - 1). For atMost, slide a window: for each right end, shrink from the left while there are more than k distinct characters, then add the window length.",
    "atMost(k):\n  left = 0, total = 0, freq = empty map\n  for right from 0 to n - 1:\n    add s[right] to freq\n    while freq has more than k keys: remove s[left]; left += 1\n    total += right - left + 1\n  return total\nreturn atMost(k) - atMost(k - 1)",
  ],
  reference: `function countSubstrings(s, k) { const atMost = (k) => { if (k <= 0) return 0; const f = new Map(); let l = 0, t = 0; for (let r = 0; r < s.length; r++) { f.set(s[r], (f.get(s[r]) || 0) + 1); while (f.size > k) { const c = s[l++]; f.set(c, f.get(c) - 1); if (!f.get(c)) f.delete(c); } t += r - l + 1; } return t; }; return atMost(k) - atMost(k - 1); }`,
  brute: `function countSubstrings(s, k) { let t = 0; for (let i = 0; i < s.length; i++) { const seen = new Set(); for (let j = i; j < s.length; j++) { seen.add(s[j]); if (seen.size === k) t++; } } return t; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "abcd"), __r(rand, 1, 4)];`),
  examples: [["pqpqs", 2], ["aabab", 3]],
  edges: [
    ["no-answer", ["aaa", 2], "Only one distinct character exists."],
    ["single-char", ["z", 1]],
    ["all-equal", ["bbbb", 1], "Every substring counts: 10."],
  ],
};

const beautySum: ProblemDef = {
  slug: "sum-of-beauty-of-all-substrings",
  title: "Sum of Beauty of All Substrings",
  difficulty: "Medium",
  pattern: "HashMap",
  url: tuf("sum-of-beauty-of-all-substrings"),
  statement: "The **beauty** of a string is the frequency of its most frequent character minus the frequency of its least frequent character (only counting characters that appear).\n\nGiven a lowercase string `s`, return the sum of the beauty of all its substrings.",
  constraints: ["1 <= s.length <= 500"],
  fn: "beautySum",
  params: [["s", "string"]],
  returns: "number",
  hints: [
    "There are O(n^2) substrings. Can you extend each one by a character and update its counts in O(26) instead of recounting?",
    "Fix the start i and grow the end j, keeping a 26-slot frequency array. After adding s[j], scan the 26 counts for the max and the smallest non-zero count, and add their difference.",
    "total = 0\nfor i from 0 to n - 1:\n  freq = 26 zeros\n  for j from i to n - 1:\n    freq[s[j]] += 1\n    total += max(freq) - min of non-zero freq\nreturn total",
  ],
  reference: `function beautySum(s) { let t = 0; for (let i = 0; i < s.length; i++) { const f = new Array(26).fill(0); for (let j = i; j < s.length; j++) { f[s.charCodeAt(j) - 97]++; let mx = 0, mn = Infinity; for (const c of f) if (c) { mx = Math.max(mx, c); mn = Math.min(mn, c); } t += mx - mn; } } return t; }`,
  brute: `function beautySum(s) { let t = 0; for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) { const sub = s.slice(i, j); const cs = [...new Set(sub)].map((c) => sub.split(c).length - 1); t += Math.max(...cs) - Math.min(...cs); } return t; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 12), "abc")];`),
  examples: [["aabcb"], ["aabcbaa"]],
  edges: [
    ["single-char", ["a"]],
    ["all-equal", ["aaaa"], "One character only: every beauty is 0."],
    ["two", ["ab"]],
  ],
};

// ---- Recursion ----

const reverseStack: ProblemDef = {
  slug: "reverse-a-stack",
  title: "Reverse a Stack",
  difficulty: "Medium",
  pattern: "Recursion",
  url: tuf("reverse-a-stack"),
  statement: "A stack is given as an array `stack` whose **last** element is the top. Reverse the stack **in place** using recursion, using only stack operations (`push`, `pop`, checking whether it's empty). Don't return anything.",
  constraints: ["0 <= stack.length <= 100"],
  fn: "reverseStack",
  params: [["stack", "number[]"]],
  returns: "void",
  returnKind: "arg0",
  hints: [
    "Pop the top, reverse the rest recursively, then the popped value needs to go to the bottom. How do you put something at the bottom of a stack?",
    "Write insertAtBottom(x): if the stack is empty push x; otherwise pop the top, insertAtBottom(x), and push the top back. reverse() pops, recurses, then insertAtBottom(popped).",
    "insertAtBottom(x):\n  if stack is empty: push x; return\n  top = pop\n  insertAtBottom(x)\n  push top\nreverse():\n  if stack is empty: return\n  top = pop\n  reverse()\n  insertAtBottom(top)",
  ],
  reference: `function reverseStack(stack) { const bottom = (x) => { if (!stack.length) { stack.push(x); return; } const t = stack.pop(); bottom(x); stack.push(t); }; const rev = () => { if (!stack.length) return; const t = stack.pop(); rev(); bottom(t); }; rev(); }`,
  brute: `function reverseStack(stack) { stack.reverse(); }`,
  fuzz: arrayGen(1, 12, -20, 20),
  examples: [[[4, 1, 3, 2]], [[10, 20, -5, 7, 15]]],
  edges: [
    ["empty", [[]]],
    ["two", [[1, 2]]],
    ["duplicates", [[3, 3, 1, 1]]],
  ],
};

const subseqExists: ProblemDef = {
  slug: "check-if-there-exists-a-subsequence-with-sum-k",
  title: "Check if a Subsequence with Sum K Exists",
  difficulty: "Medium",
  pattern: "Recursion",
  url: tuf("check-if-there-exists-a-subsequence-with-sum-k"),
  statement: "Given an array of positive integers `nums` and an integer `k`, return `true` if some non-empty subsequence of `nums` sums to exactly `k`, otherwise `false`.",
  constraints: ["1 <= nums.length <= 20", "1 <= nums[i] <= 10^3", "1 <= k <= 10^5"],
  fn: "checkSubsequenceSum",
  params: [["nums", "number[]"], ["k", "number"]],
  returns: "boolean",
  hints: [
    "Every element is either in the subsequence or not. Recursion can try both choices.",
    "solve(i, remaining): if remaining is 0 return true; if i == n or remaining < 0 return false; return solve(i + 1, remaining - nums[i]) or solve(i + 1, remaining). Stopping early on true saves work.",
    "solve(i, rem):\n  if rem == 0: return true\n  if i == n or rem < 0: return false\n  return solve(i + 1, rem - nums[i]) or solve(i + 1, rem)\nreturn solve(0, k)",
  ],
  reference: `function checkSubsequenceSum(nums, k) { const go = (i, r) => r === 0 || (i < nums.length && r > 0 && (go(i + 1, r - nums[i]) || go(i + 1, r))); return go(0, k); }`,
  brute: `function checkSubsequenceSum(nums, k) { const can = new Set([0]); for (const x of nums) for (const s of [...can]) can.add(s + x); return can.has(k); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 12), 1, 15), __r(rand, 1, 60)];`),
  examples: [[[1, 2, 3, 4, 5], 8], [[4, 3, 9, 2], 10]],
  edges: [
    ["no-answer", [[2, 4, 6], 5], "All even values can't make an odd sum."],
    ["single", [[7], 7]],
    ["boundary", [[1, 2, 3], 6], "The whole array is needed."],
  ],
};

const subseqCount: ProblemDef = {
  slug: "count-all-subsequences-with-sum-k",
  title: "Count Subsequences with Sum K",
  difficulty: "Medium",
  pattern: "Recursion",
  url: tuf("count-all-subsequences-with-sum-k"),
  statement: "Given an array of positive integers `nums` and an integer `k`, return how many subsequences (chosen by index, so equal values count separately) sum to exactly `k`.",
  constraints: ["1 <= nums.length <= 20", "1 <= nums[i] <= 100", "1 <= k <= 2000"],
  fn: "countSubsequenceWithTargetSum",
  params: [["nums", "number[]"], ["k", "number"]],
  returns: "number",
  hints: [
    "Take-or-skip recursion again, but now you add up the answers of both branches instead of stopping at the first success.",
    "count(i, rem): if i == n return 1 when rem is 0 else 0. Otherwise count(i + 1, rem - nums[i]) + count(i + 1, rem). Since values are positive you can prune rem < 0.",
    "count(i, rem):\n  if rem < 0: return 0\n  if i == n: return 1 if rem == 0 else 0\n  return count(i + 1, rem - nums[i]) + count(i + 1, rem)\nreturn count(0, k)",
  ],
  reference: `function countSubsequenceWithTargetSum(nums, k) { const go = (i, r) => (r < 0 ? 0 : i === nums.length ? (r === 0 ? 1 : 0) : go(i + 1, r - nums[i]) + go(i + 1, r)); return go(0, k); }`,
  brute: `function countSubsequenceWithTargetSum(nums, k) { const dp = new Array(k + 1).fill(0); dp[0] = 1; for (const x of nums) for (let s = k; s >= x; s--) dp[s] += dp[s - x]; return dp[k]; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 12), 1, 10), __r(rand, 1, 30)];`),
  examples: [[[4, 9, 2, 5, 1], 10], [[4, 2, 10, 5, 1, 3], 5]],
  edges: [
    ["no-answer", [[5, 6], 4]],
    ["duplicates", [[1, 1, 1], 2], "Equal values at different indexes are different subsequences: 3."],
    ["single", [[3], 3]],
  ],
};

const binaryStrings: ProblemDef = {
  slug: "generate-binary-strings-without-consecutive-1s",
  title: "Binary Strings Without Consecutive 1s",
  difficulty: "Medium",
  pattern: "Backtracking",
  url: tuf("generate-binary-strings-without-consecutive-1s"),
  statement: "Given `n`, return every binary string of length `n` that has no two adjacent `1`s, in lexicographic (sorted) order.",
  constraints: ["1 <= n <= 12"],
  fn: "generateBinaryStrings",
  params: [["n", "number"]],
  returns: "string[]",
  hints: [
    "Build the string one character at a time. When is putting a '1' not allowed?",
    "Recurse with the string so far: you can always append '0', and append '1' only if the last character isn't '1'. Trying '0' before '1' produces the strings already sorted.",
    "build(s):\n  if length of s == n: add s to out; return\n  build(s + '0')\n  if s is empty or last of s != '1': build(s + '1')\nbuild('')\nreturn out",
  ],
  reference: `function generateBinaryStrings(n) { const out = []; const go = (s) => { if (s.length === n) { out.push(s); return; } go(s + "0"); if (!s.endsWith("1")) go(s + "1"); }; go(""); return out; }`,
  brute: `function generateBinaryStrings(n) { const out = []; for (let x = 0; x < 1 << n; x++) if ((x & (x >> 1)) === 0) out.push(x.toString(2).padStart(n, "0")); return out.sort(); }`,
  fuzz: gen(`return [__r(rand, 1, 12)];`),
  examples: [[3], [4]],
  edges: [
    ["single", [1]],
    ["two", [2], "'11' is the only length-2 string left out."],
    ["large", [12]],
  ],
};

const ratMaze: ProblemDef = {
  slug: "rat-in-a-maze",
  title: "Rat in a Maze",
  difficulty: "Hard",
  pattern: "Backtracking",
  url: tuf("rat-in-a-maze"),
  statement: "A rat starts at the top-left cell of an `n x n` grid and wants to reach the bottom-right cell. Cells with `1` are open and cells with `0` are blocked. It can move `D` (down), `L` (left), `R` (right) or `U` (up), and it can't visit a cell twice on the same path.\n\nReturn every path as a string of moves, sorted lexicographically. Return an empty array if the start or the destination is blocked or no path exists.",
  constraints: ["2 <= n <= 5"],
  fn: "findPath",
  params: [["grid", "number[][]"]],
  returns: "string[]",
  hints: [
    "This is a depth-first search that has to explore every path, not just find one. What must you undo when you return from a cell?",
    "From each cell try the four moves; mark the cell visited before recursing and unmark it afterwards (backtracking). Trying D, L, R, U in that order produces the paths already sorted.",
    "dfs(r, c, path):\n  if (r, c) is the destination: add path; return\n  mark (r, c) visited\n  for (move, dr, dc) in D, L, R, U:\n    if the next cell is inside, open and unvisited: dfs(next, path + move)\n  unmark (r, c)\nif start and end are open: dfs(0, 0, '')\nreturn paths",
  ],
  reference: `function findPath(grid) { const n = grid.length, out = []; if (!grid[0][0] || !grid[n - 1][n - 1]) return out; const seen = grid.map((r) => r.map(() => false)); const mv = [["D", 1, 0], ["L", 0, -1], ["R", 0, 1], ["U", -1, 0]]; const go = (r, c, p) => { if (r === n - 1 && c === n - 1) { out.push(p); return; } seen[r][c] = true; for (const [m, dr, dc] of mv) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < n && b < n && grid[a][b] && !seen[a][b]) go(a, b, p + m); } seen[r][c] = false; }; go(0, 0, ""); return out; }`,
  brute: `function findPath(grid) { const n = grid.length, out = []; if (!grid[0][0] || !grid[n - 1][n - 1]) return out; const go = (r, c, p, vis) => { if (r < 0 || c < 0 || r >= n || c >= n || !grid[r][c] || vis.has(r * n + c)) return; if (r === n - 1 && c === n - 1) { out.push(p); return; } const v2 = new Set(vis); v2.add(r * n + c); go(r - 1, c, p + "U", v2); go(r, c + 1, p + "R", v2); go(r + 1, c, p + "D", v2); go(r, c - 1, p + "L", v2); }; go(0, 0, "", new Set()); return out.sort(); }`,
  fuzz: gen(`const n = __r(rand, 2, 4); return [Array.from({ length: n }, function () { return Array.from({ length: n }, function () { return rand() < 0.75 ? 1 : 0; }); })];`),
  examples: [[[[1, 0, 0, 0], [1, 1, 0, 1], [1, 1, 0, 0], [0, 1, 1, 1]]], [[[1, 1], [1, 1]]]],
  edges: [
    ["no-answer", [[[0, 1], [1, 1]]], "The start is blocked."],
    ["boundary", [[[1, 0], [0, 1]]], "Diagonal moves aren't allowed: no path."],
    ["min-size", [[[1, 1], [0, 1]]]],
  ],
};

const mColoring: ProblemDef = {
  slug: "m-coloring-problem",
  title: "M-Coloring Problem",
  difficulty: "Hard",
  pattern: "Backtracking",
  url: tuf("m-coloring-problem"),
  statement: "Given an undirected graph with `n` vertices (`0` to `n - 1`) as an edge list and an integer `m`, return `true` if the vertices can be coloured with at most `m` colours so that no edge joins two vertices of the same colour.",
  constraints: ["1 <= n <= 10", "0 <= edges.length <= n * (n - 1) / 2", "1 <= m <= n"],
  fn: "graphColoring",
  params: [["n", "number"], ["edges", "number[][]"], ["m", "number"]],
  returns: "boolean",
  hints: [
    "Colour the vertices one by one. Which colours are allowed for the current vertex?",
    "Backtrack: for vertex v, try each colour 1..m not used by an already-coloured neighbour, recurse to v + 1, and undo the colour if the recursion fails.",
    "solve(v):\n  if v == n: return true\n  for c from 1 to m:\n    if no neighbour of v has colour c:\n      colour[v] = c\n      if solve(v + 1): return true\n      colour[v] = 0\n  return false\nreturn solve(0)",
  ],
  reference: `function graphColoring(n, edges, m) { const adj = Array.from({ length: n }, () => []); for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); } const col = new Array(n).fill(0); const go = (v) => { if (v === n) return true; for (let c = 1; c <= m; c++) { if (adj[v].some((u) => col[u] === c)) continue; col[v] = c; if (go(v + 1)) return true; col[v] = 0; } return false; }; return go(0); }`,
  brute: `function graphColoring(n, edges, m) { const total = Math.pow(m, n); for (let code = 0; code < total; code++) { const col = []; let x = code; for (let i = 0; i < n; i++) { col.push(x % m); x = Math.floor(x / m); } if (edges.every(([a, b]) => col[a] !== col[b])) return true; } return false; }`,
  fuzz: gen(`const n = __r(rand, 1, 6); const e = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rand() < 0.5) e.push([i, j]); return [n, e, __r(rand, 1, 3)];`),
  examples: [[4, [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]], 3], [3, [[0, 1], [1, 2], [0, 2]], 2]],
  edges: [
    ["single", [1, [], 1]],
    ["no-answer", [4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], 3], "A complete graph on 4 vertices needs 4 colours."],
    ["boundary", [5, [[0, 1], [1, 2], [2, 3], [3, 4]], 2], "A path is always 2-colourable."],
  ],
};

// ---- Bit manipulation ----

const checkBit: ProblemDef = {
  slug: "check-if-the-i-th-bit-is-set-or-not",
  title: "Check if the i-th Bit Is Set",
  difficulty: "Easy",
  pattern: "Bit Manipulation",
  url: tuf("check-if-the-i-th-bit-is-set-or-not"),
  statement: "Given a non-negative integer `n` and a bit index `i` (0 is the least significant bit), return `true` if bit `i` of `n` is `1`.",
  constraints: ["0 <= n <= 10^9", "0 <= i <= 30"],
  fn: "checkIthBit",
  params: [["n", "number"], ["i", "number"]],
  returns: "boolean",
  hints: [
    "A number with only bit i set is 1 << i. How do you test one bit of n against it?",
    "n & (1 << i) is non-zero exactly when bit i is set. (n >> i) & 1 works too.",
    "return (n AND (1 shifted left by i)) != 0",
  ],
  reference: `function checkIthBit(n, i) { return (n & (1 << i)) !== 0; }`,
  brute: `function checkIthBit(n, i) { const b = n.toString(2); return b[b.length - 1 - i] === "1"; }`,
  fuzz: gen(`return [__r(rand, 0, 1000000000), __r(rand, 0, 30)];`),
  examples: [[5, 0], [10, 2]],
  edges: [
    ["zeros", [0, 3]],
    ["extremes", [1073741824, 30], "The highest bit allowed."],
    ["boundary", [8, 5], "An index past the highest set bit is 0."],
  ],
};

const isOdd: ProblemDef = {
  slug: "check-if-a-number-is-odd-or-not",
  title: "Check if a Number Is Odd",
  difficulty: "Easy",
  pattern: "Bit Manipulation",
  url: tuf("check-if-a-number-is-odd-or-not"),
  statement: "Given a non-negative integer `n`, return `true` if it is odd, using a bitwise operation instead of `%`.",
  constraints: ["0 <= n <= 10^9"],
  fn: "isOdd",
  params: [["n", "number"]],
  returns: "boolean",
  hints: [
    "Which bit decides whether a number is odd?",
    "The lowest bit is 1 for every odd number, so test n & 1.",
    "return (n AND 1) == 1",
  ],
  reference: `function isOdd(n) { return (n & 1) === 1; }`,
  brute: `function isOdd(n) { return n % 2 === 1; }`,
  fuzz: gen(`return [__r(rand, 0, 1000000000)];`),
  examples: [[7], [10]],
  edges: [
    ["zeros", [0]],
    ["single", [1]],
    ["large", [999999999]],
  ],
};

const setRightmostUnset: ProblemDef = {
  slug: "set-the-rightmost-unset-bit",
  title: "Set the Rightmost Unset Bit",
  difficulty: "Easy",
  pattern: "Bit Manipulation",
  url: tuf("set-the-rightmost-unset-bit"),
  statement: "Given a positive integer `n`, set the rightmost `0` bit in its binary representation and return the result. If every bit of `n` is already `1` (like `7 = 111`), return `n` unchanged.",
  constraints: ["1 <= n <= 10^9"],
  fn: "setBit",
  params: [["n", "number"]],
  returns: "number",
  hints: [
    "Adding 1 to n flips its trailing 1s to 0 and its rightmost 0 to 1. How can you combine that with n?",
    "n | (n + 1) sets the rightmost unset bit. When n is all ones, n & (n + 1) is 0: return n then.",
    "if (n AND (n + 1)) == 0: return n\nreturn n OR (n + 1)",
  ],
  reference: `function setBit(n) { return (n & (n + 1)) === 0 ? n : n | (n + 1); }`,
  brute: `function setBit(n) { const b = n.toString(2); const i = b.lastIndexOf("0"); return i < 0 ? n : parseInt(b.slice(0, i) + "1" + b.slice(i + 1), 2); }`,
  fuzz: gen(`return [__pick(rand, [__r(rand, 1, 64), __r(rand, 1, 1000000000), Math.pow(2, __r(rand, 1, 29)) - 1])];`),
  examples: [[6], [10]],
  edges: [
    ["all-equal", [15], "All bits set: unchanged."],
    ["single", [1]],
    ["boundary", [8], "1000 becomes 1001."],
  ],
};

const swapNumbers: ProblemDef = {
  slug: "swap-two-numbers",
  title: "Swap Two Numbers with XOR",
  difficulty: "Easy",
  pattern: "Bit Manipulation",
  url: tuf("swap-two-numbers"),
  statement: "Given two integers `a` and `b`, swap them **without a temporary variable** using XOR, and return `[a, b]` after the swap.",
  constraints: ["-10^9 <= a, b <= 10^9"],
  fn: "swapNumbers",
  params: [["a", "number"], ["b", "number"]],
  returns: "number[]",
  hints: [
    "x ^ x = 0 and x ^ 0 = x. What happens if you XOR a into b and then XOR again?",
    "a = a ^ b; b = a ^ b (now the original a); a = a ^ b (now the original b).",
    "a = a XOR b\nb = a XOR b\na = a XOR b\nreturn [a, b]",
  ],
  reference: `function swapNumbers(a, b) { a ^= b; b ^= a; a ^= b; return [a, b]; }`,
  brute: `function swapNumbers(a, b) { return [b, a]; }`,
  fuzz: gen(`return [__r(rand, -1000000000, 1000000000), __r(rand, -1000000000, 1000000000)];`),
  examples: [[13, 9], [-5, 7]],
  edges: [
    ["all-equal", [4, 4], "Swapping equal values must not zero them out."],
    ["zeros", [0, 12]],
    ["negatives", [-3, -8]],
  ],
};

const rangeXor: ProblemDef = {
  slug: "xor-of-numbers-in-a-given-range",
  title: "XOR of Numbers in a Range",
  difficulty: "Medium",
  pattern: "Bit Manipulation",
  url: tuf("xor-of-numbers-in-a-given-range"),
  statement: "Given two integers `l <= r`, return `l ^ (l + 1) ^ ... ^ r` in `O(1)` time.",
  constraints: ["1 <= l <= r <= 10^9"],
  fn: "findRangeXOR",
  params: [["l", "number"], ["r", "number"]],
  returns: "number",
  hints: [
    "Write f(n) = 1 ^ 2 ^ ... ^ n. Then the range XOR is f(r) ^ f(l - 1). Is there a pattern in f(n)?",
    "f(n) repeats every 4: it is n when n % 4 == 0, 1 when n % 4 == 1, n + 1 when n % 4 == 2 and 0 when n % 4 == 3.",
    "f(n):\n  if n mod 4 == 0: return n\n  if n mod 4 == 1: return 1\n  if n mod 4 == 2: return n + 1\n  return 0\nreturn f(r) XOR f(l - 1)",
  ],
  reference: `function findRangeXOR(l, r) { const f = (n) => [n, 1, n + 1, 0][n % 4]; return f(r) ^ f(l - 1); }`,
  brute: `function findRangeXOR(l, r) { let x = 0; for (let v = l; v <= r; v++) x ^= v; return x; }`,
  fuzz: gen(`const l = __r(rand, 1, 5000); return [l, l + __r(rand, 0, 300)];`),
  examples: [[3, 5], [1, 3]],
  edges: [
    ["single", [7, 7]],
    ["boundary", [1, 4]],
    ["large", [999999000, 1000000000]],
  ],
};

// ---- Greedy ----

const fractionalKnapsack: ProblemDef = {
  slug: "fractional-knapsack",
  title: "Fractional Knapsack",
  difficulty: "Medium",
  pattern: "Greedy",
  url: tuf("fractional-knapsack"),
  statement: "Item `i` has value `val[i]` and weight `wt[i]`. You may take any fraction of an item. Return the largest total value that fits in a knapsack of capacity `capacity`, rounded to 2 decimal places (as a number).",
  constraints: ["1 <= val.length == wt.length <= 10^5", "1 <= val[i], wt[i] <= 10^4", "1 <= capacity <= 10^9"],
  fn: "fractionalKnapsack",
  params: [["val", "number[]"], ["wt", "number[]"], ["capacity", "number"]],
  returns: "number",
  hints: [
    "Since fractions are allowed, which item gives you the most value for each unit of weight?",
    "Sort items by value / weight, highest first. Take whole items while they fit, then a fraction of the next one to fill the rest.",
    "sort items by val / wt descending\ntotal = 0\nfor each item:\n  if wt <= capacity: total += val; capacity -= wt\n  else: total += val * capacity / wt; stop\nreturn total rounded to 2 decimals",
  ],
  reference: `function fractionalKnapsack(val, wt, capacity) { const items = val.map((v, i) => [v, wt[i]]).sort((a, b) => b[0] / b[1] - a[0] / a[1]); let t = 0, c = capacity; for (const [v, w] of items) { if (w <= c) { t += v; c -= w; } else { t += (v * c) / w; break; } } return Math.round(t * 100) / 100; }`,
  brute: `function fractionalKnapsack(val, wt, capacity) { const left = val.map((v, i) => i); let t = 0, c = capacity; while (c > 0 && left.length) { let b = 0; for (let k = 1; k < left.length; k++) if (val[left[k]] * wt[left[b]] > val[left[b]] * wt[left[k]]) b = k; const i = left.splice(b, 1)[0]; const take = Math.min(wt[i], c); t += (val[i] * take) / wt[i]; c -= take; } return Math.round(t * 100) / 100; }`,
  fuzz: gen(`const n = __r(rand, 1, 8); return [__arr(rand, n, 1, 60), __arr(rand, n, 1, 20), __r(rand, 1, 80)];`),
  examples: [[[60, 100, 120], [10, 20, 30], 50], [[60, 100], [10, 20], 50]],
  edges: [
    ["boundary", [[10], [4], 3], "Only part of the single item fits: 7.5."],
    ["large", [[5, 6], [1, 1], 1000000000], "Everything fits."],
    ["all-equal", [[10, 10, 10], [5, 5, 5], 7]],
  ],
};

const sjf: ProblemDef = {
  slug: "shortest-job-first",
  title: "Shortest Job First",
  difficulty: "Easy",
  pattern: "Greedy",
  url: tuf("shortest-job-first"),
  statement: "All processes arrive at time `0` with burst times `bt`. A single CPU runs them one at a time with the **shortest job first** policy. A process's waiting time is when it starts running.\n\nReturn the average waiting time, rounded **down** to an integer.",
  constraints: ["1 <= bt.length <= 10^5", "1 <= bt[i] <= 10^5"],
  fn: "solve",
  params: [["bt", "number[]"]],
  returns: "number",
  hints: [
    "Running short jobs first makes every later job wait less. In what order do the jobs run?",
    "Sort the burst times. Each job waits for the sum of the jobs before it; add up those waits with a running total and divide by n.",
    "sort bt ascending\nelapsed = 0, waiting = 0\nfor t in bt:\n  waiting += elapsed\n  elapsed += t\nreturn (waiting / n) rounded down",
  ],
  reference: `function solve(bt) { const a = bt.slice().sort((x, y) => x - y); let e = 0, w = 0; for (const t of a) { w += e; e += t; } return Math.floor(w / a.length); }`,
  brute: `function solve(bt) { const a = bt.slice().sort((x, y) => x - y); let w = 0; a.forEach((t, i) => { w += t * (a.length - 1 - i); }); return Math.floor(w / a.length); }`,
  fuzz: arrayGen(1, 12, 1, 20),
  examples: [[[4, 3, 7, 1, 2]], [[1, 2, 3, 4]]],
  edges: [
    ["single", [[9]], "One job never waits."],
    ["all-equal", [[5, 5, 5]]],
    ["reverse-sorted", [[8, 6, 4, 2]]],
  ],
};

const jobSequencing: ProblemDef = {
  slug: "job-sequencing-problem",
  title: "Job Sequencing Problem",
  difficulty: "Medium",
  pattern: "Greedy",
  url: tuf("job-sequencing-problem"),
  statement: "Each job is `[id, deadline, profit]`. Every job takes one unit of time, only one job runs at a time, and a job earns its profit only if it finishes by its deadline.\n\nReturn `[jobsDone, maxProfit]`: the most profit you can earn and how many jobs that schedule uses.",
  constraints: ["1 <= jobs.length <= 10^5", "1 <= deadline <= jobs.length", "1 <= profit <= 500"],
  fn: "jobScheduling",
  params: [["jobs", "number[][]"]],
  returns: "number[]",
  hints: [
    "Do the most profitable jobs first. For each one, which time slot keeps the most options open for the others?",
    "Sort by profit descending. Put each job in the latest free slot at or before its deadline; skip it if no slot is free.",
    "sort jobs by profit descending\nslot = array of free slots 1..maxDeadline\nfor each job:\n  for t from deadline down to 1:\n    if slot t is free: take it; count += 1; profit += job profit; stop\nreturn [count, profit]",
  ],
  reference: `function jobScheduling(jobs) { const s = jobs.slice().sort((a, b) => b[2] - a[2]); const md = Math.max(...jobs.map((j) => j[1])); const used = new Array(md + 1).fill(false); let c = 0, p = 0; for (const [, d, pr] of s) for (let t = d; t >= 1; t--) if (!used[t]) { used[t] = true; c++; p += pr; break; } return [c, p]; }`,
  brute: `function jobScheduling(jobs) { let best = [0, 0]; const n = jobs.length; for (let m = 1; m < 1 << n; m++) { const pick = jobs.filter((_, i) => m & (1 << i)).sort((a, b) => a[1] - b[1]); if (pick.every((j, i) => j[1] >= i + 1)) { const p = pick.reduce((s, j) => s + j[2], 0); if (p > best[1]) best = [pick.length, p]; } } return best; }`,
  fuzz: gen(`const n = __r(rand, 1, 9); return [Array.from({ length: n }, function (_, i) { return [i + 1, __r(rand, 1, n), __r(rand, 1, 60)]; })];`),
  examples: [[[[1, 4, 20], [2, 1, 10], [3, 1, 40], [4, 1, 30]]], [[[1, 2, 100], [2, 1, 19], [3, 2, 27], [4, 1, 25], [5, 1, 15]]]],
  edges: [
    ["single", [[[1, 1, 5]]]],
    ["all-equal", [[[1, 1, 10], [2, 1, 10], [3, 1, 10]]], "Same deadline: only one job fits."],
    ["boundary", [[[1, 3, 5], [2, 3, 6], [3, 3, 7]]], "Every job fits."],
  ],
};

const meetings: ProblemDef = {
  slug: "n-meetings-in-one-room",
  title: "N Meetings in One Room",
  difficulty: "Easy",
  pattern: "Greedy",
  url: tuf("n-meetings-in-one-room"),
  statement: "Meeting `i` runs from `start[i]` to `end[i]`. One room can host one meeting at a time, and a meeting can only begin **strictly after** the previous one ends.\n\nReturn the largest number of meetings the room can host.",
  constraints: ["1 <= start.length == end.length <= 10^5", "0 <= start[i] < end[i] <= 10^5"],
  fn: "maxMeetings",
  params: [["start", "number[]"], ["end", "number[]"]],
  returns: "number",
  hints: [
    "To fit the most meetings, which meeting should go first so the room frees up as early as possible?",
    "Sort meetings by end time. Take a meeting whenever its start is strictly greater than the end of the last meeting you took.",
    "sort meetings by end time\ncount = 0, lastEnd = -1\nfor each meeting:\n  if start > lastEnd:\n    count += 1\n    lastEnd = end\nreturn count",
  ],
  reference: `function maxMeetings(start, end) { const m = start.map((s, i) => [s, end[i]]).sort((a, b) => a[1] - b[1]); let c = 0, last = -1; for (const [s, e] of m) if (s > last) { c++; last = e; } return c; }`,
  brute: `function maxMeetings(start, end) { const n = start.length; let best = 0; for (let mask = 1; mask < 1 << n; mask++) { const pick = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push([start[i], end[i]]); pick.sort((a, b) => a[0] - b[0]); if (pick.every((p, i) => i === 0 || p[0] > pick[i - 1][1])) best = Math.max(best, pick.length); } return best; }`,
  fuzz: gen(`const n = __r(rand, 1, 9); const s = __arr(rand, n, 0, 20); return [s, s.map(function (x) { return x + __r(rand, 1, 8); })];`),
  examples: [[[1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]], [[10, 12, 20], [20, 25, 30]]],
  edges: [
    ["single", [[1], [5]]],
    ["boundary", [[1, 5], [5, 9]], "The second meeting starts exactly when the first ends: not allowed."],
    ["all-equal", [[2, 2, 2], [3, 3, 3]]],
  ],
};

const platforms: ProblemDef = {
  slug: "minimum-number-of-platforms-required-for-a-railway",
  title: "Minimum Platforms",
  difficulty: "Medium",
  pattern: "Greedy",
  url: tuf("minimum-number-of-platforms-required-for-a-railway"),
  statement: "Train `i` arrives at `arr[i]` and departs at `dep[i]` (times as minutes in a day). A platform can't hold two trains at the same moment, and a train arriving at the exact minute another departs still needs its own platform.\n\nReturn the minimum number of platforms needed.",
  constraints: ["1 <= arr.length == dep.length <= 10^5", "0 <= arr[i] <= dep[i] < 1440"],
  fn: "findPlatform",
  params: [["arr", "number[]"], ["dep", "number[]"]],
  returns: "number",
  hints: [
    "The answer is the largest number of trains at the station at the same moment. Can you sweep through events in time order?",
    "Sort arrivals and departures separately. Walk both with two pointers: an arrival at or before the next departure adds a platform, otherwise a departure frees one. Track the maximum.",
    "sort arr, sort dep\ni = 0, j = 0, cur = 0, best = 0\nwhile i < n:\n  if arr[i] <= dep[j]: cur += 1; i += 1; best = max(best, cur)\n  else: cur -= 1; j += 1\nreturn best",
  ],
  reference: `function findPlatform(arr, dep) { const a = arr.slice().sort((x, y) => x - y), d = dep.slice().sort((x, y) => x - y); let i = 0, j = 0, c = 0, b = 0; while (i < a.length) { if (a[i] <= d[j]) { c++; i++; b = Math.max(b, c); } else { c--; j++; } } return b; }`,
  brute: `function findPlatform(arr, dep) { let b = 0; for (let i = 0; i < arr.length; i++) { let c = 0; for (let j = 0; j < arr.length; j++) if (arr[j] <= arr[i] && arr[i] <= dep[j]) c++; b = Math.max(b, c); } return b; }`,
  fuzz: gen(`const n = __r(rand, 1, 10); const a = __arr(rand, n, 0, 60); return [a, a.map(function (x) { return x + __r(rand, 0, 20); })];`),
  examples: [[[540, 580, 590, 660, 900, 1080], [550, 720, 680, 690, 1140, 1200]], [[540, 755, 660], [600, 760, 720]]],
  edges: [
    ["single", [[10], [20]]],
    ["boundary", [[10, 20], [20, 30]], "Arriving the minute the other train leaves still needs a second platform."],
    ["all-equal", [[5, 5, 5], [5, 5, 5]]],
  ],
};

// ---- Sliding window ----

const atMostKDistinct: ProblemDef = {
  slug: "longest-substring-with-at-most-k-distinct-characters",
  title: "Longest Substring with At Most K Distinct Characters",
  difficulty: "Medium",
  pattern: "Variable Sliding Window",
  url: tuf("longest-substring-with-at-most-k-distinct-characters"),
  statement: "Given a lowercase string `s` and an integer `k`, return the length of the longest substring that contains at most `k` distinct characters.",
  constraints: ["1 <= s.length <= 10^5", "0 <= k <= 26"],
  fn: "kDistinctChar",
  params: [["s", "string"], ["k", "number"]],
  returns: "number",
  hints: [
    "A window that has too many distinct characters can only get better by dropping characters from its left.",
    "Grow the right end, counting characters in a map. While the map has more than k keys, shrink from the left (deleting keys that reach 0). Record the window length each step.",
    "left = 0, best = 0, freq = empty map\nfor right from 0 to n - 1:\n  freq[s[right]] += 1\n  while freq has more than k keys:\n    freq[s[left]] -= 1; delete it at 0; left += 1\n  best = max(best, right - left + 1)\nreturn best",
  ],
  reference: `function kDistinctChar(s, k) { const f = new Map(); let l = 0, b = 0; for (let r = 0; r < s.length; r++) { f.set(s[r], (f.get(s[r]) || 0) + 1); while (f.size > k) { const c = s[l++]; f.set(c, f.get(c) - 1); if (!f.get(c)) f.delete(c); } b = Math.max(b, r - l + 1); } return b; }`,
  brute: `function kDistinctChar(s, k) { let b = 0; for (let i = 0; i < s.length; i++) { const seen = new Set(); for (let j = i; j < s.length; j++) { seen.add(s[j]); if (seen.size > k) break; b = Math.max(b, j - i + 1); } } return b; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "abcd"), __r(rand, 0, 4)];`),
  examples: [["aababbcaacc", 2], ["abcddefg", 3]],
  edges: [
    ["zeros", ["abc", 0], "No characters allowed: 0."],
    ["all-equal", ["aaaa", 1]],
    ["boundary", ["abc", 5], "k exceeds the distinct count: the whole string."],
  ],
};

const minWindowSubseq: ProblemDef = {
  slug: "minimum-window-subsequence",
  title: "Minimum Window Subsequence",
  difficulty: "Hard",
  pattern: "Two Pointers",
  url: tuf("minimum-window-subsequence"),
  statement: "Given strings `s1` and `s2`, return the shortest contiguous substring `w` of `s1` such that `s2` is a subsequence of `w`. If several have the same length, return the one that starts first. Return `\"\"` if there is none.",
  constraints: ["1 <= s1.length <= 2 * 10^4", "1 <= s2.length <= 100"],
  fn: "minWindow",
  params: [["s1", "string"], ["s2", "string"]],
  returns: "string",
  hints: [
    "Once you find a window ending at some index that contains s2 as a subsequence, can you tighten its start?",
    "Scan forward matching s2 greedily until all of it is matched at index end. Then walk backward from end matching s2 in reverse to find the latest possible start. Record the window and restart the forward scan from start + 1.",
    "i = 0, best = none\nwhile i < len(s1):\n  match s2 forward from i; if it never completes: stop\n  end = index where the last char of s2 matched\n  walk back from end matching s2 in reverse to get start\n  if best is none or end - start < best length: best = (start, end)\n  i = start + 1\nreturn s1[best] or ''",
  ],
  reference: `function minWindow(s1, s2) { let best = "", i = 0; while (i < s1.length) { let j = 0, e = -1; for (let k = i; k < s1.length; k++) if (s1[k] === s2[j] && ++j === s2.length) { e = k; break; } if (e < 0) break; let st = e; j = s2.length - 1; for (; st >= 0; st--) if (s1[st] === s2[j] && --j < 0) break; if (!best || e - st + 1 < best.length) best = s1.slice(st, e + 1); i = st + 1; } return best; }`,
  brute: `function minWindow(s1, s2) { let best = ""; for (let i = 0; i < s1.length; i++) { let j = 0; for (let k = i; k < s1.length; k++) { if (s1[k] === s2[j]) j++; if (j === s2.length) { if (!best || k - i + 1 < best.length) best = s1.slice(i, k + 1); break; } } } return best; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "abc"), __str(rand, __r(rand, 1, 3), "abc")];`),
  examples: [["abcdebdde", "bde"], ["jmeqksfrsdcmsiwvaovztaqenprpvnbstl", "u"]],
  edges: [
    ["no-answer", ["abc", "d"]],
    ["single-char", ["a", "a"]],
    ["duplicates", ["aaab", "ab"], "Tightening the start gives 'ab', not 'aaab'."],
  ],
};

export const A2Z_STRINGS_GREEDY = [
  removeOuter, nestingDepth, kDistinctSubstrings, beautySum,
  reverseStack, subseqExists, subseqCount, binaryStrings, ratMaze, mColoring,
  checkBit, isOdd, setRightmostUnset, swapNumbers, rangeXor,
  fractionalKnapsack, sjf, jobSequencing, meetings, platforms,
  atMostKDistinct, minWindowSubseq,
].map(define);
