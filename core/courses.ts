/**
 * Typed access to the long-form courses (data/courses). Chapter files are loaded on demand.
 * The slim lesson index (id, title, minutes, problems) is enough for list pages and lookups.
 * Not part of the syllabus, so the plan never schedules it.
 */
import coursesJson from "@/data/courses/courses.json";
import lessonIndexJson from "@/data/courses/lesson-index.json";
import type { Course, CourseChapterFile, CourseLesson, CourseMeta } from "@/modules/course/domain/course";

export type CourseLessonMeta = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  problems: string[];
  practiceRef?: string;
  chapterId: string;
  chapterTitle: string;
  courseId: string;
};

type ChapterLoader = () => Promise<{ default: unknown }>;

const CHAPTER_LOADERS: Record<string, ChapterLoader[]> = {
  dsa: [
    () => import("@/data/courses/dsa/01-foundations.json"),
    () => import("@/data/courses/dsa/02-arrays-hashing.json"),
    () => import("@/data/courses/dsa/03-pointers-search.json"),
    () => import("@/data/courses/dsa/12-sorting.json"),
    () => import("@/data/courses/dsa/04-linear-structures.json"),
    () => import("@/data/courses/dsa/13-stack-queue-list-patterns.json"),
    () => import("@/data/courses/dsa/05-recursion-trees.json"),
    () => import("@/data/courses/dsa/14-trees-and-ranges.json"),
    () => import("@/data/courses/dsa/06-heaps-graphs.json"),
    () => import("@/data/courses/dsa/07-backtracking-dp.json"),
    () => import("@/data/courses/dsa/15-search-heap-grid-patterns.json"),
    () => import("@/data/courses/dsa/08-advanced-graphs.json"),
    () => import("@/data/courses/dsa/09-strings-bits.json"),
    () => import("@/data/courses/dsa/10-greedy-intervals.json"),
    () => import("@/data/courses/dsa/11-advanced-dp.json"),
    () => import("@/data/courses/dsa/16-dp-design-math.json"),
  ],
  "system-design": [
    () => import("@/data/courses/system-design/01-scaling-building-blocks.json"),
    () => import("@/data/courses/system-design/06-estimation-and-storage.json"),
    () => import("@/data/courses/system-design/02-data-and-messaging.json"),
    () => import("@/data/courses/system-design/03-reliability-and-scale.json"),
    () => import("@/data/courses/system-design/04-distributed-systems.json"),
    () => import("@/data/courses/system-design/05-case-studies.json"),
  ],
  frontend: [
    () => import("@/data/courses/frontend/01-browser-and-rendering.json"),
    () => import("@/data/courses/frontend/02-architecture-at-scale.json"),
    () => import("@/data/courses/frontend/03-react-in-depth.json"),
    () => import("@/data/courses/frontend/04-performance-and-web-vitals.json"),
    () => import("@/data/courses/frontend/05-testing-a11y-security.json"),
  ],
  backend: [
    () => import("@/data/courses/backend/01-http-and-apis.json"),
    () => import("@/data/courses/backend/02-node-runtime.json"),
    () => import("@/data/courses/backend/03-data.json"),
    () => import("@/data/courses/backend/04-production.json"),
  ],
  "cs-core": [
    () => import("@/data/courses/cs-core/01-operating-systems.json"),
    () => import("@/data/courses/cs-core/02-computer-networks.json"),
    () => import("@/data/courses/cs-core/03-database-internals.json"),
    () => import("@/data/courses/cs-core/04-object-oriented-design.json"),
  ],
  javascript: [
    () => import("@/data/courses/javascript/01-language-core.json"),
    () => import("@/data/courses/javascript/02-async-javascript.json"),
    () => import("@/data/courses/javascript/03-typescript.json"),
  ],
  devops: [
    () => import("@/data/courses/devops/01-linux-and-git.json"),
    () => import("@/data/courses/devops/02-containers.json"),
    () => import("@/data/courses/devops/03-delivery-and-cloud.json"),
  ],
  python: [
    () => import("@/data/courses/python/01-python-core.json"),
    () => import("@/data/courses/python/02-python-in-practice.json"),
    () => import("@/data/courses/python/03-python-for-ai-engineers.json"),
  ],
  "ml-engineering": [
    () => import("@/data/courses/ml-engineering/01-ml-dl-foundations.json"),
    () => import("@/data/courses/ml-engineering/02-mlops-and-deployment.json"),
    () => import("@/data/courses/ml-engineering/03-data-engineering-for-ai.json"),
  ],
  "genai-playbook": [
    () => import("@/data/courses/genai-playbook/01-positioning-and-python.json"),
    () => import("@/data/courses/genai-playbook/02-ml-and-llm-foundations.json"),
    () => import("@/data/courses/genai-playbook/03-retrieval-and-rag.json"),
    () => import("@/data/courses/genai-playbook/04-agents.json"),
    () => import("@/data/courses/genai-playbook/05-production-and-design.json"),
    () => import("@/data/courses/genai-playbook/06-interview-loop.json"),
    () => import("@/data/courses/genai-playbook/07-playbook-toolkit.json"),
  ],
  genai: [
    () => import("@/data/courses/genai/01-how-llms-work.json"),
    () => import("@/data/courses/genai/02-building-with-llms.json"),
    () => import("@/data/courses/genai/03-rag-in-depth.json"),
    () => import("@/data/courses/genai/04-agents-and-tools.json"),
    () => import("@/data/courses/genai/05-evals-and-production.json"),
    () => import("@/data/courses/genai/06-ai-system-design.json"),
    () => import("@/data/courses/genai/07-fine-tuning-and-open-models.json"),
    () => import("@/data/courses/genai/08-ai-engineer-interview-deep-dive.json"),
    () => import("@/data/courses/genai/09-genai-sprint-guide.json"),
  ],
};

