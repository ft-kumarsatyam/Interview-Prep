import type { ZodType } from "zod";
import { runAsOwner } from "@/core/db/owner";
import { hasScopes, type ApiScope } from "@/core/domain/api-token";
import { decide, IDEMPOTENCY_LOCK_SEC, IDEMPOTENCY_TTL_SEC, lockKey, parseIdempotencyKey, requestFingerprint, shouldStore, storageKey, type StoredResponse } from "@/core/domain/idempotency";
import type { Limit } from "@/core/domain/rate-limit";
import { getKv } from "@/core/kv";
import { logger } from "@/core/observability/log";
import { authenticateApiRequest } from "@/core/services/api-tokens";
import { takeToken } from "@/core/services/rate-limit";

export interface RouteSpec {
  /** Stable operation id in the OpenAPI document. */
  id: string;
  method: "GET" | "POST";
  /** OpenAPI-style path, e.g. `/api/v1/jobs`. */
  path: string;
  summary: string;
  description?: string;
  scopes: readonly ApiScope[];
  /** Request body, for POST. */
  body?: ZodType;
  /** What the OpenAPI document shows for the body when it is looser than `body` (items are validated one by one inside). */
  docBody?: ZodType;
  /** The success response body. */
  response: ZodType;
  /** The status a success returns (default 200). */
  successStatus?: number;
  /** Honours the Idempotency-Key header. */
  idempotent?: boolean;
  /** Per-token rate limit (default 120 a minute). */
  rate?: Limit;
}

export const DEFAULT_RATE: Limit = { max: 120, windowSec: 60 };
const MAX_BODY_BYTES = 1_500_000;

export interface V1Context<B> {
  body: B;
  ownerId: string;
  tokenId: string;
}

export interface V1Result {
  status?: number;
  body: unknown;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export const apiError = (status: number, code: string, message: string, headers: Record<string, string> = {}, details?: unknown) =>
  json(status, { error: { code, message, ...(details ? { details } : {}) } }, headers);

const AUTH_MESSAGE = { missing_token: "Send an API token as `Authorization: Bearer pk_...`", invalid_token: "That token isn't valid", expired_token: "That token has expired", revoked_token: "That token was revoked" } as const;

/**
 * Wraps a v1 route so every one behaves the same: authenticate, check scopes, rate limit per token, read and validate
 * the body, honour Idempotency-Key on writes, run as the token's owner, and never leak an internal error message.
 */
export function v1Route<B = undefined>(spec: RouteSpec, run: (ctx: V1Context<B>) => Promise<V1Result>): (req: Request) => Promise<Response> {
  return async (req) => {
    const auth = await authenticateApiRequest(req);
    if (!auth.ok) return apiError(401, auth.code, AUTH_MESSAGE[auth.code], { "www-authenticate": 'Bearer realm="prepos"' });
    if (!hasScopes(auth.scopes, spec.scopes)) return apiError(403, "insufficient_scope", `This token needs the scope: ${spec.scopes.join(", ")}`);

    const limit = await takeToken(`api:${auth.tokenId}`, spec.rate ?? DEFAULT_RATE);
    if (!limit.allowed) return apiError(429, "rate_limited", "Too many requests. Slow down", { "retry-after": String(Math.max(1, Math.ceil(limit.retryAfterMs / 1000))), "x-ratelimit-remaining": "0" });
    const rateHeaders = { "x-ratelimit-remaining": String(limit.remaining) };

    let rawBody = "";
    let body: unknown;
    if (spec.method === "POST") {
      if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return apiError(413, "payload_too_large", "The body is too large", rateHeaders);
      rawBody = await req.text();
      if (rawBody.length > MAX_BODY_BYTES) return apiError(413, "payload_too_large", "The body is too large", rateHeaders);
      try {
        body = rawBody ? JSON.parse(rawBody) : undefined;
      } catch {
        return apiError(400, "invalid_json", "The body must be valid JSON", rateHeaders);
      }
      if (spec.body) {
        const parsed = spec.body.safeParse(body);
        if (!parsed.success) return apiError(422, "validation_error", "The request body is not valid", rateHeaders, parsed.error.issues.slice(0, 8).map((i) => ({ path: i.path.join("."), message: i.message })));
        body = parsed.data;
      }
    }

    let idem: { storage: string; lock: string; fingerprint: string } | null = null;
    const kv = getKv();
    if (spec.idempotent && spec.method === "POST") {
      const k = parseIdempotencyKey(req.headers.get("idempotency-key"));
      if (k.invalid) return apiError(400, "invalid_idempotency_key", "Idempotency-Key must be 8-128 letters, digits, dots, dashes, colons or underscores", rateHeaders);
      if (k.key) {
        const fingerprint = requestFingerprint(spec.method, spec.path, rawBody);
        const storage = storageKey(auth.tokenId, k.key);
        const lock = lockKey(auth.tokenId, k.key);
        let stored: StoredResponse | null = null;
        try {
          const raw = await kv.get(storage);
          stored = raw ? (JSON.parse(raw) as StoredResponse) : null;
        } catch {
          stored = null; // a broken cache entry must not block the request
        }
        const decision = decide(stored, fingerprint);
        if (decision.kind === "replay") return json(decision.stored.status, decision.stored.body, { ...rateHeaders, "idempotent-replayed": "true" });
        if (decision.kind === "conflict") return apiError(422, "idempotency_key_reuse", "This Idempotency-Key was already used with a different request", rateHeaders);
        if (!(await kv.setNx(lock, "1", IDEMPOTENCY_LOCK_SEC))) return apiError(409, "request_in_progress", "A request with this Idempotency-Key is still running", { ...rateHeaders, "retry-after": "1" });
        idem = { storage, lock, fingerprint };
      }
    }

    try {
      const result = await runAsOwner(auth.ownerId, async () => await run({ body: body as B, ownerId: auth.ownerId, tokenId: auth.tokenId }));
      const status = result.status ?? spec.successStatus ?? 200;
      if (idem && shouldStore(status)) await kv.set(idem.storage, JSON.stringify({ status, body: result.body, fingerprint: idem.fingerprint } satisfies StoredResponse), IDEMPOTENCY_TTL_SEC).catch(() => undefined);
      return json(status, result.body, rateHeaders);
    } catch (err) {
      logger({ module: "api" }).error({ path: spec.path, tokenId: auth.tokenId, error: err instanceof Error ? err.name : "unknown" }, "v1 route failed");
      return apiError(500, "internal_error", "Something went wrong. It is safe to retry", rateHeaders);
    } finally {
      if (idem) await kv.releaseIfOwner(idem.lock, "1").catch(() => false);
    }
  };
}
