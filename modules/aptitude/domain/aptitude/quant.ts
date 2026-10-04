import type { Generator } from "@/modules/aptitude/domain/aptitude/question";
import { choice, fmt, frac, gcd, int, lcm, numeric, pct, pick, retry, rupees } from "@/modules/aptitude/domain/aptitude/question";

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n: number, r: number): number => fact(n) / (fact(r) * fact(n - r));
const nPr = (n: number, r: number): number => fact(n) / fact(n - r);

/** Pairs (a, b) where ab / (a + b) is a whole number. */
const WORK_PAIRS: ReadonlyArray<readonly [number, number, number]> = [
  [12, 24, 8],
  [10, 15, 6],
  [20, 30, 12],
  [15, 30, 10],
  [12, 36, 9],
  [18, 36, 12],
  [30, 60, 20],
  [14, 35, 10],
  [20, 5, 4],
  [24, 8, 6],
  [40, 10, 8],
  [45, 90, 30],
];

/** (a, b, ab / (b − a)) for filling and leaking. */
const LEAK_PAIRS: ReadonlyArray<readonly [number, number, number]> = [
  [10, 15, 30],
  [6, 9, 18],
  [12, 16, 48],
  [20, 30, 60],
  [8, 12, 24],
  [15, 20, 60],
  [4, 6, 12],
  [9, 12, 36],
];

const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 12, 15],
  [6, 8, 10],
];

const NAMES = ["Asha", "Ravi", "Meera", "Karan", "Neha", "Arjun", "Divya", "Imran", "Sara", "Vikram"];
const two = (rng: () => number) => {
  const a = pick(rng, NAMES);
  let b = pick(rng, NAMES);
  while (b === a) b = pick(rng, NAMES);
  return [a, b] as const;
};

const speedTimeDistance: Generator[] = [
  (rng) => {
    const s = 18 * int(rng, 2, 9);
    return numeric(rng, `Convert ${s} km/h into m/s.`, (s * 5) / 18, `Multiply by 5/18: ${s} × 5/18 = ${(s * 5) / 18} m/s.`);
  },
  (rng) => {
    const k = int(rng, 2, 8);
    const a = 10 * k;
    const b = 15 * k;
    const avg = 12 * k;
    return numeric(
      rng,
      `A man travels from A to B at ${a} km/h and returns at ${b} km/h. What is his average speed for the whole trip (km/h)?`,
      avg,
      `Same distance, so average = 2ab/(a+b) = 2×${a}×${b}/${a + b} = ${avg} km/h. The plain mean ${(a + b) / 2} is the trap.`,
      { near: [(a + b) / 2] },
    );
  },
  (rng) => {
    const a = int(rng, 4, 9) * 5;
    const b = int(rng, 3, 8) * 5;
    const t = int(rng, 2, 8);
    const d = (a + b) * t;
    return numeric(
      rng,
      `Two cars start ${d} km apart and drive towards each other at ${a} km/h and ${b} km/h. After how many hours do they meet?`,
      t,
      `Closing speed = ${a} + ${b} = ${a + b} km/h. Time = ${d}/${a + b} = ${t} h.`,
    );
  },
  (rng) => {
    const b = int(rng, 3, 8) * 5;
    const a = b + int(rng, 1, 4) * 5;
    const t = int(rng, 2, 9);
    const head = (a - b) * t;
    return numeric(
      rng,
      `A cyclist rides at ${b} km/h. A motorbike starts ${head} km behind him, going the same way at ${a} km/h. In how many hours does it catch up?`,
      t,
      `Relative speed = ${a} − ${b} = ${a - b} km/h. Time = ${head}/${a - b} = ${t} h.`,
    );
  },
  (rng) => {
    const s = int(rng, 4, 12) * 10;
    const m = int(rng, 1, 5) * 15;
    const km = (s * m) / 60;
    return numeric(rng, `A bus runs at ${s} km/h. How many km does it cover in ${m} minutes?`, km, `${m} min = ${m / 60} h. Distance = ${s} × ${m / 60} = ${fmt(km)} km.`);
  },
];

const POWERS_BASES = [2, 3, 7, 8, 9, 13, 17, 19, 23, 27];
const numberSystem: Generator[] = [
  (rng) => {
    const base = pick(rng, POWERS_BASES);
    const n = int(rng, 12, 99);
    let digit = 1;
    for (let i = 0; i < n; i++) digit = (digit * (base % 10)) % 10;
    return numeric(
      rng,
      `What is the units digit of ${base}^${n}?`,
      digit,
      `Units digits of powers repeat in a cycle of ≤ 4. ${n} mod 4 = ${n % 4}, so use the cycle position ${n % 4 === 0 ? 4 : n % 4} of ${base % 10}: units digit ${digit}.`,
    );
  },
  (rng) => {
    const d = pick(rng, [7, 9, 11, 13]);
    const n = int(rng, 1000, 99999);
    return numeric(rng, `What is the remainder when ${n} is divided by ${d}?`, n % d, `${n} = ${d} × ${Math.floor(n / d)} + ${n % d}.`);
  },
  (rng) => {
    const p = pick(rng, [2, 3, 5]);
    const q = pick(rng, [7, 11, 13]);
    const a = int(rng, 1, 4);
    const b = int(rng, 1, 3);
    return numeric(
      rng,
      `How many positive factors does ${p}^${a} × ${q}^${b} have?`,
      (a + 1) * (b + 1),
      `Add 1 to each exponent and multiply: (${a}+1)(${b}+1) = ${(a + 1) * (b + 1)}.`,
    );
  },
  (rng) => {
    const d = pick(rng, [9, 11, 12, 15, 16, 18]);
    const n = int(rng, 200, 900);
    const add = (d - (n % d)) % d || d;
    return numeric(rng, `What is the smallest number that must be added to ${n} to make it exactly divisible by ${d}?`, add, `${n} mod ${d} = ${n % d}, so add ${d} − ${n % d} = ${add}.`);
  },
  (rng) => {
    const k = pick(rng, [6, 7, 8, 9, 11, 12, 13]);
    const count = Math.floor(99 / k) - Math.floor(9 / k);
    return numeric(rng, `How many two-digit numbers are divisible by ${k}?`, count, `⌊99/${k}⌋ − ⌊9/${k}⌋ = ${Math.floor(99 / k)} − ${Math.floor(9 / k)} = ${count}.`);
  },
];

const hcfLcm: Generator[] = [
  (rng) => {
    const { g, m, n } = retry(rng, () => {
      const m2 = int(rng, 2, 12);
      const n2 = int(rng, 2, 12);
      return m2 !== n2 && gcd(m2, n2) === 1 ? { g: int(rng, 2, 9), m: m2, n: n2 } : null;
    });
    const ask = rng() < 0.5 ? "HCF" : "LCM";
    const ans = ask === "HCF" ? g : g * m * n;
    return numeric(
      rng,
      `Find the ${ask} of ${g * m} and ${g * n}.`,
      ans,
      ask === "HCF"
        ? `${g * m} = ${g}×${m} and ${g * n} = ${g}×${n} with ${m}, ${n} coprime, so HCF = ${g}.`
        : `HCF = ${g}, so LCM = ${g * m} × ${g * n} / ${g} = ${ans}.`,
    );
  },
  (rng) => {
    const h = int(rng, 2, 9);
    const m = int(rng, 2, 6);
    const n = int(rng, 7, 12);
    const a = h * m;
    const b = h * n;
    const l = h * m * n;
    return numeric(rng, `The HCF of two numbers is ${h} and their LCM is ${l}. If one number is ${a}, the other is:`, b, `HCF × LCM = product of the numbers, so the other = ${h}×${l}/${a} = ${b}.`);
  },
  (rng) => {
    const set = retry(rng, () => {
      const s = [int(rng, 3, 12), int(rng, 3, 12), int(rng, 3, 12)];
      return new Set(s).size === 3 ? s : null;
    });
    const l = lcm(lcm(set[0], set[1]), set[2]);
    return numeric(rng, `What is the smallest number exactly divisible by ${set[0]}, ${set[1]} and ${set[2]}?`, l, `It is the LCM of ${set.join(", ")} = ${l}.`);
  },
  (rng) => {
    const set = retry(rng, () => {
      const s = [int(rng, 2, 9) * 3, int(rng, 2, 9) * 4, int(rng, 2, 9) * 5];
      return new Set(s).size === 3 ? s : null;
    });
    const l = lcm(lcm(set[0], set[1]), set[2]);
    return numeric(
      rng,
      `Three bells toll at intervals of ${set[0]}, ${set[1]} and ${set[2]} seconds. They toll together now. After how many seconds will they next toll together?`,
      l,
      `"Together again" means the LCM of ${set.join(", ")} = ${l} s.`,
    );
  },
  (rng) => {
    const a = pick(rng, [12, 15, 18, 20]);
    const b = pick(rng, [8, 10, 16, 24]);
    const r = int(rng, 1, 5);
    const l = lcm(a, b);
    return numeric(rng, `What is the smallest number which leaves remainder ${r} when divided by ${a} or ${b}?`, l + r, `LCM(${a}, ${b}) = ${l}; add the common remainder: ${l} + ${r} = ${l + r}.`);
  },
];

