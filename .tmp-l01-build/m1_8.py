from helper import entry, q

ANTH = "https://docs.anthropic.com/en/docs/build-with-claude"

NOTES = {
 "m1-8": {
  "what-occupies-the-context-window": entry(
   what="""The **context window** is the token budget for **one call**. It can hold **system instructions**, **conversation history**, **the user prompt**, **documents**, **examples**, **tool outputs**, and **tokens you are about to generate**. Everything shares one number. There is no second pocket for "the important stuff".

If you add a 20-page PDF, you have fewer tokens for history and for the answer. If you keep 40 turns of chat, you have fewer tokens for a new document. The window is a suitcase, not a warehouse.

APIs differ in whether output counts inside the same cap. Read the model card. Either way, you plan as if it all competes.""",
   why="""On the job, "just paste the repo" is how you hit the cap or drown the instruction. Interviewers want a list of occupants and the idea that they compete. They will ask what you drop first (old history, redundant docs — not the standing rule, not the current user turn).

This is the umbrella for the rest of M1.8.""",
   how="""Budget a call:

1. Standing system (small, stable, cacheable).
2. Retrieved snippets (capped, labelled).
3. Last N turns or a summary.
4. This user message.
5. Reserved output (and thinking).

If 2+3+4 blow the cap, summarise history or retrieve less. Do not silently truncate the system prompt.

Log the occupancy by section. When you hit the cap, you will know which section grew.

Tools: each tool result is another occupant. A sloppy tool that returns a 50-page HTML page is a window attack.""",
   failures="""1. **Pasting everything.**

2. **No reserved output.**

3. **Unbounded history.**

4. **Tool dumps.**""",
   line="""The window holds system, history, user, docs, examples, tool output and the answer — one budget. I cap each section, I reserve output, and I log occupancy so I know what to drop.""",
   key_points=[
    "One token budget for all occupants.",
    "System, history, user, docs, examples, tools, output.",
    "They compete; nothing is a free pocket.",
    "Cap retrieval and history.",
    "Reserve room for the answer (and thinking).",
    "Log occupancy by section.",
   ],
   questions=[
    q("recall", "What can occupy the context window?", "System instructions, history, the user prompt, documents, examples, tool outputs, and generated tokens — all in one budget."),
    q("apply", "You must add a long PDF. What do you drop first?", "Older history and redundant pages. Keep the standing rule and the current question. Prefer retrieved excerpts over the whole PDF."),
    q("debug", "A tool returns a 50-page HTML page and the next call 400s on context. Fix?", "Truncate or extract in the tool layer. The window is not a dump."),
    q("apply", "What do you log?", "Tokens per section: system, history, retrieval, user, tools, reserved output. Plus whether you truncated."),
    q("recall", "Is there a separate window for the system prompt?", "Not in the usual decoder-only API. It is just tokens at the start of the same window."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "OpenAI: models (context lengths)", "url": "https://platform.openai.com/docs/models"},
   ],
  ),
  "context-knowledge-memory": entry(
   what="""**Context** is what is **in this request**. **Model knowledge** is what is **in the frozen weights** (training mix, cutoff). **Long-term memory** is what **your system stores** and **re-injects** (a profile, a summary, a DB). These are three different stores. The model cannot "remember" turn one unless you resend it (context) or you wrote it down (your memory). It cannot know last night's news unless it is in weights (unlikely) or you retrieved it (context).

Products that say "memory" are almost always your database plus a prompt. Do not let the metaphor hide the architecture.""",
   why="""Interviewers will ask you to distinguish the three. On the job a PM says "the model remembers our customers". You draw three boxes. This is also how you explain privacy: weights vs logs vs this prompt.

A chatbot "forgetting" is a context/memory bug, not a model bug.""",
   how="""Support bot:

- Knowledge: general English and generic support tone (weights).
- Context: this ticket, retrieved policy paragraph, last 4 turns.
- Memory: customer_id, open order ids, a 200-token profile you load from Postgres.

When the user says "as I said yesterday", you look in memory (your store), not in the weights.

Do not fine-tune nightly to fake memory. Do not stuff the entire CRM into context and call it knowledge.""",
   failures="""1. **One word 'memory'** for all three.

2. **Fine-tune as session store.**

3. **Assuming weights have yesterday.**

4. **No store**, blaming the model for forgetting.""",
   line="""Context is this request, knowledge is the weights, memory is my store that I re-inject. I draw three boxes. Forgetting is almost always my history code, not the network.""",
   key_points=[
    "Context = this call's tokens.",
    "Knowledge = frozen weights / cutoff.",
    "Memory = your store + re-injection.",
    "APIs are stateless.",
    "Do not fine-tune to fake a session.",
    "PMs hear 'memory'; you draw boxes.",
   ],
   questions=[
    q("recall", "Distinguish context, knowledge and memory.", "Context is the current prompt. Knowledge is the frozen training. Memory is application state you store and put back into context."),
    q("apply", "The user says 'like yesterday'. Where do you look?", "Your conversation store. If you did not save it, it is gone. The weights will not have that chat."),
    q("debug", "A teammate wants to fine-tune every night on the day's chats for 'memory'. What do you say?", "That is expensive, leaky, and stale tomorrow. Store summaries and retrieve them."),
    q("apply", "Where does last night's order status live?", "Your database (memory/source of truth), injected into context. Not in knowledge."),
    q("recall", "Why does a chatbot forget between pages if you only send the latest message?", "You dropped context. The API has no session."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "OpenAI: conversation state", "url": "https://platform.openai.com/docs/guides/text-generation"},
   ],
  ),
  "what-goes-wrong-in-long-contexts": entry(
   what="""Long contexts fail in boring ways: **truncation** (you or the API cut the tail or the head), **attention degradation** (quality drops as length grows), **lost-in-the-middle** (models recall begins and ends better than the middle), and **dilution** (the instruction is a drop in a lake of tokens). A 128k window is not a 128k brain.

You will see: the model ignores a sentence on page 12, follows a contradictory line on page 1, or "summarises" without the one number you needed.

Needle-in-a-haystack benches can pass while your messy PDF fails (later item).""",
   why="""Interviewers want these failure names. On the job this is why "we upgraded to 128k" did not fix RAG. The fix is still retrieve less, structure more, put the question last.

They will ask where you put the instruction (start + short reminder near the end).""",
   how="""Symptoms → moves:

- Truncation: log it; never silent. Drop old history first.
- Lost in the middle: put the ask last; repeat the rule; do not bury the citation in page 8 of 40.
- Dilution: fewer, better chunks; headings; XML-ish fences.
- Degradation: do not use the last 10% of the window if eval says quality falls off.

If you must send a long doc, add a contents list and point at sections. Better: do not send the long doc.""",
   failures="""1. **Silent truncation.**

2. **Celebrating a 128k upgrade** without eval.

3. **Burying the question.**

4. **Needle-test cargo cult.**""",
   line="""Long context fails by truncation, weaker attention, lost-in-the-middle and dilution. I log cuts, I put the question last, I retrieve less, and I do not treat a big window as a big brain.""",
   key_points=[
    "Truncation, degradation, lost-in-the-middle, dilution.",
    "A big window is not equal use of every token.",
    "Put the ask last; repeat standing rules.",
    "Log silent cuts.",
    "Fewer better chunks beat a dump.",
    "Eval on real docs, not only needles.",
   ],
   questions=[
    q("recall", "Name four long-context failure modes.", "Truncation, attention degradation, lost-in-the-middle, and context dilution."),
    q("apply", "Where do you put the user question in a long prompt?", "Last, with a short reminder of the rule. Do not bury it in the middle of a PDF."),
    q("debug", "The model missed a sentence on page 12 of 40. What do you try first?", "Retrieve that page (or less), add headings, put the question last. Do not just buy a longer window."),
    q("apply", "How do you detect truncation?", "Compare tokenised length to the cap and log which section you dropped. Never fail open."),
    q("recall", "What is lost-in-the-middle?", "Models often use the beginning and end of a long context better than the middle, so buried facts get dropped."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "OpenAI: prompt caching / long context", "url": "https://platform.openai.com/docs/guides/prompt-caching"},
   ],
  ),
  "why-a-big-window-is-not-enough": entry(
   what="""A model **supporting** 128k or 1M tokens does **not** mean it **uses every token equally well**. The card's number is a **capacity**. Usable context is an **eval**. You still pay to prefill the whole thing. You still lose facts in the middle. You still drown the instruction.

Buy a big window for the rare case you need it (a whole small repo, a long contract you already structured). Do not change your architecture to "paste everything" because the number is large.

Usable ≠ advertised.""",
   why="""Vendors advertise millions. Interviewers want this skepticism. On the job it is how you refuse a "just dump the data lake in the prompt" design.

They will ask how you would measure usable context (real tasks at 8k/32k/128k, not a needle).""",
   how="""Eval ladder: same 30 questions, context at 4k, 16k, 64k of *your* messy text. Plot accuracy and TTFT. Many models fall off before the advertised cap.

Architecture: retrieval + small window remains the default. Long window is a fallback when retrieval is the wrong tool (the user asked to "compare these two attached contracts").

Cost: prefill of 200k tokens is a line item even if quality were perfect.""",
   failures="""1. **Architecture = max window.**

2. **No eval at length.**

3. **Ignoring prefill cost.**

4. **Needle pass → ship dump.**""",
   line="""A big window is capacity, not usable attention. I still retrieve, I still structure, I eval at length on our docs, and I refuse 'paste the lake' because the card says 1M.""",
   key_points=[
    "Advertised cap ≠ usable quality.",
    "Prefill still costs.",
    "Eval at 4k/16k/64k on real text.",
    "Retrieval remains the default.",
    "Long window is a fallback, not an architecture.",
    "Needle tests are not enough.",
   ],
   questions=[
    q("recall", "Why is a huge context window not enough?", "The model may not use the middle well, prefill is expensive, and quality often drops before the advertised cap."),
    q("apply", "How do you measure usable context?", "Run the same real questions with 4k/16k/64k of your actual documents and plot quality and TTFT."),
    q("debug", "A design says 'GPT has 1M so we paste the warehouse'. Your comment?", "Capacity is not architecture. Retrieve, structure, eval. The bill and the middle-loss will hurt."),
    q("apply", "When is a long window the right tool?", "When the user explicitly needs a whole small artefact compared in one shot, and eval says quality holds at that length."),
    q("recall", "Does a needle-in-a-haystack pass mean your PDF works?", "No. Needles are easy to spot. Messy layout and conflicting sentences are harder."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "Google: long context (Gemini)", "url": "https://ai.google.dev/gemini-api/docs/long-context"},
   ],
  ),
  "prompt-history-tools-and-output-share-one-window": entry(
   what="""**Every token you add is a token you cannot generate** (or cannot keep in history). Prompt, history, tool traces, and the reserved answer **share one window**. A generous tool log will starve the reply. A generous reply reservation will starve the docs. You **allocate**.

This is the suitcase packing problem stated as a rule you can say in a meeting.

Streaming does not add a second window. It only changes when the user sees the output tokens.""",
   why="""On the job, agents die because tool traces filled the window. Interviewers want this sentence: every token you add is a token you cannot generate. They will ask what you reserve (enough for the answer plus thinking).

This is a design constraint for M1.8 and for later agent levels.""",
   how="""Allocator:

- system ≤ 800
- retrieval ≤ 3k
- history ≤ 2k (else summarise)
- tools ≤ 2k (else trim oldest tool results)
- reserve output+think ≥ 1k

When a section overflows, trim that section by policy, do not steal from reserve silently.

For an agent loop, treat each step as a new packing problem. Drop old tool HTML first.""",
   failures="""1. **No reserve.**

2. **Unbounded tool traces.**

3. **Silent steal** from the system prompt.

4. **Assuming stream = extra room.**""",
   line="""Prompt, history, tools and output share one window. Every token I add is a token I cannot generate. I allocate caps and I reserve the answer. I trim tool traces first.""",
   key_points=[
    "One suitcase: prompt, history, tools, output.",
    "Adding tokens steals from the answer (or from history).",
    "Reserve output (and thinking).",
    "Trim tool traces first.",
    "Summarise history before you steal the system prompt.",
    "Streaming is not more room.",
   ],
   questions=[
    q("recall", "Why do prompt, history, tools and output share one window?", "The model sees one token sequence with a max length. Every token in occupies a slot you cannot use for something else."),
    q("apply", "An agent loop 400s on context after five tool calls. What do you trim?", "Old tool results (especially HTML). Then old history. Never the current user goal or the standing rule."),
    q("debug", "You reserved 0 for output and answers truncate mid-JSON. Fix?", "Reserve max_tokens for the answer (and thinking) before you pack docs."),
    q("apply", "Write a simple allocator.", "Hard caps per section plus a reserved output floor. Overflow trims the lowest-priority section with a log line."),
    q("recall", "Does streaming increase the window?", "No. It only changes when tokens are shown."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "OpenAI: models", "url": "https://platform.openai.com/docs/models"},
   ],
  ),
  "needle-tests-vs-real-long-documents": entry(
   what="""A **needle test** hides a unique sentence in a long haystack and asks the model to repeat it. Many models **pass**. A **messy PDF** with **conflicting sentences**, **tables**, **headers**, and **no unique phrase** still **fails**. Passing the needle is a **minimum**, not a **product eval**.

Needles are easy because they are unique and the question quotes them. Your policy doc is hard because three paragraphs almost say the opposite thing.

Do not ship "we passed needle@100k" as the RAG launch criterion.""",
   why="""Vendors love needle plots. Interviewers want you to puncture them. On the job this is the comment you leave on a slide.

They will ask what you would use instead: real questions on real documents, with a grader.""",
   how="""Keep a 20-item set from real files: "what is the refund window if the item is on sale?" where page 2 and page 9 disagree. Score answers against a key. Run at several lengths.

You may still run a needle as a smoke test that the pipeline did not drop the file. It is not the launch bar.

If a vendor only sends needle plots, ask for their long-document QA set or run yours.""",
   failures="""1. **Needle as the launch metric.**

2. **A unique synthetic sentence** unlike your prose.

3. **No conflicting-paragraph items.**

4. **Ignoring tables and headers.**""",
   line="""Needle tests can pass while a messy PDF fails. I smoke-test with a needle if I want, and I launch on real questions over real, conflicting documents.""",
   key_points=[
    "Needle = unique sentence in a haystack.",
    "Easy to pass; not your product.",
    "Real docs have conflict, tables, layout.",
    "Launch on real QA items.",
    "Needle is a smoke test at most.",
    "Ask vendors for more than a plot.",
   ],
   questions=[
    q("recall", "What is a needle test?", "Hide a unique sentence in a long context and ask the model to retrieve it. It is a synthetic recall test."),
    q("apply", "Why can a model pass needle and fail your PDF?", "Your PDF has conflicting, non-unique sentences and layout. The needle is easy to spot and quoted in the question."),
    q("debug", "A slide says '100% at 128k needle' and they want to dump manuals. Your comment?", "Needles are not manuals. Run real questions. Keep retrieval."),
    q("apply", "What does a real long-doc item look like?", "A question whose answer is buried, maybe contradicted elsewhere, maybe in a table — with a written key."),
    q("recall", "When is a needle still useful?", "As a smoke test that the text actually reached the model. Not as the quality bar."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "Google: long context", "url": "https://ai.google.dev/gemini-api/docs/long-context"},
   ],
  ),
  "interview": entry(
   what="""**What you put in the window:** **standing rules**, **retrieved evidence**, **the user turn** — and **what you leave out** (the rest of the lake, old chatter, raw tool HTML). Say the packing order and one thing you refuse to dump. Thirty seconds.

They may ask where the question goes (last) and what you reserve (the answer).""",
   why="""This is the M1.8 closer. Interviewers want a packing list, not a lecture on RoPE. On the job it is the same list you write in the design doc.""",
   how="""Talk track:

"I put a short standing rule first, then a few retrieved snippets with ids, then a compact history or summary, then the user question last. I reserve tokens for the answer. I leave out the rest of the corpus, raw HTML from tools, and ancient turns. A big window does not change that packing. If I cannot fit it, I retrieve less or summarise history — I do not silently truncate the rule."

If they ask about 1M context: capacity, not a reason to dump.""",
   failures="""1. **"I would paste everything."**

2. **No reserve.**

3. **Question in the middle.**

4. **A transformer lecture.**""",
   line="""Standing rules, retrieved evidence, user turn last, reserve the answer. I leave out the lake, old chatter and tool HTML. A big window does not change the packing list.""",
   key_points=[
    "In: rules, retrieved evidence, user last.",
    "Out: the lake, old chatter, raw HTML.",
    "Reserve output.",
    "Do not silent-truncate the rule.",
    "Big window ≠ dump.",
    "Thirty seconds, then stop.",
   ],
   questions=[
    q("apply", "What do you put in the window, and what do you leave out?", "Standing rules, retrieved evidence, compact history, user turn last; reserve the answer. Leave out the rest of the corpus, ancient turns, and raw tool HTML."),
    q("recall", "Where does the user question go?", "Last, so it is not lost in the middle."),
    q("apply", "You cannot fit the pack. What yields first?", "Old history and extra chunks. Not the standing rule, not the current question, not the output reserve."),
    q("debug", "A candidate says they would paste the repo because the window is 1M. Your reply?", "Capacity is not usable attention or a free lunch on prefill. Retrieve and pack."),
    q("recall", "Why reserve answer tokens?", "Otherwise docs and tools can leave no room to generate — especially with hidden thinking."),
   ],
   links=[
    {"title": "Anthropic: context windows", "url": f"{ANTH}/context-windows"},
    {"title": "Anthropic: prompt engineering overview", "url": f"{ANTH}/prompt-engineering/overview"},
   ],
  ),
 }
}
