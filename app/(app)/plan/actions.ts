"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { plannerInputSchema } from "@/lib/domain/planner-profile";
import { STUDY_KINDS } from "@/lib/domain/study";
import { savePlanner } from "@/lib/services/planner";
import { deleteStudySession, logStudySession } from "@/lib/services/study";

export async function savePlannerAction(input: unknown): Promise<ActionResult<{ changes: number }> | { ok: false; error: string; fields: Record<string, string> }> {
  await requireSession();
  const parsed = plannerInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return { ok: false, error: "Some fields need fixing", fields };
  }
  try {
    const { changes } = await savePlanner(parsed.data);
    refresh();
    return { ok: true, changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save", fields: {} };
  }
}

const studySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(720),
  kind: z.enum(STUDY_KINDS),
  note: z.string().trim().max(200).optional(),
  source: z.enum(["timer", "manual"]),
});

export async function logStudyAction(input: z.input<typeof studySchema>): Promise<ActionResult<{ minutes: number }>> {
  await requireSession();
  const parsed = studySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter 1 to 720 minutes" };
  const saved = await logStudySession(parsed.data);
  refresh();
  return { ok: true, minutes: saved.minutes };
}

export async function deleteStudyAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: "Unknown session" };
  await deleteStudySession(id);
  refresh();
  return { ok: true };
}
