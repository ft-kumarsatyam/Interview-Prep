import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Lightbulb } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { courseLessonByKey, courseById } from "@/core/courses";
import { problemBySlug } from "@/core/content";
import { CodeTabs } from "@/modules/course/components/code-tabs";
import { CourseCheck } from "@/modules/course/components/course-check";
import { PartTabs } from "@/modules/course/components/part-tabs";
import { courseNeighbours } from "@/modules/course/domain/course";
import { getDoneLessons } from "@/modules/course/services/progress";
import { getLessonSubtopic } from "@/modules/progress/services/lesson-confirm";
import { MermaidDiagram } from "@/modules/design/components/mermaid-diagram";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]/[lessonId]">): Promise<Metadata> {
  const { courseId, lessonId } = await params;
  return { title: courseLessonByKey.get(`${decodeURIComponent(courseId)}/${decodeURIComponent(lessonId)}`)?.title ?? "Lesson" };
}

export default async function CourseLessonPage({ params }: PageProps<"/courses/[courseId]/[lessonId]">) {
  const { courseId: rawCourse, lessonId: rawLesson } = await params;
  const courseId = decodeURIComponent(rawCourse);
  const lessonId = decodeURIComponent(rawLesson);
  const course = courseById.get(courseId);
  const lesson = courseLessonByKey.get(`${courseId}/${lessonId}`);
  if (!course || !lesson) notFound();
  const [done, subtopic] = await Promise.all([getDoneLessons(courseId), getLessonSubtopic(courseId, lessonId)]);
  const { prev, next } = courseNeighbours(course, lessonId);
  const problems = lesson.problems.flatMap((s) => {
    const p = problemBySlug.get(s);
    return p ? [p] : [];
  });

  const parts = lesson.parts.map((part) => ({
    id: part.id,
    label: part.label,
    content: (
      <>
        <article className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
          <ArticleMarkdown markdown={part.body} />
        </article>
        {part.diagrams.map((d) => (
          <figure key={d.title} className="space-y-1.5">
            <MermaidDiagram code={d.code} label={d.title} />
            <figcaption className="text-center text-xs text-muted-foreground">{d.title}</figcaption>
          </figure>
        ))}
        {part.code.length > 0 && <CodeTabs code={part.code} />}
      </>
    ),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href={`/courses/${courseId}`}>{course.title}</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{lesson.title}</h1>
          {done.has(lessonId) && <ToneBadge tone="success">Done</ToneBadge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {lesson.chapterTitle} · {lesson.minutes} min · {lesson.summary}
        </p>
      </div>

      <PartTabs parts={parts} />

      {lesson.complexity.length > 0 && (
        <section aria-label="Complexity" className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <caption className="px-4 pt-3 text-left text-sm font-semibold">Complexity</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Operation</th>
                <th scope="col" className="px-4 py-2 font-medium">Time</th>
                <th scope="col" className="px-4 py-2 font-medium">Space</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lesson.complexity.map((c) => (
                <tr key={c.op}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">{c.op}</th>
                  <td className="tabular px-4 py-2 font-mono text-xs">{c.time}</td>
                  <td className="tabular px-4 py-2 font-mono text-xs">{c.space || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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

      {(problems.length > 0 || lesson.practiceRef) && (
        <section aria-label="Practice" className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Practice</h2>
          {problems.length > 0 && (
            <ul className="divide-y text-sm">
              {problems.map((p) => (
                <li key={p.slug}>
                  <Link href={`/dsa/${p.slug}`} className="flex min-h-10 items-center justify-between gap-3 rounded-md py-1.5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <span>{p.title}</span>
                    <ToneBadge tone={p.difficulty === "Easy" ? "success" : p.difficulty === "Medium" ? "warning" : "danger"}>{p.difficulty}</ToneBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {lesson.practiceRef && (
            <Link href={`/learn/practice?ref=${encodeURIComponent(lesson.practiceRef)}`} className="inline-flex min-h-9 items-center text-sm text-primary underline-offset-2 hover:underline">
              Take a practice quiz on this topic
            </Link>
          )}
        </section>
      )}

      <CourseCheck key={lessonId} courseId={courseId} lessonId={lessonId} check={lesson.check} done={done.has(lessonId)} subtopic={subtopic} />

      {lesson.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Read more</span>
          {lesson.sources.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {r.title} <ExternalLink className="size-3" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </div>
      )}

      <nav aria-label="Lessons" className="flex justify-between gap-3 border-t pt-4 text-sm">
        {prev ? (
          <Link href={`/courses/${courseId}/${prev.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/courses/${courseId}/${next.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {next.title} <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