const timeWork: Generator[] = [
  (rng) => {
    const [a, b, t] = pick(rng, WORK_PAIRS);
    const [x, y] = two(rng);
    return numeric(rng, `${x} can finish a job in ${a} days and ${y} in ${b} days. Working together, how many days will they take?`, t, `Together: ab/(a+b) = ${a}×${b}/${a + b} = ${t} days.`);
  },
  (rng) => {
    const [a, b, t] = pick(rng, WORK_PAIRS);
    const first = Math.min(a, b);
    const second = Math.max(a, b);
    return numeric(
      rng,
      `A and B together finish a job in ${t} days. A alone takes ${first} days. How many days would B alone take?`,
      second,
      `1/B = 1/${t} − 1/${first} = ${first - t}/${t * first} = 1/${second}. B takes ${second} days.`,
    );
  },
  (rng) => {
    const { a, b, d, ans } = retry(rng, () => {
      const a2 = pick(rng, [12, 15, 20, 24, 30, 40]);
      const b2 = pick(rng, [10, 12, 15, 20, 30]);
      const d2 = int(rng, 2, a2 - 2);
      const days = (1 - d2 / a2) * b2;
      return Number.isInteger(days) && days > 0 ? { a: a2, b: b2, d: d2, ans: days } : null;
    });
    return numeric(
      rng,
      `A can do a work in ${a} days, B in ${b} days. A works alone for ${d} days and then leaves. How many more days does B need to finish the rest?`,
      ans,
      `A completes ${d}/${a} of the work, leaving ${a - d}/${a}. B needs ${b} × ${a - d}/${a} = ${ans} days.`,
    );
  },
  (rng) => {
    const { m, d, m2, ans } = retry(rng, () => {
      const m1 = int(rng, 4, 20);
      const d1 = int(rng, 4, 24);
      const m3 = int(rng, 3, 30);
      const a = (m1 * d1) / m3;
      return m3 !== m1 && Number.isInteger(a) ? { m: m1, d: d1, m2: m3, ans: a } : null;
    });
    return numeric(rng, `${m} men can complete a work in ${d} days. How many days will ${m2} men take?`, ans, `Man-days are constant: ${m}×${d} = ${m * d}. ${m * d}/${m2} = ${ans} days.`);
  },
];

const pipesCisterns: Generator[] = [
  (rng) => {
    const [a, b, t] = pick(rng, LEAK_PAIRS);
    return numeric(
      rng,
      `A pipe fills a tank in ${a} hours and another pipe empties it in ${b} hours. If both are opened together, how many hours to fill the empty tank?`,
      t,
      `Net rate = 1/${a} − 1/${b} = ${b - a}/${a * b}. Time = ${a * b}/${b - a} = ${t} h.`,
    );
  },
  (rng) => {
    const [a, b, t] = pick(rng, LEAK_PAIRS);
    return numeric(
      rng,
      `A tank fills in ${a} hours normally, but a leak makes it take ${b} hours. How long would the leak alone take to empty a full tank (hours)?`,
      t,
      `Leak rate = 1/${a} − 1/${b}, so the leak empties it in ${a}×${b}/(${b}−${a}) = ${t} h.`,
    );
  },
  (rng) => {
    const { a, b, c, t } = retry(rng, () => {
      const a2 = pick(rng, [6, 8, 10, 12, 15, 20]);
      const b2 = pick(rng, [10, 12, 15, 20, 30]);
      const c2 = pick(rng, [20, 24, 30, 40, 60]);
      const L = lcm(lcm(a2, b2), c2);
      const net = L / a2 + L / b2 - L / c2;
      const time = net > 0 ? L / net : 0;
      return Number.isInteger(time) && time > 0 && time < 60 ? { a: a2, b: b2, c: c2, t: time } : null;
    });
    return numeric(
      rng,
      `Two inlet pipes fill a tank in ${a} and ${b} hours; an outlet empties it in ${c} hours. All three open together, how many hours to fill the tank?`,
      t,
      `Take capacity = LCM(${a}, ${b}, ${c}) = ${lcm(lcm(a, b), c)} units. Net rate/h = ${lcm(lcm(a, b), c) / a} + ${lcm(lcm(a, b), c) / b} − ${lcm(lcm(a, b), c) / c}. Time = ${t} h.`,
    );
  },
];

const trainsBoats: Generator[] = [
  (rng) => {
    const s = 18 * int(rng, 2, 6);
    const t = int(rng, 5, 20);
    const len = ((s * 5) / 18) * t;
    return numeric(rng, `A train running at ${s} km/h crosses a pole in ${t} seconds. What is its length in metres?`, len, `Speed = ${s}×5/18 = ${(s * 5) / 18} m/s. Length = speed × time = ${(s * 5) / 18} × ${t} = ${len} m.`);
  },
  (rng) => {
    const k = int(rng, 2, 6);
    const s = 18 * k;
    const ms = 5 * k;
    const t = int(rng, 8, 24);
    const total = ms * t;
    const L = Math.round((total * int(rng, 3, 6)) / 10);
    const P = total - L;
    return numeric(
      rng,
      `A ${L} m long train running at ${s} km/h crosses a platform ${P} m long. How many seconds does it take?`,
      t,
      `Distance = ${L} + ${P} = ${total} m. Speed = ${s}×5/18 = ${ms} m/s. Time = ${total}/${ms} = ${t} s.`,
    );
  },
  (rng) => {
    const u = int(rng, 4, 12);
    const v = int(rng, 1, 3);
    const t = int(rng, 2, 6);
    const d = (u + v) * t;
    return numeric(
      rng,
      `A boat's speed in still water is ${u} km/h and the stream flows at ${v} km/h. How many hours does it take to go ${d} km downstream?`,
      t,
      `Downstream speed = ${u} + ${v} = ${u + v} km/h. Time = ${d}/${u + v} = ${t} h.`,
    );
  },
  (rng) => {
    const u = int(rng, 6, 15);
    const v = int(rng, 1, 5);
    return numeric(
      rng,
      `A boat goes downstream at ${u + v} km/h and upstream at ${u - v} km/h. What is its speed in still water (km/h)?`,
      u,
      `Still water = (down + up)/2 = (${u + v} + ${u - v})/2 = ${u}. The stream is (down − up)/2 = ${v}.`,
      { near: [v] },
    );
  },
  (rng) => {
    const k = int(rng, 2, 5);
    const s1 = 6 * int(rng, 1, 3 * k - 1);
    const s2 = 18 * k - s1;
    const rel = 5 * k;
    const t = int(rng, 4, 12);
    const L = rel * t;
    const a = Math.floor(L / 2);
    return numeric(
      rng,
      `Two trains of lengths ${a} m and ${L - a} m run in opposite directions at ${s1} km/h and ${s2} km/h. How many seconds do they take to cross each other?`,
      t,
      `Relative speed = ${s1}+${s2} = ${s1 + s2} km/h = ${rel} m/s. Distance = ${a}+${L - a} = ${L} m. Time = ${L}/${rel} = ${t} s.`,
    );
  },
];

