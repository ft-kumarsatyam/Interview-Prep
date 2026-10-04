import { z } from "zod";
import type { RouteSpec } from "@/core/api/v1";
import { JOB_STATUSES, jobCaptureSchema, profileCaptureSchema } from "@/modules/jobs/domain/jobs";
import { MAX_PUSH_BATCH, pushedPostingSchema } from "@/modules/jobs/domain/job-push";

/** The public API, as data: one place that both the route handlers and the OpenAPI document are built from. */
const trackedJob = z.object({
  id: z.string().describe("The job's id in PrepOS"),
  title: z.string(),
  company: z.string(),
  status: z.enum(JOB_STATUSES),
  url: z.string(),
  location: z.string(),
  appliedOn: z.string().nullable().describe("YYYY-MM-DD in your timezone"),
  updatedAt: z.string().describe("ISO 8601"),
});

export const SPECS = {
  listJobs: {
    id: "listJobs",
    method: "GET",
    path: "/api/v1/jobs",
    summary: "List the jobs you track",
    description: "Your tracker, newest first.",
    scopes: ["jobs:read"],
    response: z.object({ jobs: z.array(trackedJob) }),
  },
  createJob: {
    id: "createJob",
    method: "POST",
    path: "/api/v1/jobs",
    summary: "Capture a job into your tracker",
    description: "What the Chrome extension sends for a job page. Capturing the same posting twice returns the first one (`duplicate: true`).",
    scopes: ["capture:write"],
    body: jobCaptureSchema,
    response: z.object({ id: z.string(), duplicate: z.boolean() }),
    successStatus: 201,
    idempotent: true,
  },
  createProfile: {
    id: "createProfile",
    method: "POST",
    path: "/api/v1/profiles",
    summary: "Capture a profile page to audit",
    description: "The text of your own profile page, saved as a profile snapshot. Plain text only; it is never logged.",
    scopes: ["capture:write"],
    body: profileCaptureSchema,
    response: z.object({ id: z.string() }),
    successStatus: 201,
    idempotent: true,
  },
  pushPostings: {
    id: "pushPostings",
    method: "POST",
    path: "/api/v1/postings",
    summary: "Push job postings into Discover",
    description: `Up to ${MAX_PUSH_BATCH} postings a request, from n8n, Zapier, Apify or a script. Each item is validated on its own: bad ones are counted in \`rejected\`, the rest are stored. Listings from LinkedIn, Naukri, Indeed, Wellfound and similar sites are rejected.`,
    scopes: ["jobs:write"],
    body: z.object({ jobs: z.array(z.unknown()).max(MAX_PUSH_BATCH) }),
    docBody: z.object({ jobs: z.array(pushedPostingSchema).max(MAX_PUSH_BATCH) }),
    response: z.object({ accepted: z.number().int(), added: z.number().int(), rejected: z.number().int() }),
    idempotent: true,
  },
} as const satisfies Record<string, RouteSpec>;

export const ALL_SPECS: readonly RouteSpec[] = Object.values(SPECS);
export { trackedJob };
