import { connectDb } from "@/core/db";
import { currentOwnerId } from "@/core/db/owner";
import { rrfMerge, cosine, type Passage } from "@/modules/ai/domain/rag";
import type { Embedder } from "@/core/llm/embeddings";
import { Embedding } from "@/core/models/embedding";

export const VECTOR_INDEX = "embedding_vector";
const CANDIDATES = 20;
const FALLBACK_SCAN_LIMIT = 5000;
const MAX_PER_REF = 2;

export type RetrievalMode = "hybrid" | "keyword" | "vector";

export interface Retrieved {
  passages: Array<Passage & { score: number }>;
  mode: RetrievalMode;
  /** How the vector half ran: Atlas `$vectorSearch`, the in-process scan (no Atlas index), or not at all. */
  vector: "atlas" | "scan" | "none";
}

const idOf = (r: { ref: string; chunkIndex: number }) => `${r.ref}#${r.chunkIndex}`;

async function keywordRank(query: string): Promise<string[]> {
  const q = query.replace(/["\\]/g, " ").trim();
  if (!q) return [];
  const rows = await Embedding.find({ $text: { $search: q } }, { ref: 1, chunkIndex: 1, score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .limit(CANDIDATES)
    .lean();
  return rows.map(idOf);
}

/** Atlas Vector Search when the index exists; otherwise cosine over this owner's stored vectors (fine at personal scale). */
async function vectorRank(queryVector: number[]): Promise<{ ids: string[]; via: "atlas" | "scan" }> {
  try {
    const rows = await Embedding.aggregate<{ ref: string; chunkIndex: number }>([
      { $vectorSearch: { index: VECTOR_INDEX, path: "vector", queryVector, numCandidates: 100, limit: CANDIDATES, filter: { ownerId: currentOwnerId() } } },
      { $project: { ref: 1, chunkIndex: 1 } },
    ]);
    return { ids: rows.map(idOf), via: "atlas" };
  } catch {
    const rows = await Embedding.find({ vector: { $exists: true } }, { ref: 1, chunkIndex: 1, vector: 1 }).limit(FALLBACK_SCAN_LIMIT).lean();
    const ranked = rows
      .map((r) => ({ id: idOf(r), s: cosine(queryVector, r.vector ?? []) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, CANDIDATES);
    return { ids: ranked.map((r) => r.id), via: "scan" };
  }
}

/**
 * Hybrid retrieval: keyword (`$text`) and vector rankings merged with reciprocal rank fusion. With no embedder, or if
 * embedding the question fails, it quietly uses keywords only, so search never depends on the embedding key.
 */
export async function searchPassages(query: string, opts: { k?: number; embedder?: Embedder | null } = {}): Promise<Retrieved> {
  await connectDb();
  const k = opts.k ?? 5;
  const keyword = await keywordRank(query);
  let vector: string[] = [];
  let via: Retrieved["vector"] = "none";
  if (opts.embedder) {
    try {
      const [qv] = await opts.embedder.embed([query], "query");
      if (qv) {
        const r = await vectorRank(qv);
        vector = r.ids;
        via = r.via;
      }
    } catch {
      // keyword-only
    }
  }
  const mode: RetrievalMode = vector.length && keyword.length ? "hybrid" : vector.length ? "vector" : "keyword";
  const merged = rrfMerge([keyword, vector]);

  const perRef = new Map<string, number>();
  const picked: Array<{ id: string; score: number }> = [];
  for (const m of merged) {
    const ref = m.id.slice(0, m.id.lastIndexOf("#"));
    if ((perRef.get(ref) ?? 0) >= MAX_PER_REF) continue;
    perRef.set(ref, (perRef.get(ref) ?? 0) + 1);
    picked.push(m);
    if (picked.length >= k) break;
  }
  if (!picked.length) return { passages: [], mode, vector: via };

  const keys = picked.map((p) => ({ ref: p.id.slice(0, p.id.lastIndexOf("#")), chunkIndex: Number(p.id.slice(p.id.lastIndexOf("#") + 1)) }));
  const rows = await Embedding.find({ $or: keys }, { ref: 1, chunkIndex: 1, title: 1, text: 1 }).lean();
  const byId = new Map(rows.map((r) => [idOf(r), r]));
  const passages = picked.flatMap((p) => {
    const r = byId.get(p.id);
    return r ? [{ ref: r.ref, title: r.title, text: r.text, score: p.score }] : [];
  });
  return { passages, mode, vector: via };
}
