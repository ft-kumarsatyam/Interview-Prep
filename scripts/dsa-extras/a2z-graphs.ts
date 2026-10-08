import { define, tuf, type ProblemDef } from "./define";
import { gen } from "./gen";

/** Random simple undirected edge list on V vertices. */
const EDGES = `function __edges(rand, V, m) { var seen = {}, out = []; for (var t = 0; t < m * 4 && out.length < m; t++) { var u = __r(rand, 0, V - 1), v = __r(rand, 0, V - 1); if (u === v) continue; var k = Math.min(u, v) + "," + Math.max(u, v); if (seen[k]) continue; seen[k] = 1; out.push([u, v]); } return out; }`;
const WEDGES = `${EDGES}\nfunction __wedges(rand, V, m, lo, hi) { return __edges(rand, V, m).map(function (e) { return [e[0], e[1], __r(rand, lo, hi)]; }); }`;
/** Random DAG: edges only go from an earlier to a later vertex of a shuffled order. */
const DAG = `function __dag(rand, V, m, w) { var ord = __shuffle(rand, Array.from({ length: V }, function (_, i) { return i; })); var seen = {}, out = []; for (var t = 0; t < m * 4 && out.length < m; t++) { var a = __r(rand, 0, V - 1), b = __r(rand, 0, V - 1); if (a >= b) continue; var u = ord[a], v = ord[b], k = u + "," + v; if (seen[k]) continue; seen[k] = 1; out.push(w ? [u, v, __r(rand, 1, 9)] : [u, v]); } return out; }`;
const GRAPH_GEN = gen(`${EDGES}\nvar V = __r(rand, 1, 8); return [V, __edges(rand, V, __r(rand, 0, 10))];`);
const ADJ = `const adj = Array.from({ length: V }, () => []); for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }`;
const WADJ = `const adj = Array.from({ length: V }, () => []); for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }`;
/** Shared Bellman-Ford relaxation used by several brute forces (undirected when `both`). */
const RELAX = (both: boolean) => `const d = new Array(V).fill(Infinity); d[src] = 0; for (let i = 0; i < V; i++) for (const [u, v, w = 1] of edges) { if (d[u] + w < d[v]) d[v] = d[u] + w; ${both ? "if (d[v] + w < d[u]) d[u] = d[v] + w;" : ""} }`;

const traversals: ProblemDef = {
  slug: "traversal-techniques",
  title: "BFS and DFS of a Graph",
  difficulty: "Easy",
  pattern: "Graphs: BFS",
  url: tuf("traversal-techniques"),
  statement: "Given an undirected graph with `V` vertices as an adjacency list `adj` (`adj[u]` lists the neighbours of `u`, in the order they must be explored), return `[bfs, dfs]`: the breadth-first and the recursive depth-first visiting orders starting from vertex `0`. Only vertices reachable from `0` appear.",
  constraints: ["1 <= V <= 10^4"],
  fn: "graphTraversals",
  params: [["V", "number"], ["adj", "number[][]"]],
  returns: "number[][]",
  hints: [
    "Both traversals mark vertices as visited so nothing is processed twice. What differs is the order in which pending vertices are taken.",
    "BFS uses a queue and marks a vertex when it's enqueued. DFS recurses into each unvisited neighbour in adjacency order, recording a vertex when it's first entered.",
    "bfs: seen = {0}; queue = [0]\n  while queue: u = dequeue; record u\n    for v in adj[u]: if v not seen: mark; enqueue v\ndfs(u): mark u; record u\n  for v in adj[u]: if v not seen: dfs(v)\nreturn [bfs order, dfs order from 0]",
  ],
  reference: `function graphTraversals(V, adj) { const seen = new Array(V).fill(false), bfs = [0]; seen[0] = true; for (let h = 0; h < bfs.length; h++) for (const v of adj[bfs[h]]) if (!seen[v]) { seen[v] = true; bfs.push(v); } const vis = new Array(V).fill(false), dfs = []; const st = [0]; while (st.length) { const u = st.pop(); if (vis[u]) continue; vis[u] = true; dfs.push(u); for (let i = adj[u].length - 1; i >= 0; i--) if (!vis[adj[u][i]]) st.push(adj[u][i]); } return [bfs, dfs]; }`,
  brute: `function graphTraversals(V, adj) { const b = [], seen = new Set([0]); let level = [0]; while (level.length) { const next = []; for (const u of level) { b.push(u); for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); next.push(v); } } level = next; } const d = [], vis = new Set(); const go = (u) => { vis.add(u); d.push(u); for (const v of adj[u]) if (!vis.has(v)) go(v); }; go(0); return [b, d]; }`,
  fuzz: gen(`${EDGES}\nvar V = __r(rand, 1, 8); var adj = Array.from({ length: V }, function () { return []; }); __edges(rand, V, __r(rand, 0, 12)).forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); }); adj.forEach(function (l) { __shuffle(rand, l); }); return [V, adj];`),
  examples: [[5, [[2, 3, 1], [0], [0, 4], [0], [2]]], [4, [[1, 3], [2, 0], [1], [0]]]],
  edges: [
    ["single", [1, [[]]]],
    ["no-answer", [3, [[], [2], [1]]], "Vertices 1 and 2 aren't reachable from 0."],
    ["cycle", [3, [[1, 2], [0, 2], [0, 1]]]],
  ],
};

const components: ProblemDef = {
  slug: "connected-components",
  title: "Number of Connected Components",
  difficulty: "Medium",
  pattern: "Graphs: Union-Find",
  url: tuf("connected-components"),
  statement: "Given `V` vertices numbered `0` to `V - 1` and a list of undirected `edges`, return the number of connected components.",
  constraints: ["1 <= V <= 10^5", "0 <= edges.length <= 10^5"],
  fn: "countComponents",
  params: [["V", "number"], ["edges", "number[][]"]],
  returns: "number",
  hints: [
    "Each traversal started from an unvisited vertex covers exactly one component.",
    "Either run DFS/BFS from every unvisited vertex and count the starts, or union the endpoints of every edge in a disjoint set and count the roots.",
    "parent[i] = i for all i; count = V\nfor (u, v) in edges:\n  a = find(u); b = find(v)\n  if a != b: parent[a] = b; count -= 1\nreturn count",
  ],
  reference: `function countComponents(V, edges) { const p = Array.from({ length: V }, (_, i) => i); const f = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }; let c = V; for (const [u, v] of edges) { const a = f(u), b = f(v); if (a !== b) { p[a] = b; c--; } } return c; }`,
  brute: `function countComponents(V, edges) { ${ADJ} const seen = new Set(); let c = 0; const go = (u) => { seen.add(u); for (const v of adj[u]) if (!seen.has(v)) go(v); }; for (let u = 0; u < V; u++) if (!seen.has(u)) { c++; go(u); } return c; }`,
  fuzz: GRAPH_GEN,
  examples: [[5, [[0, 1], [1, 2], [3, 4]]], [4, [[0, 1], [1, 2], [2, 3]]]],
  edges: [
    ["empty", [3, []], "No edges: every vertex is its own component."],
    ["single", [1, []]],
    ["cycle", [3, [[0, 1], [1, 2], [2, 0]]]],
  ],
};

