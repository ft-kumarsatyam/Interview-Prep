import {
  DEFAULT_BACKOFF_MS,
  parseRetryAfterMs,
  retryDelayMs,
  shouldRetry,
  type AttemptOutcome,
} from "@/core/domain/http-policy";

export interface FetchPolicy {
  /** Per-attempt timeout. */
  timeoutMs: number;
  /** Extra attempts after the first (default 1). */
  retries?: number;
  backoffMs?: number;
  /** Caller cancellation; combined with the per-attempt timeout and never retried. */
  signal?: AbortSignal;
  headers?: HeadersInit;
  method?: string;
  body?: BodyInit | null;
  /** Allow retrying POST and friends (only for requests known to be safe to repeat). */
  retryNonIdempotent?: boolean;
  redirect?: RequestRedirect;
  cache?: RequestCache;
  /** Extra statuses to retry on, in addition to 429 and 5xx. */
  retryOn?: readonly number[];
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

/** fetch with a per-attempt timeout, bounded retries on transient failures and Retry-After support. */
export async function fetchWithPolicy(url: string | URL, policy: FetchPolicy): Promise<Response> {
  const retries = policy.retries ?? 1;
  const method = (policy.method ?? "GET").toUpperCase();
  const baseMs = policy.backoffMs ?? DEFAULT_BACKOFF_MS;
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(policy.timeoutMs);
    const signal = policy.signal ? AbortSignal.any([timeout, policy.signal]) : timeout;
    let outcome: AttemptOutcome;
    let res: Response | undefined;
    let error: unknown;
    try {
      res = await fetch(url, {
        method,
        signal,
        ...(policy.headers ? { headers: policy.headers } : {}),
        ...(policy.body !== undefined ? { body: policy.body } : {}),
        ...(policy.redirect ? { redirect: policy.redirect } : {}),
        ...(policy.cache ? { cache: policy.cache } : {}),
      });
      outcome = { kind: "response", status: res.status };
    } catch (err) {
      error = err;
      outcome = { kind: "error", aborted: policy.signal?.aborted === true };
    }
    const extra = res && policy.retryOn?.includes(res.status);
    const retry =
      shouldRetry({ outcome, attempt, retries, method, retryNonIdempotent: policy.retryNonIdempotent }) ||
      (!!extra && attempt < retries && (policy.retryNonIdempotent || method === "GET" || method === "HEAD"));
    if (!retry) {
      if (res) return res;
      throw error;
    }
    const retryAfterMs = res ? parseRetryAfterMs(res.headers.get("retry-after"), Date.now()) : null;
    await res?.body?.cancel().catch(() => undefined);
    await sleep(retryDelayMs({ attempt, baseMs, random: Math.random(), retryAfterMs }), policy.signal);
  }
}

/** Runs at most `n` tasks at a time; each call returns the task's own result. */
export function pLimit(n: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        task().then(resolve, reject).finally(next);
      };
      if (active < n) run();
      else queue.push(run);
    });
}
