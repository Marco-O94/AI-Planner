# AI Planner

Capture typed **notes**, **tasks**, and **documents** about software projects —
organized by project and DDD bounded context — and expose them to an AI (Claude
Code) over an **MCP server** to generate typed, versioned **artifacts**
(default: a Development Plan). Notes and documents are searchable via Postgres
full-text **and** Qdrant semantic vectors.

Built as a decoupled monorepo:

| Service | Stack | Status |
|---------|-------|--------|
| `backend/` | FastAPI + SQLAlchemy + Alembic + Postgres + Qdrant/FastEmbed | Phases 1–3 ✅ |
| `mcp/` | Python MCP server (FastMCP, HTTP → backend, stdio/SSE) | Phase 4 ✅ |
| `frontend/` | Next.js 16 + shadcn/ui + framer-motion + SWR | Phase 5 ✅ |
| infra | docker-compose (all 5 services, healthcheck-gated) | Phase 6 ✅ |

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the full, phased plan.

**Run the whole stack:** `cp .env.example .env && docker compose up --build` →
frontend http://localhost:3000 · backend http://localhost:8000/docs · MCP SSE
http://localhost:8050/sse · Qdrant http://localhost:6333/dashboard.
See [Phase 6](#phase-6--full-stack-orchestration) below.

---

## Phase 1 — Database & backend foundation

Postgres + Qdrant via Docker, the full 15-table schema migrated by Alembic, and
a FastAPI `/health` endpoint.

### Prerequisites
- Docker + Docker Compose
- [uv](https://docs.astral.sh/uv/) (Python toolchain; pins Python 3.12)

### Run

```bash
# 1. Start data services (Postgres + Qdrant).
cp .env.example .env          # adjust ports if 5432/6333 are taken locally
docker compose up -d          # → postgres + qdrant healthy

# 2. Install backend deps and apply migrations.
cd backend
uv sync
uv run alembic upgrade head   # creates 15 tables + full-text GIN indexes + seed

# 3. Serve the API.
uv run uvicorn app.main:app --reload
curl localhost:8000/health    # {"status":"ok"}
```

> The local `.env` in this repo remaps host ports (Postgres `5544`, Qdrant
> `6343`) to avoid colliding with other stacks; `.env.example` keeps the
> conventional `5432`/`6333` defaults.

### Test

```bash
cd backend
docker compose -f ../docker-compose.yml up -d   # Postgres must be running
uv run pytest                                    # applies migrations, verifies schema + /health
```

The suite verifies the migrated schema directly against the plan: all 15 tables,
FK cascade/SET NULL rules, the circular `artifacts ↔ artifact_versions` FK,
generated `tsvector` columns + GIN indexes, the scope `CHECK` constraints,
partial unique slug indexes, and the seeded technologies + default
"Development Plan" artifact type.

---

## Phase 2 — Backend domain + application + API

Full CRUD REST API over all aggregates with DDD layering and invariants
enforced in the service layer (cross-project domain rejection, slug collisions,
skill/artifact-type scope, technology resolve-or-create, task dependency
same-project + cycle rejection + blocked computation, artifact versioning with
manifest coverage and phase parsing, diff, and export).

```bash
# Build + run the whole backend (postgres healthcheck-gated) in one command:
docker compose up -d --build backend     # backend runs migrations on start, then serves
curl localhost:8000/health               # {"status":"ok"}
open http://localhost:8000/docs          # OpenAPI: all routers

# Or run locally against the compose Postgres:
cd backend && uv run uvicorn app.main:app --reload
```

Key endpoint groups: `/projects` (+ filters, technologies), `/technologies`,
`/projects/{slug}/domains` + `/domains/{id}`, `/projects/{slug}/notes` +
`/notes/{id}` (+ `/artifacts` reverse lookup), `/projects/{slug}/tasks` +
`/tasks/{id}` (+ deps/blocked, `/artifacts`), `/artifact-types`,
`/projects/{slug}/artifacts` + `/artifacts/{id}` (versions, diff, files,
phases, export), `/skills` (+ SKILL.md export, attach/detach).

### Test

```bash
cd backend
docker compose -f ../docker-compose.yml up -d postgres   # Postgres must be running
uv run pytest                                             # 42 tests: schema + API behavior
```

The API suite covers the Phase 2 done criteria: cross-project domain → 422,
slug collisions, note/task filtering, skill & artifact-type scope, GLOBAL-skill
attach/detach, combined project filtering, technology resolve-or-create,
note→/task→artifact reverse lookups, dependency cycle rejection + blocked flag,
protected default artifact type, artifact version increment + current pointer +
multi-file storage + manifest coverage + phase parsing, and export (single + zip).

---

## Phase 3 — Documents, search & templates

Upload documents (PDF/DOCX/MD/TXT → text extracted + stored on a volume), index
notes + documents + artifact files for **lexical** (Postgres FTS) and
**semantic** (Qdrant + FastEmbed) retrieval, fuse them with **hybrid** RRF, and
support reusable **project templates**.

```bash
# Upload a document (multipart):
curl -F 'file=@spec.pdf' -F 'title=Spec' localhost:8000/projects/<slug>/documents

# Search — mode = lexical | semantic | hybrid (default hybrid), scopable by project/domain:
curl 'localhost:8000/search?q=refund+policy&mode=hybrid&project_slug=<slug>'

# File explorer (in-file full-text), grouped by project:
curl 'localhost:8000/files?q=invoices'

# Templates: create, apply on project create (template_slug), or snapshot a project:
curl -X POST localhost:8000/projects/<slug>/save-as-template -d '{"name":"DDD Starter"}'

# Rebuild the vector collection from Postgres:
curl -X POST localhost:8000/admin/reindex
```

Endpoint groups added: `/projects/{slug}/documents` + `/documents/{id}`
(+ `/download`), `/search` + `/projects/{slug}/search`, `/files` +
`/projects/{slug}/files`, `/templates` (+ apply / save-as-template),
`/admin/reindex`. Indexing is **resilient** — Postgres is authoritative; an
embedding failure never blocks a write, and `/admin/reindex` repairs drift.

### Test

```bash
cd backend && uv run pytest      # 53 tests (schema + API + search/documents/templates)
```

Phase 3 coverage: document upload/extraction/dual-index, lexical exact-word match
inside files (scoped by project), semantic by-meaning, hybrid fusion, project
scoping isolation, file-explorer grouping + in-file search, template apply +
save-as-template round-trip (incl. enum-safe technology serialization), reindex.

### Layout

```
backend/app/
├─ config.py                 # pydantic-settings (DATABASE_URL, QDRANT_URL, EMBEDDING_MODEL, STORAGE_DIR)
├─ main.py                   # FastAPI app: routers, CORS, error handlers, /health
├─ domain/                   # pure: entities, enums, read models, repo + VectorIndex Protocols, errors
├─ application/              # services (one per aggregate) + indexer/search/reindex/template — invariants here
├─ infrastructure/           # SQLAlchemy models/repos/mappers, db/UoW, embeddings, qdrant, fulltext, storage, extract
├─ schemas/                  # Pydantic Create/Update/Read DTOs
└─ api/                      # thin routers + DI wiring (deps.py) + error mapping
alembic/                     # migration env + versions
tests/                       # schema + API + search/documents/templates verification
docker-compose.yml           # postgres + qdrant + backend (+ doc storage volume); mcp/frontend added later
```

Layering rule (Hexagonal/DDD): `domain` depends on nothing; `application`
depends on `domain` + repository interfaces; `infrastructure` implements those
interfaces; `api` depends on `application`. No reverse dependencies.

---

## Phase 4 — MCP server

A Python [FastMCP](https://github.com/modelcontextprotocol/python-sdk) server
(`mcp/`) that exposes the backend to an AI agent (Claude Code) so it can discover
projects, pull pre-assembled context, choose an artifact type, and write typed,
versioned artifacts back. It talks to the backend **over HTTP only** — never
imports backend code.

20 tools: discovery (`list_projects`, `get_project_context`), artifact types,
artifacts + versions, notes/tasks/documents, skills, `search_knowledge`
(lexical/semantic/hybrid), `prepare_generation` (the unified bundle), and the
writes `save_artifact` + `update_phase_status`.

```bash
# stdio (local Claude Code):
cd mcp && uv sync
BACKEND_URL=http://localhost:8088 uv run python -m project_notes_mcp
# tests:
uv run pytest          # 34 tests (mock-backed); uv run ruff check .
```

Register with Claude Code via [`mcp/.mcp.stdio.json`](./mcp/.mcp.stdio.json)
(local) or [`mcp/.mcp.sse.json`](./mcp/.mcp.sse.json) (the always-on compose
service). See [`mcp/README.md`](./mcp/README.md) for tool docs and when to use
which transport.

---

## Phase 5 — Next.js frontend

A capture-first UI (`frontend/`): Next.js 16 (App Router, Turbopack), shadcn/ui,
framer-motion, SWR, Tailwind v4. Dashboard with faceted filters; project view
with Notes / Tasks / Artifacts / Documents / Skills tabs, editable metadata,
domains, and project search (mode toggle); a File Explorer with in-file search;
Tasks board with dependencies + blocked badges; document drag-drop upload;
artifact detail with files, manifest coverage, version diff, and phase checklist;
artifact-type and template libraries; global + project skills with `.md` upload.

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8088 npm run dev   # http://localhost:3000
npm run build          # production build (Turbopack)
npm run test:e2e       # Playwright smoke (uses system Chrome)
```

The typed API client (`src/lib/api.ts`) + types (`src/lib/types.ts`) mirror the
backend OpenAPI; `NEXT_PUBLIC_API_URL` is the browser-reachable backend URL.

---

## Phase 6 — Full-stack orchestration

One command brings up the whole decoupled stack on a shared network, gated by
healthchecks: **postgres + qdrant healthy → backend healthy → mcp + frontend**.
Services reach each other by compose service name (`backend:8000`,
`qdrant:6333`); each image builds only its own directory (no in-process imports).

```bash
cp .env.example .env            # localhost defaults; this repo's .env remaps host ports
docker compose up --build       # postgres, qdrant, backend (migrates on start), mcp, frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API + docs | http://localhost:8000 · /docs |
| MCP (SSE) | http://localhost:8050/sse |
| Qdrant dashboard | http://localhost:6333/dashboard |

> The local `.env` remaps host ports (backend `8088`, postgres `5544`, qdrant
> `6343`); with it, set `NEXT_PUBLIC_API_URL=http://localhost:8088` (already in
> `.env`) so the browser bundle targets the published backend port.

Decoupling: restarting any one service (`docker compose restart mcp`) never
requires rebuilding the others. The full loop — create a project + notes + tasks
+ a document in the UI, find the document by meaning via semantic search, then
generate a typed artifact from Claude Code through the MCP server and watch it
appear in the UI — runs entirely over the network between independently-built
services.

Register the MCP server with Claude Code in either transport: **stdio** (point
`BACKEND_URL` at the backend) for local use, or **SSE** at
`http://localhost:8050/sse` against the running `mcp` container.
