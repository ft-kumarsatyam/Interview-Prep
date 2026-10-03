import { subtopicById, subtopics, topicById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { isAnswerCorrect } from "@/lib/domain/quiz";
import { seededRng, seedFrom, shuffle } from "@/lib/domain/sampling";
import { PLANNER_INTAKE_ID, PlannerIntake } from "@/lib/models/planner";
import { bank } from "@/lib/quiz/bank";
import { toPublic, type PublicQuestion } from "@/lib/quiz/question";
import { z } from "zod";
import { getIntake } from "./planner-intake";

export const DIAGNOSTIC_PER_TOPIC = 3;
export const DIAGNOSTIC_MAX_TOPICS = 10;

export interface DiagnosticTopic {
  topicId: string;
  title: string;
  questions: PublicQuestion[];
}

/**
 * A short check of your self-ratings: a few bank questions per rated topic, must-have topics first and topics already
 * checked last. Works with no LLM key. Skippable: nothing depends on it.
 */
export async function startDiagnostic(seed = new Date().toISOString().slice(0, 10)): Promise<DiagnosticTopic[]> {
  const intake = await getIntake();
  const rng = seededRng(seedFrom(`diagnostic:${seed}`));
  const candidates = intake.ratings
    .filter((r) => r.tier !== "skip" && topicById.has(r.topicId))
    .sort((a, b) => Number(a.diagnosticScore !== null) - Number(b.diagnosticScore !== null) || Number(a.tier === "nice") - Number(b.tier === "nice"));
  const out: DiagnosticTopic[] = [];
  for (const r of candidates) {
    if (out.length >= DIAGNOSTIC_MAX_TOPICS) break;
    const pool = subtopics.filter((s) => s.topicId === r.topicId).flatMap((s) => bank().bySubtopic.get(s.id) ?? []);
    const picked = shuffle(pool, rng).slice(0, DIAGNOSTIC_PER_TOPIC);
    if (picked.length === 0) continue;
    out.push({ topicId: r.topicId, title: topicById.get(r.topicId)!.title, questions: picked.map(toPublic) });
  }
  return out;
}

const submissionSchema = z
  .array(z.object({ id: z.string().min(1).max(80), answer: z.number().int().min(0).nullable() }))
  .max(DIAGNOSTIC_MAX_TOPICS * DIAGNOSTIC_PER_TOPIC);

export interface DiagnosticResult {
  topicId: string;
  title: string;
  correct: number;
  total: number;
  pct: number;
}

/** Grades the answers against the bank and stores each topic's score on its rating. Unanswered counts as wrong; unknown ids are rejected. */
export async function submitDiagnostic(raw: unknown): Promise<DiagnosticResult[]> {
  const answers = submissionSchema.parse(raw);
  const tally = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const q = bank().byId.get(a.id);
    const ref = q?.source.ref;
    const topicId = ref ? subtopicById.get(ref)?.topicId : undefined;
    if (!q || !topicId) throw new Error("Unknown question in the diagnostic");
    const t = tally.get(topicId) ?? { correct: 0, total: 0 };
    t.total++;
    if (isAnswerCorrect(q, a.answer)) t.correct++;
    tally.set(topicId, t);
  }
  const rated = new Set((await getIntake()).ratings.map((r) => r.topicId));
  const results = [...tally]
    .filter(([topicId]) => rated.has(topicId))
    .map(([topicId, t]) => ({ topicId, title: topicById.get(topicId)?.title ?? topicId, ...t, pct: Math.round((t.correct / t.total) * 100) }));
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
