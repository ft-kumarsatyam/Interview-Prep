from helper import note
from links import OWASP, OA_FN, ANTH_TOOLS, OA_SAFE

L = [OA_FN, ANTH_TOOLS]

NOTES = {
    "m8-4": {
        "least-privilege-for-agents": note(
            what="""Give an agent only the **tools, data, and credentials required for the current task**, for the shortest time. Narrow tools (`get_invoice(id)` not `run_sql`); scoped, short-lived credentials; act *as the user* so the agent cannot exceed the user's rights; per-task tool sets; platform-enforced row and tenant filters; egress allow-lists; no metadata-endpoint access.

If the model were fully malicious for one turn, the worst case should be acceptable. That question is the design test. Convenience ('just give it the admin token') is how deputies are born.""",
            why="""This is the most effective single defence for agentic systems. Interviewers will ask what the agent can do if it is hostile for one call. On the job, a shared service account is a recurring finding in every review.""",
            how="""Example support-ticket agent: tools are ticket read, comment, and status for the current user's queue; per-user OAuth; no bulk delete, no admin API, no arbitrary HTTP or SQL; tenant filter in the data layer; ten-minute token. The model cannot invent a wider role.

Replace a shared CRM admin key with delegated tokens. MCP servers get a jailed workspace, not `$HOME`. When the task changes from 'summarise' to 'refund', you swap the tool set; you do not union them for the whole session.""",
            fails="""1. **Shared admin tokens** for simplicity.

2. **Wide parameters** — arbitrary URL, shell, SQL.

3. **Long-lived env credentials** left in the worker.

4. **Union of all tools** on every route because the framework defaulted that way.""",
            line="Least privilege means the agent only gets the tools and tokens for this task, acting as the user, for a short time. I ask what a malicious turn could do, and I refuse shared admin keys.",
            kps=[
                "Narrow tools and scoped, short-lived credentials.",
                "Act with the user's identity, not a super-user.",
                "The platform enforces data scope, not the model.",
                "Ask the one-turn malicious worst case.",
                "Per-task tool sets beat a global toolbox.",
                "MCP and plugins inherit this rule too.",
            ],
            qs=[
                {"q": "What does least privilege mean concretely for an agent that manages support tickets?", "a": "Tools limited to ticket read, comment, and status for the current user's queue; per-user scoped token; no bulk delete, no admin API, no arbitrary HTTP or SQL; tenant filter server-side; short token lifetime. That limits blast radius when the model is fooled.", "kind": "recall"},
                {"q": "A team gave an agent one shared service account with read/write on all customer records. Fix it.", "a": "Replace with per-request delegated credentials tied to the end user, restrict the toolset, add row-level security in the data layer, and log actions with user identity. That avoids the confused deputy.", "kind": "debug"},
                {"q": "Why is `run_sql(query)` a least-privilege smell?", "a": "The parameter is the entire language. Replace with typed tools that hit views you chose. The model should fill ids, not invent queries.", "kind": "apply"},
                {"q": "How do you apply least privilege across two tasks in one product?", "a": "Different tool registries per route or step. Summarise does not see refund. Refund does not see browse. Union is how privilege creeps.", "kind": "apply"},
                {"q": "What worst-case question do you ask in a design review?", "a": "If the model is fully malicious for one turn, what can this credential and tool set do? If the answer is 'everything', you are not done.", "kind": "recall"},
            ],
            links=L,
            walk="""A prototype uses one AWS admin key in the agent env. You split: the agent gets a role that can write to one prefix; deploy stays in CI with a human. The PR description is the worst-case sentence.""",
            measure="""Tools running as shared admin (target zero); median token lifetime; routes whose tool count exceeds the task minimum.""",
        ),
        "read-only-vs-consequential-actions": note(
            what="""Classify every tool by **consequence**. Read-only / reversible: search, fetch own record, summarise. Write, reversible: create a draft, add a label. Consequential / irreversible: send email, charge a card, delete, deploy, change IAM, post publicly, run a shell.

Match controls to blast radius. Reads can run more freely but still leak and can exfiltrate (a URL with data in the query). Reversible writes need logging and undo. Consequential actions need approval, limits, or both. Prefer **propose then commit**: the agent creates a draft; a deterministic step or a human applies it. Split read and write scopes so a read task cannot invoke a write.""",
            why="""Interviewers will hand you a tool list and ask you to classify. On the job this table is how you decide where to put a confirm screen without confirming every search.""",
            how="""Table: `search_docs` (read, ACL); `create_draft_email` (write reversible, log); `send_email` (consequential, approve + allow-list); `delete_customer` (consequential, approve + dual control). Idempotency keys on writes.

A 'read-only' `fetch_url` is still dangerous: SSRF and exfil. Treat network as consequential unless the host allow-list is tight and the response cannot leave.""",
            fails="""1. **One policy for all tools.**

2. **Calling fetch read-only** while it can hit metadata IPs.

3. **No undo** on 'reversible' writes that are not actually reversible.

4. **Propose-then-commit that auto-commits** after 50 ms.""",
            line="I classify tools as read, reversible write, or consequential, and I match controls to blast radius. I prefer propose-then-commit, I split read and write scopes, and I treat fetch as consequential unless the network is fenced.",
            kps=[
                "Classify every tool by consequence and reversibility.",
                "Match approval and limits to blast radius.",
                "Propose then commit for irreversible work.",
                "Split read and write tool scopes.",
                "Read-only fetch can still exfiltrate or SSRF.",
                "Make writes idempotent with request ids.",
            ],
            qs=[
                {"q": "Classify: search_docs, create_draft_email, send_email, delete_customer. State the control for each.", "a": "search_docs: read, ACL. create_draft_email: reversible write, log and undo. send_email: consequential, approval and recipient allow-list. delete_customer: consequential, approval and a second check or cooling-off.", "kind": "apply"},
                {"q": "Why can a 'read-only' fetch_url tool still be dangerous?", "a": "It can reach internal endpoints (SSRF) and it can send private data in the URL. Allow-list hosts, block link-local, and treat it as egress.", "kind": "recall"},
                {"q": "What does propose-then-commit provide that a prompt warning does not?", "a": "A durable object the user or a policy engine can inspect and apply. The model never holds the commit tool in the same breath as the untrusted read, if you design it that way.", "kind": "recall"},
                {"q": "Users approve 99% of send prompts in under a second. What do you change?", "a": "The screen is not being read. Show arguments, add a delay or typed confirm for high risk, or move more sends to drafts. Approval theatre is not a control.", "kind": "debug"},
                {"q": "How do you stop a summarise route from calling delete?", "a": "Do not put delete in that route's schema. Registry separation is stronger than 'please only read'.", "kind": "apply"},
            ],
            links=L,
            walk="""You print the tool table in the design doc. Legal circles send and delete. You implement drafts for send and a 24-hour undo for labels. Fetch moves behind a proxy allow-list.""",
            measure="""Share of consequential calls that went through propose-then-commit; auto-approved fraction; fetch calls off the allow-list (should be zero).""",
        ),
        "validating-tool-use-outside-the-llm": note(
            what="""The model **proposes**; your code **disposes**. Validate **selection, arguments, permissions, and outputs** independently of the LLM. Schema (types, enums, ranges) is necessary and not sufficient: a well-typed `delete_file("/etc/passwd")` or `refund(other_customer)` still fails policy. The executor loads the caller's identity, checks authZ, allow-lists verbs and destinations, applies business limits, then runs. After the call, validate the tool result before it re-enters the prompt (size, type, no secrets).

JSON schema validation is hygiene. Policy is the security control.""",
            why="""Interviewers will ask where the ownership check lives. 'In the tool description' is wrong. On the job this is the difference between a demo agent and one you can insure.""",
            how="""Before `delete_file(path)`: schema says string; policy says path is under the user's workspace prefix; caller owns the file; path is normalised (no `..`); rate limit; audit log. After: result is a status enum, not a 2 MB dump.

Do not 'fix' invalid args by guessing. Reject. Do not let the model supply `user_id` for authZ. Structured outputs help you parse; they do not authorise.""",
            fails="""1. **Schema only.** Types are not rights.

2. **Repairing args.** You execute a guess.

3. **AuthZ on a model-supplied role.**

4. **Passing raw tool dumps back** as trusted context.""",
            line="I validate tool selection, arguments, permissions, and outputs in code. Schema is not enough. The executor uses the caller's identity and business limits, rejects bad payloads, and sanitises results before they re-enter the prompt.",
            kps=[
                "Model proposes; code disposes.",
                "Validate selection, args, permissions, and outputs.",
                "JSON schema is necessary and not sufficient.",
                "Authorise with the caller, not model-supplied ids.",
                "Reject invalid args; do not repair them.",
                "Sanitise tool results before the next turn.",
            ],
            qs=[
                {"q": "List what an executor should verify before running a model-proposed delete_file(path) call.", "a": "Schema, path normalisation, prefix allow-list, caller ownership, rate limits, and an audit record. Then run. Do not trust a well-typed path.", "kind": "apply"},
                {"q": "Why isn't JSON schema validation alone enough for security?", "a": "A payload can be well-typed and still name another customer's id, a disallowed host, or an unbounded amount. Policy and authZ are separate checks.", "kind": "recall"},
                {"q": "The model sets `acting_as: admin` in the tool JSON. What happens?", "a": "The executor ignores it. Role comes from the session. Log the attempt. Never promote a field the model wrote into a privilege.", "kind": "debug"},
                {"q": "What do you validate on the way back from a tool?", "a": "Size, type, presence of secrets or HTML, and whether the result should be summarised before it re-enters context. Tool output is untrusted text.", "kind": "recall"},
                {"q": "How do structured outputs change this picture?", "a": "They make parse failures rare. They do not authorise. Keep the policy engine.", "kind": "apply"},
            ],
            links=[OA_FN, OA_SAFE],
            walk="""A refund JSON is valid and names another tenant's order. Schema passes; policy fails. You add a unit test with that payload and you never 'helpfully' swap in the current user's latest order.""",
            measure="""Tool-call reject reasons (schema vs authZ vs limit); count of repaired-arg executions (target zero); max tool-result bytes accepted.""",
        ),
        "human-approval-for-irreversible-actions": note(
            what="""Add a **human approval** step for sensitive or irreversible operations: send, pay, delete, deploy, change permissions, post publicly. The screen must show the **executor's arguments** — recipient, amount, path — not the model's narrative. Wait. Do not auto-send on a timer unless the product is explicitly a queued job with its own policy.

Approval is a product feature: latency, UX, skip-through risk, and an audit trail (who approved what, when). If users click through in one second, you do not have approval; you have a banner.""",
            why="""This is how you keep agents useful without giving them the nuclear codes. Interviewers will ask what the modal shows. If you say 'a summary', you fail. On the job, skip-through is the failure mode to design against.""",
            how="""Example. Send-mail: modal lists to, cc, subject, body (the bytes), and attachments. Amount fields use the formatted currency from the executor, not a prose sentence. High-risk actions need a typed phrase or a second person. Drafts sit until someone who owns the risk clicks.

Batch jobs that send 10k mails are not 'the model approved itself'. They use a separate campaign flow with a human-owned list.""",
            fails="""1. **Showing the model's explanation** instead of args.

2. **99% approve in one second** and calling it oversight.

3. **Auto-send after 30 s** 'if no one objects'.

4. **Approving a class of actions forever** in a setting users forget.""",
            line="Human approval is a product feature: show the draft action the executor will run, wait, and record who clicked. I never auto-send, and I treat one-second approve rates as evidence the control is theatre.",
            kps=[
                "Approve irreversible actions; do not auto-send.",
                "Render executor arguments, not the model's story.",
                "Skip-through rates tell you if the control is real.",
                "High risk may need typed confirm or two people.",
                "Keep an audit of who approved what and when.",
                "Batch sends are a separate, human-owned flow.",
            ],
            qs=[
                {"q": "Why should the approval screen render the tool arguments rather than the model's explanation?", "a": "The explanation can hide or soften the real recipient, amount, or path. The executor's payload is what will happen. Show that.", "kind": "recall"},
                {"q": "Users approve 99.5% of prompts within one second. What does that suggest and what do you do?", "a": "They are not reading. Slow the path, require a typed confirm for high risk, move to drafts, or reduce how often you ask so the remaining asks matter.", "kind": "debug"},
                {"q": "When is approval the wrong control?", "a": "For high-volume low-risk reads, or when the user cannot judge the args (raw hashes). Use allow-lists and limits instead of training people to click Yes.", "kind": "apply"},
                {"q": "What belongs in the audit record of an approval?", "a": "Actor, timestamp, action type, the arguments shown, the arguments executed, and the session or trace id. Not necessarily the full chat body.", "kind": "recall"},
                {"q": "How do you implement approval without blocking the HTTP request for ten minutes?", "a": "Create a pending action object, return it to the UI, resume the pipeline on webhook or poll after click. Do not hold a model context open while someone is at lunch.", "kind": "apply"},
            ],
            links=[OA_SAFE, ANTH_TOOLS],
            walk="""The first send modal said 'Email the customer a helpful summary'. You replace it with the MIME fields. Skip-through drops; one user catches a BCC to an external domain. That catch is the feature working.""",
            measure="""Median time-to-approve; skip-through rate; discrepancies between shown and executed args (must be zero); pending-action lifetime.""",
        ),
        "step-runtime-cost-limits": note(
            what="""Limit **steps, runtime, cost, and tool usage** so a fooled or looping agent cannot run forever. Caps: max model calls, max tool calls, wall-clock timeout, token and dollar budget, per-tool rate limits, max fan-out. On hit: stop, return partial work, alert. Do not retry unbounded.

Limits are security and reliability. An injected page that says 'fetch the next URL' 5,000 times is denial of wallet and a scrape. A research agent without a budget is a blank cheque.""",
            why="""Interviewers ask what stops a runaway loop. 'The model will notice' is not an answer. On the job, the first weekend an agent is live is when you learn whether the cap exists.""",
            how="""Example research agent: 20 model calls, 40 tool calls, 3 minutes, $0.50, 5 fetches per host, no recursive fetch of the same URL. The harness enforces this; the prompt can mention it but cannot raise it.

When a run hits a cap, persist the trace, show the user a 'stopped: budget' state, and do not silently continue in a background worker with a higher cap unless that is a billed, approved job.""",
            fails="""1. **Limits only in the prompt.**

2. **Catching errors by retrying** into the same loop.

3. **A global budget** one batch job can exhaust for everyone.

4. **No user-visible stop reason.** They retry and double spend.""",
            line="I cap agent steps, runtime, cost, and tool fan-out in the harness. When a limit hits I stop, show why, and alert. Those caps are security controls against loops and denial of wallet, not just cost hygiene.",
            kps=[
                "Cap steps, wall time, tokens, dollars, and per-tool rates.",
                "Enforce in the harness, not in the prompt.",
                "On hit: stop, persist, tell the user, alert.",
                "Limits stop injected loops and wallet abuse.",
                "Per-feature budgets beat one global pool.",
                "Retries must share the same remaining budget.",
            ],
            qs=[
                {"q": "Which limits would you put on an autonomous research agent?", "a": "Max model and tool calls, wall-clock, dollar budget, per-host fetch cap, and a duplicate-URL block. Enforce in the harness and surface a stopped-for-budget state.", "kind": "recall"},
                {"q": "An injected page makes the agent fetch 5,000 URLs. Which controls would have helped?", "a": "A fetch count cap, per-host rate limit, duplicate URL block, dollar budget, and no recursive fetch tool. Prompt text would not have helped.", "kind": "apply"},
                {"q": "A run hits its max-step limit with the task unfinished. The best behaviour is?", "a": "Stop, return partial results and the reason, keep the trace, do not silently raise the cap. The user can start a billed continuation.", "kind": "debug"},
                {"q": "Why must retries share the remaining budget?", "a": "Otherwise a failing provider turns one request into N full runs and the cap is fiction.", "kind": "recall"},
                {"q": "How do you stop one batch job from starving interactive chat?", "a": "Separate quotas and queues per class of traffic. Caps are per feature, not one shared wallet.", "kind": "apply"},
            ],
            links=L,
            walk="""Staging: a payload loops browse. Cost hits $0.50 and dies at call 20. You add the same cap to prod and a dashboard panel for 'stopped: budget' rate.""",
            measure="""Runs stopped by each cap; dollars per successful task; p99 tool-call count; shared-wallet starvation events.""",
        ),
        "sandboxing-generated-code": note(
            what="""Treat generated **SQL, shell, URLs, and code** as untrusted programs. Run them in a **sandbox**: no production credentials, no tenant crossover, tight CPU/memory/time, no raw host network (or an allow-listed proxy), a fresh filesystem, and an identity that is not your app's. Multi-tenant analysis tools need a new jail per session.

The model is a source of code, not an operator. If you cannot say what the sandbox blocks, you do not have one — you have `eval` on the app server.""",
            why="""Interviewers will offer a 'data analysis copilot' and wait for you to mention isolation. On the job, this is how you avoid a generated `os.system` reading `os.environ`.""",
            how="""Example. Users upload CSVs; the model writes pandas. You run in a container or Wasm jail: only that CSV mounted, no env secrets, 30 s, 512 MB, no egress except a result blob store. SQL goes to a read-only role on a clone, statement allow-list, row cap.

Network in the sandbox is the difference between 'plot this' and 'curl the metadata service'. Default deny.""",
            fails="""1. **Running on the API host** with the app's env.

2. **One long-lived notebook kernel** for all tenants.

3. **Allowing pip install from the internet** in the jail.

4. **Passing the same DB writer role** the app uses.""",
            line="Generated code, SQL, commands, and URLs are untrusted. I run them in a sandbox with no production secrets, no cross-tenant disk, tight limits, and default-deny network. If it is `eval` on the app host, it is not shipped.",
            kps=[
                "Generated programs are untrusted.",
                "Sandbox: no prod secrets, no tenant crossover, tight limits.",
                "Default-deny network; allow-list if needed.",
                "Fresh filesystem and identity per session.",
                "SQL gets a read-only role and a statement allow-list.",
                "A notebook on the app host is not a sandbox.",
            ],
            qs=[
                {"q": "Describe a safe execution environment for an LLM data-analysis tool used by many tenants.", "a": "Per-session jail, only that tenant's file mounted, no env secrets, CPU/memory/time caps, no egress or an allow-listed result store, destroy after the run. Never a shared kernel.", "kind": "apply"},
                {"q": "What are the risks of giving generated code network access?", "a": "Exfil of the mounted data, SSRF to cloud metadata, and use of the jail as a proxy. Default deny; if plots need a library, bake it in the image.", "kind": "recall"},
                {"q": "An agent with a shell tool runs in your app container with production environment variables. The best first change?", "a": "Move execution out of that container into a jail with a stripped env. Rotate anything the model may have seen. Then decide if a shell should exist at all.", "kind": "debug"},
                {"q": "How do you sandbox generated SQL differently from Python?", "a": "Do not give a general engine. Use a read-only role, allow-listed statements, row and time limits, and a parser. Python still needs a jail; SQL needs a language fence.", "kind": "apply"},
                {"q": "Why bake dependencies into the image instead of allowing install?", "a": "Install is egress plus supply chain. The jail should be immutable for the run.", "kind": "recall"},
            ],
            links=[OA_SAFE, OWASP],
            walk="""A demo ran generated Python in Flask. You rip it out, add a gVisor or Wasm worker, and write a test that `os.environ` is empty and that a curl to the metadata IP fails.""",
            measure="""Executions that saw prod env vars (zero); sandbox escape tests; p95 jail time; cross-tenant file-access tests.""",
        ),
        "tool-allow-lists-in-code": note(
            what="""**Recipients, URLs, and verbs are decided by the server**, not by the model's prose and not by a 'please only call these' sentence. The executor holds an allow-list: hosts, HTTP methods, email domains, SQL verbs, IAM actions. Unknown destinations fail. The tool schema should not even advertise a generic `http_request` if you can offer `get_ticket(id)` instead.

Allow-lists are code, reviewed, and tested. They are the difference between 'we have tools' and 'we have a programmable proxy'.""",
            why="""This is the interview sentence that shows you have written an executor. On the job it is the PR security actually approves.""",
            how="""Example. Instead of `fetch(url)`, you expose `get_kb_article(slug)` that only hits your CMS. Mail `to` must be in the customer's domain or a support address book. HTTP verbs on an internal API are GET/POST to named routes, not a free client.

When product needs a new host, that is a reviewed config change, not a prompt edit. Tests send a `https://attacker.example` and expect deny.""",
            fails="""1. **Generic HTTP tool** 'for flexibility'.

2. **Allow-list in the prompt** only.

3. **User-supplied allow-list** the model can rewrite.

4. **Wildcard `*.amazonaws.com`** that includes metadata-adjacent hosts you did not intend.""",
            line="Recipients, URLs, and verbs are decided in server code. I expose narrow tools, I deny unknown destinations, and I treat a new host as a reviewed change, not a prompt tweak.",
            kps=[
                "Allow-lists live in the executor, not the prompt.",
                "Prefer typed tools over generic HTTP.",
                "Unknown destinations fail closed.",
                "A new host is a reviewed config change.",
                "Test deny of attacker URLs in CI.",
                "Wildcards can re-open the proxy.",
            ],
            qs=[
                {"q": "Where should allowed recipients and URLs be decided?", "a": "In server code on the executor. The model can propose; the list is not in its control.", "kind": "recall"},
                {"q": "Why prefer get_kb_article(slug) over fetch(url)?", "a": "The destination and verb are fixed. The model cannot turn a knowledge read into a general HTTP client.", "kind": "apply"},
                {"q": "A prompt says 'only call listed tools' but http_request remains in the schema. What happens?", "a": "The model can still call it. Omit the tool. Schema presence is permission unless the executor also denies.", "kind": "debug"},
                {"q": "How do you add a new outbound host safely?", "a": "Config change, review, tests, and a reason. Do not ask the model to 'be careful with this new API'.", "kind": "apply"},
                {"q": "What is the risk of a broad wildcard allow-list?", "a": "You re-create a proxy. Attackers will find a host in the wildcard that echoes or reaches internals.", "kind": "recall"},
            ],
            links=L,
            walk="""You delete `http_request` from the agent and add three named tools. A red-team URL test goes red on main until the deny assertion lands. That is the feature.""",
            measure="""Generic HTTP tools remaining; deny-test coverage; unreviewed host additions in a week.""",
        ),
        "human-approval-as-a-product-feature": note(
            what="""**Show the draft action and wait; do not auto-send.** This is the product wording of approval: a first-class pending state, a UI that is readable on a phone, a timeout that expires to 'not sent' rather than 'sent', and analytics on skip-through. It is not a toast that disappears.

Engineering owns the pending object and the exact args. Design owns the screen. Support owns what happens when someone is offline. If any of those are missing, you have a library flag, not a feature.""",
            why="""Security reviews fail when approval is a boolean in a framework. Interviewers ask how a user on mobile sees a refund. If you cannot describe the screen, you have not designed the control.""",
            how="""PendingAction: id, verb, args, created_at, expires_at, state. UI: readable fields, diffs for edits, danger colour for irreversible. Expire → cancelled. Notify the owner. Resume the pipeline only on explicit confirm.

Do not hide this behind 'the agent will just send if you do not reply' unless that is a separately consented digest with a fixed template.""",
            fails="""1. **Auto-send on timeout.**

2. **Desktop-only modal** for an on-call mobile audience.

3. **No pending object** — approval is a chat message the model can spoof.

4. **Feature flag default on** without UX.""",
            line="Approval is a product feature: a pending draft, a readable screen, wait, expire to not-sent, and metrics on skip-through. I do not auto-send, and I do not implement this as a disappearing toast.",
            kps=[
                "Show the draft and wait; expire to not-sent.",
                "Pending actions are real objects, not chat vapour.",
                "Design the mobile screen, not only the API flag.",
                "Skip-through analytics tell you if people read it.",
                "Auto-send is a different, consented product.",
                "The model cannot spoof an approval record.",
            ],
            qs=[
                {"q": "What happens when an approval times out?", "a": "The action stays unsent or unapplied. Notify the owner. Do not treat silence as consent.", "kind": "recall"},
                {"q": "Why must approval be an object rather than a chat question?", "a": "Chat can be injected or summarised away. A signed pending record with frozen args is what the executor resumes on.", "kind": "debug"},
                {"q": "How would you ship approval for on-call users?", "a": "Mobile-readable fields, push notification, expire to cancelled, and a queue they can process after the incident. Do not require a desktop modal during a page.", "kind": "apply"},
                {"q": "When is auto-send acceptable?", "a": "When the user consented to a fixed template and destination class, with an audit and an easy opt-out — not when the model invented the recipient.", "kind": "apply"},
                {"q": "What product metric tells you approval is theatre?", "a": "Very high approve rate with sub-second click time. Redesign the screen or the frequency.", "kind": "recall"},
            ],
            links=[OA_SAFE, OWASP],
            walk="""You replace 'OK to send?' in the chat with a PendingSend card in the app. Silence cancels. Support uses the same card. The model can no longer print a fake 'approved' token.""",
            measure="""Expire-to-cancel count; approve latency distribution; spoofed-approval attempts in logs; mobile completion rate.""",
        ),
    }
}
