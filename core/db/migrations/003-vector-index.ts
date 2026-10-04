import type { Migration } from "@/core/db/migrations/types";
import { EMBEDDING_DIMS } from "@/core/llm/embeddings";

/** Must match modules/ai/services/retrieval.ts. */
const VECTOR_INDEX = "embedding_vector";

/**
 * Builds the Atlas Vector Search index on `embeddings` (free on M0), plus the keyword index. Atlas Search commands do
 * not exist on a plain MongoDB (local Docker, tests), so failure is logged and skipped: retrieval then scans vectors
 * in-process, which gives the same results at personal scale.
 */
export const migration: Migration = {
  id: "003-vector-index",
  async up({ models }) {
    const m = models.find((x) => x.modelName === "Embedding");
    if (!m) return;
    await m.syncIndexes();
    try {
      const existing = await m.collection.listSearchIndexes(VECTOR_INDEX).toArray();
      if (existing.length === 0) {
        await m.collection.createSearchIndex({
          name: VECTOR_INDEX,
          type: "vectorSearch",
          definition: {
            fields: [
              { type: "vector", path: "vector", numDimensions: EMBEDDING_DIMS, similarity: "cosine" },
              { type: "filter", path: "ownerId" },
              { type: "filter", path: "source" },
            ],
          },
        });
      }
    } catch (err) {
      console.warn(`[migrate] vector search index skipped (not Atlas?): ${err instanceof Error ? err.message.slice(0, 120) : err}`);
    }
  },
};
