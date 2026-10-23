from helper import note

DPO = {"title": "DPO paper (arXiv)", "url": "https://arxiv.org/abs/2305.18290"}
TRL_DPO = {"title": "Hugging Face TRL: DPO trainer", "url": "https://huggingface.co/docs/trl/en/dpo_trainer"}

NODES = {
    "demonstrations-vs-preferences": note(
        what="""**Demonstration** data says "this is the answer": one prompt, one gold completion. That is SFT. **Preference** data says "this is better than that": one prompt, a **chosen** reply, a **rejected** reply. That is DPO and friends.

Demonstrations need you to write the correct string. Preferences need you to **compare** two strings on a named quality — tone, concision, refusal, helpfulness — even when several replies would be acceptable. If you can write one right answer, prefer SFT. If the quality is a ranking among valid answers, prefer preferences.""",
        why="""On the job, people collect likes/dislikes and then run SFT on the likes only. They threw away the contrast that DPO needs, or they run DPO on pairs that are just "right vs wrong JSON" and should have been SFT.

Interviews: define both in one breath and say which failure each fits.""",
        how="""Classify the target.

- Unique gold (label, schema, exact extract) → demonstration / SFT.
- Many valid answers, you care which is better (shorter, kinder, firmer refusal) → preference / DPO.
- You have both: SFT first to get into the valid set, DPO to rank inside it.

Example. Ticket label: one right enum. Demonstration. Brand voice among three valid paragraphs: preference. "Valid JSON vs invalid JSON": that is not a preference problem; it is SFT or constrained decoding. Using DPO there wastes raters on a check a parser can do.

When you only have thumbs-up logs, you still do not have preferences. You have noisy demonstrations. To get pairs you must attach a worse alternative, not invent a reject by deleting a word.""",
        fails="""1. **Calling any two strings a preference.** They must differ on the quality you named.

2. **SFT on likes, ignoring dislikes.** You lost the contrast.

3. **Preferences on invalid vs valid format.** Use SFT or a decoder constraint.""",
        line="Demonstrations show the one answer; preferences rank two answers on a named quality. I use SFT when I can write gold, and DPO when I need to choose among valid replies.",
        kps=[
            "Demo = one gold string; preference = chosen vs rejected.",
            "SFT fits unique gold; DPO fits ranking among valid answers.",
            "Thumbs-up logs are not pairs until you add a real reject.",
            "Format validity is rarely a preference problem.",
            "Typical stack: SFT first, preferences second.",
            "Pairs must differ on the quality you care about.",
        ],
        qs=[
            {"q": "What extra field does preference data have that SFT data does not?", "a": "A rejected response as well as a preferred one, for the same prompt, differing on a named quality. SFT only has one demonstration.", "kind": "recall"},
            {"q": "You can write the exact JSON gold. DPO or SFT?", "a": "SFT (and/or constrained decoding). DPO is for ranking among already-valid answers, not for teaching a schema.", "kind": "apply"},
            {"q": "You SFT'd on thumbs-up chats and ignored thumbs-down. What did you throw away?", "a": "The contrast that would have made preference tuning possible, and a signal about what users disliked. Down votes are not automatically a reject string either — you still need a pair.", "kind": "debug"},
            {"q": "When is a thumbs-up not a demonstration of the spec?", "a": "When users upvote 'got my refund' rather than 'matched the house template'. Likes are outcome, not spec.", "kind": "recall"},
            {"q": "How do you turn two valid drafts into a preference row?", "a": "Name the quality (e.g. concision), pick chosen/rejected accordingly, and confirm they do not also differ in facts or length you do not want to teach.", "kind": "apply"},
        ],
        links=[DPO],
    ),
    "building-preference-pairs": note(
        what="""A preference example is a **prompt + preferred + rejected** that differ in the **quality you named** and as little else as possible. If they also differ in length, factuality, or formatting, the model may learn the confound.

Construction is a design problem. You sample two replies (from SFT, from two prompts, from a teacher), you label which is better on the rubric, you discard ties and confounded pairs.""",
        why="""On the job, sloppy pairs are why DPO makes the model verbose or sycophantic. The rejected was just shorter.

Interviews: "how do you build pairs?" should mention the named quality and confound control.""",
        how="""Recipe:

1. Name one quality per dataset version (tone, concision, refusal calibration).
2. Generate two candidates from the SFT model (or SFT vs base).
3. Rater chooses; ties go to the bin.
4. Filter: both schema-valid if the product requires it; similar length (or length-normalise); same facts.
5. Spot-check that a third person can see the quality gap.

Example. Quality = concision. Chosen is 60 tokens, rejected is 180, same facts, both polite. Good. Another pair: chosen is 200 tokens with extra facts, rejected is 50 and also wrong. You taught "longer and more facts win", not concision. Drop it.

Do not build rejects by randomly shuffling words. The contrast should be a realistic bad habit of your model.""",
        fails="""1. **Random reject.** The model learns noise.

2. **Unnamed quality.** Raters each use a private rubric.

3. **Chosen invalid, rejected valid.** You inverted the product.""",
        line="I build pairs that differ on one named quality and I throw away ties and confounded length or fact gaps. A random reject is not a preference.",
        kps=[
            "A pair is prompt + chosen + rejected on one named quality.",
            "Keep facts and validity equal; isolate the quality.",
            "Control length or you will teach verbosity.",
            "Realistic rejects beat scrambled text.",
            "Ties and unclear gaps get dropped.",
            "Filter both sides through the same schema if the product needs it.",
        ],
        qs=[
            {"q": "What three fields make a preference example?", "a": "The prompt, a preferred response, and a rejected response that differ in the quality you named. Missing any one is not DPO data.", "kind": "recall"},
            {"q": "Chosen is longer and more factual than rejected. You wanted tone. Problem?", "a": "Confound. The model can win by being longer or stuffing facts. Rebuild so facts and length match and only tone differs.", "kind": "debug"},
            {"q": "How do you get a realistic reject?", "a": "Sample a second reply from the current SFT model or an earlier checkpoint that shows the bad habit (ramble, over-refuse). Do not scramble tokens.", "kind": "apply"},
            {"q": "Why drop ties?", "a": "A pair with no perceptible gap trains noise and wastes beta. Ties mean the quality is not identifiable in that example.", "kind": "recall"},
            {"q": "Both replies invalid JSON, quality is 'helpfulness'. Ship the pair?", "a": "No. Teach validity with SFT or constraints first. Preference among invalid outputs will not yield a parser-friendly model.", "kind": "apply"},
        ],
        links=[DPO, TRL_DPO],
    ),
    "sources-rater-agreement": note(
        what="""Preferences can come from **human raters**, **model judges**, or **production feedback** (thumbs, edits, re-asks). Every source is noisy. You must measure **how often raters agree** — with each other, or with a gold rubric — and **stop labelling** if agreement sits near chance.

A judge model is a rater with a known bias (length, self-preference). Production thumbs measure user satisfaction, not your spec. Humans drift without a rubric.""",
        why="""On the job, 2,000 pairs with 52% agreement is expensive coin-flip data. DPO will faithfully learn the coin.

Interviews: mention inter-rater agreement and a pause rule.""",
        how="""Protocol:

- Written rubric with 3–5 bullets and examples.
- Overlap set: 10–20% of pairs seen by two humans (or human vs judge).
- Report percent agreement and a chance-corrected score if you can.
- Pause if agreement is near 50–60% on a binary choice; fix the rubric.
- If you use a judge, calibrate it on the overlap and watch length bias.

Example. Two raters on 200 pairs: 58% agree. You thought you were labelling "professional tone"; they were labelling "would I send this". You rewrite the rubric with three must-have / must-not, rerun, hit 81%, then scale.

Production thumbs: use them as a source of prompts and maybe as a weak prior, not as raw chosen/rejected without a spec pass.""",
        fails="""1. **One rater, no overlap.** You cannot see noise.

2. **Judge-only, uncalibrated.** You distill the judge's length love.

3. **Scaling at 55% agreement.** You industrialise a coin.""",
        line="I treat every preference source as noisy, I measure agreement on an overlap set, and I pause labelling if agreement stays near chance until the rubric is clear.",
        kps=[
            "Sources: humans, judges, production feedback — all noisy.",
            "Write a rubric; measure overlap agreement.",
            "Pause near chance; do not scale a coin flip.",
            "Calibrate judges; they love length and themselves.",
            "Thumbs are satisfaction, not a spec.",
            "Report agreement on the dataset card.",
        ],
        qs=[
            {"q": "Why measure inter-rater agreement before scaling DPO labels?", "a": "If raters do not agree, there is no stable quality to learn. DPO will fit noise. Agreement is the gate on whether the pair set exists.", "kind": "recall"},
            {"q": "Binary pairs, 55% two-human agreement. Action?", "a": "Pause. Rewrite the rubric with concrete must/must-not examples, retrain the raters, re-label the overlap. Do not order another 5,000 pairs.", "kind": "apply"},
            {"q": "A judge prefers the teacher's own long answers. Risk?", "a": "Self-preference and length bias. Your DPO will make the student wordier and closer to that teacher, not necessarily better on the rubric.", "kind": "debug"},
            {"q": "What is an overlap set?", "a": "A slice labelled by two sources (two humans, or human and judge) so you can compute agreement and calibrate. Typically a fixed fraction of each batch.", "kind": "recall"},
            {"q": "Can production thumbs be chosen/rejected as-is?", "a": "Usually not. A thumb is not a second string, and it may not match the spec. Use thumbs to mine prompts or to filter, then build real pairs.", "kind": "apply"},
        ],
        links=[TRL_DPO],
    ),
    "avoiding-length-bias": note(
        what="""Raters and judges **prefer longer answers**. If your pairs let length vary with quality, DPO teaches **verbosity**. **Avoid pairs that differ in irrelevant ways**, especially length, extra hedging, or added facts you did not ask to reward.

Control length at construction (similar token counts) or at analysis (length-controlled win rate). If win rate soars and average tokens double, you did not win.""",
        why="""On the job this is the most common DPO foot-gun. The eval judge loves the new essays. Users do not. Latency and cost rise.

Interviews: name length bias and the control. Easy points.""",
        how="""Tactics:

- When sampling candidates, cap `max_tokens` similarly.
- Drop pairs whose length ratio exceeds a threshold (e.g. 1.5×) unless length **is** the quality (concision).
- Report win rate **and** mean tokens. Use length-controlled comparisons if you have them.
- For concision as the quality, invert the usual bias: chosen should be shorter, and facts must match so you are not rewarding deletion of content.

Example. After DPO, pairwise win +15 vs SFT, mean length 80→170. You recompute wins in length buckets; the gain vanishes. You rebuild pairs with matched lengths and a concision rubric; win +6, length 80→75. That is a real tone win.

Never use "add more detail" as an implicit quality unless the spec says so.""",
        fails="""1. **Celebrating win rate only.**

2. **Chosen always the longer sample** because raters were rushed.

3. **Length-penalising at train but not at eval**, or the reverse — inconsistent story.""",
        line="I treat length as a confound until proven otherwise: match it in pairs, report tokens next to win rate, and I will not ship a 'better' model that only learned to ramble.",
        kps=[
            "Judges and humans like long answers.",
            "If length covaries with chosen, DPO teaches verbosity.",
            "Match lengths or use length-controlled win rates.",
            "Always report mean tokens with quality.",
            "When concision is the goal, chosen should be shorter at equal facts.",
            "A +15 win with 2× tokens is a suspect win.",
        ],
        qs=[
            {"q": "What is length bias in preference tuning?", "a": "The tendency of raters and judges to pick the longer reply, so DPO increases token count even when the named quality was tone or helpfulness.", "kind": "recall"},
            {"q": "Win rate +15, mean tokens doubled. How do you read it?", "a": "Suspect length bias. Slice wins by length or rebuild matched-length pairs. Do not ship on the raw win rate.", "kind": "debug"},
            {"q": "How do you build pairs when the quality is concision?", "a": "Keep facts equal and let chosen be shorter on purpose. Drop pairs where the short one deleted a required fact — that is a different error.", "kind": "apply"},
            {"q": "Why cap both candidates with a similar max_tokens?", "a": "So you do not systematically offer a long essay against a stub. The rater should choose on the quality, not on who hit the cap.", "kind": "recall"},
            {"q": "Name an irrelevant difference other than length.", "a": "Extra facts, markdown decoration, or a greeting the judge likes. Control or randomise those so they do not become the learned rule.", "kind": "apply"},
        ],
        links=[DPO],
    ),
    "dpo-intuition": note(
        what="""**Direct Preference Optimization (DPO)** raises the **likelihood of preferred answers relative to rejected ones**, while a **frozen reference** model (usually the SFT checkpoint) keeps the policy from drifting too far. You do not train a separate reward model and you do not run a PPO loop. The preference pair becomes a classification-style loss on the two likelihoods.

**Beta** scales how hard you penalise divergence from the reference. Higher beta: stay close to SFT. Lower beta: chase the preference harder, risk collapse or verbosity.

Intuition is enough for an interview: push chosen up, rejected down, stay near SFT.""",
        why="""On the job, DPO is the preference method you can actually run. People still say RLHF when they mean DPO. Correcting that politely is useful; pretending you implemented PPO last week is not.

Interviews: no need for the full derivation. Need reference, beta, and the chosen/rejected likelihood picture.""",
        how="""You start from an SFT model. You freeze a copy as reference. For each pair you compute log-probs of chosen and rejected under policy and reference. The loss rewards the policy for increasing the chosen–rejected gap relative to the reference, scaled by beta.

Example. SFT already emits valid JSON. Pairs contrast terse vs rambling JSON. After DPO, P(terse) rises relative to P(ramble) on those prompts. If beta is tiny, the model may leave the JSON dialect entirely to chase the judge. If beta is huge, nothing moves.

You still eval with the same held-out pairs and with the task/probe suite. DPO loss going down is not a ship signal.""",
        fails="""1. **No reference / beta ≈ 0.** Policy drift, reward hacking of the pairs.

2. **DPO from a base instruct without SFT** on your task. Off-policy pairs, weak anchor.

3. **Treating DPO as knowledge install.** Same failure as SFT, plus pair noise.""",
        line="DPO increases the likelihood of chosen replies versus rejected ones while a frozen SFT reference, scaled by beta, limits how far the policy can wander. I explain it without a PPO story.",
        kps=[
            "Push chosen up, rejected down, stay near a frozen reference.",
            "No separate reward model and no PPO loop required.",
            "Beta: higher stays closer to SFT; lower chases pairs harder.",
            "Usually run on top of SFT, not instead of it.",
            "DPO loss is not the product metric.",
            "Off-policy pairs on a raw base are a weak start.",
        ],
        qs=[
            {"q": "In one sentence, what does DPO do?", "a": "It raises the likelihood of preferred answers relative to rejected ones while a frozen reference model, scaled by beta, penalises drifting too far from the SFT policy.", "kind": "recall"},
            {"q": "What does a higher beta do?", "a": "It keeps the policy closer to the reference (usually SFT). Updates that would move far from SFT are penalised more. Lower beta lets it chase the pairs harder.", "kind": "recall"},
            {"q": "Why is a frozen reference necessary?", "a": "Without an anchor the policy can drive rejected likelihood to zero in degenerate ways or leave the language the pairs assumed. The reference is the KL-like tether.", "kind": "apply"},
            {"q": "DPO loss fell, users say answers went weird. First checks?", "a": "Beta too low, length bias, off-spec pairs, or no SFT warm start. Look at generations and probes, not the DPO loss curve.", "kind": "debug"},
            {"q": "Do you need to derive the RLHF equivalence in an interview?", "a": "No. State the chosen/rejected likelihood picture, the reference, and beta. Offer the 'implicit reward' one-liner only if they ask.", "kind": "apply"},
        ],
        links=[DPO, TRL_DPO],
    ),
    "dpo-after-sft": note(
        what="""Preference tuning **usually follows SFT** rather than replacing it. SFT puts the model **on-distribution**: it already speaks the house format, so chosen and rejected are both plausible completions. The SFT checkpoint is a **sensible reference**. DPO then ranks among those completions.

Running DPO on a raw base with pairs from a different model is possible and often disappointing: the reference is a stranger, the pairs are off-policy, and you spend the method teaching format it never had.""",
        why="""On the job, skipping SFT is how you get a DPO run that invents a new dialect. The pairs were all valid JSON; the base was not.

Interviews: "why SFT then DPO?" — on-policy pairs and a reference that already does the task.""",
        how="""Sequence:

1. SFT until schema/task is in the acceptable band.
2. Sample pairs from that SFT model (on-policy).
3. Freeze it as reference; DPO a copy.
4. Compare DPO vs SFT on the same held-out pairs and probes.

Example. SFT: format-valid 99%, tone 70%. You build 1,500 tone pairs from SFT samples. DPO: tone 82%, format 98.5%, probes hold. You ship DPO. If format had been 80%, you would have stayed on SFT longer — DPO is a poor schema teacher.

If you must DPO a vendor model you cannot SFT, say so: you are preference-tuning their instruction model, and your reference is their hosted snapshot, not your house SFT.""",
        fails="""1. **DPO first.** Format still broken; pairs are theatre.

2. **Pairs from a giant teacher, reference is a tiny SFT.** Severe off-policy.

3. **Replacing SFT data with pairs** when you still need unique gold.""",
        line="I SFT until the model is in the valid band, sample pairs from that model, and only then DPO against that frozen reference. Preferences rank; they do not replace demonstrations.",
        kps=[
            "SFT first: on-distribution replies and a sane reference.",
            "Sample pairs from the SFT model when you can.",
            "DPO is weak at teaching a schema from scratch.",
            "Off-policy teacher pairs on a raw base often disappoint.",
            "Always A/B DPO against the SFT checkpoint.",
            "If you cannot SFT a closed model, say the reference is theirs.",
        ],
        qs=[
            {"q": "Why run SFT before DPO?", "a": "SFT puts replies on-distribution so pairs are realistic, and it gives you a frozen reference that already speaks the task. DPO then ranks among valid answers instead of teaching the alphabet.", "kind": "recall"},
            {"q": "Format-valid is 80%. Should you start DPO for tone?", "a": "Not yet. Finish SFT (or constraints) until validity is in band. Tone pairs among invalid JSON will not yield a parser-stable model.", "kind": "apply"},
            {"q": "Pairs were written by a 70B, reference is your 3B SFT. Risk?", "a": "Off-policy: the 3B assigns nonsense likelihoods to 70B prose. Prefer pairs sampled from the 3B, or accept a weaker update.", "kind": "debug"},
            {"q": "What do you freeze as the DPO reference in the standard setup?", "a": "The SFT checkpoint you started from. Not a random base and not a moving average unless you have a reason.", "kind": "recall"},
            {"q": "Can DPO replace SFT if you have lots of pairs?", "a": "Rarely for tasks with a unique gold. Pairs without a valid-band model waste the method. Use SFT for the gold mapping, DPO for the ranking.", "kind": "apply"},
        ],
        links=[DPO, TRL_DPO],
    ),
    "what-preference-tuning-is-for": note(
        what="""Preference tuning is for **qualities that are hard to write as a single correct string**: **tone**, **helpfulness**, **refusal calibration** (not too much, not too little), **concision**, politeness vs firmness. Several answers can be "correct"; you want a better one.

It is not for facts, not for schema, not for "add the wiki". Those have gold or tools. If you can unit-test it, you probably should not DPO it.""",
        why="""On the job this keeps DPO off the JSON ticket and on the brand-voice ticket. Misapplication is expensive labelling.

Interviews: list the soft qualities and explicitly exclude schema and facts.""",
        how="""Use a one-line test: **could two employees write different acceptable answers?** If yes, preferences can rank them. If no, write the gold.

Example. Refusal: the SFT model refuses too often (over-refusal) or too rarely. You pair a good calibrated refusal with a lecture or with an unsafe compliance. DPO moves the boundary. You still keep a safety probe so you do not DPO your way into a jailbreak.

Helpfulness: chosen answers the question; rejected hedges. Watch length. Concision: chosen is shorter at equal facts. Tone: chosen matches the brand paragraph in the spec.""",
        fails="""1. **DPO for exact labels.** Use SFT.

2. **DPO for changing facts.** Use RAG.

3. **DPO for safety with no probe.** You will over- or under-refuse in the dark.""",
        line="I use preference tuning for tone, calibrated refusals, helpfulness, and concision — qualities with many valid strings. If I can write one gold or a unit test, I stay on SFT or a checker.",
        kps=[
            "Preferences fit many-valid-answers qualities.",
            "Tone, helpfulness, refusal calibration, concision.",
            "Not for facts, schemas, or unique labels.",
            "If a unit test exists, prefer that signal.",
            "Always keep probes when you touch refusals.",
            "SFT gets you valid; DPO ranks valid.",
        ],
        qs=[
            {"q": "Name three qualities preference tuning is for.", "a": "Tone/brand voice, helpfulness versus hedging, refusal calibration, and concision. Each has many acceptable strings you can rank.", "kind": "recall"},
            {"q": "Wrong JSON schema — DPO or not?", "a": "Not. Teach the schema with SFT and constrained decoding. DPO among invalid objects is the wrong instrument.", "kind": "apply"},
            {"q": "You DPO'd refusals and the jailbreak probe collapsed. What was missing?", "a": "A safety probe gate and pairs that include 'must still refuse' as chosen. You calibrated only toward helpfulness.", "kind": "debug"},
            {"q": "Why is 'many valid answers' the test?", "a": "Because demonstrations need one gold. When several golds exist, a pairwise ranking matches the job. When one gold exists, pairs add noise.", "kind": "recall"},
            {"q": "Can DPO make answers shorter on purpose?", "a": "Yes if concision is the named quality, facts are matched, and you report token counts. Otherwise it usually makes them longer.", "kind": "apply"},
        ],
        links=[DPO],
    ),
    "when-sft-is-enough": note(
        what="""**SFT is enough** when the remaining error is a **unique mapping** you can write: labels, templates, extractors, "always this outline". Preference optimisation **adds value** when, after SFT, humans still argue among valid outputs about a soft quality and you can measure that argument with pairs.

If SFT already hits the target and probes are green, **stop**. DPO is not a prestige layer.""",
        why="""On the job, extra DPO is extra labelling, extra drift risk, and another artefact to rebase. Teams add it because a paper did.

Interviews: say you would skip DPO on a closed labeler that already clears the bar.""",
        how="""Decision after SFT eval:

- Unique-gold metric at target, probes hold → ship SFT.
- Unique-gold at target, tone/refusal still failing a written rubric → collect pairs, DPO, A/B.
- Unique-gold not at target → more SFT/data, not DPO.

Example. Router F1 93% vs 92% target, format 99.6%, probes hold. A PM wants DPO "for quality". You decline; there is no pairwise quality left that money cares about. A writer-bot at 93% factuality but 40% "too stiff" on a tone rubric: DPO is in play.

Write the skip in the decision record so the next intern does not add DPO for décor.""",
        fails="""1. **DPO as default second stage.**

2. **DPO to fix underfit SFT.** Wrong instrument.

3. **No A/B.** You cannot show DPO added value.""",
        line="SFT is enough when the gold mapping hits the target. I add DPO only when a soft quality still fails a written rubric, and I ship SFT if the A/B does not win.",
        kps=[
            "Unique-gold tasks that hit the bar do not need DPO.",
            "DPO is for leftover soft qualities among valid answers.",
            "Do not use DPO to fix underfit SFT.",
            "Require an SFT-versus-DPO A/B on the same pairs.",
            "Prestige is not a stage in the pipeline.",
            "Write down why you skipped DPO.",
        ],
        qs=[
            {"q": "When is SFT enough without preference tuning?", "a": "When the task is a unique mapping and the SFT checkpoint already meets the target and probes. There is no leftover ranking problem worth pairs.", "kind": "recall"},
            {"q": "SFT F1 is 4 points under target. Add DPO?", "a": "No. Fix SFT data, LR, or capacity. DPO ranks; it does not install a missing mapping.", "kind": "apply"},
            {"q": "A PM wants DPO on a labeler that already clears the bar. What do you write?", "a": "A skip: no named leftover quality, DPO would add retrain tax without a metric. Offer a tone DPO only if they write a tone rubric and a user-visible metric.", "kind": "apply"},
            {"q": "What A/B is required before you ship DPO?", "a": "DPO versus the SFT checkpoint on the same held-out pairs and the same probes. If DPO does not win, serve SFT.", "kind": "recall"},
            {"q": "DPO 'felt nicer' but lost the pairwise eval. Ship?", "a": "No. Feeling is the bias DPO already overfits. Keep SFT or rebuild pairs.", "kind": "debug"},
        ],
        links=[TRL_DPO],
    ),
    "pair-construction-rules": note(
        what="""**Pair construction rules** are the written constraints that make chosen and rejected **differ only on the quality you named**. They are the spec for preference data: validity, length band, fact match, no extra tools, no new citations, same language.

Without rules, every rater invents a private contrast and DPO learns a stew.""",
        why="""On the job this is how you stop a labelling vendor from sending you "good essay vs stub". Rules can be enforced in the UI (block submit if length ratio > 1.5) and in a filter.

Interviews: this is the preference analogue of gold-spec-before-collection.""",
        how="""Put the rules on one page:

- Quality name and three examples of a legal gap.
- Both sides schema-valid / safe-enough as required.
- Length ratio in [1/k, k] unless the quality is length.
- Same factual claims; no extra numbers on the chosen side.
- Language and register match the user.

Example. Rule fail: chosen adds a discount the user never had. That is a fact confound (and a product incident waiting). Filter catches the extra number; pair dies.

Automate what you can (length, schema). Humans judge the named quality only after the automations pass.""",
        fails="""1. **Rules in a slide, not in the UI.**

2. **Quality name changes mid-batch** with the same dataset id.

3. **Rules so tight you have 40 pairs.** Loosen with care; do not silently drop the quality.""",
        line="I write pair rules so the only intended difference is the named quality, I enforce the cheap rules in software, and I drop confounded pairs instead of hoping DPO ignores them.",
        kps=[
            "Rules isolate the named quality from confounds.",
            "Enforce length, schema, and fact checks in software.",
            "Humans only judge what automation cannot.",
            "Bump dataset version if the quality name changes.",
            "A legal gap is shown with three examples on the spec.",
            "Confounded pairs are dropped, not 'mostly fine'.",
        ],
        qs=[
            {"q": "What do pair construction rules isolate?", "a": "The named quality. Chosen and rejected should match on validity, facts, and usually length so DPO cannot latch onto a confound.", "kind": "recall"},
            {"q": "Chosen invents a discount. Filter or keep?", "a": "Filter. That is a fact confound and a product risk. The pair no longer teaches tone or concision.", "kind": "apply"},
            {"q": "Raters keep submitting 4× length gaps. Fix?", "a": "Block in the UI with the length-ratio rule and show a message. Do not only complain in the weekly meeting.", "kind": "debug"},
            {"q": "Why version the dataset when the quality name changes?", "a": "Old pairs teach a different contrast. Mixing 'tone' and 'concision' under one id makes the loss uninterpretable.", "kind": "recall"},
            {"q": "Which rules should be software, which human?", "a": "Software: schema, length ratio, language id, cheap fact regexes. Human: the named quality after those pass.", "kind": "apply"},
        ],
        links=[DPO],
    ),
    "inter-rater-agreement": note(
        what="""**Inter-rater agreement** is the measured rate at which two labellers (or a labeller and a judge) pick the same side. It is the health metric of a preference set. **Pause labelling if it stays near chance** (about 50% on a balanced binary task, or whatever chance is for your design).

Agreement is not vanity. It is whether a latent quality exists. You can have a beautiful UI and no quality.""",
        why="""On the job, agreement is the number you bring to a vendor review. "We labelled 8,000" is not a status. "Agreement 79% after rubric v3" is.

Interviews: give a pause threshold and what you do next (fix rubric, not more volume).""",
        how="""Compute on the overlap set every batch. Report raw agreement and, if useful, Cohen's κ. Stratify: maybe raters agree on rude-vs-polite and coin-flip on two polite variants — then your quality is too fine.

Example. Batch 1: 61%. Rubric was "sounds better". Batch 2 after examples: 84%. You scale. A later batch drops to 64% when a new rater cohort arrives — you pause and retrain people, not the model.

If humans agree 85% but the judge agrees with humans 60%, the judge is not ready to replace them.""",
        fails="""1. **No overlap.** Agreement is undefined; you pretend it is high.

2. **Averaging away a bad rater.** One person can poison thousands of pairs.

3. **Chance-level but 'directionally fine'.** There is no direction.""",
        line="I measure agreement every batch and I stop labelling when it sits near chance. Volume without agreement is a coin-flip dataset with a logo.",
        kps=[
            "Agreement says whether the quality exists.",
            "Pause near chance; fix the rubric or the raters.",
            "Use an overlap set every batch, not once at launch.",
            "Stratify: some slices may be unlabelable.",
            "A judge that disagrees with humans is not a cheaper human.",
            "Report agreement on the card next to pair count.",
        ],
        qs=[
            {"q": "What does near-chance inter-rater agreement imply?", "a": "The quality is not defined well enough to learn. More pairs will not help. Pause and fix the rubric or the rater training.", "kind": "recall"},
            {"q": "Agreement is 82% overall but 51% on 'two polite replies'. Meaning?", "a": "The slice is too fine; raters cannot see a gap. Drop that slice or redefine the quality. Do not DPO the coin-flip band.", "kind": "apply"},
            {"q": "You scaled to a new vendor and agreement fell 20 points. Action?", "a": "Pause that vendor's volume. Retrain on the quiz pairs, check for a silent rubric change, and do not mix their pairs into v1 until overlap recovers.", "kind": "debug"},
            {"q": "Why not replace humans with a judge at 60% human agreement?", "a": "The judge is worse than a noisy human pair. Calibrate until it matches overlap, or keep humans.", "kind": "apply"},
            {"q": "What belongs on the overlap set?", "a": "A random-plus-stratified sample of pairs each batch, labelled by two independent raters, used only for agreement — not quietly as extra train without a flag.", "kind": "recall"},
        ],
        links=[],
    ),
    "beta-and-reference-model": note(
        what="""**Beta** is the DPO knob that scales the **penalty for leaving the reference**. The **reference** is a **frozen** model, usually the SFT checkpoint, whose log-probs appear in the loss as the anchor. You need both: without a reference there is no tether; without a sensible beta the tether is slack or a noose.

High beta ≈ conservative, small moves, SFT-like. Low beta ≈ aggressive, can collapse to pair artefacts (verbosity, sycophancy). The right value is swept on val pairs and probes, not copied from a paper that used different pair noise.""",
        why="""On the job, mystery DPO quality is often beta. People copy `beta=0.1` and get a different personality.

Interviews: define both and say the reference stays frozen.""",
        how="""Sweep beta on a short grid (e.g. 0.1, 0.3, 0.5) after pairs are clean. Watch pair-win, length, and probes. Freeze reference weights; if you accidentally train the reference you no longer have DPO.

Example. beta=0.05: win +18, length +90%, refusal −12. beta=0.3: win +7, length +8%, probes hold. You take 0.3. The paper's 0.1 was not your data.

If you swap base mid-project you also swap reference — it is the SFT of *that* base, not an old adapter's cousin.""",
        fails="""1. **Training the reference.** The math you think you are running is gone.

2. **Beta=0 'to learn faster'.** Drift.

3. **Reference is a different family than the policy.** Logits are not comparable in the way you want.""",
        line="Beta tethers the policy to a frozen SFT reference: high stays close, low chases pairs. I sweep it on wins, length, and probes, and I never update the reference.",
        kps=[
            "Reference = frozen SFT (usually); it anchors log-probs.",
            "Beta scales the penalty for diverging from that anchor.",
            "Sweep beta; do not copy a paper's value blindly.",
            "Watch length and probes, not only pair-win.",
            "If the reference trains, you are not running DPO.",
            "A new base needs a new SFT reference.",
        ],
        qs=[
            {"q": "What is the DPO reference model and why is it frozen?", "a": "Usually the SFT checkpoint. It provides the anchor log-probs in the loss. If it trains, the tether moves and the update is no longer DPO as intended.", "kind": "recall"},
            {"q": "What does raising beta do to the policy?", "a": "Keeps it closer to the reference; more conservative updates. Lower beta lets it fit the pairs more aggressively.", "kind": "recall"},
            {"q": "Low beta, big win rate, refusals down. Reading?", "a": "Over-chasing noisy or helpful-biased pairs. Raise beta, clean pairs, and require the probe to hold.", "kind": "debug"},
            {"q": "Can the reference be a different architecture than the policy?", "a": "Not in the standard setup. You want comparable token log-probs on the same tokenizer and family. Use the SFT of the model you are updating.", "kind": "apply"},
            {"q": "How do you pick beta in practice?", "a": "A small grid on val pair-win, mean length, and probes. Choose the most conservative beta that still delivers a real win.", "kind": "apply"},
        ],
        links=[DPO, TRL_DPO],
    ),
    "preference-versus-sft-a-b": note(
        what="""**Ship DPO only when it beats the SFT checkpoint** on the **same held-out pairs** and does not fail probes or cost/latency budgets. The A/B is the product decision. A lower DPO loss, a nicer vibe, or a judge that likes wordiness is not an A/B.

If DPO ties or loses, serve SFT. You still keep the pair set for later; you do not owe the method a production slot.""",
        why="""On the job this is how you prevent a prestige stage from adding 40% tokens. The SFT model was the thing that already paid for itself.

Interviews: they want to hear you would roll back to SFT.""",
        how="""Same prompts, same judge/humans, pre-registered metrics: pair-win, the original task metric, probes, mean tokens, latency. DPO must win the ones you wrote down.

Example. Pair-win 57% vs SFT (not enough vs noise), tokens +30%, F1 flat. You do not ship. Second try after length-matched pairs: win 64%, tokens −5%, F1 flat, probes hold. You ship DPO.

Use a holdout of pairs that no training step saw. Training-pair accuracy is as optimistic as SFT train loss.""",
        fails="""1. **Judge is the pair generator.** Self-preference.

2. **No token metric.** You miss the ramble tax.

3. **Shipping DPO because the YAML pipeline includes it.**""",
        line="DPO has to beat SFT on a pre-registered A/B — held-out pairs, probes, and cost. If it does not, I serve SFT and I do not apologise to the paper.",
        kps=[
            "Required A/B: DPO vs SFT on the same held-out pairs.",
            "Also gate on task metrics, probes, and tokens.",
            "A tie or a loss means serve SFT.",
            "Do not use the training pairs as the A/B.",
            "Avoid a judge that wrote the pairs.",
            "Pipeline default is not a ship decision.",
        ],
        qs=[
            {"q": "What must DPO beat before you ship it?", "a": "The SFT checkpoint on a pre-registered A/B: held-out pair wins, the original task metrics, probes, and usually token/latency cost.", "kind": "recall"},
            {"q": "DPO wins 52% of held-out pairs and is 40% longer. Ship?", "a": "No. 52% may be noise and the length tax is real. Rebuild pairs or keep SFT.", "kind": "apply"},
            {"q": "The A/B judge is the same model that created the pairs. Issue?", "a": "Self-preference can fake a DPO win. Use a different judge or humans, calibrated on overlap.", "kind": "debug"},
            {"q": "Why keep the pair set if you ship SFT?", "a": "It is still an eval and a future data asset. Not shipping DPO is not deleting the labels.", "kind": "recall"},
            {"q": "Who has the burden of proof, SFT or DPO?", "a": "DPO. SFT is the incumbent that already cleared the unique-gold bar. The new stage must earn the extra complexity.", "kind": "apply"},
        ],
        links=[TRL_DPO],
    ),
}
