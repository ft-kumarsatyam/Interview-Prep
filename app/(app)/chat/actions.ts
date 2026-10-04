"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { objectIdSchema } from "@/modules/chat/domain/chat-events";
import { deleteThread, renameThread, setThreadArchived } from "@/modules/chat/services/chat";

const renameSchema = z.object({ id: objectIdSchema, title: z.string().trim().min(1, "Give it a name").max(80) });

export async function renameThreadAction(input: z.input<typeof renameSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  return (await renameThread(parsed.data.id, parsed.data.title)) ? { ok: true } : { ok: false, error: "That conversation no longer exists" };
}

const archiveSchema = z.object({ id: objectIdSchema, archived: z.boolean() });

export async function archiveThreadAction(input: z.input<typeof archiveSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid conversation" };
  return (await setThreadArchived(parsed.data.id, parsed.data.archived)) ? { ok: true } : { ok: false, error: "That conversation no longer exists" };
}

export async function deleteThreadAction(id: string): Promise<ActionResult> {
  await requireSession();
  const parsed = objectIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid conversation" };
  return (await deleteThread(parsed.data)) ? { ok: true } : { ok: false, error: "That conversation no longer exists" };
}
