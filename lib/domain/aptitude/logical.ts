import { shuffle } from "@/lib/domain/sampling";
import type { Generator, QuestionDraft } from "./question";
import { choice, fmt, int, numeric, pick, retry } from "./question";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = ["CAT", "DOG", "SUN", "MAP", "BOX", "PEN", "RAIN", "FISH", "LAMP", "KITE", "BOOK", "TREE"];

const pad = (n: number) => String(n).padStart(2, "0");
const timeText = (totalMin: number) => {
  const m = ((totalMin % 720) + 720) % 720;
  const h = Math.floor(m / 60) || 12;
  return `${h}:${pad(m % 60)}`;
};

const clocks: Generator[] = [
  (rng) => {
    const h = int(rng, 1, 11);
    const m = int(rng, 0, 11) * 5;
    let angle = Math.abs(30 * h - 5.5 * m);
    if (angle > 180) angle = 360 - angle;
    return numeric(rng, `What is the angle between the hour and minute hands at ${h}:${pad(m)}?`, angle, `Angle = |30H − 5.5M| = |30×${h} − 5.5×${m}| = ${fmt(Math.abs(30 * h - 5.5 * m))}°${Math.abs(30 * h - 5.5 * m) > 180 ? `, so the smaller angle is 360 − that = ${fmt(angle)}°` : ""}.`, {
      format: (n) => `${fmt(n)}°`,
    });
  },
  (rng) => {
    const rows: ReadonlyArray<readonly [string, number, number, string]> = [
      ["overlap", 12, 11, "The hands overlap 11 times in 12 hours"],
      ["overlap", 24, 22, "The hands overlap 11 times in 12 hours, so 22 in a day"],
      ["point in opposite directions", 12, 11, "They are opposite 11 times in 12 hours"],
      ["are at right angles", 12, 22, "They are at 90° 22 times in 12 hours"],
      ["are at right angles", 24, 44, "They are at 90° 22 times in 12 hours, so 44 in a day"],
    ];
    const [what, hours, ans, why] = pick(rng, rows);
    return numeric(rng, `How many times do the hands of a clock ${what} in ${hours} hours?`, ans, `${why}.`);
  },
  (rng) => {
    const m = int(rng, 2, 6);
    const h = int(rng, 2, 9);
    const gain = rng() < 0.5;
    const real = 12 * 60 + h * 60;
    const display = real + (gain ? 1 : -1) * m * h;
    return choice(
      rng,
      `A clock ${gain ? "gains" : "loses"} ${m} minutes every hour. It is set correctly at 12:00 noon. What time will it show after ${h} true hours?`,
      timeText(display),
      [timeText(display + m), timeText(display - m), timeText(real), timeText(real + (gain ? -1 : 1) * m * h)],
      `In ${h} hours it ${gain ? "gains" : "loses"} ${m}×${h} = ${m * h} min. True time ${timeText(real)}, so the clock shows ${timeText(display)}.`,
    );
  },
  (rng) => {
    const h = int(rng, 1, 11);
    const m = int(rng, 1, 11) * 5;
    const mirror = 11 * 60 + 60 - (h * 60 + m);
    return choice(
      rng,
      `The time in a mirror image of a clock shows ${h}:${pad(m)}. What is the actual time?`,
      timeText(mirror),
      [timeText(mirror + 5), timeText(mirror - 5), timeText(mirror + 60), timeText(h * 60 + m + 360)],
      `Actual = 11:60 − mirror time = 11:60 − ${h}:${pad(m)} = ${timeText(mirror)}.`,
    );
  },
];

function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

