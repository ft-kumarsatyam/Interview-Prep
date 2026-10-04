import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, startDb, stopDb } from "@/tests/services/db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  const { clearHandlers } = await import("@/core/events/deliver");
  clearHandlers();
  const { Outbox, Inbox } = await import("@/core/models/outbox");
  await Promise.all([Outbox.syncIndexes(), Inbox.syncIndexes()]); // dropDatabase removed the unique indexes
});

const policy = { maxAttempts: 3, baseMs: 1000, capMs: 1000 };

async function mods() {
  const [outbox, deliver, relay, mongoPoll, models] = await Promise.all([
    import("@/core/events/outbox"),
    import("@/core/events/deliver"),
    import("@/core/events/relay"),
    import("@/core/broker/mongo-poll"),
    import("@/core/models/outbox"),
  ]);
  return { ...outbox, ...deliver, ...relay, MongoPollBroker: mongoPoll.MongoPollBroker, ...models };
}

describe("delivery and the inbox", () => {
  it("runs a handler once even when the same event is delivered twice", async () => {
    const m = await mods();
    const seen = vi.fn(async () => "ok");
    m.registerHandler("JobSyncRequested", "t.once", seen);
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    expect((await m.deliverEvent(eventId)).ok).toBe(true);
    const again = await m.deliverEvent(eventId);
    expect(again).toMatchObject({ ok: true, duplicate: true });
    expect(seen).toHaveBeenCalledTimes(1);
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("done");
  });

  it("does not re-run a handler that succeeded when another one failed", async () => {
    const m = await mods();
    const good = vi.fn(async () => 1);
    let calls = 0;
    const flaky = vi.fn(async () => {
      if (++calls === 1) throw new Error("boom");
    });
    m.registerHandler("JobSyncRequested", "t.good", good);
    m.registerHandler("JobSyncRequested", "t.flaky", flaky);
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    expect(await m.deliverEvent(eventId)).toMatchObject({ ok: false, permanent: false });
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("pending");
    expect((await m.deliverEvent(eventId)).ok).toBe(true);
    expect(good).toHaveBeenCalledTimes(1);
    expect(flaky).toHaveBeenCalledTimes(2);
  });

  it("publishing the same deterministic event id twice stores one row", async () => {
    const m = await mods();
    expect((await m.enqueueEvent("JobSyncRequested", {}, { eventId: "x" })).created).toBe(true);
    expect((await m.enqueueEvent("JobSyncRequested", {}, { eventId: "x" })).created).toBe(false);
    expect(await m.Outbox.countDocuments({})).toBe(1);
  });

  it("rejects an invalid payload at publish time and dead-letters a corrupt stored one", async () => {
    const m = await mods();
    await expect(m.enqueueEvent("QuizPassed", { date: "nope", pct: 5 })).rejects.toThrow();
    await m.Outbox.create({ eventId: "bad", type: "QuizPassed", ownerId: "owner", payload: { date: "x" } });
    expect(await m.deliverEvent("bad")).toMatchObject({ ok: false, permanent: true });
  });

  it("runs handlers as the event's owner", async () => {
    const m = await mods();
    const { currentOwnerId } = await import("@/core/db/owner");
    let seen = "";
    m.registerHandler("JobSyncRequested", "t.owner", async () => void (seen = currentOwnerId()));
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {}, { ownerId: "alice" });
    await m.deliverEvent(eventId);
    expect(seen).toBe("alice");
  });
});

