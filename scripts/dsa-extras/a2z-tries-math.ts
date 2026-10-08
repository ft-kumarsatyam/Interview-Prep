import { define, tuf, type ProblemDef } from "./define";
import { gen } from "./gen";

const RUN_OPS = (cls: string) => `function runOps(ops) { const obj = new ${cls}(); return ops.map(([op, ...args]) => { const out = obj[op](...args); return out === undefined ? null : out; }); }`;

const trie: ProblemDef = {
  slug: "trie-implementation-and-advanced-operations",
  title: "Implement Trie II (Counts and Erase)",
  difficulty: "Medium",
  pattern: "Trie",
  url: tuf("trie-implementation-and-advanced-operations"),
  statement: "Implement `Trie` for lowercase words, where the same word can be inserted several times:\n\n- `insert(word)` adds one copy of `word`.\n- `countWordsEqualTo(word)` returns how many copies of `word` are stored.\n- `countWordsStartingWith(prefix)` returns how many stored words (counting copies) start with `prefix`.\n- `erase(word)` removes one copy of `word` if there is one.\n\nThe judge drives your class through `runOps(ops)`: each operation is `[method, ...args]`, and the answer is the list of values the calls return (`null` for methods that return nothing).",
  constraints: ["1 <= word.length <= 1000", "1 <= ops.length <= 10^5"],
  fn: "runOps",
  params: [["ops", "Array<string[]>"]],
  returns: "Array<number | null>",
  starter: "class Trie {\n  constructor() {\n    \n  }\n  insert(word) {\n    \n  }\n  countWordsEqualTo(word) {\n    \n  }\n  countWordsStartingWith(prefix) {\n    \n  }\n  erase(word) {\n    \n  }\n}\n\n/**\n * Runs the operations and collects each result. Don't change this function.\n * @param {Array<string[]>} ops\n * @return {Array<number | null>}\n */\nfunction runOps(ops) {\n  const obj = new Trie();\n  return ops.map(([op, ...args]) => {\n    const out = obj[op](...args);\n    return out === undefined ? null : out;\n  });\n}",
  hints: [
    "A plain trie marks where words end. What two counters per node answer both count queries?",
    "Each node keeps pass (words going through it) and end (words ending at it). insert increments pass along the path and end at the last node; erase decrements them (only if the word is present); the queries read end or pass at the last node.",
    "insert(w): n = root; for c in w: n = child(n, c) creating it; n.pass += 1\n  n.end += 1\ncountWordsEqualTo(w): walk w; return 0 if missing else node.end\ncountWordsStartingWith(p): walk p; return 0 if missing else node.pass\nerase(w): if countWordsEqualTo(w) == 0: return\n  n = root; for c in w: n = n.child[c]; n.pass -= 1\n  n.end -= 1",
  ],
  reference: `class Trie { constructor() { this.r = { c: {}, p: 0, e: 0 }; } walk(w) { let n = this.r; for (const ch of w) { n = n.c[ch]; if (!n) return null; } return n; } insert(w) { let n = this.r; for (const ch of w) { n = n.c[ch] || (n.c[ch] = { c: {}, p: 0, e: 0 }); n.p++; } n.e++; } countWordsEqualTo(w) { const n = this.walk(w); return n ? n.e : 0; } countWordsStartingWith(p) { const n = this.walk(p); return n ? n.p : 0; } erase(w) { if (!this.countWordsEqualTo(w)) return; let n = this.r; for (const ch of w) { n = n.c[ch]; n.p--; } n.e--; } }\n${RUN_OPS("Trie")}`,
  brute: `class Trie { constructor() { this.a = []; } insert(w) { this.a.push(w); } countWordsEqualTo(w) { return this.a.filter((x) => x === w).length; } countWordsStartingWith(p) { return this.a.filter((x) => x.startsWith(p)).length; } erase(w) { const i = this.a.indexOf(w); if (i >= 0) this.a.splice(i, 1); } }\n${RUN_OPS("Trie")}`,
  fuzz: gen(`var n = __r(rand, 1, 14); var ops = []; var names = ["insert", "insert", "countWordsEqualTo", "countWordsStartingWith", "erase"]; for (var i = 0; i < n; i++) ops.push([__pick(rand, names), __str(rand, __r(rand, 1, 3), "ab")]); ops.push(["countWordsStartingWith", __str(rand, 1, "ab")]); return [ops];`),
  examples: [[[["insert", "apple"], ["insert", "apple"], ["insert", "apps"], ["countWordsEqualTo", "apple"], ["countWordsStartingWith", "app"], ["erase", "apple"], ["countWordsStartingWith", "app"]]], [[["insert", "a"], ["countWordsStartingWith", "a"], ["countWordsEqualTo", "b"]]]],
  edges: [
    ["no-answer", [[["erase", "x"], ["countWordsEqualTo", "x"], ["countWordsStartingWith", "x"]]], "Erasing a missing word does nothing."],
    ["duplicates", [[["insert", "ab"], ["insert", "ab"], ["erase", "ab"], ["countWordsEqualTo", "ab"]]]],
    ["boundary", [[["insert", "ab"], ["countWordsStartingWith", "abc"], ["countWordsEqualTo", "a"]]], "A longer prefix than the word, and a proper prefix that isn't a word."],
  ],
};

