from helper import note, OA_EMBED, HF_EMBED, GEM_EMBED

NOTES = {
 "m4-3": {
  "what-an-embedding-represents": note(
   what="""An **embedding** is a **vector** that places a piece of text in a high-dimensional space so that **semantically related** pieces sit nearer than unrelated ones. 'Refund window' and 'how long to get my money back' should be closer than 'refund window' and 'office window hours'. The model that produces the vector was trained (contrastive or similar) so that a **distance or similarity** (usually cosine) approximates relatedness.

It is not a keyword index. It is not a knowledge store. It does not 'understand' in a legal sense. It is a geometric proxy you will retrieve with. Different models define different spaces; a number in one space is meaningless in another (later note).

The unit you embed (chunk, query, title) is the unit you will retrieve.""",
   why="""Interviewers will ask what an embedding is. They want geometry plus a caveat, not 'magic meaning numbers'. On the job, this sentence stops people from treating cosine as truth.""",
   how="""Show three sentences, two paraphrases and one pun. A decent embedder ranks the paraphrase above the pun. Example. Query 'close my account'. Near: 'how to terminate membership'. Far: 'bank account numbers format'. If your model ranks the pun first, the space is wrong for the job — or the chunk is.

Do not explain training maths unless asked. Explain the use: embed chunks at ingest, embed the query at ask, rank by similarity.""",
   fails="""1. **Calling it a knowledge base.** It cannot cite a fact it was not given.

2. **Treating cosine 0.82 as proof.**

3. **Embedding whole books** as one point.

4. **Mixing models** (next notes).""",
   line="""An embedding is a vector that puts related text nearby in one model's space. I use it as a retrieval proxy, not as a knowledge store or a proof.""",
   kps=[
    "Embeddings are vectors; nearby ≈ related in that model's space.",
    "They are not keyword indexes or knowledge bases.",
    "The embedded unit is the retrieved unit.",
    "Cosine is a proxy, not proof.",
    "Spaces are model-specific.",
    "Paraphrases should beat puns on a smoke test.",
   ],
   qs=[
    {"q": "What does a text embedding represent?", "a": "A vector in a model-specific space where semantically related texts tend to lie nearer than unrelated ones. It is a retrieval proxy, not a knowledge store or a proof of truth.", "kind": "recall"},
    {"q": "Cosine 0.9 between a query and a chunk. Are they the same fact?", "a": "Not necessarily. They are nearby in that space. The chunk can still be outdated, off-entity, or a pun. You still cite and check.", "kind": "debug"},
    {"q": "What unit should you embed for RAG?", "a": "The chunk you will retrieve (and maybe a title or query prefix). Embedding a whole book averages topics and cannot retrieve a paragraph.", "kind": "apply"},
    {"q": "How would you smoke-test an embedder on day one?", "a": "Three sentences: two paraphrases and one lexical pun. The paraphrase should rank first. If the pun wins, the space is a bad fit or the prefix is wrong.", "kind": "apply"},
    {"q": "Why is 'the embedding knows our policy' a wrong sentence?", "a": "The vector does not store the policy. The chunk text does. The embedding only helps you find the chunk.", "kind": "recall"},
   ],
   links=[OA_EMBED, HF_EMBED],
   review="Hear geometry plus caveat. If they say the embedding knows the answer, correct them. Ask what unit they embed.",
  ),
  "generating-embeddings": note(
   what="""You **generate** embeddings by sending text to an **embedding model** (API or local) and storing the returned vector with the chunk id. **Documents** are embedded at ingest (batch, offline). **Queries** are embedded at ask time (online, small). Use the **same model and version** for both, with any required **prefix** (next notes). Persist the vector, the model id, and the dim.

Batch the ingest side. Cap payload sizes. Retry 429s with a bound. Do not embed in a request path that the user is waiting on except for the query vector.

Never log the raw text next to the vector unless policy allows; the vector can still leak information, but the text is the obvious PII.""",
   why="""This is the mechanical skill. Interviewers want: same model for query and doc, batch ingest, store model id. On the job, embedding with two models is the classic silent recall crash.""",
   how="""Ingest job: chunks → batch embed → write `{chunk_id, vector, model, dim}`. Query: one embed, search. Example. 50k chunks, 100 per batch, semaphore 4, store `text-embedding-3-large` and 3072. A later switch of model is a full re-embed, not a config flip.

Pin the snapshot. An alias that changes under you mixes spaces.""",
   fails="""1. **Different models** for query and doc.

2. **Not storing model id.** You cannot re-embed.

3. **Live-embedding the corpus** on each ask.

4. **Unbounded batch** that 429s the key.""",
   line="""I embed documents at ingest in bounded batches and the query at ask time, with the same pinned model, and I store the model id and dim next to the vector.""",
   kps=[
    "Same model and version for queries and documents.",
    "Batch ingest; embed the query online.",
    "Store vector, model id, and dimension.",
    "A model change is a full re-embed.",
    "Bound the ingest job like any other LLM/API call.",
    "Pin the snapshot; aliases mix spaces.",
   ],
   qs=[
    {"q": "When do you embed documents versus queries?", "a": "Documents at ingest, in bounded batches, stored with the vector. Queries at ask time, one vector per search. Both must use the same pinned model.", "kind": "recall"},
    {"q": "Recall collapsed after a 'model upgrade'. What happened?", "a": "Query and docs are in different spaces, or only one side was re-embedded. Re-embed the corpus with the new id or roll back the query model.", "kind": "debug"},
    {"q": "What do you persist next to each vector?", "a": "chunk_id, model id, dimension, and the text pointer. Without the model id you cannot know if a later query is in the same space.", "kind": "apply"},
    {"q": "Why not embed the whole corpus on each question?", "a": "Cost and latency. Ingest once, search many times. Only the query vector is online.", "kind": "apply"},
    {"q": "Why pin the embedding snapshot?", "a": "An alias can change the space under you. Cosine against old vectors becomes noise. Pin and re-embed on purpose.", "kind": "recall"},
   ],
   links=[OA_EMBED, GEM_EMBED],
   review="Ask which model embeds the query. If it can drift from the corpus, reject. Ask where the model id is stored.",
  ),
  "choosing-an-embedding-model": note(
   what="""You choose on **quality for your language and domain**, **dimensions** (storage and ANN), **cost**, **latency**, and **licence**. Multilingual corpora need a multilingual model. Legal or medical jargon may want a domain model or a larger general one with good evals. Higher dimensions are not automatically better; they cost RAM and can hurt some ANN settings. Latency matters for the query embed (user is waiting). Cost matters for ingest of millions of chunks.

Do not pick from a leaderboard alone. Run **your** 50–200 queries. A 1-point MTEB win can lose on your tickets.

Open vs API is the Level 11 path question applied to embedders: data boundary vs convenience.""",
   why="""Interviewers will ask how you pick. They want eval-on-your-data plus the practical axes, not a brand. On the job, swapping embedders is a re-index — so pick with a reason.""",
   how="""Shortlist two models. Embed a labelled mini-corpus. Compare recall@k, p95 query embed latency, storage (n × dim × 4 bytes), and price. Example. API large vs local small: large wins 4 recall points, adds 80ms and a data-boundary review. You pick from the constraint, not the leaderboard.

Revisit when the corpus language or the SLA changes.""",
   fails="""1. **Leaderboard only.**

2. **Biggest dim** as a proxy for quality.

3. **Ignoring query latency.**

4. **Picking a monolingual model** for a two-language corpus.""",
   line="""I pick an embedder from my eval, language, dim/storage, cost, and latency — not from a leaderboard screenshot. A swap is a re-index, so I write the reason.""",
   kps=[
    "Eval on your queries, not only MTEB.",
    "Axes: quality, dim/storage, cost, latency, licence, language.",
    "Higher dim is not automatically better.",
    "Query embed is on the user path.",
    "A swap means re-embedding the corpus.",
    "Monolingual models fail mixed-language corpora.",
   ],
   qs=[
    {"q": "What axes do you use to choose an embedding model?", "a": "Quality on your labelled queries, language/domain fit, dimensions and storage, query latency, ingest cost, and licence/data boundary. Not a leaderboard alone.", "kind": "recall"},
    {"q": "A larger-dim model wins MTEB but loses on your tickets. Which do you ship?", "a": "The one that wins on your tickets, unless a constraint (on-prem, cost) forbids it. Leaderboards are a shortlist, not a decision.", "kind": "debug"},
    {"q": "Why does query latency matter more than ingest latency?", "a": "The user is waiting on the query embed plus search. Ingest is a batch job. A 300ms embedder can dominate p95.", "kind": "apply"},
    {"q": "You must stay in-VPC. How does that change the pick?", "a": "You shortlist open or privately hosted models you can run, then eval those. A public API winner that leaves the boundary is ineligible.", "kind": "apply"},
    {"q": "Why is a swap expensive?", "a": "Every chunk must be re-embedded and the ANN rebuilt. You do not flip a config. Budget it.", "kind": "recall"},
   ],
   links=[OA_EMBED, HF_EMBED, GEM_EMBED],
   review="Ask for their last eval, not a leaderboard. Ask dim, language, and whether a swap was priced as a re-index.",
  ),
  "vector-spaces-cannot-be-mixed": note(
   what="""Vectors from **different models** live in **different spaces**. Dimensions may even match by accident; the axes still mean different things. **Cosine across models is meaningless.** You cannot store model A's chunks and query with model B. You cannot average them. You cannot build one ANN from mixed rows.

If you change model, **re-embed everything** and rebuild the index. If you must run two models (migration), you run **two indexes** and you never join scores across them without a calibrated fusion you have measured.

This is the interview line: 'why you cannot mix spaces'.""",
   why="""The classic production bug: someone 'upgrades' the query embedder. Recall dies. Interviewers will ask why. They want this sentence. On the job, store the model id so the bug is visible.""",
   how="""Guard: the query path reads `index.model_id` and embeds with that id, or it refuses. Example. Nightly job writes `3-large` vectors; a new service embeds queries with `minilm`. Scores are noise. You fail the query or you dual-run.

Migration: build index B, dual-query, compare, flip, delete A. Do not write B's vectors into A's table.""",
   fails="""1. **Query model ≠ index model.**

2. **Concatenating 1536 and 384** with padding.

3. **One table, two models**, no column.

4. **Averaging scores** from two spaces.""",
   line="""Different embedders rotate the space. Cosine across models is meaningless. I pin one model per index and I re-embed the corpus when I change it.""",
   kps=[
    "One model per index; query and docs match.",
    "Equal dimension does not mean the same space.",
    "A model change is a full re-embed and rebuild.",
    "Two models means two indexes, not mixed rows.",
    "Store model_id and refuse a mismatch.",
    "This is a favourite interview line.",
   ],
   qs=[
    {"q": "Why can you not mix embeddings from two models?", "a": "They define different vector spaces. Cosine (or L2) between them is not a semantic score, even if the dimensions match. Re-embed or run separate indexes.", "kind": "recall"},
    {"q": "Recall died after a query-model upgrade. The dim is the same. What is wrong?", "a": "Same dim, different space. Point the query at the old model or re-embed the corpus. Do not 'tune k'.", "kind": "debug"},
    {"q": "How do you migrate embedders without an outage?", "a": "Build a second index, dual-query, compare recall, flip traffic, then delete the old index. Never write both models into one table.", "kind": "apply"},
    {"q": "What guard do you put on the query path?", "a": "Read the index's model_id and embed with that id, or refuse. Log a mismatch as an error, not as a search.", "kind": "apply"},
    {"q": "Does matching dimension make spaces compatible?", "a": "No. The axes are different. Dimension is storage, not identity.", "kind": "recall"},
   ],
   links=[OA_EMBED, HF_EMBED],
   review="Hear 'meaningless cosine'. If they think dim match is enough, fail. Ask how the query path knows the model id.",
  ),
  "instruction-tuned-vs-raw-embedding-models": note(
   what="""Some embedders are **instruction-tuned** or **asymmetric**: they expect a **query prefix** (`query: ...`) and a **document prefix** (`passage: ...`), or only a query instruction. Using the same raw string on both sides, or swapping prefixes, **tanks recall**. Raw / symmetric models (older sentence-transformers style) want the same treatment on both sides.

Read the model card. If it says 'use `query:` for searches', that is not decoration. Store the prefix policy next to the model id. Apply it in one function so ingest and query cannot drift.

HyDE and query rewrite still need the correct prefix on the **text you actually embed**.""",
   why="""This is a silent killer after a model swap to e5/BGE/GTE-style models. Interviewers who have shipped these will ask. On the job, a missing `query:` is a 10-point recall hole that looks like a chunking bug.""",
   how="""`embed(text, role)` adds the prefix from a table `{model, query_prefix, doc_prefix}`. Example. e5: docs `passage: {chunk}`, queries `query: {q}`. A teammate embeds both raw; recall drops; you diff the function and restore prefixes.

Test: a fixture asserts the exact bytes sent to the model for a query vs a doc.""",
   fails="""1. **Ignoring the card.**

2. **Prefix on docs only** or queries only.

3. **Two copies** of the prefix string that drift.

4. **Applying a query prefix to passages.**""",
   line="""Instruction-tuned embedders expect a query prefix; mismatch tanks recall. I store the policy with the model id and I apply it in one function.""",
   kps=[
    "Some models need query vs passage prefixes.",
    "Mismatch looks like a chunking bug and is not.",
    "One function applies the policy for ingest and query.",
    "Read the model card; store the policy.",
    "Symmetric models want the same treatment both sides.",
    "Assert the bytes in a test.",
   ],
   qs=[
    {"q": "What is an instruction-tuned or asymmetric embedder?", "a": "A model that expects different prefixes or instructions for queries versus documents. Using raw text on both sides, or the wrong prefix, collapses recall.", "kind": "recall"},
    {"q": "You switched to e5 and recall fell 12 points. Chunks are unchanged. What do you check?", "a": "Query and passage prefixes. If both sides are raw, or swapped, restore the card's prefixes. Do not retune chunk size first.", "kind": "debug"},
    {"q": "How do you keep prefixes from drifting?", "a": "A single embed(text, role) that reads policy from the model id, plus a test on the exact bytes. No second copy in the query service.", "kind": "apply"},
    {"q": "Do all embedders need prefixes?", "a": "No. Many symmetric models do not. The card decides. Applying e5 prefixes to a model that does not want them can also hurt.", "kind": "apply"},
    {"q": "Where does HyDE fit?", "a": "You embed the hypothetical document (or the rewrite) with the **document** or **query** prefix the card says for that role — the role of the string you embed, not the user's original sentence.", "kind": "recall"},
   ],
   links=[HF_EMBED, OA_EMBED],
   review="Ask what bytes go to the embedder for a query. If they never mention a prefix on a model that needs one, they will ship a recall hole. Ask for the test.",
  ),
  "dimensionality-and-storage-cost": note(
   what="""**Dimension** is the length of the vector. **Storage** is roughly `n_vectors × dim × bytes_per_value` plus ANN overhead (HNSW graphs can be several times the raw vectors). Higher dim can help quality and always costs **RAM**, disk, and often **latency**. It is **not automatic quality**. A 3072-d model that wins 0.5 recall points and costs 4× RAM may lose on a laptop-sized box or a small pgvector node.

Quantisation (int8, binary) trades quality for RAM. Matryoshka / shorter prefixes trade quality for dim. Measure both.

Plan capacity before you pick 'the biggest embedder'.""",
   why="""Interviewers will ask why you did not pick the largest dim. They want this cost model. On the job, RAM is why teams stay on 384–768 or quantise.""",
   how="""Compute: 5e6 chunks × 1536 × 4 bytes ≈ 30 GB raw, plus HNSW (often 2–3×). Example. You cannot fit that on a 16 GB app box. You pick 768-d, or quantise, or a dedicated store. A 0.8-point recall win is not worth an OOM.

Re-eval after quantisation; do not assume the card's quality holds on your queries.""",
   fails="""1. **Biggest dim** as default.

2. **Forgetting ANN overhead.**

3. **Quantising without an eval.**

4. **n × dim in a spreadsheet that ignores replicas.**""",
   line="""Higher dimensions cost RAM and are not automatic quality. I price n × dim × overhead, I quantise only after an eval, and I refuse a 0.5-point win that OOMs the box.""",
   kps=[
    "Storage ≈ n × dim × bytes plus ANN overhead.",
    "Higher dim ≠ automatic quality.",
    "Query latency and RAM matter as much as MTEB.",
    "Quantise or shorten only after your eval.",
    "Count replicas and indexes, not one copy.",
    "A small recall win can lose on capacity.",
   ],
   qs=[
    {"q": "How do you estimate embedding storage?", "a": "n_vectors × dimensions × bytes per value, plus ANN graph overhead (often multiple times the raw vectors), times replicas. That number gates the model pick.", "kind": "recall"},
    {"q": "A 3072-d model wins 0.4 recall and OOMs pgvector. What do you do?", "a": "Pick a smaller dim or quantise, re-eval, or move to a store that fits. Do not keep the OOM for a fraction of a point.", "kind": "debug"},
    {"q": "Why can ANN quality get worse as dim grows?", "a": "High-d spaces are harder to index; HNSW/IVF knobs that worked at 384 may need more memory or lose recall at 3072. Measure, do not assume.", "kind": "apply"},
    {"q": "When is int8 quantisation acceptable?", "a": "When your eval says recall holds (or the loss is worth the RAM) and you have tested the engine's quantised path. Not as a silent default.", "kind": "apply"},
    {"q": "What do people forget in the spreadsheet?", "a": "Graph overhead, replicas, a second index during migration, and the query embedder's RAM if it is local.", "kind": "recall"},
   ],
   links=[OA_EMBED, HF_EMBED],
   review="Ask them to compute n × dim for their corpus. If they never mention ANN overhead, the estimate is low. Ask whether the biggest dim was a default.",
  ),
  "interview": note(
   what="""**Interview: why you cannot mix spaces** is one sentence plus a consequence: **different embedders define different geometries; cosine across them is meaningless; a model change is a full re-embed**. You mention the query/doc prefix and the stored model id if they give you time.

This is M4.3's exam. It is short on purpose. Do not wander into training maths.""",
   why="""It is the most common embedding interview question after 'what is an embedding?'. On the job it is also the incident review when someone upgraded a query model.""",
   how="""Say: 'I pin one model per index. Query and documents use that id. If I change the model I rebuild. Cosine between two models is noise even when the dimensions match.' If they poke: prefixes, two indexes during migration, a guard that refuses a mismatch.

Close: 'Different embedders rotate the space; cosine across models is meaningless.'""",
   fails="""1. **Talking about training** instead of the operational rule.

2. **Saying dim match is enough.**

3. **No re-embed** in the consequence.

4. **Forgetting query vs doc.**""",
   line="""Different embedders rotate the space. Cosine across models is meaningless. I pin one model, I match query and docs, and I re-embed when I change it.""",
   kps=[
    "One sentence: different spaces, meaningless cosine, full re-embed.",
    "Dim match is not compatibility.",
    "Mention the query/doc guard if they give you time.",
    "Do not lecture training maths.",
    "Migration is two indexes, not mixed rows.",
    "This is the M4.3 talking point.",
   ],
   qs=[
    {"q": "Why can you not mix embedding spaces? Give the interview line.", "a": "Each embedder defines its own geometry. Cosine across models is meaningless, even if dimensions match. Changing a model means re-embedding the corpus and rebuilding the index.", "kind": "recall"},
    {"q": "They say both models output 768 numbers so it should be fine. Your reply?", "a": "Dimension is length, not meaning. The axes differ. I would refuse the query or dual-run two indexes, not cosine mixed rows.", "kind": "apply"},
    {"q": "What operational habit makes this real?", "a": "Store model_id on the index and refuse a query embedder that does not match. Without the guard the bug is silent.", "kind": "apply"},
    {"q": "A candidate explains contrastive loss for three minutes. What did they miss?", "a": "The operational rule and the incident. Interviewers wanted pin, match, re-embed — not a paper.", "kind": "debug"},
    {"q": "What one sentence should they remember?", "a": "Different embedders rotate the space; cosine across models is meaningless.", "kind": "recall"},
   ],
   links=[OA_EMBED, HF_EMBED],
   review="Time the sentence. If they cannot say it in fifteen seconds, they do not have the talking point. If they start a paper, stop them and ask for the guard.",
  ),
 }
}
