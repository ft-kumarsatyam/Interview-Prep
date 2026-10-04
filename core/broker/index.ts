import "server-only";
import { FallbackBroker } from "@/core/broker/fallback";
import { MongoPollBroker } from "@/core/broker/mongo-poll";
import { QStashBroker } from "@/core/broker/qstash";
import type { Broker } from "@/core/broker/types";
import { env } from "@/core/env";

export type { Broker } from "@/core/broker/types";

let cached: Broker | undefined;

/** QStash (falling back to in-process delivery if it errors) when configured; otherwise the Mongo poller. */
export function getBroker(): Broker {
  if (cached) return cached;
  const e = env();
  const mongo = new MongoPollBroker();
  cached =
    e.QSTASH_TOKEN && e.APP_URL
      ? new FallbackBroker(new QStashBroker({ token: e.QSTASH_TOKEN, baseUrl: e.QSTASH_URL, appUrl: e.APP_URL }), mongo, (err) => console.warn("[broker] QStash failed, delivering in-process:", err instanceof Error ? err.message : err))
      : mongo;
  return cached;
}

/** The in-process broker, used for eager delivery right after a state change. */
export function inlineBroker(): Broker {
  return new MongoPollBroker();
}

/** For tests. */
export function resetBroker(): void {
  cached = undefined;
}
