import { connectDb } from "@/lib/db";
import type { TopicRating } from "@/lib/domain/planner-intake";
import type { HoursOverride } from "@/lib/domain/time-budget";
import { masteryByTopic, topicWeights, type TopicWeight } from "@/lib/domain/topic-priority";
import { Mastery } from "@/lib/models/learning";
import { PLANNER_INTAKE_ID, PlannerIntake } from "@/lib/models/planner";

export interface Personalisation {
  ratings: TopicRating[];
  weights: Map<string, TopicWeight>;
  overrides: HoursOverride[];
  completed: boolean;
}

/**
 * What the intake changes about planning: topic study weights (self-rating, diagnostic and practice mastery blended)
 * and date-range hours. Read-only and model-only, so the plan service can use it without importing the intake service.
 * Empty until the intake is finished (unless `draft`, for the wizard's live preview), which leaves planning exactly as it was.
 */
export async function loadPersonalisation(opts: { draft?: boolean } = {}): Promise<Personalisation> {
  await connectDb();
  const doc = await PlannerIntake.findById(PLANNER_INTAKE_ID, { topicRatings: 1, availability: 1, completedAt: 1 }).lean();
  if (!doc || (!doc.completedAt && !opts.draft)) return { ratings: [], weights: new Map(), overrides: [], completed: false };
  const ratings: TopicRating[] = (doc.topicRatings ?? []).map((r) => ({
    topicId: r.topicId,
    rating: r.rating,
    wantToLearn: !!r.wantToLearn,
    tier: r.tier ?? "must",
    diagnosticScore: r.diagnosticScore ?? null,
  }));
  const rows = ratings.length ? await Mastery.find({ scope: { $in: ["topic", "subtopic"] } }, { ref: 1, scope: 1, score: 1 }).lean() : [];
  const mastery = masteryByTopic(rows.map((m) => ({ ref: m.ref, scope: m.scope, score: m.score ?? 0 })));
  const overrides = (doc.availability?.overrides ?? []).flatMap((o) => (o.from && o.to && o.hours ? [{ from: o.from, to: o.to, hours: o.hours }] : []));
  return { ratings, weights: topicWeights(ratings, mastery), overrides, completed: !!doc.completedAt };
}
