import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { roadmapById } from "@/core/roadmaps";
import { ResourceLibrary } from "@/modules/roadmap/components/resource-library";
import { collectResources } from "@/modules/roadmap/domain/roadmap";
import { getDeadLinks } from "@/modules/roadmap/services/link-health";

export async function generateMetadata({ params }: PageProps<"/roadmaps/[roadmapId]/docs">): Promise<Metadata> {
  const { roadmapId } = await params;
  const title = roadmapById.get(decodeURIComponent(roadmapId))?.title;
  return { title: title ? `${title}: documentation library` : "Documentation library" };
}

export default async function RoadmapDocsPage({ params }: PageProps<"/roadmaps/[roadmapId]/docs">) {
  const { roadmapId: raw } = await params;
  const roadmapId = decodeURIComponent(raw);
  const roadmap = roadmapById.get(roadmapId);
  if (!roadmap) notFound();
  const resources = collectResources(roadmap);
  const dead = await getDeadLinks(resources.map((r) => r.url));
  const views = resources.map((r) => ({
    url: r.url,
    title: r.title,
    kind: r.kind,
    dead: dead.has(r.url),
    nodes: r.nodes.map((n) => ({ id: n.id, title: n.title, sectionTitle: n.sectionTitle })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href={`/roadmaps/${roadmap.id}`}>{roadmap.title}</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Documentation library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every doc, video, course and article this roadmap points to, in one place. A daily check flags links that stop working.</p>
      </div>
      <ResourceLibrary resources={views} roadmapId={roadmap.id} />
    </div>
  );
}
