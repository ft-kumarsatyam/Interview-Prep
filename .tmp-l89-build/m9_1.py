from helper import note
from links import OA_PE, OA_PROD, OA_FT, OA_LAT

L = [OA_PE, OA_PROD]

NOTES = {
    "m9-1": {
        "starting-from-requirements-constraints": note(
            what="""Every AI design starts by **pinning down what the system must do and what limits it lives under**, before naming a model or a vector database. Functional requirements: users, task (answer, extract, generate, act), input and output shape, what counts as correct. Non-functional: latency (interactive under ~2 s to first token versus batch overnight), volume and peak, cost ceiling per request, data sensitivity and residency, knowledge freshness, and how costly a wrong answer is.

Turn vague goals into **measurable acceptance criteria**: 'at least 90% judged correct on a 200-case set; p95 under 3 s; under $0.01 per successful ticket'. Those numbers later choose the model, the architecture, and the eval set. Skipping this is how teams pick an agent framework first and discover the latency budget or the DPA rules it out.""",
            why="""Interviews explicitly score the first minutes: clarifying questions. On the job, this is the difference between a design and a shopping list. A PM who says 'add an AI assistant' has not given you a problem yet.""",
            how="""Ask, write numbers, refuse to draw boxes until you have them.

Example. 'Summarise support tickets' at 50k/day and $0.002 each points to a small model and batch. 'Answer refund questions in chat' at 2 s p95 with legal risk points to retrieval, citations, and escalation. A design with a large model and five sequential calls for autocomplete missed the latency requirement — the architecture was illegal before it was drawn.""",
            fails="""1. **Framework first.** The graph looks modern and cannot meet p95.

2. **No cost-of-error.** You treat a typo and a wrong medical dose the same.

3. **Average latency** as the requirement.

4. **Forgetting privacy** until the vendor questionnaire.""",
            line="I start from users, task, quality bar, p95, volume, cost, and data constraints, and I write measurable acceptance criteria before I name a model. Architecture is a consequence of those numbers, not the other way around.",
            kps=[
                "Requirements and constraints drive the architecture.",
                "Write measurable criteria: quality, p95, cost per success.",
                "Ask data sensitivity, volume, and cost of a wrong answer early.",
                "Interactive versus batch is a different product.",
                "A missing latency budget makes a multi-call design illegal.",
                "Clarifying questions are scored in interviews.",
            ],
            qs=[
                {"q": "What questions do you ask before designing an AI feature?", "a": "Users and task, input/output shape, quality bar and cost of errors, latency target, volume and peak, budget per request, data sensitivity and compliance, knowledge freshness, and whether a human can review. Then write measurable acceptance criteria.", "kind": "recall"},
                {"q": "A PM says 'add an AI assistant to our app'. What do you do first?", "a": "Do not choose tools. Clarify the user job, success metric, failure cost, latency and cost limits and data constraints, then define an eval set and thresholds. Only then compare prompting, RAG, agents or fine-tuning.", "kind": "apply"},
                {"q": "A design uses a large model with five sequential calls for an autocomplete feature. What requirement was probably missed?", "a": "The latency budget. Autocomplete needs well under a second, so five sequential large-model calls cannot fit. A p95 target would have forced a small model, one call, or caching.", "kind": "debug"},
                {"q": "Why is cost of a wrong answer a first-class requirement?", "a": "It decides whether you need citations, a human, or can ship a cheaper model. A wrong product name and a wrong dosage are not the same architecture.", "kind": "recall"},
                {"q": "How do you turn 'be accurate' into an acceptance criterion?", "a": "A labelled set of size n, a judge or human protocol, a threshold, and a date. Example: 90% on 200 cases, re-run on every release.", "kind": "apply"},
            ],
            links=L,
            walk="""You spend twelve minutes asking questions. The PM wants a copilot; legal wants no health data leaving the region; p95 must be 3 s. You write three numbers on the board and only then sketch retrieve-and-generate. The agent framework stays in the parking lot.""",
            measure="""Design docs with numeric acceptance criteria; interviews where you asked before drawing; features that shipped without a p95 or a cost-of-error.""",
        ),
        "prompting-rag-agents-or-fine-tuning": note(
            what="""Four levers, ordered by cost and complexity. Pick the **cheapest that meets the acceptance criteria**. **Prompting** (instructions, examples, structured output) fixes behaviour, format, and tone. **RAG** adds knowledge the model lacks or that changes, with citations and easy updates. **Agents / tools** let the model choose actions when the path is not known in advance — more latency, cost, and failure modes. **Fine-tuning** changes behaviour, style, or distils a skill into a cheaper model; it does not reliably teach new facts.

Rule of thumb: missing knowledge → RAG; wrong behaviour or format → prompt, then fine-tune; unknown number of steps or side effects → agent. They combine: a small tuned model plus RAG plus one tool.""",
            why="""Interviewers probe the order you escalate. Fine-tuning to inject prices, or agents for a flowchart, are classic fails. On the job this ladder saves quarters.""",
            how="""Example. 40-page policy that changes monthly, JSON out: prompt plus schema, RAG or long context, re-index on change. No tune, no agent. Example. Prices: a tool or retrieve-at-request-time, not a tune on last quarter. Example. Unknown lookups that depend on earlier results: a tool loop with step and cost limits.""",
            fails="""1. **Fine-tune for facts** that then go stale.

2. **Agents for a fixed pipeline.**

3. **RAG when the whole corpus fits** and never changes — maybe just context.

4. **Skipping the prompt** because tuning feels more serious.""",
            line="I escalate prompt, RAG, tools or agents, then fine-tune, and I stop when the criteria are met. RAG is for knowledge; fine-tuning is for behaviour; agents are for unknown steps. I will not tune in last quarter's prices.",
            kps=[
                "Escalate: prompt, RAG, tools/agents, fine-tune.",
                "RAG is for knowledge; fine-tuning is for behaviour.",
                "Agents only when steps cannot be fixed in advance.",
                "They combine; they are not mutually exclusive.",
                "Facts that change belong in retrieval or tools.",
                "Stop when acceptance criteria are met.",
            ],
            qs=[
                {"q": "When is RAG better than fine-tuning?", "a": "When the need is knowledge that is private, large, or changing. RAG updates by editing the index, gives citations and access control, and avoids retraining. Fine-tuning suits behaviour, style, or distillation, not reliably adding facts.", "kind": "recall"},
                {"q": "A bot must answer from a 40-page policy that changes monthly and always return JSON. Which levers?", "a": "Prompting with a JSON schema for format and RAG (or long context) for the policy, re-indexed on change. No fine-tuning needed; maybe validation and retry. Agent loop unnecessary.", "kind": "apply"},
                {"q": "Team fine-tuned a model on last quarter's pricing so it 'knows' prices. What breaks?", "a": "Facts go stale and the model may still hallucinate prices; updating requires retraining. Prices should come from a tool or retrieval at request time.", "kind": "debug"},
                {"q": "A task has an unknown number of lookups depending on earlier results. Which approach fits?", "a": "A tool-using loop with step and cost limits. A single prompt cannot plan an unknown depth; a fully fixed graph may also fail if branches are data-dependent.", "kind": "apply"},
                {"q": "When is fine-tuning the right next cost?", "a": "When prompting cannot lock format or tone, you have labelled data and evals, volume justifies it, and facts still come from RAG or tools.", "kind": "recall"},
            ],
            links=[OA_PE, OA_FT],
            walk="""The team wants a multi-agent graph for FAQ. You run a prompted mid-size model plus retrieval on 200 cases: 88%. The gap is stale fees. You add a fee tool. 94%. You do not book GPUs.""",
            measure="""Features that skipped a cheaper lever; tunes whose failure was missing facts; agent loops that were later replaced by a flowchart.""",
        ),
        "quality-latency-cost": note(
            what="""The central triangle: improving one usually spends another. **Quality** rises with bigger models, more context, retrieval, reranking, self-checks, and multiple samples. **Latency** rises with those too. **Cost** scales with tokens times volume (input and output priced separately), plus tools.

Typical moves: small model by default, escalate hard cases; **stream** to improve perceived latency; **cache**; trim context and cap output; parallelise independent calls (latency down, cost same). Identify the **binding constraint** (often p95 or a legal quality floor) and optimise the others around it. Averages hide the tail.""",
            why="""This is the language of every design review. Interviewers want the binding axis and three techniques that cut cost without a large quality loss. On the job, a 9 s p95 with a 1.2 s average is a product that feels broken.""",
            how="""Worked (illustrative): large model costs 10× and takes 3×. If a small one handles 80% acceptably, blended cost is 0.8×1 + 0.2×10 = 2.8 versus 10, about 72% saved, hard 20% still get quality. Trace first: if decode dominates, cap output or stream; if retrieval dominates, shrink or cache; if TTFT dominates, cut prompt or cache the prefix.""",
            fails="""1. **Optimising average latency.**

2. **Quality with no cost or p95.**

3. **Parallelism** as a cost win — it is not.

4. **Streaming as a safety win** — it can leak before a check.""",
            line="I name the binding constraint — usually p95 or a quality floor — then I use routing, caching, and context cuts around it. I measure cost per successful task and p95, not averages alone.",
            kps=[
                "Identify the binding constraint, then optimise the other two.",
                "Routing and caching trade little quality for big cost wins.",
                "Measure p95/p99 and cost per successful task.",
                "Parallelism cuts latency, not cost.",
                "Streaming helps perceived latency, not safety.",
                "Trace before you guess which component dominates.",
            ],
            qs=[
                {"q": "Name three techniques that reduce cost without large quality loss.", "a": "Route easy requests to a smaller model, cache repeated or prefix-stable work, trim context and cap output tokens. Prompt compression and batching offline work also help.", "kind": "recall"},
                {"q": "Your assistant is accurate but p95 is 9 s and the target is 4 s. What options do you weigh?", "a": "Stream for perceived latency, parallelise independent calls, shrink context, move easy cases to a faster model, cache. Trace which component dominates and re-eval quality after each change.", "kind": "apply"},
                {"q": "A team reports 'average latency is 1.2 s, so we are fine' while users complain. What is wrong?", "a": "Averages hide the tail. Slow requests (long contexts, retries, tool loops) dominate perception. Track p95/p99 per route and component.", "kind": "debug"},
                {"q": "Why is blended routing often a ~70% cost win in the 80/20 case?", "a": "Most traffic is easy. Paying 10× on 20% and 1× on 80% beats 10× on 100%. Illustrative: 2.8 versus 10 units. Measure on your mix.", "kind": "recall"},
                {"q": "When must quality win the triangle?", "a": "When the cost of a wrong answer is legal, medical, or financial. Then you spend latency and money, and you say so in the requirements.", "kind": "apply"},
            ],
            links=[OA_LAT, OA_PROD],
            walk="""Tracing shows decode is 80% of a 5 s path. You cap output, stream, and route 70% to a small model. p95 falls under 4 s; the eval drops 1 point, still above the floor.""",
            measure="""p95 and p99 per route; cost per successful task; share routed to the small model; quality on the same eval after each change.""",
        ),
        "baseline-before-sophistication": note(
            what="""Start with the **simplest thing that could work**, measure it, and add complexity only where measurement shows a gap. A baseline might be one well-written prompt on a mid-size model, no retrieval, no agents, on a small golden set. Often it is close. Failure analysis tells you what to add: wrong facts → retrieval; wrong format → structured output; inconsistent behaviour → examples or a tune; multi-step → a fixed pipeline or a tool.

A **non-AI baseline** (rules, keyword search, template) is worth testing; sometimes it wins. Complex graphs have more failure modes and slower iteration. Every added component must prove quality gained versus latency and cost spent.""",
            why="""Interviewers want 'I would ship a baseline and an eval first'. On the job, this stops a quarter of platform work that does not move the number.""",
            how="""Week 1: 150 labelled cases, one prompt, one model, a score. 78% versus 90% target. Failures are outdated facts — add retrieval, not agents. Re-run the same set. If you are at 89%, stop and ship. If format is the residue, add a schema, not a second agent.""",
            fails="""1. **Full architecture first**, no eval.

2. **Adding a reranker** because a talk mentioned it, with no ablation.

3. **Changing the eval** whenever the system looks bad.

4. **Ignoring the keyword-search baseline.**""",
            line="I ship a simple baseline and an eval set first, then I add the component the error analysis names. Each sophistication has to beat the baseline on quality per latency and cost. I will also try a non-LLM baseline.",
            kps=[
                "Build the simplest baseline and an eval set first.",
                "Add components only when error analysis shows the gap.",
                "Compare against non-LLM baselines too.",
                "Do not change the eval to make a graph look good.",
                "Ablate: prove the reranker earned its latency.",
                "Stop when criteria are met.",
            ],
            qs=[
                {"q": "Why start with a baseline before a sophisticated architecture?", "a": "It gives a measured reference so each added component must justify its latency, cost, and complexity, and error analysis shows what to add. It also ships value sooner.", "kind": "recall"},
                {"q": "Baseline scores 78% on your eval set, target 90%. Failures are mostly outdated facts. Next step?", "a": "Add retrieval or tool access to fresh sources, then re-run the same eval set. Do not add agents or fine-tuning; the error category is knowledge freshness.", "kind": "apply"},
                {"q": "Why build an evaluation set before adding components to a baseline?", "a": "So you can attribute quality changes to each component and stop when criteria are met. Without a fixed metric you cannot tell whether a reranker helped.", "kind": "recall"},
                {"q": "A team added a graph and the score rose 2% while p95 doubled. What do you do?", "a": "Ablate the new nodes. If the 2% is one component, keep that one. If none justify the latency, revert to the baseline plus that slice.", "kind": "debug"},
                {"q": "When does a keyword-search baseline win?", "a": "When queries are unique ids or exact titles and the LLM only wraps them. Ship search plus a template; do not pay for a 20-step agent.", "kind": "apply"},
            ],
            links=L,
            walk="""You refuse the multi-agent design for a week. The baseline plus retrieval hits 91%. You ship it. The graph becomes a later experiment with an ablation plan.""",
            measure="""Ablations actually run; components with no quality delta still in prod; time from idea to a scored baseline.""",
        ),
        "constraints-before-components": note(
            what="""**Latency, cost, privacy, and audit beat a fashionable diagram.** This item is the mindset: write the constraints on the board before the boxes. A graph of agents is not a design if it cannot meet 2 s p95, a $0.01 budget, a residency pin, or an audit of who approved a send. Components are how you meet constraints, not the starting vocabulary.

Fashionable means: multi-agent, 1M context, a new gateway, a fine-tune, a memory graph. Any of those can be right after the numbers exist. None of them are a first move.""",
            why="""This is how you interrupt a whiteboard that started with 'we'll use framework X'. Interviewers reward the interruption.""",
            how="""Order: constraints (p95, $, region, oversight) → levers (prompt/RAG/tools/tune) → components (which store, which model, which queue). Example: privacy says no public API; that constraint deletes three boxes before you draw them. Audit says approvals; that adds a pending-action box you might have skipped.""",
            fails="""1. **Diagram first, numbers later.**

2. **Copying last company's architecture.**

3. **Treating 1M context as free.**

4. **Privacy as an appendix.**""",
            line="Constraints before components: I write p95, cost, privacy, and audit on the board first. A fashionable graph that misses those is not a design. Components are how I meet the numbers.",
            kps=[
                "Write p95, cost, privacy, and audit before boxes.",
                "Fashionable components are last, not first.",
                "Constraints delete boxes as often as they add them.",
                "Do not copy another company's diagram.",
                "1M context is a constraint, not a gift.",
                "Privacy is not an appendix.",
            ],
            qs=[
                {"q": "What four constraints does this item put before components?", "a": "Latency, cost, privacy, and audit. Then you may name models and stores.", "kind": "recall"},
                {"q": "A teammate starts by drawing a multi-agent graph. What do you do?", "a": "Ask for p95, cost per request, data class, and whether actions need an audit trail. Then keep or delete nodes.", "kind": "apply"},
                {"q": "Why can a 1M-context model still be the wrong component?", "a": "Prefill latency, cost, and injection surface grow with junk in the window. The constraint may demand selection, not a bigger fence.", "kind": "debug"},
                {"q": "How does a residency constraint delete components?", "a": "Any vendor or region that cannot pin is off the board, including 'just for fallback'.", "kind": "apply"},
                {"q": "What belongs on the board in the first two minutes?", "a": "Users, task, p95, $, data class, cost of error. Not a framework logo.", "kind": "recall"},
            ],
            links=L,
            walk="""You write four numbers, then three boxes. The original twelve-box draft is in the appendix as 'rejected for p95 and residency'.""",
            measure="""Designs that list constraints above the diagram; rejected components with a written reason.""",
        ),
        "baseline-then-one-sophistication": note(
            what="""**Ship retrieve-and-generate before agents or graphs.** This is the operational form of baseline-before-sophistication: the first production architecture is usually a prompt, a retriever, a validator, and a stream — not a planner. One sophistication means you add the *one* component the errors named (a reranker, a tool, a small tune), not a platform.

Agents and graphs are a later sophistication when the task is truly open-ended. Most internal copilots never need them.""",
            why="""It is the sentence that keeps a v1 shippable. Interviewers use it to see if you can stop.""",
            how="""v1: retrieve, generate, cite, validate JSON. v1.1: add a reranker if recall was the gap. v1.2: add a fee tool if facts were the gap. Do not add a supervisor agent in v1.1 'while we are in there'.""",
            fails="""1. **Platform in v1.**

2. **Two sophistications at once**, so you cannot attribute.

3. **Calling a graph the baseline** because the tutorial started there.""",
            line="I ship retrieve-and-generate first, then I add one sophistication the errors named. Agents and graphs wait until the task is actually open-ended. Two changes at once are not an experiment.",
            kps=[
                "v1 is retrieve-and-generate, not a graph.",
                "Add one component per iteration.",
                "Agents wait for truly open-ended tasks.",
                "Two changes at once cannot be attributed.",
                "A tutorial graph is not a baseline.",
                "Stop when the eval clears the bar.",
            ],
            qs=[
                {"q": "What is the default v1 this item wants?", "a": "Retrieve, generate, cite, validate. Not a multi-agent graph.", "kind": "recall"},
                {"q": "Why only one sophistication at a time?", "a": "So you can attribute the quality and latency change. Two at once is a guess.", "kind": "apply"},
                {"q": "When do you add an agent after v1?", "a": "When error analysis shows an unknown number of tool steps that a fixed pipeline cannot express, and the eval still misses that slice.", "kind": "apply"},
                {"q": "The tutorial started with a supervisor agent. What do you do?", "a": "Ignore it for v1. Tutorials optimise for showing the framework, not for your p95.", "kind": "debug"},
                {"q": "How do you record the decision to stop?", "a": "Eval score versus target, residual error categories, and a written 'we will not add X until Y'.", "kind": "recall"},
            ],
            links=L,
            walk="""v1 ships in two weeks: RAG plus schema. The graph stays on a branch until a labelled set of multi-step cases exists and fails the pipeline.""",
            measure="""v1s that included a graph without an ablation; iterations that changed two things; residual categories with no owner.""",
        ),
        "interview": note(
            what="""**Interview: 30-minute design** is a spoken agenda: **requirements, options, pick, trade-offs, eval, and what you would cut**. You spend the first minutes on requirements (this module), you list two or three options on the ladder, you pick one against the numbers, you name what you spent on the triangle, you describe the eval set, and you say what you drop if the deadline moves a week left.

That agenda is the product of M9.1. If you start drawing a gateway in minute two, you failed the agenda even if the gateway is good.""",
            why="""This is how staff interviews are scored. The agenda is the skill. On the job it is the same six headings in a design doc.""",
            how="""Minute 0–8: questions and numbers. 8–14: options (prompt+RAG vs agent vs tune). 14–20: pick and diagram the minimum. 20–25: trade-offs and failure modes. 25–28: eval and rollout. 28–30: cut list. Practise with a timer.""",
            fails="""1. **Drawing first.**

2. **No cut list.**

3. **No eval.**

4. **One option** so there is no pick.""",
            line="In a 30-minute design I do requirements, options, pick, trade-offs, eval, and what I would cut. I spend the first minutes on numbers, and I will not start with a fashionable diagram.",
            kps=[
                "Agenda: requirements, options, pick, trade-offs, eval, cut.",
                "First minutes are clarifying questions.",
                "Always present at least two options.",
                "Name the triangle spend of the pick.",
                "Describe the eval set and the threshold.",
                "End with what you drop if time is short.",
            ],
            qs=[
                {"q": "What six beats does a 30-minute design interview want?", "a": "Requirements, options, pick, trade-offs, eval, and a cut list. Numbers before boxes.", "kind": "recall"},
                {"q": "How do you spend the first eight minutes?", "a": "Users, task, p95, cost, data, cost of error, volume. Write the acceptance criteria. Do not draw yet.", "kind": "apply"},
                {"q": "A candidate draws a perfect gateway in minute two. What did they miss?", "a": "Requirements and options. The gateway may be right later; the agenda was wrong.", "kind": "debug"},
                {"q": "What is a good cut-list sentence?", "a": "If the deadline moved a week left I would ship retrieve-and-generate without the reranker and without the agent loop, and I would keep the eval and the ACL filter.", "kind": "apply"},
                {"q": "Why list options if you already know the pick?", "a": "To show you rejected them for reasons tied to the numbers, not because you only know one shape.", "kind": "recall"},
            ],
            links=L,
            walk="""You practise the six headings on a support-copilot prompt. At minute 30 you have numbers, a pick, and a cut. That is the muscle this item wants.""",
            measure="""Practice runs that hit all six beats; interviews that started with a diagram (do not).""",
        ),
    }
}
