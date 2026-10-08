import { define, tuf, type ProblemDef } from "./define";
import { gen } from "./gen";

/**
 * Striver A2Z patterns 1-22. Printing can't be judged, so each pattern returns its rows as strings: no trailing
 * spaces, and characters are joined with nothing unless the statement says otherwise.
 */
interface PatternSpec {
  k: number;
  name: string;
  /** What row i looks like. */
  rule: string;
  /** JavaScript body of the reference (loops) and brute (repeat/map) solutions; `n` is the input. */
  ref: string;
  brute: string;
  hints: [string, string, string];
  maxN?: number;
  pattern?: string;
}

const L = "String.fromCharCode(65 + %)";
const letter = (expr: string) => L.replace("%", expr);

function patternDef(p: PatternSpec): ProblemDef {
  const maxN = p.maxN ?? 20;
  const fn = `pattern${p.k}`;
  return {
    slug: `pattern-${p.k}`,
    title: `Pattern ${p.k}: ${p.name}`,
    difficulty: "Easy",
    pattern: p.pattern ?? "Nested Loops",
    url: tuf(`pattern-${p.k}`),
    statement: `Given an integer \`n\`, build the pattern below and return it as an array of strings, one string per printed row.\n\n${p.rule}\n\nRows have **no trailing spaces**. Leading spaces are part of the row.`,
    constraints: [`1 <= n <= ${maxN}`],
    fn,
    params: [["n", "number"]],
    returns: "string[]",
    hints: p.hints,
    reference: `function ${fn}(n) { ${p.ref} }`,
    brute: `function ${fn}(n) { ${p.brute} }`,
    fuzz: gen(`return [__r(rand, 1, ${maxN})];`),
    examples: [[3], [4]],
    edges: [
      ["single", [1], "n = 1 is a single row."],
      ["two", [2]],
      ["large", [maxN]],
    ],
  };
}

