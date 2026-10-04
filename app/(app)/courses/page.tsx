import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/core/courses";
import { courseProgress, flatLessons, nextCourseLesson } from "@/modules/course/domain/course";
import { getDoneLessons } from "@/modules/course/services/progress";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const cards = await Promise.all(
    courses.map(async (c) => {
      const done = new Set((await getDoneLessons(c.id)).keys());
      return { course: c, progress: courseProgress(c, done), next: nextCourseLesson(c, done), minutes: flatLessons(c).reduce((s, l) => s + l.minutes, 0) };
    }),
  );
  return (
    <>
      <PageHeader icon={GraduationCap} title="Courses" description="Long-form lessons you read here: deep explanations, diagrams, code in several languages and practice. Your progress is separate from your daily plan and never affects your streak." />
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map(({ course, progress, next, minutes }) => (
          <li key={course.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
            <div>
              <h2 className="text-base font-semibold">{course.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{course.blurb}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {course.chapters.length} chapters · {progress.total} lessons · about {Math.round(minutes / 60)} h · {course.audience}
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
