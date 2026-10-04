import "server-only";
import { decodeEvent, encodeEvent, LIVE_CHANNEL, type LiveEvent } from "@/lib/domain/live-events";
import { getKv } from "@/lib/kv";

/**
 * Tells every open tab that something changed. Best effort by design: a failed publish must never fail
 * the work that triggered it (a sync, a notification), and a tab that misses one simply shows the change
 * on its next refresh. Transport today is the KV event log read by server-sent events; a managed
 * WebSocket provider could be a second transport behind this same function.
 */
export async function publish(event: LiveEvent): Promise<void> {
  try {
    await getKv().eventsAppend(LIVE_CHANNEL, encodeEvent(event));
  } catch (err) {
    console.warn("[realtime] publish failed:", err instanceof Error ? err.message : err);
  }
}

export async function readLive(after: string, limit = 50): Promise<Array<{ id: string; event: LiveEvent }>> {
  const rows = await getKv().eventsRead(LIVE_CHANNEL, after, limit);
  return rows.flatMap((r) => {
    const event = decodeEvent(r.data);
    return event ? [{ id: r.id, event }] : [];
  });
}

export const liveLastId = () => getKv().eventsLastId(LIVE_CHANNEL);
