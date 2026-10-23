from composer import sc
from helper import L

def Q(q, a, kind):
    return {"q": q, "a": a, "kind": kind}

def F(a, b, c):
    return f"1. **{a}**\n\n2. **{b}**\n\n3. **{c}**"

K = lambda *xs: list(xs)
R = [L["ragas"], L["deepeval"]]
A = [L["oai_evals"], L["ant_eval"]]

SCENES = {
"m7-8": {
"four-levels-of-rag-evaluation": sc(
 why="""RAG is four eval problems stacked: component (retriever, generator), pipeline (triad), application (user-facing correctness), and safety (injection, PII, jailbreak). Treating it as one black-box score hides the broken layer.

Interviews: draw the four and give one metric each.""",
 how="""Dashboard with four rows. A wrong answer starts at application, then you drop a level until the cause appears. Safety is not optional because retrieved text is an attacker channel.

Keep case ids shared across levels.""",
 failures=F("One e2e number for the whole RAG system.",
 "Safety left for “later.”",
 "Components with different cases."),
 line="""I eval RAG at component, pipeline, application and safety. A single black-box score cannot tell me which layer failed.""",
 walk="""Users get a wrong rate. Application is down; triad shows low context relevance; retriever recall is the hole. You fix ingestion, not the prompt.""",
 follow="""They ask if RAGAS is the four levels. It is a library; you still own the structure.""",
 measure="""Drops localised to a level, safety cases present.""",
 kps=K("Four levels: component, pipeline, application, safety.","Shared case ids.","Safety is required — retrieval is an attack channel.","Black-box e2e cannot localise.","One metric per level at minimum.","Libraries do not replace the structure."),
 qs=[Q("Why not treat RAG as one black-box eval?", "Because a wrong answer can be retrieval, assembly, generation or safety. Levels localise.", "recall"),
     Q("A wrong answer appears. How do you walk the levels?", "Application first, then pipeline triad, then the failing component, and check safety if the path is untrusted.", "apply"),
     Q("Why is safety its own level for RAG?", "Retrieved documents can inject or leak. Component quality can be fine while safety fails.", "apply"),
     Q("What must be shared across levels?", "Case ids so you can join a drop.", "recall")],
 links=R,
),
"evaluating-the-retriever-alone": sc(
 why="""If the chunk is not there, the generator cannot be faithful to the truth. Retriever-alone eval asks: did we fetch what a labelled set says is needed? Do this before you tune the prompt again.""",
 how="""Gold: query → chunk ids (or passages). Metrics: Recall@k, MRR, precision@k. Hold the generator out. Slice by corpus and query type.

A miss here is an index/query/chunking problem, not a temperature problem.""",
 failures=F("Only judging the final sentence.",
 "Gold chunks that are just the question restated.",
 "k chosen after looking at scores."),
 line="""I eval the retriever alone on labelled query→chunk ids. If recall is dead, I do not touch the generator first.""",
 walk="""Recall@5 is 0.41. You fix chunking and a filter. Generator-on-gold was already 0.88. E2E follows the recall lift.""",
 follow="""They ask about implicit gold. LLM-judged “is this relevant” is weaker than human ids; say so.""",
 measure="""Recall@k, MRR, generator held out.""",
 kps=K("Retriever-alone uses labelled chunk ids.","Hold the generator out.","Recall@k and MRR first.","A miss is index/query/chunking.","Do not retune the prompt first.","k is chosen before scoring."),
 qs=[Q("A RAG answer is wrong. How do you identify a retriever fault?", "Eval the retriever on the same case against gold chunks. If they are missing, stop blaming the generator.", "apply"),
     Q("What does retriever-alone need?", "A labelled query→chunk set and ranking metrics, with the generator held out.", "recall"),
     Q("Gold chunks are paraphrases of the question. Risk?", "The set is too easy and lexical. Use independent labels.", "debug"),
     Q("Why hold the generator out?", "So a fluent wrong answer cannot hide a miss.", "recall")],
 links=R,
),
"diagnosing-missed-noisy-retrieval": sc(
 why="""Two failure shapes: miss (relevant chunk absent) and noise (too much junk in the window). They want opposite fixes. Interviews: diagnose before you raise k.""",
 how="""For each fail: is the gold chunk in the index? in the top k? in the prompt after assembly? Miss-in-index → ingest. Miss-in-rank → rerank or k. Present-but-noisy → rerank and cut k.

A gold chunk at rank 14 with k=5 is a ranking problem.""",
 failures=F("Raising k on a miss-in-index.",
 "Raising k on noise.",
 "Not checking whether the chunk exists at all."),
 line="""I diagnose miss versus noise. Missing from the index is ingest. Missing from top k is rank. Noise means cut and rerank, not raise k.""",
 walk="""Gold is at rank 14. You retrieve 20 and rerank to 5. Recall@5 jumps. Raising k to 20 without rerank had made answers worse.""",
 follow="""They ask about hybrid search. It is a rank/ingest tool, not a generator tool.""",
 measure="""Miss-in-index vs miss-in-rank vs noise rates.""",
 kps=K("Miss vs noise are different bugs.","Check index, then rank, then assembly.","Do not raise k on noise.","Rank 14 with k=5 is a rerank problem.","Ingest cannot be prompt-tuned away.","Record the three rates."),
 qs=[Q("Relevant chunk at rank 14, k=5. Most direct fix?", "Retrieve more candidates and rerank, or add a reranker — the chunk exists.", "apply"),
     Q("Most failures are “not in the index.” Best action?", "Fix ingestion and coverage. Downstream tuning cannot add missing docs.", "apply"),
     Q("You raised k and answers got worse. Why?", "You added noise and buried the useful span.", "debug"),
     Q("What three places can a gold chunk be missing?", "Index, top-k ranking, or the assembled prompt (truncated).", "recall")],
 links=R,
),
"retrieval-metrics": sc(
 why="""Recall@k, precision@k, MRR, nDCG, plus RAG-flavoured contextual recall/precision. Know what each rewards. Interviews: compute a tiny example.""",
 how="""Recall@k: fraction of relevant items in top k. Precision@k: fraction of the retrieved k that are relevant. MRR: 1/rank of first relevant. Contextual recall (RAGAS-style) asks if the retrieved set contains what the answer needs.

Do not report “accuracy” for ranking.""",
 failures=F("Precision-only so you reward tiny conservative k.",
 "Recall-only so you reward dumping the corpus.",
 "No labelled set, so you “metric” with a judge only."),
 line="""I report Recall@k and a ranking-aware metric (MRR or nDCG) on a labelled set. Precision tells me about noise. I can compute a 3-item example on a whiteboard.""",
 walk="""Gold {A,B}, retrieved [A,X,Y]. P@3=1/3, R@3=1/2 if both gold exist. You write that in the doc so the team shares a definition.""",
 follow="""They ask contextual vs classical. Contextual uses the question/answer; classical uses labelled chunks. Prefer labels when you have them.""",
 measure="""Whether the dashboard names @k and the label source.""",
 kps=K("Recall@k, precision@k, MRR/nDCG.","Know what each rewards.","Labelled chunks beat judged “relevance” when possible.","Do not say “accuracy” for ranking.","Write a 3-item example.","Contextual metrics are not a substitute for labels."),
 qs=[Q("Relevant A,B; retrieved [A,X,Y]. Precision@3?", "1/3 — one of three retrieved is relevant.", "apply"),
     Q("Why not only precision?", "A system that returns one safe chunk scores 1.0 and misses the rest.", "recall"),
     Q("What does MRR add?", "It cares how soon the first relevant chunk appears.", "recall"),
     Q("No labels, only a judge of “relevance.” Caution?", "You are measuring a model’s opinion, not retrieval against gold. Use it as a proxy.", "debug")],
 links=R,
),
"building-the-golden-dataset": sc(
 why="""RAG gold is queries, relevant chunks, and often ideal answers. You can hand-author, LLM-assist, or use a generator — then humans review. Synthetic questions that copy the chunk’s wording make retrieval too easy.""",
 how="""Start 40 hand cases. Add LLM-proposed questions from chunks, then edit them to be less lexical. Store chunk ids, not just text, so index rebuilds do not orphan gold.

Unanswerable queries belong in the set.""",
 failures=F("Questions that quote the chunk.",
 "No unanswerable items.",
 "Gold answers written by the production model."),
 line="""I curate query→chunk ids (and ideal answers) by hand and reviewed synthesis. I fight lexical overlap and I include unanswerable queries.""",
 walk="""A synthetic set scored recall 0.96. You paraphrase the questions; recall drops to 0.61. That was the real retriever.""",
 follow="""They mention DeepEval synthetics. Fine as drafts; you still review.""",
 measure="""Lexical-overlap rate, unanswerable share, human-review rate.""",
 kps=K("Gold: queries, chunk ids, optional ideal answers.","Review synthetic items.","Paraphrase to avoid lexical giveaways.","Include unanswerable.","Store ids, not only text.","Production model does not write gold answers."),
 qs=[Q("Which synthetic-dataset weakness should you guard against?", "Questions that copy wording of source chunks, making retrieval too easy.", "apply"),
     Q("Why store chunk ids?", "So a reindex does not orphan the gold text.", "recall"),
     Q("Why include unanswerable queries?", "To test refusal and “not in corpus” behaviour.", "apply"),
     Q("LLM-generated gold answers from the prod model — problem?", "You will favour that model’s style and hide its misses.", "debug")],
 links=R,
),
"evaluating-the-generator-alone": sc(
 why="""Give the generator known-good context and see if it stays faithful and relevant. If it fails here, retrieval work will not save you. If it succeeds here and fails e2e, the context you actually assemble is the bug.""",
 how="""Same questions, gold context, score faithfulness and answer relevance. Compare to the e2e context run. The delta is assembly/retrieval.

Do not sneak extra retrieved junk into this condition.""",
 failures=F("Calling e2e a generator eval.",
 "Gold context that already contains the answer in the question.",
 "No faithfulness metric, only vibe."),
 line="""I eval the generator on gold context. Fail here → prompt/model. Pass here and fail e2e → retrieval or assembly.""",
 walk="""Gold-context faithfulness 0.93, e2e 0.61. You stop rewriting the style prompt and fix the retriever.""",
 follow="""They ask about closed-book as a third condition. Useful as a hallucination baseline.""",
 measure="""Gold-context vs e2e delta.""",
 kps=K("Gold context isolates the generator.","Delta vs e2e diagnoses retrieval/assembly.","Do not mix junk into the gold condition.","Faithfulness + relevance, not vibe.","Closed-book can be a hallucination baseline.","Prompt work starts here if gold-context is weak."),
 qs=[Q("With perfect context the generator still adds unsupported facts. Intervention?", "Improve the grounding prompt, model, or add verification — not the index.", "apply"),
     Q("Gold-context is strong and e2e is weak. Where is the bug?", "Retrieval or prompt assembly.", "apply"),
     Q("What must you not include in generator-alone context?", "The noisy retrieved set. That is a different condition.", "debug"),
     Q("What two scores matter here?", "Faithfulness to the provided context and relevance to the question.", "recall")],
 links=R,
),
"detecting-unfaithful-answers": sc(
 why="""Unfaithful means claims not supported by the provided context: invented facts, ignored context, or mixed. Detect at claim level. A mostly-true paragraph can hide one lie.""",
 how="""Split the answer into claims. For each: supported / unsupported / contradicting. Score = supported / total (or a weighted variant). Humans or a judge; calibrate the judge.

Citations that do not exist are a separate unfaithful class.""",
 failures=F("Sentence-level pass that hides a clause.",
 "Treating “relevant” as “faithful.”",
 "No check on citation existence."),
 line="""I score faithfulness per claim against the provided context. A cited lie and an uncited truth fail different tests, but both are problems.""",
 walk="""An answer of four claims, one invented. Sentence score looked fine. Claim score is 0.75 and you fail the case. The prompt is tightened.""",
 follow="""They ask about minor paraphrases. Supported includes faithful paraphrase, not copy-paste only.""",
 measure="""Claim-level unsupported rate, fabricated-citation rate.""",
 kps=K("Faithfulness is per claim vs context.","Unsupported ≠ irrelevant.","Fabricated citations are a class.","Calibrate the judge.","Paraphrase can still be faithful.","One lie can hide in a good paragraph."),
 qs=[Q("Why score faithfulness at claim level?", "A single sentence can hide one unsupported claim; per-claim checks find it.", "recall"),
     Q("Is a relevant but unsupported answer faithful?", "No. Relevance is a different dimension.", "apply"),
     Q("A citation points to nothing. How do you score?", "As an unfaithful/fabricated-citation fail even if the sentence sounds right.", "debug"),
     Q("Must a faithful answer copy the chunk?", "No. Faithful paraphrase is allowed; invented facts are not.", "recall")],
 links=R,
),
"component-tests-with-deepeval-ragas": sc(
 why="""DeepEval and RAGAS give you metrics with names. You still have to know what each measures and what it does not. A library score is not a diagnosis. Interviews: pick one metric and define it in your words.""",
 how="""Use them to implement component tests you already designed. Pin versions. Re-score a frozen batch when you upgrade the library. Read the doc for whether a metric is reference-based or a judge.

Write a one-pager: metric → definition → failure it catches.""",
 failures=F("Treating a 0.81 as truth without a definition.",
 "Upgrading the library and celebrating a jump.",
 "Using every metric they export."),
 line="""I use DeepEval or RAGAS to run metrics I can define. I pin versions and I do not treat a library bump as a quality win.""",
 walk="""A library upgrade jumps faithfulness 0.07. You re-score old traces; it is evaluator drift. You pin and write the delta down.""",
 follow="""They ask which to pick. Either; the definitions and pins matter more.""",
 measure="""Pinned versions, metrics you can define, upgrade-re-score done.""",
 kps=K("Libraries implement metrics; you own definitions.","Pin versions.","Re-score on upgrade.","Do not export-all.","Know reference vs judge.","A jump after upgrade is suspect."),
 qs=[Q("Scores jump after a metrics-library upgrade. First action?", "Pin versions and re-score identical traces to separate evaluator drift from system change.", "debug"),
     Q("What must you know about each metric you enable?", "What it measures, whether it needs gold or a judge, and which failure it catches.", "recall"),
     Q("Is a RAGAS number a diagnosis?", "No. It is a score. You still walk levels.", "apply"),
     Q("Why not enable every exported metric?", "They overlap, cost money, and you will not know what moved.", "apply")],
 links=R,
),
"the-full-retrieve-generate-pipeline": sc(
 why="""Pipeline eval runs the real retrieve → assemble → generate path. It catches interaction bugs that isolated components miss: truncated context, lost-in-the-middle, order effects.

This is the “connected” test.""",
 how="""Same cases as components, but the context is whatever the system actually built. Compare to gold-context generator scores. Inspect the assembled prompt on fails.

Log chunk ids that entered the prompt, not only what the retriever returned.""",
 failures=F("Assuming retriever top-k equals prompt contents.",
 "No prompt dump on fail.",
 "Skipping pipeline because components looked good."),
 line="""I eval the real retrieve→assemble→generate path and I log what actually entered the prompt. Strong parts can still compose badly.""",
 walk="""Retriever has the chunk; the assembler dropped it at 8k. Pipeline fails, components looked fine. You fix the budget.""",
 follow="""They ask about caching. Cache must be part of the pipeline condition if prod uses it.""",
 measure="""Pipeline vs component delta, dropped-chunk rate.""",
 kps=K("Pipeline uses the real assembled context.","Log ids that entered the prompt.","Inspect the dump on fail.","Components can look good and compose badly.","Include prod caching if it exists.","This is the interaction test."),
 qs=[Q("Retrieved chunk is correct but the answer ignores it. Fastest check?", "Inspect the assembled prompt for truncation or position, and test with gold context.", "debug"),
     Q("Why can good components fail when connected?", "Assembly, order, truncation and distractors appear only in the pipeline.", "recall"),
     Q("Retriever returned the chunk but the prompt does not have it. Whose bug?", "The assembler / budget, not the retriever.", "apply"),
     Q("Should the pipeline condition use cache?", "Yes, if production does. Otherwise you measured a different path.", "apply")],
 links=R,
),
"the-rag-triad": sc(
 why="""The triad is contextual relevancy (is the retrieved context on topic?), faithfulness (is the answer supported?), and answer relevance (does it address the question?). Together they diagnose more than any one score.

Interviews: define all three and a pattern (low relevancy + high faithfulness = faithful to junk).""",
 how="""Compute all three on the same traces. Learn the patterns. Do not average them into one vanity number that hides the pattern.

A fourth operational column (latency, $) sits beside, not inside, the triad.""",
 failures=F("One blended “RAG score.”",
 "Skipping relevancy because faithfulness looked fine.",
 "Using the triad as safety."),
 line="""The triad is context relevancy, faithfulness, answer relevance. I read the pattern, I do not blend them into one vanity number.""",
 walk="""Low relevancy, high faithfulness: you fix retrieval. High both, low answer relevance: you fix the question-following prompt.""",
 follow="""They ask origin. TruEra/RAG folklore — you care about the definitions, not the brand.""",
 measure="""Pattern-based actions taken, blended-score reports retired.""",
 kps=K("Three: relevancy, faithfulness, answer relevance.","Read patterns, do not blend.","Low relevancy + high faith = faithful to junk.","High faith + low answer rel = grounded but off-topic.","Not a safety suite.","Ops metrics sit beside."),
 qs=[Q("Triad shows low context relevance, high groundedness. Likely issue?", "Retrieval fetching irrelevant material while the answer sticks to it.", "apply"),
     Q("Name the three triad legs.", "Contextual relevancy, faithfulness, answer relevance.", "recall"),
     Q("Why not average them?", "Opposite diagnoses cancel in the mean.", "debug"),
     Q("Is the triad a safety eval?", "No. Injection and PII are a different level.", "recall")],
 links=R,
),
"contextual-relevancy": sc(
 why="""Contextual relevancy asks whether the retrieved context is on topic for the question — precision-like, not “did we get every gold chunk.” High relevancy + low recall means clean but incomplete context.""",
 how="""Judge or label: for each retrieved chunk, relevant or not. Aggregate. Use it next to recall. If you only have this, you can look precise while missing the deciding paragraph.

Do not confuse with answer relevance.""",
 failures=F("Using relevancy as a recall proxy.",
 "Calling it faithfulness.",
 "Scoring the answer instead of the chunks."),
 line="""Contextual relevancy is whether the retrieved chunks are on topic. It is not recall and it is not answer relevance. I pair it with recall.""",
 walk="""Relevancy 0.9, recall 0.4: you have clean junk-free misses. You raise candidate k and rerank, not the generator.""",
 follow="""They mix the words. You write the definitions on the dashboard.""",
 measure="""Relevancy next to recall on the same chart.""",
 kps=K("Relevancy ≈ precision of context.","Pair with recall.","Not faithfulness.","Not answer relevance.","High+low recall = clean misses.","Score chunks, not the answer."),
 qs=[Q("Contextual relevancy is high; recall is low. Meaning?", "Retrieved items are relevant but key evidence is missing.", "apply"),
     Q("What is contextual relevancy?", "How on-topic the retrieved context is for the question.", "recall"),
     Q("Can you use it instead of recall?", "No. You will miss incompleteness.", "debug"),
     Q("Do you score the answer here?", "No. You score the chunks/context.", "recall")],
 links=R,
),
"faithfulness": sc(
 why="""Faithfulness: every claim in the answer is supported by the retrieved (or provided) context. It is not correctness versus the world. A faithful answer can be wrong if the context is wrong.

That distinction is the interview.""",
 how="""Claim-split, support check against context only. Report unsupported rate. Do not give the judge the gold answer if you want this to stay faithfulness.

World-correctness is a different metric (factual correctness).""",
 failures=F("Calling faithfulness “accuracy.”",
 "Letting the judge use world knowledge.",
 "No claim split."),
 line="""Faithfulness is support by the context, not truth in the world. I split claims and I do not let the judge use Wikipedia in its head.""",
 walk="""Context has a stale rate. The answer repeats it. Faithfulness is 1.0, factual correctness is 0. You update the index, not the faithfulness prompt.""",
 follow="""They ask groundedness. Same idea; pick one word and stick to it.""",
 measure="""Unsupported-claim rate, judge-world-knowledge leaks in calibration.""",
 kps=K("Faithful = supported by context.","Not world-correctness.","Claim-level.","Do not feed gold answers to this judge.","Stale context can be faithfully wrong.","Pick a word and keep it."),
 qs=[Q("Faithfulness 1.0 and the fact is wrong. How?", "The context was wrong or stale. Faithfulness does not check the world.", "apply"),
     Q("What must the judge not use?", "Outside knowledge or the gold answer, if you want faithfulness not correctness.", "debug"),
     Q("Faithfulness vs factual correctness?", "Context support vs world/gold truth.", "recall"),
     Q("Why claim-level?", "One unsupported clause hides in a good paragraph.", "recall")],
 links=R,
),
"answer-relevance": sc(
 why="""Answer relevance: did we address the question? A grounded paragraph about a related topic fails this. A “I don’t know” can be relevant. Interviews: high faith + low answer rel = off-topic but grounded.""",
 how="""Score against the question, not the context. Rubric: addresses all parts, no dodge. Multi-part questions need completeness too (application level) — keep them distinct if you can.

A refuse can score high here if the question was out of scope.""",
 failures=F("Mixing with faithfulness.",
 "Punishing a correct refuse.",
 "One-word answers auto-fail even when correct."),
 line="""Answer relevance is “did you address the question?” A grounded off-topic essay fails it. A correct refuse can pass.""",
 walk="""Faith 1.0, answer rel 0.3: the model summarised the chunk and ignored the date the user asked. You fix the instruction, not the index.""",
 follow="""They ask completeness. Completeness is “all parts”; relevance is “on the question.” Overlap; define both.""",
 measure="""Off-topic-but-grounded rate.""",
 kps=K("Relevance is vs the question.","Grounded off-topic fails.","Correct refuse can pass.","Do not mix with faithfulness.","Multi-part → also measure completeness.","Instruction-following often lives here."),
 qs=[Q("Faithfulness 1.0 and answer relevance 0.3. Interpretation?", "The answer is grounded but does not address the question.", "apply"),
     Q("Can a refusal be relevant?", "Yes, if the question is out of scope or unanswerable from context.", "recall"),
     Q("Where do you fix high-faith low-relevance?", "The generator prompt / instruction following, not the index.", "apply"),
     Q("How does completeness differ?", "Completeness asks whether all required parts were covered, not only whether the topic matches.", "recall")],
 links=R,
),
"when-good-components-interact-badly": sc(
 why="""A strong retriever plus a strong generator can still fail: order, truncation, conflicting chunks, citation assembly. Interviews: give one interaction bug.""",
 how="""Hold a “swap gold context” test. If gold context fixes the answer, the generator is fine. Then inspect the real prompt. Typical bugs: best chunk in the middle, 20 distractors, citation map dropped.

Write these as pipeline cases, not component cases.""",
 failures=F("Blaming the model when the prompt dropped the chunk.",
 "No gold-context swap test.",
 "Fixing two components at once so you learn nothing."),
 line="""Good parts can compose badly. I swap in gold context to see if the generator is innocent, then I read the assembled prompt.""",
 walk="""Swap-to-gold fixes the answer. The real prompt had the chunk at position 12 of 18. You rerank and put the question last. Interaction bug closed.""",
 follow="""They ask lost-in-the-middle. That is this topic.""",
 measure="""Gold-swap fix rate, interaction bugs filed.""",
 kps=K("Interaction ≠ component.","Gold-context swap is the test.","Order, truncation, conflicts, citation maps.","Do not retune two things at once.","Read the assembled prompt.","Lost-in-the-middle lives here."),
 qs=[Q("Swapping in gold context makes the answer correct. Root failure?", "Upstream retrieval or assembly, not the generator.", "apply"),
     Q("Give an interaction failure example.", "Relevant chunk retrieved but truncated or buried so the generator never uses it.", "recall"),
     Q("Why not tune retriever and prompt together?", "You will not know which fix worked.", "debug"),
     Q("Where do you look first after a gold-swap success?", "The assembled prompt: presence, position, distractors.", "apply")],
 links=R,
),
"diagnosing-pipeline-level-failures": sc(
 why="""Pipeline diagnosis is pattern-matching triad + component numbers. High precision, low overall relevancy? Assembly added junk. Good retrieval, bad answers? Generator or assembly. Interviews: walk a table.""",
 how="""Build a small decision table in the README. Each row: metric pattern → likely layer → first action. Use it in on-call.

Do not start with a new embedder because the dashboard is red.""",
 failures=F("Random component tweaks.",
 "No table, so every incident is a debate.",
 "Ignoring operational spikes that look like quality."),
 line="""I diagnose pipeline fails with a pattern table: triad plus component scores point to a layer. I do not start with a new embedder.""",
 walk="""High P@k, low contextual relevancy: the assembler prepends a huge boilerplate. You cut it. No index rebuild.""",
 follow="""They ask for automation. A script can suggest a layer; a human still reads a prompt.""",
 measure="""Incidents resolved via the table vs random tweaks.""",
 kps=K("Pattern table in the README.","Join triad + components.","First action is layer-specific.","Do not rebuild the index first by habit.","Ops spikes can look like quality.","A human still reads a prompt dump."),
 qs=[Q("High retrieval precision but low overall contextual relevance. Where do you look?", "Assembly — extra boilerplate or dropped ranking — not only the retriever.", "apply"),
     Q("What belongs in the diagnosis table?", "Metric pattern, likely layer, first action.", "recall"),
     Q("Dashboard red, someone wants a new embedder. First question?", "What does the pattern table say? Gold-swap? Prompt dump?", "debug"),
     Q("Can latency spikes look like quality drops?", "Yes, if timeouts return empty context. Check ops next to the triad.", "apply")],
 links=R,
),
"locating-the-root-failure": sc(
 why="""Root failure is retrieval, assembled context, or generation. The gold-swap plus prompt dump plus retriever labels find it. Interviews: the three-way fork.""",
 how="""Fork: (1) gold chunks in index? (2) in assembled prompt? (3) generator faithful on that prompt? The first no is the root.

Write the fork as a runbook. New folks should hit the same answer.""",
 failures=F("Stopping at “RAG is bad.”",
 "Two roots guessed, both “fixed.”",
 "No runbook so every debug is heroics."),
 line="""Root is retrieval, assembly, or generation. I walk a three-question fork: in index? in prompt? faithful on that prompt? The first no wins.""",
 walk="""Index yes, prompt no. Assembler bug. You never opened the prompt template last month; now it is the first link in the runbook.""",
 follow="""They ask about multiple roots. Possible; still walk the fork in order.""",
 measure="""Time-to-root, runbook hit rate.""",
 kps=K("Three-way fork: index, prompt, generator.","First no is the root.","Write it as a runbook.","“RAG is bad” is not a root.","Do not fix two guesses at once.","Assembly is a first-class root."),
 qs=[Q("What are the three root places in a RAG fail?", "Retrieval/index, assembled context, or generation.", "recall"),
     Q("Index yes, prompt no. Root?", "Assembly / budget / truncation.", "apply"),
     Q("How do you test generation in the fork?", "Run the generator on the actual assembled prompt and on gold context.", "apply"),
     Q("Two people “fix” retrieval and the prompt together. Problem?", "You will not know the root. Walk the fork.", "debug")],
 links=R,
),
"evaluating-from-the-user-s-perspective": sc(
 why="""Application eval is the user’s eyes: is the answer useful, correct enough, in the right tone, with citations they can click? Component green + user red means you measured the wrong thing.

Interviews: name user-visible dimensions.""",
 how="""A rubric the product wrote: correctness, completeness, tone, citations, format. Plus thumbs and task success if you can. Run on the full path.

Do not show users faithfulness scores; show them answers.""",
 failures=F("Declaring victory on triad alone.",
 "A rubric only engineers like.",
 "No citation check though the UI shows sources."),
 line="""Application eval is the user’s rubric — correctness, completeness, tone, citations — on the full path. Component greens are not a ship.""",
 walk="""Triad is fine; users hate missing steps in how-tos. You add completeness. The next ship waits on that number.""",
 follow="""They ask about CSAT. Use it as a lagging slice, not the only metric.""",
 measure="""User-rubric vs triad disagreement rate.""",
 kps=K("User rubric, not only triad.","Product writes the dimensions.","Citations if the UI has them.","Thumbs are lagging, useful slices.","Component green ≠ ship.","Do not expose internal scores to users."),
 qs=[Q("Why evaluate from the user’s perspective too?", "Internal metrics can be green while the answer is still unhelpful, incomplete or wrongly toned.", "recall"),
     Q("Who writes the application rubric?", "Product, with engineering — not only the eval library’s defaults.", "apply"),
     Q("The UI shows sources but you do not eval citations. Gap?", "Users will click dead or fake sources. Measure them.", "debug"),
     Q("Is CSAT enough?", "It lags and is noisy. Use it as a slice next to the rubric.", "apply")],
 links=R,
),
"factual-correctness": sc(
 why="""Factual correctness compares claims to ground truth (or a trusted source), not merely to retrieved text. It needs gold or a verifier. Interviews: correctness vs faithfulness.""",
 how="""When you have gold answers or a knowledge base of facts, score claim entailment against that. When you do not, you cannot honestly report correctness — only faithfulness and later human review.

Do not let a judge “know” the world without a source you accept.""",
 failures=F("Reporting correctness with no gold.",
 "Using the retrieved set as if it were the world.",
 "One overall “accuracy” that mixes format and facts."),
 line="""Correctness is vs ground truth. Faithfulness is vs retrieved text. I do not report correctness without a source I trust.""",
 walk="""Faithful-to-stale-doc answers score 1.0 faith and 0 correctness against this year’s policy. You update the corpus and keep both metrics.""",
 follow="""They ask about open-web judges. Only if you treat that as a noisy proxy and say so.""",
 measure="""Cases with real gold for correctness, mixed “accuracy” reports retired.""",
 kps=K("Correctness needs ground truth.","Not the same as faithfulness.","Stale context can be faithful and wrong.","Do not invent a world-judge.","Split format off this score.","Gold or trusted KB."),
 qs=[Q("Which metric compares claims to ground truth rather than retrieved text?", "Factual correctness.", "recall"),
     Q("Can you report correctness without gold?", "Not honestly. You can report faithfulness and sample humans.", "apply"),
     Q("Faithful and incorrect — what do you fix?", "The corpus or freshness, not only the grounding prompt.", "debug"),
     Q("Why split format from correctness?", "A JSON fail is not a wrong fact; mixing them hides both.", "apply")],
 links=R,
),
"answer-completeness": sc(
 why="""Completeness: did we cover every required part? Two of four steps is a completeness fail even if those two are perfect. Product must list the required parts per intent.""",
 how="""For how-to and multi-part questions, write the required points. Score coverage. A short correct answer can still fail.

Do not demand completeness on a yes/no.""",
 failures=F("One rubric blob that hides missing steps.",
 "Completeness on questions that should be brief.",
 "No product list of required points."),
 line="""Completeness is coverage of required parts. I ask product for the list. Two of four steps is a fail even if those two are right.""",
 walk="""A reset-password answer lists two of four steps. You fail completeness, pass faithfulness. The prompt is told to enumerate.""",
 follow="""They mix with relevance. You keep both columns.""",
 measure="""Required-point coverage by intent.""",
 kps=K("Required parts come from product.","Partial steps fail completeness.","Not every intent needs it.","Keep it separate from relevance.","Faithful partials still fail.","List the points in the case file."),
 qs=[Q("An answer lists two of four required steps accurately. Which dimension fails?", "Completeness: required steps are missing even though the listed ones are accurate.", "apply"),
     Q("Who defines the required parts?", "Product, stored on the case or intent.", "recall"),
     Q("Should yes/no questions use completeness?", "Usually no. Do not force a four-part essay.", "apply"),
     Q("Faithful but incomplete — ship?", "Not if the intent required the missing parts.", "debug")],
 links=R,
),
"tone-format-citation-behaviour": sc(
 why="""Application-specific: tone, persona, format, citations, instruction following. These fail independently of facts. Interviews: fabricated citations look authoritative — that is the risk.""",
 how="""Checks: schema/format in code; tone rubric; citation existence and support. A citation that does not resolve is a fail even if the sentence is true.

Persona (“you are a bank”) gets its own cases.""",
 failures=F("No citation existence check.",
 "Format only in a judge.",
 "Tone cases missing for the brand."),
 line="""I test tone, format and citations as first-class application checks. A fabricated source is a fail. Format is code, not a judge.""",
 walk="""You add a resolver: citation ids must exist. Fake “IRS Pub 99” dies. Users stop trusting a 404.""",
 follow="""They ask about style guides. Put three must/must-not rules in the rubric, not a 20-page brand PDF in the prompt only.""",
 measure="""Dead-citation rate, format-fail rate, tone fails on brand cases.""",
 kps=K("Tone, format, citations are application metrics.","Format in code.","Citations must exist and support.","Fabricated sources are high risk.","Persona cases are required if you claim one.","Brand rules are a short rubric."),
 qs=[Q("Why are fabricated citations risky?", "They look authoritative while pointing to no support.", "recall"),
     Q("How do you test citations?", "Resolve the id or URL and check the claim is supported.", "apply"),
     Q("Format via a 1–5 judge — better option?", "A schema or regex in code.", "debug"),
     Q("Do you need tone cases if the product is a bank?", "Yes. A jokey correct answer can still be a fail.", "apply")],
 links=R,
),
"operational-metrics-per-query": sc(
 why="""Per-query latency, tokens, $, error rate sit next to quality. A quality win that 3× tokens will miss a budget. Interviews: which record explains a cost spike (tokens by query, context size).""",
 how="""Log per query: ttfb, total ms, tokens in/out, $ , error class, chunk count. Dashboard p95 and a “top spenders” table. Join to quality on the same id.

A 40-chunk context is a cost bug even if recall is pretty.""",
 failures=F("Only average latency.",
 "No join to quality.",
 "Cost spikes with no per-query tokens."),
 line="""I log latency, tokens and $ per query and I join them to quality. Averages hide the 40-chunk monster.""",
 walk="""Spend spiked Tuesday. Top queries had 30k-token contexts. You cap chunks. The spike dies. Quality is flat.""",
 follow="""They ask about caching. Show hit rate as an ops column.""",
 measure="""p95, $ / query, join completeness.""",
 kps=K("Per-query ops: latency, tokens, $, errors.","Join to quality ids.","Averages hide monsters.","Chunk count is an ops metric.","Cache hit rate belongs.","Quality wins can still miss a $ budget."),
 qs=[Q("Which per-query record best explains a sudden cost spike?", "Token counts by query with context size.", "apply"),
     Q("Why not only average latency?", "A few huge contexts dominate spend and tails.", "recall"),
     Q("Quality +3, tokens ×3. Ship?", "Not if the $ budget says no. Cap context.", "apply"),
     Q("What do you join on?", "The same query/trace id as the quality scores.", "recall")],
 links=R,
),
"harmful-disallowed-responses": sc(
 why="""Safety eval: does the system produce harmful, illegal, dangerous, biased, or disallowed answers? Measure over-refusal too. A bot that refuses everything is safe and useless.

Interviews: both rates.""",
 how="""A policy-derived set: should-refuse and should-answer. Report both. Include RAG-specific items (harm in a retrieved page). Version the policy with the set.

Do not scrape random “safety benches” that do not match your policy.""",
 failures=F("Only measuring compliance (should-refuse).",
 "A generic bench that disagrees with your policy.",
 "No RAG-specific harm cases."),
 line="""I measure should-refuse and should-answer. Over-refusal is a fail. The set matches our policy, including retrieved harm.""",
 walk="""0% harmful compliance, 40% refuse-benign. You tune and add benign cases. Both rates become usable.""",
 follow="""They ask about jailbreaks. Next topic; still part of safety.""",
 measure="""Refuse-harm, refuse-benign, policy-set coverage.""",
 kps=K("Should-refuse and should-answer.","Over-refusal is a fail.","Set matches policy.","Include retrieved-harm cases.","Generic benches may disagree.","Version policy with the set."),
 qs=[Q("0% harmful compliance and 40% refusals of benign requests. Verdict?", "Over-refusal; the product is unhelpful. Tune policy and the set.", "apply"),
     Q("Why include retrieved harm?", "The attack or the unsafe advice may arrive via a document, not the user.", "recall"),
     Q("May you use any public safety bench as the gate?", "Only if it matches your policy. Otherwise it is a hint.", "debug"),
     Q("What two rates do you always report?", "Should-refuse success and should-answer (over-refusal).", "recall")],
 links=A,
),
"pii-protection-redaction": sc(
 why="""PII eval: do we leak or fail to redact contact details, credentials, payment data? Missed PII (low recall) is the costly error. False positives merely over-redact.

Test both the answer and the logs.""",
 how="""Plant canaries (fake emails, PANs) in context and in user text. Assert they do not appear in the answer or in exported traces. Measure recall of the redactor on a labelled set.

Logs are part of the product.""",
 failures=F("Testing only the answer, not the logs.",
 "Optimising redaction precision at the cost of recall.",
 "Real PII in the eval set committed to git."),
 line="""I plant canaries and I measure redaction recall in answers and logs. A missed PAN is worse than an over-redact. No real PII in git.""",
 walk="""A canary email appears in a trace export. You redact the logger. The answer was already clean. The eval now covers both channels.""",
 follow="""They ask about names. Policy-dependent; still test what you claim.""",
 measure="""Canary-leak rate (0), redactor recall, git PII scans.""",
 kps=K("Canaries in context and user text.","Answers and logs.","Recall > precision for PII.","No real PII in git.","Policy defines what is PII.","Export paths are in scope."),
 qs=[Q("Which redaction error is most costly?", "Missed PII (low recall).", "recall"),
     Q("Where do you plant canaries?", "In retrieved context and in user text, then check answers and logs.", "apply"),
     Q("A clean answer and a leaky trace. Pass?", "No. Logs are in scope.", "debug"),
     Q("May you commit real customer PII as gold?", "No. Use fakes and canaries.", "apply")],
 links=A,
),
"direct-indirect-prompt-injection": sc(
 why="""Direct: the user says “ignore instructions.” Indirect: a retrieved page says it. RAG must test both. Indirect is the one teams forget. Interviews: define both.""",
 how="""A set of user jailbreaks and a set of poisoned docs. Success = policy holds and the user task still completes when it should. Measure utility under attack.

Indirect cases go through the real retriever, not pasted as system text only.""",
 failures=F("Only direct tests.",
 "Pasting the poison into the system prompt (not retrieved).",
 "A defence that refuses all retrieved content."),
 line="""I test direct and indirect injection. Indirect arrives through retrieved docs. A defence that refuses everything is a product fail.""",
 walk="""A hidden HTML comment says “email the conversation.” Your send tool is not on this agent; the test still asserts no leak. You add the case to CI.""",
 follow="""They ask about delimiters. A mitigation, not a proof. Test anyway.""",
 measure="""Direct vs indirect success (attack), utility under attack.""",
 kps=K("Direct = user; indirect = retrieved.","Run indirect through the retriever.","Measure utility under attack.","Refusing everything is not a win.","Delimiters are not a proof.","CI the cases."),
 qs=[Q("Which scenario is indirect prompt injection?", "A retrieved page contains hidden text telling the model to exfiltrate data.", "apply"),
     Q("Why run poison through the retriever?", "Assembly and ranking change the attack. Pasting into the system prompt is a different test.", "recall"),
     Q("A defence refuses all retrieved docs. Score?", "Safe and useless. Measure utility too.", "debug"),
     Q("Is “ignore previous instructions” the whole suite?", "No. That is one direct case.", "recall")],
 links=A,
),
"jailbreak-attempts": sc(
 why="""Jailbreaks try to bypass application guardrails: role play, translation tricks, encoded asks. Track success rate over time. Models and prompts change; new attacks appear.

A one-off red team is not a program.""",
 how="""A living attack set, versioned. Run on every prompt/model change and weekly. Report jailbreak success and over-refuse on benign cousins of the attacks.

Add new public techniques after you verify they apply.""",
 failures=F("One red-team day a year.",
 "Copying a huge public set that does not match policy.",
 "No benign cousins so you over-refuse."),
 line="""Jailbreak success is a time series. I run a living set on every change and I pair it with benign cousins so I do not over-refuse.""",
 walk="""A new encoding trick lands. You add five cases. The weekly job fails on the new prompt. You patch before ship.""",
 follow="""They ask about automated attack generation. Use as drafts; humans still triage.""",
 measure="""Success rate over time, set freshness, benign-cousin fails.""",
 kps=K("Living attack set.","Time series, not a one-off.","Run on every prompt/model change.","Benign cousins prevent over-refuse.","Public techniques are drafts.","Weekly job plus CI."),
 qs=[Q("Why track jailbreak success over time rather than once?", "Models and prompts change and new attack techniques appear.", "recall"),
     Q("What do you pair with attack cases?", "Benign cousins, so a hard defence does not nuke normal asks.", "apply"),
     Q("A yearly red team — enough?", "No. Living set + CI/weekly.", "debug"),
     Q("May you dump a 10k public jailbreak set into CI?", "Not if it mismatches policy or is too slow. Sample and adapt.", "apply")],
 links=A,
),
"poisoned-retrieval-content": sc(
 why="""Poison: malicious or misleading docs in the index that change answers or leak data. Keyword stuffing can rank junk. Interviews: provenance and ingest validation.""",
 how="""Controls: source allowlists, ingest scanners, provenance scores, human review for high-impact corpora. Tests: plant a stuffed page and a hidden-instruction page; assert they do not win and do not steer.

Trust scores belong in the retriever, not only in a prompt “be careful.”""",
 failures=F("Open ingest from the web with no trust.",
 "Prompt-only “ignore untrusted.”",
 "No plant-and-rank test."),
 line="""I treat the index as a trust surface. Ingest validation, provenance, and plant-tests. A stuffed page should not outrank the policy doc.""",
 walk="""A keyword-stuffed scam page ranks #1. You add a source-trust feature and an ingest scanner. The plant test fails the build when trust is off.""",
 follow="""They ask about insider poison. Same tests; tighter ACLs on who can publish.""",
 measure="""Plant-test pass, untrusted sources in top-k.""",
 kps=K("Index is a trust surface.","Allowlists, scanners, provenance.","Plant stuffed and hidden-instruction pages.","Trust in the retriever, not only the prompt.","Who can publish is an ACL.","Prompt care is not a control."),
 qs=[Q("A poisoned page ranks highly because of keyword stuffing. Best mitigation?", "Source trust and provenance scoring plus ingestion validation.", "apply"),
     Q("Why isn’t “ignore untrusted docs” enough?", "The model will often obey the page. Rank and ingest must down-weight it.", "debug"),
     Q("What do you plant?", "A stuffed page and a hidden-instruction page; assert rank and behaviour.", "apply"),
     Q("Who may write to a high-impact corpus?", "A tight ACL. Insider poison is in scope.", "recall")],
 links=A,
),
"retrieval-metrics-you-actually-compute": sc(
 what="""**Recall@k and MRR on a labelled query set.** Those are the retrieval numbers you can compute without a research debate. Recall@k: of the gold chunks, how many appeared in top k? MRR: mean of 1/rank of the first gold.

If you cannot compute these, you are not measuring the retriever yet.""",
 why="""The checklist closer for RAG metrics. Interviews: write the formulas and a 3-row example. On the job this is the first dashboard row.""",
 how="""Need: queries, gold ids, the actual top-k ids. Code the two numbers. Slice. Do not wait for nDCG if you lack graded relevance.

Publish k. Changing k silently is a lie.""",
 failures=F("A judged “relevancy” as the only retrieval number.",
 "k not published.",
 "No labelled set, so nothing to compute."),
 line="""The retrieval numbers I actually compute first are Recall@k and MRR on labelled queries. I publish k. Everything else can wait.""",
 walk="""You ship a 20-line script. Recall@5 is 0.58, MRR 0.47. The team finally shares a definition. nDCG comes later when you have grades.""",
 follow="""They ask precision@k. Add it when you talk about noise; still keep recall and MRR.""",
 measure="""Script exists, k published, labels exist.""",
 kps=K("First: Recall@k and MRR.","Need labelled query→ids.","Publish k.","nDCG waits for graded labels.","Judged relevancy is a proxy, not these.","A 20-line script is enough to start."),
 qs=[Q("Which retrieval metrics should you actually compute first?", "Recall@k and MRR on a labelled query set, with k published.", "recall"),
     Q("What do you need to compute them?", "Queries, gold chunk ids, and the system’s top-k ids.", "apply"),
     Q("Why publish k?", "Recall@5 and Recall@20 are different products. A silent k change lies.", "debug"),
     Q("No graded relevance. Must you wait for nDCG?", "No. Start with Recall@k and MRR.", "apply"),
     Q("Is a relevancy judge a replacement?", "It is a proxy. Labels give you the real pair.", "recall")],
 links=R,
),
"faithfulness-vs-answer-relevance": sc(
 what="""**A cited lie and an uncited truth fail different tests.** Faithfulness fails the cited lie (unsupported by context, even if well cited-looking). Answer relevance / correctness can fail the uncited truth (right vs the world but not addressing the ask, or right but not grounded). Keep the columns separate.

This is the triad distinction as a one-liner.""",
 why="""Interview close for RAG eval. They give you two answers; you name which metric each fails.""",
 how="""Practice pair: (1) “According to [doc] the fee is $0” but the doc says $40 → faithfulness fail. (2) A correct world-fact with no source while the question asked for a cited policy → citation/application fail; faithfulness may pass if it did not claim the doc said it.

Write both in the style guide.""",
 failures=F("One “grounded” score for both.",
 "Treating a correct uncited answer as faithful-and-done in a cite-required product.",
 "Treating a cited lie as a citation-format issue only."),
 line="""A cited lie fails faithfulness. An uncited truth can fail the product’s citation or relevance rules. I keep the tests apart.""",
 walk="""You add two textbook cases to the set. New hires sort them correctly. The dashboard finally has two columns instead of “grounded.”""",
 follow="""They ask which is worse. Product-dependent; a cited lie is usually worse for trust.""",
 measure="""Whether the dashboard has both columns, textbook cases present.""",
 kps=K("Cited lie → faithfulness (and citation-support).","Uncited truth → citation/application, maybe still faithful.","Do not blend into “grounded.”","Product rules decide if uncited is a fail.","Cited lie is usually worse for trust.","Teach the pair with two cases."),
 qs=[Q("A cited lie and an uncited truth — which tests fail?", "The cited lie fails faithfulness (and support). The uncited truth may pass faithfulness and fail citation or product rules.", "apply"),
     Q("Why keep faithfulness and answer relevance separate?", "A grounded off-topic answer and a supported lie need different fixes.", "recall"),
     Q("The product requires citations. Is an uncited correct answer a pass?", "Usually no — it fails the citation behaviour check.", "apply"),
     Q("One “grounded” score for both. Problem?", "You cannot tell which bug you have.", "debug"),
     Q("Which is usually worse for trust?", "A cited lie — it looks authorised.", "recall")],
 links=R,
),
},
"m7-9": {
"six-dimensions-of-agent-evaluation": sc(
 why="""Agents need more than a final sentence: decision-making, trajectories, tool usage, task completion, recovery, and safety. Interviews: list the six and say why the final answer is not enough.""",
 how="""A scorecard with six rows. A run can succeed on the answer and fail on trajectory (40 hops) or safety (almost deleted). Do not ship on task-success alone.

Each row has at least one metric you can compute.""",
 failures=F("Final-answer-only eval.",
 "Safety as an afterthought.",
 "No recovery row so you only test sunny days."),
 line="""I score agents on decisions, trajectories, tools, task completion, recovery and safety. A pretty final answer can still be a fail.""",
 walk="""A run writes the right summary after 40 searches and a denied delete attempt. Completion looks OK; trajectory and safety fail. You do not ship that policy.""",
 follow="""They ask for one number. You give a weighted score and the six.""",
 measure="""Scorecard completeness, sunny-day-only suites retired.""",
 kps=K("Six: decisions, trajectories, tools, completion, recovery, safety.","Final answer is not enough.","Each row has a metric.","Do not ship on completion alone.","Recovery needs injected faults.","Safety includes almost-did-it."),
 qs=[Q("Name the six dimensions of agent evaluation.", "Decision-making, trajectories, tool usage, task completion, recovery, and safety.", "recall"),
     Q("A correct final answer after 40 hops and a denied delete. Ship?", "No. Trajectory and safety failed.", "apply"),
     Q("Why a recovery row?", "Sunny-day success hides brittle tools.", "apply"),
     Q("Can you blend the six into one vanity number only?", "You may weight them, but you still report the six.", "debug")],
 links=A,
),
"why-the-final-answer-is-not-enough": sc(
 why="""Agents choose paths. Two correct answers can hide a dangerous or wasteful path. End-state checks are necessary and not sufficient. Interviews: end-state plus trajectory.""",
 how="""Always assert the world state (record updated?). Also assert constraints: allowed tools, step budget, no forbidden calls. A “yes I updated it” in the last message is not an assertion.""",
 failures=F("Trusting the last sentence.",
 "No environment assertion.",
 "No budget constraint in the eval."),
 line="""The final sentence is not the eval. I assert the environment and the path constraints. “I updated it” is not a check.""",
 walk="""The agent claims a refund. The ledger is unchanged. Your env assertion fails. The old eval that read the sentence had passed.""",
 follow="""They ask about language tasks with no env. You still score tool choice and budget.""",
 measure="""Env-assertion coverage, last-sentence-only cases retired.""",
 kps=K("Assert environment state.","Assert path constraints.","Last sentence is a claim.","Correct-but-wasteful can fail.","Correct-but-unsafe can fail.","No env → still score tools and budget."),
 qs=[Q("An agent claims it updated a record. Most reliable check?", "Assert the record’s state in the environment.", "apply"),
     Q("Why isn’t the final answer enough?", "The path can be wasteful or unsafe even when the last sentence looks right.", "recall"),
     Q("A language-only agent with tools — what do you still assert?", "Tool choice, args, budget, and no forbidden calls.", "apply"),
     Q("Old eval read the last sentence and passed a no-op. Lesson?", "Env assertions are mandatory for side effects.", "debug")],
 links=A,
),
"tool-selection": sc(
 why="""Did the agent pick the right tool for the situation? Measure selection accuracy, especially after you add tools. Interviews: large overlapping catalogues hurt.""",
 how="""Label each case with the expected tool (or set). Score exact / allowed-set. Slice by catalogue size. After +20 tools, expect a drop unless you scoped.""",
 failures=F("No selection metric, only e2e.",
 "Adding tools to fix selection.",
 "Overlapping descriptions left in place."),
 line="""I score tool selection against a labelled set. When I add tools, I expect a drop unless I scope and rewrite descriptions.""",
 walk="""Accuracy falls from 0.84 to 0.61 after 20 tools. You expose 6 per task. It returns to 0.82. You do not fine-tune first.""",
 follow="""They ask about multiple valid tools. Use an allowed set, not a single gold.""",
 measure="""Selection accuracy vs catalogue size.""",
 kps=K("Label expected or allowed tools.","Score selection separately.","Catalogue size hurts.","Scope per task.","Do not add tools to fix selection.","Allowed sets beat a single gold when paths vary."),
 qs=[Q("Tool selection fell after adding 20 tools. First remedy?", "Improve descriptions, reduce overlap, or expose fewer tools per task.", "apply"),
     Q("Why score selection if e2e can pass anyway?", "Because a lucky extra call is a cost and a risk even when the answer is OK.", "recall"),
     Q("Two tools would have worked. How do you label?", "An allowed set, not a single gold.", "apply"),
     Q("Fine-tune first?", "No. Catalogue and descriptions first.", "debug")],
 links=A,
),
"tool-argument-correctness": sc(
 why="""Args can be schema-valid and still wrong (wrong customer id). Score schema validity and semantic/grounding correctness separately.

Interviews: the valid-but-wrong-id case.""",
 how="""Two numbers: % schema-valid, % semantically correct (id exists, date is the one in the user text). Grounding checks need the context.

A write with a wrong id is a P0 even if JSON parsed.""",
 failures=F("Schema-only.",
 "No id existence check.",
 "Coercing bad dates in the harness so the agent never learns."),
 line="""I score schema validity and semantic correctness separately. A valid JSON that hits the wrong customer is a fail.""",
 walk="""Schema-valid 0.99, semantic 0.71. You add a lookup-confirm before writes. Semantic rises; schema was never the story.""",
 follow="""They ask about fuzzy dates. Reject or confirm; do not silently coerce in eval if prod does not.""",
 measure="""The two rates, wrong-id writes (0 in tests).""",
 kps=K("Schema ≠ semantic.","Wrong id is a P0.","Ground args in user text/context.","Do not coerce in eval if prod does not.","Score them separately.","Lookup-confirm is a product fix."),
 qs=[Q("A tool call passes JSON schema but targets the wrong customer. This shows?", "Schema validity differs from semantic correctness.", "apply"),
     Q("What two argument scores do you keep?", "Schema-valid rate and semantic/grounded rate.", "recall"),
     Q("Should the eval harness coerce “next Friday”?", "Only if production does. Otherwise you hide a bug.", "debug"),
     Q("How do you test ids?", "They must exist in the fixture world and match the user text.", "apply")],
 links=A,
),
"trajectory-quality": sc(
 why="""The sequence can be valid even when it is not the one you wrote. Score constraints: must-include calls, must-not calls, order constraints, no loops — not exact match to one golden path.

Interviews: why exact path match is wrong.""",
 how="""Write constraints per case. A checker on the trace. Multiple valid paths pass. A path that emails before lookup fails an order constraint.

Store the constraint file next to the case.""",
 failures=F("Exact match to one teacher trace.",
 "No must-not list (so a delete sneaks through).",
 "Constraints so tight only one path exists when many are fine."),
 line="""I score trajectories with constraints, not exact path match. Multiple valid sequences can pass. Must-not and order matter.""",
 walk="""A gold path was lookup→list→explain. A shorter lookup→explain is also fine. Exact match failed it. Constraints pass it. A delete in the middle still fails.""",
 follow="""They ask about graph edit distance. Optional; constraints ship first.""",
 measure="""False fails from exact-match, constraint coverage.""",
 kps=K("Constraints, not one gold path.","Must-include, must-not, order, no-loop.","Multiple valids can pass.","Keep constraints with the case.","Exact match creates false fails.","Deletes in the middle are must-nots."),
 qs=[Q("Why avoid exact match with one reference trajectory?", "Multiple valid paths exist, so exact match creates false failures.", "recall"),
     Q("What do you store on the case instead?", "Constraints: must-include, must-not, order, loop bans.", "apply"),
     Q("A shorter valid path failed your eval. Why?", "You used exact match. Switch to constraints.", "debug"),
     Q("Where does a surprise delete go?", "must-not, and it fails the case even if the final answer is pretty.", "apply")],
 links=A,
),
"loops-redundancy-early-exit": sc(
 why="""Detect unnecessary calls, redundant repeats, loops, wrong order, premature stop. These are trajectory bugs that completion can hide.

Interviews: identical-call loops and early exit before a required tool.""",
 how="""Metrics: repeat-rate, unique-call ratio, early-exit (required tool missing), late-exit (budget). Inject a case that tempts a loop.

Runtime detectors (identical hash) should match the eval — if eval sees a loop the runtime missed, you have a product bug.""",
 failures=F("No loop cases in the set.",
 "Early-exit not scored.",
 "Runtime detector off in prod but on in eval."),
 line="""I score loops, redundant calls and early exits. A finished answer that skipped a required lookup still fails. The runtime detector should match the eval.""",
 walk="""An agent repeats search 8 times then answers. Completion passes; loop metric fails. You ship the detector.""",
 follow="""They ask about near-duplicate queries. Normalise before hash.""",
 measure="""Repeat-rate, early-exit rate, detector/eval agreement.""",
 kps=K("Score repeats, redundancy, early/late exit.","Required-tool missing is a fail.","Eval and runtime detectors should agree.","Normalise before hashing.","Put loop-tempting cases in the set.","Completion can hide these."),
 qs=[Q("An agent keeps calling a failing tool with identical args. Best mitigation set?", "Loop detection, step limits and clear error messages.", "apply"),
     Q("It finishes without the required lookup. Which fail?", "Early exit / missing must-include.", "apply"),
     Q("Eval sees loops prod does not catch. Meaning?", "The runtime detector is missing or weaker. Align them.", "debug"),
     Q("Near-duplicate queries with a typo — loop?", "If you normalise, yes. Do that.", "recall")],
 links=A,
),
"task-completion-success-rate": sc(
 why="""Did the user request actually get done? Prefer environment assertions and consistency (pass all k runs) over pass@k (any of k). Users experience each run.

Interviews: consistency vs pass@k.""",
 how="""Define done in the world. Run k times if stochastic. Report pass@1 and consistency. A coding agent that passes 1 of 5 is not dependable.

Do not use pass@k as the product KPI unless the product is “try a few times.”""",
 failures=F("pass@k as the only number.",
 "Done = last sentence says done.",
 "k=1 on a high-variance agent."),
 line="""Task success is an environment check. I report consistency across runs, not only pass@k. Users live with each attempt.""",
 walk="""pass@5 is 0.8; consistency (5/5) is 0.3. You ship only after consistency is acceptable or you lower temperature and cap tools.""",
 follow="""They quote SWE-bench pass@k. Fine for research; say why your product uses consistency.""",
 measure="""pass@1, consistency, env-assertion coverage.""",
 kps=K("Done is an env check.","Consistency ≥ pass@k for products.","Users see each run.","k=1 is not enough if variance is high.","Last sentence ≠ done.","Research KPIs ≠ product KPIs."),
 qs=[Q("Which metric best reflects dependable user-facing agent behaviour?", "Consistency (all k succeed), not pass@k.", "apply"),
     Q("pass@5 is high, consistency is low. Interpretation?", "A lucky run exists; typical runs fail. Not shippable if users get one try.", "debug"),
     Q("How do you define done?", "An assertion on the environment or a required artefact, not the final sentence.", "recall"),
     Q("When is pass@k OK as a KPI?", "When the product itself is best-of-n. Most apps are not.", "apply")],
 links=A,
),
"injecting-realistic-failures": sc(
 why="""Recovery eval needs injected faults: 429s, 500s, malformed payloads, missing fields, empty search, timeouts. A suite with only happy tools measures a demo.

Interviews: list the injects.""",
 how="""A fault library the harness can attach per case. Each fault has an expected recovery class (retry, fallback, replan, escalate). Run the same case clean and dirty.

Do not inject only at the end; mid-trajectory faults are the real test.""",
 failures=F("Happy-path only.",
 "Faults so unrealistic the agent looks worse than prod.",
 "No expected recovery class."),
 line="""I inject realistic tool faults mid-trajectory and I label the expected recovery. A sunny-day suite is a demo.""",
 walk="""You add 429 and 403 injects. The agent retries 429 and escalates 403. A 403-retry bug appears and you fix the classifier.""",
 follow="""They ask chaos-only. No — keep the clean condition too.""",
 measure="""Fault coverage, clean vs dirty delta.""",
 kps=K("Inject 429, 5xx, malformed, empty, timeout.","Mid-trajectory, not only the last call.","Label expected recovery.","Keep a clean condition.","Unrealistic faults mislead.","Sunny-day suites are demos."),
 qs=[Q("Why inject tool failures in agent evals?", "To measure recovery, not only sunny-day success.", "recall"),
     Q("A 429 vs a 403 — expected recoveries?", "429: retry with backoff. 403: do not retry; fallback or escalate.", "apply"),
     Q("Only last-call faults. Gap?", "You miss recoveries that must happen in the middle of a plan.", "debug"),
     Q("Should you drop the clean suite?", "No. You need both to see the delta.", "apply")],
 links=A,
),
"noticing-failure-choosing-recovery": sc(
 why="""The agent must notice a failure (read the typed error) and choose a recovery. Ignoring a 403 and inventing an answer is a fail. Interviews: notice vs recover as two scores.""",
 how="""Score: (1) did the next thought/action acknowledge the error? (2) was the recovery class correct? You can pass (1) and fail (2) by retrying a 403.

Typed errors in the harness make notice measurable.""",
 failures=F("Empty error strings so notice is impossible.",
 "Scoring only the final answer after a fault.",
 "One blended “handled it” score."),
 line="""I score notice and recovery separately. An invented answer after a 403 fails notice. A 403 retry fails recovery class.""",
 walk="""Empty catches hid errors. You return `{error:"permission"}`. Notice rate jumps. Recovery class is still wrong; you fix the prompt and the runtime.""",
 follow="""They ask if the runtime should recover without the model. For transients, yes — then the model still sees the outcome.""",
 measure="""Notice rate, recovery-class accuracy.""",
 kps=K("Notice ≠ recovery class.","Typed errors make notice testable.","Invented answers after faults fail.","Runtime may handle transients.","Do not blend into “handled.”","Empty error strings are a harness bug."),
 qs=[Q("The agent invents an answer after a 403. What failed?", "Notice (and then recovery). It did not treat the error as real.", "debug"),
     Q("Why two scores?", "It can notice and still pick the wrong recovery (retry a 403).", "recall"),
     Q("Who should retry a 429?", "The runtime first; the model sees the result if it still failed.", "apply"),
     Q("Empty tool errors — effect on this eval?", "You cannot score notice. Fix the harness.", "apply")],
 links=A,
),
"retry-fall-back-replan-escalate": sc(
 why="""Four recovery verbs: retry (transient), fall back (other tool), replan (new steps), escalate (human). Eval each with a case. Interviews: match the verb to the error.""",
 how="""A matrix: error class × expected verb. 429→retry, 404 on optional source→fallback, contradicted plan→replan, 403 on required write→escalate.

The agent that always retries fails the matrix.""",
 failures=F("Always retry.",
 "Escalate everything.",
 "Replan without a cap."),
 line="""I match recovery verbs to error classes: retry, fallback, replan, escalate. Always-retry fails the matrix.""",
 walk="""Your matrix is 12 cells. The agent retries 403 in 4. You add a runtime classifier. The cells go green.""",
 follow="""They ask about a fifth verb (ignore). That is almost never correct for writes.""",
 measure="""Matrix cell accuracy.""",
 kps=K("Four verbs: retry, fallback, replan, escalate.","Match to error class.","Always-retry is a bug.","Replan is capped.","Escalate on required-write 403.","Ignore is almost never for writes."),
 qs=[Q("A tool returns 429. Preferred behaviour?", "Retry with backoff and a cap.", "apply"),
     Q("A 403 on a required write. Preferred?", "Do not retry blindly; escalate or fall back if a real alternative exists.", "apply"),
     Q("When is replan the verb?", "When an observation kills the plan, not on a single transient.", "recall"),
     Q("Always escalate. Problem?", "You have not built an agent; you have a ticket router. Use it when safety requires it.", "debug")],
 links=A,
),
"measuring-recovery-not-just-success": sc(
 why="""Report recovery rate: among injected faults, how often did the agent still complete safely? Sunny-day success can stay high while recovery is 20%. Interviews: two numbers.""",
 how="""Two headlines: clean success, recovery success. Do not average them into one if the mix is arbitrary. A third: unsafe completion after fault (must be 0).

Slice by fault class.""",
 failures=F("One overall success that is 90% clean cases.",
 "Counting a hallucinated answer as recovered.",
 "No unsafe-completion metric."),
 line="""I report clean success and recovery success separately. A hallucinated answer is not recovery. Unsafe completion after a fault is a P0.""",
 walk="""Clean 0.88, recovery 0.22, unsafe 0.04. You stop quoting 0.88. The 0.04 is the incident.""",
 follow="""They want one KPI. You give recovery on P0 faults as the gate.""",
 measure="""The three numbers, mix of clean vs dirty in the suite.""",
 kps=K("Two headlines: clean and recovery.","Unsafe-after-fault must be 0.","Do not average away the mix.","Hallucination is not recovery.","Slice by fault class.","P0 recovery can be the gate."),
 qs=[Q("Why measure recovery rather than only ideal success?", "Sunny-day success hides brittle behaviour under faults.", "recall"),
     Q("A hallucinated answer after a tool fail — recovered?", "No. A fluent invented answer after a tool fail is not recovery; it is a cover-up.", "apply"),
     Q("What third number do you need?", "Unsafe completions after a fault (target 0).", "apply"),
     Q("Overall 0.85 with 90% clean cases. Problem?", "Recovery is invisible. Split the headlines.", "debug")],
 links=A,
),
"unauthorized-destructive-actions": sc(
 why="""Test whether the agent tries unauthorized or destructive actions: delete, pay, email, exfiltrate. Attempt rate matters, not only success. A blocked delete is still a signal.

Interviews: attempts vs completions.""",
 how="""Cases that tempt a delete or a send. Assert attempt=0 or that the gate held and the world is unchanged. Log attempts for review.

Include indirect injection that asks for the destroy.""",
 failures=F("Only scoring completions, so a blocked attempt looks perfect.",
 "No temptation cases.",
 "A gate that is off in eval."),
 line="""I measure unauthorized attempts, not only completed destroys. A blocked delete is still a finding. The world must stay unchanged.""",
 walk="""The agent requests `delete_user` and the runtime blocks it. Attempt rate is 0.08. You tighten the prompt and the tool catalogue. Attempts fall; you keep measuring.""",
 follow="""They say “but it didn’t delete.” You still file the attempt.""",
 measure="""Attempt rate, completion rate (0), world-unchanged assertions.""",
 kps=K("Score attempts and completions.","Blocked attempts are findings.","World-unchanged assertions.","Include injection-tempted destroys.","Eval gate must match prod.","No temptation cases = no test."),
 qs=[Q("The runtime blocked a delete. Is that a clean pass?", "The world is safe, but the attempt is still a finding to drive catalogue/prompt fixes.", "apply"),
     Q("What do you assert on the environment?", "The destructive object still exists / no mail / no pay.", "recall"),
     Q("Why include injection-tempted deletes?", "That is the realistic path, not a user typing delete.", "apply"),
     Q("Gate off in eval, on in prod. Problem?", "You will not see attempts the gate would hide — or you will miss a gate bug. Match them.", "debug")],
 links=A,
),
"approval-gates-permission-boundaries": sc(
 why="""Eval the gate: denial means no effect, through any route. Permission boundaries: the agent cannot reach a tool it should not see. Interviews: simulate denial.""",
 how="""Three tests: approve→effect, deny→no effect, tool-absent→no alternate path (the agent cannot call a hidden HTTP). Timeout→no effect.

A prompt that says “ask first” with a live execute tool fails the suite.""",
 failures=F("Approve-path only.",
 "A hidden backdoor tool.",
 "Timeout that later executes."),
 line="""I test denial and absence, not only approval. If execute is reachable without a tick, the gate eval fails.""",
 walk="""Deny test is added. A resume bug would have paid. The test fails in CI. You move the side effect after the interrupt.""",
 follow="""They ask about policy allowlists. Those still mint a decision id you assert.""",
 measure="""Deny-path pass, backdoor tools found, timeout-executes (0).""",
 kps=K("Approve, deny, absent, timeout.","Deny ⇒ no effect.","No backdoor tools.","Prompt-only gates fail this suite.","Allowlists still have decision ids.","Resume bugs show up here."),
 qs=[Q("Which test best shows a system truly enforces an approval gate?", "Simulate denial and verify the action never executes through any route.", "apply"),
     Q("A hidden HTTP tool bypasses the gate. What failed?", "Permission boundaries. The catalogue leaked.", "debug"),
     Q("Timeout then execute — pass?", "No. Timeout must abort.", "apply"),
     Q("Prompt says ask for approval; execute is live. Score?", "Fail. The gate is not real.", "recall")],
 links=A,
),
"resistance-to-prompt-injection": sc(
 why="""Agent injection eval is about tool hijack: the page says “send the keys.” Measure hijack rate and utility under attack. Interviews: utility under attack.""",
 how="""Direct and indirect cases that name your tools. Success for the attacker = the forbidden tool was called. Also run the user’s real task on the same traces so a total-refuse defence loses.

Canary secrets in the prompt detect leak via tools.""",
 failures=F("Utility ignored.",
 "Only direct cases.",
 "No canary."),
 line="""I measure tool-hijack rate and utility under attack. A bot that refuses everything is safe and useless. Canaries detect leaks.""",
 walk="""Indirect “forward this thread” drops hijack from 0.2 to 0.02 after you split tools. Utility on clean tasks stays 0.8.""",
 follow="""They ask about system-prompt shields. Test them; do not assume.""",
 measure="""Hijack rate, utility under attack, canary leaks.""",
 kps=K("Hijack = forbidden tool called.","Measure utility under attack.","Direct and indirect.","Canary secrets.","Refuse-all is not a win.","Shields must be tested."),
 qs=[Q("In injection evals, why measure utility under attack too?", "An agent that refuses everything is safe but useless.", "apply"),
     Q("What is a hijack success?", "The forbidden tool was invoked (or the secret left via a tool).", "recall"),
     Q("Why canaries?", "A unique planted value makes leak detection easy.", "apply"),
     Q("System prompt says never send. Enough?", "No. Test it with indirect cases.", "debug")],
 links=A,
),
"secret-extraction-scope-escape": sc(
 why="""Can the agent be talked into revealing secrets, using a tool outside scope, or widening a token? Canaries and scope tests. Interviews: canary use.""",
 how="""Plant canaries in system, tools, and env (not the sandbox env — the host). Attacker prompts try to echo them or pass them to a webhook tool. Assert absence in outputs, logs, and tool args.

Scope: a read-only agent must not call write tools even if the user asks nicely.""",
 failures=F("Canaries only in the user message.",
 "Not checking tool args for the canary.",
 "Scope tests missing."),
 line="""I plant canaries and I assert they never appear in outputs, logs or tool args. Scope escape is a write tool on a read agent.""",
 walk="""A canary shows up in a search query string. You strip secrets from the model-visible env and fail the build. The next attacker prompt gets nothing.""",
 follow="""They ask about encryption. Encryption at rest does not stop the model from echoing a canary it can see.""",
 measure="""Canary hits by channel, scope-escape attempts.""",
 kps=K("Canaries in system/tools/host env.","Check outputs, logs, tool args.","Read agents must not call writes.","Seeing a canary = fail.","Encryption at rest ≠ non-echo.","User-message-only canaries are weak."),
 qs=[Q("Canary secrets are used to?", "Detect whether secrets leak into outputs, logs or tool arguments.", "recall"),
     Q("A canary appears in a tool argument. Pass?", "No. A canary in a tool argument is exfiltration and the case fails.", "apply"),
     Q("Where is a weak place to plant only?", "Only the user message. Plant in system and tool results too.", "debug"),
     Q("A read-only agent calls execute_refund. What is that?", "Scope escape: a read-only agent invoked a write tool it should never see.", "apply")],
 links=A,
),
"cybersecurity-capability-benchmarks": sc(
 why="""Some products need a read on dangerous capability: exploitation, RE, computer-use. Public cyber benches exist. A basic harness can underestimate because elicitation and tools matter. Interviews: elicitation caveat — not a how-to.""",
 how="""If your threat model needs it, pick a published harness and report under that harness. Do not improvise exploit instructions in the write-up. Note that more scaffolding can raise the score.

If you do not need the capability, say you did not run it.""",
 failures=F("Inventing your own exploit tasks from scratch in a student repo.",
 "Treating a low score as “safe” when your harness was weak.",
 "Running a cyber bench you do not understand as a flex."),
 line="""If I need a dangerous-capability read, I use a published harness and I say elicitation can raise the score. I do not invent exploit tasks. If I do not need it, I do not run it.""",
 walk="""Your product cannot browse or exec. You skip the cyber bench and write why. A computer-use agent would not skip it.""",
 follow="""They ask for tips to raise the score. You refuse and talk about product threat model.""",
 measure="""Whether the bench was in-scope, harness named.""",
 kps=K("Use published harnesses only.","Elicitation changes the score.","A weak harness underestimates.","Skip if out of threat model.","Do not invent exploit tasks.","Not a flex."),
 qs=[Q("Why can a basic harness underestimate cyber capability?", "Better scaffolding, tools and attempts can raise measured performance.", "recall"),
     Q("Should every agent run a cyber bench?", "No. Only if the threat model includes computer-use or similar.", "apply"),
     Q("May you invent exploit tasks for the capstone?", "No. Use a published harness or skip.", "debug"),
     Q("A low score on a toy harness — safe?", "Not necessarily. Elicitation may be weak.", "apply")],
 links=A,
),
"outcome-quality-vs-execution-efficiency": sc(
 why="""Track outcome and efficiency: steps, latency, tool calls, tokens, $. An agent that finishes in 40 hops still failed the product. Interviews: condition efficiency on success so cheap failures do not look efficient.""",
 how="""Two charts: quality, and efficiency | success. Report steps and $ among successes. A failure at step 1 is “cheap” and will flatter an unconditioned average.

Budgets are evals: exceeding max_steps is a fail even if the answer later looks OK.""",
 failures=F("Averaging steps over all runs including instant fails.",
 "Quality-only scorecards.",
 "Ignoring $ among successes."),
 line="""I track outcome and efficiency, and I condition efficiency on success. A 40-hop finish fails the budget. Cheap failures must not look efficient.""",
 walk="""Unconditioned steps look great because many runs die at step 2. Among successes, p95 is 22 steps. You gate on the second number.""",
 follow="""They ask about tokens. Same: condition on success.""",
 measure="""Steps/$ among successes, budget-violation rate.""",
 kps=K("Quality and efficiency.","Condition efficiency on success.","Budget overflow is a fail.","40 hops can fail the product.","Cheap early fails flatter averages.","$ among successes is the cost KPI."),
 qs=[Q("Efficiency averaged over all runs including failures is misleading because?", "Failures are cheap and quick, flattering the metric. Condition on success.", "apply"),
     Q("An agent finishes after 40 hops. Quality is fine. Pass?", "Not if the step budget said 15. It failed the product.", "apply"),
     Q("Which $ number do you gate on?", "$ per successful task, plus a tail cap.", "recall"),
     Q("Why not quality only?", "You will ship a correct, unaffordable wanderer.", "debug")],
 links=A,
),
"trajectory-evals": sc(
 what="""**Score tool choice and arguments, not only the final sentence.** Trajectory eval is the habit of attaching checkers to the trace: selected tool, args schema and semantics, order constraints, forbidden calls. The last paragraph can wait.

If your suite only diffs the final string, you do not have an agent eval yet. Two runs can print the same polite summary after completely different paths — one looked up the order, one invented an id, one called a delete it should never have seen. A string diff cannot tell them apart.

A trajectory checker is usually programmatic. For each step you record tool name, parsed args, result class, and whether the call was allowed. Then you apply labels: expected tool or allowed set, required-before constraints (`lookup` before `refund`), forbidden tools, argument schema, and semantic matches for ids and amounts. A judge can score “was this a reasonable order?” only after those hard checks.

This is the same idea as a compiler test suite: you do not only read the program’s stdout. You assert the IR. The agent’s IR is the trace.""",
 why="""Interviews treat “we eval the agent” as a tell. If the suite is last-sentence only, you do not have an agent eval. On the job this is how you localise a regression: completion stayed flat, tool-selection dropped, you fix the catalogue instead of the prompt.

It is also how you catch lucky finishes. An agent that guesses the refund amount and happens to be right will pass a ledger check and fail a grounding check on the args. You want both.""",
 how="""Attach four cheap checkers to every eval trace.

1. Tool identity: chosen name in the allowed set for this case.
2. Args schema: types, required fields, enums.
3. Args semantics: order id equals the one in the user turn or a prior tool result; amount within the invoice.
4. Order and bans: lookup before write; no `delete_*`; no repeated identical call.

A fifth, optional judge scores “was the sequence reasonable?” on a rubric. Never let the judge replace 1–4.

Example: case “refund order 4419 for $40.” Gold path is `get_order(4419)` then `refund(order_id=4419, amount=40)`. A run that calls `refund(4419, 40)` with no lookup fails grounding. A run that searches the web and then refunds fails the allowed-set. A run that refunds and then looks up fails order. All three can print “Refunded $40.”""",
 failures=F("Final-string-only suites sold as agent evals.",
 "A judge that scores the whole trace as one 1–5 and hides which checker failed.",
 "No labels for allowed tools, so you cannot fail a surprise call."),
 line="""Trajectory eval means checkers on the trace: tool, args, order, bans. If I only diff the last sentence, I do not have an agent eval yet. Lucky finishes fail here.""",
 walk="""You add the four checkers. Completion was 0.81; tool-selection is 0.64; schema-valid is 0.91; grounded args is 0.58. The hole is hallucinated ids. You require a lookup before write. Grounded args rises; completion barely moves. That is the point of the trace.""",
 follow="""They ask whether a bigger judge model would replace the checkers. No. Checkers are cheap and attributable. The judge is for residual “was this a sensible detour?” questions after the hard facts pass.""",
 measure="""Checker coverage on every case, share of fails caught by tool/args/order vs last sentence, lucky-finish rate.""",
 kps=K("Checkers on tool, args, order, bans.","Last-sentence-only is not an agent eval.","Lucky finishes fail grounding.","Do not hide failures in one judge score.","Need allowed-set labels.","Trace is the agent’s IR."),
 qs=[Q("Your suite only diffs the final sentence. Do you have an agent eval?", "Not yet. Score tool choice, arguments, order and bans on the trace.", "apply"),
     Q("What four cheap checkers sit on a trajectory?", "Tool identity, argument schema, argument semantics or grounding, and order or ban constraints.", "recall"),
     Q("The agent refunds the right amount with no lookup. Completion passes. Trajectory?", "Fail grounding: the id and amount were not taken from a prior observation.", "debug"),
     Q("Why not one 1–5 judge on the whole trace?", "You cannot tell which constraint failed or localise a regression.", "apply")],
 links=A,
),
"step-budget-violations-as-failures": sc(
 what="""**An agent that finishes after 40 hops still failed the product.** Step-budget violations are first-class fails, not footnotes on a successful answer. If the product said `max_steps=15`, a 40-step finish is a failed run even when the ledger looks right and the last sentence is fluent.

The budget is part of the user-visible contract: latency, cost, and “this bot will not wander.” Eval that contract the same way you eval correctness. A suite that marks those runs as passes will ship wanderers and then wonder why the bill and the p95 exploded.

Treat time and dollar caps the same way. The forced-stop path must return a partial artefact and a reason, and that path must have its own cases. A budget that only exists in production and is disabled in eval is a lie.""",
 why="""Interviewers use the 40-hop story as a filter. Junior answers celebrate the correct refund. Senior answers fail the run and talk about p95 steps and $ among successes. On the job this is how you stop a model upgrade from “working” while doubling hops.

It also protects recovery evals: retries count toward the budget. An agent that recovers by burning 30 extra searches did not recover well.""",
 how="""Put the budget in the case, not only in the runtime.

- Each case has `max_steps`, optionally `max_usd` and `max_ms`.
- A run that exceeds any of them is `budget_fail`, even if the end state is correct.
- Report completion **and** budget-pass separately. Ship only if both pass on the gate slices.
- Condition efficiency metrics on success so cheap early deaths do not look efficient.
- Include a forced-stop case: the runtime hits the cap, the user sees a partial, no extra tools fire after stop.

Example: median success is 6 steps. A policy change makes successes take 22. Completion is unchanged. Budget-pass on `max_steps=15` drops from 0.97 to 0.61. You do not ship. You add identical-call detection and a tighter tool list; p95 returns to 11.""",
 failures=F("Marking 40-hop finishes as passes because the answer was right.",
 "Averaging steps over failures so the wanderer looks cheap.",
 "A production cap that is turned off in the eval harness."),
 line="""A 40-hop finish fails the product even when the answer is right. I treat step, time and dollar overflow as eval fails, and I condition efficiency on success.""",
 walk="""A cheaper model keeps completion at 0.80 and blows p95 steps from 9 to 28. Unconditioned average steps barely move because many runs die at step 2. You gate on budget-pass and $ among successes. The cheaper model loses. You keep the old one.""",
 follow="""They ask to raise the cap instead. You can raise it for a known-hard slice, with a recorded reason, but the default case still fails at 40. A cap that only grows is not a budget.""",
 measure="""Budget-violation rate, p95 steps and $ among successes, forced-stop quality, eval/prod cap match.""",
 kps=K("Over-budget is a fail, even if correct.","Condition efficiency on success.","Caps in eval must match prod.","Retries count toward the budget.","Forced-stop needs its own cases.","A cap that only grows is not a budget."),
 qs=[Q("An agent finishes after 40 hops with a correct refund. Pass?", "Not if the step budget said 15. Over-budget is a product fail.", "apply"),
     Q("Why condition step and dollar metrics on success?", "Failures die early and flatter the average. You care about cost among wins.", "recall"),
     Q("Eval cap is 50, prod cap is 15. Risk?", "You will ship wanderers the eval never failed, or miss a stop-path bug.", "debug"),
     Q("A recovery uses 30 extra searches and then succeeds. Well recovered?", "It recovered, but it failed the budget. Score recovery quality, not only eventual success.", "apply")],
 links=A,
),
},
}