"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { interviewSchema, jobCaptureSchema, JOB_STATUSES, profileCaptureSchema, snoozedFollowUp } from "@/modules/jobs/domain/jobs";
import { todayIn } from "@/modules/planner/services/plan";
import { addJob, deleteJob, saveJobNotes, setFollowUp, setInterview, setJobStatus } from "@/modules/jobs/services/jobs";
import { publish } from "@/core/realtime";
import { limited } from "@/core/services/rate-limit";
import { saveProfileSnapshot } from "@/modules/resume/services/resume";
import { getSettings } from "@/modules/settings/services/settings";

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

/** Snooze a follow-up, set your own date, stop it, or record that you followed up (the next nudge is a week out). */
export async function setFollowUpAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .discriminatedUnion("mode", [
      z.object({ id, mode: z.literal("snooze"), days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }),
      z.object({ id, mode: z.literal("date"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
      z.object({ id, mode: z.literal("stop") }),
      z.object({ id, mode: z.literal("done") }),
    ])
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick 1, 3 or 7 days, or a valid date" };
  const d = parsed.data;
  try {
    const today = todayIn(await getSettings());
    if (d.mode === "snooze") await setFollowUp(d.id, { date: snoozedFollowUp(today, d.days) }, today);
    else if (d.mode === "date") await setFollowUp(d.id, { date: d.date }, today);
    else if (d.mode === "stop") await setFollowUp(d.id, { date: null }, today);
    else await setFollowUp(d.id, { followedUp: true }, today);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Your next interview for a job: day, round and contact. It shows on the calendar. */
export async function setInterviewAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id }).and(interviewSchema).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the interview day (a real date, today or later)" };
  try {
    await setInterview(parsed.data.id, { date: parsed.data.date, round: parsed.data.round, contact: parsed.data.contact }, todayIn(await getSettings()));
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
