import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireSession } from "@/core/auth/dal";
import { loadRoadmap, roadmapMeta } from "@/core/roadmaps";
import { NodeNotesSection } from "@/modules/genai-study/components/node-notes-section";
import { allNodes } from "@/modules/roadmap/domain/roadmap";

async function find(roadmapId: string, nodeId: string) {
  const roadmap = await loadRoadmap(roadmapId);
  const node = roadmap ? allNodes(roadmap).find((n) => n.id === nodeId) : undefined;
  return roadmap && node ? { roadmap, node } : null;
}

export async function generateMetadata({ params }: PageProps<"/roadmaps/[roadmapId]/[nodeId]">): Promise<Metadata> {
  const { roadmapId, nodeId } = await params;
  return { title: (await find(decodeURIComponent(roadmapId), decodeURIComponent(nodeId)))?.node.title ?? roadmapMeta().find((m) => m.id === decodeURIComponent(roadmapId))?.title ?? "Study notes" };
}

export default async function NodeStudyPage({ params }: PageProps<"/roadmaps/[roadmapId]/[nodeId]">) {
  await requireSession();
  const { roadmapId: r, nodeId: n } = await params;
  const found = await find(decodeURIComponent(r), decodeURIComponent(n));
  if (!found) notFound();
  const { roadmap, node } = found;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href={`/roadmaps/${roadmap.id}#node-${node.id}`}>{roadmap.title}</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{node.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{node.summary}</p>
      </div>
      <Suspense fallback={<PageSkeleton cards={5} label="Loading study notes…" />}>
        <NodeNotesSection roadmapId={roadmap.id} nodeId={node.id} checklist={node.checklist} />
      </Suspense>
    </div>
  );
}
