/**
 * Typed access to the long-form courses (data/courses). One file per chapter so authoring happens in
 * batches; register a new chapter file here. Not part of the syllabus, so the plan never schedules it.
 */
import coursesJson from "@/data/courses/courses.json";
import dsa01 from "@/data/courses/dsa/01-foundations.json";
import dsa02 from "@/data/courses/dsa/02-arrays-hashing.json";
import dsa03 from "@/data/courses/dsa/03-pointers-search.json";
import dsa04 from "@/data/courses/dsa/04-linear-structures.json";
import dsa05 from "@/data/courses/dsa/05-recursion-trees.json";
import dsa06 from "@/data/courses/dsa/06-heaps-graphs.json";
import dsa07 from "@/data/courses/dsa/07-backtracking-dp.json";
import dsa08 from "@/data/courses/dsa/08-advanced-graphs.json";
import dsa09 from "@/data/courses/dsa/09-strings-bits.json";
import dsa10 from "@/data/courses/dsa/10-greedy-intervals.json";
import dsa11 from "@/data/courses/dsa/11-advanced-dp.json";
import sd01 from "@/data/courses/system-design/01-scaling-building-blocks.json";
import sd02 from "@/data/courses/system-design/02-data-and-messaging.json";
import sd03 from "@/data/courses/system-design/03-reliability-and-scale.json";
import sd04 from "@/data/courses/system-design/04-distributed-systems.json";
import sd05 from "@/data/courses/system-design/05-case-studies.json";
import fe01 from "@/data/courses/frontend/01-browser-and-rendering.json";
import fe02 from "@/data/courses/frontend/02-architecture-at-scale.json";
import fe03 from "@/data/courses/frontend/03-react-in-depth.json";
import fe04 from "@/data/courses/frontend/04-performance-and-web-vitals.json";
import fe05 from "@/data/courses/frontend/05-testing-a11y-security.json";
import ai01 from "@/data/courses/genai/01-how-llms-work.json";
import ai02 from "@/data/courses/genai/02-building-with-llms.json";
import ai03 from "@/data/courses/genai/03-rag-in-depth.json";
import ai04 from "@/data/courses/genai/04-agents-and-tools.json";
import ai05 from "@/data/courses/genai/05-evals-and-production.json";
import type { Course, CourseChapterFile, CourseLesson, CourseMeta } from "@/modules/course/domain/course";

const CHAPTER_FILES: Record<string, CourseChapterFile[]> = {
  dsa: [dsa01, dsa02, dsa03, dsa04, dsa05, dsa06, dsa07, dsa08, dsa09, dsa10, dsa11] as unknown as CourseChapterFile[],
  "system-design": [sd01, sd02, sd03, sd04, sd05] as unknown as CourseChapterFile[],
  frontend: [fe01, fe02, fe03, fe04, fe05] as unknown as CourseChapterFile[],
  genai: [ai01, ai02, ai03, ai04, ai05] as unknown as CourseChapterFile[],
};

export const courses: Course[] = (coursesJson.courses as CourseMeta[]).map((meta) => ({
  ...meta,
  chapters: (CHAPTER_FILES[meta.id] ?? []).map((f) => ({ ...f.chapter, lessons: f.lessons })),
}));
export const courseById = new Map(courses.map((c) => [c.id, c]));

/** `${courseId}/${lessonId}` → lesson with its chapter, for lookups from progress rows and roadmaps. */
export const courseLessonByKey = new Map<string, CourseLesson & { courseId: string; chapterId: string; chapterTitle: string }>(
  courses.flatMap((c) => c.chapters.flatMap((ch) => ch.lessons.map((l) => [`${c.id}/${l.id}`, { ...l, courseId: c.id, chapterId: ch.id, chapterTitle: ch.title }] as const))),
);
