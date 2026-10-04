import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** A finished web-dev lesson. Separate from SubtopicProgress so it never touches the plan. */
const webLessonProgressSchema = new Schema(
  { lessonId: { type: String, required: true, unique: true }, doneOn: { type: String, required: true }, bestScore: { type: Number, min: 0, max: 100, default: null } },
  { timestamps: true },
);

/** Where you are in a guided project. */
const webProjectProgressSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    startedOn: { type: String, required: true },
    milestones: { type: [String], default: [] },
    repoUrl: { type: String, default: "", maxlength: 300 },
    notes: { type: String, default: "", maxlength: 3000 },
    doneOn: { type: String, default: null },
  },
  { timestamps: true },
);

/** Where you are with one web-dev interview question. A question with no row is "new". */
const webInterviewProgressSchema = new Schema(
  {
    qid: { type: String, required: true, unique: true },
    status: { type: String, enum: ["review", "known"], required: true },
    updatedOn: { type: String, required: true },
    attempts: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true },
);

export type WebLessonProgressRow = InferSchemaType<typeof webLessonProgressSchema>;
export type WebProjectProgressRow = InferSchemaType<typeof webProjectProgressSchema>;
export type WebInterviewProgressRow = InferSchemaType<typeof webInterviewProgressSchema>;
export const WebLessonProgress: Model<WebLessonProgressRow> = models.WebLessonProgress ?? model("WebLessonProgress", webLessonProgressSchema);
export const WebProjectProgress: Model<WebProjectProgressRow> = models.WebProjectProgress ?? model("WebProjectProgress", webProjectProgressSchema);
export const WebInterviewProgress: Model<WebInterviewProgressRow> = models.WebInterviewProgress ?? model("WebInterviewProgress", webInterviewProgressSchema);