const permComb: Generator[] = [
  (rng) => {
    const n = int(rng, 6, 12);
    const r = int(rng, 2, 4);
    return numeric(rng, `In how many ways can a committee of ${r} be chosen from ${n} people?`, nCr(n, r), `Order does not matter: ${n}C${r} = ${nCr(n, r)}.`);
  },
  (rng) => {
    const word = pick(rng, ["LEVEL", "APPLE", "BANANA", "SUCCESS", "MISSISSIPPI", "TOMATO", "COMMITTEE", "BOOKKEEPER"]);
    const counts = new Map<string, number>();
    for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const denom = [...counts.values()].reduce((p, c) => p * fact(c), 1);
    const ans = fact(word.length) / denom;
    const reps = [...counts.entries()].filter(([, c]) => c > 1).map(([ch, c]) => `${c}! for ${ch}`);
    return numeric(rng, `How many different arrangements of the letters of the word ${word} are there?`, ans, `${word.length}! divided by the factorial of each repeat (${reps.join(", ")}) = ${ans}.`);
  },
  (rng) => {
    const n = int(rng, 4, 8);
    return numeric(
      rng,
      `${n} friends sit in a row. In how many ways can two particular friends always sit together?`,
      2 * fact(n - 1),
      `Glue the pair into one unit: (${n}−1)! = ${fact(n - 1)} arrangements, times 2 for the pair's internal order = ${2 * fact(n - 1)}.`,
    );
  },
  (rng) => {
    const n = int(rng, 6, 20);
    return numeric(rng, `At a party ${n} people shake hands once with everyone else. How many handshakes occur?`, nCr(n, 2), `Each pair shakes once: ${n}C2 = ${nCr(n, 2)}.`);
  },
  (rng) => {
    const n = int(rng, 5, 9);
    const r = 3;
    return numeric(
      rng,
      `How many 3-digit numbers can be formed from the digits 1 to ${n} if no digit repeats?`,
      nPr(n, r),
      `Order matters: ${n}P3 = ${n}×${n - 1}×${n - 2} = ${nPr(n, r)}.`,
    );
  },
];

function fractionOptions(correctN: number, correctD: number, spread: number[]): string[] {
  return spread.map((delta) => frac(Math.max(1, correctN + delta), correctD));
}

const probability: Generator[] = [
  (rng) => {
    const s = int(rng, 3, 11);
    const ways = s <= 7 ? s - 1 : 13 - s;
    return choice(
      rng,
      `Two fair dice are rolled. What is the probability that the sum is ${s}?`,
      frac(ways, 36),
      fractionOptions(ways, 36, [1, -1, 2, 3, -2]).concat([frac(ways, 12), frac(1, 6)]),
      `${ways} of the 36 equally likely outcomes give a sum of ${s}, so ${ways}/36 = ${frac(ways, 36)}.`,
    );
  },
  (rng) => {
    const r = int(rng, 2, 8);
    const b = int(rng, 2, 8);
    const n = r + b;
    return choice(
      rng,
      `A bag has ${r} red and ${b} blue balls. One ball is drawn at random. What is the probability it is red?`,
      frac(r, n),
      [frac(b, n), frac(r, b), frac(r + 1, n), frac(r, n + 1), frac(r - 1 || 1, n)],
      `Favourable / total = ${r}/${n} = ${frac(r, n)}.`,
    );
  },
  (rng) => {
    const n = int(rng, 3, 5);
    const k = int(rng, 1, n - 1);
    return choice(
      rng,
      `A fair coin is tossed ${n} times. What is the probability of getting exactly ${k} head${k > 1 ? "s" : ""}?`,
      frac(nCr(n, k), 2 ** n),
      [frac(nCr(n, k) + 1, 2 ** n), frac(nCr(n, k) - 1, 2 ** n), frac(k, n), frac(1, 2 ** n), frac(nCr(n, k), 2 ** (n - 1))],
      `${n}C${k} = ${nCr(n, k)} favourable outcomes out of 2^${n} = ${2 ** n}: ${frac(nCr(n, k), 2 ** n)}.`,
    );
  },
  (rng) => {
    const r = int(rng, 3, 7);
    const b = int(rng, 2, 6);
    const n = r + b;
    return choice(
      rng,
      `A bag has ${r} red and ${b} blue balls. Two balls are drawn one after another without replacement. What is the probability that both are red?`,
      frac(r * (r - 1), n * (n - 1)),
      [frac(r * r, n * n), frac(r * (r - 1), n * n), frac(r * b, n * (n - 1)), frac(r - 1, n - 1), frac(r, n)],
      `P = (${r}/${n}) × (${r - 1}/${n - 1}) = ${frac(r * (r - 1), n * (n - 1))}.`,
    );
  },
  (rng) => {
    const n = int(rng, 2, 4);
    return choice(
      rng,
      `A fair coin is tossed ${n} times. What is the probability of getting at least one head?`,
      frac(2 ** n - 1, 2 ** n),
      [frac(1, 2 ** n), frac(1, 2), frac(2 ** n - 2, 2 ** n), frac(n, 2 ** n), frac(2 ** n - 1, 2 ** (n + 1))],
      `P(at least one) = 1 − P(none) = 1 − 1/${2 ** n} = ${frac(2 ** n - 1, 2 ** n)}.`,
    );
  },
];

const geometry: Generator[] = [
  (rng) => {
    const n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18, 20]);
    const ans = (180 * (n - 2)) / n;
    return numeric(rng, `What is each interior angle of a regular polygon with ${n} sides (degrees)?`, ans, `(n−2)×180/n = ${n - 2}×180/${n} = ${fmt(ans)}°.`);
  },
  (rng) => {
    const ratio = pick(rng, [
      [2, 3, 4],
      [1, 2, 3],
      [3, 4, 5],
      [1, 3, 5],
      [2, 3, 5],
      [4, 5, 6],
      [1, 4, 7],
      [3, 5, 7],
    ]);
    const sum = ratio.reduce((x, y) => x + y, 0);
    const k = 180 / sum;
    return numeric(rng, `The angles of a triangle are in the ratio ${ratio.join(" : ")}. What is the largest angle (degrees)?`, ratio[2] * k, `Angles sum to 180°, so one part = 180/${sum} = ${k}°. Largest = ${ratio[2]}×${k} = ${ratio[2] * k}°.`);
  },
  (rng) => {
    const n = int(rng, 6, 15);
    return numeric(rng, `How many diagonals does a polygon with ${n} sides have?`, (n * (n - 3)) / 2, `n(n−3)/2 = ${n}×${n - 3}/2 = ${(n * (n - 3)) / 2}.`);
  },
  (rng) => {
    const [a, b, c] = pick(rng, TRIPLES);
    const k = int(rng, 1, 3);
    return numeric(rng, `The two legs of a right triangle measure ${a * k} cm and ${b * k} cm. What is the hypotenuse (cm)?`, c * k, `This is the ${a}-${b}-${c} triple scaled by ${k}: hypotenuse = ${c * k} cm.`);
  },
  (rng) => {
    const e = pick(rng, [20, 24, 30, 36, 40, 45, 60, 72]);
    return numeric(rng, `Each exterior angle of a regular polygon is ${e}°. How many sides does it have?`, 360 / e, `Exterior angles sum to 360°, so sides = 360/${e} = ${360 / e}.`);
  },
  (rng) => {
    const a = int(rng, 15, 70);
    return numeric(
      rng,
      `An arc subtends an angle of ${a}° at a point on the circle. What angle does it subtend at the centre (degrees)?`,
      2 * a,
      `The angle at the centre is twice the angle at the circumference: 2 × ${a} = ${2 * a}°.`,
    );
  },
];

