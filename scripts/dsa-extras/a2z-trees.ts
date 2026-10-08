import { define, tuf, type ProblemDef } from "./define";
import { gen, treeGen } from "./gen";

/** Level-order tree with distinct values 1..n (problems that look nodes up by value). */
export const UNIQUE = `function __uniq(rand, n) { var t = __levelTree(rand, n, 0, 0); var pool = __shuffle(rand, Array.from({ length: n }, function (_, i) { return i + 1; })); var k = 0; return t.map(function (v) { return v === null ? null : pool[k++]; }); }`;
const ANY_TREE = treeGen(`return [__levelTree(rand, __r(rand, 0, 12), 1, 9)];`);
const BST = treeGen(`return [__bstLevel(rand, __r(rand, 1, 12), 1, 30)];`);
const BST_KEY = treeGen(`return [__bstLevel(rand, __r(rand, 1, 12), 1, 30), __r(rand, 0, 32)];`);

const tree = (d: Omit<ProblemDef, "argTypes"> & { extraArgs?: number }): ProblemDef => {
  const { extraArgs = 0, ...rest } = d;
  return { ...rest, argTypes: ["TreeNode", ...Array.from({ length: extraArgs }, () => "value" as const)] };
};

const allTraversals = tree({
  slug: "preorder-inorder-postorder-in-one-traversal",
  title: "Preorder, Inorder and Postorder in One Traversal",
  difficulty: "Medium",
  pattern: "Trees: DFS",
  url: tuf("pre,-post,-inorder-in-one-traversal"),
  statement: "Given the `root` of a binary tree, return `[inorder, preorder, postorder]`: its three depth-first traversals, computed in **one** pass with a single stack.",
  constraints: ["0 <= number of nodes <= 10^5"],
  fn: "treeTraversal",
  params: [["root", "TreeNode | null"]],
  returns: "number[][]",
  hints: [
    "Each node is visited three times in a DFS: on the way down, between its children, and on the way up. Which traversal records which visit?",
    "Push (node, 1). When you pop a pair: state 1 records preorder and goes left, state 2 records inorder and goes right, state 3 records postorder. Re-push the node with the next state before pushing a child.",
    "stack = [(root, 1)]\nwhile stack not empty:\n  (node, s) = pop\n  if s == 1: pre.add(node); push (node, 2); if node.left: push (node.left, 1)\n  else if s == 2: in.add(node); push (node, 3); if node.right: push (node.right, 1)\n  else: post.add(node)\nreturn [in, pre, post]",
  ],
  reference: `function treeTraversal(root) { const pre = [], ino = [], post = []; if (!root) return [ino, pre, post]; const st = [[root, 1]]; while (st.length) { const top = st.pop(); const [n, s] = top; if (s === 1) { pre.push(n.val); st.push([n, 2]); if (n.left) st.push([n.left, 1]); } else if (s === 2) { ino.push(n.val); st.push([n, 3]); if (n.right) st.push([n.right, 1]); } else post.push(n.val); } return [ino, pre, post]; }`,
  brute: `function treeTraversal(root) { const i = [], p = [], q = []; const a = (n) => { if (n) { a(n.left); i.push(n.val); a(n.right); } }; const b = (n) => { if (n) { p.push(n.val); b(n.left); b(n.right); } }; const c = (n) => { if (n) { c(n.left); c(n.right); q.push(n.val); } }; a(root); b(root); c(root); return [i, p, q]; }`,
  fuzz: ANY_TREE,
  examples: [[[1, 3, 4, 5, 2, 7, 6]], [[1, 2, 3, null, null, 4, 5]]],
  edges: [
    ["empty", [[]], "No nodes: three empty lists."],
    ["single", [[7]]],
    ["skewed", [[1, 2, null, 3, null, 4]]],
  ],
});

