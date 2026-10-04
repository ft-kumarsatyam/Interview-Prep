# PrepOS public API (v1)

A small, versioned API for your own PrepOS. The machine-readable description is generated from the code at
`/api/v1/openapi.json` (OpenAPI 3.1), so it cannot drift from what the routes do.

## Authentication
Create a token in **Settings > API tokens**: pick scopes and an expiry (30 to 365 days). The token looks like
`pk_<8 chars>_<32 chars>`, is shown once, and only its SHA-256 is stored. Send it as `Authorization: Bearer <token>`.

| Scope | Allows |
|---|---|
| `jobs:read` | `GET /api/v1/jobs` |
| `capture:write` | `POST /api/v1/jobs`, `POST /api/v1/profiles` (what the Chrome extension sends) |
| `jobs:write` | `POST /api/v1/postings` (push postings into Discover) |

Errors are always `{ "error": { "code": "...", "message": "..." } }`: `401` (`missing_token`, `invalid_token`,
`expired_token`, `revoked_token`), `403 insufficient_scope`, `400 invalid_json`, `413 payload_too_large`,
`422 validation_error` (with `details` per field), `429 rate_limited` (with `Retry-After`), `500 internal_error` (safe to retry).

## Limits
120 requests a minute per token (a token bucket: short bursts are fine). `X-RateLimit-Remaining` is sent on every response.
Bodies are capped at 1.5 MB, postings at 100 per request.

## Idempotency
Writes accept `Idempotency-Key: <8-128 chars>`. Repeating a request with the same key within 24 hours returns the first response
with `Idempotent-Replayed: true` and does nothing twice. The same key with a different body is `422 idempotency_key_reuse`; a request
still running answers `409 request_in_progress`. A `5xx` is never stored, so it can be retried with the same key. Keys are per token.

## Examples
```sh
# Capture a job
curl -X POST https://your-prepos.example/api/v1/jobs \
  -H "Authorization: Bearer $PREPOS_TOKEN" -H "Idempotency-Key: $(uuidgen)" -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer","company":"Acme","url":"https://acme.com/jobs/1","jd":"Node.js and PostgreSQL"}'

# Push postings (from n8n, Zapier, Apify, cron)
curl -X POST https://your-prepos.example/api/v1/postings \
  -H "Authorization: Bearer $PREPOS_TOKEN" -H "Content-Type: application/json" \
  -d '{"jobs":[{"title":"SRE","company":"Beta","url":"https://beta.com/careers/7","location":"Remote"}]}'
# -> {"accepted":1,"added":1,"rejected":0}

# Read your tracker
curl https://your-prepos.example/api/v1/jobs -H "Authorization: Bearer $PREPOS_TOKEN"
```

Listings from LinkedIn, Naukri, Indeed, Wellfound, Glassdoor and similar sites are rejected on every route that takes postings.
