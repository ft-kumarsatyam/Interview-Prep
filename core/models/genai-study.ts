import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * How well you know one sub-topic of a roadmap node ("review" or "known"). A sub-topic with no row is new. Keyed by
 * the stable sub-topic key (`subtopicKey`), never by checklist position. Separate from the roadmap checklist ticks.
 */
const genaiStudyProgressSchema = new Schema(
  {
    roadmapId: { type: String, required: true, maxlength: 60 },
    nodeId: { type: String, required: true, maxlength: 80 },
    key: { type: String, required: true, maxlength: 60 },
    status: { type: String, enum: ["review", "known"], required: true },
    updatedOn: { type: String, required: true },
  },
  { timestamps: true },
);
ownerScope(genaiStudyProgressSchema, [{ fields: { roadmapId: 1, nodeId: 1, key: 1 } }]);

export type GenaiStudyProgressRow = InferSchemaType<typeof genaiStudyProgressSchema>;
export const GenaiStudyProgress: Model<GenaiStudyProgressRow> = models.GenaiStudyProgress ?? model("GenaiStudyProgress", genaiStudyProgressSchema);
