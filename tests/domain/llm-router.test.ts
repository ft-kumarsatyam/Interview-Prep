import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAID_SETTINGS,
  FEATURE_POLICY,
  INITIAL_STATE,
  afterFailure,
  afterSuccess,
  classifyHttp,
  isAvailable,
  paidDecision,
  planOrder,
  type ProviderState,
} from "@/lib/domain/llm-router";

const NOW = 1_000_000;
const NEXT_DAY = NOW + 5 * 3_600_000;

describe("provider state machine", () => {
  it("starts available", () => {
    expect(isAvailable(INITIAL_STATE, NOW)).toBe(true);
  });

  it("a rate limit cools the provider down for Retry-After, then it comes back", () => {
    const s = afterFailure(INITIAL_STATE, { kind: "rate", retryAfterSec: 30 }, NOW, NEXT_DAY);
    expect(s).toMatchObject({ status: "cooldown", untilMs: NOW + 30_000, lastError: "rate" });
    expect(isAvailable(s, NOW + 29_999)).toBe(false);
    expect(isAvailable(s, NOW + 30_000)).toBe(true);
  });

  it("defaults a rate-limit cooldown to 60 s and caps it at an hour", () => {
    expect(afterFailure(INITIAL_STATE, { kind: "rate" }, NOW, NEXT_DAY).untilMs).toBe(NOW + 60_000);
    expect(afterFailure(INITIAL_STATE, { kind: "rate", retryAfterSec: 99_999 }, NOW, NEXT_DAY).untilMs).toBe(NOW + 3_600_000);
  });

  it("a daily quota cools it down until the next day starts", () => {
    const s = afterFailure(INITIAL_STATE, { kind: "quota-day" }, NOW, NEXT_DAY);
    expect(s.untilMs).toBe(NEXT_DAY);
    expect(isAvailable(s, NEXT_DAY - 1)).toBe(false);
    expect(isAvailable(s, NEXT_DAY)).toBe(true);
  });

  it("an auth failure disables it until the key is fixed, never recovering by time", () => {
    const s = afterFailure(INITIAL_STATE, { kind: "auth" }, NOW, NEXT_DAY);
    expect(s.status).toBe("disabled");
    expect(isAvailable(s, NOW + 10 * 3_600_000)).toBe(false);
  });

  it("two transient failures in a row cool it down for 5 minutes; one does not", () => {
    const one = afterFailure(INITIAL_STATE, { kind: "server" }, NOW, NEXT_DAY);
    expect(one).toMatchObject({ status: "closed", fails: 1 });
    expect(isAvailable(one, NOW)).toBe(true);
    const two = afterFailure(one, { kind: "timeout" }, NOW, NEXT_DAY);
    expect(two).toMatchObject({ status: "cooldown", untilMs: NOW + 300_000 });
  });

  it("a success resets everything", () => {
    const failed: ProviderState = { status: "closed", untilMs: 0, fails: 1, lastError: "server" };
    expect(afterSuccess()).toEqual(INITIAL_STATE);
    expect(failed.fails).toBe(1);
  });

  it("a bad reply from the model does not penalise the provider", () => {
    const s: ProviderState = { status: "closed", untilMs: 0, fails: 1, lastError: "server" };
    expect(afterFailure(s, { kind: "invalid-output" }, NOW, NEXT_DAY)).toBe(s);
  });
});

