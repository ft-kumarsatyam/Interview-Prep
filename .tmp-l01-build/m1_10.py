from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-10": {
  "closed-and-api-models": entry(
   what="""**Closed / API models** are weights you **cannot download**. You call a vendor HTTP API. You buy **frontier capability**, **convenience**, and **someone else's uptime**. You pay with **token prices**, **data leaving your boundary** (unless a private link exists), **vendor dependence**, and **less control** of version, routing, and features.

This is path one of three (API, managed cloud, open weights). It is the fastest way to a prototype and often the right path for unregulated text. It is the wrong path when the contract forbids it.

"We use OpenAI" is a path, not an architecture.""",
   why="""Interviewers want the trade-off list, not a brand war. On the job this is the first column of the decision table. They will ask what you lose (weights, pin certainty unless you snapshot, privacy by default).

They will ask when you would still pick it: speed, best quality, no GPU ops.""",
   how="""Pick API when: data class allows it, you need the newest models this month, you have two engineers, and a DPA exists if required.

Do not pick it when: prompts cannot leave the region, you must air-gap, or the token bill at volume already exceeds a GPU.

Wrap the client. Pin a snapshot. Keep evals. That wrap is how you leave later.

Write the axes: capability, convenience, privacy, lock-in, control. Score the project. Do not score your favourite blog.""",
   failures="""1. **Path as architecture.**

2. **No DPA** on regulated text.

3. **No wrapper** — 400 call sites.

4. **No snapshot pin.**""",
   line="""Closed APIs buy capability and convenience. I pay with privacy, lock-in and less control. I pick that path when the data class allows it, I wrap the client, and I pin a snapshot.""",
   key_points=[
    "You call weights you cannot download.",
    "Gains: capability, speed, no GPU ops.",
    "Costs: privacy, lock-in, less control.",
    "A path, not an architecture.",
    "Wrap and pin.",
    "DPA if the data class needs it.",
   ],
   questions=[
    q("recall", "What do you gain and lose with a closed API model?", "Gain frontier quality and low ops. Lose default privacy, some control of versions, and easy exit if you did not wrap the client."),
    q("apply", "When is the public API the right first path?", "Unregulated prototype, two engineers, need the newest model this month, and you will wrap the client."),
    q("debug", "A bank POC used the public API with claims text. What was wrong?", "Data class. Move to a managed platform or in-boundary hosting. Keep the prompts and evals."),
    q("apply", "What do you wrap?", "A thin client: model id, messages, timeouts, usage logs. Application code never imports the vendor SDK everywhere."),
    q("recall", "Why is 'we use Vendor X' a weak architecture line?", "It names a path. The architecture is data class, wrapper, evals, and an exit."),
   ],
   links=[
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
    {"title": "Anthropic: getting started", "url": "https://docs.anthropic.com/en/docs/welcome"},
   ],
  ),
  "open-weight-models": entry(
   what="""**Open-weight** models ship a **downloadable checkpoint** (under a licence). You can **self-host**, **inspect**, sometimes **fine-tune**, and keep **prompts in your boundary** if you actually operate the host. You pay with **GPUs**, **serving software**, **on-call**, **quality lag** versus the frontier, and **licence homework**.

Open weight is not open source in the OSI sense by default. It is not private if you send the prompt to a public inference host.

This is path three. It is control, not a free frontier model.""",
   why="""Interviewers want the trade-off and the "open ≠ private" line. On the job this is the column for regulated or high-volume simple tasks. They will ask what you need to host an 8B vs a 70B (one GPU vs many).

They will ask about licences (later item).""",
   how="""Pick open weights when: you must stay in-boundary, you will fine-tune, or the token volume makes GPUs cheaper *and* you can staff serving.

Do not pick them when: you need frontier quality next week and you have no GPU story.

Start with an 8B instruct on a known serving stack. Eval. Only then climb.

If you call Together/Groq/Fireworks, you are on a host — still a vendor — with more checkpoint control. Say that out loud.""",
   failures="""1. **"Open" as private.**

2. **"We will just host 70B"** with no owner.

3. **Ignoring the licence.**

4. **Expecting frontier quality.**""",
   line="""Open weights are a checkpoint you can host or buy as a host. I get control and a path to privacy if I operate the boundary. I pay in GPUs, ops and licence work. Open is not automatically private or free.""",
   key_points=[
    "Downloadable checkpoint, not necessarily OSI open source.",
    "Privacy only if you (or your VPC host) stay in-boundary.",
    "You own serving and quality lag.",
    "Licence is homework.",
    "8B first, then climb.",
    "A public inference host is still a vendor.",
   ],
   questions=[
    q("recall", "What is an open-weight model?", "A checkpoint you can download under a licence and run yourself or on a host. It is not automatically open source or private."),
    q("apply", "When do you self-host?", "When the data must stay in-boundary or the volume/ops math works *and* someone owns the GPUs. Not as a reflex."),
    q("debug", "A team says they are private because they use Llama on a public host. What is missing?", "The prompts still leave. Open weights without operating the host are not a boundary."),
    q("apply", "What do you try first, 8B or 70B?", "8B instruct on a known stack, eval, then climb. 70B is an ops project."),
    q("recall", "Name two costs of open weights.", "Hardware, serving software, on-call, quality lag, licence review."),
   ],
   links=[
    {"title": "Hugging Face: models hub", "url": "https://huggingface.co/docs/hub/en/models-the-hub"},
    {"title": "Hugging Face: repository licences", "url": "https://huggingface.co/docs/hub/en/repositories-licenses"},
   ],
  ),
  "managed-platforms-hosted-open-weights": entry(
   what="""The **third path** sits between a public lab API and a GPU you own. **Managed platforms** (Amazon Bedrock, Google Vertex AI, Azure AI Foundry) run **closed and some open** models **in your cloud account** with IAM, VPC, and a bill you already have. **Inference hosts** run open weights for you with no hardware of your own.

You get more **identity, region, and contract** control than a public API, and less **ops** than self-host. You still have a vendor. You still wrap the client.

This is how most enterprises first "do Llama" without buying NVIDIA on-call.""",
   why="""Interviewers at IT-services and enterprise shops treat Bedrock/Vertex/Foundry as a filter. On the job this is the path that unblocks a regulated POC. They want you to name the three paths and put this one in the middle.

They will ask what you still do not get (the newest lab model on day one; full control of kernels).""",
   how="""Insurer example: claims text, India region, existing AWS account → Bedrock in ap-south-1 if the model exists there, private link, IAM. Public API fails the region. Self-host 70B fails the staff.

Prototype on the public API with fake data if you must, then move the wrapper to the platform.

Hosted open weights: good for a 8B classifier at volume. Read the host's retention and the model's licence.""",
   failures="""1. **Skipping this path** and jumping to self-host.

2. **Assuming every model is on Bedrock day one.**

3. **No private link** when the questionnaire asked for one.

4. **Treating the platform as 'on-prem'.**""",
   line="""Managed platforms and inference hosts are the middle path: models in your cloud account or a host, without you owning GPUs. I pick them when identity, region and contract matter and I still do not want CUDA on-call.""",
   key_points=[
    "Middle path: more control than public API, less ops than self-host.",
    "Bedrock / Vertex / Foundry: in-account, IAM, region.",
    "Inference hosts: open weights, their GPUs.",
    "Still a vendor; still wrap.",
    "Not on-prem unless you make it so.",
    "Model catalogue lags the lab.",
   ],
   questions=[
    q("recall", "What is the third path between a public API and self-host?", "Managed cloud platforms in your account, and inference hosts that serve open weights for you."),
    q("apply", "A bank has an AWS account and a no-public-API rule. Where do you start?", "Bedrock (or equivalent) in-region with IAM and a private link, after the model exists there. Wrapper stays yours."),
    q("debug", "A slide says 'on-prem' but they call Bedrock. Correct the language.", "The model runs in the cloud account. That may meet the questionnaire. It is not a box in their DC unless they chose that."),
    q("apply", "When is a serverless open-weight host enough?", "When the licence allows it, the data class allows another processor, and you do not want GPUs. Pin the slug and eval."),
    q("recall", "What do you still wrap?", "The invoke call. Evals and prompts stay portable when the path changes."),
   ],
   links=[
    {"title": "Amazon Bedrock user guide", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html"},
    {"title": "Vertex AI generative AI", "url": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview"},
    {"title": "Azure AI Foundry", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry"},
   ],
  ),
  "other-useful-distinctions": entry(
   what="""Other axes besides path: **small vs large**, **dense vs MoE**, **general vs specialised** (code, embed, rerank, vision), **reasoning vs not**, **text-only vs multimodal**. A shortlist that only says "GPT vs Llama" is incomplete. A 8B embedder is not a chatbot. A reasoning model is not a classifier.

Write the axes you care about for *this* workload. Do not enumerate the industry.

Multimodal means the input (or output) is not only text. It has a different price and failure mode (it can misread a screenshot).""",
   why="""Interviewers want you to add two or three of these without being asked. On the job this is how you avoid using a giant chat model as an embedder.

They will ask for an example of specialised (embedding, code, rerank).""",
   how="""Ticket product:

- Classify: small instruct, not reasoning
- Embed for search: embedding model
- Answer: general or reasoning if hard, plus RAG
- Screenshot of a bill: multimodal or an OCR tool

Do not send screenshots to a text-only model and hope.

When you compare two "70B"s, say dense vs MoE and reasoning vs not. Those change the bill.""",
   failures="""1. **One model for every axis.**

2. **Chat model as embedder.**

3. **Text-only on screenshots.**

4. **Ignoring reasoning as a class.**""",
   line="""I also distinguish small/large, dense/MoE, general/specialised, reasoning, and modality. A shortlist that only names brands is incomplete. I pick the axis that the workload actually uses.""",
   key_points=[
    "Size, density, speciality, reasoning, modality.",
    "Embedders, rerankers, code models are different tools.",
    "Reasoning is a class, not a brand.",
    "Multimodal has its own errors and prices.",
    "One chat model for everything is lazy.",
    "Name the axes on the shortlist.",
   ],
   questions=[
    q("recall", "Name four useful distinctions besides closed vs open.", "Small vs large, dense vs MoE, general vs specialised, reasoning vs not, text vs multimodal."),
    q("apply", "Which model class embeds tickets for search?", "An embedding model, not a chat completion. Different training and interface."),
    q("debug", "A team sends receipt photos to a text-only model. What should they use?", "A multimodal model or an OCR tool, then a text model on the extracted fields."),
    q("apply", "Why does dense vs MoE belong on a 70B comparison?", "It changes memory, cost per token, and serving. The billions are not the same billions."),
    q("recall", "Is a reasoning model a good default classifier?", "Usually no. Extra think, extra cost, little lift."),
   ],
   links=[
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
    {"title": "Hugging Face: tasks", "url": "https://huggingface.co/docs/transformers/en/task_summary"},
   ],
  ),
  "there-is-no-universally-best-llm": entry(
   what="""There is **no universally best LLM**. The best model is the one that **wins your workload** on **quality, latency, cost, context, modality, privacy, and features** — the eight dimensions of M1.12. A winner on a public chat arena can lose your JSON extract. A winner on your extract can lose a planning task.

Internalise this or you will chase leaderboards and vendor keynotes forever.

The sentence is a principle, not a shrug. You still pick, with an eval.""",
   why="""Interviewers listen for this sentence. On the job it is how you end a religious argument. They will ask "so how do you pick" — point at the workflow in M1.12.

They will punish "I always use X".""",
   how="""When someone asks for the best model, ask "for which task". Then: shortlist 2–3, run the golden set, pick.

Keep two winners if the tasks disagree (cheap classify, expensive plan). A fleet is normal.

Write the principle at the top of the model-choice doc so the next keynote does not overturn it without a measurement.""",
   failures="""1. **A company-wide favourite** with no eval.

2. **Arena rank as destiny.**

3. **One model for every task.**

4. **Shrug** — you still must pick.""",
   line="""There is no universally best LLM. The best is the one that wins this workload on our dimensions. I shortlist, I measure, I will run a fleet if tasks disagree. I will not pick from a keynote.""",
   key_points=[
    "No global winner.",
    "Best = wins this workload.",
    "Arena rank does not transfer.",
    "Fleets are normal.",
    "Still pick, with an eval.",
    "Write the principle down.",
   ],
   questions=[
    q("recall", "Is there a universally best LLM?", "No. The best model depends on the workload and the constraints."),
    q("apply", "Someone asks you to standardise on last week's arena winner. What do you do?", "Run our golden set. If it loses JSON extract, keep the extract model. Maybe use the winner on chat only."),
    q("debug", "A company has one approved model for classify, plan, and embed. Symptom?", "Two of those tasks are probably overpaying or underperforming. Split the fleet."),
    q("apply", "How do you end a brand argument in a meeting?", "Write the task and the dimensions on the board. Schedule the eval. No winner until the table is filled."),
    q("recall", "Does 'no best' mean 'no decision'?", "No. It means the decision is local and measured."),
   ],
   links=[
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
    {"title": "Hugging Face Open LLM leaderboard", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
   ],
  ),
  "knowledge-cutoffs": entry(
   what="""A model's **knowledge stops at its training cutoff** (plus whatever post-train mix they added). **Anything newer** must arrive through **context, retrieval, or tools**. The cutoff is a date on the card, often fuzzy. It is not "the model knows 2024" as a personality.

A cutoff is why the model invents last week's CEO or a sports score. It is also why you do not use it as a news product without a tool.

Some products browse. That is a tool, not a later cutoff of the weights.""",
   why="""Interviewers will ask why the model missed a 2025 API. On the job this is the freshness design. They want: cutoff + retrieve/tools, not a bigger model.

They will ask where you find the cutoff (card, vendor doc — and still verify).""",
   how="""Read the card. Treat the date as "do not trust world facts after this without a source".

Product: news, prices, docs, release notes → retrieve or browse. Evergreen style and language → weights may suffice.

When the vendor updates the cutoff, re-eval; behaviour changes too.

Do not put "knowledge cutoff: 2023" in the system prompt as your only freshness strategy. The model will still guess.""",
   failures="""1. **Guessing after the cutoff.**

2. **A bigger model as freshness.**

3. **Prompt-only cutoff warnings.**

4. **Confusing browse with weights.**""",
   line="""Weights have a cutoff. Newer facts come from context, retrieval or tools. I do not ask a bigger model for last night's news, and I do not treat browse as a later cutoff of the file.""",
   key_points=[
    "Cutoff = end of the training mix.",
    "Newer facts need context, RAG, or tools.",
    "Browse is a tool.",
    "Bigger ≠ fresher.",
    "Re-eval when the cutoff moves.",
    "A prompt warning is not a strategy.",
   ],
   questions=[
    q("recall", "What is a knowledge cutoff?", "The date after which the frozen weights were not trained on the world. Newer facts must be supplied at inference."),
    q("apply", "How do you answer 'who won last night'?", "A search or stats tool, then the model writes the sentence. Not the weights."),
    q("debug", "A PM wants a bigger model so it 'knows 2026'. What do you say?", "Scale is not a time machine. Retrieve or browse."),
    q("apply", "Where do you look up the cutoff?", "The model card or vendor doc, then treat it as approximate. Still ground anything that must be right."),
    q("recall", "Does a browse-enabled product have a later cutoff in the weights?", "No. It has a tool. The file is still frozen."),
   ],
   links=[
    {"title": "OpenAI: models (cutoff notes)", "url": f"{OAI}/models"},
    {"title": "Anthropic: models", "url": "https://docs.anthropic.com/en/docs/about-claude/models"},
   ],
  ),
  "versions-snapshots-deprecations": entry(
   what="""Model **names** move. **`gpt-x`** today may be a **different snapshot** tomorrow. Vendors **deprecate** ids. **Pin a dated snapshot** in production (`gpt-x-2025-01-15` or the platform's version). **Re-test** when you move. Aliases are for demos and for a controlled upgrade path, not for an unattended hot path.

Deprecation is a calendar event. Own it like you own a library bump.

This is the same idea as image tags versus latest.""",
   why="""On the job, a silent alias move is a quality incident. Interviewers want pin + re-eval. They will ask what you do when a deprecation mail arrives (schedule the eval, do not ignore).

They will punish "we just use the latest".""",
   how="""Config: `model: gpt-x-2025-01-15` in prod. `model: gpt-x` in a nightly shadow that compares the golden set. Promote when the delta is acceptable.

When the mail says 90 days to deprecation: ticket, eval, migrate, do not discover it on the error dashboard.

Log the resolved snapshot if the API returns it. Store it with the request id so a bug is replayable.""",
   failures="""1. **Alias in prod.**

2. **Ignoring deprecation mail.**

3. **No golden set** so you cannot re-test.

4. **No logged snapshot.**""",
   line="""I pin a dated snapshot in production. Aliases move. When a version changes I re-run the golden set. Deprecation is a scheduled migration, not a surprise 400.""",
   key_points=[
    "Aliases move; snapshots pin.",
    "Deprecation is a calendar event.",
    "Re-eval on every move.",
    "Shadow the new alias.",
    "Log the resolved id.",
    "Same lesson as Docker latest.",
   ],
   questions=[
    q("recall", "Why pin a snapshot?", "The friendly name can point at a new function. A dated id stays put until you move."),
    q("apply", "A deprecation email lands. What is the process?", "Ticket, run the golden set on the replacement, compare, migrate, then drop the old id before the deadline."),
    q("debug", "Quality dropped on Tuesday and nobody shipped. Cause?", "An alias moved. Pin, log the snapshot, shadow next time."),
    q("apply", "Where do you use the alias?", "In a controlled shadow or a staging experiment, not on the unattended hot path."),
    q("recall", "What do you log besides the alias?", "The resolved snapshot if the API provides it, plus your config value."),
   ],
   links=[
    {"title": "OpenAI: deprecations", "url": "https://platform.openai.com/docs/deprecations"},
    {"title": "Anthropic: models", "url": "https://docs.anthropic.com/en/docs/about-claude/models"},
   ],
  ),
  "open-weight-licensing": entry(
   what="""**Read the licence** before you build on an open-weight model. **Permissive** (Apache, MIT-like) is not the same as **restricted-use** (no commercial, no certain industries, share-alike, acceptable-use). **Llama-style** community licences often allow commercial use with **conditions** (user caps, attribution). **Non-commercial** weights cannot go in a paid product.

"Open" on a card is not permission. Legal should see the file, not a tweet.

Outputs may have their own terms (no training on the output). That is a later item too.""",
   why="""On the job, a launch dies when legal finds a non-commercial clause. Interviewers want you to say "I read the licence" and name two kinds. They will ask who signs it (legal, not the intern who downloaded the weights).

They will punish "Hugging Face means we can use it".""",
   how="""Before the prototype becomes a product: copy the licence text into the ticket, highlight commercial, territorial, user-count, and attribution clauses. Legal signs.

If you cannot accept the clause, pick another checkpoint or an API whose terms you already have.

Do not fine-tune a non-commercial base into a commercial child and hope. The base licence usually still applies.

Attribution: if required, put it in the docs, not only in a comment.""",
   failures="""1. **Shipping without a read.**

2. **Hugging Face as a licence.**

3. **Ignoring user-count clauses.**

4. **Fine-tune to launder a licence.**""",
   line="""I read the open-weight licence before we build. Permissive, restricted, and non-commercial are different. Hugging Face is a host, not a permission slip. Legal signs, not the download button.""",
   key_points=[
    "Open weight ≠ permission.",
    "Permissive vs restricted vs non-commercial.",
    "Some community licences have user caps.",
    "Legal reads the file.",
    "Fine-tunes inherit the base terms unless told otherwise.",
    "HF is a host.",
   ],
   questions=[
    q("recall", "Why check an open-weight licence?", "Terms differ: commercial use, industry bans, user caps, attribution. Open is not a single permission."),
    q("apply", "Who signs off?", "Legal, with the licence text in the ticket. Not the engineer who ran git lfs."),
    q("debug", "You fine-tuned a non-commercial checkpoint for a paid app. Problem?", "The base terms usually still bind the child. Pick a different base or a licensed API."),
    q("apply", "What do you highlight for legal?", "Commercial use, territory, user-count, attribution, acceptable use, and any output-training bans."),
    q("recall", "Does a Hugging Face download imply a licence grant?", "No. The repo's licence file does. Some repos are research-only."),
   ],
   links=[
    {"title": "Hugging Face: model licences", "url": "https://huggingface.co/docs/hub/en/repositories-licenses"},
    {"title": "Open source initiative licences (reference)", "url": "https://opensource.org/licenses"},
   ],
  ),
  "deprecation-and-snapshot-pins": entry(
   what="""**Pin a dated snapshot in production; aliases move under you.** This is the operational restatement of versions and deprecations. The pin lives in **config**, the **shadow** lives in **CI or a cron**, and the **calendar** lives in a **ticket** when the vendor announces a kill date.

If you cannot name the snapshot running in prod right now, you are on an alias.

Two items in this module sound alike on purpose: one is the landscape fact, this is the habit.""",
   why="""Interviewers may ask twice to see if you operationalise it. On the job this is a checklist item next to `uv.lock` and image digests.

They want the config line, not the philosophy.""",
   how="""`MODEL_ID=claude-...-2025xxxx` in the platform secret. A weekly job calls the alias, runs n golden items, posts a diff. Humans promote.

On-call runbook: if quality cliffs, check whether the pin is what you think (`curl` the config, log line). Do not "restart to pick up latest".

When you must move, change the pin in one PR with the eval attached.""",
   failures="""1. **Pin in a notebook** not in prod config.

2. **No shadow.**

3. **Restart to get latest** as a fix.

4. **Unknown snapshot** on the incident call.""",
   line="""Prod config holds a dated snapshot. A shadow watches the alias. I can name the id on the incident call. I do not restart to pick up latest.""",
   key_points=[
    "Pin in prod config, not a notebook.",
    "Shadow the alias.",
    "Name the id on the incident call.",
    "Move via a PR with eval.",
    "Do not restart for 'latest'.",
    "Same habit as lockfiles and image digests.",
   ],
   questions=[
    q("apply", "Where does the pin live?", "In production config / secrets, logged on every request. Not only in a slide."),
    q("recall", "What watches the moving alias?", "A shadow job on the golden set that posts a diff. Humans promote."),
    q("debug", "On-call restarts the service 'to pick up the new model' and things get worse. Why?", "They were on an alias or a floating tag. Restarts can move you. Pins should not change on restart."),
    q("apply", "What accompanies a pin-change PR?", "The golden-set delta and a rollback note (the previous id)."),
    q("recall", "How is this like uv.lock?", "Both freeze a resolved artefact so Tuesday's machine matches Monday's."),
   ],
   links=[
    {"title": "OpenAI: deprecations", "url": "https://platform.openai.com/docs/deprecations"},
    {"title": "Anthropic: models", "url": "https://docs.anthropic.com/en/docs/about-claude/models"},
   ],
  ),
  "license-vs-weights-vs-api-terms": entry(
   what="""Three documents. The **weight licence** (if you download). The **API terms** (if you call). The **output / usage policy** (what you may do with completions, including **no training on outputs** and acceptable use). **Open weights can still forbid commercial use or training on outputs.** An API can forbid sending their outputs into another model. These are **independent**.

You can be fine on the weights and dead on the API terms, or the reverse.

Read the one that matches the path you actually take — and the output clause either way.""",
   why="""Interviewers will ask whether open weights mean you can train a student model on the teacher's outputs (often no). On the job this is the distillation / synthetic-data conversation. They want three documents, not one vibe.

They will punish "the weights are Apache so we can do anything with the API too".""",
   how="""Path API: DPA + API terms + usage policy. Path open: weight licence + host terms if any + output clause. Path platform: the cloud agreement + the model provider's pass-through terms.

Synthetic data: if the teacher forbids training on outputs, do not distill. Pick a teacher whose terms allow it, or use your own gold.

Keep a one-page "what we may do" in the repo for engineers who will otherwise paste completions into a train set.""",
   failures="""1. **One document for three questions.**

2. **Distilling against the terms.**

3. **Apache weights + ignored host terms.**

4. **No written 'what we may do'.**""",
   line="""Licence, weights, and API terms are different papers. Open weights can still ban commercial use or training on outputs. I read the paper that matches our path, and I do not distill against the output clause.""",
   key_points=[
    "Three docs: weight licence, API terms, output policy.",
    "They do not inherit automatically.",
    "Open weights can still restrict commercial use and distillation.",
    "API outputs often cannot train other models.",
    "Write what we may do.",
    "Path decides which paper is binding.",
   ],
   questions=[
    q("recall", "Why are licence, weights and API terms different?", "One governs the checkpoint file, one the HTTP service, one what you may do with outputs. They can disagree."),
    q("apply", "You want to distill a student from a closed API. First step?", "Read the output / usage terms. If they ban training on outputs, stop or pick another teacher."),
    q("debug", "Weights are Apache; the host TOS bans your industry. Can you ship?", "Not on that host. Run elsewhere or pick another host. Apache does not override the host contract."),
    q("apply", "What do you put in the engineer one-pager?", "Whether we may train on outputs, commercial limits, and which path we are on. Link the real terms."),
    q("recall", "Does an open-weight Apache file let you ignore the API you also call?", "No. The API terms still bind that path."),
   ],
   links=[
    {"title": "OpenAI: terms / usage policies", "url": "https://openai.com/policies/usage-policies"},
    {"title": "Hugging Face: licences", "url": "https://huggingface.co/docs/hub/en/repositories-licenses"},
   ],
  ),
 }
}
