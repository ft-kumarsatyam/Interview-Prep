"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";
import { INTERVIEW_STATUSES } from "@/lib/domain/web-interview";
import { setInterviewStatus, setLessonDone } from "@/lib/services/webdev";

export async function setInterviewStatusAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ qid: z.string().max(100), status: z.enum(INTERVIEW_STATUSES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown question" };
  try {
    await setInterviewStatus(parsed.data.qid, parsed.data.status, todayIn(await getSettings()));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save" };
  }
}

export async function setLessonDoneAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ lessonId: z.string().max(80), done: z.boolean(), score: z.number().int().min(0).max(100).nullable().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown lesson" };
  try {
    await setLessonDone(parsed.data.lessonId, parsed.data.done, todayIn(await getSettings()), parsed.data.score ?? null);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save" };
  }
}
