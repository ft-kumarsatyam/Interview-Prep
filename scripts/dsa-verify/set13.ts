/** Blind solutions for the seeded problems the Bit Manipulation & Math Ladder judges (scripts/dsa-testcases/specs/ladder-bits-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "power-of-two": `function isPowerOfTwo(n) {
  if (n <= 0) return false;
  return n.toString(2).split("1").length === 2;
}`,
  "power-of-four": `function isPowerOfFour(n) {
  if (n <= 0) return false;
  var s = n.toString(4);
  return s[0] === "1" && s.slice(1).replace(/0/g, "") === "";
}`,
  "hamming-distance": `function hammingDistance(x, y) {
  var c = 0;
  while (x > 0 || y > 0) { if (x % 2 !== y % 2) c++; x = Math.floor(x / 2); y = Math.floor(y / 2); }
  return c;
}`,
  "minimum-bit-flips-to-convert-number": `function minBitFlips(start, goal) {
  var c = 0;
  while (start > 0 || goal > 0) { c += (start & 1) ^ (goal & 1); start = Math.floor(start / 2); goal = Math.floor(goal / 2); }
  return c;
}`,
  "reverse-bits": `function reverseBits(n) {
  var r = 0;
  for (var i = 0; i < 32; i++) { r = r * 2 + (n % 2); n = Math.floor(n / 2); }
  return r;
}`,
  "sort-integers-by-the-number-of-1-bits": `function sortByBits(arr) {
  function key(v) { var c = 0, x = v; while (x) { c += x & 1; x >>= 1; } return c * 100000 + v; }
  return arr.slice().sort(function (a, b) { return key(a) - key(b); });
}`,
  "find-the-difference": `function findTheDifference(s, t) {
  var sum = 0, i;
  for (i = 0; i < t.length; i++) sum += t.charCodeAt(i);
  for (i = 0; i < s.length; i++) sum -= s.charCodeAt(i);
  return String.fromCharCode(sum);
}`,
  "xor-queries-of-a-subarray": `function xorQueries(arr, queries) {
  var out = [];
  for (var q = 0; q < queries.length; q++) {
    var x = 0;
    for (var i = queries[q][0]; i <= queries[q][1]; i++) x ^= arr[i];
    out.push(x);
  }
  return out;
}`,
  "single-number-ii": `function singleNumber(nums) {
  var r = 0;
  for (var b = 0; b < 32; b++) {
    var c = 0;
    for (var i = 0; i < nums.length; i++) c += (nums[i] >> b) & 1;
    if (c % 3) r |= 1 << b;
  }
  return r;
}`,
  "single-number-iii": `function singleNumber(nums) {
  var s = nums.slice().sort(function (a, b) { return a - b; }), out = [], i = 0;
  while (i < s.length) {
    if (i + 1 < s.length && s[i] === s[i + 1]) i += 2;
    else { out.push(s[i]); i++; }
  }
  return out;
}`,
  "sum-of-two-integers": `function getSum(a, b) {
  var r = 0, carry = 0;
  for (var i = 0; i < 32; i++) {
    var x = (a >> i) & 1, y = (b >> i) & 1, s = x ^ y ^ carry;
    carry = (x & y) | (x & carry) | (y & carry);
    r |= s << i;
  }
  return r;
}`,
  "bitwise-and-of-numbers-range": `function rangeBitwiseAnd(left, right) {
  while (right > left) right = right & (right - 1);
  return right;
}`,
  "minimum-flips-to-make-a-or-b-equal-to-c": `function minFlips(a, b, c) {
  var f = 0;
  while (a || b || c) {
    var x = a % 2, y = b % 2, z = c % 2;
    if (z === 1) { if (x === 0 && y === 0) f++; } else f += x + y;
    a = Math.floor(a / 2); b = Math.floor(b / 2); c = Math.floor(c / 2);
  }
  return f;
}`,
  "count-primes": `function countPrimes(n) {
  if (n < 3) return 0;
  var odd = [], c = 1, i, j;
  for (i = 3; i < n; i += 2) odd[i] = true;
  for (i = 3; i * i < n; i += 2) if (odd[i]) for (j = i * i; j < n; j += 2 * i) odd[j] = false;
  for (i = 3; i < n; i += 2) if (odd[i]) c++;
  return c;
}`,
  "maximum-xor-of-two-numbers-in-an-array": `function findMaximumXOR(nums) {
  var root = {}, best = 0, i, b, node;
  for (i = 0; i < nums.length; i++) {
    node = root;
    for (b = 30; b >= 0; b--) { var bit = (nums[i] >> b) & 1; if (!node[bit]) node[bit] = {}; node = node[bit]; }
  }
  for (i = 0; i < nums.length; i++) {
    node = root; var x = 0;
    for (b = 30; b >= 0; b--) {
      var want = 1 - ((nums[i] >> b) & 1);
      if (node[want]) { x |= 1 << b; node = node[want]; } else node = node[1 - want];
    }
    if (x > best) best = x;
  }
  return best;
}`,
};
