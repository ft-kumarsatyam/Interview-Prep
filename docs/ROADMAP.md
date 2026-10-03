# Senior Backend Interview Roadmap — Zero → Interview-Ready in 24 Weeks

**Main language:** JavaScript → TypeScript → Node.js. All DSA is solved in JavaScript.
**Window:** Mon 2026-10-05 → Sun 2027-03-21 (24 weeks)
**Budget:** 3–4 h on weekdays, 5–6 h on Saturday, Sunday for review. Hours are now configurable per weekday in Settings (defaults 3.5 h weekdays, 6 h Saturday, 4 h Sunday) and the plan is scaled to them; Sunday's extra hours become optional bonus work
**Goal:** Senior Backend Engineer (Node.js) offers by March 2027

| Data file | What's inside |
|---|---|
| [`data/dsa-problems.json`](../data/dsa-problems.json) | **671 free LeetCode problems** in 3 tracks: `js` (35, LeetCode *30 Days of JavaScript*), `main` DSA (606 = 153 **core** + 453 **extended**), and `sql` (30). Every link checked on 2026-10-02 |
| [`data/syllabus.json`](../data/syllabus.json) | **78 topics, 466 subtopics** in 10 tracks: JS/TS, Node.js, DSA concepts, DBMS & SQL, OOP, LLD, HLD, CS fundamentals, AI, behavioral |
| [`data/quiz-bank.json`](../data/quiz-bank.json) | **5,584 quiz questions**: about 11 hand-written per subtopic (single answer, multi-select, true/false and real-output JS snippets, each tagged easy/medium/hard) plus DSA-pattern and concept questions. Feeds the daily/weekly quiz, subtopic practice and topic quizzes |
| [`data/case-quizzes.json`](../data/case-quizzes.json) | **1,031 case questions**, about 25 for each of the 41 HLD case studies and OS/DBMS cases |
| [`data/aptitude-bank.json`](../data/aptitude-bank.json) | **750 aptitude questions** (logical and verbal, tagged by difficulty); quant and most logical drills are also generated, so they never run out |
| [`data/news-sources.json`](../data/news-sources.json) | 57 checked feeds (OpenAI, Google AI, Google Research, DeepMind, JS/Node, databases, big-tech engineering) + Google News keyword feeds |

---

## 1. Daily template (about 3.5 h)

| Block | Time | What |
|---|---|---|
| Learn | 1 h | Today's 2–3 theory subtopics (JS/Node in weeks 1–9, then DBMS/HLD/AI) |
| DSA in JS | 1 h 45 m | Today's problems (adaptive target, §4) plus 1 spaced-repetition re-solve. Plus 1 JS-track problem a day until all 35 are done (about week 6) |
| AI and news | 15 m | 2–3 cards from the News page (OpenAI, Google, AI news, your track) |
| Daily quiz | 10–15 m | 10 MCQs on today's work. **The day only counts after you pass it.** |

**Saturday:** a double DSA target plus one long-form design written out (LLD from week 8, HLD from week 11).
**Sunday:** re-solve the *struggled* problems and take the weekly quiz (25 MCQs).

## 2. Phases

| Phase | Weeks | Dates | Outcome |
|---|---|---|---|
| **1. Language and foundations** | 1–7 | Oct 5 → Nov 22 | Fluent JS/TS, async and event loop, DBMS theory and SQL, OOP, design patterns, **all 153 core DSA problems** |
| **2. Backend engineer** | 8–12 | Nov 23 → Dec 27 | Node internals and production, transactions and concurrency control, NoSQL, LLD, scaling basics |
| **3. Distributed systems and AI** | 13–18 | Dec 28 → Feb 7 | Partitioning, consensus, messaging, microservices, 12+ HLD designs, ML → transformers → RAG → agents |
| **4. Big-tech level** | 19–20 | Feb 8 → Feb 21 | Real architectures (Discord, Netflix, Stripe, Uber…), complex designs, behavioral |
| **5. Interview mode** | 21–24 | Feb 22 → Mar 21 | Mocks, weak-area revision, live interviews |

**Core first, then extended.** Weeks 1–7 work through the 153 must-know problems across every pattern, from arrays up to DP. That gives you the full breadth early, so you're interviewable by mid-January. From week 8 the 453 extended problems build depth, pattern by pattern.

