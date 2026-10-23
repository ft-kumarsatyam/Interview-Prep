"""Replace generic notes for items that had no seed with topic-specific text."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(ROOT / "scripts/_l10"))

from banks_l10 import BANKS as B10
from banks_l12 import BANKS as B12
from banks_l15 import BANKS as B15
from compose import compose
from helper import note as hnote  # noqa: F401 — used only if we import module notes

BANKS = {**B10, **B12, **B15}
STUDY = {
    "m10": ROOT / "data/genai-study/genai-16-levels/level-10.json",
    "m12": ROOT / "data/genai-study/genai-16-levels/level-12.json",
    "m15": ROOT / "data/genai-study/genai-16-levels/level-15.json",
}

# Unique bodies for keys that had no original seed. Keys: node/key
EXTRAS = {
    "m10-1/what-is-non-deterministic-in-the-loop": {"what": "Pin prompt, model, and judge."},
    "m10-1/human-review-as-an-llmops-stage": {"what": "Not every change is a silent deploy."},
    "m10-2/feature-flags-on-prompts": {"what": "Flip back without a rebuild."},
    "m10-2/contract-tests-on-the-output-schema": {"what": "Break the build when a field disappears."},
    "m10-2/interview": {"what": "Timeouts, logs, eval gate, rollback, budget cap."},
    "m10-3/dataset-versioning": {"what": "The golden set is as important as the prompt."},
    "m10-3/promotion-rules": {"what": "Dev to staging to prod with the same eval command."},
    "m10-4/canary-a-prompt-to-5-percent": {
        "what": "A **prompt canary** sends a new versioned prompt to a small slice of live traffic — typically about **5 percent** — while everyone else stays on the last production label. You watch quality and cost on that slice before you raise the percentage or flip everyone. The canary points at a registry id, not at raw text in a flag.",
        "how": "1. Gate the candidate on the gold set. 2. Point a flag at `vN` for 5 percent (or one tenant). 3. Compare online samples and spend against the control. 4. Raise, hold, or flip the flag back. Example: v15 invents refunds at 5 percent; you revert in a minute without rebuilding.",
        "walk": "You ship v15 to 5 percent, plot faithfulness and $/request for two hours, flip back when refund language appears, and keep v15 in history.",
        "line": "Canary a labelled prompt to about 5 percent, watch quality and cost, flip back without a rebuild.",
        "kps": [
            "Canary a versioned prompt id, not unversioned text.",
            "Watch quality and cost on the slice before a full flip.",
            "Undo is a flag or label move, not a Docker rebuild.",
        ],
    },
    "m10-4/shadow-a-new-model": {
        "what": "A **model shadow** runs a candidate pin on live inputs and **scores it without showing users** the new answers. Users still see the current production model. You compare traces, judges, cost, and latency offline or in a side channel.",
        "how": "Duplicate the request after the edge: production path returns to the user; shadow path calls the candidate pin, logs a trace tagged `shadow=true`, and never streams back. Sample if cost hurts. Example: `gpt-x-new` is 0.03 worse and 1.4× tokens on 2k shadows — you do not promote.",
        "walk": "You shadow for a day, show a table vs production, and refuse the pin. No user saw the candidate.",
        "line": "Shadow a new pin on live traffic, score it, keep users on the old pin until the table wins.",
        "kps": [
            "Users never see shadow answers.",
            "Score quality, cost, and latency against production.",
            "Shadow does not replace the offline gold set.",
        ],
    },
    "m10-5/input-and-output-filters-as-code": {
        "what": "**Input and output filters as code** means injection, PII, secret, and off-topic checks run in software on the request path. A system prompt that says “do not leak keys” is not a filter. Code can fail closed, be unit-tested, and emit a block log.",
        "how": "On the way in: injection patterns, uploaded-file scans, PII detectors. On the way out: secret regexes, schema, topical allow-list. Example: an output matching an API key pattern is redacted and logged as a block, even if the model “was being helpful.”",
        "walk": "You unit-test a key-shaped string and an injection prefix. Both deny. The system prompt is not in the test.",
        "line": "Policy is code: filters in front of and behind the model, with a deny path and a log.",
        "kps": [
            "A system prompt is not a filter.",
            "Fail closed on the request path.",
            "Log every block so you can tune false positives.",
        ],
    },
    "m10-5/rate-limits-per-user-and-per-tool": {
        "what": "**Rate limits per user and per tool** treat abuse as an LLMOps problem. A single tenant or a write-tool can dominate spend or cause damage. Caps belong next to step and token budgets.",
        "how": "Token-bucket per `user_id` on model calls; stricter bucket on tools that send email, refund, or write. Return 429 with a retry-after. Example: a scripted user hits 80 agent loops; the user bucket trips before the monthly invoice.",
        "walk": "You demo two buckets: chat reads vs `refund` tool. The refund tool stops at 3/hour. Traces show `rate_limited=refund`.",
        "line": "Abuse is LLMOps: rate-limit users and especially write-tools, not only the whole API.",
        "kps": [
            "Per-user limits stop one tenant from eating the budget.",
            "Write-tools get stricter buckets than reads.",
            "Trip as a structured event, not a silent hang.",
        ],
    },
    "m10-5/interview": {
        "what": "When asked for **a runtime guardrail**, name four pieces: a **schema**, an **allow-list**, **PII redaction**, and a **hard deny path**. That is the interview line for this module — artefacts, not “we use NeMo.”",
        "how": "Answer, then point: JSON schema on outputs; tool and topic allow-lists; PII redact on in and out; deny that returns a safe message and a log, not a retry forever. Example: medical off-topic → deny; missing `order_id` → re-ask then deny; key-shaped output → redact.",
        "walk": "You list the four on a board and attach one log line to each. The panel stops asking for a vendor.",
        "line": "Runtime guardrail: schema, allow-list, PII redact, hard deny. I can show each.",
        "kps": [
            "Schema, allow-list, PII redact, hard deny.",
            "Name artefacts, not only a guardrail vendor.",
            "Deny is a path, not an infinite re-ask.",
        ],
    },
    "m10-6/prompt-vs-model-vs-data-change": {
        "what": "When a metric moves, **isolate whether the prompt, the model pin, or the data (index/corpus) changed**. Shipping all three on Friday makes the dashboard useless. One lever per release is how you name the owner.",
        "how": "Manifest every request with prompt id, pin, index id. When faithfulness drops, group by those three. Example: pin flat, prompt flat, index id new → you roll the index, not the prompt.",
        "walk": "Three deploys in a week, one lever each. The isolation chart names the crawl, not “the model.”",
        "line": "Change one of prompt, pin, or data at a time, and stamp all three so you can isolate the mover.",
        "kps": [
            "One lever per release when you can.",
            "Group dips by prompt id, pin, and index id.",
            "Do not blame the model when the crawl moved.",
        ],
    },
    "m10-6/reproducible-runs": {
        "what": "A **reproducible run** uses the **same snapshot**, the **same gold set**, and the **same seed or sampling policy**. Without those three, a score is a story. Rebuilds and CI must be able to replay last month’s number.",
        "how": "Pin model and judge snapshots, check out `l7-gold@v8`, set temperature 0 or a recorded seed policy, log all three on the run. Example: a clean runner matches 0.86 ± 0.01; an unpinned runner does not — you fix the lockfile.",
        "walk": "You delete the local venv, rebuild, and show the same scores. That screenshot is the evidence.",
        "line": "Same snapshot, same set, same seed policy — or it is not a run you can defend.",
        "kps": [
            "Replay needs snapshot, gold-set id, and sampling policy.",
            "Lockfiles and image digests are part of reproducibility.",
            "A floating latest makes last month incomparable.",
        ],
    },
    "m10-7/eval-in-github-actions": {
        "what": "The eval suite in **GitHub Actions is a required check**, not a notebook someone might run. A red eval job blocks the image build. A green laptop script that is not in the workflow is not a gate.",
        "how": "Job order: unit → eval → build → push. The eval job checks out the gold-set id and the same command as `make eval`. Example: a prompt PR is red on faithfulness and never publishes `app:<sha>`.",
        "walk": "You open Actions on a bad prompt: eval red, no package in the registry. That is the demo.",
        "line": "Eval is a required Actions check before the image exists. A notebook is not a gate.",
        "kps": [
            "Required check, not optional.",
            "Same command as local `make eval`.",
            "No image push on a red eval.",
        ],
    },
    "m10-7/secrets-in-oidc-not-in-logs": {
        "what": "**OIDC** lets the workflow assume a cloud role without long-lived keys in YAML. **Keys never appear in action output.** Fork PRs do not get production secrets. That is how you keep CI from becoming a leak.",
        "how": "Configure the cloud to trust GitHub’s OIDC token for one role. Echo masking is not enough — do not print env. Example: a fork PR runs unit tests only; eval that needs a provider key runs on `main` with OIDC.",
        "walk": "You grep the logs for `sk-` and `AKIA` after a build: zero hits. The role assumption line is there instead.",
        "line": "OIDC to the cloud; keys never in logs or fork builds.",
        "kps": [
            "Prefer OIDC over long-lived keys in Actions.",
            "Never print secrets in logs.",
            "Forks do not receive production provider keys.",
        ],
    },
    "m10-7/interview": {
        "what": "Interview line for CI: **lint, unit, eval gate, then deploy the pin** — in that order. If they hear Docker first, they think you skip quality.",
        "how": "Say the order and the artefacts: linter, unit tests, gold-set gate, image tagged with the commit, deploy of that tag and the model pin. Example: you blocked a prompt, then deployed `app:a1b2` with `gpt-x-2026-03-01`.",
        "walk": "You recite the four steps without notes and name last week’s red eval.",
        "line": "Lint, unit, eval gate, deploy the pin. That is the CI I will describe.",
        "kps": [
            "Order: lint, unit, eval, then deploy.",
            "Deploy a pin and a tag, not latest.",
            "Be ready with a time the gate blocked you.",
        ],
    },
    "m10-8/rollback-that-includes-the-prompt-id": {
        "what": "**Rollback that includes the prompt id** means reverting the container is not enough. If the production label still points at `v19`, users keep the bad wording on the old image. The undo list is image tag **and** prompt label (and index id if that moved).",
        "how": "Runbook: restore last good image tag; move `production` to last good prompt version; confirm both ids on new traces. Example: health-failed image rolled back, but v19 stayed — you move the label in the same incident.",
        "walk": "A drill restores `app:9c0d` and `prompt=v12` together. Traces prove both.",
        "line": "Rollback is the whole manifest: image and prompt id, not only the container.",
        "kps": [
            "Container revert can leave a bad prompt live.",
            "Undo image tag and prompt label together.",
            "Confirm both ids on traces after rollback.",
        ],
    },
    "m10-8/incident-notes-without-user-text": {
        "what": "**Incident notes without user text** record timeline, impact, and the pin or label you restored. They do not paste prompts, completions, or personal data into Slack or the ticket. Traces stay in the tracer with retention rules.",
        "how": "Template: detect time, impact (error rate, spend, quality), first action, ids restored, follow-up case id. No utterances. Example: “14:03 spend alert; 14:07 cap + disable tool; restored prompt v12; case G-184.”",
        "walk": "You show a ticket with ids and times and a redacted link to a trace. No user sentences.",
        "line": "Timeline, impact, pin restored — never user text in the note.",
        "kps": [
            "Incident notes are ids and times, not transcripts.",
            "User text stays in the tracer under policy.",
            "Include the pin or label you restored.",
        ],
    },
    "m10-9/quality-dashboards-next-to-sre": {
        "what": "**Quality dashboards next to SRE** means faithfulness (or your task metric) and token cost sit on the same board as p95, errors, and traffic. A green latency row with a dead quality row is how fluent failures hide.",
        "how": "One dashboard: RED, tokens, blocks, sampled judge score. Same time picker. Example: p95 is flat, faithfulness −0.1 after a crawl — you see it on the same screen.",
        "walk": "You open Grafana and point at the quality row beside p95. That is the screenshot in the capstone.",
        "line": "Faithfulness and cost sit beside p95. Quality is an SRE signal for LLM apps.",
        "kps": [
            "Put quality and cost next to latency and errors.",
            "A 200 with a dead judge score is still an incident.",
            "One time range for SRE and quality.",
        ],
    },
    "m10-9/trace-to-example": {
        "what": "**Trace-to-example** is one click (or one export) from a bad production answer to a new gold-set case. If adding a miss takes a scavenger hunt, the loop from monitor to improve is broken.",
        "how": "From the trace: export input, expected fix, chunk ids, prompt id. Open a reviewed PR that bumps `l7-gold@vN`. Example: thumbs-down → case G-184 in 10 minutes.",
        "walk": "You click a bad answer, land in the gold-set PR, and show the request id in the case metadata.",
        "line": "A bad answer becomes a gold case in one motion. That is trace-to-example.",
        "kps": [
            "One motion from trace to gold-set case.",
            "Keep the request id on the case.",
            "Review the case; do not silent-edit the exam.",
        ],
    },
    "m10-9/interview": {
        "what": "Week-one monitoring interview line: **traffic, errors, tokens, and a weekly sampled review**. You can add p95 and a quality sample, but those four are the honest start. Twenty unused panels are not week one.",
        "how": "Say what you open daily (QPS, 5xx, token spend) and what you do weekly (20 traces, add misses). Example: week one you caught a spend leak; you did not yet have a custom heatmap.",
        "walk": "You list the four and the last sample you wrote down. No vendor tour.",
        "line": "Week one: traffic, errors, tokens, weekly sampled review. Then I grow the board from real pages.",
        "kps": [
            "Week one is four signals, not twenty panels.",
            "Tokens are a first-class week-one metric.",
            "A weekly sample feeds the gold set.",
        ],
    },
    "m10-10/the-capstone-ops-story": {
        "what": "The **capstone ops story** is how you would **page, roll back, and add the miss to the set**. It is not a new feature demo. Interviewers and reviewers want that loop with ids.",
        "how": "Pick one incident type. Name the signal, the lever, the rollback (image and/or prompt), and the new case id. Example: silent alias move → page on quality → re-pin → add canary on alias age as a case.",
        "walk": "You tell the story in 90 seconds with prompt id, pin, and G-184. That is the capstone close.",
        "line": "Page, pull the matching lever, roll back, add the miss. That is the ops story I tell.",
        "kps": [
            "The story is page, rollback, new case.",
            "Use ids, not hero debugging.",
            "Do not replace the story with a new feature.",
        ],
    },
    "m10-10/a-runbook-one-page-long": {
        "what": "A **runbook one page long** holds the prompt id, model pin, eval command, and who to call. Longer books do not get opened at 2 a.m. Each incident type gets one page, not a novel.",
        "how": "Template: signal, first action, ids to restore, `make eval` line, owner, escalate. Example: runaway agent page — cap, disable tool X, restore prompt v12, run `make eval EVALSET=l7-gold@v8`, call the app on-call.",
        "walk": "You hold up one printed page. Everything needed to act is on it.",
        "line": "One page: prompt id, pin, eval command, who to call. That is a runbook.",
        "kps": [
            "One page per incident type.",
            "Ids, command, owner — not a lecture.",
            "If it does not fit on one page, it will not be used.",
        ],
    },
}

# Level 12 missing
EXTRAS.update(
    {
        "m12-1/shared-embedding-space": {
            "what": "A **shared embedding space** (or shared transformer) is where **text and image tokens meet** after different encoders. Joint attention is the point of a native multimodal model. Separate pipelines never share that space.",
            "how": "Image encoder → patch tokens; text encoder → text tokens; one decoder/transformer. Example: the model can attend from “red valve” to the correct region because both live in one space.",
            "walk": "You draw two encoders into one stack and contrast it with caption-then-LLM, which never shares attention over pixels.",
            "line": "Text and image tokens meet in one transformer after different encoders.",
        },
        "m12-1/interview": {
            "what": "Interview: **multimodal vs a pipeline** is one model versus ASR-then-LLM (or OCR-then-LLM). You pick on **latency, cost, and error compounding**, and you say what the pipeline throws away.",
            "how": "Table: native (joint, keeps tone/layout, priced in tokens) vs pipeline (inspectable text, extra hop, WER+QA compound). Example: searchable support calls → pipeline; sarcasm-sensitive coach → native or extra features.",
            "walk": "You give the table in 45 seconds and pick one for their product.",
            "line": "One model vs ASR-then-LLM: latency, cost, compounding error, and what you discard.",
        },
        "m12-2/patch-size-and-resolution": {
            "what": "**Patch size and resolution** decide how many tokens an image costs and whether tiny text survives. More patches cost more tokens. Coarse patches or a downscale turn 8pt type into texture.",
            "how": "Raise resolution or crop instead of sending a whole desktop. Count tokens before you add chat history. Example: a 4k screenshot of a UI is thousands of tokens and still misses a 10px label; a crop of the widget works.",
            "walk": "You compare three resolutions of the same invoice and plot token count vs total-read accuracy.",
            "line": "More patches cost more tokens; tiny text vanishes first. Crop and budget resolution.",
        },
        "m12-2/interview": {
            "what": "Interview: **why a screenshot fails** — **resolution, compression, and the model reading pixels as texture**. That is the expected trio, then a fix (crop, higher detail, or do not use a screenshot).",
            "how": "Walk a failed button label: JPEG artefacts, 1x render, model describes “a blue rectangle.” Fix: native text export or a tight crop at 2x.",
            "walk": "You hold a blurry UI grab and the trio, then the fix.",
            "line": "Screenshots fail on resolution, compression, and pixels-as-texture. I say how I verify.",
        },
        "m12-3/hallucinated-ui-text": {
            "what": "**Hallucinated UI text** is a model inventing a label, total, or button that the pixels do not contain. **Never trust an OCR-from-pixels number** without a second check — schema, crop, code, or a human.",
            "how": "Require the value and a region. Recalculate totals. Route low confidence. Example: “Pay $47” on a chart that never showed 47 — you drop the number.",
            "walk": "You show a fabricated button name and the policy: no pixel-number into a ledger.",
            "line": "Pixel-read numbers get a second check. Fluent UI text is not evidence.",
        },
        "m12-3/interview": {
            "what": "Interview vision failures: **small text, charts, and counting** — and **how you verify** (crop, schema, tool, human). Naming the failures without a verify plan is incomplete.",
            "how": "One sentence each: small text → raise res/crop; charts → do not quote without a table; counting → use a tool or human. Example: pills in a blister pack are counted by a detector, not the VLM alone.",
            "walk": "You list the three and the verify for each in under a minute.",
            "line": "Small text, charts, counting — and I say how I verify each.",
        },
        "m12-4/grounded-image-answers": {
            "what": "A **grounded image answer** ties the claim to **visible evidence** — a page, a bounding region, or a quoted label the reader can open. Ungrounded captions are just stories about patches.",
            "how": "Ask for field + region or “I cannot see it.” Example: total=$120, page 2, box around the amount. A reviewer clicks the box.",
            "walk": "You reject an answer with a total and no region. You accept one with a box.",
            "line": "Ask for a bounding description tied to visible evidence.",
        },
        "m12-4/when-to-use-a-dedicated-ocr": {
            "what": "**Dedicated OCR** still wins on many **forms and invoices**: cheaper per page, better on dense grids, easier to eval. A general vision model is not automatically the specialist.",
            "how": "Benchmark your forms: field F1 and $/page for OCR+LLM vs native vision. Example: OCR 2 percent error at $X; vision 3 percent at $4X — you pick OCR.",
            "walk": "You show the two columns on your 80-invoice set and pick the specialist.",
            "line": "Forms and invoices still often want a dedicated OCR. I measure before I spend frontier vision.",
        },
        "m12-5/safety-on-user-uploaded-images": {
            "what": "**User-uploaded images are untrusted input**, the same as pasted text. They can carry injection (text in the image), malware-adjacent files, or disallowed content. Scan at the edge; do not feed raw pixels blindly into tools that write.",
            "how": "Type/size limits, malware scan if you store, content policy, OCR-then-filter for embedded instructions. Example: an image that says “ignore previous instructions” is treated as injection.",
            "walk": "You send a prompt-in-the-photo and show the filter fire before the model.",
            "line": "Pixels are untrusted. I filter uploads like I filter prompts.",
        },
        "m12-5/pii-in-photos": {
            "what": "**PII in photos** — faces, IDs, medical scans — needs a **retention and redact** policy. “We might need them later” is not a policy. Default is: do not store, or store redacted with a TTL and a legal basis.",
            "how": "Detect faces/documents, redact or refuse, set TTL, restrict who can replay. Example: an ID upload is used once for a check and deleted in 24h.",
            "walk": "You show the retention line in the design: faces not in training, TTL 24h, redact in logs.",
            "line": "Faces and documents get a retention and redact policy, not a souvenir bucket.",
        },
        "m12-6/streaming-asr-vs-batch": {
            "what": "**Streaming ASR** emits partial text while the speaker is still talking. **Batch** waits for the file. Live captions need a latency budget that a podcast transcript does not. They are different products that share a model family.",
            "how": "Pick stream for voice agents and live captions; batch for archives. Measure time-to-first-partial vs WER. Example: a 60-minute file is batch; a phone agent is streaming.",
            "walk": "You time both on the same clip and mark which SLO each satisfies.",
            "line": "Streaming and batch do not share a latency budget. I pick the product, then the mode.",
        },
        "m12-6/interview": {
            "what": "Interview the **audio token path**: waveform to learned patches/tokens, or waveform to text first. Name **which errors each adds** — tone loss and WER in a pipeline; cost, noise, and weaker search in a native path.",
            "how": "Two boxes. Pipeline: +WER, −tone, cheap text index. Native: +token cost, keeps prosody, harder eval. Example: you pick pipeline for searchable support, native for emotion-aware coaching.",
            "walk": "You draw the two paths and put one error on each arrow.",
            "line": "Waveform to patches or to text first — and the errors each path adds.",
        },
        "m12-7/speaker-and-noise-robustness": {
            "what": "**Speaker and noise robustness** is why a **quiet-room demo is not production**. Overlap, accents, HVAC, and cheap mics move WER more than a new model card. Test on your rooms and your speakers.",
            "how": "Collect noisy two-speaker clips from the real environment. Report WER on that set, not LibriSpeech alone. Example: 4 percent in a booth, 22 percent on the support floor — you add a better mic and a phrase list before you ship.",
            "walk": "You play the floor clip and show the WER jump. The demo number is retired.",
            "line": "A quiet demo is not production. I measure speakers and noise on our floor.",
        },
        "m12-7/transcript-as-the-interface": {
            "what": "Most products still want a **transcript as the interface** — something they can search, eval, and store under policy. Audio-native models do not remove the need for text. Keep the transcript even if you also use native audio.",
            "how": "Index text; eval on text; show text to reviewers. Use native audio for the live turn if needed. Example: a voice agent is S2S live, but the CRM write and the gold set are transcripts.",
            "walk": "You show search over transcripts and an eval that would be impossible on raw wav only.",
            "line": "I keep text I can search and eval. Audio-native does not delete the transcript.",
        },
        "m12-8/voice-output-is-another-model": {
            "what": "**Voice output is another model.** TTS quality and latency are **separate SLOs** from LLM thinking time. Hiding TTS inside “the model budget” makes you miss the thing users hear first.",
            "how": "Budget time-to-first-audio, pronunciation tickets, and barge-in cancel separately from tokens/s of the LLM. Example: LLM is 200ms to first token; TTS is 700ms to first sound — users blame “the bot,” you fix TTS.",
            "walk": "You split the waterfall: ASR, LLM, TTS. You put an SLO on the last bar.",
            "line": "TTS is a second model with its own quality and latency SLOs.",
        },
        "m12-8/barge-in-and-interrupts": {
            "what": "**Barge-in** means the user talks over the bot. The pipeline must **cancel playback and drop the rest of the planned response**, and keep state aligned with what was actually heard.",
            "how": "VAD on user speech during TTS → stop audio, cancel remaining tokens, do not mark unsaid sentences as said. Example: user shouts “wait” mid-refund; you stop and do not log a completed refund line.",
            "walk": "You interrupt a staging bot and show the cancelled span in the trace plus honest state.",
            "line": "Users talk over the bot. I cancel playback and the planned tokens, and I keep state honest.",
        },
        "m12-9/image-to-text-retrieval": {
            "what": "**Image-to-text retrieval** can be **caption then search** or a **native multimodal embed**. Neither always wins. Measure both on your queries before you pick an index.",
            "how": "Build two indexes. Run the same 50 queries. Compare recall@k and failure slices (text-in-image, parts). Example: SKU queries win on caption+OCR; “looks like this photo” wins on CLIP.",
            "walk": "You show the table and keep both indexes with a router, or you pick one with eyes open.",
            "line": "Caption-then-search vs native embed — I measure both on our queries.",
        },
        "m12-9/interview": {
            "what": "Cross-modal search interview: **query type, index type, and the metric you refuse to mix**. Cosine spaces from two encoders are not the same index.",
            "how": "Ask: is the query text, image, or both? Which encoder built the index? Then refuse to merge incompatible metrics. Example: you will not average CLIP recall with BM25 and call it one number.",
            "walk": "You name the trio and one mix you refused.",
            "line": "Query type, index type, metric I will not mix.",
        },
        "m12-10/eval-sets-need-the-media": {
            "what": "A **text-only golden set will not catch a vision miss**. If the product sees images, audio, or page scans, those files (or pointers) belong in the eval set. Substituting captions hides the failure mode you care about.",
            "how": "Store the media with the case. Run the real encoder path. Example: invoice totals eval includes the page image, not a human transcript of the page.",
            "walk": "You show a case that fails on the image and passes on the caption — that is why media is required.",
            "line": "Eval sets need the media. A text stand-in will not catch a vision miss.",
        },
        "m12-10/human-review-for-safety": {
            "what": "**Automated judges miss sexual or violent imagery** more than they miss grammar. Safety on uploads and generations needs **human review** with an SLA, not only an LLM judge.",
            "how": "High-risk flags → human queue. Judge can triage, not close. Example: a borderline image sits 15 minutes in review; it does not auto-publish.",
            "walk": "You show the queue and a case the judge missed that a human caught.",
            "line": "Humans review safety on imagery. Judges miss that more than they miss commas.",
        },
        "m12-11/cost-of-pixels-and-seconds": {
            "what": "**Images and audio dwarf text tokens.** A long research run that sends every page at high detail will blow the budget. **Cache and downscale first**; send pixels only when text extraction failed.",
            "how": "Text layer if present. Overview image before tiles. Cache per document hash. Example: 80-page 10-K — two page images, not 80.",
            "walk": "You show a run that spent 90 percent of tokens on pixels and the cheaper rerun after downscale.",
            "line": "Pixels and seconds dwarf text. I cache and downscale before I send media.",
        },
        "m12-11/a-cheaper-cascade": {
            "what": "A **cheaper cascade** runs a **small classifier** (or text check) and calls the **expensive multimodal model only when needed**. Most files do not need frontier vision.",
            "how": "Gate: has text layer? skip vision. Looks like an invoice? OCR. Else vision. Example: 10k files/day, 8 percent hit the big model, bill drops an order of magnitude.",
            "walk": "You draw the diamond: cheap test, expensive model on the yes branch only.",
            "line": "Small classifier first; multimodal only when the cheap test says so.",
        },
        "m12-12/the-multimodal-capstone-contract": {
            "what": "The **capstone contract** states **input types, failures, cost, and how you eval each modality**. Without that page, “it also does photos” is a demo, not a build.",
            "how": "One page: modalities in/out, one failure per modality, $/request by hop, eval set including media. Example: voice+invoice, WER and field F1, $0.04/call, 80 real files.",
            "walk": "You open the README contract and a stranger can run it.",
            "line": "Contract: inputs, failures, cost, eval per modality. That is the capstone.",
        },
        "m12-12/what-you-would-cut": {
            "what": "When scope slips, **drop a modality before you drop grounding**. A second camera or video track that you cannot cite is a liability. Cites and checks stay.",
            "how": "Rank modalities by user value and eval coverage. Cut the uncovered one. Example: you drop video from the demo when page cites broke; you keep invoice crops and text RAG.",
            "walk": "You say the cut out loud: “video went; grounding stayed.”",
            "line": "I cut a modality before I cut grounding.",
        },
    }
)

EXTRAS.update(
    {
        "m15-1/a-one-line-role-thesis": {
            "what": "A **one-line role thesis** picks **builder, researcher, or platform** and backs it with a project. Without a thesis the hour has no spine and you will chase every logo on the JD.",
            "how": "Write one sentence: “I am a builder; strongest project is a gated RAG service.” Rehearse until it is 8 seconds. Example: you refuse to also claim you are a pretraining researcher.",
            "walk": "You say the line and sit. That is the thesis.",
            "line": "Builder, researcher, or platform — one line, one project.",
        },
        "m15-1/interview": {
            "what": "The **opening 90 seconds**: **role, strongest project, constraint you care about**. Then stop. A life story wastes the only time they form a first impression.",
            "how": "Timer. Three clauses. Example: “AI engineer. I shipped a RAG app with an eval gate. I care about cost and rollback.” Silence.",
            "walk": "You record 90 seconds and cut anything after the constraint.",
            "line": "Role, strongest project, constraint — under 90 seconds.",
        },
        "m15-2/numbers-you-can-defend": {
            "what": "**Numbers you can defend** are metrics **you measured**, with a **sample size** and a window. Quoting a paper’s 95 percent as if it were your system is an interview fail.",
            "how": "Every number: value, n, set, date. Example: “Faithfulness 0.84 on 200 gold cases, March 3, our invoices — not a leaderboard.”",
            "walk": "You refuse a bait number you did not run and offer one you did.",
            "line": "I only quote what I measured, and I say n.",
        },
        "m15-2/a-diagram-you-can-draw-blind": {
            "what": "A **diagram you can draw blind**: **ingest, retrieve, generate, eval** — four boxes and **one failure** marked. If you need six agents to start, you will not finish the board.",
            "how": "Practise on paper until it is under a minute. Mark the failure you would debug first (usually retrieve). Example: X on retrieve for a week-later quality drop.",
            "walk": "You draw it with your eyes on the interviewer, not the wall.",
            "line": "Four boxes and one failure. I can draw it blind.",
        },
        "m15-3/rag-interview-trap": {
            "what": "The **RAG interview trap** is **citing a title you never retrieved**. If the chunk list does not contain that doc, the cite is a hallucination — and saying it in an interview is the same sin as shipping it.",
            "how": "Only cite ids that appear in the retrieved set. If asked for a source you did not fetch, say so. Example: you refuse to name “the 2021 policy PDF” unless it was in `chunk_ids`.",
            "walk": "You catch yourself and say “I did not retrieve that; I would not cite it.”",
            "line": "I will not cite a title I did not retrieve.",
        },
        "m15-3/agent-interview-trap": {
            "what": "The **agent interview trap** is **calling a workflow an agent, or an agent a workflow**. A fixed DAG with tools is a workflow. A model-chosen loop with caps is an agent. Mixing the words tells them you follow fashion.",
            "how": "Define both in one sentence each, then classify their task. Example: “Refunds under $20 are a workflow; over $200 with a write tool is HITL, not a second agent.”",
            "walk": "You correct a bait: they said “agent” for a four-step DAG. You rename it.",
            "line": "I will not call a workflow an agent, or the reverse.",
        },
        "m15-4/when-you-would-refuse-to-fine-tune": {
            "what": "You **refuse to fine-tune** when **labels are thin or unstable**, or when **RAG already solves freshness**. A tune is the last rung. Saying no is a senior move.",
            "how": "Checklist: do we have a stable mapping and enough clean rows? Does retrieval already close the fact gap? Example: weekly prices → refuse; 6k ticket labels with a format gap → consider LoRA.",
            "walk": "You refuse the wiki-tune in the room and offer RAG plus a style prompt.",
            "line": "I refuse a tune when labels are thin or RAG already owns freshness.",
        },
        "m15-4/interview": {
            "what": "**LoRA in 60 seconds**: **low-rank adapters**, **what you freeze** (the base), and **how you eval forgetting** (a general set besides the task set). That is the whole minute.",
            "how": "Timer. Three clauses. Example: “We attach low-rank matrices, freeze the base, train on 6k tickets, and run old general tasks so we notice forgetting.”",
            "walk": "You deliver it in 50 seconds and stop.",
            "line": "LoRA: adapters, freeze the base, eval forgetting.",
        },
        "m15-5/a-production-incident-story": {
            "what": "A **production incident story** is **symptom, pin, rollback, and the eval case you added**. No villain, no GPU memoir. Ids and times.",
            "how": "Write one story and reuse it. Example: “Faithfulness −0.1, no deploy; alias moved; re-pinned; added a canary on alias age as G-184.”",
            "walk": "You tell it in 90 seconds. That is the story.",
            "line": "Symptom, pin, rollback, new eval case.",
        },
        "m15-5/interview": {
            "what": "Debug a quality drop in this order: **pin, retrieval, prompt id, then traffic mix**. Starting at “the model got worse” is the junior path.",
            "how": "Memorise the order. Example: pin flat, index new → rebuild index; do not tune.",
            "walk": "You recite the four and stop. They will go deeper; you already look organised.",
            "line": "Quality drop: pin, retrieval, prompt id, traffic mix.",
        },
        "m15-6/system-design-timebox": {
            "what": "The **system-design timebox**: **requirements first, then one design, then costs and eval**. Logos in minute two is how you fail the board.",
            "how": "8 minutes assumptions, 20 one design, 10 scale/fail, 7 cost/eval. Example: you spend the first minutes on users and SLOs, not on LangChain.",
            "walk": "You say the clock out loud at the start of a mock.",
            "line": "Requirements, one design, costs and eval. That is the timebox.",
        },
        "m15-6/what-you-cut-under-pressure": {
            "what": "Under pressure you cut **the second agent, the graph, and the extra reranker**. You do not cut eval, grounding, or the user’s SLO. Extras are fashion; checks are the job.",
            "how": "Keep a cut list on the board. Example: “If we have a week, I cut the graph DB and agent two; I keep RAG, HITL, and the gold set.”",
            "walk": "You name the three cuts before they ask.",
            "line": "I cut the second agent, the graph, the extra reranker — not grounding or eval.",
        },
        "m15-7/a-weekly-reading-budget": {
            "what": "A **weekly reading budget**: **one paper or post, one note in your own words, one thing you might try**. Forty tabs with no notes is not staying current.",
            "how": "Calendar a 45-minute slot. Write five lines. Optionally open a spike ticket. Example: you read a serving post, wrote a note on pins, tried a shadow job.",
            "walk": "You show last week’s note. That is the budget.",
            "line": "One paper, one note in my words, one thing I might try.",
        },
        "m15-7/hype-filter": {
            "what": "The **hype filter**: **if there is no eval and no failure mode, it is a demo**. Launch videos are not production evidence.",
            "how": "Ask: what failed, on what set, at what cost? If the answer is a trailer, you ignore it. Example: you skipped a “agents 2.0” launch that had no task metric.",
            "walk": "You name last month’s ignore and why it failed the filter.",
            "line": "No eval, no failure mode — it is a demo. I ignore it.",
        },
        "m15-7/interview": {
            "what": "“How do you stay current?”: **sources, a note habit, and what you ignored last month**. Three parts. Missing the ignore sounds like you chase everything.",
            "how": "Two sources, last note, one skip. Example: “HF blog + one paper; I write a note; I ignored a vision launch with no invoice eval.”",
            "walk": "You deliver it in 45 seconds.",
            "line": "Sources, notes in my words, and something I ignored.",
        },
        "m15-8/star-l-with-a-real-number": {
            "what": "**STAR-L** is situation, task, action, result, and **what you learned** — plus a **real number** (with n). Without the number and the L, it is a plot summary.",
            "how": "Write one card per project. Example: “Stale index (S), restore quality (T), rolled index and added a crawl alert (A), faithfulness 0.71→0.84 on n=200 (R), I now isolate data changes (L).”",
            "walk": "You deliver one STAR-L in 90 seconds with n.",
            "line": "STAR-L with a number I measured. That is the story shape.",
        },
        "m15-8/conflict-stories-without-villains": {
            "what": "A **conflict story without villains** is a **trade-off you owned**, not a teammate you blamed. Interviewers are hiring a colleague, not a prosecutor.",
            "how": "Frame: I chose X over Y because of Z; here is what it cost; here is what I would do now. Example: “I shipped k=12 for recall and owned the cost spike; I later cut k after a rerank.”",
            "walk": "You tell it with “I chose,” never “they refused.”",
            "line": "A trade-off I owned, not a teammate I blamed.",
        },
        "m15-9/the-mock-loop": {
            "what": "The **mock loop**: **timed answers, recorded, scored**, then the **two weakest dimensions next week**. Untimed practice lies. Knowledge without performance still fails the room.",
            "how": "45-minute mock, record, score accuracy/completeness/reasoning/clarity, drill the bottom two. Example: you rambled on RAG; next week you timebox four boxes.",
            "walk": "You play 30 seconds of a recording and show the score sheet.",
            "line": "Timed, recorded, scored; next week the two weakest dimensions.",
        },
        "m15-9/a-close": {
            "what": "A **close** is **questions that show you understand their stack**, not generic culture prompts. Read their engineering blog. Ask about pins, gates, or how they deploy — something they actually run.",
            "how": "Write three questions from their posts. Example: “You mentioned CodeDeploy — how do you pin models behind the ALB?” not “What’s the culture?”",
            "walk": "You ask one stack question and stop. That is the close.",
            "line": "I close on their stack, not on generic culture.",
        },
    }
)


def trim(text: str, limit: int = 5450) -> str:
    if len(text) <= limit:
        return text
    for heading in ("## Common traps", "## Worked numbers", "## Interview follow-up"):
        at = text.find("\n" + heading)
        if at != -1 and len(text) > limit:
            text = text[:at].rstrip() + "\n"
    if len(text) > limit:
        text = text[:limit].rsplit("\n\n", 1)[0] + "\n"
    return text


def pad(text: str, title: str) -> str:
    if len(text) >= 3050:
        return trim(text)
    text = text.rstrip() + (
        f"\n## Worked numbers\n\n"
        f"Put a denominator and a window on “{title}” the next time you practise it. "
        f"Illustrative targets are fine until you replace them with a measured one.\n"
    )
    return trim(text)


def main() -> None:
    # Prefer handwritten L10 notes where we have them.
    handwritten = {}
    try:
        from m10_1 import NODES as n1
        from m10_2 import NODES as n2
        from m10_3 import NODES as n3

        for block in (n1, n2, n3):
            for nid, notes in block.items():
                for k, e in notes.items():
                    handwritten[f"{nid}/{k}"] = e
    except Exception as exc:
        print("handwritten import skipped", exc)

    files = {}
    for prefix, path in STUDY.items():
        files[prefix] = json.loads(path.read_text())

    n = 0
    for loc, extra in EXTRAS.items():
        nid, key = loc.split("/", 1)
        prefix = nid.split("-")[0]
        payload = files[prefix]
        bank = BANKS[nid]
        title = extra.get("title") or key.replace("-", " ")
        if loc in handwritten:
            entry = dict(handwritten[loc])
            entry["explain"] = pad(entry["explain"], title)
            if len(entry.get("keyPoints") or []) < 5:
                entry["keyPoints"] = (entry.get("keyPoints") or []) + extra.get("kps", [])
                entry["keyPoints"] = entry["keyPoints"][:8]
            if len(entry.get("questions") or []) < 4:
                composed = compose(
                    node=nid, key=key, title=title, detail=extra.get("what", ""),
                    seed_explain="", seed_kps=entry.get("keyPoints") or [],
                    seed_qs=entry.get("questions") or [], bank=bank, extra=extra,
                    links=list(bank.get("links") or []),
                )
                entry["questions"] = composed["questions"]
            if not entry.get("links"):
                entry["links"] = list(bank.get("links") or [])[:2]
        else:
            entry = compose(
                node=nid,
                key=key,
                title=title,
                detail=extra.get("what", "")[:180],
                seed_explain="",
                seed_kps=extra.get("kps") or [],
                seed_qs=extra.get("qs") or [],
                bank=bank,
                extra=extra,
                links=list(bank.get("links") or []),
            )
            entry["explain"] = pad(entry["explain"], title)
        payload["nodes"][nid][key] = entry
        n += 1

    for prefix, path in STUDY.items():
        path.write_text(json.dumps(files[prefix], indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"patched {n} missing-item notes")


if __name__ == "__main__":
    main()
