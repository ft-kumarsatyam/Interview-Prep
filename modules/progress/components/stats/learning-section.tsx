import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/core/courses";
import { courseProgress } from "@/modules/course/domain/course";
import { getAllDoneKeys } from "@/modules/course/services/progress";
import { getStudied } from "@/modules/progress/services/studied";
import { listRoadmaps } from "@/modules/roadmap/services/roadmap";

/** Async section: courses, roadmaps and studied topics side by side, so the places you learn from read as one picture. */
export async function LearningSection() {
  const [studied, doneKeys, roadmaps] = await Promise.all([getStudied(), getAllDoneKeys(), listRoadmaps()]).catch(() => [null, null, null] as const);
  if (!studied || !doneKeys || !roadmaps) return null;

  const rows = courses.map((c) => ({ course: c, p: courseProgress(c, new Set([...doneKeys].filter((k) => k.startsWith(`${c.id}/`)).map((k) => k.slice(c.id.length + 1)))) }));
  const joined = roadmaps.filter((r) => r.joinedOn);

  return (
    <section aria-label="Learning" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4 text-muted-foreground" aria-hidden /> Learning
          </CardTitle>
          <CardDescription>
            {studied.subtopics.size} subtopic{studied.subtopics.size === 1 ? "" : "s"} studied across {studied.topics.size} topic{studied.topics.size === 1 ? "" : "s"}
            {studied.viaLessonsOnly.size > 0 ? `, ${studied.viaLessonsOnly.size} through course lessons only (not ticked in your plan)` : ""}. Courses and roadmaps never change your streak.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Courses</h3>
            {rows.map(({ course, p }) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="block space-y-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{course.title}</span>
                  <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                    {p.done}/{p.total}
                  </span>
                </span>
                <Progress value={p.pct} aria-label={`${course.title} progress`} className="h-1.5" />
              </Link>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Roadmaps</h3>
            {joined.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have not joined a roadmap.{" "}
                <Link href="/roadmaps" className="text-primary underline-offset-2 hover:underline">
                  Pick one
                </Link>
                .
              </p>
            ) : (
              joined.map(({ roadmap, progress }) => (
                <Link key={roadmap.id} href={`/roadmaps/${roadmap.id}`} className="block space-y-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{roadmap.title}</span>
                    <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                      {progress.must.done}/{progress.must.total} must do
                    </span>
                  </span>
                  <Progress value={progress.pct} aria-label={`${roadmap.title} must-do progress`} className="h-1.5" />
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