const childrenSum = tree({
  slug: "children-sum-property-in-binary-tree",
  title: "Children Sum Property",
  difficulty: "Easy",
  pattern: "Trees: DFS",
  url: tuf("children-sum-property-in-binary-tree"),
  statement: "Return `true` if every node of the binary tree that has at least one child holds a value equal to the sum of its children's values (a missing child counts as `0`). Leaves and an empty tree satisfy the property.",
  constraints: ["0 <= number of nodes <= 10^5", "0 <= Node.val <= 10^5"],
  fn: "isChildrenSum",
  params: [["root", "TreeNode | null"]],
  returns: "boolean",
  hints: [
    "The rule is local: each node only needs its own children. What do you check per node?",
    "Recurse. A null node or a leaf is fine. Otherwise compare node.val with (left ? left.val : 0) + (right ? right.val : 0) and require both subtrees to pass.",
    "check(node):\n  if node is null or a leaf: return true\n  sum = value of left (or 0) + value of right (or 0)\n  return node.val == sum and check(node.left) and check(node.right)",
  ],
  reference: `function isChildrenSum(root) { const ok = (n) => { if (!n || (!n.left && !n.right)) return true; const s = (n.left ? n.left.val : 0) + (n.right ? n.right.val : 0); return n.val === s && ok(n.left) && ok(n.right); }; return ok(root); }`,
  brute: `function isChildrenSum(root) { const q = root ? [root] : []; while (q.length) { const n = q.shift(); const kids = [n.left, n.right].filter(Boolean); if (kids.length && kids.reduce((s, k) => s + k.val, 0) !== n.val) return false; q.push(...kids); } return true; }`,
  fuzz: treeGen(`var t = __levelTree(rand, __r(rand, 1, 10), 0, 6); if (rand() < 0.5) return [t]; var root = __treeFromLevelOrder(t); function fix(n) { if (!n) return 0; if (!n.left && !n.right) return n.val; n.val = fix(n.left) + fix(n.right); return n.val; } fix(root); return [__treeToLevelOrder(root)];`),
  examples: [[[35, 20, 15, 15, 5, 10, 5]], [[1, 4, 3, 5]]],
  edges: [
    ["empty", [[]]],
    ["single", [[9]], "A leaf has no children to compare against."],
    ["skewed", [[5, 5, null, 5]]],
  ],
});

const boundary = tree({
  slug: "boundary-traversal",
  title: "Boundary Traversal of a Binary Tree",
  difficulty: "Medium",
  pattern: "Trees: DFS",
  url: tuf("boundary-traversal"),
  statement: "Return the boundary of the binary tree, anticlockwise from the root:\n\n1. The root (once).\n2. The **left boundary** top-down: start at `root.left` and keep going left (or right when there's no left child), excluding leaves.\n3. All **leaves** from left to right.\n4. The **right boundary** bottom-up: start at `root.right`, keep going right (or left), excluding leaves.\n\nA single-node tree's boundary is just the root.",
  constraints: ["0 <= number of nodes <= 10^5"],
  fn: "boundaryTraversal",
  params: [["root", "TreeNode | null"]],
  returns: "number[]",
  hints: [
    "Split the boundary into three independent walks, being careful not to count a leaf twice.",
    "Walk the left edge (skip leaves), collect leaves with a DFS (left before right), walk the right edge (skip leaves) and append it reversed. Add the root first unless it is itself a leaf (the leaf DFS adds it then).",
    "if root is null: return []\nres = [root] if root is not a leaf else []\nwalk n = root.left: while n: if n is not a leaf: res.add(n); n = n.left or n.right\nadd every leaf in DFS order (left first)\nwalk n = root.right collecting non-leaves into tmp; n = n.right or n.left\nres += reverse(tmp)\nreturn res",
  ],
  reference: `function boundaryTraversal(root) { if (!root) return []; const leaf = (n) => !n.left && !n.right; const res = leaf(root) ? [] : [root.val]; for (let n = root.left; n; n = n.left || n.right) if (!leaf(n)) res.push(n.val); const leaves = (n) => { if (!n) return; if (leaf(n)) { res.push(n.val); return; } leaves(n.left); leaves(n.right); }; leaves(root); const tmp = []; for (let n = root.right; n; n = n.right || n.left) if (!leaf(n)) tmp.push(n.val); return res.concat(tmp.reverse()); }`,
  brute: `function boundaryTraversal(root) { if (!root) return []; const isLeaf = (n) => n.left === null && n.right === null; if (isLeaf(root)) return [root.val]; const left = []; let n = root.left; while (n) { left.push(n); n = n.left !== null ? n.left : n.right; } const right = []; n = root.right; while (n) { right.push(n); n = n.right !== null ? n.right : n.left; } const leaves = []; const st = [root]; while (st.length) { const x = st.pop(); if (isLeaf(x)) leaves.push(x); if (x.right) st.push(x.right); if (x.left) st.push(x.left); } return [root, ...left.filter((x) => !isLeaf(x)), ...leaves, ...right.filter((x) => !isLeaf(x)).reverse()].map((x) => x.val); }`,
  fuzz: ANY_TREE,
  examples: [[[1, 2, 7, 3, null, null, 8, null, 4, 9, null, 5, 6, 10, 11]], [[1, 2, 3, 4, 5, 6, 7]]],
  edges: [
    ["single", [[1]], "The root is also the only leaf: it appears once."],
    ["empty", [[]]],
    ["skewed", [[1, 2, null, 3, null, 4]], "A left-only chain: left boundary, then the single leaf."],
  ],
});

