/**
 * The job tracker's rules: the pipeline, recognising where a job came from, one canonical key per posting
 * (so capturing the same job twice never duplicates it), follow-up dates, and matching a company to a
 * target. Everything a capture brings in is untrusted text from a website, so it is validated and capped
 * here. Pure.
 */
import { z } from "zod";
import { addDays, type DateStr } from "@/core/domain/dates";

export const JOB_STATUSES = ["saved", "applied", "screening", "interview", "offer", "rejected", "withdrawn"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_SOURCES = ["naukri", "linkedin", "indeed", "wellfound", "other"] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const MAX_JOBS = 400;
export const JD_MAX = 20_000;

export const STATUS_LABEL: Record<JobStatus, string> = { saved: "Saved", applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" };
export const SOURCE_LABEL: Record<JobSource, string> = { naukri: "Naukri", linkedin: "LinkedIn", indeed: "Indeed", wellfound: "Wellfound", other: "Other" };
/** Still in play: these can need a follow-up. */
export const ACTIVE_STATUSES: readonly JobStatus[] = ["saved", "applied", "screening", "interview", "offer"];

export const isJobStatus = (v: unknown): v is JobStatus => typeof v === "string" && (JOB_STATUSES as readonly string[]).includes(v);

const hostOf = (url: string): string | null => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

export function sourceFromUrl(url: string): JobSource {
  const h = hostOf(url) ?? "";
  if (h === "naukri.com" || h.endsWith(".naukri.com")) return "naukri";
  if (h === "linkedin.com" || h.endsWith(".linkedin.com")) return "linkedin";
  if (/(^|\.)indeed\.(com|co\.in|in)$/.test(h)) return "indeed";
  if (h === "wellfound.com" || h.endsWith(".wellfound.com") || h === "angel.co") return "wellfound";
  return "other";
}

const TRACKING = /^(utm_|trk|refid|src$|source$|ref$|fbclid|gclid|tracking|trackingid|origin$|from$)/i;

/** One stable key per posting: the site's own job id where there is one, otherwise the cleaned URL. Null for a non-web URL. */
export function canonicalJobUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = hostOf(raw)!;
  const src = sourceFromUrl(raw);
  const q = u.searchParams;
  if (src === "linkedin") {
    const id = u.pathname.match(/\/jobs\/view\/(?:[\w-]*?-)?(\d{6,})/)?.[1] ?? q.get("currentJobId");
    if (id) return `linkedin:${id}`;
  }
  if (src === "indeed") {
    const id = q.get("jk") ?? q.get("vjk");
    if (id) return `indeed:${id}`;
  }
  if (src === "naukri") {
    const id = u.pathname.match(/-(\d{9,})\/?$/)?.[1] ?? q.get("jobId");
    if (id) return `naukri:${id}`;
  }
  if (src === "wellfound") {
    const id = u.pathname.match(/\/jobs\/(\d+)/)?.[1];
    if (id) return `wellfound:${id}`;
  }
  const kept = [...q.entries()].filter(([k]) => !TRACKING.test(k)).toSorted(([a], [b]) => a.localeCompare(b));
  const qs = kept.length ? `?${kept.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
  return `${host}${u.pathname.replace(/\/+$/, "")}${qs}`.slice(0, 300);
}

const clean = (max: number, min = 0) => z.string().trim().min(min).max(max);
const webUrl = z.url({ protocol: /^https?$/ }).max(2000);

/** What the extension (or the add form) sends for a job. Anything else is rejected. */
export const jobCaptureSchema = z.object({
  title: clean(200, 2),
  company: clean(160, 1),
  url: webUrl,
  location: clean(160).optional(),
  jd: clean(JD_MAX).default(""),
  applyUrl: webUrl.optional(),
});
export type JobCapture = z.infer<typeof jobCaptureSchema>;

/** Your own profile page, captured to audit like a resume. Plain text only. */
export const profileCaptureSchema = z.object({ title: clean(200).default("Profile"), url: webUrl, text: clean(30_000, 100) });
export type ProfileCapture = z.infer<typeof profileCaptureSchema>;

/** The follow-up date a status implies, or null when nothing is waiting on you. */
export function followUpFor(status: JobStatus, today: DateStr): DateStr | null {
  switch (status) {
    case "applied":
      return addDays(today, 7);
    case "screening":
      return addDays(today, 4);
    case "interview":
      return addDays(today, 2);
    default:
      return null;
  }
}

export interface JobLike {
  id: string;
  status: JobStatus;
  followUpOn: DateStr | null;
}

/** Jobs whose follow-up date has arrived, oldest first. */
export function dueFollowUps<T extends JobLike>(jobs: readonly T[], today: DateStr): T[] {
  return jobs.filter((j) => j.followUpOn !== null && j.followUpOn <= today && ACTIVE_STATUSES.includes(j.status)).toSorted((a, b) => a.followUpOn!.localeCompare(b.followUpOn!));
}

export function pipelineCounts(jobs: ReadonlyArray<{ status: JobStatus }>): Record<JobStatus, number> {
  const out = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0])) as Record<JobStatus, number>;
  for (const j of jobs) out[j.status]++;
  return out;
}

const SUFFIX = /\b(pvt|private|ltd|limited|inc|llc|llp|corp|corporation|technologies|technology|tech|labs|software|solutions|india|global|systems|services)\b/g;
export const companyKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(SUFFIX, " ").replace(/\s+/g, " ").trim();

/** The target whose company this job is at, comparing names without suffixes like "Pvt Ltd" or "Technologies". */
export function matchTarget<T extends { name: string }>(company: string, targets: readonly T[]): T | undefined {
  const k = companyKey(company);
  if (k.length < 2) return undefined;
  return targets.find((t) => {
    const tk = companyKey(t.name);
    return tk === k || (Math.min(tk.length, k.length) >= 4 && (tk.startsWith(`${k} `) || k.startsWith(`${tk} `)));
  });
}

/** Turns an HTML description (as sites embed it) into plain text without executing or keeping any markup. */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------------------------------- follow-ups you can act on ---------------------------------- */

export const SNOOZE_DAYS = [1, 3, 7] as const;
export type SnoozeDays = (typeof SNOOZE_DAYS)[number];

/** Push a follow-up back by a few days, counted from today. */
export const snoozedFollowUp = (today: DateStr, days: SnoozeDays): DateStr => addDays(today, days);

/** After you have followed up, the next nudge comes a week later. Finished jobs stop asking. */
export function afterFollowUp(status: JobStatus, today: DateStr): DateStr | null {
  return ACTIVE_STATUSES.includes(status) && status !== "saved" ? addDays(today, 7) : null;
}

/** A short, polite message to copy. It states facts you already have; it never invents anything. */
export function followUpDraft(input: { status: JobStatus; title: string; company: string; appliedOn: DateStr | null }): string {
  const { status, title, company, appliedOn } = input;
  const role = `${title} role at ${company}`;
  if (status === "interview")
    return `Hi,\n\nThank you for taking the time to speak with me about the ${role}. I enjoyed learning more about the team and I am still very interested. Could you share what the next steps are and when I can expect to hear back?\n\nThank you,`;
  if (status === "screening")
    return `Hi,\n\nI wanted to follow up on our conversation about the ${role}. I remain very interested and would be glad to share anything else that would help. Do you have an update on the timeline?\n\nThank you,`;
  if (status === "offer")
    return `Hi,\n\nThank you again for the offer for the ${role}. I am excited about it and would like to confirm the details and the timeline for my decision. Could we find a time to talk this week?\n\nThank you,`;
  return `Hi,\n\nI applied for the ${role}${appliedOn ? ` on ${appliedOn}` : ""} and wanted to check in. I am very interested and happy to provide anything that would help your review. Could you let me know where the process stands?\n\nThank you,`;
}

/* ---------------------------------- interviews ---------------------------------- */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid day");

/** Your next interview for a job: the day (or none), the round and who you talk to. Plain text, capped. */
export const interviewSchema = z.object({
  date: isoDate.nullable(),
  round: clean(60).default(""),
  contact: clean(200).default(""),
});
export type InterviewDetails = z.infer<typeof interviewSchema>;

export interface InterviewLike {
  id: string;
  title: string;
  company: string;
  status: JobStatus;
  interviewOn: DateStr | null;
  interviewRound: string;
}

/** Interviews from `today` on for jobs still in play, soonest first. */
export function upcomingInterviews<T extends InterviewLike>(jobs: readonly T[], today: DateStr): T[] {
  return jobs.filter((j) => j.interviewOn !== null && j.interviewOn >= today && ACTIVE_STATUSES.includes(j.status)).toSorted((a, b) => a.interviewOn!.localeCompare(b.interviewOn!));
}
