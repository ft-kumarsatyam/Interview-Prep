import { define, tuf, variant, type ProblemDef } from "./define";
import { arrayGen, gen } from "./gen";

const N: Array<[string, string]> = [["n", "number"]];
const NUM_GEN = gen(`return [__pick(rand, [__r(rand, 0, 9), __r(rand, 10, 9999), __r(rand, 10000, 2000000000)])];`);

const countDigits: ProblemDef = {
  slug: "count-all-digits-of-a-number",
  title: "Count All Digits of a Number",
  difficulty: "Easy",
  pattern: "Digit Extraction",
  url: tuf("count-all-digits-of-a-number"),
  statement: "Given a non-negative integer `n`, return how many digits it has. `0` has one digit.\n\nUse arithmetic (`% 10` and integer division) rather than converting to a string.",
  constraints: ["0 <= n <= 2 * 10^9"],
  fn: "countDigits",
  params: N,
  returns: "number",
  hints: [
    "Dividing by 10 and dropping the remainder removes the last digit. How many times can you do that before n becomes 0?",
    "Count loop iterations while n > 0, dividing by 10 each time. Handle n = 0 first: the loop never runs, but 0 still has one digit.",
    "if n == 0: return 1\ncount = 0\nwhile n > 0:\n  n = n / 10 rounded down\n  count += 1\nreturn count",
  ],
  reference: `function countDigits(n) { if (n === 0) return 1; let c = 0; while (n > 0) { n = Math.floor(n / 10); c++; } return c; }`,
  brute: `function countDigits(n) { return String(n).length; }`,
  fuzz: NUM_GEN,
  examples: [[12345], [7]],
  edges: [
    ["zeros", [0], "0 has one digit even though the loop never runs."],
    ["boundary", [1000], "Trailing zeros are digits too."],
    ["large", [2000000000]],
  ],
};

const countOddDigits: ProblemDef = {
  slug: "count-number-of-odd-digits-in-a-number",
  title: "Count Odd Digits in a Number",
  difficulty: "Easy",
  pattern: "Digit Extraction",
  url: tuf("count-number-of-odd-digits-in-a-number"),
  statement: "Given a non-negative integer `n`, return how many of its digits are odd.",
  constraints: ["0 <= n <= 2 * 10^9"],
  fn: "countOddDigits",
  params: N,
  returns: "number",
  hints: [
    "`n % 10` is the last digit. How do you visit every digit one by one?",
    "Repeatedly take d = n % 10, count it when d is odd, then drop it with n = floor(n / 10).",
    "count = 0\nwhile n > 0:\n  d = n mod 10\n  if d is odd: count += 1\n  n = n / 10 rounded down\nreturn count",
  ],
  reference: `function countOddDigits(n) { let c = 0; while (n > 0) { if ((n % 10) % 2 === 1) c++; n = Math.floor(n / 10); } return c; }`,
  brute: `function countOddDigits(n) { return String(n).split("").filter((d) => "13579".includes(d)).length; }`,
  fuzz: NUM_GEN,
  examples: [[5381], [2468]],
  edges: [
    ["zeros", [0], "0 is even, so the answer is 0."],
    ["single", [7]],
    ["all-equal", [99999]],
  ],
};

const largestDigit: ProblemDef = {
  slug: "return-the-largest-digit-in-a-number",
  title: "Largest Digit in a Number",
  difficulty: "Easy",
  pattern: "Digit Extraction",
  url: tuf("return-the-largest-digit-in-a-number"),
  statement: "Given a non-negative integer `n`, return its largest digit.",
  constraints: ["0 <= n <= 2 * 10^9"],
  fn: "largestDigit",
  params: N,
  returns: "number",
  hints: [
    "Visit the digits one at a time with % 10. What do you keep while you go?",
    "Keep the best digit seen so far, starting at 0, and compare each extracted digit against it.",
    "best = 0\nwhile n > 0:\n  best = max(best, n mod 10)\n  n = n / 10 rounded down\nreturn best",
  ],
  reference: `function largestDigit(n) { let b = 0; while (n > 0) { b = Math.max(b, n % 10); n = Math.floor(n / 10); } return b; }`,
  brute: `function largestDigit(n) { return Math.max(...String(n).split("").map(Number)); }`,
  fuzz: NUM_GEN,
  examples: [[25619], [4004]],
  edges: [
    ["zeros", [0]],
    ["single", [8]],
    ["boundary", [9000000], "The largest digit is the first one."],
  ],
};

