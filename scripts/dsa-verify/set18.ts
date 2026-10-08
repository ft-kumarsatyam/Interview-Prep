/** Blind solutions for the Graphs Ladder judges (ladder-graphs-seeded.ts, ladder-graphs2-seeded.ts). */
const D4 = "var D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];";
const DSU = "function makeDsu(n) { var p = []; for (var i = 0; i < n; i++) p.push(i); function find(x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; } return { find: find, union: function (a, b) { a = find(a); b = find(b); if (a === b) return false; p[a] = b; return true; } }; }";

export const SOLUTIONS: Record<string, string> = {
  "find-if-path-exists-in-graph": `${DSU}
function validPath(n, edges, source, destination) {
  var d = makeDsu(n);
  for (var i = 0; i < edges.length; i++) d.union(edges[i][0], edges[i][1]);
  return d.find(source) === d.find(destination);
}`,
  "find-the-town-judge": `function findJudge(n, trust) {
  var inn = [], out = [];
  for (var i = 0; i <= n; i++) { inn.push(0); out.push(0); }
  for (var j = 0; j < trust.length; j++) { out[trust[j][0]]++; inn[trust[j][1]]++; }
  for (var p = 1; p <= n; p++) if (out[p] === 0 && inn[p] === n - 1) return p;
  return -1;
}`,
  "flood-fill": `${D4}
function floodFill(image, sr, sc, color) {
  var old = image[sr][sc];
  if (old === color) return image;
  var q = [[sr, sc]];
  image[sr][sc] = color;
  while (q.length) {
    var cur = q.shift();
    for (var k = 0; k < 4; k++) {
      var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
      if (y >= 0 && x >= 0 && y < image.length && x < image[0].length && image[y][x] === old) { image[y][x] = color; q.push([y, x]); }
    }
  }
  return image;
}`,
  "island-perimeter": `${D4}
function islandPerimeter(grid) {
  var p = 0;
  for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[0].length; c++) {
    if (!grid[r][c]) continue;
    for (var k = 0; k < 4; k++) {
      var y = r + D4[k][0], x = c + D4[k][1];
      if (y < 0 || x < 0 || y >= grid.length || x >= grid[0].length || !grid[y][x]) p++;
    }
  }
  return p;
}`,
  "number-of-provinces": `${DSU}
function findCircleNum(isConnected) {
  var n = isConnected.length, d = makeDsu(n), count = n;
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (isConnected[i][j] && d.union(i, j)) count--;
  return count;
}`,
  "keys-and-rooms": `function canVisitAllRooms(rooms) {
  var seen = [true], q = [0], count = 1;
  while (q.length) {
    var keys = rooms[q.shift()];
    for (var i = 0; i < keys.length; i++) if (!seen[keys[i]]) { seen[keys[i]] = true; count++; q.push(keys[i]); }
  }
  return count === rooms.length;
}`,
  "number-of-islands": `${D4}
function numIslands(grid) {
  var R = grid.length, C = grid[0].length, count = 0;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (grid[r][c] !== "1") continue;
    count++;
    var q = [[r, c]];
    grid[r][c] = "0";
    while (q.length) {
      var cur = q.shift();
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < R && x < C && grid[y][x] === "1") { grid[y][x] = "0"; q.push([y, x]); }
      }
    }
  }
  return count;
}`,
  "max-area-of-island": `${D4}
function maxAreaOfIsland(grid) {
  var best = 0;
  for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[0].length; c++) {
    if (grid[r][c] !== 1) continue;
    var st = [[r, c]], size = 0;
    grid[r][c] = 0;
    while (st.length) {
      var cur = st.pop(); size++;
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < grid.length && x < grid[0].length && grid[y][x] === 1) { grid[y][x] = 0; st.push([y, x]); }
      }
    }
    if (size > best) best = size;
  }
  return best;
}`,
  "surrounded-regions": `${D4}
function solve(board) {
  var R = board.length, C = board[0].length, q = [];
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++)
    if ((r === 0 || c === 0 || r === R - 1 || c === C - 1) && board[r][c] === "O") { board[r][c] = "S"; q.push([r, c]); }
  while (q.length) {
    var cur = q.shift();
    for (var k = 0; k < 4; k++) {
      var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
      if (y >= 0 && x >= 0 && y < R && x < C && board[y][x] === "O") { board[y][x] = "S"; q.push([y, x]); }
    }
  }
  for (var i = 0; i < R; i++) for (var j = 0; j < C; j++) board[i][j] = board[i][j] === "S" ? "O" : "X";
}`,
  "number-of-enclaves": `${D4}
function numEnclaves(grid) {
  var R = grid.length, C = grid[0].length, q = [], land = 0;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (!grid[r][c]) continue;
    land++;
    if (r === 0 || c === 0 || r === R - 1 || c === C - 1) { grid[r][c] = 0; q.push([r, c]); }
  }
  var gone = q.length;
  while (q.length) {
    var cur = q.shift();
    for (var k = 0; k < 4; k++) {
      var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
      if (y >= 0 && x >= 0 && y < R && x < C && grid[y][x]) { grid[y][x] = 0; gone++; q.push([y, x]); }
    }
  }
  return land - gone;
}`,
  "number-of-closed-islands": `${D4}
function closedIsland(grid) {
  var R = grid.length, C = grid[0].length, count = 0;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (grid[r][c] !== 0) continue;
    var st = [[r, c]], closed = true;
    grid[r][c] = 1;
    while (st.length) {
      var cur = st.pop();
      if (cur[0] === 0 || cur[1] === 0 || cur[0] === R - 1 || cur[1] === C - 1) closed = false;
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < R && x < C && grid[y][x] === 0) { grid[y][x] = 1; st.push([y, x]); }
      }
    }
    if (closed) count++;
  }
  return count;
}`,
  "count-sub-islands": `${D4}
function countSubIslands(grid1, grid2) {
  var R = grid2.length, C = grid2[0].length, count = 0;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (grid2[r][c] !== 1) continue;
    var st = [[r, c]], ok = true;
    grid2[r][c] = 0;
    while (st.length) {
      var cur = st.pop();
      if (grid1[cur[0]][cur[1]] !== 1) ok = false;
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < R && x < C && grid2[y][x] === 1) { grid2[y][x] = 0; st.push([y, x]); }
      }
    }
    if (ok) count++;
  }
  return count;
}`,
  "pacific-atlantic-water-flow": `${D4}
function pacificAtlantic(heights) {
  var R = heights.length, C = heights[0].length;
  function mark(seen, r, c) {
    if (seen[r * C + c]) return;
    seen[r * C + c] = true;
    for (var k = 0; k < 4; k++) {
      var y = r + D4[k][0], x = c + D4[k][1];
      if (y >= 0 && x >= 0 && y < R && x < C && heights[y][x] >= heights[r][c]) mark(seen, y, x);
    }
  }
  var pac = {}, atl = {};
  for (var r = 0; r < R; r++) { mark(pac, r, 0); mark(atl, r, C - 1); }
  for (var c = 0; c < C; c++) { mark(pac, 0, c); mark(atl, R - 1, c); }
  var out = [];
  for (var i = 0; i < R; i++) for (var j = 0; j < C; j++) if (pac[i * C + j] && atl[i * C + j]) out.push([i, j]);
  return out;
}`,
  "rotting-oranges": `${D4}
function orangesRotting(grid) {
  var R = grid.length, C = grid[0].length, q = [], fresh = 0, best = 0;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (grid[r][c] === 2) q.push([r, c, 0]);
    else if (grid[r][c] === 1) fresh++;
  }
  for (var i = 0; i < q.length; i++) {
    var cur = q[i];
    best = Math.max(best, cur[2]);
    for (var k = 0; k < 4; k++) {
      var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
      if (y >= 0 && x >= 0 && y < R && x < C && grid[y][x] === 1) { grid[y][x] = 2; fresh--; q.push([y, x, cur[2] + 1]); }
    }
  }
  return fresh > 0 ? -1 : best;
}`,
  "01-matrix": `function updateMatrix(mat) {
  var R = mat.length, C = mat[0].length, big = R + C, d = [];
  for (var r = 0; r < R; r++) { d.push([]); for (var c = 0; c < C; c++) d[r].push(mat[r][c] === 0 ? 0 : big); }
  for (var r1 = 0; r1 < R; r1++) for (var c1 = 0; c1 < C; c1++) {
    if (r1 > 0) d[r1][c1] = Math.min(d[r1][c1], d[r1 - 1][c1] + 1);
    if (c1 > 0) d[r1][c1] = Math.min(d[r1][c1], d[r1][c1 - 1] + 1);
  }
  for (var r2 = R - 1; r2 >= 0; r2--) for (var c2 = C - 1; c2 >= 0; c2--) {
    if (r2 < R - 1) d[r2][c2] = Math.min(d[r2][c2], d[r2 + 1][c2] + 1);
    if (c2 < C - 1) d[r2][c2] = Math.min(d[r2][c2], d[r2][c2 + 1] + 1);
  }
  return d;
}`,
  "as-far-from-land-as-possible": `function maxDistance(grid) {
  var n = grid.length, big = 2 * n + 5, d = [], best = -1;
  for (var r = 0; r < n; r++) { d.push([]); for (var c = 0; c < n; c++) d[r].push(grid[r][c] ? 0 : big); }
  for (var r1 = 0; r1 < n; r1++) for (var c1 = 0; c1 < n; c1++) {
    if (r1 > 0) d[r1][c1] = Math.min(d[r1][c1], d[r1 - 1][c1] + 1);
    if (c1 > 0) d[r1][c1] = Math.min(d[r1][c1], d[r1][c1 - 1] + 1);
  }
  for (var r2 = n - 1; r2 >= 0; r2--) for (var c2 = n - 1; c2 >= 0; c2--) {
    if (r2 < n - 1) d[r2][c2] = Math.min(d[r2][c2], d[r2 + 1][c2] + 1);
    if (c2 < n - 1) d[r2][c2] = Math.min(d[r2][c2], d[r2][c2 + 1] + 1);
    if (!grid[r2][c2]) best = Math.max(best, d[r2][c2]);
  }
  return best <= 0 || best >= big ? -1 : best;
}`,
  "shortest-path-in-binary-matrix": `function shortestPathBinaryMatrix(grid) {
  var n = grid.length;
  if (grid[0][0] || grid[n - 1][n - 1]) return -1;
  var level = [[0, 0]], seen = {}, steps = 1;
  seen[0] = true;
  while (level.length) {
    var next = [];
    for (var i = 0; i < level.length; i++) {
      var r = level[i][0], c = level[i][1];
      if (r === n - 1 && c === n - 1) return steps;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var y = r + dr, x = c + dc;
        if (y >= 0 && x >= 0 && y < n && x < n && !grid[y][x] && !seen[y * n + x]) { seen[y * n + x] = true; next.push([y, x]); }
      }
    }
    level = next; steps++;
  }
  return -1;
}`,
  "open-the-lock": `function openLock(deadends, target) {
  var bad = {};
  for (var i = 0; i < deadends.length; i++) bad[deadends[i]] = true;
  if (bad["0000"]) return -1;
  var level = ["0000"], seen = { "0000": true }, steps = 0;
  while (level.length) {
    var next = [];
    for (var j = 0; j < level.length; j++) {
      var s = level[j];
      if (s === target) return steps;
      for (var w = 0; w < 4; w++) for (var d = -1; d <= 1; d += 2) {
        var t = s.substring(0, w) + ((Number(s.charAt(w)) + d + 10) % 10) + s.substring(w + 1);
        if (!bad[t] && !seen[t]) { seen[t] = true; next.push(t); }
      }
    }
    level = next; steps++;
  }
  return -1;
}`,
  "shortest-bridge": `${D4}
function shortestBridge(grid) {
  var n = grid.length, q = [], found = false;
  for (var r = 0; r < n && !found; r++) for (var c = 0; c < n && !found; c++) if (grid[r][c] === 1) {
    found = true;
    var st = [[r, c]];
    grid[r][c] = 2;
    while (st.length) {
      var cur = st.pop();
      q.push([cur[0], cur[1], 0]);
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < n && x < n && grid[y][x] === 1) { grid[y][x] = 2; st.push([y, x]); }
      }
    }
  }
  for (var i = 0; i < q.length; i++) {
    var p = q[i];
    for (var k2 = 0; k2 < 4; k2++) {
      var y2 = p[0] + D4[k2][0], x2 = p[1] + D4[k2][1];
      if (y2 < 0 || x2 < 0 || y2 >= n || x2 >= n) continue;
      if (grid[y2][x2] === 1) return p[2];
      if (grid[y2][x2] === 0) { grid[y2][x2] = 2; q.push([y2, x2, p[2] + 1]); }
    }
  }
  return -1;
}`,
  "word-ladder": `function ladderLength(beginWord, endWord, wordList) {
  var left = {};
  for (var i = 0; i < wordList.length; i++) left[wordList[i]] = true;
  if (!left[endWord]) return 0;
  var a = {}, b = {}, steps = 1;
  a[beginWord] = true; b[endWord] = true;
  delete left[beginWord]; delete left[endWord];
  if (beginWord === endWord) return 1;
  while (Object.keys(a).length && Object.keys(b).length) {
    if (Object.keys(a).length > Object.keys(b).length) { var t = a; a = b; b = t; }
    var next = {};
    for (var w in a) for (var p = 0; p < w.length; p++) for (var ch = 97; ch < 123; ch++) {
      var cand = w.substring(0, p) + String.fromCharCode(ch) + w.substring(p + 1);
      if (b[cand]) return steps + 1;
      if (left[cand]) { next[cand] = true; delete left[cand]; }
    }
    a = next; steps++;
  }
  return 0;
}`,
  "is-graph-bipartite": `function isBipartite(graph) {
  var color = [];
  function dfs(u, c) {
    color[u] = c;
    for (var i = 0; i < graph[u].length; i++) {
      var v = graph[u][i];
      if (color[v] === undefined) { if (!dfs(v, 1 - c)) return false; }
      else if (color[v] === c) return false;
    }
    return true;
  }
  for (var s = 0; s < graph.length; s++) if (color[s] === undefined && !dfs(s, 0)) return false;
  return true;
}`,
  "possible-bipartition": `${DSU}
function possibleBipartition(n, dislikes) {
  var d = makeDsu(2 * n + 2);
  for (var i = 0; i < dislikes.length; i++) {
    var a = dislikes[i][0], b = dislikes[i][1];
    if (d.find(a) === d.find(b)) return false;
    d.union(a, b + n); d.union(b, a + n);
  }
  return true;
}`,
  "find-eventual-safe-states": `function eventualSafeNodes(graph) {
  var state = [], out = [];
  function safe(u) {
    if (state[u] === 1) return false;
    if (state[u] === 2) return true;
    state[u] = 1;
    for (var i = 0; i < graph[u].length; i++) if (!safe(graph[u][i])) return false;
    state[u] = 2;
    return true;
  }
  for (var u = 0; u < graph.length; u++) if (safe(u)) out.push(u);
  return out;
}`,
  "course-schedule": `function canFinish(numCourses, prerequisites) {
  var adj = [], state = [];
  for (var i = 0; i < numCourses; i++) adj.push([]);
  for (var j = 0; j < prerequisites.length; j++) adj[prerequisites[j][1]].push(prerequisites[j][0]);
  function cyclic(u) {
    if (state[u] === 1) return true;
    if (state[u] === 2) return false;
    state[u] = 1;
    for (var k = 0; k < adj[u].length; k++) if (cyclic(adj[u][k])) return true;
    state[u] = 2;
    return false;
  }
  for (var u = 0; u < numCourses; u++) if (cyclic(u)) return false;
  return true;
}`,
  "minimum-height-trees": `function findMinHeightTrees(n, edges) {
  var adj = [];
  for (var i = 0; i < n; i++) adj.push([]);
  for (var j = 0; j < edges.length; j++) { adj[edges[j][0]].push(edges[j][1]); adj[edges[j][1]].push(edges[j][0]); }
  function bfs(s) {
    var dist = [], par = [], q = [s], last = s;
    dist[s] = 0; par[s] = -1;
    for (var k = 0; k < q.length; k++) { var u = q[k]; last = u; for (var m = 0; m < adj[u].length; m++) { var v = adj[u][m]; if (dist[v] === undefined) { dist[v] = dist[u] + 1; par[v] = u; q.push(v); } } }
    return { far: last, par: par, dist: dist };
  }
  var a = bfs(0).far, res = bfs(a), b = res.far, path = [];
  for (var x = b; x !== -1; x = res.par[x]) path.push(x);
  var L = path.length;
  return L % 2 ? [path[(L - 1) / 2]] : [path[L / 2 - 1], path[L / 2]];
}`,
  "parallel-courses-iii": `function minimumTime(n, relations, time) {
  var pre = [], memo = [];
  for (var i = 0; i <= n; i++) pre.push([]);
  for (var j = 0; j < relations.length; j++) pre[relations[j][1]].push(relations[j][0]);
  function finish(v) {
    if (memo[v] !== undefined) return memo[v];
    var m = 0;
    for (var k = 0; k < pre[v].length; k++) m = Math.max(m, finish(pre[v][k]));
    return (memo[v] = m + time[v - 1]);
  }
  var best = 0;
  for (var v = 1; v <= n; v++) best = Math.max(best, finish(v));
  return best;
}`,
  "network-delay-time": `function networkDelayTime(times, n, k) {
  var d = [];
  for (var i = 0; i <= n; i++) d.push(Infinity);
  d[k] = 0;
  for (var round = 1; round < n; round++)
    for (var j = 0; j < times.length; j++) {
      var u = times[j][0], v = times[j][1], w = times[j][2];
      if (d[u] + w < d[v]) d[v] = d[u] + w;
    }
  var best = 0;
  for (var x = 1; x <= n; x++) best = Math.max(best, d[x]);
  return best === Infinity ? -1 : best;
}`,
  "path-with-minimum-effort": `function minimumEffortPath(heights) {
  var R = heights.length, C = heights[0].length, edges = [];
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    if (r + 1 < R) edges.push([Math.abs(heights[r][c] - heights[r + 1][c]), r * C + c, (r + 1) * C + c]);
    if (c + 1 < C) edges.push([Math.abs(heights[r][c] - heights[r][c + 1]), r * C + c, r * C + c + 1]);
  }
  edges.sort(function (a, b) { return a[0] - b[0]; });
  var p = [];
  for (var i = 0; i < R * C; i++) p.push(i);
  function find(x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }
  if (R * C === 1) return 0;
  for (var j = 0; j < edges.length; j++) {
    p[find(edges[j][1])] = find(edges[j][2]);
    if (find(0) === find(R * C - 1)) return edges[j][0];
  }
  return 0;
}`,
  "cheapest-flights-within-k-stops": `function findCheapestPrice(n, flights, src, dst, k) {
  var adj = [];
  for (var i = 0; i < n; i++) adj.push([]);
  for (var j = 0; j < flights.length; j++) adj[flights[j][0]].push([flights[j][1], flights[j][2]]);
  var best = [], level = [[src, 0]];
  for (var x = 0; x < n; x++) best.push(Infinity);
  best[src] = 0;
  for (var stops = 0; stops <= k && level.length; stops++) {
    var next = [];
    for (var a = 0; a < level.length; a++) {
      var u = level[a][0], cost = level[a][1];
      for (var b = 0; b < adj[u].length; b++) {
        var v = adj[u][b][0], nc = cost + adj[u][b][1];
        if (nc < best[v]) { best[v] = nc; next.push([v, nc]); }
      }
    }
    level = next;
  }
  return best[dst] === Infinity ? -1 : best[dst];
}`,
  "number-of-ways-to-arrive-at-destination": `function countPaths(n, roads) {
  var M = 1000000007, adj = [], dist = [], ways = [], done = [];
  for (var i = 0; i < n; i++) { adj.push([]); dist.push(Infinity); ways.push(0); done.push(false); }
  for (var j = 0; j < roads.length; j++) { adj[roads[j][0]].push([roads[j][1], roads[j][2]]); adj[roads[j][1]].push([roads[j][0], roads[j][2]]); }
  dist[0] = 0; ways[0] = 1;
  var heap = [[0, 0]];
  while (heap.length) {
    heap.sort(function (a, b) { return a[0] - b[0]; });
    var top = heap.shift(), u = top[1];
    if (done[u]) continue;
    done[u] = true;
    for (var k = 0; k < adj[u].length; k++) {
      var v = adj[u][k][0], nd = dist[u] + adj[u][k][1];
      if (nd < dist[v]) { dist[v] = nd; ways[v] = ways[u]; heap.push([nd, v]); }
      else if (nd === dist[v]) ways[v] = (ways[v] + ways[u]) % M;
    }
  }
  return ways[n - 1];
}`,
  "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance": `function findTheCity(n, edges, distanceThreshold) {
  var adj = [];
  for (var i = 0; i < n; i++) adj.push([]);
  for (var j = 0; j < edges.length; j++) { adj[edges[j][0]].push([edges[j][1], edges[j][2]]); adj[edges[j][1]].push([edges[j][0], edges[j][2]]); }
  var best = -1, few = Infinity;
  for (var s = 0; s < n; s++) {
    var d = [], done = [];
    for (var x = 0; x < n; x++) { d.push(Infinity); done.push(false); }
    d[s] = 0;
    for (var it = 0; it < n; it++) {
      var u = -1;
      for (var y = 0; y < n; y++) if (!done[y] && (u < 0 || d[y] < d[u])) u = y;
      done[u] = true;
      for (var k = 0; k < adj[u].length; k++) if (d[u] + adj[u][k][1] < d[adj[u][k][0]]) d[adj[u][k][0]] = d[u] + adj[u][k][1];
    }
    var cnt = 0;
    for (var z = 0; z < n; z++) if (z !== s && d[z] <= distanceThreshold) cnt++;
    if (cnt <= few) { few = cnt; best = s; }
  }
  return best;
}`,
  "swim-in-rising-water": `${D4}
function swimInWater(grid) {
  var n = grid.length;
  function can(t) {
    if (grid[0][0] > t) return false;
    var seen = {}, st = [[0, 0]];
    seen[0] = true;
    while (st.length) {
      var cur = st.pop();
      if (cur[0] === n - 1 && cur[1] === n - 1) return true;
      for (var k = 0; k < 4; k++) {
        var y = cur[0] + D4[k][0], x = cur[1] + D4[k][1];
        if (y >= 0 && x >= 0 && y < n && x < n && !seen[y * n + x] && grid[y][x] <= t) { seen[y * n + x] = true; st.push([y, x]); }
      }
    }
    return false;
  }
  var lo = 0, hi = n * n - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (can(mid)) hi = mid; else lo = mid + 1; }
  return lo;
}`,
  "min-cost-to-connect-all-points": `${DSU}
function minCostConnectPoints(points) {
  var n = points.length, es = [];
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++)
    es.push([Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]), i, j]);
  es.sort(function (a, b) { return a[0] - b[0]; });
  var d = makeDsu(n), total = 0;
  for (var k = 0; k < es.length; k++) if (d.union(es[k][1], es[k][2])) total += es[k][0];
  return total;
}`,
  "redundant-connection": `function findRedundantConnection(edges) {
  var n = edges.length, adj = [];
  for (var i = 0; i <= n; i++) adj.push([]);
  for (var j = 0; j < n; j++) {
    var a = edges[j][0], b = edges[j][1], seen = {}, st = [a];
    seen[a] = true;
    while (st.length) { var u = st.pop(); for (var k = 0; k < adj[u].length; k++) if (!seen[adj[u][k]]) { seen[adj[u][k]] = true; st.push(adj[u][k]); } }
    if (seen[b]) return edges[j];
    adj[a].push(b); adj[b].push(a);
  }
  return [];
}`,
  "number-of-operations-to-make-network-connected": `${DSU}
function makeConnected(n, connections) {
  if (connections.length < n - 1) return -1;
  var d = makeDsu(n), comp = n;
  for (var i = 0; i < connections.length; i++) if (d.union(connections[i][0], connections[i][1])) comp--;
  return comp - 1;
}`,
  "accounts-merge": `function accountsMerge(accounts) {
  var adj = {}, owner = {};
  for (var i = 0; i < accounts.length; i++) {
    var first = accounts[i][1];
    for (var j = 1; j < accounts[i].length; j++) {
      var e = accounts[i][j];
      owner[e] = accounts[i][0];
      if (!adj[e]) adj[e] = [];
      if (!adj[first]) adj[first] = [];
      adj[e].push(first); adj[first].push(e);
    }
  }
  var seen = {}, out = [];
  for (var em in adj) {
    if (seen[em]) continue;
    var group = [], st = [em];
    seen[em] = true;
    while (st.length) { var u = st.pop(); group.push(u); for (var k = 0; k < adj[u].length; k++) if (!seen[adj[u][k]]) { seen[adj[u][k]] = true; st.push(adj[u][k]); } }
    group.sort();
    out.push([owner[em]].concat(group));
  }
  return out;
}`,
  "most-stones-removed-with-same-row-or-column": `${DSU}
function removeStones(stones) {
  var n = stones.length, d = makeDsu(n), comp = n, byRow = {}, byCol = {};
  for (var i = 0; i < n; i++) {
    var r = stones[i][0], c = stones[i][1];
    if (byRow[r] !== undefined && d.union(i, byRow[r])) comp--;
    if (byCol[c] !== undefined && d.union(i, byCol[c])) comp--;
    byRow[r] = i; byCol[c] = i;
  }
  return n - comp;
}`,
  "making-a-large-island": `${DSU}
function largestIsland(grid) {
  var n = grid.length, d = makeDsu(n * n), size = [], best = 0;
  for (var i = 0; i < n * n; i++) size.push(1);
  function join(a, b) { var ra = d.find(a), rb = d.find(b); if (ra !== rb) { d.union(ra, rb); size[rb] += size[ra]; } }
  for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (grid[r][c]) {
    if (r + 1 < n && grid[r + 1][c]) join(r * n + c, (r + 1) * n + c);
    if (c + 1 < n && grid[r][c + 1]) join(r * n + c, r * n + c + 1);
  }
  var any0 = false;
  for (var r2 = 0; r2 < n; r2++) for (var c2 = 0; c2 < n; c2++) {
    if (grid[r2][c2]) { best = Math.max(best, size[d.find(r2 * n + c2)]); continue; }
    any0 = true;
    var roots = [], s = 1, nb = [[r2 + 1, c2], [r2 - 1, c2], [r2, c2 + 1], [r2, c2 - 1]];
    for (var k = 0; k < 4; k++) {
      var y = nb[k][0], x = nb[k][1];
      if (y < 0 || x < 0 || y >= n || x >= n || !grid[y][x]) continue;
      var root = d.find(y * n + x);
      if (roots.indexOf(root) < 0) { roots.push(root); s += size[root]; }
    }
    best = Math.max(best, s);
  }
  return any0 ? best : n * n;
}`,
  "critical-connections-in-a-network": `function criticalConnections(n, connections) {
  var adj = [], disc = [], low = [], out = [], timer = 0;
  for (var i = 0; i < n; i++) adj.push([]);
  for (var j = 0; j < connections.length; j++) { adj[connections[j][0]].push([connections[j][1], j]); adj[connections[j][1]].push([connections[j][0], j]); }
  function dfs(u, viaEdge) {
    disc[u] = low[u] = timer++;
    for (var k = 0; k < adj[u].length; k++) {
      var v = adj[u][k][0], id = adj[u][k][1];
      if (id === viaEdge) continue;
      if (disc[v] === undefined) {
        dfs(v, id);
        low[u] = Math.min(low[u], low[v]);
        if (low[v] > disc[u]) out.push([v, u]);
      } else low[u] = Math.min(low[u], disc[v]);
    }
  }
  dfs(0, -1);
  return out;
}`,
};
