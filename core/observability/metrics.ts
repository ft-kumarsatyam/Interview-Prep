import { metrics } from "@opentelemetry/api";
import type { UsageDelta } from "@/core/llm/store";

/**
 * OpenTelemetry instruments. They are no-ops until a MeterProvider is registered (instrumentation.ts does that only
 * when an OTLP endpoint is configured), so calling them is always safe. Attribute values are low-cardinality ids.
 */
const meter = () => metrics.getMeter("prepos");

const instruments = () => {
  const m = meter();
  return {
    aiDuration: m.createHistogram("prepos.ai.call.duration", { unit: "ms", description: "Wall time of one LLM provider call" }),
    aiFirstToken: m.createHistogram("prepos.ai.first_token.duration", { unit: "ms", description: "Time to the first streamed token" }),
    aiTokens: m.createCounter("prepos.ai.tokens", { description: "Estimated tokens in and out" }),
    aiCalls: m.createCounter("prepos.ai.calls", { description: "LLM calls by outcome" }),
    aiFailovers: m.createCounter("prepos.ai.failovers", { description: "Calls that succeeded only after another provider failed" }),
    aiCache: m.createCounter("prepos.ai.cache_hits", { description: "AI answers served from the cache" }),
    delivery: m.createCounter("prepos.outbox.delivery", { description: "Event deliveries by outcome" }),
    cache: m.createCounter("prepos.cache.lookup", { description: "Read-through cache lookups by result" }),
    request: m.createHistogram("prepos.request.duration", { unit: "ms", description: "Server time of a page" }),
  };
};

let cached: ReturnType<typeof instruments> | undefined;
const i = () => (cached ??= instruments());

/** Called from the LLM store for every recorded call, so traces, metrics and the Mongo counters agree. */
export function recordAiUsage(d: UsageDelta): void {
  const a = { provider: d.provider, feature: d.feature };
  if (d.cacheHits) i().aiCache.add(d.cacheHits, a);
  if (!d.calls) return;
  i().aiCalls.add(d.calls, { ...a, outcome: d.fails ? "failed" : "ok" });
  if (d.latencyMs !== undefined) i().aiDuration.record(d.latencyMs, a);
  if (d.firstTokenMs !== undefined) i().aiFirstToken.record(d.firstTokenMs, a);
  if (d.tokensIn) i().aiTokens.add(d.tokensIn, { ...a, direction: "in" });
  if (d.tokensOut) i().aiTokens.add(d.tokensOut, { ...a, direction: "out" });
  if (d.failover) i().aiFailovers.add(1, a);
}

export function recordDelivery(type: string, outcome: "done" | "published" | "retried" | "dead"): void {
  i().delivery.add(1, { type, outcome });
}

export function recordCacheLookup(scope: string, result: "hit" | "stale" | "miss" | "coalesced"): void {
  i().cache.add(1, { scope, result });
}

export function recordRequestDuration(route: string, ms: number): void {
  i().request.record(ms, { route });
}
