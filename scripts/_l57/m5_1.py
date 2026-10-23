from helper import L, entry

NOTES = {
 "m5-1": {
  "the-agent-loop": entry(
   what="""An **agent loop** is the control cycle that turns a language model into something that acts. The model looks at the goal and everything seen so far, decides the next step, the program executes that step, and the observation is appended. Then it repeats until the model returns a final answer with no tool request, or a guard stops it.

The loop is not the model. The loop is *your* runtime: it builds the message list, offers the tool list, executes calls, enforces caps, and decides what “done” means. The model is the policy inside that fence.

Write it as: `messages = [system, user_goal]`; call the model; if tool calls exist, run them and append results; else stop. That is the whole primitive. Frameworks add graphs, memory and interrupts on top of this cycle.""",
   why="""This is the first box interviewers want drawn. “How does an agent work?” is answered by naming decide → act → observe → repeat, then naming the forced exits. Teams that cannot draw the loop cannot debug it: they treat a 40-step runaway as a prompt problem instead of a missing cap.

On the job the loop is also the cost model. Each iteration is another model call plus tool latency. A support investigation that takes 12 steps is not “one chat”; it is 12 completions and whatever the tools billed. If you cannot explain that, you cannot forecast cost or pick a step budget.

The senior line is: the model chooses the branch at run time; ordinary code would have written the branch. That flexibility is why open-ended work is possible, and why the fence must live in code.""",
   how="""Build the smallest loop that can search and then answer.

1. System text: goal, available tools, stop rule.
2. User: “Why did invoice 4419 fail validation last night?”
3. Model requests `get_logs(job_id=4419)`.
4. Runtime runs it, appends 2k tokens of logs (already truncated).
5. Model requests `get_schema("invoice")`.
6. Runtime returns the field list.
7. Model writes a final paragraph with no tool call. Stop.

Log each turn: step index, tool name, arguments hash, result tokens, cumulative cost. When the same `(tool, args)` appears twice, inject “you already did this; try a different query or finish” and continue toward the cap.

Natural exit: final text. Forced exits: max steps, max tokens, max wall time, user cancel. Always keep both.""",
   failures="""1. **No cap.** The model retries a useless search until money or context dies. A prompt that says “be concise” is not a stop condition.

2. **Unbounded history.** Every tool dump stays in the window. By step 15 the original goal is in the middle of 80k tokens and the model repeats itself.

3. **Silent tool failure.** A 500 is appended as empty text. The model invents an answer. Return a typed error the model can read, then let it choose another tool or stop.""",
   line="""An agent loop is decide, act, observe, repeat. I own the runtime: I execute tools, I cap steps and cost, and I keep a trace. The model picks the next action; the fence that stops a runaway is code, not a polite system sentence.""",
   walk="""A coding agent on a red CI job runs 9 steps: read the failure, open two files, edit, rerun tests, edit again, tests green, write a summary. Median cost $0.31. The same agent without a cap once ran 71 steps after a flaky test, $6.40, and produced nothing. You add max_steps=20, identical-call detection, and a partial-answer exit. The next flaky run stops at 12 with “tests still flaky after two reruns; here is the patch so far.”""",
   follow="""They ask whether the model should decide when to stop. Say: it proposes stop by emitting a final answer, but I always keep a hard cap. I do not outsource the budget to the policy.""",
   measure="""Steps per successful task, forced-stop rate, identical-call rate, tokens and dollars per success, and whether every run has a complete trace.""",
   key_points=[
    "Loop: decide, act, observe, repeat until a final answer or a guard.",
    "The model is the policy; the runtime executes and enforces limits.",
    "Natural exit is a final message; forced exits are step, cost, time, cancel.",
    "Each iteration is a billed model call plus tool latency.",
    "Detect identical repeated calls and return typed tool errors.",
    "A trace of every step is part of the product, not optional logging.",
   ],
   questions=[
    {"q": "What are the steps of one iteration of an agent loop and when does it end?", "a": "Call the model with goal, history and tool definitions; if it requests tools, execute them and append the observations; call again. It ends when the model returns a final answer with no tool request, or when a guard such as max steps, token budget or timeout stops it.", "kind": "recall"},
    {"q": "Your agent keeps calling the same search tool with the same query forever. What do you check and add?", "a": "Check whether the tool result is unhelpful or truncated so the model cannot progress, and whether history shows the repetition. Add a max-step cap, detection of identical repeated calls, an error or hint message fed back, and a fallback that returns a partial answer. Log the trace.", "kind": "debug"},
    {"q": "Why is an agent loop more expensive than a single call for the same user question?", "a": "Each decide step is another completion. Tool results are fed back as more input tokens. Cost and latency scale with step count, so you forecast from median and p95 steps, not from one-call prices.", "kind": "recall"},
    {"q": "A teammate wants the model to stop “when it is done” with no max steps. What do you reply?", "a": "The model can propose a final answer, but a hopeful stop is not a budget. Keep a hard step, time and cost cap in the runtime and return a partial result when they fire.", "kind": "apply"},
    {"q": "Where should you log the identity of each tool call in the loop?", "a": "In a per-run trace: step index, tool name, argument hash, result size, error class, cumulative tokens. That is how you diagnose loops and cost spikes later.", "kind": "apply"},
   ],
   links=[L["oai_agents"], L["ant_agents"]],
  ),
  "call-vs-chain-vs-workflow-vs-agent": entry(
   what="""These four sit on a spectrum of **who owns control flow**.

- **Single call:** one prompt, one response. Classification, extraction, a short rewrite.
- **Chain:** a fixed sequence of calls. Output of one is input to the next. The path is hard-coded.
- **Workflow:** a code-defined graph: branches, routers, parallel fan-out, loops with fixed conditions. Models fill the nodes; a developer wrote the edges.
- **Agent:** the model decides which step or tool comes next and when to stop.

Moving right buys flexibility. It costs predictability, latency, money and testability. A chain with a router is often most of what a team casually calls an agent. The interview distinction is not “does it use tools?” — both a workflow and an agent can. The distinction is whether the next edge was written by you or sampled by the model.""",
   why="""Picking too far right is the most common agent failure in production. A refund pipeline that is always verify → compute → write does not need a model to invent the order. Giving it an open loop adds variance, 10× cost tails, and a compliance story you cannot tell.

Interviewers use this spectrum as a filter. Junior answers name products. Senior answers say: I start at the leftmost option that solves the task and move right only when the step count or branching is genuinely unknown. Then they give a concrete counter-example: an agent on a three-step ETL job.""",
   how="""Take “extract fields from an invoice PDF, validate, store.”

- Call: one shot that tries to do all three. Cheap, brittle, no validation.
- Chain: extract call → validate function → store. Known order.
- Workflow: same chain plus a retry branch on validation failure and a human node if the amount exceeds a threshold.
- Agent: the model may extract, then search email, then re-extract, then store, in any order.

You ship the workflow. You keep an agent only for “this PDF is a mess, figure out which source system it came from,” which is open-ended. Measure both on the same fifty invoices.""",
   failures="""1. **Agent as default.** Demo-driven teams wrap every feature in a loop. Cost and failure variance show up after launch.

2. **Confusing tools with agency.** A workflow that calls tools is still a workflow. Control flow ownership is the test.

3. **No rollback plan.** Once you ship an agent, replacing it with a workflow feels like a demotion. Keep the eval set so you can prove the simpler graph wins.""",
   line="""Call, chain, workflow, agent — ordered by who decides the next step. I start left and move right only when the path cannot be written down. Tools do not make it an agent; an unknown graph does.""",
   walk="""A teammate proposes an agent for nightly invoice filing. You time a workflow: 3 calls, p95 8s, $0.04, 98% schema-valid. A prototype agent: median 6 calls, p95 28, $0.22, 91% valid because it sometimes skips validation. You keep the workflow and add a validation retry. The agent idea is parked for a different task: unknown vendor portals.""",
   follow="""They say “but the format might change.” Reply: then add a router or a new branch when you see the new format. Do not pay agent variance for a change you have not seen.""",
   measure="""Calls per task, p95 latency, cost per success, schema-valid rate, and how often the agent takes a path a workflow would not have taken.""",
   key_points=[
    "Spectrum: call, chain, workflow, agent, defined by who owns control flow.",
    "Tools can appear on a workflow; they do not make it an agent.",
    "Each step right adds flexibility and costs predictability and money.",
    "Start at the leftmost pattern that solves the job.",
    "A chain plus a router is often enough.",
    "Keep an eval so you can prove a simpler graph is better.",
   ],
   questions=[
    {"q": "Distinguish a workflow from an agent in one or two sentences.", "a": "In a workflow the developer defines the graph of steps and branches in code and models fill the nodes; in an agent the model decides dynamically which action to take next and when to finish. The difference is where control flow lives, not whether tools are used.", "kind": "recall"},
    {"q": "A feature extracts fields from an invoice, validates them, and files them. Which pattern and why?", "a": "A chain or small workflow: the steps are known and fixed, so hard-coded order gives lower latency, cost and failure variance, plus easy testing. An agent would add uncertainty without benefit.", "kind": "apply"},
    {"q": "A product manager calls any tool-using LLM an agent. How do you correct that?", "a": "Ask who chooses the next step. If code does, it is a workflow or chain. If the model does, it is an agent. Tool use is orthogonal.", "kind": "apply"},
    {"q": "You replaced a workflow with an agent and p95 cost rose 8×. What do you check first?", "a": "Step-count distribution and whether the extra steps change the outcome. If the path is still the same three steps most of the time, revert to a workflow and keep an agent only for the unknown remainder.", "kind": "debug"},
    {"q": "When is a single call the right choice?", "a": "When one prompt can produce a constrained output (label, short extract, rewrite) and you do not need intermediate tools or branches. Measure accuracy before adding steps.", "kind": "recall"},
   ],
   links=[L["oai_agents"], L["ant_agents"]],
  ),
  "where-agents-are-useful": entry(
   what="""Agents earn their cost when the task has an **unknown number of steps**, **branching that depends on intermediate results**, and **tools that gather information or act**. The problem is open-ended, but the result is checkable, and the value per task justifies several model calls.

Good fits: coding agents that read, edit and rerun tests; research that follows leads; support or ops triage that looks up an account then logs; browser tasks whose path depends on the page.

Poor fits: latency-critical paths, high-volume cheap classification, catastrophic actions without approval, and any procedure you can write down in advance. A rename of one field in one file is not an agent task.""",
   why="""This is how you avoid building a theatre agent. Stakeholders see a demo that “just figures it out” and want that on every ticket. Your job is to name the properties that make the extra variance worth paying for: unknown path, tools, verifiable outcome, high enough value.

Interviewers will ask “where would you *not* use an agent?” A strong answer lists latency, fixed procedures, and irreversible actions, then asks how you would know it worked. If you cannot name a check (tests, a lookup, a human), you do not have an agent task; you have a hope.""",
   how="""Score a candidate task on five axes: unknown step count, branching on observations, tools required, checkable result, value per task. Need most of them.

Example: “investigate this failing flaky test in a repo we have not seen.” Steps unknown, tools (read, grep, run), result checkable (test pass or a bounded report), value high. Agent.

Counter-example: “classify this email into five buckets.” One call, known label set, cheap. Not an agent.

If the score is mixed — known skeleton, unknown middle — use a workflow with one agentic node for the middle.""",
   failures="""1. **Uncheckable success.** “Research this market” with no rubric becomes a fluent essay. Define what “done” looks like first.

2. **Low-value high-volume.** An agent on every password-reset email will lose money even if it is cute.

3. **Catastrophic tools without a gate.** An agent that can refund or delete is not “useful”; it is a risk unless approval sits in the runtime.""",
   line="""I use an agent when the path is unknown, tools exist, and I can check the result. I do not use one for fixed procedures, tiny edits, or latency-critical calls. Value per task has to pay for several completions.""",
   walk="""Product wants an agent to rename `customer_id` to `account_id` in one handler. You decline: one search-and-replace plus a test is cheaper and safer. The same week they ask for “find every usage across 40 services and fix what breaks.” That scores well: unknown files, tests as the check, high value. You build the agent with a step cap and a dry-run diff.""",
   follow="""They ask how you know the agent worked. Say the check before the architecture: tests green, a ground-truth lookup, or a human review queue. No check, no agent.""",
   measure="""Task-success rate against the check, steps and cost per success, and the fraction of incoming work that actually needed an unknown path.""",
   key_points=[
    "Good agent tasks: unknown steps, observation-dependent branching, tools, a check.",
    "Value per task must justify multiple model calls.",
    "Coding, research, triage and browser work are common fits.",
    "Avoid latency-critical, high-volume cheap, or fixed-procedure work.",
    "Define the success check before you build the loop.",
    "A hybrid workflow-plus-agent-node covers mixed tasks.",
   ],
   questions=[
    {"q": "What properties of a task make an agent a good fit?", "a": "Unknown or variable steps, branching that depends on intermediate observations, tools to read or act, a verifiable outcome, and enough value per task to pay for many model calls.", "kind": "recall"},
    {"q": "A product manager wants an agent to rename a field in a form handler. Is that a good agent task? Justify.", "a": "Usually not: it is a small, well-defined edit. Agents suit exploratory multi-step work such as finding all usages and running tests. Reason about cost, variance and verification.", "kind": "apply"},
    {"q": "How would you know a research agent actually worked?", "a": "Define a rubric or checklist before the run: required sources, claims that must be cited, a length or format constraint. Score against that, not against whether the prose sounded confident.", "kind": "apply"},
    {"q": "Support wants an agent on every incoming chat. What do you ask first?", "a": "What fraction of chats have an unknown path versus a known workflow, what the per-chat value is, and what the success check is. Most chats should stay on a workflow or a single call.", "kind": "debug"},
    {"q": "Name one hybrid that is better than a pure agent for mixed work.", "a": "A workflow skeleton that handles the known steps in code, with one agentic node only for the open-ended investigation, under a step cap.", "kind": "recall"},
   ],
   links=[L["oai_agents"], L["ant_agents"]],
  ),
  "when-a-workflow-is-better": entry(
   what="""Prefer a **workflow** when you can write the steps down. That is the default in most production guidance. A workflow is a code-defined graph: prompt chaining, routing, parallel fan-out, an orchestrator-worker with a fixed plan, or an evaluator-optimizer with a capped retry count.

Choose it when the procedure is known and stable; when you need predictable latency and cost; when auditors want to see the path; when nodes must be unit-testable; when a model decision must be bounded (a router with a closed label set).

Workflows break on inputs the designer did not foresee. Agents degrade more gracefully and less predictably. A hybrid is common: a workflow skeleton with one agentic node where exploration is required.""",
   why="""This is the answer that saves a quarter. Teams reach for an agent because it demos well, then spend months fighting 20× cost variance. Saying “workflow first” in a design review is a seniority signal.

Interviewers will hand you a vaguely agent-shaped story (support, KYC, invoice). They want you to pull the known steps out and put them in code. If you immediately say “ReAct loop,” you have failed the product question even if the loop is technically correct.""",
   how="""Write the happy path as a list. If you can, it is a workflow.

KYC: collect documents → extract fields → sanctions screen → risk score → decision. The order does not depend on a surprise observation. Implement nodes, add a retry on extract-fail, add a human node above a risk threshold. The model lives inside extract and maybe score, not in the edges.

Only if a step is “read whatever the customer uploaded and figure out which process this is” do you add an agentic router that *then* enters a known workflow.""",
   failures="""1. **Agent for SLA work.** A path that must finish in 3 seconds cannot be “up to 40 steps.”

2. **Un-testable nodes.** If you cannot unit-test extract and screen separately, you will not know which step failed.

3. **Hidden agent inside a “workflow” framework.** A graph with an unconstrained tool-calling node is still an agent. Name it honestly and cap it.""",
   line="""If I can write the steps, I write a workflow. I want predictable cost, a path I can audit, and nodes I can test. I keep an agent only for the part I truly cannot draw in advance.""",
   walk="""An “agent” that files insurance claims wanders through email search half the time. You extract the stable sequence (parse → validate → reserve number → store) into a graph. The agent remains only for “this attachment is not a claim form.” p95 latency drops from 47s to 9s and audit can replay the path.""",
   follow="""They ask about unexpected inputs. Say: workflows fail closed on unseen cases; that is a feature if you have a fallback queue. I would rather a known miss than a silent wander.""",
   measure="""Fraction of traffic that stays on the known graph, p95 latency and cost versus the agent prototype, and unit-test coverage of each node.""",
   key_points=[
    "Default to a workflow when the steps are known and stable.",
    "Workflows give predictable cost, latency, tests and audit trails.",
    "Bound model decisions (closed routers) rather than open loops.",
    "Hybrid: workflow skeleton plus one capped agentic node.",
    "An unconstrained tool node inside a graph is still an agent.",
    "Failing closed on unseen inputs is often better than wandering.",
   ],
   questions=[
    {"q": "Give three reasons to pick a workflow over an agent.", "a": "Predictable latency and cost, easier testing and auditing because you know the path, and bounded failure at constrained decision points.", "kind": "recall"},
    {"q": "You have an agent whose cost per task varies 20× and sometimes wanders. How might you restructure it?", "a": "Hard-code the stable parts as a workflow; keep an agentic node only for the open-ended step, with a step cap. Add routing for known cases and evaluate before and after.", "kind": "apply"},
    {"q": "A compliance officer asks which path a decision took. What architecture answers that?", "a": "A workflow whose edges are in code and whose run is logged node by node. An open agent loop can only offer a post-hoc trace of sampled decisions.", "kind": "apply"},
    {"q": "When does a workflow become the wrong tool?", "a": "When the next step truly depends on observations you cannot enumerate, and a check exists for the end state. Then add an agentic node or a separate agent, still capped.", "kind": "recall"},
    {"q": "Your graph framework lets any node call any tool. What did you just build?", "a": "An agent with extra ceremony. Treat it as an agent: caps, traces, evals. Do not claim workflow predictability.", "kind": "debug"},
   ],
   links=[L["lg"], L["oai_agents"]],
  ),
  "the-components-of-an-agent": entry(
   what="""An agent is a few cooperating parts around a model:

- **Model (policy):** chooses the next action from context.
- **Instructions:** role, goals, rules, output format, when to propose stop.
- **Tools:** typed functions to read or act.
- **State / memory:** the running messages plus anything persisted.
- **Control loop (runtime):** executes calls, enforces limits, handles errors, trims context.
- **Stopping conditions:** natural (final answer) and forced (caps, cancel).
- **Guardrails and permissions:** who may call what, approvals, output checks.
- **Observability:** traces of every step.

Planner, verifier and sub-agents are patterns built from the same parts. When something misbehaves, localise the part: wrong tool is descriptions; forgotten fact is memory; endless loop is the runtime.""",
   why="""Drawing these boxes is the interview. A candidate who says “it’s just a prompt with tools” cannot assign a bug. A candidate who points at instructions versus runtime versus tool schema can.

On the job this list is also the staffing list. Prompt work is not the same as the runtime that persists state, and neither is the permission layer. Treat them as separate owners or they will all rot in one notebook.""",
   how="""Debug by component.

Symptom: answers are right, tool choice is wrong half the time. Inspect tool names, descriptions, and how many tools are offered. Not the model size.

Symptom: it forgets a constraint from turn 1 after a long tool dump. Inspect state: was the constraint pinned or only in narrative history that got trimmed?

Symptom: it runs 40 steps. Inspect the runtime: missing max steps, no identical-call detector.

Write a one-page diagram with those boxes before you pick a framework. The framework must map onto them, not hide them.""",
   failures="""1. **One blob.** Prompt, tools, memory and caps live in a single function. You cannot test or replace a part.

2. **Guardrails only in the prompt.** “Do not delete” in instructions is not a permission. The runtime must not expose the delete tool, or must require a confirm.

3. **No trace.** Without step logs you cannot tell instructions from runtime failure.""",
   line="""I draw model, instructions, tools, state, loop, stops, permissions and traces. Bugs get assigned to a box. Frameworks are implementations of those boxes, not a substitute for naming them.""",
   walk="""A refund agent pays twice. You walk the boxes: instructions said “only once”; the model requested pay twice; the runtime had no idempotency key and no approval node. You add a permission gate and an idempotency store. The prompt did not change. The incident was a missing component, not a “bad model.”""",
   follow="""They ask which component is the agent. Say: none of them alone. The agent is the composition. The policy without a loop is a call; the loop without permissions is a hazard.""",
   measure="""Tool-selection accuracy, constraint-retention after trim, forced-stop rate, approval-gate hit rate, and percent of runs with a complete component-level trace.""",
   key_points=[
    "Core parts: model, instructions, tools, state, loop, stops.",
    "Guardrails and traces are production components, not extras.",
    "Debug by locating the failing box.",
    "Planner and sub-agents are patterns on the same parts.",
    "Permissions belong in the runtime, not only in the prompt.",
    "Draw the boxes before you pick a framework.",
   ],
   questions=[
    {"q": "List the main components of an LLM agent and what each is responsible for.", "a": "Model decides next action; instructions define role and rules; tools provide capabilities; memory/state holds history and persisted facts; the runtime loop executes calls and enforces limits; stops, guardrails and tracing keep it bounded and debuggable.", "kind": "recall"},
    {"q": "The agent answers correctly but calls the wrong tool half the time. Which component do you inspect first?", "a": "Tool definitions: names, descriptions and schemas, and whether too many overlap. Then instructions on when to use each. Measure tool-selection accuracy.", "kind": "debug"},
    {"q": "Where should a “do not email the customer” rule be enforced?", "a": "In permissions: do not expose the send tool, or require an approval interrupt. The instruction is documentation; the runtime is enforcement.", "kind": "apply"},
    {"q": "A framework advertises “memory.” What do you still have to design?", "a": "What is written, what is retrieved, what is forgotten, and what is pinned versus summarised. The product still owns those policies.", "kind": "apply"},
    {"q": "Why list stopping conditions as their own component?", "a": "Because “the model will stop” is not a design. You need explicit natural and forced exits with a partial-answer path.", "kind": "recall"},
   ],
   links=[L["oai_agents"], L["ant_agents"]],
  ),
  "state-tools-policy-and-the-loop": entry(
   what="""Before you draw a fancy architecture, name four pieces: **state**, **tools**, **policy**, and **the loop**.

- **State** is what the system remembers this run (and maybe across runs): messages, scratchpad, pinned constraints, retrieved notes.
- **Tools** are the typed actions the policy is allowed to request.
- **Policy** is the model (plus instructions) that maps state to the next tool call or a final answer.
- **The loop** is the runtime that applies the policy, executes tools, writes new state, and stops.

Every agent diagram, including multi-agent and graph frameworks, is a rearrangement of these four. If you cannot point to them, you are drawing brands.""",
   why="""This is the whiteboard test. Interviewers watch whether you start with boxes that have owners or with product names. State/tools/policy/loop maps onto any stack: a hand-rolled Python while-loop, LangGraph, an Agents SDK, ADK.

On the job the four-piece list stops arguments. “The agent forgot” is a state problem. “It called refund instead of preview” is tools plus policy. “It never stopped” is the loop. You assign the ticket to the right layer.""",
   how="""Sketch a one-run refund helper.

State: customer id, amount, already_previewed flag, message list.
Tools: `lookup_customer`, `preview_refund`, `execute_refund` (gated).
Policy: a mid-size model with instructions that require preview before execute.
Loop: while steps < 8: call policy; run tools; if execute requested without approval, interrupt; if final answer, break.

That sketch is enough to implement. Adding “Crew” or “Graph” later should not change the four names, only how they are stored and scheduled.""",
   failures="""1. **State in the prompt only.** A flag that lives in prose will be dropped by a summary. Put durable flags in structured state.

2. **Tools without a policy boundary.** Exposing execute_refund to the same policy that talks to the user is how accidental payouts happen.

3. **Loop as an afterthought.** A notebook that calls the model twice is not a loop with stops. You will ship it and then invent caps in a panic.""",
   line="""I name state, tools, policy and loop before I draw anything else. Frameworks implement those four. Bugs get filed against one of them, not against “the agent.”""",
   walk="""You join a team whose diagram is twelve brand logos. You redraw: state in Redis, tools as ordinary functions, policy as the model call, loop as a worker with a cap. Two logos disappear because they duplicated the loop. The incident rate drops because people now know where to put a flag.""",
   follow="""They ask where memory lives. Say: memory is a kind of state with a write/retrieve/forget policy. I still start with the four pieces; memory is a refinement of state.""",
   measure="""Whether a new hire can map the running system onto the four boxes in ten minutes, and whether incident tickets name a box.""",
   key_points=[
    "Four pieces: state, tools, policy, loop.",
    "State is structured memory for this run (and maybe later).",
    "Tools are the allowed actions; policy chooses among them.",
    "The loop applies policy, executes, writes state, and stops.",
    "Frameworks rearrange these four; they do not replace them.",
    "File bugs against a piece, not against “the agent.”",
   ],
   questions=[
    {"q": "Name the four pieces you should list before drawing an agent architecture.", "a": "State, tools, policy and the loop. State is what is remembered, tools are allowed actions, policy chooses the next action, the loop executes and stops.", "kind": "recall"},
    {"q": "A payout ran twice. Which of the four pieces do you inspect first and why?", "a": "State (was an already_paid flag missing?) and the loop (did a retry replay execute?). Then tools (was execute idempotent?). Policy last.", "kind": "debug"},
    {"q": "Where does “the model” sit in the four-piece list?", "a": "Inside policy, together with the instructions that constrain it. The model is not the loop and not the tool implementations.", "kind": "recall"},
    {"q": "You are asked to add long-term memory. Which piece changes?", "a": "State: you add a store and retrieve/forget rules. The loop must call retrieve at the right time. Tools might include an explicit remember/forget tool. Policy learns when to use them.", "kind": "apply"},
    {"q": "Why is this list more useful than naming a framework first?", "a": "Because any framework must implement the same four, and incidents map to them. Brands do not tell you where a flag or a cap lives.", "kind": "apply"},
   ],
   links=[L["oai_agents"], L["lg"]],
  ),
  "interview": entry(
   what="""The interview line is short: **use an agent when the next step is unknown; use a workflow when the graph is known.** That is the whole distinction that most hiring loops want, said in one breath.

Unknown means you cannot write the edges in advance: the next lookup depends on what the last tool returned, and the number of lookups is not fixed. Known means you can list the nodes and the branches (including “retry extract,” “send to human if amount > X”).

Do not hide behind product names. If they say “but LangGraph…”, answer: LangGraph can implement either. The question is whether *you* wrote the edges or the model is choosing them.""",
   why="""This question appears in almost every applied-LLM loop once the interviewer is done with RAG. They are testing taste, not memorised APIs. A candidate who always picks an agent sounds like a tutorial. A candidate who always picks a workflow sounds timid. A candidate who states the rule and then applies it to *their* prompt wins.

On the job the same sentence is how you push back on a demo-driven design without looking obstructionist. You are not anti-agent. You are matching structure to uncertainty.""",
   how="""Practice on three prompts you will actually get.

1. “Classify tickets.” Graph known → workflow or a single call.
2. “Debug this failing job across unknown services.” Next step unknown → agent, capped.
3. “Refund a customer.” Graph known (verify → compute → pay) with a human gate → workflow, not an open agent.

Add the extra clause they like: I start left on the call/chain/workflow/agent spectrum and move right only when evidence says the path cannot be written. Then I name the check and the cap.""",
   failures="""1. **Name-dropping.** “We would use CrewAI” is not an answer. They asked when, not which logo.

2. **Unknown as a vibe.** “The world is messy” is not evidence the graph is unknown. Show a step you cannot enumerate.

3. **Forgetting the cap.** Even the agent branch of the answer must mention step/cost limits and a success check.""",
   line="""Agent when the next step is unknown; workflow when I can draw the graph. I start simple, I name a check, and I cap the loop. Frameworks implement that choice; they are not the choice.""",
   walk="""In a mock interview you are given “onboard a vendor.” You split it: collect docs and write records is a workflow; “this PDF is in a language and layout we have never seen” is an agentic node. The interviewer asks why not one agent. You say the known steps have SLAs and an audit path; the unknown part is bounded. You get the follow-up offer to draw the graph.""",
   follow="""They ask for a time you picked wrong. Have one: you shipped an agent on invoice filing, cost tails were ugly, you rewrote the happy path as a workflow. That story is stronger than a perfect taxonomy.""",
   measure="""Whether you can classify five real product tickets in two minutes each, and whether your last design doc used this sentence in the first page.""",
   key_points=[
    "Agent when the next step is unknown; workflow when the graph is known.",
    "Unknown means you cannot enumerate the edges in advance.",
    "Frameworks can implement either; they do not decide.",
    "Start left on the spectrum; move right with evidence.",
    "Always name the success check and the cap on the agent branch.",
    "A short story of picking wrong and rewriting beats a taxonomy.",
   ],
   questions=[
    {"q": "What one-sentence rule do you use to choose an agent versus a workflow?", "a": "Use an agent when the next step is unknown; use a workflow when you can write the graph. Mention a check and a cap for the agent case.", "kind": "recall"},
    {"q": "The interviewer says “we use LangGraph so it is an agent.” How do you respond?", "a": "LangGraph can run a fixed graph or an open tool loop. The question is whether the edges are written in code or chosen by the model at run time.", "kind": "apply"},
    {"q": "Apply the rule to a refund that always verifies identity first.", "a": "The graph is known: verify → compute → (approve) → pay. That is a workflow with a human node. An open agent would be the wrong control-flow owner.", "kind": "apply"},
    {"q": "What extra clause should you add after the one-liner?", "a": "I start at the simplest pattern that works and move right only when the path cannot be predetermined. I define the success check and a step/cost cap.", "kind": "recall"},
    {"q": "You cannot yet tell if the path is known. What do you do in the interview?", "a": "Say you would time-box a workflow for the happy path and keep a capped agent for residue, then measure which traffic actually needs the agent.", "kind": "debug"},
   ],
   links=[L["oai_agents"], L["lg"]],
  ),
  "the-user-visible-contract": entry(
   what="""Users did not buy a hidden chain of thought. The contract they can see is **progress**, **cancel**, and a **final artefact**. Progress means a user-safe title for the current step (“searching orders,” “drafting the reply”), not a dump of private reasoning. Cancel means the work actually stops and you report what already happened. The final artefact is the thing they asked for: a patch, a report, a filed ticket — plus sources or diffs when that is the product.

Private scratchpads, tool dumps and model reasoning stay in the trace for operators. Mixing those into the UI is not honesty; it is leakage and noise. If you cannot point to the progress event, the cancel path, and the stored artefact on a whiteboard, you do not yet have a user-visible contract.""",
   why="""Long-running agents fail socially before they fail technically. A four-minute silent spinner feels broken. A stream of raw “I am thinking…” can leak chain-of-thought or tool arguments that contain other customers’ data. A finish with no artefact (“done”) is not a product.

Interviewers who have shipped agents will ask what the user sees at minute two. If your answer is “the model’s thoughts,” you have not designed a contract. If your answer is steps, cancel, and the file they wanted, you have.""",
   how="""Define three event types the UI understands:

- `step_started`: {id, title, started_at}
- `step_finished`: {id, title, summary, artefact_ref?}
- `run_terminal`: {status: done|cancelled|failed|budget, artefact, already_happened[]}

Map internal tool names to titles (`execute_sql` → “Querying billing”). Never stream raw arguments that might contain PII. On cancel, stop scheduling new tools, wait for in-flight work with a timeout, and fill `already_happened`.

The artefact is stored independently of the chat transcript so a refresh still finds it.""",
   failures="""1. **Spinner-only UX.** Users refresh and you lose the run because it was tied to a tab.

2. **Raw reasoning.** You expose a scratchpad that includes another tenant’s id from a tool dump.

3. **Cancel that does not cancel.** The worker keeps paying or emailing. Cancel is a runtime feature, not a button decoration.""",
   line="""The user-visible contract is progress they can understand, a cancel that works, and a final artefact they can take away. I do not ship a hidden chain of thought as the product.""",
   walk="""A research agent used to stream 2k tokens of planning. Legal asked you to stop. You replace the stream with four titles, a source list, and a downloadable memo. Cancel now writes “stopped after reading 6 sources; memo has the partial notes.” Support tickets about “is it stuck?” drop by half.""",
   follow="""They ask if hiding reasoning reduces trust. Say: trust comes from inspectable steps and sources, not from inner monologue. I show citations and the artefact.""",
   measure="""Time-to-first-step-event, cancel success rate, artefact retrieval after refresh, and tickets that say “is it stuck?” or “what did it do?”.""",
   key_points=[
    "User contract: progress, cancel, final artefact.",
    "Progress is user-safe titles, not private reasoning.",
    "Cancel must stop work and report what already happened.",
    "Store the artefact independently of the chat widget.",
    "Map internal tool names before they hit the UI.",
    "Traces stay for operators; the UI stays boring and clear.",
   ],
   questions=[
    {"q": "What three things should a user see from a long-running agent?", "a": "Progress as safe step titles, a working cancel, and a final artefact (plus sources or diffs as appropriate). Not a hidden chain of thought.", "kind": "recall"},
    {"q": "A PM wants to stream the model’s raw reasoning for “transparency.” What do you raise?", "a": "Leakage of tool arguments and other users’ data, unstable UX, and that trust is better served by step titles, sources and the artefact.", "kind": "apply"},
    {"q": "User hits cancel after a refund tool already succeeded. What must the UI say?", "a": "That further steps stopped and that the refund already happened, with the id. Do not claim a full rollback you cannot do.", "kind": "debug"},
    {"q": "Why store the artefact outside the chat transcript?", "a": "So a refresh, a second device, or a later audit can retrieve the file or ticket without replaying the run.", "kind": "recall"},
    {"q": "How do you turn `execute_sql` into progress the user can see?", "a": "Map it to a safe title such as “Querying your orders,” never show the raw SQL or row dumps in the default UI.", "kind": "apply"},
   ],
   links=[L["oai_agents"], L["ant_agents"]],
  ),
 }
}
