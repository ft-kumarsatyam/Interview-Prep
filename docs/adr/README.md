# Architecture decision records

One short file per decision that shaped the system: the problem, what was chosen, what it costs and what was rejected.
A new decision gets the next number. A reversed decision is not edited away: it is marked `Superseded by NNNN`.

| # | Decision | Status |
|---|---|---|
| [0001](0001-transactional-outbox.md) | Save events with the state change (outbox) instead of sending directly | Accepted |
| [0002](0002-qstash-with-mongo-fallback.md) | QStash as the queue, with MongoDB polling as the fallback; not Inngest | Accepted |
| [0003](0003-owner-scoping-in-the-schema.md) | Owner scoping in the Mongoose schema layer | Accepted |
| [0004](0004-modular-monolith.md) | A modular monolith with enforced boundaries, not microservices | Accepted |
| [0005](0005-hybrid-retrieval-with-fallback.md) | Hybrid keyword + vector retrieval with an in-process fallback | Accepted |
| [0006](0006-api-tokens-and-idempotency.md) | Hashed scoped API tokens and Idempotency-Key on writes | Accepted |
