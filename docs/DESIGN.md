# Design — PrepOS

**Feel:** a focused training cockpit. It is calm, warm and data-dense without clutter, and one glance at the dashboard answers *"what do I do today, and am I on track?"* The app is also a portfolio piece, so the craft should be visible: consistent spacing, real empty states and smooth micro-interactions.

Built with Tailwind v4 + shadcn/ui (New York style) + lucide-react icons. Light (warm off-white) is the default; dark is one tap away in the theme toggle.

---

## 1. Visual system

### Colour tokens (CSS variables in `app/globals.css`, consumed by shadcn)

The palette is **warm paper and deep indigo**: an off-white page with slightly lighter cards and warm borders in light mode, a warm charcoal (not blue-black) in dark mode. The app icon, PWA splash screens (`core/pwa/splash.ts`, `npm run icons`), manifest and `viewport.themeColor` use the same background and indigo.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--background` | `#13120F` | `#F6F4EF` | Page |
| `--card` | `#1B1A16` | `#FDFCF9` | Cards |
| `--sidebar` | `#171612` | `#FBFAF6` | Sidebar |
| `--muted` | `#24221D` | `#EEEBE4` | Inputs, hover rows |
| `--border` | `#2C2A24` | `#E5E0D6` | 1px borders |
| `--foreground` | `#ECE9E2` | `#1C1A17` | Text |
| `--muted-foreground` | `#A39D91` | `#625D54` | Secondary text |
| `--primary` / `--primary-foreground` | `#9B8CFF` / `#13120F` | `#4B3FC4` / `#FFFFFF` | Primary actions, progress, links |
| `--success` | `#4CC47A` | `#12703A` | Done, Easy |
| `--warning` | `#F0A43A` | `#9A4A07` | Medium, due reviews |
| `--info` | `#7FB0F5` | `#1F4FBF` | Neutral highlights, tips |
| `--destructive` | `#F2897B` | `#B42318` | Hard, errors, broken streak |
| `--streak` | `#FF8A3D` | `#B23A0A` | Flame, streak counters |

Every pair above is at least 4.5:1 for text on its own background and on a 10% tint of itself (checked by computing WCAG ratios, not by eye). **Soft tint = `bg-<tone>/10 text-<tone>`**; do not invent other alphas. Use the `Tone` type and `ToneBadge`/`StatTile` instead of typing the classes by hand.

Track accents (chips, topic headers): JS/TS yellow · Node lime · DSA orange · DBMS emerald · OOP violet · LLD indigo · HLD blue · CS amber · AI pink · Behavioral slate. These are defined in `syllabus.json → tracks[].color` and mapped to static Tailwind classes in `components/shared/badges.tsx`.

Difficulty badges: Easy = success, Medium = warning, Hard = destructive, all as soft tints (`/10`) with full-colour text. Track chips are the one place raw palette colours are allowed: ten categorical hues cannot be expressed with the semantic tokens.

### Typography
- **Inter** for UI and **JetBrains Mono** for numbers, complexities and code, both loaded with `next/font`.
- Scale: `text-2xs` (11px, badges and counters only) / `text-xs` 12 / `text-sm` 14 (body) / `text-base` 16 / `text-lg` 18 / `text-xl` 20 / `text-2xl` 24. Never use `text-[Npx]`; `text-2xs` is defined in `app/globals.css`. Numbers use `tabular-nums`.
- Section headings: use `SectionHeading` (h2 `text-lg`, h3 `text-base`, or the `eyebrow` micro-label), not hand-typed classes.

### Spacing, shape, depth
- 4px base grid. Card padding 20–24px. Grid gaps of 16px on mobile and 24px on desktop.
- **One page rhythm.** Every page is `PageHeader` then `PageStack` (`space-y-6` between top-level sections). Inside a section: `SectionHeading` then content at `space-y-3`; card grids use `gap-4`; cards pad `p-4 sm:p-5`. Sections and cards never add their own outer `mt-*`/`mb-*`; the stack spaces them, so a section that renders nothing leaves no gap.
- Radius: `rounded-xl` for cards and panels, `rounded-lg` for inputs and buttons, `rounded-full` for chips.
- Touch targets: on touch devices (`pointer-coarse:`) buttons, inputs and tabs grow to 40-44px automatically; do not override heights per call site.
- No heavy shadows. Use a 1px border, plus a subtle ring (`ring-1 ring-foreground/5`, visible in both themes) on cards. The only gradient is the hero progress ring (violet → pink).