const VIEW_HINT_DFS = "Give the root column 0, a left child column - 1 and a right child column + 1.";
const topView = tree({
  slug: "top-view-of-bt",
  title: "Top View of a Binary Tree",
  difficulty: "Medium",
  pattern: "Trees: BFS",
  url: tuf("top-view-of-bt"),
  statement: "Return the **top view** of the binary tree: for each vertical column from left to right, the node seen first when looking down. The root is in column `0`, a left child is one column left of its parent and a right child one column right. When several nodes share a column, take the one at the smallest depth; on a tie, the one met first in level order (left to right).",
  constraints: ["0 <= number of nodes <= 10^5"],
  fn: "topView",
  params: [["root", "TreeNode | null"]],
  returns: "number[]",
  hints: [
    VIEW_HINT_DFS,
    "BFS visits nodes in level order, so the first node you meet in each column is the top one. Keep a map column -> value and only set it once.",
    "queue = [(root, 0)]; top = map\nwhile queue not empty:\n  (node, col) = dequeue\n  if col not in top: top[col] = node.val\n  enqueue (node.left, col - 1), (node.right, col + 1) when present\nreturn top values by increasing col",
  ],
  reference: `function topView(root) { if (!root) return []; const m = new Map(); const q = [[root, 0]]; for (let h = 0; h < q.length; h++) { const [n, c] = q[h]; if (!m.has(c)) m.set(c, n.val); if (n.left) q.push([n.left, c - 1]); if (n.right) q.push([n.right, c + 1]); } return [...m.keys()].sort((a, b) => a - b).map((c) => m.get(c)); }`,
  brute: `function topView(root) { const best = {}; const go = (n, c, d) => { if (!n) return; if (!(c in best) || d < best[c][0]) best[c] = [d, n.val]; go(n.left, c - 1, d + 1); go(n.right, c + 1, d + 1); }; go(root, 0, 0); return Object.keys(best).map(Number).sort((a, b) => a - b).map((c) => best[c][1]); }`,
  fuzz: ANY_TREE,
  examples: [[[1, 2, 3, 4, 5, 6, 7]], [[10, 20, 30, 40, 60, 90, 100]]],
  edges: [
    ["empty", [[]]],
    ["single", [[4]]],
    ["order", [[1, 2, 3, null, 4, 5]], "Nodes 4 and 5 share column 0 with the root, which is on top."],
  ],
});

const bottomView = tree({
  slug: "bottom-view-of-bt",
  title: "Bottom View of a Binary Tree",
  difficulty: "Medium",
  pattern: "Trees: BFS",
  url: tuf("bottom-view-of-bt"),
  statement: "Return the **bottom view** of the binary tree: for each vertical column from left to right, the node seen when looking up from below. The root is in column `0`, a left child is one column left of its parent and a right child one column right. When several nodes share a column, take the deepest; on a tie, the one met **last** in level order.",
  constraints: ["0 <= number of nodes <= 10^5"],
  fn: "bottomView",
  params: [["root", "TreeNode | null"]],
  returns: "number[]",
  hints: [
    VIEW_HINT_DFS,
    "BFS in level order and overwrite map[column] every time: the last write per column is the deepest node, and among equal depths the rightmost in level order.",
    "queue = [(root, 0)]; bottom = map\nwhile queue not empty:\n  (node, col) = dequeue\n  bottom[col] = node.val\n  enqueue (node.left, col - 1), (node.right, col + 1) when present\nreturn bottom values by increasing col",
  ],
  reference: `function bottomView(root) { if (!root) return []; const m = new Map(); const q = [[root, 0]]; for (let h = 0; h < q.length; h++) { const [n, c] = q[h]; m.set(c, n.val); if (n.left) q.push([n.left, c - 1]); if (n.right) q.push([n.right, c + 1]); } return [...m.keys()].sort((a, b) => a - b).map((c) => m.get(c)); }`,
  brute: `function bottomView(root) { const best = {}; const go = (n, c, d) => { if (!n) return; if (!(c in best) || d >= best[c][0]) best[c] = [d, n.val]; go(n.left, c - 1, d + 1); go(n.right, c + 1, d + 1); }; go(root, 0, 0); return Object.keys(best).map(Number).sort((a, b) => a - b).map((c) => best[c][1]); }`,
  fuzz: ANY_TREE,
  examples: [[[20, 8, 22, 5, 3, null, 25, null, null, 10, 14]], [[1, 2, 3, 4, 5, 6, 7]]],
  edges: [
    ["empty", [[]]],
    ["single", [[4]]],
    ["order", [[1, 2, 3, null, 4, 5]], "Nodes 4 and 5 tie at depth 2 in column 0: the later one in level order wins."],
  ],
});

