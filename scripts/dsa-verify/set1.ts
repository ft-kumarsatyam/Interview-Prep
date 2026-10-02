export const SOLUTIONS: Record<string, string> = {
  "two-sum": `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    if (!seen.has(nums[i])) seen.set(nums[i], i);
  }
  return [];
}`,
  "contains-duplicate": `function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}`,
  "best-time-to-buy-and-sell-stock": `function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    if (p < min) min = p;
    if (p - min > best) best = p - min;
  }
  return best;
}`,
  "maximum-subarray": `function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
  "single-number": `function singleNumber(nums) {
  let r = 0;
  for (const x of nums) r ^= x;
  return r;
}`,
  "missing-number": `function missingNumber(nums) {
  const n = nums.length;
  let s = n * (n + 1) / 2;
  for (const x of nums) s -= x;
  return s;
}`,
  "majority-element": `function majorityElement(nums) {
  const c = new Map();
  let best = nums[0], bc = 0;
  for (const x of nums) {
    const v = (c.get(x) || 0) + 1;
    c.set(x, v);
    if (v > bc) { bc = v; best = x; }
  }
  return best;
}`,
  "move-zeroes": `function moveZeroes(nums) {
  let j = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) { nums[j++] = nums[i]; }
  }
  while (j < nums.length) nums[j++] = 0;
}`,
  "valid-anagram": `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  for (const ch of t) {
    if (!c[ch]) return false;
    c[ch]--;
  }
  return true;
}`,
  "valid-palindrome": `function isPalindrome(s) {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  let i = 0, j = t.length - 1;
  while (i < j) { if (t[i++] !== t[j--]) return false; }
  return true;
}`,
  "valid-parentheses": `function isValid(s) {
  const st = [];
  const m = { ")": "(", "]": "[", "}": "{" };
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") st.push(ch);
    else {
      if (st.pop() !== m[ch]) return false;
    }
  }
  return st.length === 0;
}`,
  "binary-search": `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}`,
  "climbing-stairs": `function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) { const c = a + b; a = b; b = c; }
  return b;
}`,
  "longest-common-prefix": `function longestCommonPrefix(strs) {
  if (strs.length === 0) return "";
  let p = strs[0];
  for (const s of strs) {
    while (!s.startsWith(p)) p = p.slice(0, -1);
  }
  return p;
}`,
  "roman-to-integer": `function romanToInt(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let r = 0;
  for (let i = 0; i < s.length; i++) {
    if (i + 1 < s.length && v[s[i]] < v[s[i + 1]]) r -= v[s[i]];
    else r += v[s[i]];
  }
  return r;
}`,
  "plus-one": `function plusOne(digits) {
  const d = digits.slice();
  for (let i = d.length - 1; i >= 0; i--) {
    if (d[i] < 9) { d[i]++; return d; }
    d[i] = 0;
  }
  d.unshift(1);
  return d;
}`,
  "happy-number": `function isHappy(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    let s = 0;
    while (n > 0) { const d = n % 10; s += d * d; n = Math.floor(n / 10); }
    n = s;
  }
  return n === 1;
}`,
  "group-anagrams": `function groupAnagrams(strs) {
  const m = new Map();
  for (const s of strs) {
    const k = s.split("").sort().join("");
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(s);
  }
  return Array.from(m.values());
}`,
  "top-k-frequent-elements": `function topKFrequent(nums, k) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).slice(0, k).map(e => e[0]);
}`,
  "product-of-array-except-self": `function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);
  let p = 1;
  for (let i = 0; i < n; i++) { res[i] = p; p *= nums[i]; }
  p = 1;
  for (let i = n - 1; i >= 0; i--) { res[i] *= p; p *= nums[i]; }
  return res.map(x => x === 0 ? 0 : x);
}`,
  "longest-consecutive-sequence": `function longestConsecutive(nums) {
  const s = new Set(nums);
  let best = 0;
  for (const x of s) {
    if (!s.has(x - 1)) {
      let y = x;
      while (s.has(y + 1)) y++;
      best = Math.max(best, y - x + 1);
    }
  }
  return best;
}`,
};
