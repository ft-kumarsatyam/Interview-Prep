import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const externalProgressSchema = new Schema(
  {
    itemId: { type: String, required: true },
    sheetId: { type: String, required: true },
    status: { type: String, enum: ["not-started", "in-progress", "completed"], default: "in-progress" },
    completedOn: { type: String, default: null },
    timeTakenMin: { type: Number, min: 0, max: 600, default: null },
    notes: { type: String, maxlength: 20_000, default: "" },
    gfgCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ownerScope(externalProgressSchema, [{ fields: { itemId: 1 } }]);
externalProgressSchema.index({ sheetId: 1, status: 1 });

export type ExternalProgressDoc = InferSchemaType<typeof externalProgressSchema>;
export const ExternalProgressModel: Model<ExternalProgressDoc> =
  models.ExternalProgress ?? model("ExternalProgress", externalProgressSchema);
