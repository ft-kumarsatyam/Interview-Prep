import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { PRIORITIES, TIER_IDS } from "@/modules/targets/domain/companies";

/** A company you are preparing for. The tier decides the prep profile; pins are the questions you chose yourself. */
const targetSchema = new Schema(
  {
    /** The id in data/companies.json, absent for a company you typed in. */
    companyId: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    tier: { type: String, enum: TIER_IDS, required: true },
    priority: { type: String, enum: PRIORITIES, default: "target" },
    interviewDate: { type: String, default: null },
    notes: { type: String, default: "", maxlength: 2000 },
    pinnedDsa: { type: [String], default: [] },
    pinnedDesign: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type TargetDoc = InferSchemaType<typeof targetSchema>;
export const Target: Model<TargetDoc> = models.Target ?? model("Target", targetSchema);
