import type { Migration } from "@/core/db/migrations/types";

/** Builds the outbox and inbox indexes up front: their unique indexes are what make publishing and delivery idempotent. */
export const migration: Migration = {
  id: "002-event-indexes",
  async up({ models }) {
    for (const m of models) if (["Outbox", "Inbox"].includes(m.modelName)) await m.syncIndexes();
  },
};
