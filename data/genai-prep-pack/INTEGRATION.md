# Integrating the GenAI prep pack into your study site

This folder is data, not a website. Drop it into your repo (for example `content/genai-prep-pack/` or `public/data/genai-prep-pack/`) and render it with whatever stack the site already uses.

## What is in the pack

| File | What it holds | Use it for |
| --- | --- | --- |
| `plan.json` | 45 days (Fri 23 Oct 2026 to Sun 6 Dec 2026), 103 tasks, 161.5 hours. Each task has a stable id, kind, hours, a "done when" test, resource links, problem links and (for drills) questions. | Daily and weekly views, progress tracking |
| `resources.json` | 229 videos, blogs, docs, papers, repos and tools, each with modules, level (core, deep, optional) and a `verified` flag. | Resource library with filters |
| `dsa.json` | 13 patterns, 99 problems with links, 12 AI-flavoured implementations, interview habits. | DSA page, pattern checklists |
| `projects.json` | 8 flagship system design projects with MVP, architecture, decisions, evaluation, failure modes, deliverables, talking points. | Project pages, portfolio checklist |
| `questions.json` | Interview questions grouped by week and 10 model-answer outlines. | Flashcards, mock-interview mode |
| `tools/verify_links.py` | Link checker. Run it on a machine with normal internet access. | CI check or one-off audit |

All ids are stable. Do not rename them, because saved progress refers to them.

## Rules for whoever renders this

1. **Progress is keyed by task id** (`d00t0`, `d03t1`, ...). Store `{ [taskId]: true }` and a timestamp. Never key progress by array position.
2. **Dates come from `plan.json`**. If the user starts late, add a start-date setting and shift every date by the same offset; do not edit the file.
3. **Respect `verified`.** `true` means the page or video was fetched on `verified_on` and its title matched. `false` means it has not been checked from the build environment. Render unverified links normally, but run `tools/verify_links.py` in CI and fail or flag on `dead`.
4. **Do not invent content.** If a field is missing, hide it. Do not fabricate links, durations or statistics.
5. **Task kinds** are `setup`, `dsa`, `learn`, `build`, `drill`, `review`. Give each a distinct label and color; keep the label as text, not only color.
6. **Show "done when"** under every task that has one. It is the acceptance test for the task.
7. **Questions** (`questions` on drill tasks and `questions.json`) should be available as flashcards with a hide-and-reveal answer area where an outline exists.
8. Keep the site working when the JSON changes: read the files at build time or fetch them, never copy the contents into components.

## Suggested pages

- **Today**: the day whose `date` equals today (or the next unfinished day), tasks with checkboxes, hours, links, done-when.
- **Plan**: the six weeks plus the head start, each week collapsible, progress per week.
- **Resources**: filter by module, type and level; search by title; badge for unverified links.
- **DSA**: pattern list with problem checklists, the 12 AI-flavoured implementations, a log table (problem, date, result, mistake).
- **Projects**: one page per project plus a "pick three" tracker with the submission checklist from `deliverables`.
- **Interview**: flashcards from `questions.json`, a mock-interview timer, a STAR story editor.
- **Progress**: overall percent, hours done, streak, next up.

## Prompt to give the Claude inside your repo

Copy this as your first message there, after adding the pack to the repo:

```text
I added a data pack in <path>/genai-prep-pack/ (plan.json, resources.json, dsa.json,
projects.json, questions.json, tools/verify_links.py) and read INTEGRATION.md in that folder.

Goal: integrate it into this study site so I can follow a 45-day GenAI interview plan from here.

First, inspect the repo and tell me: the framework, how pages and data are organized, how
(or whether) the site stores user progress, and any existing study-plan features that overlap.
Do not change code yet.

Then propose a short plan (pages, components, where progress is stored) that matches the
existing conventions and reuses existing components. Wait for my approval.

After approval, implement it in small commits:
1. Data loading with types generated from the JSON (no copying of content into components).
2. Today and Plan pages with task checkboxes and progress keyed by task id.
3. Resource library with filters and an unverified-link badge.
4. DSA, Projects and Interview pages.
5. A CI step that runs tools/verify_links.py and fails on dead links.

Constraints: follow the existing code style, add tests for progress and date logic, keep the
site accessible and mobile-friendly, and do not invent resource links or content.
```

## If your site has no backend

Store progress in `localStorage` under a versioned key such as `genai-prep-progress-v1`, and add an Export and Import button that downloads and loads a JSON file, so progress survives a browser change.

## Updating the plan later

Ask for changes in the original Claude conversation, then replace the JSON files. Because ids are stable, existing progress keeps working for tasks that still exist.
