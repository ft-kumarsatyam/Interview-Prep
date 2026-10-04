import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { LessonCheck } from "@/components/web/lesson-check";
import { ArticleMarkdown } from "@/components/news/article-markdown";
import { BackLink } from "@/components/shared/back-link";
import { InlineCode } from "@/components/shared/inline-code";
import { ToneBadge } from "@/components/shared/tone-badge";
import { interviewQuestions, webLessonById, webLessons, webProjects, webTracks } from "@/lib/content";
import { getDoneLessons } from "@/lib/services/webdev";

export async function generateMetadata({ params }: PageProps<"/web/[lessonId]">): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: webLessonById.get(decodeURIComponent(lessonId))?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/web/[lessonId]">) {
  const { lessonId } = await params;
  const lesson = webLessonById.get(decodeURIComponent(lessonId));
  if (!lesson) notFound();
  const done = await getDoneLessons();
  const i = webLessons.findIndex((l) => l.id === lesson.id);
  const prev = webLessons[i - 1];
  const next = webLessons[i + 1];
  const track = webTracks.find((t) => t.id === lesson.track);
  const usedBy = webProjects.filter((p) => p.lessons.includes(lesson.id));
  const answered = interviewQuestions.filter((q) => q.lesson === lesson.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href="/web">Web development</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{lesson.title}</h1>
          {done.has(lesson.id) && <ToneBadge tone="success">Done</ToneBadge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {track?.name} · {lesson.minutes} min · {lesson.summary}
        </p>
      </div>

      <article className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
        <ArticleMarkdown markdown={lesson.body} />
      </article>

      <section aria-label="Key points" className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20">
        <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Lightbulb className="size-4" aria-hidden /> Remember
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lesson.keyPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Interview questions" className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <MessageCircleQuestion className="size-4 text-muted-foreground" aria-hidden /> Be ready to answer
          </h2>
          {answered.length > 0 && (
            <Link href={`/web/interview/${lesson.track}`} className="text-xs text-primary underline-offset-2 hover:underline">
              Practise {track?.name} questions
            </Link>
          )}
        </div>
        {answered.length > 0 ? (
          <ul className="divide-y">
            {answered.map((q) => (
              <li key={q.id}>
                <details className="group py-2">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    <span>
                      <InlineCode text={q.q} />
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="min-w-0 rounded-lg bg-muted/40 p-3">
                      <ArticleMarkdown markdown={q.answer} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-warning">Weak answers miss:</span> {q.mistakes.join(" · ")}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {lesson.interview.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
      </section>

      <LessonCheck key={lesson.id} lessonId={lesson.id} check={lesson.check} done={done.has(lesson.id)} />

      {usedBy.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Practise it in: {usedBy.map((p, n) => (
            <span key={p.slug}>
              {n > 0 && ", "}
              <Link href={`/projects/${p.slug}`} className="text-primary underline-offset-2 hover:underline">
                {p.title}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Read more</span>
        {lesson.resources.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {r.title} <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ))}
      </div>

      <nav aria-label="Lessons" className="flex justify-between gap-3 border-t pt-4 text-sm">
        {prev ? (
          <Link href={`/web/${prev.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/web/${next.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {next.title} <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
