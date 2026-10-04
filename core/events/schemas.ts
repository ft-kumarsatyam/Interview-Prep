import { z } from "zod";

/** Every domain event the app can emit. The payload carries ids and small facts, never personal text. */
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const eventPayloads = {
  SolveRecorded: z.object({ slug: z.string().min(1), date }),
  DayCompleted: z.object({ date }),
  QuizPassed: z.object({ date, pct: z.number().min(0).max(100) }),
  /** One event per delivery channel, so a failed Telegram send retries alone and never re-sends the email. */
  NotificationRequested: z.object({
    notificationId: z.string().min(1),
    channel: z.enum(["telegram", "email", "whatsapp", "push"]),
    kind: z.string().min(1),
    title: z.string().min(1).max(300),
    body: z.string().max(10_000),
    url: z.string().max(300),
    tag: z.string().max(100),
    /** The fuller message for email/push; the same shape `notify()` already takes. */
    content: z.object({ title: z.string(), body: z.string(), html: z.string().optional(), spec: z.unknown().optional(), roast: z.string().optional() }).passthrough(),
  }),
  JobSyncRequested: z.object({ requestedFor: date.optional() }),
  ArticleIngested: z.object({ articleId: z.string().min(1) }),
} as const;

export type EventType = keyof typeof eventPayloads;
export const EVENT_TYPES = Object.keys(eventPayloads) as EventType[];

export type EventPayload<T extends EventType> = z.infer<(typeof eventPayloads)[T]>;

export interface EventEnvelope<T extends EventType = EventType> {
  /** Unique and stable: a redelivery carries the same id, which is what makes consumers idempotent. */
  eventId: string;
  type: T;
  ownerId: string;
  occurredAt: Date;
  payload: EventPayload<T>;
}

export function isEventType(v: string): v is EventType {
  return (EVENT_TYPES as string[]).includes(v);
}

/** Validates a payload for its event type; throws a zod error on a bad shape. */
export function parsePayload<T extends EventType>(type: T, payload: unknown): EventPayload<T> {
  return eventPayloads[type].parse(payload) as EventPayload<T>;
}
