import { connectDb } from "@/lib/db";
import { PAID_PROVIDER, type AiFeature } from "@/lib/domain/llm-router";
import { env } from "@/lib/env";
import { createChain } from "@/lib/llm/chain";
import { AllProvidersFailedError, PaidConfirmRequiredError } from "@/lib/llm/errors";
import { describeProviders, resolveProviders } from "@/lib/llm/providers";
import type { LlmProvider } from "@/lib/llm/types";
import { mongoLlmStore } from "./llm-store";
import { getSettings } from "./settings";

/** The chain for an interactive feature, or null if no provider is configured at all. */
export async function getAiFor(feature: AiFeature, opts: { paidOnce?: boolean } = {}): Promise<LlmProvider | null> {
  const e = env();
  const defs = resolveProviders(e);
  if (defs.length === 0) return null;
  const settings = await getSettings();
  return createChain({ defs, store: mongoLlmStore(e.APP_TIMEZONE), feature, paid: settings.llmPaid, timeZone: e.APP_TIMEZONE, paidOnce: opts.paidOnce });
}

export type AiResult<T> =
  | { ok: true; data: T; provider?: string }
  | { ok: false; error: string; unavailable?: true; needsPaid?: { used: number; cap: number } };

/**
 * Run an AI task and turn every way it can go wrong into a plain result a Server
 * Action can return: no provider configured, free providers exhausted (with the
 * paid fallback waiting for your confirmation), or a plain failure.
 */
export async function runAi<T>(feature: AiFeature, opts: { paidOnce?: boolean }, task: (llm: LlmProvider) => Promise<T>): Promise<AiResult<T>> {
  const llm = await getAiFor(feature, opts);
  if (!llm) return { ok: false, unavailable: true, error: "No AI provider is configured. Add a key in your environment (see Setup)." };
  try {
    const data = await task(llm);
    return { ok: true, data, provider: llm.lastProvider };
  } catch (err) {
    if (err instanceof PaidConfirmRequiredError) return { ok: false, error: err.message, needsPaid: { used: err.used, cap: err.cap } };
    if (err instanceof AllProvidersFailedError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "The AI request failed" };
  }
}

/** "Allow the paid fallback for the rest of today." */
export async function approvePaidToday(): Promise<void> {
  await connectDb();
  await mongoLlmStore(env().APP_TIMEZONE).approvePaidToday();
}

export interface UsageRow {
  provider: string;
  feature: string;
  calls: number;
  fails: number;
  cacheHits: number;
}

/** Today's per-provider usage, for the Settings panel. */
export async function usageToday(): Promise<UsageRow[]> {
  const { AiUsage } = await import("@/lib/models/ai");
  const { toLocalDate } = await import("@/lib/domain/dates");
  await connectDb();
  const rows = await AiUsage.find({ date: toLocalDate(new Date(), env().APP_TIMEZONE) }).lean();
  return rows.map((r) => ({ provider: r.provider, feature: r.feature, calls: r.calls ?? 0, fails: r.fails ?? 0, cacheHits: r.cacheHits ?? 0 }));
}

export interface ProviderRow {
  id: string;
  label: string;
  paid: boolean;
  configured: boolean;
  missing: string[];
  /** Health from the chain's remembered state. */
  health: "ok" | "cooldown" | "disabled";
  note: string | null;
}

const clock = (ms: number, timeZone: string) => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(ms));

/** What the Settings panel shows per provider: configured or not, and whether the chain is currently skipping it. */
export async function providerRows(now = new Date()): Promise<ProviderRow[]> {
  const e = env();
  const states = await mongoLlmStore(e.APP_TIMEZONE).loadStates();
  return describeProviders(e).map((p) => {
    const st = states[p.id];
    const cooling = st?.status === "cooldown" && st.untilMs > now.getTime();
    const disabled = st?.status === "disabled";
    return {
      id: p.id,
      label: p.label,
      paid: p.id === PAID_PROVIDER,
      configured: p.configured,
      missing: p.missing,
      health: disabled ? "disabled" : cooling ? "cooldown" : "ok",
      note: disabled
        ? "The key was rejected, so this provider is switched off. Fix the key, then run the test."
        : cooling
          ? `Out of quota or rate limited: skipped until about ${clock(st!.untilMs, e.APP_TIMEZONE)}.`
          : null,
    };
  });
}
