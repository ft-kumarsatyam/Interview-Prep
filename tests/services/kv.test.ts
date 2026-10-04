import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FallbackKv } from "@/core/kv/fallback";
import { MemoryKv } from "@/core/kv/memory";
import { MongoKv } from "@/core/kv/mongo";
import type { KvStore } from "@/core/kv/types";
import { UpstashKv } from "@/core/kv/upstash";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The behaviour every store must have. Mongo's TTL sweeper is slow, so expiry is checked through reads. */
function contract(name: string, make: () => KvStore) {
  describe(`KvStore contract: ${name}`, () => {
    it("stores, overwrites and deletes values", async () => {
      const kv = make();
      expect(await kv.get("a")).toBeNull();
      await kv.set("a", "1", 60);
      await kv.set("a", "2", 60);
      expect(await kv.get("a")).toBe("2");
      await kv.del("a");
      expect(await kv.get("a")).toBeNull();
    });

    it("expires values", async () => {
      const kv = make();
      await kv.set("short", "x", 1);
      await sleep(1150);
      expect(await kv.get("short")).toBeNull();
    });

    it("counts, with the window fixed by the first increment", async () => {
      const kv = make();
      expect(await kv.incr("c", 60)).toBe(1);
      expect(await kv.incr("c", 60)).toBe(2);
      expect(await kv.incr("c", 60)).toBe(3);
      expect(await kv.incr("other", 60)).toBe(1);
    });

    it("starts a new count after the window ends", async () => {
      const kv = make();
      await kv.incr("w", 1);
      await kv.incr("w", 1);
      await sleep(1150);
      expect(await kv.incr("w", 1)).toBe(1);
    });

    it("locks: one holder, release only by the owner, and expiry frees it", async () => {
      const kv = make();
      expect(await kv.setNx("lock", "A", 60)).toBe(true);
      expect(await kv.setNx("lock", "B", 60)).toBe(false);
      expect(await kv.releaseIfOwner("lock", "B")).toBe(false);
      expect(await kv.setNx("lock", "B", 60)).toBe(false);
      expect(await kv.releaseIfOwner("lock", "A")).toBe(true);
      expect(await kv.setNx("lock", "B", 1)).toBe(true);
      await sleep(1150);
      expect(await kv.setNx("lock", "C", 60)).toBe(true);
    });

    it("lets exactly one of many concurrent callers take a lock", async () => {
      const kv = make();
      const got = await Promise.all(Array.from({ length: 12 }, (_, i) => kv.setNx("race", `t${i}`, 60)));
      expect(got.filter(Boolean)).toHaveLength(1);
    });

    it("token bucket: bursts, refuses with an exact wait, refills with time, isolates keys", async () => {
      const kv = make();
      const cfg = { ratePerSec: 1, burst: 3 };
      const t = 1_000_000;
      for (let i = 0; i < 3; i++) expect(await kv.tokenBucket("tb", cfg, 1, t)).toMatchObject({ allowed: true, remaining: 2 - i });
      expect(await kv.tokenBucket("tb", cfg, 1, t)).toMatchObject({ allowed: false, remaining: 0, retryAfterMs: 1000 });
      expect(await kv.tokenBucket("tb", cfg, 1, t + 500)).toMatchObject({ allowed: false, retryAfterMs: 500 });
      expect(await kv.tokenBucket("tb", cfg, 1, t + 1000)).toMatchObject({ allowed: true });
      expect(await kv.tokenBucket("tb", cfg, 1, t + 1000)).toMatchObject({ allowed: false });
      expect(await kv.tokenBucket("other", cfg, 1, t)).toMatchObject({ allowed: true, remaining: 2 });
      expect(await kv.tokenBucket("big", cfg, 5, t)).toMatchObject({ allowed: false, retryAfterMs: Number.POSITIVE_INFINITY });
      expect(await kv.tokenBucket("tb", cfg, 1, t - 60_000)).toMatchObject({ allowed: false }); // a clock going backwards mints nothing
    });

    it("token bucket: concurrent callers never overspend the burst", async () => {
      const kv = make();
      const cfg = { ratePerSec: 0.001, burst: 5 };
      const t = 2_000_000;
      const res = await Promise.all(Array.from({ length: 20 }, () => kv.tokenBucket("race-tb", cfg, 1, t)));
      expect(res.filter((r) => r.allowed)).toHaveLength(5);
    });

    it("keeps an ordered event log per channel", async () => {
      const kv = make();
      expect(await kv.eventsLastId("ch")).toBeNull();
      const a = await kv.eventsAppend("ch", "one");
      const b = await kv.eventsAppend("ch", "two");
      const c = await kv.eventsAppend("ch", "three");
      await kv.eventsAppend("other", "elsewhere");
      expect(await kv.eventsLastId("ch")).toBe(c);
      expect((await kv.eventsRead("ch", a)).map((e) => e.data)).toEqual(["two", "three"]);
      expect((await kv.eventsRead("ch", b)).map((e) => e.data)).toEqual(["three"]);
      expect(await kv.eventsRead("ch", c)).toEqual([]);
      expect((await kv.eventsRead("ch", a, 1)).map((e) => e.data)).toEqual(["two"]);
    });

    it("never replays history for a malformed 'after'", async () => {
      const kv = make();
      await kv.eventsAppend("ch", "x");
      expect(await kv.eventsRead("ch", "garbage")).toEqual([]);
      expect(await kv.eventsRead("ch", "")).toEqual([]);
    });
  });
}