### Motion
- 150–200 ms ease-out on hover and press. Checklist items strike through and fade when ticked.
- Completing the day shows a **confetti burst** (canvas-confetti, once per day) and the flame icon plays a 600 ms scale-bounce.
- **Sound and haptics** (`components/shared/feedback.ts`): short Web Audio tones, no audio files, for a ticked task, a passed or missed quiz and the day-complete fanfare, plus `navigator.vibrate` (Android) or the iOS 18 switch haptic. Key moments only, never on ordinary taps; muted per device in Settings > Sound and haptics.
- Respect `prefers-reduced-motion`.

## 2. Layout and navigation

- **Six hubs, ordered like a study day.** `components/layout/nav-items.ts` is the source of truth:
  - **Today**: Overview (`/dashboard`), Daily quiz, Review, Backlog, Assistant
  - **Plan**: Planner, Calendar, Targets, Stats
  - **Practice**: Practice hub, DSA, Problems, Mock interviews, Aptitude, Playground, DB Lab
  - **Learn**: Syllabus, Courses, Roadmaps, System Design, Web & AI, Interview bank, Projects, Eng blogs, Ask notes, Reading
  - **Career**: Jobs, Resume
  - **Settings**: Settings, Setup
  Every old URL still works; only the grouping changed. `pageFor()` matches the longest prefix, so `/playground/db` is DB Lab.
- **Desktop (≥1024px):** a 240px sidebar of the six hubs (`AppSidebar`). Each hub has its own expand button: the current hub opens by itself, and hubs you open by hand stay open on this device. `⌘/Ctrl + B` or the footer button collapses it to a 64px icon rail where each hub opens a flyout of its pages and today's progress shrinks to a chip; the choice is kept in a cookie so the server renders the right width. The top bar shows the hub name, today's date, the palette (`⌘K`), notifications and the theme toggle. The page's own title is the `PageHeader` h1, never repeated in the top bar.
- **Mobile (PWA first):** a bottom bar of Today · Plan · Practice · Learn · More, each tab at least 56px tall with the active icon in a filled pill. **More** is a sheet grouped as Career, Settings, Theme (Light / Dark / Device) and Sign out. The header keeps only the hub (or a back link), search, Ask, and the bell; the theme toggle moves into More below `sm`. Inside a hub, a scrollable tab strip (`HubTabs`, edge fades, current tab scrolled into view) switches pages on a hub's own pages; on detail pages such as `/dsa/two-sum`, `/jobs/[id]` or `/calendar/[date]` the header shows a back link to the page they belong to instead. Shell sizes are the `--topbar-h` and `--tabbar-h` variables, and every edge pads with `env(safe-area-inset-*)`.
- **Today's session:** `SessionBar` (Quiz and Review pages) shows Solve → Theory → Review → Quiz with a "Next" button. The logic is `core/domain/session.ts`; the quiz stays locked until its unlock rule is met.
- Content max-width 1200px, centred; IDE pages go full width.

## 3. Pages

### 3.1 Login
Centred card on a dark background with a faint animated grid or noise. It contains the logo, "PrepOS", the tagline "Senior Backend · March 2027", email and password fields, and a Sign in button. **No sign-up link and no "forgot password".** Errors are inline, and after 5 failures it shows "Too many attempts, try again in N min".

