# Session Handoff — AI Planner (ProjectNotes)

> Read [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) first — it is the agent-gated spec.
> Work **one phase at a time**, STOP and report after each, await approval before the next.
> Apply YAGNI / DRY / KISS; prefer explicit, readable code.

Date: 2026-06-08

---

## 1. Goal

Build a system to capture typed **notes / tasks / documents** about software projects,
organized by **project** and **DDD bounded context (domain)**, persist them, and expose
them via an **MCP server** so Claude Code can generate **typed, versioned artifacts**
(default: a "Development Plan") from the collected context. Notes/documents are
**searchable** (Postgres full-text **+** Qdrant semantic, fused via hybrid RRF).

Monorepo, decoupled services (HTTP-only between them):
1. `backend/` — FastAPI + PostgreSQL + Qdrant/FastEmbed (**done through Phase 3**)
2. `mcp/` — Python MCP server (**Phase 4, not started**)
3. `frontend/` — Next.js 15 + shadcn + framer-motion (**Phase 5, not started**)
4. Infra — docker-compose (postgres, qdrant, backend wired; mcp/frontend later)

---

## 2. Current state of the code

**Phases 1–3 of `IMPLEMENTATION_PLAN.md` are COMPLETE and verified.** Clean checkpoint —
no file is left half-edited.

- **Phase 1 (DB + backend foundation):** 15-table schema via Alembic (UUID PKs, FK
  cascades/SET NULL, scope CHECK constraints, partial unique slug indexes, generated
  `tsvector` columns + GIN indexes), seed (34 technologies + default "Development Plan"
  artifact type). Migration is reversible (down→up tested). `/health` works.
- **Phase 2 (domain + application + API):** full CRUD REST over all aggregates with DDD
  layering; invariants enforced in services (cross-project domain → 422, slug collisions,
  skill/type scope, technology resolve-or-create, task deps same-project + **cycle
  rejection** + **blocked** flag, artifact versioning + manifest coverage + phase parsing +
  diff + export single/zip). `backend/Dockerfile` + backend compose service.
- **Phase 3 (documents, search, templates):** document upload (pdf/docx/md/txt) →
  extract → store on volume → dual-index; lexical (Postgres FTS) + semantic (Qdrant +
  FastEmbed) + hybrid (RRF) search scopable by project/domain; `/files` explorer
  grouped-by-project with in-file search; project templates (CRUD, apply, save-as);
  `/admin/reindex`. Indexing is **resilient** (Postgres authoritative; embedding failure
  never blocks a write).

**Verification:**
- `cd backend && uv run pytest` → **53 passed**; `uv run ruff check .` → clean.
- Live container E2E on `localhost:8088`: upload 201, lexical/semantic/hybrid all return
  the item, file explorer groups, reindex rebuilds.
- Reviewed by 4 parallel agents (plan-conformance, python correctness, security, layering):
  layering **clean**, SQL **safely parameterized**; 3 real fixes applied (see §4).

**Architecture (DDD/hexagonal, no reverse deps):**
`app/domain/` (pure: entities, enums, read_models, repository + `VectorIndex` Protocols,
errors) ← `app/application/` (services, one per aggregate + indexer/search/reindex/template)
← `app/infrastructure/` (SQLAlchemy models/repos/mappers, db unit-of-work, embeddings,
qdrant, fulltext, storage, extract) ; `app/api/` (thin routers + `deps.py` DI wiring +
error→HTTP mapping) depends on application. Adapters are injected at the `deps.py`
composition root.

---

## 3. Environment / how to run

Tooling: Python 3.12 (pinned via `backend/.python-version`), `uv`, Docker.

**Host ports are remapped in the local `.env`** to avoid collisions with other running
stacks on this machine (a `plane-app` Postgres holds 5432; an existing Qdrant holds 6333):
- Postgres host port **5544** (`DATABASE_URL=...@localhost:5544/projectnotes`)
- Qdrant host port **6343** (`QDRANT_URL=http://localhost:6343`)
- Backend container host port **8088** (`BACKEND_PORT=8088`)
- `.env.example` keeps the conventional 5432/6333/8000 defaults.

```bash
# data services
docker compose up -d                     # postgres + qdrant healthy
# backend (local)
cd backend && uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
# tests (Postgres must be up; first run downloads the FastEmbed model ~once)
uv run pytest
# full stack in containers
BACKEND_PORT=8088 docker compose up -d --build backend   # migrates on start, then serves
```

