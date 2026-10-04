# 0001. Save events with the state change (transactional outbox)

**Status:** Accepted

## Context
Notifications were sent straight from the code that created them. A failed Telegram or email call was logged and dropped, a crash
between "notification saved" and "message sent" lost the message, and a retried cron could send twice. The app runs on Vercel
Hobby, where a function can be killed at any time and there is no long-lived worker.

## Decision
A state change and the events it causes are written in one MongoDB transaction (`inTransaction` + `enqueueEvent`, collection
`outbox`). A relay delivers them: right away for a low-latency first attempt, then on a schedule or from a worker for retries.
Each delivery goes to one handler per channel; a handler first writes `(eventId, handler)` to the `inbox` (unique), so a redelivery
does nothing. Failures retry with exponential backoff and full jitter (`core/domain/retry.ts`) and end in a dead-letter state that
`/setup` shows and can replay.

## Consequences
- A crash cannot lose a delivery, and a retry cannot send twice (measured: 500 events delivered 4 times each ran their handlers exactly 500 times, `docs/BENCHMARKS.json`).
- Delivery is at-least-once with idempotent consumers, not exactly-once transport. Handlers must be written to be safe to run once per event id.
- On a MongoDB without transactions (standalone, local) `inTransaction` falls back to two writes: still correct except for a crash between them.
- Costs an extra collection, a relay and a dead-letter view to operate.
- `recomputeDay` (the streak) deliberately stays synchronous: the dashboard must read its own writes.

## Rejected
- **Send directly and retry in the caller:** loses the message when the process dies; retries can double-send.
- **Change streams as the trigger:** needs a replica set everywhere and a resident listener, which Vercel Hobby cannot hold.
