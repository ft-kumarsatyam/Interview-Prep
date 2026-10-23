from helper import note, LI_HOME, LC_INTRO, LC_CONCEPTS

NOTES = {
 "m4-14": {
  "rebuilding-with-llamaindex-or-langchain": note(
   what="""**Rebuild the hand-built pipeline** in **LlamaIndex or LangChain** (or both, once). Same ingest, chunk, retrieve, assemble, generate, cite, abstain — but using their indexes and query engines. The point is **parity**, not a new product.

You already know the verbs (M4.9). The framework is a faster way to wire them, and a new way to hide them.

Do this after the baseline works. Framework-first is how you skip M4.9.""",
   why="""It is the capstone. On the job, this is how you evaluate a library.""",
   how="""Pick one framework. Map each verb to an object (index, retriever, synthesizer / query engine). Example. Same two-doc fixture as M4.9 must still abstain and cite.

Keep your prompt visible (next notes). Do not enable every integration.""",
   fails="""1. **Framework without a baseline.**

2. **Different chunking** so parity is meaningless.

3. **Enabling every extra** on day one.

4. **Cannot find the prompt.**""",
   line="""I rebuild the hand-built RAG in LlamaIndex or LangChain for speed, on the same fixture, after the baseline already works.""",
   kps=[
    "Rebuild, do not replace, the hand-built verbs.",
    "Same fixture: cite and abstain must still hold.",
    "After M4.9, not instead of it.",
    "Map each verb to one object you can name.",
    "Do not enable every extra on day one.",
    "Pick one framework first.",
   ],
   qs=[
    {"q": "What are you rebuilding in a framework?", "a": "The hand-built pipeline: ingest, chunk, retrieve, assemble, generate, cite, abstain — with the same fixture. Not a new app.", "kind": "recall"},
    {"q": "A teammate starts the level in LlamaIndex with no baseline. What is the risk?", "a": "They cannot print or parity-test the prompt. Hidden defaults will own grounding. Do M4.9 first.", "kind": "debug"},
    {"q": "What must the two-doc fixture still do?", "a": "Answer from A, answer from B, abstain on neither, with checkable citations. If the framework loses that, you are not done.", "kind": "apply"},
    {"q": "Why one framework first?", "a": "So you learn the map. Two at once is a compare before you can see either prompt.", "kind": "apply"},
    {"q": "Is a different chunker allowed in the rebuild?", "a": "Not for the first parity test. Change one variable after the baseline matches.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask which verbs map to which objects. If there is no baseline fixture, they rebuilt nothing.",
  ),
  "indexes-retrievers-query-engines": note(
   what="""Framework vocabulary. **Index**: stored vectors/text (and how they were built). **Retriever**: the object that returns nodes for a query (vector, BM25, hybrid, router). **Query engine**: retrieve + synthesize (assemble+generate). Citations and node metadata ride along if you configured them.

You should be able to **swap the retriever** without rewriting the engine, and to **call the retriever alone** in a test.

If you only ever call `query()`, you cannot debug.""",
   why="""Interviewers will use these words. On the job, this is how you navigate the docs.""",
   how="""Print types. Example. `index.as_retriever(k=10)` then your own assemble; or `as_query_engine` for the full path. Unit-test the retriever with the two-doc fixture (ids only).

Read the constructor kwargs: embed model, chunker, similarity top k.""",
   fails="""1. **Only query()** in production.

2. **Cannot list nodes** without generating.

3. **Unknown embed model** on the index.

4. **Mixing two indexes'** retrievers blindly.""",
   line="""Index stores, retriever proposes nodes, query engine synthesizes. I can call the retriever alone and I know which embedder the index used.""",
   kps=[
    "Index = stored data + build choices.",
    "Retriever = nodes for a query.",
    "Query engine = retrieve + synthesize.",
    "Call the retriever alone in tests.",
    "Know the embedder and k on the index.",
    "query() only is undebuggable.",
   ],
   qs=[
    {"q": "What do index, retriever, and query engine mean in LlamaIndex/LangChain?", "a": "The index is the stored corpus and build. The retriever returns nodes for a query. The query engine retrieves and synthesizes an answer.", "kind": "recall"},
    {"q": "You can only call query() and cannot print nodes. What do you add?", "a": "A retriever handle (as_retriever / getRelevantDocuments) and a log of node ids before synthesize.", "kind": "debug"},
    {"q": "Why swap retrievers under one engine?", "a": "To A/B hybrid vs vector without rewriting assemble. That is the point of the split.", "kind": "apply"},
    {"q": "What constructor facts must you record?", "a": "Embed model id, chunker, k, metric. They are the same contracts as the hand-built path.", "kind": "apply"},
    {"q": "Can you unit-test a query engine like a retriever?", "a": "You can, but you will mock the LLM. Test the retriever with no LLM first — it is cheaper and catches id bugs.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_CONCEPTS],
   review="Ask them to get nodes without generating. If they cannot, they only have query(). Ask which embedder the index uses.",
  ),
  "framework-reranking-query-transforms": note(
   what="""Frameworks ship **rerankers and query transforms** as components (postprocessors, compressors, rewrite chains). Use them to rebuild **the same extras** you would have wired by hand — not a junk drawer of every class in the docs.

Wire one extra at a time, behind a flag, with the same eval as M4.10–M4.11.

A component you cannot log is worse than hand-rolled.""",
   why="""The checklist asks you to implement common improvements via the framework. On the job, this is copy-paste temptation.""",
   how="""Add a reranker postprocessor; log the reorder. Or a rewrite chain; log the rewritten query. Example. Same 50→8→4 shape. Do not also enable a compressor, a HyDE transform, and a router on the same afternoon.

Parity: extras must not drop abstain.""",
   fails="""1. **Every postprocessor** enabled.

2. **No log** of rewrite or rerank.

3. **Losing abstain** after a component.

4. **Different k** than the hand-built extra.""",
   line="""I add framework rerankers and transforms one at a time, with logs and the same eval as the hand-built extras. I do not enable the junk drawer.""",
   kps=[
    "Rerank and rewrite exist as framework components.",
    "One extra at a time, flagged.",
    "Log rewrite text and rerank order.",
    "Abstain must survive the component.",
    "Same 50→8→4 (or your numbers) as hand-built.",
    "Junk-drawer enable is not an implementation.",
   ],
   qs=[
    {"q": "How should you add rerank or query transform in a framework?", "a": "As one component at a time, logged, evaluated the same way as the hand-built version, without turning on every extra in the docs.", "kind": "recall"},
    {"q": "Enabling a compressor dropped citations. What do you do?", "a": "Turn it off, then see what it removed from the nodes. A component that eats spans is not an improvement.", "kind": "debug"},
    {"q": "What do you log for a rewrite chain?", "a": "The rewritten query (or queries) and which transform ran — same as M4.11.", "kind": "apply"},
    {"q": "What shape should a framework reranker keep?", "a": "Shortlist in, fewer nodes out (e.g. 50→8). If it reranks the corpus, you miswired it.", "kind": "apply"},
    {"q": "Why match the hand-built extra?", "a": "So parity tells you the framework did not change behaviour. Two different designs cannot be compared.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask how many extras are on. If more than one unmeasured, push. Ask whether abstain still fires.",
  ),
  "framework-vs-hand-built": note(
   what="""Compare on **control, development speed, debugging, and complexity**. Frameworks win **speed** (indexes, loaders, components). Hand-built wins **control and debugging** (you can print the prompt). Complexity can go either way: a thin framework use is fine; a deep graph of runnables is not.

The honest answer in an interview is **both**: baseline by hand, extras maybe in a framework you can still inspect.

There is no moral victory for either camp.""",
   why="""They will ask which is better. Trade table. On the job, this is the team argument.""",
   how="""Four columns. Example. Speed: framework. Control: hand. Debug: hand unless you logged every component. Complexity: framework can hide or explode.

Pick per surface: ingest loaders maybe framework; assemble prompt maybe hand.""",
   fails="""1. **Always framework.**

2. **Always hand** as purity.

3. **No debug story** for the framework path.

4. **Complexity** ignored.""",
   line="""Frameworks buy speed; hand-built buys control and debugging. I use a framework where I can still inspect retrieve and generate, and I keep the baseline by hand.""",
   kps=[
    "Columns: control, speed, debug, complexity.",
    "Framework → speed; hand → control/debug.",
    "Complexity can explode in either direction.",
    "Both: hand baseline, inspectable framework extras.",
    "No moral victory.",
    "Mix per surface if that keeps the prompt visible.",
   ],
   qs=[
    {"q": "How do you compare a framework RAG to the hand-built one?", "a": "On control, development speed, debugging, and complexity — not on brand. Frameworks usually win speed; hand-built usually wins inspectability.", "kind": "recall"},
    {"q": "A team cannot print the assembled context in LangChain. Who is winning?", "a": "Nobody. Speed without debug is a trap. Add callbacks/logging or pull assemble back in-house.", "kind": "debug"},
    {"q": "When is the framework the right default?", "a": "When loaders/indexes would take a week by hand and you have already proven the prompt and abstain on a baseline.", "kind": "apply"},
    {"q": "When do you stay hand-built?", "a": "When the prompt is the product (grounding, citations) and the framework hides it, or when the graph of runnables is harder than 200 lines.", "kind": "apply"},
    {"q": "Is mixing allowed?", "a": "Yes: framework retriever, hand assemble. The split is the point of the vocabulary.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Hear the four columns. If they pick a camp with no debug story, push. Mixing is allowed.",
  ),
  "frameworks-hide-the-prompt": note(
   what="""**Log the final assembled context before you trust the abstraction.** Frameworks stitch system prompts, node templates, and output parsers you did not write. If you cannot print the exact messages, you cannot split retrieve vs generate or check grounding.

Callbacks, verbose flags, or a custom synthesizer that you own are the fix — not hope.

This is the most important M4.14 operational note.""",
   why="""Every framework incident starts here. Interviewers who have been burned will ask.""",
   how="""On every request (or sampled): dump messages/token counts/node ids. Example. You discover a default 'use your knowledge if needed' line. Delete it.

Add a test that the dump does not contain that line and does contain your abstain rule.""",
   fails="""1. **No dump.**

2. **Trusting default prompts.**

3. **A verbose flag only on localhost.**

4. **Token count unknown.**""",
   line="""Frameworks hide the prompt. I log the final assembled messages before I trust the stack, and I test that my abstain rule is actually in there.""",
   kps=[
    "Print the final messages; do not trust defaults.",
    "Defaults may invite outside knowledge.",
    "Callbacks or a custom synthesizer you own.",
    "Test that abstain wording is present.",
    "Do this in prod samples, not only localhost.",
    "No dump, no grounding claim.",
   ],
   qs=[
    {"q": "What must you log when a framework assembles the prompt?", "a": "The final messages (or equivalent), node ids, and token counts. Without that you cannot debug or claim grounding.", "kind": "recall"},
    {"q": "The model uses outside knowledge; your code never said it could. Where do you look?", "a": "The hidden default prompt. Dump it. Frameworks often include a helpful-assistant line that undoes your rule.", "kind": "debug"},
    {"q": "How do you keep the dump honest in prod?", "a": "Sampled logging of messages (redact if needed) plus a test that the abstain rule is in the template. Localhost verbose is not enough.", "kind": "apply"},
    {"q": "What if the framework will not give you the messages?", "a": "Custom synthesizer or leave assemble hand-built. An opaque generate is a no-go for this product.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Log the final assembled context before you trust the abstraction.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_CONCEPTS],
   review="Ask to see a dumped prompt from prod. If they have never printed it, they do not trust the stack — they hope.",
  ),
  "parity-test-vs-the-hand-built-baseline": note(
   what="""A framework **must not lose the abstain or citation rule**. The **parity test** is the same fixture and the same judge: answers still cite quote-plus-id, still abstain on the uncovered question, still do not cite unretrieved titles.

If parity fails, the framework is not done — no matter how fast the demo looks.

Run parity on every framework upgrade.""",
   why="""This is the acceptance test for M4.14. On the job, this is the regression gate.""",
   how="""Same three questions as M4.9. Example. Framework answers the uncovered one: fail. Citations become titles-only: fail. Then add a gold-span check.

Automate it. A notebook compare is a start; a CI test is the finish.""",
   fails="""1. **No shared fixture.**

2. **Shipping after a prettier demo** that lost abstain.

3. **Parity only once.**

4. **Different questions** so of course they differ.""",
   line="""The framework must pass the same abstain and citation fixture as the hand-built baseline. If it loses those, it is not a rebuild.""",
   kps=[
    "Same fixture, same judge, same rules.",
    "Abstain and quote-plus-id must survive.",
    "No unretrieved titles.",
    "Parity on every upgrade.",
    "A prettier demo that fails parity is a fail.",
    "Automate it.",
   ],
   qs=[
    {"q": "What is the parity test against the hand-built baseline?", "a": "The same fixture and judge: still cite quote-plus-id, still abstain on uncovered questions, still never cite an unretrieved title.", "kind": "recall"},
    {"q": "The framework demo looks better but answers the uncovered question. Ship?", "a": "No. It lost abstain. Fix the prompt/engine or keep the hand-built generate path.", "kind": "debug"},
    {"q": "When do you re-run parity?", "a": "On every framework or prompt-template upgrade, and when you add a component. Once is not a gate.", "kind": "apply"},
    {"q": "Why the same questions?", "a": "Otherwise you are comparing two products. Parity is a regression, not a vibe.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "A framework must not lose the abstain or citation rule.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Ask to see the CI fixture. If parity was a demo afternoon, it will rot on the next upgrade.",
  ),
  "interview": note(
   what="""**Interview: defend a framework choice** — **speed of iteration, then show you can still inspect retrieve and generate.** Name the trade (M4.14's compare note) and the dump. If you cannot inspect, you do not get to claim the framework.

They want an adult, not a fan.""",
   why="""It is the capstone talking point. On the job, it is also how you say no to an opaque stack.""",
   how="""Say: 'I used LlamaIndex (or LangChain) to move faster on loaders and indexes after a hand-built baseline. I can print node ids and the final messages. Parity still abstains. If I could not inspect, I would keep assemble in-house.'

If they poke lock-in: thin wrappers, retriever interface.""",
   fails="""1. **Brand loyalty** with no inspect story.

2. **Purity** with no speed story.

3. **No baseline** in the pitch.

4. **No parity.**""",
   line="""I pick a framework for speed of iteration after a hand-built baseline, and I defend it by showing I can still inspect retrieve and generate.""",
   kps=[
    "Speed first, then inspectability.",
    "Hand-built baseline is in the pitch.",
    "Dump nodes and messages or do not claim the framework.",
    "Parity on abstain and citations.",
    "Thin wrappers beat lock-in fear.",
    "Adult, not fan.",
   ],
   qs=[
    {"q": "How do you defend a framework choice in an interview?", "a": "Speed of iteration after a hand-built baseline, plus proof you can inspect retrieve (node ids) and generate (final messages), plus parity on abstain and citations.", "kind": "recall"},
    {"q": "A candidate says 'LangChain is industry standard'. What is missing?", "a": "Inspectability, parity, and a reason the baseline was not enough. Industry is not a defence.", "kind": "debug"},
    {"q": "What do you show on the laptop?", "a": "A dumped prompt and a retriever-only call that returns the two fixture ids. Not a logo.", "kind": "apply"},
    {"q": "What if inspectability is missing?", "a": "You do not defend the framework — you unwrap assemble or switch. Speed without eyes is not a defence.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Speed of iteration, then show you can still inspect retrieve and generate.", "kind": "recall"},
   ],
   links=[LI_HOME, LC_INTRO],
   review="Hear speed plus a dump. If they only name a brand, fail the talking point. Ask about the baseline.",
  ),
 }
}
