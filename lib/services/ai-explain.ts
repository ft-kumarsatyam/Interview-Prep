import { EXPLAIN_PROMPT_VERSION, explainInputSchema, explainOutputSchema, explainPrompt, normaliseExplainInput, type ExplainOutput } from "@/lib/domain/ai-explain";
import { env } from "@/lib/env";
import { runAi } from "./ai";
import { cachedAi } from "./ai-cache";

export type ExplainResult =
  | { ok: true; explanation: ExplainOutput; cached: boolean; provider?: string }
  | { ok: false; error: string; unavailable?: true; needsPaid?: { used: number; cap: number } };

/**
 * Explain why a quiz answer was wrong. The same question and answers are answered once per 30 days and
 * then served from the cache. A cache hit never calls a provider, so it costs nothing, works when every
 * provider is out of quota, and never raises the paid-fallback prompt.
 */
export async function explainAnswer(input: unknown, opts: { paidOnce?: boolean } = {}): Promise<ExplainResult> {
  const parsed = explainInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That question couldn't be sent for explanation" };
  const q = normaliseExplainInput(parsed.data);
  const cacheInput = JSON.stringify([q.prompt, q.code ?? "", q.options, q.chosen, q.correct]);

  const res = await runAi("explain", { paidOnce: opts.paidOnce }, (llm) =>
    cachedAi(
      { feature: "explain", version: EXPLAIN_PROMPT_VERSION, input: cacheInput, ttlDays: 30, schema: explainOutputSchema, timeZone: env().APP_TIMEZONE },
      async () => {
        const value = await llm.generateJson(explainPrompt(q), explainOutputSchema);
        return { value, provider: llm.lastProvider };
      },
    ),
  );
  if (!res.ok) return res;
  return { ok: true, explanation: res.data.value, cached: res.data.cached, provider: res.data.provider ?? res.provider };
}
