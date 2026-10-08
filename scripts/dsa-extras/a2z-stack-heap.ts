import { define, tuf, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";
import { heapSort } from "./a2z-sorting-search";

/**
 * Class problems are judged through a fixed driver: `runOps(ops)` builds the class, applies every
 * `[method, ...args]` and collects what each call returns (`null` for nothing).
 */
const DRIVER = (cls: string, returns = "Array<number | boolean | null>") =>
  `/**\n * Runs the operations and collects each result. Don't change this function.\n * @param {Array<Array<string | number>>} ops\n * @return {${returns}}\n */\nfunction runOps(ops) {\n  const obj = new ${cls}();\n  return ops.map(([op, ...args]) => {\n    const out = obj[op](...args);\n    return out === undefined ? null : out;\n  });\n}`;
const driverFn = (cls: string, body: string) => `${body}\nfunction runOps(ops) { const obj = new ${cls}(); return ops.map(([op, ...args]) => { const out = obj[op](...args); return out === undefined ? null : out; }); }`;

function opsGen(choices: Array<[string, number]>, valueOps: string[]): string {
  const table = JSON.stringify(choices);
  const vals = JSON.stringify(valueOps);
  return gen(`const table = ${table}, vals = ${vals}; const n = __r(rand, 1, 14); const ops = []; for (let i = 0; i < n; i++) { let t = rand() * table.reduce(function (s, c) { return s + c[1]; }, 0); let op = table[0][0]; for (const c of table) { if (t < c[1]) { op = c[0]; break; } t -= c[1]; } ops.push(vals.indexOf(op) >= 0 ? [op, __r(rand, 0, 20)] : [op]); } ops.push([table[1][0]]); return [ops];`);
}

function design(d: {
  slug: string; title: string; cls: string; methods: string; statement: string; hints: [string, string, string];
  reference: string; brute: string; fuzz: string; examples: unknown[][]; edges: ProblemDef["edges"]; pattern?: string; difficulty?: ProblemDef["difficulty"];
}): ProblemDef {
  return {
    slug: d.slug,
    title: d.title,
    difficulty: d.difficulty ?? "Easy",
    pattern: d.pattern ?? "Design (Coding)",
    url: tuf(d.slug),
    statement: `${d.statement}\n\nThe judge drives your class through \`runOps(ops)\`: each operation is \`[method, ...args]\`, and the answer is the list of values the calls return (\`null\` for methods that return nothing).`,
    fn: "runOps",
    params: [["ops", "Array<Array<string | number>>"]],
    returns: "Array<number | boolean | null>",
    starter: `class ${d.cls} {\n  constructor() {\n    \n  }\n${d.methods}\n}\n\n${DRIVER(d.cls)}`,
    hints: d.hints,
    reference: driverFn(d.cls, d.reference),
    brute: driverFn(d.cls, d.brute),
    fuzz: d.fuzz,
    examples: d.examples,
    edges: d.edges,
  };
}

// ---- Stack and queue implementations ----

const STACK_METHODS = "  push(x) {\n    \n  }\n  pop() {\n    \n  }\n  top() {\n    \n  }\n  isEmpty() {\n    \n  }";
const QUEUE_METHODS = "  push(x) {\n    \n  }\n  pop() {\n    \n  }\n  peek() {\n    \n  }\n  isEmpty() {\n    \n  }";
const STACK_BRUTE = `class S { constructor() { this.a = []; } push(x) { this.a.push(x); } pop() { return this.a.length ? this.a.pop() : -1; } top() { return this.a.length ? this.a[this.a.length - 1] : -1; } isEmpty() { return this.a.length === 0; } }`;
const QUEUE_BRUTE = `class S { constructor() { this.a = []; } push(x) { this.a.push(x); } pop() { return this.a.length ? this.a.shift() : -1; } peek() { return this.a.length ? this.a[0] : -1; } isEmpty() { return this.a.length === 0; } }`;
const STACK_OPS = opsGen([["push", 4], ["pop", 2], ["top", 2], ["isEmpty", 1]], ["push"]);
const QUEUE_OPS = opsGen([["push", 4], ["pop", 2], ["peek", 2], ["isEmpty", 1]], ["push"]);
const STACK_EXAMPLES = [[[["push", 5], ["push", 10], ["top"], ["pop"], ["top"], ["isEmpty"]]], [[["push", 1], ["pop"], ["isEmpty"], ["pop"]]]];
const QUEUE_EXAMPLES = [[[["push", 5], ["push", 10], ["peek"], ["pop"], ["peek"], ["isEmpty"]]], [[["push", 1], ["pop"], ["isEmpty"], ["pop"]]]];
const STACK_EDGES: ProblemDef["edges"] = [
  ["empty", [[["pop"], ["top"], ["isEmpty"]]], "Popping or reading an empty stack returns -1."],
  ["duplicates", [[["push", 3], ["push", 3], ["pop"], ["top"]]]],
  ["order", [[["push", 1], ["push", 2], ["push", 3], ["pop"], ["pop"], ["pop"]]], "Last in, first out."],
];
const QUEUE_EDGES: ProblemDef["edges"] = [
  ["empty", [[["pop"], ["peek"], ["isEmpty"]]], "Removing from or reading an empty queue returns -1."],
  ["duplicates", [[["push", 3], ["push", 3], ["pop"], ["peek"]]]],
  ["order", [[["push", 1], ["push", 2], ["push", 3], ["pop"], ["pop"], ["pop"]]], "First in, first out."],
];

const stackArray = design({
  slug: "implement-stack-using-arrays",
  title: "Implement a Stack Using an Array",
  cls: "ArrayStack",
  methods: STACK_METHODS,
  statement: "Implement `ArrayStack` on top of a plain array and a top index (don't rely on `push`/`pop` doing the work for you):\n\n- `push(x)` adds `x` on top.\n- `pop()` removes and returns the top, or `-1` if the stack is empty.\n- `top()` returns the top without removing it, or `-1`.\n- `isEmpty()` returns whether the stack is empty.",
  hints: [
    "A stack only ever touches one end. What single number tells you where that end is?",
    "Keep an array and an index t = -1. push stores at ++t; pop returns the value at t and decrements it; top reads index t; empty means t == -1.",
    "push(x): t += 1; arr[t] = x\npop(): if t == -1: return -1; v = arr[t]; t -= 1; return v\ntop(): return -1 if t == -1 else arr[t]\nisEmpty(): return t == -1",
  ],
  reference: `class ArrayStack { constructor() { this.a = []; this.t = -1; } push(x) { this.a[++this.t] = x; } pop() { return this.t < 0 ? -1 : this.a[this.t--]; } top() { return this.t < 0 ? -1 : this.a[this.t]; } isEmpty() { return this.t < 0; } }`,
  brute: STACK_BRUTE.replace("class S", "class ArrayStack"),
  fuzz: STACK_OPS,
  examples: STACK_EXAMPLES,
  edges: STACK_EDGES,
});

const queueArray = design({
  slug: "implement-queue-using-arrays",
  title: "Implement a Queue Using an Array",
  cls: "ArrayQueue",
  methods: QUEUE_METHODS,
  statement: "Implement `ArrayQueue` with an array and front/rear indexes (avoid `shift`, which is O(n)):\n\n- `push(x)` adds `x` at the back.\n- `pop()` removes and returns the front, or `-1` if the queue is empty.\n- `peek()` returns the front without removing it, or `-1`.\n- `isEmpty()` returns whether the queue is empty.",
  hints: [
    "Removing from the front of an array by shifting is slow. What if you just remember where the front is?",
    "Keep indexes front and rear. push writes at rear and advances it; pop reads at front and advances it. The queue is empty when front == rear.",
    "push(x): arr[rear] = x; rear += 1\npop(): if front == rear: return -1; v = arr[front]; front += 1; return v\npeek(): return -1 if front == rear else arr[front]\nisEmpty(): return front == rear",
  ],
  reference: `class ArrayQueue { constructor() { this.a = []; this.f = 0; this.r = 0; } push(x) { this.a[this.r++] = x; } pop() { return this.f === this.r ? -1 : this.a[this.f++]; } peek() { return this.f === this.r ? -1 : this.a[this.f]; } isEmpty() { return this.f === this.r; } }`,
  brute: QUEUE_BRUTE.replace("class S", "class ArrayQueue"),
  fuzz: QUEUE_OPS,
  examples: QUEUE_EXAMPLES,
  edges: QUEUE_EDGES,
});

const stackList = design({
  slug: "implement-stack-using-linkedlist",
  title: "Implement a Stack Using a Linked List",
  cls: "LinkedListStack",
  methods: STACK_METHODS,
  statement: "Implement `LinkedListStack` using linked nodes (`{ val, next }`), not an array:\n\n- `push(x)` adds `x` on top.\n- `pop()` removes and returns the top, or `-1` if the stack is empty.\n- `top()` returns the top without removing it, or `-1`.\n- `isEmpty()` returns whether the stack is empty.",
  hints: [
    "Which end of a singly linked list can you add to and remove from in O(1)?",
    "Use the head as the top. push makes a new node pointing at the old head; pop moves head to head.next and returns the old value.",
    "push(x): head = node(x, next = head)\npop(): if head is null: return -1; v = head.val; head = head.next; return v\ntop(): return -1 if head is null else head.val\nisEmpty(): return head is null",
  ],
  reference: `class LinkedListStack { constructor() { this.h = null; } push(x) { this.h = { val: x, next: this.h }; } pop() { if (!this.h) return -1; const v = this.h.val; this.h = this.h.next; return v; } top() { return this.h ? this.h.val : -1; } isEmpty() { return this.h === null; } }`,
  brute: STACK_BRUTE.replace("class S", "class LinkedListStack"),
  fuzz: STACK_OPS,
  examples: STACK_EXAMPLES,
  edges: STACK_EDGES,
});

const queueList = design({
  slug: "implement-queue-using-linkedlist",
  title: "Implement a Queue Using a Linked List",
  cls: "LinkedListQueue",
  methods: QUEUE_METHODS,
  statement: "Implement `LinkedListQueue` using linked nodes (`{ val, next }`), not an array:\n\n- `push(x)` adds `x` at the back.\n- `pop()` removes and returns the front, or `-1` if the queue is empty.\n- `peek()` returns the front without removing it, or `-1`.\n- `isEmpty()` returns whether the queue is empty.",
  hints: [
    "You need O(1) work at both ends. Which two node references do you keep?",
    "Keep head (front) and tail (back). push links a new node after tail (or sets both when empty); pop advances head and clears tail when the queue empties.",
    "push(x): n = node(x); if tail is null: head = tail = n else tail.next = n; tail = n\npop(): if head is null: return -1; v = head.val; head = head.next; if head is null: tail = null; return v\npeek(): return -1 if head is null else head.val\nisEmpty(): return head is null",
  ],
  reference: `class LinkedListQueue { constructor() { this.h = null; this.t = null; } push(x) { const n = { val: x, next: null }; if (!this.t) this.h = this.t = n; else { this.t.next = n; this.t = n; } } pop() { if (!this.h) return -1; const v = this.h.val; this.h = this.h.next; if (!this.h) this.t = null; return v; } peek() { return this.h ? this.h.val : -1; } isEmpty() { return this.h === null; } }`,
  brute: QUEUE_BRUTE.replace("class S", "class LinkedListQueue"),
  fuzz: QUEUE_OPS,
  examples: QUEUE_EXAMPLES,
  edges: QUEUE_EDGES,
});

// ---- Expression conversions ----

/** Shared parsing for the conversion references: infix -> tree via shunting-yard, and tree printers. */
const PREC = `const prec = (c) => (c === "^" ? 3 : c === "*" || c === "/" ? 2 : 1); const isOp = (c) => "+-*/^".includes(c);`;
const SHUNT = `${PREC} const toPost = (s) => { let out = ""; const st = []; for (const c of s) { if (c === "(") st.push(c); else if (c === ")") { while (st[st.length - 1] !== "(") out += st.pop(); st.pop(); } else if (isOp(c)) { while (st.length && st[st.length - 1] !== "(" && (prec(st[st.length - 1]) > prec(c) || (prec(st[st.length - 1]) === prec(c) && c !== "^"))) out += st.pop(); st.push(c); } else out += c; } while (st.length) out += st.pop(); return out; };`;
/** Recursive-descent infix parser for the brute forces: + - left, * / left, ^ right. Returns [op, l, r] or a leaf string. */
const DESCENT = `const parse = (s) => { let i = 0; const atom = () => { if (s[i] === "(") { i++; const e = sum(); i++; return e; } return s[i++]; }; const pow = () => { const b = atom(); if (s[i] === "^") { i++; return ["^", b, pow()]; } return b; }; const mul = () => { let l = pow(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; l = [o, l, pow()]; } return l; }; const sum = () => { let l = mul(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; l = [o, l, mul()]; } return l; }; return sum(); }; const pre = (t) => (typeof t === "string" ? t : t[0] + pre(t[1]) + pre(t[2])); const post = (t) => (typeof t === "string" ? t : post(t[1]) + post(t[2]) + t[0]); const inf = (t) => (typeof t === "string" ? t : "(" + inf(t[1]) + t[0] + inf(t[2]) + ")");`;
const TREE_GEN = `function __tree(rand, d) { if (d <= 0 || rand() < 0.3) return __pick(rand, "ABCDEFGH".split("")); return [__pick(rand, ["+", "-", "*", "/", "^"]), __tree(rand, d - 1), __tree(rand, d - 1)]; }`;
const INFIX_GEN = gen(`function expr(d) { var s = term(d); var k = __r(rand, 0, 3); for (var i = 0; i < k; i++) s += __pick(rand, ["+", "-", "*", "/", "^"]) + term(d); return s; } function term(d) { return d > 0 && rand() < 0.3 ? "(" + expr(d - 1) + ")" : __pick(rand, "abcdefgh".split("")); } return [expr(2)];`);

function conversion(slug: string, title: string, from: string, to: string, fn: string, statementExtra: string, hints: [string, string, string], reference: string, brute: string, fuzz: string, examples: string[], edges: ProblemDef["edges"]): ProblemDef {
  return {
    slug, title, difficulty: "Medium", pattern: "Stack", url: tuf(slug),
    statement: `Given a valid ${from} expression \`s\`, convert it to ${to} and return it.\n\nOperands are single letters. Operators are \`+ - * / ^\`: \`^\` binds tightest and groups right to left, \`*\` and \`/\` come next, \`+\` and \`-\` bind loosest, and all except \`^\` group left to right. ${statementExtra}`,
    constraints: ["1 <= s.length <= 100"],
    fn, params: [["s", "string"]], returns: "string",
    hints, reference, brute, fuzz,
    examples: examples.map((e) => [e]),
    edges,
  };
}

const infixToPostfix = conversion(
  "infix-to-postfix-conversion", "Infix to Postfix", "infix", "postfix", "infixToPostfix", "Infix input may contain parentheses; the output has none and no spaces.",
  [
    "Operands go straight to the output. Operators have to wait until you know nothing tighter follows. Where do they wait?",
    "Use an operator stack (shunting-yard). On an operator, pop to the output while the stack top binds tighter, or equally tight and the new operator isn't '^'. '(' is pushed; ')' pops until the matching '('. Pop everything at the end.",
    "for c in s:\n  if c is an operand: output c\n  else if c == '(': push c\n  else if c == ')': pop to output until '('; discard '('\n  else:\n    while top is an operator and (prec(top) > prec(c) or (prec(top) == prec(c) and c != '^')): output pop\n    push c\npop the rest to output",
  ],
  `function infixToPostfix(s) { ${SHUNT} return toPost(s); }`,
  `function infixToPostfix(s) { ${DESCENT} return post(parse(s)); }`,
  INFIX_GEN,
  ["a+b*(c^d-e)^(f+g*h)-i", "(p+q)*(m-n)"],
  [
    ["single-char", ["a"]],
    ["order", ["a^b^c"], "^ groups right to left: abc^^."],
    ["boundary", ["a-b-c"], "- groups left to right: ab-c-."],
  ],
);

const infixToPrefix = conversion(
  "infix-to-prefix-conversion", "Infix to Prefix", "infix", "prefix", "infixToPrefix", "Infix input may contain parentheses; the output has none and no spaces.",
  [
    "Prefix is the mirror of postfix, but associativity flips when you mirror. Can you build the postfix tree first?",
    "One clean way: convert to postfix with shunting-yard, rebuild the expression tree from the postfix with a stack, then print it root-first. (The reverse-the-string trick also works if you handle associativity carefully.)",
    "post = infix to postfix (shunting-yard)\nstack = empty\nfor c in post:\n  if c is an operand: push c\n  else: right = pop; left = pop; push c + left + right\nreturn pop",
  ],
  `function infixToPrefix(s) { ${SHUNT} const st = []; for (const c of toPost(s)) { if (isOp(c)) { const r = st.pop(), l = st.pop(); st.push(c + l + r); } else st.push(c); } return st.pop(); }`,
  `function infixToPrefix(s) { ${DESCENT} return pre(parse(s)); }`,
  INFIX_GEN,
  ["(a-b/c)*(a/k-l)", "x+y*z"],
  [
    ["single-char", ["a"]],
    ["order", ["a^b^c"], "^ groups right to left: ^a^bc."],
    ["boundary", ["a-b-c"], "- groups left to right: --abc."],
  ],
);

const PREFIX_GEN = gen(`${TREE_GEN}\nfunction pre(t) { return typeof t === "string" ? t : t[0] + pre(t[1]) + pre(t[2]); } return [pre(__tree(rand, 3))];`);
const POSTFIX_GEN = gen(`${TREE_GEN}\nfunction post(t) { return typeof t === "string" ? t : post(t[1]) + post(t[2]) + t[0]; } return [post(__tree(rand, 3))];`);
const PREFIX_TREE = `const parsePre = (s) => { let i = 0; const go = () => { const c = s[i++]; return "+-*/^".includes(c) ? [c, go(), go()] : c; }; return go(); };`;
const POSTFIX_TREE = `const parsePost = (s) => { const st = []; for (const c of s) { if ("+-*/^".includes(c)) { const r = st.pop(), l = st.pop(); st.push([c, l, r]); } else st.push(c); } return st.pop(); };`;
const PRINTERS = `const pre = (t) => (typeof t === "string" ? t : t[0] + pre(t[1]) + pre(t[2])); const post = (t) => (typeof t === "string" ? t : post(t[1]) + post(t[2]) + t[0]); const inf = (t) => (typeof t === "string" ? t : "(" + inf(t[1]) + t[0] + inf(t[2]) + ")");`;
const FULL_PARENS = "Wrap every operator with its two operands in parentheses, e.g. `(A+B)`, with no spaces.";

const prefixToInfix = conversion(
  "prefix-to-infix-conversion", "Prefix to Infix", "prefix", "fully parenthesised infix", "prefixToInfix", FULL_PARENS,
  [
    "In prefix the operator comes before its operands. Reading from the right, when you meet an operator, its operands are already complete.",
    "Scan right to left with a stack of strings. Push operands; on an operator pop a (left) then b (right) and push '(' + a + op + b + ')'.",
    "for c in s from right to left:\n  if c is an operand: push c\n  else: a = pop; b = pop; push '(' + a + c + b + ')'\nreturn pop",
  ],
  `function prefixToInfix(s) { const st = []; for (let i = s.length - 1; i >= 0; i--) { const c = s[i]; if ("+-*/^".includes(c)) { const a = st.pop(), b = st.pop(); st.push("(" + a + c + b + ")"); } else st.push(c); } return st.pop(); }`,
  `function prefixToInfix(s) { ${PREFIX_TREE} ${PRINTERS} return inf(parsePre(s)); }`,
  PREFIX_GEN,
  ["*-A/BC-/AKL", "+AB"],
  [
    ["single-char", ["A"], "A lone operand needs no parentheses."],
    ["order", ["-A-BC"]],
    ["boundary", ["^^ABC"]],
  ],
);

const prefixToPostfix = conversion(
  "prefix-to-postfix-conversion", "Prefix to Postfix", "prefix", "postfix", "prefixToPostfix", "The output has no spaces.",
  [
    "As with prefix to infix, scan from the right so operands are ready when you meet an operator.",
    "Scan right to left with a stack. Push operands; on an operator pop a then b and push a + b + op.",
    "for c in s from right to left:\n  if c is an operand: push c\n  else: a = pop; b = pop; push a + b + c\nreturn pop",
  ],
  `function prefixToPostfix(s) { const st = []; for (let i = s.length - 1; i >= 0; i--) { const c = s[i]; if ("+-*/^".includes(c)) { const a = st.pop(), b = st.pop(); st.push(a + b + c); } else st.push(c); } return st.pop(); }`,
  `function prefixToPostfix(s) { ${PREFIX_TREE} ${PRINTERS} return post(parsePre(s)); }`,
  PREFIX_GEN,
  ["/-AB*+DEF", "*+AB-CD"],
  [
    ["single-char", ["A"]],
    ["order", ["-A-BC"]],
    ["boundary", ["^^ABC"]],
  ],
);

const postfixToInfix = conversion(
  "postfix-to-infix-conversion", "Postfix to Infix", "postfix", "fully parenthesised infix", "postfixToInfix", FULL_PARENS,
  [
    "In postfix an operator follows its two operands. Which data structure gives you the two most recent complete operands?",
    "Scan left to right with a stack of strings. Push operands; on an operator pop b (right) then a (left) and push '(' + a + op + b + ')'.",
    "for c in s:\n  if c is an operand: push c\n  else: b = pop; a = pop; push '(' + a + c + b + ')'\nreturn pop",
  ],
  `function postfixToInfix(s) { const st = []; for (const c of s) { if ("+-*/^".includes(c)) { const b = st.pop(), a = st.pop(); st.push("(" + a + c + b + ")"); } else st.push(c); } return st.pop(); }`,
  `function postfixToInfix(s) { ${POSTFIX_TREE} ${PRINTERS} return inf(parsePost(s)); }`,
  POSTFIX_GEN,
  ["AB-DE+F*/", "ab*c+"],
  [
    ["single-char", ["A"]],
    ["order", ["AB-C-"]],
    ["boundary", ["ABC^^"]],
  ],
);

const postfixToPrefix = conversion(
  "postfix-to-prefix-conversion", "Postfix to Prefix", "postfix", "prefix", "postfixToPrefix", "The output has no spaces.",
  [
    "Read the postfix left to right; each operator combines the two latest complete operands.",
    "Use a stack of strings. Push operands; on an operator pop b then a and push op + a + b.",
    "for c in s:\n  if c is an operand: push c\n  else: b = pop; a = pop; push c + a + b\nreturn pop",
  ],
  `function postfixToPrefix(s) { const st = []; for (const c of s) { if ("+-*/^".includes(c)) { const b = st.pop(), a = st.pop(); st.push(c + a + b); } else st.push(c); } return st.pop(); }`,
  `function postfixToPrefix(s) { ${POSTFIX_TREE} ${PRINTERS} return pre(parsePost(s)); }`,
  POSTFIX_GEN,
  ["AB-DE+F*/", "ABC/-AK/L-*"],
  [
    ["single-char", ["A"]],
    ["order", ["AB-C-"]],
    ["boundary", ["ABC^^"]],
  ],
);

// ---- Monotonic stack ----

const nextSmaller: ProblemDef = {
  slug: "next-smaller-element",
  title: "Next Smaller Element",
  difficulty: "Medium",
  pattern: "Stack & Monotonic Stack",
  url: tuf("next-smaller-element"),
  statement: "Given an integer array `nums`, return an array where position `i` holds the first element to the **right** of `nums[i]` that is strictly smaller than it, or `-1` if there is none.",
  constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  fn: "nextSmallerElements",
  params: [["nums", "number[]"]],
  returns: "number[]",
  hints: [
    "Scanning from the right, which earlier-seen values can never be anyone's answer again?",
    "Go right to left with a stack. Pop values that are >= nums[i] (they're hidden behind nums[i]). The stack top is then the answer (or -1). Push nums[i].",
    "stack = empty; ans = array of n\nfor i from n - 1 down to 0:\n  while stack not empty and top >= nums[i]: pop\n  ans[i] = top if stack not empty else -1\n  push nums[i]\nreturn ans",
  ],
  reference: `function nextSmallerElements(nums) { const st = [], ans = new Array(nums.length); for (let i = nums.length - 1; i >= 0; i--) { while (st.length && st[st.length - 1] >= nums[i]) st.pop(); ans[i] = st.length ? st[st.length - 1] : -1; st.push(nums[i]); } return ans; }`,
  brute: `function nextSmallerElements(nums) { return nums.map((x, i) => { for (let j = i + 1; j < nums.length; j++) if (nums[j] < x) return nums[j]; return -1; }); }`,
  fuzz: arrayGen(1, 14, -5, 10),
  examples: [[[4, 8, 5, 2, 25]], [[13, 7, 6, 12]]],
  edges: [
    ["sorted", [[1, 2, 3]], "Increasing: nothing smaller to the right."],
    ["all-equal", [[5, 5, 5]], "Equal isn't smaller."],
    ["single", [[9]]],
  ],
};

const greaterToRight: ProblemDef = {
  slug: "number-of-greater-elements-to-the-right",
  title: "Number of Greater Elements to the Right",
  difficulty: "Medium",
  pattern: "Stack & Monotonic Stack",
  url: tuf("number-of-greater-elements-to-the-right"),
  statement: "Given an integer array `nums` and a list of query `indices`, return for each query index `i` how many elements to the right of `nums[i]` are strictly greater than it.",
  constraints: ["1 <= nums.length <= 10^4", "1 <= indices.length <= 100", "0 <= indices[j] < nums.length"],
  fn: "countNGE",
  params: [["nums", "number[]"], ["indices", "number[]"]],
  returns: "number[]",
  hints: [
    "With at most 100 queries, a direct scan per query is fast enough. What exactly do you count?",
    "For each query index i, scan j from i + 1 to the end and count nums[j] > nums[i]. (For many queries, a Fenwick tree over values processed right to left answers every index.)",
    "for each i in indices:\n  count = 0\n  for j from i + 1 to n - 1:\n    if nums[j] > nums[i]: count += 1\n  append count\nreturn answers",
  ],
  reference: `function countNGE(nums, indices) { return indices.map((i) => { let c = 0; for (let j = i + 1; j < nums.length; j++) if (nums[j] > nums[i]) c++; return c; }); }`,
  brute: `function countNGE(nums, indices) { return indices.map((i) => nums.slice(i + 1).filter((v) => v > nums[i]).length); }`,
  fuzz: gen(`const n = __r(rand, 1, 12); const a = __arr(rand, n, 0, 9); return [a, __arr(rand, __r(rand, 1, 5), 0, n - 1)];`),
  examples: [[[3, 4, 2, 7, 5, 8, 10, 6], [0, 5]], [[1, 2, 3, 4, 1], [0, 3]]],
  edges: [
    ["boundary", [[5, 1, 2], [2]], "The last index has nothing to its right."],
    ["all-equal", [[4, 4, 4], [0, 1]]],
    ["reverse-sorted", [[9, 7, 5, 3], [0, 1, 2]]],
  ],
};

const celebrity: ProblemDef = {
  slug: "celebrity-problem",
  title: "The Celebrity Problem",
  difficulty: "Medium",
  pattern: "Stack & Monotonic Stack",
  url: tuf("celebrity-problem"),
  statement: "At a party of `n` people, `M[i][j] = 1` means person `i` knows person `j` (`M[i][i]` is always `0`). A **celebrity** is known by everyone else and knows no one. Return the celebrity's index, or `-1` if there is none.",
  constraints: ["1 <= n <= 3000", "M[i][j] is 0 or 1"],
  fn: "celebrity",
  params: [["M", "number[][]"]],
  returns: "number",
  hints: [
    "One question \"does a know b?\" always rules someone out. Who?",
    "If a knows b, a isn't the celebrity; otherwise b isn't. Eliminate with two pointers (or a stack) until one candidate is left, then verify that candidate's row and column.",
    "a = 0; b = n - 1\nwhile a < b:\n  if M[a][b] == 1: a += 1\n  else: b -= 1\nfor i from 0 to n - 1:\n  if i != a and (M[a][i] == 1 or M[i][a] == 0): return -1\nreturn a",
  ],
  reference: `function celebrity(M) { const n = M.length; let a = 0, b = n - 1; while (a < b) { if (M[a][b] === 1) a++; else b--; } for (let i = 0; i < n; i++) if (i !== a && (M[a][i] === 1 || M[i][a] === 0)) return -1; return a; }`,
  brute: `function celebrity(M) { const n = M.length; for (let c = 0; c < n; c++) { let ok = true; for (let i = 0; i < n; i++) if (i !== c && (M[c][i] !== 0 || M[i][c] !== 1)) ok = false; if (ok) return c; } return -1; }`,
  fuzz: gen(`var n = __r(rand, 1, 6); var M = Array.from({ length: n }, function (_, i) { return Array.from({ length: n }, function (_, j) { return i === j ? 0 : __r(rand, 0, 1); }); }); if (rand() < 0.5) { var c = __r(rand, 0, n - 1); for (var i = 0; i < n; i++) if (i !== c) { M[c][i] = 0; M[i][c] = 1; } } return [M];`),
  examples: [[[[0, 1, 0], [0, 0, 0], [0, 1, 0]]], [[[0, 1], [1, 0]]]],
  edges: [
    ["single", [[[0]]], "Alone at the party: trivially the celebrity."],
    ["no-answer", [[[0, 0], [0, 0]]], "Nobody knows anybody."],
    ["boundary", [[[0, 0, 0], [1, 0, 1], [1, 0, 0]]], "Person 0 is the celebrity."],
  ],
};

// ---- Heaps ----

const MIN_HEAP_GEN = gen(`const n = __r(rand, 1, 12); const a = __arr(rand, n, 0, 30); const h = []; for (const x of a) { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } } return [h];`);

const heapify: ProblemDef = {
  slug: "heapify-algorithm",
  title: "Heapify Algorithm",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("heapify-algorithm"),
  statement: "`nums` is a valid **min-heap** stored as an array (children of `i` are `2i + 1` and `2i + 2`). Set `nums[ind] = val`, then restore the heap property **in place**:\n\n- If the new value is smaller than its parent, sift it **up** by swapping with the parent while it's smaller.\n- Otherwise sift it **down**: while it's larger than its smaller child, swap with that child (the left child on a tie).\n\nDon't return anything.",
  constraints: ["1 <= nums.length <= 10^4", "0 <= ind < nums.length"],
  fn: "heapify",
  params: [["nums", "number[]"], ["ind", "number"], ["val", "number"]],
  returns: "void",
  returnKind: "arg0",
  hints: [
    "Changing one value can only break the heap order between that node and its parent, or between it and its children.",
    "After writing val, if it's smaller than nums[parent], keep swapping upward. Otherwise keep swapping downward with the smaller child while that child is smaller.",
    "nums[ind] = val\nif ind > 0 and nums[ind] < nums[parent(ind)]:\n  while ind > 0 and nums[ind] < nums[parent]: swap; ind = parent\nelse:\n  loop: s = index of the smaller child (left on a tie)\n    if no child or nums[s] >= nums[ind]: stop\n    swap nums[ind], nums[s]; ind = s",
  ],
  reference: `function heapify(nums, ind, val) { nums[ind] = val; const n = nums.length; if (ind > 0 && nums[ind] < nums[(ind - 1) >> 1]) { while (ind > 0 && nums[ind] < nums[(ind - 1) >> 1]) { const p = (ind - 1) >> 1; [nums[p], nums[ind]] = [nums[ind], nums[p]]; ind = p; } return; } for (;;) { const l = 2 * ind + 1, r = l + 1; let s = ind; if (l < n && nums[l] < nums[s]) s = l; if (r < n && nums[r] < nums[s] && nums[r] < nums[l]) s = r; if (s === ind) return; [nums[s], nums[ind]] = [nums[ind], nums[s]]; ind = s; } }`,
  brute: `function heapify(nums, ind, val) { nums[ind] = val; const up = (i) => { const p = Math.floor((i - 1) / 2); if (i > 0 && nums[i] < nums[p]) { const t = nums[i]; nums[i] = nums[p]; nums[p] = t; up(p); } }; const down = (i) => { const kids = [2 * i + 1, 2 * i + 2].filter((c) => c < nums.length); if (!kids.length) return; const c = kids.length === 2 && nums[kids[1]] < nums[kids[0]] ? kids[1] : kids[0]; if (nums[c] < nums[i]) { const t = nums[i]; nums[i] = nums[c]; nums[c] = t; down(c); } }; const p = Math.floor((ind - 1) / 2); if (ind > 0 && nums[ind] < nums[p]) up(ind); else down(ind); }`,
  fuzz: gen(`const n = __r(rand, 1, 12); const a = __arr(rand, n, 0, 30); const h = []; for (const x of a) { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } } return [h, __r(rand, 0, n - 1), __r(rand, -5, 40)];`),
  examples: [[[1, 4, 5, 5, 7, 6], 5, 2], [[2, 4, 3, 7, 9, 8], 0, 10]],
  edges: [
    ["single", [[5], 0, 9]],
    ["boundary", [[1, 2, 3], 0, 1], "Same value: nothing moves."],
    ["duplicates", [[2, 2, 2, 2], 0, 3], "Tie between children: swap with the left one."],
  ],
};

const buildHeap: ProblemDef = {
  slug: "build-heap-from-a-given-array",
  title: "Build a Min-Heap from an Array",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("build-heap-from-a-given-array"),
  statement: "Turn `nums` into a **min-heap in place** with the bottom-up method: for `i` from `floor(n / 2) - 1` down to `0`, sift `nums[i]` down (swap with its smaller child, the left one on a tie, while that child is smaller). Return the array.",
  constraints: ["1 <= nums.length <= 10^4"],
  fn: "buildMinHeap",
  params: [["nums", "number[]"]],
  returns: "number[]",
  hints: [
    "Leaves are already one-element heaps. Which nodes need fixing, and in what order?",
    "Sift down every non-leaf, starting from the last one (index n/2 - 1) and moving to the root. This is O(n) overall.",
    "siftDown(i):\n  loop: s = smaller child of i (left on a tie)\n    if no child or nums[s] >= nums[i]: stop\n    swap nums[i], nums[s]; i = s\nfor i from n / 2 - 1 down to 0: siftDown(i)\nreturn nums",
  ],
  reference: `function buildMinHeap(nums) { const n = nums.length; const sift = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let s = l; if (l >= n) return; if (r < n && nums[r] < nums[l]) s = r; if (nums[s] >= nums[i]) return; [nums[s], nums[i]] = [nums[i], nums[s]]; i = s; } }; for (let i = (n >> 1) - 1; i >= 0; i--) sift(i); return nums; }`,
  brute: `function buildMinHeap(nums) { const down = (i) => { const kids = [2 * i + 1, 2 * i + 2].filter((c) => c < nums.length); if (!kids.length) return; const c = kids.length === 2 && nums[kids[1]] < nums[kids[0]] ? kids[1] : kids[0]; if (nums[c] < nums[i]) { const t = nums[i]; nums[i] = nums[c]; nums[c] = t; down(c); } }; for (let i = Math.floor(nums.length / 2) - 1; i >= 0; i--) down(i); return nums; }`,
  fuzz: arrayGen(1, 14, 0, 30),
  examples: [[[6, 5, 2, 7, 1, 7]], [[3, 1, 2]]],
  edges: [
    ["single", [[4]]],
    ["sorted", [[1, 2, 3, 4]], "Already a heap: nothing moves."],
    ["reverse-sorted", [[9, 7, 5, 3, 1]]],
  ],
};

const HEAP_METHODS = "  insert(x) {\n    \n  }\n  getMin() {\n    \n  }\n  extractMin() {\n    \n  }\n  heapSize() {\n    \n  }";
const minHeapClass = design({
  slug: "implement-min-heap",
  title: "Implement a Min-Heap",
  cls: "MinHeap",
  methods: HEAP_METHODS,
  pattern: "Heap / Priority Queue",
  difficulty: "Medium",
  statement: "Implement `MinHeap` with an array (no sorting):\n\n- `insert(x)` adds `x`.\n- `getMin()` returns the smallest value, or `-1` if the heap is empty.\n- `extractMin()` removes and returns the smallest value, or `-1`.\n- `heapSize()` returns the number of values.",
  hints: [
    "Store the heap as an array where the children of i are 2i + 1 and 2i + 2. Which operations break the order, and where?",
    "insert appends and sifts up while smaller than the parent. extractMin swaps the root with the last element, pops it, then sifts the new root down toward the smaller child.",
    "insert(x): append x; sift it up\ngetMin(): return -1 if empty else a[0]\nextractMin(): if empty return -1; m = a[0]; a[0] = last; remove last; sift a[0] down; return m\nheapSize(): return length of a",
  ],
  reference: `class MinHeap { constructor() { this.a = []; } insert(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0 && a[(i - 1) >> 1] > a[i]) { const p = (i - 1) >> 1; [a[p], a[i]] = [a[i], a[p]]; i = p; } } getMin() { return this.a.length ? this.a[0] : -1; } extractMin() { const a = this.a; if (!a.length) return -1; const m = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < a.length && a[l] < a[s]) s = l; if (r < a.length && a[r] < a[s]) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return m; } heapSize() { return this.a.length; } }`,
  brute: `class MinHeap { constructor() { this.a = []; } insert(x) { this.a.push(x); this.a.sort((p, q) => p - q); } getMin() { return this.a.length ? this.a[0] : -1; } extractMin() { return this.a.length ? this.a.shift() : -1; } heapSize() { return this.a.length; } }`,
  fuzz: opsGen([["insert", 4], ["extractMin", 2], ["getMin", 2], ["heapSize", 1]], ["insert"]),
  examples: [[[["insert", 5], ["insert", 2], ["insert", 8], ["getMin"], ["extractMin"], ["getMin"], ["heapSize"]]], [[["insert", 1], ["extractMin"], ["extractMin"], ["heapSize"]]]],
  edges: [
    ["empty", [[["getMin"], ["extractMin"], ["heapSize"]]], "Reading an empty heap returns -1."],
    ["duplicates", [[["insert", 3], ["insert", 3], ["extractMin"], ["getMin"]]]],
    ["order", [[["insert", 9], ["insert", 7], ["insert", 5], ["extractMin"], ["extractMin"], ["extractMin"]]]],
  ],
});

const maxHeapClass = design({
  slug: "implement-max-heap",
  title: "Implement a Max-Heap",
  cls: "MaxHeap",
  methods: "  insert(x) {\n    \n  }\n  getMax() {\n    \n  }\n  extractMax() {\n    \n  }\n  heapSize() {\n    \n  }",
  pattern: "Heap / Priority Queue",
  difficulty: "Medium",
  statement: "Implement `MaxHeap` with an array (no sorting):\n\n- `insert(x)` adds `x`.\n- `getMax()` returns the largest value, or `-1` if the heap is empty.\n- `extractMax()` removes and returns the largest value, or `-1`.\n- `heapSize()` returns the number of values.",
  hints: [
    "It's the min-heap with every comparison flipped. Where does the largest value live?",
    "insert appends and sifts up while larger than the parent. extractMax moves the last element to the root and sifts it down toward the larger child.",
    "insert(x): append x; sift it up while a[i] > a[parent]\ngetMax(): return -1 if empty else a[0]\nextractMax(): if empty return -1; m = a[0]; a[0] = last; remove last; sift down toward the larger child; return m\nheapSize(): return length of a",
  ],
  reference: `class MaxHeap { constructor() { this.a = []; } insert(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0 && a[(i - 1) >> 1] < a[i]) { const p = (i - 1) >> 1; [a[p], a[i]] = [a[i], a[p]]; i = p; } } getMax() { return this.a.length ? this.a[0] : -1; } extractMax() { const a = this.a; if (!a.length) return -1; const m = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < a.length && a[l] > a[s]) s = l; if (r < a.length && a[r] > a[s]) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return m; } heapSize() { return this.a.length; } }`,
  brute: `class MaxHeap { constructor() { this.a = []; } insert(x) { this.a.push(x); this.a.sort((p, q) => q - p); } getMax() { return this.a.length ? this.a[0] : -1; } extractMax() { return this.a.length ? this.a.shift() : -1; } heapSize() { return this.a.length; } }`,
  fuzz: opsGen([["insert", 4], ["extractMax", 2], ["getMax", 2], ["heapSize", 1]], ["insert"]),
  examples: [[[["insert", 5], ["insert", 2], ["insert", 8], ["getMax"], ["extractMax"], ["getMax"], ["heapSize"]]], [[["insert", 1], ["extractMax"], ["extractMax"], ["heapSize"]]]],
  edges: [
    ["empty", [[["getMax"], ["extractMax"], ["heapSize"]]], "Reading an empty heap returns -1."],
    ["duplicates", [[["insert", 3], ["insert", 3], ["extractMax"], ["getMax"]]]],
    ["order", [[["insert", 1], ["insert", 5], ["insert", 9], ["extractMax"], ["extractMax"], ["extractMax"]]]],
  ],
});

const isMinHeap: ProblemDef = {
  slug: "check-if-an-array-represents-a-min-heap",
  title: "Check if an Array Is a Min-Heap",
  difficulty: "Easy",
  pattern: "Heap / Priority Queue",
  url: tuf("check-if-an-array-represents-a-min-heap-"),
  statement: "Given an array `nums`, return `true` if it represents a **min-heap**: every element is `<=` its children at indexes `2i + 1` and `2i + 2` (when they exist).",
  constraints: ["1 <= nums.length <= 10^5"],
  fn: "isHeap",
  params: [["nums", "number[]"]],
  returns: "boolean",
  hints: [
    "Only parent-child pairs matter. Which indexes are parents?",
    "Check every i from 0 to n/2 - 1 against its existing children; any child smaller than its parent breaks the heap.",
    "for i from 0 to n / 2 - 1:\n  if 2i + 1 < n and nums[2i + 1] < nums[i]: return false\n  if 2i + 2 < n and nums[2i + 2] < nums[i]: return false\nreturn true",
  ],
  reference: `function isHeap(nums) { const n = nums.length; for (let i = 0; 2 * i + 1 < n; i++) { if (nums[2 * i + 1] < nums[i]) return false; if (2 * i + 2 < n && nums[2 * i + 2] < nums[i]) return false; } return true; }`,
  brute: `function isHeap(nums) { return nums.every((v, i) => i === 0 || nums[Math.floor((i - 1) / 2)] <= v); }`,
  fuzz: gen(`if (rand() < 0.5) { const n = __r(rand, 1, 10); const h = []; for (const x of __arr(rand, n, 0, 20)) { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } } return [h]; } return [__arr(rand, __r(rand, 1, 10), 0, 20)];`),
  examples: [[[10, 20, 30, 21, 23]], [[10, 20, 30, 25, 15]]],
  edges: [
    ["single", [[5]]],
    ["all-equal", [[2, 2, 2]], "Equal values are allowed."],
    ["reverse-sorted", [[5, 4, 3]]],
  ],
};

const minToMax: ProblemDef = {
  slug: "convert-min-heap-to-max-heap",
  title: "Convert a Min-Heap to a Max-Heap",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("convert-min-heap-to-max-heap"),
  statement: "Given a min-heap `nums`, convert it **in place** to a max-heap with the bottom-up method: for `i` from `floor(n / 2) - 1` down to `0`, sift `nums[i]` down toward its **larger** child (the left one on a tie) while that child is larger. Return the array.",
  constraints: ["1 <= nums.length <= 10^4"],
  fn: "minToMaxHeap",
  params: [["nums", "number[]"]],
  returns: "number[]",
  hints: [
    "The existing min-heap order doesn't help much. Treat the array as unordered and build a max-heap.",
    "Run the bottom-up build with flipped comparisons: sift down every non-leaf from the last one to the root, swapping with the larger child.",
    "siftDown(i):\n  loop: b = larger child of i (left on a tie)\n    if no child or nums[b] <= nums[i]: stop\n    swap nums[i], nums[b]; i = b\nfor i from n / 2 - 1 down to 0: siftDown(i)\nreturn nums",
  ],
  reference: `function minToMaxHeap(nums) { const n = nums.length; const sift = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; if (l >= n) return; const b = r < n && nums[r] > nums[l] ? r : l; if (nums[b] <= nums[i]) return; [nums[b], nums[i]] = [nums[i], nums[b]]; i = b; } }; for (let i = (n >> 1) - 1; i >= 0; i--) sift(i); return nums; }`,
  brute: `function minToMaxHeap(nums) { const down = (i) => { const kids = [2 * i + 1, 2 * i + 2].filter((c) => c < nums.length); if (!kids.length) return; const c = kids.length === 2 && nums[kids[1]] > nums[kids[0]] ? kids[1] : kids[0]; if (nums[c] > nums[i]) { const t = nums[i]; nums[i] = nums[c]; nums[c] = t; down(c); } }; for (let i = Math.floor(nums.length / 2) - 1; i >= 0; i--) down(i); return nums; }`,
  fuzz: MIN_HEAP_GEN,
  examples: [[[10, 20, 30, 21, 23]], [[1, 2, 3, 4]]],
  edges: [
    ["single", [[7]]],
    ["all-equal", [[3, 3, 3]]],
    ["two", [[1, 2]]],
  ],
};

const rankReplace: ProblemDef = {
  slug: "replace-elements-by-their-rank",
  title: "Replace Elements by Their Rank",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("replace-elements-by-their-rank"),
  statement: "Replace every element of `nums` by its **rank**: the smallest value gets rank `1`, equal values share a rank, and ranks have no gaps. Return the new array.",
  constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  fn: "replaceWithRank",
  params: [["nums", "number[]"]],
  returns: "number[]",
  hints: [
    "If you list the distinct values in increasing order, what is each value's rank?",
    "Sort a copy (or pop from a min-heap), give each new distinct value the next rank in a map, then map every original element to its rank.",
    "sorted = distinct values of nums in increasing order\nrank = map value -> position in sorted + 1\nreturn [rank[x] for x in nums]",
  ],
  reference: `function replaceWithRank(nums) { const r = new Map(); let k = 0; for (const v of nums.slice().sort((a, b) => a - b)) if (!r.has(v)) r.set(v, ++k); return nums.map((v) => r.get(v)); }`,
  brute: `function replaceWithRank(nums) { return nums.map((v) => new Set(nums.filter((w) => w < v)).size + 1); }`,
  fuzz: arrayGen(1, 14, -5, 8),
  examples: [[[20, 15, 26, 2, 98, 6]], [[1, 5, 8, 15, 8, 25, 9]]],
  edges: [
    ["all-equal", [[4, 4, 4]], "Equal values share rank 1."],
    ["single", [[7]]],
    ["negatives", [[-3, 0, -3, 2]]],
  ],
};

const connectSticks: ProblemDef = {
  slug: "minimum-cost-to-connect-sticks",
  title: "Minimum Cost to Connect Sticks",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("minimum-cost-to-connect-sticks"),
  statement: "You can join two sticks of lengths `x` and `y` into one stick of length `x + y` at a cost of `x + y`. Join all `sticks` into one and return the minimum total cost.",
  constraints: ["1 <= sticks.length <= 10^4", "1 <= sticks[i] <= 10^4"],
  fn: "connectSticks",
  params: [["sticks", "number[]"]],
  returns: "number",
  hints: [
    "A stick joined early is paid for again in every later join. Which sticks should be joined first?",
    "Always join the two shortest sticks (a min-heap does this efficiently) and push their sum back. Add every join's cost.",
    "heap = min-heap of sticks\ncost = 0\nwhile heap has more than one stick:\n  a = pop; b = pop\n  cost += a + b\n  push a + b\nreturn cost",
  ],
  reference: `function connectSticks(sticks) { const h = []; const push = (x) => { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; [h[p], h[i]] = [h[i], h[p]]; i = p; } }; const pop = () => { const m = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let s = i; if (a < h.length && h[a] < h[s]) s = a; if (b < h.length && h[b] < h[s]) s = b; if (s === i) break; [h[s], h[i]] = [h[i], h[s]]; i = s; } } return m; }; sticks.forEach(push); let c = 0; while (h.length > 1) { const s = pop() + pop(); c += s; push(s); } return c; }`,
  brute: `function connectSticks(sticks) { const a = sticks.slice(); let c = 0; while (a.length > 1) { a.sort((x, y) => x - y); const s = a.shift() + a.shift(); c += s; a.push(s); } return c; }`,
  fuzz: arrayGen(1, 12, 1, 30),
  examples: [[[2, 4, 3]], [[1, 8, 3, 5]]],
  edges: [
    ["single", [[5]], "Nothing to join: cost 0."],
    ["two", [[3, 4]]],
    ["all-equal", [[2, 2, 2, 2]]],
  ],
};

const sumCombinations: ProblemDef = {
  slug: "maximum-sum-combination",
  title: "Maximum Sum Combinations",
  difficulty: "Medium",
  pattern: "Heap / Priority Queue",
  url: tuf("maximum-sum-combination"),
  statement: "Given two integer arrays `a` and `b` of the same length `n` and an integer `k`, consider all `n * n` sums `a[i] + b[j]`. Return the `k` largest sums in non-increasing order.",
  constraints: ["1 <= n <= 10^4", "1 <= k <= n"],
  fn: "maxSumCombinations",
  params: [["a", "number[]"], ["b", "number[]"], ["k", "number"]],
  returns: "number[]",
  hints: [
    "After sorting both arrays descending, the largest sum is a[0] + b[0]. Which pairs can be the next largest?",
    "Use a max-heap of (sum, i, j) seeded with (0, 0). Each time you pop (i, j), push (i + 1, j) and (i, j + 1) if you haven't seen them. Pop k times.",
    "sort a and b descending\nheap = max-heap with (a[0] + b[0], 0, 0); seen = {(0, 0)}\nrepeat k times:\n  (s, i, j) = pop; append s\n  for (x, y) in (i + 1, j), (i, j + 1):\n    if inside and not seen: push (a[x] + b[y], x, y); mark seen\nreturn answers",
  ],
  reference: `function maxSumCombinations(a, b, k) { const A = a.slice().sort((x, y) => y - x), B = b.slice().sort((x, y) => y - x), n = A.length; const h = [[A[0] + B[0], 0, 0]], seen = new Set(["0,0"]), out = []; while (out.length < k) { let bi = 0; for (let t = 1; t < h.length; t++) if (h[t][0] > h[bi][0]) bi = t; const [s, i, j] = h.splice(bi, 1)[0]; out.push(s); for (const [x, y] of [[i + 1, j], [i, j + 1]]) if (x < n && y < n && !seen.has(x + "," + y)) { seen.add(x + "," + y); h.push([A[x] + B[y], x, y]); } } return out; }`,
  brute: `function maxSumCombinations(a, b, k) { const all = []; for (const x of a) for (const y of b) all.push(x + y); return all.sort((p, q) => q - p).slice(0, k); }`,
  fuzz: gen(`const n = __r(rand, 1, 7); return [__arr(rand, n, -5, 10), __arr(rand, n, -5, 10), __r(rand, 1, n)];`),
  examples: [[[3, 2], [1, 4], 2], [[1, 4, 2, 3], [2, 5, 1, 6], 4]],
  edges: [
    ["single", [[5], [7], 1]],
    ["duplicates", [[1, 1], [1, 1], 2], "Different index pairs with equal sums all count."],
    ["negatives", [[-1, -2], [-3, -4], 2]],
  ],
};

export const A2Z_STACK_HEAP = [
  stackArray, queueArray, stackList, queueList,
  infixToPostfix, infixToPrefix, prefixToInfix, prefixToPostfix, postfixToInfix, postfixToPrefix,
  nextSmaller, greaterToRight, celebrity,
  heapify, buildHeap, minHeapClass, maxHeapClass, isMinHeap, minToMax, heapSort, rankReplace, connectSticks, sumCombinations,
].map(define);