contract("memory", () => new MemoryKv());
contract("mongo", () => new MongoKv());

describe("MongoKv event log", () => {
  it("only keeps the newest few hundred events", async () => {
    const kv = new MongoKv();
    for (let i = 0; i < 305; i++) await kv.eventsAppend("big", String(i));
    const all = await kv.eventsRead("big", "0", 1000);
    expect(all.length).toBeLessThanOrEqual(300);
    expect(all.at(-1)!.data).toBe("304");
  });
});

/** A tiny fake of Upstash's REST API: enough Redis to prove the commands we send are right. */
function fakeUpstash() {
  const store = new Map<string, { v: string; exp?: number }>();
  const streams = new Map<string, Array<[string, string[]]>>();
  const bucket = new Map<string, { n: number; t: number }>();
  let seq = 0;
  const sent: unknown[][] = [];
  const live = (k: string) => {
    const e = store.get(k);
    if (e?.exp && e.exp <= Date.now()) store.delete(k);
    return store.get(k);
  };
  const run = (a: (string | number)[]): unknown => {
    sent.push(a);
    const [op, k, ...rest] = a as [string, string, ...(string | number)[]];
    switch (op) {
      case "GET": return live(k)?.v ?? null;
      case "SET": {
        const nx = rest.includes("NX");
        if (nx && live(k)) return null;
        const ex = rest.indexOf("EX");
        store.set(k, { v: String(rest[0]), ...(ex >= 0 ? { exp: Date.now() + Number(rest[ex + 1]) * 1000 } : {}) });
        return "OK";
      }
      case "DEL": return store.delete(k) ? 1 : 0;
      case "INCR": { const n = Number(live(k)?.v ?? 0) + 1; store.set(k, { v: String(n), exp: store.get(k)?.exp }); return n; }
      case "EXPIRE": { const e = live(k); if (e && !e.exp) e.exp = Date.now() + Number(rest[0]) * 1000; return 1; }
      case "EVAL": {
        if (String(k).includes("HMGET")) {
          const [, , , key, rate, burst, now, cost, ttl] = a as [string, string, number, string, number, number, number, number, number];
          const cur = bucket.get(key);
          let n = cur?.n ?? Number(burst);
          let t = cur?.t ?? Number(now);
          n = Math.min(Number(burst), n + (Math.max(0, Number(now) - t) / 1000) * Number(rate));
          t = Math.max(Number(now), t);
          let ok = 0;
          let retry = 0;
          if (Number(cost) <= n) { n -= Number(cost); ok = 1; }
          else if (Number(cost) > Number(burst)) retry = -1;
          else retry = Math.ceil(((Number(cost) - n) / Number(rate)) * 1000);
          bucket.set(key, { n, t });
          void ttl;
          return [ok, Math.floor(n * 1000), retry];
        }
        const [, , , key, token] = a as [string, string, number, string, string]; return live(key)?.v === token ? (store.delete(key), 1) : 0; }
      case "XADD": { const id = `${1000 + ++seq}-0`; const s = streams.get(k) ?? []; s.push([id, ["d", String(rest.at(-1))]]); streams.set(k, s); return id; }
      case "XRANGE": { const after = String(rest[0]).replace("(", ""); return (streams.get(k) ?? []).filter(([id]) => id > after).slice(0, Number(rest.at(-1))); }
      case "XREVRANGE": return (streams.get(k) ?? []).slice(-1);
      default: throw new Error(`unsupported ${op}`);
    }
  };
  const handler = async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const body = JSON.parse(String(init?.body));
    if (new Headers(init?.headers).get("authorization") !== "Bearer tok") return new Response("no", { status: 401 });
    const out = u.endsWith("/pipeline") ? (body as (string | number)[][]).map((c) => ({ result: run(c) })) : { result: run(body) };
    return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
  };
  return { handler, sent };
}

