"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { takeToken } from "@/core/services/rate-limit";
import type { EmailDraft } from "@/modules/jobs/domain/recruiter-email";
import { draftRecruiterEmail, sendRecruiterEmail } from "@/modules/jobs/services/outreach";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown job");
const target = z.object({ kind: z.enum(["posting", "job"]), id });

export async function draftEmailAction(input: unknown): Promise<ActionResult<{ draft: EmailDraft; warnings: string[]; provider?: string }>> {
  await requireSession();
  const parsed = z.object({ target }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown job" };
  const limit = await takeToken("recruiter-draft", { max: 20, windowSec: 3600 });
  if (!limit.allowed) return { ok: false, error: "Too many drafts. Try again in a few minutes" };
  const res = await draftRecruiterEmail(parsed.data.target);
  return res.ok ? { ok: true, draft: res.draft, warnings: res.warnings, ...(res.provider ? { provider: res.provider } : {}) } : { ok: false, error: res.error };
}

/** `confirm` must be literally true: the person ticked "I have read this and want it sent". */
export async function sendEmailAction(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  await requireSession();
  const parsed = z.object({ target, email: z.unknown(), confirm: z.literal(true) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confirm that you want to send this email" };
  const res = await sendRecruiterEmail(parsed.data.target, parsed.data.email);
  if (!res.ok) return res;
  refresh();
  return { ok: true, jobId: res.jobId };
}
