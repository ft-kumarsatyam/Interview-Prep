import { createHash } from "node:crypto";
import { subtopicById, trackById } from "@/core/content";
import { connectDb } from "@/core/db";
import { GeneratedQuestionRow } from "@/core/models/learning";
import { takeToken } from "@/core/services/rate-limit";
import { runAi } from "@/modules/ai/services/ai";
import { GENERATED_PROMPT_VERSION, generatedSetSchema, generationPrompt, selectNew, subtopicNeedingMost } from "@/modules/quiz/domain/generated";
import { bank } from "@/modules/quiz/lib/bank";
import { quizQuestionSchema, type Difficulty, type QuizQuestion } from "@/modules/quiz/lib/question";

/** At most this many generation calls an hour: it is a free-tier model and each call writes a batch. */
export const GENERATE_LIMIT = { max: 12, windowSec: 3600 };
export const GENERATE_BATCH = 5;

/** Stored model-written questions for these subtopics, as ordinary quiz questions (rated, tagged as model-written). */
export async function loadGenerated(refs: readonly string[]): Promise<QuizQuestion[]> {
  if (refs.length === 0) return [];
  await connectDb();
  const rows = await GeneratedQuestionRow.find({ ref: { $in: [...refs] } }).lean();
  return rows.map((r) =>
    quizQuestionSchema.parse({
      id: `g-${r.qid}`,
      prompt: r.prompt,
      options: r.options,
      answerIndex: r.answerIndex,
      explanation: r.explanation,
      source: { kind: "subtopic", ref: r.ref },
      style: "llm",
      difficulty: r.level,
    }),
  );
}

export type GenerateResult = { ok: true; ref: string; level: Difficulty; added: number; skippedDuplicates: number } | { ok: false; error: string };

/**
 * Asks the model for a fresh batch of questions at one level, drops anything malformed or too like a question you
 * already have, and keeps the rest. For a topic it fills the subtopic with the fewest questions at that level.
 * Free providers only; the answer key is the model's, so it is validated but still marked as model-written.
 */
export async function generateMoreQuestions(ref: string, level: Difficulty, count = GENERATE_BATCH): Promise<GenerateResult> {
  const sub = subtopicById.get(ref);
  if (!sub) return { ok: false, error: "Pick a subtopic to add questions to" };
  const limit = await takeToken("quiz-generate", GENERATE_LIMIT);
  if (!limit.allowed) return { ok: false, error: "You've generated a lot recently. Try again in a little while" };

  const bankQs = bank().bySubtopic.get(ref) ?? [];
  const stored = await loadGenerated([ref]);
  const existing = [...bankQs, ...stored].map((q) => q.prompt);
  const prompt = generationPrompt({ subtopic: sub.title, topic: sub.topicTitle, track: trackById.get(sub.track)?.name ?? sub.track, level, count, avoid: existing });
  const res = await runAi("generate-questions", {}, (llm) => llm.generateJson(prompt, generatedSetSchema(count)));
  if (!res.ok) return { ok: false, error: res.error };

  const picked = selectNew(res.data.questions, existing, count);
  if (picked.accepted.length === 0) return { ok: false, error: "The model's questions were repeats or malformed. Try again" };
  await connectDb();
  const stamp = Date.now().toString(36);
  await GeneratedQuestionRow.insertMany(
    picked.accepted.map((q) => ({
      qid: createHash("sha256").update(`${ref}\u0000${q.prompt}`).digest("hex").slice(0, 16) + stamp,
      ref,
      level,
      prompt: q.prompt,
      options: q.options,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      provider: res.provider ?? null,
      promptVersion: GENERATED_PROMPT_VERSION,
    })),
  );
  return { ok: true, ref, level, added: picked.accepted.length, skippedDuplicates: picked.duplicates };
}

/** For a topic or subtopic ref, the subtopic that should get the next batch at this level. */
export async function generationTarget(subtopicIds: readonly string[], level: Difficulty): Promise<string | null> {
  const stored = await loadGenerated(subtopicIds);
  const counts = new Map<string, number>();
  for (const id of subtopicIds) counts.set(id, (bank().bySubtopic.get(id) ?? []).filter((q) => q.difficulty === level).length);
  for (const q of stored) if (q.difficulty === level) counts.set(q.source.ref, (counts.get(q.source.ref) ?? 0) + 1);
  return subtopicNeedingMost(counts, subtopicIds);
}
