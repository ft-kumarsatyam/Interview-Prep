from helper import entry, q

FA = "https://fastapi.tiangolo.com"

NOTES = {
 "m0-3": {
  "routes-parameters-response-models": entry(
   what="""A **FastAPI route** is a function you attach to a method and path: `@app.get("/tickets/{id}")`. **Path parameters** come from the URL. **Query parameters** are function arguments with defaults. **Request bodies** are Pydantic models with no default, parsed as JSON. **Response models** (`response_model=`) declare what you return; FastAPI serialises and filters extra fields.

The function signature is the schema. `id: int` in the path becomes an integer or a 422. `limit: int = 20` is a query param. `ticket: TicketIn` is a body. `-> TicketOut` or `response_model=TicketOut` is the response. You are not parsing `request.json()` by hand.

A router (`APIRouter`) groups routes so `main.py` only includes them. Prefixes (`/v1`) belong on the router or the app, not in every path string.""",
   why="""On the job this is the whole public surface. A missing `response_model` leaks internal fields (`password_hash`, raw provider payloads). A path typed as `str` when you meant `int` lets junk through. A body typed as `dict` gives you no OpenAPI and no validation.

Interviewers will ask you to write a GET-by-id and a POST on a whiteboard. They want path vs query vs body right, a 201 on create, and a response model. They will ask how FastAPI knows a parameter is query not path — it is not in the path string.

This is also how clients generate SDKs: the signature is the contract.""",
   how="""```
from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter(prefix="/tickets", tags=["tickets"])

class TicketIn(BaseModel):
    title: str

class TicketOut(BaseModel):
    id: str
    title: str

@router.get("/{id}", response_model=TicketOut)
def get_ticket(id: str) -> TicketOut:
    ...

@router.get("/", response_model=list[TicketOut])
def list_tickets(status: str | None = None, limit: int = 20) -> list[TicketOut]:
    ...

@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(body: TicketIn) -> TicketOut:
    ...
```

`id` is path because it is in the string. `status` and `limit` are query. `body` is the JSON body. The 201 is explicit so you do not default to 200.""",
   failures="""1. **No response_model.** Internal fields leak.

2. **dict bodies.** No validation, empty docs.

3. **Putting filters in the path** (`/tickets/open/20`) instead of query.

4. **Forgetting status_code=201** on create.""",
   line="""FastAPI routes are functions: path params from the URL, query params from extra arguments, bodies from models, response_model for the outbound shape. I put 201 on create and I never return a raw ORM object without a response model.""",
   key_points=[
    "The function signature is the request schema.",
    "Path if it is in the URL; query if it has a default or is optional; body is a model.",
    "response_model filters and documents the outbound JSON.",
    "Set status_code=201 on create.",
    "APIRouter groups paths; main.py only includes routers.",
    "Do not parse request.json() by hand.",
   ],
   questions=[
    q("recall", "How does FastAPI decide a parameter is query versus path?", "If the name appears in the path string as {name}, it is a path parameter. Otherwise a simple type is a query parameter. A Pydantic model is a body."),
    q("apply", "Write the signature for list tickets with an optional status filter and a limit.", "def list_tickets(status: str | None = None, limit: int = 20) -> list[TicketOut]. Both are query params."),
    q("debug", "Clients see password_hash in GET /users/me. What did you forget?", "A response_model that only includes public fields. Returning the ORM or dict dumps everything."),
    q("apply", "How do you return 201 from a create route?", "status_code=status.HTTP_201_CREATED on the decorator, and a Location header if you want to be thorough."),
    q("recall", "Why use APIRouter?", "To split routes by area, add a prefix and tags once, and keep main.py as wiring."),
   ],
   links=[
    {"title": "FastAPI path parameters", "url": f"{FA}/tutorial/path-params/"},
    {"title": "FastAPI response model", "url": f"{FA}/tutorial/response-model/"},
   ],
  ),
  "validation-with-pydantic": entry(
   what="""**Pydantic** turns type hints into **validation and serialisation**. A `BaseModel` lists fields, types, and constraints (`Field(ge=1)`, `EmailStr`). `model_validate` / `model_validate_json` accept dicts or JSON and raise `ValidationError` on mismatch. `model_dump` / `model_dump_json` emit clean data.

FastAPI uses these models for bodies, query models, and responses. You do not write `if "title" not in data`. The model is the one place the rule lives. Nested models and lists work: `comments: list[CommentIn]`.

v2 is the current API (`model_validate`, not `parse_obj`). Constraints belong on the model, not in a comment.""",
   why="""On the job, untrusted JSON arrives from browsers, partners, and models. A Pydantic model at the edge is the cheapest bug-prevention you have. Teams that validate in three handlers drift. Teams that share `TicketIn` do not.

Interviewers ask you to write a model with a constrained field and to say what FastAPI returns when validation fails (422 with `detail` listing loc, msg, type). They ask why you would use `model_config = ConfigDict(extra="forbid")` — to reject unknown fields instead of silently dropping them.

They may ask dataclass versus Pydantic: dataclass is not a validator unless you add extra tools.""",
   how="""```
from pydantic import BaseModel, Field, ConfigDict, EmailStr

class UserIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    age: int = Field(ge=0, le=130)
    tags: list[str] = []
```

`UserIn.model_validate({"email": "a@b.com", "age": 3})` works. `age=-1` raises. Extra keys raise because of `extra="forbid"`.

FastAPI:

```
@app.post("/users")
def create(user: UserIn) -> UserOut:
    return save(user)
```

A failed body becomes 422 before `create` runs. For LLM output, call `ClassifyOut.model_validate_json(text)` in the service layer and handle `ValidationError` yourself.""",
   failures="""1. **dict everywhere.** You skipped the product.

2. **extra ignore by default** when unknown fields should be an error.

3. **Constraints in prose** ("age must be positive") not in Field.

4. **Validating twice differently** in the handler and the worker.""",
   line="""Pydantic models are the contract: types, constraints, extra-forbid, dump and validate. FastAPI turns a failed model into 422 before my handler runs. I use the same models for LLM JSON so a missing field dies at the edge.""",
   key_points=[
    "BaseModel validates and serialises; type hints are the schema.",
    "Field and types like EmailStr carry constraints.",
    "FastAPI maps ValidationError to 422.",
    "extra=forbid rejects unknown keys when that is the rule.",
    "Use the same models for HTTP and LLM JSON.",
    "v2 API: model_validate and model_dump.",
   ],
   questions=[
    q("recall", "What does FastAPI return when a Pydantic body fails validation?", "HTTP 422 with a detail list of errors: loc, msg, type. The handler does not run."),
    q("apply", "Write a model for a score between 0 and 1 and a required label.", "class Out(BaseModel): label: str; score: float = Field(ge=0, le=1)."),
    q("debug", "Clients send typo field `titel` and it is silently dropped. What do you change?", "ConfigDict(extra='forbid') so unknown fields 422 instead of vanishing."),
    q("apply", "Where do you validate JSON from an LLM?", "In the service, ClassifyOut.model_validate_json(raw). On ValidationError, log, retry or send to a dead letter — do not pass a dict downstream."),
    q("recall", "Name two Pydantic v2 methods you use every day.", "model_validate / model_validate_json inbound, model_dump / model_dump_json outbound."),
   ],
   links=[
    {"title": "Pydantic models", "url": "https://docs.pydantic.dev/latest/concepts/models/"},
    {"title": "FastAPI request body", "url": f"{FA}/tutorial/body/"},
   ],
  ),
  "dependency-injection": entry(
   what="""**Dependency injection** in FastAPI means a route declares what it needs with `Depends()`, and FastAPI **creates and reuses** those objects per request (or per app). A dependency is a function or class: get the DB session, get the current user, get a settings object, get an HTTP client.

```
def get_db():
    with Session() as s:
        yield s

@app.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    ...
```

The route does not construct the session. Tests override `get_db` with a fake. Nested dependencies work: `get_current_user` depends on `get_token` depends on the header.

This is how you avoid global singletons and import-time side effects.""",
   why="""On the job, globals are untestable and hide connection leaks. A `db = connect()` at module import opens a connection at import in every worker, including tests. Depends plus yield closes the session after the request.

Interviewers ask how you would pass a database into a route and how you would fake it in tests (`app.dependency_overrides[get_db] = ...`). They ask what `yield` in a dependency does (setup before, teardown after, like a context manager). That is the practical bar.

They may ask about `lru_cache` on a `get_settings` dependency — one settings object per process, still overridable in tests.""",
   how="""Settings once:

```
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()  # reads env
```

Auth:

```
def get_current_user(token: str = Depends(oauth2)) -> User:
    user = users_from(token)
    if not user:
        raise HTTPException(401)
    return user
```

Routes take `user: User = Depends(get_current_user)` and never see the header.

Tests:

```
app.dependency_overrides[get_db] = lambda: FakeSession()
```

Clear the override after the test. Do not patch internals of the route.""",
   failures="""1. **Globals for DB and clients.** Tests hit real services; connections leak.

2. **Heavy work in Depends without caching** on every request (re-reading a 10 MB config).

3. **Forgetting to close** when you do not yield.

4. **Overriding the wrong function** in tests so the real DB still runs.""",
   line="""Depends() is how a route asks for a session, a user, or settings without constructing them. I yield resources so they close, I override dependencies in tests, and I keep globals out of handlers.""",
   key_points=[
    "Depends declares per-request (or cached) collaborators.",
    "yield in a dependency is setup/teardown.",
    "Tests use app.dependency_overrides.",
    "get_current_user is a dependency, not a helper the route calls by hand.",
    "lru_cache get_settings is a process-level dependency.",
    "Avoid import-time connections.",
   ],
   questions=[
    q("recall", "What does yield do in a FastAPI dependency?", "Code before yield is setup, the yielded value is injected, code after yield is teardown after the request — even on exceptions."),
    q("apply", "How do you test a route that needs a database without hitting Postgres?", "Override get_db with a fake session: app.dependency_overrides[get_db] = fake. Call TestClient, then clear the override."),
    q("debug", "Every request re-parses a large settings file. Where should settings live?", "A get_settings dependency wrapped in lru_cache, or an object created at startup and closed over. Not a Path.read_text() in the route."),
    q("apply", "Sketch get_current_user.", "Read the bearer token via a security dependency, resolve the user, 401 if missing, return the user. Routes depend on that, not on the header."),
    q("recall", "Why not `db = Session()` at module level?", "One connection for the process, created at import, hard to close, impossible to override cleanly per test."),
   ],
   links=[
    {"title": "FastAPI dependencies", "url": f"{FA}/tutorial/dependencies/"},
    {"title": "Testing dependencies", "url": f"{FA}/advanced/testing-dependencies/"},
   ],
  ),
  "status-codes-error-responses": entry(
   what="""FastAPI defaults a route to **200**. You set others with `status_code=` on the decorator or by returning a `JSONResponse` / raising `HTTPException`. **Error responses** should be consistent: same JSON shape, correct class of code, no stack trace.

`HTTPException(status_code=404, detail=...)` is the built-in escape. For a richer body (`code`, `request_id`) you add an exception handler that maps your `AppError` to a `JSONResponse`. Use `status.HTTP_201_CREATED` constants so you do not typo 201 as 200.

`response_model` still applies to success. Errors bypass it unless you declare them in `responses=`.""",
   why="""On the job, clients and monitors key off the status. A create that returns 200 breaks a client that waits for 201. A validation miss that you re-raise as 500 pages you. A 404 that includes a stack trace leaks paths.

Interviewers ask how you return 201, 204, 404, 422. 422 is usually automatic from Pydantic. 404 is `HTTPException`. 204 is `status_code=204` and `return None`. They ask how you keep error JSON stable — a handler, not ad-hoc dicts in each route.

Declaring extra `responses` in OpenAPI is how you document the error body.""",
   how="""```
from fastapi import HTTPException, status

@router.post("/", status_code=status.HTTP_201_CREATED)
def create(body: TicketIn, db=Depends(get_db)) -> TicketOut:
    if db.exists_title(body.title):
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "duplicate"})
    return save(body)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: str, db=Depends(get_db)) -> None:
    if not db.delete(id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "not_found"})
```

Handler for a consistent body:

```
@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse(exc.status_code, {"code": ..., "message": ..., "request_id": request.state.request_id})
```

Do not catch everything and return 200.""",
   failures="""1. **Default 200 on create.**

2. **HTTPException with a string sometimes and a dict sometimes.**

3. **except Exception: return {"ok": False}.** Hides 500s.

4. **Stack traces in detail.**""",
   line="""I set status_code on the route for success (201, 204) and I raise HTTPException for 4xx. A single handler shapes error JSON with a code and request id. Pydantic already owns 422. I do not return 200 on failure.""",
   key_points=[
    "Default success is 200; set 201/204 explicitly.",
    "HTTPException for expected 4xx.",
    "One error JSON shape via a handler.",
    "Pydantic validation is 422 for free.",
    "Document errors in responses= if clients generate code.",
    "Never convert unknown exceptions into 200.",
   ],
   questions=[
    q("apply", "How do you return 201 and 409 from a create route?", "status_code=201 on the decorator. Raise HTTPException(409) when a unique key exists. Do not return 200 with a flag."),
    q("recall", "What status does a failed request body get in FastAPI?", "422 Unprocessable Entity from Pydantic, unless you customise the handler."),
    q("debug", "Deletes return 200 and a null body; a client treats it as a representation. What do you change?", "status_code=204 and return None so there is no body to parse."),
    q("apply", "How do you add a request id to every HTTPException?", "An exception handler that reads request.state.request_id and writes a JSONResponse with your error shape."),
    q("recall", "When do you use JSONResponse instead of raising?", "When you need full control of headers or a non-HTTPException path. Raising is cleaner for ordinary 4xx."),
   ],
   links=[
    {"title": "FastAPI handling errors", "url": f"{FA}/tutorial/handling-errors/"},
    {"title": "HTTP status codes in FastAPI", "url": f"{FA}/advanced/response-status-code/"},
   ],
  ),
  "clean-exception-handling": entry(
   what="""**Clean exception handling** means the client sees a **stable error body** and a correct status, while **your logs** see the stack and the request id. You do **not** let a raw traceback become the response. You do **not** catch `Exception` and return 200. You map known errors (not found, conflict, provider timeout) to 4xx/5xx, and you let unknown errors hit a last-resort handler that logs and returns 500.

FastAPI already converts `RequestValidationError` to 422. You add handlers for your domain errors and for `Exception`. In `debug` you might show more; in production you never send `str(exc)` if it could hold a path or a SQL fragment.

`raise` after log if you cannot handle it. Swallowing is how silent data loss happens.""",
   why="""On the job, a leaked traceback is a security finding and a support nightmare (users paste it in Twitter). A swallowed exception is worse: the client thinks the ticket was created. Teams that standardise handlers sleep better.

Interviewers will show a route with `except Exception: pass` or `return str(e)` and ask you to fix it. The answer: log with the request id, map known types, 500 for the rest, no stack to the client. They may ask how you test the 500 handler (raise a dummy error in a test route).

This is also where you hide provider error text that contains prompt fragments.""",
   how="""```
class NotFound(Exception):
    def __init__(self, code: str):
        self.code = code

@app.exception_handler(NotFound)
async def _(request, exc):
    rid = request.state.request_id
    log.info("not_found", extra={"request_id": rid, "code": exc.code})
    return JSONResponse(404, {"code": exc.code, "message": "Not found", "request_id": rid})

@app.exception_handler(Exception)
async def _(request, exc):
    rid = getattr(request.state, "request_id", "-")
    log.exception("unhandled", extra={"request_id": rid})
    return JSONResponse(500, {"code": "internal", "message": "Internal error", "request_id": rid})
```

Routes raise `NotFound("ticket_not_found")` or let a bug fall through. Tests assert the body and the status, not the traceback.""",
   failures="""1. **return str(e)** to the client.

2. **except Exception: pass** after a write.

3. **Logging the full prompt** inside the exception handler.

4. **No last-resort handler**, so Starlette's HTML error page leaks in production.""",
   line="""Known errors become typed exceptions and a JSON handler. Unknown errors are logged with a stack and a request id and return a generic 500. The client never sees a traceback, and I never swallow a write.""",
   key_points=[
    "Client: stable JSON. Logs: stack plus request id.",
    "Map domain errors; last-resort 500 for the rest.",
    "Do not send str(exc) in production.",
    "Do not swallow exceptions after a side effect.",
    "Hide provider text that may contain prompts or PII.",
    "Test handlers by raising in a test route.",
   ],
   questions=[
    q("debug", "A route does `except Exception as e: return e`. What do you change?", "Log the exception with the request id, return a generic 500 JSON body, and let known errors be typed exceptions with their own statuses."),
    q("apply", "How do you handle a missing ticket versus a bug in the serializer?", "Missing: raise NotFound → 404 handler. Serializer bug: unhandled → 500 handler that logs the stack. Do not use one except for both."),
    q("recall", "Why is a last-resort Exception handler necessary?", "Without it, the framework may return an HTML debug page or a default that does not match your error shape and may leak details."),
    q("apply", "What do you put in the 500 body?", "code=internal, a generic message, request_id. Not the exception string, not a stack."),
    q("recall", "When is it correct to re-raise after logging?", "When the current layer cannot produce a useful response and a higher handler or the last-resort handler should own the client body."),
   ],
   links=[
    {"title": "FastAPI handling errors", "url": f"{FA}/tutorial/handling-errors/"},
    {"title": "Starlette exception handlers", "url": "https://www.starlette.io/exceptions/"},
   ],
  ),
  "generated-openapi-docs": entry(
   what="""FastAPI builds an **OpenAPI** document from your routes, models, statuses, and docstrings. It serves **Swagger UI** at `/docs` and ReDoc at `/redoc` by default, and the raw schema at `/openapi.json`. The schema is derived: path params, query params, body schemas, response models, security schemes if you declared them.

If a field is not on the model, it will not be in the docs. If you return a dict, the docs say "empty object". If you set `response_model` and `responses={409: {...}}`, the docs tell the truth. The UI is a generated client, not a second source of truth you edit by hand.

You can export the JSON into a contract test or a partner portal. You can disable `/docs` in production if you do not want the UI public, while still shipping the schema internally.""",
   why="""On the job, OpenAPI is how mobile and partner teams work without Slack. A stale wiki page is worse than no page. Generated docs stay honest if you treat models as the contract. They also catch mistakes in review: a missing response model is visible.

Interviewers ask where the docs come from and what you have to add by hand (examples, descriptions, extra error responses). They ask whether you would hand-write Swagger — no. They ask how you hide docs in production (`docs_url=None`) while keeping the schema for CI.

Being able to open `/docs` and call your own API is the demo.""",
   how="""```
app = FastAPI(title="Tickets", version="1.2.0", docs_url="/docs", redoc_url=None)

class TicketOut(BaseModel):
    id: str
    title: str = Field(description="Short human title")
```

Add examples on Field, `summary` on the route, and `responses={404: {"model": ErrorBody}}`. Generate a contract file in CI:

```
# tests/test_openapi.py
assert client.get("/openapi.json").json()["info"]["version"] == "1.2.0"
```

Or snapshot the schema and fail on accidental diffs.

Production: `docs_url=None` if the API is public and you do not want a UI; keep an internal gateway that still serves it.""",
   failures="""1. **dict returns.** Docs show nothing useful.

2. **Hand-maintained Postman as the source of truth** that drifts from the app.

3. **Leaving /docs open** on a private API with no auth.

4. **No descriptions**, so the UI is a pile of `string` fields.""",
   line="""OpenAPI is generated from models and routes. I treat that schema as the contract: response models, error responses, Field descriptions. /docs is a view. I can disable the UI in production and still test openapi.json in CI.""",
   key_points=[
    "Docs come from code: routes, models, statuses.",
    "/docs, /redoc, /openapi.json are generated.",
    "response_model and responses= make the schema honest.",
    "dict returns produce empty schemas.",
    "You can disable the UI in production.",
    "CI can snapshot openapi.json as a contract.",
   ],
   questions=[
    q("recall", "Where does FastAPI's Swagger UI get its schema?", "From the OpenAPI document it builds at runtime from routes, Pydantic models, and declared responses. Served at /openapi.json."),
    q("apply", "The UI shows an empty response object. What did you miss?", "A response_model (or a return annotation FastAPI can turn into a schema). Returning dict is opaque."),
    q("apply", "How do you document a 409 on create?", "responses={409: {\"model\": ErrorBody, \"description\": \"Duplicate title\"}} on the route, using the same error model as the handler."),
    q("debug", "A public API has /docs open and an unauthenticated try-it-out that hits production data. What do you do?", "Disable docs in production or put them behind auth, and never let the UI talk to prod without the same auth as clients."),
    q("recall", "Name the three default doc URLs.", "/docs (Swagger UI), /redoc, /openapi.json."),
   ],
   links=[
    {"title": "FastAPI metadata and docs", "url": f"{FA}/tutorial/metadata/"},
    {"title": "OpenAPI specification", "url": "https://swagger.io/specification/"},
   ],
  ),
  "sync-vs-async-endpoints": entry(
   what="""FastAPI routes can be **`def`** (sync) or **`async def`**. Sync routes run in a **threadpool** so they do not block the event loop. Async routes run on the loop and must `await` I/O. Mixing a blocking call into `async def` is the bug: the loop waits, and other requests stall.

Use `async def` when you await an async DB driver, `httpx.AsyncClient`, or `asyncio.gather`. Use `def` when you call sync SQLAlchemy, a sync SDK, or CPU-heavy code you have not offloaded. Do not mark everything async as a style choice.

Starlette's threadpool is finite. A flood of sync routes can exhaust it. That is a capacity plan, not a reason to lie about async.""",
   why="""On the job this is the latency incident from Level 0's Python module, now in the framework. Someone copies an async example, pastes `requests`, and the service dies at ten concurrent users. The model is fine.

Interviewers will show `async def` + `time.sleep` or `requests.get` and ask what happens. They will ask when they should keep `def`. The senior answer: match the libraries you have; do not invent async for a sync ORM without an async driver.

They may ask how FastAPI runs `def` (anyio threadpool) and why that still has limits.""",
   how="""Async path:

```
@router.get("/preview")
async def preview(url: str, client: AsyncClient = Depends(get_client)):
    r = await client.get(url)
    return {"n": len(r.text)}
```

Sync path:

```
@router.get("/report")
def report(db: Session = Depends(get_db)):
    return db.query(...).all()  # sync SQLAlchemy
```

If you must call sync from async: `await asyncio.to_thread(sync_fn, arg)`. If you must do CPU work: a task queue, not the request thread.

Do not nest `asyncio.run` inside a running loop. FastAPI already runs a loop.""",
   failures="""1. **requests/time.sleep/sync SDK in async def.**

2. **asyncio.run inside a route.**

3. **Marking CPU-heavy work async** and expecting a speedup.

4. **Unbounded threadpool** of sync routes that each call a model for 30 s.""",
   line="""async def is for awaited I/O. def is for sync libraries and runs in a threadpool. I never block the loop. I pick the style that matches the driver I actually have, not the tutorial I copied.""",
   key_points=[
    "async def runs on the event loop; def runs in a threadpool.",
    "Blocking calls inside async def stall every request on the worker.",
    "Match the route style to the library.",
    "to_thread for leftover sync I/O inside async.",
    "asyncio.run inside a route is wrong.",
    "Async is not a CPU speedup.",
   ],
   questions=[
    q("debug", "An async route uses requests.get and p99 explodes under load. Why?", "requests blocks the event loop. Other requests on that worker wait. Use httpx.AsyncClient or to_thread."),
    q("recall", "How does FastAPI run a sync def route?", "It schedules it in a threadpool so the loop can keep accepting connections. The pool is finite."),
    q("apply", "You have sync SQLAlchemy and async httpx in one handler. What do you do?", "Keep the route async, await httpx, and run the SQLAlchemy call in to_thread — or split into two services. Do not block the loop."),
    q("apply", "When is a plain def the better choice?", "When every collaborator is sync and the work is short, or when you do not want to pretend the stack is async."),
    q("recall", "Why is asyncio.run inside a FastAPI route a bug?", "A loop is already running. asyncio.run wants to create and close a loop. Use await."),
   ],
   links=[
    {"title": "FastAPI concurrency and async / await", "url": f"{FA}/async/"},
    {"title": "FastAPI blocking I/O notes", "url": f"{FA}/advanced/async-sql-databases/"},
   ],
  ),
  "calling-external-services-without-blocking": entry(
   what="""From an **async** FastAPI route, external HTTP (LLM APIs, webhooks, metadata services) must be called with an **async client** shared via a dependency, not with `requests`. Create the client on **startup**, close it on **shutdown**, and inject it. That reuses connections (pooling) and keeps the loop free.

Timeouts are part of the call: connect timeout and read timeout. Retries belong behind an idempotency story. `asyncio.gather` fans out; a **semaphore** caps in-flight calls so you do not drown the provider or yourself.

A sync client inside `async def` is a blocking call. That is the whole topic.""",
   why="""On the job, the model vendor is the slow hop. If you block, you amplify their latency across every unrelated route on the worker. If you create a new client per request, you pay TCP/TLS every time and you leak sockets.

Interviewers ask how you would call OpenAI from FastAPI. They want: async client, startup/shutdown, timeout, dependency injection, no requests. They want a note on not holding the request open for a 60 s generation if you can queue it — but at this level, at least do not block the loop.

They may ask how you test this (respx, httpx mock, or override the client dependency).""",
   how="""```
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(base_url=SETTINGS.model_url, timeout=15.0) as client:
        app.state.client = client
        yield

def get_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.client

@router.post("/summarise")
async def summarise(body: In, client: httpx.AsyncClient = Depends(get_client)):
    r = await client.post("/v1/complete", json={"prompt": body.text})
    r.raise_for_status()
    return Out.model_validate(r.json())
```

Fan-out:

```
sem = asyncio.Semaphore(8)
async def one(p):
    async with sem:
        return await client.post(..., json=p)
await asyncio.gather(*[one(p) for p in parts])
```

If the SDK is sync-only, `await asyncio.to_thread(sdk.call, **kw)`.""",
   failures="""1. **New AsyncClient per request** without a context — leaks.

2. **No timeout.** A hung vendor holds the worker.

3. **requests in async def.**

4. **gather of 10_000 calls** with no semaphore.""",
   line="""I share one AsyncClient for the app lifetime, inject it, set timeouts, and await every hop. I cap concurrency when I fan out. I never call requests from an async route. The vendor can be slow; my loop must not be.""",
   key_points=[
    "One shared AsyncClient, opened in lifespan, closed on shutdown.",
    "Always set timeouts.",
    "Depends injects the client; tests override it.",
    "Semaphore around gather.",
    "to_thread if the vendor SDK is sync-only.",
    "Do not construct a client on every request without a plan.",
   ],
   questions=[
    q("apply", "How do you call an external HTTP API from an async FastAPI route?", "Inject a shared httpx.AsyncClient created in lifespan, await client.post with a timeout, raise_for_status, validate the JSON."),
    q("debug", "File descriptor count climbs until the process dies. You construct AsyncClient inside the route. Why?", "Each request opens a pool you never close. Use one client for the app, or `async with AsyncClient()` for the life of the request."),
    q("apply", "The official SDK is synchronous. What do you do in an async route?", "await asyncio.to_thread(sdk.method, ...) or run that work on a queue. Do not call it directly in async def."),
    q("recall", "Why is a timeout mandatory on vendor calls?", "Without one, a hung peer holds a worker slot (and a connection) until the process is killed."),
    q("apply", "How do you test the route without hitting the vendor?", "Override get_client with a fake that returns a fixture, or use respx to mock the URL."),
   ],
   links=[
    {"title": "httpx AsyncClient", "url": "https://www.python-httpx.org/async/"},
    {"title": "FastAPI lifespan events", "url": f"{FA}/advanced/events/"},
   ],
  ),
  "startup-config-middleware": entry(
   what="""**Startup and shutdown** (the `lifespan` context manager) is where you create shared clients, warm a cache, and close them cleanly. **Configuration** is environment variables parsed once into a settings object (`pydantic-settings`), not `os.environ[...]` sprinkled in routes. **Middleware** is a hook around every request: add a request id, CORS, timing, auth at the edge.

Lifespan runs once per process. Middleware runs per request. Settings are read at import or first use and then cached. Mixing these up — opening a DB on every request, reading a file in middleware the wrong way — shows up as latency or leaks.

CORS is middleware. Request ids are middleware. "Log the user" is usually a dependency, not middleware, because you need the route's security scheme.""",
   why="""On the job, a process that does not close its HTTP pool on shutdown fails health checks on deploy (connections reset). A service that reads env vars in three places disagrees with itself. Middleware that does heavy work adds milliseconds to every route.

Interviewers ask where you put the HTTP client (lifespan), where the database URL lives (settings from the environment), and how you add a request id (middleware). They ask why CORS failed a browser app (missing middleware or wrong origins). They ask how you test middleware (TestClient still runs it).

This is the skeleton of a service that can actually be deployed.""",
   how="""```
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    model_url: str
    cors_origins: list[str] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = Settings()
    async with httpx.AsyncClient() as client:
        app.state.client = client
        yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, ...)

@app.middleware("http")
async def add_id(request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    return response
```

Settings fail at boot if `DATABASE_URL` is missing. That is what you want.""",
   failures="""1. **Creating clients in the route.**

2. **os.getenv with a wrong default** that hides a missing secret.

3. **Middleware that reads the body** and then the route cannot.

4. **CORS * with credentials.** Browsers reject it; do not "fix" by echoing secrets.""",
   line="""Lifespan owns shared clients, settings come from the environment once, middleware adds cross-cutting headers like a request id and CORS. I fail at boot if required config is missing. I do not open a new world on every request.""",
   key_points=[
    "lifespan: create and close process-wide resources.",
    "Settings object from environment variables; fail if required values are missing.",
    "Middleware wraps every request; keep it light.",
    "Request id and CORS are middleware; current user is usually Depends.",
    "Do not read the body in middleware unless you know how to rewind it.",
    "TestClient exercises middleware.",
   ],
   questions=[
    q("recall", "What belongs in lifespan versus middleware versus Depends?", "Lifespan: process-wide clients and pools. Middleware: every-request headers and CORS. Depends: per-route collaborators like a user or a session."),
    q("apply", "Where do you load DATABASE_URL?", "A Settings model read at startup. Missing value should crash the process, not fail the first request."),
    q("debug", "After deploy, connections to the vendor stay ESTABLISHED until the old task is killed. What did you forget?", "Closing the shared client in lifespan shutdown so the process drains cleanly."),
    q("apply", "How do you add a request id that clients can send back?", "Middleware: accept X-Request-Id or generate one, store on request.state, set it on the response."),
    q("recall", "Why is CORS middleware required for a browser SPA on another origin?", "Browsers block cross-origin reads unless the API opts in with Access-Control-Allow-Origin and friends."),
   ],
   links=[
    {"title": "FastAPI lifespan", "url": f"{FA}/advanced/events/"},
    {"title": "pydantic-settings", "url": "https://docs.pydantic.dev/latest/concepts/pydantic_settings/"},
    {"title": "FastAPI CORS", "url": f"{FA}/tutorial/cors/"},
   ],
  ),
  "testing-endpoints": entry(
   what="""FastAPI ships `TestClient` (Starlette / httpx) so you call your app **in process**: no real TCP, no real uvicorn. You write pytest functions that `client.get` / `client.post` and assert status and JSON. You **override dependencies** for the DB and vendors. You do not need to start a server for unit or API tests.

`TestClient` runs the event loop and middleware. Lifespan can be entered with `with TestClient(app) as client` so startup runs. For async tests, `httpx.AsyncClient(transport=ASGITransport(app=app))` plus `pytest-asyncio`.

A good endpoint test hits the contract: 201 body, 422 on bad input, 404 on missing, auth 401. It does not hit Postgres or OpenAI.""",
   why="""On the job, endpoint tests are how you refactor routes without breaking mobile. A test that needs a deployed server is slow and flaky. A test that uses the real vendor costs money and fails the build when they blink.

Interviewers ask how you test a FastAPI route. The answer is TestClient + dependency_overrides + pytest. They ask how you assert 422 (send a bad body). They ask how you test 401 (omit the token). They ask why you still want a few real integration tests later — you do, but not as the default.

"I would click /docs" is exploration, not a test.""",
   how="""```
from fastapi.testclient import TestClient
from app.main import app
from app.deps import get_db

def fake_db():
    return FakeSession()

app.dependency_overrides[get_db] = fake_db
client = TestClient(app)

def test_create_ok():
    r = client.post("/tickets", json={"title": "Hi"})
    assert r.status_code == 201
    assert r.json()["title"] == "Hi"

def test_create_blank():
    r = client.post("/tickets", json={"title": ""})
    assert r.status_code == 422
```

Clear overrides in a fixture (`yield` then `app.dependency_overrides.clear()`). Use one client per test module if settings are static.

Contract tests can snapshot `/openapi.json`. Do not snapshot full HTML.""",
   failures="""1. **Starting uvicorn in the test.** Slow, port fights.

2. **Real DB and real LLM** in every test.

3. **Not clearing dependency_overrides** so tests leak into each other.

4. **Asserting only 200** and ignoring the body.""",
   line="""I test FastAPI with TestClient and pytest: override the DB and vendors, assert statuses and JSON, including 422 and 401. I do not boot a server. I clear overrides so tests stay isolated.""",
   key_points=[
    "TestClient calls the ASGI app in process.",
    "Override dependencies; do not hit real IO by default.",
    "Assert 201/422/401/404, not only 200.",
    "Clear dependency_overrides between tests.",
    "with TestClient(app) runs lifespan.",
    "/docs is not a test suite.",
   ],
   questions=[
    q("apply", "How do you pytest a POST /tickets route?", "TestClient(app), override get_db, client.post json={...}, assert 201 and the body. A second test sends a bad body and asserts 422."),
    q("recall", "Why use TestClient instead of uvicorn in tests?", "No port, no process, faster, deterministic. You still exercise routing, validation and middleware."),
    q("debug", "The second test hits the real database even though the first used a fake. Why?", "dependency_overrides were not cleared. Use a fixture that clears after yield."),
    q("apply", "How do you test that missing auth is 401?", "Call the route without the Authorization header (and without overriding get_current_user to a user). Assert 401 and the error shape."),
    q("recall", "When do you write an integration test against a real Postgres?", "A small set in CI with a disposable database, after the in-process suite. Not for every case."),
   ],
   links=[
    {"title": "FastAPI testing", "url": f"{FA}/tutorial/testing/"},
    {"title": "Starlette TestClient", "url": "https://www.starlette.io/testclient/"},
   ],
  ),
 }
}