describe("relay: retries and the dead-letter queue", () => {
  it("retries with backoff, then dead-letters, and replay brings it back", async () => {
    const m = await mods();
    let fail = true;
    m.registerHandler("JobSyncRequested", "t.fail", async () => {
      if (fail) throw new Error("down");
    });
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    const broker = new m.MongoPollBroker();
    const t0 = new Date(Date.now() + 1000);
    const run = (now: Date) => m.relayOutbox({ broker, now, random: () => 0.999, policy });

    expect(await run(t0)).toMatchObject({ claimed: 1, retried: 1 });
    const afterOne = await m.Outbox.findOne({ eventId }).lean();
    expect(afterOne).toMatchObject({ status: "pending", attempts: 1 });
    expect(afterOne!.nextAttemptAt!.getTime()).toBeGreaterThan(t0.getTime());
    // Not due yet: nothing is claimed.
    expect((await run(t0)).claimed).toBe(0);

    expect((await run(new Date(t0.getTime() + 10_000))).retried).toBe(1);
    expect(await run(new Date(t0.getTime() + 20_000))).toMatchObject({ dead: 1 });
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("dead");
    expect(await m.outboxStats()).toMatchObject({ dead: 1, pending: 0 });

    fail = false;
    expect(await m.replayDead()).toBe(1);
    expect(await m.relayOutbox({ broker, now: new Date(t0.getTime() + 30_000) })).toMatchObject({ done: 1 });
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("done");
  });

  it("two relays at once deliver an event exactly once", async () => {
    const m = await mods();
    const handler = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    m.registerHandler("JobSyncRequested", "t.race", handler);
    await m.enqueueEvent("JobSyncRequested", {});
    const broker = new m.MongoPollBroker();
    const now = new Date(Date.now() + 100);
    await Promise.all([m.relayOutbox({ broker, now }), m.relayOutbox({ broker, now })]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("reports lag for due events", async () => {
    const m = await mods();
    await m.enqueueEvent("JobSyncRequested", {}, { now: new Date("2026-01-01T00:00:00Z") });
    const stats = await m.outboxStats(new Date("2026-01-01T00:00:30Z"));
    expect(stats).toMatchObject({ pending: 1, lagMs: 30_000 });
  });
});

describe("brokers", () => {
  it("QStash publishes a reference only, the row becomes published, and the consumer finishes it", async () => {
    const m = await mods();
    const { QStashBroker } = await import("@/core/broker/qstash");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn(async () => 1);
    m.registerHandler("JobSyncRequested", "t.qs", handler);
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    const broker = new QStashBroker({ token: "tok", baseUrl: "https://qstash.test", appUrl: "https://app.test/" });

    const r = await m.relayOutbox({ broker, now: new Date(Date.now() + 100) });
    expect(r.published).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe("https://qstash.test/v2/publish/https://app.test/api/queue/JobSyncRequested");
    expect(init.body).toBe(JSON.stringify({ eventId }));
    expect((init.headers as Record<string, string>)["Upstash-Deduplication-Id"]).toBe(eventId);
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("published");
    expect(handler).not.toHaveBeenCalled();

    expect((await m.deliverEvent(eventId)).ok).toBe(true); // what the queue route does on the push
    expect((await m.Outbox.findOne({ eventId }).lean())?.status).toBe("done");
    vi.unstubAllGlobals();
  });

  it("falls back to in-process delivery when QStash is down", async () => {
    const m = await mods();
    const { QStashBroker } = await import("@/core/broker/qstash");
    const { FallbackBroker } = await import("@/core/broker/fallback");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 503 })));
    const handler = vi.fn(async () => 1);
    m.registerHandler("JobSyncRequested", "t.fb", handler);
    await m.enqueueEvent("JobSyncRequested", {});
    const onFallback = vi.fn();
    const broker = new FallbackBroker(new QStashBroker({ token: "t", baseUrl: "https://q.test", appUrl: "https://app.test" }), new m.MongoPollBroker(), onFallback);
    expect(await m.relayOutbox({ broker, now: new Date(Date.now() + 100) })).toMatchObject({ done: 1 });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("requeues a published event whose consumer never answered", async () => {
    const m = await mods();
    const handler = vi.fn(async () => 1);
    m.registerHandler("JobSyncRequested", "t.stale", handler);
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    await m.Outbox.collection.updateOne({ eventId }, { $set: { status: "published", updatedAt: new Date(Date.now() - 3600_000) } });
    const r = await m.relayOutbox({ broker: new m.MongoPollBroker(), now: new Date(Date.now() + 100) });
    expect(r.done).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("markDead dead-letters a published event", async () => {
    const m = await mods();
    const { eventId } = await m.enqueueEvent("JobSyncRequested", {});
    await m.markDead(eventId, "gave up");
    expect(await m.Outbox.findOne({ eventId }).lean()).toMatchObject({ status: "dead", lastError: "gave up" });
  });
});

describe("QStash signature verification", () => {
  async function sign(body: string, url: string, key: string, opts: { exp?: number; sub?: string } = {}) {
    const { SignJWT } = await import("jose");
    const { createHash } = await import("node:crypto");
    return new SignJWT({ body: createHash("sha256").update(body).digest("base64url") })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("Upstash")
      .setSubject(opts.sub ?? url)
      .setExpirationTime(opts.exp ?? Math.floor(Date.now() / 1000) + 300)
      .sign(new TextEncoder().encode(key));
  }
  const url = "https://app.test/api/queue/JobSyncRequested";
  const body = '{"eventId":"e1"}';

  it("accepts a genuine push, with either the current or the next key", async () => {
    const { verifyQStashSignature } = await import("@/core/broker/qstash");
    const signature = await sign(body, url, "next-key");
    expect(await verifyQStashSignature({ signature, body, url, keys: ["current-key", "next-key"] })).toBe(true);
  });

  it("rejects a changed body, another URL, a wrong key, a missing signature and an expired token", async () => {
    const { verifyQStashSignature } = await import("@/core/broker/qstash");
    const signature = await sign(body, url, "k");
    expect(await verifyQStashSignature({ signature, body: '{"eventId":"e2"}', url, keys: ["k"] })).toBe(false);
    expect(await verifyQStashSignature({ signature, body, url: "https://app.test/api/queue/Other", keys: ["k"] })).toBe(false);
    expect(await verifyQStashSignature({ signature, body, url, keys: ["other"] })).toBe(false);
    expect(await verifyQStashSignature({ signature: null, body, url, keys: ["k"] })).toBe(false);
    const old = await sign(body, url, "k", { exp: Math.floor(Date.now() / 1000) - 600 });
    expect(await verifyQStashSignature({ signature: old, body, url, keys: ["k"] })).toBe(false);
    expect(await verifyQStashSignature({ signature, body, url, keys: [undefined] })).toBe(false);
  });
});
