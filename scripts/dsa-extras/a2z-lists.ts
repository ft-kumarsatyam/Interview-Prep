import { define, tuf, type ProblemDef } from "./define";
import { gen } from "./gen";

/** Array helpers for the brute-force solutions: they solve on a plain array and rebuild the list. */
const H = `const toA = (h) => { const a = []; for (let n = h; n; n = n.next) a.push(n.val); return a; }; const fromA = (a) => { let h = null; for (let i = a.length - 1; i >= 0; i--) h = new ListNode(a[i], h); return h; }; const fromD = (a) => { const h = fromA(a); let p = null; for (let n = h; n; n = n.next) { n.prev = p; p = n; } return h; };`;

const LIST = (min: number, max: number, extra = "") => gen(`return [__arr(rand, __r(rand, ${min}, ${max}), 0, 9)${extra}];`);
const DISTINCT = `function __distinct(rand, n, lo, hi) { var s = new Set(); while (s.size < n) s.add(__r(rand, lo, hi)); return __shuffle(rand, [...s]); }`;

type L = Omit<ProblemDef, "difficulty" | "pattern"> & Partial<Pick<ProblemDef, "difficulty" | "pattern">>;
const ll = (d: L): ProblemDef => ({ difficulty: "Easy", pattern: "Linked List", ...d });

// ---- Singly linked list basics ----

const traversal = ll({
  slug: "traversal-in-linked-list",
  title: "Traversal in a Linked List",
  url: tuf("traversal-in-linked-list"),
  statement: "Given the `head` of a singly linked list, return the values of its nodes from head to tail as an array.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "traverse",
  params: [["head", "ListNode"]],
  returns: "number[]",
  argTypes: ["ListNode"],
  hints: [
    "A linked list has no indexes. How do you get from one node to the next?",
    "Start a pointer at head and follow .next until it becomes null, pushing each node's val.",
    "out = []\ncur = head\nwhile cur is not null:\n  append cur.val\n  cur = cur.next\nreturn out",
  ],
  reference: `function traverse(head) { const out = []; for (let n = head; n !== null; n = n.next) out.push(n.val); return out; }`,
  brute: `function traverse(head) { return head === null ? [] : [head.val].concat(traverse(head.next)); }`,
  fuzz: LIST(1, 12),
  examples: [[[12, 5, 8, 7]], [[3]]],
  edges: [
    ["empty", [[]], "An empty list has no values."],
    ["two", [[1, 2]]],
    ["duplicates", [[4, 4, 4]]],
  ],
});

const deleteTail = ll({
  slug: "deletion-of-the-tail-of-ll",
  title: "Delete the Tail of a Linked List",
  url: tuf("deletion-of-the-tail-of-ll"),
  statement: "Given the `head` of a singly linked list, delete its last node and return the head. Deleting from a one-node list leaves an empty list (`null`).",
  constraints: ["1 <= number of nodes <= 10^4"],
  fn: "deleteTail",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: ["ListNode"],
  returnKind: "ListNode",
  hints: [
    "To remove the last node you have to change the pointer of the node before it. How do you stop one node early?",
    "If head.next is null, return null. Otherwise walk while cur.next.next is not null, then set cur.next = null.",
    "if head.next is null: return null\ncur = head\nwhile cur.next.next is not null:\n  cur = cur.next\ncur.next = null\nreturn head",
  ],
  reference: `function deleteTail(head) { if (head.next === null) return null; let c = head; while (c.next.next !== null) c = c.next; c.next = null; return head; }`,
  brute: `function deleteTail(head) { ${H} const a = toA(head); a.pop(); return fromA(a); }`,
  fuzz: LIST(1, 12),
  examples: [[[1, 2, 3, 4]], [[7, 9]]],
  edges: [
    ["single", [[5]], "The only node is the tail: return null."],
    ["two", [[1, 2]]],
    ["duplicates", [[3, 3, 3]]],
  ],
});