const completeString: ProblemDef = {
  slug: "longest-word-with-all-prefixes",
  title: "Longest Word with All Prefixes",
  difficulty: "Medium",
  pattern: "Trie",
  url: tuf("longest-word-with-all-prefixes"),
  statement: "Return the longest string in `words` such that **every** prefix of it (including the full word) is also in `words`. On a tie in length, return the lexicographically smallest. If no word qualifies, return `\"None\"`.",
  constraints: ["1 <= words.length <= 10^5", "1 <= words[i].length <= 10^5", "Total length <= 10^5"],
  fn: "completeString",
  params: [["words", "string[]"]],
  returns: "string",
  hints: [
    "Put every word in a trie with an end marker. What must be true along the path of a qualifying word?",
    "A word qualifies when every node on its path is marked as the end of some word. Check each word, keeping the longest (then lexicographically smallest).",
    "insert every word into a trie, marking word ends\nbest = \"\"\nfor w in words:\n  if every prefix node of w is marked as an end:\n    if len(w) > len(best) or (equal length and w < best): best = w\nreturn best if best != \"\" else \"None\"",
  ],
  reference: `function completeString(words) { const root = { c: {}, e: false }; for (const w of words) { let n = root; for (const ch of w) n = n.c[ch] || (n.c[ch] = { c: {}, e: false }); n.e = true; } let best = ""; for (const w of words) { let n = root, ok = true; for (const ch of w) { n = n.c[ch]; if (!n.e) { ok = false; break; } } if (ok && (w.length > best.length || (w.length === best.length && w < best))) best = w; } return best || "None"; }`,
  brute: `function completeString(words) { const set = new Set(words); const ok = words.filter((w) => { for (let i = 1; i <= w.length; i++) if (!set.has(w.slice(0, i))) return false; return true; }); if (!ok.length) return "None"; return ok.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0))[0]; }`,
  fuzz: gen(`return [Array.from({ length: __r(rand, 1, 8) }, function () { return __str(rand, __r(rand, 1, 3), "ab"); })];`),
  examples: [[["n", "ni", "nin", "ninj", "ninja", "ninga"]], [["ab", "bc"]]],
  edges: [
    ["single-char", [["z"]]],
    ["order", [["b", "a", "ba", "ab"]], "Equal lengths: the lexicographically smaller one wins."],
    ["no-answer", [["abc", "bc"]], "No word has its first letter as a word."],
  ],
};

