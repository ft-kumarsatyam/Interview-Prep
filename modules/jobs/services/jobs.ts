import { connectDb } from "@/core/db";
import { isDateStr, type DateStr } from "@/core/domain/dates";
import { afterFollowUp, canonicalJobUrl, dueFollowUps, followUpFor, JD_MAX, matchTarget, MAX_JOBS, sourceFromUrl, type JobCapture, type JobSource, type JobStatus } from "@/modules/jobs/domain/jobs";
import { Job } from "@/core/models/jobs";
import { listTargets } from "@/modules/targets/services/targets";

export interface JobDto {
  id: string;
  title: string;
  company: string;
  source: JobSource;
  url: string;
  location: string;
  jd: string;
  applyUrl: string;
  status: JobStatus;
  statusLog: Array<{ status: JobStatus; on: string }>;
  appliedOn: DateStr | null;
  followUpOn: DateStr | null;
  resumeId: string | null;
  atsScore: number | null;
  notes: string;
  interviewOn: DateStr | null;
  interviewRound: string;
  contact: string;
  updatedAt: string;
  /** The target company this job is at, when one matches. */
  targetId: string | null;
  targetName: string | null;
}

type Row = Awaited<ReturnType<typeof Job.findById>> extends infer T ? NonNullable<T> : never;

function toDto(d: Row | Record<string, unknown>, targets: ReadonlyArray<{ id: string; name: string }>): JobDto {
  const r = d as unknown as {
    _id: unknown; title: string; company: string; source?: string; url: string; location?: string; jd?: string; applyUrl?: string; status?: string;
    statusLog?: Array<{ status: string; on: string }>; appliedOn?: string | null; followUpOn?: string | null; resumeId?: unknown; atsScore?: number | null; notes?: string; interviewOn?: string | null; interviewRound?: string; contact?: string; updatedAt?: Date;
  };
  const t = matchTarget(r.company, targets);
  return {
    id: String(r._id),
    title: r.title,
    company: r.company,
    source: (r.source ?? "other") as JobSource,
    url: r.url,
    location: r.location ?? "",
    jd: r.jd ?? "",
    applyUrl: r.applyUrl ?? "",
    status: (r.status ?? "saved") as JobStatus,
    statusLog: (r.statusLog ?? []).map((s) => ({ status: s.status as JobStatus, on: s.on })),
    appliedOn: r.appliedOn ?? null,
    followUpOn: r.followUpOn ?? null,
    resumeId: r.resumeId ? String(r.resumeId) : null,
    atsScore: r.atsScore ?? null,
    notes: r.notes ?? "",
    interviewOn: r.interviewOn ?? null,
    interviewRound: r.interviewRound ?? "",
    contact: r.contact ?? "",
    updatedAt: (r.updatedAt ?? new Date()).toISOString(),
    targetId: t?.id ?? null,
    targetName: t?.name ?? null,
  };
}

export async function listJobs(): Promise<JobDto[]> {
  await connectDb();
  const [docs, targets] = await Promise.all([Job.find({}).sort({ updatedAt: -1 }).limit(MAX_JOBS).lean(), listTargets()]);
  return docs.map((d) => toDto(d, targets));
}

export async function getJob(id: string): Promise<JobDto | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDb();
  const [d, targets] = await Promise.all([Job.findById(id).lean(), listTargets()]);
  return d ? toDto(d, targets) : null;
}

export type AddJobResult = { ok: true; job: JobDto; duplicate: boolean } | { ok: false; error: string };

