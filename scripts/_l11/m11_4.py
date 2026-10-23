from assemble import entry

NOTES = {
 "m11-4": {
  "models-exist-per-region": entry(
   what="""A model on a managed platform **exists per region** (and sometimes per project). The catalog row you used in `us-east-1` is not a promise about `ap-south-1` or `europe-west1`. Access grants, quotas, provisioned units and even feature flags are regional. Cross-region inference profiles exist on some platforms; they are a separate product with a separate residency story, not a default.

The region you are **permitted** to use often decides which models you may design around. A team that prototypes on the newest US-only id and then discovers production must stay in India has not designed a product; they have designed a rewrite.

"Global" endpoints are still a residency decision. Read whether the global path may process in another geography.""",
   why="""On the job this is the most common late surprise in Level 11. Architecture decks assume a model; the catalog in the allowed region does not list it. Sales already promised the US demo's quality.

In interviews, "models exist per region" is a short fact that shows you have used a platform. Follow it with: I check the prod region first, I pin an id that exists there, and I treat cross-region as an exception.

IT services work is often "the client’s cloud, the client’s region". Your favourite model is irrelevant if it is not there.""",
   how="""Order of work:

1. Write the allowed regions from policy (e.g. `ap-south-1` only).
2. Open the catalog **in that region**, not in the default US console view.
3. List candidate ids that are GA and have the features you need.
4. Request access and quota **there**.
5. Only then write the client.

Example: you built on a US Anthropic id. India production has a different Anthropic snapshot and no provisioned throughput yet. You re-eval the India id, resize expectations, and you do not enable a US inference profile "temporarily".""",
   failures="""1. **Console default region.** You browsed US and assumed the world.

2. **Access in one region, quota in another.** Calls 429 or 403 in prod.

3. **Treating cross-region profiles as 'the same model'.** Residency and latency changed.

4. **Designing on a preview id that will never leave US.""",
   line="""I treat model availability as a per-region fact. I open the catalog in the region policy allows, I pin an id that exists there, and I do not design on a US-only row I cannot ship.""",
   key_points=[
    "Catalog, access, quota and features are regional.",
    "Check the production region before you write the client.",
    "Cross-region inference is a separate residency decision.",
    "Global endpoints still have a geography — read it.",
    "A US-only preview id is not a product plan.",
    "Request access and quota in the region you will actually call.",
   ],
   questions=[
    {"q": "Why can a working dev setup fail in the production region?", "a": "The model, access grant or quota may not exist there. Availability is per region and account, not global.", "kind": "recall"},
    {"q": "You must stay in-country and the dream model is US-only. What do you do?", "a": "Evaluate in-region alternatives or self-host in-region. Do not quietly enable a cross-region profile without a written exception.", "kind": "apply"},
    {"q": "What extra questions do you ask about a 'global' endpoint?", "a": "Where inference may run, where logs land, and whether policy treats that as leaving the region.", "kind": "apply"},
    {"q": "Access works in us-east-1; prod in eu-west-1 returns 403. First check?", "a": "Model access and IAM resource ARNs in eu-west-1. Grants do not always copy with the account.", "kind": "debug"},
    {"q": "When is a cross-region inference profile acceptable?", "a": "When policy allows those geos, you documented latency and data flow, and you have an expiry or a reason it is not the long-term path.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock regions", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-regions.html"},
    {"title": "Vertex AI locations", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations"},
   ],
  ),
  "data-residency-localization": entry(
   what="""**Data residency** is the rule that specified data must be processed and stored in a geography. **Localization** is the stricter form some countries and sectors use: certain data must stay in-country, sometimes including backups and logs. Indian public-sector and RBI-adjacent expectations, EU GDPR transfer rules, and sector laws (health, payments) sit **above** the cloud's marketing "region". The cloud region is a tool. The law and the contract are the requirement.

For LLM apps, residency applies to **prompts, completions, embeddings, indexes, traces and eval dumps**, not only to "where the GPU sat". A model in Mumbai with traces in Virginia failed residency.

You plan residency at design time: allowed regions, forbidden processors, and what to do when the model you want is elsewhere.""",
   why="""On the job, especially in India-based enterprise work, localization is a hard filter. Interviewers at banks and IT services firms will ask how you keep prompts in-country. "We picked ap-south-1" is necessary and not sufficient. You must name logs, subprocessors and support access.

In interviews, mention that residency is a data-flow problem. Draw the boxes. Offer an in-region smaller model over a forbidden US frontier model. That is seniority.

Do not give legal advice; give an engineering map legal can review.""",
   how="""Build a data-flow table:

| Artefact | Where it lives | Allowed? |
| Inference | Bedrock ap-south-1 | yes |
| Traces | self-hosted Langfuse in Mumbai | yes |
| Embeddings | same region catalog | yes |
| Eval SaaS | US vendor | no |
| Support ZIP | laptop | no |

Then design out the "no" rows.

Example: an Indian insurer. You refuse a US eval product, run evals in-account, keep the KB in-region, and you write "no US subprocessors for prompt text" in the decision record. A later PM adding a US playground is a process fail you can catch.""",
   failures="""1. **Region on invoke, nothing else mapped.**

2. **Assuming 'India region' implies Indian support staff cannot pull logs abroad.** Read the support path.

3. **Copies for 'just debugging'.** Laptops and Slack are locations.

4. **Treating embeddings as non-data.** They can be inverted or still be personal data under policy.""",
   line="""Residency is a data-flow map, not a region dropdown. I place prompts, completions, indexes, traces and evals in allowed geos and I refuse side tools that leave. The law sits above the catalog.""",
   key_points=[
    "Residency covers every copy: prompts, completions, indexes, traces, evals.",
    "Localization can be stricter than 'pick a nearby region'.",
    "Cloud region is a tool; contract and sector rules are the requirement.",
    "Draw subprocessors and support access, not only inference.",
    "Embeddings and caches are in-scope.",
    "Engineers map flows; legal interprets the law.",
   ],
   questions=[
    {"q": "What artefacts must you place when planning LLM data residency?", "a": "Prompts, completions, embeddings, indexes, traces/logs, eval dumps and any support exports — not only the inference endpoint.", "kind": "recall"},
    {"q": "Inference is in-country; an audit finds data abroad. Likely source?", "a": "A third-party observability, eval or embedding service, or a support export. Map the full flow.", "kind": "debug"},
    {"q": "How do Indian localization expectations change a design?", "a": "You start from in-country processing and storage for the covered data class, including logs, and you treat US-only models and SaaS as incompatible unless a written exception exists.", "kind": "apply"},
    {"q": "Why are embeddings in-scope for residency?", "a": "They are derived from the source text, stored, and sometimes treated as personal data. They also leave the region if the embedding API does.", "kind": "recall"},
    {"q": "What do you hand legal?", "a": "A data-flow table of artefacts, processors, regions and retention — not a slide that says 'we are compliant'.", "kind": "apply"},
   ],
   links=[
    {"title": "Azure OpenAI data privacy", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/data-privacy-security"},
    {"title": "Vertex AI data governance", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance"},
   ],
  ),
  "retention-training-terms-in-writing": entry(
   what="""**Retention and training terms in writing** means you can point to a **dated contract clause or official product term** plus a **console setting** that say: what is logged, for how long, who can see it, and whether prompts or outputs may be used to **improve a model**. Blog posts, sales chat and "enterprise tier" folklore do not count.

Terms differ by product, by tier, by region and by year. A zero-retention API and a logged platform workspace can both exist under one vendor. You record the product you actually enabled.

Keep the PDF, the URL with retrieval date, and a screenshot of the toggle in the decision record. When the vendor updates terms, you re-read.""",
   why="""On the job, this is the packet security sends to a bank. If you cannot produce it, the deal pauses. If you produced a blog, the deal pauses later, worse.

In interviews, "how do you know they do not train on our data" has one good answer: written terms for this product, dated, plus the setting. "Everyone knows they don't" is a fail.

This connects to Level 8 governance: third-party processing must be named.""",
   how="""Packet:

1. Official terms URL + PDF saved on the date you accepted.
2. Clause highlighted: training, retention, subprocessors.
3. Console: logging on/off, retention days, abuse-monitoring caveats.
4. What you still log yourselves and for how long.
5. Review date.

Example: the platform stores prompts for 30 days for abuse monitoring even when "training" is off. You write that. You set your own traces to 14 days. You do not tell the CISO "nothing is stored".""",
   failures="""1. **Blog as evidence.**

2. **Wrong product.** You filed the public-API terms for a platform workspace that logs.

3. **Toggle not set.** The clause allowed opt-out; nobody clicked it.

4. **No re-read.** Terms changed; your packet is two years old.""",
   line="""I keep the dated official terms and the console setting that prove retention and no-training for the product I actually use. Blogs are not evidence. Abuse-monitoring caveats go in the packet too.""",
   key_points=[
    "Evidence is a dated official term plus the console setting.",
    "Terms differ by product, tier and year — file the ones you use.",
    "Record what is still logged for abuse monitoring.",
    "Re-read when vendors update terms.",
    "Your own traces have their own retention story.",
    "Blogs and sales email are not the packet.",
   ],
   questions=[
    {"q": "What is the best evidence that a provider does not train on your data?", "a": "Written contractual or official terms for that product, dated and stored, plus the console configuration that applies. Not a blog or a memory.", "kind": "recall"},
    {"q": "Training is off; the CISO asks if anything is stored. What do you say?", "a": "Abuse-monitoring and platform logs may still retain prompts for a documented period. Quote the clause and your own trace retention.", "kind": "apply"},
    {"q": "You filed OpenAI public terms for a Bedrock workload. What is wrong?", "a": "Wrong product. Bedrock's terms and logging are AWS's. File the platform packet.", "kind": "debug"},
    {"q": "How often do you re-read terms?", "a": "On vendor change notices, on renewal, and at least yearly. Put a review date in the decision record.", "kind": "apply"},
    {"q": "The opt-out toggle was never set. Are the terms enough?", "a": "No. If the clause depends on a setting, the setting is part of the control. Screenshot it.", "kind": "debug"},
   ],
   links=[
    {"title": "Amazon Bedrock data protection", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html"},
    {"title": "Azure OpenAI data privacy", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/data-privacy-security"},
   ],
  ),
  "connecting-back-to-governance": entry(
   what="""Level 8 named **residency, deletion, and third-party processing** as governance requirements. Level 11 is where those requirements become **platform controls**: region pins, retention settings, CMK, private paths, processor lists, and deletion jobs that actually purge prompts from traces and indexes. If the two levels do not connect, you have a policy wiki and an unrelated Bedrock account.

Connecting back means: every governance requirement has a **control**, an **owner**, and **evidence**. "We are on Azure" is not a control. "Prompts are in westeurope, traces delete at 14 days, subprocessors are on this list" is.

Deletion is the one teams skip. Indexes and eval dumps outlive the user request. Governance said they must not.""",
   why="""On the job, audits ask for the mapping, not the architecture diagram. If Level 8 said "right to delete" and your KB cannot purge a document, you fail even if inference is perfect.

In interviews, explicitly say "this is the Level 8 requirement, here is the platform control". That shows you do not treat modules as trivia. Interviewers who wrote governance questions will listen for deletion and subprocessors, not only IAM.

It also stops double work: do not invent a new policy language for the platform; reuse the Level 8 register.""",
   how="""Make a three-column register:

| Requirement (L8) | Control (L11) | Evidence |
| Residency | Region pin + no public eval SaaS | data-flow table |
| Deletion | KB purge API + trace TTL | job logs, sampled proof |
| Third-party processing | processor list + DPAs | packet |
| No training | terms + toggle | PDF + screenshot |
| Access | least-privilege roles | IAM review |

Example: a user asks to be deleted. You delete the ticket, the chunks, the traces by request id, and the eval sample if it contained their text. If any store cannot delete, it should not have received the text.""",
   failures="""1. **Policy in Confluence, controls in nobody's backlog.**

2. **Deletion of the app row but not the index.**

3. **New subprocessor (eval vendor) added without the register.**

4. **Different language.** Security talks "processors"; engineers talk "tools"; nobody maps them.""",
   line="""Level 8 wrote residency, deletion and third-party processing. Level 11 is those requirements as region pins, TTLs, purge jobs and a processor list with evidence. A platform account without that register is not governance.""",
   key_points=[
    "Map each Level 8 requirement to a platform control, owner and evidence.",
    "Deletion must include indexes, traces and eval dumps.",
    "New tools are subprocessors until proven otherwise.",
    "Reuse the governance register; do not invent a parallel wiki.",
    "'We use a platform' is not a control.",
    "If a store cannot delete, it must not receive the data.",
   ],
   questions=[
    {"q": "How do Level 8 governance requirements show up on a managed platform?", "a": "As concrete controls: region pins, retention/TTL, purge jobs, processor lists, no-training evidence and scoped identity — each with an owner and proof.", "kind": "recall"},
    {"q": "A user requests deletion. The ticket is gone; answers still cite their doc. What was missed?", "a": "The index (and maybe traces/evals) still hold the text. Deletion must run on every store that received it.", "kind": "debug"},
    {"q": "Why put eval SaaS on the third-party processing list?", "a": "It receives prompts or outputs. That is processing, even if you think of it as 'just testing'.", "kind": "apply"},
    {"q": "What three fields belong in the governance-to-platform register?", "a": "Requirement, control, evidence (and an owner). Without evidence it is a wish.", "kind": "recall"},
    {"q": "A store has no purge API. What are your options?", "a": "Do not send personal text there, isolate with a TTL that is actually enforced, or replace the store. Do not promise deletion you cannot perform.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS data protection in Bedrock", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html"},
   ],
  ),
  "when-your-model-is-not-in-your-region": entry(
   what="""The common case: the model you want is **unavailable in the required region**. Legal options: **use a different in-region model** you have evaluated; **self-host an open model in-region** if you can operate it; or **raise a written exception** for cross-region inference with compensating controls and an expiry. Illegal-feeling options that still happen: silently point the SDK at `us-east-1`, or strip the region "to make it work".

Unavailability is a catalog fact, not a temporary mood. Some ids never leave a handful of geos. Design as if that is stable.""",
   why="""On the job this is a product conversation: we can ship a slightly weaker in-region model now, or we can wait, or we can ask legal for an exception. Shipping the US endpoint because the demo looked better is how you fail an audit.

In interviews, walk the three legal options and refuse the silent one. Mention compensating controls for an exception: DLP, minimised prompts, extra logging, time box.

This is also where hybrid path thinking helps: prototype on the US public API with synthetic data; produce on the in-region catalog model.""",
   how="""Playbook:

1. Confirm the gap on the official regional catalog, dated.
2. List in-region substitutes; run the eval; present deltas.
3. If none clear the bar and GPU ops exist, price in-region self-host.
4. If the business still wants the foreign model, draft the exception: reason, data class, compensating controls, expiry, approvers (legal + security).
5. If unapproved, do not ship that skill.

Example: the only model that passes legal-analysis eval is US-only. You ship a cheaper in-region model for classification (passes) and you hold the legal-analysis skill behind an exception request. You do not route 100% of traffic abroad for one skill.""",
   failures="""1. **Silent US routing.**

2. **Exception with no expiry.**

3. **Comparing the foreign model to nothing.** You never eval'd the in-region option.

4. **Self-host fantasy** with no people.""",
   line="""If the model is not in my region I evaluate an in-region substitute, I consider in-region self-host if we can operate it, or I write an exception with controls and an expiry. I do not quietly change the region.""",
   key_points=[
    "Legal moves: other in-region model, in-region self-host, or written exception.",
    "Silent cross-region routing is a control failure.",
    "Exceptions need compensating controls and an expiry date.",
    "Evaluate substitutes on your suite before you claim 'nothing works in-region'.",
    "Split skills: only the skill that needs the foreign model should wait on an exception.",
    "Catalog gaps are often long-lived — design for them.",
   ],
   questions=[
    {"q": "The required model is absent in-region and data must stay in-country. Best path?", "a": "Evaluate an in-region comparable model or self-host an open model in-region. Do not use the foreign endpoint quietly.", "kind": "apply"},
    {"q": "What belongs in a cross-region exception?", "a": "Reason, data class, destination geos, compensating controls, expiry date and named approvers.", "kind": "recall"},
    {"q": "A customer demands the newest US model. How do you answer?", "a": "Show in-region eval evidence, explain the residency constraint, and offer the exception process if they want to sponsor it. Do not promise dates from unannounced catalog expansion.", "kind": "apply"},
    {"q": "You enabled a US inference profile 'to unblock QA'. What did you skip?", "a": "Policy review. QA with real text is still processing. Use synthetic data or an approved region.", "kind": "debug"},
    {"q": "Why split features when only one skill needs the missing model?", "a": "So the rest of the product can ship in-region instead of holding everything on one exception.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock regions", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-regions.html"},
    {"title": "Azure OpenAI regional availability", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models"},
   ],
  ),
  "prompt-and-log-residency": entry(
   what="""**Prompt and log residency** means you confirm **where prompts, completions and traces are stored**, not only where inference ran. Inference can be in `ap-south-1` while the platform's invocation logging, your APM, or a hosted Langfuse is in another country. Those copies are still the data.

You list every store: platform logs, application traces, eval caches, support replays, SIEM exports. Each has a region, a retention and an access list. If you cannot name them, you do not have residency; you have an invoke region.

Some platforms let you turn off or regionalise invocation logging. Some send metadata to a global control plane even when content stays put. Read both sentences in the doc.""",
   why="""On the job, auditors have learned to ask "where are the logs". Teams that only answered "inference is in-region" fail. This is now a standard question in bank questionnaires.

In interviews, volunteering log residency without being asked is a strong signal. Mention that traces are often the largest copy of prompt text and the least carefully placed.

Also mention redaction: if a log must leave, can you store hashes and metadata instead of text?""",
   how="""Inventory:

1. Platform invoke logs — enabled? region? content or metadata?
2. App traces — host and region.
3. Gateway logs if any.
4. Eval runner artefacts.
5. SIEM — does it ship raw prompts?

Example: you disabled platform prompt logging, ran traces on a Mumbai VM, and sent only metrics (counts, latency, model id) to a global SaaS. The questionnaire can say "prompt text stays in IN; metrics are global". That is a designed split, not an accident.""",
   failures="""1. **Assuming invoke region equals log region.**

2. **Hosted tracing in the US with full spans.**

3. **Debug mode that logs prompts to stdout, collected by a global agent.**

4. **SIEM 'just for security' copying everything abroad.""",
   line="""I treat traces as the main copy of the prompt. I place them on purpose, I know what the platform still logs, and I do not confuse inference region with log region.""",
   key_points=[
    "Confirm storage location of prompts, completions and traces, not only GPUs.",
    "Platform logs, app traces, evals and SIEM are separate stores.",
    "Disable or regionalise prompt logging when policy requires it.",
    "Metrics can leave when text cannot — design that split.",
    "Stdout debug is a store if an agent ships it.",
    "Read whether metadata still goes to a global control plane.",
   ],
   questions=[
    {"q": "Why is inference region not enough for residency?", "a": "Prompts are often stored again in platform logs, traces, evals and SIEMs that may live in another geography.", "kind": "recall"},
    {"q": "How can you use a global monitoring SaaS without sending prompt text?", "a": "Export metrics and identifiers (latency, tokens, model id, request id) and keep spans with text in-region. Verify with a canary string.", "kind": "apply"},
    {"q": "A canary prompt appears in a US SIEM. What do you do?", "a": "Treat it as a residency incident: stop the pipeline, purge if possible, and change the export to metadata-only or an in-region SIEM.", "kind": "debug"},
    {"q": "What do you ask the platform about its own logs?", "a": "Whether content is stored, where, for how long, who at the vendor can read it, and whether you can turn it off or regionalise it.", "kind": "apply"},
    {"q": "Why are traces often riskier than the invoke itself?", "a": "They persist longer, they are widely readable inside the company, and they are easy to ship to a SaaS by default.", "kind": "recall"},
   ],
   links=[
    {"title": "Amazon Bedrock logging", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html"},
    {"title": "Azure Monitor for Azure OpenAI", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/monitor-openai"},
   ],
  ),
  "cross-region-inference-exceptions": entry(
   what="""A **cross-region inference exception** is a dated permit to leave the home region for a named workload. It contains the **reason**, the **destination**, the **compensating controls**, and the **expiry**. Compensating controls might be: no raw PII (or a listed field set), extra approval, reduced retention, DLP, and a smaller traffic slice. An exception without expiry is a silent policy change.

This is for the rare case where in-region options fail a measured bar and the business accepts the legal risk. It is not a convenience path for "the US model feels smarter".""",
   why="""On the job, exceptions that are emails in a thread die with the inbox. A one-pager in the decision record can be reviewed, renewed or killed.

In interviews, showing that you would write an exception — rather than just enable the feature — is the governance reflex they want. Mention who signs (legal + security, not only the PM).

Also mention you would still keep an in-region fallback for when the exception expires or is withdrawn.""",
   how="""Template:

- Workload and data class
- Why in-region models fail (eval numbers, dated)
- Destination regions and product (e.g. Bedrock cross-region profile)
- Controls: field redaction, volume cap, extra logging, who can enable
- Expiry and review meeting
- Rollback: in-region model id already pinned

Example: a one-quarter exception for a research assistant on public filings, not on customer accounts, dest `us-east-1`, expires 31 March, owner = research lead. Customer-facing copilot is not on the exception.""",
   failures="""1. **Slack thumbs-up as approval.**

2. **No numbers.** "Quality is better" without evals.

3. **Exception applied to all traffic.**

4. **Expired six months ago, still on.""",
   line="""If I must leave region I write an exception: reason, destination, compensating controls, expiry and rollback. Convenience is not a reason. An expired exception is turned off.""",
   key_points=[
    "Exceptions are written, dated and owned — not Slack lore.",
    "Include reason with eval evidence, destination, controls and expiry.",
    "Scope to the smallest workload, not the whole app.",
    "Keep an in-region rollback pin.",
    "Legal and security sign; product cannot self-approve.",
    "Turn it off when it expires.",
   ],
   questions=[
    {"q": "What fields belong in a cross-region inference exception?", "a": "Workload, data class, eval evidence for why in-region fails, destination, compensating controls, expiry, approvers and rollback model.", "kind": "recall"},
    {"q": "An exception from last year is still routing 100% of prod abroad. What do you do?", "a": "Treat it as expired policy: stop or re-approve with new evidence, and move default traffic back in-region immediately if approval is lacking.", "kind": "debug"},
    {"q": "Why attach eval numbers to the exception?", "a": "So reviewers can see the gap is real and so you can withdraw the exception when an in-region model catches up.", "kind": "apply"},
    {"q": "Who should sign?", "a": "Legal and security (and the data owner). A PM urgency is not a signature.", "kind": "recall"},
    {"q": "What is a good compensating control for a short exception?", "a": "Strip or withhold the most sensitive fields, cap volume, shorten retention, and extra review of outputs — plus a hard end date.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock inference profiles", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html"},
   ],
  ),
  "training-opt-out-evidence": entry(
   what="""**Training-opt-out evidence** is the pair: the **contract clause** and the **console setting** that prove your prompts and outputs are not used to improve a foundation model. You keep both, dated, in the vendor packet. If either is missing, you do not have opt-out; you have a rumour.

Some products are opt-out, some are opt-in, some never train on API data, some train unless you are on a specific tier. Abuse monitoring may still retain samples. Write what is actually true.

When you change product (public API to Bedrock, or one Azure offering to another), you collect a new pair. Evidence does not travel between products.""",
   why="""On the job, this packet is asked for on every enterprise deal. In interviews, it is the concrete form of "do they train on our data". Show the two artefacts. Mention abuse-monitoring caveats so you do not overclaim.

It also protects you internally: a new environment created with default settings may have logging/training toggles reset. Evidence includes a periodic check that the toggle stayed put.""",
   how="""Store:

1. PDF of terms, highlighted, with URL and date.
2. Screenshot of the workspace/account toggle (or the statement that no toggle exists because the product never trains).
3. A quarterly job that re-screenshots or API-checks the setting.
4. Note on abuse monitoring.

Example: a new Azure resource was created for a hackathon and left on default logging. Your quarterly check flags it before it sees real data. That is the point of the check, not of the PDF alone.""",
   failures="""1. **Clause without toggle.**

2. **Toggle without clause** (you clicked something that is not the contractual control).

3. **One screenshot from 2023.**

4. **Assuming all SKUs inherit the same rule.""",
   line="""Opt-out evidence is the clause plus the setting, dated, for this product, checked again later. I do not reuse another product's packet, and I write down abuse-monitoring retention so we do not overclaim.""",
   key_points=[
    "Keep both the clause and the console setting, dated.",
    "Evidence does not transfer across products or SKUs.",
    "Re-check toggles; new resources reset defaults.",
    "Write abuse-monitoring caveats next to 'no training'.",
    "If no toggle exists, file the statement that the product never trains.",
    "Quarterly proof beats a one-time screenshot.",
   ],
   questions=[
    {"q": "What two artefacts prove training opt-out?", "a": "The dated official clause for that product and the console (or documented default) setting. Keep both.", "kind": "recall"},
    {"q": "A new workspace was created. Why might old evidence be invalid?", "a": "Toggles are per resource. Defaults may train or log. Re-check the new workspace before it sees real prompts.", "kind": "debug"},
    {"q": "The vendor says they never train on API data. What do you still file?", "a": "That official statement, dated, and any abuse-monitoring retention. You still need it in the packet.", "kind": "apply"},
    {"q": "Why a quarterly check?", "a": "Settings drift, new resources appear, and terms change. A 2023 screenshot is not a control.", "kind": "recall"},
    {"q": "Can you reuse public-API opt-out evidence for the managed platform?", "a": "No. Different product, different terms, different settings.", "kind": "apply"},
   ],
   links=[
    {"title": "Azure OpenAI data privacy", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/data-privacy-security"},
    {"title": "Amazon Bedrock data protection", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html"},
   ],
  ),
  "sector-overlay-for-finance-or-health": entry(
   what="""A **sector overlay** is the extra residency, logging, access and retention rules a **bank or hospital** (or insurer, or public sector) adds on top of the generic platform story. Examples: stricter in-country localization, longer immutable audit, named human access reviews, prohibition on certain subprocessors, mandatory DLP, segregation of production from research, and model-use policies (no medical advice, no unsupervised credit decision).

The platform does not ship these. You add them as controls on identity, network, logs and product behaviour. A hospital on Bedrock without an overlay is just a hospital sending notes to a model.

Overlays differ: a US HIPAA conversation is not an Indian hospital conversation is not a PCI conversation. Do not paste one overlay onto another sector.""",
   why="""On the job, sector reviews are where generic "we use Azure" dies. You will be asked about immutable logs, who in support can see prompts, and whether the model can take an automated decision. Prepare the overlay as a one-pager.

In interviews for fintech or health, naming two extra rules beyond generic residency shows you have sat in those reviews. Mention that product behaviour (a human in the loop) is part of the overlay, not only IAM.

Never invent a regulation. Speak in engineering controls and say legal owns the mapping.""",
   how="""Finance overlay sketch:

- In-country processing for customer data; no US eval SaaS.
- Immutable 7-year audit of who invoked what (maybe not the raw prompt).
- Dual control to change model pins.
- No automated credit denial without a documented human path.
- DLP on prompts leaving the bank's SIEM.

Health overlay sketch:

- Medical text in-region only; BAAs/DPAs on file.
- Access logs for every human who viewed a prompt.
- Product: model drafts, clinician approves; the model is not the clinician.
- Shorter prompt retention than finance in some orgs; longer medical-record rules in others — do not guess, ask.

Write the overlay with security; attach it to the platform decision record.""",
   failures="""1. **Generic cloud compliance as sector compliance.**

2. **Pasting HIPAA language onto an Indian hospital.**

3. **Ignoring the human-in-the-loop product rule.**

4. **Letting research notebooks use production medical text.""",
   line="""Banks and hospitals add an overlay: stricter residency, immutable who-invoked-what, tighter human access, and product rules about automated decisions. The platform does not include that overlay. I write it with security and I do not paste another country's law.""",
   key_points=[
    "Sector overlays add rules on top of generic platform controls.",
    "Finance often wants immutable invoke audit and no unsupervised decisions.",
    "Health often wants tighter human access and a clinician in the loop.",
    "Do not paste one regime's language onto another.",
    "Research and production text must be segregated.",
    "Legal maps law; you map controls.",
   ],
   questions=[
    {"q": "Name extra rules a bank might add on top of a generic Bedrock setup.", "a": "Stricter in-country processing, immutable invoke audit, dual control on pin changes, DLP, and a ban on unsupervised credit decisions.", "kind": "recall"},
    {"q": "A hospital uses the model to send discharge advice directly to patients. What overlay is missing?", "a": "A product control: the model should draft, a clinician should approve. Sector rules are not only IAM.", "kind": "apply"},
    {"q": "Why not reuse a HIPAA checklist for an Indian hospital?", "a": "Different law, different transfer rules, different contracts. Reuse the idea of an overlay, not the text.", "kind": "recall"},
    {"q": "Researchers want production claims text in a public-API notebook. Response?", "a": "No. Sector overlay forbids that path. Give them synthetic or in-boundary data and the platform lane.", "kind": "debug"},
    {"q": "What belongs on the one-page overlay?", "a": "Residency, logging/immutability, human access, subprocessors, decision automation rules, and who owns each control.", "kind": "apply"},
   ],
   links=[
    {"title": "Azure OpenAI data privacy", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/data-privacy-security"},
   ],
  ),
 }
}