### 3.2 Dashboard (the main screen)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Good evening, {ADMIN_NAME} · Fri, 9 Oct · Week 1 of 24 · Language & Foundations │
├──────────────────────────────┬──────────────┬──────────────┬──────────────┤
│  TODAY                       │ 🔥 Streak    │ ✅ Solved     │ ⏳ Countdown  │
│  (◔ progress ring 3/4)       │   12 days    │  87 / 606    │  163 days    │
│  ☐ DSA  2/4  →               │  best 15 ·❄2 │  on pace ▲   │  to Mar 21   │
│  ☐ Theory 1/2 →              ├──────────────┴──────────────┴──────────────┤
│  ☐ Read 0/3 →                │  Activity heatmap (24 weeks × 7 days)      │
│  🔒 Daily quiz (unlocks…)    │  ■■□■■■■ …  legend: none/partial/complete  │
├──────────────────────────────┼────────────────────────────────────────────┤
│  Today's problems            │  This week's theory                        │
│  • Two Sum  Easy  Arrays [↗][✓]│  HLD · Caching: ☑ Cache-aside ☐ Eviction  │
│  • 3Sum     Med   2-Ptr  [↗][✓]│  LLD · Parking Lot ☐                       │
│  Review due: Koko (struggled)│                                            │
├──────────────────────────────┴────────────────────────────────────────────┤
│  📰 AI & Eng news: 3 cards (source, title, 1-line summary, "Read")        │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Progress ring:** the share of the four day-requirements done. The centre shows "3/4", and at 100% it turns green and fires confetti.
- **Ticking ✓ on a problem** opens a compact sheet with confidence (easy/ok/struggled), minutes taken, a one-line approach, and time/space complexity. Saving updates the ring immediately (optimistic UI).
- **Streak card:** flame icon, current and best streak, freeze tokens as ❄ icons. If today is incomplete after 20:00, the card pulses amber with "Finish today to keep your streak".
- **Heatmap:** the full 24-week plan window. Cell colours: empty (future), muted (missed), warning (partial), success (complete), blue outline (freeze used). Hovering a cell shows that day's counts, clicking opens that day in the calendar.
- **This week's mocks:** a compact card with the DSA and System design slots (scheduled, today, missed, or done with the score). Informational only.
- **"On pace" indicator:** solved compared with the expected count for today. ▲ green when ahead, ▼ red when behind, with the size of the gap.
- **Notification banner** at the top when there are unread notifications (e.g. the morning plan or the evening reminder).

### 3.3 DSA
- Track tabs: **DSA (in JS)** · **JavaScript** (30 Days of JS) · **SQL**. The DSA tab is split into **Pass 1 · Core (153)** and **Pass 2 · Extended (453)**. *(The read-only version of this is built.)*
- The header shows overall progress, a "Core ✅" milestone, a difficulty split donut and solved-this-week.
- Each **pattern accordion** carries a progress bar and an "x / y" count. Inside it is a table with order #, title (links out to LeetCode ↗), difficulty badge, status, confidence and last solved date.
- Filters: pattern, difficulty, status (todo/solved/struggled), and search. Sort by order (default) or by last solved.
- **Problem page** (`/dsa/[slug]`): a compact header (back, title, difficulty, status, Mark solved, LeetCode ↗, prev/next) above an IDE for every problem. The left pane is always Problem · Notes · History; the right pane depends on the track:
  - Problems with test cases: the full IDE below.
  - **SQL track**: a SQL workspace on in-browser SQLite with each problem's LeetCode tables and sample rows. Run shows your rows; Submit compares them with a reference query (Accepted opens the solve sheet). The bottom tabs are Result, Expected (on request) and Tables (columns, keys, row counts, a data preview).
  - **JavaScript track**: LeetCode's template plus the examples as `test(…)` blocks. Run shows an "x/y tests passed" chip in the console, and a full pass offers "Log solve". Copy + open LeetCode copies the code without the examples.
  - Anything else: a scratch editor (JavaScript, TypeScript, Python) with a console.
- **IDE shell** (`components/ide/`, used by `/dsa/[slug]`, `/problems/[slug]` and mock coding rounds), tuned for a 13–14" laptop:
  - From `lg`: two resizable panes. Left: tabs per page (Problem, Notes and History on `/dsa`; Problem, Solution and Solves on `/problems`). Right: the editor on top and a resizable bottom panel (Testcases, Result, Edge cases, Console). Pane sizes persist per page type. A full-screen toggle hides the app chrome.
  - Below `lg`: a Problem | Code tab switch, the editor at a fixed comfortable height.
  - Toolbar: language select (JavaScript, TypeScript, Python), font size, reset to starter, full screen; Run (visible and custom cases) and Submit (all cases, hidden ones pass/fail only). Python shows a one-time "Loading Python…" state while Pyodide downloads.
  - Test cases are editable JSON per parameter; you can add up to 8 of your own. The Result tab shows Accepted / Wrong answer with per-case chips, expected vs actual, runtime and console output.

### 3.3b Problems (questions from anywhere)
- `/problems`: your custom problems (title, difficulty, topic, source AI or pasted, solved state), a **Generate** dialog (topic, difficulty, optional company style) and a **Paste a problem** link. Without an AI key, Generate opens an unsolved runnable sheet problem instead.
- `/problems/new`: statement first, an optional "Fill the rest with AI" button, then title, difficulty, topic, function name, typed parameters, return type, comparison, test cases as `[args] => expected` lines (`hidden` prefix for hidden cases), hints and an optional reference solution. Saving runs the reference solution on every case first.
- `/problems/[slug]`: the IDE shell with the statement, hint ladder, a Solution pane (revealed on request) and the solve history.