const deleteKth = ll({
  slug: "deletion-of-the-kth-element-of-ll",
  title: "Delete the K-th Node of a Linked List",
  url: tuf("deletion-of-the-kth-element-of-ll"),
  statement: "Given the `head` of a singly linked list and an integer `k` (1-based), delete the `k`-th node and return the head. If the list has fewer than `k` nodes, return it unchanged.",
  constraints: ["0 <= number of nodes <= 10^4", "1 <= k <= 10^4"],
  fn: "deleteKthNode",
  params: [["head", "ListNode"], ["k", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value"],
  returnKind: "ListNode",
  hints: [
    "Deleting the head is different from deleting any other node. Why?",
    "If k == 1 return head.next. Otherwise walk to node k - 1 and, if it and its next exist, skip over the next: prev.next = prev.next.next.",
    "if head is null: return null\nif k == 1: return head.next\nprev = head\nrepeat k - 2 times while prev is not null: prev = prev.next\nif prev and prev.next exist: prev.next = prev.next.next\nreturn head",
  ],
  reference: `function deleteKthNode(head, k) { if (head === null) return null; if (k === 1) return head.next; let p = head; for (let i = 1; i < k - 1 && p !== null; i++) p = p.next; if (p !== null && p.next !== null) p.next = p.next.next; return head; }`,
  brute: `function deleteKthNode(head, k) { ${H} const a = toA(head); if (k <= a.length) a.splice(k - 1, 1); return fromA(a); }`,
  fuzz: gen(`const n = __r(rand, 0, 10); return [__arr(rand, n, 0, 9), __r(rand, 1, n + 2)];`),
  examples: [[[1, 2, 3, 4, 5], 3], [[10, 20, 30], 1]],
  edges: [
    ["boundary", [[1, 2, 3], 3], "Deleting the tail."],
    ["no-answer", [[1, 2], 5], "k is past the end: unchanged."],
    ["single", [[8], 1]],
  ],
});

const deleteValue = ll({
  slug: "delete-the-element-with-value-x",
  title: "Delete the Node with Value X",
  url: tuf("delete-the-element-with-value-x"),
  statement: "Given the `head` of a singly linked list and a value `x`, delete the **first** node whose value is `x` and return the head. If no node holds `x`, return the list unchanged.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "deleteNodeWithValueX",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value"],
  returnKind: "ListNode",
  hints: [
    "You need the node before the one holding x. What if x is in the head itself?",
    "Handle head.val == x by returning head.next. Otherwise walk with prev and stop when prev.next.val == x, then unlink prev.next.",
    "if head is null: return null\nif head.val == x: return head.next\nprev = head\nwhile prev.next is not null:\n  if prev.next.val == x: prev.next = prev.next.next; return head\n  prev = prev.next\nreturn head",
  ],
  reference: `function deleteNodeWithValueX(head, x) { if (head === null) return null; if (head.val === x) return head.next; for (let p = head; p.next !== null; p = p.next) if (p.next.val === x) { p.next = p.next.next; break; } return head; }`,
  brute: `function deleteNodeWithValueX(head, x) { ${H} const a = toA(head); const i = a.indexOf(x); if (i >= 0) a.splice(i, 1); return fromA(a); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 9)"),
  examples: [[[1, 2, 3, 4], 3], [[5, 6, 5], 5]],
  edges: [
    ["no-answer", [[1, 2, 3], 9]],
    ["duplicates", [[2, 2, 2], 2], "Only the first occurrence goes."],
    ["boundary", [[1, 2, 3], 3], "The tail holds x."],
  ],
});

const insertHead = ll({
  slug: "insertion-at-the-head-of-ll",
  title: "Insert at the Head of a Linked List",
  url: tuf("insertion-at-the-head-of-ll"),
  statement: "Given the `head` of a singly linked list (possibly empty) and a value `x`, insert a new node holding `x` at the front and return the new head.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "insertAtHead",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value"],
  returnKind: "ListNode",
  hints: [
    "The new node becomes the head. What should its next pointer be?",
    "Create the node with next = head and return it. This works for an empty list too.",
    "node = new ListNode(x)\nnode.next = head\nreturn node",
  ],
  reference: `function insertAtHead(head, x) { return new ListNode(x, head); }`,
  brute: `function insertAtHead(head, x) { ${H} return fromA([x].concat(toA(head))); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 9)"),
  examples: [[[1, 2, 3], 7], [[5], 0]],
  edges: [
    ["empty", [[], 4], "The new node is the whole list."],
    ["duplicates", [[4, 4], 4]],
    ["negatives", [[1], -1]],
  ],
});

const insertTail = ll({
  slug: "insertion-at-the-tail-of-ll",
  title: "Insert at the Tail of a Linked List",
  url: tuf("insertion-at-the-tail-of-ll"),
  statement: "Given the `head` of a singly linked list (possibly empty) and a value `x`, append a new node holding `x` at the end and return the head.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "insertAtTail",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value"],
  returnKind: "ListNode",
  hints: [
    "Find the last node: it's the one whose next is null. What if there is no node at all?",
    "If head is null, the new node is the head. Otherwise walk to the last node and set its next to the new node.",
    "node = new ListNode(x)\nif head is null: return node\ncur = head\nwhile cur.next is not null: cur = cur.next\ncur.next = node\nreturn head",
  ],
  reference: `function insertAtTail(head, x) { const n = new ListNode(x); if (head === null) return n; let c = head; while (c.next !== null) c = c.next; c.next = n; return head; }`,
  brute: `function insertAtTail(head, x) { ${H} return fromA(toA(head).concat([x])); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 9)"),
  examples: [[[1, 2, 3], 4], [[9], 8]],
  edges: [
    ["empty", [[], 6], "The new node becomes the head."],
    ["duplicates", [[1, 1], 1]],
    ["negatives", [[0], -5]],
  ],
});

const insertKth = ll({
  slug: "insertion-at-the-kth-position-of-ll",
  title: "Insert at the K-th Position of a Linked List",
  url: tuf("insertion-at-the-kth-position-of-ll"),
  statement: "Given the `head` of a singly linked list, a value `x` and a position `k` (1-based, from `1` to `length + 1`), insert a new node holding `x` so that it becomes the `k`-th node. Return the head.",
  constraints: ["0 <= number of nodes <= 10^4", "1 <= k <= length + 1"],
  fn: "insertAtKthPosition",
  params: [["head", "ListNode"], ["x", "number"], ["k", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value", "value"],
  returnKind: "ListNode",
  hints: [
    "Inserting at position 1 changes the head. For any other position, which node's next pointer changes?",
    "If k == 1 return a new node pointing at head. Otherwise walk to node k - 1, then splice: node.next = prev.next; prev.next = node.",
    "if k == 1: return new ListNode(x, head)\nprev = head\nrepeat k - 2 times: prev = prev.next\nprev.next = new ListNode(x, prev.next)\nreturn head",
  ],
  reference: `function insertAtKthPosition(head, x, k) { if (k === 1) return new ListNode(x, head); let p = head; for (let i = 1; i < k - 1; i++) p = p.next; p.next = new ListNode(x, p.next); return head; }`,
  brute: `function insertAtKthPosition(head, x, k) { ${H} const a = toA(head); a.splice(k - 1, 0, x); return fromA(a); }`,
  fuzz: gen(`const n = __r(rand, 0, 10); return [__arr(rand, n, 0, 9), __r(rand, 0, 9), __r(rand, 1, n + 1)];`),
  examples: [[[1, 2, 4], 3, 3], [[5, 6], 9, 1]],
  edges: [
    ["boundary", [[1, 2, 3], 9, 4], "k = length + 1 appends at the tail."],
    ["empty", [[], 7, 1]],
    ["single", [[1], 2, 2]],
  ],
});

const insertBeforeValue = ll({
  slug: "insertion-before-the-value-x-in-ll",
  title: "Insert Before the Value X in a Linked List",
  url: tuf("insertion-before-the-value-x-in-ll"),
  statement: "Given the `head` of a singly linked list and two values `val` and `x`, insert a new node holding `val` right before the **first** node whose value is `x`. If no node holds `x`, return the list unchanged. Return the head.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "insertBeforeX",
  params: [["head", "ListNode"], ["val", "number"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["ListNode", "value", "value"],
  returnKind: "ListNode",
  hints: [
    "You must stop at the node before the one holding x. What if the head holds x?",
    "If head.val == x, return a new node pointing at head. Otherwise walk until cur.next.val == x and splice the new node between cur and cur.next.",
    "if head is null: return null\nif head.val == x: return new ListNode(val, head)\ncur = head\nwhile cur.next is not null:\n  if cur.next.val == x: cur.next = new ListNode(val, cur.next); return head\n  cur = cur.next\nreturn head",
  ],
  reference: `function insertBeforeX(head, val, x) { if (head === null) return null; if (head.val === x) return new ListNode(val, head); for (let c = head; c.next !== null; c = c.next) if (c.next.val === x) { c.next = new ListNode(val, c.next); break; } return head; }`,
  brute: `function insertBeforeX(head, val, x) { ${H} const a = toA(head); const i = a.indexOf(x); if (i >= 0) a.splice(i, 0, val); return fromA(a); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 9), __r(rand, 0, 9)"),
  examples: [[[1, 2, 3], 9, 3], [[4, 5, 4], 0, 4]],
  edges: [
    ["no-answer", [[1, 2], 7, 8]],
    ["boundary", [[6, 7], 1, 6], "x is at the head: the new node becomes the head."],
    ["duplicates", [[2, 2, 2], 5, 2]],
  ],
});

