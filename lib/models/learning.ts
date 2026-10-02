import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Saved JS Playground code. */
const snippetSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    code: { type: String, required: true, maxlength: 20_000 },
    tag: { type: String, maxlength: 60, default: "" },
  },
  { timestamps: true },
);
snippetSchema.index({ updatedAt: -1 });

const practiceQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true, maxlength: 500 },
    code: { type: String, maxlength: 1500 },
    options: { type: [{ type: String, maxlength: 300 }], validate: (v: string[]) => v.length === 4 },
    answerIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, maxlength: 600 },
    ref: { type: String, required: true },
  },
  { _id: false },
);

/** One practice run: a subtopic drill (5 questions) or a topic mastery quiz (10). */
const practiceAttemptSchema = new Schema(
  {
    scope: { type: String, enum: ["subtopic", "topic"], required: true },
    ref: { type: String, required: true },
    questions: { type: [practiceQuestionSchema], default: [] },
    answers: { type: [Number], default: [] },
    pct: { type: Number, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
practiceAttemptSchema.index({ ref: 1, createdAt: -1 });

/** Rolling mastery per subtopic or topic. `masteredOn` is set only by a passed topic quiz. */
const masterySchema = new Schema(
  {
    ref: { type: String, required: true, unique: true },
    scope: { type: String, enum: ["subtopic", "topic"], required: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    attempts: { type: Number, default: 0 },
    bestPct: { type: Number, default: 0 },
    masteredOn: { type: String, default: null },
  },
  { timestamps: true },
);

export type SnippetDoc = InferSchemaType<typeof snippetSchema>;
export type PracticeAttemptDoc = InferSchemaType<typeof practiceAttemptSchema>;
export type MasteryDoc = InferSchemaType<typeof masterySchema>;

export const Snippet: Model<SnippetDoc> = models.Snippet ?? model("Snippet", snippetSchema);
export const PracticeAttempt: Model<PracticeAttemptDoc> =
  models.PracticeAttempt ?? model("PracticeAttempt", practiceAttemptSchema);
export const Mastery: Model<MasteryDoc> = models.Mastery ?? model("Mastery", masterySchema);
