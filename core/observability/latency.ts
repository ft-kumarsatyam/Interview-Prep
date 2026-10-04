import { connectDb } from "@/core/db";
import { toLocalDate } from "@/core/domain/dates";
import { LATENCY_BUCKETS, latencyBucket, percentileMs } from "@/modules/ai/domain/ai-metrics";
import { LatencyMetric } from "@/core/models/latency";
import { recordRequestDuration } from "@/core/observability/metrics";

const TTL_MS = 30 * 86_400_000;

/** Starts a stopwatch; call the result for elapsed ms. A function (not `performance.now()` inline) so server components stay pure. */
export function startTimer(): () => number {
  const t0 = performance.now();
  return () => performance.now() - t0;
}

/** Counts one server-side timing into today's histogram (and the OpenTelemetry histogram). Never throws. */
export async function recordLatency(name: string, ms: number, opts: { timeZone: string; now?: Date }): Promise<void> {
  try {
    recordRequestDuration(name, ms);
    await connectDb();
    const now = opts.now ?? new Date();
    const date = toLocalDate(now, opts.timeZone);
    await LatencyMetric.updateOne(
      { _id: `${date}|${name}` },
      { $inc: { count: 1, sumMs: Math.round(ms), [`b${latencyBucket(ms)}`]: 1 }, $setOnInsert: { date, name, expiresAt: new Date(now.getTime() + TTL_MS) } },
      { upsert: true },
    );
  } catch {
    // A metrics write must never break the page it measures.
  }
}

export interface LatencySummary {
  samples: number;
  p50Ms: number | null;
  p95Ms: number | null;
  avgMs: number | null;
}

/** Percentiles for one named operation on a local date. */
export async function latencyToday(name: string, opts: { timeZone: string; now?: Date }): Promise<LatencySummary> {
  await connectDb();
  const date = toLocalDate(opts.now ?? new Date(), opts.timeZone);
  const row = (await LatencyMetric.findById(`${date}|${name}`).lean()) as unknown as Record<string, number> | null;
  if (!row) return { samples: 0, p50Ms: null, p95Ms: null, avgMs: null };
  const buckets = Array.from({ length: LATENCY_BUCKETS }, (_, i) => row[`b${i}`] ?? 0);
  return { samples: row.count ?? 0, p50Ms: percentileMs(buckets, 0.5), p95Ms: percentileMs(buckets, 0.95), avgMs: row.count ? Math.round((row.sumMs ?? 0) / row.count) : null };
}
