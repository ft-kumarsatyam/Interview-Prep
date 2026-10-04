import type { Model, QueryFilter, UpdateQuery } from "mongoose";
import { withOwner } from "@/core/domain/owner-scope";

/**
 * An explicit owner-scoped view of a model for code that should not rely on the ambient owner (workers, API tokens,
 * future multi-user paths). The schema plugin already scopes plain `Model.find(...)` calls to the current owner.
 */
export function scoped<T extends object>(model: Model<T>, ownerId: string) {
  const f = (filter: QueryFilter<T> = {}) => withOwner(filter as Record<string, unknown>, ownerId) as unknown as QueryFilter<T>;
  return {
    find: (filter?: QueryFilter<T>) => model.find(f(filter)),
    findOne: (filter?: QueryFilter<T>) => model.findOne(f(filter)),
    count: (filter?: QueryFilter<T>) => model.countDocuments(f(filter)),
    updateOne: (filter: QueryFilter<T>, update: UpdateQuery<T>, upsert = false) => model.updateOne(f(filter), update, { upsert }),
    deleteMany: (filter?: QueryFilter<T>) => model.deleteMany(f(filter)),
    create: (doc: Partial<T>) => model.create({ ...doc, ownerId }),
  };
}
