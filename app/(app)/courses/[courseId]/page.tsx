import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { courseById } from "@/core/courses";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { chapterProgress, courseProgress, nextCourseLesson } from "@/modules/course/domain/course";
import { getDoneLessons } from "@/modules/course/services/progress";

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]">): Promise<Metadata> {
  const { courseId } = await params;
  return { title: courseById.get(decodeURIComponent(courseId))?.title ?? "Course" };
}

export default async function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params;
  const course = courseById.get(decodeURIComponent(courseId));
  if (!course) notFound();
  const done = new Set((await getDoneLessons(course.id)).keys());
  const progress = courseProgress(course, done);
  const next = nextCourseLesson(course, done);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <BackLink href="/courses">Courses</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.blurb}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Progress value={progress.pct} aria-label="Course progress" className="h-2 max-w-xs" />
          <span className="tabular font-mono text-xs text-muted-foreground">
            {progress.done}/{progress.total} lessons
          </span>
          {next && (
            <Button asChild>
              <Link href={`/courses/${course.id}/${next.id}`}>{progress.done ? "Continue" : "Start"}: {next.title}</Link>
            </Button>
          )}
        </div>
      </div>

      <article className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
        <ArticleMarkdown markdown={course.intro} />
      </article>

      {course.chapters.map((ch, ci) => {
        const p = chapterProgress(ch, done);
        return (
          <section key={ch.id} aria-label={ch.title} className="space-y-3">
            <SectionHeading title={`${ci + 1}. ${ch.title}`} hint={ch.summary} />
            <p className="tabular font-mono text-xs text-muted-foreground">
              {p.done}/{p.total} done
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              {ch.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/courses/${course.id}/${l.id}`} className="flex h-full gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${done.has(l.id) ? "border-success bg-success text-white" : ""}`}>{done.has(l.id) && <Check className="size-3" aria-label="Done" />}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{l.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{l.summary}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {l.minutes} min{l.parts.length > 1 ? ` · ${l.parts.map((x) => x.label).join(" + ")}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {course.chapters.length === 0 && <p className="text-sm text-muted-foreground">Lessons for this course are being written. Check back soon.</p>}
    </div>
  );
}
