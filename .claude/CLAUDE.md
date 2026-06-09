# AI Planner — project guide for the agent

AI Planner is a **fully decoupled** monorepo: services talk **only over HTTP**, never via
in-process imports. Five services on one Docker network:

| Service | Stack | Role |
|---|---|---|
| `backend/` | FastAPI · SQLAlchemy 2 · Alembic · Postgres 16 · Qdrant/FastEmbed | REST API; owns all data (Postgres = source of truth, Qdrant = rebuildable vectors). Hexagonal layers: `domain` ← `application` ← `infrastructure`; `api` → `application`. No reverse deps. |
| `mcp/` | Python 3.12 · FastMCP (`mcp` SDK) · httpx | Exposes the backend to an AI agent over stdio / SSE; calls the API over HTTP only. |
| `frontend/` | Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · SWR | Capture & browsing UI. |
| `postgres` / `qdrant` | official images | entities + full-text / semantic vectors |

Both Python services pin **Python 3.12** and use **uv**. Frontend has no `engines` pin (runs on
Node 24; 20.9+ works).

---

## Configure & run the project

**Prerequisites:** Docker + Docker Compose. For per-service local dev: `uv` (Python) and Node 20.9+.

### One command — the whole stack

`deploy.sh` bootstraps `.env` (copies `.env.example` if missing), builds images, waits for the
backend `/health`, prints URLs. Startup is healthcheck-gated: **postgres + qdrant healthy → backend
(runs `alembic upgrade head` on start) → mcp + frontend**.

```bash
./deploy.sh                  # = ./deploy.sh up  (localhost)
./deploy.sh status           # docker compose ps
./deploy.sh logs [svc]       # follow logs (all, or one: backend|frontend|mcp|postgres|qdrant)
./deploy.sh restart mcp      # restart one service; the rest stay up
./deploy.sh update           # git pull --ff-only + rebuild + restart + re-health-check
./deploy.sh down             # stop all (named volumes persist; `docker compose down -v` wipes data)
./deploy.sh vps <host> [--tls]   # public deploy: rewrites NEXT_PUBLIC_API_URL + CORS, hardens DB password
./deploy.sh help
```

Raw compose is the same thing: `cp .env.example .env && docker compose up --build`.

### ⚠️ This repo's local `.env` remaps host ports

`.env.example` ships conventional defaults (`8000 / 5432 / 6333`), but the checked-out **local
`.env` remaps host ports to avoid collisions** with other stacks on this machine. **Read `.env`
first — do not assume the defaults.** Current local mapping:

| Service | Local host port | `.env.example` default |
|---|---|---|
| backend | **8088** | 8000 |
| postgres | **5544** | 5432 |
| qdrant http / grpc | **6343 / 6344** | 6333 / 6334 |
| mcp (SSE) | 8050 | 8050 |
| frontend | 3000 | 3000 |

`NEXT_PUBLIC_API_URL` is set to `http://localhost:8088` to match the remapped backend port.

### Service URLs (local)

| | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API + docs | http://localhost:8088 · http://localhost:8088/docs |
| MCP (SSE) | http://localhost:8050/sse |
| Qdrant dashboard | http://localhost:6343/dashboard |

### Per-service local dev (Postgres + Qdrant must be up: `docker compose up -d postgres qdrant`)

```bash
# Backend — Python 3.12 + uv
cd backend && uv sync
uv run alembic upgrade head          # 3 migrations: initial schema (16 tables) + 2 follow-ups
uv run uvicorn app.main:app --reload # http://localhost:8000/docs   (/health → {"status":"ok"})

# MCP — talks to the running backend over HTTP
cd mcp && uv sync
BACKEND_URL=http://localhost:8088 uv run python -m ai_planner_mcp   # stdio (default)

# Frontend — Node 24 recommended
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8088 npm run dev   # http://localhost:3000
npm run build                                            # production build (output: standalone)
```

### Tests

```bash
cd backend && uv run pytest      # 77 tests (11 files) — runs migrations against compose Postgres
cd mcp     && uv run pytest      # 52 tests — mock-backed (httpx.MockTransport), no live backend
cd frontend && npm run test:e2e  # Playwright smoke — uses SYSTEM Chrome (channel: chrome)
```

### Configuration gotchas (an agent WILL get these wrong)

- **`NEXT_PUBLIC_API_URL` is baked into the frontend bundle at BUILD time**, not runtime. It must be
  the **browser-reachable** backend URL (the host-published port, e.g. `http://localhost:8088`), NOT
  the in-network `http://backend:8000`. Changing it requires a frontend **rebuild**
  (`docker compose up --build frontend`).
- **`CORS_ORIGINS` (backend) must match the frontend origin.** Mismatch → app loads but API calls
  fail with CORS errors in the browser console. It's parsed as comma-separated CSV.
