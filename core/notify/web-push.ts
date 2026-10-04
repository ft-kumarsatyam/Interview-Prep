import webpush, { WebPushError } from "web-push";
import { connectDb } from "@/core/db";
import { buildPushPayload } from "@/modules/notifications/domain/push-payload";
import { PushSubscriptionModel } from "@/core/models/system";
import type { NotifyChannel } from "@/core/notify/index";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** A plan or recap is stale after half a day; the push service drops it if the device stays offline longer. */
const TTL_SECONDS = 12 * 60 * 60;
const TIMEOUT_MS = 10_000;

/** The push service says this subscription no longer exists (uninstalled app, revoked permission). */
const isGone = (err: unknown) => err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410);

/** PWA notifications to every device that turned them on in Settings. */
export function webPushChannel(keys: VapidKeys): NotifyChannel {
  return {
    name: "push",
    async send(title, body, _html, meta) {
      await connectDb();
      const subs = (await PushSubscriptionModel.find().lean()).flatMap((s) => (s.keys ? [{ endpoint: s.endpoint, keys: s.keys }] : []));
      if (subs.length === 0) throw new Error("No device has turned on notifications yet");

      const payload = JSON.stringify(
        buildPushPayload(meta?.content ?? { title, body }, { url: meta?.url ?? "/dashboard", tag: meta?.tag ?? "prepos" }),
      );
      const results = await Promise.allSettled(
        subs.map((s) =>
          webpush.sendNotification(s, payload, {
            vapidDetails: keys,
            TTL: TTL_SECONDS,
            timeout: TIMEOUT_MS,
          }),
        ),
      );

      const gone = subs.filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && isGone(r.reason);
      });
      const ok = subs.filter((_, i) => results[i].status === "fulfilled");
      await Promise.all([
        gone.length ? PushSubscriptionModel.deleteMany({ endpoint: { $in: gone.map((s) => s.endpoint) } }) : null,
        ok.length ? PushSubscriptionModel.updateMany({ endpoint: { $in: ok.map((s) => s.endpoint) } }, { $set: { lastOkAt: new Date() } }) : null,
      ]);

      if (ok.length === 0) {
        const first = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason;
        if (gone.length === subs.length) throw new Error("Every device's subscription had expired; turn notifications on again");
        throw first instanceof WebPushError ? new Error(`HTTP ${first.statusCode}: ${first.body.slice(0, 200)}`) : first;
      }
    },
  };
}