const calendar: Generator[] = [
  (rng) => {
    const y = int(rng, 1995, 2040);
    const m = int(rng, 0, 11);
    const d = int(rng, 1, 28);
    const ans = WEEKDAYS[weekdayOf(y, m, d)];
    return choice(rng, `What day of the week is ${d} ${MONTHS[m]} ${y}?`, ans, WEEKDAYS.filter((w) => w !== ans), `Count odd days from a known anchor date. The calendar for ${y} puts ${d} ${MONTHS[m]} on a ${ans}.`);
  },
  (rng) => {
    const y = int(rng, 2005, 2035);
    const m = int(rng, 0, 11);
    const d = int(rng, 1, 28);
    const dy = int(rng, 1, 3);
    const start = weekdayOf(y, m, d);
    const end = weekdayOf(y + dy, m, d);
    const days = (Date.UTC(y + dy, m, d) - Date.UTC(y, m, d)) / 86_400_000;
    return choice(
      rng,
      `If ${d} ${MONTHS[m]} ${y} is a ${WEEKDAYS[start]}, what day is ${d} ${MONTHS[m]} ${y + dy}?`,
      WEEKDAYS[end],
      WEEKDAYS.filter((w) => w !== WEEKDAYS[end]),
      `${days} days later; ${days} mod 7 = ${days % 7} odd day${days % 7 === 1 ? "" : "s"}. ${WEEKDAYS[start]} + ${days % 7} = ${WEEKDAYS[end]}.`,
    );
  },
  (rng) => {
    const n = pick(rng, [100, 200, 300, 400, 500, 600]);
    const leaps = Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400);
    const odd = (n + leaps) % 7;
    return numeric(rng, `How many odd days are there in ${n} years?`, odd, `${n} years have ${leaps} leap years, so ${n}×365 + ${leaps} extra days. (${n} + ${leaps}) mod 7 = ${odd}. (100 yrs → 5, 200 → 3, 300 → 1, 400 → 0.)`);
  },
  (rng) => {
    const len = pick(rng, [28, 29, 30, 31]);
    const start = int(rng, 0, 6);
    const target = int(rng, 0, 6);
    let count = 0;
    for (let i = 0; i < len; i++) if ((start + i) % 7 === target) count++;
    return numeric(rng, `A month of ${len} days begins on a ${WEEKDAYS[start]}. How many ${WEEKDAYS[target]}s does it contain?`, count, `${len} days = ${Math.floor(len / 7)} full weeks + ${len % 7} extra day${len % 7 === 1 ? "" : "s"} (${WEEKDAYS.slice(start).concat(WEEKDAYS).slice(0, len % 7).join(", ") || "none"}). ${WEEKDAYS[target]} appears ${count} times.`);
  },
];

const shiftWord = (w: string, k: number) => [...w].map((c) => ALPHA[(ALPHA.indexOf(c) + k + 26) % 26]).join("");

const codingDecoding: Generator[] = [
  (rng) => {
    const w = pick(rng, WORDS);
    const k = int(rng, 1, 4);
    const tgt = pick(rng, WORDS.filter((x) => x !== w));
    return choice(
      rng,
      `In a code, each letter is moved ${k} place${k > 1 ? "s" : ""} forward in the alphabet. How is ${w} written in that code?`,
      shiftWord(w, k),
      [shiftWord(w, k + 1), shiftWord(w, -k), shiftWord(w, k - 1 || k + 2), shiftWord(tgt, k)],
      `Move each letter ${k} forward: ${[...w].map((c) => `${c}→${ALPHA[(ALPHA.indexOf(c) + k) % 26]}`).join(", ")} gives ${shiftWord(w, k)}.`,
    );
  },
  (rng) => {
    const w = pick(rng, WORDS);
    const v = [...w].reduce((s, c) => s + ALPHA.indexOf(c) + 1, 0);
    return numeric(rng, `If A = 1, B = 2, C = 3 … Z = 26, what is the sum of the letter values of ${w}?`, v, `${[...w].map((c) => `${c}=${ALPHA.indexOf(c) + 1}`).join(" + ")} = ${v}.`);
  },
  (rng) => {
    const w = pick(rng, WORDS);
    const opp = [...w].map((c) => ALPHA[25 - ALPHA.indexOf(c)]).join("");
    return choice(rng, `In a code each letter is replaced by its opposite letter in the alphabet (A↔Z, B↔Y …). How is ${w} coded?`, opp, [shiftWord(w, 1), [...opp].reverse().join(""), shiftWord(w, 3), [...w].reverse().join("")], `The opposite of a letter at position p is 27 − p: ${[...w].map((c) => `${c}→${ALPHA[25 - ALPHA.indexOf(c)]}`).join(", ")} gives ${opp}.`);
  },
  (rng) => {
    const k = int(rng, 2, 5);
    const a = int(rng, 2, 9);
    const w = pick(rng, WORDS.filter((x) => x.length === 3));
    const code = [...w].map((c) => (ALPHA.indexOf(c) + 1) * k + a).join("-");
    const other = pick(rng, WORDS.filter((x) => x.length === 3 && x !== w));
    const ocode = [...other].map((c) => (ALPHA.indexOf(c) + 1) * k + a).join("-");
    return choice(rng, `In a certain code, ${w} is written as ${code}. How would ${other} be written in that code?`, ocode, [[...other].map((c) => (ALPHA.indexOf(c) + 1) * k).join("-"), [...other].map((c) => ALPHA.indexOf(c) + 1 + a).join("-"), [...other].map((c) => (ALPHA.indexOf(c) + 1) * k + a + 1).join("-"), [...w].map((c) => (ALPHA.indexOf(c) + 1) * k + a).reverse().join("-")], `Each letter becomes position × ${k} + ${a}. Check on ${w}: ${code}. So ${other} → ${ocode}.`);
  },
];

