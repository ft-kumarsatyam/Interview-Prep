import { shuffle, type Rng } from "@/core/domain/sampling";

export interface AptitudeQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  /** The worked solution, ideally showing the fast way. */
  explanation: string;
  /** Hand-written questions only: stable across drills, used to rotate the bank. */
  key?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export type QuestionDraft = Omit<AptitudeQuestion, "id" | "topic" | "key" | "difficulty">;
export type Generator = (rng: Rng) => QuestionDraft;

export const int = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}
export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/** Strip float noise: 0.30000000000000004 → "0.3". */
export function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

/** Reduced fraction text: 6/36 → "1/6", 4/2 → "2". */
export function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
}

/** Retry a generator body that may produce a non-integer or degenerate case. */
export function retry<T>(rng: Rng, fn: () => T | null, tries = 200): T {
  for (let i = 0; i < tries; i++) {
    const out = fn();
    if (out !== null) return out;
  }
  throw new Error("generator could not find a valid case");
}

/** Four options with the answer at a random position. Wrong options are de-duplicated; throws if fewer than three remain. */
export function choice(rng: Rng, prompt: string, correct: string, wrong: readonly string[], explanation: string): QuestionDraft {
  const seen = new Set<string>([correct]);
  const picked: string[] = [];
  for (const w of shuffle(wrong, rng)) {
    if (!seen.has(w)) {
      seen.add(w);
      picked.push(w);
    }
    if (picked.length === 3) break;
  }
  if (picked.length < 3) throw new Error(`not enough distinct options for: ${prompt}`);
  const options = shuffle([correct, ...picked], rng);
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

/**
 * Plausible wrong numbers: the caller's likely mistakes first, then the closest
 * values (off by one step, doubled, halved), so a wrong option never looks absurd.
 */
export function nearbyNumbers(rng: Rng, correct: number, extra: readonly number[] = []): number[] {
  const integer = Number.isInteger(correct);
  const unit = integer ? Math.max(1, Math.round(Math.abs(correct) / 10)) : Math.max(0.01, Number((Math.abs(correct) / 10).toFixed(2)));
  const valid = (c: number) => Number.isFinite(c) && c !== correct && (correct < 0 || c >= 0) && (correct !== 0 || c > 0);
  const traps = shuffle(extra.filter(valid), rng);
  const near = [correct + unit, correct - unit, correct + 2 * unit, correct - 2 * unit, correct + 3 * unit, correct - 3 * unit, correct * 2];
  if (integer && correct % 2 === 0) near.push(correct / 2);
  for (let k = 4; k < 10; k++) near.push(correct + k * unit, correct - k * unit);
  const ranked = near
    .filter(valid)
    .map((c) => ({ c, d: Math.abs(c - correct) / unit + rng() * 1.5 }))
    .sort((x, y) => x.d - y.d)
    .map((x) => x.c);
  return [...traps.slice(0, 2), ...ranked];
}

export function numeric(
  rng: Rng,
  prompt: string,
  correct: number,
  explanation: string,
  opts: { format?: (n: number) => string; near?: readonly number[] } = {},
): QuestionDraft {
  const f = opts.format ?? fmt;
  return choice(rng, prompt, f(correct), nearbyNumbers(rng, correct, opts.near).map(f), explanation);
}

export const rupees = (n: number): string => `₹${fmt(n)}`;
export const pct = (n: number): string => `${fmt(n)}%`;
