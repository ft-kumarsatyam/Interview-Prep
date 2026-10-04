"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/core/auth/dal";
import { capturedNoteInputSchema, capturedNotePatchSchema } from "@/modules/notes/domain/notes";
import { createCapturedNote, deleteCapturedNote, updateCapturedNote } from "@/modules/notes/services/notes";
import type { ActionResult } from "@/app/(app)/dashboard/actions";

export async function createCapturedNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = capturedNoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not save note" };
  try {
    const note = await createCapturedNote(parsed.data);
    refresh();
    return { ok: true, id: note.id };
  } catch {
    return { ok: false, error: "Could not save note" };
  }
}

export async function updateCapturedNoteAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = capturedNotePatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Could not update note" };
  try {
    await updateCapturedNote(parsed.data);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update note" };
  }
}

export async function deleteCapturedNoteAction(id: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.string().regex(/^[a-f0-9]{24}$/).safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown note" };
  try {
    await deleteCapturedNote(parsed.data);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete note" };
  }
}
