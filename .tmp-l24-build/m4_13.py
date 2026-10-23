from helper import note, LI_HOME, LC_INTRO

NOTES = {
 "m4-13": {
  "naive-advanced-adaptive-rag": note(
   what="""A map, not a ladder you must climb. **Naive RAG**: retrieve once, generate. **Advanced RAG**: better chunking, hybrid, rerank, rewrite — still mostly one shot. **Adaptive / self-correcting RAG**: the system **decides** whether to retrieve, whether to retry, and whether the evidence is good enough.

Do not treat later names as strictly better. Each step adds ops and failure modes. You move when a **named failure** on the baseline demands it.

This module is a catalogue. The last notes tell you how to pick.""",
   why="""Interviewers will ask naive vs advanced vs adaptive. Three boxes. On the job, this is the vocabulary.""",
   how="""Place your system. Example. M4.9 baseline = naive (or lightly advanced if hybrid). Add rerank/rewrite = advanced. Add a grader that re-retrieves = adaptive.

Say which failure moved you. 'We read a paper' is not a move.""",
   fails="""1. **Skipping naive** to start at adaptive.

2. **Calling any rerank** Self-RAG.

3. **Assuming more advanced is better.**

4. **No named failure** for the jump.""",
   line="""Naive is retrieve-once; advanced adds retrieve quality tricks; adaptive decides and corrects. I climb only for a named failure, not for a paper.""",
   kps=[
    "Naive = one retrieve, generate.",
    "Advanced = hybrid, rerank, rewrite, still mostly one shot.",
    "Adaptive = decide, retry, grade evidence.",
    "Later is not automatically better.",
    "Move on a named failure.",
    "This is a map, not a prestige ladder.",
   ],
   qs=[
    {"q": "Contrast naive, advanced, and adaptive RAG.", "a": "Naive retrieves once and generates. Advanced improves that retrieve (chunk, hybrid, rerank, rewrite) but is still mostly one pass. Adaptive decides whether to retrieve, which strategy, and whether to correct after a grade.", "kind": "recall"},
    {"q": "A team starts with Self-RAG and has no baseline numbers. What is wrong?", "a": "They skipped naive/advanced measurement. You cannot know adaptive helped. Build the baseline first.", "kind": "debug"},
    {"q": "Where does hybrid+rerank sit?", "a": "Advanced. It is still one retrieve path, just a better one. Adaptive would add a decide/retry loop.", "kind": "apply"},
    {"q": "What justifies leaving naive?", "a": "A measured miss: low recall, id queries, drowning k. Not a blog title.", "kind": "apply"},
    {"q": "Is adaptive always the goal?", "a": "No. It adds calls and new failure modes. Stay advanced if the judge is already happy.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear three boxes and a named-failure rule. If they skip to Self-RAG, pull them back.",
  ),
  "self-rag": note(
   what="""**Self-RAG**: the model **retrieves when needed** and **reflects** on the evidence and its own draft (special tokens or a grader: retrieve? relevant? supported?). It is adaptive on the generate side: not every question hits the index, and a bad span can trigger another look.

You can approximate it without the original tokens: a small router + a support check + an optional second retrieve.

It is not 'the model is sentient'. It is extra decisions with extra calls.""",
   why="""They will name Self-RAG. On the job, steal the decisions, not the paper's token set.""",
   how="""Decisions: need retrieve? evidence ok? answer supported? Example. 'hello' → no retrieve. Policy question → retrieve. Unsupported draft → retrieve again or abstain.

Implement as explicit steps you can log, not a mystery decode.""",
   fails="""1. **Self-RAG as a vibe** with no decisions logged.

2. **Retrieving always** and still calling it Self-RAG.

3. **No support check.**

4. **Copying tokens** you cannot run.""",
   line="""Self-RAG retrieves when needed and reflects on evidence and the draft. I implement those decisions as logged steps, not as magic tokens.""",
   kps=[
    "Retrieve-when-needed plus reflection on evidence and draft.",
    "Approximate with a router and a support check.",
    "Always-retrieve is not Self-RAG.",
    "Log each decision.",
    "Extra calls are the price.",
    "Steal the decisions, not the token scheme.",
   ],
   qs=[
    {"q": "What does Self-RAG add over naive RAG?", "a": "A decision to retrieve or not, and reflection on whether evidence is relevant and whether the draft is supported — with a possible retry or abstain.", "kind": "recall"},
    {"q": "A pipeline always retrieves and never checks support. Is it Self-RAG?", "a": "No. The name requires the decisions. You built naive or advanced RAG with extra branding.", "kind": "debug"},
    {"q": "How do you approximate it in production?", "a": "A cheap router (retrieve?), a relevance/support grader, and a retry or abstain. Log each bit. Skip the original special tokens if you do not have that model.", "kind": "apply"},
    {"q": "When is the retrieve-when-needed part enough alone?", "a": "When many questions are chitchat or closed-book. You still need a support check for the ones that do retrieve.", "kind": "apply"},
    {"q": "What do you tell a PM who wants Self-RAG on the slide?", "a": "Name the decisions and the extra calls. The paper name is not a feature.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask which decisions they log. If they only say the paper name, they do not have Self-RAG.",
  ),
  "crag-corrective-rag": note(
   what="""**CRAG (Corrective RAG)** **evaluates retrieved evidence** and **triggers corrective retrieval** (or web, or another query) when the first set is weak. The new idea is a **grader on the first retrieve**, not a fancier first retrieve.

If the grader says the chunks are irrelevant, you do not generate from them. You correct or abstain.

It is a named fix for **bad first retrieval**, which is why the later 'pick from the failure' note points here.""",
   why="""Interviewers will contrast CRAG and Self-RAG. On the job, this is a retry loop with a gate.""",
   how="""`chunks = retrieve(q)`; `ok = grade(q, chunks)`; if not ok: `chunks = retrieve(rewrite(q))` or abstain. Example. First retrieve is off-topic; grader says no; second query is decontextualised; then generate or abstain.

Cap retries at 1. Infinite correct is a loop incident.""",
   fails="""1. **No cap** on corrective hops.

2. **Generating from chunks the grader rejected.**

3. **No grader**, just always retrieve twice.

4. **Web correct** without a policy.""",
   line="""CRAG grades the first retrieve and corrects or abstains when it is weak. I cap retries and I do not generate from rejected chunks.""",
   kps=[
    "CRAG = grade first retrieve, then correct or abstain.",
    "It targets bad first retrieval.",
    "Do not generate from rejected chunks.",
    "Cap corrective hops (usually 1).",
    "Always-twice is not CRAG.",
    "Web correction needs a product policy.",
   ],
   qs=[
    {"q": "What does Corrective RAG do?", "a": "It evaluates the first retrieved set and, if weak, triggers another retrieve (or a fallback) instead of generating from bad evidence.", "kind": "recall"},
    {"q": "The grader says irrelevant but you still send those chunks. What did you build?", "a": "A log line, not CRAG. Corrective means you do not generate from the rejected set.", "kind": "debug"},
    {"q": "How does CRAG differ from Self-RAG in one line?", "a": "CRAG focuses on correcting a weak retrieve. Self-RAG also decides whether to retrieve and whether the draft is supported.", "kind": "apply"},
    {"q": "Why cap retries?", "a": "A loop of rewrite+retrieve will blow p95 and $ and can oscillate. One correction then abstain is enough for v1.", "kind": "apply"},
    {"q": "Is always retrieving twice CRAG?", "a": "No. The grade is the point. Always-twice is just 2× latency.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear a grader and a cap. If they always retrieve twice, it is not CRAG. Ask what happens to rejected chunks.",
  ),
  "adaptive-rag": note(
   what="""**Adaptive RAG** **dynamically chooses** whether retrieval is required and **which strategy** (BM25, dense, hybrid, multi-query, none). A router sits in front: chitchat → no retrieve; id → sparse; messy → hybrid+rewrite.

It is the strategy layer, not a new index. You can implement it with rules before you train a classifier.

Adaptive without logs is just a pile of ifs you cannot tune.""",
   why="""They will say adaptive. On the job, this is the router you already wanted in M4.11.""",
   how="""Start with rules: id-like → BM25; short greeting → no retrieve; else hybrid. Example. Graduate to a small classifier when the rule file is a novel.

Log the route name on every request. Eval per route.""",
   fails="""1. **One path** and calling it adaptive.

2. **No route log.**

3. **A 20-branch router** with no eval.

4. **Retrieving always** 'just in case'.""",
   line="""Adaptive RAG picks whether to retrieve and which strategy. I start with rules, I log the route, and I do not retrieve just in case.""",
   kps=[
    "Adaptive = whether to retrieve + which strategy.",
    "Rules first, classifier later.",
    "Log the route name.",
    "Eval per route, not one global score.",
    "One path is not adaptive.",
    "Just-in-case retrieve is the opposite.",
   ],
   qs=[
    {"q": "What does Adaptive RAG choose?", "a": "Whether retrieval is needed and which retrieval strategy to run (sparse, dense, hybrid, multi-query, none).", "kind": "recall"},
    {"q": "Every request hits hybrid+HyDE+rerank. Adaptive?", "a": "No. That is a single expensive path. Adaptive would skip most of that on easy lookups.", "kind": "debug"},
    {"q": "How do you start without a trained router?", "a": "Rules on the query (id-like, greeting, length, '? and') mapped to strategies. Log and replace rules that fire wrongly.", "kind": "apply"},
    {"q": "What do you eval?", "a": "Quality, latency, and $ per route. A global score hides a broken id path.", "kind": "apply"},
    {"q": "Why log the route?", "a": "So you can see that 80% of QPS did not need HyDE, and so an incident has a name.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask how they choose a strategy. If there is one path, it is not adaptive. Ask for the route log.",
  ),
  "iterative-rag": note(
   what="""**Iterative RAG** repeats **retrieve and generate until enough evidence** (or a cap). The draft or missing slots become the next query. It is for **gaps**, not for style.

Without a stop condition you have a loop. Stop: enough slots filled, grader says supported, or N=2.

This overlaps CRAG (correct) and multi-hop (chain). Iterative is the generic loop.""",
   why="""They will say iterative. On the job, this is a loop with a budget.""",
   how="""`for i in 1..N: retrieve; grade; if ok: generate; break; else: new_query`. Example. First answer missing the date; second query asks for the date span; then final generate.

Do not iterate on greetings.""",
   fails="""1. **No N cap.**

2. **Iterating when the first retrieve was fine.**

3. **Using the full draft** as the next query (noise).

4. **No stop on supported.**""",
   line="""Iterative RAG loops retrieve and generate until evidence is enough or the cap hits. I always have N and a supported-stop.""",
   kps=[
    "Loop retrieve/generate until enough or N.",
    "Stop on supported, filled slots, or cap.",
    "For gaps, not style.",
    "Do not iterate easy lookups.",
    "Next query is a slot, not the whole draft.",
    "Overlaps CRAG and multi-hop; this is the generic loop.",
   ],
   qs=[
    {"q": "What is iterative RAG?", "a": "Retrieve and generate repeat until evidence is sufficient or a cap is hit. The next query is driven by missing slots or a failed grade.", "kind": "recall"},
    {"q": "A loop ran 8 times on 'hello'. What is missing?", "a": "A router and a cap. Greetings should not enter the loop. N should be 1–2.", "kind": "debug"},
    {"q": "What should the next query be?", "a": "The missing slot or a rewrite of the weak part — not the entire previous essay.", "kind": "apply"},
    {"q": "How does it relate to CRAG?", "a": "CRAG is a named one-correction pattern. Iterative is the generic loop that can include that correction.", "kind": "apply"},
    {"q": "What are the stop conditions?", "a": "Grader says supported, required slots filled, or N reached (then abstain or answer with what you have, per policy).", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for N and the stop. If they iterate without a cap, fail. Ask what the next query is.",
  ),
  "multi-hop-rag": note(
   what="""**Multi-hop RAG** needs **several retrieval steps** or **combining evidence from multiple sources** because the answer is a **chain** (A leads to B). One query cannot hold the chain. Example: who owns the service that pages on E-204? First hop finds E-204's service; second finds the owner.

It is not 'we retrieve 50'. It is **sequential dependence**. Parallel multi-query is not multi-hop unless hop 2 uses hop 1.

This is the failure mode the later pick-note assigns to multi-hop.""",
   why="""Interviewers will give a chain question. On the job, this is why one-shot RAG looks dumb on org charts.""",
   how="""Plan hops or extract the next entity. Example. Hop 1: E-204 → service checkout-api. Hop 2: checkout-api owner → team X. Then generate from both.

Cap hops. Persist intermediate entities in the log.""",
   fails="""1. **Calling top-k=50** multi-hop.

2. **No intermediate entity** stored.

3. **Unbounded hops.**

4. **Parallel queries** labelled multi-hop.""",
   line="""Multi-hop is a chain: hop 2 needs hop 1's entity. I do not call a bigger k multi-hop, and I cap the hops.""",
   kps=[
    "Multi-hop = sequential, dependent retrieves.",
    "Bigger k is not multi-hop.",
    "Parallel multi-query is not multi-hop.",
    "Store intermediate entities.",
    "Cap hops; then abstain.",
    "For chained facts (the pick-note).",
   ],
   qs=[
    {"q": "What makes retrieval multi-hop?", "a": "A later retrieve depends on an entity or fact from an earlier one. Combining two independent lists is not enough.", "kind": "recall"},
    {"q": "You raised k to 50 so both hops sit in the window. Is that multi-hop?", "a": "No. That is hoping a chain fits. Real multi-hop queries the second entity after the first retrieve.", "kind": "debug"},
    {"q": "Give a hop plan for 'who owns the service that throws E-204'.", "a": "Hop 1: E-204 → service name. Hop 2: that service → owner team. Then generate from both spans.", "kind": "apply"},
    {"q": "What do you log between hops?", "a": "The extracted entity and the chunk it came from. Otherwise hop 2 is un-auditable.", "kind": "apply"},
    {"q": "How is this different from RAG-Fusion?", "a": "Fusion runs independent queries in parallel and merges ranks. Multi-hop is sequential and dependent.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for a chain example. If they say 'we retrieve more', it is not multi-hop. Hear hop 2 depending on hop 1.",
  ),
  "graph-rag": note(
   what="""**Graph RAG** stores **entities and relations** (and often community summaries) and retrieves along the **graph**, not only by vector similarity. Useful when the question is about **connections** or a **global** theme spread across many docs.

It is another index you must **build and maintain**. It is not a free upgrade to naive RAG.

You still may use vectors to find a start node. The graph is the structure on top.""",
   why="""They will say Graph RAG as if it were default 2026. On the job, the next notes are the cold water.""",
   how="""Extract entities/edges at ingest; query by expanding neighbours or by community summaries for global questions. Example. 'How do billing and checkout fail together?' needs edges, not the nearest FAQ.

Do not start here (ops-cost note).""",
   fails="""1. **Graph as v1.**

2. **Stale edges** after a doc update.

3. **No eval** vs vector baseline.

4. **Calling a knowledge graph** Graph RAG with no retrieve path.""",
   line="""Graph RAG retrieves on entities and relations, not only cosine. I use it for connected or global questions, and I do not start there.""",
   kps=[
    "Graph = entities, relations, maybe community summaries.",
    "For connections and global questions.",
    "Another index to maintain.",
    "Vectors may still find the start node.",
    "Not v1.",
    "A graph without a retrieve path is not Graph RAG.",
   ],
   qs=[
    {"q": "What does Graph RAG retrieve over?", "a": "A graph of entities and relationships (and often summaries of communities), not only nearest vectors. Vector search may still seed the start nodes.", "kind": "recall"},
    {"q": "Docs updated; answers still mention a retired service. What drifted?", "a": "The graph. Edges and community summaries need the same incremental ingest as chunks. A stale graph is a stale index.", "kind": "debug"},
    {"q": "When is a vector store enough instead?", "a": "Local factoid questions a chunk can answer. Graphs earn their keep on relations and global themes.", "kind": "apply"},
    {"q": "What must ingest do extra?", "a": "Entity/relation extraction (and maybe clustering/summaries), versioned with the chunks so deletes tombstone edges too.", "kind": "apply"},
    {"q": "Is a knowledge graph automatically Graph RAG?", "a": "No. You still need a retrieve-and-generate path that uses the graph. A triple store alone is not RAG.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear entities plus a retrieve path. If they start v1 here, push to the ops-cost note. Ask about stale edges.",
  ),
  "when-graph-rag-is-useful": note(
   what="""Graph RAG earns its keep on **highly connected knowledge**, **entity relationships**, **global questions**, and **facts spread across many documents**. Org charts, dependency maps, 'themes this quarter', 'who is affected if X dies'.

It does **not** earn its keep on 'what is the refund window' — a chunk will do. Use the graph when **cosine cannot see the path**.

If you cannot name the relation, you do not need the graph.""",
   why="""Interviewers will ask when. Four jobs. On the job, this is the go/no-go.""",
   how="""Name the question type. Example. 'Summarise how on-call owns checkout' → relations. 'What does error E-204 mean' → a chunk. 'What themes appear across 400 postmortems' → community summaries.

Prototype the question on naive RAG. If hops fail, consider the graph.""",
   fails="""1. **Graph for factoids.**

2. **No named relation.**

3. **Global-summary questions** answered with top-5 chunks (lossy) without considering a graph or map-reduce.

4. **Graph because a vendor demoed it.**""",
   line="""I use Graph RAG when the question is about connections, entities, or a global theme spread across docs. I do not use it for a fact a chunk already holds.""",
   kps=[
    "Useful: connections, relations, global, spread-out facts.",
    "Not useful: local factoids a chunk answers.",
    "If you cannot name the relation, skip the graph.",
    "Prototype the question on naive RAG first.",
    "Vendor demos are not a question type.",
    "Cosine cannot see a multi-edge path.",
   ],
   qs=[
    {"q": "When is Graph RAG useful?", "a": "Highly connected knowledge, entity relationships, global questions, and information spread across many documents — cases where cosine to a chunk misses the path.", "kind": "recall"},
    {"q": "A team builds a graph for a 20-page FAQ of refund rules. What do you say?", "a": "A chunk answers those factoids. The graph is ops without a question type. Skip it.", "kind": "debug"},
    {"q": "Which question wants a graph: E-204 meaning, or who is affected if checkout-api dies?", "a": "The blast-radius question. E-204 is a local fact. Blast radius is relations.", "kind": "apply"},
    {"q": "What do you try before the graph?", "a": "Naive or multi-hop RAG on the same questions. If a short hop plan works, you may not need a maintained graph.", "kind": "apply"},
    {"q": "What must you be able to name?", "a": "The relation (owns, depends-on, pages) or the global theme. No name, no graph.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear a relation-shaped question. If they graph a FAQ, push. Ask what they tried first.",
  ),
  "choosing-by-failure-mode-not-novelty": note(
   what="""Compare advanced approaches on **quality, complexity, latency, cost, and the failure mode they address**. Do not assume **more advanced is better**. Novelty is not a metric.

A table beats a paper title: what fails today, what this variant claims to fix, what it costs, what you will measure.

This is the adult version of the map at the start of the module.""",
   why="""Interviewers will offer a shiny variant. On the job, this is how you say no.""",
   how="""Write the row. Example. Failure: id misses. Candidate: hybrid. Cost: one extra index. Measure: recall on id slice. Failure: chain questions. Candidate: multi-hop. Not: Graph RAG because Twitter.

Refuse a variant with no row.""",
   fails="""1. **Novelty as the reason.**

2. **No cost column.**

3. **No failure named.**

4. **All variants on** as a flex.""",
   line="""I pick a RAG variant from the failure mode, then look at quality, complexity, latency, and cost. Novelty is not a column.""",
   kps=[
    "Columns: quality, complexity, latency, cost, failure.",
    "Novelty is not a column.",
    "Name today's failure first.",
    "More advanced is not better by default.",
    "Refuse a variant with no row.",
    "Measure the claim after you ship the variant.",
   ],
   qs=[
    {"q": "How do you choose among RAG variants?", "a": "Name the failure mode first, then compare quality, complexity, latency, and cost. Do not pick the newest name.", "kind": "recall"},
    {"q": "A design doc says 'we will do Graph RAG to stay modern'. What is missing?", "a": "A failure mode, a cost column, and a measure. Modern is not a reason.", "kind": "debug"},
    {"q": "What belongs in the table?", "a": "Today's miss, the variant's claim, extra calls/ops, and the metric that will prove the claim.", "kind": "apply"},
    {"q": "When do you stay naive?", "a": "When the judge is already happy and the extra complexity would not buy a named fix.", "kind": "apply"},
    {"q": "What phrase do you refuse?", "a": "'More advanced RAG is better.' Ask for the failure.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask them to fill a row. If the reason is novelty, fail. Hear cost next to quality.",
  ),
  "pick-the-variant-from-the-failure": note(
   what="""Two crisp maps. **Multi-hop for chained facts. Corrective RAG for bad first retrieval.** Add: hybrid for ids+paraphrase; rewrite for poor queries; rerank for disorder in a good shortlist; graph for relations/global; adaptive router when the mix is wide.

Memorise the two on the checklist; the rest you can derive.

Picking from the failure is how you avoid the catalogue becoming a shopping list.""",
   why="""This is a named talking point. On the job, it is the decision tree on the wiki.""",
   how="""One sentence per miss. Example. Gold never in top-50 → retrieve/hybrid/chunk, not Self-RAG. Gold in 50 but not in 4 → rerank. First retrieve off-topic → CRAG. Need entity from hop 1 → multi-hop.

Write this as a runbook, not a slide of logos.""",
   fails="""1. **One favourite variant** for every miss.

2. **Self-RAG for a chunking bug.**

3. **Graph for an id miss.**

4. **No runbook.**""",
   line="""I pick the variant from the failure: multi-hop for chained facts, corrective RAG for a bad first retrieve. I do not have a favourite paper.""",
   kps=[
    "Multi-hop → chained facts.",
    "CRAG → bad first retrieval.",
    "Hybrid → ids plus paraphrase.",
    "Rewrite → poor queries; rerank → disorder in the shortlist.",
    "Graph → relations/global.",
    "One favourite variant is a smell.",
   ],
   qs=[
    {"q": "Which variant for chained facts, and which for a bad first retrieve?", "a": "Multi-hop for chained facts. Corrective RAG for a bad first retrieval. Those two maps are the checklist line.", "kind": "recall"},
    {"q": "Gold is never in the shortlist and the team adds Self-RAG reflection. What should they add instead?", "a": "Retrieve-side work (chunk, hybrid, query). Reflection cannot promote a missing chunk. If they retry retrieve after a grade, that is CRAG, not a vibe.", "kind": "debug"},
    {"q": "Disorder in top-50, gold is in there. Which variant?", "a": "Rerank (or better order). Not a graph.", "kind": "apply"},
    {"q": "Pronoun-heavy chat misses. Which variant?", "a": "Query rewrite (decontextualise), not multi-hop and not a graph.", "kind": "apply"},
    {"q": "What is the smell?", "a": "One favourite variant applied to every miss.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Quiz the two maps. Then a third miss. If they reach for the same paper each time, push.",
  ),
  "graph-rag-ops-cost": note(
   what="""**Entity graphs need maintenance; do not start there.** You pay extraction (LLM or NER) on every ingest, versioning of edges, stale-node cleanup, community re-summaries, and a second query path. That is real ops, not a library import.

Start with naive/advanced RAG. Graduate to a graph when a **named relation question** fails and a hop plan is not enough.

A weekend graph on a demo corpus is not a production graph.""",
   why="""This is the last checklist item and the cold water. On the job, it is the staffing conversation.""",
   how="""List the jobs: extract, resolve entities, apply deletes, rebuild summaries, eval vs chunk baseline, page someone when extraction drifts. Example. 10k docs × extract on every update is a bill and a queue.

If you cannot staff that, you cannot staff Graph RAG.""",
   fails="""1. **Starting at the graph.**

2. **No delete path** for edges.

3. **Never rebuilding** summaries.

4. **Demo corpus** as proof of ops.""",
   line="""Graphs need extraction, versioning, and deletes. I do not start there. I graduate only when a relation question beats a hop plan and we can staff the ingest.""",
   kps=[
    "Graphs add extract, resolve, delete, re-summarise.",
    "Do not start there.",
    "A hop plan is cheaper to try first.",
    "Deletes must tombstone edges.",
    "Demo ops are not prod ops.",
    "If you cannot staff ingest, you cannot staff the graph.",
   ],
   qs=[
    {"q": "Why is Graph RAG expensive to operate?", "a": "Every ingest must extract and resolve entities, apply deletes to edges, and often rebuild summaries. That is a second pipeline besides chunks.", "kind": "recall"},
    {"q": "A team ships Graph RAG in week one of a new corpus. What do you change?", "a": "Start with chunk RAG. Try multi-hop if needed. Add a graph when a named relation question still fails and someone owns ingest.", "kind": "debug"},
    {"q": "What happens on a doc delete?", "a": "Tombstone chunks and their edges (and maybe refresh community summaries). A leftover edge is a stale fact.", "kind": "apply"},
    {"q": "What must you staff?", "a": "The extract/resolve path, drift eval, and on-call for the graph query path — not only the chat API.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Entity graphs need maintenance; do not start there.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask who owns extract and deletes. If nobody, they cannot start at a graph. Hear the hop-plan alternative.",
  ),
 }
}
