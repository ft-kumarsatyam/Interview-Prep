/** Freshness and key rules for the read-through cache (core/cache). Pure, so the edge cases are testable. */

export interface CacheEntry<T> {
  v: T;
  /** ms epoch the value was computed. */
  at: number;
}

export type Freshness = "fresh" | "stale" | "expired";

/** fresh: serve. stale: serve now and refresh in the background. expired: nothing usable, compute. */
export function classify(entry: CacheEntry<unknown> | null, now: number, ttlSec: number, staleSec: number): Freshness {
  if (!entry) return "expired";
  const age = now - entry.at;
  if (age < 0) return "expired"; // written "in the future": clock skew between instances, do not trust it
  if (age < ttlSec * 1000) return "fresh";
  return age < (ttlSec + staleSec) * 1000 ? "stale" : "expired";
}

/** Key for a scope's version counter. Bumping it makes every entry of that scope unreachable at once, with no key scan. */
export const versionKey = (ownerId: string, scope: string) => `v:${ownerId}:${scope}`;

export const entryKey = (ownerId: string, scope: string, version: string, name: string) => `c:${ownerId}:${scope}:${version}:${name}`;

export const lockKey = (entry: string) => `lock:${entry}`;

/** A stable name for a parameter object: key order and undefined/empty values do not matter. */
export function stableName(params: Record<string, unknown>): string {
  const keep = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return keep.length ? keep.map(([k, v]) => `${k}=${String(v)}`).join("&") : "all";
}

export function parseEntry<T>(raw: string | null): CacheEntry<T> | null {
  if (!raw) return null;
  try {
    const e = JSON.parse(raw) as Partial<CacheEntry<T>>;
    return typeof e.at === "number" && "v" in e ? (e as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}
