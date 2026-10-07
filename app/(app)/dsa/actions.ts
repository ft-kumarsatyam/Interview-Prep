"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { completeExternalQuestion } from "@/modules/dsa/services/external-progress";

const externalProgressSchema = z.object({
  itemId: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(["not-started", "in-progress", "completed"]),
  timeTakenMin: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(20_000).optional(),
  gfgCompleted: z.boolean().optional(),
});

export async function updateExternalProgressAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = externalProgressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid external question progress" };
  await completeExternalQuestion(parsed.data.itemId, parsed.data);
  refresh();
  return { ok: true };
}
