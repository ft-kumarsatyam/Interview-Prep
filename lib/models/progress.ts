import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One row per problem you have touched. Dates are YYYY-MM-DD in APP_TIMEZONE. */
const problemProgressSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ["solved", "attempted"], required: true },
    firstSolvedOn: { type: String },
    lastSolvedOn: { type: String },
    confidence: { type: String, enum: ["easy", "ok", "struggled"] },
    timeTakenMin: { type: Number, min: 0 },
    approach: { type: String, maxlength: 300 },
    timeComplexity: { type: String, maxlength: 40 },
    spaceComplexity: { type: String, maxlength: 40 },
    notes: { type: String, maxlength: 20_000 },
    nextReviewAt: { type: String, default: null },
    reviewCount: { type: Number, default: 0 },
    /** Every day this problem was solved or re-solved — feeds daily counts. */
    solveDates: { type: [String], default: [] },
    source: { type: String, enum: ["manual", "leetcode"], default: "manual" },
    /** Imported by LeetCode sync without confidence/time/approach yet. */
    needsDetails: { type: Boolean, default: false },
  },
  { timestamps: true },
);
problemProgressSchema.index({ nextReviewAt: 1 });
problemProgressSchema.index({ solveDates: 1 });

const subtopicProgressSchema = new Schema(
  {
    subtopicId: { type: String, required: true, unique: true },
    topicId: { type: String, required: true },
    doneOn: { type: String, required: true },
    confidence: { type: Number, min: 1, max: 5 },
    notes: { type: String, maxlength: 20_000 },
  },
  { timestamps: true },
);
subtopicProgressSchema.index({ doneOn: 1 });

export type ProblemProgressDoc = InferSchemaType<typeof problemProgressSchema>;
export type SubtopicProgressDoc = InferSchemaType<typeof subtopicProgressSchema>;

export const ProblemProgress: Model<ProblemProgressDoc> =
  models.ProblemProgress ?? model("ProblemProgress", problemProgressSchema);
export const SubtopicProgress: Model<SubtopicProgressDoc> =
  models.SubtopicProgress ?? model("SubtopicProgress", subtopicProgressSchema);
