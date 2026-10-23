from helper import note, LI_HOME, LC_INTRO

NOTES = {
 "m4-9": {
  "building-the-pipeline-by-hand": note(
   what="""**Build the RAG pipeline manually** on the retrieval system from earlier in this level: ingest, chunk, embed, store, retrieve, assemble, generate, cite, abstain. No framework until this works. Hand-built means you can print every message and every chunk id.

The capstone of the level starts here. Frameworks come in M4.14 after you know what they hide.

A pipeline you cannot step through is a demo, not a baseline.""",
   why="""Interviewers will ask you to build RAG from scratch. They want this list. On the job, the hand-built path is how you debug the framework later.""",
   how="""One script or a few functions. Example. Load markdown, chunk, embed, brute-force or pgvector, take k, fill a prompt template, call the chat API, parse citations, abstain if empty. Write a fixture with two docs and three questions.

Do not start in LlamaIndex. Start in a file you can read in a review.""",
   fails="""1. **Framework first**, no baseline.

2. **No fixture.**

3. **Cannot print the prompt.**

4. **Skipping abstain** 'until later'.""",
   line="""I build ingest, chunk, embed, top-k, grounded prompt, citations, and abstain by hand before I take a framework. I can print every chunk id that entered the model.""",
   kps=[
    "Hand-build the full path before a framework.",
    "Every verb is a function you can print.",
    "Use the retrieve system from earlier modules.",
    "A two-doc fixture is the first test.",
    "Abstain is in the baseline, not a later extra.",
    "M4.14 is allowed only after this works.",
   ],
   qs=[
    {"q": "What does 'build the pipeline by hand' include?", "a": "Ingest, chunk, embed, store, retrieve, assemble, generate, cite, and abstain — as code you can step through, not a hidden query engine.", "kind": "recall"},
    {"q": "A teammate opens with LlamaIndex and cannot print the context. What do you do?", "a": "Stop and write the hand-built baseline. You cannot debug or parity-test a prompt you cannot see.", "kind": "debug"},
    {"q": "What is a good first fixture?", "a": "Two short docs with disjoint facts and three questions: one answerable from A, one from B, one from neither (must abstain).", "kind": "apply"},
    {"q": "Why reuse the earlier retrieve system?", "a": "So this module tests assemble and generate, not a second ad-hoc index. Chunk ids stay stable.", "kind": "apply"},
    {"q": "Is a notebook a valid hand-built pipeline?", "a": "Yes if every verb is visible and the fixture runs. No if the important call is a one-liner into a framework.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask to see the functions. If the first artefact is a QueryEngine, they skipped the baseline.",
  ),
  "retrieve-assemble-generate": note(
   what="""The happy path: **retrieve top-k chunks, assemble them into the prompt, generate an answer grounded in that context**. Assemble is not `join(chunks)`. It is a template: system rules, numbered evidence with ids, the question, output schema (answer + citations + abstain).

Order and labels matter. A wall of text with no ids is how you get uncited fluency.

k here is the number you send to the model, not the ANN retrieve-k if a reranker sits in between.""",
   why="""This is the middle of the spine. On the job, assemble bugs look like model bugs.""",
   how="""Template: 'Use only the sources. If none suffice, abstain. Sources: [1] ... [2] ... Question: ...' Example. k=4 after rerank; each block is `id | title | text`. Parse the model's citation list against those ids.

Cap total tokens. If the four chunks overflow, you did not assemble — you spilled.""",
   fails="""1. **Unlabelled dump** of chunks.

2. **Sending retrieve-k=50** to the LLM.

3. **No token cap** on assemble.

4. **Citations that are not ids.**""",
   line="""I retrieve top-k, assemble labelled evidence plus rules, and generate only from that. k to the model is the post-rerank k, and I cap the window.""",
   kps=[
    "Retrieve, assemble, generate is the happy path.",
    "Assemble is a labelled template, not a join.",
    "k-to-model is the post-rerank k.",
    "Cap tokens or you spilled, not assembled.",
    "Citation ids must match the labels you sent.",
    "Rules and the question sit outside the evidence.",
   ],
   qs=[
    {"q": "What are the three verbs of the happy path?", "a": "Retrieve top-k, assemble a labelled prompt with rules, generate a grounded answer. Assemble is a template, not a string join.", "kind": "recall"},
    {"q": "The model cites [7] and you only sent [1]–[4]. What broke?", "a": "Generate invented a source, or assemble labelled poorly. Refuse citations outside the set you sent.", "kind": "debug"},
    {"q": "You retrieve 50 for a reranker. How many go to the LLM?", "a": "The post-rerank shortlist (often 3–5), not 50. 50 is a retrieve-k, not an assemble-k.", "kind": "apply"},
    {"q": "What belongs in the assemble template besides chunks?", "a": "Grounding rules, the question, and an output schema (answer, citations, abstain). Chunks alone are not a prompt.", "kind": "apply"},
    {"q": "Why label chunks with ids?", "a": "So citations are checkable and so you can drop a claim that points at nothing.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see the template. If chunks are concatenated with no ids or rules, assemble is missing.",
  ),
  "prompting-for-grounded-answers": note(
   what="""A **grounded prompt** tells the model to **answer from supplied evidence** and to **avoid unsupported claims**. Spell the rule, the abstain path, and the citation format. Soft vibes ('be careful') do not bind.

Good prompts also say what not to do: no outside knowledge, no invented ids, no hedging that hides a miss.

This is still a baseline prompt. Structured output (M2) can make the abstain field required.""",
   why="""Interviewers will ask how you stop hallucination in RAG. The prompt is one lever, not the only one. On the job, this is the cheapest generate-side fix.""",
   how="""Write three sentences of law: use only sources; if insufficient, set abstain; cite ids you used. Example. Then test with a question whose answer is not in the chunks — the model must abstain, not 'helpfully' fill.

Iterate the prompt on generate-side failures only.""",
   fails="""1. **'Be accurate'** as the only rule.

2. **Allowing outside knowledge** 'when helpful'.

3. **No abstain instruction.**

4. **Prompt-only** with no citation check.""",
   line="""I instruct the model to answer only from the evidence, to abstain when it is insufficient, and to cite ids. Soft wording is not a rule.""",
   kps=[
    "State use-only-sources, abstain, and cite-ids.",
    "Soft 'be careful' does not bind.",
    "Do not invite outside knowledge.",
    "Test with a question the chunks cannot answer.",
    "Prompt is a generate-side lever, not a retrieve fix.",
    "A required abstain field beats a hedged paragraph.",
   ],
   qs=[
    {"q": "What must a grounded RAG prompt state?", "a": "Answer only from the supplied sources, abstain if they are insufficient, and cite the ids you used. No outside knowledge, no invented ids.", "kind": "recall"},
    {"q": "The prompt says 'use sources when possible'. The model invents a date. Why?", "a": "When possible is a hole. The rule must forbid unsupported claims, not suggest sources as a nice-to-have.", "kind": "debug"},
    {"q": "How do you regression-test the prompt?", "a": "A fixture question whose gold is abstain. If the model answers, the prompt (or schema) failed, not retrieve.", "kind": "apply"},
    {"q": "Can the prompt fix a retrieve miss?", "a": "No. It can make the model abstain instead of inventing. The span still has to be retrieved to answer.", "kind": "apply"},
    {"q": "Why mention structured output here?", "a": "A required insufficient_evidence field is harder to skip than a prose hedge. The prompt and the schema should agree.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Read their system prompt. If it does not forbid outside knowledge and inventing ids, it is not grounded.",
  ),
  "handling-weak-or-missing-context": note(
   what="""Retrieval will return **weak, irrelevant, or empty** context. The baseline **abstains** (or asks a clarifying question). It does **not** drop filters, raise k to 100, or let the model 'help from memory'.

Weak is not only empty. Top-k of off-topic chunks is weak. Score or a reranker can flag it; so can a simple 'if max similarity < T' on a labelled threshold.

User-visible: 'I do not have that in the docs' plus the query you tried, not a fluent guess.""",
   why="""Interviewers will ask what happens on a miss. Abstain. On the job, this is the trust path.""",
   how="""Branch: empty → abstain. Low score → abstain or broaden one safe filter. Example. Tenant filter empty: abstain, do not drop tenant. All chunks below T: abstain. One weak chunk that still contains the id: you may still answer and cite.

Log the branch. Product can later add 'search the web' as an explicit tool, not a silent fallback.""",
   fails="""1. **Silent memory fallback.**

2. **Dropping ACL** to get hits.

3. **No empty UI.**

4. **Treating any top-k as strong.**""",
   line="""Empty or weak context means I abstain or clarify. I do not drop the tenant filter and I do not let the model fill from memory.""",
   kps=[
    "Empty and off-topic are both weak context.",
    "Default action is abstain, not memory.",
    "Never drop ACL to get hits.",
    "A similarity threshold needs a labelled T.",
    "Show the user that the docs did not cover it.",
    "A later web tool is explicit, not silent.",
   ],
   qs=[
    {"q": "What does the baseline do on weak or missing context?", "a": "Abstain or ask a clarifying question. It does not invent from parametric memory or drop security filters to force hits.", "kind": "recall"},
    {"q": "Retrieve returns 5 off-topic chunks and the model answers anyway. What is missing?", "a": "A weak-context branch: score threshold, reranker gate, or a prompt+schema abstain. Top-k is not 'strong' by existing.", "kind": "debug"},
    {"q": "Tenant filter returns 0. What is allowed?", "a": "Abstain or broaden a safe axis (date), never tenant. Tell the user you have nothing in their docs.", "kind": "apply"},
    {"q": "How do you pick a similarity threshold T?", "a": "On a labelled set: plot empty/wrong vs T. A guessed 0.8 is folklore and will flip with the model.", "kind": "apply"},
    {"q": "Is a clarifying question a valid handle?", "a": "Yes, when the query is ambiguous. It is still not a memory fallback.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what the user sees on a miss. If they still get a fluent paragraph, the baseline is unsafe.",
  ),
  "the-effect-of-k-and-chunk-ordering": note(
   what="""**k**, **order**, and **total context size** change answers. Too-small k misses the span. Too-large k drowns it (lost-in-the-middle) and costs tokens. Order: **relevance first**, not ingest time. Adjacent near-duplicates waste the window (next note).

Total size is k × chunk tokens plus rules. If that exceeds the useful window, you did not choose k — you overflowed.

Measure: same retrieve, vary k and order, score generate. They are product knobs.""",
   why="""Interviewers will ask how you pick k. On the job, k=20 into the LLM is a common silent quality hole.""",
   how="""Sweep k in {2,4,8,16} on a generate eval. Example. k=2 misses; k=4 wins; k=16 ties or worse and costs 4×. Put the best chunk first or use a known-good packing (best first and last if you must dump many).

Do not sort by file path or created_at.""",
   fails="""1. **k=20 into the LLM** with no sweep.

2. **Ingest-time order.**

3. **Ignoring lost-in-the-middle.**

4. **k chosen for the ANN**, not the prompt.""",
   line="""k and order are generate knobs. I sweep k, I order by relevance, and I keep total tokens inside the useful window.""",
   kps=[
    "Small k misses; large k drowns and costs.",
    "Order by relevance, not ingest time.",
    "Total tokens = k × chunk + rules.",
    "Sweep k on a generate eval.",
    "Lost-in-the-middle is real for long dumps.",
    "ANN retrieve-k and prompt-k are different numbers.",
   ],
   qs=[
    {"q": "How do k and chunk order affect answers?", "a": "Too-small k misses the span; too-large k buries it and burns tokens. Ingest order wastes the window. Relevance order plus a k sweep is the baseline.", "kind": "recall"},
    {"q": "k=16 into the model, gold is chunk 9, quality dropped vs k=4. What happened?", "a": "The span was lost in the middle or drowned. Cut k or rerank so the gold is near the top. Do not first swap the embedder.", "kind": "debug"},
    {"q": "How do you pick k?", "a": "Sweep on a generate eval at fixed retrieve. Pick the smallest k that holds the score. Check token cost.", "kind": "apply"},
    {"q": "Why not sort by created_at?", "a": "Recency is a filter or a feature, not the default pack order. Relevance first unless the task is 'latest bulletin'.", "kind": "apply"},
    {"q": "Is retrieve-k the same as prompt-k?", "a": "No. Retrieve-k can be 50 for a reranker; prompt-k is the 3–5 you assemble.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask their prompt-k and why. If they send 20 unsorted chunks, push lost-in-the-middle.",
  ),
  "citations-as-mandatory-fields": note(
   what="""Ask for **quote-plus-id** so you can **check the span**. A title list is not a citation you can verify. The model must return `{id, quote}` (or start/end offsets) for each claim. Your code then confirms the quote is a substring of that chunk.

Mandatory means the schema requires the field, not that the prose sometimes has a footnote.

This is how you catch 'cited but not grounded' in M4.12 before it ships.""",
   why="""Interviewers will ask how you know a citation is real. Quote-plus-id. On the job, this is the cheapest grounding check.""",
   how="""Structured output: `citations: [{chunk_id, quote}]`. Example. Claim '14-day refund'; citation id=17 quote='Refunds are accepted within 14 days'. Your checker: quote in chunk 17. Fail → drop the claim or abstain.

Do not accept `sources: ['handbook.pdf']` as enough.""",
   fails="""1. **Titles only.**

2. **No substring check.**

3. **Optional citations** in the schema.

4. **Quotes longer than the chunk.**""",
   line="""I require quote-plus-id citations and I check the quote against the chunk. A title list is not evidence.""",
   kps=[
    "Citation = id plus a quote (or offsets).",
    "Check the quote is in that chunk.",
    "Make the field required in the schema.",
    "A PDF title is not a checkable citation.",
    "Failed checks become drop-claim or abstain.",
    "This feeds M4.12's grounding talk.",
   ],
   qs=[
    {"q": "Why ask for quote-plus-id?", "a": "So you can verify the span is actually in that chunk. A title or a bare id cannot be checked for support.", "kind": "recall"},
    {"q": "The model cites handbook.pdf and invents a clause. How did this pass?", "a": "Titles-only citations. Require a quote and a chunk id, then substring-check. The invented clause will fail.", "kind": "debug"},
    {"q": "What does the checker do on a failed quote?", "a": "Drop that claim or abstain the whole answer. Do not show a citation you could not verify.", "kind": "apply"},
    {"q": "Why structured output here?", "a": "A required citations array is harder to skip than a markdown footnote the parser might miss.", "kind": "apply"},
    {"q": "Is chunk id alone enough?", "a": "Better than a title, still weak: the model can point at a real chunk and say something it does not contain. Need the quote.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask how they validate a citation. If they do not substring-check a quote, they have footnotes, not grounding.",
  ),
  "k-diversity-and-ordering": note(
   what="""**Adjacent near-duplicates waste the window.** If chunk 2 and chunk 3 are the same paragraph with different overlap, k=4 is really k=2. **Diversity** (skip near-duplicate embeddings, or MMR-style) before assemble. **Order by relevance**, not ingest time.

This is the twin of the k note: after you pick a number, make those slots distinct and well ordered.

A reranker can also collapse dupes; do not rely on it if you never measure overlap.""",
   why="""Interviewers who have shipped RAG will nod. On the job, this is why 'we send 8' still misses.""",
   how="""After retrieve, drop chunks with cosine-to-already-kept > T, or use simple title+span dedupe. Example. Overlap-200 chunks of one section: keep the best one, maybe its parent. Then sort by score.

Log unique-doc count in the prompt. If 8 chunks are 1 doc, say so.""",
   fails="""1. **No dedupe** on overlapping chunks.

2. **Ingest order.**

3. **MMR with a random λ** and no eval.

4. **k=8 from one paragraph.**""",
   line="""I drop near-duplicate chunks before assemble and I order by relevance. Adjacent copies mean my k is a lie.""",
   kps=[
    "Near-duplicates make k smaller than it looks.",
    "Dedupe by embedding or by span before assemble.",
    "Order by relevance, not ingest time.",
    "Log unique docs in the prompt.",
    "Overlap-heavy chunking is the usual source.",
    "A guessed MMR λ is still a guess.",
   ],
   qs=[
    {"q": "Why do adjacent near-duplicates hurt RAG?", "a": "They consume prompt slots with the same span, so effective k shrinks and a different source never gets in.", "kind": "recall"},
    {"q": "Eight chunks, all overlap slices of one section, gold is in another doc. What do you do?", "a": "Dedupe or diversify before assemble, then re-retrieve or raise the unique-doc target. Raising k without dedupe will add more copies.", "kind": "debug"},
    {"q": "How do you dedupe cheaply?", "a": "Skip a hit whose embedding is too close to one you already kept, or unique by (doc_id, section). Measure so T is not folklore.", "kind": "apply"},
    {"q": "Where does order come after diversity?", "a": "Sort the surviving distinct chunks by relevance (or a planned pack). Do not leave ingest order.", "kind": "apply"},
    {"q": "What do you log?", "a": "Unique document count and maybe max pairwise similarity in the assembled set. k alone hides clones.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask how many unique docs a typical prompt has. If they do not know, duplicates are eating k.",
  ),
  "interview": note(
   what="""**Interview: ship a baseline RAG** — **ingest, chunk, embed, top-k, grounded prompt, abstain rule, then evaluate**. That sentence is the grade. Add citations as quote-plus-id if they poke.

They do not want a framework name yet.""",
   why="""It is M4.9's exam. On the job it is the MVP scope.""",
   how="""Recite the list in order. Example. 'I ingest and clean, chunk with metadata, embed one model, retrieve top-k with filters, assemble a grounded prompt, require citations, abstain on weak context, and I have a tiny labelled eval.'

If they ask what you skip: rerank, HyDE, graphs — until the eval demands them.""",
   fails="""1. **Starting at a framework.**

2. **No abstain** in the pitch.

3. **No eval.**

4. **Listing every paper.**""",
   line="""I ship ingest, chunk, embed, top-k, a grounded prompt, an abstain rule, and an eval. I add rerank or rewrite only when that eval says the baseline is not enough.""",
   kps=[
    "The baseline list is the talking point.",
    "Abstain and eval are in the MVP, not extras.",
    "Frameworks are later.",
    "Skip advanced variants until the judge misses.",
    "Citations are quote-plus-id if they poke.",
    "Order the list the way the data flows.",
   ],
   qs=[
    {"q": "What do you ship in a baseline RAG?", "a": "Ingest, chunk, embed, top-k (with filters), grounded prompt, citations, abstain, and a small eval. Not a graph and not a framework-first demo.", "kind": "recall"},
    {"q": "A candidate starts with Self-RAG. What is missing?", "a": "The baseline. You cannot know the variant helps until ingest-through-abstain is measured.", "kind": "debug"},
    {"q": "What do you skip in v1?", "a": "Rerank, query rewrite, HyDE, graphs — unless a named failure on the eval already needs one.", "kind": "apply"},
    {"q": "Why is eval in the ship list?", "a": "Without it you cannot say the baseline works or that the next trick helped. Shipping dark is not a baseline.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Ingest, chunk, embed, top-k, grounded prompt, abstain rule, then evaluate.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear the list in data-flow order. If they lead with a paper name, pull them back to the baseline.",
  ),
 }
}
