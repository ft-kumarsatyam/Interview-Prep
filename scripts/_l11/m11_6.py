from assemble import entry

NOTES = {
 "m11-6": {
  "the-open-weight-hosting-ladder": entry(
   what="""The **open-weight hosting ladder** is the spectrum between calling a closed API and racking GPUs: **model hubs** (download and inspect checkpoints), **serverless inference providers** (per-token, no GPU visible), **GPU compute platforms** (you bring the serving image; they schedule hardware), and **your own servers**. Each rung adds control and operational work. You climb only when a lower rung fails a constraint (data boundary, cost at volume, licence, latency).

People say "we self-host" at every rung except the first. Be precise. Together is not your cluster. Modal is not your cluster. vLLM on a box you SSH into is.""",
   why="""On the job, picking the wrong rung is expensive: you either leak data to a host you did not review, or you staff GPU on-call for a 5% utilised box. In interviews, naming the four rungs in order is a clean Level 11 answer. Then place a workload on one rung with a reason.

This ladder is how open weights stopped meaning "buy NVIDIA".""",
   how="""Place workloads:

- Prototype / public data: serverless host, pin the slug.
- Production, must stay in VPC: compute platform in your account or your own vLLM.
- High steady volume, cheap 8B: own or reserved GPUs.
- Just finding a checkpoint: hub only, no serving yet.

Example: a 7B classifier at 30M tokens/day. Serverless is simple but the bill grows linearly. At 70% GPU util the compute-platform rung wins. You move when the spreadsheet says so, not when a blog says "always self-host".""",
   failures="""1. **Calling every host 'self-host'.**

2. **Jumping to own servers** without utilisation.

3. **Hub download into prod** without a serving plan.

4. **Staying on serverless** after the data class forbids it.""",
   line="""Open-weight serving is a ladder: hub, serverless inference, GPU compute platform, own servers. I name the rung, I climb only when a constraint forces it, and I do not call a public host 'self-host'.""",
   key_points=[
    "Rungs: hub, serverless inference, GPU compute platform, own servers.",
    "Each rung trades ops for control and cost shape.",
    "Say the rung; do not say 'self-host' for a public API.",
    "Climb when data, cost-at-volume or latency forces it.",
    "The hub is for finding and trusting checkpoints, not for serving users.",
    "Move rungs when the spreadsheet says so.",
   ],
   questions=[
    {"q": "Name the rungs of the open-weight hosting ladder.", "a": "Model hubs, serverless inference providers, GPU compute platforms where you bring the serving stack, and your own servers.", "kind": "recall"},
    {"q": "A team says they self-host because they call Together. What rung are they on?", "a": "Serverless inference. Prompts still leave their account unless that host is an approved in-boundary processor.", "kind": "debug"},
    {"q": "When do you climb from serverless to a GPU compute platform?", "a": "When utilisation makes GPU hours cheaper, or when you must run your own image/VPC and still do not want to own the data centre.", "kind": "apply"},
    {"q": "What is the hub for if it does not serve users?", "a": "Finding models, reading cards and licences, and judging whether a checkpoint is trustworthy before you pick a serving rung.", "kind": "recall"},
    {"q": "Why not start on your own servers?", "a": "Highest ops. Start at the lowest rung that satisfies data and quality; climb with numbers.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face Hub docs", "url": "https://huggingface.co/docs/hub/en/index"},
    {"title": "vLLM documentation", "url": "https://docs.vllm.ai/en/latest/"},
   ],
  ),
  "model-hubs-checkpoint-trust": entry(
   what="""A **model hub** (Hugging Face is the default) is where you **find** open-weight models, read **cards**, check **licences** and **gated access**, and judge whether a **checkpoint is trustworthy**. Trust is: who uploaded it, whether weights are `safetensors` not raw pickle, whether the card matches a known org, whether the commit hash is the one you eval'd, and whether the licence allows your use.

Pickle checkpoints can run code on load. Random fine-tunes can be poisoned. "Llama" in the title is not Meta's release.

The hub is not a production host unless you choose their inference. Treat download as supply chain.""",
   why="""On the job, this is software supply-chain work applied to weights. In interviews, mentioning `safetensors`, gated access, and licence is the recall set. Mentioning pickle RCE is the debug set.

Legal will ask about the licence before you ask about BLEU. Show them the card first.""",
   how="""Checklist before a checkpoint enters any environment:

1. Publisher org, not a random fork.
2. Licence + acceptable-use + gate approval recorded.
3. `safetensors` (or an equivalent safe format).
4. Pin revision SHA; store it with evals.
5. Scan / known-hash if your security team requires it.

Example: a "sales-tuned Llama" from an unknown user ships as `.bin` pickle. You refuse it. You take the official instruct checkpoint, fine-tune it yourself if you must, and you serve that SHA.""",
   failures="""1. **Latest main**, no SHA.

2. **Ignoring gates** and then failing the download in CI.

3. **Licence last**, after the demo.

4. **Trusting a card that is empty.**""",
   line="""I treat a hub like a package registry: known publisher, licence, safe weight format, pinned SHA. Pickle from a stranger is a security incident I choose not to have. The card is evidence, not decoration.""",
   key_points=[
    "Read publisher, licence, gate, format and SHA before you serve.",
    "Prefer safetensors; pickle can execute code on load.",
    "Pin the revision you evaluated.",
    "Empty or forked cards are a trust smell.",
    "Gated models need recorded approval to download.",
    "The hub is supply chain, not just search.",
   ],
   questions=[
    {"q": "What do you check on a model card before shipping?", "a": "Publisher, licence and acceptable use, gated access, weight format, and a revision you can pin. Then you eval that exact SHA.", "kind": "recall"},
    {"q": "A checkpoint is a pickle from an unknown uploader. Main risk?", "a": "Arbitrary code execution on load, plus an untrusted weight supply chain. Prefer safetensors from a known org.", "kind": "debug"},
    {"q": "Why pin a commit SHA rather than `main`?", "a": "So evals and production refer to the same bytes. `main` moves.", "kind": "apply"},
    {"q": "The download fails in CI on a gated model. What was skipped?", "a": "Recording and configuring hub authentication / licence acceptance for the CI identity.", "kind": "debug"},
    {"q": "Who should see the licence before the demo becomes a product?", "a": "Legal (or a named licence owner), not only the engineer who clicked download.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "Safetensors", "url": "https://huggingface.co/docs/safetensors/en/index"},
    {"title": "Gated models", "url": "https://huggingface.co/docs/hub/en/models-gated"},
   ],
  ),
  "serverless-inference-providers": entry(
   what="""**Serverless inference providers** (Together, Fireworks, Groq, Replicate and similar) host popular open models behind a **per-token API**, often OpenAI-compatible. You never see a GPU. You pay for tokens, you pin their **slug**, and you live with their quantisation, template and region.

They are the fastest way to consume open weights. They are still **third-party processors**. Compatibility with OpenAI's API is a transport convenience, not behaviour equality.

Use them when data may leave and you want no GPU ops. Leave them when policy or cost-at-volume says so.""",
   why="""On the job they unstick prototypes. In interviews, the trap is treating them as "self-host" or as bit-identical to the hub checkpoint. Say: per-token, pin slug, re-eval, review as a vendor.

Latency can be excellent (Groq-style) or cold. Measure.""",
   how="""Integration:

- OpenAI-compatible client, `base_url` to the host, their slug as `model`.
- Pin slug in config; log it.
- Eval 50 cases vs your reference run.
- Vendor packet: terms, region, training.

Example: same 8B, two hosts, 6-point eval gap. Host B is 4-bit. You stay on A or you accept B's score. You do not average them.""",
   failures="""1. **Assuming OpenAI-compatible means GPT-identical.**

2. **No pin** — slugs move.

3. **Regulated text** on an unapproved host.

4. **No eval** versus reference.""",
   line="""Serverless hosts sell per-token open models and hide the GPU. I pin their slug, I eval that endpoint, and I review them as a processor. OpenAI-compatible is a wire format, not a quality promise.""",
   key_points=[
    "Per-token APIs for open models; no GPU ops.",
    "Still a third-party processor — review terms and region.",
    "Pin the host slug and eval that endpoint.",
    "OpenAI-compatible ≠ same behaviour as OpenAI or as the hub run.",
    "Quantisation and templates differ by host.",
    "Great for allowed-data prototypes and some prod if policy allows.",
   ],
   questions=[
    {"q": "What do you get from a serverless inference provider?", "a": "A per-token API for hosted open models without operating GPUs. You still own pin, eval, licence and vendor review.", "kind": "recall"},
    {"q": "Same model name, two hosts, different outputs. Likely cause?", "a": "Different quantisation, chat template, context cap or sampling defaults. Evaluate each slug.", "kind": "debug"},
    {"q": "When is a serverless host the wrong rung?", "a": "When prompts cannot leave your account/country or when the licence/host terms fail review.", "kind": "apply"},
    {"q": "Why is OpenAI-compatible a limited claim?", "a": "It matches request shape, not model behaviour, tools or tokenisation.", "kind": "recall"},
    {"q": "What goes in the vendor packet for a host?", "a": "Terms (training/retention), region, subprocessors, and the exact slugs you use.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face inference providers", "url": "https://huggingface.co/docs/inference-providers/en/index"},
   ],
  ),
  "gpu-compute-platforms": entry(
   what="""A **GPU compute platform** (Modal, Baseten, RunPod and cousins) sits between serverless tokens and your own rack: **you bring the serving stack** (vLLM image, weights, env) and they **schedule, scale and bill the hardware**. You own the container and the model files. They own the machines and often the autoscaler.

You pay **per GPU-second** (plus storage), not per token. Cold starts, scale-to-zero and GPU type are your knobs. Data stays wherever their region and your VPC peering put it — read that, do not assume.

This rung is for teams that want a custom image or a specific checkpoint without hiring a full platform-GPU team.""",
   why="""On the job this is the usual "we need our weights in our image" answer. In interviews, contrast it with serverless (they pick the image) and with own servers (you pick the rack). Mention you still do model ops: batching, KV cache, health.

Compliance: some platforms can attach to your VPC; some cannot.""",
   how="""Typical deploy:

- Build an image with vLLM + pinned weights SHA.
- Choose GPU type from a memory estimate.
- Min replicas = 0 or 1 depending on cold-start SLO.
- Autoscale on concurrency.
- Health: /v1/models and a synthetic prompt.

Example: a 13B LoRA that no serverless host offers. You ship the image on a compute platform in an allowed region, min=1 during business hours, 0 at night. You accept a cold start at 8:01 or you pay for the warm replica.""",
   failures="""1. **Scale-to-zero on an interactive SLO.**

2. **Wrong GPU** — OOM on KV cache, not on weights.

3. **Assuming VPC** that does not exist.

4. **No pin of the image digest.**""",
   line="""On a GPU compute platform I bring the serving image and they bring the hardware schedule. I pay GPU time, I size for weights plus KV cache, and I treat cold start as a product choice. It is not serverless tokens and it is not my data centre.""",
   key_points=[
    "You bring the image and weights; they schedule GPUs.",
    "Billing is GPU time, so utilisation matters.",
    "Size memory for weights + KV cache, not weights alone.",
    "Min replicas are an SLO decision.",
    "Read region and VPC options; do not assume in-boundary.",
    "Pin image digest and weight SHA.",
   ],
   questions=[
    {"q": "What does a GPU compute platform add compared with a serverless token API?", "a": "You bring the serving stack and checkpoint; they schedule and bill hardware. You gain custom images and pay GPU time instead of tokens.", "kind": "recall"},
    {"q": "Interactive chat on scale-to-zero has 60s first tokens. What do you change?", "a": "Keep a minimum warm replica during user hours. Cold start loads weights and is not an SLO you can hide.", "kind": "debug"},
    {"q": "Why might a box OOM when weights fit?", "a": "KV cache grows with layers, heads, context and batch. Size for that, not just parameter bytes.", "kind": "apply"},
    {"q": "When is this rung better than your own servers?", "a": "When you want custom serving without owning racks, drivers and capacity planning — and the platform's region/VPC meets policy.", "kind": "apply"},
    {"q": "What do you pin besides the model SHA?", "a": "The container digest and the serving engine version (vLLM/TGI).", "kind": "recall"},
   ],
   links=[
    {"title": "vLLM serving", "url": "https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html"},
   ],
  ),
  "serving-it-yourself-with-vllm": entry(
   what="""**Serving it yourself with vLLM** (or TGI, or Ollama for local) means you run the engine that does **continuous batching** and **KV-cache reuse**. A naive "one request per process, reload weights" loop wastes most of a GPU. vLLM keeps many requests in flight, pages the KV cache, and exposes an OpenAI-shaped server.

You now own: image, GPU drivers, autoscaling, health, upgrades, and the SLO. Ollama is fine on a laptop. It is not a production multi-tenant server. TGI is another production engine with its own knobs.

The point of this topic is why batching exists, not a vendor war.""",
   why="""On the job, a poorly served 70B looks "expensive and slow" when the engine is the bug. In interviews, define continuous batching and KV-cache reuse in a sentence each. Mention that throughput (tokens/s/GPU) is the utilisation metric.

Also mention chat templates: the engine must use the one the model was trained with.""",
   how="""Mental model: the GPU runs a batch of decode steps across users. KV cache stores per-request attention state so you do not recompute the prompt every token. If cache does not fit, you evict or OOM.

Example: 8 concurrent chats, 4k context. Naive serial serve = 1× utilisation. vLLM batches them and reuses KV. Tokens/s/GPU jumps. You still set `max_num_seqs` and context so cache fits.

Health: ready only after weights are loaded. Do not put a cold process behind a load balancer that thinks it is up.""",
   failures="""1. **Flask + generate() per request** on a big GPU.

2. **Wrong chat template** — quality looks like a bad model.

3. **Ready probe too early** — 502 storm on deploy.

4. **Ollama in prod** without an SLO.""",
   line="""I serve with an engine that continuous-batches and reuses KV cache because a naive request loop wastes the GPU. I own the SLO, the template and the ready probe. vLLM/TGI are production; a laptop server is a laptop server.""",
   key_points=[
    "Continuous batching keeps the GPU busy across concurrent requests.",
    "KV-cache reuse avoids recomputing the prompt every token.",
    "A naive request loop wastes most of a GPU.",
    "Use the model's chat template.",
    "Ready probes must wait for weights.",
    "Ollama is local; production needs an engine and an SLO.",
   ],
   questions=[
    {"q": "Why does a naive request loop waste a GPU?", "a": "It underfills the device and recomputes work an engine would batch and cache. Continuous batching plus KV reuse is how utilisation appears.", "kind": "recall"},
    {"q": "What is the KV cache for?", "a": "Storing per-request attention state so later tokens do not recompute the whole prompt. It grows with context, batch, layers and heads.", "kind": "recall"},
    {"q": "Quality crashed after you moved from a notebook to vLLM. First check?", "a": "Chat template, stop tokens and sampling defaults — then quantisation. The engine is a different wrapper around the same weights.", "kind": "debug"},
    {"q": "Load balancer sends traffic during weight load. What do you fix?", "a": "A readiness probe that fails until the engine reports loaded, plus surge protection on deploy.", "kind": "apply"},
    {"q": "When is Ollama the wrong production choice?", "a": "When you need multi-tenant SLOs, continuous batching at scale, or a supported serving path. Keep it for local dev.", "kind": "apply"},
   ],
   links=[
    {"title": "vLLM documentation", "url": "https://docs.vllm.ai/en/latest/"},
    {"title": "Text Generation Inference", "url": "https://huggingface.co/docs/text-generation-inference/en/index"},
   ],
  ),
  "per-token-vs-per-gpu-hour": entry(
   what="""**Per-token versus per-GPU-hour** is the cost comparison that decides serverless versus reserved hardware. Per-token grows linearly with use and is zero when idle. Per-GPU-hour is a **fixed burn** that looks cheap only when the card is **busy**. The utilisation point where hardware wins is a spreadsheet: GPU $/hour ÷ tokens/hour you actually sustain, versus host $/token.

Include people on the GPU-hour side. Include egress and failed capacity.

The flip point is often higher than enthusiasts claim because idle nights exist.""",
   why="""On the job this is the argument with Finance. In interviews, state the unit conversion and the utilisation caveat. A 20% utilised GPU is about 5× the useful-token cost of a full one (illustrative).

Do not compare a frontier per-token price to an 8B GPU hour without matching quality.""",
   how="""```
cost_per_m_tok_gpu = (gpu_hour_price / tokens_per_hour) * 1e6
```
tokens_per_hour comes from measured tokens/s × 3600 × utilisation, not from a blog peak.

Example: GPU $2/hour, sustained 4k tokens/s at 60% util → lots of tokens; compare to $0.10 / M on a host. If you only run 2 hours a day, divide by calendar hours you still pay.

Write the flip point in tokens/day.""",
   failures="""1. **Peak tokens/s as if 24/7.**

2. **Omitting people.**

3. **Comparing unlike models.**

4. **Forgetting you pay the GPU while eval jobs idle it.**""",
   line="""Per-token is linear and idle-free. Per-GPU-hour wins only at sustained utilisation after people. I convert both to cost per million tokens at measured tokens/s and I write the flip point. Peak blog throughput is not utilisation.""",
   key_points=[
    "Convert GPU hours to cost per million tokens at measured utilisation.",
    "Idle time and people belong on the GPU side.",
    "A low-util GPU multiplies useful-token cost.",
    "Compare matched models and matched quality.",
    "Write the daily token flip point.",
    "Do not use peak tokens/s as 24/7 reality.",
   ],
   questions=[
    {"q": "How do you compare per-token and per-GPU-hour pricing?", "a": "Turn GPU hours into cost per million tokens using measured tokens/s and utilisation, add people/idle, and compare to the host's token price for the same quality.", "kind": "recall"},
    {"q": "A 20%-utilised dedicated GPU costs about how much more per useful token than fully utilised (illustrative)?", "a": "About 5×, because the hourly cost is spread over one-fifth the tokens.", "kind": "apply"},
    {"q": "Why do nights matter even if days are busy?", "a": "If you pay 24h for an 8h load, utilisation collapses and per-token hardware cost rises.", "kind": "debug"},
    {"q": "What measured number do you need besides GPU price?", "a": "Sustained tokens per second on your mix (not a blog peak) and the hours you actually pay.", "kind": "apply"},
    {"q": "When does per-token stay winning at high volume?", "a": "When the host's unit price is still below your utilised GPU cost, or when you cannot staff the GPU.", "kind": "recall"},
   ],
   links=[
    {"title": "vLLM performance", "url": "https://docs.vllm.ai/en/latest/latest/performance/overview.html"},
   ],
  ),
  "cold-starts-scale-to-zero": entry(
   what="""**Cold starts and scale-to-zero** mean a deployment that **idles cheaply** may **answer its first request slowly** because weights load onto the GPU (and sometimes the machine itself boots). Interactive chat rarely tolerates a 30–90s first token after idle. Batch and internal tools often can.

Scale-to-zero is a cost feature. Warm replicas are an SLO feature. You pick per environment and per hour of day.

The first request after scale-up is not a typical request. Measure it separately from warm p95.""",
   why="""On the job, this is the 8:01 a.m. outage. In interviews, define cold start, say why weights cause it, and offer min-replicas during user hours. Mention scale-to-zero is fine for nightly jobs.

Do not hide cold start behind a 60s client timeout and call it flaky.""",
   how="""Policy:

- Prod chat: min=1 (or more) 08:00–20:00, min=0 overnight if policy allows a slow first user — or keep min=1 always if cheap enough.
- Batch: min=0, accept cold start in the job runtime.
- Probe: do not mark ready until a tiny generate succeeds.

Example: scale-to-zero saved $400/month and burned the morning standup. You set min=1 on weekdays. The spreadsheet still won versus a 24/7 larger reservation.""",
   failures="""1. **min=0 on a human-facing SLO.**

2. **Ready = process up**, not model loaded.

3. **Averaging cold and warm** into one p95 that looks "fine".

4. **No scheduled scale-up** before a known event.""",
   line="""Scale-to-zero saves idle GPU money and spends it as a slow first request. I keep a warm replica when humans are waiting, I measure cold start separately, and I never mark ready before weights are loaded.""",
   key_points=[
    "Cold start is weight (and machine) load after idle.",
    "Scale-to-zero is a cost knob; min replicas are an SLO knob.",
    "Measure cold and warm latency separately.",
    "Ready means a generate has succeeded, not just that the process exists.",
    "Batch can tolerate cold start; interactive chat often cannot.",
    "Pre-warm before known events.",
   ],
   questions=[
    {"q": "Why is the first request after idle slow on self-hosted models?", "a": "Weights (and maybe the VM) load onto the GPU. That is a cold start, not model slowness in the steady state.", "kind": "recall"},
    {"q": "Interactive chatbot, scale-to-zero, 60s first replies. Best change?", "a": "Keep a minimum warm replica during user hours. Do not raise temperature or model size.", "kind": "apply"},
    {"q": "Why split cold and warm p95?", "a": "A blended p95 hides an SLO-breaking first-request tax that a few users always pay.", "kind": "debug"},
    {"q": "When is scale-to-zero the right default?", "a": "Batch, low-SLA internal tools, or nights when no human waits — if cold start fits the job budget.", "kind": "apply"},
    {"q": "What should a readiness probe prove?", "a": "That the engine has loaded weights and can complete a tiny generate, not merely that the port is open.", "kind": "recall"},
   ],
   links=[
    {"title": "vLLM production serving", "url": "https://docs.vllm.ai/en/latest/serving/engine_args.html"},
   ],
  ),
  "sizing-hardware-for-a-model": entry(
   what="""**Sizing hardware** starts from **parameter count × bytes per parameter**, then adds **KV-cache** (layers × heads × context × batch × bytes) and engine overhead. A 7B model at 16-bit is about 14 GB for weights (2 bytes × 7e9). 8-bit halves weights; 4-bit quarters them — quality is a separate measurement. Context length and concurrency often dominate the leftover memory.

Picking a GPU from the parameter count alone is how you OOM at 8k context. Memory decides the card; FLOPs decide how fast you decode once you fit.""",
   why="""On the job, this is the first-pass capacity plan. In interviews, the 7B×2 bytes ≈ 14 GB line plus "plus KV cache" is the expected sketch. Mention you would measure, not only multiply.

Also mention tensor parallelism when one card cannot fit.""",
   how="""Back of envelope:

```
weight_gb ≈ params_e9 * bytes_per_param
kv_gb ≈ layers * n_kv_heads * ctx * batch * 2 * bytes * 2 / 1e9
```
(The constants depend on architecture; the skill is knowing KV grows with ctx and batch.)

Example: 7B 16-bit on a 24 GB card looks fine until batch=8 and ctx=8k. Cache does not fit. You drop batch, drop context, quantise, or take a 40 GB card.

Record the assumption next to the instance type.""",
   failures="""1. **Weights-only sizing.**

2. **Using 7B-on-24GB folklore** for 32k context.

3. **Ignoring fragmentation / engine overhead.**

4. **No plan for peak batch.**""",
   line="""I size from weights plus KV cache plus overhead. 7B at 16-bit is about 14 GB of weights, but context and batch decide whether a 24 GB card actually works. Memory first, then speed.""",
   key_points=[
    "Weights ≈ parameters × bytes per parameter (2 for 16-bit).",
    "KV cache grows with layers, heads, context and batch.",
    "Quantisation shrinks weights; measure quality separately.",
    "OOM at long context is usually cache, not weights.",
    "Memory picks the GPU; FLOPs pick the latency once you fit.",
    "Write the assumptions next to the instance type.",
   ],
   questions=[
    {"q": "A 7B model at 16-bit needs roughly how much memory for weights (illustrative)?", "a": "About 14 GB (2 bytes × 7 billion), before KV cache and overhead.", "kind": "recall"},
    {"q": "Why can a 24 GB GPU that holds 7B weights still OOM?", "a": "KV cache for long context and concurrent sequences plus engine overhead exceeds the remainder.", "kind": "debug"},
    {"q": "What four terms drive KV-cache bytes?", "a": "Layers, KV heads, context length and batch (and the per-element width).", "kind": "recall"},
    {"q": "You need 32k context. What levers do you have if the card is tight?", "a": "Smaller batch, fewer concurrent seqs, quantisation, a larger GPU, or sliding/truncated context — measured on evals.", "kind": "apply"},
    {"q": "When do you add a second GPU?", "a": "When one card cannot hold weights+cache even after reasonable quantisation and batch=1, or when you need more throughput via parallelism.", "kind": "apply"},
   ],
   links=[
    {"title": "vLLM engine arguments", "url": "https://docs.vllm.ai/en/latest/serving/engine_args.html"},
   ],
  ),
  "what-hosting-open-weights-buys": entry(
   what="""**Hosting open weights** buys **predictable cost at volume**, **data that never leaves your boundary** (if you actually keep it there), and **full control of versions**. It asks for **serving skill, capacity planning, patching, and an SLO you own**. It does not automatically buy better quality than a closed model, and it does not buy compliance if you still log prompts to a US SaaS.

Be honest in the decision record: these three gains, these four costs. If you only wanted cheaper tokens at low volume, you bought a hobby cluster.""",
   why="""On the job this is the "why are we doing this" slide. In interviews, list buys vs asks. Mention that version control is a real gain when vendors retire APIs, and that data boundary is only real if the whole graph stays in-boundary.

Quality remains an eval, not a political stance.""",
   how="""Decision record section:

Buys: $ / task at 70% util; prompts on our disks; we pin SHA forever.
Asks: 0.5 FTE, on-call, GPU quota, upgrade treadmill.
Not bought: magic accuracy; automatic sector compliance.

Example: a bank hosts 8B in-VPC for classification. Frontier chat stays on the platform. Two paths, two reasons. Hosting everything would have asked more than it bought.""",
   failures="""1. **Hosting for fashion.**

2. **Data still leaving** via traces.

3. **No SLO**, so it is worse than the API you left.

4. **Unowned upgrades** — CVEs in the engine.""",
   line="""Hosting buys cost-at-volume, an in-boundary path, and version control. It asks for people, capacity and an SLO. I write both sides and I do not host a model just to say we host models.""",
   key_points=[
    "Buys: cost at high util, in-boundary data, version control.",
    "Asks: serving, capacity, patching, owned SLO.",
    "Does not buy quality by default — eval that.",
    "Boundary is only real if logs and embeds stay too.",
    "Host the workloads that use the buys; keep the rest on a platform.",
    "Unowned engines become a security problem.",
   ],
   questions=[
    {"q": "What three things does hosting open weights buy, and what does it ask?", "a": "Buys predictable high-volume cost, in-boundary data, and version control. Asks serving skill, capacity, patching and an SLO you own.", "kind": "recall"},
    {"q": "You host in-VPC but traces go to a US SaaS. What did you not buy?", "a": "A real data boundary. Prompt text still left.", "kind": "debug"},
    {"q": "When is hosting the honest call?", "a": "When volume or boundary or version-control needs exceed the ops you will actually staff — and evals say quality is enough.", "kind": "apply"},
    {"q": "Why might you host a classifier and not the chatbot?", "a": "The classifier has volume and a small model; the chatbot needs frontier quality the catalog already offers in-region.", "kind": "apply"},
    {"q": "What security ask comes with hosting?", "a": "Patching the engine and image, supply-chain for weights, and on-call for a new critical path.", "kind": "recall"},
   ],
   links=[
    {"title": "vLLM documentation", "url": "https://docs.vllm.ai/en/latest/"},
   ],
  ),
  "open-vs-closed-on-your-own-task": entry(
   what="""**Open versus closed on your own task** means you **run your eval set**, with **prompts tuned per model**, and you compare **cost per successful task** — not leaderboard rank, not a vendor blog, not a Twitter screenshot. Closed models often win messy reasoning. Open models often win classification, extraction and anything you can specialise. The winner is a table, dated.

Fairness: each model gets a prompt that fits it. Using a GPT-tuned prompt on Llama and calling Llama worse is a bad experiment.""",
   why="""On the job this ends religious arguments. In interviews, describing a fair eval is the whole answer. Mention leakage: do not tune on the test set.

Also mention that "open lost" can mean "we used the wrong size or template", not "open is bad".""",
   how="""Protocol:

1. Frozen golden set, held-out.
2. Prompt variants per family (not one prompt).
3. Same judge or human rubric.
4. Report quality, p95, $ / success.
5. Pick with constraints (region, licence) applied after the table.

Example: closed model 91% at $0.04/success; open 8B 88% at $0.004. For triage, open wins. For the 12% misses that are high-risk, you route those to closed. Routing is allowed; religion is not.""",
   failures="""1. **One prompt for all models.**

2. **Leaderboard as decision.**

3. **Tuning on the test set.**

4. **Ignoring $ / success.**""",
   line="""I compare open and closed on my golden set with per-model prompts and cost per successful task. Leaderboards are not my task. I am allowed to route; I am not allowed to pick a side without a table.""",
   key_points=[
    "Use your held-out set, not a leaderboard.",
    "Tune prompts per model family for a fair fight.",
    "Report quality, latency and cost per success.",
    "Apply region and licence after the quality table.",
    "Routing mixed winners is a valid outcome.",
    "A bad template can look like a bad model.",
   ],
   questions=[
    {"q": "What is a fair way to compare open and closed models?", "a": "Your own held-out eval, prompts tuned per model, and cost per successful task — plus latency. Not a leaderboard or a blog.", "kind": "recall"},
    {"q": "The open model looks terrible with the closed model's prompt. What do you do?", "a": "Write a prompt that fits the open model's template and style, then re-score. Do not conclude from a mismatched prompt.", "kind": "debug"},
    {"q": "Closed wins by 3 points but costs 10×. How might you decide?", "a": "Route: open for the cheap bulk, closed for high-risk misses, if the split is measurable. Or accept the 3 points if $ / success dominates.", "kind": "apply"},
    {"q": "Why hold out the golden set?", "a": "So prompt tuning does not leak into the score you use to choose.", "kind": "recall"},
    {"q": "Where do licence and region enter the comparison?", "a": "As filters after or beside the table. A winning closed model you cannot use in-region is not a winner.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face evaluate", "url": "https://huggingface.co/docs/evaluate/en/index"},
   ],
  ),
  "licence-and-gating-checks": entry(
   what="""**Licence and gating checks** happen **before you ship**, not after the customer asks. You read the model card for **licence**, **acceptable use**, and **gated access**. Some licences bar commercial use, some require share-alike on derivatives, some restrict sectors, some require a click-through that CI must also perform. Gating without a recorded approval means your build will fail on a clean machine — or worse, someone will bypass it with a random mirror.

Write the licence name, the date you read it, and who approved it in the decision record. Re-read when you change checkpoints.""",
   why="""On the job, legal will eventually ask. Surprise licences delay launches. In interviews, this is a short professional habit: card first, code second. Mention acceptable-use (no medical advice, no surveillance) as product constraints, not only OSI categories.

Mirrors that strip the licence are a supply-chain smell.""",
   how="""Gate in the pipeline:

1. Human approval ticket for licence + use case.
2. CI downloads only with the official gated credential.
3. SBOM / record of SHA + licence string.
4. Product review of acceptable-use vs your feature.

Example: you cannot use a non-commercial research checkpoint in a paid SaaS. You switch to an Apache-2.0 or a commercially allowed Llama licence variant and re-eval. The delay is a week, not a cease-and-desist.""",
   failures="""1. **Licence after launch.**

2. **Using an unofficial mirror** to skip the gate.

3. **Assuming Llama == commercial-ok** without reading that version.

4. **Fine-tunes that inherit a licence you did not re-read.**""",
   line="""I read licence, acceptable use and gating on the card before I serve a checkpoint. I record who approved it and I do not skip gates with a mirror. A demo that cannot be licensed is not a product.""",
   key_points=[
    "Read licence, acceptable use and gating before you ship.",
    "Record approval date and person in the decision record.",
    "CI must use official gated access, not a stray mirror.",
    "Fine-tunes inherit licence questions.",
    "Acceptable-use can block a feature even when the licence is permissive.",
    "Re-read when the SHA changes.",
   ],
   questions=[
    {"q": "What three things do you read on the card before shipping an open model?", "a": "Licence, acceptable-use restrictions, and whether access is gated — then record approval.", "kind": "recall"},
    {"q": "CI downloads from an unofficial mirror to skip a gate. What is the risk?", "a": "Untrusted weights and a licence bypass. Use the official gated path with a recorded credential.", "kind": "debug"},
    {"q": "A research-only licence is already in your SaaS. What do you do?", "a": "Stop using it in the paid path, switch to an allowed checkpoint, re-eval, and tell legal. Do not wait for a complaint.", "kind": "apply"},
    {"q": "Why re-check after a fine-tune?", "a": "The base licence plus your data and distribution can change what you are allowed to ship.", "kind": "apply"},
    {"q": "Who approves acceptable-use versus the feature you built?", "a": "A named product/legal owner. Engineers should surface the clause; they should not silently interpret it.", "kind": "recall"},
   ],
   links=[
    {"title": "Hugging Face licences", "url": "https://huggingface.co/docs/hub/en/repositories-licenses"},
    {"title": "Gated models", "url": "https://huggingface.co/docs/hub/en/models-gated"},
   ],
  ),
  "kv-cache-memory-math": entry(
   what="""**KV-cache memory math** estimates bytes from **layers, KV heads, context length, batch, and element width** before you pick a GPU. During decode the engine stores keys and values per layer per sequence. Longer context and more concurrent sequences grow this almost linearly. This is why a model that "fits" at 2k context OOMs at 32k.

You do not need a perfect formula in an interview; you need the dependencies and a rough multiply. In production you measure `nvidia-smi` and engine stats and you set `max_model_len` / `max_num_seqs` on purpose.

Bytes per element are 2 for fp16/bf16, 1-ish for fp8/int8 caches if enabled.""",
   why="""On the job this is the OOM ticket. In interviews, listing layers × heads × ctx × batch is the answer they want. Mention trading context vs concurrency.

Product: a "32k context" marketing line is a memory bill.""",
   how="""Sketch:

```
kv ≈ 2 * layers * n_kv_heads * head_dim * ctx * batch * elem_bytes
```
(2 for K and V; some models use GQA so n_kv_heads << n_heads.)

Example: doubling context doubles cache. Doubling batch doubles cache. You pick ctx=8k and batch=4 instead of ctx=32k and batch=8, and the 24 GB card lives.

Set engine caps so a single user cannot request 128k and evict everyone.""",
   failures="""1. **Ignoring GQA** (still must count KV heads).

2. **Unlimited max context** in the server.

3. **Sizing from weights only.**

4. **Forgetting the 2 (K and V).**""",
   line="""KV cache grows with layers, KV heads, context and batch. I estimate it before I pick a GPU and I cap max length and concurrency in the engine so one request cannot OOM the box.""",
   key_points=[
    "Cache ≈ K+V × layers × KV heads × context × batch × width.",
    "Context and concurrency are the usual OOM causes.",
    "Cap max_model_len and max_num_seqs on purpose.",
    "GQA reduces KV heads but does not delete the term.",
    "Measure on the real engine after the envelope math.",
    "A 32k marketing context is a memory decision.",
   ],
   questions=[
    {"q": "Which variables dominate KV-cache memory?", "a": "Layers, KV heads (and head dim), context length, batch/concurrency, and element width. Weights are a separate term.", "kind": "recall"},
    {"q": "You doubled max context and the GPU OOM'd. What happened?", "a": "Cache grew roughly linearly with context (and any extra reserved slots). Lower concurrency, quantise cache, or take more memory.", "kind": "debug"},
    {"q": "Why cap max_model_len on the server?", "a": "So one user cannot allocate a huge cache and evict or crash everyone else.", "kind": "apply"},
    {"q": "How does GQA change the math?", "a": "You multiply by the smaller n_kv_heads, not n_heads. It helps but still scales with context and batch.", "kind": "recall"},
    {"q": "What do you measure after the envelope estimate?", "a": "Real reserved memory under production-like batch and context on that engine, then set caps with headroom.", "kind": "apply"},
   ],
   links=[
    {"title": "vLLM KV cache internals", "url": "https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html"},
   ],
  ),
  "quantization-versus-quality-on-your-eval": entry(
   what="""**Quantisation versus quality** means you measure **8-bit and 4-bit (and the fp16 baseline)** on **the same held-out set**, not a blog's MMLU delta. Quantisation shrinks weights (and sometimes KV cache) so a model fits a cheaper GPU. It can also drop the exact skill you care about — JSON schema, rare entities, multilingual — while looking fine on generic benches.

Pick the bit-width that **clears your bar** at the **hardware you can afford**. Do not pick 4-bit because Twitter did.""",
   why="""On the job, 4-bit is how 70B fits on one card. It is also how a classifier silently loses 5 points. In interviews, "measure on my eval" is the whole point. Mention method (GPTQ, AWQ, bitsandbytes) as a serving detail, not as the decision.

Also mention you pin the quantised artefact SHA; two 4-bit methods are not the same model.""",
   how="""Protocol:

1. Same 200 cases, same prompt, same decode settings.
2. Scores: fp16 vs int8 vs int4.
3. Slice the misses — are they the high-risk ones?
4. If 4-bit fails the slice, try 8-bit or a smaller fp16 model.

Example: 70B-4bit 84%, 13B-fp16 86%, 70B-8bit 90%. You take 13B-fp16 for the cheap path (better than bad 4-bit 70B) and 70B-8bit for the hard path if it fits.""",
   failures="""1. **Blog MMLU as your score.**

2. **One 4-bit method forever.**

3. **Changing prompt while changing bits.**

4. **No slice on dangerous misses.**""",
   line="""I compare bit-widths on my held-out set. 4-bit is a hardware move, not a free lunch. If it drops the slice I care about, I take 8-bit or a smaller full-precision model.""",
   key_points=[
    "Measure 16/8/4-bit on the same held-out set.",
    "Generic benches miss your JSON and entity slices.",
    "Pin the quantised artefact; methods differ.",
    "A smaller fp16 model can beat a large 4-bit on your task.",
    "Use slices for high-risk misses, not only the mean.",
    "Bit-width is a serving choice gated by evals.",
   ],
   questions=[
    {"q": "How should you choose 8-bit versus 4-bit?", "a": "Run the same held-out eval and compare quality and whether the model now fits the GPU. Do not use a blog MMLU number.", "kind": "recall"},
    {"q": "70B-4bit loses JSON cases that 13B-fp16 passes. What do you ship?", "a": "Probably the 13B for that skill, or 70B at 8-bit if it fits. Do not ship the 4-bit because it is larger.", "kind": "apply"},
    {"q": "You changed bits and the prompt in one experiment. What can you not claim?", "a": "That the quality delta is from quantisation. Change one variable.", "kind": "debug"},
    {"q": "Why pin the quantised file SHA?", "a": "Different methods and calibrations produce different weights at the same bit-width.", "kind": "recall"},
    {"q": "Where does KV-cache quantisation fit?", "a": "It is another quality/memory trade you measure the same way, especially at long context.", "kind": "apply"},
   ],
   links=[
    {"title": "Hugging Face quantization", "url": "https://huggingface.co/docs/transformers/en/main_classes/quantization"},
   ],
  ),
  "serving-slo-for-a-self-hosted-model": entry(
   what="""A **serving SLO for a self-hosted model** is the same kind of promise you would write for a managed API: **p95 latency** (time to first token and time to complete, separately), **availability**, and an **error budget**. Self-hosting does not excuse "it's our GPU". Users and downstream jobs do not care who owns the card.

You also need **capacity headroom** so a deploy or a cold start does not burn the budget, and a **page** when you miss. If you cannot state the SLO, you are not ready to leave the managed API.

Error budget is how you decide whether to ship an engine upgrade on Friday.""",
   why="""On the job, self-host dies when it is treated as a science project. In interviews, applying SLO language to vLLM is a seniority tell. Mention TTFT vs full latency, and that GPU OOM is an availability event.

Compare to the platform SLO you left; if you cannot match a weaker but explicit target, stay on the platform.""",
   how="""Write:

- TTFT p95 < 800 ms warm, < 5 s cold (if cold allowed)
- End-to-end p95 < 4 s for the median prompt size
- Availability 99.5% monthly, OOM and 5xx count against it
- Error budget: 3.6 h/month; freeze deploys when exhausted

Dashboard those. Load-test weekly with production-sized prompts.

Example: you left Bedrock for cost, then missed p95 every afternoon. You added a replica and a queue. Cost still won; SLO was restored. Without the SLO you would have argued about vibes.""",
   failures="""1. **No numbers.**

2. **Only average latency.**

3. **OOM not counted** as downtime.

4. **Deploying into an exhausted budget.**""",
   line="""I give a self-hosted model the same SLO discipline as a managed API: TTFT and completion p95, availability, error budget, and a page. If I cannot hold a weaker explicit target, I stay on the platform.""",
   key_points=[
    "Write p95 TTFT, p95 completion, availability and error budget.",
    "OOM and 5xx spend the budget.",
    "Load-test with production-sized prompts.",
    "Compare honestly to the managed API you left.",
    "Freeze risky deploys when the budget is gone.",
    "Self-host is production, not a lab.",
   ],
   questions=[
    {"q": "Which SLOs should a self-hosted model have?", "a": "Warm (and cold, if allowed) time-to-first-token p95, end-to-end p95, availability, and an error budget — with a page.", "kind": "recall"},
    {"q": "Why separate TTFT from completion time?", "a": "Users feel TTFT; long outputs dominate completion. One number hides which side broke.", "kind": "apply"},
    {"q": "Do GPU OOMs count as downtime?", "a": "Yes. The user did not get an answer. They spend the error budget like any 5xx.", "kind": "recall"},
    {"q": "You cannot hold the platform's p95. What are your options?", "a": "Add capacity or a queue, weaken the SLO in writing, or stay on the managed API. Do not silently miss.", "kind": "apply"},
    {"q": "When do you freeze engine upgrades?", "a": "When the monthly error budget is exhausted or when a Friday deploy would risk it without a rollback.", "kind": "debug"},
   ],
   links=[
    {"title": "Google SRE workbook — implementing SLOs", "url": "https://sre.google/workbook/implementing-slos/"},
   ],
  ),
 }
}