const distinctSubstrings: ProblemDef = {
  slug: "number-of-distinct-substrings-in-a-string",
  title: "Number of Distinct Substrings",
  difficulty: "Hard",
  pattern: "Trie",
  url: tuf("number-of-distinct-substrings-in-a-string"),
  statement: "Return the number of distinct **non-empty** substrings of `s`.",
  constraints: ["1 <= s.length <= 1000"],
  fn: "countDistinctSubstrings",
  params: [["s", "string"]],
  returns: "number",
  hints: [
    "Every substring is a prefix of some suffix. Which structure stores many prefixes while sharing the common ones?",
    "Insert every suffix of s into a trie, character by character. Every newly created node is a new distinct substring, so count node creations.",
    "root = empty trie node; count = 0\nfor i from 0 to n - 1:\n  node = root\n  for j from i to n - 1:\n    if s[j] is not a child of node: create it; count += 1\n    node = child s[j]\nreturn count",
  ],
  reference: `function countDistinctSubstrings(s) { const root = {}; let c = 0; for (let i = 0; i < s.length; i++) { let n = root; for (let j = i; j < s.length; j++) { if (!n[s[j]]) { n[s[j]] = {}; c++; } n = n[s[j]]; } } return c; }`,
  brute: `function countDistinctSubstrings(s) { const set = new Set(); for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) set.add(s.slice(i, j)); return set.size; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 12), "abc")];`),
  examples: [["abab"], ["ccfdf"]],
  edges: [
    ["single-char", ["a"]],
    ["all-equal", ["aaaa"], "Only a, aa, aaa, aaaa."],
    ["case-mix", ["aA"], "Upper and lower case are different characters."],
  ],
};

const rabinKarp: ProblemDef = {
  slug: "rabin-karp-algorithm",
  title: "Rabin-Karp Pattern Search",
  difficulty: "Hard",
  pattern: "Strings: Hashing",
  url: tuf("rabin-karp-algorithm"),
  statement: "Return every 0-based index where `pattern` occurs in `text` (occurrences may overlap), in increasing order. Aim for a rolling hash (Rabin-Karp).",
  constraints: ["1 <= pattern.length <= text.length <= 10^5"],
  fn: "search",
  params: [["pattern", "string"], ["text", "string"]],
  returns: "number[]",
  hints: [
    "Comparing the pattern at every position is O(n * m). Can a number summarise each window so most comparisons are a single check?",
    "Hash the pattern and the first window with a polynomial hash mod a prime. Slide the window: remove the leading character's term, multiply by the base, add the new character. When hashes match, confirm with a direct comparison.",
    "hp = hash(pattern); hw = hash(text[0..m-1]); high = base^(m-1) mod P\nfor i from 0 to n - m:\n  if hw == hp and text[i..i+m-1] == pattern: record i\n  if i + m < n:\n    hw = ((hw - text[i] * high) * base + text[i+m]) mod P\nreturn recorded indexes",
  ],
  reference: `function search(pattern, text) { const P = 1000000007, B = 131, m = pattern.length, n = text.length, out = []; if (m > n) return out; const mul = (a, b) => Number((BigInt(a) * BigInt(b)) % BigInt(P)); let hp = 0, hw = 0, high = 1; for (let i = 0; i < m; i++) { hp = (mul(hp, B) + pattern.charCodeAt(i)) % P; hw = (mul(hw, B) + text.charCodeAt(i)) % P; if (i < m - 1) high = mul(high, B); } for (let i = 0; i + m <= n; i++) { if (hp === hw && text.startsWith(pattern, i)) out.push(i); if (i + m < n) { hw = (hw - mul(text.charCodeAt(i), high) + P) % P; hw = (mul(hw, B) + text.charCodeAt(i + m)) % P; } } return out; }`,
  brute: `function search(pattern, text) { const out = []; for (let i = 0; i + pattern.length <= text.length; i++) if (text.slice(i, i + pattern.length) === pattern) out.push(i); return out; }`,
  fuzz: gen(`var t = __str(rand, __r(rand, 1, 14), "ab"); var m = __r(rand, 1, Math.min(3, t.length)); var p = rand() < 0.6 ? t.substr(__r(rand, 0, t.length - m), m) : __str(rand, m, "ab"); return [p, t];`),
  examples: [["aba", "ababab"], ["xyz", "xyzabxyz"]],
  edges: [
    ["no-answer", ["abc", "ababab"]],
    ["all-equal", ["aa", "aaaa"], "Overlapping matches all count."],
    ["boundary", ["abc", "abc"], "Pattern as long as the text."],
  ],
};

