from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-12": {
  "eight-dimensions-for-model-choice": entry(
   what="""Evaluate models on **eight dimensions**: **capability**, **quality**, **latency**, **cost**, **context**, **modalities**, **privacy & deployment**, **product features**. A pick that only uses one (usually quality or a brand) is incomplete. The dimensions are the rest of this module, one card each, plus how you read cards and the workflow.

Write them on the whiteboard before you name a vendor. The shortlist must have at least a note on each, even if the note is "n/a".

This is the checklist. The later cards are the flesh.""",
   why="""Interviewers will ask how you choose a model. If you start with a brand you have already lost. On the job this list is the decision-doc template. They want you to rattle six of the eight without a slide.

They will ask which dimension kills a candidate first (often privacy or latency).""",
   how="""Template row: model id, can-it (capability), how-reliably (quality + set), p95, $/task, window, text/vision, path (API/platform/self), tools/JSON/stream/cache.

Fill three rows. Cross out anyone who fails a hard constraint (must be in-region, must be <800 ms, must have structured output). Rank the rest on quality/cost.

Hang the eight words in the README of the eval repo.""",
   failures="""1. **Quality-only.**

2. **Brand-first.**

3. **Skipping a hard constraint** until after the bake-off.

4. **Eight slides of prose** and no table.""",
   line="""I choose on eight dimensions: capability, quality, latency, cost, context, modality, privacy/deployment, features. I write them before I name a vendor, I fail hard constraints first, and I fill a table for the rest.""",
   key_points=[
    "Eight dimensions, not a brand.",
    "Fail hard constraints first.",
    "Table beats prose.",
    "Quality is one column.",
    "n/a is an allowed cell.",
    "This list is the module.",
   ],
   questions=[
    q("recall", "Name the eight dimensions for model choice.", "Capability, quality, latency, cost, context, modalities, privacy and deployment, product features."),
    q("apply", "What do you write first on the whiteboard?", "The eight words and the hard constraints. Then vendor names."),
    q("debug", "A bake-off ignored region and picked a public API. What happened?", "They skipped privacy/deployment until too late. Fail that column first next time."),
    q("apply", "How do you use the table?", "Cross out hard-constraint fails. Rank the rest on quality per dollar and p95."),
    q("recall", "Why is capability different from quality?", "Capability is 'can it at all'. Quality is 'how reliably on our set'."),
   ],
   links=[
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
    {"title": "Anthropic: choose a model", "url": "https://docs.anthropic.com/en/docs/about-claude/models"},
   ],
  ),
  "capability": entry(
   what="""**Capability: can it perform the task at all?** Function calling, vision, 100k context, JSON mode, a language, a 70-page contract — some models **cannot**. This is a **yes/no (or not without a wrap)** filter, not a score. If it cannot see images, it is out of a screenshot workflow. If it cannot take tools, your agent design is a fantasy.

Capability is cheap to check: read the card, try one call. Do not spend a week scoring a model that lacks the verb.""",
   why="""People skip this and discover mid-bake-off that the favourite has no tools. Interviewers want the filter. On the job it is the first column you grey out.

They will ask for an example of a capability fail (text-only vs screenshots; no structured output).""",
   how="""List required verbs: tools? vision? audio? 32k? JSON schema? Then tick the card. One smoke call.

If a wrap can add the capability (you OCR first), write that as a cost on the candidate, not as "it can".

Do not confuse "a demo once produced JSON" with "has JSON mode". The first is quality/luck. The second is capability.""",
   failures="""1. **Scoring a model that lacks the verb.**

2. **Demo-once as capability.**

3. **Assuming all frontier models have tools.**

4. **Forgetting language coverage.**""",
   line="""Capability is 'can it do the verb at all'. I fail those candidates first with a card read and a smoke call. A lucky JSON demo is not JSON mode.""",
   key_points=[
    "Yes/no filter, not a score.",
    "Tools, vision, window, JSON, language.",
    "Smoke call + card.",
    "A wrap is a cost, not a silent yes.",
    "Demo-once ≠ capability.",
    "Do this before a week of scoring.",
   ],
   questions=[
    q("recall", "What is capability in model choice?", "Whether the model can perform the task at all — the verbs and modalities — not how reliably."),
    q("apply", "Your app needs screenshots. A text-only model is cheap. What column fails?", "Capability (and modality). OCR wrap is a different design with its own cost."),
    q("debug", "You spent a week scoring a model that cannot call tools for an agent. What did you skip?", "The capability filter on day one."),
    q("apply", "How do you check JSON capability?", "The card and a schema-mode call if they have one. Not a single free-form demo."),
    q("recall", "Is 'it wrote JSON once' capability?", "No. That is a quality anecdote. Capability is the supported feature."),
   ],
   links=[
    {"title": "OpenAI: function calling", "url": f"{OAI}/guides/function-calling"},
    {"title": "OpenAI: vision", "url": f"{OAI}/guides/vision"},
   ],
  ),
  "quality": entry(
   what="""**Quality: how reliably does it perform your specific task?** This is the **held-out set**, the **metric**, the **error types**. Not a card number. Not a vibe. Not "it felt smarter".

Define the metric before you run (exact match, rubric, execution). Report the number with the set version. Inspect failures — a 90% that always drops the amount field is not 90% for a finance bot.

Quality without error analysis is a vanity score.""",
   why="""This is the column people think they are filling when they quote MMLU. Interviewers want your set. On the job this is the golden set you already built in M1.11.

They will ask what you do with the 10% (human, retry, abstain).""",
   how="""50–200 items, versioned. Metric written down. Two reviewers on a sample if the metric is a judge. Slice by type (empty ticket, long ticket, Hindi).

Look at 20 failures. If they are one bug, fix the prompt and re-run. If they are a long tail, decide the human path.

Do not change the metric after you see the scores. That is p-hacking a bake-off.""",
   failures="""1. **Card number as quality.**

2. **No failure inspection.**

3. **Changing the metric** after seeing scores.

4. **One slice** (only easy items).""",
   line="""Quality is reliability on our set, with a written metric and an error look. A card number is not quality. I will not change the metric after I see the scores.""",
   key_points=[
    "Your set, your metric.",
    "Inspect failures.",
    "Slice the score.",
    "Do not p-hack the metric.",
    "Plan the 10%.",
    "Card ≠ quality.",
   ],
   questions=[
    q("recall", "What is quality in this module?", "How reliably the model does our task on a held-out set with a written metric — not a public bench."),
    q("apply", "A model is 90% exact-match but always drops amounts. Is it shippable for invoices?", "Not without a bound on amounts. The slice that matters is failing. Inspect errors."),
    q("debug", "After seeing scores you switch from exact match to 'judge likes it'. Problem?", "You p-hacked the bake-off. Lock the metric first."),
    q("apply", "What do you do with the 10%?", "Retry, abstain, or human. Write it down. Do not pretend 90% is 100%."),
    q("recall", "Why slice the score?", "Averages hide the empty-ticket or Hindi slice you will ship to."),
   ],
   links=[
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
    {"title": "Anthropic: develop tests", "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"},
   ],
  ),
  "latency": entry(
   what="""**Latency: how quickly does it respond?** TTFT and total, p95 not just mean. Interactive UIs need a first token soon. Batch jobs care about total and tokens/s. Reasoning models and long outputs change the number a lot.

A model that is 2 points better and 8× slower may lose a chat product and win an offline job. Write the SLO before the bake-off.

Measure on your prompt sizes, not a 20-token hello.""",
   why="""Interviewers want p95 and TTFT vs total. On the job this is the column that kills reasoning-as-default. They will ask how you would measure (prod-like prompts, streamed).

They will punish a mean on 10 hellos.""",
   how="""Script: 50 real prompts, record TTFT, total, tokens. Report p50/p95. Include a long-context item if you have one.

SLO: "TTFT p95 < 1.5s on the chat route". Cross out anyone who cannot hit it even after shrinking the prompt.

Do not compare a 50-token answer to a 500-token answer and call the latter "slow" without tokens/s.""",
   failures="""1. **Mean only.**

2. **Hello-world prompts.**

3. **Ignoring TTFT** for chat.

4. **No SLO.**""",
   line="""Latency is TTFT and total at p95 on our prompt sizes. I write the SLO first. A smarter-but-8×-slower model loses a chat route and may win a batch job.""",
   key_points=[
    "TTFT and total, p95.",
    "Measure on real prompt sizes.",
    "SLO before the bake-off.",
    "Chat vs batch pick different numbers.",
    "Reasoning changes the tail.",
    "Do not compare unlike output lengths without tokens/s.",
   ],
   questions=[
    q("recall", "Which latency numbers do you put on the table?", "TTFT and total at p95 (and maybe p50), measured on real prompts."),
    q("apply", "A reasoning model is +2 quality and 8× p95. Chat or batch?", "Batch or a rare 'deep think' button. Not the default chat box unless the SLO allows it."),
    q("debug", "The bake-off used 10 'hi' prompts. Why is the latency column junk?", "Prefill was tiny. Your real prompts are long. Re-measure."),
    q("apply", "What SLO would you write for interactive classify?", "TTFT and total both under a second at p95, or whatever the UI research said — write it before you score quality."),
    q("recall", "Why p95 not mean?", "Users feel the tail. Reasoning and queues live in the tail."),
   ],
   links=[
    {"title": "OpenAI: production best practices", "url": f"{OAI}/guides/production-best-practices"},
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
   ],
  ),
  "cost": entry(
   what="""**Cost: what will each request cost at your expected usage?** Use **tokens per successful task**, including **retries, thinking, and failures**, times **$/1M in and out**, plus **idle GPUs** if you self-host. A cheap model that needs three retries is not cheap. A dear model on 0.1% of traffic can be fine.

Write monthly $ at 1× and 10× volume. That is the column.

Do not use "it is $3/1M" as the story without your token counts.""",
   why="""Finance will ask. Interviewers want tokens per successful task. On the job this is how you justify a fleet (cheap classify, dear plan).

They will punish a unit-price-only slide.""",
   how="""Measure tokens on the golden set. Multiply by the price list. Add retry rate. Add thinking if billed. Compare $/successful extract.

Self-host: GPU-hour / throughput × tokens, plus people.

Put a 10× volume row so a "we will grow" plan does not surprise anyone.

When quality is equal, take the cheaper. When quality differs, price the human time the errors create.""",
   failures="""1. **$/1M without token counts.**

2. **Ignoring retries and thinking.**

3. **No 10× row.**

4. **Ignoring human time** on errors.""",
   line="""Cost is dollars per successful task at our volume, including retries and thinking. I write a 1× and 10× monthly row. Unit price without token counts is not a story.""",
   key_points=[
    "$ per successful task, not per raw call.",
    "Include retries and thinking tokens.",
    "1× and 10× volume.",
    "Self-host adds GPU-hours and people.",
    "Price the human time of errors.",
    "Unit $/1M is incomplete.",
   ],
   questions=[
    q("recall", "How do you compute cost for the table?", "Measured tokens per successful task × prices, plus retries and thinking, times volume. Self-host: GPU hours."),
    q("apply", "A $0.10/1M model retries 3× and a $1/1M model succeeds once. Who is cheaper?", "Maybe the dear one. Compute it. Do not look at unit price."),
    q("debug", "The slide has only $/1M input. What is missing?", "Output (and thinking) prices, your token counts, retries, volume."),
    q("apply", "Why a 10× row?", "So growth does not surprise finance. Some models that are fine at 1× blow the budget at 10×."),
    q("recall", "How do you price quality differences?", "Estimate human time or incident cost of the extra errors, not only the token bill."),
   ],
   links=[
    {"title": "OpenAI: pricing", "url": "https://openai.com/api/pricing/"},
    {"title": "Anthropic: pricing", "url": "https://docs.anthropic.com/en/docs/about-claude/pricing"},
   ],
  ),
  "context": entry(
   what="""**Context: can it accommodate the required input?** The **window** must fit **your packed prompt** (rules + retrieval + history + reserve), not a toy. A 8k model cannot take your 40k pack without a redesign. A 1M model can take it and still use it badly (M1.8).

This column is **capacity + evidence you can use that much**. Fail the ones who cannot fit. Be skeptical of the ones who "fit" a dump.

If you can redesign to 4k, more models enter the shortlist — often a win.""",
   why="""Interviewers want window vs usable. On the job this is how you avoid picking an 8k model for a "paste the PDF" brief — or how you refuse the brief.

They will ask whether you would redesign the pack instead of buying 1M (yes, usually).""",
   how="""Measure the pack: p95 tokens of production-like calls. The model must fit p95 + reserve. If not, redesign or pick a larger window.

Then, if you need >32k of *used* text, run the quality column at that length. A 1M window with a 20-point drop is a fail.

Prefer shrinking the pack. It also helps latency and cost.""",
   failures="""1. **8k model, 40k pack.**

2. **1M as architecture.**

3. **No p95 pack measurement.**

4. **Ignoring reserve.**""",
   line="""Context is whether the window fits our real pack, and whether quality holds at that length. I measure p95 tokens, I reserve the answer, and I would rather shrink the pack than buy a million tokens of hay.""",
   key_points=[
    "Fit the real pack, not a toy.",
    "Measure p95 tokens.",
    "Usable ≠ advertised.",
    "Shrinking the pack enlarges the shortlist.",
    "Reserve output.",
    "Long-window quality is a separate check.",
   ],
   questions=[
    q("recall", "What does the context dimension ask?", "Whether the model's window can hold our real packed prompt plus a reserve, and whether quality holds at that length."),
    q("apply", "Your p95 pack is 12k tokens. Which models die?", "Anyone with an 8k window, unless you redesign the pack. Redesign may be the better move."),
    q("debug", "You picked 1M context and quality fell 15 points. What was missing?", "The usable-context eval at length. Capacity is not quality."),
    q("apply", "Why shrink the pack even if a big window exists?", "Cost, TTFT, dilution, and a wider shortlist of cheaper models."),
    q("recall", "What must you reserve?", "Output (and thinking) tokens so the pack cannot starve the answer."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"},
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
   ],
  ),
  "modalities": entry(
   what="""**Modalities: do you need text, images, audio, or video?** A text-only model **cannot** take a screenshot. A speech-to-text + LLM wrap is a **different design** (latency, errors at the ASR step). Multimodal models **misread** images and cost more. Pick the modality you need; do not buy vision "in case".

If 5% of tickets are screenshots, you might route those to a vision model or OCR, not pay vision on 100%.

This is capability's sibling, aimed at input/output types.""",
   why="""Interviewers want a routing answer, not "we use the omni model for everything". On the job this is a cost and quality slice.

They will ask how you handle a PDF (parse first vs dump pages as images).""",
   how="""Inventory inputs: 90% text, 8% images, 2% audio. Default text model. Image route: vision or OCR+text. Audio: ASR+text.

Eval vision on *your* screenshots (receipts, dark mode UI). Public vision benches will not match.

PDFs: extract text when you can; images of pages are a last resort and a token bomb.""",
   failures="""1. **Omni on 100%** for a 5% image slice.

2. **Text-only on screenshots.**

3. **No ASR error budget.**

4. **PDF-as-images by default.**""",
   line="""I inventory modalities and I route. Vision and audio are extra cost and extra errors. I will not run an omni model on 100% of text tickets because 5% have screenshots.""",
   key_points=[
    "Inventory inputs; route the slices.",
    "Vision/audio cost and err more.",
    "OCR/ASR wraps are designs with their own errors.",
    "Eval on your screenshots.",
    "Extract PDF text when you can.",
    "Do not buy omni 'in case' for 100% traffic.",
   ],
   questions=[
    q("recall", "What does the modality dimension ask?", "Whether you need text, images, audio or video, and whether the model (or a wrap) actually supports that input."),
    q("apply", "5% of tickets are screenshots. How do you avoid paying vision on 100%?", "A router: text model by default, vision or OCR on image attachments."),
    q("debug", "You dump every PDF as page images into a vision model. Bill explodes. Alternative?", "Extract text (and tables) first. Use images only when layout is the point."),
    q("apply", "What extra error does an ASR+LLM wrap add?", "Transcription errors that the LLM may 'fix' into fluent wrongness. Measure WER on your audio."),
    q("recall", "Why eval vision on your screenshots?", "Public benches are not your dark-mode receipts. Misreads are task-specific."),
   ],
   links=[
    {"title": "OpenAI: vision", "url": f"{OAI}/guides/vision"},
    {"title": "OpenAI: audio", "url": f"{OAI}/guides/audio"},
   ],
  ),
  "privacy-deployment": entry(
   what="""**Privacy & deployment: API, managed platform in your cloud, or self-host?** This is the M1.10 path choice as a hard column. If the data class forbids a public API, those candidates die no matter their quality. If you cannot staff GPUs, self-host dies. If the model is not in-region on the platform, that row dies.

Write the data class first. Then the path. Then the models that exist on that path.

Do not run a quality bake-off on a path you cannot use.""",
   why="""This is the enterprise interview. On the job it is the column that saves a quarter of wasted work. They will ask you to order the decisions (data class → path → model).

They will punish a quality winner you cannot legally call.""",
   how="""One page: data class, region, retention, who may see prompts. Then allowed paths. Then shortlist only those.

If two paths are allowed, you may still bake-off a public-API model on **synthetic** data for quality, then re-run the winner's cousin on the platform.

DPA and licence sit in this column too.""",
   failures="""1. **Quality first, legal later.**

2. **Synthetic-data winner** shipped on real PII via the public API.

3. **Self-host with no owner.**

4. **Wrong region.**""",
   line="""Data class picks the path; the path picks the shortlist. I will not bake-off a public API on data I cannot send, and I will not self-host without an owner. Privacy is a fail-first column.""",
   key_points=[
    "Data class → path → models.",
    "Fail this column first.",
    "API / platform / self-host.",
    "Region and retention live here.",
    "DPA and licence live here.",
    "Do not quality-test an illegal path on real data.",
   ],
   questions=[
    q("recall", "What does privacy and deployment ask?", "Whether you may use a public API, a managed platform in your cloud, or must self-host — given data class, region and contract."),
    q("apply", "In what order do you decide?", "Data class, then path, then the models available on that path, then quality/cost."),
    q("debug", "The quality winner is a public API; legal says no. What was wrong with the process?", "You inverted the columns. Fail privacy first."),
    q("apply", "Can you still use a public API in a regulated shop?", "For synthetic or public data experiments, if policy allows. Not for the real PII path."),
    q("recall", "Who owns self-host if you pick it?", "A named person for serving, patching and pages. No owner, no path."),
   ],
   links=[
    {"title": "Amazon Bedrock", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html"},
    {"title": "OpenAI: data controls", "url": f"{OAI}/guides/your-data"},
   ],
  ),
  "product-features": entry(
   what="""**Product features: structured outputs, function calling, tools, streaming, caching?** These are **API verbs** that change the design. No streaming → worse chat UX. No tools → no agent. No schema mode → more glue. No prompt cache → you pay full prefill on a fat policy every time.

A model that is slightly worse on quality but has schema + cache can win the product.

Read the feature matrix per snapshot; they move.""",
   why="""Interviewers want two features that would change the pick. On the job this is why you did not choose the "smarter" model that cannot stream.

They will ask about prompt cache as a cost/latency feature.""",
   how="""Required features list next to capability. Tick them. If a wrap can fake a feature (you stream tokens you buffered — you cannot), do not lie.

Cache: if your system prompt is 4k and stable, a model/vendor with prefix cache can dominate cost.

Structured output: if you live on JSON, prefer native schema. It is a quality and a features win.""",
   failures="""1. **Ignoring streaming** for a chat box.

2. **Agent design on a no-tool model.**

3. **No cache** on a fat static prefix.

4. **Assuming features survive a snapshot.**""",
   line="""Features are verbs: schema, tools, stream, cache. I fail models that cannot do the verb the product needs. A slightly weaker model with schema and cache often wins.""",
   key_points=[
    "Schema, tools, stream, cache.",
    "They change the design, not just the score.",
    "Tick them per snapshot.",
    "Cache matters on fat static prefixes.",
    "Do not fake streaming.",
    "A features win can beat a 1-point quality loss.",
   ],
   questions=[
    q("recall", "Name four product features that change a pick.", "Structured outputs, function calling/tools, streaming, prompt caching."),
    q("apply", "Your system prompt is 4k and stable. Which feature moves cost?", "Prefix/prompt cache. Without it you prefill 4k every call."),
    q("debug", "You designed an agent on a model that cannot call tools. Options?", "Pick a model with tools, or you are building a fake agent out of JSON-and-hope."),
    q("apply", "Why might a slightly weaker model win?", "It streams, has schema mode, and caches the prefix — better UX and cheaper at the same reliability band."),
    q("recall", "Do features stay when the alias moves?", "Not guaranteed. Re-check the matrix on the snapshot you pin."),
   ],
   links=[
    {"title": "OpenAI: structured outputs", "url": f"{OAI}/guides/structured-outputs"},
    {"title": "OpenAI: prompt caching", "url": f"{OAI}/guides/prompt-caching"},
   ],
  ),
  "reading-model-cards-pricing-pages": entry(
   what="""Read **cards, bench tables, pricing pages, context specs, and API docs** as a **skeptic**. Cards omit. Prices have **in vs out** and sometimes **thinking**. Context is **advertised**. Benches are **shortlists**. API docs hold the **verbs** (the features column).

A 10-minute read with a checklist beats a 2-hour vibe session. Write one sentence per source.

Critical reading is a skill: what is missing is a signal.""",
   why="""Interviewers may hand you a card. On the job this is Monday morning. They want the checklist, not a recitation of MMLU.

They will ask what you look for on a pricing page (in/out, cache, thinking, minimums).""",
   how="""Checklist:

- Card: size, dense/MoE, cutoff, licence, window, modality, benches (discounted)
- Pricing: $/1M in, out, cache, thinking; reserved capacity
- API: tools, schema, stream, seed, region
- Changelog: deprecations

One sentence: "70B-class, 128k, tools+schema, $x/$y, no cache, cutoff 2025-03 — eval next."

If a page hides output price, ask. If a card hides licence, stop.""",
   failures="""1. **Benches only.**

2. **Input price only.**

3. **Skipping API docs** (no verbs).

4. **No written sentence.**""",
   line="""I read cards, prices and API docs as a skeptic: in vs out, verbs, window, licence, what is missing. I write one sentence and then I eval. A bench table is not a read.""",
   key_points=[
    "Card, price, API doc, changelog.",
    "In vs out vs thinking vs cache.",
    "Verbs live in the API doc.",
    "Missing cells are signals.",
    "One sentence, then eval.",
    "Licence and deprecations are part of the read.",
   ],
   questions=[
    q("apply", "What do you look for on a pricing page?", "Input vs output vs thinking vs cache prices, any minimums, and reserved-capacity costs."),
    q("recall", "Where do tools and schema live?", "In the API documentation for that snapshot, not only on the marketing card."),
    q("debug", "A 'read' was only the MMLU row. What was skipped?", "Licence, window, verbs, in/out prices, cutoff, deprecations."),
    q("apply", "Write the one-sentence read.", "Class/size, window, key verbs, in/out price, licence or path, cutoff — then 'eval next'."),
    q("recall", "What is a missing licence on an open-weight card?", "A stop. Do not shortlist until it exists."),
   ],
   links=[
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "OpenAI: pricing", "url": "https://openai.com/api/pricing/"},
   ],
  ),
  "why-benchmarks-alone-are-not-enough": entry(
   what="""**Benchmark scores alone should not determine model selection.** They are the **shortlist input** (M1.11). Selection is the **eight-dimension table** plus **your eval**. A model can win every public suite and fail your schema, your p95, your DPA, or your price.

Say this even when the bench agrees with you, so the process survives the week it does not.

This card exists so the module cannot be read as "look at MMLU then pick".""",
   why="""Interviewers will bait you with a card table. The senior move is to compliment the shortlist and refuse the crown. On the job this is the sentence in the ADR.

They will punish a pick that cites only benches.""",
   how="""ADR section: "Public scores used to shortlist A/B/C. Winner is B because of our set (link), p95, $/, and in-region hosting. A's MMLU is higher; it failed JSON."

If you have no set yet, you are not selecting — you are exploring. Say that.

When benches and your set agree, still keep the set as the source of truth so the next snapshot cannot overturn you with a new card.""",
   failures="""1. **ADR with only benches.**

2. **Exploring called selecting.**

3. **Throwing away the set** when it agrees.

4. **A 0.1 public gap** as the reason.""",
   line="""Benches shortlist. They do not select. I pick from the eight-dimension table and our eval. I will write that in the ADR even when the benches already like my winner.""",
   key_points=[
    "Benches = shortlist input.",
    "Select on the table + local eval.",
    "Write it in the ADR.",
    "Exploring ≠ selecting.",
    "Keep the set even when it agrees.",
    "0.1 public gaps are not reasons.",
   ],
   questions=[
    q("recall", "Why are benchmarks not enough to select a model?", "They are a shared exam, not your task, latency, cost or path. They shortlist; they do not pick."),
    q("apply", "What does the ADR say?", "Shortlist source, then the local table: set, p95, $, path. A higher MMLU that failed JSON loses."),
    q("debug", "A pick cites a 0.1 MMLU gap. Your comment?", "Noise, and the wrong exam. Show our metric or do not pick yet."),
    q("apply", "You have no set. Are you selecting?", "No. You are exploring. Say so and book the labelling."),
    q("recall", "What happens the week benches disagree with you?", "The process holds if you already named the local eval as source of truth."),
   ],
   links=[
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
    {"title": "Hugging Face: evaluate", "url": "https://huggingface.co/docs/evaluate/index"},
   ],
  ),
  "the-selection-workflow": entry(
   what="""The workflow: **Define the task → Identify requirements → Shortlist → Test on your examples → Measure quality → Measure latency → Measure cost → Inspect failures → Choose**. It is a **pipeline**, not a vibe. Hard requirements (path, verbs, window) sit in "identify". Boards sit in "shortlist". Your set sits in "test/measure". Failures sit before "choose" so you do not crown a 90% that always drops amounts.

Do the steps in order. Skipping "inspect failures" is how you ship a landmine.

This is the moving picture of the eight dimensions.""",
   why="""Interviewers want this sequence almost verbatim. On the job it is the project plan. They will ask where benches go (shortlist) and where legal goes (requirements).

They will punish "we tried a few models and liked B".""",
   how="""Ticket on the wall with the nine arrows. Date each. Attach artefacts: requirements page, shortlist filter, set version, three plots, failure notes, decision.

If time is short: shrink the set, do not skip inspect. Ten failures read beat fifty scores unread.

When you choose, fill the decision log (next item).""",
   failures="""1. **Liked B.**

2. **Skip inspect.**

3. **Shortlist after you already chose.**

4. **Requirements after the bake-off.**""",
   line="""Define, require, shortlist, test, measure quality, latency, cost, inspect failures, choose. I do it in order. I will not skip the failure pile, and I will not start with a favourite.""",
   key_points=[
    "Nine steps, in order.",
    "Requirements before shortlist.",
    "Benches in shortlist only.",
    "Inspect before choose.",
    "Artefacts on the ticket.",
    "Ten failures read beat fifty unread.",
   ],
   questions=[
    q("recall", "Walk the selection workflow.", "Define the task, identify requirements, shortlist, test on your examples, measure quality, latency and cost, inspect failures, choose."),
    q("apply", "Where do legal and Arena sit?", "Legal in requirements. Arena in shortlist. Neither in choose."),
    q("debug", "The team 'liked B' after a demo. Which steps vanished?", "Requirements, a real set, measurements, failure inspect. That is a vibe, not a workflow."),
    q("apply", "You have half a day. What do you not skip?", "A small real set and a look at the failures. Skip extra boards if you must."),
    q("recall", "Why inspect before choose?", "A 90% that always drops the amount field is a landmine. The number hid it."),
   ],
   links=[
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
    {"title": "OpenAI: production best practices", "url": f"{OAI}/guides/production-best-practices"},
   ],
  ),
  "a-written-decision-log-for-model-choice": entry(
   what="""**Record the task, constraints, shortlist, and why you picked the winner.** A **decision log** (ADR-lite) is a page: date, owner, task, hard constraints, candidates, table (eight dimensions), failure notes, winner, **how we will notice we were wrong**, and **the pin**. Without it, six months later nobody knows why the expensive model is still on the classify route.

The log is how you re-evaluate after a provider change (next item) without folklore.

Write it the day you choose, in the repo.""",
   why="""Interviewers will ask what you write down. On the job this is the artefact that survives the team. They will ask what "how we will notice" means (a metric that should not drop).

They will punish "it is in Slack".""",
   how="""Template:

```
# ADR-014 pick extract-v2 model
Date, owner
Task: extract {amount, date} from tickets
Hard: in-region, JSON schema, p95 < 1.2s
Shortlist: A, B, C (filter: ...)
Table: [link]
Failures: B drops Hindi amounts
Winner: A @ pin ...
Review trigger: exact-match < 90% or price +20%
```

Link the set version. When you change the pin, add a line, do not rewrite history.""",
   failures="""1. **Slack-only.**

2. **No review trigger.**

3. **No pin.**

4. **Rewriting the ADR** instead of appending.""",
   line="""I write a decision log the day we choose: task, constraints, shortlist, table, failures, winner, pin, and a review trigger. Six months later that page is why A is still on the route — or why we moved.""",
   key_points=[
    "Task, constraints, shortlist, table, why, pin.",
    "A review trigger.",
    "In the repo, dated.",
    "Append on change; do not rewrite.",
    "Slack is not a log.",
    "Owner named.",
   ],
   questions=[
    q("apply", "What goes in a model-choice decision log?", "Date, owner, task, hard constraints, shortlist, the eight-dimension table, failure notes, winner, pin, and a review trigger."),
    q("recall", "What is a review trigger?", "A metric or event that forces a revisit: quality drop, price hike, deprecation, new snapshot."),
    q("debug", "The expensive model is still on classify and nobody knows why. What was missing?", "A log. Write one now from what you can reconstruct, then re-run the table."),
    q("apply", "Where does it live?", "In the repo next to the eval set, not only in Slack."),
    q("recall", "Do you rewrite the ADR when you change pins?", "No. Append a dated note so the history stays."),
   ],
   links=[
    {"title": "OpenAI: production best practices", "url": f"{OAI}/guides/production-best-practices"},
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
   ],
  ),
  "re-evaluating-after-a-provider-change": entry(
   what="""**Re-run the golden set when the alias or price changes.** A new snapshot is a new function. A new price is a new cost column. A deprecation is a forced move. The decision log's **review trigger** exists for this. Do not assume quality held. Do not assume the cheaper new id is a bargain until you measure tokens per task (it may be wordier).

This is the last habit of Level 1. It closes pins, benches, and choice.

If you cannot re-run, you do not own the model — the vendor does.""",
   why="""Interviewers will ask what you do when the mail says "new default model". On the job this is the cron and the PR. They want: run the set, compare the table, then move or stay.

They will punish "we will see in production".""",
   how="""Triggers: alias move, price page change, deprecation, you changed the prompt, volume 3×.

Action: same set version (unless you must grow it), fill a new row on the table, inspect new failures, update the log, change the pin in one PR.

Shadow the new id at 5% if the risk is high. Do not 100% cutover on a Friday.

If quality holds and price dropped, take the win. If quality dropped 3 points, maybe stay on the old snapshot until you adapt the prompt — or stay forever if the pin still exists.""",
   failures="""1. **See you in prod.**

2. **Friday 100% cutover.**

3. **Assuming cheaper unit price** without token counts.

4. **No trigger** in the log.""",
   line="""When the alias or the price moves I re-run the golden set, I fill a new table row, and I change the pin on purpose. I will not discover a snapshot change in production. If I cannot re-run I do not own the model.""",
   key_points=[
    "Triggers: alias, price, deprecation, prompt, volume.",
    "Same set, new table row.",
    "Inspect new failures.",
    "Shadow if risky; no Friday 100%.",
    "Cheaper unit ≠ cheaper task.",
    "If you cannot re-run, you do not own it.",
   ],
   questions=[
    q("apply", "The vendor changes the default alias. What do you do?", "Keep the pin. Run the golden set on the new id in shadow. Compare the table. Promote with a PR if it wins."),
    q("recall", "Why might a cheaper unit price still cost more?", "The new snapshot is wordier or needs retries. Tokens per successful task can rise."),
    q("debug", "Quality fell on a Monday and nobody shipped code. First check?", "Did an alias move? Re-run the set on the resolved snapshot."),
    q("apply", "What belongs in the pin-change PR?", "The new table row, failure notes, and a rollback to the old id."),
    q("recall", "When do you 100% cut over on a Friday?", "You do not. Shadow, then a weekday with people awake."),
   ],
   links=[
    {"title": "OpenAI: deprecations", "url": "https://platform.openai.com/docs/deprecations"},
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
   ],
  ),
 }
}
