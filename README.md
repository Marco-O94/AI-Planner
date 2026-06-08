# ProjectNotes

Capture typed **notes**, **tasks**, and **documents** about software projects —
organized by project and DDD bounded context — and expose them to an AI (Claude
Code) over an **MCP server** to generate typed, versioned **artifacts**
(default: a Development Plan). Notes and documents are searchable via Postgres
full-text **and** Qdrant semantic vectors.

Built as a decoupled monorepo:

| Service | Stack | Status |
|---------|-------|--------|
| `backend/` | FastAPI + SQLAlchemy + Alembic + Postgres + Qdrant/FastEmbed | Phase 1 ✅ |
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

### Layout

```
backend/
├─ app/
│  ├─ config.py                 # pydantic-settings (DATABASE_URL, QDRANT_URL, ...)
│  ├─ main.py                   # FastAPI app + /health
│  ├─ domain/enums.py           # shared domain enums (single source of truth)
│  └─ infrastructure/
│     ├─ db.py                  # engine, SessionLocal, Base, get_db
│     └─ models.py              # all 15 SQLAlchemy tables
├─ alembic/                     # migration env + versions
└─ tests/                       # schema + health verification
docker-compose.yml              # postgres + qdrant (backend/mcp/frontend added later)
```