### 3.3c Calendar
- `/calendar`: a Monday-first month grid inside the plan window, prev/next month. Each cell shows the date, a completion dot for past days, and DSA, theory and review counts with estimated hours (future days are a labelled projection). Rest and Sunday cells are muted; today is outlined. Weekly mock days carry a "DSA mock" or "SD mock" badge (green once done). On phones, cells shrink to the date plus a `DSA·theory` count.
- `/calendar/[date]`: the day's sections (New DSA, Theory, Reviews, JS and SQL, Bonus) as link lists with done ticks for past days, a projection banner for future days, the scheduled weekly mock linking to `/mock` or its report, and prev/next day buttons.

### 3.3d Mock interviews
- `/mock`: an active-session banner (Resume), this week's slots, a grid of the nine interview types (minutes, what's in it, real-interview length), and history with a score trend. Starting opens a dialog listing the rounds, the problem source (sheet, custom or mixed, when you have custom problems), an optional "Fresh questions from the AI" checkbox and a project description for the project round.
- `/mock/[id]`: a sticky bar with the type, the current round and its suggested minutes, a numbered question stepper (answered ones turn green, rounds are spaced apart), a countdown that turns red under 5 minutes, and Submit. Coding questions use the IDE shell (hints cost points and say so); MCQs are large option cards with the code above; written questions show context and one textarea per section with a hint and suggested minutes. Everything autosaves; at zero the session submits itself.
- `/mock/[id]/report`: the total out of 100 (or "waiting for grades"), round score tiles, Strengths / Gaps / Practise next cards, then each question: tests passed, time and hints for coding; your choice vs the answer and the explanation for MCQs; rubric scores with feedback, what a strong answer covers and a reference answer for written ones. Ungraded written answers get a 0–4 self-review form per criterion; AI grades can be overridden.

### 3.4 Review
A queue of cards due today. Each card offers "Open ↗", then "Re-solved: easy / ok / struggled". An empty state says "Nothing due. 🎉"

### 3.5 Learn
- A wrapping track tab bar (JS & TS · Node · DSA concepts · DBMS & SQL · OOP · LLD · HLD · CS · AI · Behavioral) above a 2-column grid of topic cards: week chip, level label (Basics → Interview/Big-tech), title, subtopic progress bar, resource chips (hostname + ↗) and a "current week" highlight. `?track=` preselects a tab. *(The read-only version is built.)*
- The topic page has the subtopic checklist (each item expands into a markdown notes field), resource links, and a "Practice quiz" button that runs 5 questions from the bank for this topic.
- HLD topics get a "Design template" button that inserts the standard skeleton (Requirements / Estimates / API / Data model / HLD / Deep dives / Trade-offs) into the notes.

### 3.5b Playground
- A split view: editor on the left (CodeMirror 6, JavaScript, TypeScript or Python, `⌘↵` to run), console on the right. Logs are colour-coded by level, and timing is shown. The split is resizable (side by side from `xl`, stacked below) and persists; a status bar shows lines, characters and shortcuts.
- Scratch work autosaves on the device. The snippets sidebar collapses, font size persists, and a share button copies a `?snippet=` link.
- Code runs in a **Web Worker** with a 3 s timeout (terminated on infinite loops) and has no DOM or network access, which is safe for experiments.
- **Snippets** sidebar: save, rename and tag by topic (e.g. `js-async`). Snippets can be linked from a subtopic's notes.
- **Output drills:** event-loop / `this` / closure puzzles. You predict the console output first, then run the code and compare. Results can feed the daily quiz.

### 3.5c DB Lab
- A top bar with the SQL / MongoDB switch, the dataset picker and a solved progress bar.
- From `lg`: a 300px sidebar (Challenges with difficulty filters and concept tags, or Tables/Collections with columns, keys, row counts and an eye button that previews the data without touching the editor), and the main pane: a toolbar (Start over, Reset data, Run, Check), the challenge card (prompt, Hint, Answer behind a confirm), then a resizable editor over Result · Expected · History tabs. Accepted offers "Next challenge".
- Below `lg`: Query · Challenges · Tables tabs. Drafts, the solved set and the last 20 queries persist on the device.

### 3.6 Quiz
- **Locked state:** a lock icon plus "Solve at least 1 problem and check 1 topic to unlock", with links to both.
- **Unlocked:** one question per screen with a progress dots header. Options are large tappable cards, with keyboard shortcuts 1–4 and Enter.
- **After submitting:** the score with a radial gauge and pass/fail, then each question with your answer, the correct one and the explanation, plus "Retake" (reshuffled). A pass animates the dashboard ring step to complete.
- History lists date, score, pass/fail, and a "Practice wrong answers" action.

