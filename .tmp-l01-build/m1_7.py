from helper import entry, q

OAI = "https://platform.openai.com/docs"

NOTES = {
 "m1-7": {
  "why-some-models-think-longer": entry(
   what="""Some models are trained to **spend extra compute before the final answer**: they generate **internal reasoning tokens** (shown or hidden), search a space of steps, or run a longer decode. That is **test-time compute**, not a larger weight file. They "think longer" because the product chose to **buy more decode** on hard items.

A ordinary chat model answers in one short decode. A reasoning model may emit hundreds of hidden tokens, then a short answer. You pay for those tokens in **time and money**.

This is a product class, not a temperature trick. "Think step by step" on a regular model is a cheap cousin, not the same training.""",
   why="""On the job, finance will ask why a one-sentence answer cost as much as an essay. Interviewers want: extra test-time compute, not magic. They want you to know when that spend is wasted (next items).

They will ask whether you can prompt a cheap model into being a reasoning model — you can get a bit of chain-of-thought, not the same trained behaviour.""",
   how="""When the card or the API says "reasoning" / "thinking" / "effort", assume extra tokens. Log them if the usage object exposes them. Set a budget if the API has one.

Demo: a hard math item where a regular model fails quickly and a reasoning model spends two seconds and gets it right. Then a sentiment item where both are instant and equal — you should have used the cheap one.

Do not stream hidden thoughts to end users unless you have a policy. They can contain junk or leaked prompt bits.""",
   failures="""1. **Using reasoning on classify/extract.**

2. **Not logging hidden tokens.**

3. **Showing raw thoughts** to customers.

4. **Equating CoT prompting with a reasoning model.**""",
   line="""Some models spend extra decode — hidden or visible reasoning tokens — before they answer. That is test-time compute I pay for. I use it on hard multi-step work, not on extraction, and I log the hidden tokens.""",
   key_points=[
    "Longer think = extra test-time compute, usually more decode.",
    "Not the same as a bigger weight file.",
    "Hidden tokens still hit latency and the bill.",
    "CoT prompting is a weak cousin.",
    "Do not stream raw thoughts without a policy.",
    "Pick this class on purpose.",
   ],
   questions=[
    q("recall", "Why do some models take longer to answer a short question?", "They generate extra internal reasoning tokens (or search) before the visible answer. That is test-time compute."),
    q("apply", "How is that different from 'think step by step' on a normal chat model?", "You might get a short chain of thought. A reasoning model is trained and served to spend a larger, sometimes hidden, budget. Not the same reliability or cost."),
    q("debug", "A one-line answer cost 4k tokens. Where did they go?", "Hidden thinking, or a long unused draft. Log usage.thinking (or equivalent) and cap the budget."),
    q("apply", "Should users see the thoughts?", "Default no, unless the product is a tutor that needs them and you have a redaction policy."),
    q("recall", "Is a reasoning model just a higher temperature?", "No. It is a different training and serving recipe that spends more compute at inference."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: extended thinking", "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"},
   ],
  ),
  "test-time-compute-thinking-budgets": entry(
   what="""**Test-time compute** is extra work **at inference**: longer decode, self-consistency (n samples + vote), search, tools, or a **thinking budget** (a cap on internal tokens). APIs expose this as **effort**, **budget**, or a reasoning-model id. **Internal tokens** may be **invisible** but **billed** and may **count against max output**.

A budget is a product control: high on a hard coding item, low or zero on a rewrite. Without a budget, a reasoning model can spend a fortune on "hi".

Self-consistency is another form: 5 samples and a majority vote — more compute, sometimes more quality, always more money.""",
   why="""Interviewers want the phrase test-time compute and one control (budget or n). On the job this is the knob you give to a route, not to a user, unless the user is paying per think.

They will ask what happens if thinking eats max_output (the next item).""",
   how="""Config per route: `{ "class": "reason", "budget": "medium" }` vs `{ "class": "fast" }`. Map to the vendor.

Measure quality vs spend on 30 hard and 30 easy items. Draw the curve. Most easy items flatten immediately.

If the API has no budget, you still have: do not call the reasoning id on easy traffic (a router), and set max tokens so it cannot run forever.

Self-consistency: only on items where you have a checker (unit tests, a judge with a rubric). Voting on style is waste.""",
   failures="""1. **One global high budget.**

2. **No router** — every "thanks" thinks for 8s.

3. **n=8 votes** without a checker.

4. **Ignoring that thinking counts toward max.**""",
   line="""Test-time compute is extra inference work: thinking tokens, n-samples, search. I budget it per route, I router easy traffic away, and I remember hidden tokens are billed and may eat max output.""",
   key_points=[
    "Test-time compute = extra inference work.",
    "Budgets / effort knobs cap hidden tokens.",
    "Self-consistency is another spend.",
    "Route easy work away.",
    "Hidden tokens are billed.",
    "Thinking can consume max-output.",
   ],
   questions=[
    q("recall", "What is a thinking budget?", "A cap on how many internal reasoning tokens or how much effort the model may spend before answering."),
    q("apply", "How do you avoid paying reasoning prices on 'hello'?", "A router or a cheaper model for easy intents, and a low or zero budget on that route."),
    q("debug", "You set max_output=256 and the visible answer is empty. Cause?", "Thinking tokens ate the budget. Raise max or lower thinking, and log both counts."),
    q("apply", "When is self-consistency worth it?", "When you can check or vote on a well-defined answer (code tests, a numeric key) and the quality gain pays for n calls."),
    q("recall", "Name three forms of test-time compute.", "Hidden reasoning tokens, n-sample voting, tool-using search, longer beams. Any three with the idea 'more work at inference'."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: extended thinking", "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"},
   ],
  ),
  "where-reasoning-helps": entry(
   what="""Reasoning spend **tends to help** on **hard mathematics**, **complex coding**, **planning**, **multi-step logic**, and **constraint-heavy** problems — tasks where a short greedy answer skips a necessary step. It helps less when the step is "look it up" (use a tool) or "label this sentence".

Help is empirical. Run the hard slice of your eval with and without the reasoning model. Do not trust a blog's puzzle set.

If the failure is missing context, reasoning will invent a confident chain about the missing fact. Retrieve first.""",
   why="""Interviewers will ask for a list. Give this list and the caveat. On the job this is the allow-list of routes that may call the expensive id.

They will also ask for a counterexample (next item) — have both ready.""",
   how="""Allow-list: contest math, multi-file refactor plans, "write a function that satisfies these 8 constraints", multi-hop logic that is *not* a retrieval miss.

Still give tools: a calculator, a test runner. Reasoning plus tools beats reasoning about arithmetic in tokens.

Eval: 30 items you already lose on. If the expensive model does not move the score, do not buy it for that slice.

Planning: the model can outline a plan you then execute in code. Do not let it execute dangerous steps because the plan sounded thorough.""",
   failures="""1. **Reasoning instead of retrieval.**

2. **Reasoning instead of a calculator.**

3. **No eval on your hard slice.**

4. **Trusting a long chain** as evidence.""",
   line="""Reasoning helps on hard multi-step math, code, planning and constraints. It does not replace retrieval or tools. I allow-list those routes and I measure the hard slice before I pay for think on everything.""",
   key_points=[
    "Helps: hard math, complex code, planning, multi-step constraints.",
    "Does not replace retrieval or a calculator.",
    "Measure your hard slice.",
    "Long chains are not evidence.",
    "Pair with tools.",
    "Allow-list the expensive id.",
   ],
   questions=[
    q("recall", "Where does extra reasoning tend to help?", "Difficult math, complex coding, planning, multi-step logic, and tight constraint problems — when a short answer skips steps."),
    q("apply", "A failure is 'the policy was not in the prompt'. Do you switch to a reasoning model?", "No. Retrieve the policy. A longer think will hallucinate a policy-shaped chain."),
    q("debug", "Reasoning nailed GSM8K-like items and failed your tickets. Why is that allowed?", "Those benches are not your task. Measure the hard slice of tickets."),
    q("apply", "How do you combine reasoning with tools?", "Let it plan and call a calculator or tests. Do not let it multiply invoices in tokens."),
    q("recall", "Is a long explanation a sign the answer is right?", "No. Fluency scales with decode. Check the answer."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: extended thinking", "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"},
   ],
  ),
  "where-reasoning-is-unnecessary": entry(
   what="""Skip extra think for **sentiment**, **simple extraction**, **rewriting**, **straightforward summarisation**, and most **classification**. These tasks want a short, typical completion. A reasoning model will spend tokens to justify "negative" and still say "negative". You paid for an essay.

If quality is already 99% with a small instruct model, reasoning is vanity. If the task is "make this shorter", thinking is the opposite of the job.

Unnecessary is the default. Help is the exception you measure.""",
   why="""Interviewers want the complementary list. On the job this is how you stop the bill. The senior default is "fast model first".

They will ask you to pick for a route on the spot — have this list cold.""",
   how="""Deny-list the reasoning id for: label, extract, rewrite, short summary, boilerplate draft, "translate this", "format as bullet list".

If a PM wants reasoning on sentiment "for quality", show them a 50-row table: same labels, 8× cost, 6× latency. Then they can still buy it, with eyes open.

A rewrite that must preserve facts should use a validator (did we drop a number?), not a thinking model.""",
   failures="""1. **Reasoning as default.**

2. **Thinking a longer justification** improves a label.

3. **Summarise-with-think** that expands.

4. **No deny-list.**""",
   line="""Sentiment, extract, rewrite, simple summary and classification do not want a thinking budget. I default to a fast instruct model and I deny-list the expensive id on those routes.""",
   key_points=[
    "Skip think on classify, extract, rewrite, simple summary.",
    "Default is the fast model.",
    "Justification tokens are not quality.",
    "Show cost/latency tables when PMs ask.",
    "Preserve-facts needs a validator, not a longer think.",
    "Deny-list is a real artefact.",
   ],
   questions=[
    q("recall", "Name tasks where reasoning is usually unnecessary.", "Sentiment, simple extraction, rewriting, straightforward summarisation, most classification."),
    q("apply", "A PM wants the reasoning model on every support label. What do you show?", "A table: label agreement vs the cheap model, plus cost and latency. Almost always a deny."),
    q("debug", "Summaries got longer and slower after you 'upgraded' to reasoning. Why?", "The model thinks and then writes. You asked for shorter; you bought longer compute. Switch back."),
    q("apply", "What do you put in config?", "A deny-list or a per-route class: fast vs reason. Not a global flag."),
    q("recall", "Does a longer justification make a label more true?", "No. The label is the thing you eval. The essay is cost."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "OpenAI: models", "url": f"{OAI}/models"},
   ],
  ),
  "the-quality-cost-latency-trade-off": entry(
   what="""**More reasoning can improve quality** on the hard slice and **almost always increases cost and latency**. The trade-off is a **curve**, not a free upgrade. You pick a point: enough quality for the product, under the p95 and the budget.

A 2-point quality gain at 10× cost is a bad buy on a high-volume route and a good buy on a rare, expensive human-review path.

Write the three numbers on the decision: quality, $, p95. If a slide has only quality, it is incomplete.""",
   why="""This is the grown-up version of "reasoning is better". Interviewers want the three-axis talk. On the job this is how you say no to a default upgrade.

They may ask how you would A/B (shadow the expensive model on 5% and compare).""",
   how="""For each candidate: run the golden set, record pass rate, mean tokens, p95. Plot. Pick.

Shadow: send 5% of hard-routed traffic to the expensive model, compare to production, look at human tickets. Do not flip 100% on a blog.

Offer a "deep think" button only if the user will wait and you will charge or cap it.

When the curve is flat, take the cheap point and spend the money on retrieval or evals.""",
   failures="""1. **Quality-only slides.**

2. **100% cutover** without shadow.

3. **Ignoring p95** — means hide the tail.

4. **Buying 2 points at 10×** on a hot path.""",
   line="""More think can raise quality and will raise cost and latency. I pick a point on that curve with three numbers, I shadow before I cut over, and I will not buy two points of quality at ten times the bill on a hot path.""",
   key_points=[
    "Quality vs $ vs p95 — all three.",
    "A curve, not a free upgrade.",
    "Hot path vs rare path pick different points.",
    "Shadow before 100% cutover.",
    "Flat curve: spend on retrieval/eval instead.",
    "Optional 'deep think' if the user waits.",
   ],
   questions=[
    q("recall", "What is the reasoning trade-off?", "Possible quality gain on hard items versus higher cost and latency. Always a trade, not a free upgrade."),
    q("apply", "What three numbers do you put on the decision slide?", "Quality on the golden set, cost per successful task, p95 latency."),
    q("debug", "Mean latency looks fine, users complain. What did you hide?", "p95/p99. Reasoning tails are long."),
    q("apply", "When is a 2-point gain at 10× cost acceptable?", "Low volume, high cost of a human miss (legal, medical draft under review). Not on a high-QPS labeler."),
    q("recall", "What is a shadow launch here?", "Send a slice of traffic to the expensive model, compare quality and cost, keep serving the cheap one until you decide."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "OpenAI: production best practices", "url": f"{OAI}/guides/production-best-practices"},
   ],
  ),
  "prompting-reasoning-models": entry(
   what="""On a reasoning model, **stop leaning on "think step by step"**. It already will. **State the goal**, **give relevant context**, **specify constraints**, and **define a good answer**. Extra CoT prompts can waste budget or fight the hidden chain.

Do not dump chain-of-thought instructions that contradict the model's hidden style. Do not ask it to skip thinking if you paid for a thinking model — pick a fast model instead.

Clear specs beat meta-prompts.""",
   why="""People copy 2022 CoT prompts onto 2026 reasoning APIs. Interviewers want the update. On the job this is a prompt review comment.

They will ask what you *do* write: goal, context, constraints, output shape.""",
   how="""Good:

```
Goal: function that returns the median of a list of ints.
Constraints: O(n) expected time, no extra full copy, raise on empty.
Context: we use Python 3.12; tests in test_median.py (pasted).
Good answer: code + 3 sentences on complexity. No tutorial.
```

Bad: "Think step by step, take a deep breath, let's work through this carefully, show all work..." on a model that hides work anyway.

If you need visible steps (a tutor), say "include a numbered solution the student can check" as the output spec — that is the answer shape, not a plea to think.""",
   failures="""1. **CoT boilerplate** on a reasoning id.

2. **No constraints**, so it writes a novel.

3. **Asking it not to think** but keeping the expensive id.

4. **Hiding the tests** and hoping it thinks them up.""",
   line="""I do not prompt a reasoning model to think step by step. I state the goal, context, constraints and what good looks like. If I do not want it to think, I call a fast model.""",
   key_points=[
    "Skip CoT boilerplate on reasoning models.",
    "Goal, context, constraints, definition of good.",
    "Visible steps are an output spec, not a think plea.",
    "If you want no think, change the model.",
    "Give tests and constraints; do not hide them.",
    "Meta-prompts waste budget.",
   ],
   questions=[
    q("apply", "How do you prompt a reasoning model for a coding task?", "State the goal, constraints, language, and tests. Define the output shape. Do not add 'think step by step'."),
    q("recall", "Why is 'think step by step' weaker on these models?", "They already allocate a thinking budget. The boilerplate can waste tokens or fight the hidden chain."),
    q("debug", "You asked a reasoning model to 'answer immediately with no thinking' and the bill is still high. Why?", "You still called the reasoning id. Switch to a fast instruct model."),
    q("apply", "You want a visible derivation for a student. What do you write?", "An output requirement: numbered steps the student can check, then the boxed answer. That is the product, not a CoT plea."),
    q("recall", "What four parts replace CoT filler?", "Goal, relevant context, constraints, what a good answer looks like."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: extended thinking", "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"},
   ],
  ),
  "budget-tokens-vs-user-visible-tokens": entry(
   what="""**Hidden thinking can consume the max-output limit.** The API's `max_tokens` / `max_output` may count **internal tokens + visible tokens**. If the budget is 256 and thinking uses 250, the user sees a stub or nothing. Some APIs split the caps; many do not. **Read the doc** and **log both counts**.

User-visible tokens are what you stream. Budget tokens are what you buy. They are not the same column.

This is the sharp edge of thinking budgets.""",
   why="""On the job this is the empty-answer incident after you "tightened max_tokens to save money". Interviewers will give you that story. The fix is two counters and two caps if the API allows, or a higher max on reasoning routes.

This is also why a cost dashboard that only shows completion text length lies.""",
   how="""Log `output_visible`, `output_thinking`, `max_set`. Alert when visible==0 and thinking>0.

If the vendor has a separate thinking cap, use it. If not, set max high enough for think+answer on that route, and keep the fast route tight.

In the product, show the user the visible answer only. In finance, show the sum.

Test this with a hard prompt and a small max once, on purpose, so you see the failure mode.""",
   failures="""1. **One max** sized on visible length.

2. **Dashboard on visible length only.**

3. **Empty answers** after a cost-saving change.

4. **Not reading** whether max includes thinking.""",
   line="""Hidden thinking can eat max-output. I log thinking vs visible tokens, I size the cap for both on reasoning routes, and I do not trust a dashboard that only counts the text the user saw.""",
   key_points=[
    "Max output may include hidden tokens.",
    "Visible stub + huge bill is this bug.",
    "Log both columns.",
    "Separate caps if the API has them.",
    "Size reasoning routes looser.",
    "Finance sees the sum; users see visible.",
   ],
   questions=[
    q("recall", "How can thinking consume max-output?", "If the cap counts internal tokens, a long think leaves no room for the visible answer."),
    q("apply", "What two usage fields do you log?", "Visible completion tokens and thinking/reasoning tokens (whatever the vendor names). Plus the max you set."),
    q("debug", "You cut max_tokens from 2k to 256 to save money and answers vanished. Why?", "Thinking ate 256. Raise the cap on that route or cap thinking separately."),
    q("apply", "How should finance and product dashboards differ?", "Finance: all billed tokens. Product quality: visible answer length and task success. Do not mix the columns."),
    q("recall", "Do all APIs split the cap?", "No. Read the doc per model."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "Anthropic: extended thinking", "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"},
   ],
  ),
  "when-to-spend-extra-test-time-compute": entry(
   what="""Spend extra test-time compute on **hard multi-step problems**. Do **not** spend it on **extraction or rewrite**. That is the whole policy. Implement it as a **router** (intent or a cheap model) plus a **budget table**, not as a global default.

If you cannot classify hard vs easy, default cheap, and offer an explicit "try harder" on failure (retry with reason) rather than thinking on every call.

This card is the decision rule that ties the module together.""",
   why="""Interviewers will ask for a rule of thumb. Give this one. On the job write it in the playbook so a new hire does not "upgrade everything".

They want to hear router, not heroics.""",
   how="""Router: if intent in {math, multi_file_code, constraint_plan} → reason/medium. Else → fast.

On failure of fast (parse fail, user says wrong, test fail) → one escalate to reason with the error attached.

Never: reason on extract, rewrite, classify, greet.

Review the router monthly; PMs will sneak new intents into the expensive bucket.

Document the rule in CLAUDE.md / the service README so agents do not "helpfully" flip the default.""",
   failures="""1. **Global reason.**

2. **Escalate forever.**

3. **Router that classifies everything as hard.**

4. **No write-up**, so the next hire upgrades all.""",
   line="""I spend extra test-time compute on hard multi-step work and never on extract or rewrite. A router and a single escalate-on-failure beat a global thinking default.""",
   key_points=[
    "Hard multi-step: spend. Extract/rewrite: do not.",
    "Implement with a router + budget table.",
    "One escalate on failure, not a loop.",
    "Default cheap when unsure.",
    "Review the allow-list.",
    "Write the rule down.",
   ],
   questions=[
    q("apply", "When do you spend extra test-time compute?", "Hard multi-step math, code, planning, constraints. Not extraction or rewrite. Router plus one escalate-on-failure."),
    q("recall", "What is the default when you are unsure?", "The cheap/fast model. Offer a retry with reason if it fails a check."),
    q("debug", "The router sends 80% of traffic to reasoning. What do you do?", "The allow-list is too wide. Measure per-intent lift and pull the flat intents back."),
    q("apply", "How do you escalate without a death loop?", "One retry with the error, then fail or a human. Count escalations on the dashboard."),
    q("recall", "Why write this rule in the repo?", "So people and coding agents do not 'upgrade' every route to the expensive id."),
   ],
   links=[
    {"title": "OpenAI: reasoning", "url": f"{OAI}/guides/reasoning"},
    {"title": "OpenAI: production best practices", "url": f"{OAI}/guides/production-best-practices"},
   ],
  ),
 }
}
