/**
 * Building blocks for fuzz generators. Generators run as source text in node:vm (see vm-runner.ts), so these are
 * strings: `gen(body)` wraps a body that can call the helpers below and must return the argument array.
 */
const PRELUDE = `
function __r(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function __arr(rand, n, lo, hi) { return Array.from({ length: n }, function () { return __r(rand, lo, hi); }); }
function __sorted(rand, n, lo, hi) { return __arr(rand, n, lo, hi).sort(function (a, b) { return a - b; }); }
function __pick(rand, xs) { return xs[Math.floor(rand() * xs.length)]; }
function __str(rand, n, alphabet) { var s = ""; for (var i = 0; i < n; i++) s += alphabet[Math.floor(rand() * alphabet.length)]; return s; }
function __shuffle(rand, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
`;

export const gen = (body: string) => `${PRELUDE}\nfunction gen(rand) {\n${body}\n}`;

/** One integer array argument: length in [minN, maxN], values in [lo, hi]. */
export const arrayGen = (minN: number, maxN: number, lo: number, hi: number) => gen(`return [__arr(rand, __r(rand, ${minN}, ${maxN}), ${lo}, ${hi})];`);

/** A random tree in level order (values in [lo, hi], up to maxN nodes). */
export const TREE_PRELUDE = `
function __levelTree(rand, n, lo, hi) {
  if (n <= 0) return [];
  var root = new TreeNode(__r(rand, lo, hi));
  var all = [root];
  while (all.length < n) {
    var host = all[Math.floor(rand() * all.length)];
    var side = rand() < 0.5 ? "left" : "right";
    if (host[side] === null) { host[side] = new TreeNode(__r(rand, lo, hi)); all.push(host[side]); }
  }
  return __treeToLevelOrder(root);
}
function __bstLevel(rand, n, lo, hi) {
  var pool = __shuffle(rand, Array.from({ length: hi - lo + 1 }, function (_, i) { return lo + i; })).slice(0, n);
  var root = null;
  function ins(node, v) { if (!node) return new TreeNode(v); if (v < node.val) node.left = ins(node.left, v); else node.right = ins(node.right, v); return node; }
  for (var i = 0; i < pool.length; i++) root = ins(root, pool[i]);
  return __treeToLevelOrder(root);
}
`;

export const treeGen = (body: string) => gen(`${TREE_PRELUDE}\n${body}`);
