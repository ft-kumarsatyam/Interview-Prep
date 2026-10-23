from helper import note
from links import OA_LAT, OA_CACHE, GEM_LC, OA_PROD

L = [OA_LAT, OA_PROD]

NOTES = {
    "m9-4": {
        "breaking-latency-into-components": note(
            what="""You cannot optimise what you have not decomposed. End-to-end latency is a **critical path** of: network and gateway, pre-processing (rewrite, embed, retrieve, rerank, ACL), prompt assembly, **TTFT** (queue + prefill, grows with input), **decode** (output tokens × time per token), tool calls, and post-processing (validate, guards, writes).

Instrument with **distributed tracing**, one span per stage, p50/p95/p99 per stage and route. An illustrative mix: retrieval 120 ms, rerank 150 ms, TTFT 600 ms, decode 2.5 s. Decode dominates, so cutting output or streaming beats micro-optimising retrieval.""",
            why="""This is the first move in any latency interview. On the job, guessing 'the model is slow' wastes weeks.""",
            how="""Add spans. Look at p95, not the happy path. If TTFT dominates, cut prompt or cache the prefix. If decode dominates, cap tokens or use a faster decoder. If tools dominate, parallelise or cache. Fix the largest bar first.""",
            fails="""1. **No traces**, only an end-to-end timer.

2. **Optimising a 5% span.**

3. **Average instead of p95.**

4. **Blaming the model** when retrieval is 2 s.""",
            line="I break latency into retrieval, TTFT, decode, tools, and network, I trace p95 per span, and I fix the largest bar first. Averages and untraced 'the model is slow' are not a plan.",
            kps=[
                "Decompose: retrieve, TTFT/prefill, decode, tools, network.",
                "Trace p50/p95/p99 per stage and route.",
                "Fix the largest bar first.",
                "TTFT grows with input; decode grows with output.",
                "Averages hide the tail.",
                "Do not guess which component dominates.",
            ],
            qs=[
                {"q": "A trace shows decode time is 80% of a 5 s response. Which change is most impactful?", "a": "Cap or shorten output, use a faster model for decode, or stream so perceived wait drops. Shrinking a 100 ms retrieve will not save you.", "kind": "apply"},
                {"q": "What primarily drives TTFT on a long RAG prompt?", "a": "Prefill over the input tokens, plus any queue. Cut or cache the prefix; do not only buy a 'faster' brand.", "kind": "recall"},
                {"q": "Why is an end-to-end timer not enough?", "a": "You cannot tell retrieve from prefill from decode from tools. You will optimise the wrong bar.", "kind": "debug"},
                {"q": "What percentiles do you put on each span?", "a": "p50, p95, p99. p95 is the product number; p99 finds the disasters.", "kind": "recall"},
                {"q": "You must cut TTFT for a RAG bot sending 12k tokens each call. First options?", "a": "Retrieve less, summarise, cache the stable prefix, drop always-on junk. Then consider a model with faster prefill.", "kind": "apply"},
            ],
            links=L,
            walk="""The dashboard is one number. You add spans and learn decode is the story. Output cap ships the same day. Retrieval work goes to the backlog.""",
            measure="""Coverage of spans; p95 per stage; changes that targeted a <10% bar.""",
        ),
        "streaming-for-perceived-latency": note(
            what="""**Streaming** sends tokens as they are produced so **time-to-first-token** becomes the perceived wait. Total generation time may stay the same; users forgive a long answer if it starts quickly. Stream when the UI is a chat or a long document. Do not stream when you must **check safety or schema before display**, or when the client is a machine that wants one JSON object.

Streaming is a UX lever, not a cost lever, and it complicates cancellation, citations that arrive late, and output guards.""",
            why="""Interviewers ask when streaming is wrong. On the job, a safety team will reject stream-then-moderate.""",
            how="""Chat: stream, show a cursor, allow stop. Structured API: buffer, validate, then return. Mixed: stream a narrative and attach citations at the end, or delay the first paint until a fast safety pass. Measure TTFT and time-to-usable-answer separately.""",
            fails="""1. **Streaming unscreened tokens.**

2. **Streaming JSON** that the client parses incrementally and crashes.

3. **Thinking streaming cut GPU time.**""",
            line="Streaming improves perceived latency by cutting time-to-first-token. I use it for chat, I buffer when safety or a schema must pass first, and I do not pretend it made the model cheaper.",
            kps=[
                "Users forgive long total if the first token is fast.",
                "Stream chat; buffer machine and high-risk output.",
                "Streaming is UX, not cost.",
                "Guards and citations get harder when you stream.",
                "Measure TTFT and time-to-usable-answer.",
                "Do not stream-then-moderate secrets onto the screen.",
            ],
            qs=[
                {"q": "Why is streaming risky for a route that must pass a safety check before display?", "a": "Tokens are already on the screen or in logs before the check finishes. Buffer, or use a fast first-pass plus retract — and do not call the first option 'moderated'.", "kind": "recall"},
                {"q": "When is streaming the wrong default?", "a": "Schema APIs, high-risk content, and clients that cannot handle partial JSON.", "kind": "apply"},
                {"q": "Does streaming reduce decode cost?", "a": "No. It changes when bytes arrive, not how many GPU-ms you spent.", "kind": "debug"},
                {"q": "What two times do you report for a streamed chat?", "a": "TTFT and time-to-complete or time-to-usable (e.g. first citation-ready paragraph).", "kind": "recall"},
                {"q": "How do you handle stop in a stream?", "a": "Client cancel cancels the provider call and the tool loop, and you still persist a partial trace.", "kind": "apply"},
            ],
            links=L,
            walk="""You stream FAQ and buffer refunds until the validator passes. Support CSAT on FAQ rises; legal stays unstreamed.""",
            measure="""TTFT; first-paint of unscreened text (zero); client parse errors on partial JSON.""",
        ),
        "parallelising-independent-work": note(
            what="""If two pieces of work do not depend on each other, run them concurrently so latency is the **max, not the sum**. Common: several retrievals, independent tool calls, guardrails alongside generation (cancel if the guard trips), embed-while-load, section generation for a report. Illustrative: three 400 ms lookups go from 1.2 s to ~400 ms.

Parallelism **does not cut cost** and can raise it (speculative work you throw away). Watch rate limits and partial failure: timeouts, proceed with what returned, or fail if a required source missed.""",
            why="""This is free latency if you were sequential by habit. Interviewers will give you three lookups.""",
            how="""Draw the dependency graph. Fan out where there are no edges. Bound concurrency. Example: docs + SQL + profile in parallel, then assemble. Do not start the model until required sources return or their timeout fires.""",
            fails="""1. **Sequential tools** the model emitted together.

2. **Unbounded fan-out** into 429s.

3. **Calling parallelism a cost win.**

4. **Waiting for the slowest optional source.**""",
            line="I parallelise independent retrievals and tools so latency is the max, not the sum. I bound concurrency, I handle partial failure, and I do not claim a cost win.",
            kps=[
                "Independent work runs concurrently.",
                "Latency becomes max, not sum.",
                "Cost stays the same or rises.",
                "Bound fan-out; watch 429s.",
                "Optional sources may timeout.",
                "Draw the dependency graph first.",
            ],
            qs=[
                {"q": "What is the effect of running three independent 400 ms lookups in parallel?", "a": "About 400 ms plus overhead, not 1.2 s. Cost is still three lookups.", "kind": "recall"},
                {"q": "When should you not wait for a source?", "a": "When it is optional and its p95 would blow the budget. Timeout and assemble without it, and record the miss.", "kind": "apply"},
                {"q": "The model emits five tool calls in one turn. What does the harness do?", "a": "Run the independent ones concurrently within a cap; serialise true dependencies; apply per-tool timeouts.", "kind": "apply"},
                {"q": "Why can speculative parallelism raise cost?", "a": "You start work you may discard when an earlier check fails.", "kind": "debug"},
                {"q": "What do you draw before you parallelise?", "a": "A dependency graph of the request. No edge means you may fan out.", "kind": "recall"},
            ],
            links=L,
            walk="""You change three sequential retrieves to a fan-out. p95 drops 700 ms. Cost is unchanged. You add a concurrency cap of 8.""",
            measure="""Sequential spans that could be parallel; 429s from fan-out; optional-source timeout rate.""",
        ),
        "when-a-smaller-model-will-do": note(
            what="""A **smaller or faster model** often matches a large one on classification, routing, extraction, simple FAQ, and rewrite — especially with a good prompt and RAG. Use it when the eval says quality is close enough and the triangle needs latency or cost. Do not use it as the only model on open-ended legal or medical generation unless you have a grounded pipeline and a human.

'Will do' is a measured sentence: same eval, same threshold, plus a slice for the hard tail you still escalate.""",
            why="""This is the cheapest latency win after tracing. Interviewers ask which tasks are least suited to a small model.""",
            how="""Run the small and large on the same 200 cases. If the small is −1 point and 4× faster, route 80% to it. Keep the large for the hard slice or for escalate. Inline code completion is a classic small-model fit; contract negotiation is not.""",
            fails="""1. **Small model on the hard tail** with no escalate.

2. **No eval**, just a blog that said 7B is enough.

3. **Small model with a 20k junk prompt** so you lose the speed.""",
            line="A smaller model will do when the eval says so on that task — classification, extraction, simple FAQ, completion. I keep a large model for the hard or high-risk tail. 'Will do' is a measured sentence, not a slogan.",
            kps=[
                "Measure small versus large on the same set.",
                "Good fits: classify, extract, simple FAQ, completion.",
                "Keep a large model for the hard or high-risk tail.",
                "A huge prompt can erase a small model's speed.",
                "'Will do' includes an escalate path.",
                "Do not pick small from a blog; pick from an eval.",
            ],
            qs=[
                {"q": "Which task is least suited to a small model without further work?", "a": "Open-ended high-stakes generation (legal advice, medical) without retrieval, checks, and a human. Classification and completion are better fits.", "kind": "recall"},
                {"q": "How do you justify moving FAQ to a small model?", "a": "Same eval, quality within the floor, p95 and cost down, and an escalate path for low-confidence or high-risk asks.", "kind": "apply"},
                {"q": "The small model is fast in a microbench and slow in prod. Why?", "a": "The prod prompt is huge. Prefill dominates. Cut context before you blame the model size.", "kind": "debug"},
                {"q": "For inline code completion, which model approach fits best?", "a": "A small, fast, specialised or distilled model with a tight window. A frontier chat model is usually the wrong latency class.", "kind": "apply"},
                {"q": "What do you keep when you go small?", "a": "The eval, the escalate route, and the schema. You are not throwing away the large model; you are reserving it.", "kind": "recall"},
            ],
            links=L,
            walk="""The 200-case FAQ eval is −0.8 points on the small model. You switch the default and keep escalate. p95 halves.""",
            measure="""Quality delta small vs large; share on the small model; escalate quality.""",
        ),
        "context-reduction-batching": note(
            what="""**Prompt and context reduction**, **batching**, and **inference-service** tricks (quantisation, speculative decoding, prefix cache) cut both TTFT and cost. Reduction: drop unused tools, summarise history, retrieve less, cap output. Batching: offline jobs and some embeddings share a batch; interactive chat usually cannot wait for a batch. Service tricks are what you ask a platform team for after you have cut the prompt.

Do reduction first. It is under your control and it helps every model.""",
            why="""Interviewers want the order: cut context, then cache, then batch/offline, then GPU tricks. On the job, teams skip to GPUs with 30k-token prompts.""",
            how="""Example: 12k RAG prompt → 4k after rerank and a tighter budget; batch nightly embeddings; leave chat unbatched; turn on provider prompt cache for the stable prefix. Measure quality after each cut.""",
            fails="""1. **GPU work with a filthy prompt.**

2. **Batching interactive chat.**

3. **Cutting the safety lines** to save 80 tokens.""",
            line="I reduce context first, I batch only work that can wait, and I use inference-service tricks after the prompt is clean. I will not cut safety text to save a few tokens, and I will not make a user wait for a batch.",
            kps=[
                "Cut context before you tune GPUs.",
                "Batch offline work, not interactive chat.",
                "Prefix cache loves a stable head.",
                "Measure quality after every cut.",
                "Do not delete safety lines for 80 tokens.",
                "Service tricks come after application cuts.",
            ],
            qs=[
                {"q": "What do you do before asking for speculative decoding?", "a": "Cut unused context, retrieve less, cap output, and cache the prefix. Then the GPU tricks have less junk to chew.", "kind": "apply"},
                {"q": "A batch of nightly enrichment jobs delays interactive requests on shared GPUs. Best fix?", "a": "Isolate pools or queues; batch the night job; reserve interactive capacity. Do not batch the chat into the night job.", "kind": "debug"},
                {"q": "When is batching appropriate?", "a": "Embeddings, evals, offline classify — work that can wait tens or hundreds of milliseconds or more. Not a typing user.", "kind": "recall"},
                {"q": "Why re-eval after context reduction?", "a": "You may have dropped the clause that decided the answer. Quality per token is the metric.", "kind": "apply"},
                {"q": "What must you not cut to save tokens?", "a": "Safety, ACL-related rules, and the output schema. Cut retrieval junk and old history first.", "kind": "recall"},
            ],
            links=[OA_CACHE, OA_LAT],
            walk="""You cut 8k of retrieved junk, enable prefix cache, and leave chat unbatched. TTFT drops; the eval holds. GPU work is a later ticket.""",
            measure="""Input tokens per success; batch-versus-interactive isolation; quality after cuts.""",
        ),
        "throughput-utilization-at-scale": note(
            what="""At scale you care about **throughput** (requests or tokens per second), **latency**, and **utilisation** (how full the GPUs or reserved capacity are). They fight: packing batches raises utilisation and throughput and often **hurts latency**. KV-cache memory limits concurrent sequences on a self-hosted GPU. A 100% utilised GPU with a 12 s p95 is a bad product.

Design: separate interactive and batch pools; autoscale on queue time; reserve capacity for the SLO; measure tokens/s and concurrent sequences, not only QPS.""",
            why="""This is the on-prem and reserved-capacity conversation. Interviewers ask what limits concurrency.""",
            how="""Self-host: KV cache per sequence ≈ layers × hidden × 2 × bytes × seqlen. That is why long contexts kill concurrency. Product fix: shorter prompts, more GPUs, or a provider. Interactive pool never takes the batch queue.""",
            fails="""1. **One pool** for chat and embed-all-the-PDFs.

2. **Utilisation as the north-star** (it will eat your p95).

3. **QPS without token size.**""",
            line="At scale I separate interactive and batch, I treat utilisation as a constraint not a goal, and I remember KV-cache memory limits concurrent sequences. A full GPU with a 12 s p95 is a miss.",
            kps=[
                "Throughput, latency, and utilisation fight.",
                "KV cache limits concurrent sequences.",
                "Separate interactive and batch pools.",
                "Utilisation is not the north-star for chat.",
                "Measure tokens/s and queue time, not only QPS.",
                "Long prompts shrink concurrency.",
            ],
            qs=[
                {"q": "What primarily limits concurrent sequences on a self-hosted GPU?", "a": "KV-cache memory (and compute). Longer contexts mean fewer concurrent sequences.", "kind": "recall"},
                {"q": "Why is 100% GPU utilisation a warning for a chat SLO?", "a": "There is no slack for spikes; p95 will suffer. Reserve headroom for interactive.", "kind": "debug"},
                {"q": "How do you isolate nightly jobs?", "a": "A separate pool or a queue with lower priority and a cap, never the interactive replica set.", "kind": "apply"},
                {"q": "Why is QPS a poor lone metric?", "a": "A 20k-token request is not a 200-token request. Tokens/s and p95 tell the truth.", "kind": "recall"},
                {"q": "What do you autoscale on?", "a": "Queue time or tokens in flight against the SLO, not average utilisation alone.", "kind": "apply"},
            ],
            links=L,
            walk="""Chat p95 blows up at 02:00. You find the embed job on the same pool. You split pools. Utilisation on the batch pool hits 90% and nobody cares.""",
            measure="""Interactive p95 during batch; reserved headroom; concurrent sequences vs prompt length.""",
        ),
        "streaming-as-perceived-latency": note(
            what="""**Users forgive a long total if the first token is fast.** This is the product slogan for streaming. It is why you stream chat even when total time is 8 s, and why you obsess over TTFT more than over shaving 200 ms of decode at the end. It is also why a 400 ms spinner with no tokens feels worse than an 8 s streamed answer.

Use the slogan, then add the caveat: not when safety or schema must go first.""",
            why="""It is the sentence PMs remember. Interviewers want the caveat too.""",
            how="""Set a TTFT SLO (e.g. 800 ms) separate from complete SLO. Optimise prefill and queue for the first; decode and length for the second. Show tokens immediately on FAQ; do not on refunds.""",
            fails="""1. **One SLO for both.**

2. **A beautiful complete time** with a 4 s blank screen.

3. **Streaming as an excuse** not to cut output length.""",
            line="Users forgive a long total if the first token is fast. I set a TTFT SLO, I stream chat, and I still buffer high-risk output. Streaming is not a licence to ignore total time or safety.",
            kps=[
                "TTFT is the perceived-latency number for chat.",
                "A blank screen feels worse than a long stream.",
                "Separate TTFT and complete SLOs.",
                "Caveat: safety and schema may require a buffer.",
                "Streaming does not excuse unbounded output.",
                "Refunds may not stream even if FAQ does.",
            ],
            qs=[
                {"q": "Why can an 8 s streamed answer beat a 3 s buffered one in CSAT?", "a": "Tokens appear immediately; the user is not staring at a spinner. Perceived wait tracks TTFT more than total for chat.", "kind": "recall"},
                {"q": "What SLO do you add besides complete time?", "a": "TTFT (and maybe time-to-usable). Complete time still matters for tools that block a next step.", "kind": "apply"},
                {"q": "When do you ignore this slogan?", "a": "When the first tokens might be unsafe or break a schema. Then you buffer.", "kind": "debug"},
                {"q": "Does this slogan mean you can ignore total time?", "a": "No. Long totals still cost money and block follow-up actions. It means you prioritise TTFT for chat UX.", "kind": "recall"},
                {"q": "How do you apply it differently to FAQ versus refunds?", "a": "Stream FAQ. Buffer refunds until validation. Same product, two policies.", "kind": "apply"},
            ],
            links=L,
            walk="""You split SLOs: TTFT 800 ms on FAQ, complete 4 s. You stream FAQ. CSAT moves. Refunds stay buffered.""",
            measure="""TTFT p95; blank-screen time; CSAT versus TTFT; high-risk routes that still stream (should be none).""",
        ),
        "prefill-vs-decode-costs": note(
            what="""**Long prompts hurt TTFT; long outputs hurt tokens and time.** Prefill (reading the prompt) is compute-heavy and grows with input length; it dominates TTFT. Decode is stepwise and grows with output length; it dominates total time and often the bill (output tokens are priced higher on many APIs). The optimisation is different: cut or cache input versus cap or steer output.

A 20k-token RAG dump with a 20-token answer is a prefill problem. A 800-token prompt with a 2k-token essay is a decode problem. Do not apply the same fix to both.""",
            why="""This is the mental model behind every latency and cost ticket. Interviewers will give you one of each.""",
            how="""Read the trace: if TTFT is huge and complete is only a bit larger, prefill. If TTFT is fine and the stream crawls, decode. Fixes: prefix cache and retrieve-less versus `max_tokens`, tighter instructions, and a smaller model on decode-heavy routes.""",
            fails="""1. **One 'make it faster' ticket** with no split.

2. **Caching output** when the problem was prefill.

3. **Raising max_tokens** 'to be safe' on a decode-heavy route.""",
            line="Long prompts hurt TTFT (prefill); long outputs hurt time and money (decode). I read the trace, I apply the matching fix, and I do not raise max_tokens to be safe on a decode-heavy route.",
            kps=[
                "Prefill scales with input and drives TTFT.",
                "Decode scales with output and drives total time and often cost.",
                "Different fixes: cache/cut input vs cap output.",
                "Read the trace before you pick a fix.",
                "Output tokens are often priced higher.",
                "Do not raise max_tokens 'to be safe'.",
            ],
            qs=[
                {"q": "A 20k prompt produces 15 tokens and TTFT is 3 s. Prefill or decode?", "a": "Prefill. Cut or cache the prompt. Decode is not the story.", "kind": "apply"},
                {"q": "A 1k prompt streams for 12 s. Prefill or decode?", "a": "Decode. Cap output, tighten the ask, or use a faster decoder.", "kind": "apply"},
                {"q": "Why do output tokens often dominate the bill even when input is longer?", "a": "Many APIs price output higher, and a chatty model will spend them. Cap and instruct briefly.", "kind": "recall"},
                {"q": "How does prompt caching change the prefill story?", "a": "A stable prefix can be much cheaper and faster on later calls. It does not help a unique 20k tail.", "kind": "recall"},
                {"q": "Someone raises max_tokens to 4k 'just in case'. What happens?", "a": "Decode and cost grow on the long tail. Set a task-appropriate cap.", "kind": "debug"},
            ],
            links=L,
            walk="""Two tickets, two fixes: you cache a 8k prefix; you drop max_tokens from 4k to 512 on FAQ. Both p95s move for different reasons.""",
            measure="""TTFT versus input length; complete time versus output tokens; max_tokens by route.""",
        ),
    }
}
