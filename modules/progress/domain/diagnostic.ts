import { shuffle, type Rng } from "@/core/domain/sampling";

export const DIAGNOSTIC_PER_TOPIC = 4;
export const DIAGNOSTIC_MAX_TOPICS = 10;
/** Rough time per question, for the "about N minutes" estimate. */
export const SECONDS_PER_QUESTION = 40;

export interface DiagnosticPoolItem<Q> {
  subtopicId: string;
  question: Q;
  /** Higher is preferred (hand-written over generated). */
  weight: number;
  difficulty?: "easy" | "medium" | "hard";
}

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/**
 * Picks `n` questions that cover as many different subtopics as possible: one per subtopic in a shuffled round-robin,
 * preferring heavier (hand-written) questions, then ordered easy to hard so the check warms up.
 */
export function spreadPick<Q>(pool: readonly DiagnosticPoolItem<Q>[], n: number, rng: Rng): DiagnosticPoolItem<Q>[] {
  const bySub = new Map<string, DiagnosticPoolItem<Q>[]>();
  for (const item of shuffle(pool, rng)) {
    const list = bySub.get(item.subtopicId);
    if (list) list.push(item);
    else bySub.set(item.subtopicId, [item]);
  }
  for (const list of bySub.values()) list.sort((a, b) => b.weight - a.weight);
  const queues = shuffle([...bySub.values()], rng);
  const out: DiagnosticPoolItem<Q>[] = [];
  while (out.length < n && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length >= n) break;
    }
  }
  return out.sort((a, b) => DIFF_ORDER[a.difficulty ?? "medium"] - DIFF_ORDER[b.difficulty ?? "medium"]);
}

/** The 1-5 rating a check score points to. */
export function impliedRating(pct: number): number {
  if (pct >= 85) return 5;
  if (pct >= 65) return 4;
  if (pct >= 45) return 3;
  if (pct >= 25) return 2;
  return 1;
}

export type DiagnosticVerdict = "about-right" | "stronger" | "weaker";

/** How a self-rating compares with a check score. A one-step difference is noise with only a few questions. */
export function diagnosticVerdict(rating: number, pct: number): DiagnosticVerdict {
  const delta = impliedRating(pct) - rating;
  if (delta >= 2) return "stronger";
  if (delta <= -2) return "weaker";
  return "about-right";
}

/** Default topics to check: never-checked first, must-haves before nice-to-haves, the weakest self-ratings first. */
export function defaultCheckSelection(
  candidates: ReadonlyArray<{ topicId: string; rating: number; tier: "must" | "nice"; checked: boolean; questions: number }>,
  max = DIAGNOSTIC_MAX_TOPICS,
): string[] {
  return [...candidates]
    .filter((c) => c.questions > 0)
    .sort((a, b) => Number(a.checked) - Number(b.checked) || Number(a.tier === "nice") - Number(b.tier === "nice") || a.rating - b.rating)
    .slice(0, Math.min(max, 6))
    .map((c) => c.topicId);
}

export const estimateMinutes = (questions: number): number => Math.max(1, Math.round((questions * SECONDS_PER_QUESTION) / 60));
