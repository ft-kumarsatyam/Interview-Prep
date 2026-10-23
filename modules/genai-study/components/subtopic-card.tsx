import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { SubtopicFrame } from "@/modules/genai-study/components/subtopic-frame";
import type { StudyEntry, StudyStatus } from "@/modules/genai-study/domain/study";

/** Server wrapper: markdown stays a server child; the island only hydrates toggles. */
export function SubtopicCard({
  roadmapId,
  nodeId,
  itemKey,
  title,
  detail,
  entry,
  initialStatus,
}: {
  roadmapId: string;
  nodeId: string;
  itemKey: string;
  title: string;
  detail: string;
  entry: StudyEntry;
  initialStatus: StudyStatus;
}) {
  return (
    <SubtopicFrame
      roadmapId={roadmapId}
      nodeId={nodeId}
      itemKey={itemKey}
      title={title}
      detail={detail}
      initialStatus={initialStatus}
      questions={entry.questions.map((q) => ({ q: q.q, kind: q.kind }))}
      keyPoints={entry.keyPoints}
      lab={entry.lab}
      links={entry.links}
      explain={<ArticleMarkdown markdown={entry.explain} />}
      answers={entry.questions.map((q) => (
        <ArticleMarkdown key={q.q} markdown={q.a} />
      ))}
    />
  );
}
