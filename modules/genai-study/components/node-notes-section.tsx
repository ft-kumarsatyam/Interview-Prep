import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { loadNodeStudy } from "@/core/genai-study";
import { SubtopicCard } from "@/modules/genai-study/components/subtopic-card";
import { studyStats, subtopicDetail, subtopicKey } from "@/modules/genai-study/domain/study";
import { getNodeStudyStatus } from "@/modules/genai-study/services/study";

/** Notes and ratings for one roadmap node. A failure hides the list instead of breaking the page. */
export async function NodeNotesSection({ roadmapId, nodeId, checklist }: { roadmapId: string; nodeId: string; checklist: readonly string[] }) {
  const notes = await loadNodeStudy(roadmapId, nodeId).catch(() => undefined);
  if (!notes) {
    return (
      <EmptyState icon={BookOpen} title="Study notes are not written for this topic yet">
        The checklist on the roadmap still works. Notes and questions arrive level by level.
      </EmptyState>
    );
  }
  const status = await getNodeStudyStatus(roadmapId, nodeId).catch(() => new Map());
  const written = checklist.map(subtopicKey).filter((k) => notes[k]);
  const stats = studyStats(written, status);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Progress value={stats.pct} aria-label="Sub-topics you know" className="h-2 max-w-xs" />
        <span className="tabular font-mono text-xs text-muted-foreground">
          {stats.known}/{stats.total} got it · {stats.review} to review
        </span>
      </div>
      <ul className="space-y-3">
        {checklist.map((item) => {
          const key = subtopicKey(item);
          const entry = notes[key];
          return entry ? (
            <SubtopicCard key={key} roadmapId={roadmapId} nodeId={nodeId} itemKey={key} title={item.replace(/^\[[^\]]*\]\s*/, "").split(/:\s/)[0] ?? item} detail={subtopicDetail(item)} entry={entry} initialStatus={status.get(key) ?? "new"} />
          ) : null;
        })}
      </ul>
    </>
  );
}
