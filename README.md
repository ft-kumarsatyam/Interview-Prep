# PrepOS 🔥

PrepOS is a private training app for going from zero to interview-ready as a Senior Backend Engineer in 24 weeks (Oct 2026 → Mar 2027). **JavaScript is the main language.**

It covers:
- DSA in JS
- JS/TypeScript and Node.js
- DBMS and SQL
- OOP and design patterns, plus LLD
- System design, from basic scaling up to big-tech architectures
- AI, from ML fundamentals up to RAG and agents
- A daily quiz that gates the streak, and an auto-updating AI and engineering news feed (OpenAI, Google, DeepMind, Google News keywords…)

Frontend and backend live in **one Next.js 16 repo**, deployed on Vercel with MongoDB Atlas. Everything runs on free tiers.

| Content | Details |
|---|---|
| 669 LeetCode problems (free, links checked) | 604 DSA (151 core first, then 453 extended) · 35 JavaScript (*30 Days of JS*) · 30 SQL |
| 70 topics, 410 subtopics | 10 tracks: JS & TS · Node · DSA concepts · DBMS & SQL · OOP · LLD · HLD · CS · AI · Behavioral |
| 46 news feeds + Google News keyword feeds | AI labs, AI news, JS/Node, databases, system design, big-tech engineering, career |

## Status

| ✅ Done | ⏭ Next (see `docs/BUILD_PLAN.md`) |
|---|---|
| Next 16 + Tailwind 4 + shadcn scaffold, dark/light theme | Phase 3: live dashboard (plan, streak, heatmap) |
| Login (single user, no sign-up), throttling, `proxy.ts` gate | Phase 4: progress tracking, review queue, JS Playground |
| MongoDB models, idempotent seed, password-hash script | Phase 5: daily quiz engine |
| Planner, streak, spaced repetition and quiz logic (33 tests) | Phase 6: news reader, reminders, cron |
| Read-only DSA browser, syllabus, news sources, static dashboard | Phases 7–8: stats, settings, deploy |

## Repo map

```
AGENTS.md / CLAUDE.md / .cursor/rules  ← rules for Claude Code / Cursor
docs/ARCHITECTURE.md   ← system design, data model, domain rules (source of truth)
docs/DESIGN.md         ← UI/UX spec for every page
docs/BUILD_PLAN.md     ← remaining phases with copy-paste prompts
docs/ROADMAP.md        ← the 24-week study plan
app/                   ← pages, layouts, Server Actions (frontend + backend)
lib/domain/            ← pure business logic (tested)
lib/models/ lib/auth/  ← Mongoose models, session/auth
data/*.json            ← problems, syllabus, news sources (seed)
scripts/               ← seed, hash-password
tests/                 ← Vitest
```

## 1. Free accounts

1. **MongoDB Atlas:** create an **M0** cluster (region `ap-south-1` Mumbai).
   - *Database Access* → add a user with a long random password.
   - *Network Access* → `0.0.0.0/0`. Vercel has no fixed IPs, so the strong password is what protects the database.
   - *Connect → Drivers* → copy the URI and add `/prepos` before the `?`.
2. **GitHub + Vercel (Hobby):** to deploy.
3. **Optional:** a free Gemini API key from Google AI Studio for AI-generated quizzes (Phase 5), and a Telegram bot for reminders.

## 2. Run locally

```bash
cd ~/Desktop/Learning
npm install
cp .env.example .env.local
npm run hash -- 'a-long-password-you-will-remember'   # paste output into .env.local
openssl rand -base64 32                               # paste as AUTH_SECRET
# fill MONGODB_URI, ADMIN_EMAIL, ADMIN_NAME in .env.local
npm run seed        # loads 669 problems, 70 topics and settings (safe to re-run)
npm run dev         # http://localhost:3000 → sign in
```

Checks: `npm test` · `npm run typecheck` · `npx eslint .` · `npm run build`

## 3. Keep building with Claude Code or Cursor

```bash
git init && git add -A && git commit -m "PrepOS scaffold"
claude          # Claude Code auto-loads CLAUDE.md → AGENTS.md
# or open the folder in Cursor (.cursor/rules/project.mdc is always applied)
```

Paste the **Phase 3** prompt from `docs/BUILD_PLAN.md`, check it works, commit, then move on to the next phase.

## 4. Deploy to Vercel

1. Push to GitHub, then in Vercel choose *Add New → Project → Import*.
2. Add every variable from `.env.example` (Production).
3. Deploy. The app lives at `https://<project>.vercel.app`.
4. Run `npm run seed` once with the production `MONGODB_URI`.
5. On your phone, open the URL and choose "Add to Home Screen".

## 5. How a day works (once Phases 3–6 land)

1. **05:30:** the plan is built. DSA is 2/day in weeks 1–2, 3/day in weeks 3–4, then adaptive (Saturday double), plus a JS-track or SQL problem and 2–3 theory subtopics.
2. Solve on LeetCode **in JavaScript**, then tick the problem in the app and log confidence, time, approach and complexity.
3. Check off theory subtopics and try the code in the **JS Playground**.
4. Read 2–3 news cards.
5. **Pass the daily quiz (≥ 60%)** to complete the day. 🔥
6. **20:00:** you get a reminder if anything is left.

Sunday is the re-solve and weekly quiz day. A 7-day streak earns a ❄ freeze token (max 2).
