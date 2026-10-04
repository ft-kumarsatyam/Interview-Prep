import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { AddJob } from "@/components/jobs/add-job";
import { JobsBoard } from "@/components/jobs/jobs-board";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { MAX_JOBS, pipelineCounts } from "@/lib/domain/jobs";
import { JobsTabs } from "@/components/jobs/jobs-tabs";
import { listJobs } from "@/lib/services/jobs";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const [jobs, settings] = await Promise.all([listJobs(), getSettings()]);
  const today = todayIn(settings);
  const counts = pipelineCounts(jobs);
  const board = jobs.map((j) => ({
    id: j.id, title: j.title, company: j.company, source: j.source, status: j.status, location: j.location, appliedOn: j.appliedOn,
    followUpOn: j.followUpOn, atsScore: j.atsScore, targetName: j.targetName,
    due: j.followUpOn !== null && j.followUpOn <= today && !["rejected", "withdrawn", "offer"].includes(j.status),
  }));

  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="Every job you are chasing, from first look to offer. Capture a posting from Naukri, LinkedIn, Indeed or Wellfound with the PrepOS extension, tailor your resume to it, then apply on the real site and track it here." />
      <JobsTabs active="tracker" trackerCount={jobs.length} />
      <div className="space-y-6">
        {jobs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Saved" value={String(counts.saved)} />
            <StatTile label="Applied" value={String(counts.applied + counts.screening)} hint={`${counts.screening} screening`} />
            <StatTile label="Interviewing" value={String(counts.interview)} tone={counts.interview ? "warning" : "neutral"} />
            <StatTile label="Offers" value={String(counts.offer)} tone={counts.offer ? "success" : "neutral"} />
          </div>
        )}
        {jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs tracked yet" compact>
            <p>Add one below, or install the extension (see Settings) and press its icon on any job page.</p>
          </EmptyState>
        ) : (
          <JobsBoard jobs={board} />
        )}
        <section aria-label="Add a job" className="space-y-3">
          <SectionHeading title="Add a job" hint="Paste the posting's details" />
          <AddJob disabled={jobs.length >= MAX_JOBS} />
        </section>
      </div>
    </>
  );
}
