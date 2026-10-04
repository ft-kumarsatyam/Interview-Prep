/**
 * Benchmarks of the parts that were redesigned, run against the real services on an in-memory MongoDB replica set.
 * Not a load test of a deployed server (that is scripts/bench/k6/*.js); it measures the code paths and proves the
 * guarantees: exactly-once delivery under redelivery and concurrency, single-flight caching, token-bucket correctness.
 *
 *   npm run bench              prints a table and writes docs/BENCHMARKS.json
 *   npm run bench -- --small   a quick run (smaller sizes) for CI smoke checks
 */
import { writeFileSync } from "node:fs";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const small = process.argv.includes("--small");
const N = (full: number, tiny: number) => (small ? tiny : full);

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
function stats(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  return { n: s.length, p50: +pct(s, 0.5).toFixed(2), p95: +pct(s, 0.95).toFixed(2), p99: +pct(s, 0.99).toFixed(2), mean: +(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)).toFixed(2) };
}
const timeIt = async <T>(fn: () => Promise<T>) => {
  const t = performance.now();
  const out = await fn();
  return { out, ms: performance.now() - t };
};

type Row = Record<string, string | number | boolean>;
const results: Array<{ name: string; rows: Row[]; note?: string }> = [];
const report = (name: string, rows: Row[], note?: string) => {
  results.push({ name, rows, ...(note ? { note } : {}) });
  console.log(`\n## ${name}`);
  console.table(rows);
  if (note) console.log(note);
};

