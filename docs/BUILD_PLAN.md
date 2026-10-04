# Build Plan — prompts for Claude Code / Cursor

Run the phases **one at a time**. After each phase:
1. Run `npm run typecheck && npm test && npm run build`.
2. Click through the app with `npm run dev`.
3. Commit.

Every prompt assumes the agent has read `AGENTS.md`, which `CLAUDE.md` and `.cursor/rules` point to.

| Phase | Status |
|---|---|
| 0 · Scaffold (Next 16, Tailwind 4, shadcn, Vitest, theme tokens) | ✅ done |
| 1 · DB, auth, seed (Mongoose models, jose session, login + throttle, `proxy.ts`, seed/hash scripts) | ✅ done and tested |
| 2 · Domain logic + tests (dates, planner, streak, SRS, quiz scoring) | ✅ done (33 tests) |
| 3 · Services + live dashboard (`recordSolve` single write path, in-memory Mongo service tests) | ✅ done |
| 4 · DSA progress, Review, Learn checklists, JS Playground, ⌘K, **LeetCode sync** (public username, "Fill in details" inbox) | ✅ done |
| 5 · Quiz engine (LLM + verified bank, weekly quiz) + **subtopic practice and topic "Mastered" quizzes** | ✅ done |
| 6 · News + notifications + cron (Telegram/Resend push, LeetCode sync in cron) | ✅ done |
| 7 · Stats (LeetCode card, JS mastery radar), settings, export, PWA, skeletons, nav badges, a11y | ✅ done |
| 8 · Deploy (walkthrough in README §4, env sync script, manual smoke-test workflow) | ✅ done |
| 9a · Remember me (30-day sliding session vs 12 h browser session) | ✅ done |
| 9b · iPhone app (safe areas, splash screens, service worker + `/offline`, install hint, security headers) | ✅ done |
| 9c · `/setup` checklist + dashboard "Finish setup" card, job run tracking | ✅ done |
| 9d · In-app news reader (feed full text, Readability extraction behind an SSRF guard, tags, picks rail, new system design and tech feeds) | ✅ done |
| 9e · System Design studio (`/design`: 17 cases, diagrams, building blocks, 45-min mock with rubric, related articles) | ✅ done (191 tests) |
| 10 · Shared Web Worker sandbox (`core/sandbox/`) + in-app DSA runner (Code tab, Run/Submit, hints, `data/dsa-testcases.json`) | ✅ done: 15 of the 151 core problems seeded |
| 11 · DSA sheet view (step-ordered, tick-mark progress, `step` field, `sort-an-array`, `relative-sort-array`) | ✅ done |
| 12 · OS track: 5 new topics (processes/scheduling, memory, synchronization/deadlocks, file systems/I/O, security) | ✅ done |
| 13 · DBMS track: `dbms-distributed`, `dbms-ops-security`, two more indexing subtopics | ✅ done |
| 14 · OS and DBMS studios (`/design/os`, `/design/dbms`: 16 cases, 20-min mock) | ✅ done |
| 15 · System Design Vol 2 (8 new cases, 25 total) and the categorized `/design` list | ✅ done |
| 16 · Playground upgrade (`assertEqual`/`test`, console helpers, output caps, 22 drills, TS mode, searchable tagged snippets) | ✅ done |
| 17 · Quiz formats (multi-select, true/false; 112 new bank questions) | ✅ done |
| 18 · Hours-driven planner (`hoursByDow` in Settings, per-item minute costs learned from your solve times, Sunday bonus work, "hours today" re-plan) | ✅ done |
| 19 · AI provider chain (Gemini, Groq, paid Meta last resort): failover, cooldowns, answer cache, usage, Setup test, Settings panel | ✅ done |
| 20 · Ask-Gemini buttons (per-subject project links), cached "Explain my mistake", paid-fallback banner | ✅ done |
| 21 · LeetCode content (statement, official hints, examples fetched lazily and cached in Mongo only), "Copy code + open LeetCode" with auto-detect of the Accepted submission | ✅ done |
| 22 · Runner v2 (Worker list/tree support, `compare` modes, named edge cases + Edge cases tab, three-step hint ladder, one-time hidden-case reveal, spec-based generator with brute-force and fuzz cross-checks, 15 problems migrated) | ✅ done |
| 23 · 83 runnable problems (arrays, strings, two pointers, sliding window, stack, binary search, DP, greedy, bits, linked lists, trees), each with a reference, an independent brute force, 200 fuzz inputs and a blind third solution | ✅ done |
| 24 · Learn redesign (`/learn` index with Continue card and cross-track search, focused `/learn/[topicId]` page, `modules/learn/domain/learn.ts`), OS case quizzes, `satyam-dev.in` on Vercel, AI keys synced to production | ✅ done; GitHub auto-deploy waits on a Vercel GitHub login connection |
| 25A · IDE shell (`components/ide/`: resizable problem and editor panes sized for a laptop, editable and custom test cases, Result and Console tabs, full screen, mobile tabs) on `/dsa/[slug]` | ✅ done |
| 25B · Multi-language runner: JavaScript, TypeScript and Python (Pyodide in its own Worker, same harness and `compare` modes), per-language starters and drafts, Python in the Playground | ✅ done |
| 25C · Questions from anywhere (`/problems`: AI-generated or pasted problems, cases verified against a reference solution in the browser before saving, `customproblems`/`customsolves`, never in the plan) | ✅ done |
| 25D · Calendar (`/calendar` month grid and `/calendar/[date]`; past days from frozen plans, future days from the pure `projectDays` simulation; heatmap cells link in) | ✅ done |
| 25E · Mock interviews: nine types, server-authoritative timer with auto-submit, coding rounds in the IDE, hybrid scoring (tests and time, free-AI rubric grading, self-review fallback), report with strengths, gaps and practise-next links (`mocksessions`) | ✅ done |
| 25F · Weekly DSA and System design mocks: weekdays in Settings, dashboard card, calendar badges; never gate the streak | ✅ done |

