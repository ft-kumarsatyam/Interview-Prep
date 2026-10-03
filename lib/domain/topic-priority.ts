import { ratingToWeight, type Tier, type TopicRating } from "./planner-intake";

/** Evidence outweighs opinion: a measured score counts more than how strong you feel. */
const SELF_W = 1;
const DIAGNOSTIC_W = 1.5;
const MASTERY_W = 2;

/** How strong you are in a topic, 0-100: your rating blended with the diagnostic and your practice mastery when they exist. */
export function strengthPct(rating: number, diagnosticScore: number | null, masteryScore: number | null): number {
  const self = (Math.min(5, Math.max(1, rating)) - 1) * 25;
  let sum = self * SELF_W;
  let weight = SELF_W;
  if (diagnosticScore !== null) {
    sum += Math.min(100, Math.max(0, diagnosticScore)) * DIAGNOSTIC_W;
    weight += DIAGNOSTIC_W;
  }
  if (masteryScore !== null) {
    sum += Math.min(100, Math.max(0, masteryScore)) * MASTERY_W;
    weight += MASTERY_W;
  }
  return sum / weight;
}

/** The 1-5 rating a strength percentage corresponds to. */
export const ratingFromStrength = (pct: number): number => Math.min(5, Math.max(1, Math.round(1 + pct / 25)));

export interface TopicWeight {
  topicId: string;
  strength: number;
  weight: number;
  tier: Tier;
}

/** Study weight per rated topic. Topics you haven't rated are absent: callers treat them as neutral (weight 1). */
export function topicWeights(ratings: readonly TopicRating[], masteryByTopic: ReadonlyMap<string, number> = new Map()): Map<string, TopicWeight> {
  const out = new Map<string, TopicWeight>();
  for (const r of ratings) {
    const strength = strengthPct(r.rating, r.diagnosticScore, masteryByTopic.get(r.topicId) ?? null);
    out.set(r.topicId, { topicId: r.topicId, strength, weight: ratingToWeight(ratingFromStrength(strength), r.tier, r.wantToLearn), tier: r.tier });
  }
  return out;
}

/** Mastery per topic from stored rows: the topic quiz score when there is one, else the mean of its subtopics' practice scores. */
export function masteryByTopic(rows: ReadonlyArray<{ ref: string; scope: string; score: number }>): Map<string, number> {
  const direct = new Map<string, number>();
  const sub = new Map<string, number[]>();
  for (const r of rows) {
    if (r.scope === "topic") direct.set(r.ref, r.score);
    else if (r.scope === "subtopic") {
      const topicId = r.ref.slice(0, r.ref.lastIndexOf(":"));
      if (topicId) sub.set(topicId, [...(sub.get(topicId) ?? []), r.score]);
    }
  }
  const out = new Map(direct);
  for (const [topicId, scores] of sub) if (!out.has(topicId)) out.set(topicId, scores.reduce((a, b) => a + b, 0) / scores.length);
  return out;
}
