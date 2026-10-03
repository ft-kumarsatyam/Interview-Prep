/** Pure retry/backoff rules shared by `lib/http.ts`. No I/O, no clocks, no randomness unless injected. */

export const IDEMPOTENT_METHODS: readonly string[] = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];
export const DEFAULT_BACKOFF_MS = 400;
/** Longest we will sleep because a server said Retry-After. */
export const RETRY_AFTER_CAP_MS = 5_000;
export const MAX_BACKOFF_MS = 8_000;

export function isIdempotentMethod(method: string): boolean {
  return IDEMPOTENT_METHODS.includes(method.toUpperCase());
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Parses a Retry-After header (delta-seconds or HTTP date) into milliseconds, or null. */
export function parseRetryAfterMs(value: string | null | undefined, nowMs: number): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 1000);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - nowMs);
}

/** Exponential backoff with full-ish jitter: base * 2^attempt scaled by 0.5..1.0. `random` is in [0,1). */
export function backoffDelayMs(attempt: number, baseMs: number, random: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(exp * (0.5 + 0.5 * Math.min(Math.max(random, 0), 0.999999)));
}

export type AttemptOutcome = { kind: "response"; status: number } | { kind: "error"; aborted: boolean };

/**
 * Whether to try again. `aborted` means the caller's own signal fired, which is never retried;
 * a per-attempt timeout is reported as a plain error.
 */
export function shouldRetry(input: {
  outcome: AttemptOutcome;
  attempt: number;
  retries: number;
  method: string;
  retryNonIdempotent?: boolean;
}): boolean {
  const { outcome, attempt, retries, method, retryNonIdempotent } = input;
  if (attempt >= retries) return false;
  if (!retryNonIdempotent && !isIdempotentMethod(method)) return false;
  if (outcome.kind === "error") return !outcome.aborted;
  return isRetryableStatus(outcome.status);
}

/** Delay before the next attempt: Retry-After (capped) wins over computed backoff. */
export function retryDelayMs(input: { attempt: number; baseMs: number; random: number; retryAfterMs: number | null }): number {
  if (input.retryAfterMs !== null) return Math.min(input.retryAfterMs, RETRY_AFTER_CAP_MS);
  return backoffDelayMs(input.attempt, input.baseMs, input.random);
}
