/** Blind solutions for the seeded problems the Binary Trees Ladder judges (ladder-trees-seeded.ts, ladder-trees2-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "binary-tree-inorder-traversal": `function inorderTraversal(root) {
  var out = [], cur = root;
  while (cur) {
    if (!cur.left) { out.push(cur.val); cur = cur.right; continue; }
    var pre = cur.left;
    while (pre.right && pre.right !== cur) pre = pre.right;
    if (!pre.right) { pre.right = cur; cur = cur.left; }
    else { pre.right = null; out.push(cur.val); cur = cur.right; }
  }
  return out;
}`,
  "binary-tree-preorder-traversal": `function preorderTraversal(root) {
  var out = [], cur = root;
  while (cur) {
    if (!cur.left) { out.push(cur.val); cur = cur.right; continue; }
    var pre = cur.left;
    while (pre.right && pre.right !== cur) pre = pre.right;
    if (!pre.right) { out.push(cur.val); pre.right = cur; cur = cur.left; }
    else { pre.right = null; cur = cur.right; }
  }
  return out;
}`,
  "binary-tree-postorder-traversal": `function postorderTraversal(root) {
  var out = [], st = [], last = null, cur = root;
  while (cur || st.length) {
    if (cur) { st.push(cur); cur = cur.left; continue; }
    var top = st[st.length - 1];
    if (top.right && top.right !== last) cur = top.right;
    else { out.push(top.val); last = st.pop(); }
  }
  return out;
}`,
  "balanced-binary-tree": `function isBalanced(root) {
  var ok = true;
  function h(n) { if (!n || !ok) return 0; var l = h(n.left), r = h(n.right); if (l - r > 1 || r - l > 1) ok = false; return 1 + (l > r ? l : r); }
  h(root);
  return ok;
}`,
  "minimum-depth-of-binary-tree": `function minDepth(root) {
  if (!root) return 0;
  var best = Infinity;
  function go(n, d) { if (d >= best) return; if (!n.left && !n.right) { best = d; return; } if (n.left) go(n.left, d + 1); if (n.right) go(n.right, d + 1); }
  go(root, 1);
  return best;
}`,
  "subtree-of-another-tree": `function isSubtree(root, subRoot) {
  function eq(a, b) { if (!a && !b) return true; if (!a || !b || a.val !== b.val) return false; return eq(a.left, b.left) && eq(a.right, b.right); }
  var st = [root];
  while (st.length) { var n = st.pop(); if (!n) continue; if (eq(n, subRoot)) return true; st.push(n.left, n.right); }
  return false;
}`,
  "average-of-levels-in-binary-tree": `function averageOfLevels(root) {
  var q = [root], out = [];
  while (q.length) {
    var size = q.length, s = 0;
    for (var i = 0; i < size; i++) { var n = q.shift(); s += n.val; if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    out.push(s / size);
  }
  return out;
}`,
  "binary-tree-paths": `function binaryTreePaths(root) {
  var out = [];
  function go(n, parts) {
    parts.push(String(n.val));
    if (!n.left && !n.right) out.push(parts.join("->"));
    if (n.left) go(n.left, parts);
    if (n.right) go(n.right, parts);
    parts.pop();
  }
  go(root, []);
  return out;
}`,
  "sum-of-left-leaves": `function sumOfLeftLeaves(root) {
  var s = 0, st = [[root, false]];
  while (st.length) {
    var it = st.pop(), n = it[0];
    if (!n) continue;
    if (!n.left && !n.right && it[1]) s += n.val;
    st.push([n.left, true], [n.right, false]);
  }
  return s;
}`,
  "leaf-similar-trees": `function leafSimilar(root1, root2) {
  function leaves(r) { var out = []; (function go(n) { if (!n) return; if (!n.left && !n.right) out.push(n.val); go(n.left); go(n.right); })(r); return out; }
  var a = leaves(root1), b = leaves(root2);
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}`,
  "merge-two-binary-trees": `function mergeTrees(root1, root2) {
  if (!root1 || !root2) return root1 || root2;
  var st = [[root1, root2]];
  while (st.length) {
    var p = st.pop(), a = p[0], b = p[1];
    a.val += b.val;
    if (a.left && b.left) st.push([a.left, b.left]); else if (!a.left) a.left = b.left;
    if (a.right && b.right) st.push([a.right, b.right]); else if (!a.right) a.right = b.right;
  }
  return root1;
}`,
  "cousins-in-binary-tree": `function isCousins(root, x, y) {
  var q = [[root, null]];
  while (q.length) {
    var px = null, py = null, next = [];
    for (var i = 0; i < q.length; i++) {
      var n = q[i][0];
      if (n.val === x) px = q[i][1];
      if (n.val === y) py = q[i][1];
      if (n.left) next.push([n.left, n]);
      if (n.right) next.push([n.right, n]);
    }
    var fx = false, fy = false;
    for (i = 0; i < q.length; i++) { if (q[i][0].val === x) fx = true; if (q[i][0].val === y) fy = true; }
    if (fx || fy) return fx && fy && px !== py;
    q = next;
  }
  return false;
}`,
  "count-good-nodes-in-binary-tree": `function goodNodes(root) {
  var c = 0, st = [[root, -Infinity]];
  while (st.length) {
    var it = st.pop(), n = it[0], m = it[1];
    if (!n) continue;
    if (n.val >= m) { c++; m = n.val; }
    st.push([n.left, m], [n.right, m]);
  }
  return c;
}`,
  "construct-binary-tree-from-preorder-and-inorder-traversal": `function buildTree(preorder, inorder) {
  if (!preorder.length) return null;
  var root = new TreeNode(preorder[0]), st = [root], j = 0;
  for (var i = 1; i < preorder.length; i++) {
    var node = new TreeNode(preorder[i]), parent = st[st.length - 1];
    if (parent.val !== inorder[j]) { parent.left = node; }
    else {
      while (st.length && st[st.length - 1].val === inorder[j]) { parent = st.pop(); j++; }
      parent.right = node;
    }
    st.push(node);
  }
  return root;
}`,
  "construct-binary-tree-from-inorder-and-postorder-traversal": `function buildTree(inorder, postorder) {
  var n = postorder.length;
  if (!n) return null;
  var root = new TreeNode(postorder[n - 1]), st = [root], j = n - 1;
  for (var i = n - 2; i >= 0; i--) {
    var node = new TreeNode(postorder[i]), parent = st[st.length - 1];
    if (parent.val !== inorder[j]) { parent.right = node; }
    else {
      while (st.length && st[st.length - 1].val === inorder[j]) { parent = st.pop(); j--; }
      parent.left = node;
    }
    st.push(node);
  }
  return root;
}`,
  "lowest-common-ancestor-of-a-binary-tree": `function lowestCommonAncestor(root, p, q) {
  function path(n, t, acc) { if (!n) return false; acc.push(n); if (n === t || path(n.left, t, acc) || path(n.right, t, acc)) return true; acc.pop(); return false; }
  var a = [], b = [];
  path(root, p, a); path(root, q, b);
  var i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a[i - 1];
}`,
  "binary-tree-level-order-traversal-ii": `function levelOrderBottom(root) {
  var out = [], q = root ? [root] : [];
  while (q.length) {
    var vals = [], next = [];
    for (var i = 0; i < q.length; i++) { vals.push(q[i].val); if (q[i].left) next.push(q[i].left); if (q[i].right) next.push(q[i].right); }
    out.unshift(vals);
    q = next;
  }
  return out;
}`,
  "binary-tree-zigzag-level-order-traversal": `function zigzagLevelOrder(root) {
  var out = [], q = root ? [root] : [], ltr = true;
  while (q.length) {
    var vals = [];
    for (var i = 0; i < q.length; i++) { if (ltr) vals.push(q[i].val); else vals.unshift(q[i].val); }
    var next = [];
    for (i = 0; i < q.length; i++) { if (q[i].left) next.push(q[i].left); if (q[i].right) next.push(q[i].right); }
    out.push(vals);
    q = next;
    ltr = !ltr;
  }
  return out;
}`,
  "path-sum-ii": `function pathSum(root, targetSum) {
  var out = [], st = root ? [[root, [root.val], root.val]] : [];
  while (st.length) {
    var it = st.pop(), n = it[0];
    if (!n.left && !n.right && it[2] === targetSum) out.push(it[1]);
    if (n.right) st.push([n.right, it[1].concat([n.right.val]), it[2] + n.right.val]);
    if (n.left) st.push([n.left, it[1].concat([n.left.val]), it[2] + n.left.val]);
  }
  return out;
}`,
  "path-sum-iii": `function pathSum(root, targetSum) {
  var count = 0, path = [];
  function go(n) {
    if (!n) return;
    path.push(n.val);
    var s = 0;
    for (var i = path.length - 1; i >= 0; i--) { s += path[i]; if (s === targetSum) count++; }
    go(n.left); go(n.right);
    path.pop();
  }
  go(root);
  return count;
}`,
  "sum-root-to-leaf-numbers": `function sumNumbers(root) {
  var total = 0, q = [[root, root.val]];
  while (q.length) {
    var it = q.shift(), n = it[0];
    if (!n.left && !n.right) total += it[1];
    if (n.left) q.push([n.left, it[1] * 10 + n.left.val]);
    if (n.right) q.push([n.right, it[1] * 10 + n.right.val]);
  }
  return total;
}`,
  "flatten-binary-tree-to-linked-list": `function flatten(root) {
  var prev = null;
  function go(n) { if (!n) return; go(n.right); go(n.left); n.right = prev; n.left = null; prev = n; }
  go(root);
}`,
  "find-bottom-left-tree-value": `function findBottomLeftValue(root) {
  var q = [root], first = root.val;
  while (q.length) {
    first = q[0].val;
    var next = [];
    for (var i = 0; i < q.length; i++) { if (q[i].left) next.push(q[i].left); if (q[i].right) next.push(q[i].right); }
    q = next;
  }
  return first;
}`,
  "all-nodes-distance-k-in-binary-tree": `function distanceK(root, target, k) {
  var out = [];
  function down(n, d) { if (!n || d < 0) return; if (d === 0) { out.push(n.val); return; } down(n.left, d - 1); down(n.right, d - 1); }
  function go(n) {
    if (!n) return -1;
    if (n === target) { down(n, k); return 1; }
    var l = go(n.left);
    if (l >= 0) { if (l === k) out.push(n.val); else down(n.right, k - l - 1); return l + 1; }
    var r = go(n.right);
    if (r >= 0) { if (r === k) out.push(n.val); else down(n.left, k - r - 1); return r + 1; }
    return -1;
  }
  go(root);
  return out;
}`,
  "maximum-width-of-binary-tree": `function widthOfBinaryTree(root) {
  var firsts = [], best = 0;
  function go(n, d, i) {
    if (!n) return;
    if (firsts.length === d) firsts.push(i);
    var w = i - firsts[d] + 1;
    if (w > best) best = w;
    go(n.left, d + 1, (i - firsts[d]) * 2);
    go(n.right, d + 1, (i - firsts[d]) * 2 + 1);
  }
  go(root, 0, 0);
  return best;
}`,
  "count-complete-tree-nodes": `function countNodes(root) {
  if (!root) return 0;
  var h = 0;
  for (var n = root; n.left; n = n.left) h++;
  function exists(idx) {
    var node = root, lo = 0, hi = Math.pow(2, h) - 1;
    for (var i = 0; i < h; i++) { var mid = Math.floor((lo + hi) / 2); if (idx <= mid) { node = node.left; hi = mid; } else { node = node.right; lo = mid + 1; } }
    return node !== null;
  }
  var lo = 0, hi = Math.pow(2, h) - 1;
  while (lo < hi) { var mid = Math.ceil((lo + hi) / 2); if (exists(mid)) lo = mid; else hi = mid - 1; }
  return Math.pow(2, h) - 1 + lo + 1;
}`,
  "house-robber-iii": `function rob(root) {
  var memo = new Map();
  function best(n) {
    if (!n) return 0;
    if (memo.has(n)) return memo.get(n);
    var take = n.val;
    if (n.left) take += best(n.left.left) + best(n.left.right);
    if (n.right) take += best(n.right.left) + best(n.right.right);
    var r = Math.max(take, best(n.left) + best(n.right));
    memo.set(n, r);
    return r;
  }
  return best(root);
}`,
  "maximum-binary-tree": `function constructMaximumBinaryTree(nums) {
  function build(lo, hi) {
    if (lo > hi) return null;
    var m = lo;
    for (var i = lo + 1; i <= hi; i++) if (nums[i] > nums[m]) m = i;
    var node = new TreeNode(nums[m]);
    node.left = build(lo, m - 1);
    node.right = build(m + 1, hi);
    return node;
  }
  return build(0, nums.length - 1);
}`,
  "amount-of-time-for-binary-tree-to-be-infected": `function amountOfTime(root, start) {
  var best = 0;
  function depth(n) { return n ? 1 + Math.max(depth(n.left), depth(n.right)) : 0; }
  function go(n) {
    if (!n) return -1;
    if (n.val === start) { best = Math.max(best, depth(n) - 1); return 0; }
    var l = go(n.left);
    if (l >= 0) { best = Math.max(best, l + 1 + depth(n.right)); return l + 1; }
    var r = go(n.right);
    if (r >= 0) { best = Math.max(best, r + 1 + depth(n.left)); return r + 1; }
    return -1;
  }
  go(root);
  return best;
}`,
  "maximum-level-sum-of-a-binary-tree": `function maxLevelSum(root) {
  var q = [root], level = 0, best = -Infinity, ans = 0;
  while (q.length) {
    level++;
    var s = 0, size = q.length;
    for (var i = 0; i < size; i++) { var n = q.shift(); s += n.val; if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    if (s > best) { best = s; ans = level; }
  }
  return ans;
}`,
  "longest-zigzag-path-in-a-binary-tree": `function longestZigZag(root) {
  var best = 0;
  function go(n) {
    if (!n) return [-1, -1];
    var l = go(n.left), r = go(n.right);
    var goLeft = l[1] + 1, goRight = r[0] + 1;
    best = Math.max(best, goLeft, goRight);
    return [goLeft, goRight];
  }
  go(root);
  return best;
}`,
  "check-completeness-of-a-binary-tree": `function isCompleteTree(root) {
  var q = [root], i = 0;
  while (q[i]) { q.push(q[i].left, q[i].right); i++; }
  for (; i < q.length; i++) if (q[i]) return false;
  return true;
}`,
  "distribute-coins-in-binary-tree": `function distributeCoins(root) {
  var moves = 0, order = [], st = [root], par = new Map();
  par.set(root, null);
  while (st.length) { var n = st.pop(); order.push(n); if (n.left) { par.set(n.left, n); st.push(n.left); } if (n.right) { par.set(n.right, n); st.push(n.right); } }
  var extra = new Map();
  for (var i = order.length - 1; i >= 0; i--) {
    var node = order[i], e = node.val - 1;
    if (node.left) e += extra.get(node.left);
    if (node.right) e += extra.get(node.right);
    extra.set(node, e);
    if (par.get(node)) moves += Math.abs(e);
  }
  return moves;
}`,
  "smallest-string-starting-from-leaf": `function smallestFromLeaf(root) {
  var best = null, st = [[root, ""]];
  while (st.length) {
    var it = st.pop(), n = it[0], s = String.fromCharCode(97 + n.val) + it[1];
    if (!n.left && !n.right) { if (best === null || s < best) best = s; continue; }
    if (n.left) st.push([n.left, s]);
    if (n.right) st.push([n.right, s]);
  }
  return best;
}`,
  "pseudo-palindromic-paths-in-a-binary-tree": `function pseudoPalindromicPaths(root) {
  var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total = 0;
  function go(n) {
    if (!n) return;
    cnt[n.val]++;
    if (!n.left && !n.right) { var odd = 0; for (var d = 0; d < 10; d++) if (cnt[d] % 2) odd++; if (odd <= 1) total++; }
    go(n.left); go(n.right);
    cnt[n.val]--;
  }
  go(root);
  return total;
}`,
  "maximum-difference-between-node-and-ancestor": `function maxAncestorDiff(root) {
  var best = 0;
  function go(n) {
    if (!n) return null;
    var lo = n.val, hi = n.val, kids = [go(n.left), go(n.right)];
    for (var i = 0; i < 2; i++) if (kids[i]) {
      best = Math.max(best, Math.abs(n.val - kids[i][0]), Math.abs(n.val - kids[i][1]));
      lo = Math.min(lo, kids[i][0]); hi = Math.max(hi, kids[i][1]);
    }
    return [lo, hi];
  }
  go(root);
  return best;
}`,
  "binary-tree-maximum-path-sum": `function maxPathSum(root) {
  var down = new Map(), order = [], st = [root], best = -Infinity;
  while (st.length) { var n = st.pop(); order.push(n); if (n.left) st.push(n.left); if (n.right) st.push(n.right); }
  for (var i = order.length - 1; i >= 0; i--) {
    var node = order[i];
    var l = node.left ? Math.max(0, down.get(node.left)) : 0, r = node.right ? Math.max(0, down.get(node.right)) : 0;
    best = Math.max(best, node.val + l + r);
    down.set(node, node.val + Math.max(l, r));
  }
  return best;
}`,
  "serialize-and-deserialize-binary-tree": `function Codec() {}
Codec.prototype.serialize = function (root) {
  var out = [], q = [root];
  for (var i = 0; i < q.length; i++) { var n = q[i]; if (!n) { out.push("x"); continue; } out.push(String(n.val)); q.push(n.left, n.right); }
  return out.join(" ");
};
Codec.prototype.deserialize = function (data) {
  var t = data.split(" ");
  if (t[0] === "x") return null;
  var root = new TreeNode(Number(t[0])), q = [root], k = 1;
  for (var i = 0; i < q.length; i++) {
    var n = q[i];
    if (t[k] !== "x") { n.left = new TreeNode(Number(t[k])); q.push(n.left); } k++;
    if (t[k] !== "x") { n.right = new TreeNode(Number(t[k])); q.push(n.right); } k++;
  }
  return root;
};
function roundTrip(root) { return new Codec().deserialize(new Codec().serialize(root)); }`,
  "vertical-order-traversal-of-a-binary-tree": `function verticalTraversal(root) {
  var by = {}, minC = 0, maxC = 0;
  function go(n, r, c) {
    if (!n) return;
    (by[c] = by[c] || []).push([r, n.val]);
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
    go(n.left, r + 1, c - 1); go(n.right, r + 1, c + 1);
  }
  go(root, 0, 0);
  var out = [];
  for (var c = minC; c <= maxC; c++) {
    by[c].sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    out.push(by[c].map(function (p) { return p[1]; }));
  }
  return out;
}`,
  "binary-tree-cameras": `function minCameraCover(root) {
  function go(n) {
    if (!n) return [Infinity, 0, 0];
    var l = go(n.left), r = go(n.right);
    var withCam = 1 + Math.min(l[0], l[1], l[2]) + Math.min(r[0], r[1], r[2]);
    var covered = Math.min(l[0] + Math.min(r[0], r[1]), r[0] + Math.min(l[0], l[1]));
    var notCovered = l[1] + r[1];
    return [withCam, covered, notCovered];
  }
  var s = go(root);
  return Math.min(s[0], s[1]);
}`,
};
