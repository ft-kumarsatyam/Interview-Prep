"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import { INTERVIEW_LEVELS, INTERVIEW_STATUSES } from "@/modules/learn/domain/web-interview";
import { generateInterviewQuestions } from "@/modules/learn/services/interview-generated";
import { setInterviewStatus, setLessonDone } from "@/modules/learn/services/webdev";

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

const levelSchema = z.enum(INTERVIEW_LEVELS);

/** Asks the model for a few new questions on a track at a level. They join that track's deck and its progress tracking. */
export async function generateInterviewQuestionsAction(input: unknown): Promise<ActionResult<{ added: number; skippedDuplicates: number }>> {
  await requireSession();
  const parsed = z.object({ track: z.string().regex(/^[a-z0-9-]+$/).max(60), level: levelSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a track and a level" };
  const res = await generateInterviewQuestions(parsed.data.track, parsed.data.level);
  if (!res.ok) return res;
  refresh();
  return { ok: true, added: res.added, skippedDuplicates: res.skippedDuplicates };
}
