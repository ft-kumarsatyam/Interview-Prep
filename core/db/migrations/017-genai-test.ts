import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped unique index for the GenAI test attempts. */
export const migration: Migration = {
  id: "017-genai-test",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "GenaiTestAttempt");
    if (model) await model.syncIndexes();
  },
};
