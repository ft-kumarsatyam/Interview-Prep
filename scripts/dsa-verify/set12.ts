/** Blind solutions for the seeded problems the Sliding Window & Two Pointers Ladder judges (scripts/dsa-testcases/specs/ladder-window-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "remove-duplicates-from-sorted-array-ii": `function removeDuplicates(nums) {
  var w = 0, i = 0;
  while (i < nums.length) {
    var j = i;
    while (j < nums.length && nums[j] === nums[i]) j++;
    var v = nums[i], c = Math.min(2, j - i);
    for (var t = 0; t < c; t++) nums[w++] = v;
    i = j;
  }
  return w;
}`,
  "max-consecutive-ones": `function findMaxConsecutiveOnes(nums) {
  var parts = nums.join("").split("0"), best = 0;
  for (var i = 0; i < parts.length; i++) best = Math.max(best, parts[i].length);
  return best;
}`,
  "minimum-difference-between-highest-and-lowest-of-k-scores": `function minimumDifference(nums, k) {
  var a = nums.slice().sort(function (x, y) { return y - x; }), best = Infinity;
  for (var i = k - 1; i < a.length; i++) best = Math.min(best, a[i - k + 1] - a[i]);
  return best;
}`,
  "number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold": `function numOfSubarrays(arr, k, threshold) {
  var pre = [0], c = 0;
  for (var i = 0; i < arr.length; i++) pre.push(pre[i] + arr[i] - threshold);
  for (var j = k; j < pre.length; j++) if (pre[j] - pre[j - k] >= 0) c++;
  return c;
}`,
  "maximum-points-you-can-obtain-from-cards": `function maxScore(cardPoints, k) {
  var n = cardPoints.length, s = 0, i;
  for (i = n - k; i < n; i++) s += cardPoints[i];
  var best = s;
  for (i = 0; i < k; i++) { s += cardPoints[i] - cardPoints[n - k + i]; best = Math.max(best, s); }
  return best;
}`,
  "grumpy-bookstore-owner": `function maxSatisfied(customers, grumpy, minutes) {
  var n = customers.length, pre = [0], base = 0, i;
  for (i = 0; i < n; i++) { pre.push(pre[i] + (grumpy[i] ? customers[i] : 0)); if (!grumpy[i]) base += customers[i]; }
  var best = 0;
  for (i = minutes; i <= n; i++) best = Math.max(best, pre[i] - pre[i - minutes]);
  return base + best;
}`,
  "minimum-swaps-to-group-all-1s-together-ii": `function minSwaps(nums) {
  var n = nums.length, m = 0, i;
  for (i = 0; i < n; i++) m += nums[i];
  var pre = [0];
  for (i = 0; i < 2 * n; i++) pre.push(pre[i] + nums[i % n]);
  var best = 0;
  for (i = 0; i < n; i++) best = Math.max(best, pre[i + m] - pre[i]);
  return m - best;
}`,
  "fruit-into-baskets": `function totalFruit(fruits) {
  var a = -1, b = -1, cur = 0, runB = 0, best = 0;
  for (var i = 0; i < fruits.length; i++) {
    var f = fruits[i];
    if (f === a || f === b) cur++; else cur = runB + 1;
    if (f === b) runB++; else { runB = 1; a = b; b = f; }
    best = Math.max(best, cur);
  }
  return best;
}`,
  "longest-subarray-of-1s-after-deleting-one-element": `function longestSubarray(nums) {
  var prev = 0, cur = 0, best = 0, sawZero = false;
  for (var i = 0; i < nums.length; i++) {
    if (nums[i] === 1) cur++;
    else { sawZero = true; prev = cur; cur = 0; }
    best = Math.max(best, prev + cur);
  }
  return sawZero ? best : best - 1;
}`,
  "longest-turbulent-subarray": `function maxTurbulenceSize(arr) {
  var best = 1, start = 0;
  for (var i = 1; i < arr.length; i++) {
    var c = arr[i] > arr[i - 1] ? 1 : arr[i] < arr[i - 1] ? -1 : 0;
    if (c === 0) { start = i; continue; }
    if (i >= 2 && i - 1 > start) {
      var p = arr[i - 1] > arr[i - 2] ? 1 : arr[i - 1] < arr[i - 2] ? -1 : 0;
      if (p === c) start = i - 1;
    }
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
  "frequency-of-the-most-frequent-element": `function maxFrequency(nums, k) {
  var a = nums.slice().sort(function (x, y) { return x - y; }), pre = [0], i, best = 1;
  for (i = 0; i < a.length; i++) pre.push(pre[i] + a[i]);
  for (var r = 0; r < a.length; r++) {
    var lo = 0, hi = r;
    while (lo < hi) {
      var m = Math.floor((lo + hi) / 2);
      if (a[r] * (r - m + 1) - (pre[r + 1] - pre[m]) <= k) hi = m; else lo = m + 1;
    }
    best = Math.max(best, r - lo + 1);
  }
  return best;
}`,
  "length-of-longest-subarray-with-at-most-k-frequency": `function maxSubarrayLength(nums, k) {
  function fits(len) {
    var cnt = {}, over = 0;
    for (var i = 0; i < nums.length; i++) {
      cnt[nums[i]] = (cnt[nums[i]] || 0) + 1;
      if (cnt[nums[i]] === k + 1) over++;
      if (i >= len) { if (cnt[nums[i - len]] === k + 1) over--; cnt[nums[i - len]]--; }
      if (i >= len - 1 && over === 0) return true;
    }
    return false;
  }
  var lo = 1, hi = nums.length;
  while (lo < hi) { var m = Math.ceil((lo + hi) / 2); if (fits(m)) lo = m; else hi = m - 1; }
  return lo;
}`,
  "longest-nice-subarray": `function longestNiceSubarray(nums) {
  var best = 1;
  for (var i = 0; i < nums.length; i++) {
    var mask = 0;
    for (var j = i; j < nums.length; j++) {
      if (mask & nums[j]) break;
      mask |= nums[j];
      best = Math.max(best, j - i + 1);
    }
  }
  return best;
}`,
  "count-subarrays-where-max-element-appears-at-least-k-times": `function countSubarrays(nums, k) {
  var mx = -Infinity, pos = [], ans = 0, i;
  for (i = 0; i < nums.length; i++) if (nums[i] > mx) mx = nums[i];
  for (i = 0; i < nums.length; i++) {
    if (nums[i] === mx) pos.push(i);
    if (pos.length >= k) ans += pos[pos.length - k] + 1;
  }
  return ans;
}`,
  "subarray-product-less-than-k": `function numSubarrayProductLessThanK(nums, k) {
  if (k <= 1) return 0;
  var logs = [0], lk = Math.log(k) - 1e-9, ans = 0, i;
  for (i = 0; i < nums.length; i++) logs.push(logs[i] + Math.log(nums[i]));
  for (i = 0; i < nums.length; i++) {
    var lo = i + 1, hi = nums.length + 1;
    while (lo < hi) { var m = Math.floor((lo + hi) / 2); if (logs[m] - logs[i] < lk) lo = m + 1; else hi = m; }
    ans += lo - 1 - i;
  }
  return ans;
}`,
  "minimum-operations-to-reduce-x-to-zero": `function minOperations(nums, x) {
  var n = nums.length, seen = {}, s = 0, best = Infinity, i;
  seen[0] = 0;
  for (i = 0; i < n; i++) { s += nums[i]; if (!(s in seen)) seen[s] = i + 1; }
  if (seen[x] !== undefined) best = seen[x];
  var suf = 0;
  for (i = n - 1; i >= 0; i--) {
    suf += nums[i];
    var need = x - suf, take = n - i;
    if (need >= 0 && seen[need] !== undefined && seen[need] <= i) best = Math.min(best, seen[need] + take);
  }
  return best === Infinity ? -1 : best;
}`,
  "partition-labels": `function partitionLabels(s) {
  var first = {}, last = {}, i, ivs = [];
  for (i = 0; i < s.length; i++) { if (!(s[i] in first)) first[s[i]] = i; last[s[i]] = i; }
  for (var c in first) ivs.push([first[c], last[c]]);
  ivs.sort(function (a, b) { return a[0] - b[0]; });
  var out = [], st = ivs[0][0], en = ivs[0][1];
  for (i = 1; i < ivs.length; i++) {
    if (ivs[i][0] > en) { out.push(en - st + 1); st = ivs[i][0]; en = ivs[i][1]; }
    else en = Math.max(en, ivs[i][1]);
  }
  out.push(en - st + 1);
  return out;
}`,
  "3sum-closest": `function threeSumClosest(nums, target) {
  var a = nums.slice().sort(function (x, y) { return x - y; }), n = a.length, best = a[0] + a[1] + a[2];
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
    var want = target - a[i] - a[j], lo = j + 1, hi = n - 1;
    while (lo < hi) { var m = Math.floor((lo + hi) / 2); if (a[m] < want) lo = m + 1; else hi = m; }
    for (var k = lo - 1; k <= lo; k++) if (k > j && k < n) {
      var s = a[i] + a[j] + a[k];
      if (Math.abs(s - target) < Math.abs(best - target)) best = s;
    }
  }
  return best;
}`,
  "boats-to-save-people": `function numRescueBoats(people, limit) {
  var cnt = [], i, boats = 0, left = people.length;
  for (i = 0; i <= limit; i++) cnt.push(0);
  for (i = 0; i < people.length; i++) cnt[people[i]]++;
  var lo = 1, hi = limit;
  while (left > 0) {
    while (cnt[hi] === 0) hi--;
    cnt[hi]--; left--;
    while (lo <= limit && cnt[lo] === 0) lo++;
    if (left > 0 && lo + hi <= limit) { cnt[lo]--; left--; }
    boats++;
  }
  return boats;
}`,
  "interval-list-intersections": `function intervalIntersection(firstList, secondList) {
  var ev = [], i;
  for (i = 0; i < firstList.length; i++) { ev.push([firstList[i][0], 0, 1]); ev.push([firstList[i][1], 1, -1]); }
  for (i = 0; i < secondList.length; i++) { ev.push([secondList[i][0], 0, 1]); ev.push([secondList[i][1], 1, -1]); }
  ev.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var open = 0, out = [], start = 0;
  for (i = 0; i < ev.length; i++) {
    if (ev[i][2] === 1) { open++; if (open === 2) start = ev[i][0]; }
    else { if (open === 2) out.push([start, ev[i][0]]); open--; }
  }
  return out;
}`,
  "number-of-subsequences-that-satisfy-the-given-sum-condition": `function numSubseq(nums, target) {
  var MOD = 1000000007, a = nums.slice().sort(function (x, y) { return x - y; }), n = a.length, pw = [1], ans = 0, i;
  for (i = 1; i <= n; i++) pw.push(pw[i - 1] * 2 % MOD);
  for (i = 0; i < n; i++) {
    if (2 * a[i] > target) break;
    var lo = i, hi = n - 1;
    while (lo < hi) { var m = Math.ceil((lo + hi) / 2); if (a[i] + a[m] <= target) lo = m; else hi = m - 1; }
    ans = (ans + pw[lo - i]) % MOD;
  }
  return ans;
}`,
  "shortest-unsorted-continuous-subarray": `function findUnsortedSubarray(nums) {
  var n = nums.length, l = 0, r = n - 1;
  while (l < n - 1 && nums[l] <= nums[l + 1]) l++;
  if (l === n - 1) return 0;
  while (r > 0 && nums[r] >= nums[r - 1]) r--;
  var lo = Infinity, hi = -Infinity;
  for (var i = l; i <= r; i++) { lo = Math.min(lo, nums[i]); hi = Math.max(hi, nums[i]); }
  while (l > 0 && nums[l - 1] > lo) l--;
  while (r < n - 1 && nums[r + 1] < hi) r++;
  return r - l + 1;
}`,
  "longest-mountain-in-array": `function longestMountain(arr) {
  var n = arr.length, up = [], down = [], i, best = 0;
  for (i = 0; i < n; i++) up.push(i > 0 && arr[i] > arr[i - 1] ? up[i - 1] + 1 : 0);
  for (i = n - 1; i >= 0; i--) down[i] = i < n - 1 && arr[i] > arr[i + 1] ? down[i + 1] + 1 : 0;
  for (i = 0; i < n; i++) if (up[i] && down[i]) best = Math.max(best, up[i] + down[i] + 1);
  return best;
}`,
  "sliding-window-median": `function medianSlidingWindow(nums, k) {
  var out = [];
  for (var i = 0; i + k <= nums.length; i++) {
    var w = nums.slice(i, i + k);
    w.sort(function (a, b) { return a - b; });
    var h = Math.floor(k / 2);
    out.push(k % 2 === 1 ? w[h] : (w[h - 1] + w[h]) / 2);
  }
  return out;
}`,
  "substring-with-concatenation-of-all-words": `function findSubstring(s, words) {
  var L = words[0].length, m = words.length, out = [], need = {}, i, j;
  for (i = 0; i < m; i++) need[words[i]] = (need[words[i]] || 0) + 1;
  for (i = 0; i + L * m <= s.length; i++) {
    var have = {}, ok = true;
    for (j = 0; j < m; j++) {
      var w = s.substr(i + j * L, L);
      have[w] = (have[w] || 0) + 1;
      if (!need[w] || have[w] > need[w]) { ok = false; break; }
    }
    if (ok) out.push(i);
  }
  return out;
}`,
  "minimum-number-of-flips-to-make-the-binary-string-alternating": `function minFlips(s) {
  var n = s.length, pre = [0], i;
  for (i = 0; i < 2 * n; i++) pre.push(pre[i] + (s[i % n] === (i % 2 ? "1" : "0") ? 0 : 1));
  var best = Infinity;
  for (i = 0; i < n; i++) {
    var a = pre[i + n] - pre[i];
    best = Math.min(best, a, n - a);
  }
  return best;
}`,
};
