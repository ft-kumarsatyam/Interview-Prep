/**
 * What the job search looks like at a glance: the application funnel (how far jobs get and how many stall)
 * and the one thing worth doing next. Pure; the dashboard, the tracker and the next-step strip all read it.
 */
import { addDays, diffDays, type DateStr } from "@/core/domain/dates";
import { ACTIVE_STATUSES, dueFollowUps, dueDebriefs, JOB_SOURCES, SOURCE_LABEL, type JobSource, type JobStatus } from "@/modules/jobs/domain/jobs";

export interface InsightJob {
  id: string;
  title: string;
  company: string;
  status: JobStatus;
  statusLog: ReadonlyArray<{ status: JobStatus; on: string }>;
  appliedOn: DateStr | null;
  followUpOn: DateStr | null;
  resumeId: string | null;
  /** Optional: not every caller tracks these, and they only feed offer comparison and pattern insights. */
  source?: JobSource;
  targetName?: string | null;
  interviewOn?: DateStr | null;
  interviewDebriefOn?: DateStr | null;
}

const STAGES = ["applied", "screening", "interview", "offer"] as const;
type Stage = (typeof STAGES)[number];
const RANK: Record<Stage, number> = { applied: 1, screening: 2, interview: 3, offer: 4 };

/** The furthest stage a job ever reached (0 = never applied). Rejected and withdrawn count by where they got to. */
function reachedRank(j: InsightJob): number {
  const seen = [...j.statusLog.map((s) => s.status), j.status];
  return Math.max(0, ...seen.map((s) => (s in RANK ? RANK[s as Stage] : 0)));
}

/** How long a job has sat in its current stage, from the last status change (falls back to the apply date). */
export function daysInStage(j: InsightJob, today: DateStr): number | null {
  const last = j.statusLog.at(-1)?.on ?? j.appliedOn;
  return last ? Math.max(0, diffDays(today, last)) : null;
}

export const STALE_AFTER_DAYS = 14;

export interface Funnel {
  total: number;
  active: number;
  /** Jobs you have applied to, ever. */
  applied: number;
  appliedThisWeek: number;
  reached: Record<Stage, number>;
  /** Share of applications that reached each later stage, as whole percent; null with nothing applied. */
  conversion: { screening: number | null; interview: number | null; offer: number | null };
  /** Applied or screening with no movement for two weeks. */
  stale: InsightJob[];
}

export function funnel(jobs: readonly InsightJob[], today: DateStr): Funnel {
  const reached = { applied: 0, screening: 0, interview: 0, offer: 0 };
  for (const j of jobs) {
    const r = reachedRank(j);
    for (const s of STAGES) if (r >= RANK[s]) reached[s]++;
  }
  const pct = (n: number) => (reached.applied > 0 ? Math.round((100 * n) / reached.applied) : null);
  const weekFrom = addDays(today, -6);
  return {
    total: jobs.length,
    active: jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length,
    applied: reached.applied,
    appliedThisWeek: jobs.filter((j) => j.appliedOn !== null && j.appliedOn >= weekFrom && j.appliedOn <= today).length,
    reached,
    conversion: { screening: pct(reached.screening), interview: pct(reached.interview), offer: pct(reached.offer) },
    stale: jobs.filter((j) => (j.status === "applied" || j.status === "screening") && (daysInStage(j, today) ?? 0) >= STALE_AFTER_DAYS),
  };
}

export type NextKind = "resume" | "follow-up" | "debrief" | "interview" | "tailor" | "apply" | "find" | "clear";

export interface NextAction {
  kind: NextKind;
  title: string;
  detail: string;
  href: string;
}

