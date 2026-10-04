import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, GraduationCap, MessageSquareQuote } from "lucide-react";
import { AskGemini } from "@/modules/ai/components/ask-gemini";
import { Button } from "@/components/ui/button";
import { practiceCaseBySlug, practiceCases, topicById } from "@/core/content";
import { casePrompt, joinSections } from "@/modules/ai/domain/ask-prompt";
import { caseRef } from "@/modules/design/domain/case-quiz";
import { EXPLAIN_MINUTES, EXPLAIN_RUBRIC, type PracticeKind } from "@/modules/design/domain/practice-cases";
import { getMasteryMap } from "@/modules/progress/services/mastery";
import { getPracticeAnswer } from "@/modules/design/services/practice-cases";
import { ArticleSection, BulletList, ReadingList } from "@/modules/design/components/case-article";
import { CaseHeader } from "@/modules/design/components/case-header";
import { CasePager } from "@/modules/design/components/case-pager";
import { CaseQuizButton } from "@/modules/design/components/case-quiz-button";
import { CaseWorkspace, type CaseTab, type TocItem } from "@/modules/design/components/case-workspace";
import { DesignPractice } from "@/modules/design/components/design-practice";
import { MermaidDiagram } from "@/modules/design/components/mermaid-diagram";

const LABEL = { os: "Operating Systems", dbms: "Databases" } as const satisfies Record<PracticeKind, string>;

export async function PracticeCaseDetail({ kind, slug, tab = "study" }: { kind: PracticeKind; slug: string; tab?: CaseTab }) {
  const c = practiceCaseBySlug.get(`${kind}:${slug}`);
  if (!c) notFound();
  const [answer, mastery] = await Promise.all([getPracticeAnswer(kind, slug), getMasteryMap()]);
  const topic = topicById.get(c.topicId);
  const hasAnswer = Object.values(answer.sections).some((t) => t.trim().split(/\s+/).filter(Boolean).length >= 15);
  const siblings = practiceCases.filter((x) => x.kind === kind);
  const index = siblings.findIndex((x) => x.slug === slug);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];

  const critique = (
    <AskGemini
      subject={kind}
      label={hasAnswer ? "Get my answer critiqued" : "Ask Gemini"}
      prompt={casePrompt({ kind: LABEL[kind], title: c.title, summary: c.summary, prompt: c.prompt, answer: hasAnswer ? joinSections(answer.sections) : undefined })}
    />
  );

  const toc: TocItem[] = [
    { id: "prompt", label: "The question" },
    { id: "talking-points", label: "Strong answer" },
    ...(c.diagram ? [{ id: "diagram", label: "Diagram" }] : []),
    { id: "tradeoffs", label: "Trade-offs & follow-ups" },
    { id: "readings", label: "Read more" },
  ];

  const study = (
    <>
      <ArticleSection id="prompt" title="The question">
        <div className="space-y-2">
          {c.prompt.map((q) => (
            <blockquote key={q} className="flex gap-2.5 rounded-lg border-l-4 border-primary/60 bg-muted/40 px-4 py-3 text-sm leading-relaxed">
              <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{q}</span>
            </blockquote>
          ))}
        </div>
      </ArticleSection>

      <ArticleSection id="talking-points" title="What a strong answer covers">
        <BulletList items={c.talkingPoints} />
      </ArticleSection>

      {c.diagram && (
        <ArticleSection id="diagram" title="Diagram">
          <MermaidDiagram code={c.diagram} label={`${c.title} diagram`} />
        </ArticleSection>
      )}

      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
        <ArticleSection id="tradeoffs" title="Trade-offs to say out loud">
          <BulletList items={c.tradeoffs} />
        </ArticleSection>
        <ArticleSection id="probes" title="Interviewer follow-ups">
          <BulletList items={c.probes} />
        </ArticleSection>
      </div>

      <ArticleSection id="readings" title="Read more">
        <ReadingList readings={c.readings} className="grid gap-2 space-y-0 md:grid-cols-2" />
      </ArticleSection>
    </>
  );

  return (
    <>
      <CaseHeader
        backHref={`/design/${kind}`}
        backLabel={LABEL[kind]}
        level={c.level}
        context={topic?.title}
        position={index >= 0 ? { index, total: siblings.length } : undefined}
        title={c.title}
        summary={c.summary}
      >
        <CaseQuizButton kind={kind} slug={slug} mastery={mastery[caseRef(kind, slug)]} />
        <Button asChild size="sm" variant="outline">
          <Link href={`/learn/practice?ref=${encodeURIComponent(c.practiceRef)}`}>
            <GraduationCap /> Topic drill
          </Link>
        </Button>
        {critique}
        {topic && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/learn/${encodeURIComponent(topic.id)}`}>
              <BookOpen /> Syllabus topic
            </Link>
          </Button>
        )}
      </CaseHeader>

      <CaseWorkspace
        initialTab={tab}
        toc={toc}
        practiceLabel="Mock answer"
        readyHint={`Close the notes, start the ${EXPLAIN_MINUTES}-minute clock and answer out loud in writing, saving each section as you go.`}
        study={study}
        practice={
          <DesignPractice
            slug={c.slug}
            kind={kind}
            sections={answer.sections}
            rubric={[...EXPLAIN_RUBRIC]}
            checked={answer.rubric}
            minutesSpent={answer.minutesSpent}
            feedback={critique}
          />
        }
      />

      <CasePager prev={prev && { href: `/design/${kind}/${prev.slug}`, title: prev.title }} next={next && { href: `/design/${kind}/${next.slug}`, title: next.title }} />
    </>
  );
}
