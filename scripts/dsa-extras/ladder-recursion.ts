import { define, type ProblemDef } from "./define";
import { gen } from "./gen";

const printOneToN: ProblemDef = {
  slug: "print-1-to-n",
  title: "Print 1 to N Using Recursion",
  difficulty: "Easy",
  pattern: "Recursion",
  statement: "Given a positive integer `n`, return the list `[1, 2, ..., n]`. Build it **recursively**: no loops.",
  constraints: ["1 <= n <= 1000"],
  fn: "printOneToN",
  params: [["n", "number"]],
  returns: "number[]",
  hints: [
    "If you already had the list for n - 1, what single step turns it into the list for n?",
    "Base case: n == 1 gives [1]. Otherwise recurse on n - 1 and append n to the result.",
    "printOneToN(n):\n  if n == 1: return [1]\n  rest = printOneToN(n - 1)\n  append n to rest\n  return rest",
  ],
  reference: `function printOneToN(n) { if (n === 1) return [1]; const r = printOneToN(n - 1); r.push(n); return r; }`,
  brute: `function printOneToN(n) { return Array.from({ length: n }, (_, i) => i + 1); }`,
  fuzz: gen(`return [__r(rand, 1, 60)];`),
  examples: [[3], [5]],
  edges: [
    ["min-size", [1], "The base case on its own."],
    ["two", [2]],
    ["large", [1000], "1000 nested calls: fine for recursion depth here."],
  ],
};

const printNToOne: ProblemDef = {
  slug: "print-n-to-1",
  title: "Print N to 1 Using Recursion",
  difficulty: "Easy",
  pattern: "Recursion",
  statement: "Given a positive integer `n`, return the list `[n, n - 1, ..., 1]`. Build it **recursively**: no loops.",
  constraints: ["1 <= n <= 1000"],
  fn: "printNToOne",
  params: [["n", "number"]],
  returns: "number[]",
  hints: [
    "Same idea as 1 to N, but where does n go relative to the smaller answer?",
    "Base case: n == 1 gives [1]. Otherwise put n in front of printNToOne(n - 1).",
    "printNToOne(n):\n  if n == 1: return [1]\n  return [n] followed by printNToOne(n - 1)",
  ],
  reference: `function printNToOne(n) { return n === 1 ? [1] : [n, ...printNToOne(n - 1)]; }`,
  brute: `function printNToOne(n) { const a = []; for (let i = n; i >= 1; i--) a.push(i); return a; }`,
  fuzz: gen(`return [__r(rand, 1, 60)];`),
  examples: [[3], [5]],
  edges: [
    ["min-size", [1], "The base case on its own."],
    ["two", [2]],
    ["large", [1000]],
  ],
};

const sortStack: ProblemDef = {
  slug: "sort-a-stack",
  title: "Sort a Stack Using Recursion",
  difficulty: "Medium",
  pattern: "Recursion",
  url: "https://www.geeksforgeeks.org/problems/sort-a-stack/1",
  statement: [
    "A stack is given as an array `stack`, bottom first (the last element is the top).",
    "",
    "Sort it so the **largest** value is on top, and return it in the same bottom-first form. Use recursion and only stack operations (push, pop, peek); no sorting helpers and no extra array.",
  ].join("\n"),
  constraints: ["0 <= stack.length <= 500", "-10^9 <= stack[i] <= 10^9"],
  fn: "sortStack",
  params: [["stack", "number[]"]],
  returns: "number[]",
  hints: [
    "If the rest of the stack (without the top) were already sorted, where would the popped top have to go?",
    "Pop the top, sort the rest recursively, then insert the value back with a second recursion: while the top is bigger, pop it, insert below, and push it back.",
    "sortStack(st):\n  if st is empty: return st\n  x = pop st\n  sortStack(st)\n  insert(st, x)\ninsert(st, x):\n  if st empty or top <= x: push x; return\n  y = pop st\n  insert(st, x)\n  push y",
  ],
  reference: `function sortStack(stack) { const insert = (x) => { if (!stack.length || stack[stack.length - 1] <= x) { stack.push(x); return; } const y = stack.pop(); insert(x); stack.push(y); }; const sort = () => { if (!stack.length) return; const x = stack.pop(); sort(); insert(x); }; sort(); return stack; }`,
  brute: `function sortStack(stack) { return stack.slice().sort((a, b) => a - b); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 12), -9, 9)];`),
  examples: [[[11, 2, 32, 3, 41]], [[3, 2, 1]]],
  edges: [
    ["empty", [[]]],
    ["duplicates", [[4, 1, 4, 1]], "Equal values stay next to each other."],
    ["negatives", [[-3, 14, -18, 0]]],
  ],
};

