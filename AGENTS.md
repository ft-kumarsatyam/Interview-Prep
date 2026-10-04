# AGENTS.md — instructions for AI coding agents (Claude Code, Cursor, etc.)

You are building **PrepOS**, a private single-user interview-prep web app. Before writing code, read:

1. `docs/ARCHITECTURE.md`: stack, data model, domain rules, routes. **This is the source of truth for product rules.**
1a. `docs/STRUCTURE.md`: how the code is built (layers, module tiers, component taxonomy, recipes). **Read it before adding a page, module or component.** `docs/GRAPH.md` explains the code graph (`graphify query "..."`), the fastest way to see who calls what.
2. `docs/DESIGN.md`: visual system, layouts and page specs.
3. `docs/BUILD_PLAN.md`: the phase you've been asked to do. Do only that phase.
4. `docs/ROADMAP.md`: the study plan the app enforces (for context on the rules).

Content data lives in `data/*.json`. **Do not edit those files** unless asked. The app seeds from them.

## Hard rules
- **Single owner, no sign-up.** Never add registration, password reset, OAuth providers or a users collection. Credentials come only from `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH_B64`. User data is nevertheless **owner-scoped**: every user-data schema calls `ownerScope()` (`core/db/owner-scope.ts`), which adds `ownerId` and injects it into every query, and natural-key unique indexes are `{ ownerId, ... }`. New user-data collections must do the same. Schema changes that need a backfill or an index change are migrations in `core/db/migrations/` (`npm run migrate`; also run by `npm run seed` and at server start), never ad-hoc index creation.
- **Free tier only:** Vercel Hobby, MongoDB Atlas M0, free LLM tier. No paid services and no Redis. **One explicit exception, opted into by the owner:** an optional paid LLM provider (`META_LLAMA_*`) that is only ever a last resort after every free provider is exhausted, never used by background jobs, and only after an in-app confirmation, with a daily call cap in Settings. Do not add any other paid dependency, and never put API keys in the repo, the DB or logs.
- Every "day" is a calendar date in `APP_TIMEZONE` (`YYYY-MM-DD`). Never use `new Date().toDateString()` or server-local time for day logic. Use helpers in `core/domain/dates.ts`.
- **The daily quiz is mandatory for streak completion** (ARCHITECTURE §7). Don't weaken this.
- **Next.js 16** (see the block at the end of this file): use `proxy.ts`, not `middleware.ts`; `cookies()`, `headers()`, `params` and `searchParams` are async; lint with `npx eslint .`; run `npx next typegen` if `PageProps`/`LayoutProps` types are missing.
- Auth is the hand-rolled jose session in `core/auth/`. Don't add Auth.js/NextAuth. `proxy.ts` is only an optimistic redirect, so call `requireSession()` next to the data.
- Never reorder or delete subtopics within a topic in `data/syllabus.json` (ids are `${topicId}:${index}`). Append new ones instead.
- Business logic goes in pure functions in `modules/<feature>/domain/*` (or `core/domain`) with Vitest tests. Services in `modules/<feature>/services/*` do I/O. New features get their own `modules/<feature>/` folder. Pages and Server Actions call services, never Mongoose directly.
- Every Server Action and API route checks auth (`requireSession()`), except `/api/cron/*`, which checks `Bearer CRON_SECRET`.
- Validate all inputs with zod. Treat LLM output as untrusted text: validate it and never render it with `dangerouslySetInnerHTML`.
- Treat every AI answer as untrusted and cache only validated output (`modules/ai/services/ai-cache.ts`).
- **Resumes are personal data:** resume AI features (`resume-roast`, `resume-tailor`) are `paid: "never"`, resume and profile text is never logged, and tailoring may never add a tool, number or employer that is not already in the resume (`validateTailor`). PrepOS never logs in to or applies on a job site; the extension only reads the page you click it on.
- **Optional Redis (second owner-approved exception):** Upstash Redis (free tier, REST) is used only when `UPSTASH_REDIS_REST_URL` and `_TOKEN` are set, through the `KvStore` port in `core/kv/`. Every use (sync lock, rate limits, live-event log) has a MongoDB implementation and falls back to it on error, so the app never requires Redis. Do not use Redis for anything that has no Mongo fallback.
- **Job sources:** only public job-board APIs (Greenhouse, Lever, Ashby, Workable, SmartRecruiters) and free remote-job feeds are read automatically, through `core/http-safe.ts` (SSRF checks, size and time caps). LinkedIn, Naukri, Indeed and Wellfound are never fetched by the server: they get search links and extension capture only.
- **Realtime:** Vercel Hobby cannot hold WebSockets, so live updates are short-lived server-sent events (`/api/events`) behind `core/realtime/`. Never put personal text in a live event, only counts and kinds.
- Web-dev lessons and projects (`data/webdev.json`) stay out of `data/syllabus.json` so they never change the plan.
- Courses (`data/courses/*`) and roadmaps (`data/roadmaps/*`) follow the same rule: own JSON, own progress collections, never in `syllabus.json`, never touch `DayLog`, the streak or the plan. A roadmap node's done state is derived on read from existing progress (`nodeStatus`), not stored.
- The app must work with **no LLM key** (falls back to `data/quiz-bank.json`) and **without cron** (`ensureToday()` on dashboard load).

## Conventions
- **Components are presentational.** Data arrives as props. Only an async server section named `*-section.tsx`, a page or a layout may call a service; client islands call Server Actions. ESLint and `tests/architecture/boundaries.test.ts` enforce this and the module dependency baseline: a new module-to-module import must be added to `BASELINE` on purpose.
- TypeScript strict, no `any`. Named exports. File names in kebab-case, components in PascalCase.
- Server Components by default; add `"use client"` only for interactivity.
- Tailwind + shadcn tokens from DESIGN §1. Don't hard-code hex colours in components.
- Small, focused commits per phase. Keep README and `.env.example` in sync when env vars change.

## Commands
```
npm run dev        # local dev
npm run build      # must pass before you say a phase is done
npm run typecheck  # tsc --noEmit
npx eslint .       # lint (next lint no longer exists)
npm test           # vitest
npm run seed       # run migrations, then upsert problems/topics/settings into MONGODB_URI
npm run migrate    # run pending database migrations only
npm run knip       # dead code
npm run depcruise  # layer rules
npm run hash -- 'my-password'   # prints ADMIN_PASSWORD_HASH_B64
```

## Definition of done for a phase
`npm run build` and `npm test` pass, the feature works in the browser, there are no console errors, the mobile layout has been checked, and you report briefly what was built and anything deferred.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
