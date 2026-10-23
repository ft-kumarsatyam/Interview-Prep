from helper import note
from links import OA_PROD, OA_SAFE, ANTH_GUARD, OA_SO

L = [OA_PROD, OA_SAFE]

NOTES = {
    "m9-6": {
        "designing-for-every-failure": note(
            what="""Design for **model failures, provider outages, tool failures, rate limits, malformed outputs, and retrieval misses** — not only the happy path. Each has a behaviour: retry with jitter, fall back, degrade, refuse, or queue. 'The model will behave' is not a design. A missing retrieval should not become a confident essay; a 429 should not become a 30-second client retry storm; a tool timeout should not leave a half-applied write.

Write the matrix: failure × response. That matrix is the reliability spec.""",
            why="""This is the difference between a demo and a service. Interviewers will kill a dependency and watch what you do.""",
            how="""Matrix rows: provider 5xx, provider 429, timeout, invalid JSON, retrieve empty, tool 5xx, guard timeout. Columns: retry?, fallback?, user message, page?. Example: retrieve empty → 'I could not find a source' plus search links, not a guessed policy.""",
            fails="""1. **Happy path only.**

2. **Retry everything 12 times.**

3. **Guessing when retrieval is empty.**

4. **No page** on a silent degrade that lasts an hour.""",
            line="I design for model, provider, tool, rate-limit, schema, and retrieval failures with an explicit matrix. Empty retrieval does not become a confident essay, and a 429 does not become a retry storm.",
            kps=[
                "Write a failure × response matrix.",
                "Cover model, provider, tools, 429s, schema, retrieval.",
                "Empty retrieve must not hallucinate a policy.",
                "Retries are bounded and deadline-aware.",
                "Some failures page; some degrade quietly.",
                "The happy path is not a spec.",
            ],
            qs=[
                {"q": "What should happen when retrieval returns nothing on a policy question?", "a": "Refuse or degrade to search/human — do not let the model invent the policy. Log the miss.", "kind": "apply"},
                {"q": "Which approach to retrying a failing LLM provider is most appropriate?", "a": "Bounded retries with jitter, sharing the remaining deadline, then a per-route fallback. Not an unbounded client loop.", "kind": "recall"},
                {"q": "A timeout is missing and a slow provider exhausts server threads. Best fix?", "a": "Deadlines on every hop, a circuit breaker, and a queue or shed load. Do not wait forever.", "kind": "debug"},
                {"q": "Name six failure classes this item wants on the matrix.", "a": "Model quality fail, provider outage, tool fail, rate limit, malformed output, retrieval miss.", "kind": "recall"},
                {"q": "When do you page versus degrade quietly?", "a": "Page when interactive SLOs or high-risk routes fail. Quietly degrade a non-critical rewrite feature to passthrough.", "kind": "apply"},
            ],
            links=L,
            walk="""You add the matrix to the design doc. Chaos day hits retrieve-empty and 429. The bot says it cannot find a source; chat does not melt. Two matrix cells were empty — those are the tickets.""",
            measure="""Matrix cells with no owner; retrieve-empty that still produced a policy claim; unbounded retries in code.""",
        ),
        "timeouts-circuit-breakers-queues": note(
            what="""**Timeouts, retries, fallbacks, circuit breakers, queues, and rate limits** are the standard reliability kit, applied to LLMs with care. Timeouts: every hop, remaining-deadline aware. Retries: only on idempotent or safe-to-dup calls, jittered, capped. Circuit breakers: stop calling a sick provider so you can degrade. Queues: absorb spikes and hold long jobs. Rate limits: protect you and the vendor.

LLMs make some retries expensive and some writes non-idempotent (a second refund). The kit is the same; the settings are not nginx defaults.""",
            why="""Interviewers want the kit named and specialised. On the job, the missing timeout is the 3 a.m. incident.""",
            how="""Provider client: 2 s timeout or remaining SLO, 2 retries on 429/5xx, breaker opens after N errors, queue for batch, 429 mapped to your quota. Refund tool: no retry without an idempotency key. Chat: shed load with a 'busy' when the breaker is open, do not stack users on a dead vendor.""",
            fails="""1. **No timeout.**

2. **Retrying a non-idempotent refund.**

3. **No breaker**, so you keep paying a dead vendor.

4. **A queue with no DLQ.**""",
            line="I put timeouts, bounded jittered retries, circuit breakers, queues, and rate limits on every LLM and tool hop, and I do not retry a non-idempotent write. Defaults from a web client are wrong here.",
            kps=[
                "Every hop has a timeout and a deadline.",
                "Retries are capped, jittered, and idempotent.",
                "Breakers stop paying a dead provider.",
                "Queues absorb spikes and long jobs.",
                "Do not retry refunds without an idempotency key.",
                "Web-client defaults are the wrong numbers.",
            ],
            qs=[
                {"q": "Why measure remaining deadline on a retry?", "a": "So you do not start a 2 s call when 100 ms remains on the user SLO. Fail instead.", "kind": "recall"},
                {"q": "When must you not retry?", "a": "Non-idempotent writes (refund, send) without a key, and when the breaker is open.", "kind": "apply"},
                {"q": "What does the circuit breaker buy you?", "a": "Fast failure and room to degrade instead of stacking threads and cost on a dead vendor.", "kind": "recall"},
                {"q": "A queue without a dead-letter queue fails how?", "a": "Poison messages loop forever. Long jobs need a DLQ and an owner.", "kind": "debug"},
                {"q": "How do rate limits differ at the gateway versus the vendor?", "a": "Yours protect tenants from each other and reserve interactive capacity; the vendor's protect their farm. You must honour both.", "kind": "apply"},
            ],
            links=L,
            walk="""You add deadlines and a breaker. The next vendor blip becomes a 10-second degrade, not a thread-pool death.""",
            measure="""Calls without a timeout; retries of non-idempotent writes; time-to-open a breaker in a drill.""",
        ),
        "guardrails-at-system-boundaries": note(
            what="""Place **guardrails at system boundaries**, not only inside the model: input to the app, retrieve, model I/O, **action** (the important one), and renderer. Enforcement of 'human approval before refund' lives in the executor, not in a sentence. Schema checks live on the way out of the model. ACL lives on retrieve. XSS controls live on the renderer.

A boundary guard is deterministic when it can be. The model is allowed to help with classification; it is not allowed to be the only lock on money.""",
            why="""This restates Level 8 in system-design language. Interviewers ask where the refund rule lives.""",
            how="""Diagram locks on five lines. Tests call the executor with a hostile model output and expect deny. Prompt text may mention the rule; the test does not read the prompt.""",
            fails="""1. **Refund limit in the prompt only.**

2. **Guards only at the chat box.**

3. **Renderer with no lock** because 'it is just markdown'.""",
            line="Guardrails sit on boundaries: input, retrieve, model I/O, action, renderer. The refund rule lives in the executor. I test with a hostile model output and I expect deny.",
            kps=[
                "Locks on input, retrieve, model I/O, action, renderer.",
                "Money and send live in the executor.",
                "Test with hostile model output.",
                "The model may classify; it may not be the only lock.",
                "A chat-box-only guard misses retrieval and tools.",
                "Renderer is a boundary, not a skin.",
            ],
            qs=[
                {"q": "Where should enforcement of 'human approval before refund' live?", "a": "In the executor / action boundary, as a pending object. Not only in the prompt.", "kind": "recall"},
                {"q": "Which is a guardrail at the action boundary?", "a": "AuthZ, amount limits, allow-lists, approval. Not a system-prompt sentence.", "kind": "apply"},
                {"q": "Why test with hostile model output?", "a": "To prove the boundary holds when the model is fully fooled. A refusal-based pass is brittle.", "kind": "debug"},
                {"q": "Name five boundaries that get a lock.", "a": "Ingress, retrieve, model input, model output / action, renderer (and logs if you treat them as a sink).", "kind": "recall"},
                {"q": "Why measure guardrail precision and recall?", "a": "So you know false blocks versus misses. A lock that blocks 20% of good refunds is a product incident.", "kind": "apply"},
            ],
            links=[OA_SAFE, ANTH_GUARD],
            walk="""You move the refund limit into the executor and add a hostile-output test. The prompt sentence stays as a hint.""",
            measure="""Consequential actions without an executor lock; hostile-output tests; precision/recall of probabilistic guards.""",
        ),
        "graceful-degradation": note(
            what="""When something is down, **do not take the whole product with it**. Degrade: simpler model, reduced functionality, cached answer, search or a form, human escalation, or an explicit 'I cannot do that right now'. The user should still complete a job or understand the next step.

Degrade is designed per route. FAQ can serve cache or search. Refunds should not serve a guessed amount from cache; they should queue or hand to a human. A down model is not a down website.""",
            why="""This is the reliability interview closer. On the job it is why support can still work during an OpenAI blip.""",
            how="""Feature flags: `generate` optional. If the model is down, the ticket page still searches the KB and offers 'email a human'. If the large model is down, the small one or a template runs. Tell the user when they are on a degraded path so they do not trust a cache like a live answer.""",
            fails="""1. **Hard-down the app** because the LLM client throws.

2. **Degrade refunds to a cached guess.**

3. **Silent degrade** that looks healthy.""",
            line="A down model should not take the product with it. I degrade to a simpler model, cache, search, a form, or a human — per route — and I tell the user when they are on a degraded path.",
            kps=[
                "Degrade per route; do not hard-down the app.",
                "FAQ may cache or search; refunds may not guess.",
                "Tell the user they are degraded.",
                "Simpler model, cache, search, form, human, or explicit no.",
                "A down LLM is not a down website.",
                "Silent degrade hides SLO burns.",
            ],
            qs=[
                {"q": "The LLM API is down. Which response best shows graceful degradation?", "a": "Search results plus a human path, or a cached safe FAQ, with a banner. Not a 500 on the whole app, and not a guessed refund.", "kind": "apply"},
                {"q": "Why not degrade refunds to the last cached amount?", "a": "Money must be live and authorised. Queue or hand to a human.", "kind": "debug"},
                {"q": "What should the user see on a degraded path?", "a": "A clear banner and a still-useful next step. Do not pretend you are at full quality.", "kind": "recall"},
                {"q": "How do you keep the website up when the SDK throws?", "a": "Catch at the feature boundary, not the process boundary. The rest of the app does not import the SDK on the request path if you can avoid it.", "kind": "apply"},
                {"q": "Name five degrade targets.", "a": "Smaller model, cache, search, form, human, or explicit inability.", "kind": "recall"},
            ],
            links=L,
            walk="""You wrap the composer so a vendor outage still shows KB search and 'create a ticket'. The status page says 'answers degraded'. Refunds go to the queue.""",
            measure="""App availability versus model availability; degraded-path usage; refunds served from cache (zero).""",
        ),
        "human-approval-for-high-risk-actions": note(
            what="""**Human approval for high-risk or irreversible actions** is a reliability and a safety control: it is how you fail closed when the model is down, unsure, or dangerous. The pending-action design from Level 8 belongs in the system diagram here. High-risk is a labelled set: send, pay, delete, deploy, legal send-outs.

Reliability angle: if the model is degraded, those actions stay behind the same gate; they do not flip to auto because the validator timed out.""",
            why="""System-design interviews must not 'forget' the human when they talk SLOs. On the job, fail-open on approval is an outage-shaped incident.""",
            how="""Risk label on the route. Executor requires `approval_id`. Guard timeout → no action. Degraded mode cannot skip the gate. SLOs for approval wait are separate from generation SLOs.""",
            fails="""1. **Auto-approve when the judge is down.**

2. **No pending object.**

3. **Mixing approval wait into the generation p95** and then removing approval to 'hit the SLO'.""",
            line="High-risk actions stay behind a human gate even when the model or a judge is down. I do not fail open to auto-send to save an SLO, and I measure approval wait separately from generation p95.",
            kps=[
                "High-risk set is labelled and gated.",
                "Guard or model down → no auto-action.",
                "Approval wait has its own SLO.",
                "Do not drop the gate to hit generation p95.",
                "Pending objects, not chat vapour.",
                "Reliability and safety share this control.",
            ],
            qs=[
                {"q": "The output moderator times out on a refund. What happens?", "a": "Fail closed: no refund, retry or human. Do not auto-send to save latency.", "kind": "apply"},
                {"q": "Why separate approval-wait SLO from generation p95?", "a": "So you do not delete the gate to make a latency dashboard green. Humans take seconds to minutes.", "kind": "debug"},
                {"q": "What is the reliability version of this control?", "a": "The same gate is the fail-closed path when models or judges are sick.", "kind": "recall"},
                {"q": "Can degraded mode skip approval?", "a": "No. Degraded mode may disable generation; it may not enable writes.", "kind": "apply"},
                {"q": "Where is the gate on the system diagram?", "a": "On the arrow from executor to the side-effecting system, labelled 'approval_id required'.", "kind": "recall"},
            ],
            links=L,
            walk="""A judge outage used to auto-send. You flip it to fail closed. Refund p95 looks worse; incidents look better. You split the SLOs.""",
            measure="""High-risk actions without approval_id; fail-open events; generation SLO that still includes human wait.""",
        ),
        "service-level-expectations": note(
            what="""Define **SLOs for availability, latency, and quality** — not only uptime. An LLM feature can be 100% up and 40% wrong. Quality SLOs use an online sample, a judge calibrated to humans, or a golden-set replay. Latency SLOs use p95 per route. Availability is 'usefully serving the intended path', not 'the process is up'.

Page on what users feel: error rate, p95, and a quality burn. Do not page on 'the vibe dropped' and do not skip quality because it is hard.""",
            why="""This is how you operate the system after the design interview. Interviewers ask what you page on.""",
            how="""Examples: availability 99.5% useful responses; p95 3 s on FAQ; citation-valid ≥ 90% on a 5% sample. Error budget: you can ship risky changes until quality or p95 burns the budget. A 100% uptime week with a citation crash is a failed week.""",
            fails="""1. **Uptime-only SLO.**

2. **Quality with no sample.**

3. **Paging on GPU utilisation.**

4. **One SLO for all routes.**""",
            line="I set SLOs on availability, p95, and quality, and I page on error rate and p95 — not on vibe or GPU utilisation. 100% uptime with wrong answers is a miss.",
            kps=[
                "SLOs: availability, latency, quality.",
                "Uptime alone is not enough.",
                "Page on error rate and p95 (and quality burns).",
                "Quality needs a sample and a calibrated judge or humans.",
                "Per-route SLOs, not one blob.",
                "Error budgets include quality.",
            ],
            qs=[
                {"q": "An SLO set only on uptime misses what?", "a": "Latency tails and quality. The feature can be up and unusable or wrong.", "kind": "recall"},
                {"q": "What do you page on?", "a": "Error rate and p95 (and a quality burn if you can compute it fast). Not vibe, not GPU busy.", "kind": "apply"},
                {"q": "How do you SLO quality without labelling every request?", "a": "A sampled online eval, a calibrated judge, plus a golden replay on each release.", "kind": "apply"},
                {"q": "Why per-route SLOs?", "a": "FAQ and refunds have different p95 and quality floors. A blend hides the scary one.", "kind": "debug"},
                {"q": "What is a useful availability definition?", "a": "Share of requests that received the intended useful path (including a designed degrade), not merely HTTP 200 from a spinner.", "kind": "recall"},
            ],
            links=L,
            walk="""You add a quality burn to the weekly SLO review. A week of 100% uptime and 80% citations is red. Prompt work gets the error budget, not a new banner.""",
            measure="""Routes with all three SLOs; pages that were vibe-only; quality sample rate.""",
        ),
        "degrade-to-search-or-a-form": note(
            what="""**A down model should not take the whole product with it** — the concrete degrade is often **search or a form**. Search: show KB hits the user can read. Form: structured ticket create, refund request, password reset — the job they came for. These paths should already exist; the model is an accelerator, not the only door.

If the only way to reset a password is to chat with a down model, you designed a single point of failure.""",
            why="""This is the product-shape item. Interviewers ask what the UI does when `generate` throws.""",
            how="""Every generative surface has a non-gen escape hatch in the same view. Feature flag hides the composer and enlarges search. Analytics treat hatch use as degrade, not as success equal to generation.""",
            fails="""1. **Composer-only UX.**

2. **Hatch buried three clicks away.**

3. **Counting hatch use as 'AI success'.**""",
            line="When the model is down I degrade to search or a form that still finishes the job. The model is an accelerator, not the only door, and the hatch is visible on the same screen.",
            kps=[
                "Search or a form is the default degrade.",
                "The hatch is on the same screen.",
                "The model is not the only door to the job.",
                "Do not count hatch use as generation success.",
                "Build the hatch before you need it.",
                "A chat-only password reset is a single point of failure.",
            ],
            qs=[
                {"q": "What is the default degrade when generation is down?", "a": "Search over the KB and/or the existing form for the job (ticket, reset, refund request), on the same screen.", "kind": "recall"},
                {"q": "Why must the hatch be visible without extra navigation?", "a": "Users in an outage will not hunt. If it is three clicks away, they bounce.", "kind": "apply"},
                {"q": "A password reset exists only inside the (down) assistant. What failed?", "a": "You made the model a single point of failure. Restore a form.", "kind": "debug"},
                {"q": "How do you analytics-tag hatch use?", "a": "As degrade, not as an AI win. Otherwise you hide outages.", "kind": "apply"},
                {"q": "When is a form better than search?", "a": "When the job is a write (reset, refund request) that search cannot finish.", "kind": "recall"},
            ],
            links=L,
            walk="""You add a search panel beside the composer and a 'use the form' link. The next outage barely moves ticket-create volume.""",
            measure="""Surfaces without a hatch; ticket-create volume during model down; bounce rate on composer-only pages.""",
        ),
        "slos-you-can-actually-page-on": note(
            what="""**Error rate and p95, not 'the vibe dropped'.** Pageable SLOs are computable in minutes from existing telemetry, have a threshold, and have an owner. Vibe is a Slack message. Quality can be pageable if you have a fast sample (citation-missing rate, schema-fail rate, judge score on a stream). If you cannot compute it, it is a weekly review, not a page.

Too many pages and people mute them. Too few and you learn from Twitter.""",
            why="""This is the on-call craft. Interviewers ask what wakes you at 3 a.m.""",
            how="""Page: 5xx or designed-error rate, p95 TTFT or complete, breaker open on the primary provider, schema-fail spike. Weekly: sampled judge scores, ASR, cost. Document why each page exists and how to silence it.""",
            fails="""1. **Paging on GPU busy.**

2. **No page on p95.**

3. **A quality page with a 6-hour lag** that always fires late.

4. **50 alerts**, all ignored.""",
            line="I page on error rate and p95 — things I can compute now — not on vibe. Slow quality metrics stay on the weekly review. If I cannot say who owns the page and how to silence it, it is not an SLO.",
            kps=[
                "Page on error rate and p95 (and fast quality proxies).",
                "Vibe is not pageable.",
                "Slow judges belong on a weekly review.",
                "Every page has an owner and a silence path.",
                "Too many pages become none.",
                "Schema-fail and breaker-open are good fast proxies.",
            ],
            qs=[
                {"q": "What two signals does this item want you to page on?", "a": "Error rate and p95. Optionally a fast quality proxy like schema-fail. Not vibe.", "kind": "recall"},
                {"q": "Why not page on a 6-hour delayed judge score?", "a": "You will always be late and you will mute it. Use it weekly; page on something faster.", "kind": "debug"},
                {"q": "Name two good fast quality proxies.", "a": "Schema validation fail rate and citation-missing rate on a stream. Also breaker-open.", "kind": "apply"},
                {"q": "What must a page document include?", "a": "Why it exists, the threshold, the owner, and how to silence it safely.", "kind": "recall"},
                {"q": "GPU utilisation spikes. Do you page?", "a": "Not by default. Page if interactive p95 or errors move. Utilisation is a capacity signal, not a user signal.", "kind": "apply"},
            ],
            links=L,
            walk="""You delete eight vibe alerts, keep p95 and error rate, add schema-fail. On-call becomes quieter and more relevant.""",
            measure="""Pages per week that were actionable; muted alerts; time-to-detect a real p95 burn.""",
        ),
    }
}
