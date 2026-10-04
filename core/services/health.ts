import { connectDb } from "@/core/db";
import type { HealthSnapshot } from "@/core/domain/slo";

export type DbHealth = { ok: true; ms: number } | { ok: false; error: string };

/** A real round trip to MongoDB (not a document count), with its own deadline so a dead host can't hang the page. */
export async function pingDb(timeoutMs = 3000): Promise<DbHealth> {
  const started = Date.now();
  try {
    const work = connectDb().then(async (m) => {
      const db = m.connection.db;
      if (!db) throw new Error("No database handle");
      await db.admin().ping();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timed out")), timeoutMs);
    });
    await Promise.race([work, deadline]).finally(() => clearTimeout(timer));
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/* ------------------------------------------ SLO snapshot ------------------------------------------ */

/** Everything the Setup health panel shows, gathered from the metrics the app already keeps. */
export async function getHealthSnapshot(now = new Date()): Promise<HealthSnapshot> {
  const { env } = await import("@/core/env");
  const { getKv } = await import("@/core/kv");
  const { FallbackKv } = await import("@/core/kv/fallback");
  const { cacheStats } = await import("@/core/cache");
  const { outboxStats } = await import("@/core/events/relay");
  const { latencyToday } = await import("@/core/observability/latency");
  const { aiMetricsToday, providerRows } = await import("@/modules/ai/services/ai");
  const { cacheHitRate } = await import("@/modules/ai/domain/ai-metrics");
  const timeZone = env().APP_TIMEZONE;

  const [dashboard, outbox, ai, providers] = await Promise.all([latencyToday("dashboard", { timeZone, now }), outboxStats(now), aiMetricsToday(now), providerRows(now)]);
  const kv = getKv();
  const free = providers.filter((p) => !p.paid && p.configured);
  const c = cacheStats();
  // The AI p95 across providers: the slowest provider's p95 is the one a user can hit.
  const aiP95 = ai.map((r) => r.p95Ms).filter((v): v is number => v !== null);
  return {
    dashboardP95Ms: dashboard.p95Ms,
    dashboardSamples: dashboard.samples,
    outboxLagMs: outbox.lagMs,
    deadLetters: outbox.dead,
    llmConfigured: free.length,
    llmAvailable: free.filter((p) => p.health === "ok").length,
    kvFallbacks: kv instanceof FallbackKv ? kv.fallbacks : 0,
    kvStore: kv.name,
    cacheHitRate: cacheHitRate(c.hits + c.stale + c.coalesced, c.misses),
    aiP95Ms: aiP95.length ? Math.max(...aiP95) : null,
  };
}
