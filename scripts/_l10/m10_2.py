from helper import note, MLFLOW, STRUCTURED, LANGFUSE

NODES = {
    "m10-2": {
        "reuse-your-level-4-and-5-apps": note(
            what="""This level does not ask you to invent a third product. It asks you to **operate the RAG application from Level 4 and the agent from Level 5**. Those two systems already have retrieval, tools, and enough surface area to practise tracking, gating, guarding, serving, shipping, deploying, and monitoring.

Building a new demo would hide the point. You would spend the week on features and never get to a rollback. Reuse forces the boring work: configuration, pins, an eval yardstick, and a path to production on apps you already understand.

If one of those apps is a mess, tidy only what operations need — a single entrypoint, a config file, a way to run evals — and then start the lifecycle. Do not rewrite the model layer.""",
            why="""On the job you inherit systems. LLMOps is judged on whether last quarter’s bot can be versioned and paged, not on whether you can build a prettier one. Interviewers who hear “I built a new agent for LLMOps” will ask what you actually operated. “I took the RAG bot through a gate, a rollback, and a runbook” is the stronger story.""",
            how="""Make a short inventory of each app: entrypoint, model calls, retriever, tools, current eval set, secrets, how you run it today (notebook vs script). Then list the first five operational gaps: no pin, no request id, prompt in source, no timeout, no budget.

Example. Level 4 RAG lives in a notebook. You extract a `run(query, cfg)` function, put model/prompt/k in YAML, and keep the notebook as a client. Level 5 agent already has tools; you add a step cap and a request id. Both now can enter M10.3 tracking. You did not add a third persona or a new vector database.""",
            fails="""1. **Greenfield itch.** A new “ops-native” agent that never sees real documents. You practise Docker, not LLMOps.

2. **Rewrite while operating.** You change chunking, tools, and serving at once. You cannot tell which lever the gate is scoring.

3. **Leaving the apps as notebooks.** There is no process to pin, trace, or deploy. Extract an entrypoint first.""",
            line="I operate the Level 4 RAG app and the Level 5 agent rather than building a third demo. LLMOps is the lifecycle on systems I already understand: pin, gate, guard, serve, ship, and roll back those two.",
            walk="""Your capstone README lists two commands: `make rag-eval` and `make agent-eval` against the same gold sets from Level 7. Compose starts both. The story you tell is a prompt rollback on the RAG app and a spend-cap incident on the agent — not a new product name.""",
            follow="""They ask why not a cleaner greenfield. Reply: greenfield hides inheritance. I wanted a rollback on something with a real index and real tools, because that is the job.""",
            measure="Whether both inherited apps have an entrypoint, a config file, and a runnable eval — not count of new features this level.",
            kps=[
                "Operate the Level 4 RAG app and Level 5 agent; do not invent a third product.",
                "LLMOps is judged on lifecycle, not on a prettier demo.",
                "Tidy only what ops needs: entrypoint, config, eval command.",
                "A rewrite that also changes retrieval hides the gate.",
                "Notebooks are not a deployable unit — extract a function first.",
                "Capstone stories should be rollback and runbook, not new features.",
            ],
            qs=[
                {"q": "Which two systems does this level operate, and why not a new one?", "a": "The Level 4 RAG app and the Level 5 agent. A new demo spends the week on features and skips rollback, gates, and runbooks on a system you already understand.", "kind": "recall"},
                {"q": "The RAG app is still a notebook. What is the smallest extraction before tracking?", "a": "A single `run(query, cfg)` entrypoint, config for model/prompt/k, and a way to run the eval set. Keep the notebook as a client.", "kind": "apply"},
                {"q": "A teammate starts a new “production agent” for this level. What do you say?", "a": "Stop. We already have two systems with retrieval and tools. Operating those is the curriculum; a third app is scope hiding.", "kind": "debug"},
                {"q": "What do you refuse to change while you add the first eval gate?", "a": "Chunking, tool set, and model family. Change one operational piece at a time so the gate has a baseline.", "kind": "apply"},
                {"q": "What capstone evidence shows you reused rather than rebuilt?", "a": "Eval commands and incidents on the existing RAG and agent — a prompt rollback, a spend cap — not a new repo with a new persona.", "kind": "recall"},
            ],
            links=[MLFLOW],
        ),
        "configuration-not-code": note(
            what="""**Configuration, not code** means the levers that change model behaviour live outside the function body: model id, prompt id or path, temperature, retrieval k, index name, tool allow-list, timeouts, and budget caps. A rebuild should not be required to flip any of those.

Code owns control flow: how you retrieve, how you call the model, how you validate. Config owns the values that differ by environment and experiment. Mixing them is how “just change k” becomes a two-day pull request.""",
            why="""On the job, staging and production must be the same code with different pins and prompt labels. If production values are string literals, you cannot canary a prompt or roll back without a deploy. Interviewers ask how you would try a new model on 5 percent of traffic. The answer starts with “it is a config field behind a flag,” not “we branch the repo.”""",
            how="""Put a typed config object at the edge of `run()`.

Example fields: `model`, `prompt_ref`, `temperature`, `max_tokens`, `index`, `k`, `rerank`, `tools`, `step_cap`, `spend_cap`, `timeout_s`. Load from environment or a YAML file, validate with a schema, and refuse to start if a required field is missing.

Example. You want `k=4` in prod and `k=8` in an experiment. You change staging YAML, run the same eval command, and promote. The retriever code does not mention `4`. The trace logs the whole config so a bad answer names `k`.""",
            fails="""1. **Literals in the prompt builder.** `model=\"gpt-x\"` in three files. You update two.

2. **Config that is actually code.** A Python file with functions. Non-engineers cannot review a prompt label safely.

3. **No schema.** A typo in `temparature` silently uses a default and the gate lies.""",
            line="Model, prompt, retrieval, tools, timeouts, and budgets are configuration. I load a typed config, log it on every trace, and I can canary or roll back those values without rewriting the app.",
            walk="""A PM wants the cheaper model on internal traffic. You add `model` to config, set `internal.yaml` to the cheap pin, keep `prod.yaml` on the current pin, and run both through the suite. No function changed. The PR is a YAML diff plus scores.""",
            follow="""They ask about a prompt registry versus a file. Say: both are config. The registry adds labels and rollback; the file is fine until two environments need independent promotion.""",
            measure="Share of behaviour levers that can change without a code commit, and incidents caused by a literal that drifted across files.",
            kps=[
                "Behaviour levers belong in typed config, not in function literals.",
                "Same code, different pins and prompt labels per environment.",
                "Validate config on boot; typos must fail closed.",
                "Log the resolved config on every trace.",
                "Canary and rollback need config, not a rewrite.",
                "A Python “config” full of functions is still code.",
            ],
            qs=[
                {"q": "Which values should live in configuration rather than code for an LLM app?", "a": "Model pin, prompt reference, sampling, retrieval k and index, tool allow-list, timeouts, and spend or step caps. Control flow stays in code.", "kind": "recall"},
                {"q": "How do you try a new model on staging without a rewrite?", "a": "Point staging config at the new pin, run the same eval command, compare to the baseline, then promote the config. The service code stays put.", "kind": "apply"},
                {"q": "Quality differs between two replicas. What config bug is likely?", "a": "A literal or an env default that only one replica has, or a typo that silently fell back. Diff the resolved config on traces, not just the image tag.", "kind": "debug"},
                {"q": "Why validate config with a schema at process start?", "a": "So a missing pin or misspelled field fails the process instead of running on hidden defaults that the gate never saw.", "kind": "recall"},
                {"q": "Where does a prompt registry fit if you already have YAML?", "a": "The registry stores versioned text and labels; YAML (or env) stores which label this process should fetch. Both are config, not application logic.", "kind": "apply"},
            ],
            links=[MLFLOW, LANGFUSE],
        ),
        "pinned-model-dependency-versions": note(
            what="""A rebuild next month should produce the **same system** you have today. That requires **pins**: a model snapshot (not `latest`), locked library versions (`requirements.txt` / lockfile), a pinned embedding model, and recorded image bases.

Unpinned aliases are a vendor deploy you did not approve. Unpinned pip ranges are a silent change to tokenisers, HTTP clients, or SDK defaults. Either one can move quality without a commit you remember.""",
            why="""“It worked in March” is not an argument if you cannot rebuild March. Auditors and incident reviews ask for the pin. Interviewers ask what happens when the provider retires an alias. The answer is: we already pin; moving the pin is a release with a gate.""",
            how="""Pin four layers.

1. Product model snapshot id.
2. Embedder / reranker ids.
3. Application dependencies via a lockfile.
4. Base image digest, not `:latest`.

Example. Today you call `gpt-x-2026-03-01` and `text-emb-3`. The lockfile freezes `openai==x.y.z` and `httpx`. The Dockerfile says `FROM python@sha256:…`. Next month `gpt-x` alias moves. Your prod traces still show the March snapshot until you deliberately evaluate and move the pin.

Record pins in the release manifest. Rebuilding the image without a lockfile is not a pin.""",
            fails="""1. **`model=latest` in prod.** A vendor Tuesday becomes your incident.

2. **`package>=1.0` in a requirements file.** A rebuild pulls a tokenizer change.

3. **Pinning the chat model but not the embedder.** Retrieval drifts while generation looks “the same.”""",
            line="I pin model snapshots, embedders, lockfiles, and base image digests so a rebuild replays today’s system. Moving a pin is a gated release, not a surprise from `latest`.",
            walk="""A rebuild on a clean runner fails evals. Git is unchanged. The lockfile was missing; `pip install` pulled a new SDK that changed a default timeout and truncated streams. You commit the lockfile and pin the base digest. The next rebuild matches last week’s scores.""",
            follow="""They say “we want newest models automatically.” Reply: newest on a nightly eval job, promote by moving a pin. Automatic alias follow is an unreviewed deploy.""",
            measure="Share of production calls on snapshot ids (not aliases), lockfile presence on every image, and rebuild-to-rebuild eval delta on a frozen bundle.",
            kps=[
                "Pin chat snapshots, embedders, lockfiles, and base image digests.",
                "An alias is a vendor deploy you did not review.",
                "Moving a pin is a release with an eval gate.",
                "Unpinned pip ranges make rebuilds unreproducible.",
                "Pin the embedder or retrieval will drift while chat looks stable.",
                "Record pins on the release manifest and on traces.",
            ],
            qs=[
                {"q": "What must be pinned so a rebuild next month matches today?", "a": "Model snapshot, embedding and reranker ids, dependency lockfile, and base image digest. Aliases and floating version ranges are not pins.", "kind": "recall"},
                {"q": "The provider wants you on `latest` for “automatic improvements.” What do you do instead?", "a": "Keep production on a snapshot. Run `latest` in a shadow or nightly eval, and move the pin only after the gate passes.", "kind": "apply"},
                {"q": "Evals fail on a clean CI rebuild with no code change. Where do you look?", "a": "Lockfile and base image. An unpinned install or `:latest` base can change SDK defaults, tokenisers, or system libraries.", "kind": "debug"},
                {"q": "Why pin the embedding model even if chat is already pinned?", "a": "A new embedder reshapes the index and nearest neighbours. Chat quality then moves with no chat-model change.", "kind": "recall"},
                {"q": "What makes moving a pin different from following an alias?", "a": "You choose the time, run the suite, and record the new id on the manifest. An alias moves on the vendor’s clock with no gate.", "kind": "apply"},
            ],
            links=[MLFLOW],
        ),
        "traceable-from-the-first-request": note(
            what="""Every request should be **traceable from the first token you spend**. Attach a **request id**, the **prompt version**, and the **model version** (plus retrieval and tool ids when they exist) to every hop: logs, traces, model calls, and eval samples.

If the id starts only after the first model call, you lose the retrieval that caused the call. If the prompt version is missing, a bad answer cannot be mapped to a label you can roll back. Tracing is not a vendor checkbox; it is identifiers you chose on day one.""",
            why="""Incidents and user tickets arrive as “it said X at 14:03.” Without a request id you cannot find the trace. Without versions on that trace you cannot say what to revert. Interviewers ask how you debug a single bad answer. The first sentence should be “I open the trace by request id and read the manifest.”""",
            how="""Create `request_id` at the HTTP edge (or accept one from the client). Propagate it into retriever logs, the model client, tool calls, and the trace exporter. Set attributes: `prompt_id`, `model_id`, `index_id`, `config_hash`.

Example. A user forwards a screenshot. Support has a request id in the UI footer. You open Langfuse, see `prompt=v12`, `model=…-0301`, `k=6`, the retrieved chunk ids, and the guardrail that did not fire. You can add that input to the gold set in minutes. Without the footer, you have a Slack thread and a guess.""",
            fails="""1. **Id generated in the worker after retrieval.** The expensive miss has no id.

2. **Trace without versions.** You see tokens, not what to roll back.

3. **PII in the id or in logs “for traceability.”** You can trace and still fail compliance. Use opaque ids.""",
            line="I mint a request id at the edge and stamp prompt version, model pin, and retrieval ids on every hop. A ticket without those stamps is not debuggable, so I put the id in the UI and refuse to ship a path that cannot carry it.",
            walk="""Week one of production: a wrong fee. The UI shows `req_7f3`. The trace shows `prompt=v9` and chunk `policy-old`. You roll the prompt? No — the chunk is stale. You rebuild the index and add the question to the set. The id made the lever obvious.""",
            follow="""They ask about sampling traces to save money. Say: sample the payload if you must; keep the id and versions on 100 percent of requests or you cannot find the one ticket that matters.""",
            measure="Percent of requests with an edge-born id, percent of traces with prompt and model versions, and median time from ticket to named lever.",
            kps=[
                "Mint the request id at the HTTP edge, not after the first model call.",
                "Stamp prompt version, model pin, and retrieval ids on every hop.",
                "Show the id to the user or support cannot file a useful ticket.",
                "A trace without versions is a video with no labels.",
                "Keep ids on 100 percent of requests even if you sample payloads.",
                "Use opaque ids; do not put PII in the correlation key.",
            ],
            qs=[
                {"q": "What three identifiers should ride with every request from the first hop?", "a": "A request id minted at the edge, the prompt version, and the model version. Add retrieval and tool ids when those hops run.", "kind": "recall"},
                {"q": "A user reports a bad answer with only a timestamp. What product gap is that?", "a": "The UI or logs did not expose a request id. Add it to the footer and require it on tickets so you can open the exact trace.", "kind": "debug"},
                {"q": "Why mint the id at the edge rather than in the model client?", "a": "Retrieval and guardrails run first. If they fail or are slow, you still need a key to find those hops.", "kind": "recall"},
                {"q": "What do you keep at 100 percent if you sample full traces for cost?", "a": "The request id and the version stamps. Sample payloads, not identity, or you cannot find the one complaint.", "kind": "apply"},
                {"q": "How does a stamped trace turn into an eval case?", "a": "Open the request, export the input, retrieved ids, and expected fix, and add it to the versioned gold set with a pointer back to the request id.", "kind": "apply"},
            ],
            links=[LANGFUSE],
        ),
        "the-level-7-eval-set-as-yardstick": note(
            what="""The **Level 7 evaluation dataset** is the **fixed yardstick** for this level. Every later change — prompt, pin, retrieval, guard, serving tweak — is measured against that set (or a clearly versioned successor) before you call the change a win.

A moving target is not a yardstick. If you add cases only when a change would fail, you are negotiating with the exam. If you replace the set whenever a model family changes, you cannot compare months. Carry the set forward, version it, and let it grow through a review process, not through panic.""",
            why="""Without a yardstick, LLMOps becomes opinions. The new prompt “feels better.” The new model “looks faster.” Interviewers ask how you know a release is safe. “We have the Level 7 set in CI with thresholds versus a recorded baseline” is the answer that belongs to this level.""",
            how="""Store the set as a versioned artefact (`l7-gold@v8`). Record which version each release beat. When you add a production miss, you mint `v9` and you do not silently drop old cases.

Example. Prompt `v14` scores 0.81 faithfulness on `v8` versus a 0.86 baseline. The gate fails. Someone offers a new set where `v14` scores 0.90. You refuse. You fix the prompt or you accept a documented threshold change with a review, not a quieter exam.

Use a fast subset of the same set on every commit and the full set before release, so the yardstick stays one object.""",
            fails="""1. **A new set per experiment.** You cannot compare.

2. **Deleting hard cases to go green.** The gate becomes theatre.

3. **Never adding production misses.** The yardstick ages out of the live distribution.""",
            line="The Level 7 set is the yardstick every later change must beat. I version it, I record scores against a baseline, and I will not swap in a friendlier set to pass a prompt I already know is worse.",
            walk="""A model pin looks great on a 20-row demo set and scores 0.62 on `l7-gold@v8`. You keep `v8` in CI and reject the pin. Two weeks later you add six production misses as `v9` after review. The pin is still rejected. The story is the yardstick, not the demo.""",
            follow="""They ask if synthetic cases can replace Level 7. Say: they can extend after human review. They do not replace the real-task set you already paid to label.""",
            measure="Releases scored on the current gold version, count of cases dropped without review, and production misses added per month.",
            kps=[
                "Carry the Level 7 set forward as the fixed yardstick.",
                "Version the set; record which version each release beat.",
                "Do not replace the exam to pass a weaker prompt.",
                "Grow the set from production misses through review.",
                "Fast subset and full set are slices of the same artefact.",
                "A demo set of twenty rows is not the yardstick.",
            ],
            qs=[
                {"q": "What is the yardstick for changes in this level?", "a": "The versioned Level 7 evaluation set (or a reviewed successor). Every prompt, pin, and retrieval change is scored against it versus a recorded baseline.", "kind": "recall"},
                {"q": "A new prompt fails gold but wins on a fresh 20-row set. What do you ship?", "a": "Neither until gold passes. The 20-row set is a demo. Fix the prompt or make a documented, reviewed threshold change — do not swap the exam.", "kind": "apply"},
                {"q": "Why version the gold set instead of editing it in place?", "a": "So you can say which cases a past release actually beat, and so adding a miss is a reviewed `vN+1`, not a silent rewrite of history.", "kind": "recall"},
                {"q": "How should the set change after a production incident?", "a": "Add the miss as a new versioned case after review, keep the old cases, and require the next release to pass the new version.", "kind": "apply"},
                {"q": "A teammate deletes three failing cases to go green before a demo. What do you do?", "a": "Revert the deletion, fail the demo if needed, and treat it as a process incident. A gate that can be edited to pass is not a gate.", "kind": "debug"},
            ],
            links=[MLFLOW],
        ),
        "feature-flags-on-prompts": note(
            what="""A **feature flag on a prompt** lets you choose which prompt version a request uses without rebuilding the image. Typical shape: flag `prompt_support` → `v12` or `v13`, possibly by tenant, percentage, or internal user.

Flags are how you canary and how you **flip back without a rebuild**. They are not a substitute for versioning: the flag points at a registry id. If the flag stores raw prompt text, you are back to untracked edits.""",
            why="""Prompt regressions should take seconds to undo, not a Docker rebuild and a deploy window. Interviewers ask how you would stop a bad wording at 2 a.m. The senior answer is “move the flag to the last good label,” not “hotfix the container.”""",
            how="""Resolve the prompt id at request start from a flag service or config, fetch that version (with a pinned fallback), and stamp the id on the trace.

Example. You set `prompt_support=v13` for 5 percent of traffic. Online eval and spend look fine for two hours. You raise to 50 percent, then 100 percent. At 40 percent faithfulness dips. You set the flag back to `v12`. No image moved. The rollback is the flag.

Guard the flag: only known registry ids, default deny to the last production label if the flag service is down.""",
            fails="""1. **Flag holds raw text.** You have reinvented the unversioned dashboard.

2. **Flag without a fallback.** Flag service outage becomes a prod outage.

3. **One flag for prompt and model.** You cannot roll back only the wording.""",
            line="Prompt flags point at versioned labels so I can canary and flip back without a rebuild. The flag is a pointer, not a paste bin, and it fails to the last good label if the flag service dies.",
            walk="""You ship `v15` to 5 percent. Traces show a new refund promise. You flip the flag to `v14` in one minute. Later you delete `v15` from `prod` eligibility. The image tag never changed; the incident timeline still has prompt ids.""",
            follow="""They ask if flags replace CI. Say: no. Flags change who sees an already-built, already-gated version. A brand-new text still goes through the registry and the suite before the flag can point at it.""",
            measure="Time to flip back a prompt, share of prompt rollbacks that needed no image deploy, and flag-service fallback hits.",
            kps=[
                "Flags select a prompt version; they do not store unversioned text.",
                "Flip back without a rebuild is the reason they exist.",
                "Canary by percentage or tenant, then raise or revert.",
                "Fail to the last good label if the flag service is down.",
                "Do not bundle model pin and prompt on one flag.",
                "New text still passes the eval gate before a flag can point at it.",
            ],
            qs=[
                {"q": "What does a feature flag on a prompt actually store?", "a": "A pointer to a versioned prompt id or label, optionally with a percentage or tenant rule. Not the raw prompt text.", "kind": "recall"},
                {"q": "A new prompt looks harmful at 5 percent. How do you stop it at 2 a.m.?", "a": "Point the flag back at the last good label. Do not rebuild the image. Then record the ids in the incident note.", "kind": "apply"},
                {"q": "The flag service is down and the app starts failing closed on every request. What was missing?", "a": "A pinned local fallback to the last production prompt label so a flag outage is not a product outage.", "kind": "debug"},
                {"q": "Why not put the model pin on the same flag as the prompt?", "a": "You need to revert wording without changing the model, and the other way around. Separate levers, same gate.", "kind": "apply"},
                {"q": "Where do flags sit relative to the eval gate?", "a": "After. The version must already have passed the suite. The flag only chooses who receives that version.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
        "contract-tests-on-the-output-schema": note(
            what="""**Contract tests on the output schema** treat the model’s structured output as an API. If a required field disappears, changes type, or violates an enum, the **build breaks** — before a caller in billing or the UI does.

This is narrower than a quality gate. Faithfulness can pass while `order_id` becomes a sentence. Schema tests are cheap, deterministic, and belong next to unit tests as well as inside the eval suite.""",
            why="""Downstream services parse JSON. A fluent, schema-breaking answer is an incident. Interviewers ask how you stop the model from dropping a field after a prompt tweak. “We have contract tests on the schema and we re-ask or fail the gate” is the engineering answer.""",
            how="""Define the schema once (JSON Schema or a typed model). In CI, run a bag of fixtures — including adversarial ones — and assert parse + required fields + types. In runtime, validate and re-ask or fail closed.

Example. The ticket router must emit `{label, confidence, queue}`. A prompt “be more helpful” adds a `note` and drops `queue`. Contract tests fail on 40 of 40 fixtures. The quality judge might still have called the label fine. You never promote.

Keep the schema in the repo next to the prompt id that is supposed to satisfy it. A schema change is its own review.""",
            fails="""1. **Schema only in the system prompt.** The model “tries.” CI does not enforce.

2. **Optional everything.** The contract cannot fail, so it cannot protect callers.

3. **Breaking the schema to pass a judge.** You shipped stringly types and called it quality.""",
            line="Structured outputs are an API. I keep contract tests on the schema in CI so a missing field fails the build, and I validate again at runtime with a re-ask or a hard fail — not hope in a prompt.",
            walk="""A prompt change goes green on faithfulness and red on contract tests: `total_cents` is now `\"12.50 USD\"`. You refuse the promote, tighten the schema instruction, and add that fixture. Billing never sees the string.""",
            follow="""They ask if structured-output mode from the provider replaces tests. Say: it reduces breaks; I still test, because prompts, tools, and wrappers can bypass or wrap the field.""",
            measure="Contract-test failures caught in CI versus in production parse errors, and time from schema change to fixture update.",
            kps=[
                "Treat model JSON as an API with contract tests in CI.",
                "A missing or mistyped field must break the build.",
                "Quality judges can pass while the schema is already broken.",
                "Validate again at runtime; re-ask or fail closed.",
                "Keep schema and prompt version side by side.",
                "Provider structured-output modes do not replace fixtures.",
            ],
            qs=[
                {"q": "What is a contract test on an LLM output schema?", "a": "An automated check that parsed outputs still have the required fields and types. If a field disappears or changes type, CI fails even if the text looks good.", "kind": "recall"},
                {"q": "Faithfulness is up but the billing parser is throwing. What test was missing?", "a": "A schema contract on fields like amounts and ids. Add fixtures and fail the build when types drift.", "kind": "debug"},
                {"q": "Where should schema contracts run besides CI?", "a": "At runtime on every response: validate, re-ask once, then fail closed or route to a human — do not send broken JSON downstream.", "kind": "apply"},
                {"q": "Why not make every field optional to keep tests green?", "a": "Then the contract cannot fail and callers still break. Required fields are the point of the contract.", "kind": "recall"},
                {"q": "A provider offers structured outputs. Why keep fixtures?", "a": "Prompts, wrappers, and tools can still emit the wrong shape. Fixtures lock the contract you promised to callers.", "kind": "apply"},
            ],
            links=[STRUCTURED],
        ),
        "interview": note(
            what="""When someone asks what **production-ready** means for an LLM app, give a checklist, not a vendor name: **timeouts**, **logs** (with request ids and versions), an **eval gate**, a **rollback**, and a **budget cap**.

That list is the interview line for this module. It maps to real artefacts: request and model timeouts plus disconnect handling; traces that carry the bundle; CI that runs the Level 7 yardstick; a way to move a prompt label or a known image tag back; a per-request and daily spend cap so a loop cannot empty the account.

If you cannot point at each artefact, you are not production-ready. A streaming UI alone is a demo.""",
            why="""This is the question you will actually get. Hiring managers have been burned by demos. They listen for whether you mention quality gates and money, or only Docker. On the job the same list is how you push back on “just ship it.”""",
            how="""Answer in thirty seconds, then offer evidence.

“Production-ready means every call has timeouts, every request is logged with prompt and model versions, no change lands without the eval gate, I can roll back a prompt or an image without a rebuild, and spend is capped per request and per day.”

Example evidence: a CI log where a broken prompt failed the gate; a flag flip that restored `v12`; a trace with `req_…` and pins; a config field `spend_cap_usd=0.25`; a 15s model timeout that cancelled a disconnect.

If they press on observability, add online samples. If they press on security, add guardrails. Do not drop the five.""",
            fails="""1. **Listing tools instead of properties.** “We use Langfuse” is not timeouts or a cap.

2. **Rollback of only the container.** They will ask about the prompt.

3. **No number on the budget.** “We watch spend” is not a cap.""",
            line="Production-ready means timeouts, versioned logs, an eval gate, a rollback that includes the prompt id, and a hard budget cap. If I cannot show each artefact, I will call it a demo.",
            walk="""You are asked “is it prod ready?” on a panel. You draw five boxes, attach one artefact to each, and mention the last time the gate blocked you. The panel stops asking about Kubernetes.""",
            follow="""They add “what about scale?” Reply: scale comes after this list. An uncapped, un-gated, un-traced service that scales will only fail louder.""",
            measure="Whether you can demo all five artefacts in one sitting, and the last date each was actually used (gate fail, rollback, cap trip).",
            kps=[
                "Production-ready: timeouts, logs, eval gate, rollback, budget cap.",
                "Name artefacts, not only vendors.",
                "Rollback includes prompt id, not only the image tag.",
                "A budget cap is a number that can trip, not a dashboard.",
                "A streaming UI without this list is a demo.",
                "Scale after the five; scaling an ungated app amplifies failure.",
            ],
            qs=[
                {"q": "What five things do you name when asked if an LLM app is production-ready?", "a": "Timeouts, versioned logs / traces, an eval gate, a rollback (prompt and image), and a budget cap. Be ready to point at an artefact for each.", "kind": "recall"},
                {"q": "A candidate says they are production-ready because they use Docker and Langfuse. What is missing?", "a": "A gate, a rollback that includes the prompt, timeouts, and a numeric spend cap. Tools are not the checklist.", "kind": "apply"},
                {"q": "Which rollback do interviewers expect besides the container?", "a": "Moving the production prompt label (or flag) back to the last good version without a rebuild.", "kind": "recall"},
                {"q": "How do you show that a budget cap is real?", "a": "A config number, a trip in traces or a drill where a loop stopped, and an alert. A spend graph with no trip is not a cap.", "kind": "apply"},
                {"q": "Why are timeouts on the list and not only retries?", "a": "Retries without timeouts and disconnect handling keep spending tokens on abandoned clients and hung providers. Timeouts stop the spend.", "kind": "debug"},
            ],
            links=[LANGFUSE, MLFLOW],
        ),
    }
}
