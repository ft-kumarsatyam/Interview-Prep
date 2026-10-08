/** Blind solutions for the DP Ladder judges (ladder-dp-seeded.ts, ladder-dp2-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "min-cost-climbing-stairs": `function minCostClimbingStairs(cost) {
  var n = cost.length, dp = [cost[0], cost[1]];
  for (var i = 2; i < n; i++) dp[i] = cost[i] + Math.min(dp[i - 1], dp[i - 2]);
  return Math.min(dp[n - 1], dp[n - 2]);
}`,
  "n-th-tribonacci-number": `function tribonacci(n) {
  var t = [0, 1, 1];
  for (var i = 3; i <= n; i++) t[i] = t[i - 1] + t[i - 2] + t[i - 3];
  return t[n];
}`,
  "house-robber-ii": `function rob(nums) {
  var n = nums.length;
  if (n === 1) return nums[0];
  function line(lo, hi) {
    var memo = {};
    function f(i) { if (i > hi) return 0; if (memo[i] !== undefined) return memo[i]; return (memo[i] = Math.max(f(i + 1), nums[i] + f(i + 2))); }
    return f(lo);
  }
  return Math.max(line(0, n - 2), line(1, n - 1));
}`,
  "target-sum": `function findTargetSumWays(nums, target) {
  var memo = {};
  function f(i, s) {
    if (i === nums.length) return s === target ? 1 : 0;
    var key = i + "," + s;
    if (memo[key] !== undefined) return memo[key];
    return (memo[key] = f(i + 1, s + nums[i]) + f(i + 1, s - nums[i]));
  }
  return f(0, 0);
}`,
  "coin-change-ii": `function change(amount, coins) {
  var memo = {};
  function f(i, left) {
    if (left === 0) return 1;
    if (i === coins.length || left < 0) return 0;
    var key = i + "," + left;
    if (memo[key] !== undefined) return memo[key];
    return (memo[key] = f(i, left - coins[i]) + f(i + 1, left));
  }
  return f(0, amount);
}`,
  "perfect-squares": `function numSquares(n) {
  var level = [n], seen = {}, steps = 0;
  while (level.length) {
    steps++;
    var next = [];
    for (var i = 0; i < level.length; i++)
      for (var j = 1; j * j <= level[i]; j++) {
        var r = level[i] - j * j;
        if (r === 0) return steps;
        if (!seen[r]) { seen[r] = true; next.push(r); }
      }
    level = next;
  }
  return steps;
}`,
  "combination-sum-iv": `function combinationSum4(nums, target) {
  var memo = {};
  function f(t) {
    if (t === 0) return 1;
    if (memo[t] !== undefined) return memo[t];
    var w = 0;
    for (var i = 0; i < nums.length; i++) if (nums[i] <= t) w += f(t - nums[i]);
    return (memo[t] = w);
  }
  return f(target);
}`,
  "delete-and-earn": `function deleteAndEarn(nums) {
  var pts = {}, vals = [];
  for (var i = 0; i < nums.length; i++) { if (pts[nums[i]] === undefined) { pts[nums[i]] = 0; vals.push(nums[i]); } pts[nums[i]] += nums[i]; }
  vals.sort(function (a, b) { return a - b; });
  var take = 0, skip = 0, prev = -2;
  for (var j = 0; j < vals.length; j++) {
    var v = vals[j], best = Math.max(take, skip);
    if (v === prev + 1) { take = skip + pts[v]; skip = best; }
    else { take = best + pts[v]; skip = best; }
    prev = v;
  }
  return Math.max(take, skip);
}`,
  "best-time-to-buy-and-sell-stock-with-cooldown": `function maxProfit(prices) {
  var memo = {};
  function f(i, holding) {
    if (i >= prices.length) return 0;
    var key = i * 2 + (holding ? 1 : 0);
    if (memo[key] !== undefined) return memo[key];
    var best = f(i + 1, holding);
    if (holding) best = Math.max(best, prices[i] + f(i + 2, false));
    else best = Math.max(best, f(i + 1, true) - prices[i]);
    return (memo[key] = best);
  }
  return f(0, false);
}`,
  "best-time-to-buy-and-sell-stock-with-transaction-fee": `function maxProfit(prices, fee) {
  var free = [0], hold = [-prices[0]];
  for (var i = 1; i < prices.length; i++) {
    free[i] = Math.max(free[i - 1], hold[i - 1] + prices[i] - fee);
    hold[i] = Math.max(hold[i - 1], free[i - 1] - prices[i]);
  }
  return free[prices.length - 1];
}`,
  "partition-array-for-maximum-sum": `function maxSumAfterPartitioning(arr, k) {
  var memo = {};
  function f(i) {
    if (i === arr.length) return 0;
    if (memo[i] !== undefined) return memo[i];
    var best = 0, m = 0;
    for (var L = 1; L <= k && i + L <= arr.length; L++) { m = Math.max(m, arr[i + L - 1]); best = Math.max(best, m * L + f(i + L)); }
    return (memo[i] = best);
  }
  return f(0);
}`,
  "number-of-longest-increasing-subsequence": `function findNumberOfLIS(nums) {
  var n = nums.length, memo = {};
  function f(i) {
    if (memo[i]) return memo[i];
    var len = 1, cnt = 1;
    for (var j = i + 1; j < n; j++) if (nums[j] > nums[i]) {
      var r = f(j);
      if (r[0] + 1 > len) { len = r[0] + 1; cnt = r[1]; }
      else if (r[0] + 1 === len) cnt += r[1];
    }
    return (memo[i] = [len, cnt]);
  }
  var best = 0, total = 0;
  for (var i = 0; i < n; i++) { var r = f(i); if (r[0] > best) { best = r[0]; total = r[1]; } else if (r[0] === best) total += r[1]; }
  return total;
}`,
  "longest-string-chain": `function longestStrChain(words) {
  var have = {}, memo = {};
  for (var i = 0; i < words.length; i++) have[words[i]] = true;
  function f(w) {
    if (memo[w] !== undefined) return memo[w];
    var best = 1;
    for (var k = 0; k < w.length; k++) {
      var p = w.substring(0, k) + w.substring(k + 1);
      if (have[p]) best = Math.max(best, f(p) + 1);
    }
    return (memo[w] = best);
  }
  var ans = 0;
  for (var j = 0; j < words.length; j++) ans = Math.max(ans, f(words[j]));
  return ans;
}`,
  "unique-paths-ii": `function uniquePathsWithObstacles(g) {
  var R = g.length, C = g[0].length, dp = [];
  for (var r = 0; r < R; r++) {
    dp.push([]);
    for (var c = 0; c < C; c++) {
      if (g[r][c]) { dp[r][c] = 0; continue; }
      if (r === 0 && c === 0) { dp[r][c] = 1; continue; }
      dp[r][c] = (r > 0 ? dp[r - 1][c] : 0) + (c > 0 ? dp[r][c - 1] : 0);
    }
  }
  return dp[R - 1][C - 1];
}`,
  "minimum-path-sum": `function minPathSum(grid) {
  var R = grid.length, C = grid[0].length, memo = {};
  function f(r, c) {
    if (r === R - 1 && c === C - 1) return grid[r][c];
    var key = r * C + c;
    if (memo[key] !== undefined) return memo[key];
    var best = Infinity;
    if (r + 1 < R) best = Math.min(best, f(r + 1, c));
    if (c + 1 < C) best = Math.min(best, f(r, c + 1));
    return (memo[key] = grid[r][c] + best);
  }
  return f(0, 0);
}`,
  "triangle": `function minimumTotal(triangle) {
  var prev = [triangle[0][0]];
  for (var r = 1; r < triangle.length; r++) {
    var cur = [];
    for (var i = 0; i <= r; i++) {
      var a = i < r ? prev[i] : Infinity, b = i > 0 ? prev[i - 1] : Infinity;
      cur.push(triangle[r][i] + Math.min(a, b));
    }
    prev = cur;
  }
  return Math.min.apply(null, prev);
}`,
  "minimum-falling-path-sum": `function minFallingPathSum(matrix) {
  var n = matrix.length, memo = {};
  function f(r, c) {
    if (c < 0 || c >= n) return Infinity;
    if (r === n - 1) return matrix[r][c];
    var key = r * n + c;
    if (memo[key] !== undefined) return memo[key];
    return (memo[key] = matrix[r][c] + Math.min(f(r + 1, c - 1), f(r + 1, c), f(r + 1, c + 1)));
  }
  var best = Infinity;
  for (var c = 0; c < n; c++) best = Math.min(best, f(0, c));
  return best;
}`,
  "maximal-square": `function maximalSquare(matrix) {
  var R = matrix.length, C = matrix[0].length, h = [], best = 0;
  for (var c = 0; c < C; c++) h.push(0);
  for (var r = 0; r < R; r++) {
    for (var c2 = 0; c2 < C; c2++) h[c2] = matrix[r][c2] === "1" ? h[c2] + 1 : 0;
    for (var k = best + 1; k <= Math.min(R, C); k++) {
      var run = 0, found = false;
      for (var c3 = 0; c3 < C; c3++) { run = h[c3] >= k ? run + 1 : 0; if (run >= k) { found = true; break; } }
      if (found) best = k; else break;
    }
  }
  return best * best;
}`,
  "count-square-submatrices-with-all-ones": `function countSquares(matrix) {
  var R = matrix.length, C = matrix[0].length, dp = [], total = 0;
  for (var r = 0; r < R; r++) {
    dp.push([]);
    for (var c = 0; c < C; c++) {
      if (!matrix[r][c]) dp[r][c] = 0;
      else if (r === 0 || c === 0) dp[r][c] = 1;
      else dp[r][c] = 1 + Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]);
      total += dp[r][c];
    }
  }
  return total;
}`,
  "cherry-pickup-ii": `function cherryPickup(grid) {
  var R = grid.length, C = grid[0].length, memo = {};
  function f(r, a, b) {
    if (a < 0 || b < 0 || a >= C || b >= C) return -Infinity;
    var key = (r * C + a) * C + b;
    if (memo[key] !== undefined) return memo[key];
    var here = grid[r][a] + (a !== b ? grid[r][b] : 0);
    if (r === R - 1) return (memo[key] = here);
    var best = -Infinity;
    for (var d1 = -1; d1 <= 1; d1++) for (var d2 = -1; d2 <= 1; d2++) best = Math.max(best, f(r + 1, a + d1, b + d2));
    return (memo[key] = here + best);
  }
  return f(0, 0, C - 1);
}`,
  "longest-palindromic-subsequence": `function longestPalindromeSubseq(s) {
  var t = s.split("").reverse().join(""), n = s.length, prev = [], cur;
  for (var j = 0; j <= n; j++) prev.push(0);
  for (var i = 1; i <= n; i++) {
    cur = [0];
    for (var k = 1; k <= n; k++) cur[k] = s.charAt(i - 1) === t.charAt(k - 1) ? prev[k - 1] + 1 : Math.max(prev[k], cur[k - 1]);
    prev = cur;
  }
  return prev[n];
}`,
  "delete-operation-for-two-strings": `function minDistance(word1, word2) {
  var m = word1.length, n = word2.length, dp = [];
  for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) {
    if (i === 0 || j === 0) dp[i][j] = i + j;
    else if (word1.charAt(i - 1) === word2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
    else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1]);
  } }
  return dp[m][n];
}`,
  "minimum-insertion-steps-to-make-a-string-palindrome": `function minInsertions(s) {
  var memo = {};
  function f(i, j) {
    if (i >= j) return 0;
    var key = i * 1000 + j;
    if (memo[key] !== undefined) return memo[key];
    var r = s.charAt(i) === s.charAt(j) ? f(i + 1, j - 1) : 1 + Math.min(f(i + 1, j), f(i, j - 1));
    return (memo[key] = r);
  }
  return f(0, s.length - 1);
}`,
  "distinct-subsequences": `function numDistinct(s, t) {
  var memo = {};
  function f(i, j) {
    if (j === t.length) return 1;
    if (i === s.length) return 0;
    var key = i * 1000 + j;
    if (memo[key] !== undefined) return memo[key];
    var w = f(i + 1, j);
    if (s.charAt(i) === t.charAt(j)) w += f(i + 1, j + 1);
    return (memo[key] = w);
  }
  return f(0, 0);
}`,
  "wildcard-matching": `function isMatch(s, p) {
  var i = 0, j = 0, star = -1, mark = 0;
  while (i < s.length) {
    if (j < p.length && (p.charAt(j) === "?" || p.charAt(j) === s.charAt(i))) { i++; j++; }
    else if (j < p.length && p.charAt(j) === "*") { star = j++; mark = i; }
    else if (star >= 0) { j = star + 1; i = ++mark; }
    else return false;
  }
  while (j < p.length && p.charAt(j) === "*") j++;
  return j === p.length;
}`,
  "regular-expression-matching": `function isMatch(s, p) {
  var memo = {};
  function f(i, j) {
    var key = i * 100 + j;
    if (memo[key] !== undefined) return memo[key];
    var r;
    if (j === p.length) r = i === s.length;
    else {
      var first = i < s.length && (p.charAt(j) === "." || p.charAt(j) === s.charAt(i));
      if (j + 1 < p.length && p.charAt(j + 1) === "*") r = f(i, j + 2) || (first && f(i + 1, j));
      else r = first && f(i + 1, j + 1);
    }
    return (memo[key] = r);
  }
  return f(0, 0);
}`,
  "interleaving-string": `function isInterleave(s1, s2, s3) {
  if (s1.length + s2.length !== s3.length) return false;
  var memo = {};
  function f(i, j) {
    if (i + j === s3.length) return true;
    var key = i * 1000 + j;
    if (memo[key] !== undefined) return memo[key];
    var c = s3.charAt(i + j);
    var r = (i < s1.length && s1.charAt(i) === c && f(i + 1, j)) || (j < s2.length && s2.charAt(j) === c && f(i, j + 1));
    return (memo[key] = r);
  }
  return f(0, 0);
}`,
  "best-time-to-buy-and-sell-stock-iii": `function maxProfit(prices) {
  var n = prices.length, left = [], right = [], lo = Infinity, hi = -Infinity, best = 0;
  for (var i = 0; i < n; i++) { lo = Math.min(lo, prices[i]); left[i] = Math.max(i > 0 ? left[i - 1] : 0, prices[i] - lo); }
  for (var j = n - 1; j >= 0; j--) { hi = Math.max(hi, prices[j]); right[j] = Math.max(j < n - 1 ? right[j + 1] : 0, hi - prices[j]); }
  for (var k = 0; k < n; k++) best = Math.max(best, left[k] + (k + 1 < n ? right[k + 1] : 0));
  return best;
}`,
  "best-time-to-buy-and-sell-stock-iv": `function maxProfit(k, prices) {
  var memo = {};
  function f(i, left, holding) {
    if (i === prices.length || (left === 0 && !holding)) return 0;
    var key = (i * 101 + left) * 2 + (holding ? 1 : 0);
    if (memo[key] !== undefined) return memo[key];
    var best = f(i + 1, left, holding);
    if (holding) best = Math.max(best, prices[i] + f(i + 1, left, false));
    else best = Math.max(best, f(i + 1, left - 1, true) - prices[i]);
    return (memo[key] = best);
  }
  return f(0, k, false);
}`,
  "burst-balloons": `function maxCoins(nums) {
  var a = [1].concat(nums, [1]), memo = {};
  function f(l, r) {
    if (r - l < 2) return 0;
    var key = l * 100 + r;
    if (memo[key] !== undefined) return memo[key];
    var best = 0;
    for (var k = l + 1; k < r; k++) best = Math.max(best, f(l, k) + f(k, r) + a[l] * a[k] * a[r]);
    return (memo[key] = best);
  }
  return f(0, a.length - 1);
}`,
  "minimum-cost-to-cut-a-stick": `function minCost(n, cuts) {
  var c = cuts.slice().sort(function (x, y) { return x - y; });
  c.unshift(0); c.push(n);
  var memo = {};
  function f(i, j) {
    if (j - i < 2) return 0;
    var key = i * 200 + j;
    if (memo[key] !== undefined) return memo[key];
    var best = Infinity;
    for (var k = i + 1; k < j; k++) best = Math.min(best, f(i, k) + f(k, j));
    return (memo[key] = best + c[j] - c[i]);
  }
  return f(0, c.length - 1);
}`,
  "palindrome-partitioning-ii": `function minCut(s) {
  var n = s.length, cut = [];
  for (var i = 0; i <= n; i++) cut.push(i - 1);
  for (var mid = 0; mid < n; mid++) {
    for (var a = mid, b = mid; a >= 0 && b < n && s.charAt(a) === s.charAt(b); a--, b++) cut[b + 1] = Math.min(cut[b + 1], cut[a] + 1);
    for (var a2 = mid, b2 = mid + 1; a2 >= 0 && b2 < n && s.charAt(a2) === s.charAt(b2); a2--, b2++) cut[b2 + 1] = Math.min(cut[b2 + 1], cut[a2] + 1);
  }
  return cut[n];
}`,
  "last-stone-weight-ii": `function lastStoneWeightII(stones) {
  var sums = { 0: true };
  for (var i = 0; i < stones.length; i++) {
    var next = {};
    for (var s in sums) { next[Number(s) + stones[i]] = true; next[Math.abs(Number(s) - stones[i])] = true; }
    sums = next;
  }
  var best = Infinity;
  for (var k in sums) best = Math.min(best, Number(k));
  return best;
}`,
};
