import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";

/**
 * An API token (Settings > API tokens). Only the SHA-256 of the secret is stored, never the token itself. `prefix` is
 * the visible part that names it in the list. Looked up by hash at the start of an API request, before the owner is known.
 */
const apiTokenSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    prefix: { type: String, required: true, maxlength: 8 },
    hash: { type: String, required: true, maxlength: 64 },
    scopes: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
ownerScope(apiTokenSchema, [{ fields: { hash: 1 } }]);
apiTokenSchema.index({ prefix: 1 });

export type ApiTokenRow = InferSchemaType<typeof apiTokenSchema>;
export const ApiToken: Model<ApiTokenRow> = models.ApiToken ?? model("ApiToken", apiTokenSchema);
