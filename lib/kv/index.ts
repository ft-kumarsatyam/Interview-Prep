import "server-only";
import { env } from "@/lib/env";
import { FallbackKv } from "./fallback";
import { MongoKv } from "./mongo";
import type { KvStore } from "./types";
import { UpstashKv } from "./upstash";

export type { KvEvent, KvStore } from "./types";

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
