import { env } from "@/lib/env";
import { DEFAULT_PAID_SETTINGS } from "@/lib/domain/llm-router";
import { mongoLlmStore } from "@/lib/services/llm-store";
import { createChain } from "./chain";
import { resolveProviders } from "./providers";
import type { LlmProvider } from "./types";

export { createLlm, extractJson, jsonProvider } from "./json-provider";
export type { LlmConfig, LlmProvider } from "./types";

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
  return createChain({ defs, store: mongoLlmStore(e.APP_TIMEZONE), feature: "background", paid: DEFAULT_PAID_SETTINGS, timeZone: e.APP_TIMEZONE });
}