const length = ll({
  slug: "find-the-length-of-the-linked-list",
  title: "Length of a Linked List",
  url: tuf("find-the-length-of-the-linked-list"),
  statement: "Given the `head` of a singly linked list, return the number of nodes in it.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "getLength",
  params: [["head", "ListNode"]],
  returns: "number",
  argTypes: ["ListNode"],
  hints: [
    "Walk the list once. What do you increment at every node?",
    "Keep a counter starting at 0 and add 1 for every node until the pointer becomes null.",
    "count = 0\ncur = head\nwhile cur is not null:\n  count += 1\n  cur = cur.next\nreturn count",
  ],
  reference: `function getLength(head) { let c = 0; for (let n = head; n !== null; n = n.next) c++; return c; }`,
  brute: `function getLength(head) { return head === null ? 0 : 1 + getLength(head.next); }`,
  fuzz: LIST(0, 15),
  examples: [[[3, 4, 5]], [[1, 1, 1, 1, 1, 1]]],
  edges: [
    ["empty", [[]]],
    ["single", [[9]]],
    ["two", [[1, 2]]],
  ],
});

const search = ll({
  slug: "search-in-linked-list",
  title: "Search in a Linked List",
  url: tuf("search-in-linked-list"),
  statement: "Given the `head` of a singly linked list and a value `key`, return `true` if some node holds `key`, otherwise `false`.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "searchKey",
  params: [["head", "ListNode"], ["key", "number"]],
  returns: "boolean",
  argTypes: ["ListNode", "value"],
  hints: [
    "This is linear search, but following next pointers instead of indexes.",
    "Walk the list and return true as soon as a node's val equals key; return false after the loop.",
    "cur = head\nwhile cur is not null:\n  if cur.val == key: return true\n  cur = cur.next\nreturn false",
  ],
  reference: `function searchKey(head, key) { for (let n = head; n !== null; n = n.next) if (n.val === key) return true; return false; }`,
  brute: `function searchKey(head, key) { ${H} return toA(head).includes(key); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 12)"),
  examples: [[[1, 2, 3, 4], 3], [[5, 6], 7]],
  edges: [
    ["empty", [[], 1]],
    ["boundary", [[1, 2, 9], 9], "The key is in the tail."],
    ["single", [[4], 4]],
  ],
});

const sort012 = ll({
  slug: "sort-a-linked-list-of-0s-1s-and-2s",
  title: "Sort a Linked List of 0s, 1s and 2s",
  difficulty: "Medium",
  url: tuf("sort-a-ll-of-0's-1's-and-2's"),
  statement: "Given the `head` of a linked list whose values are only `0`, `1` and `2`, rearrange it so all `0`s come first, then the `1`s, then the `2`s. Relink the nodes rather than creating new ones, and return the head.",
  constraints: ["0 <= number of nodes <= 10^4", "node values are 0, 1 or 2"],
  fn: "sortList",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: ["ListNode"],
  returnKind: "ListNode",
  hints: [
    "You could count the values and overwrite them, but relinking works in one pass. What if you built three separate lists?",
    "Keep three dummy heads (for 0, 1, 2) with tails. Append every node to its list, then join zero-tail to the one-list (or two-list if empty), one-tail to the two-list, and end the two-list with null.",
    "make dummy heads z, o, t with tails\nfor each node: append it to the tail of its value's list\nzeroTail.next = o.next if o has nodes else t.next\noneTail.next = t.next\ntwoTail.next = null\nreturn z.next if z has nodes else (o.next if o has nodes else t.next)",
  ],
  reference: `function sortList(head) { const d = [new ListNode(0), new ListNode(0), new ListNode(0)], t = d.slice(); for (let n = head; n !== null; n = n.next) { t[n.val].next = n; t[n.val] = n; } t[2].next = null; t[1].next = d[2].next; t[0].next = d[1].next || d[2].next; return d[0].next || d[1].next || d[2].next; }`,
  brute: `function sortList(head) { ${H} return fromA(toA(head).sort((a, b) => a - b)); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 14), 0, 2)];`),
  examples: [[[1, 0, 1, 2, 0, 2, 1]], [[2, 1, 0]]],
  edges: [
    ["all-equal", [[2, 2, 2]]],
    ["empty", [[]]],
    ["no-answer", [[2, 0, 2, 0]], "No 1s: the 0s must link straight to the 2s."],
  ],
});

const addOne = ll({
  slug: "add-one-to-a-number-represented-by-ll",
  title: "Add One to a Number Represented as a Linked List",
  difficulty: "Medium",
  url: tuf("add-one-to-a-number-represented-by-ll"),
  statement: "A non-negative integer is stored in a linked list, one digit per node, **most significant digit first**, with no leading zeros (except the number `0` itself). Add one to it and return the head of the result.",
  constraints: ["1 <= number of nodes <= 100", "0 <= node.val <= 9"],
  fn: "addOne",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: ["ListNode"],
  returnKind: "ListNode",
  hints: [
    "Addition starts from the last digit, but the list only goes forward. How can you process digits from the end?",
    "Recurse to the end and return a carry: carry = 1 at the tail; each node sets val = val + carry, keeps val % 10 and passes floor(val / 10) back. If a carry is left at the head, add a new node 1 in front.",
    "carryFrom(node):\n  if node is null: return 1\n  sum = node.val + carryFrom(node.next)\n  node.val = sum mod 10\n  return sum / 10 rounded down\nif carryFrom(head) == 1: head = new ListNode(1, head)\nreturn head",
  ],
  reference: `function addOne(head) { const go = (n) => { if (n === null) return 1; const s = n.val + go(n.next); n.val = s % 10; return Math.floor(s / 10); }; return go(head) ? new ListNode(1, head) : head; }`,
  brute: `function addOne(head) { ${H} const d = toA(head); let i = d.length - 1; while (i >= 0 && d[i] === 9) { d[i] = 0; i--; } if (i < 0) d.unshift(1); else d[i]++; return fromA(d); }`,
  fuzz: gen(`const n = __r(rand, 1, 8); const a = [__r(rand, 1, 9)].concat(__arr(rand, n - 1, 0, 9)); if (rand() < 0.3) for (let i = __r(rand, 0, n - 1); i < n; i++) a[i] = 9; return [a];`),
  examples: [[[1, 5, 9]], [[1, 2, 3]]],
  edges: [
    ["all-equal", [[9, 9, 9]], "Every digit carries: a new leading 1."],
    ["zeros", [[0]]],
    ["single", [[9]]],
  ],
});

const loopLength = ll({
  slug: "length-of-loop-in-ll",
  title: "Length of Loop in a Linked List",
  difficulty: "Medium",
  url: tuf("length-of-loop-in-ll"),
  statement: "Given the `head` of a linked list that may contain a cycle, return the number of nodes in the cycle, or `0` if there is no cycle.\n\nIn the examples the list is shown as `{ list, pos }`: `pos` is the index the tail links back to, and `-1` means no cycle.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "lengthOfLoop",
  params: [["head", "ListNode"]],
  returns: "number",
  argTypes: ["cycleList"],
  hints: [
    "First detect whether a cycle exists. Once two pointers meet inside the loop, how do you measure it?",
    "Use slow and fast pointers. When they meet, keep one fixed and move the other around until it returns, counting steps.",
    "slow = head, fast = head\nwhile fast and fast.next exist:\n  slow = slow.next; fast = fast.next.next\n  if slow is fast:\n    count = 1; cur = slow.next\n    while cur is not slow: count += 1; cur = cur.next\n    return count\nreturn 0",
  ],
  reference: `function lengthOfLoop(head) { let s = head, f = head; while (f !== null && f.next !== null) { s = s.next; f = f.next.next; if (s === f) { let c = 1; for (let n = s.next; n !== s; n = n.next) c++; return c; } } return 0; }`,
  brute: `function lengthOfLoop(head) { const seen = new Map(); let i = 0; for (let n = head; n !== null; n = n.next, i++) { if (seen.has(n)) return i - seen.get(n); seen.set(n, i); } return 0; }`,
  fuzz: gen(`const n = __r(rand, 0, 10); return [{ list: __arr(rand, n, 0, 9), pos: n ? __r(rand, -1, n - 1) : -1 }];`),
  examples: [[{ list: [1, 2, 3, 4, 5], pos: 1 }], [{ list: [3, 2, 0, -4], pos: -1 }]],
  edges: [
    ["cycle", [{ list: [7], pos: 0 }], "A single node pointing at itself: a loop of length 1."],
    ["empty", [{ list: [], pos: -1 }]],
    ["boundary", [{ list: [1, 2, 3, 4], pos: 0 }], "The whole list is the loop."],
  ],
});

// ---- Doubly linked list ----

const dll = (d: L): ProblemDef => ll({ ...d, pattern: "Doubly Linked List" });
const D1: ["DListNode"] = ["DListNode"];

const arrayToDll = dll({
  slug: "convert-array-to-dll",
  title: "Convert an Array to a Doubly Linked List",
  url: tuf("convert-array-to-dll"),
  statement: "Given an array `arr`, build a doubly linked list with the same values in order and return its head. Every node needs a correct `next` and `prev` (`prev` is `null` on the head). Create nodes with `new ListNode(val)` and set `prev` yourself.",
  constraints: ["0 <= arr.length <= 10^4"],
  fn: "arrayToDLL",
  params: [["arr", "number[]"]],
  returns: "ListNode",
  returnKind: "DListNode",
  hints: [
    "Build the list left to right, remembering the last node you created. Which two pointers connect it to the new node?",
    "Create the head from arr[0] with prev = null. For each next value, create a node, set tail.next = node and node.prev = tail, then move tail forward.",
    "if arr is empty: return null\nhead = node(arr[0]); head.prev = null; tail = head\nfor i from 1 to n - 1:\n  node = node(arr[i])\n  tail.next = node; node.prev = tail\n  tail = node\nreturn head",
  ],
  reference: `function arrayToDLL(arr) { if (!arr.length) return null; const h = new ListNode(arr[0]); h.prev = null; let t = h; for (let i = 1; i < arr.length; i++) { const n = new ListNode(arr[i]); n.prev = t; t.next = n; t = n; } return h; }`,
  brute: `function arrayToDLL(arr) { ${H} return fromD(arr); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 12), 0, 9)];`),
  examples: [[[1, 2, 3, 4]], [[5, 9]]],
  edges: [
    ["empty", [[]], "No nodes: return null."],
    ["single", [[7]], "The single node's prev must be null."],
    ["duplicates", [[3, 3, 3]]],
  ],
});

const dllDeleteTail = dll({
  slug: "delete-tail-of-dll",
  title: "Delete the Tail of a Doubly Linked List",
  url: tuf("delete-tail-of-dll"),
  statement: "Given the `head` of a non-empty doubly linked list, delete its last node and return the head (or `null` if the list becomes empty). Keep every `prev` pointer correct.",
  constraints: ["1 <= number of nodes <= 10^4"],
  fn: "deleteTail",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: D1,
  returnKind: "DListNode",
  hints: [
    "Walk to the tail. Which node becomes the new tail, and which pointer must be cleared?",
    "If head.next is null return null. Otherwise walk to the tail, then set tail.prev.next = null (and tail.prev = null to detach it).",
    "if head.next is null: return null\ntail = head\nwhile tail.next is not null: tail = tail.next\ntail.prev.next = null\ntail.prev = null\nreturn head",
  ],
  reference: `function deleteTail(head) { if (head.next === null) return null; let t = head; while (t.next !== null) t = t.next; t.prev.next = null; t.prev = null; return head; }`,
  brute: `function deleteTail(head) { ${H} const a = toA(head); a.pop(); return fromD(a); }`,
  fuzz: LIST(1, 12),
  examples: [[[1, 2, 3, 4]], [[8, 9]]],
  edges: [
    ["single", [[5]]],
    ["two", [[1, 2]]],
    ["duplicates", [[6, 6, 6]]],
  ],
});

const dllDeleteKth = dll({
  slug: "delete-kth-element-of-dll",
  title: "Delete the K-th Node of a Doubly Linked List",
  url: tuf("delete-kth-element-of-dll"),
  statement: "Given the `head` of a non-empty doubly linked list and `k` (1-based, `1 <= k <= length`), delete the `k`-th node and return the head. Keep every `prev` pointer correct.",
  constraints: ["1 <= k <= number of nodes <= 10^4"],
  fn: "deleteKthElement",
  params: [["head", "ListNode"], ["k", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value"],
  returnKind: "DListNode",
  hints: [
    "Find the k-th node. Then there are four cases: it's the only node, the head, the tail, or in the middle.",
    "Let p = node.prev and q = node.next. If p is null the head moves to q (set q.prev = null). Otherwise p.next = q, and if q exists q.prev = p.",
    "node = head; repeat k - 1 times: node = node.next\np = node.prev; q = node.next\nif q is not null: q.prev = p\nif p is null: return q\np.next = q\nreturn head",
  ],
  reference: `function deleteKthElement(head, k) { let n = head; for (let i = 1; i < k; i++) n = n.next; const p = n.prev, q = n.next; if (q !== null) q.prev = p; if (p === null) return q; p.next = q; return head; }`,
  brute: `function deleteKthElement(head, k) { ${H} const a = toA(head); a.splice(k - 1, 1); return fromD(a); }`,
  fuzz: gen(`const n = __r(rand, 1, 10); return [__arr(rand, n, 0, 9), __r(rand, 1, n)];`),
  examples: [[[1, 2, 3, 4], 2], [[5, 6, 7], 3]],
  edges: [
    ["boundary", [[1, 2, 3], 1], "Deleting the head: the new head's prev must be null."],
    ["single", [[4], 1]],
    ["two", [[1, 2], 2]],
  ],
});

const dllRemoveValue = dll({
  slug: "removing-given-node-in-dll",
  title: "Remove a Given Node from a Doubly Linked List",
  url: tuf("removing-given-node-in-dll"),
  statement: "Given the `head` of a doubly linked list with **distinct** values and a value `x` that is in the list, remove the node holding `x` and return the head. Keep every `prev` pointer correct.",
  constraints: ["1 <= number of nodes <= 10^4", "values are distinct and x is present"],
  fn: "removeNode",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value"],
  returnKind: "DListNode",
  hints: [
    "With prev pointers, a node can unlink itself once you've found it. Which neighbours need updating?",
    "Find the node. Point its prev's next at its next and its next's prev at its prev, handling a missing prev (the head moves) or a missing next.",
    "node = head; while node.val != x: node = node.next\nif node.next is not null: node.next.prev = node.prev\nif node.prev is null: return node.next\nnode.prev.next = node.next\nreturn head",
  ],
  reference: `function removeNode(head, x) { let n = head; while (n.val !== x) n = n.next; if (n.next !== null) n.next.prev = n.prev; if (n.prev === null) return n.next; n.prev.next = n.next; return head; }`,
  brute: `function removeNode(head, x) { ${H} return fromD(toA(head).filter((v) => v !== x)); }`,
  fuzz: gen(`${DISTINCT}\nconst a = __distinct(rand, __r(rand, 1, 10), 0, 20); return [a, __pick(rand, a)];`),
  examples: [[[1, 2, 3, 4], 3], [[10, 20, 30], 10]],
  edges: [
    ["single", [[5], 5]],
    ["boundary", [[1, 2, 3], 3], "Removing the tail."],
    ["two", [[7, 8], 7]],
  ],
});

const dllInsertBeforeHead = dll({
  slug: "insert-node-before-head-in-dll",
  title: "Insert Before the Head of a Doubly Linked List",
  url: tuf("insert-node-before-head-in-dll"),
  statement: "Given the `head` of a doubly linked list (possibly empty) and a value `x`, insert a new node holding `x` before the head and return the new head. Keep every `prev` pointer correct.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "insertBeforeHead",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value"],
  returnKind: "DListNode",
  hints: [
    "The new node becomes the head. Which pointers on it and on the old head change?",
    "Create the node with next = head and prev = null; if head exists set head.prev to the new node.",
    "node = new ListNode(x, head)\nnode.prev = null\nif head is not null: head.prev = node\nreturn node",
  ],
  reference: `function insertBeforeHead(head, x) { const n = new ListNode(x, head); n.prev = null; if (head !== null) head.prev = n; return n; }`,
  brute: `function insertBeforeHead(head, x) { ${H} return fromD([x].concat(toA(head))); }`,
  fuzz: LIST(0, 10, ", __r(rand, 0, 9)"),
  examples: [[[1, 2, 3], 0], [[5], 4]],
  edges: [
    ["empty", [[], 9]],
    ["duplicates", [[2, 2], 2]],
    ["negatives", [[1], -3]],
  ],
});

const dllInsertBeforeTail = dll({
  slug: "insert-node-before-tail-in-dll",
  title: "Insert Before the Tail of a Doubly Linked List",
  url: tuf("insert-node-before-tail-in-dll"),
  statement: "Given the `head` of a non-empty doubly linked list and a value `x`, insert a new node holding `x` just before the last node and return the head. If the list has one node, the new node becomes the head.",
  constraints: ["1 <= number of nodes <= 10^4"],
  fn: "insertBeforeTail",
  params: [["head", "ListNode"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value"],
  returnKind: "DListNode",
  hints: [
    "Find the tail; the new node goes between tail.prev and tail. What if tail.prev is null?",
    "Walk to the tail. Create node with prev = tail.prev and next = tail. If tail.prev is null, the node is the new head; otherwise tail.prev.next = node. Finally tail.prev = node.",
    "tail = head; while tail.next is not null: tail = tail.next\nnode = new ListNode(x, tail); node.prev = tail.prev\nif tail.prev is null: tail.prev = node; return node\ntail.prev.next = node\ntail.prev = node\nreturn head",
  ],
  reference: `function insertBeforeTail(head, x) { let t = head; while (t.next !== null) t = t.next; const n = new ListNode(x, t); n.prev = t.prev; if (t.prev === null) { t.prev = n; return n; } t.prev.next = n; t.prev = n; return head; }`,
  brute: `function insertBeforeTail(head, x) { ${H} const a = toA(head); a.splice(a.length - 1, 0, x); return fromD(a); }`,
  fuzz: LIST(1, 10, ", __r(rand, 0, 9)"),
  examples: [[[1, 2, 3, 4], 9], [[5, 6], 0]],
  edges: [
    ["single", [[7], 1], "One node: the new node becomes the head."],
    ["duplicates", [[3, 3, 3], 3]],
    ["two", [[1, 2], 5]],
  ],
});

const dllInsertBeforeKth = dll({
  slug: "insert-node-before-kth-node-in-dll",
  title: "Insert Before the K-th Node of a Doubly Linked List",
  url: tuf("insert-node-before-kth-node-in-dll"),
  statement: "Given the `head` of a non-empty doubly linked list, a position `k` (1-based, `1 <= k <= length`) and a value `x`, insert a new node holding `x` just before the `k`-th node and return the head.",
  constraints: ["1 <= k <= number of nodes <= 10^4"],
  fn: "insertBeforeKthElement",
  params: [["head", "ListNode"], ["k", "number"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value", "value"],
  returnKind: "DListNode",
  hints: [
    "Walk to the k-th node. The new node sits between it and its prev.",
    "node.next = kth, node.prev = kth.prev. If kth.prev is null the node is the new head; otherwise kth.prev.next = node. Then kth.prev = node.",
    "kth = head; repeat k - 1 times: kth = kth.next\nnode = new ListNode(x, kth); node.prev = kth.prev\nif kth.prev is null: kth.prev = node; return node\nkth.prev.next = node\nkth.prev = node\nreturn head",
  ],
  reference: `function insertBeforeKthElement(head, k, x) { let t = head; for (let i = 1; i < k; i++) t = t.next; const n = new ListNode(x, t); n.prev = t.prev; if (t.prev === null) { t.prev = n; return n; } t.prev.next = n; t.prev = n; return head; }`,
  brute: `function insertBeforeKthElement(head, k, x) { ${H} const a = toA(head); a.splice(k - 1, 0, x); return fromD(a); }`,
  fuzz: gen(`const n = __r(rand, 1, 10); return [__arr(rand, n, 0, 9), __r(rand, 1, n), __r(rand, 0, 9)];`),
  examples: [[[1, 2, 3, 4], 3, 9], [[5, 6, 7], 2, 0]],
  edges: [
    ["boundary", [[1, 2, 3], 1, 8], "k = 1 inserts a new head."],
    ["single", [[4], 1, 2]],
    ["two", [[1, 2], 2, 5]],
  ],
});

const dllInsertBeforeNode = dll({
  slug: "insert-before-given-node-in-dll",
  title: "Insert Before a Given Node in a Doubly Linked List",
  url: tuf("insert-before-given-node-in-dll"),
  statement: "Given the `head` of a doubly linked list with **distinct** values, a value `target` that is in the list and a value `x`, insert a new node holding `x` just before the node holding `target`. Return the head.",
  constraints: ["1 <= number of nodes <= 10^4", "values are distinct and target is present"],
  fn: "insertBeforeGivenNode",
  params: [["head", "ListNode"], ["target", "number"], ["x", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value", "value"],
  returnKind: "DListNode",
  hints: [
    "Once you hold the target node, its prev pointer tells you where the new node goes.",
    "Find the target node t. Create node with next = t and prev = t.prev; link t.prev.next (or make it the head if t.prev is null) and set t.prev = node.",
    "t = head; while t.val != target: t = t.next\nnode = new ListNode(x, t); node.prev = t.prev\nif t.prev is null: t.prev = node; return node\nt.prev.next = node\nt.prev = node\nreturn head",
  ],
  reference: `function insertBeforeGivenNode(head, target, x) { let t = head; while (t.val !== target) t = t.next; const n = new ListNode(x, t); n.prev = t.prev; if (t.prev === null) { t.prev = n; return n; } t.prev.next = n; t.prev = n; return head; }`,
  brute: `function insertBeforeGivenNode(head, target, x) { ${H} const a = toA(head); a.splice(a.indexOf(target), 0, x); return fromD(a); }`,
  fuzz: gen(`${DISTINCT}\nconst a = __distinct(rand, __r(rand, 1, 10), 0, 20); return [a, __pick(rand, a), __r(rand, 30, 40)];`),
  examples: [[[1, 2, 3, 4], 3, 9], [[10, 20], 20, 15]],
  edges: [
    ["boundary", [[5, 6, 7], 5, 1], "The target is the head."],
    ["single", [[4], 4, 3]],
    ["two", [[1, 2], 2, 9]],
  ],
});

const dllDeleteHead = dll({
  slug: "delete-head-of-dll",
  title: "Delete the Head of a Doubly Linked List",
  url: tuf("delete-head-of-dll"),
  statement: "Given the `head` of a non-empty doubly linked list, delete the head node and return the new head (or `null`). The new head's `prev` must be `null`.",
  constraints: ["1 <= number of nodes <= 10^4"],
  fn: "deleteHead",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: D1,
  returnKind: "DListNode",
  hints: [
    "The second node becomes the head. What still points back at the old head?",
    "Take next = head.next. If it exists, set next.prev = null. Detach head.next and return next.",
    "next = head.next\nif next is not null: next.prev = null\nhead.next = null\nreturn next",
  ],
  reference: `function deleteHead(head) { const n = head.next; if (n !== null) n.prev = null; head.next = null; return n; }`,
  brute: `function deleteHead(head) { ${H} return fromD(toA(head).slice(1)); }`,
  fuzz: LIST(1, 12),
  examples: [[[1, 2, 3]], [[4, 5]]],
  edges: [
    ["single", [[9]], "The list becomes empty."],
    ["two", [[1, 2]], "The remaining node's prev must be cleared."],
    ["duplicates", [[3, 3, 3]]],
  ],
});

const dllDeleteAll = dll({
  slug: "delete-all-occurrences-of-a-key-in-dll",
  title: "Delete All Occurrences of a Key in a Doubly Linked List",
  difficulty: "Medium",
  url: tuf("delete-all-occurrences-of-a-key-in-dll"),
  statement: "Given the `head` of a doubly linked list and a value `key`, delete every node holding `key` and return the head (or `null`). Keep every `prev` pointer correct.",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "deleteAllOccurrences",
  params: [["head", "ListNode"], ["key", "number"]],
  returns: "ListNode",
  argTypes: ["DListNode", "value"],
  returnKind: "DListNode",
  hints: [
    "Unlinking one node in a doubly linked list is O(1). Can you do it while walking, without losing your place?",
    "Walk with cur. When cur.val == key, save next = cur.next, link cur.prev and next to each other (moving head if cur was the head), then continue from next.",
    "cur = head\nwhile cur is not null:\n  next = cur.next\n  if cur.val == key:\n    if cur.prev is null: head = next else cur.prev.next = next\n    if next is not null: next.prev = cur.prev\n  cur = next\nreturn head",
  ],
  reference: `function deleteAllOccurrences(head, key) { let c = head; while (c !== null) { const nx = c.next; if (c.val === key) { if (c.prev === null) head = nx; else c.prev.next = nx; if (nx !== null) nx.prev = c.prev; } c = nx; } return head; }`,
  brute: `function deleteAllOccurrences(head, key) { ${H} return fromD(toA(head).filter((v) => v !== key)); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 12), 0, 3), __r(rand, 0, 3)];`),
  examples: [[[10, 4, 10, 3, 5, 20, 10], 10], [[1, 2, 3], 4]],
  edges: [
    ["all-equal", [[2, 2, 2], 2], "Everything goes: null."],
    ["boundary", [[1, 1, 2, 1], 1], "Deletions at the head and the tail."],
    ["empty", [[], 1]],
  ],
});

const dllRemoveDuplicates = dll({
  slug: "remove-duplicated-from-sorted-dll",
  title: "Remove Duplicates from a Sorted Doubly Linked List",
  difficulty: "Medium",
  url: tuf("remove-duplicated-from-sorted-dll"),
  statement: "Given the `head` of a doubly linked list sorted in non-decreasing order, remove duplicate values so each value appears once, and return the head. Keep every `prev` pointer correct.",
  constraints: ["0 <= number of nodes <= 10^4", "the list is sorted"],
  fn: "removeDuplicates",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: D1,
  returnKind: "DListNode",
  hints: [
    "In a sorted list, duplicates are adjacent. For each node, how far ahead is the next different value?",
    "From each node cur, skip forward past nodes with the same value to nxt; set cur.next = nxt and, if nxt exists, nxt.prev = cur. Move cur to nxt.",
    "cur = head\nwhile cur is not null:\n  nxt = cur.next\n  while nxt is not null and nxt.val == cur.val: nxt = nxt.next\n  cur.next = nxt\n  if nxt is not null: nxt.prev = cur\n  cur = nxt\nreturn head",
  ],
  reference: `function removeDuplicates(head) { let c = head; while (c !== null) { let n = c.next; while (n !== null && n.val === c.val) n = n.next; c.next = n; if (n !== null) n.prev = c; c = n; } return head; }`,
  brute: `function removeDuplicates(head) { ${H} return fromD([...new Set(toA(head))]); }`,
  fuzz: gen(`return [__sorted(rand, __r(rand, 0, 12), 0, 5)];`),
  examples: [[[1, 1, 1, 2, 3, 3, 4]], [[1, 2, 2, 3]]],
  edges: [
    ["all-equal", [[5, 5, 5]]],
    ["empty", [[]]],
    ["sorted", [[1, 2, 3]], "No duplicates: unchanged."],
  ],
});

const dllPairs = dll({
  slug: "find-pairs-with-given-sum-in-doubly-linked-list",
  title: "Pairs with a Given Sum in a Sorted Doubly Linked List",
  difficulty: "Medium",
  url: tuf("find-pairs-with-given-sum-in-doubly-linked-list"),
  statement: "Given the `head` of a sorted doubly linked list of **distinct** positive integers and a `target`, return every pair `[a, b]` with `a < b` and `a + b == target`, ordered by `a` ascending.",
  constraints: ["0 <= number of nodes <= 10^4", "values are distinct and sorted"],
  fn: "findPairsWithGivenSum",
  params: [["head", "ListNode"], ["target", "number"]],
  returns: "number[][]",
  argTypes: ["DListNode", "value"],
  hints: [
    "In a sorted array you'd use two pointers from both ends. The prev pointers let you walk backwards too.",
    "Put left at the head and right at the tail. If their sum is the target, record the pair and move both inwards; if it's too small move left forward, otherwise move right back. Stop when they meet or cross.",
    "left = head; right = tail\nwhile left is not right and right.next is not left:\n  s = left.val + right.val\n  if s == target: record [left.val, right.val]; left = left.next; right = right.prev\n  else if s < target: left = left.next\n  else: right = right.prev\nreturn pairs",
  ],
  reference: `function findPairsWithGivenSum(head, target) { const out = []; if (head === null) return out; let r = head; while (r.next !== null) r = r.next; let l = head; while (l !== r && r.next !== l) { const s = l.val + r.val; if (s === target) { out.push([l.val, r.val]); l = l.next; if (l === r) break; r = r.prev; } else if (s < target) l = l.next; else r = r.prev; } return out; }`,
  brute: `function findPairsWithGivenSum(head, target) { ${H} const a = toA(head), out = []; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === target) out.push([a[i], a[j]]); return out.sort((x, y) => x[0] - y[0]); }`,
  fuzz: gen(`${DISTINCT}\nreturn [__distinct(rand, __r(rand, 0, 10), 1, 20).sort(function (a, b) { return a - b; }), __r(rand, 3, 30)];`),
  examples: [[[1, 2, 4, 5, 6, 8, 9], 7], [[1, 5, 6], 6]],
  edges: [
    ["no-answer", [[1, 2, 3], 10]],
    ["empty", [[], 5]],
    ["two", [[2, 3], 5]],
  ],
});

export const A2Z_LISTS = [
  traversal, deleteTail, deleteKth, deleteValue, insertHead, insertTail, insertKth, insertBeforeValue, length, search,
  sort012, addOne, loopLength,
  arrayToDll, dllDeleteTail, dllDeleteKth, dllRemoveValue, dllInsertBeforeHead, dllInsertBeforeTail, dllInsertBeforeKth,
  dllInsertBeforeNode, dllDeleteHead, dllDeleteAll, dllRemoveDuplicates, dllPairs,
].map(define);
