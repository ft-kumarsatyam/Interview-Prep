import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin, TriangleAlert } from "lucide-react";
import { ApplyPanel } from "@/components/jobs/apply-panel";
import { JdView } from "@/components/jobs/jd-view";
import { TailorSection } from "@/components/jobs/tailor-section";
import { BackLink } from "@/components/shared/back-link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tierProfiles } from "@/lib/content";
import { scoreResume } from "@/lib/domain/ats";
import { AGGREGATOR_LABEL, AGGREGATOR_URL, type Aggregator } from "@/lib/domain/job-postings";
import { getPostingDetail } from "@/lib/services/job-discovery";
import { getJob } from "@/lib/services/jobs";
import { getBaseResume } from "@/lib/services/resume";

export const metadata: Metadata = { title: "Job" };

export default async function PostingPage({ params }: PageProps<"/jobs/discover/[id]">) {
  const { id } = await params;
  const p = await getPostingDetail(id);
  if (!p) notFound();
  const [base, tracked] = await Promise.all([getBaseResume(), p.savedJobId ? getJob(p.savedJobId) : Promise.resolve(null)]);
  const ats = base && p.jd.length > 40 ? scoreResume(base.text, { jd: p.jd }) : null;
  const tier = tierProfiles.find((t) => t.id === p.tier)?.name;
  const isAggregator = p.source in AGGREGATOR_LABEL;
  const posted = p.postedAt ? new Date(p.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/jobs">Jobs</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{p.title}</h1>
          <ToneBadge tone={p.score >= 75 ? "success" : p.score >= 55 ? "info" : "neutral"}>{p.score}% match</ToneBadge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            {p.company}
            {tier ? ` · ${tier}` : ""}
          </span>
          {p.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {p.location}
            </span>
          )}
          {p.remote && <ToneBadge tone="info">Remote</ToneBadge>}
          {posted && <span>Posted {posted}</span>}
          {p.department && <span>{p.department}</span>}
        </p>
        {p.reasons.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Why it ranks here: {p.reasons.join(" · ")}</p>}
        <div className="mt-4">
          <ApplyPanel target={{ kind: "posting", id: p.id }} applyUrl={p.applyUrl} company={p.company} savedJobId={p.savedJobId} applied={tracked?.status === "applied" || ["screening", "interview", "offer"].includes(tracked?.status ?? "")} dismissed={p.dismissed} />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Job description</CardTitle>
            {base && p.jd && (
              <CardDescription>
                <mark className="rounded bg-success/15 px-0.5">Green</mark> is on your resume, <mark className="rounded bg-warning/20 px-0.5">amber</mark> is not.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {p.jd ? <JdView text={p.jd} have={new Set(p.matched)} lack={new Set(p.missing)} /> : <p className="text-sm text-muted-foreground">{p.descriptionUnavailable ? "The description couldn't be loaded. Open the company's page to read it." : "No description."}</p>}
            {isAggregator && (
              <p className="mt-4 text-xs text-muted-foreground">
                Listed by <a href={AGGREGATOR_URL[p.source as Aggregator]} target="_blank" rel="noopener noreferrer" className="underline">{AGGREGATOR_LABEL[p.source as Aggregator]}</a>. Applications are made through them.
              </p>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Your resume vs this job</CardTitle>
              {!base && <CardDescription>Save your resume to see how it scores for this role.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ats ? (
                <>
                  <p>
                    ATS score <span className="tabular font-mono text-lg font-semibold">{ats.score}</span>, keyword match <span className="tabular font-mono">{ats.keywords?.matchPct ?? 0}%</span>
                  </p>
                  {p.matched.length > 0 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-success">
                        <Check className="size-3.5" aria-hidden /> You have
                      </p>
                      <ul className="flex flex-wrap gap-1">
                        {p.matched.map((t) => (
                          <li key={t}>
                            <ToneBadge tone="success">{t}</ToneBadge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.missing.length > 0 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-warning">
                        <TriangleAlert className="size-3.5" aria-hidden /> Not on your resume
                      </p>
                      <ul className="flex flex-wrap gap-1">
                        {p.missing.map((t) => (
                          <li key={t}>
                            <ToneBadge tone="warning">{t}</ToneBadge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  <Link href="/resume" className="text-primary underline-offset-2 hover:underline">
                    Add your resume
                  </Link>{" "}
                  to see the match.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {base ? (
        <section aria-label="Upgrade your resume" className="space-y-3">
          <h2 className="text-base font-semibold">Upgrade your resume for this job</h2>
          <TailorSection postingId={p.id} savedJobId={p.savedJobId} baseText={base.text} jd={p.jd} company={p.company} title={p.title} />
        </section>
      ) : null}
    </div>
  );
}
