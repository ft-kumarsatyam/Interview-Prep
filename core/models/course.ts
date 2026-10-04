import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** A finished course lesson. Separate from SubtopicProgress so it never touches the plan or the streak. */
const courseLessonProgressSchema = new Schema(
  {
    courseId: { type: String, required: true },
    lessonId: { type: String, required: true },
    doneOn: { type: String, required: true },
    bestScore: { type: Number, min: 0, max: 100, default: null },
  },
  { timestamps: true },
);
ownerScope(courseLessonProgressSchema, [{ fields: { courseId: 1, lessonId: 1 } }]);

export type CourseLessonProgressRow = InferSchemaType<typeof courseLessonProgressSchema>;
export const CourseLessonProgress: Model<CourseLessonProgressRow> = models.CourseLessonProgress ?? model("CourseLessonProgress", courseLessonProgressSchema);