const mixtures: Generator[] = [
  (rng) => {
    const { a, b, m, near, far, g } = retry(rng, () => {
      const lo = int(rng, 10, 40) * 2;
      const hi = lo + int(rng, 4, 12) * 5;
      const mean = lo + int(rng, 1, (hi - lo) / 5 - 1) * 5;
      if (mean <= lo || mean >= hi) return null;
      const x = hi - mean;
      const y = mean - lo;
      const gg = gcd(x, y);
      return { a: lo, b: hi, m: mean, near: x / gg, far: y / gg, g: gg };
    });
    return choice(
      rng,
      `In what ratio must rice at ₹${a}/kg be mixed with rice at ₹${b}/kg to get a mixture worth ₹${m}/kg? (cheaper : dearer)`,
      `${near} : ${far}`,
      [`${far} : ${near}`, `${near + 1} : ${far}`, `${near} : ${far + 1}`, `${near + far} : ${far}`, `${near + 2} : ${far}`, `${near} : ${far + 2}`, `${far + 1} : ${near}`],
      `Alligation: cheaper : dearer = (${b} − ${m}) : (${m} − ${a}) = ${b - m} : ${m - a} = ${near} : ${far}${g > 1 ? ` (divided by ${g})` : ""}.`,
    );
  },
  (rng) => {
    const q = int(rng, 3, 5);
    const k = int(rng, 1, 4);
    const V = q * q * k;
    const x = q * k;
    const left = k * (q - 1) * (q - 1);
    return numeric(
      rng,
      `A vessel holds ${V} litres of pure milk. ${x} litres are drawn out and replaced with water; then ${x} litres of the mixture are drawn out and replaced with water again. How much milk is left (litres)?`,
      left,
      `Milk left = V(1 − x/V)² = ${V} × (${q - 1}/${q})² = ${left} litres.`,
    );
  },
  (rng) => {
    const lo = pick(rng, [10, 20, 30]);
    const hi = lo + pick(rng, [20, 30, 40]);
    const mean = lo + (hi - lo) / 2 + (rng() < 0.5 ? -(hi - lo) / 4 : (hi - lo) / 4);
    const x = hi - mean;
    const y = mean - lo;
    const g = gcd(x, y);
    return choice(
      rng,
      `A ${lo}% and a ${hi}% acid solution are mixed to get a ${mean}% solution. In what ratio (${lo}% : ${hi}%) are they mixed?`,
      `${x / g} : ${y / g}`,
      [`${y / g} : ${x / g}`, `${x / g + 1} : ${y / g}`, `1 : 1`, `${x / g} : ${y / g + 2}`],
      `Cross: (${hi} − ${mean}) : (${mean} − ${lo}) = ${x} : ${y} = ${x / g} : ${y / g}.`,
    );
  },
];

const algebra: Generator[] = [
  (rng) => {
    const x = int(rng, 2, 15);
    const a = int(rng, 2, 9);
    const b = int(rng, 1, 20);
    return numeric(rng, `If ${a}x + ${b} = ${a * x + b}, what is x?`, x, `${a}x = ${a * x + b} − ${b} = ${a * x}, so x = ${x}.`);
  },
  (rng) => {
    const x = int(rng, 8, 20);
    const y = int(rng, 2, x - 2);
    return numeric(rng, `If x + y = ${x + y} and x − y = ${x - y}, what is x·y?`, x * y, `Add the equations: 2x = ${2 * x}, x = ${x}; then y = ${y}. xy = ${x * y}.`);
  },
  (rng) => {
    const p = int(rng, 1, 9);
    const q = int(rng, 1, 9);
    return numeric(
      rng,
      `What is the sum of the squares of the roots of x² − ${p + q}x + ${p * q} = 0?`,
      p * p + q * q,
      `Roots are ${p} and ${q} (sum ${p + q}, product ${p * q}). Sum of squares = (${p + q})² − 2×${p * q} = ${p * p + q * q}.`,
    );
  },
  (rng) => {
    const k = int(rng, 3, 9);
    return numeric(rng, `If x + 1/x = ${k}, what is x² + 1/x²?`, k * k - 2, `Square both sides: x² + 2 + 1/x² = ${k * k}, so x² + 1/x² = ${k * k - 2}.`);
  },
  (rng) => {
    const d = int(rng, 2, 7);
    const p = int(rng, 3, 20);
    return numeric(rng, `If a − b = ${d} and ab = ${p}, what is a² + b²?`, d * d + 2 * p, `a² + b² = (a − b)² + 2ab = ${d * d} + ${2 * p} = ${d * d + 2 * p}.`);
  },
];

const EXACT: ReadonlyArray<readonly [string, number, number]> = [
  ["sin 30°", 1, 2],
  ["cos 60°", 1, 2],
  ["tan 45°", 1, 1],
  ["sin 90°", 1, 1],
  ["cos 0°", 1, 1],
  ["sin 0°", 0, 1],
  ["cos 90°", 0, 1],
  ["tan 0°", 0, 1],
];

const trigonometry: Generator[] = [
  (rng) => {
    const i = int(rng, 0, EXACT.length - 1);
    const j = (i + int(rng, 1, EXACT.length - 1)) % EXACT.length;
    const [na, an, ad] = EXACT[i];
    const [nb, bn, bd] = EXACT[j];
    const op = pick(rng, ["+", "×"] as const);
    const n = op === "+" ? an * bd + bn * ad : an * bn;
    const d = ad * bd;
    const ans = n === 0 ? "0" : frac(n, d);
    return choice(rng, `Evaluate: ${na} ${op} ${nb}.`, ans, ["0", "1", "1/2", "1/4", "3/4", "2", "3/2"], `${na} = ${frac(an, ad)}, ${nb} = ${frac(bn, bd)}. ${op === "+" ? "Sum" : "Product"} = ${ans}.`);
  },
  (rng) => {
    const d = int(rng, 2, 12) * 10;
    return choice(rng, `From a point ${d} m from the foot of a tower, the angle of elevation of its top is 45°. What is the height of the tower?`, `${d} m`, [`${d * 2} m`, `${fmt(d / 2)} m`, `${d}√3 m`, `${d}√2 m`], `tan 45° = height/distance = 1, so height = ${d} m.`);
  },
  (rng) => {
    const d = int(rng, 2, 9) * 10;
    return choice(rng, `A tower is seen at an angle of elevation of 60° from a point ${d} m from its foot. What is its height?`, `${d}√3 m`, [`${d}/√3 m`, `${d} m`, `${d}√2 m`, `${2 * d} m`], `Height = distance × tan 60° = ${d}√3 m.`);
  },
  (rng) => {
    const L = int(rng, 3, 12) * 2;
    return numeric(rng, `A ${L} m ladder leans against a wall making 60° with the ground. How far is its foot from the wall (m)?`, L / 2, `Foot distance = L cos 60° = ${L} × 1/2 = ${L / 2} m.`);
  },
  (rng) => {
    const h = int(rng, 2, 9) * 10;
    return choice(rng, `A ${h} m tall pole casts a ${h} m long shadow. What is the angle of elevation of the sun?`, "45°", ["30°", "60°", "90°", "75°"], `tan θ = height/shadow = ${h}/${h} = 1, so θ = 45°.`);
  },
];

const progressions: Generator[] = [
  (rng) => {
    const a = int(rng, 2, 15);
    const d = int(rng, 2, 9);
    const n = int(rng, 8, 30);
    return numeric(rng, `What is the ${n}th term of the AP ${a}, ${a + d}, ${a + 2 * d}, …?`, a + (n - 1) * d, `a + (n−1)d = ${a} + ${n - 1}×${d} = ${a + (n - 1) * d}.`);
  },
  (rng) => {
    const a = int(rng, 1, 10);
    const d = int(rng, 1, 6);
    const n = int(rng, 8, 25);
    const last = a + (n - 1) * d;
    return numeric(rng, `Find the sum of the first ${n} terms of the AP with first term ${a} and common difference ${d}.`, (n * (a + last)) / 2, `Last term = ${last}. Sum = n/2 × (first + last) = ${n}/2 × ${a + last} = ${(n * (a + last)) / 2}.`);
  },
  (rng) => {
    const a = int(rng, 1, 5);
    const r = pick(rng, [2, 3]);
    const n = int(rng, 4, 7);
    return numeric(rng, `What is the ${n}th term of the GP ${a}, ${a * r}, ${a * r * r}, …?`, a * r ** (n - 1), `a·r^(n−1) = ${a} × ${r}^${n - 1} = ${a * r ** (n - 1)}.`);
  },
  (rng) => {
    const a = int(rng, 3, 20);
    const d = int(rng, 2, 7);
    const n = int(rng, 10, 40);
    return numeric(rng, `How many terms are in the AP ${a}, ${a + d}, …, ${a + (n - 1) * d}?`, n, `n = (last − first)/d + 1 = ${(n - 1) * d}/${d} + 1 = ${n}.`);
  },
  (rng) => {
    const kind = pick(rng, ["natural", "odd", "even"] as const);
    const n = int(rng, 10, 40);
    const ans = kind === "natural" ? (n * (n + 1)) / 2 : kind === "odd" ? n * n : n * (n + 1);
    const rule = kind === "natural" ? "n(n+1)/2" : kind === "odd" ? "n²" : "n(n+1)";
    return numeric(rng, `What is the sum of the first ${n} ${kind === "natural" ? "natural numbers" : `${kind} numbers`}?`, ans, `The standard result is ${rule} = ${ans}.`);
  },
  (rng) => {
    const a = int(rng, 1, 4);
    const r = pick(rng, [2, 3]);
    const n = int(rng, 4, 6);
    const sum = (a * (r ** n - 1)) / (r - 1);
    return numeric(rng, `Find the sum of the first ${n} terms of the GP with first term ${a} and ratio ${r}.`, sum, `a(r^n − 1)/(r − 1) = ${a}(${r ** n} − 1)/${r - 1} = ${sum}.`);
  },
];

