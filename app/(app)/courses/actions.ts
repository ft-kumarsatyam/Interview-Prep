"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { setCourseLessonDone } from "@/modules/course/services/progress";
import { confirmLessonSubtopic } from "@/modules/progress/services/lesson-confirm";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export async function setCourseLessonDoneAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({ courseId: z.string().max(60), lessonId: z.string().max(80), done: z.boolean(), score: z.number().int().min(0).max(100).nullable().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown lesson" };
  try {
    await setCourseLessonDone(parsed.data.courseId, parsed.data.lessonId, parsed.data.done, todayIn(await getSettings()), parsed.data.score ?? null);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save" };
  }
}

/** "Mark the topic done in my plan too": ticks the syllabus subtopic a finished lesson teaches. Only a confirmed tick counts for the plan and streak. */
export async function confirmLessonSubtopicAction(input: unknown): Promise<ActionResult<{ subtopicId: string; already: boolean; justCompleted: boolean }>> {
  await requireSession();
  const parsed = z.object({ courseId: z.string().max(60), lessonId: z.string().max(80) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown lesson" };
  try {
    const res = await confirmLessonSubtopic(parsed.data.courseId, parsed.data.lessonId, todayIn(await getSettings()));
    refresh();
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save" };
  }
}
