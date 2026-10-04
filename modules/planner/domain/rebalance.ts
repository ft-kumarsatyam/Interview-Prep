import type { Feasibility } from "@/modules/planner/domain/feasibility";
import type { PlanChangeDraft } from "@/modules/planner/domain/plan-changes";
import type { TopicRating } from "@/modules/planner/domain/planner-intake";
import { ratingFromStrength, type TopicWeight } from "@/modules/planner/domain/topic-priority";

/** A self-rating this far from what the evidence says is worth correcting. */
const RECALIBRATE_GAP = 2;
/** Only add nice-to-have topics back while at least this much slack remains. */
const PROMOTE_SLACK = 0.25;

export type RebalanceAction =
  | { kind: "recalibrate"; topicId: string; from: number; to: number }
  | { kind: "demote"; topicId: string; savesMin: number }
  | { kind: "promote"; topicId: string; costsMin: number };

export interface RebalanceInput {
  ratings: readonly TopicRating[];
  weights: ReadonlyMap<string, TopicWeight>;
  /** Minutes of unfinished theory per topic, at the topic's current weight. */
  openMinutes: ReadonlyMap<string, number>;
  /** Topics with measured evidence (a diagnostic score or practice mastery). Recalibration needs it. */
  measured: ReadonlySet<string>;
  feasibility: Feasibility;
}

/**
 * What to change so the plan fits the evidence and the time left. Deterministic.
 * 1. Recalibrate: a measured topic whose rating is 2+ points off the evidence moves to what it shows.
 * 2. Demote: when the time doesn't cover the work, the strongest must-have topics become nice-to-have until it does.
 * 3. Promote: when there is plenty of slack, nice-to-have topics come back as must-have, weakest first.
 */
export function buildRebalance(input: RebalanceInput): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  for (const r of input.ratings) {
    const w = input.weights.get(r.topicId);
    if (!w || r.tier === "skip" || !input.measured.has(r.topicId)) continue;
    const to = ratingFromStrength(w.strength);
    if (Math.abs(to - r.rating) >= RECALIBRATE_GAP) actions.push({ kind: "recalibrate", topicId: r.topicId, from: r.rating, to });
  }

  const { feasibility: f } = input;
  if (f.gapMin > 0) {
    let saved = 0;
    const strongestFirst = input.ratings
      .filter((r) => r.tier === "must" && (input.openMinutes.get(r.topicId) ?? 0) > 0)
      .sort((a, b) => (input.weights.get(b.topicId)?.strength ?? 0) - (input.weights.get(a.topicId)?.strength ?? 0));
    for (const r of strongestFirst) {
      if (saved >= f.gapMin) break;
      const min = input.openMinutes.get(r.topicId) ?? 0;
      actions.push({ kind: "demote", topicId: r.topicId, savesMin: Math.round(min) });
      saved += min;
    }
  } else if (f.requiredMin > 0 && f.availableMin - f.requiredMin >= f.requiredMin * PROMOTE_SLACK) {
    let slack = f.availableMin - f.requiredMin;
    const weakestFirst = input.ratings
      .filter((r) => r.tier === "nice")
      .sort((a, b) => (input.weights.get(a.topicId)?.strength ?? 0) - (input.weights.get(b.topicId)?.strength ?? 0));
    for (const r of weakestFirst) {
      const min = input.openMinutes.get(r.topicId) ?? 0;
      if (min <= 0 || min > slack) continue;
      actions.push({ kind: "promote", topicId: r.topicId, costsMin: Math.round(min) });
      slack -= min;
    }
  }
  return actions;
}

/** The ratings after the actions. A topic can have several (recalibrate, then demote); unlisted topics are untouched. */
export function applyRebalance(ratings: readonly TopicRating[], actions: readonly RebalanceAction[]): TopicRating[] {
  return ratings.map((r) => {
    let next = { ...r };
    for (const a of actions) {
      if (a.topicId !== r.topicId) continue;
      if (a.kind === "recalibrate") next = { ...next, rating: a.to };
      else next = { ...next, tier: a.kind === "demote" ? "nice" : "must" };
    }
    return next;
  });
}

export function describeAction(a: RebalanceAction, title: (topicId: string) => string): string {
  const t = title(a.topicId);
  if (a.kind === "recalibrate") return `${t}: your rating ${a.from} → ${a.to}, because your quiz results say so`;
  if (a.kind === "demote") return `${t}: must-have → nice-to-have (frees about ${a.savesMin} min)`;
  return `${t}: nice-to-have → must-have (needs about ${a.costsMin} min, and you have the time)`;
}

export function rebalanceChange(date: string, actions: readonly RebalanceAction[], lines: readonly string[]): PlanChangeDraft {
  return {
    type: "rebalance",
    summary: `Applied the weekly rebalance (${actions.length} change${actions.length === 1 ? "" : "s"}): ${lines.join("; ")}.`.slice(0, 400),
    after: actions,
    dedupeKey: `rebalance:${date}`,
  };
}
