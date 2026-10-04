"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { DIFFICULTIES } from "@/modules/quiz/lib/question";
import { CUSTOM_MAX_REFS, startCustomPractice, type PracticeStart } from "@/modules/quiz/services/practice";

const refSchema = z.string().max(80).regex(/^[\w-]+(?::\d+)?$/);
const inputSchema = z.object({
  mode: z.enum(["studied", "picked", "track"]),
  refs: z.array(refSchema).max(CUSTOM_MAX_REFS * 4).optional(),
  track: z.string().max(40).regex(/^[\w-]+$/).optional(),
  size: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  difficulty: z.enum(DIFFICULTIES).nullable().optional(),
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
