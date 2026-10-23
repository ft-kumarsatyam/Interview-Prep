from helper import note
from links import OA_PROD, OA_LAT, VERTEX, OA_PE

L = [OA_PROD, OA_LAT]

NOTES = {
    "m9-3": {
        "what-a-model-gateway-does": note(
            what="""A **model gateway** is the internal service between your apps and one or more LLM providers. Apps call a provider-neutral API; the gateway owns the rest: unified schema, **routing** and fallbacks, **auth and keys** (apps never hold provider keys), **rate limits and quotas** per team or feature, **observability** (latency, tokens, cost, model version, trace ids), **policy** (redaction, allow-listed models, region pin), **caching**, retries, timeouts, and request shaping.

Without it every service reimplements retries and keys, costs are invisible, and a deprecation is a many-team fire drill. With it, swapping a model is a config change.""",
            why="""This is the first box in a production design. Interviewers ask why not call the vendor from each service. On the job it is how you survive a model retirement.""",
            how="""App → gateway with `route=support.answer`, `tenant`, `payload`. Gateway picks model snapshot, applies cache, injects keys, records usage, enforces quota. A deprecation updates one table. Feature teams do not copy `OPENAI_API_KEY` into six repos.""",
            fails="""1. **Keys in each microservice.**

2. **No usage attribution** so one batch job surprises finance.

3. **A 'gateway' that is only a reverse proxy** with no policy or quotas.

4. **Every team on the latest alias** with no pin.""",
            line="The gateway is the abstraction between apps and providers: keys, routing, limits, retries, policy, and usage. Apps call a stable internal API; swapping a model is a config change. I hide keys and I pin snapshots.",
            kps=[
                "One internal API; apps do not hold provider keys.",
                "Routing, fallbacks, quotas, retries, policy, cache.",
                "Usage and cost attributed per feature.",
                "Deprecations become a config change.",
                "Pin snapshots; do not silently ride `latest`.",
                "A proxy without policy is not a gateway.",
            ],
            qs=[
                {"q": "What is the primary benefit of a model gateway for provider deprecations?", "a": "One place to change the model map. Apps keep calling the same internal route. You re-eval, then flip config.", "kind": "recall"},
                {"q": "Why hide keys from apps?", "a": "To prevent leakage, to rotate in one place, and to enforce policy before the vendor sees the call.", "kind": "apply"},
                {"q": "Why track tokens and cost per feature at the gateway?", "a": "So you can budget, detect runaway jobs, and compare routes. Without attribution, finance sees one blob.", "kind": "recall"},
                {"q": "A team's global rate limit lets one batch job starve interactive chat. Best fix?", "a": "Separate quotas and queues per class at the gateway, not a single shared bucket.", "kind": "debug"},
                {"q": "What does 'pin snapshots' mean?", "a": "Call a dated model id, not `latest`, so behaviour does not change on a Thursday without an eval.", "kind": "apply"},
            ],
            links=L,
            walk="""You move three services behind the gateway, delete two leaked keys, and survive a vendor deprecation with a config PR and a re-eval.""",
            measure="""Services still holding provider keys; cost by feature; unpinned `latest` calls.""",
        ),
        "routing-on-task-cost-risk": note(
            what="""**Route** requests by **task type, capability, latency, context length, cost, modality, or risk** — not by whichever model the author liked. Classification and easy FAQ go cheap and fast. Long-context summarisation needs a large window. High-stakes legal advice needs a strong model, a grounded path, and a fallback that is **safe** (human or refuse), not merely cheaper.

Routing signals are features of the request: length, language, tool need, data class, user tier. They are not a second model guessing for fun unless you measured that guess.""",
            why="""This is how you spend the triangle on purpose. Interviewers distinguish routing signals from cascade signals.""",
            how="""Table: `support.faq` → small, cached; `support.refund` → mid + tools + approval; `legal.draft` → large + RAG + no cheap fallback; `image.alt` → vision model. Risk is a first-class column: if risk is high, do not fail over to a toy model that will cheerfully hallucinate.""",
            fails="""1. **One model for all routes.**

2. **Cheapest fallback on a high-risk route.**

3. **Routing on user id** as a proxy for difficulty.

4. **A router model** that costs more than it saves.""",
            line="I route on task, cost, and risk. Easy work goes to small and fast models; high-risk work goes to a grounded strong path and a safe fallback — not a cheaper hallucination. Routing is a table, not a favourite model.",
            kps=[
                "Route on task, capability, latency, window, cost, modality, risk.",
                "High-risk routes do not fail over to a toy model.",
                "Routing signals come from the request, not from taste.",
                "A router must save more than it costs.",
                "Write the table; do not keep it in someone's head.",
                "Data class is a routing signal (residency, ZDR).",
            ],
            qs=[
                {"q": "Which is a routing signal rather than a cascade signal?", "a": "Task type, modality, required context length, or data class — properties you know before you call a cheap model. Cascade uses the cheap model's confidence or a checker after the fact.", "kind": "recall"},
                {"q": "For a high-stakes legal-advice route, what fallback policy is most defensible?", "a": "Refuse or escalate to a human, or a same-quality model in another region. Not a cheap model that will invent citations.", "kind": "apply"},
                {"q": "When is a learned router worth it?", "a": "When a simple table leaves money on the table and you have labelled difficulty plus a cost model that shows the router pays for itself.", "kind": "apply"},
                {"q": "A new vision ask hits the text-only route. What was missing?", "a": "Modality as a routing signal. Detect and send to a vision-capable model or refuse.", "kind": "debug"},
                {"q": "How does risk change routing?", "a": "It constrains both the primary model and the fallback. High risk narrows the set to grounded, logged, possibly human-reviewed paths.", "kind": "recall"},
            ],
            links=L,
            walk="""You publish the route table. Legal loses its cheap fallback. FAQ gets a small model. The bill drops and the scary route gets safer.""",
            measure="""Share of traffic per route; high-risk fallbacks that were cheap models; router overhead.""",
        ),
        "model-cascades": note(
            what="""A **cascade** tries a **cheaper or faster model first** and escalates to a stronger one when the easy path is not good enough. The escalate signal can be the small model's self-reported confidence (weak), a validator (schema, grounding, classifier), or a cheap second pass. Cascades win when **most requests are easy**.

They fail open to a **safe default**: if the small model cannot produce valid JSON, you escalate or refuse — you do not silently drop the schema. You never 'return whatever' because the cascade got confused.""",
            why="""This is the 80/20 cost move. Interviewers ask when a cascade is worth it and how it fails.""",
            how="""Example: small model answers; a grounding check requires a citation overlap; fail → large model. Or: small model emits JSON; parse fail → large. Track escalate rate. If it is 60%, you are paying both models and should raise the small model or kill the cascade.""",
            fails="""1. **Escalate rate too high.**

2. **No validator**, only vibes.

3. **Silent schema drop.**

4. **Cascade on a route where almost everything is hard.**""",
            line="A cascade sends easy work to a cheap model and escalates on a validator, not a vibe. It fails open to a safe default — escalate or refuse — and never silently drops the schema. If most traffic escalates, I kill the cascade.",
            kps=[
                "Cheap first; escalate when a check fails.",
                "Need a real validator, not only self-confidence.",
                "Fail open to a safe default, never drop the schema.",
                "Watch escalate rate; high means the cascade is waste.",
                "Works when most requests are easy.",
                "Cost both hops when you escalate; price that in.",
            ],
            qs=[
                {"q": "A cascade is most cost-effective when?", "a": "Most requests are easy enough for the cheap model and the escalate rate stays low. If 60% escalate you pay twice.", "kind": "recall"},
                {"q": "What should happen when the cheap model emits invalid JSON?", "a": "Escalate or refuse. Do not silently drop the schema or coerce fields.", "kind": "apply"},
                {"q": "Why is self-reported confidence a weak escalate signal?", "a": "Models are poorly calibrated and can be confident and wrong. Prefer a schema or grounding check.", "kind": "debug"},
                {"q": "How do you price a cascade?", "a": "E[cost] = cost_small + escalate_rate × cost_large, plus latency of the second hop. Compare to always-large.", "kind": "apply"},
                {"q": "When do you not cascade?", "a": "High-risk routes where the cheap model is unsafe even as a first pass, or when almost every request is hard.", "kind": "recall"},
            ],
            links=L,
            walk="""Escalate rate is 18% on FAQ and the blended cost is a third of always-large. You keep it. On legal it is 70%; you remove the cascade.""",
            measure="""Escalate rate per route; blended cost versus always-large; schema-drop incidents (zero).""",
        ),
        "provider-fallbacks-quality-risk": note(
            what="""**Fallbacks** keep the product up when a provider 429s or dies. They also **change quality**. A different model family will break prompts, JSON shape, citation style, and safety. The fallback policy is therefore per route: same-quality peer, degrade to search, or refuse — not a global 'any model that's up'.

Pin snapshots. Re-eval fallbacks on the same suite. A fallback that trains on your data is not a fallback for a ZDR route. A fallback that cannot meet the schema is not a fallback for a machine consumer.""",
            why="""Availability without a quality story is how you ship a quiet regression during an outage. Interviewers want that honesty.""",
            how="""Health checks, circuit breaker, next hop from a list that was eval'd. `support.faq` may fall to provider B small. `legal.draft` falls to 'unavailable — try a human'. Record `model_id` on every answer so you can see the outage's quality dent.""",
            fails="""1. **Global cheapest fallback.**

2. **Never re-eval'd** the backup.

3. **Fallback breaks residency.**

4. **No marker** on answers served from backup.""",
            line="Fallbacks are per route and they have a quality risk. I re-eval them, I refuse a cheap or non-compliant backup on high-risk paths, and I record which snapshot served the answer.",
            kps=[
                "Fallback is a quality decision, not only an uptime one.",
                "Per-route policy: peer, degrade, or refuse.",
                "Re-eval backups on the same suite.",
                "Do not break residency or ZDR in a fallback.",
                "Record the snapshot on every answer.",
                "A global cheapest backup is a regression machine.",
            ],
            qs=[
                {"q": "Why do provider fallbacks introduce quality risk?", "a": "Another family will not honour the same prompt, schema, or safety profile. You must re-eval and sometimes refuse rather than serve a worse model.", "kind": "recall"},
                {"q": "What fallback is defensible for high-stakes legal advice?", "a": "A same-quality peer you have eval'd, or a human / explicit inability. Not a cheap chat model.", "kind": "apply"},
                {"q": "The backup is in another region. What do you check?", "a": "Residency and contractual terms. If they fail, that backup is disabled for that route.", "kind": "debug"},
                {"q": "How do you see an outage's quality dent later?", "a": "Log model_id and score online or on a shadow set sliced by model_id.", "kind": "apply"},
                {"q": "When is degrade-to-search better than a random backup model?", "a": "When the backup's error modes are worse than no generation — users still get links, not invented law.", "kind": "recall"},
            ],
            links=L,
            walk="""Provider A dies. FAQ continues on B. Legal shows a calm unavailable. You publish the quality slice the next day.""",
            measure="""Answers served on backup; quality by model_id; fallbacks that violate the route policy.""",
        ),
        "centralising-auth-limits-tracking": note(
            what="""**Auth, usage tracking, retries, rate limits, and provider abstraction** belong in the gateway, not copied through six services. Centralising means one place to rotate keys, one place to set a feature budget, one place to apply jittered retries and timeouts, one place to pin regions. Teams still own prompts and product logic; they do not own HTTP to the vendor.

Retries are not 'try 12 times'. They are bounded, idempotent where possible, and they share the user's remaining deadline.""",
            why="""This is how you stop a thundering herd and a leaked key in the same quarter. Interviewers ask where limits live.""",
            how="""Gateway middleware: authenticate the internal caller, apply per-feature QPS and daily token caps, retry 429s with jitter, timeout to the remaining SLA, emit a usage event. A new app gets an identity and a quota, not a vendor key.""",
            fails="""1. **Each service retries independently** and multiplies load.

2. **No daily cap** on a new experiment.

3. **Tracking without feature tags.**

4. **Auth that is a shared static token** for all apps.""",
            line="The gateway is where keys, budgets, retries, and tracking live — not in each service. Apps get an identity and a quota. Retries are bounded and share the remaining deadline so we do not amplify an outage.",
            kps=[
                "Keys, quotas, retries, and usage live in one place.",
                "Apps get identities, not vendor keys.",
                "Retries are bounded, jittered, and deadline-aware.",
                "Feature tags make cost attributable.",
                "A shared static token is not central auth.",
                "New experiments start with a cap.",
            ],
            qs=[
                {"q": "Where should keys and budgets live?", "a": "In the gateway. Apps authenticate to the gateway; the gateway talks to vendors.", "kind": "recall"},
                {"q": "Why can per-service retries make an outage worse?", "a": "They amplify traffic into a 429. Central retries with jitter and a budget stop the herd.", "kind": "debug"},
                {"q": "What does a new feature get on day one?", "a": "An identity, a quota, and a usage tag — not an unlimited key.", "kind": "apply"},
                {"q": "How do retries share the remaining deadline?", "a": "If p95 budget is 2 s and 1.4 s is gone, the retry timeout is what is left minus a floor, or you fail.", "kind": "apply"},
                {"q": "Why tag usage by feature?", "a": "So finance and on-call can see which route burned the wallet.", "kind": "recall"},
            ],
            links=L,
            walk="""You turn off three copies of retry code, set a 50 k token/day cap on a prototype, and the next 429 does not take the site down.""",
            measure="""Services with their own vendor keys; retry amplification during drills; uncapped features.""",
        ),
        "a-cascade-that-fails-open-to-a-safe-default": note(
            what="""**Cheap model first; escalate; never silently drop the schema.** This is the slogan form of a safe cascade. Fail-open here means fail toward a **safe** next action — a stronger model, a template, a human, a clear error — not toward an untyped string because parsing failed.

'Open' is easy to misread as 'let it through'. In this item it means the cascade does not dead-end in a corrupt payload. The default is safe and typed.""",
            why="""Interviewers listen for 'never drop the schema'. On the job this is the bug where a mobile client crashes on a missing field during a cascade.""",
            how="""If small model JSON fails: escalate. If large also fails: return a versioned error object the client understands, or a templated safe reply. Never `{}` or a prose apology where a machine expected fields.""",
            fails="""1. **Coercing invalid JSON.**

2. **Prose where a schema was promised.**

3. **Calling fail-open 'return the raw text'.**""",
            line="A safe cascade is cheap first, escalate on a check, and never silently drop the schema. The default is a typed error, a stronger model, or a template — not an untyped apology.",
            kps=[
                "Cheap first; escalate on a real check.",
                "Never silently drop the schema.",
                "Safe default: escalate, template, or typed error.",
                "Fail-open does not mean 'let anything through'.",
                "Clients should never see a missing required field from a cascade.",
                "Coercion is a bug.",
            ],
            qs=[
                {"q": "What must a cascade never do when JSON is invalid?", "a": "Silently drop the schema or coerce required fields. Escalate or return a typed error.", "kind": "recall"},
                {"q": "What does fail-open to a safe default mean here?", "a": "The next hop is safe and still typed — stronger model, template, or error object — not raw prose on a machine API.", "kind": "apply"},
                {"q": "A mobile client crashed on a missing `citations` array after a cascade. Cause?", "a": "The fallback omitted the schema. Add a contract test on every hop.", "kind": "debug"},
                {"q": "Is returning raw model text a safe default?", "a": "Not for a schema route. It is a product bug.", "kind": "recall"},
                {"q": "How do you test this?", "a": "Force the small model to emit junk and assert the response still matches the public schema or the error union.", "kind": "apply"},
            ],
            links=L,
            walk="""You add a contract test on both hops. A chaos day that breaks the small model still returns valid JSON or a 422 the client handles.""",
            measure="""Schema-violating responses; cascade hops without a contract test.""",
        ),
        "central-auth-and-quotas": note(
            what="""**The gateway is where keys and budgets live, not in each service.** This item is the short form of centralising auth. Keys: one vault, short-lived if the vendor allows, never in app env files. Budgets: daily and per-minute, per feature and per tenant if needed, with a burst policy for interactive versus batch.

When a quota trips, the user sees a designed response, and you page if a production interactive route is starving.""",
            why="""It is the sentence security and finance both want. Interviewers use it to see if you have operated a gateway.""",
            how="""Vault → gateway at boot or via sidecar. Quota config as code. Interactive routes reserved capacity. Batch borrows leftovers. A 429 from the vendor is mapped to your quota language so apps do not retry on their own.""",
            fails="""1. **Keys in `.env` of six apps.**

2. **One budget for batch and chat.**

3. **Hard 429 with no user-visible design.**""",
            line="Keys and budgets live in the gateway. I do not copy vendor keys into services, and I split interactive and batch quotas so a job cannot starve chat.",
            kps=[
                "Keys in the gateway vault, not app env files.",
                "Budgets per feature and per class of traffic.",
                "Interactive capacity is reserved.",
                "Vendor 429s are translated so apps do not self-retry.",
                "Quota trip has a designed user response.",
                "Page when production chat is starving.",
            ],
            qs=[
                {"q": "Where do keys and budgets live?", "a": "In the gateway, backed by a vault, expressed as per-feature quotas. Not in each service's env.", "kind": "recall"},
                {"q": "How do you stop a batch job from starving chat?", "a": "Separate quotas and queues; reserved interactive capacity; batch uses leftovers.", "kind": "apply"},
                {"q": "A vendor 429 leaks to a client that retries for 30 s. What did the gateway miss?", "a": "Translating and absorbing retries, plus a deadline. The client should see a designed error or a queue.", "kind": "debug"},
                {"q": "What happens when a quota trips?", "a": "A designed response, a metric, and a page if it is a production interactive route.", "kind": "apply"},
                {"q": "Why not put the vendor key in each app 'for simplicity'?", "a": "Rotation, leakage, and no central budget. Simplicity at the start is an incident later.", "kind": "recall"},
            ],
            links=L,
            walk="""You pull keys from six repos into the vault and add two quotas. The nightly embed job no longer pages the chat SLO.""",
            measure="""Keys outside the vault; chat p95 during batch windows; quota-trip rate.""",
        ),
        "interview": note(
            what="""**Interview: design a gateway** is five beats: **route, fallback, log usage, pin snapshots, and hide keys from apps.** Draw one box. Arrows from three apps. Arrows out to two providers. Label those five. If you have time, add quotas and a cache. That is a pass.

Do not spend the time on Kubernetes. Spend it on policy and attribution.""",
            why="""This is the close of M9.3. Interviewers want the five labels more than a service mesh essay.""",
            how="""Spoken while drawing: 'Apps call routes, not models. The box routes and falls back per policy, logs tokens and cost per feature, pins snapshots, and holds the keys. Quotas live here so a job cannot starve chat.'""",
            fails="""1. **A blank 'API gateway' box** with no LLM-specific jobs.

2. **Keys still on the apps** in the drawing.

3. **No pin**, so `latest` is implied.""",
            line="I design a gateway that routes, falls back, logs usage, pins snapshots, and hides keys from apps. That is the picture. Quotas and cache if there is time. I do not start with Kubernetes.",
            kps=[
                "Five labels: route, fallback, usage, pin, hide keys.",
                "Apps call routes, not model names.",
                "Quotas and cache are the encore.",
                "An LLM gateway is not a generic API gateway slide.",
                "Do not leave keys on the app boxes.",
                "Pin means dated snapshots, not latest.",
            ],
            qs=[
                {"q": "Name the five beats of a gateway interview answer.", "a": "Route, fallback, log usage, pin snapshots, hide keys from apps. Then quotas if there is time.", "kind": "recall"},
                {"q": "What do apps call?", "a": "Internal routes like `support.answer`, not `gpt-x-latest`.", "kind": "apply"},
                {"q": "A candidate draws Nginx and sits down. What is missing?", "a": "LLM policy: model map, usage, pins, keys, fallbacks. A TCP proxy is not the answer.", "kind": "debug"},
                {"q": "Where are keys in the drawing?", "a": "Inside the gateway box, from a vault. Not on the app boxes.", "kind": "recall"},
                {"q": "How do you show a fallback without implying quality is equal?", "a": "A dashed arrow labelled 'only for route FAQ; legal refuses'.", "kind": "apply"},
            ],
            links=L,
            walk="""You draw the box, write five words, and stop. The interviewer asks about quotas; you add a sixth. That is the item.""",
            measure="""Practice drawings that include all five; designs that still have app-side keys.""",
        ),
    }
}
