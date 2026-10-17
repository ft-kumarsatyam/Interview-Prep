# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single owner-operator: the person building and using PrepOS to prepare for senior backend interviews. No other audience; design decisions optimize for the owner's own daily study habit, focus, and honest self-assessment, not for a generic persona or onboarding a stranger.

## Product Purpose

PrepOS enforces a 24-week, zero-to-interview-ready study plan for senior backend roles (DSA in JS, JS/TS and Node.js, DBMS and SQL, OOP and LLD, system design from basic scaling to big-tech architectures, and AI fundamentals). The daily loop is plan → learn → solve → read → quiz → streak. Success means the plan is actually followed: the daily quiz gates streak completion, so skipping it breaks the one signal the app exists to protect.

## Positioning

Not a generic LeetCode tracker or course platform: PrepOS is a single-owner system that enforces a fixed curriculum and daily accountability loop (mandatory quiz for streak), pulls in real job postings and an interview-question bank, and runs entirely on free-tier infrastructure (Vercel Hobby, MongoDB Atlas M0, free/optional-paid LLM). A neighboring SaaS interview-prep product could not truthfully copy the "enforced daily streak + zero paid-infra requirement + single-user" combination.

## Operating Context

Daily use, solo, likely short focused sessions around a day job. Surfaces include: dashboard (today's plan), DSA problem solving with a code playground, notes/article reader, quiz, system design (Mermaid diagrams), job tracking/outreach, resume tools, roadmaps/courses outside the core syllabus, and settings (API tokens, LLM provider keys). Runs on Next.js 16 App Router, Tailwind v4, shadcn/ui (Nova preset), deployed to Vercel Hobby and served from satyam-dev.in.

## Capabilities and Constraints

- Mandatory daily quiz gates streak completion — never weaken this in any redesign.
- Free-tier only: Vercel Hobby, MongoDB Atlas M0, free LLM tier; paid LLM providers are an explicit, capped, owner-opt-in last resort only.
- No sign-up, no multi-user surfaces, no OAuth — single owner authenticated via `ADMIN_EMAIL` / password hash.
- Every "day" is a calendar date in `APP_TIMEZONE`; no server-local time in day logic.
- Resume and profile text are personal data: never logged, never sent to the RAG index, tailoring never fabricates tools/employers.
- Must work with no LLM key (falls back to `data/quiz-bank.json`) and without cron.
- Realtime updates are short-lived SSE only (no WebSockets — Vercel Hobby constraint).

## Brand Commitments

None locked. "PrepOS" is a working title; no logo, palette, or voice commitment exists yet. Visual identity is open for impeccable's design work to propose.

## Evidence on Hand

- `docs/ARCHITECTURE.md`, `docs/STRUCTURE.md`, `docs/DESIGN.md`, `docs/BUILD_PLAN.md`, `docs/ROADMAP.md` — existing product and design documentation to treat as current authority, not to be contradicted without the owner's sign-off.
- `data/*.json` — seeded content (syllabus, quiz bank, roadmaps, courses); never edit without being asked.
- No testimonials, case studies, press, or external users exist or should be fabricated — this is a private single-user tool.

## Product Principles

1. The daily streak and its mandatory quiz are the product's core accountability mechanism — no design change may make them optional or easy to bypass.
2. Everything runs on free infrastructure; a design cannot imply or require a paid dependency.
3. This is a tool for focused, repeated daily use by its one owner, not a marketing surface for strangers — optimize for scanability, low friction, and respecting that the user already knows the product (Operate mode, not Persuade).
4. Personal data (resume, profile, notes) is sensitive by default — never assume safe-to-display-broadly design patterns (e.g. public-facing testimonials, shareable previews) without explicit confirmation.

## Accessibility & Inclusion

Standard WCAG AA baseline. No additional personal accommodation specified.
