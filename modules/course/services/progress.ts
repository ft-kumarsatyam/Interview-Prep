import { courseLessonByKey } from "@/core/courses";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { CourseLessonProgress } from "@/core/models/course";

export interface LessonDone {
  doneOn: string;
  bestScore: number | null;
}

/** Finished lessons of one course, keyed by lesson id. */
export async function getDoneLessons(courseId: string): Promise<Map<string, LessonDone>> {
  await connectDb();
  const rows = await CourseLessonProgress.find({ courseId }).lean();
  return new Map(rows.map((r) => [r.lessonId, { doneOn: r.doneOn, bestScore: r.bestScore ?? null }]));
}

/** Every finished lesson as `courseId/lessonId` keys (used by roadmaps). */
export async function getAllDoneKeys(): Promise<Set<string>> {
  await connectDb();
  const rows = await CourseLessonProgress.find({}, { courseId: 1, lessonId: 1 }).lean();
  return new Set(rows.map((r) => `${r.courseId}/${r.lessonId}`));
}

/** Marks a lesson done (keeping the best check score), or undoes it. */
export async function setCourseLessonDone(courseId: string, lessonId: string, done: boolean, today: DateStr, score: number | null = null): Promise<void> {
  if (!courseLessonByKey.has(`${courseId}/${lessonId}`)) throw new Error("Unknown lesson");
  await connectDb();
  if (!done) {
    await CourseLessonProgress.deleteOne({ courseId, lessonId });
    return;
  }
  const prev = await CourseLessonProgress.findOne({ courseId, lessonId }).lean();
  const best = score === null ? (prev?.bestScore ?? null) : Math.max(score, prev?.bestScore ?? 0);
  await CourseLessonProgress.updateOne({ courseId, lessonId }, { $set: { bestScore: best }, $setOnInsert: { doneOn: today } }, { upsert: true });
}
