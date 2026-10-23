from helper import note, OA_API, AN_MSG, LC_CONCEPTS

NOTES = {
 "m2-10": {
  "what-to-record-per-request": note(
   what="""Every LLM request should leave a **row** you can query: **model** (served, not only alias), **input tokens**, **output tokens**, cache tokens if any, **latency** (start, first token, end), **retries**, **error species**, **tool names** called, and an **estimated cost**. Add request id, user/feature, finish reason, attempt count. This is not optional telemetry. It is how you debug, budget, and page.

Do not record secrets or, unless policy allows, raw prompts and raw completions. Usage and ids are yes; PII is a policy decision. When you do store prompts, they are locked down like customer data.

A monthly vendor invoice is not a per-request row. You need both.""",
   why="""On the job, 'why did the bill jump' is unanswerable without this row. Interviewers will ask what you log. They want this list, plus what you never log (keys, and usually full PII). They will ding 'we have CloudWatch'. A dump is not a row. This is the M2.1 usage note grown into a product habit.""",
   how="""Write one structured event at the wrapper:

`{id, feature, model, prompt_tokens, completion_tokens, cached, cost_est, ms_total, ms_ttft, retries, finish, error_species, tools[], user_hash}`

Example. Feature `support_chat` jumps from 800 to 6_000 prompt tokens. You find a PDF paste in the system prompt. Without the row you would have blamed the model. Cost_est uses the rate card for that model that day, but raw tokens stay so a price change does not rewrite history.

Index on feature, model, and time. Alert off this table, not off SSH.""",
   fails="""1. **Only HTTP logs.** No tokens.

2. **Logging the API key** or `Authorization`.

3. **Cost without tokens.** You cannot reprice.

4. **No feature tag.** The expensive screen is invisible.""",
   line="""I persist model, tokens, latency, retries, errors, tools, and estimated cost on every request. I never log the key, and I treat full prompts as PII unless policy says otherwise.""",
   kps=[
    "Row per request: model, tokens, latency, retries, errors, tools, cost.",
    "Served model id, not only the alias.",
    "Raw tokens stay even when prices change.",
    "Never log keys; prompts are a policy decision.",
    "Feature and user grain, not only monthly totals.",
    "Alert from this table.",
   ],
   qs=[
    {"q": "What fields do you record on every LLM request?", "a": "Served model, prompt/completion/cache tokens, latency (including TTFT if streamed), retries, error species, tool names, estimated cost, request id, feature, finish reason.", "kind": "recall"},
    {"q": "The monthly invoice jumped and you have no per-request tokens. What can you not do?", "a": "Find the feature, the prompt-size regression, or the retry storm. A total cannot locate a bad turn. Instrument the wrapper before the next cycle.", "kind": "debug"},
    {"q": "Why keep raw token fields as well as cost_est?", "a": "Rates change. You need to reprice history and to catch token regressions that a sale-priced month would hide.", "kind": "apply"},
    {"q": "What do you never put on this row?", "a": "API keys and Authorization headers. Full prompts and completions only if policy allows and access is locked. Prefer hashes and redaction.", "kind": "apply"},
    {"q": "Why include tool names?", "a": "So you can see which turns paid for a retrieve versus a refund, and which tool is failing. Usage without tools hides the loop.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask to see one row from staging. If tokens or finish reason are missing, the wrapper is incomplete. Grep logs for sk- and Authorization.",
  ),
  "interactions-as-traces": note(
   what="""A user turn that hits a router, two tools, and a draft is **one interaction** and **several spans**. Treat it as a **trace** with a single id, not as isolated API logs you will grep together later. The parent span is the user request. Children are each LLM call and each tool, with their own tokens and timings. Without a trace you cannot say which step failed, which call ate the tokens, or where latency accumulated.

Traces are how you debug workflows. Print statements are how you debug a script. Production has more than one step.

Keep PII out of span attributes unless policy allows. Names of steps, token counts, and ids are enough for most pages.""",
   why="""On the job, 'it was slow' is a three-span story (retrieve 1.8s, model 0.4s, merge 0.2s) or you are guessing. Interviewers will ask how you debug a multi-step feature. They want a trace id, not a hope that timestamps line up. This is also how you talk about LangChain callbacks without making the vendor the brain.""",
   how="""Mint `trace_id` at the handler. Pass it into every complete() and tool. Export to your existing tracer (OpenTelemetry or similar) plus the usage table (same id).

Example. User asks a policy question. Spans: `route` 80ms, `retrieve` 900ms, `generate` 1.2s (800ms TTFT), `validate` 10ms. Tokens sit on `generate`. You do not 'optimise the model' when retrieve is the tail.

LangChain callbacks can emit these spans if you wire them; you can also wrap by hand. The id is the product, not the library.""",
   fails="""1. **One log line per process** with no parent id.

2. **New ids on retries** so you cannot see attempts.

3. **Putting the user email in every span attribute.**

4. **Traces only in LangSmith**, nothing in your own store, then the bill surprises you.""",
   line="""A multi-step turn is a trace: one id, a span per LLM and tool. I debug from the trace, not from scattered prints, and I keep PII out of span attributes.""",
   kps=[
    "One trace id from the user request through every hop.",
    "A span per LLM call and per tool, with tokens and time.",
    "Retries keep the same trace id and increment attempt.",
    "Find the slow or expensive span before you change the model.",
    "Callbacks are a way to emit spans, not a substitute for an id.",
    "PII stays out of default span attributes.",
   ],
   qs=[
    {"q": "Why treat a workflow as a trace rather than isolated API calls?", "a": "So you can see which step failed, which call used the tokens, and where latency sat, under one id. Isolated logs will not join cleanly when clocks and retries disagree.", "kind": "recall"},
    {"q": "p95 is 3s; people blame the model. The trace shows retrieve 2.4s. What do you do?", "a": "Fix retrieve (index, k, timeout). Do not swap the model first. The trace named the span.", "kind": "debug"},
    {"q": "What belongs on child spans?", "a": "Step name, model or tool, tokens if an LLM, latency, error species, attempt number, and the shared trace id. Not the raw user email.", "kind": "apply"},
    {"q": "A retry minted a new trace id. What did you lose?", "a": "The ability to see attempts as one interaction. Keep the id; increment attempt. Vendor request ids can be children.", "kind": "apply"},
    {"q": "Are LangChain callbacks enough by themselves?", "a": "They can emit spans, but you still own the id, the store, and the policy. A vendor-only tracer is not your warehouse.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, OA_API],
   review="Ask them to sketch parent and children for a tool turn. If there is no trace id, the design is still print-debugging. Ask where the id is minted.",
  ),
  "finding-the-failing-step": note(
   what="""Once you have a trace, **finding the failing step** is a query, not a ritual. You should be able to answer: which span **errored**, which span used the **most tokens**, which **tool** was selected, and where **latency** accumulated. If you cannot answer those four from one id in a minute, the trace is decoration.

This is operational, not academic. On-call will ask these four questions in this order. Dashboards that only show 'error rate' force you back into grep.

Also look at **successes** that are expensive or slow. A 200 with 40k tokens is a failing step in spirit.""",
   why="""Interviewers will give you a war story and ask what you look at first. They want the four questions and a trace id, not a guess about temperature. On the job this is how you stop a room from rewriting the prompt when the tool 404'd.""",
   how="""Build four widgets on the trace view:

1. Error species by span name.
2. Tokens by span (stacked).
3. Tool name histogram.
4. Latency waterfall.

Example. Ticket #8311. Waterfall: generate 400ms, `get_order` 2.1s (404). The model then guessed. You fix the id parser, not the prompt. Second example: generate 8k prompt tokens, retrieve 200ms. You shrink the prefix.

Practice on last week's incidents until the queries are muscle memory.""",
   fails="""1. **Error rate only.** You cannot see which span.

2. **No tool dimension.** You cannot see get_order dying.

3. **Blaming the last span** always (the draft) when retrieve failed.

4. **Ignoring expensive 200s.**""",
   line="""I use the trace to answer four things: which step errored, which ate tokens, which tool ran, and where time went. If I cannot, I do not have observability yet.""",
   kps=[
    "Four questions: error span, token span, tool, latency.",
    "A 200 can still be the failing step if it is huge or truncated.",
    "Do not blame the last span by default.",
    "Dashboards need span name and tool dimensions.",
    "Practice the queries before the incident.",
    "Prompt rewrites are a last resort after the waterfall.",
   ],
   qs=[
    {"q": "What four things should a trace tell you about a bad turn?", "a": "Which span errored, which span used the most tokens, which tool was selected, and where latency accumulated. Plus finish reason on the LLM spans.", "kind": "recall"},
    {"q": "The draft looks wrong; get_order 404d earlier in the trace. What do you fix first?", "a": "The tool/id path. The model guessed because the result was missing. Do not start by rewriting the draft prompt.", "kind": "debug"},
    {"q": "Why include expensive 200s in 'failing step' reviews?", "a": "They burn money and often signal a prompt or retrieve regression. Success HTTP is not success product.", "kind": "apply"},
    {"q": "What dimensions do you put on the error graph?", "a": "Span name, tool name, error species, feature, model. A single error-rate line is not enough to find the step.", "kind": "apply"},
    {"q": "You cannot answer the four questions in a minute. What is missing?", "a": "A real trace: parent id, child spans with tokens and times, or a warehouse that joins them. Prints are not enough.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, OA_API],
   review="Give them a fictional waterfall and ask what they fix. If they touch the prompt before the 404 span, they are not using the trace. Ask to see the four widgets.",
  ),
  "tracing-a-full-workflow": note(
   what="""LangChain (and similar) can emit **callbacks** as a chain runs: a prompt rendered, a model called, a parser finished, a tool executed. Wire those into **one execution trace** so a `prompt | model | parser` plus a tool is not four orphan logs. The callback is a hook, not a product. You still mint the id, you still store the spans, you still redact.

If you do not use LangChain, wrap each step by hand. The user should not be able to tell which library you used from the trace shape. A workflow that cannot be traced is not ready to compose.

Connect **model and tool calls** into that single id even when they go through different clients.""",
   why="""On the job, LCEL bugs are only solvable if you see the rendered prompt and the tool in one place. Interviewers will ask how you trace a LangChain workflow. They want callbacks or wrappers plus your id, not 'we enable verbose'. Verbose is not a queryable trace.""",
   how="""Implement a callback handler that starts/ends spans with the parent trace_id. Map `on_chat_model_start/end` to an LLM span (include token usage if the event has it). Map tool events to tool spans. Example. A support chain: you see `prompt.render`, `ChatOpenAI`, `get_order`, `ChatOpenAI#2` under `trace=abc`. You click `abc` and you have the story.

If callbacks miss a custom function, wrap that function. Do not wait for the library to notice it.

Test with a fake chain that you can assert produced three spans.""",
   fails="""1. **verbose=True as observability.**

2. **Callbacks only in local notebooks.**

3. **Different ids** for the tool client and the chat client.

4. **No test** that a chain emits spans.""",
   line="""I wire callbacks or wrappers so a whole workflow is one trace: rendered prompt, each model call, each tool. Verbose is not a trace. The id is mine.""",
   kps=[
    "Callbacks emit spans; they do not replace a trace id.",
    "One id across model clients and tool clients.",
    "Map render, model, parser, and tool events.",
    "Verbose logs are not queryable observability.",
    "Test that a chain produces the expected spans.",
    "Hand-wrap steps the library does not see.",
   ],
   qs=[
    {"q": "How do you trace a LangChain workflow end to end?", "a": "Mint a trace id, attach a callback (or wrappers) that starts/ends spans for render, model, parser, and tools, and store them with that id. Do not rely on verbose prints.", "kind": "recall"},
    {"q": "The chat client and the tool HTTP client have different ids. What breaks?", "a": "You cannot join the tool 404 to the model call that caused it. Pass the same parent id into every client.", "kind": "debug"},
    {"q": "Why is verbose=True not enough in production?", "a": "It is a firehose, not a queryable span store. You cannot filter by feature or alert on a step. Use structured spans.", "kind": "apply"},
    {"q": "A custom function in the pipe has no span. What do you do?", "a": "Wrap it by hand. Do not wait for a callback the library does not fire. The workflow must be fully visible.", "kind": "apply"},
    {"q": "What do you assert in a test of tracing?", "a": "That invoking a small fake chain emits the expected span names under one parent id, including a tool span if a tool ran.", "kind": "recall"},
   ],
   links=[LC_CONCEPTS, OA_API],
   review="Ask where the id is minted and how a tool HTTP call inherits it. If they say verbose, they do not have tracing. Ask for a test.",
  ),
  "logging-you-can-actually-debug-with": note(
   what="""Debug logging is **structured, greppable, and complete enough to replay the skeleton of a turn** — not a scatter of `print(chain)` and `print(x)`. You want: trace id, step, rendered-prompt hash (or the prompt if policy allows), raw model finish reason, parsed object or parser error, tool args executed, tool result code. You do not want 80-frame stacks as the only signal, and you do not want a different print style per feature.

`print` is how you find the first bug locally. It is not how you find the hundredth in production. Replace it with the wrapper's logger before you merge.

Redact by default. A debug log that contains another customer's order is an incident.""",
   why="""On the job, the worst incidents are the ones you cannot reproduce because the only log was 'error'. Interviewers will ask how you debug without print. They want structured fields and a trace id. They will ding a culture of leftover prints. This is the professionalism check of M2.10.""",
   how="""Adopt one logger helper: `log.step(trace, name, **fields)`. Ban raw prints in CI (lint). Example. Parser fails: you have `raw_len`, `finish=length`, `schema_error=order_id`. You do not have a screenshot of a notebook.

For a single incident, an admin flag dumps the rendered prompt for that id (PII-gated). Day to day, hashes and lengths are enough to see that the prompt grew.

If you cannot tell success from `finish=length` in the log, you cannot debug.""",
   fails="""1. **Print leftovers** in production paths.

2. **Unstructured strings** you cannot query.

3. **PII in debug** on a shared sink.

4. **Logging only exceptions** so silent length-truncation is invisible.""",
   line="""I debug from structured step logs under a trace id, not from scattered prints. I can see finish reason, parser errors, and executed tool args, and I redact PII by default.""",
   kps=[
    "Structured fields under a trace id beat print().",
    "Log finish reason and parser errors, not only exceptions.",
    "Lint away raw prints on production paths.",
    "Redact PII; dump full prompts only behind a gate.",
    "One helper so features do not invent formats.",
    "Silent truncation must be visible in the log.",
   ],
   qs=[
    {"q": "What makes a log actually debuggable for an LLM turn?", "a": "A trace id, step name, finish reason, token counts, parser or tool error codes, and executed args — as fields. Not an unstructured print or an 80-frame stack alone.", "kind": "recall"},
    {"q": "You have print(chain) in a handler. What do you replace it with?", "a": "A structured step log from the wrapper, plus the rendered-prompt hash. Remove the print in the same PR. CI should lint for it.", "kind": "debug"},
    {"q": "How do you debug a data-dependent bug without logging every prompt?", "a": "Store hashes, lengths, and finish reasons always. Dump the full render for one id behind an admin/PII gate when you are in the incident.", "kind": "apply"},
    {"q": "Why log finish=length on successes?", "a": "Because HTTP and your parser might still 'succeed' on a truncated object. If it is not in the log, you will not see the silent cut-off.", "kind": "apply"},
    {"q": "What is the PII rule for debug logs?", "a": "Redact by default. No other customer's order, no keys, no raw headers. Full text is locked and exceptional.", "kind": "recall"},
   ],
   links=[OA_API, LC_CONCEPTS],
   review="Grep the diff for print( and console.log. Ask to see a structured step log from staging. If finish reason is missing, they cannot debug truncation.",
  ),
  "trace-ids-across-a-multi-step-call": note(
   what="""Mint **one id at the user request** and thread it through **every model call and every tool**, including retries and fallbacks. That is the definition of a trace id in this module. Vendor request ids are children, not replacements: they change per HTTP attempt. If you mint a new uuid in the tool client, you have lost the join.

Propagate via context (contextvars, a request-scoped bag) so callees do not need twenty extra arguments — but be explicit at process boundaries (queue jobs must receive the id). A cron that starts a child workflow gets a new parent, with an optional link to the trigger.

This is a small note with a large operational payoff. Say it in the interview.""",
   why="""On the job, the missing join is why you cannot prove the refund and the narration were the same turn. Interviewers will ask how ids work. They want: one parent from the handler, children for attempts, vendor ids stored but not used as the parent. They will ding 'the SDK request id is enough'.""",
   how="""Handler: `trace_id = uuid4()`. Set context. Wrapper reads context, puts `trace_id` on the usage row and the span, puts vendor `request_id` as `vendor_id`. Tool HTTP sends `X-Trace-Id` to your own services (not to the LLM vendor).

Example. User click → `trace=T`. Model attempt 1 `vendor=v1` fails 503. Attempt 2 `vendor=v2` succeeds and calls `get_order`. Tool span still `T`. You query `T` and see both attempts.

Jobs: the queue payload includes `trace_id`. If it does not, the worker mints a new one and you lost the click-to-job story.""",
   fails="""1. **New uuid in every wrapper call.**

2. **Using only the vendor id** (changes on retry).

3. **Dropping the id on the queue.**

4. **Sending your trace id to a third party that should not see it** if policy forbids — use a hash.""",
   line="""One id from the user request through tools and the model, including retries. Vendor ids are children. If I mint a new uuid in a callee, I have lost the trace.""",
   kps=[
    "Mint the parent id at the user request.",
    "Thread it through models, tools, retries, fallbacks.",
    "Vendor request ids are child identifiers.",
    "Propagate across queues explicitly.",
    "Do not mint a new uuid in each wrapper call.",
    "Say this sentence in the interview.",
   ],
   qs=[
    {"q": "Where is the trace id minted, and what must inherit it?", "a": "At the user-request handler. Every model attempt, tool, retry, and fallback inherits it. Vendor HTTP ids are stored as children.", "kind": "recall"},
    {"q": "Each complete() mints a new uuid. What can you not prove?", "a": "That the refund tool and the narration were the same user click, or that two 503s were attempts of one turn. Use one parent.", "kind": "debug"},
    {"q": "How does a queue worker keep the trace?", "a": "The payload includes the id. The worker sets context from it. If the payload omits it, the join to the click is gone.", "kind": "apply"},
    {"q": "Why not use only the vendor request id as the trace?", "a": "It changes every HTTP attempt and does not exist on your tool calls. It is a good child field, a bad parent.", "kind": "apply"},
    {"q": "What do you send to your own order service?", "a": "The same trace id (or a hash if policy requires), so their logs join yours. You do not need to send it to the LLM vendor.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask where the uuid is created. If they say inside the SDK wrapper on every call, the parent is wrong. Ask how a retry keeps it.",
  ),
  "cost-anomaly-alerts": note(
   what="""Page when **tokens per request** (or **spend per hour**) **jump**, not only when the process dies. A healthy HTTP 200 with 10× prompt tokens is an incident: a busted cache, a PDF in the system prompt, a retry storm, a runaway history. Crash alerts will stay green. Cost anomaly alerts are how you find it at 2× instead of at the invoice.

Set a baseline per **feature and model**, not one global number. A 4k-token RAG feature is not a 200-token classifier. Alert on relative jumps (e.g. 2× the 7-day median) and on absolute caps (hourly spend). Include 429 rate as a sibling: it is a cost amplifier.

This is the alarm named in the M2.8 interview recipe.""",
   why="""On the job, the expensive success is the silent killer. Interviewers will ask what you page on. They want tokens/spend, not only 5xx. They will ding 'we watch the dashboard'. Watching is not paging. This is how you sound like you have paid a bill.""",
   how="""Metrics: `tokens_per_request{feature,model}` p50/p95, `spend_per_hour{feature}`, `429_rate`. Alert: p95 tokens > 2× 7-day median for 30 minutes, or hourly spend > $N. Example. `support_chat` p95 prompt tokens 900 → 7_000 after a timestamp lands in the system prompt. You page, revert the prompt, cache returns. The process never crashed.

Do not alert on nightly batch jobs with the interactive threshold; give them their own cap. Silence is a config, not an absence of alarms.""",
   fails="""1. **5xx-only paging.**

2. **One global token threshold** that either never fires or always fires.

3. **No hourly spend cap.**

4. **Alerting on the batch job** with the chat threshold every night.""",
   line="""I page when tokens per request or spend per hour jump, not only when the process dies. Expensive 200s are incidents. Baselines are per feature and model.""",
   kps=[
    "Alert on token and spend jumps, not only on crashes.",
    "Baseline per feature and model.",
    "Relative jump plus absolute hourly cap.",
    "429 rate is a sibling cost alarm.",
    "Batch jobs get their own thresholds.",
    "A 200 can be the incident.",
   ],
   qs=[
    {"q": "Why page on tokens per request, not only on 5xx?", "a": "A successful call can still 10× the prompt and the bill. Crash alarms stay green. Token and spend alerts catch busted caches, prompt dumps, and retry storms.", "kind": "recall"},
    {"q": "A classifier and a RAG chat share one token threshold. What goes wrong?", "a": "The threshold is noise for RAG or deaf for the classifier. Baseline each feature (and model) separately.", "kind": "debug"},
    {"q": "What two kinds of threshold do you set?", "a": "A relative jump off a recent median, and an absolute hourly spend cap. Either can fire.", "kind": "apply"},
    {"q": "How do 429s belong in cost alerting?", "a": "They drive retries, which drive tokens. A rising 429 rate is a spend leading indicator, especially with an unbound caller.", "kind": "apply"},
    {"q": "Should the nightly 10k eval use the chat spend alarm?", "a": "No. Give it its own cap and window. Otherwise you page every night or you raise the chat cap until it is useless.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask what pages at 2am if tokens 10× and HTTP is 200. If the answer is nothing, they do not have a cost alarm. Ask for per-feature baselines.",
  ),
  "interview": note(
   what="""**Interview: what you log and what you never log** is a two-column answer. **Yes:** usage (tokens, cost est), ids (trace, request, vendor), model, latency, retries, finish reason, tool names, error species. **Never:** API keys, Authorization headers, and — unless policy explicitly allows and access is locked — raw user PII and full prompts/completions. You say the yes column first so you do not sound like you log nothing. You say the never column so you do not sound reckless.

This is M2.10's exam. It also closes Level 2's hygiene story (keys, traces, cost).""",
   why="""Hiring managers have seen logs that contain keys and customer emails. They will ask this even if they ask nothing else about observability. On the job it is also the privacy review you will walk security through.""",
   how="""Speak the columns:

Yes — 'I can debug and budget: tokens, ids, model, latency, tools, finish reason.'
Never — 'I do not log keys. Prompts and PII only behind policy, redaction, and a lock. Day to day I store hashes and lengths.'

If they follow up, you add cost-anomaly paging and the one-id trace. Close with: 'Usage and ids yes; raw user PII and full prompts only if policy allows.'""",
   fails="""1. **Logging everything** to sound thorough.

2. **Logging nothing** to sound safe, then you cannot debug.

3. **Forgetting keys** in the never column.

4. **Promising full prompt dumps in the default log.**""",
   line="""I log usage and ids so I can debug and budget. I never log keys. Full prompts and PII only if policy allows, redacted and locked. That is the whole interview answer.""",
   kps=[
    "Yes: tokens, ids, model, latency, tools, finish reason, errors.",
    "Never: keys and raw headers.",
    "Prompts and PII only with policy, redaction, and a lock.",
    "Hashes and lengths are the default.",
    "Say both columns; neither alone is senior.",
    "Add traces and cost alarms if they give you time.",
   ],
   qs=[
    {"q": "What do you log, and what do you never log, for LLM calls?", "a": "Log usage, ids, model, latency, retries, finish reason, tools, error species. Never log API keys or Authorization. Prompts and PII only if policy allows, with redaction and locked access.", "kind": "recall"},
    {"q": "A teammate logs every prompt 'for debugging'. What do you change?", "a": "Default to hashes and lengths. Full dumps behind an admin gate with retention and ACL. The default log is not a prompt store.", "kind": "apply"},
    {"q": "Security asks if you log keys. How do you prove you do not?", "a": "Show the redaction in the wrapper, a lint/test that fails if Authorization is logged, and a sample row. Do not rely on 'we are careful'.", "kind": "apply"},
    {"q": "You logged nothing because of privacy and now you cannot explain the bill. What was missing?", "a": "The yes column: tokens, cost est, feature, model. Those are not PII. Privacy is not an excuse to have no usage row.", "kind": "debug"},
    {"q": "What one sentence should they remember?", "a": "Usage and ids yes; raw user PII and full prompts only if policy allows.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Hear both columns. If they omit keys from never, or omit tokens from yes, they do not have the talking point. Ask how a full prompt is accessed in an incident.",
  ),
 }
}
