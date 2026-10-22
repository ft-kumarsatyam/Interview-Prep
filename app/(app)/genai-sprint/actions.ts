"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { todayIn } from "@/modules/planner/services/plan";
import { importSprintProgress, setPinnedBlock, setTaskDone } from "@/modules/genai-sprint/services/progress";
import { getSettings } from "@/modules/settings/services/settings";

const taskId = z.string().regex(/^d\d+t\d+$/);

async function run(fn: () => Promise<void>, fallback: string): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : fallback };
  }
}

export async function toggleSprintTaskAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ taskId, done: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown task" };
  const today = todayIn(await getSettings());
  return run(() => setTaskDone(parsed.data.taskId, parsed.data.done, today), "Couldn't save");
}

export async function pinSprintBlockAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ blockId: z.string().max(20).nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown block" };
  return run(() => setPinnedBlock(parsed.data.blockId), "Couldn't save");
}

export async function importSprintProgressAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({
      completed: z.record(z.string(), z.string()),
      pinnedBlockId: z.string().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid backup" };
  const today = todayIn(await getSettings());
  return run(() => importSprintProgress(parsed.data, today), "Couldn't import");
}
