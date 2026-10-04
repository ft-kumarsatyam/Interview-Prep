import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, Globe, MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { interviewQuestions, interviewTracks, webLessons, webTracks } from "@/lib/content";
import { nextLesson, trackProgress } from "@/lib/domain/webdev";
import { getDoneLessons } from "@/lib/services/webdev";

export const metadata: Metadata = { title: "Web dev" };

export default async function WebPage() {
  const done = new Set((await getDoneLessons()).keys());
  const progress = new Map(trackProgress(webLessons, done).map((p) => [p.track, p]));
  const next = nextLesson(webLessons, done);

  return (
    <>
      <PageHeader icon={Globe} title="Web development and architecture" description="React, Next.js, Node and NestJS, SQL, MongoDB, distributed databases like CockroachDB, and the architecture patterns that tie them together. Optional: this never changes your study plan.">
        {next && (
          <Button asChild>
            <Link href={`/web/${next.id}`}>Continue: {next.title}</Link>
          </Button>
        )}
      </PageHeader>
      <div className="space-y-8">
        <Link href="/web/interview" className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageCircleQuestion className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Interview prep: {interviewQuestions.length} questions with model answers</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {interviewTracks.map((t) => t.name).join(", ")}. Practise like flashcards; the ones you miss come back first.
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        {webTracks.map((t) => {
          const p = progress.get(t.id)!;
          return (
            <section key={t.id} aria-label={t.name} className="space-y-3">
              <SectionHeading title={t.name} hint={t.blurb} />
              <div className="flex items-center gap-3">
                <Progress value={p.pct} aria-label={`${t.name} progress`} className="h-2 max-w-xs" />
                <span className="tabular font-mono text-xs text-muted-foreground">
                  {p.done}/{p.total}
                </span>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {webLessons
                  .filter((l) => l.track === t.id)
                  .map((l) => (
                    <li key={l.id}>
                      <Link href={`/web/${l.id}`} className="flex h-full gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${done.has(l.id) ? "border-success bg-success text-white" : ""}`}>{done.has(l.id) && <Check className="size-3" aria-label="Done" />}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{l.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{l.summary}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{l.minutes} min</span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
        <p className="text-sm text-muted-foreground">
          Ready to build? Each topic feeds a guided project: <Link href="/projects" className="text-primary underline-offset-2 hover:underline">see the projects</Link>.
        </p>
      </div>
    </>
  );
}
