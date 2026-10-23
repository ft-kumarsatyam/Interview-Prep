from helper import entry, q

PG = "https://www.postgresql.org/docs/current"

NOTES = {
 "m0-4": {
  "relational-data-modeling": entry(
   what="""A **relational model** stores data in **tables** of **rows** and **columns**. Each table has a **primary key** that uniquely identifies a row. A **foreign key** is a column that points at a primary key in another table and is how you express relationships: one-to-many (a user has many orders), many-to-many (orders and products via a line-items table), one-to-one (rarely).

**Normalisation** is the habit of not repeating the same fact in two places. User email lives on `users`, not copied onto every order. The order stores `user_id`. When the email changes, one row updates. You denormalise later on purpose for read speed, not by accident.

Types matter: `text` versus `varchar`, `timestamptz` versus `timestamp`, `numeric` versus `float` for money. Nullability is part of the model: a column that must exist is `NOT NULL`.""",
   why="""On the job, a bad model is a year of pain. If line items are a JSON blob on the order, you cannot query "all SKUs sold last week" without a full scan. If you copy the user email onto the order, a typo fix does not propagate. AI apps add documents, chunks, and embeddings — those still have owners and foreign keys.

Interviewers will ask you to model users, orders, and line items. They want three tables, keys, and a word about why the product name is not only on the line item (or is, as a snapshot — say so). They will ask what a foreign key does at write time (the database rejects an order for a missing user).

Drawing boxes without keys is not a model.""",
   how="""```
users(id pk, email unique not null, created_at timestamptz)
orders(id pk, user_id fk -> users, status, created_at)
order_items(id pk, order_id fk -> orders, sku, qty, unit_price_cents)
```

One user, many orders. One order, many items. The SKU may also point at a `products` table; `unit_price_cents` is a **snapshot** so a later price change does not rewrite history.

Many-to-many: `documents` and `tags` with `document_tags(document_id, tag_id)` as the primary key.

Do not store a list of order ids on the user. The orders table already answers that query.""",
   failures="""1. **JSON blob for repeating rows** you will filter on.

2. **No primary key.** Updates and deletes become guesswork.

3. **Missing foreign keys.** Orphan orders.

4. **Float for money.** Use integer cents or numeric.""",
   line="""Tables, primary keys, foreign keys, and one fact in one place. Users, orders, and line items are three tables, not one spreadsheet. I snapshot prices on the line, and I do not store lists of children on the parent.""",
   key_points=[
    "Table = relation; PK identifies a row; FK points at another PK.",
    "One-to-many is a FK on the child; many-to-many needs a join table.",
    "Normalise by default; denormalise on purpose.",
    "Snapshot values that must not change when the source does (price).",
    "NOT NULL and unique are part of the model.",
    "Integer cents or numeric for money, never float.",
   ],
   questions=[
    q("apply", "Model users, orders and line items with keys.", "users(id pk), orders(id pk, user_id fk), order_items(id pk, order_id fk, sku, qty, unit_price_cents). One user many orders; one order many items."),
    q("recall", "What does a foreign key guarantee?", "You cannot insert a child that points at a missing parent (unless you defer), and you decide what happens on parent delete (restrict, cascade)."),
    q("debug", "Product names are copied onto every line item and now disagree with the products table. Is that always wrong?", "If you meant a snapshot of what the customer bought, keep it and name it. If you meant a live name, store product_id only and join."),
    q("apply", "How do you model documents and tags?", "documents, tags, and document_tags(document_id, tag_id) as a composite pk. Do not store a comma-separated tag string."),
    q("recall", "Why is a list of order ids on the user a bad column?", "It duplicates the orders.user_id relation, goes stale, and cannot be queried cleanly. The child table is the list."),
   ],
   links=[
    {"title": "PostgreSQL: table basics", "url": f"{PG}/ddl-basics.html"},
    {"title": "PostgreSQL: constraints", "url": f"{PG}/ddl-constraints.html"},
   ],
  ),
  "sql-with-postgresql": entry(
   what="""**SQL** is how you talk to PostgreSQL: `SELECT` to read, `INSERT` to add, `UPDATE` to change, `DELETE` to remove. You **filter** with `WHERE`, **sort** with `ORDER BY`, **group** with `GROUP BY` and aggregates (`count`, `sum`, `avg`), and **join** tables on keys.

PostgreSQL is a real server: types, transactions, indexes, JSONB if you need it. You write SQL in a console (`psql`), a GUI, or from Python. The language is the skill; the driver is plumbing.

`SELECT *` is for exploring. Production queries list columns. `LIMIT` is not pagination by itself. `JOIN` without a condition is a cartesian product.""",
   why="""On the job you will debug a slow page by reading the query, not the ORM log only. You will write a one-off backfill. You will check whether a join exploded. AI features still sit on SQL: "tickets for this user created this week" is a `WHERE`.

Interviewers will give you two tables and ask for a join with a count. They will ask the difference between `WHERE` and `HAVING` (HAVING filters groups). They will ask `LEFT JOIN` versus `INNER JOIN` (keep users with zero orders or not). They will mark `SELECT *` in a production handler as sloppy.

This is not optional for "AI engineers" who "do not do backend".""",
   how="""```
SELECT u.email, count(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= DATE '2026-01-01'
GROUP BY u.email
HAVING count(o.id) >= 2
ORDER BY orders DESC
LIMIT 50;
```

Insert returning the id:

```
INSERT INTO tickets (title) VALUES ($1) RETURNING id;
```

Always use parameters (`$1` or `%s`), never f-strings, to avoid injection.

Update and delete with a `WHERE`. An UPDATE without WHERE is a career event.""",
   failures="""1. **String-built SQL.** Injection.

2. **JOIN without ON.** Cartesian product.

3. **UPDATE/DELETE without WHERE.**

4. **SELECT *** in an API that then serialises secrets.""",
   line="""I write SELECT/INSERT/UPDATE/DELETE with WHERE, JOIN, GROUP BY and parameters. LEFT JOIN keeps parents without children. I never interpolate user text into SQL, and I never UPDATE without a WHERE.""",
   key_points=[
    "SELECT/INSERT/UPDATE/DELETE plus WHERE, ORDER BY, GROUP BY, JOIN.",
    "INNER JOIN drops non-matches; LEFT JOIN keeps the left side.",
    "HAVING filters aggregates; WHERE filters rows.",
    "Parameterise every query.",
    "RETURNING is the Postgres way to get inserted ids.",
    "UPDATE/DELETE without WHERE is a disaster.",
   ],
   questions=[
    q("apply", "Write a query: emails of users with at least two orders.", "SELECT u.email FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.email HAVING count(*) >= 2."),
    q("recall", "WHERE versus HAVING?", "WHERE filters rows before grouping. HAVING filters groups after aggregates."),
    q("debug", "A join returned millions of rows from two small tables. What happened?", "Missing or wrong JOIN condition — a cartesian product. Check ON."),
    q("apply", "How do you insert a ticket and get its id back in one round trip?", "INSERT ... RETURNING id; (or RETURNING *)."),
    q("recall", "Why is f-string SQL a security bug?", "User text can close the quote and append a command. Use bound parameters."),
   ],
   links=[
    {"title": "PostgreSQL SELECT", "url": f"{PG}/sql-select.html"},
    {"title": "PostgreSQL JOIN", "url": f"{PG}/tutorial-join.html"},
   ],
  ),
  "indexes-query-performance": entry(
   what="""An **index** is a separate structure (usually a B-tree) that lets PostgreSQL find rows without scanning the whole table. A **primary key** and **UNIQUE** constraint create indexes. You add more on columns you **filter or join** a lot: `user_id`, `created_at`, `(status, created_at)`.

Indexes speed reads and slow writes (each INSERT/UPDATE/DELETE must maintain them). They are not free. `EXPLAIN (ANALYZE, BUFFERS)` shows whether a query used an index or a sequential scan. A query that applies a function to the column (`WHERE lower(email) = ...`) cannot use a plain index on `email` unless you indexed `lower(email)`.

Selectivity matters: an index on a boolean that is 90% true is often useless.""",
   why="""On the job, "the API got slow" is often a missing index after the table grew from 1k to 3M rows. The query did not change. The plan did. You do not guess — you EXPLAIN.

Interviewers ask what an index is, why you do not index every column, and which index you would add first on an orders table (user_id, or (user_id, created_at) if you always filter both). They ask why `WHERE YEAR(created_at) = 2026` is slow. They like "I would EXPLAIN before adding a second index".

This is also how you talk about RAG later: the vector index is a different structure, but the idea "an extra structure for a kind of lookup" is the same.""",
   how="""```
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC);
```

A query `WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20` can ride that index.

Check:

```
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;
```

Look for `Index Scan` versus `Seq Scan` and the actual time. If you filter on `status` too, consider a partial index: `WHERE status = 'open'`.

Do not add ten indexes "just in case". Add the one the plan needs, measure writes.""",
   failures="""1. **No index on the FK you join.** Nested loop over a seq scan.

2. **Indexing every column.** Slow writes, unused indexes.

3. **Function on the column** that hides the index.

4. **Believing LIMIT 20 is cheap** when the sort still scans the table.""",
   line="""An index is extra structure for lookup. I index the columns I filter and join, I EXPLAIN before I add a second one, and I remember writes pay for every index. SELECT * plus a sort without an index is why the API died at 3 million rows.""",
   key_points=[
    "B-tree indexes speed equality and range lookups.",
    "PKs and UNIQUE already have indexes.",
    "EXPLAIN (ANALYZE) tells you if the index is used.",
    "Each index costs write time and disk.",
    "Expressions in WHERE can hide an index.",
    "Composite indexes match left-to-right filter/sort prefixes.",
   ],
   questions=[
    q("apply", "Which index would you add first on orders for 'orders for this user, newest first'?", "A composite (user_id, created_at DESC). user_id alone helps the filter but the sort may still spill."),
    q("recall", "Why not index every column?", "Writes and storage cost. Unused indexes still slow INSERT/UPDATE/DELETE. Add what EXPLAIN needs."),
    q("debug", "WHERE lower(email) = 'a@b.com' seq-scans a unique email column. Why?", "The index is on email, not lower(email). Create an expression index or store a normalised column."),
    q("apply", "How do you prove an index helped?", "EXPLAIN (ANALYZE, BUFFERS) before and after on production-sized data. Look at actual time and shared reads."),
    q("recall", "What index do you get for free?", "The primary key and any UNIQUE constraint."),
   ],
   links=[
    {"title": "PostgreSQL indexes", "url": f"{PG}/indexes.html"},
    {"title": "EXPLAIN", "url": f"{PG}/sql-explain.html"},
   ],
  ),
  "connecting-a-database-to-the-app": entry(
   what="""Python talks to PostgreSQL through a **driver** (`psycopg`, `asyncpg`) or an **ORM** (SQLAlchemy, SQLModel) that uses a driver. You create a **connection** or a **session**, run statements, and close it. In FastAPI you inject the session with `Depends` and open the pool at **startup**.

A connection string is a URL: `postgresql://user:pass@host:5432/dbname`. It lives in the environment, not in code. The app should fail at boot if the URL is missing. Health checks should hit `SELECT 1` so you know the network and auth work.

ORM or driver, you still have transactions and you still have SQL. The connection is not the model.""",
   why="""On the job, "cannot connect" is host, port, TLS, password, or a pool exhausted by leaked sessions. Wiring this cleanly once means every route does not invent its own `psycopg.connect`. Tests override the dependency.

Interviewers ask how FastAPI gets a session (dependency that yields), where the URL lives (env), and how you avoid opening a connection per request without a pool (you use a pool). They ask what happens if you forget to close — connections pile up until Postgres hits `max_connections`.

They may ask async versus sync drivers and how that matches your route style.""",
   how="""SQLAlchemy-style:

```
engine = create_engine(settings.database_url, pool_size=5, max_overflow=5)

def get_db():
    with Session(engine) as session:
        yield session
```

psycopg pool at lifespan, session per request. For async: `asyncpg.create_pool` in lifespan, acquire in a dependency.

Never connect at import time with a hard-coded URL. Never store the password in the image. Alembic uses the same URL for migrations.

A first query in a startup hook or a `/health/ready` endpoint catches bad config before traffic.""",
   failures="""1. **connect() in every request** without a pool.

2. **URL in source control.**

3. **Session not closed** (no yield/context).

4. **Import-time connect** that breaks tests and CLI tools.""",
   line="""The app gets a pooled connection from a dependency; the URL comes from the environment; I close the session after the request. I fail at boot if the URL is missing and I ready-check with SELECT 1. I do not connect at import.""",
   key_points=[
    "Driver or ORM, you still have a connection string and a pool.",
    "Inject a session with Depends; yield to close it.",
    "Open the pool in lifespan, not per request from scratch.",
    "DATABASE_URL is an env var; missing means crash at boot.",
    "SELECT 1 is a readiness check.",
    "Match async/sync driver to the route style.",
   ],
   questions=[
    q("apply", "How does a FastAPI route get a Postgres session?", "A get_db dependency that yields a Session from a pool created at startup. The route declares db: Session = Depends(get_db)."),
    q("recall", "Where does the connection URL live?", "In the environment (and a secret store in production), parsed into Settings. Not in git."),
    q("debug", "Postgres reports too many connections after a day of traffic. Likely cause?", "Sessions or connections not returned to the pool — missing context/yield, or connecting per request without a pool."),
    q("apply", "What should /health/ready do?", "Acquire a connection and run SELECT 1 (and any other must-work dependency). Fail ready if that fails so the platform stops sending traffic."),
    q("recall", "Why not connect at import time?", "Import happens in tests, CLIs and workers that should not need a DB, and failures become confusing ImportErrors."),
   ],
   links=[
    {"title": "psycopg3 connections", "url": "https://www.psycopg.org/psycopg3/docs/basic/usage.html"},
    {"title": "SQLAlchemy sessions", "url": "https://docs.sqlalchemy.org/en/20/orm/session_basics.html"},
   ],
  ),
  "credentials-outside-source-code": entry(
   what="""Database **credentials** are secrets: user, password, host if it identifies a private box, certificates. They belong in the **environment** or a **secret store** (platform secrets, AWS Secrets Manager, Doppler), injected at runtime. They do **not** belong in git, in a notebook, in a screenshot, or in a compiled image layer as a raw string you `echo`ed.

`.env` is a local convenience and is gitignored. `docker-compose` can point at the env file. Production uses the platform's secret injection. Rotation means a new password, a rolling restart, and the old password retired.

A connection URL with a password is still a secret. Treat the whole URL as secret.""",
   why="""On the job, a committed password is a full-database incident. History keeps it after you delete the line. Rotation and a `git filter` or a new cluster become the week. Scanners exist because this happens weekly on Earth.

Interviewers ask where `DATABASE_URL` lives and what you do if it leaked (rotate, scan history, check logs). They ask why putting it in `settings.py` with a default is wrong (the default gets used in prod, or the real value is committed). They ask how Docker gets it (`-e` or a secret mount, not `ENV PASS=...` in the Dockerfile).

This is the same rule as API keys. It is here because databases feel "internal" and people relax.""",
   how="""```
# .env  (gitignore)
DATABASE_URL=postgresql://app:local@localhost:5432/app
```

```
class Settings(BaseSettings):
    database_url: str  # required, no default
```

Dockerfile: no password. Compose:

```
environment:
  DATABASE_URL: ${DATABASE_URL}
```

Production: platform secret → env var. Rotate by changing the secret and restarting tasks. Do not print Settings in logs.

If you must put a sample in README, use a fake host and `changeme`, never a real account.""",
   failures="""1. **URL in git.**

2. **ENV in Dockerfile** with the real password (layer history).

3. **Default password in code** that someone used in prod.

4. **Logging the URL** on startup.""",
   line="""The whole DATABASE_URL is a secret. I load it from the environment, I gitignore .env, I never put it in a Dockerfile ENV, and I rotate if it leaks. No default in code that could silently run in production.""",
   key_points=[
    "Treat the full connection URL as a secret.",
    "Environment or secret store, not git and not the image.",
    ".env is local and gitignored.",
    "No real passwords in Dockerfile ENV.",
    "Required settings have no unsafe default.",
    "Rotate on leak; history may still hold the old value.",
   ],
   questions=[
    q("recall", "Why is a default DATABASE_URL in code dangerous?", "It can be used in production by mistake, or the real URL gets committed next to it. Require the env var and fail at boot."),
    q("apply", "How does a container get the password?", "The orchestrator injects it as an env var or a mounted secret at runtime. The image does not contain it."),
    q("debug", "You deleted a password from settings.py but GitHub still flags it. Why?", "Git history still has the commit. Rotate the password, then purge or accept that history is dirty and move the repo if policy requires."),
    q("apply", "What do you put in README for local setup?", "The env var names and a fake example. Not a real connection string."),
    q("recall", "Is the hostname of a private database a secret?", "Often yes — it is an internal address. At minimum the password is. Treat the URL as one secret."),
   ],
   links=[
    {"title": "12-factor config", "url": "https://12factor.net/config"},
    {"title": "Docker secrets", "url": "https://docs.docker.com/engine/swarm/secrets/"},
   ],
  ),
  "migrations-as-versioned-schema": entry(
   what="""A **migration** is a reviewed, versioned script that changes the schema: add a table, add a column, add an index. Tools like **Alembic** (SQLAlchemy) or **atlas** keep a history table in the database and apply the next scripts in order. You **never** `ALTER TABLE` by hand on production as the source of truth.

Forward is `upgrade`. Backward, if you write it, is `downgrade`. Some changes are not safely reversible (drop a column with data). You treat those as expand/contract: add the new column, backfill, switch reads, then drop the old one in a later migration.

The migration lives in git next to the models. Review it like code. Run it in CI against an empty database and in staging before production.""",
   why="""On the job, hand-edited production is how two environments drift and how a Friday night becomes archaeology. A migration you can replay on a blank database is how a new engineer gets a working schema. It is also how you survive an incident: restore a backup and replay migrations.

Interviewers ask how you add a column (write a migration, review, apply). They ask why you do not edit production in a GUI. They ask how you avoid locking a big table (add nullable column first, backfill in batches, then constrain). That last point is senior.

"The ORM will sync" (`create_all`) is not a production strategy. It will not drop or rename safely.""",
   how="""Alembic sketch:

```
alembic revision -m "add tickets.status"
# edit the file:
# op.add_column('tickets', sa.Column('status', sa.Text(), server_default='open', nullable=False))
alembic upgrade head
```

CI: spin Postgres, `alembic upgrade head`, run pytest. Deploy: migrate then start the new app, or migrate in a release job before traffic.

Expand/contract rename: add `email_new`, copy, switch, drop `email`. Two or three migrations, not one heroic `ALTER` that locks and loses the old column.""",
   failures="""1. **Hand ALTER on prod.** Staging diverges.

2. **create_all in production.**

3. **One migration that drops a column** the old app still writes.

4. **Unreviewed generated SQL** that drops data.""",
   line="""Schema changes are migration files in git, applied in order, never hand edits on production. I expand/contract dangerous changes so old and new app versions can coexist. create_all is for tests, not prod.""",
   key_points=[
    "Migrations are versioned, reviewed SQL (or ops) in git.",
    "A history table records what was applied.",
    "Never hand-edit production as the source of truth.",
    "Expand/contract for drops and renames.",
    "CI applies migrations on a blank database.",
    "create_all is not a migration strategy.",
   ],
   questions=[
    q("recall", "What is a migration?", "A versioned, reviewed change to the schema that can be applied in order on any environment. The database stores which ones have run."),
    q("apply", "How do you add a NOT NULL column to a 20 million row table?", "Add it nullable (or with a default) in one migration, backfill in batches, then add the NOT NULL constraint in a later migration once the old app is gone."),
    q("debug", "Staging is missing a column that production has. How did that happen?", "Someone altered production by hand. Replay is broken. Write the missing migration from prod, apply it everywhere, and ban hand edits."),
    q("apply", "Why deploy the migration before the new app (or in a compatible order)?", "If the new app reads a column that does not exist yet, it crashes. Expand first, then deploy code, then contract."),
    q("recall", "Why is create_all unsafe in production?", "It will not perform destructive or rename changes safely and it hides drift. Use explicit migrations."),
   ],
   links=[
    {"title": "Alembic tutorial", "url": "https://alembic.sqlalchemy.org/en/latest/tutorial.html"},
    {"title": "PostgreSQL ALTER TABLE", "url": f"{PG}/sql-altertable.html"},
   ],
  ),
  "transactions-and-isolation-in-practice": entry(
   what="""A **transaction** is a group of writes that **all commit or all roll back**. `BEGIN` … `COMMIT` (or `ROLLBACK` on error). **Isolation** is what concurrent transactions are allowed to see. PostgreSQL default is **READ COMMITTED**: you see others' committed work statement by statement. **REPEATABLE READ** / **SERIALIZABLE** tighten that for races.

If two requests increment the same counter without a transaction (or without a row lock), you lose an update. If you insert an order and items and the process dies in between, you get an order with no items — unless both writes were one transaction.

`with session.begin()` or `connection.transaction()` is the API. Autocommit each statement is not enough for multi-step writes.""",
   why="""On the job this is the missing-line-item bug and the double-spend bug. Money, inventory, and "create user + default project" are transactions. AI pipelines that write a job row and a blob pointer are too.

Interviewers ask what happens if two requests update the same row (lost update unless you lock or version). They ask when you need a transaction (more than one write that must stay together). They ask what `SELECT … FOR UPDATE` does (row lock until commit).

"The database will handle it" is incomplete until you say you opened a transaction.""",
   how="""```
with engine.begin() as conn:
    conn.execute(insert_order, ...)
    conn.execute(insert_items, ...)
```

If the second execute raises, the first rolls back.

Lost update:

```
-- two sessions
SELECT balance FROM accounts WHERE id = 1;  -- both see 100
UPDATE accounts SET balance = 90 WHERE id = 1;
UPDATE accounts SET balance = 80 WHERE id = 1;
-- last write wins, one debit vanished
```

Fix: `UPDATE accounts SET balance = balance - 10 WHERE id = 1` in one statement, or `SELECT … FOR UPDATE`, or an `version` column you check (`WHERE version = $old`).

Keep transactions short. Do not hold a transaction open while you call an LLM.""",
   failures="""1. **Two writes, no transaction.**

2. **Read-modify-write without a lock or version.**

3. **Long transaction** while waiting on HTTP — lock pileup.

4. **Catching an error and committing anyway.**""",
   line="""A transaction is all-or-nothing for a group of writes. I open one when two rows must stay in sync, I avoid lost updates with a single UPDATE or a version column, and I never hold a transaction across a network call to a model.""",
   key_points=[
    "Transaction = commit all or roll back all.",
    "Use one for multi-step writes that must stay together.",
    "READ COMMITTED is the default; races still exist.",
    "Lost updates need a single UPDATE, FOR UPDATE, or a version check.",
    "Keep transactions short; no LLM calls inside.",
    "Rollback on error; do not commit a half-finished unit.",
   ],
   questions=[
    q("apply", "You insert an order and its line items. Why do you need a transaction?", "If the process dies after the order insert, you would have an order with no items. One transaction makes them appear together or not at all."),
    q("debug", "Two requests set a counter from 5 to 6 and both succeed. What happened?", "Lost update: both read 5, both wrote 6. Use UPDATE counter = counter + 1, or a row lock, or an optimistic version."),
    q("recall", "What does SELECT ... FOR UPDATE do?", "It locks the selected rows until the transaction ends so another session cannot update them in the meantime."),
    q("apply", "Should you call an LLM inside a database transaction?", "No. You hold locks and connections for seconds. Write a job row, commit, call the model, then update in a second short transaction."),
    q("recall", "What happens if you do not commit?", "The driver or pool may roll back when the connection returns. Other sessions never see the writes. Always be explicit."),
   ],
   links=[
    {"title": "PostgreSQL transactions", "url": f"{PG}/tutorial-transactions.html"},
    {"title": "PostgreSQL isolation", "url": f"{PG}/transaction-iso.html"},
   ],
  ),
  "orms-vs-raw-sql": entry(
   what="""An **ORM** maps tables to classes and lets you write `session.execute(select(User).where(User.email == email))` instead of a string. **Raw SQL** is a string (or `text()`) you send to the driver. Use the ORM for **routine CRUD** and relationships. Drop to SQL when you need **EXPLAIN**, a **window function**, a **tight join**, a bulk update, or a vendor feature the ORM hides.

The ORM is not the enemy of SQL. It is a way to compose queries with types. The failure is never looking at the SQL it emits, or refusing SQL when the ORM fights you.

`create_all` is still not a migration. The ORM model and the migration must stay aligned.""",
   why="""On the job, people pick a religion. Pure ORM leads to N+1 queries (a loop of `user.orders` that fires one query each). Pure raw SQL leads to copied strings and injection. The adult mix is ORM by default, SQL when you can name why.

Interviewers ask when you would not use the ORM. Good answers: reporting query, EXPLAIN you want to paste, a bulk `UPDATE … FROM`, a full-text or JSONB query you already wrote. They ask what N+1 is. They ask how you log SQL (echo, or a slow-query log).

"I never write SQL" is a red flag in an AI backend interview.""",
   how="""CRUD:

```
ticket = Ticket(title=body.title)
session.add(ticket)
session.commit()
```

N+1 fix: `selectinload(User.orders)` or a join.

Raw when needed:

```
sql = text(
    "SELECT sku, sum(qty) AS n FROM order_items "
    "WHERE created_at >= :start GROUP BY sku ORDER BY n DESC LIMIT 20"
)
rows = session.execute(sql, {"start": start}).all()
```

Paste that into `EXPLAIN ANALYZE`. If you cannot, you do not understand the query the ORM wrote either — turn on `echo` once.""",
   failures="""1. **N+1** from lazy relationships in a loop.

2. **String SQL with f-strings.**

3. **Refusing SQL** for a 40-join ORM monster.

4. **ORM model drifted** from migrations.""",
   line="""ORM for everyday CRUD and typed composition; raw SQL when I need a plan, a bulk write, or a feature the ORM hides. I watch for N+1, I parameterise raw SQL, and I read the SQL the ORM emits when something is slow.""",
   key_points=[
    "ORM for routine CRUD; SQL for plans, bulk, and sharp edges.",
    "N+1 is the usual ORM foot-gun — eager load or join.",
    "Raw SQL still uses parameters.",
    "Read the emitted SQL when performance matters.",
    "Models and migrations must match.",
    "Neither religion scales; the mix does.",
   ],
   questions=[
    q("apply", "When do you drop the ORM and write SQL?", "When you need EXPLAIN on a specific statement, a bulk update, a window or JSONB query, or the ORM is emitting an N+1 or a huge join you can write better."),
    q("debug", "Listing 50 users fires 51 queries. What is that and the fix?", "N+1: one query for users, one per user for orders. Use selectinload or a join and one or two queries."),
    q("recall", "Does using an ORM remove SQL injection risk?", "Not if you interpolate strings into text() or literal_column. Use bound parameters in both styles."),
    q("apply", "How do you keep models and schema aligned?", "Migrations are the schema. Generate or write them from model changes, review the SQL, never rely on create_all in prod."),
    q("recall", "What is a good first step when an ORM query is slow?", "Log the SQL and EXPLAIN it. You cannot tune a query you have not seen."),
   ],
   links=[
    {"title": "SQLAlchemy ORM vs Core", "url": "https://docs.sqlalchemy.org/en/20/tutorial/orm_data_manipulation.html"},
    {"title": "SQLAlchemy text()", "url": "https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.text"},
   ],
  ),
  "connection-pooling": entry(
   what="""Opening a TCP+TLS+auth session to PostgreSQL is **expensive**. A **pool** keeps a set of live connections and **hands them out** for a request, then takes them back. You size the pool for **workers × connections per worker**, and you stay under Postgres `max_connections`.

A typical FastAPI process might have `pool_size=5` and `max_overflow=5`. Four workers is already 40 possible connections. A serverless function that opens a new connection per invoke will hit the limit and then sit waiting.

Pooling is not a cache of query results. It is a cache of connections. You still return the connection promptly.""",
   why="""On the job, the incident is `remaining connection slots are reserved`. Causes: no pool (connect per request and leak), pool too large for the instance, or a transaction held during an LLM call so the connection is busy for 20 s.

Interviewers ask why you do not connect per request (handshake cost, slot exhaustion) and how you pick a size (start small, watch `pg_stat_activity`, leave headroom for migrations and a human `psql`). They ask what happens on overflow (wait, then error).

Serverless plus a central Postgres is a special case: you need a pooler (PgBouncer) in front.""",
   how="""SQLAlchemy:

```
create_engine(url, pool_size=5, max_overflow=5, pool_timeout=30, pool_pre_ping=True)
```

`pool_pre_ping` drops dead connections after an idle deploy. Lifespan creates one engine per process.

Math: `max_connections` 100, three services × three tasks × (5+5) = 90, plus you. Too tight. Shrink the pool or add a pooler.

Do not copy a blog's `pool_size=20` on a 256 MB worker. Watch.

Return the session at the end of the request. Do not store it on a global user object.""",
   failures="""1. **Connect per request**, no pool.

2. **pool_size copied from a blog** × many workers > max_connections.

3. **Holding a connection** across a long HTTP call.

4. **No pre_ping** so idle kills become random errors after deploy.""",
   line="""A pool reuses connections; I size it for workers and leave room for Postgres. I do not connect per request, I do not hold a connection across an LLM call, and I enable pre_ping so idle disconnects do not become user errors.""",
   key_points=[
    "A pool caches connections, not query results.",
    "Size = per-process pool × process count must fit max_connections.",
    "Return connections at the end of the request.",
    "pool_pre_ping survives idle timeouts.",
    "Serverless usually needs an external pooler.",
    "Do not hold a connection while awaiting a model.",
   ],
   questions=[
    q("recall", "Why reuse connections instead of opening one per request?", "TCP, TLS and auth are costly, and unpooled leaks exhaust max_connections. A pool hands out an already-authenticated socket."),
    q("apply", "You have 4 uvicorn workers, pool_size=10, max_overflow=10. What is the worst-case connection count?", "4 × 20 = 80 from this service alone, plus other apps and humans. Check max_connections before you copy those numbers."),
    q("debug", "After a night of idle, the first request fails with a server-closed connection. Fix?", "pool_pre_ping=True (or a shorter idle timeout you control) so the pool replaces dead sockets."),
    q("apply", "Where should you acquire and release a connection in FastAPI?", "In a dependency that yields a session for the request only. Never across a background model call."),
    q("recall", "What is PgBouncer for?", "A connection pooler in front of Postgres so many short-lived clients (or serverless invokes) share a smaller set of real connections."),
   ],
   links=[
    {"title": "SQLAlchemy pooling", "url": "https://docs.sqlalchemy.org/en/20/core/pooling.html"},
    {"title": "PostgreSQL max_connections", "url": f"{PG}/runtime-config-connection.html"},
   ],
  ),
  "interview": entry(
   what="""You will be asked to **sketch users, orders, and line items**: tables, keys, and **one index you would add first**. They want to see a one-to-many twice (user→orders, order→items), a snapshot price on the line, and an index that matches a real query (`user_id`, or `(user_id, created_at DESC)`).

They may ask where the product name lives, what a foreign key does, and how you would add a column later (migration). This is a five-minute drawing plus talk, not a full schema review.

Name types if you can: `id` uuid or bigserial, `unit_price_cents` integer, `created_at timestamptz`.""",
   why="""This is the Level 0 data interview. It tests whether you think in relations or in blobs. A candidate who puts a JSON array of items on the order cannot query SKUs. A candidate who indexes every column has not run EXPLAIN. A candidate who mentions a migration sounds like they have shipped.

On the job you will draw this on a whiteboard with a PM before you write Pydantic models.""",
   how="""Talk track:

1. Draw `users`, `orders`, `order_items`.
2. PKs on all three. `orders.user_id` FK. `order_items.order_id` FK.
3. `order_items.unit_price_cents` and `sku` as a snapshot (optional `product_id` too).
4. First index: `orders(user_id, created_at DESC)` because the first screen is "this user's recent orders".
5. Mention UNIQUE(email) on users.
6. If they ask "what next": a migration file, not a GUI.

If they ask about products: a `products` table and a snapshot of price/name on the line so history does not change.

If they ask 409: unique constraint on something the business says is unique.""",
   failures="""1. **One table** with a JSON items column and no keys.

2. **No index**, or indexes on every column.

3. **Float prices.**

4. **Forgetting the FK** so orphans are allowed silently.""",
   line="""Three tables: users, orders, line items, each with a primary key and FKs down the chain. I snapshot price on the line. The first index is (user_id, created_at) because that is the first query. Schema changes go through a migration.""",
   key_points=[
    "users → orders → order_items with FKs.",
    "Snapshot unit_price_cents on the line.",
    "First index matches the first query: user plus recency.",
    "UNIQUE email; timestamptz for times.",
    "Mention migrations if they ask how it evolves.",
    "JSON items is the trap answer.",
   ],
   questions=[
    q("apply", "Sketch users, orders and line items with keys and one index.", "users(id, email unique), orders(id, user_id fk, created_at), order_items(id, order_id fk, sku, qty, unit_price_cents). Index orders(user_id, created_at DESC)."),
    q("recall", "Why snapshot the price on the line item?", "A later product price change must not rewrite what the customer paid. History is a fact."),
    q("apply", "Which index first, and why not every column?", "The one that serves the first list query. Extra indexes slow writes; prove the next one with EXPLAIN."),
    q("debug", "A candidate stores items as JSON on orders. What can they not do easily?", "Sum qty by sku, foreign-key to products, or paginate items independently — without scanning and parsing every order."),
    q("recall", "What constraint stops an order for a missing user?", "A foreign key on orders.user_id referencing users.id."),
   ],
   links=[
    {"title": "PostgreSQL DDL", "url": f"{PG}/ddl.html"},
    {"title": "PostgreSQL indexes", "url": f"{PG}/indexes.html"},
   ],
  ),
 }
}
