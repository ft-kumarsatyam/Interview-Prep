from helper import entry, q

HF = "https://huggingface.co/docs/transformers/en"

NOTES = {
 "m1-3": {
  "from-token-ids-to-embeddings": entry(
   what="""The model does not think in token ids. An **embedding** is a **vector** — a list of numbers — that stands in for a token (and later, for a position in the sequence). The id is a row lookup into an embedding table. **Concepts live in this numeric space**: similar tokens and similar contexts end up with vectors that point in similar directions, in a loose, high-dimensional sense.

Those vectors are **rewritten by every transformer layer**. The first layer's vector for "bank" is generic. Later layers, after attention has looked at "river" or "loan", hold a more contextual representation. The final layer's vectors are what the model uses to score the next token.

You do not need the matrix algebra in an interview. You need: id → vector → layers refine it → next-token scores.""",
   why="""On the job this is how you talk about "the model represents meaning". Interviewers ask what an embedding is (a vector for a token or a piece of text) and why we use numbers (the network can only do arithmetic). They ask whether the embedding of "bank" is fixed (the table row is fixed; the hidden state after layers is not).

This is also the seed of retrieval embeddings, which are a different trained projection. Do not mix the two until a later level — but the word is the same family.""",
   how="""`id 1422` → row 1422 of a matrix → a vector of size d (say 4096). Add a position signal. Then each layer: attention mixes other tokens' vectors, a feed-forward rewrites this one. After N layers you have a vector per position. A last linear map turns the last position into logits over the vocab.

Example: "I sat by the bank". Early "bank" is ambiguous. After attention to "sat" and "by", the hidden state is closer to river-bank than money-bank. That is "representations change as they pass through layers".

You will never see these vectors in the API. You will talk about them when someone says the model "stores the word".""",
   failures="""1. **Thinking the embedding table is the meaning** of a word in context. Layers change it.

2. **Mixing retrieval embeddings** with hidden states without saying so.

3. **Asking for the matrix recipe** in a product interview — keep it conceptual.

4. **Believing vectors are human-readable features.**""",
   line="""Token ids become embedding vectors. Layers rewrite those vectors using other tokens. The last vector becomes scores for the next token. Meaning is numeric and contextual, not a row in a dictionary.""",
   key_points=[
    "An embedding is a vector standing in for a token.",
    "The id is a lookup into a table; layers then rewrite it.",
    "Context changes the hidden state of the same word.",
    "The network only does arithmetic on numbers.",
    "Final vectors become next-token logits.",
    "Retrieval embeddings are a related but separate object.",
   ],
   questions=[
    q("recall", "What happens to a token id at the start of the model?", "It selects a row of the embedding table — a vector — which then gets a position signal and is rewritten by each layer."),
    q("apply", "Why is 'bank' not a single meaning inside the network?", "The table row is shared, but hidden states after attention depend on the other tokens (river vs loan)."),
    q("debug", "A PM says the model stores a dictionary definition per word. How do you correct them?", "It stores vectors and computes contextual hidden states. There is no English definition slot."),
    q("apply", "Where do next-token probabilities come from?", "A linear map from the last-layer vector at the last position to a score per vocab item, then a softmax."),
    q("recall", "Do you need matrix equations to explain this in an interview?", "No. Id → vector → layers refine with attention → logits. Save the algebra for a research screen."),
   ],
   links=[
    {"title": "Hugging Face: glossary — embeddings", "url": "https://huggingface.co/docs/transformers/en/glossary#embedding"},
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
   ],
  ),
  "what-parameter-counts-mean": entry(
   what="""A **parameter** is a learned number in the model: an entry in a weight matrix or bias. **8B, 70B, 400B+** are counts of those numbers. They measure **capacity** — how much structure the model can represent — not intelligence, not truth, not speed. Most of the count is in the embedding table and the feed-forward layers (or experts, in MoE).

The file on disk is roughly 2 bytes × parameters for 16-bit weights, plus overhead. 70B is a large download and a large GPU memory bill. 8B can run on a single high-end consumer GPU. 400B+ is a cluster.

Count is a size label. It is not a benchmark.""",
   why="""On the job you will be asked "should we use the 70B". The count tells you memory and a prior on capacity. It does not tell you quality on your task. Interviewers want the definition and the "not automatically better" that follows in the next item.

They may ask what 8B means in memory (order-of-magnitude: tens of GB in 16-bit, less if quantised). A ballpark is enough.""",
   how="""8B ≈ 8×10^9 numbers. At 2 bytes, ~16 GB of weights, plus KV cache at runtime. 70B ≈ 140 GB at 16-bit — multi-GPU or heavy quantisation. An API hides this; you pay in tokens instead of GPUs.

When a card says 8B, ask: dense or MoE? Active parameters per token may be smaller. When it says 400B, ask: can I even host it, and do I need to?

Use the count to reject impossibilities ("we will self-host 400B on one laptop") not to pick a winner.""",
   failures="""1. **Equating B with quality.**

2. **Forgetting runtime memory** (KV cache) on top of weights.

3. **Ignoring MoE** total vs active.

4. **Treating the API as zero parameters** — you still pay.""",
   line="""Parameters are learned numbers. 8B, 70B, 400B are capacity and memory labels, not a quality ranking. I use the count to know what I can host and what I will pay, then I measure the task.""",
   key_points=[
    "A parameter is a learned weight.",
    "8B/70B/400B count those weights.",
    "Count ≈ capacity and memory, not truth.",
    "Runtime memory also includes the KV cache.",
    "MoE: total vs active differ.",
    "Use count to reject impossible hosts, not to pick a winner.",
   ],
   questions=[
    q("recall", "What does 70B mean?", "About 70 billion learned numbers in the model. It is a size, not a score."),
    q("apply", "Roughly how much memory are 70B 16-bit weights?", "On the order of 140 GB for weights alone, plus KV cache. You need multiple GPUs or quantisation."),
    q("debug", "A slide says 'we picked 70B so it is smarter than 8B'. What is missing?", "An eval on the task, cost, latency, and whether the 8B is specialised. Count is not a ranking."),
    q("apply", "Why does an API user still care about size?", "It correlates with price and latency, and with which features exist. You do not see the GPUs; you see the bill."),
    q("recall", "Where do most parameters sit?", "Usually the feed-forward layers (or experts) and the embedding table, not 'the attention idea' as a small object."),
   ],
   links=[
    {"title": "Hugging Face: model sizes", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
    {"title": "Hugging Face: quantized models", "url": "https://huggingface.co/docs/transformers/en/quantization/overview"},
   ],
  ),
  "why-bigger-is-not-automatically-better": entry(
   what="""**More parameters can increase capacity** — the model can represent more regularities. **Larger does not automatically mean better** on your task, at your latency, at your price, or under your data constraints. A small model with the right post-training, the right prompt, or the right retrieved context can win. A large model can be slower, more expensive, overconfident, or worse at following a tight schema.

Bigger also means harder to host, harder to eval thoroughly, and easier to assume you can skip engineering. The product question is "better at what".

MoE complicates "bigger": a large total with small active compute is a different bargain.""",
   why="""On the job, "just use the biggest" is how invoices die. Interviewers want this sentence verbatim-ish: capacity can go up; quality, cost, and fit may not. They will ask for a counterexample (RAG'd 8B vs naked 70B on internal docs).

This is the practical companion to the parameter-count definition.""",
   how="""Run three rows on 50 real tickets: 8B, 70B, 70B+policy snippet. Report quality, p95, cost. Often the third wins and the first is "good enough". That slide beats a parameter table.

When bigger wins, say so. When it wins by 1% and costs 8×, say that too.

Hosting: if you cannot operate 70B, it is not better *for you*. The API 70B-class model may still be the right buy — that is a path choice, not a parameter religion.""",
   failures="""1. **Sorting the shortlist by B.**

2. **Skipping eval** because the card is impressive.

3. **Ignoring cost × volume.**

4. **Ignoring schema/tool skill** of a smaller tuned model.""",
   line="""More parameters can mean more capacity. They do not automatically mean better, cheaper, or fitter. I compare models on the task, the latency and the bill. An 8B with the right context often beats a naked 70B.""",
   key_points=[
    "Capacity ≠ quality on your task.",
    "Bigger is slower and dearer unless MoE says otherwise.",
    "Context, post-training and tools can beat scale.",
    "Hostability is part of 'better'.",
    "Always eval.",
    "MoE changes what 'bigger' costs to run.",
   ],
   questions=[
    q("recall", "Why is bigger not automatically better?", "Quality is task-specific; cost and latency grow; a smaller specialised or well-prompted model can win. Capacity is only one ingredient."),
    q("apply", "Give a case where an 8B beats a 70B.", "Internal FAQ with the handbook in context, or a fine-tuned classifier. The 70B without the handbook hallucinates policy."),
    q("debug", "A team upgrades to 70B, quality is flat, invoice is 6×. What did they skip?", "An eval and a cost model. They bought capacity they did not need."),
    q("apply", "When is bigger the right call?", "When your eval shows a real quality gap you cannot close with prompt, RAG or tools, and you can pay the latency."),
    q("recall", "How does MoE change this slogan?", "A model can be 'bigger' in total parameters but cheaper per token if few experts are active. Read both numbers."),
   ],
   links=[
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "OpenAI: models", "url": "https://platform.openai.com/docs/models"},
   ],
  ),
  "the-intuition-behind-attention": entry(
   what="""**Attention** is the idea that **a token looks at other tokens in the context** to build a better representation of what it means *here*. "Bank" looks at "river" or "loan". A closing brace looks at the opening one. The next-token prediction looks at the instruction and the relevant sentence, not only at the last word.

It is a **weighted mix** of other tokens' vectors. The weights are computed from the current token and the others (how relevant they seem). You do not need the softmax formula in a product interview. You need: every token can draw on the others, and that is why long context is both powerful and expensive.

**Causal** attention (next item) means a token cannot look at the future — only the past and itself.""",
   why="""On the job this is the one transformer idea you must be able to say in a hallway. Interviewers ask "what is attention" to see if you say "it looks at relevant tokens" or if you freeze. They do not want a paper recitation.

They will ask why long prompts cost more: attention mixes over more pairs (plus the rest of the block). They will ask why order matters (position + causality).""",
   how="""Sentence: "The trophy does not fit in the suitcase because it is too small." Attention is how "it" gathers evidence from "trophy" and "suitcase". A good model puts weight on suitcase for "small".

In a prompt, the last position (where we predict) attends to the instruction, the schema, and the user field that matters. If you bury the instruction, attention may still find it — or it may get lost in the middle (later module).

You cannot turn attention off in a decoder-only LLM. You can write a clearer layout so the relevant tokens are easy to find.""",
   failures="""1. **Saying attention means 'the model is paying attention'** as psychology.

2. **Claiming it looks at the web.** It looks at the context window.

3. **Ignoring causality** — it cannot see future tokens while generating.

4. **Thinking every token is equally mixed.** The weights are selective, but not perfect.""",
   line="""Attention means a token builds its representation by looking at other tokens in the context. That is why context matters and why long windows are expensive. It is not web search and it is not a person paying attention.""",
   key_points=[
    "A token mixes information from other tokens in the context.",
    "Weights are relevance scores, computed, not magic.",
    "This is why context changes meaning.",
    "It looks inside the window, not at the web.",
    "Causal attention cannot see the future.",
    "Long context makes attention more expensive.",
   ],
   questions=[
    q("recall", "What is attention in one sentence?", "A token updates its representation by taking a weighted mix of other tokens in the context."),
    q("apply", "Why does 'bank' mean different things after attention?", "It mixes in neighbouring tokens like 'river' or 'loan', so the hidden state is contextual."),
    q("debug", "A PM says attention means the model searches the internet. Correct them.", "Attention is inside the prompt. Web search is a tool. Different mechanisms."),
    q("apply", "Why are long prompts computationally heavier?", "Each new token attends over more past tokens (plus feed-forward). Prefill cost grows with input length."),
    q("recall", "Does every token attend to every other in a decoder LLM?", "It can attend to all previous tokens (causal). It cannot attend to future ones during generation."),
   ],
   links=[
    {"title": "Hugging Face: glossary — attention", "url": "https://huggingface.co/docs/transformers/en/glossary#attention-head"},
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
   ],
  ),
  "queries-keys-values-causal-attention": entry(
   what="""At a high level, each token produces three vectors: a **query** ("what am I looking for"), **keys** ("what do I contain"), and **values** ("what I will pass along if you look at me"). Attention scores come from matching queries to keys; the output is a mix of values. A **transformer layer** stacks this (usually in several **heads** that look for different patterns) with a feed-forward rewrite.

**Causal attention** means token t may only look at tokens ≤ t. That is what makes left-to-right generation possible: the model never cheats by seeing the word it is about to predict. Training uses the same mask.

Skip the matrix names in a product interview unless they ask. If they ask, this paragraph is enough.""",
   why="""Interviewers sometimes want the Q/K/V words to see if you have read anything past a blog title. They do not want you to derive softmax(QK^T). On the job you will use this when talking about KV cache (the K and V are what we store — next module).

Causal versus bidirectional is why BERT-style encoders differ from GPT-style decoders. Generation is decoder-style.""",
   how="""Predicting the next token at the end of the prompt: that last query looks at all keys in the prompt (and later, in the generated prefix). Values from those positions mix into the last hidden state.

Multi-head: one head might track quotes, another long-range names. You do not configure them.

Causal mask: a triangular mask of "cannot look ahead". If it were bidirectional, generation would not be well-defined in the same way.

KV cache (M1.5): we store keys and values from past tokens so we do not recompute them every step.""",
   failures="""1. **Memorising the formula** and failing the intuition.

2. **Forgetting causal** — "it looks at the whole document including the future".

3. **Confusing heads with experts** (MoE).

4. **Thinking you set Q/K/V** as a user.""",
   line="""Queries ask, keys answer relevance, values are what gets mixed. Layers stack that, causally — a token cannot see the future. That is enough to understand generation and the KV cache. I do not lead with matrix algebra.""",
   key_points=[
    "Q = what I look for; K = what I offer; V = what I pass along.",
    "Scores from Q·K; output is a mix of V.",
    "Many heads look for different patterns.",
    "Causal: only past and self.",
    "KV cache stores K and V from past tokens.",
    "Skip the formula unless asked.",
   ],
   questions=[
    q("recall", "What are queries, keys and values for?", "Each token makes a query (what it seeks), keys (what it offers), and values (what it contributes). Attention matches Q to K and mixes V."),
    q("apply", "Why must generation use causal attention?", "The model must predict the next token without seeing it. Looking ahead would be cheating and would not match inference."),
    q("debug", "A candidate explains QK^T but cannot say why order matters. What is missing?", "The causal mask and positional information. Algebra without the generation story."),
    q("apply", "What does the KV cache store, in these words?", "Past keys and values so the new token's query can attend without recomputing the whole prompt's K/V."),
    q("recall", "What is a head?", "One attention pattern (one set of Q/K/V projections). Layers run several in parallel."),
   ],
   links=[
    {"title": "Hugging Face: attention", "url": f"{HF}/model_doc/llama"},
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
   ],
  ),
  "dense-models": entry(
   what="""A **dense** model uses **every parameter on every token**. Each layer's feed-forward and attention projections run in full. 8B dense means about 8B weights participate in producing the next token (plus the embedding lookup). There is no router and no idle expert.

Dense is the default mental model. It is simple to host: load the weights, run the stack. Memory and compute scale together. If you can fit the weights, you can run the token (KV cache aside).

Most classic GPT-style models you have used are dense unless the card says MoE.""",
   why="""On the job you need the word so you can contrast MoE. Interviewers ask dense versus MoE as a pair. Dense is the simple side: every parameter, every token. They want you to know that 70B dense is expensive to *run*, not only to store.

They may ask why people still train dense (simpler, predictable latency, mature tooling).""",
   how="""Serving: one blob of weights, all used. Latency is relatively stable per token for a given context length. Memory ≈ all weights + KV.

When a card says "7B" and does not mention experts, assume dense. When it says "8x7B" or "total 47B, active 13B", it is MoE.

Product implication: upgrading from 8B dense to 70B dense is a large jump in GPU and token price. Upgrading to an MoE with 13B active may feel closer to 13B at runtime with a larger memory footprint.""",
   failures="""1. **Assuming every large model is dense.**

2. **Assuming dense is always worse** than MoE. Tooling and quality vary.

3. **Forgetting KV** when sizing dense memory.

4. **Comparing 70B dense to 70B-total MoE** as equal runtime cost.""",
   line="""Dense means every parameter participates in every token. It is the simple model: memory and compute move together. I assume dense unless the card talks about experts, and I do not compare those costs as equal.""",
   key_points=[
    "Dense: all weights used on every token.",
    "Simple to host and to reason about latency.",
    "Memory and compute scale together.",
    "Default assumption when the card is silent.",
    "70B dense is expensive to run, not just to store.",
    "Do not cost-compare to MoE totals blindly.",
   ],
   questions=[
    q("recall", "What is a dense model?", "One where every parameter takes part in producing every token. No expert routing."),
    q("apply", "What do you assume if a card says 8B and never mentions experts?", "Dense, unless you find a footnote. Cost and memory track that full 8B."),
    q("debug", "A team budgets a '70B' MoE like a 70B dense GPU farm. What did they mix up?", "Total versus active parameters. The run-time FLOPs may be closer to a smaller dense model; the memory may still be large."),
    q("apply", "Why might you still choose dense?", "Predictable latency, simpler serving, mature quantisation, and a quality/cost point that already passes your eval."),
    q("recall", "Do embeddings and attention run in a dense model for every token?", "Yes. The whole stack runs. MoE typically sparsifies the feed-forward part, not the whole network."),
   ],
   links=[
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
    {"title": "Hugging Face: MoE models", "url": "https://huggingface.co/docs/transformers/en/model_doc/mixtral"},
   ],
  ),
  "mixture-of-experts-routing": entry(
   what="""In a **Mixture-of-Experts (MoE)** transformer, the big **feed-forward** block is replaced by many **experts** (smaller FFNs). A **router** picks **a few** of them for each token — often one or two. Attention usually stays dense. So each token takes a **sparse** path through a **wide** set of specialists.

The router is itself a learned tiny network. It can load-balance badly (all tokens to one expert) if training did not regularise that. You do not set the route as a user.

MoE is why a model can advertise a huge total size and a smaller "active" size.""",
   why="""On the job, cards will say Mixtral-style "8x7B". Interviewers want: many experts, router picks few, compute per token is closer to the active set. They want the catch: you still **store** all experts.

They may ask what the router does if it is wrong (worse quality, uneven load, hot experts).""",
   how="""Picture 8 experts of ~7B FFN each. For token t the router picks expert 2 and 5. Only those FFNs run. Attention still uses all heads. The next token may pick a different pair.

Hosting: the weights of all 8 sit in memory (or are offloaded, slowly). Serving stacks try to place experts across GPUs.

When you read "8x7B" you should ask: 8 experts of what, how many active, and is 7B the expert or the whole dense equivalent. Cards are inconsistent; look for **active parameters**.""",
   failures="""1. **Thinking only one expert exists at a time in memory.**

2. **Thinking you pick the expert** in the API.

3. **Ignoring load imbalance.**

4. **Treating 8x7B as 56B dense compute.**""",
   line="""MoE splits the feed-forward into many experts and a router picks a few per token. Compute stays closer to a smaller model; all experts still have to live in memory. I look for active versus total on the card.""",
   key_points=[
    "Experts replace the big FFN; a router picks a few per token.",
    "Attention is usually still dense.",
    "Active compute ≠ total weights.",
    "You do not choose the expert.",
    "All experts still occupy memory.",
    "Read 'active parameters' on the card.",
   ],
   questions=[
    q("recall", "How does MoE routing work at a high level?", "A router scores experts for this token and runs only the top few feed-forward experts. Other experts stay idle for that token."),
    q("apply", "What stays dense in a typical MoE LLM?", "Attention (and usually embeddings). Sparsity is in the FFN experts."),
    q("debug", "Someone says we only need to load two experts. Why is that wrong at serve time?", "The next token may pick different experts. Unless you know the routes in advance, you keep all experts available."),
    q("apply", "What do you look for on an MoE card?", "Number of experts, how many are active per token, total vs active parameters, and memory notes."),
    q("recall", "Can a bad router hurt quality?", "Yes. Collapsing onto one expert wastes the others and can behave like a smaller, worse model."),
   ],
   links=[
    {"title": "Hugging Face: Mixtral", "url": "https://huggingface.co/docs/transformers/en/model_doc/mixtral"},
    {"title": "Hugging Face: MoE overview", "url": "https://huggingface.co/docs/transformers/en/model_doc/switch_transformers"},
   ],
  ),
  "total-vs-active-parameters": entry(
   what="""**Total parameters** count every weight, including experts that are idle on a given token. **Active parameters** count the weights that **run** for that token (attention + chosen experts + embeddings, depending on the card's definition). An MoE can be **very large in total** and **much cheaper to run** than a dense model of the same total, because FLOPs follow active.

Cards sometimes hide one of the two numbers. "8x7B" is not a standard equation — read the prose. Active is the number that predicts **compute per token**. Total (plus layout) predicts **memory**.

Dense models have total ≈ active.""",
   why="""This is the interview distinction. If you conflate them you will over-provision GPUs or under-estimate a bill. Interviewers will give a toy: 47B total, 13B active — which number is latency, which is VRAM.

On the job, procurement will quote the bigger number. You ask for both.""",
   how="""Example: Mixtral-class 8×7B is often described as ~47B total and ~13B active. Inference compute feels closer to 13B dense. Memory feels closer to 47B (unless expert offload).

When you size a GPU: start from **total** (or the served precision) for whether it fits. When you size throughput: start from **active** and the serving stack.

When you size an API bill: ignore both and measure tokens — the vendor already folded this in. You still use the distinction to understand *why* two "70B" APIs price differently.""",
   failures="""1. **Using total for FLOPs.**

2. **Using active for VRAM.**

3. **Comparing MoE total to dense total** as equal runtime.

4. **Trusting '8x7B' without the paragraph.**""",
   line="""Total is what you store; active is what you run per token. MoE makes them different. I size memory from total and compute from active, and I refuse a slide that shows only one number.""",
   key_points=[
    "Total counts every weight; active counts what runs this token.",
    "Dense models have total approximately equal to active.",
    "MoE totals are usually much larger than active.",
    "Memory follows total; FLOPs follow active.",
    "8x7B is not self-explanatory.",
    "API prices already fold this in — still ask why.",
   ],
   questions=[
    q("recall", "Total versus active parameters?", "Total counts every weight. Active counts those used for the current token. MoE separates them; dense does not."),
    q("apply", "47B total, 13B active: what do you use for GPU memory vs token compute?", "Memory: the 47B (at the served precision). Compute per token: closer to 13B, plus attention."),
    q("debug", "A dense 13B and an MoE 47B/13B active have very different VRAM. Why is that expected?", "The MoE stores idle experts. Active FLOPs can match while memory does not."),
    q("apply", "A vendor slide says '70B MoE'. What do you ask?", "Total, active, experts, and active-per-token. Then your eval and price."),
    q("recall", "Why is 8x7B ambiguous?", "It does not say how many experts are active or whether 7B includes attention. Read the card body."),
   ],
   links=[
    {"title": "Hugging Face: Mixtral", "url": "https://huggingface.co/docs/transformers/en/model_doc/mixtral"},
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
   ],
  ),
  "what-moe-changes-in-practice": entry(
   what="""In practice MoE means: **every expert still has to be held in memory** (or paged slowly), while **compute per token stays closer to a much smaller dense model**. You buy a wider brain without paying full dense FLOPs, if the serving stack is good. You pay **engineering**: placement, load balance, tail latency when tokens hit cold experts, and worse batching behaviour than a dense 8B.

Quality is not guaranteed to match a dense model with the same total. It is a different training recipe.

For an API user, MoE may show up as a model name that is "cheap for its quality". You still eval.""",
   why="""On the job this is the "why is this 47B cheaper than that 70B" conversation. Interviewers want the memory-versus-compute split and one serving wart (load, batching, or offload). They want you not to treat MoE as free lunch.

Self-hosting MoE is a harder ops problem than dense of the active size.""",
   how="""API path: try the MoE id on your eval; look at price and p95. If the vendor hosts it, their ops problem is not yours.

Self-host: you need a stack that understands expert parallelism. A naive "load 47B dense-style" may work but waste. Offloading experts to CPU will crater tokens/s.

Product: MoE is attractive for high-volume, quality-sensitive text where you cannot pay 70B dense. It is less attractive if you need dead-simple single-GPU serving.

Document the model as "MoE, 13B active" in your decision log so the next person does not resize the cluster from the total.""",
   failures="""1. **Free lunch** — ignoring memory and ops.

2. **Offload without measuring** tokens/s.

3. **Expecting dense-like batching.**

4. **Resizing clusters from the total** or from the active blindly.""",
   line="""MoE keeps all experts in memory and runs only a few per token. I get smaller-model compute with larger-model storage, plus serving complexity. I eval it like any other model and I do not treat it as a free 70B.""",
   key_points=[
    "Memory: all experts. Compute: active few.",
    "Serving is harder than dense of the active size.",
    "Load balance and batching can hurt tails.",
    "Quality is a recipe, not a free upgrade.",
    "APIs hide ops; self-host does not.",
    "Write 'active vs total' in the decision log.",
   ],
   questions=[
    q("recall", "What does MoE change in practice?", "You store all experts but run a few per token, so compute looks smaller than total size. Serving and batching get harder."),
    q("apply", "When would you avoid self-hosting MoE?", "When you want single-GPU simplicity or you cannot operate expert parallelism. Use a host or a dense model."),
    q("debug", "Tokens/s collapse after you CPU-offload experts. Why?", "Each token may call different experts; paging them is latency. Offload is not free."),
    q("apply", "How do you explain an MoE API price to finance?", "We pay for active compute plus their serving. The total parameter count is not the line item — tokens are. We picked it because eval/cost beat the dense alternative."),
    q("recall", "Is MoE always higher quality than dense active-size?", "No. It depends on training. Measure."),
   ],
   links=[
    {"title": "Hugging Face: Mixtral", "url": "https://huggingface.co/docs/transformers/en/model_doc/mixtral"},
    {"title": "vLLM: MoE serving notes", "url": "https://docs.vllm.ai/en/latest/models/supported_models.html"},
   ],
  ),
  "reading-moe-model-cards": entry(
   what="""On a card, look for **"8x7B"**, **"n experts"**, **"top-k"**, **"total parameters"**, **"active parameters"**. Those tell you **speed** (active), **cost** (active, plus vendor margin), and **hosting** (total memory, expert layout). Also read context length, licence, and whether the card is for a base or instruct model.

If the card only says a large billions number and "MoE" in a tweet, wait for the two numbers. If the card is a dense model, do not invent experts.

Cards lie by omission. Your eval does not.""",
   why="""Interviewers may paste a card snippet and ask what you know about serving. They want you to extract total vs active and say what you still do not know (quality). On the job this is the 10-minute read before you shortlist.""",
   how="""Checklist:

1. Dense or MoE? If MoE: experts, k active, total, active.
2. Precision they measured (bf16 vs 4-bit) — memory changes.
3. Context window and template.
4. Licence (especially open-weight).
5. Benchmarks as a shortlist hint only.

Then: can we host this, or is it API-only for us? If host, which serving stack lists this architecture.

Write one sentence: "47B total / 13B active MoE, instruct, 32k context, Apache-like licence — eval next." That is a card read.""",
   failures="""1. **Stopping at 8x7B.**

2. **Treating card benchmarks as your quality.**

3. **Missing the licence.**

4. **Missing instruct vs base.**""",
   line="""I read MoE cards for total vs active, experts, context and licence. Those numbers tell me memory, compute and whether I can host. They do not tell me quality — that is the eval.""",
   key_points=[
    "Extract total, active, experts, top-k.",
    "Active ≈ speed/cost; total ≈ memory.",
    "Precision changes memory.",
    "Licence and instruct/base matter.",
    "Benchmarks shortlist; they do not ship.",
    "One sentence summary, then eval.",
   ],
   questions=[
    q("apply", "A card says '8x7B MoE'. What do you still need?", "How many experts are active, total vs active parameter counts, context, licence, instruct vs base, and your eval."),
    q("recall", "Which card number tracks hosting memory?", "Total parameters at the precision you will serve, plus KV cache. Not the active count alone."),
    q("debug", "You shortlisted from MMLU only and the model fails your JSON task. What happened?", "You treated a card benchmark as your product. Run your examples."),
    q("apply", "Write the one-sentence card read.", "Total/active, dense or MoE, context, licence, instruct/base — then 'eval next'."),
    q("recall", "Why does precision appear on a good card?", "bf16 vs 8-bit vs 4-bit changes memory and can change quality. Know what they measured."),
   ],
   links=[
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "Hugging Face: Mixtral card pattern", "url": "https://huggingface.co/docs/transformers/en/model_doc/mixtral"},
   ],
  ),
  "residual-streams-and-layer-stacking": entry(
   what="""Each transformer **block adds a residual update** to a running hidden state (the **residual stream**): `x = x + attention(x)` then `x = x + ffn(x)` (normalisation details vary). **Depth** is how many times you refine that stream. Early layers do more local/syntax-ish work; later layers do more semantic and predictive work — as a rough story, not a law.

The residual connection is why very deep stacks can still train: the original signal can pass through. You do not configure it. You should know that "70 layers" means 70 rounds of refine, not 70 separate models.

This is why people say the representation is refined, not replaced.""",
   why="""Interviewers who go slightly deeper than attention will ask what a layer *does* to the vector. "It adds a residual update" is the crisp answer. On the job you will hear "the residual stream" in research-adjacent conversations and in interpretability posts.

You do not need to implement it. You need to not say "each layer overwrites the meaning completely".""",
   how="""Picture a highway of width d. Each block merges in an attention update and an FFN update. The next token's logits read the final highway at the last position.

Skip connections mean a bug or a no-op block does not destroy x. Training is possible at 30–80 layers because of this (plus normalisation).

When someone says "the model is 32 layers", they mean 32 of these blocks stacked. Width (d) and depth (layers) are both capacity, different shapes.

MoE sits inside the FFN update; the residual story is the same.""",
   failures="""1. **Layers as separate models.**

2. **Ignoring residuals** — "each layer starts from scratch".

3. **Over-claiming what early vs late layers do.**

4. **Confusing width and depth.**""",
   line="""Each block adds a residual update to a running stream. Depth is how many times we refine that stream, not a stack of separate models. I say 'refine', not 'overwrite'.""",
   key_points=[
    "x = x + update, twice per block (attention, FFN).",
    "The residual stream is the running hidden state.",
    "Depth = stacked refinements.",
    "Residuals make deep stacks trainable.",
    "Width and depth are different capacity knobs.",
    "MoE lives in the FFN update.",
   ],
   questions=[
    q("recall", "What is a residual stream in a transformer?", "The running hidden state that each block adds to, rather than replacing. Attention and FFN contribute updates."),
    q("apply", "Why does depth refine a representation?", "Each block can add information from other tokens (attention) and a nonlinear rewrite (FFN) while keeping the previous signal."),
    q("debug", "A candidate says each layer is its own language model. How do you correct them?", "One model, one stream, stacked updates. Only the end produces logits."),
    q("apply", "Where does MoE sit in this picture?", "In the FFN update: the residual add is the same, the update is sparse across experts."),
    q("recall", "Why do residual connections help training?", "The original signal can pass through. Gradients and information do not have to survive a total rewrite at every layer."),
   ],
   links=[
    {"title": "Hugging Face: glossary", "url": "https://huggingface.co/docs/transformers/en/glossary"},
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
   ],
  ),
  "why-positional-information-is-required": entry(
   what="""Attention, in its raw form, is a **set operation**: without extra information it does not know **order**. "Dog bites man" and "man bites dog" would look like the same bag of tokens. **Positional information** — sinusoidal encodings, learned embeddings, RoPE, ALiBi — marks *where* a token sits so the mix can depend on order and distance.

Every production LLM injects position somehow. Context-length limits and "lost in the middle" are partly about how that scheme generalises.

You do not pick a position scheme in the API. You should know why it exists.""",
   why="""Interviewers use the dog/man sentence. It is the cleanest test that you understand attention is not enough. On the job you will meet RoPE when a card talks about context extension. You only need the why.

They may ask whether tokens are a sequence or a set — a sequence, because we add position.""",
   how="""Add a position vector (or rotate the Q/K as in RoPE) so the query at position 9 knows it is 9 and can prefer nearby keys.

If you removed position and shuffled training, the model could not learn syntax. We do not do that.

Long-context variants change the position scheme or interpolate it. That is why "we trained at 4k but we run at 128k" is a research claim, not a free lunch — quality may drop.

When you truncate a prompt, you also change positions of what remains. Putting the question last is a layout choice that interacts with position.""",
   failures="""1. **Ignoring order** in the attention story.

2. **Thinking the token id includes position.** It does not.

3. **Assuming infinite context** because RoPE can extrapolate a bit.

4. **Shuffling chunks** in RAG without caring about order.""",
   line="""Without position, attention cannot tell 'dog bites man' from the reverse. We inject positional information so order and distance matter. That is why a sequence is not a bag of words.""",
   key_points=[
    "Raw attention is permutation-sensitive only after we add position.",
    "Dog bites man vs the reverse is the example.",
    "RoPE/ALiBi/embeddings are mechanisms; the need is the point.",
    "Token id ≠ position.",
    "Long-context claims depend on the position scheme.",
    "Layout in the prompt interacts with position.",
   ],
   questions=[
    q("recall", "Why is positional information required?", "Without it, attention treats tokens as a bag and cannot distinguish 'dog bites man' from the reverse."),
    q("apply", "Does the token id encode where the word sits?", "No. Position is added separately (embedding, RoPE, etc.). The id is the vocab piece."),
    q("debug", "A RAG pipeline shuffles retrieved chunks randomly and quality is chaotic. What might be going on?", "Order and position change the mix. Also lost-in-the-middle. Use a stable, intentional layout."),
    q("apply", "Why might a model trained at 4k struggle at 128k even if the window 'fits'?", "The position scheme may not generalise. Longer is not equally usable."),
    q("recall", "Name one positional method you might see on a card.", "RoPE, ALiBi, or learned absolute embeddings. Knowing why beats naming all of them."),
   ],
   links=[
    {"title": "Hugging Face: positional encodings", "url": "https://huggingface.co/docs/transformers/en/model_doc/llama#rotary-position-embeddings-rope"},
    {"title": "Hugging Face: model summary", "url": "https://huggingface.co/docs/transformers/en/model_summary"},
   ],
  ),
 }
}
