/** Blind solutions for the seeded problems the Recursion & Backtracking Ladder judges (scripts/dsa-testcases/specs/ladder-recursion-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "fibonacci-number": `function fib(n) {
  var memo = {};
  function f(k) { if (k < 2) return k; if (memo[k] !== undefined) return memo[k]; return (memo[k] = f(k - 1) + f(k - 2)); }
  return f(n);
}`,
  "powx-n": `function myPow(x, n) {
  function p(b, e) {
    if (e === 0) return 1;
    var half = p(b, Math.floor(e / 2));
    return e % 2 ? half * half * b : half * half;
  }
  return n < 0 ? p(1 / x, -n) : p(x, n);
}`,
  "letter-case-permutation": `function letterCasePermutation(s) {
  var acc = [""];
  for (var i = 0; i < s.length; i++) {
    var c = s[i], next = [];
    for (var j = 0; j < acc.length; j++) {
      if (c.toLowerCase() === c.toUpperCase()) next.push(acc[j] + c);
      else { next.push(acc[j] + c.toLowerCase()); next.push(acc[j] + c.toUpperCase()); }
    }
    acc = next;
  }
  return acc;
}`,
  "subsets-ii": `function subsetsWithDup(nums) {
  var a = nums.slice().sort(function (x, y) { return x - y; });
  var out = [[]], lastStart = 0;
  for (var i = 0; i < a.length; i++) {
    var start = i > 0 && a[i] === a[i - 1] ? lastStart : 0, size = out.length;
    for (var j = start; j < size; j++) out.push(out[j].concat(a[i]));
    lastStart = size;
  }
  return out;
}`,
  "combinations": `function combine(n, k) {
  var out = [];
  function go(start, path) {
    if (path.length === k) { out.push(path); return; }
    if (start > n) return;
    go(start + 1, path.concat(start));
    go(start + 1, path);
  }
  go(1, []);
  return out;
}`,
  "combination-sum": `function combinationSum(candidates, target) {
  var dp = [];
  for (var t = 0; t <= target; t++) dp.push([]);
  dp[0].push([]);
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    for (var s = c; s <= target; s++) for (var j = 0; j < dp[s - c].length; j++) dp[s].push(dp[s - c][j].concat(c));
  }
  return dp[target];
}`,
  "combination-sum-ii": `function combinationSum2(candidates, target) {
  var count = {}, vals = [];
  for (var i = 0; i < candidates.length; i++) { if (!count[candidates[i]]) { count[candidates[i]] = 0; vals.push(candidates[i]); } count[candidates[i]]++; }
  vals.sort(function (a, b) { return a - b; });
  var out = [];
  function go(idx, remain, path) {
    if (remain === 0) { out.push(path.slice()); return; }
    if (idx === vals.length || vals[idx] > remain) return;
    var v = vals[idx], c = 0;
    go(idx + 1, remain, path);
    while (c < count[v] && (c + 1) * v <= remain) { c++; path.push(v); go(idx + 1, remain - c * v, path); }
    for (var k = 0; k < c; k++) path.pop();
  }
  go(0, target, []);
  return out;
}`,
  "combination-sum-iii": `function combinationSum3(k, n) {
  var out = [];
  function go(d, path, sum) {
    if (path.length === k || d > 9) { if (path.length === k && sum === n) out.push(path.slice()); return; }
    path.push(d); go(d + 1, path, sum + d); path.pop();
    go(d + 1, path, sum);
  }
  go(1, [], 0);
  return out;
}`,
  "letter-combinations-of-a-phone-number": `function letterCombinations(digits) {
  if (digits.length === 0) return [];
  var keys = { "2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz" };
  var total = 1;
  for (var i = 0; i < digits.length; i++) total *= keys[digits[i]].length;
  var out = [];
  for (var m = 0; m < total; m++) {
    var x = m, s = "";
    for (var j = digits.length - 1; j >= 0; j--) { var k = keys[digits[j]]; s = k[x % k.length] + s; x = Math.floor(x / k.length); }
    out.push(s);
  }
  return out;
}`,
  "permutations": `function permute(nums) {
  var a = nums.slice(), out = [];
  function go(i) {
    if (i === a.length) { out.push(a.slice()); return; }
    for (var j = i; j < a.length; j++) {
      var t = a[i]; a[i] = a[j]; a[j] = t;
      go(i + 1);
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
  }
  go(0);
  return out;
}`,
  "permutations-ii": `function permuteUnique(nums) {
  var count = {}, keys = [], out = [];
  for (var i = 0; i < nums.length; i++) { if (count[nums[i]] === undefined) { count[nums[i]] = 0; keys.push(nums[i]); } count[nums[i]]++; }
  function go(path) {
    if (path.length === nums.length) { out.push(path.slice()); return; }
    for (var j = 0; j < keys.length; j++) {
      var v = keys[j];
      if (!count[v]) continue;
      count[v]--; path.push(v); go(path); path.pop(); count[v]++;
    }
  }
  go([]);
  return out;
}`,
  "beautiful-arrangement": `function countArrangement(n) {
  var memo = {};
  function go(pos, mask) {
    if (pos > n) return 1;
    var key = pos + ":" + mask;
    if (memo[key] !== undefined) return memo[key];
    var t = 0;
    for (var x = 1; x <= n; x++) if (!(mask & (1 << x)) && (x % pos === 0 || pos % x === 0)) t += go(pos + 1, mask | (1 << x));
    return (memo[key] = t);
  }
  return go(1, 0);
}`,
  "the-k-th-lexicographical-string-of-all-happy-strings-of-length-n": `function getHappyString(n, k) {
  var total = 3 * Math.pow(2, n - 1);
  if (k > total) return "";
  k--;
  var per = total / 3, s = "abc"[Math.floor(k / per)];
  k %= per;
  for (var i = 1; i < n; i++) {
    per /= 2;
    var opts = "abc".replace(s[s.length - 1], "");
    s += opts[Math.floor(k / per)];
    k %= per;
  }
  return s;
}`,
  "letter-tile-possibilities": `function numTilePossibilities(tiles) {
  var seen = {}, count = 0, n = tiles.length;
  function go(cur, used) {
    for (var i = 0; i < n; i++) {
      if (used & (1 << i)) continue;
      var next = cur + tiles[i];
      if (!seen[next]) { seen[next] = true; count++; go(next, used | (1 << i)); }
    }
  }
  go("", 0);
  return count;
}`,
  "palindrome-partitioning": `function partition(s) {
  var n = s.length, pal = [];
  for (var i = 0; i < n; i++) { pal.push([]); for (var j = 0; j < n; j++) pal[i].push(false); }
  for (var len = 1; len <= n; len++) for (var a = 0; a + len - 1 < n; a++) { var b = a + len - 1; pal[a][b] = s[a] === s[b] && (len <= 2 || pal[a + 1][b - 1]); }
  var memo = {};
  function go(st) {
    if (st === n) return [[]];
    if (memo[st]) return memo[st];
    var res = [];
    for (var e = st; e < n; e++) if (pal[st][e]) { var rest = go(e + 1); for (var r = 0; r < rest.length; r++) res.push([s.slice(st, e + 1)].concat(rest[r])); }
    return (memo[st] = res);
  }
  return go(0);
}`,
  "restore-ip-addresses": `function restoreIpAddresses(s) {
  var out = [];
  function valid(p) { return p.length >= 1 && p.length <= 3 && (p.length === 1 || p[0] !== "0") && parseInt(p, 10) <= 255; }
  function go(rest, parts) {
    if (parts.length === 4) { if (rest.length === 0) out.push(parts.join(".")); return; }
    if (rest.length > (4 - parts.length) * 3) return;
    for (var len = 1; len <= 3 && len <= rest.length; len++) { var p = rest.slice(0, len); if (valid(p)) go(rest.slice(len), parts.concat(p)); }
  }
  go(s, []);
  return out;
}`,
  "split-a-string-into-the-max-number-of-unique-substrings": `function maxUniqueSplit(s) {
  var best = 0, used = {};
  function go(st, count) {
    if (count + (s.length - st) <= best) return;
    if (st === s.length) { best = count; return; }
    for (var e = s.length; e > st; e--) {
      var p = s.slice(st, e);
      if (used[p]) continue;
      used[p] = true; go(e, count + 1); used[p] = false;
    }
  }
  go(0, 0);
  return best;
}`,
  "maximum-length-of-a-concatenated-string-with-unique-characters": `function maxLength(arr) {
  var sets = [""];
  var best = 0;
  for (var i = 0; i < arr.length; i++) {
    var w = arr[i];
    if (new Set(w.split("")).size !== w.length) continue;
    var size = sets.length;
    for (var j = 0; j < size; j++) {
      var cand = sets[j] + w;
      if (new Set(cand.split("")).size === cand.length) { sets.push(cand); if (cand.length > best) best = cand.length; }
    }
  }
  return best;
}`,
  "partition-to-k-equal-sum-subsets": `function canPartitionKSubsets(nums, k) {
  var total = 0;
  for (var i = 0; i < nums.length; i++) total += nums[i];
  if (total % k) return false;
  var t = total / k, n = nums.length, memo = {};
  function go(mask, cur) {
    if (mask === (1 << n) - 1) return cur === 0;
    if (memo[mask] !== undefined) return memo[mask];
    var ok = false;
    for (var j = 0; j < n && !ok; j++) if (!(mask & (1 << j)) && cur + nums[j] <= t) ok = go(mask | (1 << j), (cur + nums[j]) % t);
    return (memo[mask] = ok);
  }
  return go(0, 0);
}`,
  "matchsticks-to-square": `function makesquare(matchsticks) {
  var n = matchsticks.length, total = 0;
  for (var i = 0; i < n; i++) total += matchsticks[i];
  if (n < 4 || total % 4) return false;
  var side = total / 4, memo = {};
  function go(mask, cur) {
    if (mask === (1 << n) - 1) return cur === 0;
    if (memo[mask] !== undefined) return memo[mask];
    var ok = false;
    for (var j = 0; j < n && !ok; j++) if (!(mask & (1 << j)) && cur + matchsticks[j] <= side) ok = go(mask | (1 << j), (cur + matchsticks[j]) % side);
    return (memo[mask] = ok);
  }
  return go(0, 0);
}`,
  "word-search": `function exist(board, word) {
  var R = board.length, C = board[0].length, seen = [];
  for (var r = 0; r < R; r++) { seen.push([]); for (var c = 0; c < C; c++) seen[r].push(false); }
  function go(r, c, i) {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= R || c >= C || seen[r][c] || board[r][c] !== word[i]) return false;
    seen[r][c] = true;
    var ok = go(r, c + 1, i + 1) || go(r + 1, c, i + 1) || go(r, c - 1, i + 1) || go(r - 1, c, i + 1);
    seen[r][c] = false;
    return ok;
  }
  for (var a = 0; a < R; a++) for (var b = 0; b < C; b++) if (go(a, b, 0)) return true;
  return false;
}`,
  "path-with-maximum-gold": `function getMaximumGold(grid) {
  var R = grid.length, C = grid[0].length, best = 0, seen = {};
  function go(r, c, sum) {
    if (sum > best) best = sum;
    var d = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (var i = 0; i < 4; i++) {
      var nr = r + d[i][0], nc = c + d[i][1], key = nr * C + nc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || !grid[nr][nc] || seen[key]) continue;
      seen[key] = true; go(nr, nc, sum + grid[nr][nc]); seen[key] = false;
    }
  }
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (grid[r][c]) { seen[r * C + c] = true; go(r, c, grid[r][c]); seen[r * C + c] = false; }
  return best;
}`,
  "n-queens": `function solveNQueens(n) {
  var out = [], q = [];
  function safe(r, c) { for (var i = 0; i < r; i++) if (q[i] === c || Math.abs(q[i] - c) === r - i) return false; return true; }
  function go(r) {
    if (r === n) {
      var board = [];
      for (var i = 0; i < n; i++) { var row = ""; for (var j = 0; j < n; j++) row += q[i] === j ? "Q" : "."; board.push(row); }
      out.push(board);
      return;
    }
    for (var c = 0; c < n; c++) if (safe(r, c)) { q[r] = c; go(r + 1); }
  }
  go(0);
  return out;
}`,
  "n-queens-ii": `function totalNQueens(n) {
  var cols = {}, d1 = {}, d2 = {};
  function go(r) {
    if (r === n) return 1;
    var t = 0;
    for (var c = 0; c < n; c++) {
      if (cols[c] || d1[r - c] || d2[r + c]) continue;
      cols[c] = d1[r - c] = d2[r + c] = true;
      t += go(r + 1);
      cols[c] = d1[r - c] = d2[r + c] = false;
    }
    return t;
  }
  return go(0);
}`,
  "sudoku-solver": `function solveSudoku(board) {
  var row = [], col = [], box = [];
  for (var i = 0; i < 9; i++) { row.push(0); col.push(0); box.push(0); }
  for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (board[r][c] !== ".") { var bit = 1 << +board[r][c]; row[r] |= bit; col[c] |= bit; box[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= bit; }
  function go(pos) {
    while (pos < 81 && board[Math.floor(pos / 9)][pos % 9] !== ".") pos++;
    if (pos === 81) return true;
    var rr = Math.floor(pos / 9), cc = pos % 9, b = Math.floor(rr / 3) * 3 + Math.floor(cc / 3);
    for (var d = 1; d <= 9; d++) {
      var m = 1 << d;
      if ((row[rr] | col[cc] | box[b]) & m) continue;
      board[rr][cc] = String(d); row[rr] |= m; col[cc] |= m; box[b] |= m;
      if (go(pos + 1)) return true;
      board[rr][cc] = "."; row[rr] &= ~m; col[cc] &= ~m; box[b] &= ~m;
    }
    return false;
  }
  go(0);
}`,
  "permutation-sequence": `function getPermutation(n, k) {
  function fact(x) { return x <= 1 ? 1 : x * fact(x - 1); }
  function go(digits, kk) {
    if (digits.length === 0) return "";
    var f = fact(digits.length - 1), idx = Math.floor((kk - 1) / f);
    var d = digits[idx];
    return d + go(digits.slice(0, idx).concat(digits.slice(idx + 1)), kk - idx * f);
  }
  var ds = [];
  for (var i = 1; i <= n; i++) ds.push(i);
  return go(ds, k);
}`,
  "expression-add-operators": `function addOperators(num, target) {
  var out = [];
  function go(i, expr, sum, term) {
    if (i === num.length) { if (sum + term === target) out.push(expr); return; }
    for (var j = i + 1; j <= num.length; j++) {
      var s = num.slice(i, j);
      if (s.length > 1 && s[0] === "0") break;
      var v = parseInt(s, 10);
      if (i === 0) { go(j, s, 0, v); continue; }
      go(j, expr + "+" + s, sum + term, v);
      go(j, expr + "-" + s, sum + term, -v);
      go(j, expr + "*" + s, sum, term * v);
    }
  }
  go(0, "", 0, 0);
  return out;
}`,
  "word-break-ii": `function wordBreak(s, wordDict) {
  var dict = {}, out = [];
  for (var i = 0; i < wordDict.length; i++) dict[wordDict[i]] = true;
  var n = s.length, can = [];
  for (var a = 0; a <= n; a++) can.push(false);
  can[n] = true;
  for (var st = n - 1; st >= 0; st--) for (var e = st + 1; e <= n; e++) if (dict[s.slice(st, e)] && can[e]) { can[st] = true; break; }
  function go(st, words) {
    if (st === n) { out.push(words.join(" ")); return; }
    for (var e = st + 1; e <= n; e++) { var w = s.slice(st, e); if (dict[w] && can[e]) { words.push(w); go(e, words); words.pop(); } }
  }
  if (can[0]) go(0, []);
  return out;
}`,
  "remove-invalid-parentheses": `function removeInvalidParentheses(s) {
  var best = -1, found = {};
  function go(i, open, kept) {
    if (open < 0) return;
    if (kept.length + (s.length - i) < best) return;
    if (i === s.length) {
      if (open !== 0) return;
      if (kept.length > best) { best = kept.length; found = {}; }
      if (kept.length === best) found[kept] = true;
      return;
    }
    var c = s[i];
    if (c === "(" || c === ")") go(i + 1, open, kept);
    go(i + 1, open + (c === "(" ? 1 : c === ")" ? -1 : 0), kept + c);
  }
  go(0, 0, "");
  return Object.keys(found);
}`,
};
