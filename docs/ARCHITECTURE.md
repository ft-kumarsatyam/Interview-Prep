# Architecture — PrepOS

PrepOS is a private, single-user web app for a 24-week, zero-to-interview-ready plan for senior backend roles. JavaScript is the main language. It covers DSA in JS, JS/TS and Node.js, DBMS and SQL, OOP and LLD, system design from basic scaling up to big-tech architectures, and AI from fundamentals up. The daily loop is: plan → learn → solve → read → quiz → streak.

**Constraints:** free tiers only (Vercel Hobby, MongoDB Atlas M0, an optional free LLM key), one user, no sign-up, and the default `*.vercel.app` domain.

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
| Features | `rss-parser` (news), `@mozilla/readability` + `linkedom` + `turndown` (in-app article reader), plain `fetch` adapters for the LLM, LeetCode GraphQL, Telegram and Resend (no SDKs), Recharts 3 (stats), CodeMirror 6 (playground), react-markdown (notes, articles), mermaid (system design diagrams, loaded on demand) |

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
                     ▲ Vercel Cron: 05:30 IST morning, 20:00 IST evening
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
| `data/dsa-problems.json` | 669 problems: `{slug, title, leetcodeId, difficulty, pattern, track: main\|js\|sql, tier: core\|extended, url, order}`. `order` is per track. In `main`, all 151 `core` problems come first (pass 1), then `extended` (pass 2), each in pattern order, easy → hard |
| `data/syllabus.json` | 10 tracks, 70 topics, 410 subtopics: `{id, track, week, level 1–4, title, subtopics[], resources[]}` |
| `data/news-sources.json` | 54 RSS feeds in 8 categories (incl. System Design and Tech News), 5 default Google News keyword queries (URL template), browse-only links |
| `data/system-design.json` | the 45-minute framework (6 steps, latency and capacity numbers, a 10-item rubric), 12 building blocks, and 17 case studies, each with requirements, estimates, API, data model, a mermaid diagram, deep dives, trade-offs, interviewer probes and real write-ups. Every case links to an HLD syllabus topic and a `practiceRef` subtopic |

Subtopic id = `${topicId}:${index}`. **Never reorder or delete subtopics inside a topic once progress exists.** Append new ones instead, or progress rows will point at the wrong item.

## 6. Data model (MongoDB), *implemented in `lib/models/*`*

Every `YYYY-MM-DD` value is a **local date in `APP_TIMEZONE`** (default `Asia/Kolkata`). Timestamps are UTC.

| Collection | Key fields | Notes |
|---|---|---|
| `problems` | slug ⓤ, track, tier, order | seeded |
| `topics` | topicId ⓤ, week, position, subtopics[{id,title}] | seeded; `position` = global study order |
| `problemprogresses` | slug ⓤ, status, confidence, timeTakenMin, approach, time/spaceComplexity, notes, nextReviewAt, reviewCount, **solveDates[]**, source manual\|leetcode, needsDetails | solveDates gives per-day counts; `needsDetails` drives the "Fill in details" inbox |
| `subtopicprogresses` | subtopicId ⓤ, topicId, doneOn, confidence 1–5, notes | |
| `dailyplans` | date ⓤ, weekNumber, kind, dsaTarget, dsaNew[], dsaReview[], jsProblem, sqlProblem, theoryTarget, theory[], readings[] | frozen once created |
| `daylogs` | date ⓤ, dsaSolved, theoryDone, readings, quizPassed, complete, freezeUsed, completedAt | the streak's source of truth |
| `quizzes` | (date, kind daily\|weekly) ⓤ, generatedBy llm\|bank, questions[{id, prompt, code?, options×4, answerIndex, explanation, source{kind,ref}, style output\|concept\|pattern\|recall\|llm}], attempts[{answers, correct, pct, submittedAt}], bestPct, passed | `answers[i] = -1` means unanswered; the answer key never reaches the client before submit |
| `practiceattempts` | scope subtopic\|topic, ref, questions[], answers[], pct, submittedAt | subtopic drill = 5 questions, topic quiz = 10 |
| `masteries` | ref ⓤ, scope, score 0–100 (EMA), attempts, bestPct, masteredOn | `masteredOn` is set only by a passed topic quiz |
| `snippets` | title, code, tag | Playground saves |
| `settings` | _id `"settings"`, plan dates, clamps, quizPassPct, topicMasteryPct, restDays[], freezeTokens, settledThrough, googleNewsQueries (null = defaults), leetcodeUsername, leetcodeLastSyncAt, leetcodeLastError, leetcodeSeenIds[] (cap 200), newsLastFetchAt, newsLastFailed[], lastMorningRunAt, lastEveningRunAt, lastExportAt | singleton; the last five feed `/setup` |
| `articles` | urlHash ⓤ, url, title, titleKey, sourceId, sourceName, category, publishedAt?, fetchedAt, snippet, aiSummary, read, readOn, bookmarked, **content** (markdown, ≤ 80k chars), contentStatus full\|extracted\|failed\|headline\|null, contentError, readingMinutes, leadImage, tags[] | TTL 30 days on `fetchedAt`; bookmarking unsets `fetchedAt` so saved articles never expire. Indexes on `tags` and `{contentStatus, category}` |
| `designs` | slug ⓤ, sections{requirements, estimates, api, dataModel, architecture, deepDives} (≤ 20k chars each), rubric[] (checked ids), minutesSpent | your System Design mock answers, one per case |
| `notifications` | kind plan\|reminder\|streak\|milestone\|sync, title, body, read, dedupeKey ⓤ (sparse) | |
| `loginattempts` | ip, at | TTL 15 min |

