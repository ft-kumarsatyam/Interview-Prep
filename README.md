# PrepOS 🔥

PrepOS is a private training app for going from zero to interview-ready as a Senior Backend Engineer in 24 weeks (Oct 2026 → Mar 2027). **JavaScript is the main language.**

It covers:
- DSA in JS
- JS/TypeScript and Node.js
- DBMS and SQL
- OOP and design patterns, plus LLD
- System design, from basic scaling up to big-tech architectures
- AI, from ML fundamentals up to RAG and agents
- A daily quiz that gates the streak, practice quizzes with mastery per subtopic, and an auto-updating AI and engineering news feed (OpenAI, Google, DeepMind, Google News keywords…) that you **read inside the app**, full text, not just links
- A **System Design studio**: 17 classic cases with diagrams, deep dives and real big-tech write-ups, plus a timed 45-minute mock with a self-review rubric
- **LeetCode sync:** your public LeetCode profile ticks off solved problems automatically
- **Installs on iPhone** as a home-screen app, with **Remember me** so you stay signed in

Frontend and backend live in **one Next.js 16 repo**, deployed on Vercel with MongoDB Atlas. Everything runs on free tiers.

| Content | Details |
|---|---|
| 758 LeetCode problems (free, links checked) | 693 DSA (151 core first, then extended) · 35 JavaScript (*30 Days of JS*) · 30 SQL; 83 runnable in the in-app IDE. Follow them pattern by pattern, or by curated sheet: Blind 75, NeetCode 150, NeetCode All and Striver's SDE sheet, with YouTube walkthroughs (`data/dsa-sheets.json`) |
| 79 topics, 502 subtopics, 250 written lessons | 10 tracks: JS & TS · Node · DSA concepts · DBMS & SQL · OOP · LLD · HLD · CS · AI · Behavioral |
| 5,656 bank quiz questions | about 11 hand-written per subtopic (single, multi-select, true/false, JS output; tagged easy/medium/hard) plus DSA patterns. JS output-prediction answers are verified by actually running the code. Practice rotates toward unseen and missed questions, and a Mistakes review re-asks what you got wrong |
| 54 news feeds + Google News keyword feeds | AI labs, AI news, JS/Node, databases, system design (ByteByteGo, System Design One, AlgoMaster…), big-tech engineering, tech news, career |
| 25 system design case studies | URL shortener, KV store, rate limiter, ID generator, notifications, news feed, chat, video streaming, ride hailing, payments, ticket booking, collaborative docs, autocomplete, web crawler, file sync, ad click aggregator, leaderboard and more |

## Code structure

How the code is organised and the rules that keep it that way: [`docs/STRUCTURE.md`](docs/STRUCTURE.md). Ask the code graph instead of grepping: [`docs/GRAPH.md`](docs/GRAPH.md) (`npm run graph`, then `graphify query "what calls recomputeDay"`).

## Status

All build phases (0–25) are done. See `docs/BUILD_PLAN.md` for the phase list and the ideas backlog.

