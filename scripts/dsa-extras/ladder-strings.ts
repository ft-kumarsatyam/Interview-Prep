import { define, type ProblemDef } from "./define";
import { gen } from "./gen";

const S: Array<[string, string]> = [["s", "string"]];

const countVowels: ProblemDef = {
  slug: "count-vowels",
  title: "Count Vowels",
  difficulty: "Easy",
  pattern: "Counting",
  statement: "Given a string `s`, return how many of its characters are vowels.\n\nThe vowels are `a`, `e`, `i`, `o` and `u`, in either lowercase or uppercase. Every other character (consonants, digits, spaces, punctuation) does not count.",
  constraints: ["0 <= s.length <= 10^4", "s consists of printable ASCII characters"],
  fn: "countVowels",
  params: S,
  returns: "number",
  hints: [
    "Look at one character at a time. What question do you ask about each one?",
    "Keep a counter. For each character, check whether it is one of aeiou or AEIOU (a small set or string of vowels makes the check easy) and add 1 when it is.",
    "vowels = \"aeiouAEIOU\"\ncount = 0\nfor each ch in s:\n  if ch is in vowels:\n    count += 1\nreturn count",
  ],
  reference: `function countVowels(s) { let c = 0; for (const ch of s) if ("aeiouAEIOU".includes(ch)) c++; return c; }`,
  brute: `function countVowels(s) { return (s.match(/[aeiou]/gi) || []).length; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 0, 20), "abeiouxyzAEU 1!")];`),
  examples: [["hello world"], ["PrepOS"]],
  edges: [
    ["empty", [""], "No characters: the count is 0."],
    ["case-mix", ["AeIoU xyz"], "Uppercase vowels count too."],
    ["no-answer", ["rhythm"], "No vowels at all."],
    ["all-equal", ["aaaa"]],
  ],
};

const reverseStr: ProblemDef = {
  slug: "reverse-a-string",
  title: "Reverse a String",
  difficulty: "Easy",
  pattern: "Reverse Traversal",
  statement: "Given a string `s`, return a new string with its characters in reverse order.\n\nBuild the result with a loop instead of `split().reverse().join()`.",
  constraints: ["0 <= s.length <= 10^4"],
  fn: "reverseString",
  params: S,
  returns: "string",
  hints: [
    "Which character of s comes first in the answer?",
    "Walk s from the last index down to 0 and append each character to a result string.",
    "out = \"\"\nfor i from n - 1 down to 0:\n  out = out + s[i]\nreturn out",
  ],
  reference: `function reverseString(s) { let out = ""; for (let i = s.length - 1; i >= 0; i--) out += s[i]; return out; }`,
  brute: `function reverseString(s) { return s.split("").reverse().join(""); }`,
  fuzz: gen(`return [__str(rand, __r(rand, 0, 16), "abcxyz 12")];`),
  examples: [["hello"], ["PrepOS 2026"]],
  edges: [
    ["empty", [""]],
    ["single-char", ["a"]],
    ["all-equal", ["zzz"], "A string of one repeated character reads the same reversed."],
  ],
};

const isPalindrome: ProblemDef = {
  slug: "check-string-palindrome",
  title: "Check if a String is a Palindrome",
  difficulty: "Easy",
  pattern: "Palindrome",
  statement: "Given a string `s`, return `true` if it reads exactly the same forwards and backwards, otherwise `false`.\n\nCompare characters as they are: case, spaces and punctuation all matter here (`\"Aa\"` is not a palindrome).",
  constraints: ["0 <= s.length <= 10^4"],
  fn: "isPalindrome",
  params: S,
  returns: "boolean",
  hints: [
    "If s is a palindrome, how does its first character relate to its last?",
    "Compare s[i] with s[n - 1 - i] for every i in the first half. Any mismatch means false; reaching the middle means true.",
    "for i from 0 to n / 2 - 1:\n  if s[i] != s[n - 1 - i]:\n    return false\nreturn true",
  ],
  reference: `function isPalindrome(s) { for (let i = 0, j = s.length - 1; i < j; i++, j--) if (s[i] !== s[j]) return false; return true; }`,
  brute: `function isPalindrome(s) { return s === s.split("").reverse().join(""); }`,
  fuzz: gen(`const half = __str(rand, __r(rand, 0, 5), "abA"); const mid = __pick(rand, ["", "b", "c"]); const s = half + mid + half.split("").reverse().join(""); return [rand() < 0.4 ? s + __pick(rand, ["a", "x"]) : s];`),
  examples: [["racecar"], ["hello"]],
  edges: [
    ["empty", [""], "The empty string is a palindrome."],
    ["single-char", ["x"]],
    ["case-mix", ["Aa"], "Case matters: 'A' and 'a' are different characters."],
    ["two", ["aa"]],
  ],
};

const countChar: ProblemDef = {
  slug: "count-character-occurrences",
  title: "Count Occurrences of a Character",
  difficulty: "Easy",
  pattern: "Counting",
  statement: "Given a string `s` and a single character `c`, return how many times `c` appears in `s`. The match is case-sensitive.",
  constraints: ["0 <= s.length <= 10^4", "c.length == 1"],
  fn: "countChar",
  params: [["s", "string"], ["c", "string"]],
  returns: "number",
  hints: [
    "This is the counting pattern from arrays, applied to characters.",
    "Start a counter at 0 and add 1 for every index where s[i] equals c exactly.",
    "count = 0\nfor each ch in s:\n  if ch == c:\n    count += 1\nreturn count",
  ],
  reference: `function countChar(s, c) { let n = 0; for (const ch of s) if (ch === c) n++; return n; }`,
  brute: `function countChar(s, c) { return s.split(c).length - 1; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 0, 20), "abcA"), __pick(rand, ["a", "b", "A", "z"])];`),
  examples: [["banana", "a"], ["Mississippi", "s"]],
  edges: [
    ["empty", ["", "a"]],
    ["case-mix", ["AaAa", "a"], "Uppercase 'A' is a different character."],
    ["no-answer", ["hello", "z"]],
  ],
};

