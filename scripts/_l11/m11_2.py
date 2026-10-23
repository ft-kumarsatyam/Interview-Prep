from assemble import entry

NOTES = {
 "m11-2": {
  "the-shape-all-three-share": entry(
   what="""Amazon Bedrock, Vertex AI and Azure AI Foundry look like three products. They share one shape. Each has a **catalog** of closed and open-weight models, **one family of invoke endpoints**, **one identity system** (IAM / IAM-style service accounts / Entra), **one network boundary** you can make private, and **one bill** that lands on the cloud account you already pay. Around that core sit optional add-ons: knowledge bases, guardrails, agents, evaluation jobs and fine-tunes. If you can point to those five pieces on one platform, you can find them on the other two.

The shape is what you learn. Product names, SDK method names and which model is "GA" this month change. The questions you ask do not: which models in which regions, how do I authenticate, how do I stay private, what is my quota, what do I pay, what do the add-ons actually control.

Treat a platform as a **place models run with cloud controls**, not as a new subject. Once you see the shape, a Foundry doc reads as a dialect of a Bedrock doc, not as a career change.""",
   why="""On the job you will not get to pick the cloud. The company already has one. Your value is arriving on an unfamiliar console and locating catalog, identity, network, quota and bill in the first hour. Teams that treat each platform as a unique universe relearn the same five ideas three times.

In interviews, especially at IT services firms that staff all three clouds, "I only know Bedrock" is a ceiling. "I know the shared shape and I can map vocabulary" is the hire. They will ask you what a managed platform gives you. Reciting one vendor's feature list is weak. Listing catalog, endpoint style, identity, network and bill — then saying what it does **not** give you — is the answer.

This also stops cargo-cult. If you only needed a model call, you do not need the agent runtime. The shape has a core and a set of add-ons you adopt one at a time.""",
   how="""First hour on a new platform, fill this card:

1. Catalog URL and how access is granted (opt-in, allow-list, private offer).
2. Invoke API name (Converse, generateContent, chat.completions) and the native passthrough if any.
3. Identity: role / service account / managed identity; how a pod gets it.
4. Private path: PrivateLink, Private Service Connect, private endpoint. Public fallback policy.
5. Bill and quota: where to see tokens, where to request a raise, tags for chargeback.

Example: you know Bedrock. You are dropped onto Vertex. You do not start with "what is a Gemini". You find Model Garden (catalog), generateContent (invoke), a service account with `aiplatform.endpoints.predict`, VPC-SC / PSC, and the Cloud Billing report with the Vertex SKU. Then you run your eval prompt. The first useful artefact is that card, not a hello-world notebook that used user credentials.""",
   failures="""1. **Learning the console, not the shape.** You can click "Chat" but cannot say how a workload identity invokes the model. That dies in production.

2. **Assuming add-ons are the platform.** Buying a knowledge base does not mean you understand invoke, IAM or quotas.

3. **Ignoring the bill.** A working demo with no cost centre will become a surprise invoice and a revoked project.

4. **Treating names as concepts.** "Foundation Model Garden" versus "model catalog" is vocabulary. The concept is the same.""",
   line="""Bedrock, Vertex and Foundry share a shape: catalog, invoke API, cloud identity, network boundary and one bill. I learn those five, then the local words. The platform is where models run with cloud controls — it is not a new subject and it is not my product.""",
   key_points=[
    "Shared shape: catalog, invoke API, cloud identity, private network, one bill.",
    "Add-ons (retrieval, agents, guardrails, evals, tuning) are optional layers on that core.",
    "Ask the same first-hour questions on every platform.",
    "Product names change; the five pieces do not.",
    "Learn the shape so a new console is a dialect, not a new career.",
    "The platform is infrastructure. Prompt quality and evals stay yours.",
   ],
   questions=[
    {"q": "List the five pieces the major managed AI platforms share.", "a": "A model catalog, an invocation API, cloud identity, a network boundary you can make private, and billing/quotas on the existing cloud account. Add-ons sit on top of that core.", "kind": "recall"},
    {"q": "You know one platform and must evaluate another this week. What do you check first?", "a": "Map the shape: models and versions in your region, access and quota, identity for a workload, private networking, logging, and which add-ons you actually need. Then run your eval set.", "kind": "apply"},
    {"q": "A teammate says they 'know Vertex' because they used the chat playground. What is missing?", "a": "Workload identity, regional invoke, quotas, private networking and cost attribution. Playground use is not production anatomy.", "kind": "debug"},
    {"q": "Why separate the core shape from add-ons?", "a": "You can invoke a model without buying a knowledge base or agent runtime. Adopting add-ons one layer at a time keeps lock-in and complexity honest.", "kind": "recall"},
    {"q": "What first artefact should you produce on a new platform?", "a": "A one-page card: catalog access, invoke API, identity, private path, bill/quota location — plus one successful call as a workload, not as a user.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock user guide", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html"},
    {"title": "Vertex AI generative AI overview", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview"},
    {"title": "Azure AI Foundry overview", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry"},
   ],
  ),
  "reading-a-model-catalog": entry(
   what="""A **model catalog** is the list of what you can actually invoke, not a marketing page. For each row you read it the way you read a model card: **who provides it**, **which regions carry it**, **which version is pinned versus aliased**, **lifecycle** (preview, GA, legacy, retirement date), **modalities and features** (tools, structured output, vision, streaming, caching), **context and max output**, **access mode** (on-demand, provisioned, batch, request-access), and **price plus quota** in your region.

The catalog is regional and account-scoped. A model that exists in `us-east-1` may be absent in `ap-south-1`. A model that exists in the account next door may be gated for you. Preview rows have no stability promise. Aliases such as `latest` move. The only id you can defend in an incident is the exact one you evaluated.

Reading the catalog is a weekly habit once you are live, not a one-time setup. Retirement notices, new versions and quota changes all land here first.""",
   why="""On the job, the most common "the platform is broken" ticket is "the model is not in this region" or "we built on an alias that moved". Both are catalog-literacy failures. A team that pastes a blog's model name into prod without reading the row will redo the work.

In interviews you will be asked how you choose a model on a platform. The senior move is to walk the catalog row out loud: region, version, features, lifecycle, quota. Saying "whatever is most capable" without those fields is how you pick a preview model with no SLA.

Catalog literacy also keeps you honest about lag. Managed catalogs trail the frontier. You should know that and have a second row already read.""",
   how="""Before you write a client, screenshot or export the row:

- Id: `anthropic.claude-sonnet-4-5-20250929-v1:0` (exact), not `claude-sonnet-latest`.
- Region list that includes yours.
- Tools: yes. Structured output: native / via prompt. Vision: no.
- Lifecycle: GA. Deprecation: none posted.
- Quota: 200k tokens/min on-demand in this region; provisioned available.
- Access: already granted / needs a form.

Then run ten eval cases. Store the id next to the scores.

Example miss: you tested `gpt-4o` in an Azure East US resource. Production is Central India. The deployment name exists but the underlying model is not offered there. Catalog reading would have caught it before the release train.""",
   failures="""1. **Building on `latest`.** The row moved; your traces cannot explain Tuesday.

2. **Ignoring lifecycle.** Preview models disappear or change terms. Do not put them on the critical path.

3. **Assuming features follow the public API.** The catalog model may lack tools or JSON mode that the lab's public endpoint has.

4. **One-region reading.** Dev region is not prod region. Read both rows.""",
   line="""I read a catalog the way I read a model card: provider, region, pinned id, lifecycle, features, limits, access and quota. I never ship an alias. If the row is missing in the prod region, the model does not exist for that workload.""",
   key_points=[
    "A catalog row is regional, versioned and account-scoped — not a marketing list.",
    "Read provider, region, pin vs alias, lifecycle, features, limits, access, price and quota.",
    "Preview and `latest` are not production ids.",
    "Feature support on the catalog can lag the lab's public API.",
    "Re-read the catalog for retirement and quota changes after you go live.",
    "Store the exact id next to the eval scores.",
   ],
   questions=[
    {"q": "Which catalog fields decide whether a model is usable for you?", "a": "Region availability, access mode, feature support, context and output limits, lifecycle status, and price/quota in your account. The marketing name is not enough.", "kind": "recall"},
    {"q": "Tests passed in a dev region; the model is missing in prod. What did you skip?", "a": "Regional availability and access in the target region. Confirm the exact id, grant and quota in every region you will call before you choose it.", "kind": "debug"},
    {"q": "Why treat a catalog alias as unsafe in production?", "a": "Aliases can move to a new version with different behaviour, limits or price. Pin the versioned id you evaluated and treat a move as a release.", "kind": "recall"},
    {"q": "A catalog model lacks tool calling that the public API has. What do you do?", "a": "Believe the catalog. Either drop tools, pick another in-region model that has them, or use native passthrough if the platform exposes that feature. Do not assume parity.", "kind": "apply"},
    {"q": "What do you store alongside an eval score for a catalog model?", "a": "Exact model id, region, date, access mode (on-demand vs provisioned) and the catalog lifecycle at the time. Without those the score is not reproducible.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock model lifecycle", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html"},
    {"title": "Azure OpenAI models", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models"},
    {"title": "Vertex AI model Garden", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/model-garden/explore-models"},
   ],
  ),
  "invoking-through-the-platform": entry(
   what="""**Invoking through the platform** is not the same as calling a provider SDK with an API key. You authenticate as a **cloud identity**. You call a **regional runtime endpoint**, sometimes a private one. You pick a **request format**: the platform's unified API (Bedrock Converse, a Foundry chat completion, Vertex `generateContent`) or a **provider-native passthrough** when you need a feature the unified shape hides. You handle **platform errors** that a public SDK never sent: throttling on a quota dimension, model access denied, model not ready, content filter, expired provisioned unit.

The unified API is how you swap models inside one catalog without rewriting the client. The native passthrough is how you reach a brand-new tool schema or a beta field. Neither replaces your own wrapper. Application code should call `complete(messages, model_id, …)` and never import a vendor type outside that module.

Streaming, usage objects and request ids come back in platform-shaped fields. Map them once. Cost reporting is often a separate billing export, not the response body.""",
   why="""On the job, most production bugs at this layer are auth, region or format — not prompts. A developer copies an OpenAI snippet, pastes it at Bedrock, and opens a ticket. Knowing the invoke path lets you debug in order: identity, endpoint, model access, request shape, quota.

In interviews they will ask how calling Bedrock differs from calling the lab. The answer is identity, regional endpoint, unified versus native format, and platform error classes. If you only say "it's an API", you have not used a platform.

You also need to know what the response gives you (tokens, stop reason, filter) and what it does not (proof the answer is correct).""",
   how="""Minimal production invoke:

1. Workload identity attached to the service (no long-lived key in env for the platform).
2. Regional client, explicit region matching the catalog row.
3. Unified call with a pinned model id; tests cover the native path if you use it.
4. Map errors: 400 invalid (do not retry / do not fail over), 429 (backoff + jitter), 403 (access, page a human).
5. Log request id, model id, input/output tokens, latency. Do not log the prompt in a region that forbids it.

Example: a Python worker assumes `AWS_REGION=us-east-1` from the laptop profile. In prod the task role is in `eu-west-1` and the model is only granted there. The call fails with access denied. The fix is an explicit region on the client and a smoke test that runs as the task role, not as you.""",
   failures="""1. **User credentials in a notebook as the 'integration'.** That never becomes a role. Write the worker path first.

2. **Retrying 400s.** A bad schema fails on every model. Failover multiplies spend.

3. **Implicit region.** The SDK's default region is not the catalog region you evaluated.

4. **Parsing only the text.** You drop stop reason and filter flags, then cannot explain empty answers.""",
   line="""Platform invoke is identity plus a regional endpoint plus a request shape. I use the unified API to swap catalog models, the native passthrough when I need a hidden feature, and my own wrapper so the app never sees the SDK. I do not retry invalid requests.""",
   key_points=[
    "Invoke with a cloud identity against a regional (often private) endpoint.",
    "Unified APIs swap models; native passthrough exposes vendor-only fields.",
    "Wrap the SDK; map usage, request ids and platform error classes once.",
    "Do not retry invalid requests; do backoff on throttles.",
    "Smoke-test as the workload identity, not as a human user.",
    "The response is not evidence that the answer is correct.",
   ],
   questions=[
    {"q": "How does platform invocation differ from a provider SDK plus API key?", "a": "You authenticate as a cloud identity, call a regional (possibly private) endpoint, choose a unified or native request shape, and handle platform-specific errors such as access, quota and filters.", "kind": "recall"},
    {"q": "When do you use the unified API versus native passthrough?", "a": "Unified when you want one client across catalog models. Native when a feature (tools, caching, extra fields) is missing from the unified shape and you have tested that path.", "kind": "apply"},
    {"q": "Calls work on your laptop and fail in the worker with access denied. First checks?", "a": "The worker's role, the region on the client, and whether that identity is granted the exact model id. Laptop user credentials prove nothing about the task role.", "kind": "debug"},
    {"q": "Which errors must not trigger failover to another model?", "a": "Invalid request / schema errors. They will fail on every backend. Fail over on timeouts, 5xx and rate limits after you know the fallback still fits the task.", "kind": "recall"},
    {"q": "What do you log on every invoke?", "a": "Request id, pinned model id, region, token counts, latency and stop/filter reason. Prompt text only if policy allows and the log store is in-region.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock Converse API", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html"},
    {"title": "Vertex AI generateContent", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference"},
   ],
  ),
  "same-ideas-different-vocabulary": entry(
   what="""The three platforms invent different words for the same ideas. **Catalog** is Model Garden, a Bedrock model list, or an Azure deployment plus model catalogue. **Invoke** is Converse, `InvokeModel`, `generateContent`, or a chat-completions deployment. **Identity** is IAM roles, service accounts, or managed identities. **Private path** is PrivateLink, Private Service Connect, or a private endpoint. **Guardrails** are Bedrock Guardrails, Vertex safety settings / Model Armor, or Azure content filters. **Knowledge base** is a Bedrock KB, Vertex RAG engine / grounding, or Azure AI Search wired into a project. **Provisioned capacity** is provisioned throughput, provisioned throughput / reserved, or PTUs.

If you learn the ideas, the vocabulary is a lookup table. If you learn only the words, every new platform feels like a new domain. Keep a two-column cheat sheet. Update it when a product is renamed — the idea rarely moved.""",
   why="""On the job you will read tickets written in another cloud's dialect. "PTU exhaustion" is the same class of problem as "provisioned throughput throttling". Teams that cannot translate waste a day on docs before they recognise a quota incident they have already seen.

In interviews, mapping vocabulary is how you show transfer. They may ask "what is the Azure equivalent of a Bedrock knowledge base" to see whether you think in ideas. Saying "I have not used Azure" is acceptable if you then name the idea and how you would find the word. Saying nothing is not.

This also keeps architecture conversations sane. Draw the idea (catalog, invoke, identity, network, add-on). Let each person attach their cloud's noun.""",
   how="""Maintain a living table in the team wiki:

| Idea | AWS | GCP | Azure |
| Catalog | Bedrock models | Model Garden | Model catalog + deployments |
| Unified invoke | Converse | generateContent | Chat completions / Responses |
| Identity | IAM role | Service account | Managed identity |
| Private | PrivateLink | PSC / VPC-SC | Private endpoint |
| Reserved capacity | Provisioned throughput | Provisioned | PTU |
| Retrieval add-on | Knowledge Bases | RAG / grounding | AI Search + project |

Example: an Azure engineer says "we need more PTUs". You hear "reserved capacity is saturated; on-demand may not exist for this deployment; queue or buy more reserved units; check whether the quota request is per deployment or per subscription". You did not need to have clicked the Azure blade today.

When a name changes, update the table. Do not rewrite the runbook's ideas.""",
   failures="""1. **Arguing about nouns.** A two-hour meeting on whether something is a "project" or an "account" when the isolation question is the same.

2. **Copy-pasting runbooks with the wrong nouns.** An AWS alarm name in a GCP playbook. Translate, then paste.

3. **Assuming feature parity from a mapped word.** "Guardrails" on one platform may be a regex filter; on another, a full policy engine. Map the idea, then read the capability.

4. **Refusing to work because the word is new.** The idea is not new.""",
   line="""I keep a cheat sheet of ideas — catalog, invoke, identity, private path, reserved capacity, retrieval, guardrails — and the current word on each cloud. I debug the idea first. Names change; the shape does not.""",
   key_points=[
    "Learn ideas first; treat vendor words as a lookup table.",
    "Catalog, invoke, identity, private path and reserved capacity exist on all three.",
    "Mapped words do not imply feature parity — read the capability.",
    "Translate runbooks; do not paste alarm names across clouds.",
    "Draw architecture with ideas, then attach local nouns.",
    "Update the cheat sheet when a product is renamed.",
   ],
   questions=[
    {"q": "Give one Azure or GCP word for: catalog, reserved capacity, private path.", "a": "Catalog: Model Garden or Azure model catalog/deployments. Reserved capacity: provisioned throughput or PTUs. Private path: Private Service Connect / VPC-SC or a private endpoint.", "kind": "recall"},
    {"q": "A ticket says 'PTUs are exhausted'. What idea is that, and what do you do?", "a": "Reserved capacity is saturated. Check whether on-demand exists, queue or shed load, and request more reserved units with traffic evidence. It is the same class as provisioned-throughput throttling.", "kind": "apply"},
    {"q": "Why can two 'guardrail' products still behave differently?", "a": "The word maps the idea of a policy layer, not the implementation. One may be a keyword list; another may be a classifier with topic blocks. Read what it actually measures and where it sits in the path.", "kind": "debug"},
    {"q": "How do you start on a platform you have not clicked before?", "a": "Find the five ideas on the cheat sheet, locate the current nouns in docs, fill the first-hour card, and run one workload-identity invoke. Do not wait for a course.", "kind": "apply"},
    {"q": "What belongs on the team's vocabulary table?", "a": "Idea, current noun per cloud, doc link, and a one-line 'parity caveat' where the products differ.", "kind": "recall"},
   ],
   links=[
    {"title": "Azure OpenAI quotas and limits", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits"},
    {"title": "Vertex AI quotas", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/quotas"},
   ],
  ),
  "calling-a-hosted-model": entry(
   what="""**Calling a hosted model** means you have done it from application code, not from a playground, and you can show the **response**, the **usage**, and the **cost reporting** you got back. That is a different skill from reading the docs. You will hit real identity, a real region, a real quota and a real billing delay.

You need three artefacts: (1) a small program that runs as a workload identity, (2) a log line or trace with request id, token counts and latency, (3) a billing or cost-explorer view (or a usage API) that shows the same call. If you cannot point to all three, you have not finished the exercise.

Playground calls use your user identity, often a different quota pool, and often do not appear on the same cost centre. They teach the prompt, not the platform.""",
   why="""On the job, "it works in the console" is the most expensive sentence in this level. Production will use a role that was never granted, a region that was never enabled, and a cost report nobody watches. Doing one real call closes that gap.

In interviews they may ask you to sketch the call. Walk identity, region, request, usage, cost. If you only talk about the prompt, you sound like a notebook user. If you mention that cost can lag twenty-four hours and usage in the response is the live signal, you sound like someone who has paid a bill.

This is also how you meet the platform's error taxonomy for the first time. Better in a script than in a launch.""",
   how="""Do this once per platform you claim:

```
# as the task role, explicit region
resp = client.converse(modelId=PINNED, messages=...)
print(resp["usage"], resp["ResponseMetadata"]["RequestId"])
```

Then open Cost Explorer / Cloud Billing / Cost Management, filter to the generative AI SKU for that account, and confirm the call (or a day's batch) appears. If billing lags, record how long and use the usage object for real-time budgets.

Example: you called from a notebook as yourself. Finance asks which microservice spent $400. You cannot say. Repeat the call from the service account, tag the resource, and the next $400 has an owner.""",
   failures="""1. **Playground as proof.** User identity, different quota, no cost centre.

2. **Ignoring usage.** You only printed the text. You cannot build a budget.

3. **Wrong account.** The demo project is not the prod project. Cost and access live elsewhere.

4. **Logging the prompt into a shared chat.** You just created a second copy of regulated text.""",
   line="""I do not count a platform as learned until application code, running as a workload identity, prints usage and I can find the same spend on the bill. Playgrounds do not count. Cost can lag; the usage object is the live signal.""",
   key_points=[
    "A real call is application code plus workload identity, not a playground.",
    "Capture response text, usage tokens, request id and latency.",
    "Find the same spend in billing; know how long cost data lags.",
    "Use the usage object for live budgets when the bill is delayed.",
    "Tag the workload so the next invoice has an owner.",
    "Do not treat a user-identity notebook as the integration.",
   ],
   questions=[
    {"q": "What three artefacts prove you have called a hosted model for real?", "a": "Application code running as a workload identity, a trace with usage and request id, and a billing or usage view that shows the spend. A playground screenshot is not enough.", "kind": "recall"},
    {"q": "Finance cannot see today's Bedrock spend. Is the integration broken?", "a": "Not necessarily. Billing exports often lag. Use the usage object and platform usage APIs for same-day control, and document the lag in the runbook.", "kind": "debug"},
    {"q": "Why is a console chat a poor proof of production readiness?", "a": "It uses your user identity, often a different quota, and rarely lands on the service cost centre. Production will fail on role, region or tags you never exercised.", "kind": "apply"},
    {"q": "What do you print on the first successful worker call?", "a": "Model id, region, request id, input/output tokens, latency and stop reason. Confirm the role name, not your laptop user.", "kind": "apply"},
    {"q": "The demo project works; prod spend is zero and calls 403. What happened?", "a": "You integrated the wrong account. Grant the prod role on the prod catalog, point the client at the prod region, and repeat the three artefacts there.", "kind": "debug"},
   ],
   links=[
    {"title": "Amazon Bedrock GetInvocationInsights / usage", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html"},
    {"title": "Azure OpenAI monitoring", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/monitor-openai"},
   ],
  ),
  "swapping-models-inside-one-catalog": entry(
   what="""**Swapping models inside one catalog** means you send the same prompt to two model ids without changing authentication, network or billing. That is the point of a platform: identity and the private path stay still while the brain changes. It is not a free quality upgrade. Models differ in tools, structured output, context, safety refusals and token price. A swap is a release.

You want this to be a config change plus an eval gate. If a swap requires a new VPC, a new key or a new invoice arrangement, you did not stay inside one catalog — you changed path.

Compare on your eval set, not on a single "hello". Record both ids, both scores, both p95s and both costs per successful task.""",
   why="""On the job, catalogs exist so you can move when a version retires or a cheaper model clears the bar. Teams that hard-code one id and one SDK dialect discover this during a deprecation. Teams that wrap the invoke and keep evals can swap in a day.

In interviews, "we can switch models easily because we are on Bedrock" is incomplete. The complete answer is: same identity and network, different id, eval gate, watch structured output and tools. Interviewers will ask what broke last time you swapped. Have a story: JSON mode, token limits, or a filter.

This is also how you resist fashion. A new catalog row is not a deploy until it beats the current one on your set at an acceptable price.""",
   how="""Keep model id in config:

```
MODEL_ID=anthropic.claude-...-v1:0
# candidate
# MODEL_ID=amazon.nova-pro-v1:0
```

Run the same 200-case suite on both. Promote if quality is within the delta and cost/latency are better, or if the old id is retiring. Watch: tool schema acceptance, max output, refusal rate on your allowed topics.

Example: you swap from a large to a medium model for classification. Accuracy holds. JSON breaks on 8% of cases because the medium model ignores the schema more often. You do not ship until you add structured-output constraints or keep the large model for that skill.""",
   failures="""1. **Swap without evals.** Users find the regression. You find it on Twitter.

2. **Assuming tool parity.** The new row cannot call tools; your agent dies silently or loops.

3. **Changing temperature to 'make it work'.** You hid a model difference. Record it as a config change that needs its own eval.

4. **Billing surprise.** The new model is cheaper per token but writes twice as much. Cost per task went up.""",
   line="""Inside one catalog I can change model id without touching IAM, network or the bill's vendor. I still treat the swap as a release: evals, tools, schema, cost per successful task. Same plumbing, different brain.""",
   key_points=[
    "A catalog swap keeps identity, network and billing still; only the model id changes.",
    "A swap is a release — run evals, not a single prompt.",
    "Check tools, structured output, context limits and refusal rates.",
    "Compare cost per successful task, not price per million tokens.",
    "Keep the id in config behind one wrapper.",
    "A new catalog row is optional until it beats the current one on your set.",
   ],
   questions=[
    {"q": "What should stay unchanged when you swap models inside one catalog?", "a": "How you authenticate, how you reach the endpoint, and which cloud account is billed. The model id, and maybe parameters, change.", "kind": "recall"},
    {"q": "A swap broke JSON that downstream parses. What do you do?", "a": "Do not disable validation. Add schema checks and structured-output tests to the eval, then either constrain the new model or keep the old one for that skill.", "kind": "debug"},
    {"q": "The cheaper model uses more tokens per answer. How do you decide?", "a": "Compute cost per successful task on the eval and on a production sample, including retries. Cheaper rates can still lose.", "kind": "apply"},
    {"q": "Why is a catalog swap still not 'free'?", "a": "Behaviour, features and price change. You still need an eval gate, a pin, and a rollback id.", "kind": "recall"},
    {"q": "How do you keep a swap to a config change?", "a": "One client module, model id from config or a feature flag, no vendor types leaking into services, and CI that runs the suite for the candidate id.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock inference parameters", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html"},
   ],
  ),
  "what-the-platform-does-not-give-you": entry(
   what="""A managed platform gives you a place to run models with cloud controls. It does **not** give you **prompt quality**, **retrieval design**, **evaluation depth**, or **product behaviour**. Those remain yours. The catalog will not write a good classifier prompt. The knowledge base will not choose your chunking. The built-in eval tiles will not include your golden set unless you put it there. The model will not know your refund policy.

This is the most important sentence in M11.2. Teams buy a platform and stop doing Level 3–7 work. Then they blame the vendor for vague answers, bad retrieval and missing evals. The vendor sold invoke, identity and a bill.

Use the platform for what it is good at. Keep ownership of the artefacts that define your product: prompts, tools, indexes you care about, golden sets, rubrics and the decision of what "done" means.""",
   why="""On the job this is how you avoid a hollow migration. Moving to Bedrock without taking the eval suite is a change of plumbing and a loss of signal. Leadership will hear "we are on an enterprise platform" and assume quality improved. You must say what improved (IAM, private link, residency) and what did not (answer quality).

In interviews, saying what the platform does **not** give you is a seniority tell. Juniors list features. Seniors list the leftover work. "They gave us Converse; we still own prompts, retrieval, evals and product behaviour" is a complete Level 11 answer.

It also frames build-versus-buy later in M11.8. You can buy a knowledge base and still own the eval that says whether it retrieves the right paragraph.""",
   how="""Write a split ownership list in the decision record:

Platform: model hosting, IAM, private network, regional endpoints, raw usage, optional filters.
Us: prompt versions, tool contracts, chunking and retrieval evals, task-level quality bar, UX when the model is wrong, cost per successful task, incident runbooks for wrong answers.

Example: after migration, p95 latency improved and a security questionnaire passed. Faithfulness on the 200-case set dropped 6 points because the managed chunker split tables. The platform did its job. Retrieval design is still yours; you either tune the KB or keep your own index.

If you cannot name an owner for evals after the move, the move is incomplete.""",
   failures="""1. **Platform as product.** A demo in the console becomes the application. No evals, no tools contract, no fallback UX.

2. **Dropping the golden set.** "The vendor has evals" — their metrics are not your tickets.

3. **Expecting the filter to be the policy.** Content filters are not your refund rules.

4. **No owner.** Everyone thought the other team owned quality.""",
   line="""The platform gives me invoke, identity, network and a bill. It does not give me prompt quality, retrieval design, evaluation depth or product behaviour. Those stay mine after the move, and I say so in the decision record.""",
   key_points=[
    "Platforms supply hosting and cloud controls, not product quality.",
    "You still own prompts, retrieval design, evals and behaviour when the model is wrong.",
    "Vendor eval tiles are not your golden set unless you put it there.",
    "Say explicitly what improved after a move (IAM, region) and what did not (answer quality).",
    "Name an owner for evals after migration.",
    "Content filters are not your business policy.",
   ],
   questions=[
    {"q": "Name four things a managed AI platform generally does not give you.", "a": "Prompt quality, retrieval design, evaluation depth on your task, and product behaviour (what to do when the answer is wrong). It gives hosting, identity, network and billing.", "kind": "recall"},
    {"q": "Quality dropped after a 'successful' platform migration. Where do you look first?", "a": "Your eval suite, retrieval/chunking differences, model id and filters — not the IAM path. The platform doing its job does not protect task quality.", "kind": "debug"},
    {"q": "Leadership says the enterprise platform will improve answers. How do you reply?", "a": "It should improve control, residency and audit. Answer quality only improves if we keep (or rebuild) prompts, retrieval and evals. I will report both scores.", "kind": "apply"},
    {"q": "Who owns the golden set after you buy a managed eval product?", "a": "You do. Exportable cases and rubrics stay in your repo. The product is a runner, not the source of truth.", "kind": "recall"},
    {"q": "What belongs in the split-ownership section of a platform decision record?", "a": "What the vendor runs (hosting, IAM, network, usage) versus what you run (prompts, tools, retrieval evals, UX, incidents for wrong answers).", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock model evaluation", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html"},
   ],
  ),
  "pinning-a-model-version": entry(
   what="""**Pinning a model version** means production calls an exact, immutable id — `anthropic.claude-sonnet-4-5-20250929-v1:0`, a dated Azure deployment of a specific model version, a Vertex model id with a version suffix — and never a floating alias such as `latest`, `sonnet-latest`, or an auto-updating deployment. You record the id **and the date you pinned it**, next to the eval scores that justified it.

Aliases exist to make demos easy. They move when the vendor publishes a new snapshot. Your traces, your cost model and your safety behaviour can change with no deploy on your side. That is a silent release you did not approve.

Pinning is not freezing forever. It is making change explicit. When you want a new version, you create a candidate pin, run evals, and flip config.""",
   why="""On the job, silent alias moves are a classic "nothing changed but quality dropped" incident. Pinning turns that into a planned upgrade. Auditors also ask which model produced a given decision last March. If you only stored `latest`, you cannot answer.

In interviews this is a short, high-signal question. "Never float to latest in production" is the line. Then say how you upgrade: candidate id, eval gate, feature flag, rollback to the previous pin.

Some Azure setups default to auto-update on a deployment. You must turn that off or you did not pin, even if the deployment name looks stable.""",
   how="""Practice:

1. Config: `MODEL_ID=<exact>` committed or in the secret store as non-secret config.
2. Manifest: release file lists model id, date pinned, eval suite version and scores.
3. Traces: every request logs the id the platform actually used (read it back if the API returns it).
4. Upgrade: new key `MODEL_ID_CANDIDATE`, shadow or canary, then swap.

Example: Tuesday quality drop, no deploy. You diff traces and see the resolved model id changed. The alias moved Sunday. Fix: pin yesterday's id if still available, re-run evals, and open a ticket to the vendor about the move. Process fix: aliases banned in the production config linter.""",
   failures="""1. **Pinning the deployment name but not the version.** The name stayed; the version auto-updated.

2. **Pinning in docs, not in config.** A human typed `latest` "just for a test" and left it.

3. **No stored date.** You know the id but not which evals it passed.

4. **Assuming the platform will keep retired ids.** Pin plus a deprecation watch; pins expire.""",
   line="""Production gets an exact model id and the date I pinned it, stored with the eval scores. Aliases are for demos. An upgrade is a candidate pin, a gate and a flip — never a silent `latest`.""",
   key_points=[
    "Pin the exact model id and the date; never ship `latest`.",
    "Record the pin next to eval scores in the release manifest.",
    "Log the id the platform actually served, not just the alias you sent.",
    "Some deployments auto-update unless you turn that off.",
    "Pins expire — watch deprecation and keep a candidate ready.",
    "Treat an alias move as an unapproved release.",
   ],
   questions=[
    {"q": "What do you record when you pin a model for production?", "a": "The exact model id, the date, the region, and the eval suite version plus scores that justified it. Put the id in config and on every trace.", "kind": "recall"},
    {"q": "Quality dropped and nobody deployed. How can a pin failure cause that?", "a": "An alias or auto-updating deployment moved to a new snapshot. Diff the resolved model id on traces, roll back to a dated id if available, and ban aliases in prod config.", "kind": "debug"},
    {"q": "How do you upgrade a pin without a big-bang cutover?", "a": "Introduce a candidate id, run evals, shadow or canary a slice, then flip the config flag. Keep the old pin as rollback until the new one is boring.", "kind": "apply"},
    {"q": "Why is a stable deployment name not necessarily a pin?", "a": "The deployment can be set to auto-update its underlying version. You must pin the version and disable auto-update, then verify the resolved id.", "kind": "recall"},
    {"q": "An auditor asks which model drafted a letter in March. What must exist?", "a": "Traces (or archives) that store the exact model id and date, plus the prompt version. `latest` on that day is not an answer.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock model lifecycle", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html"},
    {"title": "Azure OpenAI model versions", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models"},
   ],
  ),
  "catalog-deprecation-watch": entry(
   what="""**Catalog deprecation watch** is the operating habit of subscribing to retirement notices and keeping a **second model already evaluated** before the pin you are on disappears. Platforms retire versions on their schedule. You get weeks or months, not a friendly pause button. If the first time you read a retirement mail is the week of the deadline, you are late.

Watch means: official RSS / email / service health, a calendar reminder, an owner, and a living "replacement" row in the decision record (candidate id, last eval date, score delta). It is not a folder of PDFs.

The replacement must be evaluated on **your** suite, in **your** region, with **your** tools. A vendor "migration guide" that names a successor is a hint, not a qualification.""",
   why="""On the job, deprecation is how platforms force upgrades. Teams without a watch scramble, float to `latest`, and ship an untested snapshot. Teams with a watch treat retirement as a normal release with a deadline.

In interviews, "what do you do when a model is retired" should have a boring answer: we already have a candidate, we re-run evals, we flag the swap, we have a rollback if the old id still serves during overlap. If your answer is "we would look at the catalog then", you do not have a watch.

This pairs with pinning. A pin without a watch is a time bomb. A watch without a pin is noise.""",
   how="""Set-up in the first production week:

1. Subscribe the owning alias to the platform's model-lifecycle notifications.
2. Spreadsheet or issue: current pin, retirement date (or "none posted"), candidate, last eval, owner.
3. Quarterly drill: pretend the pin retires in 30 days; run the candidate suite; file gaps (tools, region, quota).
4. When a real notice arrives: confirm dates, request quota for the candidate if needed, schedule the flag flip before the deadline, not on it.

Example: Sonnet dated version retires 1 December. Candidate was last evaluated in July and has since lost tool parity in the catalog notes. You re-eval in October, find the JSON drop, fix the prompt, and flip in November. December is boring.""",
   failures="""1. **Mail to a leaver.** The subscription died with a person. Use a team alias.

2. **Candidate never re-evaluated.** You have a name, not a replacement.

3. **Waiting for the deadline.** Quota for the new model is not yet approved.

4. **Silent auto-migrate.** The platform offers to point your alias at the successor. That is still an untested release.""",
   line="""I subscribe a team alias to retirement notices and I always have a second model already evaluated in-region. A pin without a watch is a time bomb. When the mail comes, I run a planned swap, not a scramble.""",
   key_points=[
    "Subscribe a team alias to official lifecycle notices; name an owner.",
    "Keep a candidate model evaluated on your suite in your region.",
    "Treat retirement as a release with a deadline, not as an emergency.",
    "Re-eval the candidate when the notice arrives — old scores go stale.",
    "Request quota for the successor before the last week.",
    "Refuse silent auto-migrate onto an untested successor.",
   ],
   questions=[
    {"q": "What does a catalog deprecation watch include?", "a": "Official notifications to a team alias, an owner, a current pin with dates, and a candidate already evaluated in-region on your suite.", "kind": "recall"},
    {"q": "A retirement notice lands with three weeks left and no candidate scores. What is the first week of work?", "a": "Pick a successor from the catalog, request access/quota, run the full eval (tools and schema included), and only then plan the flag flip. Do not float to latest to save time.", "kind": "apply"},
    {"q": "Why re-evaluate a candidate you scored six months ago?", "a": "The candidate's serving, filters or your eval set may have changed, and your product behaviour may now depend on tools it no longer supports.", "kind": "recall"},
    {"q": "The platform will auto-point your alias at the successor. Should you take that?", "a": "No. That is an untested release. Pin the successor yourself after evals, or you will not know what changed.", "kind": "debug"},
    {"q": "Who should own the watch?", "a": "The squad that owns the production pin, with a team alias — not a single engineer and not a vendor account manager.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock model lifecycle", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html"},
    {"title": "Azure OpenAI model deprecations", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements"},
   ],
  ),
  "converse-versus-native-passthrough": entry(
   what="""**Converse versus native passthrough** is the Bedrock-shaped name for a choice every platform offers: call the **unified API** (one request shape across models) or send the **vendor's native payload** through a passthrough. Unified wins portability and a single parser. Native wins features the unified schema has not grown yet — a new tool-calling field, a thinking/reasoning parameter, prompt caching controls, multimodal parts, or a beta flag.

Other clouds rhyme: Vertex's `generateContent` versus partner-native endpoints; Azure's shared chat-completions shape versus a model-specific preview API. Learn the trade-off, not only the Bedrock nouns.

You choose per feature, not per company. A classifier can live on Converse forever. An agent that needs a brand-new tool protocol may need passthrough until the unified API catches up. Isolate that call.""",
   why="""On the job, teams pick unified for everything and then file "the model cannot do X" bugs that are actually "we did not send the native field". Other teams pick native for everything and cannot swap models without a rewrite. The skill is knowing when the unified API is hiding a feature you have measured.

In interviews, naming Converse and `InvokeModel` (or the local pair) and giving one reason to use each is a clean Level 11 beat. Bonus if you say you wrap both so the app still sees one function.

This also affects failover. A gateway that only speaks the unified subset cannot fail over to a model that needed native fields unless you strip those features on the fallback path.""",
   how="""Decision rule:

- Start unified. Write the client against the common message list.
- When a required feature is missing, write a **narrow** native adapter for that model id, covered by tests that fail if you accidentally send the unified body.
- Document the feature that forced native, and a ticket to move back when the unified API grows it.

Example: you need Anthropic prompt caching on Bedrock. Converse may not expose the cache-control blocks you need. You send the native body for that model only. Classification remains on Converse so you can swap to Nova without touching it.

Never let native types leak into business services. The day the unified API grows the field, you delete one adapter.""",
   failures="""1. **Native everywhere 'for power'.** You rewrote portability for features you do not use.

2. **Unified forever.** You shipped a worse product because you would not read the passthrough doc.

3. **One client, two shapes, no tests.** A refactor sends the wrong body; production 400s.

4. **Failing over from native to unified without stripping fields.** The fallback rejects the payload.""",
   line="""I start on the unified API so catalog swaps stay cheap. I use native passthrough only for a measured missing feature, isolated behind an adapter, with a ticket to return to unified when the field exists. I never leak native types into business code.""",
   key_points=[
    "Unified APIs (Converse and cousins) maximise portability across the catalog.",
    "Native passthrough exposes vendor fields the unified schema does not have yet.",
    "Choose per feature; isolate native adapters and test the body you send.",
    "Document why you left unified and when you will return.",
    "Failover must strip native-only fields or the fallback 400s.",
    "Do not use native 'for power' when you are not using the extra fields.",
   ],
   questions=[
    {"q": "When should you leave a platform's unified API for native passthrough?", "a": "When a required, tested feature (tools, caching, extra parameters, multimodal parts) is missing from the unified shape. Keep the exception narrow and wrapped.", "kind": "recall"},
    {"q": "A fallback model rejects a request that worked on the primary. What might you have done?", "a": "Sent native-only fields through a unified or other-vendor path. Strip those fields on failover, or do not fail over that skill.", "kind": "debug"},
    {"q": "Why start on the unified API even if passthrough exists?", "a": "Most skills do not need vendor fields, and unified keeps catalog swaps as a config change. Native is an opt-in cost.", "kind": "apply"},
    {"q": "What belongs in the ticket when you add a native adapter?", "a": "The feature that forced it, the model ids it applies to, tests that lock the payload, and the condition for deleting the adapter.", "kind": "apply"},
    {"q": "Name the Bedrock pair and one analogue on another cloud.", "a": "Converse (unified) versus InvokeModel / native payload. Analogue: Vertex generateContent versus a partner-native endpoint, or Azure shared chat completions versus a model-specific preview API.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock Converse API", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html"},
    {"title": "Amazon Bedrock InvokeModel", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/inference.html"},
   ],
  ),
  "one-call-on-three-platforms": entry(
   what="""**One call on three platforms** is a whiteboard exercise: sketch the same chat request on Bedrock, Vertex and Foundry and name the **identity** and **region** knobs on each. You are proving you see the shape, not that you memorised SDKs.

For each cloud you should be able to write: who the caller is (role, service account, managed identity), where the bytes go (regional endpoint), what the model id looks like, and what a minimal message list looks like. You do not need running accounts in the interview. You need the knobs.

This is also a design check. If you cannot name the identity and region knobs, you are not ready to talk about residency or least privilege on that platform.""",
   why="""IT services interviews and enterprise loop interviews love this sketch. It separates people who completed one hello-world from people who can transfer. On the job it is how you estimate a port: "the app wrapper stays, we change identity and region plumbing, we re-eval the model id".

If you freeze on Azure because you have only used AWS, say the ideas and the knobs you would look up. That still scores. Reciting one SDK line-for-line and failing the other two does not.""",
   how="""Sketch, not production code:

Bedrock: task role `arn:...:role/support-worker` in `eu-central-1`; `converse(modelId=..., messages=[{role, content}])`; endpoint is regional; private optional via PrivateLink.

Vertex: service account `support-worker@proj.iam` with `aiplatform.endpoints.predict`; location `europe-west1`; `generateContent` on a publisher model id; VPC-SC / PSC if required.

Foundry / Azure OpenAI: managed identity on the app; resource in `westeurope`; deployment name (not raw model name) on a chat-completions call; private endpoint if required.

The message list — system, user — is the same idea. The knobs that change are identity, region/location, and whether you address a model id or a deployment name.

Then say: I would wrap all three behind `complete(messages)` and pin ids in config.""",
   failures="""1. **Forgetting Azure deployments.** You send a model name to a resource that only knows deployment names.

2. **Forgetting location on Vertex.** Global vs regional endpoints change residency.

3. **Using user credentials in the sketch.** They asked for a production call.

4. **Writing three different prompts.** The exercise is the plumbing; the prompt stays still.""",
   line="""Same chat, three sketches: Bedrock role + region + Converse model id; Vertex service account + location + generateContent; Azure managed identity + region + deployment name. Identity and region are the knobs. The prompt stays still behind one wrapper.""",
   key_points=[
    "Sketch the same chat on all three: identity, region/location, model or deployment id.",
    "Azure often addresses a deployment name, not a raw model id.",
    "Vertex location and global endpoints change residency.",
    "Use workload identities in the sketch, not user logins.",
    "The prompt and message list stay the same; plumbing changes.",
    "Wrap all three behind one application function.",
   ],
   questions=[
    {"q": "Name the identity and region knobs on Bedrock, Vertex and Azure AI Foundry for one chat call.", "a": "Bedrock: IAM role + AWS region + model id. Vertex: service account + location + model id. Azure: managed identity + resource region + deployment name. Private networking is an extra knob on each.", "kind": "recall"},
    {"q": "Why might an Azure sketch that sends a model name fail?", "a": "Many Azure OpenAI / Foundry setups expose a deployment name you created. The raw model id is not what the endpoint expects unless you are on a catalog API that says otherwise.", "kind": "debug"},
    {"q": "What stays identical across the three sketches?", "a": "The application task, the message roles, and ideally the wrapper function. Identity, endpoint and id syntax change.", "kind": "recall"},
    {"q": "You have only used AWS. How do you still complete the Vertex sketch in an interview?", "a": "State the ideas: service account, location, generateContent, model id, optional PSC. Say which docs you would open. Do not invent SDK methods you do not know.", "kind": "apply"},
    {"q": "Where does residency go wrong in these sketches?", "a": "A global Vertex endpoint, a Bedrock cross-region inference profile, or an Azure resource in another geo. Name the location explicitly and refuse defaults you have not checked.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock Converse API", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html"},
    {"title": "Vertex AI locations", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations"},
    {"title": "Azure OpenAI deployments", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/create-resource"},
   ],
  ),
 }
}
