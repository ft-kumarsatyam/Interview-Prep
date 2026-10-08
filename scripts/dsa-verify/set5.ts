export const SOLUTIONS: Record<string, string> = {
  "remove-element": `function removeElement(nums, val) {
  var i = 0, n = nums.length;
  while (i < n) {
    if (nums[i] === val) { nums[i] = nums[n - 1]; n--; }
    else i++;
  }
  return n;
}`,
  "remove-duplicates-from-sorted-array": `function removeDuplicates(nums) {
  var w = 0;
  for (var i = 0; i < nums.length; i++) if (i === 0 || nums[i] !== nums[i - 1]) nums[w++] = nums[i];
  return w;
}`,
  "maximum-average-subarray-i": `function findMaxAverage(nums, k) {
  var pre = [0];
  for (var i = 0; i < nums.length; i++) pre.push(pre[i] + nums[i]);
  var best = -Infinity;
  for (var j = k; j <= nums.length; j++) if (pre[j] - pre[j - k] > best) best = pre[j] - pre[j - k];
  return best / k;
}`,
  "minimum-size-subarray-sum": `function minSubArrayLen(target, nums) {
  var pre = [0];
  for (var i = 0; i < nums.length; i++) pre.push(pre[i] + nums[i]);
  var best = 0;
  for (var r = 1; r <= nums.length; r++) {
    var lo = 0, hi = r - 1, found = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (pre[r] - pre[mid] >= target) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found >= 0 && (best === 0 || r - found < best)) best = r - found;
  }
  return best;
}`,
  "max-consecutive-ones-iii": `function longestOnes(nums, k) {
  var zeros = [];
  for (var i = 0; i < nums.length; i++) if (nums[i] === 0) zeros.push(i);
  if (zeros.length <= k) return nums.length;
  var best = 0;
  for (var s = 0; s + k <= zeros.length; s++) {
    var left = s === 0 ? 0 : zeros[s - 1] + 1;
    var right = s + k < zeros.length ? zeros[s + k] - 1 : nums.length - 1;
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
  "find-pivot-index": `function pivotIndex(nums) {
  var suffix = new Array(nums.length + 1).fill(0);
  for (var i = nums.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + nums[i];
  var left = 0;
  for (var j = 0; j < nums.length; j++) { if (left === suffix[j + 1]) return j; left += nums[j]; }
  return -1;
}`,
  "trapping-rain-water": `function trap(height) {
  var n = height.length, L = new Array(n), R = new Array(n), w = 0;
  for (var i = 0; i < n; i++) L[i] = Math.max(i ? L[i - 1] : 0, height[i]);
  for (var j = n - 1; j >= 0; j--) R[j] = Math.max(j < n - 1 ? R[j + 1] : 0, height[j]);
  for (var k = 0; k < n; k++) w += Math.min(L[k], R[k]) - height[k];
  return w;
}`,
  "first-missing-positive": `function firstMissingPositive(nums) {
  var sorted = nums.filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
  var want = 1;
  for (var i = 0; i < sorted.length; i++) { if (sorted[i] === want) want++; else if (sorted[i] > want) break; }
  return want;
}`,
};
