import { JobSearchCard } from "@/modules/jobs/components/job-search-card";
import { getJobOverview } from "@/modules/jobs/services/job-overview";

/** Async dashboard section. A failure hides the card instead of breaking the page. */
export async function JobSearchSection({ today }: { today: string }) {
  const overview = await getJobOverview(today).catch(() => null);
  return overview ? <JobSearchCard overview={overview} /> : null;
}
