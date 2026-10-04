import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { subtopics, topics, tracks } from "@/core/content";
import { CustomQuizBuilder, type BuilderSubject } from "@/modules/quiz/components/custom-quiz-builder";
import { bank } from "@/modules/quiz/lib/bank";
import { getStudied } from "@/modules/progress/services/studied";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "Custom quiz" };

export default async function CustomQuizPage() {
  const [studied, settings] = await Promise.all([getStudied(), getSettings()]);
  const hasQuestions = (id: string) => (bank().bySubtopic.get(id)?.length ?? 0) > 0;

  const subjects: BuilderSubject[] = tracks
    .map((t) => ({
      id: t.id,
      name: t.name,
      topics: topics
        .filter((x) => x.track === t.id)
        .map((x) => ({
          id: x.id,
          title: x.title,
          subtopics: subtopics.filter((s) => s.topicId === x.id && hasQuestions(s.id)).map((s) => ({ id: s.id, title: s.title, studied: studied.subtopics.has(s.id) })),
        }))
        .filter((x) => x.subtopics.length > 0),
    }))
    .filter((t) => t.topics.length > 0);

  return (
    <>
      <BackLink href="/practice">Practice</BackLink>
      <PageHeader icon={ListChecks} title="Custom quiz" description="Be quizzed on exactly what you want: what you have studied, topics you pick, or a whole subject. It updates your mastery and never touches your streak." />
      <CustomQuizBuilder subjects={subjects} studiedCount={studied.subtopics.size} passPct={settings.quizPassPct} />
    </>
  );
}
