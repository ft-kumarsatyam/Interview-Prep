from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-6": {
  "from-probabilities-to-a-chosen-token": entry(
   what="""The model outputs a **vector of logits**, one per vocabulary item. A **softmax** turns them into a **probability distribution** over the next token. **Sampling** (or argmax) **chooses** which token actually appears. Everything in this module is about that **choose** step: temperature, top-p, top-k, penalties, stops, max tokens.

If you skip choose, you have a distribution and no text. If you always argmax, you have greedy decoding. If you sample, you have diversity and variance.

The API hides the softmax. You still set the knobs that reshape the distribution before the draw.""",
   why="""Interviewers ask "the model outputs probabilities — then what?" This is the answer. On the job, people tune temperature without knowing it only lives here. They also confuse "the model is random" (choose) with "the model is wrong" (weights).

Once you see choose as a separate step, greedy vs sample and JSON-vs-poem settings make sense.""",
   how="""Pipeline: logits → (penalties) → (temperature) → (top-k / top-p filter) → softmax or renormalise → sample or argmax → emit id.

Example: logits say `Paris` 8.0, `Lyon` 4.0, `banana` -2. Temperature 0 (or near) → Paris. Temperature high → Lyon and even banana become possible.

You cannot fix a missing fact by sampling harder. You are reshaping a distribution that does not contain the fact.

Log the chosen token only if you need it; usually you log the string and the settings.""",
   failures="""1. **Treating logits as the answer.**

2. **Tuning temperature to fix retrieval.**

3. **Forgetting the filter** (top-p) also changes the support.

4. **Assuming the API softmax is something you implement.**""",
   line="""Logits become a distribution; sampling or argmax chooses the token. Temperature and top-p live in that choose step. I reshape the distribution for the task; I do not use sampling to invent missing facts.""",
   key_points=[
    "Logits → distribution → choose.",
    "Greedy is argmax; sampling draws.",
    "Temperature and top-p reshape before the draw.",
    "Choose cannot add a fact that is not likely.",
    "This step is where randomness lives.",
    "Settings belong in the logged request.",
   ],
   questions=[
    q("recall", "What happens after the model produces next-token logits?", "They are turned into a probability distribution and then a token is chosen by argmax or sampling, after optional temperature and nucleus/top-k filters."),
    q("apply", "Can you fix a missing policy fact by raising temperature?", "No. You are sampling from a distribution that does not contain the fact. Retrieve the policy."),
    q("debug", "Two calls, same prompt, different answers. Where is the variance?", "Mostly in the choose step (and possible implementation noise). Log the seed and settings if the vendor supports them."),
    q("apply", "Where do you record temperature in a production system?", "On the request record with the model id. Otherwise you cannot replay a bug."),
    q("recall", "What is greedy decoding?", "Always pick the highest-probability token (argmax). No draw."),
   ],
   links=[
    {"title": "Hugging Face: generation strategies", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
    {"title": "OpenAI: text generation", "url": f"{OAI}/guides/text-generation"},
   ],
  ),
  "temperature-top-p-top-k-penalties": entry(
   what="""**Greedy** = argmax. **Temperature** T>0 softens (T>1) or sharpens (T<1) the distribution; T near 0 is greedy-like. **Top-p (nucleus)** keeps the smallest set of tokens whose mass ≥ p, then samples. **Top-k** keeps k tokens. **Max output tokens** is a hard stop. **Stop sequences** end the loop when they appear. **Repetition / frequency / presence penalties** down-weight tokens already used (vendor-specific).

You rarely need all knobs. Pick a small set and keep them in config. Reasoning models may ignore some of these (next items).

Penalties are for prose. They wreck JSON and code.""",
   why="""This is the vocabulary interviewers expect. On the job, a shared config beats every engineer inventing a cocktail. They will ask top-p vs temperature (they interact; do not crank both blindly). They will ask why max_tokens is not optional (runaway cost).""",
   how="""Sane defaults:

- Extract / classify / JSON: T=0–0.3, stop on the fence, max_tokens small, no penalties.
- Draft reply: T=0.5–0.8, modest max, maybe light frequency penalty if it loops.
- Brainstorm: T≈1, top-p 0.9.

Do not set top-p 0.1 and T=2. You are fighting yourself.

Stops: include the next-role tag if you self-host. APIs often handle this.

Penalties: if the model repeats "Thank you for reaching out", a small frequency penalty can help. If it must emit `{"label":...}` twice the same key, a penalty can break the schema.""",
   failures="""1. **Every knob at once.**

2. **Penalties on JSON.**

3. **No max_tokens.**

4. **Stop sequence that appears in the data** (cut mid-answer).""",
   line="""Temperature, top-p, top-k, max tokens, stops, optional penalties. I use a small set: low T for structure, no penalties on JSON, always a max and a stop. I do not mix every knob on one call.""",
   key_points=[
    "T sharpens or flattens; near 0 is greedy-like.",
    "Top-p and top-k truncate the tail.",
    "max_tokens and stops bound the loop.",
    "Penalties are for prose loops, not schemas.",
    "Do not crank T and top-p in opposite directions.",
    "Keep the cocktail in config, not in folklore.",
   ],
   questions=[
    q("recall", "What does temperature do?", "It scales logits before softmax. Higher T flattens the distribution (more random); lower T sharpens it (more greedy)."),
    q("apply", "Which knobs for a JSON classifier?", "Low temperature, small max_tokens, stop sequences, no repetition penalties. Prefer a schema if the API has one."),
    q("debug", "JSON keys come out unique and the model invents `labell`. You set a presence penalty. Why?", "The penalty discouraged repeating 'label'. Turn penalties off for structured output."),
    q("apply", "Top-p 0.9 versus top-k 50 — how do you choose?", "Top-p adapts to peaked or flat distributions. Top-k is a fixed cut. Pick one; do not stack aggressively with high T."),
    q("recall", "Why always set max_tokens?", "Without it a loop or a ramble can run to the context cap and you pay for every token."),
   ],
   links=[
    {"title": "Hugging Face: generation strategies", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
    {"title": "OpenAI: sampling parameters", "url": f"{OAI}/api-reference/chat/create"},
   ],
  ),
  "matching-randomness-to-the-task": entry(
   what="""**Low randomness** for **extraction, structured output, classification, factual QA**. **Higher randomness** for **brainstorming, creative writing, diverse alternatives**. The task decides the cocktail, not your taste. A classifier at T=1.2 will flip labels. A poet at T=0 will bore.

If you need several diverse options, sample n times at moderate T, or use an API `n` if it exists. If you need one canonical label, greedy and a validator.

"Creative" is not an excuse to skip a schema when the output must parse.""",
   why="""Interviewers will give you two tasks and ask for settings. This is the scoring item. On the job, a shared routing table (task → settings) prevents each feature from inventing knobs.

They will trap you with "make the JSON more creative" — no.""",
   how="""Table:

| Task | T | extras |
| classify | 0–0.2 | enum / schema |
| extract fields | 0–0.2 | schema, max small |
| RAG answer | 0.2–0.5 | stop, cite ids |
| support draft | 0.4–0.7 | |
| names for a feature | 0.8–1.1 | n=5 |

Store the table in config. Eval when you change it.

If a factual answer is bland but correct, do not raise T to make it "engaging" until you have a style pass that cannot change facts.""",
   failures="""1. **One global T=0.7** for every route.

2. **Creative JSON.**

3. **Raising T to fix hedging** on facts.

4. **n=1 on a brainstorm feature.**""",
   line="""Low randomness for extract, classify, JSON, facts. Higher for brainstorm and creative text. I keep a task→settings table and I never 'creativise' a schema.""",
   key_points=[
    "Task picks the randomness, not habit.",
    "Structure and facts: low T.",
    "Ideas and variety: higher T or n samples.",
    "Do not use T to fix missing context.",
    "A global default is a bug.",
    "Style passes must not be allowed to edit facts.",
   ],
   questions=[
    q("apply", "Settings for classification versus brainstorming feature names?", "Classify: T≈0, schema, small max. Names: T≈1, n several samples, no schema required."),
    q("recall", "Why is a global temperature a smell?", "Tasks disagree. One value will either flip labels or flatten creative work."),
    q("debug", "A JSON extractor started inventing fields after someone set T=0.9 for 'livelier UX'. Fix?", "Put T back down and move liveliness to a later prose field if you need it. The extractor is not a poet."),
    q("apply", "How do you get diverse but valid replies?", "Sample n at moderate T, then filter with a validator. Do not raise T until the schema breaks."),
    q("recall", "Does low T make answers true?", "No. It makes them more typical given the prompt. Truth still needs retrieval and checks."),
   ],
   links=[
    {"title": "OpenAI: prompt engineering", "url": f"{OAI}/guides/prompt-engineering"},
    {"title": "Hugging Face: generation strategies", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
   ],
  ),
  "differences-across-model-apis": entry(
   what="""**Not every API exposes the same knobs.** Some hide top-k. Some ignore temperature on a "reasoning" model. Some use `max_completion_tokens` instead of `max_tokens`. Some apply penalties only on certain families. **Read the doc for the model you call.** A shared `GenerationConfig` that you send to every vendor will silently drop fields or 400.

Reasoning models often **spend internal tokens** and give you less control over the visible sample. Treat them as a different product, not as "GPT with T=0.3".

Wrappers should map a small internal enum (strict / default / creative) to each vendor's legal set.""",
   why="""On the job, a 400 from `temperature` on a new snapshot is this topic. Interviewers want you to say "I read the model doc" and "I do not assume OpenAI knobs on every host".

They will ask what you do when a reasoning model ignores T (pick another model or accept it; do not crank T).""",
   how="""Adapter:

```
def params(model: str, style: Style) -> dict:
    if is_reasoning(model):
        return {"max_output": ..., "effort": ...}  # their knobs
    return {"temperature": STYLE[style], "top_p": 1, "max_tokens": ...}
```

On 400, log the body. Do not retry with the same illegal field.

When you add a vendor, write a 10-line matrix: T, top_p, penalties, seed, stop, max. Leave blanks where unsupported.

Eval after a snapshot change; they may have remapped defaults.""",
   failures="""1. **One request body** for every vendor.

2. **Retrying illegal params.**

3. **Assuming T still works** on a reasoning snapshot.

4. **No adapter tests.**""",
   line="""Knobs are per model API. I map an internal style to each vendor's legal set, I read the doc when we add a snapshot, and I do not send temperature to a model that does not take it.""",
   key_points=[
    "APIs differ: names, legal ranges, ignored fields.",
    "Reasoning models often expose less sampling control.",
    "Adapter maps a small internal enum.",
    "400 on a param is a mapping bug, not a retry case.",
    "Re-read the doc on snapshot change.",
    "Do not assume OpenAI's body everywhere.",
   ],
   questions=[
    q("recall", "Why might temperature be rejected or ignored?", "That model or snapshot does not expose it — common on some reasoning products — or the field name changed."),
    q("apply", "How do you support two vendors without forking every call site?", "An internal style enum and a per-model adapter that emits only legal fields."),
    q("debug", "You sent top_k to a vendor that only has top_p and got 400. Next step?", "Drop the field in the adapter. Do not retry the same body. Document the matrix."),
    q("apply", "A reasoning model ignores T and you need deterministic JSON. What do you do?", "Use a non-reasoning model for that route, or the vendor's structured-output API. Do not sit on T."),
    q("recall", "What belongs in the vendor matrix?", "Temperature, top_p/top_k, penalties, seed, stop, max tokens, structured output, and what a reasoning model accepts."),
   ],
   links=[
    {"title": "OpenAI: reasoning models", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: messages parameters", "url": "https://docs.anthropic.com/en/api/messages"},
   ],
  ),
  "greedy-decode-vs-sampling": entry(
   what="""**Greedy** (T=0 / argmax) is **not always deterministic** across **providers, versions, or batch sizes**. Floating-point, kernels, and batching can change ties. Sampling is explicitly random (plus a seed if offered). You use greedy for **stability and structure**, not for a bit-identical legal guarantee.

Seeds help **debugging**. They are not a **correctness** contract (next item). If you need bit-identical, you are in the wrong interface — compute it in code.

Greedy can also get stuck in a loop; a stop and a max still matter.""",
   why="""Interviewers love "is T=0 deterministic?" The senior answer is "usually more stable, not guaranteed". On the job this is why two regions disagreed on a classification and both were T=0.

Do not promise a court that greedy is a program.""",
   how="""Use greedy for labels and JSON. Still validate. If two calls disagree, log the provider request id and the model snapshot — it happens.

If you need reproducibility for a demo, set seed *and* pin the snapshot *and* accept leftover drift. For a unit test of *your* parser, do not call the model; fixture the string.

Looping greedy: repeat of a token sequence. Stop, penalty, or a smaller max. Or a bug in the prompt (it asked to continue forever).""",
   failures="""1. **Promising bit-identical greedy.**

2. **Unit tests that hit the live API** at T=0 and flake.

3. **No max** so greedy loops.

4. **Different snapshots** in two regions.""",
   line="""Greedy is more stable, not a deterministic program. I use it for structure, I still validate, and I pin snapshots. Seeds help me debug; they do not make a court-ready replay.""",
   key_points=[
    "T=0 is usually stabler, not bit-identical.",
    "Providers, kernels and batches can break ties differently.",
    "Still validate structured output.",
    "Do not use live greedy calls as unit tests.",
    "Greedy can loop — keep max and stop.",
    "Pin the snapshot if you care about stability.",
   ],
   questions=[
    q("recall", "Is temperature 0 deterministic?", "Not always across providers, versions or batch sizes. It is greedy-like and usually stabler, not a guarantee."),
    q("apply", "How do you unit-test a JSON parser?", "With fixture strings. Do not call the model in the unit test, even at T=0."),
    q("debug", "Two regions classify differently at T=0. What do you check?", "Model snapshot, prompt bytes, and accept that ties can flip. Add a validator and a pin. Do not blame temperature first."),
    q("apply", "When is sampling required?", "When you want diversity (brainstorm, multiple candidates) or when greedy loops on bland text."),
    q("recall", "Can greedy still run away?", "Yes — repetitive loops. max_tokens and stop sequences still apply."),
   ],
   links=[
    {"title": "Hugging Face: generation strategies", "url": "https://huggingface.co/docs/transformers/en/generation_strategies"},
    {"title": "OpenAI: reproducibility notes", "url": f"{OAI}/guides/text-generation"},
   ],
  ),
  "repetition-and-frequency-penalties": entry(
   what="""**Repetition / frequency / presence penalties** reduce the chance of tokens (or sequences) that already appeared. They help **creative prose** that is stuck in a loop ("Thank you for your email" × 20). They **hurt JSON, classification, and code**, where repeating a key or a type name is required.

Names and math differ by vendor. Read the doc. If you do not have a loop problem, leave them at 0.

A better fix for loops is often a stop, a smaller max, or a clearer prompt — not a penalty cocktail.""",
   why="""On the job someone turns on penalties globally because one blog said so. Then extractors break. Interviewers will ask when *not* to use them. That is this card.

They may ask presence vs frequency (presence = seen at all; frequency = how often — vendor-specific).""",
   how="""Enable only on the brainstorm route after you see a real loop. Keep extract/classify at 0.

If a support draft loops a greeting, try: shorter max, "do not repeat the greeting", then a small frequency penalty.

If a code model must emit `return` ten times, a penalty is wrong.

Never copy penalty values between vendors without reading; scales differ.""",
   failures="""1. **Global penalties.**

2. **Penalties on JSON/code.**

3. **Penalties instead of a stop.**

4. **Copied magic numbers** across APIs.""",
   line="""Penalties are for prose loops. I leave them off for JSON, labels and code. A stop and a max are the first fix; a penalty is a last, route-local knob.""",
   key_points=[
    "Penalties down-weight already-used tokens.",
    "Useful for stuck prose.",
    "Harmful for schemas and code.",
    "Default 0 unless you have a loop.",
    "Vendor scales differ.",
    "Stop/max first, penalty later.",
   ],
   questions=[
    q("recall", "When do you use a frequency or presence penalty?", "When creative or conversational text is looping. Not on JSON, classification, or code."),
    q("apply", "A classifier repeats the word 'label' and you added a presence penalty. What happens?", "It may avoid the required key. Turn the penalty off; use a schema."),
    q("debug", "Global penalty=0.8 in the SDK client. Extractors flake. Fix?", "Set 0 on structured routes. Keep the penalty only on the prose route if you still need it."),
    q("apply", "What do you try before a penalty?", "A stop sequence, a smaller max_tokens, and a prompt that forbids the loop. Then a small route-local penalty."),
    q("recall", "Why not copy penalty=0.7 from a blog to another vendor?", "The scale and definition (presence vs frequency) differ. You can wreck the distribution."),
   ],
   links=[
    {"title": "OpenAI: presence and frequency penalty", "url": f"{OAI}/api-reference/chat/create"},
    {"title": "Hugging Face: repetition penalty", "url": "https://huggingface.co/docs/transformers/en/main_classes/text_generation"},
   ],
  ),
  "seed-and-reproducibility-limits": entry(
   what="""A **seed** fixes the RNG for sampling **when the vendor supports it** and **when everything else is identical**: model snapshot, prompt bytes, knobs, sometimes batch. Seeds **help debugging** ("same seed, still different → the prompt changed"). They are **not a correctness guarantee** and not available everywhere.

Even with a seed, greedy tie-breaks can move. Even with a seed, a new snapshot is a new function.

Do not build a ledger on seeded completions.""",
   why="""Interviewers ask "how do you reproduce a completion?" You say: pin snapshot, log prompt hash, settings, seed if any, request id. You do not say "seed=42 and we are done". On the job this is why a replay test is flaky.

This pairs with greedy-not-deterministic.""",
   how="""Log: `model, snapshot, seed, temperature, prompt_hash, request_id`. When a bug repeats, replay with those. If the vendor has no seed, still log the rest — you can see whether *you* changed the prompt.

For evals, run n samples and report a distribution, not one seeded number you liked.

For CI, fixture the model output. Use the live API in a scheduled eval, not in every PR if it is non-deterministic.""",
   failures="""1. **Seed as a product promise.**

2. **No snapshot pin.**

3. **CI that calls the live API** and asserts a string.

4. **Assuming every vendor has seed.**""",
   line="""Seeds help me replay a sample when the vendor offers them. They are not a guarantee. I pin the snapshot, hash the prompt, and I do not put seeded completions in a ledger or a unit test.""",
   key_points=[
    "Seed fixes RNG only if the vendor says so.",
    "Snapshot, prompt and knobs must match too.",
    "Still not bit-identical everywhere.",
    "Great for debug; bad as a contract.",
    "Evals should report distributions.",
    "CI should fixture model strings.",
   ],
   questions=[
    q("recall", "What does a seed guarantee?", "At best, the same sample given the same snapshot, prompt and knobs on that vendor. It is not a general correctness guarantee."),
    q("apply", "What do you log to replay a buggy completion?", "Model snapshot, prompt hash, sampling settings, seed if any, and the vendor request id."),
    q("debug", "Same seed, different text after a 'silent' model update. Why?", "The snapshot changed. The function is new. Pin versions."),
    q("apply", "Should a PR test assert the exact LLM string?", "No. Fixture the string and test your parser. Run live evals out of band."),
    q("recall", "Do all APIs support seed?", "No. Check the vendor matrix."),
   ],
   links=[
    {"title": "OpenAI: seed parameter", "url": f"{OAI}/api-reference/chat/create"},
    {"title": "Hugging Face: set_seed", "url": "https://huggingface.co/docs/transformers/en/main_classes/text_generation"},
   ],
  ),
  "interview": entry(
   what="""**Pick sampling for JSON:** **low temperature**, **stop sequences**, and a **schema** beat clever penalties. Say that. Add a small max_tokens. Mention structured-output / constrained decoding if the vendor has it. Do not mention nucleus unless they ask.

This is the applied cousin of "matching randomness to the task".""",
   why="""Whiteboard classic. Interviewers want a conservative, parseable setup. On the job it is the default for every extractor you ship.""",
   how="""Talk track:

"For JSON I want the typical completion, not a creative one. Temperature at or near 0, a short max_tokens, stops so it does not ramble after the closing brace, and a schema or Pydantic parse with a retry. I turn penalties off so keys can repeat. If the vendor has structured outputs or a grammar, I use that instead of hoping. I still validate. I do not use a frequency penalty to 'help' the JSON."

If they ask about failures: retry once with a repair prompt, then dead-letter. Do not sample n=8 and hope.""",
   failures="""1. **T=0.9 plus penalties.**

2. **No validator.**

3. **No max/stop.**

4. **A 3-minute top-p lecture.**""",
   line="""JSON: low temperature, stops, a schema, no penalties, small max. Constrained decoding if we have it. I still validate. Clever penalties are how keys disappear.""",
   key_points=[
    "Low T, schema, stops, small max.",
    "No penalties on JSON.",
    "Prefer vendor structured output.",
    "Always validate.",
    "Retry/repair, then dead-letter.",
    "Do not lecture on nucleus unless asked.",
   ],
   questions=[
    q("apply", "Pick sampling for JSON.", "Temperature near 0, small max_tokens, stop sequences, no repetition penalties, plus a schema or structured-output API. Validate in code."),
    q("recall", "Why not a frequency penalty on JSON?", "It can discourage repeating required keys and tokens like quotes and colons."),
    q("apply", "The vendor has a JSON schema mode. Do you still set T=0?", "Yes if the field exists, and you still validate. Schema mode is the main lever; T is backup."),
    q("debug", "A candidate sets T=1.1 to 'explore field names'. What do you say?", "Field names are a closed set. Exploring them is a bug. Use the schema."),
    q("recall", "What do you do when parse fails?", "One repair retry with the error, then fail the request or dead-letter. Do not silently pick a random sample."),
   ],
   links=[
    {"title": "OpenAI: structured outputs", "url": f"{OAI}/guides/structured-outputs"},
    {"title": "Pydantic: validation", "url": "https://docs.pydantic.dev/latest/concepts/models/"},
   ],
  ),
 }
}
