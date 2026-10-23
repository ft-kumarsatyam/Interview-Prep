from helper import note, LC_INTRO, LC_CONCEPTS, LC_RUN, OA_CHAT

NOTES = {
 "m2-3": {
  "why-orchestration-libraries-exist": note(
   what="""An **orchestration library** (LangChain is the one this module names) sits between your application and one or more model-provider SDKs. It exists because the raw call is only the first five percent of a feature. You still need prompt templates, output parsers, tool wiring, retries, streaming adapters, and a way to swap `ChatOpenAI` for `ChatAnthropic` without rewriting the rest of the file. The library sells that glue.

What it abstracts: chat-model objects, message types, template variables, parsers that turn text or tool calls into Python objects, and a composition model (runnables / LCEL) so `prompt | model | parser` is a single object you can `invoke` or `stream`. What it does **not** abstract away: the HTTP call, the tokens you pay for, the schema you must still validate, or the fact that the model can be wrong.

LangChain is one such library, not a standard. LlamaIndex, vendor SDKs plus your own 80-line wrapper, and graph runners like LangGraph occupy the same niche with different tastes. The reason the category exists is repetition, not magic.""",
   why="""On the job you will inherit a repo that imported LangChain because a tutorial did. Your job is to know what it is saving you from — and what it is hiding. Interviewers ask "why not just call OpenAI?" The junior answer is "LangChain is industry standard". The senior answer is "it is glue for templates, parsers, and provider adapters; I still own retries, logs, and schemas; I can do the same with a thin wrapper if the glue is all I needed".

This question also filters cargo-cult. If you cannot name the raw request the library will make, you do not understand your production path.""",
   how="""Draw two columns on the whiteboard.

Raw SDK: build messages by hand, call `client.chat.completions.create`, `json.loads` the content, retry yourself, swap providers by rewriting the call.

LangChain: `ChatPromptTemplate` → `ChatOpenAI` → `JsonOutputParser`, `.with_structured_output`, `.bind_tools`. The invoke is one line. The HTTP call is still a chat completion with those messages.

Example. A classifier you wrote in 40 lines of raw SDK. The LangChain version is 25 lines and can change the model class in one import. The rendered prompt, the token bill, and the need to validate the parsed object did not go away. You print those, not the chain name, when it misbehaves.

Choose the library when you will actually use composition, tools, and provider ports. Choose the raw SDK when the feature is one call and you want a short stack trace.""",
   fails="""1. **Library as the product.** The domain model is a `Chain`. You cannot test or replace the vendor without dragging the framework.

2. **Not knowing the underlying call.** A timeout or a 400 appears as a LangChain error. You cannot read the request that failed.

3. **Glue you do not use.** You imported the universe for a single `invoke`. Dependency and upgrade cost with no composition benefit.

4. **Assuming abstraction removes validation.** The parser returned a dict. The dict is still untrusted.""",
   line="""Orchestration libraries are glue: templates, parsers, provider adapters, and a composition model. They are not the LLM. I use them when that glue pays for itself, and I still own the rendered prompt, the schema, and the logs.""",
   kps=[
    "Libraries exist to reuse templates, parsers, tools, and provider adapters.",
    "LangChain is glue over HTTP calls, not a different model.",
    "You still own retries, logging, schemas, and the rendered prompt.",
    "The category is bigger than one brand: wrappers and graph runners count.",
    "Pick the library when you will use composition, not because a tutorial did.",
    "If you cannot name the underlying request, you cannot debug production.",
   ],
   qs=[
    {"q": "What does an orchestration library abstract, and what does it not?", "a": "It abstracts templates, message types, parsers, provider adapters, and composition. It does not abstract the HTTP call, the token bill, correctness, or the need to validate output.", "kind": "recall"},
    {"q": "A candidate says they used LangChain because it is the industry standard. What is the stronger reason?", "a": "They needed reuse: prompt templates, a parser, tools, or a provider port. Standard is not a reason. A thin raw-SDK wrapper is enough for one call.", "kind": "apply"},
    {"q": "A LangChain chain throws a wrapped 400. What do you inspect first?", "a": "The rendered messages and the underlying provider request, not the chain class name. Confirm model id, token length, and schema. The library is a wrapper around that call.", "kind": "debug"},
    {"q": "When would you refuse LangChain for a new feature?", "a": "A single structured call with no tools and no provider swap in sight. A 40-line SDK wrapper will be easier to debug and to pin. Add a library when composition actually appears.", "kind": "apply"},
    {"q": "Why is 'LangChain is the model' a broken mental picture?", "a": "The model is the vendor endpoint (or the weights). LangChain is an orchestration layer that builds the request and parses the response. Quality, price, and outages live at the model.", "kind": "recall"},
   ],
   links=[LC_INTRO, LC_CONCEPTS, OA_CHAT],
  ),
  "models-templates-output-parsers": note(
   what="""LangChain's useful core is three objects you should be able to name. A **chat model** is a callable wrapper around a provider (messages in, a message or a parsed object out), with config for temperature, tools, and streaming. A **prompt template** is a string or chat message list with variables (`{ticket}`, `{policy}`) that renders to concrete messages. An **output parser** turns the model's text or tool payload into a typed object — or fails.

Together they are `prompt | model | parser`. Streaming is a method on the same runnable (`stream` / `astream`), not a different pipeline. Model configuration (temperature, `max_tokens`, model id) lives on the model object so the template stays reusable.

These objects do not replace your schema. A parser that "usually works" is not validation. Treat parser success as syntactic, then apply your own checks.""",
   why="""On the job this is the vocabulary of a LangChain codebase. If you cannot point at the template, the model, and the parser, you will edit the wrong file when the label set changes. Interviewers ask you to walk `prompt | model | parser` and say where you would log. The senior answer: log the **rendered** prompt and the **parsed** object, plus usage from the model.

They also want you to know that swapping the model object is how you change providers, and swapping the parser is how you change the contract — not by stuffing "please return JSON" into the template.""",
   how="""A ticket classifier:

- Template: system rules + `{ticket}` last.
- Model: `ChatOpenAI(model=..., temperature=0)` with structured output or a tool.
- Parser: Pydantic / JSON schema for `{label, reason}`.

`chain = template | model | parser`. `chain.invoke({"ticket": text})` returns a dict. `chain.stream(...)` yields chunks; you still parse at the end unless you use a streaming parser.

When it fails, print `template.format(...)` (or the messages the model received) and the raw message **before** the parser. A parser error is often a truncated or refused completion, not a "LangChain bug".""",
   fails="""1. **Business rules in the template only.** The parser accepts any string. You wanted an enum. Put the enum in the schema.

2. **Logging the chain name.** `classifier_v3` tells you nothing. Log rendered messages and the parsed object.

3. **A new model object per request, with a clock in the template.** You bust caches and you cannot A/B the template separately.

4. **Parser that swallows errors.** It returns `{}` on failure. Downstream writes empty rows. Fail loud, then repair.""",
   line="""I build `prompt | model | parser`: the template owns variables, the model owns provider config and streaming, the parser owns shape. I log the rendered prompt and the parsed object, and I still validate.""",
   kps=[
    "Core objects: chat model, prompt template, output parser.",
    "Composition is prompt | model | parser, with stream as a method.",
    "Templates hold variables; models hold temperature, tools, and ids.",
    "Parser success is syntactic; you still validate business rules.",
    "Debug with the rendered messages and the raw model output.",
    "Do not hide failures inside a parser that returns empty dicts.",
   ],
   qs=[
    {"q": "What are the three core LangChain objects in a simple pipeline?", "a": "A prompt template (variables → messages), a chat model (provider call, config, streaming), and an output parser (text or tool payload → a typed object). They compose as prompt | model | parser.", "kind": "recall"},
    {"q": "A parser raises on 10% of turns. Where do you look first?", "a": "The raw model message and finish reason, then the rendered prompt. Truncation, a refusal, or a schema the model missed will show there. The chain name will not.", "kind": "debug"},
    {"q": "Where should allowed labels live — template, model, or parser/schema?", "a": "In the schema (enum) that the parser and, ideally, structured-output decoding enforce. The template may mention them; the contract is the schema.", "kind": "apply"},
    {"q": "How do you stream this pipeline without breaking the parser?", "a": "Stream tokens for the UI from the model; parse once at the end (or use a streaming parser for previews). Do not run the output parser on every delta.", "kind": "apply"},
    {"q": "Why keep temperature on the model object rather than in the template text?", "a": "So you can A/B decoding without editing copy, and so the template stays a reusable, cacheable prefix. Config and wording are different knobs.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, LC_RUN],
  ),
  "working-across-providers": note(
   what="""LangChain's pitch includes **one interface, many providers**. You construct `ChatOpenAI`, `ChatAnthropic`, or `ChatGoogleGenerativeAI` with the same message types and, often, the same `invoke` / `stream` / `bind_tools` methods. That is real reuse. It is not sameness underneath. Each class still makes that vendor's HTTP call, with that vendor's role names, token limits, tool-call shapes, and safety flags.

Working across providers means you can swap the class for a prototype, and it means you **still read the request** that class will send. System prompts may need to move from a message to a top-level parameter. Tool schemas may need a slightly different JSON Schema subset. Structured output may be native on one vendor and a tool hack on another.

The library reduces rewriting. It does not give you one behaviour.""",
   why="""On the job, a PM will ask "can we flip to Vendor B this week?". If you hid the provider behind a port, yes for the happy path. If you depended on a vendor-specific finish reason or a 200k context, no. Interviewers want both sentences: the adapter makes the swap cheap, and you still verify tools, schemas, and limits on the new endpoint.

They will also ask whether LangChain "locks you in". The honest answer: it can, if your domain imports LangChain types everywhere. Keep your own message and schema types at the boundary.""",
   how="""Put a factory behind your port:

`def chat_model(name: str) -> BaseChatModel` that returns the right class from env. Application code talks to the port. The first time you add Anthropic next to OpenAI, you run the **same eval set** and you print one raw request per vendor.

Example. OpenAI structured output uses a response format. Anthropic may use a tool or a native schema flag depending on the month. Your parser still validates the same Pydantic model. If Vendor B cannot enumerate your 40 labels natively, you keep the enum in local validation and a repair loop. The factory did not remove that work; it removed the need to rewrite the template.

Never switch providers in production on a Friday without an eval. The interface matching is necessary, not sufficient.""",
   fails="""1. **Assuming identical behaviour.** Temperature, refusals, and tool-call batching differ. Users see it.

2. **Leaking vendor types into the domain.** `AIMessage` everywhere. A later swap rewrites the app, not just the factory.

3. **Skipping the raw request.** You cannot explain a 400 that only happens on Vendor B.

4. **Context-window surprise.** Vendor A accepted 20k tokens of history; Vendor B 400s. Your windowing policy is part of the port.""",
   line="""LangChain lets me swap a chat-model class, but each class still makes that vendor's call. I keep my own types at the boundary, I re-run evals on a swap, and I read one raw request per provider.""",
   kps=[
    "One interface, many providers — reuse of invoke, stream, and tools.",
    "Underneath, each class still makes a vendor-specific HTTP call.",
    "Re-run evals and print a raw request when you add a provider.",
    "Keep application types off LangChain and vendor classes.",
    "Window size, tool shape, and structured-output support still differ.",
    "A factory is a port; it is not a guarantee of identical behaviour.",
   ],
   qs=[
    {"q": "What do you gain, and what do you not, by using LangChain across providers?", "a": "You gain a shared invoke/stream/tools surface and cheaper template reuse. You do not gain identical behaviour, limits, or error shapes. Each class still calls its vendor.", "kind": "recall"},
    {"q": "You flipped ChatOpenAI to ChatAnthropic and 8% of tool calls broke. What do you do first?", "a": "Print the raw request and the tool-schema each class sent. Confirm role placement, JSON Schema subset, and how parallel calls are expressed. Then fix the adapter or the schema, not the prompt copy first.", "kind": "debug"},
    {"q": "How do you keep a provider swap from rewriting the app?", "a": "A factory behind a port, and your own message/schema types at the boundary. Application code does not import ChatOpenAI or AIMessage.", "kind": "apply"},
    {"q": "What must you run before promoting a second provider?", "a": "The same eval set, plus a check of context limits, structured-output support, and one logged raw request. Interface compatibility is not quality compatibility.", "kind": "apply"},
    {"q": "Why might a system prompt need to move when you change vendors?", "a": "Some APIs take system as a top-level field, others as a message role. The adapter usually handles this, but custom message assembly can bypass it and 400.", "kind": "recall"},
   ],
   links=[LC_INTRO, LC_CONCEPTS],
  ),
  "composing-pipelines-with-runnables": note(
   what="""LangChain's composition model is the **runnable**: an object with `invoke`, `stream`, `batch`, and often `ainvoke`. Prompts, models, parsers, and functions can all be runnables. The pipe operator builds a **runnable sequence**. Other combinators fan out, branch, or map over lists. The point is that a pipeline is a value you can pass, test, and wrap with callbacks — not a pile of nested function calls you cannot see.

A simple pipeline is `prompt | model | parser`. A slightly richer one is a router that picks one of two chains, or a fan-out that runs two retrieves and merges. You should be able to build the simple one and explain the richer ones without claiming you need an agent.

Runnables do not remove control flow from your brain. An `if` you can read in your handler is still better than a clever combinator you cannot step through.""",
   why="""On the job, LCEL (this composition style) is how a lot of sample code is written. You will have to read it. Interviewers may ask you to compose a classifier or a retrieve-then-generate on a whiteboard using pipes. They want to see a clear sequence and a place for logging, not a spaghetti of lambdas.

They also want the sentence that you built the same flow by hand first, so you know what the pipe is hiding. That is the next-but-one note; plant it here.""",
   how="""Start with the hand-written function: render prompt, call model, parse, return. Then replace it with `chain = prompt | model | parser` and assert the same tests.

Example. Input `{ticket}`. Prompt renders system + ticket. Model returns a message. Parser yields `{label, reason}`. You add a callback or a wrapper that logs rendered messages and usage. For a two-step flow (extract entities, then classify), compose two sequences and call them in your own function first. Only then try a pipe of pipes.

`batch` is for many independent inputs with bounded concurrency — see M2.8. Do not `batch` a user-facing turn that has a 20s timeout just because the method exists.""",
   fails="""1. **Pipes you cannot debug.** A five-stage LCEL graph with anonymous lambdas. You cannot print the middle. Prefer named runnables or a plain function.

2. **Composition as a goal.** The feature needed one `if`. You built a router runnable. The next hire cannot find the branch.

3. **Forgetting the input schema.** The pipe expects a dict with `ticket`; you passed a string. The error is a missing key deep in the stack.

4. **Streaming the whole pipe blindly.** A parser in the middle breaks the stream. Stream the model; parse at the end.""",
   line="""A runnable is a composable invoke/stream/batch object. I pipe prompt, model, and parser when the flow is a sequence, I name the stages, and I still write a plain function when the control flow is an if.""",
   kps=[
    "Runnables expose invoke, stream, and batch on prompts, models, and parsers.",
    "prompt | model | parser is the default sequence.",
    "Name stages so you can log the middle of the pipe.",
    "A readable if in your handler beats a clever combinator.",
    "Build the flow by hand first, then reproduce it with pipes.",
    "Stream the model; parse at the end of the sequence.",
   ],
   qs=[
    {"q": "What methods does a LangChain runnable typically expose?", "a": "invoke (one input), stream (incremental output), batch (many inputs), and async variants. Prompts, models, parsers, and functions can all be runnables.", "kind": "recall"},
    {"q": "A piped chain fails with a missing-key error. How do you debug?", "a": "Print the input dict and the output of each named stage. The pipe expects specific keys (for example ticket). Anonymous lambdas hide which stage broke.", "kind": "debug"},
    {"q": "When do you keep control flow in your own function instead of LCEL?", "a": "When the branch is a documented if/else, a retry, or a join that must handle a failed arm. Readable application code is easier to test than a clever combinator.", "kind": "apply"},
    {"q": "How do you add logging to a prompt | model | parser chain?", "a": "Name the runnables and wrap or callback at each stage so you can print rendered messages, raw model output, and the parsed object. Do not log only the chain's class name.", "kind": "apply"},
    {"q": "Why build the pipeline by hand before composing?", "a": "So you know the control flow, the exact messages, and the failure paths. The pipe should reproduce a flow you already understand, not invent one you cannot step through.", "kind": "recall"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
  ),
  "raw-sdk-vs-langchain": note(
   what="""You should be able to write the **same feature twice**: once with the provider SDK, once with LangChain. The comparison is the point of this topic. Raw SDK: explicit messages, explicit HTTP options, explicit parse, a stack trace that is eight frames long. LangChain: templates, a model class, a parser, a shorter happy path, a stack trace that is eighty frames long when it fails.

Convenience is real: tools, structured output, and provider ports arrive faster. Abstraction overhead is also real: versions move, imports are heavy, errors wrap the useful one, and you can lose the rendered prompt if you never print it. Neither column wins for every feature.

The interview move is to pick a concrete task (classifier, one tool, a two-step extract-then-summarise) and say which lines disappear in each version — and which lines **must not** disappear (timeout, usage log, validation).""",
   why="""On the job, teams pick LangChain by default and then cannot upgrade it, or they ban it and re-implement templates badly. The grown-up process is to implement the first version raw so you know the call, then adopt the library where the glue is repetitive. Interviewers will ask you to compare. A brand-loyal answer ("we only use X") scores worse than a comparison on debug time, dependency cost, and speed of the first feature.""",
   how="""Take a structured classifier.

Raw: 30–50 lines. Env key, messages list, `response_format` or a tool, `json.loads`, Pydantic validate, log usage, timeout. You can read it top to bottom.

LangChain: 20–30 lines. Template, `with_structured_output`, invoke. You still add timeout, usage callback, and a local validate. If you skip those, the library version is shorter and worse.

Time both to a passing test. Time both to a diagnosed 400. Often the raw version loses the first race and wins the second. That is the overhead you are buying.

When the feature grows a second provider and three tools, the library column usually wins the first race by more. Re-run the comparison; do not freeze a decision from week one.""",
   fails="""1. **Library without the production lines.** No timeout, no usage, no validate. Shorter and unsafe.

2. **Raw SDK copy-pasted six times.** You refused the library and then forked your own worse one.

3. **Comparing line counts only.** Debug time and upgrade risk do not appear in `wc -l`.

4. **Never printing the raw equivalent.** You cannot explain the LangChain path in an interview or an incident.""",
   line="""I can write the feature on the raw SDK and on LangChain. The library buys templates, parsers, and ports. I still add timeout, usage, and validation, and I pick the stack by debug time and repetition, not by brand.""",
   kps=[
    "Implement once raw and once with LangChain so the comparison is concrete.",
    "Convenience: templates, tools, structured output, provider ports.",
    "Overhead: deep stacks, wrapping errors, dependency and upgrade cost.",
    "Timeout, usage, and validation must exist in both versions.",
    "Re-evaluate when tools and providers multiply; do not freeze week-one taste.",
    "Line count is a weak metric; diagnosis time is a better one.",
   ],
   qs=[
    {"q": "Name two things LangChain usually makes shorter and two it does not remove.", "a": "Shorter: prompt templates, provider ports, tool wiring, structured-output helpers. Not removed: timeouts, usage logging, schema validation, and reading the rendered prompt when it fails.", "kind": "recall"},
    {"q": "A LangChain 400 has an 80-frame stack and a wrapped error. What do you do?", "a": "Unwrap until you see the provider body, then print the rendered messages. Compare to the raw-SDK request you should be able to write. Fix that request, not the pipe syntax.", "kind": "debug"},
    {"q": "When does the raw SDK usually win?", "a": "One or two calls, one provider, a team that wants short stack traces. When you would use ten percent of the library and pay for one hundred percent of the upgrades.", "kind": "apply"},
    {"q": "When does LangChain usually win?", "a": "Several tools, a provider port you will actually swap, and repeated template-plus-parser composition. The glue is then less code than the forks you would write.", "kind": "apply"},
    {"q": "What must you add to a short LangChain sample before it is production?", "a": "Timeout, request id, usage/finish-reason logging, local validation, and a way to print the rendered prompt. The sample's invoke line is the happy path only.", "kind": "recall"},
   ],
   links=[LC_INTRO, OA_CHAT],
  ),
  "langchain-is-a-layer-not-the-model": note(
   what="""Keep this sentence in your head: **LangChain is an orchestration layer, not the LLM**. The model is the thing that predicts tokens — a vendor endpoint or a local server. LangChain builds the request, routes it, and parses the response. Quality, price, context limits, and outages belong to the model (and the vendor). Templates, parsers, and pipes belong to the layer.

People blur this because the import is `ChatOpenAI` and the demo looks like "the chain answered". In production the chain did not answer. The model did. The chain assembled the messages. If you swap the model class and quality drops, you changed the model. If you swap the parser and a field goes missing, you changed the layer.

This mental model also tells you what to pin and what to eval. Pin model ids and prompt versions. Pin library versions so upgrades are chosen. Do not pin "LangChain" as if it were a brain.""",
   why="""On the job, incident channels fill with "LangChain is down" when OpenAI is 503, and "the model is dumb" when your parser stripped a field. Interviewers listen for the split. Candidates who say "we use LangChain" as an architecture have not made it. Candidates who say "LangChain calls Vendor X with this schema; the model is Y" have.

Hiring managers also use this to test whether you can leave the library. If the layer is not the model, you can replace the layer.""",
   how="""In every design doc, write two lines:

- Model: `vendor / id / snapshot`, context limit, price.
- Layer: LangChain (or raw SDK / LangGraph / custom), version, what it owns (templates, tools, retries if any).

Example. p95 latency jumped. You check the vendor status and your TTFT. The layer did not get slower; prefill did. Second example: a field vanished after an upgrade. The model still emitted it; a parser change dropped unknowns. You rolled back the layer, not the model.

When someone asks "can we switch off LangChain?", you answer from the port: if your domain talks to a `complete(messages) -> Result` interface, yes. If your domain is 40 imports of LCEL, no — you coupled to the layer.""",
   fails="""1. **Incidents filed against the wrong owner.** You page the library authors for a vendor outage.

2. **Evals that name only the chain.** You cannot tell a model regression from a parser regression.

3. **Treating the layer as lock-in you cannot leave.** That is a boundary problem you created.

4. **Upgrading the library and the model on the same day.** You cannot attribute the quality drop.""",
   line="""LangChain is a layer that builds and parses calls. The model is the endpoint that predicts tokens. I pin and eval them separately, I page the owner of the failure, and I keep a port so the layer is replaceable.""",
   kps=[
    "The model predicts tokens; LangChain assembles and parses the call.",
    "Quality, price, and vendor outages belong to the model.",
    "Templates, parsers, and pipes belong to the layer.",
    "Pin model ids and library versions separately.",
    "Incidents and evals must say which side moved.",
    "A port makes the layer replaceable; importing LCEL everywhere does not.",
   ],
   qs=[
    {"q": "In one sentence, what is LangChain relative to the LLM?", "a": "An orchestration layer that builds requests and parses responses. The LLM is the vendor endpoint or local server that generates tokens.", "kind": "recall"},
    {"q": "Latency jumps and someone says 'LangChain is slow'. How do you split the blame?", "a": "Measure TTFT and vendor status first (model/prefill/network). Then check whether the layer added retries or extra calls. Do not page the library for a 503 at the vendor.", "kind": "debug"},
    {"q": "A field disappears after a LangChain upgrade. The raw model output still has it. Who failed?", "a": "The layer — likely a parser or structured-output helper that dropped unknown or optional fields. Roll back or pin the library; do not change the model id first.", "kind": "debug"},
    {"q": "How do you keep the option to delete LangChain later?", "a": "Put a port in front (`complete(messages) -> Result`) and keep domain types off LangChain classes. The layer becomes a plugin, not the application.", "kind": "apply"},
    {"q": "Why pin the model snapshot and the library version on different lines?", "a": "So you can attribute quality and incidents. Changing both on one day makes every regression a mystery.", "kind": "recall"},
   ],
   links=[LC_INTRO, LC_CONCEPTS],
  ),
  "vendor-lock-in-vs-raw-sdk": note(
   what=""""Vendor lock-in" in this module is two different bindings. **Provider lock-in** is when your code, prompts, and schemas only work on one vendor's API. **Framework lock-in** is when your domain only works through LangChain types. A raw SDK can lock you to a vendor. A framework can lock you to itself while *claiming* to free you from vendors. You still own **retries, logging, and schemas** in both cases. Those are the pieces that make a swap possible.

Hiding a provider behind `ChatX` does not hide the contract you actually depend on: context length, tool-call shape, structured-output flags, safety behaviour. If those leak into your features, you are locked no matter how pretty the adapter is.

The antidote is boring: your own result type, your own schema, your own usage row, your own retry map. The SDK or the framework becomes a driver.""",
   why="""On the job, leadership will ask "are we locked into OpenAI?" after a price change, and "are we locked into LangChain?" after a painful upgrade. Interviewers ask the same with different words. The senior answer names both locks and the three things you refuse to outsource: retries, logs, schemas. "We use LangChain so we are portable" without those three is a slogan.

This is also how you keep a take-home honest. If the rubric says "any provider", your schema and logs should not mention one vendor.""",
   how="""Write a port:

```
class LlmPort:
    def complete(self, messages, schema, tools, timeout) -> Result
```

`Result` has `text | tool_calls`, `usage`, `finish`, `served_model`, `request_id`. Retries live in a wrapper around the port. Schemas are Pydantic / JSON Schema you own. LangChain or the OpenAI SDK implements the port.

Example. You move from OpenAI to Anthropic. You change the driver. The retry map still says 429/503 retry, 401 fail. The usage row still has prompt/completion/cache. The schema still rejects a missing `label`. If any of those lived only inside a vendor helper, the move would have rewritten the app.

Do a fire-drill once: run the eval suite on a second driver for a weekend. That is the only proof of portability.""",
   fails="""1. **Portability as an import.** You imported a second chat model class and declared victory. Evals were never run.

2. **Retries only inside the framework defaults.** You cannot explain or change them. A vendor swap changes retry behaviour silently.

3. **Schemas as prompt text.** "Please return JSON" in a vendor-specific tool wrapper. Local validation never existed.

4. **Logs that only a vendor dashboard can read.** You cannot compare two providers on your own grain.""",
   line="""Frameworks hide providers; I still own retries, logging, and schemas. Those three are the port. Vendor lock and framework lock are both real, and an unused second import is not portability.""",
   kps=[
    "Provider lock and framework lock are different bindings.",
    "You still own retries, logs, and schemas on any stack.",
    "A port with your Result type makes either driver replaceable.",
    "Context limits and tool shapes can lock you even behind an adapter.",
    "Portability is an eval on a second driver, not a second import.",
    "Do not leave retry policy only in framework defaults.",
   ],
   qs=[
    {"q": "What three things should you own even if a framework hides the vendor?", "a": "Retry policy (what is retried, timeouts, caps), usage/finish-reason logging, and schemas with local validation. Those survive a vendor or library swap.", "kind": "recall"},
    {"q": "A lead says you are portable because ChatAnthropic is one import away. What is missing?", "a": "A real second driver behind a port, your own Result type, and an eval run on that driver. An unused import does not prove limits, tools, or quality match.", "kind": "debug"},
    {"q": "How can a raw SDK be less locking than a framework?", "a": "If you wrapped the SDK in a small port, the domain never saw vendor types. A framework used everywhere can be the harder lock even while it offers more vendors.", "kind": "apply"},
    {"q": "What vendor details still leak through LangChain and can lock you?", "a": "Context window, structured-output support, tool-call batching, safety refusals, and price. Design features against the worst of the vendors you might run, or gate them.", "kind": "apply"},
    {"q": "Where should retry maps live?", "a": "In your wrapper around the port, documented as 429/503 retry and 400/401 fail (unless you have a reason). Not only as a hidden framework default.", "kind": "recall"},
   ],
   links=[LC_INTRO, OA_CHAT],
  ),
  "debugging-through-a-runnable": note(
   what="""A runnable that failed is not debugged by staring at its class name. You need the **rendered prompt** (the exact messages the model received) and the **raw model output** before the parser, plus usage and finish reason. LangChain can hide all three behind a pipe. Your job is to make them printable on every environment you will actually use — local, staging, a single production request id.

Callbacks, `verbose`, tracing products (LangSmith and others), or a thin wrapper that logs at each named stage all work. What does not work is adding `print(chain)` or reading only the exception type. The useful artefacts are bytes the vendor saw and bytes it returned.

Once you have those, debugging a runnable is debugging a raw call. That is the point of the previous notes.""",
   why="""On the job, LCEL failures are a rite of passage: a missing key, a parser error, a silent empty dict. The teams that survive have a "dump the render" habit. Interviewers will say "the chain returned the wrong label" and watch whether you ask for the rendered prompt. If you ask for the chain version or the model name only, you are guessing.

This is also how you keep a framework honest. If you cannot print the render, you do not control the layer.""",
   how="""Name every stage. Wrap invoke:

1. Log input dict (redacted).
2. Log `prompt.format_messages(...)` or equivalent.
3. Log raw `AIMessage` / tool calls / finish / usage.
4. Log parsed object or the parser exception.

Example. Label is `other` for a clear billing ticket. The render shows the ticket variable was empty because the handler passed `text` not `ticket`. The model classified an empty string. The parser was fine. Without the render you would have "tuned the prompt" for a week.

In production, gate the full render behind a policy (PII). Always keep usage, finish reason, and a hash of the prompt. For a single incident, an admin flag should dump the render for that request id.""",
   fails="""1. **Class-name debugging.** `StrOutputParser` failed. That is a category, not a cause.

2. **Verbose everywhere, readable nowhere.** You logged megabytes and cannot find the messages. Prefer one structured dump per stage.

3. **No render in staging.** You only have it locally. The bug is data-dependent and staging is where the data lives.

4. **Parser swallows, so you never dump.** Empty dict, HTTP 200, wrong row. Fail loud.""",
   line="""I debug a runnable by printing the rendered prompt and the raw model output, not the chain name. Named stages, a dump per request id, and the same inspector I use on the raw SDK.""",
   kps=[
    "The artefacts are the rendered messages and the raw model output.",
    "Name runnable stages so the middle of the pipe is printable.",
    "Usage and finish reason belong next to the raw output.",
    "A missing template key looks like a 'model' bug until you print the render.",
    "Gate full prompts for PII; always keep usage and a prompt hash.",
    "Parser errors should be loud so a dump exists.",
   ],
   qs=[
    {"q": "What two artefacts do you print first when a LangChain pipeline is wrong?", "a": "The rendered messages the model actually received, and the raw model output (plus finish reason) before the parser. The chain class name is not an artefact.", "kind": "recall"},
    {"q": "The model 'returns other' for every ticket. The parser is happy. What might the render show?", "a": "An empty or wrong template variable (handler passed text instead of ticket), or a truncated ticket. You would have tuned the wording in vain without the render.", "kind": "debug"},
    {"q": "How do you get a dump in production without logging every user's prompt?", "a": "Always log usage, finish reason, model, and a prompt hash. Dump the full render for a single request id behind an admin/PII policy when you are investigating.", "kind": "apply"},
    {"q": "Why name stages in a pipe instead of using anonymous lambdas?", "a": "So you can log or breakpoint the middle. Anonymous functions turn a parser error into an unreadable stack with no render.", "kind": "apply"},
    {"q": "A teammate turns on verbose=True and still cannot find the messages. What do you change?", "a": "Structured per-stage logs (or a tracer) that emit rendered messages and raw output as fields, not a firehose of internals. Verbose is not a dump you can query.", "kind": "recall"},
   ],
   links=[LC_RUN, LC_CONCEPTS],
  ),
 }
}