const zFunction: ProblemDef = {
  slug: "z-function",
  title: "Z-Function",
  difficulty: "Hard",
  pattern: "Strings: Pattern Matching",
  url: tuf("z-function"),
  statement: "Return the **Z-array** of `s`: `z[i]` is the length of the longest substring starting at `i` that is also a prefix of `s`. By convention `z[0] = 0`. Aim for O(n).",
  constraints: ["1 <= s.length <= 10^5"],
  fn: "zFunction",
  params: [["s", "string"]],
  returns: "number[]",
  hints: [
    "Comparing from scratch at every i is O(n^2). Once you have matched a window [l, r) against the prefix, what do you already know about positions inside it?",
    "Keep the rightmost window [l, r) that matches a prefix. For i < r, start z[i] at min(r - i, z[i - l]); then extend by direct comparison and move the window if you pass r.",
    "z = [0] * n; l = 0; r = 0\nfor i from 1 to n - 1:\n  if i < r: z[i] = min(r - i, z[i - l])\n  while i + z[i] < n and s[z[i]] == s[i + z[i]]: z[i] += 1\n  if i + z[i] > r: l = i; r = i + z[i]\nreturn z",
  ],
  reference: `function zFunction(s) { const n = s.length, z = new Array(n).fill(0); let l = 0, r = 0; for (let i = 1; i < n; i++) { if (i < r) z[i] = Math.min(r - i, z[i - l]); while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++; if (i + z[i] > r) { l = i; r = i + z[i]; } } return z; }`,
  brute: `function zFunction(s) { return Array.from(s, (_, i) => { if (i === 0) return 0; let k = 0; while (i + k < s.length && s[k] === s[i + k]) k++; return k; }); }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "ab")];`),
  examples: [["aabxaab"], ["abacaba"]],
  edges: [
    ["single-char", ["a"]],
    ["all-equal", ["aaaa"]],
    ["no-answer", ["abcd"], "No later position starts with 'a'."],
  ],
};

const lps: ProblemDef = {
  slug: "kmp-algorithm-or-lps-array",
  title: "KMP: Build the LPS Array",
  difficulty: "Hard",
  pattern: "Strings: Pattern Matching",
  url: tuf("kmp-algorithm-or-lps-array"),
  statement: "Return the **LPS array** of `s` used by the KMP algorithm: `lps[i]` is the length of the longest proper prefix of `s[0..i]` that is also a suffix of `s[0..i]`. Aim for O(n).",
  constraints: ["1 <= s.length <= 10^5"],
  fn: "computeLPS",
  params: [["s", "string"]],
  returns: "number[]",
  hints: [
    "If the border of s[0..i-1] has length k and s[i] == s[k], the border grows to k + 1. What if they differ?",
    "On a mismatch, fall back to the next shorter border, k = lps[k - 1], and try again; stop at k = 0. Each step either extends or shrinks k, so the total work is linear.",
    "lps = [0] * n; k = 0\nfor i from 1 to n - 1:\n  while k > 0 and s[i] != s[k]: k = lps[k - 1]\n  if s[i] == s[k]: k += 1\n  lps[i] = k\nreturn lps",
  ],
  reference: `function computeLPS(s) { const n = s.length, l = new Array(n).fill(0); let k = 0; for (let i = 1; i < n; i++) { while (k > 0 && s[i] !== s[k]) k = l[k - 1]; if (s[i] === s[k]) k++; l[i] = k; } return l; }`,
  brute: `function computeLPS(s) { return Array.from(s, (_, i) => { const t = s.slice(0, i + 1); for (let k = i; k > 0; k--) if (t.slice(0, k) === t.slice(t.length - k)) return k; return 0; }); }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "ab")];`),
  examples: [["aabaaab"], ["abcabcd"]],
  edges: [
    ["single-char", ["a"]],
    ["all-equal", ["aaaa"]],
    ["no-answer", ["abcd"]],
  ],
};

