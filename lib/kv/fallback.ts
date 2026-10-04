import type { KvEvent, KvStore } from "./types";

/**
 * Wraps a primary store (Upstash) with a fallback (Mongo): if the primary throws, that one operation is
 * served by the fallback, so a Redis outage degrades to slower, not to broken. Locks taken on the fallback
 * only guard against other instances that also fell back, which is acceptable for short advisory locks.
 * Event ids differ between stores; a mismatched `after` simply yields nothing.
 */
export class FallbackKv implements KvStore {
  get name() {
    return this.primary.name;
  }
  /** How many operations had to use the fallback (shown in Setup). */
  fallbacks = 0;
  lastError: string | null = null;

  constructor(private readonly primary: KvStore, private readonly fallback: KvStore, private readonly log: (msg: string) => void = (m) => console.warn(m)) {}

  private async run<T>(op: (s: KvStore) => Promise<T>): Promise<T> {
    try {
      return await op(this.primary);
    } catch (err) {
      this.fallbacks++;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== this.lastError) this.log(`[kv] ${this.primary.name} failed, using ${this.fallback.name}: ${msg}`);
      this.lastError = msg;
      return op(this.fallback);
    }
  }

  get = (key: string) => this.run((s) => s.get(key));
  set = (key: string, value: string, ttlSec: number) => this.run((s) => s.set(key, value, ttlSec));
  del = (key: string) => this.run((s) => s.del(key));
  incr = (key: string, ttlSec: number) => this.run((s) => s.incr(key, ttlSec));
  setNx = (key: string, token: string, ttlSec: number) => this.run((s) => s.setNx(key, token, ttlSec));
  releaseIfOwner = (key: string, token: string) => this.run((s) => s.releaseIfOwner(key, token));
  eventsAppend = (channel: string, data: string) => this.run((s) => s.eventsAppend(channel, data));
  eventsRead = (channel: string, after: string, limit?: number): Promise<KvEvent[]> => this.run((s) => s.eventsRead(channel, after, limit));
  eventsLastId = (channel: string) => this.run((s) => s.eventsLastId(channel));
}
