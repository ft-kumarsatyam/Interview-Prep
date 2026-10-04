"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { DIFFICULTIES, type Difficulty } from "@/modules/quiz/lib/question";
import { startPractice, submitPractice, type PracticeResult, type PracticeStart } from "@/modules/quiz/services/practice";

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong, try again" };
}

/** A subtopic (`topic:3`), topic, case (`case:hld:url-shortener`) or mistakes review (`mistakes`, `mistakes:js`). */
const refSchema = z
  .string()
  .max(120)
  .regex(/^(?:case:(?:hld|os|dbms):[a-z0-9][a-z0-9-]*|mistakes(?::[a-z]+)?|[\w-]+(?::\d+)?)$/);
const difficultySchema = z.enum(DIFFICULTIES).nullable().optional();

export async function startPracticeAction(ref: string, difficulty?: Difficulty | null): Promise<ActionResult<{ run: PracticeStart }>> {
  await requireSession();
  const parsed = refSchema.safeParse(ref);
  if (!parsed.success) return { ok: false, error: "Unknown topic" };
  const level = difficultySchema.safeParse(difficulty);
  if (!level.success) return { ok: false, error: "Unknown difficulty" };
  try {
    return { ok: true, run: await startPractice(parsed.data, undefined, undefined, { difficulty: level.data }) };
  } catch (err) {
    return fail(err);
  }
}

const submitSchema = z.object({
  attemptId: z.string().regex(/^[a-f0-9]{24}$/),
  answers: z.array(z.number().int().min(0).max(63).nullable()).min(1).max(20),
});

export async function submitPracticeAction(input: z.input<typeof submitSchema>): Promise<ActionResult<{ result: PracticeResult }>> {
  await requireSession();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answers" };
  try {
    const result = await submitPractice(parsed.data.attemptId, parsed.data.answers);
    refresh();
    return { ok: true, result };
  } catch (err) {
    return fail(err);
  }
}