const nextPrime = (n: number) => {
  let p = n + 1;
  while (![...Array(p).keys()].slice(2).every((d) => d * d > p || p % d !== 0)) p++;
  return p;
};

const seriesCompletion: Generator[] = [
  (rng) => {
    const a = int(rng, 2, 20);
    const d = int(rng, 3, 12);
    const s = [0, 1, 2, 3, 4].map((i) => a + i * d);
    return numeric(rng, `Find the next term: ${s.join(", ")}, ?`, a + 5 * d, `A constant difference of +${d}. Next = ${s[4]} + ${d} = ${a + 5 * d}.`);
  },
  (rng) => {
    const a = int(rng, 1, 10);
    const d = int(rng, 1, 4);
    const e = int(rng, 1, 3);
    const s = [a];
    let diff = d;
    for (let i = 0; i < 5; i++) {
      s.push(s[s.length - 1] + diff);
      diff += e;
    }
    return numeric(rng, `Find the missing term: ${s.slice(0, 5).join(", ")}, ?`, s[5], `Differences are ${[0, 1, 2, 3].map((i) => d + i * e).join(", ")}, growing by ${e}, so the next difference is ${d + 4 * e}: ${s[4]} + ${d + 4 * e} = ${s[5]}.`);
  },
  (rng) => {
    const a = int(rng, 1, 4);
    const k = pick(rng, [2, 3]);
    const c = int(rng, 1, 3);
    const s = [a];
    for (let i = 0; i < 5; i++) s.push(s[i] * k + c);
    return numeric(rng, `Find the next term: ${s.slice(0, 5).join(", ")}, ?`, s[5], `Each term = previous × ${k} + ${c}. Next = ${s[4]}×${k} + ${c} = ${s[5]}.`);
  },
  (rng) => {
    const c = int(rng, -2, 3);
    const start = int(rng, 2, 6);
    const s = [0, 1, 2, 3, 4].map((i) => (start + i) ** 2 + c);
    const ans = (start + 5) ** 2 + c;
    return numeric(rng, `Find the next term: ${s.join(", ")}, ?`, ans, `These are n² ${c >= 0 ? "+" : "−"} ${Math.abs(c)} for n = ${start}, ${start + 1}, …. Next n = ${start + 5}: ${ans}.`);
  },
  (rng) => {
    const a = int(rng, 2, 9);
    const d = int(rng, 2, 7);
    const b = int(rng, 20, 40);
    const e = int(rng, 3, 9);
    const s = [a, b, a + d, b + e, a + 2 * d, b + 2 * e];
    const ans = a + 3 * d;
    return numeric(rng, `Find the next term of this alternating series: ${s.join(", ")}, ?`, ans, `Two interleaved series: positions 1, 3, 5 go ${a}, ${a + d}, ${a + 2 * d} (+${d}); positions 2, 4, 6 go +${e}. The 7th term continues the first: ${ans}.`);
  },
  (rng) => {
    const k = int(rng, 1, 3);
    const start = int(rng, 0, 20 - 5 * k);
    const letters = [0, 1, 2, 3, 4].map((i) => ALPHA[start + i * k]);
    const ans = ALPHA[start + 5 * k];
    const wrong = [ALPHA[start + 5 * k - 1], ALPHA[start + 5 * k + 1], ALPHA[start + 4 * k + 2] ?? "Z", ALPHA[(start + 5 * k + 2) % 26]];
    return choice(rng, `Find the next letter: ${letters.join(", ")}, ?`, ans, wrong, `Positions go up by ${k} each time (${letters.map((c) => ALPHA.indexOf(c) + 1).join(", ")}), so the next is ${ALPHA.indexOf(ans) + 1} = ${ans}.`);
  },
  (rng) => {
    const startL = int(rng, 0, 12);
    const startN = int(rng, 1, 9);
    const sl = int(rng, 1, 2);
    const sn = int(rng, 1, 4);
    const items = [0, 1, 2].map((i) => `${ALPHA[startL + i * sl]}${startN + i * sn}`);
    const ans = `${ALPHA[startL + 3 * sl]}${startN + 3 * sn}`;
    const wrong = [`${ALPHA[startL + 3 * sl]}${startN + 3 * sn + 1}`, `${ALPHA[startL + 3 * sl + 1]}${startN + 3 * sn}`, `${ALPHA[startL + 3 * sl - 1]}${startN + 3 * sn}`, `${ALPHA[startL + 3 * sl]}${startN + 2 * sn + 1}`];
    return choice(rng, `Find the next term: ${items.join(", ")}, ?`, ans, wrong, `Letters move +${sl} and numbers +${sn} each step, so the next is ${ans}.`);
  },
  (rng) => {
    const p = pick(rng, [2, 3, 5, 7, 11, 13]);
    const primes = [p];
    while (primes.length < 5) primes.push(nextPrime(primes[primes.length - 1]));
    const ans = nextPrime(primes[4]);
    return numeric(rng, `Find the next term: ${primes.join(", ")}, ?`, ans, `Consecutive prime numbers. The prime after ${primes[4]} is ${ans}.`);
  },
];