const PATTERNS: PatternSpec[] = [
  {
    k: 1, name: "Square of Stars",
    rule: "Every one of the `n` rows has `n` stars. For `n = 3`: `***`, `***`, `***`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j < n; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, () => "*".repeat(n));`,
    hints: [
      "Patterns are two nested loops: the outer loop picks the row, the inner loop builds that row. How many stars does each row need here?",
      "The outer loop runs n times. For every row, the inner loop appends n stars to an empty string, then you push the string.",
      "rows = empty list\nfor i from 1 to n:\n  row = empty string\n  for j from 1 to n: row += '*'\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 2, name: "Right-Angled Triangle",
    rule: "Row `i` (1-based) has `i` stars. For `n = 3`: `*`, `**`, `***`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 0; j < i; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => "*".repeat(i + 1));`,
    hints: [
      "The row number tells you how many stars to print. How does the inner loop's bound depend on the outer loop?",
      "Let the inner loop run up to i, the current row number, instead of up to n.",
      "for i from 1 to n:\n  row = '*' repeated i times\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 3, name: "Right-Angled Number Triangle",
    rule: "Row `i` is the numbers `1` to `i` written together. For `n = 3`: `1`, `12`, `123`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 1; j <= i; j++) s += j; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => Array.from({ length: i + 1 }, (_, j) => j + 1).join(""));`,
    hints: [
      "Same shape as the star triangle, but each cell prints its column number instead of a star.",
      "In row i, the inner loop variable j runs from 1 to i; append j itself.",
      "for i from 1 to n:\n  row = empty string\n  for j from 1 to i: row += j\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 4, name: "Repeated Number Triangle",
    rule: "Row `i` is the number `i` written `i` times. For `n = 3`: `1`, `22`, `333`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 0; j < i; j++) s += i; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => String(i + 1).repeat(i + 1));`,
    hints: [
      "Compare with the number triangle: which loop variable should you print now, the row or the column?",
      "Print the row number i in every cell of row i, and row i has i cells.",
      "for i from 1 to n:\n  row = empty string\n  repeat i times: row += i\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 5, name: "Inverted Right Triangle",
    rule: "Row `i` (1-based) has `n - i + 1` stars. For `n = 3`: `***`, `**`, `*`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 0; j < n - i + 1; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => "*".repeat(n - i));`,
    hints: [
      "The rows shrink by one star each time. Write the star count of row i as a formula in n and i.",
      "Row i has n - i + 1 stars, so the inner loop bound is n - i + 1.",
      "for i from 1 to n:\n  row = '*' repeated (n - i + 1) times\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 6, name: "Inverted Number Triangle",
    rule: "Row `i` is the numbers `1` to `n - i + 1` written together. For `n = 3`: `123`, `12`, `1`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 1; j <= n - i + 1; j++) s += j; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => Array.from({ length: n - i }, (_, j) => j + 1).join(""));`,
    hints: [
      "Combine two earlier ideas: the inverted triangle's row length and the number triangle's cell value.",
      "Row i has n - i + 1 cells and cell j prints j.",
      "for i from 1 to n:\n  row = empty string\n  for j from 1 to n - i + 1: row += j\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 7, name: "Star Pyramid",
    rule: "Row `i` (1-based) has `n - i` leading spaces followed by `2i - 1` stars. For `n = 3`: `  *`, ` ***`, `*****`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 0; j < n - i; j++) s += " "; for (let j = 0; j < 2 * i - 1; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => " ".repeat(n - i - 1) + "*".repeat(2 * i + 1));`,
    hints: [
      "A pyramid row is two parts: spaces to push the stars to the middle, then the stars. How do both counts change from row to row?",
      "Spaces go down by one per row (n - i) while stars go up by two (2i - 1). Don't add spaces after the stars.",
      "for i from 1 to n:\n  row = ' ' repeated (n - i) times\n  row += '*' repeated (2i - 1) times\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 8, name: "Inverted Star Pyramid",
    rule: "Row `i` (0-based) has `i` leading spaces followed by `2(n - i) - 1` stars. For `n = 3`: `*****`, ` ***`, `  *`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j < i; j++) s += " "; for (let j = 0; j < 2 * (n - i) - 1; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => " ".repeat(i) + "*".repeat(2 * n - 2 * i - 1));`,
    hints: [
      "This is the pyramid upside down. The spaces now grow and the stars shrink.",
      "Row i (counting from 0) has i spaces and 2(n - i) - 1 stars.",
      "for i from 0 to n - 1:\n  row = ' ' repeated i times\n  row += '*' repeated (2(n - i) - 1) times\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 9, name: "Diamond",
    rule: "The star pyramid for `n` (pattern 7) followed by the inverted star pyramid for `n` (pattern 8), so `2n` rows in total. The widest row appears twice.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) rows.push(" ".repeat(n - i) + "*".repeat(2 * i - 1)); for (let i = 0; i < n; i++) rows.push(" ".repeat(i) + "*".repeat(2 * (n - i) - 1)); return rows;`,
    brute: `const up = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j < n - i - 1; j++) s += " "; for (let j = 0; j < 2 * i + 1; j++) s += "*"; up.push(s); } return up.concat(up.slice().reverse());`,
    hints: [
      "You've already built both halves separately. Can you reuse them?",
      "Print the pyramid rows, then the inverted pyramid rows. The inverted half is the pyramid read bottom to top.",
      "for i from 1 to n: add (n - i spaces + 2i - 1 stars)\nfor i from 0 to n - 1: add (i spaces + 2(n - i) - 1 stars)\nreturn rows",
    ],
  },
  {
    k: 10, name: "Half Diamond",
    rule: "`2n - 1` rows. Row `i` (1-based) has `i` stars while `i <= n`, then `2n - i` stars. For `n = 3`: `*`, `**`, `***`, `**`, `*`.",
    ref: `const rows = []; for (let i = 1; i <= 2 * n - 1; i++) { const stars = i <= n ? i : 2 * n - i; let s = ""; for (let j = 0; j < stars; j++) s += "*"; rows.push(s); } return rows;`,
    brute: `const up = Array.from({ length: n }, (_, i) => "*".repeat(i + 1)); return up.concat(up.slice(0, n - 1).reverse());`,
    hints: [
      "Use a single loop over all 2n - 1 rows. What's the star count before and after the middle row?",
      "stars = i for i <= n, else 2n - i. The middle row (i = n) is printed once.",
      "for i from 1 to 2n - 1:\n  stars = i if i <= n else 2n - i\n  add '*' repeated stars times\nreturn rows",
    ],
  },
  {
    k: 11, name: "Binary Number Triangle",
    rule: "Row `i` (0-based) has `i + 1` digits that alternate between `1` and `0`. Even rows start with `1`, odd rows with `0`. For `n = 4`: `1`, `01`, `101`, `0101`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) { let bit = i % 2 === 0 ? 1 : 0; let s = ""; for (let j = 0; j <= i; j++) { s += bit; bit = 1 - bit; } rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => Array.from({ length: i + 1 }, (_, j) => (i + j + 1) % 2).join(""));`,
    hints: [
      "Each row starts from a known digit and flips with every step. What decides the starting digit?",
      "Start with 1 on even rows and 0 on odd rows, then toggle the digit after every cell (bit = 1 - bit).",
      "for i from 0 to n - 1:\n  bit = 1 if i is even else 0\n  row = empty string\n  repeat i + 1 times:\n    row += bit\n    bit = 1 - bit\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 12, name: "Number Crown",
    rule: "Row `i` (1-based) is `1..i`, then `2(n - i)` spaces, then `i..1`. For `n = 3`: `1    1`, `12  21`, `123321`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 1; j <= i; j++) s += j; for (let j = 0; j < 2 * (n - i); j++) s += " "; for (let j = i; j >= 1; j--) s += j; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, k) => { const left = Array.from({ length: k + 1 }, (_, j) => j + 1); return left.join("") + " ".repeat(2 * (n - k - 1)) + left.reverse().join(""); });`,
    hints: [
      "Split each row into three loops: numbers going up, a gap, numbers coming down.",
      "The gap shrinks by two each row: 2(n - i) spaces. The right half is the left half reversed.",
      "for i from 1 to n:\n  row = 1..i joined\n  row += ' ' repeated 2(n - i) times\n  row += i..1 joined\n  add row to rows\nreturn rows",
    ],
    maxN: 9,
  },
  {
    k: 13, name: "Increasing Number Triangle",
    rule: "Row `i` has `i` numbers, continuing a single count that starts at `1`, separated by single spaces. For `n = 3`: `1`, `2 3`, `4 5 6`.",
    ref: `const rows = []; let x = 1; for (let i = 1; i <= n; i++) { const parts = []; for (let j = 0; j < i; j++) parts.push(x++); rows.push(parts.join(" ")); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => Array.from({ length: i + 1 }, (_, j) => (i * (i + 1)) / 2 + j + 1).join(" "));`,
    hints: [
      "The numbers don't restart on each row. What do you need to keep outside both loops?",
      "Keep a counter that starts at 1 and increases after every printed number, across rows.",
      "x = 1\nfor i from 1 to n:\n  parts = empty list\n  repeat i times: add x to parts; x += 1\n  add parts joined by ' ' to rows\nreturn rows",
    ],
  },
  {
    k: 14, name: "Increasing Letter Triangle",
    rule: "Row `i` is the first `i` capital letters. For `n = 3`: `A`, `AB`, `ABC`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = ""; for (let j = 0; j < i; j++) s += ${letter("j")}; rows.push(s); } return rows;`,
    brute: `const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return Array.from({ length: n }, (_, i) => abc.slice(0, i + 1));`,
    hints: [
      "Letters are numbers in disguise: 'A' has code 65, 'B' 66 and so on.",
      "Cell j (0-based) of every row is the letter with code 65 + j.",
      "for i from 1 to n:\n  row = empty string\n  for j from 0 to i - 1: row += letter(65 + j)\n  add row to rows\nreturn rows",
    ],
    maxN: 26,
  },
  {
    k: 15, name: "Reverse Letter Triangle",
    rule: "Row `i` (1-based) is the first `n - i + 1` capital letters. For `n = 3`: `ABC`, `AB`, `A`.",
    ref: `const rows = []; for (let i = n; i >= 1; i--) { let s = ""; for (let j = 0; j < i; j++) s += ${letter("j")}; rows.push(s); } return rows;`,
    brute: `const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return Array.from({ length: n }, (_, i) => abc.slice(0, n - i));`,
    hints: [
      "This is the letter triangle with the rows in the opposite order.",
      "Let the outer loop count down from n to 1 and print that many letters from 'A'.",
      "for i from n down to 1:\n  row = first i letters\n  add row to rows\nreturn rows",
    ],
    maxN: 26,
  },
  {
    k: 16, name: "Alpha Ramp",
    rule: "Row `i` (1-based) is the `i`-th capital letter written `i` times. For `n = 3`: `A`, `BB`, `CCC`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j <= i; j++) s += ${letter("i")}; rows.push(s); } return rows;`,
    brute: `const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return Array.from({ length: n }, (_, i) => abc[i].repeat(i + 1));`,
    hints: [
      "The letter depends only on the row, not on the column.",
      "In row i (0-based), print letter 65 + i, i + 1 times.",
      "for i from 0 to n - 1:\n  row = letter(65 + i) repeated i + 1 times\n  add row to rows\nreturn rows",
    ],
    maxN: 26,
  },
  {
    k: 17, name: "Alpha Hill",
    rule: "Row `i` (1-based) has `n - i` leading spaces, then the letters from `A` up to the `i`-th letter and back down to `A`. For `n = 3`: `  A`, ` ABA`, `ABCBA`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { let s = " ".repeat(n - i); for (let j = 0; j < i; j++) s += ${letter("j")}; for (let j = i - 2; j >= 0; j--) s += ${letter("j")}; rows.push(s); } return rows;`,
    brute: `const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return Array.from({ length: n }, (_, k) => { const up = abc.slice(0, k + 1); return " ".repeat(n - k - 1) + up + up.slice(0, -1).split("").reverse().join(""); });`,
    hints: [
      "Each row is a pyramid row (leading spaces) whose middle is a palindrome of letters.",
      "After the spaces, print letters A..(i-th) going up, then (i-1)-th..A going down, so the peak letter appears once.",
      "for i from 1 to n:\n  row = ' ' repeated (n - i)\n  for j from 0 to i - 1: row += letter(65 + j)\n  for j from i - 2 down to 0: row += letter(65 + j)\n  add row to rows\nreturn rows",
    ],
    maxN: 26,
  },
  {
    k: 18, name: "Alpha Triangle",
    rule: "Row `i` (1-based) holds the last `i` letters of the first `n` capital letters, in order, separated by single spaces. For `n = 3`: `C`, `B C`, `A B C`.",
    ref: `const rows = []; for (let i = 1; i <= n; i++) { const parts = []; for (let c = n - i; c < n; c++) parts.push(${letter("c")}); rows.push(parts.join(" ")); } return rows;`,
    brute: `const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, n); return Array.from({ length: n }, (_, i) => abc.slice(n - i - 1).split("").join(" "));`,
    hints: [
      "Every row ends with the n-th letter. Where does row i start?",
      "Row i starts at letter index n - i and runs up to index n - 1; join the letters with spaces.",
      "for i from 1 to n:\n  parts = letters with index n - i to n - 1\n  add parts joined by ' ' to rows\nreturn rows",
    ],
    maxN: 26,
  },
  {
    k: 19, name: "Symmetric Void",
    rule: "`2n` rows. The top half, for `i = 0..n-1`, is `n - i` stars, `2i` spaces, `n - i` stars. The bottom half, for `i = 1..n`, is `i` stars, `2(n - i)` spaces, `i` stars. For `n = 2`: `****`, `*  *`, `*  *`, `****`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) rows.push("*".repeat(n - i) + " ".repeat(2 * i) + "*".repeat(n - i)); for (let i = 1; i <= n; i++) rows.push("*".repeat(i) + " ".repeat(2 * (n - i)) + "*".repeat(i)); return rows;`,
    brute: `const top = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j < 2 * n; j++) s += j < n - i || j >= n + i ? "*" : " "; top.push(s); } return top.concat(top.slice().reverse());`,
    hints: [
      "Each row is stars, a gap, stars. The bottom half is the top half mirrored.",
      "In the top half the stars shrink by one on each side while the gap grows by two. Then print the same rows in reverse order.",
      "for i from 0 to n - 1: add (n - i stars + 2i spaces + n - i stars)\nfor i from 1 to n: add (i stars + 2(n - i) spaces + i stars)\nreturn rows",
    ],
  },
  {
    k: 20, name: "Symmetric Butterfly",
    rule: "`2n - 1` rows. Row `i` (1-based) has `s` stars, `2(n - s)` spaces and `s` stars, where `s = i` for `i <= n` and `s = 2n - i` after that. For `n = 2`: `*  *`, `****`, `*  *`.",
    ref: `const rows = []; for (let i = 1; i <= 2 * n - 1; i++) { const s = i <= n ? i : 2 * n - i; rows.push("*".repeat(s) + " ".repeat(2 * (n - s)) + "*".repeat(s)); } return rows;`,
    brute: `const up = []; for (let s = 1; s <= n; s++) { let r = ""; for (let j = 0; j < 2 * n; j++) r += j < s || j >= 2 * n - s ? "*" : " "; up.push(r); } return up.concat(up.slice(0, n - 1).reverse());`,
    hints: [
      "This is the void pattern turned inside out: the star blocks grow toward the middle row and shrink after it.",
      "Use one loop over 2n - 1 rows; compute s like in the half diamond, then print s stars, 2(n - s) spaces, s stars.",
      "for i from 1 to 2n - 1:\n  s = i if i <= n else 2n - i\n  add (s stars + 2(n - s) spaces + s stars)\nreturn rows",
    ],
  },
  {
    k: 21, name: "Hollow Square",
    rule: "An `n` by `n` square whose border is stars and whose inside is spaces. For `n = 3`: `***`, `* *`, `***`.",
    ref: `const rows = []; for (let i = 0; i < n; i++) { let s = ""; for (let j = 0; j < n; j++) s += i === 0 || j === 0 || i === n - 1 || j === n - 1 ? "*" : " "; rows.push(s); } return rows;`,
    brute: `return Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? "*".repeat(n) : "*" + " ".repeat(Math.max(0, n - 2)) + (n > 1 ? "*" : "")));`,
    hints: [
      "Which cells are on the border? Think about the row and column indexes.",
      "A cell is a star when it's in the first or last row or the first or last column; otherwise it's a space.",
      "for i from 0 to n - 1:\n  row = empty string\n  for j from 0 to n - 1:\n    if i is 0 or n - 1, or j is 0 or n - 1: row += '*'\n    else: row += ' '\n  add row to rows\nreturn rows",
    ],
  },
  {
    k: 22, name: "The Number Pattern",
    rule: "A `(2n - 1)` by `(2n - 1)` grid of digits written together. Each cell holds `n` minus its distance to the nearest edge, so the border is `n` and the centre is `1`. For `n = 2`: `222`, `212`, `222`.",
    ref: `const size = 2 * n - 1; const rows = []; for (let i = 0; i < size; i++) { let s = ""; for (let j = 0; j < size; j++) s += n - Math.min(i, j, size - 1 - i, size - 1 - j); rows.push(s); } return rows;`,
    brute: `const size = 2 * n - 1; const grid = Array.from({ length: size }, () => new Array(size).fill(0)); for (let layer = 0; layer < n; layer++) for (let i = layer; i < size - layer; i++) for (let j = layer; j < size - layer; j++) grid[i][j] = n - layer; return grid.map((r) => r.join(""));`,
    hints: [
      "Look at one cell. How far is it from the top, left, bottom and right edges?",
      "Cell (i, j) prints n - min(i, j, size - 1 - i, size - 1 - j), where size = 2n - 1.",
      "size = 2n - 1\nfor i from 0 to size - 1:\n  row = empty string\n  for j from 0 to size - 1:\n    row += n - min(i, j, size - 1 - i, size - 1 - j)\n  add row to rows\nreturn rows",
    ],
    maxN: 9,
  },
];

export const A2Z_PATTERNS = PATTERNS.map((p) => define(patternDef(p)));
