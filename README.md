# AI Planner

Capture typed **notes**, **tasks**, and **documents** about software projects —
organized by project and DDD bounded context — and expose them to an AI (Claude
Code) over an **MCP server** to generate typed, versioned **artifacts**
(default: a Development Plan). Notes and documents are searchable via Postgres
full-text **and** Qdrant semantic vectors.

Built as a decoupled monorepo:

| Service | Stack | Status |
|---------|-------|--------|
| `backend/` | FastAPI + SQLAlchemy + Alembic + Postgres + Qdrant/FastEmbed | Phases 1–2 ✅ |
| `mcp/` | Python MCP server (HTTP → backend) | planned |
| `frontend/` | Next.js 15 + shadcn/ui + framer-motion | planned |

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the full, phased plan.

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

### Layout

```
backend/app/
├─ config.py                 # pydantic-settings (DATABASE_URL, QDRANT_URL, ...)
├─ main.py                   # FastAPI app: routers, CORS, error handlers, /health
├─ domain/                   # pure: entities, enums, read models, repository Protocols, errors
├─ application/              # services (one per aggregate) — invariants live here
├─ infrastructure/           # SQLAlchemy models, repositories, ORM<->domain mappers, db/UoW
├─ schemas/                  # Pydantic Create/Update/Read DTOs
└─ api/                      # thin routers + DI wiring (deps.py) + error mapping
alembic/                     # migration env + versions
tests/                       # schema + API behavior verification
docker-compose.yml           # postgres + qdrant + backend (mcp/frontend added later)
```

Layering rule (Hexagonal/DDD): `domain` depends on nothing; `application`
depends on `domain` + repository interfaces; `infrastructure` implements those
interfaces; `api` depends on `application`. No reverse dependencies.
