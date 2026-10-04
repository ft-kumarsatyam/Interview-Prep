import { connectDb } from "@/core/db";
import { pLimit } from "@/core/http";
import type { Broker } from "@/core/broker/types";
import { DEFAULT_RETRY, onFailure, outboxLagMs, type RetryPolicy } from "@/core/domain/retry";
import { Outbox } from "@/core/models/outbox";
import { logger } from "@/core/observability/log";
import { recordDelivery } from "@/core/observability/metrics";

const LEASE_MS = 60_000;
/** A row QStash accepted but never reported back on (lost callback) is retried after this long. */
const PUBLISHED_STALE_MS = 15 * 60_000;

export interface RelayOptions {
  broker: Broker;
  now?: Date;
  random?: () => number;
  policy?: RetryPolicy;
  limit?: number;
  /** How many claimed events are delivered at once (default 8). */
  concurrency?: number;
}

export interface RelayResult {
  claimed: number;
  done: number;
  published: number;
  retried: number;
  dead: number;
}

const short = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/** Atomically takes one due row (pending, past its retry time, not leased by someone else) for LEASE_MS. */
async function claimOne(now: Date, eventId?: string) {
  return Outbox.findOneAndUpdate(
    {
      ...(eventId ? { eventId } : {}),
      status: "pending",
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
    },
    { $set: { leaseUntil: new Date(now.getTime() + LEASE_MS) } },
    { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
  ).lean();
}

/** Delivers one claimed row through the broker and records the outcome (done / published / retry / dead). */
async function processRow(row: { eventId: string; type: string; attempts?: number | null }, opts: Required<Omit<RelayOptions, "limit" | "concurrency">>): Promise<keyof Omit<RelayResult, "claimed">> {
  try {
    const outcome = await opts.broker.dispatch(row.eventId, row.type);
    if (outcome === "done") {
      recordDelivery(row.type, "done");
      return "done"; // deliverEvent already marked it done
    }
    await Outbox.updateOne({ eventId: row.eventId, status: "pending" }, { $set: { status: "published", leaseUntil: null, lastError: "" } });
    recordDelivery(row.type, "published");
    return "published";
  } catch (err) {
    const permanent = (err as { permanent?: boolean }).permanent === true;
    const fail = permanent ? ({ status: "dead", attempts: (row.attempts ?? 0) + 1 } as const) : onFailure(row.attempts ?? 0, opts.now, opts.random(), opts.policy);
    const set = fail.status === "dead" ? { status: "dead" as const, attempts: fail.attempts } : { attempts: fail.attempts, nextAttemptAt: fail.nextAttemptAt };
    await Outbox.updateOne({ eventId: row.eventId }, { $set: { ...set, leaseUntil: null, lastError: short(err) } });
    const outcome = fail.status === "dead" ? "dead" : "retried";
    recordDelivery(row.type, outcome);
    if (fail.status === "dead") logger({ eventId: row.eventId, module: "outbox" }).error({ type: row.type, attempts: fail.attempts, error: short(err) }, "event dead-lettered");
    return outcome;
  }
}

/** Delivers up to `limit` due events. Safe to run from several workers at once: claims are atomic leases. */
export async function relayOutbox(options: RelayOptions): Promise<RelayResult> {
  await connectDb();
  const opts = { broker: options.broker, now: options.now ?? new Date(), random: options.random ?? Math.random, policy: options.policy ?? DEFAULT_RETRY };
  const result: RelayResult = { claimed: 0, done: 0, published: 0, retried: 0, dead: 0 };
  // Rows handed to the queue whose consumer never answered go back to pending.
  await Outbox.updateMany({ status: "published", updatedAt: { $lte: new Date(opts.now.getTime() - PUBLISHED_STALE_MS) } }, { $set: { status: "pending", nextAttemptAt: opts.now } });
  // Claim a batch first (each claim is an atomic lease, so other relays skip these rows), then deliver them concurrently.
  const claimed: Array<NonNullable<Awaited<ReturnType<typeof claimOne>>>> = [];
  for (let i = 0; i < (options.limit ?? 25); i++) {
    const row = await claimOne(opts.now);
    if (!row) break;
    claimed.push(row);
  }
  result.claimed = claimed.length;
  const run = pLimit(options.concurrency ?? 8);
  for (const outcome of await Promise.all(claimed.map((row) => run(() => processRow(row, opts))))) result[outcome]++;
  return result;
}

/** Delivers one specific event right now if nobody else holds it. Returns what happened, or null if it was not claimable. */
export async function relayOne(eventId: string, options: RelayOptions): Promise<keyof Omit<RelayResult, "claimed"> | null> {
  await connectDb();
  const opts = { broker: options.broker, now: options.now ?? new Date(), random: options.random ?? Math.random, policy: options.policy ?? DEFAULT_RETRY };
  const row = await claimOne(opts.now, eventId);
  return row ? processRow(row, opts) : null;
}

export interface OutboxStats {
  pending: number;
  published: number;
  dead: number;
  /** Milliseconds the oldest due event has waited. */
  lagMs: number;
}

export async function outboxStats(now = new Date()): Promise<OutboxStats> {
  await connectDb();
  const [pending, published, dead, oldest] = await Promise.all([
    Outbox.countDocuments({ status: "pending" }),
    Outbox.countDocuments({ status: "published" }),
    Outbox.countDocuments({ status: "dead" }),
    Outbox.findOne({ status: "pending", nextAttemptAt: { $lte: now } }, { nextAttemptAt: 1 }).sort({ nextAttemptAt: 1 }).lean(),
  ]);
  return { pending, published, dead, lagMs: outboxLagMs(oldest?.nextAttemptAt ?? null, now) };
}

/** Puts every dead-lettered event back in the queue with a fresh attempt count. Returns how many. */
export async function replayDead(now = new Date()): Promise<number> {
  await connectDb();
  const res = await Outbox.updateMany({ status: "dead" }, { $set: { status: "pending", attempts: 0, nextAttemptAt: now, leaseUntil: null, lastError: "" } });
  return res.modifiedCount;
}

/** Marks an event dead (QStash gave up on it). */
export async function markDead(eventId: string, error: string): Promise<void> {
  await connectDb();
  await Outbox.updateOne({ eventId, status: { $ne: "done" } }, { $set: { status: "dead", lastError: error.slice(0, 300), leaseUntil: null } });
}
