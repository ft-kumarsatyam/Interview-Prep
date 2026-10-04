/**
 * A curated summary of how PrepOS works (from docs/ARCHITECTURE.md), for the assistant's "app-guide" tool.
 * Keep it short and factual; update it when a page or a rule changes.
 */
export const APP_GUIDE = `PrepOS is a private, single-user interview-prep app. Every "day" is a calendar date in the app timezone.

DAILY LOOP
- The dashboard (/dashboard) shows today's plan: new DSA problems, due reviews, a JS problem, an SQL problem (from week 4) and theory subtopics, plus the streak, pace and a heatmap.
- Day kinds: study, revision (last 3 weeks), sunday, rest (from Settings) and outside (before start / after end).
- A study day is complete only when DSA solved >= DSA target AND theory done >= theory target AND today's quiz is passed. Sunday needs the weekly quiz passed. Rest days complete automatically.
- The daily quiz (/quiz) unlocks after at least 1 problem and 1 subtopic (when the targets are above zero). Pass mark is the quiz pass % in Settings (default 60). The quiz is mandatory for the streak.
- Streak: does not break while today is in progress. Freeze tokens bridge a missed day (earn 1 per 7 complete days in a row, max 2) but do not add to the count.
- Spaced repetition (/review): struggled -> review after 3, 7, 21 days; ok -> after 14 days; easy -> never.

PAGES
- /dsa and /dsa/[slug]: problems by pattern or sheet step; solve form, notes, history. /problems: problem of the day and custom problems. /playground: JS/TS runner.
- /learn and /learn/[topicId]: syllabus topics with subtopic checklists, notes, practice and a topic quiz (unlocks when every subtopic is ticked). /learn/practice: practice runner. /quiz/mistakes: most-missed questions.
- /courses, /roadmaps: long-form lessons and roadmap.sh-style roadmaps; they never change the plan or streak. /web, /projects: web-dev lessons and projects.
- /design (system design), /design/os, /design/dbms: case studies with study and timed mock-answer tabs.
- /mock: mock interviews (DSA, HLD, project interviews) with timed sessions and graded reports.
- /aptitude: quantitative, logical and verbal practice.
- /plan: weekly sprint view, intake wizard (/plan/setup), feasibility and rebalance. /calendar: month grid of past and projected days.
- /stats: solves per day, cumulative vs ideal, quiz trend, coverage, LeetCode card.
- /news, /blogs: feeds and an in-app reader. /ask: answers from your own notes and saved articles with citations.
- /resume: ATS score, roast and tailoring. /jobs: discovery from public job boards, a tracker (saved, applied, screening, interview, offer, rejected, withdrawn) with follow-ups. PrepOS never logs in to job sites or auto-applies.
- /chat: this assistant, with saved conversations.
- /settings: plan dates, targets, quiz and mastery thresholds, rest days, study hours, notifications, AI providers, export. /setup: setup checklist.

AI
- AI is optional: without a key, quizzes use the built-in question bank. Free providers are tried first; paid ones are a last resort that always asks first and are never used by the assistant.
- LeetCode solves sync from the public profile in Settings.`;
