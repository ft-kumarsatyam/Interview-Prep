# Resume bullets for PrepOS

Every number below is from a run you can repeat (`npm run bench`, `npm test`, `npm run e2e`); raw results are in
[`BENCHMARKS.json`](BENCHMARKS.json). They were measured on a laptop against an in-memory MongoDB replica set, so say "in a local
benchmark" where a latency is quoted. Do not claim production latency or traffic: the app is a personal tool and has neither to report.

## Systems and backend

- **Event-driven delivery with a transactional outbox.** Built a modular monolith where state changes and their events commit in one MongoDB transaction, delivered through a broker port (Upstash QStash with a MongoDB-polling fallback) to idempotent consumers with exponential backoff, jitter and a dead-letter queue. In a stress test, 500 events delivered four times each (three concurrently) ran their handlers exactly 500 times, and four relays racing for a 2,000-event backlog handled every event once.
- **Versioned read-through cache with single-flight.** Added a cache with version-bumped invalidation (no key scans), stale-while-revalidate and a lock that stops stampedes. In a local benchmark the heaviest cached read (a job list scored over 3,000 postings) went from p95 12.2 ms to 1.1 ms, and 50 concurrent cold requests triggered one computation instead of 50.
- **Token-bucket rate limiter on two backends.** Implemented the same atomic limiter as a Redis Lua script and as a single MongoDB update pipeline, with shared refill math tested at its edges. Under 500 concurrent callers against a burst of 25, exactly 25 were granted.
- **Owner-scoped data layer.** Retrofitted multi-tenant readiness across about 25 collections with a Mongoose plugin (per-owner unique indexes, scoped queries and aggregations) plus a migrations runner, without rewriting ~400 call sites and without adding a sign-up flow.
- **Public API with scoped tokens and idempotency.** Designed `/api/v1` with hashed, scoped, expiring API tokens, per-token rate limits, and `Idempotency-Key` replay; the OpenAPI 3.1 document is generated from the same route definitions so it cannot drift. 200 retried writes produced 200 jobs, not 400. A Chrome extension uses it, tested by running its real script against the API's schemas.

## AI

- **Grounded answers over personal notes.** Built hybrid retrieval (keyword plus vector search merged with reciprocal rank fusion, falling back to an in-process scan when Atlas Vector Search is absent), streamed answers whose citations are checked against the retrieved passages, caching only grounded answers, with a versioned prompt registry and a golden-set eval harness. Embeddings re-run only for changed chunks.
- **Honest AI plumbing.** Provider failover that only switches before the first token, per-provider latency histograms, first-token latency and failover counts, prompt-injection fences around every piece of untrusted text, and a rule that anything touching a resume never reaches a paid model.

## Product

- **Job search that ties three systems together.** Scored each job against the resume and against the syllabus topics already studied (what to add to the resume, what to study next), added an inbound webhook and a free career-page reader for more sources, and a recruiter-email drafter that flags any claim the resume does not support and sends only after an explicit confirmation.
- **Project mock interviews from real code.** Reads a public GitHub repository (secrets redacted, `.env` and keys never read), then asks technical questions that must cite files that exist and behavioral questions about building it; ungrounded questions are dropped.
- **Levelled quizzes.** An easy, medium and hard ladder per topic with tracked runs, plus model-written extra questions that are validated and de-duplicated against the bank.

## Quality

- **Testing.** 2,745 automated unit and integration tests passing against an in-memory MongoDB, plus 21 Playwright tests in a real browser that include failing then passing the quiz to complete the daily streak and eight pages checked on a phone viewport. Layer rules, dead code and module boundaries are enforced in CI with ESLint, dependency-cruiser, knip and an architecture test.
- **Observability.** OpenTelemetry traces and metrics (off unless configured), structured logs carrying trace ids, a lint rule that bans logging resume or prompt text, and an SLO panel for dashboard latency, outbox lag, dead letters, LLM availability and cache hit rate.

## One-liners (pick two or three)

- Designed and built a private interview-prep platform end to end: event-driven modular monolith, hashed-token public API with OpenAPI, grounded RAG answers, and a Playwright-verified streak rule.
- Cut a heavy read's p95 from 12.2 ms to 1.1 ms in a local benchmark with versioned caching, and proved exactly-once delivery under redelivery with a stress test.
