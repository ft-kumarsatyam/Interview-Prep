"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { jobCaptureSchema, JOB_STATUSES, profileCaptureSchema } from "@/lib/domain/jobs";
import { todayIn } from "@/lib/services/plan";
import { addJob, deleteJob, saveJobNotes, setJobStatus } from "@/lib/services/jobs";
import { publish } from "@/lib/realtime";
import { limited } from "@/lib/services/rate-limit";
import { saveProfileSnapshot } from "@/lib/services/resume";
import { getSettings } from "@/lib/services/settings";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown job");
const message = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

/** The add-a-job form and the extension's capture both land here. The payload is untrusted website text, so it is validated and capped. */
export async function addJobAction(input: unknown): Promise<ActionResult<{ id: string; duplicate: boolean }>> {
  await requireSession();
  const wait = await limited("capture");
  if (wait) return { ok: false, error: wait };
  const parsed = jobCaptureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the job details" };
  try {
    const res = await addJob(parsed.data, todayIn(await getSettings()));
    if (!res.ok) return res;
    if (!res.duplicate) await publish({ type: "capture", kind: "job" });
    refresh();
    return { ok: true, id: res.job.id, duplicate: res.duplicate };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function captureProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = profileCaptureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That page didn't have enough text to audit" };
  try {
    const p = await saveProfileSnapshot(parsed.data);
    await publish({ type: "capture", kind: "profile" });
    refresh();
    return { ok: true, id: p.id };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function setJobStatusAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, status: z.enum(JOB_STATUSES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown status" };
  try {
    await setJobStatus(parsed.data.id, parsed.data.status, todayIn(await getSettings()));
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function saveJobNotesAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, notes: z.string().max(2000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Notes are too long" };
  await saveJobNotes(parsed.data.id, parsed.data.notes);
  refresh();
  return { ok: true };
}

export async function deleteJobAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown job" };
  try {
    await deleteJob(parsed.data.id);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
