from helper import entry, q

GIT = "https://git-scm.com"

NOTES = {
 "m0-5": {
  "repos-commits-branches-remotes": entry(
   what="""A **repository** is the project plus its history. A **commit** is a snapshot with a message, author, and parent. A **branch** is a movable name for a commit (usually `main` plus your feature branch). A **remote** is another copy, typically `origin` on GitHub/GitLab. A **diff** is the change between two snapshots. The **staging area** (index) is what will go into the next commit: `git add` copies changes there.

Working tree ≠ index ≠ HEAD. You can change a file, add only part of it, and commit that part. `git status` and `git diff` / `git diff --staged` show the three states.

Git is distributed: you have the full history locally. Push and pull move commits to and from remotes.""",
   why="""On the job, every review, revert, and blame assumes you understand these objects. People who commit the whole working tree including secrets, or who work only on `main`, create the incidents this module is about.

Interviewers ask what a commit is, what `add` does, and what a remote is. They ask the difference between `diff` and `diff --staged`. They may ask what happens if two people push (a rejected non-fast-forward). This is table stakes; fumbling it ends a backend interview early.

AI work does not change Git. Agents produce diffs you still have to stage on purpose.""",
   how="""```
git status
git diff                 # working tree vs index
git add app/api/routes.py
git diff --staged        # index vs HEAD
git commit -m "Add ticket list cursor"
git push -u origin HEAD
```

Create a branch before the work: `git switch -c feat/ticket-cursor`. The remote branch appears on first push.

Look at history: `git log --oneline --graph`. Look at a commit: `git show SHA`.

Do not `git add .` as a reflex. List what you staged.""",
   failures="""1. **Working on main** and pushing broken snapshots.

2. **git add .** that stages .env and a notebook full of outputs.

3. **Confusing unstaged and staged** when the commit "missed a file".

4. **No remote** so the only copy is a laptop.""",
   line="""A commit is a snapshot, a branch is a name, a remote is another copy, and the index is what I choose to snapshot next. I read status and both diffs before I commit. I do not add the whole tree by reflex.""",
   key_points=[
    "Working tree, index, and HEAD are three different states.",
    "git add stages; git commit snapshots the index.",
    "A branch is a movable pointer to a commit.",
    "A remote is another repository you push and pull.",
    "diff is unstaged; diff --staged is the next commit.",
    "Do not git add . without reading status.",
   ],
   questions=[
    q("recall", "What is the staging area for?", "It is the index: the exact set of changes the next commit will contain. add copies from the working tree into it."),
    q("apply", "How do you see what will be in the next commit versus what is still loose?", "git diff --staged for the commit; git diff for unstaged work; git status for the summary."),
    q("debug", "You committed but the file change is not in the commit. What happened?", "You never staged it. The working tree had the edit; the index did not."),
    q("recall", "What is a remote?", "A named URL of another repository, usually origin. push sends commits there; fetch/pull brings commits here."),
    q("apply", "Why create a branch before you start the work?", "So main stays releasable and the review has a name. You can open a pull request from that branch."),
   ],
   links=[
    {"title": "Git book: Git basics", "url": f"{GIT}/book/en/v2/Git-Basics-Getting-a-Git-Repository"},
    {"title": "git status", "url": f"{GIT}/docs/git-status"},
   ],
  ),
  "the-branch-pr-merge-workflow": entry(
   what="""The default team workflow is: **branch** from an up-to-date `main`, **make changes**, **commit** in logical chunks, **push** the branch, open a **pull request** (merge request), take **review**, then **merge**. CI runs on the PR. `main` is the releasable line.

A PR is a conversation plus a diff. The description says why. The commits say what. Reviewers comment on the diff. You push more commits (or fixup) until approval. Merge is merge-commit, squash, or rebase — the team picks one and sticks to it.

You do not develop on `main`. You do not merge your own PR without the agreed checks if the branch is protected.""",
   why="""On the job this is how you ship without stepping on each other. A PR is also the audit trail: why this changed, who said yes. AI-generated diffs go through the same gate.

Interviewers ask you to narrate the workflow. They ask what you put in the PR body (why, test plan, screenshots if UI). They ask what "protected main" means (no direct push, required reviews, required CI). Missing this workflow is a signal you have only worked alone.

They may ask squash versus merge commit: squash keeps main linear; merge preserves branch history. Either is fine if consistent.""",
   how="""```
git switch main && git pull
git switch -c feat/idempotency-key
# ... commits ...
git push -u origin HEAD
# open PR, wait CI, address review
```

After review: merge via the host. Locally: `git switch main && git pull`. Delete the feature branch.

If main moved, update the PR: `git fetch && git rebase origin/main` (or merge main), then force-with-lease if you rebased a branch only you use.

PR body: problem, approach, how you tested, anything you did not do.""",
   failures="""1. **Direct commits to main.**

2. **Empty PR description.**

3. **Merging red CI.**

4. **Rewriting a branch others are using** without saying so.""",
   line="""Branch, commit, push, pull request, review, merge. main stays releasable. The PR explains why and how I tested. I do not push to main and I do not merge red CI.""",
   key_points=[
    "Feature branch off current main, never daily work on main.",
    "PR = diff + why + test plan + review.",
    "CI must be green; protected main blocks direct pushes.",
    "Pick merge, squash, or rebase and stay consistent.",
    "Update the branch if main moved before merge.",
    "Delete the feature branch after merge.",
   ],
   questions=[
    q("recall", "Walk the branch → PR → merge workflow.", "Update main, branch, commit, push, open a PR with why and a test plan, pass CI and review, merge, pull main, delete the branch."),
    q("apply", "What do you put in a PR description?", "The problem, the approach, how you tested, and known gaps. Not a dump of commit subjects only."),
    q("debug", "Your PR is 400 files including lockfile noise and a secret. What should have happened?", "Smaller commits, a reviewed status before push, and a pre-commit hook for secrets. Split or redo the PR."),
    q("apply", "main moved while you worked. How do you update the PR?", "fetch, rebase (or merge) onto origin/main, resolve conflicts, push (force-with-lease if you rebased a private branch)."),
    q("recall", "What does a protected main branch enforce?", "No direct pushes, required reviews, and required green CI before merge."),
   ],
   links=[
    {"title": "GitHub: about pull requests", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests"},
    {"title": "Git book: branching", "url": f"{GIT}/book/en/v2/Git-Branching-Basic-Branching-and-Merging"},
   ],
  ),
  "commit-messages-history": entry(
   what="""A **commit message** explains **why** the snapshot exists. The subject is an imperative line (`Add cursor pagination to ticket list`). The body, when needed, is context: the bug, the constraint, the follow-up. History is `git log`, `git show`, `git blame`, and the host's UI.

Useful history is how you debug in six months. `fix` and `wip` and `asdf` are not history. Squash-on-merge can hide a messy branch; that is a team choice. On a shared branch, write messages as if they will land on main.

`git log -p` shows patches. `git blame` shows the last commit that touched a line — then you read that commit's message.""",
   why="""On the job, blame without a good message is a dead end. You see a line and a name and still do not know why the timeout is 17 seconds. Interviewers will show a log of `fix`/`fix2` and ask what they would prefer. They may ask you to write a message for a given diff.

Conventional Commits (`feat:`, `fix:`) are optional. Clarity is not. AI-generated messages that restate the diff ("updated file") waste the slot; edit them.

This is also how you write a revert: the revert message points at the original sha and why it is coming out.""",
   how="""```
Add Idempotency-Key support on POST /tickets

Retries after a gateway timeout were creating duplicate
tickets. Store the key with the first response and replay it.

Tested with two identical curls; second returns the same id.
```

Inspect:

```
git log --oneline -20
git show 3fa1c2
git blame app/api/routes.py
```

Amend only if the commit is not pushed or you are sure you will force-with-lease a private branch: `git commit --amend`. Do not amend shared history.""",
   failures="""1. **Empty or "wip" messages** on main.

2. **Restating the diff** ("changed routes.py").

3. **Amending a commit others pulled.**

4. **One 40-file commit** with a one-word message.""",
   line="""A commit message is why, in imperative voice, with a body when the diff is not obvious. I use log, show and blame to read history. I do not amend commits other people already have.""",
   key_points=[
    "Subject: imperative why, not a file list.",
    "Body when the reason is not obvious from the diff.",
    "log / show / blame are how you read history.",
    "Do not amend published commits.",
    "Edit AI-generated messages that only restate the patch.",
    "Revert messages point at the sha and the reason.",
   ],
   questions=[
    q("apply", "Write a commit message for adding an Idempotency-Key.", "Subject: Add Idempotency-Key on POST /tickets. Body: retries were duplicating rows; we store the key and replay the first response."),
    q("recall", "What is git blame good for?", "Finding the commit that last changed a line so you can read that commit's message and diff — not for blaming a person."),
    q("debug", "A teammate amended a commit you already based work on. What happened?", "Your history diverged. You will need a rebase or reset conversation. That is why we do not amend shared commits."),
    q("apply", "When is a one-line message enough?", "When the subject fully states the why and the diff is small and obvious. Otherwise add a body."),
    q("recall", "What does git show SHA print?", "The commit metadata, message, and the full patch."),
   ],
   links=[
    {"title": "Git book: viewing history", "url": f"{GIT}/book/en/v2/Git-Basics-Viewing-the-Commit-History"},
    {"title": "git commit", "url": f"{GIT}/docs/git-commit"},
   ],
  ),
  "resolving-merge-conflicts": entry(
   what="""A **merge conflict** means Git cannot automatically combine two changes to the same region. It marks the file with `<<<<<<<`, `=======`, `>>>>>>>`. You **edit** the file into the intended result, `git add` it, and continue the merge or rebase. Conflict is a data problem, not a moral failure.

Conflicts happen on merge, rebase, cherry-pick, and stash pop. You read both sides and the surrounding code. You do not blindly keep "ours" or "theirs" unless you understand the words.

Binary files and lockfiles need a policy: regenerate `uv.lock` rather than hand-merging noise when that is safe; do not regenerate a handwritten migration away.""",
   why="""On the job, people who fear conflicts rebase into knots or force-push. People who resolve them read the code and ship. Interviewers may give you a conflicted snippet and ask which side to keep. They want the reasoning, not a Git flag.

They also ask how you reduce conflicts: small PRs, frequent rebase onto main, not formatting the whole file in a feature PR.

Avoiding conflicts by sitting on a week-old branch is how you get a 40-file conflict on Friday.""",
   how="""```
git switch feat/x
git fetch
git rebase origin/main
# conflict in app/api/routes.py
```

Open the file. Read both hunks. Produce the correct function (often a mix). Then:

```
git add app/api/routes.py
git rebase --continue
```

`git status` tells you what is left. `git diff` shows your resolution. Tests run before you push.

If you are lost: `git rebase --abort` or `git merge --abort` and start over. That is allowed.""",
   failures="""1. **Leaving conflict markers** in the file and committing them.

2. **Always -X ours** without reading.

3. **Hand-merging a generated lockfile** into nonsense; regenerate instead.

4. **Continuing with failing tests.**""",
   line="""A conflict means two edits touched the same lines. I read both sides, write the correct result, add the file, and continue. I abort if I am lost. I do not commit conflict markers and I do not blindly keep ours.""",
   key_points=[
    "Markers show both sides; you edit to the intended code.",
    "add the resolved file and continue the merge/rebase.",
    "abort is a valid escape.",
    "Regenerate lockfiles when that is the policy; do not invent a hybrid.",
    "Small, current branches conflict less.",
    "Never commit leftover <<<<<<< markers.",
   ],
   questions=[
    q("apply", "You rebased onto main and routes.py conflicts. What are the steps?", "Open the file, remove markers, keep the correct combined code, git add, git rebase --continue, run tests. Abort if you are unsure."),
    q("recall", "What do the conflict markers mean?", "<<<<<<< is one side, >>>>>>> is the other, ======= splits them. All of those lines must be gone when you finish."),
    q("debug", "CI fails on a syntax error after a merge. First look?", "Search for leftover conflict markers. That is the usual cause."),
    q("apply", "How do you reduce how often you see conflicts?", "Small PRs, rebase or merge main often, do not reformat unrelated files."),
    q("recall", "When is git rebase --abort the right move?", "When the resolution is messy and you want a clean retry, or you meant to merge instead."),
   ],
   links=[
    {"title": "Git book: basic merge conflicts", "url": f"{GIT}/book/en/v2/Git-Branching-Basic-Branching-and-Merging"},
    {"title": "git rebase", "url": f"{GIT}/docs/git-rebase"},
   ],
  ),
  "keeping-secrets-out-with-gitignore": entry(
   what="""**`.gitignore`** is a list of patterns Git will not track: virtualenvs, `__pycache__`, build artefacts, `.env`, editor folders, model weights, local config. It does **not** untrack a file that is already committed — you must `git rm --cached` that.

Secrets belong in the environment, not in the tree. A `.env.example` with names and fake values is fine. `.env` is not. Pre-commit hooks (`gitleaks`, `detect-secrets`) catch accidents. History is forever until you rewrite it, which is painful on a shared repo.

Generated files that every machine can reproduce (`.venv`, `node_modules`, `__pycache__`) also belong in gitignore. The lockfile does **not**.""",
   why="""On the job, the secret-in-git incident is common and expensive. Interviewers ask what you put in gitignore and how you remove a committed `.env` (rm cached, rotate the secrets, consider history). They ask why `uv.lock` is committed while `.venv` is not.

They may ask about `.env` versus platform secrets. Same rule as the database module. This is the Git half of that rule.

A repo without a gitignore is a first-PR comment.""",
   how="""Typical Python API:

```
.venv/
__pycache__/
.pytest_cache/
.mypy_cache/
.env
*.pyc
dist/
.coverage
```

Already committed `.env`:

```
git rm --cached .env
# add to .gitignore
# commit
# rotate every secret that was in the file
```

Add a secret scan to CI. Do not use `git add -f .env` "just once".

Large model files: Git LFS or an object store, not a 4 GB commit.""",
   failures="""1. **Committed .env** then "deleted" it without rotating.

2. **Ignoring uv.lock.**

3. **Tracking .venv.**

4. **force-add of a secret** to "make the demo work".""",
   line="""gitignore keeps venvs, caches and .env out of the tree. It does not remove what you already committed — rm --cached and rotate. I commit the lockfile. I never force-add a secret.""",
   key_points=[
    "gitignore prevents new untracked files from being added.",
    "Already-tracked secrets need git rm --cached plus rotation.",
    "Ignore .venv and .env; commit uv.lock and pyproject.toml.",
    "Scan CI for secrets.",
    "Do not git add -f a secret.",
    "Huge weights do not belong in ordinary git.",
   ],
   questions=[
    q("recall", "Does adding .env to gitignore remove it from history?", "No. It only stops new adds. Remove it from the tree with git rm --cached and rotate, then consider history rewrite if policy requires."),
    q("apply", "What belongs in gitignore for a uv + FastAPI app?", ".venv, __pycache__, .env, pytest/mypy caches, dist. Not uv.lock or the app source."),
    q("debug", "A teammate committed AWS keys in .env two weeks ago and then deleted the file. Are you safe?", "No. History still has the keys. Rotate them now. Treat the repo as leaked."),
    q("apply", "Why commit uv.lock but ignore .venv?", "The lock is a reviewed text file that makes installs reproducible. The venv is a machine-specific tree of binaries."),
    q("recall", "What is git rm --cached for?", "Stop tracking a file but leave it on disk — the usual step after you gitignored a file that was committed by mistake."),
   ],
   links=[
    {"title": "git ignore documentation", "url": f"{GIT}/docs/gitignore"},
    {"title": "GitHub: removing sensitive data", "url": "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository"},
   ],
  ),
  "writing-a-readme": entry(
   what="""A **README** is the first file a human or an agent reads. It says **what the project is**, **how to install**, **how to configure**, **how to run**, **how to test**, and **how to call the API**. It is not a marketing page. It is the runbook for a cold start.

Include: purpose in two sentences, prerequisites (Python version, Docker, uv), `uv sync`, env var table, `uv run pytest`, `uv run fastapi dev`, example curl, where the docs live (`/docs`), and how to migrate the database. Link to the real docs if they exist; do not paste a novel.

A README that says "clone and run" with no versions is a trap.""",
   why="""On the job, a missing README means every new hire pings you. An accurate README is how an agent (and a teammate) can work without folklore. Interviewers will look at your GitHub. A capstone without a README is incomplete even if the code is fine.

They may ask what you would put in one. List the sections above. Mention a `.env.example`. Mention that screenshots of /docs are optional; a curl is not.

This is also part of the Level 0 capstone rubric.""",
   how="""Skeleton:

```
# Tickets API
Small REST service for support tickets. No LLM in the runtime.

## Setup
- Python 3.12, uv, Docker optional
- uv sync --frozen
- copy .env.example to .env

## Configure
| Var | Purpose |
| DATABASE_URL | Postgres |
| PROVIDER_API_KEY | unused in this service |

## Run
uv run fastapi dev app/main.py

## Test
uv run pytest

## API
POST /tickets  (see curl below or /docs)
```

Keep the curl that creates a ticket. Update the README in the same PR as the setup change.""",
   failures="""1. **Empty README** or only a title.

2. **Commands that do not work** on a clean clone.

3. **Secrets in the README.**

4. **Setup steps only in your head.**""",
   line="""The README is a cold-start runbook: what it is, install, configure, run, test, call the API. I keep a working curl and an env table. If a setup step changes, the README changes in the same PR.""",
   key_points=[
    "Purpose, install, configure, run, test, call.",
    "Env var table and a .env.example.",
    "Commands must work on a clean clone.",
    "Example curl or pointer to /docs.",
    "No secrets.",
    "Update README in the same PR as setup changes.",
   ],
   questions=[
    q("apply", "List the sections of a README for a FastAPI + Postgres service.", "Purpose, prerequisites, install (uv sync), env table, migrate, run, test, example curl or /docs, deploy notes if any."),
    q("recall", "What is .env.example for?", "The names of required variables with fake values so a new machine can copy it to .env. Not the real secrets."),
    q("debug", "A new hire cannot run the app from the README. You changed to uv last month. What failed?", "The README still says pip install -r. Update it in the same PR as the tooling change."),
    q("apply", "Should the README include a real API key for the demo?", "No. Name the variable and how to get a key. A committed demo key will be scraped."),
    q("recall", "Why include a curl, not only /docs?", "curl works in CI, in a ticket, and when the UI is disabled. It is the replayable contract."),
   ],
   links=[
    {"title": "GitHub: about READMEs", "url": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes"},
    {"title": "GitHub: about READMEs", "url": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes"},
   ],
  ),
  "code-review-protected-branches": entry(
   what="""**Code review** is a second human (or a mandated bot plus a human) reading the diff before it lands on the protected branch. A **pull request** is the vehicle. A **protected main** branch blocks direct pushes, requires N approvals, and requires green CI. Rules live on the host (GitHub branch protection, GitLab approval rules).

Review is not a ritual to say "lgtm" on 40 files. It is a check for correctness, tests, secrets, and clarity. The author is responsible for a small diff and a test plan. The reviewer is responsible for actually reading it.

Bots can lint. They cannot own the product decision.""",
   why="""On the job, protected main is how you stop a tired Friday force-push. Review is how a secret or an untested parser is caught. Interviewers ask what you look for in a review (tests, secrets, missing 4xx, a lockfile surprise) and what protection you would turn on.

They ask how you would reject a PR — politely, with a specific ask. That is the next checklist item's twin.

AI-generated PRs need *more* review, not less.""",
   how="""Protection: require PR, require 1 review, require status checks (`pytest`, `ruff`), no force-push, no deletion of main.

Reviewer loop: read the description, skim the diff, run it if the risk is high, comment on the behaviour not the person, approve or request changes.

Author loop: small PRs, respond to comments, do not resolve a comment without a reply. If you disagree, say why.

CODEOWNERS can require a data owner on schema changes. Use it when the team is large enough to forget.""",
   failures="""1. **Unprotected main.**

2. **Rubber-stamp reviews** on generated diffs.

3. **Reviewing style only** while a secret slips through.

4. **Requiring 5 reviewers** so nothing merges — tune the policy.""",
   line="""Protected main means no direct push, a required review, and green CI. I review for tests, secrets and behaviour, not for ritual LGTM. AI diffs get a harder read, not a softer one.""",
   key_points=[
    "Protected main: PR required, review required, CI required.",
    "Review correctness, tests, secrets, and the story.",
    "Authors keep PRs small and answer comments.",
    "Bots lint; humans own the product risk.",
    "Force-push to main is off.",
    "Generated code needs more review, not less.",
   ],
   questions=[
    q("recall", "What does a protected main branch typically require?", "A pull request, at least one review, passing required checks, and no force-push."),
    q("apply", "Name three things you look for in a review of a FastAPI PR.", "Tests for the new 4xx, no secrets, a response model so fields do not leak, and a migration if the schema changed."),
    q("debug", "A team turns off review to ship faster and a key lands on main. What do you restore?", "Protection plus a secret scan on CI. Speed comes from smaller PRs, not from no review."),
    q("apply", "How should a reviewer reject a PR?", "Request changes with a specific missing test or risk, not a vague 'this feels off'. Offer the shape of the fix."),
    q("recall", "Why review AI-generated diffs more carefully?", "Models invent APIs, skip edge cases, and paste secrets from the prompt. The diff is untrusted until a human says otherwise."),
   ],
   links=[
    {"title": "GitHub: about protected branches", "url": "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches"},
    {"title": "GitHub: reviewing changes", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests"},
   ],
  ),
  "rewriting-shared-history-is-not-allowed": entry(
   what="""**Force-pushing** (`git push --force`) replaces the remote branch with your local history. If **anyone else already pulled** those commits, their work no longer matches and they will rebase into a mess — or worse, force-push back and delete your fix. **Shared history is append-only** in practice: revert or add a fix commit.

`--force-with-lease` is safer on a **private** feature branch you are rebasing alone: it refuses to push if the remote moved. It is still a rewrite. Do not use it on `main` or on a branch teammates are using.

`git rebase -i` to squash local commits before the first push is fine. After others have the commits, it is not.""",
   why="""On the job, a force-push to a shared branch is an incident. CI may have tested commits that no longer exist. Review comments point at vanished lines. Interviewers ask what you do if you committed a secret (rotate; if you must rewrite, coordinate) and what you do if you committed a bug (revert or fix-forward).

"I will rebase main and force-push" on a shared branch is the wrong sentence. "I will revert that merge" is the right one.

This rule exists because Git will happily let you destroy history.""",
   how="""Bug already on main:

```
git revert SHA
# or revert the merge: git revert -m 1 MERGE_SHA
git push
```

Private feature branch, you are alone, you rebased:

```
git push --force-with-lease
```

Secret on main: rotate first. Then decide if a history rewrite is worth the coordination. For most teams, rotate + a commit that deletes the file is enough because scanners already saw it.

Tell the team in chat if you must rewrite a shared branch, and have them re-clone or reset to the new tip.""",
   failures="""1. **git push --force origin main.**

2. **Force-pushing a feature branch** your teammate is committing to.

3. **Rebase of main** onto a feature and force-pushing main.

4. **Assuming --force-with-lease is always safe.** It is safe-er, not shared-safe.""",
   line="""If others pulled it, I do not rewrite it. I revert or fix-forward. force-with-lease is for my private branch after a rebase. Force-pushing main is not a workflow; it is an incident.""",
   key_points=[
    "Shared branches are append-only: revert or fix-forward.",
    "force push rewrites remote history and breaks everyone who pulled.",
    "force-with-lease is for a private branch you rebase alone.",
    "Never force-push main.",
    "Rotate secrets first; rewrite history only with a plan.",
    "Tell people if a shared branch must move.",
   ],
   questions=[
    q("apply", "You merged a bug to main. Do you force-push?", "No. git revert the merge or add a fix commit and push. History stays, main stays shared."),
    q("recall", "What does --force-with-lease check?", "It refuses to push if the remote branch has commits you do not have locally — safer than --force on a branch you own."),
    q("debug", "A teammate force-pushed the branch you were working on. What do you do?", "Stop pushing. Fetch and recover your commits from reflog if needed. Agree on a tip. Treat it as a process failure."),
    q("apply", "When is rebase + force-with-lease OK?", "On a feature branch only you use, before or during review, after you rebased onto main. Not after others pushed to it."),
    q("recall", "Why is revert better than rewrite for a bad merge?", "Everyone who pulled main can pull again. CI and review stay coherent. No lost comments on vanished shas."),
   ],
   links=[
    {"title": "git revert", "url": f"{GIT}/docs/git-revert"},
    {"title": "git push --force-with-lease", "url": f"{GIT}/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegt"},
   ],
  ),
  "bisect-to-find-a-regression": entry(
   what="""**`git bisect`** is a binary search over history. You mark a **bad** commit (the bug is present) and a **good** commit (the bug is absent). Git checks out the midpoint; you test and say good or bad; it repeats until it names the first bad commit.

Use it when a bug "appeared last month" and the diff since then is huge. Do not use it when you already know the file. A scriptable test (`git bisect run pytest tests/test_x.py`) makes the search automatic.

Bisect needs a **reproducible test**. If the bug is flaky, bisect will lie.""",
   why="""On the job this is how you find a regression in 8 steps instead of 200 commits of `git log -p`. Interviewers love it as a sign you have debugged a real codebase. They will ask the command and the idea (binary search). They will ask what a good test looks like.

They may ask what you do with the answer: that commit's message and diff are the next read, then a revert or a targeted fix plus a regression test.

This pairs with the pytest interview item: the test you write is the one bisect can run.""",
   how="""```
git bisect start
git bisect bad HEAD
git bisect good v1.4.0
# repo checks out a midpoint
uv run pytest tests/test_tickets.py::test_cursor -q
git bisect bad   # or good
# ... until
git bisect reset
```

Automated:

```
git bisect start HEAD v1.4.0
git bisect run uv run pytest tests/test_tickets.py::test_cursor -q
```

The exit code of the command marks good (0) or bad (non-zero). Then read `git show` on the printed sha.

Skip a commit that does not build: `git bisect skip`.""",
   failures="""1. **Flaky test** as the oracle.

2. **Good and bad swapped.**

3. **Not resetting** and leaving the repo in a detached HEAD.

4. **Bisecting without a repro** — you are guessing at each step.""",
   line="""git bisect is a binary search between a known-good and a known-bad commit. I give it a deterministic test, I read the first bad commit, and I leave a regression test. I reset when I am done.""",
   key_points=[
    "Bisect is binary search over commits.",
    "You need a known-good, a known-bad, and a deterministic test.",
    "bisect run automates the loop.",
    "Read the first bad commit's diff next.",
    "Skip commits that cannot run the test.",
    "git bisect reset leaves the search.",
   ],
   questions=[
    q("apply", "A bug appeared between v1.4 and HEAD. How do you find the commit?", "git bisect start HEAD v1.4.0, then bisect run with a pytest that fails only when the bug is present. Read the first bad commit."),
    q("recall", "What does git bisect need from you at each step?", "A good or bad (or skip) based on a reproducible test at that commit."),
    q("debug", "Bisect points at a commit that only changes a README. What went wrong?", "The test is flaky or depends on data not in the repo. Fix the oracle and rerun."),
    q("apply", "Why write a regression test before or during bisect?", "So the oracle is automated and so the bug cannot return after you fix it."),
    q("recall", "How do you exit bisect?", "git bisect reset, which puts you back on the branch you started from."),
   ],
   links=[
    {"title": "git bisect", "url": f"{GIT}/docs/git-bisect"},
    {"title": "Git book: debugging with bisect", "url": f"{GIT}/book/en/v2/Git-Tools-Debugging-with-Git"},
   ],
  ),
  "interview": entry(
   what="""You will be asked to **walk a PR you would reject**. Name a concrete defect: a **missing test**, a **secret**, or an **unclear commit**, and say what you would ask for. This is a social plus technical answer. You are not dunking on the author. You are protecting main.

A good walk-through: what you saw, why it is a problem, the specific change you want, and what you would approve after. Interviewers score the specificity. "I would request changes" without a reason is empty.

They may hand you a fake PR description and a file list. Talk about those files.""",
   why="""Review is part of the job. Seniors spend a lot of time on other people's diffs. A candidate who cannot reject a dangerous PR will not be trusted with production. On the job you will write this comment tomorrow.

This also tests whether you know what "good" looks like: tests, no secrets, a message that explains why.""",
   how="""Talk track examples:

1. **Missing test.** "This changes empty-ticket behaviour but there is no test_empty_ticket. Please add one that expects `other` so we can bisect later."

2. **Secret.** ".env or a real key is in the diff. I am requesting changes. Remove it, add it to gitignore, rotate the key. I cannot approve while it is in the tree."

3. **Unclear commit.** "The branch is one commit named fix. Please split the migration from the route change and write why the default is 20."

Tone: assume competence, be specific, offer the shape of the fix. If it is a secret, do not delay.

If they ask what you would still praise: say it, then the block.""",
   failures="""1. **Vague LGTM or vague reject.**

2. **Style-only comments** while a key is in the diff.

3. **Humiliating the author.**

4. **Approving red CI** to be nice.""",
   line="""I would reject a PR for a missing regression test, a secret in the diff, or a history I cannot read — and I would say exactly what to change. Review is how we keep main releasable. Polite and specific beats rubber-stamp.""",
   key_points=[
    "Name a specific defect: test, secret, or history.",
    "Say what you want changed before you would approve.",
    "Be polite; be precise.",
    "A secret blocks the merge, no exceptions.",
    "Praise what is good, then the block.",
    "Do not approve red CI.",
   ],
   questions=[
    q("apply", "Walk a PR you would reject.", "Example: it adds a parser for LLM JSON and no test for a missing field. I request changes: add test_missing_label_raises and keep the raw payload in the log. I will approve when CI is green on that test."),
    q("recall", "What three defects does this prompt mention?", "A missing test, a secret, or an unclear commit — and the ask that would fix it."),
    q("apply", "A PR contains a real API key. What do you write?", "Request changes, do not merge, tell them to rotate immediately, remove the key, gitignore the file. The rest of the review can wait."),
    q("debug", "A reviewer only comments on line length. The PR has no tests. What did they miss?", "The behaviour risk. Style is cheap; a missing test is the reject."),
    q("recall", "Why mention how you would approve after?", "It turns a reject into a contract. The author knows the bar. The interviewer hears that you can unblock."),
   ],
   links=[
    {"title": "GitHub: requesting a review", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review"},
    {"title": "GitHub: commenting on a pull request", "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request"},
   ],
  ),
 }
}
