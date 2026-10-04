import { beforeEach, describe, expect, it, vi } from "vitest";
import { bumpVersion, cacheStats, readThrough, resetCacheStats } from "@/core/cache";
import { runAsOwner } from "@/core/db/owner";
import { MemoryKv } from "@/core/kv/memory";
import type { KvStore } from "@/core/kv/types";

let clock = 1_000_000;
const now = () => clock;
let kv: MemoryKv;
beforeEach(() => {
  clock = 1_000_000;
  kv = new MemoryKv(now);
  resetCacheStats();
});

describe("readThrough", () => {
  it("computes once, then serves hits until the ttl", async () => {
    const compute = vi.fn(async () => ({ n: 1 }));
    const read = () => readThrough("jobs", "all", compute, { ttlSec: 60, kv, now });
    expect(await read()).toEqual({ n: 1 });
    expect(await read()).toEqual({ n: 1 });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cacheStats()).toMatchObject({ hits: 1, misses: 1 });
    clock += 61_000;
    await read();
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("keeps entries per name and per owner", async () => {
    const a = await readThrough("jobs", "x", async () => "a", { ttlSec: 60, kv, now });
    const b = await readThrough("jobs", "y", async () => "b", { ttlSec: 60, kv, now });
    const other = await runAsOwner("bob", async () => await readThrough("jobs", "x", async () => "bob", { ttlSec: 60, kv, now }));
    expect([a, b, other]).toEqual(["a", "b", "bob"]);
  });

  it("bumping the version invalidates every entry of the scope, and only that scope", async () => {
    let n = 0;
    const jobs = () => readThrough("jobs", "x", async () => ++n, { ttlSec: 600, kv, now });
    const stats = () => readThrough("stats", "x", async () => 100, { ttlSec: 600, kv, now });
    expect(await jobs()).toBe(1);
    await stats();
    await bumpVersion("jobs", kv);
    expect(await jobs()).toBe(2);
    await stats();
    expect(cacheStats()).toMatchObject({ hits: 1, misses: 3 });
  });

  it("single-flight: many concurrent misses run the computation once", async () => {
    let calls = 0;
    const compute = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 120));
      return "value";
    };
    const results = await Promise.all(Array.from({ length: 25 }, () => readThrough("jobs", "heavy", compute, { ttlSec: 60, kv })));
    expect(new Set(results)).toEqual(new Set(["value"]));
    expect(calls).toBe(1);
    expect(cacheStats()).toMatchObject({ misses: 25, coalesced: 24 });
  });

  it("stale-while-revalidate: serves the old value at once and refreshes in the background", async () => {
    let version = 1;
    const jobs: Array<() => Promise<void>> = [];
    const read = () => readThrough("jobs", "swr", async () => version, { ttlSec: 10, staleSec: 50, kv, now, background: (j) => void jobs.push(j) });
    expect(await read()).toBe(1);
    version = 2;
    clock += 20_000;
    expect(await read()).toBe(1); // stale, served instantly
    expect(await read()).toBe(1); // still stale until the refresh runs
    expect(jobs).toHaveLength(2);
    await jobs[0]!();
    await jobs[1]!(); // the second finds the lock free but recomputes harmlessly
    expect(await read()).toBe(2);
    expect(cacheStats().stale).toBe(2);
  });

  it("a refresh already in progress is not duplicated", async () => {
    const lock = new MemoryKv(now);
    await readThrough("jobs", "dup", async () => 1, { ttlSec: 1, staleSec: 60, kv: lock, now });
    clock += 5000;
    let runs = 0;
    const slow = async () => {
      runs++;
      await new Promise((r) => setTimeout(r, 50));
      return 2;
    };
    const jobs: Array<() => Promise<void>> = [];
    const read = () => readThrough("jobs", "dup", slow, { ttlSec: 1, staleSec: 60, kv: lock, now, background: (j) => void jobs.push(j) });
    await read();
    await read();
    await Promise.all(jobs.map((j) => j()));
    expect(runs).toBe(1);
  });

  it("serves a value past ttl+stale as a fresh compute", async () => {
    let n = 0;
    const read = () => readThrough("jobs", "old", async () => ++n, { ttlSec: 10, staleSec: 10, kv, now });
    await read();
    clock += 25_000;
    expect(await read()).toBe(2);
  });

  it("a failing store never breaks the read", async () => {
    const broken = new Proxy(kv, { get: () => () => Promise.reject(new Error("redis down")) }) as unknown as KvStore;
    expect(await readThrough("jobs", "x", async () => "fine", { ttlSec: 60, kv: broken, now })).toBe("fine");
    expect(cacheStats().errors).toBe(1);
  });

  it("a computation that throws is not cached and frees the lock", async () => {
    let fail = true;
    const read = () => readThrough("jobs", "boom", async () => { if (fail) throw new Error("db"); return "ok"; }, { ttlSec: 60, kv, now });
    await expect(read()).rejects.toThrow("db");
    fail = false;
    expect(await read()).toBe("ok");
  });
});
