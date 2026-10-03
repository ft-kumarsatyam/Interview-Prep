import { connectDb } from "@/lib/db";
import { Notification } from "@/lib/models/system";
import { pushToChannels, type NotifyChannel } from "@/lib/notify";

export type NotificationKind = "plan" | "reminder" | "streak" | "milestone" | "sync";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/**
 * Create an in-app notification, optionally pushed to Telegram/email. With a
 * dedupe key it's created at most once, and only the first call pushes.
 */
export async function notify(
  input: { kind: NotificationKind; title: string; body: string; dedupeKey?: string },
  opts: {
    push?: boolean;
    channels?: readonly NotifyChannel[];
    /** A fuller message for Telegram/email; the in-app notification keeps `input`. */
    pushContent?: { title: string; body: string; html?: string };
  } = {},
): Promise<{ created: boolean; pushed: string[] }> {
  await connectDb();
  if (input.dedupeKey) {
    const res = await Notification.updateOne(
      { dedupeKey: input.dedupeKey },
      { $setOnInsert: { kind: input.kind, title: input.title, body: input.body, read: false } },
      { upsert: true },
    );
    if (res.upsertedCount === 0) return { created: false, pushed: [] };
  } else {
    await Notification.create(input);
  }
  const content = opts.pushContent ?? { title: input.title, body: input.body };
  const pushed = opts.push ? (await pushToChannels(content.title, content.body, opts.channels, content.html)).sent : [];
  return { created: true, pushed };
}

export async function listNotifications(limit = 20): Promise<{ items: NotificationItem[]; unread: number }> {
  await connectDb();
  const [docs, unread] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ read: false }),
  ]);
  return {
    items: docs.map((d) => ({
      id: String(d._id),
      kind: d.kind as NotificationKind,
      title: d.title,
      body: d.body ?? "",
      read: !!d.read,
      createdAt: (d.createdAt ?? new Date()).toISOString(),
    })),
    unread,
  };
}

export async function markNotificationsRead(ids?: readonly string[]): Promise<void> {
  await connectDb();
  await Notification.updateMany(ids ? { _id: { $in: ids }, read: false } : { read: false }, { $set: { read: true } });
}
