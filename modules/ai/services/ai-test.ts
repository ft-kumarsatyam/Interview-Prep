import { z } from "zod";
import { afterFailure, afterSuccess, INITIAL_STATE } from "@/modules/ai/domain/llm-router";
import { startOfNextLocalDayMs } from "@/core/domain/dates";
import { env } from "@/core/env";
import { LlmHttpError } from "@/core/llm/errors";
import { createLlm } from "@/core/llm/json-provider";
import { resolveProviders } from "@/core/llm/providers";
import { mongoLlmStore } from "@/modules/ai/services/llm-store";
import { getSettings } from "@/modules/settings/services/settings";

const probe = z.object({ question: z.string().min(5).max(300), answer: z.string().min(1).max(200) });
const PROMPT = 'Write one short interview question about JavaScript closures and its one-line answer. Reply with JSON only: {"question": "...", "answer": "..."}';

export interface ProviderTestResult {
  id: string;
  label: string;
  paid: boolean;
  ok: boolean;
  detail: string;
}

/**
 * Call each configured provider directly with a tiny prompt. A pass clears any
 * cooldown or "key rejected" mark, and a failure records the same state a real call
 * would, so the Setup page and the chain agree. The paid provider is skipped unless
 * asked for, because a test call costs a (small) amount and counts toward the daily cap.
 */
export async function testProviders(opts: { includePaid: boolean }): Promise<ProviderTestResult[]> {
  const e = env();
  const store = mongoLlmStore(e.APP_TIMEZONE);
  const states = await store.loadStates();
  const now = new Date();
  const results: ProviderTestResult[] = [];

  for (const def of resolveProviders(e)) {
    if (def.paid && !opts.includePaid) continue;
    const provider = def.provider ?? def.id;
    const label = (def.keyCount ?? 1) > 1 ? `${def.label} key ${(def.keyIndex ?? 0) + 1}` : def.label;
    const llm = createLlm(def.cfg);
    if (!llm) continue;
    if (def.paid) {
      const settings = await getSettings();
      if (!settings.llmPaid.enabled) {
        results.push({ id: def.id, label, paid: true, ok: false, detail: "Paid fallback is switched off in Settings." });
        continue;
      }
      if (!(await store.reservePaid(settings.llmPaid.dailyCap))) {
        results.push({ id: def.id, label, paid: true, ok: false, detail: "Daily paid-call cap reached." });
        continue;
      }
    }
    try {
      const res = await llm.generateJson(PROMPT, probe);
      await store.saveState(def.id, afterSuccess());
      await store.recordUsage({ provider, feature: "test", calls: 1 });
      results.push({ id: def.id, label, paid: def.paid, ok: true, detail: `replied: "${res.question.slice(0, 90)}"` });
    } catch (err) {
      if (def.paid) await store.releasePaid();
      const kind = err instanceof LlmHttpError ? err.kind : "invalid-output";
      const next = afterFailure(states[def.id] ?? INITIAL_STATE, { kind, retryAfterSec: err instanceof LlmHttpError ? err.retryAfterSec : undefined }, now.getTime(), startOfNextLocalDayMs(now, e.APP_TIMEZONE));
      await store.saveState(def.id, next);
      await store.recordUsage({ provider, feature: "test", calls: 1, fails: 1 });
      const modelEnv = provider === "nvidia" ? "NVIDIA_MODEL" : provider === "openrouter" ? "OPENROUTER_MODEL" : provider === "gemini" ? "GEMINI_MODEL" : provider === "groq" ? "GROQ_MODEL" : "the provider model setting";
      const hint = kind === "auth" ? " (the key was rejected: check it and the model name)" : kind === "quota-day" ? " (quota or prepaid credits used up)" : kind === "rate" ? " (rate limited, try again shortly)" : kind === "bad-request" ? ` (the model may be unavailable: set ${modelEnv})` : "";
      results.push({ id: def.id, label, paid: def.paid, ok: false, detail: `${err instanceof Error ? err.message.slice(0, 160) : "failed"}${hint}` });
    }
  }
  return results;
}