describe("classifyHttp", () => {
  it("separates a short rate limit from a daily quota", () => {
    expect(classifyHttp(429, '{"error":{"message":"Rate limit reached"}}', "12")).toEqual({ kind: "rate", retryAfterSec: 12 });
    expect(classifyHttp(429, "Quota exceeded for metric generate_content_free_tier_requests, limit: 250 per day").kind).toBe("quota-day");
    expect(classifyHttp(429, "Rate limit reached for model on tokens per day (TPD)").kind).toBe("quota-day");
  });

  it("reads retry hints from Gemini and Groq bodies", () => {
    expect(classifyHttp(429, '{"details":[{"retryDelay":"34s"}]}')).toEqual({ kind: "rate", retryAfterSec: 34 });
    expect(classifyHttp(429, "Please try again in 7.5s.")).toEqual({ kind: "rate", retryAfterSec: 8 });
    expect(classifyHttp(429, "Please try again in 1m3.2s.")).toEqual({ kind: "rate", retryAfterSec: 64 });
  });

  it("treats bad keys as auth, including Gemini's HTTP 400", () => {
    expect(classifyHttp(401, "").kind).toBe("auth");
    expect(classifyHttp(403, "").kind).toBe("auth");
    expect(classifyHttp(400, '{"error":{"message":"API key not valid. Please pass a valid API key."}}').kind).toBe("auth");
    expect(classifyHttp(400, "Invalid API Key").kind).toBe("auth");
  });

  it("treats 'payment required / credits depleted' as a spent quota, not a transient error", () => {
    expect(classifyHttp(402, '{"error":{"code":402,"message":"Your prepayment credits are depleted."}}').kind).toBe("quota-day");
  });

  it("classifies the rest", () => {
    expect(classifyHttp(503, "").kind).toBe("server");
    expect(classifyHttp(408, "").kind).toBe("timeout");
    expect(classifyHttp(400, "bad schema").kind).toBe("bad-request");
    expect(classifyHttp(404, "model not found").kind).toBe("bad-request");
  });
});

describe("planOrder", () => {
  it("puts preferred providers first and the paid one always last", () => {
    expect(planOrder(["gemini", "groq", "meta"], FEATURE_POLICY.hint)).toEqual(["groq", "gemini", "meta"]);
    expect(planOrder(["meta", "gemini", "groq"], FEATURE_POLICY["code-review"])).toEqual(["gemini", "groq", "meta"]);
  });

  it("ignores preferences that aren't configured and works without a paid provider", () => {
    expect(planOrder(["gemini"], FEATURE_POLICY.hint)).toEqual(["gemini"]);
    expect(planOrder(["groq", "gemini"], FEATURE_POLICY.background)).toEqual(["groq", "gemini"]);
  });

  it("never lets a feature prefer the paid provider", () => {
    expect(planOrder(["gemini", "meta"], { prefer: ["meta"], paid: "confirm" })).toEqual(["gemini", "meta"]);
  });
});

describe("paidDecision", () => {
  const base = { policy: FEATURE_POLICY.explain, settings: DEFAULT_PAID_SETTINGS, usedToday: 0, approvedToday: false, once: false };

  it("background features never spend money", () => {
    expect(paidDecision({ ...base, policy: FEATURE_POLICY.background, once: true, approvedToday: true })).toEqual({ kind: "blocked", reason: "never" });
  });

  it("asks first by default", () => {
    expect(paidDecision(base)).toEqual({ kind: "needs_confirm", used: 0, cap: 20 });
  });

  it("allows after a one-off or a today approval", () => {
    expect(paidDecision({ ...base, once: true })).toEqual({ kind: "allowed" });
    expect(paidDecision({ ...base, approvedToday: true })).toEqual({ kind: "allowed" });
  });

  it("is blocked when switched off or over the daily cap, even if approved", () => {
    expect(paidDecision({ ...base, settings: { ...base.settings, enabled: false }, once: true })).toEqual({ kind: "blocked", reason: "disabled" });
    expect(paidDecision({ ...base, usedToday: 20, once: true })).toEqual({ kind: "blocked", reason: "cap" });
    expect(paidDecision({ ...base, usedToday: 19, once: true })).toEqual({ kind: "allowed" });
  });

  it("skips the prompt only if confirmation is turned off in settings", () => {
    expect(paidDecision({ ...base, settings: { ...base.settings, requireConfirm: false } })).toEqual({ kind: "allowed" });
  });
});
