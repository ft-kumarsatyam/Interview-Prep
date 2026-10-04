# Architecture — PrepOS

PrepOS is a private, single-user web app for a 24-week, zero-to-interview-ready plan for senior backend roles. JavaScript is the main language. It covers DSA in JS, JS/TS and Node.js, DBMS and SQL, OOP and LLD, system design from basic scaling up to big-tech architectures, and AI from fundamentals up. The daily loop is: plan → learn → solve → read → quiz → streak.

**Constraints:** free tiers only (Vercel Hobby, MongoDB Atlas M0, an optional free LLM key; the one opt-in exception is a paid last-resort LLM provider that needs your confirmation), one user, no sign-up, served from `satyam-dev.in` (the `*.vercel.app` URL keeps working).

---

## 1. One repo, frontend and backend together

**Decision:** a single **Next.js 16 App Router** app is both the frontend and the backend. No separate API server, and no Turborepo/monorepo tooling.

| Concern | Where it lives in the same app |
|---|---|
| UI | React Server Components + client components in `app/` and `components/` |
| Reads | Server Components call `lib/services/*` directly (no HTTP hop) |
| Writes | **Server Actions** (`"use server"` functions), validated with zod |
| HTTP endpoints | **Route Handlers** in `app/api/**/route.ts`, for cron, export and webhooks |
| Auth gate | `proxy.ts` (Next 16's new name for middleware) + `requireSession()` |
| Business logic | Pure TypeScript in `lib/domain/*`, unit-tested |
| Data | Mongoose models in `lib/models/*` → MongoDB Atlas |

**Why one app:** one deploy, one set of env vars, shared types end to end, and nothing to keep in sync. A separate Express/Nest backend only pays off with several clients (e.g. a mobile app) or heavy background workers, and neither applies here. If one is ever needed, `lib/services` can be lifted into its own package without rewriting the domain logic.

## 2. Stack (installed versions)

| Concern | Choice |
|---|---|
| Framework | Next.js **16.3** (App Router, Turbopack), React 19.2, TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui (Radix, *Nova* preset), lucide-react, next-themes, sonner |
| Data | MongoDB Atlas **M0** via Mongoose **9** |
| Auth | **jose**-signed JWT in an httpOnly cookie + **bcryptjs**, following the Next.js stateless-session guide. No Auth.js: one env-defined user doesn't need it |
| Validation | **zod 4** (env, Server Action input, LLM output) |
| Tests | **Vitest 4**: `tests/domain` (pure) and `tests/services` (real Mongo via **mongodb-memory-server**, dev-only) |
| Scripts | **tsx** (`seed`, `hash`, `quiz-bank`, `icons`), **sharp** (icons, dev-only) |
| Features | `rss-parser` (news), `@mozilla/readability` + `linkedom` + `turndown` (in-app article reader), plain `fetch` adapters for the LLM, LeetCode GraphQL, Telegram, Brevo and Resend (no SDKs), Recharts 3 (stats), CodeMirror 6 (playground), react-markdown (notes, articles), mermaid (system design diagrams, loaded on demand) |

> Next 16 differences agents must respect (see `node_modules/next/dist/docs/`): `middleware.ts` is now **`proxy.ts`**; `cookies()`, `headers()`, `params` and `searchParams` are **async only**; `next lint` is gone (use `npx eslint .`); `revalidateTag` needs a second argument; route types `PageProps<'/x'>` and `LayoutProps` come from `next typegen`.
>
> **Read-your-writes:** every page is dynamic (session-gated, no `"use cache"`), so Server Actions simply call `refresh()` from `next/cache` after a write. There are no cache tags to keep in sync. Background work after a response (e.g. a stale news refresh) uses `after()` from `next/server`.

## 3. High-level diagram

```
                ┌────────────────────────── Vercel (Hobby) ───────────────────────────┐
 Browser ─HTTPS─▶ proxy.ts  (optimistic: valid session cookie? else → /login)          │
 (desktop/PWA)  │    │                                                                 │
                │    ▼                                                                 │
                │  app/(app)/** pages (RSC) ─▶ requireSession() ─▶ lib/services/* ─┬──▶ MongoDB Atlas M0
                │  Server Actions (writes)  ─▶ requireSession() ─▶ lib/domain/* (pure)  │
                │  app/api/cron/* ─▶ Bearer CRON_SECRET ─▶ services ────────────────┼──▶ RSS + Google News + article pages
                │                                     lib/{leetcode,llm,news,notify} ├──▶ LeetCode GraphQL (public)
                │                                     (adapters, zod-validated)      └──▶ LLM, Telegram, Resend
                └─────────────────────────────────────────────────────────────────────┘
                     ▲ Vercel Cron: ~08:00 IST plan email, ~23:59 IST recap
```

**Layering rule:** pages and actions call `lib/services/*` only. Services do I/O and delegate every decision (targets, streaks, scoring, review dates, sync intents, mastery) to pure functions in `lib/domain/*`.

**Ports and adapters:** every external system sits behind a small interface (`LeetCodeClient`, `LlmProvider`, `FeedFetcher`, `NotifyChannel`). Responses are zod-validated at the edge, and service functions accept the interface as an optional parameter, so tests inject fakes and never touch the network.

**One write path for solves:** manual marks, LeetCode sync and review re-solves all go through `progress.recordSolve()`, which updates the problem, then calls `recomputeDay()`, the single place that rebuilds a DayLog's counts and re-evaluates `isDayComplete`. Subtopic ticks, article reads and quiz passes call `recomputeDay()` too.

**Idempotent jobs:** `ensureToday`, LeetCode sync, news refresh and both cron routes are safe to run concurrently and repeatedly. Plans and quizzes are created once per date (unique index, and a duplicate-key error means "someone else won"). Sync and news claim their run with a compare-and-set on a `settings` timestamp. Notifications carry a `dedupeKey` such as `plan:2026-10-05` with a unique sparse index.

## 4. Authentication (single user, no sign-up), *implemented*

- Credentials live only in env: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH_B64`, a base64-wrapped bcrypt hash. Next.js expands `$` in `.env` files, which corrupts raw bcrypt hashes, hence the base64 step. `npm run hash -- '<password>'` prints the value.
- `app/(auth)/login/actions.ts` (Server Action):
  1. zod-validate the form
  2. check the per-IP throttle (5 failures in 15 min, stored in `loginattempts` with a TTL index)
  3. compare the email in constant time, then always run bcrypt
  4. on success, `createSession({ remember })` sets the `prepos_session` cookie: HS256 JWT with `sub: "owner"` and a `rem` claim, httpOnly, sameSite=lax, secure in production
- **Remember me** (`lib/domain/session-policy.ts`, tested):
  - Ticked (the default): the token and the cookie last **30 days**. Once the token is 7 days old, `proxy.ts` re-issues it on the next request (sliding expiry), so a phone you use weekly stays signed in.
  - Unticked: a browser-session cookie (no `Expires`) whose token also expires after **12 hours**, and it is never renewed.
  - An installed iPhone web app keeps its own cookie jar, so sign in once from the home-screen app with Remember me ticked.
- `proxy.ts`: an optimistic redirect plus the sliding renewal. It skips `/api/*`, static files, `/sw.js` and `/offline`.
- `lib/auth/dal.ts → requireSession()`: the **real** check, called by the `(app)` layout and by every Server Action and route handler that touches data. Cron routes use `lib/auth/cron.ts → isCronAuthorized()` instead: a constant-time comparison against `Bearer CRON_SECRET` that fails closed when the secret isn't set.
- There is no registration route, no user collection and no password reset. To change the password, re-run `npm run hash` and update the env var.

## 5. Content model

Static content is versioned in git under `data/`, seeded into Mongo, and also imported directly by read-only pages.

| File | Contents |
|---|---|
| `data/dsa-sheets.json` | Curated lists over the same problems: `{id, name, source, url, description, omitted, items: [{slug, section, video?}]}`. Blind 75, NeetCode 150 and All come from NeetCode's public data, Striver SDE from the takeuforward sheet (LeetCode-hosted items). Premium-only problems are left out and counted in `omitted`. Every slug must exist in `dsa-problems.json` (`tests/content/dsa-sheets.test.ts`). `/dsa?list=<id>` shows one sheet in its own order with video links |
| `data/dsa-problems.json` | 758 problems (693 main, 35 JS, 30 SQL): `{slug, title, leetcodeId, difficulty, pattern, track: main\|js\|sql, tier: core\|extended, url, order}`. `order` is per track. An optional `step` re-slots a problem into the `/dsa` sheet view ("Basics & Complexity", "Sorting Algorithms") without changing its `pattern`, which the planner and quiz bank still key off (`lib/domain/dsa-sheet.ts` holds the canonical step order). In `main`, all 153 `core` problems come first (pass 1), then `extended` (pass 2), each in pattern order, easy → hard |
| `data/syllabus.json` | 10 tracks, 79 topics, 502 subtopics: `{id, track, week, level 1–4, title, subtopics[], resources[]}` |
| `data/news-sources.json` | 54 RSS feeds in 8 categories (incl. System Design and Tech News), 5 default Google News keyword queries (URL template), browse-only links |
| `data/system-design.json` | the 45-minute framework (6 steps, latency and capacity numbers, a 10-item rubric), 12 building blocks, and 25 case studies in six categories (Core & Scaling, Social & Feed, Media & Realtime, Storage & Data, Payments & Commerce, Specialized / Vol 2), each with requirements, estimates, API, data model, a mermaid diagram, deep dives, trade-offs, interviewer probes and real write-ups. Every case links to an HLD syllabus topic and a `practiceRef` subtopic |
| `data/notes/*.json` | Authored lessons keyed by subtopic id (`${topicId}:${index}`): `{body (markdown), keyPoints[], diagram? (mermaid), sources[{title,url,kind,license?}]}`. 250 lessons cover HLD, networking/API/security, OS, OOP/patterns and LLD. Loaded in `lib/content.ts` (`subtopicNotes`), validated by `tests/content/notes.test.ts`, shown on `/learn/[topicId]` as "Read lesson". `kind` is `authored` (own words), `imported` (adapted from a licensed repo, with `license`) or `reference` (link only). Repos with no licence are never copied |
| `data/engineering-blogs.json` | 44 hand-picked engineering blogs and references, shown on `/design` |

Subtopic id = `${topicId}:${index}`. **Never reorder or delete subtopics inside a topic once progress exists.** Append new ones instead, or progress rows will point at the wrong item.

## 6. Data model (MongoDB), *implemented in `lib/models/*`*

Every `YYYY-MM-DD` value is a **local date in `APP_TIMEZONE`** (default `Asia/Kolkata`). Timestamps are UTC.

| Collection | Key fields | Notes |
|---|---|---|
| `problems` | slug ⓤ, track, tier, order | seeded |
| `topics` | topicId ⓤ, week, position, subtopics[{id,title}] | seeded; `position` = global study order |
| `problemprogresses` | slug ⓤ, status, confidence, timeTakenMin, approach, time/spaceComplexity, notes, nextReviewAt, reviewCount, **solveDates[]**, source manual\|leetcode, needsDetails | solveDates gives per-day counts; `needsDetails` drives the "Fill in details" inbox |
| `subtopicprogresses` | subtopicId ⓤ, topicId, doneOn, confidence 1–5, notes | |
| `dailyplans` | date ⓤ, weekNumber, kind, dsaTarget, dsaNew[], dsaReview[], jsProblem, sqlProblem, theoryTarget, theory[], readings[], hours?, estMinutes?, bonusDsa[]?, bonusTheory[]? (Sunday only, optional) | frozen once created; re-planned only by the explicit "hours today" action (`replanToday`), never once the day is complete |
| `daylogs` | date ⓤ, dsaSolved, theoryDone, readings, quizPassed, complete, freezeUsed, completedAt | the streak's source of truth |
| `quizzes` | (date, kind daily\|weekly) ⓤ, generatedBy llm\|bank, questions[{id, prompt, code?, options×2-6, answerIndex, type? single\|multi\|truefalse, answerIndices? (multi only), explanation, source{kind,ref}, style output\|concept\|pattern\|recall\|llm}], attempts[{answers, correct, pct, submittedAt}], bestPct, passed | `answers[i] = -1` means unanswered; the answer key never reaches the client before submit |
| `practiceattempts` | scope subtopic\|topic\|case\|mistakes, ref, questions[], answers[], pct, submittedAt | subtopic drill = 5 questions, topic quiz = 10, case quiz = 10, mistakes review = 10. Finished attempts plus daily/weekly quiz attempts are the per-question history behind rotation and the mistakes review |
| `masteries` | ref ⓤ, scope, score 0–100 (EMA), attempts, bestPct, masteredOn | `masteredOn` is set only by a passed topic quiz |
| `data/os-dbms-cases.json` | 16 OS and DBMS "explain it" cases (`kind` os\|dbms): interview questions, talking points, optional mermaid diagram, trade-offs, probes, readings. Each links to a syllabus topic and a `practiceRef` subtopic |
| `data/dsa-testcases.json` | per-problem function signature, starter code, visible/hidden test cases and hints for the in-app runner. Entries are v2 (older v1 string hints still read): `argTypes`/`returns` (`value`, `ListNode`, `TreeNode`, `arg0` for in-place) and `compare` (`exact` or `unordered`) describe how the Worker builds arguments and judges results; cases carry an optional `edge` id (`lib/domain/edge-cases.ts`) and a `note`; hints are a three-step ladder (nudge, approach, pseudocode). Authored as specs in `scripts/dsa-testcases/specs/*.ts` and built by `scripts/generate-dsa-testcases.ts`: `expected` is only ever the output of the spec's reference solution in `node:vm`, must agree with an independent brute force on every case and 200 seeded random inputs, and the spec must pass the quality lint (>=2 visible examples, >=3 edge cases, >=40% hidden, no duplicate inputs, a starter that doesn't pass, short language-neutral pseudocode). A Vitest suite regenerates every entry and fails if the committed JSON drifted, and a third, blind solution per problem (`scripts/dsa-verify/`, written without seeing the stored answers) must agree too. 83 problems today (arrays, strings, pointers, windows, stacks, search, DP, greedy, bits, linked lists, trees); the rest fall back to LeetCode |
| `snippets` | title, code, tag (comma or space separated tags) | Playground saves |
| `practiceanswers` | (kind os\|dbms, slug) ⓤ, sections{definition, example, tradeoffs, realSystems, followups}, rubric[], minutesSpent | your OS/DBMS mock answers |
| `settings` | _id `"settings"`, plan dates, clamps, quizPassPct, topicMasteryPct, restDays[], freezeTokens, settledThrough, googleNewsQueries (null = defaults), leetcodeUsername, leetcodeLastSyncAt, leetcodeLastError, leetcodeSeenIds[] (cap 200), newsLastFetchAt, newsLastFailed[], lastMorningRunAt, lastEveningRunAt, lastExportAt, hoursByDow[], mockDsaWeekday, mockHldWeekday (0 = Sunday; defaults Saturday and Sunday) | singleton; lastMorningRunAt through lastExportAt feed `/setup` |
| `articles` | urlHash ⓤ, url, title, titleKey, sourceId, sourceName, category, publishedAt?, fetchedAt, snippet, aiSummary, read, readOn, bookmarked, **content** (markdown, ≤ 80k chars), contentStatus full\|extracted\|failed\|headline\|null, contentError, readingMinutes, leadImage, tags[] | TTL 30 days on `fetchedAt`; bookmarking unsets `fetchedAt` so saved articles never expire. Indexes on `tags` and `{contentStatus, category}` |
| `designs` | slug ⓤ, sections{requirements, estimates, api, dataModel, architecture, deepDives} (≤ 20k chars each), rubric[] (checked ids), minutesSpent | your System Design mock answers, one per case |
| `notifications` | kind plan\|reminder\|streak\|milestone\|sync, title, body, read, dedupeKey ⓤ (sparse) | |
| `customproblems` | slug ⓤ, title, source ai\|pasted, difficulty, topic, statementMd, functionName, params[{name,type}], returnType, compare, cases[{input[], expected, hidden}], hints[], solution?, attempts, solvedOn | problems from outside the sheet, same runner shape as `data/dsa-testcases.json`. Saved only after the browser has run the reference solution on every case (cases it disagrees with are dropped); never read by the planner or streak |
| `customsolves` | slug, date, language javascript\|typescript\|python, ms | accepted submissions of custom problems; kept apart from `problemprogresses` so they never count toward the plan |
| `mocksessions` | type (9 kinds), date, startedAt, durationMin, **deadlineAt**, submittedAt, status in_progress\|submitted\|graded, rounds[] (question set frozen at start), answers{qid → code/language/passed/total/accepted/msSpent/hintsUsed/choice/sections/scores[]/gradedBy/summary}, totalScore, roundScores[], autoSubmitted | timed mock interviews (§7.1). The deadline is server-authoritative; never read by the planner or streak |
| `loginattempts` | ip, at | TTL 15 min |

## 7. Domain rules (`lib/domain/*`), *implemented and tested*

Modules: `dates`, `plan-config`, `planner`, `streak`, `srs`, `quiz`, `progress`, `pace`, `heatmap`, `leetcode`, `mastery`, `sampling` (seeded RNG, weighted sampling), `news`, `article` (reading time, tags, SSRF URL checks, source diversity), `reminders`, `stats`, `settings`, `session-policy`, `setup` (checklist), `design` (rubric score, case status, related-article ranking), `ide` (test-case drafts), `starters` (per-language starter code), `custom-problem` (validation, case-line parsing, prompts), `problem-topics`, `mock` and `mock-bank` (§7.1).

**Day kinds** (`planner.dayKind`):
- `outside` (before start or after end)
- `rest` (listed in `settings.restDays`)
- `sunday`
- `revision` (from `endDate − 3 weeks + 1`, i.e. 2027-03-01)
- `study`

**DSA target** (`computeDsaTarget`):
- Ramp-up while learning JS: weeks 1–2 → 2/day, weeks 3–4 → 3/day. Saturday counts as a double day.
- From week 5: `ceil(remainingMain / weightedStudyDaysUntilRevision)`, clamped to 3–6. Saturday is ×2, capped at 10.
- Revision days: 2 timed problems. Sunday and rest days: 0. Never more than what's left.

**Plan** (`buildDailyPlan`):
- `dsaNew` = the next unsolved `main` problems by order
- `dsaReview` = due reviews, oldest first (2 per day, 4 on Sunday)
- `jsProblem` = the next unsolved JS-track problem (study and revision days)
- `sqlProblem` = the next unsolved SQL problem from week 4
- `theory` = undone subtopics with `week ≤ current week`, oldest first. Target = `ceil(due / study days left this week)`, clamped to 1–5.
- **Every problem solved today counts toward the DSA number:** new, review, JS and SQL.

**Completion and streak** (`streak.ts`):
- Study day = `dsaSolved ≥ dsaTarget && theoryDone ≥ theoryTarget && quizPassed`.
- Sunday = weekly quiz passed. Rest day = auto-complete.
- The quiz unlocks after `min(1, dsaTarget)` problems and `min(1, theoryTarget)` subtopics.
- `currentStreak` doesn't break while today is in progress. Freeze days bridge a gap but don't add to the count.
- `settleDays` runs each morning and on dashboard load. It walks the unsettled past days, spends a freeze on a missed day only if the streak is alive, and earns 1 token per 7 consecutive completed days (max 2).

**Spaced repetition** (`srs.nextReviewAt`):
- struggled → +3, +7, +21 days (repeats every 21 days while still struggled)
- ok → +14 days once
- easy → never

**Quiz** (`quiz.ts`): unanswered counts as wrong. Pass = `pct ≥ quizPassPct` (60).

**Calendar projection** (`planner.projectDays`): future days are simulated with `buildDailyPlan`, starting from today's frozen plan and assuming every planned item gets done (new problems solved, theory ticked, reviews cleared). `/calendar` labels these days as a projection; the real plan is still frozen on the morning of the day.

### 7.0 Planner intake, feasibility and weekly rebalance

The fixed 24-week plan is personalised by a guided intake at `/plan/setup` (`PlannerIntake` singleton, `lib/models/planner.ts`). Everything is optional and defaulted: with no completed intake the planner behaves exactly as before.

- **Intake** (`lib/domain/planner-intake.ts`, `lib/services/planner-intake.ts`): three autosaved steps (goals + interview date + level, a 1-5 rating / want-to-learn / must-nice-skip tier per topic, hours per weekday plus date-range overrides), an optional bank-based diagnostic (`lib/services/diagnostic.ts`, graded server-side against `quiz-bank.json`, stores `diagnosticScore` per topic, no LLM needed) and a review step. `completeIntake` hands role, company, hours and interview date to `savePlanner`, so Settings, the calendar and the change log stay the single source for those. Rest days stay in Settings. Overrides are 0.5-12 h; full days off are rest days.
- **Weights** (`lib/domain/topic-priority.ts`): strength = rating blended with the diagnostic (x1.5) and practice mastery (x2), so evidence outweighs opinion. Strength becomes a study weight (skip = 0, nice = x0.6, want-to-learn = x1.25). `loadPersonalisation` (`lib/services/intake-weights.ts`) feeds weights and overrides into `loadPlanInputs`; `dueSubtopics` then drops skipped subtopics and orders weak/wanted ones first (no weights = plain syllabus order).
- **Window scaling** (`plan-config.ts`): windows under 24 weeks compress the syllabus (`scaledWeek`), phases (`phasesFor`), the DSA ramp and the SQL start week, so every topic still comes due before revision. 24 weeks or more is unchanged.
- **Feasibility** (`lib/domain/feasibility.ts`): work left (DSA by difficulty cost, JS/SQL, weighted theory) against study-day minutes before revision (Sundays, rest days and the fixed quiz/news/write-up blocks removed, 10% overhead). Status on-track / tight (>=85%) / at-risk, with remedies: drop nice-to-have, add hours a week, move the date.
- **Weekly rebalance** (`lib/domain/rebalance.ts`, `lib/services/rebalance.ts`): at most one proposal per Mon-Sun week, created by the morning cron or lazily on `/plan`, stored on the intake document and announced with a notification. It recalibrates ratings that are 2+ points off measured evidence, demotes the strongest must-have topics when time is short, and promotes nice-to-have topics when there is 25% slack. Nothing changes until Apply (compare-and-set, logged as a `rebalance` change); Dismiss keeps it for the week.

### 7.1 Mock interviews (`mock.ts`, `mock-bank.ts`)
- **Nine types:** DSA (60 min, 2 coding), JavaScript (40, 4 output MCQs + 2 written), Node.js (50, 3 written), System design HLD (60, 1 case), LLD (50, 1), SQL (40, 3), Project deep dive (40, 4), Behavioral (30, 3 STAR) and a Full loop (120: coding 45, JS 25, HLD 40, behavioral 10).
- **Question sources:** coding problems come from the 83 runnable sheet problems plus your custom problems (the first is Easy or Medium, later ones Medium or harder, and problems from your last 8 mocks are skipped). JS MCQs are the bank's verified output questions; HLD uses a `data/system-design.json` case with the six framework steps scaled to the round and the 10-item rubric. Written prompts come from `mock-bank.ts` (in `lib/`, so `data/*.json` stays untouched), or from the free AI for Node.js, LLD, project and behavioral when you ask for fresh questions; the bank tops up anything the AI doesn't return. The whole set is frozen into the session at start.
- **Timer:** `deadlineAt = startedAt + duration` is stored on the server. The client counts down against a server-time offset and auto-submits at zero; the server accepts saves up to 60 s past the deadline and closes any expired session the next time mocks are read, so closing the tab can't extend the time.
- **Scoring (0–100 per question):** coding = 80 × passed/total + 20 if accepted within the round's per-problem budget (10 if over) − 5 per hint; MCQ = 100 or 0; written = mean rubric score (0–4 per criterion) × 25, blank = 0, ungraded = pending. Rounds average their questions; the total weights rounds by minutes and is withheld while anything is pending.
- **Grading:** written answers go to the free AI chain (`mock-grade`, never the paid provider), wrapped in tags with injected tags stripped, zod-validated, required to score every criterion, and cached 30 days. With no AI, or when it fails, the report shows a 0–4 self-review form per criterion; an AI grade can also be overridden.
- **Weekly mocks:** a DSA slot and a System design slot on weekdays set in Settings. A slot counts as done once a matching mock (a Full mock counts for both) is finished in the same Monday-start week. Shown on the dashboard, `/mock` and `/calendar`. **Mocks never touch the daily plan or the streak.**

## 8. Quizzes: three layers

All quiz questions share one shape (`lib/quiz/question.ts`): a prompt, optional `code`, 2–6 options (4 for `single`), `answerIndex`, an explanation, a `source {kind, ref}`, a `style` and an optional `difficulty` (`easy|medium|hard`; unrated counts as any). The client only ever receives the public view without the answer; scoring happens on the server.

### 8.1 Daily quiz (gates the streak)

```ts
interface LlmProvider { generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> }
// lib/llm/adapters.ts: gemini (default, free tier) · anthropic · openai-compatible (Groq, the paid Meta Llama endpoint, etc.), all over fetch.
// lib/llm/chain.ts composes the configured providers: free ones in order (the feature's preferred provider first), the paid one last.
// lib/domain/llm-router.ts holds the pure rules: a 429 cools a provider down for Retry-After (default 60 s), a daily quota until the next
// local day, a rejected key disables it, two transient failures in a row pause it 5 min. That state lives in Mongo (`llmstates`) because
// serverless instances share no memory. Paid use needs a confirmation (Use once / Allow today), never happens for background work, and is
// capped per day by an atomic `_id`-keyed counter (`paidcaps`). Validated answers are cached in `aicaches` (TTL, 8 KB cap, never failures or
// prompts); usage counters are in `aiusages`. None of these collections is part of the backup export.
// LeetCode problem content (statement, official hints, example inputs) is fetched lazily from LeetCode's public GraphQL on first view of
// `/dsa/[slug]`, converted to markdown by the same sanitiser as the news reader (scripts, iframes and forms dropped, http(s)-only links, images
// only from LeetCode hosts) and cached in `lcproblemcaches` (60 days; premium and not-found 30 days; a failure 1 hour). It is third-party content,
// so it is never written to data/*.json or git and is excluded from the backup export. "Copy code + open LeetCode" then polls the public
// recent-accepted list (30 s floor, 5 min window, no cookie) to detect the Accepted submission and import it as a normal synced solve.
// Custom problems (`generate-questions`) and mock prompts use the free chain only; mock grading has its own `mock-grade` feature, also free only.
// With no key, "Generate" falls back to an unsolved runnable sheet problem and mocks use the built-in prompt bank plus self-review.
```

1. **Context:** today's solved problems (title, pattern, your one-line approach), the subtopics checked today, and the articles read today. When nothing is logged yet, the plan's items are used instead.
2. **Composition (10 questions):** about 4 DSA (pattern, complexity, JS data structure, edge cases), 4 theory and 2 on today's articles when you read any. **On JS-track days, 2 of the theory slots are verified output-prediction questions from the bank**, even when an LLM is configured.
3. **LLM path:** zod-validate the output (`llmQuizSchema`), retry once with the error appended, and keep only refs that exist. Any failure falls back to the bank.
4. **Bank path:** `data/quiz-bank.json` (5,584 questions) is layered from most to least relevant: today's items, then the plan, sibling subtopics, everything studied so far, and finally the whole bank. Selection uses a seeded RNG (`daily:${date}`) weighted by **rotation** (§8.5), so it's deterministic for a given day and history and doesn't keep re-asking questions you already answered right.
5. **Storage:** one document per `(date, kind)`, never regenerated (a duplicate-key error means another request created it first). Retakes reshuffle the same questions. LLM output is untrusted text: no HTML rendering, and the schema enforces length caps.
6. **Unlock:** `min(1, dsaTarget)` problems and `min(1, theoryTarget)` subtopics. **Passing (≥ `quizPassPct`) sets `DayLog.quizPassed`**, which is required for a complete study day.
7. **Weekly quiz (Sunday):** 25 questions from the week's daily quizzes (wrong answers weighted 3×, unattempted 2×) plus 5 new bank questions from the week's topics and patterns (rotation-weighted).

### 8.2 Subtopic practice (mastery, ungated)
- A **Practice** button on every subtopic in `/learn` serves 5 questions from the subtopic's ~12 bank questions (siblings only fill gaps; the LLM tops up only when the bank is thin). Runs are unlimited: each one rotates toward questions you haven't seen or last got wrong (§8.5).
- An optional **difficulty** (Any / Easy / Medium / Hard) is chosen before a subtopic, topic or case run. Matching questions are drawn first; unrated or other-level questions only fill a short run (`difficultyLayers`).
- Each submitted attempt updates `masteries` with an exponential moving average (`score = 0.4·pct + 0.6·prev`; the first attempt sets the score outright).
- Practice is repeatable and **never touches the streak**.

### 8.3 Topic quiz ("Mastered")
- Opens once every subtopic in the topic is ticked (`canTakeTopicQuiz`).
- 10 questions, where each slot is drawn from a subtopic picked by weakness (`subtopicWeight = 1 + (100 − score)/25`, up to 5×).
- Scoring at least `topicMasteryPct` (default 70, editable in Settings) sets `masteredOn` and shows the *Mastered* badge. Ticking subtopics never depends on it, so the daily theory target stays achievable.
- Wrong output-prediction answers get an **Open in Playground** link (`/playground?snippet=…`).
- **Question formats:** `single` (default, 4 options), `multi` (select all that apply, 4-6 options, exact set required, no partial credit) and `truefalse`. A stored answer is one number per question: the option index, or for `multi` a bitmask over the original option indices. The answer key uses the same encoding (`correctAnswerKey` in `lib/domain/quiz.ts`), so `scoreQuiz` is unchanged; never compare against `answerIndex` directly. A missing `type` means `single`, so every question stored before these formats still works.

### 8.4 The bank generator (`scripts/generate-quiz-bank.ts`, `npm run quiz-bank`)
- Most questions are **hand-written per subtopic** in `scripts/quiz-bank/authored/<topicId>.json` (`{ "<subtopicId>": [...] }`, ~11 per subtopic, every one tagged `easy|medium|hard`): `single`, `multi`, `truefalse` and `output`. `output` entries are run in `node:vm` and the real output becomes the answer. `scripts/check-quiz-authored.ts <file>` dry-runs a file (shape, duplicates, minimum count, vm output); `--list <topicId>` prints a topic's subtopics and existing questions. Options are shuffled deterministically per question id.
- Pattern questions come from `scripts/quiz-bank/patterns.ts`, concept questions from `concepts.ts`, and syllabus-recall filler only for subtopics with fewer than 3 real questions (none, now that every subtopic is authored).
- **Output-prediction snippets** (`output-snippets.ts`) are executed in `node:vm` with a timeout. The recorded console output *is* the correct option, so the answer key can't be wrong. `node:vm` is not a security boundary: it runs only hand-written snippets from the repo, never model or user code.
- `--llm` adds LLM-written questions per subtopic, paced by `LLM_DELAY_MS`.
- **Case quizzes** (`data/case-quizzes.json`, 1,031 questions, ~25 per case) build from `scripts/case-quizzes/parts/*.json` with `scripts/build-case-quizzes.ts`. A case may appear in several part files; lists append in file-name order so existing ids never change. A run is 10 questions.

### 8.5 Rotation, difficulty and the mistakes review
- **History** (`lib/services/question-history.ts`): every answered question from finished practice runs and daily/weekly quiz attempts, folded per question id by `buildHistory` (attempts, misses, latest outcome).
- **Rotation** (`rotationWeight`): never seen ×4, last answer wrong ×3, last answer right ×0.2 rising back to ×1 over 14 days. It multiplies the bank weight in practice, topic, case, daily and weekly picks, so repeat runs surface new material first and known questions come back spaced out.
- **Mistakes review** (`/quiz/mistakes`, practice ref `mistakes` or `mistakes:<track>`): questions whose latest answer was wrong, as they were asked (so AI-written questions work too), weighted by how often they were missed. 10 per run; it never changes mastery or the streak, and a right answer removes the question from the list. Built for the revision weeks (21–24).

## 9. LeetCode sync (public profile)

- **Client** (`lib/leetcode/client.ts`): POST to `https://leetcode.com/graphql` (Referer header, 8 s timeout).
  - `recentAcSubmissionList(username, limit: 20)` returns `{id, titleSlug, timestamp}`.
  - `matchedUser(username)` returns solved counts by difficulty for the stats card.
  - Responses are zod-validated. No login cookie is used, so only the **last 20 accepted submissions** are visible. Syncing at least daily covers normal use.
- **Domain** (`lib/domain/leetcode.ts → planSync`): converts each timestamp to an `APP_TIMEZONE` date, drops slugs PrepOS doesn't track and ids already seen, and skips dates already in `solveDates`. The output is a list of `recordSolve` intents.
- **Service** (`services/leetcode-sync.ts`):
  - Runs on dashboard load (throttled to once per 10 minutes), from both crons, and from *Sync now*.
  - It claims the run with a compare-and-set on `leetcodeLastSyncAt`.
  - It records the submission ids it has seen (capped at 200).
- **Imported solves** get `source: "leetcode"` and `needsDetails: true`. They count toward the DSA target and streak exactly like manual ones, and the daily quiz is still required. Until you fill in details, SRS schedules them as `ok`.
- **Username:** seeded from `LEETCODE_USERNAME` on first run and edited in Settings. Changing it resets `leetcodeSeenIds` and `leetcodeLastSyncAt`. `npm run seed` never overwrites it.

## 10. News pipeline

- **Sources:** all `feeds[]` plus **Google News search feeds** built from `googleNews.urlTemplate` and the keyword list (defaults: OpenAI, Google Gemini, Anthropic Claude, generative AI, backend and system design; editable in Settings, up to 12). Official **OpenAI**, **Google AI**, **Google Research**, **Google Developers** and **DeepMind** blogs are included directly.
- **Fetch** (`lib/news/fetch.ts`): everything runs in parallel with `Promise.allSettled`, a 10 s timeout and a 5 MB body cap per feed.
  - It sends a browser-like `User-Agent` and an `Accept` header that ends in `*/*`, because some feeds (blog.google) stall otherwise.
  - Failed feeds are reported by id and never block the rest.
- **Merge** (`lib/domain/news.ts → mergeFeeds`, pure): keeps the newest `maxItemsPerFeed` (10) items per feed.
  - It dedupes by `sha1(url)` and by normalised title (`titleKey` strips the " - Publisher" suffix that Google News adds), including against titles already stored.
  - Snippets are HTML-stripped and capped at 280 characters. Only http(s) URLs are kept.
- **Store:** `$setOnInsert` upserts, so read and bookmark state survive refreshes. Undated items keep `publishedAt` empty and sort as if published one day before they were fetched, so they never flood the top.
- **Refresh triggers:** the morning cron (forced), the *Refresh* button (forced, at least 1 minute apart), and opening `/news` when the cache is older than 6 h (runs in `after()`). Concurrent refreshes are prevented by a compare-and-set on `settings.newsLastFetchAt`.
- **Reading:** opening an article sets `readOn = today` the first time, which feeds `DayLog.readings`.
- **Deferred:** one-line AI summaries. The `aiSummary` field exists but nothing writes it yet.

### 10.1 In-app reader (`/news/[id]`), free and without an LLM
- **Feed body first:** at ingest, the item's `content:encoded` (or Atom content) goes through `lib/news/markdown.ts`: turndown converts it to markdown and drops script, style, iframe, form and svg. Links are kept only if http(s) and resolved against the article URL; images only if https. The result is capped at 80k characters on a paragraph boundary. At least 250 words gives `contentStatus: "full"`; shorter bodies are teasers and stay `null`. Google News items are `headline` (their link is a redirect, not the article).
- **Extraction** (`lib/news/extract.ts`) for teasers: the page is fetched and run through Mozilla Readability on linkedom, then converted to markdown the same way. A result gives `extracted`; a failure gives `failed` plus `contentError`, and failed articles are never retried.
  - **SSRF guard:** `isSafeUrl` allows http(s) only, with no credentials, no explicit port, no localhost/`.local`/`.internal`/dotless hosts and no private IP literals. Before each hop, the host's DNS answers are checked with `isPrivateAddress` (RFC 1918, loopback, link-local, CGNAT, benchmarking, documentation ranges, IPv6 ULA and mapped addresses). Redirects are followed by hand (at most 3, each re-checked). Requests time out after 10 s, the body is capped at 3 MB, and only HTML content types are accepted.
- **When it runs:** the morning cron prefetches up to 20 recent teasers from the system-design, engineering, ai-labs and databases categories (4 at a time, 25 s budget). Any other teaser is extracted on demand the first time you open it (typically under 1 s).
- **Rendering:** react-markdown with `skipHtml`, links open in a new tab with `noopener noreferrer nofollow`, and images are https-only, lazy-loaded and `no-referrer`. Nothing goes through `dangerouslySetInnerHTML`.
- **Discovery:** `classifyTags` adds up to 4 topic tags (system-design, distributed, databases, caching, queues, infra, reliability, security, llm, javascript, career) from title and body. `/news` has a "System design picks" rail (long reads, at most 2 per source), topic chips (`?tag=`) and a "Full articles" filter (`?f=full`). The dashboard strip prefers long reads.
- **Size:** about 300 full bodies average roughly 18 KB each (≈ 5.5 MB). With the 30-day TTL that stays well under the 512 MB M0 limit. `listArticles` never loads `content`, and the export leaves it out.

### 10.2 Blogs without RSS
Feeds with `kind: "sitemap"` (Scale Engineer, its hw.glich.co newsletter and DesignGurus, category `interview-prep`) have no RSS. `lib/news/fetch.ts` reads the sitemap (`lib/domain/sitemap.ts`), takes the 10 newest URLs under `match`, and reads each page's `<head>` meta tags for title, description, image and date. Bodies are teasers, so the reader extracts them on demand. Extra tags: DSA, Coding, Behavioural & habits, Science, Quizzes & puzzles.

## 11. Scheduled jobs and notifications

| Path | Cron (UTC) | IST | Does |
|---|---|---|---|
| `/api/cron/morning` | `30 2 * * *` | ~08:00 | `ensureToday` (settle past days, build plan) → "Today's plan" notification + email (with a carry-over note when yesterday left work open) → refresh news (forced) → prefetch article text (§10.1) → LeetCode sync (forced) |
| `/api/cron/evening` | `29 18 * * *` | ~23:59 | LeetCode sync → `ensureToday` → **day recap** (`lib/domain/recap.ts`, `lib/services/recap.ts`): scorecard, items solved and still open, streak standing, tomorrow's preview (rebuilt from real progress, so open work is already in it), pace and DSA finish forecast, the backlog, plus the **weekly report** after the recap on Sunday nights (`lib/domain/weekly.ts`, `lib/services/weekly.ts`, `dedupeKey weekly:<date>`). In-app notification kind `recap`, email/Telegram push. A run landing after midnight (before 06:00 local) recaps the day that just ended |
| `/api/cron/briefing` | none on Vercel; `.github/workflows/news-briefing.yml` (03, 06, 09, 12, 15 UTC) or cron-job.org | every ~3 h | the **news tick** (`lib/services/briefing.ts`, `lib/domain/briefing.ts`): refresh stale feeds, send the **daily briefing** the first tick after 08:00 local (also sent by the morning cron after its news refresh; `dedupeKey briefing:<date>`), then **top-news alerts** |
| `/api/cron/reminder` | none on Vercel; `.github/workflows/evening-nudge.yml` (15:00 UTC) or cron-job.org | ~20:30 | the **evening nudge** (`lib/domain/nudge.ts`, `lib/services/nudge.ts`): if today is unfinished, what is left, the hours left before midnight, the streak at stake and the backlog. Once per day (`dedupeKey reminder:<date>`); silent on finished, rest and outside days |

- **Briefing and alerts.** Articles are scored (`scoreArticle`: category weight + age decay + your interest tags from your targets' kinds of company + bookmark/long-read bonus). The briefing (kind `news`) has three parts: **Top news** (unread AI-labs, AI, tech and engineering stories from the last 72 h, one per source), **System design: study this** (the next open design case from your targets' gaps, else the first case you have not practised, plus unread posts matching its keywords, then the best system-design posts) and **Questions to practise** (your targets' open DSA gaps, else today's backlog queue). An **alert** is a single story scoring at least `ALERT_MIN_SCORE` and at most `ALERT_MAX_AGE_H` hours old; at most `ALERT_DAILY_CAP` (3) per rolling 24 h (counted from `alert:` dedupe keys), one per article (`alert:<articleId>`), never one the day's briefing already carried. Switch each off in Settings (`mailBriefing`, `mailAlerts`). Neither affects the streak.
- Each step runs independently (one failing step doesn't skip the others), and the JSON response reports every step's outcome. `maxDuration = 60`. Each run stamps `lastMorningRunAt` / `lastEveningRunAt`, which `/setup` uses to show whether the crons are actually firing.
- Hobby crons run once a day and fire somewhere within the scheduled hour. **Correctness never depends on them:** the dashboard calls `ensureToday()`, which settles past days, creates today's plan if missing and syncs LeetCode.
- Free fallback: cron-job.org or a GitHub Actions `schedule` hitting the same URLs with the bearer secret.
- **Notifications** (`services/notifications.ts`) are always stored for the in-app bell. They're pushed to every configured channel in `lib/notify` (Telegram `sendMessage`, and one email channel: Brevo's REST API when configured, else Resend) only for plan and reminder kinds. The morning plan push carries the full digest (`domain/reminders.ts` `morningDigest`: targets, reviews, theory, unread reading, pace; HTML-escaped, built from DB and seed data only) while the in-app bell keeps a one-line summary. Push failures are logged and never fail the job.

## 12. Routes

| Route | What |
|---|---|
| `/login` | single-user sign-in with throttling |
| `/dashboard` | progress ring, streak, pace, heatmap (each day links to `/calendar/[date]`), today's problems, side-tracks, review, theory, this week's mocks, "Fill in details" inbox, news strip, "Finish setup" card while required setup items are open |
| `/calendar` | month grid (`?m=YYYY-MM`, bounded by the plan window): past days show frozen targets and completion, future days a projection; weekly mock badges |
| `/calendar/[date]` | one day: new DSA, theory, reviews, JS/SQL and bonus items with done ticks for past days, the scheduled weekly mock, and a projection banner for future days |
| `/plan/setup` | five-step intake wizard (see §7.0); `/plan` also shows the feasibility card, the weekly rebalance suggestion and a strengths list, and redirects here for a brand-new planner. Five-step intake wizard: goal, strengths, time, optional check, review with live feasibility |
| `/setup` | setup checklist: database seeded, secrets, LeetCode (last sync and error), crons firing, news feeds (failed ones), notifications, LLM, backup age, session (Remember me), each with a fix button or link |
| `/dsa`, `/dsa/[slug]` | progress per pattern or per **step** (a Pattern \| Sheet toggle: a teaching-order, tick-mark sheet with a per-step progress bar), filters; problem page with solve form, notes, history, Open on LeetCode, and, for problems in `data/dsa-testcases.json`, a **Code** tab: the IDE shell (resizable statement and editor panes with a full-screen mode, tabs on mobile) with a JavaScript, TypeScript or Python editor (Python runs on Pyodide in its own Web Worker, loaded from the jsDelivr CDN on first use), editable and addable test cases, Run (visible cases) and Submit (all cases), per-language drafts, a hint ladder, and an **Edge cases** tab (each named edge case with why it matters, run one or all). After a failed Submit the first failing hidden case is revealed once (`ProblemProgress.revealedCases`) and stays visible; other hidden cases remain pass/fail only. A passing Submit opens the normal solve form (`recordSolve`); a failed one marks the problem "attempted" |
| `/review` | due spaced-repetition queue |
| `/problems`, `/problems/new`, `/problems/[slug]` | questions from anywhere: generate one with the free AI (topic, difficulty, optional company style) or paste a statement (cases as `[args] => expected` lines, optional "Fill the rest with AI"); each runs in the same IDE shell. Solves are recorded separately and never affect the plan |
| `/mock`, `/mock/[id]`, `/mock/[id]/report` | mock interviews (§7.1): type picker, this week's slots, history with a score trend; the session runner (sticky countdown, question stepper, autosave, the IDE for coding, MCQ and sectioned written answers); the report (round and total scores, strengths, gaps, practise-next links, per-question detail, AI or self grading) |
| `/learn` | Continue card, track chips with %, compact topic rows, search across every track; old `?track=x#topic-<id>` links redirect to the topic page |
| `/learn/[topicId]` | one topic: checklist (next subtopic highlighted), per-subtopic Practice and notes, topic quiz (locked until every subtopic is ticked), resources, related cases, prev/next in the track |
| `/learn/practice?ref=` | subtopic practice, topic quiz, case quiz and mistakes review runner, with a difficulty picker |
| `/design` | System Design studio: the 45-minute framework, case grid with status (new → studying → practised → mastered, mastered = the linked HLD topic quiz), building blocks, latency and capacity cheat sheet |
| `/design/os`, `/design/dbms` | OS and database practice studios: the same card grid, status and 20-minute mock (definition, example, trade-offs, real systems, follow-ups) on `data/os-dbms-cases.json`. A System Design \| OS \| Databases tab bar switches between the three |
| `/design/os/[slug]`, `/design/dbms/[slug]` | **Study** tab: the question, what a strong answer covers, diagram, trade-offs, follow-ups, readings. **Mock answer** tab: 20-minute timer and five autosaving sections plus the shared rubric |
| `/design/[slug]` | **Study** tab: requirements, estimates, API, data model, mermaid diagram, deep dives, trade-offs, interviewer probes, blocks used, real write-ups, related articles from your feed. **Mock interview** tab: 45-minute timer with per-section pacing, six markdown sections (autosave), self-review rubric; links to the practice quiz for the case's subtopic |
| `/playground` | CodeMirror + Web Worker runner (3 s timeout, output capped at 2000 lines), `assertEqual`/`test` helpers, `console.table`/`group`/`time`, a TS toggle (types stripped, syntax errors reported, no type checking; `typescript` loads lazily), searchable tagged snippets, 22 output drills, `?snippet=` preload and share link, scratch autosave (localStorage), resizable editor/console |
| `/quiz`, `/quiz/history`, `/quiz/history/[date]`, `/quiz/mistakes` | daily/weekly quiz (locked → player → results), past quizzes with explanations, and the mistakes review (counts per track, most-missed questions, review runs) |
| `/plan` | **Planner** (single-user Planly-style layer over the existing engine, no accounts): Mon–Sun **sprint** for any plan week (objectives = that week's syllabus topics plus planned problems/subtopics/reviews/quizzes, each day's frozen or projected targets, completion so far); **seven separate progress indicators** (task completion, topic coverage, assessment, study time, consistency, revision due, skills assessed, never blended into one "readiness" score); **study timer** (`studysessions`, survives reloads); **goals and availability** form (target role/company, language, focus areas, interview date, hours per weekday; hours and date are the same fields as Settings); and the **plan change log** (`planchanges`: goals, hours, rest days, plan window, hours-today re-plans, and the carry-over recorded when a day closes with work left, each with its effect, idempotent). Today's frozen plan never changes except through "hours today"; edits re-plan future days |
| `/resume` | **Resume** (Career): upload a PDF/DOCX/TXT (`/api/resume/parse`, 3 MB, text only, nothing stored from the file) or paste; the text is parsed (`lib/domain/resume.ts`) and scored live in the browser by the pure **ATS scorer** (`lib/domain/ats.ts`: contact, sections, length, action verbs, metrics, bullet length, skills, formatting risks, dates, filler language, and a weighted **JD keyword match** with alias-aware terms and nice-to-have detection; every check has a score, weight and fix, and no model is involved). **Roast** (`lib/services/resume.ts`, AI feature `resume-roast`, `paid: "never"`) uses the free LLM at the Settings roast level with the resume as untrusted data and validated JSON output, and falls back to `roastFromRules` (grounded in the checks) with no key. One base resume plus up to 12 tailored versions are stored in `resumes` (text only, 60 KB cap, included in the backup). **`/resume/tailor`**: paste a JD, tick the missing skills you really have, and review a patch (summary, up to 10 bullet rewrites, skills order) from the `resume-tailor` AI feature (`paid: "never"`). `validateTailor` (`lib/domain/resume-tailor.ts`) rejects any rewrite that adds a technology the bullet did not mention (unless you approved it) or a number that was not there (placeholders like `[X%]` pass), so tailoring cannot invent facts; with no AI the only change is putting the JD's skills first. The ATS score is shown before and after, and a saved version downloads as PDF (`pdf-lib`), DOCX (`docx`) or TXT from `/api/resume/[id]/download`, all single-column real text |
| `/jobs`, `/jobs/[id]` | **Job tracker** (Career): pipeline saved, applied, screening, interview, offer, rejected, withdrawn, per job a source (Naukri, LinkedIn, Indeed, Wellfound, other, from the URL), JD, apply link, notes, status log, the tailored resume sent and its ATS score, and a follow-up date (applied +7 d, screening +4 d, interview +2 d; `lib/domain/jobs.ts`). One document per posting (`canonicalJobUrl` uses the board's own job id, so capturing twice is a no-op); the company is matched to your Targets. "Tailor resume to this job" opens `/resume/tailor?job=<id>` with the JD preloaded and links the saved version back. **PrepOS never logs in to or applies on a job site for you**: you apply on the real site and mark it Applied. Due follow-ups appear in the daily briefing. Jobs are in the backup (cap 400) |
| Extension capture | The PrepOS Chrome extension (`extension/`) adds a toolbar button: clicking it on a job page (via `activeTab`, so it has no standing access to any site) extracts the posting from schema.org `JobPosting` data, falling back to the page's headings, and sends it to your open PrepOS tab (or queues it in extension storage until one opens). On your own LinkedIn/Naukri/Wellfound profile page it sends the page text instead, saved as a read-only snapshot (`resumes`, kind `profile`, at most 6) that you can score and roast on `/resume?r=<id>`. The page side (`components/jobs/capture-listener.tsx`, `lib/domain/capture-bridge.ts`) validates every capture with zod, as it is untrusted website text, then saves it through a Server Action; no tokens or credentials are stored anywhere |
| `/web`, `/web/[lessonId]`, `/web/interview`, `/web/interview/[track]`, `/projects`, `/projects/[slug]` | **Web development and architecture** (Learn hub): `data/webdev.json` holds 28 authored lessons in 7 tracks (React, Next.js, Node and NestJS, SQL and PostgreSQL, MongoDB, distributed databases including CockroachDB and how to choose a database, architecture) each with key points, interview questions, a 3-question self-check and sources, plus 7 guided projects (URL shortener, realtime chat on NestJS and MongoDB, multi-tenant SaaS with Row Level Security, an event-driven orders service with the transactional outbox, a payments ledger on CockroachDB, a React analytics dashboard, collaborative notes with a CRDT) with ordered milestones, the lessons behind them, interview talking points and resume bullet templates. **Deliberately not in `syllabus.json`**: ~15 services read every syllabus subtopic (plan, backlog, weekly report, feasibility, quiz), so adding them there would silently change the real study plan. **Interview prep** (`/web/interview`): `data/web-interview/<track>.json` holds 14 tracks (HTML and CSS, JavaScript and the browser, TypeScript, React, Next.js, Node and NestJS, HTTP, web security, web performance, accessibility and testing, SQL, MongoDB, distributed databases, architecture) of questions, each with a junior/mid/senior level, a markdown model answer that leads with the one-line answer, the mistakes weak answers make and likely follow-ups (schema and pure helpers in `lib/domain/web-interview.ts`). Every lesson's interview question has an answer there, linked back with `lesson`, and the lesson page shows them inline. Each track (plus `all` and `review`) opens a browse view with level/status/search filters and a flashcard practice round that puts "review again" questions first; ratings live in `webinterviewprogress` (no row means new). Progress is in `weblessonprogress`, `webprojectprogress` and `webinterviewprogress` (backup included) and never affects the streak or plan. "Add to my resume" appends a project and its bullets (with `[X]` placeholders you must fill in) to the saved resume |
| `/jobs` (Discover), `/jobs/discover/[id]`, `/jobs/tracker`, `/jobs/sources`, `/jobs/links` | **Job discovery.** `data/careers.json` lists 84 companies whose public job-board API PrepOS reads (Greenhouse, Lever, Ashby, Workable, SmartRecruiters; every slug verified live, re-check with `npm run careers:verify`, find new ones with `npm run careers:discover`) plus 23 link-only companies (no public API), and three remote feeds (Remote OK, Remotive, Arbeitnow; Arbeitnow off by default). `lib/domain/job-postings.ts` parses each response per item with zod (a malformed posting is skipped, a wrong top-level shape fails the source), validated against recorded real responses in `tests/fixtures/jobs/`. Only engineering roles are kept (`isTechRole`), newest 120 per company, 8 KB of description, in `jobpostings` (cap 4,500, expires 30 days after last seen). `syncJobs` (`lib/services/job-sync.ts`): a KV lock so two runs never overlap, sources rotate by least recently tried within a 50 s budget (boards wait 3 h, aggregators 6 h between reads), six at a time, each isolated with its own exponential backoff (30 min doubling to 24 h), postings that vanish from a successful read are closed (never from a failed one). Triggers: `/api/cron/jobs` (Bearer `CRON_SECRET`) from `.github/workflows/jobs-sync.yml` every 3 h, and the Refresh buttons. **Matching** (`lib/domain/job-match.ts`, no model): title fit 35, resume skills 25, place 15, level 10, company and your Targets 10, freshness 5, with the reasons shown. Preferences are in `jobprefs`. **Discover** is ranked and filterable (filters live in the URL); the posting page shows the description with your skills highlighted as text nodes, your ATS score for it, the inline fact-checked resume tailoring, and **Apply on the company site**, which opens their page and, when you return to the tab, asks whether to mark it applied (`ApplyPanel`). Saving copies a posting into the tracker once. **Search links** open LinkedIn, Naukri, Indeed, Wellfound, Google Jobs and big-company career searches in your own signed-in browser. New matches above your threshold become one grouped notification (max 3 a day, never twice, own switch) and a section in the daily briefing |
| `/api/events` | **Live updates.** Server-sent events: the page opens one connection while the tab is visible and in use; it lives about 50 s and the browser reconnects with `Last-Event-ID`; heartbeat every 15 s; 401 (not a redirect) when signed out. Events are tiny typed notices (`sync.progress`, `sync.done`, `jobs.new`, `notification`, `capture`) appended to the KV event log by `publish()` (best effort, never fails the work that triggered it). The client (`components/live/`) backs off after errors, closes after 20 s hidden or 10 min idle, and falls back to refreshing every minute if events can't get through. Used by the Discover banner (progress and "N new jobs"), the bell and tracker (refresh on `notification` and `capture`) and the Sources list |
| `/aptitude`, `/aptitude/[topicId]`, `/aptitude/mock/[category]` | Aptitude trainer: Quantitative (25 topics), Logical (14) and Verbal (8). Quant and most logical questions are **generated** by pure functions in `lib/domain/aptitude/` (seeded, so the seed in the URL keeps a set stable across refreshes); the rest come from `data/aptitude-bank.json` (750 hand-written questions, 50 per logical/verbal category, each tagged `easy|medium|hard`). Bank drills take an optional `?d=` difficulty and **rotate**: each answered bank question's key (`bankKey`) is stored on its `aptitudesessions` row, and the next drill serves unseen questions first, then ones you last missed. Standard option sets (A–D, "Only I / Both / Neither") are kept in standard order rather than answer-first. Drills are 10 questions with a live per-question timer against the topic's target seconds, shortcut tips and an explanation after each answer; mocks are 20 mixed questions on a countdown with no feedback until the end. Results are stored per topic in `aptitudesessions`; a topic is *Mastered* when the latest 20 answers hit 80%. Separate from the streak |
| `/news` | category pills, topic chips, system design picks rail, filters (`?cat=&src=&tag=&f=`, `f=full` for readable articles) |
| `/news/[id]` | in-app reader (§10.1): full text, reading time, tags, bookmark, open original, next unread; marks the article read |
| `/stats` | solves per day, cumulative vs ideal, difficulty by week, quiz trend, track coverage, LeetCode card, JS mastery radar |
| `/settings` | plan, quiz and mastery thresholds, rest days, study hours, weekly mock days, news keywords, LeetCode username, notifications test, export, re-seed |
| `/api/palette` | ⌘K search index (session) |
| `/api/export` | JSON backup download (session) |
| `/api/cron/morning`, `/api/cron/evening` | scheduled jobs (`Bearer CRON_SECRET`) |
| `/manifest.webmanifest` | PWA manifest (`app/manifest.ts`) |
| `/offline`, `/sw.js` | offline fallback page and service worker (public, outside the proxy) |

## 13. Folder structure

```
.
├── app/
│   ├── (auth)/login/                 sign-in page, form, Server Action
│   ├── (app)/layout.tsx  loading.tsx sidebar, top bar, bell, mobile tabs + badges, requireSession, skeleton
│   ├── (app)/<page>/page.tsx         dashboard, calendar, dsa, problems, mock, review, learn, design, playground, quiz, news, stats, settings, setup
│   ├── (app)/<page>/actions.ts       Server Actions (zod + requireSession + refresh())
│   ├── api/{cron/*,export,palette}/  route handlers
│   ├── offline/                      offline fallback page (cached by public/sw.js)
│   ├── manifest.ts  apple-icon.png  icon.svg  layout.tsx  globals.css
├── components/        ui (shadcn) · layout · dashboard · calendar · ide · dsa · problems · mock · learn · design · progress · quiz · playground · news · stats · settings · setup · leetcode · shared
├── lib/
│   ├── domain/        pure logic (see §7)
│   ├── services/      plan, day, progress, problems, learn, practice, mastery, quiz, leetcode-sync,
│   │                  news, notifications, cron, stats, nav, settings, seed, export, snippets, dashboard,
│   │                  setup, designs, calendar, custom-problems, mock
│   ├── leetcode/      GraphQL client (adapter)
│   ├── llm/           provider interface, adapters, provider chain (failover, cooldowns, paid last resort), JSON provider
│   ├── news/          feed fetcher, article extractor (adapters), HTML → markdown
│   ├── notify/        Telegram / Brevo / Resend channels (adapter)
│   ├── quiz/          question schema, bank loader, LLM prompts
│   ├── playground/    drills, share links, snippet tags, lazy TS transpile
│   ├── sandbox/       JS/TS and Pyodide Web Worker sources, runners, test-case harness, deepEqual (shared by /playground, /dsa, /problems, /mock)
│   ├── models/        content, progress, day, learning, system, mock (Mongoose)
│   ├── auth/          session (jose), dal (requireSession), credentials (bcrypt + throttle), cron
│   ├── content.ts  plan-clock.ts  db.ts  env.ts  utils.ts
├── data/              dsa-problems, syllabus, news-sources, system-design, quiz-bank (generated)
├── scripts/           seed, hash-password, generate-quiz-bank (+ quiz-bank/ sources), generate-icons,
│                      sync-vercel-env.sh, set-mongodb-uri.mjs, publish-github.sh
├── tests/domain/      pure unit tests
├── tests/services/    service tests on mongodb-memory-server (fakes for LeetCode, feeds, channels, LLM)
├── public/            PWA icons, iOS splash screens, sw.js
├── proxy.ts  vercel.json (crons, bom1)
└── docs/              ARCHITECTURE, DESIGN, ROADMAP, BUILD_PLAN
```

## 14. Environment variables

`.env.example` lists them all.
- **Required:** `MONGODB_URI`, `AUTH_SECRET` (≥ 32 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_NAME`, `APP_TIMEZONE`, `CRON_SECRET` (≥ 16 chars; without it the cron routes reject every request).
- **Optional:**
  - LLM: `GEMINI_API_KEY`/`GEMINI_MODEL`, `GROQ_API_KEY`/`GROQ_MODEL`, `LLM_CHAIN`, the paid `META_LLAMA_API_KEY`/`META_LLAMA_BASE_URL`/`META_LLAMA_MODEL`, the older `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL`/`LLM_BASE_URL`, plus `LLM_DELAY_MS` (bank generator only).
  - LeetCode: `LEETCODE_USERNAME`.
  - Notifications: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NOTIFY_EMAIL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `WHAPI_TOKEN`, `WHATSAPP_TO` (WhatsApp via Whapi.Cloud), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (PWA Web Push; subscriptions live in the `pushsubscriptions` collection, one row per device), `APP_URL` (links in emails).

`lib/env.ts` validates them lazily, so `next build` works without secrets. Empty strings count as unset.

## 15. Non-functional notes

- **Serverless Mongo:** the connection is cached on `globalThis` (pool size 5). Atlas Network Access must allow `0.0.0.0/0`, because Vercel has no fixed IPs, so use a long database password. Functions are pinned to `bom1` (Mumbai), next to the cluster.
- **Seed is idempotent:** it upserts by key, removes content rows no longer in the JSON, and never touches progress or an existing settings document. It's available as `npm run seed` and as *Re-seed content* in Settings (`lib/services/seed.ts`).
- **Backups:** M0 has no automated backups. `/api/export` downloads every user collection as JSON (`version: 1`): settings, progress, plans, day logs, quizzes, masteries, practice attempts, snippets, notifications, System Design answers, custom problems and their solves, mock sessions, and read or bookmarked articles (without their body text). Each export stamps `lastExportAt`, and `/setup` nags when the last one is over 7 days old.
- **PWA / iPhone app:** `app/manifest.ts` (standalone, start `/dashboard`, maskable icon, shortcuts), the Apple touch icon, `apple-mobile-web-app-*` metadata, iOS splash screens for current iPhone sizes (`public/splash/`), `viewport-fit=cover` with safe-area padding on the top bar and bottom tabs, and an "Add to Home Screen" hint for iOS Safari.
  - `public/sw.js` caches only build assets and icons (cache-first) plus the `/offline` page. Navigations always go to the network and fall back to `/offline`. Signed-in HTML and data are never cached, so nothing personal sits on the device and there's no stale-data problem.
  - The worker is served with `no-cache` and a strict CSP. A version bump in the file clears old caches.
- **Hydration:** relative times ("2h ago") are computed on the server and passed down as strings. Client code that needs a calendar key uses `Intl.DateTimeFormat`, never `toDateString`.
- **Security:**
  - `requireSession()` is close to the data, and `proxy.ts` is only a convenience redirect.
  - Server Actions validate their input.
  - Secrets are server-only (no `NEXT_PUBLIC_*` secrets).
  - LLM and RSS content is rendered as text; article bodies go through markdown with raw HTML skipped (§10.1).
  - Server-side article fetches pass the SSRF guard in §10.1.
  - Response headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Mermaid runs with `securityLevel: "strict"` and only renders diagrams from `data/system-design.json`; a content test rejects `click` directives and script URLs.
- **Accessibility:** a skip link to `#main`, visible focus rings, `aria-live` regions for quiz results and toasts, labelled nav badges, and charts that are backed by text tiles. Lighthouse on mobile `/login`: performance 94, accessibility 95, best practices 100. The one finding is that white text on the dark-theme `--primary` (#7C5CFF) measures 4.34:1, just under the 4.5:1 AA minimum.
- **Study hours:** `Settings.hoursByDow` (Sunday first, default 4 / 3.5 x5 / 6) scales the count-based targets (`lib/domain/time-budget.ts`). A 3.5 h weekday and a 7 h Saturday are exactly the old counts, so the pace is still deadline-driven; more or fewer hours scale it, then a deterministic fit pass trims (SQL, JS, news, reviews, theory, DSA; never the quiz) or tops up toward the budget using per-item minute costs (Easy/Medium/Hard 20/35/55, re-solve 15, theory 25, ...), which shrink toward the median of your own recent first-solve times. Sunday keeps its weekly-quiz-only completion rule and lists spare-hour work as optional bonus items.
- **Testing:** 1,875 Vitest tests. Domain tests cover planner, streak, SRS, quiz, LeetCode `planSync` (including midnight IST), mastery, news merge, article tags and SSRF checks, HTML → markdown, session policy, setup checklist, design scoring, the integrity of `data/system-design.json` and `data/os-dbms-cases.json` (topics, subtopic refs, blocks, diagram syntax, URLs), `data/dsa-testcases.json`, a frozen per-topic hash that fails if an existing syllabus subtopic is reordered, edited or deleted, answer encoding for the quiz formats, and the real Web Worker script run in a Node `vm` (console helpers, output caps, test harness, every Playground drill). Service tests run on an in-memory MongoDB and cover `ensureToday`, `recordSolve`, sync idempotency, quiz pass flows, practice and mastery, news refresh, full-text ingest, on-demand extraction and prefetch limits, cron auth and dedupe, design answers and overview, export, and re-seeding keeping settings. Every phase was also click-tested in the browser on desktop and mobile widths.


## DB Lab and the Gemini extension

- **DB Lab (`/playground/db`)**: SQL runs in a Web Worker on sql.js (SQLite as WASM, files in `public/vendor/sqljs`, same-origin, no CDN; 5 s timeout kills the worker). Mongo-style queries run through `lib/domain/mongo-query.ts`, a pure emulator of `find/aggregate/countDocuments/distinct` that never evaluates user code. Datasets and challenges are in `lib/domain/db-lab.ts`; a challenge is checked by running the learner's query and a reference query on the same data and comparing rows. Tests run every reference solution against real sql.js. The worker registers MySQL helpers on SQLite (`lib/sandbox/sql-compat.ts`: IF, DATEDIFF, DATE_FORMAT, YEAR/MONTH/DAY, LEAST/GREATEST, TRUNCATE…); `DATE_ADD … INTERVAL` is not supported.
- **SQL track in `/dsa/[slug]`**: `lib/domain/sql-problems.ts` holds, for all 30 SQL problems, a seed with LeetCode's table and column names and the example rows, plus a reference solution (`verify` for DML problems such as Delete Duplicate Emails). `lib/sandbox/sql-judge.ts` runs both on fresh databases and compares rows (column names produce a note, not a failure). There is one sample dataset per problem and no hidden cases, so LeetCode stays the final judge.
- **JavaScript track in `/dsa/[slug]`**: `lib/domain/js-starters.ts` gives each of the 35 problems LeetCode's template plus examples as `test(…)` blocks run in the Playground worker; tests check every example passes with a reference solution.
- **Ask Gemini extension (`extension/`)**: Chrome MV3 extension that fills and sends the prompt in your already-open Gemini tab. Page and extension talk through `window.postMessage` (shapes in `lib/domain/ask-bridge.ts`, mirrored in `extension/content-app.js`). Without the extension the button copies the prompt and opens your Gemini project, as before. See `extension/README.md`.


## Emails, backlog and roast

- **One layout.** `lib/domain/mail-html.ts` renders every email (morning plan, evening nudge, night recap, weekly report) from a `MailSpec`: kicker, title, intro, callouts, stat chips, sections, footer and a button. Text and HTML are produced together; everything is escaped; links need `APP_URL`.
- **Backlog** (`lib/domain/backlog.ts`, `lib/services/backlog.ts`): what you owe beyond today's plan. DSA = how far behind the ideal pace you are, listed as the next unsolved problems after today's; theory = subtopics from weeks that already ended and aren't ticked; reviews = overdue spaced reviews beyond today's. It appears in the morning mail, the night recap and the weekly report, and its total is in the morning subject.
- **Roast** (`lib/domain/roast.ts`): `roastLevel` is `off | coach | savage` (older settings with only `roastMode` count as savage). `roastFor(level, slot, context, seed, name)` picks a line for the real situation (heavy backlog, long streak, only the quiz left, a zero day, a lost streak, how the week went), fills in `{backlog}`, `{streak}`, `{left}`, `{pct}`, `{solved}`, `{daysLeft}`, `{weekPct}`, and is stable for the same seed so a retried job sends the same line. The line leads the subject and the body.
- **Switches.** Each email has a flag in settings (`mailMorning`, `mailNudge`, `mailNight`, `mailWeekly`; default on). Off means the in-app bell still gets it and no channel does.


## Backlog and target companies

- **Backlog engine** (`lib/domain/backlog-items.ts`, `lib/services/backlog.ts`). One ranked list of everything you owe beyond today's plan, derived from real progress and never stored: overdue **reviews**, **theory** from weeks that ended, **DSA** behind the ideal pace (the next unsolved problems), **topic quizzes** for fully ticked topics not yet mastered, **system design** cases from finished weeks, **missed weekly mocks**, saved **reading**, and **target-company gaps**. Priority = kind weight + age + boost from a target's priority - a small rank penalty. The backlog never affects the streak; the daily quiz is still the only hard requirement.
- **Your decisions.** `BacklogState` (`snoozed` until a day, or `dismissed`) is keyed by the item key (`dsa:two-sum`, `theory:<topic>:<i>`, `mock:dsa:<date>`). `BacklogPull` queues items for a day.
- **Daily queue.** `settings.backlogBudget` (default 2, 0 = off) items are queued automatically by `ensureBacklogQueue`, once per day: the budget is fixed, so finishing items does not refill it. At most half the budget comes from one kind. Rest and outside days queue nothing. You can pull any item in by hand, beyond the budget. Called by the morning mail, the dashboard and `/backlog`; the night recap, nudge and weekly report read it without queueing (`getBacklogMail`).
- **UI.** `/backlog` (Today hub): stats, today's queue, budget control, kind filters, per-item add to today / snooze / dismiss, and restore. The dashboard has a compact card.
- **Target companies** (`data/companies.json`, `lib/domain/companies.ts`, `lib/services/targets.ts`, `/targets`). `tiers` are prep profiles for five kinds of company (big tech, large product, mid-tier product, startup, service/MNC): typical rounds, a DSA set size, difficulty mix and pattern weights, system design cases, and area weights. `companies` maps ~55 well-known companies to a tier. The profiles are typical patterns, not inside knowledge of one company's questions; you can change a target's tier and pin your own problems and cases.
- **Generated sets.** `selectDsaSet` builds a deterministic DSA set from the main-track problems by weighted round-robin over the tier's patterns, difficulty quotas and core-before-extended. `buildBlueprint` turns your progress into readiness per area (DSA set, design cases, syllabus tracks) and an overall score weighted by the tier. `blueprintGaps` makes the next steps (pins first, then DSA, design, and the two subjects furthest behind), which join the backlog as `company` items; a gap for something already owed boosts that item instead of repeating it (`mergeCompanyItems`).
- **Models.** `BacklogState`, `BacklogPull` (`lib/models/backlog.ts`), `Target` (`lib/models/targets.ts`: name, tier, priority, interview date, notes, pinned problems and cases; at most 8).

## Ports, Redis and free-tier budgets
- **Ports and adapters.** `KvStore` (`lib/kv/`): get/set/del with TTL, `incr`, lock (`setNx` and owner-only release) and a short per-channel event log. `MongoKv` is the default (TTL collection, atomic pipeline updates); `UpstashKv` (plain `fetch` to the REST API) is used only when its two env vars are set, wrapped in `FallbackKv` so a Redis error serves that one call from Mongo. The same behaviour tests run against Memory, Mongo and a fake Upstash. Job sources are `NormalizedPosting` parsers behind `fetchBoard`/`fetchAggregator` with an injectable fetcher. Domain stays pure; adapters hold the I/O.
- **Rate limits** (`lib/services/rate-limit.ts`, fixed window over `incr`): resume parse 12/min, resume AI 12/h, job refresh 6 per 10 min, add source 15/h, capture 60 per 10 min. If the limiter itself fails the action is allowed.
- **Upstash free tier counts commands.** The live stream polls the event log every 5 s on Redis (3 s on Mongo) only while a tab is visible and active: about 10 commands per 50 s connection, so one tab open all day is roughly 1,700 commands. The sync lock, rate limits and publishes add a few per action. `/jobs/sources` shows which store is in use.
- **MongoDB M0 (512 MB).** Discovered postings are capped at 4,500 rows of at most about 8 KB (worst case about 40 MB) and expire 30 days after last seen; `kv` and `kvevents` rows expire by TTL (events after an hour, 300 per channel).
- **GitHub Actions minutes.** `jobs-sync.yml` (8 runs a day, about a minute each) plus the briefing and nudge workflows stay far under the free allowance.
- **Not built:** managed WebSockets (Ably or Pusher) as a second transport behind `publish()`; Hacker News "Who is hiring" as a source; per-company scrapers for big tech (they get links, by design).
