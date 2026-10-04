import { registerHandler } from "@/core/events/deliver";
import { getEmbedder } from "@/core/llm/embeddings";
import { indexArticle } from "@/modules/ai/services/ingest";

let registered = false;

/** Keeps the search index current: an ingested article is chunked and embedded (only changed chunks) by a consumer. */
export function registerAiHandlers(): void {
  if (registered) return;
  registered = true;
  registerHandler("ArticleIngested", "ai.index-article", async (event) => indexArticle(event.payload.articleId, getEmbedder()));
}
