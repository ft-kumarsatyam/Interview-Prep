import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
import { ApplyPanel } from "@/components/jobs/apply-panel";
import { JobControls } from "@/components/jobs/job-controls";
import { BackLink } from "@/components/shared/back-link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreResume } from "@/lib/domain/ats";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/domain/jobs";
import { getJob } from "@/lib/services/jobs";
import { getBaseResume } from "@/lib/services/resume";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const base = await getBaseResume();
  const match = base && job.jd.length > 40 ? scoreResume(base.text, { jd: job.jd }) : null;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/jobs/tracker">Tracker</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{job.title}</h1>
          <ToneBadge tone="info">{STATUS_LABEL[job.status]}</ToneBadge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.company}
          {job.location ? ` · ${job.location}` : ""} · {SOURCE_LABEL[job.source]}
          {job.targetName && (
            <>
              {" "}
              · <Link href="/targets" className="text-primary underline-offset-2 hover:underline">your target: {job.targetName}</Link>
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/resume/tailor?job=${job.id}`}>
              <Sparkles /> {job.resumeId ? "Re-tailor resume" : "Tailor resume to this job"}
            </Link>
          </Button>
          <ApplyPanel target={{ kind: "job", id: job.id }} applyUrl={job.applyUrl || job.url} company={job.company} savedJobId={null} applied={["applied", "screening", "interview", "offer"].includes(job.status)} />
          {job.resumeId && (
            <Button variant="outline" asChild>
              <a href={`/api/resume/${job.resumeId}/download?format=pdf`}>
                <Download /> Tailored PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Track it</CardTitle>
            <CardDescription>PrepOS never applies for you: apply on the site, then mark it Applied here. You will get a follow-up reminder in the daily briefing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <JobControls id={job.id} status={job.status} notes={job.notes} />
            {job.statusLog.length > 0 && (
              <ol className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {job.statusLog.map((s, i) => (
                  <li key={i}>
                    {s.on}: {STATUS_LABEL[s.status]}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {match && (
            <Card>
              <CardHeader>
                <CardTitle>Your base resume vs this job</CardTitle>
                <CardDescription>
                  ATS score {match.score}, keyword match {match.keywords?.matchPct ?? 0}%.
                  {job.atsScore !== null && ` The tailored version scored ${job.atsScore}.`}
                </CardDescription>
              </CardHeader>
              {match.missing.length > 0 && (
                <CardContent className="text-sm text-muted-foreground">Missing: {match.missing.slice(0, 10).join(", ")}</CardContent>
              )}
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
            </CardHeader>
            <CardContent>
              {job.jd ? <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-wrap text-muted-foreground">{job.jd}</p> : <p className="text-sm text-muted-foreground">No description was captured. Open the posting and paste it into the tailor page.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
