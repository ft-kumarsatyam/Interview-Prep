import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** A finished web-dev lesson. Separate from SubtopicProgress so it never touches the plan. */
const webLessonProgressSchema = new Schema(
  { lessonId: { type: String, required: true }, doneOn: { type: String, required: true }, bestScore: { type: Number, min: 0, max: 100, default: null } },
  { timestamps: true },
);
ownerScope(webLessonProgressSchema, [{ fields: { lessonId: 1 } }]);

/** Where you are in a guided project. */
const webProjectProgressSchema = new Schema(
  {
    slug: { type: String, required: true },
    startedOn: { type: String, required: true },
    milestones: { type: [String], default: [] },
    repoUrl: { type: String, default: "", maxlength: 300 },
    notes: { type: String, default: "", maxlength: 3000 },
    doneOn: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(webProjectProgressSchema, [{ fields: { slug: 1 } }]);

/** Where you are with one web-dev interview question. A question with no row is "new". */
const webInterviewProgressSchema = new Schema(
  {
    qid: { type: String, required: true },
    status: { type: String, enum: ["review", "known"], required: true },
    updatedOn: { type: String, required: true },
    attempts: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true },
);
ownerScope(webInterviewProgressSchema, [{ fields: { qid: 1 } }]);

export type WebLessonProgressRow = InferSchemaType<typeof webLessonProgressSchema>;
export type WebProjectProgressRow = InferSchemaType<typeof webProjectProgressSchema>;
export type WebInterviewProgressRow = InferSchemaType<typeof webInterviewProgressSchema>;
export const WebLessonProgress: Model<WebLessonProgressRow> = models.WebLessonProgress ?? model("WebLessonProgress", webLessonProgressSchema);
export const WebProjectProgress: Model<WebProjectProgressRow> = models.WebProjectProgress ?? model("WebProjectProgress", webProjectProgressSchema);
/** An interview question the model wrote for a track on request. Rated and shown like the hand-written ones. */
const generatedInterviewSchema = new Schema(
  {
    qid: { type: String, required: true },
    track: { type: String, required: true },
    level: { type: String, enum: ["junior", "mid", "senior"], required: true },
    q: { type: String, required: true, maxlength: 240 },
    answer: { type: String, required: true, maxlength: 6000 },
    followUps: { type: [{ type: String, maxlength: 200 }], default: [] },
    mistakes: { type: [{ type: String, maxlength: 240 }], default: [] },
    provider: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(generatedInterviewSchema, [{ fields: { qid: 1 } }]);
generatedInterviewSchema.index({ track: 1, level: 1 });

export type GeneratedInterviewRow = InferSchemaType<typeof generatedInterviewSchema>;
export const GeneratedInterviewDoc: Model<GeneratedInterviewRow> = models.GeneratedInterviewDoc ?? model("GeneratedInterviewDoc", generatedInterviewSchema);
export const WebInterviewProgress: Model<WebInterviewProgressRow> = models.WebInterviewProgress ?? model("WebInterviewProgress", webInterviewProgressSchema);