export const courseMeta = (): CourseMeta[] => coursesJson.courses as CourseMeta[];

const lessonIndex: CourseLessonMeta[] = Object.entries(lessonIndexJson as Record<string, Omit<CourseLessonMeta, "courseId">[]>).flatMap(
  ([courseId, lessons]) => lessons.map((l) => ({ ...l, courseId })),
);

const lessonByKey = new Map(lessonIndex.map((l) => [`${l.courseId}/${l.id}`, l]));

const chapterIdsInOrder = new Map<string, string[]>();
for (const lesson of lessonIndex) {
  const ids = chapterIdsInOrder.get(lesson.courseId) ?? [];
  if (ids.at(-1) !== lesson.chapterId) ids.push(lesson.chapterId);
  chapterIdsInOrder.set(lesson.courseId, ids);
}

export const courseLessonIndex = (): CourseLessonMeta[] => lessonIndex;
export const lessonsOf = (courseId: string): CourseLessonMeta[] => lessonIndex.filter((l) => l.courseId === courseId);
export const getCourseLessonMeta = (key: string): CourseLessonMeta | undefined => lessonByKey.get(key);
export const hasCourseLesson = (key: string): boolean => lessonByKey.has(key);

export const lessonByProblem = new Map<string, { courseId: string; lessonId: string; title: string }>();
for (const l of lessonIndex) {
  for (const slug of l.problems) {
    if (!lessonByProblem.has(slug)) lessonByProblem.set(slug, { courseId: l.courseId, lessonId: l.id, title: l.title });
  }
}

const courseCache = new Map<string, Course>();

function assemble(meta: CourseMeta, files: CourseChapterFile[], mastery?: Map<string, CourseLesson["mastery"]>): Course {
  return {
    ...meta,
    chapters: files.map((f) => ({
      ...f.chapter,
      lessons: f.lessons.map((lesson) => {
        const extra = mastery?.get(lesson.id);
        return extra ? { ...lesson, mastery: extra } : lesson;
      }),
    })),
  };
}

export async function loadCourse(id: string): Promise<Course | undefined> {
  const cached = courseCache.get(id);
  if (cached) return cached;
  const meta = courseMeta().find((c) => c.id === id);
  const loaders = CHAPTER_LOADERS[id];
  if (!meta || !loaders) return undefined;
  const files = (await Promise.all(loaders.map((load) => load()))).map((m) => m.default as unknown as CourseChapterFile);
  let mastery: Map<string, CourseLesson["mastery"]> | undefined;
  if (id === "dsa") {
    const { dsaMasteryRoadmaps } = await import("@/data/courses/dsa/mastery-roadmaps");
    mastery = dsaMasteryRoadmaps;
  }
  const course = assemble(meta, files, mastery);
  courseCache.set(id, course);
  return course;
}

export async function loadAllCourses(): Promise<Course[]> {
  const all = await Promise.all(courseMeta().map((m) => loadCourse(m.id)));
  return all.filter((c): c is Course => !!c);
}

export async function loadLesson(courseId: string, lessonId: string): Promise<(CourseLesson & { courseId: string; chapterId: string; chapterTitle: string }) | undefined> {
  const meta = getCourseLessonMeta(`${courseId}/${lessonId}`);
  const loaders = CHAPTER_LOADERS[courseId];
  const chapterIndex = (chapterIdsInOrder.get(courseId) ?? []).indexOf(meta?.chapterId ?? "");
  const loader = loaders?.[chapterIndex];
  if (!meta || !loader) return undefined;
  const file = (await loader()).default as unknown as CourseChapterFile;
  const lesson = file.lessons.find((l) => l.id === lessonId);
  if (!lesson) return undefined;
  let mastery: CourseLesson["mastery"];
  if (courseId === "dsa") {
    const { dsaMasteryRoadmaps } = await import("@/data/courses/dsa/mastery-roadmaps");
    mastery = dsaMasteryRoadmaps.get(lessonId);
  }
  return { ...lesson, ...(mastery ? { mastery } : {}), courseId, chapterId: meta.chapterId, chapterTitle: meta.chapterTitle };
}

export const getCourseLesson = loadLesson;