async function main() {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, {
    MONGODB_URI: mongod.getUri("prepos-bench"),
    AUTH_SECRET: "bench-secret-bench-secret-bench-secret-123",
    ADMIN_EMAIL: "bench@example.com",
    ADMIN_PASSWORD_HASH_B64: "dGVzdC1oYXNoLXRlc3QtaGFzaA==",
    APP_TIMEZONE: "Asia/Kolkata",
  });
  const { connectDb } = await import("@/core/db");
  await connectDb();
  await import("@/core/models/all");
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  /* ---------------------------------------- 1. Discover list: cache off vs on ---------------------------------------- */
  {
    const { JobPosting } = await import("@/core/models/job-postings");
    const { termsIn } = await import("@/modules/jobs/domain/ats");
    const { Settings } = await import("@/core/models/system");
    const { discoverJobs } = await import("@/modules/jobs/services/job-discovery");
    const { bumpVersion, cacheStats, resetCacheStats } = await import("@/core/cache");
    await Settings.updateOne({ _id: "settings" }, { $setOnInsert: { _id: "settings" } }, { upsert: true });
    const stack = ["Node.js and PostgreSQL", "React and TypeScript", "Kafka and Redis", "Docker and Kubernetes on AWS", "Python and Django", "Go and gRPC"];
    const docs = Array.from({ length: N(3000, 400) }, (_, i) => {
      const jd = `${stack[i % stack.length]}. ${"We build reliable systems. ".repeat(20)}`;
      return { key: `bench:${i}`, source: "greenhouse", sourceId: `co${i % 40}`, externalId: String(i), title: `${["Backend", "Frontend", "Platform", "Data", "SRE"][i % 5]} Engineer ${i}`, company: `Company ${i % 40}`, tier: "", location: "Remote", remote: true, postedAt: new Date(Date.now() - i * 3_600_000), url: `https://e.com/${i}`, applyUrl: `https://e.com/${i}`, jd: jd.slice(0, 400), terms: termsIn(jd), firstSeenAt: new Date(), lastSeenAt: new Date(), closedAt: null, dismissed: false };
    });
    await JobPosting.insertMany(docs);
    const calls = N(300, 40);

    const off: number[] = [];
    for (let i = 0; i < calls; i++) off.push((await timeIt(() => discoverJobs({}, new Date()))).ms); // explicit `now` bypasses the cache

    resetCacheStats();
    await bumpVersion("jobs");
    const on: number[] = [];
    for (let i = 0; i < calls; i++) on.push((await timeIt(() => discoverJobs({}))).ms);
    const sOn = cacheStats();

    await bumpVersion("jobs");
    resetCacheStats();
    const stampede = await timeIt(() => Promise.all(Array.from({ length: 50 }, () => discoverJobs({}))));
    const sStamp = cacheStats();
    report(
      `Discover list over ${docs.length} postings (${calls} sequential calls)`,
      [
        { cache: "off", ...stats(off) },
        { cache: "on", ...stats(on), hitRate: `${Math.round((sOn.hits / calls) * 100)}%` },
        { cache: "50 concurrent cold requests", n: 50, "wall ms": +stampede.ms.toFixed(1), computations: sStamp.misses - sStamp.coalesced, coalesced: sStamp.coalesced },
      ],
      `p95 ${stats(off).p95} ms -> ${stats(on).p95} ms with the versioned cache; the cold stampede of 50 ran the computation ${sStamp.misses - sStamp.coalesced} time(s), not 50.`,
    );
  }

  /* ------------------------------------ 2 and 3. Outbox throughput and exactly-once ------------------------------------ */
  {
    const { enqueueEvent } = await import("@/core/events/outbox");
    const { clearHandlers, deliverEvent, registerHandler } = await import("@/core/events/deliver");
    const { relayOutbox } = await import("@/core/events/relay");
    const { MongoPollBroker } = await import("@/core/broker/mongo-poll");
    const { Outbox, Inbox } = await import("@/core/models/outbox");
    const broker = new MongoPollBroker();
    const total = N(2000, 200);

    clearHandlers();
    const seen = new Map<string, number>();
    registerHandler("JobSyncRequested", "bench.count", async (e) => void seen.set(e.eventId, (seen.get(e.eventId) ?? 0) + 1));
    await Outbox.deleteMany({});
    await Inbox.deleteMany({});

    const enq = await timeIt(async () => {
      for (let i = 0; i < total; i += 50) await Promise.all(Array.from({ length: Math.min(50, total - i) }, () => enqueueEvent("JobSyncRequested", {})));
    });
    const drained = await timeIt(async () => {
      for (let guard = 0; guard < total; guard++) {
        const r = await relayOutbox({ broker, limit: 100, now: new Date(Date.now() + 1000) });
        if (r.claimed === 0) break;
      }
    });
    const single = { enqueuePerSec: Math.round(total / (enq.ms / 1000)), deliverPerSec: Math.round(total / (drained.ms / 1000)), handledOnce: [...seen.values()].every((v) => v === 1) && seen.size === total };

    // Four relays competing for the same backlog.
    seen.clear();
    await Outbox.deleteMany({});
    await Inbox.deleteMany({});
    for (let i = 0; i < total; i += 50) await Promise.all(Array.from({ length: Math.min(50, total - i) }, () => enqueueEvent("JobSyncRequested", {})));
    const par = await timeIt(async () => {
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          for (let guard = 0; guard < total; guard++) {
            const r = await relayOutbox({ broker, limit: 50, now: new Date(Date.now() + 1000) });
            if (r.claimed === 0) break;
          }
        }),
      );
    });
    const dupes = [...seen.values()].filter((v) => v > 1).length;
    report(
      `Outbox: ${total} events`,
      [
        { scenario: "1 relay", "events/sec": single.deliverPerSec, "enqueue/sec": single.enqueuePerSec, "exactly once": single.handledOnce },
        { scenario: "4 relays competing", "events/sec": Math.round(total / (par.ms / 1000)), "enqueue/sec": "-", "exactly once": seen.size === total && dupes === 0 },
      ],
      `With four relays racing for one backlog, ${seen.size} of ${total} events were handled and ${dupes} were handled twice.`,
    );

    // Redelivery: every event delivered three times, some concurrently. The inbox must turn the extras into no-ops.
    seen.clear();
    await Outbox.deleteMany({});
    await Inbox.deleteMany({});
    const ids: string[] = [];
    for (let i = 0; i < N(500, 100); i++) ids.push((await enqueueEvent("JobSyncRequested", {})).eventId);
    const redelivery = await timeIt(async () => {
      await Promise.all(ids.flatMap((id) => [deliverEvent(id), deliverEvent(id), deliverEvent(id)]));
      await Promise.all(ids.map((id) => deliverEvent(id)));
    });
    const calls = [...seen.values()];
    report(
      `Consumer redelivery: ${ids.length} events delivered 4 times each (3 concurrent + 1 later)`,
      [{ deliveries: ids.length * 4, "handler runs": calls.reduce((a, b) => a + b, 0), "events handled more than once": calls.filter((v) => v > 1).length, "events never handled": ids.length - seen.size, "wall ms": +redelivery.ms.toFixed(0) }],
      "A handler that ran more than once for an event would be a duplicate email or push; the inbox prevents it.",
    );
  }

  /* ----------------------------------------------- 4. Token bucket ----------------------------------------------- */
  {
    const { MongoKv } = await import("@/core/kv/mongo");
    const kv = new MongoKv();
    const cfg = { ratePerSec: 0.001, burst: 25 };
    const t0 = 5_000_000;
    const granted = (await Promise.all(Array.from({ length: N(500, 100) }, () => kv.tokenBucket("bench-race", cfg, 1, t0)))).filter((r) => r.allowed).length;
    const lat: number[] = [];
    for (let i = 0; i < N(500, 100); i++) lat.push((await timeIt(() => kv.tokenBucket(`bench-lat-${i % 10}`, { ratePerSec: 100, burst: 100 }))).ms);
    report(
      "Token bucket on MongoDB (one atomic update pipeline per call)",
      [{ "concurrent callers": N(500, 100), burst: cfg.burst, granted, "overspent": granted - cfg.burst, ...Object.fromEntries(Object.entries(stats(lat)).map(([k, v]) => [`call ${k} ms`, v])) }],
      "granted must equal the burst exactly: the bucket never over-spends under contention.",
    );
  }

  /* --------------------------------------------- 5. Public API route --------------------------------------------- */
  {
    const { createApiToken } = await import("@/core/services/api-tokens");
    const { Settings } = await import("@/core/models/system");
    const { Job } = await import("@/core/models/jobs");
    await Settings.updateOne({ _id: "settings" }, { $setOnInsert: { _id: "settings" } }, { upsert: true });
    const { POST, GET } = await import("@/app/api/v1/jobs/route");
    // A token is limited to 120 requests a minute (by design), so each batch of 50 uses its own token; only 2xx answers are timed.
    const tokenFor = async () => {
      const t = await createApiToken({ name: "bench", scopes: ["capture:write", "jobs:read"], days: 30 });
      if (!t.ok) throw new Error(t.error);
      return t.token;
    };
    const post = (tok: string, i: number) =>
      POST(new Request("http://x/api/v1/jobs", { method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json", "idempotency-key": `bench-key-${i}` }, body: JSON.stringify({ title: `Bench Engineer ${i}`, company: "Bench", url: `https://bench.example.com/jobs/${i}`, jd: "Node.js and PostgreSQL" }) }));
    const writes: number[] = [];
    const replays: number[] = [];
    const bad: Record<number, number> = {};
    const count = N(200, 40);
    let tok = await tokenFor();
    for (let i = 0; i < count; i++) {
      if (i > 0 && i % 50 === 0) tok = await tokenFor();
      const w = await timeIt(() => post(tok, i));
      if (w.out.status === 201) writes.push(w.ms);
      else bad[w.out.status] = (bad[w.out.status] ?? 0) + 1;
      const r = await timeIt(() => post(tok, i));
      if (r.out.status === 201 && r.out.headers.get("idempotent-replayed") === "true") replays.push(r.ms);
      else bad[r.out.status] = (bad[r.out.status] ?? 0) + 1;
    }
    const reads: number[] = [];
    const readTok = await tokenFor();
    for (let i = 0; i < N(100, 20); i++) {
      const r = await timeIt(() => GET(new Request("http://x/api/v1/jobs", { headers: { authorization: `Bearer ${readTok}` } })));
      if (r.out.status === 200) reads.push(r.ms);
      else bad[r.out.status] = (bad[r.out.status] ?? 0) + 1;
    }
    const stored = await Job.countDocuments({});
    report(
      "Public API route handlers (in process; auth + scope + rate limit + validation + write)",
      [
        { request: "POST /api/v1/jobs (new, with Idempotency-Key)", ...stats(writes) },
        { request: "POST /api/v1/jobs (replayed key)", ...stats(replays) },
        { request: "GET /api/v1/jobs", ...stats(reads) },
      ],
      `${count} distinct jobs sent twice each with the same Idempotency-Key: ${stored} stored (expected ${count}), ${replays.length} replays served without a second write, unexpected statuses: ${JSON.stringify(bad)}.`,
    );
    if (stored !== count || Object.keys(bad).length) throw new Error(`API benchmark invalid: stored ${stored}/${count}, statuses ${JSON.stringify(bad)}`);
  }

  const out = { generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform} ${process.arch}`, size: small ? "small" : "full", results };
  if (!small) writeFileSync("docs/BENCHMARKS.json", `${JSON.stringify(out, null, 2)}\n`);
  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
