import { randomUUID } from "node:crypto";
import { currentOwnerId } from "@/core/db/owner";
import { classify, entryKey, lockKey, parseEntry, versionKey, type CacheEntry } from "@/core/domain/cache";
import { getKv } from "@/core/kv";
import type { KvStore } from "@/core/kv/types";
import { recordCacheLookup } from "@/core/observability/metrics";

export interface ReadThroughOptions {
  /** Served as-is for this long. */
  ttlSec: number;
  /** After the ttl, serve the old value while one caller refreshes it. */
  staleSec?: number;
  /** How long a loser waits for the winner's value before computing it itself. */
  waitMs?: number;
  /** Test seams. */
  kv?: KvStore;
  now?: () => number;
  /** Runs a background refresh. On serverless pass Next's `after`; the default is fire-and-forget. */
  background?: (job: () => Promise<void>) => void;
}

export interface CacheStats {
  hits: number;
  stale: number;
  misses: number;
  /** Callers that waited for another caller's computation instead of repeating it. */
  coalesced: number;
  errors: number;
}

const stats: CacheStats = { hits: 0, stale: 0, misses: 0, coalesced: 0, errors: 0 };
export const cacheStats = (): Readonly<CacheStats> => ({ ...stats });
export function resetCacheStats(): void {
  Object.assign(stats, { hits: 0, stale: 0, misses: 0, coalesced: 0, errors: 0 });
}

const VERSION_TTL_SEC = 30 * 24 * 3600;
const LOCK_TTL_SEC = 20;
const POLL_MS = 40;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function versionOf(kv: KvStore, scope: string): Promise<string> {
  return (await kv.get(versionKey(currentOwnerId(), scope))) ?? "0";
}

/**
 * Invalidates every entry of a scope in one write: the version is part of each entry key, so old entries simply stop
 * being read and expire on their own. Called when the data behind a scope changes (never by scanning keys).
 */
export async function bumpVersion(scope: string, kv: KvStore = getKv()): Promise<void> {
  try {
    await kv.set(versionKey(currentOwnerId(), scope), `${Date.now()}-${randomUUID().slice(0, 6)}`, VERSION_TTL_SEC);
  } catch {
    // A failed bump only means entries live until their ttl; the write that caused it must not fail.
  }
}

/**
 * Read-through cache with versioned keys, single-flight and stale-while-revalidate. Values must be JSON-safe.
 * If the KV store fails, `compute` just runs: the cache is an optimisation and never a dependency.
 */
export async function readThrough<T>(scope: string, name: string, compute: () => Promise<T>, opts: ReadThroughOptions): Promise<T> {
  const kv = opts.kv ?? getKv();
  const now = opts.now ?? Date.now;
  const staleSec = opts.staleSec ?? 0;
  const owner = currentOwnerId();
  let key: string;
  try {
    key = entryKey(owner, scope, await versionOf(kv, scope), name);
    const entry = parseEntry<T>(await kv.get(key));
    const state = classify(entry, now(), opts.ttlSec, staleSec);
    if (entry && state === "fresh") {
      stats.hits++;
      recordCacheLookup(scope, "hit");
      return entry.v;
    }
    if (entry && state === "stale") {
      stats.stale++;
      recordCacheLookup(scope, "stale");
      const refresh = async () => void (await refreshEntry(kv, key, compute, now, opts.ttlSec + staleSec));
      (opts.background ?? ((job) => void job().catch(() => undefined)))(refresh);
      return entry.v;
    }
  } catch {
    stats.errors++;
    return compute();
  }

  stats.misses++;
  recordCacheLookup(scope, "miss");
  const token = randomUUID();
  let won = false;
  try {
    won = await kv.setNx(lockKey(key), token, LOCK_TTL_SEC);
  } catch {
    stats.errors++;
    return compute();
  }
  if (!won) {
    // Someone else is computing this exact entry: wait for it instead of repeating the work.
    const deadline = now() + (opts.waitMs ?? 2000);
    while (now() < deadline) {
      await sleep(POLL_MS);
      const entry = parseEntry<T>(await kv.get(key).catch(() => null));
      if (entry && classify(entry, now(), opts.ttlSec, staleSec) !== "expired") {
        stats.coalesced++;
        recordCacheLookup(scope, "coalesced");
        return entry.v;
      }
    }
    return compute(); // the winner is slow or died: do it ourselves
  }
  try {
    return await refreshEntry(kv, key, compute, now, opts.ttlSec + staleSec, false);
  } finally {
    await kv.releaseIfOwner(lockKey(key), token).catch(() => false);
  }
}

/** Computes and stores a value. The background variant takes the lock itself so only one refresh runs. */
async function refreshEntry<T>(kv: KvStore, key: string, compute: () => Promise<T>, now: () => number, storeSec: number, takeLock = true): Promise<T> {
  const token = randomUUID();
  if (takeLock && !(await kv.setNx(lockKey(key), token, LOCK_TTL_SEC))) return undefined as T; // another refresh is running
  try {
    const value = await compute();
    const entry: CacheEntry<T> = { v: value, at: now() };
    await kv.set(key, JSON.stringify(entry), Math.max(1, Math.ceil(storeSec)));
    return value;
  } finally {
    if (takeLock) await kv.releaseIfOwner(lockKey(key), token).catch(() => false);
  }
}
