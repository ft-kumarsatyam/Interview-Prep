from helper import note
from links import EU_AI, MEITY, NIST, OA_SAFE, OWASP

L = [EU_AI, MEITY]

NOTES = {
    "m8-8": {
        "bias-transparency-human-oversight": note(
            what="""Core concerns around **hallucination, bias and fairness, transparency, accountability, and human oversight** are not slogans; they are design constraints. Hallucination is a wrong statement presented as fact. Bias is systematic error across groups (a resume screener that down-ranks a school or a name). Transparency is being able to say what the system does, on what data, with what limits. Accountability is a named owner when it hurts someone. Human oversight is a person who can change the outcome — not a rubber stamp.

**Automation bias** is the tendency of that person to believe the machine. Oversight that is a pre-checked 'agree' box is not oversight. High-stakes uses (hiring, credit, benefits, medical) need slower, documented, challengeable human decisions and measured error by group.""",
            why="""This is the ethics and governance core of the capstone. Interviewers will ask how you test a resume screener and whether 'a human reviews everything' is enough. On the job it is how you keep a feature from becoming a discrimination incident.""",
            how="""Resume screener: define the decision (rank, not reject); measure selection rates and error by group on a labelled set; remove features that proxy protected attributes when you can; document remaining risk; a human must see the evidence, not only a score; log overrides. Transparency: a system card that says it ranks, it hallucinates citations unless grounded, it is not a legal decision.

Test automation bias: if reviewers agree with the model 99% in one second, the human is decoration. Change the UX: hide the score until they write a note, or sample mandatory disagreements.""",
            fails="""1. **'A human reviews'** with no time, no evidence, no override metric.

2. **No group-wise eval** because overall accuracy looked fine.

3. **Transparency as a marketing page** that disagrees with the code.

4. **Accountability with no name.**""",
            line="I treat hallucination, bias, transparency, accountability, and oversight as design constraints. I measure error by group, I document limits, I name an owner, and I do not call a one-second rubber stamp human oversight — automation bias is the failure mode.",
            kps=[
                "Hallucination, bias, transparency, accountability, oversight are design constraints.",
                "Measure error and selection by group, not only overall.",
                "Oversight needs time, evidence, and an override that happens.",
                "Automation bias makes rubber-stamp review useless.",
                "Name an owner when the system hurts someone.",
                "The system card must match the code.",
            ],
            qs=[
                {"q": "How would you test an LLM-based resume screener for bias?", "a": "Hold a labelled set, measure selection and error rates by group, probe proxies (names, schools), and review overrides. Do not rely on overall accuracy. Decide whether the system should rank or decide.", "kind": "apply"},
                {"q": "What is automation bias and how does it undermine human oversight?", "a": "People over-trust the machine. If they accept the score in one second without the evidence, the human is not a control. Change UX and measure override rates.", "kind": "recall"},
                {"q": "Why is 'a human reviews every output' not automatically adequate oversight?", "a": "Volume, time pressure, and automation bias. Without evidence, time, and a real override path, it is theatre — and some laws still treat it as inadequate for high-risk uses.", "kind": "debug"},
                {"q": "What belongs in transparency for an internal HR Q&A bot?", "a": "What it is for, what sources it uses, that it can be wrong, where data goes, and how to escalate to a person. Not a claim of legal advice.", "kind": "recall"},
                {"q": "Who is accountable if the screener ranks someone out?", "a": "A named product and legal owner, with a challenge process. 'The model' is not an owner.", "kind": "apply"},
            ],
            links=[EU_AI, NIST],
            walk="""You hide the score until the reviewer writes two bullets from the evidence. Override rate rises from 0.5% to 8%. That is oversight starting to exist. You add group-wise charts to the monthly review.""",
            measure="""Group-wise error; override rate and time; incidents with a named owner; mismatch between the system card and the code.""",
        ),
        "documenting-use-limits-risks": note(
            what="""Write down **intended use, known limitations, important risks, evaluations, and human-control mechanisms**. This is a **system card** (or model card plus application card): who it is for, who it is not for, what it may get wrong, what evals you ran, where data goes, how a human steps in, and how to file a challenge. Version it with the code. A card that describes last quarter's prompt is a liability.

Limits are specific: 'may invent citations unless grounded', 'not for medical dosage', 'English-only eval', 'p95 4s', 'tenant isolation depends on the filter remaining mandatory'. Risks include injection, leakage, bias, and outage behaviour.""",
            why="""Interviewers ask what is in the card. Auditors and customers ask the same. On the job, versioning the card with the release is how you stay honest after a rushed prompt change.""",
            how="""Template sections: purpose, users, out-of-scope, data flows, models and prompts (versions), evals (date, n, scores), known failure modes, human controls, escalation, retention. Ship it in the repo next to the service.

Example HR Q&A: intended to quote reviewed policy; not to decide cases; limitation — stale if snapshot is old; risk — injection from wiki if that tier is enabled; eval — 200 questions, citation rate 91%; human — 'ask HR' button.""",
            fails="""1. **A pretty page that disagrees with prod.**

2. **No version.**

3. **Hiding limitations** to sell the demo.

4. **Evals with no date or n.**""",
            line="I document intended use, limits, risks, evals, and human controls in a versioned system card that ships with the code. If the card and the service disagree, the card is a liability.",
            kps=[
                "Card: use, limits, risks, evals, human controls.",
                "Version it with the release.",
                "Limits are specific and dated.",
                "Evals include n, date, and scores.",
                "Out-of-scope is as important as purpose.",
                "A sales page is not a system card.",
            ],
            qs=[
                {"q": "What belongs in a system card for an internal HR Q&A bot?", "a": "Purpose (quote policy), out-of-scope (no case decisions), sources, data flow, evals with n and date, known errors, human escalation, and retention. Versioned with the code.", "kind": "recall"},
                {"q": "Why version documentation alongside the code?", "a": "A prompt or retrieval change can void the old limits and evals. Reviewers need the card that matches the build they are looking at.", "kind": "apply"},
                {"q": "What is the best content for a 'known limitations' section of an assistant's system card?", "a": "Concrete failure modes: invents citations unless grounded, weak on other languages, stale if the snapshot is old, not a legal decision. Not 'may make mistakes' alone.", "kind": "recall"},
                {"q": "A PM wants the card to say 'accurate and safe'. What do you write instead?", "a": "Measured scores, residual risks, and the human path. Those words without numbers are marketing.", "kind": "debug"},
                {"q": "Where should the card live?", "a": "In the repo next to the service, linked from the UI's about panel, tagged with the release.", "kind": "apply"},
            ],
            links=[NIST, EU_AI],
            walk="""You add `SYSTEM_CARD.md` to the release checklist. The last prompt tweak blocked until the citation limitation was updated. Customers get the tag, not a Notion page from March.""",
            measure="""Releases without a card bump; contradictions found in review; time since evals were re-run.""",
        ),
        "the-eu-ai-act-india-s-dpdp": note(
            what="""Two regimes you should be able to contrast in a minute. The **EU AI Act** is **risk-class and documentation**: practices that are banned, high-risk systems (including many employment uses) that need risk management, data governance, logging, transparency, human oversight, and conformity work; lighter duties for limited-risk (e.g. telling people they talk to an AI). The **India DPDP Act** is **personal data**: lawful purpose, consent or other grounds, notice, purpose limitation, security, and **erasure / correction** — plus significant-data-fiduciary duties when notified. It is not an AI-specific Act; it still applies to prompts, traces, and indexes that hold personal data.

You are not giving legal advice. You are naming the engineering capabilities each one implies: for the Act, risk class, logs, oversight, evals; for DPDP, purpose, minimisation, deletion across stores, and vendor terms.""",
            why="""This is the interview close for the capstone. On the job, a CV-screener in the EU and a support bot in India pull different checklists. Mixing them ('we are GDPR so we are AI-Act ready') is a fail.""",
            how="""CV-screener in the EU: treat as likely high-risk employment use; build dataset governance, logs, human oversight that is real, and a risk file. Do not ship a fully automated reject.

Support bot in India: map personal data in tickets and traces; notice and purpose; erasure that hits the index; security; vendor DPA. The Act may still matter if you have EU users.

One minute spoken: 'AI Act is risk class and documentation; DPDP is consent, purpose, and deletion. I implement logs and oversight for the first, and a store-by-store erasure story for the second.'""",
            fails="""1. **Conflating the two laws.**

2. **'A human clicks OK'** as AI Act oversight.

3. **DPDP erasure that misses embeddings.**

4. **Pretending you are a lawyer** instead of an engineer listing capabilities.""",
            line="The EU AI Act is risk class and documentation; India's DPDP is personal data — consent, purpose limitation, and erasure. I implement oversight and logs for the first, and a deletion-and-minimisation story for the second, and I do not conflate them.",
            kps=[
                "AI Act: risk class, documentation, oversight, logging.",
                "DPDP: personal data, purpose, notice, security, erasure.",
                "High-risk employment uses need more than a chatbot disclaimer.",
                "DPDP applies to prompts, traces, and indexes.",
                "Do not conflate the two or claim legal advice.",
                "Engineering capabilities beat slogan compliance.",
            ],
            qs=[
                {"q": "How does the EU AI Act's risk-based approach affect a CV-screening feature?", "a": "Employment uses are often high-risk: you need governance, logs, real human oversight, and a risk file. Fully automated reject is the wrong default. Confirm with counsel; as an engineer, build those capabilities.", "kind": "apply"},
                {"q": "List engineering capabilities needed to honour DPDP erasure and purpose limitation in an AI product.", "a": "A data map, purpose tags, minimisation, deletion across indexes, caches, traces, and evals, access control, and vendor terms that match. Notice in the product.", "kind": "recall"},
                {"q": "A DPDP-style erasure request arrives. Which action is most often missed?", "a": "Embeddings, prompt caches, eval exports, and memories. The ticket row is the easy part.", "kind": "debug"},
                {"q": "Contrast the two regimes in one minute.", "a": "AI Act classifies systems by risk and demands documentation and oversight. DPDP regulates personal data with purpose and erasure. A product may need both.", "kind": "recall"},
                {"q": "Why is 'we have GDPR' not an AI Act answer?", "a": "Different object: personal data versus AI system risk. Overlap exists; the files and duties differ. Build both checklists.", "kind": "apply"},
            ],
            links=L,
            walk="""Legal asks for a one-pager. You write two columns: Act (risk class, logs, oversight) and DPDP (stores, purpose, delete). The CV-screener gets an oversight design; the India support bot gets an erasure drill.""",
            measure="""Features with a documented risk class; erasure drills that include vectors; counsel-reviewed cards for high-stakes routes.""",
        ),
        "auditability": note(
            what="""**Auditability** means you can reconstruct **who did what, when, with which version**, without necessarily storing every private body. Keep **model and prompt versions**, retrieval config ids, tool-call records, **approvals**, and **eval records**. An agent action that sent an email should record actor, frozen args, approval id, model snapshot, and trace id.

If you cannot answer 'which prompt shipped on Tuesday' or 'who approved that refund', you are not auditable. If you store full bodies for seven years by default, you may be auditable and unlawful. Design the minimum that still reconstructs.""",
            why="""Auditors, incidents, and the AI Act's logging story all need this. Interviewers ask what is in the record. On the job, privacy and audit will fight; your job is the compromise design.""",
            how="""Record: `actor, action, object_ids, args_hash, args_redacted, approval_id, model_id, prompt_id, retriever_id, time, trace_id`. Keep hashes so you can prove integrity. Reconstruct content from source systems (ticket store) when an investigation needs it, under access control.

Compromise when auditors want 7-year bodies and privacy wants minimisation: store metadata for 7 years; store bodies for a short debug window; reconstruct from systems of record; document the residual.""",
            fails="""1. **Full bodies forever** 'for audit'.

2. **No versions**, so you cannot replay.

3. **Approvals not linked** to the executed args.

4. **Eval records on a laptop.**""",
            line="Auditability is who, what, when, and which versions — plus approvals — not a 7-year pile of chat bodies. I store metadata and hashes, I reconstruct from systems of record when needed, and I version prompts and models with the release.",
            kps=[
                "Who, what, when, which model/prompt/retriever versions.",
                "Link approvals to executed arguments.",
                "Hashes beat storing every body by default.",
                "Privacy and audit share a designed compromise.",
                "You must be able to say what shipped on Tuesday.",
                "Eval records are part of the audit story.",
            ],
            qs=[
                {"q": "What should an audit record include for an agent action that sent an email?", "a": "Actor, time, frozen recipients and subject (or hashes plus reconstruct), approval id, model and prompt versions, and trace id. Not necessarily the whole chat.", "kind": "recall"},
                {"q": "Auditors want full prompts retained for 7 years; privacy wants minimal retention. Propose a compromise.", "a": "Metadata and hashes for the long window; short-lived bodies in a locked debug store; reconstruct from systems of record for investigations; write the residual in the DPA story.", "kind": "apply"},
                {"q": "Why is 'which prompt' part of auditability?", "a": "Behaviour changes with the prompt. Without a version you cannot explain Tuesday's answers or roll back.", "kind": "debug"},
                {"q": "How do you keep eval records auditable?", "a": "Store suite version, n, scores, date, and the build they were run on, in the repo or an artifact store — not on a laptop.", "kind": "apply"},
                {"q": "What breaks if approval id is missing?", "a": "You cannot prove a human saw the args that executed. The approval control disappears in the log.", "kind": "recall"},
            ],
            links=[EU_AI, NIST],
            walk="""An auditor asks who sent a mail on the 12th. You pull actor, approval, args hash, prompt id. You reconstruct the body from the mail system. You do not hand them six months of other users' chats.""",
            measure="""Actions without a version stamp; approvals unlinked to execution; time-to-answer an auditor question.""",
        ),
        "audit-logs-without-bodies": note(
            what="""**Store who, what, when — not the full user text if policy forbids it.** This is the privacy-aware audit trail: identifiers, action types, object ids, versions, decisions, and hashes. The body stays in the system of record (ticket, mail server) with its own access control, or it is not stored at all.

This item exists because teams copy the entire prompt into the audit table 'to be safe' and create a second, worse, less-deletable PII store.""",
            why="""It is the concrete design that lets you pass both audit and DPDP-style minimisation. Interviewers ask for the field list.""",
            how="""Schema as above, plus a `body_available: false` and a pointer `source_system=tickets/123`. Investigators with a role can open the ticket. The audit table is exportable to the SIEM because it has no prose.

If policy *requires* a body (rare, get it in writing), isolate that table, encrypt it, TTL it, and do not replicate it to the data lake.""",
            fails="""1. **Prompt text in the SIEM** because the audit event included it.

2. **Hashes without a reconstruct path** when you promised you could investigate.

3. **Pointers to deleted tickets** with no residual story.""",
            line="I store who, what, when, versions, and hashes — not the full user text — and I reconstruct from the system of record when an investigation needs content. That is an audit log that privacy can live with.",
            kps=[
                "Who, what, when, versions, hashes — not default bodies.",
                "Point at the system of record for content.",
                "Do not ship prose to the SIEM.",
                "If a body is required, isolate and TTL it.",
                "A reconstruct path must exist if you promised investigate-ability.",
                "A second copy of the chat is a second deletion problem.",
            ],
            qs=[
                {"q": "Which is the best way to make an audit trail privacy-aware?", "a": "Metadata, ids, versions, and hashes in the audit store; bodies remain in the system of record under access control. Do not duplicate the chat into the SIEM.", "kind": "recall"},
                {"q": "What do you put in the SIEM event for a send-mail action?", "a": "Actor, time, action, destination domain or hash, approval id, model version. Not the body, not the whole prompt.", "kind": "apply"},
                {"q": "You stored only hashes and deleted the ticket. Can you investigate?", "a": "Not the prose. Document that residual, or keep a lawful, isolated copy with a TTL. Do not pretend hashes are the email.", "kind": "debug"},
                {"q": "Why is a second copy of the chat in audit worse than the original?", "a": "It often has longer retention, wider access, and a weaker deletion path.", "kind": "recall"},
                {"q": "When would you store a body anyway?", "a": "When a written policy or law requires it, in an isolated encrypted table with TTL and access logs — not as the default.", "kind": "apply"},
            ],
            links=[MEITY, NIST],
            walk="""You drop `prompt` from the audit JSON. SIEM exports go green on the PII scanner. Investigations open the ticket by id. Legal signs the compromise.""",
            measure="""Audit events containing message-like prose; SIEM PII hits; investigations that could not reconstruct.""",
        ),
        "a-disclosure-you-can-stand-behind": note(
            what="""A **disclosure** users and customers can stand behind states **limits, human oversight, and where data goes** — in language that matches the code. 'Powered by AI' is not enough if the law or your ethics bar wants more. Say it may be wrong, say when a human is in the loop, say which vendors process the text, say how to opt out or escalate.

If the disclosure says 'we do not train on your data' and the playground key trains, you cannot stand behind it. The disclosure is a product surface with tests.""",
            why="""This is the user-facing twin of the system card. Interviewers ask what you would put in the UI. On the job it is the about panel and the enterprise annex.""",
            how="""UI: short, linked to the full card. Bullets: this assistant can be wrong; it quotes a policy snapshot dated X; a human reviews refunds; prompts go to Vendor Y in region Z under ZDR; you can ask a person. Enterprise annex repeats this with versions.

Test: a release checklist compares disclosure flags to gateway config (vendor, region, ZDR). A mismatch blocks the release.""",
            fails="""1. **Vague 'may make mistakes'** as the only limit.

2. **Disclosure that lies** about training or vendors.

3. **No escalate-to-human** while the text promises one.

4. **English-only disclosure** for a multilingual product.""",
            line="I ship a disclosure I can stand behind: limits, human oversight, and where data goes, matching the gateway and the card. If the flags lie, the release does not ship.",
            kps=[
                "Limits, oversight, and data destinations — specifically.",
                "The text must match gateway flags.",
                "A human path you promise must exist.",
                "Version the enterprise annex with the build.",
                "'Powered by AI' is not a complete disclosure.",
                "Mismatch between disclosure and code is a release blocker.",
            ],
            qs=[
                {"q": "What three things must a stand-behind disclosure name?", "a": "Limits (how it fails), human oversight (when a person is in the loop), and where data goes (vendors, region, training). With enough detail to match the code.", "kind": "recall"},
                {"q": "The UI says you do not train on prompts but the key is a consumer endpoint. What do you do?", "a": "Stop, switch the key or the text, and treat past traffic as an incident. The disclosure is a control, not decoration.", "kind": "debug"},
                {"q": "How do you keep disclosure honest across releases?", "a": "A checklist or test that compares UI flags to gateway config: vendor, region, ZDR, human-in-the-loop routes.", "kind": "apply"},
                {"q": "What human path belongs in the disclosure of a support copilot?", "a": "How to reach a person, and which actions (refunds) already require a human. Do not promise a review you do not staff.", "kind": "apply"},
                {"q": "Why link the short UI text to the system card?", "a": "The panel stays readable; the card holds versions and evals. Together they are the disclosure.", "kind": "recall"},
            ],
            links=[EU_AI, OA_SAFE],
            walk="""You add three bullets under the composer and a CI test that ZDR is on if the bullet says so. Marketing's 'never wrong' line is removed in review.""",
            measure="""Mismatches between disclosure and config; promised human paths with no staffing; languages missing a disclosure.""",
        ),
        "interview": note(
            what="""**Interview: EU AI Act vs DPDP in one minute** is a spoken contrast: **risk class and documentation versus consent and purpose limitation**. Then one engineering example each. Do not recite article numbers unless you are sure. Do not give legal advice. Show you know which checklist you would open first for a CV-screener (Act) versus a chat log in India (DPDP), and that a global product may need both.

This is the last item of Level 8's written module. It rewards clarity, not a law-school monologue.""",
            why="""Hiring panels use this to see if you can talk to counsel without wasting the room. On the job it is the same one minute in a design review.""",
            how="""Script:

'The AI Act cares what kind of AI system you are — banned, high-risk, limited — and wants risk files, logs, and oversight. DPDP cares that you process personal data for a purpose people were told about, and that you can erase it. A CV-screener: I start with high-risk duties and a real human. A support bot in India: I start with the store table and erasure. Many products need both. I implement capabilities; counsel maps the articles.'""",
            fails="""1. **Mixing the statutes** into one blob.

2. **Article-number theatre** with no engineering.

3. **'I am not a lawyer' and then nothing else.** You still owe the contrast.""",
            line="In one minute I say the AI Act is risk class and documentation, DPDP is consent, purpose, and erasure, I give one engineering example each, and I let counsel map articles. I do not conflate them.",
            kps=[
                "Act: risk class and documentation. DPDP: purpose and erasure.",
                "One engineering example each is enough.",
                "A global product may need both checklists.",
                "You implement capabilities; counsel maps articles.",
                "Do not hide behind 'I am not a lawyer' with no contrast.",
                "No article-number theatre.",
            ],
            qs=[
                {"q": "Give the one-minute contrast this item wants.", "a": "AI Act: risk class, documentation, oversight. DPDP: personal data, purpose, erasure. CV-screener versus chat-log erasure as the two examples. Counsel maps articles.", "kind": "recall"},
                {"q": "Which checklist do you open first for a CV-screener in the EU?", "a": "AI Act high-risk employment duties — logs, oversight, governance — then still do data-protection for the CVs themselves.", "kind": "apply"},
                {"q": "Which checklist do you open first for ticket logs of Indian users?", "a": "DPDP: purpose, notice, security, erasure across stores. The Act may also apply if the system is in scope for EU users.", "kind": "apply"},
                {"q": "An interviewer asks for article numbers. What do you do if you are unsure?", "a": "Do not invent them. Stay on capabilities and risk class, and say counsel owns the pinpoint cites.", "kind": "debug"},
                {"q": "Why is 'we are GDPR compliant' a weak close?", "a": "It does not answer risk class or DPDP's erasure story, and it sounds like a slogan. Give the contrast.", "kind": "recall"},
            ],
            links=L,
            walk="""You deliver the script, write two column headers, and stop. The interviewer moves to the capstone app. That is a pass.""",
            measure="""Whether you can do this in 60 seconds in practice; whether your design docs have the two columns.""",
        ),
    }
}
