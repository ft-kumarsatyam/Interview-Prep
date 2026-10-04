import { decodeEvent, LIVE_CHANNEL, sseComment, sseMessage, sseRetry } from "@/core/domain/live-events";
import type { KvStore } from "@/core/kv/types";

export interface StreamOptions {
  kv: KvStore;
  /** Resume after this event id; null starts from "now" (nothing from before the tab opened is replayed). */
  after: string | null;
  /** How long this connection lives. The browser then reconnects by itself, sending the last id it saw. */
  lifetimeMs: number;
  pollMs: number;
  heartbeatMs: number;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

/**
 * The text of one server-sent-events connection, as chunks. It polls the event log (a cheap read), sends a
 * heartbeat so proxies keep the connection open, and ends cleanly at its lifetime (serverless functions
 * can't stay open forever, and the browser reconnects automatically). A read failure is reported to the
 * page as a comment and retried, never thrown into a half-open response.
 */
export async function* liveStream(o: StreamOptions): AsyncGenerator<string> {
  const now = o.now ?? Date.now;
  const sleep = o.sleep ?? ((ms: number) => wait(ms, o.signal));
  const end = now() + o.lifetimeMs;
  yield sseRetry(3000);
  yield sseComment("connected");

  let cursor = o.after ?? (await o.kv.eventsLastId(LIVE_CHANNEL).catch(() => null)) ?? "0";
  let lastBeat = now();
  while (now() < end && !o.signal?.aborted) {
    try {
      for (const row of await o.kv.eventsRead(LIVE_CHANNEL, cursor, 50)) {
        cursor = row.id;
        const event = decodeEvent(row.data);
        if (event) yield sseMessage({ id: row.id, event: event.type, data: row.data });
        else yield sseMessage({ id: row.id, event: "skip", data: "{}" });
      }
    } catch {
      yield sseComment("read failed, retrying");
    }
    if (now() - lastBeat >= o.heartbeatMs) {
      lastBeat = now();
      yield sseComment("hb");
    }
    await sleep(Math.min(o.pollMs, Math.max(0, end - now())));
  }
}
