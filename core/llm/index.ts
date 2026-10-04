import { env } from "@/core/env";
import { DEFAULT_PAID_SETTINGS } from "@/modules/ai/domain/llm-router";
import { mongoLlmStore } from "@/modules/ai/services/llm-store";
import { createChain } from "@/core/llm/chain";
import { keyTokenBudget, resolveProviders } from "@/core/llm/providers";
import type { LlmProvider } from "@/core/llm/types";

export { createLlm, jsonProvider } from "@/core/llm/json-provider";
export type { LlmConfig, LlmProvider } from "@/core/llm/types";

/**
 * The provider for background work (daily quiz, practice top-up): every configured FREE
 * provider in order, with failover and remembered cooldowns, or null when none is set so
 * callers fall back to the question bank. Background work never uses the paid provider.
 * Interactive features use getAiFor() in lib/services/ai.ts instead.
 */
export function getLlm(): LlmProvider | null {
  const e = env();
  const defs = resolveProviders(e).filter((d) => !d.paid);
  if (defs.length === 0) return null;
  return createChain({ defs, store: mongoLlmStore(e.APP_TIMEZONE), feature: "background", paid: DEFAULT_PAID_SETTINGS, timeZone: e.APP_TIMEZONE, keyBudget: keyTokenBudget(e) });
}
