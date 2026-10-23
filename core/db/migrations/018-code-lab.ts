import type { Migration } from "@/core/db/migrations/types";

/** Creates the owner-scoped indexes for run logs, saved DB Lab queries and DB Lab progress. */
export const migration: Migration = {
  id: "018-code-lab",
  async up({ models }) {
    for (const name of ["RunLog", "DbLabQuery", "DbLabProgress"]) {
      const model = models.find((entry) => entry.modelName === name);
      if (model) await model.syncIndexes();
    }
  },
};
