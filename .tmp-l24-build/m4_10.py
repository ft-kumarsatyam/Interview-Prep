from helper import note, LI_HOME, HF_EMBED

NOTES = {
 "m4-10": {
  "retrieve-many-rerank-send-the-best": note(
   what="""The **two-stage pattern**: **retrieve many candidates** cheaply (BM25, ANN, hybrid), **rerank** them with a stronger model, **send the best** few chunks to the LLM. Stage one is recall-oriented and fast. Stage two is precision-oriented and slower, so it only sees a shortlist.

This is not 'search twice for fun'. It is a cost split: O(corpus) approximate, then O(shortlist) expensive.

The numbers you will say in interviews: retrieve 50, rerank to 8, send 4.""",
   why="""Interviewers will ask where a reranker sits. Between retrieve and assemble. On the job, this is M4.10's spine.""",
   how="""`cands = retrieve(q, 50)`; `best = rerank(q, cands)[:8]`; `assemble(best[:4])`. Example. Hybrid RRF returns 50; a cross-encoder scores each (q, chunk); you keep 4.

Log stage-one ids and stage-two order so you can see the lift.""",
   fails="""1. **Reranking the corpus.**

2. **Sending the 50** to the LLM.

3. **No log** of the reorder.

4. **One stage** that tries to be both cheap and precise.""",
   line="""I retrieve many, rerank the shortlist, and send the best few to the LLM. The expensive model never sees the corpus.""",
   kps=[
    "Two stages: cheap recall, then expensive precision.",
    "Rerank a shortlist, never the corpus.",
    "Send the post-rerank few to the LLM.",
    "Typical shape: 50 → 8 → 4.",
    "Log both ranks to measure lift.",
    "One stage cannot be both cheap and precise at scale.",
   ],
   qs=[
    {"q": "What is the two-stage retrieve-rerank pattern?", "a": "Retrieve a large candidate set cheaply, rerank that shortlist with a stronger model, send the top few to the LLM. The reranker never scans the corpus.", "kind": "recall"},
    {"q": "A service scores every chunk with a cross-encoder. What is wrong?", "a": "That is O(corpus) of the expensive model. Retrieve first (50), rerank the shortlist. The current design will miss the latency SLO.", "kind": "debug"},
    {"q": "Where do you log?", "a": "Stage-one ids and stage-two order (and scores). Without both you cannot prove the reranker moved the gold up.", "kind": "apply"},
    {"q": "What numbers do you say in an interview?", "a": "Retrieve about 50, rerank about 8, send about 4 — then measure extra latency. The exact counts come from an eval.", "kind": "apply"},
    {"q": "Why two stages instead of a better first-stage?", "a": "First-stage must stay cheap at corpus scale. Precision is affordable only on tens of docs, not millions.", "kind": "recall"},
   ],
   links=[LI_HOME, HF_EMBED],
   review="Ask where the reranker sits and what it sees. If it sees the corpus, fail. Hear 50-8-4 as a sketch.",
  ),
  "cross-encoder-reranking-models": note(
   what="""A **bi-encoder** embeds query and doc **separately** (your first-stage embedder). A **cross-encoder** reads **(query, document)** together and outputs a relevance score. That joint read is why it is better at precision and why it cannot pre-index the corpus.

Dedicated **rerank APIs** (Cohere, Voyage, some open models) are cross-encoders or close cousins you call on a shortlist. You do not need to train one to use one.

Cross-encoders are **not** a second vector index.""",
   why="""Interviewers will ask bi vs cross. This is the contrast. On the job, this is why rerank is a runtime call.""",
   how="""For each candidate: score = model(q, chunk). Sort. Example. 50 candidates × one forward pass each; you batch. The gold chunk that was #18 in ANN becomes #2.

Keep the first-stage embedder. The cross-encoder does not replace it.""",
   fails="""1. **Trying to index** cross-encoder scores ahead of time.

2. **Replacing ANN** with a cross-encoder.

3. **One-at-a-time** HTTP with no batch.

4. **Using a chat model** as a reranker without measuring.""",
   line="""A cross-encoder scores the query and the chunk together. I use it to reorder a shortlist. I do not pretend it is an index.""",
   kps=[
    "Bi-encoder: separate vectors; cross-encoder: joint (q, d).",
    "Joint read is why precision is better and why it is slow.",
    "Rerank APIs are this family.",
    "It does not replace the first-stage index.",
    "Batch the shortlist.",
    "A chat model is a costly, optional substitute — measure.",
   ],
   qs=[
    {"q": "How does a cross-encoder differ from a bi-encoder?", "a": "A bi-encoder embeds q and d separately so you can index d. A cross-encoder reads (q, d) together for a relevance score and cannot pre-index the corpus.", "kind": "recall"},
    {"q": "A teammate wants to store cross-encoder scores at ingest. Why will that fail?", "a": "The score depends on the query, which does not exist at ingest. Only bi-encoder (or sparse) vectors can be stored.", "kind": "debug"},
    {"q": "Why keep the ANN if you have a cross-encoder?", "a": "The cross-encoder cannot scan millions of pairs in a user turn. ANN/BM25 propose; the cross-encoder disposes.", "kind": "apply"},
    {"q": "Can you use a chat model to rerank?", "a": "Yes, as a judge on a tiny list, at higher cost and latency. Measure against a real reranker before you standardise on it.", "kind": "apply"},
    {"q": "What do you batch?", "a": "The (q, chunk) pairs of the shortlist. Fifty serial calls will blow the budget.", "kind": "recall"},
   ],
   links=[HF_EMBED, LI_HOME],
   review="Hear joint vs separate. If they try to index a cross-encoder, correct them. Ask why ANN stays.",
  ),
  "relevance-gained-latency-added": note(
   what="""Reranking **can raise relevance** (gold moves up, nDCG up) and **always adds latency and cost** (another model, another hop). The lift is an eval number; the cost is p95 and dollars. You keep the reranker only when the lift pays the bill.

Latency is not 'a few ms' if the API is remote and you send 50 pairs. Measure on the real path.

Relevance gained on an internal FAQ may be tiny; on messy web chunks it may be large.""",
   why="""Interviewers want the trade, not a slogan. On the job, this is the go/no-go for M4.10.""",
   how="""A/B or offline: with vs without, same first-stage. Report ΔnDCG, Δanswer-score, Δp95, Δ$. Example. +0.08 nDCG, +120ms, +$0.002/query. You keep it if the judge cares and the SLO allows 120ms.

If Δquality ≈ 0, delete it (next notes).""",
   fails="""1. **Always-on rerank** with no Δ.

2. **Ignoring remote p95.**

3. **Reporting only quality.**

4. **Reporting only latency.**""",
   line="""A reranker can buy relevance and always spends latency and money. I keep it only when the measured lift pays the SLO.""",
   kps=[
    "Lift is an eval; cost is p95 and dollars.",
    "Remote rerank p95 is often the surprise.",
    "Compare with vs without the same first-stage.",
    "Keep only if the lift pays.",
    "Messy corpora gain more than clean FAQs.",
    "Do not report quality without cost, or the reverse.",
   ],
   qs=[
    {"q": "What does reranking cost you besides money?", "a": "Latency — another model hop, often remote, over the whole shortlist. Quality lift is not free.", "kind": "recall"},
    {"q": "Offline nDCG rose 0.01 and p95 rose 200ms. What do you do?", "a": "Likely drop the reranker (or shrink the shortlist) unless a slice of queries has a large lift. 200ms for 0.01 is a bad trade on most SLOs.", "kind": "debug"},
    {"q": "How do you measure the lift?", "a": "Same first-stage, with vs without rerank, on a labelled set: nDCG/recall at the k you send, plus answer quality, plus p95 and unit cost.", "kind": "apply"},
    {"q": "Why might a clean FAQ see little lift?", "a": "The first-stage already ranks a small, well-chunked set. The cross-encoder has little disorder to fix.", "kind": "apply"},
    {"q": "What number do you put next to ΔnDCG?", "a": "Δp95 and Δ$ per query. A relevance slide without them is incomplete.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for both sides of the trade. If they only sell quality, ask for p95. If they only fear latency, ask for the Δ.",
  ),
  "when-reranking-adds-little": note(
   what="""Rerank **adds little** when the **first stage already ranks well**: small corpus, sharp filters, hybrid that already put the gold in the top 4, or queries that are exact ids. Then you are paying a model to shuffle a correct list.

Compare **with and without** on your eval. Little benefit is a valid, common outcome. Skipping is not laziness; it is the next note's rule.

Also little: when the miss is not in the shortlist at all — the reranker cannot promote a chunk it never saw.""",
   why="""Interviewers will ask when to skip. On the job, this is how you delete a hop.""",
   how="""Plot first-stage recall@4 vs after-rerank recall@4. Example. 0.93 → 0.94: skip. 0.70 → 0.88: keep. If recall@50 is 0.70, fix retrieve; rerank cannot invent the gold.

Slice by query type. Ids may not need rerank; long messy questions might.""",
   fails="""1. **Rerank on id lookups.**

2. **Rerank when gold is outside the 50.**

3. **No with/without.**

4. **Keeping it for a blog.**""",
   line="""If the first stage already ranks well, or the gold never made the shortlist, rerank adds little. I compare with and without and I skip when the Δ is noise.""",
   kps=[
    "Little lift when first-stage top-k is already good.",
    "Zero lift when the gold is outside the shortlist.",
    "Always compare with vs without.",
    "Id queries often skip rerank.",
    "Fix retrieve first if recall@50 is low.",
    "Skipping is a measured choice.",
   ],
   qs=[
    {"q": "When does reranking add little?", "a": "When the first stage already puts the gold in the sent-k, or when the gold never entered the shortlist. Also on exact-id queries. Measure with vs without.", "kind": "recall"},
    {"q": "recall@50 is 0.6; the reranker is 'not helping'. What is the real bug?", "a": "Retrieve. The gold is often not in the 50. Rerank cannot promote a missing chunk. Fix hybrid/chunking/query.", "kind": "debug"},
    {"q": "How do you decide to skip?", "a": "If Δquality is within noise and you save p95/$, skip. Slice by query type so you can rerank only the messy slice.", "kind": "apply"},
    {"q": "Why might SKU search skip a reranker?", "a": "BM25 already put the exact id first. A cross-encoder is shuffling a correct list.", "kind": "apply"},
    {"q": "Is 'we always rerank' a design?", "a": "No. It is a default that needs an eval. Always-on is how you buy latency for free.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see with vs without. If they always rerank, push the id-query slice. Ask about recall@50.",
  ),
  "cross-encoder-cost-model": note(
   what="""**Rerank a shortlist, never the whole corpus.** Cost is roughly `shortlist_size × cost_per_pair` (plus batching and network). At 10M chunks a cross-encoder is a non-starter. At 50 pairs it is a line item you can budget.

This is the same two-stage idea as money. People still try to 'just rerank everything' once.

If the API bills per search, treat shortlist length as a product knob next to k.""",
   why="""Interviewers will ask why not score all docs. Cost model. On the job, this is the budget slide.""",
   how="""Write the multiply. Example. $0.001 / 100 pairs; 50 pairs = $0.0005/query; at 1M queries/day that is real money. 10M pairs/query is a joke.

Cap shortlist in config. Alert if a path sends 500.""",
   fails="""1. **Corpus-sized rerank.**

2. **No cap** on shortlist length.

3. **Ignoring batch vs serial.**

4. **No $ next to the quality slide.**""",
   line="""A cross-encoder costs per pair. I rerank a shortlist I can afford, never the corpus, and I cap that length in config.""",
   kps=[
    "Cost ≈ shortlist × per-pair (plus network).",
    "Never rerank the corpus.",
    "Shortlist length is a billed knob.",
    "Cap it in config and alert on overflow.",
    "Batching changes latency more than the multiply.",
    "Put $ next to the quality number.",
   ],
   qs=[
    {"q": "What is the cost model of a cross-encoder reranker?", "a": "You pay per (query, document) pair on the shortlist, plus latency. That is why the shortlist stays tens of docs, not the corpus.", "kind": "recall"},
    {"q": "Someone set retrieve-k=5000 'so the reranker can see more'. What do you do?", "a": "Cap it. You just multiplied cost and p95. If recall@50 is low, fix retrieve; do not grow the expensive stage.", "kind": "debug"},
    {"q": "How do you budget it?", "a": "pairs × unit price × QPS, plus a p95 from a load test. Put the number next to Δquality.", "kind": "apply"},
    {"q": "Does batching change the cost model?", "a": "It usually changes latency and sometimes unit price, not the fact that cost scales with pairs. Still cap the shortlist.", "kind": "apply"},
    {"q": "Why alert on shortlist length?", "a": "A silent raise from 50 to 500 is a bill and a latency incident. The cap should be visible.", "kind": "recall"},
   ],
   links=[HF_EMBED, LI_HOME],
   review="Ask them to write cost ≈ n × pair. If they rerank 'everything', stop. Ask for the cap.",
  ),
  "when-the-first-stage-already-ranks-well": note(
   what="""**Skip the reranker until an eval proves the lift.** If stage one already puts the right chunks in the sent-k, the second model is dead weight. This is the operational rule that follows 'when reranking adds little'.

Proving lift means a labelled set, not a demo query. Until then the baseline has no reranker.

You can still keep the hook in the code behind a flag.""",
   why="""Interviewers like 'what do you skip in v1'. This. On the job, flags beat always-on.""",
   how="""Ship without it. Run the with/without eval on real queries. Example. Lift < noise: flag stays off. Lift on a slice: route that slice only.

Re-run after you change chunking or hybrid — a better first stage can retire the reranker.""",
   fails="""1. **Rerank in v1** with no number.

2. **Never re-evaluating** after retrieve improves.

3. **No flag.**

4. **Demo-driven** keep.""",
   line="""I skip the reranker until an eval proves lift. A better first stage can retire it. I keep it behind a flag.""",
   kps=[
    "No reranker in v1 without a number.",
    "Eval, not a demo query, proves lift.",
    "A better first stage can retire the hop.",
    "Flag it; route slices if needed.",
    "Re-run the eval after retrieve changes.",
    "Skip is the default, keep is the exception.",
   ],
   qs=[
    {"q": "When do you skip the reranker?", "a": "Until a labelled eval shows lift that pays for the latency. If the first stage already ranks well, skip is the default.", "kind": "recall"},
    {"q": "You improved hybrid and the reranker lift vanished. What now?", "a": "Turn it off. The first stage ate its job. Keeping it is a habit, not a design.", "kind": "debug"},
    {"q": "How do you ship the hook without paying?", "a": "A flag, default off, and an eval job that can turn it on per slice. Do not leave a paid call in the default path.", "kind": "apply"},
    {"q": "Why not trust a single demo query?", "a": "One query can look magical. The labelled mix includes ids and easy FAQs where lift is zero.", "kind": "apply"},
    {"q": "What is the v1 default?", "a": "No reranker. Retrieve, assemble, generate, abstain, eval. Add the hop when the judge still misses.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask if v1 has a reranker. If yes without a Δ, push. Ask whether they re-eval after hybrid improves.",
  ),
  "interview": note(
   what="""**Interview: place a reranker** — **retrieve 50, rerank 8, send 4 — and measure extra latency.** That is the line. Add: never the corpus; skip if first-stage is enough.

They want the numbers and the measurement, not a vendor.""",
   why="""It is M4.10's exam. On the job it is also the diagram on the wiki.""",
   how="""Say the three numbers, then 'I will sweep them'. Example. 'Stage one hybrid 50, cross-encoder to 8, prompt 4. I report Δquality and Δp95. If first-stage recall@4 is already high, I skip.'

If they poke cost: shortlist × per-pair.""",
   fails="""1. **No numbers.**

2. **Rerank the corpus.**

3. **No latency in the pitch.**

4. **Vendor-first.**""",
   line="""I retrieve about 50, rerank about 8, send about 4, and I measure the extra latency. I skip the hop if the first stage already ranks well.""",
   kps=[
    "50 → 8 → 4 is the sketch, then sweep.",
    "Measure extra latency and quality together.",
    "Never rerank the corpus.",
    "Skip when first-stage is enough.",
    "Cost is shortlist × pair.",
    "No vendor in the opening line.",
   ],
   qs=[
    {"q": "How do you place a reranker in an interview?", "a": "Retrieve about 50, rerank about 8, send about 4, and measure extra latency and quality. Skip if the first stage already ranks well. Never rerank the corpus.", "kind": "recall"},
    {"q": "A candidate says 'we use Cohere rerank on everything'. What is missing?", "a": "Numbers, a shortlist cap, a with/without Δ, and a skip rule. The vendor is not a placement.", "kind": "debug"},
    {"q": "What do you sweep?", "a": "Retrieve-k, rerank-k, send-k, and the on/off flag — against quality, p95, and $.", "kind": "apply"},
    {"q": "What phrase must appear next to the quality lift?", "a": "Extra latency (and unit cost). Placement without p95 is incomplete.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Retrieve 50, rerank 8, send 4 — and measure extra latency.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear 50-8-4 and measure. If they name only a vendor, fail the talking point.",
  ),
 }
}
