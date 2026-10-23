from helper import note, PGV, QDRANT

NOTES = {
 "m4-5": {
  "storing-vectors-in-pgvector-or-qdrant": note(
   what="""A **vector database** stores **embeddings, ids, and metadata** (and often the text or a pointer to it). **pgvector** puts vectors in Postgres next to your relational data — simple ops, familiar backups, good for small-to-medium corpora. **Qdrant** (and peers) are dedicated ANN stores — better at large-scale search ops, filters, and clustering. You store `chunk_id`, `doc_id`, `vector`, `section_path`, dates, ACLs. You do not store only a naked float array.

Choice is operational: transactions and joins vs ANN features and scale. Start in Postgres if the corpus is small and you already run it; move when ANN ops dominate.

Both need a model_id and metric on the collection.""",
   why="""Interviewers will ask pgvector vs a dedicated store. They want this split. On the job, putting 50M vectors in a primary OLTP Postgres is how you regret a Friday.""",
   how="""Small corpus (10k–few 100k): pgvector, IVFFlat/HNSW as available, metadata as columns. Large or heavy filter/ANN: Qdrant/etc. Example. Internal wiki 20k chunks: pgvector is fine. Product catalogue 20M: dedicated store.

Keep text in object storage or the source DB if rows are huge; store a pointer next to the vector.""",
   fails="""1. **Naked vectors** with no metadata.

2. **50M vectors** on the primary OLTP box.

3. **No model_id** on the collection.

4. **Duplicating 10k-token text** in every replica of a dedicated store without a reason.""",
   line="""I store vectors with ids and metadata. I start in Postgres when the corpus is small; I move to a dedicated ANN store when search ops dominate.""",
   kps=[
    "Store vector + ids + metadata, not a naked array.",
    "pgvector: simple ops, joins, small-to-medium.",
    "Dedicated store: scale, ANN ops, heavy filters.",
    "model_id and metric live on the collection.",
    "Huge text can be a pointer, not a copy.",
    "Do not put tens of millions of vectors on the OLTP primary.",
   ],
   qs=[
    {"q": "What do you store in a vector database besides the floats?", "a": "chunk_id, doc_id, metadata (section, date, ACL), model_id/metric on the collection, and a pointer or the text. A naked array cannot filter or cite.", "kind": "recall"},
    {"q": "When do you pick pgvector versus Qdrant?", "a": "pgvector when the corpus is small-to-medium and you want joins/backups you already have. A dedicated store when ANN scale, filters, or ops would hurt the OLTP box.", "kind": "apply"},
    {"q": "20M vectors landed on the primary Postgres. What is the risk?", "a": "Memory, vacuum, and ANN build compete with transactions. Move search off the primary or to a dedicated store before the next peak.", "kind": "debug"},
    {"q": "Why put model_id on the collection?", "a": "So the query path refuses a mismatched embedder. The store is not just floats; it is a space.", "kind": "apply"},
    {"q": "Must the text live in the vector store?", "a": "No. A pointer to the source of truth is enough if fetch is fast. Store text in the engine when you want one hop and the rows are small.", "kind": "recall"},
   ],
   links=[PGV, QDRANT],
   review="Ask why they picked the store. If 20M vectors are in OLTP, push. Ask what metadata columns exist.",
  ),
  "top-k-search-with-metadata-filters": note(
   what="""**Top-k** returns the k nearest vectors. **Metadata filters** restrict the candidate set (product, date, tenant, language). Together they are the production query: 'nearest among *this user's* docs from *this year*'. Filters can be applied **before** or **after** ANN (next note) and the engine's rule matters.

k is a product number you will feed a reranker or the LLM. Too small: misses. Too large: cost and noise. Filters that are too tight return empty — a first-class outcome, not a crash.

Always filter **ACL** in this layer or before it. Do not retrieve another tenant's chunk and 'hope the model ignores it'.""",
   why="""Interviewers will ask how you keep tenant isolation in RAG. Filter here. On the job, empty results after a tight filter should trigger abstain, not a retry without the filter.""",
   how="""`search(q, k=20, filter={tenant=u, product=nx})`. Example. Support bot: filter tenant and product; k=20 for a reranker that will keep 4. Legal corpus: filter `effective_date <= today`. If empty: abstain or broaden one filter you named, not all of them.

Log the filter and the hit count. An empty is a signal.""",
   fails="""1. **ACL only in the prompt.**

2. **Dropping the filter** when empty.

3. **k=100** into the LLM.

4. **No empty handling.**""",
   line="""I retrieve top-k under metadata filters, especially ACL. Empty is a valid outcome. I do not drop the tenant filter to get hits.""",
   kps=[
    "top-k plus filters is the production query.",
    "ACL belongs in the filter, not only the prompt.",
    "Empty after a tight filter is abstain, not 'drop the filter'.",
    "k is sized for the next stage (rerank or LLM).",
    "Log filter and hit count.",
    "Know whether the engine filters before or after ANN.",
   ],
   qs=[
    {"q": "What is a production vector query besides top-k?", "a": "Metadata filters: tenant/ACL, product, date, language. Nearest among the allowed set, not nearest on earth.", "kind": "recall"},
    {"q": "A filter returns 0; the code strips tenant and retries. What is wrong?", "a": "You leaked another tenant's chunks. Empty means abstain or broaden a safe filter (date), never ACL.", "kind": "debug"},
    {"q": "How do you pick k if a reranker follows?", "a": "Large enough for the reranker to see the right span (20–50 is common), small enough to afford. The LLM sees the post-rerank 3–5, not the 50.", "kind": "apply"},
    {"q": "Where does ACL belong?", "a": "In the filter (or an earlier allow-list of doc ids), not only in the prompt. Prompts are not a security boundary.", "kind": "apply"},
    {"q": "Why log hit count with the filter?", "a": "So you can see that a product filter emptied the set, versus a bad embedder. Empty and 50 hits are different incidents.", "kind": "recall"},
   ],
   links=[PGV, QDRANT],
   review="Ask where tenant is enforced. If they say the prompt, fail. Ask what happens on empty.",
  ),
  "why-ann-search-exists": note(
   what="""**Brute-force** similarity is O(n) in the number of vectors. At millions of chunks that is too slow and too expensive for a user turn. **Approximate Nearest Neighbour (ANN)** builds a structure (graph, inverted lists, trees) so you visit a **fraction** of the vectors and still get **most** of the true neighbours. You trade a little **recall** for a lot of **latency and cost**.

ANN exists because exact search does not scale. On 5k vectors, brute-force is fine and is your debug oracle. On 5M, you need ANN. Know which regime you are in.

Approximation is why `ef` / `nprobe` exist (later).""",
   why="""Interviewers will ask why not `ORDER BY cosine`. They want O(n) vs ANN. On the job, this is why you pay for HNSW RAM.""",
   how="""Say the number. 10k × 1536 brute-force is a few ms in numpy. 10M is seconds-plus. Example. You prototype brute-force, you ship HNSW when n and QPS demand it. You keep a brute-force path on a sample to debug.

Do not enable ANN on 800 vectors 'to be modern'. You add knobs and lose exactness for nothing.""",
   fails="""1. **ANN on a tiny corpus** with no benefit.

2. **Brute-force on 20M** in the request path.

3. **Treating ANN as exact.**

4. **No sample oracle** when ANN looks wrong.""",
   line="""ANN exists because exact search is O(n). I brute-force when n is small or when I debug; I use ANN when latency and n demand it, and I accept a recall trade.""",
   kps=[
    "Brute-force is O(n); ANN visits a fraction.",
    "You trade a little recall for latency and cost.",
    "Tiny corpora do not need ANN.",
    "Huge corpora cannot brute-force in a user turn.",
    "Keep brute-force as a debug oracle on a sample.",
    "ANN is approximate — knobs recover recall.",
   ],
   qs=[
    {"q": "Why does ANN search exist?", "a": "Exact nearest neighbour is O(n) in corpus size. At millions of vectors that is too slow for a user turn. ANN approximates neighbours by visiting a fraction of the set.", "kind": "recall"},
    {"q": "You enabled HNSW on 600 chunks. What did you buy?", "a": "Knobs and approximation for no latency win. Stay exact until n or QPS requires ANN.", "kind": "debug"},
    {"q": "How do you debug a miss on an ANN index?", "a": "Brute-force the same query on a sample or the raw vectors. If exact search finds it, raise ef/nprobe or fix filters. If exact misses, the embedder or chunk is the bug.", "kind": "apply"},
    {"q": "What do you tell a PM who wants 100% recall at 5M vectors?", "a": "Exact search will miss the latency SLO. We pick ANN knobs to hit a measured recall (e.g. 0.95) at a p95. 100% is brute-force.", "kind": "apply"},
    {"q": "Is ANN optional in every RAG?", "a": "No. It is optional when n is small. It is required when n and QPS make O(n) too slow.", "kind": "recall"},
   ],
   links=[PGV, QDRANT],
   review="Ask why not order by cosine. Hear O(n). Ask when they would skip ANN. If they always enable HNSW, push.",
  ),
  "hnsw-ivf-trade-offs": note(
   what="""Two families to have intuition for, not to implement. **HNSW** (Hierarchical Navigable Small World) is a **graph**: good recall, more **RAM**, incremental inserts are OK-ish, build can be heavy. **IVF** (inverted file) partitions the space into lists: less RAM, you probe `nprobe` lists, cheaper storage, recall depends on that probe. Speed ↔ memory ↔ recall is the triangle.

You will not derive the maths. You will say: HNSW when RAM is OK and you want recall; IVF when you need a smaller footprint and can tune nprobe. Product engines have more variants (IVF-PQ, DiskANN); the triangle stays.

These are **not** one-time defaults. They are knobs you re-tune when n grows.""",
   why="""Interviewers want the triangle, not a paper. On the job, this is why the 'just use HNSW' laptop dies in production.""",
   how="""Table: HNSW — RAM high, recall high, latency good, inserts OK. IVF — RAM lower, recall via nprobe, build/train centroids. Example. 2M vectors on a 32 GB box: IVF-PQ or a dedicated store. 200k on 32 GB: HNSW is comfortable.

Re-measure recall@k and p95 when you change M, ef, lists, nprobe.""",
   fails="""1. **HNSW on a memory-poor box.**

2. **IVF with nprobe=1** and surprise misses.

3. **Copying paper defaults** at 100× your n.

4. **Pretending you implemented HNSW** in an interview.""",
   line="""HNSW is a RAM-heavy graph with strong recall; IVF is list-based and cheaper in memory. I pick from the speed-memory-recall triangle and I retune when n grows.""",
   kps=[
    "HNSW: graph, RAM, strong recall.",
    "IVF: lists, less RAM, nprobe trades recall.",
    "Triangle: speed, memory, recall.",
    "Knobs are not one-time defaults.",
    "Intuition, not implementation maths.",
    "Retune when the corpus grows.",
   ],
   qs=[
    {"q": "Contrast HNSW and IVF at the intuition level.", "a": "HNSW is a graph: higher RAM, strong recall, good latency. IVF partitions into lists: less RAM, you probe nprobe lists, recall depends on that. Both trade speed, memory, and recall.", "kind": "recall"},
    {"q": "HNSW OOMs the box at 5M vectors. What do you try?", "a": "IVF or IVF-PQ, a dedicated store, quantisation, or fewer dimensions — after an eval. Do not just add RAM without a number.", "kind": "debug"},
    {"q": "What does raising nprobe do?", "a": "You visit more inverted lists: recall and latency both go up. It is a product knob, not a one-time default.", "kind": "apply"},
    {"q": "Do you need to implement HNSW in an interview?", "a": "No. Name the triangle and when you would pick each family. Maths is a bonus, not the grade.", "kind": "apply"},
    {"q": "When do you retune M/ef/nprobe?", "a": "When n, QPS, or the SLA changes, or when a recall eval drops. Defaults rot as the corpus grows.", "kind": "recall"},
   ],
   links=[QDRANT, PGV],
   review="Hear the triangle. If they recite a paper, pull them back to RAM vs recall. Ask when they retune.",
  ),
  "indexing-updates-deletes": note(
   what="""ANN indexes are not just a write of a row. **Builds**, **inserts**, **updates**, and **deletes** have engine-specific costs. HNSW inserts are possible but fragmentation and recall can drift; some IVF setups need a **rebuild** after enough churn. Deletes may be **tombstones** until compaction. Plan **reindex** windows.

Operational considerations: backup/restore of the index, version of the graph, disk vs memory, and what happens if you kill a build. Treat the index as a derived artefact of the chunk table, not as the source of truth.

A Friday dump of 1M inserts without a plan is how you miss the SLA on Monday.""",
   why="""Interviewers will ask how you update a live index. They want: upsert, tombstone, occasional rebuild. On the job, this is the ops half of M4.1's incremental ingest.""",
   how="""Source of truth: chunk table. Index: built from it. Example. Nightly compact deletes; streaming upserts for new docs; full rebuild when recall drifts or after a metric/model change. Drill restore from backup.

Measure: insert QPS, build time, recall after 10% deletes. If recall drifted, rebuild.""",
   fails="""1. **Index as source of truth** with no chunk table.

2. **Never compacting** tombstones.

3. **Live full rebuild** with no replica.

4. **Ignoring recall drift** after heavy deletes.""",
   line="""The chunk table is the source of truth; the ANN index is derived. I upsert, I tombstone, I compact or rebuild when churn hurts recall, and I can restore.""",
   kps=[
    "Index is derived; chunks are source of truth.",
    "Inserts, updates, deletes have engine-specific costs.",
    "Tombstones need compaction.",
    "Rebuild when model/metric changes or recall drifts.",
    "Do not full-rebuild the only live copy.",
    "Drill backup/restore.",
   ],
   qs=[
    {"q": "What operational events does an ANN index have besides search?", "a": "Build, incremental insert, update, delete/tombstone, compaction, and rebuild. Each has a cost and a recall implication.", "kind": "recall"},
    {"q": "Recall slipped after a month of deletes. What do you do?", "a": "Compact or rebuild from the chunk table, then re-eval. Tombstones and fragmentation can degrade graphs. Do not first swap the embedder.", "kind": "debug"},
    {"q": "Why is the chunk table the source of truth?", "a": "You can rebuild the index from it. If the index is the only copy, a bad build or a metric change loses the corpus.", "kind": "apply"},
    {"q": "How do you rebuild without an outage?", "a": "Build a new index beside the old, switch queries, then drop the old. A live rebuild in place is a window of pain.", "kind": "apply"},
    {"q": "What do you drill besides search?", "a": "Restore from backup and a rebuild from the chunk table. Search-only drills miss the failure mode.", "kind": "recall"},
   ],
   links=[PGV, QDRANT],
   review="Ask what happens after a month of deletes. If they never rebuild or compact, recall will drift. Ask where the source of truth is.",
  ),
  "filters-before-or-after-ann": note(
   what="""**Pre-filtering** applies metadata first, then ANN in the remaining set. **Post-filtering** runs ANN on the whole space, then drops hits that fail the filter. Pre-filter can **empty a graph neighbourhood** (HNSW walks nodes that are then all illegal) and return poor or empty results. Post-filter can return **fewer than k** after dropping, or waste work on illegal neighbours.

**Know your engine's rule.** Some support both; some force one. A tight tenant filter on HNSW often wants a payload-aware or pre-filter implementation the engine documents — or a per-tenant index.

This is a favourite gotcha.""",
   why="""Interviewers who have been burned will ask. On the job, 'filter tenant' plus default HNSW is why one tenant sees nothing and another sees gold.""",
   how="""Read the engine docs. Example. Qdrant: understand payload filtering vs unfiltered HNSW. pgvector: your `WHERE` may post-filter depending on plan. If a tenant has 0.1% of vectors, a global HNSW + post-filter may return <k or walk mostly others; a per-tenant collection or a pre-filter that the engine supports is the fix.

Test: a tenant with 20 docs must still retrieve those 20, not an empty after a global walk.""",
   fails="""1. **Unknown filter timing.**

2. **Tight filter + naive HNSW** → empty.

3. **Post-filter and assuming k results.**

4. **One global index** for 10k tiny tenants with no plan.""",
   line="""Pre-filtering can empty a graph neighbourhood; post-filtering can return fewer than k. I learn the engine's rule and I test a small tenant.""",
   kps=[
    "Pre-filter vs post-filter is an engine rule.",
    "Tight filters + HNSW can miss or empty.",
    "Post-filter may return <k.",
    "Per-tenant indexes are a valid escape.",
    "Test the smallest tenant.",
    "Do not assume WHERE is pre-filter.",
   ],
   qs=[
    {"q": "What is the risk of pre-filtering on HNSW?", "a": "The walk stays in a neighbourhood that the filter then rejects, so you get poor or empty results even though legal vectors exist elsewhere.", "kind": "recall"},
    {"q": "A small tenant always gets 0 hits; brute-force finds their docs. What do you suspect?", "a": "Filter + ANN interaction. Check pre vs post, try a per-tenant index, or an engine payload-aware search. Do not first blame the embedder.", "kind": "debug"},
    {"q": "Post-filter returns 2 of k=10. Is that a bug?", "a": "It can be expected if most neighbours fail the filter. Ask for more candidates, use a filter-aware search, or index per tenant. Do not silently pad with other tenants.", "kind": "apply"},
    {"q": "When do you shard by tenant?", "a": "When tenants are many and tiny, or isolation/perf requires it. A global graph plus a tight filter is the failure mode.", "kind": "apply"},
    {"q": "How do you know which filter mode you are in?", "a": "Read the engine docs and EXPLAIN/trace a query. Do not assume SQL WHERE is pre-filter.", "kind": "recall"},
   ],
   links=[QDRANT, PGV],
   review="Ask pre vs post. If they have never tested a small tenant, they will ship empties. Ask whether WHERE is assumed.",
  ),
  "recall-vs-latency-knobs": note(
   what="""**ef** (HNSW search) and **nprobe** (IVF) are **product settings**, not one-time defaults. Raise them: **more recall, more latency** (and CPU). Lower them: faster, more misses. You pick a point on that curve from an eval (recall@k vs p95) and you revisit when n or QPS changes.

Build-time knobs (M, ef_construct, lists) are similar but cost RAM and build time. Do not copy a paper's numbers for a 10k-vector demo onto a 10M-vector store.

Log the knob values on the query so a miss can be reproduced.""",
   why="""Interviewers will ask what you tune when recall is low but brute-force is fine. This is the answer. On the job, leaving defaults is how you 'the index is bad' for a year.""",
   how="""Sweep nprobe or ef on a labelled set. Plot recall vs p95. Example. ef=32: recall 0.88, p95 12ms. ef=128: 0.96, 28ms. You pick 64 if the SLO is 20ms. Write the pick down.

Do not raise k to hide a low-ef miss — you may still miss the one span and you will pay the LLM.""",
   fails="""1. **Paper defaults forever.**

2. **Raising k** instead of ef/nprobe.

3. **No plot**, only vibes.

4. **Different knobs in staging and prod** with no note.""",
   line="""ef and nprobe are product knobs on a recall-latency curve. I sweep them on an eval, I log the values, and I do not treat defaults as destiny.""",
   kps=[
    "ef/nprobe trade recall for latency.",
    "Sweep on a labelled set; pick from the SLO.",
    "Build knobs cost RAM and time.",
    "Do not copy paper defaults across scales.",
    "Log knob values on the query.",
    "Raising k is a weak substitute for a too-low ef.",
   ],
   qs=[
    {"q": "What do ef and nprobe trade?", "a": "Higher values visit more of the graph or more lists: recall up, latency up. They are product settings you sweep, not one-time defaults.", "kind": "recall"},
    {"q": "Brute-force finds the chunk; ANN at default ef misses. First knob?", "a": "Raise ef (or nprobe), re-measure recall and p95. Do not first change the embedder or blindly raise k.", "kind": "debug"},
    {"q": "How do you pick the number?", "a": "Sweep on a labelled set, plot recall@k vs p95, pick the point that meets the SLO. Write it down and log it on queries.", "kind": "apply"},
    {"q": "Why are paper defaults dangerous?", "a": "They were set on a different n, dim, and metric. At your scale they can waste RAM or miss. Re-tune when n grows.", "kind": "apply"},
    {"q": "Is raising k the same as raising ef?", "a": "No. k asks for more neighbours from the same (possibly bad) walk. ef improves the walk. You may still need both, but they are different.", "kind": "recall"},
   ],
   links=[QDRANT, PGV],
   review="Ask what ef/nprobe is in prod and why. If they say default, they have not tuned. Ask for a recall-latency point.",
  ),
  "interview": note(
   what="""**Interview: choose pgvector vs a dedicated store** is a size-and-ops answer: **start in Postgres if the corpus is small** and you already run it; **move when ANN ops, RAM, or QPS would dominate the OLTP box**. Mention metadata, filters, and the rebuild story.

This is M4.5's exam. They do not want a brand war.""",
   why="""It is the design question for this module. On the job it is also the 'should we buy Qdrant' thread.""",
   how="""Say: '20k internal chunks: pgvector, HNSW if available, filters as columns. 20M product vectors or heavy ANN: dedicated store. I keep the chunk table as source of truth either way.' If they poke: tenant filters, backups, who pages 2am.

Close: 'Start in Postgres if the corpus is small; move when ANN ops dominate.'""",
   fails="""1. **Always Qdrant** or **always Postgres.**

2. **No n in the answer.**

3. **Forgetting OLTP contention.**

4. **Brand loyalty.**""",
   line="""I start in Postgres when the corpus is small and I already run it. I move to a dedicated store when ANN ops, RAM, or QPS would dominate the primary. The chunk table stays the source of truth.""",
   kps=[
    "Small corpus, existing Postgres → pgvector.",
    "ANN/RAM/QPS dominate → dedicated store.",
    "Say a number (n) in the answer.",
    "Chunk table remains source of truth.",
    "Mention filters and rebuild.",
    "No brand war.",
   ],
   qs=[
    {"q": "How do you choose pgvector vs a dedicated vector store?", "a": "Start in Postgres if n is small and you already operate it. Move when ANN memory, build time, or QPS would hurt the OLTP primary. Keep a chunk table either way.", "kind": "recall"},
    {"q": "A candidate says 'Qdrant is industry standard'. What is missing?", "a": "n, ops, and the existing stack. Industry is not a size. Ask them for a number and who pages the store.", "kind": "debug"},
    {"q": "20k wiki chunks, one Postgres. What do you pick?", "a": "pgvector unless a constraint forbids it. Dedicated store is overhead. Revisit at 10× n or if ANN builds hurt writes.", "kind": "apply"},
    {"q": "20M vectors next to payments tables. What do you pick?", "a": "Dedicated store or a search replica — not the payments primary. ANN RAM and builds do not belong beside checkout.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Start in Postgres if the corpus is small; move when ANN ops dominate.", "kind": "recall"},
   ],
   links=[PGV, QDRANT],
   review="Hear a number and an ops reason. If they only name a favourite brand, fail the talking point.",
  ),
 }
}
