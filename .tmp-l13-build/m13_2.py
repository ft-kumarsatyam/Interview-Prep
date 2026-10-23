from helper import note

TRL = {"title": "Hugging Face TRL: SFT trainer", "url": "https://huggingface.co/docs/trl/en/sft_trainer"}
PEFT = {"title": "Hugging Face PEFT", "url": "https://huggingface.co/docs/peft"}

NODES = {
    "specify-the-behavior-first": note(
        what="""A dataset without a written behaviour spec is a pile of opinions. **Specify the behaviour first**: one page that says what a good answer is, what a bad answer is, the output shape, the missing-info rule, and the tone. Every later example is accepted or rejected against that page.

The spec is not a prompt. It is an acceptance test. Labellers, synthetic teachers, and you in six months must be able to apply the same rules. If two reviewers cannot agree on a row using only the spec, the spec is unfinished and you must not scale collection.""",
        why="""On the job, most dirty SFT sets come from "just export the good chats" with no definition of good. You then spend the training budget amplifying whoever happened to be on shift.

In interviews, "how do you build a fine-tune set?" should start with a spec, not with Unsloth. It shows you treat data as a product with QA, not as a dump.""",
        how="""Write the spec as bullets a new hire can apply.

- Task sentence: "Classify the ticket into exactly one of forty labels and a one-line reason."
- Output contract: JSON keys, allowed enums, max reason length.
- Missing info: empty ticket → `other`.
- Tone: no greeting, no apology stack.
- Hard no: never invent an order id.

Then collect **ten gold rows** by hand that pass, and five that fail with a reason. Those fifteen rows are the quiz you give every labeller and every filter script.

Example. Without a spec, logs include "sure! I'd be happy to help — this looks like billing :)" as gold. With a spec, that row is rejected for greeting and emoji. The model never learns to talk like a weekend intern.

Pin the spec next to the dataset version. When the product changes the label set, the spec version bumps and you do not silently mix v1 and v2 rows.""",
        fails="""1. **Spec written after 2,000 rows.** You will not relabel. The spec becomes fan fiction.

2. **Spec is a slogan.** "Be helpful and on-brand" cannot accept or reject a row.

3. **Two specs.** Prompt-eng has one, labelling has another. The model averages the fight.""",
        line="I write a one-page acceptance spec before I collect a row, quiz it on ten gold and five fail examples, and I will not scale labelling until two people apply it the same way.",
        kps=[
            "The behaviour spec is an acceptance test, not a prompt.",
            "Write output shape, missing-info rule, and hard nos first.",
            "Ten pass and five fail examples are the labeller quiz.",
            "If two reviewers disagree, stop collecting and fix the spec.",
            "Version the spec with the dataset; do not mix v1 and v2 rows.",
            "Interviewers want spec-before-Unsloth, not a dump of chats.",
        ],
        qs=[
            {"q": "What belongs on the one-page behaviour spec before collection?", "a": "The task sentence, output contract, missing-info rule, tone constraints, and hard nos. Plus a handful of pass and fail examples so a new hire can apply it without a meeting.", "kind": "recall"},
            {"q": "Two labellers disagree on 30% of a sample. What do you do?", "a": "Stop scaling. The spec is unfinished. Add decision rules for the disputed cases, relabel the sample, and only resume when agreement is usable.", "kind": "apply"},
            {"q": "You exported 'thumbs-up' chats as gold and trained. Outputs are chatty. Root cause?", "a": "No acceptance spec. Thumbs-up meant 'user was satisfied', not 'matches the house template'. Write the spec, filter the export, and retrain.", "kind": "debug"},
            {"q": "Why is the spec versioned with the dataset?", "a": "When labels or tone rules change, old rows become wrong. A version pin lets you exclude v1 from a v2 train and explain a checkpoint.", "kind": "recall"},
            {"q": "How do you use the spec on synthetic teacher data?", "a": "Run the same accept/reject rules in a filter script, then spot-check. The teacher is not exempt; it is another labeller with a known bias.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "where-examples-come-from": note(
        what="""SFT examples come from **production logs**, **expert demonstrations**, or **filtered synthetic data**. Each source has a bias. Logs match real traffic but include errors, policy breaches, and the old prompt's bad habits. Experts are clean and on-spec but expensive and often too tidy. Synthetic data is cheap and broad but collapses toward the teacher's phrasing and the teacher's mistakes.

You almost always mix: logs for coverage of real phrasing, experts for the gold mapping on hard cases, synthetic for rare slots you cannot wait to observe. You never mix without labelling the source on each row so you can ablate later.""",
        why="""On the job, a log-only set teaches the model to sound like last quarter's slightly broken bot. An expert-only set looks great on a polished eval and dies on typos. A synthetic-only set is a clone of one teacher.

Interviews want you to name the three sources and one bias each. Bonus if you say you tag source on every row.""",
        how="""Build a source policy.

- Logs: keep rows where a human edited the answer to the spec, or where a judge plus a human spot-check passed. Drop raw model dumps.
- Experts: write the hard 10% — boundary labels, refusals, empty input — not 4,000 easy paraphrases.
- Synthetic: seed from real prompts, generate with a teacher, filter with the spec and your evals, cap how many clones share an n-gram.

Example. 3,000 rows: 2,200 human-edited productions (source=`log_edit`), 300 expert hard cases (`expert`), 500 teacher variants of rare labels (`synth`, teacher id pinned). An ablation that drops `synth` tells you whether the rare labels still hold.

Bias to expect: logs under-represent new products; experts over-represent complete sentences; synthetic under-represents insults, code-switching, and empty inputs unless you force them.""",
        fails="""1. **Raw log dump.** You train on the bug you are trying to leave.

2. **Synthetic majority without filters.** The student becomes a phrasing clone and fails real traffic.

3. **Untagged mix.** You cannot debug a regression to a source.""",
        line="I mix edited logs for real phrasing, expert rows for hard cases, and filtered synthetic rows for rare slots, and I tag the source on every line so I can ablate.",
        kps=[
            "Three sources: logs, expert demos, filtered synthetic.",
            "Logs match traffic but copy old bugs; edit before they are gold.",
            "Experts are clean and too tidy — use them on the hard tail.",
            "Synthetic is cheap and clone-prone; filter and diversity-check.",
            "Tag source on every row so you can ablate.",
            "Do not let any one source be 100% without a reason.",
        ],
        qs=[
            {"q": "Name one bias of logs, experts, and synthetic data.", "a": "Logs copy the old system's errors and miss new products. Experts look unlike messy users. Synthetic repeats the teacher's phrasing and mistakes and lacks rude or empty inputs unless you force them.", "kind": "recall"},
            {"q": "You have 200 expert rows and noisy logs. How do you grow the set?", "a": "Keep human-edited logs that pass the spec. Use the 200 as seeds for teacher variants on rare labels, filter hard, and hold out real traffic for test. Do not duplicate the 200 twenty times.", "kind": "apply"},
            {"q": "After a synth-heavy train, production typos fail. What was the source bias?", "a": "Synthetic and expert rows were too clean. Add messy log_edit rows and a typo slice to the eval. Retrain or mix in more logs.", "kind": "debug"},
            {"q": "Why tag source on every training row?", "a": "So you can drop or down-weight a source when an ablation or a production slice says that source is hurting, without rebuilding the whole lake.", "kind": "recall"},
            {"q": "When are raw model-to-user logs acceptable as gold?", "a": "Almost never, unless a later human edit or a trusted judge-plus-audit accepted them against the spec. Raw dumps train yesterday's failures.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "match-the-chat-template": note(
        what="""Instruction models were trained with a **chat template**: special tokens that mark system, user, assistant, and end-of-turn. Your SFT rows must be rendered with **that same template**. A mismatch is silent. Loss still falls. The served model then never stops, ignores the system prompt, or talks like a base model.

The template is part of the tokenizer and the model's card, not a style choice. Llama, Mistral, Qwen, Gemma, and vendor APIs each have their own. If you train with `"User:"`/`"Assistant:"` and serve with the official Jinja template, you trained a different language than you serve.""",
        why="""On the job this is the number-one "it worked in the notebook" bug. The notebook concatenated strings; vLLM applied `tokenizer.apply_chat_template`. The eval in the notebook used the same broken concat, so it looked fine.

Interviewers love "the model rambling in production". The first suspicion is template or EOS, not rank.""",
        how="""One rule: **the function that builds messages for training is the function that builds messages for eval and for serve**. Call `apply_chat_template` (or the vendor equivalent) in all three places. Store the template string or its hash in the run config.

Example. Training row as messages `[{role:system,...},{role:user,...},{role:assistant,...}]`, rendered with the 3.1 Llama template that inserts `<|eot_id|>`. Serve with vLLM's default for that tokenizer. Do not hand-write `<|im_start|>` because a blog used it for a different family.

Check: decode a training batch and look for the special tokens you expect. Check: generate with the served stack and confirm it emits the stop token. A five-minute "wrong template in staging" drill should be in the runbook — you want to recognise the failure shape (ramble, doubled roles, ignored system) before production.""",
        fails="""1. **Train without EOS / eot.** The model never learns to stop.

2. **System prompt only at serve.** The model never saw a system role in SFT and shrugs.

3. **Multi-turn rows flattened to one user string.** You lose turn structure the template was built for.""",
        line="I render every train, eval, and serve call with the base model's official chat template and the same stop tokens. A template mismatch looks like a bad tune and is usually just a different language at serve time.",
        kps=[
            "The chat template is part of the model, not decoration.",
            "Train, eval, and serve must call the same render function.",
            "Missing end-of-turn tokens teach the model to ramble.",
            "Do not copy another family's special tokens from a blog.",
            "Hash the template in the run config with the tokenizer revision.",
            "Ramble-in-prod is a template bug until proven otherwise.",
        ],
        qs=[
            {"q": "What is a chat template and why must SFT match it?", "a": "It is the special-token wrapping the base model was trained to see for roles and end-of-turn. If SFT uses a different wrapping, the model learns a dialect you will not speak at serve time, so loss lies and generations look broken.", "kind": "recall"},
            {"q": "Notebook loss is low; vLLM rambles. First check?", "a": "Compare `apply_chat_template` output for a train row with the served prompt. Look for missing eot/eos and different role tags. Fix the render function; do not raise rank.", "kind": "debug"},
            {"q": "How do you keep train and serve aligned as people add features?", "a": "One shared message-building module imported by the trainer, the eval job, and the gateway. Pin tokenizer revision and template hash in the run file.", "kind": "apply"},
            {"q": "Why is flattening a multi-turn chat into one 'User:' string risky?", "a": "The model never practises the official turn tokens. At serve, real multi-turn history uses those tokens and the model leaves the distribution it trained on.", "kind": "recall"},
            {"q": "What should a staging 'wrong template' drill show you?", "a": "The failure shape: endless generation, repeated role tags, or a system prompt that is ignored. You want that picture in the runbook so on-call does not start a retrain.", "kind": "apply"},
        ],
        links=[TRL, PEFT],
    ),
    "loss-on-responses-not-prompts": note(
        what="""Supervised fine-tuning should teach the model to **produce the assistant reply**, not to memorise the user prompt. You **mask the prompt tokens** in the loss (labels = -100 on non-assistant tokens) so gradients flow only through the response, including its end-of-turn token.

If you train on the full sequence, a long retrieved context or a long system prompt dominates the loss. The model gets very good at copying the prompt and only weakly better at the answer. It can also learn to emit user-side text at serve time.""",
        why="""On the job, RAG-style SFT without masking is a common silent failure: train loss looks healthy because the model predicts the already-known context. The skill you wanted barely moves.

Interviews: "why do we mask the prompt?" is a standard SFT question. Answer: so the gradient is about the behaviour you will ask for at inference.""",
        how="""Use the trainer's completion-only / assistant-only loss flag (TRL `DataCollatorForCompletionOnlyLM`, or equivalent assistant-mask in the chat template). Verify by printing a label tensor: prompt positions are ignored, assistant tokens are not, EOS is not.

Example. Prompt is 1,800 retrieved tokens plus a question; gold answer is 40 tokens. Unmasked, ~98% of the loss is "predict the documents". Masked, 100% of the loss is the 40-token house answer plus stop. The same batch now trains the skill.

For multi-turn rows, mask every user and system span; unmask every assistant span you want to imitate. If an earlier assistant turn is context only, mask it too — otherwise you spend capacity relearning old replies.""",
        fails="""1. **No mask on RAG SFT.** Loss falls, skill does not.

2. **Masking the EOS.** The model never learns to stop.

3. **Masking the whole assistant span by off-by-one.** You train on nothing useful and underfit while celebrating a tiny loss.""",
        line="I mask every non-assistant token so the loss is the reply I will ask for at inference, and I always keep the stop token in the loss. If most of the sequence is retrieved context, an unmasked loss is a lie.",
        kps=[
            "Loss belongs on assistant tokens, including EOS.",
            "Long prompts otherwise dominate and the skill barely moves.",
            "Use the trainer's completion-only / assistant-mask path.",
            "Print labels once and confirm prompt positions are ignored.",
            "In multi-turn, only unmask the assistant spans you want to teach.",
            "A tiny loss with no mask often means you predicted the context.",
        ],
        qs=[
            {"q": "Why mask prompt tokens in the SFT loss?", "a": "Inference never asks the model to generate the prompt. Gradients should concentrate on the assistant response and its stop token. Otherwise long contexts dominate the loss and the skill you care about is a rounding error.", "kind": "recall"},
            {"q": "Train loss is low on RAG-style rows but answers stay wrong. First suspicion?", "a": "Unmasked loss on the retrieved documents. Check the label mask. Switch to completion-only loss and re-score the skill metric.", "kind": "debug"},
            {"q": "Should the end-of-turn token be masked?", "a": "No. If EOS is masked the model is not trained to stop. Keep it in the assistant span.", "kind": "recall"},
            {"q": "A multi-turn example has an earlier assistant mistake you do not want copied. What do you mask?", "a": "Mask that earlier assistant span (treat it as context) and unmask only the final corrected reply, or rewrite the history so the bad turn is not there.", "kind": "apply"},
            {"q": "How do you verify the collator is masking correctly?", "a": "Dump one batch: token ids, labels, and a decode of unmasked positions. You should see only assistant text and stop tokens contributing to loss.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "few-clean-beats-many-noisy": note(
        what="""For a **narrow** task, a few hundred **clean, representative** examples usually beat thousands of noisy ones. Noise here means wrong labels, mixed specs, duplicates, truncated replies, and near-copy synthetic clones. Each noisy row pulls the model toward a different mapping; the average is mush.

Clean means it passes the spec, is unique enough, and covers the cases you actually see — including the tail, not only the easy mode. Representative means the mix matches the residual error, not a convenience export.""",
        why="""On the job, people equate "more data" with "more serious". A 20k dump of thumbs-up chats will lose to 400 audited rows on a forty-label router. You need the courage to delete.

Interviews: saying "quality over quantity for SFT" is expected; saying "and I measure with a 50-row audit every version" is senior.""",
        how="""Set a quality gate before you grow.

- Target a few hundred to a few thousand **accepted** rows for a narrow skill, not 50k raw.
- After each ingest, run the cleaner (dupes, contradictions, truncations, clone n-grams).
- Hand-audit 50 rows; if error rate > your threshold (say 4%), do not train.
- Grow by adding **missing slices**, not by duplicating what you already have.

Example. v1: 350 expert+edited rows, audit error 2%, held-out accuracy 89%. v2: +8,000 raw logs, audit error 11%, accuracy 84%. You revert to v1 and only add the 200 cleaned logs that fill rare labels. Volume was not the lever; coverage of the tail was.

When you truly need scale (a broad assistant), you still clean first. You just accept that "few" becomes "few tens of thousands of clean rows", not "a million unfiltered traces".""",
        fails="""1. **Duplicates as free data.** The model overfits a phrasing and the eval leaks.

2. **Growing before the audit passes.** You industrialise a 11% error factory.

3. **Easy-only cleanliness.** You deleted the hard cases because they looked messy, then the tail dies.""",
        line="For a narrow tune I would rather train on 400 rows that pass a spec and a 50-row audit than on 20,000 noisy chats. I grow by filling missing slices, not by dumping logs.",
        kps=[
            "Narrow SFT: hundreds of clean rows beat thousands of noisy ones.",
            "Clean = spec pass, unique, covers the real mix including the tail.",
            "Audit a fixed sample every dataset version before you train.",
            "Grow by missing slices, not by duplicates or raw dumps.",
            "Delete is a data skill; more is not automatically better.",
            "Broad assistants still need cleaning; the number just scales up.",
        ],
        qs=[
            {"q": "Why can 400 clean rows beat 20,000 noisy chats on a narrow task?", "a": "Noisy rows teach contradictory mappings, so the model averages mush. Clean rows agree on one spec. For a closed skill the signal in a few hundred agreements is enough; the extra volume is mostly error.", "kind": "recall"},
            {"q": "v2 added 8k logs and accuracy fell. What do you check first?", "a": "The 50-row audit error rate and per-label coverage versus v1. If audit error jumped or hard cases were diluted, revert and add only cleaned tail rows.", "kind": "debug"},
            {"q": "How do you decide the set is allowed to grow?", "a": "The spec is stable, the audit error is under threshold, and you can name the slice the new rows add. If you cannot name the slice, you are collecting comfort, not coverage.", "kind": "apply"},
            {"q": "When is 'few hundred' the wrong scale?", "a": "When the task is a broad open-ended assistant rather than a narrow mapping. You still clean, but you need much more diversity. Do not use the narrow-task slogan to under-collect a general model.", "kind": "recall"},
            {"q": "A stakeholder wants to hit 50k rows this sprint. What do you offer instead?", "a": "A coverage map of slices and a plan to add the empty ones with audit gates. Report accepted rows, not ingested rows.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "cleaning-bad-examples": note(
        what="""Cleaning is a pipeline, not a hope. You remove **duplicates**, **contradictions** (same prompt, different gold), **wrong labels**, **truncated** replies (hit max tokens, cut mid-JSON), and **synthetic clones** that repeat the same sentence frames. You also drop rows that fail the spec even if a human once liked them.

Every dropped class gets a count in the dataset card so you can see whether the cleaner is eating the tail.""",
        why="""On the job, uncleaned sets cause mysterious "the model contradicts itself" reports that are just two golds fighting. Truncated JSON in train produces truncated JSON in prod.

Interviews: walk through a concrete cleaner, not "we preprocess".""",
        how="""Implement as deterministic steps with logs.

1. Normalise whitespace and hash the prompt (and optionally the answer) to drop exact dupes.
2. Group by normalised prompt; if golds disagree, send to a human or drop the group.
3. Schema-validate structured golds; drop or repair.
4. Detect truncation: no EOS, unmatched braces, ends mid-word after a length cap.
5. N-gram / embedding near-dupe collapse for synthetic batches.
6. Spec filter: greetings forbidden? drop them.

Example. 6,400 ingested → 410 exact dupes, 88 contradictions, 120 invalid JSON, 64 truncations, 900 synth clones, 70 spec fails → 4,748 accepted. The card shows you almost wiped two rare labels in the clone collapse, so you restore 40 unique expert rows for those labels.

Do not "clean" by deleting every long or angry user prompt. That is policy, not hygiene, and it hides production.""",
        fails="""1. **Contradiction kept as two truths.** The model samples both.

2. **Cleaner eats the tail.** Rare labels vanish; aggregate accuracy rises; hard-case accuracy falls.

3. **Repair by regex until gold is fiction.** You trained on a sentence no user will trigger.""",
        line="I run a logged cleaner for dupes, contradictions, bad labels, truncations, and synth clones, I publish drop counts, and I check that rare slices survived before I train.",
        kps=[
            "Drop dupes, contradictions, wrong labels, truncations, synth clones.",
            "Log drop counts by class on the dataset card.",
            "Schema-validate structured golds before they enter train.",
            "Watch the cleaner so it does not delete rare labels.",
            "Hygiene is not 'delete long or angry users'.",
            "Contradictory golds become a self-contradicting model.",
        ],
        qs=[
            {"q": "List five classes of bad SFT rows and why each hurts.", "a": "Duplicates overfit a phrasing and leak. Contradictions teach two mappings. Wrong labels invert the skill. Truncations teach unfinished JSON. Synthetic clones shrink diversity and hide eval leakage.", "kind": "recall"},
            {"q": "After cleaning, aggregate accuracy rose but a rare label died. What happened?", "a": "The cleaner or clone collapse removed the few examples of that label. Compare per-label counts before and after and restore unique gold for the tail.", "kind": "debug"},
            {"q": "How do you handle two different golds for one normalised prompt?", "a": "Do not keep both. Send the group to a human with the spec, or drop the group. Training on both is how the model learns to flip a coin.", "kind": "apply"},
            {"q": "What is a cheap truncation detector?", "a": "Missing EOS, unmatched brackets in structured output, or a reply that ends at the generation cap mid-token. Those rows teach the model to stop early.", "kind": "recall"},
            {"q": "Why publish drop counts instead of silently deleting?", "a": "So a reviewer can see if 'cleaning' was actually 'deleted the hard 8%'. The card is part of the dataset version.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "balancing-edge-cases": note(
        what="""If you train on the raw log distribution, the model learns that the **easy majority is always right**. **Balance** the set so difficult, rare, and high-cost slices have enough mass: empty inputs, ambiguous labels, refusals, multilingual, long tickets, the one product line that causes refunds.

Balance is not fake uniformity. It is **enough** of each slice that the loss cannot ignore it, plus eval metrics per slice so you notice when a majority accuracy hides a tail collapse.""",
        why="""On the job, a router that is 94% overall and 40% on "chargeback" will still page you. The majority class was over-sampled by nature.

Interviews: "how do you stop the model always picking the common label?" — class weights, oversampling the tail, and slice metrics, not a bigger rank.""",
        how="""Build a slice table before the split.

- Define slices that matter: label, language, length bucket, refusal, tool-use, the original failure mode.
- Set a minimum train count per slice (even 30–50 can matter on a narrow task).
- Upsample the tail or set loss weights; downsample endless easy "how-to" if it is 70% of logs.
- Keep the **natural** mix on the held-out test so you do not fool yourself with an artificial test prior.

Example. Chargeback is 3% of logs and 30% of money. You upsample chargeback to 12% of train, keep test at 3%, and report both overall and chargeback accuracy. A tune that lifts overall 1 point and drops chargeback 8 points is a fail, not a ship.

Write the balancing rule in the dataset card so v2 does not "accidentally" return to the raw prior.""",
        fails="""1. **Balanced test set.** You celebrate a number that production will never show.

2. **Upsampled junk.** You duplicated three bad chargeback rows twenty times.

3. **No slice metrics.** Only the mean is reviewed; the tail burns.""",
        line="I give hard and expensive slices enough train mass to be learned, I keep the test mix honest, and I refuse a mean score that hides a tail drop.",
        kps=[
            "Raw logs over-teach the easy majority.",
            "Set a minimum train count for slices that matter.",
            "Upsample clean tail rows; do not clone three junk examples.",
            "Keep the held-out prior close to production.",
            "Report slice metrics, especially the expensive ones.",
            "Write the balancing rule into the dataset version.",
        ],
        qs=[
            {"q": "Why does a raw-log mix produce a model that ignores edge cases?", "a": "The loss is dominated by frequent easy rows, so parameters move to win the majority. Rare slices contribute too little gradient to be learned unless you upsample or reweight them.", "kind": "recall"},
            {"q": "Chargeback is 3% of traffic and 30% of loss. How do you balance?", "a": "Raise its share in train (or its loss weight) using clean examples, keep test near 3%, and gate the ship on chargeback accuracy as well as the mean.", "kind": "apply"},
            {"q": "Overall +2, payments slice −8. Ship?", "a": "No. The mean hid a costly regression. Block, inspect those failures, and add clean payments rows or drop the checkpoint.", "kind": "debug"},
            {"q": "Why not also rebalance the held-out test to be uniform?", "a": "You would no longer estimate production risk. Uniform test is a diagnostic; the gate should reflect traffic and cost.", "kind": "recall"},
            {"q": "What is the danger of upsampling by simple duplication?", "a": "You overfit a handful of phrasings and can leak those copies into eval if you split badly. Prefer new unique tail examples or careful weighted sampling with a leak scan.", "kind": "apply"},
        ],
        links=[],
    ),
    "leak-free-splits": note(
        what="""Split into **train, validation, and held-out test** so that **near-duplicates do not cross**. A leak is not only an exact copy. It is a paraphrase, a shared ticket id, a shared document, or a synthetic child of a test parent. Leaks make test scores look like production and then production falls off a cliff.

The held-out test is frozen. You may look at it when you are ready to ship, not every time you tweak rank.""",
        why="""On the job, 98% test / 70% production is almost always leakage or a mismatched template. The leak is the more embarrassing one because it is your process.

Interviews: "how do you split?" should include grouping keys and a near-dupe scan, not `train_test_split(random_state=42)` on rows.""",
        how="""Split by a **group** that must stay together: user id, ticket id, document id, or seed prompt id for synthetic children. Then run a **normalised-prompt hash** and, if you can, an embedding near-dupe pass across the three sets. Any hit moves to train or is dropped from test — test stays pure.

Example. You generate five teacher paraphrases per seed. If any paraphrase is in test, all siblings and the seed are in test — or none are. A random row split puts siblings on both sides and the model "discovers" the paraphrase.

Order of operations: clean → group split → near-dupe scan → lock test hashes in the dataset card. New rows are assigned by the same rules; they do not "refresh" test.""",
        fails="""1. **Random row split on paraphrases.** Instant leak.

2. **Tuning on test.** The held-out set dies the tenth time you peek.

3. **IDs stripped before split.** You can no longer group.""",
        line="I split by group, scan normalised near-duplicates across train and test, and I freeze the test hashes. A 98% test score with a production slump is a leak until I prove otherwise.",
        kps=[
            "Train, validation, and a frozen held-out test.",
            "Split by group (ticket, user, seed), not by isolated rows.",
            "Near-dupe and paraphrase leaks count as leaks.",
            "Synthetic children stay with their seed on one side.",
            "Lock test hashes; do not refresh test with new rows.",
            "Peeking at test every run spends the holdout.",
        ],
        qs=[
            {"q": "What is a near-duplicate leak in an SFT split?", "a": "A train row that is an exact or paraphrased copy of a test prompt, or a synthetic child of a test seed. The model memorizes the sibling and the test score stops predicting production.", "kind": "recall"},
            {"q": "You have five teacher paraphrases per seed. How do you split?", "a": "Assign the whole sibling group to one split. Never put two paraphrases of the same seed on opposite sides.", "kind": "apply"},
            {"q": "Test is 98%, production is 70%. What do you suspect and do?", "a": "Leakage or a template mismatch. Re-run the near-dupe scan, split by group, and re-evaluate on fresh traffic. Do not celebrate the 98%.", "kind": "debug"},
            {"q": "Why freeze test hashes in the dataset card?", "a": "So later ingest cannot quietly move a near-dupe of a test item into train, and so reviewers can replay the split.", "kind": "recall"},
            {"q": "When may you look at the held-out test?", "a": "When you are choosing whether to ship a candidate already selected on validation. Not on every hyperparameter idea.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "pii-licensed-content": note(
        what="""Training data is **eaten into weights**. If you would not want the model to repeat a string word for word, that string should not be in the set. That includes **personal data** (names, emails, account ids, health, addresses), **secrets**, and **licensed or copyrighted** text you do not have the right to train on — vendor docs with restrictive terms, books, news, other models' outputs when their terms forbid it.

A tune is not a search index. You cannot reliably delete one paragraph later. The cleanup is before the job.""",
        why="""On the job this is legal and trust, not polish. A model that completes a customer's phone number from a log export is an incident. A model that recites a licensed manual is a letter from a publisher.

Interviews: mention PII redaction and licence checks without being asked. It reads as production experience.""",
        how="""Run a review **before** the split is locked.

- Automated: email/phone/id regexes, secret scanners, known-licence classifiers if you have them.
- Human: a sample of logs, especially long pastes.
- Policy: drop or replace PII with stable placeholders (`{{email}}`) **consistently** in prompt and gold so the mapping still makes sense.
- Licence: keep a source list. Teacher outputs need their own terms check (see distillation).

Example. A support export has order ids and emails. You replace them with typed placeholders and keep the house tone. The model learns the template, not Ms. Alvarez's address. You store the raw export in a restricted bucket that the trainer cannot read.

If a row cannot be redacted without destroying the task (a medical letter that *is* the PII), you do not train on it in an ordinary LoRA. That is a different compliance project.""",
        fails="""1. **Redact the prompt, leave the gold.** The model learns to re-insert the email.

2. **"It's internal, so it's fine."** Internal still has employees and customers.

3. **Training on a vendor PDF whose terms forbid it.** You cannot un-eat it cheaply.""",
        line="If I would not want the model to quote a string, I do not train on it. I redact PII consistently, scan for secrets, and I check licences — including teacher outputs — before the job.",
        kps=[
            "Weights can regurgitate training strings; treat that as likely.",
            "Redact PII in both prompt and gold, consistently.",
            "Scan for secrets before the trainer sees the files.",
            "Licensed text and some teacher terms are off-limits.",
            "You cannot reliably unlearn one paragraph after the fact.",
            "Internal logs still contain other people's data.",
        ],
        qs=[
            {"q": "Why is a fine-tune a worse place to store PII than a database?", "a": "You cannot query-delete one row from weights, and the model may reproduce the string for a new user. A database has access control and erasure. Redact before training.", "kind": "recall"},
            {"q": "You redacted emails in prompts but left them in gold replies. What happens?", "a": "The model is trained to emit emails. It will invent or leak them. Redact both sides with the same placeholder scheme.", "kind": "debug"},
            {"q": "A row is a medical letter that is inherently PII. Options?", "a": "Do not put it in an ordinary SFT set. Either run a compliance-approved pipeline or drop the row. Placeholders that destroy the task are not a fix.", "kind": "apply"},
            {"q": "What licence question do you ask about synthetic teacher data?", "a": "Whether the teacher's terms allow using outputs to train a competing or replacement model. If not, pick another teacher or human data.", "kind": "recall"},
            {"q": "Where should the raw unredacted export live?", "a": "In a restricted store the training job cannot read. The trainer sees only the redacted, versioned set.", "kind": "apply"},
        ],
        links=[],
    ),
    "versioning-the-dataset": note(
        what="""A tuned checkpoint is unexplained unless you can point at **exactly** the rows, the spec, the template, and the training config that made it. **Version the dataset** like code: an id, a hash of the accepted rows, the spec version, the split hashes, the cleaner version, and a card with counts and audit error.

"We used the support export" is not a version. Two months later nobody can reproduce the run or answer which bad row caused a regression.""",
        why="""On the job, versioning is how you rebase onto a new base model without folklore. It is also how you revert: restore `ds-2026-03-12` and the matching recipe.

Interviews: "how do you track experiments?" should mention dataset hash next to learning rate, not only W&B screenshots.""",
        how="""One folder or table per dataset version:

- `spec.md` (or its hash)
- `accepted.parquet` + SHA-256
- `splits.json` with group ids and prompt hashes
- `card.md`: source mix, drop counts, slice counts, 50-row audit error
- pointer from the training run: `dataset=ds-2026-03-12@sha256:...`

Example. Adapter `router-lora-17` says `dataset=ds-2026-03-12`, `base=llama-3.1-8b-instruct`, `template=llama3.1@rev`. A bad chargeback answer is reproducible: load those rows, find the gold, see the error, ship `ds-2026-03-18` with the fix, train `router-lora-18`.

Do not overwrite a version in place. Snapshots are cheap; arguments about what changed are not.""",
        fails="""1. **Mutable 'latest'.** Today's train is not yesterday's and nobody noticed.

2. **Hashing the raw dump, not the accepted set.** The cleaner moved; the hash lied.

3. **Config in a chat thread.** The run cannot be replayed.""",
        line="Every checkpoint points at an immutable dataset hash, spec version, and split file. If I cannot name those, I do not have a model I can retrain or debug.",
        kps=[
            "Version rows, spec, splits, and cleaner — not a folder called latest.",
            "Hash the accepted set the trainer actually reads.",
            "The run config stores dataset id + sha256 + template + base.",
            "Never overwrite a version; snapshot and bump.",
            "A dataset card with audit error is part of the version.",
            "Rebase and rollback both depend on this pin.",
        ],
        qs=[
            {"q": "What artefacts make a dataset version reproducible?", "a": "The spec, the accepted-row file and its hash, the split hashes, the cleaner version, and a card with counts and audit error. The training run stores those pointers next to the base and template.", "kind": "recall"},
            {"q": "A production miss looks like a wrong gold. How do you confirm?", "a": "Resolve the adapter's dataset hash, find the nearest train row, and read the gold against the spec. If the gold is wrong, bump a new dataset version; do not hotfix weights by hand.", "kind": "apply"},
            {"q": "Two runs claim the same dataset name but different metrics. First check?", "a": "Compare sha256 of the accepted files and the split files. A mutable 'latest' or an unhashed cleaner change is the usual cause.", "kind": "debug"},
            {"q": "Why hash accepted rows rather than the raw ingest?", "a": "The trainer never sees the raw ingest. Reproducibility is about the tensor input. Raw hashes hide cleaner drift.", "kind": "recall"},
            {"q": "How does dataset versioning make a base-model rebase cheaper?", "a": "You rerun the same hashed set and eval on the new base instead of reconstructing folklore from Slack. The comparison is fair.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "gold-spec-before-collection": note(
        what="""**Gold-spec before collection** means the acceptance rules exist as a checklist an example must pass, and logs that miss them are **rejected**, not "cleaned later". It is the operational form of specify-the-behaviour-first: the spec is in the intake filter, not in a slide.

Collection UIs, log exporters, and synthetic jobs all call the same `accept(row)` function. If it returns false, the row never enters the lake.""",
        why="""On the job, "we'll filter in a notebook next week" is how 50k dirty rows become the set because next week never comes. Putting the spec at the door is cheaper than a heroic cleaner.

Interviews: this is the difference between a data dump and a labelling operation.""",
        how="""Turn the spec into predicates.

- `has_allowed_label`
- `json_valid` / `schema_valid`
- `no_greeting` / `no_pii_regex`
- `not_truncated`
- `reason_length <= 20 tokens`

Hook them in the export job. Show labellers the failing predicate. Track reject rates per predicate so a sudden spike means the product changed or the logger broke.

Example. After a prompt change, production answers grow greetings. Reject rate on `no_greeting` jumps from 4% to 40%. You do not quietly accept them. You either fix production or you stop exporting until humans edit. The train set stays on-spec.

The ten gold / five fail quiz is the unit test for `accept()`.""",
        fails="""1. **Accept-all, filter-later.** The lake becomes the product.

2. **Predicates only on synthetic.** Logs sneak around the spec.

3. **Silent rejects.** Labellers do not learn; they repeat the fail.""",
        line="I compile the behaviour spec into an accept() used at intake. Rows that miss it never enter the lake, and I watch reject rates so a broken logger cannot fill the set.",
        kps=[
            "The spec is an intake filter, not a later notebook.",
            "One accept() for logs, experts, and synthetic jobs.",
            "Show labellers which predicate failed.",
            "Watch reject-rate spikes as a data-quality alert.",
            "Unit-test accept() on the ten gold and five fail rows.",
            "Filter-later is how dirty lakes become training sets.",
        ],
        qs=[
            {"q": "What does gold-spec before collection change about intake?", "a": "Every source goes through the same accept() predicates derived from the spec. Failures are rejected at the door with a reason, not stored for a mythical later clean.", "kind": "recall"},
            {"q": "Reject rate on no_greeting jumps from 4% to 40% after a prompt change. What do you do?", "a": "Do not relax the predicate to fill the set. Fix the producer or switch to human edits. Investigate the spike; it is a data alert.", "kind": "apply"},
            {"q": "Synthetic jobs use accept() but the log exporter does not. Risk?", "a": "The lake's majority becomes unspecced logs. The filter is theatre. Put the exporter on the same function.", "kind": "debug"},
            {"q": "How do you unit-test the intake filter?", "a": "The ten passing golds must accept; the five known fails must reject with the expected predicate. Run that in CI when the spec changes.", "kind": "apply"},
            {"q": "Why show labellers the failing predicate?", "a": "So they correct the same mistake next time instead of submitting another silent reject. The spec stays alive.", "kind": "recall"},
        ],
        links=[],
    ),
    "near-duplicate-leak-scan": note(
        what="""A **near-duplicate leak scan** hashes **normalised** prompts (and sometimes answers) so a paraphrase of a test item cannot sit in train. Normalise: lowercase where safe, strip punctuation and greetings, collapse whitespace, maybe drop digits that are only ids. Then hash. Optionally embed and block pairs above a similarity threshold.

This is the mechanical twin of leak-free splits. The split assigns groups; the scan catches what grouping missed — a human rewrite of a test ticket, a synth paraphrase with a new seed id.""",
        why="""On the job, this is the difference between an honest 81% and a vanity 96%. After you have been burned once, the scan is a required CI step on every dataset version.

Interviews: naming "normalised prompt hash" is concrete enough to be believed.""",
        how="""Pipeline:

1. Build a canonical string per row (`norm(prompt)`).
2. Exact-hash collision across splits → move or drop.
3. Optional: MinHash or embedding k-NN; review pairs over a threshold.
4. For synthetic rows, also hash the **seed** and block if the seed is in test.
5. Write surviving test hashes into `splits.json`.

Example. Test has "I was charged twice on order 8891". Train has "Charged 2x, order 8891 — please help". After digit-preserving normalisation the order id still links them; your group key should have caught 8891. If ids were stripped, the embedding pass still flags the pair. You move the train sibling out.

Re-run the scan whenever you add rows. New synth is the usual leak source.""",
        fails="""1. **Hashing raw text only.** "Please help" vs "pls help" evades an exact hash.

2. **Aggressive normalisation that collides unrelated tickets.** Too many false merges; you empty the test set.

3. **Scan once at v1.** v3 synth leaks into the frozen test's neighbourhood.""",
        line="I normalise prompts, hash them, and block train rows that collide with test — including paraphrases and synth children — every time the dataset version bumps.",
        kps=[
            "Normalise then hash; exact raw hashes miss paraphrases.",
            "Keep a group key (order id, seed) in addition to the hash.",
            "Re-run the scan on every ingest, especially synthetic.",
            "Embedding near-dupe is a second pass, not a replacement.",
            "Tune normalisation so you do not collide unrelated rows.",
            "A vanity 96% is often a missed paraphrase leak.",
        ],
        qs=[
            {"q": "What does a near-duplicate leak scan do that a random split does not?", "a": "It catches paraphrases and synthetic children that do not share a row index. Random splits assume independence; language data is full of rewrites.", "kind": "recall"},
            {"q": "Train has a polite rewrite of a test ticket. How should the scan treat it?", "a": "As a leak. Move the train row or drop it. If they share an order id, the group split should have kept them together; the scan is the backstop.", "kind": "apply"},
            {"q": "After adding 2k synth rows, test score jumps 7 points. First check?", "a": "Re-run the leak scan against the frozen test hashes and seed ids. Synth is the usual silent leak. If hits appear, remove them and re-score.", "kind": "debug"},
            {"q": "Why preserve order ids while stripping greetings in normalisation?", "a": "Greetings are style; ids are the group key that proves two rows are the same case. Stripping ids makes true leaks look novel.", "kind": "recall"},
            {"q": "When do embedding near-dupes need a human?", "a": "When similarity is high but the task differs (two refund tickets with different outcomes). Auto-blocking those would shrink diversity; review the band above the threshold.", "kind": "apply"},
        ],
        links=[],
    ),
    "synthetic-diversity-checks": note(
        what="""Teacher-written examples collapse. **Synthetic diversity checks** measure how much the new rows are clones — repeated n-grams, repeated templates, tiny edit distance — and **drop the clones** before they dominate the loss.

Diversity is not "many files". It is many **distinct** phrasings, entities, and slice tags. A teacher asked to "write more chargeback tickets" will emit the same four sentences with new numbers. That is one example with makeup.""",
        why="""On the job, undiverse synth is how students fail the first weird user. It is also how you leak: clones of a test seed look new to a sloppy hash.

Interviews: "risks of synthetic SFT" should include clone collapse and teacher error, not only "might be wrong".""",
        how="""Measure, then drop.

- Self-BLEU / n-gram overlap inside the synth pool and against train.
- Template detection: same opening 8 tokens.
- Entity diversity: unique SKUs, locales, error codes.
- Slice caps: no more than N synth rows per seed or per label.

Example. 1,000 teacher rows → 620 share one of three openings ("Of course, I can help with your refund…"). You drop those 620, keep 180 that start differently and pass the spec, and you change the teacher prompt to forbid the house greeting the teacher loves.

Pair this with the leak scan: a clone of a test item is both a diversity fail and a leak.""",
        fails="""1. **Diversity by count.** 5,000 rows, 12 templates.

2. **Dropping until the tail is gone.** You needed those 40 ugly rows more than the 600 clones.

3. **No teacher prompt constraint.** You fight the same greeting every batch.""",
        line="I measure n-gram and template overlap on teacher rows, drop clones, cap per seed, and I will not let 5,000 files hide twelve sentences.",
        kps=[
            "Synthetic data collapses to a few templates unless you check.",
            "Measure n-gram overlap, openings, and entity diversity.",
            "Cap synth rows per seed and per label.",
            "Drop clones; keep the ugly unique tail.",
            "A clone of a test seed is also a leak.",
            "Fix the teacher prompt if the same greeting keeps appearing.",
        ],
        qs=[
            {"q": "What is a synthetic diversity check looking for?", "a": "Clone collapse: repeated n-grams, identical openings, low entity variety, too many children per seed. Those rows waste loss and can leak paraphrases into test.", "kind": "recall"},
            {"q": "620 of 1,000 teacher rows start with the same greeting. Action?", "a": "Drop them, forbid that opening in the teacher prompt, and keep only rows that pass the spec and look distinct. Do not keep them for 'volume'.", "kind": "apply"},
            {"q": "Diversity filtering removed most chargeback synth. What did you lose?", "a": "The tail you were trying to grow. Restore unique expert or log_edit chargeback rows and loosen the filter only for that slice, or prompt the teacher with more seeds.", "kind": "debug"},
            {"q": "Why cap children per seed?", "a": "Many paraphrases of one seed are still one situation. They overweight that situation and leak if any sibling is in test.", "kind": "recall"},
            {"q": "How do diversity checks interact with the leak scan?", "a": "Run both. Diversity drops clones inside train; the leak scan blocks remaining near-dupes of test. Neither replaces the other.", "kind": "apply"},
        ],
        links=[],
    ),
    "label-audit-sample": note(
        what="""A **label audit** is a **fixed-size hand review** (fifty rows is a good default) of every dataset version, with the **error rate recorded** on the card. It is not browsing until you feel good. It is a sample with a protocol: who reviews, against which spec, how disagreements are resolved, and what error rate blocks training.

Fifty is enough to catch a 10% disaster with high probability and cheap enough to do every bump. It will not catch a 0.5% poison; that is what automated predicates are for.""",
        why="""On the job, this is the cheapest quality metric you will ever have. Teams that skip it train on a 12% wrong set and then debug the model for a week.

Interviews: "how do you know the set is clean?" — accept() plus a 50-row audit with a recorded rate. That sentence is complete.""",
        how="""Protocol:

1. Draw 50 rows **stratified** by slice (not 50 easy ones).
2. A reviewer who did not write the rows applies the spec blindly.
3. A second reviewer on disagreements.
4. Error rate = definite fails / 50. Threshold e.g. 4% (2 rows) blocks the train.
5. Write the rate, the reviewer ids, and links to the fail rows on the card.

Example. v7 audit: 4/50 fail (wrong label, truncated JSON, PII, greeting). You fix those classes in the cleaner, redraw 50, get 1/50, train. You do not "fix the four and call it 0/50" without a redraw — that is grading your own homework.

Trend the rate across versions. A climbing audit error means intake is drifting even if accept() has not changed.""",
        fails="""1. **Unstratified sample.** You never see the tail.

2. **Author reviews their own rows.** The rate is fiction.

3. **No block threshold.** The audit is a ritual; you train anyway.""",
        line="Every dataset version gets a stratified 50-row hand audit, the error rate goes on the card, and I will not train if it misses the threshold. Fixing the sample without redrawing does not count.",
        kps=[
            "Fixed 50-row (or similar) audit every dataset version.",
            "Stratify so the tail is in the sample.",
            "Reviewers are not the authors of those rows.",
            "Record the error rate; a threshold blocks the train.",
            "After fixes, redraw; do not grade the same 50 again as 0%.",
            "Trend the rate — climbing means intake is drifting.",
        ],
        qs=[
            {"q": "What does a label audit sample produce that accept() does not?", "a": "A measured human error rate on a stratified sample, including mistakes no predicate knows about yet. accept() is automated and blind to new failure classes.", "kind": "recall"},
            {"q": "Audit is 4/50. You fix those four rows. Can you train?", "a": "Not on the strength of '0/50 on the same sample'. Redraw a new stratified 50. The original four taught you classes to clean, not the new rate.", "kind": "apply"},
            {"q": "Audits are always 50 easy how-to tickets. What is wrong?", "a": "The sample is not stratified. The tail can be 20% wrong while the audit stays clean. Force slice quotas.", "kind": "debug"},
            {"q": "Why record reviewer ids on the card?", "a": "So you can see self-review, measure inter-rater issues, and reproduce who called a row good when a production incident traces to it.", "kind": "recall"},
            {"q": "Pick a block threshold and justify it for a forty-label router.", "a": "Something tight like 4% (2/50). A 10% wrong set will move decision boundaries. Automated predicates should already have removed the obvious fails, so 4% remaining is a real process problem.", "kind": "apply"},
        ],
        links=[],
    ),
}
