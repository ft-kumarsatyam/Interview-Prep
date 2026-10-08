/** Blind solutions for the seeded problems the Strings Ladder judges (scripts/dsa-testcases/specs/ladder-strings-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "length-of-last-word": `function lengthOfLastWord(s) {
  var parts = s.trim().split(" ");
  return parts[parts.length - 1].length;
}`,
  "isomorphic-strings": `function isIsomorphic(s, t) {
  for (var i = 0; i < s.length; i++) if (s.indexOf(s[i]) !== t.indexOf(t[i])) return false;
  return true;
}`,
  "word-pattern": `function wordPattern(pattern, s) {
  var words = s.split(" ");
  if (words.length !== pattern.length) return false;
  for (var i = 0; i < words.length; i++) if (pattern.indexOf(pattern[i]) !== words.indexOf(words[i])) return false;
  return true;
}`,
  "longest-palindrome": `function longestPalindrome(s) {
  var odd = {};
  for (var i = 0; i < s.length; i++) odd[s[i]] = !odd[s[i]];
  var odds = 0;
  for (var k in odd) if (odd[k]) odds++;
  return odds ? s.length - odds + 1 : s.length;
}`,
  "ransom-note": `function canConstruct(ransomNote, magazine) {
  var a = ransomNote.split("").sort(), b = magazine.split("").sort();
  var j = 0;
  for (var i = 0; i < a.length; i++) {
    while (j < b.length && b[j] < a[i]) j++;
    if (j >= b.length || b[j] !== a[i]) return false;
    j++;
  }
  return true;
}`,
  "sort-characters-by-frequency": `function frequencySort(s) {
  var count = {};
  for (var i = 0; i < s.length; i++) count[s[i]] = (count[s[i]] || 0) + 1;
  var buckets = [];
  for (var ch in count) (buckets[count[ch]] = buckets[count[ch]] || []).push(ch);
  var out = "";
  for (var f = buckets.length - 1; f > 0; f--) if (buckets[f]) for (var j = 0; j < buckets[f].length; j++) out += buckets[f][j].repeat(f);
  return out;
}`,
  "determine-if-two-strings-are-close": `function closeStrings(word1, word2) {
  if (word1.length !== word2.length) return false;
  var sig = function (w) {
    var m = {};
    for (var i = 0; i < w.length; i++) m[w[i]] = (m[w[i]] || 0) + 1;
    return [Object.keys(m).sort().join(""), Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a - b; }).join(",")];
  };
  var a = sig(word1), b = sig(word2);
  return a[0] === b[0] && a[1] === b[1];
}`,
  "minimum-number-of-steps-to-make-two-strings-anagram": `function minSteps(s, t) {
  var a = s.split("").sort(), b = t.split("").sort();
  var i = 0, j = 0, common = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { common++; i++; j++; }
    else if (a[i] < b[j]) i++;
    else j++;
  }
  return s.length - common;
}`,
  "merge-strings-alternately": `function mergeAlternately(word1, word2) {
  var n = Math.min(word1.length, word2.length), out = [];
  for (var i = 0; i < n; i++) out.push(word1[i], word2[i]);
  return out.join("") + word1.slice(n) + word2.slice(n);
}`,
  "backspace-string-compare": `function backspaceCompare(s, t) {
  var typed = function (x) {
    var out = "";
    for (var i = 0; i < x.length; i++) out = x[i] === "#" ? out.slice(0, -1) : out + x[i];
    return out;
  };
  return typed(s) === typed(t);
}`,
  "reverse-words-in-a-string": `function reverseWords(s) {
  var words = s.split(" ").filter(function (w) { return w.length > 0; });
  var out = [];
  while (words.length) out.push(words.pop());
  return out.join(" ");
}`,
  "string-compression": `function compress(chars) {
  var res = [];
  var i = 0;
  while (i < chars.length) {
    var j = i;
    while (j < chars.length && chars[j] === chars[i]) j++;
    res.push(chars[i]);
    if (j - i > 1) res.push.apply(res, String(j - i).split(""));
    i = j;
  }
  for (var k = 0; k < res.length; k++) chars[k] = res[k];
  return res.length;
}`,
  "rotate-string": `function rotateString(s, goal) {
  if (s.length !== goal.length) return false;
  var cur = s;
  for (var i = 0; i <= s.length; i++) {
    if (cur === goal) return true;
    cur = cur.slice(1) + cur[0];
  }
  return false;
}`,
  "find-the-index-of-the-first-occurrence-in-a-string": `function strStr(haystack, needle) {
  for (var i = 0; i + needle.length <= haystack.length; i++) if (haystack.substr(i, needle.length) === needle) return i;
  return -1;
}`,
  "integer-to-roman": `function intToRoman(num) {
  var digits = [["I", "V", "X"], ["X", "L", "C"], ["C", "D", "M"], ["M", "", ""]];
  var out = "", place = 0;
  while (num > 0) {
    var d = num % 10, u = digits[place][0], f = digits[place][1], t = digits[place][2];
    var part = d === 9 ? u + t : d >= 5 ? f + u.repeat(d - 5) : d === 4 ? u + f : u.repeat(d);
    out = part + out;
    num = Math.floor(num / 10);
    place++;
  }
  return out;
}`,
  "string-to-integer-atoi": `function myAtoi(s) {
  var i = 0;
  while (i < s.length && s[i] === " ") i++;
  var neg = false;
  if (s[i] === "-" || s[i] === "+") { neg = s[i] === "-"; i++; }
  var digits = "";
  while (i < s.length && "0123456789".indexOf(s[i]) >= 0) digits += s[i++];
  digits = digits.replace(/^0+/, "");
  if (!digits) return 0;
  if (digits.length > 11) return neg ? -2147483648 : 2147483647;
  var v = Number(digits) * (neg ? -1 : 1);
  return Math.max(-2147483648, Math.min(2147483647, v));
}`,
  "count-and-say": `function countAndSay(n) {
  if (n === 1) return "1";
  var prev = countAndSay(n - 1), out = "", run = 1;
  for (var i = 1; i <= prev.length; i++) {
    if (prev[i] === prev[i - 1]) run++;
    else { out += run + prev[i - 1]; run = 1; }
  }
  return out;
}`,
  "multiply-strings": `function multiply(num1, num2) {
  if (num1 === "0" || num2 === "0") return "0";
  var add = function (a, b) {
    var out = "", carry = 0, i = a.length - 1, j = b.length - 1;
    while (i >= 0 || j >= 0 || carry) {
      var s = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + carry;
      out = (s % 10) + out;
      carry = Math.floor(s / 10);
    }
    return out;
  };
  var total = "0";
  for (var j = num2.length - 1; j >= 0; j--) {
    var d = +num2[j], row = "0";
    for (var k = 0; k < d; k++) row = add(row, num1);
    total = add(total, row + "0".repeat(num2.length - 1 - j));
  }
  return total.replace(/^0+(?=\\d)/, "");
}`,
  "remove-all-adjacent-duplicates-in-string": `function removeDuplicates(s) {
  var a = s.split(""), w = 0;
  for (var i = 0; i < a.length; i++) {
    a[w] = a[i];
    if (w > 0 && a[w] === a[w - 1]) w--;
    else w++;
  }
  return a.slice(0, w).join("");
}`,
  "removing-stars-from-a-string": `function removeStars(s) {
  var out = "", skip = 0;
  for (var i = s.length - 1; i >= 0; i--) {
    if (s[i] === "*") skip++;
    else if (skip) skip--;
    else out = s[i] + out;
  }
  return out;
}`,
  "minimum-add-to-make-parentheses-valid": `function minAddToMakeValid(s) {
  var stack = [];
  for (var i = 0; i < s.length; i++) {
    if (s[i] === ")" && stack.length && stack[stack.length - 1] === "(") stack.pop();
    else stack.push(s[i]);
  }
  return stack.length;
}`,
  "maximum-number-of-vowels-in-a-substring-of-given-length": `function maxVowels(s, k) {
  var pre = [0];
  for (var i = 0; i < s.length; i++) pre.push(pre[i] + ("aeiou".indexOf(s[i]) >= 0 ? 1 : 0));
  var best = 0;
  for (var j = k; j <= s.length; j++) best = Math.max(best, pre[j] - pre[j - k]);
  return best;
}`,
  "number-of-substrings-containing-all-three-characters": `function numberOfSubstrings(s) {
  var count = { a: 0, b: 0, c: 0 }, l = 0, total = 0;
  for (var r = 0; r < s.length; r++) {
    count[s[r]]++;
    while (count.a && count.b && count.c) { total += s.length - r; count[s[l++]]--; }
  }
  return total;
}`,
  "longest-palindromic-substring": `function longestPalindrome(s) {
  var n = s.length, dp = [], start = 0, len = 1;
  for (var i = 0; i < n; i++) dp.push(new Array(n).fill(false));
  for (var L = 1; L <= n; L++) {
    for (var i2 = 0; i2 + L <= n; i2++) {
      var j = i2 + L - 1;
      dp[i2][j] = s[i2] === s[j] && (L <= 2 || dp[i2 + 1][j - 1]);
      if (dp[i2][j] && L > len) { len = L; start = i2; }
    }
  }
  return s.substr(start, len);
}`,
  "palindromic-substrings": `function countSubstrings(s) {
  var n = s.length, dp = [], count = 0;
  for (var i = 0; i < n; i++) dp.push(new Array(n).fill(false));
  for (var i2 = n - 1; i2 >= 0; i2--) {
    for (var j = i2; j < n; j++) {
      dp[i2][j] = s[i2] === s[j] && (j - i2 < 2 || dp[i2 + 1][j - 1]);
      if (dp[i2][j]) count++;
    }
  }
  return count;
}`,
};
