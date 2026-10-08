/** Blind solutions for the BST Ladder judges (ladder-bst-seeded.ts and the LeetCode extras in ladder-bst.ts). */
import { driver } from "./set11";

export const SOLUTIONS: Record<string, string> = {
  "search-in-a-binary-search-tree": `function searchBST(root, val) {
  if (!root || root.val === val) return root;
  return searchBST(val < root.val ? root.left : root.right, val);
}`,
  "convert-sorted-array-to-binary-search-tree": `function sortedArrayToBST(nums) {
  function build(lo, hi) {
    if (lo > hi) return null;
    var m = Math.floor((lo + hi + 1) / 2);
    var n = new TreeNode(nums[m]);
    n.left = build(lo, m - 1);
    n.right = build(m + 1, hi);
    return n;
  }
  return build(0, nums.length - 1);
}`,
  "minimum-absolute-difference-in-bst": `function getMinimumDifference(root) {
  var st = [], cur = root, prev = null, best = Infinity;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    if (prev !== null && cur.val - prev < best) best = cur.val - prev;
    prev = cur.val;
    cur = cur.right;
  }
  return best;
}`,
  "minimum-distance-between-bst-nodes": `function minDiffInBST(root) {
  var vals = [];
  function go(n) { if (!n) return; go(n.left); vals.push(n.val); go(n.right); }
  go(root);
  var best = Infinity;
  for (var i = 1; i < vals.length; i++) best = Math.min(best, vals[i] - vals[i - 1]);
  return best;
}`,
  "two-sum-iv-input-is-a-bst": `function findTarget(root, k) {
  var v = [];
  function go(n) { if (!n) return; go(n.left); v.push(n.val); go(n.right); }
  go(root);
  var i = 0, j = v.length - 1;
  while (i < j) {
    var s = v[i] + v[j];
    if (s === k) return true;
    if (s < k) i++; else j--;
  }
  return false;
}`,
  "lowest-common-ancestor-of-a-binary-search-tree": `function lowestCommonAncestor(root, p, q) {
  var lo = Math.min(p.val, q.val), hi = Math.max(p.val, q.val);
  if (hi < root.val) return lowestCommonAncestor(root.left, p, q);
  if (lo > root.val) return lowestCommonAncestor(root.right, p, q);
  return root;
}`,
  "insert-into-a-binary-search-tree": `function insertIntoBST(root, val) {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left = insertIntoBST(root.left, val);
  else root.right = insertIntoBST(root.right, val);
  return root;
}`,
  "delete-node-in-a-bst": `function deleteNode(root, key) {
  if (!root) return null;
  if (key < root.val) { root.left = deleteNode(root.left, key); return root; }
  if (key > root.val) { root.right = deleteNode(root.right, key); return root; }
  if (!root.left) return root.right;
  if (!root.right) return root.left;
  var p = root.left;
  while (p.right) p = p.right;
  p.right = root.right;
  return root.left;
}`,
  "binary-search-tree-iterator": `function BSTIterator(root) {
  this.vals = [];
  var self = this;
  (function go(n) { if (!n) return; go(n.left); self.vals.push(n.val); go(n.right); })(root);
  this.i = 0;
}
BSTIterator.prototype.next = function () { return this.vals[this.i++]; };
BSTIterator.prototype.hasNext = function () { return this.i < this.vals.length; };
function runOps(ops) {
  var it = new BSTIterator(__treeFromLevelOrder(ops[0][1]));
  var out = [null];
  for (var i = 1; i < ops.length; i++) out.push(it[ops[i][0]]());
  return out;
}`,
  "recover-binary-search-tree": `function recoverTree(root) {
  var nodes = [];
  function go(n) { if (!n) return; go(n.left); nodes.push(n); go(n.right); }
  go(root);
  var a = -1, b = -1;
  for (var i = 0; i + 1 < nodes.length; i++) {
    if (nodes[i].val > nodes[i + 1].val) {
      if (a < 0) a = i;
      b = i + 1;
    }
  }
  var t = nodes[a].val; nodes[a].val = nodes[b].val; nodes[b].val = t;
}`,
  "unique-binary-search-trees": `function numTrees(n) {
  var c = 1;
  for (var i = 0; i < n; i++) c = c * 2 * (2 * i + 1) / (i + 2);
  return Math.round(c);
}`,
  "unique-binary-search-trees-ii": `function generateTrees(n) {
  var memo = {};
  function build(lo, hi) {
    var key = lo + "," + hi;
    if (memo[key]) return memo[key];
    var out = [];
    if (lo > hi) out.push(null);
    for (var r = lo; r <= hi; r++) {
      var L = build(lo, r - 1), R = build(r + 1, hi);
      for (var i = 0; i < L.length; i++) for (var j = 0; j < R.length; j++) out.push(new TreeNode(r, L[i], R[j]));
    }
    memo[key] = out;
    return out;
  }
  return build(1, n);
}`,
  "trim-a-binary-search-tree": `function trimBST(root, low, high) {
  while (root && (root.val < low || root.val > high)) root = root.val < low ? root.right : root.left;
  if (!root) return null;
  var n = root;
  while (n) { while (n.left && n.left.val < low) n.left = n.left.right; n = n.left; }
  n = root;
  while (n) { while (n.right && n.right.val > high) n.right = n.right.left; n = n.right; }
  return root;
}`,
  "construct-binary-search-tree-from-preorder-traversal": `function bstFromPreorder(preorder) {
  if (!preorder.length) return null;
  var root = new TreeNode(preorder[0]), st = [root];
  for (var i = 1; i < preorder.length; i++) {
    var node = new TreeNode(preorder[i]), parent = st[st.length - 1];
    while (st.length && st[st.length - 1].val < node.val) parent = st.pop();
    if (parent.val < node.val) parent.right = node; else parent.left = node;
    st.push(node);
  }
  return root;
}`,
  "convert-bst-to-greater-tree": `function convertBST(root) {
  var st = [], cur = root, sum = 0;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.right; }
    cur = st.pop();
    sum += cur.val;
    cur.val = sum;
    cur = cur.left;
  }
  return root;
}`,
  "my-calendar-i": `function MyCalendar() { this.root = null; }
MyCalendar.prototype.book = function (s, e) {
  if (!this.root) { this.root = { s: s, e: e, l: null, r: null }; return true; }
  var n = this.root;
  for (;;) {
    if (e <= n.s) { if (!n.l) { n.l = { s: s, e: e, l: null, r: null }; return true; } n = n.l; }
    else if (s >= n.e) { if (!n.r) { n.r = { s: s, e: e, l: null, r: null }; return true; } n = n.r; }
    else return false;
  }
};${driver("MyCalendar")}`,
  "maximum-sum-bst-in-binary-tree": `function maxSumBST(root) {
  var best = 0;
  function go(n) {
    if (!n) return { ok: true, lo: Infinity, hi: -Infinity, sum: 0 };
    var L = go(n.left), R = go(n.right);
    if (!L.ok || !R.ok || L.hi >= n.val || R.lo <= n.val) return { ok: false, lo: 0, hi: 0, sum: 0 };
    var s = L.sum + R.sum + n.val;
    if (s > best) best = s;
    return { ok: true, lo: Math.min(L.lo, n.val), hi: Math.max(R.hi, n.val), sum: s };
  }
  go(root);
  return best;
}`,
  "count-of-smaller-numbers-after-self": `function countSmaller(nums) {
  var n = nums.length, ans = [], idx = [];
  for (var i = 0; i < n; i++) { ans.push(0); idx.push(i); }
  function sort(lo, hi) {
    if (hi - lo < 1) return;
    var mid = (lo + hi) >> 1;
    sort(lo, mid); sort(mid + 1, hi);
    var tmp = [], i = lo, j = mid + 1, moved = 0;
    while (i <= mid || j <= hi) {
      if (j > hi || (i <= mid && nums[idx[i]] <= nums[idx[j]])) { ans[idx[i]] += moved; tmp.push(idx[i++]); }
      else { moved++; tmp.push(idx[j++]); }
    }
    for (var k = 0; k < tmp.length; k++) idx[lo + k] = tmp[k];
  }
  sort(0, n - 1);
  return ans;
}`,
  "range-sum-of-bst": `function rangeSumBST(root, low, high) {
  var st = root ? [root] : [], s = 0;
  while (st.length) {
    var n = st.pop();
    if (n.val >= low && n.val <= high) s += n.val;
    if (n.left && n.val > low) st.push(n.left);
    if (n.right && n.val < high) st.push(n.right);
  }
  return s;
}`,
  "increasing-order-search-tree": `function increasingBST(root) {
  function go(n, tail) {
    if (!n) return tail;
    var res = go(n.left, n);
    n.left = null;
    n.right = go(n.right, tail);
    return res;
  }
  return go(root, null);
}`,
  "find-mode-in-binary-search-tree": `function findMode(root) {
  var c = {}, st = root ? [root] : [];
  while (st.length) {
    var n = st.pop();
    c[n.val] = (c[n.val] || 0) + 1;
    if (n.left) st.push(n.left);
    if (n.right) st.push(n.right);
  }
  var best = 0, out = [];
  for (var k in c) best = Math.max(best, c[k]);
  for (var k2 in c) if (c[k2] === best) out.push(Number(k2));
  return out;
}`,
  "all-elements-in-two-binary-search-trees": `function getAllElements(root1, root2) {
  var a = [], b = [], out = [];
  function stackLeft(st, n) { while (n) { st.push(n); n = n.left; } }
  stackLeft(a, root1); stackLeft(b, root2);
  while (a.length || b.length) {
    var useA = !b.length || (a.length && a[a.length - 1].val <= b[b.length - 1].val);
    var st = useA ? a : b, n = st.pop();
    out.push(n.val);
    stackLeft(st, n.right);
  }
  return out;
}`,
  "balance-a-binary-search-tree": `function balanceBST(root) {
  var v = [];
  function go(n) { if (!n) return; go(n.left); v.push(n); go(n.right); }
  go(root);
  function build(lo, hi) {
    if (lo > hi) return null;
    var m = Math.floor((lo + hi + 1) / 2), n = v[m];
    n.left = build(lo, m - 1);
    n.right = build(m + 1, hi);
    return n;
  }
  return build(0, v.length - 1);
}`,
  "contains-duplicate-iii": `function containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff) {
  var win = [];
  function lower(x) { var lo = 0, hi = win.length; while (lo < hi) { var m = (lo + hi) >> 1; if (win[m] < x) lo = m + 1; else hi = m; } return lo; }
  for (var i = 0; i < nums.length; i++) {
    var p = lower(nums[i] - valueDiff);
    if (p < win.length && win[p] <= nums[i] + valueDiff) return true;
    win.splice(lower(nums[i]), 0, nums[i]);
    if (i >= indexDiff) win.splice(lower(nums[i - indexDiff]), 1);
  }
  return false;
}`,
  "number-of-ways-to-reorder-array-to-get-same-bst": `function numOfWays(nums) {
  var M = 1000000007;
  function mul(a, b) { return Number((BigInt(a) * BigInt(b)) % BigInt(M)); }
  var n = nums.length, C = [];
  for (var i = 0; i <= n; i++) { C.push([1]); for (var j = 1; j <= i; j++) C[i][j] = ((C[i - 1][j - 1] || 0) + (C[i - 1][j] || 0)) % M; }
  function ways(a) {
    if (a.length <= 2) return 1;
    var L = [], R = [];
    for (var k = 1; k < a.length; k++) (a[k] < a[0] ? L : R).push(a[k]);
    return mul(mul(C[a.length - 1][L.length], ways(L)), ways(R));
  }
  return (ways(nums) - 1 + M) % M;
}`,
};
