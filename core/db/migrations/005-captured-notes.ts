import type { Migration } from "@/core/db/migrations/types";

/** Builds indexes for captured selections and their review queue. */
export const migration: Migration = {
  id: "005-captured-notes",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "CapturedNote");
    if (model) await model.syncIndexes();
  },
};
