import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";
import { FLAG_REASONS } from "@/modules/quiz/lib/flag-reasons";


/** A question you reported. Flagged questions are left out of your future quizzes. One flag per question. */
const questionFlagSchema = new Schema(
  {
    qid: { type: String, required: true, maxlength: 80 },
    reason: { type: String, enum: FLAG_REASONS, required: true },
    note: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true },
);
ownerScope(questionFlagSchema, [{ fields: { qid: 1 } }]);

export type QuestionFlagDoc = InferSchemaType<typeof questionFlagSchema>;
export const QuestionFlag: Model<QuestionFlagDoc> = models.QuestionFlag ?? model("QuestionFlag", questionFlagSchema);
