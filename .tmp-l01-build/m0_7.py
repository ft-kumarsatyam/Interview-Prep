from helper import entry, q

DK = "https://docs.docker.com"

NOTES = {
 "m0-7": {
  "app-vs-environment-vs-machine": entry(
   what="""Three layers. The **application** is your code and its declared dependencies (`app/`, `pyproject.toml`). The **environment** is the concrete Python, packages, env vars, and files that code sees when it runs. The **machine** is the OS, kernel, CPU, and disk that host that environment — your laptop, a VM, or a container host.

A bug can live in any layer. "Works on my machine" usually means the environments differ (Python 3.12 vs 3.10, a missing env var) or the machines differ (no Postgres, different libc). Containers exist to make the **environment** a shipped artefact so the machine can be generic.

You do not ship your laptop. You ship an image of the environment plus the app.""",
   why="""On the job this is how you talk about Docker without magic. Interviewers ask why Docker helps (same environment on laptop, CI, and prod) and what it does not do (it does not remove the need for config and secrets; it does not make a bad app correct). They ask what still differs (the machine: GPUs, disk, the host network).

They will ask where a missing `DATABASE_URL` lives (environment) versus a segfault in a wheel (often machine/glibc) versus a logic bug (app).

This split is the rest of the capstone.""",
   how="""Laptop: app is the repo, environment is `.venv` + `.env`, machine is macOS.

CI: app is the checkout, environment is what `uv sync --frozen` built, machine is the runner image.

Prod: app is a COPY in a Dockerfile, environment is the image layers plus injected env vars, machine is the orchestrator's node.

A test that mocks the database tests the app. A compose stack tests the environment. A node running out of disk is the machine.

When you write a Dockerfile you are defining the environment. When you pick `python:3.12-slim` you are picking a machine-ish base that you will treat as disposable.""",
   failures="""1. **Baking laptop paths** into the app (`/Users/you/...`).

2. **Assuming the container has your .env.**

3. **Blaming Docker** for an app bug.

4. **Treating the container as the machine you SSH into forever.**""",
   line="""App is the code, environment is what it sees at run time, machine is the host. Docker ships a reproducible environment so the machine can be generic. I debug by asking which layer is different.""",
   key_points=[
    "App = code + declared deps. Environment = concrete runtime. Machine = host.",
    "Works-on-my-machine is usually environment drift.",
    "Containers ship the environment, not your laptop.",
    "Config and secrets still inject into the environment.",
    "Machines still differ (disk, GPU, network).",
    "Pick the layer before you pick the tool.",
   ],
   questions=[
    q("recall", "What is the difference between the app, the environment, and the machine?", "App is your code and declared dependencies. Environment is the concrete interpreter, packages, and env vars. Machine is the OS and hardware that host it."),
    q("apply", "A container starts and dies with FileNotFoundError on ~/data. Which layer?", "The app assumed a laptop path (machine/user). Use an env var and a path inside the environment (e.g. /data)."),
    q("debug", "CI uses Python 3.10 and your laptop 3.12. Tests fail only in CI. Layer?", "Environment (and the base machine image). Pin requires-python and the image tag."),
    q("apply", "What does Docker reproduce well, and what must still be injected?", "It reproduces the packaged environment. Secrets, DATABASE_URL, and machine resources are still injected or provided by the host."),
    q("recall", "Why not ship the laptop?", "Paths, OS, extra packages, and secrets you did not declare. The next machine will not have them."),
   ],
   links=[
    {"title": "Docker: what is a container", "url": f"{DK}/get-started/docker-concepts/the-basics/what-is-a-container/"},
    {"title": "12-factor: config", "url": "https://12factor.net/config"},
   ],
  ),
  "containers-images": entry(
   what="""A **container** is a running process with its own filesystem view, isolated enough to look like a small machine. An **image** is the **immutable snapshot** that process starts from: layers of files plus a default command. You **build** an image, **run** a container from it. Many containers can run from one image.

Docker (and others) implement this with OS isolation, not a full VM per app. That is why they are fast to start and why they share the host kernel. Isolation is not a security boundary you should trust for hostile tenants without more work.

**Reproducibility** comes from the image: same layers, same app, same default env. It does not come from "I remember how I installed things".""",
   why="""On the job, "it is in Docker" should mean "anyone can run this image and get the same environment". Interviewers ask image versus container (class versus instance is a fair analogy). They ask why this helps CI (CI runs the same image). They ask what is not reproducible (`latest`, unpinned base, secrets baked at build).

They may ask why not a VM (heavier, slower, still useful for a different kernel). Keep it practical.""",
   how="""```
docker build -t tickets:1.2.0 .
docker run --rm -p 8000:8000 --env-file .env tickets:1.2.0
```

The image `tickets:1.2.0` is the artefact you can push to a registry. The container is the running process mapping port 8000.

Change the code, rebuild the image. Do not "fix the container" with `docker exec` and walk away — that change dies with the container. If you needed it, put it in the Dockerfile.

List: `docker images`, `docker ps`. Logs: `docker logs`.""",
   failures="""1. **Mutating a running container** as the source of truth.

2. **No tag** except latest.

3. **Thinking containers are VMs** you patch forever.

4. **Assuming isolation equals security.**""",
   line="""An image is the immutable snapshot; a container is a process started from it. I build an image, run containers, and I put fixes in the Dockerfile, not in a snowflake exec. Same image in CI and prod is the reproducibility.""",
   key_points=[
    "Image = snapshot; container = running instance.",
    "Build the image; do not snowflake-exec the container.",
    "One image, many containers.",
    "They share the host kernel; they are not a full VM.",
    "Reproducibility is the image, not your memory.",
    "Isolation is not a complete security story.",
   ],
   questions=[
    q("recall", "What is the difference between an image and a container?", "An image is the immutable filesystem and metadata. A container is a running process created from that image."),
    q("apply", "You fixed a bug with docker exec and it works. What next?", "Put the fix in the image (Dockerfile or app), rebuild, and redeploy. The exec dies with the container."),
    q("debug", "CI is green on tickets:1.2.0 and prod runs tickets:latest which is old. What happened?", "latest moved or did not. Pin a version tag or digest in prod."),
    q("recall", "Why do containers start faster than typical VMs?", "They share the host kernel and do not boot a guest OS per app."),
    q("apply", "How do you give two teammates the same environment?", "Commit the Dockerfile and lockfile, build the same tag, run with the same required env vars."),
   ],
   links=[
    {"title": "Docker: images and containers", "url": f"{DK}/get-started/docker-concepts/the-basics/what-is-an-image/"},
    {"title": "Docker: what is a container", "url": f"{DK}/get-started/docker-concepts/the-basics/what-is-a-container/"},
   ],
  ),
  "writing-and-running-a-dockerfile": entry(
   what="""A **Dockerfile** is a recipe of layers: a **FROM** base, **COPY** files, **RUN** install commands, **ENV**, **EXPOSE**, **CMD** or **ENTRYPOINT**. `docker build` executes it and tags an image. `docker run` starts a container, maps **ports** (`-p 8000:8000`), and passes **environment** (`-e` or `--env-file`).

Order matters for **cache**: copy the lockfile and install deps before copying the whole source so a code change does not reinstall the world. `.dockerignore` keeps `.venv` and `.git` out.

Secrets: pass at **run**, not `ENV KEY=real` in the Dockerfile. `EXPOSE` is documentation; `-p` is the actual publish.""",
   why="""On the job this is how the capstone ships. Interviewers will ask you to sketch a Dockerfile for FastAPI. They want a slim Python base, uv or pip from a lock, a non-root user if you can, CMD that runs uvicorn, and env at runtime. They will mark baking a password as a fail.

They ask why the first build is slow and the second is fast (cache) and why copying `.venv` from the laptop is wrong (wrong OS).""",
   how="""```
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev
COPY app ./app
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```
docker build -t tickets:1.2.0 .
docker run --rm -p 8000:8000 -e DATABASE_URL -e APP_SECRET tickets:1.2.0
```

`.dockerignore`: `.venv`, `.git`, `.env`, `__pycache__`, tests if you do not need them in the image.

`--host 0.0.0.0` is required; `127.0.0.1` inside the container is not reachable from the host map.""",
   failures="""1. **COPY . .** before install, busting cache every time.

2. **CMD on 127.0.0.1.**

3. **ENV SECRET=...** in the Dockerfile.

4. **Copying .venv** from macOS into a Linux image.""",
   line="""A Dockerfile is layered: lockfile and install first, then source, CMD on 0.0.0.0, secrets at run. I build a tag, I map the port, I do not bake keys, and I dockerignore .venv and .env.""",
   key_points=[
    "FROM, COPY, RUN, CMD are the core.",
    "Copy lockfile and install before app source for cache.",
    "Pass secrets at run, not in the image.",
    "EXPOSE documents; -p publishes.",
    "Listen on 0.0.0.0 inside the container.",
    "dockerignore .venv, .git, .env.",
   ],
   questions=[
    q("apply", "Sketch a Dockerfile for a locked uv FastAPI app.", "Slim Python base, copy pyproject+lock, uv sync --frozen --no-dev, copy app, CMD uvicorn on 0.0.0.0:8000."),
    q("debug", "The host maps 8000 but the browser cannot connect. CMD uses 127.0.0.1. Why?", "The server listens only on the container loopback. The published port forwards to the container's 0.0.0.0:8000. Bind 0.0.0.0."),
    q("apply", "Where does DATABASE_URL go?", "docker run -e or the platform secret, not ENV in the Dockerfile and not a copied .env."),
    q("recall", "Why copy the lockfile before the source?", "So dependency layers cache until the lock changes. Code edits then reuse the install layer."),
    q("debug", "The image is 2 GB because you COPY . . What did you forget?", ".dockerignore for .venv, .git, data dumps, and local models."),
   ],
   links=[
    {"title": "Dockerfile reference", "url": f"{DK}/reference/dockerfile/"},
    {"title": "docker run", "url": f"{DK}/reference/cli/docker/container/run/"},
   ],
  ),
  "layers-logs-startup-failures": entry(
   what="""Each Dockerfile instruction produces a **layer**. Cached layers reuse. A change invalidates that layer and all after it. **`.dockerignore`** keeps junk out of the build context. **Container logs** are the process stdout/stderr — `docker logs` or the platform's log drain. **Startup failures** are usually: wrong CMD, missing env, port not bound, import error, or the process exiting 0 by mistake.

`docker logs` is the first tool when a container **exits 1**. `docker ps -a` shows the exited container. An image that "built fine" can still fail at run; build does not run your CMD.""",
   why="""On the job, "CrashLoopBackOff" is this topic. Interviewers will ask what you do when a container exits 1 (logs, then CMD, then env, then port). They ask why a tiny Dockerfile change rebuilt everything (you copied source before pip). They ask where print/logging goes (stdout, so the platform can collect it).

They like "build success ≠ run success".""",
   how="""Rebuild too much: you `COPY . .` then `RUN uv sync`. Swap the order.

See why it died:

```
docker ps -a
docker logs --tail 200 CONTAINER_ID
docker inspect CONTAINER_ID   # Args, Env, State.ExitCode
```

Common: `ModuleNotFoundError` (did not COPY app), `KeyError: DATABASE_URL` (env missing), `address already in use` (port), `exec format error` (wrong platform/arch).

Health: if CMD is a shell that exits, the container exits. Keep the server in the foreground. Do not daemonise inside the container.""",
   failures="""1. **Ignoring logs** and rebuilding at random.

2. **Backgrounding the server** so the container exits 0.

3. **Huge context** without dockerignore.

4. **Assuming EXPOSE means it started.**""",
   line="""Layers cache from the top; a change busts everything below. When a container exits 1 I read logs, then CMD, env and the bind address. Build success is not run success. The server stays in the foreground.""",
   key_points=[
    "Each instruction is a layer; order is cache.",
    "dockerignore shrinks context and avoids leaking .env.",
    "docker logs is the first step on exit 1.",
    "Build does not execute CMD.",
    "Keep the main process in the foreground.",
    "inspect shows Env and ExitCode.",
   ],
   questions=[
    q("apply", "A container exits 1 immediately. What is your order?", "docker logs, then inspect CMD and env, then confirm the server binds 0.0.0.0 and required vars are set."),
    q("recall", "Why did a one-line Python change reinstall all packages?", "The Dockerfile copied the whole tree before installing, so the install layer invalidated."),
    q("debug", "CMD is `uvicorn ... &` and the container exits 0. Why?", "The shell's last command is the backgrounding. The main process ended. Run uvicorn in the foreground."),
    q("apply", "Where do FastAPI logs go in Docker?", "Stdout/stderr of the main process. Use logging to stdout, then docker logs or the platform drain."),
    q("recall", "What does dockerignore do besides speed?", "It keeps .env, .git and local junk out of the build context so they are harder to COPY by accident."),
   ],
   links=[
    {"title": "Docker: layer caching", "url": f"{DK}/build/cache/"},
    {"title": "docker logs", "url": f"{DK}/reference/cli/docker/container/logs/"},
   ],
  ),
  "containerizing-a-fastapi-app": entry(
   what="""To **containerize FastAPI** you put the app in an image that can **import the package**, **read config from the environment**, and **reach its services** (Postgres on another hostname, not `localhost` meaning the container). Compose or the platform provides the network and the env. The container is not your laptop: `localhost` inside is the container itself.

You typically run uvicorn (or gunicorn+uvicorn workers) as CMD. You do not run `fastapi dev` in production (it is a reload server). You mount nothing you do not need. You pass `DATABASE_URL` pointing at the db service name (`postgres://...@db:5432/app`).""",
   why="""On the job this is the capstone. Interviewers ask why `localhost` broke in Docker (Postgres is another container). They ask how you pass config (env). They ask how you would add a second process (don't: one process per container, or a real supervisor). They ask about multi-stage builds if the image is fat.

This is the first time the HTTP module, the DB module, and the env-var module meet.""",
   how="""`docker-compose.yml` sketch:

```
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/app
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: app
      POSTGRES_USER: app
      POSTGRES_DB: app
```

The app uses `db` as the hostname. Migrate in an entrypoint or a one-shot job, not by hand on the laptop only.

Health: a `/health/ready` that SELECT 1s the database so the platform does not send traffic early.""",
   failures="""1. **DATABASE_URL=localhost** inside the api container.

2. **fastapi dev** as the production CMD.

3. **SQLite file** on the container filesystem and wondering where it went.

4. **Two responsibilities** in one container without a plan.""",
   line="""I image the FastAPI app, inject env, and point DATABASE_URL at the db service name, not localhost. Production CMD is uvicorn in the foreground. Ready checks wait for the database. One process per container.""",
   key_points=[
    "localhost inside the container is the container.",
    "Use the compose service name as the DB host.",
    "Production CMD is uvicorn, not fastapi dev.",
    "Config via environment; migrate as a job or entrypoint.",
    "Ready check hits the database.",
    "Do not store durable data on the container filesystem.",
   ],
   questions=[
    q("debug", "The API container cannot connect to Postgres at localhost:5432. Why?", "localhost is the API container, not the host or the db container. Use the service name and the Docker network."),
    q("apply", "How do you wire FastAPI and Postgres in compose?", "Two services, DATABASE_URL host=db, depends_on or a real wait-for-ready, api publishes 8000."),
    q("recall", "Why not CMD fastapi dev in production?", "It is a development server with reload. Use uvicorn/gunicorn as the process."),
    q("apply", "Where do you run migrations?", "A one-shot job using the same image, or an entrypoint that migrates then execs uvicorn. Not only on your laptop."),
    q("debug", "You wrote tickets to SQLite ./app.db and they vanish on redeploy. Why?", "The container filesystem is ephemeral. Use Postgres (or a volume, if you really must) for durable data."),
   ],
   links=[
    {"title": "FastAPI in containers", "url": "https://fastapi.tiangolo.com/deployment/docker/"},
    {"title": "Compose file reference", "url": f"{DK}/reference/compose-file/"},
   ],
  ),
  "deploying-to-a-public-url": entry(
   what="""**Deploy** means a platform runs your image (or a buildpack) and gives you a **public HTTPS URL**. Examples: a VM with Docker, Fly, Render, Cloud Run, a Kubernetes Service. You push an image or a git SHA; the platform injects env, maps 443 to your port, and restarts if the process dies.

The public URL is the contract you verify with curl and `/docs`. DNS, TLS, and the platform's router are extra hops. A local `localhost:8000` is not a deploy.

You still owe health checks, logs, and secrets. The platform does not make the app correct.""",
   why="""The Level 0 capstone requires a URL someone else can hit. Interviewers will ask how you would deploy a container (pick a platform, set env, map the port, curl the URL). They will ask what differs from local (HTTPS, real DNS, secrets, scale-to-zero cold starts).

They may ask how you would roll back (redeploy the previous tag). That is why you pin tags.""",
   how="""Path: build `tickets:1.2.0`, push to a registry, create a service with port 8000, set `DATABASE_URL` and secrets, attach a Postgres add-on, run migrations, assign a hostname.

Verify:

```
curl -sS https://tickets.example.com/health/ready
curl -sS https://tickets.example.com/docs
```

If the platform sleeps the app, the first request is slow — say so in the README.

Do not expose Postgres to the world. Only the API URL is public.""",
   failures="""1. **Calling localhost a deploy.**

2. **Public database.**

3. **No HTTPS** on a real hostname (or ignoring the platform cert).

4. **No rollback plan** because you only have latest.""",
   line="""A deploy is a public HTTPS URL running a pinned image with injected secrets. I verify with curl and /docs, I keep the database private, and I can roll back by redeploying the previous tag.""",
   key_points=[
    "Public URL + HTTPS is the deploy; localhost is not.",
    "Platform injects env and maps 443 to your port.",
    "Pin an image tag so you can roll back.",
    "Verify with curl and /docs.",
    "Do not expose Postgres.",
    "Cold starts and extra hops are real.",
   ],
   questions=[
    q("apply", "What do you verify after a deploy?", "HTTPS URL, /health/ready, /docs or a curl of a real endpoint, and that secrets are not the laptop's."),
    q("recall", "Why is localhost not a deploy?", "Nobody else can reach it, there is no public TLS, and it does not prove the image runs on a generic machine."),
    q("apply", "How do you roll back?", "Redeploy the previous image tag (or git SHA). You cannot roll back if you only ever pushed latest."),
    q("debug", "The URL 502s but the container is running. Where do you look?", "The hop: platform port map, health check failing, TLS, or the app binding the wrong port."),
    q("recall", "What must stay private?", "The database, admin ports, and secrets. Only the API (and docs if you choose) are public."),
   ],
   links=[
    {"title": "FastAPI deployment", "url": "https://fastapi.tiangolo.com/deployment/"},
    {"title": "Docker: deploy your app", "url": f"{DK}/get-started/introduction/build-and-push-first-image/"},
   ],
  ),
  "production-env-vars-secrets": entry(
   what="""**Production configuration** is environment variables and **secrets** that are **not** the ones on your laptop. The platform injects them. You keep a `.env` for local and a secret store for prod. You never copy prod secrets to your laptop "to test". You never bake them in the image.

Split **config** (log level, feature flags) from **secrets** (DB password, API keys) if the platform does. Both arrive as env in a typical small app. Rotation is a new value + restart. Audit who can read the store.

`DEBUG=true` in production is a leak. `CORS_ORIGINS=*` with credentials is a leak. Defaults in code that point at localhost will silently mis-wire.""",
   why="""On the job, using the local `.env` in prod (or vice versa) is a classic outage or leak. Interviewers ask how prod gets `DATABASE_URL` (platform secret) versus how you get it (gitignore .env). They ask what you do on a leak (rotate, restart, scan logs).

They ask how you prevent the image from containing a secret (no ENV, no COPY .env, dockerignore).

This is the deploy half of the credentials topic.""",
   how="""Local: `.env` + compose `--env-file`. Prod: platform UI or IaC sets `DATABASE_URL`, `APP_SECRET`. Same names, different values.

Settings class: required fields, no localhost default in the production image. Fail boot if missing.

Promote a new secret: add it, deploy, drop the old. Do not log Settings().model_dump() if it includes secrets — mark those fields and redact.

A staging environment is a third set of values, not prod copies.""",
   failures="""1. **COPY .env** into the image.

2. **DEBUG=true** in prod.

3. **Laptop URL in the platform** "just to get it up".

4. **Logging the full settings object.**""",
   line="""Prod env vars and secrets are a different set, injected by the platform, never baked into the image and never copied from my laptop. I fail boot if they are missing, I rotate on leak, and I do not log them.""",
   key_points=[
    "Same names, different values per environment.",
    "Platform secret store, not a copied .env.",
    "Do not bake secrets into the image.",
    "No unsafe defaults that silently run in prod.",
    "Rotate + restart on leak.",
    "Do not log the settings dump.",
   ],
   questions=[
    q("apply", "How do production secrets get into the process?", "The platform injects them as environment variables or mounted files from a secret store. The image does not contain them."),
    q("debug", "The image has a real DATABASE_URL because you COPY .env. What now?", "Rotate the password, rebuild without that file, dockerignore .env, scan the registry for the old image."),
    q("apply", "Why not reuse prod secrets in staging?", "A staging leak becomes a production leak. Use a third set of values."),
    q("recall", "What should happen if APP_SECRET is missing at boot?", "The process should exit. A default is how you ship an insecure service."),
    q("debug", "You logged Settings() and the password is in the log system. Next steps?", "Rotate, redact the logger, purge what you can, treat the log store as leaked."),
   ],
   links=[
    {"title": "12-factor config", "url": "https://12factor.net/config"},
    {"title": "Docker: ENV vs run -e", "url": f"{DK}/reference/dockerfile/#env"},
   ],
  ),
  "health-checks-and-readiness": entry(
   what="""**Liveness** means the process is alive (not deadlocked). **Readiness** means it can take traffic (database is up, migrations applied, warm-up done). Platforms probe these endpoints and **stop sending traffic** if ready fails, and **restart** the container if live fails.

A `/health/live` that always returns 200 if the process can serve HTTP is enough for liveness. A `/health/ready` that `SELECT 1`s Postgres (and any must-have dependency) is readiness. If you only have one probe, make it readiness — or you will receive traffic while the DB is down and serve 500s.

Do not make the ready check so heavy it becomes the outage.""",
   why="""On the job, this is why Kubernetes/Cloud Run/Load balancers do not send users to a booting task. Interviewers ask live versus ready. They ask what you would check (DB, not disk-full unless you mean it). They ask what happens if ready is too strict (flapping) or too loose (500s).

They will mark a deploy without probes as incomplete for the capstone.""",
   how="""```
@app.get("/health/live")
def live() -> dict:
    return {"status": "ok"}

@app.get("/health/ready")
def ready(db=Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
```

Platform: ready probe on `/health/ready`, interval 5s, fail after a few. Start period long enough for boot and migrate.

Do not require a vendor LLM in ready unless the product cannot work without it. You will take the whole site down when the vendor blinks.

Auth: health endpoints are usually public but boring. Do not put secrets in the response.""",
   failures="""1. **One probe that only checks the process** — traffic during DB outage.

2. **Ready depends on a flaky third party.**

3. **Heavy ready** (full migration, huge query).

4. **No start grace** so the task is killed while migrating.""",
   line="""Live means the process is up; ready means it can take traffic. I expose both, I SELECT 1 the database on ready, and I do not depend on a flaky vendor. The platform uses ready to hold traffic during boot.""",
   key_points=[
    "Liveness: process is not dead. Readiness: safe to send traffic.",
    "Ready should check must-have dependencies (the DB).",
    "Do not include optional vendors in ready.",
    "Keep probes cheap.",
    "Give boot a start grace.",
    "Do not put secrets in the health body.",
   ],
   questions=[
    q("recall", "What is the difference between liveness and readiness?", "Liveness: the process should be restarted if it fails. Readiness: stop sending traffic until the app can actually serve (DB up, booted)."),
    q("apply", "What should /health/ready check for this capstone?", "That the process can reach Postgres (SELECT 1). Optionally that migrations are at head. Not an LLM vendor."),
    q("debug", "The platform sends traffic during migrate and users see 500s. What is missing?", "A ready probe that fails until migrate finishes, plus a start grace period."),
    q("apply", "Should ready fail if OpenAI is down?", "Only if the product cannot work at all without it. For a no-AI capstone, no. Even for an AI app, consider degraded mode."),
    q("recall", "Why keep health public?", "The load balancer must reach it without a user token. Keep the body boring."),
   ],
   links=[
    {"title": "Kubernetes: liveness and readiness", "url": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"},
    {"title": "FastAPI: additional status codes / health", "url": "https://fastapi.tiangolo.com/advanced/additional-status-codes/"},
   ],
  ),
  "image-tags-vs-latest": entry(
   what="""A **tag** is a name on an image: `tickets:1.2.0`. **`latest`** is just a tag that **moves**. It is not a magic pointer to "whatever is newest on the registry you think". If you deploy `latest`, you cannot say what digest is running, and a rebuild can change it under you.

**Pin a version tag** you created, or better a **digest** (`tickets@sha256:...`). CI builds `1.2.0` from a git SHA. Prod refers to that. Rollback is the previous tag. `latest` is fine on a laptop compose file if you understand it is sloppy; it is not fine in production.

The same rule as `uv.lock`: names that move are not reproducible.""",
   why="""On the job, "prod is latest" is how two nodes run different code. Interviewers ask why latest is not reproducible and what you would pin. They ask how you roll back (previous tag). They ask the difference between a tag and a digest (a tag can be overwritten; a digest is content-addressed).

This is a short topic with a high signal.""",
   how="""```
docker build -t ghcr.io/you/tickets:1.2.0 -t ghcr.io/you/tickets:git-a1b2c3d .
docker push ghcr.io/you/tickets:1.2.0
```

Deploy spec: `image: ghcr.io/you/tickets:1.2.0` or the digest the push printed.

CI can also tag `1.2.0` and `main`. Prod uses the version. Do not retag `1.2.0` to a new build; bump the version.

`docker pull tickets:latest` on two days can yield two images. That is the bug.""",
   failures="""1. **Prod = latest.**

2. **Retagging 1.2.0** to a new build.

3. **No git SHA** on the image, so you cannot say what code is live.

4. **Assuming the registry's latest matches your laptop's latest.**""",
   line="""latest moves. I pin a version tag or a digest, I never retag a released version, and I roll back by deploying the previous tag. Reproducible deploys are the same idea as a lockfile.""",
   key_points=[
    "latest is a moving tag, not a version.",
    "Pin a version tag or a digest in production.",
    "Do not overwrite a released tag.",
    "Put a git SHA on the image.",
    "Rollback = previous pin.",
    "Same idea as uv.lock.",
   ],
   questions=[
    q("recall", "Why is latest not reproducible?", "It can be moved to a new image at any time. Two pulls can get two different digests."),
    q("apply", "What do you put in the production deploy spec?", "A version tag you will not overwrite, or an image digest. Plus the env vars."),
    q("debug", "Two replicas serve different behaviour but both say latest. Cause?", "They pulled at different times. Pin a digest so they cannot drift."),
    q("apply", "How do you roll back 1.2.1?", "Deploy 1.2.0 (or its digest). You cannot if 1.2.0 was overwritten."),
    q("recall", "Tag versus digest?", "A tag is a mutable name. A digest is the content hash of the image."),
   ],
   links=[
    {"title": "Docker: image tags", "url": f"{DK}/get-started/docker-concepts/the-basics/what-is-an-image/#image-tags"},
    {"title": "Docker: pull by digest", "url": f"{DK}/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier"},
   ],
  ),
  "interview": entry(
   what="""You will be asked to **debug a container that exits 1**. The walk-through is: **read the logs**, check the **CMD**, check **env vars**, check whether the **port is bound** on `0.0.0.0`. That order solves most capstone failures. You do not start by rewriting the Dockerfile.

They may add a twist: works locally with compose, dies on the platform. Then you add hops (health, secrets, tag). Keep the first four steps anyway.

Talk out loud. Name what you would type.""",
   why="""This is the Level 0 ship interview. It tests whether you have run `docker logs`. A candidate who says "I would rebuild" without reading logs has not shipped. On the job this is every deploy.

Pair it with the pytest interview: isolate, then change.""",
   how="""Talk track:

1. `docker ps -a` — exit code, how long it lived.
2. `docker logs` — import error, missing env, traceback.
3. CMD — is uvicorn in the foreground? `0.0.0.0`? Right module path?
4. Env — is `DATABASE_URL` set in *this* environment? `docker inspect` if needed.
5. Port — EXPOSE vs `-p` vs listen address. curl from inside (`docker exec`) then from outside.

If logs show `ModuleNotFoundError: app`, COPY is wrong. If `KeyError: DATABASE_URL`, env is wrong. If nothing listens, CMD or bind is wrong.

Then: fix the image or the run flags, not the running container, and say how you would prevent it (ready probe, fail at boot).""",
   failures="""1. **Rebuild without logs.**

2. **SSH folklore** instead of logs/inspect.

3. **Fixing with exec** and calling it done.

4. **Ignoring the listen address.**""",
   line="""Exits 1: logs, CMD, env, bind address. I name the commands, I fix the image or the run flags, and I do not exec a snowflake. Most ship bugs are a missing env or 127.0.0.1.""",
   key_points=[
    "Order: logs → CMD → env → port/bind.",
    "Name the docker commands in the interview.",
    "Build success is not run success.",
    "Fix the image or run flags, not a snowflake exec.",
    "127.0.0.1 and missing env are the usual causes.",
    "Prevent with fail-at-boot and ready probes.",
   ],
   questions=[
    q("apply", "Walk through debugging a container that exits 1.", "ps -a for the exit, logs for the traceback, inspect CMD and env, check it listens on 0.0.0.0. Fix the Dockerfile or run flags and recreate."),
    q("recall", "Which four things does this prompt name?", "Logs, CMD, env vars, and whether the port is bound."),
    q("debug", "Logs are empty and the container exited 0. What do you suspect?", "CMD returned immediately — a shell that ended, or a backgrounded server. Put the server in the foreground."),
    q("apply", "It runs in compose and exits on the platform. What extra do you check?", "Secrets actually injected, image tag/digest, health checks, and the listen port the platform expects."),
    q("recall", "Why not start with a rewrite of the Dockerfile?", "You do not yet know which layer failed. Logs usually name it in one line."),
   ],
   links=[
    {"title": "docker logs", "url": f"{DK}/reference/cli/docker/container/logs/"},
    {"title": "docker inspect", "url": f"{DK}/reference/cli/docker/container/inspect/"},
   ],
  ),
 }
}
