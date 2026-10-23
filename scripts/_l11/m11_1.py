from assemble import entry

NOTES = {
 "m11-1": {
  "three-ways-to-consume-a-model": entry(
   what="""There are three honest ways to get a language model into a product. The first is a **provider public API**: you call the lab's own endpoint with an API key, usually from a laptop in an afternoon. The second is a **managed platform inside your cloud account** — Amazon Bedrock, Vertex AI, Azure AI Foundry — where the same or similar models run under your existing identity, network, region and bill. The third is **open weights** that you host yourself or buy as a hosted inference endpoint. These are paths, not brands. A single company often uses all three: the public API for a prototype, the managed platform for the regulated production lane, and an open-weight model for a high-volume classifier that does not need a frontier brain.

The public API is a contract with a new vendor. Prompts leave your cloud boundary unless the vendor offers a private link you have actually enabled. The managed platform is a contract you already have with a cloud you already run. Open weights are a checkpoint plus a serving stack; the checkpoint can live on a GPU you rent, on a serverless inference host, or on a box under your desk. "Open" here means the weights are downloadable under a licence, not that the training data or the serving configuration is yours.

What you are choosing is not a logo. You are choosing who sees the prompt, who bills the token, who pages when the model is down, and how quickly a new model id appears in your catalog.""",
   why="""On the job this decision lands before architecture. A bank, hospital or government buyer will often refuse a public API even when the model quality is better. A four-person startup will refuse a three-month Bedrock enablement when the only user is the founder. Getting the path wrong wastes a quarter: you build on the public API, win a regulated customer, and then rewrite identity, networking and logging to move the same prompt onto a platform.

In interviews this is the Level 11 opener. Interviewers at enterprises and IT services firms treat Bedrock / Azure OpenAI / Vertex experience as a filter. They will ask you to name the three paths and the axes you compare, not to pick a winner. The senior answer is: classify the data, then pick the least-operations path that satisfies the constraint. Naming a favourite vendor without those axes sounds like a tutorial, not an engineer.

The interview trap is treating "we use OpenAI" as an architecture. That is a path. The architecture is how you keep prompts, evals and application code portable while that path changes.""",
   how="""Write the three paths as a table you can fill in thirty minutes, not a slide.

Example: a support-answer service for an Indian insurer. Data class is claims text (regulated). Region must stay in India. Two backend engineers, no GPU on-call. You score:

- Public API: newest models, one-day start, but prompts leave the country and there is no existing DPA. Fail.
- Managed platform: models exist in `ap-south-1` / `asia-south1` with a lag, IAM already in the AWS account, private link available. Pass.
- Self-host 70B: data never leaves, but you would staff GPU ops you do not have. Fail for now.

You ship on Bedrock (or Vertex, or Foundry) with a thin wrapper around the invoke call. You keep the public API in a scratch project for prompt experiments that never see claims text. You revisit self-hosting when token volume makes the GPU hour cheaper and you can hire the person who pages it.

The same prompt, the same eval set, and the same application code should move between those paths. The path is plumbing.""",
   failures="""1. **Picking a path from a blog.** "Everyone uses the public API" is not a data-classification decision. A prototype that later sees PAN numbers or medical notes becomes a compliance incident.

2. **Treating open weights as a third vendor API.** If you call Together or Groq you are still sending prompts to someone else. Open weights without a boundary still leave the building.

3. **One path for the whole company.** A marketing copywriter and a claims copilot have different data classes. Forcing both onto the most restrictive path inflates cost and delays; forcing both onto the loosest path fails the audit.

4. **No owner for the decision.** If product picked the API and security never signed it, the rewrite arrives the week a customer questionnaire does.""",
   line="""Three paths: public API, managed platform in your cloud, open weights you host or buy. I classify the data first, then pick the least-ops path that clears identity, region and contract. Most real systems mix paths; the prompt and the evals stay mine.""",
   key_points=[
    "Three paths: public API, managed cloud platform, open weights hosted or bought.",
    "You are choosing who sees the prompt, who bills, who pages, and how fast new models arrive.",
    "Classify data first; then pick the least-operations path that satisfies the constraint.",
    "Open weights are not automatically private — hosted inference still leaves your account.",
    "Mixed fleets are normal; one path per workload, not one path per company.",
    "Keep prompts, evals and application code portable across paths.",
   ],
   questions=[
    {"q": "Name the three ways to consume a model and the main thing each optimises for.", "a": "Public API: speed to newest models and lowest ops. Managed platform: cloud identity, private networking, residency and a bill you already have. Open weights: control of data, versions and cost shape, in exchange for serving work.", "kind": "recall"},
    {"q": "A startup prototypes on a public API, then lands a bank. What changes and what stays?", "a": "The regulated workload moves to a managed platform or in-boundary hosting. You keep the prompt, the eval suite and the application interface. You drop the API key from that path, add IAM, region and retention evidence, and keep the public API for non-regulated experiments.", "kind": "apply"},
    {"q": "A team says they are 'on open weights' because they call a serverless host. What did they miss?", "a": "They still send prompts to a third party. Open weights without operating (or privately linking) the host do not give them data-boundary control. Ask where the request lands, what the terms say, and whether that host is an approved processor.", "kind": "debug"},
    {"q": "Why is 'we use Vendor X' a weak architecture answer?", "a": "A vendor is a path, not a design. The design is data class, identity, region, capacity, evals and an exit. Interviewers want the axes and the mix, not a logo.", "kind": "recall"},
    {"q": "When would you run all three paths in one company?", "a": "Public API for unregulated prototypes, managed platform for production that must stay in-account, open-weight hosting for a high-volume simple task where GPU hours beat per-token price. Each path has its own data class and owner.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock user guide", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html"},
    {"title": "Vertex AI generative AI overview", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview"},
    {"title": "Azure AI Foundry overview", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry"},
   ],
  ),
  "open-weights-without-running-gpus": entry(
   what="""Open-weight models used to imply a GPU you operated. That is no longer true. A ladder sits between "download the checkpoint" and "call a closed API". **Serverless inference providers** (Together, Fireworks, Groq, Replicate and others) serve popular open models behind a per-token API, often OpenAI-compatible. **Managed cloud catalogs** list some of the same models next to closed ones, billed through your cloud account. **Dedicated hosted endpoints** reserve a GPU for you without handing you the driver. Only the last rung is your own cluster.

You keep the properties that matter to many teams: you can swap the checkpoint, you can often fine-tune, you are not locked to one lab's closed id, and the price per token can be lower. You skip kernel tuning, continuous batching and on-call for CUDA. You do **not** automatically get privacy, a particular licence, or bit-identical outputs to the reference run.

"Open weights" is not "open source". The licence may bar commercial use, require share-alike, or restrict specific industries. The host may quantise to 8-bit or 4-bit, change the chat template, or cap context. Quality is a property of the **endpoint you actually call**, not of the model card.""",
   why="""On the job this is how most teams first touch Llama, Qwen, Mistral or Gemma without buying a GPU fleet. It is also how they get surprised: legal finds a non-commercial clause the week before launch, or eval scores drop 8 points versus the lab run because the host serves a quantised variant.

In interviews, "we will just self-host Llama" is a junior line. The senior line is: name the rung of the ladder, say who operates the GPU, and say how you will pin and evaluate that exact serving. Interviewers want to know you will not confuse a downloadable checkpoint with a compliant, quality-matched deployment.

This also changes procurement. Buying tokens from an inference host is a vendor review. Buying GPU hours from a compute platform is a different review. Downloading weights into your VPC is a third. Treat them as different paths even when the model name on the card is the same.""",
   how="""Pick a 8B instruction model you already have an eval for. Run the same fifty cases in three places:

1. Your laptop with the reference chat template (quality baseline, not a prod plan).
2. A serverless host's OpenAI-compatible endpoint, recording the exact model slug they publish.
3. The same model id in your cloud catalog if it exists.

Compare exact-match or judge scores, p95 latency, and cost per successful task. If (2) or (3) drops quality, read the host's page for quantisation, context cap and template. Pin that slug. Do not assume `meta-llama/Llama-3.1-8B-Instruct` on host A equals the same string on host B.

Example: a classification job at 20 million tokens/day. The serverless host is $0.10 / M tokens; a dedicated L4 would be cheaper only above a utilisation you do not have yet. You stay on the host, pin the slug, and add a monthly eval against the reference so a silent quantisation change is visible.""",
   failures="""1. **Licence last.** Shipping a gated or non-commercial checkpoint into a customer-facing app. Legal should see the card before you build the feature, not after the demo.

2. **Evaluating the card, serving the host.** Your notebook used bf16; production used 4-bit with a different template. Users see the production endpoint. So should your eval.

3. **Assuming privacy.** A serverless host is another processor. If the constraint was "data never leaves our account", you chose the wrong rung.

4. **No pin.** The host's `latest` alias moves. Your traces must record the slug you called.""",
   line="""Open weights no longer mean I operate GPUs. I can buy per-token serving, a catalog listing, or a dedicated box. I still check the licence, pin the host's exact slug, and re-run my eval on that endpoint because quantisation and templates change the model I actually get.""",
   key_points=[
    "Open weights can be consumed per token, via a cloud catalog, or on dedicated GPUs.",
    "A hosted open model is still a third-party processor unless it runs in your account.",
    "Licences are not all permissive; read the card before you ship.",
    "Hosts may quantise or change the chat template — evaluate the real endpoint.",
    "Pin the host slug; do not assume two listings with the same card name match.",
    "Compare cost per successful task, not the marketing price per million tokens.",
   ],
   questions=[
    {"q": "How can a team use open-weight models without operating GPUs?", "a": "Call a serverless inference provider, use an open model listed in a managed cloud catalog, or rent a dedicated hosted endpoint. The host runs the GPU; you still own licence, pin and eval.", "kind": "recall"},
    {"q": "The same open model scores lower on a cheap host than in your lab. What do you check?", "a": "Quantisation, chat template, context truncation, sampling defaults and whether the slug is the same checkpoint. Re-run the eval against that endpoint and pin the variant that passed.", "kind": "debug"},
    {"q": "When is a serverless open-weight host the wrong choice despite a good price?", "a": "When data must stay in your account or country and that host is not an approved in-boundary processor, or when the licence forbids your use. Price does not override those constraints.", "kind": "apply"},
    {"q": "Why is 'open weights' not the same as 'open source'?", "a": "You may get weights without training data, without a permissive licence, and without the serving recipe. Use, modification and redistribution can still be restricted.", "kind": "recall"},
    {"q": "You need Llama in a VPC with no public egress. Which rung of the ladder?", "a": "A catalog listing inside your cloud account, or weights you serve yourself (or on a compute platform) inside the VPC. A public serverless host fails the egress rule.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "Hugging Face gated models", "url": "https://huggingface.co/docs/hub/en/models-gated"},
   ],
  ),
  "why-regulated-teams-cannot-use-a-public-api": entry(
   what="""Regulated teams in health, finance, government, insurance and defence often cannot send prompts to a public model API even when the vendor is well known. The blockers are policy, not taste. Typical rules: data may only go to **approved processors** with a signed data-processing agreement; data must stay in a **named country or region**; traffic must not traverse the **public internet**; every call must be attributable to a **workload identity** inside the company's account; prompts and completions must not be **retained or used to train** except as written in the contract.

A public API fails several of those at once. The endpoint is on the public internet. The vendor is a new processor. Logging and retention live in the vendor's estate. Identity is an API key, not a cloud role. Even a "zero retention" blog post is not an approved control until it is a dated clause and a console setting you can show.

A managed platform inside the existing cloud agreement often clears the same list because the company already has the contract, the private network, the audit trail and the region. That is not automatic. You still configure logging, keys, regions and retention. The platform is a place where those controls exist, not a stamp that they are on.""",
   why="""On the job this constraint decides architecture before quality does. You will lose time arguing about GPT versus Claude when the real question is "may this text leave the account". Security and legal will not waive residency because a model is smarter. Your job is to ask the data-classification question first and design inside it.

In interviews, especially at enterprises and IT services firms, this is a filter question. The weak answer is "we would never use a public API". The strong answer is "I ask what class the prompt is, whether a DPA exists, whether private connectivity is required, and whether training-opt-out is in writing — then I pick the path". Interviewers want to see that you treat compliance as a set of checkable controls, not as a vibe.

You also need to know what a platform does **not** fix: a Bedrock call that logs prompts to a central account in another region, or a "private" setup that still calls a public embedding API, still fails the review.""",
   how="""Walk a hospital copilot. The prompt contains discharge notes. Policy: in-country, private path, no training, 30-day log retention, named workload identity.

Checklist you fill with security:

1. Processor: is the cloud already an approved processor? Yes. Is the public lab? No.
2. Region: which regional endpoint keeps inference and logs in-country?
3. Network: PrivateLink / Private Service Connect / private endpoint — and is public fallback forbidden?
4. Identity: task role that can invoke only model X in region Y.
5. Terms: dated clause that inputs are not used to train, plus the console toggle screenshot.
6. Logs: where do traces live, who can read them, when are they deleted?

If any row is blank, you do not ship. The public API leaves rows 1, 3 and 4 blank by default. The managed platform can fill them if you actually turn the controls on.

Example answer in a design interview: "I would not call the public API for this workload. I would use the in-account catalog with private connectivity, pin the region, and put the no-training clause in the decision record." """,
   failures="""1. **Believing the homepage.** "Enterprise tier" is not a DPA. "We do not train on your data" must be the product you bought, in writing, for the region you use.

2. **Fixing only inference.** Completions stay in-region but traces go to a US SaaS. The audit fails on the log path.

3. **API keys in a regulated account.** A leaked key is an un-attributable, long-lived credential. Reviewers will ask why you did not use a role.

4. **Exception without expiry.** A one-week "just use the public API for the pilot" that is still on a year later with real patients.""",
   line="""Regulated teams fail public APIs on processor, residency, network, identity and training terms — not on model quality. I ask those five questions first. A managed platform can answer them, but only after I turn the controls on and keep the evidence.""",
   key_points=[
    "Blockers are processor approval, residency, private network, workload identity and retention/training terms.",
    "A public API usually fails several of those before quality is even discussed.",
    "A managed platform is approvable because the cloud contract already exists — not because it is magic.",
    "Compliance is configuration plus written terms, not a platform logo.",
    "Logs and traces are in-scope, not only the inference request.",
    "Ask data class first; then pick the path.",
   ],
   questions=[
    {"q": "Why can a regulated team be unable to call a public LLM API?", "a": "Policy typically requires an approved processor, in-country processing, a private network path, auditable workload identity and written retention/no-training terms. A public API sits outside those controls even if the vendor is reputable.", "kind": "recall"},
    {"q": "Your cloud platform hosts the model. Is the compliance question closed?", "a": "No. You still pick an in-policy region, least-privilege identity, invocation logging, retention and no-training evidence, and private connectivity if required. The platform makes those possible; it does not turn them on.", "kind": "apply"},
    {"q": "An auditor finds prompts in a US observability tool while inference is in-region. What failed?", "a": "The data-flow map. Side systems (traces, evals, embeddings) left the boundary. Treat every copy of the prompt as in-scope and keep traces in-region or redacted.", "kind": "debug"},
    {"q": "Which five questions do you ask before choosing a public API for a bank?", "a": "Who is the processor and is there a DPA; where does data reside; is public egress allowed; how is the caller identified and audited; and what do written terms say about retention and training.", "kind": "recall"},
    {"q": "Security allows a two-week public-API pilot. What do you write down?", "a": "The data class allowed, the compensating controls (no real customer text, synthetic only), the named owner, and a hard expiry. Put it in the decision record so the pilot cannot quietly become production.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS PrivateLink concepts", "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html"},
    {"title": "Vertex AI data governance", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance"},
   ],
  ),
  "comparing-the-three-paths": entry(
   what="""Compare the three paths on the same axes so the choice is a score, not a vibe. Useful axes: **time to first call**, **model freshness**, **identity model** (API key vs cloud IAM), **data handling** (who stores prompts, training terms), **region and residency**, **capacity** (on-demand vs reserved), **price per token or per GPU hour**, **operational effort**, and **how quickly a new model reaches you**.

Public API wins time-to-first-call and freshness. Managed platforms win identity, networking, billing consolidation and residency that already match your cloud. Self-hosting (or dedicated GPUs) wins control of versions and the cost curve at high steady utilisation. Each path loses on the axes the others win.

The comparison is per workload. A weekend prototype and a claims copilot will score differently on the same table. Write numbers where you can: days to first call, dollars per million tokens, GPU hours at 30% utilisation, number of people who can page the serving stack.""",
   why="""On the job, arguments of the form "Bedrock is safer" or "the API is better" go nowhere. A filled table ends them. Finance can see cost shape. Security can see identity and data handling. Product can see freshness. You look like the person who can run the meeting.

In interviews you will be asked to compare the paths. Reciting vendor names is weak. Walking six axes and saying which path wins each one is the answer they score. They may then give you a constraint ("data cannot leave India", "two engineers", "need the model that shipped last week") and expect you to collapse the table to one path.

This is also how you avoid lock-in theatre. If switching cost and freshness matter more than private networking, say so. If they do not, say so. Honesty about the axes is the skill.""",
   how="""Fill a one-page matrix for a new internal Q&A bot.

| Axis | Public API | Managed platform | Self-host 8B |
| Time to first call | 1 day | 2–4 weeks (access, quota, network) | 4–8 weeks |
| Freshness | days | weeks to months | when you pull weights |
| Identity | API key | IAM role | your serving auth |
| Data handling | vendor terms | in-account + terms | your disks |
| Region | vendor regions | your cloud regions | wherever you put GPUs |
| Capacity | on-demand, vendor quota | on-demand + provisioned | whatever you bought |
| Price shape | per token | per token / provisioned | per GPU hour |
| Ops | lowest | medium | highest |

For non-sensitive internal Q&A with two engineers, the public API or the platform both beat self-host. If the same bot later answers from HR files, the platform row for data handling wins and you move.

Keep the filled matrix in the decision record. When someone asks "why not Llama on our GPUs" six months later, you can show the ops and utilisation numbers rather than re-litigate.""",
   failures="""1. **Comparing price without utilisation.** A GPU hour looks cheap until the box is idle 80% of the time. Always convert to cost per successful task at your volume.

2. **Ignoring identity.** A shared API key cannot attribute spend or satisfy an audit. If that axis is required, the public API needs a gateway or you need a platform.

3. **Assuming freshness equals quality.** The newest public model can still lose your eval to an older in-region catalog model. Score quality on your set, separately from freshness.

4. **One global winner.** The matrix is per workload. Reuse the axes, not last quarter's conclusion.""",
   line="""I compare public API, managed platform and self-host on identity, data, region, capacity, price shape, ops and freshness. I fill numbers per workload and pick the least-ops path that clears the hard constraints. I do not pick a vendor from a keynote.""",
   key_points=[
    "Compare paths on the same axes: speed, freshness, identity, data, region, capacity, price, ops.",
    "Public API wins start time and freshness; platforms win in-account controls; self-host wins control at volume.",
    "Convert GPU hours to cost per successful task at your utilisation.",
    "Identity and data handling are hard constraints, not nice-to-haves.",
    "Fill the matrix per workload and keep it in the decision record.",
    "Freshness is not quality — score your own eval separately.",
   ],
   questions=[
    {"q": "On which axes do the three consumption paths differ most?", "a": "Time to first call, model freshness, identity (key vs IAM), data handling and training terms, region, capacity model, price shape, and operational effort.", "kind": "recall"},
    {"q": "Traffic is low and spiky, data is non-sensitive. Which path and why?", "a": "A per-token public API or managed platform. You pay for use and carry no idle GPU. Self-hosting would sit idle and add ops you do not need.", "kind": "apply"},
    {"q": "A team claims self-hosting is cheaper because the GPU list price is low. What is missing?", "a": "Utilisation, people, and reliability. Cost per successful task at actual load, plus on-call and wasted idle hours, is the comparison — not the sticker price of a card.", "kind": "debug"},
    {"q": "Which two axes most often eliminate the public API before quality is discussed?", "a": "Data handling / residency and identity / network policy. If prompts cannot leave the account or must use a role over a private link, the public API is already out.", "kind": "recall"},
    {"q": "How do you keep the comparison honest six months later?", "a": "Store the filled matrix with numbers and the workload it applied to. Re-score when volume, data class or staffing changes instead of treating last quarter's winner as permanent.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock pricing", "url": "https://aws.amazon.com/bedrock/pricing/"},
    {"title": "Vertex AI pricing", "url": "https://cloud.google.com/vertex-ai/generative-ai/pricing"},
   ],
  ),
  "platform-gateway-or-both": entry(
   what="""A **managed platform** is where models run: catalog, identity, network, region, bill. A **gateway** (router, LLM proxy) is a hop in front of one or more providers: one request format, credentials in one place, routing, failover, virtual keys and a single usage view. They solve different problems. You can use a platform alone, a gateway alone in front of public APIs, or both — the gateway pointing at the platform as one backend among several.

The platform can *be* your gateway if you only ever call models in that catalog. It can *sit behind* a gateway when you also call a public API or an open-weight host. It can be *one provider among several* that a gateway routes to by task, cost or region.

A gateway is not free. It is another component on the critical path. It adds latency, an availability problem, and a lowest-common-denominator API that may hide tools, structured output or caching that one vendor supports. You add it for a named reason: multi-team budgets, multi-provider failover, or a single place to cut a key.""",
   why="""On the job, teams add gateways because a blog said they should, then spend a quarter debugging tool-call translations. Other teams refuse a gateway and then cannot tell which product burned the bill. The distinction lets you say "we need governance" or "we need a place to run models" as two tickets, not one muddle.

In interviews this is a design fork. The weak answer is always-gateway or never-gateway. The strong answer is: one team, one platform, one model — platform SDK plus a thin wrapper. Several teams, several providers, or a failover requirement — gateway in front, platform as a backend. Interviewers want to hear the extra hop and the feature-hiding cost.

Enterprises will also ask whether the gateway is hosted (data leaves) or self-hosted (data stays). That is the same boundary question as the model path.""",
   how="""Sketch three topologies and pick one in writing.

A. **Platform only.** App -> Bedrock/Vertex/Foundry. Identity is a role. No extra hop. Use when one catalog is enough.

B. **Gateway in front of one platform.** App -> LiteLLM/Portkey -> platform. Use when several internal teams need virtual keys and budgets but all models still live in one cloud.

C. **Gateway in front of many.** App -> gateway -> platform + public API + open-weight host. Use when you route cheap tasks to open weights and regulated tasks to the platform.

Example: two squads, both on Azure AI Foundry, no other vendor. Topology B: a self-hosted proxy in the VNet, virtual keys per squad, Foundry as the only backend. You do not pay multi-cloud complexity. You do get a single place to revoke a team's access without rotating the platform credential.

Write the topology in the decision record with the reason you would move from A to B to C.""",
   failures="""1. **Gateway by default.** One team, one model, and you now own a proxy cluster. The hop fails, and nobody can call the model.

2. **Using the gateway to hide missing evals.** Routing "the best model" without a suite means a rule change silently swaps quality.

3. **Hosted gateway against a no-egress policy.** You solved routing and created a new processor.

4. **Treating the platform as a gateway for other clouds.** A Bedrock endpoint will not call Vertex. If you need two clouds, you need a real router or two app configs.""",
   line="""A platform is where the model runs. A gateway is how I route and govern calls. I use the platform alone until I have a named reason — budgets, several providers, failover — and I treat the gateway as critical-path infrastructure with a bypass.""",
   key_points=[
    "Platform = where models run; gateway = how you unify, route and govern calls.",
    "A platform can be the gateway, sit behind one, or be one backend among several.",
    "Add a gateway for budgets, multi-provider routing or failover — not by default.",
    "A gateway adds a hop, an availability risk and a lowest-common-denominator API.",
    "Hosted vs self-hosted gateways is the same data-boundary question as the model path.",
    "Write the topology (A/B/C) and the trigger that would change it.",
   ],
   questions=[
    {"q": "What is the difference between a managed platform and a gateway?", "a": "A platform hosts models with cloud identity, network, region and billing. A gateway sits in front of one or more providers to unify the API and add routing, failover, virtual keys and usage views.", "kind": "recall"},
    {"q": "One team, one model, one cloud. Do you need a gateway?", "a": "Usually not. A thin in-code wrapper around the platform SDK is enough. Add a gateway when several teams need budgets, you add a second provider, or you need automatic failover.", "kind": "apply"},
    {"q": "A hosted router is rejected by security. What still gives you routing?", "a": "A self-hosted proxy inside your network, pointing at the approved platform (and only at approved backends). You keep virtual keys and failover without a new public processor.", "kind": "apply"},
    {"q": "What does a gateway hide that can break a feature?", "a": "Vendor-specific tool schemas, structured-output modes, prompt caching, and context limits. Fail over or unify only after you test those features on each backend.", "kind": "debug"},
    {"q": "When can the managed platform itself act as your gateway?", "a": "When every model you need is in that catalog and you do not need cross-provider failover or multi-team virtual keys beyond what the cloud already offers.", "kind": "recall"},
   ],
   links=[
    {"title": "LiteLLM proxy docs", "url": "https://docs.litellm.ai/docs/simple_proxy"},
    {"title": "Amazon Bedrock APIs", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-how.html"},
   ],
  ),
  "decision-matrix-for-a-new-workload": entry(
   what="""A **decision matrix** for a new workload is a short scorecard you fill before you write a client. Rows are the three paths (public API, managed platform, self-host). Columns are the hard constraints: **data class**, **region**, **latency target**, and **ops headcount**, plus two soft ones if you have them (cost ceiling, freshness). Each cell is a pass/fail or a 1–5, not a paragraph.

Data class is usually the first column that eliminates a path. Public data and marketing copy can use a public API. Customer secrets, health, payments or government text usually cannot. Region is next: if the path has no legal region, it is out. Latency and ops headcount decide between platform and self-host when both are allowed: if two people must keep the lights on, you do not start a GPU fleet.

The matrix is a working document. You fill it in a meeting with security and the owning squad, you date it, and you revisit when the data class or volume changes. It is not a framework you install.""",
   why="""On the job, new AI work arrives as "just call the model". Without a matrix, each squad invents a path and you end up with five keys, three clouds and no audit story. With a matrix, a new copilot takes an hour to place, and you can show an auditor why this workload is on Bedrock and that one is on a public API.

In interviews this is the applied form of "compare the three paths". They will give you a regulated team, a latency number and a headcount and expect you to score the grid out loud. Walking the columns in order — data, region, latency, ops — is the senior habit. Jumping to a vendor is the junior one.

It also protects you from heroic self-hosting. If ops headcount is two, self-host fails the matrix even when the GPU math looks pretty.""",
   how="""Template you can draw on a whiteboard:

```
Workload: claims summariser
Data class: regulated (PII + medical)
Region: India only
Latency: p95 4s offline batch is fine
Ops: 2 engineers, no GPU on-call

              public API   platform   self-host
data class        fail        pass       pass
region            fail        pass       pass
latency           pass        pass       pass
ops headcount     pass        pass       fail
```

Result: managed platform. Public API fails data and region. Self-host fails ops. You do not need a 20-row architecture review.

A second workload — "rewrite marketing emails" — would pass public API on every column. You do not force it onto the platform just because claims live there. Two lines in the same matrix file, two paths.""",
   failures="""1. **Scoring after the demo.** The path was chosen on Friday; the matrix is written on Monday to justify it. Fill it before the first production secret is created.

2. **Soft columns treated as hard.** Freshness is rarely a fail. Data class is. Do not fail the platform because a model is six weeks old if the alternative is illegal.

3. **No owner.** A matrix nobody will update becomes folklore. Name the reviewer (usually the owning squad + security).

4. **Averaging scores.** A single fail on data class is a fail. Do not let a high freshness score rescue an illegal path.""",
   line="""I score public API, platform and self-host on data class, region, latency and ops headcount before I write a client. One fail on data or region is a fail. I date the matrix and I do not force every workload onto the most restrictive path.""",
   key_points=[
    "Score the three paths on data class, region, latency and ops headcount before coding.",
    "Data class and region are usually hard fails; freshness is usually soft.",
    "Fill the matrix with security in the room and date it.",
    "One fail on a hard column eliminates the path — do not average.",
    "Different workloads in one company can (and should) land on different paths.",
    "Revisit when data class, volume or staffing changes.",
   ],
   questions=[
    {"q": "Which four columns belong on a new-workload path matrix?", "a": "Data class, region, latency target, and ops headcount. Add cost and freshness if you have numbers, but do not let them override a data or region fail.", "kind": "recall"},
    {"q": "A two-engineer team wants to self-host a 70B for a regulated chatbot. What does the matrix say?", "a": "Self-host may pass data and region but fails ops headcount. Prefer a managed platform in-region. Revisit self-host when you have utilisation and someone who pages GPUs.", "kind": "apply"},
    {"q": "Product already called a public API for HR files. How do you use the matrix after the fact?", "a": "Fill it honestly. If data class fails, treat current use as an exception with expiry and move the workload. Do not rewrite history to make the API look approved.", "kind": "debug"},
    {"q": "Why not use one company-wide winner on the matrix?", "a": "Workloads differ in data class and latency. Forcing marketing copy onto the claims path wastes money; forcing claims onto the marketing path fails the audit.", "kind": "recall"},
    {"q": "Walk a batch summariser that may leave the country versus an interactive copilot that may not.", "a": "If policy allows leaving, public API or platform both pass region; pick on ops and cost. If policy forbids leaving, public API fails and you choose platform vs self-host on ops and latency.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS Well-Architected generative AI lens", "url": "https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html"},
   ],
  ),
  "switching-cost-after-month-one": entry(
   what="""**Switching cost after month one** is the list of things you must rebuild if you leave a path after a quarter. It is not theoretical lock-in. It is a checklist: credentials, request shapes, managed indexes, agent graphs, guardrail configs, eval harness wiring, runbooks, and the evidence pack you showed an auditor.

On a public API the expensive bits are usually the SDK dialect, any vendor-only tools, and the operational habit of a single key. On a managed platform the expensive bits are knowledge bases, provisioned throughput, private endpoints, IAM policies, and console-only eval jobs. On self-host the expensive bits are the serving image, GPU capacity reservations, and the people who know how to roll a checkpoint.

Prompts, golden sets, application code behind a thin interface, and your own traces usually travel. Treat anything that only exists in a vendor console as **non-portable until proven otherwise**. The point of listing switching cost in month one is that you can still cheaply avoid the worst items. In month twelve you cannot.""",
   why="""On the job, nobody asks about exit on week one and everybody asks on week twenty when the bill or the region or the deprecation notice arrives. If you listed "knowledge base export: unknown" in month one, you either did the exit test or you accepted the lock-in in writing. That is a professional decision. Discovering it during an outage is not.

In interviews, "we avoided lock-in" is empty. "We would rebuild the IAM and the private link, the prompts move in a day, the knowledge base is a two-week export we timed" is a staff answer. Interviewers want a list, not a slogan.

This also changes what you buy. A managed knowledge base that cannot export chunks has a different switching cost than one that dumps Parquet in an hour. Measure it while you still have time.""",
   how="""After the first production week, fill a one-page exit inventory:

- Auth: API key vs role vs workload identity. Time to re-issue.
- Client: lines of code that import the vendor SDK. Target: one module.
- Retrieval: can you export chunks, embeddings, metadata? Timed last run.
- Agents / guardrails / evals: console config or code?
- Capacity: provisioned units you would still pay for during overlap.
- Evidence: which auditor artefacts are platform-specific.

Example: you spent month one on Azure AI Foundry with a managed index. Exit inventory says: prompts and evals in git (1 day), app wrapper (2 days), index export never tried (unknown), private endpoint (1 week to rebuild). You schedule a 4-hour export drill this sprint. If export is ugly, you either move retrieval to your own store now or you write "index lock-in accepted, revisit Q3" in the decision record.

Do this once per path you actually use, not once per company.""",
   failures="""1. **Listing only price.** The painful costs are indexes, IAM and evidence, not the per-token delta.

2. **Never timing the export.** "We can leave" without a measured dump is a hope.

3. **Leaky abstractions.** Vendor types (`BedrockChatModel`) imported in twelve services. The wrapper existed on a wiki page only.

4. **Ignoring people.** Self-host switching cost includes the engineer who leaves. Write the runbook while they are still there.""",
   line="""After month one I list what I would rebuild to leave: auth, client, indexes, agents, guardrails, capacity and evidence. Prompts and evals should already be portable. If an export is untested, I time it now or I accept the lock-in in writing.""",
   key_points=[
    "Switching cost is a month-one inventory of what you would rebuild, not a slogan.",
    "Prompts, evals and a thin client should travel; console-only assets usually do not.",
    "Time the knowledge-base export while leaving is still cheap.",
    "IAM, private links and auditor evidence are part of the cost.",
    "Accept remaining lock-in in the decision record rather than discovering it in an incident.",
    "Do the inventory per path you actually use.",
   ],
   questions=[
    {"q": "What belongs on a month-one switching-cost list?", "a": "Credentials and identity, vendor SDK surface, managed indexes, agent and guardrail configs, eval jobs, reserved capacity, and auditor evidence. Note what is already in git.", "kind": "recall"},
    {"q": "Which assets should already be cheap to move after a quarter?", "a": "Prompt templates, golden sets and rubrics, application code behind a provider interface, and your own traces. If those are stuck in a console, that is a process bug, not lock-in.", "kind": "recall"},
    {"q": "You cannot say how long index export takes. What do you do this sprint?", "a": "Run a timed exit drill: export chunks, embeddings and metadata into your own store and restore retrieval. Write the hours into the decision record or move retrieval off the managed store.", "kind": "apply"},
    {"q": "Twelve services import the vendor SDK. What switching cost did you create?", "a": "A rewrite, not a config change. Pull calls behind one module now so a path change is one pull request plus evals.", "kind": "debug"},
    {"q": "Why include reserved capacity on the exit list?", "a": "You may keep paying provisioned units during dual-run. That overlap is part of leaving and needs an end date and an owner.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS Architecture Blog: avoiding lock-in", "url": "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/open-source.html"},
   ],
  ),
  "pick-a-path-under-constraints": entry(
   what="""**Pick a path under constraints** is the applied exercise: a regulated team cannot send prompts to a public API, and you must name the path you would choose and why. You do not get to invent a fourth path. You walk data class, region, identity, network and ops headcount, and you land on a managed platform in their existing cloud or on in-boundary open-weight serving.

The public API is out by the first sentence. The remaining fork is: does the team already live on AWS, GCP or Azure with an approved private network, and does the catalog have an acceptable model in the allowed region? If yes, the managed platform is the default. If the catalog is empty in-region and they have GPU ops, self-host or a VPC-hosted inference appliance. If the catalog is empty and they have no GPU ops, you change the model, not the law.

"Name the path" means you say **which** platform or **which** hosting rung, which region, and which identity, not just "not the public API".""",
   why="""This is the interview question behind half of Level 11. Enterprises use it to see whether you fold under a brand or think in constraints. IT services firms use it because their clients already picked a cloud. The scoring answer is short, ordered, and refuses to smuggle a public API back in with "we'll anonymise the prompt".

On the job you will sit in the same conversation with a real CISO. If you cannot pick a path in five minutes on a whiteboard, you will not pick one in a steering group. The habit of collapsing constraints to a path is the skill; the particular logo is incidental.

A common twist: the team wants the model that only exists on a public API. Your job is to say the constraint wins, propose the best in-boundary alternative, and offer a documented exception only if legal writes one with an expiry.""",
   how="""Walk this prompt out loud:

"We are a payments company in the EU. Prompts include merchant data. We cannot send data to a public API. Two platform engineers, no GPU team. We already run production on AWS in `eu-central-1`."

Your answer:

1. Public API: out. Data class + processor.
2. Self-host: out for now. No GPU team, and we do not need it to satisfy the constraint.
3. Path: Amazon Bedrock in `eu-central-1` (or another in-policy EU region where the model exists), invoke via a task role, PrivateLink, no-training terms on file.
4. Model: the best catalog model that exists in that region; eval it on our set. If the dream model is absent, we do not quietly call us-east-1.
5. Exit: prompts and evals in git; thin wrapper; no managed index until we time an export.

If they had been a GCP shop, you would have said Vertex in `europe-west`. The structure stays; the logo follows the existing cloud.""",
   failures="""1. **Anonymise and use the public API.** Tokenisation theatre is not a processor agreement. Do not offer it as the path.

2. **Naming a platform they do not have.** Recommending Azure to an AWS-only bank adds a second cloud review you will not finish this quarter.

3. **Picking self-host to sound hardcore.** Without GPU ops you have created an outage, not a compliant design.

4. **Forgetting to name region and identity.** "We'll use Bedrock" without a region is not a path under residency constraints.""",
   line="""If a team cannot send prompts to a public API I take that path off the table, then pick the managed platform in the cloud they already have, in a legal region, with a role and a private link. I only self-host when they can operate GPUs or the catalog is empty. I name region and identity, not just a vendor.""",
   key_points=[
    "Public API is out when prompts cannot leave; do not smuggle it back via anonymisation.",
    "Default to the managed platform in the cloud the team already runs.",
    "Name region, identity and network, not only the product.",
    "Self-host only if GPU ops exist or the in-region catalog cannot meet the task.",
    "If the desired model is absent in-region, change the model or write an exception — do not quietly leave.",
    "Follow the existing cloud; do not add a second one to chase a logo.",
   ],
   questions=[
    {"q": "A regulated team cannot send prompts to a public API. Which path do you pick first, and why?", "a": "The managed platform in their existing cloud, in an allowed region, with workload identity and private connectivity. It reuses contract, network and audit. Self-host is the fallback if the catalog cannot serve the task and they can operate GPUs.", "kind": "apply"},
    {"q": "Why is 'we will strip PII and call the public API' a weak answer?", "a": "Redaction is incomplete, residual data still leaves, and you still lack an approved processor, private path and audit story. Policy usually forbids the path, not just the obvious fields.", "kind": "debug"},
    {"q": "They are an Azure shop. You prefer Bedrock personally. What do you recommend?", "a": "Azure AI Foundry / Azure OpenAI in their region. Adding AWS is a second cloud, a second review and a second on-call, which the constraint did not require.", "kind": "apply"},
    {"q": "What three details must appear when you 'name the path'?", "a": "Which platform or hosting rung, which region, and which identity (role or workload identity) — plus whether public egress is forbidden.", "kind": "recall"},
    {"q": "The only acceptable model is missing in-region. What are the legal moves?", "a": "Evaluate a different in-region model, self-host an open model in-region if ops exist, or raise a written exception with compensating controls and an expiry. Silent cross-region routing is not a move.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock in AWS Regions", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-regions.html"},
    {"title": "Azure OpenAI data residency", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/data-privacy-security"},
   ],
  ),
  "hybrid-path-in-practice": entry(
   what="""A **hybrid path** uses a public API for prototypes and a managed platform for production of the **same prompt**. The prompt, the eval set and the application interface stay in your repo. Only the transport, identity and region change when a feature graduates. This is how you keep research fast without teaching production to leak.

The rule is data class, not environment name. A "dev" namespace that still contains customer tickets is production. A "prod" experiment that uses synthetic tickets can stay on the public API. Hybrid is safe only when the promotion checklist includes: no real regulated text on the public path, evals re-run on the platform endpoint, identity switched to a role, and the API key gone from that service.

Hybrid is not two sources of truth. One prompt file, one golden set, two adapters. If the platform model lags the public one, the eval tells you whether the lag is acceptable before you promote.""",
   why="""On the job this is the compromise that lets a platform team stop being the bottleneck for every sketch. Researchers call the newest public model on synthetic or public data. The production lane stays in-account. Without the hybrid rule, either everything waits for platform access (slow) or everything uses the public API (an incident later).

In interviews, hybrid is how you show judgement. Pure "never public API" sounds brittle. Pure "public API everywhere" sounds careless. "Same prompt, two transports, promotion gated on data class and evals" sounds like someone who has shipped.

You should also be ready to say what does **not** hybrid well: fine-tunes that only exist on one side, knowledge bases that only exist on the platform, and traces that must not leave. Those stay on one path or you accept dual-run cost.""",
   how="""Concrete setup:

```
prompts/support_v3.md          # the prompt
evals/support_v3.jsonl         # golden set
src/llm/client.py              # complete(messages, *, path=...)
src/llm/paths/public.py        # API key, only allowlisted data classes
src/llm/paths/platform.py      # IAM role, regional endpoint
```

Promotion checklist (ticket template):

1. Data class of live inputs is allowed on the platform and **not** on the public path.
2. Eval suite run against the platform model id; scores within the agreed delta.
3. Secrets: public API key removed from the service account; role attached.
4. Traces stay in the production account.
5. Decision record updated with both model ids.

Example: you draft a classifier on a public model using 200 synthetic tickets. Scores are good. You re-run the 200 plus 50 real (redacted-in-eval-store) tickets on Bedrock's closest model. If the drop is inside 3 points, you promote. If not, you adapt the prompt on the platform — you do not silently keep production on the public API.""",
   failures="""1. **Same key, both paths.** The production service still has the public API key "for emergencies". It will be used. Remove it.

2. **Prompt drift.** The public notebook has v4; production has v3. Hybrid without a registry is two products.

3. **Real data in the prototype.** Someone dumped a production export into the public playground. The hybrid policy is already broken.

4. **No delta threshold.** You promote on vibes, then spend a month arguing about "the platform model being worse" without a number.""",
   line="""I prototype on a public API with data that is allowed to leave, and I ship the same prompt on a managed platform. Promotion is a checklist: data class, eval delta, role instead of key, traces in-account. One prompt file, two adapters, no leftover emergency key.""",
   key_points=[
    "Hybrid = same prompt and evals, public API for allowed prototypes, platform for production.",
    "Data class decides the path, not the word 'dev'.",
    "Promotion re-runs evals on the platform model id and removes the public key.",
    "Keep one prompt file and two transport adapters.",
    "Agree a quality delta before you promote.",
    "Fine-tunes and managed indexes do not hybrid for free — treat them as single-path assets.",
   ],
   questions=[
    {"q": "What does a hybrid public-API-plus-platform path share, and what differs?", "a": "Shared: prompt, eval set, application interface. Different: transport, identity, region, logging and which data class is allowed. Production should not keep the public key.", "kind": "recall"},
    {"q": "A 'dev' service still sends real tickets to a public API. What is wrong?", "a": "Environment name is not data class. Real tickets belong on the approved production path. Revoke the key, move the traffic, and treat it as a data incident if terms require it.", "kind": "debug"},
    {"q": "The platform model scores 4 points worse than the public prototype. What do you do?", "a": "Do not promote on hope. Adapt the prompt on the platform, try another in-region model, or delay the feature. Keep the public path off live regulated data.", "kind": "apply"},
    {"q": "Which items belong on a promotion checklist?", "a": "Data class allowed only on the platform, eval delta measured, API key removed, role attached, traces in-account, and the decision record updated with both model ids.", "kind": "recall"},
    {"q": "When is hybrid the wrong shape?", "a": "When you cannot keep data off the public path, when you rely on a fine-tune or index that exists on only one side, or when the two models are so different that one prompt cannot serve both.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock model access", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html"},
    {"title": "OpenAI production best practices", "url": "https://platform.openai.com/docs/guides/production-best-practices"},
   ],
  ),
 }
}
