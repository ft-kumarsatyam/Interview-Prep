import { weightedSample, type Rng } from "@/core/domain/sampling";

/** Weight of the newest practice score in the rolling mastery average. */
export const MASTERY_ALPHA = 0.4;
export const SUBTOPIC_PRACTICE_SIZE = 5;
export const TOPIC_QUIZ_SIZE = 10;

/** Exponential moving average of practice scores; the first attempt sets the score outright. */
export function nextMasteryScore(prev: { score: number; attempts: number } | null, pct: number, alpha = MASTERY_ALPHA): number {
  const clamped = Math.min(100, Math.max(0, pct));
  if (!prev || prev.attempts === 0) return Math.round(clamped);
  return Math.round(alpha * clamped + (1 - alpha) * prev.score);
}

/** The topic quiz opens once every subtopic in the topic is ticked. */
export function canTakeTopicQuiz(subtopicIds: readonly string[], done: ReadonlySet<string>): boolean {
  return subtopicIds.length > 0 && subtopicIds.every((id) => done.has(id));
}

export function passesTopicQuiz(pct: number, thresholdPct: number): boolean {
  return pct >= thresholdPct;
}

/** Weak or unpractised subtopics get up to 5× the weight of mastered ones. */
export function subtopicWeight(score: number | undefined): number {
  return 1 + (100 - Math.min(100, Math.max(0, score ?? 0))) / 25;
}

/**
 * Pick `n` questions across a topic's subtopics, drawing each slot from a
 * subtopic chosen by weakness, then a question within it by `questionWeight`.
 * Subtopics drop out once their questions run out.
 */
export function pickTopicQuestions<T extends { id: string }>(
  bySubtopic: ReadonlyMap<string, readonly T[]>,
  scores: Readonly<Record<string, number>>,
  n: number,
  rng: Rng,
  questionWeight: (q: T) => number = () => 1,
): T[] {
  const remaining = new Map([...bySubtopic].map(([ref, qs]) => [ref, [...qs]]));
  const picked: T[] = [];
  const seen = new Set<string>();
  while (picked.length < n) {
    const refs = [...remaining.keys()].filter((r) => remaining.get(r)!.length > 0);
    if (refs.length === 0) break;
    const [ref] = weightedSample(refs, (r) => subtopicWeight(scores[r]), 1, rng);
    const qs = remaining.get(ref)!;
    const [chosen] = weightedSample(qs, (x) => Math.max(questionWeight(x), 0.01), 1, rng);
    const q = qs.splice(qs.indexOf(chosen), 1)[0];
    if (!seen.has(q.id)) {
      seen.add(q.id);
      picked.push(q);
    }
  }
  return picked;
}
