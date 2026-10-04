import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/core/auth/cron";
import { alertNewJobs } from "@/modules/jobs/services/job-alerts";
import { syncJobs } from "@/modules/jobs/services/job-sync";

export const maxDuration = 60;

/** One rotation of the job sync: every source that is due, within the time budget. Safe to call as often as you like. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await syncJobs();
  // The alert is its own step: a failure there must not hide a successful sync.
  const alerts = await alertNewJobs().catch((e: unknown) => ({ sent: false as const, reason: e instanceof Error ? e.message.slice(0, 80) : "failed" }));
  // Keep the response small and free of error text from remote sites.
  return NextResponse.json({ ...s, failed: s.failed.map((f) => f.id), alerts });
}
