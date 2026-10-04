import { connectDb } from "@/core/db";
import { runAsOwner } from "@/core/db/owner";
import { isEventType, parsePayload, type EventEnvelope, type EventType } from "@/core/events/schemas";
import { Inbox, Outbox } from "@/core/models/outbox";
import { logger } from "@/core/observability/log";
import { withSpan } from "@/core/observability/trace";

export type Handler = (event: EventEnvelope) => Promise<unknown>;

const handlers = new Map<EventType, Array<{ name: string; fn: Handler }>>();

/** Registers a consumer. `name` is its identity in the inbox, so renaming one makes it see old events as new. */
export function registerHandler<T extends EventType>(type: T, name: string, fn: (event: EventEnvelope<T>) => Promise<unknown>): void {
  const list = handlers.get(type) ?? [];
  if (list.some((h) => h.name === name)) return;
  list.push({ name, fn: fn as Handler });
  handlers.set(type, list);
}

/** For tests. */
export function clearHandlers(): void {
  handlers.clear();
}

export type DeliverResult =
  | { ok: true; duplicate: boolean; results: Record<string, unknown> }
  | { ok: false; permanent: boolean; error: string };

const isDuplicate = (err: unknown) => (err as { code?: number }).code === 11000;
const short = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/**
 * Runs every handler registered for the event, once each. A handler first writes `(eventId, handler)` to the inbox
 * (unique), so a redelivery skips handlers that already ran. If a handler throws, its inbox row is removed so the
 * retry runs it again, while handlers that succeeded stay done.
 */
export async function deliverEvent(eventId: string): Promise<DeliverResult> {
  return withSpan("event.deliver", { "event.id": eventId }, async (span) => {
    const r = await deliverEventInner(eventId);
    span.setAttribute("event.outcome", r.ok ? (r.duplicate ? "duplicate" : "done") : r.permanent ? "permanent-failure" : "failed");
    if (!r.ok) logger({ eventId, module: "events" }).warn({ permanent: r.permanent, error: r.error }, "event handler failed");
    return r;
  });
}

async function deliverEventInner(eventId: string): Promise<DeliverResult> {
  await connectDb();
  const row = await Outbox.findOne({ eventId }).lean();
  if (!row) return { ok: false, permanent: true, error: "unknown event" };
  if (row.status === "done") return { ok: true, duplicate: true, results: {} };
  if (!isEventType(row.type)) return { ok: false, permanent: true, error: `unknown event type ${row.type}` };
  let payload: unknown;
  try {
    payload = parsePayload(row.type, row.payload);
  } catch (err) {
    return { ok: false, permanent: true, error: `invalid payload: ${short(err)}` };
  }
  const event: EventEnvelope = { eventId, type: row.type, ownerId: row.ownerId, occurredAt: row.occurredAt ?? new Date(), payload: payload as EventEnvelope["payload"] };

  const results: Record<string, unknown> = {};
  const errors: string[] = [];
  let permanent = true;
  let ran = 0;
  for (const h of handlers.get(row.type) ?? []) {
    try {
      await Inbox.create({ eventId, handler: h.name });
    } catch (err) {
      if (isDuplicate(err)) continue;
      throw err;
    }
    ran++;
    try {
      results[h.name] = await runAsOwner(row.ownerId, async () => await h.fn(event));
    } catch (err) {
      await Inbox.deleteOne({ eventId, handler: h.name });
      errors.push(`${h.name}: ${short(err)}`);
      if ((err as { permanent?: boolean }).permanent !== true) permanent = false;
    }
  }
  if (errors.length) return { ok: false, permanent, error: errors.join("; ") };
  await Outbox.updateOne({ eventId }, { $set: { status: "done", doneAt: new Date(), lastError: "", result: ran ? results : null } });
  return { ok: true, duplicate: ran === 0, results };
}
