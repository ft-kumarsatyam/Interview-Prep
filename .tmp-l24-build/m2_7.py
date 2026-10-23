from helper import note, LC_RUN, LC_CONCEPTS, LG_HOME

NOTES = {
 "m2-7": {
  "beyond-prompt-model-answer": note(
   what="""Most useful features are not **prompt → model → answer**. They are **workflows**: several LLM calls, tool calls, deterministic transforms, and application logic stitched with your control flow. Examples: extract then classify; retrieve then generate; route by intent then run a specialist; fan out summaries and merge. The model is a step. The workflow is the product.

Thinking only in single prompts produces god-prompts that try to do five jobs, fail silently, and cannot be tested. Thinking in workflows lets you pin, eval, and retry each step. It also lets you put non-model steps where they belong: regex, DB lookups, ACL, price tables.

This module is about owning that graph before anyone says 'agent'.""",
   why="""On the job, the first production feature that works is usually a two-step workflow, not a clever prompt. Interviewers will ask you to break a messy task into calls. They want named steps, a contract between them, and a reason each step is a model versus code. They will ding a single 2_000-token prompt that 'does everything'. This is the design skill that separates Level 2 from Level 1.""",
   how="""Write the steps on a pad before you write prompts.

Example. 'Summarise this ticket and file it.' Step 1: extract `{product, urgency, quote}` (schema). Step 2: code maps urgency to a queue. Step 3: a second, cheaper model drafts the summary from the quote only. Step 4: your code inserts the row. One god-prompt that also files the row is how you get a well-written summary in the wrong queue.

Each model step has its own schema, timeout, and eval slice. The workflow has a trace id.""",
   fails="""1. **God-prompt.** Five jobs, one call, no tests.

2. **Model where code would do.** Asking the LLM to add two numbers or to look up a price you have in a table.

3. **No contract between steps.** Step 2 cannot parse step 1.

4. **Calling it an agent** because there are two calls. It is still your graph.""",
   line="""I design features as workflows: named steps, some model, some code, with a contract between them. I refuse one enormous prompt that tries to be the product.""",
   kps=[
    "A feature is often several calls plus code, not one prompt.",
    "Name steps and give each a contract you can test.",
    "Use code for lookups, ACL, and arithmetic.",
    "A trace id covers the whole workflow.",
    "Two calls do not make an agent if you own the graph.",
    "God-prompts hide failures and block evals.",
   ],
   qs=[
    {"q": "What is a workflow in this module, versus a single prompt?", "a": "A graph you own: multiple LLM calls, tools, and deterministic steps with contracts between them. A single prompt is one node. Most products need the graph.", "kind": "recall"},
    {"q": "A teammate writes one prompt that extracts, classifies, and files a ticket. What do you change?", "a": "Split extract (schema), classify or map in code, draft with a second call if needed, file in code. Eval each step. Do not let the model write the database row from a paragraph.", "kind": "apply"},
    {"q": "When should a step not be an LLM call?", "a": "When you have a table, a regex, an ACL, or arithmetic. Models are for language and judgement, not for facts you already store.", "kind": "apply"},
    {"q": "Why is two model calls still a workflow, not an agent?", "a": "You still own the edges: which step runs next is in your code. An agent would choose the next step itself. That is a later, costlier pattern.", "kind": "recall"},
    {"q": "Step 2 cannot parse step 1's output. What was missing?", "a": "A schema contract and validation between steps. The workflow should fail closed at the boundary, not hope the next prompt understands a paragraph.", "kind": "debug"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
   review="Ask them to draw the steps before the prompts. If there is one box, push for a split. Ask which steps are code. Ask where the trace id sits.",
  ),
  "sequential-routed-fan-out-patterns": note(
   what="""Three orchestration patterns cover most of Level 2. **Sequential**: A then B, B sees A's output (extract then draft). **Routed**: an if/else or a cheap classifier picks one specialist path (billing vs bug). **Fan-out / fan-in**: run several independent calls, then **join** (summarise three docs, merge). These are application-controlled. You write the edges.

Routing can be code (keyword, rule) or a small model. Fan-out needs a join that defines what happens if one arm is empty or failed. Sequential needs a contract at each hop. None of these require an agent loop.

Learn to name the pattern in a design review. 'We will use a chain' is not a pattern.""",
   why="""On the job, picking the wrong pattern is how you either serialise independent work (slow) or parallelise a dependency (wrong). Interviewers will describe a product and ask which pattern. They want the name, a sketch, and the failure policy on the join. They will ding an agent proposal for a stable if/else.""",
   how="""Map the task.

- Ticket → extract → draft: sequential.
- User sentence → billing or tech path: routed (start with rules; add a model if rules fail an eval).
- Three policies → three summaries → merge: fan-out, then a merge prompt or a deterministic concat with a cap.

Example join: if one of three retrieves is empty, merge the two and flag `partial=true`. Do not invent the third. If the router is unsure, take a default path or ask a clarifying question — do not run all specialists 'just in case' without a budget.""",
   fails="""1. **Fan-out without a join policy.** One 500 kills the user turn, or you drop successes.

2. **Router that is a 70B agent.** You needed an if.

3. **Sequential when arms are independent.** You gift 2× latency.

4. **Calling every pattern a pipeline.** You cannot debug what you cannot name.""",
   line="""I name the pattern: sequential, routed, or fan-out/fan-in. I write the join policy, I route with the cheapest thing that passes an eval, and I do not use an agent for a stable if/else.""",
   kps=[
    "Sequential, routed, and fan-out/fan-in cover most Level 2 graphs.",
    "You own the edges; that is a workflow, not an agent.",
    "Joins must define empty and failed arms.",
    "Route with rules first; add a model if an eval says so.",
    "Do not serialise independent work.",
    "Name the pattern in the design review.",
   ],
   qs=[
    {"q": "Name the three common orchestration patterns and one example each.", "a": "Sequential: extract then draft. Routed: billing vs bug specialist. Fan-out/fan-in: summarise three docs then merge. You write the edges in all three.", "kind": "recall"},
    {"q": "Three independent retrieves, one 500s. What should the join do?", "a": "Return the two successes plus a partial flag, or fail the turn if the product needs all three. Do not invent the missing arm. Document the policy.", "kind": "debug"},
    {"q": "When is a keyword router better than a model router?", "a": "When an eval shows rules already meet the bar, or the set of intents is tiny and stable. A model router adds latency, cost, and a new failure mode.", "kind": "apply"},
    {"q": "You ran extract and draft in sequence but they do not share data. What is wrong?", "a": "You serialised independent work. Fan them out, or drop the unused step. Sequence only when B needs A's contract.", "kind": "apply"},
    {"q": "Why is 'we will use a chain' a weak design sentence?", "a": "Chain is a library word. Sequential, routed, and fan-out are patterns with different joins and tests. Name the pattern.", "kind": "recall"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
   review="Ask them to label the boxes sequential, routed, or fan-out. Ask the join policy in the same breath. If they say agent for a two-way if, send them back to a routing table.",
  ),
  "when-to-split-a-task": note(
   what="""Split a task when **one prompt is doing two jobs that fail independently**, when **outputs need different schemas**, when **one part is code**, or when **context for A drowns B**. Do not split when the jobs share so much state that the second call would need to resend everything, or when you have not measured a failure. Splitting is a response to a named problem, not a virtue.

A useful test: can you write an eval for step 1 that does not care about step 2? If yes, you have a seam. Another test: does step 2 need a smaller, cleaner input than the raw user blob? Then extract first.

Avoid splitting into a dozen micro-calls that each add TTFT and a new timeout. Two or three steps is the usual win.""",
   why="""On the job, the god-prompt is how teams hide a 20% extract error behind a fluent summary. Interviewers will give you a fat prompt and ask where you cut. They want a seam, a schema, and a reason — not 'we always chunk work'. They will also stop you from proposing an eight-step chain for a greeting.""",
   how="""Start with one call and an eval. If extract labels are wrong but tone is fine, split extract (tight schema) from draft (style). If the model loses the question under a 4k policy, retrieve or extract the clause first, then answer.

Example. 'Read the PDF and file a Jira ticket.' Split: extract `{title, repro, expected}` from a page-limited excerpt (model), validate (code), create Jira (code). Asking one prompt to 'be the ticket' dumps prose into Jira and skips fields.

Do not split 'say hello' into classify-intent plus greet. Measure first.""",
   fails="""1. **Splitting for fashion.** Eight calls, same quality, 4× latency.

2. **No seam.** The second call needs the entire raw blob anyway.

3. **Splitting and then not validating** the first schema.

4. **Never splitting a god-prompt** that has two KPIs.""",
   line="""I split when two jobs fail independently or need different schemas, I keep the graph small, and I do not split as a fashion. A seam is a step I can eval alone.""",
   kps=[
    "Split when jobs fail independently or need different contracts.",
    "A seam is a step you can eval without the next step.",
    "Do not split until you have a named failure or a code step.",
    "Two or three steps beat a twelve-call graph for most tasks.",
    "God-prompts hide the worse KPI behind fluent text.",
    "If step 2 still needs the whole blob, you did not find a seam.",
   ],
   qs=[
    {"q": "When should you split a task into multiple LLM calls?", "a": "When two jobs fail independently, need different schemas, or one part should be code, or when context for A drowns B. Not as a default, and not into a dozen micro-calls.", "kind": "recall"},
    {"q": "A god-prompt files fluent tickets with the wrong priority 20% of the time. Where do you cut?", "a": "Extract {priority, ...} under a schema and eval that slice, then draft. Priority is a KPI that the fluent prose was hiding. Map priority in code if it is a table.", "kind": "debug"},
    {"q": "Why is an eval that only scores the final paragraph a reason to split?", "a": "It cannot see which job failed. After a split you can score extract and draft separately and stop fixing the wrong step.", "kind": "apply"},
    {"q": "When would you refuse a proposed eight-step chain?", "a": "When there is no named failure the extra steps close, or when each hop adds TTFT you cannot afford. Ask for the seam and the eval first.", "kind": "apply"},
    {"q": "What is a seam in one sentence?", "a": "A boundary where the output of step 1 is a contract you can validate and score without caring how step 2 is phrased.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, LC_RUN],
   review="Ask which KPI failed and whether that step can be scored alone. If they split without a seam or an eval, the graph is fashion. If they refuse to split a two-KPI god-prompt, push the other way.",
  ),
  "building-by-hand-then-composing": note(
   what="""Build the workflow **by hand first**: functions, ifs, explicit `complete()` calls, printed messages. Then, if the graph is stable and the glue is repetitive, **reproduce it** with LangChain composition (or another runner). Hand-built is how you learn the control flow and the failure paths. Composition is how you stop copy-pasting once you understand them.

Reversing the order — starting from a clever LCEL graph — is how you ship a pipe you cannot step through. The composition should be a refactor of a flow you already tested, not an exploration environment.

This is the same advice as raw-SDK-then-LangChain, applied to multi-step graphs.""",
   why="""On the job, inherited LCEL that nobody can draw is a tax. Interviewers will ask you to implement a router without a framework, then say how you would wrap it. They want the if/else in your language, then an optional pipe. A candidate who can only write `RunnableBranch` without explaining the cases has not built the flow.""",
   how="""Day one: `def handle(ticket):` with extract(), route(), draft(), file(), tests for each. Day two: if you will grow more specialists, wrap extract|draft as named runnables and keep `route()` as a function you can read.

Example. You hand-build fan-out of three retrieves and a merge. You discover the join policy (partial ok). Only then do you write a `RunnableParallel` plus a merge prompt. The join policy stays in your code, not in a lambda you cannot name.

If composition fights you for more than an hour, keep the functions. Clarity wins.""",
   fails="""1. **Framework-first.** You cannot draw the graph without the docs.

2. **Composition that hides the join policy** in an anonymous lambda.

3. **Never refactoring** five copy-pasted complete() calls that are now identical.

4. **Tests only on the composed object** so you cannot run a step.""",
   line="""I build the workflow with functions and ifs first, I test the seams, then I compose if the glue is repetitive. Composition is a refactor, not a starting point.""",
   kps=[
    "Hand-build the graph before you pipe it.",
    "Composition should reproduce a flow you can already draw.",
    "Keep join and route policies in named functions.",
    "If the framework fights you, keep the functions.",
    "Test steps independently, not only the composed object.",
    "Copy-pasted complete() calls are a later refactor, not a sin on day one.",
   ],
   qs=[
    {"q": "Why build a workflow by hand before using LCEL or similar?", "a": "So you understand control flow, contracts, and failure paths. The pipe should refactor a tested graph, not invent one you cannot step through.", "kind": "recall"},
    {"q": "You cannot explain what a RunnableBranch does in your app. What should you do?", "a": "Rewrite the cases as a function you can read, add tests, then wrap if you still want the pipe. Do not debug via library folklore.", "kind": "debug"},
    {"q": "What belongs in a function even after you compose?", "a": "Routing tables, join policies, ACL, and any if that a new hire must find in a minute. Do not hide those in anonymous lambdas.", "kind": "apply"},
    {"q": "When is staying on hand-built complete() calls the right call?", "a": "When the graph is small, the team is small, and composition would add stack depth without removing repetition. Revisit when a third specialist appears.", "kind": "apply"},
    {"q": "How do you test after composing?", "a": "Keep unit tests on each named step and a thin integration test on the composed object. If you can only invoke the pipe, you lost the seams.", "kind": "recall"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
   review="Ask them to draw the function version. If they can only paste LCEL, the graph is not theirs. Ask where the join policy lives after the refactor.",
  ),
  "workflows-vs-agents": note(
   what="""A **workflow** is a graph **you** wrote: the next step is an if, a sequence, or a join you can test. An **agent** is a loop where the **model chooses** the next tool or step, often until it says it is done. Both use LLMs and tools. They differ in who owns the edges. Workflows are cheaper to eval, cheaper to cap, and easier to explain in an incident. Agents are for tasks whose path you cannot write down in advance.

Level 2 wants you to prefer workflows. Agents arrive later (and still need caps, auth, and traces). Calling a two-step extract-then-draft an agent is a category error that hides how simple the product is.

A useful sentence: if you can draw the graph on a card, it is a workflow. If the card would say 'then it figures it out', you are proposing an agent — and you need a reason.""",
   why="""On the job, 'let's make it an agent' is how a stable refund path becomes an unbounded loop. Interviewers will ask when you refuse an agent. The answer is this note plus the interview talking point at the end of the module. They want: known graph → workflow; unknown, long-horizon, tool-heavy exploration → consider an agent, with a cap. They will ding agent-as-default.""",
   how="""Refund path: get order → confirm → refund. That is a workflow, even if each step uses a model. Research path: 'find anything about this incident in six systems' with a tool set that depends on what you find — that may be an agent, with MAX steps and a write-lock.

Example. A PM says 'agentic support'. You draw the five intents you already have. They fit a router. You ship a workflow. You revisit an agent only if an eval shows a long tail of intents you cannot list.

Write the refusal down: 'stable, short, known graph stays a workflow'.""",
   fails="""1. **Agent as a synonym for 'uses tools'.** Every tool loop becomes unbounded.

2. **Workflow that secretly loops** without a cap (you built an agent by accident).

3. **Agent without a write-lock.** It refunds while exploring.

4. **No reason for the agent** except a blog post.""",
   line="""If I can draw the graph, it is a workflow and I own the edges. I refuse an agent for stable, short, known paths. Agents need a reason, a cap, and a lock on writes.""",
   kps=[
    "Workflow: you own the next step. Agent: the model chooses it.",
    "Prefer workflows when the graph is known and short.",
    "Using tools does not make a system an agent.",
    "An uncapped loop is an accidental agent.",
    "Agents need a reason, a cap, and write locks.",
    "Refuse 'agentic' as a synonym for a router.",
   ],
   qs=[
    {"q": "What is the difference between a workflow and an agent?", "a": "In a workflow your code chooses the next step. In an agent the model chooses, usually in a loop. Both may use tools. Ownership of the edges is the split.", "kind": "recall"},
    {"q": "A PM wants an agentic refund. The path is get → confirm → refund. What do you ship?", "a": "A workflow. The graph is known and short. An agent adds an unbounded loop and a write risk for no eval gain.", "kind": "apply"},
    {"q": "Your 'workflow' calls complete() in a while True until the model says done. What is it?", "a": "An agent, and a reckless one: no cap. Add MAX, or better, write the real graph if you know it.", "kind": "debug"},
    {"q": "When is an agent the honest next step?", "a": "When you cannot list the path in advance, the tool set depends on discoveries, and you can cap steps and lock writes. Then measure against a workflow baseline.", "kind": "apply"},
    {"q": "Why is 'it uses tools' a bad definition of an agent?", "a": "A single-tool fetch is a workflow step. The agent word is about who chooses the next edge, not about whether tools exist.", "kind": "recall"},
   ],
   links=[LG_HOME, LC_CONCEPTS],
   review="Ask who chooses the next step. If they say the model and the graph is three boxes, refuse the agent. Ask for the cap and the write-lock if they still want a loop.",
  ),
  "routing-tables-vs-an-agent": note(
   what="""A **routing table** is a documented map from intent (or a cheap signal) to a path: if `billing` then billing specialist; if `how-to` then docs RAG; else `other`. It can be rules, a small classifier, or both. It is **testable**: you can list cases and expected paths. A **free loop** (agent) that 'just figures out which tool to use' is harder to test, harder to cap, and harder to explain when it picks `refund` on a how-to question.

Start with the table. Promote a cell to a model classifier if rules miss a measured slice. Promote the whole thing to an agent only if the table cannot be written. Most support and internal-ops products never leave the table.""",
   why="""On the job, routing tables are how you sleep. Interviewers will ask how you send a ticket to the right skill. They want a table, an eval, and a default cell — not an agent that browses tools. This is the 'refuse an agent' talking point in concrete form.""",
   how="""Write the table in the repo: intent → path → owner → eval file. Example rows: `billing → get_order + policy`, `bug → create_ticket`, `other → clarify`. A keyword pass plus a small model on the remainder is enough for many desks.

When a new intent appears, add a row. If rows explode and overlap, you have an M2.6 catalogue problem, not an agent-shaped problem. Agents do not fix overlapping intents; they hide them.""",
   fails="""1. **Agent as the first router.** You cannot list what it should have done.

2. **Table in a slide, not in the repo.** The code is still a loop.

3. **No default cell.** Unknown intents fall into a write path.

4. **Overlapping rows** with no owner. Two specialists fire.""",
   line="""A documented if/else over intent is easier to test than a free loop. I ship a routing table with a default cell, and I only add a model or an agent when the table cannot cover a measured slice.""",
   kps=[
    "A routing table maps intent to a path you can test.",
    "Rules first, small classifier second, agent last.",
    "Unknown intents need a default cell, not a write.",
    "Overlapping rows are a catalogue bug, not an agent need.",
    "The table lives in the repo next to its eval file.",
    "Agents hide overlapping intents; they do not fix them.",
   ],
   qs=[
    {"q": "Why is a routing table easier to test than an agent loop?", "a": "Each intent has an expected path you can assert. An agent has a tree of tool traces you must judge after the fact. Tables fail closed on unknown rows; loops wander.", "kind": "recall"},
    {"q": "A new intent appears weekly. Do you switch to an agent?", "a": "First add a row and an eval case. If rows overlap or explode, clean the catalogue. Consider an agent only if you truly cannot list the paths.", "kind": "apply"},
    {"q": "What belongs in the default cell?", "a": "A clarify question or a human handoff — not a write tool. Unknown should be safe.", "kind": "apply"},
    {"q": "The 'router' is an agent with twelve tools and no table. What is the bug?", "a": "You cannot say what should have happened. Extract the intents you already see into a table, measure, and shrink the loop. The agent was hiding the design.", "kind": "debug"},
    {"q": "Where should the routing table live?", "a": "In the repository as data or code, next to the eval file and an owner per row. A slide is not a router.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, LG_HOME],
   review="Ask to see the table in the repo and the default cell. If routing is 'the agent decides', ask for last week's traces grouped by intended path. No table is a reject for a stable product.",
  ),
  "fan-out-then-merge": note(
   what="""**Fan-out** runs independent work in parallel. **Merge** (fan-in) waits and combines. The easy part is `gather`. The hard part is the **join policy**: what if one arm is empty, slow, or failed? What is the merged schema? How do you cap tokens so three summaries do not blow the next prompt? A join that assumes all arms are 200 OK is a production bug.

Merges can be deterministic (concat with headings and a size cap) or a small model call (synthesise). Deterministic is easier to test. Use a model merge when you need conflict resolution or de-duplication you cannot write as code.

Always attach the source id to each arm so the merge can cite or drop.""",
   why="""On the job, fan-out is how you keep p95 tolerable; bad joins are how you ship partial lies. Interviewers will ask what happens if one retrieve returns nothing. They want a policy: drop and flag, fail the turn, or retry that arm once — written down. They will ding `Promise.all` with no empty-arm story.""",
   how="""Define `JoinResult {parts: [...], missing: [...], failed: [...]}`. Example: three docs. Arm 2 empty, arm 3 500. You merge 1 with `partial=true`, you do not invent 2, you may retry 3 once, you tell the next step which sources exist.

Token cap: each arm summary ≤ 400 tokens, merge prompt ≤ 1_200. Overflow drops the lowest-scoring arm, logged.

Timeout: a slow arm after T ms becomes `failed` so the user is not held hostage by one retrieve.""",
   fails="""1. **All-or-nothing join.** One 500 hides two good arms.

2. **Silent drop.** You merge two and never flag partial.

3. **Unbounded concat.** The next call 400s on context.

4. **Model merge that invents the missing arm** to sound complete.""",
   line="""Fan-out needs a join that names empty and failed arms, caps tokens, and times out stragglers. I never invent a missing branch to look complete.""",
   kps=[
    "gather is easy; the join policy is the product.",
    "Define empty, failed, and slow arms before you code.",
    "Flag partial merges; do not invent missing branches.",
    "Cap per-arm and merged tokens.",
    "Time out stragglers so one retrieve cannot hold the turn.",
    "Keep source ids on every arm.",
   ],
   qs=[
    {"q": "What must a fan-in join specify besides waiting for all arms?", "a": "What to do when an arm is empty, failed, or late; the merged schema; a token cap; and whether the result is marked partial. Waiting is the easy part.", "kind": "recall"},
    {"q": "Two of three retrieves succeed. The merge writes a fluent answer as if all three existed. What failed?", "a": "The join invented or ignored missing. Return the two parts with partial=true and let the next step abstain on questions that needed the third source.", "kind": "debug"},
    {"q": "How do you stop a slow arm from owning p95?", "a": "Per-arm timeout; promote the straggler to failed and merge the rest, or fail the turn if that arm was required. Do not wait forever.", "kind": "apply"},
    {"q": "When is a deterministic concat better than a model merge?", "a": "When you only need to present the parts with headings and a cap. A model merge is for conflict resolution you cannot write as code, and it can invent a missing arm.", "kind": "apply"},
    {"q": "Why keep source ids on each arm?", "a": "So the merge can cite, drop, or tell the next step which evidence exists. Anonymous blobs cannot support grounding or debug.", "kind": "recall"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
   review="Ask for the join policy in writing: empty, failed, timeout, token cap. If they only show gather, the review is incomplete. Ask whether a model merge is allowed to mention a missing source.",
  ),
  "interview": note(
   what="""**Interview: when you refuse an agent** is a one-minute stance: **stable, short workflows with a known graph stay as workflows**. You draw the boxes, you name sequential/routed/fan-out, you point at the routing table, and you say you would only open a free loop if you cannot write the edges — and then with a cap and a write-lock.

This is M2.7's exam. They are not asking you to hate agents. They are asking whether you reach for a loop before a table.""",
   why="""It is a trending interview question because blogs oversold agents. Hiring managers want someone who will not turn a refund path into a research assistant. On the job this stance also saves you from a quarter of unnecessary agent infra.""",
   how="""Say this:

1. 'If I can draw it, I ship a workflow.'
2. Sketch the graph (router + two specialists, or get-confirm-refund).
3. 'An agent is a model-chosen next step. I need a reason I cannot write the edges.'
4. 'If we still want a loop: MAX steps, no writes without a lock, eval against this workflow baseline.'

Close with the routing-table line: a documented if/else is easier to test than a free loop.""",
   fails="""1. **Agent as default** because the job description said agentic.

2. **No graph** on the whiteboard — only a loop icon.

3. **Refusing agents forever** instead of giving the condition.

4. **Forgetting the cap** when you do allow a loop.""",
   line="""If the graph is known and short, I refuse an agent and ship a workflow. I use a routing table, I name the pattern, and I only open a loop with a cap and a write-lock when I cannot write the edges.""",
   kps=[
    "Refuse agents for stable, short, known graphs.",
    "Draw the workflow and name the pattern.",
    "A routing table beats a free loop on testability.",
    "Allow a loop only with a reason, a cap, and a write-lock.",
    "Compare any agent to the workflow baseline.",
    "Do not refuse agents as a personality; refuse them as a default.",
   ],
   qs=[
    {"q": "When do you refuse an agent in an interview?", "a": "When the path is stable, short, and drawable: refund, ticket route, extract-then-draft. Those stay workflows with a routing table. Agents need a reason the edges cannot be written.", "kind": "recall"},
    {"q": "A job post says agentic. The task is a three-intent router. What do you propose?", "a": "A routing table and two or three specialist workflows. Mention an agent only as a later option if a long tail appears and a baseline eval says the table lost.", "kind": "apply"},
    {"q": "You refused an agent but your code is while model_not_done. What happened?", "a": "You built an agent by accident. Either write the graph or add MAX, write-locks, and an honest name. Interviewers will call this out.", "kind": "debug"},
    {"q": "What three constraints do you name if you do allow a loop?", "a": "A step cap, a lock or ban on writes during exploration, and an eval against the workflow baseline. Plus a trace.", "kind": "apply"},
    {"q": "What one line should they remember from your answer?", "a": "A documented if/else over intent is easier to test than a free loop.", "kind": "recall"},
   ],
   links=[LG_HOME, LC_CONCEPTS],
   review="Time the stance. They must draw a graph and say refuse. A candidate who only says agents are hype, or who agrees to an agent for a refund path, does not have the talking point.",
  ),
 }
}
