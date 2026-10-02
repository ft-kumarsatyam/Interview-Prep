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
| Tests | **Vitest 4** for `lib/domain` |
| Scripts | **tsx** (`npm run seed`, `npm run hash`) |
| Later phases | `rss-parser` (news), an LLM SDK (quiz), Recharts (stats), Monaco or CodeMirror (playground) |

> Next 16 differences agents must respect (see `node_modules/next/dist/docs/`): `middleware.ts` is now **`proxy.ts`**; `cookies()`, `headers()`, `params` and `searchParams` are **async only**; `next lint` is gone (use `npx eslint .`); `revalidateTag` needs a second argument (prefer `updateTag`/`refresh` in Server Actions); route types `PageProps<'/x'>` and `LayoutProps` come from `next typegen`.

## 3. High-level diagram

```
                ┌────────────────────────── Vercel (Hobby) ───────────────────────────┐
 Browser ─HTTPS─▶ proxy.ts  (optimistic: valid session cookie? else → /login)          │
 (desktop/PWA)  │    │                                                                 │
                │    ▼                                                                 │
                │  app/(app)/** pages (RSC) ─▶ requireSession() ─▶ lib/services/* ─┬──▶ MongoDB Atlas M0
                │  Server Actions (writes)  ─▶ requireSession() ─▶ lib/domain/* (pure)  │
                │  app/api/cron/* ─▶ Bearer CRON_SECRET ─▶ services ────────────────┼──▶ RSS + Google News
                │                                                                  └──▶ LLM (quiz), Telegram
                └─────────────────────────────────────────────────────────────────────┘
                     ▲ Vercel Cron: 05:30 IST morning, 20:00 IST evening
```

**Layering rule:** pages and actions call `lib/services/*` only. Services do I/O and delegate every decision (targets, streaks, scoring, review dates) to pure functions in `lib/domain/*`.

## 4. Authentication (single user, no sign-up), *implemented*

