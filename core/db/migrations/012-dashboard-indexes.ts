import type { Migration } from "@/core/db/migrations/types";

/** Covers the dashboard's pending-detail queue without relying on startup index creation. */
export const migration: Migration = {
  id: "012-dashboard-indexes",
  async up({ models }) {
    const progress = models.find((entry) => entry.modelName === "ProblemProgress");
    if (progress) await progress.syncIndexes();
  },
};
