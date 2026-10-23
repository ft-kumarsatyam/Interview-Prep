import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped unique index for the GenAI study-note progress. */
export const migration: Migration = {
  id: "015-genai-study",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "GenaiStudyProgress");
    if (model) await model.syncIndexes();
  },
};
