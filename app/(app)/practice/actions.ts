"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { DIFFICULTIES, QUESTION_FOCUS } from "@/modules/quiz/lib/question";
import { FLAG_REASONS } from "@/modules/quiz/lib/flag-reasons";
import { flagQuestion } from "@/modules/quiz/services/question-flags";
import { CUSTOM_MAX_REFS, startCustomPractice, type PracticeStart } from "@/modules/quiz/services/practice";

const refSchema = z.string().max(80).regex(/^[\w-]+(?::\d+)?$/);
const inputSchema = z.object({
  mode: z.enum(["studied", "picked", "track"]),
  refs: z.array(refSchema).max(CUSTOM_MAX_REFS * 4).optional(),
  track: z.string().max(40).regex(/^[\w-]+$/).optional(),
  size: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  difficulty: z.enum(DIFFICULTIES).nullable().optional(),
  focus: z.enum(QUESTION_FOCUS).optional(),
});

/** Starts a quiz on topics you picked, on everything you have studied, or on a whole subject. Answers go through submitPracticeAction. */
export async function startCustomPracticeAction(input: unknown): Promise<ActionResult<{ run: PracticeStart }>> {
  await requireSession();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the quiz options" };
  try {
    return { ok: true, run: await startCustomPractice(parsed.data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong, try again" };
  }
}

const flagSchema = z.object({
  qid: z.string().min(1).max(80),
  reason: z.enum(FLAG_REASONS),
  note: z.string().trim().max(300).optional(),
});

/** Reports a question that looks wrong, unclear or outdated. It is left out of your future quizzes. */
export async function flagQuestionAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the report" };
  try {
    await flagQuestion(parsed.data.qid, parsed.data.reason, parsed.data.note ?? "");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong, try again" };
  }
}
