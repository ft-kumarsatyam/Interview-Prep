import { connectDb } from "@/core/db";
import { Notification } from "@/core/models/system";
import type { MailSpec } from "@/modules/notifications/domain/mail-html";
import type { PushContent } from "@/modules/resume/domain/roast";
import { publish } from "@/core/realtime";
import { configuredChannels, pushToChannels, type NotifyChannel } from "@/core/notify";
import { inlineBroker } from "@/core/broker";
import { enqueueEvent, inTransaction } from "@/core/events/outbox";
import type { EventPayload } from "@/core/events/schemas";
import { relayOne } from "@/core/events/relay";
import { registerNotificationHandlers } from "@/modules/notifications/services/event-handlers";

export type NotificationKind = "plan" | "reminder" | "recap" | "streak" | "milestone" | "sync" | "news";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** Has the full message, viewable at /notifications/[id]. */
  hasDetail: boolean;
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
    /** A fuller message for Telegram/email/push; the in-app notification keeps `input`. */
    pushContent?: PushContent;
  } = {},
): Promise<{ created: boolean; pushed: string[] }> {
  await connectDb();
  const extra = {
    ...(opts.pushContent?.spec ? { detail: opts.pushContent.spec } : {}),
    ...(opts.pushContent?.roast ? { roast: opts.pushContent.roast } : {}),
  };
  const content = opts.pushContent ?? { title: input.title, body: input.body };
  // Explicit channels (tests, the Settings test button) are delivered directly. Normal sends go through the outbox.
  const viaOutbox = !!opts.push && !opts.channels;
  const names = viaOutbox ? configuredChannels().map((c) => c.name) : [];

  const saved = await inTransaction(async (session) => {
    let id: string;
    if (input.dedupeKey) {
      const res = await Notification.updateOne(
        { dedupeKey: input.dedupeKey },
        { $setOnInsert: { kind: input.kind, title: input.title, body: input.body, read: false, ...extra } },
        { upsert: true, session },
      );
      if (res.upsertedCount === 0 || !res.upsertedId) return null;
      id = String(res.upsertedId);
    } else {
      id = String((await Notification.create([{ ...input, ...extra }], { session }))[0]!._id);
    }
    // The notification and the events that deliver it commit together, so a crash cannot lose the delivery.
    const eventIds: string[] = [];
    for (const channel of names) {
      const eventId = `notify:${id}:${channel}`;
      await enqueueEvent(
        "NotificationRequested",
        { notificationId: id, channel, kind: input.kind, title: content.title, body: content.body, url: `/notifications/${id}`, tag: pushTag(input.kind, input.dedupeKey), content: content as unknown as EventPayload<"NotificationRequested">["content"] },
        { eventId, session },
      );
      eventIds.push(eventId);
    }
    return { id, eventIds };
  });
  if (!saved) return { created: false, pushed: [] };
  const { id, eventIds } = saved;
  // The bell in every open tab updates at once.
  await publish({ type: "notification", kind: input.kind });

  let pushed: string[] = [];
  if (viaOutbox) {
    // Deliver now for low latency; anything that fails stays in the outbox and the relay retries it with backoff.
    registerNotificationHandlers();
    const outcomes = await Promise.all(eventIds.map((eventId) => relayOne(eventId, { broker: inlineBroker() })));
    pushed = names.filter((_, i) => outcomes[i] === "done");
  } else if (opts.push) {
    const meta = { content, url: `/notifications/${id}`, tag: pushTag(input.kind, input.dedupeKey) };
    pushed = (await pushToChannels(content.title, content.body, opts.channels, content.html, meta)).sent;
  }
  return { created: true, pushed };
}

/** `plan:2026-10-05` → `plan`, so a newer morning plan replaces yesterday's on the lock screen. */
export function pushTag(kind: NotificationKind, dedupeKey?: string): string {
  return `prepos-${dedupeKey?.split(":")[0] ?? kind}`;
}

/**
 * Saves a message that was sent outside `notify()` (the Settings test button) so its push can open the
 * full version. Stored as read: it shouldn't light up the bell.
 */
export async function saveSentMessage(kind: NotificationKind, content: PushContent): Promise<string> {
  await connectDb();
  const doc = await Notification.create({
    kind,
    title: content.title,
    body: content.spec?.intro ?? content.body.slice(0, 280),
    read: true,
    ...(content.spec ? { detail: content.spec } : {}),
    ...(content.roast ? { roast: content.roast } : {}),
  });
  return String(doc._id);
}

export interface NotificationDetail extends NotificationItem {
  spec: MailSpec | null;
  roast: string | null;
}

/** One message with its full content, marking it read. Null for a bad or unknown id. */
export async function getNotificationDetail(id: string): Promise<NotificationDetail | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDb();
  const d = await Notification.findByIdAndUpdate(id, { $set: { read: true } }, { new: true }).lean();
  if (!d) return null;
  return {
    id: String(d._id),
    kind: d.kind as NotificationKind,
    title: d.title,
    body: d.body ?? "",
    read: true,
    createdAt: (d.createdAt ?? new Date()).toISOString(),
    hasDetail: d.detail != null,
    spec: (d.detail as MailSpec | undefined) ?? null,
    roast: d.roast ?? null,
  };
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
      hasDetail: d.detail != null,
    })),
    unread,
  };
}

export async function markNotificationsRead(ids?: readonly string[]): Promise<void> {
  await connectDb();
  await Notification.updateMany(ids ? { _id: { $in: ids }, read: false } : { read: false }, { $set: { read: true } });
}

/** How many notifications with a dedupe key starting `prefix` were created since `since`. */
export async function countSince(prefix: string, since: Date): Promise<number> {
  await connectDb();
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Notification.countDocuments({ dedupeKey: { $regex: `^${esc}` }, createdAt: { $gte: since } });
}

/** The `/news/<id>` article ids linked from the stored message with this dedupe key. */
export async function articleIdsIn(dedupeKey: string): Promise<Set<string>> {
  await connectDb();
  const d = await Notification.findOne({ dedupeKey }, { detail: 1 }).lean();
  const spec = d?.detail as MailSpec | undefined;
  const ids = (spec?.sections ?? []).flatMap((s) => (s.items ?? []).flatMap((i) => i.path.match(/^\/news\/([a-f0-9]{24})$/)?.[1] ?? []));
  return new Set(ids);
}
