import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { courseMeta } from "@/core/courses";
import { CourseBodySection } from "@/modules/course/components/course-body-section";

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]">): Promise<Metadata> {
  const { courseId } = await params;
  return { title: courseMeta().find((c) => c.id === decodeURIComponent(courseId))?.title ?? "Course" };
}

export default async function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params;
  const meta = courseMeta().find((c) => c.id === decodeURIComponent(courseId));
  if (!meta) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <BackLink href="/courses">Courses</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
      </div>
      <Suspense fallback={<PageSkeleton cards={5} label="Loading course…" />}>
        <CourseBodySection courseId={meta.id} />
      </Suspense>
    </div>
  );
}
