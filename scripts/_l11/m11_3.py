from assemble import entry

NOTES = {
 "m11-3": {
  "cloud-identity-instead-of-api-keys": entry(
   what="""**Cloud identity instead of API keys** means the service that calls the model is a role, a service account, or a managed identity. It receives **short-lived credentials** from the platform (instance profile, workload identity federation, managed identity) and those credentials are allowed to invoke named models. There is no long-lived token in an environment variable that can be copied into Slack.

API keys are how public model APIs authenticate. They are secrets you rotate, store, and leak. Cloud identity is how your compute already talks to S3, GCS or Blob Storage. Applying that pattern to model invoke is the whole point of a managed platform for many security teams.

Humans still have identities for the console. Production traffic should never use those. A notebook signed in as you is not the integration.""",
   why="""On the job, a leaked Bedrock API-key-style secret (or a static access key someone created "to make the SDK work") is an un-scoped, long-lived credential that can spend and exfiltrate. A role bound to a pod can be revoked, is attributed in CloudTrail / audit logs, and dies with the pod's session.

In interviews this is a binary signal. If you put `OPENAI_API_KEY` in the Bedrock design, you missed the platform. Say: task role, least privilege, no long-lived key, human identities for break-glass only.

Enterprises will also ask about **workload identity federation** for GKE/EKS/AKS or GitHub Actions so CI can invoke a model in staging without a stored key.""",
   how="""Pattern:

1. Create a role `support-worker` with `bedrock:InvokeModel` (or the Vertex/Azure equivalent) on specific model ARNs.
2. Bind it to the Kubernetes service account / the Cloud Run service / the App Service.
3. The SDK uses the default credential chain. No key in env.
4. CI uses OIDC federation to assume a narrower staging role.

Example: a contractor checked in `.env` with an access key that had `bedrock:*`. You delete the key, rotate anything it touched, attach a task role, and add a lint rule that fails the build if `AWS_SECRET_ACCESS_KEY` appears in app config. The next call still works; the leak path does not.""",
   failures="""1. **Static keys 'just for local'.** They migrate to prod via a copied compose file.

2. **User credentials in a daemon.** When the engineer leaves, production breaks or keeps running as a ghost.

3. **One role for the whole platform.** You recreated a god key with extra steps.

4. **Forgetting the audit story.** Identity without logs is only half the win.""",
   line="""Production invokes models as a cloud role with short-lived credentials, the same way it reads a bucket. I do not put long-lived keys in env for a managed platform. Humans use the console; workloads use identity.""",
   key_points=[
    "Prefer roles, service accounts and managed identities over long-lived API keys.",
    "Workloads receive short-lived credentials from the platform; nothing to paste.",
    "Human console identities are not the production caller.",
    "Use OIDC/workload identity federation for CI and pods.",
    "A static access key on a platform is a self-inflicted API key.",
    "Identity without invocation logs wastes the attribution win.",
   ],
   questions=[
    {"q": "Why is a role with short-lived credentials better than a static key?", "a": "Nothing long-lived to leak, automatic rotation, and each call is attributed to a workload. Speed and model outputs do not change.", "kind": "recall"},
    {"q": "A developer wants an access key so the SDK 'just works' locally. What do you offer instead?", "a": "Local named profiles or a development role they assume, plus a path that uses the same default-credential code as prod. Do not mint a static key for the app.", "kind": "apply"},
    {"q": "You find AWS keys in a container image for Bedrock. What do you do first?", "a": "Disable the keys, rotate, check audit logs for use, then attach a task role and remove the env vars. Treat it as a credential incident.", "kind": "debug"},
    {"q": "How does CI invoke a staging model without storing a key?", "a": "OIDC federation from GitHub/GitLab to a short-lived role that can only invoke the staging model ids in the staging account.", "kind": "apply"},
    {"q": "What still uses API keys after you move to a platform?", "a": "Any leftover public-API prototypes, third-party evals, or hosted routers. Those stay out of the production service and off regulated data.", "kind": "recall"},
   ],
   links=[
    {"title": "IAM roles", "url": "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html"},
    {"title": "Workload identity federation", "url": "https://cloud.google.com/iam/docs/workload-identity-federation"},
    {"title": "Azure managed identities", "url": "https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview"},
   ],
  ),
  "least-privilege-for-model-access": entry(
   what="""**Least privilege for model access** means an application or team may invoke only the **models, regions and actions** it needs. `bedrock:InvokeModel` on `*` in every region is a god permission. Scope the resource ARN or name to the pinned ids, scope the region, and split **invoke** from **admin** (buy provisioned throughput, change knowledge bases, read logs).

Platforms differ in how fine the resource names go. Sometimes you can name the model. Sometimes you can only name the project. Go as tight as the IAM language allows, then add application-level allow-lists so a config typo cannot call an unapproved expensive id.

Least privilege is also about **who can change the allow-list**. The worker role invokes. A separate change-management role updates the pin.""",
   why="""On the job, a wildcard is how a compromised worker or a prompt-injected agent spends $20k on the largest catalog model, or calls a model that is not on the approved list. Tight scope turns that into an access-denied you can alert on.

In interviews, "we use IAM" is incomplete. "The task role can invoke two model ARNs in one region and cannot manage the catalog" is complete. They may ask how you stop a developer from pointing config at a preview model. Application allow-list plus IAM is the answer.

Cost and compliance both ride this control. Unapproved models are often unapproved processors.""",
   how="""Example policy shape (idea, not a paste-ready document):

- Allow `InvokeModel` / `InvokeModelWithResponseStream` on `arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-...-v1:0` (and the inference-profile ARN if you use one).
- Deny `*`.
- Separate role for `CreateProvisionedModelThroughput` and KB admin.
- App config: `ALLOWED_MODEL_IDS` checked before the call; mismatch is a 500 to yourself, not a spend.

A bug that sets `MODEL_ID` to a frontier id then fails closed at both layers.

Review the policy when you add a candidate pin for deprecation — grant the candidate in staging first, then prod.""",
   failures="""1. **`*` because the ARN was fiddly.** You traded ten minutes of docs for an open bill.

2. **Same role for invoke and admin.** A worker can create knowledge bases and read other teams' traces.

3. **IAM tight, app loose.** The role allows two models; the gateway will call anything the role allows for any tenant.

4. **Forgotten inference profiles / deployments.** The policy names the foundation model; the call uses a profile ARN and always 403s — then someone widens to `*`.""",
   line="""The worker can invoke the pinned model ids in one region and nothing else. Admin actions live on another role. I add an application allow-list so a typo cannot spend. Wildcards are a bug.""",
   key_points=[
    "Scope invoke to named models, regions and actions — no `*`.",
    "Split invoke roles from catalog/admin/log-reader roles.",
    "Add an application allow-list on top of IAM.",
    "Unapproved models are often unapproved processors, not just expensive.",
    "Grant candidate pins in staging before production.",
    "Match the ARN shape you actually call (profiles, deployments).",
   ],
   questions=[
    {"q": "What does least privilege look like for model access?", "a": "A worker identity that can invoke only named model ids (or deployments) in named regions, with admin and log access on separate roles, plus an application allow-list.", "kind": "recall"},
    {"q": "An app role can invoke any model. What is the main risk?", "a": "A bug, typo or compromise can call costly or unapproved models and send data to an unapproved processor. Scope the ids.", "kind": "debug"},
    {"q": "IAM is tight but the gateway uses one shared role for all teams. What is left?", "a": "Application-level isolation: virtual keys, per-tenant allow-lists and budgets. IAM alone cannot tell two products apart if they share the role.", "kind": "apply"},
    {"q": "Why split invoke from provisioned-throughput admin?", "a": "So a compromised worker cannot buy capacity or change shared infrastructure. Capacity changes should be a reviewed action.", "kind": "recall"},
    {"q": "Calls 403 after you pinned an inference profile. What did the policy miss?", "a": "The profile ARN (or Azure deployment scope) differs from the foundation-model ARN. Grant the resource you actually invoke, without widening to `*`.", "kind": "debug"},
   ],
   links=[
    {"title": "Amazon Bedrock identity-based policy examples", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html"},
    {"title": "Azure RBAC for Azure OpenAI", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/role-based-access-control"},
   ],
  ),
  "auditing-who-invoked-what": entry(
   what="""**Auditing who invoked what** means every model call can be attributed after the fact: **which identity**, **which model**, **when**, **from where**, and often **request id**. On a managed platform this is CloudTrail, Cloud Audit Logs, or Azure Monitor diagnostic settings — plus your own application traces. The platform trail answers "who called". Your traces answer "which user ticket and prompt version". You need both.

Regulated environments care because a model call is processing of personal or market-sensitive data. "The API key we share" cannot answer an auditor. A role name plus a request id can.

Decide what you **must not** put in the audit trail (raw prompts) versus what you must (identity, model, time). Those are different stores with different retention.""",
   why="""On the job, the first incident that needs this is not a hack — it is "which service spent $8k last night" or "did the batch job run against the retired model". Without invocation audit you are guessing from application logs that someone forgot to ship.

In interviews, say what the platform log gives you and what you add. Mention immutability and who can read the trail (not the whole company). Mention that playground calls under a human identity show up differently from worker calls — another reason playgrounds are not production.

This is also how you detect wildcard abuse: a sudden spike of `InvokeModel` on a model id you never pinned.""",
   how="""Turn on the platform's data-plane logs for invoke. Export to a write-once store in-region. Alert on:

- Model ids outside the allow-list.
- Identities that should never invoke (users, CI roles) doing so in prod.
- Volume spikes.

Join with app traces on request id when you need the ticket number.

Example: finance sees spend. Audit logs show `role/debug-toolbox` invoked a large model 40k times from a laptop. That role was a leftover. You disable it, add an alert, and the next leftover dies in minutes not days.""",
   failures="""1. **Control-plane only.** You log who changed IAM, not who invoked.

2. **Prompts in the same immutable bucket as audit.** You created a second, wider copy of regulated text.

3. **Everyone can read CloudTrail.** The audit store becomes a browsing toy.

4. **No request id in app logs.** You cannot join "who" to "which ticket".""",
   line="""I want an immutable, in-region trail of which identity invoked which model when, plus app traces that join on request id. Platform logs answer who called; my traces answer which ticket. Shared keys cannot do this.""",
   key_points=[
    "Audit: identity, model, time, source, request id — not necessarily the prompt.",
    "Use the cloud's data-plane logs plus your traces; you need both.",
    "Keep the trail immutable, in-region, and tightly readable.",
    "Alert on unapproved model ids and unexpected identities.",
    "Playground/human calls must not be how production runs.",
    "Shared API keys cannot satisfy an invocation audit.",
   ],
   questions=[
    {"q": "What should an invocation audit record, and what might it omit?", "a": "Record identity, model id, time, region, request id and result class. Omit or redacted-store raw prompts and completions unless policy explicitly requires them in that log.", "kind": "recall"},
    {"q": "Spend spiked but app traces look normal. Where else do you look?", "a": "Platform audit logs for other identities (laptops, leftover roles, notebooks) invoking models outside the app. The app trail is not the whole estate.", "kind": "debug"},
    {"q": "Why are shared API keys bad for audit?", "a": "Every caller looks the same. You cannot attribute spend, revoke one team, or answer who processed a record.", "kind": "recall"},
    {"q": "How do you join a CloudTrail/audit event to a support ticket?", "a": "Propagate the platform request id into your traces and ticket metadata. Join on that id in the investigation store.", "kind": "apply"},
    {"q": "Who should be allowed to read the invoke audit trail?", "a": "A small security/SRE set, not every developer. Treat it as sensitive even if prompts are absent, because volume and identity are already informative.", "kind": "apply"},
   ],
   links=[
    {"title": "Logging Amazon Bedrock API calls with CloudTrail", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html"},
    {"title": "Vertex AI audit logging", "url": "https://cloud.google.com/vertex-ai/docs/general/audit-logging"},
   ],
  ),
  "private-connectivity-no-public-egress": entry(
   what="""**Private connectivity** means the app reaches the model over a private path — AWS PrivateLink, GCP Private Service Connect, Azure private endpoints — so the request does **not** traverse the public internet. Combined with **no public egress** from the workload network, even a mis-aimed SDK cannot call a public API. That is what you are buying: a smaller blast radius and a story an auditor understands.

It is not free. You pay for endpoints, you own DNS, you own the failure mode when the endpoint is down, and you must decide whether a public fallback is **forbidden**. For many regulated teams it is forbidden. A silent fallback to the public endpoint is a control failure, not resilience.

Private connectivity does not encrypt away the provider. The model still runs on shared infrastructure unless you bought something stronger. It also does not hide prompts from the provider's runtime. It hides them from the public network path.""",
   why="""On the job this is often a hard gate for production. Security will not debate model quality until packets stay on the private path. If you cannot draw that path, you do not ship.

In interviews, draw: VPC / VNet -> private endpoint -> platform runtime in-region. Say what happens when the endpoint dies (fail closed if policy says so). Say what still leaves (if anything): package mirrors, telemetry. Side egress is how these designs fail.

Also say the cost: operational complexity and a new incident type (endpoint down, DNS wrong, security group miss).""",
   how="""Checklist:

1. Create the platform private endpoint in the prod VPC/VNet, same region as the model.
2. Point the SDK at the private DNS name; disable public endpoints in config.
3. Egress: default deny. Allow only the endpoint (and in-policy extras).
4. Test: block public DNS and confirm calls still work; then break the endpoint in staging and confirm you fail closed.
5. Document: public fallback allowed? (usually no).

Example: a worker still had `0.0.0.0/0` NAT "temporarily". A dependency called a public embedding API. The Bedrock path was private; the data was not. Private connectivity is a property of the whole request graph, not of one SDK.""",
   failures="""1. **Private invoke, public everything else.** Embeddings, evals, logs, package installs.

2. **Public fallback enabled for 'availability'.** You undid the control.

3. **Wrong region endpoint.** Packets take a path you did not draw.

4. **No staging test of failure.** You learn the downtime behaviour in production.""",
   line="""I reach the model over a private endpoint and I deny public egress so a mis-aimed call dies. That buys a smaller network blast radius, not magic confidentiality. If the endpoint is down I fail closed unless a written exception says otherwise.""",
   key_points=[
    "PrivateLink / PSC / private endpoints keep invoke off the public internet.",
    "Pair them with default-deny egress or the control is theatre.",
    "Public fallback is usually forbidden in regulated designs.",
    "The whole request graph must stay private: embeddings, logs, evals.",
    "You now own endpoint, DNS and a new failure mode.",
    "Private path ≠ customer-managed isolation of the runtime.",
   ],
   questions=[
    {"q": "What does private connectivity buy you, and what does it not?", "a": "It keeps model traffic off the public internet and supports no-egress designs. It does not by itself stop the provider processing the prompt, and it does not secure other public calls you still make.", "kind": "recall"},
    {"q": "The Bedrock call is on PrivateLink but answers mention a third-party embedder. What is wrong?", "a": "Another hop still uses public egress. Map every processor and either bring that hop in-boundary or drop it.", "kind": "debug"},
    {"q": "Should you fail over to the public endpoint when PrivateLink is down?", "a": "Only if a written exception allows it. For most regulated workloads you fail closed, page, and repair the endpoint.", "kind": "apply"},
    {"q": "Name one private-path product on each major cloud.", "a": "AWS PrivateLink, GCP Private Service Connect (often with VPC Service Controls), Azure private endpoints.", "kind": "recall"},
    {"q": "How do you prove the path is private in staging?", "a": "Deny public egress and confirm invoke still works; then disable the private endpoint and confirm the app fails without leaking to a public URL.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS PrivateLink concepts", "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html"},
    {"title": "Private Service Connect", "url": "https://cloud.google.com/vpc/docs/private-service-connect"},
    {"title": "Azure private endpoints", "url": "https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview"},
   ],
  ),
  "tenant-isolation-on-shared-infrastructure": entry(
   what="""**Tenant isolation on shared infrastructure** is how a multi-tenant product uses one platform without mixing customers. Layers: **separate accounts or projects** for hostile tenants or regulated ones; **scoped credentials** per tenant or per environment; **per-tenant encryption keys** when the threat model says so; **retrieval and logs that cannot cross a tenant boundary**. The model runtime is usually shared. Isolation is in identity, data stores, cache keys and admin access — not in a fantasy of a dedicated GPU per customer (unless you paid for that).

A shared vector index without a tenant filter is a cross-tenant prompt leak waiting for a query. A shared semantic cache without tenant in the key is the same leak with better latency.""",
   why="""On the job this is the difference between a B2B SaaS that can pass a security review and one that cannot. Platform features (CMK, separate projects) help. They do not insert `tenant_id` into your SQL or your cache.

In interviews, draw the layers. Say what is shared (the model) and what is not (indexes, keys, logs, budgets). Mention a test: tenant A must never retrieve tenant B's chunk, even if they guess an id.

"We use Bedrock" is not isolation. "Each tenant has a credential that can read only their prefix, and we test it" is.""",
   how="""Minimum viable isolation for a RAG SaaS:

1. `tenant_id` on every chunk, log, trace and cache key.
2. Retrieval query always includes the tenant filter in the data store — not only in the prompt.
3. Worker identity can read the store but application code fails closed if `tenant_id` is missing.
4. Stronger tenants: their own project/account and CMK.
5. Test: seed tenant B's secret phrase; as tenant A, search that phrase; expect zero hits. Repeat for logs export.

Example: two hospitals on one KB. Without a filter, "what is the discharge plan" returns the other hospital's plan. The model did nothing wrong. Your index did.""",
   failures="""1. **Tenant only in the prompt.** "You are helping hospital A" is not a control.

2. **Shared cache.** Semantic hits cross tenants.

3. **Admin UI with no tenant scope.** Support can dump everyone.

4. **One CMK for all as a checkbox.** Fine for some threat models; not for customers who require their own key.""",
   line="""The model is shared; isolation lives in accounts, credentials, keys, retrieval filters, cache keys and logs. I prove it with a cross-tenant leak test, not with a sentence in the system prompt.""",
   key_points=[
    "Shared model runtime is normal; shared indexes and caches are not.",
    "Tenant id belongs in the data store filter and cache key, not only in the prompt.",
    "Escalate to separate projects and CMKs when the threat model says so.",
    "Prove isolation with a leak test on retrieval and on log export.",
    "Admin tools need the same scope as the worker.",
    "A platform logo is not a tenant boundary.",
   ],
   questions=[
    {"q": "Where must tenant isolation live in a shared-platform RAG app?", "a": "In store filters, cache keys, credentials, keys and log exports. The system prompt is not a boundary. Separate accounts/CMKs when the customer requires them.", "kind": "recall"},
    {"q": "Two customers share a vector index without tenant filtering. What is likely?", "a": "Cross-tenant retrieval: one tenant's text appears in the other's prompt. That is a data leak, not a quality bug.", "kind": "debug"},
    {"q": "How do you test that logs cannot return another tenant's text?", "a": "Write a unique secret into tenant B traffic, export logs as a tenant-A operator or as the SIEM filter for A, and assert the secret is absent. Automate it.", "kind": "apply"},
    {"q": "When is a separate cloud account per tenant worth it?", "a": "Hostile or highly regulated tenants, distinct key/audit requirements, or blast-radius needs that IAM prefixes cannot satisfy. It costs ops; use it on purpose.", "kind": "apply"},
    {"q": "Why is a shared semantic cache dangerous in multi-tenant products?", "a": "Similar questions from different tenants can return another tenant's answer if the key omits tenant and permission scope.", "kind": "recall"},
   ],
   links=[
    {"title": "OWASP LLM top 10", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"},
   ],
  ),
  "encryption-customer-managed-keys": entry(
   what="""**Encryption and customer-managed keys (CMK)** describe who holds the key that wraps data at rest: prompts stored in logs, knowledge-base contents, fine-tuned artefacts, evaluation datasets. Platform-managed keys are the default. A **CMK** (AWS KMS customer key, Cloud KMS, Azure Key Vault) lets you revoke access, set rotation, and show an auditor that *your* key policy controls the ciphertext.

CMK does **not** mean the model cannot see the prompt in memory while inferencing. It does not make a shared runtime into a confidential-compute enclave by itself. It is a control for **data at rest** and for **exit** (revoke the key, the stored copies become unreadable to the platform's disk). Be precise in reviews.

Some features (certain fine-tunes, some hosted stores) do not support CMK. Read the row before you promise it.""",
   why="""On the job, enterprise questionnaires ask "do you support CMK". The wrong answer is "yes, everything is encrypted" (true of almost all clouds and not what they asked). The right answer is which stores use which key, who can use the key, and what happens on revoke.

In interviews, distinguish at-rest encryption, in-transit TLS, and processing-time exposure. Saying CMK encrypts the prompt in the GPU is a fail. Saying CMK lets a bank revoke stored KB objects is a pass.

Rotation without downtime belongs in the same conversation: dual-running key versions, in-flight calls, and the features that break if you delete the old version too soon.""",
   how="""Map stores:

- Knowledge base / index: CMK? 
- Fine-tune artefacts: CMK? Exportable?
- Log buckets: CMK + retention.
- Eval datasets: your bucket, your key.
- Model runtime: usually not your key.

Example: a bank requires CMK on stored customer text. You put the KB and the log bucket on their KMS key. Inference still processes plaintext in the service. You write that sentence in the review so nobody claims otherwise. You test revoke in staging: new writes fail, reads of old objects fail, in-flight invokes that do not touch those stores still succeed.""",
   failures="""1. **Overclaiming.** "CMK means they cannot see our prompts." False for inference.

2. **CMK on the wrong store.** The KB is covered; the eval export in a personal bucket is not.

3. **Revoke as a test in prod.** You locked yourself out.

4. **Feature that ignores CMK.** A preview store silently uses a platform key.""",
   line="""CMK is our key on data at rest — indexes, logs, fine-tunes — with revoke and rotation we control. It is not confidential inference. I map each store, I refuse features that cannot take the key, and I do not overclaim in the questionnaire.""",
   key_points=[
    "CMK controls at-rest data and revoke; it does not hide prompts during inference.",
    "Map every store: KB, logs, fine-tunes, eval dumps.",
    "Some platform features cannot take a CMK — read before you promise.",
    "TLS in transit is a separate control from CMK.",
    "Test revoke and rotation in staging, not as a surprise in prod.",
    "Be precise on questionnaires; 'encrypted' is not the answer they asked.",
   ],
   questions=[
    {"q": "What does a customer-managed key protect, and what does it not?", "a": "It protects stored artefacts (indexes, logs, fine-tunes) and lets you revoke disk access. It does not make inference-time memory private by itself.", "kind": "recall"},
    {"q": "A questionnaire asks if prompts are encrypted with our key. How do you answer?", "a": "Stored copies we control can be. The live prompt is processed by the service in its runtime. Say both sentences.", "kind": "apply"},
    {"q": "You enabled CMK on the KB but eval JSON sits in a laptop bucket. What failed?", "a": "The data-flow map. Every copy of tenant text needs a store and a key story, including side exports.", "kind": "debug"},
    {"q": "Why test key revoke in staging?", "a": "To see which calls fail, whether in-flight invokes survive, and how you restore. Doing that first in production is an outage you scheduled.", "kind": "apply"},
    {"q": "A preview knowledge-base type ignores CMK. What do you do?", "a": "Do not put regulated text there. Use a store that accepts the key, or keep retrieval in your own CMK-backed database.", "kind": "apply"},
   ],
   links=[
    {"title": "Amazon Bedrock encryption", "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/encryption.html"},
    {"title": "Vertex AI CMEK", "url": "https://cloud.google.com/vertex-ai/docs/general/cmek"},
    {"title": "Azure OpenAI encryption", "url": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/encrypt-data-at-rest"},
   ],
  ),
  "workload-identity-for-a-worker": entry(
   what="""**Workload identity for a worker** is the concrete binding: this job, pod or function assumes a role that can invoke **only the named models it needs**, in the region it runs, with no standing keys. The worker's Kubernetes service account, Cloud Run service, or Azure managed identity is annotated with that role. The SDK's default chain picks it up.

This is least privilege applied to a single binary. A batch embedder does not get chat-model invoke. A chat worker does not get fine-tune admin. A CI job gets staging models only.

If two workers share a role "to keep IAM simple", you have one worker for security purposes.""",
   why="""On the job, this is how you sleep. A compromised PDF-parsing worker should not be able to call the most expensive catalog model or read another team's KB. Binding per worker also makes audit logs readable: `role/embed-worker` versus `role/app`.

In interviews, walk a pod -> service account -> role -> two model ARNs. That sketch is worth more than a lecture on Zero Trust. Mention federation so the cluster does not store cloud keys.

They may ask how a cron job differs from an always-on service. Same identity pattern; narrower schedule and often a tighter model list.""",
   how="""Example on EKS:

- KSA `embed-worker` in namespace `ml`.
- IRSA annotation to `arn:...:role/embed-worker`.
- Policy: `InvokeModel` on the embedding model ARN in `eu-west-1` only.
- App refuses to start if it cannot fetch identity (fail loud).

A second KSA `chat-worker` maps to a different role with the chat model ARNs.

Test: from a debug pod with the embed KSA, calling the chat model must 403. Put that in CI against a staging cluster.""",
   failures="""1. **One `app` role for all containers in the pod spec.** Sidecars inherit god mode.

2. **Keys in the image 'as backup'.** The binding is theatre.

3. **Role too wide because the worker 'might need' a bigger model.** Add it when you need it.

4. **No fail-loud on missing identity.** The SDK silently falls back to an instance role you forgot about.""",
   line="""Each worker gets its own identity bound to the models it needs and nothing else. I test that the embedder cannot chat. I fail startup if identity is missing so we never silently use a wider role.""",
   key_points=[
    "Bind each job or pod to a role that can invoke only its named models.",
    "Do not share one role across workers 'for simplicity'.",
    "Fail startup if the default credential chain is missing or unexpected.",
    "CI and cron get narrower identities than the interactive service.",
    "Prove isolation with a 403 test from the wrong worker.",
    "Sidecars should not inherit a god role.",
   ],
   questions=[
    {"q": "What does a correct worker identity binding include?", "a": "A per-worker service account or managed identity, a role scoped to named model ids and region, default-credential SDK usage, and a startup check that the identity is the expected one.", "kind": "recall"},
    {"q": "The embedder can invoke the chat model. What broke?", "a": "Shared or oversized role. Split identities and add a test that embed credentials 403 on chat invoke.", "kind": "debug"},
    {"q": "Why fail startup when identity is missing?", "a": "So the process cannot silently fall back to a broader instance profile or a leftover key and appear healthy.", "kind": "apply"},
    {"q": "How should a nightly eval job authenticate?", "a": "Its own federated role that can invoke only the eval model ids in staging, not the production worker role.", "kind": "apply"},
    {"q": "What is IRSA / workload identity federation doing here?", "a": "It lets the pod assume the cloud role with a short-lived token, so you do not store cloud keys in the cluster.", "kind": "recall"},
   ],
   links=[
    {"title": "IAM roles for service accounts", "url": "https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html"},
    {"title": "GKE Workload Identity", "url": "https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity"},
   ],
  ),
  "cross-tenant-prompt-leak-tests": entry(
   what="""**Cross-tenant prompt leak tests** are automated proofs that retrieval, caches and logs cannot return another tenant's text. You plant a **canary string** in tenant B's corpus and traffic. You then act as tenant A (same app, same platform, A's credentials) and try to retrieve, generate, export logs, or hit the cache in ways that would surface the canary. Expect **zero** hits. Run this in CI against staging and periodically in production with dedicated canary tenants.

This is not a red-team hobby. It is the test that matches the isolation story you told in the security review. If you cannot run it, you do not have isolation; you have a comment in the prompt.""",
   why="""On the job, leaks show up as a customer seeing another customer's invoice line in a "helpful" answer. That is a reportable incident. A canary test turns it into a failing pipeline before launch.

In interviews, describing the canary — unique high-entropy string, planted in KB, logs and cache, queried from the other tenant — is a strong applied answer. Mention you test **read paths** (retrieval, generate) and **export paths** (support tools, analytics dumps).

OWASP-style LLM risks include insecure output handling and data leaks; this is the practical control.""",
   how="""Recipe:

1. Create tenants `canary-a` and `canary-b`.
2. In B, store `ZXQ-CANARY-7f3c…` in a doc, make a request that logs it, and warm a cache.
3. As A: search the string, ask "what is the canary", export A's logs, hit semantic cache with a paraphrase.
4. Assert empty. Any hit fails the build.
5. Repeat after index rebuilds, cache library upgrades and platform KB changes.

Example: after a managed KB migration the filter field was renamed and silently dropped. The canary test failed the same day. Without it, a customer would have found it.""",
   failures="""1. **Only testing the happy path.** You never search for the other tenant's secret.

2. **Canary in the prompt instructions.** You are testing the model, not the store.

3. **Same credentials for A and B.** You did not test tenant scope.

4. **Skipping log export.** Retrieval is clean; the support ZIP is not.""",
   line="""I plant a canary string in tenant B and I try to pull it as tenant A from retrieval, generation, cache and log export. Zero hits is the only pass. If I cannot run that test, I do not claim isolation.""",
   key_points=[
    "Plant a high-entropy canary in another tenant's data, logs and cache.",
    "Query as the victim tenant on retrieval, generate, cache and export paths.",
    "Automate in CI and after index or platform changes.",
    "Use real tenant credentials, not an admin god role.",
    "A fail is a leak — treat it as a security bug, not a flaky eval.",
    "Prompt-only isolation will fail this test.",
   ],
   questions=[
    {"q": "How do you prove retrieval cannot return another tenant's text?", "a": "Plant a unique canary in tenant B's index, query it as tenant A with A's credentials, and assert zero hits. Repeat after rebuilds.", "kind": "recall"},
    {"q": "The generate path is clean but a support ZIP contains another tenant's prompt. What did you miss?", "a": "Export and admin paths. Leak tests must cover logs and support tools, not only the user-facing retrieve-generate call.", "kind": "debug"},
    {"q": "Why use a high-entropy canary instead of 'secret project'?", "a": "Common phrases can appear by chance or in docs. A unique token makes any hit unambiguous.", "kind": "apply"},
    {"q": "When do you re-run leak tests?", "a": "On every change to retrieval filters, cache keys, KB migrations, log pipelines and IAM — and on a schedule in production canary tenants.", "kind": "apply"},
    {"q": "A teammate says the system prompt names the tenant, so tests are optional. Reply?", "a": "Prompts are not controls. Without a store filter and a leak test we cannot claim isolation.", "kind": "debug"},
   ],
   links=[
    {"title": "OWASP LLM top 10", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"},
   ],
  ),
  "key-rotation-without-downtime": entry(
   what="""**Key rotation without downtime** means you can rotate a CMK (or a platform-managed key version you control) while **in-flight invokes keep succeeding**. The usual pattern is **versioned keys**: new writes use key version N+1; old ciphertext remains readable with version N until rewrapped; you only disable N after a measured rewrap and a quiet period.

Model invoke that does not read CMK-wrapped stores should be unaffected. Features that unwrap on every request (some KB fetches) must accept both versions during the window. Deleting the old version too early is how you schedule an outage.

This is an operations drill, not a checkbox. Run it in staging with traffic.""",
   why="""On the job, rotation is required by policy (90 days, 365 days) and by incidents (someone had access). If rotation means downtime, teams skip it. If rotation is a drill, it is boring.

In interviews, talk dual versions, rewrap, in-flight, and the difference between rotate and revoke. Revoke is an emergency: new and old reads fail. Rotate is planned: both work until cutover.

Mention which platform features block rotation (a store that cannot rewrap, a fine-tune artefact tied to one key version).""",
   how="""Drill:

1. Staging traffic on. Create CMK version N+1. Update the service to encrypt new objects with N+1.
2. Rewrap or dual-read old objects. Watch error rates and KB latency.
3. Confirm in-flight converse/generate calls never touched the key still succeed throughout.
4. After the quiet period, disable N. Confirm reads still work. Only then schedule destruction per policy.

Example: you rotated and immediately scheduled N for deletion. In-flight KB queries for unread objects failed for 15 minutes. The runbook now says "disable, wait 24h, then destroy" and lists the jobs that still unwrap N.""",
   failures="""1. **Rotate equals revoke.** You cut both versions.

2. **No dual-read window.** Old objects die at flip.

3. **Forgetting async jobs.** A nightly reindex still uses N.

4. **First rotation in production.** Staging had no CMK at all.""",
   line="""Rotation is dual key versions, rewrap, a quiet period, then disable. In-flight model calls that do not need the store should not notice. Revoke is the emergency; I do not practise revoke by accident.""",
   key_points=[
    "Rotate with version N and N+1 live; disable N only after rewrap and a quiet period.",
    "In-flight invokes that do not unwrap stores should keep succeeding.",
    "Revoke is an emergency outage; do not confuse it with rotation.",
    "Find every job that still decrypts with the old version.",
    "Drill in staging under traffic.",
    "Some artefacts cannot rewrap — know them before you promise rotation SLAs.",
   ],
   questions=[
    {"q": "How do you rotate a CMK without dropping in-flight model calls?", "a": "Introduce a new key version, write new data with it, dual-read or rewrap old data, keep invoke paths that do not unwrap stores untouched, then disable the old version after a quiet period.", "kind": "recall"},
    {"q": "After a 'rotation', knowledge-base reads fail. What probably happened?", "a": "The old version was disabled or deleted before rewrap finished, or an async job still needed it. Restore N, finish rewrap, and separate rotate from revoke.", "kind": "debug"},
    {"q": "What is the difference between rotate and revoke?", "a": "Rotate keeps access via a new version and a planned window. Revoke makes ciphertext unreadable on purpose, including to you, until you restore policy.", "kind": "recall"},
    {"q": "Why run the drill with traffic in staging?", "a": "To see latency, error rates and forgotten jobs. An idle staging store hides the failure mode.", "kind": "apply"},
    {"q": "A fine-tune artefact cannot rewrap. What do you write in the runbook?", "a": "That artefact is a rotation exception: re-train or export before disabling the old key, or accept that rotation of that store is a rebuild.", "kind": "apply"},
   ],
   links=[
    {"title": "AWS KMS key rotation", "url": "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html"},
    {"title": "Cloud KMS key versions", "url": "https://cloud.google.com/kms/docs/key-rotation"},
   ],
  ),
  "private-link-failure-mode": entry(
   what="""**Private link failure mode** is the written answer to: the private endpoint is down (deleted, bad DNS, quota, AZ issue). What does the app do? For regulated workloads the usual answer is **fail closed** — return 503 to the user, page the owner, do **not** fall back to the public endpoint. For unregulated internal tools you might allow a temporary public path with a loud alarm and an expiry. The failure mode is a policy choice you record, not an SDK default.

You must know how the SDK behaves if you do nothing. Many clients will happily resolve the public hostname if DNS or the endpoint disappears. That is an implicit fallback. Disable it.

This is an incident type you rehearse: break the endpoint in staging and watch.""",
   why="""On the job, availability and compliance fight here. SRE wants fallback. Security wants fail closed. If nobody wrote the decision, the SDK will decide — usually the wrong way for a bank.

In interviews, they will ask "what if PrivateLink dies". The junior answer is "we retry". The senior answer is "we fail closed because public egress is forbidden; the SLO is repaired by fixing the endpoint; here is the runbook owner". If public fallback is allowed, say for which data class and for how long.

Also mention blast radius: one shared endpoint for all workers is a single point of failure; sometimes you want two endpoints or two AZs.""",
   how="""Write in the runbook:

- Detection: 5xx/timeouts to the private DNS name; endpoint health metric.
- User effect: 503, no retry to public.
- Page: platform on-call + app on-call.
- Repair: check endpoint, SG/NSG, DNS, AZ.
- Forbidden: changing SDK endpoint to public without an exception ticket.
- Exception template: data class, duration, approver, extra logging.

Rehearse quarterly by disabling the staging endpoint. Confirm no packets to the public IP (VPC flow logs) and that users see the 503.""",
   failures="""1. **Implicit public fallback.** You thought you were private.

2. **Retries stampede the broken endpoint** and hide the health signal.

3. **One endpoint, all products.** A single delete takes down the company.

4. **No rehearsal.** The first failure is production.""",
   line="""When the private endpoint dies I fail closed unless a written exception for that data class says otherwise. I disable implicit public fallback in the SDK, I page, and I repair the path. I rehearse this in staging so the SDK cannot surprise me.""",
   key_points=[
    "Write the failure mode: usually fail closed, no public fallback.",
    "SDKs may implicitly use a public hostname — disable that.",
    "Rehearse by breaking the staging endpoint and watching flow logs.",
    "Treat the endpoint as critical-path infrastructure with an owner.",
    "Exceptions need data class, duration and an approver.",
    "Avoid a single shared endpoint if you cannot tolerate that blast radius.",
   ],
   questions=[
    {"q": "What should a regulated app do when its private model endpoint is down?", "a": "Fail closed, return an error, page, and repair the endpoint. Do not fall back to the public internet unless a dated exception allows that data class.", "kind": "recall"},
    {"q": "Flow logs show public IPs after an endpoint incident. What happened?", "a": "The client resolved or fell back to a public hostname. Disable that fallback and add a test that fails the build if public invoke succeeds from the prod network.", "kind": "debug"},
    {"q": "Why is 'just retry' a weak failure mode?", "a": "Retries do not restore a deleted endpoint and can hide the outage. They also do not address the compliance question of where the retry goes.", "kind": "apply"},
    {"q": "What belongs in a public-fallback exception?", "a": "Data class allowed, time box, named approver, extra logging, and a requirement to revert. No open-ended 'for availability'.", "kind": "apply"},
    {"q": "How do you reduce blast radius of one PrivateLink?", "a": "Per-environment endpoints, multi-AZ where offered, and do not share one endpoint across unrelated products if you can avoid it.", "kind": "recall"},
   ],
   links=[
    {"title": "AWS PrivateLink concepts", "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html"},
    {"title": "Azure private endpoint DNS", "url": "https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns"},
   ],
  ),
 }
}
