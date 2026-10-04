/** Service-level objectives for the Setup health panel. Pure: a snapshot of numbers in, a verdict per objective out. */

export type SloStatus = "ok" | "warn" | "bad" | "unknown";

export interface HealthSnapshot {
  /** p95 server time of the dashboard today, ms (null with no samples). */
  dashboardP95Ms: number | null;
  dashboardSamples: number;
  outboxLagMs: number;
  deadLetters: number;
  /** Free LLM providers that are configured, and how many of them are currently usable. */
  llmConfigured: number;
  llmAvailable: number;
  /** KV operations served by the fallback store since this instance started (Redis down). */
  kvFallbacks: number;
  kvStore: "mongo" | "upstash" | "memory";
  cacheHitRate: number | null;
  /** p95 of an AI call today, ms. */
  aiP95Ms: number | null;
}

export interface SloResult {
  id: string;
  label: string;
  value: string;
  target: string;
  status: SloStatus;
}

export const SLO_TARGETS = {
  dashboardP95Ms: { ok: 1500, warn: 3000 },
  outboxLagMs: { ok: 60_000, warn: 5 * 60_000 },
  deadLetters: { ok: 0, warn: 3 },
  aiP95Ms: { ok: 8000, warn: 16_000 },
  cacheHitRate: { ok: 0.5, warn: 0.2 },
} as const;

/** ok at or below `ok`, warn at or below `warn`, bad above. */
function band(value: number, t: { ok: number; warn: number }): SloStatus {
  return value <= t.ok ? "ok" : value <= t.warn ? "warn" : "bad";
}

const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)} s` : `${Math.round(v)} ms`);

export function evaluateSlo(s: HealthSnapshot): SloResult[] {
  const out: SloResult[] = [];
  out.push({
    id: "dashboard",
    label: "Dashboard p95",
    value: s.dashboardP95Ms === null ? "no data yet" : `${ms(s.dashboardP95Ms)} (${s.dashboardSamples} loads)`,
    target: `under ${ms(SLO_TARGETS.dashboardP95Ms.ok)}`,
    status: s.dashboardP95Ms === null ? "unknown" : band(s.dashboardP95Ms, SLO_TARGETS.dashboardP95Ms),
  });
  out.push({ id: "outbox-lag", label: "Outbox lag", value: ms(s.outboxLagMs), target: `under ${ms(SLO_TARGETS.outboxLagMs.ok)}`, status: band(s.outboxLagMs, SLO_TARGETS.outboxLagMs) });
  out.push({ id: "dead-letters", label: "Dead-lettered events", value: String(s.deadLetters), target: "none", status: band(s.deadLetters, SLO_TARGETS.deadLetters) });
  out.push({
    id: "llm",
    label: "LLM availability",
    value: s.llmConfigured === 0 ? "no provider configured" : `${s.llmAvailable} of ${s.llmConfigured} usable`,
    target: "at least one usable",
    status: s.llmConfigured === 0 ? "unknown" : s.llmAvailable === 0 ? "bad" : s.llmAvailable < s.llmConfigured ? "warn" : "ok",
  });
  out.push({
    id: "kv",
    label: "Key-value store",
    value: s.kvFallbacks === 0 ? `${s.kvStore}, no fallbacks` : `${s.kvStore}, ${s.kvFallbacks} fell back to MongoDB`,
    target: "no fallbacks",
    status: s.kvFallbacks === 0 ? "ok" : s.kvFallbacks < 10 ? "warn" : "bad",
  });
  out.push({
    id: "cache",
    label: "Cache hit rate",
    value: s.cacheHitRate === null ? "no lookups yet" : `${Math.round(s.cacheHitRate * 100)}%`,
    target: `over ${Math.round(SLO_TARGETS.cacheHitRate.ok * 100)}%`,
    status: s.cacheHitRate === null ? "unknown" : s.cacheHitRate >= SLO_TARGETS.cacheHitRate.ok ? "ok" : s.cacheHitRate >= SLO_TARGETS.cacheHitRate.warn ? "warn" : "bad",
  });
  out.push({
    id: "ai-latency",
    label: "AI call p95",
    value: s.aiP95Ms === null ? "no calls today" : ms(s.aiP95Ms),
    target: `under ${ms(SLO_TARGETS.aiP95Ms.ok)}`,
    status: s.aiP95Ms === null ? "unknown" : band(s.aiP95Ms, SLO_TARGETS.aiP95Ms),
  });
  return out;
}

/** The worst status across results, ignoring "unknown" unless that is all there is. */
export function overall(results: readonly SloResult[]): SloStatus {
  const known = results.filter((r) => r.status !== "unknown");
  if (known.length === 0) return "unknown";
  if (known.some((r) => r.status === "bad")) return "bad";
  return known.some((r) => r.status === "warn") ? "warn" : "ok";
}