const primes: ProblemDef = {
  slug: "print-all-primes-till-n",
  title: "All Primes up to N",
  difficulty: "Medium",
  pattern: "Math",
  url: tuf("print-all-primes-till-n"),
  statement: "Return every prime number `<= n` in increasing order. Aim for the Sieve of Eratosthenes.",
  constraints: ["1 <= n <= 10^6"],
  fn: "primesUpTo",
  params: [["n", "number"]],
  returns: "number[]",
  hints: [
    "Testing each number by trial division repeats a lot of work. What if each prime crossed out its own multiples?",
    "Sieve: mark all numbers from 2 as prime; for each p with p * p <= n that's still marked, cross out p * p, p * p + p, ... Collect what stays marked.",
    "isPrime = [true] * (n + 1); isPrime[0] = isPrime[1] = false\nfor p from 2 while p * p <= n:\n  if isPrime[p]:\n    for m from p * p to n step p: isPrime[m] = false\nreturn every i with isPrime[i]",
  ],
  reference: `function primesUpTo(n) { const ok = new Uint8Array(n + 1).fill(1); ok[0] = 0; if (n >= 1) ok[1] = 0; for (let p = 2; p * p <= n; p++) if (ok[p]) for (let m = p * p; m <= n; m += p) ok[m] = 0; const out = []; for (let i = 2; i <= n; i++) if (ok[i]) out.push(i); return out; }`,
  brute: `function primesUpTo(n) { const out = []; for (let i = 2; i <= n; i++) { let p = true; for (let d = 2; d * d <= i; d++) if (i % d === 0) { p = false; break; } if (p) out.push(i); } return out; }`,
  fuzz: gen(`return [__r(rand, 1, 200)];`),
  examples: [[10], [30]],
  edges: [
    ["boundary", [1], "No primes up to 1."],
    ["min-size", [2]],
    ["large", [1000]],
  ],
};

const primeFactors: ProblemDef = {
  slug: "prime-factorisation-of-a-number",
  title: "Prime Factorisation",
  difficulty: "Medium",
  pattern: "Math",
  url: tuf("prime-factorisation-of-a-number"),
  statement: "Return the prime factorisation of `n` as a list of primes in increasing order, each repeated as many times as it divides `n`. For `n = 1` return an empty list.",
  constraints: ["1 <= n <= 10^9"],
  fn: "primeFactorisation",
  params: [["n", "number"]],
  returns: "number[]",
  hints: [
    "If you divide out each factor as soon as you find it, which divisors can still divide what's left?",
    "Try d = 2, 3, 4, ... while d * d <= n, dividing n by d as long as it divides (composite d never divide by then). Whatever is left above 1 is one last prime.",
    "out = []; d = 2\nwhile d * d <= n:\n  while n % d == 0: out.add(d); n = n / d\n  d += 1\nif n > 1: out.add(n)\nreturn out",
  ],
  reference: `function primeFactorisation(n) { const out = []; for (let d = 2; d * d <= n; d++) while (n % d === 0) { out.push(d); n /= d; } if (n > 1) out.push(n); return out; }`,
  brute: `function primeFactorisation(n) { const out = []; let d = 2; while (n > 1) { if (n % d === 0) { out.push(d); n /= d; } else d++; } return out; }`,
  fuzz: gen(`return [__r(rand, 1, 5000)];`),
  examples: [[60], [97]],
  edges: [
    ["boundary", [1], "1 has no prime factors."],
    ["duplicates", [1024], "2 repeated ten times."],
    ["min-size", [2]],
  ],
};

export const A2Z_TRIES_MATH = [trie, completeString, distinctSubstrings, rabinKarp, zFunction, lps, primes, primeFactors].map(define);