const ages: Generator[] = [
  (rng) => {
    const { k, m, t, x } = retry(rng, () => {
      const k2 = int(rng, 3, 5);
      const m2 = int(rng, 2, k2 - 1);
      const t2 = int(rng, 2, 15);
      const x2 = (t2 * (m2 - 1)) / (k2 - m2);
      return Number.isInteger(x2) && x2 > 0 ? { k: k2, m: m2, t: t2, x: x2 } : null;
    });
    return numeric(
      rng,
      `A father is ${k} times as old as his son. After ${t} years he will be ${m} times as old as his son. What is the son's present age?`,
      x,
      `Let son = x, father = ${k}x. ${k}x + ${t} = ${m}(x + ${t}) → ${k - m}x = ${t * (m - 1)} → x = ${x}.`,
    );
  },
  (rng) => {
    const { a, b, s } = retry(rng, () => {
      const p = int(rng, 2, 7);
      const q = int(rng, p + 1, 9);
      const s2 = (p + q) * int(rng, 3, 8);
      return { a: p, b: q, s: s2 };
    });
    return numeric(rng, `The ages of two brothers are in the ratio ${a} : ${b} and their ages add up to ${s}. What is the elder one's age?`, (s / (a + b)) * b, `One part = ${s}/${a + b} = ${s / (a + b)}. Elder = ${b} × ${s / (a + b)} = ${(s / (a + b)) * b}.`);
  },
  (rng) => {
    const { s, d } = retry(rng, () => {
      const total = int(rng, 30, 70);
      const diff = int(rng, 2, 10);
      return (total - diff) % 2 === 0 ? { s: total, d: diff } : null;
    });
    return numeric(rng, `The sum of the ages of A and B is ${s}. A is ${d} years older than B. How old is B?`, (s - d) / 2, `B = (sum − difference)/2 = (${s} − ${d})/2 = ${(s - d) / 2}.`);
  },
  (rng) => {
    const B = int(rng, 15, 30);
    const k = int(rng, 2, 3);
    const ago = int(rng, 3, 8);
    const A = ago + k * (B - ago);
    return numeric(
      rng,
      `The sum of the present ages of A and B is ${A + B}. ${ago} years ago, A was ${k} times as old as B. What is B's present age?`,
      B,
      `A = ${A + B} − B. (${A + B} − B) − ${ago} = ${k}(B − ${ago}) → ${k + 1}B = ${A + B - ago + k * ago} → B = ${B}.`,
    );
  },
];

const profitLoss: Generator[] = [
  (rng) => {
    const cp = int(rng, 4, 40) * 20;
    const p = pick(rng, [10, 15, 20, 25, 30, 40]);
    return numeric(rng, `An article costs ₹${cp}. At what price must it be sold for a profit of ${p}%?`, (cp * (100 + p)) / 100, `SP = CP × (100 + ${p})/100 = ${cp} × ${100 + p}/100 = ${(cp * (100 + p)) / 100}.`, { format: rupees });
  },
  (rng) => {
    const cp = int(rng, 4, 40) * 20;
    const p = pick(rng, [10, 20, 25, 40]);
    const sp = (cp * (100 + p)) / 100;
    return numeric(rng, `A trader sells an article for ₹${sp} and makes a profit of ${p}%. What was the cost price?`, cp, `CP = SP × 100/(100 + ${p}) = ${sp} × 100/${100 + p} = ${cp}.`, { format: rupees });
  },
  (rng) => {
    const mp = int(rng, 10, 60) * 50;
    const d = pick(rng, [10, 15, 20, 25, 30]);
    return numeric(rng, `The marked price of a shirt is ₹${mp}. A discount of ${d}% is given. What is the selling price?`, (mp * (100 - d)) / 100, `SP = ${mp} × (100 − ${d})/100 = ${(mp * (100 - d)) / 100}.`, { format: rupees });
  },
  (rng) => {
    const a = pick(rng, [10, 20, 25, 30, 40]);
    const b = pick(rng, [10, 20, 5, 15]);
    return numeric(rng, `Two successive discounts of ${a}% and ${b}% are equal to a single discount of:`, a + b - (a * b) / 100, `a + b − ab/100 = ${a} + ${b} − ${(a * b) / 100} = ${fmt(a + b - (a * b) / 100)}%.`, { format: pct });
  },
  (rng) => {
    const x = pick(rng, [5, 10, 15, 20, 30]);
    return numeric(rng, `Two articles are sold at the same price, one at a gain of ${x}% and the other at a loss of ${x}%. The overall result is a loss of:`, (x * x) / 100, `When two items sell at the same price with equal gain% and loss%, the net loss is x²/100 % = ${x * x}/100 = ${fmt((x * x) / 100)}%.`, { format: pct });
  },
  (rng) => {
    const cp = int(rng, 2, 12) * 100;
    const l = pick(rng, [10, 20, 25]);
    const g = pick(rng, [10, 20, 25]);
    const sold = (cp * (100 - l)) / 100;
    return numeric(rng, `By selling a bicycle for ₹${sold} a seller loses ${l}%. At what price should it be sold to gain ${g}%?`, (cp * (100 + g)) / 100, `CP = ${sold} × 100/${100 - l} = ${cp}. New SP = ${cp} × ${100 + g}/100 = ${(cp * (100 + g)) / 100}.`, { format: rupees });
  },
];

const simplification: Generator[] = [
  (rng) => {
    const a = int(rng, 2, 9);
    const b = int(rng, 11, 29);
    const c = int(rng, 2, 9);
    const d = int(rng, 5, 40);
    return numeric(rng, `${a} + ${b} × ${c} − ${d} = ?`, a + b * c - d, `Multiply first (BODMAS): ${b}×${c} = ${b * c}. Then ${a} + ${b * c} − ${d} = ${a + b * c - d}.`);
  },
  (rng) => {
    const n = int(rng, 11, 39);
    return numeric(rng, `${n}² = ?`, n * n, n % 10 === 5 ? `Ends in 5: ${Math.floor(n / 10)}×${Math.floor(n / 10) + 1} then 25 → ${n * n}.` : `(${n - (n % 10)} + ${n % 10})² = ${(n - (n % 10)) ** 2} + 2×${n - (n % 10)}×${n % 10} + ${(n % 10) ** 2} = ${n * n}.`);
  },
  (rng) => {
    const a = int(rng, 1, 5);
    const b = pick(rng, [2, 3, 4, 5, 6]);
    const c = int(rng, 1, 5);
    const d = pick(rng, [2, 3, 4, 5, 6, 8]);
    const n = a * d + c * b;
    return choice(rng, `${a}/${b} + ${c}/${d} = ?`, frac(n, b * d), [frac(a + c, b + d), frac(n + 1, b * d), frac(n, b + d), frac(Math.max(1, n - 2), b * d)], `LCD method: (${a}×${d} + ${c}×${b})/${b * d} = ${frac(n, b * d)}.`);
  },
  (rng) => {
    const x = pick(rng, [10, 15, 20, 25, 30, 40, 50]);
    const y = pick(rng, [10, 20, 25, 30, 40]);
    const A = int(rng, 4, 30) * 20;
    const B = int(rng, 2, 20) * 20;
    return numeric(rng, `${x}% of ${A} + ${y}% of ${B} = ?`, (x * A) / 100 + (y * B) / 100, `${x}% of ${A} = ${(x * A) / 100}; ${y}% of ${B} = ${(y * B) / 100}. Sum = ${(x * A) / 100 + (y * B) / 100}.`);
  },
  (rng) => {
    const a = int(rng, 6, 30);
    const b = int(rng, 1, a - 2);
    return numeric(rng, `(${a} + ${b})² − (${a} − ${b})² = ?`, 4 * a * b, `The identity gives 4ab = 4 × ${a} × ${b} = ${4 * a * b}.`);
  },
  (rng) => {
    const r = int(rng, 12, 45);
    return numeric(rng, `√${r * r} = ?`, r, `${r} × ${r} = ${r * r}, so the square root is ${r}.`);
  },
];