const distinctIslands: ProblemDef = {
  slug: "number-of-distinct-islands",
  title: "Number of Distinct Islands",
  difficulty: "Medium",
  pattern: "Graphs: DFS",
  url: tuf("number-of-distinct-islands"),
  statement: "Given a grid of `0`s (water) and `1`s (land), an island is a group of land cells connected up, down, left or right. Two islands are the same if one can be **translated** (not rotated or reflected) to match the other. Return the number of distinct islands.",
  constraints: ["1 <= rows, cols <= 500"],
  fn: "countDistinctIslands",
  params: [["grid", "number[][]"]],
  returns: "number",
  hints: [
    "Translation doesn't change the offsets of an island's cells from its first cell. How can that become a key?",
    "Flood-fill each island from its first cell (in row-major order), record every cell as (row - r0, col - c0), turn the list into a string and add it to a set.",
    "shapes = set\nfor each land cell (r0, c0) not yet seen:\n  cells = flood fill from it, marking seen\n  key = sorted list of (r - r0, c - c0) as a string\n  shapes.add(key)\nreturn size of shapes",
  ],
  reference: `function countDistinctIslands(grid) { const R = grid.length, C = grid[0].length, seen = grid.map((r) => r.map(() => false)), shapes = new Set(); for (let r0 = 0; r0 < R; r0++) for (let c0 = 0; c0 < C; c0++) { if (grid[r0][c0] !== 1 || seen[r0][c0]) continue; const cells = [], st = [[r0, c0]]; seen[r0][c0] = true; while (st.length) { const [r, c] = st.pop(); cells.push((r - r0) + ":" + (c - c0)); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < R && b < C && grid[a][b] === 1 && !seen[a][b]) { seen[a][b] = true; st.push([a, b]); } } } shapes.add(cells.sort().join("|")); } return shapes.size; }`,
  brute: `function countDistinctIslands(grid) { const R = grid.length, C = grid[0].length, id = grid.map((r) => r.map(() => -1)); let k = 0; const fill = (r, c) => { if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] !== 1 || id[r][c] >= 0) return; id[r][c] = k; fill(r + 1, c); fill(r - 1, c); fill(r, c + 1); fill(r, c - 1); }; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] === 1 && id[r][c] < 0) { fill(r, c); k++; } const keys = new Set(); for (let i = 0; i < k; i++) { const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (id[r][c] === i) cells.push([r, c]); const mr = Math.min(...cells.map((x) => x[0])), mc = Math.min(...cells.map((x) => x[1])); keys.add(JSON.stringify(cells.map(([r, c]) => [r - mr, c - mc]))); } return keys.size; }`,
  fuzz: gen(`var R = __r(rand, 1, 6), C = __r(rand, 1, 6); return [Array.from({ length: R }, function () { return __arr(rand, C, 0, 1); })];`),
  examples: [[[[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 0, 1, 1], [0, 0, 0, 1, 1]]], [[[1, 1, 0, 1, 1], [1, 0, 0, 0, 0], [0, 0, 0, 0, 1], [1, 1, 0, 1, 1]]]],
  edges: [
    ["no-answer", [[[0, 0], [0, 0]]], "All water: zero islands."],
    ["single", [[[1]]]],
    ["order", [[[1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]], "An L and a mirrored L are different shapes."],
  ],
};

const topo: ProblemDef = {
  slug: "topological-sort-or-kahns-algorithm",
  title: "Topological Sort (Kahn's Algorithm)",
  difficulty: "Medium",
  pattern: "Graphs: Topological Sort",
  url: tuf("topological-sort-or-kahns-algorithm"),
  statement: "Given a directed acyclic graph with `V` vertices and directed `edges` (`[u, v]` means `u` must come before `v`), return a topological order. Several orders may be valid: return the **lexicographically smallest** one (always take the smallest available vertex).",
  constraints: ["1 <= V <= 10^4", "The graph has no cycle"],
  fn: "topoSort",
  params: [["V", "number"], ["edges", "number[][]"]],
  returns: "number[]",
  hints: [
    "A vertex can be placed once every edge into it has been satisfied. Which vertices can start?",
    "Kahn's algorithm: compute in-degrees, keep the vertices with in-degree 0 in a min-heap, repeatedly take the smallest, output it and decrement its neighbours' in-degrees.",
    "indeg = in-degree of every vertex\nready = min-heap of vertices with indeg 0\nwhile ready not empty:\n  u = pop smallest; output u\n  for v in out[u]: indeg[v] -= 1; if indeg[v] == 0: push v\nreturn output",
  ],
  reference: `function topoSort(V, edges) { const out = Array.from({ length: V }, () => []), indeg = new Array(V).fill(0); for (const [u, v] of edges) { out[u].push(v); indeg[v]++; } const ready = []; for (let i = 0; i < V; i++) if (!indeg[i]) ready.push(i); const res = []; while (ready.length) { let b = 0; for (let i = 1; i < ready.length; i++) if (ready[i] < ready[b]) b = i; const u = ready.splice(b, 1)[0]; res.push(u); for (const v of out[u]) if (--indeg[v] === 0) ready.push(v); } return res; }`,
  brute: `function topoSort(V, edges) { const done = new Set(), res = []; while (res.length < V) { for (let u = 0; u < V; u++) { if (done.has(u)) continue; if (edges.every(([a, b]) => b !== u || done.has(a))) { done.add(u); res.push(u); break; } } } return res; }`,
  fuzz: gen(`${DAG}\nvar V = __r(rand, 1, 8); return [V, __dag(rand, V, __r(rand, 0, 12), false)];`),
  examples: [[6, [[5, 0], [4, 0], [5, 2], [2, 3], [3, 1], [4, 1]]], [4, [[3, 0], [1, 0], [2, 0]]]],
  edges: [
    ["empty", [3, []], "No edges: 0, 1, 2."],
    ["single", [1, []]],
    ["reverse-sorted", [4, [[3, 2], [2, 1], [1, 0]]], "A chain forces the only order."],
  ],
};

const alien: ProblemDef = {
  slug: "alien-dictionary",
  title: "Alien Dictionary",
  difficulty: "Hard",
  pattern: "Graphs: Topological Sort",
  url: tuf("alient-dictionary"),
  statement: "An alien language uses the first `k` letters of the English alphabet in an unknown order. `words` is sorted by that order. Return the order of the `k` letters as a string. Several orders may fit: return the **lexicographically smallest** one (when several letters are free, take the earliest in the English alphabet). The input is always consistent.",
  constraints: ["1 <= words.length <= 100", "1 <= k <= 26"],
  fn: "alienOrder",
  params: [["words", "string[]"], ["k", "number"]],
  returns: "string",
  hints: [
    "Two adjacent words tell you exactly one thing: the order of the first letters where they differ.",
    "Build a graph on the k letters with an edge from a[i] to b[i] at the first difference of every adjacent pair, then run Kahn's algorithm, always taking the smallest ready letter.",
    "for each adjacent pair (a, b):\n  i = first index where a[i] != b[i]; if found: add edge a[i] -> b[i]\nready = min-heap of letters with in-degree 0\nwhile ready not empty:\n  c = pop smallest; append c\n  for d in out[c]: indeg[d] -= 1; if 0: push d\nreturn the string",
  ],
  reference: `function alienOrder(words, k) { const out = Array.from({ length: k }, () => new Set()), indeg = new Array(k).fill(0); for (let w = 0; w + 1 < words.length; w++) { const a = words[w], b = words[w + 1]; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) { const x = a.charCodeAt(i) - 97, y = b.charCodeAt(i) - 97; if (!out[x].has(y)) { out[x].add(y); indeg[y]++; } break; } } const ready = []; for (let i = 0; i < k; i++) if (!indeg[i]) ready.push(i); let s = ""; while (ready.length) { let b = 0; for (let i = 1; i < ready.length; i++) if (ready[i] < ready[b]) b = i; const u = ready.splice(b, 1)[0]; s += String.fromCharCode(97 + u); for (const v of out[u]) if (--indeg[v] === 0) ready.push(v); } return s; }`,
  brute: `function alienOrder(words, k) { const letters = Array.from({ length: k }, (_, i) => String.fromCharCode(97 + i)); const fits = (ord) => { const r = {}; ord.forEach((c, i) => (r[c] = i)); for (let w = 0; w + 1 < words.length; w++) { const a = words[w], b = words[w + 1]; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) { if (r[a[i]] > r[b[i]]) return false; break; } } return true; }; let found = null; const perm = (cur, left) => { if (found) return; if (!left.length) { if (fits(cur)) found = cur.join(""); return; } for (let i = 0; i < left.length; i++) perm([...cur, left[i]], [...left.slice(0, i), ...left.slice(i + 1)]); }; perm([], letters); return found; }`,
  fuzz: gen(`var k = __r(rand, 1, 6); var al = "abcdef".slice(0, k).split(""); var ord = __shuffle(rand, al.slice()); var rank = {}; ord.forEach(function (c, i) { rank[c] = i; }); var n = __r(rand, 1, 7); var ws = []; for (var i = 0; i < n; i++) ws.push(__str(rand, __r(rand, 1, 4), al)); ws.sort(function (a, b) { for (var i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return rank[a[i]] - rank[b[i]]; return a.length - b.length; }); return [ws, k];`),
  examples: [[["baa", "abcd", "abca", "cab", "cad"], 4], [["caa", "aaa", "aab"], 3]],
  edges: [
    ["single", [["a"], 1]],
    ["no-answer", [["ab", "abc"], 3], "No pair differs: every letter is free, so alphabetical order."],
    ["duplicates", [["b", "b", "a"], 2]],
  ],
};

const dagShortest: ProblemDef = {
  slug: "shortest-path-in-dag",
  title: "Shortest Path in a Weighted DAG",
  difficulty: "Medium",
  pattern: "Graphs: Shortest Path",
  url: tuf("shortest-path-in-dag"),
  statement: "Given a directed acyclic graph with `V` vertices and weighted `edges` (`[u, v, w]` is an edge from `u` to `v` of weight `w`), return the shortest distance from vertex `0` to every vertex, using `-1` for vertices that can't be reached.",
  constraints: ["1 <= V <= 100", "1 <= w <= 10^4"],
  fn: "shortestPathDAG",
  params: [["V", "number"], ["edges", "number[][]"]],
  returns: "number[]",
  hints: [
    "In a DAG you can process vertices so that every edge into a vertex is handled before you leave it.",
    "Get a topological order, set dist[0] = 0, and relax every outgoing edge of each vertex in that order. Each edge is relaxed once.",
    "order = topological order of the DAG\ndist = infinity everywhere; dist[0] = 0\nfor u in order:\n  if dist[u] is finite:\n    for (v, w) in out[u]: dist[v] = min(dist[v], dist[u] + w)\nreplace infinity with -1",
  ],
  reference: `function shortestPathDAG(V, edges) { const out = Array.from({ length: V }, () => []), indeg = new Array(V).fill(0); for (const [u, v, w] of edges) { out[u].push([v, w]); indeg[v]++; } const q = []; for (let i = 0; i < V; i++) if (!indeg[i]) q.push(i); const d = new Array(V).fill(Infinity); d[0] = 0; for (let h = 0; h < q.length; h++) { const u = q[h]; for (const [v, w] of out[u]) { if (d[u] + w < d[v]) d[v] = d[u] + w; if (--indeg[v] === 0) q.push(v); } } return d.map((x) => (x === Infinity ? -1 : x)); }`,
  brute: `function shortestPathDAG(V, edges) { const src = 0; ${RELAX(false)} return d.map((x) => (x === Infinity ? -1 : x)); }`,
  fuzz: gen(`${DAG}\nvar V = __r(rand, 1, 8); return [V, __dag(rand, V, __r(rand, 0, 14), true)];`),
  examples: [[4, [[0, 1, 2], [0, 2, 1], [2, 1, 1], [1, 3, 3]]], [6, [[0, 1, 2], [0, 4, 1], [4, 5, 4], [4, 2, 2], [1, 2, 3], [2, 3, 6], [5, 3, 1]]]],
  edges: [
    ["single", [1, []]],
    ["no-answer", [3, [[1, 2, 5]]], "Vertices 1 and 2 aren't reachable from 0."],
    ["order", [3, [[1, 0, 4], [2, 1, 1]]], "Edges into 0 never help."],
  ],
};

const unitShortest: ProblemDef = {
  slug: "shortest-path-in-undirected-graph-with-unit-weights",
  title: "Shortest Path with Unit Weights",
  difficulty: "Medium",
  pattern: "Graphs: BFS",
  url: tuf("shortest-path-in-undirected-graph-with-unit-weights"),
  statement: "Given an undirected graph with `V` vertices, unweighted `edges` and a source `src`, return the minimum number of edges from `src` to every vertex, using `-1` for vertices that can't be reached.",
  constraints: ["1 <= V <= 10^4"],
  fn: "shortestPathUnit",
  params: [["V", "number"], ["edges", "number[][]"], ["src", "number"]],
  returns: "number[]",
  hints: [
    "When every edge costs the same, which traversal reaches vertices in order of distance?",
    "BFS from src: the first time you reach a vertex, its distance is its parent's distance + 1.",
    "dist = -1 everywhere; dist[src] = 0; queue = [src]\nwhile queue not empty:\n  u = dequeue\n  for v in adj[u]:\n    if dist[v] == -1: dist[v] = dist[u] + 1; enqueue v\nreturn dist",
  ],
  reference: `function shortestPathUnit(V, edges, src) { ${ADJ} const d = new Array(V).fill(-1); d[src] = 0; const q = [src]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (d[v] < 0) { d[v] = d[q[h]] + 1; q.push(v); } return d; }`,
  brute: `function shortestPathUnit(V, edges, src) { ${RELAX(true)} return d.map((x) => (x === Infinity ? -1 : x)); }`,
  fuzz: gen(`${EDGES}\nvar V = __r(rand, 1, 8); return [V, __edges(rand, V, __r(rand, 0, 10)), __r(rand, 0, V - 1)];`),
  examples: [[9, [[0, 1], [0, 3], [3, 4], [4, 5], [5, 6], [1, 2], [2, 6], [6, 7], [7, 8], [6, 8]], 0], [4, [[0, 1], [1, 2]], 1]],
  edges: [
    ["single", [1, [], 0]],
    ["no-answer", [3, [[0, 1]], 0], "Vertex 2 is isolated."],
    ["cycle", [4, [[0, 1], [1, 2], [2, 3], [3, 0]], 2]],
  ],
};

const dijkstra: ProblemDef = {
  slug: "dijkstras-algorithm",
  title: "Dijkstra's Algorithm",
  difficulty: "Medium",
  pattern: "Graphs: Shortest Path",
  url: tuf("dijkstra's-algorithm"),
  statement: "Given an undirected graph with `V` vertices, weighted `edges` (`[u, v, w]`, `w >= 0`) and a source `src`, return the shortest distance from `src` to every vertex, using `-1` for vertices that can't be reached.",
  constraints: ["1 <= V <= 10^4", "0 <= w <= 10^4"],
  fn: "dijkstra",
  params: [["V", "number"], ["edges", "number[][]"], ["src", "number"]],
  returns: "number[]",
  hints: [
    "With non-negative weights, the closest unfinished vertex can't get any closer. Why?",
    "Keep a min-heap of (distance, vertex). Pop the smallest, skip it if stale, and relax its edges, pushing improved distances.",
    "dist = infinity; dist[src] = 0; heap = [(0, src)]\nwhile heap not empty:\n  (d, u) = pop smallest\n  if d > dist[u]: continue\n  for (v, w) in adj[u]:\n    if d + w < dist[v]: dist[v] = d + w; push (dist[v], v)\nreplace infinity with -1",
  ],
  reference: `function dijkstra(V, edges, src) { ${WADJ} const d = new Array(V).fill(Infinity), done = new Array(V).fill(false); d[src] = 0; for (let it = 0; it < V; it++) { let u = -1; for (let i = 0; i < V; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i; if (u < 0) break; done[u] = true; for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w; } return d.map((x) => (x === Infinity ? -1 : x)); }`,
  brute: `function dijkstra(V, edges, src) { ${RELAX(true)} return d.map((x) => (x === Infinity ? -1 : x)); }`,
  fuzz: gen(`${WEDGES}\nvar V = __r(rand, 1, 8); return [V, __wedges(rand, V, __r(rand, 0, 12), 0, 9), __r(rand, 0, V - 1)];`),
  examples: [[3, [[0, 1, 1], [0, 2, 6], [1, 2, 3]], 2], [2, [[0, 1, 9]], 0]],
  edges: [
    ["single", [1, [], 0]],
    ["no-answer", [3, [[0, 1, 4]], 0]],
    ["zeros", [3, [[0, 1, 0], [1, 2, 0]], 0], "Zero-weight edges are allowed."],
  ],
};

const printPath: ProblemDef = {
  slug: "print-shortest-path",
  title: "Print the Shortest Path",
  difficulty: "Hard",
  pattern: "Graphs: Shortest Path",
  url: tuf("print-shortest-path-"),
  statement: "Given an undirected weighted graph with vertices `1` to `n` and `edges` (`[u, v, w]`), return the vertices of the shortest path from `1` to `n`, in order. Every weight is a different power of two, so the shortest path is unique. Return `[-1]` if `n` can't be reached.",
  constraints: ["2 <= n <= 10^4"],
  fn: "shortestPath",
  params: [["n", "number"], ["edges", "number[][]"]],
  returns: "number[]",
  hints: [
    "Dijkstra gives distances. What extra bit of information per vertex lets you rebuild the path?",
    "Whenever you improve dist[v] through u, set parent[v] = u. After Dijkstra, walk parent pointers back from n to 1 and reverse.",
    "run Dijkstra from 1, setting parent[v] = u on every improvement\nif dist[n] is infinite: return [-1]\npath = []; x = n\nwhile x != 1: path.add(x); x = parent[x]\npath.add(1)\nreturn reverse(path)",
  ],
  reference: `function shortestPath(n, edges) { const adj = Array.from({ length: n + 1 }, () => []); for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); } const d = new Array(n + 1).fill(Infinity), par = new Array(n + 1).fill(0), done = new Array(n + 1).fill(false); d[1] = 0; for (;;) { let u = -1; for (let i = 1; i <= n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i; if (u < 0) break; done[u] = true; for (const [v, w] of adj[u]) if (d[u] + w < d[v]) { d[v] = d[u] + w; par[v] = u; } } if (d[n] === Infinity) return [-1]; const p = []; for (let x = n; x !== 1; x = par[x]) p.push(x); p.push(1); return p.reverse(); }`,
  brute: `function shortestPath(n, edges) { let best = null, bestW = Infinity; const go = (u, path, w, seen) => { if (w >= bestW) return; if (u === n) { best = path.slice(); bestW = w; return; } for (const [a, b, c] of edges) { const v = a === u ? b : b === u ? a : 0; if (v && !seen.has(v)) { seen.add(v); path.push(v); go(v, path, w + c, seen); path.pop(); seen.delete(v); } } }; go(1, [1], 0, new Set([1])); return best || [-1]; }`,
  fuzz: gen(`var n = __r(rand, 2, 7); var seen = {}, es = []; var m = __r(rand, 1, 10); for (var t = 0; t < 40 && es.length < m; t++) { var u = __r(rand, 1, n), v = __r(rand, 1, n); if (u === v) continue; var k = Math.min(u, v) + "," + Math.max(u, v); if (seen[k]) continue; seen[k] = 1; es.push([u, v]); } var pw = __shuffle(rand, Array.from({ length: es.length }, function (_, i) { return Math.pow(2, i); })); return [n, es.map(function (e, i) { return [e[0], e[1], pw[i]]; })];`),
  examples: [[5, [[1, 2, 2], [2, 5, 4], [2, 3, 8], [1, 4, 1], [4, 3, 16], [3, 5, 32]]], [4, [[1, 2, 1], [2, 3, 2], [3, 4, 4], [1, 4, 8]]]],
  edges: [
    ["no-answer", [3, [[1, 2, 1]]], "Vertex 3 is unreachable."],
    ["two", [2, [[1, 2, 4]]]],
    ["order", [4, [[1, 4, 16], [1, 2, 1], [2, 3, 2], [3, 4, 4]]], "The direct edge loses to the cheaper detour."],
  ],
};

const minMult: ProblemDef = {
  slug: "minimum-multiplications-to-reach-end",
  title: "Minimum Multiplications to Reach End",
  difficulty: "Medium",
  pattern: "Graphs: BFS",
  url: tuf("minimum-multiplications-to-reach-end"),
  statement: "Starting from `start`, one step multiplies the current number by any value in `arr` and takes the result modulo `100000`. Return the minimum number of steps to reach `end`, or `-1` if it's impossible.",
  constraints: ["1 <= arr.length <= 10^4", "1 <= arr[i] <= 10^4", "0 <= start, end < 100000"],
  fn: "minimumMultiplications",
  params: [["arr", "number[]"], ["start", "number"], ["end", "number"]],
  returns: "number",
  hints: [
    "There are only 100000 possible values. Think of each value as a vertex and each multiplication as an edge of cost 1.",
    "BFS from start over values 0..99999, with neighbours (x * a) % 100000 for every a in arr. The level at which you first reach end is the answer.",
    "if start == end: return 0\ndist = -1 for all 100000 values; dist[start] = 0; queue = [start]\nwhile queue not empty:\n  x = dequeue\n  for a in arr:\n    y = (x * a) % 100000\n    if dist[y] == -1: dist[y] = dist[x] + 1; if y == end: return dist[y]; enqueue y\nreturn -1",
  ],
  reference: `function minimumMultiplications(arr, start, end) { if (start === end) return 0; const M = 100000, d = new Int32Array(M).fill(-1); d[start] = 0; const q = [start]; for (let h = 0; h < q.length; h++) { const x = q[h]; for (const a of arr) { const y = (x * a) % M; if (d[y] < 0) { d[y] = d[x] + 1; if (y === end) return d[y]; q.push(y); } } } return -1; }`,
  brute: `function minimumMultiplications(arr, start, end) { const M = 100000; const seen = new Set([start]); let level = [start], steps = 0; while (level.length) { if (level.includes(end)) return steps; const next = []; for (const x of level) for (const a of arr) { const y = (x * a) % M; if (!seen.has(y)) { seen.add(y); next.push(y); } } level = next; steps++; } return -1; }`,
  fuzz: gen(`return [__arr(rand, __r(rand, 1, 3), 1, 20), __r(rand, 1, 30), __r(rand, 1, 600)];`),
  examples: [[[2, 5, 7], 3, 30], [[3, 4, 65], 7, 66175]],
  edges: [
    ["boundary", [[2, 3], 9, 9], "Already there: 0 steps."],
    ["no-answer", [[2], 1, 3], "Powers of two never give 3."],
    ["zeros", [[10], 7, 0], "Multiplying 7 by 10 five times wraps to 0."],
  ],
};

const bellmanFord: ProblemDef = {
  slug: "bellman-ford-algorithm",
  title: "Bellman-Ford Algorithm",
  difficulty: "Medium",
  pattern: "Graphs: Shortest Path",
  url: tuf("bellman-ford-algorithm"),
  statement: "Given a directed graph with `V` vertices, weighted `edges` (`[u, v, w]`, `w` may be negative) and a source `src`, return the shortest distance from `src` to every vertex, using `100000000` for vertices that can't be reached. If a negative-weight cycle is reachable from `src`, return `[-1]`.",
  constraints: ["1 <= V <= 500", "-1000 <= w <= 1000"],
  fn: "bellmanFord",
  params: [["V", "number"], ["edges", "number[][]"], ["src", "number"]],
  returns: "number[]",
  hints: [
    "A shortest path without cycles uses at most V - 1 edges. How many rounds of relaxing every edge does that need?",
    "Relax all edges V - 1 times (skipping edges out of unreached vertices). If one more round still improves a distance, a reachable negative cycle exists.",
    "dist = INF everywhere; dist[src] = 0\nrepeat V - 1 times:\n  for (u, v, w) in edges:\n    if dist[u] != INF and dist[u] + w < dist[v]: dist[v] = dist[u] + w\nfor (u, v, w) in edges:\n  if dist[u] != INF and dist[u] + w < dist[v]: return [-1]\nreturn dist",
  ],
  reference: `function bellmanFord(V, edges, src) { const INF = 1e8, d = new Array(V).fill(INF); d[src] = 0; for (let i = 0; i < V - 1; i++) for (const [u, v, w] of edges) if (d[u] !== INF && d[u] + w < d[v]) d[v] = d[u] + w; for (const [u, v, w] of edges) if (d[u] !== INF && d[u] + w < d[v]) return [-1]; return d; }`,
  brute: `function bellmanFord(V, edges, src) { const I = Infinity, m = Array.from({ length: V }, (_, i) => Array.from({ length: V }, (_, j) => (i === j ? 0 : I))); for (const [u, v, w] of edges) m[u][v] = Math.min(m[u][v], w); for (let k = 0; k < V; k++) for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) if (m[i][k] + m[k][j] < m[i][j]) m[i][j] = m[i][k] + m[k][j]; for (let x = 0; x < V; x++) if (m[src][x] < I && m[x][x] < 0) return [-1]; return m[src].map((x) => (x === I ? 1e8 : x)); }`,
  fuzz: gen(`var V = __r(rand, 1, 6); var es = []; var m = __r(rand, 0, 9); for (var i = 0; i < m; i++) { var u = __r(rand, 0, V - 1), v = __r(rand, 0, V - 1); if (u !== v) es.push([u, v, __r(rand, -3, 9)]); } return [V, es, __r(rand, 0, V - 1)];`),
  examples: [[3, [[0, 1, 5], [1, 0, 3], [1, 2, -1], [2, 0, 1]], 2], [2, [[0, 1, 9]], 1]],
  edges: [
    ["single", [1, [], 0]],
    ["negatives", [3, [[0, 1, 1], [1, 2, -2], [2, 1, 1]], 0], "1 -> 2 -> 1 has weight -1: a negative cycle."],
    ["no-answer", [3, [[1, 2, -5], [2, 1, 1]], 0], "The negative cycle isn't reachable from 0, so distances are returned."],
  ],
};

const floyd: ProblemDef = {
  slug: "floyd-warshall-algorithm",
  title: "Floyd-Warshall Algorithm",
  difficulty: "Medium",
  pattern: "Graphs: Shortest Path",
  url: tuf("floyd-warshall-algorithm"),
  statement: "`matrix[i][j]` is the weight of the directed edge from `i` to `j` (non-negative), or `-1` if there is no edge; the diagonal is `0`. Return the matrix of shortest distances between every pair, with `-1` where `j` can't be reached from `i`.",
  constraints: ["1 <= n <= 100", "0 <= weights <= 1000"],
  fn: "shortestDistance",
  params: [["matrix", "number[][]"]],
  returns: "number[][]",
  hints: [
    "Build shortest paths by gradually allowing more intermediate vertices.",
    "Replace -1 with infinity. For each k, for each pair (i, j), dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]). Convert infinity back to -1.",
    "d = matrix with -1 replaced by infinity\nfor k in 0..n-1:\n  for i in 0..n-1:\n    for j in 0..n-1:\n      d[i][j] = min(d[i][j], d[i][k] + d[k][j])\nreturn d with infinity replaced by -1",
  ],
  reference: `function shortestDistance(matrix) { const n = matrix.length, d = matrix.map((r) => r.map((x) => (x < 0 ? Infinity : x))); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j]; return d.map((r) => r.map((x) => (x === Infinity ? -1 : x))); }`,
  brute: `function shortestDistance(matrix) { const n = matrix.length; return matrix.map((_, s) => { const d = new Array(n).fill(Infinity), done = new Array(n).fill(false); d[s] = 0; for (let it = 0; it < n; it++) { let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || d[i] < d[u])) u = i; if (d[u] === Infinity) break; done[u] = true; for (let v = 0; v < n; v++) if (matrix[u][v] >= 0 && d[u] + matrix[u][v] < d[v]) d[v] = d[u] + matrix[u][v]; } return d.map((x) => (x === Infinity ? -1 : x)); }); }`,
  fuzz: gen(`var n = __r(rand, 1, 6); return [Array.from({ length: n }, function (_, i) { return Array.from({ length: n }, function (_, j) { return i === j ? 0 : rand() < 0.45 ? -1 : __r(rand, 0, 9); }); })];`),
  examples: [[[[0, 1, 43], [1, 0, 6], [-1, -1, 0]]], [[[0, 25], [-1, 0]]]],
  edges: [
    ["single", [[[0]]]],
    ["no-answer", [[[0, -1], [-1, 0]]], "No edges at all."],
    ["order", [[[0, 9, 1], [-1, 0, -1], [-1, 2, 0]]], "Going through vertex 2 beats the direct edge."],
  ],
};

const dsu: ProblemDef = {
  slug: "disjoint-set",
  title: "Disjoint Set (Union-Find)",
  difficulty: "Medium",
  pattern: "Graphs: Union-Find",
  url: tuf("disjoint-set-"),
  statement: "Implement `DisjointSet` over non-negative integer elements, each starting in its own set:\n\n- `unionSets(u, v)` merges the sets containing `u` and `v`.\n- `connected(u, v)` returns whether `u` and `v` are in the same set.\n\nUse union by size (or rank) and path compression.\n\nThe judge drives your class through `runOps(ops)`: each operation is `[method, ...args]`, and the answer is the list of values the calls return (`null` for methods that return nothing).",
  constraints: ["0 <= u, v <= 10^5", "1 <= ops.length <= 10^5"],
  fn: "runOps",
  params: [["ops", "Array<Array<string | number>>"]],
  returns: "Array<boolean | null>",
  starter: "class DisjointSet {\n  constructor() {\n    \n  }\n  unionSets(u, v) {\n    \n  }\n  connected(u, v) {\n    \n  }\n}\n\n/**\n * Runs the operations and collects each result. Don't change this function.\n * @param {Array<Array<string | number>>} ops\n * @return {Array<boolean | null>}\n */\nfunction runOps(ops) {\n  const obj = new DisjointSet();\n  return ops.map(([op, ...args]) => {\n    const out = obj[op](...args);\n    return out === undefined ? null : out;\n  });\n}",
  hints: [
    "Represent each set as a tree whose root is the set's name. When are two elements in the same set?",
    "find(x) follows parents to the root, pointing every visited node straight at the root. unionSets links the smaller tree's root under the larger one. connected compares roots.",
    "find(x): if parent[x] is unset: parent[x] = x; size[x] = 1\n  if parent[x] != x: parent[x] = find(parent[x])\n  return parent[x]\nunionSets(u, v): a = find(u); b = find(v); if a == b: return\n  attach the smaller of a, b under the larger; add sizes\nconnected(u, v): return find(u) == find(v)",
  ],
  reference: `class DisjointSet { constructor() { this.p = new Map(); this.s = new Map(); } find(x) { if (!this.p.has(x)) { this.p.set(x, x); this.s.set(x, 1); } let r = x; while (this.p.get(r) !== r) r = this.p.get(r); while (this.p.get(x) !== r) { const n = this.p.get(x); this.p.set(x, r); x = n; } return r; } unionSets(u, v) { let a = this.find(u), b = this.find(v); if (a === b) return; if (this.s.get(a) < this.s.get(b)) [a, b] = [b, a]; this.p.set(b, a); this.s.set(a, this.s.get(a) + this.s.get(b)); } connected(u, v) { return this.find(u) === this.find(v); } }\nfunction runOps(ops) { const obj = new DisjointSet(); return ops.map(([op, ...args]) => { const out = obj[op](...args); return out === undefined ? null : out; }); }`,
  brute: `class DisjointSet { constructor() { this.e = []; } unionSets(u, v) { this.e.push([u, v]); } connected(u, v) { const seen = new Set([u]), st = [u]; while (st.length) { const x = st.pop(); for (const [a, b] of this.e) for (const [p, q] of [[a, b], [b, a]]) if (p === x && !seen.has(q)) { seen.add(q); st.push(q); } } return seen.has(v); } }\nfunction runOps(ops) { const obj = new DisjointSet(); return ops.map(([op, ...args]) => { const out = obj[op](...args); return out === undefined ? null : out; }); }`,
  fuzz: gen(`var n = __r(rand, 1, 14); var ops = []; for (var i = 0; i < n; i++) ops.push([rand() < 0.5 ? "unionSets" : "connected", __r(rand, 0, 6), __r(rand, 0, 6)]); ops.push(["connected", __r(rand, 0, 6), __r(rand, 0, 6)]); return [ops];`),
  examples: [[[["unionSets", 1, 2], ["unionSets", 2, 3], ["connected", 1, 3], ["connected", 1, 4]]], [[["connected", 5, 5], ["unionSets", 4, 5], ["connected", 5, 4]]]],
  edges: [
    ["single", [[["connected", 0, 0]]], "Every element is in its own set."],
    ["no-answer", [[["unionSets", 1, 2], ["unionSets", 3, 4], ["connected", 2, 3]]]],
    ["duplicates", [[["unionSets", 1, 2], ["unionSets", 2, 1], ["connected", 1, 2]]]],
  ],
};

const mst: ProblemDef = {
  slug: "find-the-mst-weight",
  title: "Minimum Spanning Tree Weight",
  difficulty: "Medium",
  pattern: "Graphs: MST",
  url: tuf("find-the-mst-weight"),
  statement: "Given a connected undirected graph with `V` vertices and weighted `edges` (`[u, v, w]`), return the total weight of a minimum spanning tree.",
  constraints: ["1 <= V <= 1000", "V - 1 <= edges.length <= 10^4", "0 <= w <= 1000", "The graph is connected"],
  fn: "spanningTree",
  params: [["V", "number"], ["edges", "number[][]"]],
  returns: "number",
  hints: [
    "The cheapest edge that joins two separate pieces is always safe to take. Why?",
    "Kruskal: sort edges by weight and add each edge whose endpoints are in different disjoint sets. (Prim's algorithm with a min-heap also works.)",
    "sort edges by weight\nparent[i] = i; total = 0\nfor (u, v, w) in edges:\n  if find(u) != find(v):\n    union(u, v); total += w\nreturn total",
  ],
  reference: `function spanningTree(V, edges) { const p = Array.from({ length: V }, (_, i) => i); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); let t = 0; for (const [u, v, w] of edges.slice().sort((a, b) => a[2] - b[2])) { const a = f(u), b = f(v); if (a !== b) { p[a] = b; t += w; } } return t; }`,
  brute: `function spanningTree(V, edges) { const inT = new Array(V).fill(false), key = new Array(V).fill(Infinity); key[0] = 0; let t = 0; for (let it = 0; it < V; it++) { let u = -1; for (let i = 0; i < V; i++) if (!inT[i] && (u < 0 || key[i] < key[u])) u = i; inT[u] = true; t += key[u]; for (const [a, b, w] of edges) { const v = a === u ? b : b === u ? a : -1; if (v >= 0 && !inT[v] && w < key[v]) key[v] = w; } } return t; }`,
  fuzz: gen(`${EDGES}\nvar V = __r(rand, 1, 8); var es = []; for (var i = 1; i < V; i++) es.push([__r(rand, 0, i - 1), i, __r(rand, 0, 9)]); __edges(rand, V, __r(rand, 0, 6)).forEach(function (e) { es.push([e[0], e[1], __r(rand, 0, 9)]); }); return [V, __shuffle(rand, es)];`),
  examples: [[3, [[0, 1, 5], [1, 2, 3], [0, 2, 1]]], [5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7]]]],
  edges: [
    ["single", [1, []], "One vertex: an empty tree of weight 0."],
    ["duplicates", [2, [[0, 1, 5], [0, 1, 2]]], "Parallel edges: take the cheaper."],
    ["zeros", [3, [[0, 1, 0], [1, 2, 0], [0, 2, 4]]]],
  ],
};

