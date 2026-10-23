import { subtopicById, subtopics } from "@/core/content";

import { courseLessonIndex, getCourseLessonMeta } from "@/core/courses";
import { connectDb } from "@/core/db";
import { CourseLessonProgress } from "@/core/models/course";
import { SubtopicProgress } from "@/core/models/progress";
import { lessonBySubtopic, studiedRefs, type Studied } from "@/modules/progress/domain/studied";

const subtopicsByTopic = new Map<string, string[]>();
for (const s of subtopics) subtopicsByTopic.set(s.topicId, [...(subtopicsByTopic.get(s.topicId) ?? []), s.id]);

/** Subtopic id -> `${courseId}/${lessonId}` of the lesson that teaches it. Built once from the course content. */
export const lessonForSubtopic: ReadonlyMap<string, string> = lessonBySubtopic(
  courseLessonIndex().map((l) => ({ key: `${l.courseId}/${l.id}`, practiceRef: l.practiceRef })),
  (id) => subtopicById.has(id),
);

/** Everything you have studied: ticked subtopics plus finished course lessons that teach a subtopic. Read-only. */
export async function getStudied(): Promise<Studied> {
  await connectDb();
  const [ticked, lessons] = await Promise.all([SubtopicProgress.find({}, { subtopicId: 1 }).lean(), CourseLessonProgress.find({}, { courseId: 1, lessonId: 1 }).lean()]);
  return studiedRefs({
    doneSubtopics: ticked.map((r) => r.subtopicId),
    doneLessons: lessons.map((r) => `${r.courseId}/${r.lessonId}`),
    lessonRef: (key) => getCourseLessonMeta(key)?.practiceRef,
    topicOf: (id) => subtopicById.get(id)?.topicId,
    subtopicsOf: (topicId) => subtopicsByTopic.get(topicId) ?? [],
  });
}
