# Benchmarks

Measured with `npm run bench` (`scripts/bench/run.ts`); raw results are in [`BENCHMARKS.json`](BENCHMARKS.json).
Run on 2026-10-04, macOS arm64, Node 25.2, **an in-memory MongoDB replica set on the same machine** (no network between app and database).

## Results

| What | Result |
|---|---|
| Discover list, 3,000 postings, 300 sequential calls | p95 **12.19 ms without the cache, 1.07 ms with it** (p50 7.35 ms to 0.31 ms) |
| 50 concurrent cold requests for the same cache entry | the computation ran **1 time**, 49 requests waited for it (single-flight) |
| Outbox delivery, 2,000 events | **121 events/s** with one relay, **223 events/s** with four relays competing for the same backlog |
| Exactly-once, four relays racing | 2,000 of 2,000 events handled, **0 handled twice** |
| Redelivery: 500 events delivered 4 times each (3 at once, 1 later) | 2,000 deliveries produced **500 handler runs**, 0 events handled twice, 0 missed |
| Token bucket under contention: 500 concurrent callers, burst 25 | **25 granted, 0 over-spent**; a call takes p50 5.2 ms, p95 9.9 ms |
| `POST /api/v1/jobs` (auth, scope, rate limit, validation, write) | p50 38.5 ms, p95 48.8 ms |
| Same request replayed with its Idempotency-Key | p50 6.7 ms, p95 9.7 ms; 200 distinct jobs sent twice each stored **200**, not 400 |
| `GET /api/v1/jobs` | p50 6.3 ms, p95 12.8 ms |

## What this proves, and what it does not
- **Proves the guarantees:** no duplicate delivery under concurrency and redelivery, no over-spent rate limit, no duplicate write on a retried API call, and one computation instead of fifty on a cold cache. These are correctness properties and do not depend on the hardware.
- **Does not prove production latency.** There is no network latency between the app and MongoDB here, and the cache's backing store was MongoDB, not Redis. On Atlas every database round trip costs more, so absolute milliseconds will be higher. The cache saves several round trips (preferences, resume, targets, the query and scoring) for one, so the ratio should hold in direction but not in size.
- **Not an HTTP load test.** The API rows call the route handlers in-process. `scripts/bench/k6/` has k6 scripts for a deployed or local server; they were written but **have not been run** (k6 is not installed on the machine this was built on).
- The outbox rate is dominated by database round trips per event (claim, load, inbox write, mark done). A first version that delivered one row at a time measured about 57 events/s on the same machine; claiming a batch and delivering it with a concurrency of 8 roughly doubled that.
- The cached list is the Discover job list, the heaviest read that was cached. The dashboard is deliberately **not** cached, so the streak stays read-your-writes.

## Reproduce
```sh
npm run bench              # full run, rewrites BENCHMARKS.json
npm run bench -- --small   # quick run, does not write the file
```
