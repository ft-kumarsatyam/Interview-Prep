import { beforeAll, describe, expect, it } from "vitest";
import { REMEMBER_TTL_MS, RENEW_AFTER_MS, SHORT_TTL_MS, sessionTtlMs, shouldRenew } from "@/lib/domain/session-policy";
import { signSession, verifySession } from "@/lib/auth/session";

const now = new Date("2026-10-02T12:00:00Z");
const secs = (d: Date) => Math.floor(d.getTime() / 1000);

describe("session policy", () => {
  it("uses 30 days when remembered and 12 hours otherwise", () => {
    expect(sessionTtlMs(true)).toBe(REMEMBER_TTL_MS);
    expect(sessionTtlMs(false)).toBe(SHORT_TTL_MS);
    expect(SHORT_TTL_MS).toBe(12 * 3_600_000);
  });

  it("renews remembered sessions after a week, never short ones", () => {
    const weekOld = secs(new Date(now.getTime() - RENEW_AFTER_MS));
    const dayOld = secs(new Date(now.getTime() - 86_400_000));
    expect(shouldRenew({ remember: true, issuedAt: weekOld }, now)).toBe(true);
    expect(shouldRenew({ remember: true, issuedAt: dayOld }, now)).toBe(false);
    expect(shouldRenew({ remember: false, issuedAt: weekOld }, now)).toBe(false);
  });
});

describe("session tokens", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters";
  });

  it("round-trips the remember flag", async () => {
    const remembered = await signSession(true);
    const short = await signSession(false);
    expect(await verifySession(remembered.token)).toMatchObject({ remember: true });
    expect(await verifySession(short.token)).toMatchObject({ remember: false });
    expect(short.expires.getTime() - Date.now()).toBeLessThanOrEqual(SHORT_TTL_MS);
  });

  it("rejects expired and tampered tokens", async () => {
    const old = await signSession(false, new Date(Date.now() - SHORT_TTL_MS - 60_000));
    expect(await verifySession(old.token)).toBeNull();
    const { token } = await signSession(true);
    expect(await verifySession(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