const cubeCuboid: Generator[] = [
  (rng) => {
    const n = int(rng, 3, 6);
    const kinds: ReadonlyArray<readonly [string, number, string]> = [
      ["exactly three faces", 8, "the 8 corners"],
      ["exactly two faces", 12 * (n - 2), `12(n−2) = 12×${n - 2} (edges, not corners)`],
      ["exactly one face", 6 * (n - 2) ** 2, `6(n−2)² = 6×${(n - 2) ** 2} (face centres)`],
      ["no face", (n - 2) ** 3, `(n−2)³ = ${(n - 2) ** 3} (hidden inside)`],
    ];
    const [label, ans, why] = pick(rng, kinds);
    return numeric(rng, `A ${n}×${n}×${n} cube is painted on all six faces and cut into ${n ** 3} unit cubes. How many of the small cubes have ${label} painted?`, ans, `${why} = ${ans}.`);
  },
  (rng) => {
    const a = int(rng, 2, 6);
    const b = int(rng, 2, 6);
    const c = int(rng, 2, 6);
    return numeric(rng, `What is the minimum number of straight cuts needed to cut a ${a}×${b}×${c} block into unit cubes (rearranging pieces is not allowed)?`, a - 1 + (b - 1) + (c - 1), `Each dimension needs (side − 1) cuts: ${a - 1} + ${b - 1} + ${c - 1} = ${a + b + c - 3}.`);
  },
  (rng) => {
    const m = int(rng, 2, 4);
    const r = int(rng, 2, 4);
    return numeric(rng, `A cube of side ${m * r} cm is cut into smaller cubes of side ${m} cm. How many small cubes are formed?`, r ** 3, `Each edge splits into ${m * r}/${m} = ${r} pieces, so ${r}³ = ${r ** 3} cubes.`);
  },
  (rng) => {
    const n = int(rng, 3, 7);
    return numeric(rng, `A cube has edge ${n} cm. What is the length of its space diagonal (in cm, to 2 decimal places)?`, Number((n * Math.sqrt(3)).toFixed(2)), `Space diagonal = a√3 = ${n} × 1.732 = ${fmt(n * Math.sqrt(3))} cm.`);
  },
];

