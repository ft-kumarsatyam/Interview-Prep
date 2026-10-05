import { createLlm } from "@/core/llm";
import { LLM_PROVIDERS, type LlmProvider, type LlmProviderName } from "@/core/llm/types";

/** The LLM for offline content scripts, from LLM_API_KEY (or GEMINI_API_KEY) plus LLM_PROVIDER / LLM_MODEL / LLM_BASE_URL. Null when no key is set. */
export function llmFromEnv(): LlmProvider | null {
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const provider = (LLM_PROVIDERS as readonly string[]).includes(process.env.LLM_PROVIDER ?? "") ? (process.env.LLM_PROVIDER as LlmProviderName) : "gemini";
  return createLlm({ provider, apiKey, model: process.env.LLM_MODEL || undefined, baseUrl: process.env.LLM_BASE_URL || undefined });
}

/** Free tiers cap tokens per minute: wait out a 429 and retry rather than skipping the item. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const rateLimited = err instanceof Error && /HTTP 429/.test(err.message);
      if (!rateLimited || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 20_000 * i));
    }
  }
}
