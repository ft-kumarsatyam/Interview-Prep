import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { MOCK_TYPES } from "@/modules/mock/domain/mock";

/**
 * One timed mock interview. `rounds` is the question set frozen at start (lib/domain/mock.ts shapes);
 * `answers` is keyed by question id. Never read by the planner or the streak.
 */
const mockSessionSchema = new Schema(
  {
    type: { type: String, enum: MOCK_TYPES, required: true },
    /** Local date the mock was started (APP_TIMEZONE). */
    date: { type: String, required: true },
    startedAt: { type: Date, required: true },
    durationMin: { type: Number, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ["in_progress", "submitted", "graded"], default: "in_progress" },
    rounds: { type: [Schema.Types.Mixed], default: [] },
    answers: { type: Schema.Types.Mixed, default: {} },
    /** Out of 100 once every answer is scored. */
    totalScore: { type: Number, default: null },
    roundScores: { type: [Schema.Types.Mixed], default: [] },
    autoSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false },
);
mockSessionSchema.index({ status: 1, deadlineAt: 1 });
mockSessionSchema.index({ date: -1 });

export type MockSessionDoc = InferSchemaType<typeof mockSessionSchema>;
export const MockSession: Model<MockSessionDoc> = models.MockSession ?? model("MockSession", mockSessionSchema);
