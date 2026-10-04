"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { isDateStr } from "@/core/domain/dates";
import { startQuiz, submitQuiz, type QuizSnapshot, type SubmitResult } from "@/modules/quiz/services/quiz";

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong, try again" };
}

export async function startQuizAction(): Promise<ActionResult<{ quiz: QuizSnapshot }>> {
  await requireSession();
  try {
    return { ok: true, quiz: await startQuiz() };
  } catch (err) {
    return fail(err);
  }
}

const submitSchema = z.object({
  date: z.string().refine(isDateStr),
  kind: z.enum(["daily", "weekly"]),
  answers: z.array(z.number().int().min(0).max(63).nullable()).min(1).max(40),
});

export async function submitQuizAction(input: z.input<typeof submitSchema>): Promise<ActionResult<{ result: SubmitResult }>> {
  await requireSession();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answers" };
  try {
    const result = await submitQuiz(parsed.data);
    refresh();
    return { ok: true, result };
  } catch (err) {
    return fail(err);
  }
}