- **`FASTEMBED_CACHE_PATH` must stay on the named volume** (`fastembedcache:/data/fastembed`). If the
  model cache lives in container `/tmp`, an interrupted download leaves a **0-byte ONNX** and every
  note read 500s with no graceful fallback — delete the cache and let it re-download.
- **Backend uses the psycopg3 driver** (`postgresql+psycopg://`), not psycopg2.
- **`down` keeps data** (named volumes `pgdata`, `qdrantdata`, `docstore`, `fastembedcache`); only
  `docker compose down -v` destroys it.

---

## Register the AI Planner MCP server

The `mcp/` service exposes the backend to Claude Code as MCP tools (discovery, project context,
notes/tasks/documents, skills, `search_knowledge`, `prepare_generation`, and the writes
`create_note` / `create_task` / `create_tasks_from_notes` / `mark_notes_processed` /
`save_artifact` / `update_phase_status`). Pick **one** transport:

- **stdio** — simplest for local use. Claude Code **launches the process** and speaks over
  stdin/stdout; no port, lifecycle managed for you. Needs `uv` + the `mcp/` dir on disk.
- **SSE** — for the always-on compose `mcp` service. Claude Code **connects to a running URL**. Use
  when the stack is up via `docker compose up`.

> The repo ships ready-made config files: [`mcp/.mcp.stdio.json`](../mcp/.mcp.stdio.json) and
> [`mcp/.mcp.sse.json`](../mcp/.mcp.sse.json). The root [`.mcp.json`](../.mcp.json) currently
> registers **only** `codegraph` — to give the agent the AI-Planner tools you must **add** an
> `ai-planner` entry to its `mcpServers` map (or register it via the CLI / user config).

### Critical: `BACKEND_URL` differs local vs container

| Where the MCP runs | `BACKEND_URL` |
|---|---|
| stdio, on the host (local Claude Code) | `http://localhost:8088` (this repo's remapped backend host port) |
| containerized (compose `mcp` service) | `http://backend:8000` (in-network service name) — already set in `docker-compose.yml` |

Copying the stdio config into compose (or vice versa) **without remapping `BACKEND_URL` breaks it.**

### Option A — stdio (merge into the project `.mcp.json`)

Add this server under `mcpServers` in the root `.mcp.json` (alongside `codegraph`), adjusting `cwd`
and `BACKEND_URL` to this machine:

```json
{
  "mcpServers": {
    "ai-planner": {
      "command": "uv",
      "args": ["run", "python", "-m", "ai_planner_mcp"],
      "cwd": "/home/marco-oliveri/pvt/AI-Planner/mcp",
      "env": { "BACKEND_URL": "http://localhost:8088" }
    }
  }
}
```

Or via the CLI (run from `mcp/` so `uv run` resolves the right project):

```bash
cd /home/marco-oliveri/pvt/AI-Planner/mcp
claude mcp add ai-planner --scope project \
  --env BACKEND_URL=http://localhost:8088 \
  -- uv run python -m ai_planner_mcp
```

### Option B — SSE (the running compose service)

Bring the service up, then point Claude Code at the SSE URL:

```bash
docker compose up -d --build mcp          # SSE on :8050, depends on a healthy backend
```

```json
{ "mcpServers": { "ai-planner": { "type": "sse", "url": "http://localhost:8050/sse" } } }
```

Or: `claude mcp add ai-planner --scope project --transport sse http://localhost:8050/sse`

### Verify

`claude mcp list` should show `ai-planner` **Connected**. The MCP server's env knobs (all optional,
loopback-safe defaults): `BACKEND_URL` (`http://localhost:8000`), `MCP_TRANSPORT`
(`stdio` | `sse` | `streamable-http`, default `stdio`), `MCP_HOST` (`127.0.0.1`), `MCP_PORT`
(`8050`), `BACKEND_TIMEOUT` (`30.0`). An invalid `MCP_TRANSPORT` fails fast at startup.

### The generation loop the tools enable

`list_artifact_types(project)` → `prepare_generation(project, "development-plan")` (one bundle:
instructions + manifest + context + skills + docs) → the agent produces the declared files →
`save_artifact(...)` (same title ⇒ a new version) → `update_phase_status(...)` live as it
implements. See [`mcp/README.md`](../mcp/README.md).

---

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "How does X reach/become Y? / trace the flow from X to Y" | `codegraph_trace` (one call = the whole path, incl. callback/React/JSX dynamic hops) |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. For a specific **flow** ("how does X reach Y") start with `codegraph_trace` from→to — one call returns the whole path with dynamic hops bridged — then ONE `codegraph_explore` for the bodies; don't rebuild the path with `codegraph_search` + `codegraph_callers`. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag — check the staleness banner, don't guess a wait.** When a codegraph response starts with "⚠️ Some files referenced below were edited since the last index sync…", the listed files are pending re-index — Read those specific files for accurate content. Files NOT in that banner are fresh and codegraph is authoritative for them. `codegraph_status` also lists pending files under "Pending sync".

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->
