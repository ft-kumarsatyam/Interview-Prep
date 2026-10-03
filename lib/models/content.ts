import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Seeded from data/dsa-problems.json. Never edited by the app. */
const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    leetcodeId: { type: Number, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    pattern: { type: String, required: true },
    track: { type: String, enum: ["main", "js", "sql"], required: true },
    tier: { type: String, enum: ["core", "extended"], required: true },
    url: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: false },
);
problemSchema.index({ track: 1, order: 1 });

/** Seeded from data/syllabus.json. Subtopic id = `${topicId}:${index}`. */
export interface TopicDoc {
  topicId: string;
  track: string;
  week: number;
  level: number;
  title: string;
  position: number;
  resources: string[];
  subtopics: Array<{ id: string; title: string }>;
}

const topicSchema = new Schema<TopicDoc>(
  {
    topicId: { type: String, required: true, unique: true },
    track: { type: String, required: true },
    week: { type: Number, required: true },
    level: { type: Number, required: true },
    title: { type: String, required: true },
    position: { type: Number, required: true },
    resources: { type: [String], default: [] },
    subtopics: {
      type: [{ id: { type: String, required: true }, title: { type: String, required: true }, _id: false }],
      default: [],
    },
  },
  { timestamps: false },
);
topicSchema.index({ week: 1, position: 1 });

/** A problem from outside the sheet (AI-generated or pasted); same runner shape as data/dsa-testcases.json. */
const customProblemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 120 },
    source: { type: String, enum: ["ai", "pasted"], required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    topic: { type: String, required: true, maxlength: 60 },
    statementMd: { type: String, required: true, maxlength: 8000 },
    functionName: { type: String, required: true, maxlength: 40 },
    params: { type: [{ name: { type: String, required: true }, type: { type: String, required: true }, _id: false }], default: [] },
    returnType: { type: String, required: true },
    compare: { type: String, enum: ["exact", "unordered"], default: "exact" },
    cases: { type: [{ input: { type: [Schema.Types.Mixed], default: [] }, expected: Schema.Types.Mixed, hidden: { type: Boolean, default: false }, _id: false }], default: [] },
    hints: { type: [String], default: [] },
    solution: { type: String, maxlength: 8000, default: null },
    attempts: { type: Number, default: 0 },
    /** Local date of the first accepted submission. */
    solvedOn: { type: String, default: null },
  },
  { timestamps: true },
);
customProblemSchema.index({ createdAt: -1 });

/** Accepted submissions of custom problems. Kept apart from ProblemProgress so they never touch the plan or streak. */
const customSolveSchema = new Schema(
  {
    slug: { type: String, required: true },
    date: { type: String, required: true },
    language: { type: String, enum: ["javascript", "typescript", "python"], required: true },
    ms: { type: Number, default: 0 },
  },
  { timestamps: true },
);
customSolveSchema.index({ slug: 1, createdAt: -1 });

export type ProblemDoc = InferSchemaType<typeof problemSchema>;
export type CustomProblemDoc = InferSchemaType<typeof customProblemSchema>;
export type CustomSolveDoc = InferSchemaType<typeof customSolveSchema>;

export const Problem: Model<ProblemDoc> = models.Problem ?? model("Problem", problemSchema);
export const Topic: Model<TopicDoc> = models.Topic ?? model("Topic", topicSchema);
export const CustomProblem: Model<CustomProblemDoc> = models.CustomProblem ?? model("CustomProblem", customProblemSchema);
export const CustomSolve: Model<CustomSolveDoc> = models.CustomSolve ?? model("CustomSolve", customSolveSchema);