const rootToLeaf = tree({
  slug: "print-root-to-leaf-path-in-bt",
  title: "All Root-to-Leaf Paths",
  difficulty: "Medium",
  pattern: "Trees: DFS",
  url: tuf("print-root-to-leaf-path-in-bt"),
  statement: "Return every path from the root to a leaf of the binary tree, as lists of node values, ordered from the leftmost leaf to the rightmost.",
  constraints: ["0 <= number of nodes <= 3000"],
  fn: "allRootToLeaf",
  params: [["root", "TreeNode | null"]],
  returns: "number[][]",
  hints: [
    "A DFS that goes left before right reaches the leaves in left-to-right order. What do you carry along the way?",
    "Keep the current path in a list. Push the node, record a copy at a leaf, recurse into children, then pop (backtrack).",
    "dfs(node, path):\n  if node is null: return\n  path.add(node.val)\n  if node is a leaf: answers.add(copy of path)\n  else: dfs(node.left, path); dfs(node.right, path)\n  path.removeLast()",
  ],
  reference: `function allRootToLeaf(root) { const out = [], path = []; const dfs = (n) => { if (!n) return; path.push(n.val); if (!n.left && !n.right) out.push(path.slice()); else { dfs(n.left); dfs(n.right); } path.pop(); }; dfs(root); return out; }`,
  brute: `function allRootToLeaf(root) { const go = (n) => { if (!n) return []; if (!n.left && !n.right) return [[n.val]]; return [...go(n.left), ...go(n.right)].map((p) => [n.val, ...p]); }; return go(root); }`,
  fuzz: ANY_TREE,
  examples: [[[1, 2, 3, null, 5, null, 4]], [[1, 2, 3, 4, 5]]],
  edges: [
    ["empty", [[]]],
    ["single", [[8]], "The root is a leaf: one path of length 1."],
    ["skewed", [[1, null, 2, null, 3]]],
  ],
});

