---
target: dashboard page (app/(app)/dashboard/page.tsx)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kumarsatyam/Desktop/Interview-Prep/app/(app)/dashboard/page.tsx"
target_fingerprint: "sha256:c6ff5f00b561d51190694fdc4f4a01ed43d1863821a8de4ae0d603c05222f8d3"
target_path: /Users/kumarsatyam/Desktop/Interview-Prep/app/(app)/dashboard/page.tsx
timestamp: 2026-10-17T08-20-03Z
slug: app-app-dashboard-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | LeetCode background sync gives no confirmation when new solves land |
| 2 | Match System / Real World | 3 | "Freeze tokens," "readiness blueprint" rely on title tooltips invisible on touch |
| 3 | User Control and Freedom | 2 | No way to collapse/reorder/dismiss any of the ~16 stacked sections |
| 4 | Consistency and Standards | 3 | DashboardHeader hand-rolls markup instead of the shared PageHeader; heatmap/streak color tokens undocumented in DESIGN.md |
| 5 | Error Prevention | 3 | Server actions are zod-validated with bounded ranges - solid |
| 6 | Recognition Rather Than Recall | 2 | Header CTA, Today checklist, Study Flow, Problems/Theory cards all answer "what's next" redundantly |
| 7 | Flexibility and Efficiency of Use | 2 | No way to skip rarely-changing sections (News, Mocks); same fixed order every day |
| 8 | Aesthetic and Minimalist Design | 2 | ~16 stacked top-level sections contradicts DESIGN.md's own "calm, data-dense without clutter" brief |
| 9 | Error Recovery | 3 | fail() / ActionResult pattern gives clear, human-readable errors |
| 10 | Help and Documentation | 2 | No help affordance for domain metrics (readiness %, pace delta, freeze tokens) beyond icon+label |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: Largely authored, not templated. The teal/sage identity, --streak token tied to the flame icon, track-specific chips, and copy like "Still needed: X" are domain-specific. But the page's macro-structure - a long stack of independently-styled widget cards - is the generic SaaS-dashboard shape.

Deterministic scan: Clean except one finding - components/layout/sticky-notes-dock.tsx:34, rule side-tab ("Side-tab accent border"): a border-l-4 thick colored border, flagged as the most recognizable AI-slop tell.

Visual overlays: Not available (no browser automation tool exposed, no dev server started).

## Overall Impression

Design-system primitives are solid (detector found almost nothing). The real problem is composition: the dashboard stacks every feature as equal-weight, so the streak - the one thing the product exists to protect - competes visually with News and Job search.

## What's Working

1. ProgressRing + checklist pairing (today-card.tsx) - one glance answers "what's left," optimistic updates, confetti payoff.
2. Domain-authored color system - --streak, track chips, teal/sage identity feel built for this product.
3. Proactive streak-risk messaging - amber pulse + "Still needed" copy targets the core mechanic.

## Priority Issues

[P1] Competing "what to do" surfaces - DashboardHeader CTA, TodayCard checklist, StudyFlowCard, ProblemsCard/TheoryCard all answer "what's next" redundantly, forcing recall over recognition. Fix: fold Study Flow into Today checklist as required/recommended/optional tiers. Command: /impeccable distill

[P1] No recovery action inside the streak-risk alert - stat-grid.tsx's risk message states the problem with no button to act. Fix: inline action ("Go to quiz" / "Use a freeze") inside the risk message. Command: /impeccable clarify

[P2] No progressive disclosure - Backlog, Mocks, Job search, Bonus, News always render full-weight regardless of relevance. Fix: collapse low-frequency sections by default. Command: /impeccable layout

[P2] Header bypasses shared PageHeader primitive; new tokens undocumented - DashboardHeader hand-rolls markup; heatmap/streak-week tokens missing from DESIGN.md. Command: /impeccable document

[P3] animate-pulse on streak-risk border may ignore prefers-reduced-motion, against DESIGN.md's global commitment. Command: /impeccable polish

Detector-only: components/layout/sticky-notes-dock.tsx:34 border-l-4 side-tab accent - recognizable AI-slop tell, address alongside /impeccable polish.

## Persona Red Flags

Riley (stress tester): broken streak (reset to 0) renders identically to "never started" - no distinct empathetic framing, against DESIGN.md's "never guilt-tripping" voice.

Sam (accessibility): heatmap aggregate is well-built, but per-cell "streak this week" dots expose state only via title attribute - unreliable on touch/screen readers - with one aggregate aria-label covering the whole list.

Casey (mobile): ~16-section vertical stack, no jump-nav/section anchors; heatmap's internal horizontal scroll nested inside page's vertical scroll is a thumb-friction pattern.

## Minor Observations

- ProblemsCard's toItem() helper reuses one render path for new/review/side-track problems.
- CardAction header links ("All ->", "Learn ->") are a consistent card-to-hub navigation habit.
- ActivityCard folding a compact LeetCodeCard into its header is a smart space-saver but gives the card two responsibilities.

## Questions to Consider

1. If Study Flow already picks "one next action," why does the page also carry a header CTA, a Today checklist, and two more cards surfacing the same data again?
2. The streak is the one mechanic this product exists to protect - why is the fix one click further away than the warning itself?
3. Would the dashboard be more honest as a short fixed "briefing" with Jobs/News/Mocks/Backlog demoted to a one-tap "More" surface?
