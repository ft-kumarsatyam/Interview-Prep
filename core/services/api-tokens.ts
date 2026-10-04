import { connectDb } from "@/core/db";
import { API_SCOPES, createTokenSchema, expiryFor, hashToken, MAX_TOKENS, newToken, parseBearer, shouldTouch, tokenState, type ApiScope, type CreateTokenInput, type TokenState } from "@/core/domain/api-token";
import { ApiToken, type ApiTokenRow } from "@/core/models/api-token";

export interface TokenSummary {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  expiresAt: string;
  lastUsedAt: string | null;
  state: TokenState;
}

const toSummary = (r: { _id: unknown; name: string; prefix: string; scopes: string[]; expiresAt: Date; lastUsedAt?: Date | null; revokedAt?: Date | null }, now: Date): TokenSummary => ({
  id: String(r._id),
  name: r.name,
  prefix: r.prefix,
  scopes: r.scopes.filter((s): s is ApiScope => (API_SCOPES as readonly string[]).includes(s)),
  expiresAt: r.expiresAt.toISOString(),
  lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  state: tokenState({ expiresAt: r.expiresAt, revokedAt: r.revokedAt ?? null }, now),
});

export type CreateResult = { ok: true; token: string; summary: TokenSummary } | { ok: false; error: string };

/** Creates a token. The plaintext is returned here and nowhere else: it cannot be shown again. */
export async function createApiToken(input: CreateTokenInput, now = new Date()): Promise<CreateResult> {
  const parsed = createTokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the token details" };
  await connectDb();
  const active = await ApiToken.countDocuments({ revokedAt: null, expiresAt: { $gt: now } });
  if (active >= MAX_TOKENS) return { ok: false, error: `You can have up to ${MAX_TOKENS} active tokens. Revoke one first` };
  const t = newToken(crypto.getRandomValues(new Uint8Array(48)));
  const row = await ApiToken.create({ name: parsed.data.name, prefix: t.prefix, hash: t.hash, scopes: [...new Set(parsed.data.scopes)], expiresAt: expiryFor(now, parsed.data.days) });
  return { ok: true, token: t.token, summary: toSummary(row.toObject(), now) };
}

export async function listApiTokens(now = new Date()): Promise<TokenSummary[]> {
  await connectDb();
  return (await ApiToken.find({}).sort({ createdAt: -1 }).lean()).map((r) => toSummary(r, now));
}

export async function revokeApiToken(id: string, now = new Date()): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return false;
  await connectDb();
  return (await ApiToken.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: now } })).modifiedCount === 1;
}

export type AuthResult = { ok: true; tokenId: string; ownerId: string; scopes: ApiScope[] } | { ok: false; status: 401; code: "missing_token" | "invalid_token" | "expired_token" | "revoked_token" };

/**
 * Identifies the caller from `Authorization: Bearer pk_...`. The token is looked up by its hash (an explicit owner filter
 * bypasses the per-owner scope, since the owner is what this finds). The error does not say whether a token exists.
 */
export async function authenticateApiRequest(req: Request, now = new Date()): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header) return { ok: false, status: 401, code: "missing_token" };
  const token = parseBearer(header);
  if (!token) return { ok: false, status: 401, code: "invalid_token" };
  await connectDb();
  const row = await ApiToken.findOne({ hash: hashToken(token), ownerId: { $exists: true } }).lean<ApiTokenRow & { _id: unknown; ownerId: string }>();
  if (!row) return { ok: false, status: 401, code: "invalid_token" };
  const state = tokenState({ expiresAt: row.expiresAt, revokedAt: row.revokedAt ?? null }, now);
  if (state === "revoked") return { ok: false, status: 401, code: "revoked_token" };
  if (state === "expired") return { ok: false, status: 401, code: "expired_token" };
  if (shouldTouch(row.lastUsedAt ?? null, now)) await ApiToken.updateOne({ _id: row._id, ownerId: row.ownerId }, { $set: { lastUsedAt: now } });
  return { ok: true, tokenId: String(row._id), ownerId: row.ownerId, scopes: row.scopes.filter((s): s is ApiScope => (API_SCOPES as readonly string[]).includes(s)) };
}
