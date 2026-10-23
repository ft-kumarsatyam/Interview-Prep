from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-1": {
  "next-token-prediction": entry(
   what="""A **large language model** is a function that, given a sequence of tokens, returns a **probability distribution over the next token**. **Generation** is a loop: predict → **choose** one token (sample or argmax) → **append** it → repeat until a stop token or a limit. There is no second brain that "knows the answer" and then types it. The answer *is* the path of chosen tokens.

"Large" means many parameters and a lot of training text. "Language" is historical: the same loop writes code, JSON, and numbers. The core idea does not change with the modality of the tokens.

The loop is local. Each step only sees the context you sent plus the tokens already appended. It does not jump to a stored paragraph unless those tokens happen to be the probable continuation.""",
   why="""On the job this is why you debug completions, not "the AI's opinion". A model that "contradicts itself" is a second draw from a distribution, or a later token that is likely given the earlier ones. Interviewers open Level 1 with this. The junior answer is "it predicts words". The senior answer is the loop, the distribution, and that choice is a separate step (sampling).

They will ask why longer outputs cost more (more loops) and why the model can start well and go wrong (each step conditions on its own previous choices).

If you cannot draw predict → choose → append, later modules (sampling, prefill, hallucination) will sound like slogans.""",
   how="""Prompt tokens: `The capital of France is`. The model assigns high probability to `Paris`, lower to `Lyon`, tiny to `banana`. You choose `Paris`. The new prompt is `The capital of France is Paris`. Next token might be `.` or `,`. You stop at a stop sequence.

Code:

```
context = tokenize(prompt)
while not stop(context):
    logits = model(context)
    token = choose(logits, temperature)
    context.append(token)
```

`choose` is greedy or sampled. The model did not retrieve a fact card. It produced a likely token given its weights and this context.

A chat API hides the loop. You still pay for every chosen token and you still live with the fact that the loop can wander.""",
   failures="""1. **Thinking the model looks up an answer** and then types it.

2. **Ignoring choose.** Temperature and greedy live here.

3. **Expecting a plan** that is not in the tokens. If you need a plan, you prompt for one or you use a tool.

4. **One-shot belief.** The same prompt can yield two strings because choose is random.""",
   line="""An LLM assigns probabilities to the next token. Generation is predict, choose, append, repeat. There is no separate answer store. I debug the loop and the choice step, not a person inside the model.""",
   key_points=[
    "The model outputs a distribution over the next token.",
    "Generation is predict → choose → append → repeat.",
    "There is no separate retrieved answer.",
    "Later tokens condition on earlier choices.",
    "Sampling lives in the choose step.",
    "APIs hide the loop; you still pay per token.",
   ],
   questions=[
    q("recall", "What does an LLM actually compute at each step?", "A probability distribution over the next token, given the tokens so far. It does not fetch a stored sentence."),
    q("apply", "Why can a completion start correctly and then go wrong?", "Each step conditions on the tokens already chosen. An early unlikely choice becomes the new context and the rest follows that path."),
    q("debug", "A teammate says the model 'decided the answer then typed it'. How do you correct them?", "There is only the token loop. The 'answer' is the sequence of choices. There is no second pass unless you build one."),
    q("apply", "Where does temperature act in the loop?", "In choose: it reshapes the distribution before a token is drawn. The model's raw logits are not the final choice."),
    q("recall", "Why do longer answers cost more?", "Each output token is another forward pass (decode). More loops, more compute, more billed tokens."),
   ],
   links=[
    {"title": "OpenAI: text generation", "url": f"{OAI}/guides/text-generation"},
    {"title": "Hugging Face: generation strategies", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
   ],
  ),
  "what-an-llm-is-not": entry(
   what="""An LLM is **not a database** (it does not retrieve a stored row). It is **not a search engine** (it does not query the live web unless you add a tool). It is **not a deterministic program** (the same prompt can yield different strings). It is **not a repository of stored answers** (there is no index of Q→A cards it looks up).

It *can look like* all of those. Fluent text about a company policy is not the policy. A number that looks calculated is not a guaranteed computation. A citation-shaped string is not a source.

You add databases, search, tools, and validators **around** the model when you need those properties.""",
   why="""On the job, product managers will say "the model knows our refund policy". It does not. It can parrot training-ish text or the text you put in the prompt. Interviewers ask what an LLM is not because that list is how you design the system: retrieval for facts, tools for math and live data, schemas for structure, deterministic code for money.

The candidate who says "we will just use a bigger model" for freshness or arithmetic has not learned this list.""",
   how="""Need yesterday's order status → query your DB (tool or RAG), do not ask the model to remember. Need a sum of invoices → run SQL or a calculator. Need the same classification every time → low temperature plus a schema, and still accept residual randomness or use a non-LLM classifier.

Example prompt: "What is our refund window?" without context. The model will invent a window that sounds corporate. Example with context: you paste the policy paragraph and say "answer only from the text". That is still not a database; it is a conditioned continuation. A parser should check the answer is in {14, 30, 90} days if those are the only legal values.

When you demo, say the words: "the model is not the source of truth".""",
   failures="""1. **Policy in weights** instead of a document you retrieve.

2. **Trusting a citation** the model formatted.

3. **Using the model as a calculator** for money.

4. **Assuming temperature 0 is a program.**""",
   line="""An LLM is not a database, a search engine, a deterministic program, or a box of stored answers. I add those around it: retrieval, tools, code, schemas. Fluency is not a source of truth.""",
   key_points=[
    "Not a database: no row lookup.",
    "Not search: no live web unless you add a tool.",
    "Not deterministic: sampling and implementation noise.",
    "Not a Q&A card index.",
    "Fluency is not evidence.",
    "You wrap the model to get those properties.",
   ],
   questions=[
    q("recall", "Name four things an LLM is not.", "A database, a search engine, a deterministic program, and a repository of stored answers."),
    q("apply", "A PM says the model knows the refund policy. What do you build?", "Store the policy, retrieve or paste the relevant paragraph, answer from that text, and validate the numeric window in code. Do not rely on weights."),
    q("debug", "The model cites a URL that 404s. What was the mistake?", "Treating a fluent citation as search. If you need sources, retrieve them and require the answer to use those ids."),
    q("apply", "When would you not use an LLM at all?", "When you need a guaranteed computation, a live lookup, or a stable rule — use code, SQL, or a classifier."),
    q("recall", "Why is temperature 0 still not a deterministic program?", "Ties, batching, and implementation details can still change the token. And the function is still 'likely continuation', not 'execute this spec'."),
   ],
   links=[
    {"title": "OpenAI: limitations", "url": f"{OAI}/guides/text-generation"},
    {"title": "Anthropic: Claude is not a search engine (docs home)", "url": "https://docs.anthropic.com/en/docs/welcome"},
   ],
  ),
  "why-one-model-does-many-tasks": entry(
   what="""One trained network can **write, summarise, translate, code, answer, and classify** because those tasks are all **token sequences**. Training on a huge mix of text teaches patterns that transfer: English grammar helps code comments; code structure helps JSON; Q&A pages help instructions. The "task" at inference is mostly **the prompt** (and the chat template), not a different set of weights.

This is why a general model can look like a dozen products. It is also why it is mediocre at each until you add examples, tools, or a specialist.

Multitask behaviour is not a dozen modules you can turn off. It is one distribution, steered.""",
   why="""On the job you will be asked "can we use the same model for support and for SQL?". Often yes for a prototype; quality and cost then force a split. Interviewers want the mechanism (one next-token function, many prompts) and the limit (a specialist or a tool may win).

They will ask why few-shot classification works without fine-tuning: the task is in the context, and the weights already contain similar patterns.

The resume line "I used GPT for everything" is weak. The senior line is "I used one model as a prior and specialised with prompts, RAG, or a smaller classifier".""",
   how="""Same weights, three prompts:

- "Summarise in one sentence: {{text}}"
- "Translate to Hindi: {{text}}"
- "Label billing|bug|other. Ticket: {{text}}"

The model is not switching a task head (unless you built one). It is continuing each instruction. For classification you still validate the label in code.

When quality fails, you do not need a new species of model first. You try examples, a schema, a retrieved snippet, or a smaller dedicated model for that task.""",
   failures="""1. **Assuming a new product needs a new model.**

2. **Assuming one model is enough at quality.**

3. **No validator** because "it can classify".

4. **Mixing six tasks in one prompt** and wondering why it drifts.""",
   line="""One next-token model can do many tasks because they are all sequences and the prompt selects the behaviour. I start with one model and a tight prompt, then I specialise with examples, tools, or a smaller model when quality or cost demands it.""",
   key_points=[
    "Many tasks are the same function with different prompts.",
    "Training mix teaches transferable patterns.",
    "The prompt (and template) selects the task, not a hidden module.",
    "General models are a prior, not a finished product.",
    "Specialise with examples, RAG, tools, or a smaller model.",
    "Still validate structured outputs in code.",
   ],
   questions=[
    q("recall", "Why can one model summarise and write code?", "Both are token sequences. Training on mixed text teaches patterns that transfer; the prompt selects the continuation."),
    q("apply", "When do you split off a second model?", "When quality, latency, or cost on one task is better with a specialist or a non-LLM classifier, and the ops cost is worth it."),
    q("debug", "One prompt asks the model to classify, refund, and write a poem. It does all three badly. Why?", "You mixed tasks in one distributional soup. Split prompts or add a router."),
    q("apply", "How do you get classification without fine-tuning?", "Instruction plus labels plus a couple of examples, then validate the label. The task lives in the context."),
    q("recall", "Is there a separate 'translation module' inside the weights?", "Not as a user-visible switch. Translation is a continuation the mix taught. Some architectures have extra heads, but product-wise you steer with prompts."),
   ],
   links=[
    {"title": "OpenAI: prompt engineering", "url": f"{OAI}/guides/prompt-engineering"},
    {"title": "Hugging Face: task families", "url": "https://huggingface.co/docs/transformers/en/task_summary"},
   ],
  ),
  "where-capability-comes-from": entry(
   what="""Capability is not one knob. It comes from **data** (how much, how clean, how relevant), **compute** (how long you train, how much you spend at inference), **scale** (parameter count and architecture), and **algorithms** (objectives, architecture tricks, post-training). A bigger model on garbage data loses to a smaller model on the right data. A huge model you decode greedily on a reasoning task may lose to a smaller model with more test-time compute.

"Smarter" in a demo is usually a mix of these, plus a better prompt. You cannot buy only parameters and expect the rest to follow.

Post-training (SFT, preference) is part of capability for assistants: it teaches format and taste, not just raw prediction.""",
   why="""On the job, vendors sell parameter counts. You buy outcomes. Interviewers ask where capability comes from to see if you will chase 70B when a 8B plus retrieval wins. They want all four words: data, compute, scale, algorithms.

They will ask why a 70B can lose to a 8B on *your* tickets (your data is not in the 70B; the 8B is fine-tuned or better prompted).

This sets up later modules on training and on choosing models.""",
   how="""A support classifier: 8B instruct, 200 labelled tickets, and a schema may beat a frontier model with zero examples and a vague prompt. You spent on **data** and **prompt algorithm**, not on parameters.

A math tool: a medium model plus a calculator beats a giant model doing arithmetic in tokens. You spent on **tools** (an algorithm at inference).

A reasoning model: extra **test-time compute**. That is inference spend, not a bigger weight file.

When someone says "just use the biggest model", ask which of the four they are actually short on.""",
   failures="""1. **Parameters as a personality.**

2. **Ignoring data quality.**

3. **Ignoring inference compute** (reasoning, search).

4. **Ignoring post-training** when you need an assistant, not a base model.""",
   line="""Capability comes from data, compute, scale and algorithms together. I do not buy parameters as a personality. On a real task I ask which of the four I am missing — often it is data or a tool, not a bigger weight file.""",
   key_points=[
    "Four sources: data, compute, scale, algorithms.",
    "Bigger is not automatically better on your task.",
    "Test-time compute is capability too.",
    "Post-training shapes assistant behaviour.",
    "Tools are an algorithm around the model.",
    "Ask which lever you are short on.",
   ],
   questions=[
    q("recall", "Where does LLM capability come from?", "Better and more data, more train and test-time compute, larger or better architectures, and better algorithms including post-training and tools."),
    q("apply", "A 70B loses to an 8B on your tickets. What might be true?", "The 8B has better prompts, examples, or fine-tune data for that distribution. Parameter count was not the missing lever."),
    q("debug", "A team only reports parameter count on a slide. What do you ask?", "Training data, post-training, inference budget, and eval on our task. Count alone is not a decision."),
    q("apply", "Name a case where more inference compute beats more parameters.", "A reasoning model or self-consistency on a hard math item; or tool use versus a giant model guessing arithmetic."),
    q("recall", "Is post-training 'just style'?", "No. It is a large part of instruction following, refusal, and format — capability users actually feel."),
   ],
   links=[
    {"title": "OpenAI: models overview", "url": f"{OAI}/models"},
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
   ],
  ),
  "training-data-vs-the-weights-you-call": entry(
   what="""When you call an API you are calling a **frozen function**: a file of **weights** plus a serving stack. Those weights were produced from **training data** earlier. The API does **not** browse that data, and it does **not** browse the web, unless the product added a **tool** (search, retrieval). Your prompt is new input to the frozen function, not an update to the weights.

Fine-tuning and RAG are how you change behaviour later: one edits weights (or adapters), the other edits the prompt with retrieved text. A normal chat call does neither.

"The model saw my PDF" is only true if you put the PDF (or its chunks) in the request, or you trained on it.""",
   why="""On the job this is the freshness and privacy conversation. Interviewers ask whether a chat API updates on last week's news (no, cutoff plus no browse). They ask whether sending a prompt trains the model (not unless the vendor's terms say they may use it — a policy issue, not a weight update you control). They ask how to add private facts (context, RAG, or a fine-tune).

Confusing weights with a live database is how people ship stale answers and accidental data-retention beliefs.""",
   how="""Customer: "What did we release yesterday?" Frozen weights: guess or refuse. With a tool: you fetch the release notes and put them in context.

Private handbook: do not hope it was in the training mix. Retrieve the paragraph. That text is in the **request**, not in the weights.

If you need the model to change its default style for 10M calls, consider a fine-tune. If you need last night's row, retrieve it. Do not fine-tune nightly for operational data.""",
   failures="""1. **Believing the API browses** by default.

2. **Believing a prompt updates weights.**

3. **Putting secrets in prompts** thinking they vanish; the vendor may log them.

4. **Fine-tuning for facts that change daily.**""",
   line="""The API is a frozen weight file. Training data is in the past. It does not browse unless I add a tool, and my prompt does not update the weights. Private or fresh facts go in the request (or a tool), not in hope.""",
   key_points=[
    "You call frozen weights, not the training corpus.",
    "No web browse unless a tool exists.",
    "A prompt is input, not a weight update.",
    "RAG puts facts in the request; fine-tune edits weights.",
    "Daily facts are retrieval, not nightly fine-tunes.",
    "Vendor logging is a policy issue, separate from learning.",
   ],
   questions=[
    q("recall", "Does a normal chat API browse the web?", "No. It applies frozen weights to your prompt. Browse is a tool some products add."),
    q("apply", "How do you add last night's order status?", "Query your database and put the result in the prompt, or expose a tool. Do not ask the model to remember."),
    q("debug", "A teammate thinks pasting a PDF once trained the company model. What do you say?", "That call conditioned one completion. The weights did not change. Tomorrow's call will not have the PDF unless you send it again or store it in retrieval."),
    q("apply", "When is fine-tuning the right way to add information?", "When you want a stable style or a large static domain in the weights. Not for rapidly changing operational facts."),
    q("recall", "What is 'frozen' here?", "The deployed parameters do not change when you call the API. Training already happened."),
   ],
   links=[
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
    {"title": "Anthropic: retrieval overview", "url": "https://docs.anthropic.com/en/docs/build-with-claude/retrieval"},
   ],
  ),
  "likelihood-is-not-a-database-lookup": entry(
   what="""The model **samples a continuation**. It does **not retrieve a stored sentence**. Even a memorised-looking quote is a high-likelihood path through tokens, not a `SELECT text FROM memory`. That is why the quote can be a word off, why two calls differ, and why "it said it last time" is not a lookup guarantee.

Likelihood is "under these weights, this next token is common". Truth is a property of the world. They overlap when the training text was consistent and your prompt points at that region. They diverge constantly.

This is the mechanism under hallucination, later in M1.9.""",
   why="""On the job, people treat a fluent sentence as a fetched record. Interviewers will ask you to separate probability from retrieval. They want this sentence: we sample; we do not look up. Then they want a design consequence: if you need the same sentence, store it yourself.

This also explains why "prompt it to be accurate" has a ceiling. You are still sampling.""",
   how="""Ask twice: "Quote the first sentence of our licence." Without the licence in context you get two fluent near-quotes. With the sentence in context you still should copy it in code if it must be exact — or constrain the model to extract a span and check the span is a substring.

Logits are not rows. `argmax` is still not a primary key. A RAG hit is a row (or a chunk). Keep the types straight in the design doc.

When a user says "the bot told me X yesterday", you look in *your* logs, not in the model.""",
   failures="""1. **Using the model as the record** of what was said. Log it.

2. **Exact legal text** from memory.

3. **Believing argmax = lookup.**

4. **No substring check** on extracted quotes.""",
   line="""We sample a likely continuation; we do not fetch a stored sentence. If I need the same words, I store them and I check spans. Likelihood is not a primary key.""",
   key_points=[
    "Sampling ≠ SELECT.",
    "A near-quote can still be a high-likelihood invention.",
    "Argmax is not a lookup.",
    "Store and verify text that must be exact.",
    "User history lives in your logs, not in the weights.",
    "This is the root of hallucination.",
   ],
   questions=[
    q("recall", "Does the model retrieve a stored sentence when it quotes something?", "No. It samples a high-likelihood continuation. The quote can be wrong even when it looks memorised."),
    q("apply", "How do you emit a legal sentence exactly?", "Retrieve the sentence, require the model to extract a span, and check it is a substring — or skip the model and return the stored text."),
    q("debug", "A user says the bot promised a refund yesterday. Where do you look?", "Your conversation store and tools, not the model. The model has no session."),
    q("apply", "Why can two greedy calls still differ across vendors?", "Implementation details, batching, and numeric differences. Even then, neither call is a database get."),
    q("recall", "How is this different from RAG?", "RAG fetches stored chunks into the prompt. The model still samples the answer. The lookup is your retriever, not the LLM."),
   ],
   links=[
    {"title": "Hugging Face: generation", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
    {"title": "OpenAI: text generation", "url": f"{OAI}/guides/text-generation"},
   ],
  ),
  "scale-data-and-algorithms-together": entry(
   what="""**Scale** (parameters, context, cluster size), **data**, and **algorithms** (architecture, objectives, optimisers, post-training, inference tricks) **work together**. "Just more parameters" is a slogan from a period when scale was the binding constraint. Today a smaller MoE, a better mix, or more test-time compute can beat a larger dense model on a task.

You will still see parameter counts on slides. Treat them as one coordinate. Read the card for data claims, context, and post-training. Then ignore the card and run your eval.

This is the same four-lever idea, said as a slogan you can use in a meeting.""",
   why="""On the job, procurement will send a spreadsheet of billions. Interviewers want you to refuse a single-axis ranking. They will ask why a 400B-class model might be the wrong buy (cost, latency, your data not in it, a 8B specialist wins).

They want the phrase: capability comes from all three, not just more parameters.""",
   how="""Meeting talk: "If we 4× parameters without the data or the post-training, we buy a slower, more expensive prior. If we invest in retrieval and evals, this 8B may be enough."

Experiment: same prompt, 8B vs 70B vs 70B+RAG. Often RAG wins on internal facts. That is data at inference, not parameters.

Reasoning models: you are buying algorithm + test-time compute, not just a bigger file.

When you read "8x7B" on an MoE card, that is algorithm (routing) plus scale (total vs active). Count both.""",
   failures="""1. **Ranking vendors by parameters.**

2. **Ignoring data rights and mix.**

3. **Ignoring inference algorithms** (speculative decoding, reasoning).

4. **No eval** to settle the argument.""",
   line="""Scale, data and algorithms together. I will not buy parameters as a personality. I put the three on the table, then I run our eval — often retrieval or a smaller specialist beats a bigger prior.""",
   key_points=[
    "Three coordinates: scale, data, algorithms.",
    "Parameters alone are a slogan.",
    "MoE and reasoning change the algorithm axis.",
    "RAG is data at inference.",
    "Your eval settles the meeting.",
    "Cost and latency are part of scale.",
   ],
   questions=[
    q("recall", "Why is 'just more parameters' incomplete?", "Data quality and algorithms (architecture, post-training, inference) can dominate. A larger file on the wrong mix loses."),
    q("apply", "How do you answer a spreadsheet of parameter counts?", "Add columns for your eval score, latency, cost, context, and whether you will retrieve. Then pick; do not sort by billions."),
    q("debug", "A 70B without RAG loses to an 8B with the handbook in context. What axis won?", "Data at inference (the handbook), not parameters."),
    q("apply", "Where does an MoE sit on these axes?", "Algorithm (routing) plus scale (total vs active parameters). Read both numbers."),
    q("recall", "What settles a scale-vs-data argument?", "A measurement on your task, not a card."),
   ],
   links=[
    {"title": "Hugging Face: model cards", "url": "https://huggingface.co/docs/hub/en/model-cards"},
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
   ],
  ),
  "interview": entry(
   what="""You will be asked **what an LLM cannot do**. Name **tool use**, **fresh facts**, and **guaranteed arithmetic** as things you **add around** the model. The answer is a system sketch, not a complaint about models.

They may follow with "so why use one?" — language-shaped work: draft, extract, classify with a validator, summarise retrieved text. Keep both halves.""",
   why="""This is the Level 1 closer. Interviewers are testing whether you will bolt a chatbot onto a billing system and hope. The senior answer is the wrap: tools, retrieval, code. On the job you will give this answer to a PM in week one.""",
   how="""Talk track:

"The model continues tokens. It cannot fetch last night's order, cannot guarantee a sum, and cannot call refund unless I give it a tool I enforce. I retrieve facts, I compute in SQL or Python, I expose tools with allow-lists, and I validate outputs. I use the model for the language-shaped middle: classify the ticket, draft the reply from retrieved policy, extract fields into a schema."

If they ask about search: "only if I add a search tool; the weights are frozen."

If they ask about temperature 0 arithmetic: "still not a guarantee; I use a calculator."

Thirty seconds, then stop. Do not tour transformers unless they ask.""",
   failures="""1. **Only listing weaknesses** with no wrap.

2. **Saying a bigger model fixes freshness.**

3. **Forgetting you still use the model** for language work.

4. **A 10-minute architecture dump.**""",
   line="""An LLM cannot fetch fresh facts, cannot guarantee arithmetic, and cannot use tools I did not give it. I add retrieval, code, and allow-listed tools around it. I still use it for language-shaped work on top of those sources.""",
   key_points=[
    "Cannot: tools (unless you add them), fresh facts, guaranteed math.",
    "You wrap the model to get those.",
    "Still useful for language-shaped work.",
    "Frozen weights do not browse.",
    "Keep the answer to thirty seconds unless they ask more.",
    "Bigger does not replace the wrap.",
   ],
   questions=[
    q("apply", "What can an LLM not do, and what do you add?", "No tools, no fresh facts, no guaranteed arithmetic by default. I add allow-listed tools, retrieval or a DB, and code for sums. I validate outputs."),
    q("recall", "Does a bigger model get last night's order?", "No. Fresh facts need retrieval or a tool. Scale does not update the weights overnight."),
    q("apply", "Why still use an LLM if you wrap it this hard?", "To turn retrieved text and structured fields into language: classify, extract, draft. The wrap is the source of truth; the model is the interface."),
    q("debug", "A candidate says they would prompt harder for correct sums. What do you say?", "Prompting does not make token sampling a calculator. Call a tool or run SQL."),
    q("recall", "Name the three cannots this prompt wants.", "Tool use (unless added), fresh facts, guaranteed arithmetic."),
   ],
   links=[
    {"title": "OpenAI: function calling", "url": f"{OAI}/guides/function-calling"},
    {"title": "Anthropic: tool use", "url": "https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview"},
   ],
  ),
 }
}
