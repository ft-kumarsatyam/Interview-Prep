import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Whether a roadmap learning link still opens. Catalogue metadata about public URLs, shared by every viewer and
 * holding nothing personal, so it is not owner-scoped (like `jobpostings`). The unique `url` index is created by a migration.
 */
const linkHealthSchema = new Schema(
  {
    url: { type: String, required: true, unique: true, maxlength: 2000 },
    status: { type: String, enum: ["ok", "dead", "blocked"], required: true },
    httpStatus: { type: Number, default: null },
    /** Failed checks in a row. A link is only called dead after two. */
    failures: { type: Number, default: 0 },
    checkedAt: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

export type LinkHealthRow = InferSchemaType<typeof linkHealthSchema>;
export const LinkHealth: Model<LinkHealthRow> = models.LinkHealth ?? model("LinkHealth", linkHealthSchema);
