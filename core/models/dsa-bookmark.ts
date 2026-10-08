import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** A DSA problem saved for later from the /dsa table. */
const dsaBookmarkSchema = new Schema(
  {
    slug: { type: String, required: true, maxlength: 160 },
  },
  { timestamps: true },
);

ownerScope(dsaBookmarkSchema, [{ fields: { slug: 1 } }]);

export type DsaBookmarkDoc = InferSchemaType<typeof dsaBookmarkSchema>;
export const DsaBookmark: Model<DsaBookmarkDoc> = models.DsaBookmark ?? model("DsaBookmark", dsaBookmarkSchema);
