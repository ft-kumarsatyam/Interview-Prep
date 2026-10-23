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

/** Stable text of a value for hashing: sorted keys, numbers kept distinct (-0, NaN, Infinity), nothing lossy like JSON. */
function __stable(v) {
  if (v === null) return "null";
  if (typeof v === "number") return Object.is(v, -0) ? "-0" : String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "bigint") return v + "n";
  if (Array.isArray(v)) return "[" + v.map(__stable).join(",") + "]";
  if (typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + __stable(v[k])).join(",") + "}";
  return String(v);
}

/** The text a hidden case is judged by: the answer in its compare mode's canonical order, then stable text. */
function __sealText(v, compare) {
  if (compare === "unordered") return __stable(__canonical(v));
  if (compare === "unordered-outer") return __stable(__outerSorted(v));
  return __stable(v);
}

/** Only comparisons that are plain equality after reordering can be hashed; validity checks need the real answer. */
function __sealable(compare) {
  return !compare || compare === "exact" || compare === "unordered" || compare === "unordered-outer";
}

/** SHA-256 of a string as hex, in plain JS so it also works where crypto.subtle is unavailable (non-secure pages). */
function __sha256(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  const primes = [];
  for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
  const frac = (x) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
  const K = primes.map((p) => frac(Math.cbrt(p)));
  const H = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const w = new Array(64);
  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = ((bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3]) >>> 0;
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** Judge one case: a hidden case that shipped sealed carries only the hash of its expected answer. */
function __judgeCase(actual, c, compare) {
  if (c.expectedHash) return __sha256(__sealText(actual, compare)) === c.expectedHash;
  return __matches(actual, c.expected, compare);
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
