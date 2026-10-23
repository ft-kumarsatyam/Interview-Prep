from helper import entry, q

PY = "https://docs.python.org/3"
UV = "https://docs.astral.sh/uv/"
PYTEST = "https://docs.pytest.org/en/stable/"

NOTES = {
 "m0-1": {
  "clean-idiomatic-python": entry(
   what="""**Idiomatic Python** is the set of patterns the language already gives you so you do not invent a second dialect. Functions do one job and return something, classes hold state that actually changes, modules are files you can import, comprehensions replace append-loops, exceptions are the control path for rare failures, and the standard library covers paths, JSON, time, logging and HTTP before you reach for a package.

The opposite is translating Java or C loops into Python: `for i in range(len(xs))`, a class with no behaviour, a 400-line script with no functions, or `except:` around everything. Idiomatic code is not clever one-liners. It is code a teammate can read in a minute and that `ruff` will not rewrite.

In AI engineering most of your day is glue: load a file, clean rows, call an API, shape a prompt, write a result. That glue is read far more often than the model call. The model call is a function. The rest is Python.""",
   why="""On the job, unreadable glue becomes the outage. A comprehension that hides a network call, a mutable default that shares a cache across requests, or a bare except that swallows a timeout will cost more than a slow model. Reviewers in AI teams look at this layer first because it is where secrets leak, retries double-charge, and tests cannot reach.

In interviews you will be asked to rewrite a loop, name a standard-library tool, or spot a mutable default. Interviewers are not testing poetry. They are testing whether you will ship a script that another engineer can own. Saying "I let ruff/black own style and I write small functions" is a senior line. Reciting PEP 8 from memory is not.

Listing "Python" on a resume is noise. Walking a messy function into names, a `with` block, and a specific exception is the signal.""",
   how="""Write the happy path as a function. Use a comprehension or a generator when the transform is a single expression. Use `enumerate` and `zip` instead of indexes. Format with f-strings. Open files and clients with `with`. Catch the exception you expect.

```
from pathlib import Path

def titles(path: Path) -> list[str]:
    lines = path.read_text().splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]
```

That is three ideas: pathlib instead of string paths, a filter in the comprehension, and a name that says what comes back. A generator (`(line.strip() for line in ...)`) is the same idea when you only need one pass and the file is large.

When the transform is not a single expression — logging, a retry, two collections — write a loop. Idiomatic does not mean "never for".""",
   failures="""1. **Clever comprehensions.** Nested `if`/`for` in one line that nobody can debug. Split it.

2. **Bare `except:`.** Swallows `KeyboardInterrupt`, `SystemExit` and the bug you needed. Catch `ValueError` or `httpx.TimeoutException`.

3. **Mutable defaults.** `def f(seen=[])` shares one list across calls. Use `None` and create inside.

4. **God scripts.** One file, no functions, globals for config. Extract modules before the second feature.""",
   line="""Idiomatic Python is small functions, comprehensions or loops that match the shape of the work, specific exceptions, and the standard library before a new dependency. I let a formatter own style. In AI work the glue is the product; I write it so a teammate can change it without me.""",
   key_points=[
    "Idiomatic means language patterns, not clever one-liners.",
    "Comprehensions and generators replace append-loops; keep loops when the body is not a single expression.",
    "Catch specific exceptions; never bare except.",
    "Use pathlib, f-strings, with, enumerate and zip.",
    "AI glue is read more than the model call — make it boring and testable.",
    "Mutable default arguments share one object across calls.",
   ],
   questions=[
    q("recall", "What is the difference between a list comprehension and a generator expression, and when do you pick each?", "A list comprehension builds the whole list in memory immediately; a generator expression yields items lazily. Pick a generator when you stream or aggregate once (sum, any, writing lines). Pick a list when you need indexing, len, or multiple passes."),
    q("apply", "A teammate writes `for i in range(len(items)): print(items[i])`. How would you rewrite it and why?", "Use `for item in items`, or `enumerate(items)` if the index is needed. It removes off-by-one risk, works for any iterable, and reads as intent."),
    q("debug", "Spot the fault: `try: risky() except: pass`.", "A bare except swallows KeyboardInterrupt and SystemExit, and pass hides the failure. Catch the specific exception, handle or log it, and let unexpected ones propagate."),
    q("apply", "You need to strip blank lines from a 2 GB log. Why is a list comprehension the wrong first tool?", "It materialises every kept line. Use a generator or iterate the file object and write as you go so memory stays flat."),
    q("recall", "Name three standard-library tools you should reach for before adding a package in glue code.", "pathlib for paths, json for JSON, logging for logs. Also argparse, dataclasses, collections, itertools, and urllib/http.client before a new HTTP library if the call is tiny."),
   ],
   links=[
    {"title": "Python tutorial: data structures", "url": f"{PY}/tutorial/datastructures.html"},
    {"title": "PEP 8 style guide", "url": "https://peps.python.org/pep-0008/"},
   ],
  ),
  "core-data-structures": entry(
   what="""Python's everyday types are **list**, **tuple**, **set**, **dict**, plus **iterators** and **generators**. A list is an ordered mutable sequence: O(1) append and index, O(n) membership and insert-at-front. A tuple is ordered and immutable; it is hashable when its items are, so it can be a dict key. A set holds unique hashable items with O(1) average membership. A dict is a hash map that preserves insertion order.

An **iterator** is an object with `__next__`. A **generator** is a function that `yield`s; it is an iterator you did not write by hand. `range`, file objects, and `zip` are iterators. You choose a type for the operation you will do most: membership → set, keyed lookup → dict, ordered records you will mutate → list, fixed record → tuple.

`collections` adds `deque` (O(1) both ends), `Counter`, `defaultdict`, and `heapq` for top-k. These are still the same language. JSON objects become dicts and arrays become lists, so this is also your API model.""",
   why="""On the job the classic AI-pipeline slowdown is `if doc_id in seen_list` inside a loop over a million ids. That is O(n²). Switching `seen` to a set is a one-line fix and the difference between a laptop job and a cluster. The same mistake shows up as "the retriever is slow" when the slowness is a list scan in Python.

Interviewers ask complexity of `x in list` versus `x in set`, when a tuple can be a key, and how to take top-k without sorting everything. They also ask what breaks if you mutate a list while iterating it. This is Level 0 because every later module — batching, caches, vocabularies, HTTP bodies — sits on these types.

A weak answer names the types. A strong answer names the cost and one production story.""",
   how="""Dedup a million document ids, then count tags:

```
from collections import Counter

raw = ["a", "b", "a", "c"]
unique = set(raw)          # O(n)
counts = Counter(raw)      # dict subclass
top = counts.most_common(2)
```

Membership against `unique` is O(1). Building `unique` as a list and testing `if x not in unique` in a second loop is the quadratic trap.

A generator keeps memory flat when you only need one pass:

```
def tokens(path):
    with open(path) as f:
        for line in f:
            yield from line.split()
```

`sum(1 for t in tokens(p) if t == "ERROR")` never holds the file.

Use a tuple for a composite cache key: `cache[(user_id, model)]`. A list key raises `TypeError` because lists are unhashable.""",
   failures="""1. **List for membership.** Looks fine on 20 items, melts on 200_000.

2. **Mutating while iterating.** `for x in xs: xs.remove(x)` skips items. Iterate a copy or build a new list.

3. **Unhashable keys.** `cache[[1, 2]]` raises TypeError. Freeze the key as a tuple.

4. **Wrong default.** A list of pairs where you needed a dict means every lookup is a scan.""",
   line="""I pick the type for the hot operation: set for membership, dict for keyed lookup, list for an ordered mutable sequence, tuple for a fixed or hashable record. Generators keep one-pass work out of memory. The interview question is almost always `x in list` versus `x in set`.""",
   key_points=[
    "dict and set are O(1) average lookup; list membership is O(n).",
    "Tuples are immutable and hashable when their items are; lists are not.",
    "Generators and iterators give one-pass, low-memory loops.",
    "Counter, defaultdict, deque and heapq beat hand-rolled versions.",
    "JSON objects map to dicts and arrays to lists — this is your API model too.",
    "Never mutate a list you are iterating; build a new one.",
   ],
   questions=[
    q("recall", "Why is checking `x in my_set` faster than `x in my_list`?", "A set is a hash table, so membership is O(1) on average; a list scans linearly, O(n). Many lookups turn O(n) into O(n²)."),
    q("apply", "You must count word frequencies across a large corpus and return the top 10. Which structures?", "`collections.Counter` to count and `most_common(10)`, which uses a heap. Stream tokens with a generator so the corpus is not all in RAM."),
    q("debug", "This raises TypeError: `cache = {}; cache[[1,2]] = 'x'`. Why and how do you fix it?", "List is unhashable. Use a tuple `(1, 2)` as the key, or join into a string if the API demands one."),
    q("apply", "A retriever checks `if doc_id in seen` for every hit, and `seen` is a list that grows to 500k. What do you change?", "Make `seen` a set. Construction is O(n) once; each later test is O(1). This is the usual 'pipeline is slow' bug in Python, not in the model."),
    q("recall", "When do you choose a tuple over a list?", "When the record is fixed, you want it hashable as a dict key, or you are returning a small immutable pair. Lists are for sequences you will grow or rewrite."),
   ],
   links=[
    {"title": "Python tutorial: data structures", "url": f"{PY}/tutorial/datastructures.html"},
    {"title": "collections — container datatypes", "url": f"{PY}/library/collections.html"},
   ],
  ),
  "type-hints-typed-models": entry(
   what="""**Type hints** are metadata on functions and variables: `def load(path: Path) -> list[str]`. **CPython ignores them at run time.** Tools such as `mypy` and `pyright` check them, editors use them for completion, and libraries such as **Pydantic** and FastAPI read them to validate and serialise.

A **typed model** is a class that describes a shape: a `dataclass` for internal records, a Pydantic `BaseModel` when you parse untrusted JSON. The hint is the contract; the model is the check. `Optional[str]` or `str | None` means "this can be missing"; a bare `str` means it cannot.

Hints are not comments. `user: dict` tells you almost nothing. `user: UserIn` tells you the fields, and Pydantic will reject a missing email before your handler runs.""",
   why="""On the job, the LLM returns a blob. If you treat it as `dict`, every caller guesses keys. If you parse into a Pydantic model, a missing `label` is a 422 at the edge, not a `KeyError` in a worker at 02:00. FastAPI's OpenAPI docs are generated from these models. So are your tests.

In interviews, "do type hints make Python faster?" is a trap — they do not. The senior answer is: they are a contract for humans and tools; Pydantic/FastAPI enforce them; I still validate at the trust boundary. Being able to sketch a model with `email: EmailStr` and `score: float = Field(ge=0, le=1)` is the practical test.

Hints also keep refactors cheap. Rename a field on the model and the type checker lists every call site.""",
   how="""Internal record — dataclass:

```
from dataclasses import dataclass

@dataclass(frozen=True)
class Chunk:
    doc_id: str
    text: str
    score: float
```

Untrusted HTTP or LLM JSON — Pydantic:

```
from pydantic import BaseModel, Field

class ClassifyOut(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
```

`ClassifyOut.model_validate_json(raw)` either returns a typed object or raises. FastAPI uses the same model as a `response_model` so the client sees the schema.

Start hints on public functions and models. Do not hint every local `i` in a loop. `from __future__ import annotations` keeps hints lazy and avoids circular imports.""",
   failures="""1. **Believing hints run.** `def f(x: int)` still accepts a string at runtime. Validate at the boundary.

2. **`dict` everywhere.** You hid the shape. Make a model.

3. **Optional without a None path.** You hinted `str | None` and then called `.lower()` without a check.

4. **Two sources of truth.** A comment says `user_id` is int, the model says str. The model wins; delete the comment.""",
   line="""Hints are a contract, not a runtime check. I use dataclasses inside the process and Pydantic at the HTTP or LLM boundary so missing fields fail before they become KeyError. Interviewers want that split, and they want to hear that CPython will not save you.""",
   key_points=[
    "CPython ignores hints; mypy/pyright and Pydantic use them.",
    "dataclass for internal records; Pydantic for untrusted JSON.",
    "A named model beats dict at every trust boundary.",
    "Optional means you must handle None; the hint does not.",
    "FastAPI OpenAPI docs come from these models.",
    "Hints do not make code faster.",
   ],
   questions=[
    q("recall", "Do type hints raise TypeError at call time in plain CPython?", "No. They are metadata. Static tools check them; Pydantic and similar libraries validate using them. Bare CPython does not enforce them."),
    q("apply", "An LLM returns `{\"label\": \"billing\"}` and sometimes omits `label`. How do you stop a KeyError in the worker?", "Parse with a Pydantic model that requires `label`. Invalid payloads fail at the edge with a validation error you can log and retry or send to a dead letter."),
    q("debug", "A function is hinted `-> list[str]` but sometimes returns None. What breaks?", "Callers and the type checker assume a list. `.append` on None explodes. Return `list[str]` always, or change the hint to `list[str] | None` and handle both."),
    q("apply", "When do you pick a dataclass over a Pydantic model?", "Dataclass when you construct the object yourself inside the process. Pydantic when you parse JSON, query params, or model output that can be wrong."),
    q("recall", "Why does FastAPI want a response_model?", "It serialises the return value, filters extra fields, and publishes the schema in OpenAPI so clients and tests share one contract."),
   ],
   links=[
    {"title": "typing — support for type hints", "url": f"{PY}/library/typing.html"},
    {"title": "Pydantic models", "url": "https://docs.pydantic.dev/latest/concepts/models/"},
    {"title": "dataclasses", "url": f"{PY}/library/dataclasses.html"},
   ],
  ),
  "mutability-scope-failure-modes": entry(
   what="""**Mutability** means an object can change in place: lists, dicts, sets. **Immutability** means it cannot: strings, tuples, frozensets, numbers. Assignment in Python **never copies**; it binds a name to an object. `b = a` on a list means two names, one list. `b.append(1)` is visible through `a`.

**Scope** is where a name is visible: local to a function, enclosing (closure), global to a module, builtin. `global` and `nonlocal` exist because assignment makes a name local unless you say otherwise. **Exceptions** are objects you raise and catch; they carry a traceback. **Context managers** (`with`) run setup and guaranteed teardown — files, locks, sessions.

Common failure modes are shared mutables (default args, class attributes, a "constant" list you append to), late-binding closures in loops, leaking file handles, and catching too much.""",
   why="""On the job these bugs look like "it works in the test and fails under load". A FastAPI handler with `def run(cache=[])` shares one list across requests. A class-level `seen: list[str] = []` is one list for every instance. A forgotten `async with client` leaks connections until the process dies.

Interviewers love the mutable default, `id(a) == id(b)` after assignment, and `with` versus try/finally. They will also ask what happens if you catch `Exception` around a database call — you hide the disconnect and retry the wrong thing.

This is not trivia. It is how you reason about shared state in a worker that handles many requests.""",
   how="""Copy when you mean copy:

```
a = [1, 2]
b = a          # same object
c = a[:]       # shallow copy
d = list(a)
```

Nested mutables need `copy.deepcopy` or, better, do not nest mutables you will share.

Context manager:

```
from contextlib import contextmanager

@contextmanager
def session(db):
    txn = db.begin()
    try:
        yield txn
        txn.commit()
    except Exception:
        txn.rollback()
        raise
```

`with session(db) as txn:` commits on success and rolls back on any exception. That is the same idea as `with open(path) as f`.

Late-binding closure trap: `funcs = [lambda: i for i in range(3)]` — every lambda sees the final `i`. Bind with a default: `lambda i=i: i`.""",
   failures="""1. **Mutable default argument.** Shared across calls. Use `None`.

2. **Class-level mutable.** Shared across instances. Set it in `__init__`.

3. **Catching Exception around I/O.** You swallow disconnects and KeyboardInterrupt's cousins. Catch the driver error.

4. **No with.** A path that returns early skips `close()`. The context manager cannot skip.""",
   line="""Assignment binds names; it does not copy. Mutable defaults and class-level lists are shared state. I copy when I mean copy, I open resources with `with`, and I catch the exception I can handle. That is the whole mutability talk in one minute.""",
   key_points=[
    "Assignment binds a name; it does not copy the object.",
    "Lists, dicts and sets mutate in place; strings and tuples do not.",
    "Mutable defaults and class-level lists are shared across calls or instances.",
    "with runs teardown even when you return or raise.",
    "Catch the specific exception; Exception is almost always too wide.",
    "Late-binding closures in loops see the last value unless you bind a default.",
   ],
   questions=[
    q("recall", "Why is `def f(xs=[])` dangerous?", "The default list is created once, at function definition. Every call that omits xs shares that list, so appends leak across requests or tests."),
    q("debug", "Two requests see each other's items in `cache`. The handler is `def handle(cache={}):`. What is wrong?", "The default dict is process-global. Create the cache outside as an explicit dependency, or use None and a new dict per call if it must not be shared."),
    q("apply", "You must be sure a HTTP client closes if validation fails halfway. What do you write?", "`async with httpx.AsyncClient() as client:` (or the sync `with`) so teardown runs on every path, including exceptions."),
    q("recall", "What does `b = a` do when `a` is a list?", "It binds b to the same list object. Mutations through b are visible through a. Copy with `list(a)`, `a[:]`, or `copy.copy`."),
    q("apply", "A list of lambdas all print 2 after `for i in range(3): fns.append(lambda: i)`. How do you fix it?", "Bind the current i as a default: `lambda i=i: i`. Defaults are evaluated at definition time, so each lambda keeps its own i."),
   ],
   links=[
    {"title": "Python datamodel: context managers", "url": f"{PY}/reference/datamodel.html#context-managers"},
    {"title": "exceptions", "url": f"{PY}/tutorial/errors.html"},
   ],
  ),
  "files-paths-env-vars-serialization": entry(
   what="""AI services live on **files**, **paths**, **environment variables**, and **serialised bytes**. Paths should be `pathlib.Path`, not concatenated strings. Files should be opened with an encoding (`utf-8`) and a `with` block. Environment variables are how you inject secrets and config without baking them into the image: `os.environ["DATABASE_URL"]`, loaded in development from a `.env` that is never committed.

**Serialisation** is turning a Python object into bytes another process can read. JSON is the default for APIs and LLM tool calls. CSV is for tabular dumps. `pickle` is Python-only and unsafe on untrusted data. Encoding errors, missing files, and a secret in a repo are the daily bugs.

A path is not a string you print. It has a drive, parts, and a suffix. `Path("data") / "docs.json"` stays correct on Windows. `open("data/docs.json")` does not always.""",
   why="""On the job, "it worked on my laptop" is almost always a path or an env var. The container has no `~/Downloads`. The production secret is in the environment, not in `settings.py`. CSV you wrote with Excel's dialect will fail `csv.reader` on a Linux box if you guessed the delimiter.

Interviewers ask how you load config, where the API key lives, and how you parse a 2 GB JSONL without `json.loads` on the whole file. They also ask why pickle is not an API format. Being able to write `Path`, `os.getenv`, and `json.loads` with an encoding is the bar.

Resume text that says "worked with files" is empty. Saying "config from the environment, secrets never on disk in git, JSONL streamed line by line" is the job.""",
   how="""Config at process start:

```
import os
from pathlib import Path

DATA = Path(os.environ.get("DATA_DIR", "data"))
API_KEY = os.environ["PROVIDER_API_KEY"]  # fail fast if missing

def load_docs(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    return json.loads(text)
```

JSONL for large logs — one object per line:

```
def iter_jsonl(path: Path):
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)
```

CSV with the stdlib:

```
import csv
with path.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
```

Never `json.loads` a file you streamed as JSONL. Never write a key into the repo "just for local".""",
   failures="""1. **String paths.** Break on Windows and on spaces. Use pathlib.

2. **Default encoding.** On some machines it is not utf-8. Pass `encoding="utf-8"`.

3. **Secrets in files.** `.env` committed, a key in `config.json`, a notebook with a token. Use the environment and gitignore.

4. **pickle for interchange.** A crafted pickle can execute code. JSON or a real schema for anything you did not write this process.""",
   line="""Paths are pathlib, files are utf-8 and `with`, config and secrets come from the environment, JSON or CSV for interchange, JSONL when the file is large. I fail fast if a required env var is missing, and I never commit a key.""",
   key_points=[
    "Use pathlib; do not concatenate path strings.",
    "Always pass encoding=\"utf-8\" when you open text.",
    "Required secrets come from the environment and fail at startup if missing.",
    "JSON for APIs; JSONL for large streams; CSV for tables; never pickle untrusted data.",
    "A .env file is local only and must be gitignored.",
    "Stream large files; do not json.loads a multi-gigabyte blob.",
   ],
   questions=[
    q("recall", "Why prefer pathlib over string concatenation for file paths?", "Path objects join correctly across OSes, expose suffix and stem, and make existence checks obvious. String joins break on separators and escaping."),
    q("apply", "You must read a 4 GB JSONL of traces. What do you not do?", "Do not `json.loads(path.read_text())`. Open the file, parse one line at a time, and yield objects so memory stays near one line."),
    q("debug", "The app starts locally and dies in Docker with FileNotFoundError on `~/data/docs`. What happened?", "The tilde and the home directory do not exist in the container. Use an env var such as DATA_DIR and a path inside the image or a mounted volume."),
    q("apply", "Where does PROVIDER_API_KEY live in production versus on your laptop?", "Production: the platform's secret store, injected as an environment variable. Laptop: a gitignored .env loaded into the environment. Never a committed file."),
    q("recall", "Why is pickle a bad format for user uploads?", "Unpickling can execute arbitrary code. Treat it as a Python-only cache you wrote yourself, never as an API or upload format."),
   ],
   links=[
    {"title": "pathlib", "url": f"{PY}/library/pathlib.html"},
    {"title": "json — JSON encoder and decoder", "url": f"{PY}/library/json.html"},
    {"title": "os.environ", "url": f"{PY}/library/os.html#os.environ"},
   ],
  ),
  "sync-vs-async-execution": entry(
   what="""**Synchronous** code waits for each call to finish before the next line runs. **Asynchronous** code uses an **event loop**: a function can `await` a network call and let the loop run other tasks until the bytes arrive. In Python that is `async def`, `await`, and `asyncio`.

Async is for **I/O wait** — HTTP, sockets, many LLM calls — not for heavy CPU. A blocking call inside `async def` (`time.sleep`, `requests.get`, a sync database driver) **stalls the whole loop**. Every other request on that worker waits. The fix is an async library (`httpx.AsyncClient`, asyncpg) or `asyncio.to_thread` for the leftover sync call.

Concurrency is not parallelism. One thread, many in-flight I/O waits. CPU work still needs processes or a thread pool.""",
   why="""On the job this is the FastAPI latency incident. The handler is `async def`, someone pastes `requests.get` to call the model, and p99 goes from 200 ms to 8 s under ten concurrent users. The model is fine. The event loop is stuck.

Interviewers will draw that exact picture. The senior answer names the stall, names the fix (async client or `to_thread`), and says when to stay sync: a CPU-heavy handler with no wait, or a simple script. "We made it async" is not a speedup if you did not await I/O.

This topic is also how you batch LLM calls: `asyncio.gather` twenty completions, cap with a semaphore, and bound total time.""",
   how="""Wrong — blocks the loop:

```
@app.get("/summary")
async def summary(url: str):
    text = requests.get(url).text          # stalls everyone
    return {"n": len(text)}
```

Right — async client:

```
@app.get("/summary")
async def summary(url: str, client: AsyncClient):
    resp = await client.get(url)
    return {"n": len(resp.text)}
```

Many calls with a bound:

```
sem = asyncio.Semaphore(8)

async def one(p):
    async with sem:
        return await client.post(MODEL, json=p)

results = await asyncio.gather(*[one(p) for p in prompts])
```

If the library is sync-only, `await asyncio.to_thread(sync_fn, arg)` runs it in a worker thread so the loop stays free. Do not wrap CPU-heavy numpy in thousands of threads; use a process pool or a queue.""",
   failures="""1. **requests in async def.** The classic stall. Use httpx/aiohttp or to_thread.

2. **Unbounded gather.** Ten thousand in-flight LLM calls. Semaphore.

3. **time.sleep in async.** Use `await asyncio.sleep`.

4. **Assuming async makes CPU faster.** It does not. It overlaps waits.""",
   line="""Sync waits in line; async awaits I/O and lets the event loop run other tasks. I never call a blocking HTTP or sleep inside async def. I use an async client or to_thread, and I cap concurrency with a semaphore. Async is for wait, not for math.""",
   key_points=[
    "Async overlaps I/O waits on one thread; it does not speed up CPU.",
    "A blocking call inside async def stalls every request on that worker.",
    "Use async HTTP clients or asyncio.to_thread for leftover sync I/O.",
    "Cap gather with a semaphore; unbounded fan-out melts the provider and you.",
    "time.sleep and requests.get are the usual foot-guns.",
    "Stay sync when the handler has no I/O or is a simple script.",
   ],
   questions=[
    q("debug", "An async FastAPI handler becomes slow under load after you add `requests.get(url)`. Best fix?", "Switch to an async HTTP client or run the call in `asyncio.to_thread`. try/except and type hints do nothing for a stalled event loop."),
    q("recall", "What does the event loop do while a coroutine is awaiting HTTP?", "It runs other ready tasks. The waiting coroutine is parked until the socket has data, then it resumes after the await."),
    q("apply", "You must call an LLM for 200 short prompts. How do you avoid 200 serial seconds without melting the API?", "asyncio.gather with a Semaphore of, say, 8–16, plus timeouts. Measure provider rate limits and your worker's open-connection cap."),
    q("recall", "When should you keep a FastAPI endpoint as a plain def, not async def?", "When it is CPU-bound or uses a sync library you will not wrap. FastAPI runs sync def in a threadpool. Mixing blocking calls into async def is worse."),
    q("debug", "You used `time.sleep(2)` inside `async def` to mock latency. Tests pass, production hangs. Why?", "time.sleep blocks the thread that owns the loop. Use `await asyncio.sleep(2)` so other tasks can run."),
   ],
   links=[
    {"title": "asyncio documentation", "url": f"{PY}/library/asyncio.html"},
    {"title": "httpx async support", "url": "https://www.python-httpx.org/async/"},
   ],
  ),
  "environments-dependencies-with-uv": entry(
   what="""A **virtual environment** is an isolated Python and site-packages for one project. **uv** is a fast installer and resolver that creates that environment, installs from `pyproject.toml`, and writes a **lockfile** (`uv.lock`) with exact versions of every package and every transitive dependency.

`pyproject.toml` is the declaration: project name, Python version, dependencies you chose. The lockfile is the resolution: what was actually installed, with hashes. Reproducible means another machine, CI, and Docker all install the same tree. `uv sync` does that from the lock.

You do not install into the system Python. You do not "remember" versions. You do not commit the `venv` directory. You do commit `pyproject.toml` and `uv.lock`.""",
   why="""On the job, "works on my machine" is an unlocked dependency. A teammate got pydantic 2.11, CI got 2.5, and models failed to parse. Pinning in the lock makes that a reviewed change, not a surprise. In AI stacks (torch, tokenizers, pydantic, httpx) transitive versions move often and break quietly.

Interviewers ask what a lockfile is for, why you commit it, and how you add a package. The answer is: declare in pyproject, lock with uv, install with `uv sync`, never `pip install` into global. They may ask uv versus venv+pip — uv is faster and the lock is first-class, the ideas are the same.

Security reviews also want the lock: you can say what ran in production last Tuesday.""",
   how="""New project:

```
uv init
uv add fastapi pydantic httpx
uv add --dev pytest ruff
uv sync
```

`uv add` updates pyproject and the lock. CI:

```
uv sync --frozen
```

`--frozen` fails if the lock is stale, instead of silently resolving a new tree.

Docker: copy `pyproject.toml` and `uv.lock` first, `uv sync --frozen --no-dev`, then copy source. That caches the layer.

A teammate clones and runs `uv sync`. They get your versions. They do not run `pip install fastapi` from memory.""",
   failures="""1. **No lock committed.** Every install is a new resolve. CI ≠ laptop.

2. **venv committed.** Huge, OS-specific, useless. gitignore it.

3. **pip install in production.** Bypasses the lock. Use `uv sync --frozen`.

4. **Python version drift.** Laptop is 3.12, image is 3.10. Pin `requires-python` and the image tag.""",
   line="""pyproject.toml is what I chose; uv.lock is what I resolved. I commit both, gitignore the venv, and install with `uv sync --frozen` in CI and Docker. Reproducible environments are a lockfile habit, not a memory habit.""",
   key_points=[
    "Virtualenv isolates packages; do not install into system Python.",
    "pyproject.toml declares; uv.lock pins the full resolved tree.",
    "Commit the lock; never commit the venv.",
    "CI and Docker use uv sync --frozen so the tree cannot drift.",
    "uv add updates both the declaration and the lock.",
    "Pin the Python version as well as the packages.",
   ],
   questions=[
    q("recall", "Why commit uv.lock to the repository?", "It pins resolved versions of all dependencies so laptop, CI and Docker install the same tree. It does not hold secrets and does not replace pyproject.toml."),
    q("apply", "A teammate's tests fail on a Pydantic error you cannot reproduce. What do you check first?", "Whether they synced from the lock. If they pip-installed, their versions drifted. Have them `uv sync --frozen` and compare `uv pip freeze`."),
    q("debug", "CI installed different package versions than your laptop even though pyproject.toml matches. Why?", "Without a lock (or without --frozen) the resolver picks new versions. Commit uv.lock and install frozen."),
    q("apply", "How do you add httpx to an existing uv project?", "`uv add httpx`. It writes the dependency to pyproject.toml and refreshes uv.lock. Then commit both files."),
    q("recall", "What belongs in .gitignore versus git for environments?", "Ignore .venv and __pycache__. Commit pyproject.toml and uv.lock. Optional: .python-version."),
   ],
   links=[
    {"title": "uv documentation", "url": UV},
    {"title": "pyproject.toml spec", "url": "https://packaging.python.org/en/latest/guides/writing-pyproject-toml/"},
   ],
  ),
  "modules-packages": entry(
   what="""A **module** is a `.py` file you import. A **package** is a directory of modules, usually with `__init__.py`, that you import as a namespace (`app.api.routes`). Structure exists so names stay unique, tests can import your code, and you do not paste the same function into three scripts.

The unit of reuse is a function or class in a module, not a copied cell. `__init__.py` can be empty; it marks the directory as a package (namespace packages can omit it, but explicit is clearer for app code). Relative imports (`.models`) stay inside the package; absolute imports (`app.models`) are easier to grep.

A script is `if __name__ == "__main__":`. A library is imported. AI projects rot when everything lives in `notebook.ipynb` or `main.py`.""",
   why="""On the job, the first production refactor is "split the blob". Prompt assembly, HTTP handlers, and database access in one file cannot be tested or reused. A second service needs the same Pydantic models — they should be a package, not a copy.

Interviewers ask how you would lay out a FastAPI app: `app/main.py`, `app/api/`, `app/models/`, `app/services/`, `tests/`. They ask what `__init__.py` does and why circular imports happen (A imports B imports A). The fix is to push shared types into a third module, not to invent more globals.

"I keep notebooks for exploration and move anything that ships into a package" is the line they want.""",
   how="""A small service:

```
app/
  __init__.py
  main.py          # FastAPI() and routers
  api/routes.py
  models/ticket.py
  services/classify.py
tests/
  test_classify.py
pyproject.toml
```

`classify.py` imports `Ticket` from `app.models.ticket`. Tests import `classify`. `main.py` only wires routers.

Avoid `from app.services.classify import *`. Import names. Avoid circular imports by not importing handlers inside models. If two modules need each other, the shared bit is a third module.

Runnable as a module: `python -m app.main` or `fastapi dev app/main.py`, so `app` is a package on `sys.path` via the project install (`uv sync` editable).""",
   failures="""1. **One 2_000-line main.py.** Cannot test. Split by responsibility.

2. **sys.path hacks.** `sys.path.append("..")` in every file. Install the project editable.

3. **Circular imports.** Models import routes that import models. Move types down.

4. **Copied utils.** Three `clean_text` functions. One module.""",
   line="""A module is a file; a package is a directory of modules. I put handlers, models and services in separate packages, install the project editable, and keep notebooks out of the ship path. Structure is how tests and the next service find the code.""",
   key_points=[
    "Module = file; package = importable directory of modules.",
    "Split handlers, models and services so tests can import them.",
    "Install the project editable instead of sys.path hacks.",
    "Circular imports mean shared types need a third module.",
    "Notebooks explore; packages ship.",
    "Prefer absolute imports you can grep.",
   ],
   questions=[
    q("recall", "What is the difference between a module and a package?", "A module is one .py file. A package is a directory of modules imported as a namespace, usually with __init__.py."),
    q("apply", "A FastAPI app has models, routes and a classifier in one file. How do you split it?", "app/models, app/api, app/services, app/main that only mounts routers. Tests import services and models directly."),
    q("debug", "ImportError: cannot import name X — two files import each other. What do you do?", "Move the shared name into a third module both can import. Do not import the API layer from the model layer."),
    q("apply", "Why is `sys.path.append(str(Path(__file__).parent))` a smell?", "It depends on the working directory and breaks in Docker and pytest. Declare a package and install it editable with uv."),
    q("recall", "What does `if __name__ == \"__main__\":` protect?", "Code that should run only when the file is the entry point, not when it is imported. Tests and other modules can import functions without launching the server."),
   ],
   links=[
    {"title": "Python tutorial: modules", "url": f"{PY}/tutorial/modules.html"},
    {"title": "Packaging a project", "url": "https://packaging.python.org/en/latest/tutorials/packaging-projects/"},
   ],
  ),
  "unit-tests-and-debugging": entry(
   what="""A **unit test** checks one behaviour of one function with inputs you control. In this stack that is **pytest**: a file named `test_*.py`, functions named `test_*`, and `assert`. No test classes required. **Debugging** is reading the **traceback** from the bottom (the line that raised), adding **logs** at the boundary, and using a **breakpoint** (`breakpoint()` or the IDE) when the log is not enough.

A good test has a name that states the rule (`test_empty_ticket_returns_other`), one behaviour, and no real network. A regression test is a unit test you added after a bug, with the input that failed.

The traceback is a stack of calls. The last frame is where it exploded. The frames above tell you who called it. Do not start "fixing" at a random line in the middle.""",
   why="""On the job, untested glue is where the outage hides. LLM output changes; your parser should not. A pytest that feeds a fixture JSON and expects a label will catch a model-schema change in one second. Debugging without a traceback habit means you add prints in a loop and ship the prints.

Interviewers will show a failing test and a traceback and ask you to talk. The senior walk-through: read the last frame, name the function, reproduce with the smallest input, write or fix the assertion, only then change production code. "I would add more logs" without reading the stack is a junior move.

They may also ask how you mock an HTTP call (`respx`, `pytest-httpx`, or a fake client injected as a dependency).""",
   how="""A first test:

```
# tests/test_labels.py
from app.services.classify import label_of

def test_empty_ticket_returns_other():
    assert label_of("") == "other"

def test_charge_maps_to_billing():
    assert label_of("I was charged twice") == "billing"
```

Run: `uv run pytest -q`. On failure, pytest prints the assertion and the values.

Traceback habit: start at the last file:line. If it is a library, walk up until you see your code. Put `breakpoint()` on that line, rerun, inspect locals. For a live request, log the request id and the parsed body at INFO, not the secret.

Regression: once you have the failing input, keep it as a test. The bug cannot return silently.""",
   failures="""1. **Tests that hit the real API.** Flaky, secret-dependent, unpaid bills. Fake the client.

2. **No assertion.** `test_runs()` that calls the function and ignores the result.

3. **Reading the traceback from the top.** The first line is often import noise. Start at the bottom.

4. **Fixing without a repro.** You guessed. Write the failing test first.""",
   line="""I write pytest functions that name the rule and assert one thing. I debug from the last traceback frame, reproduce with the smallest input, and keep that input as a regression test. I do not call real networks in unit tests.""",
   key_points=[
    "pytest: test_*.py, test_* functions, assert.",
    "Read a traceback from the last frame of your code.",
    "A regression test is a unit test born from a real bug.",
    "Do not hit real HTTP or paid APIs in unit tests.",
    "breakpoint() beats a pile of prints once you know the line.",
    "Name the test after the rule, not after the function only.",
   ],
   questions=[
    q("apply", "Walk through reading a failing pytest traceback.", "Read the last frame first: file, line, exception. If it is a library, walk up to your code. Note the assertion values pytest printed. Reproduce with that input, then change code."),
    q("recall", "What makes a good unit test name?", "It states the behaviour: test_empty_ticket_returns_other. A reader can list the rules without opening the production file."),
    q("debug", "A test called test_classify has no assert and always passes. What is wrong?", "It never checks an output. Call the function and assert the label, the status, or the exception. A pass with no assert is not a test."),
    q("apply", "Your classifier calls an LLM. How do you unit-test the parser?", "Inject a fake complete() that returns a fixture string, or split parse() from complete() and test parse on stored payloads. The unit is your code, not the vendor."),
    q("recall", "When do you use a breakpoint versus a log line?", "Log at boundaries (request id, outcome) that you will want in production. Breakpoint when you need to inspect locals on a known line during development."),
   ],
   links=[
    {"title": "pytest documentation", "url": PYTEST},
    {"title": "Python tutorial: pdb", "url": f"{PY}/library/pdb.html"},
   ],
  ),
  "logging-vs-print-for-production-services": entry(
   what="""**`print`** writes a line to stdout with no level, no time, and no request id. **Logging** is a module (`logging`) or a library that emits **structured** events: a level (DEBUG, INFO, WARNING, ERROR), a timestamp, a logger name, and fields you attach — especially a **request id**.

In a service you search logs in a backend (CloudWatch, Loki, Datadog). A free-text print cannot be filtered by `request_id=abc` or `level=ERROR`. Structured logging means JSON lines or key=value fields, not an f-string novel.

`print` is fine in a one-off script or a test you will delete. It is not fine in a FastAPI worker that handles money or user text.""",
   why="""On the job, the 03:00 page is "users saw 500s". If you printed `'error'` somewhere, you cannot find which request, which route, or which model id. If you logged `{"request_id": "...", "route": "/classify", "exc": "Timeout"}` you can count and bisect.

Interviewers ask why print is not enough and what you put on every line. The answer: level, request id, and the outcome. They also ask what you must **not** log: API keys, raw tokens, full prompts that contain PII, passwords. Logging is a leak surface.

A senior engineer can explain how they propagate a request id from a middleware into the logger adapter so every line in that request shares it.""",
   how="""Minimal service logging:

```
import logging
import uuid
from fastapi import Request

log = logging.getLogger("app")

@app.middleware("http")
async def request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = rid
    logging.LoggerAdapter(log, {"request_id": rid})
    resp = await call_next(request)
    resp.headers["x-request-id"] = rid
    return resp
```

Log outcomes, not noise:

```
log.info("classify_ok", extra={"label": out.label, "ms": elapsed})
log.warning("provider_timeout", extra={"model": model})
```

Configure once at startup: JSON formatter in production, human formatter locally. Never `print(payload)` on a request that might hold an email.""",
   failures="""1. **print in handlers.** Lost in container logs, no level, no id.

2. **Logging secrets.** Authorization headers, cookies, full prompts. Redact.

3. **DEBUG in production.** Volume and PII. INFO for outcomes, DEBUG behind a flag.

4. **No request id.** You cannot join the app log to the provider log.""",
   line="""Print is for a script I will throw away. A service logs structured events with a level and a request id, never secrets or raw PII. I want to search one id across our logs and the provider's, and I want ERROR to mean something.""",
   key_points=[
    "print has no level, time or request id; logging does.",
    "Put a request id on every line so you can search one call.",
    "Log outcomes and errors, not every intermediate string.",
    "Never log secrets, cookies, or raw prompts that hold PII.",
    "JSON logs in production; human logs locally.",
    "DEBUG is a flag, not the default in prod.",
   ],
   questions=[
    q("recall", "Why is print a poor fit for a production FastAPI service?", "It has no level, no request id, and no structure, so you cannot filter or join lines in a log backend. Use the logging module (or a wrapper) with fields."),
    q("apply", "A user reports a 500 at 14:03. What do you ask them for, and what must already be in the logs?", "The request id from the response header or UI. Logs must already include that id, the route, and the exception type on the failing line."),
    q("debug", "You find `print(os.environ)` in a handler. What is the incident?", "Secrets in the process environment are now in the log store and in every replica's stdout. Remove it, rotate the secrets, and add a lint or hook that bans print in app/."),
    q("apply", "What fields do you put on a successful classify log line?", "request_id, route, model id, label or a hash, latency_ms. Not the full ticket text unless you have a redaction policy and a reason."),
    q("recall", "Where should the request id come from?", "Accept inbound X-Request-Id if present so a gateway can correlate, otherwise generate a UUID and return it on the response."),
   ],
   links=[
    {"title": "logging howto", "url": f"{PY}/howto/logging.html"},
    {"title": "FastAPI middleware", "url": "https://fastapi.tiangolo.com/tutorial/middleware/"},
   ],
  ),
  "virtualenv-vs-uv-lockfile-discipline": entry(
   what="""A **virtualenv** is a directory of binaries and site-packages. A **lockfile** is the list of exact versions that belong in that directory. Discipline means: create the env from the lock, do not invent versions from memory, do not share one env across projects, and do not treat `pip list` on your laptop as the source of truth.

`uv venv` (or `python -m venv`) makes the directory. `uv sync --frozen` fills it from `uv.lock`. A teammate who says "I already have fastapi installed globally" is not reproducing your app. A teammate who runs `uv sync` is.

The env is disposable. The lock is reviewed. If the env is dirty, delete it and sync again. That is cheaper than debugging a stray package.""",
   why="""On the job, onboarding fails when the README says "install fastapi, pydantic, uvicorn" without versions. Three weeks later torch or pydantic moved and only one person can run the tests. Lockfile discipline is how you give a new hire a one-command setup and how you make Docker identical to CI.

Interviewers ask how you would reproduce a teammate's environment. The answer is: clone, `uv sync --frozen`, same Python version. Not "I would pip install what they listed on a call". They may ask what you do if you must hotfix a transitive CVE — bump, relock, review the lock diff, deploy.

This is also how you explain a production-only bug: "the image was not frozen" is a process bug, not a Python bug.""",
   how="""Teammate setup:

```
git clone ...
cd service
uv python pin 3.12
uv sync --frozen
uv run pytest
```

If tests fail and yours pass, first `rm -rf .venv && uv sync --frozen`. Then compare `uv lock --check` and the Python version.

Hotfix a CVE in a transitive package: `uv lock --upgrade-package vulnerable-lib`, read the lock diff, run tests, commit lock and pyproject if a constraint changed.

Docker and CI use the same command. No `pip install -r requirements.txt` that was generated last quarter and never refreshed.""",
   failures="""1. **Global install.** One machine, many projects, version fights. Always a venv.

2. **README as the lock.** A bullet list of names without versions.

3. **Editing site-packages.** You cannot reproduce it. Relock or vendor properly.

4. **Different Python.** 3.10 vs 3.12 changes wheels. Pin the interpreter.""",
   line="""The virtualenv is disposable; the lockfile is the contract. I reproduce a teammate's environment with `uv sync --frozen` on the pinned Python, not from memory. If the env looks cursed I delete it and sync again.""",
   key_points=[
    "Virtualenv is the directory; the lockfile is the reviewed list of versions.",
    "Reproduce with uv sync --frozen, never from a remembered pip install.",
    "The env is disposable; delete and recreate when it looks dirty.",
    "Pin the Python interpreter as well as the packages.",
    "Hotfix a CVE by relocking and reviewing the lock diff.",
    "CI, Docker and laptops must use the same lock.",
   ],
   questions=[
    q("apply", "How do you reproduce a teammate's environment from the lockfile, not from memory?", "Clone the repo, use the pinned Python, run `uv sync --frozen`, then run the same pytest command. Do not pip-install names they mentioned in chat."),
    q("recall", "What is disposable and what is reviewed?", "The virtualenv directory is disposable. pyproject.toml and uv.lock are reviewed and committed."),
    q("debug", "Docker tests fail on a package that is not in pyproject.toml. Local is green. What happened?", "The image installed without the lock or used a stale requirements file. Copy uv.lock and sync --frozen in the image."),
    q("apply", "A transitive library has a CVE. What is the change you commit?", "A lockfile refresh (`uv lock --upgrade-package ...`) plus tests. If you need a constraint, add it to pyproject.toml. Do not patch site-packages."),
    q("recall", "Why is a global fastapi install a problem?", "Another project or a system upgrade can change it under you, and a teammate cannot match it. Isolation is per-project."),
   ],
   links=[
    {"title": "uv lock and sync", "url": "https://docs.astral.sh/uv/concepts/projects/sync/"},
    {"title": "venv module", "url": f"{PY}/library/venv.html"},
   ],
  ),
  "interview": entry(
   what="""This is a **walk-through skill**, not a new API. You are given a failing `pytest` and maybe a traceback. Your job is to **read the stack**, **name the unit** that is wrong, **reproduce** with the smallest input, and **leave a regression test** so the failure cannot return silently.

The unit is usually one function: a parser, a label mapper, a validator. The failing assert tells you expected versus actual. The traceback tells you the line. You do not start by rewriting the module. You do not start by blaming pytest. You start by understanding one input and one output.

Interviewers use this because it is the daily loop in a real team. They are scoring your order of operations and your language, not whether you memorised an exception name.""",
   why="""On the job this is every afternoon. A flaky classify test, a 500 in staging, a lockfile mismatch. People who jump to a rewrite waste the day. People who isolate the unit ship a five-line fix and a test.

In interviews, talking out loud is the product. Say what you see: "the last frame is `label_of` line 17, expected `'other'`, got `None`". Say what you will do: "I will call `label_of('')` in a REPL or a tiny test". Say what you will leave behind: "a test named `test_empty_ticket_returns_other`".

They may withhold the test file and only give a traceback from production. Same loop: last frame, smallest repro, then a test that would have caught it.""",
   how="""A live example. Test:

```
def test_empty_ticket_returns_other():
    assert label_of("") == "other"
```

Failure: `AssertionError: assert None == 'other'`. Traceback ends in `return mapping.get(key)` and `key` is `None` because `normalize` returned `None` on empty string.

Talk track:

1. Last frame: `label_of` → `normalize`.
2. Isolate: empty string is the input.
3. Hypothesis: normalize treats "" as missing and returns None; label_of does not map None.
4. Fix: `normalize` returns `""`, and `label_of` maps empty to `"other"` before lookup.
5. Keep the test. Add `test_whitespace_only_ticket_returns_other` if that was also wrong.

If the traceback is from pytest internals first, scroll to the first `app/` frame. If you need locals, `breakpoint()` on that line and rerun `uv run pytest tests/test_labels.py::test_empty_ticket_returns_other -s`.""",
   failures="""1. **Rewriting before reading.** You change architecture; the bug was a None.

2. **Fix without a test.** It will regress next week.

3. **Blaming the tool.** pytest is telling you expected versus actual. Use that.

4. **Silent pass.** Deleting the assert or marking xfail to "move on".""",
   line="""I read the last traceback frame, name the unit, reproduce with the smallest input, fix that path, and commit a regression test with a name that states the rule. I do not start with a rewrite, and I do not leave a green suite that never asserted the bug.""",
   key_points=[
    "Order: last frame → isolate the unit → smallest repro → fix → regression test.",
    "The assert's expected versus actual is the spec.",
    "Name the test after the rule you just learned.",
    "Do not rewrite the module until you can reproduce in one call.",
    "Talk out loud in the interview; the order is what they score.",
    "xfail or deleted asserts are not a fix.",
   ],
   questions=[
    q("apply", "Walk through debugging a failing pytest from a traceback.", "Start at the last frame in your code. Read expected versus actual. Call the function with that input. Change the unit, not the suite. Keep the input as a named regression test."),
    q("recall", "What do you leave behind after a production bug that had no test?", "A unit test that would have failed on the production input, named after the rule, plus the fix. Optionally a log field that would have made the next search faster."),
    q("debug", "A candidate deletes the failing test to make CI green. What did they fail?", "They removed the signal. The interview (and the job) wants the assertion kept and the code changed."),
    q("apply", "The traceback is 40 frames of library code. How do you find your unit?", "Scan for the first path under your package (app/ or src/). That frame is where your code called the library with a bad value."),
    q("recall", "Why is the smallest repro important?", "A 200-line fixture hides the cause. One input and one output makes the hypothesis cheap to test and the regression cheap to keep."),
   ],
   links=[
    {"title": "pytest how-to: failures", "url": "https://docs.pytest.org/en/stable/how-to/output.html"},
    {"title": "Python traceback module", "url": f"{PY}/library/traceback.html"},
   ],
  ),
 }
}
