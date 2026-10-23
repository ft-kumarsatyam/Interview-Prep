import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { loadRoadmap, roadmapMeta } from "@/core/roadmaps";
import { JobDemandCard } from "@/modules/roadmap/components/job-demand-card";
import { RoadmapBodySection } from "@/modules/roadmap/components/roadmap-body-section";
import { demandByNode } from "@/modules/roadmap/domain/roadmap";
import { termsIn } from "@/modules/jobs/domain/ats";
import { listJobs } from "@/modules/jobs/services/jobs";
import { getRoadmapState } from "@/modules/roadmap/services/roadmap";

export async function generateMetadata({ params }: PageProps<"/roadmaps/[roadmapId]">): Promise<Metadata> {
  const { roadmapId } = await params;
  return { title: roadmapMeta().find((m) => m.id === decodeURIComponent(roadmapId))?.title ?? "Roadmap" };
}

async function JobDemandSection({ roadmapId, trackId }: { roadmapId: string; trackId?: string }) {
  const roadmap = await loadRoadmap(roadmapId);
  if (!roadmap?.sections.some((s) => s.nodes.some((n) => n.skills.length > 0))) return null;
  const [state, jobs] = await Promise.all([getRoadmapState(roadmap), listJobs()]).catch(() => [null, null] as const);
  if (!state || !jobs) return null;
  void trackId;
  return <JobDemandCard rows={demandByNode(roadmap, jobs.map((j) => termsIn(`${j.title}\n${j.jd}`)), state.statuses)} jobCount={jobs.length} />;
}

export default async function RoadmapPage({ params, searchParams }: PageProps<"/roadmaps/[roadmapId]">) {
  const { roadmapId: raw } = await params;
  const { track: trackParam } = await searchParams;
  const roadmapId = decodeURIComponent(raw);
  const roadmap = await loadRoadmap(roadmapId);
  if (!roadmap) notFound();
  const trackId = Array.isArray(trackParam) ? trackParam[0] : trackParam;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <BackLink href="/roadmaps">Roadmaps</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{roadmap.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{roadmap.blurb}</p>
      </div>
      <Suspense fallback={<PageSkeleton cards={6} label="Loading roadmap progress…" />}>
        <RoadmapBodySection roadmap={roadmap} trackId={trackId} />
      </Suspense>
      <Suspense fallback={null}>
        <JobDemandSection roadmapId={roadmap.id} trackId={trackId} />
      </Suspense>
    </div>
  );
}
