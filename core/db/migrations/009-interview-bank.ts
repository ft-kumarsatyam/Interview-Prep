import type { Migration } from "@/core/db/migrations/types";

/** Builds the interview-bank indexes (owner + question key unique). */
export const migration: Migration = {
  id: "009-interview-bank",
  async up({ models }) {
    const model = models.find((entry) => entry.modelName === "BankQuestion");
    if (model) await model.syncIndexes();
  },
};
