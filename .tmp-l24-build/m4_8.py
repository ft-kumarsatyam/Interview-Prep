from helper import note, LI_HOME, LC_INTRO

NOTES = {
 "m4-8": {
  "the-core-rag-pipeline": note(
   what="""The **core RAG pipeline** is four verbs: **query → retrieve → assemble context → generate**. Query is the user turn (maybe rewritten later). Retrieve is lexical, dense, or hybrid over chunks. Assemble is the prompt: instructions, the evidence, the question. Generate is the LLM call that must stay inside that evidence.

Everything else (rerank, HyDE, graphs) is a variant of one of those verbs. If you cannot draw the four boxes, you are not talking about RAG yet.

The pipeline is only as strong as the weakest verb. A great generator cannot save empty retrieve.""",
   why="""Interviewers will ask you to draw RAG. Four boxes. On the job, this is the spine of the service.""",
   how="""Implement each verb as a function with a log. Example. `retrieve(q, filters) -> chunks`; `assemble(chunks, q) -> messages`; `generate(messages) -> answer+cites`. You can swap retrieve without touching generate.

Do not hide assemble inside the framework so you cannot print the context.""",
   fails="""1. **Skipping assemble** ('just dump chunks').

2. **No log** of retrieved ids.

3. **Generate without retrieve** and still calling it RAG.

4. **One giant function** you cannot test.""",
   line="""RAG is query, retrieve, assemble, generate. I can draw those four boxes and I can log the chunks that went into the prompt.""",
   kps=[
    "Four verbs: query, retrieve, assemble, generate.",
    "Variants decorate a verb; they do not replace the spine.",
    "The weakest verb bounds quality.",
    "Log retrieved ids at assemble time.",
    "Keep the verbs as separate, testable steps.",
    "Generate-without-retrieve is not RAG.",
   ],
   qs=[
    {"q": "What are the four steps of the core RAG pipeline?", "a": "Query, retrieve, assemble context, generate. Later tricks (rerank, rewrite) sit on top of those verbs.", "kind": "recall"},
    {"q": "A service embeds the question and immediately calls chat with no retrieved text. Is it RAG?", "a": "No. Retrieve and assemble are missing. That is a parametric answer with extra latency.", "kind": "debug"},
    {"q": "Where do you log in the pipeline?", "a": "At least the retrieved chunk ids and the assembled prompt size. Without that you cannot split retrieve vs generate failures.", "kind": "apply"},
    {"q": "Why keep the verbs separate?", "a": "You can unit-test retrieve, swap a reranker, and print assemble. A monolith is undebuggable in an incident.", "kind": "apply"},
    {"q": "Can a great prompt fix empty retrieve?", "a": "No. Assemble and generate cannot invent a missing span. Fix retrieve or abstain.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask them to draw four boxes. If they start with LangChain, pull them back to the verbs.",
  ),
  "what-rag-solves": note(
   what="""RAG solves **four jobs** the weights cannot: **private knowledge** (your docs), **frequently changing information** (policies, prices), **knowledge that does not fit in the context window**, and **source-grounded answers** (citations the user can open). It does not solve style, tone, or 'make the model smarter'.

If the fact is stable, public, and already in the model, you may not need RAG (next notes). If the fact is in a row of a database and the user wants that row, a query is better than a chunk.

Be precise in interviews: RAG is a **retrieval + generation** pattern, not a product category.""",
   why="""Interviewers will ask 'why RAG'. Four jobs. On the job, this is the go/no-go.""",
   how="""Map the use case. Example. Internal benefits policy that changes quarterly: RAG. 'Write a polite email': not RAG. 10k-page design history: RAG. 'What is 2+2': not RAG.

If they want sources, RAG (or a search UI). If they want a number from SQL, do not chunk the warehouse.""",
   fails="""1. **RAG for style.**

2. **RAG for a fact that is one SQL row.**

3. **RAG because the CEO heard the acronym.**

4. **Claiming RAG makes the model smarter.**""",
   line="""RAG is for private, changing, or huge knowledge and for answers that must cite a source. It is not a style tool and it is not a smarter model.""",
   kps=[
    "Private, changing, too-big, or must-cite: RAG's jobs.",
    "Style and closed facts are not RAG jobs.",
    "A database row wants a query, not a chunk.",
    "RAG is a pattern, not a product.",
    "It does not make the model generally smarter.",
    "Say which of the four jobs you are buying.",
   ],
   qs=[
    {"q": "What four problems does RAG actually solve?", "a": "Private knowledge, frequently changing facts, corpora too large for the window, and answers that must be source-grounded. Not style, not general intelligence.", "kind": "recall"},
    {"q": "A PM wants RAG so the bot sounds more confident. What do you say?", "a": "Confidence is not a retrieval problem. RAG will not fix tone. Ask which private or changing facts they need cited.", "kind": "debug"},
    {"q": "Inventory count lives in Postgres. RAG over a nightly dump?", "a": "No. Query the database. RAG on a dump will be stale and ungrounded the moment stock moves.", "kind": "apply"},
    {"q": "When is 'the corpus is huge' a real reason?", "a": "When the needed span will not fit with the question, even after selection. If it fits, stuff the window and skip retrieve.", "kind": "apply"},
    {"q": "Does RAG replace fine-tuning for style?", "a": "No. Style is parametric. RAG supplies facts. Mixing the two jobs in one pitch is a design smell.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear the four jobs. If they say smarter, correct them. Ask when they would skip RAG.",
  ),
  "when-not-to-use-rag": note(
   what="""**Do not use RAG** when **the model already knows enough**, the task is **purely transformational** (rewrite, summarise this paste, classify this email), or the **required knowledge already fits in the prompt**. Also skip when a **database query or API** is the real answer.

RAG adds retrieve latency, an index, and a new failure mode (wrong chunk). You pay that only when the four jobs from the last note apply.

'When not to' is an interview favourite and a budget saver.""",
   why="""They will ask this by name. On the job, this is how you avoid a six-month index for a style bot.""",
   how="""Checklist: is the knowledge private or changing? Must we cite? Does it overflow the window? If three nos, skip. Example. 'Make this PR description nicer': no RAG. 'What is our on-call policy this quarter': RAG. 'Current price of SKU 12': API/SQL.

If they insist, offer a prototype with the docs pasted once — that is the fit-in-context test.""",
   fails="""1. **RAG on a paste-and-rewrite** task.

2. **Indexing public trivia** the model knows.

3. **Chunking a table** that should be queried.

4. **No 'skip RAG' path** in the design.""",
   line="""I skip RAG when the model already knows, the task is transformational, the text fits, or a query/API is the real answer. Retrieve is a cost I have to justify.""",
   kps=[
    "Skip when knowledge is already in the model or the window.",
    "Transformational tasks do not need retrieve.",
    "A SQL/API answer is not a chunking problem.",
    "RAG adds latency and a miss mode — pay only if needed.",
    "Fit-in-context is a valid prototype.",
    "Have an explicit 'no RAG' design path.",
   ],
   qs=[
    {"q": "When would you not use RAG?", "a": "When the model already knows enough, the task is purely transformational, the needed text fits in context, or the real answer is a database/API query.", "kind": "recall"},
    {"q": "A team indexes Wikipedia to 'ground' a summariser of user-pasted articles. What is wrong?", "a": "The source is already in the prompt. Retrieve will add noise and latency. Summarise the paste.", "kind": "debug"},
    {"q": "Closed-book arithmetic tutor. RAG?", "a": "No. Stable public skill. Maybe tools for a calculator, not a document index.", "kind": "apply"},
    {"q": "How do you test 'it fits in context'?", "a": "Paste the corpus (or the needed subset) once and score. If quality is enough, you have not earned an index.", "kind": "apply"},
    {"q": "What cost do you name when you refuse RAG?", "a": "Retrieve latency, index ops, and a new failure mode (wrong or empty evidence). Those need a job that pays for them.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask for a no-RAG example. If they cannot skip, they do not understand the pattern.",
  ),
  "retrieval-failure-vs-generation-failure": note(
   what="""A wrong RAG answer is **one of two bugs**. **Retrieval failure**: the right span was never in the prompt (miss, filter, bad chunk). **Generation failure**: the span was there and the model ignored, contradicted, or over-reached it. You cannot fix one with the other's tools.

Always **log the assembled context**. Then you can say which failure you have. A fluent wrong answer is often a retrieve miss wearing a confident sentence.

This split is the debugging method for the whole level.""",
   why="""Interviewers will hand you a bad answer and wait. On the job, this is the first branch in the runbook.""",
   how="""Open the trace. Search the prompt for the gold span. Missing → retrieve (chunk, embed, k, filters, query). Present → generate (prompt, k dump, model). Example. Policy says 14 days; answer says 30; prompt has the 14-day chunk: generation. Prompt lacks it: retrieval.

Do not start with 'try a better model' on a missing span.""",
   fails="""1. **No prompt log.**

2. **Swapping the model** on a retrieve miss.

3. **Raising k** on a generate ignore.

4. **Calling every error hallucination** without the split.""",
   line="""I split retrieve vs generate by asking whether the gold span was in the prompt. I do not swap the model to fix a miss, and I do not raise k to fix an ignore.""",
   kps=[
    "Retrieve fail: span never in the prompt.",
    "Generate fail: span was there and was ignored or twisted.",
    "Log assembled context so you can split.",
    "Fluent-wrong is often a retrieve miss.",
    "Fix the side that broke; do not swap tools.",
    "This split is the level's debugger.",
   ],
   qs=[
    {"q": "How do you tell retrieval failure from generation failure?", "a": "Look at the assembled prompt. If the supporting span is absent, it is retrieval. If it is present and the answer still misses or contradicts it, it is generation.", "kind": "recall"},
    {"q": "The answer is fluent and wrong; you have no prompt log. What do you do first?", "a": "Add the log and reproduce. Guessing 'hallucination' without the span check wastes a week.", "kind": "debug"},
    {"q": "Gold span is in chunk 2 of 5 and the model ignores it. First lever?", "a": "Generation side: prompt ('answer only from sources'), ordering, fewer chunks, citations. Not a new embedder.", "kind": "apply"},
    {"q": "Gold span is not in the prompt. First lever?", "a": "Retrieve: query, chunking, k, filters, hybrid. Not a new chat model.", "kind": "apply"},
    {"q": "Why is fluent-wrong often retrieve?", "a": "The model will still write a sentence. Fluency is not evidence that the span was present.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hand them a wrong answer. If they do not ask for the prompt, they cannot debug RAG.",
  ),
  "fresh-facts-vs-parametric-memory": note(
   what="""**Parametric memory** is what the model **learned at train time** — style, general facts, language. **RAG** is for **fresh or private facts** that were not in that snapshot (or must be cited). Mixing the two in one sentence is how people invent a policy date.

Use the model for wording and structure. Use retrieve for the number, the date, the name, the clause. If a fact changes, you update the index, not the weights.

This is the 'RAG is not for style' point with a sharper name.""",
   why="""Interviewers will say parametric vs non-parametric memory. On the job, this is why you do not fine-tune last week's price list.""",
   how="""Rule: if it can change without a retrain, it is retrieve. Example. Tone of the bot: parametric (or a system prompt). Refund window this quarter: retrieve. Python syntax: parametric. Your internal API error table: retrieve.

Fine-tune for style or a stable format; RAG for the changing payload.""",
   fails="""1. **Fine-tuning weekly prices.**

2. **Trusting the model** for a date that lives in a doc.

3. **RAG for tone.**

4. **No 'as of' date** on retrieved facts.""",
   line="""Parametric memory is the snapshot in the weights. RAG is for facts that change or were never public. I do not fine-tune a price list.""",
   kps=[
    "Parametric = trained snapshot; RAG = fresh or private facts.",
    "If it can change without a retrain, retrieve it.",
    "Style and language stay parametric.",
    "Fine-tune format, not this week's numbers.",
    "Stamp retrieved facts with a source date when you can.",
    "Do not let the model invent a policy date.",
   ],
   qs=[
    {"q": "What is parametric memory versus RAG?", "a": "Parametric is what the weights already contain (style, stable public skill). RAG supplies changing or private facts at request time from an index.", "kind": "recall"},
    {"q": "A team fine-tunes every Monday on the new price CSV. What do you change?", "a": "Put prices in retrieve (or better, query the price API). Fine-tune is the wrong write-path for a weekly table.", "kind": "debug"},
    {"q": "Which of tone and refund-window is RAG?", "a": "Refund window. Tone is system prompt or a small style tune. Mixing them is a confused design.", "kind": "apply"},
    {"q": "Why stamp 'as of' on a retrieved fact?", "a": "So the user and the eval know which snapshot you used. Parametric answers have no such stamp and go stale silently.", "kind": "apply"},
    {"q": "Is RAG for making the model a better writer?", "a": "No. Writing is parametric. RAG is for the payload the writer must not invent.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what they would fine-tune vs retrieve. If prices are a tune, fail. Hear 'as of'.",
  ),
  "failure-split": note(
   what="""**Always measure both** retrieval and generation. A **fluent wrong answer is often a miss at retrieval**. Metrics: recall@k / nDCG on the retrieve side; groundedness / citation precision / answer correctness on the generate side. One number ('accuracy') hides the split.

If retrieve recall is 0.6, no prompt polishing will look like 0.95. If retrieve is 0.95 and answers still drift, the prompt or the model is the work.

This note is the operational twin of 'retrieval vs generation failure'.""",
   why="""Interviewers will ask what you measure. Two families. On the job, this is the dashboard.""",
   how="""Two panels. Retrieve: recall@5, empty-rate, filter-empty. Generate: unsupported-claim rate, abstain rate, judge score **given** the same context. Example. recall@5 = 0.58: stop tweaking temperature. Unsupported-claim = 12% with gold context: fix the prompt.

Never report a single 'RAG score' to a VP without the split.""",
   fails="""1. **One accuracy number.**

2. **Prompt work** on a 0.5 recall.

3. **Embedder work** on gold-context failures.

4. **No empty-rate.**""",
   line="""I always measure retrieve and generate separately. A fluent wrong answer is often a retrieve miss. I do not tune the side that is not broken.""",
   kps=[
    "Measure retrieve and generate as two families.",
    "Fluent-wrong is often a retrieve miss.",
    "Recall@k before prompt work.",
    "Groundedness given gold context before embedder work.",
    "Empty-rate is a first-class metric.",
    "Do not ship a single unexplained 'RAG score'.",
   ],
   qs=[
    {"q": "What do you measure on each side of RAG?", "a": "Retrieve: recall@k, nDCG, empty-rate. Generate: groundedness, citation precision, answer quality given the same context. Always both.", "kind": "recall"},
    {"q": "Overall accuracy is 0.7, recall@5 is 0.55. Where do you spend the week?", "a": "Retrieve: chunking, hybrid, query, filters. Prompt work cannot recover spans that never arrived.", "kind": "debug"},
    {"q": "Recall is 0.96 but unsupported claims are high. Where do you spend the week?", "a": "Generate: grounded prompt, citations, abstain, maybe a smaller k. Not a new embedder.", "kind": "apply"},
    {"q": "Why is empty-rate a metric?", "a": "Tight filters and bad queries fail closed. If you only look at scored answers you miss the abstain/empty path.", "kind": "apply"},
    {"q": "Why refuse a single RAG score?", "a": "It hides which verb broke. Leadership will fund the wrong team.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see the dashboard. If there is one number, ask them to split it. Ask about empty-rate.",
  ),
  "interview": note(
   what="""**Interview: when you would not use RAG** — **stable closed tasks**, or when a **database query is the real answer**. Add transformational tasks and fit-in-context. That is the talking point.

They are testing whether you can say no.""",
   why="""It is M4.8's exam. On the job it is also how you protect the roadmap from a bogus index.""",
   how="""Say: 'I would not use RAG for a closed-book skill the model already has, for rewrite-this-paste, or when the fact is a SQL/API row. I would use it for private or changing docs that must be cited or will not fit.'

If they offer Wikipedia-for-summarise: 'the article is already in the prompt.'""",
   fails="""1. **Always RAG.**

2. **Never RAG.**

3. **No SQL alternative.**

4. **No closed-task example.**""",
   line="""I skip RAG on stable closed tasks and when a database or API is the real answer. I use it for private or changing knowledge that must be cited or will not fit.""",
   kps=[
    "No RAG: closed stable tasks, transforms, fit-in-context, SQL/API.",
    "Yes RAG: private, changing, huge, must-cite.",
    "Saying no is the grade.",
    "Name one concrete skip and one concrete use.",
    "Do not index a warehouse dump to avoid SQL.",
    "Do not RAG a paste that is already the source.",
   ],
   qs=[
    {"q": "When would you not use RAG? Give the interview line.", "a": "Stable closed tasks, purely transformational work, text that already fits, or when a database/API query is the real answer.", "kind": "recall"},
    {"q": "A candidate indexes the orders table nightly for 'how many units shipped'. What is the fix?", "a": "That is a query, not RAG. Point them at SQL or an API. The dump will be stale and ungrounded.", "kind": "debug"},
    {"q": "Give one yes-RAG and one no-RAG in the same product.", "a": "Yes: this quarter's benefits PDF. No: 'shorten this email the user just pasted'. Same bot, two paths.", "kind": "apply"},
    {"q": "Why mention SQL in a RAG interview?", "a": "Because many 'knowledge' questions are lookups. RAG is the wrong retrieval mechanism for a row.", "kind": "apply"},
    {"q": "What are they really testing?", "a": "Whether you can refuse an index. Always-RAG is a junior tell.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hear a skip. If they cannot refuse RAG, they fail the talking point. Ask for the SQL case.",
  ),
 }
}
