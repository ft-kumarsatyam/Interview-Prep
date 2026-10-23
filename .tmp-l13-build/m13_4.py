from helper import note

PEFT = {"title": "Hugging Face PEFT: LoRA", "url": "https://huggingface.co/docs/peft/developer_guides/lora"}
QLORA = {"title": "QLoRA paper (arXiv)", "url": "https://arxiv.org/abs/2305.14314"}
LORA = {"title": "LoRA paper (arXiv)", "url": "https://arxiv.org/abs/2106.09685"}
VLLM = {"title": "vLLM documentation", "url": "https://docs.vllm.ai/en/latest/"}

NODES = {
    "lora-adapters": note(
        what="""**LoRA** (Low-Rank Adaptation) **freezes** the pretrained weights and trains small **low-rank matrices** that are added to selected layers, usually the attention projections. If a frozen map is `W`, LoRA learns `A` and `B` so the effective map is `W + (alpha/r) * B A`, with `r` much smaller than the full dimension.

You store and serve the tiny adapter, not a second copy of the base. At train time the optimiser only sees the adapter parameters (plus maybe a few norms). At inference you add the adapter (or merge it) and the model behaves as if those layers were slightly retuned.

LoRA is the default PEFT method for LLM instruction and style tunes because the quality-to-memory ratio is high on narrow tasks.""",
        why="""On the job, LoRA is how a single 24–48GB GPU becomes a training machine for 7–13B models, and how thirty tenants share one base at serve time. If you cannot explain it, you cannot debug a "we loaded the wrong adapter" incident.

Interviews: draw `W + BA`, say what is frozen, name rank, and say adapters are base-specific.""",
        how="""Pick target modules (start with `q,k,v,o` or the house default), pick `r` (8–16 is a common start), pick `alpha` (often 2r or a house default), train, save the adapter folder.

Example. 8B instruct, rank 16 on attention. Trainable parameters are a few tens of millions, not 8B. The adapter is tens of megabytes. You attach it in PEFT or vLLM by name. Swap to a second tenant's adapter without unloading the base.

Sanity check: with `r` approaching the full width you have almost-full FT in a clumsy form. If you need that, admit you want more capacity and measure; do not sneak up to `r=256` by habit.""",
        fails="""1. **Thinking adapters port across bases.** They do not.

2. **Training LoRA but serving the base only.** The eval was on the adapter; prod is unadapted.

3. **Forgetting alpha.** Rank without scale is an incomplete description.""",
        line="LoRA freezes the base and trains small low-rank add-ons on chosen layers. I get a portable, swappable behaviour pack that is bound to one base and cheap to store.",
        kps=[
            "Frozen W plus low-rank BA on selected layers.",
            "Only adapter params are trained and stored.",
            "Default PEFT for narrow LLM behaviour changes.",
            "Adapters do not load on a different base.",
            "Rank and alpha both belong in the config.",
            "Serve must actually attach the adapter you evaluated.",
        ],
        qs=[
            {"q": "What does LoRA freeze and what does it train?", "a": "It freezes the pretrained weight matrices and trains small low-rank factors A and B that are added to chosen layers, scaled by alpha/r. The base stays a shared artefact.", "kind": "recall"},
            {"q": "Why can many tenants share one GPU with LoRA?", "a": "One base resides in memory; each tenant is a small adapter you swap or batch. Full fine-tunes would be one full copy each.", "kind": "apply"},
            {"q": "Eval used the adapter; the gateway loaded only the base. Symptom?", "a": "Production looks like the untuned model. Check adapter id in traces. This is a deploy bug, not a training miss.", "kind": "debug"},
            {"q": "Write the effective LoRA map in one line.", "a": "W' = W + (alpha / r) * B A, with W frozen and r << d.", "kind": "recall"},
            {"q": "When is raising rank the wrong next step?", "a": "When the run has not yet had a proper LR sweep, or when the failure is template/data. Rank is capacity; it does not fix a wrong dialect or dirty labels.", "kind": "apply"},
        ],
        links=[LORA, PEFT],
    ),
    "qlora-on-a-quantized-base": note(
        what="""**QLoRA** loads the **frozen base in a quantized** form (commonly 4-bit) so the same LoRA tune **fits on a much smaller GPU**. Adapters still train in higher precision. The memory win is the base weights and their absence from the optimiser, not a 4-bit adapter.

QLoRA is a training trick. Serving may use 4-bit, 8-bit, or 16-bit after you **merge or attach** and **re-evaluate**. A 4-bit train does not automatically license a 4-bit serve win.""",
        why="""On the job this is how an 8B or 13B tune happens on one consumer GPU. It is also how people ship a quality drop they never measured, because they served a different precision than they evaluated.

Interviews: 4-bit frozen base, high-precision adapters, re-eval after dequant/serve path.""",
        how="""Load the base with the library's 4-bit config (NF4/double quant as documented), attach LoRA, train. Estimate VRAM from quantized weights + LoRA + activations (activations still scale with batch and length).

Example. 8B FP16 base ≈ 16GB weights alone; 4-bit ≈ 4GB plus overhead. LoRA and a short sequence now fit in 16–24GB. You train, then eval three ways: adapter on 4-bit base, adapter on 16-bit base, merged-then-quantized GGUF. The winner is an empirical table, not a slogan.

Watch paged/optimizer settings and gradient checkpointing; they often matter more to OOM than the adapter rank.""",
        fails="""1. **Eval only in the 4-bit trainer.** Serve is 16-bit or GGUF and the number moves.

2. **Assuming 4-bit serve is free.** Quantization error can erase a small tune gain.

3. **OOM on long sequences blamed on 4-bit.** Activations, not the frozen weights, blew up.""",
        line="QLoRA quantises the frozen base so LoRA fits on a small GPU. I still train adapters in higher precision, and I re-evaluate the actual serve precision because a 4-bit train is not a 4-bit trophy.",
        kps=[
            "QLoRA: 4-bit frozen base + higher-precision LoRA.",
            "Memory win is the base, not a tiny optimiser on all weights.",
            "Re-eval after you dequantise or export for serve.",
            "Activations still grow with batch and sequence length.",
            "A 4-bit train does not guarantee a 4-bit production win.",
            "Checkpointing and microbatch often fix OOM before rank does.",
        ],
        qs=[
            {"q": "What does QLoRA quantise, and what stays high precision?", "a": "The frozen base weights are stored quantized (often 4-bit). The LoRA adapters and their gradients stay in higher precision so the update is not 4-bit junk.", "kind": "recall"},
            {"q": "Why re-evaluate after merging to 16-bit or exporting GGUF?", "a": "Quantisation and merge order change numerics. The trainer's 4-bit number can shrink or vanish on the serve path. Measure the path you will ship.", "kind": "apply"},
            {"q": "QLoRA OOMs only on the longest 5% of rows. Cause?", "a": "Activation memory scales with sequence length. Shorten, checkpoint, or microbatch those rows. The 4-bit base already did its job.", "kind": "debug"},
            {"q": "Is QLoRA an inference method?", "a": "It is primarily a training-time memory method. You may also serve quantized, but that is a separate eval. Do not conflate the two.", "kind": "recall"},
            {"q": "When would you skip QLoRA and train LoRA in 16-bit?", "a": "When you have the VRAM and the 4-bit train/eval gap has bitten you, or when the stack's 4-bit kernels are unstable for that architecture. Memory is the reason to use it, not fashion.", "kind": "apply"},
        ],
        links=[QLORA, PEFT],
    ),
    "rank-alpha-target-modules": note(
        what="""The LoRA settings that matter first are **rank (r)**, **alpha**, **target modules**, **dropout**, **compute precision**, and **quantization type** if you QLoRA. Rank is adapter capacity. Alpha scales the update (`alpha/r`). Targets decide which matrices receive adapters. Dropout regularises small sets. Precision/quant decide memory and numerics.

Defaults are not magic. A rank-8 adapter on `q` and `v` only is a different model from rank-64 on attention plus MLP.""",
        why="""On the job, people copy `r=64, alpha=16` from a repo that solved a different task and then declare LoRA weak. The settings were the experiment.

Interviews: define each knob in one sentence and say you sweep rank on a held-out curve after LR is stable.""",
        how="""Start conservative: attention projections, r=8 or 16, alpha=16 or 32, dropout 0.05–0.1 on small data, 4-bit NF4 if QLoRA. Sweep rank after LR. Add MLP (`up/down/gate`) only if the eval still misses and generations look underfit (not noisy).

Example. r=4, q/v only: format still drifts. r=16, q/k/v/o: format locks, labels good. r=64 + MLP: train loss lower, val flat, serve heavier. You keep r=16 attention.

Write `alpha/r` in the card. Two runs with r=16, alpha=16 versus r=16, alpha=32 are different step sizes, not the same adapter with a typo.""",
        fails="""1. **Tiny rank, blaming LoRA.** Under-capacity.

2. **Huge rank on 300 rows.** Over-capacity, overfit.

3. **Silent target mismatch** between train config and serve config.""",
        line="I treat rank, alpha, targets, dropout, and quant as a written recipe. I start with attention and a small rank, and I only add capacity after an LR-stable eval says I am underfitting.",
        kps=[
            "Rank = capacity; alpha scales the update (alpha/r).",
            "Targets: start with attention; add MLP if still underfit.",
            "Dropout helps tiny sets; it is not a substitute for cleaning.",
            "Precision and quant type change memory and numerics.",
            "Sweep rank after LR, on a held-out curve.",
            "Train and serve must name the same target modules.",
        ],
        qs=[
            {"q": "What does LoRA rank control?", "a": "The inner dimension of A and B, hence adapter capacity and size. Too small underfits; too large on a tiny set overfits and costs serve memory.", "kind": "recall"},
            {"q": "r=16, alpha=16 versus r=16, alpha=32. What changed?", "a": "The scale alpha/r doubled, so the same learned factors hit the residual harder. It is not the same recipe.", "kind": "apply"},
            {"q": "Underfit on a hard rewrite with q,v rank 4. First capacity change?", "a": "Add the rest of attention and/or raise rank a step. Add MLP only if that still misses. Do not jump to full FT yet.", "kind": "debug"},
            {"q": "Why list target modules in the run card?", "a": "Serve and later rebases must attach the same set. A missing `o_proj` at serve is a silent quality drop.", "kind": "recall"},
            {"q": "When does LoRA dropout help?", "a": "On small, slightly noisy sets where the adapter memorizes phrasing. It will not fix a wrong spec or a leak.", "kind": "apply"},
        ],
        links=[PEFT, LORA],
    ),
    "adapters-vs-full-fine-tuning": note(
        what="""The trade-off is **quality versus memory, time, storage, and serving flexibility**. Adapters usually keep enough quality on narrow tasks while winning every operational axis. Full fine-tuning can edge quality on broad shifts and then lose on host cost and multi-tenant serving.

Do not treat the trade-off as religious. Run the same data and eval if the decision is expensive. Treat "I have not tried LoRA" as incomplete, not as a preference for full FT.""",
        why="""On the job this decision is money. A full 70B tune you cannot host is a write-off. An adapter you can multi-serve is a platform.

Interviews: table the four axes and give one case for each side.""",
        how="""Write the table before the job.

| | Adapter | Full FT |
| Memory | Small GPU / QLoRA | Large GPU or ZeRO |
| Time | Hours | Longer |
| Storage | MB | Full copy |
| Serve | Multi-LoRA, swap | One blob |
| Quality | Usually enough | Maybe higher on broad shifts |

Example. Ten house styles on one 8B. Adapters: one base, ten files, vLLM extra-LoRA. Full FT: ten 16GB blobs or a nightmare merge. Quality on a tone eval differs by a point. Adapters win.

Counter-example. You are adapting a base to a new language with millions of tokens and you have a cluster. Full FT (or continued pretrain) may be the real job. That is not a ticket router.""",
        fails="""1. **Full FT for a style tweak.** Operational waste.

2. **Adapter-only dogma** on a true domain rewrite you have already seen underfit.

3. **Ignoring serve.** The cheaper train produces the unhostable artefact.""",
        line="I pick adapters when the task is narrow and I need cheap retrain and multi-serve. I pick full FT only after adapters underfit a shift I can actually host.",
        kps=[
            "Compare quality, memory, time, storage, and serve.",
            "Narrow style/format: adapters almost always win ops.",
            "Full FT can win broad domain shifts at high cost.",
            "Multi-tenant almost forces adapters.",
            "A quality edge that you cannot host is not a win.",
            "Measure both on the same eval if the spend is large.",
        ],
        qs=[
            {"q": "Name four operational axes where adapters usually beat full FT.", "a": "Peak memory, train time, storage of the artefact, and the ability to serve many variants on one base. Quality is the remaining axis and often close on narrow tasks.", "kind": "recall"},
            {"q": "You need 25 per-customer tones on one 8B. Which path?", "a": "One LoRA per customer, multi-adapter serving. Full FT would be 25 full copies and a serving disaster.", "kind": "apply"},
            {"q": "High-rank LoRA plus MLP still underfits a language-shift with lots of data. Next?", "a": "Now discuss full FT or a better multilingual base, with a host plan. You have evidence adapters ran out.", "kind": "debug"},
            {"q": "Why is 'full FT is more serious' a weak argument?", "a": "Serious is a measured gain you can serve and retrain. Updating more tensors is not a quality proof.", "kind": "recall"},
            {"q": "How does rollback differ?", "a": "Adapter rollback is a pointer change to another small file. Full FT rollback is swapping large blobs or keeping two full models hot.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "peft-with-unsloth-or-axolotl": note(
        what="""**Unsloth**, **Axolotl**, TRL, and vendor UIs are **front ends** over PEFT. The skill is not the logo. The skill is a **configuration file someone else can rerun**: base, data, template, LoRA knobs, seed, output. The tool should emit that file and a checkpoint you can load outside the tool.

Pick a tool because it supports your base, your GPU, and export. Do not pick it because a thread said it is 2× faster without checking the eval.""",
        why="""On the job, tool lock-in shows up when the wizard cannot export an adapter that vLLM loads, or when the YAML is not in git.

Interviews: name one stack, then immediately talk about the config and the eval — not the marketing speedup.""",
        how="""Requirements for whatever you pick:

- Config in version control
- Dataset hash recorded
- Official chat template, not a built-in surprise
- Export to standard PEFT adapter or merged weights
- Same eval script as production thinking

Example. Axolotl YAML pins model, `lora_r`, datasets, `sequence_len`. You run it on a rented 24GB box, push the adapter to the registry, eval with the house script, serve with vLLM. A year later Unsloth is fashionable; you replay the **eval**, not the brand.

Four-row overfit still applies. A faster trainer that cannot overfit four rows has a template bug.""",
        fails="""1. **Clicky UI, no YAML in git.** Souvenir.

2. **Tool-specific template** that serve does not use.

3. **Speed without eval.** You trained the wrong thing faster.""",
        line="I use Unsloth, Axolotl, or TRL as a rerunnable config plus a standard adapter export. The tool is replaceable; the recipe and eval are not.",
        kps=[
            "Tools are PEFT front ends; the config is the product.",
            "Require git-tracked YAML/CLI and a standard export.",
            "Do not accept a surprise template from the wizard.",
            "Re-run the house eval, not the tool's demo metric.",
            "Four-row overfit still applies in a fast trainer.",
            "Speed claims do not replace a held-out table.",
        ],
        qs=[
            {"q": "What must a PEFT tool emit besides weights?", "a": "A rerunnable config that pins base, data, template, LoRA knobs, and seed, plus an export your server can load (standard adapter or merged weights).", "kind": "recall"},
            {"q": "The wizard used its own chat format; vLLM uses the tokenizer template. Risk?", "a": "Train/serve mismatch and ramble. Force the official template in the tool or abandon the wizard.", "kind": "debug"},
            {"q": "How do you change tools without losing the project?", "a": "Keep the dataset hash and eval script constant. Port the knobs to the new config and compare the same table. The brand is not the artefact.", "kind": "apply"},
            {"q": "Why is a 2× speedup not a reason to skip the four-row overfit?", "a": "Faster wrong pipes are still wrong. Overfit proves mask and template before you spend the night job.", "kind": "recall"},
            {"q": "The UI has no export, only hosted inference. Problem?", "a": "You may not be able to leave. Check portability before you invest the dataset. DIY or a vendor that returns weights may be required.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "estimating-gpu-memory": note(
        what="""GPU memory is roughly **weights + optimiser states + activations + overhead**. Weights scale with parameter count and precision (16-bit ≈ 2 bytes/param; 4-bit ≈ 0.5). Optimiser states apply to **trainable** params (large in full FT, small in LoRA). **Activations** scale with batch × sequence length × layers × hidden size, and they are why long rows OOM a job that "should fit" from the weight math.

Estimate before you rent. A wrong estimate is a surprise bill or a weekend of OOMs.""",
        why="""On the job, this is how you pick a 16 vs 24 vs 80GB box and whether QLoRA is required. Guessing from a tweet about a different length is how you burn credits.

Interviews: name the four terms and say activations, not adapter rank, usually blow long-context jobs.""",
        how="""Back-of-envelope for QLoRA 8B, r=16, seq=2048, microbatch=1: ~5–6GB 4-bit weights+overhead, a small LoRA optimiser, and several GB of activations (more with no checkpointing). If you raise seq to 8192 or batch to 4, activations dominate; checkpoint or shorten.

Example. Job OOMs at 90% of steps. Those steps are the long tail. You enable gradient checkpointing, set a length cap at the 95th percentile, or pack short rows together. You do not blindly rent an 80GB box for a rank issue.

Always add fragmentation headroom (a few GB). Peak is not average.""",
        fails="""1. **Estimating from weights only.** You forget activations and Adam.

2. **Blaming LoRA rank for a length OOM.**

3. **No headroom.** The job dies at the last batch.""",
        line="I estimate VRAM as quantised weights plus optimiser on trainable params plus activations that grow with batch and length, and I fix long-row OOMs with checkpointing or shorter sequences before I rent a bigger GPU.",
        kps=[
            "Memory ≈ weights + optimiser + activations + overhead.",
            "Precision and who is trainable dominate the first two terms.",
            "Activations scale with batch × sequence length.",
            "Long-row OOM is usually activations, not rank.",
            "Gradient checkpointing trades time for activation memory.",
            "Leave headroom; peaks are not averages.",
        ],
        qs=[
            {"q": "Which term usually causes OOM on the longest examples?", "a": "Activations, which grow with sequence length (and batch). The 4-bit base does not suddenly get larger on long rows.", "kind": "recall"},
            {"q": "QLoRA 8B fits at length 2k and dies at 8k. First fixes?", "a": "Gradient checkpointing, smaller microbatch, or a length cap / packing policy. Renting 80GB is the last move.", "kind": "apply"},
            {"q": "Why is full-FT memory so much higher than LoRA at the same batch?", "a": "Adam-style optimiser states on every parameter, plus gradients for every parameter. LoRA keeps those states only on the adapter.", "kind": "recall"},
            {"q": "Your estimate used average length, not the 99th percentile. What happens?", "a": "The job OOMs on the tail. Estimate with a high percentile or a hard cap you actually enforce.", "kind": "debug"},
            {"q": "What does gradient checkpointing trade?", "a": "It recomputes activations in the backward pass to save memory, so steps slow down. That is often cheaper than a larger GPU.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "tracking-runs": note(
        what="""A run you cannot compare is a story, not an experiment. **Track** dataset version, config (including template and seed), git commit, GPU, and **evaluation results** in one place — a tracker, a spreadsheet, or a table in the repo. The adapter file name is not a tracker.

Comparison means the same held-out set and the same judge. If those moved, you are not allowed to say "this run won".""",
        why="""On the job, two weeks of LoRA folklore collapse when someone asks which rank won. The answer is in Slack and contradicts W&B.

Interviews: "how do you organise experiments?" — one table keyed by run id with data hash and metrics.""",
        how="""Minimum columns: `run_id`, `dataset_hash`, `base`, `template_hash`, `r`, `alpha`, `lr`, `steps`, `val_skill`, `probe`, `notes`. Attach the config path.

Example. Twelve runs. The table shows r=8 and r=16 tied on val, r=64 worse on probes. You pick r=8. Without the table you would have shipped the last run because it finished on Friday.

If you use a hosted tracker, still dump a JSON next to the checkpoint. Hosted UIs get deleted; the artefact should carry its own card.""",
        fails="""1. **Metrics without data hash.** You compare different tests.

2. **Renaming folders by vibe.** `final_v2_real` is not an id.

3. **Private tracker, no card on the artefact.** The next owner is blind.""",
        line="Every run is a row: data hash, config, and the same eval numbers. If I cannot sort that table I am not experimenting, I am collecting folders.",
        kps=[
            "Track data hash, config, and eval together.",
            "Same held-out set and judge to compare runs.",
            "Put a card next to the checkpoint, not only in a UI.",
            "Run ids, not final_v2_real folder names.",
            "The table, not the last finished job, picks the winner.",
            "If the eval moved, you lost the right to compare.",
        ],
        qs=[
            {"q": "What three things must a run record to be comparable?", "a": "Dataset version/hash, the full config (base, template, knobs, seed), and metrics on the same held-out eval. Missing any one makes 'this run won' rhetoric.", "kind": "recall"},
            {"q": "Two runs differ by 3 points but used different test files. What can you say?", "a": "Nothing about the knobs. Re-score both on one frozen set or throw the comparison out.", "kind": "debug"},
            {"q": "Why dump a JSON card next to the adapter?", "a": "So the artefact is self-describing when the tracker is gone, and so serve and rollback can read adapter id, base, and template without a wiki.", "kind": "apply"},
            {"q": "Who wins if Friday's run is not the best row in the table?", "a": "The best row, subject to the pre-written rule. Recency is not a metric.", "kind": "apply"},
            {"q": "What happens if only train loss is tracked?", "a": "You will pick memorisers. Track val skill and probes, not just loss.", "kind": "recall"},
        ],
        links=[],
    ),
    "diy-vs-managed-fine-tuning": note(
        what="""**DIY** means you train an open-weight (or licensed) model on your GPUs or a rented box and you **keep the weights**. **Managed** means you send data to a provider's fine-tune API and you get a hosted model name back. The axes are **data boundary**, **base catalogue**, **export**, **price shape**, and **ops burden**.

Neither is morally better. A bank that cannot leave the VPC does DIY. A team that wants a hosted GPT-class tune and accepts no export uses managed. A team that wants both often discovers they cannot have both.""",
        why="""On the job this is a legal conversation disguised as ML. Sending logs to a tune API may be forbidden. Keeping weights may be required for residency — or impossible if the only good base is closed.

Interviews: list the axes. Mention that managed tunes die with the vendor base.""",
        how="""Decision checklist:

- May the data leave the boundary? If no → DIY open weights.
- Must you export weights? If yes → DIY or a vendor that returns files.
- Do you need that closed model family? If yes → managed, with a deprecation plan.
- Who pages when training breaks? If you have no GPU people → managed or don't tune.

Example. Health notes cannot leave the VPC. You QLoRA an open 8B on an internal box, eval inside, serve inside. The JD said "OpenAI fine-tuning"; you decline that path in the design review and write why.

Counter-example. A consumer app wants a cheap hosted style tune on a closed small model, data is already in that vendor's logs under existing terms. Managed is fine; you still keep the JSONL.""",
        fails="""1. **Managed with no export, then procurement change.** You cannot leave.

2. **DIY with no one to operate GPUs.** The adapter is a local file on a laptop.

3. **Ignoring terms on training data** in either path.""",
        line="I choose DIY when data or weights must stay mine, and managed when the catalogue and ops are worth the lock-in. I will not send regulated logs to a tune API to save a weekend.",
        kps=[
            "DIY: you keep weights and the data boundary.",
            "Managed: hosted name, limited catalogue, often no export.",
            "Ask data-residency and export before you talk LR.",
            "Managed tunes still die when that base is retired.",
            "Keep the JSONL even if you never see tensors.",
            "No GPU operators means DIY is unfinished, not cheaper.",
        ],
        qs=[
            {"q": "When is managed fine-tuning the wrong default?", "a": "When data cannot leave the boundary, when you must possess weights, or when you cannot accept the vendor retiring the base. Then DIY on an allowed open-weight model.", "kind": "recall"},
            {"q": "Client data must stay on-prem. Which path?", "a": "DIY with an open-weight base inside their environment. A managed API sends data out even if the brochure says it is not used for training.", "kind": "apply"},
            {"q": "You have a managed tune and no export. The vendor doubles prices. Options?", "a": "Retrain elsewhere only if you kept the JSONL and an eval. The hosted artefact is not portable. That risk should have been on the original sheet.", "kind": "debug"},
            {"q": "What do you still keep if you use a managed API?", "a": "The training file, the spec, the eval, and the decision record. Those outlive the hosted model name.", "kind": "recall"},
            {"q": "DIY 'saved money' but the only GPU is an engineer's laptop. What did you buy?", "a": "A single point of failure and a model you cannot page. Budget hosted GPUs or do not tune.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "rank-versus-quality-curve": note(
        what="""A **rank-versus-quality curve** is a held-out plot of skill (and maybe probe health) against `r`. You pick the **smallest rank that holds the gain**. Bigger is not better; it is more overfit risk and more serve cost.

The curve is only valid at a **fixed LR and data**. Mixing knobs forges a cartoon.""",
        why="""On the job, defaulting to r=64 "to be safe" makes multi-LoRA heavier and can hurt val. The curve is a one-afternoon experiment that pays every serve hour.

Interviews: "how do you choose rank?" — sweep, smallest that plateaus.""",
        how="""After the LR sweep, train r ∈ {4,8,16,32,64} with the same steps and data. Plot val skill and adapter size. Pick the elbow.

Example. r=4: +3 F1. r=8: +7. r=16: +7.2. r=32: +7.1, refusal −2. You pick 8. The extra rank was vanity.

If the curve never plateaus and generations still miss structure, you may need more targets (MLP) or more clean data — not r=256 as a first reflex.""",
        fails="""1. **One rank, folklore.** 

2. **Picking the peak train-loss rank.**

3. **Changing LR at each rank** so the curve is noise.""",
        line="I sweep rank on a held-out skill curve and take the smallest r that holds the gain. Extra rank after the elbow is serve cost and overfit.",
        kps=[
            "Plot val skill against rank at fixed LR and data.",
            "Choose the smallest r that holds the gain (the elbow).",
            "Larger r can hurt probes and serve memory.",
            "If the curve never elbows, look at targets or data, not r=256 first.",
            "Do not change LR at each rank if you want a readable curve.",
            "Record the curve in the decision record.",
        ],
        qs=[
            {"q": "How do you choose LoRA rank with a curve?", "a": "Train a small grid of ranks at a fixed LR and dataset, plot held-out skill, and pick the smallest rank at the elbow where the gain holds.", "kind": "recall"},
            {"q": "r=8 and r=32 match on val; r=32 is slightly worse on refusals. Pick?", "a": "r=8. It holds the gain and is kinder to probes and serve.", "kind": "apply"},
            {"q": "The curve climbs through r=64 with no plateau. Next thought?", "a": "Maybe under-capacity, but also check data quality and whether MLP targets are needed. Do not jump to full FT until those are tried.", "kind": "debug"},
            {"q": "Why fix LR across the rank sweep?", "a": "Otherwise you cannot attribute the change to rank. A lucky LR at r=32 will look like 'more rank is better'.", "kind": "recall"},
            {"q": "How does the curve help multi-LoRA serving?", "a": "Smaller adapters are cheaper to keep hot and to swap. The elbow often saves memory at no quality cost.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "which-layers-to-adapt": note(
        what="""Start adapters on **attention projections** (`q`, `k`, `v`, `o` as the architecture names them). **Add MLP** (gate/up/down) only if the held-out eval still misses and the sheet looks underfit — not as a default from a maximal YAML.

Attention adapters often capture style and format. MLP adapters add capacity for heavier rewrites and can add overfit on small sets.""",
        why="""On the job, "adapt everything" is a common copy-paste. It doubles adapter size and sometimes does nothing for a labeler.

Interviews: attention first, MLP if needed, measure.""",
        how="""Two-point experiment after LR and a first rank: (1) attention only, (2) attention + MLP. Same r. Compare val skill, probes, and adapter size.

Example. Label router: attention-only matches attention+MLP within 0.3 F1 and is half the file. You keep attention-only. A creative rewrite task: attention-only still drifts on structure; adding MLP locks it. You add MLP for that task only.

Document the target list. Serve must attach the same list.""",
        fails="""1. **MLP by default on 400 rows.** Extra overfit.

2. **Different targets at serve.** Silent drop.

3. **Adapting embeddings first.** Rarely the first lever for SFT style.""",
        line="I adapt attention first and I add MLP only when the eval still looks underfit. Copy-pasting 'all linear layers' is a size bill, not a strategy.",
        kps=[
            "Default targets: attention projections.",
            "Add MLP only after an eval miss that looks like underfit.",
            "More targets = larger adapter and more overfit risk.",
            "Train and serve must list the same modules.",
            "A labeler often does not need MLP adapters.",
            "Measure a two-point A/B, do not theorise.",
        ],
        qs=[
            {"q": "Which layers do you adapt first, and why?", "a": "Attention projections. They are the usual sweet spot for style and format changes and keep the adapter small. MLP is extra capacity you add only if needed.", "kind": "recall"},
            {"q": "Attention-only underfits a heavy rewrite; labels are fine. What do you add?", "a": "MLP targets on the same rank, then re-eval. Do not jump to full FT until that A/B is done.", "kind": "apply"},
            {"q": "Serve omitted mlp adapters you trained. Symptom?", "a": "Quality between base and the notebook eval. The missing targets never load. Fix the serve config.", "kind": "debug"},
            {"q": "Why not adapt every linear layer on a 300-row set?", "a": "You add parameters the data cannot constrain. Attention-only is enough for many narrow tasks and regularises for free.", "kind": "recall"},
            {"q": "How do you record the decision?", "a": "Put the target module list and the two-point table in the run card so a rebase does not 'helpfully' switch to all-linear.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "merge-versus-keep-separate": note(
        what="""**Keep the adapter separate** when you need to **swap**, **multi-serve**, or **roll back** without touching the base. **Merge** (`W := W + BA`) when you need a **single file** for a runtime that cannot load PEFT (some GGUF/Ollama paths, simple servers) or when you will never swap.

Merge is a one-way convenience copy. Keep the unmerged adapter and the recipe anyway. Merged weights are a serve artefact, not the source of truth.""",
        why="""On the job, merging ten customer tones into ten full models is how you run out of disk. Keeping adapters separate is how vLLM earns its keep. Merging one house model for a laptop demo is fine.

Interviews: say when each wins, and that you re-eval after merge.""",
        how="""Decision:

- Many variants, one base → keep separate, multi-LoRA.
- One variant, simple host → merge, then quantise if needed.
- Always keep the adapter + config in the registry even if you serve merged.

Example. You merge for an Ollama drop, re-run the eval on the merged (and quantized) file, and still store `adapter.zip`. A month later you need a second tone; you did not paint yourself into ten merged blobs.

Merge in **high precision**, then quantise. Merging into already-quantized weights stacks rounding error.""",
        fails="""1. **Merge-only, adapter deleted.** You cannot rebase cheaply.

2. **Merge into 4-bit, then wonder why eval dropped.**

3. **Separate adapters but a server that cannot load them.** You shipped an unloadable artefact.""",
        line="I keep adapters separate for swap and multi-serve, I merge when the runtime wants one file, and I always keep the unmerged adapter as the source of truth after a high-precision merge.",
        kps=[
            "Separate: swap, multi-LoRA, cheap rollback.",
            "Merge: single-file runtimes, one-off deploys.",
            "Merged weights are a serve artefact; keep the adapter.",
            "Merge in high precision, then quantise.",
            "Re-evaluate after merge; numerics move.",
            "Do not delete the recipe when you merge.",
        ],
        qs=[
            {"q": "When do you keep a LoRA separate versus merge it?", "a": "Keep separate for multi-tenant swap and rollback on one base. Merge when the runtime needs a single blob. In both cases keep the unmerged adapter stored.", "kind": "recall"},
            {"q": "Why merge in 16-bit before making a GGUF?", "a": "Merging into already quantized weights adds rounding error on top of quantisation error. Merge high precision, then quantise once, then eval.", "kind": "apply"},
            {"q": "You deleted the adapter after a merge and the base was updated. Cost?", "a": "A full retrain from data, and you cannot even serve the old pair if the merged blob was tied to the old base. The adapter was the cheap artefact.", "kind": "debug"},
            {"q": "Thirty tones, one 8B, vLLM. Merge?", "a": "No. Separate adapters and multi-LoRA serving. Merging would be thirty full models.", "kind": "apply"},
            {"q": "Does merge change the need to match the chat template?", "a": "No. The template is independent of whether BA has been added into W. Mismatch still rambles.", "kind": "recall"},
        ],
        links=[PEFT, VLLM],
    ),
    "qlora-precision-traps": note(
        what="""A **4-bit train is not a 4-bit trophy**. Traps: evaluating only inside the trainer; serving dequantised 16-bit without re-scoring; merging into quantized weights; mixing NF4 train with a different serve quant; assuming tokens/sec at 4-bit equals quality at 4-bit.

The honest artefact is a **table**: train precision × serve precision × metric. Ship the cell you measured.""",
        why="""On the job, the "QLoRA win" disappears in Ollama and people blame LoRA. The path changed.

Interviews: this is an easy debug story. Tell it.""",
        how="""After QLoRA, score at least:

1. Adapter + 4-bit base (trainer-like)
2. Adapter + 16-bit base
3. Merged 16-bit
4. The actual export (GGUF/Q4, vendor host, etc.)

Example. (1) 0.91 F1, (2) 0.90, (3) 0.90, (4) 0.84. The tune is real; the export ate it. You serve 16-bit adapter or a milder quant, or you accept 0.84 if cost demands it — **explicitly**.

Also trap: `torch_dtype` mismatches and kernels that silently upcast. Record dtypes in the card.""",
        fails="""1. **One number from the trainer UI.**

2. **Double quantisation** (train 4-bit, merge 4-bit, export 4-bit) without a row on the table.

3. **Comparing QLoRA quality to an FP16 full FT trained with a different recipe.**""",
        line="I re-score QLoRA on the serve precision I will actually use. A 4-bit training win that dies in GGUF is a serving choice, not a proof that LoRA failed.",
        kps=[
            "Re-eval after dequant, merge, and export.",
            "Ship the measured cell, not the trainer screenshot.",
            "Do not merge into already-quantized weights.",
            "4-bit speed is not 4-bit quality.",
            "Record dtypes and quant types in the card.",
            "If export kills the gain, serve a milder precision or drop the tune.",
        ],
        qs=[
            {"q": "Why can a QLoRA eval in the trainer overstate production quality?", "a": "Production may dequantise, merge, or re-quantise with a different scheme. Those steps change numerics. Only the serve-path score is the product.", "kind": "recall"},
            {"q": "Trainer F1 0.91, GGUF Q4 F1 0.84. Options?", "a": "Serve the 16-bit adapter, pick a milder quant, or decide the 0.84 still beats the prompted baseline on cost. Do not silently ship Q4.", "kind": "apply"},
            {"q": "You merged BA into a 4-bit W then exported. Likely issue?", "a": "Stacked quantisation error. Merge in 16-bit, then quantise once, then measure.", "kind": "debug"},
            {"q": "What belongs on a QLoRA precision table?", "a": "Rows for trainer 4-bit, 16-bit attach, merged 16-bit, and the real export, each with the same eval. Plus dtypes and quant names.", "kind": "recall"},
            {"q": "Is a 4-bit serve always the point of QLoRA?", "a": "No. QLoRA's point is training memory. Serve precision is a separate product choice.", "kind": "apply"},
        ],
        links=[QLORA, PEFT],
    ),
}
