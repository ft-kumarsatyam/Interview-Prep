import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * The transactional outbox: an event is saved in the same transaction as the state change that caused it, then a
 * relay delivers it. Shared across owners (the relay claims rows for everyone); each row carries its `ownerId`.
 *
 * status: pending (waiting or leased) -> published (handed to the broker, consumer will finish it)
 *         -> done | dead (retries used up; replay from /setup).
 */
const outboxSchema = new Schema(
  {
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    ownerId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "published", "done", "dead"], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    leaseUntil: { type: Date, default: null },
    lastError: { type: String, default: "" },
    occurredAt: { type: Date, default: () => new Date() },
    doneAt: { type: Date, default: null },
    /** What the handlers returned on success (for a notification: the provider and its message id). */
    result: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false },
);
outboxSchema.index({ eventId: 1 }, { unique: true });
outboxSchema.index({ status: 1, nextAttemptAt: 1 });
// Finished rows are kept a week for debugging, then dropped. Dead rows stay until replayed or removed by hand.
outboxSchema.index({ doneAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

/** Records that a handler already processed an event, so a redelivery is a no-op. */
const inboxSchema = new Schema(
  { eventId: { type: String, required: true }, handler: { type: String, required: true }, at: { type: Date, default: () => new Date() } },
  { versionKey: false },
);
inboxSchema.index({ eventId: 1, handler: 1 }, { unique: true });
inboxSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export type OutboxRow = InferSchemaType<typeof outboxSchema>;
export type InboxRow = InferSchemaType<typeof inboxSchema>;
export const Outbox: Model<OutboxRow> = models.Outbox ?? model("Outbox", outboxSchema);
export const Inbox: Model<InboxRow> = models.Inbox ?? model("Inbox", inboxSchema);