## 7. Domain rules (`lib/domain/*`), *implemented and tested*

Modules: `dates`, `plan-config`, `planner`, `streak`, `srs`, `quiz`, `progress`, `pace`, `heatmap`, `leetcode`, `mastery`, `sampling` (seeded RNG, weighted sampling), `news`, `article` (reading time, tags, SSRF URL checks, source diversity), `reminders`, `stats`, `settings`, `session-policy`, `setup` (checklist), `design` (rubric score, case status, related-article ranking).

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

## 8. Quizzes: three layers

All quiz questions share one shape (`lib/quiz/question.ts`): a prompt, optional `code`, exactly 4 options, `answerIndex`, an explanation, a `source {kind, ref}` and a `style`. The client only ever receives the public view without the answer; scoring happens on the server.

### 8.1 Daily quiz (gates the streak)

```ts
interface LlmProvider { generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> }
// lib/llm/adapters.ts: gemini (default, free tier) · anthropic · openai-compatible (Groq etc.), all over fetch
```

1. **Context:** today's solved problems (title, pattern, your one-line approach), the subtopics checked today, and the articles read today. When nothing is logged yet, the plan's items are used instead.
2. **Composition (10 questions):** about 4 DSA (pattern, complexity, JS data structure, edge cases), 4 theory and 2 on today's articles when you read any. **On JS-track days, 2 of the theory slots are verified output-prediction questions from the bank**, even when an LLM is configured.
3. **LLM path:** zod-validate the output (`llmQuizSchema`), retry once with the error appended, and keep only refs that exist. Any failure falls back to the bank.
4. **Bank path:** `data/quiz-bank.json` (1,147 questions) is layered from most to least relevant: today's items, then the plan, sibling subtopics, everything studied so far, and finally the whole bank. Selection uses a seeded RNG (`daily:${date}`), so it's deterministic.
5. **Storage:** one document per `(date, kind)`, never regenerated (a duplicate-key error means another request created it first). Retakes reshuffle the same questions. LLM output is untrusted text: no HTML rendering, and the schema enforces length caps.
6. **Unlock:** `min(1, dsaTarget)` problems and `min(1, theoryTarget)` subtopics. **Passing (≥ `quizPassPct`) sets `DayLog.quizPassed`**, which is required for a complete study day.
7. **Weekly quiz (Sunday):** 25 questions from the week's daily quizzes (wrong answers weighted 3×, unattempted 2×) plus 5 new bank questions from the week's topics and patterns.