/** Saves a job once per posting. Capturing one you already track returns the existing job untouched. */
export async function addJob(input: JobCapture, today: DateStr): Promise<AddJobResult> {
  const key = canonicalJobUrl(input.url);
  if (!key) return { ok: false, error: "That link isn't a web address" };
  await connectDb();
  const targets = await listTargets();
  const existing = await Job.findOne({ canonicalKey: key }).lean();
  if (existing) return { ok: true, job: toDto(existing, targets), duplicate: true };
  if ((await Job.estimatedDocumentCount()) >= MAX_JOBS) return { ok: false, error: `You can track ${MAX_JOBS} jobs. Delete old ones first` };
  const doc = await Job.create({
    title: input.title,
    company: input.company,
    source: sourceFromUrl(input.url),
    url: input.url,
    canonicalKey: key,
    location: input.location ?? "",
    jd: input.jd.slice(0, JD_MAX),
    applyUrl: input.applyUrl ?? "",
    status: "saved",
    statusLog: [{ status: "saved", on: today }],
  });
  return { ok: true, job: toDto(doc.toObject(), targets), duplicate: false };
}

/** Moves a job along the pipeline and sets its follow-up date. Applying stamps the date you applied. */
export async function setJobStatus(id: string, status: JobStatus, today: DateStr): Promise<void> {
  const job = await getJob(id);
  if (!job) throw new Error("Unknown job");
  if (job.status === status) return;
  await Job.updateOne(
    { _id: id },
    {
      $set: { status, followUpOn: followUpFor(status, today), ...(status === "applied" && !job.appliedOn ? { appliedOn: today } : {}) },
      $push: { statusLog: { $each: [{ status, on: today }], $slice: -30 } },
    },
  );
}

/** Sets when you should be nudged next: a date (snooze or your own), null to stop, or "followed up" for a week out. */
export async function setFollowUp(id: string, change: { date: DateStr | null } | { followedUp: true }, today: DateStr): Promise<void> {
  const job = await getJob(id);
  if (!job) throw new Error("Unknown job");
  const next = "followedUp" in change ? afterFollowUp(job.status, today) : change.date;
  if (next !== null && (!isDateStr(next) || next < today)) throw new Error("Pick today or a later day");
  await Job.updateOne({ _id: id }, { $set: { followUpOn: next } });
}

/** Saves the next interview's day, round and contact. A day must be today or later and a real date; null clears it. */
export async function setInterview(id: string, details: { date: DateStr | null; round: string; contact: string }, today: DateStr): Promise<void> {
  const job = await getJob(id);
  if (!job) throw new Error("Unknown job");
  if (details.date !== null && (!isDateStr(details.date) || details.date < today)) throw new Error("Pick today or a later day");
  await Job.updateOne({ _id: id }, { $set: { interviewOn: details.date, interviewRound: details.round.slice(0, 60), contact: details.contact.slice(0, 200) } });
}

/** Interviews between two days (inclusive) for jobs still in play, for the calendar. */
export async function interviewsBetween(from: DateStr, to: DateStr): Promise<Array<{ id: string; title: string; company: string; round: string; date: DateStr }>> {
  await connectDb();
  const rows = await Job.find({ interviewOn: { $gte: from, $lte: to }, status: { $in: ["applied", "screening", "interview", "offer"] } }, { title: 1, company: 1, interviewRound: 1, interviewOn: 1 }).sort({ interviewOn: 1 }).lean();
  return rows.map((r) => ({ id: String(r._id), title: r.title, company: r.company, round: r.interviewRound ?? "", date: r.interviewOn as DateStr }));
}

export async function saveJobNotes(id: string, notes: string): Promise<void> {
  await connectDb();
  await Job.updateOne({ _id: id }, { $set: { notes: notes.slice(0, 2000) } });
}

export async function attachResumeToJob(id: string, resumeId: string, atsScore: number | null): Promise<void> {
  await connectDb();
  await Job.updateOne({ _id: id }, { $set: { resumeId, atsScore } });
}

export async function deleteJob(id: string): Promise<void> {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error("Unknown job");
  await connectDb();
  await Job.deleteOne({ _id: id });
}

/** Jobs waiting on a follow-up today or earlier, oldest first. */
export async function jobsDueForFollowUp(today: DateStr): Promise<JobDto[]> {
  return dueFollowUps(await listJobs(), today);
}
