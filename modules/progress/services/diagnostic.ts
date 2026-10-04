import { subtopicById, subtopics, topicById } from "@/core/content";
import { connectDb } from "@/core/db";
import {
  defaultCheckSelection,
  DIAGNOSTIC_MAX_TOPICS,
  DIAGNOSTIC_PER_TOPIC,
  diagnosticVerdict,
  spreadPick,
  type DiagnosticPoolItem,
  type DiagnosticVerdict,
} from "@/modules/progress/domain/diagnostic";
import { isAnswerCorrect } from "@/modules/quiz/domain/quiz";
import { seededRng, seedFrom } from "@/core/domain/sampling";
import { PLANNER_INTAKE_ID, PlannerIntake } from "@/core/models/planner";
import { bank, questionWeight } from "@/modules/quiz/lib/bank";
import { toPublic, type PublicQuestion, type QuizQuestion } from "@/modules/quiz/lib/question";
import { z } from "zod";
import { getIntake } from "@/modules/planner/services/planner-intake";

export { DIAGNOSTIC_MAX_TOPICS, DIAGNOSTIC_PER_TOPIC };

export interface DiagnosticCandidate {
  topicId: string;
  title: string;
  rating: number;
  tier: "must" | "nice";
  /** Last check score (0-100), or null if never checked. */
  lastScore: number | null;
  /** How many bank questions exist for the topic; 0 means it can't be checked yet. */
  questions: number;
}

export interface DiagnosticQuestion extends PublicQuestion {
  subtopic: string;
}

export interface DiagnosticTopic {
  topicId: string;
  title: string;
  rating: number;
  questions: DiagnosticQuestion[];
}

function poolFor(topicId: string): DiagnosticPoolItem<QuizQuestion>[] {
  return subtopics
    .filter((s) => s.topicId === topicId)
    .flatMap((s) => (bank().bySubtopic.get(s.id) ?? []).map((q) => ({ subtopicId: s.id, question: q, weight: questionWeight(q), difficulty: q.difficulty })));
}

/** Rated, not-skipped topics you could check, with the suggested default selection. */
export async function diagnosticCandidates(): Promise<{ candidates: DiagnosticCandidate[]; suggested: string[] }> {
  const intake = await getIntake();
  const candidates = intake.ratings
    .filter((r): r is typeof r & { tier: "must" | "nice" } => r.tier !== "skip" && topicById.has(r.topicId))
    .map((r) => ({ topicId: r.topicId, title: topicById.get(r.topicId)!.title, rating: r.rating, tier: r.tier, lastScore: r.diagnosticScore, questions: poolFor(r.topicId).length }));
  const suggested = defaultCheckSelection(candidates.map((c) => ({ ...c, checked: c.lastScore !== null })));
  return { candidates, suggested };
}

/**
 * A short check of your self-ratings for the topics you pick (or the suggested ones): a few bank questions per topic,
 * spread across its subtopics and ordered easy to hard. Works with no LLM key. Skippable: nothing depends on it.
 */
export async function startDiagnostic(seed = new Date().toISOString().slice(0, 10), topicIds?: readonly string[]): Promise<DiagnosticTopic[]> {
  const intake = await getIntake();
  const rng = seededRng(seedFrom(`diagnostic:${seed}`));
  const ratingOf = new Map(intake.ratings.filter((r) => r.tier !== "skip").map((r) => [r.topicId, r]));
  const chosen = topicIds?.length ? topicIds.filter((id) => ratingOf.has(id)) : (await diagnosticCandidates()).suggested;
  const out: DiagnosticTopic[] = [];
  for (const topicId of chosen) {
    if (out.length >= DIAGNOSTIC_MAX_TOPICS) break;
    const topic = topicById.get(topicId);
    if (!topic) continue;
    const picked = spreadPick(poolFor(topicId), DIAGNOSTIC_PER_TOPIC, rng);
    if (picked.length === 0) continue;
    out.push({
      topicId,
      title: topic.title,
      rating: ratingOf.get(topicId)!.rating,
      questions: picked.map((p) => ({ ...toPublic(p.question), subtopic: subtopicById.get(p.subtopicId)?.title ?? "" })),
    });
  }
  return out;
}

export const startSchema = z.array(z.string().trim().min(1).max(80)).max(DIAGNOSTIC_MAX_TOPICS);

const submissionSchema = z
  .array(z.object({ id: z.string().min(1).max(80), answer: z.number().int().min(0).nullable() }))
  .max(DIAGNOSTIC_MAX_TOPICS * DIAGNOSTIC_PER_TOPIC);

export interface DiagnosticResult {
  topicId: string;
  title: string;
  correct: number;
  total: number;
  pct: number;
  rating: number;
  verdict: DiagnosticVerdict;
  /** Subtopics with a wrong or skipped answer: good first things to study. */
  missed: string[];
}

/** Grades the answers against the bank and stores each topic's score on its rating. Unanswered counts as wrong; unknown ids are rejected. */
export async function submitDiagnostic(raw: unknown): Promise<DiagnosticResult[]> {
  const answers = submissionSchema.parse(raw);
  const tally = new Map<string, { correct: number; total: number; missed: Set<string> }>();
  for (const a of answers) {
    const q = bank().byId.get(a.id);
    const ref = q?.source.ref;
    const sub = ref ? subtopicById.get(ref) : undefined;
    if (!q || !sub) throw new Error("Unknown question in the check");
    const t = tally.get(sub.topicId) ?? { correct: 0, total: 0, missed: new Set<string>() };
    t.total++;
    if (isAnswerCorrect(q, a.answer)) t.correct++;
    else t.missed.add(sub.title);
    tally.set(sub.topicId, t);
  }
  const ratingOf = new Map((await getIntake()).ratings.map((r) => [r.topicId, r.rating]));
  const results = [...tally]
    .filter(([topicId]) => ratingOf.has(topicId))
    .map(([topicId, t]): DiagnosticResult => {
      const pct = Math.round((t.correct / t.total) * 100);
      const rating = ratingOf.get(topicId)!;
      return { topicId, title: topicById.get(topicId)?.title ?? topicId, correct: t.correct, total: t.total, pct, rating, verdict: diagnosticVerdict(rating, pct), missed: [...t.missed] };
    });
  if (results.length === 0) return [];
  await connectDb();
  await PlannerIntake.bulkWrite(
    results.map((r) => ({
      updateOne: {
        filter: { _id: PLANNER_INTAKE_ID },
        update: { $set: { "topicRatings.$[t].diagnosticScore": r.pct } },
        arrayFilters: [{ "t.topicId": r.topicId }],
      },
    })),
  );
  return results;
}
