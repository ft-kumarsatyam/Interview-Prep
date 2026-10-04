import { createHash } from "node:crypto";
import { connectDb } from "@/core/db";
import { env } from "@/core/env";
import { getKv } from "@/core/kv";
import { Job } from "@/core/models/jobs";
import { sendEmailTo } from "@/core/notify";
import { takeToken } from "@/core/services/rate-limit";
import { buildDraftPrompt, checkDraft, draftSchema, outgoingSchema, type EmailDraft } from "@/modules/jobs/domain/recruiter-email";
import { todayIn } from "@/modules/planner/services/plan";
import { runAi } from "@/modules/ai/services/ai";
import { getPostingDetail, savePosting } from "@/modules/jobs/services/job-discovery";
import { getJob } from "@/modules/jobs/services/jobs";
import { getBaseResume } from "@/modules/resume/services/resume";
import { getSettings } from "@/modules/settings/services/settings";

export type OutreachTarget = { kind: "posting"; id: string } | { kind: "job"; id: string };

/** At most this many emails a day from PrepOS: enough for real outreach, too few to be a spam cannon. */
export const DAILY_EMAIL_LIMIT = { max: 10, windowSec: 86_400 };

async function jobContext(t: OutreachTarget): Promise<{ title: string; company: string; jd: string } | null> {
  if (t.kind === "posting") {
    const p = await getPostingDetail(t.id);
    return p ? { title: p.title, company: p.company, jd: p.jd } : null;
  }
  const j = await getJob(t.id);
  return j ? { title: j.title, company: j.company, jd: j.jd } : null;
}

export type DraftResult =
  | { ok: true; draft: EmailDraft; warnings: string[]; provider?: string }
  | { ok: false; error: string; unavailable?: true };

/**
 * Drafts the email from your saved resume and the job, with the free model only (the resume is personal data, so the
 * paid provider is never used and the text is never logged). The draft comes back with warnings about anything the
 * resume does not back up; nothing is sent until you review it and confirm.
 */
export async function draftRecruiterEmail(target: OutreachTarget): Promise<DraftResult> {
  const [ctx, base] = await Promise.all([jobContext(target), getBaseResume()]);
  if (!ctx) return { ok: false, error: "That job is no longer available" };
  if (!base) return { ok: false, error: "Save your resume first: the email is written from it" };
  const prompt = buildDraftPrompt({ ...ctx, resumeText: base.text, name: env().ADMIN_NAME });
  const res = await runAi("recruiter-email", {}, (llm) => llm.generateJson(prompt, draftSchema));
  if (!res.ok) return res;
  return { ok: true, draft: res.data, warnings: checkDraft(res.data, { resumeText: base.text, jd: ctx.jd }), provider: res.provider };
}

export type SendResult = { ok: true; jobId: string; provider: string } | { ok: false; error: string };

/**
 * Sends the email you reviewed. Validated again here (the browser is not trusted), limited per day, and a double click
 * cannot send it twice. The job is saved to your tracker if it was not, and the send is recorded on it (address,
 * subject and time, never the body).
 */
export async function sendRecruiterEmail(target: OutreachTarget, raw: unknown, now = new Date()): Promise<SendResult> {
  const parsed = outgoingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the email" };
  const email = parsed.data;

  // A duplicate is refused first, so it never costs one of today's sends.
  const fingerprint = createHash("sha256").update(`${email.to}\u0000${email.subject}\u0000${email.body}`).digest("hex").slice(0, 32);
  if (!(await getKv().setNx(`outreach:${fingerprint}`, "1", 120))) return { ok: false, error: "That exact email was just sent" };
  const limit = await takeToken("recruiter-email", DAILY_EMAIL_LIMIT);
  if (!limit.allowed) {
    await getKv().del(`outreach:${fingerprint}`);
    return { ok: false, error: "You've reached today's limit of recruiter emails. Try again tomorrow" };
  }

  let jobId: string;
  if (target.kind === "posting") {
    const saved = await savePosting(target.id, todayIn(await getSettings(), now));
    if (!saved.ok) return saved;
    jobId = saved.jobId;
  } else {
    if (!(await getJob(target.id))) return { ok: false, error: "That job is no longer available" };
    jobId = target.id;
  }

  const sent = await sendEmailTo({ to: email.to, subject: email.subject, text: email.body });
  if (!sent.ok) {
    await getKv().del(`outreach:${fingerprint}`);
    return sent;
  }
  await connectDb();
  await Job.updateOne(
    { _id: jobId },
    { $push: { outreach: { $each: [{ to: email.to, subject: email.subject, at: now }], $slice: -20 } }, $set: { updatedAt: now } },
  );
  await Job.updateOne({ _id: jobId, contact: "" }, { $set: { contact: email.to } });
  return { ok: true, jobId, provider: sent.provider };
}

export interface OutreachRecord {
  to: string;
  subject: string;
  at: string;
}

/** Emails you sent about a tracked job, newest first. */
export async function listOutreach(jobId: string): Promise<OutreachRecord[]> {
  if (!/^[a-f0-9]{24}$/i.test(jobId)) return [];
  await connectDb();
  const j = await Job.findById(jobId, { outreach: 1 }).lean();
  return (j?.outreach ?? []).map((o) => ({ to: o.to ?? "", subject: o.subject ?? "", at: (o.at ?? new Date(0)).toISOString() })).toReversed();
}

