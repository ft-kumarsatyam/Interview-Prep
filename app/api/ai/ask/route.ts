import { requireSession } from "@/core/auth/dal";
import { takeToken } from "@/core/services/rate-limit";
import { questionSchema } from "@/modules/ai/domain/ask-events";
import { askNotes } from "@/modules/ai/services/ask";

export const maxDuration = 60;

const LIMIT = { max: 20, windowSec: 600 };

/**
 * Streams a grounded answer as newline-delimited JSON events: `sources`, then `token`s, then `done` (or `error`).
 * Needs a session; rate limited with the token bucket.
 */
export async function POST(req: Request) {
  await requireSession();
  const body = (await req.json().catch(() => null)) as { question?: unknown } | null;
  const q = questionSchema.safeParse(body?.question);
  if (!q.success) return Response.json({ error: q.error.issues[0]?.message ?? "Ask a question" }, { status: 400 });
  const limit = await takeToken("ask", LIMIT);
  if (!limit.allowed) return Response.json({ error: "Too many questions. Try again in a few minutes." }, { status: 429, headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of askNotes(q.data)) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } catch {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: "Something went wrong. Try again." })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
