import { env } from "@/core/env";
import { fetchWithPolicy } from "@/core/http";
import { redact } from "@/core/llm/errors";

/** Turns text into vectors for semantic search. The query and the documents use different task types on purpose. */
export interface Embedder {
  readonly model: string;
  readonly dims: number;
  embed(texts: readonly string[], kind: "document" | "query"): Promise<number[][]>;
}

const BATCH = 100;
export const EMBEDDING_DIMS = 768;
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/** Scales a vector to length 1 (the model returns unnormalised vectors below its full 3072 dimensions). */
export function normalize(v: readonly number[]): number[] {
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return n === 0 ? [...v] : v.map((x) => x / n);
}

/** Gemini embeddings on the free tier (the same GEMINI_API_KEY as the chat model). */
export function geminiEmbedder(apiKey: string, opts: { baseUrl?: string; model?: string } = {}): Embedder {
  const base = opts.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  const model = opts.model ?? GEMINI_EMBEDDING_MODEL;
  return {
    model,
    dims: EMBEDDING_DIMS,
    async embed(texts, kind) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const slice = texts.slice(i, i + BATCH);
        const res = await fetchWithPolicy(`${base}/models/${model}:batchEmbedContents`, {
          method: "POST",
          timeoutMs: 30_000,
          retries: 1,
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            requests: slice.map((text) => ({
              model: `models/${model}`,
              content: { parts: [{ text }] },
              taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
              outputDimensionality: EMBEDDING_DIMS,
            })),
          }),
        });
        if (!res.ok) throw new Error(`Embedding HTTP ${res.status}: ${redact((await res.text().catch(() => "")).slice(0, 200), [apiKey])}`);
        const data = (await res.json()) as { embeddings?: Array<{ values?: number[] }> };
        if (!data.embeddings || data.embeddings.length !== slice.length) throw new Error("Embedding response had the wrong size");
        for (const e of data.embeddings) {
          if (!Array.isArray(e.values) || e.values.length !== EMBEDDING_DIMS) throw new Error("Embedding had the wrong dimensions");
          out.push(normalize(e.values));
        }
      }
      return out;
    },
  };
}

/** The embedder for this deployment, or null without a Gemini key (search then falls back to keywords only). */
export function getEmbedder(): Embedder | null {
  const key = env().GEMINI_API_KEY;
  return key ? geminiEmbedder(key) : null;
}
