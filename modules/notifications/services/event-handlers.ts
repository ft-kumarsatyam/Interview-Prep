import { configuredChannels, PermanentDeliveryError } from "@/core/notify";
import { registerHandler } from "@/core/events/deliver";
import type { PushContent } from "@/modules/resume/domain/roast";

let registered = false;

/** Consumers for the notification events. Each event is one channel, so a failed channel retries on its own. */
export function registerNotificationHandlers(): void {
  if (registered) return;
  registered = true;
  registerHandler("NotificationRequested", "notify.send-channel", async (event) => {
    const p = event.payload;
    // The channel may have been unconfigured since the event was queued; that is not a failure to retry.
    const channel = configuredChannels().find((c) => c.name === p.channel);
    if (!channel) return { sent: false, reason: "channel not configured" };
    const content = p.content as unknown as PushContent;
    try {
      const receipt = await channel.send(p.title, p.body, content.html, { content, url: p.url, tag: p.tag });
      return { sent: true, ...(receipt ?? {}) };
    } catch (err) {
      // Nothing to deliver to (no device subscribed): record it as skipped rather than retrying every day.
      if (err instanceof PermanentDeliveryError) return { sent: false, reason: err.message };
      throw err;
    }
  });
}
