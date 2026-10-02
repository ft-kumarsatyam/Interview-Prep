import type { ProblemSpec } from "../types";

// ---- case-building helpers (run in Node when the spec loads; they produce canonical level-order arrays) ----

/** Right-leaning chain: [v0, null, v1, null, v2, ...]. */
const skewRight = (n: number, val: (i: number) => number = (i) => i + 1): Array<number | null> => Array.from({ length: n }, (_, i) => (i === 0 ? [val(i)] : [null, val(i)])).flat();

/** Left-leaning chain: [v0, v1, null, v2, null, ...] with the trailing null trimmed. */
const skewLeft = (n: number, val: (i: number) => number = (i) => i + 1): Array<number | null> => {
  const out = Array.from({ length: n }, (_, i) => (i === 0 ? [val(i)] : [val(i), null])).flat();
  out.pop();
  return out;
};

/** Perfect binary tree in level order (node i, 1-based heap index, gets f(i)). */
const perfect = (n: number, f: (i: number) => number = (i) => i): number[] => Array.from({ length: n }, (_, k) => f(k + 1));

/** Perfect BST of 255 nodes (depth 8) whose in-order values are 1..255. */
const perfectBst = (): number[] =>
  perfect(255, (i) => {
    const d = 31 - Math.clz32(i);
    const p = i - 2 ** d;
    return (2 * p + 1) * 2 ** (7 - d);
  });

/** Perfect tree where every node at depth d holds d + 1: symmetric by construction. */
const levelValued = (n: number): number[] => perfect(n, (i) => 32 - Math.clz32(i));

// ---- fuzz helpers, prepended to each generator (the Worker lib's TreeNode / __treeToLevelOrder are in scope) ----
const GEN_HELPERS = `
function __val(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function __nodes(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length) { const n = stack.pop(); out.push(n); if (n.left) stack.push(n.left); if (n.right) stack.push(n.right); }
  return out;
}
function __rt(rand, n, lo, hi) {
  if (n <= 0) return null;
  const root = new TreeNode(__val(rand, lo, hi));
  const all = [root];
  while (all.length < n) {
    const host = all[Math.floor(rand() * all.length)];
    const side = rand() < 0.5 ? "left" : "right";
    if (host[side] === null) { host[side] = new TreeNode(__val(rand, lo, hi)); all.push(host[side]); }
  }
  return root;
}
function __rbst(rand, n, lo, hi) {
  const pool = [];
  for (let v = lo; v <= hi; v++) pool.push(v);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  const root = new TreeNode(pool[0]);
  for (let i = 1; i < n; i++) {
    let cur = root;
    for (;;) {
      const side = pool[i] < cur.val ? "left" : "right";
      if (cur[side] === null) { cur[side] = new TreeNode(pool[i]); break; }
      cur = cur[side];
    }
  }
  return root;
}
function __mirror(n) { return n === null ? null : new TreeNode(n.val, __mirror(n.right), __mirror(n.left)); }
`;

