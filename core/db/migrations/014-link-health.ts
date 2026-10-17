import type { Migration } from "@/core/db/migrations/types";

/** Creates the indexes for the roadmap link-health catalogue. */
export const migration: Migration = {
  id: "014-link-health",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "LinkHealth");
    if (model) await model.syncIndexes();
  },
};
