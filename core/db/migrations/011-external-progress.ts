import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped indexes used by external sheet progress. */
export const migration: Migration = {
  id: "011-external-progress",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "ExternalProgress");
    if (model) await model.syncIndexes();
  },
};