const burnTree = tree({
  slug: "minimum-time-taken-to-burn-the-bt-from-a-given-node",
  title: "Minimum Time to Burn a Binary Tree",
  difficulty: "Hard",
  pattern: "Trees: BFS",
  url: tuf("minimum-time-taken-to-burn-the-bt-from-a-given-node"),
  statement: "A fire starts at the node whose value is `start` (all values are distinct). Every second the fire spreads from each burning node to its parent and children. Return the number of seconds until the whole tree is burning.",
  constraints: ["1 <= number of nodes <= 10^5", "Node values are distinct", "start is a value in the tree"],
  fn: "timeToBurnTree",
  params: [["root", "TreeNode"], ["start", "number"]],
  returns: "number",
  extraArgs: 1,
  hints: [
    "Fire moves upward too, but tree nodes don't point to their parents. How can you make the tree an undirected graph?",
    "Record each node's parent with one traversal, then BFS from the start node over left, right and parent, counting levels. The answer is the last level reached.",
    "parent = map from a BFS of the tree; s = node with value start\nqueue = [s]; seen = {s}; time = -1\nwhile queue not empty:\n  time += 1\n  for each node in the current level:\n    for nb in node.left, node.right, parent[node]:\n      if nb and nb not in seen: mark; enqueue nb\nreturn time",
  ],
  reference: `function timeToBurnTree(root, start) { const par = new Map(); let s = null; const q = [root]; for (let h = 0; h < q.length; h++) { const n = q[h]; if (n.val === start) s = n; for (const c of [n.left, n.right]) if (c) { par.set(c, n); q.push(c); } } let level = [s], t = -1; const seen = new Set([s]); while (level.length) { t++; const next = []; for (const n of level) for (const nb of [n.left, n.right, par.get(n)]) if (nb && !seen.has(nb)) { seen.add(nb); next.push(nb); } level = next; } return t; }`,
  brute: `function timeToBurnTree(root, start) { const paths = []; const walk = (n, p) => { if (!n) return; const here = [...p, n.val]; paths.push(here); walk(n.left, here); walk(n.right, here); }; walk(root, []); const sp = paths.find((p) => p[p.length - 1] === start); let best = 0; for (const p of paths) { let k = 0; while (k < p.length && k < sp.length && p[k] === sp[k]) k++; best = Math.max(best, p.length + sp.length - 2 * k); } return best; }`,
  fuzz: treeGen(`${UNIQUE}\nvar n = __r(rand, 1, 12); return [__uniq(rand, n), __r(rand, 1, n)];`),
  examples: [[[1, 2, 3, 4, null, 5, 6, null, 7], 1], [[1, 2, 3, null, 5, null, 4], 4]],
  edges: [
    ["single", [[1], 1], "Only the start node: it burns at time 0."],
    ["skewed", [[1, 2, null, 3, null, 4], 4], "Fire climbs the whole chain."],
    ["boundary", [[3, 1, 2], 1]],
  ],
});

const uniqueTree: ProblemDef = {
  slug: "requirements-needed-to-construct-a-unique-bt",
  title: "Traversals Needed for a Unique Binary Tree",
  difficulty: "Easy",
  pattern: "Trees: DFS",
  url: tuf("requirements-needed-to-construct-a-unique-bt"),
  statement: "Traversals are coded `1` = preorder, `2` = inorder, `3` = postorder. Given two codes `a` and `b`, return `true` if those two traversals together always identify a unique binary tree (assuming distinct values).",
  constraints: ["1 <= a, b <= 3"],
  fn: "uniqueBinaryTree",
  params: [["a", "number"], ["b", "number"]],
  returns: "boolean",
  hints: [
    "Preorder and postorder both tell you the root, but neither tells you which nodes go left and which go right.",
    "Inorder splits the remaining nodes into left and right subtrees around the root. You need inorder plus one of the other two, and two copies of the same traversal add nothing.",
    "return a != b and (a == 2 or b == 2)",
  ],
  reference: `function uniqueBinaryTree(a, b) { return a !== b && (a === 2 || b === 2); }`,
  brute: `function uniqueBinaryTree(a, b) { const ok = [[1, 2], [2, 1], [2, 3], [3, 2]]; return ok.some(([x, y]) => x === a && y === b); }`,
  fuzz: gen(`return [__r(rand, 1, 3), __r(rand, 1, 3)];`),
  examples: [[1, 2], [1, 3]],
  edges: [
    ["duplicates", [2, 2], "Two inorder traversals can't split left from right."],
    ["order", [3, 2]],
    ["boundary", [3, 1], "Preorder and postorder alone are ambiguous."],
  ],
};

// ---- Binary search trees ----

