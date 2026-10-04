import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/core/auth/cron";
import { getBroker } from "@/core/broker";
import { enqueueEvent } from "@/core/events/outbox";
import { relayOne } from "@/core/events/relay";
import { ensureEventHandlers } from "@/core/services/event-handlers";

export const maxDuration = 60;

/**
 * One rotation of the job sync, as an event: this only publishes `JobSyncRequested` and delivers it now. With QStash
 * the work runs in the queue consumer; without it, right here. Either way a failure is retried from the outbox.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ensureEventHandlers();
  const { eventId } = await enqueueEvent("JobSyncRequested", {});
  const broker = getBroker();
  const outcome = await relayOne(eventId, { broker });
  return NextResponse.json({ queued: true, broker: broker.name, outcome });
}
