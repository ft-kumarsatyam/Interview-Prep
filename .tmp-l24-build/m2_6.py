from helper import note, OA_TOOLS, AN_TOOLS

NOTES = {
 "m2-6": {
  "names-descriptions-types": note(
   what="""A tool the model will pick is a **product interface**. The **name** should be a verb plus a noun (`create_refund`, not `helper2`). The **description** should say when to use it, when not to, and what each argument means, in language a stranger could implement from. The **types** should be the tightest schema you can defend: enums, patterns, required keys. **Error responses** should be short and structured so the model can recover (`not_found`, `denied`) instead of a stack trace.

Minimal parameters are a feature. Every extra argument is a chance to hallucinate and a chance to confuse. If you can bind a value from the session or from a previous result, do not ask the model for it.

This is industrial design for a reader that is a next-token predictor. Ambiguity in the spec becomes ambiguity in the call.""",
   why="""On the job, most wrong tool calls are badly named twins or soggy descriptions. Interviewers will hand you a tool called `process` with a `data` string and ask you to rewrite it. They want a precise name, a when/when-not description, three typed fields, and an error object. They will ding `query: string` as a refused schema. This is also how you keep a new hire from implementing the wrong function.""",
   how="""Rewrite this: `process(data: string) — does customer things`.

After: `get_order(order_id: ORD-\\d+)` — 'Fetch one order the current user owns. Use when they name an id. Do not use to list orders or to refund.' Errors: `not_found`, `denied`. No `data`, no `user_id`.

Write the description first, then the function, then a unit test that the schema rejects `order_id=please`. Share the schema with the validator. Keep the blurb under a few hundred tokens unless an eval says more text lifts selection.""",
   fails="""1. **Cute or vague names.** `doIt`, `handle`, `api`. The model guesses.

2. **Essays as descriptions.** You blow the prompt and overlap with another tool.

3. **Untyped leftovers.** `meta: object` invites junk.

4. **Errors as HTML.** The model echoes internals or retries blindly.""",
   line="""I design tools as interfaces: a verb-noun name, a when/when-not description, tight types, and short error codes. I drop every argument I can bind myself.""",
   kps=[
    "Name = verb plus noun; description = when and when not.",
    "Tight types; minimal parameters; bind identity from the session.",
    "Structured error codes beat stack traces.",
    "A stranger should be able to implement the function from the spec.",
    "Extra arguments are extra hallucinations.",
    "Measure before lengthening descriptions.",
   ],
   qs=[
    {"q": "What four qualities belong on a well-designed tool spec?", "a": "A precise verb-noun name, a when/when-not description, a tight parameter schema with few fields, and useful structured error responses. Identity is bound from the session, not the spec.", "kind": "recall"},
    {"q": "Rewrite process(data: string) for fetching one order.", "a": "get_order with required order_id (patterned), a description that forbids list and refund uses, and errors not_found/denied. Drop the catch-all data string.", "kind": "apply"},
    {"q": "The model keeps sending user_id. What should you change?", "a": "Remove user_id from the schema and bind it in the executor from the session. Tell the description the tool is scoped to the current user. Do not 'prompt harder' to ignore the field.", "kind": "debug"},
    {"q": "Why return denied instead of a stack trace?", "a": "The model can narrate a short code, you do not leak internals, and you do not spend the window on HTML. Stack traces also invite destructive retries.", "kind": "apply"},
    {"q": "When would you lengthen a description?", "a": "When an eval shows the model picks the wrong twin and a sentence of when-not text lifts selection. Not because the spec felt short.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Hand the spec to someone who did not write the function. If they cannot implement it, the spec is not done. Ask which arguments are bound from the session. Ask to see the error object, not only the happy path.",
  ),
  "ambiguous-overlapping-tools": note(
   what="""The model picks a tool by reading names and descriptions together. If two tools **overlap** — `search_orders` and `get_order` both described as 'find orders', or `refund` and `credit` with no difference — it will flip a coin. **Ambiguous** tools have vague verbs (`update`, `handle`) that match too many user sentences. Both failures look like 'the model is bad at tools'. Both are spec bugs.

Overlap is worse than a missing tool. A missing tool the model cannot call. Two twins it will call the wrong one with high confidence. The fix is to split jobs until a stranger can tell them apart in one sentence, or to merge twins into one tool with an enum.""",
   why="""On the job, adding 'just one more helper' is how catalogues rot. Interviewers will show two overlapping specs and ask why selection is noisy. They want you to merge or to write a when-not line that is mutually exclusive. They will also ask how you detect overlap: an eval set of utterances labelled with the intended tool, not vibes.""",
   how="""Put the catalogue on one page. For each pair, write a sentence only one of them satisfies.

Example. `get_order` = fetch exactly one id the user named. `search_orders` = list by date or status when no id is present. If the user says 'ORD-9', only the first is legal. Put that in both descriptions. If you cannot write those sentences, merge them into `lookup_order(mode: id|query, ...)`.

Run 50 utterances. If two tools split a cluster, you have overlap. Do not add a third tool to 'clarify'.""",
   fails="""1. **Twins with synonyms.** `fetch_order` and `get_order`. Delete one.

2. **When-not missing.** Each description is a marketing blurb.

3. **Fixing overlap with a longer system prompt** instead of changing the catalogue.

4. **No selection eval.** You discover twins in production.""",
   line="""Overlapping tools make the model guess. I write mutually exclusive when/when-not lines, I merge twins, and I measure selection on labelled utterances.""",
   kps=[
    "Overlap and vague verbs look like model errors; they are spec bugs.",
    "Two twins are worse than one missing tool.",
    "Each pair needs a sentence only one tool satisfies.",
    "Merge twins or split jobs; do not add a third clarifier.",
    "Measure tool selection on labelled utterances.",
    "Do not patch overlap with a longer system prompt.",
   ],
   qs=[
    {"q": "Why do overlapping tools cause wrong selections?", "a": "The model matches names and descriptions. If two specs cover the same utterances, it samples between them. That looks like flakiness and is a catalogue design bug.", "kind": "recall"},
    {"q": "You have fetch_order and get_order. What do you do?", "a": "Delete or merge one. Keep a single get_order with a tight schema. Two synonyms cannot be disambiguated by more prose.", "kind": "debug"},
    {"q": "How do you prove two tools do not overlap?", "a": "Write a when-not sentence for each, then run a labelled utterance set and look at confusion pairs. If a cluster splits, merge or rewrite until one tool owns it.", "kind": "apply"},
    {"q": "When is an enum on one tool better than two tools?", "a": "When the side effect is the same and only a mode changes (lookup by id vs query). One tool with mode: id|query is easier to pick than two near-twins.", "kind": "apply"},
    {"q": "A lead wants a new helper_v2 beside helper. What do you say?", "a": "That is a twin. Replace helper or give v2 a job the first cannot do, with exclusive when-not text. Shipping both will split traffic at random.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Spread the catalogue on the table. Ask for a when-not sentence per pair. If two tools share a synonym and no exclusive sentence, the PR adds overlap. Ask for the selection confusion matrix, even a small one.",
  ),
  "too-many-undifferentiated-tools": note(
   what="""A catalogue of **dozens of near-identical tools** (or one tool with **fifteen optional arguments**) overwhelms the model's attention. Each spec is more prompt to read and more chance to pick wrong. 'Undifferentiated' means a human cannot tell them apart without tribal knowledge. Quantity without distinction is worse than a small, sharp set.

Unnecessary arguments are a second catalogue: `get_order(id, include_foo, include_bar, format, locale, debug, raw)` is five tools hiding in one, plus invitation to hallucinate flags. Prefer a small required core and server-side defaults.

There is no magic number, but if you cannot recite the catalogue from memory, the model probably cannot either.""",
   why="""On the job, platforms grow a tool per microservice. Selection quality falls and nobody notices because each team added 'just one'. Interviewers will ask how many tools you attach. They want: as few as the turn needs, retrieved or routed if the platform is large, never the whole company dump. They will also ask you to delete arguments. This is a seniority tell.""",
   how="""Budget the turn. A support bot might attach `get_order`, `get_policy`, `create_refund` — three. A platform with 80 APIs uses a **router** or **tool retrieval**: embed the user turn, attach the top 4 specs, not all 80.

Example. You inherited 22 tools. You cluster them, merge twins, drop unused (zero calls in 14 days), and retrieve the rest. Selection accuracy on a 100-utterance set jumps because the model is no longer reading a phone book.

For arguments, start with one required id. Add a flag only when an eval shows the model needs it and the server cannot default it.""",
   fails="""1. **Attach everything.** Prompt is 6k tokens of specs. TTFT dies and picks get worse.

2. **One mega-tool with twenty optionals.** The model fills three at random.

3. **Never deleting.** Dead tools still occupy attention.

4. **No router on a large platform.** You insist the model 'should be able to handle 80'.""",
   line="""I attach the fewest distinct tools the turn needs, I delete twins and dead specs, and I refuse mega-argument lists. A large platform retrieves or routes tools; it does not dump the catalogue.""",
   kps=[
    "Too many similar tools make selection worse, not more capable.",
    "Retrieve or route when the platform catalogue is large.",
    "Drop unused tools; they still cost attention.",
    "Prefer a small required core over optional flag piles.",
    "If you cannot recite the catalogue, it is too big for the turn.",
    "One mega-tool with twenty optionals is a hidden catalogue.",
   ],
   qs=[
    {"q": "Why does attaching 80 tools to every turn hurt?", "a": "Each spec consumes prompt tokens and attention, and undifferentiated names confuse selection. TTFT also rises. Attach a small relevant set via a router or retrieval.", "kind": "recall"},
    {"q": "A tool has twelve optional booleans. What do you do?", "a": "Default them server-side and keep a small required core. Add a flag back only when an eval shows the model must choose it. Optionals are extra chances to hallucinate.", "kind": "apply"},
    {"q": "How do you cut a 22-tool catalogue?", "a": "Merge twins, drop zero-call tools, cluster the rest, and retrieve or route the top few per turn. Re-measure selection on a labelled set after each cut.", "kind": "apply"},
    {"q": "A platform team wants every microservice exposed as a tool. What do you propose instead?", "a": "A router or tool-retrieval step that attaches the top k specs for this utterance, plus a few always-on tools. Do not dump the company into the prompt.", "kind": "debug"},
    {"q": "What is a practical test that the catalogue is too large?", "a": "You cannot recite it, or a labelled set shows confusion among near-twins. Either is enough to start merging and retrieving.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Count the tools on the turn and the optional fields on the widest one. If either number needs a spreadsheet, ask for a cut or a router. Ask when a tool was last deleted.",
  ),
  "treating-arguments-as-untrusted": note(
   what="""Model-generated arguments are **untrusted input**. Schema-valid is not **business-valid**. You still check types (again), values (ranges, patterns), **permissions** (does this user own this id?), and **destructive** operations (refund, delete, email) with an extra gate: allow-list, confirm, or a human. The model is a stranger filling a form. You are the service that may submit it.

This is the same rule as a public HTTP API. If you would not take `{order_id, amount}` from an anonymous POST without checks, you do not take it from a tool call. Constrained decoding does not change that.

Log what you actually executed, not only what was proposed. After validation you may have coerced or rejected fields; the audit should show the executed view.""",
   why="""On the job, this is the line that stops a prompt-injected ticket from refunding a stranger. Interviewers will ask whether you trust tool arguments. No is the start of the answer. Then: schema, ACL, destructive confirm, audit. They will ding 'the model is on our side'. They will also ask for an example where schema-valid still must fail (someone else's order id).""",
   how="""Executor gates, in order:

1. Parse + schema.
2. Normalise (trim, uppercase prefix).
3. ACL: resource belongs to session user.
4. Business predicates (amount ≤ remaining, status in refundable).
5. Destructive: extra confirm or allow-listed reason code.
6. Execute with idempotency key.
7. Audit executed args.

Example. Args `{order_id: ORD-9, amount: 999999}` parse. ACL passes if ORD-9 is theirs. Predicate `amount ≤ remaining` fails. You return `invalid_amount` and never call billing. A second example: ORD-9 is not theirs. You return `denied` without confirming the order exists, if that is your policy.""",
   fails="""1. **Schema-only.** Wrong-owner ids sail through.

2. **No extra gate on delete/refund/email.** One injected sentence moves money.

3. **Auditing the proposal, not the executed args.** You cannot replay what happened.

4. **Coercing silently.** You chopped a huge amount to max and refunded without telling anyone.""",
   line="""Tool arguments are untrusted. I validate types, values, permissions, and destructive ops before any side effect, and I audit what I actually executed.""",
   kps=[
    "Schema-valid is not business-valid or authorised.",
    "Check ACL and predicates before the downstream call.",
    "Destructive tools need an extra gate (confirm, allow-list).",
    "Audit executed arguments, not only the proposal.",
    "Do not silently coerce money or ids.",
    "Treat the model like an anonymous HTTP client.",
   ],
   qs=[
    {"q": "Why is a schema-valid tool call still untrusted?", "a": "The model can put another user's id, an out-of-range amount, or a destructive action the user did not want. Schema checks shape. You still check ACL, predicates, and extra gates.", "kind": "recall"},
    {"q": "ORD-9 belongs to someone else but parses. What does the executor return?", "a": "denied (and, depending on policy, without confirming the order exists). It does not call billing. This is an ACL fail, not a schema fail.", "kind": "debug"},
    {"q": "What extra gate do you put on refund or send_email?", "a": "An allow-listed reason code, an authenticated confirm that the model cannot mint, or a human approval. Plus an idempotency key. A valid schema is not enough.", "kind": "apply"},
    {"q": "What belongs in the audit row?", "a": "The executed arguments after validation, the actor (session user), the tool-call id, and the outcome. Not only the raw proposal, and not the downstream secret.", "kind": "apply"},
    {"q": "A teammate clamps amount to the remaining balance and proceeds. Why is that risky?", "a": "Silent coercion hides a model or user error and can refund the wrong figure. Reject invalid_amount or require confirm. Do not quietly change money.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask where ACL runs relative to the billing call. If it is missing, reject. Ask what a refund requires besides a valid schema. Ask to see an audit row for a denied call.",
  ),
  "tool-descriptions-are-context": note(
   what="""Tool **descriptions sit in the prompt**. They are not comments for humans only. The model uses that text, plus names and schemas, to decide **whether** to call and **how** to fill arguments. A vague blurb is a vague policy. A contradictory blurb ('use for refunds' on a read-only fetch) is a landmine. A 2_000-token essay is a tax on every turn, including turns that never call the tool.

Because descriptions are context, they are also an injection surface if you generate them from user content or from an untrusted catalogue. Keep them static, reviewed, and boring. They are also a cache-busting surface: if you interpolate today's date into a description, the prefix cache dies.""",
   why="""On the job, people edit descriptions like README files and do not realise they changed production policy. Interviewers will ask what the model sees besides the user sentence. The tool list is the answer. They want you to treat description edits as prompt changes: version them, eval selection, and do not generate them from tickets. This is the same hygiene as system-prompt edits.""",
   how="""Store descriptions in versioned files next to the schema. Review them like copy that ships. Example: you add 'Do not use when the user only says thanks' to `create_refund` after an eval showed false positives. You ship it as a prompt version, not a drive-by string change.

Do not build descriptions with `{user.notes}`. Do not put secrets in them ('internal endpoint https://…'). Do not change them per request if you want a cacheable prefix — put per-request facts in the user message instead.

When selection is wrong, read the descriptions the model actually received, not the ones in last week's wiki.""",
   fails="""1. **Drive-by edits** with no eval and no version.

2. **User text inside the description.** Injection and cache busts.

3. **Secrets or internal URLs** in the blurb. They can be echoed.

4. **Descriptions that contradict the schema** (says optional, schema says required).""",
   line="""Descriptions are prompt tokens. I version them, I keep them static and reviewed, I never interpolate user text into them, and I treat an edit as a prompt change that needs a selection eval.""",
   kps=[
    "Tool descriptions are context the model reads every turn.",
    "Edit them like prompts: version, review, eval selection.",
    "Do not generate descriptions from user content.",
    "Do not put secrets or volatile clocks in the catalogue.",
    "Contradiction between blurb and schema causes bad fills.",
    "Long blurbs tax TTFT even on turns that call nothing.",
   ],
   qs=[
    {"q": "Why are tool descriptions part of the context window?", "a": "Providers send the catalogue with the request. The model attends to names, blurbs, and schemas when choosing a tool. They cost tokens on every turn, not only when a tool is called.", "kind": "recall"},
    {"q": "A PM pastes a customer email into a tool description to 'explain the case'. What is wrong?", "a": "User text in the catalogue is untrusted, busts the prefix cache, and can inject instructions. Put the email in the user message, fenced. Keep descriptions static.", "kind": "debug"},
    {"q": "How do you ship a description change safely?", "a": "Version it like a prompt, run the tool-selection eval, and watch false-positive calls. Do not hot-edit a string in a running process without a pin.", "kind": "apply"},
    {"q": "Why can a clock inside a description hurt more than it helps?", "a": "It busts prompt caching and rarely improves selection. Put 'as of' timestamps in the user turn or a small facts block instead.", "kind": "apply"},
    {"q": "The blurb says amount is optional; the schema requires it. What happens?", "a": "The model omits amount; your validator fails; repair rate climbs. Align the sentences with the schema. The description is not decoration.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Diff the description like a prompt. Ask for a selection eval if it changed. Grep for interpolation and URLs. If today's date is in the catalogue, ask why the prefix must miss.",
  ),
  "one-tool-one-job": note(
   what="""**One tool, one job** is how you stop the model guessing between twins. A job is one side effect or one fetch the user can name in a sentence: fetch this order, create this refund, search the policy corpus. If you need two jobs, you want two tools or a workflow, not a Swiss-army `manage_order(action, ...)`.

Twins appear when two tools share a verb or a noun and neither description excludes the other. The model then samples. Splitting is not the same as exploding into 80 micro-tools: you split until jobs are exclusive, then you stop. Merge if two tools are the same job with synonyms.

This is the design rule behind the overlap note. Say it in interviews as a slogan you can implement.""",
   why="""On the job, `manage_*` tools become untestable and over-authorised. Interviewers will ask you to split a fat tool. They want two names, two schemas, two auth policies (read vs write), and a when-not line. They will also stop you if you split into nonsense (`get_order_status`, `get_order_total`, `get_order_items`) that should be one fetch.""",
   how="""Take `manage_order(action: get|refund|cancel, id, amount?)`. Split:

- `get_order(order_id)` read, any support agent.
- `create_refund(order_id, amount)` write, extra gate.
- `cancel_order(order_id)` write, extra gate.

The model can still call them in sequence. Auth is no longer one mega-permission. Descriptions are exclusive: get does not mention money.

Do **not** split `get_order` into three field getters unless an eval shows the payload is too large. That is the other failure mode: too many undifferentiated shards.""",
   fails="""1. **Fat action enums.** One permission to rule them all.

2. **Synonym twins** after a split (`fetch` and `get`).

3. **Sharding a read into twelve getters** the model cannot choose among.

4. **A workflow stuffed into one tool** with a JSON blob argument.""",
   line="""One tool, one job: exclusive names and auth. I split fat action enums into read versus write, and I stop splitting once a stranger can tell them apart.""",
   kps=[
    "One side effect or one fetch per tool.",
    "Split fat action enums so auth can differ.",
    "Stop splitting once jobs are exclusive; do not shard a read to death.",
    "Merge synonym twins after a split.",
    "A workflow is a loop of tools, not one blob argument.",
    "Read versus write is the first split that pays off.",
   ],
   qs=[
    {"q": "What does one tool, one job mean in practice?", "a": "Each tool has one fetch or one side effect a user can name, exclusive when-not text, and its own auth. Fat action enums and synonym twins both violate it.", "kind": "recall"},
    {"q": "Split manage_order(action: get|refund|cancel).", "a": "get_order as a read, create_refund and cancel_order as separate writes with extra gates. The model may call them in sequence. Do not keep one mega-permission.", "kind": "apply"},
    {"q": "When is splitting a get_order into field getters a mistake?", "a": "When the model must pick among near-identical reads and the payload was fine as one object. That creates undifferentiated twins. Split only if size or auth requires it.", "kind": "debug"},
    {"q": "Why does a fat action enum hurt authorisation?", "a": "The executor tends to grant the union of all actions. A read-only agent can then refund if the model picks that action. Separate tools make separate gates natural.", "kind": "apply"},
    {"q": "Is a multi-step refund a reason to keep one mega-tool?", "a": "No. Use the loop: get_order then create_refund. The workflow lives in your cap and your UI confirm, not in a blob argument.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="If you see action: enum with write verbs beside reads, ask for a split. If you see twelve getters for one resource, ask for a merge. The test is whether a stranger can pick the name from a user sentence.",
  ),
  "argument-validation-before-side-effects": note(
   what="""**Schema-valid is not business-valid.** Before any side effect you check **ids** (format and existence), **units** (cents versus dollars, timezones, currencies), **ranges**, and **state** (is this order refundable *now*?). The schema can say `amount: number`. Business-valid says `0 < amount ≤ remaining` in the currency of the order, not the model's favourite currency.

This check lives in the executor, in code you test, not in the description. Descriptions help the model propose; they do not protect the ledger. If a check can be written as a predicate, write it. If it needs a human, stop and ask.

Do the checks **before** the HTTP call that moves money or sends mail. After is an incident report.""",
   why="""On the job, unit bugs (dollars sent as cents) are more common than cartoon prompt injections. Interviewers will ask for an example where JSON Schema passed and you still refused. Amount vs remaining, id ownership, and 'already cancelled' are the trio. They want the predicate in code, plus a test. This is the sibling of M2.4's syntactic vs semantic split, applied to tools.""",
   how="""For `create_refund`:

1. Schema: order_id pattern, amount number, currency enum.
2. Load order (ACL).
3. Units: if the model sent dollars and the ledger is cents, convert in one obvious place or reject — do not guess.
4. `amount <= remaining` and status in `{paid, fulfilled}`.
5. Then billing, with an idempotency key.

Example. `{order_id: ORD-9, amount: 14, currency: USD}` parses. Remaining is 1400 cents. If you treat 14 as cents you under-refund; as dollars you match. The spec must say the unit, the validator must enforce it, and the test must use 14 with an expected 1400 cents or a reject.

Never 'fix' units silently in production without a log.""",
   fails="""1. **Trusting the number type.** -2 and 1e12 both parse.

2. **Guessing cents vs dollars.** You will be wrong half the year.

3. **Checking state after the charge.** You cannot unsend easily.

4. **Putting the predicate only in the description.** The model will still miss it.""",
   line="""Schema-valid is not business-valid. I check ids, units, ranges, and live state in code before any side effect, and I test those predicates with real numbers.""",
   kps=[
    "Business predicates run after schema and before the side effect.",
    "Ids, units, ranges, and live state are the usual checks.",
    "Write units in the spec and enforce them; do not guess cents.",
    "Descriptions cannot protect a ledger.",
    "Test predicates with real amounts and statuses.",
    "Do not silently convert money without a log.",
   ],
   qs=[
    {"q": "Give an example of schema-valid, business-invalid tool args.", "a": "amount: 999999 against a $14 remaining balance, or order_id that exists but is cancelled, or a currency that is not the order's. All parse; all must fail before billing.", "kind": "recall"},
    {"q": "The spec forgot to say cents versus dollars. What do you do in the executor?", "a": "Refuse to guess. Pin the unit in the schema (enum or a field name like amount_cents), add a test, and reject ambiguous payloads until that ships.", "kind": "debug"},
    {"q": "Where should 'order must be refundable now' live?", "a": "In executor code that loads current state, plus a test. Not only in the tool description. State changes; a blurb does not re-check.", "kind": "apply"},
    {"q": "Why run these checks before the billing HTTP call?", "a": "After is an incident: you must compensate. Predicates are cheap. Side effects are not.", "kind": "apply"},
    {"q": "Is a number type enough for amount?", "a": "No. You need a unit, a range against remaining, and usually a currency that matches the order. number only means it parsed as numeric.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Ask for the unit test that 14 dollars is not 14 cents. Ask where live status is loaded. If predicates exist only in the description, the review fails.",
  ),
  "interview": note(
   what="""**Interview: rewrite a bad tool spec** is a live edit. They will give you `helper(data: string) — does stuff` or `manage_order(action, payload)`. You tighten the **name**, the **description**, and the **types** until a stranger could implement the function and a model could pick it. You add when-not text, you bind identity from the session, you split writes from reads, and you name the error codes.

This is M2.6 in one exercise. Talking about 'good tools' without rewriting the spec is a fail.""",
   why="""It is a favourite whiteboard because it shows product sense, security, and prompting in ten minutes. Interviewers listen for exclusive jobs, tight types, no user_id argument, and an extra gate on writes. They do not need vendor flag names. On the job this is also how you review a PR that added a tool.""",
   how="""Work out loud:

1. Rename to a verb-noun.
2. Write when / when-not in two sentences.
3. Replace `data` with two or three typed fields; drop user_id.
4. Mark read vs write; add errors `not_found`, `denied`.
5. Say what you validate before the side effect (ACL, units).

Example start: `process(data)`. End: `get_order(order_id)` plus, if needed, `create_refund(order_id, amount_cents)`. Close with: 'I would eval selection on 50 utterances before shipping the split.'""",
   fails="""1. **Only adding adjectives** to the old description.

2. **Keeping the fat action enum** because it felt convenient.

3. **Forgetting ACL and units** in the spoken rewrite.

4. **Inventing twelve micro-tools** to look thorough.""",
   line="""I rewrite the name, the when/when-not, and the types until a stranger could implement it. I split writes from reads, I bind identity myself, and I say what I validate before the side effect.""",
   kps=[
    "Live-edit name, description, and types — do not add adjectives.",
    "A stranger must be able to implement the function from the spec.",
    "Split fat enums; bind user_id from the session.",
    "Mention ACL, units, and error codes in the rewrite.",
    "Stop at exclusive jobs; do not shard into twelve getters.",
    "Promise a small selection eval, not a vibe.",
   ],
   qs=[
    {"q": "What three parts of a bad tool spec do you rewrite first?", "a": "The name (verb plus noun), the description (when and when-not), and the parameter types (drop catch-all strings, add required ids and units). Then auth and errors.", "kind": "recall"},
    {"q": "Rewrite manage_order(action, payload) on the whiteboard.", "a": "Split into get_order(order_id) and create_refund(order_id, amount_cents). Bind user from the session. Write exclusive when-not lines. Add not_found/denied. Mention ACL and remaining-balance checks.", "kind": "apply"},
    {"q": "A candidate adds please be careful to the old helper description. Why is that a fail?", "a": "Adjectives do not change the interface. The name, types, and job boundaries are still mush. Interviewers want a spec a stranger could implement.", "kind": "debug"},
    {"q": "What must you say about identity in the rewrite?", "a": "user_id is not an argument. The executor binds the session. The description can say the tool is scoped to the current user.", "kind": "apply"},
    {"q": "How do you know the rewrite is done?", "a": "A stranger can implement it, a labelled utterance maps to one tool, and writes have a named extra gate. Then you run a small selection eval.", "kind": "recall"},
   ],
   links=[OA_TOOLS, AN_TOOLS],
   review="Give them helper(data) and time the rewrite. If the result still has a catch-all string or a user_id argument, they do not have the talking point. Listen for ACL and units.",
  ),
 }
}
