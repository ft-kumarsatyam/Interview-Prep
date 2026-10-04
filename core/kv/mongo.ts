import { connectDb } from "@/core/db";
import { KvDoc, KvEventDoc, KvSeq } from "@/core/models/kv";
import { bucketTtlSec, type BucketConfig, type BucketResult } from "@/core/domain/rate-limit";
import { EVENT_MAX, type KvEvent, type KvStore } from "@/core/kv/types";

const isDuplicate = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/**
 * KvStore on MongoDB: TTL indexes drop expired rows (the sweeper runs about once a minute, so every read
 * also checks `exp`), and locks and counters are single atomic operations.
 */
export class MongoKv implements KvStore {
  readonly name = "mongo" as const;

  async get(key: string) {
    await connectDb();
    return (await KvDoc.findOne({ _id: key, exp: { $gt: new Date() } }).lean())?.v ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    await connectDb();
    await KvDoc.updateOne({ _id: key }, { $set: { v: value, n: 0, exp: new Date(Date.now() + ttlSec * 1000) } }, { upsert: true });
  }
  async del(key: string) {
    await connectDb();
    await KvDoc.deleteOne({ _id: key });
  }
  async incr(key: string, ttlSec: number) {
    await connectDb();
    const now = new Date();
    const exp = new Date(now.getTime() + ttlSec * 1000);
    // One atomic pipeline update: count on while the window is open, otherwise start a new window at 1.
    const doc = await KvDoc.findOneAndUpdate(
      { _id: key },
      [{ $set: { n: { $cond: [{ $gt: ["$exp", now] }, { $add: [{ $ifNull: ["$n", 0] }, 1] }, 1] }, exp: { $cond: [{ $gt: ["$exp", now] }, "$exp", exp] }, v: "" } }],
      { upsert: true, returnDocument: "after", updatePipeline: true },
    ).lean();
    return doc?.n ?? 1;
  }
  async setNx(key: string, token: string, ttlSec: number) {
    await connectDb();
    const exp = new Date(Date.now() + ttlSec * 1000);
    try {
      await KvDoc.create({ _id: key, v: token, n: 0, exp });
      return true;
    } catch (err) {
      if (!isDuplicate(err)) throw err;
    }
    // The row exists: take it over only if its lock has expired.
    const res = await KvDoc.updateOne({ _id: key, exp: { $lte: new Date() } }, { $set: { v: token, n: 0, exp } });
    return res.modifiedCount === 1;
  }
  async releaseIfOwner(key: string, token: string) {
    await connectDb();
    return (await KvDoc.deleteOne({ _id: key, v: token })).deletedCount === 1;
  }
  /**
   * One update-pipeline `findOneAndUpdate`: refill and take in the database, so concurrent callers cannot both spend the
   * last token. The row keeps `n` tokens, `t` last ms and `ok`/`wait` from the latest call, which is what we read back.
   */
  async tokenBucket(key: string, cfg: BucketConfig, cost = 1, nowMs = Date.now()): Promise<BucketResult> {
    await connectDb();
    const { ratePerSec: rate, burst } = cfg;
    const exp = new Date(nowMs + bucketTtlSec(cfg) * 1000);
    const refilled = { $min: [burst, { $add: [{ $ifNull: ["$n", burst] }, { $multiply: [{ $divide: [{ $max: [0, { $subtract: [nowMs, { $ifNull: ["$t", nowMs] }] }] }, 1000] }, rate] }] }] };
    const doc = await KvDoc.collection.findOneAndUpdate(
      { _id: key as never },
      [
        { $set: { f: refilled, last: { $max: [nowMs, { $ifNull: ["$t", nowMs] }] } } },
        { $set: { ok: { $lte: [cost, "$f"] } } },
        {
          $set: {
            n: { $cond: ["$ok", { $subtract: ["$f", cost] }, "$f"] },
            t: "$last",
            wait: { $cond: ["$ok", 0, cost > burst ? -1 : { $ceil: { $multiply: [{ $divide: [{ $subtract: [cost, "$f"] }, rate] }, 1000] } }] },
            exp,
            v: "",
          },
        },
        { $unset: ["f", "last"] },
      ],
      { upsert: true, returnDocument: "after" },
    );
    const remaining = Math.floor((doc?.n as number | undefined) ?? 0);
    if (doc?.ok) return { allowed: true, remaining, retryAfterMs: 0 };
    const wait = (doc?.wait as number | undefined) ?? 0;
    return { allowed: false, remaining, retryAfterMs: wait < 0 ? Number.POSITIVE_INFINITY : wait };
  }
  async eventsAppend(channel: string, data: string) {
    await connectDb();
    const seq = await KvSeq.findOneAndUpdate({ _id: channel }, { $inc: { n: 1 } }, { upsert: true, returnDocument: "after" }).lean();
    const id = seq?.n ?? 1;
    await KvEventDoc.create({ channel, id, data });
    // Keep the log short: drop everything older than the newest EVENT_MAX.
    if (id > EVENT_MAX) await KvEventDoc.deleteMany({ channel, id: { $lte: id - EVENT_MAX } });
    return String(id);
  }
  async eventsRead(channel: string, after: string, limit = 100): Promise<KvEvent[]> {
    if (!/^\d+$/.test(after)) return [];
    await connectDb();
    const rows = await KvEventDoc.find({ channel, id: { $gt: Number(after) } }).sort({ id: 1 }).limit(limit).lean();
    return rows.map((r) => ({ id: String(r.id), data: r.data }));
  }
  async eventsLastId(channel: string) {
    await connectDb();
    const row = await KvEventDoc.findOne({ channel }).sort({ id: -1 }).lean();
    return row ? String(row.id) : null;
  }
}