describe("UpstashKv", () => {
  it("speaks the REST protocol correctly and satisfies the contract", async () => {
    const fake = fakeUpstash();
    vi.stubGlobal("fetch", fake.handler);
    const kv = new UpstashKv("https://example.upstash.io", "tok");
    await kv.set("a", "1", 60);
    expect(await kv.get("a")).toBe("1");
    expect(fake.sent[0]).toEqual(["SET", "a", "1", "EX", 60]);
    expect(await kv.incr("c", 60)).toBe(1);
    expect(await kv.incr("c", 60)).toBe(2);
    expect(fake.sent.some((c) => c[0] === "EXPIRE" && c.includes("NX"))).toBe(true);
    expect(await kv.setNx("l", "A", 30)).toBe(true);
    expect(await kv.setNx("l", "B", 30)).toBe(false);
    expect(await kv.releaseIfOwner("l", "B")).toBe(false);
    expect(await kv.releaseIfOwner("l", "A")).toBe(true);
    const a = await kv.eventsAppend("ch", "one");
    const b = await kv.eventsAppend("ch", "two");
    expect((await kv.eventsRead("ch", a)).map((e) => e.data)).toEqual(["two"]);
    expect(await kv.eventsLastId("ch")).toBe(b);
    expect(await kv.eventsRead("ch", "garbage")).toEqual([]);
    expect(kv.commands).toBeGreaterThan(8);
  });

  it("sends the token bucket as one atomic EVAL with the arguments the script expects", async () => {
    const fake = fakeUpstash();
    vi.stubGlobal("fetch", fake.handler);
    const kv = new UpstashKv("https://example.upstash.io", "tok");
    const cfg = { ratePerSec: 0.5, burst: 2 };
    expect(await kv.tokenBucket("k", cfg, 1, 5000)).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });
    expect(await kv.tokenBucket("k", cfg, 1, 5000)).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
    expect(await kv.tokenBucket("k", cfg, 1, 5000)).toEqual({ allowed: false, remaining: 0, retryAfterMs: 2000 });
    const call = fake.sent.filter((c) => c[0] === "EVAL").at(-1)!;
    expect(call.slice(2)).toEqual([1, "tb:k", 0.5, 2, 5000, 1, 5]);
    expect(String(call[1])).toContain("HMGET");
  });

  it("rejects a wrong token and surfaces Redis errors", async () => {
    const fake = fakeUpstash();
    vi.stubGlobal("fetch", fake.handler);
    await expect(new UpstashKv("https://example.upstash.io", "wrong").get("a")).rejects.toThrow(/401/);
  });
});

describe("FallbackKv", () => {
  it("uses Mongo when Upstash fails, and says so once", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });
    const log: string[] = [];
    const kv = new FallbackKv(new UpstashKv("https://example.upstash.io", "tok", 200), new MemoryKv(), (m) => log.push(m));
    await kv.set("a", "1", 60);
    expect(await kv.get("a")).toBe("1");
    expect(await kv.incr("n", 60)).toBe(1);
    expect(kv.fallbacks).toBe(3);
    expect(log).toHaveLength(1);
    expect(kv.name).toBe("upstash");
  });
  it("uses the primary while it works", async () => {
    const primary = new MemoryKv();
    const fallback = new MemoryKv();
    const kv = new FallbackKv(primary, fallback);
    await kv.set("k", "v", 60);
    expect(await primary.get("k")).toBe("v");
    expect(await fallback.get("k")).toBeNull();
    expect(kv.fallbacks).toBe(0);
  });
});

describe("limited() guard", () => {
  it("allows up to the limit then blocks with a wait message, per action", async () => {
    const { limited, LIMITS } = await import("@/core/services/rate-limit");
    for (let i = 0; i < LIMITS.jobRefresh.max; i++) expect(await limited("jobRefresh")).toBeNull();
    expect(await limited("jobRefresh")).toMatch(/Too many requests. Try again in \d+ (seconds|minutes)/);
    expect(await limited("addSource")).toBeNull();
  });
});
