from helper import note
from links import OA_PROD, OA_PE, VERTEX

L = [OA_PROD, OA_PE]

NOTES = {
    "m9-8": {
        "wiring-evals-feedback-into-production": note(
            what="""Connect **evals, traces, operational metrics, and user feedback** into the production architecture so they are not a side project. Traces emit the ids evals need (prompt version, chunk ids, model snapshot). Feedback writes to the same case store evals read. Operational metrics (p95, cost, errors) sit on the same route tags. A weekly loop reads all four.

If evals live in a notebook and feedback in a spreadsheet, you do not have a system. You have folklore.""",
            why="""This is how continuous improvement becomes real. Interviewers ask how a production fail becomes a case.""",
            how="""Shared `Case` object: input, output, labels, source (`eval|thumb|implicit|incident`), versions. Writers: nightly eval, thumbs, implicit miner, on-call. Readers: the eval runner and the weekly review. Trace ids join them.""",
            fails="""1. **Four disconnected tools.**

2. **No versions on traces**, so evals cannot attribute.

3. **Feedback that never becomes a case.**""",
            line="I wire evals, traces, ops metrics, and feedback into one case store with versions. A production fail becomes a case, not a Slack anecdote. Folklore is not a loop.",
            kps=[
                "One case store; four writers.",
                "Traces carry versions and chunk ids.",
                "Feedback becomes a case, not a spreadsheet row.",
                "Ops metrics share route tags with evals.",
                "The weekly loop reads all four.",
                "Notebooks and folklore are not wiring.",
            ],
            qs=[
                {"q": "What four streams does this item connect?", "a": "Evals, traces, operational metrics, and user feedback — joined by versions and a case store.", "kind": "recall"},
                {"q": "How does a production fail become an evaluation case?", "a": "The trace plus the label (human or implicit) is written to the case store with versions, then the suite picks it up.", "kind": "apply"},
                {"q": "Why do traces need prompt and model versions?", "a": "Otherwise you cannot attribute a regression to a change. 'Quality dropped' is not actionable.", "kind": "debug"},
                {"q": "What is the smell of unwired feedback?", "a": "Thumbs in a product DB, evals in a notebook, incidents in Slack, no join key.", "kind": "recall"},
                {"q": "Who reads the case store?", "a": "The eval runner and the weekly improve review. If only a human reads it, it will rot.", "kind": "apply"},
            ],
            links=L,
            walk="""You add `Case` and join thumbs to traces. Next week three thumbs are new eval rows. The prompt change is scored against them before it ships.""",
            measure="""Cases with a source and versions; thumbs that never became cases; evals that cannot join to a trace.""",
        ),
        "what-to-monitor": note(
            what="""Monitor **quality, latency, cost, errors, retrieval behaviour, tool usage, and model/provider performance** — not only HTTP 200. Quality: sample scores, citation rate, thumbs. Latency: TTFT and p95 per route. Cost: $ per success and per feature. Errors: 5xx, schema fail, designed refuse. Retrieval: hit count, empty rate, forbidden-id canaries. Tools: count, deny, approve. Provider: error rate, model_id mix, fallback share.

A dashboard with seven panels is the design. A single green uptime is not.""",
            why="""Uptime-only monitoring is how wrong answers ship silently. Interviewers ask what is on the board.""",
            how="""One board per product, seven rows. Alerting from M9.6 on the fast ones. Weekly read on quality and retrieval slices. When a model_id mix shifts, you already have the panel.""",
            fails="""1. **Uptime only.**

2. **Quality with no sample.**

3. **Cost as a monthly invoice** with no route tag.

4. **Retrieval with no empty-rate.**""",
            line="I monitor quality, latency, cost, errors, retrieval, tools, and providers — per route. Uptime alone is how silent wrongness ships. The board has seven panels, not one green dot.",
            kps=[
                "Seven families: quality, latency, cost, errors, retrieval, tools, provider.",
                "Per route, not one blob.",
                "Empty-retrieve and forbidden-id are retrieval panels.",
                "Cost is $ per success, tagged.",
                "Provider mix and fallback share are first-class.",
                "Uptime-only is a miss.",
            ],
            qs=[
                {"q": "Uptime is 100% yet users report wrong answers. Which monitoring is missing?", "a": "Quality (and maybe retrieval empty-rate or citation-miss). Uptime does not see wrongness.", "kind": "debug"},
                {"q": "Name the seven monitoring families.", "a": "Quality, latency, cost, errors, retrieval, tool usage, model/provider performance.", "kind": "recall"},
                {"q": "What retrieval signals belong on the board?", "a": "Hits per request, empty rate, and canary/forbidden-id leaks.", "kind": "apply"},
                {"q": "Why tag cost by feature?", "a": "So a research experiment cannot hide inside the chat bill.", "kind": "recall"},
                {"q": "What provider panel would have caught a silent fallback?", "a": "model_id mix or fallback share, plus quality sliced by model_id.", "kind": "apply"},
            ],
            links=L,
            walk="""You add empty-retrieve and model_id mix. A week later you see a fallback spike and a citation dip on the same hours. That is a wired board.""",
            measure="""Panels present; routes missing quality; invoices that cannot split by feature.""",
        ),
        "explicit-implicit-feedback": note(
            what="""Capture **explicit** feedback (thumbs, ratings, 'report wrong') and **useful implicit** signals (edits, regenerates, abandoned answers, copy-paste, time-to-next-message, escalation to a human). Explicit is sparse and biased. Implicit is plentiful and noisy. Together they label production.

Implicit is not surveillance theatre: pick signals that mean something for this product. A regenerate after 2 s is a different label than a long copy-paste.""",
            why="""This is how you get labels without waiting for thumbs. Interviewers ask for an implicit example.""",
            how="""Schema: `signal, weight, case_id`. Thumbs ±1. Regenerate within 5 s + negative. Edit of the answer + strong negative on the span. Escalation + negative on resolution. Weekly, humans review a sample of implicit labels to calibrate.""",
            fails="""1. **Thumbs only.**

2. **Every click is a label** with no calibration.

3. **Implicit that includes PII** you should not store.

4. **Treating no-thumb as positive.**""",
            line="I capture thumbs and implicit signals — edits, regenerates, abandons, escalations — and I calibrate them. No-thumb is not a win, and not every click is a label.",
            kps=[
                "Explicit is sparse; implicit is plentiful and noisy.",
                "Edits, regenerates, abandons, escalations are labels.",
                "Calibrate implicit on a human sample.",
                "No-thumb is not positive.",
                "Do not store implicit that is just more PII.",
                "Signal and weight live on the case.",
            ],
            qs=[
                {"q": "Give an implicit feedback example.", "a": "User regenerates within a few seconds, edits the answer, abandons, or escalates to a human. Treat as a noisy negative and calibrate.", "kind": "recall"},
                {"q": "Why not treat no-thumb as positive?", "a": "Most users never click. You would label the world good and hide failures.", "kind": "debug"},
                {"q": "How do you keep implicit from being junk?", "a": "A small set of signals, weights, and a weekly human calibration sample.", "kind": "apply"},
                {"q": "Which implicit is strongest for a support copilot?", "a": "Escalation after the bot answered, or an agent rewriting the draft heavily.", "kind": "apply"},
                {"q": "What must you not log as implicit?", "a": "Raw extra PII you would not otherwise keep — e.g. the whole next email body — unless it is already in-scope.", "kind": "recall"},
            ],
            links=L,
            walk="""You add regenerate-within-5s as a case source. Calibration shows it is 70% true-negative. You use it to mine, not to auto-grade.""",
            measure="""Explicit rate; implicit-to-case rate; calibration precision of each signal.""",
        ),
        "failures-become-evaluation-cases": note(
            what="""**Every production failure and useful feedback row becomes a case** in the eval set — with a de-duplication and privacy pass. The loop is: fail → label → add → run on the next build → prevent regression. A single failing case that you fix by editing the prompt **must** enter the suite or the next model bump will bring it back.

Do not add raw PII. Redact. Do not add 400 near-duplicates; cluster.""",
            why="""This is the immune system. Interviewers ask what you do after a one-off prompt fix.""",
            how="""Button on the trace: 'add to eval'. Pipeline redacts, assigns an id, and opens a PR or writes to the store. Nightly run includes it. The prompt PR that 'fixed' it is blocked until the case is green.""",
            fails="""1. **Fix and forget.**

2. **Adding raw tickets** to a public repo.

3. **A 10,000-case pile** of duplicates that nobody trusts.""",
            line="Failures become evaluation cases. A prompt-only fix without a case is not done. I redact, I de-dupe, and I block the fix PR until the case is in the suite.",
            kps=[
                "Fail → label → add → run → no regression.",
                "Prompt fixes require a case.",
                "Redact PII; do not dump tickets into git.",
                "De-dupe near-copies.",
                "A button on the trace beats a cultural hope.",
                "The suite is the memory of incidents.",
            ],
            qs=[
                {"q": "A single failing production case is fixed by editing the prompt. What must you do next?", "a": "Add a redacted case to the suite and prove the new prompt passes it. Otherwise the next bump regresses.", "kind": "apply"},
                {"q": "Why de-dupe?", "a": "A pile of twins makes scores noisy and slow. Cluster and keep exemplars plus a few variants.", "kind": "recall"},
                {"q": "How do you add a case without leaking PII?", "a": "Redact in the pipeline, review, then store. Never paste a raw ticket into the repo.", "kind": "debug"},
                {"q": "What product feature makes this reliable?", "a": "An 'add to eval' action on the trace that opens a reviewed case.", "kind": "apply"},
                {"q": "Why is the suite the memory of incidents?", "a": "People leave; Slack scrolls away. Cases stay and fail CI.", "kind": "recall"},
            ],
            links=L,
            walk="""IR-88 becomes `eval/ir88.json` in the same PR as the prompt fix. CI is red until both land. A month later a model bump fails ir88; you keep the prompt.""",
            measure="""Incidents without a case; prompt PRs without a new case; PII in the suite.""",
        ),
        "versioning-for-traceable-regressions": note(
            what="""**Version models, prompts, retrieval configs, and application changes** so a regression can be attributed. Every answer carries `model_id, prompt_id, retriever_id, app_sha`. Evals run against a build. When quality drops on Tuesday, you diff those four, not the org chart.

Versioning is not 'v2' in a wiki. It is an id in the trace and a pin in the gateway.""",
            why="""This is how you debug a quality regression in an hour instead of a week. Interviewers ask how you attribute.""",
            how="""Gateway pins `model_id`. Prompt store has immutable ids. Retriever config is a hash of index snapshot + params. App SHA from deploy. The eval report prints all four. Rollbacks are a pin revert.""",
            fails="""1. **`latest` everywhere.**

2. **Prompt in code with no id.**

3. **Index rebuilt with no snapshot id.**

4. **A quality drop with no join key.**""",
            line="I version models, prompts, retrieval configs, and app SHAs on every answer so a regression is a diff, not a mystery. Pins beat `latest`. Rollback is a pin revert.",
            kps=[
                "Four ids: model, prompt, retriever, app.",
                "They ride on every trace and eval report.",
                "Pins, not latest.",
                "Rollback is reverting a pin.",
                "Index rebuilds get a snapshot id.",
                "Attribution is a join, not a meeting.",
            ],
            qs=[
                {"q": "Which change best attributes a quality regression to a cause?", "a": "Pin and log model, prompt, retriever, and app versions so you can diff Tuesday against Monday.", "kind": "recall"},
                {"q": "Best rollout method for a new retrieval configuration?", "a": "A versioned pin, a canary or percentage, and a compare on the same eval — not an unversioned rebuild of prod.", "kind": "apply"},
                {"q": "Prompt lives as a string in a handler. What is missing?", "a": "An immutable id and a store. You cannot say which wording served.", "kind": "debug"},
                {"q": "How do you rollback a bad model?", "a": "Revert the gateway pin to the last green snapshot, after the eval says so.", "kind": "apply"},
                {"q": "Why is `latest` a versioning bug?", "a": "The world can change on a Thursday without a deploy or an eval.", "kind": "recall"},
            ],
            links=L,
            walk="""Tuesday dips. You join traces: `retriever_id` changed, model did not. You revert the pin. That is versioning as operations.""",
            measure="""Answers missing a version; uses of latest; time-to-attribute a dip.""",
        ),
        "deploy-observe-improve-redeploy": note(
            what="""The loop is **deploy → observe → collect feedback → evaluate → improve → redeploy**. It is the operating system of an AI product. Deploy with pins and a canary. Observe the seven panels. Collect explicit and implicit feedback. Evaluate (offline suite + sample). Improve the one thing the errors name. Redeploy with a new pin.

Skipping observe or evaluate turns the loop into 'ship vibes'. Skipping improve-from-cases turns it into 'we have dashboards'.""",
            why="""This is the close of M9.8. Interviewers want the loop named in order.""",
            how="""A weekly ritual: 30 minutes on the board, 15 on new cases, 15 on the next pin. Cadence can be faster for a hot route. The order does not change when you hurry.""",
            fails="""1. **Deploy and ghost.**

2. **Improve without evaluate** (prompt roulette).

3. **Evaluate without deploying** (a perfect notebook).

4. **No owner of the loop.**""",
            line="The loop is deploy, observe, collect feedback, evaluate, improve, redeploy. I run it on a cadence with an owner. Dashboards without improve, or prompt roulette without evaluate, are not the loop.",
            kps=[
                "Name the six steps in order.",
                "Canary deploy; observe seven panels; cases; eval; one improve; new pin.",
                "An owner and a cadence.",
                "Do not skip evaluate or observe.",
                "Hurry does not change the order.",
                "A perfect notebook that never deploys is not a loop.",
            ],
            qs=[
                {"q": "State the continuous-improvement loop in order.", "a": "Deploy → observe → collect feedback → evaluate → improve → redeploy.", "kind": "recall"},
                {"q": "Which skip turns the loop into prompt roulette?", "a": "Improve without evaluate (and without cases).", "kind": "debug"},
                {"q": "What does a weekly ritual contain?", "a": "Board review, new cases, next pin — with an owner.", "kind": "apply"},
                {"q": "Why canary on deploy?", "a": "So observe can see a slice before 100% of users eat a bad pin.", "kind": "apply"},
                {"q": "Who owns the loop if nobody is named?", "a": "Nobody. The loop dies. Name a rotation.", "kind": "recall"},
            ],
            links=L,
            walk="""You put the six words on the team wiki and assign a weekly owner. Two cycles later a citation regression is caught on canary, not on Twitter.""",
            measure="""Cycles per month; canary catches; improves without an eval delta.""",
        ),
        "implicit-feedback": note(
            what="""**Edits, regenerates, and abandoned answers are labels.** This item is the short form of implicit feedback. Treat them as first-class events with timestamps and the answer they rejected. A regenerate is a dislike of *that* output, not of the product. An edit is a span-level gold if you store the diff. An abandon is weaker — they may have been interrupted.

Mine them; do not auto-punish a model on abandon alone.""",
            why="""It is the phrase to drop in an interview when they ask for implicit examples.""",
            how="""Event log: `{type: regen|edit|abandon, t, answer_id, diff?}`. Join to the case miner. Humans label a sample of edits as gold rewrites.""",
            fails="""1. **Ignoring edits** because thumbs exist.

2. **Treating abandon as a fire.**

3. **Not storing the rejected answer.**""",
            line="Edits, regenerates, and abandoned answers are labels. I mine them as events, I treat edits as possible gold, and I do not auto-grade on abandon alone.",
            kps=[
                "Regen = dislike of that output.",
                "Edit = possible span-level gold.",
                "Abandon is weak; do not auto-punish.",
                "Store the rejected answer.",
                "Sample and human-label edits.",
                "Thumbs are not a substitute for this stream.",
            ],
            qs=[
                {"q": "What three implicit events does this item name?", "a": "Edits, regenerates, and abandoned answers.", "kind": "recall"},
                {"q": "Why is an edit especially valuable?", "a": "The diff is a rewrite you can turn into a gold span, after a privacy pass.", "kind": "apply"},
                {"q": "Why not auto-grade on abandon?", "a": "Users leave for many reasons. Use it to mine, then human-label.", "kind": "debug"},
                {"q": "What must you store with a regenerate?", "a": "The rejected answer and time, joined to versions.", "kind": "apply"},
                {"q": "How do implicit events relate to thumbs?", "a": "They fill the sparse thumbs. They do not replace a calibrated explicit channel.", "kind": "recall"},
            ],
            links=L,
            walk="""You start storing diffs. Ten edits become gold rewrites after review. The next prompt is judged on them.""",
            measure="""Events stored; edits that became gold; auto-grades on abandon (should be zero).""",
        ),
        "a-weekly-improve-loop": note(
            what="""**Mine failures, add cases, ship a prompt, watch online.** That is the weekly loop in one breath. Monday: mine implicit and incidents. Tuesday: add redacted cases. Wednesday: one improve (usually a prompt or a retrieve tweak). Thursday: eval + canary. Friday: watch the seven panels. If the improve is bigger than a prompt, it still follows the same week or it becomes a project with the same steps.

The loop is small on purpose. A monthly rewrite is not a loop.""",
            why="""It is the operating cadence interviewers want to hear you own.""",
            how="""Calendar plus a checklist. One owner. A max of one production pin a week unless you are burning an SLO. Write what you did in the release notes with versions.""",
            fails="""1. **No calendar.**

2. **Five improves a week** with no attribution.

3. **Watching without shipping.**

4. **Shipping without watching.**""",
            line="The weekly loop is mine failures, add cases, ship a prompt, watch online. One owner, one pin, written versions. A monthly rewrite is not a loop.",
            kps=[
                "Mine, add cases, ship, watch — weekly.",
                "One owner and usually one pin.",
                "Bigger work still uses the same steps.",
                "Write versions in the notes.",
                "A calendar beats a hope.",
                "Five unattributed improves are roulette.",
            ],
            qs=[
                {"q": "State the weekly improve loop in one breath.", "a": "Mine failures, add cases, ship a prompt, watch online.", "kind": "recall"},
                {"q": "Why usually one pin a week?", "a": "So you can attribute the online change. Five pins are a guess.", "kind": "apply"},
                {"q": "What if the improve is a retriever rewrite?", "a": "Same steps, maybe a longer canary. It is still mine–case–ship–watch, not a mystery launch.", "kind": "apply"},
                {"q": "Watching without shipping fails how?", "a": "Dashboards without a change are a museum. The loop includes a pin.", "kind": "debug"},
                {"q": "Who owns Friday's watch?", "a": "The same weekly owner, with a backup. Unowned Fridays skip.", "kind": "recall"},
            ],
            links=L,
            walk="""You book a recurring 45-minute slot. Four weeks later the suite is 30 cases richer and citation rate is up 4 points. That is a loop.""",
            measure="""Weeks with a pin and a note; cases added per week; unowned weeks.""",
        ),
    }
}