const floorCeil = tree({
  slug: "floor-and-ceil-in-a-bst",
  title: "Floor and Ceil in a BST",
  difficulty: "Medium",
  pattern: "Binary Search Tree",
  url: tuf("floor-and-ceil-in-a-bst"),
  statement: "Given the `root` of a binary search tree with distinct values and an integer `key`, return `[floor, ceil]`: the largest value `<= key` and the smallest value `>= key`. Use `-1` for either if it doesn't exist.",
  constraints: ["1 <= number of nodes <= 10^5", "1 <= Node.val, key <= 10^9"],
  fn: "floorCeilOfBST",
  params: [["root", "TreeNode"], ["key", "number"]],
  returns: "number[]",
  extraArgs: 1,
  hints: [
    "Walking down a BST is a binary search. Each node you pass is a candidate for one of the two answers.",
    "Do two walks (or one). For the floor: when node.val <= key it's a candidate, go right; otherwise go left. For the ceil, mirror it.",
    "floor = -1; n = root\nwhile n: if n.val == key: floor = key; stop\n  if n.val < key: floor = n.val; n = n.right else n = n.left\nceil = -1; n = root\nwhile n: if n.val == key: ceil = key; stop\n  if n.val > key: ceil = n.val; n = n.left else n = n.right\nreturn [floor, ceil]",
  ],
  reference: `function floorCeilOfBST(root, key) { let f = -1, c = -1; for (let n = root; n; ) { if (n.val === key) { f = key; break; } if (n.val < key) { f = n.val; n = n.right; } else n = n.left; } for (let n = root; n; ) { if (n.val === key) { c = key; break; } if (n.val > key) { c = n.val; n = n.left; } else n = n.right; } return [f, c]; }`,
  brute: `function floorCeilOfBST(root, key) { const v = []; const go = (n) => { if (n) { v.push(n.val); go(n.left); go(n.right); } }; go(root); const lo = v.filter((x) => x <= key), hi = v.filter((x) => x >= key); return [lo.length ? Math.max(...lo) : -1, hi.length ? Math.min(...hi) : -1]; }`,
  fuzz: BST_KEY,
  examples: [[[8, 4, 12, 2, 6, 10, 14], 11], [[8, 4, 12, 2, 6, 10, 14], 6]],
  edges: [
    ["single", [[5], 5], "The key itself is both floor and ceil."],
    ["no-answer", [[10, 5, 15], 3], "Nothing is <= 3: floor is -1."],
    ["boundary", [[10, 5, 15], 20], "Nothing is >= 20: ceil is -1."],
  ],
});

const minMax = tree({
  slug: "minimum-and-maximum-in-bst",
  title: "Minimum and Maximum in a BST",
  difficulty: "Easy",
  pattern: "Binary Search Tree",
  url: tuf("minimum-and-maximum-in-bst"),
  statement: "Given the `root` of a non-empty binary search tree, return `[min, max]`: its smallest and largest values.",
  constraints: ["1 <= number of nodes <= 10^5"],
  fn: "minMaxBST",
  params: [["root", "TreeNode"]],
  returns: "number[]",
  hints: [
    "In a BST every smaller value is to the left. Where is the smallest one?",
    "Follow left pointers to the end for the minimum and right pointers to the end for the maximum. No need to visit the rest of the tree.",
    "lo = root; while lo.left: lo = lo.left\nhi = root; while hi.right: hi = hi.right\nreturn [lo.val, hi.val]",
  ],
  reference: `function minMaxBST(root) { let a = root, b = root; while (a.left) a = a.left; while (b.right) b = b.right; return [a.val, b.val]; }`,
  brute: `function minMaxBST(root) { const v = []; const go = (n) => { if (n) { v.push(n.val); go(n.left); go(n.right); } }; go(root); return [Math.min(...v), Math.max(...v)]; }`,
  fuzz: BST,
  examples: [[[5, 3, 7, 2, 4, 6, 8]], [[10, null, 20, null, 30]]],
  edges: [
    ["single", [[9]], "One node is both the minimum and the maximum."],
    ["skewed", [[5, 4, null, 3, null, 2]]],
    ["two", [[1, null, 2]]],
  ],
});

