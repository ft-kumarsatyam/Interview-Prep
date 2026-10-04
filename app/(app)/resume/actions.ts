"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { RESUME_TEXT_MAX } from "@/lib/domain/resume";
import type { ResumeRoast } from "@/lib/domain/resume-ai";
import type { Change, Rejected } from "@/lib/domain/resume-tailor";
import { scoreResume } from "@/lib/domain/ats";
import { attachResumeToJob } from "@/lib/services/jobs";
import { limited } from "@/lib/services/rate-limit";
import { createVersion, deleteVersion, roastBaseResume, saveBaseResume, tailorBaseResume } from "@/lib/services/resume";

export async function saveResumeAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ text: z.string().max(RESUME_TEXT_MAX + 1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That resume is too long" };
  try {
    await saveBaseResume(parsed.data.text);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save the resume" };
  }
}

export async function roastResumeAction(input: unknown): Promise<ActionResult<{ roast: ResumeRoast; source: "ai" | "rules"; cached: boolean }>> {
  await requireSession();
  const wait = await limited("resumeAi");
  if (wait) return { ok: false, error: wait };
  const parsed = z.object({ jd: z.string().max(20_000).optional(), id: z.string().regex(/^[a-f0-9]{24}$/i).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That job description is too long" };
  const res = await roastBaseResume({ jd: parsed.data.jd, id: parsed.data.id });
  return res.ok ? { ok: true, roast: res.roast, source: res.source, cached: res.cached } : { ok: false, error: res.error };
}

export async function tailorResumeAction(input: unknown): Promise<ActionResult<{ changes: Change[]; rejected: Rejected[]; source: "ai" | "rules"; missing: string[] }>> {
  await requireSession();
  const wait = await limited("resumeAi");
  if (wait) return { ok: false, error: wait };
  const parsed = z.object({ jd: z.string().max(20_000), approved: z.array(z.string().trim().max(60)).max(30).default([]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the job description" };
  const res = await tailorBaseResume(parsed.data);
  return res.ok ? { ok: true, changes: res.changes, rejected: res.rejected, source: res.source, missing: res.missing } : { ok: false, error: res.error };
}

export async function saveVersionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = z
    .object({ label: z.string().trim().max(120), company: z.string().trim().max(120).optional(), role: z.string().trim().max(160).optional(), jd: z.string().max(20_000).optional(), text: z.string().max(RESUME_TEXT_MAX + 1000), jobId: z.string().regex(/^[a-f0-9]{24}$/i).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the version details" };
  try {
    const { jobId, ...rest } = parsed.data;
    const v = await createVersion(rest);
    // Tied to a tracked job: remember which resume went with it and how it scored against that JD.
    if (jobId) await attachResumeToJob(jobId, v.id, rest.jd ? scoreResume(v.text, { jd: rest.jd }).score : null);
    refresh();
    return { ok: true, id: v.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save the version" };
  }
}

export async function deleteVersionAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown resume" };
  await deleteVersion(parsed.data.id);
  refresh();
  return { ok: true };
}
