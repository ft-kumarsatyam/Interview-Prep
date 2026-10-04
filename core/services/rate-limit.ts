import { bucketFor, type BucketResult, type Limit } from "@/core/domain/rate-limit";
import { getKv } from "@/core/kv";

/** The limits for the expensive or outward-facing actions. Generous for one person, tight enough to stop a runaway loop or a stuck retry. */
export const LIMITS = {
  resumeParse: { max: 12, windowSec: 60 },
  resumeAi: { max: 12, windowSec: 3600 },
  jobRefresh: { max: 6, windowSec: 600 },
  addSource: { max: 15, windowSec: 3600 },
  capture: { max: 60, windowSec: 600 },
} satisfies Record<string, Limit>;

export type LimitName = keyof typeof LIMITS;

/** Takes one token from the named bucket. Fails open: the limiter protects, it must not block the app when its store is down. */
export async function takeToken(key: string, limit: Limit, cost = 1): Promise<BucketResult> {
  try {
    return await getKv().tokenBucket(`rl:${key}`, bucketFor(limit), cost);
  } catch {
    return { allowed: true, remaining: limit.max, retryAfterMs: 0 };
  }
}

const waitText = (ms: number) => {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  return sec < 90 ? `${sec} seconds` : `${Math.ceil(sec / 60)} minutes`;
};

/** null when allowed, otherwise a message saying how long to wait. */
export async function limited(name: LimitName): Promise<string | null> {
  const r = await takeToken(name, LIMITS[name]);
  return r.allowed ? null : `Too many requests. Try again in ${waitText(r.retryAfterMs)}`;
}
