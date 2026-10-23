from helper import note
from links import OA_DATA, OA_SAFE, NIST, MEITY

L = [OA_DATA, OA_SAFE]

NOTES = {
    "m8-6": {
        "identifying-sensitive-data": note(
            what="""**Sensitive data** in an LLM system is broader than a user message. It includes PII, credentials, financial data, private conversations, confidential business data, health or student records, location, biometrics, and secrets that sit in **tools, retrieval, memory, traces, eval sets, screenshots, and fine-tune corpora**. Hidden places: system prompts that contain API keys, few-shot examples copied from real tickets, error strings, URLs with tokens, embeddings of raw documents, and the model's output repeating what it saw.

Identification is a data map, not a regex. You list stores and flows, then tag fields. Regex helps for cards and keys; it misses names in prose, photos, and implied identity ('the CFO's daughter').""",
            why="""You cannot redact what you have not found. Interviewers ask where PII hides besides the chat box. On the job this map is the start of a DPIA or a DPDP record of processing.""",
            how="""Walk the path: browser → API → prompt assembler (rules, history, retrieval, tools) → provider → output → logs, caches, evals, memories.

Example. A support bot: ticket body (PII), CRM tool result (account numbers), retrieved contract (commercial terms), few-shot blob (real emails), LangSmith-style trace (full prompt), nightly eval export (CSV of tickets). Your regex detector on the user box misses most of that. You add field tags at the source and a detector on assembled prompts and on tool results.""",
            fails="""1. **Only scanning the latest user turn.**

2. **Assuming the provider 'is HIPAA'** so you stop mapping.

3. **Few-shot examples from production** with no review.

4. **Embeddings treated as non-personal** because they are vectors.""",
            line="Sensitive data in an LLM stack hides in retrieval, tools, memories, traces, evals, and few-shots, not only in the user's message. I map those stores first, then I detect — regex for secrets, source tags for fields, and I do not treat embeddings as anonymous.",
            kps=[
                "Map every store and flow, not only the chat box.",
                "PII, secrets, financial, health, and confidential business data.",
                "Few-shots, traces, evals, and embeddings are stores.",
                "Regex misses implied identity and images.",
                "Tag at the source; detect on the assembled prompt.",
                "Vectors of personal text are still personal data.",
            ],
            qs=[
                {"q": "Where can sensitive data hide in an LLM system besides the user's message?", "a": "Retrieved docs, tool results, history, memories, system few-shots, traces, eval exports, caches, screenshots, and embeddings. Also model output that repeats what it saw.", "kind": "recall"},
                {"q": "Your PII detector is regex-only. What gaps do you expect and how do you close them?", "a": "Names in prose, photos, implied identity, and novel secret formats. Close with source-field tags, a model-based detector as signal, and minimization so those fields never enter the prompt.", "kind": "apply"},
                {"q": "Why are embeddings of support tickets personal data?", "a": "They are derived from personal text and can sometimes be inverted or linked. Treat them as in-scope for retention, deletion, and residency.", "kind": "debug"},
                {"q": "What is dangerous about production few-shots?", "a": "They copy real people into every later prompt and into provider logs. Use synthetic or consented, redacted examples.", "kind": "recall"},
                {"q": "How would you start a data map in a week?", "a": "List stores, tag fields at write time, sample assembled prompts, and run a secret scanner on traces. Ship the map before you buy another detector.", "kind": "apply"},
            ],
            links=L,
            walk="""You dump one production trace and highlight seven PII sources. The only detector was on the inbox. You add tags on CRM fields and block the eval CSV until it is redacted.""",
            measure="""Stores in the data map; traces with untagged personal fields; secret-scanner hits in prompts; few-shots that still contain real tickets.""",
        ),
        "redaction-minimization": note(
            what="""**Detect, redact, mask, or drop** sensitive information before it goes to a model when the model does not need it. Minimization is the first choice: do not send the field. Redaction replaces with a typed placeholder (`[EMAIL_1]`) so the task can continue. Masking hides part of a value. **Pseudonymisation** maps an identity to a stable token you can reverse in a secure store after the model returns.

A **redact-then-restore** pipeline: replace PII with placeholders, call the model, then restore placeholders in the user-visible output if policy allows — never restore into logs. The model should see `please refund [ORDER_1]` not the raw PAN.""",
            why="""This is how you use an external LLM on support tickets without mailing the provider your customers. Interviewers want the pipeline, not 'we redact'. On the job, restore-into-logs is the bug.""",
            how="""Example. Ticket in → detect emails, phones, order ids → replace with numbered tokens → send to the model → model writes a reply using tokens → restore only in the agent UI → logs keep tokens. Order id might stay if the model must look it up; then the lookup is a tool with authZ, and the id never needed to be in the prose.

Do not minimize so hard the task dies (dropping the error code). Measure task success on a redacted eval set.""",
            fails="""1. **Restore into traces.**

2. **Unstable tokens** so the model cannot refer to the same person twice.

3. **Redacting after the provider call.**

4. **One global redaction policy** that breaks medical or legal routes that need more context under a stricter hosting model.""",
            line="I minimise first, then redact with stable placeholders, and I restore only in the user-visible surface — never in logs. The model gets the shape of the task, not the raw PAN or the whole contract if a clause will do.",
            kps=[
                "Minimise: do not send fields the model does not need.",
                "Redact with stable, typed placeholders.",
                "Restore only on the user surface, never in logs.",
                "Pseudonymisation is reversible in a secure store, not in the prompt.",
                "Measure task success on redacted evals.",
                "Different routes can have different hosting plus redaction mixes.",
            ],
            qs=[
                {"q": "Explain a redact-then-restore pipeline for sending support tickets to an external LLM.", "a": "Replace PII with numbered placeholders, call the model, restore placeholders only in the agent UI, keep tokens in logs. Tools fetch extra fields under authZ instead of putting them in prose.", "kind": "apply"},
                {"q": "What is the difference between masking and pseudonymisation?", "a": "Masking hides part of a value and is often irreversible. Pseudonymisation replaces identity with a token you can map back in a controlled store. Both are not full anonymisation if re-identification is possible.", "kind": "recall"},
                {"q": "The model keeps saying 'the customer' because you redacted the name. Is that a failure?", "a": "Not if the task does not need the name. If it does, use a stable `[PERSON_1]` so coreference works, rather than sending the real name.", "kind": "debug"},
                {"q": "When should you refuse the external model instead of redacting?", "a": "When the remaining text still identifies a person in a regulated category and your contract or residency story does not cover that provider. Host privately or do not automate.", "kind": "apply"},
                {"q": "Why not restore placeholders in the trace 'for debugging'?", "a": "Then the trace is a second copy of the PII with a long retention. Debug on tokens and an access-controlled original in the ticket system.", "kind": "recall"},
            ],
            links=L,
            walk="""You ship redact-then-restore for email. Quality holds on the eval set. A debug flag had been restoring into JSON logs; you delete that path and rotate access to old files.""",
            measure="""PII fields reaching the provider; task success on redacted versus raw (raw only in a secure harness); traces containing restored values.""",
        ),
        "keeping-pii-out-of-logs-traces": note(
            what="""**Do not store sensitive data in prompts, logs, traces, memories, vector stores, or eval sets unless you must**, and if you must, treat those stores as in-scope for retention, access control, and deletion. The default LLM request log should be **metadata**: route, model, token counts, latency, tool names, hashes, decision codes — not the full prompt.

Redact **before the log shipper**. Once a vendor or a SIEM has the body, your retention policy is their retention policy. 'We will delete later' fails when someone already cloned the bucket.""",
            why="""This is the most common privacy incident in LLM apps: the product is careful and LangSmith is not. Interviewers ask what you log. 'Full prompts for 30 days' is a finding unless you have a legal basis and access control.""",
            how="""Log schema: `trace_id, route, model, tokens_in, tokens_out, cache_hit, tool_names, guard_decisions, chunk_ids, prompt_hash`. Bodies live in a short-lived, access-controlled debug store if at all, with purpose limitation.

A user invokes erasure. You must reach traces, caches, memories, eval copies, and backups per policy. If you cannot, you should not have stored the body.""",
            fails="""1. **Full-prompt default** in the observability vendor.

2. **Redacting in the UI** while the shipper already has the raw event.

3. **Eval CSVs on laptops.**

4. **Memories that are just pasted chats.**""",
            line="I keep PII out of logs by shipping metadata and hashes, redacting before the shipper, and treating any stored body as a regulated store with retention and deletion. The right to erasure is a design constraint, not a ticket we improvise.",
            kps=[
                "Default logs are metadata, not full prompts.",
                "Redact before the log shipper.",
                "Traces, evals, memories, and vectors are in scope.",
                "Erasure must reach every copy you chose to keep.",
                "A debug body store is short-lived and locked down.",
                "UI redaction is not log redaction.",
            ],
            qs=[
                {"q": "What should an LLM request log record instead of the full prompt?", "a": "Route, model, token counts, latency, tool names, guard decisions, chunk ids, and hashes. Bodies only in a short-lived, access-controlled debug store if needed.", "kind": "recall"},
                {"q": "A user invokes the right to erasure but your trace store holds their prompts. What went wrong in design?", "a": "You stored bodies without a deletion path or a purpose that covers keeping them. Design traces as metadata, or implement erasure across that store and its backups.", "kind": "debug"},
                {"q": "Why redact before the shipper rather than in a SIEM rule?", "a": "The vendor already stored the raw event. Your rule does not un-send it. Prevent the write.", "kind": "apply"},
                {"q": "Which store is commonly forgotten in deletion requests?", "a": "Eval sets, prompt caches, embeddings, and laptop exports. List them in the data map.", "kind": "recall"},
                {"q": "How do you debug a bad answer without full-prompt logs?", "a": "Use chunk ids, prompt hashes, and an on-demand reconstruct from sources you still hold under ticket access control — or a time-limited debug flag with extra consent.", "kind": "apply"},
            ],
            links=[OA_DATA, NIST],
            walk="""You switch the tracer to metadata-only. Debug reconstructs from ticket id plus chunk ids for 24 hours under a break-glass role. The erasure runbook now has a finite store list.""",
            measure="""Events with raw bodies; erasure time-to-complete; shipper payloads that still contain `@` plus a message body.""",
        ),
        "retention-deletion-residency": note(
            what="""Know **how long** each store keeps data, **how you delete** it, **where** it lives, **who** can access it, and **what the model provider** does (training, retention, subprocessors, regions). Retention is a legal setting, not a disk-cleanup habit. Deletion is a pipeline: primary DB, indexes, caches, memories, traces, evals, backups per policy. Residency is pinning processing and storage to a region when a customer or law requires it.

A deletion request that only hits Mongo and forgets the vector store is a failed request. A 'EU-only' story that still sends prompts to a US-only endpoint is a failed story.""",
            why="""DPDP, GDPR, and enterprise DPAs all land here. Interviewers ask for the store list. On the job this is the security questionnaire.""",
            how="""Table per store: purpose, TTL, region, delete API, backup story, access role. Provider column: zero-retention option, training off, region, DPA.

Example. Customer demands EU-only. You review: app region, vector region, provider region, log vendor region, and whether any fallback model is US. You refuse a fallback that breaks residency rather than silently succeeding.""",
            fails="""1. **TTL on the ticket, forever on the index.**

2. **Backups that cannot delete** and no exception process.

3. **Provider default training-on** because someone used the consumer API.

4. **Residency as a marketing label** without pinning the client.""",
            line="Retention, deletion, and residency are a table: every store, a TTL, a delete path, a region, and a provider row. I honour erasure across indexes and evals, and I will fail a request rather than silently process in the wrong region.",
            kps=[
                "Every store has purpose, TTL, region, and a delete path.",
                "Erasure includes vectors, caches, memories, evals, and traces.",
                "Provider training and retention are explicit settings.",
                "Residency is pinned in the client, including fallbacks.",
                "Backups need a documented story.",
                "A missing row in the table is a finding.",
            ],
            qs=[
                {"q": "List the stores a deletion request must reach in a RAG product.", "a": "Primary records, chunk and embedding indexes, retrieval and response caches, memories, traces, eval copies, and backups per policy. Name owners for each.", "kind": "recall"},
                {"q": "A customer demands EU-only processing. What do you review?", "a": "App, index, logs, and model-provider regions, plus every fallback and batch job. Refuse a path that exits the EU rather than succeeding quietly.", "kind": "apply"},
                {"q": "The ticket is gone but the bot still answers from that customer's PDF. Why?", "a": "The index or a cache still has chunks. Deletion must include reindex and cache bust, not only the source row.", "kind": "debug"},
                {"q": "What provider questions belong on the table?", "a": "Retention, training use, region, subprocessors, and whether the API you call is the enterprise endpoint you think it is.", "kind": "recall"},
                {"q": "How do you handle backups that cannot surgically delete?", "a": "Document the residual, the expiry of the backup, and access controls. Do not pretend the DPA is clean if you cannot say this.", "kind": "apply"},
            ],
            links=[OA_DATA, MEITY],
            walk="""A DPA questionnaire arrives. You attach the store table. One row is empty (eval bucket). You add TTL and a delete job before you sign.""",
            measure="""Stores with a tested delete; fallbacks that broke residency in staging; time to complete an erasure drill.""",
        ),
        "private-connectivity-zero-retention": note(
            what="""Regulated deployments often need **private connectivity** to the model endpoint (no public egress), **contractual zero-retention or no-training**, and **regional pinning**. These are the controls that make a hospital or a bank conversation possible. Zero retention means the provider commits not to keep your prompts and outputs beyond serving the request (and maybe a short abuse window you must read). It does not mean their GPU never saw the bytes, and it does not cover *your* logs.

Private connectivity (Private Link, VPC peering, on-prem) reduces the chance that prompts traverse the public internet and that a mis-set key talks to the wrong project. You still authenticate and you still minimise.""",
            why="""Interviewers for regulated domains ask this by name. On the job it is the difference between 'we use OpenAI' and 'we use the enterprise endpoint with ZDR and private network'.""",
            how="""Routing policy: public marketing text may use a multi-tenant public API. Patient notes use a private endpoint, ZDR, a BAA if applicable, and a region pin. The gateway, not each service, holds that map.

Read the exact terms: some 'zero retention' offers still allow abuse monitoring for a number of days. Write that number in the table. Do not assume a playground key has the same terms as the enterprise contract.""",
            fails="""1. **Consumer API for regulated data.**

2. **Believing ZDR covers your SIEM.**

3. **Public egress 'just for retries'.**

4. **One key for both marketing and health.**""",
            line="For regulated data I use private connectivity, contractual zero-retention or no-training, and a pinned region, routed at the gateway. Zero retention is the provider's promise, not mine — I still minimise and lock my logs.",
            kps=[
                "Private connectivity, ZDR or no-training, and region pin.",
                "Read the abuse-monitoring window in the contract.",
                "ZDR does not cover your traces or evals.",
                "Route at the gateway by data class.",
                "Playground keys are not enterprise terms.",
                "No public egress 'just for the fallback'.",
            ],
            qs=[
                {"q": "What does 'zero data retention' guarantee and what should you still check?", "a": "The provider's commitment not to keep prompts and outputs beyond serving (plus any stated abuse window). You still check that window, region, training-off, and your own logs.", "kind": "recall"},
                {"q": "Design a routing policy for a company that handles both public marketing text and patient records.", "a": "Marketing may use a public API. Patient records use a private endpoint, ZDR, a BAA if needed, and a pinned region. The gateway enforces the split; one key must not serve both.", "kind": "apply"},
                {"q": "A provider offers zero retention. Which assumption is risky?", "a": "That your traces are covered, that the playground key has the same terms, or that retries to another region are fine. Read the contract and pin the client.", "kind": "debug"},
                {"q": "Why is private connectivity not enough alone?", "a": "The provider can still retain or train if the contract allows. Network isolation plus contractual terms plus your minimization.", "kind": "recall"},
                {"q": "Where should keys and residency policy live?", "a": "In the model gateway, not copied into each microservice.", "kind": "apply"},
            ],
            links=[OA_DATA, NIST],
            walk="""You move health traffic to a private endpoint and break the public fallback in that route. A chaos test that blackholes the private link degrades to 'unavailable', not to the public API.""",
            measure="""Requests that left the pinned region; keys used across data classes; ZDR contract rows that are actually enabled in the console.""",
        ),
        "protecting-secrets-from-the-model": note(
            what="""**Secrets never need to be in the prompt.** API keys, session tokens, passwords, private keys, and connection strings live in the **executor** or a secret manager. The model sees a tool name and arguments; the server injects the credential at call time. If the model must call a payment API, it proposes `charge(order_id)`; your code loads the key.

Also prevent secrets from *entering* context: users paste curl with bearer tokens; retrieved docs contain keys; tool errors echo credentials. Detect and drop. Once a secret is in context it can be printed, cached, logged, or stuffed into a URL.""",
            why="""This is a hard interview line. 'The model needs the key to call the API' is a fail. On the job, pasted tokens in chat are a weekly event.""",
            how="""Pattern: tool adapter holds the secret; model never lists env; sandbox env is stripped. User paste: a detector strips `Authorization:` and rotates if it looks live. Retrieved files: secret scan before index. Tool errors: sanitise.

If a user pastes a token, you treat it as a leak: redact, warn, and tell them to rotate. Do not store it in history.""",
            fails="""1. **Keys in the system prompt** 'for function calling'.

2. **Passing `process.env` into the sandbox.**

3. **Logging tool args** that accidentally included a user-pasted secret.

4. **Asking the model to 'remember my key'.**""",
            line="The model never needs the key. I inject secrets in the executor, I strip them from user paste and retrieval, and I treat anything that reached context as a leak to rotate.",
            kps=[
                "Secrets live in the executor or a secret manager.",
                "The model proposes actions, not credentials.",
                "Scan user paste, retrieval, and tool errors.",
                "A secret in context is a leak: redact and rotate.",
                "Sandbox environments are stripped.",
                "Do not log args that may contain pasted tokens.",
            ],
            qs=[
                {"q": "How should an agent call an API that needs a key without exposing the key to the model?", "a": "The model emits a typed tool call. The executor loads the key from a secret manager and calls the API. The key never appears in messages.", "kind": "recall"},
                {"q": "A user pastes a curl command with a bearer token into the chat. What happens and what should the system do?", "a": "The token is now in context, history, and maybe logs. Detect, redact, warn, drop from history, and tell them to rotate. Do not store or send it to the provider if you can stop it first.", "kind": "debug"},
                {"q": "Where should a payment-API key live?", "a": "In the executor's secret store, injected at call time. Not in the prompt, the tool description, or the browser.", "kind": "apply"},
                {"q": "Why scan retrieved files for secrets?", "a": "Engineers commit keys; the index will happily retrieve them into other users' prompts.", "kind": "recall"},
                {"q": "What do you do if a secret reached a provider log?", "a": "Rotate, request deletion per the DPA, and fix the detector. Treat it as an incident, not as 'the model saw it once'.", "kind": "apply"},
            ],
            links=L,
            walk="""You remove `OPENAI_API_KEY` from the tool-worker env (it only needs the downstream billing key in a sidecar). A paste detector lands on the chat API. One week later it catches a GitHub token and opens a rotate ticket.""",
            measure="""Secret-scanner hits in prompts; keys present in model-visible env; time-to-rotate after a paste detect.""",
        ),
        "pii-in-traces": note(
            what="""**Redact before the log shipper; retention is a legal setting.** This item is the operational slogan for traces. Engineers turn on full-prompt tracing to debug, the shipper fans out to three vendors, and six months later legal asks why a chat about a medical bill is in a US analytics tool.

The sequence: decide purpose (debug vs audit), choose fields, redact at source, set TTL in the vendor, restrict who can replay. Audit logs can keep who/what/when without bodies. Debug traces keep bodies only briefly, if at all.""",
            why="""It is the sentence you put in the runbook so the next intern does not enable 'log everything'. Interviewers like it because it is concrete.""",
            how="""Implement a wrap around the SDK: the only object that may be shipped is already redacted. Unit-test that a fake NIN or email does not appear in the exported JSON. TTL is configured as code. A quarterly job lists traces older than the policy.

If a vendor cannot TTL, do not send bodies there. Retention you cannot set is not a setting.""",
            fails="""1. **Redact in the dashboard** but not the export.

2. **Infinite retention** because 'storage is cheap'.

3. **Everyone on the team can replay full traces.**

4. **Copying traces into Slack** to debug.""",
            line="PII in traces is a design choice: redact before the shipper, set retention as a legal TTL, and keep bodies out of default logs. If I cannot set TTL, I do not send the body.",
            kps=[
                "Redact before the shipper, not in a dashboard rule.",
                "Retention is a legal TTL, configured as code.",
                "Audit can be who/what/when without bodies.",
                "Replay access is a privileged role.",
                "If the vendor cannot TTL, do not send bodies.",
                "Do not paste traces into chat to debug.",
            ],
            qs=[
                {"q": "What does 'redact before the log shipper' prevent?", "a": "Vendors and downstream SIEMs ever storing the raw body. Dashboard filters do not un-send an event.", "kind": "recall"},
                {"q": "Why is retention a legal setting rather than a disk setting?", "a": "Purpose limitation and deletion rights define how long you may keep personal data. Cheap disks do not extend the lawful basis.", "kind": "apply"},
                {"q": "A vendor has no TTL for trace bodies. What do you do?", "a": "Do not send bodies. Metadata only, or pick a vendor you can configure.", "kind": "debug"},
                {"q": "Who should replay a full debug trace?", "a": "A break-glass role with audit, for a short window, not the whole engineering group.", "kind": "recall"},
                {"q": "How do you keep auditability without bodies?", "a": "Store actor, action, object ids, time, and hashes. Reconstruct from source systems if an investigation needs content.", "kind": "apply"},
            ],
            links=[OA_DATA, MEITY],
            walk="""You wrap the tracer and add a test that `patient@` cannot appear in the exported span. TTL is 7 days in code. Slack paste of a trace becomes a documented incident.""",
            measure="""Exported spans with email-like strings; traces older than TTL; number of people with replay.""",
        ),
        "zero-retention-vendor-options": note(
            what="""**Know what the provider stores and for how long.** Vendor options differ: consumer chat apps may train; API platforms offer zero-data-retention or limited abuse logs; regions differ; fine-tuning uploads are a separate store; embeddings APIs may log inputs. You read the current page and the DPA, you screenshot the console flags, and you pin the offering in the gateway.

'We use Vendor X' is not a privacy design. 'We use Vendor X API, ZDR on, region eu, abuse log 30 days, no training, no eval sharing' is a design.""",
            why="""Questionnaires and interviews both ask this. The wrong answer is to recite a blog post from last year. Terms change; you re-read.""",
            how="""Per provider: training default, ZDR flag, abuse window, region list, subprocessors, fine-tune data handling, whether playground is in scope. Review quarterly or on contract change.

When you add a fallback model, you add a row. A cheap fallback that trains is not an acceptable fallback for a ZDR route.""",
            fails="""1. **Assuming last year's terms.**

2. **ZDR in the deck, off in the console.**

3. **Fine-tune uploads** forgotten as a store.

4. **Mixing playground and API** in the story.""",
            line="I know what each vendor stores and for how long — ZDR, abuse windows, training, region — and I pin those flags in the gateway. A fallback that breaks the terms is not a fallback.",
            kps=[
                "Read current terms and console flags, not a memory of a blog.",
                "ZDR, training, abuse window, region, fine-tunes.",
                "Playground and API are different offerings.",
                "Fallbacks inherit the same bar or they are disabled.",
                "Review on a cadence; terms change.",
                "'We use Vendor X' is not a design.",
            ],
            qs=[
                {"q": "What five facts do you record per model vendor?", "a": "Training use, retention or ZDR, abuse-log window, region, and how fine-tunes and embeddings are stored. Plus whether the key you use is on those terms.", "kind": "recall"},
                {"q": "The deck says zero retention but the console flag is off. What is the incident?", "a": "You are not on the terms you sold. Turn the flag on or stop sending regulated traffic, and treat past traffic per legal advice.", "kind": "debug"},
                {"q": "Why is a cheap fallback dangerous on a ZDR route?", "a": "It may train or retain. If it cannot match terms, fail closed or degrade without that model.", "kind": "apply"},
                {"q": "Are fine-tune uploads covered by request ZDR?", "a": "Usually not. They are a separate dataset with their own retention. Put them on the store table.", "kind": "recall"},
                {"q": "How often do you re-read vendor terms?", "a": "On a stated cadence and on every contract or offering change. Pin a date next to the row.", "kind": "apply"},
            ],
            links=L,
            walk="""You add a quarterly calendar item and a gateway config test that ZDR is on for the health route. A new fallback is blocked in CI because its row says training-unknown.""",
            measure="""Routes whose vendor row is stale; console flags matching the deck; fallbacks with weaker terms.""",
        ),
    }
}
