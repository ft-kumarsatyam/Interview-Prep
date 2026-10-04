/**
 * The one place PrepOS keeps short-lived shared state: locks, counters, small caches and a tiny event log.
 * Mongo is the default implementation; Upstash Redis is used instead when its env vars are set (an
 * owner-approved optional exception to "free tier only"). Callers never know which one they have.
 */
export interface KvEvent {
  /** Opaque, ordered per channel. Pass it back as `after` to read what came next. */
  id: string;
  data: string;
}

export interface KvStore {
  readonly name: "mongo" | "upstash" | "memory";
  get(key: string): Promise<string | null>;
  /** Stores a value that disappears after `ttlSec`. */
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Adds 1 and returns the new count. The TTL starts on the first increment and is not extended. */
  incr(key: string, ttlSec: number): Promise<number>;
  /** Takes a lock: true if you got it, false if someone else holds it. It frees itself after `ttlSec`. */
  setNx(key: string, token: string, ttlSec: number): Promise<boolean>;
  /** Frees a lock, but only if you still hold it (a slow job must not free the next holder's lock). */
  releaseIfOwner(key: string, token: string): Promise<boolean>;
  /** Appends to a channel's short log (kept about an hour, newest few hundred) and returns the event id. */
  eventsAppend(channel: string, data: string): Promise<string>;
  /** Events after `after`, oldest first. An unknown or malformed `after` yields nothing rather than a replay. */
  eventsRead(channel: string, after: string, limit?: number): Promise<KvEvent[]>;
  /** The newest event id, or null when the channel is empty. Lets a new subscriber start from "now". */
  eventsLastId(channel: string): Promise<string | null>;
}

/** The longest an event is kept and the most a channel holds. */
export const EVENT_TTL_SEC = 3600;
export const EVENT_MAX = 300;
