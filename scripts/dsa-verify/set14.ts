/** Blind solutions for the seeded problems the Greedy Ladder judges (scripts/dsa-testcases/specs/ladder-greedy-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "assign-cookies": `function findContentChildren(g, s) {
  var a = g.slice().sort(function (x, y) { return y - x; }), b = s.slice().sort(function (x, y) { return y - x; }), j = 0, c = 0;
  for (var i = 0; i < a.length && j < b.length; i++) if (b[j] >= a[i]) { c++; j++; }
  return c;
}`,
  "lemonade-change": `function lemonadeChange(bills) {
  var have = { 5: 0, 10: 0 };
  for (var i = 0; i < bills.length; i++) {
    var owe = bills[i] - 5;
    if (bills[i] !== 20) have[bills[i]]++;
    if (owe >= 10 && have[10] > 0) { have[10]--; owe -= 10; }
    while (owe > 0 && have[5] > 0) { have[5]--; owe -= 5; }
    if (owe > 0) return false;
  }
  return true;
}`,
  "maximum-units-on-a-truck": `function maximumUnits(boxTypes, truckSize) {
  var byUnits = [], u, t = 0;
  for (var i = 0; i < boxTypes.length; i++) byUnits[boxTypes[i][1]] = (byUnits[boxTypes[i][1]] || 0) + boxTypes[i][0];
  for (u = byUnits.length - 1; u >= 0 && truckSize > 0; u--) {
    if (!byUnits[u]) continue;
    var k = Math.min(byUnits[u], truckSize);
    t += k * u; truckSize -= k;
  }
  return t;
}`,
  "two-city-scheduling": `function twoCitySchedCost(costs) {
  var n = costs.length / 2, base = 0, diffs = [];
  for (var i = 0; i < costs.length; i++) { base += costs[i][1]; diffs.push(costs[i][0] - costs[i][1]); }
  diffs.sort(function (a, b) { return a - b; });
  for (var j = 0; j < n; j++) base += diffs[j];
  return base;
}`,
  "bag-of-tokens": `function bagOfTokensScore(tokens, power) {
  var t = tokens.slice().sort(function (a, b) { return a - b; }), best = 0;
  for (var sold = 0; sold <= t.length; sold++) {
    if (sold > 0 && (t.length === 0 || power < t[0])) break;
    var p = power, bought = 0, i;
    for (i = t.length - sold; i < t.length; i++) p += t[i];
    for (i = 0; i < t.length - sold && p >= t[i]; i++) { p -= t[i]; bought++; }
    best = Math.max(best, bought - sold);
  }
  return best;
}`,
  "eliminate-maximum-number-of-monsters": `function eliminateMaximum(dist, speed) {
  var n = dist.length, cnt = [], i;
  for (i = 0; i <= n; i++) cnt.push(0);
  for (i = 0; i < n; i++) { var t = Math.ceil(dist[i] / speed[i]); if (t < n) cnt[t]++; }
  var arrived = 0;
  for (i = 0; i < n; i++) { arrived += cnt[i]; if (arrived > i) return i; }
  return n;
}`,
  "best-time-to-buy-and-sell-stock-ii": `function maxProfit(prices) {
  var p = 0, i = 0, n = prices.length;
  while (i < n - 1) {
    while (i < n - 1 && prices[i + 1] <= prices[i]) i++;
    var buy = prices[i];
    while (i < n - 1 && prices[i + 1] >= prices[i]) i++;
    p += prices[i] - buy;
  }
  return p;
}`,
  "jump-game-ii": `function jump(nums) {
  var n = nums.length;
  if (n === 1) return 0;
  var dist = [0], q = [0], seen = {};
  seen[0] = true;
  for (var h = 0; h < q.length; h++) {
    var i = q[h];
    for (var k = 1; k <= nums[i]; k++) {
      var j = i + k;
      if (j >= n - 1) return dist[i] + 1;
      if (!seen[j]) { seen[j] = true; dist[j] = dist[i] + 1; q.push(j); }
    }
  }
  return -1;
}`,
  "gas-station": `function canCompleteCircuit(gas, cost) {
  var n = gas.length, sum = 0, minSum = Infinity, minAt = 0, i;
  for (i = 0; i < n; i++) {
    sum += gas[i] - cost[i];
    if (sum < minSum) { minSum = sum; minAt = i; }
  }
  if (sum < 0) return -1;
  return minSum >= 0 ? 0 : (minAt + 1) % n;
}`,
  "increasing-triplet-subsequence": `function increasingTriplet(nums) {
  var n = nums.length, leftMin = [], rightMax = [], i;
  for (i = 0; i < n; i++) leftMin[i] = i ? Math.min(leftMin[i - 1], nums[i]) : nums[i];
  for (i = n - 1; i >= 0; i--) rightMax[i] = i < n - 1 ? Math.max(rightMax[i + 1], nums[i]) : nums[i];
  for (i = 1; i < n - 1; i++) if (leftMin[i - 1] < nums[i] && nums[i] < rightMax[i + 1]) return true;
  return false;
}`,
  "wiggle-subsequence": `function wiggleMaxLength(nums) {
  var len = 1, prev = 0;
  for (var i = 1; i < nums.length; i++) {
    var d = nums[i] - nums[i - 1];
    if ((d > 0 && prev <= 0) || (d < 0 && prev >= 0)) { len++; prev = d; }
  }
  return len;
}`,
  "non-decreasing-array": `function checkPossibility(nums) {
  function ok(a) { for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false; return true; }
  for (var i = 0; i + 1 < nums.length; i++) {
    if (nums[i] > nums[i + 1]) {
      var a = nums.slice(), b = nums.slice();
      a[i] = nums[i + 1]; b[i + 1] = nums[i];
      return ok(a) || ok(b);
    }
  }
  return true;
}`,
  "maximum-swap": `function maximumSwap(num) {
  var d = String(num).split(""), n = d.length, maxIdx = [], best = n - 1, i;
  for (i = n - 1; i >= 0; i--) { if (d[i] > d[best]) best = i; maxIdx[i] = best; }
  for (i = 0; i < n; i++) {
    if (d[maxIdx[i]] > d[i]) { var t = d[i]; d[i] = d[maxIdx[i]]; d[maxIdx[i]] = t; break; }
  }
  return Number(d.join(""));
}`,
  "broken-calculator": `function brokenCalc(startValue, target) {
  if (target <= startValue) return startValue - target;
  return target % 2 === 0 ? 1 + brokenCalc(startValue, target / 2) : 1 + brokenCalc(startValue, target + 1);
}`,
  "minimize-maximum-of-array": `function minimizeArrayValue(nums) {
  var lo = 0, hi = 0, i;
  for (i = 0; i < nums.length; i++) hi = Math.max(hi, nums[i]);
  while (lo < hi) {
    var m = Math.floor((lo + hi) / 2), excess = 0, ok = true;
    for (i = 0; i < nums.length; i++) {
      excess += m - nums[i];
      if (excess < 0) { ok = false; break; }
    }
    if (ok) hi = m; else lo = m + 1;
  }
  return lo;
}`,
  "minimum-moves-to-equal-array-elements-ii": `function minMoves2(nums) {
  var a = nums.slice().sort(function (x, y) { return x - y; }), med = a[Math.floor(a.length / 2)], m = 0;
  for (var i = 0; i < a.length; i++) m += Math.abs(a[i] - med);
  return m;
}`,
  "valid-parenthesis-string": `function checkValidString(s) {
  var open = [], star = [], i;
  for (i = 0; i < s.length; i++) {
    if (s[i] === "(") open.push(i);
    else if (s[i] === "*") star.push(i);
    else if (open.length) open.pop();
    else if (star.length) star.pop();
    else return false;
  }
  while (open.length) {
    if (!star.length || star[star.length - 1] < open[open.length - 1]) return false;
    star.pop(); open.pop();
  }
  return true;
}`,
  "insert-interval": `function insert(intervals, newInterval) {
  var out = [], s = newInterval[0], e = newInterval[1], placed = false;
  for (var i = 0; i < intervals.length; i++) {
    var iv = intervals[i];
    if (iv[1] < s) out.push(iv);
    else if (iv[0] > e) { if (!placed) { out.push([s, e]); placed = true; } out.push(iv); }
    else { s = Math.min(s, iv[0]); e = Math.max(e, iv[1]); }
  }
  if (!placed) out.push([s, e]);
  return out;
}`,
  "non-overlapping-intervals": `function eraseOverlapIntervals(intervals) {
  var a = intervals.slice().sort(function (x, y) { return x[0] - y[0]; }), r = 0;
  if (!a.length) return 0;
  var end = a[0][1];
  for (var i = 1; i < a.length; i++) {
    if (a[i][0] < end) { r++; end = Math.min(end, a[i][1]); }
    else end = a[i][1];
  }
  return r;
}`,
  "minimum-number-of-arrows-to-burst-balloons": `function findMinArrowShots(points) {
  var a = points.slice().sort(function (x, y) { return x[0] - y[0]; }), n = 1, end = a[0][1];
  for (var i = 1; i < a.length; i++) {
    if (a[i][0] > end) { n++; end = a[i][1]; }
    else end = Math.min(end, a[i][1]);
  }
  return n;
}`,
  "maximum-length-of-pair-chain": `function findLongestChain(pairs) {
  var a = pairs.slice().sort(function (x, y) { return x[0] - y[0]; }), c = 1, end = a[0][1];
  for (var i = 1; i < a.length; i++) {
    if (a[i][0] > end) { c++; end = a[i][1]; }
    else end = Math.min(end, a[i][1]);
  }
  return c;
}`,
  "remove-covered-intervals": `function removeCoveredIntervals(intervals) {
  var c = 0;
  for (var i = 0; i < intervals.length; i++) {
    var covered = false;
    for (var j = 0; j < intervals.length; j++) {
      if (i !== j && intervals[j][0] <= intervals[i][0] && intervals[i][1] <= intervals[j][1]) { covered = true; break; }
    }
    if (!covered) c++;
  }
  return c;
}`,
  "car-pooling": `function carPooling(trips, capacity) {
  var ev = [], i;
  for (i = 0; i < trips.length; i++) { ev.push([trips[i][1], trips[i][0]]); ev.push([trips[i][2], -trips[i][0]]); }
  ev.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var load = 0;
  for (i = 0; i < ev.length; i++) { load += ev[i][1]; if (load > capacity) return false; }
  return true;
}`,
  "count-days-without-meetings": `function countDays(days, meetings) {
  var ev = [], i;
  for (i = 0; i < meetings.length; i++) { ev.push([meetings[i][0], 1]); ev.push([meetings[i][1] + 1, -1]); }
  ev.sort(function (a, b) { return a[0] - b[0]; });
  var open = 0, last = 1, free = 0;
  for (i = 0; i < ev.length; i++) {
    if (open === 0 && ev[i][0] > last) free += ev[i][0] - last;
    open += ev[i][1];
    last = ev[i][0];
  }
  return free + Math.max(0, days + 1 - last);
}`,
  "video-stitching": `function videoStitching(clips, time) {
  var reach = 0, count = 0;
  while (reach < time) {
    var next = reach;
    for (var i = 0; i < clips.length; i++) if (clips[i][0] <= reach && clips[i][1] > next) next = clips[i][1];
    if (next === reach) return -1;
    reach = next; count++;
  }
  return count;
}`,
  "largest-number": `function largestNumber(nums) {
  var s = nums.map(String);
  for (var i = 0; i < s.length; i++) for (var j = i + 1; j < s.length; j++) if (s[j] + s[i] > s[i] + s[j]) { var t = s[i]; s[i] = s[j]; s[j] = t; }
  var r = s.join("");
  return r[0] === "0" ? "0" : r;
}`,
  "queue-reconstruction-by-height": `function reconstructQueue(people) {
  var n = people.length, out = [], i;
  for (i = 0; i < n; i++) out.push(null);
  var a = people.slice().sort(function (x, y) { return x[0] - y[0] || y[1] - x[1]; });
  for (i = 0; i < n; i++) {
    var empty = a[i][1];
    for (var j = 0; j < n; j++) {
      if (out[j] === null) { if (empty === 0) { out[j] = a[i]; break; } empty--; }
    }
  }
  return out;
}`,
  "hand-of-straights": `function isNStraightHand(hand, groupSize) {
  if (hand.length % groupSize) return false;
  var cnt = {}, keys = [], i;
  for (i = 0; i < hand.length; i++) { if (!cnt[hand[i]]) { cnt[hand[i]] = 0; keys.push(hand[i]); } cnt[hand[i]]++; }
  keys.sort(function (a, b) { return a - b; });
  for (i = 0; i < keys.length; i++) {
    while (cnt[keys[i]] > 0) {
      for (var v = keys[i]; v < keys[i] + groupSize; v++) { if (!cnt[v]) return false; cnt[v]--; }
    }
  }
  return true;
}`,
  "merge-triplets-to-form-target-triplet": `function mergeTriplets(triplets, target) {
  var cur = [0, 0, 0];
  for (var i = 0; i < triplets.length; i++) {
    var t = triplets[i];
    if (t[0] <= target[0] && t[1] <= target[1] && t[2] <= target[2]) for (var k = 0; k < 3; k++) cur[k] = Math.max(cur[k], t[k]);
  }
  return cur[0] === target[0] && cur[1] === target[1] && cur[2] === target[2];
}`,
  "minimum-deletions-to-make-character-frequencies-unique": `function minDeletions(s) {
  var cnt = {}, i, f = [];
  for (i = 0; i < s.length; i++) cnt[s[i]] = (cnt[s[i]] || 0) + 1;
  for (var c in cnt) f.push(cnt[c]);
  f.sort(function (a, b) { return a - b; });
  var d = 0;
  for (i = f.length - 2; i >= 0; i--) {
    if (f[i] >= f[i + 1]) { var keep = Math.max(0, f[i + 1] - 1); d += f[i] - keep; f[i] = keep; }
  }
  return d;
}`,
  "jump-game-vii": `function canReach(s, minJump, maxJump) {
  var n = s.length, q = [0], far = 0;
  for (var h = 0; h < q.length; h++) {
    var i = q[h];
    if (i === n - 1) return true;
    var start = Math.max(i + minJump, far + 1), end = Math.min(i + maxJump, n - 1);
    for (var j = start; j <= end; j++) if (s[j] === "0") q.push(j);
    far = Math.max(far, end);
  }
  return false;
}`,
  "candy": `function candy(ratings) {
  var n = ratings.length, order = [], c = [], i;
  for (i = 0; i < n; i++) { order.push(i); c.push(1); }
  order.sort(function (a, b) { return ratings[a] - ratings[b]; });
  for (var k = 0; k < n; k++) {
    i = order[k];
    if (i > 0 && ratings[i - 1] < ratings[i]) c[i] = Math.max(c[i], c[i - 1] + 1);
    if (i < n - 1 && ratings[i + 1] < ratings[i]) c[i] = Math.max(c[i], c[i + 1] + 1);
  }
  var t = 0;
  for (i = 0; i < n; i++) t += c[i];
  return t;
}`,
  "minimum-number-of-taps-to-open-to-water-a-garden": `function minTaps(n, ranges) {
  var reach = 0, taps = 0;
  while (reach < n) {
    var next = reach;
    for (var i = 0; i < ranges.length; i++) if (i - ranges[i] <= reach && i + ranges[i] > next) next = i + ranges[i];
    if (next === reach) return -1;
    reach = next; taps++;
  }
  return taps;
}`,
};
