import { NextResponse } from "next/server";
import { bearerMatches } from "@/core/auth/webhook";
import { env } from "@/core/env";
import { takeToken } from "@/core/services/rate-limit";
import { ingestPushed } from "@/modules/jobs/services/job-ingest";

export const maxDuration = 30;

const MAX_BODY_BYTES = 1_500_000;
const LIMIT = { max: 60, windowSec: 600 };

/**
 * Inbound jobs webhook. `POST` `{ "jobs": [{ title, company, url, location?, remote?, description?, postedAt?, ... }] }`
 * with `Authorization: Bearer $JOBS_WEBHOOK_SECRET`. Up to 100 jobs a request; each is validated on its own. Use it from
 * n8n, Zapier, an Apify actor or a cron script. Sites that forbid automated reading are rejected item by item.
 */
export async function POST(req: Request) {
  const secret = env().JOBS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  if (!bearerMatches(req, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await takeToken("webhook-jobs", LIMIT);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) } });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "Body too large" }, { status: 413 });
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Body too large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const jobs = body && typeof body === "object" && "jobs" in body ? (body as { jobs: unknown }).jobs : Array.isArray(body) ? body : undefined;
  try {
    return NextResponse.json(await ingestPushed(jobs));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad request" }, { status: 400 });
  }
}
