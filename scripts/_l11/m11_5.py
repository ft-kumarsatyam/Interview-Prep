from assemble import entry

NOTES = {
 "m11-5": {
  "on-demand-vs-provisioned-throughput": entry(
   what="""**On-demand** capacity is pay-per-token (or per request) with a **quota** ceiling. **Provisioned or reserved throughput** is capacity you buy ahead — Bedrock provisioned throughput, Azure PTUs, Vertex provisioned — which changes **both price and rate limits**. You pay for the reservation whether you use it or not. In return you get a higher, more predictable ceiling and often a lower unit price at high utilisation.

On-demand is the default for spiky or unknown traffic. Provisioned is for a **flat baseline** you can defend with numbers. Many teams mix: provision the baseline, spill spikes to on-demand if the platform allows, or queue the rest.

Provisioned units are usually **per model, per region, per account**, and they take time to buy and to shed. They are not a toggle.""",
   why="""On the job, buying a huge reservation because a slide said "enterprise" is how you waste money. Refusing any reservation when you have a flat 24/7 load is how you 429 at 10:00 every day. The skill is matching the capacity product to the traffic shape.

In interviews, define both, say they change price **and** limits, and describe a mixed strategy. Mention that provisioned is an approval process (quota + purchase), not a config flag you flip in code.

Also mention exit: you may keep paying the reservation during a migration.""",
   how="""Sketch a day: 80% of tokens between 09:00–18:00 at a steady 2M tokens/hour; nights near zero. You provision for ~2M/hour on the production model in that region, and you leave nights on on-demand (or accept idle reservation if the product is not hour-flexible).

Compute break-even: daily reserved cost versus on-demand cost at that token volume. If you are under break-even, do not buy. If 429s cluster at the on-demand cap and the business cannot queue, you buy even a bit above break-even for reliability.

Document the purchase ticket with the traffic graph. That is what capacity teams approve.""",
   failures="""1. **Provisioning for peak.** Idle all day.

2. **On-demand only with no queue.** Every spike is user-visible failure.

3. **Wrong model or region reserved.** The traffic is elsewhere.

4. **Cannot shed.** You bought a year and then swapped models.""",
   line="""On-demand is quota-capped pay-per-use. Provisioned buys a ceiling and a different price, paid whether you use it or not. I provision the flat baseline I can show on a graph and I treat spikes as queue or on-demand spill, not as a reason to reserve the peak.""",
   key_points=[
    "On-demand: per-token with a quota. Provisioned: reserved capacity that changes price and limits.",
    "You pay reservations whether you use them.",
    "Mix: reserve the baseline, handle spikes with queue or on-demand.",
    "Purchases are per model, region and account — and slow to reverse.",
    "Bring a traffic graph to the quota/capacity ticket.",
    "Do not provision for a peak you hit one hour a month.",
   ],
   questions=[
    {"q": "How do on-demand and provisioned throughput differ?", "a": "On-demand bills per use up to a quota. Provisioned reserves capacity you pay for anyway, usually with higher limits and a different unit price. Both are per model and region.", "kind": "recall"},
    {"q": "Traffic is a flat daily baseline plus occasional spikes. Best strategy?", "a": "Provision the baseline if it beats on-demand on price or reliability, and serve spikes from on-demand or a queue. Do not provision for the peak.", "kind": "apply"},
    {"q": "You reserved a large unit and utilisation is 15%. What went wrong?", "a": "You provisioned for peak or for hope. Compute break-even, shed or resize if the product allows, and put the rest on on-demand.", "kind": "debug"},
    {"q": "Why is provisioned not a code flag?", "a": "It is a purchase and an approval in a region for a model. It takes time to add and to remove, and the app must be pointed at the reserved resource.", "kind": "recall"},
    {"q": "What do you attach to a capacity request?", "a": "A traffic graph, token rates, 429 history, and the model/region. Anecdotes do not get units approved.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock provisioned throughput", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru.html"},
    {"title": "Azure OpenAI PTUs", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding"},
   ],
  ),
  "reading-the-quota-model": entry(
   what="""A platform **quota model** is several numbers, not one: **requests per minute (RPM)**, **tokens per minute (TPM)** (sometimes input and output separately), **concurrent requests**, and **per-model, per-region** ceilings. Some count **max output tokens you asked for**, not tokens you used, at admission time. Batch endpoints have another table. Preview models have tiny quotas.

Reading the quota model means you know **which limit you will hit first** for your traffic shape. A chatty agent with short prompts hits RPM or concurrency. A long-context summariser hits TPM. If you only watch one number, the other one pages you.

Quotas are account- and region-scoped. A raise in US does nothing for Mumbai.""",
   why="""On the job, 429s are usually quota, not "the model is down". If you cannot name the dimension, you cannot fix it (smaller max_tokens, fewer parallel calls, a raise request, a queue).

In interviews, listing RPM, TPM, concurrency and per-model/region is the recall answer. Then say how a large `max_tokens` can burn TPM. That is the applied twist.

Also say quotas are an approval process: you request with evidence, you wait, you do not `while True` retry.""",
   how="""For each production model, write:

- RPM, TPM in, TPM out, concurrency
- Whether admission uses requested max output
- Current usage at p95 hour
- Which number is closest to the ceiling

Example: you set `max_tokens=4096` "just in case" on a classifier that emits 20 tokens. Admission reserved 4096 × RPM against TPM and you 429'd at low real usage. Fix: set max to 64, and you 4× your effective capacity without a ticket.""",
   failures="""1. **One global 'rate limit' in your head.**

2. **Huge max_tokens defaults.**

3. **Raising quota instead of fixing concurrency storms.**

4. **Watching only prod US.** Staging and other regions surprise you.""",
   line="""I read RPM, TPM, concurrency and per-model regional ceilings, and I know which one my traffic hits first. I set max output honestly because some platforms reserve it at admission. Quotas are requested with evidence, not retry loops.""",
   key_points=[
    "Quotas are RPM, TPM (in/out), concurrency — per model and region.",
    "Admission may count requested max tokens, not used tokens.",
    "Chatty agents hit RPM; long context hits TPM.",
    "A raise is an approval with traffic evidence.",
    "Batch often has a separate table.",
    "Defaults like max_tokens=4096 can waste most of a TPM budget.",
   ],
   questions=[
    {"q": "Name four quota dimensions a platform may enforce.", "a": "Requests per minute, tokens per minute (sometimes split in/out), concurrent requests, and per-model per-region ceilings. Batch may differ.", "kind": "recall"},
    {"q": "Throttling occurs though real tokens are low. What often caused it?", "a": "A large max-output setting counted at admission, or you hit RPM/concurrency rather than TPM. Check the dimension in the error.", "kind": "debug"},
    {"q": "Which limit does a long-context summariser usually hit first?", "a": "Tokens per minute (and context size). A chatty short-prompt agent usually hits RPM or concurrency first.", "kind": "apply"},
    {"q": "Why does a US quota raise not fix India 429s?", "a": "Quotas are regional (and per model). Request the raise in the region you call.", "kind": "recall"},
    {"q": "What evidence belongs in a quota-increase ticket?", "a": "Which dimension you hit, graphs of usage vs cap, retry/429 rates, and why engineering (queue, max_tokens, caching) is not enough.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock quotas", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html"},
    {"title": "Azure OpenAI quotas", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits"},
    {"title": "Vertex AI quotas", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/quotas"},
   ],
  ),
  "planning-for-burst-traffic": entry(
   what="""**Burst traffic** is a spike the platform will **not** absorb just because you are a customer. You plan with **queues**, **backpressure**, **shedding**, and **batch endpoints** for work that can wait. Interactive calls get a short queue and a 503 when full. Offline summaries go to a batch job with a later SLA.

Retries without jitter turn a burst into a **retry storm** that multiplies load. A burst plan includes a retry budget (e.g. one retry on 429/503, then fail) and a visible queue depth so the product can say "busy" instead of spinning.

Provisioned capacity helps the baseline. It does not delete the need for a queue if marketing can 10× you at noon.""",
   why="""On the job, launches and email campaigns are how LLM apps die. If every client hits the model synchronously, you 429 and then retry and then page. If you have a queue, you degrade.

In interviews, "the platform will scale" is a fail. "I queue, I bound retries, I expose wait, I send overnight work to batch" is a pass. Mention backpressure to the user (disable send, show wait) not only to the worker.

This connects to product: a 30-second wait with a progress state is better than a 30-second spin of 429s.""",
   how="""Design:

- Interactive: in-process semaphore (concurrency) + short Redis/SQS queue + 503 after N.
- Retry: exponential backoff + jitter, max 1–2, only on 429/5xx.
- Bulk: batch API or nightly worker with its own quota.
- Load-shed: drop lowest-priority features first (nice-to-have rewrite, not checkout help).

Example: a product launch 8×'d Q&A. The semaphore kept concurrency at the TPM-safe number; the UI showed "about a minute". A second client without a queue took the site down. Same quota, different plan.""",
   failures="""1. **Unlimited client retries.**

2. **Synchronous everything**, including 10-page summaries.

3. **Hidden queue** — users retry, doubling enqueue.

4. **One queue for interactive and batch** — batch starves chat.""",
   line="""I do not assume the platform absorbs a spike. I queue, I bound retries with jitter, I expose wait, and I send deferrable work to batch. A 503 with a message is a product; a retry storm is an outage.""",
   key_points=[
    "Plan bursts with queues, backpressure, shedding and batch — not hope.",
    "Retry budgets with jitter; never unlimited synchronized retries.",
    "Show queue wait to users so they do not double-submit.",
    "Separate interactive and batch so batch cannot starve chat.",
    "Shed low-priority features first.",
    "Provisioned capacity is not a burst plan by itself.",
   ],
   questions=[
    {"q": "How do you plan for burst traffic on a quota-capped model API?", "a": "Queue and bound concurrency, use backoff with jitter, shed low-priority work, and send deferrable jobs to batch. Do not rely on the platform to absorb the spike.", "kind": "recall"},
    {"q": "After throttling, all clients retry immediately. What happens?", "a": "A retry storm amplifies load. Use backoff, jitter and a small retry budget; surface a busy state.", "kind": "debug"},
    {"q": "Why expose queue depth to the client?", "a": "So the product can show wait and disable double-submit, instead of users retrying and making the queue worse.", "kind": "apply"},
    {"q": "Where should a 20-page nightly summary go?", "a": "A batch endpoint or offline worker with its own SLA and quota, not the interactive chat path.", "kind": "apply"},
    {"q": "What is load-shedding in this context?", "a": "Dropping or delaying lower-priority model features so the critical path stays inside quota.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock batch inference", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference.html"},
   ],
  ),
  "defending-a-quota-increase": entry(
   what="""A **quota increase** is an **approval process**. You request a higher RPM/TPM/concurrency (or more PTUs) with **traffic evidence**: graphs of usage versus cap, 429 rates, a forecast, and what you already did (caching, max_tokens, queue, smaller model). "We are launching" without numbers is a weak ticket.

Capacity teams see hundreds of requests. They approve the ones that look like production systems. They delay the ones that look like unbounded agents.

Treat the ticket as a design review. Sometimes the right outcome is "no, queue instead" or "use batch".""",
   why="""On the job, waiting a week for quota is a launch risk you schedule backwards from. You file early, with evidence, in the right region.

In interviews, saying "we just raise quota" sounds naive. Saying "we defend a raise with graphs after we squeezed engineering levers" sounds operational.

Also mention: a raise is not instant, not global, and not permanent if you never use it.""",
   how="""Ticket body:

- Model, region, current cap, requested cap
- Last 14 days: p95 TPM/RPM vs cap, 429 count
- What we changed already (max_tokens 4096→128, cache hit 30%, queue)
- Forecast: launch date, expected tokens/day
- Contact for follow-up

Example: you asked for 10× with no graph and were rejected. You returned with 429s at 92% of TPM during 10–11am, cache work that recovered 20%, and a 2× request. Approved in two days. Same launch, better packet.""",
   failures="""1. **Filing the day of launch.**

2. **Wrong region or model on the form.**

3. **No engineering work first** — you look careless.

4. **Asking for 100×** to avoid thinking.""",
   line="""I defend a quota raise with graphs, 429s, a forecast and the engineering I already did. I file in the right region before launch. Sometimes the honest answer is a queue, not a bigger cap.""",
   key_points=[
    "Quota is an approval, not a setting.",
    "Attach usage-versus-cap graphs and 429 history.",
    "Show caching, max_tokens and queue work first.",
    "File early, in the correct model and region.",
    "Ask for a defendable multiple, not 100×.",
    "Accept 'use batch/queue' as a valid outcome.",
   ],
   questions=[
    {"q": "What evidence belongs in a quota-increase request?", "a": "Model and region, current vs requested cap, usage graphs, 429 rates, forecast, and engineering already done (cache, max tokens, queue).", "kind": "recall"},
    {"q": "Your first ticket was rejected. What was likely missing?", "a": "Numbers, or you asked for a huge multiple with no squeeze on engineering levers. Resubmit with graphs and a smaller, justified ask.", "kind": "debug"},
    {"q": "When should you file relative to a launch?", "a": "As soon as the forecast exists — often weeks ahead — because approval is not instant.", "kind": "apply"},
    {"q": "Why mention caching in a capacity ticket?", "a": "It shows you are not using quota as a substitute for basic efficiency, which makes the remaining ask credible.", "kind": "apply"},
    {"q": "Is a bigger quota always the right fix for 429s?", "a": "No. Retry storms, huge max_tokens, or work that should be batch can be the real bug.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock quotas", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html"},
    {"title": "Azure OpenAI quota increase", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits"},
   ],
  ),
  "cost-per-request-end-to-end": entry(
   what="""**Cost per request end to end** is every metered hop: **input tokens, output tokens**, embedding calls, rerankers, managed knowledge-base retrieval, guardrail checks, tool HTTP, and retries. The model line on the invoice is only one row. An agent that loops five times is five model rows plus tools.

Prefer **cost per successful task** over cost per HTTP call. A cheap model that retries three times or calls a second judge can lose to a dearer one-shot.

Build the number from traces (usage objects) and from the price card in that region. Prices differ by region and by on-demand vs provisioned.""",
   why="""On the job, finance will ask why spend tripled when "calls are flat". End-to-end costing finds loops, cache misses and a model swap. Per-call averages hide tails.

In interviews, walk a RAG request: embed + retrieve (KB) + generate + optional rerank + guardrail. Assign a dollar to each. That sketch is the answer.

Also mention output tokens often dominate chat, and max_tokens does not cap price if you stream long answers — actual output does.""",
   how="""Spreadsheet one successful answer:

- Embed query: 0.002
- KB retrieval: 0.001
- Generate in: 0.004  out: 0.012
- Guardrail: 0.001
- Retry 10% of time: +0.002 expected
- Total ≈ $0.022 / success

Compare to a smaller model that needs two generates: maybe $0.030. You keep the larger one-shot.

Alert on p95 cost, not only mean.""",
   failures="""1. **Model-only costing.**

2. **Ignoring retries and loops.**

3. **Using list prices from another region.**

4. **Optimising cost per call while task success falls**, which increases human cost.""",
   line="""I cost a request as every metered hop plus retries, and I compare cost per successful task. The invoice's model line is not the product's cost. Tails and loops are where the money goes.""",
   key_points=[
    "Sum input, output, embeddings, retrieval, guardrails, tools and retries.",
    "Optimise cost per successful task, not per HTTP call.",
    "Output tokens and loops usually dominate chat agents.",
    "Use regional prices and the usage object, not a blog table.",
    "Watch p95 cost; means hide tails.",
    "A cheaper model that retries can lose.",
   ],
   questions=[
    {"q": "What hops belong in end-to-end request cost?", "a": "Input and output tokens, embeddings, managed retrieval, guardrails, tools and the expected cost of retries or extra agent steps.", "kind": "recall"},
    {"q": "Average cost per call is on target but spend is 3×. First inspection?", "a": "Tails, loops and retries: p95 cost, step counts, cache hit rate and whether a model id changed.", "kind": "debug"},
    {"q": "Why prefer cost per successful task?", "a": "Failures and retries are real spend. A cheap call that does not finish the job is expensive in aggregate.", "kind": "recall"},
    {"q": "How do you get the number in practice?", "a": "Multiply usage-object tokens by the regional price card and add other metered APIs from traces. Reconcile to the bill weekly.", "kind": "apply"},
    {"q": "A judge model added $0.01 per request. When is it worth it?", "a": "When it raises success enough to beat alternatives, or when it blocks costly wrong actions. Measure both, do not assume.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock pricing", "url": "https://aws.amazon.com/bedrock/pricing/"},
    {"title": "Vertex AI pricing", "url": "https://cloud.google.com/vertex-ai/generative-ai/pricing"},
   ],
  ),
  "attributing-spend-per-team-or-tenant": entry(
   what="""**Attributing spend** means each project, team or tenant has a **cost centre** on the bill. Platforms give you **tags, projects, subscriptions, resource groups, billing accounts**. A **shared API key** or a single role for the whole company cannot do this. You need identity or metadata the billing system can group.

Application-level **virtual keys** on a gateway can attribute when the cloud bill cannot (several products, one role). You still want cloud tags for the platform SKU so finance does not see one lump.

Attribution is how you find the tenant whose agent loop spent $12k.""",
   why="""On the job, unattributed spend becomes a fight. With tags, it becomes a ticket to one squad. In interviews, "how do you stop shared-key cost mystery" is answered with: no shared keys, tags/projects, and virtual keys if many teams share a hop.

Also mention showback vs chargeback: even if you do not invoice tenants, you show them the number.""",
   how="""Pattern:

- One cloud project/account per environment, tags `team`, `product`, `tenant_tier`.
- Worker roles named per product.
- Gateway virtual keys per team with budgets.
- Weekly export: spend by tag.

Example: two products shared `role/app`. Spend doubled. After split roles and tags, product B's new agent was obvious. The fix was a step cap, not a company-wide panic.""",
   failures="""1. **One key / one role.**

2. **Tags on the wrong resource** (the VM, not the model call) so the SKU stays untagged.

3. **Tenant attribution only in the app DB**, never on the bill.

4. **No weekly export** — you look only when Finance yells.""",
   line="""I attribute spend with projects, tags and per-team identities — and virtual keys when many teams share a gateway. A shared API key cannot do chargeback. The goal is that a spike has a name.""",
   key_points=[
    "Use tags, projects and per-product identities; avoid shared keys.",
    "Virtual keys attribute when many teams share one platform role.",
    "A spike should resolve to a team or tenant.",
    "Tag the resources the SKU actually bills.",
    "Showback weekly even if you do not chargeback.",
    "App-only attribution is not enough for Finance.",
   ],
   questions=[
    {"q": "Why can a shared API key not attribute spend?", "a": "Every call looks the same on the bill. You cannot group by team or tenant or revoke one consumer.", "kind": "recall"},
    {"q": "Two products share a role and spend doubled. How do you see who?", "a": "Split identities or add a gateway virtual key per product, tag resources, and re-read the bill. Until then you are guessing.", "kind": "debug"},
    {"q": "What cloud knobs help attribution on a managed platform?", "a": "Separate projects/accounts/resource groups, cost tags, and per-workload identities. Plus exports to the cost store.", "kind": "apply"},
    {"q": "When do virtual keys matter if tags exist?", "a": "When many teams share one tagged role or one endpoint and you need team-level budgets without more cloud accounts.", "kind": "apply"},
    {"q": "What is showback?", "a": "Showing each team their spend regularly so they can act, even if money does not change hands.", "kind": "recall"},
   ],
   links=[
    {"title": "AWS cost allocation tags", "url": "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html"},
   ],
  ),
  "budgets-runaway-cost-alerts": entry(
   what="""**Budgets and runaway-cost alerts** catch an **agent loop or a leaked worker** by **spend rate**, not by the monthly invoice. You set a budget on the platform SKU (and on virtual keys), alert at 50/80/100%, and you have a **kill switch**: disable the worker, cap steps, or revoke the role. Invoice review is forensic; it does not stop tonight.

Hard limits in the app — max steps, max tokens per request, max $ per tenant per day — are the first control. Budgets are the backstop when those fail.

Alerts must page a human who can act. An email to a list nobody reads is not a control.""",
   why="""On the job, loops are normal. Without caps and alerts they are existential. In interviews, "monthly invoice" as the detection method is a fail. "Caps plus spend-rate alerts plus a kill switch" is a pass.

Mention that billing data lags; use usage objects for same-day rate, budgets for the backstop.""",
   how="""Stack:

1. App: step cap, token cap, per-tenant daily cap.
2. Gateway: virtual-key budget.
3. Cloud budget on the generative AI SKU, SNS/email/PagerDuty.
4. Runbook: disable feature flag / scale worker to 0 / attach deny policy.

Example: a tool error caused the agent to retry a tool 200 times. Step cap should have stopped it; it was not set. The spend-rate alert fired at 3 a.m.; on-call flipped the flag. Invoice-only would have found it on the 8th.""",
   failures="""1. **Invoice as the only detector.**

2. **Alert with no kill switch.**

3. **Caps in docs, not in code.**

4. **Budget on the wrong account.**""",
   line="""I cap steps and tokens in the app, I alert on spend rate, and I have a kill switch. The monthly invoice is too late. A runaway loop is a predicted failure, not a surprise.""",
   key_points=[
    "Detect runaway spend on a rate, not on the monthly invoice.",
    "Combine app caps, gateway budgets and cloud budgets.",
    "Alerts must page someone who can disable the worker.",
    "Usage objects cover billing lag.",
    "Per-tenant daily caps stop one customer from burning the account.",
    "A kill switch is part of the design, written in the runbook.",
   ],
   questions=[
    {"q": "What best prevents an overnight agent loop from draining budget?", "a": "Iteration and token caps, spend-rate alerts, and a kill switch. A monthly invoice review is after the fact.", "kind": "recall"},
    {"q": "A budget email fired but spend continued. What was missing?", "a": "A human on-call and an action (flag, scale to zero, deny policy). Notification without a kill switch is not a control.", "kind": "debug"},
    {"q": "Why are app-level caps still needed if cloud budgets exist?", "a": "Budgets can lag and may only notify. Caps stop the loop on the next iteration without waiting for billing.", "kind": "apply"},
    {"q": "What belongs in the runaway-spend runbook?", "a": "How to disable the feature, revoke or deny the role, check traces for the loop, and who to tell in Finance.", "kind": "apply"},
    {"q": "Why set per-tenant daily caps?", "a": "So one tenant or one poisoned input cannot consume the company's whole quota and budget.", "kind": "recall"},
   ],
   links=[
    {"title": "AWS Budgets", "url": "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html"},
    {"title": "Azure budgets", "url": "https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets"},
   ],
  ),
  "which-pricing-model-wins-at-your-volume": entry(
   what="""**Which pricing model wins** is a calculation at **your actual volume**, not at the volume on the pricing page. Compare **on-demand tokens**, **committed/provisioned units**, and **self-hosted GPU hours** using the same unit: **cost per successful task** at last month's tokens and at 3× that. Include people and idle capacity for self-host.

Pricing pages assume you look like their example. You do not. A 20% utilised GPU is ~5× the useful-token cost of a full one. A provisioned unit you use 8 hours a day may still lose to on-demand.

Re-run the math when volume or model id changes. Winners flip.""",
   why="""On the job, finance will ask for a recommendation. A spreadsheet with three rows and two volume scenarios is the artefact. In interviews, walk the math qualitatively: low spiky → on-demand; high flat → provisioned; high flat + simple model + GPU ops → self-host.

Mention you include evals and idle in self-host, and reservations you cannot shed.""",
   how="""Three columns, two volumes (current, 3×):

- On-demand $ / success
- Provisioned $ / success (reservation / successes)
- Self-host $ / success (GPU hour / successes + 0.25 FTE)

Example: 2M tokens/day of an 8B classifier. On-demand $X. GPU at 70% util $0.4X. You still stay on-demand because 0.25 FTE exceeds the saving until 8M/day. You write the flip point so the debate can end.""",
   failures="""1. **Using the vendor's example volume.**

2. **Ignoring idle and people** on self-host.

3. **Comparing list prices across regions.**

4. **One-time math**, never updated after a model swap.""",
   line="""I compare on-demand, provisioned and self-host at our tokens and at 3×, as cost per successful task including idle and people. I write the volume where the winner flips. I do not use the pricing-page example as our traffic.""",
   key_points=[
    "Compare models at your volume and at a multiple, not the brochure's.",
    "Unit is cost per successful task, including idle and people for self-host.",
    "Low spiky traffic usually stays on-demand.",
    "Write the flip point so the debate can end.",
    "Recompute when model or volume changes.",
    "Reservations you cannot shed are part of the cost.",
   ],
   questions=[
    {"q": "Why not use the pricing page's example volume?", "a": "Your mix of input/output, utilisation and people differs. The winner can flip at your numbers.", "kind": "recall"},
    {"q": "A GPU looks cheaper per hour than tokens. When does it still lose?", "a": "When utilisation is low or when the people cost of running it exceeds the token saving. Convert both to cost per successful task.", "kind": "apply"},
    {"q": "What two volumes do you always compute?", "a": "Current and a planned multiple (e.g. 3×) so you know when to revisit provisioned or self-host.", "kind": "apply"},
    {"q": "You swapped to a model with longer outputs. What do you recompute?", "a": "End-to-end cost and the pricing-model winner; output tokens may flip on-demand versus reserved.", "kind": "debug"},
    {"q": "What extra costs belong on the self-host column?", "a": "Idle GPU hours, on-call/people, serving software, and failed capacity you already paid for.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock pricing", "url": "https://aws.amazon.com/bedrock/pricing/"},
    {"title": "Azure OpenAI pricing", "url": "https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/"},
   ],
  ),
  "tokens-per-minute-versus-requests-per-minute": entry(
   what="""**TPM versus RPM** is the habit of knowing **which ceiling you will hit first**. Long-context jobs (full-doc summarise, big RAG prompts) burn **tokens per minute**. Chatty agents (many small tool calls) burn **requests per minute** or **concurrency**. The error string may say "throttled" for both. You read the dimension.

Fixing the wrong dimension wastes a week: you raise RPM while each request is 80k tokens, or you raise TPM while you fire 50 parallel 20-token calls.

Some platforms also split input TPM and output TPM. A verbose model hits output first.""",
   why="""On the job this is the first question after a 429. In interviews, giving one example for each limit shows you have been paged. Mention admission-time max_tokens as a TPM multiplier.

Product implication: collapsing an agent from 12 calls to 2 is an RPM fix; truncating context is a TPM fix.""",
   how="""Dashboard two series: RPM used/cap, TPM used/cap, plus concurrency. Colour the one above 70%.

Example: support agent, 15 tool hops, 800 tokens each. You 429 at 40 users. RPM is at 95%, TPM at 30%. You batch tool results and cut hops to 5. RPM halves. No quota ticket.

Opposite example: legal summariser, 2 RPM, 100k tokens each. TPM is the ceiling. You chunk or use batch.""",
   failures="""1. **One 'rate limit' metric.**

2. **Raising both blindly.**

3. **Ignoring concurrency**, a third ceiling.

4. **Load tests with tiny prompts** that never see TPM.""",
   line="""Long context hits TPM; chatty agents hit RPM or concurrency. I graph both and I fix the dimension I am actually on. A generic 'raise the rate limit' ticket is how you wait a week for the wrong number.""",
   key_points=[
    "TPM is the long-context ceiling; RPM/concurrency is the chatty-agent ceiling.",
    "Read the throttle dimension; do not guess.",
    "Admission max_tokens can inflate TPM usage.",
    "Load-test with production-sized prompts.",
    "Fix hops to save RPM; fix context to save TPM.",
    "Watch output TPM separately when the model is verbose.",
   ],
   questions=[
    {"q": "Which limit will a long-context job hit first versus a chatty agent?", "a": "Long-context: tokens per minute (and context size). Chatty agents: requests per minute or concurrency.", "kind": "recall"},
    {"q": "You raised RPM and 429s continue on the summariser. Why?", "a": "You were TPM-bound. Raising RPM does nothing for 100k-token calls. Chunk, batch, or raise TPM.", "kind": "debug"},
    {"q": "How do you see which dimension is close?", "a": "Graph used/cap for RPM, TPM and concurrency on the production model/region; alert at 70%.", "kind": "apply"},
    {"q": "Why can load tests lie about TPM?", "a": "If they send tiny prompts they never approach token ceilings you will see with real documents.", "kind": "apply"},
    {"q": "How can max_tokens interact with TPM?", "a": "Some platforms reserve requested max output at admission, so an oversized default consumes TPM you never generate.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock quotas", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html"},
    {"title": "Azure OpenAI quotas", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits"},
   ],
  ),
  "provisioned-throughput-break-even": entry(
   what="""**Provisioned throughput break-even** is the **daily (or monthly) token volume** where reserved capacity costs less than on-demand for the same model and region — after you include unused hours. If reserved is $R/day and on-demand is $P per million tokens, break-even tokens/day ≈ R / P (adjusted for input/output mix). Below that, you are paying for idle. Above that, reserved wins on price; it may have won earlier on reliability if on-demand 429s were the real cost.

Compute it on a spreadsheet, not in your head. Recompute when prices or mix change.

Reliability value (avoided 429s) can justify being slightly above the price break-even. Write that as a separate line so finance sees it.""",
   why="""On the job, this number ends arguments. In interviews, being able to set up the equation is enough; they rarely want arithmetic theatre. Mention unused hours and input/output mix as the two gotchas.

Also mention minimum commitment periods that move break-even if you might swap models.""",
   how="""Example (illustrative numbers): reserved $240/day, on-demand $12 / M tokens blended. Break-even = 20M tokens/day. You are at 8M → stay on-demand or a smaller reservation. You are at 30M with 429s → buy.

If you only use the reservation 10 hours a day and the product bills 24, your effective break-even rises. Prefer products with time-flexible units if your traffic is diurnal.

Put the formula in the decision record with the date and price URL.""",
   failures="""1. **Ignoring idle hours.**

2. **Using input price for a verbose output workload.**

3. **Forgetting the commitment** you cannot exit.

4. **Counting 429 pain as zero** or as infinity — be explicit.""",
   line="""Break-even is reserved cost divided by on-demand unit price, adjusted for mix and idle hours. I write the token volume where reserved wins, and I separately price reliability. I do not buy units from a keynote.""",
   key_points=[
    "Break-even ≈ reserved cost / on-demand price at your input-output mix.",
    "Idle hours raise the volume you need to win.",
    "Price the avoided 429s separately from unit price.",
    "Commitments can make a short-lived winner a loser.",
    "Recompute when mix or list price changes.",
    "Illustrative blog numbers are not your break-even.",
   ],
   questions=[
    {"q": "How do you compute provisioned-throughput break-even?", "a": "Divide the reserved daily (or period) cost by your blended on-demand price per token, then adjust for unused hours and input/output mix. That token volume is the price flip point.", "kind": "recall"},
    {"q": "Reserved looks cheaper on the slide but you run 8 hours a day. What happens?", "a": "If you pay 24h, idle hours push break-even higher. You may still lose to on-demand, or you need a smaller/time-flexible reservation.", "kind": "apply"},
    {"q": "When would you buy reserved above the price break-even?", "a": "When on-demand 429s have a measured reliability cost (lost launches, SLOs) that you write down, not when you guess.", "kind": "apply"},
    {"q": "Why does output-heavy chat change the math?", "a": "Output tokens often cost more. A blended price from an input-heavy sample will understate on-demand cost — or the reverse. Use your mix.", "kind": "debug"},
    {"q": "What do you store with the break-even number?", "a": "Date, price URL, mix assumption, idle-hour assumption, and the commitment term.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock provisioned throughput", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru.html"},
    {"title": "Azure PTU onboarding", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding"},
   ],
  ),
  "queue-depth-as-a-product-signal": entry(
   what="""**Queue depth as a product signal** means you **show wait** (and disable stampede retries) instead of hiding a backlog behind spinning retries that hammer quota. If 200 requests sit in front of the user, the honest UI is "about two minutes" or "we will email you", not a 30-second spinner that times out.

The queue is an engineering control. The depth is a **product** fact. Product uses it to shed features, delay a send button, or switch a task to batch.

Without a signal, users retry and you measure a worse spike than reality.""",
   why="""On the job, this is the difference between a degraded launch and a self-inflicted outage. In interviews, connecting queue depth to UX is a mature answer; most candidates stop at "we will use SQS".

Also mention fairness: a visible queue lets you prioritise paying or interactive work over bulk.""",
   how="""Expose `approx_wait_s` from queue depth / service rate. UI states: ready, short wait, long wait (offer email), closed (shed). Clients honour `Retry-After` and do not auto-retry more than once.

Example: at depth 0–20, chat is live. At 20–200, you show wait and disable regenerate. Above 200, you take a callback address. Same workers, better outcomes.

Log depth as a metric; alert when wait exceeds the SLO, not only when 429s start.""",
   failures="""1. **Invisible queue + aggressive client retry.**

2. **One spinner for a 10-minute backlog.**

3. **No priority lanes.**

4. **Measuring only 429s**, not wait.""",
   line="""Queue depth is a UX signal. I show wait, I stop double-submit, and I offer batch or callback when the backlog is long. Hidden queues plus retries are how a burst becomes an outage.""",
   key_points=[
    "Expose wait from queue depth; do not hide backlog behind a spinner.",
    "Disable stampede retries and honour Retry-After.",
    "Offer email/batch when wait exceeds interactive SLO.",
    "Alert on wait, not only on 429s.",
    "Use depth to prioritise interactive over bulk.",
    "A visible queue is a product feature, not an embarrassment.",
   ],
   questions=[
    {"q": "Why expose queue wait to the client instead of retrying?", "a": "Retries stampede the quota and hide the backlog. A wait signal lets users not double-submit and lets the product shed or switch to batch.", "kind": "recall"},
    {"q": "Users hammer refresh during a launch. What did the UI miss?", "a": "A wait state and a disabled send/regenerate. The queue was invisible so they created extra jobs.", "kind": "debug"},
    {"q": "What metric do you alert on besides 429s?", "a": "Estimated wait or queue depth against the interactive SLO.", "kind": "apply"},
    {"q": "When do you switch a request from interactive to callback?", "a": "When predicted wait exceeds the interactive SLO (e.g. a few minutes) and the task can be delivered later.", "kind": "apply"},
    {"q": "How does queue depth help fairness?", "a": "You can run priority lanes so bulk jobs do not sit in front of user chat.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon SQS best practices", "url": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html"},
   ],
  ),
  "cost-anomaly-playbook": entry(
   what="""A **cost anomaly playbook** is the first **three checks** when spend doubles overnight: **loop** (agent steps, retries), **cache miss** (hit rate collapsed), **model swap** (alias move or config typo to a dearer id). Then: attribution (which team/tenant), quota errors, and a new feature flag. The playbook is a page in the runbook with queries, not a brainstorm.

You run it before you buy more quota or argue about price cards. Most doubles are bugs.""",
   why="""On the job, the worst response is a war room without a list. In interviews, listing loop / cache / model swap in that order is crisp and memorable. Mention you look at p95 cost and step counts, not only the invoice total.

Finance will join the call. A playbook makes you look like you expected this — because you did.""",
   how="""Check 1 — Loop: traces with step count > cap, repeated tool names, retry storms. Fix: cap, kill switch.
Check 2 — Cache: hit rate vs yesterday; did a deploy disable the cache or change keys? Fix: restore keying.
Check 3 — Model: resolved model id vs pin; price per 1k tokens. Fix: revert pin.

Then: spend by tag, new endpoints, region mis-point.

Example: spend ×2, calls +5%. Hit rate 70% → 5% after a cache-key bug included a timestamp. You revert the key, spend returns. You never opened a quota ticket.""",
   failures="""1. **Buying capacity first.**

2. **Looking only at call count.**

3. **No traces**, so loops are invisible.

4. **Playbook in someone's head.**""",
   line="""When spend doubles I check loop, cache miss and model swap before I do anything else. Those three explain most overnight bills. Then I attribute and I use the kill switch if it is still running.""",
   key_points=[
    "First three checks: agent/retry loop, cache miss, model swap.",
    "Use traces (steps, resolved id, hit rate), not only the invoice.",
    "Do not buy quota until the bug is ruled out.",
    "Attribution tells you which kill switch to flip.",
    "Write the queries in a runbook.",
    "Call-count-flat + spend-up is usually tokens per call or a dearer model.",
   ],
   questions=[
    {"q": "What are the first three checks when LLM spend doubles overnight?", "a": "A loop (steps/retries), a cache-hit collapse, and a model swap (alias or typo). Then attribute to a team and consider the kill switch.", "kind": "recall"},
    {"q": "Call count is flat but spend doubled. Which checks are most likely?", "a": "Model swap to a dearer id, longer outputs, or more tokens per call from cache miss / larger context — not more requests.", "kind": "debug"},
    {"q": "Hit rate fell from 70% to 5% after a deploy. What do you look at?", "a": "Cache key composition (timestamps, request ids) and whether the cache was bypassed. Restore the key; do not raise quota.", "kind": "apply"},
    {"q": "Why is a playbook better than a war-room brainstorm?", "a": "The same three causes recur. Written queries get you to the kill switch faster when Finance is on the call.", "kind": "apply"},
    {"q": "Where do you see a loop if the invoice only shows tokens?", "a": "In traces: step counts, repeated tools, retry flags. Instrument those before the first incident.", "kind": "recall"},
   ],
   links=[
    {"title": "AWS Cost Anomaly Detection", "url": "https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html"},
   ],
  ),
 }
}
