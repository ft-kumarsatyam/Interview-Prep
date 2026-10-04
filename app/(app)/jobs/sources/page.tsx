import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { LiveRefresh } from "@/core/components/live/live-refresh";
import { JobsTabs } from "@/modules/jobs/components/jobs-tabs";
import { SourcesManager } from "@/modules/jobs/components/sources-manager";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { careerDeepLinks, tierProfiles } from "@/core/content";
import { getKv } from "@/core/kv";
import { listSources } from "@/modules/jobs/services/job-discovery";
import { listJobs } from "@/modules/jobs/services/jobs";

export const metadata: Metadata = { title: "Job sources" };
export const maxDuration = 60;

export default async function SourcesPage() {
  const [sources, tracked] = await Promise.all([listSources(), listJobs()]);
  const tierName = new Map<string, string>(tierProfiles.map((t) => [t.id, t.name]));
  const total = sources.reduce((n, s) => n + s.open, 0);
  const failing = sources.filter((s) => s.health === "cooling down").length;
  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="Where jobs come from. PrepOS reads the public job boards that companies publish (never your accounts) and a few remote-job feeds, every few hours." />
      <JobsTabs active="sources" trackerCount={tracked.length} />
      <LiveRefresh types={["sync.done"]} />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Sources on" value={String(sources.filter((s) => s.enabled).length)} hint={`of ${sources.length}`} />
          <StatTile label="Open jobs" value={total.toLocaleString()} hint="engineering roles kept" />
          <StatTile label="Needing attention" value={String(failing)} tone={failing ? "warning" : "neutral"} hint="backing off after errors" />
          <StatTile label="Link-only companies" value={String(careerDeepLinks.length)} hint="no public API, see Search links" />
          <StatTile label="Shared state" value={getKv().name === "upstash" ? "Redis" : "MongoDB"} hint="locks, limits, live events" />
        </div>
        <SourcesManager
          tiers={tierProfiles.map((t) => ({ id: t.id, name: t.name }))}
          sources={sources.map((s) => ({ id: s.id, name: s.name, kind: s.kind, ats: s.ats, tierName: tierName.get(s.tier) ?? "", custom: s.custom, enabled: s.enabled, open: s.open, lastOkAt: s.lastOkAt, lastError: s.lastError, health: s.health }))}
        />
      </div>
    </>
  );
}
