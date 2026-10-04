import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyQStashSignature } from "@/core/broker/qstash";
import { env } from "@/core/env";
import { markDead } from "@/core/events/relay";

/** QStash's failure callback: it gave up on a delivery after its retries, so the event is dead-lettered (replay from /setup). */
const callback = z.object({ sourceBody: z.string().optional(), status: z.number().optional(), body: z.string().optional() });
const ref = z.object({ eventId: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const e = env();
  if (!e.APP_URL) return NextResponse.json({ error: "Queue not configured" }, { status: 503 });
  const raw = await req.text();
  const ok = await verifyQStashSignature({
    signature: req.headers.get("upstash-signature"),
    body: raw,
    url: `${e.APP_URL.replace(/\/+$/, "")}/api/queue/failed`,
    keys: [e.QSTASH_CURRENT_SIGNING_KEY, e.QSTASH_NEXT_SIGNING_KEY],
  });
  if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  try {
    const cb = callback.parse(JSON.parse(raw));
    const { eventId } = ref.parse(JSON.parse(Buffer.from(cb.sourceBody ?? "", "base64").toString("utf8")));
    await markDead(eventId, `QStash gave up (HTTP ${cb.status ?? "?"})`);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
