import { describe, expect, it } from "vitest";
import { API_SCOPES, createTokenSchema, expiryFor, hasScopes, hashToken, LAST_USED_GRANULARITY_MS, newToken, parseBearer, shouldTouch, tokenState } from "@/core/domain/api-token";
import { decide, parseIdempotencyKey, requestFingerprint, shouldStore, storageKey } from "@/core/domain/idempotency";

const bytes = (n = 40, v = 7) => new Uint8Array(n).fill(v);

describe("newToken", () => {
  it("has the pk_<8>_<32> shape, a stored hash that is not the token, and is deterministic for the same bytes", () => {
    const t = newToken(bytes());
    expect(t.token).toMatch(/^pk_[a-z0-9]{8}_[a-z0-9]{32}$/);
    expect(t.prefix).toHaveLength(8);
    expect(t.token.includes(t.prefix)).toBe(true);
    expect(t.hash).toBe(hashToken(t.token));
    expect(t.hash).not.toContain(t.token);
    expect(t.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(newToken(bytes()).token).toBe(t.token);
    expect(newToken(bytes(40, 9)).token).not.toBe(t.token);
  });
  it("refuses too little randomness", () => expect(() => newToken(new Uint8Array(10))).toThrow(/random/));
});

describe("parseBearer", () => {
  const { token } = newToken(bytes());
  it("extracts a well-formed token", () => {
    expect(parseBearer(`Bearer ${token}`)).toBe(token);
    expect(parseBearer(`  Bearer   ${token}  `)).toBe(token);
  });
  it.each([null, undefined, "", "Bearer", "Bearer abc", "Basic xyz", `bearer ${"pk_aaaaaaaa_" + "b".repeat(32)}`, "Bearer pk_AAAAAAAA_" + "b".repeat(32), "Bearer pk_aaaaaaaa_" + "b".repeat(31), "Bearer pk_aaaaaaaa_" + "b".repeat(33)])("rejects %s", (h) => expect(parseBearer(h as string | null)).toBeNull());
});

describe("tokenState, scopes and expiry", () => {
  const now = new Date("2026-10-05T00:00:00Z");
  it("is ok before expiry, expired at and after it, and revoked wins", () => {
    expect(tokenState({ expiresAt: new Date("2026-10-06T00:00:00Z"), revokedAt: null }, now)).toBe("ok");
    expect(tokenState({ expiresAt: now, revokedAt: null }, now)).toBe("expired");
    expect(tokenState({ expiresAt: new Date("2026-01-01"), revokedAt: null }, now)).toBe("expired");
    expect(tokenState({ expiresAt: new Date("2027-01-01"), revokedAt: now }, now)).toBe("revoked");
  });
  it("requires every needed scope", () => {
    expect(hasScopes(["jobs:read", "capture:write"], ["capture:write"])).toBe(true);
    expect(hasScopes(["jobs:read"], ["jobs:read", "jobs:write"])).toBe(false);
    expect(hasScopes([], [])).toBe(true);
    expect(hasScopes(["jobs:write"], ["jobs:read"])).toBe(false);
  });
  it("clamps expiry to between 1 and 365 days", () => {
    expect(expiryFor(now, 30).toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(expiryFor(now, 0).getTime()).toBe(now.getTime() + 86_400_000);
    expect(expiryFor(now, 9999).getTime()).toBe(now.getTime() + 365 * 86_400_000);
  });
  it("only touches last-used after the granularity", () => {
    expect(shouldTouch(null, now)).toBe(true);
    expect(shouldTouch(new Date(now.getTime() - LAST_USED_GRANULARITY_MS + 1), now)).toBe(false);
    expect(shouldTouch(new Date(now.getTime() - LAST_USED_GRANULARITY_MS), now)).toBe(true);
  });
});

describe("createTokenSchema", () => {
  it("accepts a named token with scopes and defaults the lifetime", () => {
    expect(createTokenSchema.parse({ name: "Chrome extension", scopes: ["capture:write"] })).toEqual({ name: "Chrome extension", scopes: ["capture:write"], days: 90 });
  });
  it("rejects no scopes, unknown scopes, a short name and an excessive lifetime", () => {
    for (const bad of [{ name: "x", scopes: ["jobs:read"] }, { name: "ok name", scopes: [] }, { name: "ok name", scopes: ["admin"] }, { name: "ok name", scopes: ["jobs:read"], days: 400 }, { name: "ok name", scopes: ["jobs:read"], days: 0 }]) expect(createTokenSchema.safeParse(bad).success).toBe(false);
    expect(API_SCOPES.length).toBe(3);
  });
});

describe("idempotency rules", () => {
  it("parses keys: absent is fine, malformed is flagged", () => {
    expect(parseIdempotencyKey(null)).toEqual({ key: null, invalid: false });
    expect(parseIdempotencyKey("  ")).toEqual({ key: null, invalid: false });
    expect(parseIdempotencyKey("abc12345-key")).toEqual({ key: "abc12345-key", invalid: false });
    for (const bad of ["short", "has space in it", "x".repeat(129), "bad/slash!!"]) expect(parseIdempotencyKey(bad)).toEqual({ key: null, invalid: true });
  });
  it("fingerprints method, path and body, so any change differs", () => {
    const f = requestFingerprint("post", "/api/v1/jobs", '{"a":1}');
    expect(f).toBe(requestFingerprint("POST", "/api/v1/jobs", '{"a":1}'));
    for (const other of [requestFingerprint("PUT", "/api/v1/jobs", '{"a":1}'), requestFingerprint("POST", "/api/v1/other", '{"a":1}'), requestFingerprint("POST", "/api/v1/jobs", '{"a":2}')]) expect(other).not.toBe(f);
  });
  it("decides: proceed when nothing is stored, replay on the same request, conflict on a different one", () => {
    const stored = { status: 201, body: { id: "x" }, fingerprint: "fp1" };
    expect(decide(null, "fp1")).toEqual({ kind: "proceed" });
    expect(decide(stored, "fp1")).toEqual({ kind: "replay", stored });
    expect(decide(stored, "fp2")).toEqual({ kind: "conflict" });
  });
  it("stores successes and client errors but never a 5xx, and scopes keys per token", () => {
    expect([200, 201, 400, 404, 422, 429].every(shouldStore)).toBe(true);
    expect([500, 502, 503].some(shouldStore)).toBe(false);
    expect(storageKey("t1", "k")).not.toBe(storageKey("t2", "k"));
  });
});