const factorial: ProblemDef = {
  slug: "factorial-of-a-given-number-i",
  title: "Factorial of a Number",
  difficulty: "Easy",
  pattern: "Accumulator",
  url: tuf("factorial-of-a-given-number-i"),
  statement: "Given a non-negative integer `n`, return `n!` (the product `1 * 2 * ... * n`). By definition `0! = 1`.",
  constraints: ["0 <= n <= 18"],
  fn: "factorial",
  params: N,
  returns: "number",
  hints: [
    "A factorial is a running product. What should the product start at so that 0! comes out right?",
    "Start with result = 1 and multiply it by every integer from 2 to n.",
    "result = 1\nfor i from 2 to n:\n  result = result * i\nreturn result",
  ],
  reference: `function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }`,
  brute: `function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }`,
  fuzz: gen(`return [__r(rand, 0, 18)];`),
  examples: [[5], [3]],
  edges: [
    ["zeros", [0], "0! is 1 by definition."],
    ["single", [1]],
    ["extremes", [18], "18! still fits exactly in a JavaScript number."],
  ],
};

const armstrong: ProblemDef = {
  slug: "armstrong-number",
  title: "Armstrong Number",
  difficulty: "Easy",
  pattern: "Digit Extraction",
  url: tuf("check-if-the-number-if-armstrong"),
  statement: "A positive integer with `k` digits is an **Armstrong number** when the sum of each digit raised to the power `k` equals the number itself. For example `153 = 1^3 + 5^3 + 3^3`.\n\nGiven `n`, return `true` if it is an Armstrong number, otherwise `false`.",
  constraints: ["1 <= n <= 10^8"],
  fn: "isArmstrong",
  params: N,
  returns: "boolean",
  hints: [
    "You need two passes over the digits: one to know how many there are, one to add up the powers.",
    "Count the digits k first. Then extract each digit with % 10, add digit^k to a sum, and compare the sum with the original n.",
    "k = number of digits of n\nsum = 0, m = n\nwhile m > 0:\n  sum += (m mod 10) ^ k\n  m = m / 10 rounded down\nreturn sum == n",
  ],
  reference: `function isArmstrong(n) { let k = 0; for (let m = n; m > 0; m = Math.floor(m / 10)) k++; let s = 0; for (let m = n; m > 0; m = Math.floor(m / 10)) s += (m % 10) ** k; return s === n; }`,
  brute: `function isArmstrong(n) { const d = String(n).split("").map(Number); return d.reduce((s, x) => s + Math.pow(x, d.length), 0) === n; }`,
  fuzz: gen(`return [__pick(rand, [153, 370, 371, 407, 1634, 8208, 9474, __r(rand, 1, 9), __r(rand, 10, 99999)])];`),
  examples: [[153], [123]],
  edges: [
    ["single", [7], "Every single-digit number is an Armstrong number (d^1 = d)."],
    ["boundary", [9474], "The power is the digit count, 4 here, not 3."],
    ["large", [24678050]],
  ],
};