### 8.2 Subtopic practice (mastery, ungated)
- A **Practice** button on every subtopic in `/learn` serves 5 questions: the bank's questions for that subtopic, topped up by the LLM when a key is set and the bank is thin.
- Each submitted attempt updates `masteries` with an exponential moving average (`score = 0.4·pct + 0.6·prev`; the first attempt sets the score outright).
- Practice is repeatable and **never touches the streak**.

### 8.3 Topic quiz ("Mastered")
- Opens once every subtopic in the topic is ticked (`canTakeTopicQuiz`).
- 10 questions, where each slot is drawn from a subtopic picked by weakness (`subtopicWeight = 1 + (100 − score)/25`, up to 5×).
- Scoring at least `topicMasteryPct` (default 70, editable in Settings) sets `masteredOn` and shows the *Mastered* badge. Ticking subtopics never depends on it, so the daily theory target stays achievable.
- Wrong output-prediction answers get an **Open in Playground** link (`/playground?snippet=…`).

### 8.4 The bank generator (`scripts/generate-quiz-bank.ts`, `npm run quiz-bank`)
- Pattern questions come from `scripts/quiz-bank/patterns.ts`, concept questions from `concepts.ts`, and recall questions from the syllabus.
- **Output-prediction snippets** (`output-snippets.ts`) are executed in `node:vm` with a timeout. The recorded console output *is* the correct option, so the answer key can't be wrong. `node:vm` is not a security boundary: it runs only hand-written snippets from the repo, never model or user code.
- `--llm` adds LLM-written questions per subtopic, paced by `LLM_DELAY_MS`.

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

## 11. Scheduled jobs and notifications

| Path | Cron (UTC) | IST | Does |
|---|---|---|---|
| `/api/cron/morning` | `0 0 * * *` | 05:30 | refresh news (forced) → prefetch article text (§10.1) → `ensureToday` (settle past days, build plan) → "Today's plan" notification + push → LeetCode sync (forced) |
| `/api/cron/evening` | `30 14 * * *` | 20:00 | LeetCode sync → `ensureToday` → if today is incomplete: "Today isn't done yet" reminder listing what's left + push |