export const TREES: ProblemSpec[] = [
  {
    slug: "invert-binary-tree",
    functionName: "invertTree",
    params: ["root"],
    returnType: "TreeNode | null",
    argTypes: ["TreeNode"],
    returns: "TreeNode",
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {TreeNode | null}\n */\nfunction invertTree(root) {\n  \n}",
    hints: [
      "Look at a single node with two children. What would the mirror image of just that node and its two subtrees look like?",
      "Mirroring the whole tree means swapping the two children at every node. Do it recursively (swap, then handle each subtree) or with a queue or stack, visiting every node exactly once.",
      "if root is empty: return empty\nswap root.left and root.right\ninvert the subtree now in root.left\ninvert the subtree now in root.right\nreturn root",
    ],
    reference: `function invertTree(root) {
      if (root === null) return null;
      const left = invertTree(root.left);
      const right = invertTree(root.right);
      root.left = right;
      root.right = left;
      return root;
    }`,
    brute: `function invertTree(root) {
      if (!root) return null;
      const stack = [root];
      while (stack.length) {
        const node = stack.pop();
        const t = node.left; node.left = node.right; node.right = t;
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
      }
      return root;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) { return [__treeToLevelOrder(__rt(rand, Math.floor(rand() * 10), -5, 9))]; }`,
    cases: [
      { input: [[4, 2, 7, 1, 3, 6, 9]], hidden: false },
      { input: [[2, 1, 3]], hidden: false },
      { input: [[]], hidden: false, edge: "null-input", note: "An empty tree must come back empty: root.left on null throws." },
      { input: [[1]], hidden: true, edge: "single" },
      { input: [[1, 2]], hidden: true, edge: "two", note: "Only a left child exists; it has to end up on the right, with the left slot becoming empty." },
      { input: [[1, 2, 3, 4, 5, null, 6, null, null, 7]], hidden: true },
      { input: [[5, 5, 5, 5, null, 5, 5]], hidden: true, edge: "all-equal", note: "Equal values hide a swap that forgot to move a subtree: only the shape reveals it." },
      { input: [[0, -1, 1, -2, null, null, 2]], hidden: true, edge: "zeros" },
      { input: [skewLeft(400)], hidden: true, edge: "skewed", note: "A 400-deep left chain: it must become a right chain, and recursion goes 400 levels down." },
      { input: [perfect(255)], hidden: true, edge: "large" },
      { input: [[3, 1, null, null, 2]], hidden: true },
    ],
  },
  {
    slug: "maximum-depth-of-binary-tree",
    functionName: "maxDepth",
    params: ["root"],
    returnType: "number",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {number}\n */\nfunction maxDepth(root) {\n  \n}",
    hints: [
      "If you already knew the depth of the left subtree and of the right subtree, what would the depth of the whole tree be?",
      "The depth of a node is one more than the deeper of its two children, and an empty tree has depth 0. A recursive DFS expresses that directly; a level-by-level BFS that counts levels works too.",
      "if root is empty: return 0\nleftDepth = depth of root.left\nrightDepth = depth of root.right\nreturn 1 + max(leftDepth, rightDepth)",
    ],
    reference: `function maxDepth(root) {
      if (root === null) return 0;
      return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }`,
    brute: `function maxDepth(root) {
      if (!root) return 0;
      let level = [root];
      let depth = 0;
      while (level.length) {
        depth++;
        const next = [];
        for (const n of level) { if (n.left) next.push(n.left); if (n.right) next.push(n.right); }
        level = next;
      }
      return depth;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) { return [__treeToLevelOrder(__rt(rand, Math.floor(rand() * 13), -9, 9))]; }`,
    cases: [
      { input: [[3, 9, 20, null, null, 15, 7]], hidden: false },
      { input: [[1, null, 2]], hidden: false },
      { input: [[]], hidden: false, edge: "null-input", note: "An empty tree has depth 0, not 1 and not an error." },
      { input: [[7]], hidden: true, edge: "single", note: "A lone node has depth 1: count nodes on the path, not edges." },
      { input: [[1, 2, null, 3, null, 4, null, 5]], hidden: true },
      { input: [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], hidden: true },
      { input: [[0, 0, 0, 0, 0, 0, 0]], hidden: true, edge: "all-equal" },
      { input: [[-5, -10, -3]], hidden: true, edge: "negatives", note: "Values are irrelevant to depth; negative values must not leak into the answer." },
      { input: [skewRight(600)], hidden: true, edge: "skewed", note: "A 600-deep right chain: the answer is the node count." },
      { input: [perfect(511)], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "same-tree",
    functionName: "isSameTree",
    params: ["p", "q"],
    returnType: "boolean",
    argTypes: ["TreeNode", "TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} p\n * @param {TreeNode | null} q\n * @return {boolean}\n */\nfunction isSameTree(p, q) {\n  \n}",
    hints: [
      "Two trees match when their roots match and what hangs off each root matches. What are all the ways a single pair of positions can disagree?",
      "Walk both trees in lockstep. Two empty spots match, exactly one empty spot is a mismatch, and two real nodes must have equal values and then match on both the left pair and the right pair.",
      "if p and q are both empty: return true\nif exactly one is empty: return false\nif p.val differs from q.val: return false\nreturn same(p.left, q.left) and same(p.right, q.right)",
    ],
    reference: `function isSameTree(p, q) {
      if (p === null && q === null) return true;
      if (p === null || q === null) return false;
      if (p.val !== q.val) return false;
      return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }`,
    brute: `function isSameTree(p, q) {
      const ser = (root) => {
        const out = [];
        const stack = [root];
        while (stack.length) {
          const n = stack.pop();
          if (n === null) { out.push("#"); continue; }
          out.push("v" + n.val);
          stack.push(n.right, n.left);
        }
        return out.join(",");
      };
      return ser(p) === ser(q);
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) {
      const a = __rt(rand, Math.floor(rand() * 7), 0, 3);
      const pa = __treeToLevelOrder(a);
      const r = rand();
      if (r < 0.4) return [pa, __treeToLevelOrder(a)];
      if (r < 0.7 && a !== null) {
        const nodes = __nodes(a);
        const target = nodes[Math.floor(rand() * nodes.length)];
        const before = target.val;
        target.val = (before + 1 + Math.floor(rand() * 3)) % 4;
        return [pa, __treeToLevelOrder(a)];
      }
      return [pa, __treeToLevelOrder(__rt(rand, Math.floor(rand() * 7), 0, 3))];
    }`,
    cases: [
      { input: [[1, 2, 3], [1, 2, 3]], hidden: false },
      { input: [[1, 2], [1, null, 2]], hidden: false },
      { input: [[1, 2, 1], [1, 1, 2]], hidden: false },
      { input: [[], []], hidden: false, edge: "null-input", note: "Both trees empty: they are the same. Reading .val on null throws." },
      { input: [[], [1]], hidden: true, edge: "null-input", note: "Exactly one tree is empty: a check like p.val === q.val dereferences null." },
      { input: [[1], [1]], hidden: true, edge: "single" },
      { input: [[0, 0], [0, null, 0]], hidden: true, edge: "zeros", note: "Same values, different shape: comparing level-order values while ignoring empty slots says equal." },
      { input: [[2, 2, 2], [2, 2, 2]], hidden: true, edge: "all-equal" },
      { input: [[1, 2, 3], [1, 2, 3, null, null, null, 4]], hidden: true },
      { input: [skewRight(330), skewRight(330)], hidden: true, edge: "skewed", note: "Two identical 330-deep chains: every level matches until the very bottom." },
      { input: [skewRight(300), skewRight(300, (i) => (i === 299 ? 0 : i + 1))], hidden: true, edge: "large", note: "Identical except the deepest node: an early-exit shortcut on the top levels will say true." },
    ],
  },
  {
    slug: "symmetric-tree",
    functionName: "isSymmetric",
    params: ["root"],
    returnType: "boolean",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {boolean}\n */\nfunction isSymmetric(root) {\n  \n}",
    hints: [
      "Cover the right half of the tree and mirror the left half across the middle. Which pairs of nodes have to match?",
      "Compare two subtrees at a time: the left child of one with the right child of the other, and the right child of one with the left child of the other. Start with the root's two children.",
      "check(a, b):\n  if a and b are both empty: return true\n  if exactly one is empty: return false\n  if a.val differs from b.val: return false\n  return check(a.left, b.right) and check(a.right, b.left)\nanswer = check(root.left, root.right)",
    ],
    reference: `function isSymmetric(root) {
      const mirror = (a, b) => {
        if (a === null && b === null) return true;
        if (a === null || b === null || a.val !== b.val) return false;
        return mirror(a.left, b.right) && mirror(a.right, b.left);
      };
      return root === null ? true : mirror(root.left, root.right);
    }`,
    brute: `function isSymmetric(root) {
      if (!root) return true;
      let level = [root];
      while (level.length) {
        const vals = level.map((n) => (n === null ? null : n.val));
        for (let i = 0, j = vals.length - 1; i < j; i++, j--) if (vals[i] !== vals[j]) return false;
        const next = [];
        for (const n of level) if (n !== null) next.push(n.left, n.right);
        level = next.some((n) => n !== null) ? next : [];
      }
      return true;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) {
      if (rand() < 0.2) return [__treeToLevelOrder(__rt(rand, 1 + Math.floor(rand() * 8), 0, 2))];
      const left = __rt(rand, Math.floor(rand() * 5), 0, 3);
      const root = new TreeNode(__val(rand, 0, 3), left, __mirror(left));
      if (rand() < 0.45) {
        const nodes = __nodes(root);
        const target = nodes[Math.floor(rand() * nodes.length)];
        target.val = (target.val + 1) % 4;
      }
      return [__treeToLevelOrder(root)];
    }`,
    cases: [
      { input: [[1, 2, 2, 3, 4, 4, 3]], hidden: false },
      { input: [[1, 2, 2, null, 3, null, 3]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "A tree with only a root is symmetric: there is nothing to compare." },
      { input: [[1, 2]], hidden: true, edge: "two", note: "A left child with no matching right child: not symmetric." },
      { input: [[1, 2, 2]], hidden: true },
      { input: [[1, 2, 3]], hidden: true },
      { input: [[2, 2, 2, 2, null, 2]], hidden: true, edge: "all-equal", note: "Every value is 2 and the nodes are symmetric in count, but not in shape: both subtrees hang to the same side." },
      { input: [[2, 2, 2, 2, 2, 2, 2]], hidden: true },
      { input: [[1, 2, 2, null, 3, 3]], hidden: true },
      { input: [[0, -1, -1, null, 5, 5]], hidden: true, edge: "negatives", note: "Mirrored pair of equal negative values with their children on opposite sides: symmetric." },
      { input: [skewLeft(300)], hidden: true, edge: "skewed", note: "A left-only chain is never symmetric; recursion goes 300 levels before the first mismatch surfaces." },
      { input: [levelValued(255)], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "binary-tree-level-order-traversal",
    functionName: "levelOrder",
    params: ["root"],
    returnType: "number[][]",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {number[][]}\n */\nfunction levelOrder(root) {\n  \n}",
    hints: [
      "Which data structure hands you nodes in the order they were discovered, so that all nodes at one depth come out before any at the next?",
      "Run a BFS with a queue. At each round, note how many nodes are in the queue right now: those are exactly one level. Pop that many, record their values, and push their children for the next round.",
      "if root is empty: return empty list\nqueue = [root]\nresult = empty list\nwhile queue is not empty:\n  size = number of items in queue\n  level = empty list\n  repeat size times:\n    node = remove front of queue\n    add node.val to level\n    push node.left and node.right if they exist\n  add level to result\nreturn result",
    ],
    reference: `function levelOrder(root) {
      if (root === null) return [];
      const result = [];
      let queue = [root];
      while (queue.length) {
        const next = [];
        const level = [];
        for (const node of queue) {
          level.push(node.val);
          if (node.left) next.push(node.left);
          if (node.right) next.push(node.right);
        }
        result.push(level);
        queue = next;
      }
      return result;
    }`,
    brute: `function levelOrder(root) {
      const result = [];
      const walk = (node, depth) => {
        if (!node) return;
        if (result.length === depth) result.push([]);
        result[depth].push(node.val);
        walk(node.left, depth + 1);
        walk(node.right, depth + 1);
      };
      walk(root, 0);
      return result;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) { return [__treeToLevelOrder(__rt(rand, Math.floor(rand() * 13), -9, 9))]; }`,
    cases: [
      { input: [[3, 9, 20, null, null, 15, 7]], hidden: false },
      { input: [[1]], hidden: false },
      { input: [[]], hidden: false, edge: "null-input", note: "An empty tree gives an empty list, not [[]]." },
      { input: [[1, 2, 3, 4, 5]], hidden: true },
      { input: [[1, 2, 3, null, 4, 5]], hidden: true },
      { input: [[1, 2, null, 3, null, 4]], hidden: true },
      { input: [[0, 0, 0]], hidden: true, edge: "zeros" },
      { input: [[-1, -2, -3, -4]], hidden: true, edge: "negatives" },
      { input: [skewRight(300)], hidden: true, edge: "skewed", note: "Every level holds exactly one node: 300 levels of one-element arrays." },
      { input: [perfect(511)], hidden: true, edge: "large", note: "9 levels with up to 256 values in the last: wrong grouping or an O(n^2) array shift shows here." },
    ],
  },
  {
    slug: "validate-binary-search-tree",
    functionName: "isValidBST",
    params: ["root"],
    returnType: "boolean",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {boolean}\n */\nfunction isValidBST(root) {\n  \n}",
    hints: [
      "Is it enough that each node is bigger than its left child and smaller than its right child? Picture a node deep in the left subtree of the root.",
      "Every node must fit inside a window of allowed values inherited from all its ancestors, with strict inequalities. Going left shrinks the upper bound, going right raises the lower bound. Alternatively, an in-order walk must be strictly increasing.",
      "check(node, low, high):\n  if node is empty: return true\n  if node.val <= low or node.val >= high: return false\n  return check(node.left, low, node.val)\n     and check(node.right, node.val, high)\nstart with low = minus infinity, high = plus infinity",
    ],
    reference: `function isValidBST(root) {
      const check = (node, low, high) => {
        if (node === null) return true;
        if (node.val <= low || node.val >= high) return false;
        return check(node.left, low, node.val) && check(node.right, node.val, high);
      };
      return check(root, -Infinity, Infinity);
    }`,
    brute: `function isValidBST(root) {
      const order = [];
      const walk = (node) => {
        if (!node) return;
        walk(node.left);
        order.push(node.val);
        walk(node.right);
      };
      walk(root);
      for (let i = 1; i < order.length; i++) if (order[i] <= order[i - 1]) return false;
      return true;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) {
      const mode = Math.floor(rand() * 3);
      if (mode === 0) return [__treeToLevelOrder(__rt(rand, 1 + Math.floor(rand() * 8), 0, 5))];
      const root = __rbst(rand, 1 + Math.floor(rand() * 9), -5, 14);
      if (mode === 2) {
        const nodes = __nodes(root);
        nodes[Math.floor(rand() * nodes.length)].val = __val(rand, -5, 14);
      }
      return [__treeToLevelOrder(root)];
    }`,
    cases: [
      { input: [[2, 1, 3]], hidden: false },
      { input: [[5, 1, 4, null, null, 3, 6]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "A single node is a valid BST." },
      { input: [[2, 2, 2]], hidden: true, edge: "all-equal", note: "Equal values are not allowed on either side: left must be strictly smaller, right strictly larger." },
      { input: [[1, 1]], hidden: true, edge: "duplicates", note: "A left child equal to its parent is invalid; a check using <= on the wrong side accepts it." },
      { input: [[5, 4, 6, null, null, 3, 7]], hidden: true },
      { input: [[-2147483648, null, 2147483647]], hidden: true, edge: "extremes", note: "Values at the 32-bit limits: a sentinel like -2147483648 as the initial bound wrongly rejects the root." },
      { input: [[0, null, -1]], hidden: true, edge: "zeros", note: "Right child -1 is smaller than the 0 root. Falsy-0 checks on a bound can skip this comparison." },
      { input: [[3, 1, 5, 0, 2, 4, 6]], hidden: true },
      { input: [skewRight(600)], hidden: true, edge: "skewed", note: "A strictly increasing 600-deep right chain is a valid BST." },
      { input: [skewRight(300, (i) => (i === 299 ? 3 : i + 10))], hidden: true, edge: "large", note: "Only the very last node (300 levels down) breaks the ordering, against an ancestor far above its parent." },
      { input: [perfectBst()], hidden: true },
    ],
  },
  {
    slug: "diameter-of-binary-tree",
    functionName: "diameterOfBinaryTree",
    params: ["root"],
    returnType: "number",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {number}\n */\nfunction diameterOfBinaryTree(root) {\n  \n}",
    hints: [
      "The longest path has a single highest node where it bends. If you knew that node, how would you compute the path length through it?",
      "For every node, the longest path bending there equals height(left) + height(right), counting edges. Compute heights bottom-up, and update a running best at each node while you do it, so one DFS is enough.",
      "best = 0\nheight(node):\n  if node is empty: return 0\n  l = height(node.left)\n  r = height(node.right)\n  best = max(best, l + r)\n  return 1 + max(l, r)\nheight(root)\nreturn best",
    ],
    reference: `function diameterOfBinaryTree(root) {
      let best = 0;
      const height = (node) => {
        if (node === null) return 0;
        const l = height(node.left);
        const r = height(node.right);
        if (l + r > best) best = l + r;
        return 1 + Math.max(l, r);
      };
      height(root);
      return best;
    }`,
    brute: `function diameterOfBinaryTree(root) {
      const depth = (n) => (n === null ? 0 : 1 + Math.max(depth(n.left), depth(n.right)));
      let best = 0;
      const stack = root ? [root] : [];
      while (stack.length) {
        const n = stack.pop();
        best = Math.max(best, depth(n.left) + depth(n.right));
        if (n.left) stack.push(n.left);
        if (n.right) stack.push(n.right);
      }
      return best;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) { return [__treeToLevelOrder(__rt(rand, 1 + Math.floor(rand() * 12), -9, 9))]; }`,
    cases: [
      { input: [[1, 2, 3, 4, 5]], hidden: false },
      { input: [[1, 2]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "One node: the longest path has zero edges, so the answer is 0, not 1." },
      { input: [[1, 2, null, 3, 4, 5, 6, 7]], hidden: true },
      { input: [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], hidden: true },
      { input: [[1, 1, 1, 1, 1, 1, 1]], hidden: true, edge: "all-equal" },
      { input: [[1, null, 2, 3, null, null, 4, 5]], hidden: true },
      { input: [skewRight(600)], hidden: true, edge: "skewed", note: "A 600-node chain: the diameter is its full length in edges (599) and one end is the root." },
      { input: [perfect(511)], hidden: true, edge: "large", note: "Perfect tree of depth 9: the diameter bends at the root. An O(n^2) height-per-node approach is slow here." },
      { input: [[1, 2, 3, null, 4, null, 5, 6, null, null, 7]], hidden: true },
    ],
  },
  {
    slug: "path-sum",
    functionName: "hasPathSum",
    params: ["root", "targetSum"],
    returnType: "boolean",
    argTypes: ["TreeNode", "value"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @param {number} targetSum\n * @return {boolean}\n */\nfunction hasPathSum(root, targetSum) {\n  \n}",
    hints: [
      "After you step from the root into a child, what target should the rest of the path be aiming for?",
      "Subtract each node's value from the target as you descend. A path counts only if it ends at a leaf (a node with no children), so succeed exactly when you stand on a leaf and the remaining target equals its value.",
      "if root is empty: return false\nremaining = targetSum - root.val\nif root has no children: return remaining == 0\nreturn hasPathSum(root.left, remaining)\n    or hasPathSum(root.right, remaining)",
    ],
    reference: `function hasPathSum(root, targetSum) {
      if (root === null) return false;
      const remaining = targetSum - root.val;
      if (root.left === null && root.right === null) return remaining === 0;
      return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
    }`,
    brute: `function hasPathSum(root, targetSum) {
      if (!root) return false;
      const sums = [];
      const stack = [[root, root.val]];
      while (stack.length) {
        const [node, sum] = stack.pop();
        if (!node.left && !node.right) sums.push(sum);
        if (node.left) stack.push([node.left, sum + node.left.val]);
        if (node.right) stack.push([node.right, sum + node.right.val]);
      }
      return sums.includes(targetSum);
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) {
      const n = rand() < 0.1 ? 0 : 1 + Math.floor(rand() * 9);
      const root = __rt(rand, n, -4, 8);
      let target = __val(rand, -10, 20);
      if (root !== null && rand() < 0.6) {
        const sums = [];
        const stack = [[root, root.val]];
        while (stack.length) {
          const item = stack.pop();
          const node = item[0], sum = item[1];
          if (!node.left && !node.right) sums.push(sum);
          if (node.left) stack.push([node.left, sum + node.left.val]);
          if (node.right) stack.push([node.right, sum + node.right.val]);
        }
        target = sums[Math.floor(rand() * sums.length)];
      }
      return [__treeToLevelOrder(root), target];
    }`,
    cases: [
      { input: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], 22], hidden: false },
      { input: [[1, 2, 3], 5], hidden: false },
      { input: [[], 0], hidden: false, edge: "null-input", note: "An empty tree has no root-to-leaf path at all, so even a target of 0 is false." },
      { input: [[1, 2], 1], hidden: false, edge: "two", note: "The root alone sums to 1, but it is not a leaf: the path has to run down to node 2." },
      { input: [[1], 1], hidden: true, edge: "single" },
      { input: [[-2, null, -3], -5], hidden: true, edge: "negatives", note: "Negative values and a negative target: you can't stop early because the running sum overshoots." },
      { input: [[0, 1, 1], 0], hidden: true, edge: "zeros", note: "The root itself sums to 0 but is not a leaf; the real paths sum to 1." },
      { input: [[10, 5, -3, 3, 2, null, 11], 17], hidden: true },
      { input: [[1, 2, 3], 3], hidden: true },
      { input: [skewRight(500), 125250], hidden: true, edge: "skewed", note: "A 500-node chain whose full sum (1+2+...+500) is the target: the path ends at the very bottom." },
      { input: [perfect(255), 502], hidden: true, edge: "large", note: "Only the all-right path 1+3+7+...+255 reaches 502, so every other branch must be explored and rejected." },
    ],
  },
  {
    slug: "kth-smallest-element-in-a-bst",
    functionName: "kthSmallest",
    params: ["root", "k"],
    returnType: "number",
    argTypes: ["TreeNode", "value"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @param {number} k\n * @return {number}\n */\nfunction kthSmallest(root, k) {\n  \n}",
    hints: [
      "A binary search tree has a natural way to visit its values from smallest to largest. Which traversal is it?",
      "An in-order walk (left subtree, node, right subtree) visits values in ascending order. Count nodes as you visit them and stop at the k-th one; an explicit stack lets you stop early without collecting everything.",
      "stack = empty\nnode = root\nrepeat:\n  while node is not empty:\n    push node on stack\n    node = node.left\n  node = pop from stack\n  k = k - 1\n  if k == 0: return node.val\n  node = node.right",
    ],
    reference: `function kthSmallest(root, k) {
      const stack = [];
      let node = root;
      while (node !== null || stack.length) {
        while (node !== null) { stack.push(node); node = node.left; }
        node = stack.pop();
        k--;
        if (k === 0) return node.val;
        node = node.right;
      }
      return -1;
    }`,
    brute: `function kthSmallest(root, k) {
      const all = [];
      const collect = (n) => {
        if (!n) return;
        all.push(n.val);
        collect(n.left);
        collect(n.right);
      };
      collect(root);
      all.sort((a, b) => a - b);
      return all[k - 1];
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) {
      const n = 1 + Math.floor(rand() * 9);
      return [__treeToLevelOrder(__rbst(rand, n, 0, 30)), 1 + Math.floor(rand() * n)];
    }`,
    cases: [
      { input: [[3, 1, 4, null, 2], 1], hidden: false },
      { input: [[5, 3, 6, 2, 4, null, null, 1], 3], hidden: false },
      { input: [[1], 1], hidden: false, edge: "single" },
      { input: [[2, 1, 3], 3], hidden: false, edge: "boundary", note: "k equals the node count: the answer is the largest value, the last node of the in-order walk." },
      { input: [[2, 1, 3], 1], hidden: true, edge: "boundary", note: "k = 1 is the leftmost leaf, one level below the root." },
      { input: [[1, 0, 2], 1], hidden: true, edge: "zeros", note: "The smallest value is 0: returning a falsy result, or using 0 as 'not found', breaks here." },
      { input: [[10000, 0], 2], hidden: true, edge: "extremes" },
      { input: [[41, 20, 65, 11, 29, 50, 91, 4, null, null, 32, null, null, 72, 99], 7], hidden: true },
      { input: [[5, 3, 7, 2, 4, 6, 8], 4], hidden: true },
      { input: [skewLeft(600, (i) => 600 - i), 1], hidden: true, edge: "skewed", note: "A 600-deep left chain: the smallest value is at the very bottom." },
      { input: [perfectBst(), 200], hidden: true, edge: "large" },
    ],
  },
  {
    slug: "binary-tree-right-side-view",
    functionName: "rightSideView",
    params: ["root"],
    returnType: "number[]",
    argTypes: ["TreeNode"],
    starter: "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode | null} root\n * @return {number[]}\n */\nfunction rightSideView(root) {\n  \n}",
    hints: [
      "Standing to the right of the tree, which single node at each depth would you see?",
      "At each depth, the visible node is the last one in left-to-right order. A level-by-level BFS makes that the last node of each level; a DFS that visits right before left sees the first node it reaches at each new depth.",
      "if root is empty: return empty list\nqueue = [root]\nview = empty list\nwhile queue is not empty:\n  size = number of items in queue\n  repeat size times:\n    node = remove front of queue\n    remember node as last\n    push node.left, node.right if they exist\n  add last.val to view\nreturn view",
    ],
    reference: `function rightSideView(root) {
      if (root === null) return [];
      const view = [];
      let level = [root];
      while (level.length) {
        view.push(level[level.length - 1].val);
        const next = [];
        for (const n of level) {
          if (n.left) next.push(n.left);
          if (n.right) next.push(n.right);
        }
        level = next;
      }
      return view;
    }`,
    brute: `function rightSideView(root) {
      const view = [];
      const walk = (node, depth) => {
        if (!node) return;
        view[depth] = node.val;
        walk(node.left, depth + 1);
        walk(node.right, depth + 1);
      };
      walk(root, 0);
      return view;
    }`,
    fuzz: `${GEN_HELPERS}
    function gen(rand) { return [__treeToLevelOrder(__rt(rand, Math.floor(rand() * 13), -9, 9))]; }`,
    cases: [
      { input: [[1, 2, 3, null, 5, null, 4]], hidden: false },
      { input: [[1, 2, 3, 4, null, null, null, 5]], hidden: false },
      { input: [[1, null, 3]], hidden: false },
      { input: [[]], hidden: false, edge: "null-input", note: "An empty tree has an empty view." },
      { input: [[1]], hidden: true, edge: "single" },
      { input: [[1, 2]], hidden: true, edge: "two", note: "Only a left child: from the right it is still the node you see on level 2." },
      { input: [[1, 2, 3, 4]], hidden: true, edge: "boundary", note: "The deepest level has only a left node. It is the visible one there; taking only right children misses it." },
      { input: [[5, 5, 5, 5, 5, 5, 5]], hidden: true, edge: "all-equal" },
      { input: [[0, -1, -2, null, -3]], hidden: true, edge: "negatives" },
      { input: [skewLeft(400)], hidden: true, edge: "skewed", note: "A left-only 400-deep chain: every node is visible, even though no node has a right child." },
      { input: [perfect(255)], hidden: true, edge: "large" },
    ],
  },
];
