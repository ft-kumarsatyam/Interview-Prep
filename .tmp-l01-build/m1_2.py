from helper import entry, q

HF = "https://huggingface.co/docs/transformers/en"

NOTES = {
 "m1-2": {
  "characters-words-tokens": entry(
   what="""A **character** is a Unicode code point (roughly). A **word** is a human unit. A **token** is the model's unit: a chunk of text from a **tokenizer**'s vocabulary, mapped to an integer **token id**. Models run on ids, not on characters. Different tokenizers **split the same string differently**, so the same sentence can be 8 tokens in one model and 20 in another.

Subword tokenizers (BPE, Unigram, WordPiece) split rare words into pieces. Common words may be one token. Spaces and punctuation are tokens or parts of tokens. You cannot count words and bill tokens as equal.

The tokenizer is part of the model. You do not reuse another model's ids.""",
   why="""On the job, cost, context, and weird spelling bugs are token bugs. Interviewers ask you to distinguish the three units and to say why a tokenizer exists (a finite vocab over an infinite string space). They ask why `len(text)` is not the bill.

They may ask you to guess a token count and then say "I would check with the real tokenizer". That is the interview item later in this module.""",
   how="""`unbelievable` might be `un` `believe` `able` — three tokens. `the` is usually one. A space may attach to the next word (` the`). Token ids are integers like `1422`. The model embeds those ids.

Python sketch:

```
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("...")
ids = tok.encode("Hello, world")
print(ids, tok.convert_ids_to_tokens(ids))
```

Compare two tokenizers on the same string. The splits will differ. Never send model A's ids to model B.

For billing, `len(ids)` is the number you care about, plus the extra tokens in the chat template.""",
   failures="""1. **Counting words** as tokens.

2. **Reusing ids** across models.

3. **Forgetting the chat template** tokens in the count.

4. **Assuming a space is free.**""",
   line="""Models run on token ids, not characters or words. Tokenizers split the same text differently. I count with the real tokenizer, and I never reuse another model's ids.""",
   key_points=[
    "Character ≠ word ≠ token.",
    "A token is a vocab piece with an integer id.",
    "Subwords split rare words.",
    "Tokenizers disagree on the same string.",
    "Bills and context use token counts.",
    "Do not reuse ids across models.",
   ],
   questions=[
    q("recall", "What is a token in an LLM?", "A vocabulary piece the model was trained on, mapped to an integer id. The network sees ids, not raw characters."),
    q("apply", "Why can two models bill the same prompt differently?", "Different tokenizers split the text into different numbers of tokens, and chat templates add different extras."),
    q("debug", "You send tokenizer-A ids into model B and get garbage. Why?", "Ids are model-specific. The same integer means a different piece of text in B's vocab."),
    q("apply", "How do you inspect a split?", "Use that model's tokenizer encode and convert_ids_to_tokens. Do not guess from spaces."),
    q("recall", "Why do tokenizers exist?", "A finite vocabulary cannot list every string. Subwords compose rare words from pieces."),
   ],
   links=[
    {"title": "Hugging Face: tokenizer summary", "url": f"{HF}/tokenizer_summary"},
    {"title": "OpenAI: tokenization", "url": "https://platform.openai.com/tokenizer"},
   ],
  ),
  "tokenizing-across-languages-code": entry(
   what="""Tokenizers trained mostly on English **split other scripts, code, numbers, and emojis differently**. Hindi/Devanagari, mixed Hindi-English, and CJK often use **more tokens per character**. Unusual English words split into many subwords. **Code** has many punctuation tokens. **Numbers** may be digit-by-digit or in odd groups. **Emojis** can be several tokens each.

The same "short" user message can be cheap in English and expensive in Hindi. A 12-digit id can be 12 tokens. A pretty-printed JSON can dwarf the compact one.

There is no universal 4-characters-per-token. That rule of thumb is English-ish.""",
   why="""On the job, an India-facing app that budgeted English token rates will blow the bill and the context window. Interviewers like a Hindi or code example. They want you to say: I would measure with the real tokenizer on real traffic, not on lorem ipsum.

Spelling and character-level tasks fail more when the model sees subwords, not characters. That is the next topic's cousin.""",
   how="""Compare:

```
tok.encode("hello")
tok.encode("नमस्ते")
tok.encode("user_id_1842")
tok.encode("🙂")
tok.encode("for i in range(10):")
```

Note counts. For mixed "Kal Hindi mein reply do", you will see a mix of Latin and Devanagari pieces.

In production, log token counts per locale. Set context budgets with the worst language in the mix, not the English demo.

When you need character-level control (a 6-char OTP), do not ask the model to count; use code.""",
   failures="""1. **English-only budgets** for a multilingual product.

2. **Pretty JSON** eating the window.

3. **Assuming one emoji is one token.**

4. **Guessing number tokenisation.**""",
   line="""Scripts, code, numbers and emojis do not tokenise like English words. I measure with the real tokenizer on real locales. The 4-characters-per-token rule is only a rough English prior.""",
   key_points=[
    "Non-English scripts often cost more tokens.",
    "Code and punctuation are token-heavy.",
    "Numbers and emojis split in surprising ways.",
    "4 chars/token is an English thumb-rule.",
    "Measure on real traffic per locale.",
    "Character-level tasks belong in code.",
   ],
   questions=[
    q("apply", "Why might a Hindi SMS blow a budget sized on English?", "Devanagari often tokenises to more tokens per character. The same 'short' message is a longer id sequence."),
    q("recall", "Name three strings that tokenise surprisingly.", "A long number, an emoji, a Devanagari sentence, a pretty-printed JSON, a long identifier."),
    q("debug", "A code-review prompt hits the context cap but the file 'is only 400 lines'. Cause?", "Punctuation and indentation become many tokens. Count tokens, not lines."),
    q("apply", "How do you set a multilingual context budget?", "Tokenise samples from each locale with the production tokenizer and plan for the expensive tail, not the English mean."),
    q("recall", "Should you ask the model to count characters in an OTP?", "No. It sees subwords, not characters. Count in code."),
   ],
   links=[
    {"title": "Hugging Face: tokenizer summary", "url": f"{HF}/tokenizer_summary"},
    {"title": "OpenAI tokenizer tool", "url": "https://platform.openai.com/tokenizer"},
   ],
  ),
  "why-tokens-drive-cost-and-latency": entry(
   what="""APIs bill **input tokens** and **output tokens**, often at different rates. The **context window** is a token cap, not a character cap. **Output length** is more loops (decode), so it dominates **latency** after the first token. Tokenisation also explains **spelling** struggles, **character-counting** failures, and **odd number** behaviour: the model does not see characters or place-value the way you do.

A long system prompt is a tax on every call. A chatty completion is a tax on time and money. Caching (later levels) exists because prefixes are token-expensive.

Reasoning models may bill hidden thinking tokens too.""",
   why="""On the job this is the invoice and the p95. Interviewers ask why a 2× longer answer is more than 2× slower (decode is sequential). They ask why your "short" prompt is huge (template + policy + history). They ask why the model cannot reliably count letters in "strawberry" (subword pieces).

They want you to connect tokenisation to money, not leave it as NLP trivia.""",
   how="""Measure: log `prompt_tokens` and `completion_tokens` from the API. Set `max_tokens` so a runaway cannot print a novel. Put stable policy in a cacheable prefix if the vendor supports it. Keep history summarised.

Number example: `384729` may be several tokens, so carry-the-one arithmetic is unreliable. Use a tool.

Latency: prefill grows with input tokens; decode grows with output tokens. A 10-token answer on a huge prompt can still have a slow first token (prefill). A 2_000-token essay is slow even on a tiny prompt.""",
   failures="""1. **No max_tokens.**

2. **Pasting a book** into every call.

3. **Trusting letter counts.**

4. **Ignoring thinking tokens** on reasoning models.""",
   line="""Tokens are what you buy and what fill the window. Outputs dominate latency; inputs dominate prefill and the cache. I log both counts, I cap outputs, and I do not ask the model to count characters or do long arithmetic in tokens.""",
   key_points=[
    "Bills and windows are in tokens.",
    "Output tokens are sequential decode — latency.",
    "Input tokens are prefill and context tax.",
    "Subwords break spelling and counting.",
    "Numbers are awkward token sequences.",
    "Log both counts; set max_tokens.",
   ],
   questions=[
    q("recall", "Why do tokens drive cost and latency?", "APIs charge per token; the window is in tokens; each output token is another decode step. Inputs also cost prefill compute."),
    q("apply", "Why is a long answer slower than a long prompt in user-perceived time after the first token?", "After prefill, decode is one token after another. Output length adds sequential steps. Input is mostly paid before the first token."),
    q("debug", "The model says 'strawberry' has two r's. Why is that common?", "It sees subword pieces, not a character array. Counting letters is the wrong interface; use code."),
    q("apply", "What do you log on every call?", "prompt_tokens, completion_tokens (and thinking tokens if billed), plus latency. That is the invoice and the SLA."),
    q("recall", "Why can math on a long integer fail?", "The number is split into tokens that are not place-value digits the model can reliably manipulate. Use a calculator tool."),
   ],
   links=[
    {"title": "OpenAI: pricing concepts (tokens)", "url": "https://platform.openai.com/docs/guides/rate-limits"},
    {"title": "Anthropic: token counting", "url": "https://docs.anthropic.com/en/docs/build-with-claude/token-counting"},
   ],
  ),
  "special-tokens-and-chat-templates": entry(
   what="""**Special tokens** mark roles, starts, ends, and stops: `<|user|>`, `<|assistant|>`, EOS, PAD, maybe tool tags. A **chat template** is the model's required way to linearise a list of role-tagged messages into one token string. If you use the **wrong template**, you silently wreck quality: the model may keep speaking as the user, ignore the system turn, or never stop.

The API usually applies the official template. Local serving and raw `generate` often will not unless you call `apply_chat_template`. Stop sequences are tokens too; a missing EOS is how you get rambling.

Templates are model-specific. Copying Llama's template onto another family is a silent bug.""",
   why="""On the job, "the open model is dumb" is often a template bug. Interviewers ask what a chat template is and why it matters. They want: roles are tokens; the model was trained on a layout; the wrong layout is a different task.

They ask how you would debug a local 8B that ignores instructions (print the templated string and compare to the card).""",
   how="""```
tok.apply_chat_template(
    [{"role":"system","content":"..."},
     {"role":"user","content":"..."}],
    tokenize=False, add_generation_prompt=True,
)
```

Compare that string to the model card. If you rolled your own `"User: ...\\nAssistant:"` you may have left the training distribution.

Stops: include EOS and any custom stop. If you stop on `"\\nUser"` but the template uses another tag, you will cut wrong or not at all.

APIs hide this; you still need it when you self-host or debug a provider that "updated the template".""",
   failures="""1. **Home-grown role strings** on a model that expects special tokens.

2. **Forgetting add_generation_prompt.**

3. **Reusing another family's template.**

4. **No EOS** so generations hit max_tokens every time.""",
   line="""Roles and stops are tokens. I use the model's chat template, not a home-grown User:/Assistant: layout. A wrong template silently wrecks quality, especially when I self-host.""",
   key_points=[
    "Special tokens mark roles, ends and stops.",
    "The chat template is part of the model.",
    "Wrong template = silent quality loss.",
    "apply_chat_template (or the official API) — do not invent one.",
    "Templates are family-specific.",
    "Missing EOS causes rambling.",
   ],
   questions=[
    q("recall", "What is a chat template?", "The model-specific way to turn role-tagged messages into the token string it was trained on, including special tokens."),
    q("debug", "A local Llama ignores the system prompt. You concatenated 'System: ...'. What is wrong?", "Llama expects its special tokens and layout. Use apply_chat_template from that tokenizer."),
    q("apply", "Why can a provider change quality without you changing the prompt?", "They may have changed the template or the stop tokens on their side. Pin a snapshot and inspect the rendered prompt if you can."),
    q("apply", "What does add_generation_prompt do?", "It appends the assistant-start tokens so the model continues as the assistant, not as a new user turn."),
    q("recall", "Why are stop sequences tokens too?", "The loop stops when those ids appear. If you set the wrong string, the model never hits it or hits it too early."),
   ],
   links=[
    {"title": "Hugging Face: chat templates", "url": f"{HF}/chat_templating"},
    {"title": "Hugging Face: special tokens", "url": "https://huggingface.co/docs/transformers/en/main_classes/tokenizer#transformers.PreTrainedTokenizer.add_special_tokens"},
   ],
  ),
  "tokenizers-are-model-specific": entry(
   what="""A tokenizer is **shipped with a model**. The vocab, merges, special tokens, and template are a pair. **Never reuse another model's token ids or token counts** to bill, to truncate, or to prompt. The integer `1234` is a different string in two vocabs. A count from tiktoken is the wrong budget for a Llama endpoint.

Vendors publish counting tools for *their* models. Hugging Face tokenizers load from the model repo. If you truncate to 8k using the wrong tokenizer you may send 12k real tokens or cut too early.

Fine-tunes usually keep the base tokenizer. A different family never does.""",
   why="""On the job, a cost dashboard that uses one tokenizer for every vendor is a lie. Interviewers will ask whether you can count with tiktoken for an open model (no). They will ask what happens if you mix ids (garbage embeddings).

This is a short, high-signal "do not do this" topic.""",
   how="""One function per model id:

```
def count(model_id: str, messages: list) -> int:
    tok = load_tokenizer(model_id)
    return len(tok.apply_chat_template(messages, tokenize=True))
```

Do not cache one global tokenizer. When you change `model` in config, the counter changes.

For APIs, prefer the usage object they return after the call, and estimate before the call with *their* counter.

When you migrate from model A to B, re-estimate the whole eval set. Your 6k-token prompt may be 9k now.""",
   failures="""1. **One tiktoken** for every vendor.

2. **Truncating with the wrong tokenizer.**

3. **Reusing a saved id sequence** after a model swap.

4. **Assuming a fine-tune changed the vocab** when it did not — or the reverse.""",
   line="""Tokenizers are paired with models. I count and truncate with that model's tokenizer, I never reuse ids, and I redo budgets when I change model family. A shared counter is a wrong invoice.""",
   key_points=[
    "Tokenizer and model are a pair.",
    "Ids are not portable.",
    "Counts are not portable.",
    "Use the vendor or repo tokenizer for that id.",
    "Re-estimate when you change family.",
    "Fine-tunes usually keep the base vocab — check.",
   ],
   questions=[
    q("recall", "Why not reuse another model's token ids?", "The same integer is a different vocab entry. The model will embed the wrong piece of text."),
    q("apply", "You switch from an OpenAI model to an open-weight model. What do you redo?", "Token budgets, truncation, and cost estimates with the new tokenizer, plus the chat template."),
    q("debug", "Your pre-call estimator says 2k tokens; the API bills 6k. Cause?", "Wrong tokenizer or you omitted the chat template / tools. Use the official counter and the usage field."),
    q("apply", "How should a multi-model gateway count tokens?", "A tokenizer (or vendor API) keyed by model id, never a global. Log both estimate and billed."),
    q("recall", "Are fine-tune ids usually the same as the base?", "Usually yes if it is an adapter or a same-family fine-tune. Always check the card; a new family is a new vocab."),
   ],
   links=[
    {"title": "Hugging Face: tokenizers", "url": f"{HF}/fast_tokenizers"},
    {"title": "OpenAI: tiktoken", "url": "https://platform.openai.com/docs/guides/text-generation/managing-tokens"},
   ],
  ),
  "subword-surprises-in-code-and-numbers": entry(
   what="""A **long number** or **identifier** can **explode** into many tokens. `order_9f3c2ab1e8d44721` is not one token. A UUID can be tens. A 20-digit account number may be digit clusters. Minified code and base64 are worst cases: almost per-byte pieces.

This blows **context** and **cost**, and it hurts **reasoning** about the value (the model does not see the number as a single object). It also hurts **search** inside the model: a typo in one substring is a different token path.

When you log ids in the prompt, you pay for them. Hash or shorten if the model does not need the exact string.""",
   why="""On the job, people paste a 4 KB JWT or a base64 image-as-text into a prompt and then wonder why they hit the window. Interviewers like the UUID/number example. They want: I would not put opaque blobs in the prompt if a short handle will do.

This is a practical special case of the multilingual/code topic.""",
   how="""Measure `len(tok.encode(uuid))`. Compare to `len(tok.encode("the user"))`.

Design: send `order_id` as a short public id if you have one. Keep the UUID in your DB. Do not paste PEM keys or JWTs into the prompt "for context".

For math, send numbers to a tool. For code, send the relevant function, not the minified bundle. For tables, prefer compact CSV over pretty JSON if tokens matter.

If you must send a hex string, know it may be ~1 token per 1–2 chars and budget it.""",
   failures="""1. **Pasting JWTs, PEMs, base64.**

2. **Minified bundles** in the context.

3. **Expecting the model to increment a UUID.**

4. **Not measuring** the explosion.""",
   line="""Long numbers and identifiers split into many tokens. I do not paste UUIDs, JWTs or base64 if a short handle will do, and I do not ask the model to reason about a 20-digit string in pieces. I measure the explosion.""",
   key_points=[
    "UUIDs, long ints, hex and base64 explode.",
    "The model does not see one number-object.",
    "Opaque blobs are a context tax and a leak risk.",
    "Send short handles; keep exact ids in your DB.",
    "Minified code is token-hostile.",
    "Measure encode() on your real ids.",
   ],
   questions=[
    q("recall", "What happens when you tokenise a UUID or a long number?", "It usually becomes many tokens, not one. Cost, context and arithmetic all get worse."),
    q("apply", "Should you put a JWT in the prompt so the model 'understands the user'?", "No. It is expensive, a secret, and unreadable as subwords. Send the claims you already parsed."),
    q("debug", "A 'small' code prompt hits 8k tokens. You pasted a minified vendor file. Why?", "Almost every punctuation and short ident is a token. Send the source function, not the bundle."),
    q("apply", "How do you pass an order identity to the model cheaply?", "A short public id or an internal integer you map in your DB. Not a 32-char hex if you can avoid it."),
    q("recall", "Why is incrementing an account number in tokens unreliable?", "The digits are split; place value is not explicit. Do it in code."),
   ],
   links=[
    {"title": "Hugging Face: tokenizer summary", "url": f"{HF}/tokenizer_summary"},
    {"title": "OpenAI tokenizer tool", "url": "https://platform.openai.com/tokenizer"},
   ],
  ),
  "interview": entry(
   what="""You will be asked to **estimate tokens for a prompt**. Use **about 4 characters per token in English**, then **check with the real tokenizer**. Say the caveats: other languages, code, numbers, and the chat template. The estimate is for a whiteboard; the check is for production.

They may hand you a 200-word paragraph. 200 words × ~1.3 tokens or 800 characters / 4 ≈ 200 tokens — order of magnitude, not a bill.""",
   why="""Interviewers want a prior and the humility to measure. A candidate who refuses to estimate looks stuck. A candidate who treats 4 chars as a law will break a Hindi or code prompt. On the job you will do both: size a feature on a napkin, then measure.""",
   how="""Talk track:

"English prose is roughly 4 characters per token or a bit under one token per word. This paragraph is ~800 characters, so ~200 tokens, plus maybe 20–50 for the chat template. I would verify with the model's tokenizer before I set a budget. If this were Hindi or JSON I would not use 4; I would measure first."

If they give code, say "I expect worse than 4; punctuation is tokens."

If they ask cost: multiply tokens by the model's listed $/1M input and output separately.

Do not invent a precise 217. Do give a range.""",
   failures="""1. **Refusing to estimate.**

2. **Treating 4 as exact.**

3. **Forgetting the template.**

4. **Using English rules on code or Hindi.**""",
   line="""About 4 characters per token in English, then I check with the real tokenizer. I add the chat template, and I drop the rule of thumb for other languages, code and numbers. Estimates size the work; measurements pay the bill.""",
   key_points=[
    "Whiteboard: ~4 chars/token in English.",
    "Then measure with the real tokenizer.",
    "Add template and tool tokens.",
    "Do not use the rule on Hindi, code, or numbers.",
    "Give a range, not a fake precise count.",
    "Price input and output separately.",
   ],
   questions=[
    q("apply", "Estimate tokens for an 800-character English prompt.", "About 200 tokens (800/4), plus tens for the chat template. I would confirm with the model tokenizer before budgeting money."),
    q("recall", "What caveats do you attach to 4 characters per token?", "It is an English-prose prior. Code, other scripts, numbers and templates will differ. Always measure for production."),
    q("apply", "They hand you a JSON payload. How do you estimate?", "Worse than 4 chars/token because of punctuation and keys. I would tokenize a sample rather than divide by 4."),
    q("debug", "A candidate says exactly 217 tokens without a tokenizer. What is wrong?", "False precision. Give a range and offer to measure."),
    q("recall", "Why mention the real tokenizer in the same breath?", "Because the estimate is for conversation; the bill uses that model's split."),
   ],
   links=[
    {"title": "OpenAI tokenizer tool", "url": "https://platform.openai.com/tokenizer"},
    {"title": "Anthropic: token counting", "url": "https://docs.anthropic.com/en/docs/build-with-claude/token-counting"},
   ],
  ),
 }
}