const predSucc = tree({
  slug: "inorder-successor-and-predecessor-in-bst",
  title: "Inorder Predecessor and Successor in a BST",
  difficulty: "Medium",
  pattern: "Binary Search Tree",
  url: tuf("inorder-successor-and-predecessor-in-bst"),
  statement: "Given the `root` of a binary search tree with distinct values and a `key` (which may or may not be in the tree), return `[predecessor, successor]`: the largest value strictly less than `key` and the smallest value strictly greater than `key`. Use `-1` when one doesn't exist.",
  constraints: ["1 <= number of nodes <= 10^5", "1 <= Node.val, key <= 10^9"],
  fn: "succPredBST",
  params: [["root", "TreeNode"], ["key", "number"]],
  returns: "number[]",
  extraArgs: 1,
  hints: [
    "This is floor and ceil with strict comparisons. What changes when node.val == key?",
    "For the successor: when node.val > key record it and go left, otherwise go right. For the predecessor: when node.val < key record it and go right, otherwise go left.",
    "pred = -1; n = root\nwhile n: if n.val < key: pred = n.val; n = n.right else n = n.left\nsucc = -1; n = root\nwhile n: if n.val > key: succ = n.val; n = n.left else n = n.right\nreturn [pred, succ]",
  ],
  reference: `function succPredBST(root, key) { let p = -1, s = -1; for (let n = root; n; ) if (n.val < key) { p = n.val; n = n.right; } else n = n.left; for (let n = root; n; ) if (n.val > key) { s = n.val; n = n.left; } else n = n.right; return [p, s]; }`,
  brute: `function succPredBST(root, key) { const v = []; const go = (n) => { if (n) { go(n.left); v.push(n.val); go(n.right); } }; go(root); const lo = v.filter((x) => x < key), hi = v.filter((x) => x > key); return [lo.length ? lo[lo.length - 1] : -1, hi.length ? hi[0] : -1]; }`,
  fuzz: BST_KEY,
  examples: [[[5, 2, 10, 1, 4, 7, 12], 10], [[8, 1, 9, null, 4, null, 10, 3], 3]],
  edges: [
    ["single", [[5], 5], "The key itself doesn't count: both are -1."],
    ["no-answer", [[10, 5, 15], 1], "Nothing smaller than 1."],
    ["boundary", [[10, 5, 15], 15], "15 is the largest value: no successor."],
  ],
});

const largestBst = tree({
  slug: "largest-bst-in-binary-tree",
  title: "Largest BST in a Binary Tree",
  difficulty: "Hard",
  pattern: "Binary Search Tree",
  url: tuf("largest-bst-in-binary-tree"),
  statement: "Given the `root` of a binary tree, return the number of nodes in its largest subtree that is a binary search tree (every node strictly greater than everything in its left subtree and strictly smaller than everything in its right subtree). A subtree means a node with **all** its descendants. An empty tree has answer `0`.",
  constraints: ["0 <= number of nodes <= 10^5"],
  fn: "largestBST",
  params: [["root", "TreeNode | null"]],
  returns: "number",
  hints: [
    "Checking every subtree from scratch is O(n^2). What could each child report upward so the parent decides in O(1)?",
    "Postorder: each subtree returns (size, min, max, isBST). A node is a BST root when both children are BSTs and left.max < node.val < right.min. Track the best size seen.",
    "info(node):\n  if node is null: return (0, +inf, -inf, true)\n  L = info(left); R = info(right)\n  if L.bst and R.bst and L.max < node.val < R.min:\n    size = L.size + R.size + 1; best = max(best, size)\n    return (size, min(L.min, node.val), max(R.max, node.val), true)\n  return (0, 0, 0, false)",
  ],
  reference: `function largestBST(root) { let best = 0; const go = (n) => { if (!n) return [0, Infinity, -Infinity, true]; const L = go(n.left), R = go(n.right); if (L[3] && R[3] && L[2] < n.val && n.val < R[1]) { const s = L[0] + R[0] + 1; best = Math.max(best, s); return [s, Math.min(L[1], n.val), Math.max(R[2], n.val), true]; } return [0, 0, 0, false]; }; go(root); return best; }`,
  brute: `function largestBST(root) { const isBst = (n, lo, hi) => !n || (n.val > lo && n.val < hi && isBst(n.left, lo, n.val) && isBst(n.right, n.val, hi)); const size = (n) => (n ? 1 + size(n.left) + size(n.right) : 0); let best = 0; const walk = (n) => { if (!n) return; if (isBst(n, -Infinity, Infinity)) best = Math.max(best, size(n)); walk(n.left); walk(n.right); }; walk(root); return best; }`,
  fuzz: treeGen(`if (rand() < 0.4) return [__bstLevel(rand, __r(rand, 1, 10), 1, 30)]; return [__levelTree(rand, __r(rand, 0, 12), 1, 15)];`),
  examples: [[[10, 5, 15, 1, 8, null, 7]], [[5, 2, 4, 1, 3]]],
  edges: [
    ["empty", [[]]],
    ["single", [[3]], "A single node is a BST of size 1."],
    ["duplicates", [[2, 2, 2]], "Equal values break the strict order: only the leaves count."],
  ],
});

export const A2Z_TREES = [
  allTraversals, childrenSum, boundary, topView, bottomView, rootToLeaf, burnTree, uniqueTree,
  floorCeil, minMax, predSucc, largestBst,
].map(define);
