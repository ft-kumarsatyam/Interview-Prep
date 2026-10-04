import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/core/auth/cron";
import { getBroker } from "@/core/broker";
import { outboxStats, relayOutbox } from "@/core/events/relay";
import { ensureEventHandlers } from "@/core/services/event-handlers";

export const maxDuration = 60;

/** Delivers due outbox events (retries included). For the free scheduler when no long-lived worker is running. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ensureEventHandlers();
  const broker = getBroker();
  const relayed = await relayOutbox({ broker });
  return NextResponse.json({ broker: broker.name, ...relayed, stats: await outboxStats() });
}