| Area | What you get |
|---|---|
| Dashboard | Today's plan, progress ring, streak and freeze tokens, pace, 24-week heatmap (click a day to open it in the calendar), this week's mocks, "Fill in details" inbox for synced solves, news strip (long reads first), "Finish setup" card |
| Planner | `/plan` and `/plan/setup`: a guided intake (goal and date, a 1-5 rating and must/nice/skip per topic, hours per weekday plus lighter weeks, an optional quick check) that weights the plan towards weak and wanted topics, a feasibility check with fixes when the time is not enough, and a weekly suggestion you approve before it changes anything |
| Calendar | `/calendar` month view of the whole plan: past days with what was done, future days as a projection of the topics and problems planned for that date, weekly mock days |
| Setup | `/setup` checklist: database, secrets, LeetCode, crons, feeds, notifications, LLM, backups, session, each with a fix button |
| System Design | `/design`: 45-minute framework, building blocks, latency/capacity cheat sheet, 17 cases (requirements → estimates → API → data model → diagram → deep dives → trade-offs → interviewer probes), mock-interview timer with autosaved sections and rubric, related articles from your feed |
| DSA / Review | Progress per pattern, filters, `/dsa/[slug]` with solve form, markdown notes and history, and a laptop-sized IDE (resizable problem and editor panes, JavaScript, TypeScript or Python, editable test cases, Run and Submit). SQL-track problems run on in-browser SQLite with LeetCode's tables and a Submit check; JavaScript-track problems start from LeetCode's template with the examples as runnable tests; spaced-repetition review queue |
| Problems | Questions from anywhere: generate one with the free AI or paste a problem with your own test cases, then solve it in the same IDE. Kept out of the daily plan |
| Mock interviews | DSA, JavaScript, Node.js, system design (HLD), LLD, SQL, project deep dive, behavioral and a full loop, each timed (auto-submits at zero) and scored out of 100 on tests, time and a rubric (free-AI grading with a self-review fallback). Weekly DSA and system design mocks on days you pick; they never affect the streak |
| Learn | Checklists per topic, notes, a **Practice** quiz on every subtopic (mastery %) and a **topic quiz** that awards *Mastered* |
| Quiz | Daily quiz (LLM or bank) that gates the streak, Sunday weekly quiz, history with explanations |
| Playground | CodeMirror editor for JavaScript, TypeScript or Python, Web Worker runner with a 3 s timeout, resizable split, autosaved scratch, share links, saved snippets, output-prediction drills |
| DB Lab | `/playground/db`: SQL (SQLite in the browser, with MySQL helpers) and MongoDB-style queries on seeded datasets, a schema browser with data preview, 23 graded challenges with hints, query history |
| News | In-app reader with full article text (from the feed or extracted from the page), reading time, topic tags, system design picks, "Full articles" filter, bookmarks; reading counts toward the day |
| Stats / Settings | Recharts dashboards, LeetCode card, JS mastery radar; plan, quiz, rest days, study hours, weekly mock days, keywords, LeetCode username, JSON export |
| Ops | Morning/evening cron, notification bell, optional Telegram/email push, iPhone/Android home-screen app with offline page, Remember me (30-day sliding session), ⌘K palette |

## Repo map

```
AGENTS.md / CLAUDE.md / .cursor/rules  ← rules for Claude Code / Cursor
docs/ARCHITECTURE.md   ← system design, data model, domain rules (source of truth)
docs/DESIGN.md         ← UI/UX spec for every page
docs/BUILD_PLAN.md     ← phases (all done) and ideas for later
docs/ROADMAP.md        ← the 24-week study plan
app/                   ← pages, layouts, Server Actions, API routes (cron, export)
modules/<feature>/     ← one folder per feature (planner, quiz, progress, dsa, design, jobs,
                         resume, news, learn, aptitude, mock, ai, notifications, settings, targets)
  domain/              ← pure business logic, no I/O (tested)
  services/            ← I/O: Mongo reads/writes, sync, cron jobs
  components/          ← that feature's React components
  lib/                 ← feature-specific adapters (e.g. dsa/lib/leetcode, news/lib)
core/                  ← shared infrastructure, no feature knowledge
  auth/ kv/ llm/ realtime/ notify/ sandbox/ models/ (Mongoose) pwa/
  db.ts env.ts http*.ts content.ts utils.ts plan-clock.ts
  domain/ services/    ← cross-cutting rules (dates, sessions, rate limits, cron, export)
components/{ui,shared,layout}/ ← design-system primitives, shared widgets, app shell
data/*.json            ← problems, syllabus, news sources, system design cases, quiz bank (seed)
scripts/               ← seed, hash-password, quiz-bank generator, icons, Vercel env sync
tests/                 ← Vitest: domain (pure) + services (in-memory MongoDB)
```

## Platform, testing and benchmarks

Under the product there is a small platform: owner-scoped data with a migrations runner (`npm run migrate`), a transactional outbox with
QStash or MongoDB-polling delivery and idempotent consumers (`npm run worker` runs the same handlers outside Vercel), a token-bucket
rate limiter and a versioned read-through cache, grounded AI answers with citations, OpenTelemetry traces and a health panel on `/setup`,
and a public API at `/api/v1` (OpenAPI at `/api/v1/openapi.json`, tokens in Settings > API tokens; see `docs/API.md`). Each of these has
its reasoning in [`docs/adr/`](docs/adr/README.md) and runs with only `MONGODB_URI`: QStash, Redis and OpenTelemetry are optional.