- Credentials live only in env: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH_B64`, a base64-wrapped bcrypt hash. Next.js expands `$` in `.env` files, which corrupts raw bcrypt hashes, hence the base64 step. `npm run hash -- '<password>'` prints the value.
- `app/(auth)/login/actions.ts` (Server Action):
  1. zod-validate the form
  2. check the per-IP throttle (5 failures in 15 min, stored in `loginattempts` with a TTL index)
  3. compare the email in constant time, then always run bcrypt
  4. on success, `createSession()` sets the `prepos_session` cookie: HS256 JWT, `sub: "owner"`, 30 days, httpOnly, sameSite=lax, secure in production
- `proxy.ts`: an optimistic redirect only. It skips `/api/*` and static files.
- `lib/auth/dal.ts → requireSession()`: the **real** check, called by the `(app)` layout and by every Server Action and route handler that touches data. Cron routes use `isCronAuthorized()` instead.
- There is no registration route, no user collection and no password reset. To change the password, re-run `npm run hash` and update the env var.

## 5. Content model

Static content is versioned in git under `data/`, seeded into Mongo, and also imported directly by read-only pages.

| File | Contents |
|---|---|
| `data/dsa-problems.json` | 669 problems: `{slug, title, leetcodeId, difficulty, pattern, track: main\|js\|sql, tier: core\|extended, url, order}`. `order` is per track. In `main`, all 151 `core` problems come first (pass 1), then `extended` (pass 2), each in pattern order, easy → hard |
| `data/syllabus.json` | 10 tracks, 70 topics, 410 subtopics: `{id, track, week, level 1–4, title, subtopics[], resources[]}` |
| `data/news-sources.json` | 46 RSS feeds in 7 categories, 5 default Google News keyword queries (URL template), browse-only links |

Subtopic id = `${topicId}:${index}`. **Never reorder or delete subtopics inside a topic once progress exists.** Append new ones instead, or progress rows will point at the wrong item.

## 6. Data model (MongoDB), *implemented in `lib/models/*`*

Every `YYYY-MM-DD` value is a **local date in `APP_TIMEZONE`** (default `Asia/Kolkata`). Timestamps are UTC.

| Collection | Key fields | Notes |
|---|---|---|
| `problems` | slug ⓤ, track, tier, order | seeded |
| `topics` | topicId ⓤ, week, position, subtopics[{id,title}] | seeded; `position` = global study order |
| `problemprogresses` | slug ⓤ, status, confidence, timeTakenMin, approach, time/spaceComplexity, notes, nextReviewAt, reviewCount, **solveDates[]** | solveDates gives per-day counts |
| `subtopicprogresses` | subtopicId ⓤ, topicId, doneOn, confidence 1–5, notes | |
| `dailyplans` | date ⓤ, weekNumber, kind, dsaTarget, dsaNew[], dsaReview[], jsProblem, sqlProblem, theoryTarget, theory[], readings[] | frozen once created |
| `daylogs` | date ⓤ, dsaSolved, theoryDone, quizPassed, complete, freezeUsed | the streak's source of truth |
| `quizzes` | (date, kind) ⓤ, generatedBy llm\|bank, questions[{prompt, options×4, answerIndex, explanation, source{kind,ref}}], attempts[], bestPct, passed | |
| `settings` | _id `"settings"`, plan dates, clamps, restDays[], freezeTokens, settledThrough, googleNewsQueries | singleton |
| `articles` | urlHash ⓤ, url, title, source, category, publishedAt, snippet, aiSummary, read, bookmarked | TTL 30 days |
| `notifications` | kind, title, body, read | |
| `loginattempts` | ip, at | TTL 15 min |

## 7. Domain rules (`lib/domain/*`), *implemented with 33 tests*

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

## 8. Quiz generation (Phase 5)

```ts
interface LlmProvider { generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> }
// gemini.ts (default, free tier) · anthropic.ts · openaiCompatible.ts (Groq etc.)
```

1. **Context:** today's solved problems (title, pattern, your one-line approach), the subtopics checked today, and the articles read today.
2. **Prompt:** 10 MCQs.
   - 4 DSA questions: pattern recognition, complexity, which JS data structure, edge cases.
   - 4 on theory. For the JS track this includes output-prediction questions.
   - 2 on the articles/AI topic.
   - Exactly 4 options per question, one correct, a 1–2 sentence explanation, JSON output.
3. **Validation:** zod-validate the output. On failure, retry once with the error appended. If that also fails, fall back to `data/quiz-bank.json`, generated once by `scripts/generate-quiz-bank.ts`.
4. **Storage:** stored once per date and never regenerated. LLM output is untrusted text: no HTML rendering, and length caps are enforced by the schema.
5. **Weekly quiz (Sunday):** 25 questions sampled from the week, weighted toward wrong answers, plus 5 new ones.

## 9. News pipeline (Phase 6)

- **Sources:** all `feeds[]` plus **Google News search feeds** built from `googleNews.urlTemplate` and the keyword list (defaults: OpenAI, Google Gemini, Anthropic Claude, generative AI, backend and system design; editable in Settings). Official **OpenAI**, **Google AI**, **Google Research**, **Google Developers** and **DeepMind** blogs are included directly.
- **Refresh:** `/api/cron/morning` fetches everything in parallel with a 10 s timeout each and `Promise.allSettled`.
  - It keeps the newest `maxItemsPerFeed` (10) items per feed.
  - It dedupes by `sha1(url)`. Google News links are redirect URLs, so it also dedupes by normalised title.
  - It upserts into `articles`, which expire after 30 days.
- **Optional:** one batched LLM call writes one-line summaries for the newest AI items.

## 10. Scheduled jobs (`vercel.json`, Phase 6)

| Path | Cron (UTC) | IST | Does |
|---|---|---|---|
| `/api/cron/morning` | `0 0 * * *` | 05:30 | refresh news → settle past days → build today's plan → "Today's plan" notification |
| `/api/cron/evening` | `30 14 * * *` | 20:00 | if today is incomplete: reminder notification (+ Telegram if configured) |

Hobby crons run once a day and fire somewhere within the scheduled hour. **Correctness never depends on them:** the dashboard calls `ensureToday()`, which settles past days and creates today's plan if missing. Free fallback: cron-job.org or a GitHub Actions `schedule` hitting the same URLs with the bearer secret.

## 11. Routes

| Route | Status |
|---|---|
| `/login` | ✅ Phase 1 |
| `/dashboard` | ✅ static shell (week, phase, countdown, this week's topics) → live plan, streak and heatmap in Phase 3 |
| `/dsa` | ✅ read-only browser of all 669 problems by track, pass and pattern → progress in Phase 4 |
| `/dsa/[slug]`, `/review` | Phase 4 |
| `/learn` | ✅ read-only syllabus by track → checklists and notes in Phase 4 |
| `/playground` | Phase 4: sandboxed JS runner (Web Worker), saved snippets, event-loop drills |
| `/quiz`, `/quiz/history` | Phase 5 |
| `/news` | ✅ source directory → live reader in Phase 6 |
| `/stats`, `/settings` | Phase 7 |
| `/api/cron/morning`, `/api/cron/evening`, `/api/export` | Phases 6–7 |

## 12. Folder structure (✅ = exists now)

```
.
├── app/
│   ├── (auth)/login/{page,login-form,actions}.tsx   ✅
│   ├── (app)/layout.tsx  actions.ts (logout)        ✅ sidebar, top bar, mobile tabs, requireSession
│   ├── (app)/{dashboard,dsa,learn,news}/page.tsx    ✅ (read-only for now)
│   ├── (app)/{review,playground,quiz,stats,settings}/page.tsx  ✅ placeholders
│   ├── api/                                          (cron, export: Phase 6–7)
│   ├── layout.tsx  globals.css  icon.svg  page.tsx   ✅ fonts, theme tokens, providers
├── components/
│   ├── ui/            ✅ shadcn primitives
│   ├── layout/        ✅ app-nav, nav-items, theme-provider, theme-toggle
│   └── shared/        ✅ page-header, empty-state, badges
├── lib/
│   ├── domain/        ✅ dates, plan-config, planner, streak, srs, quiz   (pure)
│   ├── models/        ✅ content, progress, day, system                 (Mongoose)
│   ├── auth/          ✅ session (jose), dal (requireSession), credentials (bcrypt + throttle)
│   ├── services/      Phase 3+: plan, progress, quiz, news, notify, settings
│   ├── llm/ news/     Phase 5–6
│   ├── content.ts     ✅ typed access to data/*.json
│   ├── plan-clock.ts  ✅ today / week / phase / countdown
│   ├── db.ts env.ts utils.ts  ✅
├── data/              ✅ dsa-problems, syllabus, news-sources (+ quiz-bank in Phase 5)
├── scripts/           ✅ seed.ts, hash-password.ts (+ generate-quiz-bank in Phase 5)
├── tests/domain/      ✅ 33 tests
├── proxy.ts           ✅
└── docs/              ARCHITECTURE, DESIGN, ROADMAP, BUILD_PLAN
```

## 13. Environment variables

`.env.example` lists them all.
- **Required:** `MONGODB_URI`, `AUTH_SECRET` (≥ 32 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_NAME`, `APP_TIMEZONE`.
- **Required in Phase 6:** `CRON_SECRET`.
- **Optional:** `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `NOTIFY_EMAIL`.

`lib/env.ts` validates them lazily, so `next build` works without secrets. Empty strings count as unset.

## 14. Non-functional notes

- **Serverless Mongo:** the connection is cached on `globalThis` (pool size 5). Atlas Network Access must allow `0.0.0.0/0`, because Vercel has no fixed IPs, so use a long database password.
- **Seed is idempotent:** it upserts by key, removes content rows no longer in the JSON, and never touches progress.
- **Backups:** M0 has no automated backups. `/api/export` (Phase 7) downloads everything as JSON.
- **Security:**
  - `requireSession()` is close to the data, and `proxy.ts` is only a convenience redirect.
  - Server Actions validate their input.
  - Secrets are server-only (no `NEXT_PUBLIC_*` secrets).
  - LLM and RSS content is rendered as text.
- **Testing done on the scaffold:** unit tests (33); build; seed run twice; signed-out redirects; login (wrong password, case-insensitive email); all 9 pages rendering with a session; throttle after 5 failures, scoped per IP.
