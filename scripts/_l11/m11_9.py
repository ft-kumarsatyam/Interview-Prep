from assemble import entry

BEDROCK = {"title": "Amazon Bedrock user guide", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html"}
VERTEX = {"title": "Vertex AI generative AI overview", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview"}
FOUNDRY = {"title": "Azure AI Foundry overview", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry"}
OA_PROD = {"title": "OpenAI production best practices", "url": "https://platform.openai.com/docs/guides/production-best-practices"}

NOTES = {
 "m11-9": {
  "what-travels-and-what-does-not": entry(
   what="""Plan any platform move by splitting artefacts into **travels** and **does not**. Travels: prompts, eval datasets, tool services, application code behind an interface, source documents, telemetry in a standard format, generic IaC. Does not (or only with a rebuild): IAM and private-network constructs, proprietary knowledge-base and agent configs, some tuned weights, quotas and provisioned commitments, console dashboards, billing relationships.

A subtle third bucket: **travels as text, not as behaviour**. The same prompt on a new model is a new product until you re-eval. Embeddings travel as bytes only if the same embedder exists on the far side.

Keep an inventory with a travel status on each row. The inventory is the migration plan; the code change is the easy part.""",
   why="""On the job, leadership hears "we can switch" and pictures a DNS change. Your job is to show the inventory: two weeks for IAM and network, a day for prompts, a re-eval week, a rebuild of the knowledge base. That honesty is what makes a real exit possible.

In interviews, listing what travels is the capstone of Level 11. Reciting "prompts are portable" without naming indexes and graphs is half an answer. Naming both, plus the behaviour caveat, is the full one.""",
   how="""Build the inventory in an hour:

| Artefact | Travel status | Hours if we leave next month |
| support_v3.md | travels | 0 |
| golden set | travels | 2 (re-run) |
| Bedrock KB | rebuild | 80 |
| Guardrail policy | rebuild | 16 |
| IAM + PrivateLink | rebuild | 24 |
| Custom model id | retrain | 40 |
| OTel traces | travels | 4 |

Example: a "simple" move from Bedrock to Vertex. Prompts and evals move on day one. The KB is a re-ingest. The custom model is a retrain. Private connectivity is a new ticket to networking. You present three weeks, not three days. You also keep the prompt file as the source of truth so at least that row stays green.""",
   failures="""1. **Calling the prompt the system.** Behaviour will change; you promised a flip.

2. **No inventory.** Migration starts as "swap the SDK" and discovers the KB in week three.

3. **Assuming embeddings are portable.** Different embedder, different space; you must re-index.

4. **Quotas as an afterthought.** The new account has no provisioned units on day one.""",
   line="""I inventory what travels (prompts, evals, tools, sources) and what does not (IAM, proprietary indexes, some tunes, quotas). Prompts travel as text, not as behaviour. The inventory is the migration plan.""",
   key_points=[
    "Travels: prompts, evals, tools, sources, standard telemetry.",
    "Usually does not: IAM, private network, KB/agent configs, some weights, quotas.",
    "Prompts travel; behaviour needs a re-eval.",
    "Embeddings are portable only with the same embedder.",
    "The inventory is the plan; the SDK swap is not.",
    "Keep travel status on every artefact you adopt.",
   ],
   questions=[
    {"q": "Give examples of what does and does not travel in a platform move.", "a": "Travels: prompts, evals, tools, source docs, standard telemetry. Does not: IAM/network, proprietary KB/agent configs, some tuned weights, quotas and commitments.", "kind": "recall"},
    {"q": "Why can portable prompts still cause a migration problem?", "a": "Different models respond differently. Formats, tool calls and safety behaviour change, so you must re-eval and often retune the prompt.", "kind": "debug"},
    {"q": "You exported vectors from a KB. Are you done?", "a": "Only if the far side can use the same embedder and you still have metadata and ACLs. Otherwise you re-embed and re-eval.", "kind": "apply"},
    {"q": "What belongs in the travel inventory besides code?", "a": "IAM, private paths, quotas, dashboards, training data, templates, and any console-only policy.", "kind": "recall"},
    {"q": "Leadership wants a weekend cutover. What do you show?", "a": "The inventory with hours. If the KB rebuild is 80 hours, a weekend is a fantasy unless you already dual-ran.", "kind": "apply"},
   ],
   links=[BEDROCK, VERTEX],
  ),
  "keeping-an-abstraction-in-place": entry(
   what="""An **abstraction** sits between application code and a provider so a model or platform swap is **configuration**, not a rewrite. Practical shape: a narrow interface (`complete`, `stream`, `embed`) with typed requests; adapters per provider; model ids and parameters in config; normalised errors and usage; an **explicit escape hatch** for a provider-only feature you chose to use; contract tests that run the same suite on each adapter.

Over-abstraction is a failure mode. Wrapping every vendor feature behind the lowest common denominator hides tools, structured output or caching you needed. Abstract what you will actually swap. Isolate the rest and document it as accepted lock-in.

The abstraction is not a gateway. A gateway is a hop with credentials and routing. You can have one, the other, or both. The abstraction is a code boundary.""",
   why="""On the job this is what lets you shadow a second platform without touching product files. In interviews, "we use LiteLLM" is a tool. "We have a narrow interface, config-driven ids, contract tests, and an isolated escape hatch" is a design.

Teams that skip the interface import `boto3` in twelve services and then estimate a migration in engineer-years. Teams that wrap too much spend a quarter inventing a new SDK nobody asked for.""",
   how="""Minimum viable boundary:

```
app -> llm.complete(messages, model="support") 
    -> config maps "support" to provider + id
    -> adapter_bedrock / adapter_vertex / adapter_public
```

Contract tests: same five prompts, expect JSON schema validity, usage fields present, timeout behaviour. Run nightly on every adapter you claim to support.

Example: you need Bedrock's document understanding for one flow. You call it through `llm.native("bedrock", ...)` in one module, listed on the lock-in inventory. The rest of the app never imports the Bedrock client. When you add Vertex for chat, that flow stays put and is honest about why.""",
   failures="""1. **Interface in name only.** Every caller still passes provider-specific fields.

2. **No contract tests.** The Vertex adapter returns a different error shape; callers break.

3. **Abstracting the product.** You hid structured output because one fallback model lacked it, and quality died.

4. **Twelve "temporary" SDK imports.** The boundary leaked and nobody removed them.""",
   line="""I keep a narrow complete/stream/embed interface, config-driven model ids, contract tests, and an explicit escape hatch for the one feature I chose to lock in. A swap is a config change plus a re-eval, not a rewrite.""",
   key_points=[
    "Narrow interface, adapters, config-driven ids.",
    "Contract tests per adapter.",
    "Escape hatch for deliberate provider-only features.",
    "Do not reduce to the lowest common denominator.",
    "An abstraction is a code boundary, not necessarily a gateway hop.",
    "Hunt leaked vendor imports; they are the real rewrite.",
   ],
   questions=[
    {"q": "What belongs in an LLM abstraction layer?", "a": "A narrow generate/stream/embed interface, normalised errors and usage, config-driven models, per-provider adapters, an isolated escape hatch, and contract tests.", "kind": "recall"},
    {"q": "Critique wrapping every provider feature behind one generic interface.", "a": "It collapses to the lowest common denominator, hides useful features and is costly to maintain. Abstract what you will swap; isolate the rest.", "kind": "debug"},
    {"q": "How do you know the abstraction is real?", "a": "A second adapter can run the contract tests and a shadow slice without product-file changes. If callers still import boto3, it is not real.", "kind": "apply"},
    {"q": "When is a gateway not a substitute for this boundary?", "a": "When application code still embeds provider types or you need compile-time isolation. A hop can sit behind the same interface.", "kind": "recall"},
    {"q": "You need a vendor-only document API. Where does it go?", "a": "Through a named escape hatch in one module, listed as accepted lock-in, not sprinkled through the app.", "kind": "apply"},
   ],
   links=[OA_PROD, FOUNDRY],
  ),
  "the-real-costs-of-lock-in": entry(
   what="""Lock-in is a **bundle of costs**, not a slur. Switching cost (engineering plus re-eval). Price exposure (less leverage when the SKU moves). Roadmap dependence (you wait on their features and their deprecations). Skill lock-in (runbooks and hiring tied to one console). Data gravity (indexes and logs that are slow to copy).

Lock-in also buys things: deep IAM integration, fewer pages, committed-use discounts, a security review you have already passed. The goal is **known, priced and accepted** lock-in behind interfaces — not zero. Zero is itself a cost: wrappers, forgone features, a worse product.

Put a number on exit weeks and a number on avoidance weeks. Compare them. That is the discussion.""",
   why="""On the job, "avoid lock-in" is how projects stall. "Accept three weeks of KB rebuild in exchange for in-account IAM" is how they ship. Interviews reward the second sentence.

A common enterprise question: "how do you keep us from being stuck?" Answer with the inventory, the abstraction, the exit drill and the accepted lock-ins — not with a promise of painless multi-cloud.""",
   how="""For each accepted lock-in, write one line:

- What we used (Bedrock KB).
- What it buys (sync + IAM).
- Exit weeks (3, from the drill).
- Avoidance cost if we had built (5 weeks + on-call).
- Owner.

Example: you accepted Foundry as the only chat path because the bank already had the review. Avoidance (running a second cloud "just in case") was a year of dual evidence. You priced lock-in as cheaper than avoidance. You still kept prompts and evals portable so the next review is not a rewrite.

Revisit yearly or at a price jump. Lock-in that was rational at 1× volume may be irrational at 10×.""",
   failures="""1. **Zero as a religion.** You spent more avoiding than you would ever spend leaving.

2. **Unlisted lock-in.** The KB, the agent and the tune were "just features".

3. **No price on avoidance.** Multi-cloud "for safety" with no driver.

4. **Never revisiting.** A discount that expired left you on a now-expensive SKU.""",
   line="""Lock-in costs switching, price leverage, roadmap dependence, skills and data gravity — and it buys integration and a passed review. I price exit weeks against avoidance weeks and I accept some lock-in behind an interface. I do not chase zero.""",
   key_points=[
    "Costs: switch, price, roadmap, skills, data gravity.",
    "Benefits: integration, fewer ops, discounts, a passed review.",
    "Aim for known and accepted, not zero.",
    "Compare exit weeks with avoidance weeks.",
    "List each accepted lock-in with an owner.",
    "Revisit at volume or price changes.",
   ],
   questions=[
    {"q": "What are the real costs of lock-in besides migration effort?", "a": "Reduced price leverage, dependence on vendor roadmap and deprecations, tied skills, and data gravity.", "kind": "recall"},
    {"q": "A team spends months avoiding all lock-in. Critique.", "a": "Avoidance (wrappers, forgone features, dual clouds) may exceed expected exit cost. Accept and isolate limited lock-in where the benefit is real.", "kind": "apply"},
    {"q": "How do you answer 'how do we not get stuck?'", "a": "Show the inventory, the abstraction, the last exit drill, and the list of accepted lock-ins with weeks. Do not promise painless multi-cloud.", "kind": "apply"},
    {"q": "When does accepted lock-in become a mistake?", "a": "When volume, price or a deprecation moves the numbers and nobody revisits. Put a review date on the ADR.", "kind": "debug"},
    {"q": "Why is 'we use open weights' not automatically low lock-in?", "a": "Hosting, IAM, and a managed KB on those weights can still pin you. Measure the artefacts, not the licence.", "kind": "recall"},
   ],
   links=[BEDROCK, FOUNDRY],
  ),
  "migration-as-an-evaluation-exercise": entry(
   what="""A platform or model migration is mostly an **evaluation project**. The SDK change is small. The risk is behaviour: quality, formats, tools, safety, latency, cost. You freeze a baseline on a golden set, run the target, retune prompts, check tools and long context, then shadow or canary with thresholds you wrote **before** you saw the numbers.

Without a golden set you are guessing. Without a pre-committed threshold you will rationalise a 4-point drop as "close enough" because the ticket is late.

Human review still matters on subjective tasks. Record the pack so the next migration starts from data, not folklore.""",
   why="""On the job, migrations fail quietly: the new model is "fine" in a demo and worse on the payments slice. Interviews treat this as the grown-up version of "just swap the model". The senior answer is the Level 7 harness pointed at two adapters.

This is also how you refuse a date. If the eval is not frozen, the cutover date is fiction.""",
   how="""Sequence:

1. Freeze the set, the judge, the decoding, the baseline scores (quality, format, safety, p95, cost).
2. Stand up the target adapter behind the same interface.
3. Run the set; retune prompts; re-check tool schemas.
4. Agree go/no-go thresholds (illustrative: ≥ −1 point overall, 0 on the critical slice, p95 < +20%).
5. Shadow, then canary, then cut. Keep rollback as a config flip.

Example: Bedrock → Vertex for a support bot. Overall score +0.4, payments slice −6, tool-call validity −3%. You do not cut. You fix the tool schema mapping and add two few-shot payment examples. Re-run. Slice is −0.5. Now you canary. The code change was forty lines; the eval work was two weeks.""",
   failures="""1. **No frozen set.** Someone added "easy" items to help the new model.

2. **Threshold after the run.** You moved the goal to hit the date.

3. **Skipping tools and schema.** Chat quality held; function calling broke checkout.

4. **Cutover as a deploy of app code.** You should have flipped config.""",
   line="""A migration is an eval: freeze the set and the threshold, run the target, retune, shadow, canary. The SDK swap is the small part. I will slip a date before I invent a passing score.""",
   key_points=[
    "Freeze set, judge, decoding and baseline scores first.",
    "Write go/no-go thresholds before you see the new numbers.",
    "Retune prompts and re-check tools; do not expect a drop-in.",
    "Shadow then canary; rollback is config.",
    "A critical-slice miss blocks the cut even if the mean is up.",
    "Record the pack for the next move.",
   ],
   questions=[
    {"q": "Why is a platform migration mostly evaluation?", "a": "The code change is small; the risk is behaviour in quality, formats, tools, safety and latency, which only a frozen golden set and shadow traffic reveal.", "kind": "recall"},
    {"q": "How do you de-risk cutover?", "a": "Pre-committed thresholds, retuned prompts, tool-schema checks, shadow then canary, per-route rollback, and monitoring for format errors and cost.", "kind": "apply"},
    {"q": "Overall +1, payments slice −6. Do you cut?", "a": "No. The slice is a block. Fix prompt or routing, re-run, then canary. Averages do not ship.", "kind": "debug"},
    {"q": "What must be frozen before the first target run?", "a": "The set, the judge and prompt, decoding, and the baseline scores you will compare to.", "kind": "recall"},
    {"q": "The cutover ticket is 'deploy the Vertex client'. What is wrong?", "a": "The client should already be behind the interface. Cutover is a config or flag flip after eval and canary, not a code deploy.", "kind": "debug"},
   ],
   links=[OA_PROD, VERTEX],
  ),
  "catalog-lag-deprecation": entry(
   what="""Managed catalogs **lag** the lab's own API: a model or a feature arrives later, only in some regions, or never. They also **retire** pinned versions on their own schedule. A catalog alias that means "latest" will change behaviour without your deploy. Preview ids disappear.

You plan for both. Do not promise a customer a model you cannot yet invoke in the production region. Do not pin your product to a preview. Subscribe to retirement notices, put end-of-life dates on the model inventory, and keep a second already-evaluated id warm.

Lag is not incompetence; it is the price of the compliance wrapper. Design for the catalog you have, not the keynote you watched.""",
   why="""On the job, sales will demo the lab's newest model. Production is on last quarter's catalog snapshot. Your job is to say that out loud with a date, not to surprise the customer at go-live.

In interviews, deprecation is how they test whether you have run a platform. "We pin versions and we keep an eval-ready replacement" is the line. "The platform handles it" is a fail.""",
   how="""Operating rhythm:

1. Inventory: id, region, pin, EOL date if published, replacement candidate, last eval date.
2. Subscribe to the platform's retirement feed; turn notices into tickets with owners.
3. When a notice lands: eval the candidate on the frozen set; if it passes, dual-run; flip the alias.
4. Ban `latest` and floating aliases in production config (lint it).
5. Never build a critical path on a preview id.

Example: a pinned Anthropic snapshot retires in 45 days. You already evaluated the successor last month (you watch the catalog). You dual-run for a week, slice holds, you flip. A team that starts the eval on day 40 will slip into the retirement window and page at 3am.""",
   failures="""1. **Floating aliases.** Behaviour changed on a Tuesday; nobody deployed.

2. **Preview in prod.** The id vanished; the feature vanished with it.

3. **Promising the keynote.** The in-region catalog does not have it.

4. **No second id.** Retirement becomes an incident instead of a ticket.""",
   line="""Catalogs lag the frontier and retire pins on their schedule. I inventory EOL dates, I ban floating aliases, I keep a second evaluated id, and I never promise a keynote model I cannot invoke in-region.""",
   key_points=[
    "New models reach platforms later and not in every region.",
    "Pinned versions retire; floating aliases silently change.",
    "Keep a second already-evaluated replacement.",
    "Ban latest/floating ids in production config.",
    "Do not build critical paths on previews.",
    "Lag is the cost of the compliance wrapper — design for it.",
   ],
   questions=[
    {"q": "How do you manage model deprecation on a managed catalog?", "a": "Track notices and EOL dates, pin versions, keep an eval-ready replacement, dual-run, then flip an alias. Budget time each quarter.", "kind": "recall"},
    {"q": "A customer wants the newest lab model your region lacks. Response?", "a": "Show in-region alternatives with eval evidence, check a compliant exception if policy allows, and do not commit a date you do not control.", "kind": "apply"},
    {"q": "Quality dropped overnight with no deploy. First check?", "a": "Whether an alias resolved to a new snapshot, or the catalog swapped a default. Pin the previous id and compare.", "kind": "debug"},
    {"q": "Why is a preview id a poor production pin?", "a": "It can vanish or change without the retirement process you get on GA versions. Critical paths need a GA pin and a replacement.", "kind": "recall"},
    {"q": "What belongs on a model inventory row?", "a": "Id, region, pin, EOL if known, replacement candidate, last eval date, and owner.", "kind": "apply"},
   ],
   links=[BEDROCK, VERTEX],
  ),
  "running-two-platforms-in-parallel": entry(
   what="""Two platforms in parallel is a **pattern**, not a personality. Shadow: copy traffic to the new side, compare, do not serve. Canary or split: a percentage of users get the new side. Active-passive: the second side is failover only. Active-active: both serve, routed by capability, region, cost or risk.

You pay twice: quotas, IAM, network, monitoring, prompt consistency, and sometimes the token bill. Shadow traffic is still data processing — both sides must be approved for that data class. Set an **end date** or a cost cap so dual-run does not become the architecture by inertia.

A gateway or the application abstraction is what makes dual-run a flag instead of a rewrite.""",
   why="""On the job this is how grown-up migrations happen. It is also how bills quietly double. Interviews will ask you to compare shadow and canary and to name the compliance caveat. Have both.

Resilience is a valid reason to stay dual. "We never finished the migration" is not.""",
   how="""Pick a pattern from the driver:

- Migration quality risk → shadow, then canary, then retire the old side by date.
- Provider outage risk → active-passive with a tested failover, not 50/50 forever.
- Model-only-on-B → route that task to B, keep the rest on A (narrow active-active).

Example: you shadow 10% of support prompts onto Vertex for two weeks. Quality holds; cost is 10% extra. You canary 5% served, then 25%, then cut, and you turn shadow off the same day so you stop paying twice. Regulated tickets never went to a platform that was not approved — the shadow job filtered them out.""",
   failures="""1. **Shadow of regulated data** onto an unapproved path.

2. **No end date.** Dual-run is still there a year later.

3. **Inconsistent prompts.** Each side drifted; you compared two products.

4. **Failover never tested.** The passive side's quota was zero.""",
   line="""I dual-run with a named pattern — shadow, canary, active-passive or narrow active-active — a data-class filter, a cost cap and an end date. Both sides must be approved. A gateway makes it a flag.""",
   key_points=[
    "Shadow, canary, active-passive, active-active — pick from the driver.",
    "Dual-run doubles setup, monitoring and often spend.",
    "Shadow traffic is processing; it needs approval.",
    "Set an end date or a cost cap.",
    "Keep prompts and evals identical across sides.",
    "Test the passive side's quota before you need it.",
   ],
   questions=[
    {"q": "Compare shadow traffic and a canary in a migration.", "a": "Shadow copies requests to the new side without serving; it is safe for comparison. Canary serves a fraction of users from the new side and has real user impact.", "kind": "recall"},
    {"q": "What compliance caveat applies to dual-run?", "a": "Both platforms must be approved for the data classes you send, including shadow copies. Residency and retention apply twice.", "kind": "apply"},
    {"q": "Dual-run has lasted a year with no driver. What failed?", "a": "The end date or cost cap. Retire one side or write a new resilience ADR. Inertia is not a pattern.", "kind": "debug"},
    {"q": "When is narrow active-active justified?", "a": "When a specific task or region is only available on the second platform, and you route just that slice.", "kind": "apply"},
    {"q": "The passive failover returns 429s during a drill. Cause?", "a": "No quota or provisioned units on the passive account. Failover that was never sized is theatre.", "kind": "debug"},
   ],
   links=[OA_PROD, FOUNDRY],
  ),
  "multi-cloud-honestly": entry(
   what="""**Multi-cloud for AI** means two production clouds, each with identity, network, evidence and on-call — not a second API key. Real benefits: resilience against a provider-level outage, a model that exists only on one side, negotiating leverage, a customer who mandates their cloud. Real costs: duplicated security reviews, lowest-common-denominator features, two expertises, egress, and a harder residency story.

Often the cheaper "insurance" is: one primary cloud, an abstraction, a tested exit, and a **model-call** fallback to a second provider (which may still be a public API or a host, not a second cloud). True multi-cloud needs a concrete driver and a narrow scope.

"For safety" without a driver is a cost centre.""",
   why="""On the job, architecture decks love grey boxes in two clouds. Finance does not love the duplicate private-link tickets. Interviews will push you toward honesty: when would you do it, and what would you do instead.

IT services firms sometimes must be multi-cloud because clients are. That is a driver. Your startup is not that client.""",
   how="""Decision:

1. Name the driver in one sentence (customer mandate, unique model, regulator, board-level outage requirement).
2. If none, pick primary + abstraction + exit drill + optional model-call fallback.
3. If a driver exists, scope the second cloud to that workload, not to "everything".
4. Budget the duplicate review and the second on-call.
5. Revisit when the driver dies (the customer left, the unique model arrived in-region).

Example: a US healthcare client requires Azure. You run Foundry for them and Bedrock for everyone else. That is two clouds with a reason. You do not also put the internal HR bot on both "for symmetry".""",
   failures="""1. **Two clouds, one team of three.** Nobody is actually on-call for both.

2. **Lowest common denominator.** You disabled the only good feature because the other cloud lacked it.

3. **Egress by accident.** Embeddings or logs cross clouds per request.

4. **Driver gone, architecture remains.** The mandate ended; the duplicate bill did not.""",
   line="""True multi-cloud is two reviewed production clouds. I do it for a named driver and a narrow scope. Otherwise I stay on one primary cloud with an abstraction, a tested exit and, if needed, a model-call fallback. 'For safety' is not a driver.""",
   key_points=[
    "Benefits: outage resilience, unique models, leverage, customer mandates.",
    "Costs: duplicate reviews, expertise, egress, weaker features.",
    "Prefer primary + abstraction + exit unless a driver exists.",
    "Scope the second cloud to the workload that needs it.",
    "A second API key is not multi-cloud.",
    "Retire the second cloud when the driver dies.",
   ],
   questions=[
    {"q": "When is multi-cloud for AI justified?", "a": "With a concrete driver: customer mandate, regulatory resilience, or a model/feature only on the other cloud. Otherwise complexity usually wins.", "kind": "recall"},
    {"q": "A team wants two clouds 'for safety'. Cheaper alternative?", "a": "One primary cloud, an abstraction, a tested exit, and a model-call fallback. Run periodic migration drills.", "kind": "apply"},
    {"q": "What is the honest cost people skip?", "a": "A second security review, a second private network, a second on-call, and egress. The token SKU is the small line.", "kind": "recall"},
    {"q": "The unique model arrives in your primary region. What should happen?", "a": "Revisit the second cloud. If the driver is gone, retire it. Multi-cloud is not a trophy.", "kind": "debug"},
    {"q": "Why is a second provider key not multi-cloud?", "a": "You did not duplicate identity, network or evidence. You added a fallback path. That is useful and cheaper; call it what it is.", "kind": "apply"},
   ],
   links=[FOUNDRY, VERTEX],
  ),
  "shadow-traffic-on-the-new-platform": entry(
   what="""**Shadow traffic** mirrors a slice of production prompts to the new platform, compares quality, latency and cost, and **does not show** the new output to the user. It is the safest way to see real prompt shapes your golden set missed. It is also real data processing: the new side must be approved, logged and retained under the same rules.

You sample, you do not clone 100% unless you have a reason and a budget. You compare on the same ids: judge scores, format validity, tool-call shape, p95, tokens. You harvest disagreements into the eval set.

Shadow is not canary. Nobody is served from the new side until you flip a different flag.""",
   why="""On the job this is how you stop arguing from notebooks. In interviews, mentioning shadow plus a data-class filter plus a cost cap shows you have migrated something that mattered.

The failure that interviewers have seen: shadowing regulated tickets onto a public API "because it is only a copy". Copies count.""",
   how="""Implementation sketch:

1. In the gateway or adapter, after a successful primary call, enqueue `{request, primary_output}` for a sampled share (e.g. 5–10%).
2. Filter out data classes the new side cannot hold.
3. Call the new side asynchronously with a tight timeout; never block the user.
4. Score both outputs with the same judge; log diffs; store only what retention allows.
5. Weekly: add the worst disagreements to the golden set; review the cost line.

Example: 8% of support prompts shadow to Vertex. You find the new model drops tool names on 3% of cases your set never covered. You add those cases, fix the schema map, and only then start a canary. Shadow spend was a known 8% line item with an owner.""",
   failures="""1. **Shadowing unapproved data.**

2. **Synchronous shadow** that adds latency to the user path.

3. **No sample cap.** You cloned 100% and doubled the bill for a week.

4. **No harvest.** You looked at a dashboard and never grew the eval.""",
   line="""I shadow a sampled, data-class-filtered slice to the new platform, asynchronously, with a cost cap. I compare quality, latency and cost, I harvest misses into the eval, and I do not serve users from shadow. Copies still need approval.""",
   key_points=[
    "Mirror prompts; do not serve the new output.",
    "Sample; filter data class; run async.",
    "Compare quality, format, tools, latency, cost.",
    "Harvest disagreements into the golden set.",
    "Shadow is processing — approval required.",
    "A cost cap and an owner keep it from running forever.",
   ],
   questions=[
    {"q": "What does shadow traffic prove that a golden set might miss?", "a": "Real production prompt shapes, lengths and tool patterns that were never labelled. You still need the golden set for a controlled compare.", "kind": "recall"},
    {"q": "Why filter data class before shadowing?", "a": "The copy is processing. An unapproved platform must not see regulated prompts even if users never see the output.", "kind": "apply"},
    {"q": "Shadow is on the user request path and p95 jumped. What went wrong?", "a": "The shadow call was synchronous. Queue it; never block the primary response.", "kind": "debug"},
    {"q": "How do you stop shadow from becoming a permanent double bill?", "a": "A sample rate, a cost cap, an owner and an end date tied to the canary decision.", "kind": "apply"},
    {"q": "You see a 3% tool-name drop only in shadow. Next step?", "a": "Add those requests to the golden set, fix the mapping, re-run offline, then consider canary. Do not ignore a miss because the set was green.", "kind": "debug"},
   ],
   links=[OA_PROD],
  ),
  "feature-flag-the-provider": entry(
   what="""**Feature-flag the provider** means the running service can change model id, platform or fallback **without a code deploy**. Flags (or config, or a gateway route) point a virtual name like `support` at `bedrock:id` or `vertex:id`. A deploy is for behaviour you wrote; a flag is for plumbing you already tested.

Flags need the same discipline as code: who can flip, audit log, per-environment values, and a freeze during incidents unless the flip **is** the mitigation. A flag that nobody can see is a second source of truth.

Pair flags with the abstraction and with eval gates. A flag to an unevaluated id is just production roulette with extra steps.""",
   why="""On the job this is how you canary and how you rollback in minutes. In interviews, "we would redeploy with a new env var" is acceptable; "we flip a reviewed flag after the eval pack" is better.

It also stops the "hotfix branch that changes the model" anti-pattern, which mixes prompt work, plumbing and panic.""",
   how="""Shape:

- Virtual model `support` → flag `provider.support = bedrock#id@rev`
- Environments: dev can be public API; prod cannot.
- Change process: eval pack attached to the ticket; two-person review for prod; automatic audit line.
- Rollback: set the flag back; no rebuild.

Example: a deprecation ticket. You already evaluated the successor. You flip 5% via the flag, watch, flip to 100%, and you do not open a PR that touches application code. When the successor misfires on a slice, you flip back in the same console or config repo.

Lint: production config must not point at `latest`.""",
   failures="""1. **Unevaluated flip.** Someone pointed prod at a new id to "try it".

2. **Flag in a laptop .env.** Nobody can audit who changed it.

3. **Deploy required anyway** because the id is hardcoded in twelve files. The flag is theatre.

4. **No freeze rule.** During an incident five people flip five flags.""",
   line="""I route providers through a virtual name flipped by a reviewed flag after an eval pack. Rollback is the flag, not a deploy. An unevaluated flip is an incident you scheduled.""",
   key_points=[
    "Virtual names in config; adapters underneath.",
    "Prod flips need an eval pack and an audit line.",
    "Rollback is a flag, not a rebuild.",
    "Dev and prod flags can differ; data class still applies.",
    "Hardcoded ids make the flag fake — hunt them.",
    "Ban floating aliases in flagged values too.",
   ],
   questions=[
    {"q": "What does feature-flagging the provider buy you?", "a": "Canary and rollback without a code deploy, once adapters and evals exist. Plumbing becomes configuration.", "kind": "recall"},
    {"q": "A teammate flips prod to a new id to 'see how it feels'. Issue?", "a": "No eval pack, no review, no slice watch. Treat it as an unauthorised change and revert.", "kind": "debug"},
    {"q": "Why keep virtual names instead of raw ids in app code?", "a": "So product code does not change when the pin or the platform does, and so you can search one name in traces.", "kind": "apply"},
    {"q": "The flag exists but twelve files still import a vendor id. What is true?", "a": "The flag cannot switch those paths. Remove the hardcodes or the flag is theatre.", "kind": "debug"},
    {"q": "What should a prod flip ticket attach?", "a": "Eval delta, slice results, latency/cost, rollback value, and who is watching the canary.", "kind": "apply"},
   ],
   links=[OA_PROD],
  ),
  "dual-run-cost-cap": entry(
   what="""A **dual-run cost cap** bounds how long two platforms (or two model paths) run together and **who pays** for the overlap. It is a number and a date, not a hope: e.g. "shadow ≤ 10% of tokens, ≤ $X/week, ends on Friday after the canary decision; charged to the migration ticket, not to the product SLO budget".

Without a cap, shadow and active-active become a standing 1.3× bill that nobody owns. Finance will call it "AI waste". Engineering will call it "safety". Both will be partly right and nobody will turn it off.

The cap includes staff time. Two observability stacks are a cost even if tokens are small.""",
   why="""On the job this is the difference between a controlled migration and a second unofficial production. Interviews like it because it is mundane and senior: you thought about the bill and the owner.

It also protects the product team. Migration spend should not burn their monthly token budget and trip the runaway-cost alert.""",
   how="""Write the cap in the migration ADR:

- Pattern and sample rate.
- Weekly token and dollar ceiling.
- Calendar end (or a go/no-go meeting that extends it once).
- Cost centre (migration vs product).
- Who gets paged when the ceiling trips.
- What happens at the ceiling: sampling drops to zero, not "keep going".

Example: two-week Vertex shadow at 8%, cap $400/week, charged to platform-migration. Week two hits $380 because a prompt got longer. You do not raise quietly; you either finish the canary or you cut sample to 3%. When you cut over, shadow stops the same day — the cap's end date is real.""",
   failures="""1. **No owner.** The overage lands on the product budget; they disable monitoring.

2. **Endless extension.** "One more week" six times.

3. **Cap on tokens, not dollars.** A pricier model blows the money anyway.

4. **Leaving shadow on after cutover** "just in case".""",
   line="""I put a dollar and date cap on every dual-run, with a cost centre and a page when it trips. Overlap is a migration expense with an end. I turn shadow off the day I cut over.""",
   key_points=[
    "Cap rate, dollars, date, owner and cost centre.",
    "Trip action is to stop or shrink sampling, not to ignore.",
    "Do not spend migration overlap from the product SLO budget.",
    "Include staff/observability, not only tokens.",
    "End date is real; extensions are explicit.",
    "Cutover day is shadow-off day.",
   ],
   questions=[
    {"q": "What belongs in a dual-run cost cap?", "a": "Sample rate, weekly dollar ceiling, end date, cost centre, page target, and the action when the ceiling trips.", "kind": "recall"},
    {"q": "Shadow overruns the product token budget. What was missing?", "a": "A separate cost centre and a cap. Migration spend should not trip product alerts or starve live traffic.", "kind": "debug"},
    {"q": "Who should extend the end date?", "a": "The migration owner in a written go/no-go, once, with a new cap — not a silent leave-it-on.", "kind": "apply"},
    {"q": "Why cap dollars as well as percent of traffic?", "a": "A small percent on a far more expensive model can still blow the money. Dollars are what finance sees.", "kind": "recall"},
    {"q": "You cut over but left 5% shadow 'for safety'. Critique.", "a": "The driver ended. Either write a new resilience ADR with a cap, or turn it off. Unowned overlap is how bills rot.", "kind": "debug"},
   ],
   links=[OA_PROD],
  ),
  "deprecation-runbook": entry(
   what="""A **deprecation runbook** is the page you follow when a catalog version is retired: owner, eval gate, replacement candidate, rollback, comms, and the clock. It exists before the email arrives. The inventory row (id, EOL, candidate, last eval) is the input; the runbook is the actions.

Typical flow: notice → confirm impact (who still pins this id) → run the frozen eval on the candidate → dual-run if needed → flip the flag → watch slices → retire the old pin. If the candidate fails, the runbook says whether you request an extension, change product behaviour, or fail a feature — not "we will figure it out".

A runbook that lives only in one engineer's head is not a runbook.""",
   why="""On the job, retirement emails arrive while the owner is on leave. The runbook is how the rest of the team does the right thing in 45 days instead of 45 hours. Interviews will ask "a model you use is being retired — walk me through it." This page is the walk.

It also forces you to keep a candidate warm. A runbook that says "eval a replacement" with no candidate is a wish.""",
   how="""Page contents:

1. Owner and deputy.
2. How we hear (mailing list, RSS, status). Ticket template.
3. Impact query: which virtual names resolve to this pin.
4. Eval pack to run (link) and the go/no-go numbers.
5. Flag values for canary and full flip; rollback value.
6. Comms: who tells support if behaviour will change.
7. If candidate fails: extension request, feature flag off, or accepted degradation — named.

Example: EOL in 30 days, candidate already within 0.5 on the set. You canary 10% on day 5, 100% on day 12, watch a week, close the ticket. The deputy can run it from the page. Contrast: no runbook, notice seen on day 28, eval starts, you page through the weekend.""",
   failures="""1. **No deputy.** Owner on leave; pin dies.

2. **No impact query.** You flipped `support` but `billing` still pointed at the dead id.

3. **Eval invented during the incident.** Thresholds moved to hit the date.

4. **No comms.** Support learns from users that answers "feel different".""",
   line="""A deprecation runbook names the owner, the eval gate, the candidate, the flag flips and the fallback if the candidate fails. I write it before the retirement mail. A warm replacement beats a heroic weekend.""",
   key_points=[
    "Owner, deputy, notice source, impact query.",
    "Frozen eval pack and pre-written go/no-go.",
    "Flag flips for canary and full cut; rollback value.",
    "Named fallback if the candidate fails.",
    "Comms to support when behaviour may change.",
    "Keep a candidate warm so the runbook is executable.",
   ],
   questions=[
    {"q": "What must a model-deprecation runbook contain?", "a": "Owner and deputy, how notices arrive, an impact query, a frozen eval gate, flag values, rollback, comms, and a named fallback if the candidate fails.", "kind": "recall"},
    {"q": "The only owner is on leave and EOL is in ten days. What should already exist?", "a": "A deputy, a warm candidate, and a page the deputy can execute. Heroics are the failure.", "kind": "apply"},
    {"q": "You flipped the support alias but billing 500s. What did the runbook miss?", "a": "The impact query — every virtual name that still pinned the retired id.", "kind": "debug"},
    {"q": "The candidate fails the slice gate. What does a good runbook say?", "a": "A pre-named path: request an extension, disable a feature, or accept a written degradation — not 'invent a plan under the deadline'.", "kind": "apply"},
    {"q": "Why keep the eval pack linked rather than 'run some tests'?", "a": "So thresholds cannot move during the incident and so the deputy runs the same compare you would.", "kind": "recall"},
   ],
   links=[BEDROCK, VERTEX],
  ),
 }
}
