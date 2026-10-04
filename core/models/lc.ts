import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Bump when `leetcodeHtmlToMarkdown` changes, so cached statements are re-fetched in the new format. */
export const STATEMENT_FORMAT = 2;

/**
 * LeetCode problem content, cached for personal display. It is third-party content, so it lives only
 * here (never in data/*.json or git) and is not part of the backup export. Entries expire on their own.
 */
const lcProblemCacheSchema = new Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, enum: ["ok", "premium", "not_found", "error"], required: true },
    title: { type: String, default: null },
    contentMd: { type: String, default: null },
    format: { type: Number, default: STATEMENT_FORMAT },
    hints: { type: [String], default: [] },
    examples: { type: String, default: null },
    jsSnippet: { type: String, default: null },
    questionId: { type: String, default: null },
    topicTags: { type: [String], default: [] },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
lcProblemCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LcProblemCacheDoc = InferSchemaType<typeof lcProblemCacheSchema>;
export const LcProblemCache: Model<LcProblemCacheDoc> = models.LcProblemCache ?? model("LcProblemCache", lcProblemCacheSchema);
