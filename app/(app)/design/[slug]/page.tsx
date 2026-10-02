import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, GraduationCap, Newspaper } from "lucide-react";
import { DesignPractice } from "@/components/design/design-practice";
import { MermaidDiagram } from "@/components/design/mermaid-diagram";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { designBlockById, designCaseBySlug, systemDesign, topicById } from "@/lib/content";
import { getDesign, relatedArticlesForCase } from "@/lib/services/designs";

export async function generateMetadata({ params }: PageProps<"/design/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: designCaseBySlug.get(slug)?.title ?? "System Design" };
}

function List({ items, mono }: { items: string[]; mono?: boolean }) {
  return (
    <ul className={mono ? "space-y-1.5 font-mono text-[13px]" : "list-disc space-y-1 pl-5 text-sm"}>
      {items.map((x) => (
        <li key={x} className={mono ? "rounded-md bg-muted/50 px-2.5 py-1.5 break-words" : undefined}>
          {x}
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 space-y-3">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DesignCasePage({ params }: PageProps<"/design/[slug]">) {
  const { slug } = await params;
  const c = designCaseBySlug.get(slug);
  if (!c) notFound();
  const [answer, related] = await Promise.all([getDesign(slug), relatedArticlesForCase(c)]);
  const topic = topicById.get(c.topicId);
  const blocks = c.blocks.map((id) => designBlockById.get(id)).filter((b) => b !== undefined);

  return (
    <>
      <Link href="/design" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> System Design
      </Link>
      <header className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{c.level}</span>
          {topic && <span>{topic.title}</span>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{c.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{c.summary}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/learn/practice?ref=${encodeURIComponent(c.practiceRef)}`}>
              <GraduationCap /> Practice quiz
            </Link>
          </Button>
          {topic && (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/learn?track=${topic.track}`}>
                <BookOpen /> Syllabus topic
              </Link>
            </Button>
          )}
        </div>
      </header>

      <Tabs defaultValue="study">
        <TabsList className="mb-6">
          <TabsTrigger value="study">Study</TabsTrigger>
          <TabsTrigger value="practice">Mock interview</TabsTrigger>
        </TabsList>

        <TabsContent value="study" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Section id="functional" title="Functional requirements">
              <List items={c.functional} />
            </Section>
            <Section id="non-functional" title="Non-functional requirements">
              <List items={c.nonFunctional} />
            </Section>
          </div>

          <Section id="estimates" title="Back-of-the-envelope">
            <List items={c.estimates} />
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="api" title="API">
              <List items={c.api} mono />
            </Section>
            <Section id="data-model" title="Data model">
              <List items={c.dataModel} mono />
            </Section>
          </div>

          <Section id="architecture" title="High-level architecture">
            <MermaidDiagram code={c.diagram} label={`${c.title} architecture diagram`} />
          </Section>

          <Section id="deep-dives" title="Deep dives">
            <div className="space-y-3">
              {c.deepDives.map((d) => (
                <article key={d.title} className="rounded-xl border bg-card p-4">
                  <h3 className="mb-1.5 font-medium">{d.title}</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{d.body}</p>
                </article>
              ))}
            </div>
          </Section>

          <div className="grid gap-6 md:grid-cols-2">
            <Section id="tradeoffs" title="Trade-offs to say out loud">
              <List items={c.tradeoffs} />
            </Section>
            <Section id="probes" title="Interviewer follow-ups">
              <List items={c.probes} />
            </Section>
          </div>

          {blocks.length > 0 && (
            <Section id="blocks" title="Building blocks used">
              <ul className="flex flex-wrap gap-2">
                {blocks.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/design#block-${b.id}`}
                      title={b.summary}
                      className="inline-block rounded-full border px-3 py-1 text-sm transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="readings" title="Real-world write-ups">
              <ul className="space-y-2">
                {c.readings.map((r) => (
                  <li key={r.url}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-lg border bg-card p-3 text-sm hover:border-primary/50"
                    >
                      <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className="font-medium group-hover:text-primary">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{new URL(r.url).hostname.replace(/^www\./, "")}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="related" title="Related from your news feed">
              {related.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No matching articles in the last 30 days. They show up here once the morning job pulls engineering posts on this topic.
                </p>
              ) : (
                <ul className="space-y-2">
                  {related.map((a) => (
                    <li key={a.id}>
                      <Link href={`/news/${a.id}`} className="group flex items-start gap-2 rounded-lg border bg-card p-3 text-sm hover:border-primary/50">
                        <Newspaper className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium group-hover:text-primary">{a.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {a.sourceName}
                            {a.readingMinutes ? ` · ${a.readingMinutes} min` : ""}
                            {a.read ? " · read" : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="practice">
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            Design it yourself before re-reading the study tab. Start the timer, write each section in markdown (it autosaves), then score yourself honestly.
          </p>
          <DesignPractice
            slug={c.slug}
            sections={answer.sections}
            rubric={systemDesign.framework.rubric}
            checked={answer.rubric}
            minutesSpent={answer.minutesSpent}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
