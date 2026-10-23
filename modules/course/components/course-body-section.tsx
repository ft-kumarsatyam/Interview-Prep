import Link from "next/link";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadCourse } from "@/core/courses";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { chapterProgress, courseProgress, nextCourseLesson } from "@/modules/course/domain/course";
import { getDoneLessons } from "@/modules/course/services/progress";

/** Intro, progress and chapter list. A failure hides the body instead of breaking the page. */
export async function CourseBodySection({ courseId }: { courseId: string }) {
  const course = await loadCourse(courseId).catch(() => undefined);
  if (!course) return null;
  const done = new Set((await getDoneLessons(course.id).catch(() => new Map())).keys());
  const progress = courseProgress(course, done);
  const next = nextCourseLesson(course, done);

  return (
    <>
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

      <article className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
        <ArticleMarkdown markdown={course.intro} />
      </article>

      {course.chapters.map((ch, ci) => {
        const p = chapterProgress(ch, done);
        return (
          <details key={ch.id} open={!(p.total > 0 && p.done === p.total)} aria-label={ch.title} className="space-y-3">
            <summary className="cursor-pointer list-none space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <SectionHeading title={`${ci + 1}. ${ch.title}`} hint={ch.summary} />
              <span className="tabular block font-mono text-xs text-muted-foreground">
                {p.done}/{p.total} done{p.total > 0 && p.done === p.total ? " · completed (tap to open)" : ""}
              </span>
            </summary>
            <ul className="grid gap-3 md:grid-cols-2">
              {ch.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/courses/${course.id}/${l.id}`} className={`flex h-full gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${next?.id === l.id ? "ring-2 ring-primary" : "ring-1 ring-foreground/5"}`}>
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${done.has(l.id) ? "border-success bg-success text-white" : ""}`}>{done.has(l.id) && <Check className="size-3" aria-label="Done" />}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{l.title}{next?.id === l.id && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Up next</span>}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{l.summary}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {l.minutes} min{l.parts.length > 1 ? ` · ${l.parts.map((x) => x.label).join(" + ")}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
      {course.chapters.length === 0 && <p className="text-sm text-muted-foreground">Lessons for this course are being written. Check back soon.</p>}
    </>
  );
}
