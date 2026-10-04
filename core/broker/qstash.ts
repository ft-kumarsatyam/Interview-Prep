import { createHash } from "node:crypto";
import { jwtVerify } from "jose";
import type { Broker } from "@/core/broker/types";
import { fetchWithPolicy } from "@/core/http";

export interface QStashConfig {
  token: string;
  baseUrl: string;
  /** Public origin of this app, e.g. https://prepos.vercel.app. QStash pushes to `${appUrl}/api/queue/<type>`. */
  appUrl: string;
  /** QStash's own retries after the first delivery (it backs off exponentially). */
  retries?: number;
}

/**
 * Upstash QStash (free tier): the relay publishes a tiny reference `{eventId}` and QStash pushes it, with signed
 * retries, to /api/queue/[topic]. The consumer loads the real payload from the outbox, so no personal text travels
 * through the queue. After its retries QStash calls the failure callback, which dead-letters the event.
 */
export class QStashBroker implements Broker {
  readonly name = "qstash" as const;
  constructor(private readonly cfg: QStashConfig) {}

  async dispatch(eventId: string, type: string): Promise<"published"> {
    const app = this.cfg.appUrl.replace(/\/+$/, "");
    const target = `${app}/api/queue/${encodeURIComponent(type)}`;
    const res = await fetchWithPolicy(`${this.cfg.baseUrl.replace(/\/+$/, "")}/v2/publish/${target}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.cfg.token}`,
        "content-type": "application/json",
        "Upstash-Retries": String(this.cfg.retries ?? 5),
        "Upstash-Deduplication-Id": eventId,
        "Upstash-Failure-Callback": `${app}/api/queue/failed`,
      },
      body: JSON.stringify({ eventId }),
      timeoutMs: 8000,
      retries: 0,
    });
    if (!res.ok) throw new Error(`QStash publish failed: HTTP ${res.status}`);
    return "published";
  }
}

/** Why a push was rejected, or null when it is genuine. Pure of I/O apart from the signature check. */
export async function verifyQStashSignature(opts: { signature: string | null; body: string; url: string; keys: Array<string | undefined>; now?: Date }): Promise<boolean> {
  if (!opts.signature) return false;
  const bodyHash = createHash("sha256").update(opts.body).digest("base64url");
  for (const key of opts.keys) {
    if (!key) continue;
    try {
      const { payload } = await jwtVerify(opts.signature, new TextEncoder().encode(key), {
        issuer: "Upstash",
        subject: opts.url,
        algorithms: ["HS256"],
        clockTolerance: 5,
        currentDate: opts.now,
      });
      // The body hash is base64url; tolerate padding that some SDK versions add.
      if (typeof payload.body === "string" && payload.body.replace(/=+$/, "") === bodyHash) return true;
    } catch {
      // Try the next signing key (QStash rotates current -> next).
    }
  }
  return false;
}
