import { EVENT_MAX, type KvEvent, type KvStore } from "./types";

/** In-process KvStore for tests and as a reference for the contract. Time is injectable. */
export class MemoryKv implements KvStore {
  readonly name = "memory" as const;
  private data = new Map<string, { v: string; n: number; exp: number }>();
  private logs = new Map<string, { seq: number; items: KvEvent[] }>();
  constructor(private now: () => number = Date.now) {}

  private live(key: string) {
    const e = this.data.get(key);
    if (e && e.exp <= this.now()) {
      this.data.delete(key);
      return undefined;
    }
    return e;
  }
  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    this.data.set(key, { v: value, n: 0, exp: this.now() + ttlSec * 1000 });
  }
  async del(key: string) {
    this.data.delete(key);
  }
  async incr(key: string, ttlSec: number) {
    const e = this.live(key);
    if (e) return ++e.n;
    this.data.set(key, { v: "", n: 1, exp: this.now() + ttlSec * 1000 });
    return 1;
  }
  async setNx(key: string, token: string, ttlSec: number) {
    if (this.live(key)) return false;
    this.data.set(key, { v: token, n: 0, exp: this.now() + ttlSec * 1000 });
    return true;
  }
  async releaseIfOwner(key: string, token: string) {
    if (this.live(key)?.v !== token) return false;
    this.data.delete(key);
    return true;
  }
  async eventsAppend(channel: string, data: string) {
    const log = this.logs.get(channel) ?? this.logs.set(channel, { seq: 0, items: [] }).get(channel)!;
    const id = String(++log.seq);
    log.items.push({ id, data });
    if (log.items.length > EVENT_MAX) log.items.splice(0, log.items.length - EVENT_MAX);
    return id;
  }
  async eventsRead(channel: string, after: string, limit = 100) {
    if (!/^\d+$/.test(after)) return [];
    return (this.logs.get(channel)?.items ?? []).filter((e) => Number(e.id) > Number(after)).slice(0, limit);
  }
  async eventsLastId(channel: string) {
    return this.logs.get(channel)?.items.at(-1)?.id ?? null;
  }
}
