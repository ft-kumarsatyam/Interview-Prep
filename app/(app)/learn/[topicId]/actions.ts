"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { subtopicNotes } from "@/core/content/notes";
import type { SubtopicNote } from "@/modules/learn/domain/notes";

/** Load one authored lesson body when "Read lesson" opens. */
export async function getSubtopicLessonAction(id: string): Promise<ActionResult<{ note: SubtopicNote }>> {
  await requireSession();
  const parsed = z.string().regex(/^[a-z0-9-]+:\d+$/).max(80).safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown lesson" };
  const note = subtopicNotes.get(parsed.data);
  if (!note) return { ok: false, error: "No lesson for this subtopic" };
  return { ok: true, note };
}
