"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/dal";
import { deleteSnippet, saveSnippet } from "@/lib/services/snippets";
import type { ActionResult } from "../dashboard/actions";

const snippetSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(1, "Give the snippet a title").max(120),
  code: z.string().min(1, "Nothing to save").max(20_000),
  tag: z.string().trim().max(120).default(""),
  language: z.enum(["javascript", "typescript", "python"]).default("javascript"),
});

export async function saveSnippetAction(input: z.input<typeof snippetSchema>): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = snippetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid snippet" };
  try {
    const id = await saveSnippet(parsed.data);
    refresh();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" };
  }
}

export async function deleteSnippetAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!/^[a-f\d]{24}$/i.test(id)) return { ok: false, error: "Unknown snippet" };
  await deleteSnippet(id);
  refresh();
  return { ok: true };
}
