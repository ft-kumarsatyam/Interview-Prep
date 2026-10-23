"""Append two new MCQs per L2/L4 module. Does not rewrite existing items."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def mcq(id: str, node: str, level: int, q: str, options: list[str], answer: int, why: str) -> dict:
    assert 0 <= answer < len(options)
    assert len(options) in {3, 4}
    return {"id": id, "node": node, "level": level, "q": q, "options": options, "answer": answer, "why": why}


L2 = [
    mcq(
        "m2-1-5", "m2-1", 2,
        "A client retries a timed-out chat call and the tool already charged the card. What was missing?",
        [
            "A request id created before attempt one and an idempotent tool",
            "A higher temperature so the model is less likely to time out",
            "A longer system prompt about being careful with payments",
            "Switching to a cheaper model for retries",
        ],
        0,
        "Timeouts still happen. The app must send a stable request id and tools must be idempotent so a retry does not double-charge.",
    ),
    mcq(
        "m2-1-6", "m2-1", 2,
        "Finance asks why last week's token bill jumped. You logged only response.content. What is missing?",
        [
            "The system prompt, which is the only billed field",
            "A screenshot of the playground",
            "Per-request usage (prompt, completion, cached) plus model id and finish reason",
            "The raw API key so finance can open the vendor dashboard",
        ],
        2,
        "Usage and model id are how you explain a bill. Content-only logs cannot reconstruct tokens or a finish_reason of length.",
    ),
    mcq(
        "m2-2-4", "m2-2", 2,
        "A streamed assistant message is shown to the user, but you never read the final finish reason. What bug slips through?",
        [
            "Token cost becomes negative",
            "The SDK refuses to stream",
            "Tool calls cannot be named",
            "Truncated or tool-call streams are treated as complete answers",
        ],
        3,
        "Streaming does not remove finish_reason. length and tool_calls still need a branch after the last delta.",
    ),
    mcq(
        "m2-2-5", "m2-2", 2,
        "The UI paints slowly so you buffer every stream delta in an unbounded list. What is the risk?",
        [
            "TTFT becomes zero",
            "Memory grows with the response and a long answer can OOM the process",
            "The provider stops billing",
            "Finish reason is skipped automatically",
        ],
        1,
        "Slow consumers need backpressure or a bounded buffer. An unbounded stream in memory is a production incident.",
    ),
    mcq(
        "m2-3-5", "m2-3", 2,
        "A teammate says the LangChain model hallucinated. What correction do you make?",
        [
            "LangChain is the LLM, so swap the package",
            "LangChain is an orchestration layer; the weights and the hidden prompt are still the model call",
            "Runnables cannot call providers",
            "Parsers replace the need for a model",
        ],
        1,
        "LangChain is a layer, not the model. Blame the rendered prompt and the provider call, not the import.",
    ),
    mcq(
        "m2-3-6", "m2-3", 2,
        "You swap providers behind a LangChain interface and lose retries and usage logs. What did you forget?",
        [
            "That frameworks hide the vendor; you still own retries, logging, and schemas",
            "That only OpenAI can log usage",
            "That parsers store the API key",
            "That runnables forbid timeouts",
        ],
        0,
        "A common interface is not a reliability layer. Retries, logs, and schemas stay yours after a vendor swap.",
    ),
    mcq(
        "m2-4-6", "m2-4", 2,
        "The model omits a required email field that your schema marked required. First recovery?",
        [
            "Accept the object and invent an email",
            "Default in code if the product allows, or retry once with the validator error — then reject",
            "Switch to prose mode",
            "Lower the required flag in production silently",
        ],
        1,
        "Omitted required fields are a generate failure. One repair with the validator error, then reject. Do not invent PII.",
    ),
    mcq(
        "m2-4-7", "m2-4", 2,
        "A status field is a free-form string and the parser accepts 'n/a', 'N/A', and 'unknown'. What should the schema have used?",
        [
            "A longer description only",
            "JSON mode without a schema",
            "An enum (and optional/nullable if unknown is allowed) so the parser can trust the value",
            "A float",
        ],
        2,
        "Tight types beat a free-form string. Enums and optional fields are how you stop synonym drift.",
    ),
    mcq(
        "m2-5-5", "m2-5", 2,
        "This turn must call refund_preview and must not chat first. Which tool_choice do you send?",
        [
            "auto, so the model can decline",
            "none, so it writes prose",
            "required (or the named tool) so the turn cannot skip the call",
            "Omit tool_choice; schemas force the call",
        ],
        2,
        "auto can skip the tool. When the turn must call it, send required or the specific tool name.",
    ),
    mcq(
        "m2-5-6", "m2-5", 2,
        "You execute a tool but insert the result with the wrong tool_call id. What happens?",
        [
            "The provider or the model ignores the result and may call the tool again",
            "The API silently remaps ids",
            "Usage becomes free",
            "The system prompt is replaced",
        ],
        0,
        "Tool results must carry the matching call id. A mismatch drops the observation from the loop.",
    ),
    mcq(
        "m2-6-5", "m2-6", 2,
        "Arguments pass the JSON schema (amount is a number) but the unit is 'rupees' and the ledger expects cents. What check is missing?",
        [
            "A second identical tool",
            "Higher temperature",
            "Prompt-only unit hints with no code check",
            "Business validation in code before the side effect — schema-valid is not business-valid",
        ],
        3,
        "Types are not units or permissions. Validate ids and units in application code before you charge anyone.",
    ),
    mcq(
        "m2-6-6", "m2-6", 2,
        "You rewrite a tool description to be vaguer so it 'covers more cases'. Selection quality drops. Why?",
        [
            "Tool descriptions are context the model uses to choose; vague copy makes twins of every other tool",
            "Descriptions are never sent to the model",
            "Only the function name is read",
            "Shorter descriptions are billed more",
        ],
        0,
        "Descriptions sit in the prompt and drive selection. Tighten them until a stranger could implement the tool.",
    ),
    mcq(
        "m2-7-4", "m2-7", 2,
        "Intent is one of three known tickets: refund, status, or cancel. Why is a routing table better than an agent loop?",
        [
            "Agents cannot call tools",
            "A documented if/else over intent is easier to test than a free loop",
            "Routers forbid logging",
            "Agents are required once you have three intents",
        ],
        1,
        "A short, stable graph stays a workflow. An agent is for unknown graphs, not a 3-way switch.",
    ),
    mcq(
        "m2-7-5", "m2-7", 2,
        "You fan-out two lookups and one returns empty/failed. What must the join do?",
        [
            "Treat empty as success and continue",
            "Retry forever",
            "Handle the failed branch explicitly — skip, default, or fail the merge — not silently drop it",
            "Start an agent",
        ],
        2,
        "Fan-in is where empty branches become wrong answers. The join is a first-class step.",
    ),
    mcq(
        "m2-8-5", "m2-8", 2,
        "Why must a user-facing chat turn stay on the online path even if you have a batch API?",
        [
            "Batch APIs have multi-hour latency and no per-turn timeout you can show a user",
            "Batch forbids JSON",
            "Online paths cannot log usage",
            "Chat models reject online calls",
        ],
        0,
        "Overnight evals use batch. Interactive turns need an online call with a timeout the user can feel.",
    ),
    mcq(
        "m2-8-6", "m2-8", 2,
        "You must fire 1000 independent classify calls without getting banned. Which trio belongs in the design?",
        [
            "Unlimited gather, no backoff, no alarm",
            "One sync loop and no budget",
            "A shared API key in the browser",
            "A concurrency cap, jittered backoff, and a budget/rate alarm",
        ],
        3,
        "That is the interview line: cap in-flight calls, back off with jitter, and page when the spend or 429 rate jumps.",
    ),
    mcq(
        "m2-9-5", "m2-9", 2,
        "A cheaper fallback model starts returning prose instead of your JSON schema during an outage. What was missing?",
        [
            "A higher max_tokens only",
            "The same output contract (schema/tool) on the fallback as on the primary",
            "Disabling validation on fallback",
            "Retrying 401s",
        ],
        1,
        "A fallback that does not preserve the contract is a second incident. Same schema, same tool loop.",
    ),
    mcq(
        "m2-9-6", "m2-9", 2,
        "The LLM call succeeded but the tool HTTP timed out. Where does reliability logic still need to run?",
        [
            "Only in the vendor SDK",
            "Nowhere — tool failures are the model's problem",
            "At the tool/API layer too: timeout, retry map, and an error result back to the model",
            "Only in the system prompt",
        ],
        2,
        "Failures exist at both levels. A perfect chat completion with a dead tool is still a failed turn.",
    ),
    mcq(
        "m2-10-5", "m2-10", 2,
        "Tokens per request quietly triple after a prompt change. The process is healthy. What alert was missing?",
        [
            "A disk-full page only",
            "A 200 OK counter only",
            "A cost/token-per-request anomaly alert, not only process-death alerts",
            "An alert on CSS bundle size",
        ],
        2,
        "LLM bills die from tokens, not from crashed processes. Page when usage per request jumps.",
    ),
    mcq(
        "m2-10-6", "m2-10", 2,
        "You sum prompt plus completion tokens and call that the invoice. Why is that often wrong?",
        [
            "Vendors never bill tokens",
            "Cached, reasoning, or tool tokens and price tiers can differ from a raw sum",
            "Only completion tokens ever cost money",
            "Usage objects are unofficial",
        ],
        1,
        "Copy billed fields from the vendor when they exist. A naive sum misses cache discounts and extra billable channels.",
    ),
    mcq(
        "m2-11-5", "m2-11", 2,
        "LangChain is convenient in the capstone. How do you keep it from becoming the domain?",
        [
            "Put provider calls behind a thin port so you can replace the orchestrator",
            "Import LangChain in every module",
            "Store the chain object in the database",
            "Disable the raw SDK forever",
        ],
        0,
        "A thin orchestrator you can replace is the adult choice. LangChain is one approach, not the business logic.",
    ),
    mcq(
        "m2-11-6", "m2-11", 2,
        "What is the minimum end-to-end test of the streamed tool path?",
        [
            "A manual click in prod",
            "A live billed call every CI minute",
            "A screenshot of tokens",
            "Fake the model, assert the tool ran with checked args, and that the UI received streamed tokens",
        ],
        3,
        "CI should not need a vendor. Fake the model; assert the tool side effect and the stream the user would see.",
    ),
]

L4 = [
    mcq(
        "m4-1-4", "m4-1", 4,
        "A born-digital PDF extracts cleanly but a scanned sibling does not. What distinguishes the two?",
        [
            "Scanned pages are images and need OCR; born-digital already has text and structure",
            "Scanned PDFs need a larger embedder only",
            "Born-digital files cannot contain tables",
            "OCR is required for every PDF",
        ],
        0,
        "OCR is for page images. Running it on born-digital text wastes money and can smash tables you already had.",
    ),
    mcq(
        "m4-1-5", "m4-1", 4,
        "A document is deleted from the source system but still answers in RAG. What ingest step was skipped?",
        [
            "Raising top-k",
            "Switching to cosine",
            "Tombstoning or deleting that doc's chunks (and graph edges) in the index",
            "Adding more overlap",
        ],
        2,
        "Deletes are first-class. Incremental ingest that only upserts leaves stale chunks retrievable.",
    ),
    mcq(
        "m4-2-5", "m4-2", 4,
        "A pricing table is split mid-row by a 512-token cutter. What should the chunker do?",
        [
            "Keep cutting at 512 no matter what",
            "Treat the table (or row groups with a repeated header) as an atomic unit",
            "Drop all tables",
            "Embed the whole PDF as one vector",
        ],
        1,
        "Half a row is not a fact. Bust the size cap a bit or split on row groups, not through a cell.",
    ),
    mcq(
        "m4-2-6", "m4-2", 4,
        "How do you pick a starting chunk size in an interview?",
        [
            "Always 512 because of a blog",
            "One chunk per repository",
            "The largest window the chat model has",
            "Start from the embedder's useful length, measure recall, then adjust overlap",
        ],
        3,
        "Size is an eval knob. Begin from the embedding model's useful length, then measure.",
    ),
    mcq(
        "m4-3-5", "m4-3", 4,
        "A teammate doubles embedding dimensions 'for quality' on a 20M-vector corpus. What do you check first?",
        [
            "Whether ANN RAM and query cost rose enough to erase any recall gain — higher dims are not free",
            "Whether JSON mode is on",
            "Whether the chat model window grew",
            "Whether BM25 needs the same dimension",
        ],
        0,
        "Dimensionality is a storage and ANN cost. Quality is not automatic; measure before you buy RAM.",
    ),
    mcq(
        "m4-3-6", "m4-3", 4,
        "An instruction-tuned embedder expects a query prefix and you omit it at query time. Likely result?",
        [
            "Faster ANN only",
            "Higher recall",
            "Collapsed recall because queries and docs no longer sit in the same trained protocol",
            "The index rejects the query",
        ],
        2,
        "Prefix mismatch is a silent recall hole. Match the model card on both ingest and query.",
    ),
    mcq(
        "m4-4-5", "m4-4", 4,
        "You built an L2 index on a cosine-trained embedder. What do you do?",
        [
            "Tune k until it looks fine",
            "Rebuild with the matching metric (or normalise and use IP if that is the cosine path)",
            "Add BM25 only",
            "Lower ef to hide the mismatch",
        ],
        1,
        "A wrong operator is a silent ranking bug. Rebuild; do not tune k on the wrong geometry.",
    ),
    mcq(
        "m4-4-6", "m4-4", 4,
        "The user asks for policies that are not about refunds. Dense search still returns the refund FAQ. What failed?",
        [
            "Cosine cannot be used for text",
            "The index has no ids",
            "JSON mode",
            "Semantic search is weak on negation (and often on exact ids and recency) — add lexical or a filter",
        ],
        3,
        "Negation, identifiers, and recency are the usual semantic-search misses. Say what you add next: BM25 or a hard filter.",
    ),
    mcq(
        "m4-5-6", "m4-5", 4,
        "A tiny tenant always gets 0 ANN hits; brute-force finds their 20 docs. What do you suspect first?",
        [
            "Filter timing (pre vs post) emptying the graph neighbourhood — or the need for a per-tenant index",
            "A bad system prompt",
            "Temperature too low",
            "The embedder dimension",
        ],
        0,
        "Tight filters plus naive HNSW is a classic empty. Check the engine's filter rule before swapping embedders.",
    ),
    mcq(
        "m4-5-7", "m4-5", 4,
        "Brute-force finds a chunk; default-ef ANN misses it. First knob?",
        [
            "A new chat model",
            "Raise ef or nprobe and re-measure recall vs p95",
            "Drop metadata filters forever",
            "Store naked vectors without ids",
        ],
        1,
        "ef/nprobe are product knobs on a recall-latency curve. Do not start with a new embedder.",
    ),
    mcq(
        "m4-6-5", "m4-6", 4,
        "Dense-only recall is 0.95; hybrid is 0.95 at +60ms. What do you do?",
        [
            "Keep both indexes for completeness",
            "Add a third channel",
            "Drop the dead channel — it is only adding latency",
            "Add raw BM25 to cosine without calibration",
        ],
        2,
        "If one channel already has high recall, the other is a bill. Ablate and delete.",
    ),
    mcq(
        "m4-6-6", "m4-6", 4,
        "BM25 and the vector index used different chunk ids for the same span. What breaks at fusion?",
        [
            "RRF (or any merge) cannot treat them as one object, so the span competes with itself and citations fork",
            "Cosine becomes L2",
            "ANN refuses to start",
            "The embedder dimension changes",
        ],
        0,
        "Shared chunk ids are the hybrid contract. Different ids make fusion a join from hell.",
    ),
    mcq(
        "m4-8-5", "m4-8", 4,
        "A PM wants RAG so the bot sounds more confident. What do you say?",
        [
            "Confidence is a retrieve problem",
            "Index Wikipedia",
            "Fine-tune the price list weekly",
            "RAG is not a style tool — ask which private or changing facts must be cited",
        ],
        3,
        "RAG supplies facts, not tone. Style is parametric or a system prompt.",
    ),
    mcq(
        "m4-8-6", "m4-8", 4,
        "The answer is fluent and wrong. The assembled prompt does not contain the gold span. Which side failed?",
        [
            "Retrieval — raise k or fix chunk/query/filters, not the chat model first",
            "Generation only — swap the LLM",
            "The vector metric cannot be cosine",
            "Structured output is impossible",
        ],
        0,
        "If the span was never in the prompt, it is a retrieve miss. Fluency is not evidence.",
    ),
    mcq(
        "m4-9-6", "m4-9", 4,
        "The model cites [7] and you only sent sources [1]–[4]. What should the checker do?",
        [
            "Render [7] anyway",
            "Reject the citation (and maybe abstain) — it is an unretrieved id",
            "Fetch random doc 7 from the corpus",
            "Raise k to 7 next time only",
        ],
        1,
        "Never accept a title or id you did not retrieve. That is invented grounding.",
    ),
    mcq(
        "m4-9-7", "m4-9", 4,
        "Eight assembled chunks are overlap slices of one paragraph; the gold is in another doc. First fix?",
        [
            "A bigger LLM",
            "Sort by created_at",
            "Dedupe / diversify before assemble so k is not a lie",
            "Disable citations",
        ],
        2,
        "Near-duplicates waste the window. Raise unique-doc count before you raise k.",
    ),
    mcq(
        "m4-10-5", "m4-10", 4,
        "First-stage recall@4 is 0.94 and rerank lifts it to 0.94 at +150ms. What do you do?",
        [
            "Skip the reranker until an eval proves lift that pays for the latency",
            "Rerank the whole corpus",
            "Raise retrieve-k to 5000",
            "Always rerank because blogs do",
        ],
        0,
        "Skip is the default when the first stage already ranks well. Always-on is a latency leak.",
    ),
    mcq(
        "m4-10-6", "m4-10", 4,
        "How do you place a reranker in an interview, including the measurement?",
        [
            "Rerank the corpus, skip latency",
            "Send 50 chunks to the LLM and hope",
            "Retrieve about 50, rerank about 8, send about 4 — and measure extra latency and quality",
            "Replace ANN with a cross-encoder",
        ],
        2,
        "50 → 8 → 4 is the sketch. The grade is that you measure the extra latency, not that you name a vendor.",
    ),
    mcq(
        "m4-11-6", "m4-11", 4,
        "HyDE is on for query INC-4419 and you retrieve a generic incident essay. What failed?",
        [
            "The chat temperature",
            "HyDE drifted off the identifier — skip it on precise queries and keep raw BM25",
            "RRF cannot fuse ranks",
            "The ticket id is too short to embed",
        ],
        1,
        "Hypothetical documents become prose and miss codes. Do not HyDE identifier queries.",
    ),
    mcq(
        "m4-11-7", "m4-11", 4,
        "After a prompt tweak, model calls per request doubled and quality did not. What do you check?",
        [
            "Only the final generate",
            "The embedder card",
            "Whether rewrite/multi-query started firing on easy lookups — cap and skip those",
            "Whether JSON mode is on",
        ],
        2,
        "Each transform is a billed call. A router and a cap belong in the budget, not only the final generate.",
    ),
    mcq(
        "m4-12-6", "m4-12", 4,
        "Why prefer quote-then-answer over answer-then-cite?",
        [
            "Writing the answer first invites invented sources to decorate it",
            "Quotes are illegal in JSON",
            "Answer-then-cite is faster so it must be better",
            "Providers forbid quotes",
        ],
        0,
        "Extract spans first, then answer inside them. Answer-first is how titles get invented.",
    ),
    mcq(
        "m4-12-7", "m4-12", 4,
        "The model sets answer to probably 14 days and insufficient_evidence true. What do you render?",
        [
            "Both, so the user has options",
            "The number in a hedge",
            "Abstain only — dual-filled is a generate failure",
            "A random retrieved title",
        ],
        2,
        "A required abstain path beats a hedged paragraph. Do not show the leftover number.",
    ),
    mcq(
        "m4-13-7", "m4-13", 4,
        "Gold is never in the top-50 and the team adds Self-RAG reflection tokens. What should they fix instead?",
        [
            "The chat model's temperature",
            "Nothing — reflection invents missing chunks",
            "The citation footer",
            "Retrieve (chunk, hybrid, query). Reflection cannot promote a span that never arrived",
        ],
        3,
        "Pick the variant from the failure. A retrieve miss is not a reflection miss.",
    ),
    mcq(
        "m4-13-8", "m4-13", 4,
        "Why is Graph RAG a poor week-one choice on a new corpus?",
        [
            "Entity graphs need extract, resolve, deletes, and summaries — staff ingest first; start with chunks",
            "Graphs cannot represent relations",
            "Vector search is illegal once a graph exists",
            "Community summaries are free",
        ],
        0,
        "Graphs are a second pipeline. Do not start there; try hops if a relation question fails.",
    ),
    mcq(
        "m4-14-5", "m4-14", 4,
        "After a LlamaIndex port the model uses outside knowledge your code never allowed. Where do you look first?",
        [
            "The embedder dimension",
            "The hidden default prompt — dump the final assembled messages",
            "Postgres vacuum",
            "The CSS of the UI",
        ],
        1,
        "Frameworks hide prompts. A default helpful-assistant line can undo your grounding rule.",
    ),
    mcq(
        "m4-14-6", "m4-14", 4,
        "The framework demo looks nicer but answers the uncovered fixture question. Ship it?",
        [
            "Yes — prettier is parity",
            "Yes if latency improved",
            "Only if the CEO likes the logo",
            "No — it lost the abstain rule; fix or keep the hand-built generate path",
        ],
        3,
        "Parity means the same fixture still abstains and still cites quote-plus-id. A demo that loses that is a fail.",
    ),
]


def append(path: Path, extra: list[dict]) -> None:
    arr = json.loads(path.read_text())
    existing = {m["id"] for m in arr}
    for m in extra:
        if m["id"] in existing:
            raise SystemExit(f"id already present: {m['id']}")
        arr.append(m)
    path.write_text(json.dumps(arr, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"appended {len(extra)} -> {path} total={len(arr)}")


if __name__ == "__main__":
    append(ROOT / "data/genai-test/mcq/level-2.json", L2)
    append(ROOT / "data/genai-test/mcq/level-4.json", L4)
    for name, rows in ("L2", L2), ("L4", L4):
        c = [0, 0, 0, 0]
        for m in rows:
            c[m["answer"]] += 1
        print(name, "new answers", c)