const DIRS = ["North", "East", "South", "West"] as const;

const directionSense: Generator[] = [
  (rng) => {
    const [a, b, c] = pick(rng, [
      [3, 4, 5],
      [5, 12, 13],
      [6, 8, 10],
      [8, 15, 17],
    ] as const);
    const z = int(rng, 2, 9);
    const turn = rng() < 0.5 ? "right" : "left";
    return numeric(
      rng,
      `A man walks ${a + z} km North, turns ${turn} and walks ${b} km, turns ${turn} again and walks ${z} km. How far is he, in a straight line, from his starting point (km)?`,
      c,
      `The ${z} km back cancels ${z} km of the northward walk, leaving ${a} km net north and ${b} km sideways. √(${a}² + ${b}²) = ${c} km.`,
    );
  },
  (rng) => {
    const start = int(rng, 0, 3);
    let facing = start;
    const steps: string[] = [];
    for (let i = 0; i < 3; i++) {
      const move = pick(rng, [
        ["right", 1],
        ["left", -1],
        ["about-turn", 2],
      ] as const);
      steps.push(move[0] === "about-turn" ? "an about-turn" : `a ${move[0]} turn`);
      facing = (facing + move[1] + 4) % 4;
    }
    return choice(rng, `A person faces ${DIRS[start]}. He makes ${steps.join(", then ")}. Which direction is he facing now?`, DIRS[facing], [...DIRS.filter((d) => d !== DIRS[facing]), "North-East"], `Turn right = +90°, left = −90°, about-turn = 180°. Starting at ${DIRS[start]} the final heading is ${DIRS[facing]}.`);
  },
  (rng) => {
    const a = int(rng, 5, 20);
    const b = int(rng, 3, 15);
    const first = int(rng, 0, 3);
    const opposite = (first + 2) % 4;
    const side = (first + 1) % 4;
    return choice(
      rng,
      `Ria walks ${a} m ${DIRS[first]}, then ${b} m ${DIRS[side]}, then ${a} m ${DIRS[opposite]}. In which direction is she from the starting point?`,
      DIRS[side],
      DIRS.filter((d) => d !== DIRS[side]),
      `The ${DIRS[first]} and ${DIRS[opposite]} legs of ${a} m cancel, so she ends ${b} m ${DIRS[side]} of the start.`,
    );
  },
];

const OBJECTS = ["pens", "books", "bags", "lamps", "chairs", "clocks", "rings", "boxes"];

type Q = "all" | "no" | "some" | "somenot";
const Q_TEXT: Record<Q, (x: string, y: string) => string> = {
  all: (x, y) => `All ${x} are ${y}`,
  no: (x, y) => `No ${x} is ${y}`,
  some: (x, y) => `Some ${x} are ${y}`,
  somenot: (x, y) => `Some ${x} are not ${y}`,
};

/** True in a model when `type` is a set of 3-bit membership types (bit0 = A, bit1 = B, bit2 = C). */
function holds(kind: Q, x: number, y: number, model: number): boolean {
  let hasXY = false;
  let hasXnotY = false;
  for (let t = 0; t < 8; t++) {
    if (!(model & (1 << t))) continue;
    const inX = (t >> x) & 1;
    const inY = (t >> y) & 1;
    if (inX && inY) hasXY = true;
    if (inX && !inY) hasXnotY = true;
  }
  if (kind === "all") return !hasXnotY;
  if (kind === "no") return !hasXY;
  if (kind === "some") return hasXY;
  return hasXnotY;
}

