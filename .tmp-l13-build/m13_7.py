from helper import note

OA_FT = {"title": "OpenAI: fine-tuning guide", "url": "https://platform.openai.com/docs/guides/fine-tuning"}
HF_TRAIN = {"title": "Hugging Face: training", "url": "https://huggingface.co/docs/transformers/en/training"}

NODES = {
    "teacher-student": note(
        what="""**Distillation** here means a **stronger teacher** produces outputs that **train a smaller student** on one narrow workload. It is SFT (sometimes DPO) where the gold is **teacher text**, not a human original. The bet: the student keeps enough of the mapping to serve cheaper and faster, possibly on hardware you control.

The teacher can be a frontier API or a larger open model. The student is usually an 1–8B you can host. You are not transferring "intelligence" in the abstract. You are copying a **workload-specific** input–output map.""",
        why="""On the job this is the cost story after a prompted giant already works. You do not distil as step one. You distil when the teacher path is good and the bill or latency hurts.

Interviews: teacher → student, narrow workload, filter the teacher, check terms.""",
        how="""Sequence: freeze a teacher prompt that already hits the eval; generate on **real traffic-like** inputs; filter; SFT the student; compare both on the **same human-labelled** set (not only teacher labels).

Example. A 70B-class teacher routes tickets at 93% on a human set and costs too much at 80k/day. You generate on 20k historical tickets, drop rows that fail the spec or disagree with a human sample, train a 3B, land 90% at a tenth the unit cost. You route low-confidence student calls back to the teacher.

Do not distil a teacher that is still failing the task. You will copy the failure cheaper.""",
        fails="""1. **Distilling a bad teacher.** Cheaper wrong.

2. **Evaluating only against teacher labels.** You measure imitation, including mistakes.

3. **Broad 'general assistant' distillation** with no workload boundary.""",
        line="I distil a teacher that already wins a narrow workload into a smaller student, I filter the teacher’s answers, and I score both on human labels — not on the teacher’s own keys.",
        kps=[
            "Teacher writes; student is SFT'd on those outputs.",
            "Narrow workload, not generic intelligence transfer.",
            "Teacher must already hit the eval.",
            "Filter before the student treats text as gold.",
            "Compare on human labels, not teacher self-labels.",
            "A cheap copy of a failing teacher is still a fail.",
        ],
        qs=[
            {"q": "What is teacher-to-student distillation in this playbook?", "a": "A stronger model generates outputs on a narrow workload that become training data for a smaller model you can serve cheaper or locally. It is imitation of a working teacher, not a new pretrain.", "kind": "recall"},
            {"q": "The teacher is at 71% on the human set. Distil?", "a": "No. Fix the teacher path first (prompt, retrieval). Distilling 71% yields a cheaper 71%-ish student and hardens the mistakes.", "kind": "apply"},
            {"q": "Student matches the teacher 99% but human accuracy is 70%. What did you measure?", "a": "Imitation of teacher errors. Add a human-labelled holdout and filter the train set against it.", "kind": "debug"},
            {"q": "Why keep the workload narrow?", "a": "A small student cannot absorb a frontier model's whole personality. It can absorb one mapping (labels, a template, a tool-calling style) well.", "kind": "recall"},
            {"q": "How does a confidence fallback change the economics?", "a": "Most traffic hits the cheap student; hard cases go to the teacher. You keep quality on the tail without paying teacher prices on the body.", "kind": "apply"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
    "generating-filtering-teacher-outputs": note(
        what="""Teacher data must be **generated on inputs that look like production** and **filtered** by your evals before it becomes truth. Generation on the teacher's favourite demo prompts yields a student that only handles demos. Unfiltered generation yields a student that loves the teacher's mistakes and catchphrases.

Filter = spec predicates, task metrics, diversity checks, PII/licence, and a human audit sample — the same bar as any SFT set.""",
        why="""On the job, "we dumped 100k teacher rows" is how students collapse. The dump was cheap; the serve failure is not.

Interviews: on-policy inputs + filter-then-train is the pair they want.""",
        how="""Pipeline:

1. Sample prompts from logs or a realistic simulator (typos, empty, tail labels).
2. Run the teacher with the production prompt (retrieval included if prod has it).
3. `accept()` the outputs; drop fails.
4. Diversity and leak scans.
5. Audit 50; then train.

Example. 40k generated, 11k fail schema, 6k are greeting clones, 2k leak near the test set → 21k accepted. Those 21k beat the 40k dump on human eval.

If retrieval is in the teacher path, store the retrieved context with the row or the student will be asked to know facts the teacher was handed.""",
        fails="""1. **Demo-only prompts.** 

2. **Filter-after-train.** The student already ate the junk.

3. **Teacher without the retrieval the student will lack.** You ask the student to be the corpus.""",
        line="I generate teacher answers on real-looking traffic, I filter them with the same spec and evals I use for humans, and only then do they become the student’s gold.",
        kps=[
            "Prompts from real traffic or a realistic simulator.",
            "Teacher uses the production prompt (and retrieval if any).",
            "Filter with accept(), diversity, leak, audit.",
            "Do not train on the raw dump.",
            "If the teacher saw retrieved context, record it or drop the fact.",
            "Demo prompts make a demo student.",
        ],
        qs=[
            {"q": "Why generate teacher outputs on real traffic prompts?", "a": "The student must handle the messy distribution you serve. Demo prompts under-represent typos, empties, and tail labels, so the student fails in production.", "kind": "recall"},
            {"q": "Teacher path uses retrieval. Student will not. What do you store?", "a": "Either include the retrieved passages in the student’s prompt at train and serve, or strip fact-bearing answers and keep only style. Do not ask the student to recall documents it will not see.", "kind": "apply"},
            {"q": "You trained on all 100k raw teacher rows. Student repeats a wrong catchphrase. Cause?", "a": "No filter. The catchphrase was common in teacher dumps. Filter and diversity-check, then retrain.", "kind": "debug"},
            {"q": "What filters apply to teacher data?", "a": "The same as human SFT: spec predicates, schema, PII, licence, near-dupe leak, n-gram diversity, and a 50-row audit.", "kind": "recall"},
            {"q": "When is a simulator acceptable instead of logs?", "a": "When logs are thin or restricted. The simulator must include tail and messy cases, not only happy paths, or you are back to demos.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "capability-for-cost-latency": note(
        what="""You distil to **trade a little capability for cost, latency, and control**. The honest report is a **three-column table**: quality, latency, cost per request (or per 1k) for teacher, student, and any fallback design. "The student is almost as good" without dollars and milliseconds is a slogan.

Self-hosting can win even at equal API token prices if you need residency or a reserved-capacity shape.""",
        why="""On the job, finance will ask for this table. If you cannot produce it, you are not ready to distil.

Interviews: say what you are willing to lose (2–4 quality points, illustrative) for a 5–10× unit-cost drop — and that you measured both.""",
        how="""Measure on the same set, same hardware story.

Example. Teacher API: 93% F1, 900ms p95, $12/1k. Student GPU: 90% F1, 120ms p95, $1.2/1k. Fallback 8% of traffic to teacher: blended 92.4%, 180ms, $2.1/1k. You ship the blend.

If the student is 88% and there is no acceptable fallback, you may keep the teacher. Distillation is allowed to lose the A/B.""",
        fails="""1. **Quality-only report.**

2. **Student latency measured on a laptop, teacher on a cold API.** Unfair.

3. **Ignoring GPU idle cost** when volume is low. Unit cost explodes.""",
        line="I report quality, latency, and cost for teacher, student, and fallback on the same set. Distillation is a trade, and I will keep the teacher if the trade fails.",
        kps=[
            "The point is capability-per-dollar and per-second, plus control.",
            "Always table quality, latency, and cost together.",
            "A small quality drop can be fine if the unit cost falls a lot.",
            "Blended fallback often beats a pure student.",
            "Low volume can erase GPU savings via idle cost.",
            "The trade is allowed to lose; then you do not ship the student.",
        ],
        qs=[
            {"q": "What three numbers belong in a distillation report?", "a": "Quality on a shared set, latency (p50/p95), and cost per request or per 1k, for teacher, student, and any fallback blend.", "kind": "recall"},
            {"q": "Student is −3 F1, 8× cheaper, 5× faster. How do you decide?", "a": "If −3 is inside the written budget and a fallback can recover the tail, ship the blend. If −3 is on a critical slice, do not.", "kind": "apply"},
            {"q": "Unit cost assumed 100% GPU utilisation but you have 2k requests/day. Issue?", "a": "Idle GPU dominates. Recompute with reserved-hour cost. The API teacher may be cheaper at low volume.", "kind": "debug"},
            {"q": "Why measure both models on the same hardware story?", "a": "A cold API vs a warm local GPU (or the reverse) lies about latency. State the conditions.", "kind": "recall"},
            {"q": "When does self-hosting win besides token price?", "a": "Data residency, predictable capacity, or adapter control. Those can justify a student even if API tokens look similar.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "copied-mistakes-low-diversity": note(
        what="""Two structural risks: the student **copies teacher mistakes** (and becomes confidently wrong), and **low-diversity synthetic** text **narrows** what the student can handle. Repeated synth-on-synth training is how you get **model collapse**: tails of the distribution vanish.

Diversity checks and human labels are not optional extras on teacher data. They are the whole defence.""",
        why="""On the job, a student that only understands teacher-polished English fails the first angry, bilingual, truncated ticket.

Interviews: name copied error and collapse. Mention a human holdout.""",
        how="""Defences:

- Filter teacher errors with the spec and a human sample.
- Diversity caps and n-gram drops.
- Mix in real edited logs, not only teacher prose.
- Never train a new teacher on the student’s outputs and loop.
- Eval on human gold, messy prompts, and a slice the teacher never saw.

Example. After two synth generations, unique openings collapse from 800 to 40. You stop, inject log_edit rows, and reset the teacher prompt. The student recovers tail labels.

A copied systematic miss (always swapping two labels) must be fixed in the teacher or the filter, not by hoping the student "generalises past" it.""",
        fails="""1. **Synth-on-synth loops.**

2. **Human eval only on teacher-like prompts.**

3. **Keeping known teacher bugs because volume.**""",
        line="I assume teacher data is biased and incomplete: I filter mistakes, enforce diversity, mix real logs, and I will not train on the student’s own outputs in a loop.",
        kps=[
            "Students copy teacher errors, often more confidently.",
            "Low-diversity synth narrows the tails.",
            "Synth-on-synth loops collapse the distribution.",
            "Mix real edited logs into the student set.",
            "Human eval on messy prompts the teacher did not polish.",
            "Fix systematic teacher bugs at the source.",
        ],
        qs=[
            {"q": "What is model collapse in distillation?", "a": "Repeated training on model-generated text that drops the tails of the real distribution. The student (and later teachers) only handle a few templates.", "kind": "recall"},
            {"q": "The teacher systematically swaps two labels. What does the student do?", "a": "Copies the swap, often more consistently. Filter or fix the teacher; do not hope the student unlearns a majority error.", "kind": "apply"},
            {"q": "After a second synth generation, tail accuracy dies. Cause?", "a": "Diversity collapse. Inject real logs, drop clones, and stop feeding the student its teacher-of-a-student.", "kind": "debug"},
            {"q": "Why mix log_edit rows into a teacher-heavy set?", "a": "They carry messy phrasing and true tails the teacher never writes. Without them the student is polite and brittle.", "kind": "recall"},
            {"q": "How do you eval for copied mistakes?", "a": "A human-labelled set, plus a slice of known teacher failure modes. If the student matches the teacher on those, you copied the bug.", "kind": "apply"},
        ],
        links=[HF_TRAIN],
    ),
    "teacher-terms-of-use": note(
        what="""Some providers **restrict using their outputs to train competing or replacement models**. Distillation can be a **contract** problem, not only a technical one. You check the teacher’s terms (and your counsel) **before** you generate 100k rows you cannot keep.

"The outputs are public on the user’s screen" is not a licence to train. Internal use versus a competing hosted model also differ. This is the same family of issue as licensed documents in SFT.""",
        why="""On the job, this is a stop-the-line check. A legal surprise after you have a student in prod is a bad week.

Interviews: mention terms unprompted. It reads as production sense.""",
        how="""Checklist:

- Read the teacher API terms and the "no model training / no competing model" clauses.
- If forbidden, pick a permissively licensed teacher, human data, or a vendor that allows it.
- Record the decision and the date; terms move.
- Do not hide origin in the dataset card. Opacity is not compliance.

Example. Provider A forbids training competing models. You use provider B or an open teacher whose licence allows it, or you hire humans for the 3k rows you actually need. You do not "anonymise" A’s outputs and hope.

If terms allow internal tuning but not a public rehost, that constraint belongs in the serve plan.""",
        fails="""1. **Asking engineering to decide licence.** Call legal.

2. **Generating first, asking later.** You may have to delete the set.

3. **Assuming open-weight teacher ⇒ free to do anything.** Check that licence too.""",
        line="I read the teacher’s terms before I generate training data. If they forbid training a replacement model, I change teacher or use humans — I do not hide the origin.",
        kps=[
            "Teacher outputs can be licence-restricted.",
            "Check before you generate a lake you cannot keep.",
            "Public on a screen is not a training licence.",
            "Record the terms decision and the date.",
            "Open-weight teachers have licences too.",
            "Do not 'anonymise away' a forbidden source.",
        ],
        qs=[
            {"q": "Why can teacher terms block distillation?", "a": "Some providers forbid using outputs to train competing or replacement models. The student is often exactly that. The clause is a legal gate, not a technical one.", "kind": "recall"},
            {"q": "Terms forbid training competing models. Best action?", "a": "Pick a permitted teacher or human data, and consult legal. Do not keep the forbidden rows under a new filename.", "kind": "apply"},
            {"q": "An engineer says outputs are 'public' so training is fine. Response?", "a": "Public display is not a training licence. Stop generation until counsel reads the terms.", "kind": "debug"},
            {"q": "What do you write on the dataset card about the teacher?", "a": "Provider, model id, date, and whether terms allowed this use. Opacity is not a control.", "kind": "recall"},
            {"q": "Open-weight teacher with a non-commercial licence. Can you distil a paid product?", "a": "Often no. Read that licence the same way you read an API TOS. Pick another teacher if the product is commercial.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "on-policy-student-inputs": note(
        what="""**On-policy student inputs** means you distil on **prompts from real traffic** (or a faithful simulator), not only the teacher’s favourite demos. The student’s train distribution should match what it will see. Teacher-chosen prompts are a marketing set.

This is the distillation version of "logs over lab benches".""",
        why="""On the job, demo-trained students fail the first empty subject line. You then blame the 3B.

Interviews: one sentence — traffic prompts, not teacher demos.""",
        how="""Sample prompts from the gateway log with the same slice mix you serve (or with tail upsampling). Run the teacher on those. Do not let the teacher invent the prompt list.

Example. Demo set is 200 clean tickets. Traffic is 40% incomplete, 10% not-English. You sample 10k log prompts, generate, filter. The student finally sees empty tickets. Demo-only would have scored 97% on demos and 60% in prod.

If logs contain PII, redact prompts the same way you redact any SFT source.""",
        fails="""1. **Teacher-written prompts only.**

2. **Logs from a different product surface.**

3. **Cherry-picking logs that already look like demos.**""",
        line="I distil on prompts from real traffic so the student’s training mix matches production. Teacher-chosen demos make a demo model.",
        kps=[
            "Prompts come from logs or a faithful simulator.",
            "Do not let the teacher pick the homework.",
            "Match or deliberately upsample production slices.",
            "Redact PII in log prompts.",
            "Demo-only sets lie about production quality.",
            "A different product surface is the wrong log.",
        ],
        qs=[
            {"q": "What does on-policy mean for distillation inputs?", "a": "The prompts are drawn from the distribution the student will serve — real traffic or a simulator of that traffic — not from the teacher’s demo list.", "kind": "recall"},
            {"q": "Teacher marketing set is 200 clean tickets. What do you add?", "a": "Log prompts with empties, tail labels, and messy language, then filter the teacher’s answers. Those are the rows that prevent a prod cliff.", "kind": "apply"},
            {"q": "Student is great on the notebook file and poor in the gateway. First suspicion?", "a": "Train prompts were demos. Compare n-grams to production logs and rebuild from traffic.", "kind": "debug"},
            {"q": "Why not let the teacher generate synthetic prompts too?", "a": "It will generate the prompts it is good at. You can use them as a supplement after diversity checks, not as the only source.", "kind": "recall"},
            {"q": "Logs are PII-heavy. How do you stay on-policy?", "a": "Redact consistently and keep the messy structure. Do not replace them with clean synthetic prompts just because redaction is work.", "kind": "apply"},
        ],
        links=[],
    ),
    "filter-then-train": note(
        what="""**Filter then train** is the hard rule: **teacher rows that fail your evals never become the student’s truth**. The filter runs **before** the optimiser, not as a hope after a bad student eval.

This is gold-spec-before-collection applied to a machine labeller that never gets tired and never feels shame.""",
        why="""On the job, post-hoc "we’ll drop the bad ones next version" means v1 is poisoned and v1 is what someone shipped.

Interviews: filter-then-train is a four-word policy.""",
        how="""The teacher writer writes to a staging table. `accept()` plus judges plus leak/diversity land accepted rows in `ds-*.accepted`. The trainer can only read that.

Example. Teacher F1 vs human gold on a sample is 88%. You drop the 12% fails (and a margin of low-confidence). The student trains on the 88% and beats a student trained on 100% raw teacher by 4 points on the human set.

Confidence: if the teacher emits a score or you have a checker, drop the bottom band even if they "look fine".""",
        fails="""1. **Trainer points at staging.**

2. **Filter only on schema, not on task correctness.**

3. **Using the student’s own eval to filter after training** as the first filter.""",
        line="Teacher rows pass my evals before they touch the student. The trainer cannot see staging. Filter then train, not train then regret.",
        kps=[
            "Failing teacher rows never enter the accepted set.",
            "The trainer only reads accepted, hashed data.",
            "Filter task correctness, not only schema.",
            "Drop low-confidence teacher rows when you can.",
            "v1 ships the set you filtered, not the dump.",
            "This is the spec-at-the-door rule for machines.",
        ],
        qs=[
            {"q": "What does filter-then-train forbid?", "a": "Using teacher outputs that fail your spec or evals as student gold. Filtering after a bad student run is too late for v1.", "kind": "recall"},
            {"q": "Teacher is 88% on a human sample. How do you use that?", "a": "Drop the known fails and a low-confidence band, train on the rest, and report both teacher and student on the same human set.", "kind": "apply"},
            {"q": "The trainer path still points at the raw dump. Risk?", "a": "Someone will rerun and poison the student. Lock the path to the accepted hash in the config.", "kind": "debug"},
            {"q": "Is schema-only filtering enough?", "a": "No. A well-formed wrong label is worse than a dropped row. Include task checks and an audit.", "kind": "recall"},
            {"q": "Where does the teacher writer write?", "a": "A staging table. Promotion to accepted is a separate job with accept() and audits.", "kind": "apply"},
        ],
        links=[],
    ),
    "student-versus-teacher-gap": note(
        what="""Always **report the student and the teacher on the same set** for **quality, latency, and cost**. The **gap** is the product. A student at 90% means nothing if you hide that the teacher is 93% or 80%. A student that is faster but 20 points worse is not a distillation win.

The gap also tells you whether to invest in more data, a bigger student, or a fallback.""",
        why="""On the job, hiding the teacher number is how a 80% student ships as "we distilled the good model".

Interviews: always say both numbers.""",
        how="""One table, one set, one date. Include slices. If the gap is all in one slice (languages, tail labels), you may keep the student on the easy body and route the slice to the teacher.

Example. Overall: teacher 93, student 90. Language X: teacher 91, student 70. You do not ship a monolingual lie. You either add X data, or you route X to the teacher, or you delay.

Re-run the table when either model or the set changes. A stale teacher number is a marketing slide.""",
        fails="""1. **Student-only dashboard.**

2. **Different sets for the two models.**

3. **Ignoring a slice gap because the mean looks fine.**""",
        line="I put teacher and student on one table: quality, latency, cost, and slices. The gap is the decision; a student number without the teacher is incomplete.",
        kps=[
            "Always report both models on the same set.",
            "Include quality, latency, cost, and slices.",
            "The gap decides data vs bigger student vs fallback.",
            "A slice gap can force routing, not a mean ship.",
            "Refresh the table when models or the set move.",
            "Hiding the teacher number is a reporting bug.",
        ],
        qs=[
            {"q": "Why report teacher and student on the same set?", "a": "So the quality gap is real. Different sets let you hide a weak student or a weak teacher. The product decision is the gap plus cost and latency.", "kind": "recall"},
            {"q": "Overall gap is 3 points; one language is 21. Action?", "a": "Do not ship a single number. Add data, route that language to the teacher, or delay. The mean is hiding the slice.", "kind": "apply"},
            {"q": "Dashboard shows only student F1 trending up. What is missing?", "a": "The teacher baseline on the same frozen set, plus latency and cost. The student may be chasing a moving test.", "kind": "debug"},
            {"q": "How does the gap guide the next experiment?", "a": "Small gap + high cost → ship or fallback. Large gap on one slice → data or route. Large gap everywhere → bigger student or stop.", "kind": "apply"},
            {"q": "Can you use teacher-as-judge to compute the gap?", "a": "Not as the only number. Teacher-as-judge measures imitation. Keep a human or independent set for the real gap.", "kind": "recall"},
        ],
        links=[],
    ),
    "licence-of-teacher-outputs": note(
        what="""**Licence of teacher outputs** is the explicit confirmation that **this** API or weight licence **allows training a competing or replacement model**. It is the operational twin of reading terms: a recorded yes/no, with a link and a date, on the dataset card.

If the answer is no, the pipeline does not generate. If the answer is "internal only", the student cannot become an external API.""",
        why="""On the job, verbal "I think it's fine" dies in due diligence. A card row survives.

Interviews: you can say you would block generation on a missing licence row.""",
        how="""Add `teacher_licence: {source, url, date, allowed: yes|no|internal}` to the card. CI for the generate job requires `allowed in {yes, internal}`. Product type must match (`internal` cannot publish).

Example. Counsel says "yes, internal student, no public rehost". You serve the student inside the VPC and you do not put it on a public marketplace. The card says so. A later PM cannot "just expose it" without seeing the row.

Re-check when you change teacher ids. A new SKU can have new terms.""",
        fails="""1. **One legal email in 2024, teacher changed in 2026.**

2. **Allowed=internal, marketing lists a public API.**

3. **No row, generation still runs.**""",
        line="I will not generate teacher data without a dated licence row that says this use is allowed. Internal-only means the student stays inside; I re-check when the teacher id changes.",
        kps=[
            "A dated allowed/internal/no row on the dataset card.",
            "Generation CI requires a passing licence row.",
            "Internal-only forbids a public student API.",
            "Re-check when the teacher SKU changes.",
            "A 2024 email is not a 2026 licence.",
            "This is the same discipline as document licences in SFT.",
        ],
        qs=[
            {"q": "What belongs in a teacher-licence card row?", "a": "Source, terms URL, date, and allowed yes/no/internal. Generation should refuse to run without it.", "kind": "recall"},
            {"q": "Licence is internal-only. Can marketing sell the student as an API?", "a": "No. Serve inside the allowed boundary. Changing the product requires a new licence review, not a new landing page.", "kind": "apply"},
            {"q": "You switched teacher SKUs and reused last year’s yes. Risk?", "a": "Terms may differ. Re-check and update the date or you are running on folklore.", "kind": "debug"},
            {"q": "Why put this in CI, not a wiki?", "a": "Wikis do not stop a generate job. CI does.", "kind": "recall"},
            {"q": "How is this different from 'teacher terms of use' as a concept?", "a": "Terms of use is the legal idea. This is the recorded, enforced artefact so the pipeline cannot 'forget' the idea.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "distill-versus-buy-a-smaller-api": note(
        what="""Before you distil, **compare a self-hosted student to the teacher’s own cheap small-model SKU** (and to other small APIs). Distillation has data, licence, and retrain tax. A small hosted model may already hit the bar at a similar price with no student to operate.

The comparison is an eval table, not a preference for GPUs.""",
        why="""On the job, teams distil for sport and then pay more than `gpt-x-mini` or a hosted 8B. The small SKU was the baseline they skipped.

Interviews: always include "buy the small API" as a column.""",
        how="""Four columns: big teacher, **small official SKU**, distilled student, student+fallback. Same set. Include ops burden as a qualitative fifth.

Example. Small official SKU: 89% , $2/1k, no ops. Student: 90%, $1.5/1k + a GPU owner. You may still buy the SKU. If residency forbids the SKU, the student wins even at 89%.

If the small SKU is 91% and the teacher is 93%, try prompting the small SKU harder before you distil the teacher at all.""",
        fails="""1. **Skipping the small SKU column.**

2. **Ignoring ops** in the student cost.

3. **Distilling because you already generated 50k rows.** Sunk cost.""",
        line="I compare a distilled student to the teacher’s cheap small SKU on the same eval before I pay the distillation tax. Sometimes I just buy the small model.",
        kps=[
            "Small official SKUs are a baseline, not an afterthought.",
            "Four columns: big teacher, small SKU, student, blend.",
            "Include ops burden, not only token price.",
            "Residency can force the student even if the SKU is good.",
            "Prompt the small SKU before you distil.",
            "Sunk teacher rows are not a reason to ship a student.",
        ],
        qs=[
            {"q": "What extra baseline belongs in a distillation bake-off?", "a": "The teacher vendor’s cheaper small-model SKU (and similar hosted small models), prompted well, on the same set as the student.", "kind": "recall"},
            {"q": "Small SKU is 89% at $2/1k with no ops; student is 90% at $1.5/1k plus a GPU owner. Lean?", "a": "Often buy the SKU unless residency or control requires the student. A point of F1 is rarely worth an unowned GPU.", "kind": "apply"},
            {"q": "You already paid to generate 80k teacher rows. Does that force distillation?", "a": "No. Sunk cost. If the small SKU wins the table, stop. Keep the rows as eval if licence allows.", "kind": "debug"},
            {"q": "When does the student beat a good small SKU anyway?", "a": "Data residency, need for adapters, or a unit-cost win after honest GPU utilisation — all measured, not assumed.", "kind": "recall"},
            {"q": "What should you try on the small SKU before distilling?", "a": "The same prompt/retrieval work you gave the big teacher. A weak prompt on the small SKU makes distillation look more necessary than it is.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
}
