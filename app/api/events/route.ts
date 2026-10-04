import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/core/auth/session";
import { resumeId } from "@/core/domain/live-events";
import { getKv } from "@/core/kv";
import { liveStream } from "@/core/realtime/stream";

export const dynamic = "force-dynamic";
/** Hobby functions are capped at a minute, so a connection lives about 50 s and the browser reconnects with Last-Event-ID. */
export const maxDuration = 60;

const LIFETIME_MS = 50_000;
const HEARTBEAT_MS = 15_000;

export async function GET(req: Request) {
  // A plain 401 (not the login redirect) so EventSource stops instead of retrying against an HTML page.
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) return new Response("Unauthorized", { status: 401 });

  const kv = getKv();
  const after = resumeId(req.headers.get("last-event-id"), new URL(req.url).searchParams.get("after"));
  // Redis charges per command, so it is polled less often than MongoDB.
  const pollMs = kv.name === "upstash" ? 5000 : 3000;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of liveStream({ kv, after, lifetimeMs: LIFETIME_MS, pollMs, heartbeatMs: HEARTBEAT_MS, signal: req.signal })) controller.enqueue(encoder.encode(chunk));
      } finally {
        try {
          controller.close();
        } catch {
          // The client already went away.
        }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
