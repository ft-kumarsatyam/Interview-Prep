import { describe, expect, it } from "vitest";
import { backoffDelayMs, isRetryableStatus, parseRetryAfterMs, retryDelayMs, shouldRetry, RETRY_AFTER_CAP_MS } from "@/core/domain/http-policy";

describe("parseRetryAfterMs", () => {
  it("parses seconds and dates", () => {
    expect(parseRetryAfterMs("3", 0)).toBe(3000);
    expect(parseRetryAfterMs("Thu, 01 Jan 1970 00:00:10 GMT", 4000)).toBe(6000);
    expect(parseRetryAfterMs("Thu, 01 Jan 1970 00:00:01 GMT", 4000)).toBe(0);
  });
  it("returns null for junk", () => {
    expect(parseRetryAfterMs("soon", 0)).toBeNull();
    expect(parseRetryAfterMs(null, 0)).toBeNull();
  });
});

describe("backoffDelayMs", () => {
  it("grows exponentially with jitter", () => {
    expect(backoffDelayMs(0, 400, 0)).toBe(200);
    expect(backoffDelayMs(0, 400, 0.999999)).toBe(400);
    expect(backoffDelayMs(2, 400, 0.999999)).toBe(1600);
  });
  it("is capped", () => {
    expect(backoffDelayMs(20, 400, 0.999999)).toBeLessThanOrEqual(8000);
  });
});

describe("shouldRetry", () => {
  const base = { attempt: 0, retries: 1, method: "GET" };
  it("retries 429, 5xx and network errors", () => {
    expect(isRetryableStatus(503)).toBe(true);
    expect(shouldRetry({ ...base, outcome: { kind: "response", status: 429 } })).toBe(true);
    expect(shouldRetry({ ...base, outcome: { kind: "response", status: 502 } })).toBe(true);
    expect(shouldRetry({ ...base, outcome: { kind: "error", aborted: false } })).toBe(true);
  });
  it("does not retry 4xx, caller aborts or exhausted attempts", () => {
    expect(shouldRetry({ ...base, outcome: { kind: "response", status: 404 } })).toBe(false);
    expect(shouldRetry({ ...base, outcome: { kind: "error", aborted: true } })).toBe(false);
    expect(shouldRetry({ ...base, attempt: 1, outcome: { kind: "response", status: 500 } })).toBe(false);
  });
  it("does not retry POST unless told", () => {
    const outcome = { kind: "response", status: 500 } as const;
    expect(shouldRetry({ ...base, method: "POST", outcome })).toBe(false);
    expect(shouldRetry({ ...base, method: "POST", outcome, retryNonIdempotent: true })).toBe(true);
  });
});

describe("retryDelayMs", () => {
  it("honours Retry-After up to the cap", () => {
    expect(retryDelayMs({ attempt: 0, baseMs: 400, random: 0, retryAfterMs: 1000 })).toBe(1000);
    expect(retryDelayMs({ attempt: 0, baseMs: 400, random: 0, retryAfterMs: 60_000 })).toBe(RETRY_AFTER_CAP_MS);
    expect(retryDelayMs({ attempt: 0, baseMs: 400, random: 0, retryAfterMs: null })).toBe(200);
  });
});
