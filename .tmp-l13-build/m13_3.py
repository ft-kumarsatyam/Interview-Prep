from helper import note

TRL = {"title": "Hugging Face TRL: SFT trainer", "url": "https://huggingface.co/docs/trl/en/sft_trainer"}
HF_TRAIN = {"title": "Hugging Face: training", "url": "https://huggingface.co/docs/transformers/en/training"}

NODES = {
    "what-sft-changes": note(
        what="""**Supervised fine-tuning (SFT)** continues training a pretrained or already instruction-tuned model so that next-token prediction on your **target responses** becomes more likely. It does not add a new head for your task. It **nudges** existing weights (or a LoRA sitting on them) toward the demonstrations.

What moves: the mapping from a class of prompts to a class of replies — tone, format, a closed label set, a house template. What barely moves: large new factual stores, general reasoning the base never had, and safety you did not include in the mix.

SFT is imitation. If the gold is wrong, the model becomes fluently wrong. If the gold is a distribution of styles, the model averages them. The ceiling is the data plus the base, not the learning-rate schedule.""",
        why="""On the job you need a mental model that stops magical thinking. Teams expect SFT to "teach the wiki" or "make it smarter". It taught the reply shape. Retrieval still owns the wiki.

Interviews: "what does SFT actually optimise?" — token-level loss on the assistant span. Then: it is capped by demonstration quality, and it can forget behaviours you did not replay.""",
        how="""Mechanically: render the chat, mask the prompt, minimise cross-entropy on assistant tokens. After a few hundred to a few thousand steps the model is more likely to emit your JSON and less likely to emit the generic assistant preamble.

Example. Base instruct model, forty labels. Before SFT it invents label 41 and writes a paragraph. After SFT on 800 clean rows it emits `{"label":"billing","reason":"..."}` and stops. It did not learn new billing law; it learned the mapping and the shape.

A second picture: you SFT on only polite refunds. The model becomes unwilling to refuse a fraudulent refund request. That is not "more helpful"; it is imitation of a one-sided mix. You change the mix, not the optimiser.""",
        fails="""1. **Expecting knowledge install.** You evaluate with teacher labels and think you got smarter.

2. **Imitating a mess.** Loss falls; the product is a fluent mess.

3. **Forgetting the rest of the assistant.** Narrow SFT without replay of refusals and general asks.""",
        line="SFT is next-token imitation of your assistant spans. It reliably changes format and tone and is capped by the demonstrations; it is a weak way to add facts or new reasoning.",
        kps=[
            "SFT minimises loss on target assistant tokens.",
            "It nudges behaviour; it does not bolt on a new task head.",
            "Ceiling = data quality + base capability.",
            "Good at tone, format, closed mappings; weak at facts.",
            "A one-sided mix is imitated, including missing refusals.",
            "If gold is wrong, the model becomes fluently wrong.",
        ],
        qs=[
            {"q": "What quantity does SFT actually minimise?", "a": "Cross-entropy on the tokens of the target assistant responses (ideally with prompts masked). There is no separate classification head unless you added one.", "kind": "recall"},
            {"q": "After SFT the model formats JSON perfectly but still invents policy. What did SFT change?", "a": "The reply shape and maybe tone. Policy facts were never a good SFT target. Put policy in retrieval and stop expecting the loss to install it.", "kind": "apply"},
            {"q": "Loss is excellent and the model is fluently off-brand. Cause?", "a": "The gold is off-brand. SFT imitated it. Fix the spec and the rows; do not lower the learning rate to 'add creativity'.", "kind": "debug"},
            {"q": "Why is SFT a poor way to add reasoning the base lacks?", "a": "A short imitation stage does not create new circuits for proofs or long-horizon planning. You need a stronger base, more pretraining, or a different method — not 800 rows of hoped-for brilliance.", "kind": "recall"},
            {"q": "How can SFT reduce safety?", "a": "If the mix has no refusals, likelihood of the old refusal style falls. The model imitates the helpful-only gold. Replay safety and probe it.", "kind": "apply"},
        ],
        links=[TRL, HF_TRAIN],
    ),
    "hyperparameters-that-matter": note(
        what="""The first knobs that actually move an SFT run are **learning rate**, **epochs** (or steps), **batch size** (and **gradient accumulation**), and **sequence length**. Rank and optimiser bells matter later. Most failed first runs are "LR too high, loss exploded" or "LR too low / too few steps, nothing moved" or "sequence length chopped the answer".

Learning rate is the one to sweep first. Epochs on a small clean set should be small; repeating 400 rows for 10 epochs is how you memorise. Batch size changes noise and memory; accumulation fakes a larger batch when VRAM is tight. Sequence length must fit the **rendered** prompt plus answer; otherwise you train on truncated gold.""",
        why="""On the job, people copy a blog's 2e-4 and 3 epochs for a different model size and data scale. The run looks busy and the eval is flat.

Interviews: list these five, say you sweep LR before architecture, and mention that tokens-per-batch = microbatch × accumulation × sequence.""",
        how="""A first grid for a 7–8B LoRA on a few hundred to a few thousand rows (illustrative, not a law): LR in {5e-5, 1e-4, 2e-4}, 1–2 epochs, microbatch 1–4, accumulate to an effective 16–32, sequence length from a percentile of your rendered lengths (e.g. 99th) not from a meme 4096 if your rows are 600 tokens.

Example. Run A: LR 5e-4, loss spikes, garbage. Run B: LR 5e-5, 1 epoch, val skill +6 points. Run C: same LR, 5 epochs, train loss tiny, val skill −2 (overfit). You keep B. You did not touch rank yet.

Log tokens/second and effective batch. If accumulation is 32 and you think you have batch 32 but only 40 steps/epoch, you are barely updating — count **optimizer steps**, not dataloader rows.""",
        fails="""1. **Sweeping rank before LR.** You attribute an LR miss to LoRA.

2. **Epochs as a badge.** More passes on 300 rows is memorisation.

3. **Sequence length below the gold.** You train the model to stop mid-JSON.""",
        line="I sweep learning rate first, keep epochs low on a small clean set, set sequence length from real rendered lengths, and I count optimiser steps — not folklore from a different model.",
        kps=[
            "First knobs: LR, epochs/steps, batch, accumulation, sequence length.",
            "Sweep LR before rank or architecture.",
            "Few clean epochs; many epochs on a tiny set overfit.",
            "Sequence length must fit rendered prompt plus gold.",
            "Effective batch = microbatch × accumulation.",
            "Count optimiser steps, not just dataset passes.",
        ],
        qs=[
            {"q": "Which hyperparameter should you grid first on a new SFT job?", "a": "Learning rate. It decides whether the run explodes, crawls, or learns. Rank, epochs, and fancy optimisers are later, once an LR shows a real skill bump.", "kind": "recall"},
            {"q": "400 rows, 10 epochs, train loss near zero, val skill down. What do you change?", "a": "Cut epochs (or steps) and maybe LR. You memorised the 400. Early-stop on the skill metric and add data only if underfit remains.", "kind": "debug"},
            {"q": "Answers in train are 800 tokens but max length is 512. Symptom?", "a": "Truncated gold, often mid-structure. The model learns to stop early. Raise length, pack smarter, or shorten the gold — do not ignore it.", "kind": "apply"},
            {"q": "Why does gradient accumulation exist?", "a": "To reach a larger effective batch when VRAM only fits a microbatch of 1–2. The optimiser sees the accumulated gradient as one larger step.", "kind": "recall"},
            {"q": "Your epoch is 40 optimiser steps. Is that enough to judge two epochs?", "a": "Maybe not; you have very few updates. Either the data is tiny (then one epoch plus a small LR sweep is enough) or accumulation is so high you are under-stepping. Report steps, not only epochs.", "kind": "apply"},
        ],
        links=[TRL, HF_TRAIN],
    ),
    "full-vs-parameter-efficient": note(
        what="""**Full fine-tuning** updates every weight. **Parameter-efficient** methods (LoRA, QLoRA, and cousins) freeze the base and train a small add-on. For a **narrow** task, full updates are rarely necessary: they cost more memory, more storage, more time, and they are easier to overfit and easier to forget with.

Full FT still exists: research, or a broad domain shift where adapters underfit even at high rank. That is not the default for an 8B house-label router.""",
        why="""On the job, full FT of a 70B is a cluster conversation. LoRA is a single-GPU conversation. Choosing full FT because it "sounds more real" is how teams blow the budget and then cannot host the result.

Interviews: trade quality, memory, time, and storage. Say when you would still full-tune (you probably would not).""",
        how="""Compare on the same data and eval.

- Memory: full FT keeps optimiser states on all params; LoRA keeps them on the adapter. QLoRA also quantises the frozen base.
- Storage: full copy of the model versus tens of megabytes of adapter.
- Serving: full FT is one blob; LoRA can stay swappable on a shared base.
- Quality: for style/format, LoRA usually matches full FT closely enough that the extra cost loses.

Example. 8B labeler, 2k rows. Full FT needs a much larger GPU (or heavy offload) and writes 16GB of weights. LoRA rank 16 on attention fits a 24GB card and writes 50MB. Held-out accuracy differs by 0.4 points. You ship the adapter.

If LoRA rank 64 plus MLP still underfits a broad rewrite task, *then* you discuss full FT or a bigger base — after you have proved the adapter ran out.""",
        fails="""1. **Full FT on a 400-row set.** You will memorise and forget.

2. **Assuming LoRA cannot work** because a paper used full FT on a different problem.

3. **No serve plan for a full copy.** You trained something you cannot host.""",
        line="For a narrow task I default to LoRA or QLoRA: enough quality, far less memory and storage, swappable. I only consider full fine-tuning after adapters underfit a task that actually needs it.",
        kps=[
            "Full FT updates all weights; PEFT trains a small add-on.",
            "Narrow tasks rarely need full FT.",
            "PEFT wins on memory, disk, time, and multi-tenant serving.",
            "Compare quality on the same eval before paying for full FT.",
            "Tiny data plus full FT is a memorisation machine.",
            "If you cannot host a full copy, do not train one.",
        ],
        qs=[
            {"q": "Why is full fine-tuning rarely necessary for a narrow house task?", "a": "The behaviour lives in a low-dimensional change. Adapters can represent that change. Full FT spends memory and storage and overfits small sets without a matching quality win.", "kind": "recall"},
            {"q": "When would you still consider full FT?", "a": "After high-rank LoRA (attention + MLP) underfits a broad domain shift, and you can afford to train and host the full copy. Not as the first experiment on 800 rows.", "kind": "apply"},
            {"q": "You full-tuned an 8B on 400 rows. Train loss is zero, general chat is broken. Diagnosis?", "a": "Overfit full FT plus catastrophic forgetting. Switch to LoRA, cut epochs, add a forgetting probe, and accept that 400 rows do not justify touching every weight.", "kind": "debug"},
            {"q": "Name three costs full FT pays that LoRA usually does not.", "a": "Optimiser memory on all parameters, storing a second full checkpoint, and losing cheap multi-adapter serving on one base.", "kind": "recall"},
            {"q": "A stakeholder says PEFT is 'not real training'. How do you answer?", "a": "Show the same-set eval of LoRA versus a full run if you have it, plus the memory and serve numbers. Real is what ships and can be retrained, not what updates more tensors.", "kind": "apply"},
        ],
        links=[HF_TRAIN],
    ),
    "a-first-sft-run-with-trl": note(
        what="""A first SFT job should be **small, scripted, and boring**. Use a library such as **TRL**'s `SFTTrainer` (or equivalent) with a config file: model id, dataset hash, template, LR, batch, max length, seed. Confirm that **train and validation loss both move down** and that a **skill metric** on a few samples improves. If only train loss falls, you are not done celebrating.

The point of the first run is not a leaderboard. It is to prove the pipes: data renders, mask is correct, the job is reproducible, and you can read logs.""",
        why="""On the job, notebook-only first runs cannot be replayed by the next person. TRL (or Axolotl, Unsloth, a vendor API) is the difference between a souvenir and a recipe.

Interviews: you should be able to name a stack and what you look at on run one (loss on both splits, a couple of generations, no OOM).""",
        how="""Minimal path:

1. One YAML/CLI: base, dataset, template, LR, epochs, seed, output dir.
2. Overfit a **four-row** sanity set until the model reproduces them. If it cannot, the template or mask is wrong — fix before the real set.
3. Real run: train + val loss, sample generations each N steps, save checkpoints.
4. Commit the config. Do not leave the LR in a chat.

Example. Four-row overfit fails: the model never emits the JSON key. You find the collator was not completion-only and max length cut the gold. Fix, overfit succeeds, then run the 800-row job. Val loss follows train for an epoch and you keep that checkpoint.

TRL specifics change; the discipline does not: config in git, hash of data, one command.""",
        fails="""1. **Skipping the four-row overfit.** You debug a 2-hour job that could have failed in three minutes.

2. **Watching only train loss.** You miss under/overfit.

3. **Unpinned packages.** Next week the same config is a different trainer.""",
        line="My first SFT run is a config-file TRL (or similar) job: four-row overfit to prove the pipes, then a real run where train and val loss both fall and I can replay the command.",
        kps=[
            "First run proves pipes, not a leaderboard.",
            "Use a config file: base, data hash, template, LR, seed.",
            "Four-row overfit before the long job.",
            "Train and val loss should both move; sample outputs too.",
            "Pin package versions with the config.",
            "If you cannot rerun the command, it was a notebook souvenir.",
        ],
        qs=[
            {"q": "What should a first TRL SFT run prove?", "a": "That data renders with the right template and loss mask, the job is reproducible from a config, train and val loss move, and generations look like the task. Not that you beat a paper.", "kind": "recall"},
            {"q": "The four-row overfit cannot reproduce the JSON. Where do you look?", "a": "Chat template, completion-only mask, and max sequence length truncating gold. Do not start a hyperparameter sweep on the full set yet.", "kind": "debug"},
            {"q": "Why pin TRL/transformers versions in the run file?", "a": "Trainer defaults and template code move. An unpinned rerun is a different experiment with the same YAML name.", "kind": "apply"},
            {"q": "Train loss falls, val loss never does, on run one. Meaning?", "a": "Leak, too few unique val rows, or you are already overfitting / the val set is a different task. Fix data and split before you sweep rank.", "kind": "apply"},
            {"q": "Why is a CLI/YAML better than a notebook for the first real run?", "a": "Someone else can replay it, CI can run it, and the config can be stored next to the checkpoint. A notebook hides cells you forgot to run.", "kind": "recall"},
        ],
        links=[TRL],
    ),
    "reading-the-loss-curves": note(
        what="""Loss curves are a **health check**, not a ship metric. **Underfit**: train and val stay high, skill does not move — raise steps or LR (carefully), or the task is too hard for the base. **Overfit**: train keeps falling, val rises or skill falls — stop earlier, lower LR/epochs, more unique data. **Unstable**: loss spikes or NaNs — lower LR, check for bad rows (huge tokens, broken mask), try grad clipping.

A smooth falling train loss can still be a bad product. Always pair curves with the skill metric.""",
        why="""On the job, people screenshot a pretty train curve and ship. Val has been rising for an hour.

Interviews: sketch the three shapes and the first action for each. Mention that generation quality can diverge from loss.""",
        how="""Look at train loss, val loss, and **one task number** on the same plot cadence.

Example. Steps 0–200: both losses fall, format-valid 70→91%. Steps 200–400: train 0.4→0.15, val 0.35→0.55, format-valid 91→88%. You take the step-200 checkpoint. That is overfitting; more steps would have looked "better" on train.

Unstable example: a spike every time a 8k-token row hits a 2k max length and the mask goes empty. You filter those rows; the spikes vanish. The curve was telling you about data, not about LoRA.

Log in a comparable unit (loss per token). Changing packing mid-run makes curves incomparable.""",
        fails="""1. **Smoothing away spikes.** You miss the bad batch.

2. **Different val every run.** Curves cannot be compared.

3. **Trusting loss after a template change.** You may have started measuring a different token set.""",
        line="I read train versus val loss for underfit, overfit, and instability, and I still pick checkpoints from the task metric. A pretty train curve is not a ship decision.",
        kps=[
            "Underfit: both losses high, skill stuck.",
            "Overfit: train down, val up or skill down — stop earlier.",
            "Unstable: spikes/NaNs — lower LR, inspect bad rows.",
            "Pair curves with a task metric every time.",
            "Use a fixed val set so runs compare.",
            "Loss after a template change is a new measurement.",
        ],
        qs=[
            {"q": "How do you recognise overfitting on SFT curves?", "a": "Train loss keeps falling while validation loss rises or the task metric worsens. Take an earlier checkpoint and reduce LR or epochs.", "kind": "recall"},
            {"q": "Both losses are high and flat after an epoch. First knobs?", "a": "Confirm the mask and template, then try a higher LR in a small grid or more steps. If still flat, the base or the data may be wrong for the task — do not just add rank blindly.", "kind": "apply"},
            {"q": "Loss spikes on the same step numbers each epoch. Suspicion?", "a": "A bad row or a length/mask edge at those indices. Inspect that batch; do not only lower LR.", "kind": "debug"},
            {"q": "Why is val loss not enough to pick a checkpoint?", "a": "It can fall while the product skill (exact label, schema, refusal) does not, or while generations get worse. Use the skill metric.", "kind": "recall"},
            {"q": "You changed packing and the loss halved instantly. Did you win?", "a": "Probably not; you changed how loss is averaged or which tokens are seen. Recheck the skill metric on the same eval.", "kind": "apply"},
        ],
        links=[HF_TRAIN],
    ),
    "catastrophic-forgetting": note(
        what="""**Catastrophic forgetting** is when a narrow tune **gains the skill and loses abilities the base already had**: general instruction following, languages you did not train, tool-calling format, and especially **safety refusals**. The loss never mentions those abilities, so they can fade.

It is not rare. A support-tone LoRA that never saw a disallowed request will answer it more often. A JSON-only tune will become rude when asked a normal question.""",
        why="""On the job this is how you ship a "better router" that fails a compliance probe. The task metric looked great because you did not measure the rest.

Interviews: name forgetting, give a safety example, and say you keep a **probe set** with a fail threshold.""",
        how="""Keep a small **forgetting probe**: 50–200 prompts the tune should still handle — general asks, a few languages if you serve them, tool-call format, and the safety suite. Run it on base, prompted baseline, and every checkpoint. Fail the run if a probe slice drops more than a written delta (for example 5 points or any new critical jailbreak).

Mitigations: mix a little replay data (refusals, general chat), lower LR / fewer epochs, prefer LoRA over full FT, stop when the **task** metric plateaus.

Example. Task accuracy 86→93%. Refusal probe 96→71%. You do not ship. You add 80 refusal demonstrations, drop a half epoch, and land 92% task / 94% refusal. The first checkpoint was a trap.""",
        fails="""1. **No probe.** You learn about forgetting from a customer.

2. **Probe is only English chit-chat.** You miss the safety slice.

3. **Replaying so much general data** that the narrow skill never appears.""",
        line="I treat forgetting as expected: a small general and safety probe runs on every checkpoint, and a written drop fails the run even if the task metric is up.",
        kps=[
            "Narrow SFT can erase general skill and refusals.",
            "The train loss will not warn you; those tokens are absent.",
            "Keep a probe set and a fail threshold.",
            "Replay a little safety/general data; prefer LoRA and early stop.",
            "A task win plus a probe crash is a failed run.",
            "Full FT forgets faster than a small adapter on the same data.",
        ],
        qs=[
            {"q": "What is catastrophic forgetting in SFT?", "a": "The model gains the narrow trained skill and loses prior abilities such as general following, formats you did not replay, or safety refusals, because those behaviours were not in the loss.", "kind": "recall"},
            {"q": "Task +7, refusal probe −20. Ship?", "a": "No. Fail the run. Mix refusal replay, reduce LR/epochs, and require the probe to hold within the written delta.", "kind": "apply"},
            {"q": "Why does a support-only mix increase unsafe answers?", "a": "Every gradient step makes 'always answer helpfully in this tone' more likely and never rehearses 'refuse'. Likelihood of the old refusal style decays.", "kind": "debug"},
            {"q": "What belongs on a forgetting probe set?", "a": "General instructions, any languages you serve, tool or schema formats the product still needs, and the safety/refusal suite. Small but fixed across runs.", "kind": "recall"},
            {"q": "Name two knobs that reduce forgetting besides adding replay data.", "a": "Lower learning rate or fewer epochs/early stop on the task metric, and using LoRA instead of full fine-tuning so fewer base weights move.", "kind": "apply"},
        ],
        links=[HF_TRAIN],
    ),
    "read-outputs-not-just-loss": note(
        what="""A lower loss does **not** guarantee better answers. You must **read sample outputs** from each checkpoint on a fixed prompt sheet: happy path, tail, empty input, injection, and a couple of production traces. Loss is an average of token surprises. Users experience sentences.

Reading is scheduled, not "if I have time". Five prompts every checkpoint is enough to catch ramble, dropped fields, newly rude tone, or a model that learned to say "here is the JSON" and then not emit it.""",
        why="""On the job, the eval script can be green because it regexes a key that is now wrapped in markdown. A human eye sees it in ten seconds.

Interviews: "loss went down, would you ship?" — no, show generations and the task metric.""",
        how="""Keep `prompts/sheet.jsonl` in the repo. The trainer samples it each checkpoint and writes a markdown diff. You read the diff before you look at W&B.

Example. Loss 1.1→0.4. Sheet shows: empty ticket now returns a novel; a billing ticket doubles the JSON; a refusal prompt is answered. The "best loss" checkpoint is unusable. An earlier checkpoint with loss 0.6 is the product.

Automate what you can (schema valid, refusal regex) but do not delete the read. Automation misses the new failure class until you add it — reading is how you discover the class.""",
        fails="""1. **Only train-set samples.** Of course they look good.

2. **Different prompts each time.** You cannot compare checkpoints.

3. **Reading only the winner after the fact.** You already discarded the better earlier step.""",
        line="I read a fixed prompt sheet at every checkpoint. Loss is a health signal; the sheet is the product. I will not ship a loss winner I have not watched answer.",
        kps=[
            "Loss is token surprise, not user-visible quality.",
            "Sample a fixed sheet every checkpoint.",
            "Include tail, empty, injection, and refusal prompts.",
            "Do not sample only the training set.",
            "Reading discovers new failure classes for the eval.",
            "The best-loss step is often not the best sheet.",
        ],
        qs=[
            {"q": "Why can loss fall while answers get worse?", "a": "Loss averages token likelihood. The model can assign mass to fluent but wrong structures, ramble after a likely preamble, or drop a rare slice that barely affects the mean.", "kind": "recall"},
            {"q": "What belongs on the checkpoint prompt sheet?", "a": "A fixed mix of happy path, hard tail, empty/missing info, prompt-injection, and refusal/safety. Same sheet every run so you can diff.", "kind": "apply"},
            {"q": "Automation says schema-valid 100% but a reader sees JSON inside a paragraph. Next step?", "a": "Tighten the metric to require a parse of the whole reply, and treat the read as a new test. Do not ignore the read because the old regex passed.", "kind": "debug"},
            {"q": "Why is sampling train rows a weak read?", "a": "Those answers were in the loss. You want prompts the model should generalise to, including ones you refuse to train on.", "kind": "recall"},
            {"q": "When do you read — after the run or during?", "a": "During, at each checkpoint, so you can keep an earlier step. After-the-fact reading cannot recover a discarded checkpoint.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "choosing-a-checkpoint": note(
        what="""The checkpoint you keep is the one that **wins on validation behaviour**, not the last step and not the lowest train loss. You evaluate saved steps on the **task metrics** and the **forgetting probes**, pick on validation, and **confirm once** on the frozen test.

Last-step bias is strong because jobs end and people take the final folder. That folder is often the most overfit.""",
        why="""On the job, this is the cheapest quality win in the file. Teams already saved the better step and then served `checkpoint-final`.

Interviews: "always take the last epoch" is a fail. "Val skill plus probes, confirm on test once" is a pass.""",
        how="""Save every N steps. For each save: val task metrics, probe metrics, maybe the prompt-sheet score. Rank by a **pre-written** rule: e.g. maximise val label-F1 subject to format-valid ≥ 99% and refusal drop ≤ 3 points. Ties go to the earlier step.

Example. Steps 100/200/300: F1 0.88/0.91/0.90, refusal 0.95/0.94/0.82. The rule picks 200. Step 300 is "newer" and worse. Test is run **once** on 200: F1 0.90. You ship 200.

Do not peek at test to break a val tie. Change the val rule if you must, and accept that you spent a bit of statistical honesty.""",
        fails="""1. **Final folder default.** Overfit served.

2. **Picking on test.** You spent the holdout.

3. **No pre-written rule.** You pick the chart you like after seeing numbers.""",
        line="I choose the checkpoint from validation task metrics and probes with a rule I wrote before the run, I prefer the earlier tie, and I touch the held-out test once to confirm.",
        kps=[
            "Do not default to the last step or lowest train loss.",
            "Score every save on val skill and forgetting probes.",
            "Write the selection rule before you see the numbers.",
            "Prefer the earlier checkpoint on a tie.",
            "Confirm the winner once on frozen test.",
            "Serving checkpoint-final is a process bug.",
        ],
        qs=[
            {"q": "Why is the last step a bad default checkpoint?", "a": "It is often the most overfit: train loss is lowest and val skill or probes have already turned. Earlier saves are usually the product.", "kind": "recall"},
            {"q": "Val F1 peaks at step 200; step 300 has lower train loss and a worse refusal probe. Which do you keep?", "a": "Step 200 if it meets the pre-written constraints. Train loss is not the objective. Confirm 200 on the frozen test once.", "kind": "apply"},
            {"q": "You used the test set to choose between three val-tied checkpoints. What did you spend?", "a": "The holdout. The test number is now optimistic. Next time break ties with a val rule or an earlier step.", "kind": "debug"},
            {"q": "What belongs in a pre-written selection rule?", "a": "The primary task metric, hard constraints (schema, refusal delta), and a tie-break (earlier step). Written before the curves exist.", "kind": "recall"},
            {"q": "How often should you save if the job is two epochs?", "a": "Often enough to have mid-epoch choices — every N steps, not only epoch ends — because the peak can sit between epochs.", "kind": "apply"},
        ],
        links=[HF_TRAIN],
    ),
    "learning-rate-sweep-first": note(
        what="""A **learning-rate sweep** is the first experiment, before you change epochs, rank, or architecture. Three or five LRs on a short run will tell you the basin: too high (spikes, garbage), too low (flat skill), just enough (skill moves, val holds).

Changing three knobs at once is how you learn nothing. LR is the knob that most often turns a "LoRA does not work" story into a working one.""",
        why="""On the job, rank debates burn days while the LR is an order of magnitude off. A 2-hour sweep would have ended the debate.

Interviews: "I sweep LR first" is a compact seniority signal.""",
        how="""Protocol: fix data, template, rank, epochs=1 (or a fixed step budget), seed. Grid LR (log-spaced). Compare val skill and curve health. Pick the LR, **then** touch the next knob.

Example. Rank-16 LoRA looks "dead" at 1e-6 (skill +0.2) and "broken" at 1e-3 (NaNs). At 1e-4 skill +7. You keep 1e-4. Only then do you try rank 8 vs 32. Rank 8 at 1e-4 matches rank 16; you take 8. If you had raised rank at 1e-6 you would have concluded you need full FT.

Log the sweep as a table in the runbook so the next rebase starts from a known basin, not from a blog.""",
        fails="""1. **One LR from a tweet.** Different model size, different effective batch.

2. **Sweeping LR and rank together.** Uninterpretable.

3. **Choosing the LR with best train loss.** That is the memoriser.""",
        line="I grid a few learning rates on a short fixed setup before I touch epochs or rank. Most 'adapters do not work' stories are an LR miss.",
        kps=[
            "Sweep LR before epochs, rank, or architecture.",
            "Hold other knobs fixed; use a short step budget.",
            "Log-spaced grid: find explode vs dead vs useful.",
            "Pick on val skill, not train loss.",
            "Write the winning LR down for the next rebase.",
            "Do not copy an LR from a different batch size or model.",
        ],
        qs=[
            {"q": "Why sweep learning rate before rank?", "a": "A bad LR makes every rank look dead or unstable. You will mis-blame capacity. Find an LR that moves val skill, then change rank.", "kind": "recall"},
            {"q": "Skill is flat at 1e-6 and NaN at 1e-3. What do you try?", "a": "Points in between (3e-5, 1e-4, 3e-4) on the same short budget. That is the point of a log grid.", "kind": "apply"},
            {"q": "Two knobs changed and the run improved. What can you not say?", "a": "Which knob did it. Revert to a one-knob sweep or you will carry a superstition into the next model.", "kind": "debug"},
            {"q": "Should the LR winner be the lowest train loss?", "a": "No. Lowest train loss is often the highest LR that still runs, and it overfits. Use val skill and curve health.", "kind": "recall"},
            {"q": "You changed batch size after the LR sweep. What now?", "a": "Revisit LR. Effective batch changes the noise and often the right LR. A short re-sweep is cheaper than a wrong production run.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "early-stop-on-the-skill-not-the-loss": note(
        what="""**Early-stop on the skill**, not on the loss. Token loss can keep falling after the label-F1, schema rate, or win-rate you care about has peaked. If you wait for loss to flatten you often sit in the overfit region.

The stop signal is the validation **task metric** (with probe constraints). Patience is measured in evals without improvement, not in "loss still going down, so we continue".""",
        why="""On the job, extra epochs are cheap GPU and expensive quality. The last 30% of the job is where forgetting and format drift show up.

Interviews: this pairs with checkpoint choice. Same idea: the objective is the product metric.""",
        how="""Define `skill = val_F1` (or exact-match, or rubric). Stop when skill has not improved by ε for P evaluations, **or** when a probe breaches, even if loss is still falling.

Example. Val F1: 0.84, 0.89, 0.91, 0.91, 0.90. Loss: still declining at the last two points. You stop after the second 0.91 (or keep that checkpoint). Continuing to chase 0.12 train loss buys a 0.82 refusal probe.

If the skill is noisy, average two eval seeds or require a repeat before stopping — do not switch back to loss because it looks smoother. Smooth is not the goal.""",
        fails="""1. **Patience on loss.** You stop when the model is most overfit, or never stop.

2. **Skill computed on train.** You will never stop.

3. **No ε.** You chase 0.0001 F1 forever.""",
        line="I stop when the validation skill plateaus or a probe fails, even if loss is still falling. Extra loss after the skill peak is usually overfitting.",
        kps=[
            "The stop signal is val skill, not train or val loss.",
            "Loss often falls after the product metric has peaked.",
            "Patience = evals without a real skill gain.",
            "A probe breach can stop the run even if skill is up.",
            "Do not early-stop on training-set skill.",
            "Write ε and patience before the job starts.",
        ],
        qs=[
            {"q": "Why not early-stop when validation loss flattens?", "a": "Val loss can keep falling (or look smooth) after the task metric has peaked or probes have failed. The product does not buy those extra nats.", "kind": "recall"},
            {"q": "F1 has been 0.91 for three evals, loss still dropping. Action?", "a": "Stop and keep the first 0.91 checkpoint (or the rule's winner). Do not spend the rest of the epoch on overfit.", "kind": "apply"},
            {"q": "You early-stopped on train exact-match. What goes wrong?", "a": "Train exact-match rises as you memorise. You stop at maximum memorisation. Use a held-out val skill.", "kind": "debug"},
            {"q": "How can a safety probe stop a run that is still 'learning'?", "a": "If refusals drop past the written threshold you abort even though task loss is falling. Learning the narrow skill at the cost of safety is a failed run.", "kind": "apply"},
            {"q": "What is ε in early stopping here?", "a": "The minimum skill improvement that counts as progress, set before the run, so noise does not reset patience forever.", "kind": "recall"},
        ],
        links=[HF_TRAIN],
    ),
    "forgetting-probe-set": note(
        what="""A **forgetting probe set** is a small, **fixed** bundle of general-ability and safety items that every run must not destroy. It is versioned like the task eval. You fail the run if a slice drops past a **threshold** you wrote before seeing the numbers.

Small means you can afford to run it every checkpoint. Fixed means you do not swap in friendlier questions after a scare.""",
        why="""On the job this is the regression suite for capabilities you are not training. Without it, forgetting is an anecdote from Slack.

Interviews: naming a probe set and a numeric fail line is the grown-up version of "watch out for catastrophic forgetting".""",
        how="""Contents (example): 40 general instructions, 20 format/tool items the product still needs, 40 safety/refusal items, 10 language items if you serve them. Metrics: pass rate per slice. Thresholds: e.g. no slice more than 5 points below the base, no new critical safety fail.

Example. Base refusal 97%. Checkpoint refusal 91% (over the 5-point budget) → run failed, even at record task F1. You mix 60 refusal rows, retrain, land 95% / still-good F1, ship.

Store probe ids in git. Do not harvest production jailbreaks into the probe and also into train without a split policy — you will teach the probe.""",
        fails="""1. **Probe equals train replay.** You measure memorisation of the replay.

2. **Moving threshold after a bad number.** The suite became politics.

3. **One blended score.** Safety can collapse while trivia holds the mean.""",
        line="I keep a versioned probe set for general skill and refusals, I fail the run if a slice drops past a pre-written threshold, and I never judge forgetting by vibe.",
        kps=[
            "A small fixed probe runs on every checkpoint.",
            "Slices: general, still-needed formats, safety, languages.",
            "Pre-write the drop that fails the run.",
            "Do not bury safety in a blended mean.",
            "Do not train on the probe items.",
            "Version probe ids like you version the task eval.",
        ],
        qs=[
            {"q": "What is a forgetting probe set for?", "a": "To measure abilities you are not targeting — general following, leftover formats, safety — and to fail a run when they drop past a written threshold.", "kind": "recall"},
            {"q": "Task F1 is a record but refusal slice is −8 against a −5 budget. Outcome?", "a": "Failed run. Do not ship. Add replay or reduce training and try again. The record F1 is irrelevant if the probe fails.", "kind": "apply"},
            {"q": "The probe items were added to the SFT mix 'to help'. What happens to the metric?", "a": "It stops measuring forgetting and starts measuring memorisation of the probe. Keep probe and train disjoint.", "kind": "debug"},
            {"q": "Why slice the probe instead of one average?", "a": "A blended score lets a collapse in refusals hide behind stable trivia. Gates are per slice.", "kind": "recall"},
            {"q": "How big should the probe be?", "a": "Small enough to run every checkpoint (tens to a couple of hundred items), large enough to see a 5-point drop. Fixed across experiments.", "kind": "apply"},
        ],
        links=[],
    ),
    "reproducible-sft-config": note(
        what="""A reproducible SFT config **pins** the things that change answers: **seed**, **dataset hash**, **chat template** (and tokenizer revision), and **package versions** (transformers, trl, peft, torch, cuda). The run file is the source of truth; the blog post is not.

Reproducible does not mean bitwise identical on every GPU forever. It means another engineer can get the **same eval table within noise** from the file and the data pin.""",
        why="""On the job, unreproducible tunes cannot be rebased or audited. "It worked on my 4090 in March" is not an incident response.

Interviews: list the pins. Seed-only is not enough.""",
        how="""The run file contains:

- `base_model` + revision
- `dataset` + sha256
- `template_hash` / tokenizer rev
- `seed`, LR, batch, accum, max_len, rank, targets
- `pip freeze` or a lock file
- command line

Example. Six months later you rebase. You check out the old file, swap `base_model`, keep the dataset hash, and compare eval tables. If the template key is missing you cannot even reproduce the *old* number, so you cannot say the new base won.

Set seeds for Python, numpy, and torch; turn on deterministic flags where they do not kill throughput. Record the GPU type. If a vendor trainer has no seed, record the job id and the exported artefact hash.""",
        fails="""1. **Seed in the file, data not hashed.** You reproduced the RNG, not the experiment.

2. **Template living only in a notebook cell.** Serve drift is guaranteed.

3. **Unpinned TRL.** Defaults moved; your LR now means something else.""",
        line="The run file pins seed, dataset hash, template, and package versions. If those are missing I cannot rebase, audit, or claim two runs are the same experiment.",
        kps=[
            "Pin seed, dataset hash, template, tokenizer rev, packages.",
            "The run file must be enough to replay the eval table.",
            "Seed-only is not reproducibility.",
            "Record GPU and trainer job id for vendor runs.",
            "A rebase needs the old pins to make a fair comparison.",
            "Unpinned libraries silently change defaults.",
        ],
        qs=[
            {"q": "What four pins belong in a reproducible SFT config?", "a": "Seed, dataset hash, chat template/tokenizer revision, and package versions (plus the obvious base id, LR, and batch). Together they let someone replay the eval table.", "kind": "recall"},
            {"q": "Two runs share a seed but differ by 8 F1 points. First check?", "a": "Dataset hash, template hash, package versions, and effective batch. Seed equality is the weakest pin.", "kind": "debug"},
            {"q": "Why record tokenizer revision, not only model name?", "a": "A tokenizer or template update changes tokenisation and stop tokens. You would train and serve different strings under the same model name.", "kind": "apply"},
            {"q": "Is bitwise GPU determinism required?", "a": "No. Same eval table within noise is the goal. Bitwise flags are optional and often slow. Do not confuse them with the pins that actually drift.", "kind": "recall"},
            {"q": "How does a pinned config make a base-model deprecation survivable?", "a": "You rerun with a new base id against the same hashes and compare. Without pins you cannot tell a real win from a changed template.", "kind": "apply"},
        ],
        links=[TRL],
    ),
}
