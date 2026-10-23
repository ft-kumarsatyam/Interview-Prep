from helper import entry, q

CC = "https://docs.anthropic.com/en/docs/claude-code"
MCP = "https://modelcontextprotocol.io/docs/getting-started/intro"

NOTES = {
 "m0-6": {
  "autocomplete-assistants-agents": entry(
   what="""Three rungs. **Autocomplete** predicts the next tokens in the editor as you type (Copilot-style). You stay in the loop on every line. A **chat assistant** takes a question and returns text or a suggested patch; you still apply it. A **coding agent** can **read the repo**, **edit files**, **run commands**, **look at the result**, and **iterate** until a check passes or it gives up.

The jump is not "smarter model". It is **tools plus a loop**. Autocomplete has no tools. Chat has whatever you paste. An agent has a working tree, a shell, and a test runner. That is power and risk: it can also `rm`, commit secrets, or wander.

These are products, not religions. The same model can sit on all three rungs depending on the UI.""",
   why="""On the job you will use all three in a week. Autocomplete for the line you already know. Chat for "what does this function do". An agent for "add a cursor to the list endpoint and run pytest". Interviewers at this level want the progression named and the risk named. "I let the agent rip on main" is the wrong sentence.

They will ask what the agent can do that chat cannot: run the test, read the failure, edit again. That is the verification loop in the next topic.

Hiring managers now assume you have touched an agent. They want to hear that you still own the diff.""",
   how="""Pick the rung on purpose.

- Typing a list comprehension you can already write: autocomplete.
- "Why is this test failing?" with a pasted traceback: chat is enough.
- "Implement Idempotency-Key on POST /tickets, run the tests, stop if they fail": agent, on a branch, with a spec.

Example agent loop: you give the file names and the test command. The agent reads `routes.py` and `test_tickets.py`, edits, runs `uv run pytest`, reads a 422 you did not expect, edits the model, runs again. You then `git diff` and decide.

If you cannot describe the loop, you are not ready to let it touch the tree.""",
   failures="""1. **Agent on main** with no branch and no spec.

2. **Treating autocomplete as an agent** and expecting it to run tests.

3. **Chat without files** — the model invents APIs.

4. **No human on the diff.**""",
   line="""Autocomplete finishes a line, chat answers a question, an agent can edit and run. I pick the rung for the job. An agent is a loop with tools; I still read the diff and I never let it own main.""",
   key_points=[
    "Autocomplete predicts the next tokens; you stay on every line.",
    "Chat answers; you apply.",
    "An agent reads, edits, runs, and iterates.",
    "The jump is tools plus a loop, not a magic model.",
    "Same model, different rungs.",
    "You still own the diff.",
   ],
   questions=[
    q("recall", "What can a coding agent do that a chat assistant typically cannot?", "Read the repository, apply edits, run commands, inspect the result, and iterate without you pasting every file."),
    q("apply", "When would you refuse an agent and use chat instead?", "When you need an explanation or a small snippet and you do not want a working-tree mutation. Or when the repo is not set up to run safely."),
    q("debug", "An intern lets an agent 'just fix production' on main. What is wrong?", "No branch, no spec, no review. The agent can edit and run; that is not a release process."),
    q("apply", "Map the three rungs to a day's work on a FastAPI service.", "Autocomplete for the line, chat for a traceback question, agent for a scoped feature with tests on a branch."),
    q("recall", "Why is an agent riskier?", "It has a shell and a writable tree. It can delete, commit secrets, or wander outside the spec."),
   ],
   links=[
    {"title": "Claude Code overview", "url": f"{CC}/overview"},
    {"title": "GitHub Copilot: about", "url": "https://docs.github.com/en/copilot/about-github-copilot"},
   ],
  ),
  "ai-assisted-engineering-vs-vibe-coding": entry(
   what="""**AI-assisted engineering** means you **direct** the work and **verify** the result: spec, tests, diff, run. **Vibe coding** means you accept whatever was generated because it looks plausible. The code may even run. You still do not know what it does on the empty path, the 409 path, or the secret path.

The difference is not whether you typed. It is whether a human can explain the change and has evidence it works. An agent can be used in either mode. The mode is yours.

Vibe coding is fine for a throwaway sketch you will delete. It is not fine for a handler that takes money or user text.""",
   why="""On the job, vibe-coded services fail in review or in production. Interviewers will ask you to distinguish the two. They want: I write the spec and the test, the model drafts, I read the diff, I run the suite, I reject garbage. They do not want: I prompt until /docs looks pretty.

This is also a self-control topic. Fatigue plus an agent is how vibe coding sneaks into a real PR.

Hiring bars now include "tell me about a time the model was wrong". If you have never caught it, you have been vibe coding.""",
   how="""Assisted loop for "add 409 on duplicate title":

1. You write the rule and a failing test.
2. The agent implements.
3. You read the diff: is the unique constraint in a migration, or a Python `if` on a race?
4. You run pytest and a concurrent curl.
5. You accept or send it back.

Vibe loop: "make a tickets API" → accept 800 lines → cannot explain the session handling.

The artefact that keeps you honest is the test you wrote *before* you liked the output.""",
   failures="""1. **Accepting a diff you cannot explain.**

2. **No test until after merge.**

3. **Prompting instead of reading** when something fails.

4. **Calling vibe coding "shipping fast"** in a regulated path.""",
   line="""Assisted engineering is me directing and verifying. Vibe coding is me accepting plausible output. I use agents for speed; I keep the spec, the test and the diff. If I cannot explain the change I do not merge it.""",
   key_points=[
    "Assisted: you direct and verify. Vibe: you accept plausible output.",
    "The test you wrote first is the honesty check.",
    "Throwaway sketches can be vibe; production handlers cannot.",
    "Fatigue is how vibe coding sneaks in.",
    "Be ready to name a time the model was wrong.",
    "Speed without verification is not engineering.",
   ],
   questions=[
    q("recall", "What is the difference between AI-assisted engineering and vibe coding?", "Assisted: you specify, inspect the diff, test, and reject. Vibe: you accept generated code because it looks right."),
    q("apply", "How do you keep an agent in the assisted lane on a new endpoint?", "Write the contract and a failing test first, then let the agent implement, then read the diff and run the suite."),
    q("debug", "A PR is 800 generated lines and the author cannot explain sessions. What do you do?", "Request changes: split the PR, add tests, and have them narrate the session lifecycle. Do not merge on vibe."),
    q("apply", "When is vibe coding acceptable?", "Throwaway prototypes you will delete, or personal sketches. Not for secrets, money, or shared main."),
    q("recall", "What interview story should you have ready?", "A time the model produced a wrong, insecure, or over-engineered change, how you caught it, and what you changed."),
   ],
   links=[
    {"title": "Claude Code: best practices", "url": f"{CC}/best-practices"},
    {"title": "GitHub: responsible use of Copilot", "url": "https://docs.github.com/en/copilot/responsible-use-of-github-copilot-features"},
   ],
  ),
  "explore-implement-debug-with-an-agent": entry(
   what="""A coding agent is useful in three jobs. **Explore**: map an unfamiliar repo (where is the session created, where are tests). **Implement**: apply a scoped change you specified. **Debug**: run the failing command, read the traceback, propose a patch. Each job needs a different prompt: explore is read-only if you can make it so; implement needs a spec and a test; debug needs the actual error.

Do not ask an agent to "improve the project". Ask it to "find get_db and quote the yield" or "make test_empty_ticket pass without changing other tests".

You still walk the map it draws. Agents hallucinate file names.""",
   why="""On the job this is how you enter a brownfield service on day one and how you unblock a red CI at 17:00. Interviewers want a concrete story: I pointed the agent at the test and the traceback, not at the whole monorepo. They want to hear you discarded a wrong file path.

They will ask how you would explore without letting it edit (read-only / plan mode if the tool has it). That is a senior habit.""",
   how="""Explore: "List the files that create the FastAPI app and the DB session. Quote the get_db function. Do not edit."

Implement: "Add cursor pagination to GET /tickets as specified in this failing test. Do not change POST. Run uv run pytest tests/test_tickets.py."

Debug: "Here is the traceback (paste). test_cursor fails on a 500. Find the exception and propose a minimal patch. Run the one test."

After each: `git diff`. If the agent touched `migrations/` when you asked for a route, revert that path.

Keep the working tree clean before you start so the diff is the agent's work, not yours mixed in.""",
   failures="""1. **One vague prompt** for all three jobs.

2. **Trusting a file map** without opening the files.

3. **Letting debug wander** into a rewrite.

4. **Dirty tree** so you cannot see what it changed.""",
   line="""I use an agent to explore, implement, or debug — one job per prompt. Explore quotes files, implement follows a test, debug follows a traceback. I read the diff and I revert extra paths.""",
   key_points=[
    "Three jobs: explore, implement, debug — one at a time.",
    "Explore can be read-only; implement needs a spec; debug needs the error.",
    "Agents invent paths; open the files.",
    "Start from a clean tree so the diff is honest.",
    "Revert work outside the ask.",
    "Do not prompt 'improve the project'.",
   ],
   questions=[
    q("apply", "Write a prompt to explore where sessions are created.", "Ask for the files and a quote of get_db or equivalent. Say do not edit. Then open those files yourself."),
    q("apply", "Write a prompt to implement a failing test.", "Name the test, name the allowed files, give the test command, and forbid unrelated refactors."),
    q("debug", "The agent 'fixed' a bug by deleting the test. What do you do?", "Revert, restore the test, and tighten the prompt: do not change tests unless I say so."),
    q("recall", "Why start from a clean git status?", "So git diff is the agent's change set. A dirty tree hides extra edits."),
    q("apply", "How do you debug with an agent without a rewrite?", "Paste the traceback, name the one test, ask for a minimal patch, and reject scope creep in the diff."),
   ],
   links=[
    {"title": "Claude Code: common workflows", "url": f"{CC}/common-workflows"},
    {"title": "Claude Code: CLI reference", "url": f"{CC}/cli-reference"},
   ],
  ),
  "the-verification-loop": entry(
   what="""The **verification loop** is: **give context → generate → inspect the Git diff → test → debug → review → accept**. You skip a step and you are vibe coding. The loop is the same whether the generator is you, a teammate, or an agent.

Context is the spec, the files, the test command. Generate is the edit. The **diff** is the first gate (scope, secrets, nonsense). **Test** is the second gate. **Debug** is a smaller loop inside. **Review** is the human sentence "I understand this". **Accept** is commit or merge.

The loop is per change, not per day. A 20-file generation is twenty chances to skip a step.""",
   why="""On the job this is how you stay fast without going sloppy. Interviewers will ask what you do after the model writes code. The junior answer is "run it". The senior answer is the loop in order: I look at the diff *before* I get attached to green tests that deleted the assertion.

This loop is the spine of the rest of M0.6. Commands, skills, hooks, and subagents exist to make steps of this loop cheaper, not to skip them.""",
   how="""Example: agent adds a unique constraint.

1. Context: failing test + "use a DB unique index, not a Python if".
2. Generate: agent edits model + migration + route.
3. Diff: you notice it also "cleaned up" logging. Revert that file.
4. Test: `uv run pytest` green.
5. Debug: if red, paste the failure, do not start a new feature.
6. Review: you can explain the race the unique index closes.
7. Accept: commit with a real message.

Hooks can run format and lint between 2 and 3. They do not replace 3 or 6.""",
   failures="""1. **Test before diff** and accept a deleted assertion.

2. **Accept because /docs looks good.**

3. **Skipping review** because CI is green.

4. **New feature mid-debug.**""",
   line="""Context, generate, diff, test, debug, review, accept. I look at the Git diff before I trust the tests, and I do not accept a change I cannot explain. Hooks help; they do not replace the loop.""",
   key_points=[
    "The loop: context → generate → diff → test → debug → review → accept.",
    "Diff before you get attached to a green suite.",
    "One change per loop; do not start a feature while debugging.",
    "Hooks cheapen steps; they do not skip review.",
    "Accept means you can explain it.",
    "Skipping a step is vibe coding.",
   ],
   questions=[
    q("recall", "Name the steps of the verification loop.", "Give context, generate, inspect the Git diff, test, debug, review, accept."),
    q("apply", "Why inspect the diff before celebrating green tests?", "Tests can be deleted or weakened. The diff is where you see a dropped assertion or a secret."),
    q("debug", "CI is green and you cannot explain a new helper. What step is missing?", "Review. Do not accept. Ask the agent or yourself to justify or delete the helper."),
    q("apply", "Where do format/lint hooks sit in the loop?", "After generate, before or with the diff. They do not replace test or review."),
    q("recall", "What is 'context' in the first step?", "The spec, the relevant files, the test command, and the constraints — not the entire monorepo."),
   ],
   links=[
    {"title": "Claude Code: best practices", "url": f"{CC}/best-practices"},
    {"title": "GitHub: reviewing a PR", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests"},
   ],
  ),
  "minimum-useful-context": entry(
   what="""An agent's **context window** is finite. Every file you dump in is a file it may attend to instead of the one that matters. **Minimum useful context** is the spec, the two or three files, the test, and the command — not the whole repository, not last week's chat, not a 400-line CLAUDE.md paste for a one-line fix.

Too little context and it invents APIs. Too much and it "helpfully" rewrites a neighbour. The skill is the cut.

Standing project facts belong in a project file (next topic). Task facts belong in the prompt. Do not mix a one-off experiment into the standing file.""",
   why="""On the job, people @-mention the entire `src/` and then wonder why the agent changed a payment module while adding a log line. Interviewers ask how you would brief an agent on a bug. They want a traceback, a file, a test name — not "here's the repo".

This is also cost and latency: more tokens, slower, more money, worse answers. The same idea as the Level 1 context-window module, applied to coding.""",
   how="""Bad: "Fix tickets, see the repo."

Good: "test_cursor in tests/test_tickets.py fails with this traceback. Only edit app/api/tickets.py. Do not change migrations. Run uv run pytest tests/test_tickets.py::test_cursor."

If the agent needs a second file, it can open it. You do not preload twenty.

When the task spans layers, list them: "You may edit tickets.py, schemas.py, and the existing test file." That is still a list, not a dump.

If you keep repeating the same architecture paragraph, it belongs in CLAUDE.md, not in every prompt.""",
   failures="""1. **@src** on a one-line fix.

2. **No files** so it invents names.

3. **Pasting a novel of chat history** that contradicts the spec.

4. **Putting a one-off experiment** into the standing project file.""",
   line="""I give the minimum that makes the task unambiguous: spec, relevant files, test command. I do not dump the repo. Standing facts go in the project file; this task stays in the prompt.""",
   key_points=[
    "The window is finite; extra files compete for attention.",
    "Minimum useful: spec, few files, test, command.",
    "Too little invents APIs; too much rewrites neighbours.",
    "Standing facts vs task facts.",
    "Let the agent open a second file if needed.",
    "Token dump is not thoroughness.",
   ],
   questions=[
    q("apply", "Brief an agent on a failing cursor test.", "Name the test, paste the traceback, list the one or two files it may edit, give the pytest command, list what is out of scope."),
    q("recall", "What happens if you dump the whole repository into context?", "The model attends to the wrong files, costs more, and often 'fixes' unrelated modules."),
    q("debug", "The agent rewrote payments.py while you asked for a log line on tickets. Cause?", "Too much context or an unbounded prompt. Restrict paths and revert payments.py."),
    q("apply", "Where do you put 'we use uv and pytest' so you stop typing it?", "In the project instruction file (CLAUDE.md), not in every task prompt."),
    q("recall", "What is minimum useful context?", "The smallest set of facts and files that makes the task unambiguous."),
   ],
   links=[
    {"title": "Claude Code: memory and CLAUDE.md", "url": f"{CC}/memory"},
    {"title": "Anthropic: context windows", "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"},
   ],
  ),
  "claude-md-as-project-memory": entry(
   what="""**CLAUDE.md** (or an equivalent project instruction file) is **standing memory**: architecture, conventions, commands, and how to test. It is loaded as durable context so you do not retype "we use uv, pytest, and Pydantic v2" every session. It is **not** the task. It is **not** a dump of every decision ever.

Good contents: how to run tests, where routes live, "do not invent migrations without alembic", code style pointers the linter does not cover, links to the real docs. Bad contents: a 2_000-line diary, secrets, a stale "we use pip".

Other agents have the same idea under other names. The durable parts are the facts, not the filename.""",
   why="""On the job this is how a new hire *and* an agent get the same briefing. Interviewers ask what you would put in one. They want commands and conventions, not a novel. They want to hear it is reviewed like code when the stack changes.

A stale CLAUDE.md is worse than none: the agent will `pip install` in a uv repo because you said so in 2024.

This file is also how you keep task prompts short (previous topic).""",
   how="""A useful skeleton:

```
# Tickets API
- Package: app/ (FastAPI). Tests: tests/.
- Install: uv sync --frozen. Test: uv run pytest.
- DB: Postgres, Alembic. Do not create_all in prod.
- Style: ruff. Do not hand-format.
- Do not commit .env. Do not add secrets to examples.
```

Update it in the PR that changes the command. Keep it under a couple of screens. Link out to ARCHITECTURE.md if you have one.

Do not put API keys here. Do not put the current ticket.""",
   failures="""1. **Stale commands.**

2. **Secrets.**

3. **A diary of every PR.**

4. **Task-specific notes** that should die with the branch.""",
   line="""CLAUDE.md is standing project memory: architecture, commands, conventions. I keep it short, reviewed, and secret-free. Task context stays in the prompt. A stale file is worse than no file.""",
   key_points=[
    "Standing facts, not the current task.",
    "Commands, layout, conventions the linter cannot say.",
    "Review it when the stack changes.",
    "No secrets, no novel.",
    "The idea transfers across agents; the filename may differ.",
    "Short file + links beats a dump.",
   ],
   questions=[
    q("recall", "What belongs in CLAUDE.md versus the task prompt?", "CLAUDE.md: how to install, test, where code lives, standing don'ts. Prompt: this bug, these files, this command."),
    q("apply", "Write four lines you would put in one for a uv FastAPI app.", "uv sync --frozen; uv run pytest; app/ is the package; no create_all in prod; do not commit .env."),
    q("debug", "The agent keeps running pip install -r. Why?", "The project file still says pip, or a tutorial in context said pip. Update CLAUDE.md and delete the stale line."),
    q("apply", "Should the current Jira ticket live in CLAUDE.md?", "No. It is task context. It will be wrong next week."),
    q("recall", "Why treat this file as reviewed code?", "Agents trust it. A wrong command or a leaked example key becomes everyone's mistake."),
   ],
   links=[
    {"title": "Claude Code: memory", "url": f"{CC}/memory"},
    {"title": "Claude Code: overview", "url": f"{CC}/overview"},
   ],
  ),
  "spec-driven-development-planning": entry(
   what="""**Spec-driven development** means you write the **requirement** and a short **specification** (inputs, outputs, errors, out of scope) and you **review a plan** before the agent edits the tree. The plan is a list of files and steps, not code. You say yes or no. Then implementation starts.

This is the opposite of "just start coding" with a model that is happy to generate 800 lines. The spec is also the seed of the tests.

A spec can be a paragraph. It must be checkable: "POST /tickets with a duplicate title returns 409 and the existing id".""",
   why="""On the job, planning is how you stop an agent from inventing a second framework. Interviewers ask how you would use an agent on a feature. The senior answer starts with a spec and a plan review, not with "I would tell it to build tickets".

They want to hear you reject a plan that includes a rewrite. That is the skill.

This is also faster: five minutes of spec saves an hour of revert.""",
   how="""Requirement: "Clients retry POST /tickets; we get duplicates."

Spec: "Require Idempotency-Key. Store key → first response. Replay on retry. 400 if missing. No new tables beyond idempotency_keys. Out of scope: changing GET."

Plan you demand first:

1. Add table + migration.
2. Dependency to read the header.
3. Route branch.
4. Tests for missing key, first create, replay.

You delete step 5 if it says "also refactor users". Then you let it implement. The tests in the spec become pytest names.""",
   failures="""1. **No spec**, only a vibe.

2. **Approving a plan you did not read.**

3. **Letting the plan include a rewrite.**

4. **Spec that cannot be tested** ("make it nicer").""",
   line="""I write a checkable spec and I review a file-level plan before the agent edits. I cut rewrite steps. The spec becomes the tests. Five minutes of plan beats an hour of revert.""",
   key_points=[
    "Requirement → spec → plan → then edits.",
    "A spec is checkable: inputs, outputs, errors, out of scope.",
    "Review the plan; reject extra rewrites.",
    "The spec seeds the tests.",
    "A paragraph is enough if it is precise.",
    "Do not skip plan review because the agent is fast.",
   ],
   questions=[
    q("apply", "Write a three-sentence spec for idempotent POST /tickets.", "Require Idempotency-Key; store the first response; replay it on reuse; 400 if the header is missing; do not change GET. Tests for those three cases."),
    q("recall", "What do you review before the agent edits?", "A plan: files and steps, not the full patch. Cut anything out of scope."),
    q("debug", "The plan includes 'migrate off FastAPI'. You asked for a header. What do you do?", "Reject that step. Restate out of scope. Do not negotiate a rewrite in a header task."),
    q("apply", "How does the spec become tests?", "Each checkable sentence becomes a pytest name: test_missing_key_is_400, test_replay_returns_same_id."),
    q("recall", "Why is 'make it nicer' a bad spec?", "It is not checkable. The agent can do anything and claim success."),
   ],
   links=[
    {"title": "Claude Code: best practices", "url": f"{CC}/best-practices"},
    {"title": "Claude Code: common workflows", "url": f"{CC}/common-workflows"},
   ],
  ),
  "slash-commands-skills": entry(
   what="""A **slash command** is a **named prompt** you used to retype: `/review`, `/test`, `/commit-msg`. A **Skill** is a reusable capability with **instructions, metadata, and examples** that the agent **loads when needed**, not every time. Commands are short and explicit. Skills are richer and gated.

Both exist so the good prompt is not trapped in your head or a chat scroll. They are versioned in the repo next to the code they talk about.

A skill that is always loaded is just a bloated CLAUDE.md. The point of "when needed" is the context window.""",
   why="""On the job, teams that do not save prompts get a different review quality depending on who typed. Interviewers may not know the product names; they want the idea: reusable, reviewed prompts. They want to hear you do not paste a 200-line review rubric every time.

This is also how you onboard: a new engineer runs `/review` and gets the team's bar.""",
   how="""Command `/test`: "Run uv run pytest -q and summarise failures with file:line. Do not edit unless I say fix."

Skill `review-api`: metadata says it applies when the diff touches `app/api`. Instructions: check response models, 4xx tests, no secrets. Examples: a good comment and a bad LGTM.

Store them in the repo (`.claude/commands`, skills folders — product-specific). Review changes to them like code.

Do not make a skill for a one-off. Do not make a command that is a whole architecture essay.""",
   failures="""1. **Unreviewed prompts** that encode a bad habit.

2. **Always-on skills** that fill the window.

3. **Commands that secretly edit** when you thought they only reported.

4. **Personal-only prompts** the team never sees.""",
   line="""Slash commands are named prompts; skills are richer packs that load when relevant. I keep them in the repo, short, and reviewed. I do not load everything every time.""",
   key_points=[
    "Commands = named prompts you used to retype.",
    "Skills = instructions + metadata + examples, loaded when needed.",
    "Store them in the repo; review them.",
    "Always-on skills waste the window.",
    "Say whether a command may edit.",
    "One-offs do not deserve a skill.",
   ],
   questions=[
    q("recall", "What is a Skill versus a slash command?", "A command is a named prompt you invoke. A Skill is a reusable pack with metadata that the agent can load only when the task matches."),
    q("apply", "What would you put in a /review command?", "The team's checklist: tests, secrets, response models, migrations. Say do not push or merge."),
    q("debug", "A 'review' skill is always in context and the agent ignores the task. Fix?", "Make it load only on review, or shrink it. Always-on prose crowds out the task."),
    q("apply", "Why put commands in the repo?", "So the team shares the bar and changes are reviewed. Personal chat prompts do not survive."),
    q("recall", "What metadata is for?", "To decide when to load the skill — paths, keywords — so it is not always present."),
   ],
   links=[
    {"title": "Claude Code: slash commands", "url": f"{CC}/slash-commands"},
    {"title": "Claude Code: skills", "url": f"{CC}/skills"},
   ],
  ),
  "skills-worth-building": entry(
   what="""Build skills for work you **repeat**: **code review**, **test generation**, **docs**, **refactoring**, and **repo-specific conventions** (how we name migrations, how we write error bodies). Do not build a skill for a one-off migration. Do not build a skill that tries to be the whole engineer.

Each skill should have a crisp trigger, a checklist, and an example of good output. A review skill that says "be thorough" is useless. A review skill that says "reject missing 4xx tests on new routes" is useful.

Repo-specific beats generic. The internet already has generic review prompts.""",
   why="""On the job, these five recur every week. Interviewers ask what you would automate. They want a short list tied to the team's pain, not a marketplace of 40 skills nobody loads.

They also want to hear what you would *not* automate: architecture decisions, secret approval, "is this the right product".""",
   how="""Worth it:

- **review-api**: new routes must have 401/422 tests and a response_model.
- **gen-test**: given a spec paragraph, draft pytest names and bodies; do not implement the feature.
- **docs-readme**: update the env table when Settings gains a field.
- **refactor-safe**: only extract a function if tests exist; run the tests.
- **conventions**: error body shape, request id header.

Not worth it: "design the system", "pick the database", "write any Python".

Version them when the convention changes. Delete unused skills; they still get discovered and confuse.""",
   failures="""1. **A kitchen-sink skill.**

2. **Skills that implement and review** in one breath.

3. **Never deleting** stale skills.

4. **Generic prompts** copied from the internet with no repo facts.""",
   line="""I build skills for review, tests, docs, safe refactors, and our conventions. Each one has a trigger and a checklist. I do not skill-wrap architecture or one-offs, and I delete stale ones.""",
   key_points=[
    "Repeat work: review, tests, docs, refactor, conventions.",
    "Crisp trigger and checklist, not 'be thorough'.",
    "Repo-specific beats generic.",
    "Do not combine implement + review in one skill.",
    "Delete unused skills.",
    "Do not automate product decisions.",
   ],
   questions=[
    q("apply", "Name five skills worth building on a FastAPI repo.", "API review, test generation from a spec, README/env table updates, safe extract-function refactors, and the error-body convention."),
    q("recall", "What should a useful review skill contain?", "A trigger (paths), a checklist of must-haves, and an example comment. Not 'look carefully'."),
    q("debug", "You have 30 skills and the agent picks the wrong one. What do you do?", "Delete or merge until the triggers are unique. Inventory is not value."),
    q("apply", "Why split 'generate tests' from 'implement'?", "So you can accept tests first and keep the agent honest. Combined, it can write tests that match a bad implementation."),
    q("recall", "What is a bad skill to build?", "A one-off, or 'be the architect', or a generic internet prompt with no repo facts."),
   ],
   links=[
    {"title": "Claude Code: skills", "url": f"{CC}/skills"},
    {"title": "Claude Code: best practices", "url": f"{CC}/best-practices"},
   ],
  ),
  "delegating-to-subagents": entry(
   what="""A **subagent** is a **separate context** with a **narrow job**: reviewer, tester, debugger, researcher. You delegate so the implementer does not grade its own homework in the same window. Each subagent has its own instructions and sees what you give it, not the whole parent chat by default.

This is isolation, not magic parallelism. The parent still owns the merge of results. A reviewer subagent that only sees the diff is more honest than an implementer who is asked "and also review yourself".

Too many subagents is theatre. Two or three roles is plenty.""",
   why="""On the job, self-review is weak — human or model. Interviewers may ask how you would structure an agent team. The senior answer: implementer implements, a second context reviews against a checklist, a third runs tests if that is expensive. You read the review.

They want to hear that you do not force one context to be architect, coder, and auditor.""",
   how="""Parent: "Implement the spec on a branch."

Tester subagent: given the test command, report failures only.

Reviewer subagent: given the diff and the review skill, return blocking comments. No edits.

Debugger: given one traceback, minimal patch.

You apply or discard. You do not auto-merge because three agents agreed — they can agree on a secret.

Keep the reviewer read-only if the product allows it.""",
   failures="""1. **One agent, all roles.**

2. **Reviewer that can also edit** and "fixes" by deleting tests.

3. **Five subagents** on a one-file change.

4. **Accepting consensus** without a human.""",
   line="""I delegate review, test, and debug to separate contexts so the implementer is not the auditor. I still read the output. Two or three roles beat a crowd. Consensus of models is not a merge.""",
   key_points=[
    "A subagent is a narrow job in a separate context.",
    "Do not let the implementer be the only reviewer.",
    "Parent merges results; humans accept.",
    "Read-only reviewer is safer.",
    "Two or three roles, not a crowd.",
    "Model consensus is not approval.",
   ],
   questions=[
    q("recall", "Why delegate review to a subagent?", "A separate context with a checklist is less likely to justify its own (or the implementer's) shortcuts. Isolation is the point."),
    q("apply", "What do you give a reviewer subagent?", "The diff, the review skill, and no write permission if possible. Not the original 'please be nice' chat."),
    q("debug", "Three subagents approved a PR that contains a key. What failed?", "No human and no secret scan. Delegation does not replace hooks or you."),
    q("apply", "When is a debugger subagent useful?", "When the implementer is stuck looping. A fresh context with only the traceback often finds the small fix."),
    q("recall", "What is a sign you have too many subagents?", "A one-file change with a researcher, architect, coder, reviewer, and scribe. Theatre."),
   ],
   links=[
    {"title": "Claude Code: sub-agents", "url": f"{CC}/sub-agents"},
    {"title": "Claude Code: overview", "url": f"{CC}/overview"},
   ],
  ),
  "external-systems-through-mcp": entry(
   what="""**MCP (Model Context Protocol)** is a standard way to connect an agent to **systems outside the repo**: databases, HTTP APIs, issue trackers, documentation browsers. The agent gets **tools** (query, fetch, list) from an MCP server you run or install. It is not a replacement for your app's own API. It is how the **coding agent** sees those systems at development time.

A database MCP can `SELECT` (hopefully read-only). A docs MCP can fetch a page. You still decide what is allowed. A write-capable MCP on production is a weapon.

MCP is plumbing. The durable skill is: give the agent a **narrow, audited tool** instead of pasting dumps into the prompt.""",
   why="""On the job, people paste prod rows into chat. MCP can be better or worse: better if it is read-only staging; worse if it can `DROP`. Interviewers want the name and the risk. They want: I would connect docs and a staging DB with SELECT-only, not production writes.

They may ask why not just give the agent a shell. A shell can do anything. MCP can be scoped.

This will show up in later levels as tool use for *products*. Here it is for *the engineer*.""",
   how="""Example: docs server so the agent can fetch FastAPI's testing page instead of inventing TestClient APIs. Example: a staging-only Postgres server with a read-only role.

Configure the client to those servers. Put the allow-list in the project file. Do not point at production.

If a tool returns a secret, treat it as a leak. Redact. The model will happily echo it into a file.

Prefer fetch-a-page over "browse the internet" when you know the URL.""",
   failures="""1. **Write access to production.**

2. **Pasting prod data** because MCP was not set up — still a leak.

3. **Unscoped tools** that can hit any URL (SSRF).

4. **Trusting fetched docs** that are the wrong version.""",
   line="""MCP connects the agent to outside systems through scoped tools. I use it for docs and read-only staging, never for prod writes. A narrow tool beats pasting dumps — and beats an unscoped shell.""",
   key_points=[
    "MCP is a protocol for agent tools to external systems.",
    "Scope: read-only staging, docs, not prod writes.",
    "Narrow tools beat an unscoped shell.",
    "Fetched text is untrusted; versions matter.",
    "Do not echo secrets from a tool into the repo.",
    "This is for the engineer; product tool use is a later level.",
   ],
   questions=[
    q("recall", "What is MCP for in a coding agent?", "Connecting the agent to external systems (docs, DBs, APIs) through a standard tool interface, instead of pasting dumps."),
    q("apply", "Which MCP connections would you allow on a work laptop?", "Internal docs, a read-only staging database, maybe a ticket system. Not production writes, not arbitrary URL fetch without an allow-list."),
    q("debug", "The agent truncated a table via MCP. What was misconfigured?", "A write-capable database tool pointed at a real environment. Use a read-only role and a non-prod target."),
    q("apply", "Why not give the agent only a shell?", "A shell is the widest tool. MCP can grant one verb on one system. Prefer the narrow grant."),
    q("recall", "Why is fetched documentation still untrusted?", "Wrong version, wrong product, or a page that contradicts your repo. Verify against the code you actually run."),
   ],
   links=[
    {"title": "Model Context Protocol docs", "url": MCP},
    {"title": "Claude Code: MCP", "url": f"{CC}/mcp"},
   ],
  ),
  "hooks-for-deterministic-checks": entry(
   what="""A **hook** runs a **deterministic program** at a lifecycle point: before a commit, after the agent edits, before a prompt is sent. Formatters, linters, testers, secret scanners. The model does not "remember" to run ruff. The hook runs ruff.

This is the same idea as git hooks, now also in the agent product. The point is **non-negotiable checks**. If ruff fails, the loop stops. You do not ask the model "please format".

Hooks should be fast enough to run often. A 10-minute integration suite is CI, not a save-hook.""",
   why="""On the job, "the agent forgot to format" is a process bug. Interviewers want to hear you push checks into hooks and CI, not into prompts. They want examples: ruff, pytest on touched tests, gitleaks.

They will ask what you would not put in a hook (full deploy, anything that needs a secret you do not have locally).

This is how you keep the verification loop honest when you are tired.""",
   how="""Agent stop-hook: `uv run ruff check --fix . && uv run ruff format`. Fail the stop if it cannot fix.

Pre-commit: ruff, a secret scanner, maybe `uv lock --check`.

CI: the same plus pytest. Do not have three different ruff versions.

The project file can *mention* the hook; the hook is the enforcement. Prompts that say "always run ruff" are hints, not controls.""",
   failures="""1. **Prompt-only enforcement.**

2. **A hook that takes minutes** so everyone skips it.

3. **Different checks locally and in CI.**

4. **A hook that auto-commits** without a human.""",
   line="""Hooks run ruff, tests, and secret scans so the model does not have to remember. Deterministic checks belong in hooks and CI, not in a polite prompt. Keep them fast; keep them the same everywhere.""",
   key_points=[
    "Hooks are programs; they do not forget.",
    "Format, lint, secrets, fast tests.",
    "Prompts are hints; hooks are controls.",
    "Same checks locally and in CI.",
    "Slow suites stay in CI.",
    "Do not auto-commit from a hook without a human.",
   ],
   questions=[
    q("recall", "Why use a hook instead of asking the model to format?", "Formatting is deterministic. A hook always runs. A model sometimes forgets or half-formats."),
    q("apply", "Which checks belong in an agent stop-hook versus CI?", "Hook: ruff, maybe a tiny pytest. CI: full pytest, typecheck, secret scan, build. Do not duplicate a 10-minute suite on every edit."),
    q("debug", "Local hooks pass and CI fails ruff. Cause?", "Different versions or configs. Pin ruff in the lock and use the same command."),
    q("apply", "What hook would have caught a committed .env?", "A secret scanner on pre-commit and in CI. gitignore alone is not enough if someone force-adds."),
    q("recall", "Are hooks a replacement for review?", "No. They cheapen the verification loop. They do not read the product intent."),
   ],
   links=[
    {"title": "Claude Code: hooks", "url": f"{CC}/hooks"},
    {"title": "pre-commit", "url": "https://pre-commit.com/"},
   ],
  ),
  "plugins-as-capability-bundles": entry(
   what="""A **plugin** (in agent products that have them) is a **bundle**: commands, skills, hooks, subagents, and integrations packed together. You install one unit and get a consistent workflow — for example a "Python API" plugin with `/test`, a review skill, a ruff hook, and a docs MCP.

The value is **distribution and versioning**. A team can share one bundle instead of five loose files that drift. The risk is **opacity**: a plugin can add a hook you did not read.

Treat a plugin like a dependency. Pin it. Read what it runs. Do not install random bundles from the internet on a repo with secrets.""",
   why="""On the job this is how a platform team rolls out a standard. Interviewers may not use the word plugin; they will understand "a packaged set of commands and hooks". They want you to say you review that package like you review a GitHub Action.

They want the caution: more capability is more attack surface.""",
   how="""A sane bundle for this repo: ruff hook, `/test` command, API review skill, no production MCP.

Install via the product's pin file. Review the pin in the PR. When the bundle updates, read the changelog the way you read a GitHub Action update.

If you only need one hook, you may not need a plugin. Do not add a bundle for status.""",
   failures="""1. **Unpinned plugins** that change under you.

2. **A bundle with a write MCP** you did not notice.

3. **Installing from a random gist.**

4. **Duplicating** the bundle and the local hook so they fight.""",
   line="""A plugin bundles commands, skills, hooks and integrations. I treat it like a dependency: pin it, read what it runs, and skip it if I only need one hook. More capability is more surface.""",
   key_points=[
    "Plugin = packaged commands, skills, hooks, agents, integrations.",
    "Useful for team-standard workflows.",
    "Pin and review like a GitHub Action.",
    "Read the hooks and MCPs it adds.",
    "Do not install random bundles on secret-bearing repos.",
    "Smaller is better; skip the bundle if one hook is enough.",
   ],
   questions=[
    q("recall", "What does a plugin package together?", "Some mix of commands, skills, hooks, subagents, and integrations, distributed as one unit."),
    q("apply", "How do you review a plugin the way you review a GitHub Action?", "Read what programs it runs, what network it can hit, pin the version, and review upgrades in a PR."),
    q("debug", "After installing a bundle, the agent can write to staging. Why?", "The plugin added an MCP or hook you did not read. Audit the bundle's tools and remove write access."),
    q("apply", "When would you skip a plugin?", "When you need a single hook or command. A bundle is extra surface."),
    q("recall", "Why pin plugin versions?", "So a silent upgrade cannot change hooks or add tools under you."),
   ],
   links=[
    {"title": "Claude Code: plugins", "url": f"{CC}/plugins"},
    {"title": "Claude Code: hooks", "url": f"{CC}/hooks"},
   ],
  ),
  "skills-that-transfer-across-agents": entry(
   what="""Claude Code, Codex, Cursor, Copilot, Gemini CLI — the **brands** change. The **durable skills** do not: **context** (minimum useful), **specifications**, **planning**, **delegation**, **automation** (hooks), and **verification** (diff, test, review). If you only learn a slash-command syntax you will reset every six months.

Transfer means you can sit down in a new IDE and still write a spec, still restrict files, still run the test, still read the diff. The product tutorial is a thin layer.

This is the point of the whole module. The tools are examples. The loop is the skill.""",
   why="""On the job you will switch tools when the company does. Interviewers may ask "we use X, not Y — does that matter?". The senior answer is no, and then you name the six durables. The junior answer is a feature tour of last month's blog.

This is also how you stay employable in a noisy market.""",
   how="""When you try a new agent, map the durables on day one:

- Where do I put standing memory?
- How do I restrict paths?
- How do I run a command?
- Is there a hook on stop?
- How do I see the diff?

Then do one small task with the verification loop. Do not spend a week on theme packs.

Write your skills in plain markdown in the repo so more than one product can read them, even if only as pasted commands.""",
   failures="""1. **Identity tied to one product.**

2. **Collecting plugins** instead of practising the loop.

3. **Skipping verification** because the new tool "is better".

4. **Repo docs that only work** with one vendor's filename.""",
   line="""The durable parts are context, spec, plan, delegation, automation and verification. I can move those to any coding agent. The brand is a UI. I do not skip the loop because the tool is new.""",
   key_points=[
    "Brands change; the loop does not.",
    "Durables: context, spec, plan, delegation, hooks, verification.",
    "Map those on day one in a new tool.",
    "Keep repo instructions in plain markdown.",
    "Do not skip review because the UI is slick.",
    "This module's point is transfer, not a vendor.",
   ],
   questions=[
    q("recall", "Which skills transfer across coding agents?", "Minimum useful context, specs, planning, delegation, deterministic hooks, and the verify-the-diff loop."),
    q("apply", "You must switch from tool A to tool B this week. What do you learn first?", "Where standing memory goes, how to restrict files, how to run tests, how to see the diff. Then do one small loop."),
    q("debug", "A candidate can only describe one vendor's slash commands. What are they missing?", "The durables. Ask them to spec and verify a change without the brand names."),
    q("apply", "How do you write project instructions that survive a tool change?", "Plain markdown in the repo: commands, layout, don'ts. Product-specific files can include it or point to it."),
    q("recall", "Why is verification listed as durable?", "Every tool can generate wrong code. Diff, test and review are not a feature; they are the job."),
   ],
   links=[
    {"title": "Claude Code: overview", "url": f"{CC}/overview"},
    {"title": "GitHub Copilot: about", "url": "https://docs.github.com/en/copilot/about-github-copilot"},
   ],
  ),
  "reviewing-ai-generated-diffs": entry(
   what="""Treat model output as an **untrusted pull request**. Before merge you check **tests**, **secrets**, and **edge cases** the same way you would for a stranger. The author being a model is a reason to read *harder*: invented APIs, deleted assertions, `.env` files, "helpful" refactors, license-incompatible snippets.

`git diff` is the artefact. /docs looking good is not. A green suite that the model also wrote is not enough unless you read the tests.

This is the verification loop's review step, written as a habit for generated code.""",
   why="""On the job this is the new default: a large fraction of lines will be generated. Interviewers will ask what you look for. They want secrets, tests, scope creep, and a sentence you can say about the change. They want you to have rejected a diff.

Security teams already assume AI PRs are hostile until reviewed. Join them.""",
   how="""Checklist on every generated diff:

1. Scope: only the files you asked for?
2. Secrets: keys, tokens, connection strings, prod hosts?
3. Tests: did it delete or weaken any? Are empty and error paths covered?
4. Invented APIs: do the imports exist?
5. Data: injection, missing auth, client-supplied user_id?
6. Can you explain the change in 30 seconds?

If 6 fails, do not merge. Ask for a smaller diff or write it yourself.

Use `git add -p` so you do not stage a drive-by file.""",
   failures="""1. **LGTM because it ran.**

2. **Not opening every file** in the diff.

3. **Trusting tests the model wrote** without reading them.

4. **Staging with git add .**""",
   line="""A generated diff is an untrusted PR. I check scope, secrets, tests, invented APIs and whether I can explain it. If I cannot explain it I do not merge it. git add -p, not git add .""",
   key_points=[
    "Generated code is untrusted until reviewed.",
    "Check scope, secrets, tests, invented APIs, auth.",
    "Read the tests the model wrote.",
    "Explain-it-or-reject.",
    "git add -p to avoid drive-bys.",
    "Green CI is not a review.",
   ],
   questions=[
    q("apply", "What do you look for in an AI-generated diff before merge?", "Scope, secrets, weakened tests, invented imports, auth/injection, and whether you can explain the change."),
    q("debug", "The suite is green but test_missing_label now asserts True. What happened?", "The model 'fixed' the test. Reject. Restore the assertion."),
    q("apply", "Why use git add -p on generated work?", "So a drive-by file or a secret is not staged just because it is in the tree."),
    q("recall", "Why is generated code less trusted than a teammate's?", "It invents APIs, has no reputation, and will delete tests to go green. Review harder, not lighter."),
    q("apply", "The diff includes a 'small refactor' you did not ask for. What do you do?", "Revert that part. Ask for a separate PR if the refactor is real. Do not merge a surprise."),
   ],
   links=[
    {"title": "GitHub: reviewing changes", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests"},
    {"title": "git add --patch", "url": "https://git-scm.com/docs/git-add#Documentation/git-add.txt--p"},
   ],
  ),
  "prompting-the-assistant-with-failing-tests": entry(
   what="""When you ask a model to fix a failure, give it the **traceback** and the **intended assertion**, not a vague "fix it". The test name, the expected versus actual, and the command to rerun are the spec. Vague prompts produce vague rewrites.

This is the debug job with a sharp interface. The failing test is already the spec you should have written. Use it.

If there is no test, write the assertion first — even a one-liner — then paste that. Do not let the model invent the behaviour.""",
   why="""On the job, "fix the tests" without a paste is how you get a deleted test. Interviewers will ask how you prompt on a red CI. They want the traceback in the prompt and "do not change the assertion".

This is also the fastest loop: the model does not hunt. You already isolated the unit.""",
   how="""Bad: "Tests are failing, please fix."

Good:

```
uv run pytest tests/test_tickets.py::test_empty_ticket_returns_other
AssertionError: assert None == 'other'
Traceback: ... last frame in label_of ...
Do not change the test. Make empty tickets return 'other'.
Re-run the same command.
```

If it fails again, paste the new traceback. Do not add a second feature.

If the assertion is wrong, you change the test in a separate, explained step — not the agent silently.""",
   failures="""1. **"Fix it"** with no error.

2. **Allowing the test to change** without saying so.

3. **Pasting 400 failing tests** at once.

4. **Changing the product** in the same breath as the fix.""",
   line="""I prompt with the traceback, the assertion, and the command. I say do not change the test. One failure at a time. The test is the spec; the model is the typist.""",
   key_points=[
    "Paste traceback + expected versus actual + command.",
    "Forbid silent test changes.",
    "One failure at a time.",
    "Write the assertion first if it does not exist.",
    "Do not mix a feature into a fix prompt.",
    "'Fix it' is not a spec.",
   ],
   questions=[
    q("apply", "Write a good fix-it prompt for a failing pytest.", "Include the command, the assertion error, the last traceback frames, the intended behaviour, and 'do not change the test'."),
    q("recall", "Why is 'fix the tests' a bad prompt?", "It permits deleting or weakening tests. It also does not say which failure or what correct means."),
    q("debug", "The agent made CI green by changing expected from 'other' to None. What do you do?", "Revert the test, restate the assertion as the spec, and ask for a production-code fix only."),
    q("apply", "There is no test, only a production 500. What do you send the agent?", "A new failing test (or a snippet) that reproduces the 500, then the traceback. Do not start with 'make 500s go away'."),
    q("recall", "How many failures do you put in one prompt?", "One, or a tight cluster with the same cause. A wall of 400 failures invites a rewrite."),
   ],
   links=[
    {"title": "pytest: asserting with the -q output", "url": "https://docs.pytest.org/en/stable/how-to/assert.html"},
    {"title": "Claude Code: common workflows", "url": f"{CC}/common-workflows"},
   ],
  ),
 }
}
