from helper import note

PEFT = {"title": "Hugging Face PEFT", "url": "https://huggingface.co/docs/peft"}
VLLM = {"title": "vLLM documentation", "url": "https://docs.vllm.ai/en/latest/"}
OA_FT = {"title": "OpenAI: fine-tuning guide", "url": "https://platform.openai.com/docs/guides/fine-tuning"}
HF_TRAIN = {"title": "Hugging Face: training", "url": "https://huggingface.co/docs/transformers/en/training"}

NODES = {
    "separate-adapter-or-merged-weights": note(
        what="""A LoRA can stay a **separate adapter** loaded onto a frozen base at serve time, or you can **merge** `W' = W + (α/r)BA` into a full checkpoint. Adapters are tiny, swappable, and let many variants share one base (multi-LoRA). Merge removes adapter overhead and works with any stack, including GGUF/Ollama, but each variant becomes a full-size artefact.

Keep the unmerged adapter even if you ship merged. It is the cheap source of truth. A merged file without the adapter is how teams lose the ability to swap or to re-merge after a base patch.

Choose adapters when you iterate or multi-tenant; merge when you have one frozen model for a simple or edge runtime.""",
        why="""On the job this is a storage and rollback question disguised as a file format. Interviews will ask when you merge. "Always merge" wastes disk on twenty tenants. "Never merge" blocks Ollama and some engines.

The senior add-on: I keep the adapter either way, and I re-eval after merge because merge-plus-quant is not bit-identical.""",
        how="""Decision:

- 20 tenant tones, one 8B base → separate adapters on vLLM.
- One house classifier, ship to laptops → merge, then GGUF.
- Weekly iteration → stay unmerged until the version is boring.

Example: you merge for an Ollama demo, then delete the adapter folder to "clean up". A week later you need a second tone. You cannot cheaply fork. You still have the merged 16-bit blob, but not the BA matrices. Restore from backup if you are lucky; otherwise retrain.

Always `diff` a handful of greedy outputs before and after merge.""",
        fails="""1. **Deleting the adapter after merge.**

2. **Merging twenty variants** and paying twenty full copies.

3. **Serving unmerged on an engine that does not support LoRA.**

4. **Not re-evaluating** after merge or quant.""",
        line="I keep adapters when I swap or share a base; I merge when one frozen model must run on a simple stack. I never delete the adapter after merge, and I re-eval the merged file.",
        kps=[
            "Adapter: small, swappable, shared base.",
            "Merged: simple serving, full-size artefact.",
            "Keep the unmerged adapter as source of truth.",
            "Re-eval after merge; it is not automatically identical.",
            "Many tenants → adapters; one edge binary → merge.",
            "Do not merge just to feel finished.",
        ],
        qs=[
            {"q": "When would you merge an adapter into the base?", "a": "For a single frozen model that needs a simple runtime or GGUF/Ollama export, not for many swappable variants.", "kind": "recall"},
            {"q": "You serve 20 tenant variants. Merge or keep adapters?", "a": "Keep adapters on a shared base. Merging means 20 full copies.", "kind": "apply"},
            {"q": "You deleted the adapter after a merge. What did you lose?", "a": "Cheap forks, multi-LoRA serving, and an easy re-merge after a base tweak. The merged blob is a dead end.", "kind": "debug"},
            {"q": "Why re-eval after merge?", "a": "Numeric merge and later quantisation can move outputs. Confirm the held-out score still holds.", "kind": "recall"},
            {"q": "An engine cannot load PEFT. Options?", "a": "Merge (and maybe quantise) for that engine; keep the adapter for the engines that can load it.", "kind": "apply"},
        ],
        links=[PEFT, VLLM],
    ),
    "save-load-merge": note(
        what="""PEFT's usual path: `save_pretrained` writes adapter weights plus `adapter_config.json` (base name, rank, targets). Load the base, then `PeftModel.from_pretrained`. Merge with `merge_and_unload` on a **16-bit** (or bf16) base, then save the plain model. Do not merge into an already 4-bit body if you can avoid the extra rounding.

Save the tokenizer and chat template beside the adapter. Pin the base revision. After merge, greedy-decode a small pack and compare to the unmerged adapter. APIs move; read current PEFT docs when you do this for real.

A folder without `adapter_config.json` is not a complete artefact.""",
        why="""On the job, "I have the bin file" is how serving breaks. Interviews will ask why you merge on 16-bit and why you save the tokenizer. Those two sentences show you have exported something that ran.

This is also the reproducibility story: without config and revision, next quarter's base download will not match.""",
        how="""Checklist in the runbook:

1. Save adapter + config + tokenizer + template + dataset hash.
2. Record base `revision`.
3. Merge on bf16; do not merge on the QLoRA 4-bit view.
4. Compare 20 greedy strings to the adapter run.
5. Only then quantise for Ollama or a 4-bit server.

Example: someone merged while the model was still in 4-bit QLoRA. Outputs drifted 6/20 items. They remade the merge from a fresh 16-bit base; 20/20 matched. The first file would have been your production.""",
        fails="""1. **Merge-on-4bit** extra rounding.

2. **Forgotten tokenizer** — different BOS, different product.

3. **No greedy compare.**

4. **Unpinned base** — `from_pretrained("latest")` a month later.""",
        line="I save adapter, config, tokenizer and template together, merge on a 16-bit base, and I do not trust the merge until greedy outputs match the adapter. The config file is part of the model.",
        kps=[
            "save_pretrained + adapter_config.json + tokenizer + template.",
            "Pin the base revision.",
            "Merge on 16-bit/bf16, then quantise.",
            "Greedy-compare merged vs adapter before shipping.",
            "Do not merge into the 4-bit training view.",
            "Check current PEFT APIs; names move.",
        ],
        qs=[
            {"q": "Why merge into a 16-bit base rather than 4-bit?", "a": "Merging into quantized weights adds rounding error. Merge in higher precision, then quantise the result.", "kind": "recall"},
            {"q": "After merging, outputs differ. Checks?", "a": "Same base revision, precision, tokenizer and template; compare greedy on fixed prompts.", "kind": "debug"},
            {"q": "What files make an adapter complete?", "a": "Weights, adapter_config.json, tokenizer, chat template, and a pointer to the base revision and dataset hash.", "kind": "recall"},
            {"q": "You loaded `model-id` without a revision a month later. Risk?", "a": "The hub default moved. Your adapter may apply to the wrong body. Pin the commit.", "kind": "apply"},
            {"q": "Where do you merge relative to QLoRA training?", "a": "Reload a full-precision base, apply the adapter, merge_and_unload, then quantise for serve if needed.", "kind": "apply"},
        ],
        links=[PEFT],
    ),
    "multi-lora-serving-with-vllm": note(
        what="""**vLLM** can hold one base and many LoRA adapters in GPU memory; each request names the adapter. Continuous batching still works across adapters, so utilisation stays high. This is how you serve per-tenant or per-task variants without one deployment each.

Limits matter: max rank, how many adapters stay resident, cold-load latency, and whether target modules match what that vLLM build supports. The served base must be the one you trained on. Check current vLLM docs for flags; they move.

A request that omits the adapter name silently hits the raw base — which may be the worst failure because it looks healthy.""",
        why="""On the job this is the cost story for twenty tones. Interviews want the phrase "one base, many adapters, request picks one" plus the cold-load and mismatch risks.

It is also an isolation story: a bad adapter should not require redeploying the base.""",
        how="""1. Serve the pinned base.
2. Preload the hot adapters (prod + previous).
3. Map virtual names (`tenant-a`) to adapter paths in the gateway.
4. Log the resolved adapter id on every trace.
5. Load-test a cold adapter once so you know the hitch.

Example: 12 tenants, 8B base, rank 16. Resident adapters stay under the configured cap. A 13th rarely-used adapter cold-loads and blows p95 once an hour. You either keep it resident or you merge that tenant. You never let the gateway default to the raw base on a miss — you 404.""",
        fails="""1. **Silent fallback to the base.**

2. **Adapter trained on a different revision.**

3. **Too many residents** — OOM.

4. **Ignoring cold-load** in the SLO.""",
        line="I serve one base with many LoRAs in vLLM, I log the resolved adapter, I preload the hot set, and I fail closed if the name is missing. A silent raw-base fallback is a product bug.",
        kps=[
            "One base, many concurrent LoRAs, request selects.",
            "Cap rank and resident count; watch OOM.",
            "Adapter must match the served base revision.",
            "Cold load adds latency; preload hot ones.",
            "Do not silently fall back to the raw base.",
            "Log adapter id on every trace.",
        ],
        qs=[
            {"q": "What is the benefit of multi-LoRA serving?", "a": "Many variants share one base and GPU, with batching across them, instead of one deployment per variant.", "kind": "recall"},
            {"q": "First request to a rare adapter is slow. Why?", "a": "Cold load into GPU memory. Preload or keep it resident, or merge that variant.", "kind": "debug"},
            {"q": "A request omitted the adapter name. What should happen?", "a": "Fail closed (404/error), not silent raw-base generation. Defaulting hides a routing bug.", "kind": "apply"},
            {"q": "Adapter was trained on rev A; you serve rev B. Symptom?", "a": "Subtle or wild quality loss. Pin both sides to the same revision.", "kind": "debug"},
            {"q": "When is merge still better than multi-LoRA?", "a": "One frozen variant, or a runtime that cannot apply adapters, or a tenant whose cold-load you refuse to pay.", "kind": "apply"},
        ],
        links=[VLLM, PEFT],
    ),
    "quantized-export-for-ollama": note(
        what="""To run a tune in **Ollama** (llama.cpp): merge on 16-bit, convert to **GGUF**, pick a quant (Q4/Q5/Q8 — size and speed versus quality), write a `Modelfile` with `FROM`, template, stop tokens and system text that **match training**, then `ollama create`. Re-run the eval on the artefact. Quantisation can erase the narrow behaviour you just paid for.

Some paths load a GGUF LoRA separately; check current docs. Either way the template in the Modelfile is the usual break.

Compare two quants on your set, not on a blog's perplexity table.""",
        why="""On the job this is how a laptop demo becomes "the model" in someone's mind. If the Q4 file is worse, they will blame LoRA. Interviews want the sequence merge → GGUF → quant → Modelfile → re-eval.

Stop tokens belong in the file. A rambling Ollama model is usually a template miss, not a bad adapter.""",
        how="""1. Merge bf16, verify against the adapter.
2. Convert to GGUF; build Q5 and Q4.
3. Modelfile: exact chat template and stops from training.
4. Eval both quants on the held-out set plus the schema probe.
5. Ship the smallest quant that holds the gate.

Example: Q4 drops schema validity 4 points; Q5 holds. You ship Q5. A teammate already uploaded Q4 to a sales laptop. You retract it. The eval on the artefact is what made that possible.""",
        fails="""1. **No re-eval after quant.**

2. **Wrong template** in the Modelfile.

3. **Shipping Q4 because it is small** without a score.

4. **Merging on 4-bit then quantising again.**""",
        line="I merge, convert to GGUF, pick a quant by my eval, and I copy the training template into the Modelfile. The laptop file is not the model until the artefact matches the held-out score.",
        kps=[
            "Merge 16-bit → GGUF → quant → Modelfile → re-eval.",
            "Template and stops must match training.",
            "Compare quants on your set, not a blog.",
            "Q4 can erase a narrow tune; measure it.",
            "Do not double-quant from a 4-bit merge.",
            "Retract a demo file that failed the artefact eval.",
        ],
        qs=[
            {"q": "Steps to run a LoRA in Ollama?", "a": "Merge into 16-bit, convert to GGUF, quantise, write a Modelfile with the training template and stops, create the model, re-evaluate.", "kind": "recall"},
            {"q": "The Ollama model rambles past the answer. First check?", "a": "Template and stop tokens in the Modelfile versus training.", "kind": "debug"},
            {"q": "Q4 is half the size. Do you ship it?", "a": "Only if it holds the eval and schema probe. Size is not a gate.", "kind": "apply"},
            {"q": "Why re-eval the GGUF and not trust the adapter score?", "a": "Quantisation is a new model. Narrow skills often move first.", "kind": "recall"},
            {"q": "A sales laptop has yesterday's Q4. What process failed?", "a": "You distributed an artefact before the quant eval. Demo files need the same gate as prod.", "kind": "debug"},
        ],
        links=[PEFT],
    ),
    "managed-serverless-adapter-hosting": note(
        what="""Some platforms and inference hosts will **serve your adapter** on a shared base, billed per token, sometimes with scale-to-zero. You skip GPU ops. You accept their supported bases and ranks, their cold starts, their terms, and often their inability to export a different runtime's format.

Compare with a dedicated GPU on traffic shape (spiky vs steady), SLO, compliance, and how many adapters you have. Keep the adapter, data and eval in your storage so a host change is a reload, not a retrain.

Read whether the host quantises the base under you. That is another artefact to eval.""",
        why="""On the job this is the default for a small team with bursty tools. Interviews want the same ladder as Level 11 hosting: serverless vs dedicated vs you. Plus: I still own the files.

A host that only runs "their" LoRA format is lock-in you priced in M11.8.""",
        how="""Bake-off:

1. Upload the same adapter to the host; pin the slug.
2. Run the held-out set and the schema probe against that slug.
3. Measure cold-start p95 and cost at your daily shape.
4. Compare to a reserved L4 and to a per-token frontier.
5. Keep object-storage copies of adapter + config + eval.

Example: 2k requests/day, spiky. Host is $0.15 / 1k successes with a 1.8s cold p95. A reserved GPU is cheaper only above a utilisation you do not have. You stay hosted, you eval monthly, and you refuse a host that cannot load your PEFT folder.""",
        fails="""1. **No artefact eval on the host** (they quantised).

2. **Only copy lives on the host.**

3. **Steady 24/7 traffic** still on serverless with bad unit cost.

4. **Assuming privacy** — the host is a processor.""",
        line="I will host an adapter serverless when traffic is spiky and the host passes my eval on the real slug. I keep the files. Steady high volume with a tight SLO still wants a reserved GPU.",
        kps=[
            "Upload adapter, pay per use, no GPU on-call.",
            "Eval the host slug; they may quantise.",
            "Keep your own copy of adapter, data and eval.",
            "Spiky → serverless; steady+SLO → dedicated.",
            "Supported bases and ranks are a product constraint.",
            "The host is a processor — terms and region still apply.",
        ],
        qs=[
            {"q": "When does serverless adapter hosting fit?", "a": "Spiky or low traffic, few GPU skills, acceptable cold-start and data terms, and a passing eval on that slug.", "kind": "recall"},
            {"q": "Steady 24/7 with a tight p95. Hosting?", "a": "Likely a reserved GPU (self or dedicated endpoint). Serverless cold starts and unit price usually lose.", "kind": "apply"},
            {"q": "Host scores worse than your lab adapter. Cause?", "a": "Different quant, template or base revision. Pin the slug and compare, or leave.", "kind": "debug"},
            {"q": "The only adapter copy is on the host. Risk?", "a": "You cannot move or retrain from files you do not have. Keep object storage as source of truth.", "kind": "debug"},
            {"q": "What Level 11 question still applies?", "a": "Who sees the prompt, which region, and whether this host is an approved processor.", "kind": "recall"},
        ],
        links=[VLLM, OA_FT],
    ),
    "matching-template-tokenizer": note(
        what="""Serve with the **same tokenizer and chat template** you trained with: special tokens, BOS/EOS, role markers, system placement, stop sequences. A mismatch is the most common reason a good tune looks drunk in production. The notebook used TRL's template; the gateway used a generic ChatML; EOS never appears; the model does not stop.

Save tokenizer and template with the version. Add a **golden test**: fixed prompts whose token ids and greedy strings must match in CI against the serve stack. Check that the gateway does not inject a second system prompt.

This is boring and it saves more launches than rank sweeps.""",
        why="""On the job, "works in the notebook" is this bug. Interviews will give you endless generation or doubled roles and wait for you to say template. Say it first.

It is also a versioning problem: a tokenizer update on the hub is a different product.""",
        how="""1. Freeze `tokenizer.json` + `chat_template.jinja` in the artefact.
2. CI: render five conversations to token ids; hash must match.
3. CI: greedy generate on five prompts through the **serve** path; strings must match the trainer path.
4. Gateway config: no extra system prompt unless it was in training.
5. Staging drill: deliberately break the template once so the team knows the failure shape.

Example: prod wraps messages with a library default. Training used Llama-3 instruct. The model repeats the last user line. You point the server at the saved template; the golden test goes green. No retraining was needed.""",
        fails="""1. **Library default template** at serve.

2. **Tokenizer pulled live from the hub.**

3. **Gateway injects a system** the trainer never saw.

4. **No golden test** — you find it from users.""",
        line="I ship tokenizer and template with the adapter, I hash rendered token ids in CI, and I test greedy strings through the serve path. A notebook win with a different template is not a ship.",
        kps=[
            "Same tokenizer, template, special tokens, stops.",
            "Save them with the version; do not fetch 'latest'.",
            "Golden tests on token ids and serve-path strings.",
            "Gateways must not add a surprise system prompt.",
            "Endless generation is often EOS/template, not LR.",
            "Drill the mismatch in staging so you recognise it.",
        ],
        qs=[
            {"q": "A tune works in a notebook but not in production. Top suspect?", "a": "Template or tokenizer mismatch, including special tokens and stops.", "kind": "debug"},
            {"q": "How do you guard against template drift?", "a": "Pin tokenizer and template in the artefact and CI-compare rendered ids and greedy serve-path outputs.", "kind": "apply"},
            {"q": "The gateway adds a safety system prompt. Problem?", "a": "If it was not in training, you changed the product. Either train with it or add it as a reviewed, tested part of the template.", "kind": "apply"},
            {"q": "Why hash token ids, not only output text?", "a": "Two templates can look similar in text and still shift tokens enough to hurt a narrow tune. Ids catch that earlier.", "kind": "recall"},
            {"q": "What does a template-mismatch drill teach?", "a": "The failure shape (ramble, doubled roles, no-stop) so on-call does not start with a retrain.", "kind": "recall"},
        ],
        links=[PEFT, HF_TRAIN],
    ),
    "versioning-rollback": note(
        what="""A tune is a **versioned release**: adapter hash, base revision, dataset version, config, eval report, template, approval. Serve behind **immutable versions** and a **mutable alias** (`prod` → `router-lora@v7`). Rollback is repointing the alias to v6, which you kept loadable. Overwriting `adapter.safetensors` in place is how you lose the previous behaviour.

Keep the prompted baseline as the last-resort route. Test the rollback before you need it. Retention: keep N previous versions, not "until the disk fills".""",
        why="""On the job this is ordinary release engineering applied to weights. Interviews will ask how you roll back a bad adapter. "Redeploy the old file from my laptop" is not an answer. "Repoint the alias; v6 is still resident" is.

Lineage is also how you debug a bad answer next month.""",
        how="""1. Publish `s3://models/router-lora/v7/` as complete artefact.
2. Alias `prod` → v7 after canary.
3. Keep v6 resident for 7 days (illustrative).
4. Rollback runbook: alias → v6; page; do not overwrite v7 (you will want the corpse).
5. Quarterly: delete versions older than policy except the last known-good.

Example: v8 raises invalid JSON. You flip `prod` to v6 in one config commit. Users recover in minutes. You then diff v8's data hash and find a bad label dump. Overwrite-in-place would have destroyed v7 and v6 if someone had "cleaned up".""",
        fails="""1. **In-place overwrite.**

2. **Alias without retaining the previous object.**

3. **No baseline route** when both adapters are bad.

4. **Untested rollback.** The old path 404s.""",
        line="I publish immutable adapter versions and flip an alias. Rollback is a pointer, not a rebuild. I keep the previous version loadable and I never overwrite a file in place.",
        kps=[
            "Immutable artefacts; mutable aliases.",
            "Lineage: base, data, config, eval, template.",
            "Keep the previous version loadable.",
            "Rollback is a pointer change you have drilled.",
            "Keep a prompted baseline as last resort.",
            "Do not overwrite adapter files in place.",
        ],
        qs=[
            {"q": "Why use aliases for tuned models?", "a": "Clients stay on a stable name; promotion and rollback are pointer changes, not rebuilds.", "kind": "recall"},
            {"q": "Adapter v8 errors in prod. Immediate action?", "a": "Repoint the alias to the retained previous version, then inspect v8 with traces and eval diffs. Do not delete v8.", "kind": "apply"},
            {"q": "Someone uploaded a new file to the same path. What broke?", "a": "Immutability. You can no longer say which bytes `prod` meant yesterday. Use versioned paths.", "kind": "debug"},
            {"q": "What lineage fields belong with a version?", "a": "Base revision, dataset hash, train config, eval report, template hash, approver.", "kind": "recall"},
            {"q": "Both v7 and v8 look bad. Last resort?", "a": "Route the virtual name to the prompted baseline you still run.", "kind": "apply"},
        ],
        links=[PEFT, OA_FT],
    ),
    "gradual-rollout-via-the-gateway": note(
        what="""Roll a tune out through the **gateway**: shadow (score, do not serve), small canary (illustrative 1–5%) against the baseline as control, then ramp if abort thresholds hold. Bucket users by a stable hash so they do not flip every request. Watch quality proxies, schema validity, refusals, latency, errors and cost.

Abort thresholds are written first. Harvest canary misses into the eval. A big-bang replace is how a specialist takes down the whole assistant.

The gateway is what makes this a flag rather than a deploy.""",
        why="""On the job this is the same as any risky backend, plus a judge on a sample. Interviews want shadow → canary → ramp, control group, abort line.

It is also how you discover prompts the held-out set never saw — production is not your JSONL.""",
        how="""1. Shadow 5% for a few days; harvest.
2. Canary 2% served, 98% baseline; same judge sample.
3. Abort if schema fail +0.5pp or judge −1 or p95 +20% (illustrative).
4. Ramp 2→10→50→100 with a pause.
5. Keep the baseline route for rollback.

Example: canary at 5% shows a 2pp schema drop on mobile clients that send shorter contexts. You abort, add short-context gold, ship v9 canary clean. A Friday 100% cut would have been a weekend.""",
        fails="""1. **100% Friday cut.**

2. **No control.** You cannot tell if the outage was the tune.

3. **Random bucketing** every request — users see two personalities.

4. **No abort number** — you "watch" and freeze.""",
        line="I roll a tune through the gateway: shadow, hashed canary, ramp, pre-written abort. The baseline stays as control and rollback. A Friday 100% cut is not courage.",
        kps=[
            "Shadow, then hashed canary, then ramp.",
            "Baseline is the control and the rollback.",
            "Write abort thresholds before the canary.",
            "Stable user buckets; no per-request lottery.",
            "Harvest production misses into the eval.",
            "The gateway flip is the release mechanism.",
        ],
        qs=[
            {"q": "Describe a safe rollout for a tuned model.", "a": "Shadow, then a small hashed canary against the baseline, ramp while watching quality, schema, latency and cost against abort thresholds.", "kind": "recall"},
            {"q": "Why hash users into buckets?", "a": "So each user sees a stable variant and you can compare groups cleanly.", "kind": "apply"},
            {"q": "Canary schema fails +2pp. What does the runbook say?", "a": "Abort to 0% tune, keep baseline, then fix data or template. Do not keep 'watching'.", "kind": "debug"},
            {"q": "What does shadow add on top of the held-out set?", "a": "Live prompt shapes you never labelled. You still need the set for a controlled score.", "kind": "recall"},
            {"q": "Who is the control group?", "a": "Users still on the prompted or previous model, served in the same window.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "latency-cost-vs-baseline": note(
        what="""After serve is real, compare the tune to the prompted baseline on **TTFT, p95, throughput, and cost per successful task**. Include reserved-GPU idle and adapter overhead. A tune often wins by **shortening the prompt** (house style now in weights). It can lose if the GPU is empty or if a smaller model retries.

Measure at production token lengths and concurrency, not a batch of 8 in a notebook. Report at your volume. Revisit when volume changes; the winner can flip.

Quality-only success is incomplete once users are on the endpoint.""",
        why="""On the job this is the slide finance understands. Interviews will ask whether your 2-point win was worth a GPU. Have the unit-cost table.

This is also the honesty check on "we distilled to save money" — prove it on the served path.""",
        how="""Production scorecard, same week as canary:

| | Score | TTFT p95 | $ / 1k ok | Idle |
| Prompted giant | 91 | 1.6s | 11.40 | no |
| Served LoRA | 90 | 0.35s | 0.90 | 35% util |

You keep the LoRA. If util were 5%, you would move to a scale-to-zero host or back to the API. You also log prompt tokens: the tune dropped input from 1.6k to 220 (illustrative), which is most of the win.

Re-run the table after a traffic season.""",
        fails="""1. **Notebook latency** as the number.

2. **Per-call cost** ignoring retries.

3. **Forgetting idle.**

4. **Never rechecking** after volume changed.""",
        line="I compare the served tune to the prompted baseline on p95, TTFT and cost per successful task, including idle. A shorter prompt is often the real win. An empty GPU can erase it.",
        kps=[
            "Measure the served path, not the trainer.",
            "TTFT, p95, cost per successful task.",
            "Include idle and adapter overhead.",
            "Prompt shortening is a first-class saving.",
            "Recalculate when volume changes.",
            "A quality tie plus a 10× cost win is a ship.",
        ],
        qs=[
            {"q": "Why compute cost per successful task?", "a": "Retries and invalid outputs can make a cheap model expensive. Per-call hides that.", "kind": "recall"},
            {"q": "Dedicated GPU, low traffic. Risk?", "a": "Idle dominates unit cost. Consider serverless, batching, or staying on the API.", "kind": "apply"},
            {"q": "Where does a tune often save tokens?", "a": "By baking a long house instruction into weights so each call carries a short reminder.", "kind": "recall"},
            {"q": "Notebook p50 was 80ms; users see 900ms. What did you measure wrong?", "a": "Concurrency, output length, cold adapters, or network. Measure p95 on the serve path under load.", "kind": "debug"},
            {"q": "Volume 10×ed. What do you redo?", "a": "The cost table. Reserved capacity may now beat per-token, or the opposite if you over-reserved.", "kind": "apply"},
        ],
        links=[VLLM, OA_FT],
    ),
    "retraining-triggers": note(
        what="""Write **what opens a training job** before you ship: quality drift on sampled traffic, new input types or policies, base deprecation or a clearly better base, new failure tags in review, a spec/tone change, or a scheduled quarterly look. Each trigger names a metric, a window, and the eval gate the new version must pass.

Also re-test the cheap path every time. A new base plus a prompt may retire the tune. Retraining on autopilot is how you keep a pet.

Triggers are SLIs, not vibes. "It feels off" becomes a sampled judge drop over 7 days.""",
        why="""On the job, stale specialists quietly rot. Interviews will ask when you retrain. A list with numbers is the answer. "When we have time" is not.

This closes the Level 13 loop: you only tune when a measured residual exists, and you only retune when a measured trigger fires.""",
        how="""ADR block (illustrative):

- Judge on 200 sampled tickets, 7-day rolling, −2 vs ship score → job.
- Base EOL notice → job (or prompt-only if it wins).
- New product line in logs (≥5% of traffic) → label 100, then job or prompt.
- Quarterly: always re-score baseline vs tune vs new bases.

Example: a policy change lands. You do **not** immediately train. You retrieve the new policy and re-score. If facts were the miss, RAG suffices. If tone of the new templates drifts, that is a tune trigger. The trigger named the slice; it did not name the method.""",
        fails="""1. **No triggers** — the tune is immortal.

2. **Retrain on every complaint** without a window.

3. **Ignoring a new base** that would kill the need.

4. **Training for a knowledge change** that RAG should own.""",
        line="I name the metric and window that open a training job — drift, new failures, base EOL, spec change — and I re-test the cheap path every time. A tune is not a pet. Knowledge changes still go to retrieval.",
        kps=[
            "Triggers: drift, new inputs, base change, new failures, spec, schedule.",
            "Each trigger has a metric, a window and a gate.",
            "Re-test prompt/RAG/new bases on every job.",
            "Do not retrain for facts that RAG can edit.",
            "Complaints need a window, not a reflex.",
            "Immortal adapters are a process bug.",
        ],
        qs=[
            {"q": "List triggers for retraining a tuned model.", "a": "Monitored quality drop, data drift, base deprecation or upgrade, new failure tags, spec/tone change, scheduled review.", "kind": "recall"},
            {"q": "A newer base is released. What do you do?", "a": "Score prompted new base and a retrain of your recipe; pick the cheapest that meets gates.", "kind": "apply"},
            {"q": "Prices changed; PM wants a retrain. Response?", "a": "That is knowledge. Update retrieval or a tool. Retrain only if a style/format residual remains.", "kind": "debug"},
            {"q": "What makes a trigger an SLI rather than a vibe?", "a": "A named metric, a window, and a threshold written before the drop.", "kind": "recall"},
            {"q": "Weekly one-off complaints keep causing jobs. Fix?", "a": "Impose a window and a sample size. One-off noise is not a trigger.", "kind": "apply"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
    "adapter-id-in-every-trace": note(
        what="""Every generation log should carry **base model revision, adapter version, template hash** (and judge id if you scored it). A bad answer you cannot reproduce is a story. With those three fields you can reload the artefact, render the same tokens, and see whether the miss is data, template or routing.

Virtual names (`support`) are not enough. Two weeks later `support` points at v9. The complaint was about v7.

Do not put raw user text in a shared trace store if policy forbids it; keep the ids even when the payload is redacted or stored in a tighter bucket.""",
        why="""On the job this is the difference between a 20-minute repro and a shrug. Interviews will ask how you debug a bad tuned answer. "We have traces" is weak. "Traces have base, adapter, template, so I can reload v7" is strong.

It also feeds rollback: you know which version actually served the incident cluster.""",
        how="""1. Gateway writes `base_rev`, `adapter_id`, `template_sha` on every span.
2. Dashboards group error rate by `adapter_id`.
3. A `repro <trace-id>` tool loads that artefact and greedy-decodes the stored messages (if retained).
4. Redact according to policy; never drop the ids to "save space".

Example: 30 complaints on Tuesday. Grouping by adapter shows they are all v8 canary users. You rollback v8. Without the id you would have rolled back everyone or no one.

CI fails a deploy if the serve path cannot find these fields in a smoke trace.""",
        fails="""1. **Only the virtual name** in logs.

2. **Dropping ids** to shrink traces.

3. **PII in the same unredacted blob** as the ids, violating policy.

4. **No repro tool** — ids exist, nobody uses them.""",
        line="I log base revision, adapter version and template hash on every span so a bad answer is reloadable. A virtual name is not a version. I keep the ids even when I redact the text.",
        kps=[
            "Trace: base rev, adapter id, template hash.",
            "Virtual names are not enough after a flip.",
            "Group incidents by adapter id.",
            "Repro means reload that artefact.",
            "Keep ids even when payloads are redacted.",
            "CI-check that smoke traces contain the fields.",
        ],
        qs=[
            {"q": "Which three ids belong on every tuned generation trace?", "a": "Base revision, adapter version, and template hash.", "kind": "recall"},
            {"q": "Why is the virtual model name not enough?", "a": "It is remapped over time. Last week's `support` is not this week's artefact.", "kind": "recall"},
            {"q": "30 complaints, mixed traffic. How do you see if the canary is guilty?", "a": "Group by adapter id. If they cluster on the canary version, abort that version.", "kind": "apply"},
            {"q": "Policy forbids storing prompts. What do you still store?", "a": "The three ids (and timing/cost). Repro may need a tightly stored payload or a replay from an approved store.", "kind": "apply"},
            {"q": "Traces lack adapter id after a gateway change. Gate?", "a": "Fail the smoke test; do not canary a path you cannot attribute.", "kind": "debug"},
        ],
        links=[VLLM, OA_FT],
    ),
    "canary-then-promote": note(
        what="""**Canary then promote** is the rule: a new adapter serves a small hashed slice; it becomes `prod` only if eval, error rate, schema and cost hold for a written window. Promotion is an alias flip plus a record, not a feeling. Shadow can come first; 100% cannot.

The canary slice must be large enough to see a real miss rate and small enough that abort is cheap. Illustrative: 2–5% for two days, then 25%, then 100%. Abort returns the alias to the last good version.

Do not canary on the CEO only, or on "internal users" who do not look like production.""",
        why="""On the job this is how you sleep after a tune. Interviews will contrast it with "replace production at once" and with "test on the training set". The phrase is canary against a control, then promote.

It pairs with kill criteria: the canary is where those criteria get live traffic.""",
        how="""Promotion ticket template:

- Adapter version and eval pack link.
- Canary % , window, abort lines.
- Control = current prod.
- Outcome: promote / abort / extend once.
- Who watches.

Example: v9 holds offline gates. Canary 5% for 48h. Schema +0.1pp (inside noise), judge flat, p95 fine. You promote. A different week, v10 canary shows a 3pp refusal drop at hour 6. You abort at hour 6, not at hour 48. The window is a maximum, not a prison.""",
        fails="""1. **Promote because the offline set was green** and skip live canary.

2. **Canary on staff only.**

3. **No abort during the window.**

4. **Promoting Friday 5pm** with nobody watching.""",
        line="A new adapter serves a hashed canary and becomes prod only if live eval, errors and cost hold. Offline green is necessary, not sufficient. Abort early; do not wait out a bad window.",
        kps=[
            "Offline eval then live canary then alias promote.",
            "Control is the current prod.",
            "Abort lines apply during the window, not only at the end.",
            "Canary users must look like production.",
            "Promotion is a recorded alias flip.",
            "Do not cut 100% on a Friday with no owner.",
        ],
        qs=[
            {"q": "What is a sound rollout path for a new adapter?", "a": "Offline gates, then a hashed canary against current prod, then promote the alias if abort lines stay clean.", "kind": "recall"},
            {"q": "Offline set is green. Can you skip canary?", "a": "No. Production prompts are not the JSONL. Canary is the live gate.", "kind": "apply"},
            {"q": "Refusal rate drops at hour 6 of a 48h canary. Action?", "a": "Abort now. The window is a maximum. Flip the alias back and inspect.", "kind": "debug"},
            {"q": "Why not canary only on employees?", "a": "Their prompts, length and tools differ. You will miss the production miss.", "kind": "recall"},
            {"q": "What does the promotion ticket record?", "a": "Version, eval link, %, window, abort lines, outcome, watcher.", "kind": "apply"},
        ],
        links=[OA_FT],
    ),
    "template-mismatch-drill": note(
        what="""A **template-mismatch drill** is a staging exercise: serve the tune **once** with the wrong chat template on purpose, record the failure shape, and file it in the runbook. Typical shapes: no-stop ramble, doubled role tags, extra "assistant" echo, JSON wrapped in prose, refusals that vanish. The point is recognition. On-call should not start a retrain when the gateway shipped a default template.

Do this after every serve-stack change, not only after a tune. Pair it with the golden token-id test so the drill is the human complement to CI.

Write screenshots or trace snippets in the runbook. Future-you will not remember the shape.""",
        why="""On the job, this drill pays for itself the first time prod looks "randomly worse" after a library bump. Interviews love a concrete war story: "we served the wrong template; it rambled; we knew because we had drilled it".

It also trains the team that serving is part of the model.""",
        how="""1. In staging, point the server at `chat_template_wrong.jinja`.
2. Send 15 known prompts (task, schema, refusal).
3. Save outputs and traces next to the runbook.
4. Restore the correct template; confirm golden tests pass.
5. Repeat after vLLM/gateway upgrades.

Example: wrong ChatML on a Llama-3 tune. Outputs start with `<|assistant|>` twice and never EOS. On-call three months later sees the same shape after a client SDK bump. They revert the SDK, not the adapter. The drill made that a 15-minute incident.""",
        fails="""1. **Never doing it** — first time is production.

2. **Doing it and not writing the shape down.**

3. **Leaving staging on the wrong template.**

4. **Only drilling happy-path prompts.**""",
        line="I serve the tune with the wrong template in staging on purpose, I file the failure shape, and I repeat after serve-stack changes. On-call should recognise a mismatch without opening a training job.",
        kps=[
            "Wrong template in staging, on purpose, recorded.",
            "Note ramble, doubled roles, JSON wrap, refusal drift.",
            "Repeat after gateway or engine upgrades.",
            "Pair with CI token-id hashes.",
            "Restore and confirm goldens before you leave.",
            "The runbook picture is the artefact.",
        ],
        qs=[
            {"q": "What is a template-mismatch drill?", "a": "Serving the tune with the wrong template in staging, recording the failure shape, and filing it so on-call can recognise it.", "kind": "recall"},
            {"q": "Prod rambles after an SDK bump. First hypothesis from the drill?", "a": "The client or gateway is now applying a different template. Revert that, do not retrain.", "kind": "debug"},
            {"q": "When do you re-run the drill?", "a": "After serve-stack, gateway or client-template changes, not only after a new adapter.", "kind": "apply"},
            {"q": "Why include a refusal prompt in the drill?", "a": "Wrong templates can look like safety regressions. You want that shape on file too.", "kind": "recall"},
            {"q": "The drill was done but staging was left broken. Gate?", "a": "CI golden tests should fail the leave-behind. Do not rely on memory to restore.", "kind": "debug"},
        ],
        links=[PEFT, HF_TRAIN],
    ),
    "retrain-trigger-sli": note(
        what="""A **retrain-trigger SLI** is the concrete metric-and-window that opens a job: e.g. "7-day rolling judge on 200 sampled tasks ≤ ship_score − 2", or "base id EOL ≤ 30 days", or "new failure tag ≥ 5% of reviewed misses for 14 days". It turns "we should retrain" into a monitor.

Each SLI has a **source** (sampled traces, catalog notice, review queue), an **owner**, and a **next action** that still includes "try the cheap path first". An SLI that auto-starts GPU jobs without a baseline re-score will burn money.

Publish the SLIs next to the product SLO. A tune is a component with health, not a one-off science fair.""",
        why="""On the job this is how a specialist stays honest after launch. Interviews will ask for "the metric and the window". Give one. "When quality drops" is not an SLI.

It also stops thrash: one loud customer is not a 7-day rolling sample.""",
        how="""Pick two SLIs, not ten:

1. Quality: sampled judge vs ship score, 7-day window, n≥200.
2. Lifecycle: days-to-EOL on the pinned base.

Optional third: review-queue tag share.

Wire alerts to the owner, not to a training DAG. The human still runs the cheap-path compare.

Example: judge SLI fires (−2.3 over 7 days). You discover a new product SKU in 8% of tickets. You add retrieval for the SKU page; the SLI recovers without a job. A naïve auto-retrain would have baked last week's tickets — including the missing SKU — into weights.""",
        fails="""1. **SLI auto-trains** with no cheap-path step.

2. **Window of one afternoon.**

3. **No owner** — the alert is decoration.

4. **Ten SLIs**, all noisy, all ignored.""",
        line="I publish one or two retrain SLIs — a sampled quality window and a base-EOL clock — owned by a human who still tries retrieval and prompts first. A tune has health. It does not retrain itself on a single complaint.",
        kps=[
            "SLI = metric + window + source + owner.",
            "Typical: sampled judge drop; base EOL clock.",
            "Alerts a human, not a GPU DAG.",
            "Cheap path is still the first action.",
            "One complaint is not a window.",
            "Two sharp SLIs beat ten noisy ones.",
        ],
        qs=[
            {"q": "Give an example of a retrain-trigger SLI.", "a": "7-day rolling judge on ≥200 sampled tasks dropping ≥2 points below the ship score, owned by the tune's maintainer.", "kind": "recall"},
            {"q": "The SLI fires because a new SKU appeared. First action?", "a": "Try retrieval or a tool for the SKU. Do not auto-open a training job for a knowledge miss.", "kind": "apply"},
            {"q": "Why not wire the SLI straight to a training DAG?", "a": "You would skip the cheap path and bake transient or knowledge errors into weights.", "kind": "debug"},
            {"q": "What second SLI is almost always worth having?", "a": "Days-to-EOL (or deprecation notice) on the pinned base, so you retrain or re-prompt before the pin dies.", "kind": "apply"},
            {"q": "A single executive complaint lands. Is that the SLI?", "a": "No. It can start an investigation. The SLI needs a sample and a window so one voice cannot thrash the model.", "kind": "recall"},
        ],
        links=[OA_FT, HF_TRAIN],
    ),
}
