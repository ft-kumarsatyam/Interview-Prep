from helper import note, OA_API, AN_MSG

NOTES = {
 "m2-9": {
  "common-api-failures": note(
   what="""LLM calls fail in boring, named ways. **401/403**: bad or expired key, wrong scope. **400**: your request is illegal (schema, context length, role sequence). **429**: rate limit. **5xx / 503**: vendor sick. **Network / timeout**: you never got a body. **Context-limit**: prompt too large (sometimes a 400 with a specific message). **Malformed output**: HTTP 200 but JSON or a tool call you cannot parse. **Content filter / refusal**: 200 with a finish reason that is not `stop`.

You must recognise these as different species. They do not share a retry policy. Treating all of them as 'try again' is how you loop on a bad key or a too-long prompt until the budget dies.

Log the species, not only 'error=true'.""",
   why="""On the job, the first on-call week is this list. Interviewers will ask you to name failure modes and one action each. They want this inventory, then the next note's retry map. A candidate who says 'sometimes the API fails' has not operated a client.""",
   how="""Write a table in the wrapper: status or exception → species → action. Example: 401 → fail fast, page secrets. 400 context → shrink history, do not retry the same body. 429 → backoff. 503 → backoff. Timeout → retry once if the request id says it is safe. 200 + bad JSON → repair/reject (M2.4), not transport retry.

Keep an example payload per species in the playbook so the next hire does not confuse a refusal with an empty bug.""",
   fails="""1. **One catch-all retry.** 401 becomes a 10-second hang.

2. **Ignoring 200-malformed.** Users see blank bubbles.

3. **Not reading the error body.** A 400 that said context_length looks like a mystery.

4. **No species in the log.** You cannot graph 429 vs 400.""",
   line="""I name the failure: auth, bad request, rate limit, vendor 5xx, timeout, context limit, malformed output, or refusal. Each species has its own action. I do not retry them as one pile.""",
   kps=[
    "Inventory: 401, 400, 429, 5xx, timeout, context, malformed, refusal.",
    "Species do not share a retry policy.",
    "200 can still be a failure (malformed or refused).",
    "Read the error body; log the species.",
    "Context-limit is a shrink problem, not a backoff problem.",
    "A catch-all retry hides a bad key.",
   ],
   qs=[
    {"q": "Name six LLM API failure species and one action each.", "a": "401 fail-fast and fix the key; 400 read the body and fix the request; 429 backoff; 503 backoff; timeout retry if safe; context-limit shrink history; malformed 200 repair or reject; refusal show a canned decline.", "kind": "recall"},
    {"q": "A 400 says context_length_exceeded. Do you backoff?", "a": "No. The same body will fail again. Shrink or summarise history, drop retrieval, or split the task. Backoff is for 429/503.", "kind": "debug"},
    {"q": "Why is HTTP 200 not enough to call a turn successful?", "a": "Finish reason may be length or refusal, or the body may be unparseable. Inspect the response object before you accept.", "kind": "apply"},
    {"q": "What do you log besides error=true?", "a": "The species (status, finish reason, exception class), request id, model, and a short body snippet or code. Graphs need a dimension, not a boolean.", "kind": "apply"},
    {"q": "A teammate retries every exception for 30s. What species does that punish?", "a": "401, 400, and context-limit: they cannot heal with time. You also delay the user and burn the worker.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask them to list species without looking. If they only say timeout and 500, the inventory is thin. Ask what they do on a 200 with empty content.",
  ),
  "what-to-retry-and-what-to-fail-fast": note(
   what="""**Retry** what is **transient**: 429, 503, some 500s, connection resets, timeouts when you do not know if the call landed (and you have an idempotency story). **Fail fast** what is **your bug or a permanent no**: 401/403, 400 (including context length and bad schema), 404, most refusals. Retrying a 401 will not mint a valid key. Retrying a 400 will not shrink the prompt.

The map belongs in the wrapper, documented, with a cap. 'Retry everything three times' is not a map. Tool-level failures have their own map (M2.5): `retryable` vs `denied`. Do not feed a denied tool into the transport retry.

When in doubt, fail fast on writes you cannot make idempotent.""",
   why="""On the job, this map is the difference between a blip and a self-inflicted outage. Interviewers will ask which statuses you retry. They want 429/503 yes, 400/401 no, and a sentence about writes. They will ding a universal retry. This is the most practical robustness question in Level 2.""",
   how="""Publish the map:

- Retry: 429, 503, timeout (if request id / no side effect).
- Fail fast: 400, 401, 403, 404, 422, schema/context errors.
- Case-by-case: 500 (once), 408.

Example. Chat 429 → wait + jitter, retry once or twice. Chat 401 → page, do not retry. Extract 400 context → summarise, new request, not a retry of the same bytes. Refund timeout → check ledger by idempotency key before any retry.

Unit-test the map: mock each status, assert attempt count.""",
   fails="""1. **Retry 401.** You hide a secrets incident for 30s.

2. **Retry 400 context.** You loop until timeout.

3. **Retry a write with no key.** Double charge.

4. **Map only in someone's head.** A new feature retries everything.""",
   line="""I retry 429 and 503 (and safe timeouts). I fail fast on 400 and 401. Writes retry only when idempotent. The map is in the wrapper and in tests.""",
   kps=[
    "Retry transient: 429, 503, some timeouts.",
    "Fail fast: 401, 400, context-limit, most refusals.",
    "Writes need an idempotency story or they do not retry.",
    "Tool denied is not a transport retry.",
    "The map is code plus tests, not folklore.",
    "When in doubt on a write, fail fast.",
   ],
   qs=[
    {"q": "Which statuses do you retry, and which do you fail fast?", "a": "Retry 429 and 503, and timeouts when safe. Fail fast on 400, 401, 403, and context-limit. A 500 may get one try. Writes need an idempotency key to retry.", "kind": "recall"},
    {"q": "The wrapper retries a 401 three times. What should have happened?", "a": "Fail fast and page the key. Retries delay the signal and cannot succeed. Fix the secret, do not wait.", "kind": "debug"},
    {"q": "A refund times out. Do you retry the HTTP call immediately?", "a": "First check the ledger with the idempotency key. If it landed, do not call again. If you have no key, do not retry; look up or hand off.", "kind": "apply"},
    {"q": "Why is context_length a fail-fast even though it is often a 400?", "a": "The identical body will fail again. You must change the prompt. That is a new request, not a retry.", "kind": "apply"},
    {"q": "Where does the map live?", "a": "In the client wrapper, with unit tests per status, and in a short doc. Not only in a Slack thread.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask them to fill a status → action table on the board. If 401 is retried, fail the review. Ask about a write timeout specifically.",
  ),
  "backoff-jitter-timeouts-degradation": note(
   what="""When you do retry, you wait **exponentially** longer (0.5s, 1s, 2s…), you add **jitter** (randomised delay) so a herd does not retry in lockstep, you set a **maximum attempt count**, and you set a **request timeout** so a hung socket is a failure, not a zombie. **Graceful degradation** is what the user sees when you give up: a cached answer, a smaller model, a 'try again' card, a human queue — not a stack trace and not an infinite spinner.

Timeouts are part of robustness, not an afterthought. A 60s hang is a worse user experience than a 2s fail and a degrade. Pick timeouts from the product (interactive 15–30s) not from the SDK default.

Jitter matters more than the exact curve. Synchronised retries are a second stampede.""",
   why="""On the job, the first 429 storm is un-jittered retries. Interviewers will ask you to describe backoff. They want exponential + jitter + cap + timeout + a degrade path. They will ding 'we wait a second and try again' with no cap. They will also ask what the user sees after the last attempt.""",
   how="""Wrapper: `for attempt in 1..MAX: try with timeout T; on retryable: sleep(exp(attempt) * uniform(0.5, 1.5)); else: break`. After MAX: degrade.

Example. Chat: T=20s, MAX=2 retries on 429/503. After that, show 'the assistant is busy' and offer retry in the UI (a new request id). Evals: T=60s, MAX=3, then mark the item failed and continue the chunk.

Degrade options: skip optional retrieve, use a smaller model that still matches the schema, or return a safe default. Do not degrade a refund to 'assume it worked'.""",
   fails="""1. **No timeout.** Workers pile up.

2. **No jitter.** Retry storms.

3. **No MAX.** A 10-minute turn.

4. **Degrade that lies.** A fake success on a write.""",
   line="""Retries use exponential backoff, jitter, a cap, and a hard timeout. After the last attempt I degrade honestly — a busy card, a smaller model, a failed eval row — never a fake write.""",
   kps=[
    "Exponential backoff plus jitter plus a max attempt count.",
    "A hard timeout on every attempt.",
    "Jitter prevents lockstep retry storms.",
    "Degrade after the cap: honest fallback, not a spinner.",
    "Interactive timeouts are product numbers, not SDK defaults.",
    "Never degrade a write into a fake success.",
   ],
   qs=[
    {"q": "What four knobs belong on a retry?", "a": "Exponential delay, jitter, a maximum attempt count, and a per-attempt timeout. After the cap, a planned degrade path.", "kind": "recall"},
    {"q": "All clients retry at 1s, 2s, 4s with no jitter. What happens after a 503?", "a": "They collide again at those marks and 503/429 again. Jitter spreads the herd. The bound (semaphore) reduces how large the herd is.", "kind": "debug"},
    {"q": "What is an honest degrade for a chat turn versus a refund?", "a": "Chat: a busy message or a smaller model that still validates. Refund: do not claim success; look up the ledger or hand off. Writes cannot degrade to fiction.", "kind": "apply"},
    {"q": "The SDK default timeout is 10 minutes. What do you set for interactive chat?", "a": "A product number like 15–30s. A hung 10-minute worker is worse than a fast fail and a retry button.", "kind": "apply"},
    {"q": "Why is a timeout a robustness feature?", "a": "It turns a hang into a species you can retry or degrade. Without it, the failure is an invisible stuck worker.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask for T, MAX, and jitter in the same sentence. Ask what the UI shows after the last attempt. A 10-minute SDK timeout on chat is a reject.",
  ),
  "model-and-provider-fallbacks": note(
   what="""A **fallback** is a second model or provider you call when the first is unavailable or over budget — not when you feel like A/B testing. The fallback must **preserve the contract**: same schema, same tool names, same refusal policy, or you must feature-flag the difference. A cheaper model that cannot emit your JSON is not a fallback; it is a different product.

Fallbacks have a reason: 503 storm, timeout budget blown, primary over TPM. They are not 'always race two vendors' unless you have measured that and can afford it. They need their own rate limit, their own eval, and a log field `served=primary|fallback`.

Quality will differ. Say so. A fallback that is 8 points worse on the golden set is a degrade, and the UI or the workflow may need to drop optional steps.""",
   why="""On the job, the first vendor incident is when you discover your 'fallback' was never tested. Interviewers will ask how you fail over. They want: same schema, an eval, a reason to switch, and a way back. They will ding a silent swap to a model that cannot call tools. This is robustness, not model shopping.""",
   how="""Config: `primary=X, fallback=Y, trigger=503|timeout|429-exhausted`. Example. Primary structured-output model 503s. Fallback is a smaller model you already eval'd at −2% task_ok with the same schema. You switch for 15 minutes, log `served=fallback`, keep the schema. You do not switch to a model that only returns prose.

Do not fallback on 400 — that is your bug. Do not fallback a refund to a model you have not authorised for writes.

A weekly eval on the fallback is the price of claiming you have one.""",
   fails="""1. **Untested fallback.** It 400s on the schema during the outage.

2. **Different contract.** Tools vanish; the executor crashes.

3. **Fallback on 400.** You hide a prompt bug.

4. **No served= field.** You cannot explain a quality dip.""",
   line="""A fallback is a second model that still meets the contract, switched on for a transient reason, eval'd in advance, and logged as served. A cheaper model that cannot keep the schema is not a fallback.""",
   kps=[
    "Fallback preserves schema, tools, and refusal policy.",
    "Trigger is 503/timeout/quota — not 400 and not taste.",
    "Eval the fallback before the incident.",
    "Log served=primary|fallback.",
    "Do not send writes to an unauthorised fallback.",
    "A quality drop is a degrade; say so.",
   ],
   qs=[
    {"q": "What must a model fallback preserve?", "a": "The contract: schema, tool names, and safety/refusal behaviour you depend on. If it cannot, you must disable those features, not pretend it is the same path.", "kind": "recall"},
    {"q": "Primary 503s; fallback cannot emit your JSON. What do you do?", "a": "Do not call it a fallback. Degrade to a safe message or a human queue. Fix the fallback offline so it meets the schema, then enable it.", "kind": "debug"},
    {"q": "When is a fallback the wrong response to errors?", "a": "On 400, 401, or context-limit — those are your request or key. Switching vendors will not fix a too-long prompt.", "kind": "apply"},
    {"q": "What do you eval on the fallback, and when?", "a": "The same golden set as primary, before you need it. Track the quality gap. A weekly run is the rent you pay for the claim.", "kind": "apply"},
    {"q": "Why log served=?", "a": "So a quality or cost dip can be attributed to the failover, and so you know when to switch back.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask for the trigger, the contract, and last week's fallback eval. If the fallback was never run, you do not have a fallback. Ask whether writes are allowed on it.",
  ),
  "failures-at-the-llm-and-tool-levels": note(
   what="""A turn can fail at the **LLM HTTP** layer or at the **tool** layer. LLM: 429, 503, timeout, malformed assistant message. Tool: 404, 409, denied, downstream 500, invalid args. They need **different maps**. Retrying the model because the tool 409'd 'already refunded' is how you confuse everyone. Retrying the tool because the model 503'd is how you double-charge if you already ran the tool.

The loop must record **where it stopped**. If the tool succeeded and the second model call failed, you resume the model with the stored result — you do not re-enter the tool. If the model never produced a valid tool call, you do not hit the tool at all.

Traces should show both layers as spans.""",
   why="""On the job, blended retries are the classic money bug. Interviewers will split the question: 'the model 503s after refund returned 200' versus 'refund 503s'. They want two answers. This combines M2.5 and M2.9. If you have one retry loop for both, you have a bug.""",
   how="""State machine:

- LLM retryable → retry LLM (same request id if possible).
- LLM bad request → fail, fix prompt.
- Tool invalid_args → return error to model (repair), do not transport-retry the tool.
- Tool retryable write → retry tool with idempotency key.
- Tool success + LLM fail → persist tool result, retry LLM only.

Example. Refund 200, model timeout on the narration call. You store `{refunded: 1400}` and ask the model once more to narrate. You do not refund again.""",
   fails="""1. **One retry wrapper** around the whole loop.

2. **Re-entering a successful tool** after a later LLM fail.

3. **Treating tool 409 as LLM 503.**

4. **No span** for the tool, so you cannot see which layer failed.""",
   line="""I split LLM failures from tool failures. I retry each with its own map, I persist tool results before retrying the model, and I never wrap the whole loop in one retry.""",
   kps=[
    "LLM layer and tool layer have different retry maps.",
    "Record where the turn stopped.",
    "Successful tool + failed model → retry model only.",
    "Tool 409 is not a transient LLM error.",
    "invalid_args goes back to the model, not to transport retry.",
    "Trace both layers as spans.",
   ],
   qs=[
    {"q": "The refund tool returned 200 and the next model call 503d. What do you retry?", "a": "Only the model, after persisting the tool result. Re-entering refund can double-charge. The layers have different maps.", "kind": "debug"},
    {"q": "Why not wrap the whole tool loop in one retry?", "a": "You lose the ability to skip a completed side effect. A later hop's failure would replay the write. Retry the failing hop only.", "kind": "recall"},
    {"q": "Tool returns invalid_args. Is that a 429-style retry?", "a": "No. Send the validator error back to the model for one repair, or reject. Time will not fix bad arguments.", "kind": "apply"},
    {"q": "What does the trace need for a two-layer turn?", "a": "A parent span for the turn and child spans for each LLM call and each tool, with species and attempt numbers. One error=true on the parent is not enough.", "kind": "apply"},
    {"q": "Tool 409 already-refunded. What do you tell the model?", "a": "A structured already_done, then narrate. Do not treat it as a 503 and do not retry billing.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Give them the 200-then-503 story. If they retry the whole loop, reject. Ask to see two maps in code: transport vs tool.",
  ),
  "where-reliability-logic-belongs": note(
   what="""Reliability logic — retries, timeouts, fallbacks, the status map — can live in the **provider SDK**, in an **orchestration layer**, or in **your wrapper**. SDKs sometimes retry by default (and can surprise you). Frameworks sometimes add their own. If both retry and you retry, you cube the attempts. **You should own the map** in one place you can test, and you should **turn off** hidden retries you did not ask for.

Day-critical writes stay in your wrapper, synchronous and explicit. Do not hide a refund retry inside a library default. Observability also belongs next to the map: the same wrapper logs species and attempts.

'The SDK will handle it' is not an architecture.""",
   why="""On the job, double-retry is a common incident: your wrapper plus LangChain plus the SDK. Interviewers will ask where the logic lives. They want: one wrapper, defaults off, tests on the map. They will ding 'we rely on the framework'. This is the portability note from M2.3 applied to robustness.""",
   how="""Inventory: print attempt counts with SDK retries on vs off. Disable library retries. Put T, MAX, map, semaphore in `LlmClient`. Features call only that. Example. You discover ChatOpenAI retries twice and your wrapper retries twice: four attempts, 16s of hidden wait. You set library retries to 0 and keep the wrapper.

Document 'we do not use SDK retries' in the README so a helpful upgrade does not turn them back on.""",
   fails="""1. **Stacked retries** you cannot see.

2. **Map copied into three features** that then drift.

3. **Framework upgrade** re-enables defaults.

4. **Writes using a helper** with undocumented retry.""",
   line="""Reliability lives in one wrapper I test. I turn off SDK and framework retries I did not ask for, and I never hide a write retry in a default.""",
   kps=[
    "Own the retry map in one wrapper.",
    "Disable hidden SDK/framework retries.",
    "Stacked retries multiply wait and spend.",
    "Writes must use the explicit path.",
    "The same wrapper logs species and attempts.",
    "The SDK will handle it is not a design.",
   ],
   qs=[
    {"q": "Where should timeout, retry map, and backoff live?", "a": "In one application wrapper around the vendor call, with tests. SDK and framework retries should be off unless you have measured and documented them as the only map.", "kind": "recall"},
    {"q": "p95 is 16s on 429s but MAX looks like 2. What do you check?", "a": "Hidden retries in the SDK or LangChain stacked on yours. Log attempt at the socket, not only in your loop. Disable the extras.", "kind": "debug"},
    {"q": "A feature copied the retry map and changed 401 to retry. What is the fix?", "a": "Delete the copy. All features call the wrapper. Maps that drift are how 401s become hangs again.", "kind": "apply"},
    {"q": "Why disable framework retries even if they are 'sensible'?", "a": "Because you cannot test or change what you cannot see, and they stack. If you like their map, re-implement it in your wrapper and turn theirs off.", "kind": "apply"},
    {"q": "Where must a refund retry not live?", "a": "In an undocumented library default. Writes use the explicit wrapper with an idempotency key you can point at in a review.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask who retries: SDK, LangChain, wrapper. If the answer is more than one, you have a stack. Ask them to show retries=0 on the library.",
  ),
  "retry-maps-for-status-codes": note(
   what="""Memorise a short map you can say in an interview: **429 and 503 retry**; **400 and 401 do not**. Add: 403/404 fail fast; timeout retry if idempotent; context-length is a 400 you fix by shrinking; 500 once. That is enough to be useful. The map is not clever. The discipline is applying it everywhere, including streaming disconnects that look like timeouts.

Write it as a table in code, not as prose in a wiki only. Stream `length` is not a 429. Tool `denied` is not a 503. Keep the species straight.

This note is the pocket version of the previous two, on purpose. You will be asked for the table.""",
   why="""Interviewers love a crisp table. On the job, the table is what you paste into the runbook. If you cannot recite 429/503 vs 400/401, you will guess under pressure and guess wrong.""",
   how="""Tape this above the wrapper:

```
429  → backoff + jitter, cap
503  → backoff + jitter, cap
500  → once
timeout → once if safe
400  → fail (fix body)
401  → fail (fix key)
context → shrink, new request
```

Example. A stream drops mid-way: treat as timeout, not as 400. A JSON 200 that does not parse: not on this map (repair). A 429 on the fallback key: this map, on that key's semaphore.

Quiz yourself until it is muscle memory.""",
   fails="""1. **Memorising a different map per feature.**

2. **Putting parse failures on the 429 line.**

3. **Forgetting 401** in the spoken table.

4. **Wiki-only map** that the code contradicts.""",
   line="""429 and 503 retry; 400 and 401 do not. Timeouts retry only when safe. Context-length shrinks; it does not backoff. That is the table I ship and recite.""",
   kps=[
    "Pocket map: 429/503 retry; 400/401 fail fast.",
    "Timeouts retry only if idempotent.",
    "Context-length is shrink, not backoff.",
    "Parse failures are not on the transport map.",
    "One table in code, recited the same way in interviews.",
    "Streaming disconnects are timeouts, not 400s.",
   ],
   qs=[
    {"q": "Recite the short retry map for status codes.", "a": "429 and 503 retry with backoff and a cap. 400 and 401 fail fast. Timeouts retry once if safe. Context-length shrinks the prompt. 500 at most once.", "kind": "recall"},
    {"q": "A 200 with bad JSON is being retried as 503. What is wrong?", "a": "It is a parse/repair problem, not a transport species. Retrying the same completion request may duplicate work and will not teach the model the schema.", "kind": "debug"},
    {"q": "Where should this table live?", "a": "In the wrapper as data you unit-test, and in your mouth for interviews. A wiki that disagrees with the code is a bug.", "kind": "apply"},
    {"q": "A stream ends with a dropped socket. Which row is that?", "a": "Timeout / network. Retry the completion only if you have not taken a side effect and you can use a request id. It is not a 400.", "kind": "apply"},
    {"q": "Why call out 401 in a map this short?", "a": "Because people retry it under stress and hide a secrets incident. Fail fast is the whole point of the row.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask them to recite the table without notes. If 401 is missing or retried, they do not have it yet. Ask one trick species (bad JSON, dropped stream).",
  ),
  "fallback-that-preserves-the-contract": note(
   what="""A cheaper or secondary model is only a fallback if it **still emits the same schema**, still speaks the same tools, and still respects the same refuse/abstain rules. Otherwise you have a **different product** that you should not swap in during an incident. Preserving the contract means: same Pydantic/zod model, same tool names, same `insufficient_evidence` path, same max-iterations. You may drop optional flourishes (a witty intro) — not the fields the executor needs.

This is the M2.4/M2.5 contract applied under stress. Incident weekends are when hidden contract drift shows up.""",
   why="""On the job, a 'fallback' that returns prose will crash the parser at the worst time. Interviewers will ask what you check before adding a fallback model. They want the contract list and an eval, not a price. They will ding 'any cheaper model'. This sentence is how you sound senior on robustness.""",
   how="""Before you list Y as fallback for X:

1. Run the golden set on Y with the same schema and tools.
2. Diff tool-call shapes.
3. Confirm structured-output support (native or equivalent).
4. Record task_ok gap.
5. Only then put Y in config.

Example. X dies. Y is 3 points worse but schema-valid. You fail over, log served=Y, and disable an optional joke line. You do not fail over to a model that cannot bind tools; the executor would hang or skip auth paths.

If the gap is huge, the fallback is 'degrade to message', not Y.""",
   fails="""1. **Price as the only criterion.**

2. **No schema test** on Y.

3. **Different tool names** on Y's prompt.

4. **Failing over writes** to a model not on the allow-list.""",
   line="""A fallback that cannot keep the schema and tools is not a fallback. I eval the contract first, I log who served, and I would rather show a busy card than parse prose in an incident.""",
   kps=[
    "Same schema, tools, and abstain path — or it is not a fallback.",
    "Eval the contract on Y before the outage.",
    "Optional style can drop; required fields cannot.",
    "Prefer a busy card over a contract break.",
    "Log served= and the quality gap.",
    "Writes need an allow-listed fallback.",
   ],
   qs=[
    {"q": "What does preserve the contract mean for a fallback model?", "a": "It still emits the same schema, offers the same tool names, and honours the same abstain/refuse rules. Style can change. Required fields and auth paths cannot.", "kind": "recall"},
    {"q": "Cheaper model Y returns paragraphs during an X outage. What should you have done?", "a": "Not listed Y as a fallback. Pre-eval would have shown the schema gap. In the incident, degrade to a busy card, do not crash the parser.", "kind": "debug"},
    {"q": "Which tests gate adding a fallback?", "a": "Golden-set task_ok, structured-output/parse rate, tool-call shape diff, and a write allow-list check. Price is not a gate.", "kind": "apply"},
    {"q": "Can you drop an optional witty intro on fallback?", "a": "Yes. You cannot drop order_id or the deny path. Distinguish flourish from contract.", "kind": "apply"},
    {"q": "Why might you refuse to fallback a refund model at all?", "a": "If Y is not allow-listed for writes or its tool-choice behaviour is untested. Money paths stay on the primary or go to a human.", "kind": "recall"},
   ],
   links=[OA_API, AN_MSG],
   review="Ask for last week's fallback parse rate. If they picked Y because it was cheap, ask for the schema test. If there is none, they do not have a fallback.",
  ),
 }
}
