"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { markArticleRead, refreshNews, setBookmark } from "@/lib/services/news";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/);

export async function markReadAction(id: string): Promise<ActionResult<{ readings: number }>> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown article" };
  const { readings } = await markArticleRead(parsed.data);
  refresh();
  return { ok: true, readings };
}

export async function bookmarkAction(input: { id: string; bookmarked: boolean }): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: idSchema, bookmarked: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown article" };
  await setBookmark(parsed.data.id, parsed.data.bookmarked);
  refresh();
  return { ok: true };
}

export async function refreshNewsAction(): Promise<ActionResult<{ inserted: number; failed: number; fresh: boolean }>> {
  await requireSession();
  try {
    const res = await refreshNews({ force: true });
    refresh();
    return res.status === "fresh"
      ? { ok: true, inserted: 0, failed: 0, fresh: true }
      : { ok: true, inserted: res.inserted, failed: res.failed.length, fresh: false };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Refresh failed" };
  }
}