const toUpper: ProblemDef = {
  slug: "convert-to-uppercase",
  title: "Convert to Uppercase",
  difficulty: "Easy",
  pattern: "Character Codes",
  statement: "Given a string `s`, return it with every lowercase English letter (`a`-`z`) turned into its uppercase form. Every other character stays as it is.\n\nDo it with character codes (`charCodeAt` / `String.fromCharCode`) instead of `toUpperCase()`.",
  constraints: ["0 <= s.length <= 10^4", "s consists of printable ASCII characters"],
  fn: "toUpper",
  params: S,
  returns: "string",
  hints: [
    "Lowercase and uppercase letters sit in two runs of the ASCII table. How far apart are 'a' and 'A'?",
    "'a' is 97 and 'A' is 65, so subtract 32 from the code of any character between 97 and 122. Leave everything else untouched.",
    "out = \"\"\nfor each ch in s:\n  code = code of ch\n  if 97 <= code <= 122:\n    out += character for code - 32\n  else:\n    out += ch\nreturn out",
  ],
  reference: `function toUpper(s) { let out = ""; for (const ch of s) { const c = ch.charCodeAt(0); out += c >= 97 && c <= 122 ? String.fromCharCode(c - 32) : ch; } return out; }`,
  brute: `function toUpper(s) { return s.replace(/[a-z]/g, (m) => m.toUpperCase()); }`,
  fuzz: gen(`return [__str(rand, __r(rand, 0, 18), "abzAZ09 _-{")];`),
  examples: [["hello"], ["PrepOS v2!"]],
  edges: [
    ["empty", [""]],
    ["case-mix", ["aZ{`@"], "'{' and '`' sit right next to the letters in ASCII: only a-z change."],
    ["all-equal", ["ABC"], "Already uppercase: nothing changes."],
  ],
};

const countWords: ProblemDef = {
  slug: "count-words",
  title: "Count Words in a Sentence",
  difficulty: "Easy",
  pattern: "Traversal + State",
  statement: "Given a string `s` made of letters and spaces, return the number of words in it. A word is a maximal run of non-space characters.\n\nWords can be separated by more than one space, and `s` can start or end with spaces.",
  constraints: ["0 <= s.length <= 10^4", "s consists of English letters and spaces"],
  fn: "countWords",
  params: S,
  returns: "number",
  hints: [
    "Splitting on a single space breaks on double spaces. What marks the start of a new word instead?",
    "A word starts at a non-space character whose previous character is a space (or that is the first character). Count those starts.",
    "count = 0\nfor i from 0 to n - 1:\n  if s[i] != ' ' and (i == 0 or s[i - 1] == ' '):\n    count += 1\nreturn count",
  ],
  reference: `function countWords(s) { let c = 0; for (let i = 0; i < s.length; i++) if (s[i] !== " " && (i === 0 || s[i - 1] === " ")) c++; return c; }`,
  brute: `function countWords(s) { return s.split(" ").filter(Boolean).length; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 0, 20), "ab   ")];`),
  examples: [["the quick brown fox"], ["  hello   world  "]],
  edges: [
    ["empty", [""]],
    ["all-equal", ["     "], "Only spaces: there are no words."],
    ["single-char", ["a"]],
    ["boundary", ["word  "], "Trailing spaces don't start a word."],
  ],
};

const firstUnique: ProblemDef = {
  slug: "first-unique-character-in-a-string",
  title: "First Unique Character in a String",
  difficulty: "Easy",
  pattern: "Arrays & Hashing",
  leetcodeId: 387,
  fn: "firstUniqChar",
  params: S,
  returns: "number",
  hints: [
    "To know a character is unique you need to have seen the whole string. How many passes does that suggest?",
    "Pass one counts every character. Pass two walks s again and returns the first index whose count is 1, or -1 if none is.",
    "count = empty map\nfor each ch in s: count[ch] += 1\nfor i from 0 to n - 1:\n  if count[s[i]] == 1: return i\nreturn -1",
  ],
  reference: `function firstUniqChar(s) { const c = {}; for (const ch of s) c[ch] = (c[ch] || 0) + 1; for (let i = 0; i < s.length; i++) if (c[s[i]] === 1) return i; return -1; }`,
  brute: `function firstUniqChar(s) { for (let i = 0; i < s.length; i++) if (s.indexOf(s[i]) === s.lastIndexOf(s[i])) return i; return -1; }`,
  fuzz: gen(`return [__str(rand, __r(rand, 1, 14), "abcde")];`),
  examples: [["leetcode"], ["loveleetcode"]],
  edges: [
    ["no-answer", ["aabb"], "Every character repeats: return -1."],
    ["single-char", ["z"]],
    ["boundary", ["aabbc"], "The only unique character is the last one."],
  ],
};

export const LADDER_STRINGS = [countVowels, reverseStr, isPalindrome, countChar, toUpper, countWords, firstUnique].map(define);
