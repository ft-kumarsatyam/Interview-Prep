/** Blind solutions for the seeded problems the Binary Search Ladder judges (scripts/dsa-testcases/specs/ladder-binary-search-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "find-first-and-last-position-of-element-in-sorted-array": `function searchRange(nums, target) {
  function lower(x) { var lo = 0, hi = nums.length; while (lo < hi) { var m = (lo + hi) >> 1; if (nums[m] < x) lo = m + 1; else hi = m; } return lo; }
  var a = lower(target), b = lower(target + 1) - 1;
  return a <= b ? [a, b] : [-1, -1];
}`,
  "valid-perfect-square": `function isPerfectSquare(num) {
  var x = num;
  while (x * x > num) x = Math.floor((x + Math.floor(num / x)) / 2);
  return x * x === num;
}`,
  "arranging-coins": `function arrangeCoins(n) {
  var k = Math.floor((Math.sqrt(8 * n + 1) - 1) / 2);
  while ((k + 1) * (k + 2) / 2 <= n) k++;
  while (k * (k + 1) / 2 > n) k--;
  return k;
}`,
  "search-in-rotated-sorted-array-ii": `function search(nums, target) {
  function go(lo, hi) {
    if (lo > hi) return false;
    var m = (lo + hi) >> 1;
    if (nums[m] === target) return true;
    if (nums[lo] < nums[m]) return nums[lo] <= target && target < nums[m] ? go(lo, m - 1) : go(m + 1, hi);
    return go(lo, m - 1) || go(m + 1, hi);
  }
  return go(0, nums.length - 1);
}`,
  "single-element-in-a-sorted-array": `function singleNonDuplicate(nums) {
  for (var i = 0; i < nums.length - 1; i += 2) if (nums[i] !== nums[i + 1]) return nums[i];
  return nums[nums.length - 1];
}`,
  "peak-index-in-a-mountain-array": `function peakIndexInMountainArray(arr) {
  var i = 0;
  while (arr[i + 1] > arr[i]) i++;
  return i;
}`,
  "find-peak-element": `function findPeakElement(nums) {
  for (var i = 0; i < nums.length - 1; i++) if (nums[i] > nums[i + 1]) return i;
  return nums.length - 1;
}`,
  "find-the-smallest-divisor-given-a-threshold": `function smallestDivisor(nums, threshold) {
  var lo = 0, hi = 1;
  for (var i = 0; i < nums.length; i++) if (nums[i] > hi) hi = nums[i];
  while (hi - lo > 1) {
    var m = Math.floor((lo + hi) / 2), t = 0;
    for (var j = 0; j < nums.length; j++) t += Math.floor((nums[j] + m - 1) / m);
    if (t <= threshold) hi = m; else lo = m;
  }
  return hi;
}`,
  "capacity-to-ship-packages-within-d-days": `function shipWithinDays(weights, days) {
  var lo = 0, hi = 0;
  for (var i = 0; i < weights.length; i++) { hi += weights[i]; if (weights[i] - 1 > lo) lo = weights[i] - 1; }
  while (hi - lo > 1) {
    var c = Math.floor((lo + hi) / 2), need = 1, load = 0;
    for (var j = 0; j < weights.length; j++) { if (load + weights[j] > c) { need++; load = 0; } load += weights[j]; }
    if (need <= days) hi = c; else lo = c;
  }
  return hi;
}`,
  "minimum-number-of-days-to-make-m-bouquets": `function minDays(bloomDay, m, k) {
  if (m * k > bloomDay.length) return -1;
  var days = bloomDay.slice().sort(function (a, b) { return a - b; });
  function ok(d) { var b = 0, run = 0; for (var i = 0; i < bloomDay.length; i++) { if (bloomDay[i] <= d) { run++; if (run === k) { b++; run = 0; } } else run = 0; } return b >= m; }
  var lo = 0, hi = days.length - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (ok(days[mid])) hi = mid; else lo = mid + 1; }
  return days[lo];
}`,
  "successful-pairs-of-spells-and-potions": `function successfulPairs(spells, potions, success) {
  var p = potions.slice().sort(function (a, b) { return a - b; });
  var order = spells.map(function (_, i) { return i; }).sort(function (a, b) { return spells[a] - spells[b]; });
  var out = new Array(spells.length), j = p.length;
  for (var t = 0; t < order.length; t++) {
    var s = spells[order[t]];
    while (j > 0 && s * p[j - 1] >= success) j--;
    out[order[t]] = p.length - j;
  }
  return out;
}`,
  "minimum-time-to-complete-trips": `function minimumTime(time, totalTrips) {
  var fastest = Infinity;
  for (var i = 0; i < time.length; i++) if (time[i] < fastest) fastest = time[i];
  var lo = 0, hi = fastest * totalTrips;
  while (hi - lo > 1) {
    var t = Math.floor((lo + hi) / 2), s = 0;
    for (var j = 0; j < time.length; j++) s += Math.floor(t / time[j]);
    if (s >= totalTrips) hi = t; else lo = t;
  }
  return hi;
}`,
  "magnetic-force-between-two-balls": `function maxDistance(position, m) {
  var p = position.slice().sort(function (a, b) { return a - b; });
  function count(d) { var c = 1, last = p[0]; for (var i = 1; i < p.length; i++) if (p[i] - last >= d) { c++; last = p[i]; } return c; }
  var lo = 0, hi = p[p.length - 1] - p[0] + 1;
  while (hi - lo > 1) { var d = Math.floor((lo + hi) / 2); if (count(d) >= m) lo = d; else hi = d; }
  return lo;
}`,
  "minimized-maximum-of-products-distributed-to-any-store": `function minimizedMaximum(n, quantities) {
  var lo = 0, hi = 0;
  for (var i = 0; i < quantities.length; i++) if (quantities[i] > hi) hi = quantities[i];
  while (hi - lo > 1) {
    var x = Math.floor((lo + hi) / 2), s = 0;
    for (var j = 0; j < quantities.length; j++) s += Math.floor((quantities[j] + x - 1) / x);
    if (s <= n) hi = x; else lo = x;
  }
  return hi;
}`,
  "split-array-largest-sum": `function splitArray(nums, k) {
  var n = nums.length, pre = [0];
  for (var i = 0; i < n; i++) pre.push(pre[i] + nums[i]);
  var dp = [];
  for (var a = 0; a <= n; a++) dp.push(pre[a]);
  for (var parts = 2; parts <= k; parts++) {
    var next = [0];
    for (var e = 1; e <= n; e++) {
      var best = Infinity;
      for (var s = 0; s < e; s++) best = Math.min(best, Math.max(dp[s], pre[e] - pre[s]));
      next.push(best);
    }
    dp = next;
  }
  return dp[n];
}`,
  "search-a-2d-matrix-ii": `function searchMatrix(matrix, target) {
  for (var r = 0; r < matrix.length; r++) {
    var row = matrix[r], lo = 0, hi = row.length - 1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (row[m] === target) return true; if (row[m] < target) lo = m + 1; else hi = m - 1; }
  }
  return false;
}`,
  "kth-smallest-element-in-a-sorted-matrix": `function kthSmallest(matrix, k) {
  var n = matrix.length, ptr = [], val = 0;
  for (var i = 0; i < n; i++) ptr.push(0);
  for (var step = 0; step < k; step++) {
    var best = -1;
    for (var r = 0; r < n; r++) if (ptr[r] < n && (best < 0 || matrix[r][ptr[r]] < matrix[best][ptr[best]])) best = r;
    val = matrix[best][ptr[best]];
    ptr[best]++;
  }
  return val;
}`,
  "find-k-closest-elements": `function findClosestElements(arr, k, x) {
  var l = 0, r = arr.length - 1;
  while (r - l + 1 > k) {
    if (x - arr[l] <= arr[r] - x) r--; else l++;
  }
  return arr.slice(l, r + 1);
}`,
  "median-of-two-sorted-arrays": `function findMedianSortedArrays(nums1, nums2) {
  var i = 0, j = 0, merged = [];
  while (i < nums1.length || j < nums2.length) {
    if (j >= nums2.length || (i < nums1.length && nums1[i] <= nums2[j])) merged.push(nums1[i++]);
    else merged.push(nums2[j++]);
  }
  var n = merged.length;
  return n % 2 ? merged[(n - 1) / 2] : (merged[n / 2 - 1] + merged[n / 2]) / 2;
}`,
  "find-minimum-in-rotated-sorted-array-ii": `function findMin(nums) {
  for (var i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) return nums[i];
  return nums[0];
}`,
  "find-k-th-smallest-pair-distance": `function smallestDistancePair(nums, k) {
  var a = nums.slice().sort(function (x, y) { return x - y; });
  var maxD = a[a.length - 1] - a[0], cnt = [];
  for (var d = 0; d <= maxD; d++) cnt.push(0);
  for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) cnt[a[j] - a[i]]++;
  for (var e = 0; e <= maxD; e++) { k -= cnt[e]; if (k <= 0) return e; }
  return maxD;
}`,
};
