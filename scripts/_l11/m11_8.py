from assemble import entry

BEDROCK_KB = {"title": "Amazon Bedrock Knowledge Bases", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html"}
BEDROCK_GR = {"title": "Amazon Bedrock Guardrails", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html"}
VERTEX_TUNE = {"title": "Vertex AI tune models", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models"}
AZURE_FOUNDRY = {"title": "Azure AI Foundry overview", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry"}

NOTES = {
 "m11-8": {
  "managed-retrieval-knowledge-bases": entry(
   what="""A **managed knowledge base** is a platform product that packages ingestion, chunking, embedding, indexing, sync and a retrieve (or retrieve-and-generate) API behind configuration. You point it at a bucket, a SharePoint site or a Confluence space; it builds the index; your app calls `Retrieve` or `RetrieveAndGenerate` instead of owning a vector store. Bedrock Knowledge Bases, Vertex AI Search / grounding, and Azure AI Search-backed "on your data" paths are the same idea with different consoles.

What you bought is an **operations shortcut**, not a better retriever by default. The platform still chunks somehow, embeds with some model, and ranks somehow. Those choices are often hidden or only partly tunable. The quality of answers is still a function of parsing, chunking, metadata and the questions you ask — the same work you did in Level 4, now behind a form.

Treat the knowledge base as one retrieval backend. Keep your eval questions and expected passages in your repo. If you cannot measure recall@k on it, you do not own retrieval; you rent a black box.""",
   why="""On the job this is the first "buy" a platform team will offer you after you show a notebook RAG. It is attractive: no Pinecone bill, no chunker to page, IAM already in the account. It is also how teams lose the ability to explain a wrong citation to an auditor. "The knowledge base returned it" is not a root cause.

In interviews, distinguish the product from the discipline. Junior answers recite the feature list. Senior answers say: I will use it when documents are standard, access control is coarse, and I can still run my retrieval eval. I will not use it when tables, scans, per-user ACLs or a custom reranker decide quality.

IT services interviews will ask you to name one managed KB and one thing it will not do. Have both ready.""",
   how="""Stand up the smallest useful loop:

1. Put twenty well-understood PDFs in a bucket in the allowed region.
2. Create the knowledge base with the default parser and embedding model; note both ids.
3. Run a thirty-question retrieval eval you already have: for each question, did the expected passage appear in the top-k?
4. Compare that recall with your Level 4 stack on the same twenty files.
5. Only then wire `RetrieveAndGenerate` into the app.

Example: an HR policy bot. Default chunking splits a benefits table so that "notice period" and the number land in different chunks. Recall@5 on table questions is 40%; your custom parser that emits one chunk per table row is 88%. You keep the managed KB for narrative PDFs and route table-heavy docs through your own pipeline. The decision is measured, not aesthetic.

Record the embedding model id. If the platform silently upgrades embeddings, your index is a different product.""",
   failures="""1. **No retrieval eval.** You only look at generated answers. A fluent wrong citation looks like success.

2. **Sync as an afterthought.** Someone updates the PDF in the CMS; the index is three weeks stale; the bot quotes a retired policy.

3. **Assuming ACL inheritance.** The bucket is private; the retrieve API still returns a document the caller should not see if you did not configure per-user filters.

4. **Treating retrieve-and-generate as one knob.** You cannot tell whether the miss was retrieval or generation. Split the metrics.""",
   line="""A managed knowledge base is ingestion-plus-index as a service. I will use it when docs are standard and I can still measure recall@k. I keep the eval set, I record the embedder, and I do not treat retrieve-and-generate as a single score.""",
   key_points=[
    "Managed KB = ingest, chunk, embed, index, sync, retrieve — as configuration.",
    "It is an ops shortcut, not automatically a better retriever.",
    "Keep a passage-level eval; do not judge only generated answers.",
    "Parser and chunking still decide table and scan quality.",
    "Sync lag and ACL filters are your problem even when the index is rented.",
    "Record the embedding model id; silent upgrades change the product.",
   ],
   questions=[
    {"q": "What jobs does a managed knowledge base take off your plate?", "a": "Connecting sources, default chunking, embedding, storing an index, syncing updates, and exposing retrieve or retrieve-and-generate APIs. Prompt design, evals and product behaviour stay yours.", "kind": "recall"},
    {"q": "Answers miss figures inside PDF tables. What do you check first?", "a": "How the managed parser chunks tables, whether a custom parser exists, and recall@k on a table-only slice. If the platform cannot keep a row together, route those docs through your own pipeline.", "kind": "debug"},
    {"q": "How do you decide the managed KB is good enough to ship?", "a": "Run a labelled retrieval eval in the production region, compare recall and citation validity with your own stack or a baseline, and check sync delay and ACL behaviour. Ship only if the slice that matters clears the bar.", "kind": "apply"},
    {"q": "Why split retrieve metrics from generate metrics?", "a": "A wrong answer can be a miss in the index or a fluent model ignoring a good passage. Combined scores hide which layer to fix.", "kind": "recall"},
    {"q": "A policy PDF was updated yesterday; the bot still quotes last quarter. Likely cause?", "a": "The knowledge base has not synced, or it synced a cached object. Check the sync job, the source etag, and the time the chunk was written.", "kind": "debug"},
   ],
   links=[BEDROCK_KB, AZURE_FOUNDRY],
  ),
  "managed-retrieval-vs-your-own-stack": entry(
   what="""Build-versus-buy for retrieval is a **control versus calendar** decision, not a religion. The managed knowledge base wins when documents are ordinary (text PDFs, HTML, wiki pages), access control is coarse, the team is small, and time-to-first-citation matters more than a custom reranker. Your own stack wins when chunking, hybrid search, rerank models, per-user permissions, multi-source joins, or cost at a large corpus are the product.

A hybrid is common and honest: managed ingestion for the boring 80%, your query layer and reranker for the 20% that decides quality. The mistake is treating the first successful demo on either path as the architecture.

Portability is part of the comparison. Managed indexes and APIs are proprietary even when you can export embeddings. Your own stack using a standard vector store and a documented chunker is slower to start and easier to leave.""",
   why="""On the job, platform sales will tell you the knowledge base "is RAG". Your job is to put both options on one eval set and one cost model. A two-week bake-off on fifty questions beats a quarter of opinions.

In interviews, "I always build RAG" sounds like a tutorial. "I always buy" sounds like you have never hit a table or an ACL. The senior line is: I measure recall, latency and exit cost, and I decide per corpus, not per company.

Mention lock-in without drama. A managed index you cannot export is a 6-week exit, not a moral failure — if you priced it.""",
   how="""Run the same bake-off every time:

1. Freeze a retrieval eval: question, expected doc id, expected passage.
2. Ingest the same corpus into the managed KB and into your Level 4 stack.
3. Measure recall@5, citation validity, p95 retrieve latency, and engineer-days to operate.
4. Estimate exit: can you export chunks, embeddings and metadata in a day?
5. Pick, write the reason, set a revisit trigger (corpus 10x, new ACL need, cost cliff).

Example: 4,000 policy pages, no per-user ACL, two engineers. Managed recall is 81%, yours is 84%, yours costs three extra weeks and an on-call. You buy, keep the eval, and revisit when the legal corpus of scanned contracts arrives. When it does, you do not "replace RAG"; you add a custom parser for that source and keep the managed path for policies.""",
   failures="""1. **Demo-driven buy.** The console chat looked good on three questions. There was no labelled set.

2. **Build for pride.** You rebuilt ingestion to avoid a $200/month SKU and now you own sync bugs.

3. **No exit test.** Six months later you cannot get chunks out; migration is a re-ingest from source, and the source is gone.

4. **One decision for every corpus.** HR PDFs and scanned invoices are not the same retrieval problem.""",
   line="""I compare managed and custom retrieval on the same labelled set: recall, latency, ops days and exit. I buy when docs are standard and the eval clears; I build when chunking, ACLs or cost at scale are the product. Hybrid per corpus is normal.""",
   key_points=[
    "Managed for speed and standard docs; own stack for control and odd corpora.",
    "Decide with a shared retrieval eval, not a console demo.",
    "Estimate exit: export chunks, embeddings and metadata.",
    "Hybrid per source is a valid architecture.",
    "Revisit when corpus shape, ACLs or volume change.",
    "Proprietary indexes are lock-in you can price, not a surprise.",
   ],
   questions=[
    {"q": "When would you build your own retrieval stack instead of a managed KB?", "a": "When you need custom chunking, hybrid or rerank control, per-user permissions, multi-source joins, portability, or cost control the managed option cannot meet — and the eval shows the gap.", "kind": "recall"},
    {"q": "How do you decide objectively between managed and custom RAG?", "a": "Ingest the same corpus both ways, measure recall@k, citation validity, latency and ops effort, estimate export time, and pick the simplest option that clears the quality bar.", "kind": "apply"},
    {"q": "Managed recall is 2 points worse but saves a month. What do you do?", "a": "If the miss is not on a critical slice, buy and keep the eval. If the two points are payments or legal citations, keep building or hybrid that slice.", "kind": "apply"},
    {"q": "You cannot export embeddings from the managed index. What did you fail to measure?", "a": "Portability cost. Re-ingest from source is the exit; if the source is incomplete you are stuck. Run an export drill before you commit.", "kind": "debug"},
    {"q": "Why is a hybrid retrieval path often the honest answer?", "a": "Different sources have different parsing and ACL needs. Buying the default path for wiki pages and owning the path for tables or tenant-filtered docs avoids a false all-or-nothing choice.", "kind": "recall"},
   ],
   links=[BEDROCK_KB],
  ),
  "managed-agent-workflow-runtimes": entry(
   what="""A **managed agent or workflow runtime** hosts the loop you built in Level 5: model calls, tool invocation, state, retries, and often tracing and durable execution. You register tools, write a prompt or graph, and the platform runs the steps. Bedrock Agents, Vertex Agent Builder, Azure Agent Service and similar products are this layer.

What you get is infrastructure: session state, identity integration, scaling, and a console for traces. What you give up is control of the loop, a portable definition, and sometimes the ability to test locally without the cloud. Pricing is often per step or per session, which punishes chatty designs.

The durable asset is still **your tools**. If tool logic lives in your services with a plain schema, the agent definition is a thin, replaceable layer. If business rules live only inside the platform graph, you bought a rewrite.""",
   why="""On the job, a managed agent is sold as "you will not write an orchestrator". That is true for a simple tool-calling assistant. It is false the week you need a custom retry, a human gate, or a tool permission the runtime cannot express. Then you are debugging someone else's loop with someone else's timeouts.

In interviews, name the trade: you rent the loop, you own the tools. Ask about tool schema portability, state storage, step limits, local test, trace export and data handling. Reciting a vendor tutorial is weaker than listing those questions.

Enterprises will also ask whether the runtime stays in-region and whether traces contain prompt text. Answer those as residency questions, not as features.""",
   how="""Pilot one task, not the company:

1. Pick a three-tool workflow you already run in your own loop (e.g. lookup, calculate, draft).
2. Re-implement it on the managed runtime with the same tools behind HTTP.
3. Compare: success rate on a 50-case eval, p95 latency, cost per successful task, time to add a fourth tool.
4. Export a trace and confirm you can read it offline.
5. Time how long it takes to run the same graph in a unit test without the cloud.

Example: a refund assistant. The managed runtime is fine for "look up order, check policy, draft reply". It fails when you need a manager approval after $500 or a tool that must not see another tenant's order. You keep those gates in your service, and you treat the runtime as a caller, not as the source of truth.""",
   failures="""1. **Business logic in the graph.** A refund rule that exists only as a platform node cannot be unit-tested or reused by the batch job.

2. **No step budget.** A confused agent loops; the bill is per step; you notice at month end.

3. **Traces you cannot export.** An incident happens; the only copy is in a console you lose after the project.

4. **Assuming local = prod.** The runtime's tool-calling format differs from your laptop SDK; you discover it in staging.""",
   line="""A managed agent runtime rents the loop: state, tools, tracing, scale. I keep business logic in my services, I measure success rate and cost per task, and I refuse a graph I cannot test without the cloud.""",
   key_points=[
    "Managed runtimes host the loop; they do not replace tool design.",
    "Keep business rules in portable services, not only in the graph.",
    "Price is often per step — chatty agents get expensive.",
    "Ask about schema portability, state, limits, local test and trace export.",
    "Residency applies to traces and tool payloads, not only to the model.",
    "Pilot one workflow with an eval before moving the fleet.",
   ],
   questions=[
    {"q": "What lock-in does a managed agent runtime usually carry?", "a": "The graph, memory format and trace format are proprietary. Mitigate by keeping tool logic in your services and the agent definition thin.", "kind": "recall"},
    {"q": "Which questions do you ask before adopting one?", "a": "Tool schema portability, where state lives, timeouts and step limits, local testing, trace export, permission scoping, pricing unit and data handling.", "kind": "apply"},
    {"q": "A refund rule lives only as a node in the platform graph. What is wrong?", "a": "You cannot unit-test or reuse it. Move the rule into a service the agent calls, and keep the graph as orchestration.", "kind": "debug"},
    {"q": "Cost spiked with no traffic increase. First check on a managed agent?", "a": "Step count per session — a loop or retry storm bills per step. Inspect traces for repeated tool calls and cap steps.", "kind": "debug"},
    {"q": "When is buying the runtime the honest call?", "a": "A small team, a short durable workflow, identity already on the platform, and tools you already own. Not when you need a custom loop or offline tests you cannot get.", "kind": "apply"},
   ],
   links=[AZURE_FOUNDRY],
  ),
  "managed-guardrails": entry(
   what="""**Managed guardrails** are configurable filters on inputs and outputs: content categories, denied topics, PII detect-or-mask, jailbreak or prompt-injection detectors, and sometimes grounding checks. They run as a platform sidecar so every model in the catalog can share one policy. Bedrock Guardrails, Azure content filters, and Vertex safety settings are this layer.

They are a **policy accelerator**, not a security boundary. They have false positives (they block a legitimate medical question) and false negatives (they miss a novel injection). Language coverage, multimodal coverage, latency and per-call cost vary. The configuration is platform-specific and does not travel.

Your own validators still own business rules: "refunds over $500 need a manager", "never invent a policy id", "output must be this JSON". Guardrails do not know those rules.""",
   why="""On the job, security will ask "do you have guardrails?" as a checkbox. Your job is to say yes, show the policy, and show the **false-positive budget** on a labelled set of real tickets. A filter that blocks 12% of allowed support answers is not "safe"; it is a product incident.

In interviews, the expected sentence is: guardrails are one layer; architecture (least-privilege tools, no secrets in prompts, output validation) is another. Then mention you measure both miss rate and over-block rate.

Regulated teams will also ask where the filter runs and whether the prompt text used for classification is retained. That is a residency and retention question.""",
   how="""Treat the filter as a model you must eval:

1. Build two labelled sets: **must-allow** (real allowed answers) and **must-block** (injections, PII leaks, disallowed topics).
2. Run the managed policy as shipped; record false-positive and false-negative rates.
3. Tune categories and thresholds; re-run. Stop when you hit the budget (e.g. FP < 2% on must-allow, FN = 0 on the critical block set).
4. Add your own schema and business validators after the filter.
5. Log both the filter decision and the raw (redacted) reason for audit.

Example: a hospital FAQ. The default "self-harm / medical" category blocks "how do I take this prescribed tablet with food". You narrow the topic, add an allow phrase list, and you keep a human review queue for borderline medical advice. You do not turn the filter off because a demo looked cautious.""",
   failures="""1. **Checkbox enable.** Default categories, no labelled set, support tickets start failing in production.

2. **Filter as the only control.** Tools still have write access to payments; an injection that slips through can act.

3. **No latency budget.** The sidecar adds 200ms; you discover it on the p95 after launch.

4. **Config in the console only.** Nobody can review the policy in git; a well-meaning change ships on Friday.""",
   line="""Managed guardrails are shared input/output filters. I eval them on must-allow and must-block sets, I budget false positives, and I still own business validators and least-privilege tools. A filter is a layer, not a boundary.""",
   key_points=[
    "Shared filters: content, topics, PII, injection, sometimes grounding.",
    "Measure false-positive and false-negative rates on your text.",
    "Not a security boundary — tools and validation still matter.",
    "Config is not portable; keep a copy you can review.",
    "Latency and cost are per call; put them in the budget.",
    "Business rules stay in your validators, not in a category list.",
   ],
   questions=[
    {"q": "Why are managed guardrails not enough for security?", "a": "They miss novel attacks and over-block allowed text. Injection through tools or retrieved content needs least-privilege tools, validation, isolation and monitoring.", "kind": "recall"},
    {"q": "The filter blocks many legitimate medical questions. What do you do?", "a": "Measure the false-positive rate on a labelled must-allow set, narrow categories or add allow phrases, and route borderline cases to a human. Do not disable the filter blindly.", "kind": "debug"},
    {"q": "Where should a refund-limit rule live?", "a": "In your own validator or tool, not in a generic content category. Guardrails do not understand house business rules.", "kind": "apply"},
    {"q": "What two rates must a guardrail eval report?", "a": "False positives on allowed traffic and false negatives on the block set. One number is not a policy.", "kind": "recall"},
    {"q": "Prompt text used by the filter is stored in another region. Issue?", "a": "Residency. The filter is a processor. Confirm where classification text lives and whether that geography is allowed.", "kind": "debug"},
   ],
   links=[BEDROCK_GR],
  ),
  "managed-evaluation": entry(
   what="""**Managed evaluation** is a runner: you upload or point at a dataset, pick metrics (accuracy, relevance, groundedness, toxicity), optionally use an LLM judge, and compare model ids in the catalog. The platform stores runs, charts and sometimes scheduled jobs. It does not invent a good metric for your product.

The asset that matters is still **your golden set and rubric**. The runner is convenient. If the only copy of the questions lives in the platform, you cannot re-run the comparison on a public API, an open-weight host or next quarter's catalog.

Judges drift. A platform judge is another model with a version. Pin it, calibrate against human labels, and do not retune the judge prompt until the new model wins.""",
   why="""On the job, managed eval is how a platform team shows "we measure quality" without standing up your Level 7 harness. That is fine for a first comparison. It is dangerous as the only gate: generic groundedness is not "did we cite the right policy clause".

In interviews, the line is: I own the dataset and the rubric; I will rent the runner. Then say how you calibrate a judge and why self-preference (teacher judging the student) is banned.

Also mention cost. Judge calls on a 2,000-row set, nightly, are a real bill. Budget them.""",
   how="""Use the platform as a **replica** of a harness you already have:

1. Keep the golden set in git (or an object store you control) with a version id.
2. Upload that version to the managed runner; record the job id and the judge model id.
3. Run the same set in your own harness against the same model.
4. Compare agreement. If they disagree, trust humans on a sample and fix the weaker judge.
5. Gate releases on **your** metrics; treat the platform chart as a convenience view.

Example: a support-answer eval. The managed "relevance" score rises after you switch models; your citation-validity score falls. You do not ship. The platform metric was not the product metric. You add citation-validity to the runner if it supports custom metrics, or you keep that score only in your harness.""",
   failures="""1. **Dataset hostage.** The only questions live in the console. A platform outage or a team leave and you cannot reproduce last month's number.

2. **Judge shopping.** You change the judge prompt until the favoured model wins.

3. **Online blindness.** Offline managed eval is green; production users see a new failure the set never covered.

4. **Unpinned judge.** The platform updates the judge; scores jump; nobody changed your app.""",
   line="""Managed eval is a runner. I own the golden set and the rubric, I pin the judge, I calibrate against humans, and I will not ship on a generic relevance chart that is not my product metric.""",
   key_points=[
    "Rent the runner; own the dataset and rubric.",
    "Pin judge model and prompt; calibrate on human labels.",
    "Generic metrics are not product quality.",
    "Keep a portable copy of the golden set.",
    "Budget judge-call cost on large or nightly runs.",
    "Do not retune the judge to make a favoured model win.",
   ],
   questions=[
    {"q": "What is the main evaluation asset you should keep portable?", "a": "The labelled dataset and rubrics. The managed runner can be replaced; the golden set cannot.", "kind": "recall"},
    {"q": "LLM-judge scores rise but users complain. Why?", "a": "The judge may prefer verbose or self-similar answers, or the metric misses the product (citations, format, refusals). Calibrate with humans and add task-specific scores.", "kind": "debug"},
    {"q": "The platform updates its default judge. What do you do?", "a": "Pin a judge version, re-run the last release on both judges, and do not treat a score jump as a product regression until you know which judge moved.", "kind": "apply"},
    {"q": "Why run the same set in your harness and in the managed runner?", "a": "To detect disagreement. If they diverge, a human sample tells you which score you can trust.", "kind": "apply"},
    {"q": "When is managed eval the honest buy?", "a": "When you need a scheduled in-catalog comparison, your set is already portable, and the metrics it offers include (or can sit beside) the ones you actually gate on.", "kind": "recall"},
   ],
   links=[AZURE_FOUNDRY],
  ),
  "managed-fine-tuning-distillation": entry(
   what="""**Managed fine-tuning** lets you upload examples, pick a base model the catalog allows, start a job, and invoke the resulting custom model — without renting a GPU yourself. **Managed distillation** uses a stronger teacher's outputs to train a cheaper student the platform will host. Both are Level 13 work with the platform holding the weights.

The questions that decide whether this is a feature or a trap: which bases can you adapt, where do the resulting weights live, can you **export** them, what happens when the base is deprecated, and what the training-data terms say. On several catalogs the custom model is invocable only on that platform and only while you pay for hosting.

You still need a prompted baseline, a held-out set, and a retrain plan. The platform does not excuse Level 13 discipline. It only removes the kernel-driver part.""",
   why="""On the job this is how a team without GPU ops still ships a house format or a small classifier. It is also how they discover, at deprecation, that the adapter cannot leave. The portable assets are the dataset, the recipe and the eval — the same as a DIY tune.

In interviews, say you would try prompting and retrieval first, then a managed tune if the residual error is behaviour. Then say you checked export and the retrain tax. "We fine-tuned on Bedrock" without those two facts is a feature recitation.

Distillation has an extra legal check: some teacher APIs restrict using outputs to train a competing model. Read the terms before you generate.""",
   how="""Treat a managed tune like any other tune, plus an exit row:

1. Write the residual failure and the prompted baseline score.
2. Confirm the base id exists in the production region and supports customisation.
3. Upload a versioned dataset; pin the job config.
4. Evaluate the custom model on the same held-out set as the baseline.
5. Ask: can I download weights? If no, write the exit as "retrain on another base from the same data".
6. Set a deprecation watch on the base.

Example: a 40-label ticket router. Managed LoRA on an 8B-class catalog model matches the prompted frontier within 1 point and cuts unit cost. Weights are not exportable. You accept that because the dataset is yours and a retrain is a job you can rerun. You would not accept it for a one-off tune whose data you cannot reconstruct.""",
   failures="""1. **Tuning to add facts.** The platform will happily train on the wiki. The model will still go stale and cannot cite.

2. **No export question.** Legal later wants the weights in a second cloud. You cannot give them.

3. **Base retired, recipe lost.** The console job is gone; nobody kept the dataset hash.

4. **Teacher terms.** You distilled a frontier model into a student you sell; the teacher ToS forbade it.""",
   line="""Managed tuning and distillation remove GPU ops, not the need for a baseline, a held-out set or a retrain plan. I check export, region and teacher terms, and I treat the dataset — not the hosted weights — as the asset.""",
   key_points=[
    "Managed tune: upload data, pick a catalog base, invoke a custom id.",
    "Ask where weights live and whether they leave the platform.",
    "Deprecation of the base forces a retrain; keep data and recipe.",
    "Still climb the cost ladder: prompt and retrieval first.",
    "Distillation needs teacher terms that allow training a student.",
    "Hosting a custom model is a recurring bill, not a one-off job.",
   ],
   questions=[
    {"q": "What lock-in risks come with managed fine-tuning?", "a": "Weights may not be exportable, hosting may require provisioned capacity, and base deprecation forces a retrain. Keep the dataset and recipe portable.", "kind": "recall"},
    {"q": "When is managed distillation worth it?", "a": "A narrow high-volume task already solved by an expensive teacher, a student that meets the eval, lower unit cost, and teacher terms that allow the use.", "kind": "apply"},
    {"q": "The custom model is great; the base is deprecated in 60 days. What saves you?", "a": "The versioned dataset, the job config and the eval. Retrain on the successor. The old hosted weights will not help.", "kind": "debug"},
    {"q": "Why still need a prompted baseline on a managed tune?", "a": "Without it you cannot prove the job beat a cheaper reversible option. The platform will train either way.", "kind": "recall"},
    {"q": "Legal asks for the adapter file to run in another cloud. You cannot download it. What failed?", "a": "The export question before you started. Exit is now a retrain elsewhere from data you hope you still have.", "kind": "debug"},
   ],
   links=[VERTEX_TUNE],
  ),
  "deciding-layer-by-layer": entry(
   what="""Do not make one build-or-buy decision for "the AI stack". Decide **per layer**: model access, gateway, retrieval, agent runtime, guardrails, evaluation, observability, tuning, UI. Adopting a managed knowledge base does not commit you to managed agents, managed judges or managed fine-tunes. Each layer has its own differentiating value, portability and failure cost.

A typical honest mix for a small regulated team: buy model access and basic guardrails on the existing cloud, buy or skip a gateway until a second provider appears, own prompts and evals, build retrieval if it is the product, keep tools as your services. A startup with no compliance story may invert half of that.

Write the mix down. "We are on Bedrock" is not a mix. "Invoke and guardrails on Bedrock, evals in-repo, retrieval ours, no agent runtime" is a mix.""",
   why="""On the job, platform bundles are sold as a suite. The suite is convenient for procurement and expensive in lock-in. Layer-by-layer decisions let you take the identity and the model catalog without handing over the thing that makes your product good.

In interviews, this is how you sound like an architect rather than a console user. Draw the layers. Mark buy/build/defer. Name the revisit trigger for each. Dogma ("always build RAG") is a fail.

Revisit as the product matures. An early buy can become a later build when quality or cost demands it. That is not flip-flopping; it is a trigger firing.""",
   how="""Fill a one-page table:

| Layer | Differentiating? | Buy / build / defer | Exit weeks | Trigger to revisit |
| Model access | no | buy platform | 2 | region missing a model |
| Gateway | not yet | defer | — | second provider or second team |
| Retrieval | yes | build | 4 | — |
| Agents | no | defer (own loop) | — | durable long jobs |
| Guardrails | no | buy basic | 1 | FP budget missed |
| Eval | yes (data) | build runner optional | 1 | — |
| Tuning | no | defer | — | measured residual |

Example: you buy Bedrock invoke and Guardrails, you keep the Level 4 retriever, you do not touch Agents. Six months later volume justifies a gateway for virtual keys. That is a new layer decision, not a platform conversion.""",
   failures="""1. **Suite gravity.** You turned on every add-on because they were in the same console. Now five configs must move if you leave.

2. **One meeting, one decision.** Retrieval and evaluation got the same "buy" without separate evidence.

3. **No defer.** You built a gateway for one model and one team. The hop is all cost.

4. **No trigger.** The mix is tribal knowledge; a new PM adds a managed agent because the checkbox exists.""",
   line="""I decide each layer on its own: differentiating, portable, operable, failure cost. Buying invoke does not buy the knowledge base. I write the mix and the revisit trigger so a console checkbox is not an architecture.""",
   key_points=[
    "Decide per layer, not for the whole suite.",
    "Buy, build or defer — defer is a real option.",
    "Owning evals and prompts is almost always right.",
    "A later buy or build is a trigger, not a contradiction.",
    "Suite gravity is how lock-in accumulates quietly.",
    "Write the mix so the next person does not re-litigate it.",
   ],
   questions=[
    {"q": "Why decide build-versus-buy per layer?", "a": "Layers differ in how differentiating, portable and costly they are. A blanket buy locks in core quality; a blanket build wastes time on commodity controls.", "kind": "recall"},
    {"q": "Which layers should you usually own?", "a": "The ones that define product quality and data: eval sets, prompts, domain retrieval and business tools. Commodity invoke, basic filters and billing views are often bought.", "kind": "apply"},
    {"q": "You bought a knowledge base. Must you buy the agent runtime?", "a": "No. That is a separate layer. Keep your own loop until a durable-workflow need appears.", "kind": "apply"},
    {"q": "A new PM enables every add-on in the console. What did the team fail to write?", "a": "A layer mix with owners and revisit triggers. Console availability is not a decision.", "kind": "debug"},
    {"q": "When is 'defer' the right cell?", "a": "When there is no second provider, no second team, and no measured pain. A gateway or a tune you do not need is pure cost.", "kind": "recall"},
   ],
   links=[AZURE_FOUNDRY],
  ),
  "what-to-judge-each-candidate-on": entry(
   what="""Use one **scorecard** for every managed or open candidate, whether it is a model, a knowledge base, a guardrail or a runtime. The rows do not change: quality on your task, latency and throughput at your load, cost per successful task, security and compliance fit, operability (SLOs, support, limits), portability, maturity (deprecation record), and team fit. Weights change with context: a bank weights compliance; a four-person startup weights calendar.

Evidence beats logos. A row without a number or a document is a guess. "Feels faster" is not a latency row. "They are the leader" is not a maturity row.

Write the weights before you see the scores. Otherwise you will discover that the option you liked was also the one you weighted.""",
   why="""On the job this is how you end a three-week vendor debate. In interviews it is how you show you can compare unlike things without collapsing to price or to a favourite cloud.

The trap is a scorecard with twenty rows nobody will fill. Eight rows with evidence will ship. Empty sophistication will not.

IT services work often means scoring the client's already-chosen platform against "do nothing" and against one alternative, not scoring the whole market.""",
   how="""Template (fill with evidence):

- Quality: your eval, not a blog leaderboard. Include the critical slice.
- Latency: p95 at production token lengths, in the production region.
- Cost: per successful task at your volume, including add-ons.
- Compliance: identity, network, residency, retention, training terms — written.
- Operability: quota process, status page, who you page.
- Portability: export drill in hours or weeks.
- Maturity: last deprecation, last silent behaviour change.
- Team: who can operate it on Monday.

Example: two knowledge bases. A ties B on recall. A cannot export; B can. You weighted portability 0.2 because legal asked about a future multi-cloud clause. B wins. Without pre-set weights, A would have won on a nicer console.""",
   failures="""1. **Weights after scores.** You rationalised the favourite.

2. **Quality from marketing.** You never ran your eval in-region.

3. **Cost at their example volume.** Their slide is 1M tokens/day; you are at 20M or at 20k.

4. **Ignoring team fit.** The winning option needs a GPU on-call you do not have.""",
   line="""I score every candidate on quality, latency, cost, compliance, operability, portability, maturity and team fit, with weights written first and evidence in every cell. A spreadsheet beats a logo.""",
   key_points=[
    "One scorecard for models and for add-ons.",
    "Write weights before you see scores.",
    "Quality means your eval in the production region.",
    "Cost is per successful task at your volume.",
    "Portability is a measured exit, not a hope.",
    "Team fit is a row — an unstaffed winner is a loss.",
   ],
   questions=[
    {"q": "List the criteria for judging a managed building block.", "a": "Quality on your task, latency, cost per successful task, compliance fit, operability, portability, maturity and team fit.", "kind": "recall"},
    {"q": "Two options tie on quality. How do you break the tie?", "a": "Compare the pre-weighted remaining rows — usually compliance, total cost, operability and exit weeks — and prefer the lower exit cost if they still tie.", "kind": "apply"},
    {"q": "A vendor slide shows a lower unit price. Why might they still lose?", "a": "Your volume, add-on SKUs, idle capacity, or a worse success rate can invert cost per successful task. Recompute on your numbers.", "kind": "debug"},
    {"q": "Why write weights before the bake-off?", "a": "To stop post-hoc rationalisation. Otherwise the favourite option quietly becomes the one you weighted.", "kind": "recall"},
    {"q": "When would compliance outweigh a large quality gap?", "a": "When the better-quality option cannot run in-region or cannot meet retention and identity rules. An illegal 5-point win is not a candidate.", "kind": "apply"},
   ],
   links=[AZURE_FOUNDRY],
  ),
  "measuring-the-portability-cost": entry(
   what="""**Portability cost** is the effort to leave, estimated **before** you adopt. Inventory every touchpoint: SDK calls, request shapes, IAM, private networking, vector indexes, guardrail configs, agent graphs, tuned models, dashboards, IaC. Mark each portable (standard format), adaptable (days) or rebuild (weeks). Add the re-evaluation you will have to rerun. Sum to an exit estimate you can put on the decision record.

A prompt moves in minutes. A knowledge base, an agent definition or a non-exportable fine-tune usually does not. That asymmetry is the whole point of this row.

Reducing the cost is design, not a later project: interfaces at the boundary, OpenTelemetry instead of a console-only view, evals and prompts in git, an export drill in the first month.""",
   why="""On the job, nobody wants to talk about leaving the day they buy. That is exactly when the number is cheap to gather. Six months later the same inventory is an archaeology project.

In interviews, "we avoided lock-in" is vague. "Exit is three engineer-weeks because indexes are ours and the SDK is behind an interface; the guardrail config is a rebuild" is an answer.

Do not aim at zero. Aim at a number you accepted.""",
   how="""Run an exit drill on a quiet week:

1. List touchpoints in a sheet with owner and class (portable / adaptable / rebuild).
2. Actually export one index or one config; time it.
3. Re-run the eval on a second path (even a cheap public API on synthetic data) to price the re-eval.
4. Total the hours. Convert to weeks. Put it on the ADR.
5. Pick one reduction (usually: move prompts/evals fully into git, or wrap the SDK).

Example: you adopted a managed KB. Export of chunks takes a day; embeddings are not reusable elsewhere; re-embed plus eval is two weeks. You write "exit ≈ 3 weeks" and you keep source documents in your bucket so you are not hostage to the index. If export had failed, you would have treated that as a scorecard fail, not a surprise.""",
   failures="""1. **Inventory as fiction.** You listed "SDK" as portable but twenty files import the vendor client directly.

2. **Skipping the drill.** The export button exists; it does not work on your account tier.

3. **Forgetting re-eval.** Moving plumbing is easy; proving quality is the real week.

4. **Zero as a goal.** You spent a quarter wrapping every feature and shipped a worse product.""",
   line="""I measure portability before I buy: inventory touchpoints, time an export, add re-eval, write the weeks. Prompts travel; indexes and graphs often do not. I reduce the number with interfaces and git-owned evals, I do not worship zero.""",
   key_points=[
    "Estimate exit before you adopt, not after.",
    "Classify touchpoints: portable, adaptable, rebuild.",
    "Time a real export; do not trust the brochure.",
    "Re-evaluation is part of the exit, not extra.",
    "Prompts and evals should already be portable.",
    "A known 3-week exit can be an accepted cost.",
   ],
   questions=[
    {"q": "How do you estimate portability cost?", "a": "Inventory touchpoints, classify portable/adaptable/rebuild, time an export, add re-evaluation effort, and total it in weeks.", "kind": "recall"},
    {"q": "Which artefacts keep portability high?", "a": "Prompts, eval sets, tool services, standard telemetry and generic IaC, behind interfaces that isolate vendor SDKs.", "kind": "apply"},
    {"q": "The export API returns 403 on your tier. What is the real exit?", "a": "Re-ingest from source plus a full re-eval — if the source still exists. That is a rebuild, not an export. Write it as weeks, not as 'we can leave'.", "kind": "debug"},
    {"q": "Why is a prompt a poor example of lock-in?", "a": "Prompts already travel. The costly items are indexes, graphs, IAM, tuned weights and console-only policy. Measure those.", "kind": "recall"},
    {"q": "When would you accept a 6-month exit?", "a": "When the quality or compliance gain is large, the trigger to leave is unlikely, and you still own the data needed to rebuild. Write that bargain down.", "kind": "apply"},
   ],
   links=[BEDROCK_KB],
  ),
  "when-buying-is-the-honest-call": entry(
   what="""Buying is the right call when the layer is **not differentiating** and the managed option **already clears your bar**. Signals: a small team, a standard use case, a compliance deadline the platform already satisfies, an exit cost you have measured and accepted, and a build that would steal weeks from the product. Honesty includes naming what you give up: feature lag, some lock-in, a bill, and a vendor clock on deprecations.

Buying because the console exists is not honesty. Building because "we are engineers" is not honesty either. The honest sentence is: this layer is commodity for us, the eval passed, exit is N weeks, we will revisit if X.

Write revisit triggers: a cost cliff, a missing feature, a quality gap on a new slice, a deprecation. A buy without a trigger becomes an accident you never re-examine.""",
   why="""On the job, the brave-looking move is to build. The useful move is often to buy the boring layer and spend the week on the eval or the retrieval slice that users feel. Interviewers who have shipped will reward that. Interviewers who have only blogged will punish it. Optimise for the first.

In interviews, avoid "always buy" and "always build". Walk one layer you would buy and one you would own, with evidence. That is the whole skill.

A compliance deadline is a valid reason to buy a good-enough knowledge base. It is not a reason to skip the retrieval eval.""",
   how="""Decision script:

1. Is the layer the product? If yes, lean build (or hybrid).
2. Does a managed option pass the scorecard in-region? If no, you cannot buy it.
3. Is exit acceptable? If no, buy only with a reduction plan.
4. Would building delay a dated commitment (launch, audit)? If yes, buy and schedule the revisit.
5. Write the sentence: "We buy X because Y; we revisit if Z."

Example: three engineers, document Q&A over ordinary PDFs, audit in six weeks. Managed KB recall is 86% on your set, your build estimate is five weeks. You buy, you keep the eval, you set "revisit if legal scans arrive or recall on the payments slice drops below 80%". That is an honest buy. Buying the agent runtime in the same afternoon because it is in the suite is not.""",
   failures="""1. **Buy the suite.** You needed one layer; you adopted five.

2. **Buy to skip measurement.** The audit deadline became an excuse to skip recall@k.

3. **No trigger.** Two years later you are still on a default chunker that fails tables.

4. **Shame build.** You rebuilt a content filter to avoid looking dependent and you now own a worse filter.""",
   line="""I buy a layer when it is not differentiating, it passes my scorecard, and the exit is a number I accept. I write the revisit trigger. I do not buy a suite, and I do not build to look serious.""",
   key_points=[
    "Buy commodity layers that already meet the bar.",
    "A deadline can justify a buy; it cannot justify skipping evals.",
    "Name lock-in, lag and bill as accepted trade-offs.",
    "Write the revisit trigger on the same page.",
    "Buying one layer is not buying the suite.",
    "Building to avoid looking dependent is not engineering.",
   ],
   questions=[
    {"q": "When is buying the honest choice?", "a": "When the layer is not differentiating, the managed option meets quality and compliance, exit cost is acceptable, and building would delay the product or the audit.", "kind": "recall"},
    {"q": "What should accompany a decision to buy?", "a": "Documented trade-offs, a measured exit, and revisit triggers such as a cost cliff, a missing feature, a new slice miss or a deprecation.", "kind": "apply"},
    {"q": "Audit in six weeks; your RAG build is five weeks. What do you do?", "a": "Buy the managed KB if it passes the retrieval eval, keep the golden set, and schedule a revisit. Do not skip the eval because of the date.", "kind": "apply"},
    {"q": "Why is 'the suite was included' a weak reason?", "a": "Each add-on has its own lock-in and ops. Inclusion is a price, not a fit. Score the layer you need.", "kind": "debug"},
    {"q": "A teammate wants to rebuild guardrails to 'own our destiny'. Response?", "a": "Ask whether the managed filter misses the false-positive budget. If it passes, buying is honest; building a worse filter is pride.", "kind": "debug"},
   ],
   links=[AZURE_FOUNDRY],
  ),
  "exit-test-for-a-knowledge-base": entry(
   what="""An **exit test** for a knowledge base is a timed drill: export chunks, embeddings and metadata (source id, offsets, ACLs, last-synced) into a store you control, then prove you can rebuild retrieval elsewhere well enough to re-run your eval. The test is not a slide about "open standards". It is a clock and a file.

You run it in the first month, not the week you are angry. If export is incomplete — embeddings locked, metadata missing, ACLs flattened — the real exit is **re-ingest from source**. That is only possible if you still have the source and the parser recipe.

Write the result on the decision record: "export = 4 hours, embeddings not reusable, re-embed + eval = 8 days". That sentence is the portability row.""",
   why="""On the job, teams discover they cannot leave when the procurement team asks for a second cloud or when the SKU price jumps. An exit test turns that meeting into a number. Without it you are negotiating from hope.

In interviews, "I would check I can export" is junior. "I timed an export, embeddings were not reusable, so I kept sources in my bucket and treated exit as a re-ingest" is senior.

This is also how you catch a tier that advertises export and 403s it on your account.""",
   how="""Drill recipe:

1. Pick a subset (e.g. 100 docs) already in the managed KB.
2. Call the export API or the supported dump. Save chunks, vectors, metadata.
3. Attempt to load them into your own store. Note what is missing.
4. Rebuild from **source** as a fallback; time both paths.
5. Re-run recall@k. Accept a small drop if you documented it; do not accept a missing ACL field.

Example: export gives text chunks and source URIs, no vectors, no per-user filter keys. Rebuild from the bucket takes a day for 100 docs and would take two weeks at full corpus. You keep the bucket as the system of record and you write "exit = re-ingest, 2 weeks". You do not tell leadership "we can switch this afternoon".""",
   failures="""1. **Never running the drill.** The button exists in the docs for a different tier.

2. **Exporting text only and calling it done.** You lost structure, ACLs and offsets; quality will not match.

3. **Deleting the source** after ingest. Exit became archaeology.

4. **No eval after rebuild.** You moved bytes, not quality.""",
   line="""I time an export of chunks, embeddings and metadata in the first month. If vectors or ACLs do not come out, exit is a re-ingest from sources I still own, plus a re-eval. I write the weeks; I do not advertise an afternoon switch.""",
   key_points=[
    "An exit test is a timed export plus a rebuild plus an eval.",
    "Run it early, on your tier, not from the brochure.",
    "If embeddings or ACLs do not export, exit is re-ingest.",
    "Keep source documents as the system of record.",
    "A missing field in the dump is a scorecard fail.",
    "Write the weeks on the decision record.",
   ],
   questions=[
    {"q": "What do you actually time in a knowledge-base exit test?", "a": "Export of chunks, embeddings and metadata, a load or re-ingest into your own store, and a re-run of recall@k.", "kind": "recall"},
    {"q": "Export has text but no ACL keys. What is the real exit?", "a": "Re-ingest from source with the original ACL mapping. Shipping without those keys would leak or over-filter. Count that as rebuild weeks.", "kind": "debug"},
    {"q": "When should you run the drill?", "a": "In the first month after adopt, and again after a tier or API change — not the week you are forced to leave.", "kind": "apply"},
    {"q": "Why keep the source bucket if the KB has everything?", "a": "Because export is often incomplete. The source is what makes a re-ingest possible.", "kind": "recall"},
    {"q": "Leadership wants a same-day platform switch. What number do you show?", "a": "The last exit-test weeks, including re-embed and eval. Same-day is only true if that number was hours and quality held.", "kind": "apply"},
   ],
   links=[BEDROCK_KB],
  ),
  "guardrail-false-positive-budget": entry(
   what="""A **false-positive budget** is the maximum share of **allowed** answers a managed filter may block. You set it before you tune categories. Example (illustrative): 2% of a labelled must-allow support set, and 0% on a critical "patients asking about their prescribed dose" slice. Without a budget, every over-block is an anecdote and every tighten is "more safety".

False negatives (missed blocks) get a separate budget, usually much stricter on injections and PII. The two rates trade. Turning every category to maximum will blow the false-positive budget; turning them off will blow the false-negative budget.

The budget is a product decision signed by support and safety, not a number the security tool picked.""",
   why="""On the job, unmanaged filters quietly destroy trust: users learn the bot "refuses everything" and stop asking. That looks like a model quality problem; it is a policy-tuning problem. Interviews love this because it shows you measure safety as an error rate, not as a vibe.

A hospital or bank interviewer will ask how you would tune a filter that blocks legitimate clinical or financial questions. The budget plus a must-allow set is the answer. "We turned it off" is a fail. "We left defaults" is also a fail.""",
   how="""1. Label 200–500 real allowed answers as must-allow, with a critical slice tagged.
2. Label a must-block set (injections, PII, disallowed topics).
3. Propose budgets in a short doc; get support and safety to sign.
4. Run the managed policy; compute FP and FN by slice.
5. Tune categories, topic lists and allow phrases until you are inside both budgets — or escalate a slice to a human queue instead of pretending the filter can do it.

Example: default policy blocks 11% of allowed clinical FAQs. Budget is 2%. You narrow "medical advice", add an allow list for prescribed-dose questions, and send anything about new symptoms to a nurse queue. FP on the clinical slice falls to 1.4%; FN on the injection set stays at 0 on your current cases. You record both.""",
   failures="""1. **No must-allow set.** You only test scary examples, so you only see FN.

2. **Budget after the complaint.** You invented 5% because that is what you already have.

3. **One global rate.** The payments slice needed 0% FP; the chitchat slice could tolerate 4%.

4. **Silent tighten.** Someone raised a category in the console; support volume of "I can't get an answer" doubled.""",
   line="""I set a false-positive budget on a labelled must-allow set before I tune a guardrail, and a stricter false-negative budget on must-block. I tune to both numbers, and I queue slices a filter cannot hold. Defaults are not a policy.""",
   key_points=[
    "FP budget = max share of allowed answers the filter may block.",
    "FN budget is separate and usually stricter on injections and PII.",
    "Label must-allow and must-block sets, with critical slices.",
    "Support and safety sign the budgets; engineering tunes to them.",
    "A human queue is a valid way to hold a slice the filter cannot.",
    "Console-only changes to categories are unbudgeted regressions.",
   ],
   questions=[
    {"q": "What is a guardrail false-positive budget?", "a": "The maximum fraction of allowed, labelled answers the filter may block. It is set before tuning and signed by support and safety.", "kind": "recall"},
    {"q": "Default categories block 11% of allowed clinical FAQs. What do you do?", "a": "Compare with the signed budget, narrow categories or add allow phrases, and route a remainder to a human queue. Do not disable the filter or ignore the slice.", "kind": "apply"},
    {"q": "Why is a single global FP rate not enough?", "a": "Critical slices (dose, payments, legal) may need near-zero over-block, while chitchat can tolerate more. Report both.", "kind": "recall"},
    {"q": "Blocked-ticket volume doubles overnight. First check?", "a": "Whether a category or threshold changed in the console, then re-run the must-allow set. Treat it as an unbudgeted policy change.", "kind": "debug"},
    {"q": "Who should sign the budgets and why?", "a": "Support (they own over-block pain) and safety (they own misses). Engineering cannot invent the trade-off alone.", "kind": "apply"},
   ],
   links=[BEDROCK_GR],
  ),
  "fine-tune-portability": entry(
   what="""**Fine-tune portability** is the answer to two questions: can the resulting weights **leave** the platform, and which **runtimes** can load them? Managed custom models are often invocable only on that catalog. Adapters you trained yourself with PEFT are files you can take to vLLM, a second cloud, or a laptop — if you also kept the base revision, the template and the eval.

Portability is not only a file. A LoRA without the base id, rank, target modules and chat template is a paperweight. A merged GGUF without the eval report is an unverified binary.

Ask before the first job: download link, format (PEFT folder, merged safetensors, GGUF), licence of the base, and whether distillation terms allow the student to live elsewhere.""",
   why="""On the job this is the difference between a capability you own and a SKU you rent. Interviewers will ask "what if we leave Bedrock / Vertex / Azure?" If your only tune is a hosted custom id, the honest answer is "we retrain from our dataset". That is acceptable if you said it up front. It is a crisis if you assumed the weights were yours.

Level 13 and Level 11 meet here. The platform can run the job; it does not owe you an export.""",
   how="""Before you click train:

1. Read the custom-model export page for that catalog and region.
2. If export is no: write "exit = retrain from dataset D on base B'". Confirm D is complete.
3. If export is yes: download a tiny job now; load it on a runtime you control; re-run five eval items.
4. Store adapter + `adapter_config.json` + tokenizer + template + dataset hash + eval report together.
5. Repeat the load test after every real job, not only the spike.

Example: Vertex managed tune, no weight export. You still run it because GPU ops do not exist and the dataset is yours. You refuse a second tune whose labels live only in a spreadsheet on someone's laptop. DIY LoRA on an open 8B, by contrast, you file in object storage and you have loaded it on vLLM once on purpose.""",
   failures="""1. **Assuming adapters are files.** On this platform they are not.

2. **Exporting once, never reloading.** The file is corrupt or the runtime cannot apply that rank.

3. **Losing the template.** Weights load; behaviour is nonsense.

4. **Teacher ToS.** The student cannot legally live on the runtime you picked.""",
   line="""I ask whether adapter weights leave the platform and which runtimes can load them before I train. If they cannot leave, exit is a retrain from a dataset I still have. If they can, I prove a reload on my runtime and I store config, template and eval with the file.""",
   key_points=[
    "Ask export and runtime compatibility before the first job.",
    "No export means exit is a retrain from your data.",
    "A portable tune is weights plus base id, config, template and eval.",
    "Prove a reload on a runtime you control.",
    "Managed custom ids are often catalog-bound SKUs.",
    "Teacher terms can block where a distilled student may run.",
   ],
   questions=[
    {"q": "What two questions define fine-tune portability?", "a": "Can the weights leave the platform, and which runtimes can load them with the same template and base revision.", "kind": "recall"},
    {"q": "Managed tune, no download. What must you still own?", "a": "The versioned dataset, the recipe, the eval and a written retrain plan on a successor base.", "kind": "apply"},
    {"q": "You downloaded an adapter but vLLM rejects it. Checks?", "a": "Base revision, rank, target modules, PEFT version and whether the serve path supports that adapter type. A file is not a proven portable tune until it loads and matches eval items.", "kind": "debug"},
    {"q": "Why store the chat template with the adapter?", "a": "Without it the weights load and the model behaves like a different product. Template mismatch is the usual 'it worked in the notebook' failure.", "kind": "recall"},
    {"q": "When is a catalog-bound custom model still acceptable?", "a": "When GPU ops do not exist, the eval wins, and you explicitly accept retrain-from-data as the exit.", "kind": "apply"},
   ],
   links=[VERTEX_TUNE],
  ),
  "build-versus-buy-scorecard": entry(
   what="""A **build-versus-buy scorecard** is one page that scores control, evaluation depth, cost at 10× current volume, and auditor explainability — for each layer you are tempted to rent. It is the scorecard from "what to judge" narrowed to the four rows that actually flip build/buy for AI add-ons.

- **Control**: can you change chunking, loop, thresholds, routing?
- **Eval depth**: can you run your metrics, not only theirs?
- **Cost at 10×**: does the SKU stay sane when traffic or corpus grows?
- **Auditor explainability**: can you show why this answer, this span, this block happened?

Fill it with evidence from the bake-off and the exit test. Date it. The next argument starts from this page, not from memory.""",
   why="""On the job this page ends circular Slack threads. In interviews it is a prop you can talk through in ninety seconds: here is why we bought guardrails, here is why we built retrieval, here is the 10× cost that would flip retrieval to a cheaper managed tier — or the opposite.

Auditors and banks care about the last row more than startups do. If you cannot explain a citation or a block, you do not have a system you can sell to them, however cheap.""",
   how="""One page, four columns (build / managed / hybrid) and four rows. Example for retrieval:

| | Build | Managed | Hybrid |
| Control | full chunker | limited | custom parser on hard docs |
| Eval depth | our recall@k | some metrics + our set | our set on both |
| Cost at 10× | engineer + store | SKU cliff? | mix |
| Explain | we can show chunks | depends on export | we show our slices |

You pick hybrid because control on tables matters, the managed path passes narrative PDFs, 10× is fine, and you can show passages from both. You revisit if the SKU cliff appears in the bill.

Keep the page next to the layer mix. They are the same decision at two zoom levels.""",
   failures="""1. **Rows without evidence.** "Control = high" with no note of what you can actually change.

2. **Cost at today's volume only.** 10× is the row that catches provisioned minimums and per-step agent prices.

3. **Skipping explainability.** You cannot show a citation path; a bank will not accept "the KB said so".

4. **A living spreadsheet with 40 tabs.** Nobody updates it. One page or it dies.""",
   line="""I score build versus buy on control, eval depth, cost at 10× and auditor explainability, with evidence, on one page per layer. That page plus an exit number is the decision. A suite checkbox is not.""",
   key_points=[
    "Four rows: control, eval depth, cost at 10×, explainability.",
    "One page per layer, evidence in every cell.",
    "10× volume is where SKU cliffs appear.",
    "If you cannot explain a citation or a block, you cannot sell it to an auditor.",
    "Hybrid is a column, not a compromise you hide.",
    "Keep it next to the layer mix and the exit weeks.",
   ],
   questions=[
    {"q": "Which four rows belong on a build-versus-buy scorecard for AI add-ons?", "a": "Control, evaluation depth, cost at 10× volume, and auditor explainability.", "kind": "recall"},
    {"q": "Why include cost at 10× rather than today's bill?", "a": "Per-step, per-GB and provisioned-minimum SKUs look cheap now and invert at scale. 10× is a cheap stress test.", "kind": "recall"},
    {"q": "A managed KB scores well except you cannot show which chunk was retrieved. Decision?", "a": "Explainability failed. Buy only if you can log retrieved spans another way; otherwise build or hybrid so you can show the passage.", "kind": "apply"},
    {"q": "The scorecard has grown to forty rows. What should you do?", "a": "Cut back to the four flip rows plus a link to the full scorecard. An unmaintained sheet is not a decision record.", "kind": "debug"},
    {"q": "How does this page relate to the layer-by-layer mix?", "a": "The mix says buy/build/defer; this page is the evidence for one layer. They should cite each other.", "kind": "apply"},
   ],
   links=[AZURE_FOUNDRY, BEDROCK_KB],
  ),
 }
}