const simpleInterest: Generator[] = [
  (rng) => {
    const P = int(rng, 4, 40) * 250;
    const R = int(rng, 3, 12);
    const T = int(rng, 2, 6);
    return numeric(rng, `Find the simple interest on ₹${P} at ${R}% per annum for ${T} years.`, (P * R * T) / 100, `SI = PRT/100 = ${P}×${R}×${T}/100 = ${(P * R * T) / 100}.`, { format: rupees });
  },
  (rng) => {
    const P = int(rng, 4, 20) * 500;
    const R = int(rng, 3, 12);
    const T = int(rng, 2, 6);
    const SI = (P * R * T) / 100;
    return numeric(rng, `A sum of ₹${P} earns simple interest of ₹${SI} in ${T} years. What is the rate per annum?`, R, `R = SI×100/(P×T) = ${SI}×100/(${P}×${T}) = ${R}%.`, { format: pct });
  },
  (rng) => {
    const R = pick(rng, [2, 4, 5, 10, 20, 25]);
    return numeric(rng, `In how many years will a sum double itself at ${R}% simple interest per annum?`, 100 / R, `Interest must equal the principal: T = 100/R = 100/${R} = ${100 / R} years.`);
  },
  (rng) => {
    const P = int(rng, 4, 20) * 500;
    const R = int(rng, 4, 10);
    const T = int(rng, 2, 5);
    return numeric(rng, `What amount will ₹${P} become after ${T} years at ${R}% simple interest per annum?`, P + (P * R * T) / 100, `SI = ${(P * R * T) / 100}. Amount = ${P} + ${(P * R * T) / 100} = ${P + (P * R * T) / 100}.`, { format: rupees });
  },
  (rng) => {
    const k = int(rng, 2, 4);
    const T = int(rng, 4, 10);
    return numeric(rng, `A sum becomes ${k} times itself in ${T} years at simple interest. What is the rate per annum?`, ((k - 1) * 100) / T, `Interest = (${k} − 1)P, so R·T = ${(k - 1) * 100}, R = ${(k - 1) * 100}/${T} = ${fmt(((k - 1) * 100) / T)}%.`, { format: pct });
  },
];

const compoundInterest: Generator[] = [
  (rng) => {
    const R = pick(rng, [10, 20, 5]);
    const base = R === 10 ? 100 : R === 20 ? 25 : 400;
    const P = base * int(rng, 1, 10);
    const ci = P * ((1 + R / 100) ** 2 - 1);
    return numeric(rng, `Find the compound interest on ₹${P} at ${R}% per annum for 2 years.`, ci, `Amount = ${P} × (${100 + R}/100)² = ${fmt(P * (1 + R / 100) ** 2)}. CI = amount − principal = ${fmt(ci)}.`, { format: rupees });
  },
  (rng) => {
    const R = pick(rng, [10, 20, 5]);
    const base = R === 10 ? 100 : R === 20 ? 25 : 400;
    const P = base * int(rng, 2, 12);
    return numeric(rng, `What is the difference between CI and SI on ₹${P} at ${R}% per annum for 2 years?`, P * (R / 100) ** 2, `For 2 years, CI − SI = P(R/100)² = ${P} × (${R}/100)² = ${fmt(P * (R / 100) ** 2)}.`, { format: rupees });
  },
  (rng) => {
    const R = pick(rng, [10, 20]);
    const base = R === 10 ? 1000 : 125;
    const P = base * int(rng, 1, 5);
    return numeric(rng, `What will ₹${P} amount to after 3 years at ${R}% compound interest per annum?`, P * (1 + R / 100) ** 3, `Amount = ${P} × (${100 + R}/100)³ = ${fmt(P * (1 + R / 100) ** 3)}.`, { format: rupees });
  },
  (rng) => {
    const R = pick(rng, [6, 8, 9, 12]);
    return numeric(rng, `Using the rule of 72, in about how many years does money double at ${R}% compound interest per annum?`, 72 / R, `Doubling time ≈ 72/R = 72/${R} = ${72 / R} years.`, { format: (n) => `${fmt(n)} years` });
  },
];

const averages: Generator[] = [
  (rng) => {
    const n = int(rng, 4, 6);
    const avg = int(rng, 12, 40);
    const nums: number[] = [];
    for (let i = 0; i < n - 1; i++) nums.push(avg + int(rng, -8, 8));
    nums.push(avg * n - nums.reduce((s, x) => s + x, 0));
    return numeric(rng, `What is the average of ${nums.join(", ")}?`, avg, `Sum = ${nums.reduce((s, x) => s + x, 0)}, count = ${n}. Average = ${avg}.`);
  },
  (rng) => {
    const n = int(rng, 4, 9);
    const a = int(rng, 15, 40);
    const c = int(rng, 1, 4);
    const x = a + (n + 1) * c;
    return numeric(rng, `The average of ${n} numbers is ${a}. When one more number, ${x}, is added, what is the new average?`, a + c, `New sum = ${n}×${a} + ${x} = ${n * a + x}. Divide by ${n + 1}: ${a + c}.`);
  },
  (rng) => {
    const A = int(rng, 60, 80);
    const B = int(rng, 70, 85);
    return numeric(rng, `A student's average over 4 subjects is ${A}. What must she score in a fifth subject to raise the average to ${B}?`, 5 * B - 4 * A, `Needed total = 5×${B} = ${5 * B}. Already have 4×${A} = ${4 * A}. Fifth = ${5 * B - 4 * A}.`);
  },
  (rng) => {
    const { n1, a1, n2, a2, ans } = retry(rng, () => {
      const n1x = int(rng, 10, 30);
      const n2x = int(rng, 10, 30);
      const a1x = int(rng, 20, 40);
      const a2x = int(rng, 20, 40);
      const t = (n1x * a1x + n2x * a2x) / (n1x + n2x);
      return Number.isInteger(t) ? { n1: n1x, a1: a1x, n2: n2x, a2: a2x, ans: t } : null;
    });
    return numeric(rng, `A class has ${n1} boys with an average age of ${a1} and ${n2} girls with an average age of ${a2}. What is the average age of the whole class?`, ans, `Weighted mean = (${n1}×${a1} + ${n2}×${a2})/${n1 + n2} = ${n1 * a1 + n2 * a2}/${n1 + n2} = ${ans}.`);
  },
  (rng) => {
    const a = int(rng, 20, 50);
    const d = int(rng, 1, 4);
    return numeric(rng, `A batsman's average after 9 innings is ${a}. After the 10th innings it rises by ${d}. How many runs did he score in the 10th innings?`, a + 10 * d, `Runs = old average + (innings × rise) = ${a} + 10×${d} = ${a + 10 * d}.`);
  },
];

