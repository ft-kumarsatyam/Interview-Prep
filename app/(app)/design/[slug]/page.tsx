import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import { AskGemini } from "@/components/ai/ask-gemini";
import { ArticleSection, BulletList, ReadingList, RelatedNews } from "@/components/design/case-article";
import { CaseHeader } from "@/components/design/case-header";
import { CasePager } from "@/components/design/case-pager";
import { CaseQuizButton } from "@/components/design/case-quiz-button";
import { CaseWorkspace, type TocItem } from "@/components/design/case-workspace";
import { DesignPractice } from "@/components/design/design-practice";
import { MermaidDiagram } from "@/components/design/mermaid-diagram";
import { Button } from "@/components/ui/button";
import { DESIGN_CATEGORIES, designBlockById, designCaseBySlug, systemDesign, topicById } from "@/lib/content";
import { casePrompt, joinSections } from "@/lib/domain/ask-prompt";
import { caseRef } from "@/lib/domain/case-quiz";
import { PRACTICE_MINUTES } from "@/lib/domain/design";
import { getDesign, relatedArticlesForCase } from "@/lib/services/designs";
import { getMasteryMap } from "@/lib/services/mastery";

export async function generateMetadata({ params }: PageProps<"/design/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: designCaseBySlug.get(slug)?.title ?? "System Design" };
}

export default async function DesignCasePage({ params, searchParams }: PageProps<"/design/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const c = designCaseBySlug.get(slug);
  if (!c) notFound();
  const [answer, related, mastery] = await Promise.all([getDesign(slug), relatedArticlesForCase(c), getMasteryMap()]);
  const topic = topicById.get(c.topicId);
  const hasAnswer = Object.values(answer.sections).some((t) => t.trim().split(/\s+/).filter(Boolean).length >= 15);
  const blocks = c.blocks.map((id) => designBlockById.get(id)).filter((b) => b !== undefined);
  const ordered = DESIGN_CATEGORIES.flatMap((cat) => systemDesign.cases.filter((x) => x.category === cat));
  const index = ordered.findIndex((x) => x.slug === slug);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];

  const critique = (
    <AskGemini
      subject="hld"
      label={hasAnswer ? "Get my design critiqued" : "Ask Gemini"}
      prompt={casePrompt({ kind: "System Design", title: c.title, summary: c.summary, prompt: [`Design ${c.title}`, ...c.probes.slice(0, 3)], answer: hasAnswer ? joinSections(answer.sections) : undefined })}
    />
  );

  const toc: TocItem[] = [
    { id: "functional", label: "Requirements" },
    { id: "estimates", label: "Estimates" },
    { id: "api", label: "API & data model" },
    { id: "architecture", label: "Architecture" },
    { id: "deep-dives", label: "Deep dives" },
    { id: "tradeoffs", label: "Trade-offs & follow-ups" },
    ...(blocks.length > 0 ? [{ id: "blocks", label: "Building blocks" }] : []),
    { id: "readings", label: "Further reading" },
  ];

  const study = (
    <>
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
        <ArticleSection id="functional" title="Functional requirements">
          <BulletList items={c.functional} />
        </ArticleSection>
        <ArticleSection id="non-functional" title="Non-functional requirements">
          <BulletList items={c.nonFunctional} />
        </ArticleSection>
      </div>

      <ArticleSection id="estimates" title="Back-of-the-envelope">
        <BulletList items={c.estimates} />
      </ArticleSection>

      <div className="grid gap-x-6 gap-y-10 xl:grid-cols-2">
        <ArticleSection id="api" title="API">
          <BulletList items={c.api} mono />
        </ArticleSection>
        <ArticleSection id="data-model" title="Data model">
          <BulletList items={c.dataModel} mono />
        </ArticleSection>
      </div>

      <ArticleSection id="architecture" title="High-level architecture">
        <MermaidDiagram code={c.diagram} label={`${c.title} architecture diagram`} />
      </ArticleSection>

      <ArticleSection id="deep-dives" title="Deep dives">
        <div className="space-y-3">
          {c.deepDives.map((d, i) => (
            <article key={d.title} className="rounded-xl border bg-card p-4">
              <h3 className="mb-1.5 flex gap-2 font-medium">
                <span className="font-mono text-sm text-muted-foreground tabular">{String(i + 1).padStart(2, "0")}</span>
                {d.title}
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{d.body}</p>
            </article>
          ))}
        </div>
      </ArticleSection>

      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
        <ArticleSection id="tradeoffs" title="Trade-offs to say out loud">
          <BulletList items={c.tradeoffs} />
        </ArticleSection>
        <ArticleSection id="probes" title="Interviewer follow-ups">
          <BulletList items={c.probes} />
        </ArticleSection>
      </div>

      {blocks.length > 0 && (
        <ArticleSection id="blocks" title="Building blocks used">
          <ul className="flex flex-wrap gap-2">
            {blocks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/design#block-${b.id}`}
                  title={b.summary}
                  className="inline-flex min-h-9 items-center rounded-full border px-3 text-sm transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </ArticleSection>
      )}

      <div className="grid gap-x-6 gap-y-10 xl:grid-cols-2">
        <ArticleSection id="readings" title="Real-world write-ups">
          <ReadingList readings={c.readings} />
        </ArticleSection>
        <ArticleSection id="related" title="Related from your news feed">
          <RelatedNews items={related} />
        </ArticleSection>
      </div>
    </>
  );

  return (
    <>
      <CaseHeader
        backHref="/design"
        backLabel="System Design"
        level={c.level}
        context={[c.category, topic?.title].filter(Boolean).join(" · ")}
        position={index >= 0 ? { index, total: ordered.length } : undefined}
        title={c.title}
        summary={c.summary}
      >
        <CaseQuizButton kind="hld" slug={slug} mastery={mastery[caseRef("hld", slug)]} />
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
        initialTab={tab === "practice" ? "practice" : "study"}
        toc={toc}
        practiceLabel="Mock interview"
        readyHint={`Close the notes, start the ${PRACTICE_MINUTES}-minute clock and design it from scratch, saving each section as you go.`}
        study={study}
        practice={
          <DesignPractice
            slug={c.slug}
            sections={answer.sections}
            rubric={systemDesign.framework.rubric}
            checked={answer.rubric}
            minutesSpent={answer.minutesSpent}
            feedback={critique}
          />
        }
      />

      <CasePager prev={prev && { href: `/design/${prev.slug}`, title: prev.title }} next={next && { href: `/design/${next.slug}`, title: next.title }} />
    </>
  );
}
