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

The phase prompts below are kept as a record of the spec each phase was built against. The extras listed in the status table (LeetCode sync, mastery quizzes, ports and adapters, idempotent jobs) are described in ARCHITECTURE §3, §8, §9 and §11. Phase 9 is described in ARCHITECTURE §4 (Remember me), §10.1 (reader), §12 (routes) and §15 (PWA).

Known gaps:
- One-line AI news summaries are not built yet (`articles.aiSummary` is unused).
- Some sites block article extraction (OpenAI's blog returns 403, Quastor and Uber block feed fetches). Those articles show the snippet and an "Open original" link.
- The System Design studio has no LLD templates yet; the HLD "Design template" on `/learn` still covers quick notes.
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
> Implement `lib/llm` (a provider interface plus Gemini, Anthropic and OpenAI-compatible implementations selected by LLM_PROVIDER, using fetch, no heavy SDKs required) and `lib/services/quiz.ts` per ARCHITECTURE §8: context from today, zod-validated JSON, one retry, and a fallback to `data/quiz-bank.json`.
>
> Add `scripts/generate-quiz-bank.ts` (about 8 MCQs per DSA pattern and per subtopic, including JS output-prediction questions).
>
> Build `/quiz` (locked → player → results with explanations, retake reshuffled) and `/quiz/history`. Passing sets `DayLog.quizPassed` and re-evaluates the day. Add the Sunday weekly quiz.

### Phase 6 — News, notifications, cron
> Implement `lib/news/fetch.ts` per ARCHITECTURE §10 using rss-parser. Include the Google News keyword feeds from `settings.googleNewsQueries`, falling back to the defaults in `data/news-sources.json`. Dedupe by URL hash and title.
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
- **LLD mock interviews:** the System Design studio's timer and rubric, with class-diagram templates for LLD cases (parking lot, elevator, splitwise).
- **AI news summaries:** one batched LLM call per morning fills `articles.aiSummary` for the newest AI items.
- **Full LeetCode history import:** an opt-in `LEETCODE_SESSION` cookie for backfilling beyond the last 20 accepted submissions. (Public sync is already done; see ARCHITECTURE §9.)
