# 0002. QStash as the queue, with MongoDB polling as the fallback (not Inngest)

**Status:** Accepted

## Context
The outbox needs something to push deliveries to a serverless function with retries. The app must stay free, must keep working with
only `MONGODB_URI`, and Redis is already an optional dependency behind a port with a Mongo fallback.

## Decision
A `Broker` port (`core/broker`) with two adapters. `QStashBroker` publishes a tiny `{eventId}` reference to Upstash QStash (free
tier), which pushes it, signed and with retries, to `/api/queue/[topic]`; its failure callback dead-letters the event. The
consumer verifies the signature (`jose`, current and next signing key), loads the real payload from the outbox and runs the same
idempotent handlers. `MongoPollBroker` runs the handlers in-process: from `/api/cron/relay`, from `npm run worker`, or inline. A
`FallbackBroker` uses it when QStash errors. Nothing personal travels through the queue: only an event id.

## Consequences
- One handler codebase, two runtimes (queue push on Vercel, worker in Docker or CI).
- QStash is optional: unset, the app behaves identically with slower retries.
- A message QStash accepted but never reported on is requeued after 15 minutes.
- Signature checking is our code to maintain (tested: wrong body, URL, key and an expired token are all refused).

## Rejected
- **Inngest:** a good product, but it wants to own the function code and its free tier ties delivery to its platform; the port keeps us portable.
- **Vercel Queues / Cron only:** Hobby allows two cron slots a day, too coarse for retries.
- **Redis streams:** adds a hard Redis dependency for something Mongo already does.
