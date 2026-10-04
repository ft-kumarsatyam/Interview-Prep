import { connectDb } from "@/core/db";
import { currentOwnerId } from "@/core/db/owner";
import { Outbox } from "@/core/models/outbox";
import { configuredChannels } from "@/core/notify";
import { deliveryView, type DeliveryRow, type DeliveryView } from "@/modules/notifications/domain/delivery";

/**
 * The most recent delivery attempt for each configured channel (email, Telegram, push...), so /setup can say
 * "the provider accepted it" or show the error. Finished rows are kept a week, so older history is not shown.
 */
export async function lastDeliveries(): Promise<DeliveryView[]> {
  await connectDb();
  const ownerId = currentOwnerId();
  const names = [...new Set(configuredChannels().map((c) => c.name))];
  return Promise.all(
    names.map(async (channel) => {
      const row = await Outbox.findOne(
        { ownerId, type: "NotificationRequested", eventId: { $regex: `^notify:[0-9a-f]+:${channel}$` } },
        { status: 1, attempts: 1, lastError: 1, createdAt: 1, doneAt: 1, result: 1 },
      )
        .sort({ createdAt: -1 })
        .lean<DeliveryRow>();
      return row ? deliveryView(channel, row) : { channel, state: "skipped" as const, at: null, note: "Nothing sent through this channel in the last week" };
    }),
  );
}
