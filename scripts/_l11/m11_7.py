from assemble import entry

NOTES = {
 "m11-7": {
  "one-endpoint-many-providers": entry(
   what="""A **gateway** is **one endpoint in front of many providers**. It holds credentials, accepts **one request format**, and **hides which model actually served** the request. The application calls `POST /v1/chat/completions` (or your internal shape) once. The gateway picks Bedrock, a public API, or an open-weight host based on rules. Users and most services never see a vendor SDK.

Hiding the backend is a feature for portability and a risk for debugging. Traces must still record the **resolved** model and provider. Hiding it from the app is not the same as hiding it from operations.

A gateway is not a model. It does not make two models behave the same.""",
   why="""On the job this is how many-team companies stop leaking keys and stop rewriting clients. In interviews, define the gateway in one sentence: one endpoint, many providers, credentials inside, format unified. Then say what it cannot unify (behaviour).

Enterprises will ask whether the gateway is in-boundary. Answer that separately.""",
   how="""App → gateway → {platform, public API, host}.

The gateway stores provider keys or assumes cloud roles, maps a virtual model name (`support-small`) to a real id, and logs both names.

Example: `support-small` is Nova on Bedrock this week and an 8B host next week. The app does not change. Evals still run on the resolved id. If you only log `support-small`, you cannot debug Tuesday.""",
   failures="""1. **No resolved-id in traces.**

2. **Assuming unified format equals unified behaviour.**

3. **Putting the gateway on the public internet** with the keys.

4. **One virtual name, silent backend lottery.**""",
   line="""A gateway is one endpoint, many providers, credentials inside. I unify the request shape; I still log the resolved model. One format is not one behaviour.""",
   key_points=[
    "One endpoint, held credentials, one request format, many backends.",
    "Hide the vendor from the app, not from traces.",
    "Virtual names must resolve to a logged real id.",
    "Behaviour is not unified just because the HTTP path is.",
    "The gateway itself needs a security boundary.",
    "It is plumbing, not a model.",
   ],
   questions=[
    {"q": "What does a model gateway standardise?", "a": "Transport, credentials and request shape. Not model behaviour, tokenisation or safety.", "kind": "recall"},
    {"q": "Why log the resolved model if the app uses a virtual name?", "a": "So you can debug quality, cost and incidents. A virtual name that pointed at two backends is otherwise unexplainable.", "kind": "apply"},
    {"q": "What is the biggest misconception about one endpoint?", "a": "That models behind it are interchangeable. They are not; evals still apply per resolved id.", "kind": "debug"},
    {"q": "Where should provider credentials live?", "a": "Inside the gateway (or its cloud identity), not in every microservice.", "kind": "recall"},
    {"q": "When is hiding the backend from the app the wrong call?", "a": "When a feature needs a vendor field the unified shape cannot express — then isolate that call, do not pretend.", "kind": "apply"},
   ],
   links=[
    {"title": "LiteLLM proxy", "url": "https://docs.litellm.ai/docs/simple_proxy"},
   ],
  ),
  "hosted-routers-vs-self-hosted-proxies": entry(
   what="""**Hosted routers** (OpenRouter, Portkey Cloud and similar) are someone else's gateway: fast to start, keys and dashboards included, **another processor** on the path. **Self-hosted proxies** (LiteLLM, self-hosted Portkey, in-house) run in your network: you own availability and you keep prompts in-boundary if you configure them that way. Cloud platforms and some frameworks also ship **routing** that only sees their catalog.

Pick hosted when data may leave and you want no extra ops. Pick self-hosted when policy forbids a new processor. Pick platform-native routing when you only have one catalog and need simple fallback inside it.

"We use a router" is incomplete until you say which of the three.""",
   why="""On the job, security will reject a hosted router the same day they rejected a public API — it is the same class of hop. In interviews, compare hosted vs self-hosted on data, ops and features. Mention platform-native routing as a third option that is not multi-cloud.

Do not run a hosted router "in front of Bedrock" for regulated text.""",
   how="""Decision:

- Unregulated, many public models, tiny team → hosted.
- Regulated, existing VPC → self-hosted LiteLLM (or similar) with cloud roles, no public keys.
- One cloud only → maybe no extra router.

Example: a bank puts LiteLLM in the VNet, backends are only Bedrock. They get virtual keys without a new SaaS. OpenRouter is used in a playground project with synthetic data only.""",
   failures="""1. **Hosted router on regulated prompts.**

2. **Self-hosted with no owner** — you added a critical path nobody pages.

3. **Double hop** (hosted + self-hosted) for no reason.

4. **Platform routing assumed to call other clouds.** It will not.""",
   line="""Hosted routers are another processor. Self-hosted proxies keep the hop in my network. Platform routing only sees one catalog. I name which kind I mean and I do not put a hosted router in front of a regulated platform.""",
   key_points=[
    "Hosted = fast, extra processor. Self-hosted = in-boundary, you own uptime.",
    "Platform-native routing is single-catalog.",
    "Do not put a hosted router on regulated text.",
    "A self-hosted proxy needs an owner and a bypass.",
    "Say which kind; 'router' is not specific.",
    "Avoid double hops.",
   ],
   questions=[
    {"q": "Compare hosted routers and self-hosted proxies.", "a": "Hosted: vendor-operated, extra processor, low ops. Self-hosted: in your network, you own availability and can keep data in-boundary.", "kind": "recall"},
    {"q": "Compliance bars third-party transit but you want routing. Best choice?", "a": "A self-hosted proxy in your network pointing at approved backends only.", "kind": "apply"},
    {"q": "Why will Bedrock's routing not save a multi-cloud design?", "a": "It routes inside AWS's catalog. Another cloud needs a real gateway or a second client.", "kind": "debug"},
    {"q": "When is a hosted router honest?", "a": "When data may leave, the team is small, and you accepted the processor in writing.", "kind": "apply"},
    {"q": "What extra incident type does self-hosting add?", "a": "The proxy itself is down or misroutes. You need health, pages and a bypass plan.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM proxy", "url": "https://docs.litellm.ai/docs/proxy/quick_start"},
    {"title": "Portkey docs", "url": "https://docs.portkey.ai/docs/introduction/what-is-portkey"},
   ],
  ),
  "routing-rules-automatic-failover": entry(
   what="""**Routing rules** send a request to a backend by **task type, cost ceiling, context length, latency target, region or risk**. **Automatic failover** sends it to a backup when the primary **errors or throttles**. Rules are configuration; they change who answers without a code deploy. That is the point and the hazard.

Failover should trigger on **timeouts, 5xx, 429** — not on **invalid request** (400), which will fail everywhere. The fallback must be **evaluated** for the skill, including tools.

A rule without evals is a silent model swap.""",
   why="""On the job, rules are how you save money (cheap model for classify) and stay up (fallback). In interviews, give two rules and one failover policy, and say 400s do not fail over.

Mention region as a rule: regulated traffic never matches a public backend.""",
   how="""Examples:

- `task=classify` → 8B host, fallback 8B on platform.
- `task=reason` → frontier on platform, no public fallback.
- `ctx>20k` → long-context id only.
- Failover: 429/5xx/timeout → secondary; 400 → return error.

Test: pull the primary; confirm secondary serves and traces show the switch; confirm a bad schema does **not** switch.""",
   failures="""1. **Failing over 400s.**

2. **Fallback never eval'd.**

3. **Rules that send regulated data to a public host.**

4. **No test of the failover path.**""",
   line="""I route by task, cost, context, latency, region and risk, and I fail over on 429/5xx/timeout — not on 400. Every fallback is evaluated. A rule change is a release.""",
   key_points=[
    "Rules match task, cost, context, latency, region, risk.",
    "Fail over on throttle/error/timeout, not on invalid requests.",
    "Evaluate fallbacks for the same skill and tools.",
    "Region/risk rules protect data class.",
    "A rule change is a release — run evals.",
    "Test the failover path on purpose.",
   ],
   questions=[
    {"q": "Which errors should not trigger failover?", "a": "Invalid request / schema errors (400-class). They fail on every backend and waste spend.", "kind": "recall"},
    {"q": "A gateway fails over to a different model on timeout. Hidden risk?", "a": "The fallback may differ in format, tools, safety or quality. It must be evaluated and logged as the resolved model.", "kind": "debug"},
    {"q": "Give two routing rules you would actually ship.", "a": "E.g. classify → cheap small model; regulated/reason → in-region platform model with no public fallback. Adjust to the product.", "kind": "apply"},
    {"q": "Why is a rule change a release?", "a": "It swaps who answers without a code change. Quality and cost move. Evals and a changelog apply.", "kind": "recall"},
    {"q": "How do you keep regulated traffic off a public fallback?", "a": "A rule (or hard allow-list) that refuses public backends for that data class, plus a test that the failover path cannot violate it.", "kind": "apply"},
   ],
   links=[
    {"title": "LiteLLM router", "url": "https://docs.litellm.ai/docs/routing"},
   ],
  ),
  "virtual-keys-budgets-quotas": entry(
   what="""**Virtual keys** are gateway-issued credentials **per team or feature**. They carry **budgets, quotas and rate limits** so one client cannot exhaust shared capacity or the company card. They are not provider keys. Revoking a virtual key does not require rotating Bedrock or OpenAI credentials.

This is how a shared gateway becomes multi-tenant internally. Without virtual keys, you have a shared password.

Budgets can be hard (reject) or soft (alert). Prefer hard for experiments, soft-plus-page for production with a cap behind it.""",
   why="""On the job this is chargeback and blast-radius. In interviews, "why virtual keys" is: attribution, revoke, per-team limits, one place to cut spend. Mention they do not replace cloud IAM on the backend; they add a layer in front.

A leaked virtual key is still an incident, but it is scoped.""",
   how="""Issue `vk_support`, `vk_research`. Support: 50 RPM, $200/day, only `support-*` virtual models. Research: $20/day, public backends allowed, no prod data.

Example: research loops a prompt, hits $20, stops. Prod chat never noticed. Before virtual keys, research emptied the shared quota at 11:00.""",
   failures="""1. **One virtual key for the company.**

2. **Soft budget nobody pages.**

3. **Virtual key in a frontend.**

4. **No rotate/revoke drill.**""",
   line="""Virtual keys give each team a budget and a revoke button without rotating provider credentials. I use hard caps on experiments and I never share one key across the company.""",
   key_points=[
    "Virtual keys are per-team or per-feature gateway credentials.",
    "They carry budgets, quotas and rate limits.",
    "Revoke one team without rotating provider keys.",
    "They complement, not replace, backend IAM.",
    "Hard caps for experiments; production needs a cap too.",
    "Do not put virtual keys in browsers.",
   ],
   questions=[
    {"q": "Why prefer virtual keys over sharing provider keys?", "a": "Per-team budgets, attribution and revocation without rotating the underlying provider credentials.", "kind": "recall"},
    {"q": "Research burned the shared quota. What control was missing?", "a": "A separate virtual key with its own RPM and daily budget so research cannot exhaust production.", "kind": "debug"},
    {"q": "Do virtual keys replace IAM roles on Bedrock?", "a": "No. The gateway still should assume a scoped role. Virtual keys govern consumers of the gateway.", "kind": "apply"},
    {"q": "Hard versus soft budget — when each?", "a": "Hard reject for sandboxes. Production: alert plus a higher hard cap so a loop still dies.", "kind": "apply"},
    {"q": "What do you do if a virtual key leaks?", "a": "Revoke it at the gateway, issue a new one, review traces for abuse. Provider keys can stay if they never left the gateway.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM virtual keys", "url": "https://docs.litellm.ai/docs/proxy/virtual_keys"},
   ],
  ),
  "one-view-of-usage-and-cost": entry(
   what="""**One view of usage, latency, errors and cost** across every provider is a reason gateways exist. Without it you stitch Bedrock Cost Explorer, an OpenAI dashboard and a host's CSV. With it you see **tokens, $, p95, 429s** in one place, per virtual key and per resolved model.

The view is only as good as the **labels**: team, feature, resolved id, data class. A pretty dashboard of anonymous traffic is a screensaver.

This does not replace cloud bills. It is the operational picture; you still reconcile to Finance.""",
   why="""On the job, one view is how you notice a failover spent 4× or a team swapped models. In interviews, mention you still reconcile to the official bill because gateway math can drift.

Also mention privacy: the usage view should not need raw prompts.""",
   how="""Export from the gateway: timestamp, vk, virtual model, resolved id, tokens in/out, latency, status, estimated $. Join to the cloud bill weekly.

Example: p95 jumped and $ / request jumped together. The view showed failover to a frontier model for 40 minutes. You fix the primary; you do not blame "AI being expensive".""",
   failures="""1. **No resolved id.**

2. **Dashboard with prompts** in a wide-ACL tool.

3. **Never reconciling** to the real bill.

4. **Per-provider views only**, which the gateway was meant to replace.""",
   line="""I want one operational view of tokens, dollars, latency and errors across providers, labelled by team and resolved model. I reconcile it to the cloud bill. I do not need prompts in that view.""",
   key_points=[
    "One view: usage, latency, errors, cost across backends.",
    "Labels: team, feature, resolved model.",
    "Reconcile to the official bill; gateway estimates drift.",
    "Keep raw prompts out of the wide dashboard.",
    "Use it to see failovers and swaps, not only monthly spend.",
    "Per-provider consoles are what you are replacing.",
   ],
   questions=[
    {"q": "What should a unified gateway view show?", "a": "Tokens, estimated cost, latency, errors — per virtual key and per resolved model — without needing raw prompts.", "kind": "recall"},
    {"q": "Spend looks wrong versus AWS. What do you do?", "a": "Reconcile: gateway estimates vs Cost Explorer, missing tags, failed retries counted twice. Do not trust one source blindly.", "kind": "debug"},
    {"q": "Why include resolved model in the usage view?", "a": "So a failover or rule change is visible as a mix shift, not as a mysterious price change.", "kind": "apply"},
    {"q": "Why not put prompts on the cost dashboard?", "a": "Wide ACL plus regulated text. Metrics suffice for spend; traces stay in a tighter store.", "kind": "apply"},
    {"q": "What does one view replace?", "a": "Stitching each provider's console to answer 'who spent' and 'who 429'd'.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM spend tracking", "url": "https://docs.litellm.ai/docs/proxy/cost_tracking"},
   ],
  ),
  "the-router-is-on-the-critical-path": entry(
   what="""Once every call goes through a gateway, the gateway is **on the critical path**. If it dies, every model dies — even if Bedrock is healthy. You owe it **availability, timeouts, health checks, capacity**, and a **bypass plan** (signed-off direct-provider path for incidents). A proxy you cannot page is a single point of failure you chose.

Timeouts must be **shorter** than the client's. Otherwise the client gives up and the gateway still holds the provider call.

This is ordinary SRE applied to a new hop. Do not treat the proxy as "just config".""",
   why="""On the job, the first gateway outage is embarrassing because the models were fine. In interviews, naming the extra failure mode and the bypass is the answer. Mention multi-instance, health, and not storing the only copy of rules in a memory that vanishes.

A hosted router moves the critical path to their SLO — read it.""",
   how="""Design:

- 2+ instances, health on `/health`, no single-node disk state.
- Timeouts: client 30s > gateway 25s > provider 20s (example).
- Bypass: feature flag to call Bedrock directly, tested quarterly, approved for incidents.
- Page: gateway 5xx and p95.

Example: LiteLLM one container on a laptop-grade VM. It OOM'd. All chat died. Two replicas and a bypass flag later, the next OOM was a blip.""",
   failures="""1. **Single replica.**

2. **No bypass**, so a proxy bug is a company outage.

3. **Timeout inversion** (gateway longer than client).

4. **Rules only in RAM.**""",
   line="""The gateway is critical-path infrastructure. I run more than one, I set timeouts that nest, I page it, and I keep a signed-off direct-provider bypass for incidents. A healthy model behind a dead proxy is still down.""",
   key_points=[
    "A gateway outage is a total model outage.",
    "Run multiple instances; health-check them.",
    "Nest timeouts: client > gateway > provider.",
    "Keep a tested, approved bypass path.",
    "Page gateway SLOs like any edge service.",
    "Hosted routers transfer this risk to their SLO.",
   ],
   questions=[
    {"q": "What failure mode do you add by putting a gateway on every call?", "a": "The gateway can be down or slow while every provider is healthy. It needs HA, nested timeouts and a bypass.", "kind": "recall"},
    {"q": "Clients time out at 15s; the gateway waits 60s. What happens?", "a": "Users fail; the gateway still holds provider calls and can overload itself. Nest timeouts.", "kind": "debug"},
    {"q": "What is a bypass plan?", "a": "A signed-off way to call an approved provider directly during a gateway incident, tested so it still works.", "kind": "apply"},
    {"q": "Why is one LiteLLM container a risk?", "a": "It is a single point of failure for every product using it. Run at least two and remove local-only state.", "kind": "apply"},
    {"q": "How does a hosted router change this?", "a": "You inherit their availability. Read their SLO and still have a bypass if policy allows a second path.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM production", "url": "https://docs.litellm.ai/docs/proxy/deploy"},
   ],
  ),
  "differences-a-router-cannot-hide": entry(
   what="""A gateway **cannot hide** provider differences that live in **behaviour**: **tool-calling formats**, **structured-output support**, **token limits**, and **prompts that only work on one family**. It can translate some tool schemas. It cannot make a model that has no tools grow tools. It cannot make a 8k-context model accept 100k tokens. It cannot make a Llama-shaped prompt behave like a Claude-shaped one without you writing the translation.

If you need a feature, **route only to backends that have it**, or **strip the feature on failover** (e.g. no tools on the fallback). Pretending the router solved it is how agents loop.""",
   why="""On the job, this is the 400 storm after a failover. In interviews, listing tools, JSON mode, context and prompt style as un-hideable is the answer. Mention you test failover with the real payload.

Junior claim: "LiteLLM means we are model-agnostic". Senior claim: "agnostic transport, specific behaviour".""",
   how="""Matrix: virtual model × {tools, json, ctx, family}. Failover edges only connect compatible cells, or the edge strips tools.

Example: primary has tools; fallback is a small model without them. On failover you switch to a non-tool prompt that asks for a single next action, or you fail the request. You do not send the tool schema and retry 20 times.""",
   failures="""1. **Universal failover** without a compatibility matrix.

2. **One prompt for all families.**

3. **Assuming JSON mode everywhere.**

4. **Silent truncation** of long context.""",
   line="""The router unifies HTTP, not behaviour. Tools, structured output, context and prompt family still differ. I only fail over to compatible backends or I strip features on the fallback path.""",
   key_points=[
    "Un-hideable: tools, structured output, context limits, prompt families.",
    "Transport agnostic ≠ behaviour agnostic.",
    "Build a compatibility matrix for failover edges.",
    "Strip tools on fallback if the backup cannot use them.",
    "Do not send one prompt to every family.",
    "Test failover with the real payload.",
   ],
   questions=[
    {"q": "Which differences can a gateway not hide?", "a": "Tool-calling support and schema, structured-output modes, context/token limits, and prompt/family behaviour.", "kind": "recall"},
    {"q": "Failover starts 400ing on tool calls. What do you do?", "a": "Stop sending tools to a backend that cannot accept them. Strip tools or pick a compatible fallback. Do not retry harder.", "kind": "debug"},
    {"q": "What belongs in a compatibility matrix?", "a": "Per backend: tools, JSON mode, max context, region, data class. Failover only along compatible edges.", "kind": "apply"},
    {"q": "Why is 'we are model-agnostic' a dangerous claim?", "a": "It is true of HTTP and false of quality and features. It leads to untested failovers.", "kind": "apply"},
    {"q": "Long RAG prompts fail after a swap. Likely cause?", "a": "The fallback's context limit is smaller; the router truncated or the backend rejected. Route long context only to models that fit.", "kind": "debug"},
   ],
   links=[
    {"title": "LiteLLM tools", "url": "https://docs.litellm.ai/docs/completion/function_call"},
   ],
  ),
  "caching-at-the-gateway": entry(
   what="""**Caching at the gateway** can be **exact-match** (same messages hash) or **semantic** (nearby embedding). Both save tokens. Both can **leak** if the key omits tenant or permission, and both can **serve stale or wrong** answers. Some requests must **never** be answered from cache: auth, payments, anything that embeds a secret, anything that must be live.

Exact-match is simple and safe-ish with a good key. Semantic is a product decision with a similarity threshold and an exclusion list.

Provider-side prompt caching is a third thing (prefix discounts). It is not a cross-user answer cache.""",
   why="""On the job, a semantic cache that returns another tenant's answer is a P0. In interviews, say tenant+scope in the key, and name an exclusion list (auth, payments, secrets). Mention TTL and that writes (actions) never cache.

Exact-match for identical system+user is the default; semantic needs a review.""",
   how="""Key: `hash(tenant, permission, virtual_model, messages)` for exact. Semantic: same prefixes + embedding of user text, never across tenants.

Exclusion: paths `/auth`, `/pay`, prompts tagged `nocache`, any message containing `Authorization`.

Example: FAQ chat, exact-match, 10-minute TTL, 40% hit rate. Payments assistant: cache off. A semantic cache added without tenant in the key failed the leak test the same day.""",
   failures="""1. **Semantic cache, no tenant.**

2. **Caching tool-using agents** that should act now.

3. **Caching secrets.**

4. **Confusing provider prefix cache with answer cache.**""",
   line="""I cache at the gateway only with tenant and permission in the key, I exclude auth, payments and secrets, and I treat semantic cache as a leak risk I test. Provider prefix caching is a discount, not a shared answer store.""",
   key_points=[
    "Exact-match and semantic caches both need tenant and scope in the key.",
    "Never cache auth, payments or secret-bearing requests.",
    "Semantic cache needs a leak test and a threshold review.",
    "Do not cache side-effecting agent calls.",
    "Provider prompt-cache is prefix discount, not cross-user answers.",
    "TTL and virtual model belong in the key.",
   ],
   questions=[
    {"q": "The semantic cache returns another tenant's answer. Primary fix?", "a": "Include tenant and permission scope in the cache key (and never search across tenants). Then re-run the leak test.", "kind": "debug"},
    {"q": "Which requests must never be cached?", "a": "Auth, payments, secret-bearing prompts, and side-effecting tool runs that must be live.", "kind": "recall"},
    {"q": "Exact-match versus semantic — default?", "a": "Exact-match with a full-key hash. Semantic only after a leak test and a product reason.", "kind": "apply"},
    {"q": "How does provider prompt caching differ?", "a": "It discounts repeated prefixes for one caller. It should not serve user A's answer to user B.", "kind": "recall"},
    {"q": "Why include virtual model in the cache key?", "a": "So a routing change cannot serve answers produced by a different model as if they were fresh.", "kind": "apply"},
   ],
   links=[
    {"title": "LiteLLM caching", "url": "https://docs.litellm.ai/docs/proxy/caching"},
   ],
  ),
  "when-a-router-earns-its-place": entry(
   what="""A router **earns its place** when you have **several providers**, **several teams**, or **spend worth governing**. One provider, one team, stable needs: a **thin in-code wrapper** is the honest answer. The router is extra latency, extra failure, extra concepts. You add it when the alternative is worse (keys everywhere, no failover, no budgets).

Write the trigger that would add it: "second provider" or "third team" or "$X/month". Until then, do not install one because a blog did.""",
   why="""On the job, premature gateways are real. In interviews, "when would you not use a gateway" is as important as when you would. Answer: one team, one catalog, no failover need.

Also mention removing a gateway if you later consolidate — they are not a monument.""",
   how="""Start: `client.complete()` wrapping one SDK.
Trigger hits: add LiteLLM with one backend first (virtual keys), then add backends.
Review quarterly: if still one backend and one team, consider removing.

Example: two teams, one Bedrock catalog, fighting over quota. A gateway with virtual keys earns its place even without a second vendor. Multi-cloud routing would not — yet.""",
   failures="""1. **Gateway first, product second.**

2. **Keeping a gateway** after you consolidated to one API.

3. **No written trigger.**

4. **Equating 'professional' with 'has OpenRouter'.**""",
   line="""A router earns its place with several providers, several teams, or spend that needs budgets. One team and one catalog get a thin wrapper. I write the trigger to add it — and I am willing to remove it.""",
   key_points=[
    "Earn: multi-provider, multi-team, or spend governance.",
    "One team, one catalog: thin wrapper.",
    "Write the trigger before you install.",
    "You can add virtual keys first with one backend.",
    "Be willing to remove a router you no longer need.",
    "A blog is not a trigger.",
   ],
   questions=[
    {"q": "When does a router earn its place?", "a": "When you have several providers, several teams needing budgets, or spend that needs a single control point. Not by default.", "kind": "recall"},
    {"q": "One-team, one-provider, stable needs. Best choice?", "a": "A thin in-code wrapper. Add a gateway when a named trigger hits.", "kind": "apply"},
    {"q": "Can a gateway be justified with only one backend?", "a": "Yes — virtual keys and budgets for several teams. Multi-provider routing is a different trigger.", "kind": "apply"},
    {"q": "You consolidated to one API. Why review the gateway?", "a": "It may now be only a hop. If teams and budgets can move into the platform, removing it reduces critical-path risk.", "kind": "debug"},
    {"q": "What belongs in the written trigger?", "a": "The event (second provider, third team, $X/month) and who decides to add the hop.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM docs", "url": "https://docs.litellm.ai/docs/"},
   ],
  ),
  "routing-changes-who-answers": entry(
   what="""A **routing rule change swaps the model answering your users** without a single line of application code changing. That is why **evals stay in the loop**. You run the suite against the **routed mix**, not only against each model in isolation. A 90% cheap / 10% frontier mix has a different quality and cost than either model alone.

Treat rule edits like prompt edits: review, eval, changelog, rollback. Feature-flag the rule set if you can.

If you cannot name who answers a given request after a rule change, you are not operating a router; you are running a lottery.""",
   why="""On the job, "we only changed config" is the incident report. In interviews, this sentence is the punchline of M11.7: routing changes who answers. Mention canaries and mix evals.

Also mention users who get the fallback during an outage had a different model — quality complaints may be failover, not "the product got worse".""",
   how="""Before flipping a rule:

1. Eval primary, eval fallback, eval the **expected mix** (or shadow the mix).
2. Changelog: old rule, new rule, scores, owner.
3. Canary 5% of traffic, watch quality samples and $.
4. Rollback is the previous rule file.

Example: you sent 30% of classify to a smaller model. Isolation evals were fine. Mix eval showed the 30% slice included too many edge tickets. You route only `label=easy` tickets, not a blind percentage.""",
   failures="""1. **Isolation evals only.**

2. **No changelog.**

3. **Blind percentages** on uneven difficulty.

4. **Ignoring failover quality** during incidents.""",
   line="""A routing change is a model change. I eval the mix, I changelog the rule, I canary, and I can roll back. If I cannot say who answered, I do not ship the rule.""",
   key_points=[
    "Rule changes swap the answering model without app code changes.",
    "Eval the routed mix, not only each model alone.",
    "Changelog, canary, rollback — like a prompt release.",
    "Blind percentages can send hard tickets to a small model.",
    "Failover periods are a different mix — expect quality tickets.",
    "Traces must still say who answered.",
   ],
   questions=[
    {"q": "Why keep evals in the loop when you use a router?", "a": "Because a rule change swaps the model users see without a code change. Isolation scores are not the mix score.", "kind": "recall"},
    {"q": "Isolation evals passed; production quality dipped after a 30% rule. Why?", "a": "The 30% slice was not the same distribution as the eval, or hard cases landed on the small model. Eval the mix or route by difficulty.", "kind": "debug"},
    {"q": "What is a router canary?", "a": "Sending a small slice through the new rule set, watching quality and cost, then promoting.", "kind": "apply"},
    {"q": "What must traces show after a rule change?", "a": "The resolved provider and model id for each request, plus the rule name if you have one.", "kind": "apply"},
    {"q": "How do you roll back a bad rule?", "a": "Restore the previous rule file or flag — you do not need an app deploy if you kept the old config.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM router", "url": "https://docs.litellm.ai/docs/routing"},
   ],
  ),
  "failover-that-preserves-tools": entry(
   what="""**Failover that preserves tools** means you **tested** that the fallback model **accepts the same tool schema**, or you **strip tools** on failover and use a degraded prompt. Half-failing — sending tools to a model that 400s — is worse than no failover. The user sees errors; the agent may loop; you pay for the failures.

Compatibility is per schema, not per "has function calling" marketing. Strict JSON tools, parallel calls, and vendor-specific fields break across families.

Write the degraded mode: e.g. "fallback returns a single `action` string we map to tools in code".""",
   why="""On the job this is the agent outage during a primary incident. In interviews, "strip or verify" is the crisp rule. Mention you test with the production tool list, not `hello`.

Also mention that stripping tools may require a product limitation (read-only fallback).""",
   how="""Test in CI: send the real tool payload to every backend on the failover graph. Fail the build if a declared-compatible edge 400s.

If incompatible: gateway mutates the request (drop `tools`) and attaches a fallback system line. Application handles a tool-less reply.

Example: Claude tools → Nova fallback without tools. You strip and ask for `{"action":"refund","id":...}` which your code executes. Users get a slower, narrower path, not a 400 storm.""",
   failures="""1. **Assuming 'supports tools'.**

2. **No degraded product mode.**

3. **Retrying tool 400s onto the same fallback.**

4. **Different tool names per model** without a map.""",
   line="""I fail over tools only to backends I have tested with the real schema, or I strip tools and run a degraded path. An untested tool failover is an error amplifier.""",
   key_points=[
    "Verify the real tool schema on every failover edge, or strip tools.",
    "Marketing 'function calling' is not compatibility.",
    "Define a degraded product mode for tool-less fallback.",
    "Do not retry tool 400s in a loop.",
    "Map tool names if families differ.",
    "CI should break when an edge stops accepting the schema.",
   ],
   questions=[
    {"q": "What must you test before a tool-using failover goes live?", "a": "That the fallback accepts the same tool schema, or that you strip tools and handle a degraded reply. Test with the production tool list.", "kind": "recall"},
    {"q": "Primary dies; fallback 400s on tools; agent loops. Fix?", "a": "Stop sending tools to that backend. Strip on failover or remove the edge. Add a CI check so it cannot return unnoticed.", "kind": "debug"},
    {"q": "What is a decent degraded mode?", "a": "Ask for a single structured action your code executes, or become read-only (answer without tools) and say so to the user.", "kind": "apply"},
    {"q": "Why isn't 'supports function calling' enough?", "a": "Schemas, parallel calls and field names differ. Only a real payload test is enough.", "kind": "recall"},
    {"q": "Where should the strip happen?", "a": "In the gateway on that edge, so every app gets the same behaviour, with a trace flag `tools_stripped=true`.", "kind": "apply"},
   ],
   links=[
    {"title": "LiteLLM function calling", "url": "https://docs.litellm.ai/docs/completion/function_call"},
   ],
  ),
  "semantic-cache-exclusion-list": entry(
   what="""A **semantic cache exclusion list** is the set of requests that **must never** be answered from a similarity cache: **auth**, **payments**, **anything that embeds a secret**, plus usually **account-specific balances**, **one-time codes**, and **prompts that include credentials or session tokens**. Exact-match caches need a similar list when the request contains secrets (you should not store the value at all).

The list is enforced in code by route, by tag, and by detectors (token-shaped strings). A comment in the design doc is not enforcement.

Semantic cache on a support bot's FAQ is fine. Semantic cache on "what is my password reset link" is a critical bug.""",
   why="""On the job this is how you sleep after enabling semantic cache. In interviews, naming auth, payments and secrets is the expected list. Mention tenant keys are necessary but not sufficient — a user should not get another user's balance even in the same tenant if the question is similar.

Leak tests should include an excluded path that must miss.""",
   how="""Implement:

- `nocache` tag from the app on sensitive routes.
- Gateway deny-list of paths and regexes (`sk-`, `Bearer `, card-like numbers).
- Unit test: similar auth questions → miss.
- Do not store the request body for excluded calls.

Example: two users ask "what's my OTP". Semantic similarity is high. Exclusion + user id in the key means miss. You also should not have cached OTPs at all.""",
   failures="""1. **Exclusion in a wiki only.**

2. **Tenant in the key, still caching OTPs.**

3. **Detectors that miss tokens in tool results.**

4. **Logging excluded bodies into the cache store for 'debug'.**""",
   line="""Semantic cache never answers auth, payments or secret-bearing requests. I enforce that with tags, path lists and detectors, and I test that similar sensitive questions miss. Tenant keys are not enough if the answer is a secret.""",
   key_points=[
    "Exclude auth, payments, secrets, OTPs, balances, credential-bearing prompts.",
    "Enforce in code, not in a wiki.",
    "Tenant isolation is necessary and not sufficient for per-user secrets.",
    "Do not store excluded request bodies.",
    "Test that similar sensitive questions miss.",
    "Scan tool results as well as user text.",
   ],
   questions=[
    {"q": "Which requests must never hit a semantic cache?", "a": "Auth, payments, secrets, OTPs, and any prompt that embeds credentials or session tokens.", "kind": "recall"},
    {"q": "Two users in one tenant ask similar balance questions. What must happen?", "a": "Cache miss (or a key that includes user id and a fresh-data rule). Similarity must not share balances.", "kind": "apply"},
    {"q": "Exclusion is documented but a secret was cached. What failed?", "a": "Enforcement. Put tags/path lists/detectors in the gateway and add a test; delete the stored entries.", "kind": "debug"},
    {"q": "Why scan tool results?", "a": "Tools can return keys or account numbers that then sit in messages and get cached if you only scan the user turn.", "kind": "apply"},
    {"q": "Should you store excluded requests for debugging?", "a": "No. That recreates a secret store. Log ids and hashes only.", "kind": "recall"},
   ],
   links=[
    {"title": "OWASP LLM top 10", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"},
   ],
  ),
  "router-canary-on-evals": entry(
   what="""A **router canary on evals** means you run the suite against the **routed mix** (and against a **shadow of production rules**), not only against each model in isolation. Isolation tells you each brain works. The mix tells you what users will see given the **weights, conditions and failovers** you actually configured.

Do this in CI when rules change, and as a shadow job on a sample of production prompts (where policy allows). Record mix percentages in the report.

A canary that only hits the primary is not a router canary.""",
   why="""On the job, this catches "we only sent 10% but it was the 10% that matter". In interviews, distinguishing isolation vs mix evals is the point of this node.

Mention you need enough cases in each slice or the mix score is noise.""",
   how="""CI: load rule file, send each eval case through the real router (or a replay), assert overall and per-slice scores.

Shadow: copy 5% of prod prompts (allowed data) through candidate rules, compare to live, do not serve.

Example: isolation 90% / 88%. Mix 82% because the rule sent long tickets to the small model. You add a length condition. Mix returns to 89%.""",
   failures="""1. **Isolation only.**

2. **Too few cases per slice.**

3. **Canary that bypasses the router.**

4. **Shadowing regulated prompts** to an unapproved backend.""",
   line="""I eval the routed mix and I shadow rule changes on a sample. Isolation scores are not what users see. If a slice is too small to measure, I do not pretend the mix is validated.""",
   key_points=[
    "Eval the mix and the failover path, not only each model.",
    "Shadow candidate rules on allowed samples.",
    "Need enough cases per slice.",
    "A canary that skips the router proves nothing about rules.",
    "Record mix percentages with the scores.",
    "Do not shadow regulated text to new processors.",
   ],
   questions=[
    {"q": "Why run evals against the routed mix?", "a": "Users see the mix the rules produce, including who gets the small model. Isolation scores hide that.", "kind": "recall"},
    {"q": "How do you canary a rule change safely?", "a": "Shadow allowed prompts through the candidate rules, compare quality and cost to live, then send a small served slice.", "kind": "apply"},
    {"q": "Mix score is noisy. What is wrong?", "a": "A slice has too few cases. Add cases or do not route that slice until you can measure it.", "kind": "debug"},
    {"q": "A 'canary' calls the primary model directly. What did you not test?", "a": "The router: conditions, weights and failover. Wire the canary through the real rule engine.", "kind": "debug"},
    {"q": "What do you print next to a mix score?", "a": "The percentage and conditions of each backend, plus isolation scores for context.", "kind": "apply"},
   ],
   links=[
    {"title": "LiteLLM router", "url": "https://docs.litellm.ai/docs/routing"},
   ],
  ),
  "bypass-plan-for-a-dead-gateway": entry(
   what="""A **bypass plan** is a **signed-off direct-provider path** for when the gateway is dead: config flag or emergency binary that calls the **approved** platform/API with the **same pins and IAM**, documented in the incident runbook, **tested** so dependencies still compile. It is not "someone will write a script at 3 a.m.".

The bypass should be **narrower** than normal (one model, one team) so you do not recreate an ungoverned free-for-all. Virtual keys will be down; use a break-glass role with extra logging.

If policy forbids any path except the gateway, then the bypass is "the product is down" and you invest in gateway HA instead. Write that.""",
   why="""On the job, this is the difference between a 20-minute incident and a 4-hour one. In interviews, "signed-off, tested, narrower, logged" is the mature plan. Mention quarterly drills.

Also mention you disable the bypass after the incident so it does not become the new normal.""",
   how="""Runbook:

1. Declare gateway incident.
2. Flip `DIRECT_PROVIDER=1` on the chat service (or deploy the emergency config).
3. Confirm identity is the prod role, model pin unchanged.
4. Extra logging on; virtual budgets off — watch spend manually.
5. Flip back when gateway is healthy; write the review.

Quarterly: do steps 2–5 in staging.

Example: LiteLLM DNS died. Bypass to Bedrock saved chat. Research stayed down (no bypass). That was the signed trade-off.""",
   failures="""1. **Bypass never compiled** after a refactor.

2. **Bypass uses a laptop key.**

3. **Bypass left on** for a month.

4. **No signature** — security learns during the incident.""",
   line="""I keep a signed-off, tested, narrower direct-provider path for gateway incidents, with extra logging, and I turn it off after. If policy forbids bypass, I say the product will be down and I invest in gateway HA.""",
   key_points=[
    "Bypass is signed, tested, and uses prod identity and pins.",
    "Keep it narrower than normal traffic.",
    "Drill it; refactors break unused paths.",
    "Extra logging; disable after the incident.",
    "If bypass is forbidden, write that downtime is the plan.",
    "Do not invent a script at 3 a.m.",
   ],
   questions=[
    {"q": "What is a bypass plan for a dead gateway?", "a": "A pre-approved, tested way to call an approved provider directly with the same pins and identity, documented in the runbook.", "kind": "recall"},
    {"q": "The bypass import failed during the outage. What was missing?", "a": "A drill. Unused emergency paths rot. Run it in staging on a schedule.", "kind": "debug"},
    {"q": "Why make bypass narrower?", "a": "You lose gateway budgets and routing. Limit who and what can run so spend and data class stay controlled.", "kind": "apply"},
    {"q": "Security refuses any bypass. What do you write?", "a": "That a gateway outage is a full outage, and you invest in HA and faster repair instead.", "kind": "apply"},
    {"q": "What identity does bypass use?", "a": "The production workload role (or a break-glass role with extra logging) — not a human laptop key.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM deploy", "url": "https://docs.litellm.ai/docs/proxy/deploy"},
   ],
  ),
 }
}
