import { z } from "zod";
import { doneSchema, questionSchema, type AskEvent, type AskSource } from "@/modules/ai/domain/ask-events";
import { env } from "@/core/env";
import { AllProvidersFailedError } from "@/core/llm/errors";
import type { Embedder } from "@/core/llm/embeddings";
import type { LlmProvider } from "@/core/llm/types";
import { buildRagPrompt, checkGrounding, contentHash, NOT_FOUND_ANSWER, RAG_PROMPT_VERSION, refHref } from "@/modules/ai/domain/rag";
import { getAiFor } from "@/modules/ai/services/ai";
import { getCachedAi, putCachedAi } from "@/modules/ai/services/ai-cache";
import { searchPassages } from "@/modules/ai/services/retrieval";

const cachedShape = z.object({ text: z.string(), cited: z.array(z.number().int()) });

/**
 * Answers a question from your own notes and saved articles. Retrieval is hybrid (keywords plus vectors when a
 * Gemini key exists), the answer streams, and it must cite the passages it used: the finished text is checked
 * against what was retrieved, and only a grounded answer is cached. With no AI provider the matching passages
 * are still returned, so the page works as plain search.
 */
export async function* askNotes(questionRaw: unknown, deps: { embedder?: Embedder | null; llm?: LlmProvider | null } = {}): AsyncGenerator<AskEvent> {
  const parsed = questionSchema.safeParse(questionRaw);
  if (!parsed.success) {
    yield { type: "error", error: parsed.error.issues[0]?.message ?? "Ask a question" };
    return;
  }
  const question = parsed.data;
  const { getEmbedder } = await import("@/core/llm/embeddings");
  const retrieved = await searchPassages(question, { embedder: deps.embedder === undefined ? getEmbedder() : deps.embedder });
  const sources: AskSource[] = retrieved.passages.map((p, i) => ({ n: i + 1, ref: p.ref, title: p.title, href: refHref(p.ref) }));
  yield { type: "sources", sources, mode: retrieved.mode };

  const finish = (text: string, extra: { cached: boolean; provider?: string }) => {
    const g = checkGrounding(text, sources.length);
    return { g, result: { answer: g.text, cited: g.cited.map((n) => sources[n - 1]!), grounded: g.grounded, notFound: g.notFound, ...extra } };
  };

  if (sources.length === 0) {
    yield { type: "token", text: NOT_FOUND_ANSWER };
    yield { type: "done", result: doneSchema.parse(finish(NOT_FOUND_ANSWER, { cached: false }).result) };
    return;
  }

  const cacheOpts = {
    feature: "ask" as const,
    version: RAG_PROMPT_VERSION,
    // The passages' text is part of the key, so editing a note or re-indexing an article never serves a stale answer.
    input: `${question}\u0000${contentHash(retrieved.passages.map((p) => `${p.ref}\u0001${p.text}`).join("\u0002"))}`,
    ttlDays: 14,
    schema: cachedShape,
    timeZone: env().APP_TIMEZONE,
  };
  const hit = await getCachedAi(cacheOpts);
  if (hit) {
    yield { type: "token", text: hit.value.text };
    yield { type: "done", result: doneSchema.parse(finish(hit.value.text, { cached: true, provider: hit.provider }).result) };
    return;
  }

  const llm = deps.llm === undefined ? await getAiFor("ask") : deps.llm;
  if (!llm?.streamText) {
    yield { type: "error", error: "No AI provider is configured, so here are the matching passages only.", unavailable: true };
    return;
  }
  let text = "";
  try {
    for await (const chunk of llm.streamText(buildRagPrompt(question, retrieved.passages))) {
      text += chunk;
      yield { type: "token", text: chunk };
    }
  } catch (err) {
    yield { type: "error", error: err instanceof AllProvidersFailedError ? err.message : "The answer was interrupted. Try again." };
    return;
  }
  const { g, result } = finish(text, { cached: false, provider: llm.lastProvider });
  if (g.grounded && !g.notFound) {
    await putCachedAi(cacheOpts, { text: g.text, cited: g.cited }, llm.lastProvider).catch(() => undefined);
  }
  yield { type: "done", result: doneSchema.parse(result) };
}
