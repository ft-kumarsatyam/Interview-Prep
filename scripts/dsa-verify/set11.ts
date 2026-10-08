/** Blind solutions for the seeded problems the Stack & Queue Ladder judges (scripts/dsa-testcases/specs/ladder-stack-seeded.ts). */
export const driver = (cls: string) => `
function runOps(ops) {
  var a = ops[0].slice(1), obj = new (Function.prototype.bind.apply(${cls}, [null].concat(a)))(), out = [null];
  for (var i = 1; i < ops.length; i++) {
    var r = obj[ops[i][0]].apply(obj, ops[i].slice(1));
    out.push(r === undefined ? null : r);
  }
  return out;
}`;

export const SOLUTIONS: Record<string, string> = {
  "implement-stack-using-queues": `function MyStack() { this.a = []; this.b = []; }
MyStack.prototype.push = function (x) {
  this.b.push(x);
  while (this.a.length) this.b.push(this.a.shift());
  var t = this.a; this.a = this.b; this.b = t;
};
MyStack.prototype.pop = function () { return this.a.shift(); };
MyStack.prototype.top = function () { return this.a[0]; };
MyStack.prototype.empty = function () { return this.a.length === 0; };${driver("MyStack")}`,
  "implement-queue-using-stacks": `function MyQueue() { this.s = []; }
MyQueue.prototype.push = function (x) {
  var tmp = [];
  while (this.s.length) tmp.push(this.s.pop());
  this.s.push(x);
  while (tmp.length) this.s.push(tmp.pop());
};
MyQueue.prototype.pop = function () { return this.s.pop(); };
MyQueue.prototype.peek = function () { return this.s[this.s.length - 1]; };
MyQueue.prototype.empty = function () { return this.s.length === 0; };${driver("MyQueue")}`,
  "baseball-game": `function calPoints(operations) {
  var r = [];
  for (var i = 0; i < operations.length; i++) {
    var o = operations[i], n = r.length;
    if (o === "+") r[n] = r[n - 1] + r[n - 2];
    else if (o === "D") r[n] = r[n - 1] * 2;
    else if (o === "C") r.length = n - 1;
    else r[n] = parseInt(o, 10);
  }
  var s = 0;
  for (var j = 0; j < r.length; j++) s += r[j];
  return s;
}`,
  "make-the-string-great": `function makeGood(s) {
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i + 1 < s.length; i++) {
      if (s[i] !== s[i + 1] && s[i].toLowerCase() === s[i + 1].toLowerCase()) { s = s.slice(0, i) + s.slice(i + 2); changed = true; break; }
    }
  }
  return s;
}`,
  "number-of-recent-calls": `function RecentCounter() { this.t = []; }
RecentCounter.prototype.ping = function (t) {
  this.t.push(t);
  var c = 0;
  for (var i = 0; i < this.t.length; i++) if (this.t[i] >= t - 3000) c++;
  return c;
};${driver("RecentCounter")}`,
  "min-stack": `function MinStack() { this.v = []; this.m = []; }
MinStack.prototype.push = function (x) {
  this.v.push(x);
  if (!this.m.length || x <= this.m[this.m.length - 1]) this.m.push(x);
};
MinStack.prototype.pop = function () {
  var x = this.v.pop();
  if (x === this.m[this.m.length - 1]) this.m.pop();
};
MinStack.prototype.top = function () { return this.v[this.v.length - 1]; };
MinStack.prototype.getMin = function () { return this.m[this.m.length - 1]; };${driver("MinStack")}`,
  "simplify-path": `function simplifyPath(path) {
  var parts = path.split("/"), out = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p === "" || p === ".") continue;
    if (p === "..") { if (out.length) out.pop(); }
    else out.push(p);
  }
  return "/" + out.join("/");
}`,
  "validate-stack-sequences": `function validateStackSequences(pushed, popped) {
  var top = -1, j = 0, a = pushed.slice();
  for (var i = 0; i < a.length; i++) {
    a[++top] = a[i];
    while (top >= 0 && a[top] === popped[j]) { top--; j++; }
  }
  return top === -1;
}`,
  "asteroid-collision": `function asteroidCollision(asteroids) {
  var a = asteroids.slice(), changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i + 1 < a.length; i++) {
      if (a[i] > 0 && a[i + 1] < 0) {
        var x = a[i], y = -a[i + 1];
        if (x > y) a.splice(i + 1, 1);
        else if (x < y) a.splice(i, 1);
        else a.splice(i, 2);
        changed = true;
        break;
      }
    }
  }
  return a;
}`,
  "remove-all-adjacent-duplicates-in-string-ii": `function removeDuplicates(s, k) {
  var changed = true;
  while (changed) {
    changed = false;
    var i = 0;
    while (i < s.length) {
      var j = i;
      while (j < s.length && s[j] === s[i]) j++;
      if (j - i >= k) { s = s.slice(0, i) + s.slice(i + k); changed = true; break; }
      i = j;
    }
  }
  return s;
}`,
  "score-of-parentheses": `function scoreOfParentheses(s) {
  var ans = 0, depth = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else { depth--; if (s[i - 1] === "(") ans += Math.pow(2, depth); }
  }
  return ans;
}`,
  "exclusive-time-of-functions": `function exclusiveTime(n, logs) {
  var res = [], st = [], i;
  for (i = 0; i < n; i++) res.push(0);
  for (i = 0; i < logs.length; i++) {
    var p = logs[i].split(":"), id = +p[0], t = +p[2];
    if (p[1] === "start") st.push({ id: id, t: t, child: 0 });
    else {
      var f = st.pop(), total = t - f.t + 1;
      res[f.id] += total - f.child;
      if (st.length) st[st.length - 1].child += total;
    }
  }
  return res;
}`,
  "basic-calculator-ii": `function calculate(s) {
  s = s.replace(/ /g, "");
  var total = 0, last = 0, num = 0, op = "+";
  for (var i = 0; i <= s.length; i++) {
    var c = s[i];
    if (c >= "0" && c <= "9") { num = num * 10 + (c.charCodeAt(0) - 48); continue; }
    if (op === "+") { total += last; last = num; }
    else if (op === "-") { total += last; last = -num; }
    else if (op === "*") last = last * num;
    else last = last < 0 ? -Math.floor(-last / num) : Math.floor(last / num);
    op = c; num = 0;
  }
  return total + last;
}`,
  "dota2-senate": `function predictPartyVictory(senate) {
  var s = senate.split(""), banR = 0, banD = 0;
  while (true) {
    var next = [], r = 0, d = 0;
    for (var i = 0; i < s.length; i++) {
      if (s[i] === "R") { if (banR) banR--; else { next.push("R"); banD++; r++; } }
      else { if (banD) banD--; else { next.push("D"); banR++; d++; } }
    }
    if (!d && next.length) return "Radiant";
    if (!r && next.length) return "Dire";
    s = next;
  }
}`,
  "next-greater-element-ii": `function nextGreaterElements(nums) {
  var n = nums.length, res = [];
  for (var i = 0; i < n; i++) {
    var v = -1;
    for (var k = 1; k < n; k++) if (nums[(i + k) % n] > nums[i]) { v = nums[(i + k) % n]; break; }
    res.push(v);
  }
  return res;
}`,
  "online-stock-span": `function StockSpanner() { this.p = []; }
StockSpanner.prototype.next = function (price) {
  this.p.push(price);
  var c = 0;
  for (var i = this.p.length - 1; i >= 0 && this.p[i] <= price; i--) c++;
  return c;
};${driver("StockSpanner")}`,
  "remove-k-digits": `function removeKdigits(num, k) {
  var st = [];
  for (var i = 0; i < num.length; i++) {
    while (k > 0 && st.length && st[st.length - 1] > num[i]) { st.pop(); k--; }
    st.push(num[i]);
  }
  st.length -= k;
  var r = st.join("").replace(/^0+/, "");
  return r === "" ? "0" : r;
}`,
  "car-fleet": `function carFleet(target, position, speed) {
  var cars = [], i;
  for (i = 0; i < position.length; i++) cars.push([position[i], speed[i]]);
  cars.sort(function (a, b) { return b[0] - a[0]; });
  var fleets = 0, slowest = 0;
  for (i = 0; i < cars.length; i++) {
    var dist = target - cars[i][0], sp = cars[i][1];
    if (dist * 1 > slowest * sp) { fleets++; slowest = dist / sp; }
  }
  return fleets;
}`,
  "132-pattern": `function find132pattern(nums) {
  var n = nums.length, lo = nums[0];
  for (var j = 1; j < n; j++) {
    for (var k = j + 1; k < n; k++) if (lo < nums[k] && nums[k] < nums[j]) return true;
    if (nums[j] < lo) lo = nums[j];
  }
  return false;
}`,
  "sum-of-subarray-minimums": `function sumSubarrayMins(arr) {
  var MOD = 1000000007, n = arr.length, dp = [], st = [], ans = 0;
  for (var i = 0; i < n; i++) {
    while (st.length && arr[st[st.length - 1]] >= arr[i]) st.pop();
    var p = st.length ? st[st.length - 1] : -1;
    dp[i] = ((p >= 0 ? dp[p] : 0) + (i - p) * arr[i]) % MOD;
    st.push(i);
    ans = (ans + dp[i]) % MOD;
  }
  return ans;
}`,
  "remove-duplicate-letters": `function removeDuplicateLetters(s) {
  var last = {}, used = {}, st = [], i;
  for (i = 0; i < s.length; i++) last[s[i]] = i;
  for (i = 0; i < s.length; i++) {
    var c = s[i];
    if (used[c]) continue;
    while (st.length && st[st.length - 1] > c && last[st[st.length - 1]] > i) used[st.pop()] = false;
    st.push(c); used[c] = true;
  }
  return st.join("");
}`,
  "maximal-rectangle": `function maximalRectangle(matrix) {
  var R = matrix.length, C = matrix[0].length, best = 0, w = [], r, c;
  for (r = 0; r < R; r++) { w.push([]); for (c = 0; c < C; c++) w[r][c] = matrix[r][c] === "1" ? (c ? w[r][c - 1] : 0) + 1 : 0; }
  for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
    var minW = Infinity;
    for (var k = r; k >= 0 && w[k][c]; k--) { minW = Math.min(minW, w[k][c]); best = Math.max(best, minW * (r - k + 1)); }
  }
  return best;
}`,
  "sliding-window-maximum": `function maxSlidingWindow(nums, k) {
  var n = nums.length, left = [], right = [], res = [], i;
  for (i = 0; i < n; i++) left[i] = i % k === 0 ? nums[i] : Math.max(left[i - 1], nums[i]);
  for (i = n - 1; i >= 0; i--) right[i] = (i === n - 1 || (i + 1) % k === 0) ? nums[i] : Math.max(right[i + 1], nums[i]);
  for (i = 0; i + k <= n; i++) res.push(Math.max(right[i], left[i + k - 1]));
  return res;
}`,
  "longest-valid-parentheses": `function longestValidParentheses(s) {
  var best = 0, l = 0, r = 0, i;
  for (i = 0; i < s.length; i++) {
    if (s[i] === "(") l++; else r++;
    if (l === r) best = Math.max(best, 2 * r); else if (r > l) l = r = 0;
  }
  l = r = 0;
  for (i = s.length - 1; i >= 0; i--) {
    if (s[i] === "(") l++; else r++;
    if (l === r) best = Math.max(best, 2 * l); else if (l > r) l = r = 0;
  }
  return best;
}`,
  "basic-calculator": `function calculate(s) {
  var i = 0;
  s = s.replace(/ /g, "");
  function expr() {
    var total = 0, sign = 1;
    while (i < s.length && s[i] !== ")") {
      var c = s[i];
      if (c === "+") { sign = 1; i++; }
      else if (c === "-") { sign = -1; i++; }
      else if (c === "(") { i++; total += sign * expr(); i++; }
      else { var n = 0; while (i < s.length && s[i] >= "0" && s[i] <= "9") n = n * 10 + (s.charCodeAt(i++) - 48); total += sign * n; }
    }
    return total;
  }
  return expr();
}`,
  "maximum-frequency-stack": `function FreqStack() { this.items = []; this.seq = 0; }
FreqStack.prototype.push = function (val) { this.items.push([val, this.seq++]); };
FreqStack.prototype.pop = function () {
  var cnt = {}, i, best = -1, bestF = 0;
  for (i = 0; i < this.items.length; i++) cnt[this.items[i][0]] = (cnt[this.items[i][0]] || 0) + 1;
  for (i = 0; i < this.items.length; i++) {
    var f = cnt[this.items[i][0]];
    if (f >= bestF) { bestF = f; best = i; }
  }
  return this.items.splice(best, 1)[0][0];
};${driver("FreqStack")}`,
  "lru-cache": `function LRUCache(capacity) { this.cap = capacity; this.keys = []; this.vals = {}; }
LRUCache.prototype.touch = function (key) {
  var i = this.keys.indexOf(key);
  if (i >= 0) this.keys.splice(i, 1);
  this.keys.push(key);
};
LRUCache.prototype.get = function (key) {
  if (!(key in this.vals)) return -1;
  this.touch(key);
  return this.vals[key];
};
LRUCache.prototype.put = function (key, value) {
  if (!(key in this.vals) && this.keys.length === this.cap) delete this.vals[this.keys.shift()];
  this.vals[key] = value;
  this.touch(key);
};${driver("LRUCache")}`,
  "lfu-cache": `function LFUCache(capacity) { this.cap = capacity; this.m = {}; this.clock = 0; this.size = 0; }
LFUCache.prototype.get = function (key) {
  var e = this.m[key];
  if (!e) return -1;
  e.f++; e.t = this.clock++;
  return e.v;
};
LFUCache.prototype.put = function (key, value) {
  var e = this.m[key];
  if (e) { e.v = value; e.f++; e.t = this.clock++; return; }
  if (this.size === this.cap) {
    var victim = null;
    for (var k in this.m) {
      var x = this.m[k];
      if (!victim || x.f < this.m[victim].f || (x.f === this.m[victim].f && x.t < this.m[victim].t)) victim = k;
    }
    delete this.m[victim];
    this.size--;
  }
  this.m[key] = { v: value, f: 1, t: this.clock++ };
  this.size++;
};${driver("LFUCache")}`,
};