const ratioProportion: Generator[] = [
  (rng) => {
    const a = int(rng, 2, 7);
    const b = int(rng, 3, 9);
    const total = (a + b) * int(rng, 5, 30);
    return numeric(rng, `₹${total} is divided between A and B in the ratio ${a} : ${b}. What is B's share?`, (total / (a + b)) * b, `One part = ${total}/${a + b} = ${total / (a + b)}. B gets ${b} × ${total / (a + b)} = ${(total / (a + b)) * b}.`, { format: rupees });
  },
  (rng) => {
    const r = pick(rng, [
      [2, 3, 5],
      [1, 2, 3],
      [3, 4, 5],
      [2, 5, 7],
    ]);
    const sum = r[0] + r[1] + r[2];
    const total = sum * int(rng, 4, 20);
    return numeric(rng, `A sum of ₹${total} is shared among three people in the ratio ${r.join(" : ")}. What is the largest share?`, (total / sum) * r[2], `One part = ${total}/${sum} = ${total / sum}. Largest = ${r[2]}×${total / sum} = ${(total / sum) * r[2]}.`, { format: rupees });
  },
  (rng) => {
    const { m, d, m2, ans } = retry(rng, () => {
      const m1 = int(rng, 6, 24);
      const d1 = int(rng, 6, 20);
      const m3 = int(rng, 3, 30);
      const x = (m1 * d1) / m3;
      return m1 !== m3 && Number.isInteger(x) ? { m: m1, d: d1, m2: m3, ans: x } : null;
    });
    return numeric(rng, `If ${m} workers build a wall in ${d} days, how many days will ${m2} workers take (same pace)?`, ans, `More workers means fewer days (inverse): ${m}×${d}/${m2} = ${ans}.`);
  },
  (rng) => {
    const { p, q, r, s } = retry(rng, () => {
      const [p2, q2, r2, s2] = [int(rng, 1, 6), int(rng, 2, 8), int(rng, 1, 6), int(rng, 2, 8)];
      return q2 !== r2 ? { p: p2, q: q2, r: r2, s: s2 } : null;
    });
    const n = p * r;
    const d = q * s;
    return choice(rng, `If A : B = ${p} : ${q} and B : C = ${r} : ${s}, then A : C = ?`, `${n / gcd(n, d)} : ${d / gcd(n, d)}`, [`${p} : ${s}`, `${q} : ${r}`, `${p + r} : ${q + s}`, `${n / gcd(n, d) + 1} : ${d / gcd(n, d)}`], `Multiply the chain: (${p}×${r}) : (${q}×${s}) = ${n} : ${d} = ${n / gcd(n, d)} : ${d / gcd(n, d)}.`);
  },
  (rng) => {
    const a = int(rng, 2, 9);
    const b = int(rng, 2, 9) * a;
    const c = int(rng, 2, 12);
    return numeric(rng, `If ${a} : ${b} = ${c} : x, find x.`, (b * c) / a, `x = b×c/a = ${b}×${c}/${a} = ${(b * c) / a}.`);
  },
];

const mensuration: Generator[] = [
  (rng) => {
    const l = int(rng, 8, 30);
    const b = int(rng, 4, l - 1);
    return numeric(rng, `The perimeter of a rectangle is ${2 * (l + b)} m and its length is ${l} m. What is its area (m²)?`, l * b, `Breadth = perimeter/2 − length = ${l + b} − ${l} = ${b}. Area = ${l}×${b} = ${l * b}.`);
  },
  (rng) => {
    const r = 7 * int(rng, 1, 5);
    return numeric(rng, `What is the area of a circle of radius ${r} cm? (π = 22/7)`, (22 * r * r) / 7, `πr² = 22/7 × ${r} × ${r} = ${(22 * r * r) / 7} cm².`);
  },
  (rng) => {
    const l = int(rng, 4, 14);
    const b = int(rng, 3, 10);
    const h = int(rng, 2, 8);
    return numeric(rng, `A cuboid measures ${l} cm × ${b} cm × ${h} cm. What is its total surface area (cm²)?`, 2 * (l * b + b * h + h * l), `2(lb + bh + hl) = 2(${l * b} + ${b * h} + ${h * l}) = ${2 * (l * b + b * h + h * l)}.`);
  },
  (rng) => {
    const r = 7 * int(rng, 1, 3);
    const h = int(rng, 2, 12);
    return numeric(rng, `Find the volume of a cylinder with radius ${r} cm and height ${h} cm. (π = 22/7)`, (22 * r * r * h) / 7, `πr²h = 22/7 × ${r}² × ${h} = ${(22 * r * r * h) / 7} cm³.`);
  },
  (rng) => {
    const a = int(rng, 2, 12);
    return numeric(rng, `The volume of a cube is ${a ** 3} cm³. What is its total surface area (cm²)?`, 6 * a * a, `Side = ∛${a ** 3} = ${a}. Surface area = 6a² = 6 × ${a * a} = ${6 * a * a}.`);
  },
  (rng) => {
    const [a, b, c] = pick(rng, TRIPLES);
    const k = int(rng, 1, 4);
    return numeric(rng, `The sides of a right triangle are ${a * k}, ${b * k} and ${c * k} cm. What is its area (cm²)?`, (a * b * k * k) / 2, `Area = ½ × ${a * k} × ${b * k} = ${(a * b * k * k) / 2}.`);
  },
];

const partnership: Generator[] = [
  (rng) => {
    const a = int(rng, 2, 8) * 1000;
    const b = int(rng, 2, 8) * 1000;
    const profit = (a / 1000 + b / 1000) * int(rng, 100, 400);
    return numeric(rng, `A and B start a business with ₹${a} and ₹${b}. If the annual profit is ₹${profit}, what is A's share?`, (profit * a) / (a + b), `Ratio = ${a} : ${b} = ${a / gcd(a, b)} : ${b / gcd(a, b)}. A's share = ${profit} × ${a}/${a + b} = ${fmt((profit * a) / (a + b))}.`, { format: rupees });
  },
  (rng) => {
    const { c1, m1, c2, m2, profit, ans } = retry(rng, () => {
      const c1x = int(rng, 2, 8) * 1000;
      const c2x = int(rng, 2, 8) * 1000;
      const m1x = 12;
      const m2x = int(rng, 2, 9);
      const w1 = c1x * m1x;
      const w2 = c2x * m2x;
      const px = ((w1 + w2) / 1000) * int(rng, 1, 5) * 20;
      const share = (px * w1) / (w1 + w2);
      return Number.isInteger(share) ? { c1: c1x, m1: m1x, c2: c2x, m2: m2x, profit: px, ans: share } : null;
    });
    return numeric(rng, `A invests ₹${c1} for ${m1} months and B invests ₹${c2} for ${m2} months. Of a total profit of ₹${profit}, what is A's share?`, ans, `Shares ∝ capital × time: ${c1}×${m1} : ${c2}×${m2} = ${c1 * m1} : ${c2 * m2}. A gets ${profit} × ${c1 * m1}/${c1 * m1 + c2 * m2} = ${ans}.`, { format: rupees });
  },
  (rng) => {
    const r = pick(rng, [
      [2, 3, 5],
      [1, 2, 3],
      [3, 4, 5],
      [2, 3, 4],
    ]);
    const sum = r[0] + r[1] + r[2];
    const profit = sum * int(rng, 100, 800);
    return numeric(rng, `A, B and C invest in the ratio ${r.join(" : ")} for the same period. The total profit is ₹${profit}. How much more than A does C get?`, (profit / sum) * (r[2] - r[0]), `One part = ${profit}/${sum} = ${profit / sum}. C − A = (${r[2]} − ${r[0]}) × ${profit / sum} = ${(profit / sum) * (r[2] - r[0])}.`, { format: rupees });
  },
];

