/** Retry, backoff and dead-letter rules for event delivery. Pure, so the edge cases are testable. */

export interface RetryPolicy {
  /** Deliveries allowed before the event goes to the dead-letter queue. */
  maxAttempts: number;
  baseMs: number;
  capMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = { maxAttempts: 6, baseMs: 5_000, capMs: 30 * 60_000 };

/**
 * Exponential backoff with full jitter: a random wait in [0, min(cap, base * 2^(attempt-1))]. `attempt` is the
 * number of deliveries that have already failed (>= 1). `random` is injected (0 <= random < 1) so tests are exact.
 */
export function backoffMs(attempt: number, random: number, policy: RetryPolicy = DEFAULT_RETRY): number {
  const n = Math.max(1, Math.floor(attempt));
  const ceiling = Math.min(policy.capMs, policy.baseMs * 2 ** Math.min(n - 1, 30));
  return Math.floor(Math.min(Math.max(random, 0), 0.999999) * ceiling);
}

export type FailureOutcome = { status: "retry"; attempts: number; nextAttemptAt: Date } | { status: "dead"; attempts: number };

/** What to do after a failed delivery: retry later with jitter, or dead-letter once attempts are used up. */
export function onFailure(attemptsBefore: number, now: Date, random: number, policy: RetryPolicy = DEFAULT_RETRY): FailureOutcome {
  const attempts = attemptsBefore + 1;
  if (attempts >= policy.maxAttempts) return { status: "dead", attempts };
  return { status: "retry", attempts, nextAttemptAt: new Date(now.getTime() + backoffMs(attempts, random, policy)) };
}

/** How long (ms) the oldest pending event has been waiting past its due time. 0 when nothing is pending. */
export function outboxLagMs(oldestDueAt: Date | null, now: Date): number {
  return oldestDueAt ? Math.max(0, now.getTime() - oldestDueAt.getTime()) : 0;
}
