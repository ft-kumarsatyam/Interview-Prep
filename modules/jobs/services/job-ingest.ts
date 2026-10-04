import { bumpVersion } from "@/core/cache";
import { connectDb } from "@/core/db";
import { JobSource } from "@/core/models/job-postings";
import { publish } from "@/core/realtime";
import { parsePushedBatch } from "@/modules/jobs/domain/job-push";
import { storePostings, trimPostings } from "@/modules/jobs/services/job-sync";

export const WEBHOOK_SOURCE_ID = "webhook";

export interface IngestResult {
  accepted: number;
  added: number;
  rejected: number;
}

/**
 * Takes jobs pushed from outside (the webhook: n8n, Zapier, Apify, a script). Each item is validated on its own; good
 * ones are stored like any other posting and show up in Discover, scored against your resume and syllabus. Pushed
 * jobs are only ever added, never closed by absence. Safe to send the same batch twice.
 */
export async function ingestPushed(raw: unknown, now = new Date()): Promise<IngestResult> {
  const { postings, rejected } = parsePushedBatch(raw, "webhook", WEBHOOK_SOURCE_ID);
  if (postings.length === 0) return { accepted: 0, added: 0, rejected };
  await connectDb();
  await JobSource.updateOne(
    { _id: WEBHOOK_SOURCE_ID },
    { $set: { name: "Webhook", kind: "push", ats: "webhook", slug: "", lastTriedAt: now, lastOkAt: now, lastCount: postings.length, lastError: "" }, $setOnInsert: { custom: false, enabled: true, tier: "" } },
    { upsert: true },
  );
  const { added } = await storePostings({ _id: WEBHOOK_SOURCE_ID, tier: "", companyId: null }, postings, now, { closeMissing: false });
  await trimPostings();
  await bumpVersion("jobs");
  if (added > 0) await publish({ type: "jobs.new", count: added });
  return { accepted: postings.length, added, rejected };
}
