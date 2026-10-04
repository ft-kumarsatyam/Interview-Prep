/**
 * Token-bucket rate limiting. A bucket holds up to `burst` tokens and refills continuously at `ratePerSec`; each call
 * takes `cost` tokens. Unlike a fixed window it has no boundary spike (2x the limit across a window edge) and it says
 * exactly how long until the next call is allowed. Pure: the stores (core/kv) keep `{ tokens, at }` and call `take`.
 */
export interface Limit {
  /** Calls allowed in a burst, and per `windowSec` on average. */
  max: number;
  windowSec: number;
}

export interface BucketConfig {
  ratePerSec: number;
  burst: number;
}

export interface BucketState {
  tokens: number;
  /** ms epoch of the last update. */
  at: number;
}

export type BucketResult = { allowed: true; remaining: number; retryAfterMs: 0 } | { allowed: false; remaining: number; retryAfterMs: number };

/** A limit of `max` per `windowSec` as a bucket: burst `max`, refilling `max / windowSec` per second. */
export function bucketFor(limit: Limit): BucketConfig {
  return { ratePerSec: limit.max / limit.windowSec, burst: limit.max };
}

/** How long a bucket that was just used stays worth remembering: until it would be full again. */
export function bucketTtlSec(cfg: BucketConfig): number {
  return Math.max(1, Math.ceil(cfg.burst / cfg.ratePerSec) + 1);
}

/** Tokens at `now`, given the stored state (null = a bucket nobody has touched, which starts full). */
export function refill(state: BucketState | null, now: number, cfg: BucketConfig): BucketState {
  if (!state) return { tokens: cfg.burst, at: now };
  // A clock that moved backwards must not mint negative time (or tokens).
  const elapsedSec = Math.max(0, now - state.at) / 1000;
  return { tokens: Math.min(cfg.burst, state.tokens + elapsedSec * cfg.ratePerSec), at: Math.max(now, state.at) };
}

/** Takes `cost` tokens if the bucket has them. A cost above `burst` can never succeed. */
export function take(state: BucketState | null, now: number, cfg: BucketConfig, cost = 1): { state: BucketState; result: BucketResult } {
  const filled = refill(state, now, cfg);
  if (cost <= filled.tokens) {
    const next = { tokens: filled.tokens - cost, at: filled.at };
    return { state: next, result: { allowed: true, remaining: Math.floor(next.tokens), retryAfterMs: 0 } };
  }
  const retryAfterMs = cost > cfg.burst ? Number.POSITIVE_INFINITY : Math.ceil(((cost - filled.tokens) / cfg.ratePerSec) * 1000);
  return { state: filled, result: { allowed: false, remaining: Math.floor(filled.tokens), retryAfterMs } };
}
