import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/core/courses";
import { courseProgress, flatLessons, nextCourseLesson } from "@/modules/course/domain/course";
import { getDoneByCourse } from "@/modules/course/services/progress";

export const metadata: Metadata = { title: "Courses" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "doing", label: "In progress" },
  { id: "new", label: "Not started" },
  { id: "done", label: "Completed" },
] as const;

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.show) ? sp.show[0] : sp.show;
  const show = FILTERS.find((f) => f.id === raw)?.id ?? "all";
  const doneBy = await getDoneByCourse();
  const all = courses.map((c) => {
    const lessons = flatLessons(c);
    const doneMap = doneBy.get(c.id) ?? new Map();
    const done = new Set(doneMap.keys());
    const minutes = lessons.reduce((s, l) => s + l.minutes, 0);
    const left = lessons.filter((l) => !done.has(l.id)).reduce((s, l) => s + l.minutes, 0);
    return { course: c, progress: courseProgress(c, done), next: nextCourseLesson(c, done), minutes, left };
  });
  const matches = (x: (typeof all)[number]) => show === "all" || (show === "new" && x.progress.done === 0) || (show === "done" && x.progress.total > 0 && x.progress.done >= x.progress.total) || (show === "doing" && x.progress.done > 0 && x.progress.done < x.progress.total);
  const cards = all.filter(matches).toSorted((a, b) => Number(b.progress.done > 0 && b.progress.done < b.progress.total) - Number(a.progress.done > 0 && a.progress.done < a.progress.total));
  const resume = all.find((x) => x.progress.done > 0 && x.next);
  return (
    <>
      <PageHeader icon={GraduationCap} title="Courses" description="Long-form lessons you read here: deep explanations, diagrams, code in several languages and practice. Your progress is separate from your daily plan and never affects your streak." />
      {resume?.next && (
        <Link href={`/courses/${resume.course.id}/${resume.next.id}`} className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20 hover:bg-primary/10">
          <span className="min-w-0 text-sm">
            <span className="block text-xs text-muted-foreground">Continue where you left off · {resume.course.title}</span>
            <span className="block truncate font-medium">{resume.next.title}</span>
          </span>
          <span className="text-sm font-medium text-primary">Continue</span>
        </Link>
      )}
      <nav aria-label="Filter courses" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.id} href={f.id === "all" ? "/courses" : `/courses?show=${f.id}`} aria-current={show === f.id ? "page" : undefined} className={`rounded-full border px-3 py-1 text-xs ${show === f.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label}
          </Link>
        ))}
      </nav>
      {cards.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No courses here yet. <Link href="/courses" className="text-primary underline">Show all courses</Link></p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map(({ course, progress, next, minutes, left }) => (
          <li key={course.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
            <div>
              <h2 className="text-base font-semibold">{course.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{course.blurb}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {course.chapters.length} chapters · {progress.total} lessons · about {Math.round(minutes / 60)} h{progress.done > 0 && left > 0 ? ` (~${Math.max(1, Math.round(left / 60))} h left)` : ""} · {course.audience}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={progress.pct} aria-label={`${course.title} progress`} className="h-2 max-w-xs" />
              <span className="tabular font-mono text-xs text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/courses/${course.id}`}>Open course</Link>
              </Button>
              {!next && progress.total > 0 && <span className="inline-flex items-center rounded-md bg-success/10 px-2.5 text-xs font-medium text-success">Completed</span>}
              {next && (
                <Button asChild>
                  <Link href={`/courses/${course.id}/${next.id}`}>{progress.done ? "Continue" : "Start"}: {next.title}</Link>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
