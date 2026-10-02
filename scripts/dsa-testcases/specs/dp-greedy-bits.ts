import type { ProblemSpec } from "../types";

export const DP_GREEDY_BITS: ProblemSpec[] = [
  {
    slug: "house-robber",
    functionName: "rob",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction rob(nums) {\n  \n}",
    hints: [
      "Standing at house i, you either take its cash or you don't. What does each choice tell you about house i - 1?",
      "Let best(i) be the most you can collect from the first i houses. Taking house i forces you to skip i - 1, so best(i) is the larger of best(i - 1) and best(i - 2) plus nums[i]. Only the last two values are ever needed.",
      "prev2 = 0\nprev1 = 0\nfor x in nums:\n  take = prev2 + x\n  skip = prev1\n  prev2 = prev1\n  prev1 = max(take, skip)\nreturn prev1",
    ],
    reference: `function rob(nums) {
      let prev2 = 0, prev1 = 0;
      for (const x of nums) {
        const cur = Math.max(prev1, prev2 + x);
        prev2 = prev1;
        prev1 = cur;
      }
      return prev1;
    }`,
    brute: `function rob(nums) {
      const memo = new Map();
      function go(i) {
        if (i >= nums.length) return 0;
        if (memo.has(i)) return memo.get(i);
        const r = Math.max(nums[i] + go(i + 2), go(i + 1));
        memo.set(i, r);
        return r;
      }
      return go(0);
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 9); return [Array.from({ length: n }, () => Math.floor(rand() * 21))]; }`,
    cases: [
      { input: [[1, 2, 3, 1]], hidden: false },
      { input: [[2, 7, 9, 3, 1]], hidden: false },
      { input: [[5]], hidden: false, edge: "single", note: "With one house there is no neighbour to conflict with: take it." },
      { input: [[4, 4, 4, 4]], hidden: false, edge: "all-equal", note: "Every house ties: the answer is two houses, not all four and not one." },
      { input: [[0, 0, 0]], hidden: false, edge: "zeros" },
      { input: [[2, 1]], hidden: true, edge: "two", note: "You can only take one of two adjacent houses: the answer is the larger, not the sum." },
      { input: [[2, 1, 1, 2]], hidden: true },
      { input: [[5, 4, 3, 2, 1]], hidden: true, edge: "reverse-sorted" },
      { input: [[1, 2, 3, 4, 5]], hidden: true, edge: "sorted" },
      { input: [[400, 1, 1, 400]], hidden: true, edge: "extremes", note: "Skipping two houses in a row to reach both big values beats alternating greedily." },
      { input: [Array.from({ length: 100 }, (_, i) => (i * 37 + 11) % 401)], hidden: true, edge: "large", note: "100 houses: trying every take/skip combination is exponential and never finishes." },
    ],
  },
  {
    slug: "coin-change",
    functionName: "coinChange",
    params: ["coins", "amount"],
    returnType: "number",
    starter: "/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nfunction coinChange(coins, amount) {\n  \n}",
    hints: [
      "If you always grab the biggest coin that fits, can you find a coin set where that goes wrong?",
      "Define fewest(a) as the minimum coins to make amount a. Try every coin c as the last coin used: fewest(a) = 1 + the best of fewest(a - c). Build it up from 0, treating unreachable amounts as infinity.",
      "fewest[0] = 0\nfewest[1..amount] = infinity\nfor a from 1 to amount:\n  for each coin c:\n    if c <= a and fewest[a - c] is not infinity:\n      fewest[a] = min(fewest[a], fewest[a - c] + 1)\nif fewest[amount] is infinity: return -1\nreturn fewest[amount]",
    ],
    reference: `function coinChange(coins, amount) {
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) {
        for (const c of coins) {
          if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
        }
      }
      return dp[amount] === Infinity ? -1 : dp[amount];
    }`,
    brute: `function coinChange(coins, amount) {
      if (amount === 0) return 0;
      const seen = new Set([0]);
      let frontier = [0];
      let steps = 0;
      while (frontier.length) {
        steps++;
        const next = [];
        for (const v of frontier) {
          for (const c of coins) {
            const w = v + c;
            if (w === amount) return steps;
            if (w < amount && !seen.has(w)) { seen.add(w); next.push(w); }
          }
        }
        frontier = next;
      }
      return -1;
    }`,
    fuzz: `function gen(rand) {
      const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const k = 1 + Math.floor(rand() * 4);
      const coins = pool.slice(0, k);
      if (rand() < 0.3) coins.push(coins[0] * 10);
      return [coins, Math.floor(rand() * 26)];
    }`,
    cases: [
      { input: [[1, 2, 5], 11], hidden: false },
      { input: [[1, 3, 4], 6], hidden: false },
      { input: [[2], 3], hidden: false, edge: "no-answer", note: "Only even totals are reachable with a 2-coin: return -1, not Infinity or 0." },
      { input: [[1], 0], hidden: false, edge: "zeros", note: "Amount 0 needs zero coins. It is not -1 and not 1." },
      { input: [[5], 5], hidden: true, edge: "single", note: "One coin denomination that matches the amount exactly." },
      { input: [[1, 5, 6, 9], 11], hidden: true },
      { input: [[2, 4], 7], hidden: true, edge: "no-answer", note: "Every coin is even and the amount is odd, so nothing reaches it." },
      { input: [[2147483647], 2], hidden: true, edge: "extremes", note: "The coin is bigger than the amount: no coin fits. Watch for overflow-style sentinels." },
      { input: [[186, 419, 83, 408], 6249], hidden: true, edge: "large", note: "Amount 6249 with awkward coins: trying every coin sequence recursively explodes." },
      { input: [[1, 2, 5], 100], hidden: true },
    ],
  },
  {
    slug: "longest-increasing-subsequence",
    functionName: "lengthOfLIS",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction lengthOfLIS(nums) {\n  \n}",
    hints: [
      "If you fix the last element of an increasing subsequence, what do you need to know about everything before it?",
      "For each position, the best length ending there is 1 plus the best among earlier, strictly smaller values (O(n^2)). For O(n log n), keep the smallest possible tail for each length and binary-search where the current value belongs.",
      "tails = empty list\nfor x in nums:\n  find the first index k in tails with tails[k] >= x (binary search)\n  if no such index: append x to tails\n  else: tails[k] = x\nreturn length of tails",
    ],
    reference: `function lengthOfLIS(nums) {
      const tails = [];
      for (const x of nums) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < x) lo = mid + 1; else hi = mid;
        }
        tails[lo] = x;
      }
      return tails.length;
    }`,
    brute: `function lengthOfLIS(nums) {
      const n = nums.length;
      const dp = new Array(n).fill(1);
      let best = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
        if (dp[i] > best) best = dp[i];
      }
      return best;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 10); return [Array.from({ length: n }, () => Math.floor(rand() * 11) - 5)]; }`,
    cases: [
      { input: [[10, 9, 2, 5, 3, 7, 101, 18]], hidden: false },
      { input: [[0, 1, 0, 3, 2, 3]], hidden: false },
      { input: [[7, 7, 7, 7, 7]], hidden: false, edge: "all-equal", note: "The subsequence must be strictly increasing, so equal values never chain: the answer is 1." },
      { input: [[5]], hidden: false, edge: "single" },
      { input: [[1, 2, 3, 4, 5]], hidden: false, edge: "sorted", note: "The whole array is the answer: every element extends the chain." },
      { input: [[5, 4, 3, 2, 1]], hidden: true, edge: "reverse-sorted", note: "No two elements increase: the answer is 1." },
      { input: [[-2, -1, -5, -4, -3]], hidden: true, edge: "negatives" },
      { input: [[4, 10, 4, 3, 8, 9]], hidden: true, edge: "duplicates", note: "Repeated 4s must not both be used; an equal value should replace a tail, not extend it." },
      { input: [[1, 3, 6, 7, 9, 4, 10, 5, 6]], hidden: true },
      { input: [[10000, -10000]], hidden: true, edge: "extremes" },
      { input: [Array.from({ length: 500 }, (_, i) => (i * 7919 + 13) % 1009)], hidden: true, edge: "large", note: "500 scrambled values: trying every subsequence is 2^500, and even the O(n^2) table is the slow route." },
    ],
  },
  {
    slug: "longest-common-subsequence",
    functionName: "longestCommonSubsequence",
    params: ["text1", "text2"],
    returnType: "number",
    starter: "/**\n * @param {string} text1\n * @param {string} text2\n * @return {number}\n */\nfunction longestCommonSubsequence(text1, text2) {\n  \n}",
    hints: [
      "Compare the last characters of the two strings. What can you conclude if they match, and what if they don't?",
      "Let L(i, j) be the answer for the first i characters of one string and the first j of the other. A match gives 1 + L(i - 1, j - 1); a mismatch gives the larger of L(i - 1, j) and L(i, j - 1). Fill a table.",
      "table[0..m][0..n] = 0\nfor i from 1 to m:\n  for j from 1 to n:\n    if a[i - 1] == b[j - 1]:\n      table[i][j] = table[i - 1][j - 1] + 1\n    else:\n      table[i][j] = max(table[i - 1][j], table[i][j - 1])\nreturn table[m][n]",
    ],
    reference: `function longestCommonSubsequence(text1, text2) {
      const m = text1.length, n = text2.length;
      let prev = new Array(n + 1).fill(0);
      for (let i = 1; i <= m; i++) {
        const cur = new Array(n + 1).fill(0);
        for (let j = 1; j <= n; j++) {
          cur[j] = text1[i - 1] === text2[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
        }
        prev = cur;
      }
      return prev[n];
    }`,
    brute: `function longestCommonSubsequence(text1, text2) {
      const m = text1.length, n = text2.length;
      const memo = new Map();
      function go(i, j) {
        if (i === m || j === n) return 0;
        const key = i * (n + 1) + j;
        if (memo.has(key)) return memo.get(key);
        let r;
        if (text1[i] === text2[j]) r = 1 + go(i + 1, j + 1);
        else r = Math.max(go(i + 1, j), go(i, j + 1));
        memo.set(key, r);
        return r;
      }
      return go(0, 0);
    }`,
    fuzz: `function gen(rand) {
      const mk = () => { const n = 1 + Math.floor(rand() * 7); let s = ""; for (let i = 0; i < n; i++) s += "abcd"[Math.floor(rand() * 4)]; return s; };
      return [mk(), mk()];
    }`,
    cases: [
      { input: ["abcde", "ace"], hidden: false },
      { input: ["abcba", "abcbcba"], hidden: false },
      { input: ["abc", "def"], hidden: false, edge: "no-answer", note: "No shared characters: the answer is 0, not undefined." },
      { input: ["a", "a"], hidden: false, edge: "single-char" },
      { input: ["abc", "abc"], hidden: true, edge: "all-equal", note: "Identical strings: the whole string is the common subsequence." },
      { input: ["aaaa", "aa"], hidden: true, edge: "duplicates", note: "Repeated letters: each character of the shorter string can be used only once." },
      { input: ["abcdefg", "gfedcba"], hidden: true },
      { input: ["oxcpqrsvwf", "shmtulqrypy"], hidden: true },
      { input: ["bl", "yby"], hidden: true },
      {
        input: [
          Array.from({ length: 300 }, (_, i) => "abcdef"[(i * 5 + (i >> 2)) % 6]).join(""),
          Array.from({ length: 300 }, (_, i) => "abcdef"[(i * 7 + (i >> 3)) % 6]).join(""),
        ],
        hidden: true,
        edge: "large",
        note: "Two 300-character strings: plain recursion without memoisation repeats the same pairs exponentially often.",
      },
    ],
  },
  {
    slug: "edit-distance",
    functionName: "minDistance",
    params: ["word1", "word2"],
    returnType: "number",
    starter: "/**\n * @param {string} word1\n * @param {string} word2\n * @return {number}\n */\nfunction minDistance(word1, word2) {\n  \n}",
    hints: [
      "Look only at the last characters of both words. If they are equal you can ignore them. If not, what three moves could fix the mismatch?",
      "Let D(i, j) be the edits to turn the first i letters of word1 into the first j of word2. On a mismatch take 1 plus the smallest of D(i - 1, j) (delete), D(i, j - 1) (insert) and D(i - 1, j - 1) (replace). The base cases are an empty prefix on either side.",
      "table[i][0] = i  for every i\ntable[0][j] = j  for every j\nfor i from 1 to m:\n  for j from 1 to n:\n    if a[i - 1] == b[j - 1]:\n      table[i][j] = table[i - 1][j - 1]\n    else:\n      table[i][j] = 1 + min(table[i - 1][j], table[i][j - 1], table[i - 1][j - 1])\nreturn table[m][n]",
    ],
    reference: `function minDistance(word1, word2) {
      const m = word1.length, n = word2.length;
      let prev = Array.from({ length: n + 1 }, (_, j) => j);
      for (let i = 1; i <= m; i++) {
        const cur = new Array(n + 1);
        cur[0] = i;
        for (let j = 1; j <= n; j++) {
          cur[j] = word1[i - 1] === word2[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
        }
        prev = cur;
      }
      return prev[n];
    }`,
    brute: `function minDistance(word1, word2) {
      const m = word1.length, n = word2.length;
      const memo = new Map();
      function go(i, j) {
        if (i === m) return n - j;
        if (j === n) return m - i;
        const key = i * (n + 1) + j;
        if (memo.has(key)) return memo.get(key);
        let r;
        if (word1[i] === word2[j]) r = go(i + 1, j + 1);
        else r = 1 + Math.min(go(i + 1, j), go(i, j + 1), go(i + 1, j + 1));
        memo.set(key, r);
        return r;
      }
      return go(0, 0);
    }`,
    fuzz: `function gen(rand) {
      const mk = () => { const n = Math.floor(rand() * 7); let s = ""; for (let i = 0; i < n; i++) s += "abc"[Math.floor(rand() * 3)]; return s; };
      return [mk(), mk()];
    }`,
    cases: [
      { input: ["horse", "ros"], hidden: false },
      { input: ["intention", "execution"], hidden: false },
      { input: ["", "abc"], hidden: false, edge: "empty", note: "Turning an empty word into abc takes exactly 3 inserts: the base row of the table." },
      { input: ["a", "b"], hidden: false, edge: "single-char", note: "One replacement, which is cheaper than a delete plus an insert." },
      { input: ["abc", ""], hidden: true, edge: "empty", note: "The mirror case: 3 deletes to reach the empty word." },
      { input: ["", ""], hidden: true, edge: "empty", note: "Both words empty: nothing to do, answer 0." },
      { input: ["abc", "abc"], hidden: true, edge: "all-equal", note: "Identical words need 0 edits." },
      { input: ["sunday", "saturday"], hidden: true },
      { input: ["kitten", "sitting"], hidden: true },
      {
        input: [
          Array.from({ length: 200 }, (_, i) => "abcde"[(i * 7 + (i % 3)) % 5]).join(""),
          Array.from({ length: 200 }, (_, i) => "abcde"[(i * 3 + (i % 4)) % 5]).join(""),
        ],
        hidden: true,
        edge: "large",
        note: "Two 200-character words: unmemoised recursion branches three ways per mismatch and never finishes.",
      },
    ],
  },
  {
    slug: "unique-paths",
    functionName: "uniquePaths",
    params: ["m", "n"],
    returnType: "number",
    starter: "/**\n * @param {number} m\n * @param {number} n\n * @return {number}\n */\nfunction uniquePaths(m, n) {\n  \n}",
    hints: [
      "To reach a cell you must have come from exactly two neighbours. How many ways are there to reach the cells along the top row and left column?",
      "paths(r, c) = paths(r - 1, c) + paths(r, c - 1), with 1 for any cell in the first row or column. You only need one row of the table at a time.",
      "row = list of n ones\nfor r from 1 to m - 1:\n  for c from 1 to n - 1:\n    row[c] = row[c] + row[c - 1]\nreturn row[n - 1]",
    ],
    reference: `function uniquePaths(m, n) {
      const row = new Array(n).fill(1);
      for (let r = 1; r < m; r++) {
        for (let c = 1; c < n; c++) row[c] += row[c - 1];
      }
      return row[n - 1];
    }`,
    brute: `function uniquePaths(m, n) {
      // Choose which of the (m - 1) + (n - 1) moves go down: a binomial coefficient.
      const k = BigInt(Math.min(m, n) - 1);
      const total = BigInt(m + n - 2);
      let num = 1n, den = 1n;
      for (let i = 0n; i < k; i++) { num *= total - i; den *= i + 1n; }
      return Number(num / den);
    }`,
    fuzz: `function gen(rand) { return [1 + Math.floor(rand() * 9), 1 + Math.floor(rand() * 9)]; }`,
    cases: [
      { input: [3, 7], hidden: false },
      { input: [3, 2], hidden: false },
      { input: [1, 1], hidden: false, edge: "min-size", note: "Start and finish are the same cell: one path, with no moves at all." },
      { input: [1, 6], hidden: false, edge: "boundary", note: "A single row has exactly one path; a table that starts at row 1 may skip the base case." },
      { input: [7, 3], hidden: true },
      { input: [2, 2], hidden: true },
      { input: [10, 10], hidden: true },
      { input: [100, 1], hidden: true, edge: "extremes", note: "A tall single column at the maximum height: still exactly one path." },
      { input: [2, 10], hidden: true },
      { input: [17, 17], hidden: true, edge: "large", note: "A 17x17 grid has over 600 million paths: counting them one by one with plain recursion times out." },
    ],
  },
  {
    slug: "word-break",
    functionName: "wordBreak",
    params: ["s", "wordDict"],
    returnType: "boolean",
    starter: "/**\n * @param {string} s\n * @param {string[]} wordDict\n * @return {boolean}\n */\nfunction wordBreak(s, wordDict) {\n  \n}",
    hints: [
      "If a prefix of s is a dictionary word, what is left to figure out about the remaining suffix?",
      "Let ok[i] mean the first i characters can be split into words. ok[i] is true when some earlier ok[j] is true and s[j..i) is a word. Put the words in a set for O(1) lookups.",
      "ok[0] = true\nfor i from 1 to length of s:\n  ok[i] = false\n  for j from 0 to i - 1:\n    if ok[j] and substring s[j..i) is in the word set:\n      ok[i] = true\n      stop looking at this i\nreturn ok[length of s]",
    ],
    reference: `function wordBreak(s, wordDict) {
      const words = new Set(wordDict);
      const ok = new Array(s.length + 1).fill(false);
      ok[0] = true;
      for (let i = 1; i <= s.length; i++) {
        for (let j = 0; j < i; j++) {
          if (ok[j] && words.has(s.slice(j, i))) { ok[i] = true; break; }
        }
      }
      return ok[s.length];
    }`,
    brute: `function wordBreak(s, wordDict) {
      const seen = new Set([0]);
      const queue = [0];
      while (queue.length) {
        const pos = queue.shift();
        if (pos === s.length) return true;
        for (const w of wordDict) {
          if (s.startsWith(w, pos) && !seen.has(pos + w.length)) {
            seen.add(pos + w.length);
            queue.push(pos + w.length);
          }
        }
      }
      return false;
    }`,
    fuzz: `function gen(rand) {
      const all = ["a", "b", "aa", "ab", "ba", "bb", "aaa", "aab", "bab"];
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      const dict = all.slice(0, 1 + Math.floor(rand() * 4));
      let s = "";
      if (rand() < 0.6) {
        const parts = 1 + Math.floor(rand() * 4);
        for (let i = 0; i < parts; i++) s += dict[Math.floor(rand() * dict.length)];
        if (rand() < 0.3) s += "ab"[Math.floor(rand() * 2)];
      } else {
        const n = 1 + Math.floor(rand() * 8);
        for (let i = 0; i < n; i++) s += "ab"[Math.floor(rand() * 2)];
      }
      return [s, dict];
    }`,
    cases: [
      { input: ["leetcode", ["leet", "code"]], hidden: false },
      { input: ["applepenapple", ["apple", "pen"]], hidden: false },
      { input: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], hidden: false, edge: "no-answer", note: "Greedy splitting finds cats + and, then gets stuck on og: only trying every split point answers false." },
      { input: ["a", ["a"]], hidden: false, edge: "single-char" },
      { input: ["aaaa", ["a"]], hidden: true, edge: "reuse", note: "Dictionary words can be used any number of times." },
      { input: ["aaaaaaa", ["aaaa", "aaa"]], hidden: true, edge: "duplicates", note: "Words of length 3 and 4 overlap: taking the 4 first leaves 3 letters, which only works if the remainder is checked, not assumed." },
      { input: ["cars", ["car", "ca", "rs"]], hidden: true },
      { input: ["abcd", ["a", "abc", "b", "cd"]], hidden: true },
      { input: ["goalspecial", ["go", "goal", "goals", "special"]], hidden: true },
      { input: ["a".repeat(100) + "b", ["a", "aa", "aaa", "aaaa"]], hidden: true, edge: "large", note: "Every split of the a's works until the final b fails: unmemoised recursion tries exponentially many splits." },
    ],
  },
  {
    slug: "decode-ways",
    functionName: "numDecodings",
    params: ["s"],
    returnType: "number",
    starter: "/**\n * @param {string} s\n * @return {number}\n */\nfunction numDecodings(s) {\n  \n}",
    hints: [
      "Look at the last one or two digits of the string. When is each of those a valid letter code?",
      "Let ways[i] count decodings of the first i digits. A single digit 1-9 adds ways[i - 1]; a two-digit number from 10 to 26 adds ways[i - 2]. A zero can only be used as part of 10 or 20.",
      "ways[0] = 1\nways[1] = 0 if s[0] is 0, else 1\nfor i from 2 to length of s:\n  ways[i] = 0\n  if s[i - 1] is not 0: ways[i] += ways[i - 1]\n  two = number made by s[i - 2] and s[i - 1]\n  if two is between 10 and 26: ways[i] += ways[i - 2]\nreturn ways[length of s]",
    ],
    reference: `function numDecodings(s) {
      const n = s.length;
      let prev2 = 1;
      let prev1 = s[0] === "0" ? 0 : 1;
      for (let i = 2; i <= n; i++) {
        let cur = 0;
        if (s[i - 1] !== "0") cur += prev1;
        const two = Number(s.slice(i - 2, i));
        if (two >= 10 && two <= 26) cur += prev2;
        prev2 = prev1;
        prev1 = cur;
      }
      return prev1;
    }`,
    brute: `function numDecodings(s) {
      const memo = new Map();
      function go(i) {
        if (i === s.length) return 1;
        if (s[i] === "0") return 0;
        if (memo.has(i)) return memo.get(i);
        let r = go(i + 1);
        if (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26) r += go(i + 2);
        memo.set(i, r);
        return r;
      }
      return go(0);
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 10);
      const digits = "0111222345679";
      let s = "";
      for (let i = 0; i < n; i++) s += digits[Math.floor(rand() * digits.length)];
      return [s];
    }`,
    cases: [
      { input: ["12"], hidden: false },
      { input: ["226"], hidden: false },
      { input: ["06"], hidden: false, edge: "zeros", note: "A leading zero is not a valid code, and 06 is not 6: the answer is 0." },
      { input: ["0"], hidden: false, edge: "single-char", note: "A lone 0 has no letter: return 0, not 1." },
      { input: ["10"], hidden: true, edge: "zeros", note: "The 0 only works glued to the 1: exactly one decoding, not two." },
      { input: ["100"], hidden: true, edge: "no-answer", note: "10 then a stranded 0, or 1 then 00: neither works, so the answer is 0." },
      { input: ["27"], hidden: true, edge: "boundary", note: "27 is above 26, so it can only be split as 2 and 7." },
      { input: ["2101"], hidden: true },
      { input: ["11106"], hidden: true },
      { input: ["1".repeat(45)], hidden: true, edge: "large", note: "Forty-five 1s give over 1.8 billion decodings: recursion without memoisation never finishes." },
    ],
  },
  {
    slug: "maximum-product-subarray",
    functionName: "maxProduct",
    params: ["nums"],
    returnType: "number",
    starter: "/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxProduct(nums) {\n  \n}",
    hints: [
      "Why isn't tracking only the best product ending at each index enough once negative numbers appear?",
      "A very negative product can become the biggest after multiplying by another negative. Track both the largest and the smallest product of a subarray ending at the current element. A zero resets both.",
      "best = nums[0]\nhigh = nums[0]\nlow = nums[0]\nfor x in nums[1:]:\n  candidates = [x, high * x, low * x]\n  high = max of candidates\n  low = min of candidates\n  best = max(best, high)\nreturn best",
    ],
    reference: `function maxProduct(nums) {
      let best = nums[0], high = nums[0], low = nums[0];
      for (let i = 1; i < nums.length; i++) {
        const x = nums[i];
        const a = high * x, b = low * x;
        high = Math.max(x, a, b);
        low = Math.min(x, a, b);
        if (high > best) best = high;
      }
      return best;
    }`,
    brute: `function maxProduct(nums) {
      let best = -Infinity;
      for (let i = 0; i < nums.length; i++) {
        let p = 1;
        for (let j = i; j < nums.length; j++) {
          p *= nums[j];
          if (p > best) best = p;
        }
      }
      return best;
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 8); return [Array.from({ length: n }, () => Math.floor(rand() * 9) - 3)]; }`,
    cases: [
      { input: [[2, 3, -2, 4]], hidden: false },
      { input: [[-2, 0, -1]], hidden: false, edge: "zeros", note: "The zero splits the array: the best answer is 0, not -2 and not 2." },
      { input: [[-2]], hidden: false, edge: "single", note: "One negative number: the answer is that number, so don't start the best at 0 or 1." },
      { input: [[-2, 3, -4]], hidden: false },
      { input: [[0, 2]], hidden: true, edge: "two" },
      { input: [[-3, -1, -1]], hidden: true, edge: "negatives", note: "All negative: the best is the last two, product 1; a running max alone says 3 or -1." },
      { input: [[2, -5, -2, -4, 3]], hidden: true },
      { input: [[3, 0, 4, 5, 0, 2]], hidden: true, edge: "zeros" },
      { input: [[1, 1, 1, 1]], hidden: true, edge: "all-equal" },
      { input: [Array.from({ length: 1500 }, (_, i) => (i % 97 === 96 ? 0 : i % 13 === 5 ? -1 : i % 41 === 7 ? 2 : 1))], hidden: true, edge: "large", note: "1500 values of mostly 1 and -1 with sparse 2s and zeros: an all-subarrays product loop does over a million multiplications." },
    ],
  },
  {
    slug: "partition-equal-subset-sum",
    functionName: "canPartition",
    params: ["nums"],
    returnType: "boolean",
    starter: "/**\n * @param {number[]} nums\n * @return {boolean}\n */\nfunction canPartition(nums) {\n  \n}",
    hints: [
      "If the two halves must be equal, what does that say about the total sum, and what single number are you aiming for?",
      "Let target be half the total (an odd total is an instant no). The question becomes: can some subset reach exactly target? Track which sums are reachable, adding one number at a time.",
      "total = sum of nums\nif total is odd: return false\ntarget = total / 2\nreachable[0] = true, all other sums false\nfor x in nums:\n  for s from target down to x:\n    if reachable[s - x]: reachable[s] = true\nreturn reachable[target]",
    ],
    reference: `function canPartition(nums) {
      let total = 0;
      for (const x of nums) total += x;
      if (total % 2 !== 0) return false;
      const target = total / 2;
      const reach = new Array(target + 1).fill(false);
      reach[0] = true;
      for (const x of nums) {
        for (let s = target; s >= x; s--) if (reach[s - x]) reach[s] = true;
      }
      return reach[target];
    }`,
    brute: `function canPartition(nums) {
      let total = 0;
      for (const x of nums) total += x;
      if (total % 2 !== 0) return false;
      const target = total / 2;
      const memo = new Map();
      function go(i, rem) {
        if (rem === 0) return true;
        if (rem < 0 || i === nums.length) return false;
        const key = i * (target + 1) + rem;
        if (memo.has(key)) return memo.get(key);
        const r = go(i + 1, rem - nums[i]) || go(i + 1, rem);
        memo.set(key, r);
        return r;
      }
      return go(0, target);
    }`,
    fuzz: `function gen(rand) { const n = 1 + Math.floor(rand() * 9); return [Array.from({ length: n }, () => 1 + Math.floor(rand() * 10))]; }`,
    cases: [
      { input: [[1, 5, 11, 5]], hidden: false },
      { input: [[1, 2, 3, 5]], hidden: false, edge: "no-answer", note: "The total is 11, which is odd, so an equal split cannot exist." },
      { input: [[7]], hidden: false, edge: "single", note: "One element can never be split into two equal halves." },
      { input: [[3, 3, 3, 3]], hidden: false, edge: "all-equal" },
      { input: [[1, 1]], hidden: true, edge: "two" },
      { input: [[1, 2, 5]], hidden: true, edge: "no-answer", note: "The total is even (8) but no subset reaches 4: parity alone is not enough." },
      { input: [[100, 100, 100, 100, 99, 1]], hidden: true, edge: "extremes" },
      { input: [[2, 2, 1, 1]], hidden: false },
      { input: [[23, 13, 11, 7, 6, 5, 5]], hidden: true },
      { input: [[...Array.from({ length: 99 }, () => 100), 2]], hidden: true, edge: "large", note: "100 numbers with an even total but no valid split: trying every subset is hopeless, a reachable-sums table is quick." },
    ],
  },
  {
    slug: "number-of-1-bits",
    functionName: "hammingWeight",
    params: ["n"],
    returnType: "number",
    starter: "/**\n * @param {number} n\n * @return {number}\n */\nfunction hammingWeight(n) {\n  \n}",
    hints: [
      "What does n & 1 tell you, and how can you move on to the next bit?",
      "Either shift right one bit at a time counting the low bit, or use n & (n - 1), which clears the lowest set bit so the loop runs once per set bit. Remember JavaScript bitwise operators work on signed 32-bit values.",
      "n = n as an unsigned 32-bit value\ncount = 0\nwhile n is not 0:\n  count = count + (n AND 1)\n  n = n shifted right by 1 (unsigned shift)\nreturn count",
    ],
    reference: `function hammingWeight(n) {
      let x = n >>> 0;
      let count = 0;
      while (x !== 0) {
        count += x & 1;
        x >>>= 1;
      }
      return count;
    }`,
    brute: `function hammingWeight(n) {
      return n.toString(2).split("").filter((ch) => ch === "1").length;
    }`,
    fuzz: `function gen(rand) {
      const r = rand();
      if (r < 0.25) return [Math.floor(rand() * 64)];
      if (r < 0.5) return [(Math.floor(rand() * 65536) * 65536 + Math.floor(rand() * 65536)) % 4294967296];
      return [Math.floor(rand() * 4294967296)];
    }`,
    cases: [
      { input: [11], hidden: false },
      { input: [128], hidden: false },
      { input: [2147483645], hidden: false },
      { input: [0], hidden: false, edge: "zeros", note: "No set bits: the loop must not run, and the answer is 0." },
      { input: [4294967295], hidden: false, edge: "extremes", note: "All 32 bits set: with signed shifts this becomes -1 and an arithmetic >> loop never ends." },
      { input: [2147483648], hidden: true, edge: "boundary", note: "Only bit 31 is set. It is the sign bit in 32-bit signed math, so n & 1 and >> misbehave." },
      { input: [1], hidden: true, edge: "min-size", note: "The smallest positive value has a single set bit in the lowest position." },
      { input: [4294967294], hidden: true },
      { input: [1431655765], hidden: true },
      { input: [65536], hidden: true },
    ],
  },
  {
    slug: "counting-bits",
    functionName: "countBits",
    params: ["n"],
    returnType: "number[]",
    starter: "/**\n * @param {number} n\n * @return {number[]}\n */\nfunction countBits(n) {\n  \n}",
    hints: [
      "How are the set bits of i related to those of i halved (dropping its last bit)?",
      "Reuse earlier answers: bits(i) = bits(i >> 1) plus the lowest bit of i. That fills the whole array in one pass with no per-number bit loop.",
      "result[0] = 0\nfor i from 1 to n:\n  result[i] = result[i shifted right by 1] + (i AND 1)\nreturn result",
    ],
    reference: `function countBits(n) {
      const res = new Array(n + 1).fill(0);
      for (let i = 1; i <= n; i++) res[i] = res[i >> 1] + (i & 1);
      return res;
    }`,
    brute: `function countBits(n) {
      const res = [];
      for (let i = 0; i <= n; i++) {
        let c = 0;
        for (const ch of i.toString(2)) if (ch === "1") c++;
        res.push(c);
      }
      return res;
    }`,
    fuzz: `function gen(rand) { return [Math.floor(rand() * 70)]; }`,
    cases: [
      { input: [2], hidden: false },
      { input: [5], hidden: false },
      { input: [0], hidden: false, edge: "min-size", note: "n = 0 still returns an array with one entry, [0]; code that starts at index 1 may index past the end." },
      { input: [1], hidden: false },
      { input: [7], hidden: true },
      { input: [16], hidden: true, edge: "boundary", note: "A power of two: the new top bit appears and the count falls back to 1 at index 16." },
      { input: [15], hidden: true },
      { input: [100], hidden: true },
      { input: [1023], hidden: true },
      { input: [2000], hidden: true, edge: "large", note: "2001 results: a per-number bit loop does over twenty thousand operations, while the dp-on-i>>1 version does one per entry." },
    ],
  },
  {
    slug: "subsets",
    functionName: "subsets",
    params: ["nums"],
    returnType: "number[][]",
    compare: "unordered",
    starter: "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nfunction subsets(nums) {\n  \n}",
    hints: [
      "For each element there are two choices. How many different results do n independent choices give?",
      "Build subsets incrementally: start with the empty set, and for each new number copy every existing subset and add the number to the copy. Alternatively use backtracking: include it, recurse, then exclude it.",
      "result = [ empty list ]\nfor x in nums:\n  for each existing subset s in result (snapshot before this round):\n    add a copy of s with x appended to result\nreturn result",
    ],
    reference: `function subsets(nums) {
      const res = [];
      const cur = [];
      function dfs(i) {
        if (i === nums.length) { res.push(cur.slice()); return; }
        dfs(i + 1);
        cur.push(nums[i]);
        dfs(i + 1);
        cur.pop();
      }
      dfs(0);
      return res;
    }`,
    brute: `function subsets(nums) {
      const n = nums.length;
      const res = [];
      for (let mask = 0; mask < (1 << n); mask++) {
        const s = [];
        for (let b = 0; b < n; b++) if (mask & (1 << b)) s.push(nums[b]);
        res.push(s);
      }
      return res;
    }`,
    fuzz: `function gen(rand) {
      const pool = Array.from({ length: 21 }, (_, i) => i - 10);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      return [pool.slice(0, 1 + Math.floor(rand() * 6))];
    }`,
    cases: [
      { input: [[1, 2, 3]], hidden: false },
      { input: [[7, 4]], hidden: false },
      { input: [[0]], hidden: false, edge: "single", note: "One element gives exactly two subsets: [] and [0]. Don't forget the empty set." },
      { input: [[-1, -2, -3]], hidden: false, edge: "negatives" },
      { input: [[3, 1, 2]], hidden: true, edge: "order", note: "Same values as example 1 in another order: subsets and their elements may come back in any order." },
      { input: [[0, 1, 2]], hidden: true, edge: "zeros", note: "0 is a normal element here: its subsets must not be dropped by a truthiness check." },
      { input: [[2, 4, 6, 8, 10]], hidden: true },
      { input: [[10, -10]], hidden: true, edge: "extremes" },
      { input: [[5, -4, 0, 2]], hidden: true },
      { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9]], hidden: true, edge: "large", note: "Nine numbers give 512 subsets; the result must contain every one exactly once." },
    ],
  },
  {
    slug: "merge-intervals",
    functionName: "merge",
    params: ["intervals"],
    returnType: "number[][]",
    starter: "/**\n * @param {number[][]} intervals\n * @return {number[][]}\n */\nfunction merge(intervals) {\n  \n}",
    hints: [
      "If the intervals were ordered by start, which neighbours could possibly overlap?",
      "Sort by start. Keep the last merged interval; if the next one starts at or before its end, stretch that end to the larger of the two ends, otherwise begin a new interval. Touching endpoints count as overlapping.",
      "sort intervals by start\nresult = [ first interval ]\nfor each interval cur in the rest:\n  last = final interval in result\n  if cur.start <= last.end:\n    last.end = max(last.end, cur.end)\n  else:\n    append cur to result\nreturn result",
    ],
    reference: `function merge(intervals) {
      const sorted = intervals.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const res = [];
      for (const cur of sorted) {
        const last = res[res.length - 1];
        if (last && cur[0] <= last[1]) { if (cur[1] > last[1]) last[1] = cur[1]; }
        else res.push(cur);
      }
      return res;
    }`,
    brute: `function merge(intervals) {
      let list = intervals.map((p) => [p[0], p[1]]);
      let changed = true;
      while (changed) {
        changed = false;
        outer: for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i], b = list[j];
            if (a[0] <= b[1] && b[0] <= a[1]) {
              list[i] = [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
              list.splice(j, 1);
              changed = true;
              break outer;
            }
          }
        }
      }
      return list.sort((a, b) => a[0] - b[0]);
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 7);
      return [Array.from({ length: n }, () => { const s = Math.floor(rand() * 16); return [s, s + Math.floor(rand() * 6)]; })];
    }`,
    cases: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], hidden: false },
      { input: [[[4, 7], [1, 4]]], hidden: false },
      { input: [[[1, 5]]], hidden: false, edge: "single", note: "One interval has nothing to merge with: return it as is." },
      { input: [[[1, 4], [4, 5]]], hidden: false, edge: "boundary", note: "Intervals that only touch at an endpoint (4) still merge into [1, 5]." },
      { input: [[[5, 6], [3, 4], [1, 2]]], hidden: false, edge: "reverse-sorted", note: "Nothing overlaps, but the input is in reverse: the output must be sorted by start." },
      { input: [[[1, 10], [2, 3], [4, 5]]], hidden: true },
      { input: [[[0, 0], [0, 0]]], hidden: true, edge: "zeros", note: "Zero-length intervals at 0 that are identical: they collapse into a single [0, 0]." },
      { input: [[[0, 0], [10000, 10000], [5000, 10000]]], hidden: true, edge: "extremes" },
      { input: [[[1, 4], [0, 4]]], hidden: true },
      { input: [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]], hidden: true },
      { input: [Array.from({ length: 400 }, (_, i) => [399 - i, 400 - i])], hidden: true, edge: "large", note: "400 chained intervals given in reverse that all fuse into [0, 400]: repeated pairwise merging is cubic." },
    ],
  },
];
