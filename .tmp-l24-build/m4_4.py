from helper import note, OA_EMBED, QDRANT

NOTES = {
 "m4-4": {
  "cosine-dot-product-euclidean": note(
   what="""Three ways to compare vectors. **Cosine similarity** is the cosine of the angle — scale-invariant, the default for many text embedders. **Dot product** (inner product) is cosine if vectors are L2-normalised, otherwise it also rewards magnitude. **Euclidean (L2) distance** is the straight-line distance; smaller is nearer. The **metric must match how the model was trained and how the index is built**. Using L2 on vectors meant for cosine (or the reverse) silently ranks wrong.

Normalise if the vendor says so. pgvector and Qdrant make you pick an operator (`<=>`, cosine, IP, L2). That pick is a contract, not a preference.""",
   why="""Interviewers will ask cosine vs L2 vs IP. They want: match the model and the index, cosine is common for text, IP ≡ cosine if normalised. On the job, a wrong operator is a silent quality hole.""",
   how="""Read the model card: 'use cosine' or 'normalise then IP'. Configure the index to that. Example. OpenAI text embeddings: cosine (or IP after norm). A teammate builds L2 on raw vectors; ranking shifts; you rebuild.

Do not compare raw scores across metrics or across models. A 0.2 L2 is not a 0.8 cosine.""",
   fails="""1. **Index L2, query cosine.**

2. **Comparing scores** from two metrics.

3. **Forgetting to normalise** when IP assumes unit vectors.

4. **Picking cosine** because a blog said so, against the card.""",
   line="""Cosine, dot product, and L2 are different geometries. I match the metric to the model and the index. I do not treat a score as portable.""",
   kps=[
    "Cosine = angle; IP = cosine if normalised; L2 = distance.",
    "Metric must match training and the index operator.",
    "Do not compare scores across metrics or models.",
    "Normalise when the card says so.",
    "A wrong operator is a silent recall bug.",
    "This is a training-and-index decision, not a taste.",
   ],
   qs=[
    {"q": "When are cosine and inner product the same ranking?", "a": "When vectors are L2-normalised. Then IP equals cosine up to a constant. If they are not normalised, IP also ranks by magnitude.", "kind": "recall"},
    {"q": "You built an L2 index on a cosine-trained embedder. What do you do?", "a": "Rebuild with the matching operator (or normalise and use IP if that is the engine's cosine path). Do not tune k on a wrong metric.", "kind": "debug"},
    {"q": "Why can you not compare a 0.8 cosine to a 1.2 L2?", "a": "Different geometries and scales. Thresholds do not transfer. Keep one metric per index.", "kind": "apply"},
    {"q": "Where do you look to pick the metric?", "a": "The embedding model card, then the index docs for the matching operator. Not a random tutorial.", "kind": "apply"},
    {"q": "What does scale-invariant mean for cosine?", "a": "Multiplying a vector by a positive constant does not change cosine. That is why length of the raw embedding is often discarded.", "kind": "recall"},
   ],
   links=[OA_EMBED, QDRANT],
   review="Ask which operator the index uses and why. If they cannot name it, the metric is accidental. Ask what happens if it mismatches the card.",
  ),
  "semantic-search-from-scratch": note(
   what="""A **from-scratch** semantic search is: **query → embed → similarity against stored vectors → top-k**. No magic. In a notebook: a matrix of chunk vectors, a query vector, cosine, `argpartition`. In production: the same math behind an ANN index plus metadata filters. You should be able to write the brute-force version so you know what the database is approximating.

Top-k is a product number. Score thresholds are optional and metric-specific. Always return ids so you can fetch text and metadata; do not store text only in the vector store if your source of truth is elsewhere.""",
   why="""Interviewers will ask you to sketch semantic search. They want this pipeline in 20 seconds. On the job, if you cannot brute-force a hundred vectors you cannot debug ANN.""",
   how="""```
q = embed(query)
scores = cosine(q, matrix)
idx = top_k(scores, k)
return chunks[idx]
```

Example. 200 chunks in numpy. You verify the late-fee chunk is #1 for 'late fee'. Then you put the same vectors in pgvector and confirm the same id is in the top 5 (ANN may shuffle exact order). If brute-force is right and ANN is wrong, your knobs are the bug.""",
   fails="""1. **Cannot write brute-force** so you cannot debug ANN.

2. **Returning vectors** not ids/text.

3. **A threshold copied from a blog** for a different metric.

4. **Forgetting to embed the query** (searching raw text against vectors).""",
   line="""Query embed, compare to stored vectors, take top-k ids. I can brute-force a small matrix so I know what the ANN is approximating.""",
   kps=[
    "Pipeline: embed query, score, top-k ids.",
    "Brute-force is the debug oracle for ANN.",
    "k is a product number; thresholds are metric-specific.",
    "Return ids and fetch text/metadata.",
    "Never search raw text against vectors.",
    "If brute-force is right and ANN is wrong, tune ANN.",
   ],
   qs=[
    {"q": "Sketch semantic search from scratch.", "a": "Embed the query with the same model as the corpus, compute cosine (or the index metric) against stored vectors, take top-k ids, fetch those chunks. That is the whole pipeline.", "kind": "recall"},
    {"q": "ANN misses a chunk that brute-force ranks #1. Where is the bug?", "a": "In the ANN knobs or the filter, not in the embedder. Use brute-force as the oracle, then raise ef/nprobe or fix pre-filter.", "kind": "debug"},
    {"q": "What do you return from the search call?", "a": "chunk ids (and scores), then join to text and metadata. Returning raw vectors to the generator is not an answer.", "kind": "apply"},
    {"q": "Why write the numpy version at all?", "a": "To have an exact ranking on a sample so you can tell embedder bugs from index bugs. Production ANN is approximate on purpose.", "kind": "apply"},
    {"q": "Is a 0.75 score threshold portable?", "a": "No. It depends on the model and the metric. Prefer top-k plus an eval; add a threshold only after you measure.", "kind": "recall"},
   ],
   links=[OA_EMBED, QDRANT],
   review="Hear query → embed → score → top-k. Ask how they would know ANN is wrong. If they cannot brute-force a sample, they cannot debug.",
  ),
  "semantic-similarity-vs-keyword-match": note(
   what="""**Semantic similarity** finds paraphrases and related concepts. **Keyword / lexical match** (BM25, exact) finds the **same tokens**: SKUs, error codes, names, quotes. They fail on different queries. Semantic misses `ERR-1402` if the chunk says `ERR-1402` and the query is that code but the embedder is weak on identifiers. Keyword misses 'how do I get my money back' when the doc says 'refund window'.

**Hybrid** (later module) exists because neither channel is enough. Do not advertise semantic search as a replacement for find-in-page.

Exact match is also cheaper and easier to explain in an audit.""",
   why="""Interviewers will ask when semantic search fails. Identifiers and negation are the answers. On the job, this is why you keep BM25.""",
   how="""Build a tiny table of queries: paraphrase, SKU, name, negation. Run semantic-only. Example. 'NX-14 adapter' — semantic returns 'adapters we support'; keyword returns the NX-14 row. You need both.

Teach the product: a part-number box can stay lexical even if the chatbot is hybrid.""",
   fails="""1. **Killing BM25** because 'we have vectors now'.

2. **Expecting semantic** to find SKUs.

3. **Expecting keyword** to find paraphrases.

4. **One UI** that cannot show why a hit matched.""",
   line="""Semantic finds paraphrases; keyword finds identifiers. I keep both in mind and I do not pretend cosine replaces find-in-page.""",
   kps=[
    "Semantic: paraphrases. Lexical: exact tokens and ids.",
    "Each fails where the other wins.",
    "SKUs, error codes, and names often need BM25.",
    "Paraphrases often need vectors.",
    "Hybrid exists because of this split.",
    "Do not retire keyword search by slogan.",
   ],
   qs=[
    {"q": "When does semantic search lose to keyword search?", "a": "On exact identifiers, SKUs, error codes, rare names, and quoted phrases — tokens the embedder does not treat as unique. BM25 or exact match wins those.", "kind": "recall"},
    {"q": "You replaced the help-centre search with vectors only; part numbers miss. What do you add back?", "a": "Lexical/BM25 (or a hybrid with RRF). Do not fine-tune the embedder first for an identifier problem.", "kind": "debug"},
    {"q": "When does keyword lose to semantic?", "a": "On paraphrases and synonym-heavy questions where the words do not overlap the doc. 'Get my money back' vs 'refund window'.", "kind": "apply"},
    {"q": "How do you explain a hit to an auditor?", "a": "Lexical: the tokens that matched. Semantic: the chunk and a score, plus a citation. Hybrid: both. A cosine-only story is weaker in audit.", "kind": "apply"},
    {"q": "Why is this the setup for hybrid search?", "a": "Because the two channels fail on complementary queries. Fusion (RRF) is how you stop choosing one religion.", "kind": "recall"},
   ],
   links=[OA_EMBED, QDRANT],
   review="Ask for one query each channel wins. If they retired BM25, ask about SKUs. If they never added vectors, ask about paraphrases.",
  ),
  "where-semantic-search-fails": note(
   what="""Classic failure cases: **exact names and IDs**, **numbers**, **rare terminology**, **negation** ('not eligible for refund'), and **recency** (the newest policy vs the most similar old one). Embeddings also confuse **entities** that share a type (two people named Riya). Semantic search is similarity, not logic and not time.

The next step is not 'a bigger embedder'. It is **keyword**, **filters** (date, product), **rerankers**, or **structured lookup**. Say that in the interview.

Negation is especially ugly: 'no late fee' may sit near 'late fee' because the words overlap in the space.""",
   why="""This is the follow-up to 'when semantic search fails'. Interviewers want the list and the next tool, not despair. On the job, these cases are your eval slice.""",
   how="""Put the failure cases in the golden set. Example. Query 'not eligible for refund' must not retrieve the eligibility paragraph as a yes. You add a reranker, a negation-aware prompt, or a structured field. Query `INV-2024-9` uses keyword. Query 'latest refund policy' uses a date filter.

Do not hide these in the happy-path demo.""",
   fails="""1. **Demo-only eval** of paraphrases.

2. **Bigger model** as the first fix for IDs.

3. **No date filter** on policy corpora.

4. **Ignoring negation** until a user is harmed.""",
   line="""Semantic search fails on ids, numbers, rare terms, negation, and recency. I add keyword, filters, or a reranker — I do not just buy a bigger embedder.""",
   kps=[
    "Failures: ids, numbers, rare terms, negation, recency, entity twins.",
    "Next tools: BM25, metadata filters, rerank, structured lookup.",
    "Negation can rank the opposite paragraph.",
    "Recency is a filter, not a cosine.",
    "Put these cases in the golden set.",
    "A bigger embedder is not the first fix for an ID.",
   ],
   qs=[
    {"q": "List four cases where semantic search fails.", "a": "Exact ids/SKUs, numbers, rare terms, negation, and recency (and similar entity names). Similarity is not logic and not time.", "kind": "recall"},
    {"q": "Users asking for the latest policy get last year's. What do you add?", "a": "A recency filter or a sort on updated_at, not a new embedder. Cosine does not know 'latest'.", "kind": "debug"},
    {"q": "Query 'not eligible for refund' retrieves the eligibility yes. What next?", "a": "Include this in the eval, add lexical signals or a reranker, and make the generator abstain unless a negative span is quoted. Do not only raise k.", "kind": "apply"},
    {"q": "Why is a bigger embedder a weak first fix for SKUs?", "a": "Identifiers are a lexical problem. BM25 or exact match is cheaper and more reliable. Try that before a re-embed.", "kind": "apply"},
    {"q": "What do you say you add next in the interview?", "a": "Keyword/hybrid, metadata filters, and a reranker if the judge still misses — named for the failure, not as a pile.", "kind": "recall"},
   ],
   links=[OA_EMBED, QDRANT],
   review="Hear the list and the next tool. If they only say bigger model, fail. Ask how recency is implemented.",
  ),
  "metric-must-match-the-index": note(
   what="""The **metric is a contract** between the **embedder**, the **index**, and the **query**. Cosine vs L2 vs inner product is chosen at **index build** and must be the same at query. Changing it requires a rebuild. ANN implementations expose this as a distance or space name (`Cosine`, `Euclid`, `Dot`). Mixing them is the same class of bug as mixing embedders.

If you normalise vectors at write, you must normalise at query. If the engine normalises internally, do not double-normalise unless you measured.

Write the metric on the index metadata next to model_id.""",
   why="""This is the operational twin of 'spaces cannot be mixed'. Interviewers want both sentences. On the job, a copied index script with the wrong `vector_distance` is a silent week.""",
   how="""Config: `{model, dim, metric, normalised}`. The write path and the query path import it. Example. Qdrant collection `cosine`. Query uses cosine. A helper that sends L2 is a bug. Test: brute-force cosine vs index top-1 on a fixture.

Migration of metric = rebuild, same as a model change.""",
   fails="""1. **Default metric** that is not the card's.

2. **Query helper** with a hardcoded other metric.

3. **Double normalisation.**

4. **No metric on the index record.**""",
   line="""Metric is a training-and-index decision. I store it next to model_id, I use it on write and query, and I rebuild if I change it.""",
   kps=[
    "Embedder, index, and query share one metric.",
    "Changing metric is a rebuild.",
    "Store metric next to model_id.",
    "Normalise consistently both sides.",
    "ANN space name is this contract.",
    "A default operator is not a design.",
   ],
   qs=[
    {"q": "Why must the similarity metric match the index?", "a": "The index was built to rank with one geometry. Querying with another ranks a different neighbour set. It is a contract, like the embedder id.", "kind": "recall"},
    {"q": "pgvector is L2; you query with cosine in app code. What happens?", "a": "Wrong neighbours. Use the matching operator in SQL and in any brute-force debug. Rebuild if you truly want cosine.", "kind": "debug"},
    {"q": "What do you store on the index record?", "a": "model_id, dim, metric, and whether vectors are normalised. The query path reads this; it does not guess.", "kind": "apply"},
    {"q": "Is changing cosine to IP a config flip?", "a": "Only if vectors are already normalised and the engine treats them as equivalent. Otherwise it is a rebuild. Do not flip in place and hope.", "kind": "apply"},
    {"q": "How do you test the contract?", "a": "A fixture where brute-force with the declared metric matches the index top-1 on a tiny set. Drift means the operator is wrong.", "kind": "recall"},
   ],
   links=[QDRANT, OA_EMBED],
   review="Ask for the index's space name. If they do not know it, the contract is implicit. Ask what a metric change costs.",
  ),
  "keyword-still-wins-on-identifiers": note(
   what="""**SKUs, error codes, invoice numbers, and proper names** often need **BM25 or exact match** even when you have a strong embedder. Token-level identity is not what contrastive training optimises. A hybrid index (later) is the production pattern; the sentence you must own now is: **keyword still wins on identifiers**.

Do not wait for hybrid week to keep a lexical path for part numbers. A simple `ILIKE` or a BM25 field on `sku` / `code` saves you.

If the identifier is structured, a **database lookup** may beat both channels.""",
   why="""Interviewers will poke 'so we can delete Elasticsearch?'. No. On the job, this is the ticket that comes in the first week after a vector-only launch.""",
   how="""Route: if the query matches `^[A-Z]{2,}-\\d+` or similar, run lexical or SQL first. Example. `ERR-1402` → BM25 or `WHERE code=`. 'why did I get this error' → semantic/hybrid.

Keep the identifier fields in metadata so filters work even when you stay in the vector engine.""",
   fails="""1. **Vector-only launch** on a parts catalogue.

2. **No identifier metadata.**

3. **Forcing the embedder** to learn SKUs with a tiny tune.

4. **Hiding the lexical box** in the UI.""",
   line="""Keyword still wins on identifiers. I keep a lexical or SQL path for SKUs and codes, and I do not delete BM25 because we shipped vectors.""",
   kps=[
    "SKUs, error codes, and names are lexical problems.",
    "A regex/SQL lookup can beat both search channels.",
    "Keep identifier fields as metadata.",
    "Do not retire BM25 on a catalogue.",
    "Fine-tuning an embedder is a weak first fix for SKUs.",
    "This sentence belongs in every RAG design review.",
   ],
   qs=[
    {"q": "Why does keyword still win on identifiers?", "a": "Embedders are trained for paraphrases, not for unique tokens like SKUs and error codes. BM25 or exact match retrieves those reliably and cheaply.", "kind": "recall"},
    {"q": "A parts bot shipped vector-only and NX-14 misses. First fix?", "a": "Add BM25 or an exact field on sku. Do not start a fine-tune. Optionally route queries that look like part numbers to SQL.", "kind": "debug"},
    {"q": "When is a database lookup better than BM25?", "a": "When the identifier is structured and unique in a table (invoice id, order id). Search is the wrong tool; a primary-key get is the right one.", "kind": "apply"},
    {"q": "What metadata do you store to help identifier queries?", "a": "sku, code, name fields you can filter or boost. Even a vector query can be constrained to product=NX-14.", "kind": "apply"},
    {"q": "Can we delete the keyword index after hybrid 'is done'?", "a": "Usually no — hybrid uses it. Deleting it is how identifier recall dies again.", "kind": "recall"},
   ],
   links=[QDRANT, OA_EMBED],
   review="Ask if they retired BM25. If yes, ask NX-14. Hear the sentence keyword still wins on identifiers.",
  ),
  "interview": note(
   what="""**Interview: when semantic search fails** is a list plus a next step: **negation, exact ids, recency** — then **what you add** (BM25/hybrid, filters, reranker, structured lookup). You may add rare terms and entity twins. You do not stop at 'it fails'.

This is M4.4's exam.""",
   why="""It is the standard follow-up after they ask you to define embeddings. On the job it is also the eval-slice list.""",
   how="""Say: 'Semantic search fails on negation, exact identifiers, and recency — also numbers and rare terms. I add lexical search or a filter, then a reranker if the judge still misses. I do not buy a bigger embedder first for an id.'

Give one example each. Close with the next-step sentence.""",
   fails="""1. **Only the list**, no next step.

2. **Bigger model** as the next step.

3. **Forgetting recency.**

4. **Forgetting ids.**""",
   line="""Semantic search fails on negation, exact ids, and recency. I add keyword, filters, or a reranker — I say what I add next.""",
   kps=[
    "List: negation, ids, recency (plus numbers, rare terms).",
    "Always name the next tool.",
    "Not a bigger embedder first for ids.",
    "One example each if they give you time.",
    "This list is also your eval slice.",
    "M4.4 talking point.",
   ],
   qs=[
    {"q": "When does semantic search fail, and what do you add next?", "a": "Negation, exact ids, recency (and numbers/rare terms). Next: BM25 or hybrid, metadata filters, a reranker if needed, or a structured lookup. Not a bigger embedder first for an id.", "kind": "recall"},
    {"q": "They only want one failure. Which do you pick and why?", "a": "Identifiers — everyone has SKUs — or negation if the product can harm. Then name the next tool. One well-explained case beats a mumbled list.", "kind": "apply"},
    {"q": "A candidate says 'use GPT-5 embeddings'. What is wrong?", "a": "They skipped the cheap next tool. Recency is a filter; ids are lexical. Model shopping is last.", "kind": "debug"},
    {"q": "How do you show recency in the answer?", "a": "A date filter or sort on updated_at, maybe a 'as of' in the prompt. Cosine does not mean latest.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Negation, exact ids, and recency — say what you add next.", "kind": "recall"},
   ],
   links=[OA_EMBED, QDRANT],
   review="Hear the list and the next tool in one breath. If they stop at fails, prompt them. If they buy a model, fail the talking point.",
  ),
 }
}