### 3.7 News
Category pills (All · AI Labs (Google · OpenAI · DeepMind) · AI News · JavaScript & Node · Databases · System Design · Big-Tech Engineering · Career), a "Google News" row of keyword chips (editable in Settings), unread/bookmarked filters, unread/bookmarked filters and a card list (source favicon, title, age, snippet or AI summary). Clicking "Read ↗" opens the link in a new tab and marks the item read. A "Browse-only sources" section sits at the bottom.

### 3.8 Stats
Problems per day (bar, last 30 days), cumulative solved compared with plan (line, actual vs ideal), difficulty mix by week (stacked bar), quiz scores (line with a pass-line at 60%), and a track coverage radar or bars.

### 3.8b Plan setup (`/plan/setup`)
A single-column wizard (max 3xl) with a five-step header (Goal, Strengths, Time, Check, Review; labels hide on mobile). Each step is one card and is saved before moving on, so a reload resumes. Strengths is a grouped list per track: five 36 px rating buttons (1 to 5), a Must/Nice/Skip select and a "want to learn" tick, with "Rate the rest 3" and "Clear all". Time is a seven-column hours grid plus date-range rows. The Review step states the interview date and weekly hours it is about to save (through `savePlanner`, leaving other Settings alone). Review shows the feasibility card (status colour from `success`/`warning`/`destructive`, coverage bar, work left vs time, remedies). Never hard-code colours.

### 3.9 Settings
A section rail (desktop) or chip strip (mobile) over cards for plan window (start date, revision weeks) and a read-only summary of study hours and the interview date with an "Edit on the Planner" link (those, and goals, live only on `/plan` in `PlannerForm`; the server keeps the stored values if Settings sends others), daily targets, quiz and mastery, mocks, rest days, LeetCode (with a "Test username" check), news keywords, Gemini projects (with extension status), paid AI cap, AI providers, notification channels, and data/backup. **Saving is per section:** the sticky bar names the sections with unsaved changes, each is validated on its own, and a bad value in one section never blocks the others (`saveSettingsSectionsAction`, rules in `modules/settings/domain/settings.ts`). API keys are only ever shown as configured or not.

### 3.10 Setup (`/setup`)
The first-run checklist: content seeded, secrets, **Plan your prep** (links to `/plan/setup`), LeetCode, daily jobs, news, notifications, AI, backup and sign-in persistence. Required items gate the dashboard's "Finish setup" card.

## 4. Components (shadcn-based)

`Card`, `Badge`, `Button`, `Checkbox`, `Progress`, `Tabs`, `Accordion`, `Sheet`, `Dialog`, `Tooltip`, `Command` (⌘K), `Sonner` toasts, `Skeleton`.

Shared primitives in `components/shared/` (use these before writing a new card, chip or heading):

| Component | Use |
|---|---|
| `PageHeader` | The one page title, description and actions |
| `PageStack` | The page body under `PageHeader`: `space-y-6` between sections |
| `SectionHeading` | Section titles (h2/h3, optional eyebrow, hint and action) |
| `StatTile` | A labelled number or panel; `tone` picks the icon colour |
| `LinkCard` | A card that is a link: one hover, focus ring and touch height |
| `Chip` | Toggle filters (`aria-pressed`); use `Tabs` when choices switch a whole view |
| `ToneBadge` | Status pills in `neutral/primary/success/warning/danger/info/streak` |
| `BackLink` | The back link on detail pages |
| `EmptyState` | The only dashed "nothing here yet" box |
| `DifficultyBadge`, `TrackChip` | Problem difficulty and syllabus track |

Layout components: `AppSidebar`, `HubTabs`, `MobileTabBar`, `SessionBar`, `TopBarTitle`, `CommandPalette`, `ThemeToggle`.

## 5. States and copy

- Every list has a **skeleton** loading state and a friendly **empty state** with an icon, one line and one action.
- Copy is short and encouraging, never guilt-tripping. Examples: "2 more to go 💪", "Streak saved with a freeze ❄", "You're 6 problems ahead of plan."
- Every error toast includes what to do next.

## 6. Accessibility
- WCAG AA contrast in both themes. Status is never shown by colour alone (icons and text sit next to the colour).
- Full keyboard navigation with visible focus rings (`focus-visible:ring-2 ring-ring`).
- `aria-live` region for quiz feedback and checklist progress.
