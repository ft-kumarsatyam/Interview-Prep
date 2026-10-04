# 0006. Hashed scoped API tokens and Idempotency-Key on writes

**Status:** Accepted

## Context
The Chrome extension could only deliver a capture to an open PrepOS tab. Automations (n8n, Zapier, scripts) had nothing at all.
Extension users are on flaky networks and double-click, so retries must be safe.

## Decision
`/api/v1` with bearer tokens `pk_<prefix>_<secret>`: shown once, only the SHA-256 stored, scoped (`jobs:read`, `jobs:write`,
`capture:write`), expiring (max 365 days), revocable, capped at 20 active. Every route is built by `v1Route()` so auth, scope check,
per-token token-bucket rate limit, validation errors and secret-free 500s are identical everywhere. Writes honour `Idempotency-Key`:
the first response is stored for 24 hours and replayed, a reused key with a different body is a 422, a request still running is a
409, and a 5xx is never stored. The OpenAPI 3.1 document is generated from the same route specs (Zod 4 JSON Schema), so it cannot drift.

## Consequences
- Sessions stay for the browser; tokens are for machines. A leaked token is limited by scope and expiry and can be revoked.
- Idempotency state lives in the KV store (Redis if configured, else Mongo), keyed per token, expiring on its own.
- A key's response is stored after the work: a crash in between leaves the lock to expire (60 s) and the retry runs the work again, which the posting and job de-duplication make harmless.
- The extension and the API share schemas, and a test runs the real extension script against them.

## Rejected
- **Reusing the session cookie from the extension:** cross-origin cookies and a broad credential for a narrow job.
- **JWT access tokens:** cannot be revoked without a lookup anyway, so a hashed lookup is simpler.
