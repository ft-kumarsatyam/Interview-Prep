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

function __matches(actual, expected, compare) {
  return compare === "unordered" ? __deepEqual(__canonical(actual), __canonical(expected)) : __deepEqual(actual, expected);
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
    case "TreeNode": return __treeFromLevelOrder(value);
    case "cycleList": return __cycleListFromSpec(value);
    default: return value;
  }
}

function __encodeValue(type, value) {
  switch (type) {
    case "ListNode": return __listToArray(value);
    case "TreeNode": return __treeToLevelOrder(value);
    default: return value;
  }
}

/** returns: "value" | "ListNode" | "TreeNode" | "arg0" (the function mutates its first argument in place). */
function __encodeResult(returns, out, args, argTypes) {
  if (returns === "arg0") return __encodeValue((argTypes && argTypes[0]) || "value", args[0]);
  return __encodeValue(returns || "value", out);
}
`;
