from helper import note
from links import OA_RAG, GEM_LC, OA_PE, OA_PROD

L = [OA_RAG, GEM_LC]

NOTES = {
    "m9-2": {
        "where-knowledge-should-come-from": note(
            what="""Decide, per fact type, whether knowledge lives in the **model**, the **prompt**, **RAG**, **memory**, or a **tool / database**. Model knowledge is parametric, stale, and uncited. Prompt knowledge is small and always-on (the style guide, the output schema). RAG is large, changing, or private text you can cite and ACL. Memory is user- or session-specific state. Tools and DBs are live, authoritative values (order status, price, inventory).

The decision is a table, not a vibe. Current order status is a tool. The refund policy is RAG (or a snapshot). Tone is a prompt or a tune. The user's preferred language is memory. 'What is a vector database' can stay in the model.""",
            why="""Interviewers ask 'where does knowledge live' and expect this table. On the job, putting live prices in a tune or a 40-page policy in every prompt is how systems rot.""",
            how="""For each field: freshness SLA, size, ACL, need to cite, write rate. Example: order status — seconds-fresh, tiny, per-user, must be exact → `get_order`. Policy — weekly, 40 pages, company-wide, must cite → index. Brand voice — yearly, small → prompt or tune.""",
            fails="""1. **One store for everything.**

2. **Fine-tune for the CMS.**

3. **Memory as a junk drawer** of facts that should be retrieved.

4. **Model knowledge for regulated claims.**""",
            line="I place knowledge on purpose: model for stable generalities, prompt for small standing rules, RAG for large or changing documents, memory for per-user state, and tools for live authoritative values. I will not tune in this week's prices.",
            kps=[
                "Choose model, prompt, RAG, memory, or tool per fact type.",
                "Live authoritative values belong in tools or DBs.",
                "Changing or private documents belong in RAG.",
                "Small standing rules belong in the prompt.",
                "Memory is per-user state, not a second CMS.",
                "Write a table: freshness, size, ACL, cite, write rate.",
            ],
            qs=[
                {"q": "Which source is best for the current status of a customer's order?", "a": "A tool or database call at request time. Parametric memory and last week's index will be wrong. Cite the system of record.", "kind": "recall"},
                {"q": "Where should a 4k-token policy that is needed on every high-volume request live?", "a": "A short always-on summary in the prompt plus RAG for the full text, or a cached snapshot if it rarely changes. Not the raw 4k on every call if cost and latency hurt — measure.", "kind": "apply"},
                {"q": "Why is 'the model knows our product' a bad knowledge plan?", "a": "It cannot cite, cannot ACL, and goes stale. Product facts belong in a corpus or an API.", "kind": "debug"},
                {"q": "What belongs in memory versus RAG?", "a": "Memory: this user's preferences, open ticket id, last decision. RAG: shared documents. Do not dump the wiki into memory.", "kind": "recall"},
                {"q": "Interview: where knowledge lives — how do you close?", "a": "Prompt, index, database, or fine-tune — and why not the others, in one table.", "kind": "apply"},
            ],
            links=L,
            walk="""You draw four buckets on the board and place ten facts. Prices move to a tool; the policy to RAG; tone to the prompt. The tune proposal dies.""",
            measure="""Facts with a written home; incidents of stale parametric answers; prompt tokens spent on documents that should have been retrieved.""",
        ),
        "the-full-context-pipeline": note(
            what="""Design the pipeline as **ingestion → retrieval → reranking → context assembly → generation** (then validation). Ingestion: parse, chunk, ACL, embed, store provenance. Retrieval: hybrid search under a permission filter. Rerank: a cross-encoder or a small model on the shortlist. Assembly: budgets, wrapping data as data, citations ids. Generation: the model. Validation: schema, grounding, output guards.

Each stage has an owner, an SLA, and a way to fail closed. Skipping a stage is a decision (no rerank if n is tiny), not an accident.""",
            why="""This is the spine of RAG design interviews. On the job it is how you debug 'the answer was wrong' — which stage failed.""",
            how="""Trace one request: ingest job last ran at 02:00; retrieve returns 40 ids with tenant filter; rerank keeps 8; assembler spends 12k on quotes plus 2k rules; model streams; validator checks citations exist. If the answer is wrong, you look at whether the right span was retrieved before you blame the model.""",
            fails="""1. **No provenance** at ingest.

2. **Retrieve without ACL.**

3. **Assembler that concatenates until it truncates the rules.**

4. **No stage traces**, so you cannot see which step dropped the clause.""",
            line="I design ingestion, retrieval, rerank, assembly, and generation as separate stages with owners and traces. When an answer is wrong I ask which stage failed before I switch models.",
            kps=[
                "Ingest → retrieve → rerank → assemble → generate → validate.",
                "Each stage has an owner, an SLA, and a fail-closed story.",
                "Debug by stage, not by blaming the model first.",
                "Skipping rerank is a decision, not an accident.",
                "Assembly owns the token budget.",
                "Ingest owns ACL and provenance.",
            ],
            qs=[
                {"q": "Name the stages of a full context pipeline.", "a": "Ingestion, retrieval, reranking, context assembly, generation, and validation. Say what each owns.", "kind": "recall"},
                {"q": "An answer misses a clause that is in the PDF. Which stage do you inspect first?", "a": "Retrieval and ingest: was the span chunked, indexed, and returned? Then assembly: was it dropped for budget? Only then the model.", "kind": "apply"},
                {"q": "Why log which passages were included in each prompt?", "a": "To see whether a bad answer is a retrieve miss, an assembly drop, or a generate miss — and for audit.", "kind": "recall"},
                {"q": "What does fail-closed mean at ingest?", "a": "A document without an ACL or a parse error does not enter the index silently; it goes to a dead-letter queue.", "kind": "debug"},
                {"q": "When can you skip rerank?", "a": "When the candidate set is already tiny and high precision, or latency cannot afford it and eval shows no gain. Measure.", "kind": "apply"},
            ],
            links=L,
            walk="""A wrong refund answer traces to a chunker that split a table. You fix ingest, not the prompt. The pipeline diagram earns its keep.""",
            measure="""Per-stage traces; ingest dead-letter depth; retrieve-miss versus generate-miss rates on the eval set.""",
        ),
        "combining-retrieval-approaches": note(
            what="""**Vector, keyword, and graph** (and others) catch different queries. Dense vectors miss exact ids (`E4021`) and rare tokens. Keyword (BM25) misses paraphrase. Graph helps when the question is about relationships ('who owns the service that depends on X'). Combine when the eval says so, usually via **hybrid retrieve + fusion** (e.g. reciprocal rank fusion) then a rerank.

Do not combine because a slide had three logos. Each extra index has an ingest and an ACL story.""",
            why="""Interviewers will give you an error-code query that fails dense search. On the job, hybrid is the default for support corpora.""",
            how="""Start dense+keyword, fuse, rerank. Add graph when questions are multi-hop over entities you already model. Example: `E4021` is a keyword win; 'why was my refund denied like last time' may need the prior ticket id from memory plus policy RAG.""",
            fails="""1. **Dense only** on an id-heavy corpus.

2. **Three indexes, one ACL** implemented once and forgotten twice.

3. **Fusion without a rerank** when the lists are noisy.

4. **Graph for a flat FAQ.**""",
            line="I combine vector, keyword, and sometimes graph when the eval shows complementary misses — typically hybrid plus fusion plus rerank. I will not add an index that has no ACL story or no measured gain.",
            kps=[
                "Dense misses exact ids; keyword misses paraphrase.",
                "Hybrid plus fusion is the usual default.",
                "Graph is for relationship questions you already model.",
                "Every index needs ingest and ACL.",
                "RRF is a simple, strong fusion.",
                "Measure before adding a third logo.",
            ],
            qs=[
                {"q": "A query containing an error code 'E4021' fails in dense search. Most direct improvement?", "a": "Add keyword or hybrid retrieval so the exact token can match, then fuse and rerank. Do not start with a bigger embedding model.", "kind": "apply"},
                {"q": "Why is reciprocal rank fusion useful?", "a": "It combines ranked lists from different retrievers without tuning score scales. It is a strong, simple default.", "kind": "recall"},
                {"q": "When is a graph index worth it?", "a": "When questions traverse entities and relations you already maintain. A flat FAQ rarely needs it.", "kind": "apply"},
                {"q": "What goes wrong if only one of two indexes has the tenant filter?", "a": "The other becomes a leak. Hybrid multiplies ACL work.", "kind": "debug"},
                {"q": "How do you decide to add a second retriever?", "a": "Slice the eval misses. If a family is exact-match, add keyword. If not, do not.", "kind": "recall"},
            ],
            links=L,
            walk="""Misses cluster on SKUs and error codes. You add BM25, fuse with RRF, and the slice recovers 12 points. You do not add a graph.""",
            measure="""Recall by query family; indexes with ACL tests; fusion ablations.""",
        ),
        "freshness-access-control-provenance": note(
            what="""Three production properties of knowledge: **freshness** (how stale is allowed, who updates), **access control** (retrieval is a security boundary), and **provenance** (what span, which version). They belong in the architecture, not in a later 'ops' slide. Freshness is an SLA: policy weekly, orders seconds, web crawl daily. Access control is the mandatory filter. Provenance is ids and hashes in the prompt and the trace.

If any of the three is missing, you cannot safely scale the corpus.""",
            why="""This is the enterprise bar for RAG. Interviewers will ask all three in one breath.""",
            how="""Write SLAs next to each corpus. Policy: snapshot id in the card, rebuild on merge, TTL on chunks. Orders: no index, live tool. Access: session tenant on every query. Provenance: citation required to emit a policy claim.""",
            fails="""1. **Crawl with no freshness SLA.**

2. **ACL as a helper.**

3. **Answers with no source.**

4. **A snapshot dated in the UI, a different one in the index.**""",
            line="Freshness, access control, and provenance are architecture. I give each corpus an SLA, I filter before retrieve, and I keep ids and versions on every chunk and citation.",
            kps=[
                "Every corpus has a freshness SLA and an owner.",
                "Access control is a retrieve-time boundary.",
                "Provenance is id, version, hash, span.",
                "Live data should not go stale in an index.",
                "The UI snapshot date must match the index.",
                "You cannot scale a corpus that lacks these three.",
            ],
            qs=[
                {"q": "Where should per-user document permissions be enforced in a RAG system?", "a": "At retrieve time, in the query, with the principal from the session — before ANN or via filtered search. Not in the prompt.", "kind": "recall"},
                {"q": "Who updates the corpus and how stale is allowed?", "a": "Name an owner and an SLA per corpus: policy weekly with a snapshot id, orders live via a tool, crawl daily. Write it in the design.", "kind": "apply"},
                {"q": "A support copilot quotes an outdated refund policy after an update. Most direct fix?", "a": "Rebuild or invalidate that snapshot, bust caches, and show the snapshot date. Do not prompt the model to 'be current'.", "kind": "debug"},
                {"q": "Why is provenance part of this trio, not only UX?", "a": "You cannot takedown, erase, or defend a claim without it.", "kind": "recall"},
                {"q": "How do you keep the UI date honest?", "a": "The assembler injects the snapshot id from the same config the index uses. A test compares them.", "kind": "apply"},
            ],
            links=L,
            walk="""You add a `freshness.md` table and a CI test that HR retrieve uses the reviewed snapshot id. A stale-policy incident becomes a missed rebuild, not a mystery.""",
            measure="""Corpora with an SLA; ACL tests; citation rate; snapshot-id mismatches.""",
        ),
        "retrieved-dynamically-or-held-in-context": note(
            what="""Decide what is **always present** versus **retrieved on demand** versus **held in external state**. Always-present: role, output shape, current goal, the tool list for this task, a tiny policy summary. Retrieved: large or situational documents, old threads, code files. External state: order systems, shopping carts, the ticket — fetched by tool, not stuffed.

The class is a property of the content: how often needed, how large, how costly a miss. Small and almost always needed stays resident. Large or rare is retrieved. If a miss is catastrophic, keep a short always-present version and retrieve the rest.""",
            why="""This is context-budget architecture. Interviewers ask why you would not just dump the 4k policy every time.""",
            how="""High-volume bot: 400-token standing summary of policy + retrieve clauses. A rare legal-research route: retrieve more, accept latency. A 4k policy on every call of a 2 s p95 bot will lose on TTFT and cost — measure the curve.""",
            fails="""1. **Everything always-on** 'just in case'.

2. **Nothing always-on**, so the model forgets the output schema.

3. **Holding live state in the prompt** until it rots.""",
            line="I classify context as always-present, retrieved, or external state. Small, always-needed rules stay resident; large or rare documents are retrieved; live values are fetched. I do not dump a 4k policy on every high-volume call without measuring.",
            kps=[
                "Always-present, retrieved, or external state.",
                "Class by frequency, size, and cost of a miss.",
                "Keep a short always-on summary if a miss is catastrophic.",
                "Live state belongs in tools, not a rotting prompt.",
                "Measure TTFT and quality versus always-on size.",
                "The output schema stays resident.",
            ],
            qs=[
                {"q": "A 4k-token policy is needed on every request of a high-volume bot. Reasonable design?", "a": "A short always-present summary plus retrieval of the relevant clauses, or a cached snapshot if eval shows the full 4k is worth the TTFT. Measure; do not default to stuffing.", "kind": "apply"},
                {"q": "What should stay permanently in context?", "a": "Role, safety, output shape, current goal, this-task tools, and a tiny standing summary. Not the whole corpus.", "kind": "recall"},
                {"q": "Why is last week's cart in the prompt a bad 'held in context' choice?", "a": "It is live state. It will be wrong. Fetch it.", "kind": "debug"},
                {"q": "How do you treat a catastrophic-miss rule?", "a": "Keep a short always-on version and retrieve the full text. Do not rely on retrieval alone for the one sentence that forbids a refund class.", "kind": "apply"},
                {"q": "What is external state in this taxonomy?", "a": "Systems of record you call with tools: orders, inventory, tickets. Not an index and not the window.", "kind": "recall"},
            ],
            links=[GEM_LC, OA_PE],
            walk="""You cut the always-on policy from 4k to 400 tokens, retrieve the rest, and p95 drops 800 ms with no eval loss on the clause set.""",
            measure="""Always-on tokens; retrieve-miss on must-not-miss clauses; TTFT versus always-on size.""",
        ),
        "freshness-slas-on-knowledge": note(
            what="""**Who updates the corpus and how stale is allowed** is a written SLA, not a hope. Each corpus: owner, update trigger (merge, cron, event), maximum age, and what users see when it is stale (banner, refuse, degrade). Policy might be 'within 4 hours of merge'. Prices are 'not in the corpus'. Web crawl is '24 h, banner if older'.

Without an SLA, 'we have RAG' means 'we have a pile of unknown vintage'.""",
            why="""This is the ops contract that makes RAG believable. Interviewers ask who pages when the policy is old.""",
            how="""Table in the repo. Alerts when `now - snapshot.time > SLA`. The UI shows the snapshot time on policy answers. A missed rebuild is a page, not a user tweet.""",
            fails="""1. **No owner.**

2. **No banner** when stale.

3. **Mixing SLAs** in one index so you cannot expire one corpus.""",
            line="Every corpus has a freshness SLA: an owner, a trigger, a maximum age, and a user-visible stale behaviour. I page on a missed rebuild. 'We have RAG' is not a freshness story.",
            kps=[
                "Owner, trigger, max age, stale behaviour — per corpus.",
                "Show snapshot time on policy answers.",
                "Page when age exceeds the SLA.",
                "Do not mix unlike SLAs in one indistinguishable pile.",
                "Prices usually have no corpus SLA because they are live.",
                "A pile of unknown vintage is not knowledge architecture.",
            ],
            qs=[
                {"q": "What four fields are in a freshness SLA?", "a": "Owner, update trigger, maximum age, and what the user sees when stale.", "kind": "recall"},
                {"q": "How do users know a policy answer might be stale?", "a": "A snapshot timestamp and a banner or refuse when the SLA is breached. Do not hide it.", "kind": "apply"},
                {"q": "Two corpora in one index, 4-hour versus 7-day SLAs. What goes wrong?", "a": "You cannot expire or rebuild them independently. Split or tag so jobs can target one.", "kind": "debug"},
                {"q": "Who pages when the policy snapshot is 9 hours old on a 4-hour SLA?", "a": "The named owner. If there is no page, there is no SLA.", "kind": "apply"},
                {"q": "Why do prices often have no index SLA?", "a": "They should not be in the index. The SLA is on the pricing API instead.", "kind": "recall"},
            ],
            links=L,
            walk="""You add `snapshot_age_seconds` to the dashboard and a page at 4 h. The first page finds a broken webhook. That is the SLA working.""",
            measure="""SLA breaches; time-to-rebuild; UI answers missing a snapshot time.""",
        ),
        "access-control-as-architecture": note(
            what="""**Retrieval is a security boundary, not a helper.** This is the system-design restatement of Level 8's ACL rule. The retrieve box on the diagram has a lock. The query builder cannot be called without a principal. Caches inherit the key. Design reviews treat a missing lock like a missing auth on an HTTP route.

If someone says 'the model will not quote other tenants', the architecture is already wrong.""",
            why="""It is the sentence that keeps RAG out of a security incident. Interviewers listen for 'boundary', not 'we filter sometimes'.""",
            how="""Diagram: User → API (auth) → Retriever (mandatory tenant+ACL) → Assembler → Model. The lock is on Retriever. Tests: canary tenant, helper-omission test that will not compile or will throw.""",
            fails="""1. **Filter in the application after retrieve.**

2. **Optional helper.**

3. **Model-enforced ACL.**""",
            line="Retrieval is a security boundary. I put a lock on that box, I make the principal mandatory in the query builder, and I treat a missing filter like a missing auth check — not like a helper we forgot.",
            kps=[
                "Draw a lock on the retriever box.",
                "The query builder requires a principal.",
                "A missing filter is an auth bug.",
                "Caches inherit the boundary.",
                "The model is not the ACL.",
                "Helper-omission must not compile or must throw.",
            ],
            qs=[
                {"q": "Why call retrieval a security boundary rather than a helper?", "a": "Because crossing it with the wrong principal leaks documents into the prompt. That is the same class as a missing auth check on a route.", "kind": "recall"},
                {"q": "How do you make the filter unforgettable in code?", "a": "The client type requires a Tenant context; there is no unscoped query method. Tests try to omit it and fail to compile or throw.", "kind": "apply"},
                {"q": "A reviewer says the model is told not to quote other tenants. Your response?", "a": "That is not a boundary. Move the lock to retrieve time.", "kind": "debug"},
                {"q": "Where else must the boundary apply?", "a": "Response caches, memories, rerank batches, and admin search.", "kind": "apply"},
                {"q": "What does the lock look like on a whiteboard?", "a": "A padlock on the arrow into the index, labelled 'session tenant + ACL'.", "kind": "recall"},
            ],
            links=L,
            walk="""You delete `search(query)` and leave only `search(ctx, query)`. CI fails three call sites. That is architecture.""",
            measure="""Unscoped retrieve methods remaining; canary failures; cache keys without tenant.""",
        ),
        "interview": note(
            what="""**Interview: where knowledge lives** is a 60-second table: **prompt, index, database, or fine-tune — and why not the others.** Pick three facts from the prompt they gave you and place them. Then say freshness, ACL, and cite for each. That is the close of M9.2.

If you only say 'we will use RAG', you have not answered.""",
            why="""This is the question they actually ask. The table is the skill.""",
            how="""Spoken: 'Order status: database, because it is live and per-user. Policy: index, because it is shared, cited, and weekly. Tone: prompt, because it is small and stable. I would not fine-tune any of these. Freshness and ACL follow the home I chose.'""",
            fails="""1. **RAG for everything.**

2. **No 'why not the others'.**

3. **Forgetting ACL when you say index.**""",
            line="I answer where knowledge lives with a table: prompt, index, database, or fine-tune, and why not the others. Freshness, ACL, and citations follow the home I chose. 'We will use RAG' is not an answer.",
            kps=[
                "Place facts in prompt, index, DB, or tune.",
                "Always say why not the others.",
                "Attach freshness, ACL, and cite to each row.",
                "'We will use RAG' is incomplete.",
                "Live per-user values are not index rows.",
                "Tone is rarely a tune in v1.",
            ],
            qs=[
                {"q": "What four homes do you name in the interview table?", "a": "Prompt, index (RAG), database or tool, and fine-tune — plus why the fact is not in the other three.", "kind": "recall"},
                {"q": "Place: order status, refund policy, brand tone.", "a": "DB/tool; index; prompt (or later a tune). Say freshness and ACL for the first two.", "kind": "apply"},
                {"q": "A candidate says 'RAG for all of it'. What is missing?", "a": "Live values, small standing rules, and the 'why not' column. Also ACL.", "kind": "debug"},
                {"q": "Why mention citations in this table?", "a": "Only some homes can cite. If the claim must be cited, it cannot live only in weights.", "kind": "recall"},
                {"q": "How long should the spoken table take?", "a": "About sixty seconds for three facts. Then offer to go deeper on one row.", "kind": "apply"},
            ],
            links=L,
            walk="""You write a 3×4 table in one minute and sit back. That is the item.""",
            measure="""Practice answers that include 'why not'; designs whose facts have a home.""",
        ),
    }
}
