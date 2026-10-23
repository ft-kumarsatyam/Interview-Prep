from helper import note, OA_STRUCT, AN_STRUCT, LC_STRUCT

NOTES = {
 "m2-4": {
  "schema-constrained-generation": note(
   what="""**Schema-constrained generation** means the model is not free to emit any text you later hope is JSON. The provider (or a grammar / JSON-schema decoder) **restricts the next tokens** so the completion is valid against a schema: required keys, types, enums, nested objects. This is different from writing "please return JSON" in the prompt. Prompting is a request. A constraint is a fence.

Vendors expose this as structured outputs, response formats, tool-call arguments with a schema, or grammar decoding. Frameworks wrap those flags. The point is the same: you want a parseable object with a known shape, not a chatty paragraph that sometimes contains braces.

Constraints buy **syntax**. They do not buy truth. A perfectly valid `{ "label": "billing" }` can still be the wrong label. The next notes in this module are about validation and repair; this one is about not starting from a string you cannot parse.""",
   why="""On the job, the first integration with a database or a UI state machine dies on unparseable text. Teams waste a week on prompt adjectives before they turn on the schema flag. Interviewers will ask "how do you get JSON out of a model?". The junior answer is the please-return-JSON line. The senior answer is constrained decoding (or a tool schema), then local validation, then a repair loop. They may also ask why you still validate: because a valid object can be a lie.

This is one of the highest-leverage Level 2 skills. Take-homes that regex JSON out of markdown look junior.""",
   how="""Pick the native flag for your vendor. Define a schema (JSON Schema or a Pydantic / zod model). Send it on the call. Parse with your local model, not with a regex.

Example. Labels `billing | bug | how-to | other`. Without a constraint, the model returns `Label: Billing.` or a fenced markdown block. With a constraint, you get `{"label":"billing","reason":"..."}` or a tool-call payload that already matches. You still run `Schema.parse(...)` locally because you do not trust the vendor's decoder with your process memory.

If the vendor cannot constrain (older models, some hosts), you fall back to a tool schema or a grammar, and you keep the repair loop. You do not pretend a prompt is a decoder.""",
   fails="""1. **Prompt-only JSON.** It works in the demo. It breaks in production on long answers and refusals.

2. **Trusting the constraint as truth.** Valid JSON, wrong refund. Validation of meaning is separate.

3. **Regex "just in case".** You extract the first `{...}` from a paragraph and silently accept a truncated object.

4. **Schema so loose it is a string.** `{ "data": string }` with JSON inside the string. You built a prompt again.""",
   line="""I get structured output from a schema constraint, not from 'please return JSON'. That buys syntax. I still validate locally because a valid object can be semantically wrong.""",
   kps=[
    "Constrained decoding fences tokens to a schema; a prompt only asks.",
    "Use the vendor's structured-output or tool-schema flag first.",
    "Syntax is not truth: valid JSON can still be the wrong answer.",
    "Parse with your local schema library, not a regex on markdown.",
    "A schema that is one free-form string is not a constraint.",
    "If the vendor cannot constrain, keep a repair loop — do not hope.",
   ],
   qs=[
    {"q": "What is the difference between 'please return JSON' and schema-constrained generation?", "a": "The first is a prompt request the model can ignore. The second restricts tokens (or tool arguments) so the completion must match a schema. One is hope; the other is a fence.", "kind": "recall"},
    {"q": "Your parser fails on markdown-fenced JSON about 15% of the time. First fix?", "a": "Turn on native structured output or a tool schema so the model cannot emit the fence. Keep local parse as a check. Do not start with a stronger regex.", "kind": "debug"},
    {"q": "Why do you still run Pydantic/zod after a constrained call succeeds?", "a": "Vendor decoders can change, optional fields can be missing, and you want one schema in your process. Also, constraint does not check business meaning.", "kind": "apply"},
    {"q": "When is a schema too weak to count as a constraint?", "a": "When the only field is a free-form string (or a blob) that you will parse again. Tight enums, required keys, and typed lists are the point.", "kind": "apply"},
    {"q": "Does a valid constrained object mean the answer is correct?", "a": "No. It means the shape parsed. Semantic correctness — the right label, the real order id — is a separate check against your data or a judge.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT, LC_STRUCT],
  ),
  "defining-schemas": note(
   what="""A useful schema is a **contract**, not a sketch. You define it in JSON Schema or a typed model (Pydantic, zod, dataclasses). You mark **required** vs **optional** on purpose. You use **enums** for closed sets, **lists** for repeated items, and **nested objects** for records that have parts (an address, a citation). You give fields names a stranger could implement, and you describe them in the schema text the model will see.

Loose schemas produce loose objects. `{"notes": string}` invites a paragraph. `{"label": enum, "reason": string, "order_id": string | null}` can be checked, stored, and tested. Optional is not "whatever". Optional means "absent is legal; if present, this type". Required means "reject or repair if missing".

The same schema should drive the vendor constraint, the local validator, and the TypeScript/Python type your app uses. Three copies that drift are how you ship `reason` to one side and `rationale` to the other.""",
   why="""On the job, schema design is API design. Interviewers will put a sloppy `{data: any}` on the board and ask you to tighten it. They want enums, required keys, a null vs missing story, and nested objects instead of encoded strings. They also want you to say the schema is shared — generated or imported — not pasted twice.

A take-home that uses a typed model scores higher than one that `json.loads` into an untyped dict and indexes keys with hope.""",
   how="""Write the object you want to store, then the schema.

Example. Ticket classifier:

```
label: enum[billing, bug, how-to, other]   # required
reason: string, max 200                    # required
order_id: string | null                    # required key, null allowed
tags: list[enum[...]]                      # optional, default []
```

You do **not** make `label` a free string "so we can grow". You add a label by changing the enum and shipping a version. Nested: if you need a citation, `{source_id, quote}` is an object, not `"source_id: quote"` in a string.

Generate OpenAPI / JSON Schema from the same model your handler imports. The vendor flag gets that schema. The parser gets that schema. The UI gets the type.""",
   fails="""1. **Everything optional.** The model omits the only field you needed. You cannot tell "not applicable" from "forgot".

2. **Stringly enums.** `label: string`. You will get `Billing`, `bill`, and `not sure`.

3. **Nested data as a string.** JSON-in-JSON. You threw away the constraint.

4. **Two schemas.** Vendor copy drifted from Pydantic. Local validate passes; the UI type lies.""",
   line="""I define one typed schema with required fields, enums, lists, and nested objects, and I share it across the vendor constraint, local validation, and the app type. Optional is a decision, not a default.""",
   kps=[
    "Schemas are contracts: required vs optional, enums, lists, nested objects.",
    "One schema should drive vendor, validator, and application types.",
    "Closed sets are enums, not free-form strings.",
    "Optional means absent is legal; required-and-null is a different story.",
    "Do not encode nested records as strings.",
    "Adding a label is a schema version, not a hope the model invents one.",
   ],
   qs=[
    {"q": "What belongs in a production JSON schema for a classifier?", "a": "A required enum for the label, a required reason string, explicit optional fields with types, and any nested objects (not encoded strings). The same model should be used locally and sent to the vendor.", "kind": "recall"},
    {"q": "The model returns `label: \"not sure\"` and your UI crashes. What was missing?", "a": "An enum (and a planned escape like other). A free-form string invited a value the UI did not handle. Tighten the schema and map unknown values in a repair step if you must.", "kind": "debug"},
    {"q": "When do you use required-key-plus-null instead of optional?", "a": "When you need the model to decide 'I looked and there is no order id' rather than omitting the key. Absence and null mean different things to a parser and a UI.", "kind": "apply"},
    {"q": "How do you keep the vendor schema and Pydantic from drifting?", "a": "Generate one from the other, or share a JSON Schema file both consume. Do not paste a second copy into the request builder.", "kind": "apply"},
    {"q": "Why are nested objects better than a 'details' string?", "a": "Constraints and types apply to parts you will query (source_id, quote). A string dumps the contract and invites another ad-hoc parse.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
  "provider-native-vs-framework-support": note(
   what="""You should implement structured outputs **twice in your head**: once with the **provider-native** flag (OpenAI response format, Anthropic structured output or tool, Gemini schema, …) and once with the **framework** helper (`with_structured_output`, a parser). Native is the HTTP field the vendor actually enforces. The framework is a portable call that should end up setting that field — and sometimes falls back to a tool-call or a prompt if the model cannot constrain.

Knowing both matters because the helper can silently degrade. A LangChain method might use native decoding on one model and "prompt + parse" on another. Your logs should say which path ran. If you only know the helper, you cannot explain a sudden 12% parse-fail rate after a model swap.

Native knowledge also lets you drop the framework and keep the contract.""",
   why="""On the job, a framework upgrade changes the fallback and nobody notices until parse errors climb. Interviewers ask you to set structured output on a raw SDK **and** on LangChain. They want to hear that the helper is not magic, and that you still locally validate. They may ask how you would check which path is active: read the request, or a debug flag the helper exposes.

This is the portability note from M2.3 applied to schemas.""",
   how="""For each model you run, write a one-pager:

- Native mechanism (flag name).
- What the framework helper maps to.
- Fallback if native is missing (tool schema / prompt).
- How you detect the fallback in logs.

Example. Model A: helper sets `response_format=json_schema`. Parse fails = 0.4%. Model B: helper cannot use native, prompts for JSON. Parse fails = 11%. You either drop Model B, add a repair loop, or pin Model A for this feature. Without the one-pager you would have blamed "the model got worse".

Implement the native call once in a unit test that inspects the request body, so a helper upgrade cannot change it silently.""",
   fails="""1. **Helper-only knowledge.** You cannot set the flag on the raw SDK in an interview or an incident.

2. **Silent fallback to prompting.** Failures look like model quality.

3. **Different helpers, different schemas.** LangChain copy drifted from the OpenAI copy.

4. **No test on the request body.** An upgrade changed `json_object` (loose) back from `json_schema` (strict).""",
   line="""I can set structured output on the vendor flag and through the framework helper, and I log which path ran. The helper is a mapper; if it falls back to prompting I treat that as a different, weaker system.""",
   kps=[
    "Know the native flag and what the framework helper maps to.",
    "Helpers can silently fall back to prompt-and-parse.",
    "Log the path: native constraint vs tool vs prompt.",
    "One shared schema for both implementations.",
    "Assert the request body in a test so upgrades cannot loosen the flag.",
    "A model swap that loses native support is a product change.",
   ],
   qs=[
    {"q": "Why implement structured output both natively and via a framework?", "a": "So you know the HTTP field the vendor enforces, you can drop the framework, and you can tell when a helper silently falls back to prompting.", "kind": "recall"},
    {"q": "Parse failures jump after you change model ids but not code. What do you check?", "a": "Whether the helper still uses native constrained decoding on the new id, or fell back to prompt-and-parse. Read the request body and the fail rate, not just the prompt.", "kind": "debug"},
    {"q": "How do you stop a library upgrade from loosening json_schema to json_object?", "a": "A unit test that builds the request and asserts the native flag and schema are present. Plus a log field for the path.", "kind": "apply"},
    {"q": "The interviewer hands you a raw SDK. How do you request structured output?", "a": "Attach the vendor's schema/response-format (or a tool with a JSON schema) on the call, then parse with your local model. Do not only add 'return JSON' to the prompt.", "kind": "apply"},
    {"q": "What should a log line say besides 'structured=true'?", "a": "The mechanism: native schema, tool-schema, or prompt fallback. Those three have very different failure rates.", "kind": "recall"},
   ],
   links=[OA_STRUCT, LC_STRUCT, AN_STRUCT],
  ),
  "validating-before-use": note(
   what="""A model output is **untrusted input**. Even after constrained generation, you validate with your own schema library **before** the object touches a database, a tool, a UI state machine, or another model. Validation means: types, required keys, enums, ranges, string lengths, and any extra business predicates you can check without a human (id format, allow-listed status values).

"The vendor said it matched the schema" is not a boundary. Your process, your memory, your invariants. The validator is the same code you would use for a public HTTP request. If you would not `INSERT` a user-supplied JSON blob, you do not `INSERT` a model-supplied one.

Validation is fail-closed. A miss goes to repair or reject, not to a default that looks like a real record.""",
   why="""On the job, the expensive bugs are valid-looking writes: a `qty` of `-1`, a `label` the warehouse does not stock, an `email` that is three paragraphs. Interviewers will ask when you validate. "Before use" is the phrase. They want a library (zod, Pydantic), not `if 'label' in data`. They also want you to refuse to "keep going" on a partial object just because the UI is waiting.

This is the same hygiene as tool arguments in M2.5–M2.6. Structured output is still a stranger at the door.""",
   how="""`raw = complete(...)` → `parsed = Schema.safe_parse(raw)` → if fail, repair or reject → if pass, **then** `db.write` / `tool(parsed)`.

Example. `{label, reason, order_id}`. Validator checks enum, reason length, and `order_id` matches `^ORD-[0-9]+$` or is null. A model returns `order_id: "please see above"`. Native constraint allowed a string; your predicate rejects. You retry once with the validator error, or you store a rejected turn, not an order row.

Do not validate only in the happy-path type (`Schema.parse` that throws in an uncaught frame). Use a result type you handle.""",
   fails="""1. **Use then validate.** You wrote the row, then the schema failed in a log line. The row is already there.

2. **`dict.get` as a validator.** Missing keys become `None` and look like real nulls.

3. **Catch-all default.** Invalid label becomes `other` without a reject event. Your metrics lie and you cannot repair.

4. **Different validator in batch vs online.** Nightly jobs write garbage the API would have refused.""",
   line="""I validate with my own schema library before any write, tool, or UI update. Vendor constraints are not a boundary. Fail closed: repair or reject, do not insert a half object.""",
   kps=[
    "Model output is untrusted; validate before any side effect.",
    "Use a real schema library, not dict.get and hope.",
    "Vendor 'it matched' is not your process boundary.",
    "Fail closed: repair or reject, do not default into a real record.",
    "Business predicates (id format, ranges) belong next to types.",
    "Online and batch must share the same validator.",
   ],
   qs=[
    {"q": "When do you validate a structured model output?", "a": "Immediately after parse and before any database write, tool call, or UI commit. The vendor constraint is not sufficient.", "kind": "recall"},
    {"q": "A qty of -2 reached the warehouse. Structured output was on. What was missing?", "a": "A local predicate (qty > 0) before use. The schema allowed an integer; it did not allow a business-legal integer. Validate ranges, not only types.", "kind": "debug"},
    {"q": "Why is dict.get('label') a bad validator?", "a": "A missing key becomes None and looks like a deliberate null. You lose the required-field failure and you cannot trigger repair. Use a schema that distinguishes absent, null, and value.", "kind": "apply"},
    {"q": "What do you do on validation failure in a user-facing turn?", "a": "Repair once with the validator error, or reject with a safe message. Do not write a default that looks successful. Log the raw payload and the error.", "kind": "apply"},
    {"q": "Should batch jobs use a looser schema to 'keep throughput'?", "a": "No. Share the same validator. Garbage at night is still garbage, and it is harder to notice.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
  "syntactic-validity-vs-semantic-correctness": note(
   what="""**Syntactic validity** means the bytes match the schema: keys, types, enums, required fields. **Semantic correctness** means the values are true and useful in the world: the label matches the ticket, the `order_id` exists, the date is not last century, the citation actually supports the claim. Valid JSON can be confidently wrong. This split is the whole reason you still evaluate after you parse.

A lot of production dashboards only track parse rate. That number can be 100% while half the labels are inverted. Syntax is a gate. Semantics need a golden set, a database lookup, or a human/judge.

Constrained decoding raises parse rate. It does nothing to semantics except sometimes *hurt* them if a tight enum forces a guess instead of abstention.""",
   why="""On the job, PMs will celebrate "we got JSON working" and ship. Support then files tickets about wrong refunds that looked perfectly structured. Interviewers will hand you a valid object with a nonsense `order_id` and ask if you are done. "No — syntax passed, meaning is unchecked" is the line. They want one concrete semantic check (exists in DB, enum matches a retrieved policy, judge on a held-out set).

This note is also how you talk about hallucinations without the word becoming mush. A hallucinated id that passes JSON Schema is the example.""",
   how="""Put two boxes on the board.

Syntax: schema validate. Fail → repair/reject.
Semantics: cheap checks first (id exists, date range, foreign key), then sampled evals (golden set, judge).

Example. `{order_id: "ORD-99", status: "shipped"}` parses. `ORD-99` is not in the orders table, or it is `cancelled`. Syntax passed; semantics failed. You do not tell the user it shipped. You look up the id, and if missing you abstain or repair.

A second example: label enum is valid `billing` but the ticket is a password reset. Only a labelled set or a second reviewer catches that. Track **both** rates: parse_ok and task_ok.""",
   fails="""1. **Parse rate as the KPI.** You optimise the decoder and miss the task.

2. **No cheap semantic checks.** You never look up ids you emit.

3. **Forcing an enum with no abstain.** The model must pick a label; syntax is perfect; meaning is a coin flip on edge cases.

4. **Judging only fluent English.** The JSON is valid and the sentence is pretty. The id is still invented.""",
   line="""Valid JSON is syntax. Correctness is whether the values are true. I track both, I look up ids I emit, and I never treat a 100% parse rate as a finished feature.""",
   kps=[
    "Syntax: schema match. Semantics: true and useful in the world.",
    "Constrained decoding lifts parse rate, not task accuracy.",
    "Look up emitted ids and other cheap facts before you speak them.",
    "Track parse_ok and task_ok as different metrics.",
    "A tight enum without abstain can force a wrong but valid guess.",
    "Fluent, valid output can still be a hallucination.",
   ],
   qs=[
    {"q": "Give an example of syntactically valid, semantically wrong output.", "a": "A schema-valid {order_id, status: shipped} where the id does not exist or the order is cancelled. JSON parsed; the world disagrees.", "kind": "recall"},
    {"q": "Parse rate is 99.9% but users complain about wrong labels. What did you measure?", "a": "Only syntax. Add a golden set or cheap lookups and track task accuracy separately. Do not tighten the decoder further and call it done.", "kind": "debug"},
    {"q": "What is a cheap semantic check you can run on every turn?", "a": "Primary-key existence, allow-listed statuses, date ranges, and enum membership against the live catalogue — anything a database or config can confirm without a judge.", "kind": "apply"},
    {"q": "How can a schema constraint make semantics worse?", "a": "If every field is required and there is no abstain/other, the model must emit a valid-looking guess instead of refusing. Add an explicit unknown path.", "kind": "apply"},
    {"q": "Why is 'it returned JSON' a weak launch criterion?", "a": "JSON is the envelope. Launch needs a measured task_ok on a held-out set, plus the cheap lookups that stop invented ids.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
  "generate-validate-repair": note(
   what="""The production loop for structured output is **generate → validate → accept / retry / repair / reject**. Generate under a schema. Validate locally. If it passes, accept. If it fails, you have three honest exits: **retry** the same call (rare; only for transient vendor errors), **repair** once by sending the validator error back to the model, or **reject** with a safe fallback that cannot be mistaken for a successful record.

Repair is a second, bounded call: "Your previous object failed: `order_id` is not ORD-\\d+. Return a corrected object." It is not an unbounded conversation with the parser. After one (at most two) repairs, you reject. Reject means a default the product designed (`other`, `insufficient`, an empty list) plus a log, not a guessed record.

This loop is also where finish_reason=`length` goes: you do not repair a truncated object by closing braces; you retry with a shorter schema or a higher cap.""",
   why="""On the job, this loop is the difference between a brittle demo and a feature ops can live with. Interviewers will ask you to walk generate-validate-repair and what the fallback looks like. They want a cap on repairs (cost and loops), a fallback that is obviously a fallback, and logs of every fail. "We just retry until it works" is a bill and a hang.

This is M2.4's design question, sibling to M2.9's retry map. Schema failures are usually not 503s; do not treat them like transport.""",
   how="""Write it as a state machine.

1. Generate (native schema, timeout, request id).
2. If transport fail → M2.9 retry map.
3. If `length` → retry once with shorter output or higher cap; do not parse.
4. Validate. Pass → accept.
5. Fail → one repair call with the error text; validate again.
6. Still fail → reject: return the product's safe object, log raw + errors, do not write the business row.

Example. Extract `{emails: [string]}`. First object has `emails: "a@b.c, d@e.f"` (a string). Validator fails (expected list). Repair prompt includes the error. Second object is a list. Accept. If the second is still a string, reject to `emails: []` and a `rejected=true` flag the UI can show.""",
   fails="""1. **Unbounded repair.** The model and the parser argue for ten turns. You pay and you delay the user.

2. **Fallback that looks successful.** Invalid label becomes `billing` because it is the first enum. You shipped a lie.

3. **Repairing `length` with a brace-closer.** You invent fields. Reject or retry the generation.

4. **No log of the fail.** You cannot see that repair rate is 40% and the schema is too tight or the model is too weak.""",
   line="""Generate under a schema, validate locally, repair once with the error, then accept or reject. The fallback must look like a fallback. I never close truncated JSON myself and I never retry forever.""",
   kps=[
    "Loop: generate → validate → accept, retry, repair, or reject.",
    "Repair at most once or twice with the validator error; then stop.",
    "Reject with a designed safe object, not a guessed valid one.",
    "Do not treat schema fails like 503s; do not treat length as parseable.",
    "Log raw payload and validator errors so repair rate is visible.",
    "Transport retries and schema repairs are different maps.",
   ],
   qs=[
    {"q": "Walk the generate → validate → repair loop and its exits.", "a": "Generate under a schema, validate locally. Accept if it passes. On schema fail, repair once by sending the validator error. If that fails, reject to a designed fallback. Transport errors use a separate retry map.", "kind": "recall"},
    {"q": "Repair has run four times and the object is still invalid. What should have happened?", "a": "You should have rejected after one or two repairs. Unbounded repair burns tokens and time. Log the raw failures and fix the schema or the model, do not loop.", "kind": "debug"},
    {"q": "What is a safe reject for a classifier versus a dangerous one?", "a": "Safe: other or insufficient_evidence with a flag. Dangerous: picking the first enum value or a guessed label that looks like success.", "kind": "apply"},
    {"q": "The completion ended with finish_reason=length mid-object. Do you repair?", "a": "No. Do not close braces. Retry generation with a shorter output or a higher cap, or reject. Repair is for complete-but-invalid objects.", "kind": "apply"},
    {"q": "Why log repair rate as its own metric?", "a": "A high repair rate means the schema, the model, or the prompt is wrong. If you only log final success, you hide the cost and the fragility.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
  "enum-and-optional-fields-in-schemas": note(
   what="""Tight types are how you stop a parser from "succeeding" on mush. An **enum** is a closed set the model must pick from (`billing | bug | how-to | other`). An **optional field** is a key that may be absent; if present it still has a type. A free-form string is what you use when the value is truly open (a reason sentence), not when you were too lazy to list the cases.

Enums belong on labels, statuses, countries, reason codes — anything you will `switch` on. Optional belongs on information that is allowed to be missing (`phone` on a lead). Required-plus-null belongs on "we asked and the answer is none" (`order_id`). Mixing these three is how APIs become unreadable.

The model sees enum values in the schema. Keep them stable, documented, and short. Do not put a 2_000-word policy in an enum description.""",
   why="""On the job, every free-form field you later parse with if-else is a schema you refused to write. Interviewers will ask you to tighten a sloppy schema. They want enums on closed sets, optionals that are intentional, and the sentence "tight types beat a string the parser cannot trust". They also want an escape enum (`other`, `unknown`) so tightness does not force a lie.

This is the most practical schema skill in the module. It shows up in every take-home.""",
   how="""Rewrite a bad extractor.

Before: `{ "type": string, "id": string, "extra": string }`.
After: `{ "type": enum[order, ticket, unknown], "id": string | null, "priority": enum[low, med, high] | omitted }`.

You add `unknown` so the model is not forced to pick `order`. You keep `reason` as a string because it is open text. You do not add `extra` as a junk drawer.

When the set grows, you version the schema (`label_v2`) or you add a value and ship the UI the same day. You do not silently accept old clients sending free text.""",
   fails="""1. **Enum without an escape.** Edge cases become random valid values.

2. **Optional everything.** You cannot require the one field you need.

3. **Junk-drawer strings.** `extra`, `notes`, `raw` — the model dumps structure there.

4. **Enums that change daily.** You are using an enum for an open catalogue; retrieve the catalogue instead.""",
   line="""Closed sets are enums with an escape hatch. Optional is deliberate. I do not leave a free-form string where I will later write a switch, because the parser cannot trust it.""",
   kps=[
    "Enums for closed sets; strings for truly open text.",
    "Always include an escape (other/unknown) on forced choices.",
    "Optional vs required-plus-null are different meanings.",
    "Tight types beat a free-form string you will parse again.",
    "No junk-drawer fields that swallow structure.",
    "Version the schema when the enum changes; do not silently loosen.",
   ],
   qs=[
    {"q": "When should a field be an enum rather than a string?", "a": "When your code will branch on a closed set of values (labels, statuses, reason codes). If you would write a switch, write an enum — plus an escape value.", "kind": "recall"},
    {"q": "The model must pick a ticket type and has no 'other'. What goes wrong?", "a": "Edge cases become a random valid type. Syntax stays perfect; semantics rot. Add other/unknown or make the field nullable with a reason.", "kind": "debug"},
    {"q": "Tighten {type: string, extra: string} for an order-or-ticket extractor.", "a": "type as enum[order, ticket, unknown], id as string|null, drop extra or replace it with typed optional fields. Keep a separate reason string if you need open text.", "kind": "apply"},
    {"q": "The catalogue of product SKUs changes hourly. Should SKU be an enum?", "a": "No. That is an open, moving set. Use a string plus a lookup against the live catalogue (semantic check), not an enum you cannot ship hourly.", "kind": "apply"},
    {"q": "What is the difference between omitting priority and sending null?", "a": "Omit (optional) means the field was not in scope. Null (required key) means we asked and there is no priority. Pick one meaning and document it.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
  "what-to-do-when-the-model-omits-a-field": note(
   what="""When a required field is missing, you have two honest moves: **default in code** (only if the default is safe and designed) or **retry once with the validator error**. You do not invent a business value, and you do not silently treat missing as null unless the schema said that was legal.

"Default in code" is for true product defaults: `tags=[]`, `notify=false`, `language="en"` when the product already treats those as implicit. It is not for `label=billing` or `amount=0`. Those are guesses. "Retry once" is the repair step: show the model which key failed and what the type was. After that, reject.

Optional fields that are omitted are not errors. Required fields that are omitted are. Do not blur them in the handler.""",
   why="""On the job, omitted fields are how half-records enter the warehouse. Interviewers will ask "the model dropped `order_id`, what do you do?". They want: if it was optional, continue; if required, repair once or default only when the default is harmless; never fabricate an id. They also want you to log the omit so you can see a model or schema problem.

This is a small note with a high signal. It shows you will not "just fill it in".""",
   how="""Validator returns `{missing: ["order_id"]}`.

- If `order_id` is optional: accept; UI shows "no id".
- If required and a safe default exists (it does not, for ids): do not default.
- Repair once: "order_id is required and must match ORD-\\d+ or be null".
- Still missing: reject the turn. Store the raw object. Show a fallback card.

Example. `notify` omitted, schema optional, product default false. You default in code and log `defaulted=notify`. Example 2. `label` omitted, schema required. You repair once; if it is still gone, you return `other` **only if** `other` is the designed reject, and you flag `rejected=true`.

Do not write `data["label"] = data.get("label") or "billing"`.""",
   fails="""1. **Guessing a business field.** Missing label becomes the popular class. Metrics look healthy.

2. **Treating required as optional at the handler.** The schema said required; the code shrugged.

3. **Defaulting an id to a placeholder.** `ORD-0000` later joins a real row or confuses support.

4. **Repair loops on a field the model cannot know.** If the ticket has no id, the schema should allow null; stop asking for a miracle.""",
   line="""If a required field is missing I repair once with the validator error, or I apply a designed safe default. I never invent a business value, and I treat optional omits as legal.""",
   kps=[
    "Required omit: repair once or a designed safe default; then reject.",
    "Optional omit is not an error.",
    "Never invent ids, amounts, or labels as defaults.",
    "Empty lists and false flags can be real product defaults — log them.",
    "If the model cannot know the value, the schema should allow null.",
    "Do not bypass required in the handler with dict.get.",
   ],
   qs=[
    {"q": "The model omits a required order_id. What are the legal next steps?", "a": "Retry once with the validator error (repair), or reject. Do not invent an id or silently treat the key as optional. If many tickets have no id, change the schema to allow null.", "kind": "recall"},
    {"q": "A handler writes label = data.get('label') or 'billing'. Why is that a bug?", "a": "It turns a missing required field into a guessed business value. Metrics and users see a real label. Repair or reject instead.", "kind": "debug"},
    {"q": "When is defaulting in code acceptable?", "a": "When the product already has a safe implicit value (tags=[], notify=false, language=en) and you log that you defaulted. Not for identifiers, money, or class labels.", "kind": "apply"},
    {"q": "Repairs keep asking for a phone number the ticket never contained. What should change?", "a": "The schema. Make phone optional or null, and stop repairing for information that is not in the input. Repair cannot create facts.", "kind": "apply"},
    {"q": "How do you make omits visible to ops?", "a": "Log missing keys, repair counts, and defaulted fields on the request row. A rising omit rate is a schema or model issue, not user noise.", "kind": "recall"},
   ],
   links=[OA_STRUCT, AN_STRUCT],
  ),
 }
}
