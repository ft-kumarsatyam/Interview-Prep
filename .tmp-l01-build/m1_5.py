from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-5": {
  "what-happens-after-you-send-a-prompt": entry(
   what="""After you send a prompt the server **tokenises** it, **runs the model on the input** (prefill), then **predicts a token**, **emits it**, and **repeats** until a stop or a limit. The HTTP response may be **streamed** (tokens as they appear) or buffered. Your client sees text. Underneath it is the same predict → choose → append loop.

There is no separate "thinking" unless the product added a reasoning stage (M1.7). There is no session: the next call must resend history if you want memory.

Errors (rate limit, context overflow, timeout) happen at this boundary, not inside a soul.""",
   why="""On the job this is the mental model for timeouts and partial streams. Interviewers want the loop after the API call, not only "it generates". They want you to mention tokenise, prefill, decode, stop.

This is the umbrella; the next items split prefill vs decode and the latency metrics.""",
   how="""Client: POST messages. Server: apply template → ids → prefill → for i in max_tokens: decode one, stream it, stop on EOS. Return usage counts.

If you stream, the user sees early tokens while decode continues. If you buffer, TTFT is hidden until the full string exists — usually worse UX for long answers.

If the prompt is too long, you fail before the first token. If decode is slow, you have a first token and then a trickle.

Log request id, token counts, and whether you hit stop or length.""",
   failures="""1. **Thinking the server stored the chat.**

2. **Ignoring tokenisation** as a step (wrong template).

3. **Buffering a long answer** and calling the API 'slow' when it was your wait.

4. **No stop**, hitting max every time.""",
   line="""The API tokenises, prefills the prompt, then decodes tokens until stop. I stream when the user is waiting, I resend history if I want memory, and I log tokens and the stop reason.""",
   key_points=[
    "Tokenise → prefill → decode loop → stop.",
    "Streaming shows tokens as they are chosen.",
    "No session unless you resend history.",
    "Context overflow fails before useful output.",
    "Usage counts are the bill.",
    "Reasoning, if any, is an extra stage some products add.",
   ],
   questions=[
    q("recall", "What happens after you send a prompt to an LLM API?", "The service tokenises and templates the messages, prefills the input, then decodes tokens one by one until a stop or max length."),
    q("apply", "Why does the assistant forget turn one if you only send turn two?", "The API is stateless. You must resend history (or a summary) each call."),
    q("debug", "The client waited 20s with a blank screen, then a long paragraph appeared. What did you likely forget?", "Streaming. You buffered the full decode. Stream so TTFT is visible."),
    q("apply", "What do you log per call?", "Request id, model, prompt/completion tokens, latency, stop reason, error class. Not the raw secret-bearing prompt unless you have a policy."),
    q("recall", "Where does a context-length error happen?", "At prefill, before useful decode. The input does not fit the window."),
   ],
   links=[
    {"title": "OpenAI: streaming", "url": f"{OAI}/api-reference/streaming"},
    {"title": "OpenAI: text generation", "url": f"{OAI}/guides/text-generation"},
   ],
  ),
  "prefill-vs-decode": entry(
   what="""**Prefill** is the pass (or passes) that **process the whole input** so every prompt token has keys/values and the last position can predict the first output token. It is **compute-heavy** and **parallel** over the input length. **Decode** is **one new token at a time**, using the KV cache, mostly **memory-bandwidth** bound. They have different scaling: prefill grows with **input** length; decode grows with **output** length.

A huge prompt and a one-word answer: you pay prefill. A tiny prompt and a novel: you pay decode. Reasoning models add more decode (or a hidden decode) before the user-visible answer.

This split is the most useful inference idea in interviews.""",
   why="""On the job, "the model is slow" is either TTFT (prefill) or tokens/s (decode). The fix differs: shrink the prompt vs cap the output or pick a faster decoder. Interviewers will ask you to define both and to say which one a 50-page context hurts (prefill, and memory).

They will ask why batching helps one more than the other (later item).""",
   how="""Measure TTFT and time-per-output-token separately. If TTFT grows linearly with prompt size, you are seeing prefill. If a 2_000-token answer crawls after a quick first token, you are seeing decode.

Engineering: cache a stable prefix (vendor prompt cache) to skip repeated prefill. Stream decode. Do not stuff a PDF if a paragraph will do.

When you add RAG, you grow prefill. When you ask for "be thorough", you grow decode. Both are money.""",
   failures="""1. **One 'latency' number** that hides which phase.

2. **Shrinking output** when the pain is a 100k prompt.

3. **Pasting books** and blaming the GPU brand.

4. **Ignoring that reasoning is extra decode.**""",
   line="""Prefill processes the input and sets TTFT; decode emits tokens one by one. I measure them separately. Long prompts hurt prefill; long answers hurt decode. The fixes are different.""",
   key_points=[
    "Prefill: whole input, parallel, compute-heavy, sets first token.",
    "Decode: one token at a time, often memory-bound.",
    "Input length → prefill. Output length → decode.",
    "Measure TTFT and time per token separately.",
    "Prompt cache attacks repeated prefill.",
    "Reasoning adds decode you may not see.",
   ],
   questions=[
    q("recall", "What is prefill versus decode?", "Prefill processes the prompt so the first output token can be predicted. Decode generates each later token sequentially using cached keys/values."),
    q("apply", "A 40-page prompt and a one-word answer feels slow. Which phase?", "Prefill (and memory). Shrink or cache the prompt. Decode is tiny."),
    q("debug", "TTFT is fine but the essay takes forever. Which phase?", "Decode. Cap tokens, ask for shorter answers, or pick a higher tokens/s model."),
    q("apply", "How does a prompt cache help?", "It reuses the prefill work (K/V) for a stable prefix so repeated calls skip that compute."),
    q("recall", "Why is decode hard to parallelise across tokens?", "Token t+1 depends on token t. You can batch many requests, not future tokens of the same request (except speculative tricks)."),
   ],
   links=[
    {"title": "NVIDIA: mastering LLM techniques — inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
    {"title": "OpenAI: prompt caching", "url": f"{OAI}/guides/prompt-caching"},
   ],
  ),
  "tokens-ttft-total-latency": entry(
   what="""**Input tokens** are the prompt (plus template, tools, history). **Output tokens** are the completion (plus hidden thinking if billed). **TTFT** is time to first token — mostly **prefill** plus queueing. **Tokens per second** is decode throughput. **Total latency** is TTFT + (output tokens / tokens per second), plus network.

A user staring at a blank box cares about TTFT. A batch job cares about total. A stream can feel fast with mediocre total if tokens start early.

Queueing is part of TTFT in a busy API. Your local benchmark may hide it.""",
   why="""On the job these are the SLA words. Interviewers will ask you to define them and to estimate: 800 input, 200 output, 50 ms/token decode, 1.2 s TTFT → about 1.2 + 10 s. They want the formula, not a vibe.

They will ask which number to put on a dashboard (all of them, plus error rate).""",
   how="""Instrument every call:

```
ttft = first_token_time - send_time
tps = (n_out - 1) / (end - first_token_time)
total = end - send_time
```

Alert on TTFT (prefill regressions, queue) and on tps (decode regressions) separately. Cap `max_tokens` so total cannot explode.

When comparing models, do not compare total only: a verbose model looks slower even at the same tps.

For interactive chat, optimise TTFT first. For summarising a book, optimise tokens/s and consider a smaller model.""",
   failures="""1. **One latency metric.**

2. **Forgetting queue time.**

3. **Comparing totals with different output lengths.**

4. **No max_tokens.**""",
   line="""Input and output tokens, TTFT, tokens/s, total. Total ≈ TTFT + output/tps. I dashboard them separately because the fixes differ, and I cap output so total cannot run away.""",
   key_points=[
    "TTFT ≈ prefill + queue.",
    "tokens/s is decode.",
    "total ≈ TTFT + n_out/tps.",
    "Interactive: TTFT. Batch: total.",
    "Compare models at similar output lengths.",
    "Cap max_tokens.",
   ],
   questions=[
    q("recall", "Define TTFT and total latency.", "TTFT is time until the first output token. Total is until the last. Total ≈ TTFT plus decode time for the remaining tokens."),
    q("apply", "TTFT 1.2s, 200 output tokens, 50 ms/token. About how long?", "About 1.2 + 199×0.05 ≈ 11 seconds, plus network. Order of ten seconds."),
    q("debug", "Total latency doubled but TTFT and tps are flat. What else grew?", "Output length (or hidden thinking tokens). The model got wordier."),
    q("apply", "What do you put on an SLO dashboard?", "TTFT p95, tokens/s or time-per-token, total p95, error rate, tokens in/out. Not a single 'latency'."),
    q("recall", "Why does queueing show up in TTFT?", "The clock starts when you send. If the server is busy, prefill has not even started."),
   ],
   links=[
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
    {"title": "OpenAI: usage in responses", "url": f"{OAI}/guides/text-generation"},
   ],
  ),
  "kv-caching": entry(
   what="""**KV caching** stores the **keys and values** already computed for past tokens so the next decode step only computes Q/K/V for the **new** token and attends over the cache. Without it, every new token would **recompute the entire conversation**. The cache is why decode is cheaper than prefill per token, and why **memory grows with context length** (and with batch).

The cache lives on the GPU (or host) for the life of the generation (and, with prefix caching, across requests that share a prefix). It is not your Redis session.

When the context is long, KV memory can exceed the weight memory. That is a serving limit.""",
   why="""Interviewers ask why we do not rerun the whole prompt every token — KV cache. They ask the cost (memory). On the job this is why a 128k window is expensive even if the model "supports" it, and why batching many long chats OOMs.

Prefix/prompt caching products are KV reuse across requests.""",
   how="""Step 1 (prefill): compute K and V for all prompt tokens, store them. Step 2: new token → compute its K/V, append to cache, attend, emit. Repeat.

Memory roughly: layers × heads × dim × seq_len × batch × 2 (K and V) × precision. A long seq_len hurts.

When you change the prefix, the cache for that prefix is invalid. That is why putting a timestamp at the start of the system prompt kills a prompt cache.

For multi-turn, you can keep the cache warm if the serving stack and the prefix stay stable.""",
   failures="""1. **Thinking KV cache is an application cache** of answers.

2. **A changing prefix** that busts prompt cache.

3. **Ignoring KV** when sizing 128k.

4. **Huge batch × long context** OOM.""",
   line="""The KV cache stores past keys and values so we do not recompute the whole prompt every token. It makes decode cheap and memory grow with length. I treat it as serving memory, not as a product cache of answers.""",
   key_points=[
    "Cache K/V from past tokens; compute the new one.",
    "Without it, every token would re-prefill.",
    "Memory scales with sequence length and batch.",
    "Not an application answer cache.",
    "Unstable prefixes bust prompt-cache products.",
    "Long windows can be KV-bound.",
   ],
   questions=[
    q("recall", "What does the KV cache store and why?", "Keys and values for tokens already processed, so the next token can attend without recomputing the whole sequence."),
    q("apply", "Why does a 128k context need so much GPU memory even if weights fit?", "The KV cache grows with length. At long context it can dominate weights."),
    q("debug", "Prompt cache hit rate is 0% after you added the time to the start of the system prompt. Why?", "The prefix changed every request, so stored K/V cannot be reused. Put changing fields later."),
    q("apply", "Is the KV cache your chat history store?", "No. It is ephemeral serving state. Your app still stores messages and resends them (or a summary) on the next HTTP call if the cache is gone."),
    q("recall", "What would inference cost without a KV cache?", "Roughly a full prefill every output token — far slower and more expensive."),
   ],
   links=[
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
    {"title": "vLLM: prefix caching", "url": "https://docs.vllm.ai/en/latest/automatic_prefix_caching/apc.html"},
   ],
  ),
  "why-inference-mechanics-drive-cost": entry(
   what="""You pay for **compute and memory time**. Long **prompts** cost **prefill** (and cache storage). Long **outputs** cost **decode** steps. **Reasoning** models spend extra tokens you may not show the user. **Retries** multiply the bill. **Idle KV** on a reserved GPU is money too if you self-host.

The invoice is usually tokens, but tokens are a proxy for these mechanics. A reasoning call with a short visible answer can cost like a long essay. A cached prefix can make a long prompt cheap on the second call.

This is why "the model is expensive" is a design problem, not only a vendor problem.""",
   why="""On the job you will be asked to cut the bill. The levers are prompt size, output cap, model class, cache, and retries — all inference mechanics. Interviewers want that list, not "buy less".

They will ask why a thinking model surprised finance (hidden tokens).""",
   how="""Bill review: group by model, input tokens, output tokens, thinking tokens. Find the chatty route. Cap it. Move static policy to a cached prefix. Stop retrying 3× on 400s. Use a small model for classify, a large one for the hard 10%.

Self-host: utilisation. An idle A100 with a 70B loaded is a standing cost. Batch or downscale.

Write the cost model as `$/1M in + $/1M out` × measured tokens per successful task, not per call you wished was shorter.""",
   failures="""1. **Optimising the vendor** before the prompt.

2. **Ignoring thinking tokens.**

3. **Retry storms.**

4. **Cached prefix that changes every call.**""",
   line="""Cost is prefill, decode, extra thinking tokens, retries and idle GPUs. I cut prompt and output, cache stable prefixes, pick the smallest model that passes eval, and I measure tokens per successful task.""",
   key_points=[
    "Tokens proxy compute: in=prefill, out=decode.",
    "Reasoning can hide tokens on the bill.",
    "Retries and verbosity multiply cost.",
    "Prompt cache helps stable prefixes.",
    "Self-host adds idle GPU cost.",
    "Price the successful task, not the raw call.",
   ],
   questions=[
    q("recall", "How do inference mechanics show up on the bill?", "Input tokens (prefill), output tokens (decode), sometimes thinking tokens, times retries. Self-host adds idle capacity."),
    q("apply", "A reasoning model answers in one sentence but the bill is huge. Why?", "Hidden thinking tokens were generated and billed. Cap the thinking budget or do not use reasoning for that task."),
    q("debug", "Cost doubled after you added a 10-page policy to every call. Fix?", "Put the policy in a cached prefix, or retrieve one paragraph. You grew prefill on every request."),
    q("apply", "Name four cost levers that are not 'switch vendor'.", "Shorter prompt, max_tokens, smaller model for easy tasks, prompt cache, fewer retries, less verbose instructions."),
    q("recall", "Why price per successful task?", "A cheap model that needs three retries and a human is not cheap. Include failures."),
   ],
   links=[
    {"title": "OpenAI: prompt caching", "url": f"{OAI}/guides/prompt-caching"},
    {"title": "Anthropic: prompt caching", "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"},
   ],
  ),
  "batching-decode-vs-interactive-ttft": entry(
   what="""**Batching** many decodes on one GPU **raises throughput** (tokens/s across users) and usually **hurts TTFT** (each user waits for a bigger batch or shares compute). Interactive chat wants low TTFT. Offline summarisation wants high throughput. You **pick for the product**.

Continuous batching (vLLM-style) adds/removes sequences as they finish, which is better than waiting for a full static batch — but the trade-off remains.

A serving flag that maximises tokens/s can make the UI feel dead.""",
   why="""On the job this is the argument between platform (GPU util) and product (snappy box). Interviewers want the fight named: throughput vs first token. They want you to say which you would pick for chat vs a nightly job.

They may ask what continuous batching is at a high level.""",
   how="""Chat: small batches or a latency SLO that caps batch wait. Nightly embed/summarise: large batches, no stream needed.

If you only have one GPU, you may run two endpoints or two queues with different batch settings — or accept that chat will suffer at peak.

Measure both: tokens/s *system* and TTFT *per request*. Optimising one in isolation is how the other team files a ticket.

APIs hide the batcher; you still see the trade-off as "busy hours feel slower" (queue + batch).""",
   failures="""1. **Maxing batch size** on a chat product.

2. **No batch** on a 10M-token offline job.

3. **One SLO** for both workloads.

4. **Ignoring queue wait** in TTFT.""",
   line="""Batching raises throughput and fights TTFT. I pick for the product: snappy chat versus fat offline batches. I measure both numbers and I do not let GPU util eat the typing indicator.""",
   key_points=[
    "Bigger batches: more tokens/s, worse TTFT.",
    "Chat vs batch jobs want opposite points.",
    "Continuous batching helps but does not remove the trade-off.",
    "Measure system throughput and per-user TTFT.",
    "Separate queues if the workloads disagree.",
    "Busy-hour slowness is often queue + batch.",
   ],
   questions=[
    q("recall", "How do batching and TTFT fight?", "Waiting for or sharing a larger batch increases GPU efficiency and delays the first token for each user."),
    q("apply", "How would you serve interactive chat and nightly summaries on one cluster?", "Two queues or endpoints with different batch/latency settings, or time-share. Do not use one max-throughput knob for both."),
    q("debug", "GPU util is 95% and users say the box is dead. What happened?", "You optimised throughput. Lower batch wait, add cap on queue time, or scale out."),
    q("apply", "What is continuous batching in one line?", "The server inserts new requests as others finish, instead of waiting for a whole static batch to end."),
    q("recall", "Which metric for a batch job?", "Tokens per second (and cost per document). TTFT is secondary if no one is watching."),
   ],
   links=[
    {"title": "vLLM: serving", "url": "https://docs.vllm.ai/en/latest/serving/engine_args.html"},
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
   ],
  ),
  "speculative-decoding-at-a-glance": entry(
   what="""**Speculative decoding** uses a **cheap draft model** (or draft head) to **propose several future tokens**; the **large model verifies** them in one pass. If they match what the large model would have chosen, you **accept a chunk** and skip some sequential steps. If not, you reject and fall back. You get **higher tokens/s** when the draft is good, with the **same distribution** as the large model (when implemented correctly).

It is an inference trick, not a new brain. Quality should match the verifier. Speed depends on accept rate.

You will see it as a serving feature, not as an API parameter on every vendor.""",
   why="""Interviewers like a one-liner to see if you read past prefill/decode. On the job it is why a host claims 2× tokens/s on the same 70B. You should ask about accept rate and whether quality was checked.

Do not promise it in a design unless the stack supports it.""",
   how="""Draft (1–2B) proposes 4 tokens. Verifier (70B) checks them in parallel against its own distribution. Accept the prefix that matches; sample a correction at the first mismatch.

If the draft is too dumb, accept rate is low and you lose. If the draft is from the same family, accept rate is higher.

Product: enable it on decode-heavy workloads (long answers) after an eval. Prefill-heavy workloads gain less.

This is not "a small model plus a large model" as a product cascade — the user only sees the verifier's distribution.""",
   failures="""1. **A draft that changes quality** because verification is sloppy.

2. **Expecting speedup on tiny outputs.**

3. **A mismatched draft family** with terrible accept rates.

4. **Calling it a reasoning method.**""",
   line="""A cheap draft proposes tokens; the large model verifies them. Good accept rates raise tokens/s without changing the large model's distribution. I treat it as a serving option I eval, not as a new model.""",
   key_points=[
    "Draft proposes; large model verifies.",
    "Accept matching prefixes; correct at mismatch.",
    "Same quality as the verifier if done right.",
    "Speedup depends on accept rate.",
    "Helps decode-heavy loads more.",
    "A serving trick, not a product cascade.",
   ],
   questions=[
    q("recall", "What is speculative decoding?", "A small draft model proposes several tokens; the large model verifies them in one pass and accepts the matching prefix."),
    q("apply", "When would you turn it on?", "Long-output workloads on a stack that supports it, after you check quality and tokens/s. Not for one-token classifications."),
    q("debug", "Speedup is 1.05× and GPU use went up. Cause?", "Low accept rate — the draft is a bad match. Change the draft or turn it off."),
    q("apply", "Does the user see the draft model's mistakes?", "Not if verification is correct: rejected drafts are dropped. The visible distribution should be the large model's."),
    q("recall", "Is this the same as a router that sends easy traffic to a small model?", "No. That is a cascade with a different quality profile. Speculative decoding aims to keep the large model's output."),
   ],
   links=[
    {"title": "vLLM: speculative decoding", "url": "https://docs.vllm.ai/en/latest/features/spec_decode.html"},
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
   ],
  ),
  "interview": entry(
   what="""**Explain a slow first token:** **Prefill is compute-bound on the whole prompt**; **long context raises TTFT**. Add queueing if the API is busy. Do not start with "the GPU is old". Do not start with temperature.

If they ask what you would do: shrink or cache the prompt, measure TTFT vs decode, check queue depth. Thirty seconds.""",
   why="""This is the inference interview. It tests prefill vs decode. On the job it is the first message in the incident channel when chat feels dead but tokens/s is fine.""",
   how="""Talk track:

"Time to first token is mostly prefill plus queue. Prefill walks the whole prompt, so a long system message, a fat RAG dump, or a long history makes the first token late. Decode has not started yet. I would log TTFT, prompt tokens, and queue time. I would shrink the prompt, move the static part to a prefix cache, and only then look at GPUs. If the first token is fine and the rest is slow, that is decode, a different fix."

If they add "reasoning model": hidden prefill/decode for thinking can delay the visible first token too.""",
   failures="""1. **Blaming sampling.**

2. **Talking only about tokens/s.**

3. **Ignoring queue.**

4. **A 5-minute CUDA lecture.**""",
   line="""A slow first token is prefill on a long prompt, plus queue. I measure TTFT and prompt tokens, I shrink or cache the prefix, and I do not tune temperature. If the first token is fine, I look at decode instead.""",
   key_points=[
    "TTFT ≈ prefill + queue.",
    "Long context raises prefill.",
    "Not a sampling problem.",
    "Fix: shrink, cache, less queue.",
    "If TTFT is fine, the issue is decode.",
    "Reasoning can hide extra work before the visible first token.",
   ],
   questions=[
    q("apply", "Explain a slow first token.", "Prefill is compute-bound on the whole prompt, so long context raises TTFT. Queueing adds wait. I would measure TTFT and prompt tokens, then shrink or cache the prefix."),
    q("recall", "Does temperature change TTFT much?", "Not in any way you should start with. TTFT is prefill and queue, not the choose step's personality."),
    q("debug", "tokens/s is healthy, users stare at a blank box. Where do you look?", "TTFT: prompt length, cache misses, queue. The decode path is fine."),
    q("apply", "What is the first log line you want?", "prompt_tokens, ttft_ms, queue_ms. Without those you will debate GPUs in the dark."),
    q("recall", "Why does RAG often hurt TTFT?", "You just made the prompt much longer. Prefill grew. Retrieve less, or cache the static part."),
   ],
   links=[
    {"title": "NVIDIA: inference optimization", "url": "https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/"},
    {"title": "OpenAI: prompt caching", "url": f"{OAI}/guides/prompt-caching"},
   ],
  ),
 }
}
