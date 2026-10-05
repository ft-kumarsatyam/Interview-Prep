import type { Migration } from "@/core/db/migrations/types";

/** Builds the question-flag indexes (owner + question id unique). */
export const migration: Migration = {
  id: "008-question-flags",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "QuestionFlag");
    if (model) await model.syncIndexes();
  },
};
