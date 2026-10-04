import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyQStashSignature } from "@/core/broker/qstash";
import { env } from "@/core/env";
import { deliverEvent } from "@/core/events/deliver";
import { markDead } from "@/core/events/relay";
import { connectDb } from "@/core/db";
import { Outbox } from "@/core/models/outbox";
import { ensureEventHandlers } from "@/core/services/event-handlers";

export const maxDuration = 60;

const body = z.object({ eventId: z.string().min(1).max(200) });

/**
 * QStash pushes here: authenticated by its signature (not a session), body is only `{ eventId }`. The payload is read
 * from the outbox, and delivery is idempotent, so a redelivery is harmless. A 5xx makes QStash retry with backoff.
 */
export async function POST(req: Request, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const e = env();
  if (!e.APP_URL || !(e.QSTASH_CURRENT_SIGNING_KEY || e.QSTASH_NEXT_SIGNING_KEY)) return NextResponse.json({ error: "Queue not configured" }, { status: 503 });
  const raw = await req.text();
  const ok = await verifyQStashSignature({
    signature: req.headers.get("upstash-signature"),
    body: raw,
    url: `${e.APP_URL.replace(/\/+$/, "")}/api/queue/${encodeURIComponent(topic)}`,
    keys: [e.QSTASH_CURRENT_SIGNING_KEY, e.QSTASH_NEXT_SIGNING_KEY],
  });
  if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  await connectDb();
  const row = await Outbox.findOne({ eventId: parsed.eventId }, { type: 1 }).lean();
  if (!row || row.type !== topic) return NextResponse.json({ error: "Unknown event" }, { status: 404 });

  ensureEventHandlers();
  const r = await deliverEvent(parsed.eventId);
  if (r.ok) return NextResponse.json({ ok: true, duplicate: r.duplicate });
  if (r.permanent) {
    await markDead(parsed.eventId, r.error);
    return NextResponse.json({ ok: false, dead: true }); // 200: retrying a malformed event can never help
  }
  await Outbox.updateOne({ eventId: parsed.eventId }, { $inc: { attempts: 1 }, $set: { lastError: r.error.slice(0, 300) } });
  return NextResponse.json({ ok: false }, { status: 500 });
}
