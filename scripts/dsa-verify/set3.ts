export const SOLUTIONS: Record<string, string> = {
  "largest-rectangle-in-histogram": `function largestRectangleArea(heights) {
  const st = [];
  let best = 0;
  const n = heights.length;
  for (let i = 0; i <= n; i++) {
    const h = i === n ? 0 : heights[i];
    while (st.length && heights[st[st.length - 1]] >= h) {
      const top = st.pop();
      const left = st.length ? st[st.length - 1] : -1;
      const area = heights[top] * (i - left - 1);
      if (area > best) best = area;
    }
    st.push(i);
  }
  return best;
}`,
  "next-greater-element-i": `function nextGreaterElement(nums1, nums2) {
  const map = new Map();
  const st = [];
  for (const x of nums2) {
    while (st.length && st[st.length - 1] < x) map.set(st.pop(), x);
    st.push(x);
  }
  return nums1.map((x) => (map.has(x) ? map.get(x) : -1));
}`,
  "decode-string": `function decodeString(s) {
  const numSt = [];
  const strSt = [];
  let cur = "";
  let num = 0;
  for (const c of s) {
    if (c >= "0" && c <= "9") {
      num = num * 10 + (c.charCodeAt(0) - 48);
    } else if (c === "[") {
      numSt.push(num);
      strSt.push(cur);
      num = 0;
      cur = "";
    } else if (c === "]") {
      const k = numSt.pop();
      const prev = strSt.pop();
      cur = prev + cur.repeat(k);
    } else {
      cur += c;
    }
  }
  return cur;
}`,
  "search-insert-position": `function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
  "sqrtx": `function mySqrt(x) {
  let lo = 0, hi = 46341;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (mid * mid <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}`,
  "koko-eating-bananas": `function minEatingSpeed(piles, h) {
  let lo = 1, hi = Math.max(...piles);
  const hours = (k) => {
    let t = 0;
    for (const p of piles) t += Math.ceil(p / k);
    return t;
  };
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hours(mid) <= h) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}`,
  "find-minimum-in-rotated-sorted-array": `function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1;
    else hi = mid;
  }
  return nums[lo];
}`,
  "search-in-rotated-sorted-array": `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
  "search-a-2d-matrix": `function searchMatrix(matrix, target) {
  const m = matrix.length;
  if (m === 0) return false;
  const n = matrix[0].length;
  let lo = 0, hi = m * n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = matrix[Math.floor(mid / n)][mid % n];
    if (v === target) return true;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}`,
  "house-robber": `function rob(nums) {
  let take = 0, skip = 0;
  for (const x of nums) {
    const nt = skip + x;
    skip = Math.max(skip, take);
    take = nt;
  }
  return Math.max(take, skip);
}`,
  "coin-change": `function coinChange(coins, amount) {
  const INF = Infinity;
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    }
  }
  return dp[amount] === INF ? -1 : dp[amount];
}`,
  "longest-increasing-subsequence": `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
  "longest-common-subsequence": `function longestCommonSubsequence(text1, text2) {
  const m = text1.length, n = text2.length;
  let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) cur[j] = prev[j - 1] + 1;
      else cur[j] = Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}`,
  "edit-distance": `function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  let prev = [];
  for (let j = 0; j <= n; j++) prev.push(j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) cur[j] = prev[j - 1];
      else cur[j] = 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}`,
  "unique-paths": `function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) dp[j] += dp[j - 1];
  }
  return dp[n - 1];
}`,
  "word-break": `function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[n];
}`,
  "decode-ways": `function numDecodings(s) {
  const n = s.length;
  if (n === 0) return 0;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= n; i++) {
    if (s[i - 1] !== "0") dp[i] += dp[i - 1];
    if (i >= 2) {
      const v = parseInt(s.slice(i - 2, i), 10);
      if (s[i - 2] !== "0" && v >= 10 && v <= 26) dp[i] += dp[i - 2];
    }
  }
  return dp[n];
}`,
  "maximum-product-subarray": `function maxProduct(nums) {
  let mx = nums[0], mn = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    const a = mx * x, b = mn * x;
    mx = Math.max(x, a, b);
    mn = Math.min(x, a, b);
    if (mx > best) best = mx;
  }
  return best;
}`,
  "partition-equal-subset-sum": `function canPartition(nums) {
  let sum = 0;
  for (const x of nums) sum += x;
  if (sum % 2 !== 0) return false;
  const target = sum / 2;
  const dp = new Uint8Array(target + 1);
  dp[0] = 1;
  for (const x of nums) {
    for (let t = target; t >= x; t--) {
      if (dp[t - x]) dp[t] = 1;
    }
  }
  return dp[target] === 1;
}`,
  "number-of-1-bits": `function hammingWeight(n) {
  let c = 0;
  let x = n;
  while (x > 0) {
    c += x % 2;
    x = Math.floor(x / 2);
  }
  return c;
}`,
  "counting-bits": `function countBits(n) {
  const res = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) res[i] = res[i >> 1] + (i & 1);
  return res;
}`,
};
