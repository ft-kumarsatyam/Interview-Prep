import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobOverview } from "@/modules/jobs/services/job-overview";
import { NextStep } from "@/modules/jobs/components/next-step";
import { STATUS_LABEL } from "@/modules/jobs/domain/jobs";

/** The dashboard's job-search summary: the next step, follow-ups that are due, and how many applications are moving. */
export function JobSearchCard({ overview }: { overview: JobOverview }) {
  const { funnel, due, next, jobs } = overview;
  if (jobs.length === 0 && overview.hasResume && next.kind === "find") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground" aria-hidden /> Job search
          </CardTitle>
          <CardDescription>Nothing tracked yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <NextStep next={next} />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="size-4 text-muted-foreground" aria-hidden /> Job search
        </CardTitle>
        <CardDescription>
          {funnel.active} active · {funnel.appliedThisWeek} applied this week
          {funnel.conversion.interview !== null && ` · ${funnel.conversion.interview}% of applications reach an interview`}
        </CardDescription>
        <CardAction>
          <Link href="/jobs/tracker" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Tracker <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <NextStep next={next} />
        {due.length > 0 && (
          <ul className="space-y-1" aria-label="Follow-ups due">
            {due.slice(0, 3).map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="min-w-0 flex-1 truncate">
                    {j.title} <span className="text-muted-foreground">· {j.company}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[j.status]}, follow up due</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {funnel.stale.length > 0 && <p className="px-2 text-xs text-muted-foreground">{funnel.stale.length} application{funnel.stale.length === 1 ? "" : "s"} with no news for two weeks. Consider a nudge, or close {funnel.stale.length === 1 ? "it" : "them"}.</p>}
      </CardContent>
    </Card>
  );
}