/** The single most useful thing to do now in the job search, in a fixed order of importance. */
export function nextJobAction(input: { hasResume: boolean; jobs: readonly InsightJob[]; today: DateStr }): NextAction {
  const { hasResume, jobs, today } = input;
  if (!hasResume) return { kind: "resume", title: "Save your resume", detail: "Every job match, ATS score and tailored version starts from it.", href: "/resume" };

  const due = dueFollowUps(jobs, today);
  if (due.length > 0) {
    const j = due[0]!;
    return { kind: "follow-up", title: due.length === 1 ? `Follow up on ${j.title} at ${j.company}` : `Follow up on ${due.length} applications`, detail: "A short polite message keeps you on their radar.", href: due.length === 1 ? `/jobs/${j.id}` : "/jobs/tracker" };
  }

  const debrief = dueDebriefs(jobs, today)[0];
  if (debrief) return { kind: "debrief", title: `Debrief your interview at ${debrief.company}`, detail: "A couple of lines now feeds your patterns later.", href: `/jobs/${debrief.id}` };

  const interviewing = jobs.find((j) => j.status === "interview");
  if (interviewing) return { kind: "interview", title: `Prepare for your interview at ${interviewing.company}`, detail: "Run a mock interview while it is fresh.", href: "/mock" };

  const untailored = jobs.find((j) => j.status === "saved" && !j.resumeId);
  if (untailored) return { kind: "tailor", title: `Tailor your resume to ${untailored.title} at ${untailored.company}`, detail: "A version written for the posting scores higher on ATS.", href: `/resume/tailor?job=${untailored.id}` };

  const ready = jobs.find((j) => j.status === "saved");
  if (ready) return { kind: "apply", title: `Apply to ${ready.title} at ${ready.company}`, detail: "Your tailored resume is ready. Apply on the real site, then mark it applied.", href: `/jobs/${ready.id}` };

  if (!jobs.some((j) => ACTIVE_STATUSES.includes(j.status))) return { kind: "find", title: "Find roles to apply to", detail: "Discover postings that match your resume, or capture one with the extension.", href: "/jobs" };
  return { kind: "clear", title: "You are on top of it", detail: "No follow-ups are due and nothing is waiting on you.", href: "/jobs/tracker" };
}

/* ---------------------------------- comparing offers in hand ---------------------------------- */

export interface OfferComparison {
  id: string;
  title: string;
  company: string;
  source: JobSource;
  isTarget: boolean;
  offeredOn: DateStr;
  daysSinceOffer: number;
  daysInPipeline: number;
}

/** Offers you are holding, side by side: how long each took to land and how long you have been sitting on it. Oldest offer first, since that one is likely closest to its deadline. */
export function compareOffers(jobs: readonly InsightJob[], today: DateStr): OfferComparison[] {
  return jobs
    .filter((j) => j.status === "offer")
    .map((j) => {
      const offeredOn = [...j.statusLog].reverse().find((s) => s.status === "offer")?.on ?? j.appliedOn ?? today;
      const startedOn = j.statusLog[0]?.on ?? j.appliedOn ?? offeredOn;
      return {
        id: j.id,
        title: j.title,
        company: j.company,
        source: j.source ?? "other",
        isTarget: j.targetName != null,
        offeredOn,
        daysSinceOffer: Math.max(0, diffDays(today, offeredOn)),
        daysInPipeline: Math.max(0, diffDays(offeredOn, startedOn)),
      };
    })
    .toSorted((a, b) => a.offeredOn.localeCompare(b.offeredOn));
}

/* ---------------------------------- how applications are doing, by group ---------------------------------- */

export interface PatternSplit {
  label: string;
  applied: number;
  /** Share that reached an interview, as whole percent; null with nothing applied in this group. */
  interviewPct: number | null;
}

function splitStats(label: string, group: readonly InsightJob[]): PatternSplit {
  const appliedJobs = group.filter((j) => reachedRank(j) >= RANK.applied);
  const reachedInterview = appliedJobs.filter((j) => reachedRank(j) >= RANK.interview).length;
  return { label, applied: appliedJobs.length, interviewPct: appliedJobs.length > 0 ? Math.round((100 * reachedInterview) / appliedJobs.length) : null };
}

export interface ApplicationPatterns {
  byTailoring: { tailored: PatternSplit; untailored: PatternSplit };
  bySource: PatternSplit[];
}

/** How far applications get, split by whether a tailored resume was attached and by where the posting came from. Groups with nothing applied are left out. */
export function applicationPatterns(jobs: readonly InsightJob[]): ApplicationPatterns {
  const bySource = new Map<JobSource, InsightJob[]>();
  for (const j of jobs) {
    const src = j.source ?? "other";
    bySource.set(src, [...(bySource.get(src) ?? []), j]);
  }
  return {
    byTailoring: {
      tailored: splitStats("Tailored resume", jobs.filter((j) => j.resumeId !== null)),
      untailored: splitStats("Generic resume", jobs.filter((j) => j.resumeId === null)),
    },
    bySource: JOB_SOURCES.map((s) => splitStats(SOURCE_LABEL[s], bySource.get(s) ?? [])).filter((p) => p.applied > 0),
  };
}
