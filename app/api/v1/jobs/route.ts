import { SPECS } from "@/core/api/specs";
import { v1Route } from "@/core/api/v1";
import { getSettings } from "@/modules/settings/services/settings";
import { todayIn } from "@/modules/planner/services/plan";
import type { JobCapture } from "@/modules/jobs/domain/jobs";
import { addJob, listJobs } from "@/modules/jobs/services/jobs";
import { publish } from "@/core/realtime";

export const maxDuration = 30;

export const GET = v1Route(SPECS.listJobs, async () => {
  const jobs = await listJobs();
  return { body: { jobs: jobs.map((j) => ({ id: j.id, title: j.title, company: j.company, status: j.status, url: j.url, location: j.location, appliedOn: j.appliedOn, updatedAt: j.updatedAt })) } };
});

export const POST = v1Route<JobCapture>(SPECS.createJob, async ({ body }) => {
  const res = await addJob(body, todayIn(await getSettings()));
  if (!res.ok) return { status: 422, body: { error: { code: "rejected", message: res.error } } };
  if (!res.duplicate) await publish({ type: "capture", kind: "job" });
  return { status: res.duplicate ? 200 : 201, body: { id: res.job.id, duplicate: res.duplicate } };
});