const kthGrammar: ProblemDef = {
  slug: "k-th-symbol-in-grammar",
  title: "K-th Symbol in Grammar",
  difficulty: "Medium",
  pattern: "Recursion",
  leetcodeId: 779,
  fn: "kthGrammar",
  params: [["n", "number"], ["k", "number"]],
  returns: "number",
  hints: [
    "Row n is row n - 1 followed by its complement. Which half of row n does position k fall in?",
    "If k is in the first half, the answer is the same as kthGrammar(n - 1, k). In the second half, it's the flip of kthGrammar(n - 1, k - half).",
    "kthGrammar(n, k):\n  if n == 1: return 0\n  half = 2^(n - 2)\n  if k <= half: return kthGrammar(n - 1, k)\n  return 1 - kthGrammar(n - 1, k - half)",
  ],
  reference: `function kthGrammar(n, k) { let x = k - 1, c = 0; while (x > 0) { c ^= x & 1; x = Math.floor(x / 2); } return c; }`,
  brute: `function kthGrammar(n, k) { if (n === 1) return 0; const half = 2 ** (n - 2); return k <= half ? kthGrammar(n - 1, k) : 1 - kthGrammar(n - 1, k - half); }`,
  fuzz: gen(`const n = __r(rand, 1, 30); return [n, __r(rand, 1, Math.min(2 ** (n - 1), 1000000000))];`),
  examples: [[1, 1], [2, 2]],
  edges: [
    ["min-size", [2, 1]],
    ["extremes", [30, 536870912], "The last symbol of row 30: 2^29 positions."],
    ["boundary", [4, 5], "The first position of the second half."],
  ],
};

const findTheWinner: ProblemDef = {
  slug: "find-the-winner-of-the-circular-game",
  title: "Find the Winner of the Circular Game",
  difficulty: "Medium",
  pattern: "Recursion",
  leetcodeId: 1823,
  fn: "findTheWinner",
  params: [["n", "number"], ["k", "number"]],
  returns: "number",
  hints: [
    "After the first friend leaves, the game is the same game with n - 1 friends, just starting from a shifted position.",
    "Josephus: with 0-based seats, J(1) = 0 and J(n) = (J(n - 1) + k) mod n. Add 1 at the end.",
    "winner(n, k):\n  if n == 1: return 0\n  return (winner(n - 1, k) + k) mod n\nanswer = winner(n, k) + 1",
  ],
  reference: `function findTheWinner(n, k) { let w = 0; for (let m = 2; m <= n; m++) w = (w + k) % m; return w + 1; }`,
  brute: `function findTheWinner(n, k) { const a = Array.from({ length: n }, (_, i) => i + 1); let i = 0; while (a.length > 1) { i = (i + k - 1) % a.length; a.splice(i, 1); } return a[0]; }`,
  fuzz: gen(`const n = __r(rand, 1, 40); return [n, __r(rand, 1, n)];`),
  examples: [[5, 2], [6, 5]],
  edges: [
    ["min-size", [1, 1]],
    ["boundary", [7, 1], "k = 1 removes in order: the last friend wins."],
    ["large", [500, 500]],
  ],
};

export const LADDER_RECURSION = [printOneToN, printNToOne, sortStack, kthGrammar, findTheWinner].map(define);
