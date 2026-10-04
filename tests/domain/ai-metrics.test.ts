import { describe, expect, it } from "vitest";
import { cacheHitRate, estimateTokens, latencyBucket, LATENCY_BUCKETS, percentileMs } from "@/modules/ai/domain/ai-metrics";

describe("latencyBucket", () => {
  it("places values in the right bucket, including the edges and the open end", () => {
    expect(latencyBucket(0)).toBe(0);
    expect(latencyBucket(249)).toBe(0);
    expect(latencyBucket(250)).toBe(1);
    expect(latencyBucket(15_999)).toBe(6);
    expect(latencyBucket(16_000)).toBe(7);
    expect(latencyBucket(10_000_000)).toBe(LATENCY_BUCKETS - 1);
  });
});

describe("percentileMs", () => {
  it("is null with no data", () => {
    expect(percentileMs([0, 0, 0, 0, 0, 0, 0, 0], 0.5)).toBeNull();
  });
  it("reads p50 and p95 from the histogram", () => {
    const h = [0, 50, 40, 5, 5, 0, 0, 0]; // 100 calls
    expect(percentileMs(h, 0.5)).toBe(500);
    expect(percentileMs(h, 0.95)).toBe(2000);
    expect(percentileMs(h, 1)).toBe(4000);
  });
  it("reports the open bucket as twice the last bound", () => {
    expect(percentileMs([0, 0, 0, 0, 0, 0, 0, 3], 0.5)).toBe(32_000);
  });
});

describe("estimateTokens and cacheHitRate", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("abcde")).toBe(2);
  });
  it("computes a hit rate", () => {
    expect(cacheHitRate(0, 0)).toBeNull();
    expect(cacheHitRate(3, 1)).toBe(0.75);
  });
});
