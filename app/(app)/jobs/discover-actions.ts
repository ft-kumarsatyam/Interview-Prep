"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { jobPrefsSchema, type JobPrefs } from "@/lib/domain/job-match";
import type { SyncSummary } from "@/lib/services/job-sync";
import { alertNewJobs } from "@/lib/services/job-alerts";
import { addCustomSource, markPostingApplied, refreshSources, removeCustomSource, saveJobPrefs, savePosting, setDismissed, setSourceEnabled } from "@/lib/services/job-discovery";
import { todayIn } from "@/lib/services/plan";
import { limited } from "@/lib/services/rate-limit";
import { getSettings } from "@/lib/services/settings";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown job");
const fail = (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : "Something went wrong" });

export async function savePrefsAction(input: unknown): Promise<ActionResult<{ prefs: JobPrefs }>> {
  await requireSession();
  const parsed = jobPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your preferences" };
  const prefs = await saveJobPrefs(parsed.data);
  refresh();
  return { ok: true, prefs };
}

export async function setDismissedAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, dismissed: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown job" };
  try {
    await setDismissed(parsed.data.id, parsed.data.dismissed);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function savePostingAction(input: unknown): Promise<ActionResult<{ jobId: string; duplicate: boolean }>> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown job" };
  const res = await savePosting(parsed.data.id, todayIn(await getSettings()));
  if (!res.ok) return res;
  refresh();
  return { ok: true, jobId: res.jobId, duplicate: res.duplicate };
}

export async function markPostingAppliedAction(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown job" };
  try {
    const res = await markPostingApplied(parsed.data.id, todayIn(await getSettings()));
    if (!res.ok) return res;
    refresh();
    return { ok: true, jobId: res.jobId };
  } catch (err) {
    return fail(err);
  }
}

/** Reads sources right now. Needs the page's 60 s budget, so the pages that call it set `maxDuration`. */
export async function refreshJobsAction(input: unknown): Promise<ActionResult<{ summary: Omit<SyncSummary, "failed"> & { failed: number } }>> {
  await requireSession();
  const wait = await limited("jobRefresh");
  if (wait) return { ok: false, error: wait };
  const parsed = z.object({ ids: z.array(z.string().max(80)).max(10).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown source" };
  try {
    const s = await refreshSources(parsed.data.ids);
    if (s.status === "done") await alertNewJobs().catch(() => undefined);
    refresh();
    return { ok: true, summary: { ...s, failed: s.failed.length } };
  } catch (err) {
    return fail(err);
  }
}

export async function setSourceEnabledAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: z.string().max(80), enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown source" };
  try {
    await setSourceEnabled(parsed.data.id, parsed.data.enabled);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addSourceAction(input: unknown): Promise<ActionResult<{ name: string; count: number }>> {
  await requireSession();
  const wait = await limited("addSource");
  if (wait) return { ok: false, error: wait };
  const parsed = z.object({ url: z.string().trim().max(500), tier: z.string().trim().max(40).default("") }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paste the link to the company's job board" };
  const res = await addCustomSource(parsed.data.url, parsed.data.tier);
  if (!res.ok) return res;
  refresh();
  return { ok: true, name: res.name, count: res.count };
}

export async function removeSourceAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: z.string().max(80) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown source" };
  try {
    await removeCustomSource(parsed.data.id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
