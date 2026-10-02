export const SOLUTIONS: Record<string, string> = {
  "pascals-triangle": `function generate(numRows) {
    const res = [];
    for (let i = 0; i < numRows; i++) {
      const row = [];
      for (let j = 0; j <= i; j++) {
        row.push(j === 0 || j === i ? 1 : res[i - 1][j - 1] + res[i - 1][j]);
      }
      res.push(row);
    }
    return res;
  }`,
  "merge-sorted-array": `function merge(nums1, m, nums2, n) {
    let i = m - 1, j = n - 1, k = m + n - 1;
    while (j >= 0) {
      if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];
      else nums1[k--] = nums2[j--];
    }
  }`,
  "rotate-array": `function rotate(nums, k) {
    const n = nums.length;
    if (n === 0) return;
    k = k % n;
    const copy = nums.slice();
    for (let i = 0; i < n; i++) nums[(i + k) % n] = copy[i];
  }`,
  "sort-colors": `function sortColors(nums) {
    const c = [0, 0, 0];
    for (const x of nums) c[x]++;
    let p = 0;
    for (let v = 0; v < 3; v++) for (let i = 0; i < c[v]; i++) nums[p++] = v;
  }`,
  "subarray-sum-equals-k": `function subarraySum(nums, k) {
    const seen = new Map();
    seen.set(0, 1);
    let sum = 0, count = 0;
    for (const x of nums) {
      sum += x;
      if (seen.has(sum - k)) count += seen.get(sum - k);
      seen.set(sum, (seen.get(sum) || 0) + 1);
    }
    return count;
  }`,
  "jump-game": `function canJump(nums) {
    let reach = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i > reach) return false;
      reach = Math.max(reach, i + nums[i]);
    }
    return true;
  }`,
  "two-sum-ii-input-array-is-sorted": `function twoSum(numbers, target) {
    let l = 0, r = numbers.length - 1;
    while (l < r) {
      const s = numbers[l] + numbers[r];
      if (s === target) return [l + 1, r + 1];
      if (s < target) l++; else r--;
    }
    return [];
  }`,
  "3sum": `function threeSum(nums) {
    const a = nums.slice().sort((x, y) => x - y);
    const res = [];
    for (let i = 0; i < a.length - 2; i++) {
      if (i > 0 && a[i] === a[i - 1]) continue;
      let l = i + 1, r = a.length - 1;
      while (l < r) {
        const s = a[i] + a[l] + a[r];
        if (s === 0) {
          res.push([a[i], a[l], a[r]]);
          l++; r--;
          while (l < r && a[l] === a[l - 1]) l++;
          while (l < r && a[r] === a[r + 1]) r--;
        } else if (s < 0) l++; else r--;
      }
    }
    return res;
  }`,
  "container-with-most-water": `function maxArea(height) {
    let l = 0, r = height.length - 1, best = 0;
    while (l < r) {
      best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
      if (height[l] < height[r]) l++; else r--;
    }
    return best;
  }`,
  "squares-of-a-sorted-array": `function sortedSquares(nums) {
    return nums.map(x => x * x).sort((a, b) => a - b);
  }`,
  "reverse-string": `function reverseString(s) {
    let l = 0, r = s.length - 1;
    while (l < r) {
      const t = s[l]; s[l] = s[r]; s[r] = t;
      l++; r--;
    }
  }`,
  "valid-palindrome-ii": `function validPalindrome(s) {
    function pal(l, r) {
      while (l < r) {
        if (s[l] !== s[r]) return false;
        l++; r--;
      }
      return true;
    }
    let l = 0, r = s.length - 1;
    while (l < r) {
      if (s[l] !== s[r]) return pal(l + 1, r) || pal(l, r - 1);
      l++; r--;
    }
    return true;
  }`,
  "longest-substring-without-repeating-characters": `function lengthOfLongestSubstring(s) {
    const last = new Map();
    let start = 0, best = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (last.has(c) && last.get(c) >= start) start = last.get(c) + 1;
      last.set(c, i);
      best = Math.max(best, i - start + 1);
    }
    return best;
  }`,
  "longest-repeating-character-replacement": `function characterReplacement(s, k) {
    const cnt = new Map();
    let l = 0, maxF = 0, best = 0;
    for (let r = 0; r < s.length; r++) {
      cnt.set(s[r], (cnt.get(s[r]) || 0) + 1);
      maxF = Math.max(maxF, cnt.get(s[r]));
      while (r - l + 1 - maxF > k) {
        cnt.set(s[l], cnt.get(s[l]) - 1);
        l++;
      }
      best = Math.max(best, r - l + 1);
    }
    return best;
  }`,
  "permutation-in-string": `function checkInclusion(s1, s2) {
    const n = s1.length, m = s2.length;
    if (n > m) return false;
    const need = new Array(26).fill(0), win = new Array(26).fill(0);
    const A = 97;
    for (let i = 0; i < n; i++) {
      need[s1.charCodeAt(i) - A]++;
      win[s2.charCodeAt(i) - A]++;
    }
    function eq() {
      for (let i = 0; i < 26; i++) if (need[i] !== win[i]) return false;
      return true;
    }
    if (eq()) return true;
    for (let i = n; i < m; i++) {
      win[s2.charCodeAt(i) - A]++;
      win[s2.charCodeAt(i - n) - A]--;
      if (eq()) return true;
    }
    return false;
  }`,
  "minimum-window-substring": `function minWindow(s, t) {
    if (t.length === 0 || s.length < t.length) return "";
    const need = new Map();
    for (const c of t) need.set(c, (need.get(c) || 0) + 1);
    let missing = t.length, l = 0, bestL = 0, bestLen = Infinity;
    for (let r = 0; r < s.length; r++) {
      const c = s[r];
      if (need.has(c)) {
        if (need.get(c) > 0) missing--;
        need.set(c, need.get(c) - 1);
      }
      while (missing === 0) {
        if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
        const d = s[l];
        if (need.has(d)) {
          need.set(d, need.get(d) + 1);
          if (need.get(d) > 0) missing++;
        }
        l++;
      }
    }
    return bestLen === Infinity ? "" : s.substring(bestL, bestL + bestLen);
  }`,
  "find-all-anagrams-in-a-string": `function findAnagrams(s, p) {
    const res = [];
    const n = p.length;
    if (n > s.length) return res;
    const need = new Array(26).fill(0), win = new Array(26).fill(0);
    const A = 97;
    for (let i = 0; i < n; i++) {
      need[p.charCodeAt(i) - A]++;
      win[s.charCodeAt(i) - A]++;
    }
    function eq() {
      for (let i = 0; i < 26; i++) if (need[i] !== win[i]) return false;
      return true;
    }
    if (eq()) res.push(0);
    for (let i = n; i < s.length; i++) {
      win[s.charCodeAt(i) - A]++;
      win[s.charCodeAt(i - n) - A]--;
      if (eq()) res.push(i - n + 1);
    }
    return res;
  }`,
  "is-subsequence": `function isSubsequence(s, t) {
    let i = 0;
    for (let j = 0; j < t.length && i < s.length; j++) {
      if (s[i] === t[j]) i++;
    }
    return i === s.length;
  }`,
  "daily-temperatures": `function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const res = new Array(n).fill(0);
    const st = [];
    for (let i = 0; i < n; i++) {
      while (st.length && temperatures[st[st.length - 1]] < temperatures[i]) {
        const j = st.pop();
        res[j] = i - j;
      }
      st.push(i);
    }
    return res;
  }`,
  "evaluate-reverse-polish-notation": `function evalRPN(tokens) {
    const st = [];
    for (const t of tokens) {
      if (t === "+" || t === "-" || t === "*" || t === "/") {
        const b = st.pop(), a = st.pop();
        let v;
        if (t === "+") v = a + b;
        else if (t === "-") v = a - b;
        else if (t === "*") v = a * b;
        else v = Math.trunc(a / b);
        st.push(v === 0 ? 0 : v);
      } else st.push(parseInt(t, 10));
    }
    return st.pop();
  }`,
  "generate-parentheses": `function generateParenthesis(n) {
    const res = [];
    function go(cur, open, close) {
      if (cur.length === 2 * n) { res.push(cur); return; }
      if (open < n) go(cur + "(", open + 1, close);
      if (close < open) go(cur + ")", open, close + 1);
    }
    go("", 0, 0);
    return res;
  }`,
};