```sh
npm test                    # unit and integration tests (in-memory MongoDB)
npm run knip                # dead code
npm run depcruise           # layer rules
npm run bench               # benchmarks of the redesigned parts: docs/BENCHMARKS.md
npm run e2e                 # Playwright in a real browser against the app on an in-memory MongoDB (no Docker, no services)
E2E_DEV=1 npm run e2e       # same, without a production build
npm run ai:eval             # score the golden prompt set against your configured free AI providers
docker compose up -d mongo redis redis-rest   # optional local stack: a MongoDB replica set and Redis
```

The browser tests start their own server with every external integration blanked (AI, email, Telegram, push, LeetCode, Redis,
telemetry), so running them can never message you or call a third party. The k6 scripts in `scripts/bench/k6/` are for a running server and
have not been run yet. Measured results and what they do not prove are in [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md).

## 1. Free accounts

1. **MongoDB Atlas:** create an **M0** cluster (region `ap-south-1` Mumbai).
   - *Database Access* → add a user with a long random password.
   - *Network Access* → `0.0.0.0/0`. Vercel has no fixed IPs, so the strong password is what protects the database.
   - *Connect → Drivers* → copy the URI and add `/prepos` before the `?`.
2. **GitHub + Vercel (Hobby):** to deploy.
3. **Optional:**
   - A free Gemini API key (Google AI Studio) and/or a Groq key for AI-written quizzes, hints and explanations. Without one, everything falls back to `data/quiz-bank.json` and static explanations. A Gemini app/Gems subscription is a separate thing and is not an API key.
   - A Telegram bot (via @BotFather) and/or a Brevo (or Resend) account for reminders and a morning email digest outside the app.
   - A **public** LeetCode profile for auto-sync. No login or cookie is needed.

## 2. Run locally

```bash
cd ~/Desktop/Learning
npm install
cp .env.example .env.local
npm run hash -- 'a-long-password-you-will-remember'   # paste output as ADMIN_PASSWORD_HASH_B64
openssl rand -base64 32                               # paste as AUTH_SECRET
openssl rand -hex 32                                  # paste as CRON_SECRET
# fill MONGODB_URI, ADMIN_EMAIL, ADMIN_NAME (and optionally LEETCODE_USERNAME) in .env.local
npm run seed        # loads 758 problems, 79 topics and settings (safe to re-run)
npm run dev         # http://localhost:3000 → sign in → open /setup to see what's left
```

Checks: `npm test` · `npm run typecheck` · `npx eslint .` · `npm run build`

Other scripts:

| Command | Does |
|---|---|
| `npm run quiz-bank` | Regenerates `data/quiz-bank.json` from the hand-written questions in `scripts/quiz-bank/authored/<topicId>.json`, plus DSA patterns and concepts. Every JS output question is run in `node:vm`, so the answer key is the real output |
| `node --import tsx scripts/check-quiz-authored.ts <file…>` | Validates authored quiz files (shape, duplicates, at least 10 per subtopic, real snippet output). `--list <topicId>` shows a topic's subtopics and existing questions |
| `node --import tsx scripts/build-case-quizzes.ts` | Rebuilds `data/case-quizzes.json` from `scripts/case-quizzes/parts/*.json` |
| `npm run quiz-bank -- --llm` | Same, plus LLM-written questions per subtopic (needs `LLM_API_KEY`; `LLM_DELAY_MS` paces free-tier rate limits) |
| `npm run icons` | Regenerates the PWA icons in `public/` and `app/apple-icon.png` from the logo |
| `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/morning` | Runs the morning job locally (news, article text prefetch, plan, LeetCode sync). `/setup` has a button for it too |

### Optional: Ask Gemini browser extension

Load the `extension/` folder (Chrome/Edge/Brave: `chrome://extensions` → Developer mode → Load unpacked) and "Ask Gemini" will type the question into your open Gemini tab. Details in `extension/README.md`. The app works the same without it.

## 3. Keep building with Claude Code or Cursor

```bash
claude          # Claude Code auto-loads CLAUDE.md → AGENTS.md
# or open the folder in Cursor (.cursor/rules/project.mdc is always applied)
```

Pick an idea from the bottom of `docs/BUILD_PLAN.md`, check it works, commit.

