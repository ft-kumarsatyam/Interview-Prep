import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One GenAI test attempt. `slug` names it (weekly-w05-1, cumulative-w12-2, level-3-1). The questions (with their answer
 * key) are a snapshot so a later content change never rewrites a finished test; the key is only sent to the browser
 * after submit. Separate from the daily quiz, the streak and the plan.
 */
const genaiTestAttemptSchema = new Schema(
  {
    slug: { type: String, required: true, maxlength: 60 },
    kind: { type: String, required: true, enum: ["weekly", "cumulative", "level"] },
    weekId: { type: String, required: true, match: /^w\d{2}$/ },
    weekIdx: { type: Number, required: true, min: 1, max: 23 },
    level: { type: Number, default: null },
    startedOn: { type: String, required: true },
    submittedOn: { type: String, default: null },
    status: { type: String, required: true, enum: ["in_progress", "submitted"], default: "in_progress" },
    /** PickedQuestion[]: the questions with their answer key and flags. */
    questions: { type: [Schema.Types.Mixed], default: [] },
    /** question id -> chosen option index, or { text, scores?, gradedBy?, summary? } for a written answer. */
    answers: { type: Schema.Types.Mixed, default: {} },
    passMark: { type: Number, required: true },
    coverage: { type: Schema.Types.Mixed, default: {} },
    mcqCorrect: { type: Number, default: 0 },
    mcqTotal: { type: Number, default: 0 },
    /** Overall 0-100, null while a written answer is ungraded. */
    pct: { type: Number, default: null },
    passed: { type: Boolean, default: false },
    verdict: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(genaiTestAttemptSchema, [{ fields: { slug: 1 } }]);

export type GenaiTestAttemptRow = InferSchemaType<typeof genaiTestAttemptSchema>;
export const GenaiTestAttempt: Model<GenaiTestAttemptRow> = models.GenaiTestAttempt ?? model("GenaiTestAttempt", genaiTestAttemptSchema);
