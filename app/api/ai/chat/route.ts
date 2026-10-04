import { requireSession } from "@/core/auth/dal";
import { takeToken } from "@/core/services/rate-limit";
import { chatRequestSchema } from "@/modules/chat/domain/chat-events";
import { runTurn } from "@/modules/chat/services/chat";

export const maxDuration = 60;

const LIMIT = { max: 30, windowSec: 600 };

/**
 * Streams one assistant turn as newline-delimited JSON events: `thread`, `tools`, then `token`s, then `done`
 * (or `error`). Needs a session; validated with zod; rate limited with the token bucket. Message text is never logged.
 */
export async function POST(req: Request) {
  await requireSession();
  const body: unknown = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Type a message" }, { status: 400 });
  const limit = await takeToken("chat", LIMIT);
  if (!limit.allowed) return Response.json({ error: "Too many messages. Try again in a few minutes." }, { status: 429, headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runTurn(parsed.data)) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } catch {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: "Something went wrong. Try again." })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