/** Model-checks a conclusion against two premises over every combination of Venn regions. */
export function syllogismFollows(premises: ReadonlyArray<readonly [Q, number, number]>, conclusion: readonly [Q, number, number]): boolean {
  for (let model = 0; model < 256; model++) {
    if (premises.every(([k, x, y]) => holds(k, x, y, model)) && !holds(conclusion[0], conclusion[1], conclusion[2], model)) return false;
  }
  return true;
}

const syllogism: Generator[] = [
  (rng) => {
    const names = shuffle(OBJECTS, rng).slice(0, 3);
    const kinds: Q[] = ["all", "no", "some", "somenot"];
    const target = pick(rng, ["I", "II", "both", "neither"] as const);
    let tries = 0;
    return retry(rng, () => {
      tries++;
      const p1 = [pick(rng, kinds), 0, 1] as const;
      const p2 = [pick(rng, kinds), 1, 2] as const;
      const c1 = [pick(rng, kinds), pick(rng, [0, 2]) as 0 | 2, 0] as [Q, number, number];
      c1[2] = c1[1] === 0 ? 2 : 0;
      const c2 = [pick(rng, kinds), pick(rng, [0, 2]) as 0 | 2, 0] as [Q, number, number];
      c2[2] = c2[1] === 0 ? 2 : 0;
      if (c1[0] === c2[0] && c1[1] === c2[1]) return null;
      const f1 = syllogismFollows([p1, p2], c1);
      const f2 = syllogismFollows([p1, p2], c2);
      const outcome = f1 && f2 ? "both" : f1 ? "I" : f2 ? "II" : "neither";
      // 'Both' is rare among random pairs, so after many misses take whatever outcome comes.
      if (outcome !== target && tries < 150) return null;
      const label = { I: "Only conclusion I follows", II: "Only conclusion II follows", both: "Both I and II follow", neither: "Neither I nor II follows" };
      const draft: QuestionDraft = {
        prompt: `Statements: ${Q_TEXT[p1[0]](names[0], names[1])}. ${Q_TEXT[p2[0]](names[1], names[2])}.\nConclusions: I. ${Q_TEXT[c1[0]](names[c1[1]], names[c1[2]])}.  II. ${Q_TEXT[c2[0]](names[c2[1]], names[c2[2]])}.`,
        options: ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
        answerIndex: ["I", "II", "both", "neither"].indexOf(outcome),
        explanation: `${label[outcome]}. A conclusion follows only if it is true in every Venn diagram that fits both statements; draw the circles for ${names.join(", ")} and try to break each conclusion.`,
      };
      return draft;
    });
  },
];

const dices: Generator[] = [
  (rng) => {
    const n = int(rng, 1, 6);
    return numeric(rng, `On a standard die, which number is on the face opposite to ${n}?`, 7 - n, `Opposite faces of a standard die add to 7: 7 − ${n} = ${7 - n}.`);
  },
  (rng) => {
    const perm = shuffle([1, 2, 3, 4, 5, 6], rng);
    const pairs: Array<[number, number]> = [
      [perm[0], perm[1]],
      [perm[2], perm[3]],
      [perm[4], perm[5]],
    ];
    const [x, y] = pairs[int(rng, 0, 2)];
    return numeric(rng, `On a particular die, the opposite pairs are (${pairs.map((p) => p.join(", ")).join(") (")}). What is opposite to ${x}?`, y, `Read it straight off the given pairs: ${x} is paired with ${y}.`);
  },
];

export const LOGICAL_GENERATORS: Record<string, Generator[]> = {
  clocks,
  calendar,
  "coding-decoding": codingDecoding,
  "series-completion": seriesCompletion,
  "cube-cuboid": cubeCuboid,
  "direction-sense": directionSense,
  syllogism,
  dices,
};