**When to apply:** resume in week 14, applications from **week 16 (mid-January)**, offers in Feb–March. Hiring loops take 3–6 weeks.

## 3. Week-by-week

| Wk | Dates | JS / Node | DSA (in JS) | DBMS | OOP / LLD / HLD | AI / CS |
|---|---|---|---|---|---|---|
| 1 | Oct 5–11 | **JS basics** | Complexity, arrays, strings · *JS track 1/day* | DBMS intro, ER model | — | Set up the app and news habit |
| 2 | Oct 12–18 | **Functions, scope, closures, `this`** | Hashing, two pointers, sliding window, recursion | Relational model, keys, relational algebra | — | — |
| 3 | Oct 19–25 | **Objects, prototypes, classes** | Stacks, queues, binary search, sorting | **SQL basics** | OOP pillars in JS/TS | — |
| 4 | Oct 26–Nov 1 | **Async JS and the event loop** | Linked lists, trees | **Advanced SQL** · *SQL track 1/day starts* | SOLID | — |
| 5 | Nov 2–8 | **Advanced JS** (generators, modules, polyfills) | Heaps (build a MinHeap), tries, intervals, greedy | Normalization and FDs | Design patterns I | — |
| 6 | Nov 9–15 | **TypeScript** | Backtracking, graphs | Storage and indexing (B+ tree, LSM) | Design patterns II | Networking |
| 7 | Nov 16–22 | **Node.js internals** | DP, bits · **Core 153 done ✅** | Query processing and optimization | — | API design |
| 8 | Nov 23–29 | **Building APIs with Node** | Extended: arrays → two pointers | **Transactions and serializability** | **LLD:** method, Parking Lot, Elevator | — |
| 9 | Nov 30–Dec 6 | **Node in production** | Extended: sliding window, stack | Concurrency control and recovery | **LLD:** LRU, Rate limiter | — |
| 10 | Dec 7–13 | — | Extended: binary search, linked list | **NoSQL and MongoDB** | **LLD:** BookMyShow, Splitwise | OS and concurrency |
| 11 | Dec 14–20 | — | Extended: trees | — | **HLD L1: zero → millions of users** · framework · **LLD:** games | — |
| 12 | Dec 21–27 | — | Extended: trees, tries | — | **HLD:** LB, proxy, CDN, caching · URL shortener · **LLD:** logger, pub-sub | Buffer (holidays) |
| 13 | Dec 28–Jan 3 | — | Extended: heap, intervals, greedy | — | **HLD:** partitioning, replication · KV store · **LLD:** vending, ATM | **AI:** ML basics |
| 14 | Jan 4–10 | — | Extended: backtracking, graphs | — | **HLD:** consistency, consensus · rate limiter, ID generator | **AI:** neural nets, transformers · **Resume** |
| 15 | Jan 11–17 | — | Extended: graphs | — | **HLD:** Kafka, microservices · notification system | **AI:** LLM engineering |
| 16 | Jan 18–24 | — | Extended: advanced graphs | — | **HLD:** storage, search, observability · News Feed, WhatsApp | **AI:** RAG · **Start applying** |
| 17 | Jan 25–31 | — | Extended: 1-D DP | — | **HLD:** YouTube, Uber | **AI:** agents, MCP · Security |
| 18 | Feb 1–7 | — | Extended: 2-D DP | — | **HLD:** Payments, Ticketing, Docs, Autocomplete | **AI system design** · first mock |
| 19 | Feb 8–14 | — | Extended: 2-D DP, bits, math | — | **Big-tech case studies** · Crawler, Dropbox | Mock |
| 20 | Feb 15–21 | — | Extended: design, union-find | — | **HLD:** Ad clicks, Leaderboard, Scheduler, Monitoring | Behavioral stories |
| 21 | Feb 22–28 | JS output rapid-fire (*hard* JS practice) | Finish extended / re-solves | — | Mocks (DSA, HLD, LLD, JS) | — |
| 22 | Mar 1–7 | — | Re-solve the *struggled* list | — | Redo 5 HLDs on a timer · case quizzes | Mocks |
| 23 | Mar 8–14 | — | Company-tagged problems | — | Weak areas: **Mistakes review** every day | Interviews |
| 24 | Mar 15–21 | — | 2 timed mediums/day | — | Light review · Mistakes review until it's empty | Interviews |

