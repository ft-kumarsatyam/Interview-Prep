import { subtopicById } from "@/core/content";
import { courseLessonByKey } from "@/core/courses";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { CourseLessonProgress } from "@/core/models/course";
import { SubtopicProgress } from "@/core/models/progress";
import { recomputeDay } from "@/modules/planner/services/day";

export interface LessonSubtopic {
  id: string;
  title: string;
  topicTitle: string;
  /** Already ticked in your plan. */
  done: boolean;
}

/** The syllabus subtopic a course lesson teaches (its `practiceRef`), and whether it is already ticked. Null when it names none. */
export async function getLessonSubtopic(courseId: string, lessonId: string): Promise<LessonSubtopic | null> {
  const ref = courseLessonByKey.get(`${courseId}/${lessonId}`)?.practiceRef;
  const info = ref ? subtopicById.get(ref) : undefined;
  if (!ref || !info) return null;
  await connectDb();
  return { id: ref, title: info.title, topicTitle: info.topicTitle, done: !!(await SubtopicProgress.exists({ subtopicId: ref })) };
}

/**
 * You confirmed it: tick the lesson's subtopic in your plan. Only a finished lesson can do this, and it only
 * ever ticks (never unticks). It goes through the same path as a manual tick, so the day's theory count, the
 * daily plan and the streak behave exactly as if you had ticked it on the Learn page.
 */
export async function confirmLessonSubtopic(courseId: string, lessonId: string, today: DateStr): Promise<{ subtopicId: string; already: boolean; justCompleted: boolean }> {
  const target = await getLessonSubtopic(courseId, lessonId);
  if (!target) throw new Error("This lesson doesn't map to a syllabus topic");
  await connectDb();
  if (!(await CourseLessonProgress.exists({ courseId, lessonId }))) throw new Error("Finish the lesson first");
  if (target.done) return { subtopicId: target.id, already: true, justCompleted: false };

  const info = subtopicById.get(target.id)!;
  await SubtopicProgress.updateOne({ subtopicId: target.id }, { $setOnInsert: { topicId: info.topicId, doneOn: today } }, { upsert: true });
  const { justCompleted } = await recomputeDay(today);
  return { subtopicId: target.id, already: false, justCompleted };
}
