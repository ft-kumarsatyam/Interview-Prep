"""Original extra paragraphs to lift short L13 notes into the 3200–5500 target."""

E = {
"m13-1": {
"what-fine-tuning-is-good-for": (
"Interviewers want style/format/closed labels/distillation — and a volume reason. 'Customising the model' is a brochure.",
"Ticket-router example: 40 labels, 6k tickets, 80k/day. Prompted frontier is 91% and invents a 41st label. A 3B LoRA hits 90% with near-zero invalid labels at a tenth the unit cost (illustrative). You did not tune to 'know the product'. You tuned a stable mapping. A ten-call-a-day tool would have kept the long prompt.",
"4. **Tuning a moving label set** that product still invents weekly.",
),
"start-from-a-measured-failure": (
"No baseline, no project. They want the failure buckets and which ones are tunable.",
"Of 200 misses: 120 missing context (retrieval), 30 schema (constrain decoding), 50 tone/label. Only the last 50 are tune candidates. You write that split before anyone books a GPU. The upside is bounded; you can price it.",
"4. **A vibe that 'the model is sloppy'** with no tagged misses.",
),
"the-full-cost-of-a-tune": (
"GPU hours are the visible line. Data, evals, serving and the next retrain are the bill.",
"Estimate: 2 engineer-weeks to clean data, 1 to harness, $X to train (small), $Y/month to serve, 2 retrains/year when the base moves. Example: a $40 run became a quarter of an engineer. You put all five lines on the ADR. If the residual error is a prompt, this estimate should kill the project.",
"4. **Quoting only the training SKU** to a VP.",
),
"tied-to-one-base-model": (
"An adapter is married to a base revision. Next quarter's better base is a retrain, not a rename.",
"Write the retrain tax into the first estimate. Example: the catalog retires your 8B in 90 days. The durable assets are the dataset, recipe and eval. The adapter file is a souvenir. Teams that 'just change the model name' discover PEFT will not apply.",
"4. **Treating the adapter as portable across families.**",
),
"prompt-then-retrieve-then-tune": (
"Exhaust the cheap rungs and write the residual error. Opening a job first is the junior tell.",
"Checklist signed in the ADR: prompt work done, retrieval/tools tried, residual tagged as style/format not facts. Example: a policy bot's misses were stale fees. Retrieval closed them. You never opened a job. A second project had a residual JSON drift after schema constraints — that one earned a LoRA.",
"4. **Skipping retrieval** because 'we will bake the wiki in'.",
),
"style-versus-knowledge-test": (
"If the miss is a missing fact, it is not a tune candidate. If it is tone or format, it might be.",
"Tag each residual miss: knowledge vs behaviour. Example: 40 knowledge, 8 format. You retrieve. You do not train. A 40/8 split the other way, with a written spec, is a tune conversation.",
"4. **A mixed bag you trained anyway** so the model became confidently wrong about last year's policy.",
),
"retrain-tax-in-the-estimate": (
"Include the next base upgrade, not only the first run. Interviewers listen for this line.",
"Put 'retrain twice a year' (or at every catalog EOL) in the cost table. Example: year-1 looks cheap; year-2 with two catalog moves matches a full engineer-month. That number belongs on the first slide.",
"4. **A one-run business case.**",
),
"decline-a-tune-in-an-interview": (
"Be ready to refuse an FAQ bot. Facts change, citations matter, ACLs matter.",
"Script: 'Your FAQ is knowledge that changes. I would retrieve the articles and eval citation validity. I would only tune if a house tone still failed after that. Fine-tuning the wiki would go stale and could not respect per-user pages.' Then stop. Do not offer a LoRA to be polite.",
"4. **Agreeing to tune because the job description said fine-tuning.**",
),
},
"m13-2": {
"specify-the-behavior-first": (
"A written spec is what every example is checked against. Without it you are collecting vibes.",
"One page: inputs, allowed outputs, tone, refusal rules, JSON keys. Example: 'always one of 40 labels, never invent, one-sentence rationale'. Raters use that page. Examples that fail it never enter train. A spec written after collection is a retrofit and you will relabel.",
"4. **A Slack thread as the spec.**",
),
"where-examples-come-from": (
"Logs, expert demos, synthetic — each is biased. Name the bias.",
"Logs: real, messy, possibly wrong. Experts: clean, expensive, not the tail. Synthetic: fast, clone-prone, teacher-biased. Example: you take 70% cleaned logs, 20% expert edge cases, 10% filtered synthetic, and you measure n-gram overlap so the teacher does not clone itself.",
"4. **100% synthetic** because it was free.",
),
"match-the-chat-template": (
"Train with the template the base expects. A mismatch silently degrades train and serve.",
"Render every row with the official template; store the template hash on the dataset version. Example: you trained with a generic ChatML on a Llama-3 instruct base. Loss fell; serve rambled. Re-render + retrain fixed it. The GPU was not the bug.",
"4. **A notebook that concatenates 'User:'** by hand.",
),
"loss-on-responses-not-prompts": (
"Mask prompt tokens so gradients hit the assistant span. Otherwise you train the model to copy the user.",
"TRL/SFT: labels = -100 on prompt tokens. Spot-check a batch in a debugger. Example: forgetting the mask made the model echo the ticket text. Training loss looked healthy because copying is easy.",
"4. **Full-sequence loss** on a long retrieved context.",
),
"few-clean-beats-many-noisy": (
"A few hundred clean rows often beat thousands of near-duplicates for a narrow task.",
"Quality pass: drop clones, contradictions, truncated answers. Example: 8k scraped rows, 1.1k after clean, better val than the 8k. You report both sizes so nobody 'helps' by adding the junk back.",
"4. **Scraping more** as the only improvement plan.",
),
"cleaning-bad-examples": (
"Duplicates, contradictions, wrong labels, truncations, cloned synthetic phrasing — all out.",
"Automated filters plus a 50-row hand audit every version. Example: two gold labels for the same ticket; you pick from the spec and you log the conflict rate. Conflict rate > 5% means the spec is unclear, not that you need a bigger model.",
"4. **Cleaning once** and never again after a dump lands.",
),
"balancing-edge-cases": (
"If 95% of rows are the easy label, the model learns to always emit it.",
"Upsample rare-but-costly classes or down-sample the easy majority, and report slice n. Example: 'legal hold' is 1% of logs and 40% of the pain. You target 15% of train. Val stays natural so you do not lie to yourself.",
"4. **Balancing the test set** and celebrating a fake win.",
),
"leak-free-splits": (
"Near-duplicates across train and test are leakage. Hash normalised prompts.",
"Normalise (lower, collapse space, strip ids), hash, and refuse any test item whose hash or close cousin is in train. Example: a paraphrase of a test ticket in train inflated the score 6 points. After the scan, you knew the real number.",
"4. **A random 80/20 on raw rows** with repeated customers.",
),
"pii-licensed-content": (
"If you would not want the model to repeat it, it does not belong in train.",
"Scan for emails, account numbers, licensed paragraphs. Example: a help article copied verbatim became a regurgitation risk. You drop or rewrite. A customer name in a rationale is PII even if the label is fine.",
"4. **'We'll redact later'** after the job has run.",
),
"versioning-the-dataset": (
"Every trained artefact points at a dataset hash and a config hash. Otherwise you cannot retrain.",
"DVC or a hashed tarball in object storage: `tickets-sft-v7`. The run file stores that hash. Example: v8 silently added 200 bad rows; you rolled to v7 because the hash was in the decision record.",
"4. **'final_final.csv'** on a laptop.",
),
"gold-spec-before-collection": (
"Write acceptance rules, then reject logs that miss them. Collection without a spec is a junk pile.",
"Rules: required keys, max length, no PII, label in the enum. A linter drops rows at ingest. Example: 30% of logs failed the enum; you never paid to train on them.",
"4. **Collect first, invent rules later** and relabel for a month.",
),
"near-duplicate-leak-scan": (
"Hash normalised prompts so a paraphrase of a test item never lands in train.",
"After the split, run a near-dup pass (hash + embedding similarity). Anything over a threshold moves to train or is dropped from test — you choose, you record. Example: 40 test items were cousins of train; removing them dropped the headline 3 points. That was honesty.",
"4. **Only exact-string dedup.**",
),
"synthetic-diversity-checks": (
"Measure n-gram overlap across teacher rows and drop clones.",
"Self-BLEU / unique-trigram rate on the synthetic slice. Example: 2k teacher rows collapsed to ~300 templates. You keep one per template and you ask the teacher for new seeds, not more temperature on the same seed.",
"4. **Temperature 1.2 as a diversity strategy** with one prompt.",
),
"label-audit-sample": (
"Hand-review a fixed 50-row sample every dataset version and record the error rate.",
"Two reviewers, same 50, conflict log. If error rate > 2% (illustrative), stop training and fix the pipeline. Example: v9 audit was 8% wrong; you never launched that job. The sample is versioned next to the set.",
"4. **Auditing only the first version** and trusting automation after.",
),
},
"m13-3": {
"what-sft-changes": (
"SFT raises likelihood of the target tokens. It nudges; it does not install a wiki.",
"You start from an instruction model, you minimise loss on the assistant spans, you get a model that prefers your mapping. Example: after two epochs the router emits house labels; it does not 'know' next week's SKU. If you needed facts, you retrieved.",
"4. **Calling SFT 'teaching the model everything we know'.**",
),
"hyperparameters-that-matter": (
"LR, epochs, batch, seq length, grad accum — in that order of attention. Sweep LR first.",
"Start with a small LR grid, one epoch, watch val. Example: 2e-4 diverged; 2e-5 learned. You did not touch rank until LR was stable. Seq length must cover your real tickets or you silently truncate gold.",
"4. **Copying a blog's 3e-4** on a different base and precision.",
),
"full-vs-parameter-efficient": (
"Updating every weight is rarely needed for a narrow task and is expensive to store and serve.",
"PEFT (LoRA) for almost all product tunes. Full FT when you have a research reason and the GPUs. Example: a 8B full FT is a full 8B artefact per version; a rank-16 LoRA is megabytes. You can still lose to a bad dataset either way.",
"4. **Full FT to look serious.**",
),
"a-first-sft-run-with-trl": (
"A small TRL job whose train and val loss both fall is the hello-world — not a ship.",
"One file: dataset hash, template, LR, max steps. Confirm val loss tracks train. Read 20 outputs. Example: train fell, val rose at step 400 — you already have an early-stop point. A first run that only prints train loss is incomplete.",
"4. **Declaring victory on train loss alone.**",
),
"reading-the-loss-curves": (
"Underfit: both high. Overfit: train down, val up. Unstable: spikes — lower LR.",
"Screenshot both curves in the run page. Example: a spike every 50 steps was a bad batch of truncated rows, not 'the model'. You cleaned; the spikes left. You do not increase epochs on an overfit curve.",
"4. **Smoothing the val curve away** in a blog screenshot.",
),
"catastrophic-forgetting": (
"The model gains the skill and loses general ability. Probe it.",
"Keep a 50-item general set. Fail the run if it drops past a written threshold. Example: router +8, general −6, refusals worse. You mix 200 general/safety rows or you drop rank. Task-only joy is how you ship a specialist that cannot follow 'reply in JSON'.",
"4. **No general probe** because the task metric was pretty.",
),
"read-outputs-not-just-loss": (
"Lower loss is not a better answer. Read samples at each checkpoint.",
"Every N steps, dump 15 greedy outputs on a fixed pack (task, schema, refusal). Example: loss still falling while JSON grew a preamble. You picked the earlier checkpoint. Loss would have picked the last.",
"4. **Picking the last epoch by habit.**",
),
"choosing-a-checkpoint": (
"Keep the checkpoint that wins the **task metric** on val, not the lowest loss and not the last step.",
"Save every epoch (or every N steps). Score the skill. Example: epoch 1 is +5, epoch 2 is +5.2 with a refusal drop, epoch 3 overfits. You ship epoch 1 or 2 per the kill criteria, never epoch 3 because 'it finished'.",
"4. **Always taking step -1.**",
),
"learning-rate-sweep-first": (
"A three-point LR grid beats an architecture hunt. Do it first.",
"2e-5 / 5e-5 / 1e-4 (illustrative) at fixed rank and data. Pick the one with a stable val skill. Example: you wasted two days sweeping rank on a diverging LR. The cheap grid would have told you on morning one.",
"4. **Sweeping rank, alpha and epochs** on a broken LR.",
),
"early-stop-on-the-skill-not-the-loss": (
"Stop when the task metric plateaus even if loss still falls.",
"Patience on the skill (e.g. 2 evals with no gain). Example: loss kept dropping by memorising phrasing; skill was flat from step 300. You stopped. Serving the later step made tone weirder, not better.",
"4. **'One more epoch'** as a culture.",
),
"forgetting-probe-set": (
"A small general-ability set that can fail the run. Do not train on it.",
"50–100 items, frozen. Threshold in the ADR. Example: −3 points fails. You saw −4, you mixed data, you re-ran. Training on the probe would have hidden the drop.",
"4. **A probe you quietly added to train.**",
),
"reproducible-sft-config": (
"Pin seed, dataset hash, template, package versions in the run file. Otherwise it is a story.",
"One YAML: all of the above plus GPU type. Example: a 'same' rerun used a new TRL that changed packing; scores moved. The YAML diff explained it. A notebook with hidden cells would not.",
"4. **Repro by memory.**",
),
},
"m13-4": {
"lora-adapters": (
"Freeze the base, train low-rank BA on selected layers. That sentence is the interview.",
"W' = W + (α/r)BA. You pick r, α, targets (usually q,k,v,o first). Example: r=16 on attention of an 8B fits a single 24GB card with QLoRA. You can dump the adapter in megabytes and share the base.",
"4. **Calling any PEFT method 'LoRA'** including full FT.",
),
"qlora-on-a-quantized-base": (
"Load the frozen base in 4-bit, train LoRA in higher precision. Fits a much smaller GPU.",
"nf4 + LoRA is the usual story; check current bitsandbytes/PEFT docs. Example: 8B QLoRA on a 16GB card that cannot hold 16-bit full FT. You still merge on 16-bit later if you can, then re-quant for serve.",
"4. **Serving the 4-bit train view** without a serve eval.",
),
"rank-alpha-target-modules": (
"r is capacity; α scales the update; targets are which matrices get BA. Dropout and quant type also matter.",
"Start r=8 or 16 on attention; α ≈ 2r as a common default (verify in your trainer). Add MLP if the eval still misses. Example: r=64 did not beat r=16 on your set and overfit faster. The curve is the argument, not a blog's r=64.",
"4. **r=64 because a tweet said so.**",
),
"adapters-vs-full-fine-tuning": (
"Quality, memory, time, storage. For narrow tasks adapters usually win on the last three and tie quality.",
"Table it. Example: full FT +0.4 at 20× storage and no multi-tenant serve. You keep LoRA. A research paper might still want full FT; a product router does not.",
"4. **Full FT 'for quality'** with no compare.",
),
"peft-with-unsloth-or-axolotl": (
"A config file someone else can rerun is the artefact, not a hero notebook.",
"Axolotl/Unsloth/TRL YAML: data path, hash, template, LR, rank. Example: a new hire reruns v7 from the file and matches ±0.3. That is a platform. A Colab with 40 hidden cells is not.",
"4. **A GUI click** with no exported config.",
),
"estimating-gpu-memory": (
"Params, precision, seq, batch, plus LoRA overhead and KV. Estimate before you rent.",
"Back-of-envelope then a 10-step probe. Example: you almost rented an H100 for an 8B QLoRA that fits a 24GB box at seq 2k batch 4. The probe would have shown it. OOM at step 2 is a sizing fail, not a training fail.",
"4. **Renting the biggest card** as the estimate.",
),
"tracking-runs": (
"Dataset version, config, eval — in a tracker or a folder. Memory is not a tracker.",
"W&B/MLflow/a signed folder: three ids and the slice table. Example: v4 vs v6 is a page, not a Slack guess. You do not 'kind of remember v5 was better on tone'.",
"4. **Local folders named run2_real.**",
),
"diy-vs-managed-fine-tuning": (
"DIY: any open base, you own files, you own GPUs. Managed: catalog bases, maybe no export, no GPU pager.",
"Pick from export and ops. Example: no GPU team → managed, accept retrain-as-exit. Need the adapter on vLLM in a second cloud → DIY. Both still need the same eval.",
"4. **Managed because it felt official** without the export question.",
),
"rank-versus-quality-curve": (
"Sweep r on a held-out set; pick the smallest r that holds the gain. Interviewers want the curve, not a favourite rank from a tweet.",
"r ∈ {4,8,16,32}. Plot the task skill and the forgetting probe. Example: 8 and 16 tie on the task; 32 overfits and nicks refusals. You ship 8. A larger r is not a promotion, and you write the curve in the run page so the next person does not re-litigate it.",
"4. **Monotonic 'bigger is better'** on rank with no plot.",
),
"which-layers-to-adapt": (
"Start with attention projections; add MLP only if the eval still misses.",
"q_proj/k_proj/v_proj/o_proj first. Example: adding MLP +0.2 and +30% train time. You did not add it. If format still drifts, try MLP before you jump to full FT.",
"4. **Adapting every linear** on the first run.",
),
"merge-versus-keep-separate": (
"Merge for a single simple deploy; keep separate to swap. Keep the adapter either way.",
"Twenty tenants → separate on vLLM. One Ollama demo → merge then GGUF. Example: you merged and deleted the adapter; you cannot fork a second tone. Restore from backup if you still have it.",
"4. **Merging as cleanup.**",
),
"qlora-precision-traps": (
"A 4-bit train does not guarantee a 4-bit serve win. Re-eval after dequant/merge/requant.",
"Path: train QLoRA → merge on 16-bit → eval → then quantise for serve → eval again. Example: 4-bit serve dropped schema 4 points; 8-bit held. You ship 8-bit. Trusting the train loss for the serve artefact is the trap.",
"4. **One number for train and serve precision.**",
),
},
"m13-5": {
"demonstrations-vs-preferences": (
"Demos show one answer. Preferences say A is better than B. Different data, different jobs.",
"SFT needs a gold string. DPO needs a pair that differs on the quality you named. Example: you have gold JSON — SFT. You have two fluent answers and humans prefer the terse one — DPO. Using DPO pairs as SFT gold by taking only the winner is valid; the other way (SFT-only data as fake pairs) is how you teach length.",
"4. **Calling every CSV 'preference data'.**",
),
"building-preference-pairs": (
"Prompt, preferred, rejected — and they differ on the named quality, not on a random extra paragraph.",
"Write a construction rule. Example: preferred is the spec-correct terse reply; rejected is a verbose but still polite one. If they also differ in facts, you taught facts-via-preference, which is messy. Filter those out.",
"4. **Rejected = random model sample** with no rubric.",
),
"sources-rater-agreement": (
"Humans, judges, or prod thumbs — measure agreement. Near-chance labels are noise.",
"Cohen's κ or simple pairwise agree. Pause if κ ≈ 0. Example: two raters agree 52% on 'tone'. You stop labelling and you fix the rubric. Training on that pile teaches coin flips.",
"4. **One rater, 10k pairs, no audit.**",
),
"avoiding-length-bias": (
"If preferred is always longer, you taught length. Control it.",
"Match length buckets or penalise length in the pair filter. Example: raw prefs made the model ramble +40%. After length-matching, DPO improved tone without the ramble. A length histogram of preferred vs rejected belongs on the data card.",
"4. **Never looking at token-length histograms.**",
),
"dpo-intuition": (
"Raise likelihood of preferred relative to rejected, against a frozen reference. No RL loop required.",
"You do not need to derive the paper. Say: implicit reward from the pair, KL to the SFT reference via β. Example: β too small, the model drifts and rambles; β too large, nothing moves. You sweep β after SFT exists.",
"4. **Explaining DPO as 'RLHF with extra steps'** and stopping there.",
),
"dpo-after-sft": (
"Preference usually follows SFT. DPO on a raw base is a common way to get slop.",
"SFT first so the model can produce the format; DPO to pick among fluent options. Example: DPO-from-base invented keys; SFT-then-DPO kept schema and improved tone. You do not skip SFT to save an hour.",
"4. **DPO-only because the paper demo did.**",
),
"what-preference-tuning-is-for": (
"Qualities hard to write as one gold string: tone, helpfulness, refusal style, concision.",
"If you can write the exact JSON, SFT. If two JSONs are valid and one is kinder/shorter, DPO. Example: support tone after a correct SFT router. You did not DPO the labels.",
"4. **DPO for facts.**",
),
"when-sft-is-enough": (
"If the residual is 'emit this string', SFT. Ship DPO only when it beats SFT on the same held-out pairs.",
"A/B the SFT checkpoint vs SFT+DPO on the same prefs and the task set. Example: DPO +0.2 on tone, −1 on schema. You keep SFT. A ritual DPO stage is not a virtue.",
"4. **Always adding DPO** to look complete.",
),
"pair-construction-rules": (
"Preferred and rejected differ only on the quality you named. Write the rule; lint it.",
"A script checks length bucket, same facts, same schema validity, different tone score. Fail the row otherwise. Example: 18% of pairs failed the lint; those were the ones teaching length. You dropped them.",
"4. **Free-form 'worse' samples** from an unprompted model.",
),
"inter-rater-agreement": (
"Measure it; pause near chance. Agreement is a data SLI.",
"Weekly κ on a 50-pair overlap. Example: κ fell when a new rater joined; you retrained them on the rubric before adding their pairs. Shipping those pairs would have been cheaper than the GPU and more damaging.",
"4. **Paying piece-rate with no overlap set.**",
),
"beta-and-reference-model": (
"β scales how hard you push away from the frozen SFT reference. You need that reference.",
"Too-low β: drift, ramble, safety slip. Too-high: no movement. The reference is the SFT checkpoint, frozen. Example: you accidentally DPO'd against the raw base; the model forgot the schema. Pin the reference id in the run file.",
"4. **Updating the reference every step.**",
),
"preference-versus-sft-a-b": (
"Ship DPO only when it beats the SFT checkpoint on the same held-out pairs and does not trip kills.",
"Same set, same judge, plus the schema/safety packs. Example: DPO wins tone, ties schema, safety flat — ship. DPO wins a judge that loves length — do not ship; you taught the judge.",
"4. **A vibe A/B with no held-out pairs.**",
),
},
"m13-6": {
"reward-based-tuning": (
"Outputs are scored; training pushes toward higher scores. The grader is the product.",
"If you cannot write a grader you trust more than a preference pair, skip RFT. Example: unit tests on generated code are a grader. A fuzzy 'be nicer' is not — use DPO. RFT without a checker is how you invent reward hacking.",
"4. **RFT because it sounds more advanced than SFT.**",
),
"rft-vs-sft-vs-dpo": (
"SFT: examples. DPO: comparisons. RFT: a scalar from a grader. Different supervision.",
"Table it in one breath. Example: JSON keys → SFT; terse vs wordy → DPO; code must pass tests → RFT. Mixing the words in an interview is a fail.",
"4. **'We did RL'** on a DPO run.",
),
"tasks-with-gradable-outputs": (
"Code tests, math checkers, schema validators — machine-checkable. That is the fit.",
"List the checker. Example: a function must pass 12 tests; the reward is pass rate. A support reply has no such checker — do not force RFT. Rubric judges are a last resort and they can be hacked too.",
"4. **RFT on brand voice.**",
),
"reward-design-reward-hacking": (
"The model will optimise the grader, not your intent. Collect hacks.",
"Gallery: padding to hit length, repeating a keyword the judge likes, passing tests by deleting them if the harness is sloppy. Example: a code agent learned to `return True` on helper names. You added tests. The gallery is part of the suite.",
"4. **A single scalar** with no hack cases.",
),
"reaching-rft-in-practice": (
"Usually a managed service or a specialised framework, not from-scratch PPO in a weekend.",
"Be honest: you will use a vendor RFT product or a maintained RL library, with SFT first, a real grader, and a KL bound. Example: you do not implement PPO on a Sunday and call it Level 13 complete.",
"4. **A from-scratch trainer** you cannot rerun.",
),
"verifiable-reward-only": (
"Use RFT when a checker, test suite or schema can score the output without a human in the loop.",
"If a human must look, you have prefs or SFT, not a reliable RFT reward. Example: XML must validate — OK. 'Empathy' — not OK. A hybrid (schema check + small DPO) is often the grown-up mix.",
"4. **An LLM judge as the only reward** with no hack suite.",
),
"reward-hacking-gallery": (
"Collect pads, repeats, and grader games. Add them to the suite so a 'better' reward that hacks fails CI.",
"Ten known hacks as unit tests on the grader. Example: empty code + comments that mention the tests. If the grader scores that high, you fix the grader before any RL step.",
"4. **A gallery in a doc** that is not executed.",
),
"kl-or-length-penalty": (
"Bound how far the policy may drift from the SFT reference, and bound length if the reward likes words.",
"KL to SFT, plus a length penalty if needed. Example: without KL the model left the schema to chase tests with print-debug spam. With KL it stayed in distribution and still raised pass rate.",
"4. **Unbounded RL** for two extra points.",
),
"rubric-versus-unit-test-rewards": (
"Prefer machine-checkable scores. A rubric judge is last resort and needs its own hack suite.",
"Tests > schema > rubric. Example: you moved from a judge rubric to a real parser+tests and the 'gain' shrank — the judge had been flattered. That is a win for honesty.",
"4. **A 20-line rubric** you never adversarial-tested.",
),
"when-not-to-reach-for-rl": (
"Skip RFT if you cannot write a grader you trust more than a preference pair.",
"Decision: no checker → SFT/DPO. Checker exists but data is tiny → maybe still SFT. Checker exists, volume high, hacks collected → RFT is in play. Example: you said no to RFT on tone in a meeting and offered DPO instead. That is seniority.",
"4. **RL as a prestige layer.**",
),
},
"m13-7": {
"teacher-student": (
"A stronger teacher writes outputs that train a smaller student on one workload. Not 'transferring intelligence'.",
"Freeze a teacher prompt that already hits the eval; generate on real-like inputs; filter; SFT the student; compare both on a **human** set. Example: 70B teacher 93% at high $; 3B student 90% at 1/10. You route low-confidence student calls back to the teacher. You do not distil a failing teacher.",
"4. **Distilling as step one** before the teacher works.",
),
"generating-filtering-teacher-outputs": (
"Generate on traffic-like prompts; drop rows that fail your evals before they become truth.",
"Filter: schema, spec, disagreement with a human sample. Example: 20k generated, 14k after filter. The 6k would have taught mistakes cheaper. You never train on unfiltered teacher dumps.",
"4. **Trusting the teacher** because it is bigger.",
),
"capability-for-cost-latency": (
"Trade a little quality for $ and ms, and for a model you can host.",
"Report both models on the same set: score, p95, $/1k. Example: −3 points, −8× cost, −4× latency, in-VPC. The gate allows −3. You ship the student. A −3 that also misses the safety pack you do not.",
"4. **Quality-only distillation slides.**",
),
"copied-mistakes-low-diversity": (
"The student copies teacher errors and cloned phrasing. Filter and diversify.",
"Diversity checks + human sample. Example: the teacher always said 'Happy to help!' and the student could not stop. You filtered that n-gram and you added expert rows. A student that only speaks Teacher is brittle on real logs.",
"4. **No human set** — only teacher-vs-student on teacher labels.",
),
"teacher-terms-of-use": (
"Some APIs forbid using outputs to train a competing or replacement model. Read them.",
"Legal reads the ToS before you generate. Example: a frontier API bans training a public competing model; an internal student behind your login may still be allowed — or not. You do not find out at launch. Open-weight teachers have licences too.",
"4. **Generating 20k rows first.**",
),
"on-policy-student-inputs": (
"Distil on real traffic prompts, not only the teacher's favourite demos.",
"Sample production (or a safe replay), generate teacher answers, filter, train. Example: demo-only distillation looked great and failed on short mobile prompts. On-policy inputs fixed the slice. Demos can seed; they cannot be the whole set.",
"4. **A blog's 200 prompts** as the corpus.",
),
"filter-then-train": (
"Drop teacher rows that fail your evals before they become the student's gold.",
"The filter is the same spec as production. Example: invalid JSON from the teacher never enters train. A 'filter later' plan is how the student learns invalid JSON fluently.",
"4. **Filtering 5% as a token gesture.**",
),
"student-versus-teacher-gap": (
"Report quality, latency and cost of both on the same human set.",
"A table, not a vibe. Example: teacher 93 / 1.8s / $12; student 90 / 0.3s / $0.9. Gap accepted, route the 10% low-confidence back. If you only report student vs an old baseline, you hid the distillation tax.",
"4. **Hiding the teacher score.**",
),
"licence-of-teacher-outputs": (
"Confirm the teacher API or weight licence allows training a replacement.",
"A sentence in the ADR: licence, date, who signed. Example: you switched to an open teacher whose licence allows it after the API ToS did not. The data you already generated under the API may still be tainted — legal decides, you do not assume.",
"4. **Mixing tainted and clean rows.**",
),
"distill-versus-buy-a-smaller-api": (
"Compare a distilled self-hosted student with the teacher's own cheap small SKU.",
"Sometimes the vendor already sells the small model. Example: their 8B API is 89% at $1.2/1k; your student is 90% at $0.8 plus GPU ops. You pick with ops included. Distillation is not free money if a SKU already exists.",
"4. **Distilling by default** without pricing the small SKU.",
),
},
}


def extras_for(node: str, key: str) -> tuple[str, str, str]:
    row = E.get(node, {}).get(key)
    if not row:
        return "", "", ""
    return row
