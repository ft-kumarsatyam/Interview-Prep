import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped unique index for DSA bookmarks. */
export const migration: Migration = {
  id: "013-dsa-bookmarks",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "DsaBookmark");
    if (model) await model.syncIndexes();
  },
};
