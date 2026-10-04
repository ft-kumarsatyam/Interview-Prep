import mongoose, { type ClientSession } from "mongoose";
import { randomUUID } from "node:crypto";
import { connectDb } from "@/core/db";
import { currentOwnerId } from "@/core/db/owner";
import { parsePayload, type EventPayload, type EventType } from "@/core/events/schemas";
import { Outbox } from "@/core/models/outbox";

/** MongoDB refuses transactions on a standalone server (local dev, some test setups): code 20 / this message. */
const isTxUnsupported = (err: unknown) =>
  typeof err === "object" && err !== null && ((err as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support retryable writes|replica set member or mongos/.test(String((err as { message?: string }).message)));

let txSupported: boolean | undefined;

/**
 * Runs `fn` in a MongoDB transaction so a state change and its outbox event commit together. On a server without
 * replica-set support it runs `fn` without a session: the app keeps working, with at-least-once rather than atomic
 * semantics (an event can be missing only if the process dies between the two writes).
 */
export async function inTransaction<T>(fn: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  await connectDb();
  if (txSupported === false) return fn(undefined);
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    txSupported = true;
    return result;
  } catch (err) {
    if (txSupported === undefined && isTxUnsupported(err)) {
      txSupported = false;
      return fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/** For tests: forget whether transactions work. */
export function resetTransactionSupport(): void {
  txSupported = undefined;
}

export interface EnqueueOptions {
  session?: ClientSession;
  /** Pass a deterministic id to make publishing idempotent (a second publish with the same id is a no-op outside a transaction). */
  eventId?: string;
  ownerId?: string;
  now?: Date;
}

/** Saves an event to the outbox. Call it with the `session` from `inTransaction` to commit with the state change. */
export async function enqueueEvent<T extends EventType>(type: T, payload: EventPayload<T>, opts: EnqueueOptions = {}): Promise<{ eventId: string; created: boolean }> {
  const eventId = opts.eventId ?? randomUUID();
  const doc = { eventId, type, ownerId: opts.ownerId ?? currentOwnerId(), payload: parsePayload(type, payload), occurredAt: opts.now ?? new Date(), nextAttemptAt: opts.now ?? new Date() };
  try {
    await Outbox.create([doc], { session: opts.session });
    return { eventId, created: true };
  } catch (err) {
    if (!opts.session && (err as { code?: number }).code === 11000) return { eventId, created: false };
    throw err;
  }
}
