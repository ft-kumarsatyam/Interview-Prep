import { z } from "zod";
import { connectDb } from "@/core/db";
import { PushSubscriptionModel } from "@/core/models/system";

/** The JSON a browser's `PushSubscription.toJSON()` produces. Only https push services are accepted. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(64),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export interface PushDevice {
  endpoint: string;
  label: string;
  createdAt: string;
  lastOkAt: string | null;
}

export async function savePushSubscription(sub: PushSubscriptionInput, label: string): Promise<void> {
  await connectDb();
  await PushSubscriptionModel.updateOne(
    { endpoint: sub.endpoint },
    { $set: { keys: sub.keys, label: label.slice(0, 80) } },
    { upsert: true },
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await connectDb();
  await PushSubscriptionModel.deleteOne({ endpoint });
}

export async function listPushDevices(): Promise<PushDevice[]> {
  await connectDb();
  const docs = await PushSubscriptionModel.find().sort({ createdAt: -1 }).lean();
  return docs.map((d) => ({
    endpoint: d.endpoint,
    label: d.label || "Unknown device",
    createdAt: (d.createdAt ?? new Date()).toISOString(),
    lastOkAt: d.lastOkAt ? d.lastOkAt.toISOString() : null,
  }));
}
