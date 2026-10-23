from composer import sc
from helper import L

def Q(q, a, kind):
    return {"q": q, "a": a, "kind": kind}

def F(a, b, c):
    return f"1. **{a}**\n\n2. **{b}**\n\n3. **{c}**"

K = lambda *xs: list(xs)

SCENES = {
"m7-1": {
"pitfalls-of-vibe-testing": sc(
 why="""Vibe testing is trying a handful of prompts and shipping because it “feels good.” It is how most LLM features start and how silent regressions ship. Air Canada’s chatbot inventing a bereavement policy is the usual case study: a fluent answer, no stored cases, a real refund.

Interviews: vibe is exploration; it is fatal as a release gate.""",
 how="""Keep vibe for the first afternoon. The same day, freeze 20–30 cases with expected shape or a rubric. Next change runs the set. The Air Canada-style failure is a case you add after you read the news: “policy questions must cite the page or refuse.”

Reviewer drift is real: score with a checklist, not a mood.""",
 failures=F("Shipping on five demo wins.",
 "No stored baseline so you cannot diff last week.",
 "Treating a news incident as “won’t happen here” instead of a case."),
 line="""Vibe testing is for exploration. A release gate is a versioned set with a baseline. Fluent is not correct — ask Air Canada.""",
 walk="""You tweak a system prompt; three demos look better. The frozen set drops 8 points on refunds. You do not ship. A week later that drop would have been the support queue.""",
 follow="""They ask for the case study. Name a public chatbot policy failure and the missing artefact: a stored case with a citation rule.""",
 measure="""Share of changes gated by the set, regressions caught pre-ship, demo-only ships (0).""",
 kps=K("Vibe: small biased sample, no baseline, reviewer drift.","OK for exploration; fatal as a gate.","Store cases the day a second person uses the app.","Public incidents become cases.","Fluent ≠ correct.","Score with a checklist, not a mood."),
 qs=[Q("Why is vibe testing a poor release gate?", "Biased tiny samples, stochastic outputs, no baseline, reviewer drift. A versioned scored set is the gate.", "recall"),
     Q("You changed a prompt and five demos look better. What before shipping?", "Run the frozen set, compare to baseline by slice, look for regressions, then add the demos to the set.", "apply"),
     Q("What does a public chatbot policy failure teach?", "Fluent answers without a citation or refuse rule become company policy in the user’s eyes. Add that case.", "apply"),
     Q("What is reviewer drift?", "Your standard changing with mood and fatigue so today’s “good” is not last Tuesday’s.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"deterministic-vs-probabilistic-testing": sc(
 why="""Software tests assert equality. LLM tests usually cannot. Many wordings are correct; sampling changes them. You assert properties or scores and gate on a pass rate with tolerance.

Temperature 0 is not determinism across providers or versions.""",
 how="""Constrained output (label, JSON field): equality or schema. Free text: required facts, length, format, safety, or a rubric. Repeat n times if variance is high. Report 90% of cases passing, not “the test passed.”

Pin model versions. Treat flakes as measurement: more samples or a wider tolerance, not a retry-until-green.""",
 failures=F("Exact-match on summaries.",
 "Assuming temperature 0 is enough.",
 "Retrying CI until green without changing the assertion."),
 line="""I test properties and pass rates, not string equality, on free text. Temperature 0 reduces noise; it does not make a unit test deterministic.""",
 walk="""A summary test compared to one golden string and failed 1/10 in CI. You switch to “contains three action items, <120 words” and a 90% threshold. The flake ends; a real regression still fails.""",
 follow="""They ask about snapshots. Say: snapshots of properties, not of full prose.""",
 measure="""Flake rate, assertion type mix, pass-rate vs single-run gates.""",
 kps=K("Equality only for constrained outputs.","Free text: properties or rubrics.","Gate on pass rates with tolerance.","Temperature 0 ≠ determinism.","Do not retry-until-green.","Pin model versions."),
 qs=[Q("Why can't you simply assert equality on LLM summaries?", "Many correct wordings exist and sampling changes them. Assert properties or a rubric and gate on a pass rate.", "recall"),
     Q("A test passes locally but fails 1 in 10 in CI at temperature 0. What do you do?", "Treat it as variance. Repeat, set a threshold, pin versions, use property checks. Do not retry until green.", "debug"),
     Q("When is equality OK?", "Labels, enums, schema-valid JSON fields, exact numbers you required.", "apply"),
     Q("What does a 90% pass-rate gate mean?", "At least 90% of cases meet the property; you accept some sampling noise rather than demanding 100% identical strings.", "recall")],
 links=[L["oai_evals"], L["sklearn"]],
),
"model-evals-vs-application-evals": sc(
 why="""Model evals (MMLU, coding benches) ask how good a general model is. Application evals ask whether your prompt, retrieval, tools and format work on your data. Leaderboard rank does not transfer.

Shortlist with model evals; decide with application evals.""",
 how="""Use a leaderboard to pick 3–5 candidates that fit context, cost and capability. Run your 80-case set under the same prompts. Pick with quality/latency/cost. Re-run on every prompt or model change.

A coding champ that cannot emit your JSON is a failed application eval.""",
 failures=F("Swapping models because of a tweeted rank.",
 "No application set, so you cannot decide.",
 "Changing the prompt when you “compare” models."),
 line="""Model evals shortlist. Application evals decide. I never swap on a leaderboard rank alone.""",
 walk="""A new model leads a coding board. Your extract set drops 5 points on JSON. You do not swap. The write-up has both numbers.""",
 follow="""They ask if you ignore benches. No — you use them to not waste time on hopeless models.""",
 measure="""Candidates shortlisted vs decided, rank-only swaps (0).""",
 kps=K("Model evals: generic public tasks.","Application evals: your pipeline and data.","Rank does not transfer.","Same prompts when comparing models.","Shortlist then decide.","Re-run application evals on every change."),
 qs=[Q("What is the difference between a model eval and an application eval?", "Model evals measure general public tasks; application evals measure your system on your data. The first shortlists; the second decides.", "recall"),
     Q("A new model leads a coding leaderboard. Your team wants to swap now. What do you do?", "Run your application set on both under the same prompts. Compare quality, latency, cost, and slice regressions.", "apply"),
     Q("Why might a leaderboard winner fail you?", "Different prompts, formats, retrieval and data. Rank is not your pipeline.", "recall"),
     Q("When is a model eval enough?", "Never to ship. Only to drop candidates you will not bother testing.", "apply")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"the-end-to-end-evaluation-workflow": sc(
 why="""Eval is a loop: define behaviours, collect a dataset, pick methods, run, score, analyse, improve, gate, monitor, feed failures back. Skipping error analysis is how green metrics hide angry users.

Interviews: walk the loop and linger on error analysis.""",
 how="""Write the behaviours (correct, grounded, safe). Collect 50 real-ish cases. Pick programmatic + judge + some human. Run and store traces. Slice by intent. Read 20 failures. Change one thing. Diff the baseline. CI on the core set. Sample prod.

The artefact is the living dataset, not a one-off spreadsheet.""",
 failures=F("Metrics without reading failures.",
 "A dataset that never grows.",
 "No baseline so “improve” is a vibe."),
 line="""Define, dataset, methods, run, analyse, improve, gate, monitor. Error analysis decides the next metric. The set is a living artefact.""",
 walk="""Users hate missing citations. Your metrics were green on fluency. You add a citation check, 30 new cases from tickets, and a gate. The next prompt change cannot drop citations silently.""",
 follow="""They ask where to start. Thirty cases, one checker, run on every prompt change.""",
 measure="""Failures read per week, cases added from prod, gates that actually blocked.""",
 kps=K("The loop: define → data → methods → run → analyse → improve → gate → monitor.","Error analysis is the steering wheel.","The dataset is living.","Always diff a baseline.","CI on a core set.","Prod failures become cases."),
 qs=[Q("Walk through the end-to-end evaluation workflow.", "Define behaviours, build a dataset, pick methods, run and store, score and slice, read failures, change, rerun versus baseline, gate in CI, monitor and feed prod back.", "recall"),
     Q("Metrics are green but users complain. Which step was skipped?", "Error analysis and dataset realism. Sample prod, add those cases and criteria.", "debug"),
     Q("What is the smallest honest start?", "Thirty cases, expected shape, one checker, run on every prompt change.", "apply"),
     Q("What makes the dataset “living”?", "Versioned adds from prod failures, with a frozen core so trends stay comparable.", "apply")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"unit-slice-and-end-to-end-evals": sc(
 what="""**Test retrieval, generation and the product separately.** Unit (or component) evals score one piece: retriever recall, generator faithfulness on gold context. Slice evals score a subset (refunds, Hindi, long docs). End-to-end scores the user-visible answer.

You need all three or you cannot localise a drop.""",
 why="""This is the architecture of an eval suite. Interviewers ask why e2e alone is slow to debug. On the job a 4-point e2e drop that is actually retrieval is a week wasted if you only have e2e.""",
 how="""Same cases, three views. Retriever: gold chunk ids. Generator: gold context, score faithfulness. E2E: full pipeline. Slices: tag cases. A dashboard that cannot filter is a vanity chart.""",
 failures=F("Only e2e.",
 "Component wins that hide a bad interaction.",
 "Slices so small they are noise."),
 line="""I test retrieval, generation and the product separately, and I slice. E2E without components cannot localise; components without e2e miss interactions.""",
 walk="""E2E drops 5. Retriever recall is flat; generator on gold is down. You fix the prompt, not the index. Time-to-cause is an hour, not a week.""",
 follow="""They ask about cost. Component sets can be cheaper and run on every PR; e2e nightly.""",
 measure="""Time-to-localise a drop, slice coverage, interaction bugs only e2e caught.""",
 kps=K("Component, slice and e2e are all required.","Same cases, different views.","E2E localises poorly alone.","Components miss interactions.","Slices find hidden regressions.","Tier: cheap components on PR, e2e nightly."),
 qs=[Q("Why test retrieval, generation and the product separately?", "To localise a drop: recall vs faithfulness vs user-visible quality. E2E alone cannot say which broke.", "recall"),
     Q("E2E dropped. What do you run next?", "Component evals on the same cases — retriever and generator — plus slices.", "apply"),
     Q("A component is green and e2e is red. What is that?", "An interaction failure (assembly, truncation, order). Debug the pipeline.", "debug"),
     Q("What is a slice eval?", "The same metrics on a tagged subset: intent, language, length, a known hard class.", "recall"),
     Q("How do you cost-control the suite?", "Components on PRs, full e2e nightly, slices in both if they are cheap enough.", "apply")],
 links=[L["ragas"], L["oai_evals"]],
),
"vibe-testing-as-a-prototype-only": sc(
 what="""**Pair vibe testing with a frozen set the moment a second person uses the app.** That is the operating rule. One builder clicking around is fine. The second person is a user; their cases go into a file with a date.

If you wait for “later,” you will ship on vibes.""",
 why="""This is the practical closer to the vibe-testing topic. Interviews love a trigger: second user, first ticket, first prompt change — freeze.""",
 how="""Trigger events: second account, first external ticket, first A/B, first model bump. Action: 20 cases in git, a one-command run, a baseline number in the README.

Vibe can continue beside the set. It just cannot be the gate.""",
 failures=F("Waiting for 1,000 cases before any set.",
 "A set that lives in one person’s notes app.",
 "Second user arrived and nobody froze."),
 line="""Vibe until the second person shows up. Then a frozen set in git is the gate. Vibe may continue; it does not ship.""",
 walk="""A teammate tries the bot and finds a refund miss. You add 15 of their prompts that day. The next prompt tweak is gated. That is the culture.""",
 follow="""They ask how many cases. Start 20–30. Grow from failures. Do not wait for perfect.""",
 measure="""Time from second user to first frozen set, cases in git, vibe-only ships after that (0).""",
 kps=K("Second user is the trigger to freeze.","20–30 cases in git beat a perfect plan.","Vibe may continue; it is not the gate.","One-command run in the README.","Notes-app sets do not count.","Do not wait for 1,000 cases."),
 qs=[Q("When must vibe testing stop being the gate?", "The moment a second person uses the app — freeze a set that day.", "recall"),
     Q("What is the smallest frozen set?", "About 20–30 cases in git with a one-command run and a baseline number.", "apply"),
     Q("May you still vibe after that?", "Yes, for exploration. Not for the ship decision.", "apply"),
     Q("The set lives in a Slack thread. Problem?", "It is not versioned or runnable. Put it in git.", "debug"),
     Q("Why not wait for a huge set?", "You will ship on vibes while you wait. Grow from failures.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"interview": sc(
 what="""The interview one-liner for your first eval: **30 cases, expected shape, one judge or checker, run on every prompt change.** Say it, then add “baseline stored, slice if I can, error analysis weekly.”

Do not start with a vendor platform.""",
 why="""This is the Level 7 opener. Juniors describe RAGAS. Seniors describe a file and a command. On the job this is also how you start Monday.""",
 how="""Thirty real or realistic inputs. Expected: a label, a JSON schema, a must-include list, or a 1–5 rubric. Checker: code first, judge if you must. `make eval` on every prompt PR. Paste the number in the PR.

Have a 60-second story of a change the set blocked.""",
 failures=F("Leading with a platform logo.",
 "30 synthetic twins of one prompt.",
 "A set you do not run on every change."),
 line="""My first eval is 30 cases, an expected shape, one checker, run on every prompt change. The baseline lives next to the prompt.""",
 walk="""In a screen you open `eval/cases.json` and `make eval`. A prompt PR shows −4 on refunds. That is the interview.""",
 follow="""They ask about judges. You say you calibrate or you prefer code when you can.""",
 measure="""Whether you can run the set in one command in the interview.""",
 kps=K("30 cases, expected shape, one checker.","Run on every prompt change.","Code before a judge.","Baseline stored.","Have a story the set blocked.","No vendor-first answer."),
 qs=[Q("What is the interview one-liner for a first eval?", "30 cases, expected shape, one judge or checker, run on every prompt change.", "recall"),
     Q("What is “expected shape”?", "A label, schema, must-include list, or a short rubric — something a checker can score.", "recall"),
     Q("When do you introduce a vendor eval platform?", "After the file and the command exist. The platform is optional plumbing.", "apply"),
     Q("30 near-duplicate cases — is that a first eval?", "No. Diversity matters more than count. Include hard and recent misses.", "debug"),
     Q("Where does the baseline live?", "Next to the prompt, in git, shown on the PR.", "apply")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"who-owns-the-golden-set": sc(
 what="""**Product plus engineering; it is a living artefact, not a data-science side quest.** Product owns which behaviours matter and which failures hurt. Engineering owns format, runners, gates. Together they add cases from tickets. A set owned only by an ML person dies when they are busy.""",
 why="""Ownership is why sets rot. Interviews: name two roles. On the job, put the path in the team charter.""",
 how="""RACI: product = criteria and priority slices; eng = schema, CI, PII hygiene; both = weekly add-from-tickets. The set has a README with owners.

Legal/privacy reviews PII. Nobody “owns the vibes.”""",
 failures=F("DS-only ownership.",
 "Product dumps screenshots into a folder with no schema.",
 "No owner so nobody updates after launch."),
 line="""The golden set is a product+engineering artefact. I can name the owners. It is not a side quest and it does not live in one notebook.""",
 walk="""You add `CODEOWNERS` on `eval/`. A ticket cannot close without a case if it was a model miss. Six months later the set still matches the product.""",
 follow="""They ask about data science. They contribute judges and analysis; they do not disappear with the only copy.""",
 measure="""Cases added per month, owner response time, orphan sets.""",
 kps=K("Product + engineering own the set.","Product: behaviours and slices.","Eng: schema, CI, PII.","Both: add from tickets.","Not a DS-only side quest.","CODEOWNERS / README names humans."),
 qs=[Q("Who owns the golden set?", "Product and engineering together. It is a living artefact, not a data-science side quest.", "recall"),
     Q("What does product own versus eng?", "Product: which behaviours and slices matter. Eng: format, runner, gates, PII hygiene. Both add cases.", "apply"),
     Q("The only copy is in an intern’s Colab. Risk?", "The set dies when they leave and nobody can run the gate.", "debug"),
     Q("Must every ticket become a case?", "Every model-miss ticket should be considered. Noise tickets need not.", "apply"),
     Q("Where is ownership written?", "README and CODEOWNERS on the eval path.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
},
"m7-2": {
"programmatic-human-llm-as-a-judge": sc(
 why="""Three execution mechanisms: programmatic (code, schema, tests), human (labels, review), LLM-as-judge (a model scores with a rubric). Pick the cheapest that matches the behaviour. Interviews: programmatic first.""",
 how="""JSON valid? Code. Code works? Tests. Tone? Rubric + humans then a judge you calibrated. Do not judge what a regex can do.

A judge is another system: version it, calibrate it, budget it.""",
 failures=F("Judge for schema validity.",
 "Humans on every batch with no rubric.",
 "Uncalibrated judge as the only gate."),
 line="""Programmatic first, humans for new failure types, judges for scale after calibration. I do not pay a model to check JSON.""",
 walk="""You replace a fluency judge with a schema check and a must-include list. Cost drops 80%; a real tone issue still goes to a calibrated judge on a sample.""",
 follow="""They ask if judges replace humans. No. They extend a calibrated rubric.""",
 measure="""Share of checks that are code vs judge vs human, judge-human agreement.""",
 kps=K("Three mechanisms: code, human, judge.","Code first.","Humans invent new failure types.","Judges scale a rubric after calibration.","A judge is a versioned system.","Do not judge what code can decide."),
 qs=[Q("Which signal is cheapest for valid JSON with required fields?", "Schema validation in code.", "apply"),
     Q("When do you use a human?", "To define new failure types and to calibrate a judge — not to tick 1,500 obvious format checks.", "recall"),
     Q("What must you do before trusting a judge?", "Spot-check against humans and version the judge prompt.", "apply"),
     Q("A judge scores schema. What do you do?", "Delete it. Use a validator.", "debug")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"reference-based-vs-reference-free": sc(
 why="""Reference-based scores against a gold answer (exact, F1, entailment). Reference-free scores against criteria or context (faithfulness to retrieved text, safety) with no gold string. Live traffic usually has no gold.

Use both: gold where you have it; criteria online.""",
 how="""Offline: a labelled set with references for correctness. Online: faithfulness, toxicity, format — no gold needed. Do not force exact match on paraphrases; use semantic equivalence or multiple references.""",
 failures=F("Exact match on valid paraphrases.",
 "No reference-free metrics online so you are blind.",
 "A “gold” written by the model under test."),
 line="""References when I have them; criteria when I do not. I do not punish valid paraphrase with exact match, and I do not let the candidate write the gold.""",
 walk="""A correct paraphrase scored 0 on BLEU-ish overlap. You switch to a claim checklist. The metric stops lying.""",
 follow="""They ask about embeddings as similarity. Use carefully; they can reward fluent off-topic text.""",
 measure="""False fails on paraphrase, online coverage with reference-free metrics.""",
 kps=K("Reference-based needs gold.","Reference-free uses criteria or context.","Online is mostly reference-free.","Do not exact-match paraphrases.","The candidate must not write the gold.","Embeddings can reward fluent irrelevance."),
 qs=[Q("You monitor live traffic with no ground truth. Which approach fits?", "Reference-free criteria such as faithfulness to context and safety.", "apply"),
     Q("A correct paraphrase is scored wrong. Fix?", "Semantic equivalence, multiple references, or a claim checklist — not exact match.", "debug"),
     Q("Why not let the candidate model write the gold?", "It will favour its own style and hide its failures.", "recall"),
     Q("When is reference-based required?", "When you must know factual correctness against a known answer, not just faithfulness to retrieved text.", "apply")],
 links=[L["ragas"], L["hf_eval"]],
),
"when-a-golden-dataset-is-required": sc(
 why="""A golden set (inputs + expected answers or criteria) is required when you compare versions, gate releases, or measure correctness. Pure judge-on-the-fly cannot give you a stable baseline if the judge or the traffic mix moves.

You can judge without gold for monitoring; you cannot do apples-to-apples without a frozen set.""",
 how="""Build gold for: model/prompt bake-offs, CI gates, factual tasks (SQL, rates). Skip gold for: exploratory UX, one-off red-teams (use notes). Mix: a frozen core plus a growing pool.

Size: enough to slice. 30 is a start; 200 with tags is a suite.""",
 failures=F("Gating on a live judge with no frozen cases.",
 "A 1,500-case set of duplicates.",
 "Gold that is stale relative to the product."),
 line="""I need a golden set to compare and to gate. A live judge without frozen cases cannot tell me if I got better. Diversity beats raw count.""",
 walk="""You try to compare two prompts on today’s traffic. The mix shifted. You cannot tell. You go back to a 120-case gold core and the comparison is real.""",
 follow="""They ask if gold must include full answers. Criteria can be enough if they are specific.""",
 measure="""Frozen-core size, duplicate rate, age of cases vs product.""",
 kps=K("Gold is required to compare and to gate.","Live judges monitor; they do not replace a frozen core.","Diversity > count.","Criteria can stand in for full answers.","Keep a frozen core as the product changes.","Do not gold-label the candidate’s own outputs as truth."),
 qs=[Q("When is a Golden Dataset required versus LLM judgment only?", "Required for bake-offs, CI gates and correctness. Judgment-only can monitor live traffic but cannot give a stable comparison.", "recall"),
     Q("A 1,500-case set scores 98% but users fail. Likely cause?", "Near-duplicates and missing real edges. Coverage beats count.", "debug"),
     Q("Can criteria replace full gold answers?", "Yes, if they are specific (must include X, must not promise Y).", "apply"),
     Q("Why keep a frozen core as the set grows?", "So trend lines are comparable and you cannot tune against the whole moving set.", "apply")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"matching-method-to-behaviour": sc(
 why="""Match the method to the behaviour: deterministic → code; semantic → overlap/entailment/judge; subjective → rubric + human/judge; operational → systems metrics. A mismatch is wasted spend or a lying number.""",
 how="""Write the behaviour first. “Valid JSON” is deterministic. “Same meaning as gold” is semantic. “Polite” is subjective. “p95 < 2s” is operational. Then pick.

A table in the eval README: behaviour → method → owner.""",
 failures=F("Judge on latency.",
 "BLEU on a chatbot’s empathy.",
 "No operational metrics at all."),
 line="""I match method to behaviour: code for deterministic, semantic checks for meaning, rubric for taste, systems metrics for ops. Mismatches lie.""",
 walk="""A team judged “is JSON valid?” You replace it with a parser. They judged latency too. You move that to p95 in the same dashboard.""",
 follow="""They ask about hybrid. Yes: code AND a rubric on the same case.""",
 measure="""Mismatched methods retired, table completeness.""",
 kps=K("Behaviour first, method second.","Deterministic → code.","Semantic → entailment/judge/overlap.","Subjective → rubric.","Operational → systems metrics.","Write the mapping in the README."),
 qs=[Q("How do you choose an evaluation method?", "By the behaviour: deterministic, semantic, subjective or operational — then the cheapest fitting method.", "recall"),
     Q("Code generation should most reliably be evaluated by?", "Executing unit tests against the generated code.", "apply"),
     Q("A judge scores p95 latency. Verdict?", "Wrong method. Use system metrics.", "debug"),
     Q("Can one case use two methods?", "Yes. Schema in code and a tone rubric on the same output.", "apply")],
 links=[L["oai_evals"], L["sklearn"]],
),
"llm-as-judge-calibration": sc(
 what="""**Spot-check the judge against humans before you trust the score.** Calibration is agreement (and disagreement analysis) on a labelled sample. An uncalibrated judge is a second stochastic system you happened to treat as truth.

Re-calibrate when you change the judge prompt, the model, or the product.""",
 why="""This is the interview follow-up to “we use a judge.” They want kappa or at least a confusion table, and a story of a bias you found (length, position, verbosity).""",
 how="""Label 100 cases with two humans. Run the judge. Report agreement, slices where it fails. Fix the rubric. Freeze the judge version. Re-score the baseline when the judge changes so you do not mistake judge drift for product drift.""",
 failures=F("Never comparing to humans.",
 "Changing the judge and celebrating a +8.",
 "One human labeler as “truth” with no overlap."),
 line="""I calibrate the judge on a human sample, I version it, and I re-score the baseline when it changes. An uncalibrated score is not a gate.""",
 walk="""The judge loved long answers. Humans did not. You add a length-neutral rubric. Agreement rises; the product stops padding.""",
 follow="""They ask for a number. Pair agreement and a slice table beat a single accuracy.""",
 measure="""Judge-human agreement, judge-version diffs on frozen traces.""",
 kps=K("Calibrate against humans before gating.","Use two human labelers when you can.","Version the judge.","Re-score baselines on judge change.","Watch length and position bias.","Uncalibrated judges are not truth."),
 qs=[Q("An LLM judge was never compared to humans. Main risk?", "Its biases and misalignment go unnoticed, so scores may not mean what you think.", "recall"),
     Q("The quality dashboard dropped 8 after you changed the judge prompt. First step?", "Re-score the same traces with old and new judge to separate evaluator drift from product drift.", "debug"),
     Q("What do you report from calibration?", "Agreement, a confusion or slice table, and known biases.", "apply"),
     Q("Why two human labelers?", "To estimate human noise so you do not expect the judge to exceed it.", "apply"),
     Q("May an uncalibrated judge still explore?", "Yes, for triage. Not as a release gate.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"exact-match-vs-rubric": sc(
 what="""**Use code for format; use a rubric for quality.** Exact match (or schema, or unit tests) owns deterministic properties. A rubric owns graded quality (completeness, tone, groundedness). Mixing them — a judge that also “checks JSON” — wastes money and hides format bugs in a 1–5 score.""",
 why="""This is the method-matching closer. Interviews: two columns. On the job the PR checklist says which is which.""",
 how="""Pipeline: parse/validate first (fail fast). Only valid outputs get a rubric. Report both numbers. A format fail is not a 2/5; it is a 0 on format.

Rubric dimensions are few and defined. “Good” is not a dimension.""",
 failures=F("One 1–10 score for everything.",
 "Exact match on tone.",
 "Rubric on JSON validity."),
 line="""Code owns format. A rubric owns quality. I fail-fast on schema, then I score the rest. I do not bury a parse error in a 3/5.""",
 walk="""You split a 1–10 judge into schema-pass % and a 3-dimension rubric. A prompt change that broke JSON is now obvious instead of a mild score dip.""",
 follow="""They ask how many rubric dimensions. Three to five; more and judges disagree.""",
 measure="""Format-fail rate separate from quality, judge disagreement by dimension.""",
 kps=K("Code for format; rubric for quality.","Fail-fast on schema.","Do not bury parse errors in a Likert.","Few defined rubric dimensions.","Exact match is wrong for tone.","Report both numbers."),
 qs=[Q("When do you use exact-match versus a rubric?", "Exact-match or schema for format and constrained fields; a rubric for graded quality.", "recall"),
     Q("A 1–10 score dropped 0.4 when JSON broke. What was wrong?", "Format was buried in a quality score. Split them; fail-fast on schema.", "debug"),
     Q("How many rubric dimensions?", "About three to five, defined. “Good” is not one.", "apply"),
     Q("May unit tests replace a rubric for code gen?", "For behaviour, yes. You may still rubric style separately.", "apply"),
     Q("Why fail-fast on format?", "So you do not pay a judge and so the dashboard shows the real bug.", "recall")],
 links=[L["oai_evals"], L["sklearn"]],
),
"interview": sc(
 what="""The method-picking one-liner: **programmatic first, human for new failure types, judge for scale.** Add: calibrate the judge, match method to behaviour, never judge JSON.

This is the M7.2 interview close.""",
 why="""They will give you a behaviour and wait. Start with code. Mention humans as taxonomy. Mention judges last, with calibration.""",
 how="""Practice on four behaviours: schema, factual with gold, tone, p95. Your answers should be: parser; reference metric or claim check; rubric+human then judge; timer.

Have a story where you deleted a judge.""",
 failures=F("Judge-first answer.",
 "Forgetting operational metrics.",
 "No calibration mention."),
 line="""Programmatic first, humans for new failures, judge for scale after I calibrate. I match method to behaviour and I can name one judge I deleted.""",
 walk="""They say “eval this support bot.” You list format checks, a 40-case gold, a tone rubric sampled to humans, p95, then a judge on the rest. They stop asking.""",
 follow="""They push a platform. You say it can run those methods; it does not choose them.""",
 measure="""Whether your last design doc used this order.""",
 kps=K("Programmatic first.","Humans for new failure types.","Judge for scale, calibrated.","Match method to behaviour.","Delete judges that code can replace.","Platforms run methods; they do not pick them."),
 qs=[Q("What is the interview line for picking an eval method?", "Programmatic first, human for new failure types, judge for scale — after calibration.", "recall"),
     Q("They ask you to eval a support bot. What do you list first?", "Format/schema checks and operational metrics, then gold cases, then a rubric/judge.", "apply"),
     Q("When do you mention a vendor platform?", "After the methods. The platform is plumbing.", "apply"),
     Q("You used a judge for JSON. What do you say in the interview?", "That you would delete it now — that is the seniority signal.", "debug"),
     Q("Where do humans still sit after you have a judge?", "New failure types and periodic calibration samples.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
},
"m7-3": {
"offline-suites-for-pre-release-testing": sc(
 why="""Offline suites are the frozen cases you run before a release: version compare, experiment, regression. They are the only way to say “this prompt is better” without waiting for users.

They cannot see provider drift after you ship — that is online.""",
 how="""A versioned set, a pinned model id, a command in CI. Compare to the last shipped baseline. Block on a statistically meaningful drop plus any P0 slice.

Keep the suite small enough to run on a PR (smoke) and a full nightly.""",
 failures=F("A suite nobody runs.",
 "Blocking on one flaky case.",
 "No baseline to compare."),
 line="""Offline suites gate releases. I run them on a pinned setup, diff the last shipped baseline, and I know they will not see post-ship provider drift.""",
 walk="""A prompt PR drops the refund slice 6 points. CI fails. You fix before users see it. That is the suite earning its keep.""",
 follow="""They ask about size. Smoke 20 on PR, 150 nightly.""",
 measure="""PRs blocked, time to run, flakes.""",
 kps=K("Offline = frozen cases before release.","Diff the last shipped baseline.","Smoke on PR, full nightly.","Will not see post-ship provider drift.","Do not block on one flake.","P0 slices can block alone."),
 qs=[Q("What is an offline suite for?", "Pre-release testing, version comparison, experiments and regression — on frozen cases.", "recall"),
     Q("What can a purely offline suite not detect?", "A hosted model silently updated after release, or a traffic mix shift.", "apply"),
     Q("How do you stop flakes from blocking everything?", "Thresholds with tolerance and a smoke/full split.", "debug"),
     Q("What is the baseline?", "The last shipped prompt/model/config scores on the same set.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"post-deployment-production-risks": sc(
 why="""After you ship: unexpected inputs, systematic failures that emerge at scale, changing user behaviour, data drift, provider model swaps. Offline cannot see these. Online and feedback loops can.

Interviews: name four risks and one control each.""",
 how="""Unexpected inputs: log and sample. Systematic fails: slice dashboards. Behaviour change: track intent mix. Drift: retrieval hit-rate and embedding-space alarms. Provider swap: pin versions or detect id changes.

Each risk has an owner and a page.""",
 failures=F("“We have an offline suite” as the whole production story.",
 "No slice so a 2% toxic intent is invisible.",
 "Unpinned model ids."),
 line="""Production adds unexpected inputs, emergent failures, mix shift and drift. I sample, slice, pin versions, and I feed misses back offline.""",
 walk="""A provider silently updates. Your online faithfulness dips. An alert fires. You pin and roll back. Offline would have caught it only next week.""",
 follow="""They ask about drift vs mix. Drift is the world changing; mix is who shows up. Both move scores.""",
 measure="""Time-to-detect a silent model change, slice coverage, unpinned ids.""",
 kps=K("Risks: unexpected inputs, emergent fails, mix shift, drift, provider swaps.","Controls: sample, slice, pin, alert.","Offline cannot see these alone.","2% slices need their own view.","Feed misses back to gold.","Owners and pages."),
 qs=[Q("Name post-deployment risks offline suites miss.", "Unexpected inputs, emergent systematic failures, changing mix, data drift, silent provider updates.", "recall"),
     Q("A hosted model updates after release. How do you notice?", "Online quality metrics and a pinned-id check — not the frozen suite alone.", "apply"),
     Q("Mix shifted toward a weak slice. Offline is flat. Why?", "The frozen set does not match today’s mix. Online slices show it.", "debug"),
     Q("What is the control for unexpected inputs?", "Log, sample, and add representatives to gold.", "apply")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"system-metrics-vs-quality-metrics": sc(
 why="""Latency, tokens, errors are system metrics. Hallucination, relevance, correctness are quality metrics. Green systems can still be wrong. Interviews: both on the same dashboard.""",
 how="""System: p50/p95 latency, error %, tokens, $. Quality: sampled scores (faithfulness, task success). Never let an SLO of 200 OK hide a 30% wrong-answer rate.

Quality is usually sampled and async. System is full-traffic.""",
 failures=F("Only system dashboards.",
 "Inline quality judges on every request (latency+cost).",
 "Averaging quality without slices."),
 line="""I show system and quality together. A fast 200 can still be wrong. Quality is sampled; latency is not a quality proxy.""",
 walk="""Ops says the service is healthy. Users complain. You add sampled faithfulness. It is 0.62. Now everyone sees the same fire.""",
 follow="""They ask why p95 not mean. Tails hide in means.""",
 measure="""Dashboards that include both, inline-judge rate (should be low).""",
 kps=K("System ≠ quality.","Fast 200 can be wrong.","Quality is sampled async.","p95 over mean for latency.","Same dashboard.","Do not inline-judge every request."),
 qs=[Q("Dashboards show low latency and 0% errors, yet answers are wrong. What is missing?", "Quality metrics on sampled traffic — faithfulness, correctness.", "debug"),
     Q("Why is p95 latency preferred over mean?", "Tails hurt users and disappear in the mean.", "recall"),
     Q("Where should LLM-judge scoring run online?", "Asynchronously on a sample, not inline before every response.", "apply"),
     Q("Is token count a quality metric?", "No. It is a cost/system metric that can correlate either way.", "recall")],
 links=[L["oai_evals"], L["sklearn"]],
),
"continuous-online-evaluation-pipeline": sc(
 why="""Online eval is a pipeline: log traces, sample, score, dashboard, alert. It is how you notice drift on Tuesday, not at the next quarterly offline run.

Sampling and async scoring keep it cheap.""",
 how="""Log redacted traces. Sample 5–10% or all of a P0 slice. Score async. Dashboard by slice. Alert on a drop versus a rolling baseline, after you rule out judge changes.

Feed a tagged miss into the gold set automatically as a candidate.""",
 failures=F("Logging without sampling policy (cost or gaps).",
 "Alerting on the judge version bump.",
 "No PII policy on traces."),
 line="""Online eval is log, sample, score async, dashboard, alert. I version the scorer so I do not page myself for a rubric change.""",
 walk="""You sample 8%. A slice alert fires at −7. The judge version is unchanged. You roll back a prompt. The candidate gold cases from that hour become tomorrow’s offline adds.""",
 follow="""They ask 100% scoring. Only if cheap code checks; judges stay sampled.""",
 measure="""Coverage %, alert precision, time-to-detect a real drop.""",
 kps=K("Log, sample, async score, dashboard, alert.","Version the scorer.","P0 slices can be 100% if cheap.","PII policy on traces.","Misses become gold candidates.","Do not page on judge edits."),
 qs=[Q("What are the stages of an online eval pipeline?", "Production logging, sampling, scoring, dashboarding and alerting — plus feedback into gold.", "recall"),
     Q("Why version the online judge?", "So a rubric change is not mistaken for a product drop.", "apply"),
     Q("100% judge coverage — when?", "Rarely. Prefer 100% on cheap code checks; sample expensive judges.", "apply"),
     Q("Traces contain emails. What first?", "Redact and lock access before you scale sampling.", "debug")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"feeding-failures-back-offline": sc(
 why="""A production miss that never becomes an offline case will recur. The loop closes when someone (or a job) adds a redacted, labelled case to gold.

This is the “self-improving set” habit at the online/offline boundary.""",
 how="""Triage: is it a model miss? Redact. Label expected criteria. Open a PR to `eval/cases`. Tag the slice. The next CI run includes it.

A thumbs-down with retrieved context is almost a case already — do not throw the context away.""",
 failures=F("A graveyard of thumbs-down with no cases.",
 "Adding raw PII to git.",
 "Adding 200 near-duplicates from one incident."),
 line="""Every important prod miss becomes a redacted gold case. Thumbs-down plus context is tomorrow’s offline item. I do not hoard unlabelled traces.""",
 walk="""A week of refund misses becomes 12 cases. The next prompt PR fails until it handles them. Recurrence stops.""",
 follow="""They ask about automation. Auto-open a draft case; a human still labels.""",
 measure="""Miss-to-case time, recurrence of the same miss, PII in git.""",
 kps=K("Prod misses become gold.","Redact first.","Keep retrieved context with the case.","Human labels; jobs can draft.","Avoid duplicate floods.","The next CI must include them."),
 qs=[Q("What is the best use of a production failure after triage?", "Anonymise and add it with a label to the golden dataset as a regression case.", "apply"),
     Q("A thumbs-down without context — enough?", "Better with the retrieved context and the prompt. Save those fields.", "debug"),
     Q("Who labels?", "A human (often eng+product). A job may draft the file.", "recall"),
     Q("Why not add every thumbs-down automatically as gold truth?", "Thumbs are noisy. Triage first or you poison the set.", "apply")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"online-shadow-traffic": sc(
 what="""**Score production inputs without changing the user reply.** Shadow (or dark) traffic copies the request to a candidate prompt/model and scores both. The user still sees the control. You learn whether the candidate is safer before you flip.

This is A/B without the user risk.""",
 why="""Interviews: how to test a new prompt on real mix without shipping it. Shadow is the answer. On the job it also protects you from a candidate that is great offline and rude online.""",
 how="""At request time, enqueue a copy. A worker runs the candidate. Store both outputs and scores. Never send the candidate to the user until a promotion rule fires.

Cap shadow QPS so you do not double-bill yourself into ruin.""",
 failures=F("Shadow that accidentally replies.",
 "No QPS cap.",
 "Comparing on different traces so it is not a pair."),
 line="""Shadow scores real inputs on a candidate without changing the user reply. I pair the outputs, I cap QPS, and I promote only after the comparison.""",
 walk="""A new groundedness prompt looks good offline. Shadow on 5% shows +0.04 faithfulness and +200ms. You promote for the P0 slice only.""",
 follow="""They ask vs A/B. A/B changes some users’ replies. Shadow does not.""",
 measure="""Shadow leak to users (0), paired coverage, $ of shadow traffic.""",
 kps=K("Shadow copies the request; the user still sees control.","Pair outputs for comparison.","Cap QPS and $.","Never leak the candidate reply.","Promote by rule, not vibe.","A/B is the next step if you need user-visible effects."),
 qs=[Q("What is online shadow traffic?", "Scoring production inputs on a candidate system without changing the user-visible reply.", "recall"),
     Q("How does it differ from A/B?", "A/B shows some users the candidate. Shadow never does.", "apply"),
     Q("The candidate reply was sent to a user. What failed?", "The shadow path was wired to the response. Split the pipes.", "debug"),
     Q("Why cap shadow QPS?", "You roughly double model spend. A cap keeps the experiment solvent.", "apply"),
     Q("What do you store?", "Paired control/candidate outputs, scores, and ids — redacted.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"feedback-that-becomes-a-case": sc(
 what="""**A thumbs-down with the retrieved context is tomorrow’s offline item.** Feedback without context is a mood. Feedback with the prompt, the chunks, the output and the user id (redacted) is a draft case.

Close the loop in one business day if you can.""",
 why="""This is the product phrasing of feeding failures back. Interviews want the fields you store on a thumbs-down.""",
 how="""On downvote: snapshot `{input, context_ids, output, tools, user_hash, ts}`. Queue for triage. Label. PR. Do not store raw PII.

A thumbs-up can still yield a case if it is a rare good example of a hard slice.""",
 failures=F("Thumbs with no snapshot.",
 "Snapshots with raw cards.",
 "A queue nobody triages."),
 line="""I snapshot input, context, output and tools on a thumbs-down. That snapshot is a draft gold case after redact and label.""",
 walk="""You add the snapshot. Triage takes 10 minutes a day. Twelve cases a week enter gold. Recurrence of the same downvote reason falls.""",
 follow="""They ask about implicit feedback (edits, re-asks). Those are snapshots too.""",
 measure="""Snapshot completeness, triage lag, cases landed per week.""",
 kps=K("Downvote + context = draft case.","Snapshot input, chunks, output, tools.","Redact PII.","Triage daily.","Re-asks and edits are feedback too.","A queue without an owner is waste."),
 qs=[Q("Which fields turn a thumbs-down into a future case?", "Input, retrieved context, output, tools, timestamp — then a human label after redact.", "recall"),
     Q("A thumbs-down with nothing stored — useful?", "As a rate, not as a case. Snapshot the context.", "debug"),
     Q("May a thumbs-up become a case?", "Yes, as a hard-slice positive if you are short on goods.", "apply"),
     Q("What implicit signals are worth snapshotting?", "Re-asks, user edits, immediate abandon.", "apply"),
     Q("Who owns the triage queue?", "The same product+eng owners as the golden set.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"interview": sc(
 what="""The offline vs online one-liner: **offline gates a release; online tells you the mix shifted.** Add shadow for candidates and “prod miss → gold case.”

Do not say one replaces the other.""",
 why="""Classic interview pair. Juniors pick a favourite. Seniors use both and name what each cannot see.""",
 how="""Thirty seconds: offline frozen set in CI; online sample + slices; shadow before promote; misses return to gold. Name one thing each cannot see (provider drift vs unseen intents in gold).""",
 failures=F("“Online is enough.”",
 "“Offline is enough.”",
 "No mention of mix shift."),
 line="""Offline gates a release. Online tells me the mix shifted. I use both, I shadow candidates, and I feed misses back.""",
 walk="""They ask which to build first. Offline this week; online logging this week; scoring online next. You do not wait for a platform.""",
 follow="""They ask about shadow vs A/B. You have the line.""",
 measure="""Whether your design uses both words correctly.""",
 kps=K("Offline gates.","Online watches mix and drift.","Neither replaces the other.","Shadow before promote.","Misses return to gold.","Build logging even before fancy scores."),
 qs=[Q("What is the interview line for offline vs online?", "Offline gates a release; online tells you the mix shifted.", "recall"),
     Q("What can offline not see?", "Silent provider updates and a traffic mix the gold set does not contain.", "recall"),
     Q("What can online not do well alone?", "A controlled, reproducible bake-off of two prompts.", "apply"),
     Q("Which do you build first?", "A small offline set and production logging. Scoring online can follow.", "apply"),
     Q("Where does shadow sit?", "After offline pass, before a user-visible A/B or full promote.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
},
"m7-4": {
"core-llm-capabilities": sc(
 why="""When you read a bench, name the capability: knowledge, reasoning, maths, coding, instruction following, long context, multimodal, safety, tool use. A win on maths is not a win on your JSON-extract job.

Interviews: map your product to two capabilities.""",
 how="""Write the product’s needed capabilities first. Then look at benches that claim those. Long-doc extract → long context + instruction following + structured output. Not GPQA.

A model card that only shows the shiny capability is a marketing card.""",
 failures=F("Buying a maths champ for a classifier.",
 "Ignoring tool-use benches for an agent.",
 "Treating “general intelligence” as a capability you can measure once."),
 line="""I map the product to capabilities, then I read the benches that claim those. A maths trophy is not an extract trophy.""",
 walk="""You need long-context extract. You shortlist models with long-context and schema-following numbers, not the ones topping a maths contest.""",
 follow="""They list ten benches. You pick two and say why the rest are noise for this job.""",
 measure="""Whether your shortlist memo names capabilities.""",
 kps=K("Name capabilities before benches.","Map product → capabilities → benches.","A card that only shows the shiny skill is marketing.","Tool use is a capability of its own.","Safety is a capability, not a vibe.","No single “general” score decides."),
 qs=[Q("You choose a model for long-document extraction. Which capability focus?", "Long-context retrieval and structured-output instruction following — not competition maths.", "apply"),
     Q("List several core LLM capabilities benches try to measure.", "Knowledge, reasoning, maths, coding, instruction following, long context, multimodal, safety, tool use.", "recall"),
     Q("Why is “best overall model” a weak phrase?", "Overall averages hide the capability you need and the one you do not.", "debug"),
     Q("An agent product ignores tool-use benches. Risk?", "You may pick a fluent model that cannot call functions reliably.", "apply")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"anatomy-of-a-benchmark": sc(
 why="""A benchmark is a dataset, prompts, run config, scoring method and aggregation. Change any piece and the number moves. Two papers with the same name can be incomparable.

Interviews: list the five parts.""",
 how="""When you read a score, ask: which split, how many shots, what parse, what temperature, which version of the set. If the report omits them, treat the number as decoration.

When you run one, record all five in the artefact.""",
 failures=F("Comparing scores from different harnesses as if equal.",
 "A custom prompt that inflates your favourite model.",
 "Aggregation that hides a dead slice."),
 line="""A bench is dataset + prompt + config + scorer + aggregation. I do not compare numbers that do not share those parts.""",
 walk="""Two “MMLU” numbers differ by 4 points. One is 5-shot, one 0-shot. You stop arguing and rerun both in one harness.""",
 follow="""They ask about leaderboards. Same anatomy; plus they may hide the harness.""",
 measure="""Reports you rejected for missing anatomy, harness-controlled reruns.""",
 kps=K("Five parts: data, prompts, config, score, aggregation.","Harness differences move scores.","Record all five when you run.","Do not compare mismatched anatomies.","Aggregation can hide dead slices.","A name is not a protocol."),
 qs=[Q("Two reports disagree on the same named benchmark. Most probable explanation?", "Different prompts, shots, parsing or dataset versions.", "apply"),
     Q("What is the anatomy of a benchmark?", "Dataset, prompts, run configuration, scoring method, and aggregation.", "recall"),
     Q("What do you store when you run one?", "All five parts plus the model id and date.", "apply"),
     Q("A leaderboard hides the prompt. Problem?", "You cannot reproduce or compare. Treat the rank as a hint.", "debug")],
 links=[L["hf_eval"], L["sklearn"]],
),
"public-leaderboards": sc(
 why="""Leaderboards compare foundation models under one harness — in theory. In practice: contamination, self-reports, closed evals, and confidence intervals that overlap. Use them to shortlist, not to crown.

Read the error bars.""",
 how="""Pick a board that publishes the harness and CIs. Shortlist models whose intervals do not collapse into each other on the capability you need. Then run your set.

If rank 2 and 3 overlap, they are a tie for your purposes.""",
 failures=F("Picking rank 1 as a final decision.",
 "Ignoring CIs.",
 "A board that does not publish the harness."),
 line="""Leaderboards shortlist. Overlapping CIs are a tie. I still run my application eval.""",
 walk="""Rank 1 and 2 overlap on the board you care about. You test both. The cheaper one wins your set. You ship that.""",
 follow="""They ask about Elo chat boards. Preference ≠ task success. Say so.""",
 measure="""How often you treated overlap as a tie, rank-only decisions (0).""",
 kps=K("Boards are a shortlist tool.","Read CIs; overlap = tie.","Need a published harness.","Preference Elo is not task success.","Still run your set.","Self-reported numbers are ads."),
 qs=[Q("Rank 2 and 3 have overlapping CIs. What does that tell you?", "They are statistically indistinguishable on that measure.", "apply"),
     Q("Best use of leaderboard results?", "Shortlisting before a custom eval on your data.", "recall"),
     Q("A chat Elo board is won by a witty model. Relevance to extract?", "Low. Preference is not structured-output skill.", "debug"),
     Q("What must a trustworthy board publish?", "Harness details, dataset version, and uncertainty.", "recall")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"benchmark-pitfalls": sc(
 why="""Pitfalls: contamination (train on the test), saturation (everyone scores 90), overfitting to the bench, configuration gaming (the perfect prompt). Interviews: name four and how you notice.""",
 how="""Notice contamination: paraphrase the items and watch the drop. Saturation: look at the ceiling and the label noise. Overfit: a model that only shines on one set. Gaming: unusual prompts or voting schemes.

Your defence is a private set.""",
 failures=F("Treating a saturated bench as a ranking tool.",
 "Tuning prompts for weeks on a public set you will report.",
 "Ignoring paraphrase drops."),
 line="""I watch for contamination, saturation, overfit and gaming. A private set is the defence. A 90% public number may mean the bench died.""",
 walk="""A model is 92% on a public set and 61% on your paraphrases. You treat the public number as contaminated and decide on your set.""",
 follow="""They ask about decontamination methods. Mention n-gram overlap checks, but still prefer private data.""",
 measure="""Paraphrase drops, benches you retired for saturation.""",
 kps=K("Contamination, saturation, overfit, gaming.","Paraphrase to probe memorisation.","Saturated benches do not rank.","Private sets defend you.","Do not tune on the set you will brag about.","Label noise plus ceiling = junk deltas."),
 qs=[Q("A model aces a public bench but fails paraphrases. Likely cause?", "Contamination or memorisation of the original items.", "apply"),
     Q("Name four benchmark pitfalls.", "Data contamination, score saturation, overfitting to the bench, and configuration gaming.", "recall"),
     Q("When does a bench stop discriminating?", "When most frontier models sit at the ceiling and deltas are label noise.", "recall"),
     Q("What is configuration gaming?", "A special prompt, parse or vote that inflates one model on that harness.", "debug")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"task-transfer-is-the-real-test": sc(
 what="""**A leaderboard win that fails your tickets is not a win.** Transfer is whether capability on a public task shows up on your distribution. It often does not. The real test is your tickets, your JSON, your language mix.

This is the application-eval principle said as a bench warning.""",
 why="""Interview closer for M7.4. They quote a rank. You quote your set.""",
 how="""Whenever someone pastes a rank, run the top two on 50 of your tickets the same day. Write both numbers in the thread. Culture changes.""",
 failures=F("Delaying your set “until we pick a model.”",
 "Declaring transfer without a number.",
 "Tickets that are themselves leaked public items."),
 line="""Transfer is the test. A leaderboard win that fails our tickets is not a win. I run the tickets the same day.""",
 walk="""Rank 1 fails your Hindi refund tickets. Rank 3 passes. You pick 3. The Slack thread has the table.""",
 follow="""They ask how many tickets. Fifty diverse beats five demos.""",
 measure="""Same-day transfer runs, rank-only picks (0).""",
 kps=K("Your tickets are the transfer test.","A public win can fail privately.","Run the comparison the same day.","Fifty diverse tickets beat five demos.","Do not delay your set until after the pick.","Watch for leaked public items in “your” tickets."),
 qs=[Q("What is the real test of a leaderboard win?", "Whether it transfers to your tickets and formats — measured, not assumed.", "recall"),
     Q("Rank 1 fails your tickets; rank 3 passes. What do you ship?", "Rank 3, and you keep the table.", "apply"),
     Q("Why same day?", "So the rank does not become a decision while you “plan” an eval.", "apply"),
     Q("Your tickets are copies of MMLU. Problem?", "That is not transfer. It is the same bench in disguise.", "debug"),
     Q("How many tickets to start?", "About fifty diverse ones, including recent misses.", "recall")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"reading-a-model-card-like-a-sceptic": sc(
 what="""**Training data, cutoff, safety, and the eval they chose to show.** A sceptical reading of a model card asks those four, plus licence, context length, and what they omitted. The eval they chose is the ad. The cutoff tells you if your 2026 policy is invisible.

Cards are marketing with a PDF badge.""",
 why="""Interview skill: they paste a card. You ask what is missing. On the job this is procurement.""",
 how="""Checklist: cutoff date, data claims (and what they cannot say), safety evals (and the ones not shown), context, pricing, licence, region, tool-use claims. Compare to a second card on the same axes.

If safety is a paragraph with no number, treat it as unmeasured.""",
 failures=F("Reading only the lead sentence.",
 "Ignoring licence until launch.",
 "Believing “trained on the internet” as a coverage guarantee."),
 line="""I read a card for cutoff, data, safety numbers, the eval they chose to show, licence and context. What they omitted is data too.""",
 walk="""A card boasts MMLU and hides a weak tool-use number in a footnote. You need tools. You put that footnote in the shortlist memo.""",
 follow="""They ask about “constitutional” adjectives. You want numbers.""",
 measure="""Memos that cite omissions, licences caught before build.""",
 kps=K("Read cutoff, data, safety, shown evals, licence, context.","The shown eval is an ad.","Omission is information.","No number on safety = unmeasured.","Licence before you build.","Compare two cards on the same axes."),
 qs=[Q("What do you look for when reading a model card sceptically?", "Training-data claims, cutoff, safety numbers, the evals they chose to show, licence and context — plus omissions.", "recall"),
     Q("The card leads with MMLU; you need tool use. What do you do?", "Hunt the tool-use number or run your own. Do not take the lead metric.", "apply"),
     Q("Safety is a paragraph with no rate. Interpretation?", "Unmeasured in public. You must test.", "debug"),
     Q("Why does cutoff matter?", "Facts after the cutoff are not in weights; your RAG must carry them.", "apply"),
     Q("When do you read the licence?", "Before you build, especially for open weights.", "recall")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"interview": sc(
 what="""Why you ignored a rank: **contamination, wrong task, or a cost you cannot pay.** That is the one-liner. Add CIs overlapping, or a card that hid the capability you need.

Have a 20-second story.""",
 why="""They will say “but it’s number one.” You need a crisp why-not. This is M7.4’s interview close.""",
 how="""Pick a real example: a #1 chat model that was 3× your budget, or a contaminated bench, or a maths champ on an extract job. Practise the sentence without hedging.""",
 failures=F("Ignoring ranks for no reason (sounds stubborn).",
 "No story.",
 "Confusing price with contamination."),
 line="""I ignore a rank when the bench is the wrong task, looks contaminated, or the winner fails my cost or latency. I can say which.""",
 walk="""You tell the story of the coding champ that broke your JSON and cost 4×. They move on.""",
 follow="""They ask what would make you trust a rank. Published harness, CIs, and a transfer run.""",
 measure="""Whether your last shortlist memo used one of the three reasons.""",
 kps=K("Ignore a rank for wrong task, contamination, or cost/latency.","Overlapping CIs are a fourth reason.","Have a 20-second story.","Trust needs harness + transfer.","Stubbornness without a reason is not seniority.","Price and contamination are different reasons — do not mix them."),
 qs=[Q("Name three honest reasons to ignore a leaderboard rank.", "Contamination, the wrong task for your product, or a cost/latency you cannot pay.", "recall"),
     Q("Rank 1 is 5× your budget and ties your set. What do you do?", "Ignore the rank; pick the cheaper tie.", "apply"),
     Q("How do you say this without sounding stubborn?", "Name the reason and the number (transfer drop, $ , CI overlap).", "apply"),
     Q("What would make you take a rank seriously?", "A published harness, CIs, and a transfer run that agrees.", "recall"),
     Q("The bench is the right task but saturated. Why ignore?", "Deltas are noise. You still need your set.", "debug")],
 links=[L["hf_eval"], L["oai_evals"]],
),
},
"m7-5": {
"from-mmlu-to-harder-knowledge-tests": sc(
 why="""MMLU and TruthfulQA were the knowledge/honesty pair. Frontier models saturated MMLU and exposed label noise. The field moved to harder, cleaner, or more contamination-resistant tests. Interviews: why the move, not a trivia list.""",
 how="""MMLU: broad multiple choice, now a ceiling. TruthfulQA: imitative falsehoods, still useful for honesty. Harder follow-ons raise expert difficulty or reduce shortcut answers.

Use them as history. Your product set is still the decision.""",
 failures=F("Still ranking production models on raw MMLU.",
 "Treating TruthfulQA as a safety full suite.",
 "Memorising years instead of the reason."),
 line="""We left MMLU as a ranking tool because it saturated and its labels are noisy. Harder knowledge tests exist; my product set still decides.""",
 walk="""A vendor waves MMLU 90%. You ask for a harder set and your tickets. The conversation gets useful.""",
 follow="""They ask TruthfulQA vs SimpleQA. Honesty/imitative falsehoods vs short fact accuracy — different jobs.""",
 measure="""Whether your memos still lead with MMLU (they should not).""",
 kps=K("MMLU saturated and is noisy.","TruthfulQA is honesty, not all of safety.","Harder tests exist because ceilings were hit.","History ≠ your gate.","Know why the field moved.","Do not rank prod models on a dead bench."),
 qs=[Q("What is the main weakness of MMLU for today’s best models?", "Scores near the ceiling and label errors, so differences are noise.", "recall"),
     Q("Why did knowledge benches get harder?", "Frontier models saturated older sets, so they stopped discriminating.", "recall"),
     Q("Is TruthfulQA a full safety suite?", "No. It targets imitative falsehoods, not the whole harm surface.", "apply"),
     Q("A vendor leads with MMLU 90%. Your move?", "Ask for a harder set and your own transfer run.", "apply")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"human-exams-as-benchmarks": sc(
 why="""Exams (bar, medical, AGIEval-style) are tempting because humans have scores. They are also public, coachable, and a thin proxy for the job. Contamination is common. Interviewers want that caution.""",
 how="""If you cite an exam number, add: public items may be in the train, exam skill ≠ job skill, format artefacts (MCQ). Prefer private professional tasks.

AGIEval-style suites try to be cleaner; still not your tickets.""",
 failures=F("“It passed the bar” as a hire-the-model argument.",
 "Ignoring that past papers are on GitHub.",
 "MCQ exam skill as proof of open-ended advice quality."),
 line="""Human exams are contaminated, coachable proxies. I may use them as a filter, not as proof the model can do the job.""",
 walk="""A model “passes” a public bar set and fails your firm’s memo task. You write that in the shortlist. Legal stops quoting the bar number.""",
 follow="""They ask about live exams. Better, still a proxy, still not your workflow.""",
 measure="""Exam numbers used as final decisions (0).""",
 kps=K("Exams are public and coachable.","Exam skill ≠ job skill.","MCQ format artefacts.","Use as a filter, not a proof.","Prefer private professional tasks.","“Passed the bar” is marketing."),
 qs=[Q("A model scores highly on a bar-exam benchmark. Strongest caution?", "Contamination and proxy validity: exam skill is not job competence.", "apply"),
     Q("Why use exams at all?", "As a coarse filter of professional-style questions, not as the decision.", "recall"),
     Q("What format artefact shows up?", "Multiple-choice test-taking tricks that do not transfer to open memos.", "recall"),
     Q("Live proctored exams vs GitHub past papers?", "Live is less contaminated; still a proxy for your workflow.", "apply")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"gpqa-mmlu-pro-simpleqa-hle": sc(
 why="""Harder sets you should be able to place: GPQA (expert, “Google-proof”), MMLU-Pro (harder MMLU), SimpleQA (short facts, calibration), Humanity’s Last Exam (very hard expert). Know what each claims, not every score.""",
 how="""GPQA: graduate-level, hard to search. MMLU-Pro: more options, harder items. SimpleQA: short verifiable answers, tracks attempted vs correct. HLE: a small, brutal expert set.

Use SimpleQA-like thinking for hallucination rate. Use GPQA as a filter for “reasoners.” Neither replaces tickets.""",
 failures=F("Treating HLE as a product KPI.",
 "Confusing SimpleQA with MMLU.",
 "Quoting a number without the set’s job."),
 line="""GPQA and MMLU-Pro raise knowledge difficulty; SimpleQA measures short-fact honesty; HLE is a tiny expert ceiling. I place them; I do not KPI them.""",
 walk="""You care about fabricated facts. You look at SimpleQA-style attempted-vs-correct, then you build a 40-fact set from your domain.""",
 follow="""They ask “Google-proof.” It means hard to answer by naive search, not “unsearchable forever.”""",
 measure="""Whether you can define each in one clause.""",
 kps=K("GPQA: expert, hard to naive-search.","MMLU-Pro: harder MMLU.","SimpleQA: short facts and calibration.","HLE: tiny brutal expert set.","Place them; do not KPI them.","Domain facts still win."),
 qs=[Q("Why is GPQA described as Google-proof?", "Expert-written questions that are hard to answer by simple web search.", "recall"),
     Q("Which bench best measures fabricated short facts?", "SimpleQA (or a domain clone): short verifiable answers, incorrect vs not-attempted.", "apply"),
     Q("Should HLE be your product KPI?", "No. It is a tiny expert ceiling. Use your tickets.", "debug"),
     Q("What did MMLU-Pro change versus MMLU?", "Harder items and a format that reduces easy guessing.", "recall")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"why-benchmarks-keep-getting-harder": sc(
 why="""Benches harden because models catch up, items leak, and a ceiling stops ranking. The economics: expert items are expensive, so new sets are smaller and noisier. Interviews: this loop, plus “so I need my own set.”""",
 how="""Story: publish set → models train/leak/saturate → rank dies → new harder set → repeat. Your escape is private, refreshed data.

Small expert sets have wide CIs — do not over-read a 2-point delta.""",
 failures=F("Chasing the newest bench as a personality.",
 "Over-reading tiny hard sets.",
 "Not refreshing your private set."),
 line="""Benches harden because old ones saturate and leak. New ones are smaller and noisier. I escape the loop with a private, living set.""",
 walk="""You stopped quoting the newest three-letter exam each month. You invested in 80 living tickets. The ranking arguments died; the product improved.""",
 follow="""They ask if the loop ever ends. Not while models improve and items leak.""",
 measure="""How often your memos cite a new public bench vs your set.""",
 kps=K("Saturate → leak → harden → repeat.","Expert items are costly, so new sets are small.","Small sets have wide CIs.","Escape with a private living set.","Do not chase acronyms.","Refresh your own items too."),
 qs=[Q("Why do benchmarks keep getting harder?", "Frontier models saturate and contaminate older sets, so they stop ranking; new harder items are written.", "recall"),
     Q("Why are new expert sets often smaller and noisier?", "Expert authoring is expensive, which limits size and widens CIs.", "apply"),
     Q("How do you escape the public-bench loop?", "A private, refreshed product set.", "apply"),
     Q("A 2-point delta on a 100-item expert set. Caution?", "Wide CI. Do not ship on that delta alone.", "debug")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"saturation-means-you-need-a-harder-set": sc(
 what="""**When everyone scores 90, the benchmark stopped discriminating.** Saturation is a property of the set plus the current models, not a property of intelligence. You need harder or different items — or you need a different metric (calibration, cost, tail fails).

A saturated set can still catch a broken build if a model collapses. It cannot pick a winner.""",
 why="""The checklist closer for M7.5. Interviews: define saturation and say what you do next.""",
 how="""Look at the score histogram. If the frontier cluster is at the ceiling, retire the set for ranking. Keep it as a smoke “did we break everything?” Or add harder items / a new slice.

Do not average in a saturated set to make a marketing overall.""",
 failures=F("Picking a winner on 91 vs 92 on a noisy saturated set.",
 "Deleting the set entirely so you miss a collapse.",
 "Hiding saturation in an average."),
 line="""When everyone scores 90, I stop ranking on that set. I keep it as smoke or I replace it. I do not advertise 92 vs 91.""",
 walk="""Your public clone of MMLU is 89–93 for all candidates. You retire it for ranking, keep 30 items as smoke, and decide on 80 product tickets.""",
 follow="""They ask about adding more MMLU-like items. That will saturate too. Change the skill or the domain.""",
 measure="""Sets retired for ranking, smoke sets kept.""",
 kps=K("Saturation = ceiling cluster, no ranking power.","Retire for ranking; keep as smoke if useful.","Do not advertise 92 vs 91.","Change skill or domain, not just more similar items.","A collapse still shows on a saturated set.","Do not hide it in an overall average."),
 qs=[Q("What does saturation mean for a benchmark?", "Most relevant models sit near the ceiling, so score gaps are noise and the set no longer ranks.", "recall"),
     Q("Everyone scores ~90. What do you do?", "Stop ranking on it; keep a smoke slice if you want collapse detection; decide on a harder or private set.", "apply"),
     Q("Why keep a saturated set at all?", "A broken build or a tiny model will still fall off the ceiling.", "apply"),
     Q("Is 92 vs 91 on a noisy saturated set a ship reason?", "No. A one-point gap on a noisy saturated set is not a ship reason; check CIs and your own tickets.", "debug"),
     Q("Will more similar items fix saturation?", "Usually not. You need a harder or different skill.", "recall")],
 links=[L["hf_eval"], L["oai_evals"]],
),
"human-exams-vs-product-tasks": sc(
 what="""**GPQA is a filter, not a substitute for your tickets.** Human-exam and expert-knowledge sets tell you something about hard QA. They do not tell you if the model can file your refund, emit your schema, or stay in your tone.

Use them to drop hopeless models. Decide on product tasks.""",
 why="""The last M7.5 line. Interviews: filter vs decide. On the job, stop a thread that quotes GPQA as the v1 metric.""",
 how="""Stage 1: drop models that fail a hard QA or instruction filter you care about. Stage 2: 80 product tasks. Never skip stage 2 because stage 1 looked glorious.

If your product is not expert QA, GPQA can be a weak filter — skip it.""",
 failures=F("GPQA as the KPI.",
 "Skipping product tasks because the filter was impressive.",
 "Using GPQA for a classifier product."),
 line="""Expert exams filter. Product tasks decide. GPQA is not a substitute for our tickets.""",
 walk="""A model is great on GPQA and cannot keep a 4-field JSON schema. You drop it at stage 2 and the GPQA number never appears in the launch mail.""",
 follow="""They ask which filter for a SQL agent. Text-to-SQL benches or your own schemas — not HLE.""",
 measure="""Launches whose KPI was a public exam (0).""",
 kps=K("Expert sets filter; tickets decide.","Skip the filter if it is the wrong skill.","Never skip product tasks.","JSON/schema skill is not GPQA.","Launch mail quotes tickets.","A glorious filter can still fail stage 2."),
 qs=[Q("What is GPQA’s honest role in a product decision?", "A filter for hard QA — not a substitute for your tickets.", "recall"),
     Q("A model wins GPQA and fails your schema. What happens?", "It fails stage 2. You do not ship it on the GPQA number.", "apply"),
     Q("When would you skip GPQA entirely?", "When the product does not need expert QA (e.g. a classifier or a formatter).", "apply"),
     Q("What should the launch mail quote?", "Product-task numbers, cost and latency — not an exam acronym.", "debug"),
     Q("Can a product-task set be small at first?", "Yes. Fifty good tickets beat a glorious filter with no tickets.", "recall")],
 links=[L["oai_evals"], L["hf_eval"]],
),
},
"m7-6": {
"evaluating-on-your-actual-task": sc(
 why="""Public benches are someone else’s task. Your task has your formats, jargon, languages and failure modes. Custom eval is how a “weaker” model wins.

Interviews: start here, not with a board.""",
 how="""Write 50–150 inputs that look like production. Define success. Run candidates the same way the app will (same tools, same RAG). That number is the decision.

Include the last ten production misses on purpose.""",
 failures=F("A “custom” set that is just MMLU clones.",
 "Running without the retriever the app uses.",
 "Only easy cases."),
 line="""I evaluate on the actual task, with the actual pipeline, including recent misses. A public bench is a shortlist hint.""",
 walk="""A mid-rank model wins your Text-to-SQL set because it follows your dialect. You ship it. The leaderboard crowd is confused; your p95 latency is not.""",
 follow="""They ask about size. Start 50, grow from misses.""",
 measure="""Share of cases that look like prod, pipeline-faithful runs.""",
 kps=K("Your task, your pipeline, your misses.","Public benches shortlist.","Do not clone MMLU and call it custom.","Include hard and recent fails.","Same tools/RAG as prod.","A weaker public model can win."),
 qs=[Q("Why can a lower-ranked model win your internal eval?", "It fits your formats, domain language and instructions better.", "recall"),
     Q("What makes a set “actual task”?", "Real or realistic inputs, the production pipeline, and recent misses.", "apply"),
     Q("You eval the model without the retriever the app uses. Problem?", "You measured a different system. Include retrieval.", "debug"),
     Q("How do you start the set?", "Fifty diverse prod-like cases, then grow from misses.", "apply")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"shortlisting-candidate-models": sc(
 why="""Shortlist with public signals: capability, context, latency, price, region, licence. Do not shortlist 15 models you will not run. Three to five is enough.

A shortlist memo is a page, not a spreadsheet of dreams.""",
 how="""Must-haves: context size, region, licence, max $ / 1M tokens. Nice-to-haves: board scores on the right capability. Drop the rest. Then custom-eval the survivors.

Include at least one cheap model so you learn the quality/cost curve.""",
 failures=F("Shortlisting only frontier models.",
 "Ignoring licence.",
 "Fifteen candidates, no time to eval."),
 line="""I shortlist 3–5 models on capability, context, latency, cost, region and licence — including a cheap one — then I custom-eval.""",
 walk="""Must-have: 128k, EU region, < $X. Four models remain. You run the 80 cases. The cheapest acceptable wins.""",
 follow="""They ask about open weights. They are a candidate if licence and ops fit.""",
 measure="""Shortlist size, must-have violations that still entered the eval.""",
 kps=K("3–5 candidates, not 15.","Must-haves: context, region, licence, price.","Include a cheap model.","Boards inform, they do not pick.","Open weights are a path, not a free pass.","A one-page memo."),
 qs=[Q("What do you use leaderboards for in selection?", "To shortlist on capability, then custom-eval — not to decide.", "recall"),
     Q("Why include a cheap model in the shortlist?", "To learn the quality/cost curve and to have a fallback.", "apply"),
     Q("A model fails the region must-have. Eval it?", "No. Must-haves are filters.", "debug"),
     Q("How many candidates can you honestly eval?", "About three to five on a real set.", "recall")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"building-a-custom-eval-dataset": sc(
 why="""A custom set for a real task (Text-to-SQL is the usual example) needs inputs, schemas, expected queries or results, and tags. Independent labels. A labelling guide.

The set is the product of the eval workstream.""",
 how="""Collect questions from logs. Attach the schema version. Write expected SQL or expected result sets. Tag difficulty and dialect. Two labelers on a sample. Freeze a core.

Do not let the candidate model write the gold SQL.""",
 failures=F("Gold written by the model under test.",
 "No schema version, so the gold rots.",
 "Only happy-path SELECTs."),
 line="""I build a custom set with real inputs, versioned schemas, independent gold, and tags. The candidate does not write the answers.""",
 walk="""You take 80 warehouse questions, pin schema v3, and store expected result hashes. A model that writes pretty SQL that returns the wrong table fails.""",
 follow="""They ask about execution vs string-match SQL. Prefer execution / result hash.""",
 measure="""Label agreement, schema-version freshness, hard-case share.""",
 kps=K("Real inputs + versioned context (schema).","Independent gold.","Prefer execution/result checks for SQL.","Tag difficulty and dialect.","Include adversarial and empty-result cases.","Labelling guide in the repo."),
 qs=[Q("How do you avoid biased references in a custom dataset?", "Human or independently verified labels with a guide — not the candidate model.", "apply"),
     Q("For Text-to-SQL, what is a better check than string-equal SQL?", "Execute and compare result sets (or hashes) on a pinned schema.", "apply"),
     Q("The schema changed and gold still passes. Risk?", "You are scoring against a dead world. Version the schema.", "debug"),
     Q("What tags help?", "Difficulty, dialect, empty-result, adversarial.", "recall")],
 links=[L["oai_evals"], L["sklearn"]],
),
"like-for-like-model-comparison": sc(
 why="""Like-for-like means the same inputs, prompts, parameters, tools and scorer. A prompt hand-tuned for one candidate is a rigged race. Pin versions. Repeat if noisy.

Interviews: name what you held constant.""",
 how="""One harness. One case file. Same temperature and tool list unless the product will differ on purpose (then say so). Repeat n=3 if the delta is small. Report CIs or at least min/max.

If you later tune a prompt per model, that is a second experiment, not the bake-off.""",
 failures=F("A prompt tuned only for the favourite.",
 "Different tool schemas per model by accident.",
 "Declaring a 0.5-point win inside noise."),
 line="""Like-for-like holds inputs, prompts, tools and the scorer constant. A hand-tuned prompt is a different experiment. I do not ship a delta inside noise.""",
 walk="""Two models differ by 0.4 on 80 cases. You repeat twice; they overlap. You pick the cheaper one. The favourite’s custom prompt is tried later as a second test.""",
 follow="""They ask about model-specific system prompts. Allowed in a second round, labelled as such.""",
 measure="""Constants listed in the report, deltas inside noise shipped (0).""",
 kps=K("Same inputs, prompts, tools, scorer.","Pin model versions.","Repeat when deltas are small.","Per-model prompt tune is a second experiment.","Do not ship inside noise.","Write the constants down."),
 qs=[Q("In a like-for-like comparison, which is a flaw?", "Using a prompt hand-tuned only for one candidate.", "apply"),
     Q("Two models differ by 0.5 within run noise. Decision?", "Treat as tied on quality and use cost/latency.", "apply"),
     Q("What must you pin?", "Model id/version, prompt, tools, temperature, scorer version.", "recall"),
     Q("When may prompts differ?", "In a labelled second experiment after the fair bake-off.", "recall")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"estimating-usage-token-cost": sc(
 why="""Quality without a cost model is a hobby. Estimate tokens in/out, calls per task (agents multiply), cache hits, and $ at your volume. Interviews: multiply by expected calls, including the tail.""",
 how="""Log tokens per request. For agents, multiply by expected steps (p50 and p95). Apply list prices and any cache discount. Build a monthly $ at last week’s volume plus a 2× stress.

Prompt cache only helps if the prefix is stable. Say so.""",
 failures=F("Pricing a single call when the agent averages six.",
 "Ignoring the p95 step count.",
 "Forgetting output tokens."),
 line="""I estimate $ from tokens × calls per task, including the tail. Agents multiply. Cache is a column, not a miracle.""",
 walk="""A loop averages 6 calls; p95 is 14. Single-call pricing was $0.04; real p95 is $0.55. Finance sees the second number before launch.""",
 follow="""They ask about batch. Fine for offline eval, not for the user path unless you designed it.""",
 measure="""Predicted vs actual $, p95 calls used in the model.""",
 kps=K("Tokens in and out, both.","Multiply by calls per task.","Use p95, not only the mean.","Cache only if the prefix is stable.","Monthly $ at real volume.","Agents break single-call prices."),
 qs=[Q("An agent loop makes about 6 calls per task. How does this affect cost estimation?", "Multiply per-call token use by expected calls, including tail cases.", "apply"),
     Q("Why include output tokens?", "They are often pricier and grow with “helpful” verbosity.", "recall"),
     Q("When does prompt cache change the estimate?", "When a long static prefix is actually reused. Otherwise it is a footnote.", "apply"),
     Q("You priced the median and blew the bill. Why?", "The tail step-count dominates spend. Price p95 too.", "debug")],
 links=[L["oai_evals"], L["oai_prompt"]],
),
"quality-latency-cost-trade-off": sc(
 why="""The decision is a trade-off, not a max-quality trophy. A 0.5-point win at 3× cost and 2× p95 may be a loss. Interviews: three columns and a budget.""",
 how="""Table: quality, p95 latency, $ / success. Mark the budget lines. Pick the cheapest that clears quality and latency. Consider routing: cheap default, escalate hard cases.

Ship the table, not a winner speech.""",
 failures=F("Max quality at any cost.",
 "Ignoring latency because “it’s async” when it is not.",
 "No routing even when the curve screams for it."),
 line="""I pick the best quality/latency/cost point that clears the budget, not the trophy model. Routing is how I keep the cheap default.""",
 walk="""Model A: +2 quality, 2× p95, 3× $. Budget is 1.2s p95. You ship B and route 8% to A. The table is in the design doc.""",
 follow="""They ask about “best model.” You ask “on which column.”""",
 measure="""Launches with a three-column table, routed share.""",
 kps=K("Three columns: quality, latency, cost.","Budgets are lines on the table.","Trophy quality can lose.","Route easy/hard.","Publish the table.","“Best model” needs a column."),
 qs=[Q("Two models are tied on quality; one is 3× cheaper. Reasonable decision?", "Treat as tied on quality and choose the cheaper if latency is acceptable.", "apply"),
     Q("A +2 quality at 2× p95 misses the latency budget. Ship it?", "Not unless product moves the budget. Consider routing instead.", "apply"),
     Q("What is routing here?", "Send easy cases to a cheap model and escalate hard ones.", "recall"),
     Q("Why “per success” not “per call”?", "Failed or retried calls still cost. Success is what the user bought.", "debug")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"stratify-the-custom-set": sc(
 what="""**Easy, hard, adversarial, and the last five production misses.** A custom set that is all easy twins will score 98% and lie. Stratify on purpose so a model cannot hide on the happy path.

The last five misses keep the set honest this week.""",
 why="""Interview closer for custom sets. They want the strata names. On the job this is how you stop a vanity 98%.""",
 how="""Quota: 40% typical, 25% hard, 20% adversarial (injection, empty, dialect), 15% recent misses (rotating). Report scores by stratum, not only overall.

When a miss ages out of “recent,” it can stay in hard.""",
 failures=F("All easy.",
 "Adversarial only, so you never see typical quality.",
 "Overall average hiding a dead adversarial slice."),
 line="""I stratify easy, hard, adversarial, and recent misses. I report by slice. A 98% overall on easy twins is a lie.""",
 walk="""Overall 91%, adversarial 40%. You stop celebrating. A prompt change lifts adversarial to 70% and overall only +2. That was the win.""",
 follow="""They ask how many adversarial. Enough to see a number, not 3 cases.""",
 measure="""Stratum sizes, overall-only reports retired.""",
 kps=K("Quota the strata; do not hope.","Include recent misses.","Report by slice.","Overall-on-easy is a vanity.","Adversarial includes empty and injection.","Rotate recent misses."),
 qs=[Q("How should you stratify a custom eval set?", "Easy, hard, adversarial, and the last production misses — with quotas and per-slice scores.", "recall"),
     Q("Overall 98% on easy twins. What is missing?", "Hard, adversarial and recent-miss strata.", "debug"),
     Q("What happens to an old “recent miss”?", "It stays in hard or typical; the recent bucket rotates.", "apply"),
     Q("Why report by slice?", "Wins and losses offset in the average.", "apply"),
     Q("How many adversarial cases?", "Enough to estimate a rate — dozens, not three.", "recall")],
 links=[L["oai_evals"], L["sklearn"]],
),
"cost-model-beside-the-quality-table": sc(
 what="""**Tokens and latency are columns, not footnotes.** The quality table that ships a model without $ and p95 is unfinished. Put the columns in the same grid so a 1-point win cannot hide a 4× bill.

This is the trade-off topic as a documentation rule.""",
 why="""Interview close: they show a quality-only slide. You ask for the other columns. On the job, finance will.""",
 how="""Every bake-off artefact: quality | p95 ms | $ / 1k tasks | notes. Fill them even if estimated. Update with actuals after a week.

If a cell is “unknown,” the table is not done.""",
 failures=F("Quality-only slides to leadership.",
 "Cost in a buried appendix.",
 "Latency measured on a laptop Wi-Fi and treated as p95."),
 line="""Tokens and latency are columns on the same table as quality. If a cell is empty, the bake-off is not done.""",
 walk="""You add the columns. The “winner” is 4× $ . Leadership picks the second row. That is the table working.""",
 follow="""They ask about carbon or energy. Fine as another column if the org cares; do not let it replace $.""",
 measure="""Bake-offs with all three columns, appendix-only costs (0).""",
 kps=K("Quality, latency, $ in one grid.","Empty cell = unfinished.","No buried appendix.","Measure p95 like production.","Update with actuals.","A 1-point win can lose on $."),
 qs=[Q("What columns sit beside quality in a bake-off table?", "Latency (p95) and cost (tokens / $ per success).", "recall"),
     Q("The winner slide has only quality. What do you ask?", "For p95 and $ / 1k tasks on the same rows.", "apply"),
     Q("Laptop latency as p95 — problem?", "It is not production p95. Measure on the real path.", "debug"),
     Q("When is the table done?", "When no required cell is unknown.", "apply"),
     Q("Why not bury cost in an appendix?", "It will not change the decision if nobody sees it next to quality.", "recall")],
 links=[L["oai_evals"], L["hf_eval"]],
),
},
"m7-7": {
"component-pipeline-application-levels": sc(
 why="""Structure evals at component, pipeline and application levels. Component: retriever or generator alone. Pipeline: retrieve→generate. Application: user-visible plus tone, format, ops.

A drop should be localisable in one dashboard hop.""",
 how="""Same ids across levels. A case has component scores and an application score. When e2e drops, read the components. When components are green and e2e is red, inspect assembly.

Do not maintain three unrelated spreadsheets.""",
 failures=F("Only application.",
 "Components with different case ids.",
 "Pipeline skipped so you never see assembly bugs."),
 line="""I score component, pipeline and application on the same cases. That is how I localise a drop in one hop.""",
 walk="""Application −5, retriever flat, generator-on-gold −6. You fix the prompt. The shared ids made the hop obvious.""",
 follow="""They ask RAGAS vs DeepEval. Either can run a level; you still own the structure.""",
 measure="""Time-to-localise, shared-id coverage.""",
 kps=K("Three levels: component, pipeline, application.","Shared case ids.","E2E drop → read components.","Green components + red e2e = assembly.","One suite, not three spreadsheets.","Ops metrics sit at application."),
 qs=[Q("A RAG app’s e2e score dropped. Fastest localisation?", "Run retriever and generator component evals on the same cases.", "apply"),
     Q("What does the pipeline level add?", "The retrieve→context→generate interaction, not just isolated parts.", "recall"),
     Q("Different case ids per level — problem?", "You cannot join a drop. Share ids.", "debug"),
     Q("Where do tone and p95 live?", "Application level, next to correctness.", "apply")],
 links=[L["ragas"], L["oai_evals"]],
),
"versioning-tests-configs-results": sc(
 why="""If you cannot reproduce a number, you do not have science. Version cases, prompts, models, configs and results together. A folder of scores without hashes is folklore.

Interviews: what you store per run.""",
 how="""Each run record: dataset hash, prompt hash, model id, params, scorer version, outputs, scores, git sha. Immutable. Compare by id, not by “Thursday’s run.”

Prompts in git. Results in an artefact store.""",
 failures=F("Overwriting last week’s outputs.",
 "Prompts only in the UI.",
 "A spreadsheet with no hashes."),
 line="""I version cases, prompts, models, configs and results. A score without those hashes is folklore. I can reproduce last month’s number.""",
 walk="""A stakeholder asks why June was 81. You open run `2026-06-12-a` with hashes and outputs. The argument ends.""",
 follow="""They ask about DVC or a vendor. Fine. The fields matter more than the brand.""",
 measure="""Repro success rate, overwritten runs (0).""",
 kps=K("Hash dataset, prompt, model, params, scorer.","Immutable run records.","Prompts in git.","Do not overwrite outputs.","Reproduce last month’s number.","Brand < fields."),
 qs=[Q("What is essential to reproduce a score weeks later?", "Immutable run records with dataset, prompt, model version and settings.", "recall"),
     Q("Thursday’s spreadsheet is gone. What failed?", "You overwrote or never stored hashes. Use immutable artefacts.", "debug"),
     Q("Where do prompts live?", "In git, hashed into the run record.", "apply"),
     Q("May you mutate gold in place?", "No. Version it. Old runs need the old gold.", "apply")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"experiment-tracking-baselines": sc(
 why="""An experiment without a baseline is a vibe. Track runs and always diff the last shipped (or last accepted) baseline. Look at flipped cases, not only the average.

Interviews: what a baseline is.""",
 how="""Baseline = last shipped config’s scores on the frozen core. Each experiment: delta overall, delta by slice, list of flips. A +1 average with −20 on refunds is a fail.

Name the baseline id in the PR.""",
 failures=F("No baseline.",
 "Average-only diffs.",
 "Moving the baseline to the favourite run."),
 line="""I diff every experiment to a named baseline and I read flipped cases. Averages can hide a dead slice.""",
 walk="""+0.8 overall, 12 refund flips to fail. You do not ship. The flip list is the artefact.""",
 follow="""They ask about multiple baselines. One shipped, one “best so far” is OK if labelled.""",
 measure="""PRs with baseline ids, average-only reports retired.""",
 kps=K("Baseline = last shipped on the frozen core.","Diff averages and flips.","Name the baseline in the PR.","Do not silently move it.","A +1 with a dead slice is a fail.","Label extra baselines."),
 qs=[Q("Why can an unchanged average still hide a problem?", "Wins and regressions can offset across cases or slices. Read flips.", "recall"),
     Q("What is the baseline?", "The last shipped prompt/model/config scores on the frozen core.", "recall"),
     Q("A PR with +1 overall and a dead refund slice. Ship?", "No. The slice is a gate.", "apply"),
     Q("Who may move the baseline?", "A shipped (or explicitly accepted) run, not a favourite notebook.", "debug")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"ci-cd-quality-gates": sc(
 why="""A quality gate fails the build when important metrics regress. Without it, evals are optional homework. With a naive gate, one flake blocks the company.

Design: smoke on PR, full nightly, thresholds with tolerance.""",
 how="""PR: 20 cheap programmatic cases, fail on format or P0 slice. Nightly: full suite vs baseline, fail on a meaningful drop (e.g. −3 overall or −5 on P0) after a repeat.

Never fail on a single stochastic case. Pin the scorer.""",
 failures=F("No gate.",
 "Full expensive suite on every commit.",
 "Gate on a judge you just changed."),
 line="""CI fails on a meaningful, repeated drop — not on one flake. Smoke on PRs, full nightly. The gate is how evals become real.""",
 walk="""A prompt PR fails smoke (JSON). You fix in minutes. Nightly catches a −4 refund slice. That is the gate working at two speeds.""",
 follow="""They ask about skip. Emergencies skip with a ticket, not by deleting the gate.""",
 measure="""Gates that fired correctly, flake fails, skipped emergencies.""",
 kps=K("Gates make evals real.","Smoke on PR, full nightly.","Thresholds with tolerance.","Do not fail one flake.","Do not gate on a just-changed judge.","Skip only with a ticket."),
 qs=[Q("Which CI design best limits cost while protecting quality?", "Smoke set on PRs, full suite nightly, thresholds with tolerance.", "apply"),
     Q("A single case flakes and blocks main. Fix?", "Require a repeated drop or a slice threshold, not one stochastic fail.", "debug"),
     Q("May you skip the gate in an incident?", "With an explicit ticket and a follow-up run — not by deleting it.", "apply"),
     Q("What must be pinned in CI?", "Model id (or a mock), dataset hash, scorer version.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"self-improving-golden-dataset": sc(
 why="""The set improves when prod failures and new edges enter it — with a frozen core so you cannot game the trend. Interviews: living set + frozen core.

Self-improving is not automatic labelling by the model under test.""",
 how="""Two pools: core (frozen, trend) and growth (adds from prod). Periodically promote growth into a new core version. Never let the candidate label gold.

A monthly review retires outdated cases (policy changed).""",
 failures=F("Only growth, no frozen core.",
 "Model-labelled gold.",
 "Never retiring dead policies."),
 line="""The golden set grows from prod misses and keeps a frozen core for trends. The candidate does not write gold. Dead policies retire.""",
 walk="""Core 80 is stable. Growth added 40 this quarter. You cut a v2 core of 100 and keep 20 as extra. Trends remain comparable.""",
 follow="""They ask about synthetic. OK as growth if humans review; still not the frozen core on day one.""",
 measure="""Adds from prod, core stability, retired dead cases.""",
 kps=K("Frozen core + growth pool.","Adds from prod misses.","Candidate does not label gold.","Promote versions, do not mutate silently.","Retire dead policies.","Synthetic needs human review."),
 qs=[Q("What does a frozen held-out core provide?", "Stable trend lines across releases that you cannot tune against.", "recall"),
     Q("Who must not write the new gold labels?", "The model under test.", "apply"),
     Q("Policy changed; old cases still fail. What do you do?", "Retire or rewrite them. Do not keep a dead policy as a fail.", "debug"),
     Q("How do you grow without ruining trends?", "Add to a growth pool; periodically version a new core.", "apply")],
 links=[L["oai_evals"], L["hf_eval"]],
),
"quality-alongside-latency-cost": sc(
 why="""A quality gate that ignores p95 and $ will ship a gorgeous brick. Track the three together in CI and in weekly review. A +2 with doubled p95 needs a product yes.""",
 how="""The nightly job records quality, p95, $ / 1k. The gate can fail on any budget. The weekly mail is one table.

Optimising one column in isolation is how you get 8k-token answers that score well and time out.""",
 failures=F("Quality-only gates.",
 "Latency measured only in the app, never in the eval job.",
 "Celebrating +2 with a timeout spike."),
 line="""I track quality next to latency and cost in the same gate. A quality win that blows p95 does not ship without a budget change.""",
 walk="""Nightly: +2 quality, p95 2.1s vs 1.0s budget. The gate fails. You shorten the prompt instead of arguing.""",
 follow="""They ask which column wins. The written budget wins.""",
 measure="""Gates failed on latency/$, quality-only ships (0).""",
 kps=K("Three columns in CI and in the weekly mail.","Any budget can fail the gate.","Do not celebrate +2 with a timeout.","Measure latency on the real path.","Budgets are written.","Verbose high-score answers still lose."),
 qs=[Q("A change raises quality 2 points but p95 latency doubles. Response?", "Check the latency budget; mitigate or reject. Do not ship on quality alone.", "apply"),
     Q("Why measure latency in the eval job too?", "So the gate sees it. App-only metrics can lag or miss the candidate path.", "recall"),
     Q("Who wins if columns conflict?", "The written budget — product/finance lines, not the researcher’s favourite column.", "apply"),
     Q("A verbose answer scores well and times out. Verdict?", "A cost/latency fail even if the rubric is happy.", "debug")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"a-quality-gate-in-ci": sc(
 what="""**Fail the build on a statistically meaningful drop, not on one flaky case.** That is the gate rule. Meaningful means a threshold you chose (overall or P0 slice) and, for stochastic scores, a repeat.

A gate that never fails is décor. A gate that always flakes will be deleted.""",
 why="""The CI closer. Interviews: how you avoid both rubber stamps and flake hell.""",
 how="""Config: `fail_if overall_delta <= -3 or refund_delta <= -5`. Stochastic: run twice, fail if both miss. Publish the rule in the README.

Review monthly whether the thresholds still match product risk.""",
 failures=F("Threshold 0 on a 20-case stochastic set.",
 "No P0 slice rule.",
 "A gate nobody can explain."),
 line="""The build fails on a meaningful, repeated drop. One flake is not a fail. A gate I cannot explain will be deleted.""",
 walk="""You set −3/−5 with a repeat. Flake tickets die. A real refund regression still fails. The rule is in the README.""",
 follow="""They ask about Bayesian tests. Fine later; a simple repeated threshold ships first.""",
 measure="""Flake-fail rate, real regressions caught, README clarity.""",
 kps=K("Meaningful threshold, not one case.","Repeat stochastic scores.","P0 slices can fail alone.","Explain the rule in the README.","A never-fail gate is décor.","Retune thresholds as risk changes."),
 qs=[Q("What should fail a CI quality gate?", "A statistically meaningful drop on overall or a P0 slice, repeated if stochastic — not one flaky case.", "recall"),
     Q("Threshold 0 on 20 stochastic cases. What happens?", "Constant flakes, then someone deletes the gate.", "debug"),
     Q("May a P0 slice fail the build when overall is flat?", "Yes. That is the point of P0.", "apply"),
     Q("Where is the rule written?", "In the repo README next to `make eval`.", "apply"),
     Q("How often do you retune?", "When product risk or suite size changes — review monthly.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"baseline-you-can-roll-back-to": sc(
 what="""**Keep the last shipped prompt and score next to the candidate.** Rollback is a pair: the artefact (prompt/config) and its scores. If you cannot restore Tuesday’s prompt in one PR, you do not have a baseline — you have a wiki.

This is experiment tracking as an operations rule.""",
 why="""Interview close for M7.7. They ask “what if the gate was wrong?” You roll back to the named baseline.""",
 how="""`prompts/shipped/` or a tag `eval-baseline`. The candidate lives on the branch. Merge swaps the pointer. A revert restores both prompt and the expected scores.

Store the model id too. Rolling back the prompt onto a new silent model is not a rollback.""",
 failures=F("Baseline is “whatever is in main” with no scores.",
 "Prompt in a vendor UI with no export.",
 "Rollback that changes the model id silently."),
 line="""I keep the last shipped prompt and its scores next to the candidate. Rollback is one revert, including the model id. A wiki pointer is not a baseline.""",
 walk="""Wednesday’s ship regresses in prod. You revert the prompt tag. Scores match Tuesday’s baseline. The incident is an hour, not a hunt.""",
 follow="""They ask about feature flags. A flag that points at two prompt ids is a good rollback UX.""",
 measure="""Time-to-rollback, baselines without scores, UI-only prompts.""",
 kps=K("Baseline = shipped artefact + scores.","One-revert rollback.","Include model id.","Not a wiki sentence.","Vendor-UI prompts must be exported.","Flags can point at two ids."),
 qs=[Q("What must sit next to the candidate for a real baseline?", "The last shipped prompt/config and its scores — plus model id.", "recall"),
     Q("Prod regresses after a ship. What is the fast path?", "Revert to the tagged baseline prompt and model id.", "apply"),
     Q("The prompt lives only in a vendor UI. Risk?", "You cannot revert from git. Export it.", "debug"),
     Q("Why store scores with the prompt?", "So you know rollback worked and so CI has a target.", "apply"),
     Q("A revert that also changes the model — is that a rollback?", "Not a clean one. Pin the model id in the baseline.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
},
}