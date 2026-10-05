import type { Migration } from "@/core/db/migrations/types";

/** Builds the job-profile indexes (owner + name unique). */
export const migration: Migration = {
  id: "006-job-profiles",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "JobProfile");
    if (model) await model.syncIndexes();
  },
};
