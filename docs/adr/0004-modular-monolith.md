# 0004. A modular monolith with enforced boundaries, not microservices

**Status:** Accepted

## Context
The app grew to dozens of features in one flat `lib/`. Features reached into each other freely. The product is one person's tool
on free tiers, deployed as one Vercel project.

## Decision
`core/` (infrastructure: db, kv, broker, events, llm, observability) and `modules/<feature>/{domain,services,components,lib}`.
Rules are enforced, not written down and hoped for: ESLint keeps `domain/` pure and components presentational; an architecture
test freezes the module-to-module import graph (`BASELINE`, a new edge is a reviewed decision); dependency-cruiser enforces layers in
CI; knip fails on dead files and dependencies.

## Consequences
- One deploy, one database connection pool (important on Atlas M0), no network hops between features, simple local development.
- Boundaries are cheap to keep and the graph shows which modules are tangled (planner, progress and notifications still are).
- A module cannot be scaled or released independently. That is not a need here.
- The event backbone gives modules a loose way to cooperate (publish an event) without importing each other.

## Rejected
- **Microservices:** operational cost, network failure modes and per-service free-tier limits for no scaling or team benefit.
- **Leaving `lib/` flat:** the original state; the tangle was invisible until it was measured.
