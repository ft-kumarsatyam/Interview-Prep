import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Saved JS Playground code. */
const snippetSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    code: { type: String, required: true, maxlength: 20_000 },
    tag: { type: String, maxlength: 120, default: "" },
  },
  { timestamps: true },
);
snippetSchema.index({ updatedAt: -1 });

const practiceQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true, maxlength: 500 },
    code: { type: String, maxlength: 1500 },
    options: { type: [{ type: String, maxlength: 300 }], validate: (v: string[]) => v.length >= 2 && v.length <= 6 },
    answerIndex: { type: Number, required: true, min: 0, max: 5 },
    // Absent on questions stored before multi-select / true-false existed: read it as `type ?? "single"`.
    type: { type: String, enum: ["single", "multi", "truefalse"] },
    answerIndices: { type: [Number], default: undefined },
    explanation: { type: String, maxlength: 600 },
    ref: { type: String, required: true },
  },
  { _id: false },
);

/** One practice run: a subtopic drill (5 questions) or a topic mastery quiz (10). */
const practiceAttemptSchema = new Schema(
  {
    scope: { type: String, enum: ["subtopic", "topic", "case"], required: true },
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
    scope: { type: String, enum: ["subtopic", "topic", "case"], required: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    attempts: { type: Number, default: 0 },
    bestPct: { type: Number, default: 0 },
    masteredOn: { type: String, default: null },
  },
  { timestamps: true },
);

/** Your System Design practice answer per case (`slug` from data/system-design.json). */
const designSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    sections: {
      requirements: { type: String, maxlength: 20_000, default: "" },
      estimates: { type: String, maxlength: 20_000, default: "" },
      api: { type: String, maxlength: 20_000, default: "" },
      dataModel: { type: String, maxlength: 20_000, default: "" },
      architecture: { type: String, maxlength: 20_000, default: "" },
      deepDives: { type: String, maxlength: 20_000, default: "" },
    },
    /** Checked rubric item ids. */
    rubric: { type: [String], default: [] },
    minutesSpent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/** Your OS / DBMS "explain it" practice answer per case (`kind` + `slug` from data/os-dbms-cases.json). */
const practiceAnswerSchema = new Schema(
  {
    kind: { type: String, enum: ["os", "dbms"], required: true },
    slug: { type: String, required: true },
    /** Section id -> markdown text (see EXPLAIN_SECTIONS in lib/domain/practice-cases.ts). */
    sections: { type: Map, of: { type: String, maxlength: 20_000 }, default: {} },
    /** Checked rubric item ids. */
    rubric: { type: [String], default: [] },
    minutesSpent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
practiceAnswerSchema.index({ kind: 1, slug: 1 }, { unique: true });

export type DesignDoc = InferSchemaType<typeof designSchema>;
export type PracticeAnswerDoc = InferSchemaType<typeof practiceAnswerSchema>;
export type SnippetDoc = InferSchemaType<typeof snippetSchema>;
export type PracticeAttemptDoc = InferSchemaType<typeof practiceAttemptSchema>;
export type MasteryDoc = InferSchemaType<typeof masterySchema>;

export const Snippet: Model<SnippetDoc> = models.Snippet ?? model("Snippet", snippetSchema);
export const PracticeAttempt: Model<PracticeAttemptDoc> =
  models.PracticeAttempt ?? model("PracticeAttempt", practiceAttemptSchema);
export const Mastery: Model<MasteryDoc> = models.Mastery ?? model("Mastery", masterySchema);
export const Design: Model<DesignDoc> = models.Design ?? model("Design", designSchema);
export const PracticeAnswer: Model<PracticeAnswerDoc> = models.PracticeAnswer ?? model("PracticeAnswer", practiceAnswerSchema);
