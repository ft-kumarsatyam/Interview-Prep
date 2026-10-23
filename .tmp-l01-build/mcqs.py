"""Append two new MCQs per L0/L1 module. Does not edit existing items."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def mcq(id: str, node: str, level: int, q: str, options: list[str], answer: int, why: str) -> dict:
    return {"id": id, "node": node, "level": level, "q": q, "options": options, "answer": answer, "why": why}


L0 = [
    mcq(
        "m0-1-6", "m0-1", 0,
        "A FastAPI worker prints exceptions with print(e). Why is that a production problem?",
        [
            "Prints skip request ids and levels, so you cannot search or alert on one failed request",
            "print is slower than logging and will always time out",
            "print cannot show a traceback",
            "Python forbids print inside async functions",
        ],
        0,
        "Structured logs carry request_id, level and a searchable message. print goes to mixed stdout and drops the fields on-call needs.",
    ),
    mcq(
        "m0-1-7", "m0-1", 0,
        "A teammate's pytest fails only on CI with a missing package that works on their laptop. First check?",
        [
            "Delete pyproject.toml and pip install whatever is on PyPI today",
            "Confirm CI installs from the committed lockfile, then add a regression test for the import",
            "Pin Python by editing the Dockerfile FROM line to latest",
            "Switch the test to a mock so CI stays green",
        ],
        1,
        "Reproduce from the lockfile, then lock the missing dep and keep a test that imports it. Memory installs and skipped tests hide the break.",
    ),
    mcq(
        "m0-2-8", "m0-2", 0,
        "A client retries POST /orders after a timeout and creates two rows. Which design prevents that?",
        [
            "Switch the route to GET so caches can replay it",
            "Return 200 for every timeout",
            "Require an Idempotency-Key and replay the first stored response",
            "Increase the load-balancer timeout only",
        ],
        2,
        "A stored key plus the first response makes retries safe. GET-for-create and longer timeouts do not stop duplicates.",
    ),
    mcq(
        "m0-2-9", "m0-2", 0,
        "What should every 4xx/5xx JSON error body include so clients and logs stay aligned?",
        [
            "A stable code, a human message, and a request id",
            "The full Python traceback and local variables",
            "Only an HTTP reason phrase in the body",
            "A random HTML error page for browsers",
        ],
        0,
        "A consistent {code, message, request_id} lets clients branch and lets you grep one request. Tracebacks leak internals; HTML breaks API clients.",
    ),
    mcq(
        "m0-3-8", "m0-3", 0,
        "An async FastAPI handler calls requests.get(url) and p99 latency collapses under load. Best fix?",
        [
            "Add more uvicorn workers until the event loop recovers",
            "Use an async HTTP client, or run the blocking call in a thread",
            "Catch the timeout and return 200",
            "Remove type hints so the handler is faster",
        ],
        1,
        "requests blocks the event loop. httpx.AsyncClient or asyncio.to_thread keeps other requests moving. Extra workers paper over one stall.",
    ),
    mcq(
        "m0-3-9", "m0-3", 0,
        "You need a FastAPI test that the create route returns 409 on a duplicate title. What belongs in the test?",
        [
            "A live production URL and a sleep",
            "A screenshot of Swagger",
            "The TestClient, two POSTs with the same title, and an assert on 409 and the error shape",
            "A comment that you clicked the route once",
        ],
        2,
        "TestClient hits the app in-process. Assert status and body. Manual clicks and production URLs are not a regression test.",
    ),
    mcq(
        "m0-4-6", "m0-4", 0,
        "A hotfix ALTER TABLE ran by hand on production. What did the team skip?",
        [
            "A reviewed, versioned migration that can roll forward in every environment",
            "A bigger connection pool",
            "An ORM model rename",
            "Turning off foreign keys forever",
        ],
        0,
        "Schema changes are artefacts: written, reviewed, applied in order. Hand ALTERs drift staging and cannot be replayed safely.",
    ),
    mcq(
        "m0-4-7", "m0-4", 0,
        "Each request opens a new Postgres connection and the database hits max_connections. What is missing?",
        [
            "A longer SQL timeout",
            "A pool sized for the worker count, reused across requests",
            "A second primary key on every table",
            "Moving credentials into the Dockerfile",
        ],
        1,
        "Opening a connection per request exhausts the server. Pool to the process, size it from workers times connections-per-worker.",
    ),
    mcq(
        "m0-5-6", "m0-5", 0,
        "A bug appeared between last week's good tag and HEAD. Which Git move finds the first bad commit cheapest?",
        [
            "Delete the repo and re-clone",
            "force-push main to the old tag",
            "git bisect between the good tag and HEAD, testing each step",
            "Squash all commits so the bug disappears from history",
        ],
        2,
        "Bisect binary-searches history. Force-pushing shared main and rewriting history hide the evidence and break everyone else.",
    ),
    mcq(
        "m0-5-7", "m0-5", 0,
        "You would reject a PR in review. Which reason is strongest at this level?",
        [
            "It commits a .env with the database password and has no test for the new branch",
            "The author used spaces instead of your favourite quote style",
            "The branch name is not poetic",
            "It adds type hints",
        ],
        0,
        "Secrets and missing tests are merge blockers. Style nits are not the interview answer.",
    ),
    mcq(
        "m0-6-9", "m0-6", 0,
        "An agent opens a 400-line diff. What is the review standard?",
        [
            "Accept it if the agent said the tests passed",
            "Treat it as an untrusted PR: read the diff, run tests, hunt secrets and skipped edges",
            "Merge it to save time, then review on main",
            "Ask the agent to summarise instead of reading the diff",
        ],
        1,
        "Model output is untrusted. Diff, tests, secrets and edges come before merge — the same bar as a human PR.",
    ),
    mcq(
        "m0-6-10", "m0-6", 0,
        "You want an assistant to fix a failing unit test. What do you paste first?",
        [
            "Fix it, thanks",
            "The whole repository zip",
            "The traceback, the assertion you intended, and the file that should change",
            "A request to rewrite the test until it passes",
        ],
        2,
        "Failing tests plus the intended assertion give a closed loop. Vague prompts and rewriting the test to stay green hide the bug.",
    ),
    mcq(
        "m0-7-7", "m0-7", 0,
        "The platform sends traffic while the app is still opening its database pool. Which probe is missing?",
        [
            "A readiness check that fails until dependencies accept connections",
            "A liveness check that only proves the process has a PID",
            "A bigger Docker image",
            "Binding the server to 127.0.0.1",
        ],
        0,
        "Readiness means 'safe to receive traffic'. Liveness only asks 'is the process up'. Sending traffic during boot causes 5xx.",
    ),
    mcq(
        "m0-7-8", "m0-7", 0,
        "A deploy used image: myapp:latest and yesterday's bug came back. Why?",
        [
            "latest is a Docker reserved word that always means the first build",
            "latest is not a pin; a later push can move the tag to another digest",
            "Docker ignores tags in production",
            "latest forces a rebuild on every request",
        ],
        1,
        "Pin a version tag or digest. latest moves when someone pushes again, so rollbacks and audits cannot reproduce the image.",
    ),
]

L1 = [
    mcq(
        "m1-1-5", "m1-1", 1,
        "You call a chat API with no tools enabled. What is the model actually using?",
        [
            "A frozen function over weights; it does not browse the live web",
            "A live scan of the provider's training cluster",
            "A SQL index of every document it was trained on",
            "Your company's intranet by default",
        ],
        0,
        "The API exposes trained weights. Fresh facts need a tool or retrieval you add. Training data is not a queryable database.",
    ),
    mcq(
        "m1-1-6", "m1-1", 1,
        "Which capability do you add around an LLM rather than expecting the weights to guarantee?",
        [
            "Fluent next-token English",
            "Tool use, fresh facts, and reliable arithmetic",
            "Tokenization of the prompt",
            "Sampling a continuation",
        ],
        1,
        "Language completion is native. Tools, retrieval and calculators are product layers. Interviews want that split named.",
    ),
    mcq(
        "m1-2-5", "m1-2", 1,
        "A local model ignores system instructions but answers user turns. What is the first tokenizer issue to check?",
        [
            "Temperature is too high",
            "The GPU is too small",
            "The chat template omitted role or special tokens the model was trained with",
            "You billed input tokens twice",
        ],
        2,
        "Roles and stops are special tokens. A wrong or missing template silently drops the system channel.",
    ),
    mcq(
        "m1-2-6", "m1-2", 1,
        "You estimated cost with Model A's tokenizer and billed Model B. Why was the bill wrong?",
        [
            "All tokenizers use 4 characters per token exactly",
            "Token ids are a universal Unicode encoding",
            "Output tokens are free on Model B",
            "Tokenizers are model-specific; counts and ids do not transfer",
        ],
        3,
        "Each model has its own vocabulary. Reusing another model's count or ids misprices and can break stop logic.",
    ),
    mcq(
        "m1-3-6", "m1-3", 1,
        "What does a residual stream buy a stacked transformer?",
        [
            "Each block can add an update while the original signal still has a path through",
            "It deletes earlier layers after they run",
            "It stores the KV cache on disk",
            "It makes positional encodings unnecessary",
        ],
        0,
        "Residuals let depth refine a representation without forcing every layer to rewrite the whole vector. They are not a cache or a position substitute.",
    ),
    mcq(
        "m1-3-7", "m1-3", 1,
        "Why does a transformer need positional information?",
        [
            "Embeddings already encode word order in the token id",
            "Without position, 'dog bites man' and the reverse look like the same bag of tokens",
            "Positions replace attention scores",
            "Positions are only used at decode time",
        ],
        1,
        "Self-attention is permutation-sensitive only after positions are added. Token ids alone do not encode order.",
    ),
    mcq(
        "m1-4-7", "m1-4", 1,
        "A base checkpoint completes 'The capital of France is' well but ignores 'Answer in JSON'. What is missing?",
        [
            "More pretraining tokens only",
            "A larger embedding table",
            "Post-training: instruction / chat data on top of the base model",
            "A higher temperature",
        ],
        2,
        "Base models complete text. Instruction following is taught after pretraining (SFT and preference training).",
    ),
    mcq(
        "m1-4-8", "m1-4", 1,
        "Preference-tuning on noisy raters who reward flattery usually teaches the model to:",
        [
            "Become a better calculator",
            "Ignore the system prompt",
            "Shrink its context window",
            "Copy the raters' taste, including sycophancy and false confidence",
        ],
        3,
        "Preference data quality beats volume. Noisy or gamed labels become the model's taste.",
    ),
    mcq(
        "m1-5-6", "m1-5", 1,
        "What does speculative decoding do at a glance?",
        [
            "A cheap draft model proposes tokens; the larger model verifies them",
            "It skips prefill entirely",
            "It stores weights in the prompt cache",
            "It trains a new model per request",
        ],
        0,
        "Draft-then-verify can raise tokens/s when the draft is often right. It does not remove prefill or retrain weights.",
    ),
    mcq(
        "m1-5-7", "m1-5", 1,
        "A chat product needs low time-to-first-token; a batch job needs tokens per dollar. What is the tension?",
        [
            "They use the same optimal batch size",
            "Large decode batches raise throughput but can delay a single user's first token",
            "TTFT only depends on output length",
            "Batching is illegal on decoder-only models",
        ],
        1,
        "Throughput and interactive TTFT fight. Pick the serving batch for the product, not a generic 'bigger is better'.",
    ),
    mcq(
        "m1-6-5", "m1-6", 1,
        "You set temperature 0 and a seed, but two provider calls still differ. What is true?",
        [
            "The seed guarantees bitwise equality forever",
            "Temperature 0 deletes the sampler",
            "Seeds help debugging; they are not a correctness guarantee across batches or hosts",
            "The model is broken and must be retired",
        ],
        2,
        "Greedy plus seed is still not a contract. Batching, kernels and vendor stacks can change the token.",
    ),
    mcq(
        "m1-6-6", "m1-6", 1,
        "When should you avoid frequency / repetition penalties?",
        [
            "Brainstorming taglines",
            "Creative stories that loop a phrase",
            "Poems with a refrain you want to vary",
            "JSON or classification, where repeated keys and labels are required",
        ],
        3,
        "Penalties fight loops in prose. On schemas they scramble required keys. Use low temperature and a schema instead.",
    ),
    mcq(
        "m1-7-6", "m1-7", 1,
        "A reasoning call bills far more tokens than the user-visible answer. What happened?",
        [
            "Hidden thinking / budget tokens were generated and billed but not shown",
            "The tokenizer double-counted characters",
            "Prefill is always 10x decode",
            "The API refunds thinking tokens automatically",
        ],
        0,
        "Test-time compute can spend tokens you never display. Cap the budget and measure billed vs visible tokens.",
    ),
    mcq(
        "m1-7-7", "m1-7", 1,
        "When is extra test-time compute worth spending?",
        [
            "Every classification of a single enum",
            "Hard multi-step problems where a cheaper pass already fails your eval",
            "Health checks that must return in 5 ms",
            "Echoing a cached string",
        ],
        1,
        "Spend thinking on tasks that fail without it. Do not pay a reasoning tax on extract-and-format work.",
    ),
    mcq(
        "m1-8-5", "m1-8", 1,
        "What shares one context window on a single call?",
        [
            "Only the user sentence",
            "Only retrieved documents",
            "Instructions, history, tools, retrieved text, and reserved output tokens",
            "The provider's training set",
        ],
        2,
        "One budget. Dumping history plus tools plus docs silently truncates the answer or the rule.",
    ),
    mcq(
        "m1-8-6", "m1-8", 1,
        "A model aces a needle-in-a-haystack test but fails on a real 80-page contract. What did the needle miss?",
        [
            "That the context window exists",
            "That tokenizers work",
            "That the model can output JSON",
            "Contradictions, tables, and questions that need the whole document, not one planted sentence",
        ],
        3,
        "Needles are a smoke test that text arrived. Real long-doc work needs your own questions and keys.",
    ),
    mcq(
        "m1-9-6", "m1-9", 1,
        "Why can a fluent answer still be a hallucination?",
        [
            "Next-token sampling can be locally likely without being a retrieved fact",
            "The model always queries Wikipedia first",
            "Hallucinations only happen at temperature 1",
            "Tokenizers insert random words",
        ],
        0,
        "Likelihood is not a lookup. Confidence in the next token is not evidence. Ground or refuse.",
    ),
    mcq(
        "m1-9-7", "m1-9", 1,
        "A user says 'confirm our revenue doubled' and the model agrees without data. What failure is that?",
        [
            "A context-window overflow",
            "Sycophancy: following the user's preferred answer over evidence",
            "A KV-cache miss",
            "An MoE routing error",
        ],
        1,
        "Sycophancy is prompt-following gone wrong. Require evidence or a refuse path, especially on loaded claims.",
    ),
    mcq(
        "m1-10-7", "m1-10", 1,
        "A provider retires the snapshot you eval'd. What should already be in the design?",
        [
            "A cron that always switches to latest",
            "Hard-coded weights in the client",
            "A pin plus a re-eval job before any new snapshot is promoted",
            "Deleting the eval set so you can move faster",
        ],
        2,
        "Pins stop silent swaps. Deprecation still happens, so keep a promotion path that re-runs your eval.",
    ),
    mcq(
        "m1-10-8", "m1-10", 1,
        "Open weights under a non-commercial licence, hosted through a vendor API. What governs production use?",
        [
            "Only the Hugging Face likes count",
            "Only the parameter count",
            "Only the licence file in the repo",
            "Licence, what you may do with the weights, and the API vendor's terms — they can differ",
        ],
        3,
        "Three documents: weight licence, what hosting you chose, and the API contract. One 'open' label is not enough.",
    ),
    mcq(
        "m1-11-6", "m1-11", 1,
        "A model scores 95 on a public set and 40 on your private paraphrase of the same items. Likely cause?",
        [
            "Train-test overlap / contamination, or overfitting to the public wording",
            "Your paraphrase used fewer tokens, which always lowers accuracy",
            "Public sets are scored out of 200",
            "The model cannot read paraphrases by design",
        ],
        0,
        "Public items leak into training and blogs. Private variants are the honest score.",
    ),
    mcq(
        "m1-11-7", "m1-11", 1,
        "What is the only leaderboard that decides whether a model ships in your product?",
        [
            "The newest arena rank",
            "Your held-out task eval, plus cost and latency on that task",
            "Parameter count",
            "The vendor's blog comparison",
        ],
        1,
        "Leaderboards shortlist. Your eval, price and latency ship. Rank is advertising until it matches the task.",
    ),
    mcq(
        "m1-12-8", "m1-12", 1,
        "What belongs in a written model-choice decision log?",
        [
            "Only the winner's name",
            "A screenshot of a leaderboard",
            "Task, candidates, eval scores, cost, latency, pins, and why others lost",
            "The CEO's favourite vendor",
        ],
        2,
        "A log lets the next person re-run the choice. A name without numbers is not a decision.",
    ),
    mcq(
        "m1-12-9", "m1-12", 1,
        "The vendor moves you to a new snapshot. What do you do before promoting it?",
        [
            "Assume quality is unchanged because the name is similar",
            "Delete the old pin immediately",
            "Raise temperature to hide differences",
            "Re-run the same eval and cost/latency checks, then write the new pin or refuse",
        ],
        3,
        "Provider changes are new models. Re-evaluate; do not inherit the old decision by name.",
    ),
]


def append(path: Path, extra: list[dict]) -> None:
    items = json.loads(path.read_text(encoding="utf-8"))
    existing = {m["id"] for m in items}
    for m in extra:
        if m["id"] in existing:
            raise SystemExit(f"refusing to overwrite {m['id']}")
        items.append(m)
    path.write_text(json.dumps(items, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"appended {len(extra)} MCQs to {path} (total {len(items)})")


def main() -> None:
    append(ROOT / "data/genai-test/mcq/level-0.json", L0)
    append(ROOT / "data/genai-test/mcq/level-1.json", L1)


if __name__ == "__main__":
    main()
