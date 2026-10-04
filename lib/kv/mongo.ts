import { connectDb } from "@/lib/db";
import { KvDoc, KvEventDoc, KvSeq } from "@/lib/models/kv";
import { EVENT_MAX, type KvEvent, type KvStore } from "./types";

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
