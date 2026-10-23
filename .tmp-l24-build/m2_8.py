from helper import note, OA_BATCH, OA_API, LC_RUN

NOTES = {
 "m2-8": {
  "when-concurrency-helps": note(
   what="""A **synchronous** call waits for one completion before you start the next. An **asynchronous** call lets the worker do other work (or start more calls) while it waits on the network. **Concurrency** is running several of those waits at once. It helps when the bottleneck is **waiting** — many independent LLM requests, each idle on the vendor. It does not help when the bottleneck is **your CPU**, a **shared lock**, or a **rate limit you already saturate** with one in-flight call.

Concurrency is not parallelism of the model's decode. Each request still generates at its own tokens-per-second. You are overlapping waits. Throughput (requests per minute) can rise; per-request latency usually does not fall, and can rise if you overload the vendor or yourself.

User-facing turns with one call do not get faster because you imported asyncio. Fan-out of independent arms does.""",
   why="""On the job, people `async` a single chat turn and wonder why p95 is unchanged. Interviewers will ask when concurrency helps. They want: many independent requests, wait-bound, with a bound so you do not 429. They will ding 'we made it async so it is faster' on a one-call path. This is also how you explain why a batch of evals should be concurrent and a checkout chat should not start eight extra calls.""",
   how="""Draw a timeline.

- 10 independent classifications, 2s each, sequential: 20s. Concurrent with 5 in flight: ~4s plus jitter.
- 1 user chat, 2s: still 2s if you only have one call.

Measure: if CPU is low and you are waiting on HTTP, concurrency can help. If you are already at the vendor's RPM, you will trade 429s for 'throughput'. Put a semaphore first (next notes).

Do not confuse asyncio in the server with the vendor's async. Your worker can be async and still send one request.""",
   fails="""1. **Async as a speed spell** on a single turn.

2. **Unbounded create_task** for every user. You DDoS yourself and the vendor.

3. **Concurrent dependent steps.** B needs A; you raced them.

4. **Ignoring that p95 per request can worsen** under load.""",
   line="""Concurrency overlaps waits on independent requests. It raises throughput, not magic per-call speed. I use it when I am wait-bound and I can bound in-flight work.""",
   kps=[
    "Concurrency overlaps I/O waits; it does not speed one decode.",
    "It helps many independent requests, not a single chat turn.",
    "Throughput can rise; per-request p95 can worsen if you overload.",
    "Dependent steps stay sequential.",
    "Async in your process is not the same as many in-flight vendor calls.",
    "Bound it or you will 429.",
   ],
   qs=[
    {"q": "When does concurrency improve LLM throughput?", "a": "When you have many independent, wait-bound requests and spare rate-limit budget. It overlaps HTTP waits. It does not shorten one model's decode.", "kind": "recall"},
    {"q": "A team 'made the handler async' and p95 is unchanged. Why?", "a": "The turn still has one vendor call. Async let the worker serve others, but this user's wait is the same. Concurrency helps a fan-out or a batch, not a single call.", "kind": "debug"},
    {"q": "Ten independent classifications, 2s each. Sequential vs five in flight?", "a": "Sequential about 20s wall time. Five in flight about 4s plus jitter, if the vendor accepts that rate. Per-item latency stays ~2s.", "kind": "apply"},
    {"q": "Why can per-request p95 get worse when you raise concurrency?", "a": "Queueing at the vendor, your own thread/socket exhaustion, and 429 backoff all add wait. Throughput may still rise while the tail suffers.", "kind": "apply"},
    {"q": "Should extract-then-draft be concurrent?", "a": "No. Draft depends on extract. Sequence them. Concurrency is for independent arms.", "kind": "recall"},
   ],
   links=[OA_API, LC_RUN],
   review="Ask whether the work is independent and wait-bound. If they async a single call for speed, correct them. Ask what bound they will put on in-flight requests before they ship gather.",
  ),
  "running-requests-concurrently": note(
   what="""To process **many independent** LLM requests you start several calls and wait for them as a group: `asyncio.gather`, a thread pool, a vendor batch helper, or LangChain `batch`/`abatch`. The unit of independence is 'B does not need A's output'. Eval sets, fan-out retrieves, and offline classification are the usual wins. User turns that must stay sequential stay sequential.

You still attach a timeout per call and a **bound** on how many are in flight (next note). A naked `gather(*[call(x) for x in million])` is an outage. You also still log usage per request; a batch is not one row unless the vendor's batch API says so.

Streaming many concurrent user chats is a different problem (backpressure). This note is about request-shaped work.""",
   why="""On the job, overnight evals that run sequentially waste the clock and the laptop. Interviewers will ask how you run 1_000 classifications. They want chunks, a bound, per-item errors that do not cancel the group, and a usage row per item. They will ding a single try/except around the whole gather that drops 999 successes on one fail.""",
   how="""Chunk the work. `for chunk in slices(items, 20): results += await gather(*[one(i) for i in chunk], return_exceptions=True)`. Map exceptions to a structured fail; keep successes. Persist usage as you go so a crash does not lose the ledger.

Example. 1_000 tickets. 20 in flight, 2s each, ~100s plus backoff. One poison ticket returns an exception; the other 19 in that chunk still save. You do not rerun the 999.

LangChain `abatch` is the same idea if you already have runnables — still wrap with a bound and per-item errors.""",
   fails="""1. **gather on the entire set.** Memory and 429s.

2. **return_exceptions=False.** One fail cancels the cohort.

3. **One usage row for the batch** of online calls. You cannot find the expensive item.

4. **Concurrent user writes** to the same order id.""",
   line="""I run independent requests in bounded chunks, I keep per-item errors from sinking the group, and I log usage per request. A million-way gather is not a plan.""",
   kps=[
    "Concurrency is for independent items; chunk them.",
    "Per-item errors must not cancel the cohort.",
    "Log usage per request, not once per gather.",
    "Timeouts stay per call.",
    "Framework batch helpers still need a bound.",
    "Do not concurrent-write the same resource.",
   ],
   qs=[
    {"q": "How do you run 1_000 independent classifications without a stampede?", "a": "Chunk them (for example 20 at a time), gather inside the chunk with per-item error capture, persist usage as you go, and apply a semaphore that matches the rate limit.", "kind": "apply"},
    {"q": "gather fails the whole group when one call 500s. What do you change?", "a": "Capture per-item exceptions (return_exceptions or equivalent), record the fail, and keep the successes. Rerun only the failures.", "kind": "debug"},
    {"q": "Why not one usage row for a 20-call gather?", "a": "You cannot find the expensive or truncated item, and finance cannot attribute cost. Each call still has tokens and a finish reason.", "kind": "recall"},
    {"q": "When is LangChain abatch appropriate?", "a": "When you already have a runnable and many independent inputs. You still bound concurrency and handle per-item errors. It is not a reason to batch a dependent workflow.", "kind": "apply"},
    {"q": "What is the unit of independence?", "a": "B does not need A's output and does not write the same lock. If either is false, sequence those two.", "kind": "recall"},
   ],
   links=[OA_API, LC_RUN],
   review="Ask to see the chunk size, the per-item error path, and the usage write. A single gather over the whole set is a reject. Ask what happens to the 999 when one ticket poisons the batch.",
  ),
  "bounded-concurrency-rate-limits": note(
   what="""Vendors publish **rate limits** (RPM, TPM, concurrent requests). **Bounded concurrency** means you never have more in-flight calls than that budget (minus a safety margin). The primitive is a **semaphore** (or a queue with a worker count). Hope is not a bound. If you exceed the limit you get 429s, then retries, then a stampede — the opposite of throughput.

Bounds are per **key**, per **model**, and sometimes per **region**. A second feature that shares the key shares the budget. Global unlimited gather in one feature steals from another.

Jittered backoff on 429 is the partner of the bound. The bound reduces how often you 429; backoff saves you when you still do.""",
   why="""On the job, the first load test without a semaphore is a 429 festival. Interviewers will ask how you avoid being banned at 1_000 calls. They want: semaphore = min(safe_RPM, your_target), jittered backoff, a budget alarm. They will ding 'we retry 429' without a bound — that is how you DDoS the vendor with your own retries.""",
   how="""`sem = Semaphore(8)` if the model allows ~12 concurrent and you share the key with another job. Each call: `async with sem: await complete(...)`. Measure 429 rate. If it is not ~0, lower the bound. If the vendor offers 100 concurrent and you need 10, do not set 100 'because we can'.

Example. Eval job and production chat share a key. Eval gets a semaphore of 4; chat keeps 8 reserved. A fairness split is a product decision. One unbounded eval will 429 the chat.

TPM (tokens per minute) can bind before RPM if your prompts are huge. Bound on the scarcer resource.""",
   fails="""1. **No bound.** Retries amplify the 429s.

2. **Bound of 1000** because the laptop has threads.

3. **Ignoring shared keys.** Staging eval knocks out production.

4. **Only RPM, ignoring TPM.** Huge prompts still 429.""",
   line="""I bound in-flight calls to the provider's rate, minus a margin, with a semaphore. I split the budget across features that share a key, and I treat 429 retries without a bound as a stampede.""",
   kps=[
    "A semaphore (or worker count) is the production bound.",
    "Set it from RPM/TPM/concurrent limits, minus a margin.",
    "Shared keys share a budget; reserve some for interactive traffic.",
    "Retries without a bound amplify 429s.",
    "TPM can bind before RPM on huge prompts.",
    "Hope is not a rate limit.",
   ],
   qs=[
    {"q": "What primitive keeps you under a vendor rate limit?", "a": "A semaphore or a fixed worker pool sized to the concurrent/RPM/TPM budget minus a margin. Retries alone do not keep you under; they can make it worse.", "kind": "recall"},
    {"q": "An eval job and chat share a key; chat starts 429ing. What happened?", "a": "The eval consumed the shared budget. Split semaphores, use a separate key, or run eval in the batch API. Do not let overnight jobs steal interactive quota.", "kind": "debug"},
    {"q": "You retry 429s with backoff but have no semaphore. Why is that unstable?", "a": "Every caller still launches at once, all 429, all wait, all retry together (even with jitter, the herd is large). A bound reduces arrivals; backoff handles leftovers.", "kind": "apply"},
    {"q": "RPM is fine but you still 429. What else do you check?", "a": "Tokens per minute and concurrent-request caps. Long prompts burn TPM. Size the bound to the scarcer resource.", "kind": "apply"},
    {"q": "How do you pick the number on the semaphore?", "a": "From the vendor limit, minus a margin, minus what other features need on that key. Then lower it if 429 rate is not near zero.", "kind": "recall"},
   ],
   links=[OA_API, OA_BATCH],
   review="Ask for the semaphore value and which limit it came from. If there is none, reject. Ask how eval and chat share the key. Ask whether TPM was considered.",
  ),
  "async-and-batch-execution": note(
   what="""There are two different 'batch' ideas. **Online async**: your process fires concurrent live calls (previous notes) and waits seconds. **Batch APIs**: you upload a file of requests, the vendor runs them **offline** (minutes to hours), often cheaper, with no interactive SLA. LangChain `batch` is usually the first idea. OpenAI's Batch API is the second. Do not mix the words in a design review.

Use online concurrency for user-facing fan-out and for small evals you will watch. Use the batch API for overnight evals, backfills, and large classification dumps. Both still need schemas, validation, and usage rows. Batch needs idempotent inputs: the same file can be replayed.

Framework `abatch` does not give you the discounted batch API. You must call that API on purpose.""",
   why="""On the job, running 50k evals online will 429 and cost more. Interviewers will ask how you run a big eval. They want: batch API if the vendor has one, else bounded online chunks; never a for-loop on a laptop overnight without a bound. They will also ask what you do not put on the batch API: anything a user is waiting on.""",
   how="""Decision:

- User is blocked → online, timeout, small fan-out.
- 10k labelled tickets, results tomorrow → batch API, then a job that validates and writes.
- 200 evals you will iterate on this hour → bounded online.

Example. You submit `requests.jsonl` with request ids you minted. Hours later you download results keyed by those ids, validate, and store. A failed line does not rerun the file blindly; you resubmit the failed ids.

Pin the model snapshot on batch jobs. A night-long job that silently changes models is a bad experiment.""",
   fails="""1. **User-facing batch API.** They wait hours.

2. **Calling abatch and expecting a discount.** You still pay online.

3. **No request ids** in the file. You cannot join results.

4. **Rerunning the whole file** after a 2% fail.""",
   line="""Online concurrency is for waits of seconds. The vendor batch API is for overnight, cheaper, no-SLA work. I do not put users on the batch path, and I do not call abatch a batch API.""",
   kps=[
    "Online async ≠ vendor batch API.",
    "Users stay on online calls with timeouts.",
    "Overnight evals and backfills belong on the batch API when it exists.",
    "Mint request ids so you can join results and retry fails.",
    "Framework batch is usually still online pricing.",
    "Pin the model snapshot on long jobs.",
   ],
   qs=[
    {"q": "What is the difference between LangChain batch and a vendor Batch API?", "a": "LangChain batch/abatch usually runs live concurrent calls at online prices. A vendor Batch API uploads a file, runs offline, and is often cheaper with no interactive SLA.", "kind": "recall"},
    {"q": "A PM wants the Batch API for the checkout chat. What do you say?", "a": "No. Users cannot wait hours. Keep checkout online with a timeout. Use batch for evals and backfills.", "kind": "apply"},
    {"q": "2% of a 50k batch file failed. What do you rerun?", "a": "Only the failed request ids, after you fix the cause. Do not resubmit the whole file and double-write successes.", "kind": "debug"},
    {"q": "Why mint your own request ids in the batch file?", "a": "So you can join results, retry a subset, and stay idempotent. Line order is a weak key.", "kind": "apply"},
    {"q": "Does abatch get you the batch discount?", "a": "Usually not. You are still making live calls. Use the vendor Batch API if you want that channel.", "kind": "recall"},
   ],
   links=[OA_BATCH, LC_RUN],
   review="Ask which channel a job uses and why. If they say batch for a user turn, or abatch for a discount, correct them. Ask how failed lines are replayed.",
  ),
  "the-throughput-cost-trade-off": note(
   what="""Concurrency, throughput, latency, rate limits, machine resources, and **cost** move together. More in-flight calls can raise throughput until you hit a limit; then you pay in 429s, retries (more tokens), longer p95, and sometimes a bigger machine. Tokens cost the same per call whether you run them sequentially or concurrently — except retries and failed duplicates, which concurrency can increase. Batch APIs trade latency for a cheaper token.

The trade-off is a **budget**: target throughput, p95 cap, 429 rate near zero, spend cap. You cannot maximise all four. Interactive traffic favours p95 and a reserved slice of the rate limit. Offline jobs favour throughput and cheaper channels.

Write the numbers. 'We made it faster' is not a trade-off.""",
   why="""On the job, a load test that 'succeeds' at 50 rps with 8% 429s and 2× retries has not succeeded; it has doubled spend. Interviewers will ask what you give up when you raise concurrency. They want: possible p95, 429s, cost from retries, and other features on the key. They will ding a plan with no spend cap.""",
   how="""Make a small table before you tune.

Example. Eval of 10k items. Sequential: 6 hours, $X, 0 429s. Concurrent 20: 25 minutes, $X, 0 429s. Concurrent 200: 20 minutes, $1.4X from retries, chat 429s. You pick 20 and a semaphore, or you move to the batch API for $0.5X and 4 hours.

Interactive: reserve concurrency, never let eval steal it. Alert on spend per hour and on 429 rate, not only on 5xx.""",
   fails="""1. **Maximising rps** with no 429 or spend budget.

2. **Ignoring retry tokens** in the cost model.

3. **One number** ('50 rps') without p95 or error rate.

4. **Overnight job on the interactive key** with no reservation.""",
   line="""I treat concurrency as a budget across throughput, p95, 429s, and spend. Tokens are not cheaper just because they run in parallel; retries can make them more expensive.""",
   kps=[
    "Concurrency trades throughput against p95, 429s, and retry cost.",
    "Parallel does not discount tokens; retries can inflate them.",
    "Write targets: rps, p95, 429 rate, spend.",
    "Reserve rate-limit for interactive traffic.",
    "Batch API is the usual cheaper, slower channel.",
    "A load test with 429s is a cost incident, not a win.",
   ],
   qs=[
    {"q": "What do you give up when you raise in-flight LLM calls?", "a": "Often tail latency, 429 headroom, and money if retries multiply. Throughput may rise until the scarcer limit. Interactive traffic on the same key can suffer.", "kind": "recall"},
    {"q": "A load test hits 50 rps with 8% 429s. Is it a success?", "a": "No. You are retrying, paying extra, and stealing budget. Lower the bound until 429s are near zero, then report rps and p95 together.", "kind": "debug"},
    {"q": "Does running 20 calls at once make each token cheaper?", "a": "No. Price per token is the same online. You may finish wall-clock sooner. Retries can make the job more expensive. The batch API is the cheaper channel.", "kind": "apply"},
    {"q": "How do you protect chat while an eval runs?", "a": "Separate keys or a reserved semaphore slice, plus an alert if chat 429s. Do not share an unbounded pool.", "kind": "apply"},
    {"q": "Which four numbers belong on a concurrency design slide?", "a": "Target throughput, p95 cap, 429 rate, and spend (or token) cap. Plus which key and model they apply to.", "kind": "recall"},
   ],
   links=[OA_API, OA_BATCH],
   review="Ask for the four numbers. If they only have rps, the trade-off is missing. Ask what happens to retry spend at the proposed bound.",
  ),
  "semaphore-as-the-production-primitive": note(
   what="""The **semaphore** (or a worker pool of size N) is the thing you actually ship. It is a counter: at most N calls are in flight; the N+1st waits. N is derived from the provider's concurrent/RPM/TPM limit, not from 'the machine felt fine'. Every online fan-out, every eval chunk, every retry path goes through the same primitive so you cannot accidentally open a second unlimited door.

A semaphore is not a queue with fairness unless you add one. It is not a circuit breaker (that opens on error rate). You often want all three: bound (semaphore), isolate (per-feature semaphore), and stop (breaker) when the vendor is sick.

Name it in the interview. 'We bound concurrency' without naming the primitive is fog.""",
   why="""On the job, the bug is the second entry point that forgot the semaphore: a new cron, a new script, a retry loop that launches calls outside the wrapper. Interviewers want the word semaphore (or worker pool) and the sentence that N comes from the vendor, not from hope. This is M2.8's production slogan.""",
   how="""One wrapper: `async with rate_limit[model]: return await client.complete(...)`. All features import it. N lives in config next to the key. Example: `gpt-4o: 8`, `small-classifier: 20`. Changing N is a config change, not a hunt through gather()s.

Retries acquire the semaphore again; they do not sneak around it. Batch API jobs do not use this semaphore; they have their own submission cap.

Test: start N+5 calls, assert that in-flight never exceeds N (a counter you increment in the wrapper).""",
   fails="""1. **A gather that bypasses the wrapper.**

2. **N = 256** because that is the thread default.

3. **Retries outside the wrapper.**

4. **One global N** for a tiny model and a huge one that share nothing.""",
   line="""The production primitive is a semaphore sized to the provider's rate, used by every online call including retries. Hope is not a bound.""",
   kps=[
    "Ship a semaphore (or pool); do not sprinkle gather().",
    "N comes from vendor limits, minus margin, per model/key.",
    "Retries acquire the same bound.",
    "A second entry point that skips the wrapper is an incident.",
    "Pair with a breaker when the vendor is sick.",
    "Test that in-flight never exceeds N.",
   ],
   qs=[
    {"q": "What is the production primitive for bounded LLM concurrency?", "a": "A semaphore or fixed worker pool around the client wrapper, sized to the vendor limit. Every online call and retry acquires it.", "kind": "recall"},
    {"q": "A new cron calls the SDK directly and chat 429s. What was missing?", "a": "The cron bypassed the wrapper. All entry points must acquire the same per-key semaphore (or use a separate key). Fix the door, not only the cron schedule.", "kind": "debug"},
    {"q": "Should retries skip the semaphore to 'catch up'?", "a": "No. That is how you stampede. Retries wait their turn. If you are behind, lower arrivals or shed load.", "kind": "apply"},
    {"q": "How do you test the bound?", "a": "Drive N+k calls through the wrapper and assert an in-flight counter never exceeds N. Also assert a bypass (raw SDK) is lint-forbidden.", "kind": "apply"},
    {"q": "Why might two models need two Ns?", "a": "They have different concurrent/TPM limits and prices. A tiny classifier can run hotter than a frontier chat model. One global N wastes or overloads.", "kind": "recall"},
   ],
   links=[OA_API, LC_RUN],
   review="Ask to see the wrapper and the config N. Grep for raw client.complete outside it. If retries construct a new client, they probably skipped the bound.",
  ),
  "batch-apis-vs-online": note(
   what="""**Online** means the user (or your interactive job) is waiting: timeout in seconds, streaming optional, list price. **Batch APIs** are a different channel: submit, wait, download, often half price, minutes-to-hours latency, weaker SLAs. Overnight **evals** and backfills belong on batch. User-facing turns stay online. Mixing them is a product bug (users wait) or a cost bug (you paid list for 50k offline items).

Batch is not 'async' in the asyncio sense. Your process can be async online. Batch is an upload. Plan for eventual consistency: the result file arrives later; your job must be restartable and idempotent.

Not every vendor has a batch channel. If they do not, bounded online chunks are the fallback — still not a user path for 50k items.""",
   why="""On the job, finance will ask why evals cost as much as production. The answer is usually 'we ran them online'. Interviewers will ask which channel you pick. They want this split in one breath: users online, overnight evals batch, timeouts versus files, list versus discount. This is the M2.8 interview sibling to the 1_000-calls question.""",
   how="""Label each job in the repo: `channel=online|batch`. Example: nightly regression 8k items → batch, request ids, pin snapshot, validate on download. Lunch-time prompt tweak on 80 items → online bounded. Checkout chat → online, 20s timeout, reserved semaphore.

If batch is down, do not silently fail over 8k items to online without a spend alarm. That failover is a budget event.""",
   fails="""1. **Users on batch.** Support tickets about 'the button spun for an hour'.

2. **Evals on online** at list price by habit.

3. **Silent failover** from batch to online.

4. **Non-idempotent batch lines** so a replay doubles writes.""",
   line="""Users stay online with a timeout. Overnight evals use the batch API when it exists. I label the channel on every job and I never silently fail a large batch over to list price.""",
   kps=[
    "Online: seconds, users, list price. Batch: hours, files, often cheaper.",
    "Evals and backfills prefer batch; user turns never do.",
    "Label the channel in the repo.",
    "Failing batch over to online is a spend event.",
    "Batch lines must be idempotent and keyed by your request id.",
    "asyncio online is not a batch API.",
   ],
   qs=[
    {"q": "Which jobs belong on a vendor Batch API?", "a": "Overnight evals, backfills, and large offline classification — work that can wait hours and should pay less. Not user-facing turns.", "kind": "recall"},
    {"q": "Batch is down; a cron starts 8k online calls. What should happen?", "a": "A spend/rate alarm and a conscious decision, not a silent failover. Prefer delaying the job. Dumping 8k onto the interactive key will 429 chat.", "kind": "debug"},
    {"q": "Why must batch lines be idempotent?", "a": "You will replay failed ids or the whole file. Without idempotency keys or upserts you double-write side effects.", "kind": "apply"},
    {"q": "A teammate says the handler is async so we already batch. Correct them.", "a": "Async online still waits seconds and pays list. The batch channel is an upload with a later download. Different SLA, price, and code path.", "kind": "apply"},
    {"q": "What do you pin on a night-long batch eval?", "a": "Model snapshot, prompt version, and your request ids. A moving alias makes the night's numbers incomparable.", "kind": "recall"},
   ],
   links=[OA_BATCH, OA_API],
   review="Ask them to label three jobs online vs batch. If evals are online at list price with no reason, push them. If a user path says batch, reject.",
  ),
  "interview": note(
   what="""**Interview: 1_000 calls without getting banned** is a spoken recipe: **concurrency cap** (semaphore sized to the limit), **jittered backoff** on 429/503, and a **budget alarm** (tokens or spend per hour, plus 429 rate). You add: chunk the work, per-item errors, separate keys or reserved quota for chat, and batch API if this is an eval. You do not say 'we retry a lot'.

This is M2.8's exam. They want the primitive and the restraint, not a thread count.""",
   why="""Every company that has a vendor key has been 429ed by its own eval. Interviewers use this question to see if you have. On the job it is also the design review for the first load test.""",
   how="""Say, in order:

1. 'N-way semaphore from the vendor concurrent/RPM/TPM limit, minus a margin.'
2. 'Chunks of work, per-item errors, usage per request.'
3. 'Jittered backoff, cap on retries, no retry on 400/401.'
4. 'Alarm on 429 rate and spend; chat reserved if the key is shared.'
5. 'If it can wait until morning, Batch API instead.'

Close: 'Hope is not a rate limit.' If they ask about 1_000 user chats, you also mention backpressure and that you do not gather 1_000 streams unbounded.""",
   fails="""1. **Only retries**, no bound.

2. **N = 1_000** because the question said 1_000.

3. **No alarm.** You find out from finance.

4. **Forgetting the shared key** with production chat.""",
   line="""One thousand calls: a semaphore from the vendor limit, jittered backoff, a spend and 429 alarm, and the batch channel if nobody is waiting. I do not set N to 1_000 because the question said 1_000.""",
   kps=[
    "Cap, jittered backoff, budget alarm — in that sentence.",
    "N comes from the limit, not from the item count.",
    "Reserve quota for interactive traffic.",
    "Prefer Batch API when the work can wait.",
    "Per-item errors and per-request usage.",
    "Retries without a bound are a stampede.",
   ],
   qs=[
    {"q": "Walk 1_000 LLM calls without getting banned.", "a": "Semaphore sized to the vendor limit minus margin, chunked gather with per-item errors, jittered backoff on 429/503, alarms on 429 rate and spend, reserved quota for chat, Batch API if it can wait.", "kind": "recall"},
    {"q": "Why is N=1000 the wrong semaphore for 1000 items?", "a": "The vendor will not allow 1000 concurrent. N is a rate-limit number (8, 20, 40), not the dataset size. The dataset is chunked over time.", "kind": "apply"},
    {"q": "You remembered retries but not a bound. What happens at t=0?", "a": "All 1000 launch, most 429, retries amplify, chat on the same key dies. The bound had to exist before the first retry.", "kind": "debug"},
    {"q": "What two alarms do you name?", "a": "429 rate and spend (or tokens) per hour. A 5xx alarm is not enough; successes can still bankrupt you.", "kind": "apply"},
    {"q": "When do you mention the Batch API in this answer?", "a": "As soon as you establish nobody is waiting — evals and backfills. Users stay online.", "kind": "recall"},
   ],
   links=[OA_API, OA_BATCH],
   review="Time the recipe. They must say semaphore, jitter, alarm. If they set N to 1000 or only mention retries, they fail the talking point.",
  ),
 }
}
