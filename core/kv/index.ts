import "server-only";
import { env } from "@/core/env";
import { FallbackKv } from "@/core/kv/fallback";
import { MongoKv } from "@/core/kv/mongo";
import type { KvStore } from "@/core/kv/types";
import { UpstashKv } from "@/core/kv/upstash";

export type { KvEvent, KvStore } from "@/core/kv/types";

let cached: KvStore | undefined;

/** Upstash Redis when UPSTASH_REDIS_REST_URL and _TOKEN are set (falling back to Mongo if it errors), otherwise Mongo. */
export function getKv(): KvStore {
  if (cached) return cached;
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  cached = url && token ? new FallbackKv(new UpstashKv(url, token), new MongoKv()) : new MongoKv();
  return cached;
}

/** For tests: forget the chosen store. */
export function resetKv(): void {
  cached = undefined;
}
