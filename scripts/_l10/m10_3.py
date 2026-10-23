from helper import note, MLFLOW, LANGFUSE

NODES = {
    "m10-3": {
        "experiments-in-mlflow": note(
            what="""An **experiment** in MLflow is a named container of **runs**. Each run records the parameters that defined an attempt — chunk size, top-k, model pin, temperature, tool set, prompt id — so you can find it later and compare it.

If those values live only in chat or in a notebook cell, you do not have experiments. You have memories. LLMOps tracking starts when every serious attempt is a run with parameters you could replay.""",
            why="""On the job, “we tried k=8 last month and it was better” is useless without the rest of the bundle. Interviewers ask how you compare two RAG configs. Naming MLflow (or an equivalent) and listing the parameters you log is the difference between a hobby and a practice.""",
            how="""Create one experiment per application (`rag-support`, `agent-refunds`). For each run log params: `chunk_size`, `overlap`, `k`, `model`, `temperature`, `prompt_id`, `index_id`, `tools`. Start the run before you score, not after you like the result.

Example. You test chunk 400 vs 800 at k=4 and k=8. That is four runs, not one notebook with comments. Each run can be opened, compared, and promoted. The winning param set is copied into the release manifest, not remembered.""",
            fails="""1. **One run for a whole afternoon of tweaks.** You cannot say which param moved the score.

2. **Params in notes, metrics only in MLflow.** Replay is impossible.

3. **Logging after you pick a winner.** The losers vanish and you repeat them next quarter.""",
            line="I record each experiment as an MLflow run with the parameters that define the bundle — chunk size, k, model, temperature, prompt, tools — so a comparison is a table, not a memory.",
            walk="""You open last month’s experiment and see `k=8, chunk=512, prompt=v7` scored 0.84 and shipped. Today’s “better” notebook used `k=12` and no prompt id. You refuse to ship until it is a run next to that baseline.""",
            follow="""They ask if a spreadsheet is enough. Say: until two people need to replay a run. Then you want an API, artefacts, and a run id on the trace.""",
            measure="Share of gated releases that point at an MLflow run id, and runs that omit a required param.",
            kps=[
                "An MLflow experiment holds runs; a run holds the params that define the attempt.",
                "Log chunk size, k, model, temperature, prompt id, tools, index id.",
                "Start the run before you score, and keep the losers.",
                "One afternoon of tweaks is many runs, not one.",
                "Copy winning params into the release manifest.",
                "A memory of “k=8 was better” is not tracking.",
            ],
            qs=[
                {"q": "What belongs in an MLflow run for a RAG experiment?", "a": "Parameters such as chunk size, overlap, top-k, model pin, temperature, prompt id, index id, and tool set, plus the metrics and artefacts you score.", "kind": "recall"},
                {"q": "You tweaked five settings in one notebook and logged one run. What do you do next time?", "a": "One change (or one planned grid cell) per run so you can see which param moved quality, latency, or cost.", "kind": "apply"},
                {"q": "A teammate says the best k is 8. What do you ask for?", "a": "The run id, the rest of the params, and the gold-set version. k without the bundle is not a result.", "kind": "debug"},
                {"q": "When do you start the MLflow run — after you like the output, or before?", "a": "Before. Logging only winners deletes the comparison set you need next month.", "kind": "recall"},
                {"q": "How does a winning run become production config?", "a": "You copy its params into the release manifest and config, and you keep the run id as the evidence the gate saw.", "kind": "apply"},
            ],
            links=[MLFLOW],
        ),
        "scores-prompts-outputs-per-run": note(
            what="""A run is incomplete if it only has parameters. Log **evaluation scores as metrics** and keep **prompts, configs, and sample outputs as artefacts**.

Metrics are numbers you can plot: faithfulness, answer relevance, contextual precision, task completion, latency, tokens, cost. Artefacts are files you can open: the prompt file, the YAML config, a JSONL of example outputs, the gold-set version.

Without artefacts you can see that a run scored 0.81 and not why. Without metrics you have a pile of text and no ranking.""",
            why="""Incident reviews and design reviews both ask “show me what it said.” A metric-only run cannot. Interviewers ask what you store besides BLEU-like scores. Prompts and sample outputs are the expected extra.""",
            how="""At the end of a run: `log_metrics({...})`, `log_artifact(prompt.txt)`, `log_artifact(config.yaml)`, `log_artifact(samples.jsonl)`, tag `evalset=l7-gold@v8`.

Example. Two runs both score 0.86 faithfulness. Samples show run A invents refunds; run B is dry but safe. You pick B because you can read the artefact, not because the single metric distinguished them. A judge metric on “policy invention” later goes on the same run.""",
            fails="""1. **Metrics without samples.** You cannot audit the judge.

2. **Samples without the prompt file.** You cannot replay.

3. **Huge raw dumps as artefacts.** Nobody opens them. Store a reviewed sample slice plus a pointer to traces.""",
            line="Each run gets metrics for scores and artefacts for the prompt, config, and a sample of outputs. A number without the text is not enough to choose a winner or debug a judge.",
            walk="""A stakeholder challenges a 0.04 drop. You open the run, download `samples.jsonl`, and show three new refusal misses. The debate becomes those cases, not a feeling about the model.""",
            follow="""They ask about logging every production output into MLflow. Say: no — that is traces. MLflow holds experiment artefacts; production stays in the tracer with retention rules.""",
            measure="Runs missing prompt artefacts, runs missing a sample file, and reviews that needed a trace because the artefact was empty.",
            kps=[
                "Metrics are scores; artefacts are prompts, configs, and sample outputs.",
                "You need both to rank runs and to audit a judge.",
                "Tag the gold-set version on the run.",
                "Store a reviewed sample slice, not an unreadable dump.",
                "Production traffic belongs in traces, not in the experiment tracker.",
                "Two equal scores are decided by reading samples.",
            ],
            qs=[
                {"q": "What do you log as metrics versus artefacts on an MLflow run?", "a": "Metrics: numeric scores, latency, tokens, cost. Artefacts: prompt file, config, sample outputs, and a pointer to the gold-set version.", "kind": "recall"},
                {"q": "Two runs tie on faithfulness. How do you pick?", "a": "Open the sample-output artefact and compare failure shapes (inventions, refusals, schema breaks). Add a metric for the shape that matters if it will recur.", "kind": "apply"},
                {"q": "A run has a great score and no prompt artefact. Why is it unusable?", "a": "You cannot replay or promote the exact text that produced the score. Delete or rerun; do not ship from a number alone.", "kind": "debug"},
                {"q": "Why not dump all production answers into the run?", "a": "Retention, PII, and volume. Experiments get a sample artefact; production stays in the tracer with a policy.", "kind": "recall"},
                {"q": "What tag do you put on the run so scores stay comparable?", "a": "The eval-set version, plus prompt and model pins, so a 0.86 in April is not silently on a different exam than May.", "kind": "apply"},
            ],
            links=[MLFLOW],
        ),
        "comparing-runs": note(
            what="""**Comparing runs** is the reason you logged them. Put two or more runs side by side on the metrics that matter — quality, latency, cost — and on the params that differed. The question is “which change actually moved the number?” not “which run do I like.”

A comparison is honest only when the gold set, judge pin, and code path are the same. Otherwise you are comparing exams, not systems.""",
            why="""Teams ship the latest run because it is latest. Interviewers ask how you would decide k=4 vs k=8. The answer is a comparison table on the same set, with cost and latency, not a single cherry-picked answer.""",
            how="""Use the MLflow compare view or a notebook that pulls runs by experiment and evalset tag. Sort by the primary quality metric, then look at cost and p95. Require a minimum delta before you call a winner, so noise does not promote.

Example. `k=8` gains 0.01 faithfulness and adds 40 percent tokens. You keep `k=4`. The comparison saved money. Another pair: a new prompt gains 0.05 on task completion at the same cost. You promote the prompt id and leave k alone.""",
            fails="""1. **Comparing across gold-set versions** and calling it a model win.

2. **Optimising one metric** while cost doubles.

3. **No minimum delta.** You promote noise.""",
            line="I compare runs that share a gold set and a judge pin, and I read quality next to latency and cost. Latest is not better; a named delta on a fair comparison is.",
            walk="""Four runs sit on the board. Only two share `l7-gold@v8`. You hide the other two, pick the cheaper of the fair pair, and write the losing k into the decision record so nobody reruns it as folklore.""",
            follow="""They ask about Bayesian optimisation. Say: after you can compare two runs fairly. A search on a moving exam is theatre.""",
            measure="Promotions with a recorded comparison id, and promotions that increased cost more than a documented budget for the quality gain.",
            kps=[
                "Compare runs that share gold set, judge pin, and code path.",
                "Read quality next to latency and cost.",
                "Latest is not a reason to ship.",
                "Require a minimum delta so noise does not win.",
                "Record the losing config so it does not return as folklore.",
                "Do not compare across exam versions and call it a model win.",
            ],
            qs=[
                {"q": "What must be equal before you compare two MLflow runs?", "a": "Gold-set version, judge pin and rubric, and the same application path. Otherwise you are comparing exams.", "kind": "recall"},
                {"q": "k=8 is 0.01 better and 40 percent more tokens. What do you ship?", "a": "Keep k=4 unless a written quality target required that 0.01. Show the comparison table; do not ship cost for noise.", "kind": "apply"},
                {"q": "A run on a new gold set looks like a breakthrough. What do you do?", "a": "Re-score the old winner on the new set and the new run on the old set, or refuse the comparison until one exam is shared.", "kind": "debug"},
                {"q": "Why look at latency when the question was quality?", "a": "A quality win that blows p95 or cost is often a net product loss. Comparison is multi-metric.", "kind": "recall"},
                {"q": "What do you write down besides the winner?", "a": "The loser, the deltas, and the run ids, so the next person does not rerun the same grid from memory.", "kind": "apply"},
            ],
            links=[MLFLOW],
        ),
        "a-baseline-before-changes": note(
            what="""Record a **baseline run** for each application **before you change anything**. The baseline is the current bundle scored on the current gold set with the current judge pin. Every later run is “versus baseline,” not versus hope.

If you start improving first and measure later, you will invent a past. The baseline is cheap compared to a month of uncompared tweaks.""",
            why="""Gates need a threshold. The honest threshold is “do not get worse than the system we already have.” Interviewers ask how you set the number. “We scored the as-is app on the Level 7 set and froze it” is the professional answer.""",
            how="""Day one: freeze config, run the full suite, log the run as `baseline-rag` / `baseline-agent`, store metrics and artefacts, write thresholds (e.g. faithfulness ≥ baseline − 0.02). Then start experiments.

Example. You almost skip the baseline because “we know it is bad.” You run it anyway: 0.79 faithfulness, $0.012/query. A flashy new prompt hits 0.78 and costs 2×. Without the baseline you might have shipped “improvement.” With it, you do not.""",
            fails="""1. **Baseline after three changes.** You cannot unbundle them.

2. **Baseline on a different set** than the gate.

3. **Never refreshing a six-month-old baseline** after a deliberate, reviewed quality jump — or refreshing it silently after a drop.""",
            line="I score the as-is RAG app and agent on the gold set before I touch them. That baseline run is the yardstick for every later threshold. No baseline, no claim of improvement.",
            walk="""Your first MLflow screenshot in the capstone is tagged `baseline`. The CI threshold file cites that run id. A later prompt is rejected at 0.01 below it. The story is discipline, not a lucky model.""",
            follow="""They ask when you move the baseline. Say: when a reviewed release is better and you intend the new floor — never to hide a drop.""",
            measure="Presence of a baseline run id per app, and gate thresholds that still point at it (or at a documented successor).",
            kps=[
                "Score the as-is system before changing it.",
                "Thresholds are “not worse than baseline,” plus a small band.",
                "Baseline and gate must share the gold set and judge.",
                "Do not take a baseline after you already changed three things.",
                "Move the floor only after a reviewed win, never after a drop.",
                "Log baseline artefacts the same way as later runs.",
            ],
            qs=[
                {"q": "When do you record the baseline run?", "a": "Before changing prompt, model, or retrieval. Score the as-is app on the current gold set and freeze those metrics as the floor.", "kind": "recall"},
                {"q": "Why run a baseline if you already think the app is bad?", "a": "So you do not ship a worse or costlier change that only feels better. Improvement is versus a number, not versus shame.", "kind": "apply"},
                {"q": "CI thresholds were typed by hand with no run id. What is the risk?", "a": "Nobody can prove the floor was the real system. Re-run the as-is bundle, store the run, and point the gate at those metrics.", "kind": "debug"},
                {"q": "When is it legitimate to raise the baseline?", "a": "After a reviewed release that beat the old floor on the same exam, and you want the new floor to be the new “do not get worse.”", "kind": "apply"},
                {"q": "What two apps get a baseline in this level?", "a": "The Level 4 RAG application and the Level 5 agent, each as their own run.", "kind": "recall"},
            ],
            links=[MLFLOW],
        ),
        "a-prompt-registry": note(
            what="""A **prompt registry** (Langfuse and similar) stores prompt text as **versioned objects** you can review and deploy **independently of application code**. The app fetches `support@production` and gets whatever version that label points at.

Prompts in git-only can work at first, but every wording change becomes a code deploy. A registry is for when wording changes faster than code, and when non-engineers need a review path that is not a Python PR — still with versions, not a wiki.""",
            why="""If prompts live in source only, rollback is a rebuild. If they live in a wiki, there is no version. Interviewers ask how you version prompts. “Registry with labels, fetched at runtime, pinned fallback in the image” is the complete answer.""",
            how="""Create a prompt, get `v1`, `v2`. Attach labels `staging` and `production`. The service asks for `production` and caches the text. A human review + eval gate moves the label.

Example. Legal changes a refusal sentence. They edit in the registry as `v18`, you run the suite, a reviewer approves, you move `production` to `v18`. The FastAPI image does not change. Traces show `prompt=v18`.""",
            fails="""1. **Registry as a paste bin** with no versions or reviews.

2. **Fetch with no cache and no fallback.** Registry downtime is prod downtime.

3. **Code still hard-codes a copy** that drifts from the registry.""",
            line="I store prompts in a registry so they are versioned, reviewed, and deployed by moving a label, independent of the container. The app fetches by label with a cache and a pinned fallback.",
            walk="""You demo moving `production` from `v11` to `v12` after a green gate, then back after a bad canary. Docker Hub did not get a new tag. That is the registry’s job.""",
            follow="""They ask git vs registry. Say: git is fine while prompts change with code. The day PMs and legal edit weekly, a registry with labels beats a Python PR for every comma.""",
            measure="Share of production prompts served from a versioned label, and wording changes that still required an image tag.",
            kps=[
                "A registry versions prompts independently of the app image.",
                "Labels such as staging and production point at versions.",
                "Review and eval happen before a label moves.",
                "Fetch with cache and a pinned fallback.",
                "Do not keep a drifting hard-coded copy in source.",
                "Git-only is acceptable until wording outpaces code deploys.",
            ],
            qs=[
                {"q": "What problem does a prompt registry solve that git-only prompts do not?", "a": "Wording can be versioned, reviewed, and rolled back without rebuilding the application image.", "kind": "recall"},
                {"q": "How does a production process use labels in the registry?", "a": "The app fetches a name plus a label such as `production`. Promoting is moving that label to a new version after the gate and a review.", "kind": "apply"},
                {"q": "The registry is down and the app crashes. What was missing?", "a": "A cache and a pinned fallback prompt bundled with the image or last successful fetch.", "kind": "debug"},
                {"q": "Why still run the eval gate if the registry versions the text?", "a": "A version is not a quality score. The gate decides whether that version may receive the production label.", "kind": "recall"},
                {"q": "Where must the fetched version appear?", "a": "On every trace and in the release manifest, so a rollback knows which label to move.", "kind": "apply"},
            ],
            links=[LANGFUSE],
        ),
        "staging-production-labels": note(
            what="""**Labels** on a prompt version (`staging`, `production`) are pointers. You **promote by moving the label**, not by editing the live text. `v14` can be staging while `v13` remains production. Moving `production` to `v14` is the release.

Editing text in place destroys history. Creating `v15` and moving labels keeps every past wording fetchable.""",
            why="""This is the same mental model as container tags, applied to words. Interviewers ask how you promote a prompt. “We edit prod” is a fail. “We move the production label after staging passes the suite” is a pass.""",
            how="""Policy: no one edits a version that a label already pointed at. Bad wording → new version. Promotion → eval on staging label → review → move production label. Rollback → move production back.

Example. `staging=v16` fails the gate. You never move `production`. You fix `v17`, restage, pass, promote. `v16` remains as a warning in the history.""",
            fails="""1. **Editing the text behind a label.** History lies.

2. **The same label for staging and prod.** You have no dress rehearsal.

3. **Moving prod before the gate.** Labels without policy are stickers.""",
            line="I promote prompts by moving a production label to a new version after staging passes the eval. I never edit live text in place, and rollback is moving the label back.",
            walk="""The capstone screenshot is the registry UI: `production → v12`, `staging → v13`, and a CI log that blocked `v13`. Then a later shot with `production → v13` after the fix. No in-place edit.""",
            follow="""They ask about environments beyond two. Say: add `canary` if you need a third pointer; do not reuse `production` for a percentage experiment — that is a flag in front of the label.""",
            measure="Promotions that moved a label after a staged gate, and incidents where live text was edited in place.",
            kps=[
                "Labels are pointers; versions are immutable text.",
                "Promote by moving production after staging passes.",
                "Rollback by moving the label back.",
                "Never edit the text a label already served.",
                "Keep staging and production as different pointers.",
                "A canary percentage is a flag in front of a version, not a reused prod label.",
            ],
            qs=[
                {"q": "How do you promote a prompt version without editing live text?", "a": "Create a new version, point staging at it, run the gate, then move the production label. The old version remains fetchable.", "kind": "recall"},
                {"q": "Someone “fixed a typo” on the production object in place. What did they break?", "a": "History and rollback. Yesterday’s wording is gone. Re-create versions and lock writes on labelled objects.", "kind": "debug"},
                {"q": "Why have both staging and production labels?", "a": "So you can evaluate a candidate on the same fetch path without exposing all users, then promote by moving one pointer.", "kind": "apply"},
                {"q": "What is the rollback motion?", "a": "Move the production label to the previous version. Do not hotfix text on the bad version.", "kind": "apply"},
                {"q": "When do you add a third label such as canary?", "a": "When you need a pointer for a percentage experiment that is neither full staging nor full production. Still do not edit in place.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
        "runtime-fetch-with-a-fallback": note(
            what="""The app **fetches prompts at runtime** from the registry, **caches** them, and keeps a **pinned fallback** so a registry outage does not take the product down.

Runtime fetch is what makes label moves take effect without a rebuild. Cache is what keeps you from calling the registry on every token. Fallback is what keeps you alive when the registry is wrong or gone.""",
            why="""A hard runtime dependency on a SaaS registry is a new single point of failure. Interviewers will ask what happens when Langfuse is down. “We serve the last cached or bundled prompt and page” is the answer they want.""",
            how="""On boot or on a short interval, fetch `name@label`. Cache in memory (and optionally disk) with the version id. If fetch fails, use the last good cache; if cold start fails, use a prompt file baked into the image at last release. Log `source=registry|cache|fallback`.

Example. Registry 500s for twenty minutes. Traces show `source=cache`, `prompt=v12`. Users are fine. You page on fallback usage, not on user errors.""",
            fails="""1. **Fetch every request, no cache.** Latency and rate limits.

2. **No fallback.** Registry outage = outage.

3. **Fallback that is months stale** and never refreshed when you promote. You survive, then serve ancient wording after a restart.""",
            line="I fetch prompts at runtime so label moves apply without a rebuild, I cache them, and I keep a pinned fallback in the image so a registry outage is not a user outage.",
            walk="""You kill the registry in a drill. The app keeps answering; metrics show `source=fallback` on new pods and `source=cache` on old ones. You fix the registry and watch `source=registry` return. The drill is in the runbook.""",
            follow="""They ask if fallback bypasses the gate. Say: fallback is last gated production text, bundled at image build or last successful fetch — not a random file from a laptop.""",
            measure="Requests served from fallback, cache TTL hits vs fetches, and cold starts that had no baked prompt.",
            kps=[
                "Runtime fetch makes label moves live without a rebuild.",
                "Cache so you do not call the registry per request.",
                "Pinned fallback so a registry outage is not a product outage.",
                "Log whether the text came from registry, cache, or fallback.",
                "Refresh the baked fallback when you promote.",
                "Fallback must be last gated production text, not a random file.",
            ],
            qs=[
                {"q": "Why fetch prompts at runtime instead of baking only?", "a": "So moving a label can change wording without rebuilding. Baking alone forces an image for every comma.", "kind": "recall"},
                {"q": "The registry is down. How do users keep getting answers?", "a": "Serve from in-memory cache or a pinned fallback bundled with the image, log the source, and page on fallback — do not crash the request.", "kind": "apply"},
                {"q": "After a restart during an outage, pods serve a year-old prompt. What was missing?", "a": "The baked fallback was not updated at the last promotion. Refresh it in the image build when production label moves.", "kind": "debug"},
                {"q": "What do you log on each request besides the prompt id?", "a": "The source: registry, cache, or fallback, so an outage is visible without reading wording.", "kind": "apply"},
                {"q": "Why still bake a fallback if you have a cache?", "a": "Caches die on restart. Cold pods during a registry outage need a file or last-known bundle.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
        "rollback-by-moving-a-label": note(
            what="""A **bad prompt rolls back by moving the production label** to the previous version. That is the motion you practise. You do not rebuild, you do not hotfix a string on the live object, and you do not “forward fix” under panic unless the label move is already done.

Rollback time should be minutes. If it is an hour, you do not have label rollback; you have a deploy.""",
            why="""This is the 2 a.m. skill. Interviewers ask how fast you can undo wording. If your answer includes Docker, you missed the point of the registry. On the job, legal will ask you to revert a sentence before the next meeting.""",
            how="""Runbook: identify current `production` version from traces → move label to last known good → verify traces show the old id → leave the bad version in history → open a reviewed fix as a new version.

Example. `v19` promises a refund. Traces confirm `v19`. You move `production` to `v18`. Cache TTL is 30s; you can also bounce pods if you must. Users see `v18` on the next request. Then you write `v20` without the promise.""",
            fails="""1. **Forward-fix only.** You write v20 while v19 still serves.

2. **Deleting v19.** You lose the artefact for the postmortem.

3. **Label move without checking traces.** You rolled back the wrong name.""",
            line="Rollback is moving the production label to the last good prompt version. I do that first, confirm the id on traces, and only then write a fix. I do not rebuild to undo wording.",
            walk="""Drill: you deliberately ship a rude prompt to staging, promote for two minutes, then move the label back. The capstone video is the traces flipping from `v5` to `v4`. Time-to-undo is 90 seconds.""",
            follow="""They ask about in-flight requests. Say: they finish on the old fetch; new fetches get the moved label. I do not try to cancel tokens for a wording rollback unless the text is actively harmful, in which I also tighten the output filter.""",
            measure="Time from detect to traces showing the previous prompt id, and rollbacks that required an image tag.",
            kps=[
                "Undo a bad prompt by moving the production label back.",
                "Confirm the old id on traces after the move.",
                "Do not delete the bad version; you need it for the review.",
                "Forward-fix only after the label is safe.",
                "If undo needs a rebuild, the registry is not in the path.",
                "Practise the motion in a drill, not during the first incident.",
            ],
            qs=[
                {"q": "How do you roll back a bad prompt in a registry setup?", "a": "Move the production label to the previous version, confirm traces show that id, and keep the bad version for the postmortem. Then write a new fix version.", "kind": "recall"},
                {"q": "Why is rebuilding the image the wrong first move for bad wording?", "a": "Wording should not live only in the image. A label move is faster and matches how you promoted. Rebuild if the fallback file is what is serving and it is wrong.", "kind": "apply"},
                {"q": "You shipped a fix as v20 but v19 is still labelled production. What happened?", "a": "You forward-fixed without moving the label. Move production off v19 immediately.", "kind": "debug"},
                {"q": "What do you not do to the bad version?", "a": "Delete it or edit it in place. History and the incident review need the exact text users saw.", "kind": "recall"},
                {"q": "How do you know rollback worked?", "a": "New traces show the previous prompt id (and cache source if relevant), and the failing online sample recovers.", "kind": "apply"},
            ],
            links=[LANGFUSE],
        ),
        "traces-linked-to-prompt-versions": note(
            what="""Every **trace links to the prompt version** that produced it. The link is how a regression becomes a named change: you filter traces by `prompt_id=v19` and see the spike, or you open one bad answer and read `v19` immediately.

Without the link, you have pretty waterfalls and no culprit. With it, the registry, the gate, and the tracer tell one story.""",
            why="""This is the debugging contract of the module. Interviewers hand you a bad answer and ask what you open first. “The trace; it has the prompt version” is the line. On the job, weekly reviews group misses by prompt id, not by vibes.""",
            how="""When you fetch the prompt, set a span attribute `prompt_id` / `prompt_label`. Same for model pin. Make the UI click from trace to registry version.

Example. Faithfulness dips on Tuesday. You group traces by prompt id: `v19` is 80 percent of the dip. You roll back the label. The same dashboard, grouped by model pin, is flat. The link saved a wild goose chase.""",
            fails="""1. **Logging the prompt text but not the id.** You cannot group or roll back by pointer.

2. **Id on the parent span only**, missing on model subcalls after a retry.

3. **Link to “latest”** instead of the resolved version number.""",
            line="Every trace carries the resolved prompt version so a regression can be grouped and rolled back by id. A waterfall without that attribute is not enough to name the change.",
            walk="""You click a thumbs-down in the UI, land on a trace, click `v19`, see the diff versus `v18`, and move the label. That path is the demo. If any hop is missing, you fix the attribute before you add more dashboards.""",
            follow="""They ask about prompt text in traces. Say: store the id always; store text according to PII policy. The id is what rollback needs.""",
            measure="Percent of traces with a resolved prompt version, and quality incidents whose first action used that group-by.",
            kps=[
                "Stamp the resolved prompt version on every trace.",
                "Group regressions by prompt id to name the change.",
                "Link the tracer to the registry version in the UI if you can.",
                "Log the version number, not the word latest.",
                "Keep the id even when you cannot keep the full text.",
                "Retries must copy the same prompt id onto child spans.",
            ],
            qs=[
                {"q": "Why link traces to prompt versions?", "a": "So a quality dip can be grouped to the wording that caused it and rolled back by moving that label, instead of guessing among model, index, and prompt.", "kind": "recall"},
                {"q": "Faithfulness dips. How do you use the link?", "a": "Group traces by prompt id and by model pin. If one prompt id owns the dip, move that label back. If pins moved, treat it as a model release.", "kind": "apply"},
                {"q": "Traces show prompt text but the registry cannot find a version. What was logged wrong?", "a": "Text without a stable id. Log the resolved version and label so rollback has a pointer.", "kind": "debug"},
                {"q": "What must a retry span include?", "a": "The same prompt version and request id as the parent, or you will under-count a bad version.", "kind": "apply"},
                {"q": "Is logging full prompt text required for the link to work?", "a": "No. The id is required. Text is a retention and PII choice.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
        "dataset-versioning": note(
            what="""The **golden set is as important as the prompt**. Version it (`l7-gold@v8`), store it as an artefact, and record which version a run and a release used. A prompt `v14` that “scored 0.9” on an unnamed set is an advertisement.

Dataset versioning includes the cases, the labels or rubrics, and the split (fast subset vs full). Changing a label on one case without a version bump rewrites history.""",
            why="""People obsess over prompt versions and treat the exam as clay. That is how gates get quieter. Interviewers ask how you know a year-old score is comparable. “Same dataset version and judge pin” is the answer.""",
            how="""Keep the set in git or object storage with a semver or date id. MLflow run tags `evalset=…`. CI checks out that id. Adding a case is a reviewed PR that bumps the id and, if needed, re-scores the baseline.

Example. You add six production misses. That is `v9`. You re-run the current production bundle and the candidate prompt on `v9`. You do not claim `v14` beat `v8`’s 0.86 on a different exam.""",
            fails="""1. **Editing labels in place** to make a favourite prompt win.

2. **No id in CI** — the runner clones `main` and the set moved.

3. **Prompt registry with a folder of anonymous JSONL.** One side is versioned; the exam is not.""",
            line="I version the golden set like a prompt. Every score names the dataset id, and I will not compare runs that sat different exams. Adding a miss bumps the version and re-scores the baseline.",
            walk="""A PM quotes “0.92 on eval.” You ask “which dataset version?” They do not know. You show two runs: 0.92 on a 15-row demo, 0.71 on `l7-gold@v8`. The meeting uses `v8` from then on.""",
            follow="""They ask if the set should live in the prompt registry. Say: it can live anywhere addressable. The requirement is an id on the run, not a particular SaaS.""",
            measure="Runs missing `evalset` tags, and baseline re-scores after each dataset bump.",
            kps=[
                "Version the golden set; treat it as important as the prompt.",
                "Every score names a dataset id.",
                "Do not edit labels in place to pass a favourite prompt.",
                "Adding cases bumps the version and re-scores the baseline.",
                "CI must pin the set id, not “whatever is on main.”",
                "A 15-row demo set is not the golden set.",
            ],
            qs=[
                {"q": "Why is the golden set as important as the prompt?", "a": "A score is a pair: system plus exam. An unversioned set lets you rewrite the exam and fake a prompt win.", "kind": "recall"},
                {"q": "You add production misses. What else must you do?", "a": "Bump the dataset version, re-score the current production bundle as the new baseline comparison, and point CI at the new id.", "kind": "apply"},
                {"q": "A run claims 0.92 with no evalset tag. How do you treat it?", "a": "As non-comparable. Re-run on a named set or discard it for promotion decisions.", "kind": "debug"},
                {"q": "What lives inside a dataset version besides the questions?", "a": "Labels or rubrics, splits such as fast versus full, and the review record for added cases.", "kind": "recall"},
                {"q": "Where do you record the dataset id?", "a": "On the MLflow run, in CI, and on the release manifest next to prompt and model pins.", "kind": "apply"},
            ],
            links=[MLFLOW],
        ),
        "promotion-rules": note(
            what="""**Promotion rules** are the same **eval command** from **dev to staging to prod**. What changes is who must approve and how much traffic you expose — not the exam, not the judge pin, and not a “prod-only” notebook.

Dev can be the fast subset. Staging is the full suite plus a human if the risk band says so. Prod is a label move or a deploy of a bundle that already passed that command.""",
            why="""The classic failure is a laptop eval that passed and a production that never ran the command. Interviewers ask how you promote. “Same command, three environments, tighter approvals” is the rule.""",
            how="""`make eval EVALSET=l7-gold@v8 FAST=1` on every commit. `make eval FAST=0` on main and on a release candidate. Staging runs the same image the candidate will use. Production does not grow a new script.

Example. A prompt passes a developer’s 10-row script and fails `make eval` in CI. You do not add a fourth script. You fix the prompt or the subset. Promotion is a green full command plus a label move.""",
            fails="""1. **A different notebook for prod.** Drift is guaranteed.

2. **Skipping the full suite because staging “looked fine.”**

3. **Manual clicks that are not recorded** as the command’s output.""",
            line="Dev, staging, and prod use the same eval command. I may run a fast subset early, but I will not invent a friendlier exam to promote. Promotion is a green run plus a label or tag move.",
            walk="""Your Actions file calls the same Makefile target the laptop uses. The capstone shows one command in three logs: laptop subset, CI full, pre-prod full. The prompt label moves only after the third.""",
            follow="""They ask about environment-specific data. Say: environment can change pins; the exam id stays unless you deliberately version a new set and re-baseline.""",
            measure="Promotions without a stored full-suite log, and differences between laptop and CI command lines.",
            kps=[
                "Same eval command from dev to staging to prod.",
                "Fast subset is a slice, not a different exam.",
                "Production does not get a special notebook.",
                "Approvals get tighter; the command does not get friendlier.",
                "Store the command output on the release.",
                "Environment may change pins; it should not change the exam id.",
            ],
            qs=[
                {"q": "What stays the same across dev, staging, and prod promotion?", "a": "The eval command, the gold-set id, and the judge pin. Approvals and traffic can tighten; the exam cannot get friendlier.", "kind": "recall"},
                {"q": "A developer’s 10-row script passes and CI fails. Which one promotes?", "a": "Neither until the shared command is green. Fix the prompt or align the subset; do not add a fourth script.", "kind": "apply"},
                {"q": "Staging was “clicked through” with no command log. What do you do?", "a": "Re-run the full shared command on the candidate bundle and store the log. A click-through is not a promotion rule.", "kind": "debug"},
                {"q": "Where may you use a fast subset?", "a": "On every commit and locally. The full suite still runs before a production label or image is released.", "kind": "apply"},
                {"q": "Why is a prod-only notebook a process smell?", "a": "It will drift from CI and become the friendlier exam. Promotion rules exist to forbid that split.", "kind": "recall"},
            ],
            links=[MLFLOW, LANGFUSE],
        ),
    }
}