Services were left **running** at end of session. `docker compose down` to stop.
Nothing is committed to git yet (user hasn't asked).

---

## 4. Things that failed and how they were resolved

These are the non-obvious gotchas already hit and fixed — do not re-trip on them:

1. **Ports 5432 / 6333 already allocated** on this host → remapped to 5544 / 6343 in `.env`
   (and backend container to 8088). `.env.example` keeps standard defaults.
2. **`use_alter` circular FK silently skipped.** `artifacts.current_version_id ↔
   artifact_versions.id` — Alembic `op.create_table` does NOT emit a `use_alter` FK (unlike
   `metadata.create_all`). Fixed by an explicit `op.create_foreign_key(...)` after both
   tables exist, with `DROP CONSTRAINT IF EXISTS` in downgrade.
3. **Native enum types not dropped on downgrade** → re-`upgrade` failed with "type already
   exists". Fixed by explicit `DROP TYPE` loop in the migration's `downgrade()`.
4. **pydantic-settings tried to JSON-decode `cors_origins`** (list field) from `.env` →
   crash. Fixed with `NoDecode` + a `BeforeValidator` that splits comma-separated strings.
5. **`list` method shadows builtin `list` in class bodies.** A repo/service method named
   `list` made a later `-> list[X]` annotation raise `TypeError: 'function' object is not
   subscriptable` (Python 3.12 eager annotation eval). Fixed with
   `from __future__ import annotations` in all repository + service modules. **Keep this in
   mind for any new class with a `list` method.**
6. **Ruff `B008`** on FastAPI `Depends/Query/File/Form` defaults → added them to
   `tool.ruff.lint.flake8-bugbear.extend-immutable-calls`. Alembic migrations are
   per-file-ignored for E501/UP/I (generator output).
7. **`python-multipart` missing** → file-upload routes raised at import. Added to deps.
8. **`:t::regclass` in a `text()` query** misparsed the bind param → used `to_regclass(:t)`.
9. **Qdrant client 1.18 vs server 1.12.4 version-skew warning** → `QdrantClient(...,
   check_compatibility=False)` (cosmetic; functionality verified both directions).
10. **First-request 404 transient** in the container E2E was just the FastEmbed model
    downloading on the very first request; reproducibly 201 once warm.
11. **Review-driven fixes (Phase 3):** (a) `artifact.update()` now re-indexes current files
    so the Qdrant title/domain payload doesn't go stale; (b) `document.create()` extracts
    **before** writing to storage (no orphan file on a parser error); (c) indexer embeds
    **before** delete+upsert so a failed embedding doesn't wipe existing vectors.

No currently-open failures. The suite is green.

---

## 5. Next step

**Phase 4 — MCP server** (`mcp/`), per `IMPLEMENTATION_PLAN.md` §"PHASE 4". Key points:
- New `mcp/` package: `pyproject.toml` (`mcp`, `httpx`), `project_notes_mcp/server.py` using
  `FastMCP("project-notes")`, `__main__.py` supporting **stdio** (default) and **SSE/HTTP**
  transports via env (`MCP_TRANSPORT`, `MCP_HOST`, `MCP_PORT`).
- **MCP talks to the backend over HTTP only** (`BACKEND_URL`) — never import backend code
  (decoupling is a hard rule). The backend REST API it will call already exists from
  Phases 2–3.
- Implement the read tools (`list_projects`, `get_project_context`, `list_artifact_types`,
  `get_artifact_type`, `list_artifacts`/`get_artifact`, `list_tasks`/`get_task`/`get_note`,
  `get_project_skills`/`get_skill`, `search_knowledge`, `list_documents`/`get_document`,
  `list_artifact_versions`/`get_artifact_version`, `prepare_generation`) and write tools
  (`save_artifact`, `update_phase_status`). Docstrings ARE the agent's instructions.
- `mcp/Dockerfile` + `mcp` compose service (depends on backend, `MCP_TRANSPORT=sse`).
- Provide both `.mcp.json` snippets (stdio + SSE) and document when to use which.
- Add tests against the Phase 4 done-criteria, run them, THEN stop for approval.

Suggested first action: re-read `IMPLEMENTATION_PLAN.md` §"PHASE 4" in full, scaffold
`mcp/`, then map each MCP tool to the backend endpoint(s) it will call.

### Possible follow-ups noted but intentionally deferred (not blockers)
- `/projects/{slug}/export` (whole-project zip bundle) — listed in Phase 2 task 6 but not in
  its done criteria; skill `SKILL.md` export and artifact export are done.
- Upload size limits / document-parser hardening / auth → Phase 7 ("only if it leaves
  localhost").
- Optional: define `Embeddings` / `FullTextSearch` domain Protocols (parallel to
  `VectorIndex`) to make those ports type-checkable — cosmetic, layering already clean.
