from helper import entry, q

MDN = "https://developer.mozilla.org/en-US/docs/Web/HTTP"

NOTES = {
 "m0-2": {
  "the-http-request-response-cycle": entry(
   what="""HTTP is a **request/response** protocol. A client opens a connection (usually TLS to port 443), sends a **request line** (method, path, version), **headers**, and an optional **body**. The server reads that, runs your code, and sends a **status line**, **headers**, and an optional **body**. Then the connection may stay open for the next request (keep-alive) or close.

The **URL** is scheme, host, port, path, and query: `https://api.example.com/tickets/12?expand=comments`. The path is not the function name; it is the resource. Headers are metadata: `Authorization`, `Content-Type`, `Accept`, `X-Request-Id`. The body is the payload, often JSON.

Nothing is implicit. If the client does not send a header, the server does not have it. If the server does not write a status, the framework will invent one. You should know which.""",
   why="""On the job every LLM call, every webhook, every browser fetch is this cycle. When "the API is down" you need to know whether DNS failed, TLS failed, the request left, the server returned 502, or the client timed out while the server still worked. That diagnosis is the cycle, not the framework.

Interviewers ask you to narrate one GET and one POST. The senior narration names URL, method, headers, body, status, and where auth sits. They will then ask what a load balancer adds (another hop, `X-Forwarded-For`, TLS termination). If you cannot draw the cycle you cannot debug FastAPI or a model vendor.

This is also how you explain idempotency and retries later: the client may send the same request twice because it never saw the response.""",
   how="""A GET in pieces:

```
GET /tickets/12 HTTP/1.1
Host: api.example.com
Authorization: Bearer TOKEN
Accept: application/json
```

No body. The server looks up ticket 12 and answers:

```
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-Id: 7f3a

{"id":"12","title":"Cannot login"}
```

A POST has a body and a `Content-Type`. The server may answer `201 Created` with a `Location` header. Use curl to see the raw cycle: `curl -v https://api.example.com/tickets/12`. The `-v` stream is the lesson.

In FastAPI this cycle is hidden behind a function. The function's arguments are path, query, headers, and body. The return value becomes the body and, unless you say otherwise, status 200.""",
   failures="""1. **Confusing URL and path.** The host matters for TLS and cookies; the path is the resource.

2. **Assuming the body arrived.** A GET usually has none. A POST without Content-Type may not parse.

3. **Ignoring hops.** Client → CDN → load balancer → app. A 502 is often the hop, not your function.

4. **Not logging the request id** on both sides, so you cannot join client and server traces.""",
   line="""HTTP is one request and one response: URL, method, headers, optional body, then a status, headers, and optional body. I can draw those boxes and say which hop added a header. Debugging starts with `curl -v`, not with a framework guess.""",
   key_points=[
    "Request: method, URL, headers, optional body. Response: status, headers, optional body.",
    "The URL is host plus path plus query; the path is the resource.",
    "Headers are metadata; the body is the payload.",
    "Proxies add hops; 502 often means a hop failed, not your function.",
    "curl -v shows the cycle without a framework.",
    "Clients retry when they do not see a response — design for that.",
   ],
   questions=[
    q("recall", "Name the parts of an HTTP request and an HTTP response.", "Request: method, URL (host, path, query), headers, optional body. Response: status version and code, headers, optional body."),
    q("apply", "A browser shows a 502 on your API. Where do you look first?", "The hop in front of the app (load balancer, proxy). curl -v to the public URL and then to the app directly. 502 usually means the hop got a bad or no response from upstream."),
    q("debug", "Your FastAPI function never runs but the client got 404. What part of the cycle failed?", "Routing: method plus path did not match a route. Wrong prefix, trailing slash, or the request never reached this process."),
    q("apply", "What does curl -v tell you that the JSON body does not?", "The request line, request headers, status line, and response headers — TLS, redirects, and content type. That is the cycle."),
    q("recall", "Where does Authorization usually sit?", "A request header, typically `Authorization: Bearer TOKEN` or a vendor-specific header. Not in the URL, and not in a GET query string."),
   ],
   links=[
    {"title": "MDN: HTTP overview", "url": f"{MDN}/Overview"},
    {"title": "RFC 9110: HTTP semantics", "url": "https://www.rfc-editor.org/rfc/rfc9110.html"},
   ],
  ),
  "methods-idempotency": entry(
   what="""**GET** reads. **POST** creates or triggers work. **PUT** replaces a resource at a known URL. **PATCH** updates part of it. **DELETE** removes it. Those are conventions; the server decides what it actually does. **Idempotency** means repeating the same request leaves the system in the same state: one charge, one row, one delete.

GET, PUT, and DELETE are expected to be idempotent. POST is not, unless you make it so with an **Idempotency-Key** the server stores. A client that times out will retry. If POST `/charges` is not idempotent, the customer is billed twice.

Idempotent is not "safe". DELETE is idempotent (deleting twice is still gone) but not safe (it changes state). Safe means read-only: GET, HEAD.""",
   why="""On the job this is the double-charge incident. The mobile client retries a POST because the radio dropped after the server committed. Without a key you now have two orders. Payment APIs, job queues, and LLM "create thread" endpoints all need this.

Interviewers will give you that timeout story and ask for the design. The senior answer: the client sends a unique key, the server records the key with the result, a retry returns the same result and does not create a second row. They also ask which methods they can retry blindly — GET yes, POST only with a key.

Saying "we will just increase the timeout" is not a design. Timeouts still happen.""",
   how="""Create with POST and a key:

```
POST /orders
Idempotency-Key: 8b1c-...
{"sku":"tee","qty":1}
```

Server:

```
existing = db.get_key(key)
if existing:
    return existing.response   # same 201 and body
order = db.insert(...)
db.save_key(key, response)
return 201, order
```

PUT `/tickets/12` with the full document is naturally idempotent: sending it twice stores the same document. PATCH is trickier if it means "increment"; prefer "set field to value".

GET `/tickets/12` can be retried freely. Do not put a create on GET to "make it retryable" — caches and prefetch will create junk.""",
   failures="""1. **POST without a key** on a paid or unique action.

2. **Using GET to create** so browsers and CDNs replay it.

3. **Confusing idempotent with safe.** DELETE is idempotent.

4. **Key not stored with the response.** A retry creates a second row because you only checked "key seen" and then crashed before save.""",
   line="""GET, PUT and DELETE should be idempotent; POST is not unless I store an Idempotency-Key with the result. Clients retry on timeout, so a charge or an order must survive a duplicate request. Timeouts are not a reason to skip the key.""",
   key_points=[
    "GET reads; POST creates or triggers; PUT replaces; PATCH patches; DELETE removes.",
    "Idempotent means a retry does not create a second effect.",
    "POST needs an Idempotency-Key for charges, orders and unique creates.",
    "Safe (read-only) is not the same as idempotent.",
    "Never create on GET — caches will replay it.",
    "Store the key with the response, not just a 'seen' flag.",
   ],
   questions=[
    q("apply", "A client retries a timed-out POST /orders and the customer is charged twice. Which design fixes it?", "Require an Idempotency-Key. Store the key with the first response and replay that response on retries. Switching to GET or raising the timeout does not prevent duplicates."),
    q("recall", "Which common methods are expected to be idempotent?", "GET, PUT, DELETE (and HEAD). POST is not, unless you add a key. PATCH depends on whether the patch is a set or an increment."),
    q("debug", "You used GET /tickets/new?title=Hello to create tickets because GET is retryable. What goes wrong?", "Prefetch, crawlers and caches will create tickets. Idempotent create belongs on PUT or POST-plus-key, not GET."),
    q("apply", "How do you make PUT /tickets/12 idempotent in practice?", "The body is the full resource. Applying it twice writes the same fields. Avoid hidden increments in a PUT."),
    q("recall", "Why is DELETE idempotent?", "Deleting an already-deleted resource leaves it deleted. The second call should return 204 or 404 consistently, not create a new side effect."),
   ],
   links=[
    {"title": "MDN: HTTP request methods", "url": f"{MDN}/Methods"},
    {"title": "IETF: Idempotency-Key draft / Stripe-style keys", "url": "https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-06"},
   ],
  ),
  "status-codes": entry(
   what="""Status codes are grouped by the first digit. **2xx** success: `200` OK, `201` Created, `204` No Content. **3xx** redirect. **4xx** the **client** did something the server will not accept: `400` bad request, `401` unauthenticated, `403` authenticated but not allowed, `404` no such resource, `409` conflict, `422` semantically invalid body, `429` rate limited. **5xx** the **server** failed: `500` unexpected, `502/503/504` hop or overload.

The code is a contract with the client. A 404 means "do not retry with the same URL". A 429 means "retry after a delay". A 500 means "maybe retry, but this is our bug". A 401 means "get a new credential". Mixing them trains clients to do the wrong thing.

`401` versus `403` is the usual interview pair. `401` is "I do not know who you are" (or the token is missing/expired). `403` is "I know who you are and you may not".""",
   why="""On the job, mobile and frontend teams switch on these numbers. If your validation error is a 500, they show a generic crash and you get paged. If your "already exists" is a 400, they cannot offer "open the existing order". If your auth miss is a 403, they never refresh the token.

Interviewers will list codes and ask 409 versus 422 versus 400. A practical split: 400 malformed JSON, 422 well-formed but invalid fields, 409 the resource state conflicts (duplicate email, stale version). They will also ask what a client should do on 429 (back off, honour Retry-After) and on 501 (do not retry that method).

Returning 200 for every failure with `{"ok": false}` is a bug. HTTP already has a status line.""",
   how="""Create: `201` plus `Location: /tickets/12`. Delete with no body: `204`. Validation: `422` with a JSON body naming the field. Duplicate unique key: `409`. Missing row: `404`. No token: `401`. Token valid, role wrong: `403`. Uncaught exception: `500` and a request id, never a stack trace.

```
if not ticket:
    raise HTTPException(404, detail={"code": "not_found", "id": ticket_id})
```

Rate limit: `429` with `Retry-After: 2`. Clients should not hammer.

Do not invent 2xx for errors to "make the dashboard green". The dashboard should count 4xx and 5xx separately.""",
   failures="""1. **200 + error body.** Breaks every generic client.

2. **401/403 swap.** Frontends refresh on 401; a swap loops or never logs in.

3. **404 for "you may not see this".** Sometimes used on purpose (no existence leak). Say so. Do not use 404 for validation.

4. **500 for bad input.** That is a 4xx. 500 means you have a bug.""",
   line="""2xx worked, 4xx the client must change the request, 5xx we failed. I use 401 versus 403, 409 versus 422, and 429 with Retry-After on purpose. I never hide an error behind HTTP 200.""",
   key_points=[
    "2xx success, 4xx client must change something, 5xx server or hop failed.",
    "401 unknown or expired identity; 403 known identity, denied.",
    "400 malformed; 422 invalid fields; 409 state conflict.",
    "429 means back off; honour Retry-After.",
    "Do not return 200 with an error payload.",
    "500 is an unexpected bug — log a request id, not a stack to the client.",
   ],
   questions=[
    q("recall", "What is the difference between 401 and 403?", "401: no valid authentication (missing or expired token). 403: authenticated but not allowed to do this. Frontends usually refresh on 401 and give up on 403."),
    q("apply", "A user posts a ticket that already exists (unique title). Which code?", "409 Conflict. The request is well-formed; the current state refuses a second row. 422 would be a field that can never be valid."),
    q("debug", "Your API returns 200 and `{\"error\": \"missing email\"}`. What breaks?", "Generic clients and HTTP caches treat it as success. Use 422 with a consistent error body."),
    q("apply", "When is 404 the right answer for an authorized user?", "The resource id does not exist, or you choose to hide existence. Not for validation errors and not for missing authentication."),
    q("recall", "What should a client do with 429?", "Stop bursting. Wait Retry-After if present, then retry with jitter. Do not immediately replay the same stampede."),
   ],
   links=[
    {"title": "MDN: HTTP status codes", "url": f"{MDN}/Status"},
    {"title": "RFC 9110 status codes", "url": "https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes"},
   ],
  ),
  "headers-params-bodies-cookies": entry(
   what="""**Headers** are named metadata on request or response: `Content-Type`, `Authorization`, `Accept`, `Cache-Control`, `X-Request-Id`. **Query parameters** are the `?q=red&limit=20` suffix — good for filters and pagination on GET. **Path parameters** are segments of the path (`/tickets/{id}`) that identify a resource. **Bodies** carry the payload (JSON, form, file) and need a `Content-Type`. **Cookies** are headers the browser stores and resends; they are easy to send accidentally with every request.

These are different slots because caches, proxies and browsers treat them differently. Query strings are logged and leaked in Referer. Cookies can be marked `HttpOnly` and `Secure` but are sent automatically. Bodies are not cached on GET (and GET should not have a meaningful body).""",
   why="""On the job, putting a secret in the query string puts it in access logs, browser history, and every proxy. Putting a filter in the body of a GET means many clients cannot send it. Putting a session in a non-HttpOnly cookie makes it readable to XSS. These are not style nits.

Interviewers ask where the token goes (Authorization header), where the ticket id goes (path), where search goes (query), and where the create payload goes (JSON body). They ask why cookies are dangerous on a public API (CSRF if you use cookie auth) and why `Content-Type: application/json` matters (the framework decides how to parse).

A clean API makes these choices boring and consistent.""",
   how="""`GET /tickets?status=open&limit=20` — query for filters. `GET /tickets/12` — path for identity. `POST /tickets` with `Content-Type: application/json` and a body `{"title":"..."}`. Token: `Authorization: Bearer ...`. Correlation: `X-Request-Id` on the way in and out.

Files: `multipart/form-data`, not JSON. If you must send JSON and a file, a signed upload URL plus a JSON complete call is cleaner.

Cookies: for a browser session, `Set-Cookie` with `HttpOnly; Secure; SameSite=Lax` (or Strict). For a public JSON API consumed by other origins, prefer bearer tokens, not cookies, to avoid CSRF.""",
   failures="""1. **Secrets in query strings.** Logged everywhere. Use a header or body.

2. **JSON body on GET.** Many caches and clients drop it. Use query or POST.

3. **Wrong Content-Type.** Server does not parse; you debug "empty body".

4. **Cookie auth on a cross-site API** without CSRF defences.""",
   line="""Path identifies the resource, query filters it, headers carry auth and metadata, the body carries the payload with a Content-Type. I never put secrets in the URL. Cookies are for browsers and need flags; bearer tokens are for APIs.""",
   key_points=[
    "Path = identity, query = filters, header = metadata/auth, body = payload.",
    "Content-Type tells the server how to parse the body.",
    "Query strings are logged; never put tokens there.",
    "GET should not depend on a body.",
    "Cookies are automatic and CSRF-sensitive; mark HttpOnly and Secure.",
    "X-Request-Id belongs on the way in and out.",
   ],
   questions=[
    q("recall", "Where should an API token live, and why not in the URL?", "An Authorization header. URLs land in logs, history, Referer, and support tickets."),
    q("apply", "Design GET-list versus GET-one versus create for tickets.", "GET /tickets?status=&limit= for the list, GET /tickets/{id} for one, POST /tickets with a JSON body to create."),
    q("debug", "The body is always empty in FastAPI even though curl shows JSON. Likely cause?", "Missing or wrong Content-Type, or the client put JSON on a GET. FastAPI parses JSON when Content-Type is application/json on methods that have a body."),
    q("apply", "When would you use a cookie instead of a bearer token?", "A first-party browser app where you want the browser to store the session. Then set HttpOnly, Secure, SameSite, and CSRF protection. Not for a public API called from other origins."),
    q("recall", "What is a path parameter for?", "The identity of a resource in the URL, such as /tickets/{id}. Not for optional filters and not for secrets."),
   ],
   links=[
    {"title": "MDN: HTTP headers", "url": f"{MDN}/Headers"},
    {"title": "MDN: cookies", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies"},
   ],
  ),
  "working-with-json": entry(
   what="""**JSON** is a text format: objects, arrays, strings, numbers, booleans, null. It is the default body for public APIs and LLM tool calls. **Produce** means `json.dumps` or a Pydantic dump. **Parse** means `json.loads` or `model_validate`. **Validate** means the shape and types you expect, not "it parsed". **Manipulate** means you work on typed fields, not on a mystery dict.

JSON is not Python. `True`/`False`/`None` are `true`/`false`/`null`. Keys are strings. Numbers are not decimals with currency precision. There is no comment and no trailing comma. `NaN` and `Infinity` are not standard JSON even if Python's `json` can emit them with a flag.

A **schema** (Pydantic, JSON Schema) is how you say what "valid" is. Parsing success is not validity.""",
   why="""On the job, the model returns almost-JSON: a markdown fence, a trailing comma, a single quote. If you `json.loads` and crash, the user sees 500. If you validate, you store the raw text, return 422, and retry with a stricter prompt or a schema-constrained decode.

Interviewers ask you to spot illegal JSON, to choose between `dict` and a model, and to explain unicode and number pitfalls (`1e2`, large ints, floats for money). They ask how you pretty-print without changing semantics (`indent` is for humans; the wire can stay compact).

Treating JSON as "just a string I concat" is how injection and broken parsers happen. Treat it as data.""",
   how="""Parse and validate:

```
from pydantic import BaseModel

class TicketIn(BaseModel):
    title: str
    priority: int = 1

data = TicketIn.model_validate_json(raw)
```

Produce:

```
payload = TicketOut(id=t.id, title=t.title).model_dump_json()
```

Stream JSONL (one object per line) for logs. Do not wrap it in an array you must finish before writing.

When an LLM might wrap markdown, strip a ```json fence only in a dedicated sanitiser, then validate. If validation fails, do not guess a field. For money, use strings or integers (cents), not floats.""",
   failures="""1. **loads without a model.** KeyError later.

2. **Concatenating JSON with strings.** Broken escaping. Use dumps.

3. **Float money.** 0.1 + 0.2. Use integer cents.

4. **Accepting Python's NaN.** Other languages cannot read it.""",
   line="""JSON is a text format I produce and parse with a library, then validate with a model. Parse success is not validity. I never concat JSON by hand, I never use floats for money, and I treat LLM output as untrusted text until it validates.""",
   key_points=[
    "json.loads is parse; a model is validate — you need both at the edge.",
    "JSON is not Python: true/false/null, string keys, no comments.",
    "Do not concatenate JSON; use dumps or a model dump.",
    "Integer cents or strings for money, not floats.",
    "LLM JSON is untrusted; strip fences in one place and validate.",
    "JSONL for streams; a giant array for small documents.",
   ],
   questions=[
    q("recall", "What is the difference between parsing JSON and validating it?", "Parsing turns bytes into a list/dict. Validating checks required keys, types and ranges. A payload can parse and still be useless."),
    q("apply", "The model returns a markdown fence around JSON. What do you do in production?", "A single sanitiser strips a known fence, then Pydantic validates. On failure, log, return 422 or retry with schema constraints — do not regex out fields ad hoc in five places."),
    q("debug", "Why might `json.loads` succeed and your code still crash on `data['email']`?", "The key is missing or nested. Validate with a model that requires email so the crash becomes a 422 at the edge."),
    q("apply", "How do you log a million events as JSON without holding them in RAM?", "JSONL: write one dumps(event) per line. Readers stream line by line."),
    q("recall", "Why are JSON numbers a poor fit for currency?", "They are IEEE floats (or large ints with interoperability issues). Store integer cents or a decimal string and document it."),
   ],
   links=[
    {"title": "RFC 8259: JSON", "url": "https://www.rfc-editor.org/rfc/rfc8259.html"},
    {"title": "Python json module", "url": "https://docs.python.org/3/library/json.html"},
   ],
  ),
  "restful-resource-design": entry(
   what="""**REST** as practised in APIs means you model **resources** (nouns) with URLs and you use HTTP methods as the verbs. `/tickets` is a collection. `/tickets/12` is one ticket. `GET` lists or reads, `POST /tickets` creates, `PUT/PATCH /tickets/12` updates, `DELETE /tickets/12` removes. Nested resources (`/tickets/12/comments`) exist when the child cannot stand alone.

Clean design is boring: plural nouns, stable ids, no verbs in the path (`/getTicket`), no RPC soup (`/api?method=create`). Query parameters filter the collection. The body is the representation (usually JSON). Status codes carry the outcome.

REST is a constraint, not a religion. A `POST /tickets/12/close` can be honest if "close" is an action with rules. Prefer a field (`status: closed`) when it is just a state.""",
   why="""On the job, messy URLs become a second product. Mobile, web, and a partner all encode different verbs. When you add a field you discover three "create ticket" endpoints. A small resource map on a wiki saves months.

Interviewers will ask you to sketch tickets or orders in five minutes: collections, ids, list filters, 409 on duplicate, 422 on bad fields. They will mark you down for `/createTicket` and for returning 200 on create. They will mark you up for naming the conflict and the pagination.

This is also how you keep idempotency obvious: PUT on a known URL is easier than a verb soup.""",
   how="""A tiny ticket API:

- `GET /tickets?status=open&limit=20&cursor=`
- `POST /tickets` → `201` + `Location: /tickets/12`
- `GET /tickets/12`
- `PATCH /tickets/12` with `{"status":"closed"}`
- `DELETE /tickets/12` → `204`
- `GET /tickets/12/comments` and `POST /tickets/12/comments`

Ids are opaque strings (`12` or a UUID), not emails. Do not put `/v1` in every debate on day one if you can add it at the gateway later; do be consistent.

If two clients create "the same" ticket, decide the natural key and return `409` with the existing id.""",
   failures="""1. **Verbs in paths.** `/getTickets`, `/ticketCreate`. You will duplicate them.

2. **Unstable ids.** Using a title as the id, then the title changes.

3. **Deep nesting.** `/orgs/1/teams/2/tickets/3/comments/4` when `/comments/4` would do.

4. **One endpoint for everything** with a `action` field. That is RPC; document it as such if you must.""",
   line="""I design nouns as URLs and HTTP methods as verbs: collection, item, filters on the query, body as the representation. I pick stable ids, 201 on create, 409 on conflict. If I need a true action I name it, but I prefer a field when it is just state.""",
   key_points=[
    "Resources are nouns; methods are verbs.",
    "Collection URL plus id URL is the default shape.",
    "Query filters the list; body carries the representation.",
    "Stable opaque ids; 201+Location on create; 409 on conflict.",
    "Nest only when the child cannot stand alone.",
    "Prefer a status field over a /close verb when it is just state.",
   ],
   questions=[
    q("apply", "Sketch REST endpoints for tickets with comments.", "GET/POST /tickets, GET/PATCH/DELETE /tickets/{id}, GET/POST /tickets/{id}/comments. List filters on the query. 201+Location on create."),
    q("recall", "Why avoid /createTicket as a path?", "The method already means create (POST). A verb path duplicates endpoints and hides the resource."),
    q("debug", "Clients invent three different URLs to close a ticket. What do you publish?", "One: PATCH /tickets/{id} with {\"status\":\"closed\"}, plus 409 if a rule blocks the transition. Deprecate the extras."),
    q("apply", "What does 409 mean on POST /tickets?", "A conflicting existing resource — duplicate natural key, or a business rule. Return a body that points at the existing id when you can."),
    q("recall", "When is a verb path acceptable?", "When the action is not a field write — start a job, send a receipt — and you document it as an action, not as a hidden GET."),
   ],
   links=[
    {"title": "MDN: HTTP and REST (glossary)", "url": "https://developer.mozilla.org/en-US/docs/Glossary/REST"},
    {"title": "RFC 9110 resource semantics", "url": "https://www.rfc-editor.org/rfc/rfc9110.html"},
   ],
  ),
  "authentication-basics": entry(
   what="""**Authentication** is proving who the caller is. **Authorization** is what they may do. For HTTP APIs the common patterns are **API keys** (a secret string in a header), **bearer tokens** (often JWT or an opaque session, `Authorization: Bearer ...`), and cookies for browsers. The server looks up the identity, then checks the action.

Secrets do **not** belong in URLs, in frontend source, in git, or in screenshots. A key in a query string is copied into logs. A key in a mobile app is extracted. A key in a notebook is committed. Prefer a header, rotation, and a secret store.

A bearer token is "whoever holds it is that user". Treat it like a password: HTTPS only, short life if it is a JWT, revoke list or short TTL if it is opaque.""",
   why="""On the job, leaked keys are the incident. Git history, a public issue, a log aggregator, a student demo. Rotation and never-in-URL are the habits that make the incident small. Authorization bugs are the other half: a user reads another user's ticket because you trusted a client-sent `user_id`.

Interviewers ask where the key goes, why not the URL, and the difference between 401 and 403. They ask what a JWT is (a signed claim set, not automatically encrypted) and why you still look up the user for revocation. They ask how you would store the key on a server (environment or a secret manager, not a constant).

"We put the key in .env" is incomplete until you say .env is gitignored and production uses a real secret store.""",
   how="""API key for a server-to-server job:

```
Authorization: Bearer sk_live_...
```

or `X-API-Key`. The server hashes the key at rest and compares. You never log the raw key.

User login: issue a short-lived access token and a refresh token, or a session cookie. On each request, resolve identity from the token, then check the ticket's `owner_id` on the server. Ignore a client-sent owner.

Rotate: two valid keys during a window, then disable the old one. Put the key in the environment in production. In local dev, a gitignored `.env`.""",
   failures="""1. **Key in the query string.** Access logs forever.

2. **Key in a frontend bundle.** Users will extract it. That key can only be a public, rate-limited, scoped key.

3. **Trusting client user_id.** Authorization bypass.

4. **JWT as gospel without expiry or audience checks.** Stolen token lives forever.""",
   line="""Authentication says who; authorization says what. Tokens and API keys go in headers over HTTPS, never in URLs or git. I resolve identity on the server and I never trust a client-sent user id. 401 means I do not know you; 403 means I do.""",
   key_points=[
    "Authn = who; authz = what they may do.",
    "API keys and bearer tokens live in headers, never in URLs.",
    "Never commit secrets; production uses a secret store.",
    "Do not trust a client-sent user_id for authorization.",
    "JWTs are signed claims — still check expiry, audience, and revocation.",
    "401 versus 403 is the client-facing pair.",
   ],
   questions=[
    q("recall", "Why must API keys not appear in URLs?", "URLs are stored in logs, browser history, Referer headers and support tickets. A header over HTTPS stays off those paths."),
    q("apply", "A React app needs to call your API. Where does the secret live?", "Not in the bundle. The browser holds a user session (HttpOnly cookie or a token from your backend). Server-to-server secrets stay on the server."),
    q("debug", "Users can read other users' tickets by changing user_id in the JSON body. What failed?", "Authorization. Ignore client-sent owner ids; take the identity from the verified token and filter by that."),
    q("apply", "How do you rotate a leaked API key with little downtime?", "Issue a new key, accept both during a window, move clients, disable the old key, scan logs for remaining use."),
    q("recall", "What does 401 mean versus 403 after a bearer token check?", "401: missing, malformed or expired token. 403: token is valid but this identity cannot perform the action."),
   ],
   links=[
    {"title": "MDN: Authorization header", "url": f"{MDN}/Headers/Authorization"},
    {"title": "RFC 6750: Bearer token usage", "url": "https://www.rfc-editor.org/rfc/rfc6750.html"},
   ],
  ),
  "inspecting-apis-with-curl-postman": entry(
   what="""**curl** is a command-line HTTP client. **Postman** and **Bruno** are GUI clients. **Python HTTP clients** (`httpx`, `requests`) do the same from code. You use them to **inspect** what actually went on the wire: method, URL, headers, body, status, response headers. The OpenAPI page is a map; curl is the ground.

`-v` prints the request and response headers. `-d` sends a body. `-H` adds a header. `-o` writes the body to a file. You can replay a failing production request without the app UI. You can save a Bruno collection as the living examples for the README.

These tools do not replace tests. They are how you see the cycle when a test or a browser lies.""",
   why="""On the job, "it works in the UI" and fails in the partner integration is almost always a header or a content type. curl from the same machine as the partner, with the same header set, ends the argument. When TLS or a proxy is involved, curl `-v` shows the hop.

Interviewers may hand you a failing curl and ask what is wrong: missing `Content-Type`, GET with a body, a 301 you did not follow, a token in the query. Being fluent is a signal you have shipped. Saying "I would open Chrome" is slower and hides headers.

A saved collection is also how you onboard: import, set the token, hit the happy paths.""",
   how="""Read:

```
curl -sS -D - -o body.json \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Accept: application/json" \\
  https://api.example.com/tickets/12
```

`-D -` writes response headers to stdout. Create:

```
curl -sS -D - \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Printer jam"}' \\
  https://api.example.com/tickets
```

Python for the same:

```
r = httpx.post(url, json={"title": "..."}, headers={"Authorization": f"Bearer {token}"})
r.raise_for_status()
```

`json=` sets Content-Type. `data=` does not. That difference is a weekly bug.

Save the curl in the ticket when you file a bug. Future you can replay it.""",
   failures="""1. **Forgetting Content-Type.** Empty body on the server.

2. **Hiding `-v` when debugging TLS or redirects.**

3. **Putting the token in the shell history** in a shared lab. Use an env var.

4. **Trusting the GUI's pretty JSON** when the raw body has a BOM or a fence.""",
   line="""I inspect APIs with curl -v (or Bruno/httpx) so I see headers and status, not just pretty JSON. I send Content-Type on purpose, I keep tokens in env vars, and I paste a replayable curl into the bug. The OpenAPI page is the map; the wire is the truth.""",
   key_points=[
    "curl -v shows the real request and response headers.",
    "Content-Type must be set when you send JSON.",
    "httpx json= sets the header; data= does not.",
    "Save a replayable curl in the bug ticket.",
    "GUI clients are fine; still look at the raw body once.",
    "Tokens in env vars, not in shell history on a shared box.",
   ],
   questions=[
    q("apply", "Write a curl that creates a ticket with a bearer token.", "curl -H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\" -d '{\"title\":\"...\"}' https://api.example.com/tickets"),
    q("debug", "curl shows a JSON body but FastAPI sees none. What do you check?", "The Content-Type header on the request. -d without the JSON content type often arrives as a form."),
    q("recall", "What does curl -v add over curl with no flags?", "The request line, request headers, TLS, status line and response headers — the cycle, not just the body."),
    q("apply", "How do you prove a partner is missing a header?", "Run the same curl they documented, then add headers one at a time. Paste both -v outputs. The delta is the bug."),
    q("recall", "When do you use a GUI client instead of curl?", "Exploring a large collection, editing JSON bodies, sharing a Bruno/Postman file with the team. Still export a curl for the ticket."),
   ],
   links=[
    {"title": "curl manual", "url": "https://curl.se/docs/manual.html"},
    {"title": "httpx quickstart", "url": "https://www.python-httpx.org/quickstart/"},
   ],
  ),
  "pagination-filtering-and-idempotency-keys": entry(
   what="""**List endpoints** must not return unbounded tables. **Pagination** splits the list: offset/limit (simple, unstable when rows move) or **cursor** (a token for "after this id", stable under inserts). **Filtering** is query parameters that narrow the set (`status=open`). **Idempotency keys** on creates mean a retried POST does not add a second row, so a client can safely retry the whole "create then list" flow.

A list without a cap will work in demo and lock the database in production. A filter that is actually a full-text scan without an index will do the same. Design the default page size, the max page size, and the sort order as part of the contract.""",
   why="""On the job, mobile clients retry. If create is not idempotent and list is "give me everything", a flaky network produces duplicate orders and a 50 MB payload. Support then sees "the app created two tickets".

Interviewers ask you to design `GET /tickets` and `POST /tickets` together. They want a cursor, a default limit, a max limit, and an Idempotency-Key on POST. They will ask why offset pagination duplicates or skips rows when a new ticket is inserted at the top — because page 2 moved.

This is the first "production API" topic: the happy path is not enough.""",
   how="""List:

```
GET /tickets?status=open&limit=20&cursor=eyJpZCI6IjEyIn0
```

Response:

```
{"items":[...],"next_cursor":"..."}
```

The cursor is an opaque encoding of the last `(created_at, id)`. The query is `WHERE (created_at, id) < (...) ORDER BY created_at DESC, id DESC LIMIT 21` (21 to know if there is a next page).

Create:

```
POST /tickets
Idempotency-Key: 5c2a-...
{"title":"Printer"}
```

Store the key uniquely. A retry returns the first `201` and the same id. The client can then `GET /tickets?cursor=` without fearing a duplicate from the retry.

Cap `limit` at 100. Default 20. Reject unknown filter fields with 400 so typos do not silently return everything.""",
   failures="""1. **No max limit.** `limit=1000000` is a DOS.

2. **Offset on a live feed.** Inserts make pages overlap or skip.

3. **Create without a key.** Retries duplicate.

4. **Cursor that is just an offset.** You gained nothing. Encode the sort key.""",
   line="""Lists are filtered and cursor-paginated with a default and a max limit. Creates take an Idempotency-Key so a retry does not double-insert. I design those two together because clients retry the whole flow.""",
   key_points=[
    "Always cap list endpoints; default a small page size.",
    "Cursor pagination stays stable when new rows arrive; offset does not.",
    "Filters are query parameters; reject unknown ones.",
    "Idempotency-Key on POST so retries do not duplicate.",
    "The cursor encodes the sort key, not a page number.",
    "Design list and create together — clients retry both.",
   ],
   questions=[
    q("apply", "Why can offset pagination skip or duplicate tickets on a busy list?", "A new insert at the top shifts rows. Page 2 then overlaps page 1 or skips a row. A cursor on (created_at, id) does not shift."),
    q("recall", "What two numbers must a list endpoint publish?", "A default page size and a maximum page size. Unlimited lists are a production incident."),
    q("apply", "A mobile client retries POST /tickets after a timeout. How do you keep one row?", "Require Idempotency-Key, store it with the created resource, and replay the first response."),
    q("debug", "A partner sends limit=50000 and your DB CPU spikes. What did you forget?", "A max clamp (and an index for the filter/sort). Reject or cap the limit."),
    q("recall", "What should a cursor contain?", "Enough to resume the sort — typically the last sort key and id — as an opaque token the client cannot forge into a full table scan."),
   ],
   links=[
    {"title": "MDN: Range and pagination concepts", "url": f"{MDN}/Range_requests"},
    {"title": "Stripe: idempotent requests", "url": "https://docs.stripe.com/api/idempotent_requests"},
   ],
  ),
  "content-negotiation-and-error-bodies": entry(
   what="""**Content negotiation** is how client and server agree on a representation: the client sends `Accept`, the server picks a type and sets `Content-Type`. For a JSON API you serve `application/json` and you may reject other Accept values with `406`. **Error bodies** are the JSON you return on 4xx/5xx so a client can branch: a stable **code**, a human **message**, and the **request id**.

A consistent error shape is part of the API. `{"code":"not_found","message":"Ticket 12 does not exist","request_id":"7f3a"}` can be handled. A random HTML string from the proxy cannot. Validation errors add a `details` list of fields.

Negotiation also covers encoding and language in larger systems. For this level, JSON in and JSON out, plus a documented error object, is the contract.""",
   why="""On the job, mobile engineers switch on `code`, not on the English message. If you change the message, nothing breaks. If you change the code, that is a version. Support uses the request id. Without it, "it failed" is a dead end.

Interviewers ask what you return on 422 and 500. They want one schema, no stack traces to the client, and a request id on every error. They may ask about `Accept: application/json` versus a browser hitting the URL (`text/html`) — you still return JSON on the API host, or you serve docs on another path.

Returning FastAPI's default `{"detail": ...}` is fine if you document it and stick to it. Mixing `detail`, `error`, and a string is not.""",
   how="""Pick one shape and use an exception handler:

```
class ErrorBody(BaseModel):
    code: str
    message: str
    request_id: str
    details: list[dict] = []

@app.exception_handler(AppError)
async def on_app_error(request, exc):
    body = ErrorBody(code=exc.code, message=exc.message, request_id=request.state.request_id)
    return JSONResponse(exc.status, body.model_dump())
```

Uncaught errors become `code=internal` with status 500, the same shape, and a log line with the stack. The client never sees the stack.

If you support only JSON, ignore fancy negotiation except to reject `Accept: text/plain` on API routes with 406, or just always return JSON and document that.""",
   failures="""1. **Stack traces to the client.** Leak paths and secrets.

2. **Three error shapes.** Clients cannot branch.

3. **Message as the API.** You will never be able to reword it.

4. **No request id** on errors, so support cannot find the log.""",
   line="""I serve JSON and I return one error object: code, message, request id, optional field details. 4xx and 5xx still use that shape. The client never sees a stack trace. Codes are stable; messages are for humans.""",
   key_points=[
    "Accept/Content-Type are how you agree on JSON.",
    "One error shape: code, message, request_id, optional details.",
    "Codes are stable; messages can change.",
    "Never send a stack trace to the client.",
    "500 uses the same shape as 422.",
    "Document the shape in OpenAPI.",
   ],
   questions=[
    q("apply", "Write the JSON error body you want on every 4xx/5xx.", "{\"code\":\"not_found\",\"message\":\"Ticket 12 does not exist\",\"request_id\":\"7f3a\"} plus optional details for validation. Same keys on 500 with a generic message."),
    q("recall", "What is content negotiation in a JSON API?", "The client sends Accept, the server chooses a representation and sets Content-Type. For a single-type API you always return application/json and may 406 others."),
    q("debug", "A proxy returns an HTML 502. How does your client cope?", "Treat non-JSON as a transport error, surface the request id if you have one, and retry or fail. Do not parse HTML as your error schema."),
    q("apply", "Why include a machine code as well as a message?", "Clients branch on the code. You can rewrite the message for clarity without breaking mobile builds."),
    q("recall", "Where does the request id on an error come from?", "The same id you accepted or generated in middleware and put on the response header. Errors must reuse it."),
   ],
   links=[
    {"title": "MDN: Content negotiation", "url": f"{MDN}/Content_negotiation"},
    {"title": "RFC 7807: Problem Details", "url": "https://www.rfc-editor.org/rfc/rfc7807.html"},
   ],
  ),
  "interview": entry(
   what="""You will be asked to **design a tiny REST resource** on a whiteboard: nouns, verbs, statuses, and the difference between **409** and **422**. The resource is usually tickets, orders, or notes. They want a collection URL, an item URL, list filters, create, update, delete, and two or three error cases with codes.

409 is **conflict with current state**: the email is taken, the version is stale, the ticket is already closed. 422 is **the body fails your rules** even on a fresh resource: missing title, negative quantity. 400 is **malformed** (broken JSON). You should say those out loud.

They also want 201 + Location on create, 204 on delete, 401/403 for auth, and an idempotency note on POST. This is a talk, not a framework demo.""",
   why="""This is how interviewers test whether you have shipped an API, not whether you memorised FastAPI decorators. A candidate who only lists methods sounds like a tutorial. A candidate who names 409 versus 422, pagination, and a key for POST sounds like they have been paged.

On the job you will have this conversation with mobile and frontend in the first week of a feature. The whiteboard is practice for that.""",
   how="""Talk track for "support tickets":

1. Resources: `/tickets`, `/tickets/{id}`, `/tickets/{id}/comments`.
2. GET list with `?status=&limit=&cursor=`. Default limit 20, max 100.
3. POST `/tickets` with JSON `{title, body}` → 201 + Location. Idempotency-Key required.
4. PATCH `/tickets/{id}` for status. Illegal transition → 409. Bad field → 422. Missing id → 404.
5. DELETE → 204. Missing → 404.
6. Auth: bearer token, 401/403. Error body: code, message, request_id.

If they ask 409 vs 422: "422 means this body can never be accepted as-is. 409 means it could be, but not in the current state — retrying after a change might work."

Draw the table. Do not write FastAPI code unless they ask.""",
   failures="""1. **Only listing CRUD** with no statuses.

2. **Using 200 for create** and 500 for validation.

3. **Swapping 409 and 422.**

4. **No word on retries or pagination** when they asked for a production-ish sketch.""",
   line="""I sketch nouns as URLs, methods as verbs, 201 on create, and I say 422 is a bad body while 409 is a state conflict. I add a cursor, a max page size, an Idempotency-Key on POST, and one error shape. That is the tiny REST design they want.""",
   key_points=[
    "Whiteboard nouns, methods, and status codes — not framework code.",
    "422 = invalid body; 409 = valid body, conflicting state.",
    "201 + Location on create; 204 on delete.",
    "Mention pagination caps and Idempotency-Key without being asked twice.",
    "401/403 and a stable error body close the sketch.",
    "400 is malformed JSON, not a business rule.",
   ],
   questions=[
    q("apply", "Sketch verbs and statuses for a notes resource, and say what 409 vs 422 means.", "GET/POST /notes, GET/PATCH/DELETE /notes/{id}. 201 create, 204 delete, 422 missing title, 409 duplicate slug or stale version. 409 is state; 422 is the body."),
    q("recall", "What is the one-line difference between 409 and 422?", "422: the representation fails schema/rules by itself. 409: the representation conflicts with stored state (duplicate, version, illegal transition)."),
    q("apply", "They ask how a client should retry POST /notes. What do you add?", "An Idempotency-Key header, stored with the first response, so a timeout retry returns the same 201 and id."),
    q("debug", "A candidate returns 200 for every create and 500 for a missing title. How do you correct them?", "201 for create, 422 for the missing title. 500 is an unexpected server failure, not validation."),
    q("recall", "Name three statuses you would mention without being prompted.", "201 Created, 401/403, 404, 409, 422, 429. Any solid subset plus why."),
   ],
   links=[
    {"title": "MDN: 409 Conflict", "url": f"{MDN}/Status/409"},
    {"title": "MDN: 422 Unprocessable Entity", "url": f"{MDN}/Status/422"},
   ],
  ),
 }
}
