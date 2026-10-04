"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { ensureArticleContent, getArticle, markArticleRead, refreshNews, retryArticleContent, setBookmark } from "@/modules/news/services/news";

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

export type ArticleBodyResult =
  | { ok: true; status: "ready"; markdown: string; readingMinutes: number | null }
  | { ok: true; status: "headline" }
  | { ok: true; status: "failed"; error: string; waitSec?: number }
  | { ok: false; error: string };

async function bodyResult(id: string): Promise<ArticleBodyResult> {
  const a = await getArticle(id);
  if (!a) return { ok: false, error: "Unknown article" };
  if (a.contentStatus === "headline") return { ok: true, status: "headline" };
  if (a.content && (a.contentStatus === "full" || a.contentStatus === "extracted")) {
    return { ok: true, status: "ready", markdown: a.content, readingMinutes: a.readingMinutes };
  }
  return { ok: true, status: "failed", error: a.contentError ?? "The page could not be read" };
}

/** Loads the article body after the page has rendered, so the reader never waits on the extractor. */
export async function loadArticleBodyAction(id: string): Promise<ArticleBodyResult> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown article" };
  try {
    await ensureArticleContent(parsed.data);
    return await bodyResult(parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not load the article" };
  }
}

/** Retry a failed extraction (once a minute per article). */
export async function retryArticleBodyAction(id: string): Promise<ArticleBodyResult> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown article" };
  try {
    const res = await retryArticleContent(parsed.data);
    const body = await bodyResult(parsed.data);
    if (res.status === "rate-limited" && body.ok && body.status === "failed") return { ...body, waitSec: res.waitSec };
    return body;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not load the article" };
  }
}
