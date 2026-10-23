from helper import note, LI_HOME, OA_EMBED

NOTES = {
 "m4-2": {
  "why-documents-must-be-split": note(
   what="""Embedding models and context windows have **limits**. A 80-page policy cannot be one vector and cannot be one prompt. **Chunking** splits text into pieces you embed and retrieve. The piece must be small enough to embed well and to fit several of them in the generator's window, and large enough to be understandable without its siblings.

You split because **retrieval is nearest-neighbour on chunks**, not on documents. A document-level vector averages away the refund paragraph you needed. You also split because updates and citations are chunk-grained: you replace and cite a span, not a book.

Splitting is a product decision (what the user will see) as well as a model-limit decision.""",
   why="""Interviewers will ask why we chunk. They want limits plus retrieval granularity, not 'because the tutorial did'. On the job, refusing to split (one vector per PDF) is how you retrieve the wrong chapter.""",
   how="""Show the numbers. Model useful length ~8k tokens; you want 3–8 chunks in the prompt; each chunk 200–800 tokens is a common starting band. A 40k-token manual becomes ~80 chunks, not 1. Example. Query 'late fee'. A doc-level vector ranks a whole credit-card agreement; a chunk-level vector ranks the late-fee section.

Keep the parent doc_id so you can expand context later (parent-child).""",
   fails="""1. **One vector per PDF.**

2. **Chunks larger than the window** so one result fills the prompt.

3. **Chunks so small** they are single sentences with no meaning.

4. **Forgetting parent id** so you cannot expand.""",
   line="""I split so retrieval can find a span the embedder can represent and the generator can afford. Documents are too big and too mixed to be one vector.""",
   kps=[
    "Windows and embedders have length limits.",
    "Retrieval is over chunks, not whole documents.",
    "A doc-level vector averages away the paragraph you need.",
    "Chunk size must leave room for several hits in the prompt.",
    "Keep parent doc_id for expansion and citations.",
    "Splitting is a product choice, not only a model limit.",
   ],
   qs=[
    {"q": "Why must documents usually be split before embedding?", "a": "Embedders and prompts have length limits, and retrieval is nearest-neighbour on the unit you embed. A whole-document vector averages mixed topics and cannot fit beside other evidence.", "kind": "recall"},
    {"q": "You embedded each PDF as one vector and late-fee questions miss. Why?", "a": "The late-fee paragraph was averaged with 40 pages of other terms. Chunk so that section is its own vector, and keep the parent id.", "kind": "debug"},
    {"q": "How do window limits affect chunk size?", "a": "You need several chunks in the generator prompt. If one chunk is the whole window, you cannot add neighbours or a question. Start from a band that leaves room for k>1.", "kind": "apply"},
    {"q": "What do you store besides the chunk text?", "a": "doc_id, chunk_id, section_path, page, offsets, and any parent id. You will cite and re-expand with those, not with hope.", "kind": "apply"},
    {"q": "Is chunking only about token limits?", "a": "No. It is also retrieval granularity and citation span. Even a huge-context model still wants a precise retrieved span.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_EMBED],
   review="Ask why they chunk. If they only say the model has a limit, add retrieval granularity. Ask what happens with one vector per PDF.",
  ),
  "fixed-recursive-structural-semantic": note(
   what="""Four families you should be able to name. **Fixed-size**: every N tokens, simple, ignores meaning. **Recursive**: split on headings, then paragraphs, then sentences, then tokens until under a cap — the usual default. **Structural**: use the document tree (H2, table, function) as the unit. **Semantic**: split where topic similarity drops. Real systems mix: structural or recursive first, semantic only if an eval says so.

Fixed is a baseline. Recursive is the workhorse. Structural wins on manuals and code. Semantic is costlier and can drift. Do not start with semantic because it sounds smart.""",
   why="""Interviewers will ask you to compare chunkers. They want this list and a default (recursive/structural). On the job, picking semantic first is how you spend a week for a 1-point lift.""",
   how="""Start recursive with heading separators. Example. Policy markdown: split on `##`, then `###`, then paragraphs to stay under 600 tokens. Code: split on function boundaries (structural). A novel: fixed or recursive on paragraphs. Semantic: only after recall@k is measured and you have a reason boundaries are wrong.

Keep the same metadata regardless of family.""",
   fails="""1. **Semantic first** with no baseline.

2. **Fixed-size through tables and functions.**

3. **Recursive with no heading separators** (it is just fixed).

4. **A different family per file type** with no note in the pipeline.""",
   line="""I can name fixed, recursive, structural, and semantic. I start recursive or structural, I treat fixed as a baseline, and I add semantic only if an eval asks for it.""",
   kps=[
    "Fixed, recursive, structural, semantic — know all four.",
    "Recursive/structural is the usual default.",
    "Fixed is a baseline, not a destination for structured docs.",
    "Semantic is extra cost; measure first.",
    "Match family to file type (code ≠ prose).",
    "Metadata stays the same across families.",
   ],
   qs=[
    {"q": "Name four chunking families and the usual default.", "a": "Fixed-size, recursive, structural, and semantic. Default is recursive (or structural when you have a tree). Fixed is a baseline. Semantic is later and measured.", "kind": "recall"},
    {"q": "A teammate starts with semantic chunking on day one. What do you do?", "a": "Ship recursive/structural, measure recall, then try semantic as an A/B. Semantic first is unearned cost and a harder pipeline.", "kind": "debug"},
    {"q": "How do you chunk a markdown policy versus a source file?", "a": "Policy: recursive on headings then paragraphs. Source: structural on functions or classes so you do not split a function mid-body.", "kind": "apply"},
    {"q": "When is fixed-size acceptable?", "a": "As a baseline, or on messy text with no headings. It will split tables and sentences; accept that and compare to recursive on an eval.", "kind": "apply"},
    {"q": "What makes 'recursive' actually recursive?", "a": "A separator list from coarse to fine (heading, paragraph, sentence, token) applied until the piece fits the cap. One separator is just a split.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask them to name four families. If they only know fixed, they are not ready. Ask which they ship first and why.",
  ),
  "size-overlap-boundaries-metadata": note(
   what="""Four knobs. **Size**: tokens (or characters) per chunk — trade precision vs context. **Overlap**: repeated tail/head so a sentence that sat on a boundary still appears whole. **Boundaries**: prefer heading/paragraph/sentence ends; do not cut mid-table or mid-function. **Metadata**: inherit doc_id, section, page; you will filter and cite with it.

These knobs affect **retrieval quality** more than people expect. Too big: mixed topics, one hit fills the window. Too small: no meaning, you retrieve a clause without the exception. Overlap too high: near-duplicate hits waste k. Overlap zero: boundary sentences vanish.

Start from the embedder's useful length, not from a blog's 512.""",
   why="""This is the most-asked chunking interview. They want the four knobs and how each hurts. On the job, these are the first A/Bs after ingest works.""",
   how="""Pick a starting band (e.g. 400–800 tokens, 10–15% overlap, split on headings). Example. 800 tokens, 80 overlap, markdown headers. Eval recall@5. If questions need a heading plus a far exception, grow size or add parent-child. If k is full of twins, drop overlap or diversify.

Never tune size without an eval set. 'It looks nicer' is not a knob change.""",
   fails="""1. **Size from a tweet**, not the embedder.

2. **50% overlap** and k full of dupes.

3. **Cut mid-table** because the counter said 512.

4. **Metadata dropped** at split time.""",
   line="""I set size from the embedder and the prompt budget, I overlap just enough to save boundary sentences, I split on real boundaries, and I inherit metadata. I change knobs only against recall.""",
   kps=[
    "Size, overlap, boundaries, metadata — four knobs.",
    "Start from embedder length and prompt budget.",
    "Overlap saves boundary sentences; too much wastes k.",
    "Respect tables, functions, and headings.",
    "Inherit metadata onto every child chunk.",
    "Tune with recall, not vibes.",
   ],
   qs=[
    {"q": "What four chunking knobs do you name, and what does each risk?", "a": "Size (too big mixes topics; too small lacks meaning), overlap (too much duplicates; too little drops boundary sentences), boundaries (mid-table/function cuts), metadata (lost cites and filters).", "kind": "recall"},
    {"q": "k=5 is three near-copies of the same paragraph. What knob do you touch?", "a": "Overlap is probably high, or the splitter is emitting sliding windows. Reduce overlap and/or add diversity. Do not just raise k.", "kind": "debug"},
    {"q": "How do you pick a starting size?", "a": "From the embedder's useful length and how many chunks you want in the generator window (k times size plus question). Then measure recall and adjust.", "kind": "apply"},
    {"q": "A table is split across two chunks mid-row. What do you change?", "a": "Boundary rules: keep the table (or row) intact, even if you exceed size a bit, or store the table as a sibling unit. Do not obey the token counter blindly.", "kind": "apply"},
    {"q": "What metadata must survive the split?", "a": "doc_id, chunk_id, section_path, page, offsets, parent id. Without them you cannot cite or parent-expand.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_EMBED],
   review="Ask for the four knobs and one failure each. If they only say 512, they have not designed. Ask how metadata is copied.",
  ),
  "precise-chunks-vs-context-rich-chunks": note(
   what="""**Small precise chunks** retrieve the right sentence and starve the generator of surrounding rules. **Large context-rich chunks** give the generator enough to answer and retrieve mixed or off-topic text. This is a **trade-off**, not a virtue contest. The usual synthesis is **small to retrieve, large to generate**: parent-child or small-to-big (next note).

If you can only have one size, pick from the failure you have. Missing the clause → smaller. Answers that ignore an exception two paragraphs away → larger or parent expansion.

Do not grow chunks to hide a bad embedder. Measure both retrieval hit rate and answer faithfulness.""",
   why="""Interviewers will force a pick. The senior move is to name the trade-off and the two-level pattern. On the job, this is the conversation you have after the first eval.""",
   how="""Eval two sizes on the same questions. Example. 200-token chunks: high retrieval precision, answers miss the exception. 1200-token: retrieval noisier, answers complete. You keep 200 for search and send the 1200 parent to the model (parent-child). If you cannot implement two-level yet, pick 500–700 as a compromise and log the misses.""",
   fails="""1. **Always tiny** because 'precision'.

2. **Always huge** because 'context'.

3. **No eval**, only taste.

4. **Growing size to paper over a bad query.**""",
   line="""Small chunks retrieve; large chunks explain. I name the trade-off and I prefer retrieve-small, generate-large when I can. One size is a compromise I measure.""",
   kps=[
    "Precision vs context is a trade-off.",
    "Retrieve small, generate large is the usual synthesis.",
    "Pick the single size from the failure you have.",
    "Measure hit rate and faithfulness, not only one.",
    "Do not grow chunks to hide a bad embedder or query.",
    "Parent-child is how you stop choosing only one.",
   ],
   qs=[
    {"q": "What is the trade-off between small and large chunks?", "a": "Small chunks retrieve the right span but starve the generator of nearby exceptions. Large chunks feed context but mix topics and waste the window. Name both, then prefer two-level if you can.", "kind": "recall"},
    {"q": "Retrieval is accurate but answers miss a nearby exception. What do you change?", "a": "Expand to the parent section at generate time, or grow the chunk slightly. Do not only raise k with more tiny twins.", "kind": "debug"},
    {"q": "When would you keep a single medium size?", "a": "When you cannot ship two-level yet and an eval shows 500–700 tokens is good enough on both hit rate and faithfulness. Log the misses for a later parent-child.", "kind": "apply"},
    {"q": "Why not always use the largest chunk the embedder allows?", "a": "You mix topics, you retrieve the wrong chapter, and one hit fills the generator. Large is for generation after a precise retrieve, not always for the index unit.", "kind": "apply"},
    {"q": "Which two metrics settle the trade-off?", "a": "Retrieval hit/recall of the needed span, and answer faithfulness/completeness. Tuning only one will lie.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear the trade-off and the two-level escape. If they pick a religion (always 128 or always 2048), push for the failure-driven pick.",
  ),
  "parent-child-and-small-to-big": note(
   what="""**Parent-child** (small-to-big) stores a **small child** you retrieve and a **larger parent** you send to the generator. The child is a paragraph or a heading-sized span; the parent is the section or a window around it. You get precise retrieval and context-rich generation without stuffing the index with huge vectors that mix topics.

Implementation: two ids, `parent_id` on the child, a lookup at query time after top-k children (dedupe parents). Do not send eight children that all expand to the same parent — you waste the window.

This is the standard answer to the previous trade-off.""",
   why="""Interviewers treat parent-child as a seniority tell. On the job it is the first serious chunking upgrade after recursive split. It also makes citations nicer (cite the child span, show the parent).""",
   how="""Index children (~200–400 tokens). Store parents (~800–1500 or the H2 section). Query: embed the question, retrieve 8 children, map to unique parents (cap 3–4), send those. Example. Child hits the late-fee sentence; parent is §4 Fees. The model sees the exception two paragraphs down.

Dedup is mandatory. Eight children in one section become one parent.""",
   fails="""1. **No dedup.** Window is one section eight times.

2. **Parent too big** (the whole PDF).

3. **Child too big** (you lost precision).

4. **Citing the parent** when the span was the child — or the reverse without a quote.""",
   line="""I retrieve a small child and send its parent for context. I dedupe parents so k does not collapse to one section, and I cite the span I actually used.""",
   kps=[
    "Retrieve children; generate with parents.",
    "Dedupe children that share a parent.",
    "Parent is a section or window, not the whole doc.",
    "Cite the child span; the parent is context.",
    "This is the standard fix for the precision/context trade-off.",
    "Cap how many unique parents you send.",
   ],
   qs=[
    {"q": "What is parent-child (small-to-big) chunking?", "a": "Index and retrieve a small child span; at generate time send its larger parent section. You get precise retrieval and enough context without embedding huge mixed vectors.", "kind": "recall"},
    {"q": "Eight retrieved children expand to the same H2. What do you do?", "a": "Dedupe on parent_id and send that parent once. Otherwise the window is wasted on copies.", "kind": "debug"},
    {"q": "How large should the parent be?", "a": "The section or a modest window that contains the exception the child missed — not the entire document. If the parent is the PDF, you are back to doc-level context.", "kind": "apply"},
    {"q": "What do you cite?", "a": "The child span (quote plus id) that you retrieved. The parent is extra context, not a licence to cite a title you did not use.", "kind": "apply"},
    {"q": "Why not just embed the parents?", "a": "Large mixed vectors retrieve the wrong section. Children keep the index precise; parents are a generate-time lookup.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for the two ids and the dedup. If they embed only large chunks, they missed the pattern. Ask what they cite.",
  ),
  "table-and-code-block-boundaries": note(
   what="""**Never split a table row or a function mid-chunk** if you can avoid it. A half-row is not a fact; a half-function is not callable context. Treat tables, code blocks, and sometimes lists as **atomic units**: keep them together, even if you bust the size cap a bit, or store them as **sibling objects** (a CSV/json sidecar) with a pointer from the surrounding prose.

If a table is huge, split on **row groups** with the header repeated, not on a character count through a cell. If a function is huge, split on inner helpers, not mid-statement.

This is the boundary knob with teeth.""",
   why="""On the job, RAG that quotes half a pricing table is how you ship a wrong price. Interviewers will ask how you chunk tables and code. They want atomic units, not 512. This is a favourite follow-up after size/overlap.""",
   how="""Detector: markdown tables, HTML table elements, fenced code, `def `/`function `. Example. A 30-row fee table: one chunk with the header plus rows, or three chunks each with the **same header** + 10 rows. A 400-line file: one chunk per exported function.

If the embedder hates huge tables, embed a caption plus first rows and store the full table for generate-time fetch by id.""",
   fails="""1. **512 through a table.**

2. **Function split mid-if.**

3. **Dropping tables** because they were 'ugly'.

4. **Splitting rows without repeating the header.**""",
   line="""I treat tables and functions as atomic. I will bust a size cap before I cut a row or a statement, and I repeat headers when I must paginate a table.""",
   kps=[
    "Do not split table rows or functions mid-unit.",
    "Bust the size cap a little or store a sidecar.",
    "Paginate tables by row groups with the header repeated.",
    "Code splits on function/class, not on token count alone.",
    "Huge tables can be fetched by id at generate time.",
    "Dropping tables silently is a product bug if users ask about numbers.",
   ],
   qs=[
    {"q": "How should you chunk a markdown table?", "a": "Keep the table or each row-group intact, repeat the header if you paginate, and do not cut mid-row because a counter hit 512. Optionally store a structured sidecar and fetch by id.", "kind": "recall"},
    {"q": "A retrieved chunk is the second half of a function and the model invents the signature. What failed?", "a": "A token splitter cut the function. Use a structural split on function boundaries. Half a function is not context.", "kind": "debug"},
    {"q": "The fee table is 8k tokens. What do you do?", "a": "Do not embed the whole table as one mixed vector if you can avoid it. Chunk row groups with headers, or embed a caption and fetch the full table by id when that child hits.", "kind": "apply"},
    {"q": "Why repeat the header on each table slice?", "a": "So a retrieved slice still names the columns. A list of numbers without headers is not a fact.", "kind": "apply"},
    {"q": "When is dropping a table acceptable?", "a": "When users will never ask about those figures and you record the drop as loss. If they will ask, dropping is a bug — OCR/table tools are the fix.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what happens at token 512 inside a table. If they cut, reject. Ask how a function is split. Ask whether numbers have a sidecar.",
  ),
  "interview": note(
   what="""**Interview: pick a chunk size** is a method, not a number. **Start from the embedding model's useful length**, **measure recall**, then **adjust overlap** and boundaries. Mention parent-child if the trade-off appears. You do not say '512 because LangChain default'.

This is M4.2's exam. They want a starting band, an eval, and the next knob, in that order.""",
   why="""Every RAG interview asks this. Candidates who quote a default fail. Candidates who name embedder length, k, overlap, and recall pass. On the job this is also how you stop a bike-shed.""",
   how="""Say:

1. 'Useful embedder length and how many chunks I want in the prompt give a starting band (e.g. 400–800).'
2. 'Recursive/structural split, small overlap, keep tables/functions intact.'
3. 'Measure recall@k on a labelled set; then move size or overlap, or add parent-child.'
4. 'I would not pick a number without that loop.'

Close: 'Start from the embedder, measure recall, then adjust overlap.'""",
   fails="""1. **A single number with no method.**

2. **Forgetting overlap and boundaries.**

3. **No eval.**

4. **Ignoring the generator window** (k × size).""",
   line="""I pick a starting band from the embedder and the prompt budget, I split on real boundaries, I measure recall, then I adjust overlap or move to parent-child. I do not quote a framework default.""",
   kps=[
    "Method: embedder length → band → measure recall → adjust.",
    "Mention overlap and atomic tables/functions.",
    "k times size must fit the generator.",
    "Parent-child is the next move, not a random new size.",
    "Defaults are not a design.",
    "Say you would not pick a number without an eval.",
   ],
   qs=[
    {"q": "How do you pick a chunk size in an interview?", "a": "Start from the embedder's useful length and the number of chunks you want in the prompt, split on structure, measure recall@k, then adjust size/overlap or add parent-child. Do not quote a default.", "kind": "recall"},
    {"q": "A candidate says 512 because that is the tutorial. What is missing?", "a": "The embedder, the generator budget, boundaries, overlap, and an eval. 512 may be fine; the method is the grade.", "kind": "debug"},
    {"q": "What do you measure before you change size?", "a": "Recall (or hit rate) of the needed span, and a glance at duplicate rate in the top-k. Then change one knob.", "kind": "apply"},
    {"q": "When do you mention parent-child in this answer?", "a": "As soon as they ask about precision vs context, or when recall is fine but answers miss nearby exceptions.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Start from the embedding model's useful length, measure recall, then adjust overlap.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_EMBED],
   review="Hear a method, not a number. If 512 appears without an embedder or an eval, they fail. Ask what they change after a miss.",
  ),
 }
}
