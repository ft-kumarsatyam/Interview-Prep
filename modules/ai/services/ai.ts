import { connectDb } from "@/core/db";
import { LATENCY_BUCKETS, percentileMs } from "@/modules/ai/domain/ai-metrics";
import type { AiFeature, ProviderState } from "@/modules/ai/domain/llm-router";
import { budgetLevel, budgetNote, type BudgetLevel } from "@/modules/ai/domain/key-rotation";
import { env } from "@/core/env";
import { createChain } from "@/core/llm/chain";
import { AllProvidersFailedError, PaidConfirmRequiredError } from "@/core/llm/errors";
import { describeProviders, keyTokenBudget, resolveProviders } from "@/core/llm/providers";
import type { LlmProvider } from "@/core/llm/types";
import { mongoLlmStore } from "@/modules/ai/services/llm-store";
import { getSettings } from "@/modules/settings/services/settings";

/** The chain for an interactive feature, or null if no provider is configured at all. */
export async function getAiFor(feature: AiFeature, opts: { paidOnce?: boolean } = {}): Promise<LlmProvider | null> {
  const e = env();
  const defs = resolveProviders(e);
  if (defs.length === 0) return null;
  const settings = await getSettings();
  return createChain({ defs, store: mongoLlmStore(e.APP_TIMEZONE), feature, paid: settings.llmPaid, timeZone: e.APP_TIMEZONE, paidOnce: opts.paidOnce, keyBudget: keyTokenBudget(e) });
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
  const { AiUsage } = await import("@/core/models/ai");
  const { toLocalDate } = await import("@/core/domain/dates");
  await connectDb();
  const rows = await AiUsage.find({ date: toLocalDate(new Date(), env().APP_TIMEZONE) }).lean();
  return rows.map((r) => ({ provider: r.provider, feature: r.feature, calls: r.calls ?? 0, fails: r.fails ?? 0, cacheHits: r.cacheHits ?? 0 }));
}

export interface AiMetricsRow {
  provider: string;
  feature: string;
  calls: number;
  failovers: number;
  tokensIn: number;
  tokensOut: number;
  /** Bucketed (upper bound of the histogram bucket holding the percentile). */
  p50Ms: number | null;
  p95Ms: number | null;
  firstTokenP50Ms: number | null;
  avgMs: number | null;
}

/** Today's latency percentiles, token counts and failovers per provider and feature, for the health panel and OpenTelemetry. */
export async function aiMetricsToday(now = new Date()): Promise<AiMetricsRow[]> {
  const { AiUsage } = await import("@/core/models/ai");
  const { toLocalDate } = await import("@/core/domain/dates");
  await connectDb();
  const rows = await AiUsage.find({ date: toLocalDate(now, env().APP_TIMEZONE), provider: { $ne: "cache" } }).lean();
  return rows.map((r) => {
    const get = (k: string) => ((r as unknown as Record<string, number | undefined>)[k] ?? 0);
    const lat = Array.from({ length: LATENCY_BUCKETS }, (_, i) => get(`lat${i}`));
    const ttft = Array.from({ length: LATENCY_BUCKETS }, (_, i) => get(`ttft${i}`));
    return {
      provider: r.provider,
      feature: r.feature,
      calls: r.calls ?? 0,
      failovers: get("failovers"),
      tokensIn: get("tokensIn"),
      tokensOut: get("tokensOut"),
      p50Ms: percentileMs(lat, 0.5),
      p95Ms: percentileMs(lat, 0.95),
      firstTokenP50Ms: percentileMs(ttft, 0.5),
      avgMs: get("latCount") ? Math.round(get("latSumMs") / get("latCount")) : null,
    };
  });
}

export type ProviderHealth = "ok" | "cooldown" | "disabled";

/** One API key of a provider, identified only by its fingerprint. */
export interface KeyRow {
  fingerprint: string;
  index: number;
  health: ProviderHealth;
  tokens: number;
  budget: number;
  level: BudgetLevel;
  note: string | null;
}

export interface ProviderRow {
  id: string;
  label: string;
  paid: boolean;
  configured: boolean;
  missing: string[];
  /** Health from the chain's remembered state (ok while at least one key is usable). */
  health: ProviderHealth;
  note: string | null;
  /** Per-key health and token use, when the provider is configured. */
  keys?: KeyRow[];
}

const clock = (ms: number, timeZone: string) => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(ms));

function healthOf(st: ProviderState | undefined, nowMs: number): ProviderHealth {
  if (st?.status === "disabled") return "disabled";
  return st?.status === "cooldown" && st.untilMs > nowMs ? "cooldown" : "ok";
}

/** What the Settings panel shows per provider: configured or not, whether the chain is skipping it, and each key's token use. */
export async function providerRows(now = new Date()): Promise<ProviderRow[]> {
  const e = env();
  const store = mongoLlmStore(e.APP_TIMEZONE);
  const [states, tokens] = await Promise.all([store.loadStates(), store.keyTokens()]);
  const budget = keyTokenBudget(e);
  const defs = resolveProviders(e);
  const nowMs = now.getTime();
  return describeProviders(e).map((p) => {
    const slots = defs.filter((d) => (d.provider ?? d.id) === p.id);
    const keys: KeyRow[] = slots.map((d) => {
        const used = tokens[d.fingerprint ?? ""] ?? 0;
        const health = healthOf(states[d.id], nowMs);
        const level = budgetLevel(used, budget);
        const stateNote =
          health === "disabled"
            ? "Key rejected: fix or replace it, then run the test."
            : health === "cooldown"
              ? `Out of quota or rate limited until about ${clock(states[d.id]!.untilMs, e.APP_TIMEZONE)}.`
              : null;
        const note = budgetNote({ label: p.label, keyIndex: d.keyIndex ?? 0, keyCount: d.keyCount ?? 1, envVar: d.envVar ?? p.id, tokensUsed: used, budget }) ?? stateNote;
        return { fingerprint: d.fingerprint ?? "", index: d.keyIndex ?? 0, health, tokens: used, budget, level, note };
      });
    const usable = keys.filter((k) => k.health === "ok" && k.level !== "spent");
    const health: ProviderHealth = keys.length === 0 || usable.length > 0 ? "ok" : keys.every((k) => k.health === "disabled") ? "disabled" : "cooldown";
    const soonest = Math.min(...slots.map((d) => (healthOf(states[d.id], nowMs) === "cooldown" ? states[d.id]!.untilMs : Infinity)));
    const note =
      health === "disabled"
        ? "The key was rejected, so this provider is switched off. Fix the key, then run the test."
        : health === "cooldown"
          ? Number.isFinite(soonest)
            ? `Out of quota or rate limited: skipped until about ${clock(soonest, e.APP_TIMEZONE)}.`
            : "Every key is used up or rate limited. Add a new key."
          : (keys.find((k) => k.level !== "ok")?.note ?? null);
    return { id: p.id, label: p.label, paid: p.paid, configured: p.configured, missing: p.missing, health, note, ...(keys.length ? { keys } : {}) };
  });
}
