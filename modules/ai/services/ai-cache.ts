import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import { connectDb } from "@/core/db";
import type { AiFeature } from "@/modules/ai/domain/llm-router";
import { AiCache, AiUsage } from "@/core/models/ai";
import { toLocalDate } from "@/core/domain/dates";
import { usageId } from "@/modules/ai/services/llm-store";

export const MAX_CACHED_BYTES = 8 * 1024;
const DAY_MS = 86_400_000;

export interface CacheOptions<T> {
  feature: AiFeature;
  /** Bump when the prompt or output shape changes so old answers stop matching. */
  version: string;
  input: string;
  ttlDays: number;
  /** Re-validated on every read: an answer cached under an older shape is ignored. */
  schema: ZodType<T>;
  timeZone?: string;
  now?: () => Date;
}

/** Stable key: whitespace-collapsed input, so a reformatted question still hits. */
export function cacheKey(feature: AiFeature, version: string, input: string): string {
  const normalised = input.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(`${feature}\u0000${version}\u0000${normalised}`).digest("hex");
}

/** A validated cached answer, or null. Counts the hit in today's usage. */
export async function getCachedAi<T>(opts: CacheOptions<T>): Promise<{ value: T; provider?: string } | null> {
  await connectDb();
  const now = opts.now?.() ?? new Date();
  const key = cacheKey(opts.feature, opts.version, opts.input);
  const hit = await AiCache.findOne({ _id: key, expiresAt: { $gt: now } }).lean();
  if (!hit) return null;
  const parsed = opts.schema.safeParse(hit.output);
  if (!parsed.success) return null;
  await AiCache.updateOne({ _id: key }, { $inc: { hits: 1 } });
  const date = toLocalDate(now, opts.timeZone ?? "UTC");
  await AiUsage.updateOne(
    { _id: usageId(date, "cache", opts.feature) },
    { $inc: { cacheHits: 1 }, $setOnInsert: { date, provider: "cache", feature: opts.feature, expiresAt: new Date(now.getTime() + 90 * DAY_MS) } },
    { upsert: true },
  );
  return { value: parsed.data, provider: hit.provider ?? undefined };
}

/** Stores a validated answer (up to 8 KB). Returns the validated value. */
export async function putCachedAi<T>(opts: CacheOptions<T>, value: T, provider?: string): Promise<T> {
  await connectDb();
  const now = opts.now?.() ?? new Date();
  const key = cacheKey(opts.feature, opts.version, opts.input);
  const validated = opts.schema.parse(value);
  if (Buffer.byteLength(JSON.stringify(validated)) <= MAX_CACHED_BYTES) {
    await AiCache.updateOne(
      { _id: key },
      { $set: { feature: opts.feature, provider: provider ?? null, output: validated, expiresAt: new Date(now.getTime() + opts.ttlDays * DAY_MS) }, $setOnInsert: { hits: 0 } },
      { upsert: true },
    );
  }
  return validated;
}

/**
 * Serve a validated AI answer from Mongo when we have one, else compute and store it.
 * Failures are never cached and neither are prompts; only the validated output is, up to 8 KB.
 */
export async function cachedAi<T>(
  opts: CacheOptions<T>,
  compute: () => Promise<{ value: T; provider?: string }>,
): Promise<{ value: T; cached: boolean; provider?: string }> {
  const hit = await getCachedAi(opts);
  if (hit) return { value: hit.value, cached: true, provider: hit.provider };
  const { value, provider } = await compute();
  return { value: await putCachedAi(opts, value, provider), cached: false, provider };
}
