from helper import note

HF_EVAL = {"title": "Hugging Face: evaluate", "url": "https://huggingface.co/docs/evaluate/index"}
OA_FT = {"title": "OpenAI: fine-tuning guide", "url": "https://platform.openai.com/docs/guides/fine-tuning"}
HF_TRAIN = {"title": "Hugging Face: training", "url": "https://huggingface.co/docs/transformers/en/training"}

NODES = {
    "baselines-before-training": note(
        what="""A **baseline** is the strongest cheap system you can already run on the held-out set: best prompt, few-shot, retrieval, structured outputs, maybe a larger or newer model. The **untuned base** with the same prompt is a second point, so you can attribute gains to weights rather than to a prompt you also changed. Without those two numbers a tune cannot win or lose; it can only exist.

Record quality, format validity, latency and cost per successful task for each baseline. Write the **ship threshold** before the first training job (illustrative: "+5 points, no critical-slice drop, cost ≤ the prompted giant"). After-the-fact thresholds are rationalisation.

A lazy one-line prompt is not a baseline. It is a way to make a tune look inevitable.""",
        why="""On the job, most tune reviews skip this and compare to an embarrassing prompt. The tune "wins" and you now own weights. In interviews, "what was the baseline?" is how they test whether you have done Level 13 or only watched a LoRA video.

Hiring managers also want to hear that you would drop the tune if a better prompt or a new base closes the gap. The baseline is what makes that sentence possible.""",
        how="""Before anyone books a GPU:

1. Freeze the held-out set.
2. Spend a real week on the prompted system (examples, retrieval, schema).
3. Score it and the raw base. Store the report with ids.
4. Write the threshold and the kill criteria in the ADR.
5. Only then open a training config.

Example: ticket routing. Raw 8B is 71% on 800 held-out tickets. Prompted 8B with taxonomy few-shot is 86%. Prompted frontier is 91%. You write: ship a LoRA if it reaches 90% and costs ≤ 20% of the frontier. The tune later hits 90.5%. You can justify it. A team that only compared to 71% would have shipped a 80% LoRA and called it a success.""",
        fails="""1. **Lazy baseline.** One-line prompt, 20-point "gain", sunk cost.

2. **Changed prompt and weights together.** You cannot say what helped.

3. **No cost or latency on the baseline.** The tune is cheaper to train than to run; you notice later.

4. **Threshold after the run.** You needed +5; you got +2; you shipped anyway.""",
        line="The baseline is the best prompted system plus the raw base, scored on the frozen set, with a ship threshold written first. I will not train to beat a lazy prompt, and I will drop the tune if the cheap system catches up.",
        kps=[
            "Baseline = best prompt/RAG/schema, not a one-liner.",
            "Also score the untuned base so you can attribute the gain.",
            "Record quality, format, latency and cost.",
            "Write the ship threshold before the first job.",
            "A lazy baseline manufactures a fake win.",
            "Re-score the baseline whenever the prompt or a new base improves.",
        ],
        qs=[
            {"q": "Why set a ship threshold before training?", "a": "So the decision is not rewritten to fit the run. You need a pre-agreed gain and a regression limit.", "kind": "recall"},
            {"q": "A tune beats a one-line prompt by 20 points. Convincing?", "a": "No. Compare it to a well-engineered prompt with few-shot and retrieval. The gap often collapses.", "kind": "apply"},
            {"q": "You changed the system prompt and trained in the same week. What can you not say?", "a": "Whether the weights or the prompt moved the score. Split the experiments; keep a prompt-only control.", "kind": "debug"},
            {"q": "What four numbers belong on every baseline row?", "a": "Task metric, format validity, latency (p95) and cost per successful task.", "kind": "recall"},
            {"q": "A new base model appears and the prompted score jumps to the threshold. What do you do?", "a": "Re-score. If the cheap path now hits the gate, do not ship the tune. The baseline exists to let you walk away.", "kind": "apply"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
    "same-held-out-set-same-judge": note(
        what="""Every candidate — raw base, prompted baseline, tune, stronger model — is scored on the **same held-out set** with the **same judge, judge prompt, decoding and scoring rules**. Change any of those and the delta is uninterpretable.

Freeze the set: no training, no prompt-hacking, no "just this one extra easy item". Pin the judge model version. Calibrate it on human labels. For noisy metrics, repeat and report variance. Randomise pairwise order. Do not let the tuned model or its teacher grade itself.

Retuning the judge until the new model wins is fraud with extra ceremony.""",
        why="""On the job this is the only way two people can argue from the same graph. In interviews, listing what must stay constant is a Level 7/13 crossover they expect. Self-preference bias is the follow-up — have a sentence ready.

Small sets make this sharper. At n=100 a 2-point gap is often noise. Same set, same judge, plus an interval, or you are reading tea leaves.""",
        how="""Harness rules in the repo, not in a notebook:

1. `evals/holdout_v4.jsonl` is immutable; a new item is v5.
2. Judge config is a file: model id, prompt hash, temperature 0.
3. A runner takes `(system, model_id)` and writes a signed report.
4. CI refuses a compare if set hash or judge hash differ.
5. A 40-item human sample is re-labelled each quarter to catch judge drift.

Example: LoRA v3 vs prompted baseline. Someone used a "nicer" judge prompt on v3. Scores jumped. You revert the judge file, re-run both, and the gain is +0.8 with overlapping intervals. The honest report is "no ship". The dishonest one already went to Slack.""",
        fails="""1. **Set creep.** Easy items added to help the tune.

2. **Teacher as judge.** Distilled student looks perfect.

3. **Different decoding.** Tune ran greedy; baseline ran temperature 0.7.

4. **Unpinned judge.** The platform updated it; both scores moved and you blamed the model.""",
        line="I compare every candidate on one frozen set with one pinned judge and one decoding. If those hashes differ, I do not discuss the delta. I will not let a model grade its own children.",
        kps=[
            "Same set, judge, judge prompt, decoding, scoring rules.",
            "The held-out set is immutable; additions bump the version.",
            "Pin the judge; calibrate on humans.",
            "Ban self-judging and teacher-judging.",
            "Report variance on small or noisy sets.",
            "CI should refuse a compare with mismatched hashes.",
        ],
        qs=[
            {"q": "What must stay constant when comparing baseline and tune?", "a": "Held-out set, judge model and prompt, decoding, and scoring rules.", "kind": "recall"},
            {"q": "The judge is the model that wrote the training targets. Issue?", "a": "Self-preference inflates the student. Use a different judge calibrated on human labels.", "kind": "debug"},
            {"q": "A compare ticket has two different set hashes. What do you do?", "a": "Refuse the compare. Re-run both on one hash or you are looking at two exams.", "kind": "apply"},
            {"q": "Why randomise pairwise order?", "a": "Position bias: judges prefer the first or the longer answer. Swap A/B.", "kind": "recall"},
            {"q": "n=80, +2 points. Ship?", "a": "Not on the mean alone. Check the interval and the critical slice. You likely need more items or a pre-registered threshold that this does not meet.", "kind": "apply"},
        ],
        links=[HF_EVAL, OA_FT],
    ),
    "beyond-a-single-score": note(
        what="""One aggregate number hides the decision. Report **slices** (category, language, length, tool-use, the original failure mode), the **tail** (share of catastrophic misses), **intervals** on small n, and **several metrics** (accuracy, schema validity, refusal, verbosity, latency, cost). Weight errors by severity when a payments miss is not equal to a chitchat miss.

Example: overall +3, payments −8. The mean would ship a harmful model. The slice blocks it.

Also look at consistency across repeated draws. A tune that is +4 once and −1 the next two times is not +4.""",
        why="""On the job, leadership reads the headline. Your job is to put the slice table on the same page. Interviews will give you a +2 overall and a nasty slice and ask what you do. The answer is not "ship, it is positive".

This is also how you catch eval bugs: one slice of "failures" that are actually judge errors.""",
        how="""A one-page report:

- Headline metric with interval.
- Table: slice × (baseline, tune, delta).
- Catastrophic rate (wrong money, wrong medical, invalid JSON).
- Latency p95 and cost per success.
- Decision line that cites the worst slice, not only the mean.

Example: 600 held-out tickets. Overall 90.1 vs 88.0. Payments (n=70) 82 vs 91. Invalid JSON 0.3% vs 0.1%. You do not ship. You add payments examples or you keep the prompted model on that route. The mean was a trap.""",
        fails="""1. **Mean-only Slack message.**

2. **Tiny slice treated as gospel.** n=12 flipped a decision.

3. **Equal weights.** A refund error counted like a greeting.

4. **No tail.** Average up, 2% of answers now invent account numbers.""",
        line="I never ship on a mean. I bring slices, tails, intervals, and cost. A +3 that hides an −8 on payments is a no, not a headline.",
        kps=[
            "Slices: language, length, tools, original failure mode.",
            "Report tails and catastrophic rates, not only the average.",
            "Intervals on small n; do not over-read +2 at n=100.",
            "Weight errors by severity.",
            "Put the worst slice on the decision line.",
            "Repeat noisy metrics; a one-off +4 is not a result.",
        ],
        qs=[
            {"q": "Why report slices as well as the average?", "a": "A good mean can hide a drop on a critical category. Slices expose it.", "kind": "recall"},
            {"q": "Tune is +2 on 100 examples. Ship?", "a": "Not from the mean. Check the interval, the critical slice and tails. You may need more items.", "kind": "apply"},
            {"q": "Overall +3, payments −8. Decision?", "a": "Block. Route payments to the baseline or fix data; do not average away money errors.", "kind": "debug"},
            {"q": "What is a catastrophic rate here?", "a": "The share of answers that violate a hard rule: wrong amount, leaked secret, invalid schema, unsafe advice.", "kind": "recall"},
            {"q": "A slice has n=12 and a huge delta. What do you do?", "a": "Collect more items in that slice before you decide. Twelve rows are a clue, not a gate.", "kind": "apply"},
        ],
        links=[HF_EVAL],
    ),
    "regressions-outside-the-task": note(
        what="""A tune can break things you did not train for. Keep a **regression suite**: general instruction following, safety and refusals, other languages, long context, tool calling, and a few neighbouring formats. Run it on the base and the tune. Gate on it: a small drop on general tasks may be tolerable; a safety drop is not.

Forgetting is the usual shape: the model becomes a brilliant ticket router and a worse assistant. Injection susceptibility can also rise. Formats the tune never saw start to drift.

If a gate fails: lower LR or rank, mix general and safety data, early-stop, or refuse to replace the general model with a specialist on every route.""",
        why="""On the job the tuned model often becomes the default. Users will hit untested paths. Interviews will ask how you catch forgetting and safety drift. "We looked at the task metric" is the junior miss.

A specialist that is only called for one task still needs a safety probe. People type weird things into every box.""",
        how="""Suite construction:

1. 50–100 general instructions you already like the base on.
2. A refusal/injection pack you do not train on.
3. One other language and one long-context file if those appear in prod.
4. Tool-call items if the app uses tools.
5. Gates in the ADR: e.g. ≤2-point drop on general, 0 worsening on the safety pack.

Example: LoRA for JSON labels. Task +7. Refusal pack: the base refused a jailbreak; the tune complied. You mix 200 safety pairs, drop rank, re-run. Safety holds, task still +6. Now you can talk about shipping. Without the pack you would have shipped a more jailbreakable router.""",
        fails="""1. **Task-only eval.**

2. **Training on the safety pack** so the gate is circular.

3. **Replacing the general model everywhere** with a specialist.

4. **Ignoring a small safety miss** because the mean task score is pretty.""",
        line="I run a regression suite the tune never trained on: general skill, refusals, tools, other languages. A task win that fails safety does not ship. Sometimes the fix is not more task data — it is a lower rank or a narrower route.",
        kps=[
            "Keep a regression suite off the training distribution.",
            "Compare tune to base on general, safety and tools.",
            "Safety regressions block; small general drops may be negotiable.",
            "Do not train on the gate set.",
            "A specialist should not silently become the default model.",
            "Mitigate with LR/rank, mix-in data, or routing — not hope.",
        ],
        qs=[
            {"q": "What belongs in a regression suite for a tune?", "a": "General instructions, safety/refusals, multilingual and long-context items, tool use, and neighbouring formats, run on base and tune.", "kind": "recall"},
            {"q": "Task accuracy is up but the model now follows injected instructions. Action?", "a": "Treat as a safety block. Add adversarial mix-in or lower rank, and do not release until the pack passes.", "kind": "debug"},
            {"q": "Why not train on the regression suite?", "a": "Then the gate is no longer an unseen check. You have hidden forgetting rather than measured it.", "kind": "recall"},
            {"q": "The specialist is excellent. Should it serve every chat?", "a": "No. Route it to the task. A forgotten general model is a product regression even if the suite was only a little down.", "kind": "apply"},
            {"q": "Which mitigations do you try when forgetting appears?", "a": "Lower learning rate or rank, mix general/safety data, earlier checkpoint, or narrower routing. Do not just train longer on the task.", "kind": "apply"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
    "reading-individual-failures": note(
        what="""Metrics say how much; **reading failures** says why. Sample 30–100 misses and tag them: label noise, judge error, ambiguous spec, missing coverage, template bug, capability limit. Each tag has a different next action. Training more on a noisy label wastes a GPU. Tweaking LR on a spec hole wastes a week.

Keep a failure log with counts per tag across runs. That log is the backlog. Interviewers who have tuned will ask what the misses looked like. Have two examples, not a vibe.""",
        why="""On the job this is how you stop random hyperparameter search. In interviews it separates people who watched loss curves from people who opened the outputs.

A surprising share of "tune failures" are eval bugs. Reading is how you find them before you celebrate or despair.""",
        how="""Weekly loop:

1. Dump 80 misses (and 20 lucky hits) with inputs, outputs, expected, judge rationale.
2. Two people tag independently; discuss disagreements (that is spec work).
3. Tally. If ≥30% are judge or label errors, fix the eval and rescore **both** systems before you touch weights.
4. If coverage: write 50 new gold examples of that shape.
5. If capability: consider a bigger base, RAG, or accept.

Example: 40% of "wrong" routing labels are actually outdated gold — the taxonomy changed. You relabel, rescore, and the tune's "gain" shrinks to +1. You just saved a pointless rank sweep.""",
        fails="""1. **Only reading the worst 5.** They are not the distribution.

2. **One tagger.** Their theory becomes the dataset.

3. **Fixing the tune when the eval is wrong.**

4. **No log.** Next month you rediscover the same three bugs.""",
        line="I read a sample of misses and tag causes before I change rank or data. If the eval is dirty I fix it and rescore both sides. The failure log is the plan; the loss curve is not.",
        kps=[
            "Sample misses; tag cause; act by tag.",
            "Judge and label errors: fix eval, rescore both.",
            "Coverage gaps: targeted gold, not a higher LR.",
            "Two taggers expose spec holes.",
            "Keep a counted failure log across runs.",
            "Be ready to describe two real misses in an interview.",
        ],
        qs=[
            {"q": "Why read failures by hand?", "a": "To separate eval bugs, spec holes, coverage gaps and true capability limits — which metrics cannot name.", "kind": "recall"},
            {"q": "40% of failures are actually correct. Now what?", "a": "Fix labels or the judge, rescore baseline and tune, then decide. Do not train against a dirty exam.", "kind": "debug"},
            {"q": "What is the next step for a coverage-gap tag?", "a": "Write targeted gold examples of that shape, version the set, retrain or re-prompt, and re-eval.", "kind": "apply"},
            {"q": "Why use two taggers?", "a": "Disagreement is usually an ambiguous spec. One person will silently pick a side and bake it into the data.", "kind": "recall"},
            {"q": "You only opened the five ugliest outputs. Risk?", "a": "Those are not the miss distribution. You will fix a rare horror and miss the common tag that actually moves the metric.", "kind": "debug"},
        ],
        links=[HF_EVAL],
    ),
    "simpler-alternatives-one-last-time": note(
        what="""After you learn from the failures, **re-run the cheap path** with that knowledge: a better prompt, better few-shots, retrieval, constrained decoding, a router that sends hard cases to a giant, or a newer base. Sunk cost will tell you to ship the tune because you already trained. Discipline says the tune must still beat the *new* cheap system on the same set, after maintenance cost.

A 1.5-point win that needs a retrain every quarter usually loses to a prompt. A 1.5-point win that also cuts tokens 5× might still ship. Write both numbers.""",
        why="""On the job this is the last chance to avoid a pet model. In interviews, admitting you killed a tune is a seniority signal. "We always ship what we train" is the opposite.

Failure analysis is prompt research in disguise. Use it twice.""",
        how="""Last-week checklist:

1. Take the top three failure tags.
2. Spend a day on prompt/retrieval/schema aimed at those tags.
3. Re-score that improved baseline.
4. Compare tune vs improved baseline on quality, cost, latency, maintenance.
5. Decide. If you still ship the tune, say why the cheap path lost.

Example: the tune fixed format drift. A JSON schema on the baseline now does the same. Quality ties; the tune has a retrain tax. You keep the schema and archive the adapter. The week of training was tuition, not a product.""",
        fails="""1. **Sunk-cost ship.**

2. **Not giving the baseline the same insights.**

3. **Ignoring maintenance.** +2 points, two retrains a year, one engineer.

4. **A new base you did not re-prompt.** The cheap path was never given a chance on the new id.""",
        line="Before I ship a tune I re-run the best cheap system with everything I learned. If the gap is small and the retrain tax is real, I keep the prompt. Killing a tune is a valid outcome.",
        kps=[
            "Re-apply failure insights to the prompt/RAG path.",
            "Compare against the improved baseline, not the old one.",
            "Weigh gain against retrain and serving cost.",
            "Sunk cost is not a reason to ship.",
            "A schema or a new base can erase a tune's reason to exist.",
            "Write why the cheap path lost if you still ship weights.",
        ],
        qs=[
            {"q": "Why revisit simple alternatives after a tune?", "a": "Failure analysis often yields prompt or retrieval fixes that close the gap, and the tune must still justify its maintenance.", "kind": "recall"},
            {"q": "The tune is +1.5 over the improved prompt. Decision?", "a": "Usually do not ship unless cost or latency gains pay for retrains. A small quality edge is not enough.", "kind": "apply"},
            {"q": "A schema constraint now matches the tune on format. What do you do?", "a": "Archive the adapter if format was the residual error. Keep the schema. Do not serve weights you no longer need.", "kind": "debug"},
            {"q": "What sentence belongs in the ADR if you still ship?", "a": "Why the improved cheap path lost, with numbers, and when you will re-check it.", "kind": "apply"},
            {"q": "A newer base arrives during the project. Last step?", "a": "Prompt it well and score it. It may retire both the old baseline and the tune.", "kind": "recall"},
        ],
        links=[OA_FT],
    ),
    "writing-the-decision-down": note(
        what="""A **fine-tune decision record** is a page: problem, baselines, method, base and dataset versions, eval design, results with slices, regressions, cost to train and serve, risks, decision, rollback, and **what would change the decision**. Link run ids. Two pages maximum or nobody will read it.

This is how a later engineer retrains when the base dies, how an auditor sees why a custom model exists, and how you stop folklore ("we tuned because quality was bad") from replacing numbers.

A model in production that nobody can reproduce is an incident that has not happened yet.""",
        why="""On the job, people leave. The adapter remains. The record is the difference between a 2-day retrain and a 6-week archaeology. Interviews will ask you to "write the decision down" as the last Level 13 habit. Treat it like an ADR, not like a blog.""",
        how="""Template headings:

1. Residual failure and why cheaper rungs lost.
2. Data: version, n, licence, PII check.
3. Recipe: base revision, PEFT, LR, steps, template hash.
4. Eval: set hash, judge hash, slices, intervals.
5. Regressions and safety pack.
6. Serve cost vs baseline.
7. Decision + revisit triggers (new base, drift, spec change).
8. Rollback alias.

Example: you ship LoRA v4 for routing. Six months later the base is deprecated. A new hire follows the page, retrains, hits the same gates, flips the alias. Without the page they would start from a Slack thread and a missing dataset.""",
        fails="""1. **A notebook as the record.** It does not open next year.

2. **No revisit triggers.** The tune lives forever without a question.

3. **Missing hashes.** You cannot reproduce.

4. **A novel.** If it is 12 pages it will not be updated.""",
        line="I write a one-page decision: failure, data, recipe, eval, regressions, cost, rollback, and what would change my mind. The adapter is not the asset; the page plus the dataset is.",
        kps=[
            "Page: problem, baselines, versions, results, regressions, cost, decision.",
            "Include rollback and revisit triggers.",
            "Link dataset hash, run id, template hash.",
            "Keep it short enough to update.",
            "This is what makes a retrain possible after the base dies.",
            "A notebook is not a decision record.",
        ],
        qs=[
            {"q": "What should a tuning decision record contain?", "a": "Problem, baselines, method, versions, eval design, slices, regressions, cost, risks, decision, rollback and revisit triggers.", "kind": "recall"},
            {"q": "Why include 'what would change the decision'?", "a": "It sets triggers — new base, volume, drift, spec — so the tune is not immortal by default.", "kind": "apply"},
            {"q": "The only write-up is a training notebook. Risk?", "a": "It will not run, it has no hashes, and a new hire cannot retrain. Promote the facts to a page with links.", "kind": "debug"},
            {"q": "Which hashes belong on the page?", "a": "Dataset, eval set, judge config, template, base revision, and the training run.", "kind": "recall"},
            {"q": "Who is the page for besides you?", "a": "The person who retrains after you leave, the auditor, and future-you during a deprecation.", "kind": "apply"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
    "slice-metrics-not-only-mean": note(
        what="""**Slice metrics** break the score by language, length, tool-use and the original failure mode — the cuts that can hide a regression. You choose slices from how the product fails, not from a default dashboard. A mean is a convenience; a slice is a decision.

Pre-register the slices in the eval spec so you cannot invent a flattering cut after the run. Report n per slice. A beautiful delta on n=9 is a hint.

When a slice is the reason you tuned (tone on angry tickets, JSON on long inputs), that slice is a **gate**, not a decoration.""",
        why="""On the job, means get screenshotted; slices get ignored unless you make them the headline. Interviews will hand you a mean and wait to see if you ask for slices. Ask.

This is the same habit as Level 7, applied to a tune that is trying to look like a single win.""",
        how="""1. List slices in the eval spec: language, token bucket, tool/no-tool, original failure tag.
2. Require n ≥ a floor (illustrative: 40) before a slice can gate; otherwise it is exploratory.
3. Put the original-failure slice on the decision line.
4. Watch for Simpson: every slice flat, mean up because mix shifted.

Example: you tuned for terse tone. Overall +1. The "angry, long" slice — the reason you started — is −4. You do not ship. You add 80 gold replies of that shape. The mean was never the question.""",
        fails="""1. **Slices after the fact** to find a win.

2. **Gating on n=10.**

3. **Omitting the failure mode you tuned for.**

4. **Mix shift.** New traffic is easier; the mean lies.""",
        line="I pre-register slices — language, length, tools, the original failure — and I gate on the slice I came to fix. A mean is not a decision. Small-n slices are clues, not gates.",
        kps=[
            "Cut by language, length, tools and the original failure mode.",
            "Pre-register slices; do not hunt after the run.",
            "Report n; small slices are exploratory.",
            "The slice you tuned for is a gate.",
            "Watch mix shift that moves the mean without moving slices.",
            "Put the worst material slice on the decision line.",
        ],
        qs=[
            {"q": "Which slices should a fine-tune report include?", "a": "At least language, length, tool-use and the original failure mode, with n and a pre-registered gate on the one you tuned for.", "kind": "recall"},
            {"q": "Overall +1, original-failure slice −4. Ship?", "a": "No. That slice was the reason to train. Fix data or routing first.", "kind": "apply"},
            {"q": "A new slice appears after you saw the scores. Problem?", "a": "Post-hoc cutting. You can explore it, but you cannot use it as the official win without a new pre-registered eval version.", "kind": "debug"},
            {"q": "Why report n per slice?", "a": "So you do not gate on nine rows. Below the floor, treat the number as a hint and collect more.", "kind": "recall"},
            {"q": "Mean up, every slice flat. What might be true?", "a": "The traffic mix got easier (Simpson). Check slice weights versus last month.", "kind": "debug"},
        ],
        links=[HF_EVAL],
    ),
    "safety-and-format-probes": note(
        what="""Re-run **refusal** and **schema** probes after every tune, even when the task looks unrelated. Preference and SFT both move the model; they can soften refusals, invent fields, drop end-of-turn, or start matching a jailbreak it used to ignore. A routing LoRA is not exempt.

Probes are small, frozen, and never trained on. Safety: must-refuse and must-answer items. Format: valid JSON, required keys, no extra keys, stop tokens. Fail the run if either pack regresses past the written gate.

This is cheaper than a user finding it, and cheaper than an auditor asking why you never checked.""",
        why="""On the job, "it's just labels" is how a helpful-to-a-fault model ships. In interviews, saying you re-run safety and schema after an unrelated tune is a crisp senior habit.

Format probes also catch template mismatch: the notebook was fine, serving invented a second JSON wrapper.""",
        how="""1. Keep `probes/safety_v2.jsonl` and `probes/schema_v2.jsonl` next to the task eval.
2. Runner always executes all three.
3. Gates: 0 worsening on must-refuse; schema validity ≥ baseline.
4. On fail: inspect template first, then rank/LR, then mix-in.

Example: a tone LoRA. Task eval is up. Schema probe: 7% of outputs add a commentary line before the JSON. Serving would break the parser. You add a stop rule and 40 clean examples, re-run. Safety pack still clean. Now the tone win is real.""",
        fails="""1. **"Unrelated task" skip.**

2. **Training on the probe set.**

3. **Only testing in the notebook**, not through the serve template.

4. **Softening refusals** to raise a helpfulness score and not noticing.""",
        line="Every tune re-runs frozen safety and schema probes, including tunes that are 'just tone' or 'just labels'. A task win that breaks JSON or a refusal does not ship.",
        kps=[
            "Safety and schema probes run after every tune.",
            "Never train on the probe sets.",
            "Run them through the serving template, not only the trainer.",
            "0 worsening on must-refuse is a typical hard gate.",
            "Format drift is often a template or EOS issue.",
            "Unrelated tasks are not exempt.",
        ],
        qs=[
            {"q": "Why re-run refusal tests after a tone-only LoRA?", "a": "SFT and DPO move global behaviour. Helpfulness pressure can soften refusals even when you never trained on unsafe items.", "kind": "recall"},
            {"q": "Schema probe fails only on the server, not in the trainer. First check?", "a": "Chat template, stop tokens and any gateway wrapper. Then compare greedy outputs token-for-token.", "kind": "debug"},
            {"q": "May you add failing probe items to the training set?", "a": "You may add *similar* gold items. Keep the probe set itself held out or the gate becomes circular.", "kind": "apply"},
            {"q": "What is a reasonable safety gate?", "a": "No increase in must-refuse misses versus the base, on a frozen pack, before any task metric can ship.", "kind": "recall"},
            {"q": "A helpfulness judge loves the tune; the refusal pack drops. Decision?", "a": "Block. Do not trade a judge point for a refusal miss. Mix safety data or lower the preference pressure.", "kind": "apply"},
        ],
        links=[OA_FT, HF_EVAL],
    ),
    "cost-normalized-quality": note(
        what="""Report **quality per dollar** and **quality per second**, not quality alone. A tune that matches a frontier model at 1/10 the unit cost can win with a slightly lower score. A tune that ties quality and doubles p95 or needs a dedicated GPU at 5% utilisation can lose.

Compute **cost per successful task** (retries, invalid JSON, human escalations included). Use p95, not average latency. Include hosting idle if you reserved hardware. Illustrative numbers only; re-check current prices.

A quality-only ADR is how you ship a slower, dearer specialist.""",
        why="""On the job, GPUs and tokens are the visible bill; quality is the visible chart. Interviews want you to put them on one axis. "We improved 2 points" without cost is incomplete. "We held quality and cut cost 8×" is a product sentence.

This is also how distillation and small LoRAs justify themselves when they are slightly worse.""",
        how="""Table every candidate:

| | Score | p95 | $ / 1k successes | GPU idle? |
| Prompted frontier | 91 | 1.8s | 12.00 | no |
| Prompted 8B | 86 | 0.4s | 1.10 | no |
| LoRA 3B | 90 | 0.3s | 0.80 | yes, 40% util |

You ship the LoRA if utilisation stays honest; you do not if nights are empty and the $0.80 becomes $4. You might also route easy traffic to the 8B and hard traffic to the frontier.

Recompute at 10× volume; reserved capacity may then win.""",
        fails="""1. **Quality-only slide.**

2. **Per-call cost** ignoring retries and invalids.

3. **Average latency** hiding a terrible p95.

4. **Ignoring idle** on a reserved GPU.""",
        line="I report quality per dollar and per second, using cost per successful task and p95, including idle. A slightly worse cheap model can win; a tied specialist on an empty GPU can lose.",
        kps=[
            "Normalise quality by dollar and by second.",
            "Use cost per successful task, not per call.",
            "Quote p95, not the mean latency.",
            "Include reserved-GPU idle in the unit cost.",
            "A small quality drop can be a win at 10× cheaper.",
            "Recompute at 10× volume; the winner can flip.",
        ],
        qs=[
            {"q": "Why not report quality alone for a tune?", "a": "Serving cost and latency can erase the gain. Decision-makers need quality per dollar and per second.", "kind": "recall"},
            {"q": "The LoRA ties the frontier but sits on an idle GPU. Risk?", "a": "Unit cost includes idle. At low utilisation the API frontier may still be cheaper. Measure utilisation or use a host that scales to zero.", "kind": "debug"},
            {"q": "Which latency number do you put on the scorecard?", "a": "p95 (and TTFT if streaming), at production token lengths — not the mean of a lab batch.", "kind": "apply"},
            {"q": "A cheaper model retries twice as often. What metric catches that?", "a": "Cost per successful task, which folds retries and invalid outputs into the denominator.", "kind": "recall"},
            {"q": "When can a slightly worse student still ship?", "a": "When quality stays above the gate and cost or latency drops enough to pay for data and retrains.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "kill-criteria-in-writing": note(
        what="""**Kill criteria** are the regressions that reject the tune **before you see the numbers**: safety pack worsening, critical-slice drop beyond X, schema validity below baseline, forgetting past a threshold, cost above the prompted option, eval-set leakage, or a missing reproducibility file. You write them in the ADR with the ship threshold.

Without kill criteria, every ugly number becomes a story. With them, a run can simply fail. That is a feature.

Kill criteria are not optional stretch goals. If you later waive one, you write a new ADR; you do not quietly ignore the line.""",
        why="""On the job this protects you from sunk cost and from a VP who saw a pretty mean. In interviews, pre-committing the reject rules is the same discipline as pre-registering slices. It reads as scientific rather than theatrical.

It also speeds training: a run that trips a kill stops; you do not "just try one more epoch".""",
        how="""Example block in the ADR (illustrative):

- Safety must-refuse: no increase vs base.
- Payments slice: ≥ −1 point vs prompted baseline.
- Schema validity: ≥ baseline.
- General probe: ≥ −2 points.
- $ / 1k successes: ≤ 0.3× frontier.
- Missing dataset hash or template: automatic kill.

A run hits +6 overall and −5 on payments. It is dead on arrival. You do not schedule a "review". You add data or you stop.

Waivers require the same people who signed the ADR, in writing.""",
        fails="""1. **Criteria after the run.**

2. **Soft language** ("we will consider safety").

3. **Waiving in Slack.**

4. **So many kills that no run can pass** — then you are avoiding a decision.""",
        line="I write kill criteria with the ship threshold, before any loss curve. Safety, critical slices, schema, forgetting, cost and missing hashes can reject a pretty mean. Waivers are a new ADR, not a Slack shrug.",
        kps=[
            "Pre-commit the regressions that reject the tune.",
            "Safety, critical slice, schema, forgetting, cost, missing hashes.",
            "Write them next to the ship threshold.",
            "A tripped kill stops the run; it does not start a debate.",
            "Waivers need a new signed record.",
            "Too many kills is avoidance; too few is theatre.",
        ],
        qs=[
            {"q": "What are kill criteria in a fine-tune project?", "a": "Pre-written regression rules that reject the tune regardless of the headline metric — safety, slices, schema, forgetting, cost, missing artefacts.", "kind": "recall"},
            {"q": "Overall +6, payments −5, payments was a kill. What happens?", "a": "The run is rejected. You do not 'review' it into a ship. Fix data or stop.", "kind": "apply"},
            {"q": "Why write kills before you train?", "a": "So an ugly number cannot be story-told into a pass, and so you can stop a bad run early.", "kind": "recall"},
            {"q": "A VP wants to waive a safety kill in Slack. Response?", "a": "A waiver is a new signed ADR, not a chat message. The original signers must accept the new risk in writing.", "kind": "debug"},
            {"q": "Name two automatic kills that are not quality scores.", "a": "Missing dataset or template hash, and a cost-per-success above the prompted option you already run.", "kind": "apply"},
        ],
        links=[OA_FT, HF_EVAL],
    ),
}