const islandsII: ProblemDef = {
  slug: "number-of-islands-ii",
  title: "Number of Islands II",
  difficulty: "Hard",
  pattern: "Graphs: Union-Find",
  url: tuf("number-of-islands-ii"),
  statement: "An `n x m` grid starts as all water. Each operation `[r, c]` turns that cell into land (it may already be land). After every operation, report the number of islands (groups of land cells connected up, down, left or right). Return the list of counts.",
  constraints: ["1 <= n, m <= 1000", "1 <= operators.length <= 10^5"],
  fn: "numOfIslands",
  params: [["n", "number"], ["m", "number"], ["operators", "number[][]"]],
  returns: "number[]",
  hints: [
    "Recounting the whole grid after every operation is too slow. How does one new land cell change the count?",
    "Use a disjoint set over cells. A new land cell adds one island, then every union with a different neighbouring island removes one. Re-adding an existing land cell changes nothing.",
    "count = 0\nfor (r, c) in operators:\n  if (r, c) is not land:\n    mark it land; count += 1\n    for each land neighbour:\n      if find(neighbour) != find(cell): union them; count -= 1\n  append count\nreturn counts",
  ],
  reference: `function numOfIslands(n, m, operators) { const p = new Int32Array(n * m).fill(-1); const f = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }; let c = 0; const out = []; for (const [r, q] of operators) { const id = r * m + q; if (p[id] < 0) { p[id] = id; c++; for (const [dr, dq] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = q + dq; if (a < 0 || b < 0 || a >= n || b >= m) continue; const nid = a * m + b; if (p[nid] < 0) continue; const x = f(id), y = f(nid); if (x !== y) { p[x] = y; c--; } } } out.push(c); } return out; }`,
  brute: `function numOfIslands(n, m, operators) { const g = Array.from({ length: n }, () => new Array(m).fill(0)); return operators.map(([r, c]) => { g[r][c] = 1; const seen = g.map((row) => row.map(() => false)); let k = 0; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (g[i][j] && !seen[i][j]) { k++; const st = [[i, j]]; seen[i][j] = true; while (st.length) { const [a, b] = st.pop(); for (const [x, y] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (x >= 0 && y >= 0 && x < n && y < m && g[x][y] && !seen[x][y]) { seen[x][y] = true; st.push([x, y]); } } } return k; }); }`,
  fuzz: gen(`var n = __r(rand, 1, 5), m = __r(rand, 1, 5); var k = __r(rand, 1, 10); var ops = []; for (var i = 0; i < k; i++) ops.push([__r(rand, 0, n - 1), __r(rand, 0, m - 1)]); return [n, m, ops];`),
  examples: [[4, 5, [[1, 1], [0, 1], [3, 3], [3, 4]]], [3, 3, [[0, 0], [0, 2], [0, 1]]]],
  edges: [
    ["single", [1, 1, [[0, 0]]]],
    ["duplicates", [2, 2, [[0, 0], [0, 0], [1, 1]]], "Re-adding land changes nothing."],
    ["order", [1, 3, [[0, 0], [0, 2], [0, 1]]], "The middle cell joins two islands into one."],
  ],
};

