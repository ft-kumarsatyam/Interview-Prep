/**
 * Idempotency-Key rules for POST routes. The same key with the same request replays the first response; the same key
 * with a different request is a client bug and is refused; a request still running is told to wait. Pure.
 */
import { createHash } from "node:crypto";

export const IDEMPOTENCY_TTL_SEC = 24 * 3600;
export const IDEMPOTENCY_LOCK_SEC = 60;

const KEY = /^[A-Za-z0-9._:-]{8,128}$/;

/** A usable key, or null (absent or malformed keys are ignored for absent, rejected by the caller for malformed). */
export function parseIdempotencyKey(header: string | null): { key: string | null; invalid: boolean } {
  if (header === null || header.trim() === "") return { key: null, invalid: false };
  const k = header.trim();
  return KEY.test(k) ? { key: k, invalid: false } : { key: null, invalid: true };
}

/** A fingerprint of the request, so a reused key with different content is detected. Method, path and body all count. */
export function requestFingerprint(method: string, path: string, body: string): string {
  return createHash("sha256").update(`${method.toUpperCase()}\u0000${path}\u0000${body}`).digest("hex").slice(0, 32);
}

export interface StoredResponse {
  status: number;
  body: unknown;
  fingerprint: string;
}

export type IdempotencyDecision = { kind: "replay"; stored: StoredResponse } | { kind: "conflict" } | { kind: "proceed" };

/** What to do given what is stored under this key (or nothing). */
export function decide(stored: StoredResponse | null, fingerprint: string): IdempotencyDecision {
  if (!stored) return { kind: "proceed" };
  return stored.fingerprint === fingerprint ? { kind: "replay", stored } : { kind: "conflict" };
}

/** Only complete, non-server-error answers are stored: a 5xx must be retryable with the same key. */
export const shouldStore = (status: number) => status < 500;

export const storageKey = (tokenId: string, key: string) => `idem:${tokenId}:${key}`;
export const lockKey = (tokenId: string, key: string) => `idem-lock:${tokenId}:${key}`;
