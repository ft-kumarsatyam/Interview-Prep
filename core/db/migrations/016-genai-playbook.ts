import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped unique indexes for the GenAI playbook task and review rows. */
export const migration: Migration = {
  id: "016-genai-playbook",
  async up({ models }) {
    for (const name of ["GenaiPlaybookTask", "GenaiPlaybookReview"]) {
      const model = models.find((entry) => entry.modelName === name);
      if (model) await model.syncIndexes();
    }
  },
};
