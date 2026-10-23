from helper import note, LC_INTRO, LC_CONCEPTS, LI_HOME, LG_HOME, DSPY, OA_API

NOTES = {
 "m2-11": {
  "langchain-is-one-approach-among-many": note(
   what="""LangChain is **one orchestration approach**, not a standard and not a requirement. The category is: something that builds prompts, calls models, parses outputs, and maybe runs tools. Raw SDKs, LlamaIndex, LangGraph, DSPy, and a 150-line wrapper you own are also approaches. Treating LangChain as 'the way' is how you inherit a stack you cannot leave and a vocabulary interviewers may not share.

The capstone is a **streaming, tool-using assistant**. That product does not name a library. It names a loop, a stream, a schema, and a trace. Pick a library if it pays for that product; do not pick the product to justify the library.

This note resets the mental model before you tour the alternatives.""",
   why="""On the job, 'we must use LangChain' is often inertia. Interviewers will ask what else you considered. They want two alternatives and a reason, not a brand. They will ding candidates who cannot implement the capstone on the raw SDK. This is the Level 2 closer: you can choose.""",
   how="""Write a 2×4 table: approach × (speed to first tool, debug time, state/graph, lock-in). Fill it honestly for your team. Example. A two-tool support bot: raw SDK wins debug time; LangChain wins if you will add providers next month; LangGraph wins if you already know you need cycles; DSPy wins if you will compile prompts against a metric.

Ship the capstone on whichever row you can operate. Keep a port so the row can change.""",
   fails="""1. **Library as identity.** Your resume is a list of imports.

2. **Cannot draw the loop** without the docs.

3. **Rejecting all libraries** and then forking a worse one six times.

4. **Picking LangChain because the tutorial did.**""",
   line="""LangChain is one orchestration approach. The capstone is a streaming tool loop I can draw without a brand. I pick the row I can operate and I keep a port.""",
   kps=[
    "LangChain is one approach, not a standard.",
    "The capstone is a product, not a library.",
    "Name at least two alternatives and a reason.",
    "Keep a port so the choice is reversible.",
    "If you cannot draw the loop without docs, you picked the wrong layer.",
    "Tutorials are not architecture.",
   ],
   qs=[
    {"q": "Why is 'we use LangChain' a weak architecture sentence?", "a": "It names a library, not the loop, the schema, or the trace. LangChain is one approach among raw SDKs, graphs, LlamaIndex, DSPy, and a thin wrapper.", "kind": "recall"},
    {"q": "An interviewer asks you to build the capstone without LangChain. What do you implement?", "a": "The raw tool loop, streaming with abort, a schema, a semaphore, and a usage/trace row. That is the product. The library was optional glue.", "kind": "apply"},
    {"q": "When would you still choose LangChain?", "a": "When you will actually use templates, tools, and a provider port, and the team can debug the rendered prompt. Not because a tutorial opened with it.", "kind": "apply"},
    {"q": "A team cannot draw the tool loop without the LangChain docs. What is the risk?", "a": "They cannot debug or leave. Rebuild the loop by hand once, then decide if the library still pays for itself.", "kind": "debug"},
    {"q": "What do you keep if you later delete LangChain?", "a": "The port, the schemas, the traces, the retry map, and the evals. Those are the product. The imports are not.", "kind": "recall"},
   ],
   links=[LC_INTRO, OA_API],
   review="Ask them to name two alternatives and to draw the capstone without a logo. If they cannot, the library owns them. Ask what would survive a delete.",
  ),
  "llamaindex": note(
   what="""**LlamaIndex** is another orchestration library with a different centre of gravity: **data and retrieval** (indexes, retrievers, query engines) rather than generic LCEL pipes. You still have LLMs and tools, but the happy path is 'connect documents, ask questions'. If your capstone is a tool-using assistant with little retrieval, LangChain or a raw loop may fit better. If the capstone grows a corpus, LlamaIndex's index/retriever vocabulary may fit better.

It is not 'the RAG library' in a way that forbids LangChain RAG, nor is it a model. It is an approach that makes indexes first-class. Compare it on that axis, not on Twitter loyalty.

You can use it for the same streaming tool loop; you will fight it if that is all you needed.""",
   why="""Interviewers may ask how LlamaIndex differs from LangChain. They want: indexes/retrievers vs generic composition, not 'one is better'. On the job, picking LlamaIndex for a no-corpus agent (or LangChain for a giant corpus with no index plan) is a mismatch you will pay in glue.""",
   how="""One-pager: LlamaIndex = documents → index → retriever → response synthesis. LangChain = runnables, tools, providers. Overlap is large. Example. Doc Q&A prototype: LlamaIndex gets you a query engine faster. Multi-tool support bot with one SQL tool: a raw loop or LangChain is less fighting.

Do not rewrite a working loop just to try the other logo. Revisit when the corpus or the tool graph changes the bottleneck.""",
   fails="""1. **Brand war** instead of an axis.

2. **Using LlamaIndex with no corpus** because a blog said RAG.

3. **Assuming it replaces the tool loop** you still have to write.

4. **Two libraries** for one feature without a boundary.""",
   line="""LlamaIndex centres indexes and retrievers; LangChain centres generic composition. I pick from the bottleneck — corpus versus tools — and I do not fight a library that is aimed at the other job.""",
   kps=[
    "LlamaIndex: indexes, retrievers, query engines as the core.",
    "LangChain: generic runnables, tools, providers.",
    "Pick from the bottleneck, not from a brand war.",
    "A tool-only assistant may not need LlamaIndex.",
    "A corpus-heavy Q&A may not need LCEL.",
    "Do not run both in one feature without a port.",
   ],
   qs=[
    {"q": "How does LlamaIndex's emphasis differ from LangChain's?", "a": "LlamaIndex makes indexes, retrievers, and query engines first-class. LangChain makes generic composition, tools, and provider adapters first-class. Both can do RAG and tools; the happy paths differ.", "kind": "recall"},
    {"q": "Your capstone is a streaming calculator-plus-search assistant with no corpus. Which way do you lean?", "a": "Raw loop or LangChain. LlamaIndex's index core is unused weight. Revisit if a real corpus appears.", "kind": "apply"},
    {"q": "A team imports both libraries in one handler. What is the risk?", "a": "Two traces, two prompt layers, two upgrades. Put a port in front and pick one implementation per feature.", "kind": "debug"},
    {"q": "When would you reach for LlamaIndex in Level 2?", "a": "When the next slice is document Q&A and you want an index/retriever/query-engine vocabulary quickly — knowing you still own schemas and logs.", "kind": "apply"},
    {"q": "Is LlamaIndex 'the official RAG library'?", "a": "No. It is one approach that starts from data. LangChain, raw code, and others also do RAG. Compare on the axis, not the slogan.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask for the axis, not a winner. If they say one is industry standard, push for a bottleneck. Ask whether the capstone even has a corpus.",
  ),
  "graph-state-machine-orchestration": note(
   what="""Some workflows are not a pipe. They have **branches, loops, waits, and persistent state**: approve then refund; retry retrieve then generate; pause for a human. **Graph / state-machine** orchestration makes those edges explicit: nodes are steps, edges are conditions, state is a typed object that survives a turn. LangGraph is one implementation. A hand-rolled state machine (or a job queue with statuses) is another.

Use a graph when the card would be a flowchart, not a line. Do not use a graph for `prompt | model | parser`. The extra machinery (checkpoints, reducers) is cost. The win is that you can test an edge and resume after a crash.

Persistent state is the point: a loop without stored state is just a while with amnesia.""",
   why="""Interviewers will ask when you want a graph. They want: cycles, human-in-the-loop, resumable state — not 'it is modern'. On the job, graphs shine when a refund waits on Slack and must resume tomorrow. They are overhead when you have three sequential calls.""",
   how="""Draw the flowchart first. If it has a cycle or a wait, consider a graph. Example. `draft → review (human) → send | revise`. State: `{draft, comments, status}`. A crash at review must not lose the draft. A pipe cannot pause for twelve hours cleanly.

If the chart is a line, keep functions. If you adopt LangGraph, keep the state schema yours and test edges without the UI.""",
   fails="""1. **Graph for a line.** You cannot explain the checkpointer.

2. **State that is an untyped dict.** Resume is a lottery.

3. **Loops with no cap** (accidental agent).

4. **No persist.** A crash restarts the refund.""",
   line="""A graph is for branches, loops, waits, and persistent state. I draw the flowchart first. A straight line stays a function. State is typed and resumable.""",
   kps=[
    "Graphs fit cycles, waits, and resumable state.",
    "A straight pipeline does not need a graph runner.",
    "State is a typed object you can checkpoint.",
    "Cap loops; a graph is not a free agent.",
    "Draw the flowchart before you pick LangGraph.",
    "A crash must not lose the draft or the refund intent.",
   ],
   qs=[
    {"q": "When do you want graph or state-machine orchestration?", "a": "When the flow has branches, cycles, human waits, or must resume after a crash. Not when the flow is a straight prompt-model-parser line.", "kind": "recall"},
    {"q": "Draft → human review → send, overnight. Why is a pipe a poor fit?", "a": "Pipes do not pause for hours with typed, persisted state. A graph or a job with statuses can checkpoint the draft and resume on approve.", "kind": "apply"},
    {"q": "You put extract-then-draft on LangGraph 'for practice'. What did you buy?", "a": "Checkpointer complexity and a harder stack trace, for a line. Keep functions until you have a cycle or a wait.", "kind": "debug"},
    {"q": "What must be true of graph state?", "a": "It is typed, versioned, and small enough to persist. An untyped blob will not resume cleanly after you change a field.", "kind": "apply"},
    {"q": "Does a graph replace a step cap?", "a": "No. Cycles still need MAX. A graph without a cap is an accidental agent.", "kind": "recall"},
   ],
   links=[LG_HOME, LC_CONCEPTS],
   review="Ask to see the flowchart. If it is a line, ask why a graph exists. If it has a wait, ask where state is persisted and typed.",
  ),
  "langgraph": note(
   what="""**LangGraph** is a graph runner for **stateful** LLM workflows: you declare nodes (functions / model calls), edges (conditions), and a **state** object that is updated and can be **checkpointed**. It is aimed at cycles, tool loops you want to inspect, and human-in-the-loop. It is still not the model. It is still not required for a two-step pipeline.

Get introduced, not married. You should be able to say what a node, an edge, and a checkpointer are, and when you would skip the library and write a status column in Postgres instead.

The capstone can use LangGraph for the tool loop; it can also use a `while steps < MAX` you wrote in an hour. Choose on inspectability and resume, not on fashion.""",
   why="""Interviewers at companies that adopted LangGraph will ask you to define it in one sentence. They want: graph + state + checkpoints, for cyclic/stateful flows. They will ding a tour of every API. On the job, LangGraph is a good fit for a resumable agentic loop you have already decided you need — not a default for M2.1.""",
   how="""One-sentence pitch you can reuse: 'LangGraph runs a state machine of LLM and tool nodes with a checkpointer so I can pause, inspect, and resume.' Example. Support loop with a human approve node: state holds messages and a refund proposal; checkpoint after propose; resume on Slack emoji.

If you do not need pause/resume, a function loop plus a trace may be enough. Do not start the capstone here unless the resume story is real.""",
   fails="""1. **LangGraph as the first import** in a line pipeline.

2. **Untyped state** that you cannot migrate.

3. **No cap** on the cycle.

4. **Checkpointer you have never restored** in a drill.""",
   line="""LangGraph is a stateful graph runner with checkpoints, useful for cycles and human waits. I skip it for straight pipelines, and I can explain a node, an edge, and a checkpointer in one breath.""",
   kps=[
    "LangGraph = nodes, edges, typed state, optional checkpointer.",
    "Built for cyclic, stateful, pausable workflows.",
    "Not a default for a two-step pipe.",
    "A Postgres status column can beat it for simple waits.",
    "Drill restore from a checkpoint before you need it.",
    "Still cap the cycle.",
   ],
   qs=[
    {"q": "Define LangGraph in one sentence.", "a": "A runner for stateful LLM workflows: nodes and edges over a typed state object, with optional checkpointing so you can pause, inspect, and resume.", "kind": "recall"},
    {"q": "When would you skip LangGraph for the capstone?", "a": "When the tool loop is a short MAX while you can write in an hour and you do not need to pause for a human or survive a crash mid-loop.", "kind": "apply"},
    {"q": "You have never restored a checkpoint in staging. What is the risk?", "a": "The resume path is fictional. Drill it: kill the process after propose, restore, confirm the refund does not double.", "kind": "debug"},
    {"q": "How does LangGraph relate to 'an agent'?", "a": "It can run an agent-like cycle, but you still write the graph and the cap. It does not excuse an unbounded loop or missing auth.", "kind": "apply"},
    {"q": "Name the three pieces you must be able to point at.", "a": "A node (the work), an edge (the condition), and the state/checkpointer (what survives). If you cannot, you are copying a sample.", "kind": "recall"},
   ],
   links=[LG_HOME],
   review="Hear the one-sentence definition. Ask whether they have restored a checkpoint. If the capstone has no wait or cycle, ask why LangGraph is in the import list.",
  ),
  "dspy": note(
   what="""**DSPy** is a more **declarative** approach: you specify the **input/output behaviour** (signatures, metrics) and it **compiles** prompts and few-shots against that metric, instead of you hand-stringing every prompt. You still have modules (predict, retrieve, chain-of-thought) but the pitch is 'optimise the program' rather than 'edit the template at 1am'.

It is not a replacement for a tool executor or a rate limiter. It is a way to search prompt space when you have a metric and a set of examples. If you have neither, DSPy cannot compile anything honest.

Get introduced: signatures, a metric, a compile step. Do not claim you 'use DSPy' because you read a tweet.""",
   why="""Interviewers may ask what DSPy is for. They want: compile prompts against a metric, not a synonym for LangChain. On the job, DSPy pays off when you will iterate on quality with a golden set. It is overhead when you have ten examples and no metric.""",
   how="""Pitch: 'I write a signature `ticket -> {label, reason}`, a metric on a labelled set, and compile. The library searches demonstrations and instructions.' Example. Classifier with 400 labelled tickets: compile weekly. Capstone streaming tools with no metric: skip DSPy; write the loop.

You still validate outputs, still log usage, still own tools. Compilation is a training-like step for prompts, not a licence to skip engineering.""",
   fails="""1. **Compile without a metric.** You optimised vibes.

2. **Treating DSPy as an orchestrator** for tools and streams.

3. **No held-out set.** Compile overfits the train slice.

4. **Claiming DSPy on a resume** after a hello-world.""",
   line="""DSPy compiles prompts against a metric from a signature. I use it when I have examples and a score; I do not use it as a tool runtime, and I still validate and log.""",
   kps=[
    "DSPy: declare signatures and a metric, then compile.",
    "It searches prompts/few-shots; it is not a tool executor.",
    "No metric, no honest compile.",
    "Keep a held-out set.",
    "Still validate, log, and rate-limit.",
    "Skip it on a capstone with no golden set.",
   ],
   qs=[
    {"q": "What is DSPy's pitch versus hand-composed prompts?", "a": "You declare input/output signatures and a metric; it compiles instructions and demonstrations to improve that metric. You do not hand-edit every string if the compile loop is honest.", "kind": "recall"},
    {"q": "You have twelve examples and no metric. Should you compile?", "a": "No. You will overfit vibes. Write the prompt, label a set, define a metric, then consider DSPy.", "kind": "apply"},
    {"q": "A teammate uses DSPy and skips output validation. What is wrong?", "a": "Compilation does not make outputs trusted. You still schema-validate and authorise tools. DSPy is not a runtime boundary.", "kind": "debug"},
    {"q": "Where does DSPy not replace Level 2 work?", "a": "Streaming abort, semaphores, retry maps, tool ACL, traces. Those stay yours. DSPy sits on the prompt-optimisation slice.", "kind": "apply"},
    {"q": "What two ingredients must you have before you talk about compile?", "a": "A metric you believe and a held-out set. Signatures without those are just typed prompts.", "kind": "recall"},
   ],
   links=[DSPY],
   review="Ask for the metric and the held-out set. If they describe DSPy as 'another LangChain', correct the axis. Ask what they still own after compile.",
  ),
  "comparing-orchestration-approaches": note(
   what="""Compare approaches on **development speed**, **abstraction overhead**, **debugging**, **portability**, **dependency complexity**, **state management**, and **control**. Raw SDK: slow first feature, fast debug, high control, you own state. LangChain: fast first feature, heavier debug, portability of providers, fat dependency. LlamaIndex: fast index path. LangGraph: state and cycles. DSPy: speed when compiling against a metric. A custom layer: control and debug, you pay to build it.

There is no winner. There is a weighted score for **this** application. Write the weights. A toy demo weights speed 10. A bank weights debug, control, and dependency 10.

This table is the interview artefact for the capstone choice.""",
   why="""Interviewers will ask you to compare two approaches. They want axes, not a mascot. On the job, the table is how you tell a VP why you are not adopting the new logo this quarter.""",
   how="""Fill the table for your capstone. Example. Streaming tool assistant, two tools, one provider, two engineers: raw SDK or a 200-line wrapper wins control and debug; LangChain wins only if a second provider is scheduled. A doc-Q&A with 2k PDFs: LlamaIndex or a small retrieve layer wins speed. A human-approve refund: LangGraph or a job state machine wins state.

Revisit when a weight changes (you hire, you add a corpus, you need compile). Do not freeze week-one taste.""",
   fails="""1. **Comparing logos** with no axes.

2. **Copying a BigCo stack** for a two-person app.

3. **Ignoring dependency risk** (supply chain, upgrades).

4. **Never re-scoring** after the product changed.""",
   line="""I compare orchestration on speed, overhead, debug, portability, dependencies, state, and control. I weight those for this app, and I can defend the row I picked.""",
   kps=[
    "Score approaches on seven axes, not on brand.",
    "Weight the axes for this application.",
    "Raw SDK wins debug/control; libraries can win speed.",
    "State and cycles point at a graph runner or a job table.",
    "Dependency weight is real on small teams.",
    "Re-score when the product or team changes.",
   ],
   qs=[
    {"q": "Name five axes you use to compare orchestration approaches.", "a": "Development speed, abstraction overhead, debugging, portability, dependency complexity, state management, and control. Weight them for the app; do not crown a logo.", "kind": "recall"},
    {"q": "A two-engineer streaming tool bot with one vendor. Which way do the axes lean?", "a": "Debug and control and thin dependencies: raw SDK or a small wrapper. A fat framework is overhead unless a second provider or a graph is scheduled.", "kind": "apply"},
    {"q": "A VP wants the same stack as a famous blog. What do you show?", "a": "The weighted table for our app. Their weights are not ours. If state and compile do not matter here, we do not pay for them.", "kind": "apply"},
    {"q": "Which axis did you forget if upgrades keep breaking you?", "a": "Dependency complexity (and debug). A fast first week that costs a week per upgrade scored the axes wrong.", "kind": "debug"},
    {"q": "When do you re-score?", "a": "When you add a corpus, a second provider, a human wait, or a metric you will compile against — or when the team size changes.", "kind": "recall"},
   ],
   links=[LC_INTRO, LI_HOME, LG_HOME, DSPY],
   review="Ask them to fill the table for the capstone in two minutes. If they only name a favourite, they do not have the comparison. Ask which weight is highest.",
  ),
  "choosing-one-for-your-application": note(
   what="""Choosing is a **decision**, not a default. Given raw SDKs, LangChain, a graph runner, LlamaIndex, DSPy, or a custom layer, you pick from the **bottleneck and the weights**, then you write the choice down with a review date. The application is a streaming tool-using assistant unless you have a corpus or a compile loop — so the default in this capstone is a **thin orchestrator** you can replace, not the heaviest brand.

Ability to choose is the skill. Defending a choice you inherited without axes is not.

If two rows score within noise, pick the one the team can debug at 2am.""",
   why="""Interviewers will ask 'what would you use, and why?'. They want a pick plus two axes plus a revert plan. On the job, this is the ADR you wish existed. The next note (thin orchestrator) is the implementation of the revert plan.""",
   how="""Decision record:

- Options considered (at least three).
- Weights (debug 5, speed 3, state 1, …).
- Pick, and the review date (90 days).
- Port: `complete(messages) -> Result`.

Example. You pick a raw-SDK wrapper. Review in 90 days or when a second provider is real. You do not pick LangGraph 'in case'. You do not pick DSPy with no metric.

If the team already knows LangChain well and the feature is template-heavy, that can win on debug even if a wrapper would be thinner on paper. Team knowledge is an axis.""",
   fails="""1. **No written pick.** Folklore.

2. **Pick with one option considered.**

3. **No review date.** The choice ossifies.

4. **Ignoring team knowledge** or worshipping it exclusively.""",
   line="""I choose from the bottleneck and weighted axes, I write the pick with a review date, and I keep a port. The 2am debug story beats a fashionable import.""",
   kps=[
    "A choice names options, weights, pick, and a review date.",
    "Team debug knowledge is a real axis.",
    "Do not pick a graph or DSPy 'in case'.",
    "The capstone default is the thinnest thing you can operate.",
    "A port is the revert plan.",
    "Two close rows: pick the 2am row.",
   ],
   qs=[
    {"q": "What belongs in the decision record for an orchestration pick?", "a": "Options considered, weights, the pick, a review date, and the port you will keep. A logo in a Slack message is not a record.", "kind": "recall"},
    {"q": "The team knows LangChain; the table slightly prefers a raw wrapper. How do you break the tie?", "a": "Favour the 2am debug story — often the known library — unless the wrapper is clearly simpler. Write the tie-break. Review in 90 days.", "kind": "apply"},
    {"q": "Someone adds LangGraph 'for the future'. What do you do?", "a": "Refuse until a cycle or wait exists. Future weight is how dependencies grow. Revisit when the flowchart changes.", "kind": "debug"},
    {"q": "Why is a review date part of the choice?", "a": "Weights change. A pick without a revisit becomes inertia, which is how you get the first note's cargo cult.", "kind": "apply"},
    {"q": "What is the capstone's usual pick if the team is small and there is no corpus?", "a": "A thin raw-SDK wrapper you can replace: stream, tools, schema, traces. Libraries wait for a bottleneck they actually solve.", "kind": "recall"},
   ],
   links=[LC_INTRO, LG_HOME, DSPY],
   review="Ask for the ADR. If there is no review date or only one option, the choice is a habit. Ask what would make them change the pick.",
  ),
  "a-thin-orchestrator-you-can-replace": note(
   what="""Keep provider calls behind a **port** so **LangChain is not the domain**. The domain speaks `complete(messages, tools, schema) -> Result` and `stream(...)`. Adapters implement the port: raw OpenAI, raw Anthropic, a LangChain model, a fake for tests. Application code — the tool loop, the UI, the traces — never imports `ChatOpenAI`. Then replacing the orchestrator is an adapter change, not a rewrite.

Thin means the port is small. If you leak LCEL types into handlers, the port is a slogan. If you wrap every feature in a new abstraction, you have built a worse framework. One port, a few adapters, boring handlers.

This is the architectural close of Level 2.""",
   why="""On the job, this is how you survive a library upgrade or a vendor breakup. Interviewers will ask how you would delete LangChain. The port is the answer. They will ding 'we would rewrite'. They will also ding a hexagonal cathedral for a weekend capstone — thin is the word.""",
   how="""```
class LlmPort:
    def complete(...) -> Result
    def stream(...) -> Iterator[Delta]
```

`Result` has text/tool_calls, usage, finish, served_model, request_id. The tool loop lives above the port. Tests inject a fake. Example. You switch the adapter from OpenAI to Anthropic for a spike; the loop and the UI do not change. You delete LangChain by shipping a raw adapter; the domain never knew.

Do not port-wrap your database and your HTTP client on the same weekend. One seam around the model is enough.""",
   fails="""1. **Domain imports ChatOpenAI.** The port is fake.

2. **A 20-method port** you will never implement twice.

3. **No fake adapter.** Tests hit the network.

4. **Ports everywhere** as fashion.""",
   line="""Provider calls sit behind a small port. LangChain, the raw SDK, and a fake are adapters. The tool loop is the domain. That is how I replace an orchestrator without a rewrite.""",
   kps=[
    "A small port: complete and stream return your Result type.",
    "Domain code does not import vendor or LCEL types.",
    "Adapters: raw, library, fake.",
    "Thin: one seam, not a cathedral.",
    "Deleting a library is an adapter swap if the port is real.",
    "Tests use the fake, not the network.",
   ],
   qs=[
    {"q": "What does a thin LLM port look like?", "a": "complete and stream methods that take your messages/tools/schema and return your Result (text or tool_calls, usage, finish, ids). Adapters implement it. Domain imports the port, not ChatOpenAI.", "kind": "recall"},
    {"q": "Handlers import AIMessage. Is the port real?", "a": "No. LCEL types leaked. Map to your types at the adapter boundary and fix the handlers. A rewrite to delete LangChain would touch every file.", "kind": "debug"},
    {"q": "Why is a 20-method port a smell?", "a": "You will never write a second adapter. Keep the surface small so a raw SDK and a fake can implement it in an afternoon.", "kind": "apply"},
    {"q": "How do you delete LangChain in this design?", "a": "Ship a raw-SDK adapter that satisfies the port, switch the factory, delete the LangChain adapter. The loop and UI stay.", "kind": "apply"},
    {"q": "What must tests inject?", "a": "A fake port that returns scripted Results. Tests of the tool loop should not need a network or a library.", "kind": "recall"},
   ],
   links=[OA_API, LC_INTRO],
   review="Grep the domain for langchain and openai imports. If they appear outside adapters, the port is fake. Ask to see the fake used in a test.",
  ),
  "end-to-end-test-of-the-streamed-tool-path": note(
   what="""The capstone is not done until a test **fakes the model**, **asserts the tool ran**, and **asserts the UI (or the stream consumer) got tokens**. That is the path users feel: tokens appear, a tool executes, more tokens appear, cancel works. Unit-testing the parser in isolation is necessary and not sufficient. An e2e (or a fast integration test with a fake port) locks the loop.

Fake the model with scripted deltas and a tool_call, not with a live key. Assert: tool executor received validated args, tool result was appended, second completion streamed, abort stops further tokens, usage row exists. If any of those is untested, it will break the first week.

This is the definition-of-done for M2.11.""",
   why="""On the job, streaming plus tools is where regressions hide (partial JSON, missing ids, abort that does not abort). Interviewers will ask how you test the capstone. They want a fake, not a recorded demo. They will ding 'we tried it in the UI'. This is also how you keep the port honest.""",
   how="""Test 1: fake streams three text deltas, no tool — consumer sees the concat, finish=stop. Test 2: fake streams a tool_call for `get_order`, executor called once, second fake streams 'Order shipped', consumer sees that text, not the JSON. Test 3: abort after first delta, executor not called if the tool_call never completed, usage/cancel recorded.

Run these in CI on every PR to the loop. A live nightly eval is extra, not a substitute.

If you use LangGraph or LangChain, the fake still sits behind the port so the test does not import the world.""",
   fails="""1. **Only manual clicks.**

2. **Live-key tests** that flake and get skipped.

3. **No abort test.**

4. **Asserting only the final string**, not that the tool ran.""",
   line="""I fake the model, I assert the tool ran, and I assert the consumer got tokens — including abort. That e2e path is the capstone test, not a click-through I forgot to record.""",
   kps=[
    "Fake the model; do not use a live key in CI.",
    "Assert tool execution, streamed tokens, and abort.",
    "A final-string assert is not enough.",
    "The fake sits behind the port.",
    "Run on every PR to the loop.",
    "Manual UI is extra, not the test.",
   ],
   qs=[
    {"q": "What three things does the capstone e2e assert?", "a": "The fake model produced the scripted tool call or tokens, the tool executor ran with validated args (if a tool was requested), and the stream consumer saw tokens (and abort stops them). Plus a usage/cancel row.", "kind": "recall"},
    {"q": "A test calls the live vendor. Why is that a bad CI gate?", "a": "It flakes, costs money, and is often skipped. Fake the port. Use a live nightly if you want, separately.", "kind": "debug"},
    {"q": "What abort behaviour do you lock with a test?", "a": "After abort, no further tokens are delivered and a tool is not executed from a partial argument string. The row is finish=cancelled.", "kind": "apply"},
    {"q": "Why assert the tool ran, not only the final sentence?", "a": "The sentence can be hallucinated without the tool. The product promise is that the tool executed. Check the executor spy.", "kind": "apply"},
    {"q": "Where does the fake sit if you use LangChain?", "a": "Behind the port, so the test does not depend on the library. The loop is what you are proving.", "kind": "recall"},
   ],
   links=[OA_API, LC_INTRO],
   review="Ask to see the CI test. If it needs a key or only checks a string, it is not the path. Ask about abort. Ask whether the tool spy was called.",
  ),
 }
}
