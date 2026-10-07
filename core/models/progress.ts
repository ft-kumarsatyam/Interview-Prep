import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One row per problem you have touched. Dates are YYYY-MM-DD in APP_TIMEZONE. */
const problemProgressSchema = new Schema(
  {
    slug: { type: String, required: true },
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
    /** Indices of hidden test cases shown to you after a failed Submit (each is revealed once, then visible). */
    revealedCases: { type: [Number], default: [] },
  },
  { timestamps: true },
);
ownerScope(problemProgressSchema, [{ fields: { slug: 1 } }]);
problemProgressSchema.index({ ownerId: 1, nextReviewAt: 1 });
problemProgressSchema.index({ ownerId: 1, solveDates: 1 });
problemProgressSchema.index({ ownerId: 1, needsDetails: 1, lastSolvedOn: -1 });

const subtopicProgressSchema = new Schema(
  {
    subtopicId: { type: String, required: true },
    topicId: { type: String, required: true },
    doneOn: { type: String, required: true },
    confidence: { type: Number, min: 1, max: 5 },
    notes: { type: String, maxlength: 20_000 },
  },
  { timestamps: true },
);
ownerScope(subtopicProgressSchema, [{ fields: { subtopicId: 1 } }]);
subtopicProgressSchema.index({ ownerId: 1, doneOn: 1 });

export type ProblemProgressDoc = InferSchemaType<typeof problemProgressSchema>;
export type SubtopicProgressDoc = InferSchemaType<typeof subtopicProgressSchema>;

export const ProblemProgress: Model<ProblemProgressDoc> =
  models.ProblemProgress ?? model("ProblemProgress", problemProgressSchema);
export const SubtopicProgress: Model<SubtopicProgressDoc> =
  models.SubtopicProgress ?? model("SubtopicProgress", subtopicProgressSchema);
