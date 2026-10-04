import type { Schema } from "mongoose";
import { currentOwnerId } from "@/core/db/owner";
import { ownerPipeline, ownerUniqueIndex, withOwner } from "@/core/domain/owner-scope";

type UniqueSpec = Record<string, 1 | -1>;
type IndexOptions = { sparse?: boolean; partialFilterExpression?: Record<string, unknown> };

const FILTERED = [
  "find", "findOne", "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace", "findOneAndRemove",
  "updateOne", "updateMany", "replaceOne", "deleteOne", "deleteMany", "countDocuments", "distinct",
] as const;

/**
 * Makes a schema owner-scoped: adds `ownerId`, injects it into every filter, update-upsert and aggregation, and
 * turns each natural-key unique index into `{ ownerId, ...key }`. Models without it (problems, topics, caches, the KV
 * store, public job postings) are shared on purpose. Pass an explicit `ownerId` in a filter to bypass (migrations).
 *
 * Singleton documents with a fixed `_id` (settings, planner intake) are not scoped yet; that needs the id to carry the
 * owner and lands with the first second user.
 */
export function ownerScope(schema: Schema, uniques: Array<{ fields: UniqueSpec; options?: IndexOptions }> = []): void {
  schema.add({ ownerId: { type: String, required: true, default: () => currentOwnerId(), index: true } });

  type Scopable = { getQuery(): Record<string, unknown>; setQuery(q: Record<string, unknown>): void };
  const scopeQuery = function (this: Scopable) {
    this.setQuery(withOwner(this.getQuery(), currentOwnerId()));
  };
  for (const name of FILTERED) schema.pre(name as "find", scopeQuery as never);
  schema.pre("aggregate", function () {
    this.pipeline().splice(0, this.pipeline().length, ...(ownerPipeline(this.pipeline() as never, currentOwnerId()) as never[]));
  });

  for (const { fields, options } of uniques) schema.index(ownerUniqueIndex(fields), { unique: true, ...options });
}
