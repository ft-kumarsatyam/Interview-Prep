from helper import note
from links import OA_CACHE, ANTH_CACHE, AZ_CACHE, OA_PROD

L = [OA_CACHE, ANTH_CACHE]

NOTES = {
    "m9-5": {
        "the-four-caches-in-an-ai-system": note(
            what="""Four caches show up in production AI: **exact-response** (HTTP or app cache of the full answer for an identical request), **prompt / prefix cache** (provider reuses prefill of a stable prefix), **retrieval cache** (query → chunk ids or embeddings), and **semantic cache** (near-duplicate questions share an answer). They have different keys, TTLs, and leak risks.

Name them in a design. 'We cache' is not a design. Each must not store personalised or secret answers under a shared key.""",
            why="""Interviewers ask you to list four caches and one thing each must not store. On the job, mixing them is how tenant B sees tenant A's refund.""",
            how="""Table: exact — key `(tenant, route, hash(body))`, short TTL, never personal. Prefix — stable system+tools, no clocks in the prefix. Retrieval — key `(tenant, query_hash, index_version)`. Semantic — embedding of question plus tenant, high similarity threshold, human-reviewed invalidation on policy change.""",
            fails="""1. **One big cache** for all four jobs.

2. **Prefix that includes the time.**

3. **Semantic cache without tenant.**

4. **Exact cache of a personalised answer** on a global key.""",
            line="I name four caches: exact-response, prompt prefix, retrieval, and semantic — each with a key, a TTL, and one thing it must not store. 'We cache' is not a design.",
            kps=[
                "Exact, prefix, retrieval, semantic — four different jobs.",
                "Each has its own key, TTL, and leak mode.",
                "Prefix cache needs a byte-stable head.",
                "Never put personal or secret answers on a shared key.",
                "Index version belongs in the retrieval-cache key.",
                "List one forbidden store per cache in the interview.",
            ],
            qs=[
                {"q": "Which cache reuses computation for an identical prompt prefix at the provider?", "a": "Prompt or prefix cache. Exact-response is the full answer; semantic is near-duplicate questions; retrieval is chunks.", "kind": "recall"},
                {"q": "Interview: four caches plus one thing each must not store.", "a": "Exact: not another user's answer. Prefix: not a per-request clock or secret. Retrieval: not another tenant's ids. Semantic: not a personalised or secret answer.", "kind": "apply"},
                {"q": "Prompt cache hit rate is poor. The prompt begins with the current time. Fix?", "a": "Move the clock out of the prefix. Stability is the feature.", "kind": "debug"},
                {"q": "What belongs in a retrieval-cache key?", "a": "Tenant, query hash or embedding id, and index or snapshot version so a rebuild busts it.", "kind": "recall"},
                {"q": "Why not one cache for all four?", "a": "Different cardinality, TTL, and leak surfaces. A semantic hit is not an exact hit.", "kind": "apply"},
            ],
            links=L,
            walk="""You draw a four-row table in the design doc. The old Redis that stored 'answers' by question text is deleted after a tenant canary fails.""",
            measure="""Hit rate per cache; canary leaks; prefix stability (leading-byte changes).""",
        ),
        "what-is-safe-to-cache": note(
            what="""Cache **only what is safe to reuse** for that key. Safe: public FAQ answers, retrieved chunks for a tenant+query, a stable prefix. Unsafe: another user's orders, anything with PII, anything that depends on the clock or a one-time token, high-risk advice you have not re-grounded, and **any personalised or secret answer on a shared key**.

Expiration and invalidation are part of 'safe': a new policy doc must bust similar questions, not just exact matches. TTL alone is not enough if the policy changed in five minutes.""",
            why="""Safety of a cache is a security and correctness problem. Interviewers will give you a personalised request.""",
            how="""Allow-list routes that may use exact or semantic cache. Require `tenant` and `user` in the key when the answer depends on them. Event-bust on corpus change. Never cache `Authorization` or tool results that contain secrets.""",
            fails="""1. **Cache-all** with a 24 h TTL.

2. **Semantic hit across users.**

3. **No bust** on policy publish.

4. **Caching tool results** that include tokens.""",
            line="I cache only what is safe to reuse for that key: public or tenant-scoped, non-secret, and invalidated when the source changes. Personalised and secret answers never sit on a shared key, and a new policy busts semantic hits, not only exact ones.",
            kps=[
                "Safety is key + TTL + invalidation + data class.",
                "Personalised and secret answers are not shared.",
                "Event-bust on corpus or policy change.",
                "TTL alone is not invalidation.",
                "Allow-list which routes may cache answers.",
                "Do not cache secrets in tool results.",
            ],
            qs=[
                {"q": "Which response is least safe to cache?", "a": "A personalised or secret answer (this user's orders, a medical note) on a key that another user could hit.", "kind": "recall"},
                {"q": "Which keying practice prevents cross-user leaks in a response cache?", "a": "Include tenant and user (or a hash of the ACL set) in the key, or do not cache that route.", "kind": "apply"},
                {"q": "A new policy doc must bust similar questions. What is missing if you only delete exact keys?", "a": "Semantic-cache invalidation. Near-duplicate questions will still return the old answer.", "kind": "debug"},
                {"q": "Is a 24 h TTL enough after a legal change?", "a": "No. Event-bust immediately. TTL is a backstop.", "kind": "apply"},
                {"q": "Why allow-list cacheable routes?", "a": "So a new high-risk route does not inherit yesterday's cache-all default.", "kind": "recall"},
            ],
            links=L,
            walk="""You turn off semantic cache on `/account` and add a bust hook on policy publish. A canary user no longer sees another tenant's FAQ-with-account-bleed.""",
            measure="""Cacheable-route allow-list; bust latency after publish; leaked-key incidents.""",
        ),
        "semantic-caching": note(
            what="""**Semantic caching** serves an answer when a new question is close in embedding space to a previous one. It wins on paraphrase ('how do I reset my password' vs 'forgot password steps'). It loses on small, high-stakes differences ('refund to card' vs 'refund to voucher') and on **personal** questions that look similar.

Thresholds trade hit rate for correctness. Lowering the threshold raises hits and wrong answers. You need a measured threshold, tenant keys, and a way to **invalidate by meaning** when a source changes — not only by exact string.""",
            why="""This is the cache interviewers either love or fear. On the job it is a 30% cost win or a silent wrong-policy bug.""",
            how="""Start high-threshold (strict). Log near-misses. Sample them for wrong reuse. Drop threshold only if the error rate stays under the floor. Invalidate: on policy publish, drop all entries whose retrieved doc ids intersect the changed set, or flush the route.""",
            fails="""1. **Low threshold** to look good on hit rate.

2. **No tenant in the key.**

3. **No sampled audit** of hits.

4. **Exact-only bust** after a doc change.""",
            line="Semantic cache is for paraphrases of safe, shared answers. I set a high threshold, I key on tenant, I audit hits, and I invalidate by changed sources — not by celebrating a high hit rate.",
            kps=[
                "Near-duplicate shared questions, not personal ones.",
                "Threshold trades hits for correctness.",
                "Key on tenant (and route).",
                "Audit a sample of hits for wrong reuse.",
                "Invalidate by source change, not only exact keys.",
                "High-stakes small differences should miss.",
            ],
            qs=[
                {"q": "What does lowering the semantic-cache threshold generally do?", "a": "Raises hit rate and the chance of serving a wrong near-neighbour. Measure both.", "kind": "recall"},
                {"q": "Best way to detect a semantic cache returning wrong answers?", "a": "Sample hits, compare to a fresh generation or a labelled set, and track complaints on cached routes.", "kind": "apply"},
                {"q": "Which request should NOT be served from a shared response cache?", "a": "A personalised or tenant-specific ask (my order, my balance), or a high-stakes near-duplicate.", "kind": "apply"},
                {"q": "How do you bust semantic entries when a policy page changes?", "a": "Drop entries that cited that doc id, or flush the route. Exact-key delete is not enough.", "kind": "debug"},
                {"q": "When is semantic cache not worth it?", "a": "Low paraphrase rate, high personalisation, or a threshold you cannot validate. Use exact and prefix first.", "kind": "recall"},
            ],
            links=L,
            walk="""Hit rate is 40% at 0.92 cosine and 1% sampled error. You do not drop to 0.80 even though hits would jump.""",
            measure="""Hit rate; sampled error; bust completeness after doc change.""",
        ),
        "freshness-vs-latency-cost": note(
            what="""Caching spends **freshness** to buy **latency and cost**. That trade is explicit: a 10-minute FAQ cache is usually fine; a 10-minute price cache is not; a 10-minute policy cache after a legal change is a bug. Draw the curve: hit rate versus staleness versus dollars. Pick a point per route.

When freshness is the binding constraint, you cache prefixes and retrieval of unchanged docs, not answers. When cost is binding and content is stable, you cache answers aggressively.""",
            why="""This is the triangle applied to caches. Interviewers want a per-route answer, not 'cache everything 24h'.""",
            how="""FAQ: answer cache 1–6 h plus prefix cache. Prices: no answer cache; maybe a 30 s retrieval cache on the catalog if the system of record agrees. Policy: answer cache with instant bust on publish. Measure freshness incidents separately from hit rate.""",
            fails="""1. **One TTL for the product.**

2. **Celebrating hit rate** during a stale-policy incident.

3. **Answer-caching live data.**""",
            line="Caching trades freshness for latency and cost. I pick the point per route: aggressive on stable FAQ, instant-bust on policy, none on live prices. Hit rate is not success if the answer is stale.",
            kps=[
                "The trade is freshness versus latency and cost.",
                "Pick a point per route, not one TTL.",
                "Live values: do not cache answers.",
                "Policy: cache with instant bust.",
                "Hit rate during a stale incident is a vanity metric.",
                "You can still cache prefixes when answers must be fresh.",
            ],
            qs=[
                {"q": "Why might you cache prefixes but not answers on a pricing bot?", "a": "The prefix is stable and expensive to prefill; the answer must be live. You take the prefill win without serving yesterday's price.", "kind": "apply"},
                {"q": "A team reports 90% hit rate the morning after a policy change. Good?", "a": "No if those hits are old policy. Split the metric: hit rate versus stale-hit rate.", "kind": "debug"},
                {"q": "How do you choose a TTL?", "a": "From the freshness SLA and the cost of a stale answer, then measure. Not from a blog default.", "kind": "recall"},
                {"q": "What still helps when you cannot cache answers?", "a": "Prefix cache, retrieval cache of unchanged docs, and a smaller model.", "kind": "apply"},
                {"q": "Name the three axes of this trade.", "a": "Freshness, latency, and cost (plus quality if a stale answer is wrong).", "kind": "recall"},
            ],
            links=L,
            walk="""You split TTLs: FAQ 3 h, policy event-bust, prices off. Finance still sees a prefix-cache saving. Legal stops paging you.""",
            measure="""Stale-hit rate; TTL by route; prefix-cache savings on no-answer-cache routes.""",
        ),
        "measuring-the-hit-rate": note(
            what="""**Measure actual hit rate and savings**, do not assume. Hit rate is hits/(hits+misses) **per cache and per route**, plus **dollars and milliseconds saved**, plus **error rate on hits**. A 70% hit rate that saves 2% of cost is not the same as a 30% hit rate that saves 40% because it hits the expensive prefix.

Also measure **false hits** (semantic wrong, stale, leaked). A cache you do not measure will be turned off in a panic after one incident, or left on forever after it dies.""",
            why="""This is the anti-handwave item. Interviewers ask how you know caching helped.""",
            how="""Dashboard: hit rate, p95 with and without (shadow or holdout), $ saved, stale-hit, leak canaries. A weekly read. If prefix cache reports hits but the bill did not move, you are caching the wrong bytes.""",
            fails="""1. **One global hit rate.**

2. **No $ column.**

3. **No holdout**, so you cannot prove causality.

4. **Ignoring false hits.**""",
            line="I measure hit rate, dollars and milliseconds saved, and error on hits — per cache and route. I do not assume caching helped, and I will not celebrate a hit rate that did not move the bill.",
            kps=[
                "Hit rate per cache and per route.",
                "Report $ and ms saved, not only percent.",
                "Track false hits: stale, wrong, leaked.",
                "A holdout proves causality.",
                "Global averages hide a dead cache.",
                "If the bill did not move, the cache is in the wrong place.",
            ],
            qs=[
                {"q": "Why is a global hit rate insufficient?", "a": "One route can dominate or a cheap cache can look healthy while the expensive prefix never hits.", "kind": "recall"},
                {"q": "What three numbers prove a cache is worth it?", "a": "Hit rate, $ or ms saved, and error/stale/leak rate on hits.", "kind": "apply"},
                {"q": "How do you prove the cache caused the saving?", "a": "A holdout or shadow path without the cache, or a before/after on a single change.", "kind": "apply"},
                {"q": "Prefix cache says 80% hits but the bill is flat. What do you check?", "a": "Whether those hits are on a tiny prefix, whether you are still paying for a huge unique tail, and whether the provider actually discounted.", "kind": "debug"},
                {"q": "What is a false hit?", "a": "A cache return that is stale, for the wrong tenant, or semantically wrong. Count it against the cache, not as a win.", "kind": "recall"},
            ],
            links=L,
            walk="""You add $ saved next to hit rate. The semantic cache is 55% hits and $12/day. The prefix cache is 40% hits and $400/day. You fund prefix stability, not a lower semantic threshold.""",
            measure="""Dashboards with $ and false-hit; holdouts run; caches without a route tag.""",
        ),
        "semantic-cache-invalidation": note(
            what="""**A new policy doc must bust similar questions, not just exact matches.** Semantic invalidation is the hard part: entries are keyed by embeddings, not by `doc_id`. Strategies: store the cited doc ids on each entry and drop intersections; flush the whole route; reduce TTL on policy routes; re-embed a tombstone query set and drop neighbours.

If you cannot do this, do not semantic-cache policy answers. Exact-plus-prefix is enough.""",
            why="""This is the item that separates a demo cache from a legal-safe one. Interviewers will mention a policy update.""",
            how="""On publish of `doc_id=P`, delete cache rows where `cited_ids contains P` or `route=policy`. If you did not store cited ids, you cannot do the first — so store them. Test: publish a canary sentence, ask a paraphrase, assert miss then a new hit with the new sentence.""",
            fails="""1. **No cited_ids on the entry.**

2. **Exact-key delete only.**

3. **Semantic-caching policy** without a bust path.""",
            line="A new policy doc must bust similar questions, not just exact matches. I store cited doc ids on semantic entries, I drop intersections on publish, and if I cannot, I do not semantic-cache that route.",
            kps=[
                "Exact delete does not bust paraphrases.",
                "Store cited doc ids on each semantic entry.",
                "Publish hooks drop intersections or flush the route.",
                "If you cannot bust, do not semantic-cache policy.",
                "Test with a paraphrase after publish.",
                "TTL is a backstop, not the bust.",
            ],
            qs=[
                {"q": "Why is deleting the exact question key not enough after a policy edit?", "a": "Paraphrases still hit neighbours with the old answer. You must drop by cited doc or flush the route.", "kind": "recall"},
                {"q": "What must you store on a semantic-cache entry to bust it later?", "a": "Cited or retrieved doc ids (and tenant, route, time).", "kind": "apply"},
                {"q": "You did not store doc ids. What is the honest option?", "a": "Flush the route on publish, or stop semantic-caching that route.", "kind": "debug"},
                {"q": "How do you test invalidation?", "a": "Publish a canary sentence, ask a paraphrase, expect a miss then a new answer that contains the canary.", "kind": "apply"},
                {"q": "Is a 5-minute TTL a substitute?", "a": "Only as a backstop. Legal changes should not wait five minutes.", "kind": "recall"},
            ],
            links=L,
            walk="""You add `cited_ids` and a publish hook. The paraphrase test goes green. Policy stays on semantic cache with a bust you can explain.""",
            measure="""Time-to-bust on paraphrase; entries missing cited_ids; policy routes without a hook.""",
        ),
        "what-you-must-never-cache": note(
            what="""**Personalized or secret answers in a shared key** — that is the never. Also never: credentials, raw PII you would not log, someone else's tenant data, one-time links, and high-risk advice that must be re-grounded every time. The never is about the **combination** of data class and key scope. A personal answer in a **user-scoped** cache with a short TTL can be fine. The same answer under `hash(question)` is an incident.

Write the nevers in the gateway. Make them tests.""",
            why="""This is the interview line they want in one breath. On the job it is the code comment that stops a helpful engineer.""",
            how="""Denylist: routes tagged `personalized` or `secret` cannot use semantic or global exact cache. CI greps for cache middleware on those routes. A canary user asks 'what is my balance' after another user did; expect miss.""",
            fails="""1. **'It is only FAQ'** that sometimes includes an account number.

2. **User-scoped intended**, global implemented.

3. **Caching 2FA codes** because they look like short answers.""",
            line="I never cache personalised or secret answers on a shared key. User-scoped short TTL can be OK; `hash(question)` is not. The never is a tested denylist, not a comment.",
            kps=[
                "Never: personal or secret answers on a shared key.",
                "Also never: creds, one-time links, other tenants.",
                "User-scoped cache is a different design.",
                "The combination of data class and key scope is the bug.",
                "Denylist routes in the gateway with tests.",
                "FAQ that sometimes includes an account number is not FAQ.",
            ],
            qs=[
                {"q": "What must you never cache?", "a": "Personalised or secret answers under a shared key — plus credentials, one-time tokens, and other tenants' data.", "kind": "recall"},
                {"q": "When is caching a personal answer acceptable?", "a": "When the key includes the user, the TTL is short, and the store is isolated. Not on a global semantic cache.", "kind": "apply"},
                {"q": "A 'FAQ' answer includes the user's last four card digits. Cache?", "a": "No shared cache. That is personalised. Fix the prompt so FAQ cannot include it, too.", "kind": "debug"},
                {"q": "How do you enforce the never?", "a": "Route tags plus middleware that refuses semantic/global exact cache, plus a canary test.", "kind": "apply"},
                {"q": "Why are 2FA codes a never?", "a": "They are secrets and time-bound. A cache turns them into a theft and a UX bug.", "kind": "recall"},
            ],
            links=L,
            walk="""You tag `/me/*` as personalised. A PR that adds semantic cache there fails CI. That is the never as code.""",
            measure="""Personal routes with a shared cache; canary leaks; 2FA-like strings in cache dumps.""",
        ),
        "interview": note(
            what="""**Interview: four caches** — HTTP/exact, prompt prefix, retrieval, and semantic — **plus one thing each must not store.** This is the close of M9.5. Say it in 20 seconds, then offer to talk invalidation. If you only remember semantic, you miss the prefix win that often pays the bill.

Practice the four plus nevers until they are muscle memory.""",
            why="""It is a favourite whiteboard closer. Completeness scores seniority.""",
            how="""Spoken: 'Exact or HTTP — not another user's answer. Prefix — not a clock or a secret in the stable head. Retrieval — not another tenant's chunks. Semantic — not a personalised or secret answer, and I bust by doc id on publish.'""",
            fails="""1. **Only naming semantic.**

2. **No nevers.**

3. **Forgetting prefix**, which is often the money.""",
            line="I list four caches — exact, prefix, retrieval, semantic — and one thing each must not store. I mention prefix because it often pays the bill, and semantic invalidation because that is where teams get hurt.",
            kps=[
                "Four names, four nevers, twenty seconds.",
                "Prefix is often the largest $ win.",
                "Semantic is where leaks and stale policy live.",
                "Do not stop at 'we cache'.",
                "Offer invalidation as the encore.",
                "Muscle memory beats a clever new taxonomy.",
            ],
            qs=[
                {"q": "List the four caches and one never each.", "a": "Exact: not another user's answer. Prefix: not clocks or secrets in the head. Retrieval: not other-tenant ids. Semantic: not personal or secret answers.", "kind": "recall"},
                {"q": "Which cache do people forget that often saves the most money?", "a": "Prompt prefix cache, if the head is stable.", "kind": "apply"},
                {"q": "What encore do you offer after the four?", "a": "How semantic invalidation works on a policy publish.", "kind": "apply"},
                {"q": "A candidate only describes Redis of answers. What is missing?", "a": "Prefix, retrieval, semantic — and every never.", "kind": "debug"},
                {"q": "Why is this a close rather than a deep dive?", "a": "It proves you have the map. Depth comes if they pick one cache.", "kind": "recall"},
            ],
            links=L,
            walk="""You rattle the four and the nevers. They pick semantic. You talk cited_ids. That is a pass.""",
            measure="""Practice time under 25 seconds; designs that omit prefix.""",
        ),
    }
}
