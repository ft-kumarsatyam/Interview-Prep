import { DEFAULT_OWNER_ID } from "@/core/domain/owner-scope";
import type { Migration } from "@/core/db/migrations/types";

/**
 * Gives every existing row an owner and replaces the single-user unique indexes with `{ ownerId, ...key }` ones.
 * Rows are tagged first, so the new unique indexes can never fail on legacy data.
 */
export const migration: Migration = {
  id: "001-owner-id",
  async up({ models }) {
    for (const m of models) {
      if (!m.schema.path("ownerId")) continue;
      const owner = process.env.OWNER_ID?.trim() || DEFAULT_OWNER_ID;
      await m.collection.updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: owner } });
      await m.syncIndexes();
    }
  },
};
