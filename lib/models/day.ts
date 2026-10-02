import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Frozen at creation so targets don't move during the day. */
const dailyPlanSchema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    weekNumber: { type: Number, required: true },
    kind: { type: String, enum: ["study", "sunday", "rest", "revision", "outside"], required: true },
    dsaTarget: { type: Number, required: true },
    dsaNew: { type: [String], default: [] },
    dsaReview: { type: [String], default: [] },
    jsProblem: { type: String, default: null },
    sqlProblem: { type: String, default: null },
    theoryTarget: { type: Number, required: true },
    theory: { type: [String], default: [] },
    readings: { type: [String], default: [] },
    /** Present when the day was planned by hours (see lib/domain/time-budget.ts). */
    hours: { type: Number, default: undefined },
    estMinutes: { type: Number, default: undefined },
    /** Sunday only: optional extra work from spare hours. Never counts toward completion. */
    bonusDsa: { type: [String], default: undefined },
    bonusTheory: { type: [String], default: undefined },
  },
  { timestamps: true },
);

/** Streak source of truth: one per day. */
const dayLogSchema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    dsaSolved: { type: Number, default: 0 },
    theoryDone: { type: Number, default: 0 },
    readings: { type: Number, default: 0 },
    quizPassed: { type: Boolean, default: false },
    complete: { type: Boolean, default: false },
    freezeUsed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const quizQuestionSchema = new Schema(
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
    // `kind`, not `type`: Mongoose reads a nested `type` key as a type declaration.
    source: {
      kind: { type: String, enum: ["problem", "subtopic", "pattern", "article", "case"] },
      ref: { type: String },
    },
    style: { type: String, enum: ["output", "concept", "pattern", "recall", "llm"], default: "llm" },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    date: { type: String, required: true },
    kind: { type: String, enum: ["daily", "weekly"], required: true },
    generatedBy: { type: String, enum: ["llm", "bank"], required: true },
    questions: { type: [quizQuestionSchema], default: [] },
    attempts: {
      // -1 marks an unanswered question.
      type: [{ answers: [Number], correct: Number, pct: Number, submittedAt: Date, _id: false }],
      default: [],
    },
    bestPct: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
  },
  { timestamps: true },
);
quizSchema.index({ date: 1, kind: 1 }, { unique: true });

export type DailyPlanDoc = InferSchemaType<typeof dailyPlanSchema>;
export type DayLogDoc = InferSchemaType<typeof dayLogSchema>;
export type QuizDoc = InferSchemaType<typeof quizSchema>;

export const DailyPlan: Model<DailyPlanDoc> = models.DailyPlan ?? model("DailyPlan", dailyPlanSchema);
export const DayLog: Model<DayLogDoc> = models.DayLog ?? model("DayLog", dayLogSchema);
export const Quiz: Model<QuizDoc> = models.Quiz ?? model("Quiz", quizSchema);
