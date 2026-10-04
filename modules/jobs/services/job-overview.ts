import type { DateStr } from "@/core/domain/dates";
import { funnel, nextJobAction, type Funnel, type InsightJob, type NextAction } from "@/modules/jobs/domain/job-insights";
import { dueFollowUps } from "@/modules/jobs/domain/jobs";
import { listJobs, type JobDto } from "@/modules/jobs/services/jobs";
import { hasBaseResume } from "@/modules/resume/services/resume";

export interface JobOverview {
  jobs: JobDto[];
  funnel: Funnel;
  next: NextAction;
  hasResume: boolean;
  due: JobDto[];
}

const insight = (j: JobDto): InsightJob => ({ id: j.id, title: j.title, company: j.company, status: j.status, statusLog: j.statusLog, appliedOn: j.appliedOn, followUpOn: j.followUpOn, resumeId: j.resumeId });

/** The job search at a glance: the funnel, what is due, and the one next step. Read-only. Resume text is never read, only whether one is saved. */
export async function getJobOverview(today: DateStr): Promise<JobOverview> {
  const [jobs, hasResume] = await Promise.all([listJobs(), hasBaseResume()]);
  const items = jobs.map(insight);
  const dueIds = new Set(dueFollowUps(items, today).map((j) => j.id));
  return { jobs, funnel: funnel(items, today), next: nextJobAction({ hasResume, jobs: items, today }), hasResume, due: jobs.filter((j) => dueIds.has(j.id)) };
}