## 4. Deploy to Vercel (walkthrough)

### 4.1 Atlas
1. Finish the M0 setup from §1. *Network Access* must list `0.0.0.0/0` (allow access from anywhere). Vercel functions run from changing IPs, so an IP allow-list would break the app at random.
2. Put the production URI in `.env.local` (or patch the host with `node scripts/set-mongodb-uri.mjs cluster0.YOUR_ID.mongodb.net`).
3. Seed production once from your laptop: `npm run seed`. It is idempotent. Re-running it updates problems and topics but **never** touches progress or your edited settings (LeetCode username, rest days, thresholds).

### 4.2 GitHub
1. Push the repo (`git push origin main`). `.github/workflows/deploy.yml` runs tests, typecheck, lint and build on every push and PR.
2. *Settings → Secrets and variables → Actions* → add `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_NAME`, `APP_TIMEZONE` and `CRON_SECRET`. These are for the manual seed and smoke-test jobs only. The app reads its env from Vercel.

### 4.3 Vercel project
1. *Add New → Project → Import* the repo. Framework: Next.js. Leave the build settings at their defaults.
2. Functions run in **Mumbai (bom1)**, next to the Atlas cluster. `vercel.json` pins `regions: ["bom1"]`, so there's nothing to set.
3. Environment variables for **Production**:

   | Variable | Required | Notes |
   |---|---|---|
   | `MONGODB_URI` | ✅ | Atlas URI with `/prepos` |
   | `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_NAME` | ✅ | your single login |
   | `APP_TIMEZONE` | ✅ | `Asia/Kolkata` |
   | `CRON_SECRET` | ✅ | `openssl rand -hex 32`. Vercel Cron sends it as `Authorization: Bearer …` |
   | `LEETCODE_USERNAME` | optional | seeds the username on first run (e.g. `imksatyam`); later edits happen in */settings*. Set it in Vercel too, or sync stays off until you enter it in Settings |
   | `GEMINI_API_KEY`, `GROQ_API_KEY` (+ optional `GEMINI_MODEL`, `GROQ_MODEL`) | optional | Free AI providers, tried in order with automatic failover; `LLM_CHAIN` sets the order |
   | `META_LLAMA_API_KEY`, `META_LLAMA_BASE_URL`, `META_LLAMA_MODEL` | optional | A **paid** last resort. Never used by background jobs and only after you confirm in the app; Settings has a daily call cap |
   | `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | optional | The older single-provider setup, still supported |
   | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | optional | push reminders to Telegram |
   | `NOTIFY_EMAIL` | optional | where email reminders and the morning digest go |
   | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | optional | email via Brevo's REST API (free, 300/day). Preferred over Resend when set. Verify the sender in Brevo and turn off API-key IP blocking (*Security → Authorised IPs*), since Vercel has no fixed IPs |
   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | optional | email via Resend, used when Brevo isn't set. `RESEND_FROM_EMAIL` is a sender on a domain verified in Resend (e.g. `prepos@satyam-dev.in`); without it Resend only mails the account owner |
   | `WHAPI_TOKEN`, `WHATSAPP_TO` | optional | WhatsApp messages via [Whapi.Cloud](https://whapi.cloud). `WHATSAPP_TO` is digits with country code (e.g. `919891142251`). The free Sandbox plan caps messages; messages to the channel's own number land in "Message yourself" without a notification sound |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional | PWA notifications (free Web Push). Generate with `npx web-push generate-vapid-keys`, then turn them on per device in Settings → App notifications. Each shows a short summary of the email; tapping opens the full message at `/notifications/[id]`. iPhone needs iOS 16.4+ and the Home Screen app |
   | `APP_URL` | optional | public URL (e.g. `https://satyam-dev.in`) for links in the morning email |

   Shortcut from your laptop (needs `npm i -g vercel@latest`, `vercel login` and `vercel link`): `./scripts/sync-vercel-env.sh interview-prep` copies every non-empty key from `.env.local`. `.vercelignore` keeps `.env*` files out of CLI uploads.
