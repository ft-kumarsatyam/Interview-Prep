import { describe, expect, it } from "vitest";
import { bucketFor, bucketTtlSec, refill, take, type BucketState } from "@/core/domain/rate-limit";

const cfg = { ratePerSec: 1, burst: 5 };

describe("bucketFor", () => {
  it("turns max-per-window into burst and rate", () => {
    expect(bucketFor({ max: 60, windowSec: 600 })).toEqual({ ratePerSec: 0.1, burst: 60 });
    expect(bucketTtlSec(bucketFor({ max: 6, windowSec: 600 }))).toBe(601);
  });
});

describe("refill", () => {
  it("starts a new bucket full", () => {
    expect(refill(null, 1000, cfg)).toEqual({ tokens: 5, at: 1000 });
  });
  it("adds rate x elapsed time and never exceeds the burst", () => {
    expect(refill({ tokens: 1, at: 0 }, 2000, cfg).tokens).toBe(3);
    expect(refill({ tokens: 1, at: 0 }, 3_600_000, cfg).tokens).toBe(5);
  });
  it("ignores a clock that moved backwards", () => {
    expect(refill({ tokens: 2, at: 10_000 }, 5000, cfg)).toEqual({ tokens: 2, at: 10_000 });
  });
});

describe("take", () => {
  it("allows a full burst, then refuses with an exact wait", () => {
    let s: BucketState | null = null;
    for (let i = 0; i < 5; i++) {
      const r = take(s, 0, cfg);
      expect(r.result.allowed).toBe(true);
      s = r.state;
    }
    const denied = take(s, 0, cfg);
    expect(denied.result).toEqual({ allowed: false, remaining: 0, retryAfterMs: 1000 });
    expect(take(denied.state, 1000, cfg).result.allowed).toBe(true);
  });
  it("has no boundary spike: waiting half a window yields half a burst, not a full one", () => {
    const fast = { ratePerSec: 0.1, burst: 10 };
    let s: BucketState | null = null;
    for (let i = 0; i < 10; i++) s = take(s, 0, fast).state;
    let granted = 0;
    for (let i = 0; i < 10; i++) {
      const r = take(s, 50_000, fast);
      s = r.state;
      if (r.result.allowed) granted++;
    }
    expect(granted).toBe(5);
  });
  it("supports costs and refuses one that can never fit", () => {
    expect(take(null, 0, cfg, 3).result).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
    expect(take(null, 0, cfg, 6).result).toMatchObject({ allowed: false, retryAfterMs: Number.POSITIVE_INFINITY });
  });
  it("does not spend tokens on a refusal", () => {
    const s: BucketState = { tokens: 0.5, at: 0 };
    expect(take(s, 0, cfg).state.tokens).toBe(0.5);
  });
});