- Each step runs independently (one failing step doesn't skip the others), and the JSON response reports every step's outcome. `maxDuration = 60`. Each run stamps `lastMorningRunAt` / `lastEveningRunAt`, which `/setup` uses to show whether the crons are actually firing.
- Hobby crons run once a day and fire somewhere within the scheduled hour. **Correctness never depends on them:** the dashboard calls `ensureToday()`, which settles past days, creates today's plan if missing and syncs LeetCode.
- Free fallback: cron-job.org or a GitHub Actions `schedule` hitting the same URLs with the bearer secret.
- **Notifications** (`services/notifications.ts`) are always stored for the in-app bell. They're pushed to every configured channel in `lib/notify` (Telegram `sendMessage`, Resend email) only for plan and reminder kinds. Push failures are logged and never fail the job.

## 12. Routes

| Route | What |
|---|---|
| `/login` | single-user sign-in with throttling |
| `/dashboard` | progress ring, streak, pace, heatmap, today's problems, side-tracks, review, theory, "Fill in details" inbox, news strip, "Finish setup" card while required setup items are open |
| `/setup` | setup checklist: database seeded, secrets, LeetCode (last sync and error), crons firing, news feeds (failed ones), notifications, LLM, backup age, session (Remember me), each with a fix button or link |
| `/dsa`, `/dsa/[slug]` | progress per pattern, filters; problem page with solve form, notes, history, Open on LeetCode |
| `/review` | due spaced-repetition queue |
| `/learn`, `/learn/practice?ref=` | checklists, notes, mastery badges; subtopic practice and topic quiz runner |
| `/design` | System Design studio: the 45-minute framework, case grid with status (new → studying → practised → mastered, mastered = the linked HLD topic quiz), building blocks, latency and capacity cheat sheet |
| `/design/[slug]` | **Study** tab: requirements, estimates, API, data model, mermaid diagram, deep dives, trade-offs, interviewer probes, blocks used, real write-ups, related articles from your feed. **Mock interview** tab: 45-minute timer with per-section pacing, six markdown sections (autosave), self-review rubric; links to the practice quiz for the case's subtopic |
| `/playground` | CodeMirror + Web Worker runner (3 s timeout), snippets, output drills, `?snippet=` preload |
| `/quiz`, `/quiz/history`, `/quiz/history/[date]` | daily/weekly quiz (locked → player → results), past quizzes with explanations |
| `/news` | category pills, topic chips, system design picks rail, filters (`?cat=&src=&tag=&f=`, `f=full` for readable articles) |
| `/news/[id]` | in-app reader (§10.1): full text, reading time, tags, bookmark, open original, next unread; marks the article read |
| `/stats` | solves per day, cumulative vs ideal, difficulty by week, quiz trend, track coverage, LeetCode card, JS mastery radar |
| `/settings` | plan, quiz and mastery thresholds, rest days, news keywords, LeetCode username, notifications test, export, re-seed |
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
│   ├── (app)/<page>/page.tsx         dashboard, dsa, review, learn, design, playground, quiz, news, stats, settings, setup
│   ├── (app)/<page>/actions.ts       Server Actions (zod + requireSession + refresh())
│   ├── api/{cron/*,export,palette}/  route handlers
│   ├── offline/                      offline fallback page (cached by public/sw.js)
│   ├── manifest.ts  apple-icon.png  icon.svg  layout.tsx  globals.css
├── components/        ui (shadcn) · layout · dashboard · dsa · learn · design · progress · quiz · playground · news · stats · settings · setup · leetcode · shared
├── lib/
│   ├── domain/        pure logic (see §7)
│   ├── services/      plan, day, progress, problems, learn, practice, mastery, quiz, leetcode-sync,
│   │                  news, notifications, cron, stats, nav, settings, seed, export, snippets, dashboard,
│   │                  setup, designs
│   ├── leetcode/      GraphQL client (adapter)
│   ├── llm/           provider interface + gemini / anthropic / openai-compatible adapters
│   ├── news/          feed fetcher, article extractor (adapters), HTML → markdown
│   ├── notify/        Telegram / Resend channels (adapter)
│   ├── quiz/          question schema, bank loader, LLM prompts
│   ├── playground/    worker runner, drills, share links
│   ├── models/        content, progress, day, learning, system (Mongoose)
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
  - LLM: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, plus `LLM_DELAY_MS` (bank generator only).
  - LeetCode: `LEETCODE_USERNAME`.
  - Notifications: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `NOTIFY_EMAIL`.

`lib/env.ts` validates them lazily, so `next build` works without secrets. Empty strings count as unset.

## 15. Non-functional notes

- **Serverless Mongo:** the connection is cached on `globalThis` (pool size 5). Atlas Network Access must allow `0.0.0.0/0`, because Vercel has no fixed IPs, so use a long database password. Functions are pinned to `bom1` (Mumbai), next to the cluster.
- **Seed is idempotent:** it upserts by key, removes content rows no longer in the JSON, and never touches progress or an existing settings document. It's available as `npm run seed` and as *Re-seed content* in Settings (`lib/services/seed.ts`).
- **Backups:** M0 has no automated backups. `/api/export` downloads every user collection as JSON (`version: 1`): settings, progress, plans, day logs, quizzes, masteries, practice attempts, snippets, notifications, System Design answers, and read or bookmarked articles (without their body text). Each export stamps `lastExportAt`, and `/setup` nags when the last one is over 7 days old.
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
- **Testing:** 191 Vitest tests. Domain tests cover planner, streak, SRS, quiz, LeetCode `planSync` (including midnight IST), mastery, news merge, article tags and SSRF checks, HTML → markdown, session policy, setup checklist, design scoring and the integrity of `data/system-design.json` (topics, subtopic refs, blocks, diagram syntax). Service tests run on an in-memory MongoDB and cover `ensureToday`, `recordSolve`, sync idempotency, quiz pass flows, practice and mastery, news refresh, full-text ingest, on-demand extraction and prefetch limits, cron auth and dedupe, design answers and overview, export, and re-seeding keeping settings. Every phase was also click-tested in the browser on desktop and mobile widths.
