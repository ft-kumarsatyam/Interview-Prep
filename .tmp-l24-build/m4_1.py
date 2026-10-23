from helper import note, LI_HOME, HF_EMBED

NOTES = {
 "m4-1": {
  "extracting-from-pdfs-html-docx": note(
   what="""RAG quality starts **before embeddings**. You must turn files into text the retriever can stand on. **PDF** is a page-layout format: glyphs on a canvas. Reading order, columns, tables, and headers must be reconstructed. Scanned PDFs have **no text** and need **OCR**. **HTML** has real structure (headings, lists, tables) but is polluted with nav, cookies, footers, and scripts — extract main content. **DOCX** is zipped XML with styles; headings and lists survive if you read style names instead of flattening.

A two-column PDF extracted line-by-line interleaves sentences that never existed. The embedding then represents nonsense. Always spot-check a sample of real documents and keep page, URL, and title as metadata.""",
   why="""On the job, 'the model is dumb' is often bad extraction. Interviewers will ask why PDF is harder than DOCX. They want layout vs structured XML, and OCR for scans. They will ding 'we just parsed text'. Take-homes that skip a sample inspection look junior.""",
   how="""Pick three real files: a two-column paper, a wiki HTML export, a styled DOCX. Run your extractor. Read the output. Example. The paper's abstract is intact; page 4 interleaves columns — you switch to a layout-aware tool. The wiki keeps the article and drops the sidebar. The DOCX keeps Heading 1.

Record extractor name and version on the document row so you can re-run when you change tools. Tables: if they flatten to gibberish, store an image or a CSV sidecar and mark `table=true`.""",
   fails="""1. **Naive PDF line order** on columns.

2. **HTML with nav repeated** in every chunk.

3. **Skipping OCR** on image-only PDFs and silently indexing empty pages.

4. **No sample inspection.** You trust the first ten files.""",
   line="""I extract with a tool that matches the format: layout or OCR for PDFs, main-content for HTML, styles for DOCX. I inspect real samples and I keep page and source metadata.""",
   kps=[
    "PDF is layout, not text; scans need OCR.",
    "HTML needs boilerplate removal; keep headings and lists.",
    "DOCX styles are structure — use them.",
    "Inspect real samples before you index the corpus.",
    "Store page, URL, title, extractor version.",
    "Tables often need a sidecar, not a flattened line.",
   ],
   qs=[
    {"q": "Why is PDF extraction harder than DOCX?", "a": "PDF stores positioned glyphs for drawing. Reading order, columns, and tables are inferred. Scans have no text and need OCR. DOCX is XML with paragraph styles, so headings and lists are explicit.", "kind": "recall"},
    {"q": "Answers mix two unrelated topics from one page. What failed?", "a": "A two-column PDF was read across columns. Use a layout-aware extractor, re-index, and verify those pages. The embedding cannot fix invented sentences.", "kind": "debug"},
    {"q": "What do you strip and keep from a company wiki HTML export?", "a": "Strip nav, footers, cookies, scripts. Keep headings, lists, tables, code, and metadata (URL, title, modified). Headings drive later chunking and citations.", "kind": "apply"},
    {"q": "A folder of 'PDFs' is all scans. What do you add?", "a": "An OCR path, an acceptance sample (word error on a page), and the knowledge that tables will degrade. Do not pretend born-digital extraction will work.", "kind": "apply"},
    {"q": "Why store extractor version on the document?", "a": "So you can re-extract when the tool changes and compare loss. Without it you cannot tell a corpus change from a parser change.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see a before/after on a two-column page. If they never opened the extracted text, the pipeline is untrusted. Ask how scans are detected.",
  ),
  "cleaning-while-keeping-structure": note(
   what="""Cleaning is not `text.strip()`. You **normalise** whitespace, hyphenated line breaks, encoding, and repeated headers/footers, while **keeping structure** that chunking and citations need: headings, lists, tables, code blocks, and metadata (title, section path, page). If you flatten to a bag of words you lose the only signals that later let you chunk by section or cite a heading.

Useful structure belongs in **metadata** and in lightweight markup you will not embed as noise. A header repeated on every page should be stripped from the body and stored once as `doc_title`. A list should stay a list.

Cleaning is also where you drop secrets (keys, PAN-looking numbers) before they enter the index.""",
   why="""On the job, over-cleaning deletes the H2 that would have made a perfect chunk boundary. Under-cleaning leaves 'Page 4 of 40' in every chunk and tanks embeddings. Interviewers will ask what you keep. They want headings and metadata, not a purity spiral.""",
   how="""Write a cleaner with tests on fixtures: a page with a running header, a hyphenated `inter-\nnational`, a `<h2>`, a bullet list. Example. You lift `Acme Policy v3` into `doc_title`, join hyphenated breaks, keep `## 2. Refunds`, drop the page number from the body, store `page=12`.

Do not run a general 'summarise to clean' LLM over the corpus unless you have a loss metric. Deterministic rules you can test beat a silent rewrite.""",
   fails="""1. **Flatten everything.** Chunking later has no headings.

2. **Leaving running headers** in every page chunk.

3. **LLM-rewrite as cleaning** with no diff.

4. **Not stripping secrets** before index.""",
   line="""I clean noise — headers, hyphen breaks, boilerplate — and I keep headings, lists, and metadata. Structure is for chunking and citations, not decoration.""",
   kps=[
    "Strip repeated headers/footers; keep headings and lists.",
    "Store title, section path, and page as metadata.",
    "Join hyphenated line breaks; normalise encoding.",
    "Do not flatten the document into a bag of words.",
    "Deterministic cleaners you can test beat silent LLM rewrites.",
    "Drop secrets before the text hits the index.",
   ],
   qs=[
    {"q": "What structure do you keep while cleaning, and why?", "a": "Headings, lists, tables, code, and metadata (title, section, page). Chunking and citations need them. Repeated headers and page numbers are noise and go to metadata or the bin.", "kind": "recall"},
    {"q": "Every chunk starts with Policy v3 | Page N. What do you change?", "a": "Detect the running header, store the title once, drop it from the body. Re-embed. The repeated prefix was poisoning similarity.", "kind": "debug"},
    {"q": "Why not ask a model to 'clean and rewrite' every document?", "a": "It can drop clauses, invent sentences, and you cannot diff loss cheaply. Use tested rules first. If you must rewrite, measure deletion of must-keep spans.", "kind": "apply"},
    {"q": "Where do secrets get removed?", "a": "In cleaning, before chunk/embed. An indexed API key is a leak you will retrieve into a prompt later.", "kind": "apply"},
    {"q": "What metadata do you attach at clean time?", "a": "Source URL or path, title, section path, page, language, extractor version, and last-modified if you have it. Chunking will inherit these.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what a heading looks like after clean. If it is gone, chunking will be blind. Ask for a fixture test on a running header.",
  ),
  "duplicates-updates-re-indexing": note(
   what="""Corpora are not write-once. You will see **duplicate files** (the same policy emailed twice), **updates** (v3 replaces v2), and **deletes**. The index must **upsert by a stable document id**, not append forever. Duplicates waste retrieval slots and confuse citations. Stale versions answer yesterday's question with last year's rule.

Incremental re-index means: hash or version the source, re-extract only what changed, delete or **tombstone** removed ids, and rebuild ANN structures as the engine requires. A weekly full rebuild is acceptable for small corpora; at scale it is how you run stale for six days.

Identity is the design: `id = source_system + native_id` (or a canonical URL), not the file name the intern chose.""",
   why="""On the job, 'why do we cite two slightly different refund policies?' is a duplicate/version bug. Interviewers will ask how you update a document. They want upsert, version, and delete — not 'we re-embed the folder'. They will ding an append-only index.""",
   how="""Document row: `{doc_id, version, content_hash, source, updated_at}`. On ingest: if hash unchanged, skip; if id exists and hash changed, replace chunks for that id; if source says deleted, remove chunks and tombstone. Example. Policy URL `/refund` updates. You replace chunks for `doc:wiki:refund`, you do not add `refund (1).pdf` as a sibling.

Near-duplicates (same text, different URL): decide a canonical id or you will retrieve both. Simhash or exact-hash on normalised text helps.""",
   fails="""1. **Append-only.** v1 and v3 both retrieve.

2. **Id = file name.** `Policy (2).pdf` is a new doc forever.

3. **No delete path.** Removed pages still answer.

4. **Full rebuild only**, never incremental, so updates wait a week.""",
   line="""I upsert by a stable document id, I skip unchanged hashes, I replace chunks on update, and I tombstone deletes. Append-only indexes are how you cite last year's policy.""",
   kps=[
    "Stable doc id from the source system, not the file name.",
    "Upsert on change; skip unchanged hashes.",
    "Replace chunks for an id; do not append a sibling.",
    "Tombstone or delete removals.",
    "Near-duplicates need a canonical id.",
    "Incremental ingest for anything that is not tiny.",
   ],
   qs=[
    {"q": "How do you handle an updated document in a vector index?", "a": "Detect change via hash or version, replace that doc_id's chunks, re-embed, and update the ANN structure as required. Do not append a second copy.", "kind": "recall"},
    {"q": "Users get two refund answers that disagree by a year. What is wrong?", "a": "v1 was never removed or the id was the file name so v3 became a sibling. Upsert by canonical id and delete the old chunks.", "kind": "debug"},
    {"q": "What is a tombstone here?", "a": "A delete marker so retrieval and incremental jobs know the id is gone, even if a replica or cache still holds vectors until compaction.", "kind": "apply"},
    {"q": "When is a weekly full rebuild acceptable?", "a": "When the corpus is small and a week of staleness is allowed. Otherwise incremental ingest plus a delete path. Do not pretend a weekly job is live.", "kind": "apply"},
    {"q": "Why not use the file name as the document id?", "a": "Names change (copy, download, Policy (2).pdf). Native ids or canonical URLs stay stable across updates.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what the doc_id is. If it is the file name, reject. Ask to see an update and a delete in the pipeline, not only an insert.",
  ),
  "ocr-vs-born-digital-text": note(
   what="""**Born-digital** PDFs contain a text layer: extraction can recover characters (still with layout issues). **Scanned** PDFs are pictures of pages: you need **OCR** (and often layout analysis). OCR **drops or mangles tables**, confuses columns, and introduces word errors. You will not get DOCX-like structure from a scan. Detect which kind you have (text layer density, or a flag from the scanner) and route accordingly.

Saying 'we extract PDFs' without this split is how empty pages enter the index. Measuring OCR quality on a labelled page (word error rate, table survival) is part of ingest, not a nice-to-have.""",
   why="""Interviewers will ask when OCR is required. The answer is: when there is no usable text layer. On the job, mixed folders (half scans) are the default in enterprises. A single extractor for both is a silent quality hole.""",
   how="""Heuristic: if extracted text length / page is below a threshold, OCR that page. Example. A 40-page policy: pages 1–30 born-digital, 31–40 are signed scans. You OCR 31–40, you mark `ocr=true`, you accept that the signature table is unreliable, and you may store the image for a human.

Do not OCR born-digital by default: you pay latency and you can add errors. Do not skip OCR on scans: you index nothing.""",
   fails="""1. **One path for all PDFs.**

2. **OCR on already-good text** (cost and new errors).

3. **Trusting OCR tables** as facts.

4. **No `ocr` flag** so you cannot explain a bad cite.""",
   line="""Scanned PDFs need OCR and will drop tables; born-digital keeps a text layer but still needs layout. I detect which I have and I mark OCR pages in metadata.""",
   kps=[
    "OCR is for pages without a usable text layer.",
    "Born-digital still needs layout reconstruction.",
    "OCR mangles tables; do not treat them as facts.",
    "Detect per page; mixed documents are common.",
    "Flag ocr=true on those chunks.",
    "Measure word error on a sample; do not assume.",
   ],
   qs=[
    {"q": "When is OCR required for a PDF?", "a": "When the page has no usable text layer — a scan or an image. Born-digital pages should use the text layer plus layout, not OCR by default.", "kind": "recall"},
    {"q": "Half the corpus retrieves as empty. What do you check?", "a": "Whether those PDFs are scans with no text layer. Route them through OCR, flag them, and re-index. A born-digital extractor will silently yield nothing.", "kind": "debug"},
    {"q": "Why might you still not trust a number from an OCR'd table?", "a": "OCR table reconstruction is weak. Prefer a human or a structured source for figures. You can store the page image next to the chunk.", "kind": "apply"},
    {"q": "How do you detect a mixed PDF?", "a": "Per-page text density (or a producer flag). OCR only the poor pages. Mark metadata so retrieval and evals can slice on ocr=true.", "kind": "apply"},
    {"q": "Should you OCR a born-digital text layer 'to be safe'?", "a": "No. You add cost and new errors. Use the text layer; reserve OCR for pages that need it.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask how they detect scans. If the answer is we OCR everything, they are wasting money and adding errors. Ask what happens to tables.",
  ),
  "preserving-headings-and-lists": note(
   what="""**Headings and lists** are the cheapest structure you will ever get. They tell chunking where a section starts and they tell citations what to show ('§2 Refunds'). If you flatten them, recursive splitters have nothing to respect and users see a wall of text. Keep heading text and level in metadata (`section_path: Policy > Refunds > Exceptions`) and keep list items as lines under that heading.

This is why you paid for a decent extractor. Throwing the structure away in the next function is a common own-goal.

Code blocks and tables are the siblings: do not split a list item from its heading if you can keep them in one parent.""",
   why="""Interviewers will ask how chunking knows about sections. The answer starts here, in ingest. On the job, a corpus with `section_path` is a joy; a flattened corpus is a year of 'why is this chunk mid-sentence'.""",
   how="""After extract, a tree: `H1 / H2 / p / ul`. Serialise as markdown-ish text plus metadata. Example. `## 2. Refunds` stays, bullets stay, `section_path=['Refunds']` on those chunks. A later structural chunker splits on H2.

Test: a fixture with two H2s must produce two section_paths, not one blob. If the extractor lost styles, fix extract — do not invent headings with an LLM unless you measure.""",
   fails="""1. **`.get_text()`** that drops tags.

2. **Headings only in the first chunk** of a long section, children have none.

3. **Invented headings** that do not exist in the source.

4. **Lists joined into a paragraph** so items become one sentence.""",
   line="""I keep headings and lists in the body and in section_path metadata so chunking can respect sections and citations can name them. Flattening is how I throw away ingest work.""",
   kps=[
    "Headings and lists are chunking and citation signals.",
    "Store section_path on every chunk in the section.",
    "Do not flatten tags in the first convenience function.",
    "Keep list items as items under their heading.",
    "Fix lost styles at extract time, not with guessed headings.",
    "Propagate the heading to child chunks, not only the first.",
   ],
   qs=[
    {"q": "Why preserve headings and lists through ingest?", "a": "So chunking can split on sections and citations can show a heading. Flattened text loses the only cheap structure most corpora have.", "kind": "recall"},
    {"q": "Long-section child chunks have no heading. What did you forget?", "a": "To copy section_path (and maybe a heading prefix) onto every chunk in the section, not only the first. Retrieval of a middle chunk otherwise has no title.", "kind": "debug"},
    {"q": "How do you serialise a heading-plus-list for later chunking?", "a": "Keep a markdown-like heading, keep bullets as lines, and set section_path metadata. A structural splitter can then cut on the heading.", "kind": "apply"},
    {"q": "When would you generate headings with a model?", "a": "Only if the source has none and you measure that invented titles help retrieval — and you mark them machine-added so you do not cite them as the author's.", "kind": "apply"},
    {"q": "What is section_path for?", "a": "A breadcrumb (Policy > Refunds > Exceptions) stored on the chunk for filters, citations, and parent-child retrieval.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see section_path on a middle chunk. If only the first chunk of a section has the heading, the metadata is wrong. Ask what flattened get_text would have destroyed.",
  ),
  "incremental-ingest-and-deletes": note(
   what="""**Incremental ingest** re-processes **changed** documents only. **Deletes** remove or tombstone their chunks so they cannot retrieve. Together they keep the index **fresh** without a nightly full rebuild. You need a change feed or a crawl with `updated_at`/`content_hash`, a queue, and an idempotent worker that upserts by `doc_id`.

Deletes are the part teams skip. A page taken down for legal reasons that still answers in the bot is an incident. Tombstones also stop a replica from resurrecting a vector after a partial deploy.

Measure freshness: p95 time from source change to searchable. That is an ingest SLO, not an embedding footnote.""",
   why="""Interviewers will ask how you re-index. They want incremental + delete, not 'we drop and rebuild'. On the job, rebuild-only is why policy changes take a week and why legal deletes fail.""",
   how="""Worker: pull change `{id, op: upsert|delete, hash}`. Upsert: extract/clean/chunk/embed/swap chunks in a transaction-like sequence (write new, flip pointer, delete old). Delete: remove vectors and mark tombstone.

Example. Legal unpublishes `/old-promo`. Within the SLO, that id is gone from search. A full rebuild on Sunday is a backstop, not the path.

If the engine cannot delete cheaply, schedule compaction and hide tombstoned ids at query time.""",
   fails="""1. **No delete.** Legal still retrieves.

2. **Rebuild as the only path.** Freshness is a week.

3. **Non-idempotent workers** that double-insert on retry.

4. **Flip pointer before new chunks exist.** A gap where the doc vanishes then reappears.""",
   line="""I re-index only changed documents and I tombstone removals. Freshness is an SLO. A weekly rebuild is a backstop, not the delete path.""",
   kps=[
    "Incremental: hash or updated_at, upsert by doc_id.",
    "Deletes are first-class; tombstone if the engine is slow to compact.",
    "Idempotent workers; retries must not duplicate.",
    "Write new chunks, then flip, then drop old — avoid a gap.",
    "Measure time from source change to searchable.",
    "Full rebuild is a backstop.",
   ],
   qs=[
    {"q": "What does incremental ingest do that a full rebuild does not?", "a": "It processes only changed ids so freshness is hours or minutes, not a week. It still needs a delete/tombstone path for removals.", "kind": "recall"},
    {"q": "Legal unpublished a page; the bot still cites it. What is missing?", "a": "A delete path. Add tombstone/remove on unpublish, hide those ids at query, and measure the SLO. Do not wait for Sunday's rebuild.", "kind": "debug"},
    {"q": "How do you avoid a gap during an update?", "a": "Write the new chunks, atomically point the doc at them, then delete the old ones. Do not delete first.", "kind": "apply"},
    {"q": "A worker retries and you now have two copies. What was missing?", "a": "Idempotency on doc_id: upsert, not insert. Retries are normal; duplicates are a bug.", "kind": "apply"},
    {"q": "What freshness number do you quote?", "a": "p95 time from source change (or delete) to the id being searchable or gone. That is the ingest SLO.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for the delete path and the freshness SLO. If ingest is insert-only plus a Sunday rebuild, legal deletes fail. Ask how a retry does not duplicate.",
  ),
  "interview": note(
   what="""**Interview: ingest a messy PDF corpus** is a spoken pipeline: **extract** (layout/OCR), **clean** (keep headings, drop headers), **dedupe/upsert**, and **measure loss** (sample pages, empty-page rate, table survival, freshness). You name metadata (page, section_path, ocr flag, doc_id). You do not start at embeddings.

This is M4.1's exam. They want the pipeline and the metrics, not a library name.""",
   why="""It is a common opener for RAG interviews because most corpora are PDFs. Candidates who jump to chunk size have not ingested. On the job this is also the first-week plan for a new corpus.""",
   how="""Say, in order:

1. Sample the folder: born-digital vs scan, columns, tables.
2. Extract with the matching tool; inspect pages.
3. Clean: headers out, headings in, secrets out.
4. Id = canonical URL or native id; upsert; delete path.
5. Measure: empty pages, OCR word error, duplicate rate, time-to-searchable.

Close: 'I would not embed until I have read twenty extracted pages.'""",
   fails="""1. **Starting at chunk size.**

2. **No OCR mention** on a scan-heavy corpus.

3. **No loss metric.**

4. **File name as id.**""",
   line="""Extract, clean, dedupe, measure loss. I inspect real pages, I upsert by a stable id, and I do not talk about embeddings until the text is trustworthy.""",
   kps=[
    "Speak extract → clean → upsert → measure, not embed first.",
    "Split OCR vs born-digital in the first minute.",
    "Name doc_id, section_path, and a delete path.",
    "Loss metrics: empty pages, OCR error, duplicates, freshness.",
    "Read extracted pages before you index.",
    "File name is not an id.",
   ],
   qs=[
    {"q": "Walk ingest of a messy PDF corpus in four steps.", "a": "Extract with layout or OCR as needed, clean while keeping headings, upsert/dedupe by a stable id with a delete path, and measure loss on samples (empty pages, OCR error, duplicates, freshness). Then, and only then, chunk and embed.", "kind": "recall"},
    {"q": "A candidate starts with chunk size 512. What did they skip?", "a": "Whether the text exists and is in reading order. Chunking garbage yields garbage. Inspect extraction first.", "kind": "debug"},
    {"q": "Which loss numbers do you quote?", "a": "Empty-page rate, OCR word error on a labelled page, duplicate rate, table survival if you need tables, and p95 time from change to searchable.", "kind": "apply"},
    {"q": "What identifiers and flags do you mention?", "a": "Canonical doc_id, section_path, page, ocr=true when applicable, extractor version. Not the file name.", "kind": "apply"},
    {"q": "What one sentence closes the answer?", "a": "I would not embed until I have read a sample of extracted pages and I can upsert and delete.", "kind": "recall"},
   ],
   links=[LI_HOME, HF_EMBED],
   review="Time the pipeline speech. If embeddings appear before extract/clean/id, they fail the talking point. Ask how they would measure loss on Monday.",
  ),
 }
}
