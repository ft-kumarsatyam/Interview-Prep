import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One completion row per playbook task. Keyed by stable task id (p012t1), never array index. */
const genaiPlaybookTaskSchema = new Schema(
  {
    taskId: { type: String, required: true, match: /^p\d{3}t\d+$/ },
    completedOn: { type: String, required: true },
  },
  { timestamps: true },
);
ownerScope(genaiPlaybookTaskSchema, [{ fields: { taskId: 1 } }]);

/** A weekly readiness self-score (0-5 per domain) or a mock scorecard (1-5 per dimension). Numbers and a short note only. */
const genaiPlaybookReviewSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["readiness", "mock"] },
    weekId: { type: String, required: true, match: /^w\d{2}$/ },
    scores: { type: Schema.Types.Mixed, required: true },
    note: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);
ownerScope(genaiPlaybookReviewSchema, [{ fields: { kind: 1, weekId: 1 } }]);

export type GenaiPlaybookTaskRow = InferSchemaType<typeof genaiPlaybookTaskSchema>;
export type GenaiPlaybookReviewRow = InferSchemaType<typeof genaiPlaybookReviewSchema>;

export const GenaiPlaybookTask: Model<GenaiPlaybookTaskRow> = models.GenaiPlaybookTask ?? model("GenaiPlaybookTask", genaiPlaybookTaskSchema);
export const GenaiPlaybookReview: Model<GenaiPlaybookReviewRow> = models.GenaiPlaybookReview ?? model("GenaiPlaybookReview", genaiPlaybookReviewSchema);
