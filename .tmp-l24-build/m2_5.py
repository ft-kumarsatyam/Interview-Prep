from helper import note, OA_TOOLS, AN_TOOLS, LC_TOOLS

NOTES = {
 "m2-5": {
  "who-chooses-and-who-executes": note(
   what="""Tool calling splits two jobs that people mash together. The **model chooses**: it looks at the user turn and the tool list, then emits a structured **tool request** — a name plus arguments. **Your application executes**: it validates those arguments, checks permissions, calls the real function or HTTP API, and only then sends a **tool result** back as a new message. The model cannot open a socket, refund a card, or query your database unless you run the code.

This split is the whole security model. A tool request is a suggestion, not a syscall. Treat it like an untrusted HTTP body from the public internet. The model is a planner with a form; you are the process that may submit that form.

Providers differ on names (function call, tool use, tool_calls) and on whether multiple calls arrive in one turn. The split does not change.""",
   why="""On the job, the first dangerous bug is executing whatever the model asked. Interviewers will ask who calls the refund function. If you say the model, you failed. The senior line is: the model proposes, my code authorises and executes, I return a result, the model writes the user-facing sentence. They also want you to say that a well-written description changes what the model proposes, but never replaces the authorisation check.

This is the most important sentence in Level 2 after 'the API is stateless'.""",
   how="""Draw four boxes: User → Model → Your executor → Model.

Example. User: 'Cancel order ORD-9 and refund me.' The model emits `refund(order_id=ORD-9, amount=full)`. Your executor: (1) parse and schema-validate, (2) load ORD-9 for this user, (3) refuse if not theirs or already refunded, (4) call billing, (5) return `{ok: true, amount: 1400}` as a tool message. The model then says 'Refunded ₹1,400.' If you had executed blindly, a hallucinated order id or a stranger's id would have moved money.

The model never sees your billing API key. It sees a result payload you chose to send.""",
   fails="""1. **Executing the proposal as a syscall.** No auth, no id check. This is the incident.

2. **Letting the model call HTTP itself** (unconstrained browsing or a shell). You gave away the split.

3. **Returning stack traces to the model.** It will echo them to the user or retry destructively. Return a short, structured error.

4. **Confusing 'the SDK ran the tool' with 'we authorised it'.** A framework executor that just `fn(**args)` is still your process — you still owe the checks.""",
   line="""The model proposes a tool name and arguments. My code validates, authorises, executes, and returns a result. The model never touches the side effect directly.""",
   kps=[
    "The model chooses a tool and arguments; your app executes.",
    "A tool request is untrusted input, not a syscall.",
    "Authorise against the current user before any side effect.",
    "Return a short structured result, not a stack trace.",
    "Framework 'auto execute' does not remove your checks.",
    "The model never holds the downstream API key.",
   ],
   qs=[
    {"q": "Who chooses a tool, and who executes it?", "a": "The model usually chooses the tool and generates arguments. Your application validates, authorises, executes the real function, and returns a result message. The model cannot perform the side effect by itself.", "kind": "recall"},
    {"q": "The model asks to refund ORD-9. What must your executor do before calling billing?", "a": "Parse and schema-validate, load the order for the current user, refuse if missing, not theirs, or already refunded, then call billing. Return a structured result. Do not execute the proposal blindly.", "kind": "apply"},
    {"q": "A framework offers auto-execute=true. What is still your job?", "a": "The same validation and authorisation. Auto-execute only means the framework will call your function pointer. It is not an approval step.", "kind": "debug"},
    {"q": "Why must the model not hold the billing API key?", "a": "Anything in the prompt or in a tool the model can call without your checks can leak or be replayed. The key stays in your executor. The model sees only the result you return.", "kind": "recall"},
    {"q": "What do you return if the tool throws?", "a": "A short structured error the model can use (not_found, denied, retryable), not a stack trace or an HTML page. Then decide whether the model may retry or must apologise.", "kind": "apply"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask the author to draw the four boxes and to point at the authorisation line in the executor. If the model output is piped into a function with star-args and no user check, the review is a reject. Ask what the model sees if billing throws.",
  ),
  "defining-a-tool": note(
   what="""A tool the model can choose is a **spec**: a **name**, a **description**, a **parameter schema** (types, required arguments, enums), and sometimes a few examples of when not to call it. The spec is what the model reads. The Python function is what you run. If they disagree, the model will fill the spec and your function will crash — or worse, do the wrong thing.

Good names are verbs plus an object (`get_order`, `create_refund`), not `do_stuff` or `api`. Good descriptions say when to use the tool, when not to, and what the arguments mean in one or two sentences. Good schemas are the same tight contracts as M2.4: enums, required keys, no junk-drawer strings.

The spec is also context. Every tool you attach spends tokens and attention on every turn. A bloated catalogue is a quality problem, not just a docs problem.""",
   why="""On the job, bad specs are why the model calls `search` when it should call `get_order`. Interviewers will hand you a sloppy tool and ask you to rewrite it. They want a precise name, a description a stranger could implement, a minimal parameter list, and types that can be validated. They also want you to mention that the description is in the prompt.

This is the design skill that M2.6 deepens. Here you learn the fields; there you learn the failure modes of overlapping tools.""",
   how="""Write the spec before the function.

Example. `get_order(order_id: string matching ORD-\\d+)` — description: 'Fetch one order the current user owns. Use when the user names an order id. Do not use for lists or refunds.' Required: `order_id`. No `user_id` argument — you will take that from the session.

A bad spec: `order(query: string)` described as 'does orders'. The model will dump the whole user sentence into `query`. You will then parse it again, badly.

Put the JSON Schema on the wire. Share it with the local validator. Keep the description under a few hundred tokens unless you have measured that more helps.""",
   fails="""1. **Name and function disagree.** Spec says `amount` is dollars; function treats it as cents.

2. **Optional everything.** The model omits the only id you need.

3. **A string query that re-implements the schema.** You hid the types.

4. **Passing user_id as an argument.** The model can swap it. Bind identity from the session.""",
   line="""A tool is a name, a description, and a tight parameter schema the model can read. I write the spec so a stranger could implement it, I bind identity from the session, and I share the schema with the validator.""",
   kps=[
    "A tool spec is name, description, and a typed parameter schema.",
    "Names are verbs plus objects; descriptions say when and when not.",
    "Share the schema with local validation; do not drift.",
    "Do not take user_id from the model; bind it from the session.",
    "Every attached tool costs tokens and attention each turn.",
    "A single query string is usually a refused schema.",
   ],
   qs=[
    {"q": "What fields belong on a tool the model will choose?", "a": "A precise name, a description of when to use and when not to, and a parameter schema with types and required arguments. Those fields are what the model sees.", "kind": "recall"},
    {"q": "Why is user_id a bad tool argument?", "a": "The model can put any id there. Identity must come from the authenticated session in your executor. The tool should only take the resource id it needs.", "kind": "debug"},
    {"q": "Rewrite a tool named helper with a query string for fetching one order.", "a": "get_order with required order_id (typed or patterned), a description that says it fetches one owned order and is not a search or a refund, and no catch-all query string.", "kind": "apply"},
    {"q": "The spec says amount is dollars; the function treats cents. What happens?", "a": "The model will send 14.00 and you will charge 14 cents, or the reverse. Align spec, validator, and function from one schema, and add a unit test on a real number.", "kind": "debug"},
    {"q": "Why keep descriptions short unless you have measured otherwise?", "a": "They sit in the prompt on every turn. Long, overlapping blurbs waste tokens and confuse selection. Measure if a longer description actually lifts tool-choice accuracy.", "kind": "apply"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Open the spec in the PR. If you cannot implement the function from the name, description, and types alone, send it back. Ask why any identity field is an argument. Ask how many tokens the whole tool list adds to every turn.",
  ),
  "the-full-tool-calling-loop": note(
   what="""The loop is a protocol, not a vibe: **user → model → tool request → your execute → tool result message → model → final answer** (or another tool request). You must persist every hop. The second model call is a new HTTP request that includes the original messages, the assistant tool-call message, and your tool result. Forgetting any piece makes the model invent a result or repeat the call.

Some turns need two or three tools, or the same tool twice. The loop repeats until the model emits a normal assistant message (or you hit a cap). You own the cap. An unbounded loop is a bill and a hang.

Streaming complicates the middle: you accumulate the tool-call fragments, parse once, execute, then start the next completion. You do not stream the tool result to the user as if it were the answer.""",
   why="""On the job, most 'the tool did not work' bugs are a broken loop: the result was not appended, the call id did not match, or you showed the first assistant message (the tool request) as if it were English. Interviewers will ask you to draw the loop from memory. They want the boxes, the second model call, and a max-iterations number. They will ding a diagram that stops at execute.

This is the Level 2 diagram you should be able to redraw in 90 seconds.""",
   how="""Implement a `while steps < MAX` (MAX of 4 is a sane default for a support bot):

1. `resp = complete(messages, tools)`
2. If text and no tool calls: return text.
3. If tool calls: for each, execute (or in parallel if independent), append assistant tool-call message, append tool results with matching ids.
4. Loop.

Example. User asks for order status plus a refund policy. First completion: `get_order` and `get_policy`. You run both, append two results, call again. Second completion: a sentence. You stop. If the second completion asks for `get_order` again, you may return the cached result or increment the step counter and refuse a third identical call.

Log each hop with the same request/trace id.""",
   fails="""1. **Dropping the tool result.** The next completion has no evidence and hallucinates.

2. **Showing the tool-call JSON to the user.** They see `{"name":"get_order"...}` in the bubble.

3. **No MAX.** A confused model cycles tools until the budget dies.

4. **One shared result for two call ids.** The model mixes which answer belongs to which request.""",
   line="""User, model, tool request, my execute, tool result, model again, final text. I persist every hop, I cap the loop, and I never treat the first tool-call message as the user-visible answer.""",
   kps=[
    "The loop is user → model → execute → result → model → answer.",
    "The second call must include the assistant tool-call and your result.",
    "Cap iterations; unbounded loops are a bill.",
    "Match results to tool-call ids.",
    "Do not show the tool-request JSON as the answer.",
    "Log every hop on one trace id.",
   ],
   qs=[
    {"q": "Draw the happy-path tool loop in words.", "a": "User message, model returns a tool request, your code executes and appends a tool result with the matching id, you call the model again with the full list, the model returns the user-facing answer. Repeat if more tools are requested, up to a cap.", "kind": "recall"},
    {"q": "The model repeats the same tool three times and never answers. What did you forget?", "a": "A max-iteration cap and, probably, a clear tool result. Stop the loop, return a safe message, and log the cycle. Also check the result was actually appended with the right id.", "kind": "debug"},
    {"q": "What must the second complete() include?", "a": "The original messages, the assistant message that contained the tool calls, and one tool result per call id. Omitting any of those makes the model guess.", "kind": "apply"},
    {"q": "Two independent tools arrive in one turn. How do you run them?", "a": "You may run them concurrently if neither depends on the other, then append both results before the next model call. If one should gate the other, run sequentially.", "kind": "apply"},
    {"q": "Why is the first assistant message not the answer?", "a": "It is a tool request, often with no user-visible text. Painting it as the reply shows JSON or a blank bubble. Wait for the post-tool completion.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS, LC_TOOLS],
   review="Ask the author to write MAX on the board and to show the messages array after execute. If the tool result is not in that array, the loop is broken. Ask what the UI renders after the first completion.",
  ),
  "tool-call-ids-returning-results": note(
   what="""Each tool request carries an **id** (and a name). Your result message must include **that same id** so the model can attach the result to the request it made. Parallel calls make this non-negotiable: two `get_order` calls with different arguments are distinguished only by id. Providers reject or mis-associate results that have the wrong id, a missing id, or a result with no matching request.

The result is a role (`tool` / `function`) plus content you control. Keep it small and structured. Do not dump a 40k HTML page. Do not omit the id because 'there was only one call'. The next turn may have two.

When you persist history, persist the ids. A replay or a retry that regenerates ids will orphan the stored results.""",
   why="""On the job, 'the model ignored the tool' is often a mismatched id after a refactor, a streaming stitch bug, or a LangChain adapter that renamed the field. Interviewers will ask how you return a result. They want the id, the role, and the sentence that parallel calls require one result per id. They may ask what you store for audit: the id, the name, the arguments you actually executed (after validation), and the result.""",
   how="""After execute:

```
messages.append(assistant_tool_call_message)  # includes id=call_abc
messages.append({role: tool, tool_call_id: call_abc, content: json.dumps(result)})
```

Example. Two calls: `call_1 get_order(ORD-1)`, `call_2 get_order(ORD-2)`. You return two tool messages. Swap the ids and the model will cite ORD-1's status for ORD-2.

On a retry of the *model* call, reuse the stored results and their ids; do not re-execute. On a retry that re-asks the model from scratch, new ids will arrive — do not attach old results to new ids.""",
   fails="""1. **One result, two calls.** The second request is answered with silence or a guess.

2. **Reusing an old id after a new completion.** The vendor 400s or the model ignores you.

3. **Huge results.** You blow the window and the next completion is garbage.

4. **String-matching on tool name only.** Two get_order calls collapse.""",
   line="""Every tool result carries the exact call id the model issued. I return one result per id, I keep payloads small, and I never attach a stored result to a newly generated id.""",
   kps=[
    "Match each result to the tool-call id the model generated.",
    "Parallel calls to the same tool are distinguished by id, not name.",
    "Persist ids with history; do not regenerate them on replay.",
    "Keep result payloads small and structured.",
    "Do not attach an old result to a new completion's ids.",
    "Audit the id, the executed args, and the result together.",
   ],
   qs=[
    {"q": "Why do tool results need the model's call id?", "a": "So the model can pair each result with the request it made. Names are not unique when the same tool is called twice. Wrong or missing ids cause ignores or vendor 400s.", "kind": "recall"},
    {"q": "Two get_order calls come back; you return one combined blob. What goes wrong?", "a": "The model cannot tell which status belongs to which id. Return one result message per call id, even if you executed them in one batch internally.", "kind": "debug"},
    {"q": "You retry a timed-out model call that had already produced tool calls you executed. What ids do you use?", "a": "Reuse the stored assistant tool-call message and the stored results with their original ids. Do not re-execute, and do not mint new ids for old results.", "kind": "apply"},
    {"q": "How big should a tool result be?", "a": "Small enough to leave room for the next completion: a structured object or a short excerpt, not a raw HTML dump. Paginate or summarise server-side if the source is large.", "kind": "apply"},
    {"q": "What do you persist for an audit of a tool turn?", "a": "Trace id, tool-call id, name, the arguments you actually executed after validation, the result (or a redacted form), and who authorised it.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask to see a fixture with two parallel get_order calls and the exact messages appended. If results are keyed only by tool name, reject. Ask what happens to those ids on a retry.",
  ),
  "provider-apis-vs-langchain-tools": note(
   what="""You should implement tool calling on the **raw provider API** and know how **LangChain** represents the same loop. Raw: you send a `tools` array (JSON Schema), you read `tool_calls` on the assistant message, you execute, you append `role=tool` messages, you call again. LangChain: you bind tools (`bind_tools` / `@tool`), you get `AIMessage.tool_calls`, you run a `ToolNode` or your own executor, you append `ToolMessage`s. Underneath, it is the same protocol.

The framework can hide the second HTTP call inside `create_agent` or an executor. That is convenience. You still must know it happens, still must cap it, still must validate arguments. If you only know the decorator, you cannot debug a missing ToolMessage.

Portability note: tool-call JSON shape differs slightly by vendor. The adapter translates. When it fails, you read the raw request.""",
   why="""On the job you will inherit both styles, sometimes in one repo. Interviewers will ask you to write the raw loop on a whiteboard and then say how LangChain wraps it. They want the mapping, not a brand. They will also ask when to skip the executor abstraction: when you need custom auth, custom parallelism, or a clearer trace.

This is M2.3's raw-vs-library comparison applied to tools.""",
   how="""Write the raw loop for `get_order` in twenty lines. Then write the LangChain version with `@tool` and an agent or a manual two-step invoke. Assert the same tests. Print both HTTP bodies once.

Example. Raw OpenAI: `tools=[{type:function, function:{name, parameters}}]`. LangChain: `model.bind_tools([get_order])`. Both should send a function schema. If LangChain sent a different required set, you found a drift; fix the shared schema.

Do not use a fully autonomous agent runner for a one-tool fetch. Manual loop is easier to cap and to auth.""",
   fails="""1. **Only knowing the decorator.** You cannot find the second call in an incident.

2. **Agent runner with no cap.** Same unbounded loop, prettier name.

3. **Schema drift** between the raw test and the LangChain tool.

4. **Assuming ToolNode authorises.** It calls your function; you still check the user.""",
   line="""I can write the tool loop on the provider API and map it onto LangChain's bind_tools and ToolMessage. The protocol is the same; I still validate, authorise, and cap, whichever wrapper I use.""",
   kps=[
    "Raw API and LangChain implement the same propose-execute-return protocol.",
    "Know where the second HTTP call lives in both styles.",
    "Share one schema; do not let the decorator drift from the raw test.",
    "A ToolNode is an executor, not an authoriser.",
    "Skip an agent runner when a manual two-step loop is enough.",
    "Read the raw request when the adapter mis-shapes a tool.",
   ],
   qs=[
    {"q": "Map a raw tool loop onto LangChain objects.", "a": "tools array becomes bind_tools or @tool. Assistant tool_calls become AIMessage.tool_calls. Your execute plus role=tool becomes a ToolMessage (or ToolNode). The next complete() is the next invoke. Caps and auth stay yours.", "kind": "recall"},
    {"q": "An agent executor spins on one tool for a minute. What do you check?", "a": "The iteration cap, whether ToolMessages were appended, and whether your function is throwing in a way the agent interprets as retry. Then consider replacing the executor with a manual loop you can see.", "kind": "debug"},
    {"q": "When would you refuse create_agent for a feature?", "a": "One or two known tools, a required auth check, and a need for a short trace. A manual loop is fewer moving parts. Use an agent runner when the graph is actually unknown.", "kind": "apply"},
    {"q": "How do you catch schema drift between raw and LangChain tools?", "a": "One shared schema object and a test that dumps both request bodies. Diff the name, required, and types. Do not copy the schema into the decorator by hand.", "kind": "apply"},
    {"q": "Does ToolNode replace your permission check?", "a": "No. It invokes your callable. The callable (or a wrapper around it) must still authorise against the session.", "kind": "recall"},
   ],
   links=[OA_TOOLS, LC_TOOLS, AN_TOOLS],
   review="Ask them to write the raw messages array on the board, then the LangChain equivalents. If they cannot find the second HTTP call in the framework path, they do not own the loop. Ask where auth lives.",
  ),
  "sequential-repeated-parallel-calls": note(
   what="""Models will ask for tools in three patterns you must handle. **Sequential**: the second call needs the first result (`get_order` then `refund` with the amount you just fetched). **Repeated**: the same tool twice with different arguments (`get_order` for ORD-1 and ORD-2). **Parallel**: several independent calls in one assistant message, which you can execute concurrently.

A fourth pattern is **dynamic**: the model decides the next tool after seeing a result. That is still your loop with a cap, not an excuse to drop authorisation. Frameworks that 'run tools in parallel' will happily parallelise two refunds you wanted sequenced. You decide which names are parallel-safe.

Independence is a property of **side effects**, not of names. Two reads are usually parallel-safe. Two writes often are not.""",
   why="""On the job, a parallel refund-plus-cancel can race. A sequential assumption that you always execute in list order can add 800ms for two independent reads. Interviewers will ask how you handle multiple tool_calls in one message. They want: match by id, parallelise only if side-effect safe, sequence when the second needs the first, and never assume the SDK order is a transaction.

They may also ask what you do if one parallel arm fails: fail the turn, or return the success plus a structured error for the failed id.""",
   how="""Classify tools at registration: `read` vs `write`. Reads in one message → `asyncio.gather` with a bound. Writes → sequential, or refuse to run two writes in one turn without an explicit workflow.

Example. Message has `get_order(ORD-1)` and `get_policy(refund)`. Parallel. Next message has `refund(ORD-1)` — sequential after the user (or you) confirmed. If a message ever contains two `refund`s, run them sequentially under one lock per order id, or reject and ask the model to do one.

Repeated `get_order` with the same id in one turn: return the cached result for the second id rather than hitting the DB twice, still as two tool messages.""",
   fails="""1. **Parallel writes.** Double charge, last-write-wins, or a partial cancel.

2. **Forcing everything sequential.** p95 dies on independent reads.

3. **One failure kills the silent others.** You drop a successful get_order because get_policy 500'd, and the model retries both.

4. **Treating list order as a transaction.** It is not atomic unless you make it so.""",
   line="""I match calls by id, I parallelise independent reads, I sequence writes, and I return one result per id even when one arm fails. Parallel is a side-effect decision, not a default.""",
   kps=[
    "Handle sequential, repeated, and parallel tool calls on purpose.",
    "Parallelise only side-effect-safe (usually reads).",
    "Sequence or lock writes; list order is not a transaction.",
    "One result per id even if an arm fails.",
    "Repeated identical reads can reuse a cache but still return two messages.",
    "Register tools as read or write so the executor can decide.",
   ],
   qs=[
    {"q": "A single assistant message contains two get_order calls and one refund. How do you run them?", "a": "Run the two reads concurrently (or sequentially if you prefer), do not run the refund in parallel with anything that touches the same order, then return three results keyed by id. Prefer refusing a write bundled with unrelated work if you cannot reason about the race.", "kind": "apply"},
    {"q": "Why is executing tool_calls in array order not enough for writes?", "a": "Order is not atomicity. Two writes can still overlap with other requests. Use a per-resource lock or a real workflow, and do not assume the model intended a transaction.", "kind": "recall"},
    {"q": "One of two parallel reads fails. What do you send the model?", "a": "A success result for the id that worked and a structured error for the id that failed. Do not invent the missing payload and do not hide the success.", "kind": "debug"},
    {"q": "When is gather() the wrong executor?", "a": "When two tools write, or when the second needs the first's output. gather() is for independent reads. Sequential or a workflow is for the rest.", "kind": "apply"},
    {"q": "The model calls get_order(ORD-1) twice in one turn. What do you do?", "a": "Execute or cache once, but still return two tool messages with the two call ids so pairing stays correct.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask which tools are marked write and whether two of them can run in one gather. If the answer is yes, reject. Ask to see one-failure fixtures: one arm 500, the other 200.",
  ),
  "tool-failures-malformed-arguments": note(
   what="""The model will send **malformed arguments** and tools will **fail**. Your executor must assume both. Malformed: missing keys, wrong types, extra keys, strings that do not match a pattern, an enum you do not have. Failed: timeouts, 404s, 409s, permission denials, downstream 500s. None of these should crash the worker or look like a successful side effect.

Handle malformed **before** the side effect: schema validate, then business-validate (id exists, user owns it). Return a structured error the model can correct (`invalid_args`, with the validator text) or stop the loop if the model is repeating the same bad args. Handle tool failures **after** you tried: map them to `not_found`, `denied`, `retryable`, `fatal`. Only `retryable` is a candidate for one automatic retry — of the **tool**, not of a write you are unsure about.

Never assume an invocation is executable because the model asked.""",
   why="""On the job, an unhandled exception in a tool turns a chat into a 500 page, or worse, a retry that double-writes. Interviewers will ask what you do with bad arguments. They want validate-then-refuse, not a crash, and they want the model to see a short error rather than a stack trace. They will also ask whether you retry a 500 from billing: once, idempotently, and never on a 409 that says already refunded.""",
   how="""Executor skeleton:

1. Parse JSON (after the stream completes).
2. Schema validate → on fail, return `invalid_args` + messages, do not call the API.
3. Business validate (exists, ACL) → on fail, return `denied` or `not_found`.
4. Call the API with a timeout and an idempotency key for writes.
5. Map the outcome to a small object.

Example. Args `{order_id: "please"}`. Schema fails. You do not hit billing. The model may repair. Second try `{order_id: "ORD-9"}` but ORD-9 is another user's. You return `denied` without leaking that the order exists if your policy says so. A 503 from billing: one retry with the same idempotency key, then `retryable` to the model or a human handoff.""",
   fails="""1. **Crashing the worker** on parse errors. One bad argument takes down the chat process.

2. **Retrying a 409 already-refunded.** You confuse the model and the user.

3. **Echoing raw downstream HTML.** Prompt injection and leaked internals.

4. **Treating invalid_args as a vendor 503.** You apply the wrong retry map.""",
   line="""I assume arguments are bad and tools fail. I validate before any side effect, I map failures to a small error object, I retry writes only when idempotent, and I never crash the worker on a bad proposal.""",
   kps=[
    "Validate arguments before the side effect; never assume they are executable.",
    "Map tool failures to not_found, denied, retryable, or fatal.",
    "Do not crash the worker on parse errors.",
    "Retry writes only with an idempotency key; do not retry 409s.",
    "Return short structured errors, never stack traces or HTML.",
    "invalid_args is a schema problem, not a transport 503.",
   ],
   qs=[
    {"q": "What do you do when tool arguments fail the schema?", "a": "Do not call the downstream API. Return a structured invalid_args error with the validator text so the model can repair once. If it repeats, stop the loop. Do not crash.", "kind": "recall"},
    {"q": "Billing returns 409 already refunded. Should you retry?", "a": "No. Return a structured already_done to the model and treat the user-facing outcome as success-or-explain, not as a transient error. Retrying a 409 can confuse ledgers.", "kind": "debug"},
    {"q": "How do you retry a 503 on a write tool?", "a": "Once, with the same idempotency key and a timeout, then give up to the model or a human. Without a key, do not retry; you may double-write.", "kind": "apply"},
    {"q": "Why not return the downstream HTML error page to the model?", "a": "It wastes the window, can contain injection, and leaks internals. Map it to a short code the model can narrate.", "kind": "apply"},
    {"q": "A teammate retries invalid_args with the M2.9 transport map. What is wrong?", "a": "Bad arguments will not heal with time. That map is for 429/503. Schema failures need repair or reject, not backoff.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask to see the invalid_args path and a 409 path in tests. If unhandled exceptions escape the executor, reject. Ask which writes have an idempotency key.",
  ),
  "tool-choice-auto-vs-required-vs-none": note(
   what="""Providers let you constrain **whether** a tool may be called this turn. Typical settings: **auto** (the model may call a tool or answer in text), **required** / `any` (it must call at least one tool), **none** (it must not), and sometimes a **forced function name** (it must call this one). These are turn-level policies, not permissions. `required` does not authorise a refund; it only forbids a bare-text shrug.

Use **auto** for mixed turns ('answer if you know, look up if you do not'). Use **required** when the product contract is 'this turn must hit the catalogue' — a price check, a retrieval, a form lookup. Use **none** when you want a draft or a summary and a tool would be a side-effect risk. Use a forced name when the router already decided `get_order`.

Wrong settings are common bugs: auto on a 'must look up' turn produces confident guesses; required on a chitchat turn forces a nonsense call; none on a price turn invents a number.""",
   why="""On the job, tool_choice is how you stop a billing bot from estimating a price from memory. Interviewers will ask when you force a tool versus when you forbid one. They want: required when the turn is worthless without the call, none when a call would be dangerous or pointless, auto as the default, and forced name when a router already picked. They will ding 'we always use auto'.""",
   how="""Set it per feature, not globally.

Example. Price quote: `tool_choice=required` (or forced `get_price`). Chitchat / 'thanks': `none`. Support answer that might need an order: `auto`. After a tool just failed with `denied`, you may set `none` on the follow-up so the model apologises instead of retrying.

Log the setting. When users say 'it guessed the price', check whether that turn was auto.""",
   fails="""1. **Global auto.** Price turns hallucinate.

2. **Global required.** 'Hello' becomes a tool call with empty args.

3. **required as a security control.** The model must call `refund`; your executor still must refuse.

4. **Forgetting none after a dangerous failure.** The model retries the denied write.""",
   line="""tool_choice is a per-turn policy: auto by default, required when the turn is worthless without a call, none when a call would be wrong, forced name when a router already decided. It is not authorisation.""",
   kps=[
    "auto / required / none / forced-name are turn-level call policies.",
    "required means must call a tool, not may touch money.",
    "none stops side effects on draft or apology turns.",
    "Force a name when a router already picked the tool.",
    "Set the policy per feature; do not globalise auto.",
    "Log tool_choice so guessed prices can be diagnosed.",
   ],
   qs=[
    {"q": "What do auto, required, and none mean for tool calling?", "a": "auto lets the model call a tool or answer in text. required forces at least one tool call. none forbids tools this turn. A forced name requires that specific tool. None of these grant permission to execute.", "kind": "recall"},
    {"q": "A price bot invents a fare on auto. What do you change?", "a": "Set tool_choice to required or force get_price on that feature so a turn without a lookup is invalid. Still validate the result. Do not 'prompt harder' first.", "kind": "debug"},
    {"q": "When do you set none?", "a": "Drafts, summaries, apologies after a denied write, and any turn where a tool would be a side-effect risk or a waste. Also when you already have the data and only need prose.", "kind": "apply"},
    {"q": "Why is required not a security boundary?", "a": "It only forces a proposal. Your executor still authorises. A required refund call can still be denied — and must be.", "kind": "recall"},
    {"q": "A router already classified the intent as get_order. Which setting do you use?", "a": "Force the function name get_order (or required if you only have one tool). auto would let the model skip the lookup again.", "kind": "apply"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask which features set required versus none, and whether that is in code or only in a prompt. If everything is auto, ask them to name one feature that should not be. Confirm they do not treat required as auth.",
  ),
  "interview": note(
   what="""**Interview: draw the tool loop** is a 90-second diagram: **model proposes**, **your code executes**, **you return a tool result**, **model finishes**. You label the second HTTP call, the call id, the cap, and the authorisation box inside execute. If you draw User → Model → Answer and hang a tool off the side, you missed the protocol.

This is M2.5's exam. They are testing whether you have implemented the loop, not whether you have used a decorator.""",
   why="""Almost every live-coding or design interview that mentions tools starts here. Candidates who say 'the model calls the API' fail. Candidates who draw the four hops, mention ids, and mention a cap pass — even if they forget a vendor flag name. On the job this diagram is also how you onboard the next engineer onto the executor.""",
   how="""Talk while you box it:

1. User message.
2. Model → assistant tool_calls (id, name, args).
3. Your executor: validate, auth, run, cap.
4. Tool message(s) with those ids.
5. Model → user-visible text.
6. MAX steps around 2–5.

Say out loud: 'The model never holds the billing key. tool_choice can force a call; it cannot authorise one. I parse arguments only after the stream completes.' If they ask about parallel, you split reads and writes.""",
   fails="""1. **Stopping at execute.** You forgot the second model call.

2. **Model as executor.** Instant fail.

3. **No cap, no id.** You described a demo.

4. **No auth box.** You described a vulnerability.""",
   line="""Model proposes, my code executes after validate and auth, I return a result with the call id, the model finishes. I cap the loop. That is the whole drawing.""",
   kps=[
    "Whiteboard: propose, execute, result, second model call, answer.",
    "Label the call id, the cap, and the auth box.",
    "The model never executes the side effect.",
    "tool_choice is not authorisation.",
    "Mention parse-after-stream for arguments.",
    "A decorator-only story is not a loop.",
   ],
   qs=[
    {"q": "What four hops must appear on a tool-loop whiteboard?", "a": "Model proposes a tool call, your code executes (validate and auth), you return a tool result with the call id, the model is called again and produces the user-facing answer.", "kind": "recall"},
    {"q": "A candidate says the LLM calls refund via the SDK. How do you correct them?", "a": "The SDK delivers a proposal. Our process runs refund after checks. The model only sees the result we append. If the SDK has an auto-executor, that executor is still our process.", "kind": "apply"},
    {"q": "You drew the loop but omitted ids and a cap. What will they ask?", "a": "How parallel calls are paired and how you stop a cycle. Add call ids on the result messages and a MAX around the loop.", "kind": "debug"},
    {"q": "Where do you put authorisation on the diagram?", "a": "Inside the execute box, before the downstream API, using the session identity — not inside the model and not as tool_choice=required.", "kind": "apply"},
    {"q": "What one sentence closes the interview answer?", "a": "The model proposes, my code executes, I return a tool result, the model finishes — with a cap and an id on every result.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Time the drawing. If the second model call or the auth box is missing, they do not have the talking point. Ask a follow-up about two parallel get_order ids.",
  ),
 }
}
