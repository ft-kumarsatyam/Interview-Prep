/** Latency histogram and token estimates for the AI usage counters. Pure. */

/** Upper bounds (ms) of each bucket; the last bucket is everything above the final bound. */
export const LATENCY_BOUNDS_MS = [250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const LATENCY_BUCKETS = LATENCY_BOUNDS_MS.length + 1;

export function latencyBucket(ms: number): number {
  const i = LATENCY_BOUNDS_MS.findIndex((b) => ms < b);
  return i === -1 ? LATENCY_BOUNDS_MS.length : i;
}

/**
 * The p-th percentile (0 < p <= 1) from histogram counts, as the upper bound of the bucket that holds it. Coarse by
 * design (it is a counter in a document, not a time series); the open last bucket reports twice the final bound.
 */
export function percentileMs(buckets: readonly number[], p: number): number | null {
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const target = Math.ceil(total * Math.min(Math.max(p, 0.0001), 1));
  let seen = 0;
  for (let i = 0; i < buckets.length; i++) {
    seen += buckets[i] ?? 0;
    if (seen >= target) return i < LATENCY_BOUNDS_MS.length ? LATENCY_BOUNDS_MS[i]! : LATENCY_BOUNDS_MS[LATENCY_BOUNDS_MS.length - 1]! * 2;
  }
  return null;
}

/** Providers differ in what they report, so tokens are estimated at ~4 characters each unless a real count is known. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/** Share of calls that were served from the cache. */
export const cacheHitRate = (hits: number, calls: number) => (hits + calls === 0 ? null : hits / (hits + calls));
