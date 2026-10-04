import { describe, expect, it } from "vitest";
import { backoffMs, onFailure, outboxLagMs, DEFAULT_RETRY } from "@/core/domain/retry";

const policy = { maxAttempts: 4, baseMs: 1000, capMs: 10_000 };

describe("backoffMs", () => {
  it("doubles the ceiling each attempt and applies full jitter", () => {
    expect(backoffMs(1, 0.999999, policy)).toBe(999);
    expect(backoffMs(2, 0.5, policy)).toBe(1000);
    expect(backoffMs(3, 0.5, policy)).toBe(2000);
    expect(backoffMs(1, 0, policy)).toBe(0);
  });
  it("never exceeds the cap, even for huge attempt counts", () => {
    expect(backoffMs(40, 0.999999, policy)).toBeLessThanOrEqual(10_000);
    expect(backoffMs(1000, 0.9, policy)).toBeLessThanOrEqual(10_000);
  });
  it("treats attempt < 1 and out-of-range random safely", () => {
    expect(backoffMs(0, 0.5, policy)).toBe(500);
    expect(backoffMs(2, 5, policy)).toBeLessThan(2000);
    expect(backoffMs(2, -1, policy)).toBe(0);
  });
});

describe("onFailure", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("retries with a future due time", () => {
    const r = onFailure(0, now, 0.5, policy);
    expect(r).toMatchObject({ status: "retry", attempts: 1 });
    if (r.status === "retry") expect(r.nextAttemptAt.getTime()).toBe(now.getTime() + 500);
  });
  it("dead-letters on the last allowed attempt", () => {
    expect(onFailure(2, now, 0.5, policy)).toEqual({ status: "retry", attempts: 3, nextAttemptAt: expect.any(Date) });
    expect(onFailure(3, now, 0.5, policy)).toEqual({ status: "dead", attempts: 4 });
    expect(onFailure(10, now, 0.5, policy)).toEqual({ status: "dead", attempts: 11 });
  });
  it("has a sane default policy", () => {
    expect(DEFAULT_RETRY.maxAttempts).toBeGreaterThan(1);
  });
});

describe("outboxLagMs", () => {
  it("is zero with nothing pending and never negative", () => {
    const now = new Date("2026-01-01T00:00:10Z");
    expect(outboxLagMs(null, now)).toBe(0);
    expect(outboxLagMs(new Date("2026-01-01T00:00:00Z"), now)).toBe(10_000);
    expect(outboxLagMs(new Date("2026-01-01T00:01:00Z"), now)).toBe(0);
  });
});
