import { registerHandler } from "@/core/events/deliver";
import { alertNewJobs } from "@/modules/jobs/services/job-alerts";
import { syncJobs } from "@/modules/jobs/services/job-sync";

let registered = false;

/** Job sync as an event consumer: the cron only publishes `JobSyncRequested`, any runtime (QStash route or worker) does the work. */
export function registerJobHandlers(): void {
  if (registered) return;
  registered = true;
  registerHandler("JobSyncRequested", "jobs.sync", async () => {
    const summary = await syncJobs();
    // The alert is its own step: a failure there must not hide a successful sync.
    const alerts = await alertNewJobs().catch((e: unknown) => ({ sent: false as const, reason: e instanceof Error ? e.message.slice(0, 80) : "failed" }));
    return { ...summary, failed: summary.failed.map((f) => f.id), alerts };
  });
}
