# 0003. Owner scoping in the schema layer

**Status:** Accepted

## Context
PrepOS has one user and no sign-up, but the data model assumed exactly one owner: unique indexes like `{date}` and `{slug}`, queries
with no owner filter. Supporting a second owner later would have meant auditing about 400 query call sites.

## Decision
Every user-data schema calls `ownerScope()` (`core/db/owner-scope.ts`). It adds `ownerId`, injects it into every find, update,
delete, count and aggregate (after `$vectorSearch`/`$search` stages, which must stay first), and the natural-key unique indexes
become `{ ownerId, ...key }`. The current owner comes from an `AsyncLocalStorage` (`runAsOwner`), defaulting to `OWNER_ID` or `"owner"`.
An explicit `ownerId` in a filter bypasses the plugin, which migrations and token lookup use. `scoped(Model, ownerId)` is the explicit
form for new code. Migration `001-owner-id` backfills existing rows and rebuilds the indexes; it also runs at server start so a
deploy never hides legacy rows.

## Consequences
- No sign-up UI was added: this is readiness, not a feature, and AGENTS.md still forbids registration and a users collection.
- Isolation is tested (two owners, same natural key, upserts, aggregation) and background handlers run as the event's owner.
- Query hooks only fire for Mongoose queries, so `bulkWrite` and raw collection calls bypass scoping; the codebase uses neither on owner data and a test would be needed before it did.
- A lazy query must be awaited inside `runAsOwner` (documented on the function).
- Singleton documents with a fixed `_id` (settings, planner intake) are not scoped yet; that needs the id to carry the owner.

## Rejected
- **A repository wrapper everywhere:** correct but would have rewritten 400 call sites in one go; the plugin gets isolation now and `scoped()` is available for new code.
- **A database per owner:** hits Atlas M0's single-database limits.
