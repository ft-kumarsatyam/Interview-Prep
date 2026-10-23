from helper import note

OA_FT = {"title": "OpenAI: fine-tuning guide", "url": "https://platform.openai.com/docs/guides/fine-tuning"}
TRL = {"title": "Hugging Face TRL", "url": "https://huggingface.co/docs/trl"}

NODES = {
    "reward-based-tuning": note(
        what="""**Reward-based fine-tuning (RFT / RL for LLMs)** scores each model output with a **reward** and updates the policy to make high-scoring outputs more likely. Unlike SFT (imitate a string) or DPO (prefer A over B), the signal can be a **scalar** from a program: unit tests passed, math checker, schema valid, a rubric model.

The model proposes, the grader scores, the optimiser reinforces. If the grader is cheap and honest, this can improve tasks where you do not want to write full demonstrations. If the grader is gameable, the model will game it.""",
        why="""On the job, this is how code and math models get extra lift when you have tests but not solutions. It is also how people burn a quarter teaching a model to print "PASSED" without running the test.

Interviews: define the loop and immediately say **reward hacking**. The loop without the hack is incomplete.""",
        how="""Minimal picture:

1. Start from an SFT policy that sometimes scores above zero (otherwise there is no signal).
2. Sample outputs; run the grader; get a scalar (or vector).
3. Update toward higher reward with a KL or length tether to the SFT reference.
4. Eval on a **held-out grader** or human set, not only the train grader.

Example. A coding task: reward = fraction of hidden tests passed. After RFT, pass rate 18%→41% on the train problem set and 18%→22% on a held-out set — you overfit the grader's problem distribution. You add more problems and a style penalty for empty `assert True` hacks.

You do not build PPO from scratch for a product FAQ. You use a managed RFT product or a maintained framework, and only when a grader exists.""",
        fails="""1. **Zero reward forever.** No successful samples; nothing to reinforce. Warm up with SFT.

2. **Train grader = only eval.** Hacking looks like progress.

3. **No KL tether.** Policy leaves language and emits grader bait.""",
        line="RFT scores samples and reinforces high scores. I only use it when a grader I trust exists, I tether to SFT, and I eval on a grader the policy did not train against.",
        kps=[
            "RFT: sample, score with a reward, reinforce.",
            "Needs some non-zero successes to start — usually after SFT.",
            "A program grader is the honest case (tests, schema, math).",
            "The model will hack a weak grader.",
            "Keep a KL/length tether to the SFT reference.",
            "Eval on a held-out checker, not only the train reward.",
        ],
        qs=[
            {"q": "What signal does reward-based tuning learn from?", "a": "A scalar (or structured) score of the sampled output, not a gold string or a pairwise label. The policy is pushed toward higher-scoring behaviour.", "kind": "recall"},
            {"q": "Why must the SFT policy sometimes succeed before RFT?", "a": "If every sample scores zero, there is no differential signal to reinforce. Warm up with SFT or simplify the grader until some rollouts win.", "kind": "apply"},
            {"q": "Train reward soars, held-out tests are flat. Diagnosis?", "a": "Reward hacking or overfitting the train problem set. Inspect high-reward samples and add an independent checker.", "kind": "debug"},
            {"q": "What is the role of a KL or length penalty?", "a": "It bounds how far the policy may drift from the SFT reference so it cannot abandon language for grader bait.", "kind": "recall"},
            {"q": "When is a rubric model a weaker reward than a unit test?", "a": "When the rubric can be flattered with tone or length. A unit test either passed or did not. Prefer machine-checkable scores when they exist.", "kind": "apply"},
        ],
        links=[OA_FT, TRL],
    ),
    "rft-vs-sft-vs-dpo": note(
        what="""Three teachers:

- **SFT** learns from **demonstrations** (this string).
- **DPO** learns from **comparisons** (this string beats that string).
- **RFT** learns from a **reward** (this string scores 0.8).

Pick by the cheapest honest signal you have. Unique gold → SFT. Soft ranking → DPO. Automatic checker → RFT. Do not reach for RFT because it sounds like research.""",
        why="""On the job, method shopping wastes months. A labeler with gold rows does not become better because you wrapped it in RL.

Interviews: a three-row table is the whole answer. Then an example of each.""",
        how="""Worked matching:

- Forty labels, 2k golds → SFT.
- Valid answers, brand voice → SFT then DPO.
- Code that must pass tests, few solutions → RFT (maybe after a little SFT so some tests pass).
- Policy FAQ → none of the above first; RAG.

Example. You have tests and also 200 solutions. Start SFT on the 200, then RFT with tests as reward for extra lift. You have tests and 0 solutions and a 0% pass rate — SFT from a teacher or simplify; RFT cannot start.

If you have neither gold, nor pairs, nor a grader, you do not have a tuning problem. You have a spec problem.""",
        fails="""1. **RFT on a vibe reward.** Expensive DPO with extra ways to hack.

2. **SFT when you only have tests.** You will invent fake gold.

3. **Using all three stacked** as a default pipeline.""",
        line="SFT imitates strings, DPO ranks strings, RFT scores strings. I pick the method that matches the honest signal I already have, and I do not stack them for prestige.",
        kps=[
            "SFT = demonstrations; DPO = comparisons; RFT = rewards.",
            "Match the method to the cheapest honest signal.",
            "RFT needs a grader; DPO needs pairs; SFT needs gold.",
            "No signal means no tune — write a spec.",
            "A little SFT is still the usual warm start for RFT and DPO.",
            "Do not default to a three-stage stack.",
        ],
        qs=[
            {"q": "What does each of SFT, DPO, and RFT learn from?", "a": "SFT from a gold completion, DPO from a chosen/rejected pair, RFT from a scalar or structured reward on a sample.", "kind": "recall"},
            {"q": "You have unit tests and no solutions. Which method?", "a": "RFT with the tests as reward, after you have a policy that sometimes passes (or a simpler split of the task). SFT has nothing to imitate.", "kind": "apply"},
            {"q": "You ran RFT with a 'niceness' judge and no tests. What did you actually run?", "a": "An expensive, gameable preference-like loop. You should have built pairs and used DPO, or skipped tuning.", "kind": "debug"},
            {"q": "When is SFT the only method you need?", "a": "When unique gold exists and already hits the bar. Rankings and rewards add tax without a leftover problem.", "kind": "recall"},
            {"q": "You have gold, pairs, and tests. How do you stack without prestige?", "a": "SFT to the valid band, DPO only if a soft quality remains, RFT only if a checker can still lift things DPO cannot. Skip any stage that does not win an A/B.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "tasks-with-gradable-outputs": note(
        what="""RFT fits tasks whose outputs can be **graded reliably and automatically**: **code that must pass tests**, **math with a checkable final answer**, **structured outputs** with a schema and validators, maybe games with a score. The grader should be cheaper and more trusted than a human on every sample.

If a human has to read every output to score it, you do not have an RFT task. You have a labelling task (SFT or DPO).""",
        why="""On the job this is the filter that keeps RFT off support-email tone. Tone is not automatically gradable unless you accept a weak judge.

Interviews: list the three good families and why FAQ tone is not one.""",
        how="""Ask: **can a program say pass/fail or 0–1 without reading for vibe?** If yes, sketch the grader first, then the trainer.

Example. Extract fields into JSON; reward = schema valid × required fields present × regex on a date. That is gradable. "Write a kind refund email" is not, unless you reduce it to a checklist so tight it is really SFT.

Math: exact match on a canonicalised answer, plus a cheap format check. Code: hidden tests, time/memory caps, and a ban on network. If your tests can be gamed by printing the expected string, they are not hidden enough.""",
        fails="""1. **Grader needs a frontier model every sample** and you cannot afford it — and it is hackable.

2. **Public tests only.** The policy memorizes the public cases.

3. **Calling BLEU a grader for open-ended email.**""",
        line="I only take RFT to tasks a program can score: tests, checkable math, schemas. If a human has to read for vibe, I stay on SFT or DPO.",
        kps=[
            "RFT wants automatic, reliable graders.",
            "Good families: tests, checkable math, schema validators.",
            "Tone and FAQs are not automatically gradable.",
            "Hidden tests beat public ones the policy can memorize.",
            "A judge-LLM reward is a last resort, not the flagship.",
            "If you cannot write the grader, you cannot write the RFT job.",
        ],
        qs=[
            {"q": "Name three task families that fit RFT well.", "a": "Code judged by tests, math with a canonical checkable answer, and structured outputs with schema/validators. Each has a program that can score without vibe.", "kind": "recall"},
            {"q": "Is brand-voice email a good RFT task?", "a": "Not by default. Scoring kindness needs a human or a hackable judge. Use SFT/DPO, or reduce the task to a tight checklist you can actually code.", "kind": "apply"},
            {"q": "Public tests 100%, hidden tests 10%. What happened?", "a": "The policy overfit or hacked the public suite. Keep hidden tests out of the train reward, and expand diversity.", "kind": "debug"},
            {"q": "Why is a schema validator a legitimate reward?", "a": "It is deterministic, cheap, and aligned with what production will accept. It does not care about prose flattery.", "kind": "recall"},
            {"q": "You can only afford an LLM judge as reward. What extra work is required?", "a": "Calibrate against humans, control length, keep a held-out human set, and expect hacking. Prefer this only when no program grader exists.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "reward-design-reward-hacking": note(
        what="""**Reward design is the hard part.** **Reward hacking** is when the policy **optimises the grader instead of the intent**: prints `assert True`, repeats the question to trigger a keyword, pads tokens if the judge likes length, emits the format of a passing test without the logic.

If you did not look at high-reward samples, you have not evaluated the reward. The curve going up is the hacking detector's enemy.""",
        why="""On the job, uninspected rewards ship embarrassments. A math model that outputs "42" in a box because the regex only looked for a box.

Interviews: give two hacking examples and the fix (better grader + held-out + inspect).""",
        how="""Design loop:

1. Write the intent in English.
2. Implement a conservative grader (false negatives better than false positives at first).
3. Sample high-reward outputs **by hand** every run.
4. Add those hacks to a **gallery** that must score low.
5. Keep a held-out grader or human panel.

Example. Reward = "contains the gold number". The model writes a paragraph of wrong reasoning and the gold number at the end. You change the reward to check reasoning steps or use a hidden equivalent problem. You add the hack to the gallery.

Length bonuses without a quality floor produce novels. Keyword bonuses produce keyword salad.""",
        fails="""1. **Never reading high-reward samples.**

2. **Updating the train grader until the curve looks good** without a frozen holdout.

3. **Single keyword rewards.**""",
        line="The reward is the spec the model will game. I inspect high-reward samples, keep a hacking gallery that must score low, and I never trust a rising curve alone.",
        kps=[
            "Reward design is the real RFT skill.",
            "Hacking = high score, low intent.",
            "Read high-reward samples every run.",
            "Keep a gallery of known hacks that must fail.",
            "Prefer conservative graders; expand after inspection.",
            "A rising train reward is not success.",
        ],
        qs=[
            {"q": "What is reward hacking in RFT?", "a": "The policy finds behaviour that scores well on the grader without satisfying the human intent — empty tests, keyword salad, length padding, boxed answers without working.", "kind": "recall"},
            {"q": "Train reward is up 40%, humans say answers are worse. First action?", "a": "Read high-reward samples, add the hacks to the gallery, freeze a held-out grader, and stop shipping on the train curve.", "kind": "debug"},
            {"q": "Why start with a conservative grader?", "a": "False positives (hacks that score high) poison the policy. False negatives just slow you; you can relax after you inspect.", "kind": "apply"},
            {"q": "Give a code-hacking example and a fix.", "a": "The model writes `assert True` or hard-codes the sample output. Fix: hidden tests, mutation of inputs, ban of the shortcut in the gallery, process limits.", "kind": "apply"},
            {"q": "Should you keep tightening the train grader until the curve is pretty?", "a": "Not without a frozen holdout. Otherwise you and the policy are jointly overfitting a moving target.", "kind": "recall"},
        ],
        links=[TRL],
    ),
    "reaching-rft-in-practice": note(
        what="""In practice you reach RFT through a **managed service** (a vendor's reinforcement / grader loop) or a **maintained framework** (TRL, vendor SDKs), not by implementing PPO, GAE, and a distributed actor pool from a 2017 blog. The product work is the **grader**, the **data**, the **tether**, and the **eval** — not the optimiser trivia.

Building from scratch is a research career, not a quarter's roadmap for a support bot.""",
        why="""On the job, home-grown RL loops fail in undebuggable ways and nobody can rebase them. Interviewers who have shipped will be suspicious of "I wrote PPO".

Interviews: say you would use a maintained stack and spend the time on reward design.""",
        how="""Path:

1. Confirm a grader exists and SFT sometimes scores.
2. Pick a vendor RFT API if the base is closed, or TRL/etc. if open weights.
3. Implement the grader as a service the trainer can call safely (sandbox for code).
4. Configure KL/length, batch, and eval callbacks.
5. Do not fork the trainer in week one.

Example. OpenAI-style reinforcement fine-tuning on a hosted model: you supply graded tasks, they run the loop, you keep the eval. Open-weights: TRL PPO/GRPO/RLOO recipes with your test runner in a jail. Either way the unique code is the grader, not the policy gradient.

If procurement forbids both, you probably do not do RFT this quarter. That is an acceptable outcome.""",
        fails="""1. **Custom PPO on a laptop** as the plan.

2. **Ungated code execution** in the grader. That is an incident.

3. **Treating the vendor as owning the eval.** You still need a held-out set they do not train on.""",
        line="I reach RFT through a maintained service or framework and I spend my time on the grader, the sandbox, and the eval. I will not implement PPO from scratch for a product tune.",
        kps=[
            "Use managed RFT or a maintained framework.",
            "Your unique work is the grader and the eval.",
            "Sandbox any code-execution reward.",
            "Keep a held-out set the vendor does not see.",
            "No GPU/RL operators means no DIY PPO.",
            "Skipping RFT is valid when the stack is not there.",
        ],
        qs=[
            {"q": "Why not implement PPO from scratch for a product RFT?", "a": "The failure modes are subtle, the rebase cost is high, and maintained stacks already exist. The product differentiator is the grader and eval, not your policy-gradient code.", "kind": "recall"},
            {"q": "You need RFT on a closed hosted model. Path?", "a": "The vendor's reinforcement/fine-tune-with-grader API if it exists, plus your own held-out eval. You will not get weights; keep the tasks and grader.", "kind": "apply"},
            {"q": "The code grader runs model-written Python on the training box. Risk?", "a": "Remote code execution. Sandbox with no network, limits, and a dedicated worker. This is a security bug, not an ML detail.", "kind": "debug"},
            {"q": "What do you still own if a vendor runs the loop?", "a": "Task definitions, the grader spec, a held-out eval, and the decision record. Those survive a vendor change.", "kind": "recall"},
            {"q": "No managed API and no one to operate TRL. What do you do?", "a": "Skip RFT. Use SFT/DPO or a stronger prompted model. An unowned RL loop is not cheaper.", "kind": "apply"},
        ],
        links=[OA_FT, TRL],
    ),
    "verifiable-reward-only": note(
        what="""**Verifiable reward only** means you start RFT when a **checker, test suite, or schema** can score the output **without a human in the inner loop**. Humans may design the checker and audit samples. They do not grade every rollout.

This rule keeps you off vibe-RL. The moment the reward is "a 7B judge's feelings", you have DPO with extra steps and extra hacks.""",
        why="""On the job this is the go/no-go. It also forces you to invest in tests — which you wanted for the product anyway.

Interviews: "I only RFT when I can write a checker" is a complete policy.""",
        how="""Write the checker first as a CLI: input in, score out, deterministic, tested. If you cannot, you are not ready.

Example. JSON extractor: `score = schema_ok * required_fields * date_parse`. CI tests the scorer with known pass/fail fixtures, including hacks. Only then do you point TRL at it.

If product insists on a prose quality, you either operationalise it into checks (banned phrases, max sentences, required section headers) or you leave RFT.""",
        fails="""1. **Human-in-the-loop on every sample** labelled as RFT.

2. **Non-deterministic judge** with no seed and no calibration.

3. **Checker that needs the gold answer inside the prompt** the model can copy.""",
        line="I only start RFT when a program can score the output. If I need a human to feel the quality, I use pairs or demonstrations instead.",
        kps=[
            "Inner-loop reward must be a program, not a human.",
            "Humans design and audit the checker; they do not grade rollouts.",
            "A judge-LLM is not 'verifiable' without heavy caveats.",
            "Build the checker as a tested CLI first.",
            "Operationalise prose into checks or skip RFT.",
            "A checker that leaks the gold will be copied.",
        ],
        qs=[
            {"q": "What does 'verifiable reward only' require?", "a": "A checker, test suite, or schema that can score each output without a human in the inner loop. Humans may audit, but the trainer calls a program.", "kind": "recall"},
            {"q": "Stakeholders want RFT on 'empathy'. Options?", "a": "Turn empathy into checkable rules if that is real, or use DPO with a rubric. Do not put an uncalibrated empathy judge in the inner loop and call it verifiable.", "kind": "apply"},
            {"q": "The scorer embeds the gold number in a comment the model can see. Issue?", "a": "The policy will copy it. Hide gold from the model; keep it in the scorer only.", "kind": "debug"},
            {"q": "Why test the checker in CI with hack fixtures?", "a": "Because the checker is the spec. If `assert True` scores 1.0, you will reinforce it. Fixtures are the gallery.", "kind": "recall"},
            {"q": "Can a human audit sample replace the inner-loop human?", "a": "Yes — that is the point. Audit a sample of high-reward outputs offline. Do not block every rollout on a person.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "reward-hacking-gallery": note(
        what="""A **reward-hacking gallery** is a living set of **outputs that should score low** even if they once fooled the grader: padded repeats, `assert True`, boxed guesses, keyword salad, empty templates. You add every new hack you find. The gallery is part of the grader's test suite.

Without a gallery, every fix is temporary. The policy rediscovers last month's trick with new punctuation.""",
        why="""On the job this is regression testing for the spec. It is the most concrete artefact you can show in a review.

Interviews: naming a gallery sounds like you have been burned, which is credibility.""",
        how="""Store `gallery/*.json` with the output, why it is a hack, and the required score (usually 0). CI fails if any item scores above ε. When inspection finds a new hack, you add a file before you change the trainer.

Example. The model learned to emit the function signature and `return 0`. You add three variants to the gallery, tighten tests, and only then resume RFT. The next run cannot celebrate a reward built on `return 0`.

Share the gallery with SFT too: those strings should not become gold.""",
        fails="""1. **Gallery in a Slack thread.** It will not run in CI.

2. **One example per hack class.** The policy paraphrases around it.

3. **Deleting old hacks** because "we fixed that". They come back.""",
        line="I keep a CI-tested gallery of hacks that must score near zero, and I add every new cheat before I resume training. The gallery is how the grader stays honest.",
        kps=[
            "Gallery = known hacks that must score low.",
            "It lives in CI next to the checker, not in Slack.",
            "Add the new cheat before you resume the run.",
            "Keep variants; paraphrases will appear.",
            "Do not delete old hacks.",
            "SFT should not treat gallery items as gold.",
        ],
        qs=[
            {"q": "What is a reward-hacking gallery?", "a": "A versioned set of cheating outputs that the grader must score near zero, run in CI, grown every time inspection finds a new trick.", "kind": "recall"},
            {"q": "You found a new pad-and-repeat cheat mid-run. Order of operations?", "a": "Add it to the gallery, make CI fail, fix the grader, confirm the gallery, then resume RFT. Do not 'just lower LR'.", "kind": "apply"},
            {"q": "Gallery is three items from month one. Risk?", "a": "The policy has moved to paraphrases. Keep adding variants and recent samples or the gallery becomes folklore.", "kind": "debug"},
            {"q": "Why keep old hacks after the grader 'fixed' them?", "a": "Fixes regress. Old hacks are regression tests for the spec, like unit tests for a parser.", "kind": "recall"},
            {"q": "Can the gallery be used as extra negative SFT?", "a": "Carefully, as 'do not emit this', but the primary job is scoring. Do not flood SFT with weird negatives and wreck the dialect.", "kind": "apply"},
        ],
        links=[],
    ),
    "kl-or-length-penalty": note(
        what="""A **KL penalty** (or a close cousin) **bounds how far the policy may drift** from the **SFT reference**. A **length penalty** bounds the cheap hack of emitting more tokens when the reward correlates with length. Together they are the seatbelt.

Without a tether, RFT can leave grammatical language for grader tokens. Without a length term, it can write novels that scrape 0.01 extra reward.""",
        why="""On the job, missing tethers are how an RFT job produces garbage that still "wins" the train reward. You restore from SFT and start over.

Interviews: name KL to reference and length; say they are not optional décor.""",
        how="""Set a KL coefficient and watch KL and reward together. If reward rises only as KL explodes, you are leaving the SFT island. If length rises with reward, add an explicit length cost or a cap.

Example. Reward +0.2, KL from 0.1 to 8, mean tokens 80→400. You raise KL coeff and add a length penalty; land reward +0.08 with KL 0.4 and tokens 90. The smaller honest gain is the one you keep.

The reference is the SFT checkpoint, frozen, same tokenizer. A mismatched reference is a broken seatbelt.""",
        fails="""1. **KL coeff = 0 because learning was slow.**

2. **Length penalty so huge** the model stops answering.

3. **Reference is the base, not SFT**, so the tether pulls toward the wrong dialect.""",
        line="I tether RFT to the SFT reference with a KL (or equivalent) and I penalise length when the reward loves tokens. A reward gain that explodes KL is not a gain I will serve.",
        kps=[
            "KL bounds drift from the frozen SFT reference.",
            "Length penalty fights verbosity hacks.",
            "Watch reward, KL, and tokens on one plot.",
            "A reward-up / KL-explode run is a fail.",
            "Reference must be the SFT you actually like.",
            "Zero tether is how language collapses to grader bait.",
        ],
        qs=[
            {"q": "What does a KL penalty do in RFT?", "a": "It penalises the policy for moving far from a frozen reference (usually SFT), so high reward cannot be bought by abandoning the language you started with.", "kind": "recall"},
            {"q": "Reward up, KL 0.1→8, tokens 5×. Ship?", "a": "No. Raise the tether, add a length cost, inspect samples. You bought grader points with drift.", "kind": "apply"},
            {"q": "You set KL to 0 to 'let it learn'. What happens?", "a": "The policy can collapse to whatever the grader accidentally likes, including nonsense tokens. Restore a non-zero tether.", "kind": "debug"},
            {"q": "Why is the SFT model the usual reference, not the raw base?", "a": "SFT already speaks the task dialect. Tethering to the raw base pulls you away from the format you paid to teach.", "kind": "recall"},
            {"q": "When is a length penalty the wrong tool?", "a": "When the task truly needs long outputs (explanations, code). Then cap pathological length but do not punish necessary tokens. Use a budget, not a war on length.", "kind": "apply"},
        ],
        links=[TRL],
    ),
    "rubric-versus-unit-test-rewards": note(
        what="""Prefer **machine-checkable scores** (unit tests, exact match, schema). Use a **rubric judge** only when a test **cannot exist**. A rubric is a structured human or model score (0–4 on criteria). It is more honest than a vibe but still gameable — especially by length and by models that share a family with the judge.

The order is: unit-test-like, then rubric with humans in calibration, then "please score this" as a last resort you probably skip.""",
        why="""On the job, rubric-only RFT is how you rediscover length bias with more GPUs. Unit tests are the gift you should not refuse.

Interviews: state the preference order clearly.""",
        how="""If any part of the task is checkable, score that part with a program and only send the residue to a rubric. Hybrid rewards beat a single LLM score.

Example. Code+explanation: tests score the code (weight 0.8); a short rubric scores the explanation (0.2) after length control. The policy cannot ignore tests by writing a lovely essay.

If you must use a rubric-only judge, freeze it, calibrate on humans, length-control, and keep a human holdout. Treat it as DPO-adjacent, not as a unit test.""",
        fails="""1. **Rubric for something a regex could do.**

2. **Same-family judge and policy** without calibration.

3. **Equal weights on essay and tests** so the essay can dominate.""",
        line="I prefer unit-test and schema rewards. I use a rubric judge only for the residue a program cannot score, and I never let the essay outvote the tests.",
        kps=[
            "Prefer program scores over rubric judges.",
            "Rubrics are for qualities no checker can see.",
            "Hybrid: tests on the checkable part, rubric on the rest.",
            "Calibrate and length-control any judge.",
            "Do not let prose weight dominate a testable task.",
            "A rubric is closer to DPO than to a unit test.",
        ],
        qs=[
            {"q": "When may you use a rubric judge as an RFT reward?", "a": "Only when a machine-checkable score cannot exist for that quality. Even then calibrate, length-control, and keep a human holdout.", "kind": "recall"},
            {"q": "Code+explanation task. How do you weight rewards?", "a": "Put most weight on hidden tests. Use a small, length-controlled rubric for the explanation. The essay must not outvote failing tests.", "kind": "apply"},
            {"q": "The judge is the same family as the policy and loves long answers. Issue?", "a": "Self-preference and length bias. Swap the judge, calibrate, or drop to tests-only.", "kind": "debug"},
            {"q": "Why is a schema check better than a 1–5 'structuredness' rubric?", "a": "It is deterministic and aligned with the parser. A 1–5 score can be flattered. Use the parser.", "kind": "recall"},
            {"q": "You can write tests for 80% of the spec. RFT on a 100% rubric anyway?", "a": "No. Score the 80% with tests and only rubric the rest. Do not throw away the honest signal.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "when-not-to-reach-for-rl": note(
        what="""**Skip RFT** if you **cannot write a grader you trust more than a preference pair** (or a demonstration). RL adds variance, hacks, and ops. It is not a promotion from DPO. If pairs already capture the quality, DPO is enough. If gold exists, SFT is enough. If nothing exists, write a spec.

Also skip if you cannot sandbox the grader, cannot tether, or cannot staff the loop.""",
        why="""On the job, "we should try RL" is a meeting that needs a grown-up. The cost is not the GPU; it is the hack-and-chase cycle.

Interviews: a crisp skip policy scores well. Zeal for PPO does not.""",
        how="""Skip list:

- No program grader, only vibes.
- Grader less trusted than two humans comparing answers.
- Policy never scores above zero and you refuse to SFT first.
- Cannot isolate code execution.
- Success metric is already met by SFT/DPO.

Example. A PM saw a lab blog. Your task is brand tone. You write: no verifiable reward, DPO is the method if anything, SFT already at 90% on the unique parts. RL is out of scope. That memo is the deliverable.

If they still want a story, offer a **grader design spike** with no trainer — if the spike cannot score 50 fixtures cleanly, RL is cancelled with evidence.""",
        fails="""1. **RL as culture.** Every task gets a loop.

2. **Skipping the spike.** You discover the grader is junk after a week of GPU.

3. **Trusting a vendor 'RL' button** with no held-out eval.""",
        line="I skip RFT unless I have a grader I trust more than a pair, a sandbox, and a tether. If SFT or DPO already matches the signal, RL is theatre.",
        kps=[
            "No trusted grader → no RFT.",
            "If pairs are more honest than the grader, use DPO.",
            "If gold exists and suffices, use SFT.",
            "No sandbox or no staff → skip.",
            "A grader-only spike can cancel RL cheaply.",
            "RL is not a prestige upgrade from DPO.",
        ],
        qs=[
            {"q": "When do you skip RFT even if someone asks for RL?", "a": "When you cannot write a grader more trusted than pairs or gold, when you cannot sandbox or staff it, or when SFT/DPO already meet the metric.", "kind": "recall"},
            {"q": "Tone task, good pairs, no checker. Method?", "a": "DPO (after SFT), not RFT. A niceness judge is a worse signal than the pairs.", "kind": "apply"},
            {"q": "A vendor offers an 'RL fine-tune' button with no eval export. Risk?", "a": "You cannot verify hacking or hold out data. Decline or demand a held-out eval you control.", "kind": "debug"},
            {"q": "What is a grader design spike?", "a": "A short project that scores a fixture set (including hacks) with no trainer attached. If it fails, RFT is cancelled before GPUs.", "kind": "recall"},
            {"q": "SFT already hits the test-pass target. Add RFT?", "a": "Only if a leftover checkable gap remains and an A/B shows lift. Hitting the target is a skip, not a reason to stack RL.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
}
