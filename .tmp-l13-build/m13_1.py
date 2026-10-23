from helper import note

HF_FT = {"title": "Hugging Face: fine-tuning concepts", "url": "https://huggingface.co/docs/transformers/en/training"}
OA_FT = {"title": "OpenAI: fine-tuning guide", "url": "https://platform.openai.com/docs/guides/fine-tuning"}

NODES = {
    "fine-tuning-as-the-costliest-option": note(
        what="""Fine-tuning updates a model's weights on your labelled examples. It sits at the top of a cost ladder: a better prompt, few-shot demonstrations, retrieval, a tool call, a stronger base model, then a tune. Each rung costs more money and more calendar time, and each rung is harder to undo.

A prompt change is a pull request. A retrieval change is a document edit. A tune is a dataset, a training job, an eval harness, a serving path, and a retraining plan when the base model is retired. The GPU invoice is the visible line; the hidden line is the people who collect, clean, and re-judge examples every quarter.

Treat the ladder as a decision procedure, not a vibe. You climb a rung only when the cheaper one has a named, measured failure that it cannot close. Interviewers who say "should we fine-tune?" are testing whether you reach for weights first or last.""",
        why="""On the job, most "we should fine-tune" threads are a reaction to a demo that looked sloppy. The cheap work — rewriting the system prompt, adding three examples, retrieving the policy, calling a price API — has not been done, or has been done once without measurement. Shipping a tune in that state locks the team into a model version and a data pipeline they did not budget.

In interviews the question is almost always "fine-tuning versus RAG". The junior answer names both. The senior answer puts them on a ladder, prices the full cost, and refuses the tune when the failure is missing facts. Hiring managers also use "fine-tuning" as a job-description keyword; they rarely want you to have trained a 70B model. They want you to know when not to.""",
        how="""Write the options as a table before anyone books a GPU.

1. Prompt and few-shot: hours, reversible, no new serving path.
2. Retrieval or a tool: days, updates by editing data, can cite and filter.
3. Stronger or cheaper base model: a config change and a re-eval.
4. Fine-tune: weeks of data work, a training recipe, hosted weights, a retrain when the base moves.

Example. A support bot quotes last quarter's shipping fees. The product lead says "fine-tune on the help centre". You run the ladder: the prompted model with the current fee table retrieved at request time scores 94% on a 200-row fee set; the same model without retrieval scores 61%. There is no residual style problem. You do not open a training job. You ship retrieval and a weekly crawl of the fee table.

A second example, where a tune is the right next cost. A ticket router must emit one of forty house labels in a strict JSON shape. The best prompt still drifts on ten of the labels after retrieval of the taxonomy. You have 4,000 labelled tickets and a held-out set. Now the residual error is behaviour, the data exists, and the cost of a small LoRA is justified against the volume of calls.""",
        fails="""1. **Tuning as seriousness.** The team trains because it feels like real ML. A week later a three-line prompt change matches the tune on the same set. The adapter is now a liability: it must be served, versioned, and retrained.

2. **Ignoring the serving and retrain tax.** The first run is cheap. The next base-model deprecation is not. If you did not put "retrain twice a year" in the estimate, you underquoted.

3. **Mixing knowledge into the tune.** Weights cannot cite, cannot respect per-user ACLs, and go stale. The model then sounds more confident about last year's policy.""",
        line="Fine-tuning is the last, most expensive, least reversible rung after prompts, retrieval, tools, and a better base. I price data, evals, serving, and the next retrain before I agree to train, and I only climb when a measured residual error is about behaviour, not facts.",
        kps=[
            "Climb prompting, retrieval, tools, then a stronger base before a tune.",
            "The real cost is data, evals, serving, and retraining, not the GPU hour.",
            "Prompt and retrieval edits reverse in a day; weight changes do not.",
            "Tune only for a named residual failure the cheaper rungs cannot close.",
            "Interviewers want the ladder and a refusal, not a training war story.",
            "A tune that bakes changing facts will go stale and cannot cite.",
        ],
        qs=[
            {"q": "Name the cheaper rungs you try before fine-tuning and why they come first.", "a": "A better prompt and few-shot examples, retrieval or a tool for facts, and a stronger or cheaper base model. They are faster, reversible, and do not pin you to one checkpoint. Fine-tuning is last because it needs data, evals, serving, and a retrain plan.", "kind": "recall"},
            {"q": "A chatbot quotes outdated shipping fees. A lead wants to fine-tune weekly on the help centre. What do you do?", "a": "Refuse the tune. Fees are changing knowledge. Retrieve the live fee table or call a pricing tool, measure on a held-out fee set, and only consider a tune if a style or format gap remains after retrieval works.", "kind": "apply"},
            {"q": "A one-day LoRA run 'fixed' format drift, then a prompt change matches it on the same set. What was wasted?", "a": "The serving path, the adapter version, and the future retrain. The residual error was still a prompt problem. You now own weights you did not need. Keep the prompt, delete or freeze the adapter, and write the cheaper baseline into the decision record.", "kind": "debug"},
            {"q": "Why is the GPU invoice a poor estimate of a tune's cost?", "a": "Curation, labelling, the eval harness, hosting a custom model, and retraining when the base is replaced usually dwarf a single run. Those costs recur. A $40 training job can become a quarter of an engineer's time.", "kind": "recall"},
            {"q": "How do you decide a combination of retrieval plus a small tune is cheaper than a giant prompted model?", "a": "Measure the prompted giant and the retrieved-plus-tuned small model on the same held-out set for quality, latency, and cost per thousand requests. Ship the mix only if quality holds and unit cost or latency drops enough to pay for data and retrains.", "kind": "apply"},
        ],
        links=[OA_FT, HF_FT],
    ),
    "what-fine-tuning-is-good-for": note(
        what="""Fine-tuning is a behaviour transplant. It is good at changing **how** a model answers — tone, house format, a closed label set, a house template — and at shrinking a long instruction into the weights so each call spends fewer prompt tokens. It is also the standard way to **distil** a large teacher's style into a smaller student you can host.

It is not a knowledge pump. A few thousand pairs will not reliably install a wiki, and they will not stay current. The jobs that fit have a stable target you can write down: "always answer as this brand", "always emit this JSON", "always pick one of these forty labels", "always refuse like this".

A useful test: if you can describe the desired mapping in one page and collect a few hundred clean demonstrations of that mapping, a tune can beat a long prompt. If the mapping is "know whatever is in the CMS this week", you want retrieval.""",
        why="""On the job you will be asked to make a cheap model act like an expensive one on a narrow slice of traffic. That is a tune or a distillation, not a bigger prompt. Ticket routing, medical-coding-style label sets, brand voice, and "fill this incident template" are the tickets that actually pay for data work.

In interviews, "what is fine-tuning good for?" is a filter. The expected phrase is **style and format, not facts**. Then they want a concrete example with volume, a closed label set, and a cost target. If you only say "customising the model" you sound like a brochure.""",
        how="""Pick a task with (1) a written spec, (2) a closed or highly regular output, (3) enough labelled examples, (4) enough volume that prompt tokens or a frontier API bill matter.

Example. A support org has forty ticket labels and 6,000 historical tickets. The prompted frontier model is 91% accurate but costs too much at 80k tickets a day and sometimes invents a forty-first label. You write the label spec, clean the 6,000 rows, hold out 800, and train a 3B LoRA. Held-out accuracy is 90%, invalid labels drop to near zero, and cost per thousand tickets falls by an order of magnitude (illustrative). The tune paid for itself in format reliability and unit cost, not in "knowing the product".

A second good use: a 1,800-token house style guide in every prompt. After a tune on 800 edited replies, you drop the guide to a short reminder. Latency and cost fall; tone holds on the eval set.""",
        fails="""1. **Unstable target.** The brand voice changes every campaign, or the label set is still being invented. The model learns last month's politics.

2. **No volume, no savings.** A ten-call-a-day internal tool does not repay data work. Keep the long prompt.

3. **Calling distillation a knowledge install.** The student copies the teacher's manner and its mistakes. You still need an eval that is not the teacher's own labels.""",
        line="Fine-tuning is for stable behaviour: tone, formats, closed labels, shorter prompts, and distilling a big model into a cheap one. I use it when I can write the mapping and measure it, not when I need facts that change.",
        kps=[
            "Tuning changes how a model answers, not what it knows.",
            "Best fits: tone, strict formats, closed labels, prompt shortening, distillation.",
            "The task needs a written spec and a stable mapping.",
            "Volume plus a cheaper student is a common business case.",
            "A long house style guide is a candidate to bake into weights.",
            "If the CMS changes weekly, retrieval still owns the facts.",
        ],
        qs=[
            {"q": "List four jobs where fine-tuning is a better fit than retrieval.", "a": "Consistent brand tone, a strict JSON or house template, a closed classification or extraction schema, and distilling a large model into a smaller hosted one. Prompt shortening when a long instruction is stable also fits.", "kind": "recall"},
            {"q": "How would you justify a 3B LoRA for forty-way ticket routing?", "a": "High volume, a fixed label set, thousands of labelled tickets, and a cost or latency target. Compare the LoRA to the prompted frontier model on a held-out set for accuracy and invalid-label rate; ship if quality is close and unit cost drops.", "kind": "apply"},
            {"q": "A PM wants to tune so the bot 'knows our 200-page product manual'. What do you say the tune is actually good for here?", "a": "Nothing about the manual's facts. If they also need a house answer shape or tone, that slice can be tuned after retrieval supplies the page. The manual itself stays in a corpus you can edit.", "kind": "debug"},
            {"q": "Why does baking a 1,800-token style guide into a tune save money?", "a": "Those tokens are paid on every call. After the behaviour lives in the weights you send a short reminder. You still keep a few eval examples of the tone so you notice drift.", "kind": "recall"},
            {"q": "When is distillation the reason to tune rather than 'better quality than GPT-x'?", "a": "When a large teacher already hits the quality bar and you need the same mapping at lower latency or cost, or on hardware you control. You are buying capability-per-dollar, not a new skill the teacher lacked.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "what-it-is-not-good-for": note(
        what="""Fine-tuning is a weak way to install **facts**, especially facts that change, must be cited, or must be filtered per user. A model trained on a wiki learns patterns and a few memorised strings. It will still invent, it cannot show a passage, and it cannot hide a document the caller is not allowed to see.

It is also a weak way to **create a spec**. If nobody can write what a good answer is, the dataset will be a pile of opinions and the model will average them. It will not invent product sense you do not have.

It is a weak way to **buy reasoning the base model does not have**. A LoRA on a 3B model will not suddenly do graduate proofs. It is a weak **safety system**: a narrow tune often forgets refusals the base had learned.

The slogan that belongs on the whiteboard is: retrieval for knowledge, tools for live state, prompts for reversible behaviour, tuning for stable behaviour you can already evaluate.""",
        why="""On the job the most expensive failed tunes are "we trained on the Notion export". Three months later prices moved, the model still quotes the old ones, and nobody can point a customer at a source. Legal then asks how you will unlearn a paragraph. You cannot, except by retraining.

Interviewers bait this with "how would you customise the model on our knowledge base?". The trap is to describe LoRA. The pass is to refuse, name RAG and access control, and only then mention a tune for tone if a measured gap remains.""",
        how="""Classify the request before you talk about GPUs.

- Changing facts, citations, ACLs → retrieval or a tool.
- Vague "make it better" → write an eval, do not train.
- Reasoning the base cannot do → pick a stronger base, do not sprinkle adapters.
- Safety as the only goal → keep the provider's safety stack; do not overwrite it with a support-tone LoRA.

Example. A retailer wants the assistant to know this week's prices and to refuse to discuss other customers' orders. You put prices in a retrieved feed and enforce order lookup in a tool that checks the session. You do **not** fine-tune on a price CSV. If answers still sound unlike the brand after that, a small style tune can sit on top — but the CSV never enters the loss.

A second anti-example. A team fine-tunes on 3,000 wiki chunks as if they were demonstrations. The model starts answering policy questions without retrieval, cannot cite, and leaks a draft page that was in the train set. The fix is to throw the tune away and build RAG with ACL filters.""",
        fails="""1. **Stale confidence.** Tuned models often sound more sure about memorised strings. Users trust the wrong number.

2. **No citation path.** Support and compliance need a URL or a passage id. Weights do not have one.

3. **Safety erosion.** A tone tune trained only on helpful completions starts answering questions the base would have refused. If you did not keep a refusal probe set, you will ship it.""",
        line="Fine-tuning is the wrong tool for changing facts, citations, permissions, vague goals, or missing reasoning. I use retrieval and tools for knowledge, and I will not train until someone can write what good looks like.",
        kps=[
            "Weights are a poor store for facts that change or must be cited.",
            "Retrieval can filter per user; a checkpoint cannot.",
            "A fuzzy spec produces a fuzzy model — write the eval first.",
            "A small tune rarely buys reasoning the base model lacks.",
            "Narrow tunes can forget safety behaviour; probe refusals.",
            "Interview line: RAG for knowledge, tuning for behaviour.",
        ],
        qs=[
            {"q": "Why is fine-tuning a company wiki a bad way to answer policy questions?", "a": "Facts go stale, recall is unreliable, the model cannot cite a passage, and it cannot hide pages the caller must not see. Retrieval keeps the corpus editable and filterable.", "kind": "recall"},
            {"q": "Prices change weekly and a PM proposes a weekly tune. How do you answer?", "a": "A weekly retrain is a tax and still lags the source of truth. Call a price API or retrieve the feed. Tune only if tone or format still fails after the live data is in the prompt.", "kind": "apply"},
            {"q": "After a 'helpfulness' LoRA, the model answers a disallowed how-to. What happened?", "a": "Catastrophic forgetting of safety. The train set had no refusals. Restore a refusal mix, add a safety probe to the eval, and consider keeping the provider's safety layer in front.", "kind": "debug"},
            {"q": "A stakeholder says 'just train it, we'll know good when we see it'. What is missing?", "a": "A written definition of good and a labelled eval. Without those the dataset is un-auditable and you cannot tell a successful tune from a lucky vibe.", "kind": "apply"},
            {"q": "Name two things retrieval can do that a fine-tune cannot.", "a": "Cite or link the passage it used, and apply per-user access control so two callers do not see the same hidden document. It can also update by editing a file instead of retraining.", "kind": "recall"},
        ],
        links=[OA_FT],
    ),
    "start-from-a-measured-failure": note(
        what="""A fine-tune starts from a **named failure** of the best non-tuned system, not from enthusiasm. You need a representative eval set, a prompted-and-retrieved baseline score, and a categorisation of the misses. Only the buckets that are about stable behaviour — format, tone, a closed skill the prompt cannot hold — are tune candidates.

"Named" means you can point at twenty examples and say the same sentence about each: "emits an extra key", "sounds like a generic chatbot", "confuses label 12 and 14". If you cannot, you are not ready to collect training data, because you do not know what an example is supposed to teach.""",
        why="""On the job, unmeasured tunes cannot be defended. Finance asks what improved; you shrug. A later prompt change then beats the adapter and nobody can prove it because the original baseline was "it felt off".

Interviewers listen for the word **baseline**. If you jump to LoRA rank they mark you as someone who trains for sport. If you walk through failure buckets and a target delta they mark you as someone who can spend a GPU budget.""",
        how="""Procedure:

1. Build 200–1,000 real inputs with expected outputs or rubrics.
2. Run the best prompt, few-shot, retrieval, and structured-output stack you can afford.
3. Tag each miss: missing context, tool needed, format, tone, label confusion, safety, other.
4. Estimate the upside of fixing only the tunable tags.
5. Write a target: "label accuracy from 86% to 93% on the held-out set, format validity ≥ 99%, refusal probe not worse than baseline".

Example. 200 misses: 120 missing document (retrieval), 30 bad JSON (schema / constrained decode), 50 tone and house-label errors. The tunable set is 50 cases. If those 50 are 25% of production pain, a tune that halves them is a 12-point win on that slice — worth a small LoRA. If they are 4% of pain, you stop.

You record the baseline numbers **before** anyone trains. The training run does not get to choose a friendlier test set later.""",
        fails="""1. **No baseline.** You cannot show the tune helped or that it did not hurt general quality.

2. **Buckets never written.** The dataset becomes "more support tickets" and the model relearns retrieval failures as if they were style.

3. **Target missing.** Training continues until someone likes a sample, which is how you ship an overfit checkpoint.""",
        line="I start from a labelled eval, a strong prompted baseline, and named failure buckets. I only train on the leftover behaviour errors, and I write the target score before the first step.",
        kps=[
            "A tune starts from a measured miss, not a vibe.",
            "Categorise failures; only behaviour buckets are tune candidates.",
            "Record the prompted baseline and a target before training.",
            "Estimate the upside from the tunable slice, not from all errors.",
            "Do not let the training run pick a new test set afterwards.",
            "Interviewers listen for 'baseline' before they listen for LoRA.",
        ],
        qs=[
            {"q": "What three artefacts must exist before you open a training job?", "a": "A representative eval set, a score for the best prompted (and retrieved) baseline, and a categorisation that shows a leftover behaviour gap with a written target.", "kind": "recall"},
            {"q": "Of 200 misses, 120 lack documents and 50 are tone. How do you bound the tune?", "a": "Treat 50 as the tunable set. Estimate production impact of that slice and set a target only on those errors plus regression probes. Do not train to 'fix' the 120 — that is a retrieval project.", "kind": "apply"},
            {"q": "A team reports the tune 'feels better' but baseline numbers were never saved. What can you not do?", "a": "You cannot prove a gain, cannot detect a regression, and cannot decide to roll back. Freeze a held-out set now, score the current adapter and a re-run of the old prompt, and treat anything else as anecdote.", "kind": "debug"},
            {"q": "Why is 'the model is sometimes wrong' not a named failure?", "a": "It does not tell you what to put in the dataset. Named means a repeatable sentence about a cluster of examples, such as 'invents a forty-first label' or 'adds a greeting the parser rejects'.", "kind": "recall"},
            {"q": "How does a failure taxonomy change the training mix?", "a": "You oversample the tunable buckets and keep retrieval-miss examples out of the loss, or you turn those into retrieval tests instead. The mix should match the residual error, not the raw log distribution.", "kind": "apply"},
        ],
        links=[HF_FT],
    ),
    "the-full-cost-of-a-tune": note(
        what="""The full cost of a tune is the sum of **data creation**, **training runs**, **evaluation**, **serving the custom model**, and **retraining** when the base model, the task, or the data distribution moves. The line item people quote — one GPU-hours number — is usually the smallest.

Data work is labelling, cleaning, de-duplication, PII review, and a second-pass audit. Evaluation is a held-out set, a judge or rubric, and human spot checks. Serving is either a reserved GPU, a multi-LoRA host, or a vendor fine-tune endpoint with its own price. Retraining is the tax you pay every time the base checkpoint you trained on is deprecated or a new failure class appears.

Write the sum in the same units you use for the baseline API bill: cost per thousand successful requests over a year, including one or two retrains.""",
        why="""On the job, an underquoted tune gets approved and then quietly eats a person. The adapter works; the dataset does not stay clean; the base model is retired; nobody owns the recipe. Leadership thought they bought a one-off.

In interviews, listing GPU hours as the cost is a junior tell. Listing data, eval, serving, and the next retrain is the answer they want. It also shows you can talk to finance without hiding the recurring part.""",
        how="""Build a one-page cost sheet.

- Data: hours to spec, collect, clean, and audit (often the majority).
- Train: number of runs you will actually do (sweeps, not one lucky job) times GPU price.
- Eval: building and maintaining the set; judge calls; periodic human review.
- Serve: extra latency hardware or vendor markup versus the prompted baseline.
- Retrain: assume the base changes at least once in the next two quarters unless you have a written freeze.

Example. Prompted frontier API: $12 per 1k requests (illustrative). A 3B LoRA on one GPU: $0.40 per 1k to serve, plus $8k of engineer time to build v1, plus $3k each retrain, two retrains a year. At 2M requests/year the serve saving is large, but only if quality holds and someone actually owns the $6k/year retrain. If volume is 20k requests/year, the same $8k build never pays back — keep the API.

Put the sheet next to the quality table. A cheaper model that needs a human in the loop on 8% of traffic can erase the serve saving.""",
        fails="""1. **One-run thinking.** You will sweep learning rates and ranks. Budget five to twenty runs, not one.

2. **Forgetting serving.** A custom model that cannot sit on your existing gateway is a new platform project.

3. **Zeroing the retrain tax.** A deprecated base makes the adapter a paperweight. If you cannot fund a retrain, do not train.""",
        line="I cost a tune as data plus many training runs plus eval plus serving plus at least one retrain, converted to cost per thousand requests over a year, and I compare that to the prompted baseline — not to a single GPU hour.",
        kps=[
            "Full cost = data + runs + eval + serving + retraining.",
            "People-time on data and evals usually beats the GPU invoice.",
            "Budget a sweep of runs, not a single lucky job.",
            "Convert everything to cost per thousand requests over a year.",
            "A retrain when the base dies is part of v1, not a surprise.",
            "Low volume rarely repays even a cheap adapter.",
        ],
        qs=[
            {"q": "What five cost buckets belong in a fine-tune estimate?", "a": "Data creation and cleaning, training runs (including sweeps), evaluation, serving the tuned model, and retraining when the base or task changes.", "kind": "recall"},
            {"q": "Volume is 15k requests a year. The LoRA would save $0.01 per request. Do you train?", "a": "Probably not. Annual serve savings are about $150, which will not cover data work or a retrain. Keep the prompted model unless there is a non-cost reason such as data residency.", "kind": "apply"},
            {"q": "The GPU quote was $60 but three engineers spent two weeks on labels. What was mis-estimated?", "a": "People-time on data. The $60 was the run, not the project. Put labelling hours on the sheet and decide again with the full number.", "kind": "debug"},
            {"q": "Why must serving appear even when training is free on leftover GPU?", "a": "Someone has to host a custom checkpoint, keep a template aligned, and take pages when it dies. That is platform cost the prompted API already included in its unit price.", "kind": "recall"},
            {"q": "How do you include two retrains a year in a unit-cost comparison?", "a": "Add the expected retrain labour and GPU to the yearly total, divide by yearly successful requests, and compare that unit cost to the baseline API. If volume is uncertain, show a break-even volume.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "tied-to-one-base-model": note(
        what="""A fine-tune is married to **one base checkpoint**. LoRA adapters are not portable across architectures or even across most version bumps of the same family. Full-weight tunes are even more stuck. When the lab ships a better base next quarter, you do not flip a model name. You rerun data through a recipe and re-prove the eval.

The durable assets are therefore the **dataset**, the **recipe** (template, hyperparameters, scripts), and the **eval suite**. The weight file is a derived artefact. Teams that treat the `.safetensors` as the product discover they have nothing to move when the base is deprecated.

Managed vendor tunes have the same marriage: the vendor's "gpt-x-mini-ft" dies when that base leaves the catalogue.""",
        why="""On the job, base models move several times a year. If your product identity is "the adapter we trained in March", you will miss quality and price wins, or you will run a dead base because migration was never funded.

In interviews, "what happens when the base model is deprecated?" separates people who have shipped a tune from people who have only read a LoRA diagram. The answer is: we retrain from the versioned set; we do not migrate tensors.""",
        how="""Design for remarriage.

- Pin the base by exact id and hash in the run config.
- Store the dataset, template, and eval outside the checkpoint directory.
- Write a one-command retrain that takes a new `--base` and produces a comparable eval table.
- Budget the retrain in the original cost sheet.
- Prefer adapters over full tunes when you expect to hop bases, because they are cheaper to redo — not because they transfer.

Example. You ship a LoRA on `llama-3.1-8b-instruct`. Six months later `llama-3.3-8b-instruct` scores higher as a prompted baseline. You do not "convert" the old adapter. You run the same 4,200-row set and the same eval. If the new base plus the old prompt already clears the target, you **drop the tune**. If not, you train a new adapter on the new base and compare.

Vendor example. OpenAI retires the base you tuned. Your fine-tuned model may keep serving for a while, then vanish. The export you needed was the training JSONL, not the hosted weights.""",
        fails="""1. **Weights as source of truth.** The only copy of "how we answer" is an adapter file. The data lake was never versioned.

2. **Assuming LoRA transfers.** Loading a Llama-3 adapter on Llama-3.1 or on Mistral is not a supported move. It is a new project.

3. **No freeze plan.** You cannot even stay on the old base because nobody recorded the exact revision and chat template.""",
        line="A tune is glued to one base version. I treat the dataset, recipe, and eval as the product, and I assume I will retrain — or delete the tune — when a better base arrives, rather than migrating tensors.",
        kps=[
            "Adapters and full tunes are bound to one base checkpoint.",
            "The durable assets are data, recipe, and evals, not the weight file.",
            "A better base next quarter means a retrain or a deleted tune.",
            "Do not assume a LoRA loads on a cousin model.",
            "Pin exact base id, template, and hashes in the run config.",
            "Vendor fine-tunes die when that vendor base leaves the catalogue.",
        ],
        qs=[
            {"q": "What should you keep when a base model is deprecated?", "a": "The versioned dataset, the training recipe including the chat template, and the eval suite. Those let you retrain on a successor. The old adapter is a souvenir.", "kind": "recall"},
            {"q": "A new instruct model beats your prompted baseline and your old LoRA. What do you do with the adapter?", "a": "Score the new base with the old prompt on the same held-out set. If it clears the target, retire the adapter. If not, retrain a new adapter on the new base and compare; do not try to load the old tensors.", "kind": "apply"},
            {"q": "An engineer copies a Llama-3 LoRA onto a Mistral serve path to 'save a retrain'. What breaks?", "a": "Shapes, residual math, and the chat template will not match. You get garbage or a load error. Retrain on the model you will serve.", "kind": "debug"},
            {"q": "Why is a managed fine-tune still tied to one base?", "a": "The vendor trains on a named base and serves that pair. When the base is retired the fine-tune goes with it. Your exportable asset is the training file.", "kind": "recall"},
            {"q": "How do you make a retrain a one-command event?", "a": "Pin dataset hash, template, seed, and package versions in a config; accept a new `--base`; write the same eval table. If any of those live only in a notebook, you do not have a recipe.", "kind": "apply"},
        ],
        links=[HF_FT],
    ),
    "prompt-then-retrieve-then-tune": note(
        what="""The working order is **prompt, then retrieve (or tool), then tune**. You exhaust reversible behaviour changes and knowledge injection, write down the **residual error**, and only then collect demonstrations of that leftover mapping.

"Exhaust" does not mean months of tinkering. It means you can show a table: best prompt, best prompt plus retrieval, best prompt plus retrieval plus constrained decoding. If the residual is still a stable behaviour gap, the tune has a job. If the residual is "we never tried citations" or "the schema is not enforced", you are not done with the cheap rungs.""",
        why="""On the job this order stops the cargo-cult tune. Teams that skip it train the model to paper over a missing retriever, then cannot update a fact without another job.

Interviewers often walk you through a failing bot. If your first sentence is LoRA, you fail. If your first sentences are "rewrite the prompt, add retrieval, measure the leftover", you pass — even if you later recommend a tune.""",
        how="""Run a three-row bake-off on the same held-out set before anyone labels a new SFT set.

Row A: best system prompt, few-shot, structured output.
Row B: A plus retrieval or tools for any fact that lives outside the weights.
Row C: proposed tune on top of B, or on a smaller model if cost is the point.

Write the residual of B in one paragraph: "JSON valid 96%, house tone 70%, facts with retrieval 93%". The tune is aimed at the 70%, not at the 93%.

Example. An FAQ bot misses 40 of 200 questions. After a prompt rewrite, 28 remain. After retrieval of the FAQ corpus, 6 remain, all of them "sounds too robotic" on otherwise correct answers. Those 6 (and more like them) are the SFT set. You do not include the 34 that retrieval already fixed.

Time-box the cheap work: a week of prompt and retrieval iteration with daily evals is enough to write a residual. You do not need a research programme.""",
        fails="""1. **Tuning over a missing retriever.** The adapter memorizes last week's answers. Next week the CMS changes and you are stuck.

2. **No written residual.** Labellers invent a broader task than the failure you actually have.

3. **Skipping structured output.** Format errors that constrained decoding would have fixed become an expensive SFT project.""",
        line="Prompt, then retrieve or call a tool, then write the leftover error, then tune only that leftover. If I cannot show the residual of the cheap stack, I am not ready to train.",
        kps=[
            "Order: prompt, retrieval or tools, then a tune.",
            "Write the residual error of the cheap stack in one paragraph.",
            "Do not put retrieval misses into the SFT set.",
            "Constrained decoding often closes format gaps without weights.",
            "A one-week bake-off is enough to decide; do not stall forever.",
            "Interviewers fail you if LoRA is sentence one.",
        ],
        qs=[
            {"q": "What do you write down after the prompt-and-retrieval bake-off?", "a": "The residual error: which metrics still miss, with examples, on the same held-out set. That paragraph is the spec for the dataset. Everything the cheap stack already fixed stays out of training.", "kind": "recall"},
            {"q": "Format validity is 91% with free decoding and 99% with a schema. Should you tune for format?", "a": "No. Enforce the schema at decode time. Use a tune for the leftover tone or label problem, not for a constraint the decoder can already impose.", "kind": "apply"},
            {"q": "A LoRA 'fixed' FAQ misses that later turned out to be missing chunks. What is the recovery?", "a": "Rebuild retrieval, re-score the prompted+retrieved baseline, and retrain only if a behaviour gap remains. Consider dropping the adapter; it was compensating for an index bug.", "kind": "debug"},
            {"q": "Why must the three-row bake-off use one held-out set?", "a": "Otherwise you cannot attribute the gain. A friendlier set for the tune will always make the tune look necessary.", "kind": "recall"},
            {"q": "How long should you spend on the cheap rungs before a tune is allowed?", "a": "Long enough to produce a measured residual, typically days to a couple of weeks with a daily eval, not an open-ended research cycle. If you cannot measure, you are not exhausting the rungs — you are avoiding the decision.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "style-versus-knowledge-test": note(
        what="""Before you collect a single training row, classify the failure as **style or format** versus **missing knowledge**. Style and format: tone, length, JSON shape, house labels, greeting rules, refusal phrasing. Knowledge: a fact that lives in a document, a database, or an API, including facts that differ by user.

Only the first class is a default tune candidate. The second class is retrieval, a tool, or a better index. Mixed failures are common; you split the example. The knowledge goes into the retriever. The way you want the answer spoken can still go into SFT.""",
        why="""On the job this test is the five-minute save. It stops a two-week labelling party for a problem an endpoint already solves.

In interviews, "is this a tune?" is often this test in disguise. Say "style versus knowledge" out loud. Then apply it to their FAQ bot, their SQL assistant, or their policy helper.""",
        how="""For each failing example ask: **if I pasted the right passage or API result into the prompt, would a competent model succeed?** If yes, it is knowledge. If the passage is already there and the model still uses the wrong voice, the wrong schema, or the wrong house label, it is style or format.

Example. "What is the refund window for SKU 44?" fails. The policy is in a doc the model never saw. Knowledge — retrieve. Same question with the paragraph in context, but the model writes a chatty essay instead of the two-sentence house template. Style — tune or a stricter prompt.

A SQL assistant that invents a column is knowledge (schema tool). A SQL assistant that writes valid SQL in the wrong dialect house style after the schema is provided is behaviour (tune or few-shot).

Write the split on the eval sheet as two columns so labellers cannot smuggle facts into demonstrations.""",
        fails="""1. **Calling everything style.** Teams tune on "answers about refunds" and accidentally bake last year's window into the weights.

2. **Calling everything knowledge.** A real format problem is left to a 2,000-token prompt that still drifts.

3. **Not splitting mixed rows.** The demonstration contains a fact that will rot, and a tone you actually wanted. The rot comes along for the ride.""",
        line="I sort every miss into style or format versus missing knowledge. Knowledge goes to retrieval or a tool; only a leftover style or format gap is allowed near a training job.",
        kps=[
            "Style/format = how; knowledge = what, including per-user facts.",
            "If the right passage in the prompt would fix it, do not tune.",
            "Split mixed examples so facts do not enter the loss.",
            "House labels and JSON shapes are format, not knowledge.",
            "Live prices and policies are knowledge even if you have a dump.",
            "Say 'style versus knowledge' in the interview before you say LoRA.",
        ],
        qs=[
            {"q": "What question tells you a miss is knowledge rather than style?", "a": "If pasting the correct passage or tool result into the prompt would make a competent model succeed, the miss is knowledge. If the evidence is already there and the shape or tone is still wrong, it is style or format.", "kind": "recall"},
            {"q": "The model has the refund policy in context but writes a long essay. Tune or retrieve?", "a": "Style or format. Tighten the prompt or collect demonstrations of the two-sentence house template. Do not add more policy documents.", "kind": "apply"},
            {"q": "Labellers pasted yesterday's prices into the gold answers 'so the model knows them'. What is the bug?", "a": "They turned a knowledge problem into a stale tune. Strip prices from the demonstrations, retrieve or call the feed at request time, and keep only the wording style in SFT if needed.", "kind": "debug"},
            {"q": "Is a closed forty-label taxonomy knowledge or format?", "a": "Format / behaviour: a closed mapping from ticket text to a house id. The definitions can be retrieved as a short legend, but reliability of the mapping is a classic SFT job once the legend is stable.", "kind": "recall"},
            {"q": "How do you handle an example that both misses a fact and uses the wrong tone?", "a": "Split it. Put the fact in the retriever or tool. Write the gold answer as if the fact were already present, in the desired tone. Train on the second piece only.", "kind": "apply"},
        ],
        links=[],
    ),
    "retrain-tax-in-the-estimate": note(
        what="""The **retrain tax** is the cost of doing the work again when the base model is replaced, the tokenizer or chat template changes, the task drifts, or a new failure class appears. It belongs in the **first** estimate, not in a surprise ticket after deprecation.

A honest v1 quote looks like: build once + serve for N months + K planned retrains. K is at least one if you follow frontier or popular open bases, because those move. K is higher if your domain changes weekly.

The tax is mostly people, not GPUs: rebase the recipe, re-check the template, re-run evals, maybe relabel a slice, recertify safety probes, and redo the canary.""",
        why="""On the job, teams that ignore the tax end up frozen on a dead base because nobody budgeted migration. That is how you pay frontier-era prices for a model the vendor is trying to turn off.

In interviews, mentioning the next base-model upgrade unprompted is a strong signal. It shows you have seen a tune survive contact with a catalogue change.""",
        how="""Put two extra lines on the cost sheet.

- **Scheduled rebase:** once per base-family upgrade you intend to follow (often 1–2 per year).
- **Unscheduled rebase:** a drift trigger from production (new product line, new failure cluster) with a reserved label budget.

Example. Year-1 cost without tax: $8k to build, $2k to serve. With tax: add two rebases at $3k each (mostly eval and template work, a short LoRA run). Year-1 is $16k, not $10k. The prompted API at the same volume is $18k. The tune still wins, but the margin is thin; if rebases slip to $5k because the template changed, the API wins again.

A freeze is a valid alternative: you accept a fixed open-weight base for 18 months and do not chase every release. Write that freeze down. It is a product decision, not an accident.""",
        fails="""1. **Zero K.** The estimate assumes the March checkpoint lives forever.

2. **Tax as GPU only.** The rebase is treated as a $40 job. The real work is eval and canary.

3. **Chasing every base.** You pay the tax monthly and never amortise the last adapter.""",
        line="I put the next base-model upgrade and at least one drift retrain in the original cost, as people-time plus a short run, not as a later surprise. If we cannot fund that tax, I will not train.",
        kps=[
            "Retrain tax = rebase when the base, template, or task moves.",
            "Put K planned retrains in the v1 quote.",
            "The tax is mostly eval, template, and canary work.",
            "A written freeze on one open base is a valid way to cut K.",
            "Chasing every new base spends the tax without amortising.",
            "If the tax is unfunded, the cheap API is the honest choice.",
        ],
        qs=[
            {"q": "What is the retrain tax and when do you pay it?", "a": "The cost of repeating data-to-eval work when the base, tokenizer, template, or task changes. You pay it on scheduled base upgrades and on drift triggers. It belongs in the first estimate.", "kind": "recall"},
            {"q": "Your v1 quote omitted rebases. The base is deprecated in six months. What do you tell finance now?", "a": "The adapter will die with the base. Either fund a rebase (recipe + eval + canary) or migrate traffic to a prompted model. Do not pretend the weight file will load on the successor.", "kind": "apply"},
            {"q": "A team retrains on every weekly open-weight release. Quality is flat. What is wrong?", "a": "They are paying the tax without a gain. Freeze a base until the prompted successor beats the current pair by a written margin, then rebase once.", "kind": "debug"},
            {"q": "Why is the retrain tax mostly people-time?", "a": "Re-checking the chat template, rerunning evals, recertifying safety, and canarying the new adapter dominate a short LoRA job on a small model.", "kind": "recall"},
            {"q": "How does a freeze-for-18-months decision change the estimate?", "a": "K scheduled rebases drop toward zero for that window. You accept missing some base-model gains in exchange for a stable serving path. Write the freeze date and the metric that would break it.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "decline-a-tune-in-an-interview": note(
        what="""You should be able to **decline a fine-tune** in a hiring-manager story, especially for an FAQ or policy bot. The decline is a structured argument: the failure is knowledge, cheaper rungs are untried or already sufficient, the full cost including retrain tax exceeds the gain, and the product needs citations or ACLs that weights cannot provide.

A decline is not "fine-tuning is outdated". It is "for this failure, a tune is the wrong instrument". You can still say you have trained LoRAs on format tasks. The point is judgement.""",
        why="""Interviewers who build AI products are tired of candidates who fine-tune as a personality. They want someone who will protect the team from a six-week side quest. FAQ bots are the classic trap because the job description said "fine-tuning" and the actual system is RAG.

On the job the same speech saves you when a VP saw a vendor slide. You need it ready, polite, and numerical.""",
        how="""Use a four-beat decline.

1. **Restate the failure.** "Customers get last month's return window."
2. **Name the class.** "That is changing knowledge, not tone."
3. **Show the cheaper fix.** "Retrieval on the policy corpus with citation, plus a prompt that refuses when the passage is missing. Here is a 50-question score."
4. **Price the tune they asked for.** "A tune would bake today's window, could not cite, and we would retrain at every policy edit. I will not do that."

Example interview answer. "I would not fine-tune your FAQ bot. FAQs change and need a link. I would build retrieval with ACL filters, measure exact-match and citation rate on a frozen set, and only revisit a tune if answers are factually right but off-brand after that. If you want a smaller model for cost, I would distil after the RAG path is good — not instead of it."

If they insist they have 10,000 FAQ pairs already: "Then those pairs are eval and retrieval chunks, not SFT, unless a style gap remains."

Keep a positive close: the capstone you *would* tune — a labeler or a house JSON template — so you do not sound allergic to weights.""",
        fails="""1. **Absolute refusal.** "I never fine-tune" sounds ideological and fails the next question about LoRA.

2. **No numbers.** A decline without a 50-question sketch looks like fear of GPUs.

3. **Insulting the job description.** They listed fine-tuning because recruiters copy keywords. Redirect; do not mock.""",
        line="I would not fine-tune an FAQ bot: the miss is changing knowledge that must be cited, so I retrieve, measure, and only tune a leftover house style. A tune I cannot decline is a tune I should not be trusted with.",
        kps=[
            "Decline with a class, a cheaper fix, and a cost, not a slogan.",
            "FAQ and policy bots are the standard 'do not tune' story.",
            "Offer retrieval plus a citation metric on a frozen set.",
            "Keep a positive example of a tune you would run (format, labels).",
            "Existing FAQ pairs are usually eval and chunks, not SFT.",
            "Never say you never fine-tune; say you will not for this failure.",
        ],
        qs=[
            {"q": "Give a four-beat decline of fine-tuning an FAQ bot.", "a": "Restate the failure (stale or uncited answers), name it as knowledge, propose retrieval with citations and a measured set, and price the tune as stale weights plus a retrain on every edit. Close with the leftover style tune you would consider later.", "kind": "recall"},
            {"q": "The JD lists fine-tuning and the take-home is an FAQ bot. How do you handle the keyword?", "a": "Say you can run LoRA and you have, then decline it for this task with the knowledge test. Offer a small style adapter only after RAG hits the fact metric. You satisfied the keyword without shipping the wrong system.", "kind": "apply"},
            {"q": "You declined, and the interviewer says they already have 10k FAQ pairs. What are those pairs?", "a": "Primarily retrieval chunks and an eval set. They become SFT only if, after retrieval, a style or format gap remains and the pairs are rewritten as demonstrations of that leftover mapping.", "kind": "debug"},
            {"q": "Why is 'I never fine-tune' a bad decline?", "a": "It sounds ideological. The next question will be a closed label task where a tune is right, and you will have boxed yourself in. Decline the instrument for this failure, not the instrument forever.", "kind": "recall"},
            {"q": "What number should you be ready to sketch in a decline?", "a": "A small frozen FAQ set (for example 50–200 questions) with accuracy and citation rate for prompted+retrieved versus a hypothetical tune, plus a one-line retrain tax when the policy changes.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
}
