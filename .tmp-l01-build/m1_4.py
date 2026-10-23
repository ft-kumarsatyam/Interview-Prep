from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-4": {
  "pretraining-self-supervision": entry(
   what="""**Pretraining** is the long, expensive stage where a model reads a huge text mix and learns to predict the next token. **Self-supervision** means the **label is the next token itself** — no human tagged "this is a noun". Every sequence is a training example. That is how you can spend a trillion tokens without a trillion human labels.

The objective is still next-token prediction. The data is web-scale text, code, books, and whatever the lab mixed. The output of pretraining is a **base model**: a fluent completer, not yet a polite assistant.

You do not run this at work. You consume its result.""",
   why="""On the job you will hear "pretrained on internet text" as a privacy and cutoff story. Interviewers want: the signal is the next token; that is self-supervision; that is why scale is possible. They want you to distinguish this from SFT (next topic cluster).

They may ask why the model can write code it was not "taught" as a course — because code was in the mix and the objective does not care about domain.""",
   how="""Take a sentence. Hide the last word. The model predicts it. Slide one token. Repeat. Billions of times. The weights absorb grammar, facts that appeared often, and stylistic priors.

A lab documents the mix at a high level (and often not). You cannot delete a fact from the weights later. You can avoid putting private data into *your* prompts and into any fine-tune you control.

Base checkpoints are what you would continue-pretrain or SFT. Chat products are post-trained descendants.""",
   failures="""1. **Thinking humans labelled every sentence.**

2. **Thinking pretraining is instruction following.**

3. **Thinking you can untrain a fact** with a prompt.

4. **Confusing your RAG corpus with pretraining.**""",
   line="""Pretraining is next-token prediction on a huge mix. The label is the next token — self-supervision — which is how you train at that scale. The result is a base completer, not yet a chat assistant.""",
   key_points=[
    "Pretraining: predict the next token on a huge mix.",
    "Self-supervision: the next token is the label.",
    "No human tag per sentence.",
    "Output is a base model, not an assistant.",
    "You consume this; you do not run it at work.",
    "Facts in the mix are not a database you can edit.",
   ],
   questions=[
    q("recall", "What is self-supervised about pretraining?", "The next token in the text is the label. You do not need a human to tag each example."),
    q("apply", "Why can labs train on trillions of tokens?", "Every sequence yields many next-token examples. The web and code dumps scale; human labels do not."),
    q("debug", "A PM says the model was taught tickets like a course. What actually happened?", "If tickets were not in the mix, it was not taught. Fluency on support-like prose is transfer from similar text, not your schema."),
    q("apply", "What do you get at the end of pretraining?", "A base model that completes text. Instruction following comes later."),
    q("recall", "Can you delete a pretrained fact with a system prompt?", "You can steer away from it; you cannot erase the weights. For private facts, do not put them in training you control, and do not rely on prompts as deletion."),
   ],
   links=[
    {"title": "Hugging Face: pretraining", "url": "https://huggingface.co/docs/transformers/en/training"},
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
   ],
  ),
  "what-pretraining-teaches": entry(
   what="""From next-token prediction on a huge mix the model picks up **grammar**, **frequent facts**, **patterns**, **concepts**, **relationships**, **code syntax**, and **problem-solving patterns** that were written down often enough. It is a statistical imprint, not a curriculum. Rare facts and private facts are missing or fragile. Skills that were never in text (your internal tool API) are absent.

"Teaches" is a metaphor. The objective never said "learn grammar". Grammar is useful for predicting the next token, so it appears.

This is why a base model can complete a Python function and also complete a toxic rant — both were in the mix.""",
   why="""Interviewers ask what pretraining gives you so they can ask what it does *not*. On the job this is why you still need SFT, tools, and RAG. A candidate who thinks pretraining = a helpful employee has skipped post-training.

This also explains surprising transfer: math word problems in the mix help some reasoning; Stack Overflow helps code.""",
   how="""Evidence you will see: a base model continues `def fib(n):` with plausible code. It continues `The CEO of` with a likely name that may be stale. It continues an unfinished insult.

What it did not learn: your ticket schema, last week's price, the decision to refuse harm. Those are post-training, tools, or context.

When a capability appears "for free" (JSON-ish, HTML), it is usually because those strings were common. When it fails (your proprietary DSL), you add examples or a grammar.""",
   failures="""1. **Curriculum story** — someone sat and taught topics.

2. **Assuming rare facts are solid.**

3. **Assuming ethics were in the objective.**

4. **Expecting private APIs** to be known.""",
   line="""Pretraining imprints grammar, common facts, code syntax and patterns that helped predict the next token. It is not a course and it is not your company handbook. Rare, private and post-cutoff things are missing.""",
   key_points=[
    "Grammar, frequent facts, patterns, code syntax emerge from the objective.",
    "There is no topic curriculum.",
    "Rare and private facts are weak or absent.",
    "Base models complete; they do not politely refuse by design.",
    "Transfer comes from similar text in the mix.",
    "Your DSL and schema are not in there.",
   ],
   questions=[
    q("recall", "What kinds of things does pretraining tend to imprint?", "Grammar, common facts, regular patterns, relationships, code syntax, and problem formats that appeared often."),
    q("apply", "Why can a base model write Python but not your internal RPC DSL?", "Python is all over the mix. Your DSL is not. You add examples, a grammar, or a tool."),
    q("debug", "A base model completes a hateful prompt fluently. Is pretraining broken?", "No. That text was in the mix and the objective is completion. Refusal is post-training."),
    q("apply", "Where do 'skills' like JSON shape come from?", "Lots of JSON in the mix, plus later SFT. Not a JSON module you can toggle."),
    q("recall", "Did anyone label 'this sentence teaches grammar'?", "No. Grammar helped predict tokens, so the weights reflect it."),
   ],
   links=[
    {"title": "Hugging Face: causal LM training", "url": "https://huggingface.co/docs/transformers/en/tasks/language_modeling"},
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
   ],
  ),
  "memorization-vs-generalization": entry(
   what="""**Memorisation** is reproducing a training string (or a near copy). **Generalisation** is producing a useful continuation for a prompt the model has **never seen verbatim**. LLMs do both. A famous paragraph may come back almost intact. A new ticket subject line still gets a plausible label because similar patterns existed.

You cannot tell from one fluent answer which happened. That is why "it knew the answer" is not evidence of a lookup, and why copyright and privacy teams care about extraction attacks.

Generalisation is why few-shot works. Memorisation is why data leaks and eval contamination exist.""",
   why="""Interviewers ask how a model can answer a question it has not seen — pattern completion, not a new brain. They ask whether models memorise — yes, especially duplicated or unique strings. On the job this is eval contamination (M1.11) and "don't put secrets in training".

The senior line: we assume both, we measure on held-out real tasks, we do not put secrets in any corpus we control.""",
   how="""Near-copy: a Wikipedia opening line might be regenerated. That can be memorisation.

New combo: "Classify this ticket about a 2026 promo code the model never saw" — if it says billing, that is generalisation from other promo-code tickets in the mix or in context.

You test generalisation with **your** held-out examples, not with MMLU items that may have leaked. You reduce memorisation risk by not training on passwords, and by not needing the model to be the store of unique text.

If legal asks "can it regurgitate our book", the honest answer is "possibly if it was in the mix or the prompt; we will not put the book in a fine-tune without review".""",
   failures="""1. **All answers are memorised.** Then few-shot would not work.

2. **Nothing is memorised.** Then extraction and contamination would not exist.

3. **Using public bench items as proof of generalisation.**

4. **Training on secrets.**""",
   line="""Models both memorise and generalise. A new ticket can still be labelled; a famous paragraph can come back. I do not treat fluency as lookup, I eval on held-out real work, and I keep secrets out of any corpus I control.""",
   key_points=[
    "Memorisation: near-copy of training text.",
    "Generalisation: useful output on unseen prompts.",
    "Models do both; fluency does not tell you which.",
    "Few-shot relies on generalisation.",
    "Contamination and leaks rely on memorisation.",
    "Held-out real tasks measure the thing you care about.",
   ],
   questions=[
    q("recall", "How can a model answer a question it has not seen verbatim?", "It generalises patterns from similar text. That is not a stored Q&A card, and it is not proof of truth."),
    q("apply", "When should you worry about memorisation?", "When unique or sensitive strings were in training, when you use public benches, or when legal asks about regurgitation."),
    q("debug", "A demo uses an MMLU question the model nails. Why is that weak evidence?", "The item may have been in the mix (contamination). Use a private held-out set."),
    q("apply", "Where do you put a customer password?", "Never in pretraining, fine-tunes, logs, or prompts if you can avoid it. The model is not a vault, and it can memorise."),
    q("recall", "Is a correct label on a new ticket memorisation?", "Usually generalisation (or context). You cannot be sure from one example; that is why you measure on many held-out tickets."),
   ],
   links=[
    {"title": "Hugging Face: evaluation", "url": "https://huggingface.co/docs/transformers/en/perplexity"},
    {"title": "OpenAI: evaluations", "url": f"{OAI}/guides/evals"},
   ],
  ),
  "the-post-training-pipeline": entry(
   what="""The usual pipeline is **Pretraining → Supervised Fine-Tuning (SFT) → Preference / Reinforcement training → Deployed assistant**. Pretraining makes a completer. **SFT** teaches it to follow example dialogues (helpful format). **Preference** training (RLHF, DPO, RLAIF, …) teaches it which of two answers people (or a judge model) prefer. **Safety** tuning is mixed through these stages. The thing you call in a chat API is the end of this pipe, not the base checkpoint.

Labs vary the names and skip or repeat stages. The idea is stable: first predict the internet, then imitate assistants, then rank better answers.

You can stop after SFT and ship a cheaper, narrower model. Many "instruct" open weights are mostly SFT.""",
   why="""Interviewers will ask you to name the pipe in order. On the job this is why a base model feels rude and a chat model hedges. It is also why "fine-tune" in a meeting is ambiguous — SFT or preference?

If you cannot order the stages you will mis-buy a base model for a chatbot.""",
   how="""Story: base completes `User: How do I reset my password?` with more forum junk. After SFT it produces an assistant-shaped reply. After preference it prefers the reply that does not leak another user's reset link and that asks for the account email in the right tone.

Your job: pick the right checkpoint (base vs instruct vs "reasoning"), and if you fine-tune, know which stage you are imitating. Do not RLHF in the first week of a product.

Document the pipeline on a slide with four boxes. That slide earns trust.""",
   failures="""1. **Calling a base model** in a chat product.

2. **Saying RLHF is pretraining.**

3. **Fine-tuning away safety** by accident with a sloppy SFT set.

4. **Skipping SFT** and hoping preference magically adds format.""",
   line="""Pretrain, then SFT, then preference, then the assistant you call. Base completes the internet; SFT teaches the format; preference teaches taste. I name the stage I am buying or changing.""",
   key_points=[
    "Order: pretrain → SFT → preference → deploy.",
    "Base ≠ chat.",
    "SFT imitates dialogues; preference ranks them.",
    "Safety is woven through, not a separate magic box.",
    "Open 'instruct' is often SFT-heavy.",
    "Know which stage you are touching when you fine-tune.",
   ],
   questions=[
    q("recall", "Name the post-training pipeline in order.", "Pretraining, supervised fine-tuning, preference or reinforcement training, then the deployed assistant."),
    q("apply", "You need a chatbot. Which checkpoint do you call?", "An instruct/chat/preference-trained model, not a base completer — unless you are about to SFT it yourself."),
    q("debug", "A team 'fine-tunes' a chat model on raw web text and it stops following instructions. What happened?", "They pushed it back toward pretraining. SFT data should look like the dialogues you want."),
    q("apply", "When is SFT enough without RLHF?", "Narrow tasks with clear target strings: a classifier style, a SQL dialect, a short template. Preference helps when taste and harmlessness matter."),
    q("recall", "Is RLHF the same as pretraining?", "No. Pretraining is next-token on a huge mix. RLHF/preference ranks completions after you already have a model."),
   ],
   links=[
    {"title": "Hugging Face: SFT / alignment", "url": "https://huggingface.co/docs/trl/en/sft_trainer"},
    {"title": "OpenAI: fine-tuning", "url": f"{OAI}/guides/fine-tuning"},
   ],
  ),
  "sft-rlhf-preference-optimization": entry(
   what="""**SFT** is supervised learning on **prompt → ideal response** pairs. The model imitates the target tokens. **RLHF** uses a **reward model** trained on human comparisons, then updates the policy to score higher (classic PPO-style). **RLAIF** uses an AI judge instead of (or with) humans. **Preference optimisation** (DPO and friends) skips an explicit RL loop and trains directly on preferred vs rejected pairs. **Safety tuning** is extra data and constraints in these stages so the model refuses or redirects certain requests.

All of these are **conceptual** for this level: they change what completions are likely, they do not give you a truth layer.

Labs mix them. You rarely implement PPO at work; you might SFT.""",
   why="""Interviewers will ask SFT vs RLHF in one minute (there is a dedicated interview item). They want: SFT = imitate format; preference = pick the better of two. On the job, when a vendor says "aligned", this is the bag of methods they might mean.

They may ask why noisy raters matter (next item but one).""",
   how="""SFT example: 5_000 tickets with the reply you wish agents sent. The model learns that shape.

Preference example: for the same ticket, reply A (empathetic, correct policy) vs B (refunds everything). Humans or a judge pick A. The model becomes more A-like.

Safety: pairs that refuse bomb-making and still help with chemistry homework. Imperfect.

If you SFT on sloppy answers, you imitate slop. If you preference-train on raters who love long answers, you get verbose models. Data quality is the product.""",
   failures="""1. **SFT on unreviewed dumps.**

2. **Preference without a rubric** — raters pick style, not truth.

3. **Calling every method RLHF.**

4. **Expecting safety to be absolute.**""",
   line="""SFT imitates ideal replies. Preference training (RLHF, DPO, RLAIF) pushes toward the answer raters like better. Safety is extra data in those stages. None of them is a truth oracle; the pairs are the product.""",
   key_points=[
    "SFT: imitate prompt→response pairs.",
    "RLHF: reward model + policy update.",
    "DPO-like: learn from preferred vs rejected directly.",
    "RLAIF: AI judges instead of or with humans.",
    "Safety is data and constraints, not a lock.",
    "The pairs decide the personality.",
   ],
   questions=[
    q("recall", "SFT versus RLHF in one minute?", "SFT imitates target replies (format and content of the pairs). RLHF/preference trains the model to prefer the better of two answers according to raters or a judge."),
    q("apply", "You have 2_000 gold replies. Which stage?", "Start with SFT. Add preference later if you have comparisons or a judge and you care about taste/safety."),
    q("debug", "After DPO the model is wordy and sycophantic. What might the pairs have taught?", "Raters preferred longer, more agreeable answers. The method worked; the taste was wrong."),
    q("apply", "What is RLAIF?", "Preference or reward labels from a model judge instead of (or on top of) humans. Cheaper, with judge biases."),
    q("recall", "Does preference training make answers true?", "No. It makes answers more like what the raters or judge preferred. Truth needs tools, retrieval, and eval."),
   ],
   links=[
    {"title": "Hugging Face TRL: DPO", "url": "https://huggingface.co/docs/trl/en/dpo_trainer"},
    {"title": "Hugging Face TRL: SFT", "url": "https://huggingface.co/docs/trl/en/sft_trainer"},
   ],
  ),
  "why-chat-models-behave-as-they-do": entry(
   what="""Chat models **follow instructions**, **answer conversationally**, **refuse** some requests, **hedge**, **structure** answers, and **ask for clarification** because **post-training rewarded those behaviours**, not because the transformer grew a conscience. Base models do not naturally do this. If your SFT set is terse tables, the chat model will be terse. If preference raters like "as an AI language model" hedges, you get hedges.

Refusals are incomplete. A determined user can often jailbreak a tendency. That is why product safety is still policy + tools + filters.

When a model is "helpful" it is imitating helpfulness in the data.""",
   why="""Interviewers ask why ChatGPT-style models talk as they do. The answer is post-training. On the job this explains a vendor change: they updated preference data and now the tone shifted. It also explains why your SFT can overwrite the niceness you liked — or the refusals you needed.

Do not moralise the model. Design around tendencies.""",
   how="""Observe: the same base family, two post-trains, two personalities. One refuses medical advice; one gives a structured disclaimer plus general info. That is data.

If you need a model that always asks one clarifying question when the ticket is empty, put that in SFT and test it. Do not rely on generic helpfulness.

If you need a refusal, also enforce it in code for the actions that matter (no refund tool without a reason code).

When behaviour drifts after a provider update, re-run the golden set; do not argue with the blog.""",
   failures="""1. **Attributing tone to 'the architecture'.**

2. **Relying on refusal** as a security control.

3. **SFT that accidentally removes hedges** you legally wanted — or adds them everywhere.

4. **Not re-evaling** after a vendor post-train.""",
   line="""Chat behaviour is post-trained: instructions, tone, refusals, hedges, structure. It is imitation and preference, not a soul. I encode the behaviour I need in data and tests, and I enforce actions in code.""",
   key_points=[
    "Instruction following is taught after pretraining.",
    "Tone, refuse, hedge, structure come from SFT and preference.",
    "Base models complete; they do not chat by default.",
    "Refusals are tendencies, not locks.",
    "Your SFT set is a personality.",
    "Re-eval after vendor post-train updates.",
   ],
   questions=[
    q("recall", "Why do chat models follow instructions?", "Because SFT and preference training taught them to. Base models are completers."),
    q("apply", "You want empty tickets to trigger a clarifying question. Where do you put that?", "In SFT examples and in a test. Optionally a hard rule in code if the ticket is empty. Do not hope generic helpfulness does it."),
    q("debug", "After you SFT, the model stops refusing a class of requests. What happened?", "Your pairs did not include those refusals (or contradicted them). You overwrote a post-train behaviour. Add the cases or keep a separate policy layer."),
    q("apply", "Is a refusal a security boundary?", "No. It is a trained tendency. Enforce dangerous actions in tools and application code."),
    q("recall", "Why did the tone change when the vendor shipped a new snapshot?", "They changed post-training data or mix. Your prompts sit on a new personality. Re-run evals."),
   ],
   links=[
    {"title": "OpenAI: fine-tuning", "url": f"{OAI}/guides/fine-tuning"},
    {"title": "Anthropic: constitutional-style ideas in docs", "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks"},
   ],
  ),
  "instruction-following-is-post-trained": entry(
   what="""**Base models complete text.** If you start a sentence they finish it. **Chat behaviour is taught after pretraining** with SFT and preference. "Instruction following" is not an emergent switch that flips at 70B; it is a **post-trained skill**. That is why you must pick an instruct checkpoint, apply the chat template, and not send chat-formatted traffic to a base model.

A base model can still follow an instruction if the completion looks like the web (a tutorial that continues with the answer). It is unreliable. Products use instruct models.

This is the one-line version of the pipeline, worth its own card.""",
   why="""People download a base Llama and then say "open models are dumb". They skipped post-training and the template. Interviewers will trap you with that. On the job, the model picker must show base vs instruct.

Hiring screens: "what's the difference between llama-base and llama-instruct" — this topic.""",
   how="""Wrong: send `[INST] ... [/INST]` to a base model, or send raw "Q: ... A:" to a chat model with the wrong template.

Right: instruct model + official template. If you only have a base model, you are doing research or you are about to SFT.

When a vendor offers `*-base` and `*-instruct`, the second is the product default. The first is for fine-tuning or completion.

Test: give a one-line instruction with no few-shot. Base drifts; instruct usually answers in assistant style.""",
   failures="""1. **Base model in a chatbot.**

2. **Blaming the family** when you used the wrong checkpoint.

3. **Wrong template** on an instruct model (looks like base-level quality).

4. **Assuming scale = instruction following.**""",
   line="""Base models complete; instruction following is post-trained. I call an instruct checkpoint with its chat template. If I pick base by mistake I should not blame the family.""",
   key_points=[
    "Base = completer. Instruct = post-trained follower.",
    "Instruction following is taught, not a size unlock.",
    "Use the matching chat template.",
    "Base in a chatbot is a mispick.",
    "You SFT base (or continue from instruct) on purpose.",
    "Wrong template looks like a dumb model.",
   ],
   questions=[
    q("recall", "What is the difference between a base and an instruct model?", "Base completes internet-like text. Instruct was SFT/preference-trained to follow chat instructions."),
    q("apply", "You downloaded Llama and the bot rambles. First check?", "Did you take the instruct checkpoint and apply its chat template? If you used base, switch."),
    q("debug", "A 70B base ignores 'reply in JSON'. A 8B instruct does it. Why?", "Post-training, not size. The 8B was taught to follow; the 70B base is completing."),
    q("apply", "When do you want a base model?", "When you will SFT or continue-pretrain, or you truly want completions, not a chat product."),
    q("recall", "Does crossing 70B make a base model an assistant?", "No. Instruction following is a post-training stage."),
   ],
   links=[
    {"title": "Hugging Face: chat templates", "url": "https://huggingface.co/docs/transformers/en/chat_templating"},
    {"title": "Hugging Face: text generation", "url": "https://huggingface.co/docs/transformers/en/llm_tutorial"},
   ],
  ),
  "preference-data-quality-beats-volume": entry(
   what="""**Noisy raters teach the wrong taste.** A million sloppy comparisons lose to ten thousand careful ones with a rubric. Preference data has **label error**, **position bias**, **sycophancy** (raters like agreeableness), and **verbosity bias**. Volume without a rubric scales the bias.

This is true of SFT gold too, but preference is worse because the signal is a pairwise click, not a full target string.

Labs spend a lot on rater guidelines for this reason. Your internal "thumbs" button is the same problem if PMs click without a definition of good.""",
   why="""On the job, a thumbs-down stream is not an RLHF dataset. Interviewers want to hear that you would write a rubric and spot-check raters (or a judge). They want "quality beats volume" as a sentence.

This also explains sycophantic products: users upvote agreement.""",
   how="""If you collect preferences: write a rubric (correct, cited, safe, concise). Double-rate a sample. Drop rater pairs that disagree too often. Balance length. Blind the order.

If you use an AI judge, eval the judge against a human gold set. A cheap judge with 20% error will train a cheap personality.

For a product, start with SFT on a small gold set you trust. Add preference only when you can afford the rubric. Do not dump six months of thumbs into DPO on a Friday.""",
   failures="""1. **Thumbs as ground truth.**

2. **No rubric.**

3. **Judge model unchecked.**

4. **More data to fix a biased process** — you get more bias.""",
   line="""Preference quality beats volume. Noisy raters and unchecked judges teach the wrong taste — verbosity, sycophancy, style over truth. I write a rubric, I spot-check, and I will not DPO on raw thumbs.""",
   key_points=[
    "Pairwise clicks are easy to get wrong.",
    "Biases: length, position, sycophancy, style.",
    "A rubric and double-rating beat a million noisy pairs.",
    "AI judges need their own eval.",
    "Product thumbs ≠ RLHF dataset.",
    "Volume scales bias if the process is biased.",
   ],
   questions=[
    q("recall", "Why can more preference data make the model worse?", "If raters are noisy or biased, you are amplifying the wrong taste. Quality of pairs beats volume."),
    q("apply", "What would you put in a rater rubric for support replies?", "Correct policy, no invented refunds, no leaked PII, concise, next step clear. Not 'sounds nice' alone."),
    q("debug", "After thumbs-based DPO the bot agrees with wrong user claims. Cause?", "Sycophancy bias in the clicks. Change the rubric and the data; do not add more of the same thumbs."),
    q("apply", "How do you use an LLM-as-judge safely in preference training?", "Calibrate it on a human gold set, measure agreement, and watch for the judge's own verbosity/sycophancy."),
    q("recall", "Why is preference noisier than SFT gold?", "A click between two answers carries less information than a full target string, and raters disagree."),
   ],
   links=[
    {"title": "Hugging Face TRL: DPO", "url": "https://huggingface.co/docs/trl/en/dpo_trainer"},
    {"title": "OpenAI: evals", "url": f"{OAI}/guides/evals"},
   ],
  ),
  "interview": entry(
   what="""**SFT vs RLHF in one minute:** **SFT teaches format** (and the content of the target replies). **Preference training teaches which of two answers is better** according to raters or a judge. Say both sentences. Add that neither installs a truth layer. Sit down.

If they want more: name DPO as a preference method that skips classic RL, and say you would start with SFT on gold replies.""",
   why="""This is a standard screen. Interviewers want crisp definitions, not a paper. On the job you will give the same minute to a PM who said "we should RLHF it".""",
   how="""Talk track:

"SFT is supervised learning on ideal replies — the model imitates those tokens, so it learns the shape of an assistant answer. RLHF and other preference methods show two answers and push the model toward the one people (or a judge) prefer. SFT is 'say it like this'. Preference is 'this one, not that one'. I would SFT first on a small gold set. I would not start with PPO. Neither step makes the model a database."

If they ask safety: "it is extra pairs and constraints in those stages, plus application-side checks."

Thirty to sixty seconds.""",
   failures="""1. **A 10-minute RL lecture.**

2. **Swapping the two definitions.**

3. **Claiming RLHF makes answers true.**

4. **Saying you would RLHF next sprint** with no data plan.""",
   line="""SFT teaches format by imitating gold replies. Preference training teaches which of two answers is better. I SFT first. Neither is a source of truth.""",
   key_points=[
    "SFT = imitate gold replies (format + content of the set).",
    "Preference = this answer, not that one.",
    "Start with SFT.",
    "DPO is preference without classic RL.",
    "Not a truth layer.",
    "Keep it to one minute unless they ask.",
   ],
   questions=[
    q("apply", "SFT vs RLHF in one minute.", "SFT imitates ideal responses so the model learns assistant format and the content of those pairs. RLHF/preference pushes toward the answer raters prefer between two options. I would SFT first. Neither guarantees truth."),
    q("recall", "Which comes first in a sane project?", "SFT on trusted gold. Preference when you have a rubric and comparisons."),
    q("debug", "A candidate says RLHF is how the model reads the internet. What do you say?", "That is pretraining. RLHF is a later ranking stage."),
    q("apply", "They ask you to 'just RLHF' next week. What do you need?", "A rubric, a comparison collection plan, a judge or raters, and an eval. Otherwise do SFT on gold."),
    q("recall", "What does DPO change relative to classic RLHF?", "It trains on preferred vs rejected pairs without an explicit RL loop and reward model, conceptually still preference."),
   ],
   links=[
    {"title": "Hugging Face TRL: SFT", "url": "https://huggingface.co/docs/trl/en/sft_trainer"},
    {"title": "Hugging Face TRL: DPO", "url": "https://huggingface.co/docs/trl/en/dpo_trainer"},
   ],
  ),
 }
}
