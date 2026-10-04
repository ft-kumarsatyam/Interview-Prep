import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Saved Playground code. */
const snippetSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    code: { type: String, required: true, maxlength: 20_000 },
    tag: { type: String, maxlength: 120, default: "" },
    /** Absent on snippets saved before Python and TypeScript runs existed: read it as JavaScript. */
    language: { type: String, enum: ["javascript", "typescript", "python"] },
  },
  { timestamps: true },
);
ownerScope(snippetSchema);
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

/** One practice run: a subtopic drill (5 questions), a topic mastery quiz (10), a case quiz, or a mistakes review. */
const practiceAttemptSchema = new Schema(
  {
    scope: { type: String, enum: ["subtopic", "topic", "case", "mistakes", "custom"], required: true },
    ref: { type: String, required: true },
    /** Custom quizzes only: the subtopics the questions were drawn from. */
    refs: { type: [String], default: [] },
    questions: { type: [practiceQuestionSchema], default: [] },
    /** The difficulty the run was started at; null for a mixed run. Feeds the easy/medium/hard ladder. */
    level: { type: String, enum: ["easy", "medium", "hard"], default: null },
    answers: { type: [Number], default: [] },
    pct: { type: Number, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
ownerScope(practiceAttemptSchema);
practiceAttemptSchema.index({ ref: 1, createdAt: -1 });
practiceAttemptSchema.index({ submittedAt: -1 });

/** Rolling mastery per subtopic or topic. `masteredOn` is set only by a passed topic quiz. */
const masterySchema = new Schema(
  {
    ref: { type: String, required: true },
    scope: { type: String, enum: ["subtopic", "topic", "case"], required: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    attempts: { type: Number, default: 0 },
    bestPct: { type: Number, default: 0 },
    masteredOn: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(masterySchema, [{ fields: { ref: 1 } }]);

/** Your System Design practice answer per case (`slug` from data/system-design.json). */
const designSchema = new Schema(
  {
    slug: { type: String, required: true },
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
ownerScope(designSchema, [{ fields: { slug: 1 } }]);

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
ownerScope(practiceAnswerSchema, [{ fields: { kind: 1, slug: 1 } }]);

/** A question the model wrote for a subtopic at a level, kept so it joins practice runs. `qid` is stable; prompts are never shown as the answer key's source. */
const generatedQuestionSchema = new Schema(
  {
    qid: { type: String, required: true },
    ref: { type: String, required: true },
    level: { type: String, enum: ["easy", "medium", "hard"], required: true },
    prompt: { type: String, required: true, maxlength: 500 },
    options: { type: [{ type: String, maxlength: 300 }], validate: (v: string[]) => v.length === 4 },
    answerIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true, maxlength: 600 },
    provider: { type: String, default: null },
    promptVersion: { type: String, default: "" },
  },
  { timestamps: true },
);
ownerScope(generatedQuestionSchema, [{ fields: { qid: 1 } }]);
generatedQuestionSchema.index({ ref: 1, level: 1 });

/** One aptitude drill or mock, rolled up per topic: how many answered, how many right, and the time taken. */
const aptitudeSessionSchema = new Schema(
  {
    topicId: { type: String, required: true },
    mode: { type: String, enum: ["topic", "mock"], required: true },
    /** Local calendar date in APP_TIMEZONE (YYYY-MM-DD). */
    date: { type: String, required: true },
    total: { type: Number, required: true, min: 1, max: 100 },
    correct: { type: Number, required: true, min: 0, max: 100 },
    totalMs: { type: Number, required: true, min: 0 },
    /** Keys of the hand-written questions answered right / wrong (bankKey), for rotating drills. Absent on older rows. */
    rightKeys: { type: [String], default: undefined },
    wrongKeys: { type: [String], default: undefined },
  },
  { timestamps: true },
);
ownerScope(aptitudeSessionSchema);
aptitudeSessionSchema.index({ topicId: 1, createdAt: -1 });
aptitudeSessionSchema.index({ createdAt: -1 });

export type DesignDoc = InferSchemaType<typeof designSchema>;
export type PracticeAnswerDoc = InferSchemaType<typeof practiceAnswerSchema>;
export type SnippetDoc = InferSchemaType<typeof snippetSchema>;
export type AptitudeSessionDoc = InferSchemaType<typeof aptitudeSessionSchema>;
export type PracticeAttemptDoc = InferSchemaType<typeof practiceAttemptSchema>;
export type MasteryDoc = InferSchemaType<typeof masterySchema>;

export const Snippet: Model<SnippetDoc> = models.Snippet ?? model("Snippet", snippetSchema);
export const PracticeAttempt: Model<PracticeAttemptDoc> =
  models.PracticeAttempt ?? model("PracticeAttempt", practiceAttemptSchema);
export const Mastery: Model<MasteryDoc> = models.Mastery ?? model("Mastery", masterySchema);
export const Design: Model<DesignDoc> = models.Design ?? model("Design", designSchema);
export const PracticeAnswer: Model<PracticeAnswerDoc> = models.PracticeAnswer ?? model("PracticeAnswer", practiceAnswerSchema);
export type GeneratedQuestionDoc = InferSchemaType<typeof generatedQuestionSchema>;
export const GeneratedQuestionRow: Model<GeneratedQuestionDoc> = models.GeneratedQuestionRow ?? model("GeneratedQuestionRow", generatedQuestionSchema);
export const AptitudeSession: Model<AptitudeSessionDoc> = models.AptitudeSession ?? model("AptitudeSession", aptitudeSessionSchema);
