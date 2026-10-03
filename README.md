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
| 671 LeetCode problems (free, links checked) | 606 DSA (151 core first, then extended) · 35 JavaScript (*30 Days of JS*) · 30 SQL; 83 runnable in the in-app IDE |
| 70 topics, 410 subtopics | 10 tracks: JS & TS · Node · DSA concepts · DBMS & SQL · OOP · LLD · HLD · CS · AI · Behavioral |
| 1,147 bank quiz questions | per DSA pattern and per subtopic; JS output-prediction answers are verified by actually running the code |
| 54 news feeds + Google News keyword feeds | AI labs, AI news, JS/Node, databases, system design (ByteByteGo, System Design One, AlgoMaster…), big-tech engineering, tech news, career |
| 25 system design case studies | URL shortener, KV store, rate limiter, ID generator, notifications, news feed, chat, video streaming, ride hailing, payments, ticket booking, collaborative docs, autocomplete, web crawler, file sync, ad click aggregator, leaderboard and more |

## Status

All build phases (0–25) are done. See `docs/BUILD_PLAN.md` for the phase list and the ideas backlog.

| Area | What you get |
|---|---|
| Dashboard | Today's plan, progress ring, streak and freeze tokens, pace, 24-week heatmap (click a day to open it in the calendar), this week's mocks, "Fill in details" inbox for synced solves, news strip (long reads first), "Finish setup" card |
| Calendar | `/calendar` month view of the whole plan: past days with what was done, future days as a projection of the topics and problems planned for that date, weekly mock days |
| Setup | `/setup` checklist: database, secrets, LeetCode, crons, feeds, notifications, LLM, backups, session, each with a fix button |
| System Design | `/design`: 45-minute framework, building blocks, latency/capacity cheat sheet, 17 cases (requirements → estimates → API → data model → diagram → deep dives → trade-offs → interviewer probes), mock-interview timer with autosaved sections and rubric, related articles from your feed |
| DSA / Review | Progress per pattern, filters, `/dsa/[slug]` with solve form, markdown notes and history, and a laptop-sized IDE (resizable problem and editor panes, JavaScript, TypeScript or Python, editable test cases, Run and Submit); spaced-repetition review queue |
| Problems | Questions from anywhere: generate one with the free AI or paste a problem with your own test cases, then solve it in the same IDE. Kept out of the daily plan |
| Mock interviews | DSA, JavaScript, Node.js, system design (HLD), LLD, SQL, project deep dive, behavioral and a full loop, each timed (auto-submits at zero) and scored out of 100 on tests, time and a rubric (free-AI grading with a self-review fallback). Weekly DSA and system design mocks on days you pick; they never affect the streak |
| Learn | Checklists per topic, notes, a **Practice** quiz on every subtopic (mastery %) and a **topic quiz** that awards *Mastered* |
| Quiz | Daily quiz (LLM or bank) that gates the streak, Sunday weekly quiz, history with explanations |
| Playground | CodeMirror editor for JavaScript, TypeScript or Python, Web Worker runner with a 3 s timeout, saved snippets, output-prediction drills |
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
lib/domain/            ← pure business logic (tested)
lib/services/          ← I/O: Mongo reads/writes, sync, quiz, news, cron jobs
lib/{leetcode,llm,news,notify}/ ← adapters for external services
lib/models/ lib/auth/  ← Mongoose models, session/auth
data/*.json            ← problems, syllabus, news sources, system design cases, quiz bank (seed)
scripts/               ← seed, hash-password, quiz-bank generator, icons, Vercel env sync
tests/                 ← Vitest: domain (pure) + services (in-memory MongoDB)
```

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
npm run seed        # loads 671 problems, 70 topics and settings (safe to re-run)
npm run dev         # http://localhost:3000 → sign in → open /setup to see what's left
```

Checks: `npm test` · `npm run typecheck` · `npx eslint .` · `npm run build`

Other scripts:

| Command | Does |
|---|---|
| `npm run quiz-bank` | Regenerates `data/quiz-bank.json` from the syllabus and patterns. Every JS output question is run in `node:vm`, so the answer key is the real output |
| `npm run quiz-bank -- --llm` | Same, plus LLM-written questions per subtopic (needs `LLM_API_KEY`; `LLM_DELAY_MS` paces free-tier rate limits) |
| `npm run icons` | Regenerates the PWA icons in `public/` and `app/apple-icon.png` from the logo |
| `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/morning` | Runs the morning job locally (news, article text prefetch, plan, LeetCode sync). `/setup` has a button for it too |

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
   | `RESEND_API_KEY` | optional | email via Resend, used when Brevo isn't set |
   | `APP_URL` | optional | public URL (e.g. `https://satyam-dev.in`) for links in the morning email |

   Shortcut from your laptop (needs `npm i -g vercel@latest`, `vercel login` and `vercel link`): `./scripts/sync-vercel-env.sh interview-prep` copies every non-empty key from `.env.local`. `.vercelignore` keeps `.env*` files out of CLI uploads.
4. Deploy (or *Redeploy* after changing env vars). URL: `https://<project>.vercel.app`. Sign in with `ADMIN_EMAIL` and your password.
   - **Automatic deploys:** Vercel can only link the repo once your Vercel account has a GitHub login connection (*Account Settings → Authentication → Connect GitHub*). Then run `npx vercel@latest git connect https://github.com/ft-kumarsatyam/Interview-Prep` and every push to `main` deploys to production. Until then, deploy from the laptop with `npx vercel@latest deploy --prod`.
   - **Custom domain (`satyam-dev.in`):** both `satyam-dev.in` and `www.satyam-dev.in` are attached to the project, and `www` 308-redirects to the apex. At the DNS host (GoDaddy) keep the NS, SOA, `_domainconnect` and `_dmarc` records, delete `A @ Parked`, and add `A @ 216.198.79.1`, `A @ 64.29.17.1` and `CNAME www → a5765071072e3741.vercel-dns-017.com.` (`npx vercel@latest domains verify satyam-dev.in` prints the current values). A new `.in` domain stays on `clientHold`, resolving nowhere, until the registrant WHOIS email is verified. Vercel issues the HTTPS certificate once DNS resolves. Cookies are per domain, so sign in again on the new domain and re-add the home-screen app from it.
5. *Settings → Cron Jobs* should list `/api/cron/morning` (00:00 UTC = 05:30 IST) and `/api/cron/evening` (14:30 UTC = 20:00 IST) from `vercel.json`. On Hobby each fires once a day, somewhere within its hour. The app stays correct without them: opening the dashboard builds today's plan and syncs LeetCode.

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

1. **05:30:** news refreshes, past days are settled, today's plan is built and LeetCode syncs. DSA is 2/day in weeks 1–2, 3/day in weeks 3–4, then adaptive (Saturday double), plus a JS-track or SQL problem and 2–3 theory subtopics.
2. Solve on LeetCode **in JavaScript**. Accepted submissions sync automatically (on dashboard load, at most every 10 minutes, or with *Sync now*). Fill in confidence, time and approach from the *Fill in details* inbox so spaced repetition stays accurate. You can also tick problems by hand.
3. Check off theory subtopics, take the 5-question **Practice** quiz to build mastery, and try code in the **Playground**. When a topic's subtopics are all done, its **topic quiz** (≥ 70%) earns *Mastered*.
4. Read 2–3 articles in the in-app reader (System design picks are a good default).
   On HLD weeks, study the matching case in **System Design** and run a 45-minute mock.
5. **Pass the daily quiz (≥ 60%)** to complete the day. 🔥 It unlocks after 1 problem and 1 subtopic.
6. **20:00:** you get a reminder if anything is left.

Sunday is the re-solve and weekly quiz day. A 7-day streak earns a ❄ freeze token (max 2).

Once a week, take the **DSA mock** and the **System design mock** from `/mock` (Saturday and Sunday by default, changeable in Settings). Use `/calendar` to see what's planned for any future date.
