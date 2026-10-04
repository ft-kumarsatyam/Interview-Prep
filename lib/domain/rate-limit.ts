/**
 * Fixed-window rate limiting on top of a counter. The window number is part of the key, so a window ends
 * on its own and the count restarts at 1. Pure: the counter is passed in.
 */
export interface Limit {
  /** How many calls are allowed per window. */
  max: number;
  windowSec: number;
}

export type LimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSec: number };

export const windowKey = (name: string, nowMs: number, windowSec: number) => `rl:${name}:${Math.floor(nowMs / (windowSec * 1000))}`;

export async function checkLimit(incr: (key: string, ttlSec: number) => Promise<number>, name: string, limit: Limit, nowMs: number = Date.now()): Promise<LimitResult> {
  const count = await incr(windowKey(name, nowMs, limit.windowSec), limit.windowSec);
  if (count <= limit.max) return { ok: true, remaining: limit.max - count };
  const windowMs = limit.windowSec * 1000;
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (nowMs % windowMs)) / 1000)) };
}
