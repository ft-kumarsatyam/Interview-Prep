import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";
import { CATEGORIES, LEVELS, SOURCES } from "@/modules/interview-bank/domain/bank";

/** Interview questions you added, imported from a page you pasted, or had a model draft. Owner-scoped; one row per distinct question. */
const bankQuestionSchema = new Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    category: { type: String, enum: CATEGORIES, required: true },
    question: { type: String, required: true, maxlength: 300 },
    answer: { type: String, default: null, maxlength: 6000 },
    level: { type: String, enum: [...LEVELS, null], default: null },
    company: { type: String, default: null, maxlength: 60 },
    role: { type: String, default: null, maxlength: 60 },
    round: { type: String, default: null, maxlength: 40 },
    tags: { type: [String], default: [] },
    source: { type: String, enum: SOURCES.filter((s) => s !== "seed"), required: true },
    /** The page an imported question came from. */
    sourceUrl: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true },
);
ownerScope(bankQuestionSchema, [{ fields: { key: 1 } }]);
bankQuestionSchema.index({ category: 1, company: 1 });

export type BankQuestionDoc = InferSchemaType<typeof bankQuestionSchema>;
export const BankQuestion: Model<BankQuestionDoc> = models.BankQuestion ?? model("BankQuestion", bankQuestionSchema);
