import { z } from "zod";
import { requireSession } from "@/core/auth/dal";
import { takeToken } from "@/core/services/rate-limit";
import { chatAboutJob } from "@/modules/jobs/services/job-chat";

export const maxDuration = 60;

const body = z.object({ target: z.object({ kind: z.enum(["posting", "job"]), id: z.string().regex(/^[a-f0-9]{24}$/i) }), question: z.unknown(), history: z.unknown().optional() });

/** Streams a coaching answer about one job as newline-delimited JSON events. Needs a session; token-bucket limited. */
export async function POST(req: Request) {
  await requireSession();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown job" }, { status: 400 });
  const limit = await takeToken("job-chat", { max: 30, windowSec: 600 });
  if (!limit.allowed) return Response.json({ error: "Too many questions. Try again in a few minutes." }, { status: 429, headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const e of chatAboutJob(parsed.data.target, parsed.data.question, parsed.data.history)) controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      } catch {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: "Something went wrong. Try again." })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
