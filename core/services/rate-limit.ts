import { checkLimit, type Limit } from "@/core/domain/rate-limit";
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

/** null when allowed, otherwise a message saying how long to wait. If the limiter itself fails, the action is allowed (it protects, it must not block). */
export async function limited(name: LimitName): Promise<string | null> {
  try {
    const kv = getKv();
    const r = await checkLimit((k, ttl) => kv.incr(k, ttl), name, LIMITS[name]);
    if (r.ok) return null;
    return `Too many requests. Try again in ${r.retryAfterSec < 90 ? `${r.retryAfterSec} seconds` : `${Math.ceil(r.retryAfterSec / 60)} minutes`}`;
  } catch {
    return null;
  }
}