## 4. Rules the app enforces

1. **DSA target ramp-up while you learn JS:**
   - weeks 1–2: **2/day** (Sat 4)
   - weeks 3–4: **3/day** (Sat 6)
   - week 5 onward: adaptive, `ceil(remaining main problems / remaining study days)`, clamped to 3–6 on weekdays and up to 10 on Saturday
   - The last 3 weeks are excluded from the target, to leave room for revision.
2. **Side tracks:**
   - JS track: 1/day on study days from week 1 until all 35 are done (about week 6).
   - SQL track: 1/day from week 4 until all 30 are done (about week 9).
   - Every problem you solve today (new, review, JS or SQL) counts toward the day's DSA number.
3. **Theory target:** `ceil(remaining subtopics due by this week / remaining days this week)`, usually 2–3, with overdue topics first.
4. **Streak:** a day is complete when the DSA target is met, the theory target is met, and the **daily quiz is passed (≥ 60%)**. Sunday needs only the weekly quiz.
5. **Freeze tokens:** 1 per 7-day streak (max 2). A token covers one missed day automatically.
6. **Spaced repetition:**
   - *struggled* problems return after 3, 7 and 21 days, then every 21 days while still struggled
   - *ok* problems return after 14 days
   - *easy* problems never return
7. **Being honest about scale:** 606 DSA problems in 24 weeks while learning JS is a stretch goal. **The 153 core problems plus about 250 extended are enough to interview well.** The dashboard shows a "Core ✅" milestone and an on-pace indicator so you can see clearly where you stand.

## 4a. Quizzes and practice

The daily quiz is the only one that gates the streak. Everything else is optional practice you can repeat as often as you like:

- **Subtopic practice** (5 questions) and **topic quiz** (10) from `/learn`, and **case quizzes** (10) from each HLD/OS/DBMS case. Each subtopic has about 11 bank questions, so repeat runs keep finding new ones.
- **Rotation:** questions you've never seen come first, then ones you last got wrong. A question you answered right rests for about two weeks before it comes back. This applies to the daily and weekly quizzes too.
- **Difficulty:** pick Any, Easy, Medium or Hard before a practice run or an aptitude drill. Start on Easy while a topic is new, then switch to Hard in the weeks before interviews.
- **Mistakes review** (`/quiz/mistakes`): every question whose latest answer was wrong, from any quiz or practice run. Review all of them or one track at a time, 10 per run, with the most-missed first. A right answer clears a question. It never changes mastery or the streak. It's the main tool for the weak-area weeks (21–24).
- **Aptitude:** drills rotate through the bank in the same way (unseen, then missed) and accept a difficulty filter. Mocks stay mixed.

## 5. Interview-readiness checklist

- **JavaScript:** predict event-loop output orders, write polyfills (bind, Promise.all, debounce), explain closures, `this` and prototypes without notes.
- **Node:** explain the event loop phases, streams and back-pressure, when to use worker threads, how you'd find a memory leak.
- **DSA:** 2 mediums in 45 min in clean JS, with complexity analysis.
- **DBMS:** normalize a schema to BCNF, explain isolation anomalies, read an EXPLAIN plan, choose indexes.
- **LLD:** a runnable TypeScript class design in 60 min, with patterns used for a stated reason.
- **HLD:** drive a 45-minute design with estimates and trade-offs, and cite how a real company solved the same problem.
- **AI:** explain transformers at a high level, design a RAG system, discuss LLM cost, latency and evals.
- **Behavioral:** 8–10 STAR stories, each under 3 minutes and ending in a metric.

## 6. Core resources (all free; links in syllabus.json)

- **JS:** javascript.info, MDN, *You Don't Know JS*
- **Node:** nodejs.org/learn, Node Best Practices
- **DSA:** NeetCode roadmap, VisuALgo
- **DBMS:** CMU 15-445 lectures, SQLBolt, PG Exercises, Use The Index Luke
- **HLD:** System Design Primer, ByteByteGo, Hello Interview, *DDIA*
- **AI:** Google ML Crash Course, 3Blue1Brown, Illustrated Transformer, Karpathy's Zero to Hero, the Hugging Face LLM course
