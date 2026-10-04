import { connectDb } from "@/core/db";
import { chunkText, contentHash } from "@/modules/ai/domain/rag";
import { subtopicById, subtopicNotes } from "@/core/content";
import type { Embedder } from "@/core/llm/embeddings";
import { Embedding } from "@/core/models/embedding";
import { Article } from "@/core/models/system";

export interface SourceDoc {
  source: "note" | "article";
  ref: string;
  title: string;
  text: string;
}

export interface IndexResult {
  chunks: number;
  /** Chunks sent to the embedding model (new or changed). */
  embedded: number;
  /** Chunks whose text did not change, so their stored vector was kept. */
  unchanged: number;
  removed: number;
}

/**
 * Indexes one source: chunk, compare each chunk's hash with what is stored, embed only the new or changed ones, and
 * drop chunks that no longer exist. With no embedder the text is still stored, so keyword search works; a later run
 * with a key fills the missing vectors without re-chunking.
 */
export async function indexSource(doc: SourceDoc, embedder: Embedder | null): Promise<IndexResult> {
  await connectDb();
  const chunks = chunkText(doc.text);
  const hashes = chunks.map(contentHash);
  const existing = await Embedding.find({ ref: doc.ref }, { chunkIndex: 1, hash: 1, vector: 1, model: 1 }).lean();
  const byIndex = new Map(existing.map((e) => [e.chunkIndex, e]));

  const needs: number[] = [];
  chunks.forEach((_, i) => {
    const e = byIndex.get(i);
    const sameText = e?.hash === hashes[i];
    const hasVector = Boolean(e?.vector?.length) && e?.model === embedder?.model;
    if (!sameText || (embedder && !hasVector)) needs.push(i);
  });

  const vectors = embedder && needs.length ? await embedder.embed(needs.map((i) => chunks[i]!), "document") : [];
  for (const [n, i] of needs.entries()) {
    await Embedding.updateOne(
      { ref: doc.ref, chunkIndex: i },
      { $set: { source: doc.source, title: doc.title.slice(0, 200), text: chunks[i]!.slice(0, 2000), hash: hashes[i]!, ...(vectors[n] ? { vector: vectors[n], model: embedder!.model } : { model: null }) }, ...(vectors[n] ? {} : { $unset: { vector: "" } }) },
      { upsert: true },
    );
  }
  const removed = (await Embedding.deleteMany({ ref: doc.ref, chunkIndex: { $gte: chunks.length } })).deletedCount;
  return { chunks: chunks.length, embedded: vectors.length, unchanged: chunks.length - needs.length, removed };
}

/** Indexes a saved article's extracted text. Articles with no body (headline-only, failed extraction) are skipped. */
export async function indexArticle(articleId: string, embedder: Embedder | null): Promise<IndexResult | null> {
  if (!/^[a-f0-9]{24}$/i.test(articleId)) return null;
  await connectDb();
  const a = await Article.findById(articleId, { title: 1, content: 1, sourceName: 1 }).lean();
  if (!a?.content) return null;
  return indexSource({ source: "article", ref: `article:${articleId}`, title: `${a.title} (${a.sourceName})`, text: a.content }, embedder);
}

/** Indexes every authored lesson note (your study notes). Safe to re-run: unchanged chunks are not re-embedded. */
export async function indexNotes(embedder: Embedder | null): Promise<{ notes: number; embedded: number; unchanged: number }> {
  const totals = { notes: 0, embedded: 0, unchanged: 0 };
  for (const [id, note] of subtopicNotes) {
    const info = subtopicById.get(id);
    const title = info ? `${info.topicTitle}: ${info.title}` : id;
    const text = `${note.body}\n\nKey points:\n${note.keyPoints.map((k) => `- ${k}`).join("\n")}`;
    const r = await indexSource({ source: "note", ref: `note:${id}`, title, text }, embedder);
    totals.notes++;
    totals.embedded += r.embedded;
    totals.unchanged += r.unchanged;
  }
  return totals;
}
