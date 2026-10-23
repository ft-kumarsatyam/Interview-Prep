from helper import note, QDRANT, HF_EMBED

NOTES = {
 "m4-6": {
  "lexical-retrieval-bm25": note(
   what="""**Lexical retrieval** matches **terms**, not meaning. **BM25** is the ranking function most keyword search uses: a query term that is **rare in the corpus** and **repeated in this document** (with a length norm) scores higher. It is not 'old search'. It is the right tool when the user typed an **identifier, error code, SKU, name, or exact phrase**.

Embeddings miss those on purpose — they smooth. BM25 does not. A production RAG that only embeds will lose 'INC-4419' and 'pgvector <=> operator' to near-synonyms.

You do not need to derive the formula. You need to say: IDF × TF with document-length normalisation, and **tokenisation and stemming matter**.""",
   why="""Interviewers will ask when keyword beats vectors. This is the answer. On the job, hybrid starts with a working BM25, not with a fusion blog.""",
   how="""Index tokens (and maybe n-grams) per chunk. Query the same analyser. Example. User: 'error E-204 on checkout'. BM25 finds the runbook titled E-204. Cosine may retrieve a generic checkout essay.

Keep the same chunk ids as the vector index so you can fuse later. Analyse query and documents the same way (case, stopwords).""",
   fails="""1. **Different analysers** on index vs query.

2. **No BM25** because 'we are semantic now'.

3. **Stemming a SKU** into junk.

4. **Scoring raw TF** without IDF — common words win.""",
   line="""BM25 ranks by rare terms that appear in this document. I use it for names, IDs, codes, and phrases. I do not treat lexical search as deprecated.""",
   kps=[
    "BM25 is lexical: rare query terms in this doc win.",
    "Identifiers and exact phrases are BM25's home turf.",
    "Same analyser on query and index.",
    "Keep chunk ids aligned with the vector index.",
    "You do not need the full formula in an interview.",
    "Embeddings smooth; BM25 does not.",
   ],
   qs=[
    {"q": "What does BM25 reward?", "a": "Query terms that are rare in the corpus (IDF) and present in this document (TF), with a length norm so long docs do not auto-win. It is lexical, not semantic.", "kind": "recall"},
    {"q": "A user pastes ticket id INC-4419 and vector search returns a similar incident. What do you add?", "a": "BM25 (or exact id lookup) on the same chunks. Dense retrieval will happily near-miss an identifier.", "kind": "debug"},
    {"q": "Why must query and index share an analyser?", "a": "If one lowercases and stems and the other does not, terms never meet. The ranker cannot recover a tokenisation mismatch.", "kind": "apply"},
    {"q": "Do you need to write the BM25 formula on a whiteboard?", "a": "No. Name IDF, TF, and length norm, and say when you would pick it over cosine. Deriving k1/b is optional.", "kind": "apply"},
    {"q": "Why keep the same chunk ids as the vector store?", "a": "Hybrid fusion (RRF) merges two ranked lists of the same objects. Different ids make fusion a join from hell.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Ask for a query that BM25 wins. If they cannot name an id or SKU, they have not used lexical search. Ask about the analyser.",
  ),
  "sparse-vs-dense-retrieval": note(
   what="""**Sparse** retrieval represents a document as a **high-dimensional bag of terms** (mostly zeros): BM25, TF-IDF, SPLADE. **Dense** retrieval represents it as a **short learned vector**: one embedding. Sparse is **exact on tokens**; dense is **soft on meaning**. They fail in complementary ways.

Sparse misses paraphrases ('how do I cancel' vs 'terminate subscription'). Dense misses rare tokens and is blind to a character in a SKU. Hybrid exists because neither channel is enough.

SPLADE and learned sparse models sit in the middle — still term-space, but weights are neural. Treat them as sparse until you have a reason.""",
   why="""Interviewers want this contrast, not a brand. On the job, this is why you keep two indexes.""",
   how="""Table: sparse — interpretable hits, good on IDs, needs an analyser. Dense — good on paraphrase, needs a model card and a metric. Example. Policy FAQ: dense. Invoice number: sparse. 'How do I get my money back for order 8891': both.

Do not call one 'legacy'. Call them channels.""",
   fails="""1. **Only dense** on a corpus of codes.

2. **Only sparse** on a corpus of paraphrased FAQs.

3. **Calling BM25 deprecated.**

4. **Mixing sparse scores with cosine** as if they were the same units.""",
   line="""Sparse is term-space and exact; dense is embedding-space and soft. I keep both because they miss different queries.""",
   kps=[
    "Sparse = term weights; dense = short learned vector.",
    "Sparse wins on IDs and rare tokens.",
    "Dense wins on paraphrase.",
    "They are channels, not generations of the same tool.",
    "Do not add their raw scores.",
    "Learned sparse is still sparse until you measure it.",
   ],
   qs=[
    {"q": "Contrast sparse and dense retrieval in one sentence each.", "a": "Sparse ranks in term space (BM25/TF-IDF): exact tokens, interpretable. Dense ranks in embedding space: paraphrase and meaning, blind to rare identifiers.", "kind": "recall"},
    {"q": "A FAQ bot only uses embeddings and keeps missing SKU questions. What is missing?", "a": "A sparse channel. SKUs are tokens, not synonyms. Add BM25 or an exact lookup on the same chunks.", "kind": "debug"},
    {"q": "Why not add BM25 score to cosine?", "a": "Different units and scales. Fusion needs ranks (RRF) or calibrated scores, not arithmetic on raw numbers.", "kind": "apply"},
    {"q": "When is dense enough alone?", "a": "When eval shows high recall on the real query mix and that mix is paraphrases, not identifiers. Enough is a number, not a vibe.", "kind": "apply"},
    {"q": "Is SPLADE dense?", "a": "No. It is learned sparse: term-space weights from a model. Treat it as the sparse channel until an eval says otherwise.", "kind": "recall"},
   ],
   links=[QDRANT, HF_EMBED],
   review="Hear complementary failures. If they pick a winner forever, push with an ID query and a paraphrase query.",
  ),
  "hybrid-retrieval-with-rrf": note(
   what="""**Hybrid retrieval** runs **sparse and dense** (and maybe more), then **merges** the ranked lists. **Reciprocal Rank Fusion (RRF)** is the default merge: for each document, sum `1 / (k + rank_i)` across lists. No score calibration. A doc that is #2 in BM25 and #5 in dense beats a doc that is #1 in only one list if the other missed it.

k (often 60) is a smoothing constant, not your top-k. You still cut the fused list to the k you will rerank or send.

RRF is boring and that is the point. Weighted score sums need a validation set; RRF often does not.""",
   why="""Interviewers will ask how you fuse. RRF is the answer they want first. On the job, this is the capstone of M4.6.""",
   how="""Retrieve 50 from BM25, 50 from ANN, union, RRF, take 20. Example. Query 'E-204 checkout timeout': BM25 puts the runbook first; dense puts a timeout essay first; RRF lifts the runbook if it also appeared in dense, or still keeps it high from one strong list.

Implement as a dict of id → score. Do not unique-by-text; unique-by-chunk-id.""",
   fails="""1. **Adding cosine to BM25** without calibration.

2. **Different chunk ids** across indexes.

3. **RRF k confused** with top-k.

4. **One list of 3 and one of 50** without noticing the imbalance.""",
   line="""I retrieve sparse and dense, then merge with RRF. I do not add raw scores. Shared chunk ids are the contract.""",
   kps=[
    "Hybrid = two (or more) ranked lists, then a merge.",
    "RRF sums 1/(k + rank) — no score calibration.",
    "RRF k is smoothing, not the result size.",
    "Same chunk ids across channels.",
    "A strong single-list hit still survives.",
    "Score addition is a later, calibrated option.",
   ],
   qs=[
    {"q": "What does Reciprocal Rank Fusion compute?", "a": "For each document, sum 1/(k + rank) across each ranked list. Higher is better. You do not need the raw BM25 or cosine numbers.", "kind": "recall"},
    {"q": "You added cosine to BM25 and a common word now ranks first. What went wrong?", "a": "Uncalibrated score addition. BM25 and cosine live on different scales. Use RRF (or a fitted mix) instead.", "kind": "debug"},
    {"q": "Why share chunk ids across the two indexes?", "a": "RRF merges objects, not strings. If the same span has two ids, it competes with itself and citations fork.", "kind": "apply"},
    {"q": "You retrieved 3 sparse hits and 80 dense hits. What do you watch?", "a": "The dense list will dominate ranks. Balance the retrieve-k per channel or you have fake hybrid.", "kind": "apply"},
    {"q": "Is RRF k the same as top-k sent to the LLM?", "a": "No. RRF k (often 60) smooths the rank formula. You still slice the fused list to the k the next stage wants.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Ask them to write RRF in one line. If they add scores, correct it. Ask about shared ids.",
  ),
  "when-hybrid-retrieval-helps": note(
   what="""Hybrid helps when the **query mix contains both** paraphrase and **names, technical terms, IDs, numbers, and exact phrases**. One channel covers what the other drops. It also helps when you cannot predict the mix (support search, internal wiki).

It helps less when every query is a synonym of a FAQ, or every query is an id lookup — then one good channel is enough (next note).

Measure on a labelled set that includes both kinds. A hybrid win on 'how do I reset' plus 'INC-12' is the story; a win only on paraphrases is just dense working.""",
   why="""Interviewers will ask when to bother. On the job, this is the design brief for the capstone.""",
   how="""Look at production queries. If ≥ a slice are identifiers or quoted phrases, keep BM25. Example. Commerce search: 'red shoes' (dense) and 'SKU 44-AX' (sparse). Internal eng wiki: error codes plus 'why is the worker stuck'.

If you cannot sample queries, assume mixed and start hybrid; drop a channel when eval says it adds nothing.""",
   fails="""1. **Hybrid because a blog said so** on a paraphrase-only set.

2. **No identifier queries** in the eval.

3. **Dropping BM25** after a demo of synonyms.

4. **Ignoring numbers** in queries ('3 days', versions).""",
   line="""Hybrid helps when the mix includes names, terms, IDs, numbers, or exact phrases as well as paraphrases. I put both kinds in the eval.""",
   kps=[
    "Hybrid earns its keep on mixed query types.",
    "Names, IDs, numbers, phrases need a lexical channel.",
    "Paraphrases need a dense channel.",
    "Eval must include both kinds of query.",
    "Unknown mix → start hybrid, then drop if a channel is dead weight.",
    "A synonym-only demo does not justify dropping BM25.",
   ],
   qs=[
    {"q": "When does hybrid retrieval help most?", "a": "When queries mix paraphrases with names, technical terms, IDs, numbers, or exact phrases. Each channel covers the other's misses.", "kind": "recall"},
    {"q": "Eval only has FAQ paraphrases and hybrid ties dense. What do you do?", "a": "Add identifier and phrase queries to the set before you drop BM25. The current set cannot see lexical wins.", "kind": "debug"},
    {"q": "A support corpus has ticket ids in half of queries. Design the retrieve step.", "a": "BM25 plus dense, same chunk ids, RRF, then maybe a reranker. Do not ship dense-only.", "kind": "apply"},
    {"q": "How do you know the mix?", "a": "Sample production queries (or support tickets). Count ids, quotes, and paraphrases. Do not guess from the homepage.", "kind": "apply"},
    {"q": "Does hybrid always beat the better single channel?", "a": "No. If one channel already has high recall, the other can add latency for no lift. Measure.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Ask for the query mix. If they cannot name an identifier query, they are selling hybrid as fashion.",
  ),
  "rrf-as-the-default-merge": note(
   what="""**RRF is the default merge** because it **needs no score calibration**. You do not estimate means, you do not min-max week to week, you do not refit when you swap the embedder. Ranks are ranks.

Weighted linear combinations (`α * norm(bm25) + (1-α) * cosine`) can beat RRF **after** you fit α on a labelled set and you keep fitting when models change. That is a later optimisation, not the start.

Default means: ship RRF this week; only replace it when an eval says a calibrated mix wins enough to pay the ops.""",
   why="""Interviewers love 'why not a weighted sum'. This is why. On the job, α-fitting is how a team spends a sprint on a 0.5% lift.""",
   how="""Implement RRF first. Log per-channel ranks so you can debug. Example. After a new embedder, cosine scale shifts; RRF still works. A fitted α is now wrong.

If you later fit a mix, version the weights next to the model_id.""",
   fails="""1. **Fitting α first** with 20 labelled queries.

2. **Re-using α** after an embedder swap.

3. **Normalising scores** per query in a way that flips ranks randomly.

4. **Treating RRF as unsophisticated** in a review.""",
   line="""RRF is the default because ranks do not need calibration. I only fit a weighted mix when an eval pays for the extra ops.""",
   kps=[
    "RRF needs no score calibration.",
    "Weighted sums need a labelled α and re-fits.",
    "Embedder swaps break fitted mixes; RRF survives.",
    "Default = ship RRF, replace only for measured lift.",
    "Log per-channel ranks for debug.",
    "A 20-row fit of α is folklore.",
   ],
   qs=[
    {"q": "Why is RRF the default hybrid merge?", "a": "It uses ranks, not raw scores, so you do not calibrate BM25 against cosine or refit when an embedder changes. A weighted sum can win later, after a real fit.", "kind": "recall"},
    {"q": "You fitted α last quarter and swapped the embedder. Hybrid looks random. Why?", "a": "The cosine scale and rank shape changed; α did not. RRF would have been stable. Refit or go back to RRF.", "kind": "debug"},
    {"q": "When would you leave RRF?", "a": "When a labelled set large enough to trust shows a calibrated mix beating RRF by enough to pay the re-fit cost.", "kind": "apply"},
    {"q": "What do you log besides the fused list?", "a": "Each channel's rank (and maybe score) per id, so a miss can be blamed on a channel or on the merge.", "kind": "apply"},
    {"q": "Is a weighted sum wrong?", "a": "No. It is a later, fitted option. Wrong is shipping it as the first merge with a guessed α.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Ask why not a weighted sum. Hear calibration. If they fit α on a dozen rows, push.",
  ),
  "when-hybrid-does-not-help": note(
   what="""If **one channel already has high recall**, the other **only adds latency** (and another index to run). Hybrid is not free: two retrieves, a merge, more tail latency. Skip the weak channel when the eval says so.

Typical skips: a product search that is almost all SKUs (sparse wins; dense is theatre). An FAQ with no identifiers (dense wins). A tiny corpus where you already send every chunk.

Do not keep a dead channel 'for completeness'. Completeness is a dashboard, not a second p95.""",
   why="""Interviewers will poke 'always hybrid'. On the job, this is how you delete an index.""",
   how="""Ablate. Measure recall@k and p95 with dense-only, sparse-only, hybrid. Example. Dense-only recall 0.94, hybrid 0.95, +40ms: drop sparse. Sparse-only 0.97 on an SKU corpus: drop dense.

Revisit after the query mix shifts (a new client who pastes stack traces).""",
   fails="""1. **Always hybrid** as a religion.

2. **No ablation.**

3. **Keeping an index** nobody's queries use.

4. **Comparing quality without latency.**""",
   line="""If one channel already has high recall, the other only adds latency. I ablate and I delete the dead index.""",
   kps=[
    "High single-channel recall makes the other channel cost.",
    "Ablate dense-only, sparse-only, hybrid.",
    "Measure quality and p95 together.",
    "SKU-only and FAQ-only mixes often skip a channel.",
    "Revisit when the query mix shifts.",
    "A dead index is not completeness.",
   ],
   qs=[
    {"q": "When does hybrid not help?", "a": "When one channel already has high recall on the real mix. The second retrieve then adds latency and ops for little or no lift.", "kind": "recall"},
    {"q": "Hybrid is +1ms of quality and +80ms p95. What do you do?", "a": "Drop the weaker channel unless a slice of queries (ids, say) still needs it — then route those. Do not pay 80ms for a rounding error.", "kind": "debug"},
    {"q": "How do you prove a channel is dead?", "a": "Ablate it on a labelled set that matches production. If recall stays and p95 drops, delete the index.", "kind": "apply"},
    {"q": "A new tenant pastes error codes. You had dropped BM25. Now what?", "a": "The mix shifted. Bring sparse back for that tenant or globally, and re-eval. Ablations expire.", "kind": "apply"},
    {"q": "Is a tiny corpus a reason to skip hybrid?", "a": "Often yes. If you can scan everything, two indexes are ceremony. Brute-force plus a filter may be enough.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Ask for an ablation. If they never drop a channel, they are collecting indexes. Ask about p95.",
  ),
  "interview": note(
   what="""**Interview: design hybrid search** is a short architecture: **sparse + dense + RRF**, then a **reranker if the judge still misses**. Say shared chunk ids, filters/ACL on both channels, and when you would drop a channel.

This is M4.6's exam. They want the merge, not a vendor.""",
   why="""It is the capstone talking point. On the job it is also the design doc's first diagram.""",
   how="""Say: 'Same chunks in BM25 and the vector index. Retrieve k from each, RRF, then maybe rerank 20 to 5. ACL filter on both. I add a reranker only if an eval still misses. I drop a channel if ablation says it is dead.'

If they poke identifiers: 'that is why sparse exists.' If they poke paraphrase: 'that is why dense exists.'""",
   fails="""1. **Only dense** plus a smile.

2. **Adding scores** as the merge.

3. **A reranker on the whole corpus.**

4. **No ACL** on one of the channels.""",
   line="""Sparse plus dense, same chunk ids, RRF, then a reranker if the judge still misses. I drop a channel when ablation says it only costs latency.""",
   kps=[
    "Sparse + dense + RRF is the default design.",
    "Rerank only if the judge still misses.",
    "Shared chunk ids and ACL on both channels.",
    "Ablate a channel that adds only latency.",
    "Do not add raw scores.",
    "Name identifier vs paraphrase in the pitch.",
   ],
   qs=[
    {"q": "Design hybrid search in one breath.", "a": "Sparse plus dense on the same chunks, RRF to merge, then a reranker if eval still misses. Filter ACL on both lists. Drop a channel that adds only latency.", "kind": "recall"},
    {"q": "A candidate adds cosine to BM25 and reranks the corpus. What do you fix?", "a": "Replace the sum with RRF (or a fitted mix). Rerank a shortlist, never the corpus. Ask them for chunk-id alignment.", "kind": "debug"},
    {"q": "Where does a reranker sit in this design?", "a": "After fusion, on a shortlist (20–50), before the LLM. It is optional until a judge shows lift.", "kind": "apply"},
    {"q": "What if they forget ACL on BM25?", "a": "Lexical hits can leak another tenant. Both channels must apply the same filter.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Sparse + dense + RRF, then a reranker if the judge still misses.", "kind": "recall"},
   ],
   links=[QDRANT],
   review="Hear three stages and an ablation. If they only say vector search, fail the talking point.",
  ),
 }
}
