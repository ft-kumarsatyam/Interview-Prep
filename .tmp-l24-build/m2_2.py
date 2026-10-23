from helper import note, OA_STREAM, AN_STREAM

NOTES = {
 "m2-2": {
  "rendering-output-incrementally": note(
   what="""**Streaming** means the provider sends tokens (or small chunks) as they are generated, instead of waiting for the full completion. Your client renders those chunks in a terminal or UI so the user sees words appear. The model is not faster in total; you have only moved the first visible byte earlier. HTTP-wise this is usually server-sent events or a chunked body; SDKs hide the framing behind an async iterator.

Streaming is a delivery choice, not a different model. The same prompt, the same logits, the same bill. What changes is time-to-first-token (TTFT) as the user experiences it, and the amount of state you must hold to assemble a complete message, handle a tool call, or cancel. If you buffer the entire stream and then paint once, you paid for streaming and threw away the benefit.

The UI contract is "show what you have, keep it replaceable". Early tokens can be a markdown prefix, a thought tag, or a tool-call fragment. Do not treat the first chunk as a finished answer.""",
   why="""On the job, streaming is what makes a 8-second answer feel alive. Product will demand it the week after you ship a spinner. It is also what breaks naive parsers: you cannot `JSON.parse` a half object, and you cannot fire a tool on a half name. Interviewers ask what streaming improves (perceived latency, not cost or accuracy) and how you render without lying that the answer is done.

Take-homes that block until the full body look unfinished even when the content is fine. Saying "we stream" without a cancel button looks unfinished in the other direction.""",
   how="""A terminal stream: for each event, append `delta` to a buffer and reprint the buffer. A web UI: write into a growing node, keep a "still generating" affordance until the iterator ends or the user cancels.

Example. A 400-token product description. Non-streamed, the user stares at a spinner for 6s then gets a wall of text. Streamed, the first token arrives at 400ms and the rest drip at ~60 tokens/s. Total time is still ~6s. Perceived wait collapses.

Do not stream into a toast that disappears. Do not disable the whole page. Do give a stop control that aborts the HTTP body. When the stream ends, run the same inspector you use for sync calls: finish reason, usage, tool calls.""",
   fails="""1. **Buffering then painting.** You implemented the SDK stream and still showed a spinner. Users get none of the benefit.

2. **Treating the first chunk as final.** A UI "locks in" the opening sentence and cannot correct a later token. Keep the buffer mutable until the iterator completes.

3. **Streaming into a parser.** `JSON.parse` on chunk 3 throws; you surface a false error. Accumulate, or use a streaming parser.

4. **No end state.** The iterator ends and the UI still says "thinking", or it never attaches the final usage row.""",
   line="""Streaming sends tokens as they are produced so the first visible output arrives sooner. Total time and cost stay about the same. I render a growing buffer, I do not parse early, and I run the same final inspector as a sync call.""",
   kps=[
    "Streaming improves time to first visible token, not total generation time.",
    "Cost and accuracy do not change just because you streamed.",
    "Render a growing, replaceable buffer until the iterator ends.",
    "Do not parse structured output on a partial stream unless you use a streaming parser.",
    "Share one final inspector with the non-stream path.",
    "A stop control that aborts the body is part of shipping streaming.",
   ],
   qs=[
    {"q": "What does streaming primarily improve, and what does it not?", "a": "It improves time to first visible output and perceived responsiveness. It does not shorten total generation time, does not cut token cost, and does not make answers more accurate.", "kind": "recall"},
    {"q": "A teammate streams events into an array and paints once at the end. What did they miss?", "a": "The whole point: incremental rendering. They still pay stream complexity and the user still sees a spinner. Paint on each delta (or every animation frame) from a growing buffer.", "kind": "debug"},
    {"q": "How do you keep a streamed markdown answer from looking broken mid-way?", "a": "Render the buffer as markdown on each tick, accept that headings and tables look incomplete until later tokens arrive, and keep a generating indicator so the user knows it is not final.", "kind": "apply"},
    {"q": "When do you run usage logging on a streamed call?", "a": "After the iterator completes (or is aborted). Many SDKs attach usage on the last event. Do not skip the inspector just because the path was a stream.", "kind": "apply"},
    {"q": "Why is the first chunk not a finished answer?", "a": "Later tokens can continue, revise framing, or turn into a tool call. The UI must treat the buffer as open until the stream signals completion or cancel.", "kind": "recall"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
  "ttft-perceived-latency": note(
   what="""Latency for a streamed call splits into pieces you should name. **TTFT** (time to first token) is the wait from request start until the first visible byte. **Generation speed** is tokens per second after that. **Total latency** is TTFT plus generation time (roughly output tokens / tok-per-sec). **Perceived latency** is what the user feels: a 400ms first token and a drip of text feels faster than a 6s spinner even when the wall clock is identical.

TTFT is dominated by queueing, auth, prompt processing (prefill), and the network. Long prompts, cold caches, and overloaded regions make TTFT worse without changing tokens-per-second. Generation speed is dominated by the model, the output length, and sometimes by how you consume the stream (a slow client can stall the sender).

Interviewers want the split. "The API is slow" is not a diagnosis. "TTFT is 3s because prefill on a 12k prompt, then 50 tok/s" is.""",
   why="""On the job you will be asked to make the chat "feel faster" without buying a bigger model. The cheap levers are usually: shrink or cache the prefix (TTFT), stream (perceived), and cap output length (total). Buying a faster SKU is the expensive lever. If you cannot name which number moved, you will buy the SKU and still have a 12k uncached prompt.

In interviews, drawing a timeline — send, first token, last token — is the senior move. Then you say which product metric you watch (p95 TTFT, p95 total) and that a stream that buffers internally has a hidden TTFT of "when we decided to flush".""",
   how="""Instrument three timestamps: request start, first delta, iterator end. Store them next to usage.

Example. Feature A: TTFT 2.8s, 80 tok/s, 200 output tokens, total ~5.3s. Feature B: TTFT 0.4s, 80 tok/s, 200 output tokens, total ~2.9s. Same model, same output. Feature A's system prompt includes a fresh timestamp, so the prefix never caches and prefill is huge. You fix the prefix; TTFT drops; you do not change model.

A second example: TTFT is fine, total is 20s because you asked for a 1_200-token essay. You cap `max_tokens` or ask for 200 words. Perceived latency also needs a first paint under ~500ms; if your UI batches deltas for 2s to "avoid flicker", you invented a second TTFT.""",
   fails="""1. **One number called latency.** You cannot tell prefill from decode from UI batching, so you buy the wrong fix.

2. **Watching only the mean.** A p50 TTFT of 400ms hides a p95 of 8s on cache misses.

3. **UI coalescing.** The SDK streamed; React batched 2s of updates. Users still wait. Measure first *paint*, not first socket byte, if you claim perceived latency.

4. **Ignoring prefill.** A 20k retrieval dump makes TTFT terrible. Streaming cannot hide a long prefill; the first token has not been computed yet.""",
   line="""I split latency into TTFT, tokens per second, and total, and I treat perceived latency as first paint plus a live stream. Long prompts hit TTFT; long outputs hit total. I measure p95, not a single 'it felt slow'.""",
   kps=[
    "TTFT is request start to first token; total adds generation time.",
    "Perceived latency is first paint plus a drip, not the wall-clock total.",
    "Long prompts and cache misses hurt TTFT (prefill); long outputs hurt total.",
    "Streaming does not shorten prefill; the first token still waits on the prompt.",
    "Watch p95 TTFT and p95 total, not only the mean.",
    "UI batching can invent a second, worse TTFT.",
   ],
   qs=[
    {"q": "Define TTFT, generation speed, total latency, and perceived latency.", "a": "TTFT is time to the first token. Generation speed is tokens per second after that. Total is TTFT plus decode time. Perceived latency is what the user feels: first paint and a live stream, which can be much better than total.", "kind": "recall"},
    {"q": "Same model, same output length, TTFT jumped from 0.4s to 3s. Where do you look?", "a": "Prefill: prompt size, a busted prefix cache (timestamp, reordered system prompt), queueing, or a cold region. Do not first swap the model or raise temperature.", "kind": "debug"},
    {"q": "Product wants the chat to feel faster without changing the model. Name two levers.", "a": "Stream so first paint is early, and shrink or cache the stable prefix to cut TTFT. Cap output length if total time is the complaint. Measure p95 before and after.", "kind": "apply"},
    {"q": "Why can streaming not hide a 20k-token retrieval dump?", "a": "The first token waits on prefill of the whole prompt. A huge dump delays TTFT. Streaming only helps after the first token exists. Trim or cache the dump.", "kind": "apply"},
    {"q": "Your socket gets a token at 300ms but the UI paints at 2.3s. What is the real TTFT for the user?", "a": "2.3s. Perceived TTFT is first paint. Find the UI batch or state update that swallowed two seconds of deltas.", "kind": "debug"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
  "accumulating-and-interrupting-streams": note(
   what="""A stream is a sequence of events. Your job is to **accumulate** them into one complete assistant message, and to **interrupt** cleanly when the user hits stop, the network dies, or you hit a timeout. Accumulation means concatenating text deltas, stitching tool-call fragments (id, name, arguments) in order, and knowing when the stream has ended versus when it was cut.

Interruption is not "close the tab and hope". You abort the HTTP body so the provider can stop generating (and, on many vendors, stop billing unused tokens), you freeze the buffer you have, you persist a partial with a `cancelled` or `incomplete` reason, and you do not pretend the partial is a successful structured object.

Network failures look like a hang or a reset. Treat a quiet socket beyond your timeout as an interrupt. Incomplete generations are a first-class state in the UI: "stopped", not "answered".""",
   why="""On the job, a stop button that only hides the spinner while the server keeps generating is a cost leak and a trust leak. Users hit stop because the answer went wrong; if tokens keep landing in your logs, you still pay and you may still execute a tool from a fragment you should have dropped.

In interviews, "how do you cancel a stream?" is a standard follow-up to "do you stream?". They want abort of the body, a persisted partial, no tool execution on an incomplete call, and an honest UI state. They also want you to say you assemble tool arguments only after that tool-call block completes.""",
   how="""Keep one accumulator per request id:

- `text` buffer
- `tool_calls[]` with per-call argument strings
- `finish` = `stop | length | tool_calls | cancelled | error`

On each event, append. On user stop: `controller.abort()`, set `finish=cancelled`, persist what you have, do not parse JSON, do not run tools. On socket error: same, with `finish=error`. On clean end: run the inspector.

Example. User stops at 80 tokens. You abort. The provider usage (if it arrives) shows ~80 completion tokens, not the 800 you would have taken. The UI shows the 80 tokens with a "stopped" badge. A retry is a new request id, not a resume of the aborted HTTP body (unless you deliberately implement continuation, which is a different feature).""",
   fails="""1. **Stop hides the spinner only.** The server continues. You pay, and a late tool call may still fire.

2. **Executing a tool from a partial.** Argument JSON is half-written. You throw or, worse, you execute with a truncated id.

3. **Dropping the partial.** The user wanted to edit what they saw. You wiped it. Persist cancelled text.

4. **No timeout on a quiet stream.** The iterator never ends; the worker lives forever. A quiet-socket timeout is an interrupt.""",
   line="""I accumulate deltas into one message and I interrupt by aborting the HTTP body, persisting a partial, and refusing to parse or run tools on incomplete data. Stop means cancelled, not success.""",
   kps=[
    "Accumulate text and tool-call fragments into one message object.",
    "Cancel aborts the HTTP body so generation and billing can stop.",
    "Persist partials with a cancelled or error finish reason.",
    "Never parse or execute tools on an incomplete stream.",
    "A quiet socket past the timeout is an interrupt, not a hang to ignore.",
    "A retry after cancel is a new request id, not a resumed body.",
   ],
   qs=[
    {"q": "What must happen when the user hits stop on a stream?", "a": "Abort the HTTP body, freeze the buffer, persist it with a cancelled reason, update the UI to 'stopped', and do not parse structured output or execute tools on the partial.", "kind": "recall"},
    {"q": "A stop button only sets React state to idle. The server keeps reading the stream. What is wrong?", "a": "You hid the spinner but did not abort. Tokens still generate and bill, and a late tool call can still run. Abort the fetch/controller from the same click.", "kind": "debug"},
    {"q": "How do you assemble a streamed tool call?", "a": "Concatenate argument fragments for that tool-call id until the block completes (or the stream ends with finish_reason=tool_calls). Only then parse JSON. Never parse on every delta.", "kind": "apply"},
    {"q": "The stream goes silent for 25s with no end event. What do you do?", "a": "Treat it as an interrupt: timeout, abort, persist an error/incomplete, and fail the turn. Do not wait forever for an iterator that will never finish.", "kind": "apply"},
    {"q": "Should you resume an aborted HTTP body when the user says 'continue'?", "a": "Usually no. Start a new request with the partial as assistant history and a 'continue' user line. Resuming a dead socket is not a feature; continuation is a new call.", "kind": "recall"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
  "backpressure-when-the-ui-is-slow": note(
   what="""A stream can produce tokens faster than a UI can paint, a websocket can forward, or a mobile radio can accept. **Backpressure** is how you refuse to become an unbounded buffer. If you `chunks.push(delta)` without a bound, a slow tab or a paused consumer turns your server into a memory leak — and after a disconnect you may still be holding megabytes of text you will never show.

Backpressure means the producer slows down or you drop/coalesce, on purpose. In a browser, that can be "apply the latest buffer once per animation frame" rather than once per token. On a server that fans a vendor stream out to a client, it means reading the vendor body at the rate the client accepts, or aborting if the client stalls past a budget. It does **not** mean storing the entire completion in RAM "so we can replay".

This is a systems note, not a React note. The failure is OOM and stalled workers, not an ugly typewriter.""",
   why="""On the job, the first streaming outage is often a slow consumer: a laptop tab in the background, a mobile app that lost focus, a log shipper that blocked. Interviewers who have run chat at scale will ask what happens if the UI is slow. "We buffer everything" is the wrong answer. "We coalesce, we bound the queue, we abort if the client stops reading" is the right one.

This also protects cost. If you keep reading a vendor stream into RAM after the user has gone, you still pay for those tokens. Abort when nobody is listening.""",
   how="""Pick a bound and a policy before you write the loop.

Example, server to browser via SSE:

1. Read vendor chunks.
2. Write to the client socket.
3. If the client socket's buffer is full, wait up to T ms.
4. If still full, abort the vendor body, mark the turn cancelled, and stop.

Example, browser paint: maintain one string buffer; schedule `requestAnimationFrame` to set innerText once. Do not create a 400-element array of React states, one per token.

A replay feature is a database row written at the end (or every N tokens to a capped blob), not an in-memory queue of every delta. If you need resume, persist incrementally with a size cap.""",
   fails="""1. **Unbounded array of deltas.** A 10k-token answer plus a stuck consumer blows memory. Bound it or collapse to a single buffer.

2. **Reading the vendor after the client left.** You pay for tokens nobody will see. Abort on disconnect.

3. **Per-token React state.** You jank the tab and still grow memory. Coalesce to a frame.

4. **"We'll need replay" as an excuse to buffer forever.** Replay is storage with a cap, not RAM.""",
   line="""I do not buffer an unbounded stream in memory. I coalesce paints, I bound queues, and I abort the vendor body if the client stops reading. Replay is a capped persist, not a growing array.""",
   kps=[
    "A slow UI plus an unbounded buffer is a memory leak.",
    "Coalesce updates (for example once per frame) instead of per token.",
    "On a fan-out server, write at the client's pace or abort.",
    "Disconnect should abort the vendor stream so you stop paying.",
    "Replay belongs in capped storage, not in a RAM queue of deltas.",
    "Backpressure is a bound and a policy, decided before the loop.",
   ],
   qs=[
    {"q": "What is backpressure in a streamed chat, in one sentence?", "a": "The consumer's slowness must limit how much you buffer or how fast you read, so a stuck UI cannot grow memory without bound.", "kind": "recall"},
    {"q": "A Node process OOMs after users background the tab. What is the likely bug?", "a": "The server kept reading the vendor stream into an unbounded buffer (or kept the connection) after the client stalled. Bound the queue and abort on a full/slow socket.", "kind": "debug"},
    {"q": "How would you paint a fast stream in the browser without per-token state?", "a": "Keep one string buffer, schedule a single animation-frame update, and write the latest buffer. Drop intermediate paints; the user needs the current text, not every historical delta.", "kind": "apply"},
    {"q": "The user closed the tab mid-stream. What should the server do to the vendor call?", "a": "Abort the HTTP body so generation stops and you stop billing. Then persist a cancelled partial if you already showed something.", "kind": "apply"},
    {"q": "Why is 'we buffer so we can replay' a weak design?", "a": "Replay is a durability feature and belongs in storage with a size cap. An in-memory delta list is unbounded and dies with the process.", "kind": "recall"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
  "partial-json-during-streaming": note(
   what="""Structured outputs and tool arguments often arrive as JSON **in pieces**. `{"order_id": "A1` is not a value. `JSON.parse` on a partial throws or, with sloppy recoverers, invents a close-brace and a wrong type. The rule: **do not parse an object until the stream (or that tool-call block) completes**, unless you use a real streaming JSON parser that exposes only fully-closed values.

Partial JSON is also a UX temptation. Teams want to fill form fields as keys arrive. That is fine for display if you treat values as unconfirmed. It is not fine for side effects: do not hit an API with an `order_id` you saw in chunk 4 when chunk 5 might have continued the string.

Provider SDKs that stream tool calls typically give you `arguments` as a growing string per `tool_call_id`. Concatenate. Parse once. Validate against the schema. Then execute.""",
   why="""On the job, the first tool-calling bug after you add streaming is a parser exception on every turn, or a charge against `ord` instead of `order_123`. Interviewers will ask when you parse streamed arguments. "On every delta" is the fail. "After the tool-call block completes, then validate" is the pass. They may also ask how you show a streaming form without committing.

This note is the sibling of schema-constrained generation in M2.4. Streaming does not relax validation; it delays the moment you are allowed to try.""",
   how="""Two legal paths:

1. **Wait.** Buffer the argument string. On `finish_reason=tool_calls` (or the vendor's "tool call done" event), `JSON.parse`, then schema-validate, then run the tool.
2. **Streaming parser.** A parser that emits a key only when its value is closed. Use it for UI previews. Still run a full schema validate before side effects.

Example. Deltas: `{"`, `sku`, `": "`, `NX-`, `14",`, `"qty": `, `2}`. After the last delta you parse `{sku: "NX-14", qty: 2}` and check types. If you had parsed at `NX-` you would have thrown or shipped `sku="NX-"`.

For user-visible JSON answers (not tools), the same rule applies before you insert a row. Showing pretty-printed partial text is OK; committing it is not.""",
   fails="""1. **Parse on every delta.** Exceptions on every turn, or worse, recovered wrong values.

2. **Side effect on a preview.** The UI showed `qty: 2` early and you called `place_order` before the stream ended. A later token changed `qty`.

3. **Concatenating across tool-call ids.** Two parallel calls; you merged argument strings. Parse per id.

4. **Assuming the last chunk is complete JSON.** The stream can end with `length`. That is a truncated object — reject, do not close the braces yourself.""",
   line="""I concatenate streamed JSON and parse only when that object is complete, then I validate. Previews may paint partial keys; side effects wait. I never invent a closing brace on a `length` stop.""",
   kps=[
    "Partial JSON is not a value; do not parse it with JSON.parse.",
    "Concatenate per tool-call id; parse once the block completes.",
    "A streaming parser is for previews, not for skipping validation.",
    "Never execute a side effect on a preview value.",
    "A finish_reason of length on JSON is a truncated object — reject it.",
    "Do not merge argument strings across parallel tool-call ids.",
   ],
   qs=[
    {"q": "When should you JSON.parse streamed tool arguments?", "a": "After that tool-call's argument stream is complete (or the whole response finishes with tool_calls). Then validate against the schema. Not on every delta.", "kind": "recall"},
    {"q": "Your tool throws `Unexpected end of JSON input` on most streamed turns. What is wrong?", "a": "You are parsing the growing arguments string before the block finished. Concatenate until completion, then parse once.", "kind": "debug"},
    {"q": "You want a form to fill as keys arrive. What is safe, what is not?", "a": "Safe: paint unconfirmed values from a streaming parser or a partial string. Not safe: calling an API or writing a database row until the object is complete and schema-valid.", "kind": "apply"},
    {"q": "The stream ends with finish_reason=length in the middle of a JSON object. What do you do?", "a": "Reject. Do not close braces yourself. Retry with a shorter output, a higher cap, or schema-constrained generation that cannot overflow the same way.", "kind": "apply"},
    {"q": "Two tool calls stream in parallel. How do you buffer arguments?", "a": "One growing string per tool-call id. Parse each separately when that id's arguments are done. Never concatenate across ids.", "kind": "recall"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
  "interview": note(
   what="""**Interview: cancel a stream cleanly** is a 60-second spoken sequence: **abort the HTTP body**, **stop billing as soon as the user hits stop**, **persist a partial as cancelled**, **do not parse or run tools**. You may mention the AbortController, a quiet-socket timeout, and backpressure. You may not say "we just hide the spinner".

This is M2.2's exam question. Streaming without cancel is a demo. Streaming with abort, a finish reason, and no side effects on a partial is a product.""",
   why="""Interviewers ask this because it combines UX, cost, and correctness. They have seen stop buttons that do nothing on the server. They want to hear that tokens and tools stop, not only pixels. On the job it is also the difference between a $0.002 stop and a $0.08 completion the user already rejected.

If they follow up, they will ask about partial JSON and backpressure. Have those sentences ready.""",
   how="""Say this while you box it:

1. User clicks Stop.
2. Client aborts the fetch; server sees disconnect.
3. Server aborts the vendor stream (same request id).
4. Accumulator freezes; `finish=cancelled`; persist text.
5. UI shows "stopped". No `JSON.parse`. No tool. Usage row written if the vendor sent one.

Close with: "I abort the body so we stop paying, and I never execute a tool from a half-written argument string." If they ask about continue, you start a **new** request with the partial as history.""",
   fails="""1. **UI-only stop.** The vendor keeps generating. Instant ding.

2. **Executing the tool anyway.** You "did not want to lose the work". You charged a card on a cancelled turn.

3. **No persisted partial.** The user cannot edit what they saw.

4. **Confusing cancel with a 500.** The UI shows an error toast instead of "stopped". Different state.""",
   line="""Cancel means abort the HTTP body, stop billing, persist a cancelled partial, and refuse to parse or run tools. The spinner going away is not cancel.""",
   kps=[
    "Abort the vendor body on stop so generation and billing halt.",
    "Persist the partial with finish=cancelled, not success.",
    "No parse, no tools, on an incomplete stream.",
    "Continue is a new request, not a resumed socket.",
    "A stop button that only updates UI is a cost leak.",
    "Mention a quiet-socket timeout as a second interrupt path.",
   ],
   qs=[
    {"q": "Walk the cancel path in four steps.", "a": "Client abort, server abort of the vendor body, persist a cancelled partial, skip parse and tools. Write usage if you have it and show a stopped state in the UI.", "kind": "recall"},
    {"q": "Why does aborting the body matter for the bill?", "a": "Many providers stop generating (and stop charging unused tokens) when the client disconnects. If you keep reading, you pay for an answer the user already rejected.", "kind": "apply"},
    {"q": "The stop handler sets `isLoading=false` and returns. What did they forget?", "a": "Aborting the in-flight HTTP request and telling the server to abort the vendor stream. The model may still run and a tool may still fire.", "kind": "debug"},
    {"q": "User hits stop, then types 'continue'. How do you implement that?", "a": "New request id. Send the cancelled partial as assistant history plus a continue instruction. Do not try to resume the aborted socket.", "kind": "apply"},
    {"q": "What finish reason do you store on a user stop?", "a": "cancelled (or equivalent), never stop or success. That keeps evals and billing honest and prevents a parser from treating a partial as a record.", "kind": "recall"},
   ],
   links=[OA_STREAM, AN_STREAM],
  ),
 }
}