const isPrime: ProblemDef = {
  slug: "check-for-prime-number",
  title: "Check for Prime Number",
  difficulty: "Easy",
  pattern: "Math",
  url: tuf("check-for-prime-number"),
  statement: "Given an integer `n`, return `true` if it is prime (greater than 1 with no divisors other than 1 and itself), otherwise `false`.",
  constraints: ["1 <= n <= 10^9"],
  fn: "isPrime",
  params: N,
  returns: "boolean",
  hints: [
    "If n has a divisor bigger than sqrt(n), it also has one smaller than sqrt(n). How far must you check?",
    "Return false for n < 2. Then try every i from 2 while i * i <= n; any i that divides n proves it isn't prime.",
    "if n < 2: return false\ni = 2\nwhile i * i <= n:\n  if n mod i == 0: return false\n  i += 1\nreturn true",
  ],
  reference: `function isPrime(n) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }`,
  brute: `function isPrime(n) { if (n < 2) return false; if (n < 4) return true; if (n % 2 === 0) return false; for (let i = 3; i <= Math.sqrt(n) + 1 && i < n; i += 2) if (n % i === 0) return false; return true; }`,
  fuzz: gen(`return [__pick(rand, [__r(rand, 1, 100), __r(rand, 100, 100000), __r(rand, 1, 1000000000)])];`),
  examples: [[7], [12]],
  edges: [
    ["single", [1], "1 is not prime."],
    ["two", [2], "2 is the only even prime."],
    ["large", [999999937], "A large prime: checking every number up to n would be too slow."],
    ["boundary", [49], "A perfect square of a prime: the loop must include i = sqrt(n)."],
  ],
};

const gcd: ProblemDef = {
  slug: "gcd-of-two-numbers",
  title: "GCD of Two Numbers",
  difficulty: "Easy",
  pattern: "Math",
  url: tuf("gcd-of-two-numbers"),
  statement: "Given two positive integers `a` and `b`, return their greatest common divisor: the largest integer that divides both.",
  constraints: ["1 <= a, b <= 10^9"],
  fn: "gcd",
  params: [["a", "number"], ["b", "number"]],
  returns: "number",
  hints: [
    "Any common divisor of a and b also divides a mod b. Can you shrink the problem with that?",
    "Use Euclid's algorithm: replace (a, b) with (b, a mod b) until b is 0. Then a is the answer.",
    "while b != 0:\n  (a, b) = (b, a mod b)\nreturn a",
  ],
  reference: `function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }`,
  brute: `function gcd(a, b) { while (a !== b) { if (a > b) a -= Math.floor((a - 1) / b) * b || a - b; else b -= Math.floor((b - 1) / a) * a || b - a; } return a; }`,
  fuzz: gen(`const g = __r(rand, 1, 50); return [g * __r(rand, 1, 1000), g * __r(rand, 1, 1000)];`),
  examples: [[12, 18], [7, 13]],
  edges: [
    ["all-equal", [9, 9]],
    ["single", [1, 1000000000]],
    ["large", [999999000, 1000000000]],
  ],
};

const lcm: ProblemDef = {
  slug: "lcm-of-two-numbers",
  title: "LCM of Two Numbers",
  difficulty: "Easy",
  pattern: "Math",
  url: tuf("lcm-of-two-numbers"),
  statement: "Given two positive integers `a` and `b`, return their least common multiple: the smallest positive integer divisible by both.",
  constraints: ["1 <= a, b <= 10^6"],
  fn: "lcm",
  params: [["a", "number"], ["b", "number"]],
  returns: "number",
  hints: [
    "How are the LCM and the GCD of two numbers related?",
    "lcm(a, b) = a / gcd(a, b) * b. Divide before multiplying so the intermediate value stays small.",
    "g = gcd(a, b) using Euclid\nreturn (a / g) * b",
  ],
  reference: `function lcm(a, b) { let x = a, y = b; while (y) { [x, y] = [y, x % y]; } return (a / x) * b; }`,
  brute: `function lcm(a, b) { let m = Math.max(a, b); const step = m; while (m % a !== 0 || m % b !== 0) m += step; return m; }`,
  fuzz: gen(`return [__r(rand, 1, 300), __r(rand, 1, 300)];`),
  examples: [[4, 6], [3, 7]],
  edges: [
    ["all-equal", [5, 5]],
    ["single", [1, 9]],
    ["large", [999983, 999979], "Two large primes: the LCM is their product."],
  ],
};

