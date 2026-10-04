import { SPECS } from "@/core/api/specs";
import { v1Route } from "@/core/api/v1";
import { ingestPushed } from "@/modules/jobs/services/job-ingest";

export const maxDuration = 30;

export const POST = v1Route<{ jobs: unknown[] }>(SPECS.pushPostings, async ({ body }) => ({ body: await ingestPushed(body.jobs) }));