const logarithms: Generator[] = [
  (rng) => {
    const [b, k] = pick(rng, [
      [2, 6],
      [2, 7],
      [3, 4],
      [3, 5],
      [5, 3],
      [5, 4],
      [10, 3],
      [4, 3],
      [6, 3],
    ] as const);
    return numeric(rng, `What is log base ${b} of ${b ** k}?`, k, `${b}^${k} = ${b ** k}, so the log is ${k}.`);
  },
  (rng) => {
    const k = int(rng, 2, 5);
    const x = 2 ** int(rng, 1, k - 1);
    const y = 2 ** (k - Math.log2(x));
    return numeric(rng, `Evaluate log₂ ${x} + log₂ ${y}.`, k, `log a + log b = log(ab). ${x} × ${y} = ${x * y} = 2^${k}, so the answer is ${k}.`);
  },
  (rng) => {
    const [b, k] = pick(rng, [
      [2, 3],
      [3, 2],
      [3, 3],
      [5, 2],
      [2, 4],
    ] as const);
    return numeric(rng, `What is log base ${b} of 1/${b ** k}?`, -k, `1/${b ** k} = ${b}^(−${k}), so the log is −${k}.`);
  },
  (rng) => {
    const [x, k] = pick(rng, [
      [3, 4],
      [2, 6],
      [5, 3],
      [4, 3],
      [9, 2],
      [2, 8],
    ] as const);
    return numeric(rng, `If log base x of ${x ** k} = ${k}, what is x?`, x, `x^${k} = ${x ** k}, so x = ${x}.`);
  },
  (rng) => {
    const rows: ReadonlyArray<readonly [string, number, string]> = [
      ["8", 0.903, "3 log 2 = 3 × 0.3010"],
      ["4", 0.602, "2 log 2 = 2 × 0.3010"],
      ["16", 1.204, "4 log 2 = 4 × 0.3010"],
      ["20", 1.301, "log 2 + log 10 = 0.3010 + 1"],
      ["5", 0.699, "log(10/2) = 1 − 0.3010"],
      ["32", 1.505, "5 log 2 = 5 × 0.3010"],
    ];
    const [n, val, why] = pick(rng, rows);
    return numeric(rng, `Given log₁₀ 2 = 0.3010, what is log₁₀ ${n}?`, val, why + ".", { format: (x) => x.toFixed(3) });
  },
];

const percentage: Generator[] = [
  (rng) => {
    const x = pick(rng, [5, 12, 15, 20, 25, 35, 45, 60, 75]);
    const y = int(rng, 4, 40) * 20;
    return numeric(rng, `What is ${x}% of ${y}?`, (x * y) / 100, `${x}% of ${y} = ${x}×${y}/100 = ${fmt((x * y) / 100)}.`);
  },
  (rng) => {
    const b = pick(rng, [40, 50, 80, 120, 150, 200, 250, 400]);
    const p = pick(rng, [10, 15, 20, 25, 30, 40, 60, 75]);
    const a = (b * p) / 100;
    return numeric(rng, `${fmt(a)} is what percent of ${b}?`, p, `(${fmt(a)}/${b}) × 100 = ${p}%.`, { format: pct });
  },
  (rng) => {
    const a = pick(rng, [10, 20, 25, 30, 40, 50]);
    const b = pick(rng, [10, 20, 25, 30, 40]);
    const net = a - b - (a * b) / 100;
    return numeric(rng, `A price is increased by ${a}% and then decreased by ${b}%. What is the net change in percent? (negative means a fall)`, net, `Net = a − b − ab/100 = ${a} − ${b} − ${(a * b) / 100} = ${fmt(net)}%.`, { format: pct });
  },
  (rng) => {
    const a = pick(rng, [10, 20]);
    const P = 100 * int(rng, 10, 80);
    return numeric(rng, `The population of a town is ${P} and grows by ${a}% every year. What will it be after 2 years?`, P * (1 + a / 100) ** 2, `P × (1 + ${a}/100)² = ${P} × ${fmt((1 + a / 100) ** 2)} = ${fmt(P * (1 + a / 100) ** 2)}.`);
  },
  (rng) => {
    const a = pick(rng, [25, 50, 100, 150, 300, 20]);
    const ans = (a / (100 + a)) * 100;
    return numeric(rng, `A's salary is ${a}% more than B's. By what percent is B's salary less than A's?`, ans, `Less% = a/(100 + a) × 100 = ${a}/${100 + a} × 100 = ${fmt(ans)}%.`, { format: pct });
  },
  (rng) => {
    const gap = pick(rng, [5, 10, 20]);
    const p1 = pick(rng, [30, 35, 40]);
    const p2 = p1 + gap;
    const f = int(rng, 3, 12) * 5;
    const g = int(rng, 3, 12) * 5;
    const max = ((f + g) * 100) / gap;
    return numeric(rng, `A student scoring ${p1}% fails by ${f} marks, while one scoring ${p2}% passes by ${g} marks. What are the maximum marks?`, max, `${gap}% of the total = ${f} + ${g} = ${f + g}, so total = ${f + g} × 100/${gap} = ${max}.`);
  },
];

const statistics: Generator[] = [
  (rng) => {
    const n = int(rng, 5, 7);
    const mean = int(rng, 10, 30);
    const nums: number[] = [];
    for (let i = 0; i < n - 1; i++) nums.push(mean + int(rng, -6, 6));
    nums.push(mean * n - nums.reduce((s, x) => s + x, 0));
    return numeric(rng, `Find the mean of ${nums.join(", ")}.`, mean, `Sum = ${mean * n}; mean = ${mean * n}/${n} = ${mean}.`);
  },
  (rng) => {
    const n = pick(rng, [5, 7, 9]);
    const set = new Set<number>();
    while (set.size < n) set.add(int(rng, 3, 60));
    const arr = [...set];
    const sorted = [...arr].sort((x, y) => x - y);
    const med = sorted[(n - 1) / 2];
    return numeric(rng, `Find the median of ${arr.join(", ")}.`, med, `Sorted: ${sorted.join(", ")}. The middle value is ${med}.`);
  },
  (rng) => {
    const mode = int(rng, 4, 30);
    const filler = new Set<number>();
    while (filler.size < 4) {
      const v = int(rng, 3, 40);
      if (v !== mode) filler.add(v);
    }
    const arr = [mode, ...filler, mode, mode];
    arr.sort(() => rng() - 0.5);
    return numeric(rng, `What is the mode of ${arr.join(", ")}?`, mode, `${mode} appears 3 times, more than any other value.`);
  },
  (rng) => {
    const set = new Set<number>();
    while (set.size < 6) set.add(int(rng, 2, 50));
    const sorted = [...set].sort((x, y) => x - y);
    const med = (sorted[2] + sorted[3]) / 2;
    return numeric(rng, `Find the median of ${[...set].join(", ")}.`, med, `Sorted: ${sorted.join(", ")}. Even count: mean of the two middle values (${sorted[2]} + ${sorted[3]})/2 = ${fmt(med)}.`);
  },
  (rng) => {
    const set = new Set<number>();
    while (set.size < 6) set.add(int(rng, 2, 90));
    const arr = [...set];
    return numeric(rng, `What is the range of ${arr.join(", ")}?`, Math.max(...arr) - Math.min(...arr), `Range = max − min = ${Math.max(...arr)} − ${Math.min(...arr)} = ${Math.max(...arr) - Math.min(...arr)}.`);
  },
  (rng) => {
    const m = int(rng, 12, 30);
    const four = [m + int(rng, -5, 5), m + int(rng, -5, 5), m + int(rng, -5, 5), m + int(rng, -5, 5)];
    const fifth = 5 * m - four.reduce((s, x) => s + x, 0);
    return numeric(rng, `The mean of five numbers is ${m}. Four of them are ${four.join(", ")}. What is the fifth?`, fifth, `Total = 5×${m} = ${5 * m}. Fifth = ${5 * m} − ${four.reduce((s, x) => s + x, 0)} = ${fifth}.`);
  },
];

export const QUANT_GENERATORS: Record<string, Generator[]> = {
  "speed-time-distance": speedTimeDistance,
  "number-system": numberSystem,
  "hcf-lcm": hcfLcm,
  "time-work": timeWork,
  "pipes-cisterns": pipesCisterns,
  "trains-boats-streams": trainsBoats,
  "permutation-combination": permComb,
  probability,
  geometry,
  "mixtures-alligations": mixtures,
  algebra,
  "trigonometry-heights": trigonometry,
  progressions,
  ages,
  "profit-loss": profitLoss,
  simplification,
  "simple-interest": simpleInterest,
  "compound-interest": compoundInterest,
  averages,
  "ratio-proportion": ratioProportion,
  mensuration,
  partnership,
  logarithms,
  percentage,
  statistics,
};