4. Deploy (or *Redeploy* after changing env vars). URL: `https://<project>.vercel.app`. Sign in with `ADMIN_EMAIL` and your password.
   - **Automatic deploys:** `.github/workflows/deploy.yml` deploys every push to `main` to production once tests, typecheck, lint and build pass. One-time setup: create a token at [vercel.com/account/tokens](https://vercel.com/account/tokens) and add it as the `VERCEL_TOKEN` secret in *GitHub → Settings → Secrets and variables → Actions*. Don't also connect the repo in Vercel's Git settings, or each push deploys twice. Manual fallback: `npx vercel@latest deploy --prod`.
   - **Custom domain (`satyam-dev.in`):** both `satyam-dev.in` and `www.satyam-dev.in` are attached to the project, and `www` 308-redirects to the apex. At the DNS host (GoDaddy) keep the NS, SOA, `_domainconnect` and `_dmarc` records, delete `A @ Parked`, and add `A @ 216.198.79.1`, `A @ 64.29.17.1` and `CNAME www → a5765071072e3741.vercel-dns-017.com.` (`npx vercel@latest domains verify satyam-dev.in` prints the current values). A new `.in` domain stays on `clientHold`, resolving nowhere, until the registrant WHOIS email is verified. Vercel issues the HTTPS certificate once DNS resolves. Cookies are per domain, so sign in again on the new domain and re-add the home-screen app from it.
5. *Settings → Cron Jobs* should list `/api/cron/morning` (02:30 UTC, about 08:00 IST) and `/api/cron/evening` (18:29 UTC, about 23:59 IST) from `vercel.json`. On Hobby each fires once a day, somewhere within its UTC hour (so the plan email lands 07:30–08:29 IST and the recap 23:30–00:29 IST; a recap that lands after midnight still reports the day that just ended). For exact times, point a free cron-job.org job at each URL with the `Authorization: Bearer $CRON_SECRET` header at 08:00 and 23:59 in your timezone: every email is sent once per day, so running both schedulers is safe. The app stays correct without them: opening the dashboard builds today's plan and syncs LeetCode.

### 4.4 Check the cron endpoints

```bash
BASE=https://<project>.vercel.app
curl -i $BASE/api/cron/morning                                    # → 401 (no token)
curl -s -H "Authorization: Bearer $CRON_SECRET" $BASE/api/cron/morning | jq   # → news, plan, leetcode all "ok": true
curl -s -H "Authorization: Bearer $CRON_SECRET" $BASE/api/cron/evening | jq   # → reminded true/false, leetcode
```

In the morning response, `leetcode.detail` should be `{"status":"ok","imported":N,…}`. `disabled` means no username is set, and `error` usually means a typo or a private profile. Run either job as often as you like: notifications are deduped per day and news and sync are throttled.

Or run it from GitHub: *Actions → Deploy → Run workflow* and paste the production URL. That seeds Atlas and then checks the login page, the auth redirect and both cron endpoints (401 without the token, 200 with it).

### 4.5 Install on your phone
- **iPhone (Safari only; other iOS browsers can't install web apps):**
  1. Open `https://<project>.vercel.app` in Safari. The app shows an "Install PrepOS as an app" hint.
  2. Tap Share (the square with the arrow) → *Add to Home Screen* → *Add*.
  3. Open PrepOS from the home screen and **sign in there with "Remember me" ticked**. The home-screen app keeps its own cookies, separate from Safari, and stays signed in for 30 days from your last visit.
  4. It runs full-screen with a splash screen and respects the notch and home indicator. Without a connection it shows an offline page instead of a browser error.
- **Android (Chrome):** open the URL → ⋮ → *Install app* (or *Add to Home screen*).

It opens on the dashboard. On Android, long-press the icon for shortcuts to the quiz, review queue and news. On a phone, pages that aren't in the bottom tabs (System Design, Review, Stats, Setup, Settings) are one tap away through the search button (⌘K palette).

### 4.6 After deploy
- Open **`/setup`**: it checks the database seed, secrets, LeetCode sync, whether the crons have fired, failing feeds, notifications, the LLM key and backup age, and gives a button for each fix.
- */settings* → **Send test** checks Telegram/email. **Export backup** downloads all your data as JSON. M0 has no automated backups, so do this weekly (`/setup` reminds you after 7 days).
- To change your password: `npm run hash -- 'new-password'`, update `ADMIN_PASSWORD_HASH_B64` in Vercel, then redeploy.

## 5. How a day works

1. **08:00:** past days are settled, today's plan is built and emailed (with anything yesterday left open called out), then news refreshes and LeetCode syncs. DSA is 2/day in weeks 1–2, 3/day in weeks 3–4, then adaptive (Saturday double), plus a JS-track or SQL problem and 2–3 theory subtopics.
2. Solve on LeetCode **in JavaScript**. Accepted submissions sync automatically (on dashboard load, at most every 10 minutes, or with *Sync now*). Fill in confidence, time and approach from the *Fill in details* inbox so spaced repetition stays accurate. You can also tick problems by hand.
3. Check off theory subtopics, take the 5-question **Practice** quiz to build mastery, and try code in the **Playground**. When a topic's subtopics are all done, its **topic quiz** (≥ 70%) earns *Mastered*.
4. Read 2–3 articles in the in-app reader (System design picks are a good default).
   On HLD weeks, study the matching case in **System Design** and run a 45-minute mock.
5. **Pass the daily quiz (≥ 60%)** to complete the day. 🔥 It unlocks after 1 problem and 1 subtopic.
6. **23:59:** a night recap email: what you did today, what is left, the backlog you still owe, your streak standing, tomorrow's adjusted plan and when the DSA list finishes at your recent pace.
7. **Evening nudge (~20:30):** if today is unfinished, an email saying exactly what is left, how long you have and what the streak stands to lose. Vercel Hobby has only two cron slots, so this one runs from a free GitHub Actions schedule (`.github/workflows/evening-nudge.yml`): add the repository secrets `APP_URL` and `CRON_SECRET` to turn it on.
8. **Daily briefing and top-news alerts (every few hours):** the top news for you, the system design reading and case to study, and the questions to practise, sent once after 08:00, plus a one-off push when a standout story lands (max 3 a day). Runs from `.github/workflows/news-briefing.yml` (same `APP_URL` and `CRON_SECRET` secrets) and also after the morning job. Each can be switched off in Settings.
9. **Job discovery (every 3 hours):** `.github/workflows/jobs-sync.yml` calls `/api/cron/jobs` (same `APP_URL` and `CRON_SECRET` secrets) to read the public job boards of about 85 companies and three remote feeds. Press Refresh on `/jobs` to do it now. New roles that match your preferences trigger one notification (own switch in Settings). `npm run careers:verify` checks that every company board still works.
10. **Optional Redis:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Upstash free tier) to move locks, rate limits and the live-update log from MongoDB to Redis. Leave them empty and nothing changes.
8. **Sunday night:** a weekly report after the recap: study days completed, problems solved, theory ticked, quizzes, study time, progress per track with bars, the backlog, and next week's focus.

The morning mail and the night recap list your **backlog** (see below), and the morning mail queues today's backlog items. Each of the four emails has its own switch in **Settings → Notification channels**, where you can also pick the **roast level** (Off, Coach or Savage). The roast line in the subject uses your real numbers (backlog, streak, what is left, how the week went), and *Send a test* sends any of the four right now.

Sunday is the re-solve and weekly quiz day. A 7-day streak earns a ❄ freeze token (max 2).

Once a week, take the **DSA mock** and the **System design mock** from `/mock` (Saturday and Sunday by default, changeable in Settings). Use `/calendar` to see what's planned for any future date.


## Backlog and target companies

- **Backlog (`/backlog`)**: one ranked list of everything you owe beyond today's plan: overdue reviews, theory from past weeks, DSA behind pace, topic quizzes, system design cases, missed mocks, saved articles and the gaps for your target companies. Snooze an item for 1 day, 3 days or a week, dismiss it, or add it to today. Each morning a small **daily queue** (default 2 items, set it on the page, 0 turns it off) is picked for you. The backlog is optional and never affects your streak.
- **Targets (`/targets`)**: add the companies you are aiming at (pick one or type your own) and say whether it is a dream, target or safe company. Each target gets a prep plan for its *kind* of company (big tech, large product, mid-tier product, startup, service/MNC): typical interview rounds, a DSA set at the right difficulty mix, the system design cases, and the subjects that round tests, with a readiness score. The profiles are typical patterns, not a list of that company's actual questions: pin problems and cases you know it asks. A target's gaps appear in your backlog, highest priority first.