const divisors: ProblemDef = {
  slug: "divisors-of-a-number",
  title: "Divisors of a Number",
  difficulty: "Easy",
  pattern: "Math",
  url: tuf("divisors-of-a-number"),
  statement: "Given a positive integer `n`, return all of its divisors in increasing order.",
  constraints: ["1 <= n <= 10^9"],
  fn: "divisors",
  params: N,
  returns: "number[]",
  hints: [
    "Divisors pair up as (i, n / i). How far do you need to loop to find every pair?",
    "Loop i while i * i <= n. When i divides n, keep i and n / i (once if they're equal). Sort at the end, or collect the large halves separately and reverse them.",
    "small = [], large = []\ni = 1\nwhile i * i <= n:\n  if n mod i == 0:\n    add i to small\n    if i != n / i: add n / i to large\n  i += 1\nreturn small followed by large reversed",
  ],
  reference: `function divisors(n) { const s = [], l = []; for (let i = 1; i * i <= n; i++) if (n % i === 0) { s.push(i); if (i !== n / i) l.push(n / i); } return s.concat(l.reverse()); }`,
  brute: `function divisors(n) { const out = []; for (let i = 1; i <= Math.min(n, 100000); i++) if (n % i === 0) out.push(i); for (const d of out.slice()) { const o = n / d; if (o > 100000 && !out.includes(o)) out.push(o); } return out.sort((a, b) => a - b); }`,
  fuzz: gen(`return [__pick(rand, [__r(rand, 1, 200), __r(rand, 200, 100000), __r(rand, 1, 1000000000)])];`),
  examples: [[12], [7]],
  edges: [
    ["single", [1]],
    ["boundary", [36], "A perfect square: 6 must appear once."],
    ["large", [735134400], "Many divisors and too large for a loop up to n."],
  ],
};

