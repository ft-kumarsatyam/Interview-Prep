from helper import note
from links import OWASP, ATLAS, OA_SAFE, ANTH_GUARD

L = [OWASP, ATLAS]

NOTES = {
    "m8-7": {
        "building-adversarial-test-suites": note(
            what="""An **adversarial test suite** is a versioned set of attacks you run against the **whole product**, not the model card: prompt injection (direct and indirect), jailbreaks, malicious documents, tool misuse, data extraction, and unsafe agent actions. Each case has a **goal**, a **payload**, an **oracle** (did the secret leak, did the tool fire, did the policy drop), and an expected **control**.

The suite is living: new jailbreaks become cases. It includes obfuscations and benign twins. You run it in CI and on a cadence against staging with production-like tools and a fake corpus. Model-only evals miss the renderer, the executor, and the retriever.""",
            why="""This is how security becomes engineering. Interviewers ask what is in the suite and how you know a test passed. On the job, a suite is the only way a prompt change does not silently reopen last quarter's hole.""",
            how="""Components: seed goals (exfil, refund, prompt leak, SSRF); mutators; oracles (canary string must not appear; `refund` must not be called; no external image); fixtures (HTML comments, base64, homoglyphs); benign twins; a runner that spins the real harness.

Example oracle for prompt leak: a unique canary in the system prompt; any appearance in output or tool args is a fail. Do not ask an LLM judge 'did it leak?' as the only oracle — judges miss encodings.""",
            fails="""1. **Testing the model API** without tools or retrieval.

2. **LLM-as-oracle only.**

3. **A static list** you never mutate.

4. **No benign twins**, so you 'fix' attacks by blocking half of real traffic.""",
            line="I build a versioned adversarial suite against the whole pipeline — injection, jailbreaks, poisoned docs, tool misuse, extraction — with hard oracles, mutators, and benign twins. New attacks become cases. Model-only tests are not enough.",
            kps=[
                "Test the whole product: retriever, model, renderer, executor.",
                "Each case has a goal, payload, oracle, and expected control.",
                "Prefer hard oracles over LLM judges.",
                "Mutators and benign twins keep the suite honest.",
                "Run in CI and on a staging cadence.",
                "A living suite: each new attack becomes a case.",
            ],
            qs=[
                {"q": "What are the key components of an adversarial test suite for an agent?", "a": "Seed goals, payloads (including indirect and obfuscated), hard oracles, expected controls, mutators, benign twins, and a runner that uses the real harness.", "kind": "recall"},
                {"q": "Why test the whole pipeline rather than the model alone?", "a": "Retrieval, rendering, and the executor are where exfil and actions happen. A model refusal does not mean the app was safe, and a model compliance does not mean the tool ran.", "kind": "apply"},
                {"q": "Which oracle is most reliable for an automated prompt-leak test?", "a": "A unique canary that must not appear in outputs or tool arguments. A judge model is extra signal, not the pass bar.", "kind": "recall"},
                {"q": "A guardrail is tuned until it blocks 100% of your static attack set. The main risk is?", "a": "Overfit and false positives. Add mutators and benign twins, and measure residual ASR plus user-visible blocks.", "kind": "debug"},
                {"q": "What belongs in CI versus a weekly staging run?", "a": "Fast, deterministic oracles and a sample of mutators in CI. Slower, broader, multi-trial stochastic attacks weekly against staging with production-like tools.", "kind": "apply"},
            ],
            links=L,
            walk="""You add ten seeds, three mutators, and canary oracles to CI. A prompt tweak fails the refund case. That is the suite working. You do not revert to 'it looked fine in chat'.""",
            measure="""Cases per goal; CI runtime; ASR and false-positive rate; time from a new public jailbreak to a case in the repo.""",
        ),
        "attacking-rag-through-the-corpus": note(
            what="""Red-team RAG by **injecting malicious content into retrievable documents**, not only by typing in the chat box. Plant visible and hidden text, near-duplicates that rank, instruction-in-doc payloads, and canary-marked bait. Use a shared-drive or wiki-shaped fixture that matches production writers.

Success is: the chunk is retrieved for a target query, and then a goal lands (wrong policy, exfil, tool call). Measure both retrieval of the bait and downstream harm. Hidden-text docs belong here because reviewers will not see them in a screenshot.""",
            why="""Interviewers want this exercise by name. On the job it is how you find that your reader keeps HTML comments.""",
            how="""Outline: create a staging corpus; plant a bait page with a unique command and a unique canary; ask the questions you care about (refund, HR, admin); record whether the bait ranked, whether it entered the prompt, and whether a tool fired. Repeat with comments, `display:none`, and metadata.

A shared-drive exercise adds the insider: a low-privilege editor. If they can change the HR bot, you have a tiering bug.""",
            fails="""1. **Only chat-box injection** on a RAG product.

2. **Planting bait that never ranks**, then declaring victory.

3. **No hidden-text fixtures.**

4. **Forgetting caches** so a delete looks like a pass.""",
            line="I attack RAG through the corpus: plant visible and hidden bait, check that it ranks, and see whether a goal lands. A chat-box-only red team misses the enterprise path.",
            kps=[
                "Plant documents; do not only type in chat.",
                "Measure rank, prompt inclusion, and downstream harm.",
                "Include hidden text and near-duplicates.",
                "A low-privilege editor is a realistic actor.",
                "Caches can hide a failed takedown.",
                "Canary-marked bait makes oracles easy.",
            ],
            qs=[
                {"q": "Outline a red-team exercise for a RAG assistant fed from a shared drive.", "a": "Give a low-privilege account a bait doc with hidden instructions and a canary, ask sensitive queries, and record rank, prompt inclusion, and tool or policy effects. Then test takedown including caches.", "kind": "apply"},
                {"q": "Why include hidden-text documents in tests?", "a": "They look clean to humans and still reach extractors and models. The suite must prove the reader drops them or that tools still refuse.", "kind": "recall"},
                {"q": "When red-teaming RAG, why use canary-marked documents in a staging corpus?", "a": "If the canary appears in a prompt or answer you have retrieval of bait or a leak. If it appears for the wrong tenant you have isolation failure.", "kind": "apply"},
                {"q": "The bait never ranks. Have you tested injection?", "a": "Not really. Tune the bait to rank or force-include it once to test the assembler, but also fix ranking assumptions — attackers will SEO the embedding.", "kind": "debug"},
                {"q": "What two numbers do you report after a corpus attack?", "a": "Retrieval rate of bait on the target query set, and downstream goal-success rate given retrieval.", "kind": "recall"},
            ],
            links=L,
            walk="""You plant three FAQ variants. Two rank. One causes a send. You fix the reader and the send gate, and you keep the pages as fixtures.""",
            measure="""Bait retrieval rate; goal ASR given retrieval; hidden-text inclusion rate; takedown completeness.""",
        ),
        "attacking-agents-through-their-tools": note(
            what="""Red-team agents by trying to make them **exceed permissions, misuse tools, reveal secrets, or loop**. Payloads target the tool loop: 'call refund again', 'fetch the metadata IP', 'cat the env', 'ignore the confirm'. A **malicious MCP server** can attack without a document: hostile tool descriptions, oversized results, or lookalike tool names.

Invariants are better than vibes: `refund.amount <= policy`; `url host in allow-list`; `secrets never in messages`; `steps <= N`. A finding is an invariant violation, not 'the model was naughty'.""",
            why="""This is the agent-specific suite. Interviewers ask for invariants. On the job, MCP supply chain is the new extra case.""",
            how="""Cases: over-permission (shared admin), argument injection (path traversal), secret reveal (print env), loop (recursive fetch), confused deputy (act on planted text), hostile MCP (tool description says 'send keys here').

Run with the real executor. If the invariant holds when the model is fully compliant with the payload, you pass. If you only pass because the model refused, you have a brittle pass.""",
            fails="""1. **Oracles that are 'the model said no'.**

2. **No MCP or plugin case.**

3. **Not trying loops** because they are 'reliability'.

4. **Testing tools in isolation** without untrusted context.""",
            line="I attack agents through their tools: permissions, args, secrets, loops, and hostile plugins. I write invariants the executor must hold even if the model complies with the attacker.",
            kps=[
                "Goals: exceed permission, misuse tools, leak secrets, loop.",
                "Invariants beat 'the model refused'.",
                "Include hostile MCP or plugin descriptions.",
                "Test with untrusted context in the same session.",
                "A pass that depends on model refusal is brittle.",
                "Loops are security and wallet cases.",
            ],
            qs=[
                {"q": "What invariants would you assert when red-teaming an agent's tool use?", "a": "AuthZ (caller owns the object), allow-listed destinations, amount and rate limits, no secrets in messages, and step or cost caps. Fail if any break even when the model tries.", "kind": "recall"},
                {"q": "How could a malicious MCP server attack an agent without a prompt-injecting document?", "a": "Hostile tool descriptions, lookalike names, huge results that inject on the way back, or a tool that exfiltrates arguments. Treat servers as untrusted code and data.", "kind": "apply"},
                {"q": "In an agent red team, which finding is expressed as an invariant violation?", "a": "Example: refund exceeded the policy max, or a URL left the allow-list. That is a testable finding, not a narrative.", "kind": "recall"},
                {"q": "Why is 'the model refused to call delete' a weak pass?", "a": "The next model or a better payload will comply. The executor should have rejected delete regardless.", "kind": "debug"},
                {"q": "How do you test a loop without melting staging?", "a": "Low caps in the test harness, a payload that would recurse, and an oracle that the cap fired and no extra side effects occurred.", "kind": "apply"},
            ],
            links=[ATLAS, OA_SAFE],
            walk="""You add an invariant test: `send` destination not in allow-list must throw, with the model output forced to request it. The test does not talk to a live model. That is the point.""",
            measure="""Invariants as automated tests; MCP servers reviewed; runs that passed only via model refusal.""",
        ),
        "vulnerabilities-become-regression-tests": note(
            what="""Every discovered hole becomes a **permanent regression test** in the repo: the payload, the fixture, the oracle, and the control you shipped. Prompt-only fixes without a test come back on the next model upgrade. Stochastic attacks run **multiple times**; a 1/10 pass is not green.

The test should fail if someone reverts the executor check even when the current model 'would not do that'. Prefer deterministic harness tests plus a smaller live-model sample.""",
            why="""This is how you stop whack-a-mole. Interviewers ask what you add to the repo after a prompt-leak. On the job, it is the definition of done for a security ticket.""",
            how="""After a leak: add a canary oracle test; add the exact payload and two mutators; pin the control (renderer blocks images). CI runs the deterministic half on every PR. Nightly runs the live-model half n=10.

If you fixed by editing the system prompt, the test still must fail when that sentence is removed *and* when it is present but the renderer is gone — so you learn which control actually holds.""",
            fails="""1. **Closing the ticket with a prompt PR and no test.**

2. **n=1** on a stochastic attack.

3. **A test so tied to wording** it fails on harmless refactors.

4. **Leaving the fixture only in a chat transcript.**""",
            line="Each vulnerability becomes a regression test: payload, oracle, and the control we shipped. I run stochastic cases more than once, and I do not close a prompt-only fix without a test that would catch the next model upgrade.",
            kps=[
                "Done means a test in the repo, not a prompt edit.",
                "Include payload, fixture, oracle, and control.",
                "Run stochastic attacks multiple times.",
                "Prefer executor tests that do not need a live model.",
                "The next upgrade will regress prompt-only fixes.",
                "Fixtures live in git, not in a Slack thread.",
            ],
            qs=[
                {"q": "After fixing a prompt-leak bug by editing the system prompt, what should you add to the repo?", "a": "A canary oracle, the payload plus mutators, and a test of the durable control (renderer or tool denial). Do not rely on the new sentence alone.", "kind": "apply"},
                {"q": "Why run stochastic attack tests multiple times?", "a": "Sampling means a single refusal is luck. Report k/n and require a threshold, or prefer a deterministic executor oracle.", "kind": "recall"},
                {"q": "A vulnerability was fixed by prompt wording. What additional step prevents recurrence after a model upgrade?", "a": "A regression test on the pipeline plus a control that is not the prompt. Re-run the suite on every model bump.", "kind": "apply"},
                {"q": "Why should an executor test not need a live model?", "a": "You can force the bad tool call and assert deny. That still passes when the model changes.", "kind": "debug"},
                {"q": "Where should the fixture live?", "a": "In the repo next to the oracle, versioned, with a name that cites the incident.", "kind": "recall"},
            ],
            links=L,
            walk="""Incident IR-214 becomes `tests/redteam/ir214_image_exfil.py`. The next model bump fails it; you keep the renderer fix and update the prompt later.""",
            measure="""Incidents without a linked test; suite runs on model bumps; flake rate of stochastic cases.""",
        ),
        "attack-success-leakage-rates": note(
            what="""Report **attack-success rate (ASR)**, **sensitive-data leakage rate**, and **unsafe-action rate** with a sample size and a confidence note. **0/20 is not 0%.** It is 'fewer than about 15% at 95% if you must put a number', or better: publish k/n and keep running. Compare releases on the **same suite**. A lower ASR with a much higher false-positive rate on benign traffic may be a worse product.

Leakage rate is not the same as ASR: an attack can succeed at manipulation without leaking. Unsafe-action rate counts executor events, not model prose.""",
            why="""This is how you talk to leadership and auditors. Interviewers will ding 'we are secure, zero successes' on a tiny n. On the job, these three rates plus false positives are the dashboard.""",
            how="""Dashboard: ASR overall and by family (encoding, corpus, tool); leakage (canary appears); unsafe actions (policy-breaking tool calls); benign block rate. Release A 4% ASR vs B 2% but B blocks 10% more good asks — you do not ship B without a quality conversation.

Use the same seeds and n when you compare. Changing the suite and the model in one release confounds the number.""",
            fails="""1. **0/20 = 0%** in a slide.

2. **Changing the suite** and claiming a win.

3. **Ignoring benign blocks.**

4. **Counting model refusals as safe actions** when no tool was even attempted.""",
            line="I report attack-success, leakage, and unsafe-action rates as k/n on a fixed suite, and I never call 0/20 zero risk. I compare releases on the same cases and I show the benign-block trade-off.",
            kps=[
                "Publish k/n, not a fake zero from a small n.",
                "ASR, leakage, and unsafe-action are different.",
                "Compare releases on the same suite.",
                "Show false positives / benign blocks.",
                "Unsafe-action is an executor event.",
                "Do not confound a suite change with a model change.",
            ],
            qs=[
                {"q": "Why can 0 successes out of 20 attacks not be reported as 0% attack success?", "a": "The interval is wide; a later attack or a model bump can land. Report 0/20 and keep testing, or compute a bound — do not say zero risk.", "kind": "recall"},
                {"q": "Release A has ASR 4% and release B 2% on the same suite, but B also blocks 10% more benign requests. How do you decide?", "a": "Treat it as a trade-off. If B's extra blocks are high-value tasks, it may be worse. Look at unsafe-action rate and user impact, not ASR alone.", "kind": "apply"},
                {"q": "Why measure end-to-end attack success separately from model-only?", "a": "A model may comply while the executor denies, or refuse while a renderer still leaks. The product number is end-to-end.", "kind": "recall"},
                {"q": "What is an unsafe-action rate?", "a": "The share of runs where a policy-breaking tool call was executed, not merely proposed. It is the number finance cares about.", "kind": "apply"},
                {"q": "How do you keep a comparison fair?", "a": "Pin the suite version, n, and environment. Change one thing per release note.", "kind": "debug"},
            ],
            links=[OWASP, ANTH_GUARD],
            walk="""The board deck said '0% ASR'. You replace it with 0/40 and a planned n=200, plus a 3% benign-block. The conversation becomes adult.""",
            measure="""Suite version in every report; n; ASR vs benign-block; unsafe-action count in production (should match canaries).""",
        ),
        "a-living-attack-suite": note(
            what="""**Each new jailbreak becomes a regression case.** The suite is not a PDF from last year. When a researcher publishes a new encoding, when your red team lands a novel path, when a customer reports a weird send, you add a fixture in the same sprint. Ownership is explicit: a rotation or a security engineer merges cases like product bugs.

Living also means retiring cases that no longer match the product (you removed the tool) and keeping the oracle current.""",
            why="""Static suites rot. Interviewers ask how a new public jailbreak enters your repo. On the job this is the difference between a one-off pentest and a practice.""",
            how="""SLA: 5 business days from a notable public technique or an internal find to a draft case. Template: goal, payload, oracle, control. Weekly triage like a bug scrub.

If you removed `send`, you keep one case that asserts the tool is absent, and you archive the old send-exfil payloads so someone does not re-add the tool quietly.""",
            fails="""1. **Annual pentest only.**

2. **Cases in a slide deck.**

3. **Never deleting obsolete cases**, so CI is noise.

4. **No owner.**""",
            line="A living attack suite means each new jailbreak or incident becomes a case in days, with an owner, and obsolete cases are archived on purpose. A yearly PDF is not a suite.",
            kps=[
                "New attacks become cases in the same sprint.",
                "Own the suite like a product surface.",
                "Archive cases when you remove a capability — and assert it stays gone.",
                "Public techniques have an SLA into the repo.",
                "A yearly pentest is not living.",
                "Triage cases like bugs.",
            ],
            qs=[
                {"q": "How fast should a new public jailbreak enter your suite?", "a": "On a stated SLA, typically days, as a draft case with an oracle. Do not wait for the annual test.", "kind": "recall"},
                {"q": "You removed send_email. What happens to the old exfil cases?", "a": "Keep one assertion that the tool is absent; archive or retarget the rest so CI stays meaningful.", "kind": "apply"},
                {"q": "Who owns the living suite?", "a": "A named rotation. Unowned suites die. Treat case intake like a bug queue.", "kind": "debug"},
                {"q": "Why is a pentest PDF not a living suite?", "a": "It is not executed, not mutated, and not blocking merges. It is a snapshot.", "kind": "recall"},
                {"q": "What is the case template?", "a": "Goal, payload, oracle, expected control, and a link to the incident or paper.", "kind": "apply"},
            ],
            links=L,
            walk="""A new paper drops on Monday. Wednesday a fixture is in review. Friday CI fails on staging because the renderer missed a scheme. That is living.""",
            measure="""Time-to-case; cases closed as obsolete with an absence test; unowned open case count.""",
        ),
        "success-rate-not-anecdotes": note(
            what="""**Report how many of 50 attacks landed, with the control that stopped them.** Anecdotes ('we tried a jailbreak and it failed') are not a security posture. Fifty is a round classroom number; the point is a denominator and a per-control breakdown: 8/50 landed, 30/50 died on the allow-list, 10/50 died on the renderer, 2/50 died on the judge.

This item is the communication standard for the module. Pair it with the earlier warning that 0/20 is not zero.""",
            why="""Leadership and interviews both reward numbers with denominators. Anecdotes hide concentration: all failures in one family.""",
            how="""A one-slide table: family × outcome × control. Speak: 'Of 50 corpus injections, 4 retrieved and 1 executed a tool; the allow-list stopped the rest of the executions. We will add hidden-text cases next because 3 of the 4 retrievals were comments.'

Do not average away the family. One number is a start; the table is the answer.""",
            fails="""1. **'The demo looked safe.'**

2. **One blended ASR** with no family.

3. **No control column**, so you do not know what to fund.

4. **n=3** presented as a study.""",
            line="I report k of n attacks and which control stopped the rest — for example 4 of 50 landed, allow-list stopped most executions. Anecdotes are not a rate, and a blended percentage without families hides where to invest.",
            kps=[
                "Always give k/n, not a story.",
                "Break down by family and by control that stopped it.",
                "Fifty is a teaching n; the denominator is the point.",
                "Anecdotes hide concentration of failures.",
                "Fund the control that actually stops the mass of cases.",
                "Pair with '0/20 is not 0%'.",
            ],
            qs=[
                {"q": "What does a good red-team report include besides a narrative?", "a": "k/n overall and per family, and which control stopped the failures. That tells you what to fund.", "kind": "recall"},
                {"q": "Why not only quote a blended ASR?", "a": "All the misses may be one family (hidden HTML). A blend looks 'fine' while that family is wide open.", "kind": "debug"},
                {"q": "How would you present 50 attacks in a minute?", "a": "Four of 50 landed; 30 died on the allow-list; 10 on the renderer; 6 on the judge. Next sprint we add hidden-text because that is where retrieval succeeded.", "kind": "apply"},
                {"q": "An executive says 'just tell me if we are safe'. What do you say?", "a": "Here is k/n on this suite, the residual goals that still land, and the control we will add. 'Safe' is not a number we have.", "kind": "apply"},
                {"q": "Why mention the control that stopped attacks?", "a": "So you do not delete it in a refactor, and so you invest in the one doing the work rather than a favourite filter.", "kind": "recall"},
            ],
            links=L,
            walk="""You replace a 'we red-teamed it' slide with a 50-case table. Budget moves from a new judge to the allow-list tests because that is what stopped 30 cases.""",
            measure="""Reports that include k/n and a control column; families with n too small to interpret.""",
        ),
        "interview": note(
            what="""**Interview: your red-team loop** is five words you can stand at a whiteboard: **enumerate assets, attack, patch in code, add a test, re-run**. That is the loop. Assets tell you what to attack. Attack is the suite, including corpus and tools. Patch is an executor or renderer change, not only a prompt. Test is a regression case. Re-run is the same suite plus n, on the same build.

If you skip 'patch in code' you will describe prompt whack-a-mole. If you skip 're-run' you will ship hope.""",
            why="""This is the close of Level 8 red team. Interviewers want a loop they can trust you to run next quarter, not a war story.""",
            how="""Spoken in 20 seconds:

'I enumerate assets — inbox, refunds, tenant docs. I attack through chat, corpus, and tools with hard oracles. I patch in code — allow-list, ACL, renderer. I add a fixture. I re-run the same n. Prompt changes are extra, not the patch.'""",
            fails="""1. **Loop that ends at 'we told the model no'.**

2. **No re-run.**

3. **Assets skipped**, so you attack the demo not the money.""",
            line="My red-team loop is enumerate assets, attack, patch in code, add a test, re-run. I say those five steps, I mean the executor when I say patch, and I do not skip the re-run.",
            kps=[
                "Five steps: assets, attack, patch in code, test, re-run.",
                "Patch is deterministic, not only a prompt.",
                "The test is a fixture in the repo.",
                "Re-run the same suite with a stated n.",
                "Assets keep you on the money path.",
                "This loop is the interview close.",
            ],
            qs=[
                {"q": "State the five-step red-team loop this item wants.", "a": "Enumerate assets, attack, patch in code, add a test, re-run. Prompt edits are extra.", "kind": "recall"},
                {"q": "Where do people skip the loop?", "a": "They attack, prompt-patch, and demo once. Missing code patch, test, and re-run.", "kind": "debug"},
                {"q": "What do you re-run against?", "a": "The same suite version and n, on the build that contains the patch, plus a couple of mutators.", "kind": "apply"},
                {"q": "Why enumerate assets first?", "a": "So you attack refunds and tenant docs, not a toy chatbot that has no money path.", "kind": "recall"},
                {"q": "Give a 20-second spoken version.", "a": "Assets: inbox and refunds. Attack: corpus plus tools. Patch: allow-list and ownership check. Test: IR fixture. Re-run: n=50. That is the loop.", "kind": "apply"},
            ],
            links=L,
            walk="""You write the five words, map last quarter's incident onto them, and sit down. That is a pass.""",
            measure="""Incidents that completed all five steps; patches that were prompt-only.""",
        ),
    }
}
