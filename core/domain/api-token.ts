/**
 * API tokens for the public API (and the Chrome extension). A token looks like `pk_<prefix>_<secret>`: the prefix names it
 * in the Settings list, the secret is shown once and only its SHA-256 hash is stored. Scopes limit what a token can do and
 * an expiry limits how long. Pure: randomness and the clock are passed in.
 */
import { createHash } from "node:crypto";
import { z } from "zod";

export const API_SCOPES = ["jobs:read", "jobs:write", "capture:write"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const SCOPE_LABEL: Record<ApiScope, string> = {
  "jobs:read": "Read your tracked jobs",
  "jobs:write": "Push job postings into Discover",
  "capture:write": "Capture a job or profile page into PrepOS",
};

export const TOKEN_PREFIX = "pk";
export const MAX_TOKEN_DAYS = 365;
export const DEFAULT_TOKEN_DAYS = 90;
export const MAX_TOKENS = 20;

export const createTokenSchema = z.object({
  name: z.string().trim().min(2, "Give the token a name").max(60),
  scopes: z.array(z.enum(API_SCOPES)).min(1, "Pick at least one scope").max(API_SCOPES.length),
  days: z.number().int().min(1).max(MAX_TOKEN_DAYS).default(DEFAULT_TOKEN_DAYS),
});
export type CreateTokenInput = z.input<typeof createTokenSchema>;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const fromBytes = (bytes: Uint8Array, n: number) => Array.from(bytes.slice(0, n), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** `bytes` must be at least 40 random bytes (crypto.getRandomValues). Returns the plaintext (shown once), its prefix and hash. */
export function newToken(bytes: Uint8Array): { token: string; prefix: string; hash: string } {
  if (bytes.length < 40) throw new Error("not enough random bytes");
  const prefix = fromBytes(bytes, 8);
  const secret = fromBytes(bytes.slice(8), 32);
  const token = `${TOKEN_PREFIX}_${prefix}_${secret}`;
  return { token, prefix, hash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const BEARER = /^Bearer\s+(pk_[a-z0-9]{8}_[a-z0-9]{32})$/;

/** The token in an `Authorization: Bearer ...` header, or null if it is missing or not shaped like ours. */
export function parseBearer(header: string | null | undefined): string | null {
  const m = BEARER.exec((header ?? "").trim());
  return m ? m[1]! : null;
}

export interface TokenRow {
  scopes: readonly string[];
  expiresAt: Date;
  revokedAt: Date | null;
}

export type TokenState = "ok" | "expired" | "revoked";

export function tokenState(row: Pick<TokenRow, "expiresAt" | "revokedAt">, now: Date): TokenState {
  if (row.revokedAt) return "revoked";
  return row.expiresAt.getTime() <= now.getTime() ? "expired" : "ok";
}

/** True when the token has every scope the route needs. */
export const hasScopes = (granted: readonly string[], needed: readonly ApiScope[]) => needed.every((s) => granted.includes(s));

export const expiryFor = (now: Date, days: number) => new Date(now.getTime() + Math.min(Math.max(days, 1), MAX_TOKEN_DAYS) * 86_400_000);

/** A last-used time is only worth writing again after this long, so reads do not turn into writes. */
export const LAST_USED_GRANULARITY_MS = 5 * 60_000;
export const shouldTouch = (lastUsedAt: Date | null, now: Date) => !lastUsedAt || now.getTime() - lastUsedAt.getTime() >= LAST_USED_GRANULARITY_MS;
