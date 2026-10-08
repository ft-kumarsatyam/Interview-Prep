/** Blind solutions for the seeded problems the Heaps Ladder judges (scripts/dsa-testcases/specs/ladder-heaps-seeded.ts). */
import { driver } from "./set11";

const INSERT = `
function insertSorted(a, x) {
  var lo = 0, hi = a.length;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; }
  a.splice(lo, 0, x);
}`;

export const SOLUTIONS: Record<string, string> = {
  "kth-largest-element-in-a-stream": `${INSERT}
function KthLargest(k, nums) { this.k = k; this.a = []; for (var i = 0; i < nums.length; i++) insertSorted(this.a, nums[i]); }
KthLargest.prototype.add = function (val) { insertSorted(this.a, val); return this.a[this.a.length - this.k]; };${driver("KthLargest")}`,
  "last-stone-weight": `function lastStoneWeight(stones) {
  var cnt = [], max = 0, i;
  for (i = 0; i < stones.length; i++) { cnt[stones[i]] = (cnt[stones[i]] || 0) + 1; if (stones[i] > max) max = stones[i]; }
  var held = 0;
  for (var w = max; w > 0; w--) {
    while (cnt[w] > 0) {
      if (held === 0) { held = w; cnt[w]--; }
      else { var d = held - w; cnt[w]--; held = 0; if (d > 0) { cnt[d] = (cnt[d] || 0) + 1; if (d > w) { w = d + 1; break; } } }
    }
  }
  return held;
}`,
  "k-closest-points-to-origin": `function kClosest(points, k) {
  var idx = [], i;
  for (i = 0; i < points.length; i++) idx.push(i);
  function d(j) { return points[j][0] * points[j][0] + points[j][1] * points[j][1]; }
  idx.sort(function (a, b) { return d(a) - d(b); });
  var out = [];
  for (i = 0; i < k; i++) out.push(points[idx[i]]);
  return out;
}`,
  "kth-largest-element-in-an-array": `function findKthLargest(nums, k) {
  var lo = Infinity, hi = -Infinity, i;
  for (i = 0; i < nums.length; i++) { if (nums[i] < lo) lo = nums[i]; if (nums[i] > hi) hi = nums[i]; }
  var cnt = new Array(hi - lo + 1);
  for (i = 0; i < cnt.length; i++) cnt[i] = 0;
  for (i = 0; i < nums.length; i++) cnt[nums[i] - lo]++;
  for (i = cnt.length - 1; i >= 0; i--) { k -= cnt[i]; if (k <= 0) return i + lo; }
  return lo;
}`,
  "task-scheduler": `function leastInterval(tasks, n) {
  var c = {}, i, list = [];
  for (i = 0; i < tasks.length; i++) c[tasks[i]] = (c[tasks[i]] || 0) + 1;
  for (var key in c) list.push(c[key]);
  var time = 0, left = tasks.length;
  while (left > 0) {
    list.sort(function (a, b) { return b - a; });
    var used = 0;
    for (i = 0; i < list.length && used < n + 1; i++) if (list[i] > 0) { list[i]--; used++; left--; }
    time += left > 0 ? n + 1 : used;
  }
  return time;
}`,
  "design-twitter": `function Twitter() { this.t = 0; this.posts = {}; this.fol = {}; }
Twitter.prototype.postTweet = function (u, id) { (this.posts[u] = this.posts[u] || []).push({ t: this.t++, id: id }); };
Twitter.prototype.getNewsFeed = function (u) {
  var users = [u], all = [], i, j;
  var f = this.fol[u] || {};
  for (var v in f) if (f[v] && Number(v) !== u) users.push(Number(v));
  for (i = 0; i < users.length; i++) { var p = this.posts[users[i]] || []; for (j = 0; j < p.length; j++) all.push(p[j]); }
  all.sort(function (a, b) { return b.t - a.t; });
  var out = [];
  for (i = 0; i < all.length && i < 10; i++) out.push(all[i].id);
  return out;
};
Twitter.prototype.follow = function (a, b) { (this.fol[a] = this.fol[a] || {})[b] = true; };
Twitter.prototype.unfollow = function (a, b) { if (this.fol[a]) this.fol[a][b] = false; };${driver("Twitter")}`,
  "top-k-frequent-words": `function topKFrequent(words, k) {
  var c = {}, i, buckets = [];
  for (i = 0; i < words.length; i++) c[words[i]] = (c[words[i]] || 0) + 1;
  for (var w in c) (buckets[c[w]] = buckets[c[w]] || []).push(w);
  var out = [];
  for (i = buckets.length - 1; i > 0 && out.length < k; i--) {
    if (!buckets[i]) continue;
    buckets[i].sort();
    for (var j = 0; j < buckets[i].length && out.length < k; j++) out.push(buckets[i][j]);
  }
  return out;
}`,
  "reorganize-string": `function reorganizeString(s) {
  var c = {}, i, keys = [];
  for (i = 0; i < s.length; i++) c[s[i]] = (c[s[i]] || 0) + 1;
  for (var ch in c) keys.push(ch);
  keys.sort(function (a, b) { return c[b] - c[a]; });
  if (c[keys[0]] > Math.ceil(s.length / 2)) return "";
  var out = new Array(s.length), pos = 0;
  for (i = 0; i < keys.length; i++) for (var n = 0; n < c[keys[i]]; n++) { if (pos >= s.length) pos = 1; out[pos] = keys[i]; pos += 2; }
  return out.join("");
}`,
  "ugly-number-ii": `function nthUglyNumber(n) {
  var u = [1], a = 0, b = 0, c = 0;
  while (u.length < n) {
    var x = Math.min(u[a] * 2, u[b] * 3, u[c] * 5);
    u.push(x);
    if (x === u[a] * 2) a++;
    if (x === u[b] * 3) b++;
    if (x === u[c] * 5) c++;
  }
  return u[n - 1];
}`,
  "find-k-pairs-with-smallest-sums": `function kSmallestPairs(nums1, nums2, k) {
  var ptr = [], i, out = [];
  for (i = 0; i < nums1.length; i++) ptr.push(0);
  while (out.length < k) {
    var best = -1;
    for (i = 0; i < nums1.length; i++) if (ptr[i] < nums2.length && (best < 0 || nums1[i] + nums2[ptr[i]] < nums1[best] + nums2[ptr[best]])) best = i;
    if (best < 0) break;
    out.push([nums1[best], nums2[ptr[best]]]);
    ptr[best]++;
  }
  return out;
}`,
  "furthest-building-you-can-reach": `function furthestBuilding(heights, bricks, ladders) {
  function can(t) {
    var climbs = [], i, s = 0;
    for (i = 0; i < t; i++) if (heights[i + 1] > heights[i]) climbs.push(heights[i + 1] - heights[i]);
    climbs.sort(function (a, b) { return a - b; });
    for (i = 0; i < climbs.length - ladders; i++) s += climbs[i];
    return s <= bricks;
  }
  var lo = 0, hi = heights.length - 1;
  while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (can(mid)) lo = mid; else hi = mid - 1; }
  return lo;
}`,
  "single-threaded-cpu": `function getOrder(tasks) {
  var idx = [], i;
  for (i = 0; i < tasks.length; i++) idx.push(i);
  idx.sort(function (a, b) { return tasks[a][0] - tasks[b][0] || a - b; });
  var avail = [], out = [], time = 0, p = 0;
  function before(a, b) { return tasks[a][1] < tasks[b][1] || (tasks[a][1] === tasks[b][1] && a < b); }
  while (out.length < tasks.length) {
    while (p < idx.length && tasks[idx[p]][0] <= time) {
      var x = idx[p++], j = avail.length;
      avail.push(x);
      while (j > 0 && before(x, avail[j - 1])) { avail[j] = avail[j - 1]; j--; }
      avail[j] = x;
    }
    if (!avail.length) { time = tasks[idx[p]][0]; continue; }
    var t = avail.shift();
    time += tasks[t][1];
    out.push(t);
  }
  return out;
}`,
  "seat-reservation-manager": `${INSERT}
function SeatManager(n) { this.next = 1; this.back = []; }
SeatManager.prototype.reserve = function () { return this.back.length ? this.back.shift() : this.next++; };
SeatManager.prototype.unreserve = function (s) { insertSorted(this.back, s); };${driver("SeatManager")}`,
  "process-tasks-using-servers": `function assignTasks(servers, tasks) {
  var until = [], i, ans = [], clock = 0;
  for (i = 0; i < servers.length; i++) until.push(0);
  for (var j = 0; j < tasks.length; j++) {
    if (clock < j) clock = j;
    var soonest = Infinity;
    for (i = 0; i < servers.length; i++) if (until[i] < soonest) soonest = until[i];
    if (soonest > clock) clock = soonest;
    var pick = -1;
    for (i = 0; i < servers.length; i++) if (until[i] <= clock && (pick === -1 || servers[i] < servers[pick])) pick = i;
    until[pick] = clock + tasks[j];
    ans.push(pick);
  }
  return ans;
}`,
  "maximum-subsequence-score": `${INSERT}
function maxScore(nums1, nums2, k) {
  var idx = [], i;
  for (i = 0; i < nums1.length; i++) idx.push(i);
  idx.sort(function (a, b) { return nums2[b] - nums2[a]; });
  var kept = [], sum = 0, best = 0;
  for (i = 0; i < idx.length; i++) {
    insertSorted(kept, nums1[idx[i]]);
    sum += nums1[idx[i]];
    if (kept.length > k) sum -= kept.shift();
    if (kept.length === k && sum * nums2[idx[i]] > best) best = sum * nums2[idx[i]];
  }
  return best;
}`,
  "total-cost-to-hire-k-workers": `function totalCost(costs, k, candidates) {
  var left = [], right = [], lo = 0, hi = costs.length - 1, total = 0, i;
  for (i = 0; i < candidates && lo <= hi; i++) left.push(costs[lo++]);
  for (i = 0; i < candidates && lo <= hi; i++) right.push(costs[hi--]);
  function minAt(a) { var m = 0; for (var j = 1; j < a.length; j++) if (a[j] < a[m]) m = j; return m; }
  for (var r = 0; r < k; r++) {
    var li = left.length ? minAt(left) : -1, ri = right.length ? minAt(right) : -1;
    if (ri < 0 || (li >= 0 && left[li] <= right[ri])) { total += left[li]; left.splice(li, 1); if (lo <= hi) left.push(costs[lo++]); }
    else { total += right[ri]; right.splice(ri, 1); if (lo <= hi) right.push(costs[hi--]); }
  }
  return total;
}`,
  "smallest-number-in-infinite-set": `${INSERT}
function SmallestInfiniteSet() { this.next = 1; this.back = []; }
SmallestInfiniteSet.prototype.popSmallest = function () { return this.back.length ? this.back.shift() : this.next++; };
SmallestInfiniteSet.prototype.addBack = function (num) { if (num < this.next && this.back.indexOf(num) < 0) insertSorted(this.back, num); };${driver("SmallestInfiniteSet")}`,
  "find-the-kth-largest-integer-in-the-array": `function kthLargestNumber(nums, k) {
  var a = nums.slice();
  a.sort(function (x, y) { if (x.length !== y.length) return y.length - x.length; return x < y ? 1 : x > y ? -1 : 0; });
  return a[k - 1];
}`,
  "longest-happy-string": `function longestDiverseString(a, b, c) {
  var left = [a, b, c], s = "";
  for (;;) {
    var order = [0, 1, 2].sort(function (x, y) { return left[y] - left[x]; }), placed = false;
    for (var i = 0; i < 3; i++) {
      var ch = order[i], L = "abc".charAt(ch), n = s.length;
      if (!left[ch]) continue;
      if (n >= 2 && s.charAt(n - 1) === L && s.charAt(n - 2) === L) continue;
      s += L; left[ch]--; placed = true; break;
    }
    if (!placed) return s;
  }
}`,
  "find-median-from-data-stream": `function MedianFinder() { this.a = []; this.dirty = false; }
MedianFinder.prototype.addNum = function (x) { this.a.push(x); this.dirty = true; };
MedianFinder.prototype.findMedian = function () {
  if (this.dirty) { this.a.sort(function (x, y) { return x - y; }); this.dirty = false; }
  var n = this.a.length, m = Math.floor(n / 2);
  return n % 2 === 1 ? this.a[m] : (this.a[m - 1] + this.a[m]) / 2;
};${driver("MedianFinder")}`,
  "meeting-rooms-iii": `function mostBooked(n, meetings) {
  var ms = meetings.slice().sort(function (a, b) { return a[0] - b[0]; });
  var busyUntil = [], used = [], i;
  for (i = 0; i < n; i++) { busyUntil.push(0); used.push(0); }
  for (var m = 0; m < ms.length; m++) {
    var start = ms[m][0], len = ms[m][1] - ms[m][0], room = -1;
    for (i = 0; i < n && room < 0; i++) if (busyUntil[i] <= start) room = i;
    if (room < 0) { room = 0; for (i = 1; i < n; i++) if (busyUntil[i] < busyUntil[room]) room = i; start = busyUntil[room]; }
    busyUntil[room] = start + len;
    used[room]++;
  }
  var best = 0;
  for (i = 1; i < n; i++) if (used[i] > used[best]) best = i;
  return best;
}`,
  ipo: `${INSERT}
function findMaximizedCapital(k, w, profits, capital) {
  var idx = [], i;
  for (i = 0; i < profits.length; i++) idx.push(i);
  idx.sort(function (a, b) { return capital[a] - capital[b]; });
  var pool = [], p = 0;
  for (var r = 0; r < k; r++) {
    while (p < idx.length && capital[idx[p]] <= w) insertSorted(pool, profits[idx[p++]]);
    if (!pool.length) break;
    w += pool.pop();
  }
  return w;
}`,
  "the-skyline-problem": `function getSkyline(buildings) {
  var ev = [], i;
  for (i = 0; i < buildings.length; i++) { ev.push([buildings[i][0], -buildings[i][2]]); ev.push([buildings[i][1], buildings[i][2]]); }
  ev.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var live = [0], out = [], prev = 0;
  for (i = 0; i < ev.length; i++) {
    var h = ev[i][1];
    if (h < 0) live.push(-h); else live.splice(live.indexOf(h), 1);
    if (i + 1 < ev.length && ev[i + 1][0] === ev[i][0]) continue;
    var top = Math.max.apply(null, live);
    if (top !== prev) { out.push([ev[i][0], top]); prev = top; }
  }
  return out;
}`,
  "maximum-performance-of-a-team": `${INSERT}
function maxPerformance(n, speed, efficiency, k) {
  var idx = [], i;
  for (i = 0; i < n; i++) idx.push(i);
  idx.sort(function (a, b) { return efficiency[b] - efficiency[a]; });
  var team = [], sum = 0, best = 0;
  for (i = 0; i < n; i++) {
    insertSorted(team, speed[idx[i]]);
    sum += speed[idx[i]];
    if (team.length > k) sum -= team.shift();
    if (sum * efficiency[idx[i]] > best) best = sum * efficiency[idx[i]];
  }
  return best % 1000000007;
}`,
  "smallest-range-covering-elements-from-k-lists": `function smallestRange(nums) {
  var all = [], i, j;
  for (i = 0; i < nums.length; i++) for (j = 0; j < nums[i].length; j++) all.push([nums[i][j], i]);
  all.sort(function (a, b) { return a[0] - b[0]; });
  var cnt = [], have = 0, best = null, l = 0;
  for (i = 0; i < nums.length; i++) cnt.push(0);
  for (var r = 0; r < all.length; r++) {
    if (cnt[all[r][1]]++ === 0) have++;
    while (have === nums.length) {
      if (!best || all[r][0] - all[l][0] < best[1] - best[0]) best = [all[l][0], all[r][0]];
      if (--cnt[all[l][1]] === 0) have--;
      l++;
    }
  }
  return best;
}`,
  "minimum-number-of-refueling-stops": `function minRefuelStops(target, startFuel, stations) {
  var reach = startFuel, stops = 0, used = [], i;
  for (i = 0; i < stations.length; i++) used.push(false);
  while (reach < target) {
    var best = -1;
    for (i = 0; i < stations.length && stations[i][0] <= reach; i++) if (!used[i] && (best < 0 || stations[i][1] > stations[best][1])) best = i;
    if (best < 0) return -1;
    used[best] = true;
    reach += stations[best][1];
    stops++;
  }
  return stops;
}`,
  "minimize-deviation-in-array": `${INSERT}
function minimumDeviation(nums) {
  var a = [], i;
  for (i = 0; i < nums.length; i++) insertSorted(a, nums[i] % 2 === 1 ? nums[i] * 2 : nums[i]);
  var best = a[a.length - 1] - a[0];
  while (a[a.length - 1] % 2 === 0) {
    var top = a.pop();
    insertSorted(a, top / 2);
    if (a[a.length - 1] - a[0] < best) best = a[a.length - 1] - a[0];
  }
  return best;
}`,
  "trapping-rain-water-ii": `function trapRainWater(heightMap) {
  var m = heightMap.length, n = heightMap[0].length, level = [], done = [], r, c;
  for (r = 0; r < m; r++) { level.push([]); done.push([]); for (c = 0; c < n; c++) { level[r].push(r === 0 || c === 0 || r === m - 1 || c === n - 1 ? heightMap[r][c] : Infinity); done[r].push(false); } }
  for (var step = 0; step < m * n; step++) {
    var br = -1, bc = -1;
    for (r = 0; r < m; r++) for (c = 0; c < n; c++) if (!done[r][c] && (br < 0 || level[r][c] < level[br][bc])) { br = r; bc = c; }
    done[br][bc] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var d = 0; d < 4; d++) {
      var nr = br + dirs[d][0], nc = bc + dirs[d][1];
      if (nr < 0 || nc < 0 || nr >= m || nc >= n || done[nr][nc]) continue;
      var v = Math.max(heightMap[nr][nc], level[br][bc]);
      if (v < level[nr][nc]) level[nr][nc] = v;
    }
  }
  var w = 0;
  for (r = 0; r < m; r++) for (c = 0; c < n; c++) w += level[r][c] - heightMap[r][c];
  return w;
}`,
};
