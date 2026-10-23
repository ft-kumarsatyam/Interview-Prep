from helper import note
from links import OA_PROD, OA_FN, OA_SO, OA_PE

L = [OA_PROD, OA_FN]

NOTES = {
    "m9-7": {
        "the-end-to-end-flow": note(
            what="""Design the **end-to-end flow** among retrieval, models, tools, agents, guardrails, caches, and external systems as a **pipeline you can draw**. Boxes have sync or async labels. Arrows have schemas. The user path is short: retrieve (cached?), generate (streamed?), validate, render. Side paths: ingest, embed, eval, memory write — queued.

If you cannot draw it without crossing arrows into a hairball, you have too much agent and not enough pipeline. The flow is the product.""",
            why="""This is the orchestration interview. On the job it is the on-call map.""",
            how="""One diagram: Client → API → (cache) → retrieve → assemble → model → validate → stream. Dashed: ingest workers, eval workers, approval resume. You should be able to point to where a ticket sits for each request.""",
            fails="""1. **A blob called 'agent'.**

2. **Ingest on the request thread.**

3. **No schema on arrows.**

4. **Eval in the user path.**""",
            line="I draw the end-to-end flow: retrieve, generate, validate, stream on the user path; ingest, embed, and eval on queues. If I cannot draw it, I do not understand the orchestration yet.",
            kps=[
                "Draw every box: retrieve, model, tools, guards, caches, extras.",
                "User path is short and sync or streamed.",
                "Ingest and eval are async.",
                "Arrows have schemas.",
                "A hairball means too much agent.",
                "You should know where a ticket sits.",
            ],
            qs=[
                {"q": "Which steps belong on the user request thread?", "a": "Retrieve (maybe cached), assemble, generate, validate, render. Not ingest, not full eval, not a 10-minute research loop.", "kind": "recall"},
                {"q": "Main benefit of separating ingestion from the serving path?", "a": "Serving p95 does not wait on parse/embed, and a bad doc dies in a DLQ instead of a user request.", "kind": "apply"},
                {"q": "What does a schema on an arrow buy you?", "a": "Independent evolution, validation, and the ability to swap a box.", "kind": "recall"},
                {"q": "A 8-minute research job is on the request thread. What do you change?", "a": "Queue it, return a job id, stream or notify later. Sync HTTP cannot hold that.", "kind": "debug"},
                {"q": "How do you keep the drawing honest?", "a": "One trace id that visits the same boxes. If a box is on the diagram but not in traces, it is fiction.", "kind": "apply"},
            ],
            links=L,
            walk="""You redraw a hairball into a line plus three workers. p95 becomes explainable. The agent loop is one optional box, not the whole page.""",
            measure="""User-path boxes that are actually sync; ingest on the request thread; traces that skip drawn boxes.""",
        ),
        "deterministic-vs-model-delegated-decisions": note(
            what="""Decide **which decisions are deterministic code** and which you **delegate to the model**. Deterministic: authZ, amounts, routing tables, schema checks, ACL, timeouts, 'is this a refund route'. Delegated: phrasing, which of three already-allowed docs to quote, whether a question is in scope *as a signal*. 

**Model proposes, code disposes** is the slogan. If you can write the rule in ten lines, do not spend a token on it. Ten sequential 95% model decisions are ~60% end-to-end — that is why you do not delegate the spine.""",
            why="""This is the judgement interviewers want. On the job it is how you keep a pipeline reliable.""",
            how="""List decisions. Tick D or M. Refund limit D; tone M; retrieve filter D; which paragraph to quote M (with a grounding check D). If a D is implemented as a prompt, move it.""",
            fails="""1. **AuthZ in the prompt.**

2. **A chain of seven model calls** that could be a flowchart.

3. **Treating a classifier as D** without measuring it.""",
            line="I put deterministic decisions in code — authZ, limits, ACL, schema — and I let the model propose phrasing and selection inside those fences. Model proposes, code disposes. I will not spend tokens on a ten-line rule.",
            kps=[
                "D versus M is an explicit list.",
                "AuthZ, amounts, ACL, schema are D.",
                "Phrasing and selection can be M inside fences.",
                "Model proposes, code disposes.",
                "A chain of 95% steps is a reliability hole.",
                "A ten-line rule does not need a model.",
            ],
            qs=[
                {"q": "In 'model proposes, code disposes', who enforces refund limits?", "a": "Code. The model may suggest an amount; the executor applies the limit.", "kind": "recall"},
                {"q": "Which step should typically be deterministic code rather than an LLM call?", "a": "AuthZ, tenant filter, schema validation, amount caps, timeouts. Not 'write a friendly sentence'.", "kind": "apply"},
                {"q": "Ten dependent steps each 95% reliable give roughly what end-to-end success?", "a": "About 0.95^10 ≈ 60%. That is why the spine should be D.", "kind": "recall"},
                {"q": "A teammate uses a model to check if the user owns the order. What do you do?", "a": "Replace with a DB lookup. That decision is D.", "kind": "debug"},
                {"q": "When is a classifier allowed as a signal?", "a": "When a D check still follows (escalate, extra review). Not as the only lock on money.", "kind": "apply"},
            ],
            links=L,
            walk="""You highlight seven prompt rules and move four into code. The remaining three are tone. Reliability stops depending on a wording.""",
            measure="""D decisions still in prompts; length of model-delegated chains; 0.95^n stories in reviews.""",
        ),
        "sync-async-queued-or-long-running": note(
            what="""Choose **synchronous, asynchronous jobs, queues, or long-running workflows** on purpose. Sync: the user is waiting and the work is seconds (FAQ). Async/queue: embeddings, evals, ingest, anything that can wait. Long-running: research agents, multi-step tools with approvals — a job with state, resume, and a budget.

Vercel-style request limits and user patience both cap sync. A 8-minute job on the request thread is a bug. Approvals make a workflow long-running even if each model call is fast.""",
            why="""This is the execution-model question. Interviewers will give you an 8-minute research task.""",
            how="""Table: FAQ sync+stream; embed nightly queue; research job object with steps and a worker; approval wait is a state machine, not an open HTTP connection.""",
            fails="""1. **Everything sync.**

2. **Everything an agent loop** with no job record.

3. **Holding a connection for a human.**""",
            line="I choose sync for the user path that is seconds, queues for ingest and evals, and a stateful job for long-running or approval-wait work. I will not hold an HTTP request for eight minutes or for a human.",
            kps=[
                "Sync for short user waits; queue for the rest.",
                "Long-running work is a job with state.",
                "Approvals are a state machine, not an open socket.",
                "Request-time limits are a design input.",
                "Evals and embeddings are not on the user thread.",
                "An 8-minute research call is a job id.",
            ],
            qs=[
                {"q": "A job takes ~8 minutes and involves many LLM calls. Best execution model?", "a": "A queued long-running job with state, budget, and notify or stream-from-job. Not a single HTTP request.", "kind": "apply"},
                {"q": "What belongs on a queue even if it is fast?", "a": "Ingest, embed, eval, anything that can spike and should not steal interactive capacity.", "kind": "recall"},
                {"q": "Why not hold HTTP open for an approval?", "a": "The human may take ten minutes. Persist a pending action and resume on a webhook.", "kind": "debug"},
                {"q": "How does a research job survive a deploy?", "a": "State in a store, workers that resume, and a budget. In-memory loops die on deploy.", "kind": "apply"},
                {"q": "When is sync still right?", "a": "When the user is waiting and you can finish within the SLO — FAQ, short extract, one tool.", "kind": "recall"},
            ],
            links=L,
            walk="""You move research to a job table. Deploys stop killing 20-minute runs. FAQ stays sync and streamed.""",
            measure="""Requests over N seconds; jobs without resume; embeddings on the user thread.""",
        ),
        "avoiding-unnecessary-agentic-complexity": note(
            what="""**If you can draw the branches, code the branches.** An agent is for an unknown graph of steps. A flowchart that is known — retrieve, answer, cite, validate — is a deterministic pipeline with at most one model call (or a fixed two). Unnecessary agentic complexity adds failure modes, latency, cost, and a harder eval, usually for a demo.

Avoiding it is a design skill, not a fear of agents. When the eval's remaining misses are truly open-ended tool use, then you add a loop with caps.""",
            why="""This is the 'why not a graph' answer. Interviewers love it.""",
            how="""Test: can you write the steps on a slide without 'maybe'? If yes, implement that slide. Example: support FAQ is a pipeline. Deep research is an agent. Do not use the research graph for FAQ because you already have the code.""",
            fails="""1. **Framework default is an agent**, so everything is.

2. **A planner** that always emits the same three steps.

3. **No ablation** against the pipeline.""",
            line="If I can draw the branches, I code the branches. I use an agent when the step graph is truly unknown, with caps. A planner that always emits the same three steps is a pipeline in costume.",
            kps=[
                "Known flowchart → deterministic pipeline.",
                "Unknown step graph → agent with caps.",
                "A constant planner is a costume.",
                "Ablate against the pipeline.",
                "Framework defaults are not requirements.",
                "FAQ is usually not an agent.",
            ],
            qs=[
                {"q": "Which is the least agentic design that could solve 'retrieve, answer with citations, validate'?", "a": "A fixed pipeline: retrieve, generate, validate. No planner, no loop.", "kind": "apply"},
                {"q": "How do you know an agent is unnecessary?", "a": "You can draw the branches in advance and a pipeline meets the eval. The planner always emits the same steps.", "kind": "recall"},
                {"q": "A team insists on a graph 'for flexibility'. What do you ask?", "a": "Show the eval slice a pipeline fails. If there is none, keep the pipeline.", "kind": "debug"},
                {"q": "What do you add when the slice is real?", "a": "A capped loop around tools, not a rewrite of the whole product as agents.", "kind": "apply"},
                {"q": "Why is extra agentic complexity costly?", "a": "More failure modes, harder evals, higher p95 and $.", "kind": "recall"},
            ],
            links=L,
            walk="""You replace a 6-node graph that always ran retrieve→generate→validate with those three functions. p95 drops 1.2 s. Quality is unchanged.""",
            measure="""Graphs whose planner is constant; ablations versus pipeline; FAQ routes that are still agents.""",
        ),
        "component-boundaries": note(
            what="""**Clear component boundaries** so you can **change, evaluate, and scale** parts independently. Retriever, assembler, model client, validator, tool executor, cache, ingest — each has an interface and a test. You can swap the embedding model without rewriting the executor. You can scale ingest workers without scaling the chat replicas.

Boundaries are schemas and owners, not folders. If changing a prompt requires a retriever rewrite, the boundary is a fiction.""",
            why="""This is how a system lives more than a quarter. Interviewers ask how you would swap a vendor.""",
            how="""Interfaces: `Retriever.retrieve(ctx, q) -> Hits`; `Assembler.build(hits, rules) -> Prompt`; `Model.complete(prompt) -> Tokens`; `Validator.check(out)`. Each has a golden test. The gateway owns `Model`. Product owns `Assembler` rules.""",
            fails="""1. **A god class 'Agent'.**

2. **Shared mutable prompt string** everyone concatenates.

3. **Scaling the whole pod** because ingest is heavy.""",
            line="I draw component boundaries — retrieve, assemble, model, validate, execute, ingest — with schemas and owners so I can swap, eval, and scale them independently. A god-class agent is not a boundary.",
            kps=[
                "Interfaces and owners, not just folders.",
                "Swap a vendor without rewriting the executor.",
                "Scale ingest apart from chat.",
                "Each box has a golden test.",
                "A shared mutable prompt is a missing boundary.",
                "A god-class agent will not age well.",
            ],
            qs=[
                {"q": "How do you swap model vendors with a clean boundary?", "a": "The model client behind the gateway implements one interface. Retriever and executor do not import the vendor SDK.", "kind": "apply"},
                {"q": "Why scale ingest separately?", "a": "It is bursty and CPU/IO heavy. Chat wants reserved low-latency replicas. One pod size will hurt one of them.", "kind": "recall"},
                {"q": "What is the smell of a missing assembler boundary?", "a": "Every feature concatenates onto a global string, and a retrieve change breaks tone.", "kind": "debug"},
                {"q": "What test does each box get?", "a": "A golden or contract test on its schema, independent of the others.", "kind": "apply"},
                {"q": "Who owns the model interface?", "a": "The gateway / platform team. Product owns route prompts and validators.", "kind": "recall"},
            ],
            links=L,
            walk="""You split a 2k-line agent into five packages with contracts. The vendor swap is a 40-line adapter. Ingest gets its own deploy.""",
            measure="""Vendor SDKs imported outside the gateway; chat and ingest sharing HPA; contract tests per box.""",
        ),
        "sync-for-the-user-path-queue-for-the-rest": note(
            what="""**Embeddings and evals do not belong on the request thread.** This is the slogan form of the execution split. User path: sync or streamed, budgeted in seconds. Everything else: a queue. That includes 'just embed this one file' if the user is not waiting on the embedding itself — accept the file, ack, embed behind.

The slogan keeps p95 honest when someone adds a 'quick' eval call to production requests.""",
            why="""It is the sentence you put in the PR template. Interviewers like slogans they can reuse.""",
            how="""Lint or review rule: no embed/eval SDK on the chat handler. File upload returns `202` + id. Eval is a nightly or post-hoc worker subscribed to traces.""",
            fails="""1. **Online eval** that adds 800 ms to every chat.

2. **Embed-on-upload** in the same request as the user's first question.

3. **Calling the slogan but making the user poll with no UI.**""",
            line="Sync for the user path, queue for the rest. Embeddings and evals do not belong on the request thread. I will ack and work behind, and I will not add an 800 ms online eval to every chat.",
            kps=[
                "User path: seconds, sync or stream.",
                "Embed and eval: queued.",
                "Ack file uploads; embed behind.",
                "No online eval on every request.",
                "If the user must wait, give a job UI.",
                "A 'quick' eval still steals p95.",
            ],
            qs=[
                {"q": "Why are embeddings and evals off the request thread?", "a": "They are bursty, retryable, and not what the user is waiting on for a chat token. They steal p95 and capacity.", "kind": "recall"},
                {"q": "A PM wants an online judge on every answer. What do you do?", "a": "Sample or async the judge. Do not add 800 ms to p95 for a score the user does not see.", "kind": "apply"},
                {"q": "File upload then immediate 'ask about this file' — how do you orchestrate?", "a": "Accept upload, queue embed, let the question wait on the job or retrieve when ready; do not embed inside the chat handler synchronously if it can be seconds.", "kind": "apply"},
                {"q": "What is the review rule?", "a": "No embed/eval SDK in the chat request path.", "kind": "recall"},
                {"q": "The user has no job UI and you queued. What fails?", "a": "They do not know when to ask. Provide a ready state or block the composer until indexed, without holding HTTP.", "kind": "debug"},
            ],
            links=L,
            walk="""You rip an online judge out of the handler and sample 5% async. p95 drops 700 ms. Quality still lands in the morning report.""",
            measure="""Handlers importing embed/eval; p95 share from those calls; upload-to-ready time.""",
        ),
        "avoiding-an-agent-for-a-flowchart": note(
            what="""**If you can draw the branches, code the branches.** This item is the interview tattoo of the previous one. Say it, then implement `if retrieve_empty: refuse; else: generate; validate`. Do not stand up a planner whose only plan is that if.

Use it when a vendor diagram has six agents for a three-step FAQ.""",
            why="""It is memorable and correct. Interviewers will quote it back.""",
            how="""On the whiteboard, draw the diamond chart. If it is small, write functions. If it explodes into 'depends on what we find', then an agent with caps is honest.""",
            fails="""1. **Six agents, three steps.**

2. **Saying the slogan and shipping the graph anyway.**""",
            line="If I can draw the branches, I code the branches. I say that out loud when a flowchart is dressed as an agent, and I only pay for a loop when the graph is truly unknown.",
            kps=[
                "Draw first; if it is a flowchart, code it.",
                "Six agents for three steps is a smell.",
                "Unknown graph: agent with caps.",
                "Say the slogan; then actually implement the functions.",
                "Vendor diagrams are not requirements.",
                "This is the interview tattoo for M9.7.",
            ],
            qs=[
                {"q": "State the slogan and when it applies.", "a": "If you can draw the branches, code the branches. It applies when the step graph is known and small.", "kind": "recall"},
                {"q": "A vendor slide has six agents for retrieve-generate-validate. Your move?", "a": "Draw the three steps, implement them, and keep the vendor graph for a later truly open-ended task.", "kind": "apply"},
                {"q": "When does the slogan not apply?", "a": "When the next step depends on unknown tool results in a way you cannot pre-draw without lying.", "kind": "apply"},
                {"q": "What is the honest agent alternative?", "a": "A capped loop with a budget, not six named personas.", "kind": "recall"},
                {"q": "You said the slogan and shipped the graph. What failed?", "a": "Courage in the PR. The slogan is a design rule, not a caption.", "kind": "debug"},
            ],
            links=L,
            walk="""You write the slogan at the top of the design doc and delete four agents. The flowchart becomes 80 lines of TypeScript.""",
            measure="""Named agents whose plan is constant; PRs that added an agent without a failed-pipeline slice.""",
        ),
        "interview": note(
            what="""**Interview: orchestrate a pipeline** — **ingest async, retrieve sync, generate streamed, evaluate offline.** That is the 10-second close of M9.7. Then you can expand any box. If you invert any of the four, you owe a reason (e.g. retrieve async only if you already have a job).

Practise the four adverbs until they are automatic.""",
            why="""It is a compact seniority signal. Interviewers will ask you to repeat it on a different product.""",
            how="""Spoken: 'I ingest and embed asynchronously, I retrieve on the request, I stream generation for chat, and I evaluate offline or sampled. Approvals are a state machine. Agents only if I cannot draw the branches.'""",
            fails="""1. **Eval on the request.**

2. **Ingest on the request.**

3. **Forgetting stream** on a chat product.""",
            line="I orchestrate: ingest async, retrieve sync, generate streamed, evaluate offline. Approvals are a state machine, and I do not use an agent for a flowchart.",
            kps=[
                "Four adverbs: ingest async, retrieve sync, generate streamed, eval offline.",
                "Approvals: state machine.",
                "Agents only if branches cannot be drawn.",
                "Inverting a default needs a reason.",
                "This is the 10-second close.",
                "Then expand any one box if they ask.",
            ],
            qs=[
                {"q": "State the four-adverb orchestration line.", "a": "Ingest async, retrieve sync, generate streamed, evaluate offline.", "kind": "recall"},
                {"q": "When would retrieve not be sync?", "a": "When the whole task is already a long-running job (research). For chat Q&A, retrieve is sync.", "kind": "apply"},
                {"q": "Why is evaluate offline in the slogan?", "a": "So nobody 'temporarily' puts a judge on the user path.", "kind": "recall"},
                {"q": "Add the approval sentence.", "a": "Approvals are a state machine; I do not hold HTTP for a human.", "kind": "apply"},
                {"q": "A candidate streams ingest. What is wrong?", "a": "They inverted the first adverb. Ingest is a worker, not a user-facing stream.", "kind": "debug"},
            ],
            links=L,
            walk="""You say the four adverbs, draw four boxes, and stop. They pick eval; you show the nightly worker. Pass.""",
            measure="""Practice under 12 seconds; designs that invert an adverb without a reason.""",
        ),
    }
}
