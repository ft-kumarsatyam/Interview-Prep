from helper import note, MLFLOW, LANGFUSE

NODES = {
    "m10-1": {
        "llmops-vs-mlops": note(
            what="""**MLOps** is the practice of shipping models you train: data pipelines, training jobs, a model registry, deployment, and drift monitors. **LLMOps** keeps those habits and changes the unit of work. Most product teams no longer train the foundation model. They call a hosted one and operate a bundle around it: prompts, retrieval, tools, evals, guardrails, and the service that ties them together.

The artefact you ship is rarely a weights file. It is a versioned bundle. Evaluation is rarely a single accuracy number; answers are free text, so you need rubrics, judges, and human review. Cost is per token. Latency is per request and per loop. New failures appear: hallucination, prompt injection, provider outages, and silent model updates behind an alias.

What does not change is the operating spine: version control, CI, staged rollout, monitoring, rollback, and a written review after an incident. LLMOps is not a rebrand that deletes those. It is MLOps with a different unit of change and a harder quality problem.""",
            why="""On the job this is how you stop treating a chatbot as a weekend script. The week after launch, someone edits a prompt in a dashboard, the provider swaps a model alias, and the index goes stale. Without LLMOps you cannot name what changed or roll it back. With it, every change is a release with a gate.

Interviewers use “do you know MLOps?” as a filter and then ask what is different for LLMs. The junior answer is “we use LangChain”. The senior answer names the bundle, the fuzzy eval, the per-token cost, and the practices that still apply when you never train a weight.""",
            how="""Write the two columns on a whiteboard before you pick tools.

MLOps column: dataset version, training run, metric on a test set, registered checkpoint, canary of a model server.
LLMOps column: prompt version, pinned model id, retriever and index ids, tool schemas, eval-set version, image tag, budget cap.

Example. A support bot calls a hosted chat API. You do not stand up a training cluster. You do pin `gpt-x-2026-03-01` instead of `gpt-x-latest`, store prompt `support-v12` in a registry, record chunk size and top-k in MLflow, and fail CI when faithfulness drops below last week’s baseline. That is application LLMOps. If you later fine-tune an embedder, you add a slice of classic MLOps for that component only.

Keep a one-page map of which practices you inherited (CI, rollback) and which you added (judge metrics, token budgets, prompt labels).""",
            fails="""1. **Renaming the team and changing nothing.** “We do LLMOps now” while prompts live in a wiki and deploys skip evals. The word does not create a gate.

2. **Copying a weights registry as the only artefact.** A model registry that ignores prompts and indexes cannot reproduce Tuesday’s answers.

3. **Treating HTTP 200 as quality.** The provider returned tokens. That is not evidence the answer was grounded or cheap.""",
            line="LLMOps is MLOps with a different unit of change: a prompt, model pin, retriever, and tool bundle, judged with fuzzy metrics and per-token cost. I keep CI, rollback, and monitoring, and I add eval gates and pins because the model vendor can move under me.",
            walk="""A bank chatbot “got worse on Monday” with no app deploy. The alias `gpt-x` had moved. You show the release manifest from Friday: model pin, prompt `v11`, index `docs-2026-03-18`. You re-pin, re-run the Level 7 set, and quality returns. The postmortem is “we were doing MLOps slogans and not pinning the LLM bundle,” not “the model is random.”""",
            follow="""If they ask whether you still need a model registry, say: yes if you train or host weights; for a hosted API the registry that matters is the bundle manifest — prompt, pin, index, tools — logged on every trace.""",
            measure="Share of production traces that carry a complete bundle id, eval-gate fail rate per week, and time-to-rollback when a prompt or pin is bad.",
            kps=[
                "MLOps ships trained weights; LLMOps mostly ships a prompt-model-retriever bundle.",
                "Free-text eval, per-token cost, and provider drift are the new hard parts.",
                "CI, staging, monitoring, and rollback still apply when you never train.",
                "A 200 from the model API is not a quality signal.",
                "Name every part of the bundle or you cannot reproduce an incident.",
                "Interview: different unit of change, same operating spine.",
            ],
            qs=[
                {"q": "How does LLMOps differ from classic MLOps for a hosted-API team?", "a": "The unit of change is a prompt, model pin, retriever, and tool bundle rather than trained weights. Evaluation of free text needs judges and rubrics. Cost and latency are per token and per request. Shared habits: versioning, CI/CD, monitoring, rollback.", "kind": "recall"},
                {"q": "Your team never trains models. Which MLOps practices still apply?", "a": "Version everything, run tests and an eval gate in CI, stage deploys with rollback, monitor latency, errors, spend and quality, and review incidents. Skip training pipelines unless you fine-tune or host an embedder.", "kind": "apply"},
                {"q": "A lead says LLMOps is just MLOps with a new name. What do you correct?", "a": "The spine is the same, the artefact is not. If they only version weights they will miss prompt, index, and pin changes. Show a Monday incident caused by an alias move with no deploy.", "kind": "debug"},
                {"q": "Why is evaluation harder in LLMOps than in a classifier pipeline?", "a": "Outputs are free text, so exact-match accuracy is the wrong default. You need task metrics, judges, rubrics, and human review on a versioned set, plus online samples.", "kind": "recall"},
                {"q": "What belongs in the LLMOps column that would not be in a classic training card?", "a": "Prompt version and label, pinned model id, retrieval and index ids, tool schemas, token budget, and the eval-set version the bundle beat.", "kind": "apply"},
            ],
            links=[MLFLOW, LANGFUSE],
        ),
        "application-vs-model-llmops": note(
            what="""LLMOps splits into two layers that people collapse into one job title.

**Model LLMOps** owns the model itself: pre-training or fine-tuning, checkpoints, GPU serving, batching, KV-cache, quantisation, and throughput. Teams that self-host or adapt weights own this surface.

**Application LLMOps** owns everything built on a model you call: prompt management, retrieval, tools, evals, guardrails, tracing, cost caps, and deploying the app service. Most AI engineers live here.

Rule of thumb: if the deploy artefact is a container that calls an API, you are doing application LLMOps. If it is a GPU box serving weights, you also own model LLMOps. This level trains the application layer and only touches model serving when you choose to self-host later.""",
            why="""On the job, hiring and on-call rot when these layers mix. A platform team pages an application engineer for a CUDA OOM. An application team pages a researcher because a prompt regressed. Draw the boundary so each side has a runbook.

In interviews, “we need GPU ops” on a five-person startup calling a hosted API is a tell. So is “we only do prompts” when the company hosts a 70B. State which layer you have owned and what you would add before claiming both.""",
            how="""Classify every component.

Application: FastAPI service, prompt registry, retriever, tool adapters, eval gate, guardrails, Streamlit or web UI, CI image, token budget.
Model: training job, adapter weights, inference server, GPU autoscaler, quantisation recipe.

Example. A startup calls a hosted chat API and a hosted embedder. They need application LLMOps: traces, evals, pins, secrets, a streaming backend. They do not need a GPU on-call. Six months later they fine-tune a 3B router. That one component gets a slice of model LLMOps; the chat path stays on the API.

Write the split in the design doc so finance does not fund a cluster for a problem a pin and a prompt would fix.""",
            fails="""1. **Buying GPUs to look serious.** The product is still a thin client over a public API. You now own two operational surfaces and still have no eval gate.

2. **Assuming the API vendor does application LLMOps for you.** They host tokens. They do not version your prompts, indexes, or tools.

3. **One on-call for both layers.** CUDA pages drown prompt regressions. Split the rotation or you will ignore quality.""",
            line="Application LLMOps runs the product on top of a model you call. Model LLMOps trains and serves weights. Most teams only own the first; I will not staff GPUs until a measured reason — privacy, cost at volume, or a tune — forces the second.",
            walk="""A CTO asks for a “GPU hire” after a demo. You list weekly spend ($2.1k on the API), peak QPS (12), and the absence of an eval gate. You hire for application LLMOps, pin the model, and put a faithfulness gate in CI. Three months later volume is 20× and a privacy review forbids the public API for one workflow. Then you staff model serving for that workflow only.""",
            follow="""They may ask if managed inference is model LLMOps. Say: it is a middle rung — you still choose pins and evals, but you do not own kernels. Evaluate it before you buy a cluster.""",
            measure="Share of services that only call APIs versus host weights, pages per layer, and whether each hosted model has an eval owner.",
            kps=[
                "Model LLMOps: weights, GPUs, serving. Application LLMOps: prompts, retrieval, evals, guardrails.",
                "Most product teams only own the application layer.",
                "Self-hosting adds a second operational surface, not a badge.",
                "The API vendor does not version your prompts or indexes.",
                "Split on-call so CUDA pages do not hide prompt regressions.",
                "Add model ops only for privacy, volume cost, or a real tune.",
            ],
            qs=[
                {"q": "What is the difference between application and model LLMOps?", "a": "Model LLMOps covers training, fine-tuning, and serving weights. Application LLMOps covers prompts, retrieval, tools, evals, guardrails, tracing, and deploying the service that calls a model.", "kind": "recall"},
                {"q": "A startup calls a hosted API and asks if they need a GPU ops engineer. What do you say?", "a": "Not yet. They need application LLMOps: eval gates, tracing, guardrails, cost limits, CI/CD. GPU ops starts if they self-host for privacy, cost at high volume, or a tune — and managed inference should be evaluated first.", "kind": "apply"},
                {"q": "On-call is drowning in CUDA OOMs while prompt regressions sit for days. What is broken?", "a": "One rotation owns both layers. Split model-serving pages from application quality pages, or the cheaper, more frequent prompt failures will lose.", "kind": "debug"},
                {"q": "When does a hosted-API team start owning a slice of model LLMOps?", "a": "When they fine-tune, host an embedder, or move a workflow onto their own GPUs. Keep the rest of the product on application LLMOps.", "kind": "apply"},
                {"q": "Why is “the vendor hosts the model” not the same as “we have LLMOps”?", "a": "The vendor hosts tokens. You still must version prompts, pins, indexes, tools, evals, and rollback. That is application LLMOps and it is yours.", "kind": "recall"},
            ],
            links=[MLFLOW],
        ),
        "why-llm-systems-are-hard-to-operate": note(
            what="""LLM systems break the assumptions ordinary services rely on.

**Non-determinism:** the same input can yield different tokens, so exact-string tests flake unless you pin sampling or use fuzzy checks.
**Quality is not a status code:** a 200 can be a fluent lie. Health must include content.
**Silent upstream change:** a provider can move an alias or deprecate a snapshot and behaviour shifts with no deploy on your side.
**Variable cost and latency:** tokens and loops bill you; one runaway agent can dominate the month.
**Untrusted text:** user input and retrieved pages can steer the model (prompt injection).
**Coupled parts:** prompt, chunking, index, tools, and model interact, so one “small” change moves several metrics at once.

Mitigation is a pattern, not a tool: pin versions, trace every hop, gate releases on evals, put runtime guards and budgets in front of the model, and watch quality online.""",
            why="""This is why a CRUD playbook fails. You can have green Kubernetes and a product that quietly started inventing refunds. Leadership will ask “what broke?” and the honest answer is often “a pin, a prompt, or an index, and we were not looking.”

Interviewers love “users say it got worse and we did not deploy.” They are testing whether you look at aliases, traces, retrieval, and traffic mix, or only at your last commit.""",
            how="""For each assumption, write the control.

- Non-determinism → temperature 0 or a band, repeat the gate, never exact-match poetry.
- Quality ≠ 200 → offline suite + sampled online judges + user flags.
- Upstream change → pin snapshots; moving a pin is a release.
- Cost/latency → per-request token and step caps; alerts on daily spend.
- Injection → input/output filters as code, not only a system prompt.
- Coupling → one change at a time, same eval command, isolate which lever moved.

Example. Monday quality drops. You check: pin unchanged, prompt `v14` shipped Friday without a gate, index crawl ran Sunday. You revert the prompt label, re-run the suite, then inspect the crawl. Two coupled changes had been blamed on “the model being random.”""",
            fails="""1. **Exact-string CI on sampled outputs.** The build is red on Tuesdays and the team starts skipping the job.

2. **Health checks that ping `/health` only.** The model is up; the answers are wrong. Customers page you first.

3. **One big Friday dump.** Prompt, model, and chunk size move together. You cannot tell which lever hurt faithfulness.""",
            line="LLM apps are hard because outputs are fuzzy, quality hides behind HTTP 200, vendors can move, and every token costs. I pin the model, version the rest of the bundle, gate on evals, cap spend, and treat a quality drop with no deploy as an incident.",
            walk="""Week-over-week faithfulness falls 0.11 with no app release. Traces show the alias `latest` moved and the Sunday crawl added scanned PDFs. You pin Friday’s snapshot, pause the crawl, and faithfulness returns to 0.86. You add “alias move” and “index delta” to the incident checklist so the next drop is not called random.""",
            follow="""They may say “just set temperature to 0.” Reply: that reduces sampling noise; it does not stop alias moves, injection, or a stale index. Pin and trace still come first.""",
            measure="Share of calls on a pinned snapshot, quality delta with no deploy, and incidents where two bundle parts moved at once.",
            kps=[
                "Outputs are non-deterministic; a 200 can still be wrong.",
                "Providers can change models underneath an alias.",
                "Cost and latency vary with tokens and agent loops.",
                "User and retrieved text are untrusted input.",
                "Prompt, index, tools, and model are coupled; change one at a time.",
                "Pin, trace, gate, guard, and budget are the default controls.",
            ],
            qs=[
                {"q": "Name four reasons LLM apps are harder to operate than a CRUD service.", "a": "Non-deterministic outputs, correctness not visible in status codes, silent provider changes, token-driven cost and latency, prompt injection, and coupled prompt/retriever/model parts. Any four with a sentence each.", "kind": "recall"},
                {"q": "Users say answers got worse last week; no deploy happened. What are your first checks?", "a": "Whether the model alias moved, traces and eval scores week over week, retrieval or index changes, and traffic mix. Re-run the versioned eval set before you blame the model.", "kind": "debug"},
                {"q": "Why is a green /health endpoint not enough for an LLM app?", "a": "It only proves process and maybe provider reachability. Fluent wrong answers still return 200. You need content metrics and sampled online evals.", "kind": "recall"},
                {"q": "How do you keep two coupled changes from hiding the guilty lever?", "a": "Ship prompt, model, and data changes separately, each through the same eval command, and record which lever is in the release manifest.", "kind": "apply"},
                {"q": "What control do you add for a runaway agent loop?", "a": "Hard caps on steps, retries, and spend per request, plus a trace that shows loop count so a cost spike has a name.", "kind": "apply"},
            ],
            links=[LANGFUSE, MLFLOW],
        ),
        "what-a-release-consists-of": note(
            what="""A release of an LLM application is not “the new container.” It is a **bundle of versioned parts that were live together**:

1. Application code (image tag / commit).
2. Prompts and templates (registry version or label).
3. Model id and parameters (pinned snapshot, temperature, max tokens).
4. Retrieval: embedding model, chunking, index version, top-k, reranker.
5. Tool definitions and guardrail or policy configs.
6. Eval-set version and the scores that bundle achieved.

Change any one part and behaviour can change. If you cannot name the six, you cannot roll back Tuesday. The written form is a **release manifest** logged on every trace and stored next to the deploy.""",
            why="""Incidents die in the gap between “we reverted the image” and “the prompt in the dashboard is still v19.” Support will ask for last week’s answers and you will not be able to reproduce them.

Interviewers ask “what is in a release?” to see if you think like a platform engineer or like a notebook author. Listing only git SHA is a fail. Listing the bundle and the eval scores it carried is a pass.""",
            how="""Build the manifest as JSON or labels you refuse to deploy without.

Example fields: `git=a1b2`, `image=app:a1b2`, `prompt=support@prod=v12`, `model=gpt-x-2026-03-01`, `temp=0`, `index=docs-2026-03-18`, `embed=text-x-003`, `topk=6`, `tools=billing@v3`, `evalset=l7-gold@v8`, `faithfulness=0.87`.

Ship process: change one field, run the same eval command, write the new manifest, promote a label. Rollback is moving labels and/or redeploying a known image — both, if both moved.

Example. Quality drops after “a small prompt tweak.” The image tag is unchanged. The manifest on traces now says `prompt=v13`. You move `prod` back to `v12` without rebuilding. That only works because the prompt was in the bundle, not in an anonymous dashboard field.""",
            fails="""1. **Dashboard edits with no version.** Nobody can reproduce last Tuesday.

2. **Image rollback that leaves the new prompt label.** You “rolled back” and the regression stayed.

3. **Eval scores not stored on the release.** You cannot tell whether a later drop is new or you shipped already-worse.""",
            line="A release is code plus prompts plus model pin plus retrieval plus tools plus the eval scores that bundle beat. I write a manifest, log it on traces, and I will not call a revert done until every part of that manifest is back.",
            walk="""You are paged for invented fees. Traces show `prompt=v13`, `index=docs-2026-03-20`, `model` unchanged. You roll `prod` to `prompt=v12` first; scores recover. The new index stays. The incident note lists both ids so the next person does not revert the container and miss the prompt.""",
            follow="""They ask if feature flags replace a manifest. Say: flags flip which prompt id is live; they do not replace recording which id, pin, and index served a given request.""",
            measure="Percent of traces with a complete manifest, rollback time when only the prompt moved, and releases that changed more than one bundle field at once.",
            kps=[
                "A release is code, prompts, model, retrieval, tools, and eval scores together.",
                "Every part needs a version and a record of what was live with it.",
                "Unversioned dashboard prompt edits make incidents unreproducible.",
                "Rolling back the container is not enough if the prompt label moved.",
                "Log the manifest on every trace.",
                "Change one lever at a time through the same eval command.",
            ],
            qs=[
                {"q": "What components make up a release of an LLM application?", "a": "Code image, prompt versions, model id and params, retrieval config and index, tool and guardrail configs, plus the eval set and scores. All versioned and recorded together.", "kind": "recall"},
                {"q": "A prompt was changed in a live admin UI and quality dropped. What process gap is that, and the fix?", "a": "The prompt was not versioned, evaluated, or gated. Store it in a registry, promote a label after the suite, log the version on traces, and roll back by moving the label.", "kind": "debug"},
                {"q": "Why can reverting the container leave a regression in place?", "a": "The prompt, index, or model pin may live outside the image. Rollback has to restore the whole manifest, not only the tag.", "kind": "recall"},
                {"q": "What would you refuse to write on a release ticket?", "a": "“Updated the bot.” Demand the prompt id, pin, index id, image tag, and the eval scores versus baseline.", "kind": "apply"},
                {"q": "Where should the release manifest appear besides the deploy log?", "a": "On every request trace, so a bad answer can be tied to the exact bundle that produced it.", "kind": "apply"},
            ],
            links=[LANGFUSE, MLFLOW],
        ),
        "operating-rag-vs-agents": note(
            what="""Operating a **RAG** application and operating an **agent** share pins, traces, and eval gates. The dominant failure modes do not.

RAG dies from **stale or drifted retrieval**: the index lags the corpus, chunking changes, embeddings change, or the retriever starts returning lookalikes. Users see confident answers citing last quarter’s policy. Loops are short; cost is mostly one embed plus one generate.

Agents die from **control-flow failures**: runaway loops, bad tool choice, tool errors, spend spikes, and state that diverges from what the user heard. Cost and latency have a long tail because step count is data-dependent.

You still version the bundle. You add different budgets, different metrics, and different runbooks.""",
            why="""On-call is different. A RAG page is often “faithfulness fell after the crawl.” An agent page is often “one user burned $80 in twelve minutes.” If you monitor only p95 HTTP latency you will miss both.

Interviewers ask you to compare the two to see if you have operated either. Naming “hallucination” for both without retrieval drift or loop caps is a shallow answer.""",
            how="""Write two columns of signals and levers.

RAG signals: retrieval hit rate, contextual precision, index age, empty-retrieve rate, citation validity.
RAG levers: rebuild or roll back the index, pin the embedder, change k, stop a bad crawl.

Agent signals: steps per task, tool error rate, spend per session, loop-without-progress, human-escalation rate.
Agent levers: step and spend caps, tool allow-lists, argument validation, kill a bad tool version.

Example. The same product has a policy RAG path and a “refund agent.” The RAG path pages when index age exceeds 24h or faithfulness < 0.8. The agent path pages when steps > 12 or spend > $1 per session. Shared: model pin and prompt labels. Different: the first action on the page.""",
            fails="""1. **One dashboard for both.** Average latency hides a 40-step tail.

2. **Copying RAG evals onto an agent.** Faithfulness does not tell you the agent called the wrong tool.

3. **No spend cap on the agent.** A retry loop becomes a finance incident before it is a quality one.""",
            line="RAG operations centre on index freshness and retrieval quality. Agent operations centre on loop control, tool failures, and spend tails. I share pins and traces, and I give each path its own metrics, caps, and first action in the runbook.",
            walk="""Friday: RAG faithfulness 0.71 after a crawl of scanned PDFs. You roll the index to Thursday and pause the crawl. Saturday: the refund agent hits 30 steps on one tenant. You trip the spend cap, disable the broken `search_orders` tool version, and add that trace as an eval case. Two incidents, two levers, one shared pin.""",
            follow="""They ask if an agent that only retrieves is “just RAG.” Say: if the path is retrieve-then-answer with no tool loop, operate it as RAG. If it can call tools in a loop, you owe agent caps even when the first tool is retrieval.""",
            measure="Index age and contextual precision for RAG; steps, tool errors, and spend per session for agents; plus shared pin coverage.",
            kps=[
                "RAG incidents cluster on stale indexes and retrieval drift.",
                "Agent incidents cluster on loops, tool errors, and spend tails.",
                "Share pins, traces, and eval gates; split metrics and first actions.",
                "Average latency hides the agent long tail.",
                "Faithfulness is not a tool-selection metric.",
                "Cap steps and spend before you debug an agent in production.",
            ],
            qs=[
                {"q": "How does operating RAG differ from operating an agent?", "a": "RAG: watch index freshness, retrieval metrics, and citation validity; levers are rebuilds and embedder pins. Agents: watch steps, tool errors, and spend; levers are caps, allow-lists, and disabling a tool. Both version the bundle.", "kind": "recall"},
                {"q": "You have one Grafana board averaging latency for a product that is half RAG and half agent. What do you split?", "a": "Add index age and faithfulness for RAG, and steps/spend/tool errors for the agent. A single p95 will hide both a stale index and a runaway loop.", "kind": "apply"},
                {"q": "Faithfulness is stable but weekly cost doubled. Where do you look first?", "a": "Agent step counts and spend per session, plus a new tool or retry policy. RAG cost rarely explodes without a retrieval-size change, which you would also see in tokens.", "kind": "debug"},
                {"q": "What is a RAG-specific first action that would be wrong for a runaway agent?", "a": "Rolling back or rebuilding the index. That will not stop a loop; you need a step or spend cap and possibly to disable a tool.", "kind": "apply"},
                {"q": "Why might an agent that “only searches then answers” still need agent ops?", "a": "If it can retry, call more tools, or loop, step and spend tails exist. Operate it as an agent until the path is a fixed retrieve-then-generate graph.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
        "the-lifecycle-of-this-level": note(
            what="""This level follows a single lifecycle you should be able to draw without notes:

**track → evaluate → guard → serve → ship → deploy → monitor → improve.**

Track experiments and prompts. Evaluate every change against a fixed yardstick. Guard inputs, outputs, and agent loops at runtime. Serve through a real backend, not a notebook. Ship through CI that refuses a regression. Deploy to a cloud account with identity and secrets. Monitor quality next to SRE signals. Improve by turning production misses into new eval cases.

The sequence is the curriculum. Skipping a stage is how teams get a demo in production: they serve and deploy without track, evaluate, or guard.""",
            why="""On the job, leadership asks “are we production-ready?” The honest answer is which stages exist. A streaming UI with no eval gate is not ready. An eval notebook that nobody runs in CI is not a gate. A Grafana board with no quality panel is half-ready.

Interviewers walk this list. They want you to place a story on it: here is what I tracked, here is the gate, here is the rollback, here is the case I added after the incident.""",
            how="""Map each stage to an artefact.

- Track: MLflow run + prompt registry version.
- Evaluate: DeepEval (or equivalent) suite vs a pinned baseline.
- Guard: schema, PII, injection, step/spend caps.
- Serve: FastAPI + SSE + health/readiness.
- Ship: GitHub Actions unit → eval → image.
- Deploy: tagged image to EC2/CodeDeploy (or your cloud equivalent) with IAM and secrets.
- Monitor: Prometheus/Grafana + Langfuse traces + sampled online eval.
- Improve: trace → golden-set case → next gate.

Example. You take the Level 4 RAG app through the loop in two weeks. Week one: baseline run, registry, gate, guards, Compose stack. Week two: Actions, a staging deploy, one dashboard, one rollback drill, one new eval case from a real miss. That is the level, not a new product idea.""",
            fails="""1. **Starting at serve.** A pretty UI with no baseline or gate. You cannot tell if the next prompt helped.

2. **Monitor without improve.** You watch faithfulness fall and never add the failing question to the set.

3. **Deploy without ship.** Someone scp’s a container to a box. There is no tag to roll back to.""",
            line="I take an existing RAG or agent through track, evaluate, guard, serve, ship, deploy, monitor, and improve. Production-ready means each stage has an artefact I can point at, including a gate and a rollback, not only a UI.",
            walk="""You present the capstone. Slide 1 is the lifecycle. Each later slide is one artefact: baseline MLflow run, prompt `prod=v4`, CI log of a failed eval on a broken prompt, a logged guardrail block, Compose file, Actions green build, CodeDeploy revision, Grafana + a Langfuse trace, and the eval case added after a stale-index incident.""",
            follow="""They ask which stage you would cut under time pressure. Say: never evaluate or guard. Cut a fancy blue/green before you cut the gate. A single-instance deploy with a pin and a rollback script is still a lifecycle; a UI without a gate is not.""",
            measure="Stages with a named artefact, time since last rollback drill, and count of production misses added to the suite this month.",
            kps=[
                "Lifecycle: track, evaluate, guard, serve, ship, deploy, monitor, improve.",
                "Each stage needs a named artefact, not a slogan.",
                "Skipping evaluate or guard produces a demo in production.",
                "Monitor without feeding misses back is a dead end.",
                "Deploy without CI tags leaves you nothing to roll back to.",
                "Interviews want a story placed on this loop.",
            ],
            qs=[
                {"q": "List the lifecycle this level follows in order.", "a": "Track, evaluate, guard, serve, ship, deploy, monitor, improve. Be ready to name one artefact per stage.", "kind": "recall"},
                {"q": "A team has a Streamlit demo and a Grafana board. Which stages are still missing?", "a": "Likely track (versioned runs), evaluate (gated suite), guard (runtime checks), ship (CI), deploy (tagged rollback), and improve (cases from traces). UI plus a dashboard is serve and a slice of monitor.", "kind": "apply"},
                {"q": "Which two stages would you refuse to cut even under a deadline?", "a": "Evaluate and guard. Without a gate you cannot know a change is safe; without guards a single injection or loop can take you down. Fancy deploy topology can wait.", "kind": "apply"},
                {"q": "What does “improve” mean if monitor already exists?", "a": "Turn a production miss into a versioned eval case and keep it in the gate so the same miss cannot ship again.", "kind": "recall"},
                {"q": "A container was copied onto a VM by hand. Which stage failed, and what is the fix?", "a": "Ship/deploy. Put the image through CI, tag it with the commit, and deploy that tag so rollback is a redeploy, not a rebuild from memory.", "kind": "debug"},
            ],
            links=[MLFLOW, LANGFUSE],
        ),
        "what-is-non-deterministic-in-the-loop": note(
            what="""Three moving parts in an LLM system are **non-deterministic unless you pin and record them**: the **prompt** (and anything it includes), the **model** (sampling and vendor snapshots), and the **judge** you use to score outputs.

A prompt edited in place is a silent behaviour change. A model alias or temperature > 0 makes replays diverge. A judge model that is itself unpinned can flip a gate from pass to fail without your product changing.

“Pin and record all three” means: version the prompt, pin the product model and its sampling, pin the judge model and rubric, and write those ids on the run and the trace. Determinism here is operational, not mathematical. You want replayable decisions, not identical poetry.""",
            why="""Gates that flake destroy trust. Teams disable the eval job. Then a real regression ships. Judges that move under you create fake regressions and fake wins.

Interviewers ask why your eval is red on re-run. If you cannot name prompt, product model, and judge pins, you do not yet operate the loop.""",
            how="""On every offline run and every production trace store:

- `prompt_id` + hash of the rendered template
- `model_id` (snapshot, not `latest`) + temperature / seed policy
- `judge_id` + rubric version + judge temperature

Example. CI fails Friday. You replay with the same three pins and it fails the same way — a real regression. A second team replays with `judge=latest` and gets a pass. Their gate is a coin flip. You freeze the judge snapshot and the suite becomes a signal again.

Where sampling must stay on (creative copy), do not use exact match. Use a tolerance band, repeated trials, or a human step. Still pin the judge.""",
            fails="""1. **Pinned product, floating judge.** You “regressed” because the judge updated.

2. **Temperature 0 in CI, 0.7 in prod.** The gate never saw production noise.

3. **Prompt text logged but not versioned.** You can read it after the fact; you cannot roll it back by label.""",
            line="Prompts, product models, and judges all move. I pin and record all three on every run and trace. A flaky gate is usually an unpinned judge or a sampling mismatch, not “LLMs being random.”",
            walk="""The eval job is red, green, red. Product pin is stable. You find the judge alias moved twice in a week. You pin `judge-2026-03-01`, set judge temperature to 0, and store the rubric hash. The next ten runs agree. You add “judge pin” to the release manifest.""",
            follow="""They say “just use human eval.” Reply: humans are a stage, not a pin. I still record which rubric and which product bundle they scored, or I cannot compare months.""",
            measure="Eval rerun agreement on a frozen bundle, share of runs with all three pins, and CI jobs skipped because “the judge is flaky.”",
            kps=[
                "Pin and record prompt, product model, and judge.",
                "A floating judge creates fake regressions.",
                "Match sampling policy between gate and production, or name the difference.",
                "Replayability is the goal, not identical tokens every time.",
                "Log template hash as well as prompt label.",
                "Human review still needs a rubric version.",
            ],
            qs=[
                {"q": "What three things must you pin and record in an LLM eval loop?", "a": "The prompt (id and rendered hash), the product model snapshot and sampling, and the judge model plus rubric. Missing any one makes reruns incomparable.", "kind": "recall"},
                {"q": "CI flips pass/fail on the same commit. What do you check first?", "a": "Whether the judge pin or temperature moved, then whether the product model alias moved, then whether the prompt label is stable. Freeze the judge before you rewrite tests.", "kind": "debug"},
                {"q": "Why is temperature 0 in CI and 0.7 in production a problem for a gate?", "a": "The gate never sees the noise users see. Either run the gate with production sampling and a band, or keep prod at the gated settings for that task.", "kind": "apply"},
                {"q": "What do you store so you can replay a failing production answer?", "a": "Prompt id and rendered hash, model pin and sampling, retrieval ids, and if a judge scored it, the judge pin and rubric version.", "kind": "apply"},
                {"q": "Does pinning make the model deterministic?", "a": "No. It makes the decision loop replayable enough to trust a gate. Residual sampling may remain; you handle that with bands, repeats, or humans.", "kind": "recall"},
            ],
            links=[MLFLOW, LANGFUSE],
        ),
        "human-review-as-an-llmops-stage": note(
            what="""Not every change is a silent deploy. **Human review** is an LLMOps stage: a person looks at a prompt, a model pin, a policy change, or a sample of outputs before that change can reach all users.

Automation still runs — unit tests, eval gate, schema checks — but some deltas have no trustworthy automatic score yet: a new refusal policy, a tone change, a tool that can write, a judge you do not trust on a new domain. Those get a reviewer, a checklist, and a recorded decision.

This is not “we look at a notebook sometimes.” It is a required step with an owner, like a production approval in CI, or a sampled review queue with an SLA.""",
            why="""Silent deploys of prompts are how brand and legal incidents happen. The model is fluent; the new wording promises a refund you do not offer. A gate on last month’s golden set will not catch a new claim.

Interviewers ask who can change the system prompt. “Anyone with the dashboard password” is a fail. “A labelled version, a gate, and a human approval for policy-touching prompts” is a pass.""",
            how="""Split changes by risk.

- Low risk (typo in an example): gate + auto-promote to staging, human optional.
- Medium (retriever k, tone): gate + one reviewer.
- High (tools that write, legal wording, new model family): gate + named approver + canary.

Example. Marketing wants a friendlier prompt. You open a registry PR from `v12` to `v13`, run the suite (format still passes, a new “we’ll refund immediately” sentence appears in 8 of 50 cases). A reviewer blocks promotion, edits the wording, re-runs, and then moves `staging`. Production still needs the weekly sampled review, not a silent flip.

Record who approved, which sample they saw, and the prompt id. That is the audit trail.""",
            fails="""1. **Review with no artefact.** A Slack thumbs-up on unversioned text. You cannot replay what they approved.

2. **Review instead of a gate.** Humans are slow and miss regressions the suite would catch. Use both.

3. **Every change needs a VP.** The queue dies and people edit prod to bypass it. Risk-band the path.""",
            line="Human review is a stage, not a vibe. Policy, write-tools, and new models get a named approver on a versioned artefact after the eval gate. I will not silent-deploy those, and I will not replace the gate with a Slack emoji.",
            walk="""A tool that emails customers is added. CI is green. You still require a reviewer to watch ten traces in staging, including one forced tool failure. They catch a “I have emailed them” lie when the tool 500s. You add that case to the suite and only then move `prod`.""",
            follow="""They ask if LLM-as-judge replaces humans. Say: it scales sampling; it does not approve a new legal sentence. I keep humans on policy and on a weekly sample the judge is not trusted to close.""",
            measure="Share of production prompt/model changes with a recorded approver, time-in-review by risk band, and incidents where an unreviewed prompt reached users.",
            kps=[
                "Not every change is a silent deploy — review is a named stage.",
                "Humans approve versioned artefacts after the automated gate.",
                "Risk-band the path or the queue will be bypassed.",
                "A Slack thumbs-up on unversioned text is not a review.",
                "Judges scale sampling; they do not replace legal review.",
                "Record who approved which prompt id and which sample.",
            ],
            qs=[
                {"q": "Why is human review an LLMOps stage rather than optional polish?", "a": "Some changes — policy wording, write-tools, new model families — are not fully scored by the current suite. A recorded human decision on a versioned artefact stops silent deploys that create brand or legal incidents.", "kind": "recall"},
                {"q": "Marketing pastes a new system prompt into the prod dashboard. What do you replace that with?", "a": "A registry version, eval gate, risk-band review, and a label move. The dashboard edit is an untracked release.", "kind": "apply"},
                {"q": "The review queue is a week long so engineers push to prod. What design failed?", "a": "Every change required the same heavy approval. Risk-band low-risk edits to gate-only, and keep humans for policy and write-tools.", "kind": "debug"},
                {"q": "What must a review record contain to be useful next quarter?", "a": "Approver, prompt or model id, the sample or checklist they saw, and the decision. Without ids you cannot replay the approval.", "kind": "apply"},
                {"q": "Where do humans still sit after you add an LLM judge?", "a": "On policy and write-path changes, and on a weekly sample used to audit the judge. The judge does not approve new legal claims by itself.", "kind": "recall"},
            ],
            links=[LANGFUSE],
        ),
    }
}
