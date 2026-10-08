/**
 * Plain-JS helpers that run INSIDE the sandbox Worker: structural equality plus LeetCode's ListNode/TreeNode
 * and their array encodings. It is one source string, the single source of truth: the Worker embeds it
 * verbatim, and Node-side code (tests, the test-case generator) evaluates this same string
 * (lib/sandbox/worker-lib-node.ts), so the two can never drift and nothing depends on how a bundler
 * rewrites functions. No backticks or template placeholders in here: it lives in a template literal.
 *
 * Encodings match LeetCode's: a list is [1,2,3]; a tree is level order with nulls, [1,2,3,null,null,4,5],
 * trailing nulls trimmed. A cyclic list is { list: [3,2,0,-4], pos: 1 } (pos = index the tail links back to).
 */
export const WORKER_LIB_SOURCE = String.raw`
function __deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => __deepEqual(x, b[i]));
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => Object.prototype.hasOwnProperty.call(b, k) && __deepEqual(a[k], b[k]));
}

/** Arrays sorted recursively (by JSON text), so two answers that differ only in order compare equal. */
function __canonical(v) {
  if (Array.isArray(v)) return v.map(__canonical).sort((a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; });
  if (v !== null && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = __canonical(v[k]); return o; }
  return v;
}

/** Only the outer array is reordered; each element keeps its own order (permutations, N-Queens boards). */
function __outerSorted(v) {
  if (!Array.isArray(v)) return v;
  return v.slice().sort((a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; });
}

/** Same items as expected (any order) with no run of equal neighbours longer than maxRun. */
function __rearranged(actual, expected, maxRun) {
  if (typeof actual !== typeof expected || Array.isArray(actual) !== Array.isArray(expected) || typeof actual === "object" && !Array.isArray(actual)) return false;
  const a = Array.from(actual), e = Array.from(expected);
  if (!__deepEqual(__canonical(a), __canonical(e))) return false;
  let run = 0;
  for (let i = 0; i < a.length; i++) { run = i > 0 && __deepEqual(a[i], a[i - 1]) ? run + 1 : 1; if (run > maxRun) return false; }
  return true;
}

/** Inorder values of a level-order tree, and whether it is height-balanced. */
function __inorderOf(level) {
  const out = [];
  const go = (n) => { if (!n) return; go(n.left); out.push(n.val); go(n.right); };
  go(__treeFromLevelOrder(level));
  return out;
}

function __isBalanced(level) {
  let ok = true;
  const h = (n) => { if (!n) return 0; const l = h(n.left), r = h(n.right); if (Math.abs(l - r) > 1) ok = false; return 1 + Math.max(l, r); };
  h(__treeFromLevelOrder(level));
  return ok;
}

function __sameInorder(actual, expected, balanced) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  try {
    return __deepEqual(__inorderOf(actual), __inorderOf(expected)) && (!balanced || __isBalanced(actual));
  } catch (e) {
    return false;
  }
}

function __matches(actual, expected, compare) {
  if (compare === "unordered") return __deepEqual(__canonical(actual), __canonical(expected));
  if (compare === "unordered-outer") return __deepEqual(__outerSorted(actual), __outerSorted(expected));
  if (compare === "no-adjacent-repeat") return __rearranged(actual, expected, 1);
  if (compare === "no-triple-repeat") return __rearranged(actual, expected, 2);
  if (compare === "same-inorder") return __sameInorder(actual, expected, false);
  if (compare === "balanced-same-inorder") return __sameInorder(actual, expected, true);
  return __deepEqual(actual, expected);
}

class ListNode {
  constructor(val, next) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

class TreeNode {
  constructor(val, left, right) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

const __MAX_NODES = 10000;

function __listFromArray(arr) {
  if (!Array.isArray(arr)) throw new Error("A list input must be an array");
  if (arr.length > __MAX_NODES) throw new Error("List input is too long");
  let head = null;
  for (let i = arr.length - 1; i >= 0; i--) head = new ListNode(arr[i], head);
  return head;
}

function __listToArray(head) {
  const out = [];
  const seen = new Set();
  for (let n = head; n !== null && n !== undefined; n = n.next) {
    if (seen.has(n)) throw new Error("The returned list has a cycle");
    seen.add(n);
    if (out.length >= __MAX_NODES) throw new Error("The returned list is too long (or never ends)");
    out.push(n.val);
  }
  return out;
}

/** A doubly linked list: ListNode objects that also carry prev (null on the head). */
function __dlistFromArray(arr) {
  const head = __listFromArray(arr);
  let prev = null;
  for (let n = head; n !== null; n = n.next) { n.prev = prev; prev = n; }
  return head;
}

function __dlistToArray(head) {
  const out = [];
  const seen = new Set();
  let prev = null;
  for (let n = head; n !== null && n !== undefined; n = n.next) {
    if (seen.has(n)) throw new Error("The returned list has a cycle");
    seen.add(n);
    if (out.length >= __MAX_NODES) throw new Error("The returned list is too long (or never ends)");
    const back = n.prev === undefined ? null : n.prev;
    if (back !== prev) throw new Error(prev === null ? "The head's prev pointer must be null" : "The prev pointer of the node holding " + n.val + " is wrong");
    out.push(n.val);
    prev = n;
  }
  return out;
}

function __cycleListFromSpec(spec) {
  if (spec === null || typeof spec !== "object" || !Array.isArray(spec.list)) throw new Error("A cycle input must be { list, pos }");
  const head = __listFromArray(spec.list);
  if (head === null || spec.pos === undefined || spec.pos < 0) return head;
  let tail = head, target = head;
  for (let i = 0; tail.next !== null; i++) tail = tail.next;
  for (let i = 0; i < spec.pos && target !== null; i++) target = target.next;
  tail.next = target;
  return head;
}

function __treeFromLevelOrder(arr) {
  if (!Array.isArray(arr)) throw new Error("A tree input must be an array");
  if (arr.length > __MAX_NODES) throw new Error("Tree input is too large");
  if (arr.length === 0 || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < arr.length; q++) {
    const node = queue[q];
    if (i < arr.length && arr[i] !== null) { node.left = new TreeNode(arr[i]); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { node.right = new TreeNode(arr[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function __treeToLevelOrder(root) {
  if (root === null || root === undefined) return [];
  const out = [];
  const seen = new Set();
  const queue = [root];
  for (let q = 0; q < queue.length; q++) {
    const node = queue[q];
    if (node === null) { out.push(null); continue; }
    if (seen.has(node)) throw new Error("The returned tree has a cycle");
    seen.add(node);
    if (seen.size > __MAX_NODES) throw new Error("The returned tree is too large (or never ends)");
    out.push(node.val);
    queue.push(node.left === undefined ? null : node.left, node.right === undefined ? null : node.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

function __buildArg(type, value) {
  switch (type) {
    case "ListNode": return __listFromArray(value);
    case "DListNode": return __dlistFromArray(value);
    case "TreeNode": return __treeFromLevelOrder(value);
    case "cycleList": return __cycleListFromSpec(value);
    case "ListNode[]": return value.map(__listFromArray);
    default: return value;
  }
}

function __findNode(root, val) {
  if (val === null) return null;
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.val === val) return n;
    stack.push(n.left, n.right);
  }
  throw new Error("No node with value " + val + " in the tree");
}

/** Builds every argument; a "TreeNodeRef" becomes the node with that value inside the first TreeNode argument. */
function __buildArgs(types, input) {
  const args = input.map((v, i) => (types[i] === "TreeNodeRef" ? v : __buildArg(types[i] || "value", v)));
  const root = args[types.indexOf("TreeNode")];
  return args.map((a, i) => (types[i] === "TreeNodeRef" ? __findNode(root, a) : a));
}

function __encodeValue(type, value) {
  switch (type) {
    case "ListNode": return __listToArray(value);
    case "DListNode": return __dlistToArray(value);
    case "TreeNode": return __treeToLevelOrder(value);
    case "ListNode[]": if (!Array.isArray(value)) throw new Error("Return an array of lists"); return value.map(__listToArray);
    case "TreeNodeVal": return value === null || value === undefined ? null : value.val;
    case "TreeNode[]": if (!Array.isArray(value)) throw new Error("Return an array of trees"); return value.map(__treeToLevelOrder);
    default: return value;
  }
}

/**
 * returns: "value" | "ListNode" | "DListNode" | "TreeNode" | "TreeNodeVal" | "ListNode[]" | "TreeNode[]" | "arg0" (the function mutates its first argument in place)
 * | "arg0Prefix" (it returns a length k and the answer is the first k slots of its first argument: [k, prefix]).
 */
function __encodeResult(returns, out, args, argTypes) {
  if (returns === "arg0") return __encodeValue((argTypes && argTypes[0]) || "value", args[0]);
  if (returns === "arg0Prefix") {
    if (typeof out !== "number" || out < 0 || out > args[0].length || Math.floor(out) !== out) throw new Error("Return the number of elements kept (an integer from 0 to nums.length)");
    return [out, args[0].slice(0, out)];
  }
  return __encodeValue(returns || "value", out);
}
`;
