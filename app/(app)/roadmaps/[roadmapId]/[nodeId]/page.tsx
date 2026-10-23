import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { requireSession } from "@/core/auth/dal";
import { nodeStudy } from "@/core/genai-study";
import { roadmapById } from "@/core/roadmaps";
import { SubtopicCard } from "@/modules/genai-study/components/subtopic-card";
import { studyStats, subtopicDetail, subtopicKey } from "@/modules/genai-study/domain/study";
import { getNodeStudyStatus } from "@/modules/genai-study/services/study";
import { allNodes } from "@/modules/roadmap/domain/roadmap";

const find = (roadmapId: string, nodeId: string) => {
  const roadmap = roadmapById.get(roadmapId);
  const node = roadmap ? allNodes(roadmap).find((n) => n.id === nodeId) : undefined;
  return roadmap && node ? { roadmap, node } : null;
};

export async function generateMetadata({ params }: PageProps<"/roadmaps/[roadmapId]/[nodeId]">): Promise<Metadata> {
  const { roadmapId, nodeId } = await params;
  return { title: find(decodeURIComponent(roadmapId), decodeURIComponent(nodeId))?.node.title ?? "Study notes" };
}

export default async function NodeStudyPage({ params }: PageProps<"/roadmaps/[roadmapId]/[nodeId]">) {
  await requireSession();
  const { roadmapId: r, nodeId: n } = await params;
  const found = find(decodeURIComponent(r), decodeURIComponent(n));
  if (!found) notFound();
  const { roadmap, node } = found;
  const notes = nodeStudy(roadmap.id, node.id);
  const status = notes ? await getNodeStudyStatus(roadmap.id, node.id) : new Map();
  const written = node.checklist.map(subtopicKey).filter((k) => notes?.[k]);
  const stats = studyStats(written, status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href={`/roadmaps/${roadmap.id}#node-${node.id}`}>{roadmap.title}</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{node.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{node.summary}</p>
        {notes && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Progress value={stats.pct} aria-label="Sub-topics you know" className="h-2 max-w-xs" />
            <span className="tabular font-mono text-xs text-muted-foreground">
              {stats.known}/{stats.total} got it · {stats.review} to review
            </span>
          </div>
        )}
      </div>
      {!notes ? (
        <EmptyState icon={BookOpen} title="Study notes are not written for this topic yet">
          The checklist on the roadmap still works. Notes and questions arrive level by level.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {node.checklist.map((item) => {
            const key = subtopicKey(item);
            const entry = notes[key];
            return entry ? (
              <SubtopicCard key={key} roadmapId={roadmap.id} nodeId={node.id} itemKey={key} title={item.replace(/^\[[^\]]*\]\s*/, "").split(/:\s/)[0] ?? item} detail={subtopicDetail(item)} entry={entry} initialStatus={status.get(key) ?? "new"} />
            ) : null;
          })}
        </ul>
      )}
    </div>
  );
}