const articulation: ProblemDef = {
  slug: "articulation-point-in-graph",
  title: "Articulation Points",
  difficulty: "Hard",
  pattern: "Graphs: DFS",
  url: tuf("articulation-point-in-graph"),
  statement: "Given an undirected graph with `V` vertices and `edges`, return every **articulation point** (a vertex whose removal increases the number of connected components) in increasing order, or `[-1]` if there are none.",
  constraints: ["1 <= V <= 10^4", "0 <= edges.length <= 10^5"],
  fn: "articulationPoints",
  params: [["V", "number"], ["edges", "number[][]"]],
  returns: "number[]",
  hints: [
    "In a DFS tree, a vertex is critical if some child's subtree has no back edge climbing above that vertex.",
    "Tarjan: record discovery time tin and low (smallest tin reachable via the subtree plus one back edge). A non-root u is an articulation point if some child v has low[v] >= tin[u]; the root is one if it has two or more DFS children.",
    "dfs(u, parent):\n  tin[u] = low[u] = timer++; children = 0\n  for v in adj[u]: if v == parent: continue\n    if v visited: low[u] = min(low[u], tin[v])\n    else: dfs(v, u); low[u] = min(low[u], low[v]); children += 1\n      if parent != -1 and low[v] >= tin[u]: mark u\n  if parent == -1 and children > 1: mark u\nrun dfs from every unvisited vertex; return marked vertices sorted, or [-1]",
  ],
  reference: `function articulationPoints(V, edges) { ${ADJ} const tin = new Array(V).fill(-1), low = new Array(V).fill(0), mark = new Array(V).fill(false); let t = 0; const dfs = (u, p) => { tin[u] = low[u] = t++; let ch = 0; for (const v of adj[u]) { if (v === p) continue; if (tin[v] >= 0) low[u] = Math.min(low[u], tin[v]); else { dfs(v, u); low[u] = Math.min(low[u], low[v]); ch++; if (p !== -1 && low[v] >= tin[u]) mark[u] = true; } } if (p === -1 && ch > 1) mark[u] = true; }; for (let i = 0; i < V; i++) if (tin[i] < 0) dfs(i, -1); const res = []; for (let i = 0; i < V; i++) if (mark[i]) res.push(i); return res.length ? res : [-1]; }`,
  brute: `function articulationPoints(V, edges) { const count = (skip) => { const p = Array.from({ length: V }, (_, i) => i); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); for (const [u, v] of edges) if (u !== skip && v !== skip) p[f(u)] = f(v); let c = 0; for (let i = 0; i < V; i++) if (i !== skip && f(i) === i) c++; return c; }; const base = count(-1), res = []; for (let x = 0; x < V; x++) if (count(x) > base) res.push(x); return res.length ? res : [-1]; }`,
  fuzz: GRAPH_GEN,
  examples: [[5, [[0, 1], [1, 4], [2, 4], [3, 4], [2, 3]]], [4, [[0, 1], [1, 2], [2, 3]]]],
  edges: [
    ["single", [1, []], "A lone vertex: removing it leaves zero components, fewer than before."],
    ["cycle", [3, [[0, 1], [1, 2], [2, 0]]], "A cycle has no articulation point."],
    ["empty", [3, []]],
  ],
};

export const A2Z_GRAPHS = [
  traversals, components, distinctIslands, topo, alien, dagShortest, unitShortest, dijkstra, printPath, minMult,
  bellmanFord, floyd, dsu, mst, islandsII, articulation,
].map(define);