The phase prompts below are kept as a record of the spec each phase was built against. The extras listed in the status table (LeetCode sync, mastery quizzes, ports and adapters, idempotent jobs) are described in ARCHITECTURE §3, §8, §9 and §11. Phase 9 is described in ARCHITECTURE §4 (Remember me), §10.1 (reader), §12 (routes) and §15 (PWA).

Known gaps:
- One-line AI news summaries are not built yet (`articles.aiSummary` is unused).
- Some sites block article extraction (OpenAI's blog returns 403, Quastor and Uber block feed fetches). Those articles show the snippet and an "Open original" link.
- The System Design studio has no LLD templates yet; the HLD "Design template" in topic notes on `/learn/[topicId]` still covers quick notes. LLD mock rounds are written answers graded on a rubric.
- The DSA runner covers 83 of the 606 main problems; the rest fall back to LeetCode. "Design" problems (class-based APIs) are not runnable yet, in the sheet or as custom problems. Custom problems fill some of the gap for practice and mocks.
- Mock prompts live in `modules/mock/domain/mock-bank.ts` rather than `data/`, so the content files stay untouched.
- Python needs a one-time Pyodide download (about 10 MB from the jsDelivr CDN) on first run, and doesn't work offline until it's cached.
- The Playground's TS mode strips types and reports syntax errors; it does not type-check.
- Phases 10-17 were verified with typecheck, ESLint, Vitest, `next build`, server-side rendering of the new pages' components and a Node `vm` simulation of the Web Worker, but were not click-tested in a browser.
- White text on the dark-theme `--primary` button measures 4.34:1, just under WCAG AA's 4.5:1. Fixing it means darkening the DESIGN §1 token.

---

### Phase 3 — Services and the live dashboard
> Read AGENTS.md, docs/ARCHITECTURE.md §6–7 and docs/DESIGN.md §3.2.
>
> Create `lib/services/`:
> - `settings.ts`: `getSettings()` returns PlanSettings from the settings doc, falling back to DEFAULT_SETTINGS.
> - `plan.ts`: `ensureToday()`. It settles the unsettled past days with `settleDays` (writing freezeUsed changes and notifications, then updating `settings.settledThrough` and `freezeTokens`), then creates today's DailyPlan with `buildDailyPlan` if it's missing (frozen once created), and returns `{ plan, dayLog, streak, best, freezeTokens }`.
> - `progress.ts`, with Server Actions in `app/(app)/dashboard/actions.ts`:
>   - `markSolved(slug, {confidence, timeTakenMin, approach, timeComplexity, spaceComplexity})` pushes today to `solveDates`, sets `nextReviewAt` via `srs.nextReviewAt`, increments `reviewCount` on re-solves, recomputes the DayLog counts and re-evaluates `isDayComplete`.
>   - `toggleSubtopic(id)`.
>
> Every action calls `requireSession()` and validates input with zod. Use `updateTag`/`refresh` for read-your-writes.
>
> Replace the static dashboard with DESIGN §3.2: progress ring (4 requirements), StreakCard (current, best, ❄ tokens), CountdownCard, PaceIndicator (solved vs ideal for today), a 24-week Heatmap from DayLogs, today's problems with a SolveSheet (shadcn Sheet), the review list, the JS and SQL side-track problems, and today's theory checklist. Use optimistic updates and sonner toasts.
>
> Add service-level tests where logic isn't trivial.

### Phase 4 — DSA, Review, Learn, JS Playground
> 1. **DSA:** turn `/dsa` into a progress view. Each pattern gets an x/y bar, a "Core ✅" milestone, filters (difficulty, status, search) and solved/confidence columns.
> 2. **Problem page:** add `/dsa/[slug]` with an "Open on LeetCode" button, the solve form, a markdown notes editor with preview, and review history.
> 3. **Review:** add `/review` (the due SRS queue).
> 4. **Learn:** turn `/learn` cards into checklists, with a progress bar, a current-week highlight and per-subtopic notes. HLD topics get a "Design template" button.
> 5. **JS Playground:** build `/playground` per DESIGN §3.5b. Use a CodeMirror 6 editor and run code in a Web Worker with a 3 s timeout and console capture. Save snippets in a new `snippets` collection, and add output-prediction drills.
> 6. **Command palette:** add ⌘K (shadcn Command) to jump to any problem or topic.

### Phase 5 — Quiz engine
> Implement `core/llm` (a provider interface plus Gemini, Anthropic and OpenAI-compatible implementations selected by LLM_PROVIDER, using fetch, no heavy SDKs required) and `modules/quiz/services/quiz.ts` per ARCHITECTURE §8: context from today, zod-validated JSON, one retry, and a fallback to `data/quiz-bank.json`.
>
> Add `scripts/generate-quiz-bank.ts` (about 8 MCQs per DSA pattern and per subtopic, including JS output-prediction questions).
>
> Build `/quiz` (locked → player → results with explanations, retake reshuffled) and `/quiz/history`. Passing sets `DayLog.quizPassed` and re-evaluates the day. Add the Sunday weekly quiz.

### Phase 6 — News, notifications, cron
> Implement `modules/news/lib/fetch.ts` per ARCHITECTURE §10 using rss-parser. Include the Google News keyword feeds from `settings.googleNewsQueries`, falling back to the defaults in `data/news-sources.json`. Dedupe by URL hash and title.
>
> Turn `/news` into a reader (category pills, keyword chips, unread/bookmarked filters, mark read on click). Reading counts toward today's `readings`.
>
> Add a notification bell and centre, `/api/cron/morning` and `/api/cron/evening` (Bearer CRON_SECRET) and `vercel.json` crons. Telegram `sendMessage` is enabled only when its env vars are set.

### Phase 7 — Stats, settings, polish
> - `/stats` (Recharts) per DESIGN §3.8.
> - `/settings` per DESIGN §3.9, including the Google News keywords and rest days.
> - `/api/export` (JSON backup).
> - Skeletons and empty states, confetti on day completion, a PWA manifest and icons.
> - An accessibility pass (focus rings, aria-live) and Lighthouse ≥ 90.

### Phase 8 — Deploy
> Walk me through deploying to Vercel: env vars, Atlas network access, `npm run seed` against production, checking both cron endpoints with curl, and installing the PWA on my phone.

---

## Ideas for later (each one is also a talking point in interviews)
- **"Explain my mistake"** on a wrong quiz answer, using one LLM call.
- **RAG over your own notes** with Atlas Vector Search (available on M0). This makes the week-16 topic real.
- **An MCP server for PrepOS** (`get_today_plan`, `mark_solved`) so Claude can read and update your progress. This makes the week-17 topic real.
- **LLD class-diagram templates** for the LLD mock round (parking lot, elevator, splitwise).
- **AI news summaries:** one batched LLM call per morning fills `articles.aiSummary` for the newest AI items.
- **Full LeetCode history import:** an opt-in `LEETCODE_SESSION` cookie for backfilling beyond the last 20 accepted submissions. (Public sync is already done; see ARCHITECTURE §9.)

## Career phases (resume, jobs, web dev)
- **A. Resume**: import PDF/DOCX/TXT, deterministic ATS scorer with JD keyword match, roast (free LLM, rules fallback). Routes `/resume`, `/api/resume/parse`.
- **B. Tailoring**: JD tailoring as a fact-checked patch, saved versions, PDF/DOCX/TXT download. Routes `/resume/tailor`, `/api/resume/[id]/download`.
- **C. Jobs**: tracker with pipeline and follow-ups (in the daily briefing), extension capture of job and profile pages, profile audit. Routes `/jobs`, `/jobs/[id]`, extension `activeTab` button.
- **D. Web dev**: lessons and guided projects outside the syllabus (see ARCHITECTURE §12). Routes `/web`, `/projects`.
- **E1. Ports and optional Redis**: `KvStore` (Mongo default, optional Upstash with fallback), rate limiter, `core/http-safe.ts`.
- **E2. Career sources and sync**: `data/careers.json`, connectors, `jobpostings`, `syncJobs`, `/api/cron/jobs`, `jobs-sync.yml`, `careers:verify`.
- **E3. Discovery**: preferences, deterministic match, Discover/Sources/Search links, posting page with inline tailoring and apply prompt, alerts and briefing section.
- **E4. Live updates**: `/api/events` (SSE), `core/realtime`, client provider with backoff and polling fallback.
- **E5. Hardening**: rate limits, structured sync log with run id, docs and budgets.
