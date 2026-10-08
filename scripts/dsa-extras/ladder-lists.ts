import { define, type ProblemDef } from "./define";
import { gen } from "./gen";

const H = `const toA = (h) => { const a = []; for (let n = h; n; n = n.next) a.push(n.val); return a; }; const fromA = (a) => { let h = null; for (let i = a.length - 1; i >= 0; i--) h = new ListNode(a[i], h); return h; }; const fromD = (a) => { const h = fromA(a); let p = null; for (let n = h; n; n = n.next) { n.prev = p; p = n; } return h; };`;

const reverseDll: ProblemDef = {
  slug: "reverse-a-doubly-linked-list",
  title: "Reverse a Doubly Linked List",
  difficulty: "Easy",
  pattern: "Doubly Linked List",
  url: "https://takeuforward.org/data-structure/reverse-a-doubly-linked-list",
  statement: "Given the `head` of a doubly linked list, reverse it and return the new head. Every node must end up with correct `next` and `prev` pointers (`prev` is `null` on the new head).",
  constraints: ["0 <= number of nodes <= 10^4"],
  fn: "reverseDLL",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: ["DListNode"],
  returnKind: "DListNode",
  hints: [
    "In a doubly linked list every node already knows its neighbour on both sides. What changes for one node when the list is reversed?",
    "Walk the list and swap each node's next and prev. The last node you touch becomes the new head.",
    "cur = head, newHead = null\nwhile cur is not null:\n  swap cur.next and cur.prev\n  newHead = cur\n  cur = cur.prev\nreturn newHead",
  ],
  reference: `function reverseDLL(head) { let cur = head, last = null; while (cur !== null) { const t = cur.next; cur.next = cur.prev; cur.prev = t; last = cur; cur = t; } return last; }`,
  brute: `function reverseDLL(head) { ${H} return fromD(toA(head).reverse()); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 0, 12), 0, 9)];`),
  examples: [[[1, 2, 3, 4]], [[5, 6]]],
  edges: [
    ["single", [[7]], "One node: its prev and next both stay null."],
    ["empty", [[]]],
    ["duplicates", [[2, 2, 1]]],
  ],
};

const loopStart: ProblemDef = {
  slug: "starting-point-of-loop-in-ll",
  title: "Find the Starting Point of a Loop in a Linked List",
  difficulty: "Medium",
  pattern: "Fast & Slow Pointers",
  url: "https://takeuforward.org/data-structure/starting-point-of-loop-in-a-linked-list",
  statement: [
    "Given the `head` of a linked list that may contain a loop, return the **0-based position** of the node where the loop begins, or `-1` if there is no loop.",
    "",
    "In the examples the list is shown as `{ list, pos }`: `pos` is the index the tail links back to, and `-1` means no loop. Your function only receives `head`.",
  ].join("\n"),
  constraints: ["0 <= number of nodes <= 10^4", "Use O(1) extra memory for the follow-up"],
  fn: "loopStart",
  params: [["head", "ListNode"]],
  returns: "number",
  argTypes: ["cycleList"],
  hints: [
    "A set of visited nodes finds the first repeated node in O(n) memory. Can fast and slow pointers find it in O(1)?",
    "After slow and fast meet inside the loop, move one pointer back to head and advance both one step at a time: they meet at the loop's start. Count the steps from head.",
    "slow = fast = head\nwhile fast and fast.next:\n  slow = slow.next; fast = fast.next.next\n  if slow is fast:\n    p = head, i = 0\n    while p is not slow: p = p.next; slow = slow.next; i += 1\n    return i\nreturn -1",
  ],
  reference: `function loopStart(head) { let s = head, f = head; while (f !== null && f.next !== null) { s = s.next; f = f.next.next; if (s === f) { let p = head, i = 0; while (p !== s) { p = p.next; s = s.next; i++; } return i; } } return -1; }`,
  brute: `function loopStart(head) { const seen = new Map(); let i = 0; for (let n = head; n !== null; n = n.next, i++) { if (seen.has(n)) return seen.get(n); seen.set(n, i); } return -1; }`,
  fuzz: gen(`const n = __r(rand, 0, 10); return [{ list: __arr(rand, n, 0, 9), pos: n ? __r(rand, -1, n - 1) : -1 }];`),
  examples: [[{ list: [3, 2, 0, -4], pos: 1 }], [{ list: [1, 2], pos: -1 }]],
  edges: [
    ["cycle", [{ list: [7], pos: 0 }], "A single node pointing at itself: the loop starts at 0."],
    ["empty", [{ list: [], pos: -1 }]],
    ["boundary", [{ list: [1, 2, 3, 4], pos: 3 }], "The tail points at itself."],
  ],
};

const deleteHead: ProblemDef = {
  slug: "deletion-of-the-head-of-ll",
  title: "Delete the Head of a Linked List",
  difficulty: "Easy",
  pattern: "Linked List",
  url: "https://takeuforward.org/practice/dsa/deletion-of-the-head-of-ll",
  statement: "Given the `head` of a non-empty singly linked list, delete the first node and return the new head (`null` if the list becomes empty).",
  constraints: ["1 <= number of nodes <= 10^4"],
  fn: "deleteHead",
  params: [["head", "ListNode"]],
  returns: "ListNode",
  argTypes: ["ListNode"],
  returnKind: "ListNode",
  hints: [
    "Which node becomes the first one once the head is gone?",
    "Return head.next. Detaching the old head (head.next = null) is tidy but not required.",
    "newHead = head.next\nhead.next = null\nreturn newHead",
  ],
  reference: `function deleteHead(head) { const n = head.next; head.next = null; return n; }`,
  brute: `function deleteHead(head) { ${H} return fromA(toA(head).slice(1)); }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 12), 0, 9)];`),
  examples: [[[1, 2, 3]], [[4, 5]]],
  edges: [
    ["single", [[9]], "The list becomes empty."],
    ["two", [[1, 2]]],
    ["duplicates", [[3, 3, 3]]],
  ],
};

export const LADDER_LISTS = [reverseDll, loopStart, deleteHead].map(define);
