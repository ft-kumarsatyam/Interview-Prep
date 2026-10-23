"""Original extra paragraphs to lift short L11 notes into the 3200–5500 target."""

# Each value is (extra_why, extra_how, extra_fail)

E = {
"m11-2": {
"reading-a-model-catalog": (
"Interviewers will hand you a catalog screenshot and ask which row you would pin. They want region, access state, version pin versus alias, and a retirement date — not a favourite logo.",
"Worked pass on a catalog (illustrative). You filter to `ap-south-1`, GA only, chat+tools. Three rows remain: an Anthropic snapshot with a published EOL, a Nova id with no tools, a Llama host that is gated. You pin the Anthropic snapshot because tools are required, you put the EOL on the inventory, and you evaluate the Llama row as the replacement. You do not pick the alias that says latest. You request access and quota on that exact id in that region before you write the client.",
"4. **Reading the global catalog tab.** The row exists in US and not in the production region. You designed a rewrite.",
),
"calling-a-hosted-model": (
"The interview follow-up is: what comes back besides text? They want usage tokens, a request id, and where that usage lands on the bill.",
"Minimal production call: a workload identity, a regional endpoint, a pinned id, a timeout, and a log line with request id plus input/output tokens. Example: a Cloud Run service assumes a service account, calls `generateContent` on a pinned Gemini id in `asia-south1`, writes usage to the same trace as the user request, and fails closed on 403 (access) versus retrying 429 (quota). A laptop call with your user SSO is a demo, not this call.",
"4. **User credentials in a server.** The app works on your laptop and dies in CI because the role was never granted.",
),
"swapping-models-inside-one-catalog": (
"They will ask what you do *not* change when you swap. Answer: identity, network, bill, and the eval harness. You change the id and you re-score.",
"Same prompt, two pinned ids, one adapter. You run the golden set on both, compare schema validity and the payments slice, and you keep the winner behind the virtual name `support`. Auth headers and the private link stay put. If id B lacks tools, you do not silently drop tools — you either strip them in a reviewed fallback or you refuse the swap.",
"4. **Swapping without the eval.** The new id is cheaper and breaks JSON. Users find it first.",
),
"what-the-platform-does-not-give-you": (
"A common trap question: 'so the platform is the product?' No. Prompt quality, retrieval design, evals and product behaviour stay yours. The platform is plumbing with controls.",
"Write a responsibility split on the ADR: platform owns IAM, network, catalog, quota, the invoke SLA. You own prompts, golden sets, chunking choices, tool contracts, and whether the answer is allowed to ship. Example: Bedrock is green, your citation eval is red. That is your incident, not AWS's. Buying a knowledge base does not move this line.",
"4. **Filing a platform ticket for a bad prompt.** On-call cannot fix a missing few-shot.",
),
"pinning-a-model-version": (
"If you say 'we use Claude' you have not pinned anything. Interviewers want the exact id and what happens when it retires.",
"Config holds `model_id = anthropic.claude-...-v1:0` (example shape) plus the date you pinned it and the eval report hash. CI greps for `latest`, `default`, and empty version suffixes. A quarterly job lists pins that are inside 60 days of a published EOL. You do not rely on memory.",
"4. **Pin in docs, alias in code.** The doc is comforting; production floats.",
),
"catalog-deprecation-watch": (
"They will ask how you hear about retirements. 'We check Twitter' is a fail. Name the feed, the ticket template, and the deputy.",
"Subscribe to the platform's retirement notices; turn each into a ticket with the impact query (which virtual names resolve here), the candidate id, and the eval pack link. Example: a 45-day notice lands, the deputy runs the pack on the already-warm candidate, you dual-run a week, you flip. Starting the eval on day 40 is how you page through a weekend.",
"4. **One subscriber who is on leave.** Notices go to a personal inbox.",
),
"converse-versus-native-passthrough": (
"The unified API is a dialect. When they ask when you break out of it, say: a feature the unified body cannot express (a document API, a vendor tool format) that you accepted as lock-in.",
"Default to the unified converse/chat shape so adapters stay thin. When a flow needs a native field, call it through a named escape hatch and list it on the lock-in inventory. Example: you need a vendor-specific citation block. Unified drops it. You passthrough that one route, you contract-test it, and you do not let the rest of the app import the native client.",
"4. **Passthrough everywhere 'just in case'.** You threw away the unified benefit.",
),
"one-call-on-three-platforms": (
"They may ask you to sketch the same chat call on Bedrock, Vertex and Foundry. They want identity and region knobs, not SDK trivia.",
"Same messages array. Bedrock: regional endpoint, IAM sigv4, model id ARN or inference profile. Vertex: project, location, service account, `generateContent`. Foundry: Azure AD token, resource+deployment name (the deployment is the pin). You write those knobs on a card. The prompt file does not change. If you cannot fill the card, you do not 'know the platform'.",
"4. **Treating deployment name as optional on Azure.** The deployment *is* the model pin.",
),
},
"m11-3": {
"cloud-identity-instead-of-api-keys": (
"Interviewers treat a long-lived API key in an env var as a junior smell on a managed platform. Say role, service account, or workload identity, scoped to invoke.",
"A pod uses Workload Identity / IRSA / managed identity to assume a role that can invoke two named model ARNs in one region. No key in Secrets Manager for that path. Rotation is the cloud's credential process, not a file you forgot. Example: you delete the old OpenAI key from the production service the day the Bedrock role goes live, and you alert if that key is used again.",
"4. **A platform role plus a leftover public key 'for emergencies'.** It will be used.",
),
"least-privilege-for-model-access": (
"They will ask how you stop a batch job from calling the expensive id. Answer: the role cannot.",
"Split roles: `app-support` may invoke the cheap pinned id; `app-research` may invoke the large id in a non-prod account; nobody gets `*`. Example: a worker that only embeds should not have `InvokeModel` on chat ids. A confused loop cannot escalate the bill through IAM if the action is missing.",
"4. **One shared role for the whole namespace.** Every job can call every model.",
),
"auditing-who-invoked-what": (
"Regulated interviewers want the trail: which workload identity, which model, when, not 'we have CloudTrail somewhere'.",
"Turn on invocation logs in the platform and in your gateway. Each line: principal, model id, request id, token counts, not the raw prompt if policy forbids it. Quarterly: pick five requests and walk them to a human-owned service. If you cannot, the trail is decoration.",
"4. **Logs in a personal account.** The auditor will not accept your laptop.",
),
"private-connectivity-no-public-egress": (
"They will ask what private connectivity buys and costs. Buy: no public internet path. Cost: a new failure domain and a ticket to networking.",
"You attach PrivateLink / PSC / private endpoint, you deny public egress from the app subnet, and you test a break: disable the endpoint in staging and confirm the app fails closed rather than falling out to 0.0.0.0/0. Example: a well-meaning NAT 'fix' during an outage is a policy breach, not a mitigation, unless a written exception exists.",
"4. **Private link plus an open NAT 'just for pip'.** Prompts can leave too.",
),
"tenant-isolation-on-shared-infrastructure": (
"SaaS interviewers want to know how tenant B cannot see tenant A's prompts or chunks. IAM plus retrieval filters plus keys, not hope.",
"Separate projects or accounts when the contract says so; otherwise: per-tenant credentials, per-tenant encryption keys, retrieval filters that are tested with a leak suite, and logs that cannot be queried across tenants by a support role. Example: you run a monthly job that asks tenant A's identity for tenant B's doc ids and asserts zero hits.",
"4. **One index, tenant id in metadata you forgot to filter.**",
),
"encryption-customer-managed-keys": (
"CMK is not a checkbox. They want: who can use the key, what happens on disable, and whether prompts at rest are in scope.",
"You create a CMK in the allowed region, you grant only the platform service and the break-glass role, you encrypt the KB and the log bucket with it, and you drill a disable: in-flight calls should fail predictably, and you have a restore step. Example: disabling the key for a 10-minute drill showed a 5-minute tail of successes from cache — you documented that tail.",
"4. **Platform-managed key you thought was CMK.** The console wording fooled you.",
),
"workload-identity-for-a-worker": (
"Walk a job or a pod: no key file, a role that can invoke only the named models it needs, in one region.",
"A nightly eval job assumes `role/eval-runner` with `InvokeModel` on two ids. It cannot write to the KB and cannot call the public internet. You prove it by attempting both in CI and expecting deny. The role is bound to the job's service account, not to a human.",
"4. **Reusing the app role for the batch job.** The job inherited chat invoke and a wider network.",
),
"cross-tenant-prompt-leak-tests": (
"They want a test, not a diagram. How do you prove retrieval and logs cannot return another tenant's text?",
"A scheduled suite: identity A asks for strings unique to tenant B's corpus and to B's traces. Assert empty. Include embeddings-nearest-neighbour, not only keyword. Example: you found a leak through a shared debug bucket that stored raw prompts without a tenant prefix. The model path was fine; the log path was not.",
"4. **Testing only the retrieve API and ignoring traces and eval dumps.**",
),
"key-rotation-without-downtime": (
"CMK rotation should not drop in-flight calls. They will ask how you know.",
"Use the platform's rotation or a dual-key window: new key issued, grants copied, re-encrypt or re-wrap, old key retired after a TTL. You load-test through the window. Example: a naive disable-old-then-enable-new produced 90 seconds of 500s. Dual-grant first, then retire.",
"4. **Rotating by deleting the old key immediately.**",
),
"private-link-failure-mode": (
"What happens when the private endpoint is down? Is a public fallback allowed? The answer is usually no.",
"Write it: endpoint down → fail closed, page networking, do not open 443 to the public model endpoint. If a written exception exists, it has an expiry and a data-class limit. You drill it in staging so the 'fix' is not an engineer adding a NAT under pressure.",
"4. **An undocumented fallback** that already exists in a sidecar.",
),
},
"m11-4": {
"models-exist-per-region": (
"The production region decides the catalog. Designing on a US-only preview is a rewrite, not a plan.",
"Order: policy regions → catalog in that region → access+quota there → then code. Example: you prototyped on a US Anthropic id; `ap-south-1` has a different snapshot and no provisioned throughput. You re-eval the India id and you do not enable a US inference profile 'temporarily' without an exception.",
"4. **Console defaulted to us-east-1** and you never noticed.",
),
"data-residency-localization": (
"Region on invoke is necessary and not sufficient. Prompts, completions, embeddings, indexes, traces and eval dumps all have a geography.",
"Draw the data-flow table. Example: inference in Mumbai, traces in a US SaaS, eval dumps on a laptop. Two of those fail an Indian insurer. You move traces in-account and you stop mailing JSONL. Localization rules sit above the cloud brochure.",
"4. **Assuming support staff cannot pull logs abroad.** Read the support path.",
),
"retention-training-terms-in-writing": (
"Verbal 'we don't train on your data' is not evidence. They want a clause and a console setting.",
"Keep a folder: contract clause, screenshot of the no-training / zero-retention toggle, date, and who signed. Recheck after a SKU change. Example: a default log retention of 30 days violated a 7-day policy; you shortened it and you proved the old objects died.",
"4. **A marketing page saved as the control.**",
),
"connecting-back-to-governance": (
"Level 8 named residency, deletion and third-party processing. Level 11 is where those controls become settings.",
"Map each Level 8 requirement to a platform knob and an owner. Example: deletion SLA → how you purge traces and KB chunks; subprocessor list → the model host and the eval SaaS. If a knob does not exist, that is a governance gap, not an ops nit.",
"4. **Governance as a slide** that never reached the account.",
),
"when-your-model-is-not-in-your-region": (
"Legal moves: another in-region model, self-host in-region, or a written exception with expiry. Silent cross-region is not a move.",
"You eval two in-region alternatives on the golden set. If both miss the bar, you write an exception: geos, compensating controls, expiry, who signs. Example: a bank refuses the exception; you ship a smaller in-region model and you tell sales the quality number.",
"4. **A 'temporary' US path** still on after six months.",
),
"prompt-and-log-residency": (
"Where inference runs is not where logs live. Ask both.",
"Confirm store regions for prompts, completions, traces, online eval, and support exports. Example: inference in `eu-west-1`, traces in a US vendor. You fail the review until traces move or the vendor offers an EU tenant you have evidence for.",
"4. **Debug copies in Slack.** Slack is a location.",
),
"cross-region-inference-exceptions": (
"If you must leave region, write the exception, the compensating control, and the expiry. Treat it as debt.",
"Template: reason, geos traversed, data classes, who signed, expiry date, compensating controls (minimise fields, encrypt, tighter retention), and the in-region replacement you are waiting on. Example: 90-day exception for a US-only tool-calling id; you eval the in-region successor monthly.",
"4. **Exception with no expiry.** Debt became architecture.",
),
"training-opt-out-evidence": (
"Keep the clause and the console setting that prove prompts are not used to train. Recheck after contract renewals.",
"A folder in the compliance drive: PDF clause, screenshot of the toggle, API response that echoes the policy if one exists, date. Example: a new SKU reset the toggle to default; your quarterly check caught it before an audit.",
"4. **Trusting the default** after a catalog redesign.",
),
"sector-overlay-for-finance-or-health": (
"Banks and hospitals add logging, residency and access rules on top of the cloud's baseline. Name them.",
"Finance: stronger audit, stricter subprocessors, often in-country processing. Health: patient text as a special class, minimum necessary, tighter retention. Example: a hospital forbids eval SaaS that stores prompts; you run judges in-account. A bank forbids public APIs even with redaction.",
"4. **Applying a generic 'enterprise' profile** to a hospital.",
),
},
"m11-5": {
"on-demand-vs-provisioned-throughput": (
"On-demand is pay-per-token with bursty limits. Provisioned/reserved buys a rate and often a discount, and you pay for idle. Interviews want the utilisation story.",
"Compute a break-even: daily tokens × on-demand $ versus reserved $ / day. Example: on-demand $0.003 / 1k tokens (illustrative) versus a reserved unit that includes 2M tokens/day. You cross over only if you actually consume most of that unit. A spiky chatbot stays on-demand; a 24/7 classifier reserves.",
"4. **Reserving for a demo week** and paying for the next eleven idle weeks.",
),
"reading-the-quota-model": (
"RPM, TPM, concurrency, per-model, per-region. You will hit one first. Know which.",
"For long-context jobs TPM dies first; for chatty agents RPM or concurrency dies first. Example: 8k-token docs at 20 RPM is tiny RPM and huge TPM. You request a TPM raise, not more RPM. You read the quota page in the production region, not the blog.",
"4. **Assuming US quotas apply in Mumbai.**",
),
"planning-for-burst-traffic": (
"The platform will not absorb a campaign spike. Queue, backpressure, batch.",
"Put a queue in front of invoke, return 'working on it' above a depth, and send offline jobs to a batch endpoint. Example: a 9am report blast is 20× noon. Without a queue, retries stampede and everyone 429s. With a queue, p95 wait is visible and the campaign does not kill interactive chat.",
"4. **Client retries with no jitter** against a hot limit.",
),
"defending-a-quota-increase": (
"Quota is an approval, not a slider. Bring traffic evidence.",
"Ticket: last 14 days of RPM/TPM, the burst you expect, the model ids, the region, and what fails if denied. Example: you attach a Grafana screenshot and a launch date. 'We might need more' gets a no.",
"4. **Asking for 10× with no graph.**",
),
"cost-per-request-end-to-end": (
"Input tokens, output tokens, retrieval calls, rerank, guardrails, logging — all in. Per successful task, not per invoke.",
"Write a formula in the ADR and fill it from traces. Example: a RAG answer is 1.2k in + 400 out + 1 embed + 1 rerank + 1 guardrail. The model line is 60% of the $; retrieval is the rest. A 'cheaper model' that needs two retries loses.",
"4. **Comparing model SKUs only.**",
),
"attributing-spend-per-team-or-tenant": (
"A shared key cannot charge back. Tags, projects, virtual keys, or separate accounts can.",
"Tag every invoke with team and tenant; export to the bill. Example: the data-science sandbox was 40% of the bill and nobody knew. After tags, they get a budget. A shared API key would have hidden it forever.",
"4. **One key in a sidecar used by five teams.**",
),
"budgets-runaway-cost-alerts": (
"An agent loop should die on a budget, not on the invoice. Alerts need an owner and a disable-switch.",
"Set a daily $ cap per virtual key and a page at 70%. Example: a tool-calling loop burned 200k tokens in 12 minutes; the cap stopped it. The page went to the feature owner, not to an unused channel.",
"4. **A budget with no page** and a cap that only emails a dead list.",
),
"which-pricing-model-wins-at-your-volume": (
"Recompute at your tokens/day, not the pricing-page example. Include reserved idle.",
"Spreadsheet: on-demand, reserved, self-host GPU hour, at 0.2× / 1× / 10× current volume. Example: you are on-demand today; at 10× a reserved unit wins; self-host still loses because you have no GPU on-call. Revisit quarterly.",
"4. **A GPU quote from a friend** with no utilisation.",
),
"tokens-per-minute-versus-requests-per-minute": (
"Long-context hits TPM; chatty agents hit RPM. Know which graph to watch.",
"Dashboard both. Example: a summariser of 40-page PDFs 429s with RPM at 10% and TPM at 99%. You buy TPM. A tool-loop agent 429s with tiny tokens and RPM at the ceiling. You queue and you cache.",
"4. **Raising the wrong quota** and waiting a week.",
),
"provisioned-throughput-break-even": (
"Daily tokens where reserved beats on-demand is a number you can compute. Bring it.",
"Break-even ≈ reserved_daily_$ / on_demand_$_per_token. Then apply a utilisation haircut (illustrative 70%). Example: you only beat on-demand if you actually burn most of the reserved tokens. A seasonal app should not reserve year-round.",
"4. **Reserving for peak and paying for the year.**",
),
"queue-depth-as-a-product-signal": (
"Expose wait to the client. Hidden retries stampede the quota and look like slowness.",
"Return a 202 + position, or a message 'high load, try in 20s'. Example: during a launch you showed queue wait; complaints dropped versus silent 30s hangs. Interactive and batch use different queues so a report job cannot sit in front of a user.",
"4. **Unlimited client retries** with no visible wait.",
),
"cost-anomaly-playbook": (
"Spend doubled overnight. First three checks: loop, cache miss, model swap.",
"Playbook: (1) traces for repeated tool/agent loops, (2) cache hit rate cliff, (3) whether an alias floated to a pricier id. Example: a 'latest' alias moved to a thinking model 8× the output tokens. You pin and you recover. A loop without a step cap is the other classic.",
"4. **Waiting for finance** to notice at month end.",
),
},
"m11-6": {
"the-open-weight-hosting-ladder": (
"Hub → serverless tokens → GPU compute platform → your cluster. Name the rung and who operates the GPU.",
"Pick from the constraint. No GPU skills, bursty: serverless. Need custom vLLM flags: compute platform you still own the image on. Data cannot leave: your VPC. Example: Llama-8B classifier at 20M tokens/day stays serverless until utilisation makes an L4 cheaper *and* you hire the pager.",
"4. **Calling a host 'self-host'** because the weights are open.",
),
"model-hubs-checkpoint-trust": (
"Read the card: licence, gated access, who uploaded, eval claims. A random fine-tune is not a base.",
"Checklist: licence allows your use, you passed the gate legally, the uploader is the lab or a named org, you hash the files you downloaded. Example: you almost shipped a 'Llama' that was an unknown merge with a non-commercial clause. Legal wants the card, not the filename.",
"4. **Trusting a converted GGUF** with no source hash.",
),
"serverless-inference-providers": (
"Together, Fireworks, Groq, Replicate and peers: per token, no GPU, often OpenAI-compatible. Still a vendor review.",
"Pin the slug, eval that slug, read the terms. Example: the same card name is 8-bit on host A and 4-bit on host B. Scores differ. You pin A, you watch for silent slug changes, and you do not treat this as in-boundary.",
"4. **Assuming OpenAI-compatible means behaviour-compatible.**",
),
"gpu-compute-platforms": (
"Modal, Baseten, RunPod and peers schedule GPUs; you bring the serve image. You own vLLM flags; they own the metal.",
"Use when you need a custom engine or a model a serverless catalog lacks. Example: you run vLLM with your template on a rented L40. Cold start is your image pull. You still do not own the data centre — read the region and the terms.",
"4. **A notebook on a rented GPU** called 'production serving'.",
),
"serving-it-yourself-with-vllm": (
"Continuous batching and KV-cache reuse are why a naive request loop wastes the GPU. Interviews want those two phrases.",
"One vLLM process, many in-flight requests, prefix cache when prompts share a prefix. Example: 32 concurrent 2k-token chats on one GPU stay in SLO; a for-loop of sequential generates would look like the GPU is 'slow'. You set max context from memory math, not from hope.",
"4. **One generate() per process** and wondering why utilisation is 15%.",
),
"per-token-vs-per-gpu-hour": (
"Find the utilisation point where a rented GPU beats per-token. Below it, tokens win.",
"Illustrative: GPU $2/hour, host $0.10 / 1M tokens. You need enough tokens/hour that 0.10×tokens > 2, plus idle waste. A 24/7 classifier may cross; a weekday chatbot may not. Recompute with your numbers.",
"4. **Buying a GPU for a spike** and leaving it up.",
),
"cold-starts-scale-to-zero": (
"Scale-to-zero is cheap at idle and slow on the first request. Put that in the SLO or do not scale to zero.",
"Measure cold p95 (image + model load). Example: 18s cold, 400ms hot. Interactive chat cannot scale to zero; a nightly batch can. A keep-warm of one replica is a budget line, not a surprise.",
"4. **Promising 500ms p95** on a scale-to-zero endpoint.",
),
"sizing-hardware-for-a-model": (
"Memory is weights plus KV-cache. KV grows with layers, heads, context, batch, precision.",
"Rough: weights ≈ params × bytes/param; KV ≈ layers × kv_heads × 2 × dim × seq × batch × bytes. Example: 8B 16-bit is ~16GB weights; long context + batch 8 blows a 24GB card via KV. You drop batch, quantise, or buy more RAM — you do not 'just try 32k'.",
"4. **Sizing from parameter count alone.**",
),
"what-hosting-open-weights-buys": (
"Predictable cost at volume, data that can stay in-boundary, version control — in exchange for ops, quality, and patches.",
"Say the return and the bill in the same sentence. Example: you host an 8B classifier in-VPC because volume is high and data cannot leave. You accepted on-call and a worse score than a frontier API. You did not host a 70B 'to be open' with two engineers.",
"4. **Hosting for ideology** with no volume or boundary reason.",
),
"open-vs-closed-on-your-own-task": (
"Eval both on your set. Do not assume either wins.",
"Same fifty items, same judge, cost and p95 included. Example: closed model 92% at $0.04/task; open 8B 88% at $0.004 and in-VPC. You pick from the gate, not from Twitter. A week later a new closed id arrives; you re-run, you do not flip on a blog.",
"4. **A leaderboard as the decision.**",
),
"licence-and-gating-checks": (
"Licence, acceptable use, and gated access — before you ship, not after the demo.",
"Legal reads the card. You record the licence, the gate approval, and the date. Example: a research-only clause blocks customer-facing use. A missed gate scrape is a ToS problem. You do not 'just download it'.",
"4. **Shipping a gated model** under a shared hub token that is not yours.",
),
"kv-cache-memory-math": (
"Estimate KV bytes before you pick a GPU. Interviews like a back-of-envelope.",
"Walk the formula out loud with one example: 32 layers, 8 kv heads, 128 dim, 8k context, batch 4, fp16 → you show it does not fit 24GB with the weights. Then you say what you would drop (context, batch, or precision).",
"4. **Discovering OOM in production** as the sizing method.",
),
"quantization-versus-quality-on-your-eval": (
"8-bit and 4-bit versus the same held-out set, not a blog perplexity.",
"Run bf16 (or the host default), 8-bit, 4-bit on the golden set and the schema probe. Example: 4-bit drops schema 5 points; 8-bit holds. You ship 8-bit. A sales laptop with 4-bit is a different product — retract it.",
"4. **Quantising after eval** and skipping a second eval.",
),
"serving-slo-for-a-self-hosted-model": (
"p95 and error budget like any API. Self-host is not exempt.",
"Write SLO: p95 < X at Y concurrency, error budget 0.1%/week, owner. Example: you page on SLO burn, not on GPU util alone. A quiet GPU that 500s is an incident. You do not hide behind 'it's our metal'.",
"4. **No SLO because it is in-house.**",
),
},
"m11-7": {
"one-endpoint-many-providers": (
"One endpoint, credentials inside, one request format, many backends. Log the resolved id.",
"App calls `/v1/chat/completions` on the gateway. The gateway maps `support-small` to a real id and writes both names on the span. Example: Tuesday's incident is undebuggable if you only stored the virtual name. Hiding the vendor from the app is not hiding it from ops.",
"4. **A lottery behind one virtual name** with no resolved-id log.",
),
"hosted-routers-vs-self-hosted-proxies": (
"OpenRouter/Portkey versus LiteLLM versus cloud-native routing. Compare boundary, features, and who pages the hop.",
"If prompts cannot leave, a hosted router may be ineligible. If you need the hop in-VPC, LiteLLM or the cloud's own router. Example: you run LiteLLM in-account for a bank; you use a hosted router for an internal prototype. They are not interchangeable.",
"4. **A hosted router on regulated traffic** because the SDK was easy.",
),
"routing-rules-automatic-failover": (
"Route by task, cost, context, latency, region, risk. Fail over on error and throttle — not on vibes.",
"Rules in config: long context → id L; cheap classify → id S; regulated → in-region only. Failover list per rule. Example: S 429s, you fail to S2 that still has the same tool schema. You do not fail a tool-using request to a model that cannot call tools.",
"4. **Failover to a model that drops tools.**",
),
"virtual-keys-budgets-quotas": (
"Virtual keys per team or feature stop one client from eating the shared quota.",
"Issue `vk_support` and `vk_research` with $ and RPM caps. Example: research cannot starve support. A leaked virtual key is scoped. You still do not put the upstream provider key in the app.",
"4. **One virtual key for the company.**",
),
"one-view-of-usage-and-cost": (
"One dashboard across providers beats three exported CSVs.",
"Gateway metrics: tokens, $, latency, errors, resolved model. Example: you spot a 3× cost cliff the night an alias floated. Without a unified view you would have seen it on the invoice.",
"4. **Three vendor consoles** and a monthly surprise.",
),
"the-router-is-on-the-critical-path": (
"You added a hop. It needs an SLO, timeouts, and a bypass plan.",
"The gateway has its own error budget. Example: gateway down, you flip to a signed-off direct path. If there is no bypass, you accepted a new single point of failure — write that down.",
"4. **A gateway with no owner** and a 30s timeout that stacks on the model timeout.",
),
"differences-a-router-cannot-hide": (
"Tool formats, structured output, context limits, and prompt behaviour still differ. The hop is not a translator for quality.",
"Contract-test each backend for tools and JSON. Example: model B ignores your schema; the gateway cannot invent it. You either adapt the prompt per backend or you do not route that task there.",
"4. **Assuming one prompt is one behaviour.**",
),
"caching-at-the-gateway": (
"Exact and semantic caches need an exclusion list. Auth, payments, and anything with a secret never cache.",
"Cache GET-like asks with a TTL; never cache requests that embed tokens, account ids, or 'my last transfer'. Example: a semantic cache returned another user's balance because the questions were close. You now exclude anything that passed through the payments tool.",
"4. **Semantic cache on all traffic** because hit rate looked pretty.",
),
"when-a-router-earns-its-place": (
"Several providers, several teams, or spend worth governing. One provider and one team: a client library is enough.",
"Write the driver. Example: three teams and two providers — a gateway earns the hop. One startup, one API — LiteLLM is extra latency. Add it when the second team arrives, not before.",
"4. **A gateway for a single key** because a blog said so.",
),
"routing-changes-who-answers": (
"A rule change swaps the model without a code change. Evals must follow the mix, not only each model alone.",
"Any routing PR runs the eval on the **resolved mix** (shadow or offline replay). Example: you added a cheap fallback; the mix score dropped 4 points though each model was fine alone. You roll the rule back.",
"4. **Evaluating models in isolation** and never the routed blend.",
),
"failover-that-preserves-tools": (
"A fallback that cannot take the same tool schema is not a fallback for that request. Strip tools on purpose or skip that backup.",
"Test: kill provider A, send a tool-using prompt, assert B either executes the same tools or the gateway strips tools and marks the response as degraded. Example: a silent strip produced confident text with no lookup — worse than an error.",
"4. **A backup that only does chat.**",
),
"semantic-cache-exclusion-list": (
"Never cache auth, payments, or a request that embeds a secret. Write the list.",
"List in config: path prefixes, tool names, PII detectors. Example: `/pay/*`, `get_balance`, anything with `Authorization` in the prompt. A review adds to the list; a cache engineer cannot remove without two-person review.",
"4. **An allow-all cache** with a comment 'TODO exclude later'.",
),
"router-canary-on-evals": (
"Run the suite against the routed mix. Isolation scores are necessary and not sufficient.",
"Replay last week's traces through the new rules offline, plus the golden set. Example: mix p95 and mix quality both in the ticket. You do not ship a rule that only has per-model notebooks attached.",
"4. **Canarying a rule** with no mix eval.",
),
"bypass-plan-for-a-dead-gateway": (
"A signed-off direct-provider path for incidents. Practise it.",
"Runbook: disable gateway DNS or flip a flag to adapter-direct, with the same pins and IAM. Example: you drill quarterly. A bypass that needs a new key in a panic will use the wrong account.",
"4. **A bypass that is a public API** on regulated traffic.",
),
},
}


def extras_for(node: str, key: str) -> tuple[str, str, str]:
    row = E.get(node, {}).get(key)
    if not row:
        return "", "", ""
    return row
