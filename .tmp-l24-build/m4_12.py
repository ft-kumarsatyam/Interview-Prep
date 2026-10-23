from helper import note, LI_HOME, OA_STRUCT, LC_STRUCT

NOTES = {
 "m4-12": {
  "answering-from-evidence": note(
   what="""A grounded answer is **generated from retrieved evidence**, not from the model's unsupported memory. The prompt, the schema, and the checker all say: if the span is not in the context, you do not claim it. Style can be parametric; facts cannot.

This is the product promise of RAG. Without it you have a chatbot that sometimes saw a PDF.

Evidence means the **text you assembled**, not 'a document we have somewhere'.""",
   why="""Interviewers will ask what grounded means. This. On the job, this is the contract with the user.""",
   how="""Pass only the chunks; forbid outside knowledge; check claims. Example. Context has a 14-day refund; the model knows a 30-day US default — the answer must say 14 and cite, or abstain if the chunk is off-product.

Never add a web-browse silently to 'help'.""",
   fails="""1. **Allowing memory** when sources are thin.

2. **Evidence = 'we have a handbook'** not the assembled text.

3. **No claim check.**

4. **Silent web fallback.**""",
   line="""I answer from the assembled evidence, not from parametric memory. If the span is not in the prompt, I do not claim it.""",
   kps=[
    "Facts come from assembled chunks, not weights.",
    "Style may be parametric; claims may not.",
    "Evidence is the prompt text, not the corpus at large.",
    "Check claims against that text.",
    "No silent memory or web fallback.",
    "This is the user-facing contract.",
   ],
   qs=[
    {"q": "What does answering from evidence mean?", "a": "Every factual claim must be supported by text you put in the prompt. The model's prior knowledge may shape wording, not the fact.", "kind": "recall"},
    {"q": "Context says 14 days; the model answers 30 from training. What failed?", "a": "Grounding. The generate side used parametric memory. Tighten the prompt/schema and reject unsupported claims.", "kind": "debug"},
    {"q": "Is 'we indexed the handbook' enough evidence?", "a": "No. Evidence is the chunks in this request. An unretrieved page does not support the claim.", "kind": "apply"},
    {"q": "When may the model use outside knowledge?", "a": "For language and structure, or when you explicitly switch out of grounded mode. Not inside a RAG answer path.", "kind": "apply"},
    {"q": "Why forbid a silent web fallback?", "a": "It breaks the contract (uncited, unlogged) and makes retrieve vs generate undebuggable.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask what evidence means. If they say the corpus, not the prompt, they will claim unretrieved pages.",
  ),
  "attaching-claims-to-sources": note(
   what="""**Attach each claim to the chunk that supports it.** Produce **useful citations**: chunk id, quote or offsets, and a user-visible title/link. A blob of footnotes at the end that do not map to sentences is decoration.

Useful means the user can open the span. A PDF filename is a hint, not a source.

Your schema should make the attachment structural (`claims[].citation`) so you can check it.""",
   why="""Interviewers will ask how citations work. Per claim. On the job, this is the UI and the checker.""",
   how="""`[{claim, chunk_id, quote}]`. Example. Sentence one → id 17 quote; sentence two → id 4 quote. Render [17] as a link to the section. Drop a sentence whose check fails.

Do not one-cite the whole paragraph if two chunks were used.""",
   fails="""1. **One footnote** for the whole answer.

2. **Titles without spans.**

3. **Citations not aligned** to sentences.

4. **Broken links** to a file the user cannot open.""",
   line="""I attach each claim to a chunk id and a quote the user can open. A filename at the bottom is not a source.""",
   kps=[
    "Per-claim citations, not one blob.",
    "Id plus quote (or offsets) plus a usable link.",
    "Structure it so a checker can run.",
    "Drop claims that fail the check.",
    "A filename is not a span.",
    "Two chunks means two attachments.",
   ],
   qs=[
    {"q": "What makes a citation useful?", "a": "It points a claim at a chunk id and a quote or offsets the user can open. A bare filename or a list at the end does not attach the claim.", "kind": "recall"},
    {"q": "The answer has three facts and one footnote 'handbook.pdf'. What is wrong?", "a": "No per-claim attachment. You cannot tell which fact is supported or check a span. Split citations by claim.", "kind": "debug"},
    {"q": "How do you store the attachment?", "a": "In the schema: each claim carries chunk_id and quote. Markdown footnotes are a render, not the source of truth.", "kind": "apply"},
    {"q": "What does the UI open?", "a": "The section or the quote in the source doc, not a 200-page PDF at page 0.", "kind": "apply"},
    {"q": "Two chunks support one sentence. What do you attach?", "a": "Both ids (or split the sentence). Hiding the second source is how you fail an audit.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_STRUCT],
   review="Ask to see a claim-to-span map. If citations are a footer list, they are not attached.",
  ),
  "citations-are-not-grounding": note(
   what="""**A citation is not grounding.** The cited source must **actually support the claim**. Models will invent a plausible quote, point at a real title, or cite a chunk that is about the same topic but not the fact.

Grounding is a **check**: quote is a substring, and the quote entails the claim (human or judge). Citation is a **pointer**. Pointers can lie.

This is the favourite trap in RAG interviews.""",
   why="""They will say 'we cite sources' as if that were safety. On the job, this is the audit failure.""",
   how="""Two checks. (1) Quote ∈ chunk. (2) Claim is supported by quote — not merely on-topic. Example. Claim '14-day refund'; cited chunk is a shipping table: on-topic, not supporting. Fail it.

Do not ship a green check for 'has a citation field'.""",
   fails="""1. **Treating presence of a citation as grounded.**

2. **No substring check.**

3. **On-topic chunk** accepted as support.

4. **Invented quotes** that look real.""",
   line="""Citations are pointers. Grounding is a check that the cited span supports the claim. I do not treat a footnote as safety.""",
   kps=[
    "Citation ≠ grounding.",
    "The span must support the claim, not just share a topic.",
    "Substring-check the quote; judge entailment.",
    "Invented quotes and on-topic misses are common.",
    "A filled citation field is not a pass.",
    "This is the interview trap.",
   ],
   qs=[
    {"q": "Why are citations not the same as grounding?", "a": "A citation is a pointer. Grounding requires that the pointed-at span actually supports the claim. Models cite titles, invent quotes, or point at on-topic but non-supporting chunks.", "kind": "recall"},
    {"q": "Every sentence has a [n] and 20% of claims are still false. What did you fail to check?", "a": "Support. You checked that a citation exists, not that the quote entails the claim. Add substring + entailment checks.", "kind": "debug"},
    {"q": "What two checks do you run?", "a": "Quote is in the chunk, and the quote supports the claim. Either fail drops the claim or abstains.", "kind": "apply"},
    {"q": "Is an on-topic chunk enough?", "a": "No. Same section, wrong fact is the usual miss. Entailment is stricter than topic.", "kind": "apply"},
    {"q": "What phrase should you refuse in a review?", "a": "'We cite sources, so we are grounded.' Ask for the check.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="If they equate citations with grounding, fail the point. Ask for the two checks.",
  ),
  "abstaining-on-insufficient-evidence": note(
   what="""When evidence is **insufficient**, the system **says so** — 'I do not know / not in the docs' — instead of forcing an answer. Insufficient includes empty retrieve, weak scores, failed citation checks, and questions the chunks do not cover.

Abstain is a **first-class output**, not a vibe in the prose. Users trust a bot that can shut up.

A hedge ('it might be 14 or 30') is not abstain; it is a weaker wrong.""",
   why="""Interviewers will ask what you do on a miss. Abstain. On the job, this is trust.""",
   how="""Schema path + UI. Example. No chunk survives the checker → `{insufficient_evidence: true, reason: 'no span for refund window'}`. UI shows that, maybe a link to search. Do not emit a number.

Tune how often you abstain on a labelled 'should abstain' set. Too rare is danger; too often is a brick.""",
   fails="""1. **Forced answers** on empty context.

2. **Hedged prose** instead of abstain.

3. **No should-abstain eval.**

4. **Abstain that still includes a guess.**""",
   line="""If the evidence is insufficient I abstain. I do not hedge a number. Abstain is a field and a UI, not a vibe.""",
   kps=[
    "Insufficient → I do not know, not a guess.",
    "Empty, weak, failed checks, uncovered questions.",
    "Abstain is a structured path, not a hedge.",
    "Eval a should-abstain set.",
    "A guess inside an abstain is still a guess.",
    "Users trust a bot that can shut up.",
   ],
   qs=[
    {"q": "What should RAG do on insufficient evidence?", "a": "Abstain with a clear I-do-not-know (and why), not a forced or hedged answer. Treat empty retrieve and failed citation checks as insufficient.", "kind": "recall"},
    {"q": "The bot writes 'it might be 14 days, not sure'. Context is empty. What is wrong?", "a": "That is a hedge, not abstain, and it still planted a number. Emit the insufficient_evidence path with no fact.", "kind": "debug"},
    {"q": "How do you know you abstain enough?", "a": "A labelled should-abstain set. Track false answers there and false abstains on answerable items. Tune the gate.", "kind": "apply"},
    {"q": "Which events trigger abstain?", "a": "Empty retrieve, scores below T, all citations failing the check, or the question not covered by surviving spans.", "kind": "apply"},
    {"q": "Why not hedge?", "a": "Hedges still implant facts and are hard to evaluate. A hard abstain is auditable.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_STRUCT],
   review="Ask what the user sees on a miss. If a number still appears, it is not abstain.",
  ),
  "keeping-evidence-and-synthesis-distinct": note(
   what="""**Keep retrieved evidence and model synthesis distinguishable** in the prompt, the logs, and the UI. Evidence is quoted or boxed with ids. Synthesis is the answer text. If they blur, you cannot check grounding and the user cannot see what was found vs what was written.

In the prompt: a clear `Sources` block vs `Answer`. In the UI: quotes vs the bot's sentence. In the log: two fields.

This is how you debug generate-vs-retrieve and how you pass an audit.""",
   why="""Interviewers who have been audited will ask. On the job, this is the screenshot that saves you.""",
   how="""Template and UI. Example. Left: sources with quotes. Right: answer with [ids]. Log `evidence[]` separately from `answer`. Never let the model rewrite the source block.

If you stream, stream the answer; keep sources as structured data.""",
   fails="""1. **One blob** in the log.

2. **Model rewriting** the sources.

3. **UI that only shows the answer.**

4. **Synthesis inside the source block.**""",
   line="""Evidence is a boxed, id'd quote; synthesis is the answer. I keep them in different fields in the prompt, the log, and the UI.""",
   kps=[
    "Evidence and synthesis are different fields.",
    "Box and id the sources in the prompt.",
    "Show sources in the UI, not only the answer.",
    "Do not let the model rewrite the source block.",
    "Logs need both, separately.",
    "Blur kills audits and debugging.",
   ],
   qs=[
    {"q": "Why keep evidence and synthesis distinct?", "a": "So you can check grounding, debug retrieve vs generate, and show the user what was found versus what was written. A single blob hides all three.", "kind": "recall"},
    {"q": "The model restates a source with a wrong number and the log has one text field. What is lost?", "a": "You cannot tell original evidence from synthesis. Split the fields; freeze the source block.", "kind": "debug"},
    {"q": "What does the UI show besides the answer?", "a": "The quotes or links for the citations, visually separate from the bot's sentences.", "kind": "apply"},
    {"q": "How do you stop the model rewriting sources?", "a": "Put sources in a block the instruction says not to edit, or pass them as a non-rewritable tool result. Check they still match the retrieve log.", "kind": "apply"},
    {"q": "What two log fields are mandatory?", "a": "evidence (ids + text) and answer (plus citations). One concatenated prompt dump is a start, not enough.", "kind": "recall"},
   ],
   links=[LI_HOME],
   review="Ask to see the UI and the log fields. If sources are invisible, they cannot claim grounding.",
  ),
  "quote-then-answer-vs-answer-then-cite": note(
   what="""**Quote-then-answer** makes the model **extract supporting spans first**, then write the answer from those spans. **Answer-then-cite** writes the answer first and **invites invented sources** to decorate it. The order is a real generate-side control.

You can enforce quote-first in the schema: `quotes` required before `answer`. Checkers run on the quotes; the answer must stay inside them.

Answer-then-cite can still work if you drop unverified cites — but you will drop a lot.""",
   why="""This is a named checklist item. On the job, it is a cheap anti-hallucination.""",
   how="""Schema order: `quotes[]` then `answer` then `insufficient_evidence`. Example. The model must fill quotes first; your code rejects an answer that uses a fact not in quotes.

If the vendor ignores field order, do two calls: extract quotes, then answer — or one structured object you validate regardless of order.""",
   fails="""1. **Answer first**, cites later, no check.

2. **Trusting field order** with no validation.

3. **Quotes that never appear** in the answer path.

4. **Two-call** extract with no budget note.""",
   line="""I extract quotes first and only then answer. Answer-then-cite invites invented sources unless I throw those cites away.""",
   kps=[
    "Quote-then-answer reduces invented sources.",
    "Answer-then-cite invites decoration.",
    "Require quotes in the schema before you accept an answer.",
    "Validate support even if field order is ignored.",
    "Drop unverified cites if you still answer first.",
    "Two-step extract-then-answer is allowed if you budget it.",
   ],
   qs=[
    {"q": "Why prefer quote-then-answer over answer-then-cite?", "a": "Writing the answer first invites the model to invent a source that fits the prose. Extracting quotes first constrains the answer to those spans.", "kind": "recall"},
    {"q": "The model answers, then cites a title that was never retrieved. What pattern is that?", "a": "Answer-then-cite with no check. Require quotes from retrieved ids first, or drop the answer.", "kind": "debug"},
    {"q": "How do you enforce quote-first?", "a": "A schema that requires quotes[] (with ids) and a checker that the answer stays inside those quotes. Do not rely on the model obeying field order alone.", "kind": "apply"},
    {"q": "Is answer-then-cite always illegal?", "a": "No, if you verify and drop. It is just the pattern that produces more invented sources.", "kind": "apply"},
    {"q": "What if the API ignores property order?", "a": "Validate after the fact, or split into extract then answer. Order in JSON is not a safety boundary.", "kind": "recall"},
   ],
   links=[OA_STRUCT, LC_STRUCT],
   review="Ask which order they use. If answer-then-cite with no drop rule, they will invent sources.",
  ),
  "abstain-object-in-the-schema": note(
   what="""A required **`insufficient_evidence` path** in the schema **beats a hedged paragraph**. Make it a boolean or an object `{insufficient_evidence: true, reason}` that your parser understands. If the model hedges in `answer` instead, you treat that as a generate failure.

Required means the field exists every time, and your code branches on it before render.

This is structured output applied to grounding.""",
   why="""Interviewers will ask how you force abstain. Schema. On the job, this is the branch in the API.""",
   how="""JSON schema: `one of: answer+citations | insufficient_evidence`. Example. Your handler: if insufficient, return 200 with that payload; do not also show `answer`. Unit-test the parser with a hedge-only completion and fail it.

Do not regex 'I do not know' in prose as your only detector.""",
   fails="""1. **Prose-only** abstain.

2. **Answer and abstain both set.**

3. **Optional field** the model skips.

4. **Regex** as the only detector.""",
   line="""I put insufficient_evidence in the schema as a required path. A hedged paragraph is not an abstain I can ship.""",
   kps=[
    "Required abstain object > hedged prose.",
    "Branch on the field before render.",
    "Do not emit answer and abstain together.",
    "Unit-test the parser on hedges.",
    "Regex on prose is a backup, not the path.",
    "This is structured output for grounding.",
   ],
   qs=[
    {"q": "Why put abstain in the schema?", "a": "A required insufficient_evidence path is machine-checkable. A hedged paragraph is easy to miss and hard to evaluate.", "kind": "recall"},
    {"q": "The model sets answer='probably 14 days' and insufficient_evidence=true. What do you render?", "a": "Abstain only. Dual-filled is a generate failure. Do not show the number.", "kind": "debug"},
    {"q": "How do you test the path?", "a": "A fixture that must abstain, plus a hedge-only completion that the parser must reject. Do not rely on a live model for the unit test.", "kind": "apply"},
    {"q": "Why not regex I-do-not-know?", "a": "Wording varies and a guess can sit next to the phrase. Schema first; regex as telemetry.", "kind": "apply"},
    {"q": "What does required mean here?", "a": "The object always chooses a path (answer+cites or abstain). A missing field is a parse error, not a silent answer.", "kind": "recall"},
   ],
   links=[OA_STRUCT, LC_STRUCT],
   review="Ask to see the schema. If abstain is prose-only, they will ship hedges. Ask what happens when both fields are set.",
  ),
  "interview": note(
   what="""**Interview: show a grounded answer** — **point at the span, refuse if missing, and never cite a title you did not retrieve.** That is the demo. Walk a claim to a quote to a chunk id.

They want to see you refuse.""",
   why="""It is M4.12's exam. On the job it is also the on-call screenshot.""",
   how="""Take one sentence of the answer, show the quote, show it inside chunk 17, show the checker passed. Then take a question with no span and show abstain with no leftover number.

If they ask about citations vs grounding, say the two checks.""",
   fails="""1. **Footer titles** as the demo.

2. **Cannot refuse.**

3. **Citing a doc** that was not in retrieve.

4. **No checker.**""",
   line="""I point at the span, I refuse if it is missing, and I never cite a title I did not retrieve. A footnote is not the demo.""",
   kps=[
    "Point at the span: claim → quote → chunk id.",
    "Refuse when the span is missing.",
    "Never cite an unretrieved title.",
    "Show the checker, not only the prose.",
    "Citations are not grounding — say the two checks.",
    "The grade is the refusal.",
   ],
   qs=[
    {"q": "How do you show a grounded answer in an interview?", "a": "Walk a claim to a quote inside a retrieved chunk id, show the check, and show an abstain when the span is missing. Never cite a title you did not retrieve.", "kind": "recall"},
    {"q": "A candidate cites handbook.pdf though retrieve returned nothing. What failed?", "a": "They cited an unretrieved title. That is not grounded. The correct demo is abstain.", "kind": "debug"},
    {"q": "What two checks do you name if they poke?", "a": "Quote is in the chunk, and the quote supports the claim. Presence of a citation is not enough.", "kind": "apply"},
    {"q": "What must the abstain demo not contain?", "a": "A leftover number or a hedge. The payload is insufficient_evidence, full stop.", "kind": "apply"},
    {"q": "What one line should they remember?", "a": "Point at the span, refuse if missing, and never cite a title you did not retrieve.", "kind": "recall"},
   ],
   links=[LI_HOME, OA_STRUCT],
   review="Hear a span walk and a refusal. If they only show footnotes, fail the talking point.",
  ),
 }
}