const countOdd: ProblemDef = {
  slug: "count-of-odd-numbers-in-array",
  title: "Count Odd Numbers in an Array",
  difficulty: "Easy",
  pattern: "Counting",
  url: tuf("count-of-odd-numbers-in-array"),
  statement: "Given an integer array `nums`, return how many of its elements are odd. Negative numbers can be odd too.",
  constraints: ["0 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  fn: "countOdd",
  params: [["nums", "number[]"]],
  returns: "number",
  hints: [
    "Visit every element once. What test tells you a number is odd, including negative ones?",
    "Count elements with x % 2 !== 0. In JavaScript -3 % 2 is -1, so comparing with 1 misses negatives.",
    "count = 0\nfor each x in nums:\n  if x mod 2 != 0: count += 1\nreturn count",
  ],
  reference: `function countOdd(nums) { let c = 0; for (const x of nums) if (x % 2 !== 0) c++; return c; }`,
  brute: `function countOdd(nums) { return nums.filter((x) => Math.abs(x) % 2 === 1).length; }`,
  fuzz: arrayGen(0, 20, -50, 50),
  examples: [[[1, 2, 3, 4, 5]], [[2, 4, 6]]],
  edges: [
    ["negatives", [[-3, -2, -1]], "-3 % 2 is -1 in JavaScript, not 1."],
    ["empty", [[]]],
    ["zeros", [[0, 0, 7]]],
  ],
};

const secondFrequent: ProblemDef = {
  slug: "second-highest-occurring-element",
  title: "Second Highest Occurring Element",
  difficulty: "Easy",
  pattern: "HashMap",
  url: tuf("second-highest-occurring-element"),
  statement: "Given an integer array `nums`, find the element whose frequency is the **second highest distinct frequency** in the array. If several elements share that frequency, return the smallest of them. If every element has the same frequency, return `-1`.",
  constraints: ["1 <= nums.length <= 10^4", "1 <= nums[i] <= 10^4"],
  fn: "secondMostFrequent",
  params: [["nums", "number[]"]],
  returns: "number",
  hints: [
    "First count how often each value appears. Then the question is about frequencies, not values.",
    "Find the highest frequency f1, then the largest frequency f2 strictly below f1. Return the smallest value with frequency f2, or -1 if no f2 exists.",
    "count each value in a map\nf1 = max frequency\nf2 = max frequency that is < f1 (none if absent)\nif no f2: return -1\nreturn smallest value whose count == f2",
  ],
  reference: `function secondMostFrequent(nums) { const m = new Map(); for (const x of nums) m.set(x, (m.get(x) || 0) + 1); let f1 = 0; for (const c of m.values()) f1 = Math.max(f1, c); let f2 = 0; for (const c of m.values()) if (c < f1) f2 = Math.max(f2, c); if (!f2) return -1; let best = Infinity; for (const [v, c] of m) if (c === f2 && v < best) best = v; return best; }`,
  brute: `function secondMostFrequent(nums) { const vals = [...new Set(nums)]; const cnt = (v) => nums.filter((x) => x === v).length; const fs = [...new Set(vals.map(cnt))].sort((a, b) => b - a); if (fs.length < 2) return -1; return Math.min(...vals.filter((v) => cnt(v) === fs[1])); }`,
  fuzz: arrayGen(1, 15, 1, 5),
  examples: [[[1, 2, 2, 3, 3, 3]], [[4, 4, 5, 5, 6]]],
  edges: [
    ["all-equal", [[7, 7, 7]], "Only one distinct frequency: return -1."],
    ["single", [[9]]],
    ["duplicates", [[5, 1, 1, 2, 2, 3, 3, 3]], "Two values share the second frequency: return the smaller."],
  ],
};

const sumHighLow: ProblemDef = {
  slug: "sum-of-highest-and-lowest-frequency",
  title: "Sum of Highest and Lowest Frequency",
  difficulty: "Easy",
  pattern: "HashMap",
  url: tuf("sum-of-highest-and-lowest-frequency"),
  statement: "Given an integer array `nums`, return the sum of the highest frequency and the lowest frequency of any element in it.",
  constraints: ["1 <= nums.length <= 10^4", "1 <= nums[i] <= 10^4"],
  fn: "sumHighestLowestFreq",
  params: [["nums", "number[]"]],
  returns: "number",
  hints: [
    "Count each value's frequency first. Then you only care about the counts.",
    "Build a frequency map, then take the max and the min over its values and add them.",
    "count each value in a map\nreturn max of counts + min of counts",
  ],
  reference: `function sumHighestLowestFreq(nums) { const m = new Map(); for (const x of nums) m.set(x, (m.get(x) || 0) + 1); let hi = 0, lo = Infinity; for (const c of m.values()) { hi = Math.max(hi, c); lo = Math.min(lo, c); } return hi + lo; }`,
  brute: `function sumHighestLowestFreq(nums) { const cs = [...new Set(nums)].map((v) => nums.filter((x) => x === v).length); return Math.max(...cs) + Math.min(...cs); }`,
  fuzz: arrayGen(1, 15, 1, 6),
  examples: [[[1, 2, 2, 3, 3, 3]], [[5, 5, 6]]],
  edges: [
    ["single", [[4]], "One value: it is both the most and least frequent, so the frequency counts twice."],
    ["all-equal", [[2, 2, 2, 2]]],
    ["duplicates", [[1, 1, 2, 2, 3, 3]]],
  ],
};

const sumFirstN: ProblemDef = {
  slug: "sum-of-first-n-numbers",
  title: "Sum of First N Numbers (Recursion)",
  difficulty: "Easy",
  pattern: "Recursion",
  url: tuf("sum-of-first-n-numbers"),
  statement: "Given a non-negative integer `n`, return `1 + 2 + ... + n` using **recursion** (no loop and no formula). The sum for `n = 0` is `0`.",
  constraints: ["0 <= n <= 1000"],
  fn: "sumOfFirstN",
  params: N,
  returns: "number",
  hints: [
    "Express the sum for n using the sum for a smaller number.",
    "sum(n) = n + sum(n - 1), and the recursion stops at the base case sum(0) = 0.",
    "sumOfFirstN(n):\n  if n == 0: return 0\n  return n + sumOfFirstN(n - 1)",
  ],
  reference: `function sumOfFirstN(n) { return n === 0 ? 0 : n + sumOfFirstN(n - 1); }`,
  brute: `function sumOfFirstN(n) { return (n * (n + 1)) / 2; }`,
  fuzz: gen(`return [__r(rand, 0, 1000)];`),
  examples: [[5], [10]],
  edges: [
    ["zeros", [0], "The base case: nothing to add."],
    ["single", [1]],
    ["large", [1000]],
  ],
};

const factorialRec = variant(factorial, {
  slug: "factorial-of-a-given-number-ii",
  title: "Factorial of a Number (Recursion)",
  pattern: "Recursion",
  url: tuf("factorial-of-a-given-number-ii"),
  statement: "Given a non-negative integer `n`, return `n!` using **recursion**: `n! = n * (n - 1)!` and `0! = 1`.",
  hints: [
    "Write n! in terms of a smaller factorial. Where does the recursion stop?",
    "factorial(n) = n * factorial(n - 1), with factorial(0) = 1 as the base case. Returning 0 at the base would make every answer 0.",
    "factorial(n):\n  if n <= 1: return 1\n  return n * factorial(n - 1)",
  ],
  reference: `function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }`,
  brute: `function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }`,
});

const primeRec = variant(isPrime, {
  slug: "check-if-a-number-is-prime-or-not",
  title: "Check if a Number is Prime (Recursion)",
  pattern: "Recursion",
  url: tuf("check-if-a-number-is-prime-or-not"),
  statement: "Given an integer `n`, return `true` if it is prime, otherwise `false`. Try writing the divisor check as a **recursive** helper `check(n, i)` that tests divisor `i` and recurses on `i + 1` while `i * i <= n`.",
  hints: [
    "A loop over divisors can become a function that handles one divisor and calls itself for the next.",
    "check(n, i): if i * i > n, no divisor was found, so return true; if n % i == 0 return false; otherwise return check(n, i + 1). Call it with i = 2 after ruling out n < 2.",
    "check(n, i):\n  if i * i > n: return true\n  if n mod i == 0: return false\n  return check(n, i + 1)\nif n < 2: return false\nreturn check(n, 2)",
  ],
  edges: [
    ["single", [1], "1 is not prime."],
    ["two", [2], "2 is the only even prime."],
    ["boundary", [49], "A perfect square of a prime: the check must include i = sqrt(n)."],
    ["large", [999983]],
  ],
});

const sumDigits: ProblemDef = {
  slug: "sum-of-digits-in-a-given-number",
  title: "Sum of Digits (Recursion)",
  difficulty: "Easy",
  pattern: "Recursion",
  url: tuf("sum-of-digits-in-a-given-number"),
  statement: "Given a non-negative integer `n`, return the sum of its digits. Try solving it **recursively**: the digit sum of `n` is its last digit plus the digit sum of the rest.",
  constraints: ["0 <= n <= 2 * 10^9"],
  fn: "sumOfDigits",
  params: N,
  returns: "number",
  hints: [
    "n % 10 is the last digit and floor(n / 10) is everything before it.",
    "sumOfDigits(n) = n % 10 + sumOfDigits(floor(n / 10)), stopping at n = 0.",
    "sumOfDigits(n):\n  if n == 0: return 0\n  return (n mod 10) + sumOfDigits(n / 10 rounded down)",
  ],
  reference: `function sumOfDigits(n) { return n === 0 ? 0 : (n % 10) + sumOfDigits(Math.floor(n / 10)); }`,
  brute: `function sumOfDigits(n) { return String(n).split("").reduce((s, d) => s + Number(d), 0); }`,
  fuzz: NUM_GEN,
  examples: [[1234], [9005]],
  edges: [
    ["zeros", [0]],
    ["single", [7]],
    ["large", [1999999999]],
  ],
};

export const A2Z_BASICS = [
  countDigits, countOddDigits, largestDigit, factorial, armstrong, isPrime, gcd, lcm, divisors, countOdd,
  secondFrequent, sumHighLow, sumFirstN, factorialRec, primeRec, sumDigits,
].map(define);
