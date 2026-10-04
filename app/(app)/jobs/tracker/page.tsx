import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { AddJob } from "@/modules/jobs/components/add-job";
import { JobsBoard } from "@/modules/jobs/components/jobs-board";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { MAX_JOBS, pipelineCounts } from "@/modules/jobs/domain/jobs";
import { JobsTabs } from "@/modules/jobs/components/jobs-tabs";
import { NextStep } from "@/modules/jobs/components/next-step";
import { getJobOverview } from "@/modules/jobs/services/job-overview";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const settings = await getSettings();
  const today = todayIn(settings);
  const { jobs, funnel, next } = await getJobOverview(today);
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
        <NextStep next={next} />
        <details className="group rounded-xl border bg-card" open={jobs.length === 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">Add a job</summary>
          <div className="space-y-3 border-t p-4">
            <AddJob disabled={jobs.length >= MAX_JOBS} />
          </div>
        </details>
        {jobs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Saved" value={String(counts.saved)} />
            <StatTile label="Applied" value={String(counts.applied + counts.screening)} hint={`${counts.screening} screening`} />
            <StatTile label="Interviewing" value={String(counts.interview)} tone={counts.interview ? "warning" : "neutral"} />
            <StatTile label="Offers" value={String(counts.offer)} tone={counts.offer ? "success" : "neutral"} />
          </div>
        )}
        {funnel.applied > 0 && (
          <section aria-label="Application funnel" className="space-y-2">
            <SectionHeading title="Your funnel" hint="How far your applications get" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Applied this week" value={String(funnel.appliedThisWeek)} hint={`${funnel.applied} applied in all`} />
              <StatTile label="Reach screening" value={funnel.conversion.screening === null ? "–" : `${funnel.conversion.screening}%`} hint={`${funnel.reached.screening} of ${funnel.applied}`} />
              <StatTile label="Reach an interview" value={funnel.conversion.interview === null ? "–" : `${funnel.conversion.interview}%`} hint={`${funnel.reached.interview} of ${funnel.applied}`} />
              <StatTile label="No news for 2 weeks" value={String(funnel.stale.length)} tone={funnel.stale.length ? "warning" : "neutral"} hint="applied or screening" />
            </div>
          </section>
        )}
        {jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs tracked yet" compact>
            <p>Add one below, or install the extension (see Settings) and press its icon on any job page.</p>
          </EmptyState>
        ) : (
          <JobsBoard jobs={board} />
        )}
      </div>
    </>
  );
}
