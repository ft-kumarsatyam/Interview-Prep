import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Compass } from "lucide-react";
import { DiscoverFilters } from "@/modules/jobs/components/discover-filters";
import { LiveJobsBanner } from "@/core/components/live/live-jobs-banner";
import { JobsTabs } from "@/modules/jobs/components/jobs-tabs";
import { PostingCard } from "@/modules/jobs/components/posting-card";
import { PrefsForm } from "@/modules/jobs/components/prefs-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { Button } from "@/components/ui/button";
import { tierProfiles } from "@/core/content";
import { discoverJobs, getJobPrefs, listSources } from "@/modules/jobs/services/job-discovery";
import { listJobs } from "@/modules/jobs/services/jobs";
import { NextStep } from "@/modules/jobs/components/next-step";
import { getJobOverview } from "@/modules/jobs/services/job-overview";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import { RefreshButton } from "@/modules/jobs/components/refresh-button";

export const metadata: Metadata = { title: "Jobs" };
/** The Refresh button reads company boards in a Server Action, which needs the full minute. */
export const maxDuration = 60;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  const kind = one(sp.kind);
  const now = new Date();
  const pageSize = Math.min(150, Math.max(30, num(sp.n) ?? 30));
  const overview = await getJobOverview(todayIn(await getSettings()));
  const [prefs, found, sources, tracked] = await Promise.all([
    getJobPrefs(),
    discoverJobs({ q: one(sp.q), kind: kind === "boards" || kind === "remote" ? kind : "all", tier: one(sp.tier) || undefined, remote: one(sp.remote) === "1", days: num(sp.days), min: num(sp.min), showDismissed: one(sp.dismissed) === "1", limit: pageSize }, now),
    listSources(now),
    listJobs(),
  ]);
  const tierName = new Map<string, string>(tierProfiles.map((t) => [t.id, t.name]));
  const active = sources.filter((s) => s.enabled);
  const lastOk = sources.map((s) => s.lastOkAt).filter((x): x is string => x !== null).toSorted().at(-1);
  const filtering = Boolean(one(sp.q) || kind || one(sp.tier) || one(sp.remote) || one(sp.days) || one(sp.min));

  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="New roles from company career pages and remote job feeds, ranked by how well they fit what you want and what your resume says. Open one to read it, upgrade your resume for it and apply on the company's own site.">
        <RefreshButton />
      </PageHeader>
      <JobsTabs active="discover" trackerCount={tracked.length} />
      <PageStack>
        <NextStep next={overview.next} />
        <LiveJobsBanner />
        <details className="rounded-xl border bg-card" open={!found.hasPrefs}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {found.hasPrefs ? "What you are looking for" : "Tell PrepOS what you are looking for"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{found.hasPrefs ? prefs.roles.join(", ") : "Without roles, jobs are not ranked and you get no alerts"}</span>
          </summary>
          <div className="px-4 pb-4">
            <PrefsForm prefs={prefs} tiers={tierProfiles.map((t) => ({ id: t.id, name: t.name }))} />
          </div>
        </details>

        <DiscoverFilters tiers={tierProfiles.map((t) => ({ id: t.id, name: t.name }))} />

        <p className="text-xs text-muted-foreground" role="status">
          {found.matching.toLocaleString()} matching · reading {active.length} sources{lastOk ? `, last updated ${new Date(lastOk).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
          {!found.hasResume && (
            <>
              {" "}
              · <Link href="/resume" className="text-primary underline-offset-2 hover:underline">save your resume</Link> to rank by skills
            </>
          )}
        </p>

        {found.items.length === 0 ? (
          <EmptyState icon={Compass} title={filtering ? "No jobs match these filters" : lastOk ? "Nothing here yet" : "No jobs loaded yet"} compact>
            <p>{filtering ? "Loosen a filter or clear the search." : lastOk ? "Everything found is hidden or filtered out." : "Press Refresh to read the company career pages and remote feeds. After that it updates every few hours by itself."}</p>
            {filtering && (
              <Button asChild variant="outline" className="mt-3">
                <Link href="/jobs">Clear filters</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Jobs">
            {found.items.map((p) => (
              <PostingCard key={p.id} p={{ ...p, tierName: tierName.get(p.tier) ?? "" }} />
            ))}
          </ul>
        )}
        {found.matching > found.items.length && (
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <p>
              Showing the best {found.items.length} of {found.matching.toLocaleString()}.
            </p>
            {pageSize < 150 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/jobs?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "n" ? [[k, v]] : []))), n: String(pageSize + 30) }).toString()}`} scroll={false}>
                  Show 30 more
                </Link>
              </Button>
            )}
          </div>
        )}
      </PageStack>
    </>
  );
}
