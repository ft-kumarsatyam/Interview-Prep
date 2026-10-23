from composer import sc
from helper import L

def Q(q, a, kind):
    return {"q": q, "a": a, "kind": kind}

def F(a, b, c):
    return f"1. **{a}**\n\n2. **{b}**\n\n3. **{c}**"

K = lambda *xs: list(xs)

SCENES = {
"m5-6": {
"why-more-than-one-agent": sc(
 why="""Split only when you can name the benefit: context isolation, specialisation, parallelism, or a permission boundary. Extra agents add tokens, latency, hand-off bugs and compounded error. “It looks advanced” is not a reason.

Interviews: start with one agent; split when a measured limit appears.""",
 how="""A researcher reads 40 pages and returns 400 tokens. That is isolation. A cheap model triages, a strong one plans: specialisation. Two independent lookups run together: parallelism. A web-reader has no send-email tool: permission.

If the task is a short sequential Q&A, one agent with three tools is enough. Draw the benefit on the whiteboard before you add a second policy.""",
 failures=F("Splitting a tightly coupled three-step job and losing information at the hand-off.",
 "Five agents because a slide had five roles.",
 "No owner for the split, so nobody measures whether quality rose."),
 line="""I add an agent when I can name isolation, specialisation, parallelism or a permission wall. Otherwise one agent with tools is simpler and cheaper.""",
 walk="""A single agent drowned in PDFs. You add a research worker that returns a cited summary. Parent tokens drop 60% and answer quality rises. A second split (“writer” vs “editor”) added latency and no gain; you merge them.""",
 follow="""They ask about “multi-agent” as a default. Say: it is a cost. I buy it with a named benefit.""",
 measure="""Tokens and latency versus a single-agent baseline, and the named benefit’s metric (e.g. parent-context size).""",
 kps=K("Split for isolation, specialisation, parallelism or permissions.","Every extra agent adds tokens, latency and failure modes.","Default to one agent until a measured limit.","A summary-returning worker is the usual isolation win.","Permission splits beat prompt-only care.","If you cannot name the benefit, do not split."),
 qs=[Q("Which situation most justifies splitting into multiple agents?", "A research step that would flood the main context, or a permission boundary you do not want in one policy.", "apply"),
     Q("Name four honest reasons to add an agent.", "Context isolation, specialisation, parallelism, permission boundaries.", "recall"),
     Q("When is one strong agent better?", "Short, tightly coupled sequential work where hand-offs would lose state.", "recall"),
     Q("A PM wants five roles for a demo. What do you ask?", "Which measured limit each role fixes. If none, ship one agent.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"common-patterns": sc(
 why="""The usual drawings are orchestrator→workers, sequential hand-offs, parallel specialists, and hierarchical supervisor/worker. Learn them as patterns with failure modes, not as product names.

Interviews: sketch one and say when you would not use it.""",
 how="""Orchestrator: one policy decomposes and delegates. Sequential: A finishes, B starts with A’s artefact. Parallel: peers run, a merger waits. Hierarchical: supervisors each own a subset of workers when the fan-out is too wide for one chooser.

Pick the shallowest that fits. Hierarchy adds compression and latency. Parallel needs a merge rule. Sequential needs a contract at each hop.""",
 failures=F("Using all four in one diagram with no traffic.",
 "Parallel without a timeout or conflict rule.",
 "Calling a chatty group chat a “pattern.”"),
 line="""I know four patterns: orchestrator-workers, sequential hand-offs, parallel specialists, hierarchy. I pick the shallowest and I name the merge or contract.""",
 walk="""Onboarding: sequential (KYC then account then mail). Research: parallel specialists plus a merger. A 30-tool mess: hierarchy. You refuse a fifth invented pattern.""",
 follow="""They ask for a fifth. Say: swarms are usually untyped group chat. I want a contract.""",
 measure="""Depth of the chosen pattern, merge conflicts, and extra latency versus a flat design.""",
 kps=K("Four patterns: orchestrator, sequential, parallel, hierarchical.","Pick the shallowest that solves the constraint.","Parallel needs a merge policy and a timeout.","Sequential needs a typed hand-off.","Hierarchy pays off only at large fan-out.","A group chat is not a pattern."),
 qs=[Q("List common multi-agent patterns.", "Orchestrator-workers, sequential hand-offs, parallel specialists, and hierarchical supervisor/worker.", "recall"),
     Q("When does hierarchy beat a flat orchestrator?", "When the worker/tool set is too large for one chooser to pick reliably.", "apply"),
     Q("What must a parallel pattern include?", "A timeout, a merge or conflict rule, and sources on each result.", "apply"),
     Q("Why is “everyone talks to everyone” a weak pattern?", "No contract, duplicated work, unbounded context. Prefer typed hand-offs.", "debug")],
 links=[L["oai_agents"], L["lg"]],
),
"orchestrator-workers": sc(
 why="""An orchestrator holds the goal, decomposes, delegates, and synthesises. Workers are narrow: one job, few tools, short context. This is the default multi-agent shape.

The orchestrator must not dump its whole memory into every worker. Briefs are the product.""",
 how="""Orchestrator writes a brief `{goal, inputs, output_schema, budget}`. Worker returns `{ok, data|error}` matching the schema. Orchestrator validates, maybe retries another worker, then merges.

Use a cheaper model on workers when the job is extract-and-summarise. Keep the orchestrator stronger for decomposition.""",
 failures=F("Workers that return vibes instead of the schema.",
 "Orchestrator that re-does the worker’s job “to be sure.”",
 "No budget on the worker so a research child runs 40 steps."),
 line="""The orchestrator decomposes and briefs; workers return a typed result or a typed failure. I validate on the way back.""",
 walk="""An orchestrator asked “look into this” and got essays. You require `{findings[], citations[]}`. Synthesis starts working. A worker that times out returns `{ok:false, error:"budget"}` and the parent tries a narrower brief.""",
 follow="""They ask if the orchestrator should see worker traces. Say: a short error and artefacts, not 20k tokens of thought.""",
 measure="""Schema-valid worker returns, worker step caps hit, orchestrator rework rate.""",
 kps=K("Orchestrator owns goal, decompose, delegate, merge.","Workers get a brief, not the whole parent memory.","Typed result or typed failure, never a vibe.","Cap the worker’s loop separately.","Validate on return before synthesis.","Tier models: strong parent, cheaper workers when the job is narrow."),
 qs=[Q("What does an orchestrator actually do?", "Decompose the goal, brief workers, validate returns, merge or retry, and stop.", "recall"),
     Q("Workers return inconsistent formats. Best fix?", "A required output schema validated on return, plus a self-contained brief.", "debug"),
     Q("What goes in a worker brief?", "Goal, inputs, output schema, and a budget. Not the parent’s entire history.", "apply"),
     Q("Why cap the worker separately?", "A runaway child should not spend the parent’s whole budget.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"sequential-handoffs": sc(
 why="""A hand-off transfers control and a typed artefact to the next agent. It is a relay, not a nest. Use it when stages are truly sequential and later stages should not see earlier raw context.

The contract is the artefact. If B needs A’s 40-page dump, you did not hand off; you leaked.""",
 how="""A finishes with `{artefact, provenance, open_questions}`. Runtime starts B with that object as the user message plus B’s own tools. A is done.

Handoff ≠ agent-as-tool. Agent-as-tool returns to the caller. Handoff does not.

Example: transcribe → extract fields → file. Each stage has its own eval.""",
 failures=F("Handoff that includes the entire prior transcript “just in case.”",
 "B silently calling A back, forming a cycle.",
 "No schema so B guesses what A meant."),
 line="""Sequential hand-off is a typed artefact and a transfer of control. I do not pass the whole prior context, and I do not confuse this with a tool call that returns.""",
 walk="""Extract used to receive the raw audio transcript plus the transcriber’s chain of thought. You pass only `{text, confidence, language}`. Extract accuracy goes up; tokens drop.""",
 follow="""They ask how to undo a hand-off. Say: you usually do not. Escalate to a human or restart with a new artefact.""",
 measure="""Artefact schema-valid rate, tokens at the hop, and B’s success when given only the artefact.""",
 kps=K("Handoff transfers control plus a typed artefact.","Not the same as agent-as-tool (which returns).","Do not pass the entire prior transcript.","Each stage has its own eval.","Prevent cycles in the runtime.","Open questions travel with the artefact."),
 qs=[Q("What is the key difference between a handoff and agent-as-tool?", "Handoff transfers control; agent-as-tool returns a result to the caller.", "recall"),
     Q("What must a hand-off artefact contain?", "The data the next stage needs, provenance, and open questions — not the prior raw dump.", "apply"),
     Q("B keeps asking A questions after a hand-off. What is wrong?", "You built a cycle. Runtime should treat A as finished or use agent-as-tool instead.", "debug"),
     Q("When is sequential the wrong pattern?", "When stages are independent and could run in parallel, or when one agent with tools would keep the state cheaper.", "apply")],
 links=[L["oa_sdk"], L["oai_agents"]],
),
"parallel-specialists": sc(
 why="""Parallel specialists cut wall-clock time when work is independent: sanctions, PEP, media checks. They also create merge problems: conflict, stragglers, cost multiplied by N.

Interviews: timeout plus a conflict policy, not “average the text.”""",
 how="""Fan out N briefs. Each specialist has its own tools and a cap. A merger waits until all return or a timeout. Policy: require k of N, or fail if a required specialist fails.

Conflicts: surface both answers with sources; do not silently pick the first. If the task is boolean (sanction hit), OR may be the rule. If it is a summary, a judge with citations.""",
 failures=F("Wait-forever for a slow specialist.",
 "Picking the first to finish as truth.",
 "Specialists that secretly share a write tool and race."),
 line="""Parallel specialists need independence, a timeout, and a merge rule. I surface conflicts with sources instead of averaging prose.""",
 walk="""Three KYC checks: two return in 1.2s, media takes 8s. You time out media at 3s and mark it `unknown`. Onboarding continues with a flag instead of stalling.""",
 follow="""They ask about averaging embeddings of answers. Say: that hides disagreement. I show the conflict.""",
 measure="""p95 wall time versus sequential, timeout rate, conflict rate, silent-pick incidents (target 0).""",
 kps=K("Parallel only if work is independent.","Timeout stragglers; define k-of-N.","Merge with a rule, not “first done.”","Surface conflicts with sources.","Do not give parallel writers the same record.","Cost is roughly N times a single specialist."),
 qs=[Q("Two parallel specialists contradict and one is slow. Sound policy?", "Apply a timeout, surface the conflict with sources, resolve by rule or disclosure.", "apply"),
     Q("When is parallel the wrong default?", "When specialists need each other’s outputs or share a write.", "recall"),
     Q("Why not pick the first result?", "Speed is not truth. A fast empty search can beat a slow correct one.", "debug"),
     Q("What does k-of-N mean here?", "You can finish when k specialists return, as long as required ones are in the k or explicitly optional.", "recall")],
 links=[L["oai_agents"], L["lg"]],
),
"hierarchical-supervisor-worker": sc(
 why="""A flat orchestrator that chooses among 40 workers will mis-pick. Hierarchy narrows each decision: a top supervisor picks a team lead, the lead picks a worker. You pay extra hops and compressed briefs.

Use it at scale, not at three workers.""",
 how="""Top: route to domain (billing, identity, docs). Domain lead: pick a worker and brief it. Worker: do the job. Returns climb the same way, validated at each level.

Keep depth at two unless you have evidence. Each level should have a tiny catalogue (5–8 choices), not 40.""",
 failures=F("Three layers for a four-tool product.",
 "Leads that rewrite worker output until the user’s question is gone.",
 "No path for a worker to escalate past a bad lead."),
 line="""Hierarchy narrows choices when one orchestrator cannot pick among many workers. I keep it shallow and I validate at each hop.""",
 walk="""A 25-tool support bot misroutes. You add billing vs identity leads. Routing accuracy rises 12 points; p95 grows 1.4s. You accept the trade because misroutes were costly.""",
 follow="""They ask about deeper trees. Say: each layer multiplies failure. I want two until a metric says three.""",
 measure="""Routing accuracy by layer, extra latency per layer, and escalations past a lead.""",
 kps=K("Hierarchy is for large choice sets.","Keep depth shallow (usually two).","Each node sees a small catalogue.","Validate returns at every hop.","Allow escalate-past-lead.","Do not use hierarchy as decoration."),
 qs=[Q("When does a hierarchical supervisor beat a flat orchestrator?", "When the number of workers or tools is too large for one chooser to pick reliably.", "apply"),
     Q("What is the cost of an extra layer?", "Latency, compression of the brief, and another place to drop the user’s goal.", "recall"),
     Q("A lead keeps “improving” a correct worker answer. Fix?", "Validate against the schema and stop rewrite-by-default. Escalate if the lead disagrees.", "debug"),
     Q("How many choices should a supervisor see?", "A handful. If it sees 40, you have not hierarchised, you have nested a mess.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"building-an-orchestrator": sc(
 why="""Building the orchestrator is product work: a decomposer, a router, a brief writer, a validator, a merger, and a stop. If you only write “you are the manager” in a prompt, you built a vibe.

Interviews: list those jobs and where they live (code vs model).""",
 how="""Decompose and route can be a model with a closed label set, or a classifier. Briefs are templates filled from state. Validation is code. Merge can be code (concat sections) or a model with citations.

Write the orchestrator so a worker can be replaced by a function. If every worker is “just another LLM,” you still need the same envelope.""",
 failures=F("Orchestrator prompt that also executes tools “to help.” It stops being an orchestrator.",
 "No max workers or max depth.",
 "Merger that ignores worker errors and writes a confident essay."),
 line="""I build an orchestrator as decompose, brief, validate, merge, stop — with code on the envelope and a model only where a label or a synthesis is needed.""",
 walk="""Your first orchestrator called tools itself and raced the workers. You strip its tools to `delegate` and `finish`. Duplicated work disappears from traces.""",
 follow="""They ask if the orchestrator should be a bigger model. Say: only if decompose quality needs it. The envelope stays in code.""",
 measure="""Duplicate-work rate, invalid merges, depth, and success versus a single-agent baseline.""",
 kps=K("Orchestrator jobs: decompose, route, brief, validate, merge, stop.","Keep the envelope in code.","A closed label set beats an open “invent a worker.”","Cap depth and worker count.","Do not let the orchestrator do the workers’ tools.","Replaceable workers prove the envelope works."),
 qs=[Q("List the jobs of an orchestrator you would actually implement.", "Decompose, route, write a brief, validate the return, merge or retry, and stop.", "recall"),
     Q("The orchestrator duplicates worker tool calls. What do you change?", "Remove those tools from the orchestrator; leave delegate and finish.", "debug"),
     Q("Which orchestrator jobs belong in code?", "Validation, caps, routing to a closed set, and stop. Synthesis may be a model.", "apply"),
     Q("Why make workers replaceable by functions?", "If the envelope only works with LLMs, you do not have an orchestrator — you have a group chat.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"passing-state-aggregating-output": sc(
 why="""State across agents is a leak surface and a gift. Pass the minimum that the next agent needs. Aggregate with a schema, a conflict rule and provenance. “Stick the transcripts together” is how you blow the window and hide disagreement.""",
 how="""Define a run state the orchestrator owns: `{goal, artefacts{}, decisions[]}`. Workers get a slice. They return a patch, not a new universe.

Aggregation: validate each patch, apply reducers (append findings, max risk, union citations). On conflict, record both and apply the rule. Render the user answer from the aggregated state, not from the last worker’s essay.""",
 failures=F("Passing full transcripts between three agents.",
 "Last-writer-wins on `risk_score`.",
 "Aggregation that drops citations."),
 line="""I pass slices of state, not transcripts. I aggregate with reducers and provenance. The user answer is rendered from the merged state.""",
 walk="""Two workers both set `risk`. Last write was “low” after “high.” You change the reducer to `max` and keep both notes. A high-risk customer stops getting a green letter.""",
 follow="""They mention LangGraph reducers. Say: same idea even if you do not use the library. Concurrent writes need a merge function.""",
 measure="""Tokens passed per hop, conflict rate, citation-retention, last-writer incidents.""",
 kps=K("Pass the minimum slice, not the transcript.","Workers return patches to a shared schema.","Reducers must be explicit (append, max, union).","Keep provenance on merged fields.","Render the user answer from aggregated state.","Last-writer-wins is usually a bug."),
 qs=[Q("How should workers share state?", "Through a typed run state and patches, not by forwarding full transcripts.", "recall"),
     Q("Two workers write results and only one survives. Likely cause?", "A replace merge. Define an append or domain reducer.", "debug"),
     Q("What must aggregation preserve?", "Provenance and conflicts. Do not drop the losing finding silently.", "apply"),
     Q("Why render from aggregated state rather than the last essay?", "The last essay may ignore a high-risk patch. The state is the source of truth.", "apply")],
 links=[L["lg"], L["oai_agents"]],
),
"worker-failure-escalation": sc(
 why="""Workers fail. The orchestrator retries, reassigns, or escalates. Infinite reassignment is a loop. Silent ignore is a wrong answer. Escalation is a first-class outcome: human or a fallback workflow.""",
 how="""On typed worker failure: (1) retry once if transient, (2) reassign to an alternative worker if one exists, (3) escalate with the brief and the error, (4) never mark the parent success.

Budgets: max retries per worker, max reassigns per goal. Escalation payload is something a human can act on.""",
 failures=F("Retrying a schema error five times.",
 "Reassigning forever between two equally bad workers.",
 "Parent success when a required worker failed."),
 line="""I retry transients, reassign once if there is an alternative, then escalate with the brief and the error. A required worker failure fails the parent.""",
 walk="""A web worker 403s. You do not retry. You reassign to an internal corpus worker. If that misses, you escalate “no source for claim X.” The parent no longer invents a citation.""",
 follow="""They ask about automatic model upgrade on failure. Say: only if evals show it helps that slice; it is a reassign, and it still has a cap.""",
 measure="""Recovery rate, escalate rate, false-parent-success (target 0), reassign loops.""",
 kps=K("Classify worker failures like tool failures.","Retry transients; do not retry bad briefs forever.","Reassign with a cap.","Required worker failure fails the parent.","Escalation includes brief, error and artefacts.","Do not invent a result to look complete."),
 qs=[Q("A worker returns 403. Preferred orchestrator behaviour?", "Do not retry blindly; reassign or escalate.", "apply"),
     Q("Parent said success after a required worker failed. What is the bug?", "Success was tied to “got some text.” Bind parent success to required worker ok flags.", "debug"),
     Q("How many times do you reassign?", "A small cap, then escalate. Reassign loops are multi-agent runaways.", "recall"),
     Q("What does an escalation payload contain?", "The brief, the error class, artefacts so far, and what the human needs to decide.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"what-goes-wrong-with-many-agents": sc(
 why="""The failure mode list is predictable: duplicated work, coordination overhead, context growth, conflicting results, latency and cost. Interviewers want this list and one mitigation each. If you only praise multi-agent, you have not run one.""",
 how="""Duplication: workers overlap tools — namespace and split permissions. Overhead: every hop is a call — measure hops per success. Context: transcripts pile up — pass slices. Conflict: merge rules. Latency: parallelise only independents, timeout. Cost: N models × steps — justify each agent.

A weekly review of traces that involved >2 agents should ask: would one agent have sufficed?""",
 failures=F("Adding agents to fix a prompt problem.",
 "No hop budget.",
 "Ignoring conflicts because the UI only shows one answer."),
 line="""Many agents fail by duplication, overhead, context bloat, conflict, latency and cost. I can name a mitigation for each, and I keep asking whether one agent would do.""",
 walk="""Five agents, 0.9 reliable each, end-to-end ~0.59. You drop two ceremonial roles, add validation, and measured success rises even though “the system looks simpler.”""",
 follow="""They quote 0.9^5. Agree it is illustrative, then show your hop-fail rate.""",
 measure="""Agents per successful task, hops, duplicate-tool rate, conflict rate, $ per success versus one-agent.""",
 kps=K("Expect duplication, overhead, bloat, conflict, latency, cost.","Mitigate each; do not just add roles.","Compounded per-agent error is real.","A hop budget is a stop condition.","Review whether one agent would have sufficed.","UI must be able to show conflict, not only a winner."),
 qs=[Q("Five agents at 90% reliability. About what is end-to-end, and what follows?", "About 59%. Justify each agent, add validation and caps.", "apply"),
     Q("List common multi-agent problems.", "Duplicated work, coordination overhead, context growth, conflicting results, latency and cost.", "recall"),
     Q("How do you mitigate context growth across agents?", "Pass slices and artefacts, not transcripts. Cap worker results.", "apply"),
     Q("A dashboard only shows the merged answer. What is hidden?", "Conflicts and losing findings. Log and optionally surface them.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"a2a-vs-mcp": sc(
 why="""MCP connects agents to tools and resources. A2A (agent-to-agent) is an interoperability idea for independently built agents that delegate goals to each other. Mixing the words is a common interview fail.

You do not need A2A to call your own worker function. You need it when another vendor’s agent must take a goal and return later.""",
 how="""MCP: your host calls `search_tickets` on a server. A2A: your agent sends a goal to a counterpart that has its own loop, tools and vendor, and you wait for an artefact or a failure.

Treat a remote agent as more dangerous than a tool: longer time, unclear side effects, weaker schemas. Use a contract (typed result, deadline, cancel) and never share your user token wholesale.""",
 failures=F("Calling a local worker “A2A” because two prompts exist.",
 "Using A2A for a calculator.",
 "Forwarding admin credentials to a foreign agent."),
 line="""MCP is tools and resources. A2A is independently built agents delegating goals. I use A2A only across trust boundaries, with a contract and a deadline.""",
 walk="""A partner’s research agent takes a goal and a deadline, returns `{memo, sources}` over an agreed protocol. Your CRM tools stay MCP. You do not wrap the partner as a fake local function that hides the long wait.""",
 follow="""They ask which to implement first. Say: MCP or local tools. A2A when a real foreign agent exists.""",
 measure="""Foreign-agent timeouts, contract-valid returns, credential-scope reviews.""",
 kps=K("MCP: connect to tools/resources.","A2A: connect independently built agents.","Local workers are not A2A.","Foreign agents need a deadline, cancel and typed result.","Do not share wholesale user tokens.","Pick MCP first unless a real foreign agent exists."),
 qs=[Q("Which is the right use of A2A rather than MCP?", "Delegating a long-running goal to another vendor’s autonomous agent — not reading a file or querying a database.", "apply"),
     Q("Is two internal workers A2A?", "Usually no. That is your orchestrator calling functions. A2A is interoperability across independently built agents.", "recall"),
     Q("What extra risks does A2A add versus a tool?", "Unknown duration, unknown side effects, weaker control of the inner loop. You need a contract and a deadline.", "recall"),
     Q("What must you not forward to a foreign agent?", "Your admin or full user token. Issue a scoped, short-lived capability.", "debug")],
 links=[L["mcp"], L["oai_agents"]],
),
"when-one-strong-agent-is-better": sc(
 why="""One strong agent with a few tools beats a crew when the work is tightly coupled, the state must stay consistent, or you cannot afford hop latency. Specialisation is real; coordination bugs are more common than people admit.

The interview line: extra agents add coordination bugs faster than they add quality — until you measure otherwise.""",
 how="""Run a bake-off: one agent vs the crew on the same eval. If the crew wins on a named slice (huge context, hard permission split), keep the split only there.

Coupled editing of one file, one customer record, or one SQL migration: one agent. Parallel research across corpora: maybe more.""",
 failures=F("Crew-first as a fashion.",
 "Refusing to merge after the bake-off said so.",
 "One agent with 40 overlapping tools — that is not “strong,” that is a mess."),
 line="""I default to one strong agent with a tight tool list. I split when a bake-off shows isolation or permissions winning. Extra agents add bugs faster than quality until proven otherwise.""",
 walk="""A four-role writer crew took 70s and still contradicted itself. One agent with a outline-then-draft prompt took 22s and scored higher. You keep the crew only for the multilingual review slice.""",
 follow="""They say “but Netflix of agents.” Ask for the metric. If there is none, you have a slogan.""",
 measure="""Quality, latency, $ , and incident rate for one vs many on the same set.""",
 kps=K("Default: one agent, few tools.","Bake-off any crew on a real eval.","Coupled state wants one writer.","A 40-tool “single agent” is not strong.","Keep splits only on the winning slice.","Coordination bugs arrive faster than quality."),
 qs=[Q("When is one strong agent preferable to several?", "Tightly coupled sequential work, shared mutable state, or when a bake-off shows no gain from the split.", "apply"),
     Q("What should you measure in the bake-off?", "Task success, latency, cost, and incidents — same cases, both systems.", "recall"),
     Q("Why can extra agents hurt quality?", "Information loss at hops, conflicts, and compounded per-agent error.", "recall"),
     Q("A single agent has 40 tools and mis-selects. Is that an argument for multi-agent?", "Not first. Shrink and cluster the catalogue. Split only if a permission or context limit remains.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"handoff-contracts": sc(
 what="""**Workers return a typed result or a typed failure, never a vibe.** That is the hand-off contract. `ok` plus a schema, or `error` plus a class and a hint. Prose that “kind of found it” cannot be merged, tested, or retried sanely.

This is the multi-agent version of typed tool errors.""",
 why="""Most crew demos die in aggregation because the parent has to read novels. In interviews, “typed result or typed failure” is the sentence that shows you have merged outputs for real.

On the job the contract is also your eval: you can unit-test a worker without the parent.""",
 how="""Specify `WorkerResult = {ok: true, data: T} | {ok: false, error: class, hint, retryable}`. Validate in the runtime. Invalid JSON is a typed failure, not a chance for the parent to guess.

Version the schema. A worker that adds a field must not break old parents. Keep a golden set of worker outputs.""",
 failures=F("Accepting markdown with a heading as success.",
 "Parent parsing natural language for a number.",
 "Failure that looks like success (“I couldn’t find it, but here’s a guess”)."),
 line="""Hand-off contracts are typed result or typed failure. I validate in the runtime. Vibes are invalid, not “close enough.”""",
 walk="""A research worker returned a bloggy memo. The parent invented citations. You require `{claims[{text, source_id}]}` or `{ok:false, error:"no_sources"}`. Invented citations on that path go to zero.""",
 follow="""They ask about streaming vibes for UX. Say: stream progress titles; the contract is still the final object.""",
 measure="""Schema-valid rate, parent-guess rate (target 0), worker unit-test coverage.""",
 kps=K("Typed result or typed failure, never a vibe.","Validate in the runtime before the parent sees it.","Invalid JSON is a failure class.","Version the worker schema.","Unit-test workers against the contract.","Progress UX is not a substitute for the object."),
 qs=[Q("What should a worker return?", "A typed result that matches a schema, or a typed failure with a class and hint — not a free-form vibe.", "recall"),
     Q("The parent extracts a number from a paragraph. What is wrong?", "The contract leaked into NLP. Put the number in a field and validate it.", "debug"),
     Q("How do you test a worker without the parent?", "Feed briefs, assert the schema and a few golden data fields. That is the contract.", "apply"),
     Q("A worker says it failed but also guesses an answer. How do you treat it?", "As a failure. Guesses do not ride along on ok:false unless you have an explicit `hypothesis` field you distrust.", "apply"),
     Q("Why version the schema?", "Parents and workers deploy independently. A silent field change breaks merges.", "recall")],
 links=[L["oai_agents"], L["lg"]],
),
"when-one-agent-is-enough": sc(
 what="""**Extra agents add coordination bugs faster than they add quality.** This is the default you defend until a bake-off says otherwise. One agent, a tight tool list, a cap, and a trace will solve most “we need a crew” stories.

Enough means the state fits, permissions can live in one policy, and evals are green.""",
 why="""You will be asked to justify a single agent in a room that watched a multi-agent demo. This sentence plus a bake-off is the whole defence. On the job it saves a quarter of orchestration work.""",
 how="""Write the one-agent design first. List the alleged reasons for more agents. For each, try a cheaper move: truncate context, split tools by tag, add a workflow node. Only then add a worker.

Keep the one-agent implementation around as the baseline forever. Crews have to beat it on the eval, not in a slide.""",
 failures=F("Deleting the one-agent baseline after the crew ships.",
 "Adding a crew because a vendor workshop did.",
 "Calling a workflow with two model nodes “one agent” or “four agents” inconsistently."),
 line="""One agent is enough until a bake-off shows a named benefit. Extra agents add coordination bugs faster than quality. I keep the single-agent baseline.""",
 walk="""A crew of planner/researcher/writer/critic is 4× cost. You restore the one-agent baseline; it wins on 70% of cases. You keep a researcher worker only for the long-PDF slice.""",
 follow="""They say coordination is “just engineering.” Agree, and then ask who is staffed to debug hops. If nobody, stay at one.""",
 measure="""Percent of traffic on one agent, crew win-rate on the held-out slice, hop-related incidents.""",
 kps=K("Default to one agent with a tight tool list.","Cheaper moves first: trim context, tag tools, workflow nodes.","Keep the one-agent baseline forever.","Crews must beat it on an eval.","Coordination bugs are a real cost centre.","Name the slice that still needs a split."),
 qs=[Q("What is the default until proven otherwise?", "One agent, few tools, a cap and a trace. Extra agents must win a bake-off.", "recall"),
     Q("A vendor demo has four roles. What do you do this week?", "Implement one agent, measure, then try a worker only on the failing slice.", "apply"),
     Q("Why keep the single-agent baseline after a crew ships?", "So you can prove the crew still wins and roll back when it does not.", "apply"),
     Q("Which cheaper moves should you try before adding agents?", "Truncate or retrieve context, shrink the tool catalogue, and put known steps in a workflow.", "recall"),
     Q("How do you know one agent is no longer enough?", "A named limit: window overflow, permission split, or a bake-off the crew wins on a real set.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
},
"m5-7": {
"what-langgraph-is-for": sc(
 why="""LangGraph is a low-level runtime for long-running, stateful agents: you model the work as a graph over shared state, with checkpoints, loops and interrupts. It is not “a smarter model” and it is overkill for a one-shot tool loop.

Interviews: name control flow, persistence, human-in-the-loop, observability.""",
 how="""You declare state, nodes (functions), edges (including conditional). The library runs a step, checkpoints, and can pause. Use it when you need resume after deploy, approval mid-graph, or branching you want in code.

Skip it when a 60-line loop is enough. Learn the primitive loop first so you can read a LangGraph trace.""",
 failures=F("Adopting it to look modern on a linear chain.",
 "Treating it as a replacement for evals.",
 "Ignoring that APIs change — read current docs."),
 line="""LangGraph is an orchestration runtime for stateful, interruptible graphs. I use it when I need explicit control, checkpoints or human nodes — not for a simple loop.""",
 walk="""A refund flow needed verify → approve → pay across deploys. A while-loop died on restart. You move it to a graph with a checkpointer and an interrupt. Resumes work.""",
 follow="""They ask “LangGraph vs Agents SDK.” Say: graph when I need durable control; SDK when I want a light loop and handoffs.""",
 measure="""Resume success after kill, interrupt correctness, time-to-debug a bad node.""",
 kps=K("Graph + shared state + checkpoints.","Wins: control flow, persistence, interrupts, inspectability.","Overkill for a single tool-calling loop.","Not a quality upgrade by itself.","Learn the primitive loop first.","Read current docs; APIs move."),
 qs=[Q("What problems does LangGraph address that a bare loop does not?", "Explicit branching, durable checkpoints, interrupts, multi-node composition and step inspection.", "recall"),
     Q("When would you not choose LangGraph?", "A simple prompt or a small tool loop with no resume or approval needs.", "apply"),
     Q("Is LangGraph a better model?", "No. It is orchestration. Model quality is unchanged.", "recall"),
     Q("What should you be able to do after a crash?", "Resume from the last checkpoint instead of restarting the whole run.", "apply")],
 links=[L["lg"], L["lg_persist"]],
),
"state-nodes-edges": sc(
 why="""The mental model is three words. **State** is the typed blob the run carries. **Nodes** are functions that take state and return a patch. **Edges** say who runs next, including conditionals.

If you cannot draw those, you will fight the framework.""",
 how="""Define state with reducers on keys that multiple nodes touch (`append` for messages). A node should do one job: call a model, call a tool, decide, or transform. Edges are static or conditional functions of state.

Example: `retrieve` → `generate` → conditional to `tool` or `end`. Keep state small enough to checkpoint.""",
 failures=F("A mega-node that does retrieve, generate and pay.",
 "Default replace reducer on a list two nodes append.",
 "Putting huge blobs in state every step."),
 line="""State is the typed blob, nodes return patches, edges choose the next node. I set reducers on concurrent keys and I keep state checkpoint-sized.""",
 walk="""Two parallel search nodes both wrote `results` and one vanished. You add an append reducer. Both findings survive.""",
 follow="""They ask about messages as state. Say: messages are one key, with an add-message reducer, not the whole story. Pins live in other keys.""",
 measure="""Lost concurrent updates, checkpoint size, node fan-in/out complexity.""",
 kps=K("State is typed and reduced.","Nodes are single-purpose functions.","Edges, including conditionals, own control flow.","Set reducers on keys many nodes write.","Keep state small enough to persist.","Do not hide a whole agent inside one node without a reason."),
 qs=[Q("Two parallel nodes append findings but only one set survives. Fix?", "Define an append/merge reducer for that key. Default is replace.", "debug"),
     Q("What does a node return?", "A patch to state, not necessarily the whole object.", "recall"),
     Q("What decides the next node?", "An edge — static or a function of state.", "recall"),
     Q("Why not put a 20k PDF in state every step?", "Checkpoints and every later node will carry it. Store an id instead.", "apply")],
 links=[L["lg"], L["lg_persist"]],
),
"building-nodes": sc(
 why="""Nodes are where work happens: model call, tool, deterministic transform, decision. Small nodes are testable. A node that does four things is a hidden loop.

Interviews: give an example of each kind.""",
 how="""`call_model` writes `messages`. `run_tools` executes declared calls and writes results. `validate` is pure code. `route` writes a next-step label. Keep side effects in obvious nodes so interrupts can sit in front of them.

Unit-test `validate` without a model. That is the point.""",
 failures=F("Side effect at the start of a node that later interrupts — resume doubles the email.",
 "Model call buried inside `validate`.",
 "Untestable nodes that need the whole graph."),
 line="""I build small nodes: model, tools, transform, decide. Side effects sit after interrupts. I unit-test the deterministic ones.""",
 walk="""`send_email` used to sit in the same node as `draft`. Resume after approval resent the mail. You split draft | interrupt | send. The bug dies.""",
 follow="""They ask how big a node should be. Say: one reason to change.""",
 measure="""Node unit-test coverage, double-effect incidents, average node size.""",
 kps=K("One job per node.","Kinds: model, tool, transform, decide.","Side effects after interrupts.","Deterministic nodes are unit-tested.","Do not bury a loop in a single node.","Name nodes after the artefact they produce."),
 qs=[Q("A node sends email then interrupts; after approval the email goes twice. Fix?", "Move the side effect after the interrupt, or guard it with an idempotency flag. Resume restarts the node.", "debug"),
     Q("Which nodes should you unit-test without a model?", "Validators, reducers, routers — anything deterministic.", "apply"),
     Q("Name four kinds of nodes.", "Model call, tool execution, processing/transform, decision/route.", "recall"),
     Q("Why split draft and send?", "So approval can sit between them and resume cannot resend.", "apply")],
 links=[L["lg"], L["lg_hitl"]],
),
"conditional-edges": sc(
 why="""Conditional edges are how a graph branches without becoming an agent-in-a-node. A function of state returns the next node name from a closed set. That is a router you can test.

Open-ended “the model decides any node” is an agent again — name it and cap it.""",
 how="""`def route(state): return "tools" if state.tool_calls else "end"`. Map every return value. Unknown labels fail closed.

For richer routing, a model emits a label from an enum; code maps the enum. Do not let the model return an arbitrary string that you `eval` into a jump.""",
 failures=F("A default edge that swallows bugs.",
 "A router that can jump to a write node with no approval.",
 "Unmapped labels that crash mid-run."),
 line="""Conditional edges are tested functions from state to a closed set of next nodes. If the model picks freely among all nodes, I treat that as an agent and cap it.""",
 walk="""A router returned `"pay"` on a typo path because of a fuzzy match. You fail closed on unknown labels. The graph stops at `needs_human` instead of paying.""",
 follow="""They ask about dynamic node creation. Say: I do not create nodes at runtime in production. I route among declared ones.""",
 measure="""Misroute rate, unknown-label rate, unit tests per router.""",
 kps=K("Routers return a closed set of node names.","Unknown labels fail closed.","A model may choose an enum; code maps it.","Do not jump to writes without the approval edge.","Test routers as pure functions.","An unbounded jump table is an agent."),
 qs=[Q("What does a conditional edge do?", "It picks the next node from state using a function, preferably over a closed label set.", "recall"),
     Q("The router emits a typo label. What should happen?", "Fail closed to a safe node (human or end), not a fuzzy match to pay.", "debug"),
     Q("When is a conditional edge the wrong tool?", "When the next step is a free-form tool choice among many. That is a tool-calling agent node with a cap.", "apply"),
     Q("Why unit-test the router?", "It is deterministic control flow. You can cover the branches without paying for a model.", "apply")],
 links=[L["lg"], L["oai_agents"]],
),
"loops-for-retries-iteration": sc(
 why="""Graphs loop when you edge back: tool → model → tool, or validate → fix → validate. Loops need the same caps as an agent: attempt counter, error fed back, give-up route.

A graph without a give-up edge is a prettier infinite loop.""",
 how="""Store `attempts` in state. The validate node increments. The conditional edge goes to `fix` while attempts < N and errors exist, else `give_up` or `end`.

Feed the error into state so the next model call sees it. Do not retry on the same input without that.""",
 failures=F("Unlimited retries at temperature 0 hoping luck changes.",
 "Loop with no attempt key so the cap cannot work.",
 "Retrying a permanent validation error (schema)."),
 line="""Graph loops are edges plus a counter. I cap attempts, feed the error back, and have a give-up route.""",
 walk="""JSON validate failed 40 times. You add `attempts` and a give-up that returns the last error to the user. Median retries become 1; p95 becomes 3.""",
 follow="""They ask about unbounded “until quality is good.” Say: quality is a score with a cap, not a feeling.""",
 measure="""Loop iterations p95, give-up rate, success after retry.""",
 kps=K("Loops are edges, not magic.","Store an attempt counter in state.","Feed errors into the next iteration.","Give-up is a real node.","Do not retry permanent errors.","Caps apply to graph loops the same as while-loops."),
 qs=[Q("Which design makes a validate-and-retry loop safe?", "An attempt counter with a cap, the error fed back, and a give-up route.", "apply"),
     Q("Why is temperature 0 not a retry strategy?", "The input did not change. You will fail the same way. Change the input or give up.", "debug"),
     Q("Where does the attempt counter live?", "In state, incremented by a node, read by the conditional edge.", "recall"),
     Q("When is a loop the wrong structure?", "When the next action is unknown among many tools — use a capped agent node instead of exploding the graph.", "apply")],
 links=[L["lg"], L["lg_persist"]],
),
"checkpointing-persistence": sc(
 why="""A checkpoint is a snapshot of state after a step so a crash or deploy is not a restart. In-memory savers die with the process. Production needs a durable store.

This is why people adopt a graph runtime.""",
 how="""After each node (or each “superstep”), write state plus a cursor. On resume, load the latest checkpoint and run the next edge. Version the state schema. Use thread ids so two users do not share a checkpoint.

Do not checkpoint secrets in the clear. Redact tool args that contain tokens.""",
 failures=F("In-memory checkpointer in prod.",
 "Schema change that cannot load old checkpoints.",
 "Checkpointing raw card numbers."),
 line="""I persist a checkpoint after each node so a crash is not a restart. Durable store, thread id, versioned schema, redacted secrets.""",
 walk="""A redeploy wiped in-memory graphs. Users lost 10-minute runs. You switch to a Postgres saver. The next deploy resumes mid-approval.""",
 follow="""They ask about checkpoint size. Say: store artefact ids, not PDFs, or the saver becomes the bottleneck.""",
 measure="""Resume success after kill, checkpoint bytes, schema-migration failures.""",
 kps=K("Checkpoint after each node (or superstep).","Use a durable store in production.","Thread ids isolate runs.","Version state so old checkpoints load or migrate.","Redact secrets from checkpoints.","Store ids, not giant blobs."),
 qs=[Q("After a redeploy, conversations lose history. Most probable cause?", "An in-memory checkpointer. Use a durable store.", "debug"),
     Q("What is a checkpoint for?", "To persist state so execution can survive interruption and resume.", "recall"),
     Q("What must you version?", "The state schema. Old runs will resume after you ship.", "apply"),
     Q("Why redact checkpoints?", "They are a new database of user data and tokens. Treat them like logs.", "apply")],
 links=[L["lg_persist"], L["lg"]],
),
"resuming-long-runs": sc(
 why="""Resume is the user-visible payoff of checkpoints: a 20-minute research job survives a deploy. Resume must be safe: side effects are idempotent, the user sees the same thread, and you do not replay a paid API blindly.

Interviews: “how do you resume without double-paying?”""",
 how="""On start, if a thread id has a checkpoint and status is interrupted, load and continue. Nodes that pay or email check an idempotency key in state first.

Tell the user “resuming step 7: ranking sources.” Cancel still works. If the schema cannot migrate, fail into a human queue rather than a corrupt continue.""",
 failures=F("Always starting a new thread so “resume” is a lie.",
 "Replaying a non-idempotent node.",
 "Resuming into a different code version that misunderstands state."),
 line="""I resume from the last checkpoint on the same thread, with idempotent side effects and a user-visible step title. I do not silently start over.""",
 walk="""A worker dies at step 9 of 12. The next worker picks up the thread, skips the already-paid search API via keys, and finishes. The user sees one job, not two bills.""",
 follow="""They ask about changing the graph mid-flight. Say: I migrate or I park the run. I do not pretend old edges still exist.""",
 measure="""Resume success, duplicate side effects after resume, user-visible “started over” tickets.""",
 kps=K("Resume loads the thread’s latest checkpoint.","Side-effect nodes are idempotent.","Show the user you resumed, not a new job.","Cancel still applies after resume.","Incompatible schema → human queue, not a corrupt continue.","Do not bill twice for replayed tools."),
 qs=[Q("Production runs die on deploys. Best structural fix?", "Checkpoint each step with idempotent actions and resume in workers.", "apply"),
     Q("What must be true of a pay node for resume to be safe?", "It checks an idempotency key / persisted status before executing.", "recall"),
     Q("The graph changed and an old run resumes. What do you do?", "Migrate state or park for a human. Do not jump into missing nodes.", "debug"),
     Q("How does the UI talk about resume?", "Same job id, current step title, elapsed time. Not a second spinner.", "apply")],
 links=[L["lg_persist"], L["lg"]],
),
"human-in-the-loop-interrupts": sc(
 why="""An interrupt is a first-class pause: the graph stops before a node, waits for a value (approval, edit, extra info), then resumes. It is not a comment in the prompt saying “ask the user.”

This is how consequential tools get a tick inside a graph.""",
 how="""Place `interrupt` before `execute_refund`. The UI reads the pending payload (amount, recipient), collects a tick or an edit, and the runtime resumes with that value in state. Denial routes to `aborted`.

Timeouts: an interrupt that waits forever is a leaked job. Expire it.

Test denial: the side effect must not run.""",
 failures=F("Prompt-only “please confirm” while the next node still runs.",
 "Side effect before the interrupt in the same node.",
 "No expiry on pending approvals."),
 line="""Approval is a node — an interrupt — not a comment in the prompt. I resume with the user’s value, and denial is a tested path.""",
 walk="""You move `interrupt` before `send`. A denied run never hits send. An expired interrupt goes to `aborted` after 24h and the user gets mail.""",
 follow="""They ask if a chat “yes” can complete the interrupt. Say: only if the UI turns it into the approval value. The model does not self-approve.""",
 measure="""Denied runs with zero side effects, expiry rate, time-to-approve, double-send after resume.""",
 kps=K("Interrupt is a runtime pause, not a prompt.","Put it before the side-effect node.","Denial and expiry are real edges.","The model cannot self-approve.","Test that denied means no effect.","Pending interrupts need a TTL."),
 qs=[Q("Why is human interrupt a first-class edge?", "Because approval must stop the graph in the runtime. A prompt is advisory.", "recall"),
     Q("Where do you put the interrupt relative to send?", "In its own step before send, never after a send in the same node.", "apply"),
     Q("How do you test the gate?", "Simulate denial and assert the world did not change.", "apply"),
     Q("A pending approval sits for a week. What should happen?", "Expire to aborted, notify the user, do not execute.", "debug")],
 links=[L["lg_hitl"], L["lg"]],
),
"inspecting-state-to-debug": sc(
 why="""A wrong final answer in a graph is a state problem. Find the first checkpoint where a key went bad, inspect that node, fork and replay from the previous checkpoint. That is faster than rewriting the prompt blindly.

This is the observability pitch for graphs.""",
 how="""Every run has a thread id and a list of checkpoints. UI: step list, state diff, node name. On a bad answer, walk backward until `amount` was still right. Open that node’s inputs.

Fork: copy state from checkpoint k, change one field or the node code, rerun forward. Do this on fixtures, not only on prod threads.""",
 failures=F("Debugging only the last message.",
 "No diffs, so you cannot see which key changed.",
 "Re-running from scratch and hoping."),
 line="""I debug a graph by walking checkpoints to the first bad state, inspecting that node, and forking a replay. I do not start with a prompt rewrite.""",
 walk="""Final refund is $400. Checkpoint 4 still has $40. Node `apply_coupon` doubled then the model “helpfully” added a zero. You fix the node and replay from 3. The prompt never changed.""",
 follow="""They ask about logging every token. Say: I log state diffs and tool args (redacted). Full tokens are optional and expensive.""",
 measure="""Time-to-first-bad-checkpoint, replay-from-fork success, incidents fixed without prompt changes.""",
 kps=K("Walk checkpoints to the first bad key.","Diff state between steps.","Fork and replay from before the bad node.","Redact secrets in stored state.","Prompt rewrite is last, not first.","Thread id is the index into the debug UI."),
 qs=[Q("Best debugging move for a wrong final answer in a checkpointed graph?", "Find the first checkpoint with bad state, inspect that node, fork and re-run from before it.", "apply"),
     Q("Why are state diffs more useful than the last message?", "They show which key changed at which node. The last message is a symptom.", "recall"),
     Q("What is a fork?", "A copy of state at checkpoint k that you can replay with a code or input change.", "recall"),
     Q("The amount is wrong and every checkpoint looks fine. What then?", "The renderer or the user-facing mapper is wrong. Inspect the last transform, not the model.", "debug")],
 links=[L["lg_persist"], L["lg"]],
),
"when-a-graph-beats-a-loop": sc(
 why="""A graph beats a while-loop when you need durable resume, explicit branches you can test, interrupts, or several named stages you want to observe. A loop beats a graph when the path is “call tools until done” and you do not persist.

Do not adopt a graph to feel serious.""",
 how="""Choose graph: refund with approval; multi-day research; fan-out/fan-in you want in code. Choose loop: a coding agent on a throwaway task, a 3-tool support lookup.

Hybrid: a graph of stages whose middle node is a capped tool-calling loop. That is common and honest.""",
 failures=F("Graph for a single LLM call.",
 "Loop for a regulated multi-day workflow.",
 "A graph that is actually one node with an inner unbounded agent."),
 line="""I use a graph when I need control, persistence or interrupts I can test. I use a loop when the path is open and short-lived. A hybrid is allowed if I name the inner cap.""",
 walk="""Two products: a weekend toy coder stays a loop. A claims workflow moves to a graph after the second lost-on-deploy incident. Both were correct choices.""",
 follow="""They ask for a rule of thumb. Say: if I need to resume after a process death, I want a graph or I must invent checkpoints myself.""",
 measure="""Resume requirements met, time-to-add a tested branch, inner-loop cap violations.""",
 kps=K("Graph: durable control, interrupts, tested branches.","Loop: open-ended short-lived tool use.","Hybrid: graph of stages, capped agent node in the middle.","Do not graph a single call.","Do not loop a multi-day regulated flow without persistence.","Name the inner cap if a node is an agent."),
 qs=[Q("What is the primary reason to adopt a graph over a bare tool-calling loop?", "Explicit control flow, durable state, and interrupts for branching or long-running work.", "recall"),
     Q("When does a loop still win?", "Short, open-ended tool use with no resume or approval requirement.", "apply"),
     Q("A graph has one node that is an unbounded agent. What is it really?", "An agent with ceremony. Cap it and be honest in the design review.", "debug"),
     Q("Why is a tested branch easier in a graph?", "The edge is a function you unit-test. In a free loop the branch is a sampled thought.", "apply")],
 links=[L["lg"], L["oai_agents"]],
),
"checkpoints-you-can-resume": sc(
 what="""**Persist state after each node so a crash is not a restart.** That is the operational rule behind checkpointing. “We have LangGraph” is not enough if the saver is memory, if you skip nodes, or if resume is untested.

Resume is a product feature. Test it like one.""",
 why="""This is the interview follow-up to “we checkpoint.” They want to hear after-each-node, durable store, kill-and-resume test. On the job, this is how deploys stop being user-visible failures.""",
 how="""Policy: checkpoint on node exit, including after interrupts. Store: Postgres or equivalent, not LRU memory. Test: SIGKILL a worker mid-run in CI and assert the next worker finishes the same thread without a second charge.

Document which nodes are unsafe to replay and lock them with keys.""",
 failures=F("Checkpoint every 10 nodes “for performance.” A crash loses 9 steps of side effects.",
 "No kill test in CI.",
 "Resume that starts a new thread id."),
 line="""I persist after each node in a durable store and I kill-test resume. A crash is not a restart, and it is not a second bill.""",
 walk="""CI kills the worker during `search`. The next worker resumes, the search key hits, no second billed query. You block merges that disable the saver.""",
 follow="""They ask about performance. Say: I measure checkpoint ms. If a node is tiny and pure, I can batch — but never across a side effect.""",
 measure="""Kill-test pass rate, checkpoint latency, lost-steps after incidents.""",
 kps=K("Checkpoint on every node exit that matters, especially after side effects.","Durable store, not memory.","CI kill-and-resume test.","Same thread id on resume.","Idempotency keys on replay-unsafe nodes.","Do not skip checkpoints across writes."),
 qs=[Q("How often should you persist if a crash must not restart?", "After each node, at least after any node with a side effect.", "recall"),
     Q("What CI test proves resume?", "Kill the worker mid-run and assert another worker finishes the same thread without duplicate side effects.", "apply"),
     Q("Why is an in-memory saver not “checkpoints you can resume” in prod?", "A process death loses them. Resume needs a store that survives the worker.", "debug"),
     Q("When may you batch checkpoints?", "Across tiny pure transforms, never across a write, and only if you measured the risk.", "apply"),
     Q("What identifier must survive the crash?", "The thread/run id the user and the saver share.", "recall")],
 links=[L["lg_persist"], L["lg"]],
),
"human-interrupt-as-a-first-class-edge": sc(
 what="""**Approval is a node, not a comment in the prompt.** The graph stops, the user sees a card, the value comes back as state, and only then does the write node run. If you cannot point to the interrupt edge on the diagram, you do not have human-in-the-loop.

This restates interrupts as a design rule you can say in one breath.""",
 why="""Interviewers will draw a graph and ask where approval lives. Pointing at a prompt box is a fail. Pointing at an interrupt edge is a pass. On the job this is also how auditors are shown the control.""",
 how="""Diagram: `preview → interrupt → execute | abort`. The interrupt payload is the card. Tests: approve path, deny path, timeout path. Metrics: time-to-decision, deny rate, execute-without-interrupt (must be 0).

The prompt may say “you will wait for approval.” That sentence does not implement the edge.""",
 failures=F("A comment in the system prompt as the only control.",
 "Interrupt after execute “to notify.”",
 "No deny edge."),
 line="""Approval is a node. I can point to the interrupt edge, I test deny, and execute is unreachable without it.""",
 walk="""A review finds “please confirm” in the prompt and a live execute tool. You add the edge. Execute-without-interrupt goes from possible to 0 in tests.""",
 follow="""They ask if a manager bot can approve. Say: only if that bot is an authenticated principal on the interrupt, not the same model talking to itself.""",
 measure="""Execute-without-interrupt (0), deny-path test pass, interrupt TTL breaches.""",
 kps=K("Approval is an interrupt edge on the diagram.","Execute is unreachable without it.","Deny and timeout are real paths.","Prompt text is not the control.","A self-approving model is not a principal.","Auditors can be shown the edge."),
 qs=[Q("Where does approval live in a production graph?", "As an interrupt node/edge before the write, with deny and timeout paths.", "recall"),
     Q("The system prompt says to wait for approval, but execute still ran. Why?", "The control was not in the runtime. Prompts do not block nodes.", "debug"),
     Q("Who may complete the interrupt?", "An authenticated user or policy principal — not the same model chatting “yes.”", "apply"),
     Q("What three paths do you test?", "Approve-then-execute, deny-then-no-effect, timeout-then-abort.", "apply"),
     Q("Why show this to an auditor?", "It is a demonstrable control: the write node cannot run without a recorded decision.", "recall")],
 links=[L["lg_hitl"], L["lg"]],
),
},
"m5-8": {
"why-generated-code-must-not-run-in-process": sc(
 why="""Model-generated Python or shell is attacker-controlled code. Running it in the web worker or API process is remote code execution on yourself. `exec` with a denylist is not a sandbox.

Interviews: process isolation, no secrets in the env, capture stdout only.""",
 how="""The agent emits code. You send it to a separate runner: container, microVM, or a managed sandbox. The app process never `eval`s it. The runner has no cloud keys, no VPC admin, a timeout, a memory cap.

If you need a result, take stdout/files through a size cap. Never import the generated module into the app.""",
 failures=F("`exec` behind a regex that blocks `os.system` — trivially bypassed.",
 "Running in a thread of the API process.",
 "Copying `AWS_SECRET` into the runner “so it can upload.”"),
 line="""Generated code is untrusted. It never runs in my app process. I use a sandbox with no secrets and I only take capped stdout back.""",
 walk="""A data agent’s `exec` read `/proc` and the env. You move it to a throwaway container with empty env. The next payload cannot see your keys.""",
 follow="""They mention RestrictedPython. Say: language-level sandboxes fail open. I want an OS or VM boundary.""",
 measure="""In-process exec count (target 0), sandbox escapes in red-team, secrets present in runner env (0).""",
 kps=K("Generated code is attacker-controlled.","Never exec in the app process.","Language denylists are not isolation.","No secrets in the runner env.","OS/VM/microVM or a managed sandbox.","Return capped stdout, not a live object."),
 qs=[Q("Why is Python-level restricted exec() not enough?", "It is not an OS-level boundary and does not reliably limit network, CPU or memory. Denylists get bypassed.", "recall"),
     Q("Where do cloud keys live relative to the runner?", "Not in the runner. The app fetches results and talks to the cloud itself if needed.", "apply"),
     Q("May you import generated code as a module?", "No. That is still in-process execution.", "recall"),
     Q("What is the interview one-liner?", "Process isolation, no secrets in the env, capture stdout only.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"sandboxes": sc(
 why="""E2B, Modal, containers, microVMs — the brand matters less than the properties: separate kernel or equivalent, ephemeral, no standing creds, snapshot-free of your home directory.

Interviews: pick one and name isolation, lifetime, network default.""",
 how="""Per run: create sandbox, upload the snippet and inputs, execute with time/memory caps, pull artefacts, destroy. Prefer providers or gVisor/Firecracker-style isolation for multi-tenant.

A long-lived shared container is a standing attack platform. Do not reuse it across untrusted users.""",
 failures=F("One fat container for all tenants.",
 "A sandbox with your laptop mounts.",
 "No destroy step so disks fill with attacker files."),
 line="""I run generated code in an ephemeral isolated environment — container, microVM or managed sandbox — then destroy it. No shared tenants, no home mounts.""",
 walk="""You move from a shared Python pod to per-run microVMs. A noisy neighbour crypto miner dies with the VM. Cost per run is a few cents; isolation is the point.""",
 follow="""They ask E2B vs DIY Docker. Say: I pick based on staff and threat. I can name the isolation property either way.""",
 measure="""Create-to-destroy time, cross-tenant tests, leftover disks.""",
 kps=K("Ephemeral isolation per run.","Separate kernel or equivalent for untrusted tenants.","No home mounts, no standing creds.","Destroy after the result.","Shared long-lived containers are unsafe for multi-tenant.","Brand < properties."),
 qs=[Q("Which isolation best suits many untrusted tenants?", "Ephemeral microVM or managed sandbox per run — not a shared container or a thread.", "apply"),
     Q("What must happen after you capture the result?", "Destroy the sandbox. Do not reuse it across users.", "recall"),
     Q("Why not mount the app repo into the sandbox?", "Generated code could read secrets, modify sources, or persist an implant.", "debug"),
     Q("What properties do you name if you forget the vendor?", "Isolation, ephemeral lifetime, empty env, network default deny, time/memory caps.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"restricting-filesystem-network-time": sc(
 why="""A sandbox without resource limits is a billed botnet. Restrict filesystem (tmp only), network (deny by default), time and CPU/memory. Open a hole only when the task needs it, through a proxy allowlist.""",
 how="""FS: tmpfs, no `/home`, no cloud metadata mounts. Network: default deny; if install-pip is required, allow a pin of hosts. Time: wall clock and CPU. Memory: cgroup limit.

Metadata IPs (169.254.169.254 and cousins) stay blocked even when network is on.""",
 failures=F("Allow all egress “so pip works.”",
 "No memory cap; a fork bomb kills the node.",
 "Time cap only on the model, not the runner."),
 line="""The sandbox gets tmp, no egress unless allowlisted, and hard time/memory caps. Metadata IPs stay blocked.""",
 walk="""A snippet loops allocating lists. The memory cap kills it in 2s. Before the cap, the host OOM’d. You add the cgroup and a unit test that expects a kill.""",
 follow="""They ask about IPv6 egress. Say: I deny that too. Allowlists are easy to get wrong.""",
 measure="""Kills by cap type, unexpected egress attempts, host-OOM incidents (0).""",
 kps=K("Filesystem: tmp only, no secrets mounts.","Network: default deny, allowlist via proxy if needed.","Block link-local/metadata IPs.","Wall time and CPU time caps.","Memory cgroup limits.","Open holes per task, not globally."),
 qs=[Q("Which network policy is right by default?", "Deny all, allowlist specific hosts via a proxy if the task needs it.", "apply"),
     Q("Why block 169.254.169.254 even when network is on?", "Cloud metadata is a credential source. Sandboxes must not reach it.", "recall"),
     Q("A runaway loop must die. What enforces that?", "Wall-time and memory caps on the runner, not a hope in the prompt.", "apply"),
     Q("Why is “allow port 80” a bad policy?", "It is still the whole internet, including attacker hosts.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"capturing-output-safely": sc(
 why="""stdout can be 2GB. stderr can contain paths you do not want in the model. Files can be surprises. Capture with caps, a marker on truncation, and a policy for which files leave the sandbox.

The model sees a summary, not a firehose.""",
 how="""Read stdout/stderr with a byte cap while the process runs (not after). Kill if the cap hits. Return `{stdout, stderr, exit_code, truncated, files[]}` where files are allowlisted paths with size caps.

Do not return core dumps or `/tmp` wholesale. Redact secret-looking strings before the agent sees them.""",
 failures=F("Waiting until exit to read 2GB into RAM.",
 "Passing all files back to the model.",
 "Ignoring non-zero exit and treating stdout as success."),
 line="""I cap output while reading, mark truncation, keep exit_code, and only export allowlisted files. The model never gets a 2GB print.""",
 walk="""A snippet prints a forever counter. The harness kills at 64KB with `truncated=true`. The agent sees the marker and fixes the loop instead of hanging the worker.""",
 follow="""They ask about binary files. Say: I do not base64 a 50MB artefact into the prompt. I store it and return an id.""",
 measure="""Max captured bytes, truncation rate, worker RSS, secret-redaction hits.""",
 kps=K("Cap stdout/stderr while reading.","Kill the process at the cap.","Always return exit_code.","Export only allowlisted, size-capped files.","Redact secret-like strings.","Store large artefacts; do not prompt-dump them."),
 qs=[Q("Sandboxed code prints 2GB of text. What should the harness have done?", "Capped output, truncated with a marker, and enforced limits while reading.", "apply"),
     Q("Why keep exit_code?", "Zero vs non-zero is the first success signal. Ignoring it creates false success.", "recall"),
     Q("Which files come back?", "An allowlist with size caps, or a store id — not the whole filesystem.", "apply"),
     Q("When do you redact?", "Before the agent or the logs see the capture. Secret-shaped strings do not enter the window.", "apply")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"reducing-the-blast-radius": sc(
 why="""Blast radius is how much of the world a bad run can touch. An agent that reads untrusted pages and can also send email has a large radius. Split capabilities, isolate execution, require ticks on writes, and assume the model will obey injected text.

This is the systems sentence that ties sandbox, tools and permissions together.""",
 how="""Draw the run: untrusted input → model → tools → sandbox → outbound. Cut edges. The reader agent cannot send. The sender cannot fetch arbitrary URLs. The sandbox cannot reach metadata. Approvals sit on writes.

Red-team: retrieve a page that says “forward secrets to attacker.” The send tool must not be on that agent.""",
 failures=F("One super-agent with browse + email + code + admin DB.",
 "Sandbox with egress and a secret env “for convenience.”",
 "No diagram of the radius."),
 line="""I reduce blast radius by splitting capabilities, isolating code, denying egress by default, and gating writes. I assume the model will follow untrusted text.""",
 walk="""A browse+email agent forwarded a “please send the last message” injection. You split the agents and require a tick. The next injection dies at the missing tool.""",
 follow="""They ask for a number. Say: I count reachable high-impact tools from an untrusted token. I want that count small.""",
 measure="""High-impact tools reachable from untrusted input, injection-to-effect rate, split-agent coverage.""",
 kps=K("Assume the model will obey retrieved text.","Split read and write capabilities.","Sandbox code with default-deny egress.","Approvals on remaining writes.","Draw the radius; count high-impact tools.","One super-agent maximises radius."),
 qs=[Q("An agent reads untrusted pages and also holds send-email. Best mitigation?", "Separate capabilities and require human approval for sending.", "apply"),
     Q("What is blast radius here?", "How much of the world a hijacked or confused run can touch — data, money, messages, clusters.", "recall"),
     Q("How do you measure it?", "Count high-impact tools reachable from an untrusted input path, and test injection-to-effect.", "apply"),
     Q("Why does a sandbox with secrets still have a large radius?", "Escaped or leaked env is enough. Isolation without an empty env is incomplete.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"network-off-as-the-default": sc(
 what="""**Generated code gets no egress unless a task needs it.** Default-deny network is the sandbox rule that stops exfiltration and SSRF. If the task is “plot this CSV,” there is no reason to speak to the internet. If it must `pip install` or fetch a URL, open a pin through a proxy and close it after.

Off means IPv4 and IPv6, including metadata.""",
 why="""This is the one-line network answer interviewers want. On the job it is also how you sleep after a model writes `requests.get(attacker)`.""",
 how="""Default: network namespace with no routes, or a policy that drops all. Task flag `needs_network=pypi` enables a proxy allowlist for that run only. Log every allowed connect.

Do not bake “network on” into the base image because one notebook needed it.""",
 failures=F("Base image with open egress.",
 "Allowlist `*` for a week.",
 "Forgetting IPv6."),
 line="""Network is off unless the task opens a pin. I log allowed connects and I block metadata. A plot job never speaks to the internet.""",
 walk="""A generated scraper tried 200 hosts. With default deny it failed immediately; the agent rewrote to use the provided CSV. You never opened the pin.""",
 follow="""They ask about model APIs from inside the sandbox. Say: the sandbox does not call models. The host does.""",
 measure="""Runs with egress enabled, denied connect count, unexpected allowlist hits.""",
 kps=K("Default deny IPv4 and IPv6.","Open a pin per task, not on the base image.","Proxy allowlists, not “port 80.”","Block metadata addresses always.","Log allowed connects.","The sandbox does not hold model API keys."),
 qs=[Q("What is the default network policy for generated code?", "No egress. Enable a specific allowlist only if the task needs it.", "recall"),
     Q("A plot-the-CSV job requested the network. What do you do?", "Keep it off. The CSV is already in the sandbox.", "apply"),
     Q("Why is port 80 not an allowlist?", "It is still the whole web. Name hosts.", "debug"),
     Q("May the sandbox call the model provider?", "No. That would require keys in the sandbox. The host calls the model.", "apply"),
     Q("What must stay blocked even when egress is on?", "Link-local and cloud metadata addresses.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"time-and-memory-caps": sc(
 what="""**A runaway loop must die, not bill you all night.** Time and memory caps are hard kills on the runner: wall clock, CPU seconds, RSS. They sit next to the agent’s step budget. A code tool that ignores them can outspend the model loop.

Caps need tests: a known infinite loop must be killed.""",
 why="""Finance and on-call both care. Interviewers want the kill, the user-visible error, and the fact that the host survives. On the job this is a cgroup and a timeout, not a polite instruction to the model.""",
 how="""Set `timeout_s`, `cpu_s`, `memory_mb` per run class. The supervisor kills and returns `{error:"resource", which, limit}`. The agent may retry with a simpler program once.

CI: snippets that `while True: pass` and that allocate until death must produce a kill, not a hang.""",
 failures=F("Timeout only on the HTTP client to the sandbox API, not inside the VM.",
 "No memory cap.",
 "Kill without telling the agent, so it retries the same bomb."),
 line="""Runaway code dies on wall time, CPU and memory caps. I test the kill and I return a typed error so the agent can simplify, not loop the bomb.""",
 walk="""A generated Monte Carlo ran 40 minutes. You set 15s/512MB. The next run dies at 15s with `resource:time`. The agent reduces iterations. The host never OOMs.""",
 follow="""They ask about “just a bit more time.” Say: a second class with a higher cap and a user tick, not an unbounded raise.""",
 measure="""Kill rate by type, host-OOM (0), mean runner lifetime, retries-after-resource-error that succeed.""",
 kps=K("Wall time, CPU and memory are hard kills.","Test infinite loop and allocator snippets in CI.","Return a typed resource error.","Host timeout ≠ inner cap; you need both.","A higher cap is a product class, not infinity.","Do not retry the same bomb silently."),
 qs=[Q("What happens to a runaway loop in a correct harness?", "It is killed by time or memory limits and the agent gets a typed resource error.", "recall"),
     Q("Why isn’t an HTTP timeout enough?", "The VM may still run and bill. The inner supervisor must kill too.", "debug"),
     Q("How do you test the caps?", "CI snippets that loop or allocate until the kill; assert the error class.", "apply"),
     Q("The agent retries the same infinite loop. What do you add?", "A hint in the error (“reduce iterations”) and a cap on resource-error retries.", "apply"),
     Q("Who may raise the cap?", "A product path with a user-visible larger class — not the model itself.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"interview": sc(
 what="""The interview line for a code-exec tool is: **process isolation, no secrets in the env, capture stdout only.** Say it, then spend thirty seconds on default-deny network and time/memory caps. Do not start with a vendor name.

If they ask you to sketch, draw app process vs runner and an empty env.""",
 why="""This question shows up whenever you mention agents that write code. A candidate who says “we exec in a thread” fails. A candidate who names isolation, empty env and capped stdout passes even without a brand.

On the job the same sentence is how you review a PR that adds `eval`.""",
 how="""Thirty-second sketch: user → host → (no exec) → sandbox API → microVM with empty env → stdout bytes (capped) → host. Label “no secrets,” “deny net,” “15s / 512MB.”

Have one war story: a payload that would have read env, and the empty env that stopped it.""",
 failures=F("Leading with E2B without properties.",
 "Forgetting stdout caps.",
 "Admitting eval in the request handler “just for the demo.”"),
 line="""For code exec I isolate the process, give it no secrets, and take capped stdout. Network is off, time and memory are capped. I never exec in the app.""",
 walk="""In a screen interview you draw two boxes and an empty env. The interviewer asks about pip. You add a pin, not a default-open net. You get the follow-up on metadata IPs and you block them.""",
 follow="""They ask about GPU sandboxes. Same properties; the accelerator does not make exec in-process safe.""",
 measure="""Whether you can draw the two-box sketch in one minute, and whether your repo has zero in-process exec of model code.""",
 kps=K("One-liner: isolation, no secrets, capped stdout.","Draw app vs runner.","Default-deny network plus metadata block.","Time and memory kills.","No vendor-first answers.","Zero eval/exec in the request path."),
 qs=[Q("What is the interview one-liner for a code-exec tool?", "Process isolation, no secrets in the env, capture stdout only.", "recall"),
     Q("What two boxes do you draw?", "The app/host that never execs, and the sandbox runner with an empty env.", "apply"),
     Q("They ask how the code gets pip packages. What do you not say?", "That the sandbox has open egress. You name a pin or a preinstalled set.", "debug"),
     Q("Does a GPU change the rule?", "No. Isolation and empty env still apply.", "recall"),
     Q("Where is eval of model code forbidden?", "In the app process and request handler, including “just a demo.”", "apply")],
 links=[L["oai_agents"], L["ant_agents"]],
),
},
"m5-9": {
"common-agent-failures": sc(
 why="""Agents fail in a short, teachable list: wrong tool, bad arguments, unavailable tools, repeated actions, incomplete plans, infinite loops, context growth. Production work is detecting each class and binding a fix. Interviews want the list and one mitigation each.""",
 how="""Map each failure to a control. Wrong tool: descriptions and catalogue size. Bad args: schema + reject. Unavailable: typed error and fallback. Repeats: identical-call detector. Incomplete plans: checks before done. Loops: caps. Context: truncate and pin.

A weekly failure review tags traces with these labels. You cannot improve a soup.""",
 failures=F("Treating every miss as “need a bigger model.”",
 "No taxonomy so dashboards are useless.",
 "Fixing loops only in the prompt."),
 line="""I name the usual failures — wrong tool, bad args, repeats, incomplete plans, loops, context growth — and I bind each to a runtime control, not a hope.""",
 walk="""A month of traces: 40% repeats, 25% bad args, 10% loops. You ship identical-call detection and tighter schemas first. Success rises before anyone touches the model.""",
 follow="""They ask for a complete list. Give the list above and say you add a tag when a new class appears twice.""",
 measure="""Failure tags per 100 runs, and whether each tag has an owner and a control.""",
 kps=K("Know the usual classes: tool, args, availability, repeats, plans, loops, context.","Bind each class to a control.","Tag traces; do not debug a soup.","Bigger models are not the first fix.","Prompt-only fixes do not stop loops.","Review the tag mix weekly."),
 qs=[Q("List common agent failures you handle in production.", "Wrong tool, bad arguments, unavailable tools, repeated actions, incomplete plans, infinite loops, and context growth.", "recall"),
     Q("Your only response to failures is a bigger model. What should you do first?", "Tag traces into classes and fix the largest class with a runtime control (schema, cap, catalogue).", "debug"),
     Q("Which failure is a missing check on the plan?", "Marking steps done without verifying the expected output.", "apply"),
     Q("How do you stop repeated actions?", "Hash (tool, args), cap N, then nudge or stop.", "apply")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"step-time-retry-cost-budgets": sc(
 why="""Budgets are the numbers that make an agent shippable: max steps, timeouts, retry counts, token or dollar caps. Without them you have a hobby. With them you can talk to finance and SRE.

Prompt “be cheap” is not a budget.""",
 how="""Config per agent: `max_steps`, `max_seconds`, `max_usd`, `max_retries_transient`. The worker checks after every step. Publish p50/p95 against those numbers.

Retries are a sub-budget: they do not reset the parent cap. A retry that would exceed `max_usd` becomes a stop.""",
 failures=F("Retries that ignore the dollar cap.",
 "A global timeout longer than the user’s patience and no progress events.",
 "Budgets only in a wiki."),
 line="""I define step, time, retry and cost budgets in config and I enforce them in the worker. Retries spend the same budget. Prompts do not hold the numbers.""",
 walk="""p95 is 14 steps / $0.55 / 45s. You set 25 / $1.50 / 90s. A runaway hits $1.50 and returns a partial. Finance sees a bounded tail.""",
 follow="""They ask who changes the numbers. Engineering proposes from traces; product accepts the user-visible cutoff.""",
 measure="""Forced-stop by budget type, p95 versus cap, retries that exceeded parent budget (0).""",
 kps=K("Budgets: steps, time, retries, cost/tokens.","Enforce in the worker from config.","Retries spend the parent budget.","Set caps from p95 plus margin.","Partial exit when a budget fires.","Wiki numbers are not enforcement."),
 qs=[Q("Which control guarantees a runaway loop stops?", "A code-enforced step/time/cost budget — not a prompt request to finish quickly.", "recall"),
     Q("A retry would exceed max_usd. What happens?", "You stop and return a partial. Retries do not get a fresh wallet.", "apply"),
     Q("Where do the numbers live?", "In config the worker reads, tuned from traces, accepted by product/finance.", "apply"),
     Q("Why publish p95 against the cap?", "To see whether the cap is theatre or a real fence.", "debug")],
 links=[L["oai_agents"], L["lg"]],
),
"idempotent-operations": sc(
 why="""Retries and resumes replay work. If `create_ticket` is not idempotent you get two tickets. Idempotency keys and persisted step status make replay safe.

This is distributed-systems 101 applied to agents.""",
 how="""Every write takes a key (`run_id:step` or a client token). The executor stores “started/succeeded” before or with the effect. A second call with the same key returns the first result.

Reads are naturally safer but not always (a GET that sends mail). Tag those as writes.""",
 failures=F("Relying on the model to “not do it twice.”",
 "Keys that change when the worker restarts.",
 "Success recorded after the effect so a crash duplicates."),
 line="""I make writes idempotent with a key and persisted status so retries and resumes do not double-pay or double-ticket. The model is not the idempotency layer.""",
 walk="""A crash after a payment but before status=success used to charge twice. You write the key first, then pay, then mark success. Resume returns the first charge id.""",
 follow="""They ask about third-party APIs without keys. Say: I add a ledger on my side and skip if the ledger says done.""",
 measure="""Duplicate side effects per 1k writes, resume-replay incidents.""",
 kps=K("Writes need idempotency keys.","Persist status around the effect.","Resume and retry must reuse the key.","The model is not the layer.","Side-effecting reads are writes.","Ledger locally if the vendor has no key."),
 qs=[Q("After a crash, a resumed run sends a duplicate payment. Root cause and fix?", "A non-idempotent step re-executed. Use an idempotency key and persisted step status.", "debug"),
     Q("When do you record success relative to the effect?", "Key first, effect, then success — or an atomic vendor key — so a crash cannot double.", "apply"),
     Q("Who generates the key?", "The runtime, from run id + step, not the model.", "recall"),
     Q("A vendor has no idempotency header. What do you do?", "Keep a local ledger keyed by the step and skip if it says done.", "apply")],
 links=[L["lg_persist"], L["oai_agents"]],
),
"persisting-state-to-resume": sc(
 why="""Enough state to resume means: the thread id, the plan, the artefacts, the keys, the pending interrupt. Not a screenshot of the UI. If you cannot resume after a kill, you do not persist enough.

This overlaps checkpoints; the product rule is “what must come back.”""",
 how="""Minimum snapshot: `{thread, step, state, artefact_ids, idempotency, pending_interrupt}`. Write it every step. Test kill/resume. Do not persist raw secrets.

If you only persist the chat transcript, you will resume without flags and double-pay.""",
 failures=F("Transcript-only persistence.",
 "Missing idempotency keys in the snapshot.",
 "Resume that cannot find artefact blobs."),
 line="""I persist enough to resume: thread, step, structured state, artefact ids, keys, pending interrupt. A transcript is not enough.""",
 walk="""You used to store only messages. Resume forgot `already_paid`. You add the flag and the key to the snapshot. The next kill is boring.""",
 follow="""They ask about size. Say: ids and flags, not PDFs.""",
 measure="""Kill/resume success, missing-key incidents, snapshot bytes.""",
 kps=K("Persist thread, step, structured state, artefacts, keys, interrupts.","Transcript-only is not enough.","Test kill and resume.","Store ids, not blobs.","No secrets in the snapshot.","Flags like already_paid must survive."),
 qs=[Q("What is “enough” state to resume?", "Thread id, step, structured flags, artefact ids, idempotency keys, and any pending interrupt.", "recall"),
     Q("Why is the chat log insufficient?", "It drops flags and keys, so resume repeats effects or forgets approvals.", "apply"),
     Q("An artefact id is in state but the blob is gone. What failed?", "The blob store lifecycle was not tied to the snapshot. Persist both or fail the resume.", "debug"),
     Q("What do you never persist in the clear?", "Tokens, passwords, raw cards.", "recall")],
 links=[L["lg_persist"], L["oai_agents"]],
),
"fallbacks-human-escalation": sc(
 why="""When the agent cannot continue safely, it must fall back or escalate. Safe means: low confidence on a high-value action, repeated failures, budget exhaustion, or a permission error. Escalation is a hand-off with context, not “I give up.”""",
 how="""Triggers: N failures, budget, policy deny, model-calibrated low confidence on a write. Fallback: a cheaper workflow, a search-only mode, a template answer. Escalate: queue with brief, traces, already_happened.

Do not escalate every request. Do not silently continue after a deny.""",
 failures=F("Escalate-everything, which is just human labour.",
 "Continue after a policy deny.",
 "Escalation without the trace, so the human starts over."),
 line="""I fall back or escalate when I cannot continue safely — after failures, budget, or a deny — and I hand the human the brief and the trace.""",
 walk="""Low-confidence refunds now go to a queue with the preview card. Agents no longer pay on a hunch. Handle time is 4 minutes because the card is filled.""",
 follow="""They ask about confidence scores. Say: I do not trust raw logits alone; I combine them with rule triggers.""",
 measure="""Escalate rate, fallback success, human handle time, continues-after-deny (0).""",
 kps=K("Triggers: failures, budget, deny, high-value low confidence.","Fallback is a safer path, not a guess.","Escalation includes brief and trace.","Do not escalate everything.","Do not continue after deny.","Measure human handle time — that is the product."),
 qs=[Q("Which is a good trigger for escalating to a human?", "Low confidence on a high-value or irreversible action after failed attempts.", "apply"),
     Q("What must the escalation payload include?", "The brief, errors, artefacts, already_happened, and the decision needed.", "recall"),
     Q("A policy deny happened and the agent tried another write tool. Fix?", "Stop. Deny is a terminal for that action. Escalate or fallback.", "debug"),
     Q("When is a fallback better than a human?", "When a cheaper workflow or search-only mode still solves a useful slice.", "apply")],
 links=[L["oai_agents"], L["lg_hitl"]],
),
"surfacing-progress-to-users": sc(
 why="""A four-minute silent job feels broken. Progress is current task, tool/action in user words, results, sources, and approval requests. It is not a raw thought dump.

This is the UX half of reliability.""",
 how="""Stream `step` events with safe titles. Show elapsed time. Let the job live in the background with a notification. Attach sources and artefact links as they appear. Approval cards are progress too.

Map `execute_sql` → “Checking your last invoices.” Never show another tenant’s id from a tool dump.""",
 failures=F("Spinner only.",
 "Streaming chain-of-thought with PII.",
 "Progress that lies (step finished when the tool failed)."),
 line="""I surface safe step titles, elapsed time, sources and approval cards. The job can background. I do not stream private reasoning.""",
 walk="""A research job used a spinner. You add four titles and a source list. “Is it stuck?” tickets drop by half.""",
 follow="""They ask about live tokens. Say: I stream titles and artefact bytes, not thoughts.""",
 measure="""Time-to-first-event, stuck tickets, lying-progress incidents.""",
 kps=K("Progress: task, safe action title, results, sources, approvals.","Background + notify for long jobs.","Do not stream private reasoning.","Do not lie about failed steps.","Map internal tool names.","Elapsed time is part of the contract."),
 qs=[Q("Which progress UX is best for a 4-minute agent job?", "Streamed step events, elapsed time, background execution with notification, and cancel.", "apply"),
     Q("Why not stream raw reasoning?", "It leaks, it is unstable, and trust is better served by titles and sources.", "recall"),
     Q("A step event says success but the tool failed. What is wrong?", "The UI is lying. Bind events to tool results.", "debug"),
     Q("What is the first event you owe the user?", "A title that work started, within a second if you can, not a blank page.", "apply")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"cancel-pause-resume-redirect": sc(
 why="""Long work needs user control: cancel, pause, resume, redirect (“search Europe instead”). Cancel must stop scheduling and report already_happened. Pause writes a checkpoint. Redirect is a new brief on the same thread or a fork.

Buttons that do not halt the worker are decoration.""",
 how="""Cancel: set a flag the worker reads every step; wait for in-flight with a timeout; emit already_happened. Pause: checkpoint and release the worker. Resume: load. Redirect: user supplies a new constraint; you either patch state or fork so history stays honest.

Irreversible steps that already ran stay ran. Say so.""",
 failures=F("Cancel that leaves the worker paying.",
 "Redirect that rewrites history so you cannot audit.",
 "Pause with an in-memory-only snapshot."),
 line="""Cancel, pause, resume and redirect are runtime operations. Cancel reports what already happened. I do not pretend I rolled back a payment.""",
 walk="""A user cancels after a ticket was created. You stop further steps and say “ticket 1882 already exists.” They redirect to a different queue; you fork from the checkpoint with a new brief.""",
 follow="""They ask about undo. Say: compensate if I can; otherwise tell the truth.""",
 measure="""Cancel-to-halt time, already_happened completeness, redirect auditability.""",
 kps=K("Cancel sets a worker flag and reports already_happened.","Pause = durable checkpoint.","Resume loads the same thread.","Redirect patches or forks; it does not rewrite history.","Irreversible steps stay irreversible.","Buttons without a runtime flag are decoration."),
 qs=[Q("A user cancels after one irreversible action. Best behaviour?", "Stop further steps and tell the user exactly what already happened.", "apply"),
     Q("What is the difference between pause and cancel?", "Pause checkpoints and can resume; cancel stops and reports effects.", "recall"),
     Q("Redirect “search Europe” — do you rewrite the old brief?", "No. Fork or append a new constraint so the audit shows the change.", "debug"),
     Q("How fast must cancel take effect?", "By the next step boundary, plus a short wait for in-flight tools.", "apply")],
 links=[L["lg_persist"], L["oai_agents"]],
),
"understandable-without-exposing-reasoning": sc(
 why="""Users need to understand execution without seeing the private scratchpad. Show titles, artefacts and sources. Hide chain-of-thought, raw tool args that contain PII, and other users’ data.

Transparency is inspectable steps, not inner monologue.""",
 how="""Two channels: operator trace (full, redacted, access-controlled) and user channel (titles, sources, artefacts). Map names. Allow “why this answer?” to expand citations, not thoughts.

Legal will thank you when a reasoning leak does not include another customer.""",
 failures=F("Shipping thoughts as the product.",
 "Hiding sources so the user cannot check.",
 "Operator traces in an open bucket."),
 line="""I make execution understandable with safe titles, sources and artefacts. I do not expose private reasoning. Operators get a redacted trace behind a lock.""",
 walk="""You strip thoughts from the UI and add citation chips. NPS on “I understand what it did” rises; a PII review finds nothing in the user channel.""",
 follow="""They say users asked to see thinking. Offer sources and step titles first; measure whether the request remains.""",
 measure="""User-channel PII incidents (0), “what did it do?” tickets, citation click-through.""",
 kps=K("User channel: titles, sources, artefacts.","Operator channel: full redacted trace.","No chain-of-thought in the default UI.","Transparency ≠ inner monologue.","Lock the operator traces.","Citations answer “why.”"),
 qs=[Q("How do you keep a run understandable without exposing reasoning?", "User-safe step titles, sources and artefacts. Thoughts stay in a locked operator trace.", "recall"),
     Q("A PM wants thoughts for trust. What do you offer instead?", "Citations, diffs and step titles. Measure trust after that.", "apply"),
     Q("Where do raw tool arguments go?", "Operator trace, redacted — not the user timeline.", "apply"),
     Q("Why lock operator traces?", "They contain PII and tool args. An open bucket is a leak.", "debug")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"surfacing-progress-without-leaking-chain-of-thought": sc(
 what="""**Show steps as user-safe titles.** That is the progress rule when legal or product forbids thought streaming. `search_orders` becomes “Looking up your recent orders.” The operator can still open a locked trace.

This is the specific wording the checklist wants on top of general UX.""",
 why="""Interview closer for agent UX. They want the mapping, not a philosophy. On the job this is also how you pass a privacy review.""",
 how="""Maintain a map `{tool_or_node: title}`. Unknown tools get a generic “Working” plus an operator alert to add a title. Never interpolate raw args into the title (`Looking up ${email}` can leak).

If you must show an argument, show a user-owned one you already display elsewhere (their ticket id).""",
 failures=F("Titles that include emails from tool args.",
 "Falling back to the model’s thought when the map misses.",
 "Different titles every run so the user cannot learn the sequence."),
 line="""Progress is a stable, safe title map — not thoughts and not raw args. Missing mappings get a generic title and an operator ticket, not a leak.""",
 walk="""A title once showed another customer’s email from a tool arg. You ban args in titles and add a review. The map is now 100% for production tools.""",
 follow="""They ask about i18n. The map is translatable copy, which thoughts are not.""",
 measure="""Unmapped-title rate, arg-interpolation incidents (0), translation coverage.""",
 kps=K("Progress titles come from a map, not from thoughts.","Do not interpolate raw tool args.","Stable titles beat clever ones.","Unknown tool → generic title + operator alert.","Copy is translatable; thoughts are not.","Operators still have the full trace."),
 qs=[Q("How should you surface progress without leaking chain-of-thought?", "Show stable user-safe titles from a map, not thoughts or raw args.", "recall"),
     Q("Why not put the email argument in the title?", "It can leak another person’s identity. Titles use safe copy only.", "debug"),
     Q("What happens if a new tool has no title?", "Show a generic “Working,” alert operators to add a mapping — do not fall back to thoughts.", "apply"),
     Q("Why are titles better than thoughts for i18n?", "Titles are copy you translate. Thoughts are unstable model text.", "apply"),
     Q("Who still sees the thought channel?", "Operators, in a locked redacted trace — not the user timeline.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"idempotent-writes": sc(
 what="""**A retried “create ticket” must not open two tickets.** That is the user-visible idempotency rule. The runtime supplies a key; the ticket API stores it; a replay returns ticket 1882 again.

If the vendor cannot do keys, your ledger does.""",
 why="""This is the reliability interview closer. They will say “we retry.” You say “and the write is keyed.” On the job this is the incident you only want once.""",
 how="""`create_ticket(key=run_id+step, payload)`. First call creates. Second returns the same id. Tests: call twice, assert one row. Resume tests included.

Name the key in the trace so you can prove it in an incident review.""",
 failures=F("Key from the model (unstable).",
 "Key from a timestamp (changes on retry).",
 "No test that double-call is safe."),
 line="""A retried create must return the same artefact. I key the write in the runtime and I test double-call equals one row.""",
 walk="""Support saw two tickets per flaky run. You add `Idempotency-Key`. A week later the duplicate graph is flat. The incident doc cites the test.""",
 follow="""They ask about deletes. Same idea: a keyed delete is a no-op the second time.""",
 measure="""Duplicate artefacts per keyed write (0), test coverage of double-call.""",
 kps=K("Creates and other writes use a runtime key.","Double-call equals one artefact.","Keys are stable across retry and resume.","The model does not invent the key.","Vendors without keys get a local ledger.","Test it; do not assume."),
 qs=[Q("A retried create_ticket opened two tickets. What was missing?", "An idempotency key stored with the first create so the second call returns the same id.", "debug"),
     Q("Who creates the key?", "The runtime, from run and step ids — not the model, not the clock alone.", "recall"),
     Q("How do you test it?", "Invoke the write twice in a test and assert one row / one id.", "apply"),
     Q("The vendor has no header. Now what?", "A local ledger keyed by the step; skip the vendor call if the ledger says done.", "apply"),
     Q("Does delete need the same treatment?", "Yes. A retried delete should be a no-op, not a surprising error that the agent misreads as “still there.”", "recall")],
 links=[L["lg_persist"], L["oai_agents"]],
),
},
"m5-10": {
"one-agent-several-frameworks": sc(
 why="""After the primitives, implement the same small agent in more than one framework. You learn what each abstracts (loop, state, tools, interrupts) and what you still own (evals, permissions, tool functions).

Interviews: “I built the same refund helper in X and Y; here is what moved and what did not.”""",
 how="""Pick a 3-tool agent with one write and a cap. Port it to a graph runtime and a light SDK. Keep tools as plain functions or MCP. Keep the eval set outside.

Write down: who owns the loop, how you persist, how you approve, how you trace. That table is the capstone artefact.""",
 failures=F("Only clicking a quickstart and calling it a comparison.",
 "Rewriting tools into each vendor’s wrapper so you cannot port.",
 "No shared eval, so “better” is a vibe."),
 line="""I implement the same small agent in more than one framework to see what each abstracts. Tools, prompts and evals stay mine.""",
 walk="""You port a 80-line loop to LangGraph and the OpenAI Agents SDK. The eval is identical. You learn interrupts are cheaper in the graph and handoffs are cheaper in the SDK. The table goes in the write-up.""",
 follow="""They ask which you would pick. Point at the table and the product constraint, not a favourite logo.""",
 measure="""Shared eval scores, lines of framework-specific glue, time-to-add an approval.""",
 kps=K("Same agent, several frameworks.","Keep tools and evals outside the framework.","Write a comparison table you can defend.","Quickstarts are not a comparison.","The loop primitive must still be explainable.","Pick from constraints, not logos."),
 qs=[Q("Why implement the same agent in several frameworks?", "To see what each abstracts and to keep tools/evals portable. The comparison is the lesson.", "recall"),
     Q("What should stay outside the framework?", "Tool functions or MCP servers, prompts, and the eval set.", "apply"),
     Q("A teammate rewrote every tool as a vendor class. What did they lose?", "Portability. The next framework now needs a rewrite.", "debug"),
     Q("What goes in the comparison table?", "Loop ownership, persistence, approval, tracing, multi-agent, vendor lock-in.", "apply")],
 links=[L["lg"], L["oa_sdk"]],
),
"graph-based-stateful-orchestration": sc(
 why="""LangGraph’s pitch in the capstone: low-level graph/state orchestration for long-running, stateful agents. Use it in the project when you actually need those properties.

Do not add it as a sticker.""",
 how="""If your capstone has resume, approval, or a named graph of stages, implement those on a graph. If it is a weekend coder with three tools, a loop is the honest implementation — you can still discuss graphs in the write-up.""",
 failures=F("A graph of one node.",
 "No checkpoint though the story was “stateful.”",
 "Cannot explain a step without the library docs open."),
 line="""I use graph orchestration in the capstone when I need long-running state, not as decoration. I can still draw the primitive loop.""",
 walk="""Your capstone is a claims helper with approval. You implement it as a graph with a saver. The write-up says why a loop would have lost deploys.""",
 follow="""They ask you to rewrite it as a loop on the whiteboard. You can.""",
 measure="""Whether resume and interrupt exist for real, and whether you can explain a step without docs.""",
 kps=K("Graph/state orchestration is for long-running stateful work.","Use it when the capstone needs it.","A one-node graph is theatre.","You must still explain the primitive loop.","Checkpoints must be real.","Write why you chose it."),
 qs=[Q("When does the capstone honestly need a graph?", "When you have durable resume, interrupts, or explicit stages you want in code.", "apply"),
     Q("What is LangGraph positioned as?", "A low-level orchestration runtime for long-running, stateful agents.", "recall"),
     Q("A one-node graph with an inner while-loop — verdict?", "An agent with extra ceremony. Either draw the stages or drop the graph.", "debug"),
     Q("What must you still be able to do in the interview?", "Explain the underlying agent loop without the library.", "recall")],
 links=[L["lg"], L["lg_persist"]],
),
"where-explicit-control-flow-wins": sc(
 why="""Explicit control flow wins when compliance, persistence, loops you can test, or human-in-the-loop matter. That is the LangGraph-shaped corner of the capstone comparison.

If your only requirement is “try tools until done,” explicit edges are extra.""",
 how="""List capstone requirements. Tick: must verify identity first? must persist? must approve? must retry validate at most 3? Those ticks are edges. Implement them as edges so you can show a test.

Leave open-ended research as a capped agent node inside the graph.""",
 failures=F("Putting compliance in the prompt because the graph felt heavy.",
 "Explicit edges for a toy with no constraint.",
 "Untested edges."),
 line="""Explicit control flow wins for compliance, persistence, tested loops and approvals. I put those on edges. I leave true unknowns in a capped agent node.""",
 walk="""Identity-then-refund is an edge. You write a test that execute is unreachable without verify. That test is the interview artefact.""",
 follow="""They ask if all agents should be graphs. No. Only those with these ticks.""",
 measure="""Requirements implemented as edges vs prompts, tests per edge.""",
 kps=K("Wins: compliance order, persistence, tested loops, HITL.","Those become edges you test.","Unknown research stays a capped node.","Prompt-only compliance is a fail.","Do not graph a toy.","The test is the artefact."),
 qs=[Q("Which requirement most clearly favours a graph framework?", "Durable resumable runs with human approval steps, or a mandatory order you must test.", "apply"),
     Q("Where should “verify identity first” live?", "As a mandatory edge/gate in code, not as a prompt sentence.", "apply"),
     Q("When do explicit edges lose?", "When the path is unknown and short-lived and you have no resume need.", "recall"),
     Q("How do you prove the gate?", "A test that the write node is unreachable without the verify state.", "debug")],
 links=[L["lg"], L["lg_hitl"]],
),
"google-s-adk": sc(
 why="""Google’s Agent Development Kit is an open-source way to build agents with first-class agent, session/state, tools, multi-agent, deployment and A2A-related abstractions. In the capstone you touch it enough to say what it owns versus a raw loop.

You do not need to memorise every class.""",
 how="""Build the same small agent: session state, a couple of tools, a child agent, a deploy path as documented. Note how sessions persist and how tools are declared. Compare to your loop: what did you stop writing?

Read current ADK docs; they move. Do not quote a blog from last year.""",
 failures=F("Listing ADK features you never ran.",
 "Coupling the whole capstone to Google-only models if you did not mean to.",
 "Skipping session state then claiming you “used ADK.”"),
 line="""I used ADK enough to see its agent, session, tool and deploy abstractions. I can map them onto state/tools/policy/loop. I did not memorise the catalogue.""",
 walk="""You port the 3-tool helper to ADK, deploy a local runner, and write four bullets: session, tool, child agent, deploy. That is enough for the comparison table.""",
 follow="""They ask A2A in ADK. Say what the current docs say and that A2A is agent-to-agent, not MCP.""",
 measure="""Whether you actually ran a session and a deploy, not just cloned the repo.""",
 kps=K("ADK: agent, session/state, tools, multi-agent, deploy, A2A-related bits.","Map them onto the four primitives.","Read current docs.","Do not list features you did not run.","A2A ≠ MCP.","One small port is enough for the table."),
 qs=[Q("What kinds of abstractions does Google ADK emphasise?", "Agent, session/state, tools, multi-agent, deployment, and A2A-related pieces — building a system, not wrapping one call.", "recall"),
     Q("How do you talk about ADK in an interview without a feature dump?", "Map session→state, runner→loop, tools→tools, child agents→workers, and say what you actually ran.", "apply"),
     Q("A2A in this context is for what?", "Independently built agents, not tool servers (that is MCP).", "recall"),
     Q("What is a dishonest ADK capstone?", "Clone, screenshot, no session or tool actually executed.", "debug")],
 links=[L["adk"], L["oai_agents"]],
),
"building-debugging-deploying-agents": sc(
 why="""ADK’s emphasis is the whole lifecycle: build, debug, evaluate, deploy — not a notebook `complete()`. The capstone should show at least one of each: a run, a trace you used to fix a bug, an eval number, a deploy path.

Interviews: “how did you debug a wrong step?”""",
 how="""Keep traces on. Fix one real bug from a checkpoint or span. Run a 20-case eval before and after. Deploy via the documented path (local or cloud). Write the four screenshots/logs into the report.

If the kit’s eval story is thin, your external eval set still counts — say so.""",
 failures=F("Deploy without an eval.",
 "Debug by rerunning hoping.",
 "Build only in a notebook with no service."),
 line="""I treat the kit as a lifecycle: I can point to a trace I used, an eval I ran, and a deploy I did. A notebook call is not the capstone.""",
 walk="""A wrong tool showed up in the trace. You tighten the description, eval +8 points, deploy the same runner. The write-up has the three artefacts.""",
 follow="""They ask about production deploy. Name the path you actually used and the gap that remains.""",
 measure="""Bugs found via traces, eval delta, whether a second machine can hit the deployed agent.""",
 kps=K("Lifecycle: build, debug, evaluate, deploy.","A trace-driven fix is required.","An eval number is required.","A deploy path is required.","Notebook-only is not the capstone.","External evals count if the kit’s are thin."),
 qs=[Q("What does “emphasis on building, debugging, evaluating and deploying” mean for your project?", "You have a run, a trace-driven fix, an eval comparison, and a deploy path — not only a local complete() call.", "apply"),
     Q("How do you debug a wrong step in this lifecycle?", "Open the trace/span, change the failing component, rerun the eval.", "recall"),
     Q("Why is deploy part of the capstone?", "Agents that only live in a notebook do not teach session, auth or packaging.", "recall"),
     Q("No built-in eval in the kit. What do you do?", "Run your own set and say so. The lifecycle still needs a number.", "debug")],
 links=[L["adk"], L["oai_evals"]],
),
"crews-and-flows": sc(
 why="""CrewAI splits collaborative Crews (role-based agents) from Flows (more controlled workflow-style orchestration). The capstone lesson is when you want roles versus when you want a flow.

Do not use a crew for a known three-step file job.""",
 how="""Build a tiny crew (researcher + writer) and a tiny flow (extract → validate → store). Run the same eval. Note variance and latency. Put the numbers in the table.

Read current CrewAI docs for the exact names; do not invent APIs.""",
 failures=F("A crew on a deterministic pipeline.",
 "A flow that still lets every node call every tool unbounded.",
 "No numbers."),
 line="""Crews are role-based collaboration. Flows are controlled orchestration. I use a crew only when roles help; I use a flow when the path is known.""",
 walk="""Invoice filing as a crew wanders. As a flow it is boring and faster. You keep the crew for a research memo. The table has both.""",
 follow="""They ask which is “more agentic.” Say: the crew. That is not a compliment on a known path.""",
 measure="""Variance and latency crew vs flow on the same task.""",
 kps=K("Crews: role-based collaboration.","Flows: workflow-style control.","Known paths want flows.","Open collaboration may want a crew.","Measure both.","Do not crew a three-step file job."),
 qs=[Q("What is the strongest reason to prefer a role-based crew over a graph for a quick content draft?", "Speed to express a collaborative workflow where determinism is not critical.", "apply"),
     Q("When do Flows win in CrewAI’s split?", "When you want controlled, workflow-style orchestration.", "recall"),
     Q("Invoice extract-validate-store as a crew — verdict?", "Wrong default. That is a flow or a chain.", "debug"),
     Q("What do you record in the capstone?", "Numbers from the same eval on a crew and a flow.", "apply")],
 links=[L["crew"], L["lg"]],
),
"role-based-vs-graph-orchestration": sc(
 why="""Role-based systems are fast to write (“you are the researcher”). Graphs are explicit about edges. The capstone comparison is taste plus constraints: audit and resume push graph; a low-risk draft can be roles.

Say the failure mode of each.""",
 how="""Role risk: hidden control flow, harder tests, leftover roles. Graph risk: ceremony, slower first demo. For the write-up, implement a slice both ways or be honest that you implemented one and reasoned the other.""",
 failures=F("Declaring a winner without a eval.",
 "Roles with no output contract.",
 "A graph nobody on the team can draw."),
 line="""Roles are fast and fuzzy. Graphs are explicit and heavier. I pick from audit/resume needs versus speed, and I name the failure mode I am accepting.""",
 walk="""A policy team needs an audit path: you graph it. A blog outline: you crew it. You refuse to use one style for both just for consistency theatre.""",
 follow="""They ask if roles can be tested. Yes, if you add contracts; at that point you have a graph in disguise.""",
 measure="""Time-to-first-demo vs test coverage of the path.""",
 kps=K("Roles: speed, hidden edges.","Graphs: explicit edges, more ceremony.","Audit/resume → graph.","Low-risk draft → roles may suffice.","Contracts turn roles into a graph.","Do not pick for consistency theatre."),
 qs=[Q("Compare role-based and graph orchestration in one line each.", "Roles compose personas quickly but hide edges; graphs make edges explicit and testable at the cost of ceremony.", "recall"),
     Q("When do roles become a graph in disguise?", "When you add typed contracts and a fixed order to make them testable.", "apply"),
     Q("A regulated refund — which style and why?", "Graph (or workflow): you need a proven order and an approval edge.", "apply"),
     Q("What is the honest capstone if you only built one?", "Say so, and reason the other from constraints, or port a slice.", "debug")],
 links=[L["crew"], L["lg"]],
),
"agents-teams-workflows": sc(
 why="""Agno (and similar kits) split Agents, Teams and Workflows: autonomy, coordination, and deterministic paths. The capstone is to use the right noun. Calling everything an agent is how reviews go nowhere.""",
 how="""Implement one of each if the kit allows: a single agent, a two-member team, a three-step workflow. Same eval. Write the distinction in your words, not the landing page’s.

Autonomy still needs a cap. A “team” still needs a contract.""",
 failures=F("A team of one.",
 "A workflow that is secretly an unbounded team.",
 "Copy-pasted marketing definitions."),
 line="""Agent is autonomy, team is coordination, workflow is a known path. I use the noun that matches the control-flow owner, and I cap autonomy.""",
 walk="""You file invoices with a workflow, research with an agent, and a rare multi-source brief with a team. The write-up uses those three examples.""",
 follow="""They ask if Agno is required. Say: the nouns are the lesson; the kit is one implementation.""",
 measure="""Whether each noun in the project matches the actual control flow.""",
 kps=K("Agent = autonomy (capped).","Team = coordination.","Workflow = known path.","Use the noun that matches the owner of edges.","A team of one is an agent.","Do not paste marketing copy into the write-up."),
 qs=[Q("Distinguish Agents, Teams and Workflows.", "Agents act autonomously under a cap; teams coordinate specialists; workflows are deterministic paths in code.", "recall"),
     Q("A “team” with one member — what is it?", "An agent. Do not pay coordination overhead.", "debug"),
     Q("Where does a known extract-validate-store path go?", "Into a workflow: extract, validate, store are edges you can write in code.", "apply"),
     Q("Does autonomy remove the need for a cap?", "No. Autonomy is who chooses the next step, not an unbounded bill.", "recall")],
 links=[L["oai_agents"], L["lg"]],
),
"the-production-runtime-layer": sc(
 why="""A runtime layer is how an agent becomes a service: HTTP or queue in, auth, session, concurrency, timeouts, traces out. The capstone should expose the agent as something another process can call, not only a CLI.

This is what “production” means at this level.""",
 how="""Wrap `run(thread_id, message)` behind a small server. Add auth, a timeout, a concurrency cap, and a trace id. Persist sessions. Document how to call it.

If the kit has a runtime, use it and note what it gave you. If not, a thin FastAPI/worker is enough to talk about.""",
 failures=F("CLI-only capstone claiming production.",
 "No timeout on the service.",
 "One global session for all users."),
 line="""Production runtime means the agent is a service: auth, session, timeout, concurrency, traces. A CLI is a demo.""",
 walk="""You add a `/runs` endpoint with a thread id and a 60s timeout. A second terminal can talk to it. The write-up shows the curl and the trace id.""",
 follow="""They ask about Kubernetes. Say: I have a process with those properties; the rest is packaging I can name but did not need for the lesson.""",
 measure="""Whether a second process can call it, timeout behaviour, session isolation.""",
 kps=K("Runtime: service interface, auth, session, timeout, concurrency, traces.","CLI-only is not production.","One session per user/thread.","Kits may provide this; you still must use it.","Show a curl in the write-up.","Packaging is secondary to these properties."),
 qs=[Q("What does a production runtime layer add over a script?", "A service interface with auth, sessions, timeouts, concurrency limits and traces.", "recall"),
     Q("How do you prove it in the capstone?", "Another process calls it; you show thread isolation and a timeout.", "apply"),
     Q("One global conversation for every HTTP caller — verdict?", "A bug. Sessions are per thread/user.", "debug"),
     Q("Is a queue worker a valid runtime?", "Yes, if it has the same properties: identity, timeout, traces, isolation.", "apply")],
 links=[L["adk"], L["oa_sdk"]],
),
"code-first-agents-with-handoffs": sc(
 why="""The OpenAI Agents SDK style is code-first: tools, handoffs, sessions, guardrails, tracing, specialist agents as Python. The capstone uses it to feel a light loop with first-class handoffs.

Compare that lightness to a graph when you need interrupts.""",
 how="""Implement two specialists and a handoff, a guardrail on a write, and look at the trace UI. Keep the same eval. Note what you did not get (durable graph interrupts) and what you did (fast handoff).""",
 failures=F("Handoff without a contract.",
 "Ignoring guardrails then claiming the SDK lesson.",
 "No look at traces."),
 line="""I built a code-first agent with tools, a handoff, a guardrail and a trace. I know when I would still want a graph (durable approval).""",
 walk="""Triage agent hands off to billing with a typed brief. A guardrail blocks a refund over a cap. The trace shows the hop. That is the SDK page of the table.""",
 follow="""They ask SDK vs LangGraph. Light loop + handoffs vs durable graph. You have both rows.""",
 measure="""Handoff contract-valid rate, guardrail blocks, time-to-first-trace.""",
 kps=K("SDK style: code-first tools, handoffs, sessions, guardrails, traces.","Handoffs need contracts.","Guardrails are part of the lesson.","Look at the actual trace.","Still want a graph for durable HITL.","Same eval as the other ports."),
 qs=[Q("What does a code-first SDK typically give you?", "A light loop with tools, handoffs, sessions, guardrails and tracing.", "recall"),
     Q("When would you still pick a graph after using the SDK?", "When you need durable resume and interrupt edges you can test.", "apply"),
     Q("A handoff with no schema — risk?", "The specialist gets a vibe and you cannot test the hop.", "debug"),
     Q("What is a guardrail in this story?", "A runtime check (e.g. amount cap) that blocks a write before it happens.", "recall")],
 links=[L["oa_sdk"], L["oai_agents"]],
),
"lightweight-sdk-vs-graph-frameworks": sc(
 why="""This is the comparison row: a lightweight SDK-style loop versus a graph-oriented or multi-agent-first framework. Constraints decide. Do not pick from Twitter.

Capstone write-up: one paragraph, one table row, one number.""",
 how="""SDK: faster first agent, handoffs, less ceremony. Graph: checkpoints, interrupts, tested edges. Multi-agent-first: roles and crews. Your refund-with-approval wants graph. Your triage-with-handoff wants SDK. Your blog crew wants roles.

If you only ran one, still write the row from constraints and say so.""",
 failures=F("A winner without a constraint.",
 "Calling the SDK “not production.”",
 "Calling the graph “too enterprise” as if that were analysis."),
 line="""I compare a light SDK loop to a graph by constraint: resume and approval versus speed and handoffs. I do not pick a side for identity.""",
 walk="""Your table: SDK wins time-to-demo; graph wins kill-test resume. You pick graph for the graded capstone because approval was required.""",
 follow="""They try to bait a favourite. Repeat the constraint.""",
 measure="""Time-to-demo, resume test, approval test — all in the table.""",
 kps=K("Compare by constraint, not identity.","SDK: speed, handoffs.","Graph: checkpoints, interrupts.","Roles: collaboration demos.","Say if you only ran one.","One number per row."),
 qs=[Q("How best to reduce framework lock-in?", "Keep tools as plain functions or MCP and keep prompts and evals outside the framework.", "apply"),
     Q("Name one constraint that picks a graph over a light SDK.", "Durable resume with a human approval node.", "recall"),
     Q("Is a light SDK “not production”?", "No. Production is properties (caps, auth, traces), not ceremony.", "debug"),
     Q("What belongs in the comparison paragraph?", "The constraint, the winner, and a number — not a logo preference.", "apply")],
 links=[L["oa_sdk"], L["lg"]],
),
"abstraction-level": sc(
 why="""Abstraction level is how much loop/state/tool wiring you still write. High abstraction (crews) is fast and opaque. Low (hand-rolled loop or LangGraph) is verbose and inspectable. The capstone table needs this row.

Neither is morally better.""",
 how="""For each kit, write: what you no longer see (call ids? checkpoints? prompts?). If you cannot debug without reading the source, the abstraction is high. If you wrote 200 lines to send an email, it is low.

Pick the lowest abstraction that still ships the constraint.""",
 failures=F("Highest abstraction as a default.",
 "Lowest as a flex on a toy.",
 "Not knowing what is hidden."),
 line="""I choose the lowest abstraction that still meets the constraint. I can name what each kit hides. Hidden call ids are a cost.""",
 walk="""Crew hid a retry you did not want. You dropped to a graph for that path. The table’s “abstraction” row says so.""",
 follow="""They ask for a number. Say: I count the layers between my tool function and the model call.""",
 measure="""Layers between tool and model, time-to-find a call id in a trace.""",
 kps=K("Abstraction = how much of the loop is hidden.","High: fast, opaque.","Low: verbose, inspectable.","Pick the lowest that meets the constraint.","Know what is hidden.","Call ids you cannot see are a cost."),
 qs=[Q("What does “abstraction level” mean in this comparison?", "How much of the loop, state and tool wiring the framework hides versus what you still write.", "recall"),
     Q("When is high abstraction the wrong default?", "When you must see call ids, caps or edges to debug or comply.", "apply"),
     Q("How do you measure it roughly?", "Count layers between your function and the model call, and time-to-find a call id.", "apply"),
     Q("A kit hides retries. What do you do?", "Turn them off or drop a layer. Hidden retries break idempotency stories.", "debug")],
 links=[L["lg"], L["oa_sdk"]],
),
"control-over-execution": sc(
 why="""Control is whether you can force an order, a cap, an interrupt. Frameworks differ. The capstone row is “can I make verify-then-pay a guarantee?” If the answer is “I asked the model,” control is low.""",
 how="""For each kit, try to implement a mandatory gate. If you can write a test that execute is unreachable, control is high. If you can only prompt, control is low.

Write the result in the table. This row often decides the graded project.""",
 failures=F("Claiming control you did not test.",
 "Prompt-only gates in a “high control” kit because you did not read the interrupt docs.",
 "Ignoring caps as control."),
 line="""Control means I can force order, caps and interrupts in code and test them. I do not call prompt advice control.""",
 walk="""SDK: you implement a guardrail. Graph: you implement an interrupt. Crew: you cannot prove order. The table is honest.""",
 follow="""They ask if control always wins. No — if you do not need it, paying for it is ceremony.""",
 measure="""Gates you can test, prompt-only gates remaining.""",
 kps=K("Control = forced order, caps, interrupts in code.","Prompt advice is not control.","Test unreachability of writes.","This row often picks the kit.","Do not claim untested control.","If you do not need it, do not pay for it."),
 qs=[Q("How do you know a framework gives control over execution?", "You can implement a gate in code and test that a write is unreachable without it.", "apply"),
     Q("Is a system prompt “always verify first” control?", "No. The model can skip it. Control is a runtime edge.", "recall"),
     Q("Which row often decides the graded capstone?", "Control — especially approval and mandatory order.", "recall"),
     Q("You used a high-control kit but only prompted. Verdict?", "You left the control on the table. Implement the interrupt or do not claim the row.", "debug")],
 links=[L["lg_hitl"], L["oa_sdk"]],
),
"state-persistence": sc(
 why="""State/persistence is whether a run survives a process death and whether structured flags exist. Compare savers, thread ids, and what is actually stored. A “memory” feature that is only the last messages is not persistence.""",
 how="""Kill-test each kit you used. Note in-memory defaults. Note whether flags besides messages persist. That is the row.

If a kit cannot persist, say so and keep the loop short or add your own store.""",
 failures=F("Calling chat history persistence.",
 "Skipping the kill-test.",
 "Secrets in the saver."),
 line="""I compare persistence by kill-test and by whether structured flags survive, not by a memory marketing word.""",
 walk="""Graph: kill-test passes with Postgres. SDK session: messages survive, flags you added in a dict may not unless you stored them. You write that gap down.""",
 follow="""They ask if you can bolt on Redis. Yes — then it is your persistence, not the kit’s. Say so.""",
 measure="""Kill-test per kit, flags survived, secret scans on the store.""",
 kps=K("Persistence = survive process death.","Kill-test every kit.","Messages-only is not enough.","Flags and keys must survive.","In-memory defaults fail prod.","Bolted-on stores are yours, not the kit’s."),
 qs=[Q("How do you compare state/persistence across frameworks?", "Kill-test them and check whether structured flags and keys survive, not just messages.", "apply"),
     Q("Chat history survived a restart. Is that enough?", "Not if flags like already_paid died. You will double-write.", "debug"),
     Q("In-memory saver in a demo — what do you write in the table?", "“Not production persistence.”", "recall"),
     Q("You added Redis yourself. Whose persistence is it?", "Yours. The kit did not provide the row.", "apply")],
 links=[L["lg_persist"], L["oa_sdk"]],
),
"multi-agent-support": sc(
 why="""Kits differ: first-class teams, handoffs, or “roll your own.” The capstone row is what you actually used and whether it gave you contracts or just extra prompts.

Do not invent a crew to fill the row.""",
 how="""If you needed two specialists, use the kit’s primitive (handoff, team, graph nodes) and note the contract. If you did not need them, write “not used; one agent sufficed” — that is a valid, strong row.""",
 failures=F("A ceremonial second agent.",
 "No contract on a kit “team.”",
 "Leaving the row blank."),
 line="""I use a kit’s multi-agent primitive only when a bake-off needs it, and I note whether it gave me a contract. “Not used” is a valid row.""",
 walk="""You needed no crew. The table says “not used; one agent + tools.” A second student added four roles and lost the eval. You both learned.""",
 follow="""They pressure you to add agents. Point at the bake-off.""",
 measure="""Agents used, contract-valid hops, eval vs one-agent.""",
 kps=K("Use the primitive only if needed.","Note contracts vs extra prompts.","“Not used” is a valid comparison row.","Ceremonial agents hurt.","Bake-off stays the judge.","Handoff ≠ team ≠ graph nodes — name which you used."),
 qs=[Q("What should the multi-agent row say if one agent sufficed?", "“Not used; one agent + tools.” That is a legitimate comparison.", "apply"),
     Q("What do you record if you did use two specialists?", "Which primitive (handoff/team/nodes) and whether the hop had a contract.", "recall"),
     Q("A kit “team” with no schema — how do you score the row?", "Low: coordination without a contract.", "debug"),
     Q("Why is a ceremonial second agent a fail?", "It adds hops and can lose the eval you already won.", "apply")],
 links=[L["oa_sdk"], L["crew"]],
),
"tool-integrations": sc(
 why="""How you attach tools: plain functions, OpenAPI, MCP, vendor wrappers. The capstone prefers portable functions/MCP so the comparison is about orchestration, not about rewriting tools four times.""",
 how="""One tool module imported by every port. If a kit demands a wrapper, write a 5-line adapter. Note MCP support as a bonus, not a requirement for the graded path.""",
 failures=F("Four copies of `lookup_customer`.",
 "A wrapper that hides the schema.",
 "Tools that only work inside one kit’s decorator."),
 line="""I keep tools portable — functions or MCP — and write thin adapters. I do not rewrite the catalogue per framework.""",
 walk="""`tools.py` is imported by the loop, the graph, and the SDK. The table’s tool row is “adapter, 5–10 lines.” A classmate rewrote tools thrice and could not finish.""",
 follow="""They ask about hosted tool stores. Fine, if the schema still exits to your eval.""",
 measure="""Copies of each tool, adapter line count, schema visible in traces.""",
 kps=K("Prefer portable functions or MCP.","Thin adapters per kit.","Do not fork the catalogue.","Wrappers must not hide schemas.","MCP is a bonus row, not a must.","Traces should still show your tool names."),
 qs=[Q("How should tools be shared across framework ports?", "One module of plain functions or MCP servers plus thin adapters.", "apply"),
     Q("A decorator hides the JSON schema. Risk?", "You cannot reuse or eval argument validity outside the kit.", "debug"),
     Q("Is MCP required for the capstone?", "No. It is a plus if you already have a server. Portability is the requirement.", "recall"),
     Q("What is a bad tool row in the table?", "“Rewrote all tools for each framework.”", "recall")],
 links=[L["oai_tools"], L["mcp"]],
),
"mcp-a2a-support": sc(
 why="""MCP and A2A support is a comparison axis: can the kit attach MCP servers, and can it talk A2A to foreign agents? Check current docs. Do not claim support you did not run.

Capstone: one MCP server you already built is enough to fill the MCP cell.""",
 how="""Connect the capstone agent to your helpdesk MCP server if the kit can. If not, write “adapter not first-class.” For A2A, only fill the cell if you actually delegated to another agent. “Docs mention A2A” is a footnote, not a tick.""",
 failures=F("Ticking both from a landing page.",
 "Confusing MCP with A2A in the table.",
 "Connecting an untrusted community server for a tick."),
 line="""I tick MCP/A2A only if I ran them. MCP is tools; A2A is foreign agents. A landing page is not a cell in my table.""",
 walk="""LangGraph-side: you attach MCP. SDK-side: you wrap the same tools as functions. A2A: not run; cell says “not exercised.” That honesty scores.""",
 follow="""They ask why A2A is empty. Because you had no foreign agent. Correct.""",
 measure="""Cells backed by a run vs cells backed by a blog.""",
 kps=K("Tick only what you ran.","MCP ≠ A2A.","One first-party MCP server is enough.","Do not connect hostile servers for a tick.","“Docs mention it” is a footnote.","Honesty is part of the grade."),
 qs=[Q("How should the MCP/A2A row be filled?", "Only for what you actually ran. MCP is tool servers; A2A is foreign agents.", "apply"),
     Q("Docs mention A2A but you did not delegate. What goes in the cell?", "Not exercised — plus a footnote. Not a tick.", "recall"),
     Q("Why not install a random registry server for the tick?", "Trust and time. Your own narrow server teaches the cell.", "debug"),
     Q("Can a kit without first-class MCP still use your server?", "Yes, via a thin adapter that calls the same functions.", "apply")],
 links=[L["mcp"], L["adk"]],
),
"debugging-observability": sc(
 why="""Can you see steps, state, tool args, and replay? That is the observability row. A pretty UI that hides call ids loses to a JSON trace you can grep.

The capstone needs one story: “I found the bug in the trace.”""",
 how="""For each kit: dump a trace, find a call id, find a state key. Note spans vs checkpoints. If you cannot get args out, the row is weak.

Keep traces redacted in the write-up.""",
 failures=F("Screenshots of a UI with no call id.",
 "Traces full of secrets in the repo.",
 "No bug-found-via-trace story."),
 line="""Observability is whether I can grep a call id and a state key and fix a bug from that. I do not commit secrets in traces.""",
 walk="""You catch a wrong id in a span, fix the brief, and paste a redacted snippet in the report. That paragraph is the row.""",
 follow="""They ask about OpenTelemetry. Fine if it actually has the fields you need.""",
 measure="""Time-to-find a call id, bugs fixed from traces, secret scans on committed logs.""",
 kps=K("Need steps, args, state keys, replay if possible.","A UI without ids is weak.","One trace-driven fix in the write-up.","Redact before you commit.","Checkpoints and spans are both valid.","Grep-ability counts."),
 qs=[Q("What makes debugging/observability “good” in the comparison?", "You can find call ids, args and state keys and you used a trace to fix a bug.", "apply"),
     Q("A pretty dashboard without call ids — score?", "Low. You cannot join it to a tool log.", "debug"),
     Q("What must you redact in the write-up?", "Tokens, emails, raw tool dumps with PII.", "recall"),
     Q("Is OpenTelemetry automatically a win?", "Only if the spans contain the fields you need.", "recall")],
 links=[L["lg_persist"], L["oa_sdk"]],
),
"deployment": sc(
 why="""Deployment is how a stranger (or you next week) runs the agent: container, documented env, health, timeout. Compare kits on what they package versus what you had to invent.

A README-only deploy is still a deploy if it works twice.""",
 how="""Run the agent on a second machine or a container. Note: env vars, ports, persistence dependency, how to pass a thread id. That is the row.

If a kit deploys to a cloud in one command, try it once and write the catch (lock-in, region, cost).""",
 failures=F("Works on my laptop only.",
 "Secrets in the image.",
 "No health or timeout."),
 line="""Deployment in the table is “I ran it somewhere else with documented env, a timeout and no secrets in the image.” Cloud one-clicks get a catch noted.""",
 walk="""Docker run on a spare laptop hits `/health` and `/runs`. The graph needs Postgres — you document it. The SDK version is stateless — you document that too.""",
 follow="""They ask Kubernetes. You name it as packaging, not as the lesson.""",
 measure="""Second-environment success, secrets in images (0), documented deps.""",
 kps=K("Second environment is the test.","Document env, deps, thread id.","No secrets in images.","Timeout and health belong.","One-click cloud gets a catch.","README that works twice counts."),
 qs=[Q("What counts as a real deploy in the capstone?", "A second environment or container with documented env, a timeout, and no baked secrets.", "apply"),
     Q("The kit one-clicks to a vendor cloud. What do you write?", "The steps, the region/cost/lock-in catch, and that you actually ran it.", "apply"),
     Q("Laptop-only — what is the row?", "Not deployed. Say so.", "debug"),
     Q("Why document the persistence dependency?", "A graph that needs Postgres will fail in an empty container. That is a deploy bug.", "recall")],
 links=[L["adk"], L["oa_sdk"]],
),
"vendor-model-flexibility": sc(
 why="""Can you swap the model or the provider without rewriting the agent? Flexibility is a wrapper around `complete()` plus evals. Kits that bake one vendor into every tool hurt this row.

The capstone should run at least two model ids on the same eval.""",
 how="""Put the model id in config. Run the eval on a cheap and a strong model. If a kit cannot point at another provider, write the gap. Do not confuse “supports OpenAI-compatible” with “we tried it.”""",
 failures=F("Hard-coded model strings in five files.",
 "Claiming flexibility you did not run.",
 "Switching models with no eval."),
 line="""I keep the model id in config and I run the same eval on two ids. Flexibility I did not exercise is a footnote, not a tick.""",
 walk="""You switch the capstone from a strong model to a cheap one; quality drops 6 points on tool use. That number is the row, and it is why you did not silently switch in prod.""",
 follow="""They ask about local models. Same rule: config + eval, or you did not do it.""",
 measure="""Model ids exercised, files that hard-code a vendor, eval deltas.""",
 kps=K("Model id in config.","Same eval on at least two ids.","Do not hard-code vendors in tools.","“Compatible” ≠ “we ran it.”","A silent model swap is a product incident.","Footnote gaps; do not tick them."),
 qs=[Q("An agent is switched to a cheaper model and quality drops silently. What would have caught it?", "A regression eval set run on every model change.", "apply"),
     Q("How do you score vendor/model flexibility?", "By actually running two ids and by how few files hard-code a vendor.", "apply"),
     Q("The kit says OpenAI-compatible. Do you tick the row?", "Not until you pointed it at a second endpoint and ran the eval.", "debug"),
     Q("Where does the model id live?", "In config, not in five tool files.", "recall")],
 links=[L["oai_evals"], L["oa_sdk"]],
),
"budgets-in-the-capstone": sc(
 what="""**Step, time and cost limits are part of the demo, not extras.** A capstone without numbers is a toy. Show the config, a forced-stop, and a partial artefact. Interviewers will ask what happens at the cap; you should be able to trigger it live.""",
 why="""This is how you prove you heard Level 5. Many students ship a crew with no cap. The ones who pass have a config file and a screenshot of a budget stop.""",
 how="""`max_steps`, `max_seconds`, `max_usd` in the repo. A script that forces a loop and shows the stop. The README says how to change the numbers. The write-up includes p95 from your eval versus the cap.""",
 failures=F("Caps only in a slide.",
 "A cap you never triggered.",
 "No partial artefact on stop."),
 line="""The demo includes budgets. I can trigger a stop and show a partial. Caps are in config, not in a slide.""",
 walk="""You run `make blow-the-cap` in the review. The agent stops at 12 steps with a memo. The reviewer ticks the box.""",
 follow="""They ask to raise the cap live. You change config and rerun. That is the point.""",
 measure="""Forced-stop demo works, config exists, p95 < cap on the happy path.""",
 kps=K("Caps are in the repo config.","You can trigger a stop in the demo.","Partial artefact on stop.","p95 from eval versus cap is in the write-up.","Slides are not enforcement.","Changing the number is a config edit."),
 qs=[Q("What budgets belong in the capstone demo?", "Step, time and cost/token limits in config, with a forced-stop you can show.", "recall"),
     Q("The reviewer asks what happens at the cap. What do you show?", "A live or recorded stop with a partial artefact and a reason.", "apply"),
     Q("Caps in the README only — verdict?", "Not part of the demo. Put them in the worker config.", "debug"),
     Q("Why show p95 versus the cap?", "To prove the happy path fits and the cap is for tails, not for everyday kills.", "apply"),
     Q("Who can change the number in the review?", "You, by editing config — that is the interface.", "recall")],
 links=[L["oai_agents"], L["lg"]],
),
"a-replayable-trace": sc(
 what="""**You should be able to explain every tool call from the log.** A replayable trace has thread id, steps, tool names, redacted args, results sizes, decisions, and timestamps. You can sit in a review and narrate the run without opening the model’s mind.

If you cannot replay, you cannot debug or defend.""",
 why="""This is the capstone closer. Interviewers will pick a run and ask “why this call?” The log answers. On the job this is also how you write the incident doc.""",
 how="""Store a JSONL or use the kit’s trace export. Fields: `thread, step, node, tool, arg_hash, result_tokens, error, decision`. Practise narrating one good and one bad run.

Redact before you put traces in the repo. A replay script that re-executes writes is dangerous; replay means “read the log,” not “pay twice.”""",
 failures=F("Traces that omit tool names.",
 "Replaying writes in a script.",
 "Unredacted traces in git."),
 line="""Every tool call is in a redacted log I can narrate. Replay means read, not re-pay. If I cannot explain a call, the trace is incomplete.""",
 walk="""In the review you open run `a3f2` and walk six calls. The extra search is an identical-call miss you then fix. The trace was the product.""",
 follow="""They ask for a video of thoughts. You refuse and offer the log.""",
 measure="""Percent of runs with complete traces, review time to explain a call, secrets in git (0).""",
 kps=K("Trace fields: thread, step, tool, arg hash, result size, error, decision.","You can narrate any run.","Replay = read the log, not re-execute writes.","Redact before commit.","Missing tool names = incomplete.","The trace is a capstone artefact."),
 qs=[Q("What makes a trace replayable for a review?", "A complete, redacted log of steps and tool calls you can narrate without re-executing writes.", "recall"),
     Q("Why not re-run the write tools to “replay”?", "You will double-pay or double-ticket. Replay is reading the log.", "debug"),
     Q("Which fields are mandatory?", "Thread, step, tool name, arg hash, result size or error, decision/next.", "apply"),
     Q("A run you cannot explain — what is missing?", "The trace. Fix the logger before you add features.", "apply"),
     Q("May traces live in git?", "Only redacted fixtures. Not live user runs.", "recall")],
 links=[L["lg_persist"], L["oa_sdk"]],
),
},
}
