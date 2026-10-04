import type { Migration } from "@/core/db/migrations/types";

/** Builds the owner-scoped indexes for per-key token counts and the assistant's threads and messages. */
export const migration: Migration = {
  id: "004-ai-chat-indexes",
  async up({ models }) {
    for (const m of models) if (["LlmKeyUsage", "ChatThread", "ChatMessage"].includes(m.modelName)) await m.syncIndexes();
  },
};
