from helper import note, LI_HOME, LC_INTRO

NOTES = {
 "m4-11": {
  "why-the-user-question-is-a-poor-query": note(
   what="""The **user's question is often a bad retrieval query**. It is underspecified ('it broke'), overloaded (two questions), conversational ('what about the other plan'), or full of pronouns. Embeddings and BM25 then search for the wrong thing.

A good retrieve query is **explicit, decontextualised, and term-rich**. That may take a rewrite. Not every question needs one (later notes).

This is why chat RAG cannot embed the last user sentence alone.""",
   why="""Interviewers will ask why rewrite exists. Poor queries. On the job, this is the first log you read on a miss.""",
   how="""Compare raw vs rewritten on a miss. Example. User: 'can I still return it?' Rewrite: 'What is the refund window for order 8891 placed 2026-03-01 under the EU consumer policy?' The second has terms the index can hit.

Also expand acronyms the user used and the docs used differently.""",
   fails="""1. **Embedding the last sentence** in a 10-turn chat.

2. **No rewrite** on pronoun-heavy questions.

3. **Rewriting everything**, including SKUs.

4. **Rewrite that drops the id.**""",
   line="""The user's question is often a poor query: pronouns, missing context, two intents. I rewrite when that is the miss, and I never embed the last sentence of a chat alone.""",
   kps=[
    "Users under-specify, stack questions, and use pronouns.",
    "A retrieve query should be explicit and term-rich.",
    "Chat RAG must include resolved context, not only the last line.",
    "Rewrite is a tool, not a default on every SKU.",
    "A rewrite that drops an id is a new bug.",
    "Read the raw query in the miss log first.",
   ],
   qs=[
    {"q": "Why is the user question often a poor retrieval query?", "a": "It may lack entities, use pronouns, hide context in prior turns, or ask two things. Lexical and dense search then miss the span a clearer query would hit.", "kind": "recall"},
    {"q": "A chat bot embeds only 'what about the other one?' and retrieves noise. What is missing?", "a": "Decontextualisation. The rewrite must name the product and the comparison from history. Do not first swap the embedder.", "kind": "debug"},
    {"q": "What does a good retrieve query look like?", "a": "Standalone, entity-rich, one intent, same vocabulary as the docs when you know it. Not a chat utterance.", "kind": "apply"},
    {"q": "When is the raw question already fine?", "a": "Exact ids, pasted error strings, or a well-formed standalone FAQ. Those can skip transform.", "kind": "apply"},
    {"q": "What must a rewrite never drop?", "a": "Identifiers, numbers, and quoted phrases. Those are the lexical channel's fuel.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see a raw vs rewritten pair. If they always embed the last chat line, they will miss.",
  ),
  "rewriting-expansion-multi-query-hyde": note(
   what="""Four transforms to name. **Rewriting**: make a standalone query. **Expansion**: add synonyms or doc-side terms. **Multi-query**: several complementary queries, retrieve each, fuse. **HyDE**: write a *hypothetical* answer, embed that, retrieve nearest to the hypothetical doc.

They cost extra LLM calls (later). They fail in different ways: expansion can drift, multi-query can explode k, HyDE can invent a world that is not in the corpus (precise queries).

You do not ship all four. You pick from the failure.""",
   why="""Interviewers will list these and wait. On the job, this is the toolbox, not the default stack.""",
   how="""Map failure → tool. Pronouns → rewrite. Vocab mismatch → expansion. Ambiguous/multi-facet → multi-query. Vague conceptual → maybe HyDE. Example. 'wifi issues laptop' → multi-query: driver, known outage, hardware FAQ.

Log which transform ran.""",
   fails="""1. **Stacking all four** on every request.

2. **HyDE on a SKU.**

3. **Expansion that adds antonyms.**

4. **No fuse** after multi-query (just concat 4×k).""",
   line="""Rewrite, expand, multi-query, and HyDE are different tools. I pick from the failure and I do not stack them by default.""",
   kps=[
    "Rewrite = standalone; expansion = extra terms.",
    "Multi-query = several retrieves plus a fuse.",
    "HyDE embeds a hypothetical document.",
    "Pick from the failure; do not stack all four.",
    "Each one is extra calls and a new drift mode.",
    "Log which transform ran.",
   ],
   qs=[
    {"q": "Name the four query transforms and one job each.", "a": "Rewrite: standalone query. Expansion: add terms. Multi-query: several queries plus fusion. HyDE: embed a hypothetical answer to retrieve similar docs.", "kind": "recall"},
    {"q": "You ran HyDE on 'error E-204' and retrieved a generic timeout essay. What happened?", "a": "The hypothetical doc drifted off the identifier. Skip HyDE on precise/id queries; use the raw string in BM25.", "kind": "debug"},
    {"q": "Which tool for a two-intent question?", "a": "Multi-query (or a rewrite that splits). One embedding of the mashed question will average the intents.", "kind": "apply"},
    {"q": "Which tool for 'it' and 'the other plan' in chat?", "a": "Rewrite with history resolved. Expansion will not restore the entity.", "kind": "apply"},
    {"q": "Must you fuse after multi-query?", "a": "Yes (RRF or similar). Concatenating 4×k without fusion dumps duplicates and blows the window.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Hear four tools and a pick-from-failure rule. If they enable all four, push cost and HyDE-on-ids.",
  ),
  "rag-fusion": note(
   what="""**RAG-Fusion** is **multi-query plus a rank merge**, usually **RRF**. Generate several queries from the user question, retrieve for each, fuse the lists, then assemble. It is query-side hybrid: several dense (or hybrid) lists instead of sparse+dense.

It helps on **ambiguous or multi-facet** questions. It costs **N retrieves plus a rewrite call**. It is not a new generator.

Name it correctly in interviews: fusion is of **rankings**, not of answers.""",
   why="""They will say RAG-Fusion and wait for RRF. On the job, this is a named pattern you should not mystify.""",
   how="""`qs = rewrite_multi(user)`; `lists = [retrieve(q) for q in qs]`; `fused = rrf(lists)`. Example. Three queries, 20 hits each, RRF to 20, then rerank or assemble.

Dedup by chunk id. Cap N (3 is a common start).""",
   fails="""1. **Fusing generated answers** instead of ranks.

2. **N=10** rewrite queries.

3. **No RRF**, just concat.

4. **Calling any rewrite** RAG-Fusion.""",
   line="""RAG-Fusion is multi-query retrieval merged with RRF. I fuse rankings, not answers, and I cap how many queries I spawn.""",
   kps=[
    "RAG-Fusion = several queries, retrieve each, RRF.",
    "Fusion is of rankings, not of answers.",
    "Helps ambiguous and multi-facet questions.",
    "Costs N retrieves plus a rewrite.",
    "Cap N; dedup by chunk id.",
    "Not a new generator.",
   ],
   qs=[
    {"q": "What is RAG-Fusion?", "a": "Generate multiple retrieval queries, retrieve for each, merge the ranked lists (usually RRF), then generate one answer. You fuse rankings, not answers.", "kind": "recall"},
    {"q": "A teammate averages three model answers and calls it RAG-Fusion. What is wrong?", "a": "That is answer ensembling. RAG-Fusion merges retrieval lists. Different cost, different failure mode.", "kind": "debug"},
    {"q": "How do you pick N?", "a": "Start at 3, measure recall vs extra latency. N=10 is usually a bill with diminishing ranks.", "kind": "apply"},
    {"q": "Why RRF here too?", "a": "The lists are not in the same score space (different queries). Ranks merge without calibration.", "kind": "apply"},
    {"q": "When is RAG-Fusion overkill?", "a": "Exact lookups and already-clear questions. Skip transform (later notes).", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what is fused. If they say answers, correct them. Hear RRF and a cap on N.",
  ),
  "handling-ambiguous-questions": note(
   what="""**Ambiguous, multi-faceted, or poorly phrased** questions need **more than one retrieve query** (or a clarify). Multi-query / RAG-Fusion is the retrieve-side answer. A clarifying question is the product-side answer when you cannot guess safely.

Do not embed the mush and hope. An average vector is nobody's intent.

Poor phrasing also yields to rewrite ('wifi no work laptop office') before you spawn three queries.""",
   why="""Interviewers will hand you a mushy question. On the job, this is support-ticket reality.""",
   how="""Detect: multiple '?'; 'and'; pronouns; very short. Then either clarify or split. Example. 'refund and shipping to France' → two queries, fuse, or ask which they need if answers diverge.

If the two facets need different sources, fusion still helps both into the window.""",
   fails="""1. **One vector** of a two-intent question.

2. **Always clarify** when a split would do.

3. **Always split** when a clarify is safer (legal).

4. **No detect** — transform everyone.""",
   line="""Ambiguous questions get multiple retrieval queries or a clarify. I do not embed the mush as one vector.""",
   kps=[
    "Multi-intent and mush need split or clarify.",
    "One embedding averages the intents.",
    "Detect before you spend N retrieves.",
    "Legal/medical may prefer clarify over a guess.",
    "Rewrite poor phrasing before multi-query.",
    "Fusion can keep both facets in the window.",
   ],
   qs=[
    {"q": "How do you handle an ambiguous user question in RAG?", "a": "Split into multiple retrieval queries and fuse, or ask a clarifying question when guessing is unsafe. Do not embed the combined mush.", "kind": "recall"},
    {"q": "Query is 'cancel and refund policy France'. One retrieve misses France. Why?", "a": "Two facets averaged. Multi-query (cancel/refund vs France shipping/law) or a rewrite that keeps both terms explicitly.", "kind": "debug"},
    {"q": "When do you clarify instead of multi-query?", "a": "When the wrong facet would be harmful (legal, medical, payments) or the intents truly contradict. Product, not retrieve, owns that.", "kind": "apply"},
    {"q": "What is a cheap detect?", "a": "Multiple question marks, 'and/or', unresolved pronouns, length below a floor. Then transform; otherwise skip.", "kind": "apply"},
    {"q": "Is poor phrasing the same as ambiguity?", "a": "No. Poor phrasing may need one rewrite. Ambiguity is two possible meanings. Do not spawn N queries for a typo.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Hand them a two-intent question. If they embed it once, push. Ask when they would clarify.",
  ),
  "the-extra-calls-it-costs": note(
   what="""Every transform is **more LLM calls, more retrieves, more latency, more money**. Rewrite: +1. Multi-query of 3: +1 rewrite + 3 retrieves (or 3 hybrid). HyDE: +1 generate + 1 embed. RAG-Fusion stacks those.

The trade is **recall vs budget**. You only pay when baseline retrieve misses on that query class.

Put the extra calls on the trace. A 'smart RAG' with 8 hidden calls is how you blow a cost cap.""",
   why="""Interviewers will ask the cost. On the job, this is the budget conversation.""",
   how="""Count calls on a whiteboard. Example. Baseline: 1 embed + 1 retrieve + 1 generate. Fusion-3: 1 rewrite + 3 retrieve + 1 generate. HyDE+fusion is worse.

Route: easy lookup → baseline; messy → transform. Never the reverse.""",
   fails="""1. **Hidden extra calls.**

2. **Transform on every request.**

3. **No trace** of rewrite tokens.

4. **Comparing quality** without the call count.""",
   line="""Each transform is extra calls, latency, and money. I pay only on the query class that needs it, and I put the count on the trace.""",
   kps=[
    "Rewrite, multi-query, and HyDE all add calls.",
    "Trade is recall versus budget.",
    "Count calls on the whiteboard and the trace.",
    "Route easy lookups to the baseline.",
    "Do not compare quality without the call count.",
    "Hidden calls blow cost caps.",
   ],
   qs=[
    {"q": "What extra cost does query transformation add?", "a": "More LLM calls, more retrieve hops, more latency and tokens. Multi-query of N is about one rewrite plus N retrieves before the final generate.", "kind": "recall"},
    {"q": "A 'smart' pipeline does 8 model calls on 'INC-4419'. What do you change?", "a": "Skip transform on identifier queries. The extra calls cannot beat BM25 on an id and they blow the budget.", "kind": "debug"},
    {"q": "How do you show the trade to a PM?", "a": "A table: baseline vs fusion vs HyDE with recall, p95, and $ per query. Not a blog diagram.", "kind": "apply"},
    {"q": "What belongs on the trace?", "a": "Which transform ran, how many retrieves, rewrite tokens, and total model calls. Hidden hops are unbudgetable.", "kind": "apply"},
    {"q": "Is the final generate the only LLM call in RAG-Fusion?", "a": "No. You already paid for the rewrite (and maybe HyDE). Count them.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask them to count calls. If they only count the final generate, push. Ask about id queries.",
  ),
  "when-to-skip-transformation": note(
   what="""**Skip transformation when baseline retrieval already performs well.** Exact lookups, well-formed FAQs, and a first-stage with high recall do not need a rewrite. Transform is a remedy, not a lifestyle.

This matches 'skip rerank' energy. Defaults stay simple; flags turn extras on per slice.

Skipping is also how you protect identifiers from HyDE drift.""",
   why="""Interviewers will ask what you skip in v1. This. On the job, this is the router.""",
   how="""Router: if query looks like an id or recall@k is already high on this class, pass through. Example. 'E-204' → no rewrite. 'why does checkout feel stuck lately' → maybe multi-query.

Re-eval after you improve hybrid; a better baseline retires the rewrite.""",
   fails="""1. **Rewrite always.**

2. **No router.**

3. **HyDE on codes.**

4. **Never re-checking** after retrieve improves.""",
   line="""I skip query transformation when baseline retrieve already works — especially exact lookups. Extras are a flag, not the default path.""",
   kps=[
    "Skip when baseline recall is already high.",
    "Ids and clean FAQs pass through.",
    "Transform is a remedy, not a default.",
    "A router (or regex) is enough to start.",
    "Better retrieve can retire the rewrite.",
    "HyDE on codes is a skip, not a tune.",
   ],
   qs=[
    {"q": "When do you skip query transformation?", "a": "When baseline retrieval already performs well: exact ids, clean FAQs, high recall@k. Transform is for the miss class, not every request.", "kind": "recall"},
    {"q": "Always-on HyDE dropped SKU search quality. Why?", "a": "Hypothetical docs drifted off the identifier. Skip transform on precise queries; use the raw token in BM25.", "kind": "debug"},
    {"q": "How do you route?", "a": "A cheap detect (id-like, quoted string, high first-stage score) → pass through. Messy/ambiguous → rewrite or multi-query.", "kind": "apply"},
    {"q": "What happens after you improve hybrid?", "a": "Re-eval the rewrite. If baseline now wins, turn the flag off. Do not keep paying for a retired remedy.", "kind": "apply"},
    {"q": "Is skip the v1 default?", "a": "Yes. Ship retrieve-assemble-generate. Add transform when the eval's miss class is 'bad query'.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask the v1 default. If rewrite is always on, push ids. Ask about retiring it after hybrid improves.",
  ),
  "hyde-failure-on-precise-queries": note(
   what="""**HyDE fails on identifier-heavy and precise queries.** The model writes a hypothetical document that is a **plausible essay**, then you retrieve nearest to that essay. An error code, SKU, or API name gets replaced by generic prose; the real runbook never ranks.

HyDE can help **vague conceptual** questions where a fake paragraph sits near real paragraphs. It is the wrong first tool for support tickets.

If you use HyDE, **keep the raw query in BM25** beside it.""",
   why="""This is a named failure on the checklist. On the job, it is why HyDE demos look magic and prod SKU search dies.""",
   how="""Ban HyDE when the query matches id-like tokens. Example. 'E-204' → hypothetical 'users see timeouts at checkout…' → dense retrieves essays, misses the E-204 page. BM25 on the raw string would have won.

If you must try HyDE, fuse with the raw-query retrieve so the id can still win.""",
   fails="""1. **HyDE-only** retrieve.

2. **HyDE on SKUs and codes.**

3. **No raw-query channel.**

4. **Treating HyDE as default rewrite.**""",
   line="""HyDE drifts off identifiers because it embeds a made-up paragraph. I skip it on precise queries and I keep the raw string in BM25.""",
   kps=[
    "HyDE embeds a hypothetical doc, not the query.",
    "Plausible essays miss codes, SKUs, API names.",
    "Skip HyDE on precise/id queries.",
    "Keep raw-query BM25 if you try HyDE at all.",
    "HyDE is for vague conceptual questions, if anything.",
    "It is not the default rewrite.",
   ],
   qs=[
    {"q": "Why does HyDE fail on precise queries?", "a": "It embeds a hypothetical document. On an id or SKU that document becomes generic prose, so dense search misses the exact page. The raw token in BM25 would have hit.", "kind": "recall"},
    {"q": "HyDE is on; 'INC-4419' retrieves a similar-incident essay. Fix?", "a": "Disable HyDE for id-like queries and retrieve the raw string (sparse). Optionally fuse, but never HyDE-only.", "kind": "debug"},
    {"q": "When might HyDE help?", "a": "Vague conceptual questions where a made-up paragraph sits near real explanations and there is no identifier to protect.", "kind": "apply"},
    {"q": "How do you use HyDE safely if at all?", "a": "Fuse HyDE-dense with raw-query BM25 (RRF) and skip HyDE when tokens look like ids.", "kind": "apply"},
    {"q": "Is HyDE a rewrite?", "a": "No. Rewrite keeps a query in query space. HyDE moves to document space. Different drift.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what HyDE embeds. If they use it on tickets with ids, fail. Hear raw BM25 beside it.",
  ),
  "budget-for-extra-rewrite-calls": note(
   what="""**Each transform is another model call; skip on easy lookups.** Budget it like rerank: a cap on extra calls per request, a default-off flag, a slice router. Easy lookups (ids, quoted errors, high first-stage score) pay zero extra.

This is the money twin of 'the extra calls it costs'. Write the budget before you enable the toy.

A daily call cap in settings is a product rule, not only an infra one.""",
   why="""Interviewers will ask how you do not go broke. On the job, this is the limiter.""",
   how="""Config: `max_transform_calls=1`, `skip_if_id=true`. Example. 1M easy lookups/day × $0.001 rewrite is a four-figure waste. Route them out.

Alert when average calls/request drift up after a prompt change.""",
   fails="""1. **Unlimited** rewrite fan-out.

2. **No skip_if_id.**

3. **No alert** on calls/request.

4. **Budgeting only generate**, not rewrite.""",
   line="""I budget extra rewrite calls and I skip them on easy lookups. A transform that is always on is a leak, not a feature.""",
   kps=[
    "Each transform is a billed call.",
    "Skip on easy lookups.",
    "Cap extra calls per request.",
    "Alert on calls/request drift.",
    "Budget rewrite, not only the final generate.",
    "Default off until a slice proves need.",
   ],
   qs=[
    {"q": "How do you budget extra rewrite calls?", "a": "Cap transforms per request, skip easy lookups (ids, high-confidence first-stage), and alert if average calls/request rise. Do not budget only the final generate.", "kind": "recall"},
    {"q": "After a prompt tweak, the bill doubled but answer quality did not. What do you check?", "a": "Calls/request. A rewrite or multi-query may have started firing on easy lookups. Turn the router back on.", "kind": "debug"},
    {"q": "What is a sane v1 cap?", "a": "Zero extra calls by default; at most one rewrite on the messy slice. Raise N only with a table of recall vs $.", "kind": "apply"},
    {"q": "Why skip ids even if rewrite is 'cheap'?", "a": "Cheap × huge QPS is not cheap, and rewrite can drop the id. Two reasons, same skip.", "kind": "apply"},
    {"q": "What do you alert on?", "a": "Average model calls per request and transform-on rate. Quality-only alerts miss the leak.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask for the cap and the skip. If rewrite is unlimited, they have no budget. Ask about ids.",
  ),
 }
}
