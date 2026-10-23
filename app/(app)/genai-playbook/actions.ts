"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { reviewInputSchema, TASK_ID } from "@/modules/genai-playbook/domain/schemas";
import { saveReview, setTaskDone } from "@/modules/genai-playbook/services/progress";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

async function run(fn: () => Promise<void>, fallback: string): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : fallback };
  }
}

export async function togglePlaybookTaskAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ taskId: z.string().regex(TASK_ID), done: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown task" };
  const today = todayIn(await getSettings());
  return run(() => setTaskDone(parsed.data.taskId, parsed.data.done, today), "Couldn't save");
}

export async function saveReviewAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Scores are out of range" };
  return run(() => saveReview(parsed.data), "Couldn't save");
}
